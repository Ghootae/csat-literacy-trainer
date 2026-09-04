import { z } from 'zod/v4';

import { sourceArtifactHash } from './source-bundle.js';
import {
  SourceAuditV2Schema,
  SourceBundleV2Schema,
  evaluateProductionEligibility,
  type RatioRelationV2,
  type SourceAuditV2,
  type SourceBundleV2,
} from './source-bundle-v2.js';

const LensCoreCheckSchema = z.object({
  relation: z.string().min(1),
  passed: z.boolean(),
  matchingRelationIds: z.array(z.string().min(1)),
}).strict();

export const LensItemCoreScoreV2Schema = z.object({
  sourceUnitId: z.literal('I1-S5'),
  checks: z.object({
    p0EqualsTwoTimesP1: LensCoreCheckSchema,
    p0EqualsHalfP2: LensCoreCheckSchema,
    noInverseAddedAsSource: LensCoreCheckSchema,
  }).strict(),
  passed: z.boolean(),
}).strict();
export type LensItemCoreScoreV2 = z.infer<typeof LensItemCoreScoreV2Schema>;

export const LensRatioOrientationV2Schema = z.enum(['NORMAL', 'REVERSED', 'OTHER']);
export type LensRatioOrientationV2 = z.infer<typeof LensRatioOrientationV2Schema>;

function normalizedLabel(value: string): string {
  return value
    .replaceAll('₀', '0').replaceAll('₁', '1').replaceAll('₂', '2')
    .replaceAll('₃', '3').replaceAll('₄', '4')
    .replaceAll(/\s+/gu, '')
    .toLowerCase();
}

function entityMatches(bundle: SourceBundleV2, entityId: string, target: string): boolean {
  const entity = bundle.entities.find((candidate) => candidate.entityId === entityId);
  if (entity === undefined) return false;
  const labels = [entity.canonicalLabel, ...entity.surfaceForms].map(normalizedLabel);
  return labels.includes(normalizedLabel(target));
}

function distanceQuantityId(
  bundle: SourceBundleV2,
  subject: 'P0' | 'P1' | 'P2',
): string | null {
  const matches = bundle.quantities.filter((quantity) => (
    quantity.quantityKind === 'DISTANCE' &&
    entityMatches(bundle, quantity.subjectEntityId, subject) &&
    quantity.referenceEntityId !== null &&
    entityMatches(bundle, quantity.referenceEntityId, '광축')
  ));
  return matches.length === 1 ? matches[0]!.quantityId : null;
}

function relevantRatioRelations(bundle: SourceBundleV2): RatioRelationV2[] {
  return bundle.relations.filter((relation): relation is RatioRelationV2 => (
    relation.relationFamily === 'RATIO' && relation.sourceUnitId === 'I1-S5'
  ));
}

export function classifyLensRatioOrientationV2(bundleValue: unknown): {
  readonly orientation: LensRatioOrientationV2;
  readonly normalRelationIds: readonly string[];
  readonly reversedRelationIds: readonly string[];
} {
  const bundle = SourceBundleV2Schema.parse(bundleValue);
  const p0 = distanceQuantityId(bundle, 'P0');
  const p2 = distanceQuantityId(bundle, 'P2');
  const ratios = relevantRatioRelations(bundle);
  const matching = (left: string | null, right: string | null): string[] => (
    left === null || right === null
      ? []
      : ratios.filter((relation) => (
          relation.leftQuantityId === left && relation.rightQuantityId === right &&
          relation.coefficient === 0.5 &&
          relation.interpretationRule === 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT'
        )).map((relation) => relation.relationId)
  );
  const normalRelationIds = matching(p0, p2);
  const reversedRelationIds = matching(p2, p0);
  const orientation: LensRatioOrientationV2 = normalRelationIds.length === 1 && reversedRelationIds.length === 0
    ? 'NORMAL'
    : reversedRelationIds.length === 1 && normalRelationIds.length === 0
      ? 'REVERSED'
      : 'OTHER';
  return { orientation, normalRelationIds, reversedRelationIds };
}

