import { z } from 'zod/v4';

import {
  FrozenOptionClaimBundleSchema,
  FrozenSourceBundleSchema,
  OptionClaimBundleSchema,
  SourceBundleSchema,
  SourcePacketSchema,
  auditOptionClaimBundleAgainstPacket,
  auditSourceBundleAgainstPacket,
  canonicalSourceBundleHash,
  canonicalSourcePacketHash,
  optionClaimSemanticFingerprint,
  sourceArtifactHash,
  sourceBundleSemanticFingerprint,
  type FrozenOptionClaimBundle,
  type FrozenSourceBundle,
  type OptionClaimBundle,
  type SourceBundle,
  type SourcePacket,
} from './source-bundle.js';

export const SOURCE_ARTIFACT_AUDIT_VERSION = 'problem-source-artifact-audit-v1' as const;

export const SourceArtifactAuditSchema = z.object({
  auditVersion: z.literal(SOURCE_ARTIFACT_AUDIT_VERSION),
  artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  isolation: z.object({
    sourceOnly: z.literal(true),
    candidateHiddenDuringIndependentReading: z.literal(true),
    answerKeyUsed: z.literal(false),
    officialExplanationUsed: z.literal(false),
  }).strict(),
  unitAudits: z.array(z.object({
    unitId: z.string().min(1),
    decision: z.enum(['PASS', 'REJECT', 'HUMAN_REVIEW']),
    checks: z.object({
      sourceFaithful: z.boolean(),
      directionPreserved: z.boolean(),
      conditionPreserved: z.boolean(),
      modalityPreserved: z.boolean(),
      visualPrecisionAppropriate: z.boolean(),
    }).strict(),
    evidence: z.array(z.object({
      documentId: z.string().min(1).nullable(),
      quote: z.string().min(1).nullable(),
      mediaId: z.string().min(1).nullable(),
      reason: z.string().min(1),
    }).strict().superRefine((evidence, context) => {
      if (evidence.documentId === null && evidence.mediaId === null) {
        context.addIssue({
          code: 'custom', path: ['documentId'], message: '감사 근거에는 문서 또는 미디어가 필요하다.',
        });
      }
      if ((evidence.documentId === null) !== (evidence.quote === null)) {
        context.addIssue({
          code: 'custom', path: ['quote'], message: 'documentId와 quote는 함께 지정한다.',
        });
      }
    })).min(1),
    reason: z.string().min(1),
  }).strict()).min(1),
  forcedAlternativeChecks: z.array(z.object({
    checkId: z.string().min(1),
    alternatives: z.array(z.string().min(1)).min(2),
    selectedAlternativeIndex: z.number().int().nonnegative().nullable(),
    decision: z.enum(['PASS', 'REJECT', 'HUMAN_REVIEW']),
    sourceEvidence: z.string().min(1),
    reason: z.string().min(1),
  }).strict().superRefine((check, context) => {
    if (
      check.selectedAlternativeIndex !== null &&
      check.selectedAlternativeIndex >= check.alternatives.length
    ) {
      context.addIssue({
        code: 'custom', path: ['selectedAlternativeIndex'], message: '후보 index가 범위를 벗어났다.',
      });
    }
    if (check.decision === 'PASS' && check.selectedAlternativeIndex === null) {
      context.addIssue({
        code: 'custom', path: ['selectedAlternativeIndex'], message: 'PASS 비교에는 선택한 후보가 필요하다.',
      });
    }
  })),
  conflicts: z.array(z.object({
    description: z.string().min(1),
    disposition: z.enum(['REJECT', 'HUMAN_REVIEW']),
  }).strict()),
  overallDecision: z.enum(['PASS', 'REJECT', 'HUMAN_REVIEW']),
  reason: z.string().min(1),
}).strict().superRefine((audit, context) => {
  const requiresReject = audit.unitAudits.some((unit) => unit.decision === 'REJECT') ||
    audit.forcedAlternativeChecks.some((check) => check.decision === 'REJECT') ||
    audit.conflicts.some((conflict) => conflict.disposition === 'REJECT');
  const requiresReview = audit.unitAudits.some((unit) => unit.decision === 'HUMAN_REVIEW') ||
    audit.forcedAlternativeChecks.some((check) => check.decision === 'HUMAN_REVIEW') ||
    audit.conflicts.some((conflict) => conflict.disposition === 'HUMAN_REVIEW');
  if (requiresReject && audit.overallDecision !== 'REJECT') {
    context.addIssue({
      code: 'custom',
      path: ['overallDecision'],
      message: '하위 REJECT가 있으면 전체도 REJECT여야 한다.',
    });
  } else if (!requiresReject && requiresReview && audit.overallDecision !== 'HUMAN_REVIEW') {
    context.addIssue({
      code: 'custom',
      path: ['overallDecision'],
      message: '하위 HUMAN_REVIEW가 있으면 전체도 HUMAN_REVIEW여야 한다.',
    });
  }
  if (
    !requiresReject && !requiresReview &&
    audit.unitAudits.some((unit) => Object.values(unit.checks).some((passed) => !passed))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['unitAudits'],
      message: '모든 검사가 true가 아닌 unit을 PASS로 둘 수 없다.',
    });
  }
  if (!requiresReject && !requiresReview && audit.overallDecision !== 'PASS') {
    context.addIssue({
      code: 'custom', path: ['overallDecision'], message: '하위 오류가 없으면 전체 결정은 PASS다.',
    });
  }
});
export type SourceArtifactAudit = z.infer<typeof SourceArtifactAuditSchema>;

