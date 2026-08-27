import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
  EvaluationResult,
} from '@csat/pipeline';

import { DialogueController } from './dialogue.js';
import { ProblemSolvingController } from './problem-solving.js';
import type {
  ProblemPathEvaluator,
  ProblemPathEvaluatorCall,
  ProblemPathEvaluatorInput,
} from '@csat/pipeline';

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
  it('전체 원문과 승인 골드가 있는 다섯 지문만 시작할 수 있다', () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS') });
    const passages = controller.listPassages();
    expect(passages.filter((passage) => passage.available)).toHaveLength(5);
    const hegel = passages.find((passage) => passage.passageId === 'hegel-aesthetics-absolute-spirit');
    expect(hegel).toMatchObject({ available: false, paragraphCount: 1 });
    expect(() => controller.start('hegel-aesthetics-absolute-spirit')).toThrow(/전체 원문|완전한 지문/);
    const mrna = passages.find((passage) => passage.passageId === 'mrna-vaccine-lipid-nanoparticle');
    expect(mrna).toMatchObject({ available: true, paragraphCount: 5 });
  });

  it('응답 없이도 앞뒤 문단을 이동하고 방문한 문단을 계속 보여 준다', () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS') });
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
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS') });
    const started = controller.start('dopamine-motor-control');
    const passed = await controller.respond(started.sessionId, '첫 문단 응답');
    expect(passed.status).toBe('AWAITING_NEXT');

    controller.navigate(started.sessionId, 1);
    const returned = controller.navigate(started.sessionId, 0);
    expect(returned.status).toBe('AWAITING_NEXT');
    expect(returned.step).toMatchObject({ status: 'PASS', feedback: '핵심 논리를 잘 파악했습니다.' });
  });

  it('후속 질문 세 번 뒤에도 미통과면 UNRESOLVED로 종료한다', async () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('UNCLEAR') });
    let view = controller.start('information-asymmetry-free-marketplace');
    view = await controller.respond(view.sessionId, '최초 응답');
    expect(view.status).toBe('ACTIVE');
    expect(view.step?.questionsAnswered).toBe(0);

    for (let question = 1; question <= 3; question += 1) {
      view = await controller.respond(view.sessionId, `후속 답변 ${question}`);
    }
    expect(view.status).toBe('UNRESOLVED');
    expect(view.step).toMatchObject({ question: null, questionsAnswered: 3, maxQuestions: 3 });
  });

  it('전 문단 PASS 뒤의 이해 기록만 문제 판정기 handoff로 전달한다', async () => {
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
      const dialogue = new DialogueController({
        evaluator: new FixedEvaluator('PASS'),
        passageRoot: root,
      });
      let view = dialogue.start('mrna-vaccine-lipid-nanoparticle');
      expect(() => dialogue.createProblemHandoff(view.sessionId)).toThrow(/전체 문단/);
      for (let index = 0; index < paragraphs.length; index += 1) {
        view = await dialogue.respond(view.sessionId, `${index + 1}문단 이해 응답`);
        if (index < paragraphs.length - 1) view = dialogue.navigate(view.sessionId, index + 1);
      }
      expect(view).toMatchObject({
        status: 'COMPLETED',
        nextProblemQuestionId: 'mrna-vaccine-lipid-nanoparticle-q19',
      });

      const linked = dialogue.createProblemHandoff(view.sessionId);
      expect(linked.handoff.paragraphs).toHaveLength(5);
      expect(linked.handoff.paragraphs.every((paragraph) => paragraph.dialogue.outcome === 'PASS')).toBe(true);

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
});
