import { z } from 'zod/v4';

import {
  DiagnosticEntryReasonSchema,
  DiagnosticTurnSchema,
  ProblemSolvingNextActionSchema,
  type ProblemSolvingNextAction,
} from './episode.js';

export const PROBLEM_SOLVING_SESSION_VERSION =
  'problem-solving-session-v10' as const;

const ResultRationaleAssessmentSchema = z.enum([
  'NOT_PROVIDED',
  'NOT_EVALUATED',
  'SUPPORTED',
  'UNCERTAIN',
  'CLEAR_ERROR',
]);

const InterventionEventSchema = z.enum([
  'DIAGNOSTIC_QUESTION',
  'CORRECTIVE_QUESTION',
  'ITEM_BOUNDARY',
  'DIRECT_COACHING',
  'STATIC_ANSWER_EXPLANATION',
]);

const EffectiveRepairPathSchema = z.enum([
  'NONE',
  'DIAGNOSTIC_ONLY',
  'CORRECTIVE_ONLY',
  'DIAGNOSTIC_THEN_CORRECTIVE',
  'ITEM_BOUNDARY',
  'DIRECT_COACHING',
  'STATIC_ANSWER_EXPLANATION',
]);

const ResolutionOutcomeSchema = z.enum([
  'INITIAL_CORRECT',
  'INITIAL_CORRECT_VERIFIED',
  'INITIAL_CORRECT_UNVERIFIED',
  'SECOND_SELECTION_CORRECT_VERIFIED',
  'SECOND_SELECTION_CORRECT_UNVERIFIED',
  'THIRD_SELECTION_CORRECT_VERIFIED',
  'THIRD_SELECTION_CORRECT_UNVERIFIED',
  'ANSWER_REVEALED',
  'UNRESOLVED',
]);

const AnswerRevealSchema = z.object({
  answerChoiceId: z.string().min(1),
  lastChoiceId: z.string().min(1),
  lastChoiceExplanation: z.string().min(1),
  correctChoiceExplanation: z.string().min(1),
  groundingSummary: z.string().min(1),
}).strict();

const SessionObservationSchema = z.discriminatedUnion('kind', [
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('INITIAL_SUBMISSION'),
    initialChoiceId: z.string().min(1),
    submittedChoiceId: z.string().min(1),
    confidence: z.number().min(0).max(100).nullable(),
    rationale: z.string().min(1).nullable(),
    strategy: z.string().min(1).nullable(),
    runnerUp: z.object({
      choiceId: z.string().min(1),
      rationale: z.string().min(1),
    }).nullable(),
  }).strict(),
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('FOLLOW_UP_RESPONSE'),
    inReplyToTurnId: z.string().min(1),
    responseType: z.enum([
      'DIAGNOSTIC_ANSWER',
      'CORRECTIVE_ANSWER',
      'COACHING_ACKNOWLEDGEMENT',
    ]),
    rawResponse: z.string().min(1),
  }).strict(),
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('RESELECTION'),
    inReplyToTurnId: z.string().min(1),
    selectedChoiceId: z.string().min(1),
    rawResponse: z.string().min(1),
    rationaleProvided: z.boolean(),
  }).strict(),
]);

const SessionResultSchema = z.object({
  outcome: z.enum([
    'INDEPENDENT_CORRECT',
    'SUPPORTED_RATIONALE_CORRECT',
    'UNVERIFIED_RATIONALE_CORRECT',
    'EXTERNALIZATION_CORRECTION',
    'DIAGNOSTIC_CORRECTION',
    'CORRECTIVE_QUESTION_CORRECTION',
    'DIAGNOSTIC_THEN_CORRECTION',
    'DIRECT_COACHING_CORRECTION',
    'RATIONALE_CORRECTED',
    'RESELECTION_CORRECT_VERIFIED',
    'RESELECTION_CORRECT_UNVERIFIED',
    'RESELECTION_RATIONALE_CORRECTED',
    'DETAILED_COACHING_REQUIRED',
    'UNRESOLVED',
  ]),
  finalChoiceId: z.string().min(1),
  correct: z.boolean(),
  initialChoiceWasCorrect: z.boolean(),
  selectionAttempt: z.number().int().positive(),
  rationaleSubmission: z.enum(['PROVIDED', 'NOT_PROVIDED']),
  rationaleAssessment: ResultRationaleAssessmentSchema,
  rationaleNonEvaluationReason: z.enum([
    'FINAL_ATTEMPT_STATIC_TERMINATION',
    'PATH_DIAGNOSIS_ONLY',
  ]).nullable(),
  answerRevealed: z.boolean(),
  resolvedByStudent: z.boolean(),
  resolutionStage: z.enum([
    'INITIAL',
    'SECOND_SELECTION',
    'THIRD_SELECTION',
    'ANSWER_REVEALED',
  ]),
  resolutionOutcome: ResolutionOutcomeSchema,
  interventionPath: EffectiveRepairPathSchema,
  interventionHistory: z.array(InterventionEventSchema),
  effectiveRepairPath: EffectiveRepairPathSchema,
  answerExplanation: z.string().min(1).nullable(),
  answerReveal: AnswerRevealSchema.nullable(),
});

const RejectedEvaluatorProposalSchema = z.object({
  turnId: z.string().min(1),
  action: ProblemSolvingNextActionSchema,
  reason: z.enum([
    'DIAGNOSTIC_BUDGET_EXHAUSTED',
    'ATTEMPT_QUESTION_BUDGET_EXHAUSTED',
  ]),
});

