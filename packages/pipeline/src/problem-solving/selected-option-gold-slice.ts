import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import {
  ItemInferenceSchema,
  OptionClaimSchema,
  ProblemQuestionGoldSchema,
  type ProblemQuestionGold,
} from './gold.js';
import {
  ProblemPathEvaluationContextSchema,
  deriveProblemPathEvaluationContext,
} from './path-evaluator-input.js';

export const SELECTED_OPTION_GOLD_SLICE_VERSION =
  'selected-option-complete-gold-slice-v1' as const;

const IncludedReasonSchema = z.enum([
  'TARGET_OPTION',
  'TARGET_CLAIM',
  'CLAIM_DEPENDENCY',
  'DECISION_GROUND',
  'PREMISE_CLOSURE',
  'SCENARIO_DEPENDENCY',
  'VISUAL_DEPENDENCY',
  'MEDIA_DEPENDENCY',
]);

const SourceEvidenceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('PASSAGE_PROPOSITION'),
    id: z.string().min(1),
    normalizedClaim: z.string().min(1),
    sourceExcerpt: z.string().min(1),
    sourceLocation: z.object({ paragraphId: z.string().min(1) }).strict(),
  }).strict(),
  z.object({
    kind: z.literal('SCENARIO_FACT'),
    id: z.string().min(1),
    normalizedClaim: z.string().min(1),
    sourceExcerpt: z.string().min(1),
    sourceLocation: z.object({ scope: z.literal('SCENARIO') }).strict(),
  }).strict(),
  z.object({
    kind: z.literal('VISUAL_ASSERTION'),
    id: z.string().min(1),
    normalizedClaim: z.string().min(1),
    sourceExcerpt: z.string().min(1),
    sourceLocation: z.object({
      mediaId: z.string().min(1),
      sourceUrl: z.string().url(),
      contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      altText: z.string().min(1),
    }).strict(),
  }).strict(),
]);

const SufficientGroundSetSchema = z.object({
  setId: z.string().min(1),
  operator: z.literal('ALL_OF'),
  claimIds: z.array(z.string().min(1)).min(1),
  inferenceIds: z.array(z.string().min(1)).min(1),
  decisionRelevance: z.literal('DECISIVE'),
}).strict();

const SelectedOptionClaimSchema = OptionClaimSchema.omit({
  fallbackSupplementalInferenceIds: true,
  supplementalUsePolicy: true,
});

export const SelectedOptionGoldSliceSchema = z.object({
  sliceVersion: z.literal(SELECTED_OPTION_GOLD_SLICE_VERSION),
  sliceMode: z.literal('SELECTED_OPTION_COMPLETE'),
  goldVersion: z.literal('problem-solving-gold-v2'),
  evaluationContext: ProblemPathEvaluationContextSchema,
  stem: z.string().min(1),
  stemPolarity: z.enum(['SELECT_CORRECT', 'SELECT_INCORRECT']),
  targetOption: z.object({
    choiceId: z.string().min(1),
    text: z.string().min(1),
  }).strict(),
  targetClaims: z.array(SelectedOptionClaimSchema).min(1),
  approvedGrounds: z.array(ItemInferenceSchema).min(1),
  decisionRule: z.object({
    operator: z.literal('ANY_OF'),
    derivation: z.enum([
      'CONSERVATIVE_FROM_DECISION_CRITICAL_CLAIMS',
      'CONSERVATIVE_FROM_ALL_DECIDED_CLAIMS',
    ]),
    sufficientGroundSets: z.array(SufficientGroundSetSchema).min(1),
  }).strict(),
  sourceEvidence: z.array(SourceEvidenceSchema).min(1),
  coverageCertificate: z.object({
    status: z.literal('COMPLETE'),
    targetChoiceId: z.string().min(1),
    targetClaimIds: z.array(z.string().min(1)).min(1),
    coveredSourceRefs: z.array(z.string().min(1)).min(1),
    goldVersion: z.literal('problem-solving-gold-v2'),
    auditId: z.string().min(1),
    auditStatus: z.enum(['PRODUCTION_APPROVED', 'EXPERIMENT_ONLY']),
    fullGoldHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    sourceEvidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    dependencyGraphHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  }).strict().nullable(),
  includedManifest: z.array(z.object({
    id: z.string().min(1),
    reason: IncludedReasonSchema,
  }).strict()).min(1),
  sliceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
}).strict();

