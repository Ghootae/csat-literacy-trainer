import { z } from 'zod/v4';

import {
  ParagraphUnderstandingHandoffSchema,
  type ParagraphUnderstandingHandoff,
} from '../learning-session/handoff.js';
import {
  ProblemQuestionGoldSchema,
  SupplementalExplanationInferenceSchema,
  type ProblemQuestionGold,
} from './gold.js';
import {
  PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
  PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
  ProblemPathDiagnosticOutputSchema,
  ProblemPathEvaluatorOutputSchema,
  type EvaluatorEvidence,
  type ProblemPathDiagnosticOutput,
  type ProblemPathEvaluatorOutput,
} from './path-evaluator.js';
import {
  ProblemSolvingSessionSchema,
  type ProblemSolvingSession,
} from './session.js';

export const SupplementalAccessReasonSchema = z.enum([
  'FAILED_CORRECTION',
  'EXPLANATION_REQUEST',
  'MAX_DIAGNOSTIC_TURNS',
]);

const ProjectedObservationSchema = z.discriminatedUnion('kind', [
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('INITIAL_SUBMISSION'),
    temporalRole: z.literal('INITIAL'),
    initialChoiceId: z.string().min(1),
    submittedChoiceId: z.string().min(1),
    selectedChoiceId: z.string().min(1),
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
    temporalRole: z.enum(['POST_DIAGNOSTIC', 'POST_CORRECTION']),
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
    temporalRole: z.literal('CURRENT'),
    inReplyToTurnId: z.string().min(1),
    selectedChoiceId: z.string().min(1),
    rawResponse: z.string().min(1),
  }).strict(),
]);

const BasicProblemGoldSchema = ProblemQuestionGoldSchema.omit({
  supplementalExplanationInferences: true,
});

const SessionStateProjectionSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  phase: z.enum([
    'AWAITING_CORRECT_RATIONALE_ASSESSMENT',
    'AWAITING_EVALUATION',
  ]),
  entryReason: z.enum(['WRONG_CHOICE', 'CORRECT_RATIONALE_REVIEW']).nullable(),
  currentChoiceId: z.string().min(1),
  answerChoiceId: z.string().min(1),
  evaluationSequence: z.number().int().positive(),
  diagnosticQuestionsUsed: z.number().int().nonnegative(),
  maxDiagnosticQuestions: z.number().int().positive(),
  requiredNextAction: z.enum(['ANY', 'DIRECT_COACHING']),
  allowedActionTypes: z.array(z.enum([
    'ASK_DIAGNOSTIC',
    'ASK_CORRECTIVE',
    'REQUEST_RESELECTION',
    'DIRECT_COACHING',
    'EXPLAIN_ITEM_BOUNDARY',
    'COMPLETE',
  ])).min(1),
}).strict();

export const ProblemPathEvaluatorInputSchema = z.object({
  promptVersion: z.literal(PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION),
  outputSchemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
  evaluationMode: z.enum(['ASSESS_SELECTION_RATIONALE', 'DIAGNOSE_PATH']),
  sessionState: SessionStateProjectionSchema,
  observations: z.array(ProjectedObservationSchema).min(1),
  basicGold: BasicProblemGoldSchema,
  paragraphHandoff: ParagraphUnderstandingHandoffSchema.nullable(),
  previousDiagnosticState: ProblemPathDiagnosticOutputSchema.nullable(),
  representativeWrongPathsIncluded: z.boolean(),
  supplementalAccess: z.object({
    reason: SupplementalAccessReasonSchema,
    targetOptionClaimIds: z.array(z.string().min(1)).min(1),
  }).nullable(),
  allowedSupplementalInferences: z.array(
    SupplementalExplanationInferenceSchema,
  ),
}).strict().superRefine((input, context) => {
  if (
    input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' &&
    input.sessionState.phase !== 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
  ) {
    context.addIssue({ code: 'custom', path: ['sessionState', 'phase'], message: '정답 근거 판정 모드와 세션 단계가 일치하지 않는다.' });
  }
  if (
    input.evaluationMode === 'DIAGNOSE_PATH' &&
    input.sessionState.phase !== 'AWAITING_EVALUATION'
  ) {
    context.addIssue({ code: 'custom', path: ['sessionState', 'phase'], message: '경로 진단 모드와 세션 단계가 일치하지 않는다.' });
  }
  if (
    input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' &&
    input.allowedSupplementalInferences.length > 0
  ) {
    context.addIssue({ code: 'custom', path: ['allowedSupplementalInferences'], message: '정답 근거 사전 판정에는 보충 해설을 제공하지 않는다.' });
  }
  if (
    input.supplementalAccess === null !==
    (input.allowedSupplementalInferences.length === 0)
  ) {
    context.addIssue({ code: 'custom', path: ['supplementalAccess'], message: '보충 해설 접근 사유와 실제 허용 정보가 함께 존재해야 한다.' });
  }
});