export const ProblemSolvingSessionSchema = z.object({
  schemaVersion: z.literal(PROBLEM_SOLVING_SESSION_VERSION),
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  answerChoiceId: z.string().min(1),
  phase: z.enum([
    'AWAITING_INITIAL_SUBMISSION',
    'AWAITING_CORRECT_RATIONALE_ASSESSMENT',
    'AWAITING_EVALUATION',
    'AWAITING_STUDENT_RESPONSE',
    'AWAITING_RESELECTION',
    'COMPLETED',
  ]),
  entryReason: DiagnosticEntryReasonSchema.nullable(),
  latestChoiceId: z.string().min(1).nullable(),
  initialChoiceId: z.string().min(1).nullable(),
  rationaleAssessment: z.enum(['SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']).nullable(),
  pendingCorrectOutcome: z.enum([
    'SUPPORTED_RATIONALE_CORRECT',
    'EXTERNALIZATION_CORRECTION',
    'RESELECTION_CORRECT_VERIFIED',
  ]).nullable(),
  selectionAttempt: z.number().int().nonnegative(),
  selectionCount: z.number().int().nonnegative(),
  interventionCount: z.number().int().nonnegative(),
  interventionCountForCurrentSelection: z.number().int().nonnegative(),
  limits: z.object({
    maxDiagnosticQuestions: z.number().int().positive(),
    diagnosticQuestionsUsed: z.number().int().nonnegative(),
    maxQuestionsPerWrongAttempt: z.number().int().positive(),
    questionsUsedThisAttempt: z.number().int().nonnegative(),
    maxSelectionAttempts: z.number().int().positive(),
  }),
  requiredNextAction: z.enum(['ANY', 'DIRECT_COACHING']),
  completeAfterCoachingAcknowledgement: z.boolean(),
  requestReselectionAfterCoachingAcknowledgement: z.boolean(),
  pendingAction: ProblemSolvingNextActionSchema.nullable(),
  observations: z.array(SessionObservationSchema),
  turns: z.array(DiagnosticTurnSchema),
  rejectedEvaluatorProposals: z.array(RejectedEvaluatorProposalSchema),
  evaluatorAudits: z.array(z.unknown()).default([]),
  result: SessionResultSchema.nullable(),
}).superRefine((session, context) => {
  const completed = session.phase === 'COMPLETED';
  if (completed !== (session.result !== null)) {
    context.addIssue({ code: 'custom', path: ['result'], message: '완료 상태와 결과 유무가 일치해야 한다.' });
  }
  if (
    session.phase === 'AWAITING_STUDENT_RESPONSE' ||
    session.phase === 'AWAITING_RESELECTION'
  ) {
    if (session.pendingAction === null) {
      context.addIssue({ code: 'custom', path: ['pendingAction'], message: '학생 응답 대기 상태에는 표시 중인 행동이 필요하다.' });
    }
  } else if (session.pendingAction !== null) {
    context.addIssue({ code: 'custom', path: ['pendingAction'], message: '현재 상태에는 대기 중 행동을 둘 수 없다.' });
  }
  if (session.limits.diagnosticQuestionsUsed > session.limits.maxDiagnosticQuestions) {
    context.addIssue({ code: 'custom', path: ['limits'], message: '진단 질문 예산을 초과했다.' });
  }
  if (session.limits.questionsUsedThisAttempt > session.limits.maxQuestionsPerWrongAttempt) {
    context.addIssue({ code: 'custom', path: ['limits'], message: '현재 오답 선택의 질문 예산을 초과했다.' });
  }
  if (session.selectionAttempt > session.limits.maxSelectionAttempts) {
    context.addIssue({ code: 'custom', path: ['selectionAttempt'], message: '최대 선택 횟수를 초과했다.' });
  }
  if (session.selectionCount !== session.selectionAttempt) {
    context.addIssue({ code: 'custom', path: ['selectionCount'], message: '선택 횟수는 선택 시도 횟수와 일치해야 한다.' });
  }
  if (session.result?.resolvedByStudent === true && session.result.correct !== true) {
    context.addIssue({ code: 'custom', path: ['result', 'resolvedByStudent'], message: '학생 해결 성공은 최종 정답일 때만 기록할 수 있다.' });
  }
  if (session.result?.answerRevealed === true && session.result.resolvedByStudent === true) {
    context.addIssue({ code: 'custom', path: ['result'], message: '정답 공개 종료를 학생의 독립 해결로 기록할 수 없다.' });
  }
  if (
    session.result !== null &&
    session.result.answerRevealed !== (session.result.answerExplanation !== null)
  ) {
    context.addIssue({ code: 'custom', path: ['result', 'answerExplanation'], message: '정답 공개 상태와 공개 해설 유무가 일치해야 한다.' });
  }
  if (
    session.result !== null &&
    session.result.answerRevealed !== (session.result.answerReveal !== null)
  ) {
    context.addIssue({ code: 'custom', path: ['result', 'answerReveal'], message: '정답 공개 상태와 구조화 공개 본문이 함께 존재해야 한다.' });
  }
  if (session.result?.answerRevealed === true) {
    if (
      session.selectionCount !== session.limits.maxSelectionAttempts ||
      session.result.finalChoiceId === session.answerChoiceId
    ) {
      context.addIssue({ code: 'custom', path: ['result', 'answerRevealed'], message: '정답 공개는 세 번째 선택도 오답일 때만 허용된다.' });
    }
    if (
      session.result.answerReveal?.answerChoiceId !== session.answerChoiceId ||
      session.result.answerReveal?.lastChoiceId !== session.result.finalChoiceId
    ) {
      context.addIssue({ code: 'custom', path: ['result', 'answerReveal'], message: '정답 공개 본문의 선지 식별자가 세션 결과와 일치하지 않는다.' });
    }
  }
  if (
    session.result?.answerRevealed === true &&
    session.result.resolutionStage !== 'ANSWER_REVEALED'
  ) {
    context.addIssue({ code: 'custom', path: ['result', 'resolutionStage'], message: '정답 공개 종료의 해결 단계가 올바르지 않다.' });
  }
  if (session.result !== null) {
    const result = session.result;
    if (result.rationaleSubmission === 'NOT_PROVIDED' && result.rationaleAssessment !== 'NOT_PROVIDED') {
      context.addIssue({ code: 'custom', path: ['result', 'rationaleAssessment'], message: '제출하지 않은 근거를 평가할 수 없다.' });
    }
    if (result.rationaleSubmission === 'PROVIDED' && result.rationaleAssessment === 'NOT_PROVIDED') {
      context.addIssue({ code: 'custom', path: ['result', 'rationaleAssessment'], message: '제출된 근거를 NOT_PROVIDED로 기록할 수 없다.' });
    }
    if ((result.rationaleAssessment === 'NOT_EVALUATED') !== (result.rationaleNonEvaluationReason !== null)) {
      context.addIssue({ code: 'custom', path: ['result', 'rationaleNonEvaluationReason'], message: '근거 미평가 상태와 사유가 함께 존재해야 한다.' });
    }
    if (result.interventionPath !== result.effectiveRepairPath) {
      context.addIssue({ code: 'custom', path: ['result', 'interventionPath'], message: '호환용 개입 경로는 최종 유효 교정 경로와 일치해야 한다.' });
    }
    if (result.resolutionOutcome !== deriveResolutionOutcome({
      correct: result.correct,
      answerRevealed: result.answerRevealed,
      resolutionStage: result.resolutionStage,
      rationaleAssessment: result.rationaleAssessment,
    })) {
      context.addIssue({ code: 'custom', path: ['result', 'resolutionOutcome'], message: '결합 결과 라벨이 해결 회차와 근거 검증 상태와 일치하지 않는다.' });
    }
  }
  if (session.result?.outcome === 'DETAILED_COACHING_REQUIRED' && session.result.resolvedByStudent) {
    context.addIssue({ code: 'custom', path: ['result'], message: '상세 코칭 종료를 학생의 독립 해결로 기록할 수 없다.' });
  }
  if (
    session.requiredNextAction === 'DIRECT_COACHING' &&
    session.phase !== 'AWAITING_EVALUATION'
  ) {
    context.addIssue({ code: 'custom', path: ['requiredNextAction'], message: '직접 코칭 강제는 evaluator 대기 상태에서만 가능하다.' });
  }
  if (
    session.completeAfterCoachingAcknowledgement &&
    session.entryReason !== 'WRONG_CHOICE' &&
    session.entryReason !== 'CORRECT_RATIONALE_REVIEW'
  ) {
    context.addIssue({ code: 'custom', path: ['completeAfterCoachingAcknowledgement'], message: '오답 또는 오류 정답 근거의 상세 코칭 종료에만 종료 대기 상태를 사용할 수 있다.' });
  }
  if (
    session.requestReselectionAfterCoachingAcknowledgement &&
    (session.entryReason !== 'WRONG_CHOICE' || session.selectionCount >= session.limits.maxSelectionAttempts)
  ) {
    context.addIssue({ code: 'custom', path: ['requestReselectionAfterCoachingAcknowledgement'], message: '1·2차 오답의 코칭 뒤에만 재선택을 요청할 수 있다.' });
  }
  if (session.completeAfterCoachingAcknowledgement && session.requestReselectionAfterCoachingAcknowledgement) {
    context.addIssue({ code: 'custom', path: ['completeAfterCoachingAcknowledgement'], message: '코칭 확인 뒤 완료와 재선택을 동시에 요구할 수 없다.' });
  }
});

