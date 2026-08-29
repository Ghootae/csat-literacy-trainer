import { z } from 'zod/v4';

import {
  CandidateDivergenceLayerSchema,
  ProblemQuestionGoldSchema,
  type ProblemQuestionGold,
} from './gold.js';

export const PROBLEM_DIAGNOSTIC_EPISODE_VERSION =
  'problem-diagnostic-episode-v2' as const;

export const DiagnosticTargetKindSchema = z.enum([
  'SELECTED_CHOICE',
  'MISSED_ANSWER',
  'ANSWER_RATIONALE',
]);

export const DiagnosticLearningStateSchema = z.enum([
  'PATH_UNCLEAR',
  'PATH_CLARIFIED',
  'CORRECTED',
  'NO_ERROR_DETECTED',
  'ITEM_BOUNDARY_CLARIFIED',
]);

export const DiagnosticEntryReasonSchema = z.enum([
  'WRONG_CHOICE',
  'CORRECT_RATIONALE_REVIEW',
]);

const SufficiencyDimensionSchema = z.object({
  satisfied: z.boolean(),
  reason: z.string().min(1),
});

export const TargetSufficiencySchema = z.object({
  choiceExplained: SufficiencyDimensionSchema,
  interventionPointLocalized: SufficiencyDimensionSchema,
  safeInterventionAvailable: SufficiencyDimensionSchema,
  actionRelevantAlternativesControlled: SufficiencyDimensionSchema,
  sufficient: z.boolean(),
}).superRefine((sufficiency, context) => {
  const allSatisfied = [
    sufficiency.choiceExplained,
    sufficiency.interventionPointLocalized,
    sufficiency.safeInterventionAvailable,
    sufficiency.actionRelevantAlternativesControlled,
  ].every((dimension) => dimension.satisfied);
  if (sufficiency.sufficient !== allSatisfied) {
    context.addIssue({
      code: 'custom',
      path: ['sufficient'],
      message: '충분성은 네 조건이 모두 충족된 경우에만 참이어야 한다.',
    });
  }
});

export const DiagnosticHypothesisSchema = z.object({
  hypothesisId: z.string().min(1),
  kind: z.enum([
    'STUDENT_ERROR',
    'ITEM_INTERPRETATION_AMBIGUITY',
    'RATIONAL_CHALLENGE',
    'INSUFFICIENT_EVIDENCE',
  ]),
  description: z.string().min(1),
  plausibility: z.enum(['ACTIVE', 'SECONDARY', 'REJECTED']),
  confidence: z.number().min(0).max(1).nullable().default(null),
  candidateDivergenceLayers: z.array(CandidateDivergenceLayerSchema),
  interventionSignature: z.string().min(1),
  evidenceObservationIds: z.array(z.string().min(1)).min(1),
  goldRefs: z.object({
    optionClaimIds: z.array(z.string().min(1)),
    representativeWrongPathIds: z.array(z.string().min(1)),
  }),
});