export type ProblemPathEvaluatorInput = z.infer<typeof ProblemPathEvaluatorInputSchema>;

export const BlindRationaleProviderInputSchema = z.object({
  promptVersion: z.literal(PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION),
  outputSchemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
  evaluationMode: z.literal('ASSESS_SELECTION_RATIONALE'),
  rationaleReview: z.object({
    stem: z.string().min(1),
    stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
    targetOptionText: z.string().min(1),
    studentRationale: z.object({
      observationId: z.string().min(1),
      sourceField: z.enum(['rationale', 'rawResponse']),
      text: z.string().min(1),
    }).strict(),
    sourceFacts: z.array(z.object({
      ref: z.string().min(1),
      kind: z.enum([
        'PASSAGE_PROPOSITION',
        'SCENARIO_FACT',
        'VISUAL_ASSERTION',
        'SOURCE_GROUNDED_INFERENCE',
      ]),
      text: z.string().min(1),
    }).strict()),
  }).strict(),
}).strict();

export type BlindRationaleProviderInput = z.infer<
  typeof BlindRationaleProviderInputSchema
>;

/**
 * 정답 근거 평가는 정답 키나 선지 판정 없이 발문·대상 선지·학생 근거와
 * 출처 기반 사실만 공급자에게 보낸다. 내부 세션은 정오 판정을 위해 정답을
 * 계속 보유하지만 이 projection 밖으로는 전달하지 않는다.
 */
