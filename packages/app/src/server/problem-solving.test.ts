import { describe, expect, it, vi } from 'vitest';

import {
  SourceDirectProblemEvaluatorError,
  type SourceDirectDiagnosticOutput,
  type SourceDirectProblemEvaluator,
  type SourceDirectProblemEvaluatorCall,
  type SourceDirectProblemEvaluatorInput,
  type StudentEvidenceEvent,
} from '@csat/pipeline';

import {
  ProblemSolvingController,
  type CompletedProblemSessionRecord,
  type ProblemSessionLogger,
} from './problem-solving.js';
import type { StudentEvidenceSink } from './student-state.js';

class MemoryLogger implements ProblemSessionLogger {
  readonly records: CompletedProblemSessionRecord[] = [];

  save(record: CompletedProblemSessionRecord): void {
    this.records.push(structuredClone(record));
  }
}

describe('developer problem inspection', () => {
  it('reads evaluation history without new calls or student payload leakage', async () => {
    const evaluate = vi.fn(async (input: SourceDirectProblemEvaluatorInput) => successfulCall(input));
    const controller = new ProblemSolvingController({ evaluator: { evaluate } });
    const initial = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    expect(controller.inspect(initial.sessionId).evaluations).toEqual([]);
    const first = await controller.submitInitial(initial.sessionId, { choiceId: 'C2', rationale: '이 관계가 맞는 것 같아요.' });
    const inspection = controller.inspect(initial.sessionId);
    expect(inspection.session).toEqual(first);
    expect(inspection.evaluations).toHaveLength(1);
    expect(inspection.evaluations[0]).toMatchObject({ assessment: 'INSUFFICIENT_EVIDENCE', reason: '학생 근거만으로 오류 경로를 확정할 수 없다.' });
    expect(inspection.evaluations[0]?.studentEvidence[0]?.quote).toBe('이 관계가 맞는 것 같아요.');
    expect(controller.get(initial.sessionId)).not.toHaveProperty('evaluations');
    await controller.respond(initial.sessionId, { type: 'TEXT', text: '추가로 생각한 근거입니다.' });
    expect(controller.inspect(initial.sessionId).evaluations).toHaveLength(2);
    expect(inspection.evaluations).toHaveLength(1);
    expect(evaluate).toHaveBeenCalledTimes(2);
  });
});

class MemoryEvidenceSink implements StudentEvidenceSink {
  readonly events: StudentEvidenceEvent[] = [];
  save(events: readonly StudentEvidenceEvent[]): void { this.events.push(...structuredClone(events)); }
}

function observationQuote(input: SourceDirectProblemEvaluatorInput): {
  readonly observationId: string;
  readonly quote: string;
} {
  const observation = input.observations.at(-1)!;
  if (observation.kind === 'INITIAL_SUBMISSION') {
    return {
      observationId: observation.observationId,
      quote: observation.rationale ?? observation.strategy ?? observation.runnerUp?.rationale ?? 'C2',
    };
  }
  return { observationId: observation.observationId, quote: observation.rawResponse };
}

