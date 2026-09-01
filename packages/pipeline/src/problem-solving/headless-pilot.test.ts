import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MRNA_Q19_PERSONAS,
  runHeadlessPilotCase,
  type HeadlessProblemApi,
  type HeadlessStudentRole,
} from './headless-pilot.js';

function view(phase: string, extra: Record<string, unknown> = {}) {
  return {
    sessionId: 'S1', phase,
    content: {
      questionId: 'Q19', title: '공개 제목', passage: '공개 지문', stem: '공개 발문',
      scenario: '공개 보기', image: null,
      choices: [{ choiceId: 'C2', position: 2, text: '선지 2' }, { choiceId: 'C5', position: 5, text: '선지 5' }],
    },
    selectedChoiceId: phase === 'AWAITING_INITIAL_CHOICE' ? null : 'C2',
    selectionCount: phase === 'AWAITING_INITIAL_CHOICE' ? 0 : 1,
    interventionCount: 0,
    interventionCountForCurrentSelection: 0,
    action: null, reselectionPrompt: null, transcript: [],
    questionBudget: { used: 0, maximum: 2 },
    attemptQuestionBudget: { used: 0, maximum: 2 },
    selectionProgress: { current: 0, maximum: 3 },
    evaluation: { status: 'IDLE', message: null },
    result: null,
    ...extra,
  };
}

describe('headless problem pilot', () => {
  it('공개 세션만으로 최초 선택, 교정 응답과 재선택을 순서대로 실행한다', async () => {
    const phases: string[] = [];
    const api: HeadlessProblemApi = {
      async start() { return { view: view('AWAITING_INITIAL_CHOICE'), durationMs: 1 }; },
      async get() { throw new Error('호출되지 않아야 한다.'); },
      async resume() { throw new Error('호출되지 않아야 한다.'); },
      async submitInitial() {
        return { view: view('AWAITING_RESPONSE', { action: { kind: 'CORRECTIVE_QUESTION', text: '관계를 다시 보세요.' } }), durationMs: 2 };
      },
      async submitRationale() { throw new Error('호출되지 않아야 한다.'); },
      async respond(_sessionId, body: any) {
        if (body.type === 'TEXT') return { view: view('AWAITING_RESELECTION', { reselectionPrompt: '다시 선택하세요.' }), durationMs: 3 };
        expect(body.rationale).toBe('처음 근거입니다.');
        return { view: view('COMPLETED', { selectedChoiceId: 'C5', result: {
          correct: true,
          finalChoiceId: 'C5',
          outcome: 'RESELECTION_CORRECT_VERIFIED',
          selectionAttempt: 2,
          rationaleSubmission: 'PROVIDED',
          rationaleAssessment: 'SUPPORTED',
          rationaleNonEvaluationReason: null,
          answerRevealed: false,
          resolvedByStudent: true,
          resolutionStage: 'SECOND_SELECTION',
          resolutionOutcome: 'SECOND_SELECTION_CORRECT_VERIFIED',
          interventionPath: 'CORRECTIVE_ONLY',
          interventionHistory: ['CORRECTIVE_QUESTION'],
          effectiveRepairPath: 'CORRECTIVE_ONLY',
          answerExplanation: null,
          answerReveal: null,
        } }), durationMs: 1 };
      },
    };
    const student: HeadlessStudentRole = {
      async decide(input) {
        phases.push(input.publicSession.phase);
        const choiceId = input.actionKind === 'INITIAL_RESPONSE' ? 'C2' : input.actionKind === 'RESELECTION' ? 'C5' : null;
        return {
          decision: { choiceId, text: input.actionKind === 'FOLLOW_UP' ? '관계를 수정했습니다.' : '처음 근거입니다.', confidence: 50, decisionNote: '페르소나에 따른 판단' },
          metadata: { model: 'fake', durationMs: 1, inputTokens: 1, outputTokens: 1 },
        };
      },
    };

    const result = await runHeadlessPilotCase({
      persona: DEFAULT_MRNA_Q19_PERSONAS[0]!, questionId: 'Q19', api, student,
    });

    expect(phases).toEqual(['AWAITING_INITIAL_CHOICE', 'AWAITING_RESPONSE', 'AWAITING_RESELECTION']);
    expect(result.completed).toBe(true);
    expect(result.initialChoiceId).toBe('C2');
    expect(result.finalView.result?.finalChoiceId).toBe('C5');
  });

  it('평가 500 뒤 선택을 다시 제출하지 않고 저장된 세션 평가만 재개한다', async () => {
    let initialCalls = 0;
    let resumeCalls = 0;
    const api: HeadlessProblemApi = {
      async start() { return { view: view('AWAITING_INITIAL_CHOICE'), durationMs: 1 }; },
      async get() {
        return {
          view: view('EVALUATION_ERROR', {
            evaluation: { status: 'RETRYABLE_ERROR', message: '다시 진행' },
          }),
          durationMs: 1,
        };
      },
      async resume() {
        resumeCalls += 1;
        return { view: view('COMPLETED', { selectedChoiceId: 'C5', result: {
          correct: true,
          finalChoiceId: 'C5',
          outcome: 'INDEPENDENT_CORRECT',
          selectionAttempt: 1,
          rationaleSubmission: 'PROVIDED',
          rationaleAssessment: 'SUPPORTED',
          rationaleNonEvaluationReason: null,
          answerRevealed: false,
          resolvedByStudent: true,
          resolutionStage: 'INITIAL',
          resolutionOutcome: 'INITIAL_CORRECT_VERIFIED',
          interventionPath: 'NONE',
          interventionHistory: [],
          effectiveRepairPath: 'NONE',
          answerExplanation: null,
          answerReveal: null,
        } }), durationMs: 2 };
      },
      async submitInitial() {
        initialCalls += 1;
        throw new Error('평가 계약 오류');
      },
      async submitRationale() { throw new Error('호출되지 않아야 한다.'); },
      async respond() { throw new Error('호출되지 않아야 한다.'); },
    };
    const student: HeadlessStudentRole = {
      async decide() {
        return {
          decision: { choiceId: 'C5', text: '근거', confidence: 60, decisionNote: '최초 선택' },
          metadata: { model: 'fake', durationMs: 1, inputTokens: 1, outputTokens: 1 },
        };
      },
    };

    const result = await runHeadlessPilotCase({
      persona: DEFAULT_MRNA_Q19_PERSONAS[0]!, questionId: 'Q19', api, student,
    });

    expect(result.completed).toBe(true);
    expect(initialCalls).toBe(1);
    expect(resumeCalls).toBe(1);
  });
});
