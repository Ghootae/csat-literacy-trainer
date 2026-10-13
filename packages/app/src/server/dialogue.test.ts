import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import type {
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
  EvaluationResult,
  StudentEvidenceEvent,
} from '@csat/pipeline';

import { DialogueController } from './dialogue.js';
import { loadDialoguePassages } from './content.js';
import { ProblemSolvingController } from './problem-solving.js';
import type { StudentEvidenceSink } from './student-state.js';
import type {
  ProblemPathEvaluator,
  ProblemPathEvaluatorCall,
  ProblemPathEvaluatorInput,
} from '@csat/pipeline';

const logDirectory = mkdtempSync(resolve(tmpdir(), 'dialogue-controller-test-'));
afterAll(() => rmSync(logDirectory, { recursive: true, force: true }));

class MemoryEvidenceSink implements StudentEvidenceSink {
  readonly batches: StudentEvidenceEvent[][] = [];
  save(events: readonly StudentEvidenceEvent[]): void { this.batches.push(structuredClone(events)); }
}

class FixedEvaluator implements DialogueEvaluator {
  constructor(private readonly status: 'PASS' | 'UNCLEAR') {}

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const relationId = input.gold.coreRelations.find((relation) => relation.diagnosticRole === 'required')?.id
      ?? input.gold.coreRelations[0]!.id;
    const result: EvaluationResult = this.status === 'PASS'
      ? {
          status: 'PASS',
          snapshot: {
            turn: input.turn,
            centralObjectRepresentation: '중심 대상',
            centralStoryRepresentation: '중심 이야기',
            expressedClaims: [],
            relationStates: input.gold.coreRelations.map((relation) => ({
              relationId: relation.id,
              state: 'explicit',
              source: 'initial',
              evidence: '응답',
            })),
            explicitErrors: [],
            unresolvedQuestions: [],
          },
          decisionSummary: '통과',
          targetIssue: null,
          nextQuestion: null,
          studentFeedback: '핵심 논리를 잘 파악했습니다.',
        }
      : {
          status: 'UNCLEAR',
          snapshot: {
            turn: input.turn,
            centralObjectRepresentation: null,
            centralStoryRepresentation: null,
            expressedClaims: [],
            relationStates: input.gold.coreRelations.map((relation) => ({
              relationId: relation.id,
              state: relation.id === relationId ? 'unknown' : 'explicit',
              ...(relation.id === relationId
                ? {}
                : { source: 'initial' as const, evidence: '응답' }),
            })),
            explicitErrors: [],
            unresolvedQuestions: ['확인 필요'],
          },
          decisionSummary: '핵심 관계 확인 필요',
          targetIssue: { description: '확인 필요', relatedRelationIds: [relationId] },
          nextQuestion: { type: 'DIAGNOSTIC', text: '이 관계가 어떻게 이어지는지 설명해 보세요.' },
          studentFeedback: '한 관계를 더 확인해야 합니다.',
        };
    return {
      result,
      call: {
        provider: 'mock',
        model: 'fixed',
        effort: 'none',
        promptVersion: 'dialogue-prompt-v8',
        schemaVersion: 'dialogue-evaluation-openai-v4',
        goldVersion: input.goldVersion,
        goldHash: input.goldHash,
        calledAt: '2026-08-25T00:00:00.000Z',
        durationMs: 12,
      },
    };
  }
}

