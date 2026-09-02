import { z } from 'zod/v4';

export const PROBLEM_GOLD_VERSION = 'problem-solving-gold-v2' as const;

export const CandidateDivergenceLayerSchema = z.enum([
  'PASSAGE_REPRESENTATION',
  'SCENARIO_REPRESENTATION',
  'VISUAL_REPRESENTATION',
  'CONCEPT_BOUNDARY',
  'CONCEPT_SCENARIO_MAPPING',
  'CONDITION_APPLICATION',
  'INFERENCE_TRANSFORMATION',
  'CHOICE_INTERPRETATION',
  'STEM_POLARITY',
  'SELECTION_EXECUTION',
]);

export const MediaAssetSchema = z.object({
  mediaId: z.string().min(1),
  kind: z.enum(['IMAGE', 'TABLE', 'CHART', 'DIAGRAM']),
  role: z.enum(['INFORMATIONAL', 'ILLUSTRATIVE']),
  sourceUrl: z.string().url(),
  localPath: z.string().min(1).optional(),
  mimeType: z.string().min(1),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  requiredForSolving: z.boolean(),
  altText: z.string().min(1),
  placement: z.object({
    scope: z.enum(['PASSAGE', 'SCENARIO', 'CHOICE']),
    supplementIndex: z.number().int().nonnegative().optional(),
    elementIndex: z.number().int().nonnegative().optional(),
  }),
});

export const VisualAssertionSchema = z.object({
  id: z.string().min(1),
  mediaId: z.string().min(1),
  kind: z.enum(['LABEL', 'FLOW', 'GROUPING', 'COMPARISON', 'VALUE']),
  description: z.string().min(1),
});

export const GoldReferenceSchema = z.object({
  paragraphId: z.string().min(1),
  propositionIds: z.array(z.string().min(1)),
  relationIds: z.array(z.string().min(1)),
});

const ReferencedEvidenceSchema = z.object({
  references: z.array(GoldReferenceSchema),
  scenarioFactIds: z.array(z.string().min(1)),
  visualAssertionIds: z.array(z.string().min(1)),
});

export const PassageDetailGoldSchema = z.object({
  passageId: z.string().min(1),
  propositions: z.array(z.object({
    id: z.string().min(1),
    paragraphId: z.string().min(1),
    description: z.string().min(1),
    polarity: z.enum(['positive', 'negative']),
    conditions: z.array(z.string().min(1)),
    exceptions: z.array(z.string().min(1)),
    scope: z.string().min(1),
    evidence: z.string().min(1),
    basis: z.enum(['PASSAGE_EXPLICIT', 'PASSAGE_ENTAILED'])
      .default('PASSAGE_EXPLICIT'),
    derivation: z.string().min(1).optional(),
  })).min(1),
});

export const OptionClaimSchema = ReferencedEvidenceSchema.extend({
  claimId: z.string().min(1),
  choiceId: z.string().min(1),
  order: z.number().int().positive(),
  description: z.string().min(1),
  assessment: z.enum([
    'SUPPORTED',
    'CONTRADICTED',
    'NOT_JUSTIFIED',
    'DEPENDS_ON_REJECTED_CLAIM',
    'NOT_ESTABLISHED',
  ]),
  supportStrength: z.enum(['DIRECT', 'ENTAILED', 'KEY_CONSTRAINED', 'NONE']),
  decision: z.enum(['ACCEPTED', 'REJECTED', 'UNRESOLVED']),
  decisionBasis: z.enum([
    'SOURCE_GROUNDED',
    'ANSWER_KEY_CONSTRAINED',
    'DEPENDENCY',
    'UNRESOLVED',
  ]),
  decisionCritical: z.boolean(),
  dependsOnClaimIds: z.array(z.string().min(1)),
  itemInferenceIds: z.array(z.string().min(1)),
  fallbackSupplementalInferenceIds: z.array(z.string().min(1)),
  supplementalUsePolicy: z.array(z.enum([
    'ON_EXPLANATION_REQUEST',
    'AFTER_FAILED_CORRECTION',
    'DIRECT_COACHING_ONLY',
  ])),
});