export const DiagnosticTargetSnapshotSchema = z.object({
  kind: DiagnosticTargetKindSchema,
  choiceId: z.string().min(1),
  status: z.enum([
    'NOT_ASSESSED',
    'NOT_DIRECTLY_DIAGNOSED',
    'INSUFFICIENT',
    'SUFFICIENT',
    'RESOLVED',
    'BOUNDARY_CLARIFICATION_REQUIRED',
  ]),
  learningState: DiagnosticLearningStateSchema.nullable(),
  reconstructedPath: z.string().min(1).nullable(),
  hypotheses: z.array(DiagnosticHypothesisSchema),
  sufficiency: TargetSufficiencySchema.nullable(),
}).superRefine((target, context) => {
  const hypothesisIds = target.hypotheses.map((item) => item.hypothesisId);
  if (new Set(hypothesisIds).size !== hypothesisIds.length) {
    context.addIssue({ code: 'custom', path: ['hypotheses'], message: '가설 ID 중복' });
  }

  if (['NOT_ASSESSED', 'NOT_DIRECTLY_DIAGNOSED'].includes(target.status)) {
    if (
      target.learningState !== null ||
      target.sufficiency !== null ||
      target.hypotheses.length > 0
    ) {
      context.addIssue({
        code: 'custom',
        message: '미평가 타깃에는 학습 상태, 충분성이나 가설을 저장하지 않는다.',
      });
    }
    return;
  }

  if (target.sufficiency === null) {
    context.addIssue({ code: 'custom', path: ['sufficiency'], message: '평가된 타깃에는 충분성 판정이 필요하다.' });
    return;
  }

  if (target.status === 'INSUFFICIENT' && target.sufficiency.sufficient) {
    context.addIssue({ code: 'custom', path: ['status'], message: '불충분 타깃의 충분성이 참일 수 없다.' });
  }
  if (
    ['SUFFICIENT', 'RESOLVED', 'BOUNDARY_CLARIFICATION_REQUIRED'].includes(target.status) &&
    !target.sufficiency.sufficient
  ) {
    context.addIssue({ code: 'custom', path: ['status'], message: '충분하거나 해결된 타깃은 충분성 조건을 모두 충족해야 한다.' });
  }
  const allowedLearningStates: Record<string, readonly string[]> = {
    INSUFFICIENT: ['PATH_UNCLEAR'],
    SUFFICIENT: ['PATH_CLARIFIED'],
    RESOLVED: ['CORRECTED', 'NO_ERROR_DETECTED'],
    BOUNDARY_CLARIFICATION_REQUIRED: ['ITEM_BOUNDARY_CLARIFIED'],
  };
  if (
    target.learningState === null ||
    !allowedLearningStates[target.status]?.includes(target.learningState)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['learningState'],
      message: '타깃 상태와 학습 진행 상태가 일치하지 않는다.',
    });
  }

  const activeSignatures = new Set(
    target.hypotheses
      .filter((hypothesis) => hypothesis.plausibility === 'ACTIVE')
      .map((hypothesis) => hypothesis.interventionSignature),
  );
  if (target.sufficiency.sufficient && activeSignatures.size > 1) {
    context.addIssue({
      code: 'custom',
      path: ['hypotheses'],
      message: '서로 다른 개입을 요구하는 활성 가설이 남아 있으면 충분할 수 없다.',
    });
  }
});

