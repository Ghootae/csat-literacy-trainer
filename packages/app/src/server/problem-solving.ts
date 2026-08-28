import { randomUUID } from 'node:crypto';

import {
  OpenAIProblemPathEvaluator,
  adaptProblemPathDiagnosticOutput,
  applyAdaptedProblemEvaluatorTurn,
  applyCorrectRationaleAssessment,
  createProblemPathEvaluatorInput,
  exhaustedWrongAttemptSupplementalAccess,
  failedCorrectionSupplementalAccess,
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
  logged: boolean;
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
    await this.evaluateUntilStudentBoundary(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  async submitRationale(sessionId: string, rationaleInput: string): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
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
    await this.evaluateUntilStudentBoundary(runtime);
    this.persistIfCompleted(runtime);
    return this.view(runtime);
  }

  async respond(
    sessionId: string,
    input: ProblemActionResponseRequest,
  ): Promise<ProblemSessionView> {
    const runtime = this.requireSession(sessionId);
    const session = this.requireProblemSession(runtime);
    if (input.type === 'RESELECT') {
      this.assertChoice(runtime, input.choiceId);
      const rationale = input.rationale?.trim() || null;
      runtime.session = submitProblemReselection(session, {
        selectedChoiceId: input.choiceId,
        rationale,
      });
      this.addStudent(runtime, 'RESELECTION', input.choiceId);
      if (rationale !== null) this.addStudent(runtime, 'RATIONALE', rationale);
    } else {
      const text = input.text.trim();
      if (text === '') throw new Error('응답을 입력해 주세요.');
      runtime.session = submitProblemActionResponse(session, text);
      this.addStudent(runtime, 'ANSWER', text);
    }
    await this.evaluateUntilStudentBoundary(runtime);
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

  private async evaluateUntilStudentBoundary(runtime: ProblemRuntime): Promise<void> {
    for (let guard = 0; guard < 3; guard += 1) {
      const session = this.requireProblemSession(runtime);
      if (session.phase === 'COMPLETED') return;
      if (
        session.phase !== 'AWAITING_EVALUATION' &&
        session.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
      ) return;
      const supplementalAccess = session.requiredNextAction !== 'DIRECT_COACHING'
        ? undefined
        : session.entryReason === 'CORRECT_RATIONALE_REVIEW'
          ? failedCorrectionSupplementalAccess(runtime.gold, session.latestChoiceId!)
          : session.completeAfterCoachingAcknowledgement
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
      const evaluated = await this.evaluator.evaluate(input);
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
        action: null,
        reselectionPrompt: null,
        transcript: structuredClone(runtime.transcript),
        questionBudget: { used: 0, maximum: 2 },
        attemptQuestionBudget: { used: 0, maximum: 2 },
        result: null,
      };
    }
    const action = session.pendingAction;
    return {
      sessionId: runtime.sessionId,
      learningSessionId: runtime.learningSessionId,
      phase: session.phase === 'COMPLETED'
        ? 'COMPLETED'
        : session.phase === 'AWAITING_RESELECTION'
          ? 'AWAITING_RESELECTION'
          : 'AWAITING_RESPONSE',
      content: structuredClone(runtime.content),
      selectedChoiceId: session.latestChoiceId,
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
      result: session.result === null
        ? null
        : {
            correct: session.result.correct,
            finalChoiceId: session.result.finalChoiceId,
            outcome: session.result.outcome,
            selectionAttempt: session.result.selectionAttempt,
            rationaleAssessment: session.result.rationaleAssessment,
            answerRevealed: session.result.answerRevealed,
            resolvedByStudent: session.result.resolvedByStudent,
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