export const SelectedOptionGoldSliceAuditManifestSchema = z.object({
  sliceMode: z.enum([
    'SELECTED_OPTION_COMPLETE',
    'BASELINE_FULL_GOLD',
    'SLICE_UNAVAILABLE',
  ]),
  included: z.array(z.object({
    id: z.string().min(1),
    reason: IncludedReasonSchema,
  }).strict()),
  excluded: z.array(z.object({
    id: z.string().min(1),
    reason: z.enum([
      'OTHER_OPTION',
      'OTHER_OPTION_CLAIM',
      'OTHER_OPTION_INFERENCE',
      'DIAGNOSTIC_BIAS_RISK',
      'SUPPLEMENTAL_NOT_AUTHORIZED',
      'UNRELATED_SOURCE',
    ]),
  }).strict()),
  goldHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sliceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  fallbackReason: z.string().min(1).nullable(),
}).strict();

export type SelectedOptionGoldSlice = z.infer<typeof SelectedOptionGoldSliceSchema>;
export type SelectedOptionGoldSliceAuditManifest = z.infer<
  typeof SelectedOptionGoldSliceAuditManifestSchema
>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonical(value)).digest('hex')}`;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function buildSelectedOptionGoldSlice(options: {
  readonly gold: ProblemQuestionGold;
  readonly selectedChoiceId: string;
  readonly coverageAudit?: {
    readonly auditId: string;
    readonly mode: 'PRODUCTION' | 'EXPERIMENT';
  };
}): {
  readonly slice: SelectedOptionGoldSlice;
  readonly auditManifest: SelectedOptionGoldSliceAuditManifest;
} {
  const gold = ProblemQuestionGoldSchema.parse(options.gold);
  const choice = gold.choices.find((candidate) => candidate.choiceId === options.selectedChoiceId);
  if (choice === undefined) throw new Error(`선택 선지를 찾을 수 없다: ${options.selectedChoiceId}`);
  const context = deriveProblemPathEvaluationContext(gold, choice.choiceId);
  const claimsById = new Map(gold.optionClaims.map((claim) => [claim.claimId, claim]));
  const targetClaimIds = new Set(choice.claimIds);
  const pending = [...targetClaimIds];
  while (pending.length > 0) {
    const claimId = pending.pop()!;
    const claim = claimsById.get(claimId);
    if (claim === undefined || claim.choiceId !== choice.choiceId) {
      throw new Error(`선택 선지 claim 의존성이 끊겼다: ${claimId}`);
    }
    for (const dependencyId of claim.dependsOnClaimIds) {
      if (!targetClaimIds.has(dependencyId)) {
        targetClaimIds.add(dependencyId);
        pending.push(dependencyId);
      }
    }
  }
  const targetClaims = gold.optionClaims.filter((claim) => targetClaimIds.has(claim.claimId));
  const projectedTargetClaims = targetClaims.map((claim) => {
    const {
      fallbackSupplementalInferenceIds: _withheldSupplementalIds,
      supplementalUsePolicy: _withheldSupplementalPolicy,
      ...projected
    } = claim;
    return projected;
  });
  const inferenceIds = new Set(targetClaims.flatMap((claim) => claim.itemInferenceIds));
  const approvedGrounds = gold.itemInferences.filter((inference) => inferenceIds.has(inference.inferenceId));
  if (approvedGrounds.length !== inferenceIds.size || approvedGrounds.length === 0) {
    throw new Error('선택 선지의 승인 추론 참조가 끊겼거나 비어 있다.');
  }

  const propositionIds = new Set<string>();
  const scenarioFactIds = new Set<string>();
  const visualAssertionIds = new Set<string>();
  for (const reference of choice.requiredReferences) {
    reference.propositionIds.forEach((id) => propositionIds.add(id));
  }
  choice.scenarioFactIds.forEach((id) => scenarioFactIds.add(id));
  choice.visualAssertionIds.forEach((id) => visualAssertionIds.add(id));
  for (const evidence of [...targetClaims, ...approvedGrounds]) {
    for (const reference of evidence.references) {
      reference.propositionIds.forEach((id) => propositionIds.add(id));
    }
    evidence.scenarioFactIds.forEach((id) => scenarioFactIds.add(id));
    evidence.visualAssertionIds.forEach((id) => visualAssertionIds.add(id));
  }
  for (const inference of approvedGrounds) {
    for (const premiseRef of inference.premiseRefs) {
      if (premiseRef === 'ANSWER_KEY') continue;
      if (
        !propositionIds.has(premiseRef) &&
        !scenarioFactIds.has(premiseRef) &&
        !visualAssertionIds.has(premiseRef)
      ) {
        throw new Error(`추론 전제의 출처 참조가 closure에 없다: ${premiseRef}`);
      }
    }
  }

  const propositions = gold.passageDetailGold.propositions
    .filter((item) => propositionIds.has(item.id));
  const scenarioFacts = (gold.scenario?.facts ?? []).filter((item) => scenarioFactIds.has(item.id));
  const visualAssertions = gold.visualAssertions.filter((item) => visualAssertionIds.has(item.id));
  if (
    propositions.length !== propositionIds.size ||
    scenarioFacts.length !== scenarioFactIds.size ||
    visualAssertions.length !== visualAssertionIds.size
  ) {
    throw new Error('선택 선지 source dependency closure에 끊긴 참조가 있다.');
  }
  const mediaById = new Map(gold.mediaAssets.map((media) => [media.mediaId, media]));
  const sourceEvidence: z.infer<typeof SourceEvidenceSchema>[] = [
    ...propositions.map((item) => ({
      kind: 'PASSAGE_PROPOSITION' as const,
      id: item.id,
      normalizedClaim: item.description,
      sourceExcerpt: item.evidence,
      sourceLocation: { paragraphId: item.paragraphId },
    })),
    ...scenarioFacts.map((item) => ({
      kind: 'SCENARIO_FACT' as const,
      id: item.id,
      normalizedClaim: item.description,
      sourceExcerpt: gold.scenario?.text ?? item.description,
      sourceLocation: { scope: 'SCENARIO' as const },
    })),
    ...visualAssertions.map((item) => {
      const media = mediaById.get(item.mediaId);
      if (media === undefined) throw new Error(`시각 근거의 미디어 참조가 끊겼다: ${item.mediaId}`);
      return {
        kind: 'VISUAL_ASSERTION' as const,
        id: item.id,
        normalizedClaim: item.description,
        sourceExcerpt: item.description,
        sourceLocation: {
          mediaId: media.mediaId,
          sourceUrl: media.sourceUrl,
          contentHash: media.contentHash,
          altText: media.altText,
        },
      };
    }),
  ];
  if (sourceEvidence.length === 0) throw new Error('선택 선지의 원문 근거가 비어 있다.');

  const explicitDecisiveClaims = targetClaims.filter((claim) => claim.decisionCritical);
  const decisiveClaims = explicitDecisiveClaims.length > 0
    ? explicitDecisiveClaims
    : targetClaims.filter(
        (claim) =>
          claim.decision === context.choiceDecision &&
          claim.itemInferenceIds.length > 0,
      );
  if (decisiveClaims.length === 0) {
    throw new Error('선택 선지에 충분 근거 집합을 파생할 결정 claim이 없다.');
  }
  const inferenceById = new Map(approvedGrounds.map((item) => [item.inferenceId, item]));
  const inferenceSetForClaim = (claimId: string): string[] => {
    const claim = claimsById.get(claimId)!;
    const required = claim.itemInferenceIds.filter(
      (id) => inferenceById.get(id)?.necessity === 'REQUIRED',
    );
    return required.length > 0 ? required : [...claim.itemInferenceIds];
  };
  const sufficientGroundSets = context.choiceDecision === 'ACCEPTED'
    ? [{
        setId: 'SGS1',
        operator: 'ALL_OF' as const,
        claimIds: decisiveClaims.map((claim) => claim.claimId),
        inferenceIds: unique(decisiveClaims.flatMap((claim) => inferenceSetForClaim(claim.claimId))),
        decisionRelevance: 'DECISIVE' as const,
      }]
    : decisiveClaims.map((claim, index) => ({
        setId: `SGS${index + 1}`,
        operator: 'ALL_OF' as const,
        claimIds: [claim.claimId],
        inferenceIds: inferenceSetForClaim(claim.claimId),
        decisionRelevance: 'DECISIVE' as const,
      }));

  const included = [
    { id: choice.choiceId, reason: 'TARGET_OPTION' as const },
    ...targetClaims.map((claim) => ({
      id: claim.claimId,
      reason: choice.claimIds.includes(claim.claimId)
        ? 'TARGET_CLAIM' as const
        : 'CLAIM_DEPENDENCY' as const,
    })),
    ...approvedGrounds.map((item) => ({ id: item.inferenceId, reason: 'DECISION_GROUND' as const })),
    ...propositions.map((item) => ({ id: item.id, reason: 'PREMISE_CLOSURE' as const })),
    ...scenarioFacts.map((item) => ({ id: item.id, reason: 'SCENARIO_DEPENDENCY' as const })),
    ...visualAssertions.map((item) => ({ id: item.id, reason: 'VISUAL_DEPENDENCY' as const })),
    ...unique(visualAssertions.map((item) => item.mediaId))
      .map((id) => ({ id, reason: 'MEDIA_DEPENDENCY' as const })),
  ];
  const graphForHash = {
    targetClaims: projectedTargetClaims,
    approvedGrounds,
    sufficientGroundSets,
    sourceEvidence,
  };
  const needsCoverageCertificate = approvedGrounds.some(
    (inference) => inference.targetClaimEffect === 'DOES_NOT_JUSTIFY',
  );
  if (needsCoverageCertificate && options.coverageAudit === undefined) {
    throw new Error('DOES_NOT_JUSTIFY 슬라이스에는 명시적인 coverage audit이 필요하다.');
  }
  if (
    needsCoverageCertificate &&
    options.coverageAudit?.mode === 'PRODUCTION' &&
    gold.reviewStatus !== 'human_reviewed'
  ) {
    throw new Error('운영 DOES_NOT_JUSTIFY 슬라이스에는 human_reviewed 골드가 필요하다.');
  }
  const coveredSourceRefs = sourceEvidence.map((item) => item.id);
  const coverageCertificate = needsCoverageCertificate
    ? {
        status: 'COMPLETE' as const,
        targetChoiceId: choice.choiceId,
        targetClaimIds: targetClaims.map((claim) => claim.claimId),
        coveredSourceRefs,
        goldVersion: gold.schemaVersion,
        auditId: options.coverageAudit!.auditId,
        auditStatus: options.coverageAudit!.mode === 'PRODUCTION'
          ? 'PRODUCTION_APPROVED' as const
          : 'EXPERIMENT_ONLY' as const,
        fullGoldHash: hash(gold),
        sourceEvidenceHash: hash(sourceEvidence),
        dependencyGraphHash: hash(graphForHash),
      }
    : null;
  const sliceWithoutHash = {
    sliceVersion: SELECTED_OPTION_GOLD_SLICE_VERSION,
    sliceMode: 'SELECTED_OPTION_COMPLETE' as const,
    goldVersion: gold.schemaVersion,
    evaluationContext: context,
    stem: gold.stem,
    stemPolarity: gold.stemPolarity,
    targetOption: { choiceId: choice.choiceId, text: choice.text },
    targetClaims: projectedTargetClaims,
    approvedGrounds,
    decisionRule: {
      operator: 'ANY_OF' as const,
      derivation: explicitDecisiveClaims.length > 0
        ? 'CONSERVATIVE_FROM_DECISION_CRITICAL_CLAIMS' as const
        : 'CONSERVATIVE_FROM_ALL_DECIDED_CLAIMS' as const,
      sufficientGroundSets,
    },
    sourceEvidence,
    coverageCertificate,
    includedManifest: included,
  };
  const slice = SelectedOptionGoldSliceSchema.parse({
    ...sliceWithoutHash,
    sliceHash: hash(sliceWithoutHash),
  });
  const includedIds = new Set(included.map((item) => item.id));
  const excluded = [
    ...gold.choices
      .filter((item) => item.choiceId !== choice.choiceId)
      .map((item) => ({ id: item.choiceId, reason: 'OTHER_OPTION' as const })),
    ...gold.optionClaims
      .filter((item) => !includedIds.has(item.claimId))
      .map((item) => ({ id: item.claimId, reason: 'OTHER_OPTION_CLAIM' as const })),
    ...gold.itemInferences
      .filter((item) => !includedIds.has(item.inferenceId))
      .map((item) => ({ id: item.inferenceId, reason: 'OTHER_OPTION_INFERENCE' as const })),
    ...gold.representativeWrongPaths
      .map((item) => ({ id: item.id, reason: 'DIAGNOSTIC_BIAS_RISK' as const })),
    ...gold.supplementalExplanationInferences
      .map((item) => ({ id: item.inferenceId, reason: 'SUPPLEMENTAL_NOT_AUTHORIZED' as const })),
    ...gold.passageDetailGold.propositions
      .filter((item) => !includedIds.has(item.id))
      .map((item) => ({ id: item.id, reason: 'UNRELATED_SOURCE' as const })),
  ];
  const auditManifest = SelectedOptionGoldSliceAuditManifestSchema.parse({
    sliceMode: 'SELECTED_OPTION_COMPLETE',
    included,
    excluded,
    goldHash: hash(gold),
    sliceHash: slice.sliceHash,
    fallbackReason: null,
  });
  return { slice, auditManifest };
}
