import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import {
  HumanReviewedSufficientGroundSetSchema,
  ProblemQuestionGoldSchema,
  type ProblemQuestionGold,
} from './gold.js';

export const PROSPECTIVE_GOLD_SAMPLE_VERSION =
  'problem-gold-prospective-sample-v1' as const;
export const PROSPECTIVE_GOLD_REVIEW_VERSION =
  'problem-gold-human-review-v1' as const;
export const PROSPECTIVE_BLIND_GATE_VERSION =
  'problem-evaluator-prospective-blind-gate-v1' as const;

export const ProspectiveQuestionDomainSchema = z.enum([
  'HUMANITIES',
  'SOCIAL',
  'SCIENCE',
]);
export type ProspectiveQuestionDomain = z.infer<typeof ProspectiveQuestionDomainSchema>;

export const ProspectiveCoverageSchema = z.enum([
  'POSITIVE_STEM',
  'NEGATIVE_STEM',
  'HUMANITIES',
  'SOCIAL',
  'SCIENCE',
  'SCENARIO_APPLICATION',
  'CALCULATION',
  'VISUAL',
  'MULTI_CONDITION',
]);
export type ProspectiveCoverage = z.infer<typeof ProspectiveCoverageSchema>;

export const ProspectiveSampleItemSchema = z.object({
  caseId: z.string().min(1),
  productId: z.string().min(1),
  questionNumber: z.number().int().positive(),
  exam: z.string().min(1),
  title: z.string().min(1),
  domain: ProspectiveQuestionDomainSchema,
  coverage: z.array(ProspectiveCoverageSchema).min(2),
  sourceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  resultFile: z.string().min(1),
  enrichmentFile: z.string().min(1),
}).strict();

const REQUIRED_SAMPLE_COVERAGE: readonly ProspectiveCoverage[] = [
  'POSITIVE_STEM',
  'NEGATIVE_STEM',
  'HUMANITIES',
  'SOCIAL',
  'SCIENCE',
  'SCENARIO_APPLICATION',
  'CALCULATION',
  'VISUAL',
  'MULTI_CONDITION',
];

export const ProspectiveGoldSampleManifestSchema = z.object({
  manifestVersion: z.literal(PROSPECTIVE_GOLD_SAMPLE_VERSION),
  createdAt: z.string().datetime(),
  sourceRoot: z.string().min(1),
  selectionSeed: z.string().min(1),
  selectionPolicy: z.object({
    minimumSize: z.literal(20),
    maximumSize: z.literal(30),
    maximumQuestionsPerProduct: z.literal(1),
    excludedQuestionKeys: z.array(z.string().min(1)),
    minimumCoverageCounts: z.object({
      POSITIVE_STEM: z.number().int().min(8),
      NEGATIVE_STEM: z.number().int().min(8),
      HUMANITIES: z.number().int().min(6),
      SOCIAL: z.number().int().min(6),
      SCIENCE: z.number().int().min(6),
      SCENARIO_APPLICATION: z.number().int().min(6),
      CALCULATION: z.number().int().min(3),
      VISUAL: z.number().int().min(3),
      MULTI_CONDITION: z.number().int().min(6),
    }).strict(),
    requiredTargetClaimEffects: z.tuple([
      z.literal('CONTRADICTS'),
      z.literal('DOES_NOT_JUSTIFY'),
    ]),
  }).strict(),
  items: z.array(ProspectiveSampleItemSchema).min(20).max(30),
}).strict().superRefine((manifest, context) => {
  const itemKeys = manifest.items.map((item) => `${item.productId}:q${item.questionNumber}`);
  if (new Set(itemKeys).size !== itemKeys.length) {
    context.addIssue({ code: 'custom', path: ['items'], message: '표본 문항이 중복된다.' });
  }
  const productIds = manifest.items.map((item) => item.productId);
  if (new Set(productIds).size !== productIds.length) {
    context.addIssue({
      code: 'custom', path: ['items'], message: '한 지문에서 두 문항 이상을 선택할 수 없다.',
    });
  }
  const excluded = new Set(manifest.selectionPolicy.excludedQuestionKeys);
  for (const [index, key] of itemKeys.entries()) {
    if (excluded.has(key)) {
      context.addIssue({
        code: 'custom', path: ['items', index], message: '기존 실험 문항을 다시 선택했다.',
      });
    }
  }
  const covered = new Set(manifest.items.flatMap((item) => item.coverage));
  for (const required of REQUIRED_SAMPLE_COVERAGE) {
    if (!covered.has(required)) {
      context.addIssue({
        code: 'custom', path: ['items'], message: `필수 표본 범위 누락: ${required}`,
      });
    }
  }
  const coverageCounts = Object.fromEntries(REQUIRED_SAMPLE_COVERAGE.map((coverage) => [
    coverage,
    manifest.items.filter((item) => item.coverage.includes(coverage)).length,
  ])) as Record<ProspectiveCoverage, number>;
  for (const coverage of REQUIRED_SAMPLE_COVERAGE) {
    const minimum = manifest.selectionPolicy.minimumCoverageCounts[coverage];
    if (coverageCounts[coverage] < minimum) {
      context.addIssue({
        code: 'custom',
        path: ['selectionPolicy', 'minimumCoverageCounts', coverage],
        message: `${coverage} 표본 ${coverageCounts[coverage]}개가 최소 ${minimum}개보다 적다.`,
      });
    }
  }
});
export type ProspectiveGoldSampleManifest = z.infer<typeof ProspectiveGoldSampleManifestSchema>;