function successfulCall(input: SourceDirectProblemEvaluatorInput): SourceDirectProblemEvaluatorCall {
  const coaching = input.sessionState.allowedActionTypes.includes('DIRECT_COACHING') &&
    !input.sessionState.allowedActionTypes.includes('ASK_DIAGNOSTIC') &&
    !input.sessionState.allowedActionTypes.includes('ASK_CORRECTIVE');
  const selectedChoice = input.source.choices.find(
    (choice) => choice.choiceId === input.sessionState.currentChoiceId,
  )!;
  const wrongChoiceCoaching = input.sessionState.entryReason !== 'CORRECT_RATIONALE_REVIEW' &&
    input.sessionState.selectionAttempt < input.sessionState.maxSelectionAttempts;
  const coachingMessage = wrongChoiceCoaching
    ? `현재 선택한 ${selectedChoice.position}번의 문장과 지문 근거를 다시 비교해 보세요: ${selectedChoice.text}`
    : input.source.officialExplanation;
  const coachingEvidence = wrongChoiceCoaching
    ? { kind: 'TEXT' as const, source: 'CHOICE' as const, quote: selectedChoice.text }
    : {
        kind: 'TEXT' as const,
        source: 'OFFICIAL_EXPLANATION' as const,
        quote: input.source.officialExplanation,
      };
  const rawOutput = {
    schemaVersion: 'source-direct-problem-evaluator-output-v2' as const,
    mode: 'DIAGNOSE_PATH' as const,
    basedOnObservationIds: input.observations.map((observation) => observation.observationId),
    assessment: coaching ? 'INSUFFICIENT_EVIDENCE' as const : 'INSUFFICIENT_EVIDENCE' as const,
    learningState: 'PATH_UNCLEAR' as const,
    divergenceLayer: null,
    reason: coaching ? '질문 한도 안에서 경로가 확인되지 않았다.' : '학생 근거만으로 오류 경로를 확정할 수 없다.',
    reconstructedPath: '현재 선택 이유의 방향이 아직 드러나지 않았다.',
    studentEvidence: [observationQuote(input)],
    sourceEvidence: coaching
      ? [coachingEvidence]
      : [],
    nextAction: coaching
      ? {
          type: 'DIRECT_COACHING' as const,
          message: coachingMessage,
          reason: input.sessionState.selectionAttempt >= input.sessionState.maxSelectionAttempts
            ? 'FINAL_ATTEMPT' as const
            : input.sessionState.entryReason === 'CORRECT_RATIONALE_REVIEW'
              ? 'FAILED_CORRECTION' as const
              : 'MAX_DIAGNOSTIC_TURNS' as const,
        }
      : {
          type: 'ASK_DIAGNOSTIC' as const,
          question: '어떤 관계를 근거로 이 선지를 선택했나요?',
          purpose: '학생이 적용한 판단 관계를 확인한다.',
        },
  };
  return {
    result: rawOutput,
    rawOutput,
    call: {
      provider: 'mock', model: 'fixed', effort: 'none',
      promptVersion: 'source-direct-problem-dialogue-prompt-v3',
      schemaVersion: 'source-direct-problem-evaluator-output-v2',
      calledAt: '2026-08-27T00:00:00.000Z', durationMs: 1,
      attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

function rationaleCall(
  input: SourceDirectProblemEvaluatorInput,
  assessment: 'SUPPORTED' | 'UNCERTAIN' | 'CLEAR_ERROR',
): SourceDirectProblemEvaluatorCall {
  const rawOutput = {
    schemaVersion: 'source-direct-problem-evaluator-output-v2' as const,
    mode: 'ASSESS_SELECTION_RATIONALE' as const,
    assessment,
    reason: '테스트 근거 판정',
    studentEvidence: [observationQuote(input)],
    sourceEvidence: assessment === 'CLEAR_ERROR'
      ? [{
          kind: 'TEXT' as const,
          source: 'OFFICIAL_EXPLANATION' as const,
          quote: input.source.officialExplanation,
        }]
      : [],
  };
  return {
    result: rawOutput,
    rawOutput,
    call: {
      provider: 'mock', model: 'gpt-5.6-luna', effort: 'medium',
      promptVersion: 'source-direct-problem-dialogue-prompt-v3',
      schemaVersion: 'source-direct-problem-evaluator-output-v2',
      calledAt: '2026-09-02T00:00:00.000Z', durationMs: 1,
      attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

function diagnosticCall(
  input: SourceDirectProblemEvaluatorInput,
  output: Omit<SourceDirectDiagnosticOutput, 'schemaVersion' | 'mode' | 'basedOnObservationIds'>,
): SourceDirectProblemEvaluatorCall {
  const rawOutput: SourceDirectDiagnosticOutput = {
    schemaVersion: 'source-direct-problem-evaluator-output-v2',
    mode: 'DIAGNOSE_PATH',
    basedOnObservationIds: input.observations.map((observation) => observation.observationId),
    ...output,
  };
  return {
    result: rawOutput,
    rawOutput,
    call: {
      provider: 'mock', model: 'gpt-5.6-terra', effort: 'medium',
      promptVersion: 'source-direct-problem-dialogue-prompt-v3',
      schemaVersion: 'source-direct-problem-evaluator-output-v2',
      calledAt: '2026-09-08T00:00:00.000Z', durationMs: 1,
      attempts: [{ attempt: 1, outcome: 'success', durationMs: 1 }],
      usage: { inputTokens: 1, outputTokens: 1 },
    },
  };
}

class CountingEvaluator implements SourceDirectProblemEvaluator {
  calls: SourceDirectProblemEvaluatorInput[] = [];

  async evaluate(input: SourceDirectProblemEvaluatorInput): Promise<SourceDirectProblemEvaluatorCall> {
    this.calls.push(structuredClone(input));
    return successfulCall(input);
  }
}

describe('problem solving server controller', () => {
  it('최초 정답과 근거 없음은 모델 호출 없이 코드가 종료한다', async () => {
    const evaluator = new CountingEvaluator();
    const logger = new MemoryLogger();
    const evidenceSink = new MemoryEvidenceSink();
    const controller = new ProblemSolvingController({ evaluator, logger, evidenceSink, studentId: 'student-1' });
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
    expect(evidenceSink.events).toHaveLength(1);
    expect(evidenceSink.events[0]).toMatchObject({
      studentId: 'student-1', dimension: 'GROUNDED_PROBLEM_SOLVING', judgment: 'INDETERMINATE',
      observation: { kind: 'PROBLEM_INITIAL_GROUNDING', initialChoiceWasCorrect: true, rationaleAssessment: 'NOT_PROVIDED' },
    });
    expect(logger.records[0]).toMatchObject({
      schemaVersion: 'completed-problem-session-record-v1',
      learningSessionId: started.learningSessionId,
      session: { phase: 'COMPLETED' },
      evaluatorCalls: [],
      paragraphHandoffSummary: null,
    });
    controller.get(started.sessionId);
    expect(logger.records).toHaveLength(1);
    expect(evidenceSink.events).toHaveLength(1);
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
    const evaluator: SourceDirectProblemEvaluator = {
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
    const evaluator: SourceDirectProblemEvaluator = {
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

  it.each([
    '원문 자료와 일치하지 않는 인용: PASSAGE',
    '현재 상태에서 허용되지 않는 다음 행동: COMPLETE',
  ])('계약 검증 실패(%s) 뒤 학생 답변을 보존하고 저장된 상태에서 한 번만 재개한다', async (
    validationMessage,
  ) => {
    let calls = 0;
    const evaluator: SourceDirectProblemEvaluator = {
      async evaluate(input) {
        calls += 1;
        if (calls === 1) {
          const failedCall = successfulCall(input).call;
          throw new SourceDirectProblemEvaluatorError(
            new Error(validationMessage),
            {
              ...failedCall,
              attempts: [{
                attempt: 1,
                outcome: 'error',
                durationMs: 1,
                errorType: 'contract_validation',
              }],
            },
            { invalid: 'quote' },
          );
        }
        return successfulCall(input);
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    await controller.submitInitial(started.sessionId, { choiceId: 'C2' });

    await expect(controller.submitRationale(started.sessionId, '그냥 이상해 보여요.'))
      .rejects.toThrow(validationMessage);
    const failed = controller.get(started.sessionId);
    expect(failed).toMatchObject({
      phase: 'EVALUATION_ERROR',
      selectedChoiceId: 'C2',
      evaluation: { status: 'RETRYABLE_ERROR' },
    });
    expect(failed.transcript.filter((entry) => entry.role === 'STUDENT')).toEqual([
      expect.objectContaining({ text: '그냥 이상해 보여요.' }),
    ]);

    const resumed = await controller.resume(started.sessionId);
    expect(resumed.phase).toBe('AWAITING_RESPONSE');
    expect(resumed.action?.kind).toBe('DIAGNOSTIC_QUESTION');
    expect(calls).toBe(2);
    expect(resumed.transcript.filter((entry) => entry.role === 'STUDENT')).toEqual([
      expect.objectContaining({ text: '그냥 이상해 보여요.' }),
    ]);
  });

  it('정답 근거의 계약 검증 실패도 미검증 종료하지 않고 저장된 근거로 재개한다', async () => {
    let calls = 0;
    const evaluator: SourceDirectProblemEvaluator = {
      async evaluate(input) {
        calls += 1;
        if (calls === 1) {
          const failedCall = rationaleCall(input, 'SUPPORTED').call;
          throw new SourceDirectProblemEvaluatorError(
            new Error('현재 상태에서 허용되지 않는 다음 행동: COMPLETE'),
            {
              ...failedCall,
              attempts: [{
                attempt: 1,
                outcome: 'error',
                durationMs: 1,
                errorType: 'contract_validation',
              }],
            },
            { invalid: 'state' },
          );
        }
        return rationaleCall(input, 'SUPPORTED');
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
    const rationale = '⑤의 연결은 지문에서 제시되지 않았습니다.';

    await expect(controller.submitInitial(started.sessionId, {
      choiceId: 'C5',
      rationale,
    })).rejects.toThrow(/허용되지 않는 다음 행동/);
    const failed = controller.get(started.sessionId);
    expect(failed).toMatchObject({
      phase: 'EVALUATION_ERROR',
      selectedChoiceId: 'C5',
      evaluation: { status: 'RETRYABLE_ERROR' },
    });
    expect(failed.transcript).toContainEqual(expect.objectContaining({
      role: 'STUDENT',
      text: rationale,
    }));

    const resumed = await controller.resume(started.sessionId);
    expect(resumed).toMatchObject({
      phase: 'COMPLETED',
      result: {
        correct: true,
        rationaleAssessment: 'SUPPORTED',
        resolutionOutcome: 'INITIAL_CORRECT_VERIFIED',
      },
    });
    expect(calls).toBe(2);
  });

  it('정답 재선택의 근거 평가가 실패해도 정답 결과를 UNCERTAIN으로 종결한다', async () => {
    const calls: SourceDirectProblemEvaluatorInput[] = [];
    const evaluator: SourceDirectProblemEvaluator = {
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
    const calls: SourceDirectProblemEvaluatorInput[] = [];
    const evaluator: SourceDirectProblemEvaluator = {
      async evaluate(input) {
        calls.push(structuredClone(input));
        return rationaleCall(input, assessment);
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

  it('정답 근거의 명시적 오류는 원문 직접 교정 질문 1회 뒤 실제 수정으로 종료한다', async () => {
    const calls: SourceDirectProblemEvaluatorInput[] = [];
    const evaluator: SourceDirectProblemEvaluator = {
      async evaluate(input) {
        calls.push(structuredClone(input));
        if (input.evaluationMode === 'ASSESS_SELECTION_RATIONALE') {
          return rationaleCall(input, 'CLEAR_ERROR');
        }
        const latest = observationQuote(input);
        if (input.observations.length === 1) {
          return diagnosticCall(input, {
            assessment: 'CLEAR_ERROR',
            learningState: 'PATH_CLARIFIED',
            divergenceLayer: 'INFERENCE_TRANSFORMATION',
            reason: '높은 pH에서 양전하가 강해진다는 학생 관계가 원문과 반대다.',
            reconstructedPath: 'pH 상승이 양전하를 강화한다고 해석했다.',
            studentEvidence: [latest],
            sourceEvidence: [{
              kind: 'TEXT',
              source: 'OFFICIAL_EXPLANATION',
              quote: input.source.officialExplanation,
            }],
            nextAction: {
              type: 'ASK_CORRECTIVE',
              question: '높은 pH에서 이온화 지질은 양전하인가요, 중성인가요?',
              purpose: '반대로 적용한 pH 관계를 교정한다.',
            },
          });
        }
        return diagnosticCall(input, {
          assessment: 'NO_ERROR_DETECTED',
          learningState: 'CORRECTED',
          divergenceLayer: null,
          reason: '학생이 높은 pH에서 중성이라는 관계로 실제 수정했다.',
          reconstructedPath: 'pH 상승 시 이온화 지질이 중성이 된다는 관계로 바로잡았다.',
          studentEvidence: [latest],
          sourceEvidence: [{
            kind: 'TEXT',
            source: 'OFFICIAL_EXPLANATION',
            quote: input.source.officialExplanation,
          }],
          nextAction: { type: 'COMPLETE', message: '근거의 관계를 올바르게 수정했습니다.' },
        });
      },
    };
    const controller = new ProblemSolvingController({ evaluator });
    const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');

    const corrective = await controller.submitInitial(started.sessionId, {
      choiceId: 'C5',
      rationale: 'pH가 높아지면 이온화 지질의 양전하가 더 강해집니다.',
    });
    expect(corrective).toMatchObject({
      phase: 'AWAITING_RESPONSE',
      action: { kind: 'CORRECTIVE_QUESTION' },
    });

    const completed = await controller.respond(started.sessionId, {
      type: 'TEXT',
      text: '아니요. 높은 pH에서는 이온화 지질이 중성이 됩니다.',
    });
    expect(completed).toMatchObject({
      phase: 'COMPLETED',
      result: {
        correct: true,
        rationaleAssessment: 'SUPPORTED',
        outcome: 'RATIONALE_CORRECTED',
        resolutionOutcome: 'INITIAL_CORRECT_VERIFIED',
        resolvedByStudent: true,
        answerRevealed: false,
      },
    });
    expect(calls.map((input) => input.evaluationMode)).toEqual([
      'ASSESS_SELECTION_RATIONALE',
      'DIAGNOSE_PATH',
      'DIAGNOSE_PATH',
    ]);
  });

  it('원문 직접 evaluator 재시도가 모두 실패하면 감사를 남기고 정답을 미검증으로 안전 종결한다', async () => {
    const logger = new MemoryLogger();
    const failureCall = {
      provider: 'openai' as const,
      model: 'gpt-5.6-terra',
      effort: 'medium' as const,
      promptVersion: 'source-direct-problem-dialogue-prompt-v3' as const,
      schemaVersion: 'source-direct-problem-evaluator-output-v2' as const,
      calledAt: '2026-09-02T00:00:00.000Z',
      durationMs: 9_000,
      attempts: [
        { attempt: 1, outcome: 'error' as const, durationMs: 1_000, errorType: 'connection' },
        { attempt: 2, outcome: 'error' as const, durationMs: 8_000, errorType: 'timeout' },
      ],
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    const evaluator: SourceDirectProblemEvaluator = {
      async evaluate() {
        throw new SourceDirectProblemEvaluatorError(new Error('Terra도 시간 초과'), failureCall);
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

  it('근거 evaluator가 멈춰도 학생 세션은 전체 30초에 미검증 정답으로 닫는다', async () => {
    vi.useFakeTimers();
    try {
      const evaluator: SourceDirectProblemEvaluator = {
        evaluate() {
          return new Promise<SourceDirectProblemEvaluatorCall>(() => undefined);
        },
      };
      const controller = new ProblemSolvingController({ evaluator });
      const started = controller.start('mrna-vaccine-lipid-nanoparticle-q19');
      const pending = controller.submitInitial(started.sessionId, {
        choiceId: 'C5',
        rationale: '⑤의 연결은 지문에서 제시되지 않았습니다.',
      });

      await vi.advanceTimersByTimeAsync(29_999);
      expect(controller.get(started.sessionId).phase).toBe('PROCESSING');
      await vi.advanceTimersByTimeAsync(1);

      await expect(pending).resolves.toMatchObject({
        phase: 'COMPLETED',
        result: {
          correct: true,
          rationaleAssessment: 'UNCERTAIN',
          resolutionOutcome: 'INITIAL_CORRECT_UNVERIFIED',
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('질문 2/2 소진 뒤 원문 직접 코칭과 재선택으로 이동한다', async () => {
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
    expect(evaluator.calls).toHaveLength(3);

    const reselecting = await controller.respond(started.sessionId, {
      type: 'TEXT',
      text: '확인했습니다.',
    });
    expect(reselecting).toMatchObject({
      phase: 'AWAITING_RESELECTION',
      selectionCount: 1,
      result: null,
    });
    expect(evaluator.calls).toHaveLength(3);
  });
});