export const StudentObservationSchema = z.discriminatedUnion('kind', [
  z.object({
    observationId: z.string().min(1),
    kind: z.literal('INITIAL_RESPONSE'),
    selectedChoiceId: z.string().min(1),
    confidence: z.number().min(0).max(100).nullable(),
    rationale: z.string().min(1),
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

const AskDiagnosticActionSchema = z.object({
  type: z.literal('ASK_DIAGNOSTIC'),
  target: DiagnosticTargetKindSchema,
  question: z.string().min(1),
  purpose: z.string().min(1),
  distinguishesHypothesisIds: z.array(z.string().min(1)).default([]),
  resolvesUnknownPathStepIds: z.array(z.string().min(1)).default([]),
}).strict().superRefine((action, context) => {
  if (
    action.distinguishesHypothesisIds.length < 2 &&
    action.resolvesUnknownPathStepIds.length === 0
  ) {
    context.addIssue({
      code: 'custom',
      message: '진단 질문은 두 가설을 구별하거나 UNKNOWN 경로 단계를 확인해야 한다.',
    });
  }
});

const AskCorrectiveActionSchema = z.object({
  type: z.literal('ASK_CORRECTIVE'),
  target: DiagnosticTargetKindSchema,
  question: z.string().min(1),
  purpose: z.string().min(1),
  targetedHypothesisIds: z.array(z.string().min(1)).min(1),
}).strict();

const RequestReselectionActionSchema = z.object({
  type: z.literal('REQUEST_RESELECTION'),
  prompt: z.string().min(1),
}).strict().superRefine((action, context) => {
  if (/(각|모든|전체)\s*선지/.test(action.prompt)) {
    context.addIssue({
      code: 'custom',
      path: ['prompt'],
      message: '재선택은 전체 선지 재검사가 아니라 방금 수정한 관계만 반영하게 해야 한다.',
    });
  }
});

const DirectCoachingActionSchema = z.object({
  type: z.literal('DIRECT_COACHING'),
  target: DiagnosticTargetKindSchema,
  message: z.string().min(1),
  coachingReason: z.enum([
    'MAX_DIAGNOSTIC_TURNS',
    'FAILED_CORRECTION',
    'EXPLANATION_REQUEST',
    'ITEM_INTERPRETATION_BOUNDARY',
    'FINAL_ATTEMPT',
  ]),
  supplementalInferenceIds: z.array(z.string().min(1)),
}).strict();

const ExplainItemBoundaryActionSchema = z.object({
  type: z.literal('EXPLAIN_ITEM_BOUNDARY'),
  target: DiagnosticTargetKindSchema,
  message: z.string().min(1),
  purpose: z.string().min(1),
}).strict();

const CompleteActionSchema = z.object({
  type: z.literal('COMPLETE'),
  summary: z.string().min(1),
}).strict();

export const ProblemSolvingNextActionSchema = z.discriminatedUnion('type', [
  AskDiagnosticActionSchema,
  AskCorrectiveActionSchema,
  RequestReselectionActionSchema,
  DirectCoachingActionSchema,
  ExplainItemBoundaryActionSchema,
  CompleteActionSchema,
]);

export const DiagnosticTurnSchema = z.object({
  turnId: z.string().min(1),
  basedOnObservationIds: z.array(z.string().min(1)).min(1),
  activeTarget: DiagnosticTargetKindSchema.nullable(),
  targetSnapshots: z.array(DiagnosticTargetSnapshotSchema).min(1).max(2),
  nextAction: ProblemSolvingNextActionSchema,
}).superRefine((turn, context) => {
  const targetKinds = turn.targetSnapshots.map((target) => target.kind);
  if (new Set(targetKinds).size !== targetKinds.length) {
    context.addIssue({ code: 'custom', path: ['targetSnapshots'], message: '진단 타깃 종류가 중복됐다.' });
  }

  const action = turn.nextAction;
  if (action.type === 'REQUEST_RESELECTION' || action.type === 'COMPLETE') {
    if (turn.activeTarget !== null) {
      context.addIssue({ code: 'custom', path: ['activeTarget'], message: '재선택과 완료 행동에는 활성 진단 타깃을 두지 않는다.' });
    }
    if (
      action.type === 'REQUEST_RESELECTION' &&
      !turn.targetSnapshots.some((target) =>
        target.learningState === 'CORRECTED' ||
        target.learningState === 'ITEM_BOUNDARY_CLARIFIED')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['nextAction'],
        message: 'PATH_CLARIFIED만으로 재선택할 수 없으며 실제 교정 또는 문항 경계 확인이 필요하다.',
      });
    }
    return;
  }

  if (turn.activeTarget !== action.target) {
    context.addIssue({ code: 'custom', path: ['activeTarget'], message: '활성 타깃과 다음 행동의 타깃이 일치해야 한다.' });
    return;
  }

  const target = turn.targetSnapshots.find((item) => item.kind === action.target);
  if (target === undefined) return;

  if (action.type === 'ASK_DIAGNOSTIC' && target.status !== 'INSUFFICIENT') {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '진단 질문은 불충분한 타깃에만 허용된다.' });
  }
  if (action.type === 'ASK_CORRECTIVE' && target.status !== 'SUFFICIENT') {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '교정 질문은 충분한 타깃에만 허용된다.' });
  }
  if (
    action.type === 'DIRECT_COACHING' &&
    action.coachingReason !== 'FINAL_ATTEMPT' &&
    !['SUFFICIENT', 'BOUNDARY_CLARIFICATION_REQUIRED'].includes(target.status)
  ) {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '직접 코칭에는 충분한 진단 또는 문항 경계 판정이 필요하다.' });
  }
  if (
    action.type === 'DIRECT_COACHING' &&
    action.coachingReason === 'FINAL_ATTEMPT' &&
    ['NOT_ASSESSED', 'NOT_DIRECTLY_DIAGNOSED'].includes(target.status)
  ) {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '최종 선택 직접 코칭에도 최소한 평가된 타깃이 필요하다.' });
  }
  if (
    action.type === 'EXPLAIN_ITEM_BOUNDARY' &&
    target.status !== 'BOUNDARY_CLARIFICATION_REQUIRED'
  ) {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '문항 경계 설명은 경계 판정 타깃에만 허용된다.' });
  }
  if (
    action.type === 'DIRECT_COACHING' &&
    action.coachingReason === 'ITEM_INTERPRETATION_BOUNDARY' &&
    target.status !== 'BOUNDARY_CLARIFICATION_REQUIRED'
  ) {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '문항 경계 설명은 경계 판정 타깃에만 허용된다.' });
  }

  const hypothesisIds = new Set(target.hypotheses.map((item) => item.hypothesisId));
  const actionHypothesisIds = action.type === 'ASK_DIAGNOSTIC'
    ? action.distinguishesHypothesisIds
    : action.type === 'ASK_CORRECTIVE'
      ? action.targetedHypothesisIds
      : [];
  if (actionHypothesisIds.some((id) => !hypothesisIds.has(id))) {
    context.addIssue({ code: 'custom', path: ['nextAction'], message: '다음 행동이 존재하지 않는 가설을 참조한다.' });
  }
});