export const TargetClaimEffectSchema = z.enum([
  'SUPPORTS',
  'CONTRADICTS',
  'DOES_NOT_JUSTIFY',
]);

export type TargetClaimEffect = z.infer<typeof TargetClaimEffectSchema>;

export function targetClaimEffectForAssessment(
  assessment: unknown,
): TargetClaimEffect | null {
  if (assessment === 'SUPPORTED') return 'SUPPORTS';
  if (assessment === 'CONTRADICTED') return 'CONTRADICTS';
  if (assessment === 'NOT_JUSTIFIED') return 'DOES_NOT_JUSTIFY';
  return null;
}

export const ItemInferenceSchema = ReferencedEvidenceSchema.extend({
  inferenceId: z.string().min(1),
  description: z.string().min(1),
  premiseRefs: z.array(z.string().min(1)).min(1),
  operation: z.enum([
    'APPLY_RULE',
    'CHECK_CONDITION',
    'COMPARE',
    'CLASSIFY',
    'MAP_CONCEPT',
    'FOLLOW_CAUSAL_CHAIN',
    'CALCULATE',
    'CHECK_JUSTIFICATION',
  ]),
  conclusion: z.string().min(1),
  targetClaimEffect: TargetClaimEffectSchema,
  targetClaimIds: z.array(z.string().min(1)).min(1),
  grounding: z.enum([
    'SOURCE_EXPLICIT',
    'SOURCE_ENTAILED',
    'ANSWER_KEY_CONSTRAINED',
  ]),
  necessity: z.enum(['REQUIRED', 'SUPPORTING']),
});

export const SupplementalExplanationInferenceSchema = ReferencedEvidenceSchema.extend({
  inferenceId: z.string().min(1),
  source: z.literal('OFFICIAL_EXPLANATION'),
  sourceText: z.string().min(1),
  description: z.string().min(1),
  necessity: z.enum(['REQUIRED', 'SUPPORTING']),
  groundedness: z.enum(['ENTAILED', 'PLAUSIBLE', 'EXTERNAL']),
  reviewStatus: z.enum(['candidate', 'human_reviewed']),
});

/**
 * 대표 itemInference와 다른 학생의 압축 경로를 사람이 충분하다고 확정한 계약이다.
 * requiredSourceRefs는 학생이 실제로 연결해야 하는 핵심 근거이고,
 * allowedOmissionSourceRefs는 대표 경로에는 있지만 다시 말하지 않아도 되는 근거다.
 */
export const HumanReviewedSufficientGroundSetSchema = z.object({
  setId: z.string().min(1),
  choiceId: z.string().min(1),
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
}).strict();