export function projectProblemPathEvaluatorProviderInput(
  inputValue: ProblemPathEvaluatorInput,
): ProblemPathEvaluatorInput | BlindRationaleProviderInput {
  const input = ProblemPathEvaluatorInputSchema.parse(inputValue);
  if (input.evaluationMode === 'DIAGNOSE_PATH') return input;

  const targetChoice = input.basicGold.choices.find(
    (choice) => choice.choiceId === input.sessionState.currentChoiceId,
  );
  if (targetChoice === undefined) throw new Error('근거 평가 대상 선지를 찾을 수 없다.');
  const rationaleObservation = [...input.observations].reverse().find(
    (observation) => {
      if (observation.kind === 'INITIAL_SUBMISSION') {
        return observation.selectedChoiceId === input.sessionState.currentChoiceId &&
          observation.rationale !== null;
      }
      return observation.kind === 'RESELECTION' &&
        observation.selectedChoiceId === input.sessionState.currentChoiceId &&
        observation.rawResponse !== observation.selectedChoiceId;
    },
  );
  if (rationaleObservation === undefined) {
    throw new Error('블라인드 근거 평가에 사용할 학생 근거가 없다.');
  }
  const studentRationale = rationaleObservation.kind === 'INITIAL_SUBMISSION'
    ? rationaleObservation.rationale
    : rationaleObservation.rawResponse;
  if (studentRationale === null) throw new Error('블라인드 근거 평가 학생 근거가 비어 있다.');

  const requiredPropositionIds = new Set(
    targetChoice.requiredReferences.flatMap((reference) => reference.propositionIds),
  );
  const requiredScenarioFactIds = new Set(targetChoice.scenarioFactIds);
  const requiredVisualAssertionIds = new Set(targetChoice.visualAssertionIds);
  const targetClaimIds = new Set(targetChoice.claimIds);
  const sourceGroundedInferenceIds = new Set(
    input.basicGold.optionClaims
      .filter((claim) => targetClaimIds.has(claim.claimId))
      .flatMap((claim) => claim.itemInferenceIds),
  );

  const sourceFacts: BlindRationaleProviderInput['rationaleReview']['sourceFacts'] = [
    ...input.basicGold.passageDetailGold.propositions
      .filter((proposition) => requiredPropositionIds.has(proposition.id))
      .map((proposition) => ({
        ref: proposition.id,
        kind: 'PASSAGE_PROPOSITION' as const,
        text: proposition.description,
      })),
    ...(input.basicGold.scenario?.facts ?? [])
      .filter((fact) => requiredScenarioFactIds.has(fact.id))
      .map((fact) => ({
        ref: fact.id,
        kind: 'SCENARIO_FACT' as const,
        text: fact.description,
      })),
    ...input.basicGold.visualAssertions
      .filter((assertion) => requiredVisualAssertionIds.has(assertion.id))
      .map((assertion) => ({
        ref: assertion.id,
        kind: 'VISUAL_ASSERTION' as const,
        text: assertion.description,
      })),
    ...input.basicGold.itemInferences
      .filter((inference) =>
        sourceGroundedInferenceIds.has(inference.inferenceId) &&
        inference.grounding !== 'ANSWER_KEY_CONSTRAINED')
      .map((inference) => ({
        ref: inference.inferenceId,
        kind: 'SOURCE_GROUNDED_INFERENCE' as const,
        text: inference.description,
      })),
  ];

  return BlindRationaleProviderInputSchema.parse({
    promptVersion: input.promptVersion,
    outputSchemaVersion: input.outputSchemaVersion,
    evaluationMode: 'ASSESS_SELECTION_RATIONALE',
    rationaleReview: {
      stem: input.basicGold.stem,
      stemPolarity: input.basicGold.stemPolarity,
      targetOptionText: targetChoice.text,
      studentRationale: {
        observationId: rationaleObservation.observationId,
        sourceField: rationaleObservation.kind === 'INITIAL_SUBMISSION'
          ? 'rationale'
          : 'rawResponse',
        text: studentRationale,
      },
      sourceFacts,
    },
  });
}

export interface SupplementalAccessRequest {
  readonly reason: z.infer<typeof SupplementalAccessReasonSchema>;
  readonly inferenceIds: readonly string[];
  readonly targetOptionClaimIds: readonly string[];
}

function allowedActions(session: ProblemSolvingSession): ProblemPathEvaluatorInput['sessionState']['allowedActionTypes'] {
  if (session.requiredNextAction === 'DIRECT_COACHING') return ['DIRECT_COACHING'];
  const actions: ProblemPathEvaluatorInput['sessionState']['allowedActionTypes'] = [
    'ASK_CORRECTIVE',
    'REQUEST_RESELECTION',
    'DIRECT_COACHING',
    'EXPLAIN_ITEM_BOUNDARY',
    'COMPLETE',
  ];
  if (session.limits.diagnosticQuestionsUsed < session.limits.maxDiagnosticQuestions) {
    actions.unshift('ASK_DIAGNOSTIC');
  }
  return actions;
}

function projectObservations(session: ProblemSolvingSession): ProblemPathEvaluatorInput['observations'] {
  return session.observations.map((observation) => {
    if (observation.kind === 'INITIAL_SUBMISSION') {
      return {
        ...structuredClone(observation),
        selectedChoiceId: observation.submittedChoiceId,
        temporalRole: 'INITIAL' as const,
      };
    }
    if (observation.kind === 'RESELECTION') {
      return { ...structuredClone(observation), temporalRole: 'CURRENT' as const };
    }
    return {
      ...structuredClone(observation),
      temporalRole: observation.responseType === 'DIAGNOSTIC_ANSWER'
        ? 'POST_DIAGNOSTIC' as const
        : 'POST_CORRECTION' as const,
    };
  });
}

function projectBasicGold(
  gold: ProblemQuestionGold,
  includeRepresentativeWrongPaths: boolean,
): z.infer<typeof BasicProblemGoldSchema> {
  const {
    supplementalExplanationInferences: _withheldSupplementalInferences,
    ...basicGold
  } = structuredClone(gold);
  return BasicProblemGoldSchema.parse({
    ...basicGold,
    representativeWrongPaths: includeRepresentativeWrongPaths
      ? basicGold.representativeWrongPaths
      : [],
  });
}