export const SOURCE_ARTIFACT_AUDIT_BATCH_VERSION =
  'problem-source-artifact-audit-batch-v1' as const;

export const SourceArtifactAuditBatchSchema = z.object({
  batchVersion: z.literal(SOURCE_ARTIFACT_AUDIT_BATCH_VERSION),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  candidateAudits: z.array(z.object({
    candidateId: z.string().regex(/^RUN[1-9][0-9]*$/),
    artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    audit: SourceArtifactAuditSchema,
  }).strict()).min(1),
}).strict();
export type SourceArtifactAuditBatch = z.infer<typeof SourceArtifactAuditBatchSchema>;

export function validateSourceArtifactAuditBatch(options: {
  readonly batch: unknown;
  readonly candidates: readonly SourceBundle[];
  readonly sourcePacket: unknown;
}): SourceArtifactAuditBatch {
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  const candidates = options.candidates.map((candidate) => SourceBundleSchema.parse(candidate));
  const batch = SourceArtifactAuditBatchSchema.parse(options.batch);
  const expectedPacketHash = canonicalSourcePacketHash(packet);
  if (batch.sourcePacketHash !== expectedPacketHash) {
    throw new Error('배치 SourceAudit의 sourcePacketHash가 원자료 packet과 일치하지 않는다.');
  }
  if (batch.candidateAudits.length !== candidates.length) {
    throw new Error('배치 SourceAudit가 모든 후보를 정확히 한 번씩 덮지 않는다.');
  }
  const expectedIds = candidates.map((_, index) => `RUN${index + 1}`);
  const actualIds = batch.candidateAudits.map((entry) => entry.candidateId);
  if (new Set(actualIds).size !== actualIds.length || actualIds.join('|') !== expectedIds.join('|')) {
    throw new Error('배치 SourceAudit candidateId가 RUN 순서와 일치하지 않는다.');
  }
  for (const [index, entry] of batch.candidateAudits.entries()) {
    const candidate = candidates[index]!;
    const expectedArtifactHash = sourceArtifactHash(candidate);
    if (entry.artifactHash !== expectedArtifactHash) {
      throw new Error(`${entry.candidateId}의 artifactHash가 후보와 일치하지 않는다.`);
    }
    validateSourceArtifactAudit({ audit: entry.audit, artifact: candidate, sourcePacket: packet });
  }
  return batch;
}