export type ProblemSolvingSession = z.infer<typeof ProblemSolvingSessionSchema>;
export type CorrectRationaleAssessment = 'SUPPORTED' | 'UNCERTAIN' | 'CLEAR_ERROR';

function parsed(session: ProblemSolvingSession): ProblemSolvingSession {
  const visibleInterventions = session.turns.filter(
    (turn) => interventionEvent(turn.nextAction) !== null,
  );
  const latestSelection = [...session.observations].reverse().find(
    (observation) => observation.kind === 'INITIAL_SUBMISSION' || observation.kind === 'RESELECTION',
  );
  const boundaryIndex = latestSelection?.kind === 'RESELECTION'
    ? session.turns.findIndex((turn) => turn.turnId === latestSelection.inReplyToTurnId)
    : -1;
  const currentInterventions = visibleInterventions.filter((turn) =>
    boundaryIndex < 0 || session.turns.indexOf(turn) > boundaryIndex);
  return ProblemSolvingSessionSchema.parse({
    ...session,
    selectionCount: session.selectionAttempt,
    interventionCount: visibleInterventions.length,
    interventionCountForCurrentSelection: currentInterventions.length,
  });
}

function assertPhase(
  session: ProblemSolvingSession,
  expected: ProblemSolvingSession['phase'],
): void {
  if (session.phase === 'COMPLETED') throw new Error('완료된 세션은 변경할 수 없다.');
  if (session.phase !== expected) {
    throw new Error(`현재 상태에서는 이 작업을 수행할 수 없다: ${session.phase}`);
  }
}

type InterventionEvent = z.infer<typeof InterventionEventSchema>;
type EffectiveRepairPath = z.infer<typeof EffectiveRepairPathSchema>;
type ResolutionOutcome = z.infer<typeof ResolutionOutcomeSchema>;

function deriveResolutionOutcome(input: {
  readonly correct: boolean;
  readonly answerRevealed: boolean;
  readonly resolutionStage: 'INITIAL' | 'SECOND_SELECTION' | 'THIRD_SELECTION' | 'ANSWER_REVEALED';
  readonly rationaleAssessment: z.infer<typeof ResultRationaleAssessmentSchema>;
}): ResolutionOutcome {
  if (input.answerRevealed) return 'ANSWER_REVEALED';
  if (!input.correct) return 'UNRESOLVED';
  if (input.resolutionStage === 'INITIAL') {
    if (input.rationaleAssessment === 'SUPPORTED') return 'INITIAL_CORRECT_VERIFIED';
    if (input.rationaleAssessment === 'NOT_PROVIDED') return 'INITIAL_CORRECT';
    return 'INITIAL_CORRECT_UNVERIFIED';
  }
  const verified = input.rationaleAssessment === 'SUPPORTED';
  if (input.resolutionStage === 'SECOND_SELECTION') {
    return verified
      ? 'SECOND_SELECTION_CORRECT_VERIFIED'
      : 'SECOND_SELECTION_CORRECT_UNVERIFIED';
  }
  return verified
    ? 'THIRD_SELECTION_CORRECT_VERIFIED'
    : 'THIRD_SELECTION_CORRECT_UNVERIFIED';
}

function interventionEvent(
  action: ProblemSolvingNextAction,
): InterventionEvent | null {
  if (action.type === 'ASK_DIAGNOSTIC') return 'DIAGNOSTIC_QUESTION';
  if (action.type === 'ASK_CORRECTIVE') return 'CORRECTIVE_QUESTION';
  if (action.type === 'EXPLAIN_ITEM_BOUNDARY') return 'ITEM_BOUNDARY';
  if (action.type === 'DIRECT_COACHING') return 'DIRECT_COACHING';
  return null;
}

function interventionHistory(
  session: ProblemSolvingSession,
  includeStaticAnswerExplanation: boolean,
): InterventionEvent[] {
  const history = session.turns.flatMap((turn) => {
    // interventionHistory는 학생에게 실제로 전달된 개입 형식을 기록한다.
    // 문항 경계 설명도 UI에서는 코칭으로 전달되므로 DIRECT_COACHING으로 남기고,
    // ITEM_BOUNDARY라는 의미적 분류는 effectiveRepairPath에서 보존한다.
    const event = turn.nextAction.type === 'EXPLAIN_ITEM_BOUNDARY'
      ? 'DIRECT_COACHING' as const
      : interventionEvent(turn.nextAction);
    return event === null ? [] : [event];
  });
  return includeStaticAnswerExplanation
    ? [...history, 'STATIC_ANSWER_EXPLANATION']
    : history;
}

