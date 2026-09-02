import { randomUUID } from 'node:crypto';

import {
  OpenAIProblemPathEvaluator,
  ProblemPathEvaluatorFallbackError,
  adaptProblemPathDiagnosticOutput,
  applyAdaptedProblemEvaluatorTurn,
  applyCorrectRationaleAssessment,
  applyDeterministicExhaustedWrongAttemptCoaching,
  createProblemPathEvaluatorInput,
  exhaustedWrongAttemptSupplementalAccess,
  failedCorrectionSupplementalAccess,
  finalAttemptSupplementalAccess,
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
  submitProblemReselection,
  type ProblemPathDiagnosticOutput,
  type ProblemPathEvaluator,
  type ProblemPathEvaluatorCallMetadata,
  type ProblemQuestionGold,
  type ParagraphUnderstandingHandoff,
  type ProblemSolvingSession,
} from '@csat/pipeline';

import type {
  ProblemActionResponseRequest,
  ProblemContentView,
  ProblemInitialSubmissionRequest,
  ProblemSessionView,
  ProblemTranscriptEntryView,
} from '../shared/contract.js';
import { loadProblemSolvingBundle } from './content.js';

interface ProblemRuntime {
  readonly sessionId: string;
  readonly learningSessionId: string;
  readonly content: ProblemContentView;
  readonly gold: ProblemQuestionGold;
  readonly paragraphHandoff: ParagraphUnderstandingHandoff | null;
  session: ProblemSolvingSession | null;
  pendingInitialSubmission: ProblemInitialSubmissionRequest | null;
  previousDiagnosticState: ProblemPathDiagnosticOutput | null;
  transcript: ProblemTranscriptEntryView[];
  evaluatorCalls: ProblemPathEvaluatorCallMetadata[];
  evaluationStatus: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
  evaluationError: string | null;
  evaluationPromise: Promise<void> | null;
  transitionFingerprints: Map<string, string>;
  transitionPromises: Map<string, Promise<ProblemSessionView>>;
  logged: boolean;
}

const CORRECT_RATIONALE_ASSESSMENT_TOTAL_TIMEOUT_MS = 30_000;

function withTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('정답 근거 평가 제한 시간을 초과했습니다.')), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface CompletedProblemSessionRecord {
  readonly schemaVersion: 'completed-problem-session-record-v1';
  readonly savedAt: string;
  readonly learningSessionId: string;
  readonly session: ProblemSolvingSession;
  readonly evaluatorCalls: readonly ProblemPathEvaluatorCallMetadata[];
  readonly paragraphHandoffSummary: {
    readonly passageId: string;
    readonly paragraphs: readonly {
      readonly paragraphId: string;
      readonly outcome: 'PASS' | 'UNRESOLVED' | 'NOT_ATTEMPTED' | 'ABORTED';
    }[];
  } | null;
}

export interface ProblemSessionLogger {
  save(record: CompletedProblemSessionRecord): void;
}

export interface ProblemSolvingControllerOptions {
  readonly evaluator?: ProblemPathEvaluator;
  readonly logger?: ProblemSessionLogger;
}

export class ProblemSolvingController {
  private readonly evaluator: ProblemPathEvaluator;
  private readonly logger: ProblemSessionLogger | null;
  private readonly sessions = new Map<string, ProblemRuntime>();

  constructor(options: ProblemSolvingControllerOptions = {}) {
    this.evaluator = options.evaluator ?? new OpenAIProblemPathEvaluator();
    this.logger = options.logger ?? null;
  }

  start(
    questionId: string,
    paragraphHandoff: ParagraphUnderstandingHandoff | null = null,
    learningSessionId: string | null = null,
  ): ProblemSessionView {
    const { content, gold } = loadProblemSolvingBundle(questionId);
    const sessionId = randomUUID();
    const runtime: ProblemRuntime = {
      sessionId,
      learningSessionId: learningSessionId ?? sessionId,
      content,
      gold,
      paragraphHandoff,
      session: null,
      pendingInitialSubmission: null,
      previousDiagnosticState: null,
      transcript: [],
      evaluatorCalls: [],
      evaluationStatus: 'IDLE',
      evaluationError: null,
      evaluationPromise: null,
      transitionFingerprints: new Map(),
      transitionPromises: new Map(),
      logged: false,
    };
    this.sessions.set(sessionId, runtime);
    return this.view(runtime);
  }