function authorizeSupplementalInferences(
  gold: ProblemQuestionGold,
  request: SupplementalAccessRequest | undefined,
): {
  readonly supplementalAccess: ProblemPathEvaluatorInput['supplementalAccess'];
  readonly allowedSupplementalInferences: ProblemPathEvaluatorInput['allowedSupplementalInferences'];
} {
  if (request === undefined) {
    return { supplementalAccess: null, allowedSupplementalInferences: [] };
  }
  if (request.inferenceIds.length === 0) {
    throw new Error('보충 해설 접근 요청에는 inference ID가 필요하다.');
  }
  const requiredPolicy = {
    FAILED_CORRECTION: 'AFTER_FAILED_CORRECTION',
    EXPLANATION_REQUEST: 'ON_EXPLANATION_REQUEST',
    MAX_DIAGNOSTIC_TURNS: 'DIRECT_COACHING_ONLY',
  } as const;
  const claimsById = new Map(gold.optionClaims.map((claim) => [claim.claimId, claim]));
  const targetClaims = request.targetOptionClaimIds.map((id) => {
    const claim = claimsById.get(id);
    if (claim === undefined) throw new Error(`존재하지 않는 보충 해설 대상 주장: ${id}`);
    return claim;
  });
  const supplementalById = new Map(
    gold.supplementalExplanationInferences.map((item) => [item.inferenceId, item]),
  );
  const seen = new Set<string>();
  const allowed = request.inferenceIds.map((id) => {
    if (seen.has(id)) throw new Error(`중복된 보충 해설 요청: ${id}`);
    seen.add(id);
    const supplemental = supplementalById.get(id);
    if (supplemental === undefined) throw new Error(`존재하지 않는 보충 해설: ${id}`);
    if (supplemental.reviewStatus !== 'human_reviewed') {
      throw new Error(`사람이 검토하지 않은 보충 해설: ${id}`);
    }
    const authorized = targetClaims.some(
      (claim) =>
        claim.fallbackSupplementalInferenceIds.includes(id) &&
        claim.supplementalUsePolicy.includes(requiredPolicy[request.reason]),
    );
    if (!authorized) throw new Error(`허용 조건을 충족하지 않은 보충 해설: ${id}`);
    return structuredClone(supplemental);
  });
  return {
    supplementalAccess: {
      reason: request.reason,
      targetOptionClaimIds: [...request.targetOptionClaimIds],
    },
    allowedSupplementalInferences: allowed,
  };
}

function allBasicGoldIds(gold: ProblemPathEvaluatorInput['basicGold']): Set<string> {
  return new Set([
    ...gold.passageDetailGold.propositions.map((item) => item.id),
    ...(gold.scenario?.facts.map((item) => item.id) ?? []),
    ...gold.visualAssertions.map((item) => item.id),
    ...gold.itemInferences.map((item) => item.inferenceId),
    ...gold.optionClaims.map((item) => item.claimId),
    ...gold.referencePath.map((item) => item.stepId),
    ...gold.choices.map((item) => item.choiceId),
  ]);
}

function diagnosticEntityIds(output: ProblemPathDiagnosticOutput): Set<string> {
  const ids = new Set<string>();
  for (const target of output.targets) {
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') continue;
    for (const step of target.pathSteps) {
      const id = step.identity.existingId ?? step.identity.localId;
      if (id !== null) ids.add(id);
    }
    for (const hypothesis of target.hypotheses) {
      const id = hypothesis.identity.existingId ?? hypothesis.identity.localId;
      if (id !== null) ids.add(id);
    }
  }
  return ids;
}