function turnsInLatestRepairWindow(
  session: ProblemSolvingSession,
): ProblemSolvingSession['turns'] {
  const selectionObservations = session.observations.filter(
    (observation) => observation.kind === 'INITIAL_SUBMISSION' || observation.kind === 'RESELECTION',
  );
  const previousSelection = selectionObservations.at(-2);
  if (previousSelection?.kind !== 'RESELECTION') return session.turns;
  const boundaryIndex = session.turns.findIndex(
    (turn) => turn.turnId === previousSelection.inReplyToTurnId,
  );
  return boundaryIndex < 0 ? session.turns : session.turns.slice(boundaryIndex + 1);
}

function summarizeRepairPath(events: readonly InterventionEvent[]): EffectiveRepairPath {
  if (events.includes('STATIC_ANSWER_EXPLANATION')) return 'STATIC_ANSWER_EXPLANATION';
  if (events.includes('DIRECT_COACHING')) return 'DIRECT_COACHING';
  const hasDiagnostic = events.includes('DIAGNOSTIC_QUESTION');
  const hasCorrective = events.includes('CORRECTIVE_QUESTION');
  if (hasDiagnostic && hasCorrective) return 'DIAGNOSTIC_THEN_CORRECTIVE';
  if (hasCorrective) return 'CORRECTIVE_ONLY';
  if (events.includes('ITEM_BOUNDARY')) return 'ITEM_BOUNDARY';
  if (hasDiagnostic) return 'DIAGNOSTIC_ONLY';
  return 'NONE';
}

function latestRationaleWasProvided(session: ProblemSolvingSession): boolean {
  const latestSelection = [...session.observations].reverse().find(
    (observation) => observation.kind === 'INITIAL_SUBMISSION' || observation.kind === 'RESELECTION',
  );
  if (latestSelection === undefined) return false;
  return latestSelection.kind === 'INITIAL_SUBMISSION'
    ? latestSelection.rationale !== null
    : latestSelection.rationaleProvided;
}

function complete(
  session: ProblemSolvingSession,
  outcome: NonNullable<ProblemSolvingSession['result']>['outcome'],
  rationaleAssessmentInput: NonNullable<ProblemSolvingSession['result']>['rationaleAssessment'],
  options: {
    readonly answerRevealed?: boolean;
    readonly resolvedByStudent?: boolean;
    readonly answerExplanation?: string;
    readonly answerReveal?: z.infer<typeof AnswerRevealSchema>;
    readonly effectiveRepairPath?: EffectiveRepairPath;
    readonly rationaleNonEvaluationReason?: NonNullable<ProblemSolvingSession['result']>['rationaleNonEvaluationReason'];
  } = {},
): ProblemSolvingSession {
  const latestChoiceId = session.latestChoiceId;
  if (latestChoiceId === null) throw new Error('최종 선택이 없다.');
  const answerRevealed = options.answerRevealed ?? false;
  if (
    answerRevealed &&
    (session.selectionCount !== session.limits.maxSelectionAttempts || latestChoiceId === session.answerChoiceId)
  ) {
    throw new Error('정답 공개는 세 번째 선택도 오답일 때만 허용된다.');
  }
  const answerExplanation = answerRevealed ? options.answerExplanation : undefined;
  const answerReveal = answerRevealed ? options.answerReveal : undefined;
  if (answerRevealed && (answerExplanation === undefined || answerReveal === undefined)) {
    throw new Error('정답 공개 종료에는 정답 번호, 마지막 오답 이유, 정답 근거와 지문·보기 관계가 모두 필요하다.');
  }
  const staticTermination = options.effectiveRepairPath === 'STATIC_ANSWER_EXPLANATION';
  const history = interventionHistory(session, staticTermination);
  const latestWindowEvents = turnsInLatestRepairWindow(session).flatMap((turn) => {
    const event = interventionEvent(turn.nextAction);
    return event === null ? [] : [event];
  });
  const effectiveRepairPath = options.effectiveRepairPath ?? summarizeRepairPath(latestWindowEvents);
  const rationaleProvided = latestRationaleWasProvided(session);
  const rationaleAssessment = rationaleProvided && rationaleAssessmentInput === 'NOT_PROVIDED'
    ? 'NOT_EVALUATED'
    : rationaleAssessmentInput;
  const rationaleNonEvaluationReason = rationaleAssessment === 'NOT_EVALUATED'
    ? options.rationaleNonEvaluationReason ?? 'PATH_DIAGNOSIS_ONLY'
    : null;
  const correct = latestChoiceId === session.answerChoiceId;
  const resolutionStage = answerRevealed
    ? 'ANSWER_REVEALED' as const
    : session.selectionAttempt <= 1
      ? 'INITIAL' as const
      : session.selectionAttempt === 2
        ? 'SECOND_SELECTION' as const
        : 'THIRD_SELECTION' as const;
  return parsed({
    ...session,
    phase: 'COMPLETED',
    pendingAction: null,
    requiredNextAction: 'ANY',
    completeAfterCoachingAcknowledgement: false,
    requestReselectionAfterCoachingAcknowledgement: false,
    result: {
      outcome,
      finalChoiceId: latestChoiceId,
      correct,
      initialChoiceWasCorrect: session.initialChoiceId === session.answerChoiceId,
      selectionAttempt: session.selectionAttempt,
      rationaleSubmission: rationaleProvided ? 'PROVIDED' : 'NOT_PROVIDED',
      rationaleAssessment,
      rationaleNonEvaluationReason,
      answerRevealed,
      resolvedByStudent: options.resolvedByStudent ?? latestChoiceId === session.answerChoiceId,
      resolutionStage,
      resolutionOutcome: deriveResolutionOutcome({
        correct,
        answerRevealed,
        resolutionStage,
        rationaleAssessment,
      }),
      interventionPath: effectiveRepairPath,
      interventionHistory: history,
      effectiveRepairPath,
      answerExplanation: answerExplanation ?? null,
      answerReveal: answerReveal ?? null,
    },
  });
}

function completedCorrectionOutcome(
  session: ProblemSolvingSession,
): NonNullable<ProblemSolvingSession['result']>['outcome'] {
  if (session.entryReason === 'CORRECT_RATIONALE_REVIEW') {
    return session.selectionAttempt > 1
      ? 'RESELECTION_RATIONALE_CORRECTED'
      : 'RATIONALE_CORRECTED';
  }
  if (session.turns.some((turn) => turn.nextAction.type === 'DIRECT_COACHING')) {
    return 'DIRECT_COACHING_CORRECTION';
  }
  if (session.turns.some((turn) => turn.nextAction.type === 'ASK_DIAGNOSTIC')) {
    return 'DIAGNOSTIC_THEN_CORRECTION';
  }
  if (session.turns.some((turn) => turn.nextAction.type === 'ASK_CORRECTIVE')) {
    return 'CORRECTIVE_QUESTION_CORRECTION';
  }
  return 'DIAGNOSTIC_CORRECTION';
}