export function validateSourceArtifactAudit(options: {
  readonly audit: unknown;
  readonly artifact: unknown;
  readonly sourcePacket: unknown;
}): SourceArtifactAudit {
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  const audit = SourceArtifactAuditSchema.parse(options.audit);
  if (audit.artifactHash !== sourceArtifactHash(options.artifact)) {
    throw new Error('SourceAudit의 artifactHash가 감사 대상과 일치하지 않는다.');
  }
  if (audit.sourcePacketHash !== canonicalSourcePacketHash(packet)) {
    throw new Error('SourceAudit의 sourcePacketHash가 원자료 packet과 일치하지 않는다.');
  }
  const sourceBundle = SourceBundleSchema.safeParse(options.artifact);
  const optionBundle = OptionClaimBundleSchema.safeParse(options.artifact);
  const expectedUnitIds = sourceBundle.success
    ? sourceBundle.data.claims.map((claim) => claim.claimId)
    : optionBundle.success
      ? optionBundle.data.choices.flatMap((choice) => choice.claims.map((claim) => claim.claimId))
      : [];
  const auditedUnitIds = audit.unitAudits.map((unit) => unit.unitId);
  if (
    new Set(auditedUnitIds).size !== auditedUnitIds.length ||
    [...expectedUnitIds].sort().join('|') !== [...auditedUnitIds].sort().join('|')
  ) {
    throw new Error('SourceAudit unitAudits가 감사 대상 claim ID를 정확히 한 번씩 덮지 않는다.');
  }
  const packetDocuments = new Map(packet.documents.map((document) => [
    document.documentId,
    document.text,
  ]));
  const packetMediaIds = new Set(packet.media.map((media) => media.mediaId));
  for (const [unitIndex, unit] of audit.unitAudits.entries()) {
    for (const [evidenceIndex, evidence] of unit.evidence.entries()) {
      if (evidence.documentId !== null) {
        const document = packetDocuments.get(evidence.documentId);
        if (document === undefined || evidence.quote === null || !document.includes(evidence.quote)) {
          throw new Error(
            `unitAudits.${unitIndex}.evidence.${evidenceIndex}의 텍스트 근거가 원자료에 없다.`,
          );
        }
      }
      if (evidence.mediaId !== null && !packetMediaIds.has(evidence.mediaId)) {
        throw new Error(
          `unitAudits.${unitIndex}.evidence.${evidenceIndex}의 mediaId가 원자료에 없다.`,
        );
      }
    }
  }
  return audit;
}

export interface FreezeSourceBundleOptions {
  readonly packet: SourcePacket;
  readonly generatedBundles: readonly [SourceBundle, ...SourceBundle[]];
  readonly audits: readonly [SourceArtifactAudit, ...SourceArtifactAudit[]];
  readonly frozenAt: string;
}

export function freezeSourceBundle(options: FreezeSourceBundleOptions): FrozenSourceBundle {
  const packet = SourcePacketSchema.parse(options.packet);
  const packetHash = canonicalSourcePacketHash(packet);
  const bundles = options.generatedBundles.map((bundle) => SourceBundleSchema.parse(bundle));
  const fingerprints = bundles.map(sourceBundleSemanticFingerprint);
  if (new Set(fingerprints).size !== 1) {
    throw new Error('Source Bundle 반복 생성 결과의 의미 fingerprint가 일치하지 않는다.');
  }
  const generationHashes = bundles.map(canonicalSourceBundleHash);
  for (const [index, bundle] of bundles.entries()) {
    const staticAudit = auditSourceBundleAgainstPacket(bundle, packet);
    if (!staticAudit.passed) {
      throw new Error(`Source Bundle ${index + 1} 정적 검사 실패: ${staticAudit.issues.join('; ')}`);
    }
  }
  const coveredGenerationHashes = new Set<string>();
  for (const auditValue of options.audits) {
    const matchingIndex = generationHashes.indexOf(auditValue.artifactHash);
    if (matchingIndex < 0) {
      throw new Error('Source Bundle 의미 감사가 생성 후보가 아닌 artifact를 참조한다.');
    }
    const audit = validateSourceArtifactAudit({
      audit: auditValue,
      artifact: bundles[matchingIndex],
      sourcePacket: packet,
    });
    if (audit.overallDecision !== 'PASS') {
      throw new Error(`Source Bundle ${matchingIndex + 1} 의미 감사 미통과: ${audit.overallDecision}`);
    }
    coveredGenerationHashes.add(generationHashes[matchingIndex]!);
  }
  if (generationHashes.some((hash) => !coveredGenerationHashes.has(hash))) {
    throw new Error('하나 이상의 Source Bundle 생성 후보에 의미 감사 결과가 없다.');
  }
  return FrozenSourceBundleSchema.parse({
    freezeVersion: 'problem-frozen-source-bundle-v1',
    frozenAt: options.frozenAt,
    sourcePacketHash: packetHash,
    sourceBundleHash: canonicalSourceBundleHash(bundles[0]),
    semanticFingerprint: fingerprints[0],
    acceptedGenerationHashes: generationHashes,
    acceptedAuditHashes: options.audits.map(sourceArtifactHash),
    bundle: bundles[0],
  });
}