export function createProblemPathEvaluatorInput(options: {
  readonly evaluationMode: ProblemPathEvaluatorInput['evaluationMode'];
  readonly session: ProblemSolvingSession;
  readonly gold: ProblemQuestionGold;
  readonly paragraphHandoff?: ParagraphUnderstandingHandoff | null;
  readonly previousDiagnosticState?: ProblemPathDiagnosticOutput | null;
  readonly includeRepresentativeWrongPaths?: boolean;
  readonly supplementalAccess?: SupplementalAccessRequest;
}): ProblemPathEvaluatorInput {
  const session = ProblemSolvingSessionSchema.parse(options.session);
  const gold = ProblemQuestionGoldSchema.parse(options.gold);
  if (gold.reviewStatus !== 'human_reviewed') {
    throw new Error('문제 풀이 evaluator는 사람이 검토한 골드만 사용할 수 있다.');
  }
  if (session.questionId !== gold.questionId || session.answerChoiceId !== gold.answerChoiceId) {
    throw new Error('세션과 골드의 문항 또는 정답이 일치하지 않는다.');
  }
  if (session.latestChoiceId === null) throw new Error('평가할 현재 선택이 없다.');
  if (options.paragraphHandoff !== undefined && options.paragraphHandoff !== null) {
    const handoff = ParagraphUnderstandingHandoffSchema.parse(options.paragraphHandoff);
    if (handoff.passageId !== gold.passageId) throw new Error('문단 handoff와 문제 골드의 passageId가 일치하지 않는다.');
  }
  if (
    options.evaluationMode === 'ASSESS_SELECTION_RATIONALE' &&
    options.supplementalAccess !== undefined
  ) {
    throw new Error('정답 근거 사전 판정에는 보충 해설을 요청할 수 없다.');
  }
  if (
    options.supplementalAccess?.reason === 'MAX_DIAGNOSTIC_TURNS' &&
    session.requiredNextAction !== 'DIRECT_COACHING'
  ) {
    throw new Error('질문 예산 소진 상태가 아니면 MAX_DIAGNOSTIC_TURNS 보충 해설을 열 수 없다.');
  }
  if (
    options.supplementalAccess?.reason === 'FAILED_CORRECTION' &&
    !session.observations.some(
      (item) => item.kind === 'FOLLOW_UP_RESPONSE' && item.responseType === 'CORRECTIVE_ANSWER',
    )
  ) {
    throw new Error('교정 답변 관찰 없이 FAILED_CORRECTION 보충 해설을 열 수 없다.');
  }
  const supplemental = authorizeSupplementalInferences(gold, options.supplementalAccess);
  return ProblemPathEvaluatorInputSchema.parse({
    promptVersion: PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
    outputSchemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
    evaluationMode: options.evaluationMode,
    sessionState: {
      sessionId: session.sessionId,
      questionId: session.questionId,
      phase: session.phase,
      entryReason: session.entryReason,
      currentChoiceId: session.latestChoiceId,
      answerChoiceId: session.answerChoiceId,
      evaluationSequence: session.turns.length + 1,
      diagnosticQuestionsUsed: session.limits.diagnosticQuestionsUsed,
      maxDiagnosticQuestions: session.limits.maxDiagnosticQuestions,
      requiredNextAction: session.requiredNextAction,
      allowedActionTypes: allowedActions(session),
    },
    observations: projectObservations(session),
    basicGold: projectBasicGold(
      gold,
      options.includeRepresentativeWrongPaths ?? true,
    ),
    paragraphHandoff: options.paragraphHandoff ?? null,
    previousDiagnosticState: options.previousDiagnosticState ?? null,
    representativeWrongPathsIncluded: options.includeRepresentativeWrongPaths ?? true,
    ...supplemental,
  });
}

function valueAtEvidenceField(
  observation: ProblemPathEvaluatorInput['observations'][number],
  field: Extract<EvaluatorEvidence, { kind: 'STRUCTURED_VALUE' }>['field'],
): string | number | null | undefined {
  if (field === 'initialChoiceId' || field === 'submittedChoiceId' || field === 'confidence') {
    return observation.kind === 'INITIAL_SUBMISSION' ? observation[field] : undefined;
  }
  if (field === 'runnerUp.choiceId') {
    return observation.kind === 'INITIAL_SUBMISSION'
      ? observation.runnerUp?.choiceId
      : undefined;
  }
  if (field === 'selectedChoiceId') {
    return observation.kind === 'RESELECTION' || observation.kind === 'INITIAL_SUBMISSION'
      ? observation.selectedChoiceId
      : undefined;
  }
  return observation.kind === 'FOLLOW_UP_RESPONSE' ? observation.responseType : undefined;
}