export function scoreLensItemCoreV2(bundleValue: unknown): LensItemCoreScoreV2 {
  const bundle = SourceBundleV2Schema.parse(bundleValue);
  const p0 = distanceQuantityId(bundle, 'P0');
  const p1 = distanceQuantityId(bundle, 'P1');
  const p2 = distanceQuantityId(bundle, 'P2');
  const ratios = relevantRatioRelations(bundle);
  const matching = (left: string | null, coefficient: number, right: string | null): string[] => (
    left === null || right === null
      ? []
      : ratios.filter((relation) => (
          relation.leftQuantityId === left && relation.rightQuantityId === right &&
          relation.coefficient === coefficient &&
          relation.interpretationRule === 'LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT'
        )).map((relation) => relation.relationId)
  );
  const p0P1 = matching(p0, 2, p1);
  const p0P2 = matching(p0, 0.5, p2);
  const inverse = [
    ...matching(p1, 2, p0),
    ...matching(p2, 0.5, p0),
  ];
  const score = {
    sourceUnitId: 'I1-S5' as const,
    checks: {
      p0EqualsTwoTimesP1: {
        relation: 'distance(P0,axis) = 2 × distance(P1,axis)',
        passed: p0P1.length === 1,
        matchingRelationIds: p0P1,
      },
      p0EqualsHalfP2: {
        relation: 'distance(P0,axis) = 0.5 × distance(P2,axis)',
        passed: p0P2.length === 1,
        matchingRelationIds: p0P2,
      },
      noInverseAddedAsSource: {
        relation: '유도한 역관계를 Source Relation으로 추가하지 않음',
        passed: inverse.length === 0,
        matchingRelationIds: inverse,
      },
    },
  };
  return LensItemCoreScoreV2Schema.parse({
    ...score,
    passed: Object.values(score.checks).every((check) => check.passed),
  });
}

export const LensRatioMutationManifestV2Schema = z.object({
  mutationArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baselineArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  privateMutationKind: z.literal('RATIO_DIRECTION_REVERSAL'),
  sourceUnitId: z.literal('I1-S5'),
  changedRelationId: z.string().min(1),
  changedClaimIds: z.array(z.string().min(1)).min(1),
  changedPaths: z.array(z.string().min(1)).min(3),
  apiCandidateLabel: z.literal('CANDIDATE_A'),
  mutationKindExposedToApi: z.literal(false),
}).strict();

export const LensRatioContrastManifestV2Schema = z.object({
  mutationArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  baselineArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  privateMutationKind: z.enum(['RATIO_DIRECTION_REVERSAL', 'RATIO_DIRECTION_CORRECTION']),
  sourceOrientation: z.enum(['NORMAL', 'REVERSED']),
  contrastOrientation: z.enum(['NORMAL', 'REVERSED']),
  sourceUnitId: z.literal('I1-S5'),
  changedRelationId: z.string().min(1),
  changedClaimIds: z.array(z.string().min(1)).min(1),
  changedPaths: z.array(z.string().min(1)).min(3),
  apiCandidateLabel: z.literal('CANDIDATE_A'),
  mutationKindExposedToApi: z.literal(false),
}).strict();

function changedPaths(left: unknown, right: unknown, path = '$'): string[] {
  if (Object.is(left, right)) return [];
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    return Array.from({ length }, (_, index) => changedPaths(left[index], right[index], `${path}.${index}`))
      .flat();
  }
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].flatMap((key) => changedPaths(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key],
      `${path}.${key}`,
    ));
  }
  return [path];
}

