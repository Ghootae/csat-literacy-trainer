import { z } from 'zod/v4';

import {
  DiagnosticEntryReasonSchema,
  DiagnosticTurnSchema,
  ProblemSolvingNextActionSchema,
  type ProblemSolvingNextAction,
} from './episode.js';

export const PROBLEM_SOLVING_SESSION_VERSION =
  'problem-solving-session-v1' as const;

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
    'UNRESOLVED',
  ]),
  finalChoiceId: z.string().min(1),
  correct: z.boolean(),
  initialChoiceWasCorrect: z.boolean(),
  rationaleAssessment: z.enum(['NOT_PROVIDED', 'SUPPORTED', 'UNCERTAIN', 'CLEAR_ERROR']),
});

const RejectedEvaluatorProposalSchema = z.object({
  turnId: z.string().min(1),
  action: ProblemSolvingNextActionSchema,
  reason: z.literal('DIAGNOSTIC_BUDGET_EXHAUSTED'),
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
  ]).nullable(),
  limits: z.object({
    maxDiagnosticQuestions: z.number().int().positive(),
    diagnosticQuestionsUsed: z.number().int().nonnegative(),
  }),
  requiredNextAction: z.enum(['ANY', 'DIRECT_COACHING']),
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
  if (
    session.requiredNextAction === 'DIRECT_COACHING' &&
    session.phase !== 'AWAITING_EVALUATION'
  ) {
    context.addIssue({ code: 'custom', path: ['requiredNextAction'], message: '직접 코칭 강제는 evaluator 대기 상태에서만 가능하다.' });
  }
});

export type ProblemSolvingSession = z.infer<typeof ProblemSolvingSessionSchema>;
export type CorrectRationaleAssessment = 'SUPPORTED' | 'UNCERTAIN' | 'CLEAR_ERROR';

function parsed(session: ProblemSolvingSession): ProblemSolvingSession {
  return ProblemSolvingSessionSchema.parse(session);
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

function complete(
  session: ProblemSolvingSession,
  outcome: NonNullable<ProblemSolvingSession['result']>['outcome'],
  rationaleAssessment: NonNullable<ProblemSolvingSession['result']>['rationaleAssessment'],
): ProblemSolvingSession {
  const latestChoiceId = session.latestChoiceId;
  if (latestChoiceId === null) throw new Error('최종 선택이 없다.');
  return parsed({
    ...session,
    phase: 'COMPLETED',
    pendingAction: null,
    requiredNextAction: 'ANY',
    result: {
      outcome,
      finalChoiceId: latestChoiceId,
      correct: latestChoiceId === session.answerChoiceId,
      initialChoiceWasCorrect: session.initialChoiceId === session.answerChoiceId,
      rationaleAssessment,
    },
  });
}

function completedCorrectionOutcome(
  session: ProblemSolvingSession,
): NonNullable<ProblemSolvingSession['result']>['outcome'] {
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
    limits: {
      maxDiagnosticQuestions: input.maxDiagnosticQuestions ?? 2,
      diagnosticQuestionsUsed: 0,
    },
    requiredNextAction: 'ANY',
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
        : 'UNVERIFIED_RATIONALE_CORRECT',
      'UNCERTAIN',
    );
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
    session.requiredNextAction === 'DIRECT_COACHING' &&
    turn.nextAction.type !== 'DIRECT_COACHING'
  ) {
    throw new Error('진단 질문 예산 소진 후에는 직접 코칭만 허용된다.');
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
      session.rationaleAssessment ?? 'NOT_PROVIDED',
    );
  }

  const diagnosticQuestionsUsed = session.limits.diagnosticQuestionsUsed +
    (turn.nextAction.type === 'ASK_DIAGNOSTIC' ? 1 : 0);
  const phase = turn.nextAction.type === 'REQUEST_RESELECTION'
    ? 'AWAITING_RESELECTION'
    : 'AWAITING_STUDENT_RESPONSE';
  return parsed({
    ...session,
    phase,
    turns: [...session.turns, turn],
    pendingAction: turn.nextAction,
    requiredNextAction: 'ANY',
    limits: { ...session.limits, diagnosticQuestionsUsed },
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
  return parsed({
    ...session,
    phase: 'AWAITING_EVALUATION',
    pendingAction: null,
    observations: [...session.observations, observation],
  });
}

export function submitProblemReselection(
  session: ProblemSolvingSession,
  input: { selectedChoiceId: string; rawResponse?: string },
): ProblemSolvingSession {
  assertPhase(session, 'AWAITING_RESELECTION');
  if (session.pendingAction?.type !== 'REQUEST_RESELECTION') {
    throw new Error('재선택 요청이 없다.');
  }
  const observation = SessionObservationSchema.parse({
    observationId: `O${session.observations.length + 1}`,
    kind: 'RESELECTION',
    inReplyToTurnId: session.turns.at(-1)!.turnId,
    selectedChoiceId: input.selectedChoiceId,
    rawResponse: input.rawResponse ?? input.selectedChoiceId,
  });
  const updated = parsed({
    ...session,
    latestChoiceId: input.selectedChoiceId,
    pendingAction: null,
    observations: [...session.observations, observation],
    phase: input.selectedChoiceId === session.answerChoiceId
      ? 'COMPLETED'
      : 'AWAITING_EVALUATION',
    entryReason: input.selectedChoiceId === session.answerChoiceId
      ? session.entryReason
      : 'WRONG_CHOICE',
    result: input.selectedChoiceId === session.answerChoiceId
      ? {
          outcome: completedCorrectionOutcome(session),
          finalChoiceId: input.selectedChoiceId,
          correct: true,
          initialChoiceWasCorrect: session.initialChoiceId === session.answerChoiceId,
          rationaleAssessment: session.rationaleAssessment ?? 'NOT_PROVIDED',
        }
      : null,
  });
  return updated;
}
