import { describe, expect, it } from 'vitest';

import type {
  DialogueEvaluationCall,
  DialogueEvaluationInput,
  DialogueEvaluator,
  EvaluationResult,
} from '@csat/pipeline';

import { DialogueController } from './dialogue.js';

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
  it('전체 원문과 골드가 있는 네 지문만 시작할 수 있다', () => {
    const controller = new DialogueController({ evaluator: new FixedEvaluator('PASS') });
    const passages = controller.listPassages();
    expect(passages.filter((passage) => passage.available)).toHaveLength(4);
    const hegel = passages.find((passage) => passage.passageId === 'hegel-aesthetics-absolute-spirit');
    expect(hegel).toMatchObject({ available: false, paragraphCount: 1 });
    expect(() => controller.start('hegel-aesthetics-absolute-spirit')).toThrow(/전체 원문|완전한 지문/);
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
});