export function createLensRatioDirectionMutationV2(bundleValue: unknown): {
  readonly candidate: SourceBundleV2;
  readonly privateManifest: z.infer<typeof LensRatioMutationManifestV2Schema>;
} {
  const contrast = createLensRatioDirectionContrastV2(bundleValue);
  if (contrast.privateManifest.privateMutationKind !== 'RATIO_DIRECTION_REVERSAL') {
    throw new Error('정상 방향 후보만 역관계 변이에 사용할 수 있다.');
  }
  return {
    candidate: contrast.candidate,
    privateManifest: LensRatioMutationManifestV2Schema.parse({
      mutationArtifactHash: contrast.privateManifest.mutationArtifactHash,
      baselineArtifactHash: contrast.privateManifest.baselineArtifactHash,
      privateMutationKind: contrast.privateManifest.privateMutationKind,
      sourceUnitId: contrast.privateManifest.sourceUnitId,
      changedRelationId: contrast.privateManifest.changedRelationId,
      changedClaimIds: contrast.privateManifest.changedClaimIds,
      changedPaths: contrast.privateManifest.changedPaths,
      apiCandidateLabel: contrast.privateManifest.apiCandidateLabel,
      mutationKindExposedToApi: contrast.privateManifest.mutationKindExposedToApi,
    }),
  };
}

export function createLensRatioDirectionContrastV2(bundleValue: unknown): {
  readonly candidate: SourceBundleV2;
  readonly privateManifest: z.infer<typeof LensRatioContrastManifestV2Schema>;
} {
  const baseline = SourceBundleV2Schema.parse(bundleValue);
  const classification = classifyLensRatioOrientationV2(baseline);
  if (classification.orientation === 'OTHER') {
    throw new Error('P0/P2의 단일 0.5 비율 방향을 찾을 수 없어 대조 후보를 만들 수 없다.');
  }
  const targetId = classification.orientation === 'NORMAL'
    ? classification.normalRelationIds[0]!
    : classification.reversedRelationIds[0]!;
  const candidate = structuredClone(baseline);
  const relationIndex = candidate.relations.findIndex((relation) => relation.relationId === targetId);
  const relation = candidate.relations[relationIndex];
  if (relation === undefined || relation.relationFamily !== 'RATIO') {
    throw new Error('P0/P2 RATIO relation을 찾지 못했다.');
  }
  const previousLeft = relation.leftQuantityId;
  relation.leftQuantityId = relation.rightQuantityId;
  relation.rightQuantityId = previousLeft;
  for (const claimId of relation.claimIds) {
    const claim = candidate.claims.find((entry) => entry.claimId === claimId);
    if (claim === undefined) throw new Error(`${claimId} claim이 mutation 대상에 없다.`);
    claim.normalizedClaim = classification.orientation === 'NORMAL'
      ? 'distance(P2,optical_axis) = 0.5 × distance(P0,optical_axis)'
      : 'distance(P0,optical_axis) = 0.5 × distance(P2,optical_axis)';
  }
  const parsed = SourceBundleV2Schema.parse(candidate);
  const actualChangedPaths = changedPaths(baseline, parsed).sort();
  const expectedChangedPaths = [
    `$.relations.${relationIndex}.leftQuantityId`,
    `$.relations.${relationIndex}.rightQuantityId`,
    ...relation.claimIds.map((claimId) => {
      const claimIndex = parsed.claims.findIndex((claim) => claim.claimId === claimId);
      return `$.claims.${claimIndex}.normalizedClaim`;
    }),
  ].sort();
  if (actualChangedPaths.join('|') !== expectedChangedPaths.join('|')) {
    throw new Error(`역관계 변이가 허용된 필드 밖을 변경했다: ${actualChangedPaths.join(', ')}`);
  }
  return {
    candidate: parsed,
    privateManifest: LensRatioContrastManifestV2Schema.parse({
      mutationArtifactHash: sourceArtifactHash(parsed),
      baselineArtifactHash: sourceArtifactHash(baseline),
      privateMutationKind: classification.orientation === 'NORMAL'
        ? 'RATIO_DIRECTION_REVERSAL'
        : 'RATIO_DIRECTION_CORRECTION',
      sourceOrientation: classification.orientation,
      contrastOrientation: classification.orientation === 'NORMAL' ? 'REVERSED' : 'NORMAL',
      sourceUnitId: 'I1-S5',
      changedRelationId: relation.relationId,
      changedClaimIds: relation.claimIds,
      changedPaths: actualChangedPaths,
      apiCandidateLabel: 'CANDIDATE_A',
      mutationKindExposedToApi: false,
    }),
  };
}