export function createProblemSolvingSession(input: {
  sessionId: string;
  questionId: string;
  answerChoiceId: string;
  maxDiagnosticQuestions?: number;
}): ProblemSolvingSession {
  return ProblemSolvingSessionSchema.parse({
    schemaVersion: PROBLEM_SOLVING_SESSION_VERSION,
    sessionId: input.sessionId,
    questionId: input.questionId,
    answerChoiceId: input.answerChoiceId,
    phase: 'AWAITING_INITIAL_SUBMISSION',
    entryReason: null,
    latestChoiceId: null,
    initialChoiceId: null,
    rationaleAssessment: null,
    pendingCorrectOutcome: null,
    selectionAttempt: 0,
    selectionCount: 0,
    interventionCount: 0,
    interventionCountForCurrentSelection: 0,
    limits: {
      maxDiagnosticQuestions: input.maxDiagnosticQuestions ?? 2,
      diagnosticQuestionsUsed: 0,
      maxQuestionsPerWrongAttempt: 2,
      questionsUsedThisAttempt: 0,
      maxSelectionAttempts: 3,
    },
    requiredNextAction: 'ANY',
    completeAfterCoachingAcknowledgement: false,
    requestReselectionAfterCoachingAcknowledgement: false,
    pendingAction: null,
    observations: [],
    turns: [],
    rejectedEvaluatorProposals: [],
    evaluatorAudits: [],
    result: null,
  });
}

export function submitInitialProblemResponse(
  session: ProblemSolvingSession,
  input: {
    initialChoiceId: string;
    submittedChoiceId?: string;
    confidence?: number | null;
    rationale?: string | null;
    strategy?: string | null;
    runnerUp?: { choiceId: string; rationale: string } | null;
  },
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_INITIAL_SUBMISSION');
  const submittedChoiceId = input.submittedChoiceId ?? input.initialChoiceId;
  const rationale = input.rationale?.trim() || null;
  const observation = SessionObservationSchema.parse({
    observationId: 'O1',
    kind: 'INITIAL_SUBMISSION',
    initialChoiceId: input.initialChoiceId,
    submittedChoiceId,
    confidence: input.confidence ?? null,
    rationale,
    strategy: input.strategy?.trim() || null,
    runnerUp: input.runnerUp ?? null,
  });
  const base = parsed({
    ...session,
    selectionAttempt: 1,
    initialChoiceId: input.initialChoiceId,
    latestChoiceId: submittedChoiceId,
    observations: [observation],
  });
  const choiceChanged = input.initialChoiceId !== submittedChoiceId;
  const correct = submittedChoiceId === session.answerChoiceId;

  if (!correct) {
    if (rationale === null) throw new Error('오답에는 선택 근거가 필요하다.');
    return parsed({
      ...base,
      phase: 'AWAITING_EVALUATION',
      entryReason: 'WRONG_CHOICE',
    });
  }

  if (rationale === null) {
    return complete(
      base,
      choiceChanged ? 'EXTERNALIZATION_CORRECTION' : 'INDEPENDENT_CORRECT',
      'NOT_PROVIDED',
    );
  }
  return parsed({
    ...base,
    phase: 'AWAITING_CORRECT_RATIONALE_ASSESSMENT',
    pendingCorrectOutcome: choiceChanged
      ? 'EXTERNALIZATION_CORRECTION'
      : 'SUPPORTED_RATIONALE_CORRECT',
  });
}

export function applyCorrectRationaleAssessment(
  session: ProblemSolvingSession,
  assessment: CorrectRationaleAssessment,
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_CORRECT_RATIONALE_ASSESSMENT');
  const assessed = parsed({ ...session, rationaleAssessment: assessment });
  if (assessment === 'SUPPORTED') {
    return complete(
      assessed,
      session.pendingCorrectOutcome ?? 'SUPPORTED_RATIONALE_CORRECT',
      'SUPPORTED',
    );
  }
  if (assessment === 'UNCERTAIN') {
    return complete(
      assessed,
      session.pendingCorrectOutcome === 'EXTERNALIZATION_CORRECTION'
        ? 'EXTERNALIZATION_CORRECTION'
        : session.pendingCorrectOutcome === 'RESELECTION_CORRECT_VERIFIED'
          ? 'RESELECTION_CORRECT_UNVERIFIED'
          : 'UNVERIFIED_RATIONALE_CORRECT',
      'UNCERTAIN',
    );
  }
  if (session.selectionAttempt >= session.limits.maxSelectionAttempts) {
    return parsed({
      ...assessed,
      phase: 'AWAITING_EVALUATION',
      entryReason: 'CORRECT_RATIONALE_REVIEW',
      pendingCorrectOutcome: null,
      requiredNextAction: 'DIRECT_COACHING',
      completeAfterCoachingAcknowledgement: true,
      requestReselectionAfterCoachingAcknowledgement: false,
    });
  }
  return parsed({
    ...assessed,
    phase: 'AWAITING_EVALUATION',
    entryReason: 'CORRECT_RATIONALE_REVIEW',
    pendingCorrectOutcome: null,
  });
}

function validateTurnTargets(
  session: ProblemSolvingSession,
  turn: z.infer<typeof DiagnosticTurnSchema>,
): void {
  const kinds = new Set(turn.targetSnapshots.map((target) => target.kind));
  if (
    session.entryReason === 'WRONG_CHOICE' &&
    (turn.targetSnapshots.length !== 2 || !kinds.has('SELECTED_CHOICE') || !kinds.has('MISSED_ANSWER'))
  ) {
    throw new Error('오답 진단에는 선택 오답과 놓친 정답 타깃이 필요하다.');
  }
  if (
    session.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
    (turn.targetSnapshots.length !== 1 || !kinds.has('ANSWER_RATIONALE'))
  ) {
    throw new Error('정답 근거 진단에는 ANSWER_RATIONALE 타깃 하나만 허용된다.');
  }
  for (const target of turn.targetSnapshots) {
    const expectedChoiceId = target.kind === 'SELECTED_CHOICE'
      ? session.latestChoiceId
      : session.answerChoiceId;
    if (target.choiceId !== expectedChoiceId) {
      throw new Error('evaluator 타깃의 선지와 현재 세션 선택이 일치하지 않는다.');
    }
  }
}