export const ProblemQuestionGoldSchema = z.object({
  schemaVersion: z.literal(PROBLEM_GOLD_VERSION),
  reviewStatus: z.enum(['candidate', 'human_reviewed']),
  source: z.object({
    sourceId: z.string().min(1),
    exam: z.string().min(1),
    questionNumber: z.number().int().positive(),
    sourcePath: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
  }),
  questionId: z.string().min(1),
  passageId: z.string().min(1),
  stem: z.string().min(1),
  stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
  scenario: z.object({
    text: z.string().min(1),
    facts: z.array(z.object({
      id: z.string().min(1),
      description: z.string().min(1),
    })),
  }).nullable(),
  mediaAssets: z.array(MediaAssetSchema).default([]),
  visualAssertions: z.array(VisualAssertionSchema).default([]),
  passageDetailGold: PassageDetailGoldSchema,
  itemInferences: z.array(ItemInferenceSchema),
  supplementalExplanationInferences: z.array(
    SupplementalExplanationInferenceSchema,
  ),
  sufficientGroundSets: z.array(HumanReviewedSufficientGroundSetSchema).optional(),
  optionClaims: z.array(OptionClaimSchema).min(2),
  choices: z.array(z.object({
    choiceId: z.string().min(1),
    position: z.number().int().positive(),
    text: z.string().min(1),
    judgment: z.enum(['TRUE', 'FALSE']),
    rationale: z.string().min(1),
    requiredReferences: z.array(GoldReferenceSchema),
    scenarioFactIds: z.array(z.string().min(1)),
    visualAssertionIds: z.array(z.string().min(1)),
    claimIds: z.array(z.string().min(1)).min(1),
  })).min(2),
  answerChoiceId: z.string().min(1),
  referencePath: z.array(z.object({
    stepId: z.string().min(1),
    description: z.string().min(1),
    references: z.array(GoldReferenceSchema),
    scenarioFactIds: z.array(z.string().min(1)),
    visualAssertionIds: z.array(z.string().min(1)),
    optionClaimIds: z.array(z.string().min(1)),
    itemInferenceIds: z.array(z.string().min(1)),
  })).min(1),
  requiredPathStepIds: z.array(z.string().min(1)).min(1),
  decisivePathStepIds: z.array(z.string().min(1)).min(1),
  conclusionStepIds: z.array(z.string().min(1)).min(1),
  finalAnswerExplanation: z.object({
    answerChoiceId: z.string().min(1),
    message: z.string().min(1),
    referencePathStepIds: z.array(z.string().min(1)).min(1),
  }).strict(),
  representativeWrongPaths: z.array(z.object({
    id: z.string().min(1),
    scope: z.enum(['SELECTED_WRONG_CHOICE', 'MISSED_ANSWER', 'COMBINED']),
    selectedChoiceIds: z.array(z.string().min(1)).min(1),
    missedAnswerChoiceId: z.string().min(1).nullable(),
    description: z.string().min(1),
    candidateDivergenceLayers: z.array(CandidateDivergenceLayerSchema).min(1),
  })),
  reviewNotes: z.array(z.object({
    noteId: z.string().min(1),
    targetType: z.enum(['CHOICE', 'OPTION_CLAIM', 'ITEM_INFERENCE', 'MEDIA']),
    targetId: z.string().min(1),
    text: z.string().min(1),
  })),
}).superRefine((gold, context) => {
  function duplicate<T>(values: readonly T[]): boolean {
    return new Set(values).size !== values.length;
  }

  function issue(path: (string | number)[], message: string): void {
    context.addIssue({ code: 'custom', path, message });
  }

  if (gold.passageDetailGold.passageId !== gold.passageId) {
    issue(['passageDetailGold', 'passageId'], 'passageId 불일치');
  }

  const choiceIds = gold.choices.map((choice) => choice.choiceId);
  const allowedChoiceIds = new Set(choiceIds);
  if (duplicate(choiceIds)) issue(['choices'], 'choiceId 중복');
  if (new Set(gold.choices.map((choice) => choice.position)).size !== gold.choices.length) {
    issue(['choices'], '선지 position 중복');
  }

  const answer = gold.choices.find((choice) => choice.choiceId === gold.answerChoiceId);
  const expectedJudgment = gold.stemPolarity === 'SELECT_CORRECT' ? 'TRUE' : 'FALSE';
  if (answer?.judgment !== expectedJudgment) {
    issue(['answerChoiceId'], '발문 극성과 정답 선지 판정이 일치하지 않는다.');
  }
  if (gold.choices.filter((choice) => choice.judgment === expectedJudgment).length !== 1) {
    issue(['choices'], '발문에 맞는 정답 선지가 정확히 하나여야 한다.');
  }
  if (gold.finalAnswerExplanation.answerChoiceId !== gold.answerChoiceId) {
    issue(['finalAnswerExplanation', 'answerChoiceId'], '정적 최종 해설의 정답 선지가 골드 정답과 일치하지 않는다.');
  }

  const factIds = gold.scenario?.facts.map((fact) => fact.id) ?? [];
  const allowedFactIds = new Set(factIds);
  if (duplicate(factIds)) issue(['scenario', 'facts'], '보기 사실 ID 중복');

  const propositionIds = gold.passageDetailGold.propositions.map((item) => item.id);
  const propositionsById = new Map(
    gold.passageDetailGold.propositions.map((item) => [item.id, item]),
  );
  if (duplicate(propositionIds)) {
    issue(['passageDetailGold', 'propositions'], '제시문 명제 ID 중복');
  }

  const mediaIds = gold.mediaAssets.map((media) => media.mediaId);
  const allowedMediaIds = new Set(mediaIds);
  if (duplicate(mediaIds)) issue(['mediaAssets'], 'mediaId 중복');

  const visualAssertionIds = gold.visualAssertions.map((assertion) => assertion.id);
  const allowedVisualAssertionIds = new Set(visualAssertionIds);
  if (duplicate(visualAssertionIds)) issue(['visualAssertions'], '시각 의미 ID 중복');
  for (const [index, assertion] of gold.visualAssertions.entries()) {
    if (!allowedMediaIds.has(assertion.mediaId)) {
      issue(['visualAssertions', index, 'mediaId'], '존재하지 않는 mediaId');
    }
  }

  const itemInferenceIds = gold.itemInferences.map((item) => item.inferenceId);
  const allowedItemInferenceIds = new Set(itemInferenceIds);
  if (duplicate(itemInferenceIds)) issue(['itemInferences'], '문항 추론 ID 중복');

  const supplementalIds = gold.supplementalExplanationInferences
    .map((item) => item.inferenceId);
  const allowedSupplementalIds = new Set(supplementalIds);
  const supplementalById = new Map(
    gold.supplementalExplanationInferences.map((item) => [item.inferenceId, item]),
  );
  if (duplicate(supplementalIds)) {
    issue(['supplementalExplanationInferences'], '보충 해설 추론 ID 중복');
  }
  if (supplementalIds.some((id) => allowedItemInferenceIds.has(id))) {
    issue(['supplementalExplanationInferences'], '기본 문항 추론과 보충 해설 추론 ID가 겹친다.');
  }

  const claimIds = gold.optionClaims.map((claim) => claim.claimId);
  const allowedClaimIds = new Set(claimIds);
  const claimsById = new Map(
    gold.optionClaims.map((claim) => [claim.claimId, claim]),
  );
  if (duplicate(claimIds)) issue(['optionClaims'], '선지 주장 ID 중복');
  const sourceRefIds = new Set([
    ...propositionIds,
    ...factIds,
    ...visualAssertionIds,
  ]);
  const sufficientGroundSets = gold.sufficientGroundSets ?? [];
  if (duplicate(sufficientGroundSets.map((set) => set.setId))) {
    issue(['sufficientGroundSets'], '사람 검토 충분 근거 집합 ID 중복');
  }
  for (const [index, set] of sufficientGroundSets.entries()) {
    if (!allowedChoiceIds.has(set.choiceId)) {
      issue(['sufficientGroundSets', index, 'choiceId'], '존재하지 않는 choiceId');
    }
    if (duplicate(set.targetClaimIds)) {
      issue(['sufficientGroundSets', index, 'targetClaimIds'], '대상 주장 ID 중복');
    }
    for (const claimId of set.targetClaimIds) {
      const claim = claimsById.get(claimId);
      if (claim === undefined || claim.choiceId !== set.choiceId) {
        issue(
          ['sufficientGroundSets', index, 'targetClaimIds'],
          '충분 근거 집합은 해당 선지의 주장만 대상으로 삼아야 한다.',
        );
      }
    }
    if (duplicate(set.requiredSourceRefs) || duplicate(set.allowedOmissionSourceRefs)) {
      issue(['sufficientGroundSets', index], '충분 근거 집합의 출처 참조가 중복됐다.');
    }
    if (set.requiredSourceRefs.some((id) => !sourceRefIds.has(id))) {
      issue(['sufficientGroundSets', index, 'requiredSourceRefs'], '존재하지 않는 원문·보기·시각 근거 ID');
    }
    if (set.allowedOmissionSourceRefs.some((id) => !sourceRefIds.has(id))) {
      issue(
        ['sufficientGroundSets', index, 'allowedOmissionSourceRefs'],
        '존재하지 않는 생략 허용 근거 ID',
      );
    }
    const required = new Set(set.requiredSourceRefs);
    if (set.allowedOmissionSourceRefs.some((id) => required.has(id))) {
      issue(
        ['sufficientGroundSets', index, 'allowedOmissionSourceRefs'],
        '필수 근거와 생략 허용 근거는 겹칠 수 없다.',
      );
    }
  }
  const referencePathStepIds = new Set(gold.referencePath.map((step) => step.stepId));
  if (
    gold.finalAnswerExplanation.referencePathStepIds
      .some((stepId) => !referencePathStepIds.has(stepId))
  ) {
    issue(['finalAnswerExplanation', 'referencePathStepIds'], '정적 최종 해설이 존재하지 않는 기준 경로 단계를 참조한다.');
  }
  for (const choiceId of choiceIds) {
    const orders = gold.optionClaims
      .filter((claim) => claim.choiceId === choiceId)
      .map((claim) => claim.order);
    if (duplicate(orders)) {
      issue(['optionClaims'], `${choiceId}의 선지 주장 순서가 중복된다.`);
    }
  }

  function validateEvidence(
    evidence: z.infer<typeof ReferencedEvidenceSchema>,
    path: (string | number)[],
  ): void {
    for (const [referenceIndex, reference] of evidence.references.entries()) {
      for (const propositionId of reference.propositionIds) {
        const proposition = propositionsById.get(propositionId);
        if (proposition === undefined) {
          issue([...path, 'references', referenceIndex], '존재하지 않는 명제 ID');
        } else if (proposition.paragraphId !== reference.paragraphId) {
          issue([...path, 'references', referenceIndex], '명제와 paragraphId가 일치하지 않는다.');
        }
      }
    }
    if (evidence.scenarioFactIds.some((id) => !allowedFactIds.has(id))) {
      issue([...path, 'scenarioFactIds'], '존재하지 않는 보기 사실 ID');
    }
    if (evidence.visualAssertionIds.some((id) => !allowedVisualAssertionIds.has(id))) {
      issue([...path, 'visualAssertionIds'], '존재하지 않는 시각 의미 ID');
    }
  }

  for (const [index, inference] of gold.itemInferences.entries()) {
    validateEvidence(inference, ['itemInferences', index]);
    if (duplicate(inference.premiseRefs)) {
      issue(['itemInferences', index, 'premiseRefs'], '문항 추론 전제 참조 중복');
    }
    const evidenceRefs = new Set([
      ...inference.references.flatMap((reference) => [
        ...reference.propositionIds,
        ...reference.relationIds,
      ]),
      ...inference.scenarioFactIds,
      ...inference.visualAssertionIds,
    ]);
    const premiseRefs = new Set(inference.premiseRefs);
    const allowedPremiseRefs = new Set(evidenceRefs);
    if (inference.grounding === 'ANSWER_KEY_CONSTRAINED') {
      // 기존 골드는 출처 전제만으로 정답 키 제약을 표현한다. 새 골드는
      // 예약 전제 ANSWER_KEY를 선택적으로 명시할 수 있도록 additive하게 허용한다.
      if (premiseRefs.has('ANSWER_KEY')) allowedPremiseRefs.add('ANSWER_KEY');
    } else if (premiseRefs.has('ANSWER_KEY')) {
      issue(
        ['itemInferences', index, 'premiseRefs'],
        '출처 기반 문항 추론은 ANSWER_KEY를 전제로 사용할 수 없다.',
      );
    }
    if (
      allowedPremiseRefs.size !== premiseRefs.size ||
      [...allowedPremiseRefs].some((id) => !premiseRefs.has(id))
    ) {
      issue(
        ['itemInferences', index, 'premiseRefs'],
        'premiseRefs는 기존 지문·보기·시각 근거와 허용된 ANSWER_KEY 전제에 정확히 일치해야 한다.',
      );
    }
    if (inference.grounding === 'SOURCE_ENTAILED' && inference.premiseRefs.length === 0) {
      issue(
        ['itemInferences', index, 'premiseRefs'],
        'SOURCE_ENTAILED 문항 추론에는 하나 이상의 전제 참조가 필요하다.',
      );
    }
  }
  for (const [index, inference] of gold.supplementalExplanationInferences.entries()) {
    validateEvidence(inference, ['supplementalExplanationInferences', index]);
  }

  for (const [index, claim] of gold.optionClaims.entries()) {
    validateEvidence(claim, ['optionClaims', index]);
    if (!allowedChoiceIds.has(claim.choiceId)) {
      issue(['optionClaims', index, 'choiceId'], '존재하지 않는 choiceId');
    }
    if (claim.dependsOnClaimIds.includes(claim.claimId)) {
      issue(['optionClaims', index, 'dependsOnClaimIds'], '선지 주장은 자기 자신에 의존할 수 없다.');
    }
    if (claim.dependsOnClaimIds.some((id) => !allowedClaimIds.has(id))) {
      issue(['optionClaims', index, 'dependsOnClaimIds'], '존재하지 않는 선지 주장 ID');
    }
    for (const dependencyId of claim.dependsOnClaimIds) {
      const dependency = claimsById.get(dependencyId);
      if (
        dependency !== undefined &&
        (dependency.choiceId !== claim.choiceId || dependency.order >= claim.order)
      ) {
        issue(
          ['optionClaims', index, 'dependsOnClaimIds'],
          '선지 주장은 같은 선지의 앞선 주장에만 의존할 수 있다.',
        );
      }
    }
    if (claim.itemInferenceIds.some((id) => !allowedItemInferenceIds.has(id))) {
      issue(['optionClaims', index, 'itemInferenceIds'], '존재하지 않는 문항 추론 ID');
    }
    if (duplicate(claim.supplementalUsePolicy)) {
      issue(['optionClaims', index, 'supplementalUsePolicy'], '보충 해설 사용 정책 중복');
    }
    if (claim.fallbackSupplementalInferenceIds.some(
      (id) => !allowedSupplementalIds.has(id),
    )) {
      issue(
        ['optionClaims', index, 'fallbackSupplementalInferenceIds'],
        '존재하지 않는 보충 해설 추론 ID',
      );
    }
    if (
      (claim.fallbackSupplementalInferenceIds.length === 0) !==
      (claim.supplementalUsePolicy.length === 0)
    ) {
      issue(
        ['optionClaims', index, 'supplementalUsePolicy'],
        '보충 해설 참조와 사용 정책은 함께 지정해야 한다.',
      );
    }
    if (claim.fallbackSupplementalInferenceIds.some(
      (id) => supplementalById.get(id)?.reviewStatus !== 'human_reviewed',
    )) {
      issue(
        ['optionClaims', index, 'fallbackSupplementalInferenceIds'],
        '사람이 검토한 보충 해설만 런타임 fallback으로 사용할 수 있다.',
      );
    }
    if (
      claim.assessment === 'NOT_JUSTIFIED' &&
      claim.decision === 'REJECTED' &&
      claim.decisionBasis !== 'ANSWER_KEY_CONSTRAINED'
    ) {
      issue(
        ['optionClaims', index, 'decisionBasis'],
        '근거 부족만으로 기각할 수 없으며 정답 키 제약을 명시해야 한다.',
      );
    }
    if (claim.decisionBasis === 'DEPENDENCY' && claim.dependsOnClaimIds.length === 0) {
      issue(
        ['optionClaims', index, 'decisionBasis'],
        '의존 판정에는 앞선 주장 의존 관계가 필요하다.',
      );
    }
  }

  const inferencesById = new Map(
    gold.itemInferences.map((inference) => [inference.inferenceId, inference]),
  );
  for (const [index, inference] of gold.itemInferences.entries()) {
    if (duplicate(inference.targetClaimIds)) {
      issue(['itemInferences', index, 'targetClaimIds'], '문항 추론 대상 주장 ID 중복');
    }
    if (inference.targetClaimIds.some((id) => !allowedClaimIds.has(id))) {
      issue(['itemInferences', index, 'targetClaimIds'], '존재하지 않는 대상 주장 ID');
    }
    for (const targetClaimId of inference.targetClaimIds) {
      const claim = claimsById.get(targetClaimId);
      if (claim === undefined) continue;
      if (!claim.itemInferenceIds.includes(inference.inferenceId)) {
        issue(
          ['itemInferences', index, 'targetClaimIds'],
          '문항 추론과 대상 주장의 itemInferenceIds 참조가 서로 일치해야 한다.',
        );
      }
      const compatible = inference.targetClaimEffect === 'SUPPORTS'
        ? claim.assessment === 'SUPPORTED' && claim.decision === 'ACCEPTED'
        : inference.targetClaimEffect === 'CONTRADICTS'
          ? claim.assessment === 'CONTRADICTED' && claim.decision === 'REJECTED'
          : claim.assessment === 'NOT_JUSTIFIED' && claim.decision === 'REJECTED';
      if (!compatible) {
        issue(
          ['itemInferences', index, 'targetClaimEffect'],
          '문항 추론 효과와 대상 선지 주장의 판정 방향이 모순된다.',
        );
      }
    }
  }
  for (const [index, claim] of gold.optionClaims.entries()) {
    for (const inferenceId of claim.itemInferenceIds) {
      if (!inferencesById.get(inferenceId)?.targetClaimIds.includes(claim.claimId)) {
        issue(
          ['optionClaims', index, 'itemInferenceIds'],
          '대상 주장이 참조한 문항 추론에 해당 claimId가 역참조되어야 한다.',
        );
      }
    }
  }

  for (const [index, choice] of gold.choices.entries()) {
    validateEvidence({
      references: choice.requiredReferences,
      scenarioFactIds: choice.scenarioFactIds,
      visualAssertionIds: choice.visualAssertionIds,
    }, ['choices', index]);
    if (duplicate(choice.claimIds)) {
      issue(['choices', index, 'claimIds'], '선지의 주장 ID가 중복된다.');
    }
    for (const claimId of choice.claimIds) {
      const claim = gold.optionClaims.find((item) => item.claimId === claimId);
      if (claim === undefined) {
        issue(['choices', index, 'claimIds'], '존재하지 않는 선지 주장 ID');
      } else if (claim.choiceId !== choice.choiceId) {
        issue(['choices', index, 'claimIds'], '다른 선지의 주장 ID를 참조한다.');
      }
    }
    const ownedClaimIds = gold.optionClaims
      .filter((claim) => claim.choiceId === choice.choiceId)
      .map((claim) => claim.claimId);
    if (
      ownedClaimIds.length !== choice.claimIds.length ||
      ownedClaimIds.some((id) => !choice.claimIds.includes(id))
    ) {
      issue(['choices', index, 'claimIds'], '선지가 소유한 주장을 빠짐없이 참조해야 한다.');
    }
  }

  const pathStepIds = gold.referencePath.map((step) => step.stepId);
  const allowedPathStepIds = new Set(pathStepIds);
  if (duplicate(pathStepIds)) issue(['referencePath'], '기준 경로 stepId 중복');
  if (duplicate(gold.requiredPathStepIds)) {
    issue(['requiredPathStepIds'], '필수 경로 stepId 중복');
  }
  if (duplicate(gold.decisivePathStepIds)) {
    issue(['decisivePathStepIds'], '결정적 경로 stepId 중복');
  }
  if (duplicate(gold.conclusionStepIds)) {
    issue(['conclusionStepIds'], '결론 경로 stepId 중복');
  }
  for (const [field, ids] of [
    ['requiredPathStepIds', gold.requiredPathStepIds],
    ['decisivePathStepIds', gold.decisivePathStepIds],
    ['conclusionStepIds', gold.conclusionStepIds],
  ] as const) {
    if (ids.some((id) => !allowedPathStepIds.has(id))) {
      issue([field], '존재하지 않는 기준 경로 stepId');
    }
  }
  if (gold.decisivePathStepIds.some((id) => !gold.requiredPathStepIds.includes(id))) {
    issue(['decisivePathStepIds'], '결정적 경로는 필수 경로에 포함되어야 한다.');
  }
  if (gold.conclusionStepIds.some((id) => !gold.requiredPathStepIds.includes(id))) {
    issue(['conclusionStepIds'], '결론 경로는 필수 경로에 포함되어야 한다.');
  }
  if (gold.decisivePathStepIds.some((id) => gold.conclusionStepIds.includes(id))) {
    issue(['decisivePathStepIds'], '결정적 분기와 결론 단계는 분리해야 한다.');
  }
  for (const [index, step] of gold.referencePath.entries()) {
    validateEvidence(step, ['referencePath', index]);
    if (step.optionClaimIds.some((id) => !allowedClaimIds.has(id))) {
      issue(['referencePath', index, 'optionClaimIds'], '존재하지 않는 선지 주장 ID');
    }
    if (step.itemInferenceIds.some((id) => !allowedItemInferenceIds.has(id))) {
      issue(['referencePath', index, 'itemInferenceIds'], '존재하지 않는 문항 추론 ID');
    }
  }

  for (const [index, path] of gold.representativeWrongPaths.entries()) {
    if (duplicate(path.candidateDivergenceLayers)) {
      issue(
        ['representativeWrongPaths', index, 'candidateDivergenceLayers'],
        '후보 분기 층위 중복',
      );
    }
    if (path.selectedChoiceIds.some(
      (id) => !allowedChoiceIds.has(id) || id === gold.answerChoiceId,
    )) {
      issue(['representativeWrongPaths', index, 'selectedChoiceIds'], '대표 오답 경로는 실제 오답 선지만 참조해야 한다.');
    }
    if (path.scope === 'SELECTED_WRONG_CHOICE' && path.missedAnswerChoiceId !== null) {
      issue(['representativeWrongPaths', index, 'missedAnswerChoiceId'], '선택 선지 경로에는 놓친 정답을 지정하지 않는다.');
    }
    if (
      path.scope !== 'SELECTED_WRONG_CHOICE' &&
      path.missedAnswerChoiceId !== gold.answerChoiceId
    ) {
      issue(['representativeWrongPaths', index, 'missedAnswerChoiceId'], '놓친 정답 경로는 현재 정답 선지를 참조해야 한다.');
    }
  }

  const reviewNoteIds = gold.reviewNotes.map((note) => note.noteId);
  if (duplicate(reviewNoteIds)) issue(['reviewNotes'], '검수 메모 ID 중복');
  const reviewTargets = {
    CHOICE: allowedChoiceIds,
    OPTION_CLAIM: allowedClaimIds,
    ITEM_INFERENCE: allowedItemInferenceIds,
    MEDIA: allowedMediaIds,
  } as const;
  for (const [index, note] of gold.reviewNotes.entries()) {
    if (!reviewTargets[note.targetType].has(note.targetId)) {
      issue(['reviewNotes', index, 'targetId'], '존재하지 않는 검수 대상 ID');
    }
  }
});