export const SufficientGroundSetCandidateSchema = z.object({
  candidateId: z.string().min(1),
  choiceId: z.string().min(1),
  targetClaimIds: z.array(z.string().min(1)).min(1),
  proposedRoute: z.enum([
    'APPROVED_SUFFICIENT_GROUND_SET',
    'SEMANTICALLY_EQUIVALENT_COMPRESSED_CAUSAL_CHAIN',
    'APPROVED_COMPLETE_ELIMINATION_PATH',
  ]),
  operator: z.literal('ALL_OF'),
  requiredSourceRefs: z.array(z.string().min(1)).min(1),
  allowedOmissionSourceRefs: z.array(z.string().min(1)),
  conclusion: z.string().min(1),
  sourceInferenceIds: z.array(z.string().min(1)).min(1),
  origin: z.literal('AI_INFERENCE_GRAPH_DERIVED'),
  reviewStatus: z.literal('candidate'),
  riskFlags: z.array(z.enum([
    'ANSWER_KEY_CONSTRAINED',
    'DOES_NOT_JUSTIFY',
    'VISUAL_REQUIRED',
    'MULTIPLE_INFERENCES',
  ])),
}).strict();
export type SufficientGroundSetCandidate = z.infer<typeof SufficientGroundSetCandidateSchema>;