function assertCoachingDoesNotRevealAnswer(
  session: ProblemSolvingSession,
  message: string,
): void {
  if (session.entryReason !== 'WRONG_CHOICE' || session.selectionCount >= session.limits.maxSelectionAttempts) {
    return;
  }
  const answerPosition = Number.parseInt(session.answerChoiceId.replace(/^C/u, ''), 10);
  const circled = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][answerPosition] ?? '';
  const answerPattern = new RegExp(`(?:${session.answerChoiceId}|${answerPosition}\\s*번|${circled})`, 'iu');
  if (answerPattern.test(message)) {
    throw new Error('1·2차 오답의 직접 코칭은 정답 선지를 노출할 수 없다.');
  }
}

export function applyDeterministicExhaustedWrongAttemptCoaching(
  session: ProblemSolvingSession,
  coachingMessageInput: string,
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_EVALUATION');
  if (
    session.entryReason !== 'WRONG_CHOICE' ||
    session.selectionCount >= session.limits.maxSelectionAttempts ||
    session.limits.questionsUsedThisAttempt < session.limits.maxQuestionsPerWrongAttempt
  ) {
    throw new Error('1·2차 오답의 질문 예산이 소진된 상태에서만 결정론적 코칭을 사용할 수 있다.');
  }
  const coachingMessage = coachingMessageInput.trim();
  if (coachingMessage === '') throw new Error('결정론적 코칭 문구가 비어 있다.');
  assertCoachingDoesNotRevealAnswer(session, coachingMessage);
  const latestTurn = session.turns.at(-1);
  if (latestTurn === undefined) throw new Error('결정론적 코칭의 기준 진단 턴이 없다.');
  const selectedTarget = latestTurn.targetSnapshots.find(
    (target) => target.kind === 'SELECTED_CHOICE',
  );
  if (
    selectedTarget === undefined ||
    ['NOT_ASSESSED', 'NOT_DIRECTLY_DIAGNOSED'].includes(selectedTarget.status)
  ) {
    throw new Error('결정론적 코칭에 사용할 평가된 선택 타깃이 없다.');
  }
  const turn = DiagnosticTurnSchema.parse({
    turnId: `FALLBACK-S${session.selectionCount}-I${session.interventionCount + 1}`,
    basedOnObservationIds: session.observations.map((observation) => observation.observationId),
    activeTarget: 'SELECTED_CHOICE',
    targetSnapshots: latestTurn.targetSnapshots,
    nextAction: {
      type: 'DIRECT_COACHING',
      target: 'SELECTED_CHOICE',
      message: coachingMessage,
      coachingReason: 'MAX_DIAGNOSTIC_TURNS',
      supplementalInferenceIds: [],
    },
  });
  return parsed({
    ...session,
    phase: 'AWAITING_STUDENT_RESPONSE',
    turns: [...session.turns, turn],
    pendingAction: turn.nextAction,
    requiredNextAction: 'ANY',
    completeAfterCoachingAcknowledgement: false,
    requestReselectionAfterCoachingAcknowledgement: true,
    evaluatorAudits: [...session.evaluatorAudits, {
      kind: 'DETERMINISTIC_EXHAUSTED_ATTEMPT_FALLBACK',
      turnId: turn.turnId,
      selectionCount: session.selectionCount,
    }],
  });
}