export type ProblemQuestionGold = z.infer<typeof ProblemQuestionGoldSchema>;

export interface ProblemGoldAuditWarning {
  readonly code: 'EXCESSIVE_SCENARIO_FACT_REFERENCES' | 'EXCESSIVE_TOTAL_PREMISE_REFERENCES';
  readonly inferenceId: string;
  readonly message: string;
  readonly refs: readonly string[];
}

/** 의미적 과잉 참조는 자동 실패시키지 않고 사람 검수 대상으로 보고한다. */
export function auditProblemGoldWarnings(
  goldInput: ProblemQuestionGold,
): readonly ProblemGoldAuditWarning[] {
  const gold = ProblemQuestionGoldSchema.parse(goldInput);
  const warnings: ProblemGoldAuditWarning[] = [];
  for (const inference of gold.itemInferences) {
    if (inference.scenarioFactIds.length > 3) {
      warnings.push({
        code: 'EXCESSIVE_SCENARIO_FACT_REFERENCES',
        inferenceId: inference.inferenceId,
        message: '하나의 문항 추론이 보기 사실을 4개 이상 참조한다. 실제 필요한 사실만 남겼는지 검토해야 한다.',
        refs: inference.scenarioFactIds,
      });
    }
    if (inference.premiseRefs.length > 6) {
      warnings.push({
        code: 'EXCESSIVE_TOTAL_PREMISE_REFERENCES',
        inferenceId: inference.inferenceId,
        message: '하나의 문항 추론이 전제를 7개 이상 참조한다. 판단에 불필요한 근거가 포함됐는지 검토해야 한다.',
        refs: inference.premiseRefs,
      });
    }
  }
  return warnings;
}