export const DiagnosticVerificationSchema = z.object({
  verificationId: z.string().min(1),
  turnId: z.string().min(1),
  target: DiagnosticTargetKindSchema,
  hypothesisId: z.string().min(1).nullable(),
  evidenceObservationIds: z.array(z.string().min(1)).min(1),
  outcome: z.enum(['SUPPORTS', 'WEAKLY_SUPPORTS', 'REJECTS', 'INCONCLUSIVE']),
  description: z.string().min(1),
});

export const DiagnosticEpisodeResultSchema = z.object({
  finalChoiceId: z.string().min(1),
  correct: z.boolean(),
  interventionLevel: z.enum([
    'EXTERNALIZATION_CORRECTION',
    'DIAGNOSTIC_QUESTION_CORRECTION',
    'INDIRECT_INTERVENTION_CORRECTION',
    'DIRECT_INTERVENTION_CORRECTION',
    'DETAILED_COACHING_REQUIRED',
    'UNRESOLVED',
  ]),
  correctedRepresentation: z.string().min(1).nullable(),
  unresolvedTargets: z.array(DiagnosticTargetKindSchema),
  transferCheckTags: z.array(z.string().min(1)),
});

export const ProblemDiagnosticEpisodeSchema = z.object({
  schemaVersion: z.literal(PROBLEM_DIAGNOSTIC_EPISODE_VERSION),
  episodeId: z.string().min(1),
  questionId: z.string().min(1),
  entryReason: DiagnosticEntryReasonSchema,
  goldRef: z.object({
    schemaVersion: z.string().min(1),
    reviewStatus: z.literal('human_reviewed'),
  }),
  answerChoiceId: z.string().min(1),
  phase: z.enum(['IN_PROGRESS', 'COMPLETED']),
  limits: z.object({
    maxDiagnosticQuestions: z.number().int().positive(),
    diagnosticQuestionsUsed: z.number().int().nonnegative(),
  }),
  observations: z.array(StudentObservationSchema).min(1),
  turns: z.array(DiagnosticTurnSchema).min(1),
  verificationEvents: z.array(DiagnosticVerificationSchema),
  result: DiagnosticEpisodeResultSchema.nullable(),
}).superRefine((episode, context) => {
  function issue(path: (string | number)[], message: string): void {
    context.addIssue({ code: 'custom', path, message });
  }

  const observationIds = episode.observations.map((item) => item.observationId);
  const allowedObservationIds = new Set(observationIds);
  if (new Set(observationIds).size !== observationIds.length) {
    issue(['observations'], '관찰 ID 중복');
  }
  const initialObservations = episode.observations.filter(
    (item) => item.kind === 'INITIAL_RESPONSE',
  );
  if (initialObservations.length !== 1) {
    issue(['observations'], '최초 선택 관찰은 정확히 하나여야 한다.');
  }
  const initialChoiceId = initialObservations[0]?.selectedChoiceId;
  if (
    episode.entryReason === 'WRONG_CHOICE' &&
    initialChoiceId === episode.answerChoiceId
  ) {
    issue(['observations'], '오답 진단 에피소드는 최초 오답 선택에서 시작해야 한다.');
  }
  if (
    episode.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
    initialChoiceId !== episode.answerChoiceId
  ) {
    issue(['observations'], '정답 근거 진단은 정답 선택에서 시작해야 한다.');
  }

  const turnIds = episode.turns.map((turn) => turn.turnId);
  const allowedTurnIds = new Set(turnIds);
  if (new Set(turnIds).size !== turnIds.length) issue(['turns'], '턴 ID 중복');

  for (const [turnIndex, turn] of episode.turns.entries()) {
    if (turn.basedOnObservationIds.some((id) => !allowedObservationIds.has(id))) {
      issue(['turns', turnIndex, 'basedOnObservationIds'], '존재하지 않는 관찰 ID');
    }
    const targetKinds = new Set(turn.targetSnapshots.map((target) => target.kind));
    if (
      episode.entryReason === 'WRONG_CHOICE' &&
      (
        turn.targetSnapshots.length !== 2 ||
        !targetKinds.has('SELECTED_CHOICE') ||
        !targetKinds.has('MISSED_ANSWER')
      )
    ) {
      issue(['turns', turnIndex, 'targetSnapshots'], '오답 진단에는 선택 오답과 놓친 정답 타깃이 모두 필요하다.');
    }
    if (
      episode.entryReason === 'CORRECT_RATIONALE_REVIEW' &&
      (
        turn.targetSnapshots.length !== 1 ||
        !targetKinds.has('ANSWER_RATIONALE')
      )
    ) {
      issue(['turns', turnIndex, 'targetSnapshots'], '정답 근거 진단에는 ANSWER_RATIONALE 타깃 하나만 허용된다.');
    }
    for (const [targetIndex, target] of turn.targetSnapshots.entries()) {
      const expectedChoiceId = target.kind === 'SELECTED_CHOICE'
        ? initialChoiceId
        : episode.answerChoiceId;
      if (target.choiceId !== expectedChoiceId) {
        issue(['turns', turnIndex, 'targetSnapshots', targetIndex, 'choiceId'], '진단 타깃의 선지 ID가 최초 선택 또는 정답과 일치하지 않는다.');
      }
      for (const [hypothesisIndex, hypothesis] of target.hypotheses.entries()) {
        if (hypothesis.evidenceObservationIds.some((id) => !allowedObservationIds.has(id))) {
          issue(
            ['turns', turnIndex, 'targetSnapshots', targetIndex, 'hypotheses', hypothesisIndex, 'evidenceObservationIds'],
            '가설이 존재하지 않는 관찰을 근거로 참조한다.',
          );
        }
      }
    }
  }

  for (const [observationIndex, observation] of episode.observations.entries()) {
    if (
      observation.kind !== 'INITIAL_RESPONSE' &&
      !allowedTurnIds.has(observation.inReplyToTurnId)
    ) {
      issue(['observations', observationIndex, 'inReplyToTurnId'], '존재하지 않는 턴에 대한 학생 응답이다.');
    }
  }

  const diagnosticQuestionCount = episode.turns.filter(
    (turn) => turn.nextAction.type === 'ASK_DIAGNOSTIC',
  ).length;
  if (episode.limits.diagnosticQuestionsUsed !== diagnosticQuestionCount) {
    issue(['limits', 'diagnosticQuestionsUsed'], '사용한 진단 질문 수가 실제 턴과 일치하지 않는다.');
  }
  if (diagnosticQuestionCount > episode.limits.maxDiagnosticQuestions) {
    issue(['limits'], '최대 진단 질문 수를 초과했다.');
  }

  const verificationIds = episode.verificationEvents.map((item) => item.verificationId);
  if (new Set(verificationIds).size !== verificationIds.length) {
    issue(['verificationEvents'], '검증 ID 중복');
  }
  for (const [index, verification] of episode.verificationEvents.entries()) {
    if (!allowedTurnIds.has(verification.turnId)) {
      issue(['verificationEvents', index, 'turnId'], '존재하지 않는 턴 ID');
    }
    if (verification.evidenceObservationIds.some((id) => !allowedObservationIds.has(id))) {
      issue(['verificationEvents', index, 'evidenceObservationIds'], '존재하지 않는 관찰 ID');
    }
    if (verification.hypothesisId !== null) {
      const referencedTurn = episode.turns.find((turn) => turn.turnId === verification.turnId);
      const referencedTarget = referencedTurn?.targetSnapshots.find(
        (target) => target.kind === verification.target,
      );
      if (!referencedTarget?.hypotheses.some(
        (hypothesis) => hypothesis.hypothesisId === verification.hypothesisId,
      )) {
        issue(['verificationEvents', index, 'hypothesisId'], '해당 턴과 타깃에 존재하지 않는 가설 ID');
      }
    }
  }

  if (episode.phase === 'IN_PROGRESS' && episode.result !== null) {
    issue(['result'], '진행 중 에피소드에는 최종 결과를 저장하지 않는다.');
  }
  if (episode.phase === 'COMPLETED' && episode.result === null) {
    issue(['result'], '완료된 에피소드에는 최종 결과가 필요하다.');
  }
  if (episode.result !== null) {
    if (episode.result.correct !== (episode.result.finalChoiceId === episode.answerChoiceId)) {
      issue(['result', 'correct'], '최종 선택과 정오 판정이 일치하지 않는다.');
    }
    if (episode.turns.at(-1)?.nextAction.type !== 'COMPLETE') {
      issue(['turns'], '완료 에피소드의 마지막 행동은 COMPLETE여야 한다.');
    }
  }
  if (episode.turns.slice(0, -1).some((turn) => turn.nextAction.type === 'COMPLETE')) {
    issue(['turns'], 'COMPLETE 행동 이후에 추가 턴을 둘 수 없다.');
  }
});

