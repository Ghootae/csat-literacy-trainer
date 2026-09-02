import { z } from 'zod/v4';

import {
  ParagraphUnderstandingHandoffSchema,
  type ParagraphUnderstandingHandoff,
} from '../learning-session/handoff.js';
import {
  ProblemQuestionGoldSchema,
  SupplementalExplanationInferenceSchema,
  targetClaimEffectForAssessment,
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
  'FINAL_ATTEMPT',
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
    rationaleProvided: z.boolean(),
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
  questionsUsedThisAttempt: z.number().int().nonnegative(),
  maxQuestionsPerWrongAttempt: z.number().int().positive(),
  selectionAttempt: z.number().int().positive(),
  maxSelectionAttempts: z.number().int().positive(),
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

export const ProblemPathEvaluationProfileSchema = z.enum([
  'CORRECT_ACCEPTED',
  'CORRECT_REJECTED',
  'WRONG_ACCEPTED',
  'WRONG_REJECTED',
]);

export const ProblemPathEvaluationContextSchema = z.object({
  profile: ProblemPathEvaluationProfileSchema,
  selectionCorrect: z.boolean(),
  choiceDecision: z.enum(['ACCEPTED', 'REJECTED']),
  selectionIntent: z.enum(['ACCEPTS_OPTION', 'REJECTS_OPTION']),
  targetClaimEffects: z.array(z.enum([
    'SUPPORTS',
    'CONTRADICTS',
    'DOES_NOT_JUSTIFY',
  ])),
  rationaleRolePolicy: z.object({
    selectionIntentSource: z.literal('BUTTON_AND_STEM'),
    targetClaimRestatement: z.literal('EXCLUDE_FROM_EVIDENCE'),
    evidenceClaims: z.literal('ASSESS_SEPARATELY'),
  }).strict(),
}).strict();

export type ProblemPathEvaluationContext = z.infer<
  typeof ProblemPathEvaluationContextSchema
>;

export function deriveProblemPathEvaluationContext(
  goldValue: ProblemQuestionGold | z.infer<typeof BasicProblemGoldSchema>,
  choiceId: string,
): ProblemPathEvaluationContext {
  const gold = goldValue;
  const choice = gold.choices.find((candidate) => candidate.choiceId === choiceId);
  if (choice === undefined) throw new Error(`판정 프로필 대상 선지를 찾을 수 없다: ${choiceId}`);
  const selectionCorrect = choiceId === gold.answerChoiceId;
  const choiceDecision = gold.stemPolarity === 'SELECT_CORRECT'
    ? selectionCorrect ? 'ACCEPTED' as const : 'REJECTED' as const
    : selectionCorrect ? 'REJECTED' as const : 'ACCEPTED' as const;
  const profile = selectionCorrect
    ? choiceDecision === 'ACCEPTED' ? 'CORRECT_ACCEPTED' : 'CORRECT_REJECTED'
    : choiceDecision === 'ACCEPTED' ? 'WRONG_ACCEPTED' : 'WRONG_REJECTED';
  const choiceClaimIds = new Set(choice.claimIds);
  const inferenceEffects = gold.itemInferences
    .filter((inference) => inference.targetClaimIds.some((id) => choiceClaimIds.has(id)))
    .map((inference) => inference.targetClaimEffect);
  const assessmentEffects = gold.optionClaims
    .filter((claim) => choiceClaimIds.has(claim.claimId))
    .flatMap((claim) => {
      const effect = targetClaimEffectForAssessment(claim.assessment);
      return effect === null ? [] : [effect];
    });
  return ProblemPathEvaluationContextSchema.parse({
    profile,
    selectionCorrect,
    choiceDecision,
    selectionIntent: gold.stemPolarity === 'SELECT_INCORRECT'
      ? 'REJECTS_OPTION'
      : 'ACCEPTS_OPTION',
    targetClaimEffects: [...new Set([...inferenceEffects, ...assessmentEffects])],
    rationaleRolePolicy: {
      selectionIntentSource: 'BUTTON_AND_STEM',
      targetClaimRestatement: 'EXCLUDE_FROM_EVIDENCE',
      evidenceClaims: 'ASSESS_SEPARATELY',
    },
  });
}

export const ProblemPathEvaluatorInputSchema = z.object({
  promptVersion: z.literal(PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION),
  outputSchemaVersion: z.literal(PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION),
  evaluationMode: z.enum(['ASSESS_SELECTION_RATIONALE', 'DIAGNOSE_PATH']),
  evaluationContext: ProblemPathEvaluationContextSchema,
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
  const expectedEvaluationContext = deriveProblemPathEvaluationContext(
    input.basicGold,
    input.sessionState.currentChoiceId,
  );
  if (JSON.stringify(input.evaluationContext) !== JSON.stringify(expectedEvaluationContext)) {
    context.addIssue({ code: 'custom', path: ['evaluationContext'], message: '코드 판정 프로필이 현재 선택과 골드에 일치하지 않는다.' });
  }
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
    !input.evaluationContext.selectionCorrect
  ) {
    context.addIssue({ code: 'custom', path: ['evaluationContext', 'profile'], message: '정답 근거 판정에는 CORRECT 프로필이 필요하다.' });
  }
  if (
    input.evaluationMode === 'DIAGNOSE_PATH' &&
    input.sessionState.entryReason === 'WRONG_CHOICE' &&
    input.evaluationContext.selectionCorrect
  ) {
    context.addIssue({ code: 'custom', path: ['evaluationContext', 'profile'], message: '오답 경로 진단에는 WRONG 프로필이 필요하다.' });
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
  evaluationContext: ProblemPathEvaluationContextSchema,
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
    sourceCoverage: z.object({
      status: z.literal('COMPLETE_RELEVANT_SOURCE_FACTS_FOR_TARGET_OPTION'),
      description: z.string().min(1),
    }).strict(),
    sufficiencyPolicy: z.object({
      acceptedSupportRoutes: z.tuple([
        z.literal('APPROVED_SUFFICIENT_GROUND_SET'),
        z.literal('SEMANTICALLY_EQUIVALENT_COMPRESSED_CAUSAL_CHAIN'),
        z.literal('APPROVED_COMPLETE_ELIMINATION_PATH'),
      ]),
      selectionRestatement: z.literal('NOT_EVIDENCE'),
      humanReviewedSufficientGroundSets: z.array(z.object({
        setId: z.string().min(1),
        targetClaimIds: z.array(z.string().min(1)).min(1),
        route: z.enum([
          'APPROVED_SUFFICIENT_GROUND_SET',
          'SEMANTICALLY_EQUIVALENT_COMPRESSED_CAUSAL_CHAIN',
          'APPROVED_COMPLETE_ELIMINATION_PATH',
        ]),
        operator: z.literal('ALL_OF'),
        requiredSourceRefs: z.array(z.string().min(1)).min(1),
        allowedOmissionSourceRefs: z.array(z.string().min(1)),
        conclusion: z.string().min(1),
        reviewStatus: z.literal('human_reviewed'),
      }).strict()),
    }).strict(),
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
        observation.selectedChoiceId === input.sessionState.currentChoiceId;
    },
  );
  if (rationaleObservation === undefined) {
    throw new Error('블라인드 근거 평가에 사용할 학생 근거가 없다.');
  }
  const studentRationale = rationaleObservation.kind === 'INITIAL_SUBMISSION'
    ? rationaleObservation.rationale
    : rationaleObservation.rawResponse;
  if (studentRationale === null) throw new Error('블라인드 근거 평가 학생 근거가 비어 있다.');
  const humanReviewedSufficientGroundSets = (input.basicGold.sufficientGroundSets ?? [])
    .filter((set) => set.choiceId === targetChoice.choiceId)
    .map(({ choiceId: _choiceId, ...set }) => set);

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
        // 빠른 근거 판정에는 추론 행위 요약이 아니라 방향이 완결된 결론을 제공한다.
        text: inference.conclusion,
      })),
  ];

  return BlindRationaleProviderInputSchema.parse({
    promptVersion: input.promptVersion,
    outputSchemaVersion: input.outputSchemaVersion,
    evaluationMode: 'ASSESS_SELECTION_RATIONALE',
    evaluationContext: input.evaluationContext,
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
      sourceCoverage: {
        status: 'COMPLETE_RELEVANT_SOURCE_FACTS_FOR_TARGET_OPTION',
        description: 'sourceFacts는 대상 선지의 관계를 판단하기 위해 승인 골드가 지정한 관련 지문·보기 사실 전체다.',
      },
      sufficiencyPolicy: {
        acceptedSupportRoutes: [
          'APPROVED_SUFFICIENT_GROUND_SET',
          'SEMANTICALLY_EQUIVALENT_COMPRESSED_CAUSAL_CHAIN',
          'APPROVED_COMPLETE_ELIMINATION_PATH',
        ],
        selectionRestatement: 'NOT_EVIDENCE',
        humanReviewedSufficientGroundSets,
      },
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
  if (session.entryReason === 'CORRECT_RATIONALE_REVIEW') {
    const correctiveQuestionsUsed = session.turns.filter(
      (turn) => turn.nextAction.type === 'ASK_CORRECTIVE' &&
        turn.nextAction.target === 'ANSWER_RATIONALE',
    ).length;
    return correctiveQuestionsUsed === 0
      ? ['ASK_CORRECTIVE', 'COMPLETE']
      : ['DIRECT_COACHING', 'COMPLETE'];
  }
  if (session.limits.questionsUsedThisAttempt >= session.limits.maxQuestionsPerWrongAttempt) {
    return ['DIRECT_COACHING', 'REQUEST_RESELECTION', 'EXPLAIN_ITEM_BOUNDARY'];
  }
  const actions: ProblemPathEvaluatorInput['sessionState']['allowedActionTypes'] = [
    'ASK_CORRECTIVE',
    'REQUEST_RESELECTION',
    'EXPLAIN_ITEM_BOUNDARY',
  ];
  if (session.limits.diagnosticQuestionsUsed < session.limits.maxDiagnosticQuestions) {
    actions.unshift('ASK_DIAGNOSTIC');
  }
  return actions;
}

export function failedCorrectionSupplementalAccess(
  goldInput: ProblemQuestionGold,
  choiceId: string,
): SupplementalAccessRequest | undefined {
  const gold = ProblemQuestionGoldSchema.parse(goldInput);
  const targetClaims = gold.optionClaims.filter(
    (claim) => claim.choiceId === choiceId &&
      claim.supplementalUsePolicy.includes('AFTER_FAILED_CORRECTION'),
  );
  const inferenceIds = [...new Set(
    targetClaims.flatMap((claim) => claim.fallbackSupplementalInferenceIds),
  )];
  if (inferenceIds.length === 0 || targetClaims.length === 0) return undefined;
  return {
    reason: 'FAILED_CORRECTION',
    inferenceIds,
    targetOptionClaimIds: targetClaims.map((claim) => claim.claimId),
  };
}

export function exhaustedWrongAttemptSupplementalAccess(
  goldInput: ProblemQuestionGold,
  choiceIds: readonly string[],
): SupplementalAccessRequest | undefined {
  const gold = ProblemQuestionGoldSchema.parse(goldInput);
  const choices = new Set(choiceIds);
  const targetClaims = gold.optionClaims.filter(
    (claim) => choices.has(claim.choiceId) &&
      claim.supplementalUsePolicy.includes('DIRECT_COACHING_ONLY'),
  );
  const inferenceIds = [...new Set(
    targetClaims.flatMap((claim) => claim.fallbackSupplementalInferenceIds),
  )];
  if (inferenceIds.length === 0 || targetClaims.length === 0) return undefined;
  return {
    reason: 'MAX_DIAGNOSTIC_TURNS',
    inferenceIds,
    targetOptionClaimIds: targetClaims.map((claim) => claim.claimId),
  };
}

export function finalAttemptSupplementalAccess(
  goldInput: ProblemQuestionGold,
  choiceIds: readonly string[],
): SupplementalAccessRequest | undefined {
  const access = exhaustedWrongAttemptSupplementalAccess(goldInput, choiceIds);
  return access === undefined ? undefined : { ...access, reason: 'FINAL_ATTEMPT' };
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
    FINAL_ATTEMPT: 'DIRECT_COACHING_ONLY',
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
    options.supplementalAccess?.reason === 'FINAL_ATTEMPT' &&
    (
      session.requiredNextAction !== 'DIRECT_COACHING' ||
      session.selectionAttempt < session.limits.maxSelectionAttempts
    )
  ) {
    throw new Error('최종 선택 상태가 아니면 FINAL_ATTEMPT 보충 해설을 열 수 없다.');
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
    evaluationContext: deriveProblemPathEvaluationContext(gold, session.latestChoiceId),
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
      questionsUsedThisAttempt: session.limits.questionsUsedThisAttempt,
      maxQuestionsPerWrongAttempt: session.limits.maxQuestionsPerWrongAttempt,
      selectionAttempt: session.selectionAttempt,
      maxSelectionAttempts: session.limits.maxSelectionAttempts,
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

/**
 * `status`와 `learningState`는 모델이 판단할 독립 의미값이 아니다.
 * 모델이 제시한 충분성·현재 오류 판정·학생의 수정 근거에서 코드가 두 상태를
 * 결정한다. 공급자 원출력은 runtime의 `rawOutput`에 별도로 보존된다.
 */
export function resolveCodeOwnedDiagnosticTargetStates(outputInput: unknown): unknown {
  const output = structuredClone(outputInput);
  if (
    typeof output !== 'object' ||
    output === null ||
    !('mode' in output) ||
    output.mode !== 'DIAGNOSE_PATH' ||
    !('targets' in output) ||
    !Array.isArray(output.targets)
  ) {
    return output;
  }

  for (const target of output.targets) {
    if (
      typeof target !== 'object' ||
      target === null ||
      !('sufficiency' in target) ||
      typeof target.sufficiency !== 'object' ||
      target.sufficiency === null ||
      !('sufficient' in target.sufficiency) ||
      typeof target.sufficiency.sufficient !== 'boolean' ||
      !('errorAssessment' in target) ||
      typeof target.errorAssessment !== 'string'
    ) {
      continue;
    }

    if (!target.sufficiency.sufficient) {
      Object.assign(target, {
        status: 'INSUFFICIENT',
        learningState: 'PATH_UNCLEAR',
      });
      continue;
    }

    if (target.errorAssessment === 'CLEAR_ERROR') {
      Object.assign(target, {
        status: 'SUFFICIENT',
        learningState: 'PATH_CLARIFIED',
      });
      continue;
    }

    if (
      target.errorAssessment === 'REASONABLE_ALTERNATIVE_INTERPRETATION' ||
      target.errorAssessment === 'GOLD_OR_ITEM_LIMITATION'
    ) {
      Object.assign(target, {
        status: 'BOUNDARY_CLARIFICATION_REQUIRED',
        learningState: 'ITEM_BOUNDARY_CLARIFIED',
      });
      continue;
    }

    if (target.errorAssessment === 'NO_ERROR_DETECTED') {
      const hasObservedRevision = 'pathSteps' in target &&
        Array.isArray(target.pathSteps) &&
        target.pathSteps.some((step: unknown) =>
          typeof step === 'object' &&
          step !== null &&
          'relationToPrior' in step &&
          step.relationToPrior === 'REVISES_PRIOR'
        );
      Object.assign(target, {
        status: 'RESOLVED',
        learningState: hasObservedRevision ? 'CORRECTED' : 'NO_ERROR_DETECTED',
      });
    }
  }

  return output;
}

export function validateProblemPathEvaluatorOutput(
  outputInput: unknown,
  evaluatorInput: ProblemPathEvaluatorInput,
  options: { readonly allowCodeResolvedIds?: boolean } = {},
): ProblemPathEvaluatorOutput {
  const input = ProblemPathEvaluatorInputSchema.parse(evaluatorInput);
  const output = ProblemPathEvaluatorOutputSchema.parse(
    resolveCodeOwnedDiagnosticTargetStates(outputInput),
  );
  if (output.mode !== input.evaluationMode) throw new Error('evaluator 입력 모드와 출력 모드가 일치하지 않는다.');

  const basicGoldIds = allBasicGoldIds(input.basicGold);

  const allowedObservationIds = new Set(input.observations.map((item) => item.observationId));
  if (output.mode === 'ASSESS_SELECTION_RATIONALE') {
    validateEvidenceAgainstInput(output.evidence, input);
    const providerInput = BlindRationaleProviderInputSchema.parse(
      projectProblemPathEvaluatorProviderInput(input),
    );
    const requiredStance = providerInput.evaluationContext.selectionIntent;
    if (output.requiredStanceForSelection !== requiredStance) {
      throw new Error('발문 극성에 필요한 선지 태도 판정이 일치하지 않는다.');
    }
    if (
      output.optionStance !== requiredStance ||
      output.stanceConsistency !== 'CONSISTENT'
    ) {
      throw new Error('선택 의미와 태도 일관성은 발문·버튼으로 코드가 확정해야 한다.');
    }
    const expectedAssessment = output.groundingAssessment === 'SUPPORTED'
      ? 'SUPPORTED'
      : output.groundingAssessment === 'CONTRADICTED'
        ? 'CLEAR_ERROR'
        : 'UNCERTAIN';
    if (output.assessment !== expectedAssessment) {
      throw new Error('최종 근거 판정은 구조화된 근거 관계에서 코드로 파생해야 한다.');
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
  const scopedAction = output.nextActionCandidate;
  if (
    input.sessionState.entryReason === 'WRONG_CHOICE' &&
    (
      scopedAction.type === 'ASK_DIAGNOSTIC' ||
      scopedAction.type === 'ASK_CORRECTIVE' ||
      scopedAction.type === 'DIRECT_COACHING' ||
      scopedAction.type === 'EXPLAIN_ITEM_BOUNDARY'
    ) &&
    scopedAction.target !== 'SELECTED_CHOICE'
  ) {
    throw new Error('재선택 전 질문·교정·코칭은 현재 선택 선지만 대상으로 해야 한다.');
  }
  const intent = output.nextActionCandidate.questionIntent;
  if (
    intent !== null &&
    intent.targetRelationRefs.some((id) => !basicGoldIds.has(id))
  ) {
    throw new Error('질문 의도가 존재하지 않는 기본 골드 관계를 참조한다.');
  }
  if (intent !== null && input.sessionState.entryReason === 'WRONG_CHOICE') {
    const answerChoice = input.basicGold.choices.find(
      (choice) => choice.choiceId === input.sessionState.answerChoiceId,
    );
    const selectedChoice = input.basicGold.choices.find(
      (choice) => choice.choiceId === input.sessionState.currentChoiceId,
    );
    if (answerChoice === undefined || selectedChoice === undefined) {
      throw new Error('질문 범위 검증에 필요한 선지 골드가 없다.');
    }
    const selectedClaimIds = new Set(selectedChoice.claimIds);
    const forbiddenAnswerClaimIds = new Set(
      answerChoice.claimIds.filter((id) => !selectedClaimIds.has(id)),
    );
    if (intent.targetRelationRefs.some((id) => forbiddenAnswerClaimIds.has(id))) {
      throw new Error('재선택 전 질문은 선택하지 않은 정답 선지의 주장을 참조할 수 없다.');
    }
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
    output.nextActionCandidate.type === 'DIRECT_COACHING' &&
    input.supplementalAccess !== null &&
    output.nextActionCandidate.reason !== input.supplementalAccess.reason
  ) {
    throw new Error('직접 코칭 사유가 코드가 연 보충 해설 조건과 일치하지 않는다.');
  }
  if (
    output.nextActionCandidate.type === 'COMPLETE' &&
    input.sessionState.currentChoiceId !== input.sessionState.answerChoiceId
  ) {
    throw new Error('현재 선택이 오답이면 evaluator가 완료를 확정할 수 없다.');
  }
  return output;
}