export const ProspectiveGoldReviewSchema = z.object({
  reviewVersion: z.literal(PROSPECTIVE_GOLD_REVIEW_VERSION),
  caseId: z.string().min(1),
  goldHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sufficientGroundCandidatesHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reviewerId: z.string().min(1).nullable(),
  reviewedAt: z.string().datetime().nullable(),
  approvedCandidateIds: z.array(z.string().min(1)),
  modification: z.object({
    reviewMinutes: z.number().nonnegative(),
    modifiedFieldCount: z.number().int().nonnegative(),
    modifiedInferenceCount: z.number().int().nonnegative(),
    addedSufficientGroundSetCount: z.number().int().nonnegative(),
  }).strict(),
  risk: z.object({
    level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    reasons: z.array(z.string().min(1)),
  }).strict(),
  notes: z.array(z.string().min(1)),
}).strict().superRefine((review, context) => {
  if (review.status === 'PENDING') {
    if (review.reviewerId !== null || review.reviewedAt !== null) {
      context.addIssue({
        code: 'custom', path: ['status'], message: '대기 중 검수에는 검수자나 완료 시각을 기록할 수 없다.',
      });
    }
    if (review.approvedCandidateIds.length > 0) {
      context.addIssue({
        code: 'custom', path: ['approvedCandidateIds'], message: '대기 중 검수는 충분 경로를 승인할 수 없다.',
      });
    }
  } else if (review.reviewerId === null || review.reviewedAt === null) {
    context.addIssue({
      code: 'custom', path: ['reviewerId'], message: '완료된 검수에는 검수자와 완료 시각이 필요하다.',
    });
  }
});
export type ProspectiveGoldReview = z.infer<typeof ProspectiveGoldReviewSchema>;

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function artifactHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export function deriveSufficientGroundSetCandidates(
  goldInput: ProblemQuestionGold,
): SufficientGroundSetCandidate[] {
  const gold = ProblemQuestionGoldSchema.parse(goldInput);
  const inferencesByChoice = new Map<string, typeof gold.itemInferences>();
  for (const inference of gold.itemInferences) {
    for (const claimId of inference.targetClaimIds) {
      const claim = gold.optionClaims.find((candidate) => candidate.claimId === claimId);
      if (claim === undefined) continue;
      const current = inferencesByChoice.get(claim.choiceId) ?? [];
      if (!current.some((candidate) => candidate.inferenceId === inference.inferenceId)) {
        current.push(inference);
      }
      inferencesByChoice.set(claim.choiceId, current);
    }
  }

  return [...inferencesByChoice.entries()].flatMap(([choiceId, inferences]) => {
    const required = inferences.filter((inference) => inference.necessity === 'REQUIRED');
    const selected = required.length > 0 ? required : inferences;
    const requiredSourceRefs = unique(selected.flatMap((inference) => inference.premiseRefs));
    if (requiredSourceRefs.length === 0) return [];
    const riskFlags: SufficientGroundSetCandidate['riskFlags'] = [];
    if (selected.some((inference) => inference.grounding === 'ANSWER_KEY_CONSTRAINED')) {
      riskFlags.push('ANSWER_KEY_CONSTRAINED');
    }
    if (selected.some((inference) => inference.targetClaimEffect === 'DOES_NOT_JUSTIFY')) {
      riskFlags.push('DOES_NOT_JUSTIFY');
    }
    if (selected.some((inference) => inference.visualAssertionIds.length > 0)) {
      riskFlags.push('VISUAL_REQUIRED');
    }
    if (selected.length > 1) riskFlags.push('MULTIPLE_INFERENCES');
    return [SufficientGroundSetCandidateSchema.parse({
      candidateId: `${gold.questionId}-${choiceId}-SGC1`,
      choiceId,
      targetClaimIds: unique(selected.flatMap((inference) => inference.targetClaimIds)),
      proposedRoute: 'APPROVED_SUFFICIENT_GROUND_SET',
      operator: 'ALL_OF',
      requiredSourceRefs,
      allowedOmissionSourceRefs: [],
      conclusion: selected.map((inference) => inference.conclusion).join(' '),
      sourceInferenceIds: selected.map((inference) => inference.inferenceId),
      origin: 'AI_INFERENCE_GRAPH_DERIVED',
      reviewStatus: 'candidate',
      riskFlags,
    })];
  });
}

export function createPendingProspectiveGoldReview(options: {
  readonly caseId: string;
  readonly gold: ProblemQuestionGold;
  readonly candidates: readonly SufficientGroundSetCandidate[];
}): ProspectiveGoldReview {
  const riskReasons = unique(options.candidates.flatMap((candidate) => candidate.riskFlags));
  const riskLevel = riskReasons.includes('ANSWER_KEY_CONSTRAINED') ||
    riskReasons.includes('DOES_NOT_JUSTIFY')
    ? 'HIGH'
    : riskReasons.length > 0
      ? 'MEDIUM'
      : 'LOW';
  return ProspectiveGoldReviewSchema.parse({
    reviewVersion: PROSPECTIVE_GOLD_REVIEW_VERSION,
    caseId: options.caseId,
    goldHash: artifactHash(options.gold),
    sufficientGroundCandidatesHash: artifactHash(options.candidates),
    status: 'PENDING',
    reviewerId: null,
    reviewedAt: null,
    approvedCandidateIds: [],
    modification: {
      reviewMinutes: 0,
      modifiedFieldCount: 0,
      modifiedInferenceCount: 0,
      addedSufficientGroundSetCount: 0,
    },
    risk: { level: riskLevel, reasons: riskReasons },
    notes: [],
  });
}