  get(sessionId: string): ProblemSessionView {
    return this.view(this.requireSession(sessionId));
  }

  async submitInitial(
    sessionId: string,
    input: ProblemInitialSubmissionRequest,
  ): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
    if (input.transitionId !== undefined) {
      const { transitionId, ...payload } = input;
      return this.runIdempotentTransition(
        runtime,
        transitionId,
        JSON.stringify({ kind: 'INITIAL', payload }),
        () => this.submitInitial(sessionId, payload),
      );
    }
    if (runtime.session !== null || runtime.pendingInitialSubmission !== null) {
      throw new Error('최초 선택은 한 번만 제출할 수 있습니다.');
    }
    this.assertChoice(runtime, input.choiceId);
    this.assertInitialMetadata(runtime, input);
    const rationale = input.rationale?.trim() || null;
    if (rationale === null && input.choiceId !== runtime.gold.answerChoiceId) {
      runtime.pendingInitialSubmission = structuredClone(input);
      return this.view(runtime);
    }
    runtime.session = submitInitialProblemResponse(this.freshSession(runtime), {
      initialChoiceId: input.choiceId,
      rationale,
      confidence: input.confidence ?? null,
      strategy: input.strategy ?? null,
      runnerUp: input.runnerUp ?? null,
    });
    if (rationale !== null) this.addStudent(runtime, 'RATIONALE', rationale);
    await this.ensureEvaluation(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  async submitRationale(
    sessionId: string,
    rationaleInput: string,
    transitionId?: string,
  ): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
    if (transitionId !== undefined) {
      return this.runIdempotentTransition(
        runtime,
        transitionId,
        JSON.stringify({ kind: 'RATIONALE', rationale: rationaleInput }),
        () => this.submitRationale(sessionId, rationaleInput),
      );
    }
    const pending = runtime.pendingInitialSubmission;
    if (runtime.session !== null || pending === null) throw new Error('선택 근거를 받을 상태가 아닙니다.');
    const rationale = rationaleInput.trim();
    if (rationale === '') throw new Error('선택 근거를 입력해 주세요.');
    runtime.pendingInitialSubmission = null;
    runtime.session = submitInitialProblemResponse(this.freshSession(runtime), {
      initialChoiceId: pending.choiceId,
      rationale,
      confidence: pending.confidence ?? null,
      strategy: pending.strategy ?? null,
      runnerUp: pending.runnerUp ?? null,
    });
    this.addStudent(runtime, 'RATIONALE', rationale);
    await this.ensureEvaluation(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  async respond(
    sessionId: string,
    input: ProblemActionResponseRequest,
  ): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
    if (input.transitionId !== undefined) {
      const { transitionId, ...payload } = input;
      return this.runIdempotentTransition(
        runtime,
        transitionId,
        JSON.stringify({ kind: 'RESPONSE', payload }),
        () => this.respond(sessionId, payload),
      );
    }
    const session = this.requireProblemSession(runtime);
    if (input.type === 'RESELECT') {
      this.assertChoice(runtime, input.choiceId);
      const rationale = input.rationale?.trim() || null;
      const isThirdWrongSelection = session.selectionAttempt + 1 >= session.limits.maxSelectionAttempts &&
        input.choiceId !== runtime.gold.answerChoiceId;
      runtime.session = submitProblemReselection(session, {
        selectedChoiceId: input.choiceId,
        rationale,
        ...(isThirdWrongSelection ? this.finalAnswerReveal(runtime, input.choiceId) : {}),
      });
      this.addStudent(runtime, 'RESELECTION', input.choiceId);
      if (rationale !== null) this.addStudent(runtime, 'RATIONALE', rationale);
      if (
        runtime.session.result?.interventionPath === 'STATIC_ANSWER_EXPLANATION' &&
        runtime.session.result.answerExplanation !== null
      ) {
        runtime.transcript.push({
          role: 'COACH',
          kind: 'COACHING',
          text: runtime.session.result.answerExplanation,
        });
      }
    } else {
      const text = input.text.trim();
      if (text === '') throw new Error('응답을 입력해 주세요.');
      runtime.session = submitProblemActionResponse(session, text);
      this.addStudent(runtime, 'ANSWER', text);
    }
    await this.ensureEvaluation(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  async resume(sessionId: string): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
    const session = this.requireProblemSession(runtime);
    if (
      session.phase !== 'AWAITING_EVALUATION' &&
      session.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
    ) {
      return this.view(runtime);
    }
    await this.ensureEvaluation(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  private freshSession(runtime: ProblemRuntime): ProblemSolvingSession {
    return createProblemSolvingSession({
      sessionId: runtime.sessionId,
      questionId: runtime.gold.questionId,
      answerChoiceId: runtime.gold.answerChoiceId,
    });
  }

  private runIdempotentTransition(
    runtime: ProblemRuntime,
    transitionId: string,
    fingerprint: string,
    operation: () => Promise<ProblemSessionView>,
  ): Promise<ProblemSessionView> {
    const normalizedId = transitionId.trim();
    if (normalizedId === '') throw new Error('전이 ID가 비어 있습니다.');
    const previousFingerprint = runtime.transitionFingerprints.get(normalizedId);
    if (previousFingerprint !== undefined && previousFingerprint !== fingerprint) {
      throw new Error('같은 전이 ID를 서로 다른 요청에 사용할 수 없습니다.');
    }
    const previous = runtime.transitionPromises.get(normalizedId);
    if (previous !== undefined) return previous;
    runtime.transitionFingerprints.set(normalizedId, fingerprint);
    const pending = operation();
    runtime.transitionPromises.set(normalizedId, pending);
    return pending;
  }

  private finalAnswerReveal(runtime: ProblemRuntime, lastChoiceId: string): {
    readonly finalAnswerExplanation: string;
    readonly finalAnswerReveal: {
      readonly answerChoiceId: string;
      readonly lastChoiceId: string;
      readonly lastChoiceExplanation: string;
      readonly correctChoiceExplanation: string;
      readonly groundingSummary: string;
    };
  } {
    const answer = runtime.gold.choices.find((choice) => choice.choiceId === runtime.gold.answerChoiceId);
    const lastChoice = runtime.gold.choices.find((choice) => choice.choiceId === lastChoiceId);
    if (answer === undefined || lastChoice === undefined) throw new Error('정답 공개 선지 정보를 찾을 수 없습니다.');
    const groundingSummary = runtime.gold.referencePath
      .filter((step) => runtime.gold.finalAnswerExplanation.referencePathStepIds.includes(step.stepId))
      .map((step) => step.description)
      .join(' ')
      .trim();
    const finalAnswerReveal = {
      answerChoiceId: answer.choiceId,
      lastChoiceId: lastChoice.choiceId,
      lastChoiceExplanation: lastChoice.rationale,
      correctChoiceExplanation: runtime.gold.finalAnswerExplanation.message,
      groundingSummary,
    };
    if (Object.values(finalAnswerReveal).some((value) => value.trim() === '')) {
      throw new Error('정답 공개 본문에 필요한 정답·오답·근거 정보가 비어 있습니다.');
    }
    return {
      finalAnswerReveal,
      finalAnswerExplanation: [
        `정답은 ${answer.position}번입니다.`,
        `마지막 선택 ${lastChoice.position}번: ${lastChoice.rationale}`,
        runtime.gold.finalAnswerExplanation.message,
        `근거 관계: ${groundingSummary}`,
      ].join('\n'),
    };
  }

  private ensureEvaluation(runtime: ProblemRuntime): Promise<void> {
    const session = this.requireProblemSession(runtime);
    if (
      session.phase !== 'AWAITING_EVALUATION' &&
      session.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
    ) {
      runtime.evaluationStatus = 'IDLE';
      runtime.evaluationError = null;
      return Promise.resolve();
    }
    if (runtime.evaluationPromise !== null) return runtime.evaluationPromise;

    runtime.evaluationStatus = 'PROCESSING';
    runtime.evaluationError = null;
    const running = this.evaluateUntilStudentBoundary(runtime)
      .then(() => {
        runtime.evaluationStatus = 'IDLE';
        runtime.evaluationError = null;
      })
      .catch((error: unknown) => {
        if (error instanceof ProblemPathEvaluatorFallbackError) {
          runtime.evaluatorCalls.push(structuredClone(error.call));
        }
        const current = this.requireProblemSession(runtime);
        if (current.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT') {
          // 정오는 이미 코드가 확정했다. 부가적인 근거 평가 실패가 정답 종결을
          // 막지 않도록 보수적인 UNCERTAIN 결과로 결정론적으로 닫는다.
          runtime.session = applyCorrectRationaleAssessment(current, 'UNCERTAIN');
          runtime.evaluationStatus = 'IDLE';
          runtime.evaluationError = null;
          return;
        }
        runtime.evaluationStatus = 'RETRYABLE_ERROR';
        runtime.evaluationError = '후속 진단 상태 생성에 실패했습니다. 저장된 선택부터 다시 진행할 수 있습니다.';
        throw error;
      })
      .finally(() => {
        if (runtime.evaluationPromise === running) runtime.evaluationPromise = null;
      });
    runtime.evaluationPromise = running;
    return running;
  }

  private async evaluateUntilStudentBoundary(runtime: ProblemRuntime): Promise<void> {
    for (let guard = 0; guard < 3; guard += 1) {
      const session = this.requireProblemSession(runtime);
      if (session.phase === 'COMPLETED') return;
      if (
        session.phase !== 'AWAITING_EVALUATION' &&
        session.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
      ) return;
      if (
        session.phase === 'AWAITING_EVALUATION' &&
        session.entryReason === 'WRONG_CHOICE' &&
        session.selectionCount < session.limits.maxSelectionAttempts &&
        session.limits.questionsUsedThisAttempt >= session.limits.maxQuestionsPerWrongAttempt
      ) {
        const selectedChoice = runtime.gold.choices.find(
          (choice) => choice.choiceId === session.latestChoiceId,
        );
        if (selectedChoice === undefined) throw new Error('현재 오답 선지의 결정론적 코칭 근거가 없습니다.');
        runtime.session = applyDeterministicExhaustedWrongAttemptCoaching(
          session,
          `현재 선택한 ${selectedChoice.position}번에서 확인할 관계는 다음과 같습니다. ${selectedChoice.rationale}`,
        );
        this.addCoachAction(runtime);
        return;
      }
      const supplementalAccess = session.requiredNextAction !== 'DIRECT_COACHING'
        ? undefined
        : session.selectionAttempt >= session.limits.maxSelectionAttempts
          ? finalAttemptSupplementalAccess(
              runtime.gold,
              [session.latestChoiceId!, session.answerChoiceId],
            )
          : session.entryReason === 'CORRECT_RATIONALE_REVIEW'
            ? failedCorrectionSupplementalAccess(runtime.gold, session.latestChoiceId!)
            : session.requestReselectionAfterCoachingAcknowledgement
              ? exhaustedWrongAttemptSupplementalAccess(
                  runtime.gold,
                  [session.latestChoiceId!, session.answerChoiceId],
                )
              : undefined;
      const input = createProblemPathEvaluatorInput({
        evaluationMode: session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
          ? 'ASSESS_SELECTION_RATIONALE'
          : 'DIAGNOSE_PATH',
        session,
        gold: runtime.gold,
        paragraphHandoff: runtime.paragraphHandoff,
        previousDiagnosticState: runtime.previousDiagnosticState,
        ...(supplementalAccess === undefined ? {} : { supplementalAccess }),
      });
      const evaluationRequest = this.evaluator.evaluate(input);
      const evaluated = session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
        ? await withTimeout(evaluationRequest, CORRECT_RATIONALE_ASSESSMENT_TOTAL_TIMEOUT_MS)
        : await evaluationRequest;
      runtime.evaluatorCalls.push(structuredClone(evaluated.call));
      if (evaluated.result.mode === 'ASSESS_SELECTION_RATIONALE') {
        runtime.session = applyCorrectRationaleAssessment(session, evaluated.result.assessment);
        continue;
      }
      runtime.previousDiagnosticState = evaluated.result;
      const adapted = adaptProblemPathDiagnosticOutput({
        evaluatorInput: input,
        rawOutput: evaluated.rawOutput,
        resolvedOutput: evaluated.result,
      });
      runtime.session = applyAdaptedProblemEvaluatorTurn(session, adapted);
      this.addCoachAction(runtime);
    }
    const current = this.requireProblemSession(runtime);
    if (current.phase === 'AWAITING_EVALUATION') {
      throw new Error('학생 입력 없이 evaluator 상태 전이가 반복되었습니다.');
    }
  }

  private addCoachAction(runtime: ProblemRuntime): void {
    const action = this.requireProblemSession(runtime).pendingAction;
    if (action === null) return;
    if (action.type === 'ASK_DIAGNOSTIC' || action.type === 'ASK_CORRECTIVE') {
      runtime.transcript.push({ role: 'COACH', kind: 'QUESTION', text: action.question });
    } else if (action.type === 'DIRECT_COACHING' || action.type === 'EXPLAIN_ITEM_BOUNDARY') {
      runtime.transcript.push({ role: 'COACH', kind: 'COACHING', text: action.message });
    }
  }

  private view(runtime: ProblemRuntime): ProblemSessionView {
    const session = runtime.session;
    if (session === null) {
      return {
        sessionId: runtime.sessionId,
        learningSessionId: runtime.learningSessionId,
        phase: runtime.pendingInitialSubmission === null
          ? 'AWAITING_INITIAL_CHOICE'
          : 'AWAITING_RATIONALE',
        content: structuredClone(runtime.content),
        selectedChoiceId: runtime.pendingInitialSubmission?.choiceId ?? null,
        selectionCount: 0,
        interventionCount: 0,
        interventionCountForCurrentSelection: 0,
        action: null,
        reselectionPrompt: null,
        transcript: structuredClone(runtime.transcript),
        questionBudget: { used: 0, maximum: 2 },
        attemptQuestionBudget: { used: 0, maximum: 2 },
        selectionProgress: { current: 0, maximum: 3 },
        evaluation: { status: 'IDLE', message: null },
        result: null,
      };
    }
    const action = session.pendingAction;
    const evaluatorPending = session.phase === 'AWAITING_EVALUATION' ||
      session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT';
    const publicPhase: ProblemSessionView['phase'] = evaluatorPending
      ? runtime.evaluationStatus === 'RETRYABLE_ERROR'
        ? 'EVALUATION_ERROR'
        : 'PROCESSING'
      : session.phase === 'COMPLETED'
        ? 'COMPLETED'
        : session.phase === 'AWAITING_RESELECTION'
          ? 'AWAITING_RESELECTION'
          : 'AWAITING_RESPONSE';
    return {
      sessionId: runtime.sessionId,
      learningSessionId: runtime.learningSessionId,
      phase: publicPhase,
      content: structuredClone(runtime.content),
      selectedChoiceId: session.latestChoiceId,
      selectionCount: session.selectionCount,
      interventionCount: session.interventionCount,
      interventionCountForCurrentSelection: session.interventionCountForCurrentSelection,
      action: action === null || action.type === 'REQUEST_RESELECTION'
        ? null
        : action.type === 'ASK_DIAGNOSTIC'
          ? { kind: 'DIAGNOSTIC_QUESTION', text: action.question }
          : action.type === 'ASK_CORRECTIVE'
            ? { kind: 'CORRECTIVE_QUESTION', text: action.question }
            : action.type === 'EXPLAIN_ITEM_BOUNDARY'
              ? { kind: 'ITEM_BOUNDARY', text: action.message }
              : action.type === 'DIRECT_COACHING'
                ? { kind: 'COACHING', text: action.message }
                : null,
      reselectionPrompt: action?.type === 'REQUEST_RESELECTION' ? action.prompt : null,
      transcript: structuredClone(runtime.transcript),
      questionBudget: {
        used: session.limits.diagnosticQuestionsUsed,
        maximum: session.limits.maxDiagnosticQuestions,
      },
      attemptQuestionBudget: {
        used: session.limits.questionsUsedThisAttempt,
        maximum: session.limits.maxQuestionsPerWrongAttempt,
      },
      selectionProgress: {
        current: session.selectionAttempt,
        maximum: session.limits.maxSelectionAttempts,
      },
      evaluation: {
        status: evaluatorPending
          ? runtime.evaluationStatus === 'RETRYABLE_ERROR'
            ? 'RETRYABLE_ERROR'
            : 'PROCESSING'
          : 'IDLE',
        message: runtime.evaluationError,
      },
      result: session.result === null
        ? null
        : {
            correct: session.result.correct,
            finalChoiceId: session.result.finalChoiceId,
            outcome: session.result.outcome,
            selectionAttempt: session.result.selectionAttempt,
            rationaleSubmission: session.result.rationaleSubmission,
            rationaleAssessment: session.result.rationaleAssessment,
            rationaleNonEvaluationReason: session.result.rationaleNonEvaluationReason,
            answerRevealed: session.result.answerRevealed,
            resolvedByStudent: session.result.resolvedByStudent,
            resolutionStage: session.result.resolutionStage,
            resolutionOutcome: session.result.resolutionOutcome,
            interventionPath: session.result.interventionPath,
            interventionHistory: session.result.interventionHistory,
            effectiveRepairPath: session.result.effectiveRepairPath,
            answerExplanation: session.result.answerExplanation,
            answerReveal: session.result.answerReveal,
          },
    };
  }

  private addStudent(
    runtime: ProblemRuntime,
    kind: Extract<ProblemTranscriptEntryView['kind'], 'RATIONALE' | 'ANSWER' | 'RESELECTION'>,
    text: string,
  ): void {
    runtime.transcript.push({ role: 'STUDENT', kind, text });
  }

  private persistIfCompleted(runtime: ProblemRuntime): void {
    if (runtime.logged || runtime.session?.phase !== 'COMPLETED' || this.logger === null) return;
    this.logger.save({
      schemaVersion: 'completed-problem-session-record-v1',
      savedAt: new Date().toISOString(),
      learningSessionId: runtime.learningSessionId,
      session: structuredClone(runtime.session),
      evaluatorCalls: structuredClone(runtime.evaluatorCalls),
      paragraphHandoffSummary: runtime.paragraphHandoff === null
        ? null
        : {
            passageId: runtime.paragraphHandoff.passageId,
            paragraphs: runtime.paragraphHandoff.paragraphs.map((paragraph) => ({
              paragraphId: paragraph.paragraphId,
              outcome: paragraph.dialogue.outcome,
            })),
          },
    });
    runtime.logged = true;
  }

  private requireSession(sessionId: string): ProblemRuntime {
    const runtime = this.sessions.get(sessionId);
    if (runtime === undefined) throw new Error('문제 풀이 세션을 찾을 수 없습니다.');
    return runtime;
  }

  private requireProblemSession(runtime: ProblemRuntime): ProblemSolvingSession {
    if (runtime.session === null) throw new Error('문제 풀이가 아직 시작되지 않았습니다.');
    return runtime.session;
  }

  private assertChoice(runtime: ProblemRuntime, choiceId: string): void {
    if (!runtime.content.choices.some((choice) => choice.choiceId === choiceId)) {
      throw new Error('존재하지 않는 선지입니다.');
    }
  }

  private assertInitialMetadata(
    runtime: ProblemRuntime,
    input: ProblemInitialSubmissionRequest,
  ): void {
    if (
      input.confidence !== undefined &&
      (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 100)
    ) {
      throw new Error('확신도는 0에서 100 사이여야 합니다.');
    }
    if (input.runnerUp !== undefined) {
      this.assertChoice(runtime, input.runnerUp.choiceId);
      if (input.runnerUp.choiceId === input.choiceId) throw new Error('차선 후보는 최초 선택과 달라야 합니다.');
      if (input.runnerUp.rationale.trim() === '') throw new Error('차선 후보의 근거를 입력해 주세요.');
    }
  }
}