export function freezeOptionClaimBundle(options: {
  readonly packet: SourcePacket;
  readonly generatedBundles: readonly [OptionClaimBundle, ...OptionClaimBundle[]];
  readonly audits: readonly [SourceArtifactAudit, ...SourceArtifactAudit[]];
  readonly frozenAt: string;
}): FrozenOptionClaimBundle {
  const packet = SourcePacketSchema.parse(options.packet);
  const bundles = options.generatedBundles.map((bundle) => OptionClaimBundleSchema.parse(bundle));
  const fingerprints = bundles.map(optionClaimSemanticFingerprint);
  if (new Set(fingerprints).size !== 1) {
    throw new Error('Option Claim 반복 생성 결과의 의미 fingerprint가 일치하지 않는다.');
  }
  const generationHashes = bundles.map(sourceArtifactHash);
  for (const [index, bundle] of bundles.entries()) {
    const staticAudit = auditOptionClaimBundleAgainstPacket(bundle, packet);
    if (!staticAudit.passed) {
      throw new Error(`Option Claim Bundle ${index + 1} 정적 검사 실패: ${staticAudit.issues.join('; ')}`);
    }
  }
  const coveredGenerationHashes = new Set<string>();
  for (const auditValue of options.audits) {
    const matchingIndex = generationHashes.indexOf(auditValue.artifactHash);
    if (matchingIndex < 0) {
      throw new Error('Option Claim 의미 감사가 생성 후보가 아닌 artifact를 참조한다.');
    }
    const audit = validateSourceArtifactAudit({
      audit: auditValue,
      artifact: bundles[matchingIndex],
      sourcePacket: packet,
    });
    if (audit.overallDecision !== 'PASS') {
      throw new Error(`Option Claim Bundle ${matchingIndex + 1} 의미 감사 미통과: ${audit.overallDecision}`);
    }
    coveredGenerationHashes.add(generationHashes[matchingIndex]!);
  }
  if (generationHashes.some((hash) => !coveredGenerationHashes.has(hash))) {
    throw new Error('하나 이상의 Option Claim 생성 후보에 의미 감사 결과가 없다.');
  }
  return FrozenOptionClaimBundleSchema.parse({
    freezeVersion: 'problem-frozen-option-claim-bundle-v1',
    frozenAt: options.frozenAt,
    sourcePacketHash: canonicalSourcePacketHash(packet),
    optionClaimBundleHash: sourceArtifactHash(bundles[0]),
    semanticFingerprint: fingerprints[0],
    acceptedGenerationHashes: generationHashes,
    acceptedAuditHashes: options.audits.map(sourceArtifactHash),
    bundle: bundles[0],
  });
}

export const LensMutationKindSchema = z.enum([
  'RATIO_DIRECTION_REVERSAL',
  'P4_AXIS_LOCATION_REVERSAL',
  'SQUARE_TO_LINEAR',
  'E_BETWEEN_TO_OUTSIDE',
  'CONDITION_DELETION',
]);
export type LensMutationKind = z.infer<typeof LensMutationKindSchema>;