/** 블라인드 실험 전용 승격이다. 운영 fixture를 쓰거나 복사하지 않는다. */
export function approveGoldForProspectiveBlindExperiment(options: {
  readonly gold: ProblemQuestionGold;
  readonly candidates: readonly SufficientGroundSetCandidate[];
  readonly review: ProspectiveGoldReview;
}): ProblemQuestionGold {
  const gold = ProblemQuestionGoldSchema.parse(options.gold);
  const candidates = options.candidates.map((candidate) =>
    SufficientGroundSetCandidateSchema.parse(candidate));
  const review = ProspectiveGoldReviewSchema.parse(options.review);
  if (gold.reviewStatus !== 'candidate') {
    throw new Error('prospective blind 승격 입력은 candidate 골드여야 한다.');
  }
  if (review.status !== 'APPROVED') {
    throw new Error('사람이 APPROVED로 완료한 검수만 블라인드 실험 골드로 승격할 수 있다.');
  }
  if (review.goldHash !== artifactHash(gold)) {
    throw new Error('검수 이후 골드가 변경되어 승인 해시가 일치하지 않는다.');
  }
  if (review.sufficientGroundCandidatesHash !== artifactHash(candidates)) {
    throw new Error('검수 이후 충분 경로 후보가 변경되어 승인 해시가 일치하지 않는다.');
  }
  const byId = new Map(candidates.map((candidate) => [candidate.candidateId, candidate]));
  const approvedSets = review.approvedCandidateIds.map((candidateId) => {
    const candidate = byId.get(candidateId);
    if (candidate === undefined) throw new Error(`승인한 충분 경로 후보가 없다: ${candidateId}`);
    return HumanReviewedSufficientGroundSetSchema.parse({
      setId: candidate.candidateId.replace('-SGC', '-SG'),
      choiceId: candidate.choiceId,
      targetClaimIds: candidate.targetClaimIds,
      route: candidate.proposedRoute,
      operator: candidate.operator,
      requiredSourceRefs: candidate.requiredSourceRefs,
      allowedOmissionSourceRefs: candidate.allowedOmissionSourceRefs,
      conclusion: candidate.conclusion,
      reviewStatus: 'human_reviewed',
    });
  });
  return ProblemQuestionGoldSchema.parse({
    ...gold,
    reviewStatus: 'human_reviewed',
    sufficientGroundSets: approvedSets,
  });
}

export const ProspectiveSafetyObservationSchema = z.object({
  caseId: z.string().min(1),
  responseId: z.string().min(1),
  correctAnswerReversed: z.boolean(),
  unnecessaryQuestionAfterCorrectAnswer: z.boolean(),
  inventedUnstatedMisconception: z.boolean(),
  irrelevantSourceUsed: z.boolean(),
  answerOrOtherChoiceLeaked: z.boolean(),
  duplicateFallbackCall: z.boolean(),
  unsafeTermination: z.boolean(),
}).strict();
export type ProspectiveSafetyObservation = z.infer<typeof ProspectiveSafetyObservationSchema>;

const SAFETY_FIELDS = [
  'correctAnswerReversed',
  'unnecessaryQuestionAfterCorrectAnswer',
  'inventedUnstatedMisconception',
  'irrelevantSourceUsed',
  'answerOrOtherChoiceLeaked',
  'duplicateFallbackCall',
  'unsafeTermination',
] as const;

