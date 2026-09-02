import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ProblemPathEvaluatorFallbackError,
  resolveProblemPathEvaluatorIds,
  type ProblemPathEvaluator,
  type ProblemPathEvaluatorCall,
  type ProblemPathEvaluatorInput,
} from '@csat/pipeline';

import {
  ProblemSolvingController,
  type CompletedProblemSessionRecord,
  type ProblemSessionLogger,
} from './problem-solving.js';

class MemoryLogger implements ProblemSessionLogger {
  readonly records: CompletedProblemSessionRecord[] = [];

  save(record: CompletedProblemSessionRecord): void {
    this.records.push(structuredClone(record));
  }
}

const rawDiagnostic = JSON.parse(readFileSync(resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving/probes/mrna-c2-vague-evaluator-output.json',
), 'utf8'));

function successfulCall(input: ProblemPathEvaluatorInput): ProblemPathEvaluatorCall {
  const rawOutput = {
    ...structuredClone(rawDiagnostic),
    basedOnObservationIds: input.observations.map((observation) => observation.observationId),
  };
  const result = resolveProblemPathEvaluatorIds(rawOutput, {
    turnSequence: input.sessionState.evaluationSequence,
  });
  return {
    result,
    rawOutput,
    call: {
      provider: 'mock', model: 'fixed', effort: 'none',
      promptVersion: 'path-diagnostic-prompt-v3',
      schemaVersion: 'problem-path-evaluator-output-v3',
      calledAt: '2026-08-27T00:00:00.000Z', durationMs: 1,
      attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

function rationaleCall(
  assessment: 'SUPPORTED' | 'UNCERTAIN' | 'CLEAR_ERROR',
): ProblemPathEvaluatorCall {
  const groundingAssessment = assessment === 'SUPPORTED'
    ? 'SUPPORTED' as const
    : assessment === 'CLEAR_ERROR'
      ? 'CONTRADICTED' as const
      : 'NOT_ENOUGH_EVIDENCE' as const;
  return {
    result: {
      schemaVersion: 'problem-path-evaluator-output-v3',
      mode: 'ASSESS_SELECTION_RATIONALE',
      optionStance: 'REJECTS_OPTION',
      requiredStanceForSelection: 'REJECTS_OPTION',
      stanceConsistency: 'CONSISTENT',
      groundingAssessment,
      assessment,
      reason: '테스트 근거 판정',
      evidence: [],
      sourceRefs: [],
    },
    rawOutput: { assessment },
    call: {
      provider: 'mock', model: 'gpt-5.6-luna', effort: 'medium',
      promptVersion: 'path-diagnostic-prompt-v3',
      schemaVersion: 'problem-path-evaluator-output-v3',
      calledAt: '2026-09-02T00:00:00.000Z', durationMs: 1,
      attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

class CountingEvaluator implements ProblemPathEvaluator {
  calls: ProblemPathEvaluatorInput[] = [];

  async evaluate(input: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
    this.calls.push(structuredClone(input));
    return successfulCall(input);
  }
}

describe('problem solving server controller', () => {
  it('최초 정답과 근거 없음은 모델 호출 없이 코드가 종료한다', async () => {
    const evaluator = new CountingEvaluator();
    const logger = new MemoryLogger();
    const controller = new ProblemSolvingController({ evaluator, logger });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    const completed = await controller.submitInitial(started.sessionId, { choiceId: 'C5' });

    expect(completed.phase).toBe('COMPLETED');
    expect(completed.result).toEqual(expect.objectContaining({
      correct: true,
      finalChoiceId: 'C5',
      selectionAttempt: 1,
      rationaleSubmission: 'NOT_PROVIDED',
      rationaleAssessment: 'NOT_PROVIDED',
      rationaleNonEvaluationReason: null,
      answerRevealed: false,
      resolvedByStudent: true,
      resolutionOutcome: 'INITIAL_CORRECT',
      interventionHistory: [],
      effectiveRepairPath: 'NONE',
    }));
    expect(evaluator.calls).toHaveLength(0);
    expect(logger.records).toHaveLength(1);
    expect(logger.records[0]).toMatchObject({
      schemaVersion: 'completed-problem-session-record-v1',
      learningSessionId: started.learningSessionId,
      session: { phase: 'COMPLETED' },
      evaluatorCalls: [],
      paragraphHandoffSummary: null,
    });
    controller.get(started.sessionId);
    expect(logger.records).toHaveLength(1);
  });

  it('근거 없는 오답은 서버 내부 정답을 보내지 않고 근거 입력 단계로 이동한다', async () => {
    const evaluator = new CountingEvaluator();
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    const rationale = await controller.submitInitial(started.sessionId, { choiceId: 'C2' });

    expect(rationale).toMatchObject({
      phase: 'AWAITING_RATIONALE',
      selectedChoiceId: 'C2',
      action: null,
      result: null,
    });
    expect(evaluator.calls).toHaveLength(0);
    const serialized = JSON.stringify(rationale);
    expect(serialized).not.toContain('answerChoiceId');
    expect(serialized).not.toContain('optionClaims');
    expect(serialized).not.toContain('representativeWrongPaths');
    expect(serialized).not.toContain('supplementalExplanationInferences');
  });

  it('선택 근거를 받으면 evaluator의 질문 하나만 공개하고 내부 스냅샷은 숨긴다', async () => {
    const evaluator = new CountingEvaluator();
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, { choiceId: 'C2' });
    const diagnosed = await controller.submitRationale(started.sessionId, '그냥 이상해 보여요.');

    expect(diagnosed.phase).toBe('AWAITING_RESPONSE');
    expect(diagnosed.action).toEqual(expect.objectContaining({ kind: 'DIAGNOSTIC_QUESTION' }));
    expect(diagnosed.questionBudget).toEqual({ used: 1, maximum: 2 });
    expect(diagnosed.attemptQuestionBudget).toEqual({ used: 1, maximum: 2 });
    expect(diagnosed.selectionProgress).toEqual({ current: 1, maximum: 3 });
    expect(diagnosed.transcript).toHaveLength(2);
    expect(evaluator.calls).toHaveLength(1);
    const serialized = JSON.stringify(diagnosed);
    expect(serialized).not.toContain('pathSteps');
    expect(serialized).not.toContain('hypotheses');
    expect(serialized).not.toContain('diagnosticDecision');
    expect(serialized).not.toContain('rawOutput');
  });

  it('근거를 다음 화면에서 받아도 최초 확신도·전략·차선 후보를 보존한다', async () => {
    const evaluator = new CountingEvaluator();
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, {
      choiceId: 'C2',
      confidence: 65,
      strategy: '그림의 혼합 순서를 먼저 확인했다.',
      runnerUp: { choiceId: 'C5', rationale: 'pH 변화 부분도 의심스러웠다.' },
    });
    await controller.submitRationale(started.sessionId, '속도 조절이 불균일하게 만든다고 생각했다.');

    expect(evaluator.calls[0]?.observations[0]).toMatchObject({
      kind: 'INITIAL_SUBMISSION',
      confidence: 65,
      strategy: '그림의 혼합 순서를 먼저 확인했다.',
      runnerUp: { choiceId: 'C5', rationale: 'pH 변화 부분도 의심스러웠다.' },
    });
  });

  it('선택 저장 직후 evaluator가 끝나지 않아도 PROCESSING placeholder를 공개한다', async () => {
    let release: (() => void) | undefined;
    let calls = 0;
    const evaluator: ProblemPathEvaluator = {
      evaluate(input) {
        calls += 1;
        return new Promise((resolveCall) => {
          release = () => resolveCall(successfulCall(input));
        });
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, { choiceId: 'C2' });
    const pending = controller.submitRationale(started.sessionId, '그냥 이상해 보여요.');

    expect(controller.get(started.sessionId)).toMatchObject({
      phase: 'PROCESSING',
      selectedChoiceId: 'C2',
      action: null,
      evaluation: { status: 'PROCESSING', message: null },
    });

    const concurrentResume = controller.resume(started.sessionId);
    expect(calls).toBe(1);
    release?.();
    const [completedEvaluation, resumedEvaluation] = await Promise.all([
      pending,
      concurrentResume,
    ]);
    expect(completedEvaluation.phase).toBe('AWAITING_RESPONSE');
    expect(resumedEvaluation.phase).toBe('AWAITING_RESPONSE');
    expect(calls).toBe(1);
  });

  it('같은 전이 ID의 선택 제출과 응답 유실 재시도를 한 번만 반영한다', async () => {
    let release: (() => void) | undefined;
    let calls = 0;
    const evaluator: ProblemPathEvaluator = {
      evaluate(input) {
        calls += 1;
        return new Promise((resolveCall) => {
          release = () => resolveCall(successfulCall(input));
        });
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    const request = {
      transitionId: 'transition-initial-c2',
      choiceId: 'C2',
      rationale: '속도 조절이 불균일을 만든다고 생각했습니다.',
    } as const;
    const first = controller.submitInitial(started.sessionId, request);
    const duplicate = controller.submitInitial(started.sessionId, request);

    expect(calls).toBe(1);
    release?.();
    const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
    expect(duplicateResult).toEqual(firstResult);
    expect(firstResult.selectionCount).toBe(1);
    expect(firstResult.attemptQuestionBudget.used).toBe(1);
    expect(firstResult.transcript.filter((entry) => entry.role === 'STUDENT'))
      .toHaveLength(1);

    const replayed = await controller.submitInitial(started.sessionId, request);
    expect(replayed).toEqual(firstResult);
    expect(calls).toBe(1);
    await expect(controller.submitInitial(started.sessionId, {
      ...request,
      choiceId: 'C1',
    })).rejects.toThrow(/같은 전이 ID/);
  });

  it('evaluator 실패를 재개 가능한 상태로 보존하고 저장된 선택에서 한 번만 재개한다', async () => {
    let calls = 0;
    const evaluator: ProblemPathEvaluator = {
      async evaluate(input) {
        calls += 1;
        if (calls === 1) throw new Error('일시적 evaluator 실패');
        return successfulCall(input);
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, { choiceId: 'C2' });

    await expect(controller.submitRationale(started.sessionId, '그냥 이상해 보여요.'))
      .rejects.toThrow(/일시적 evaluator 실패/);
    expect(controller.get(started.sessionId)).toMatchObject({
      phase: 'EVALUATION_ERROR',
      selectedChoiceId: 'C2',
      evaluation: { status: 'RETRYABLE_ERROR' },
    });

    const resumed = await controller.resume(started.sessionId);
    expect(resumed.phase).toBe('AWAITING_RESPONSE');
    expect(resumed.action?.kind).toBe('DIAGNOSTIC_QUESTION');
    expect(calls).toBe(2);
  });

  it('정답 재선택의 근거 평가가 실패해도 정답 결과를 UNCERTAIN으로 종결한다', async () => {
    const calls: ProblemPathEvaluatorInput[] = [];
    const evaluator: ProblemPathEvaluator = {
      async evaluate(input) {
        calls.push(structuredClone(input));
        if (input.evaluationMode === 'ASSESS_SELECTION_RATIONALE') {
          throw new Error('정답 근거 평가 일시 실패');
        }
        return successfulCall(input);
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, {
      choiceId: 'C2',
      rationale: '속도와 균일도 관계가 잘 이해되지 않습니다.',
    });
    await controller.respond(started.sessionId, { type: 'TEXT', text: '첫 질문에도 잘 모르겠습니다.' });
    await controller.respond(started.sessionId, { type: 'TEXT', text: '두 번째 질문에도 잘 모르겠습니다.' });
    await controller.respond(started.sessionId, { type: 'TEXT', text: '확인했습니다.' });

    const completed = await controller.respond(started.sessionId, {
      type: 'RESELECT',
      choiceId: 'C5',
      rationale: '⑤의 소수성 약화와 입자 크기 감소는 지문에서 제시되지 않았습니다.',
    });

    expect(completed).toMatchObject({
      phase: 'COMPLETED',
      selectionCount: 2,
      evaluation: { status: 'IDLE', message: null },
      result: {
        correct: true,
        resolutionOutcome: 'SECOND_SELECTION_CORRECT_UNVERIFIED',
        rationaleAssessment: 'UNCERTAIN',
      },
    });
    expect(calls.at(-1)?.evaluationMode).toBe('ASSESS_SELECTION_RATIONALE');
    expect(await controller.resume(started.sessionId)).toEqual(completed);
  });

  it.each([
    ['SUPPORTED', 'INITIAL_CORRECT_VERIFIED', 'SUPPORTED_RATIONALE_CORRECT'],
    ['UNCERTAIN', 'INITIAL_CORRECT_UNVERIFIED', 'UNVERIFIED_RATIONALE_CORRECT'],
  ] as const)('정답 근거 %s를 추가 질문 없이 코드 소유 결과로 종결한다', async (
    assessment,
    resolutionOutcome,
    outcome,
  ) => {
    const calls: ProblemPathEvaluatorInput[] = [];
    const evaluator: ProblemPathEvaluator = {
      async evaluate(input) {
        calls.push(structuredClone(input));
        return rationaleCall(assessment);
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');

    const completed = await controller.submitInitial(started.sessionId, {
      choiceId: 'C5',
      rationale: assessment === 'SUPPORTED'
        ? '⑤의 소수성 약화와 입자 크기 감소는 제시되지 않았습니다.'
        : '그냥 ⑤가 이상해 보였습니다.',
    });

    expect(completed).toMatchObject({
      phase: 'COMPLETED',
      selectedChoiceId: 'C5',
      result: {
        correct: true,
        rationaleAssessment: assessment,
        resolutionOutcome,
        outcome,
      },
    });
    expect(completed.action).toBeNull();
    expect(completed.transcript.filter((entry) => entry.role === 'COACH')).toHaveLength(0);
    expect(calls.map((input) => input.evaluationMode)).toEqual(['ASSESS_SELECTION_RATIONALE']);
  });

  it('Luna와 Terra가 모두 실패하면 시도 감사를 남기고 정답을 미검증으로 안전 종결한다', async () => {
    const logger = new MemoryLogger();
    const failureCall = {
      provider: 'openai' as const,
      model: 'gpt-5.6-terra',
      effort: 'medium' as const,
      promptVersion: 'path-diagnostic-prompt-v3' as const,
      schemaVersion: 'problem-path-evaluator-output-v3' as const,
      calledAt: '2026-09-02T00:00:00.000Z',
      durationMs: 60_000,
      attempts: [
        { attempt: 1, model: 'gpt-5.6-luna', route: 'PRIMARY' as const, outcome: 'error' as const, durationMs: 30_000, errorType: 'timeout' },
        { attempt: 2, model: 'gpt-5.6-terra', route: 'FALLBACK' as const, outcome: 'error' as const, durationMs: 30_000, errorType: 'timeout' },
      ],
      routing: {
        primaryModel: 'gpt-5.6-luna', fallbackModel: 'gpt-5.6-terra',
        finalModel: 'gpt-5.6-terra', fallbackUsed: true, fallbackReason: 'timeout',
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    const evaluator: ProblemPathEvaluator = {
      async evaluate() {
        throw new ProblemPathEvaluatorFallbackError(new Error('Terra도 시간 초과'), failureCall);
      },
    };
    const controller = new ProblemSolvingController({ evaluator, logger });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');

    const completed = await controller.submitInitial(started.sessionId, {
      choiceId: 'C5',
      rationale: '⑤의 연결은 지문에서 제시되지 않았습니다.',
    });

    expect(completed).toMatchObject({
      phase: 'COMPLETED',
      evaluation: { status: 'IDLE', message: null },
      result: {
        correct: true,
        rationaleAssessment: 'UNCERTAIN',
        resolutionOutcome: 'INITIAL_CORRECT_UNVERIFIED',
      },
    });
    expect(logger.records).toHaveLength(1);
    expect(logger.records[0]?.evaluatorCalls).toEqual([failureCall]);
  });

  it('질문 2/2 소진 뒤 모델을 다시 호출하지 않고 결정론적 코칭과 재선택으로 이동한다', async () => {
    const evaluator = new CountingEvaluator();
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    const firstQuestion = await controller.submitInitial(started.sessionId, {
      choiceId: 'C2',
      rationale: '어느 관계가 문제인지 잘 모르겠습니다.',
    });
    const secondQuestion = await controller.respond(started.sessionId, {
      type: 'TEXT',
      text: '첫 질문에도 잘 모르겠습니다.',
    });
    const coaching = await controller.respond(started.sessionId, {
      type: 'TEXT',
      text: '두 번째 질문에도 잘 모르겠습니다.',
    });

    expect(firstQuestion.action?.kind).toBe('DIAGNOSTIC_QUESTION');
    expect(secondQuestion.action?.kind).toBe('DIAGNOSTIC_QUESTION');
    expect(coaching).toMatchObject({
      phase: 'AWAITING_RESPONSE',
      selectionCount: 1,
      interventionCountForCurrentSelection: 3,
      action: { kind: 'COACHING' },
      attemptQuestionBudget: { used: 2, maximum: 2 },
      result: null,
    });
    expect(evaluator.calls).toHaveLength(2);

    const reselecting = await controller.respond(started.sessionId, {
      type: 'TEXT',
      text: '확인했습니다.',
    });
    expect(reselecting).toMatchObject({
      phase: 'AWAITING_RESELECTION',
      selectionCount: 1,
      result: null,
    });
    expect(evaluator.calls).toHaveLength(2);
  });
});