export type ProblemDiagnosticEpisode = z.infer<
  typeof ProblemDiagnosticEpisodeSchema
>;
export type ProblemSolvingNextAction = z.infer<
  typeof ProblemSolvingNextActionSchema
>;

export function validateDiagnosticEpisodeAgainstGold(
  episodeInput: unknown,
  goldInput: unknown,
): ProblemDiagnosticEpisode {
  const episode = ProblemDiagnosticEpisodeSchema.parse(episodeInput);
  const gold: ProblemQuestionGold = ProblemQuestionGoldSchema.parse(goldInput);
  if (gold.reviewStatus !== 'human_reviewed') {
    throw new Error('진단 에피소드는 사람이 검토한 골드만 참조할 수 있다.');
  }
  if (episode.questionId !== gold.questionId) {
    throw new Error('에피소드와 골드의 questionId가 일치하지 않는다.');
  }
  if (episode.answerChoiceId !== gold.answerChoiceId) {
    throw new Error('에피소드와 골드의 정답 선지가 일치하지 않는다.');
  }

  const claimIds = new Set(gold.optionClaims.map((claim) => claim.claimId));
  const wrongPathIds = new Set(gold.representativeWrongPaths.map((path) => path.id));
  const supplementalIds = new Set(
    gold.supplementalExplanationInferences.map((item) => item.inferenceId),
  );
  for (const turn of episode.turns) {
    for (const target of turn.targetSnapshots) {
      for (const hypothesis of target.hypotheses) {
        if (hypothesis.goldRefs.optionClaimIds.some((id) => !claimIds.has(id))) {
          throw new Error(`존재하지 않는 선지 주장 참조: ${hypothesis.hypothesisId}`);
        }
        if (
          hypothesis.goldRefs.representativeWrongPathIds
            .some((id) => !wrongPathIds.has(id))
        ) {
          throw new Error(`존재하지 않는 대표 오답 경로 참조: ${hypothesis.hypothesisId}`);
        }
      }
    }
    if (
      turn.nextAction.type === 'DIRECT_COACHING' &&
      turn.nextAction.supplementalInferenceIds.some((id) => !supplementalIds.has(id))
    ) {
      throw new Error(`존재하지 않는 보충 해설 참조: ${turn.turnId}`);
    }
    if (
      turn.nextAction.type === 'DIRECT_COACHING' &&
      turn.nextAction.supplementalInferenceIds.length > 0
    ) {
      const action = turn.nextAction;
      const policyByReason = {
        MAX_DIAGNOSTIC_TURNS: 'DIRECT_COACHING_ONLY',
        FAILED_CORRECTION: 'AFTER_FAILED_CORRECTION',
        EXPLANATION_REQUEST: 'ON_EXPLANATION_REQUEST',
        ITEM_INTERPRETATION_BOUNDARY: null,
        FINAL_ATTEMPT: 'DIRECT_COACHING_ONLY',
      } as const;
      const requiredPolicy = policyByReason[action.coachingReason];
      const target = turn.targetSnapshots.find(
        (snapshot) => snapshot.kind === action.target,
      );
      const referencedClaimIds = new Set(
        target?.hypotheses.flatMap((hypothesis) => hypothesis.goldRefs.optionClaimIds) ?? [],
      );
      const referencedClaims = gold.optionClaims.filter(
        (claim) => referencedClaimIds.has(claim.claimId),
      );
      for (const supplementalId of action.supplementalInferenceIds) {
        const authorized = requiredPolicy !== null && referencedClaims.some(
          (claim) =>
            claim.fallbackSupplementalInferenceIds.includes(supplementalId) &&
            claim.supplementalUsePolicy.includes(requiredPolicy),
        );
        if (!authorized) {
          throw new Error(`허용 조건을 충족하지 않은 보충 해설 참조: ${turn.turnId}`);
        }
      }
    }
  }
  return episode;
}