export function evaluateProspectiveBlindSafetyGate(
  observationsInput: readonly ProspectiveSafetyObservation[],
): {
  readonly gateVersion: typeof PROSPECTIVE_BLIND_GATE_VERSION;
  readonly passed: boolean;
  readonly evaluatedResponseCount: number;
  readonly violations: Record<(typeof SAFETY_FIELDS)[number], number>;
} {
  const observations = observationsInput.map((observation) =>
    ProspectiveSafetyObservationSchema.parse(observation));
  const violations = Object.fromEntries(SAFETY_FIELDS.map((field) => [
    field,
    observations.filter((observation) => observation[field]).length,
  ])) as Record<(typeof SAFETY_FIELDS)[number], number>;
  return {
    gateVersion: PROSPECTIVE_BLIND_GATE_VERSION,
    passed: observations.length > 0 && Object.values(violations).every((count) => count === 0),
    evaluatedResponseCount: observations.length,
    violations,
  };
}

export const GoldProductionMeasurementSchema = z.object({
  caseId: z.string().min(1),
  generationCalls: z.number().int().nonnegative(),
  generationDurationMs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  rawSchemaValid: z.boolean().default(false),
  schemaValid: z.boolean(),
  automaticNormalizationCount: z.number().int().nonnegative().default(0),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  reviewMinutes: z.number().nonnegative(),
  modifiedFieldCount: z.number().int().nonnegative(),
  modifiedInferenceCount: z.number().int().nonnegative(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
}).strict();
export type GoldProductionMeasurement = z.infer<typeof GoldProductionMeasurementSchema>;

export function summarizeGoldProduction(
  measurementsInput: readonly GoldProductionMeasurement[],
): {
  readonly itemCount: number;
  readonly totalGenerationCalls: number;
  readonly totalDurationMs: number;
  readonly totalInputTokens: number;
  readonly totalCacheReadTokens: number;
  readonly totalOutputTokens: number;
  readonly totalEstimatedCostUsd: number | null;
  readonly schemaValidCount: number;
  readonly rawSchemaValidCount: number;
  readonly totalAutomaticNormalizations: number;
  readonly approvedCount: number;
  readonly totalReviewMinutes: number;
  readonly modifiedItemCount: number;
  readonly highRiskItemCount: number;
  readonly highRiskRatio: number;
} {
  const measurements = measurementsInput.map((measurement) =>
    GoldProductionMeasurementSchema.parse(measurement));
  const costs = measurements.map((measurement) => measurement.estimatedCostUsd);
  const highRiskItemCount = measurements.filter((measurement) =>
    measurement.riskLevel === 'HIGH').length;
  return {
    itemCount: measurements.length,
    totalGenerationCalls: measurements.reduce((sum, item) => sum + item.generationCalls, 0),
    totalDurationMs: measurements.reduce((sum, item) => sum + item.generationDurationMs, 0),
    totalInputTokens: measurements.reduce((sum, item) => sum + item.inputTokens, 0),
    totalCacheReadTokens: measurements.reduce((sum, item) => sum + item.cacheReadTokens, 0),
    totalOutputTokens: measurements.reduce((sum, item) => sum + item.outputTokens, 0),
    totalEstimatedCostUsd: costs.some((cost) => cost === null)
      ? null
      : Number(costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0).toFixed(6)),
    schemaValidCount: measurements.filter((item) => item.schemaValid).length,
    rawSchemaValidCount: measurements.filter((item) => item.rawSchemaValid).length,
    totalAutomaticNormalizations: measurements.reduce(
      (sum, item) => sum + item.automaticNormalizationCount,
      0,
    ),
    approvedCount: measurements.filter((item) => item.reviewStatus === 'APPROVED').length,
    totalReviewMinutes: measurements.reduce((sum, item) => sum + item.reviewMinutes, 0),
    modifiedItemCount: measurements.filter((item) =>
      item.modifiedFieldCount > 0 || item.modifiedInferenceCount > 0).length,
    highRiskItemCount,
    highRiskRatio: measurements.length === 0 ? 0 : highRiskItemCount / measurements.length,
  };
}