function textAtEvidenceField(
  observation: ProblemPathEvaluatorInput['observations'][number],
  field: Extract<EvaluatorEvidence, { kind: 'QUOTE' }>['sourceField'],
): string | null | undefined {
  if (field === 'rationale' || field === 'strategy') {
    return observation.kind === 'INITIAL_SUBMISSION' ? observation[field] : undefined;
  }
  if (field === 'runnerUp.rationale') {
    return observation.kind === 'INITIAL_SUBMISSION'
      ? observation.runnerUp?.rationale
      : undefined;
  }
  return observation.kind === 'FOLLOW_UP_RESPONSE' || observation.kind === 'RESELECTION'
    ? observation.rawResponse
    : undefined;
}

function validateEvidenceAgainstInput(
  evidence: readonly EvaluatorEvidence[],
  input: ProblemPathEvaluatorInput,
): void {
  const observations = new Map(input.observations.map((item) => [item.observationId, item]));
  for (const item of evidence) {
    const observation = observations.get(item.observationId);
    if (observation === undefined) throw new Error(`존재하지 않는 관찰 근거: ${item.observationId}`);
    if (item.kind === 'QUOTE') {
      const source = textAtEvidenceField(observation, item.sourceField);
      if (source === undefined || source === null || !source.includes(item.quote)) {
        throw new Error(`학생 원문과 일치하지 않는 인용: ${item.observationId}`);
      }
      continue;
    }
    const actual = valueAtEvidenceField(observation, item.field);
    if (actual === undefined || actual !== item.value) {
      throw new Error(`구조화 관찰값과 일치하지 않는 근거: ${item.observationId}`);
    }
  }
}