export function applyProblemEvaluatorTurn(
  session: ProblemSolvingSession,
  turnInput: unknown,
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_EVALUATION');
  const turn = DiagnosticTurnSchema.parse(turnInput);
  if (
    session.turns.some((item) => item.turnId === turn.turnId) ||
    session.rejectedEvaluatorProposals.some((item) => item.turnId === turn.turnId)
  ) {
    throw new Error('이미 처리한 evaluator 턴이다.');
  }
  validateTurnTargets(session, turn);
  if (
    session.entryReason === 'WRONG_CHOICE' &&
    session.selectionCount < session.limits.maxSelectionAttempts &&
    (
      turn.nextAction.type === 'ASK_DIAGNOSTIC' ||
      turn.nextAction.type === 'ASK_CORRECTIVE' ||
      turn.nextAction.type === 'DIRECT_COACHING' ||
      turn.nextAction.type === 'EXPLAIN_ITEM_BOUNDARY'
    ) &&
    turn.nextAction.target !== 'SELECTED_CHOICE'
  ) {
    throw new Error('재선택 전 질문·교정·코칭은 현재 선택 선지만 대상으로 해야 한다.');
  }
  if (
    session.entryReason === 'WRONG_CHOICE' &&
    session.selectionCount < session.limits.maxSelectionAttempts &&
    turn.nextAction.type === 'DIRECT_COACHING'
  ) {
    assertCoachingDoesNotRevealAnswer(session, turn.nextAction.message);
  }
  if (
    turn.nextAction.type === 'REQUEST_RESELECTION' &&
    session.selectionAttempt >= session.limits.maxSelectionAttempts
  ) {
    throw new Error('최대 선택 횟수에 도달해 재선택할 수 없다.');
  }
  if (
    turn.nextAction.type === 'REQUEST_RESELECTION' &&
    !turn.targetSnapshots.some((target) =>
      target.learningState === 'CORRECTED' ||
      target.learningState === 'ITEM_BOUNDARY_CLARIFIED')
  ) {
    throw new Error('경로가 파악됐다는 이유만으로 재선택할 수 없으며 실제 교정이 확인되어야 한다.');
  }

  if (
    session.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
    session.selectionAttempt < session.limits.maxSelectionAttempts
  ) {
    const correctiveQuestionsUsed = session.turns.filter(
      (item) => item.nextAction.type === 'ASK_CORRECTIVE' &&
        item.nextAction.target === 'ANSWER_RATIONALE',
    ).length;
    if (
      correctiveQuestionsUsed === 0 &&
      turn.nextAction.type !== 'ASK_CORRECTIVE' &&
      turn.nextAction.type !== 'COMPLETE'
    ) {
      throw new Error('정답의 오류 근거에는 교정 질문 또는 오류 없음 확인만 허용된다.');
    }
    if (
      correctiveQuestionsUsed >= 1 &&
      turn.nextAction.type !== 'COMPLETE' &&
      turn.nextAction.type !== 'DIRECT_COACHING'
    ) {
      throw new Error('정답 근거 교정 질문 이후에는 완료 또는 상세 코칭만 허용된다.');
    }
    if (
      correctiveQuestionsUsed >= 1 &&
      turn.nextAction.type === 'DIRECT_COACHING' &&
      turn.nextAction.coachingReason !== 'FAILED_CORRECTION'
    ) {
      throw new Error('정답 근거 교정 실패의 상세 코칭 사유가 올바르지 않다.');
    }
  }

  if (
    session.requiredNextAction === 'DIRECT_COACHING' &&
    turn.nextAction.type !== 'DIRECT_COACHING'
  ) {
    throw new Error('코드가 직접 코칭을 요구한 상태에서는 직접 코칭만 허용된다.');
  }
  if (
    session.completeAfterCoachingAcknowledgement &&
    turn.nextAction.type === 'DIRECT_COACHING' &&
    turn.nextAction.coachingReason !== (
      session.selectionAttempt >= session.limits.maxSelectionAttempts
        ? 'FINAL_ATTEMPT'
        : session.entryReason === 'CORRECT_RATIONALE_REVIEW'
          ? 'FAILED_CORRECTION'
          : 'MAX_DIAGNOSTIC_TURNS'
    )
  ) {
    throw new Error('종료 조건에 필요한 직접 코칭 사유가 올바르지 않다.');
  }
  if (
    session.requestReselectionAfterCoachingAcknowledgement &&
    turn.nextAction.type === 'DIRECT_COACHING' &&
    turn.nextAction.coachingReason !== 'MAX_DIAGNOSTIC_TURNS'
  ) {
    throw new Error('질문 예산 소진 뒤 재선택 전 코칭 사유가 올바르지 않다.');
  }
  const isWrongAttemptQuestion = session.entryReason === 'WRONG_CHOICE' &&
    (turn.nextAction.type === 'ASK_DIAGNOSTIC' || turn.nextAction.type === 'ASK_CORRECTIVE');
  if (
    isWrongAttemptQuestion &&
    session.limits.questionsUsedThisAttempt >= session.limits.maxQuestionsPerWrongAttempt
  ) {
    return parsed({
      ...session,
      requiredNextAction: 'DIRECT_COACHING',
      completeAfterCoachingAcknowledgement: false,
      requestReselectionAfterCoachingAcknowledgement: true,
      rejectedEvaluatorProposals: [
        ...session.rejectedEvaluatorProposals,
        {
          turnId: turn.turnId,
          action: turn.nextAction,
          reason: 'ATTEMPT_QUESTION_BUDGET_EXHAUSTED',
        },
      ],
    });
  }
  if (
    turn.nextAction.type === 'ASK_DIAGNOSTIC' &&
    session.limits.diagnosticQuestionsUsed >= session.limits.maxDiagnosticQuestions
  ) {
    return parsed({
      ...session,
      requiredNextAction: 'DIRECT_COACHING',
      rejectedEvaluatorProposals: [
        ...session.rejectedEvaluatorProposals,
        {
          turnId: turn.turnId,
          action: turn.nextAction,
          reason: 'DIAGNOSTIC_BUDGET_EXHAUSTED',
        },
      ],
    });
  }

  if (turn.nextAction.type === 'COMPLETE') {
    if (session.latestChoiceId !== session.answerChoiceId) {
      throw new Error('현재 선택이 오답이면 COMPLETE할 수 없다.');
    }
    const withTurn = parsed({ ...session, turns: [...session.turns, turn] });
    return complete(
      withTurn,
      completedCorrectionOutcome(withTurn),
      session.entryReason === 'CORRECT_RATIONALE_REVIEW'
        ? 'SUPPORTED'
        : session.rationaleAssessment ?? 'NOT_PROVIDED',
    );
  }

  if (
    session.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
    turn.nextAction.type === 'DIRECT_COACHING' &&
    session.requiredNextAction === 'ANY'
  ) {
    if (turn.nextAction.supplementalInferenceIds.length > 0) {
      throw new Error('교정 실패가 확정되기 전에는 보충 해설을 사용할 수 없다.');
    }
    return parsed({
      ...session,
      phase: 'AWAITING_EVALUATION',
      pendingAction: null,
      requiredNextAction: 'DIRECT_COACHING',
      completeAfterCoachingAcknowledgement: true,
      evaluatorAudits: [...session.evaluatorAudits, {
        kind: 'HIDDEN_COACHING_DECISION',
        turn,
      }],
    });
  }

  if (
    session.entryReason === 'WRONG_CHOICE' &&
    turn.nextAction.type === 'DIRECT_COACHING' &&
    session.limits.questionsUsedThisAttempt < session.limits.maxQuestionsPerWrongAttempt &&
    session.requiredNextAction === 'ANY' &&
    turn.nextAction.coachingReason !== 'EXPLANATION_REQUEST' &&
    turn.nextAction.coachingReason !== 'ITEM_INTERPRETATION_BOUNDARY'
  ) {
    throw new Error('오답 교정에는 남은 질문 기회를 먼저 사용해야 한다.');
  }

  if (
    session.entryReason === 'WRONG_CHOICE' &&
    turn.nextAction.type === 'DIRECT_COACHING' &&
    session.limits.questionsUsedThisAttempt >= session.limits.maxQuestionsPerWrongAttempt &&
    session.requiredNextAction === 'ANY'
  ) {
    if (turn.nextAction.coachingReason !== 'MAX_DIAGNOSTIC_TURNS') {
      throw new Error('오답 질문 예산 소진 뒤 직접 코칭 사유가 올바르지 않다.');
    }
    if (turn.nextAction.supplementalInferenceIds.length > 0) {
      throw new Error('오답 교정 실패가 확정되기 전에는 보충 해설을 사용할 수 없다.');
    }
    return parsed({
      ...session,
      phase: 'AWAITING_EVALUATION',
      pendingAction: null,
      requiredNextAction: 'DIRECT_COACHING',
      completeAfterCoachingAcknowledgement: false,
      requestReselectionAfterCoachingAcknowledgement: true,
      evaluatorAudits: [...session.evaluatorAudits, {
        kind: 'HIDDEN_COACHING_DECISION',
        turn,
      }],
    });
  }

  const diagnosticQuestionsUsed = session.limits.diagnosticQuestionsUsed +
    (turn.nextAction.type === 'ASK_DIAGNOSTIC' ? 1 : 0);
  const questionsUsedThisAttempt = session.limits.questionsUsedThisAttempt +
    (isWrongAttemptQuestion ? 1 : 0);
  const phase = turn.nextAction.type === 'REQUEST_RESELECTION'
    ? 'AWAITING_RESELECTION'
    : 'AWAITING_STUDENT_RESPONSE';
  return parsed({
    ...session,
    phase,
    turns: [...session.turns, turn],
    pendingAction: turn.nextAction,
    requiredNextAction: 'ANY',
    completeAfterCoachingAcknowledgement: turn.nextAction.type === 'DIRECT_COACHING'
      ? session.completeAfterCoachingAcknowledgement
      : false,
    requestReselectionAfterCoachingAcknowledgement: turn.nextAction.type === 'DIRECT_COACHING'
      ? session.requestReselectionAfterCoachingAcknowledgement
      : false,
    limits: { ...session.limits, diagnosticQuestionsUsed, questionsUsedThisAttempt },
  });
}

