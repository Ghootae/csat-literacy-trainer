import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
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
  const result = resolveProblemPathEvaluatorIds(rawDiagnostic, {
    turnSequence: input.sessionState.evaluationSequence,
  });
  return {
    result,
    rawOutput: structuredClone(rawDiagnostic),
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
});