describe('개발자용 순차 대화 세션', () => {
  it('원문 안내는 턴 기록과 별도 도움 입력에 남고 학생 답변으로 합쳐지지 않는다', async () => {
    const calls: DialogueEvaluationInput[] = [];
    const evaluator: DialogueEvaluator = { async evaluate(input) {
      calls.push(input);
      const evaluated = await new FixedEvaluator('UNCLEAR').evaluate(input);
      const quote = input.gold.paragraphText.slice(0, 18);
      return { ...evaluated, result: { ...evaluated.result,
        sourceGuide: { axisId: input.gold.centralAxes[0]!.id, quote, start: 0, end: quote.length } } };
    } };
    const controller = new DialogueController({ evaluator, logDirectory });
    const first = controller.start('mrna-vaccine-lipid-nanoparticle');
    const shown = await controller.respond(first.sessionId, '처음 내 생각');
    const next = await controller.respond(first.sessionId, '짧게 보완');
    expect(next.transcript?.[0]?.step.sourceGuide).toEqual(shown.step?.sourceGuide);
    expect(calls[1]?.shownSourceGuides?.[0]?.quote).toBe(shown.step?.sourceGuide?.quote);
    expect(calls[1]?.initialResponse).toBe('처음 내 생각');
    expect(calls[1]?.history[0]?.answer).toBe('짧게 보완');
  });
  it('개발자 맵 자유 이동은 완료 처리하지 않고 새 테스트도 이전 기록을 지우지 않는다', async () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('UNCLEAR'), logDirectory });
    const first = controller.openDeveloper('mrna-vaccine-lipid-nanoparticle', 1);
    expect(first.progress?.[0]?.outcome).toBe('UNSTARTED');
    const response = await controller.respond(first.sessionId, '내 최초 응답');
    expect(response.transcript?.[0]?.answer).toBe('내 최초 응답');
    controller.openDeveloper(first.passageId, 3, first.sessionId);
    const restored = controller.openDeveloper(first.passageId, 1, first.sessionId);
    expect(restored.transcript).toEqual(response.transcript);
    expect(restored.progress?.[1]?.outcome).toBe('ACTIVE');
    expect(restored.nextProblemQuestionId).toBeNull();
    const inspection = controller.inspect(first.sessionId);
    expect(inspection.gold.centralAxes.length).toBeGreaterThan(0);
    expect(inspection.turns[0]?.answer).toBe('내 최초 응답');
    const next = controller.openDeveloper(first.passageId, 1, undefined, true);
    expect(next.sessionId).not.toBe(first.sessionId);
    expect(next.transcript).toEqual([]);
    expect(controller.get(first.sessionId).transcript).toEqual(response.transcript);
    expect(controller.developerMap().find((p) => p.passageId === first.passageId)?.sessions).toHaveLength(2);
    expect(JSON.stringify(restored)).not.toContain('centralAxes');
    expect(JSON.stringify(restored)).not.toContain('decisionSummary');
  });

  it('대화 GET은 후속 응답까지 복원하되 골드와 원출력은 학생 뷰에 넣지 않는다', async () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('UNCLEAR'), logDirectory });
    const first = controller.start('mrna-vaccine-lipid-nanoparticle');
    await controller.respond(first.sessionId, '첫 응답');
    await controller.respond(first.sessionId, '두 번째 응답');
    const restored = controller.get(first.sessionId);
    expect(restored.transcript?.map((e) => e.answer)).toEqual(['첫 응답', '두 번째 응답']);
    expect(restored.transcript?.[1]?.step.questionsAnswered).toBe(1);
    expect(JSON.stringify(restored)).not.toMatch(/centralAxes|coreRelations|rawResult|goldHash/);
  });
  it('전체 원문과 승인 골드가 있는 여섯 지문만 시작할 수 있다', () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS'), logDirectory });
    const passages = controller.listPassages();
    expect(passages.filter((passage) => passage.available)).toHaveLength(6);
    expect(passages.find((passage) => passage.passageId === 'gongsun-long-later-mohists'))
      .toMatchObject({ available: true, paragraphCount: 5 });
    const hegel = passages.find((passage) => passage.passageId === 'hegel-aesthetics-absolute-spirit');
    expect(hegel).toMatchObject({ available: false, paragraphCount: 1 });
    expect(() => controller.start('hegel-aesthetics-absolute-spirit')).toThrow(/전체 원문|완전한 지문/);
    const mrna = passages.find((passage) => passage.passageId === 'mrna-vaccine-lipid-nanoparticle');
    expect(mrna).toMatchObject({ available: true, paragraphCount: 5 });
    expect(loadDialoguePassages().filter((passage) => passage.passageId !== 'hegel-aesthetics-absolute-spirit').map((passage) => passage.problemQuestionId))
      .toEqual(expect.arrayContaining([
        'mrna-vaccine-lipid-nanoparticle-q19',
        'gongsun-long-later-mohists-q12',
        'corporate-law-q13',
        'information-asymmetry-free-marketplace-q13',
        'surface-tension-laplace-q16',
        'dopamine-motor-control-q13',
      ]));
  });

  it('응답 없이도 앞뒤 문단을 이동하고 방문한 문단을 계속 보여 준다', () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS'), logDirectory });
    const started = controller.start('dopamine-motor-control');
    const advanced = controller.advance(started.sessionId);
    expect(advanced.status).toBe('ACTIVE');
    expect(advanced.currentParagraphIndex).toBe(1);
    expect(advanced.visibleParagraphs.map((paragraph) => paragraph.state)).toEqual([
      'COMPLETED',
      'CURRENT',
    ]);

    const returned = controller.navigate(started.sessionId, 0);
    expect(returned.currentParagraphIndex).toBe(0);
    expect(returned.visibleParagraphs.map((paragraph) => paragraph.state)).toEqual([
      'CURRENT',
      'COMPLETED',
    ]);
  });

  it('문단을 떠났다가 돌아와도 기존 판정 상태를 보존한다', async () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS'), logDirectory });
    const started = controller.start('dopamine-motor-control');
    const passed = await controller.respond(started.sessionId, '첫 문단 응답');
    expect(passed.status).toBe('AWAITING_NEXT');

    controller.navigate(started.sessionId, 1);
    const returned = controller.navigate(started.sessionId, 0);
    expect(returned.status).toBe('AWAITING_NEXT');
    expect(returned.step).toMatchObject({ status: 'PASS', feedback: '핵심 논리를 잘 파악했습니다.' });
  });

  it('후속 질문 세 번 뒤에도 미통과면 UNRESOLVED로 종료한다', async () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('UNCLEAR'), logDirectory });
    let view = controller.start('information-asymmetry-free-marketplace');
    view = await controller.respond(view.sessionId, '최초 응답');
    expect(view.status).toBe('ACTIVE');
    expect(view.step?.questionsAnswered).toBe(0);

    for (let question = 1; question <= 3; question += 1) {
      view = await controller.respond(view.sessionId, `후속 답변 ${question}`);
    }
    expect(view.status).toBe('UNRESOLVED');
    expect(view.step).toMatchObject({ question: null, questionsAnswered: 3, maxQuestions: 3 });
    controller.advance(view.sessionId);
    view = controller.navigate(view.sessionId, 0);
    expect(view.currentOutcome).toBe('UNRESOLVED');
    expect(view.studentContinued).toBe(true);
    expect(view.canRespond).toBe(false);
  });

  it('전 문단 PASS 뒤의 이해 기록을 문제 판정기 handoff로 전달한다', async () => {
    const root = mkdtempSync(resolve(tmpdir(), 'mrna-dialogue-handoff-'));
    const paragraphs = Array.from({ length: 5 }, (_, index) => {
      const position = index + 1;
      const paragraphId = `mrna-vaccine-lipid-nanoparticle-p${position}`;
      return {
        paragraphId,
        position,
        text: `테스트 ${position}문단`,
        goldPath: `packages/pipeline/fixtures/experiments/dialogue/gold-v2/${paragraphId}.json`,
        goldReviewStatus: 'human_reviewed',
      };
    });
    writeFileSync(resolve(root, 'mrna.json'), JSON.stringify({
      passageId: 'mrna-vaccine-lipid-nanoparticle',
      title: 'mRNA 백신과 지질 나노 입자',
      exam: '고2 2023년 3월 - 교육청 모의평가',
      problemQuestionId: 'mrna-vaccine-lipid-nanoparticle-q19',
      source: { status: 'exact-local-source' },
      paragraphs,
    }));

    try {
      const evidenceSink = new MemoryEvidenceSink();
      const dialogue = new DialogueController({
        logDirectory,
        evaluator: new FixedEvaluator('PASS'),
        passageRoot: root,
        evidenceSink,
        studentId: 'student-1',
      });
      let view = dialogue.start('mrna-vaccine-lipid-nanoparticle');
      expect(() => dialogue.createProblemHandoff(view.sessionId)).toThrow(/각 문단/);
      for (let index = 0; index < paragraphs.length; index += 1) {
        view = await dialogue.respond(view.sessionId, `${index + 1}문단 이해 응답`);
        if (index < paragraphs.length - 1) view = dialogue.navigate(view.sessionId, index + 1);
      }
      expect(view).toMatchObject({
        status: 'COMPLETED',
        nextProblemQuestionId: 'mrna-vaccine-lipid-nanoparticle-q19',
      });
      expect(evidenceSink.batches).toHaveLength(1);

      const linked = dialogue.createProblemHandoff(view.sessionId);
      dialogue.createProblemHandoff(view.sessionId);
      expect(linked.handoff.paragraphs).toHaveLength(5);
      expect(linked.handoff.paragraphs.every((paragraph) => paragraph.dialogue.outcome === 'PASS')).toBe(true);
      expect(evidenceSink.batches).toHaveLength(1);

      const evaluator: ProblemPathEvaluator & { calls: ProblemPathEvaluatorInput[] } = {
        calls: [],
        async evaluate(input: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
          this.calls.push(structuredClone(input));
          throw new Error('handoff 입력 확인 뒤 중단');
        },
      };
      const problem = new ProblemSolvingController({ evaluator });
      const started = problem.start(linked.questionId, linked.handoff, view.sessionId);
      expect(started.learningSessionId).toBe(view.sessionId);
      await expect(problem.submitInitial(started.sessionId, {
        choiceId: 'C2',
        rationale: '②의 속도 조절이 불균일하게 만든다고 생각했다.',
      })).rejects.toThrow(/handoff 입력 확인 뒤 중단/);
      expect(evaluator.calls[0]?.paragraphHandoff?.paragraphs).toHaveLength(5);
      expect(evaluator.calls[0]?.paragraphHandoff?.passageId).toBe('mrna-vaccine-lipid-nanoparticle');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('모든 문단을 명시적으로 넘기면 미확인 기록을 유지한 채 연결 문항으로 간다', async () => {
    const evidenceSink = new MemoryEvidenceSink();
    const controller = new DialogueController({ evaluator: new FixedEvaluator('UNCLEAR'), logDirectory, evidenceSink });
    let view = controller.start('dopamine-motor-control');
    expect(view.axisBoxes?.every((axis) => axis.status === 'PENDING' && axis.revealedText === null)).toBe(true);
    view = await controller.respond(view.sessionId, '내 원래 요약');
    const question = view.step?.question;
    for (let i = 0; i < view.paragraphCount; i++) view = controller.advance(view.sessionId);
    expect(view.status).toBe('COMPLETED');
    expect(view.nextProblemQuestionId).toBe('dopamine-motor-control-q13');
    expect(evidenceSink.batches).toHaveLength(1);
    const linked = controller.createProblemHandoff(view.sessionId);
    expect(evidenceSink.batches).toHaveLength(1);
    expect(linked.handoff.paragraphs.every((paragraph) => paragraph.dialogue.outcome === 'SKIPPED')).toBe(true);
    expect(linked.handoff.paragraphs.every((paragraph) => paragraph.dialogue.progression === 'STUDENT_CONTINUED')).toBe(true);
    expect(linked.handoff.paragraphs[0]?.observations.initialResponse).toBe('내 원래 요약');
    expect(linked.handoff.paragraphs[0]?.observations.followUpAnswers).toEqual([]);
    expect(linked.handoff.paragraphs[1]?.observations.initialResponse).toBeNull();
    const returned = controller.navigate(view.sessionId, 0);
    expect(returned.currentOutcome).toBe('SKIPPED');
    expect(returned.step).toMatchObject({ status: 'UNCLEAR', question });
    expect(returned.canRespond).toBe(false);
    const events = readFileSync(resolve(logDirectory, 'progression.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(events.filter((event) => event.sessionId === view.sessionId)).toHaveLength(view.paragraphCount);
    controller.advance(view.sessionId);
    const again = readFileSync(resolve(logDirectory, 'progression.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(again.filter((event) => event.sessionId === view.sessionId)).toHaveLength(view.paragraphCount);
  });
});