export function validateProblemPathEvaluatorOutput(
  outputInput: unknown,
  evaluatorInput: ProblemPathEvaluatorInput,
  options: { readonly allowCodeResolvedIds?: boolean } = {},
): ProblemPathEvaluatorOutput {
  const input = ProblemPathEvaluatorInputSchema.parse(evaluatorInput);
  const output = ProblemPathEvaluatorOutputSchema.parse(outputInput);
  if (output.mode !== input.evaluationMode) throw new Error('evaluator 입력 모드와 출력 모드가 일치하지 않는다.');

  const basicGoldIds = allBasicGoldIds(input.basicGold);

  const allowedObservationIds = new Set(input.observations.map((item) => item.observationId));
  if (output.mode === 'ASSESS_SELECTION_RATIONALE') {
    validateEvidenceAgainstInput(output.evidence, input);
    const providerInput = BlindRationaleProviderInputSchema.parse(
      projectProblemPathEvaluatorProviderInput(input),
    );
    const requiredStance = providerInput.rationaleReview.stemPolarity === 'SELECT_INCORRECT'
      ? 'REJECTS_OPTION'
      : 'ACCEPTS_OPTION';
    if (output.requiredStanceForSelection !== requiredStance) {
      throw new Error('발문 극성에 필요한 선지 태도 판정이 일치하지 않는다.');
    }
    const allowedSourceRefs = new Set(
      providerInput.rationaleReview.sourceFacts.map((fact) => fact.ref),
    );
    if (output.sourceRefs.some((id) => !allowedSourceRefs.has(id))) {
      throw new Error('근거 판정이 공급자에게 제공되지 않은 출처 사실을 참조한다.');
    }
    return output;
  }

  if (output.basedOnObservationIds.some((id) => !allowedObservationIds.has(id))) {
    throw new Error('전체 스냅샷이 존재하지 않는 관찰을 참조한다.');
  }
  if (output.basedOnObservationIds.length !== allowedObservationIds.size) {
    throw new Error('전체 스냅샷은 모든 누적 관찰 ID를 포함해야 한다.');
  }
  if (new Set(output.basedOnObservationIds).size !== output.basedOnObservationIds.length) {
    throw new Error('전체 스냅샷의 관찰 ID가 중복됐다.');
  }
  const targetKinds = new Set(output.targets.map((target) => target.kind));
  if (
    input.sessionState.entryReason === 'WRONG_CHOICE' &&
    (
      output.targets.length !== 2 ||
      !targetKinds.has('SELECTED_CHOICE') ||
      !targetKinds.has('MISSED_ANSWER')
    )
  ) {
    throw new Error('오답 진단 출력에는 선택 오답과 놓친 정답 타깃이 모두 필요하다.');
  }
  if (
    input.sessionState.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
    (output.targets.length !== 1 || !targetKinds.has('ANSWER_RATIONALE'))
  ) {
    throw new Error('정답 근거 진단 출력에는 ANSWER_RATIONALE 타깃 하나만 필요하다.');
  }
  const previousIds = input.previousDiagnosticState === null
    ? new Set<string>()
    : diagnosticEntityIds(input.previousDiagnosticState);
  const wrongPathIds = new Set(
    input.basicGold.representativeWrongPaths.map((item) => item.id),
  );
  const optionClaimIds = new Set(input.basicGold.optionClaims.map((item) => item.claimId));
  for (const target of output.targets) {
    const expectedChoiceId = target.kind === 'SELECTED_CHOICE'
      ? input.sessionState.currentChoiceId
      : input.sessionState.answerChoiceId;
    if (target.choiceId !== expectedChoiceId) {
      throw new Error('진단 타깃의 선지가 현재 선택 또는 정답과 일치하지 않는다.');
    }
    if (target.status === 'NOT_ASSESSED' || target.status === 'NOT_DIRECTLY_DIAGNOSED') continue;
    for (const step of target.pathSteps) {
      validateEvidenceAgainstInput(step.evidence, input);
      if (step.goldRefs.some((id) => !basicGoldIds.has(id))) {
        throw new Error('경로 단계가 존재하지 않는 기본 골드를 참조한다.');
      }
      if (
        !options.allowCodeResolvedIds &&
        step.identity.existingId !== null &&
        !previousIds.has(step.identity.existingId)
      ) {
        throw new Error(`이전 스냅샷에 존재하지 않는 경로 단계 ID: ${step.identity.existingId}`);
      }
    }
    for (const hypothesis of target.hypotheses) {
      validateEvidenceAgainstInput(hypothesis.evidence, input);
      if (hypothesis.goldRefs.optionClaimIds.some((id) => !optionClaimIds.has(id))) {
        throw new Error('가설이 존재하지 않는 선지 주장을 참조한다.');
      }
      if (
        hypothesis.goldRefs.representativeWrongPathIds
          .some((id) => !wrongPathIds.has(id))
      ) {
        throw new Error('가설이 입력에 제공되지 않은 대표 오답 경로를 참조한다.');
      }
      if (
        hypothesis.intervention.targetRelationRefs
          .some((id) => !basicGoldIds.has(id))
      ) {
        throw new Error('가설의 개입이 존재하지 않는 기본 골드를 참조한다.');
      }
      if (
        !options.allowCodeResolvedIds &&
        hypothesis.identity.existingId !== null &&
        !previousIds.has(hypothesis.identity.existingId)
      ) {
        throw new Error(`이전 스냅샷에 존재하지 않는 가설 ID: ${hypothesis.identity.existingId}`);
      }
    }
  }
  if (!input.sessionState.allowedActionTypes.includes(output.nextActionCandidate.type)) {
    throw new Error(`현재 코드 상태가 허용하지 않는 행동: ${output.nextActionCandidate.type}`);
  }
  const intent = output.nextActionCandidate.questionIntent;
  if (
    intent !== null &&
    intent.targetRelationRefs.some((id) => !basicGoldIds.has(id))
  ) {
    throw new Error('질문 의도가 존재하지 않는 기본 골드 관계를 참조한다.');
  }
  const allowedSupplementalIds = new Set(
    input.allowedSupplementalInferences.map((item) => item.inferenceId),
  );
  if (
    output.nextActionCandidate.supplementalInferenceIds
      .some((id) => !allowedSupplementalIds.has(id))
  ) {
    throw new Error('evaluator가 허용되지 않은 보충 해설을 사용했다.');
  }
  if (
    output.nextActionCandidate.type === 'COMPLETE' &&
    input.sessionState.currentChoiceId !== input.sessionState.answerChoiceId
  ) {
    throw new Error('현재 선택이 오답이면 evaluator가 완료를 확정할 수 없다.');
  }
  return output;
}