/**
 * 정상 bundle의 복사본에 알려진 의미 오류 하나만 주입한다. 이 결과는 production 후보가
 * 아니며 SourceAudit의 거부 민감도를 재는 negative control로만 사용한다.
 */
export function applyLensMutation(
  bundleValue: unknown,
  mutation: LensMutationKind,
): SourceBundle {
  const bundle = structuredClone(SourceBundleSchema.parse(bundleValue));
  const claimAt = (index: number): SourceBundle['claims'][number] => {
    const claim = bundle.claims[index];
    if (claim === undefined) throw new Error(`존재하지 않는 claim index: ${index}`);
    return claim;
  };
  if (mutation === 'RATIO_DIRECTION_REVERSAL') {
    const index = bundle.claims.findIndex((claim) => (
      claim.relation.kind === 'RATIO' &&
      claim.relation.left.includes('P0') && claim.relation.right.includes('P2')
    ));
    if (index < 0) throw new Error('P0/P2 RATIO claim을 찾지 못했다.');
    const claim = claimAt(index);
    if (claim.relation.kind !== 'RATIO') throw new Error('도달 불가');
    bundle.claims[index] = {
      ...claim,
      normalizedClaim: 'distance(P2,optical_axis) = 0.5 × distance(P0,optical_axis)',
      relation: {
        kind: 'RATIO',
        left: claim.relation.right,
        operator: '=',
        coefficient: claim.relation.coefficient,
        right: claim.relation.left,
      },
    };
  } else if (mutation === 'P4_AXIS_LOCATION_REVERSAL') {
    const index = bundle.claims.findIndex((claim) => (
      claim.relation.kind === 'LOCATION' && claim.relation.entity === 'P4'
    ));
    if (index < 0) throw new Error('P4 LOCATION claim을 찾지 못했다.');
    const claim = claimAt(index);
    if (claim.relation.kind !== 'LOCATION') throw new Error('도달 불가');
    bundle.claims[index] = {
      ...claim,
      normalizedClaim: 'P4 is off optical_axis',
      relation: { ...claim.relation, relation: 'OFF' },
    };
  } else if (mutation === 'SQUARE_TO_LINEAR') {
    const index = bundle.claims.findIndex((claim) => (
      claim.relation.kind === 'PROPORTIONALITY' && claim.relation.exponent === 2
    ));
    if (index < 0) throw new Error('제곱 비례 claim을 찾지 못했다.');
    const claim = claimAt(index);
    if (claim.relation.kind !== 'PROPORTIONALITY') throw new Error('도달 불가');
    bundle.claims[index] = {
      ...claim,
      normalizedClaim: `${claim.relation.dependent} is linearly proportional to ${claim.relation.independent}`,
      relation: { ...claim.relation, exponent: 1 },
    };
  } else if (mutation === 'E_BETWEEN_TO_OUTSIDE') {
    const index = bundle.claims.findIndex((claim) => (
      claim.relation.kind === 'TOPOLOGY' && claim.relation.entity === 'E' &&
      claim.relation.relation === 'BETWEEN'
    ));
    if (index < 0) throw new Error('E BETWEEN claim을 찾지 못했다.');
    const claim = claimAt(index);
    if (claim.relation.kind !== 'TOPOLOGY') throw new Error('도달 불가');
    bundle.claims[index] = {
      ...claim,
      normalizedClaim: 'E is outside the interval from C to D',
      relation: {
        kind: 'LOCATION',
        entity: 'E',
        relation: 'OUTSIDE',
        reference: 'interval(C,D)',
      },
    };
  } else {
    const index = bundle.claims.findIndex((claim) => (
      claim.modality === 'CONDITIONAL' && claim.conditions.length > 0
    ));
    if (index < 0) throw new Error('조건부 claim을 찾지 못했다.');
    const claim = claimAt(index);
    bundle.claims[index] = {
      ...claim,
      modality: 'ASSERTED',
      conditions: [],
      normalizedClaim: claim.normalizedClaim.replace(/^if .+?,\s*/i, ''),
    };
  }
  return SourceBundleSchema.parse(bundle);
}