export const MutationAuditScoreV2Schema = z.object({
  auditId: z.string().min(1),
  unitDecision: z.enum(['PASS', 'WARNING', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED']),
  directionIssueDetected: z.boolean(),
  meaningDetectionSucceeded: z.boolean(),
  safetyBlockSucceeded: z.boolean(),
}).strict();

export function scoreLensMutationAuditV2(auditValue: unknown): z.infer<typeof MutationAuditScoreV2Schema> {
  const audit = SourceAuditV2Schema.parse(auditValue);
  const unit = audit.unitAudits.find((candidate) => candidate.sourceUnitId === 'I1-S5');
  if (unit === undefined) throw new Error('변이 감사에 I1-S5가 없다.');
  const directionIssueDetected = unit.issues.some((issue) => issue.issueClass === 'DIRECTION');
  const meaningDetectionSucceeded = ['REPAIR_REQUIRED', 'BLOCKING'].includes(unit.decision) &&
    directionIssueDetected;
  const eligibility = evaluateProductionEligibility({
    artifactFrozen: true,
    unitAudits: audit.unitAudits,
  });
  return MutationAuditScoreV2Schema.parse({
    auditId: audit.auditId,
    unitDecision: unit.decision,
    directionIssueDetected,
    meaningDetectionSucceeded,
    safetyBlockSucceeded: !eligibility.productionEligible,
  });
}

export function scoreNormalAuditEligibilityV2(auditValue: unknown): {
  readonly wouldBeProductionEligible: boolean;
  readonly productionEligible: false;
  readonly reason: 'EXPERIMENT_ONLY';
} {
  const audit = SourceAuditV2Schema.parse(auditValue);
  const hypothetical = evaluateProductionEligibility({
    artifactFrozen: true,
    unitAudits: audit.unitAudits,
  });
  return {
    wouldBeProductionEligible: hypothetical.productionEligible,
    productionEligible: false,
    reason: 'EXPERIMENT_ONLY',
  };
}

export function mediumHighTargetAgreementV2(
  mediumValue: unknown,
  highValue: unknown,
): {
  readonly agree: boolean;
  readonly mediumDecision: SourceAuditV2['unitAudits'][number]['decision'];
  readonly highDecision: SourceAuditV2['unitAudits'][number]['decision'];
  readonly resolution: 'PASS' | 'REPAIR_AND_REAUDIT' | 'HUMAN_REVIEW';
} {
  const medium = SourceAuditV2Schema.parse(mediumValue);
  const high = SourceAuditV2Schema.parse(highValue);
  const mediumUnit = medium.unitAudits.find((unit) => unit.sourceUnitId === 'I1-S5');
  const highUnit = high.unitAudits.find((unit) => unit.sourceUnitId === 'I1-S5');
  if (mediumUnit === undefined || highUnit === undefined) throw new Error('medium/high I1-S5 감사가 없다.');
  const agree = mediumUnit.decision === highUnit.decision;
  const repair = ['REPAIR_REQUIRED', 'BLOCKING'].includes(mediumUnit.decision) &&
    ['REPAIR_REQUIRED', 'BLOCKING'].includes(highUnit.decision);
  return {
    agree,
    mediumDecision: mediumUnit.decision,
    highDecision: highUnit.decision,
    resolution: agree && mediumUnit.decision === 'PASS'
      ? 'PASS'
      : repair
        ? 'REPAIR_AND_REAUDIT'
        : 'HUMAN_REVIEW',
  };
}