export function submitProblemActionResponse(
  session: ProblemSolvingSession,
  rawResponse: string,
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_STUDENT_RESPONSE');
  const action = session.pendingAction;
  if (
    action === null ||
    ![
      'ASK_DIAGNOSTIC',
      'ASK_CORRECTIVE',
      'DIRECT_COACHING',
      'EXPLAIN_ITEM_BOUNDARY',
    ].includes(action.type)
  ) {
    throw new Error('답변할 질문이나 코칭이 없다.');
  }
  const responseType = action.type === 'ASK_DIAGNOSTIC'
    ? 'DIAGNOSTIC_ANSWER'
    : action.type === 'ASK_CORRECTIVE'
      ? 'CORRECTIVE_ANSWER'
      : 'COACHING_ACKNOWLEDGEMENT';
  const observation = SessionObservationSchema.parse({
    observationId: `O${session.observations.length + 1}`,
    kind: 'FOLLOW_UP_RESPONSE',
    inReplyToTurnId: session.turns.at(-1)!.turnId,
    responseType,
    rawResponse,
  });
  const answered = parsed({
    ...session,
    phase: 'AWAITING_EVALUATION',
    pendingAction: null,
    observations: [...session.observations, observation],
  });
  if (action.type === 'DIRECT_COACHING' && session.requestReselectionAfterCoachingAcknowledgement) {
    return parsed({
      ...answered,
      phase: 'AWAITING_RESELECTION',
      pendingAction: {
        type: 'REQUEST_RESELECTION',
        prompt: '방금 확인한 현재 오답의 관계만 반영해 다시 선택해 주세요.',
      },
      requiredNextAction: 'ANY',
      completeAfterCoachingAcknowledgement: false,
      requestReselectionAfterCoachingAcknowledgement: false,
    });
  }
  if (action.type === 'DIRECT_COACHING' && session.entryReason === 'CORRECT_RATIONALE_REVIEW') {
    return complete(
      answered,
      'DETAILED_COACHING_REQUIRED',
      'CLEAR_ERROR',
      { answerRevealed: false, resolvedByStudent: false },
    );
  }
  if (action.type === 'DIRECT_COACHING' && session.completeAfterCoachingAcknowledgement) {
    return complete(
      answered,
      'DETAILED_COACHING_REQUIRED',
      session.rationaleAssessment ?? 'NOT_PROVIDED',
      { answerRevealed: false, resolvedByStudent: false },
    );
  }
  return answered;
}

export function submitProblemReselection(
  session: ProblemSolvingSession,
  input: {
    selectedChoiceId: string;
    rationale?: string | null;
    finalAnswerExplanation?: string;
    finalAnswerReveal?: z.infer<typeof AnswerRevealSchema>;
  },
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_RESELECTION');
  if (session.pendingAction?.type !== 'REQUEST_RESELECTION') {
    throw new Error('재선택 요청이 없다.');
  }
  if (session.selectionAttempt >= session.limits.maxSelectionAttempts) {
    throw new Error('최대 선택 횟수에 도달해 더 선택할 수 없다.');
  }
  const rationale = input.rationale?.trim() || null;
  const correct = input.selectedChoiceId === session.answerChoiceId;
  if (!correct && rationale === null) {
    throw new Error('재선택한 오답에는 새로운 선택 근거가 필요하다.');
  }
  const observation = SessionObservationSchema.parse({
    observationId: `O${session.observations.length + 1}`,
    kind: 'RESELECTION',
    inReplyToTurnId: session.turns.at(-1)!.turnId,
    selectedChoiceId: input.selectedChoiceId,
    rawResponse: rationale ?? input.selectedChoiceId,
    rationaleProvided: rationale !== null,
  });
  const base = parsed({
    ...session,
    selectionAttempt: session.selectionAttempt + 1,
    latestChoiceId: input.selectedChoiceId,
    pendingAction: null,
    observations: [...session.observations, observation],
    phase: correct && rationale !== null
      ? 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
      : 'AWAITING_EVALUATION',
    entryReason: correct ? session.entryReason : 'WRONG_CHOICE',
    rationaleAssessment: null,
    pendingCorrectOutcome: correct && rationale !== null
      ? 'RESELECTION_CORRECT_VERIFIED'
      : null,
    limits: {
      ...session.limits,
      questionsUsedThisAttempt: correct ? session.limits.questionsUsedThisAttempt : 0,
    },
    requiredNextAction: !correct && session.selectionAttempt + 1 >= session.limits.maxSelectionAttempts
      ? 'DIRECT_COACHING'
      : 'ANY',
    completeAfterCoachingAcknowledgement:
      !correct && session.selectionAttempt + 1 >= session.limits.maxSelectionAttempts,
    requestReselectionAfterCoachingAcknowledgement: false,
    result: null,
  });
  if (!correct) {
    if (base.selectionAttempt < base.limits.maxSelectionAttempts) return base;
    if (input.finalAnswerExplanation?.trim() === '') {
      throw new Error('최종 오답의 정적 정답 해설이 비어 있다.');
    }
    if (input.finalAnswerExplanation === undefined || input.finalAnswerReveal === undefined) {
      throw new Error('최종 오답은 완전한 정적 정답 공개 본문으로 즉시 종료해야 한다.');
    }
    return complete(
      base,
      'DETAILED_COACHING_REQUIRED',
      base.rationaleAssessment ?? 'NOT_PROVIDED',
      {
        answerRevealed: true,
        resolvedByStudent: false,
        answerExplanation: input.finalAnswerExplanation.trim(),
        answerReveal: input.finalAnswerReveal,
        effectiveRepairPath: 'STATIC_ANSWER_EXPLANATION',
        rationaleNonEvaluationReason: 'FINAL_ATTEMPT_STATIC_TERMINATION',
      },
    );
  }
  if (rationale !== null) return base;
  return complete(base, 'RESELECTION_CORRECT_UNVERIFIED', 'NOT_PROVIDED');
}
