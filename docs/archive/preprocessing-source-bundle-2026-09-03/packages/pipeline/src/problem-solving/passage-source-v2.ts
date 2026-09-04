import { z } from 'zod/v4';

import { SourcePacketSchema, sourceArtifactHash } from './source-bundle.js';
import {
  SourceBundleV2Schema,
  SourceClaimProposalV2Schema,
  EntityRegistryEntrySchema,
  SourceRelationProposalV2Schema,
  SourceAuditV2Schema,
  SourceUnitRegistrySchema,
  validateSourceBundleV2AgainstInputs,
  type SourceBundleV2,
  type SourceUnitRegistry,
} from './source-bundle-v2.js';

export const PASSAGE_SOURCE_BUNDLE_V2_VERSION = 'passage-text-source-bundle-v2' as const;
export const PASSAGE_UNIT_REPAIR_V2_VERSION = 'passage-source-unit-repair-v2' as const;

export const PassageModelClaimV2Schema = SourceClaimProposalV2Schema.omit({
  evidenceFragments: true,
});
export const PassageModelEntityV2Schema = EntityRegistryEntrySchema.omit({
  definitionFragment: true,
});
const PassageModelBundleV2Schema = SourceBundleV2Schema.extend({
  claims: z.array(PassageModelClaimV2Schema),
  entities: z.array(PassageModelEntityV2Schema),
});

export const PassageUnitCoverageV2Schema = z.object({
  sourceUnitId: z.string().regex(/^P[1-9][0-9]*-S[1-9][0-9]*$/),
  claimIds: z.array(z.string().min(1)),
  relationIds: z.array(z.string().min(1)),
  disposition: z.enum(['CLAIMS_EXTRACTED', 'NO_SOURCE_CLAIM']),
  mediaGroundingStatus: z.enum(['NOT_APPLICABLE', 'PENDING']),
  reason: z.string().min(1),
}).strict().superRefine((coverage, context) => {
  if (coverage.disposition === 'CLAIMS_EXTRACTED' && coverage.claimIds.length === 0) {
    context.addIssue({
      code: 'custom', path: ['claimIds'], message: 'CLAIMS_EXTRACTED unit은 claim을 가져야 한다.',
    });
  }
  if (coverage.disposition === 'NO_SOURCE_CLAIM' && (
    coverage.claimIds.length > 0 || coverage.relationIds.length > 0
  )) {
    context.addIssue({
      code: 'custom', path: ['disposition'],
      message: 'NO_SOURCE_CLAIM unit에는 claim이나 relation을 둘 수 없다.',
    });
  }
});
export type PassageUnitCoverageV2 = z.infer<typeof PassageUnitCoverageV2Schema>;

export const PassageSourceBundleV2Schema = z.object({
  passageBundleVersion: z.literal(PASSAGE_SOURCE_BUNDLE_V2_VERSION),
  sourceClaimPolicy: z.literal('EXPLICIT_OR_FAITHFUL_NORMALIZATION_ONLY'),
  derivedRelationsIncluded: z.literal(false),
  offsetOwnership: z.literal('CODE_ONLY'),
  mediaGroundingStatus: z.enum(['NOT_APPLICABLE', 'PENDING']),
  bundle: SourceBundleV2Schema,
  unitCoverage: z.array(PassageUnitCoverageV2Schema).min(1),
}).strict().superRefine((artifact, context) => {
  if (artifact.bundle.scope !== 'PASSAGE') {
    context.addIssue({ code: 'custom', path: ['bundle', 'scope'], message: 'PASSAGE scope만 허용한다.' });
  }
  if (artifact.bundle.itemDirectives.length > 0) {
    context.addIssue({
      code: 'custom', path: ['bundle', 'itemDirectives'],
      message: 'Passage Source Bundle에는 ITEM_DIRECTIVE가 없어야 한다.',
    });
  }
  if (artifact.bundle.visualCandidates.length > 0) {
    context.addIssue({
      code: 'custom', path: ['bundle', 'visualCandidates'],
      message: '텍스트 Passage v2에서 시각 후보를 생성하지 않는다.',
    });
  }
});
export type PassageSourceBundleV2 = z.infer<typeof PassageSourceBundleV2Schema>;

export const PassageSourceProposalV2Schema = PassageSourceBundleV2Schema.extend({
  bundle: PassageModelBundleV2Schema,
});
export type PassageSourceProposalV2 = z.infer<typeof PassageSourceProposalV2Schema>;

export function canonicalizePassageSourceProposalV2(options: {
  readonly proposal: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): PassageSourceBundleV2 {
  const proposal = PassageSourceProposalV2Schema.parse(options.proposal);
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const unitById = new Map(registry.units.map((unit) => [unit.sourceUnitId, unit]));
  const artifact = {
    ...proposal,
    bundle: {
      ...proposal.bundle,
      claims: proposal.bundle.claims.map((claim) => {
        const unit = unitById.get(claim.sourceUnitId);
        if (unit?.rawText === null || unit?.rawText === undefined) {
          throw new Error(`${claim.claimId}의 canonical evidence로 사용할 텍스트 Source Unit이 없다.`);
        }
        return { ...claim, evidenceFragments: [unit.rawText] };
      }),
      entities: proposal.bundle.entities.map((entity) => {
        if (entity.definitionSourceUnitId === null) {
          return { ...entity, definitionFragment: null };
        }
        const unit = unitById.get(entity.definitionSourceUnitId);
        if (unit?.rawText === null || unit?.rawText === undefined) {
          throw new Error(`${entity.entityId}의 canonical 정의 근거 Source Unit이 없다.`);
        }
        return { ...entity, definitionFragment: unit.rawText };
      }),
    },
  };
  return validatePassageSourceBundleV2AgainstInputs({
    artifact,
    sourcePacket: options.sourcePacket,
    registry,
  });
}

export const LegacyPassageReprojectionV2Schema = z.object({
  reprojectionVersion: z.literal('legacy-passage-output-to-code-evidence-v2'),
  rawOutputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  legacyFragmentDiagnostics: z.array(z.object({
    semanticRecordId: z.string().min(1),
    sourceUnitId: z.string().min(1),
    legacyFragment: z.string().nullable(),
    exactWithinSourceUnit: z.boolean(),
    disposition: z.literal('NON_AUTHORITATIVE_LEGACY_FIELD_DROPPED'),
  }).strict()),
  artifact: PassageSourceBundleV2Schema,
}).strict();
export type LegacyPassageReprojectionV2 = z.infer<typeof LegacyPassageReprojectionV2Schema>;

export function reprojectLegacyPassageOutputV2(options: {
  readonly rawOutput: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): LegacyPassageReprojectionV2 {
  const raw = structuredClone(options.rawOutput) as Record<string, unknown>;
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const unitById = new Map(registry.units.map((unit) => [unit.sourceUnitId, unit]));
  const bundle = raw['bundle'];
  if (typeof bundle !== 'object' || bundle === null) throw new Error('기존 Passage 출력에 bundle이 없다.');
  const bundleRecord = bundle as Record<string, unknown>;
  const claims = bundleRecord['claims'];
  const entities = bundleRecord['entities'];
  if (!Array.isArray(claims) || !Array.isArray(entities)) {
    throw new Error('기존 Passage 출력의 claims 또는 entities가 배열이 아니다.');
  }
  const diagnostics: z.infer<typeof LegacyPassageReprojectionV2Schema>['legacyFragmentDiagnostics'] = [];
  for (const claimValue of claims) {
    if (typeof claimValue !== 'object' || claimValue === null) continue;
    const claim = claimValue as Record<string, unknown>;
    const claimId = String(claim['claimId'] ?? 'UNKNOWN_CLAIM');
    const sourceUnitId = String(claim['sourceUnitId'] ?? 'UNKNOWN_UNIT');
    const unitText = unitById.get(sourceUnitId)?.rawText ?? null;
    const fragments = Array.isArray(claim['evidenceFragments'])
      ? claim['evidenceFragments'].map((fragment) => String(fragment))
      : [];
    for (const fragment of fragments.length > 0 ? fragments : [null]) {
      diagnostics.push({
        semanticRecordId: claimId,
        sourceUnitId,
        legacyFragment: fragment,
        exactWithinSourceUnit: fragment !== null && unitText !== null && unitText.includes(fragment),
        disposition: 'NON_AUTHORITATIVE_LEGACY_FIELD_DROPPED',
      });
    }
    delete claim['evidenceFragments'];
  }
  for (const entityValue of entities) {
    if (typeof entityValue !== 'object' || entityValue === null) continue;
    const entity = entityValue as Record<string, unknown>;
    const sourceUnitId = entity['definitionSourceUnitId'];
    const fragment = typeof entity['definitionFragment'] === 'string'
      ? entity['definitionFragment']
      : null;
    if (typeof sourceUnitId === 'string' || fragment !== null) {
      const unitText = typeof sourceUnitId === 'string'
        ? unitById.get(sourceUnitId)?.rawText ?? null
        : null;
      diagnostics.push({
        semanticRecordId: String(entity['entityId'] ?? 'UNKNOWN_ENTITY'),
        sourceUnitId: typeof sourceUnitId === 'string' ? sourceUnitId : 'NO_DEFINITION_UNIT',
        legacyFragment: fragment,
        exactWithinSourceUnit: fragment !== null && unitText !== null && unitText.includes(fragment),
        disposition: 'NON_AUTHORITATIVE_LEGACY_FIELD_DROPPED',
      });
    }
    delete entity['definitionFragment'];
  }
  const artifact = canonicalizePassageSourceProposalV2({
    proposal: raw,
    sourcePacket: options.sourcePacket,
    registry,
  });
  return LegacyPassageReprojectionV2Schema.parse({
    reprojectionVersion: 'legacy-passage-output-to-code-evidence-v2',
    rawOutputHash: sourceArtifactHash(options.rawOutput),
    artifactHash: sourceArtifactHash(artifact),
    legacyFragmentDiagnostics: diagnostics,
    artifact,
  });
}

function idsForUnit(bundle: SourceBundleV2, sourceUnitId: string): {
  readonly claimIds: string[];
  readonly relationIds: string[];
} {
  return {
    claimIds: bundle.claims.filter((claim) => claim.sourceUnitId === sourceUnitId)
      .map((claim) => claim.claimId),
    relationIds: bundle.relations.filter((relation) => relation.sourceUnitId === sourceUnitId)
      .map((relation) => relation.relationId),
  };
}

export function validatePassageSourceBundleV2AgainstInputs(options: {
  readonly artifact: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): PassageSourceBundleV2 {
  const artifact = PassageSourceBundleV2Schema.parse(options.artifact);
  const bundle = validateSourceBundleV2AgainstInputs({
    bundle: artifact.bundle,
    sourcePacket: options.sourcePacket,
    registry: options.registry,
  });
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  if (packet.scope !== 'PASSAGE') throw new Error('PASSAGE Source Packet만 허용한다.');
  const expectedUnits = registry.units.filter((unit) => (
    unit.unitRole === 'PASSAGE_CONTENT' && unit.claimExtractionPolicy === 'INCLUDE'
  ));
  const actualUnitIds = artifact.unitCoverage.map((coverage) => coverage.sourceUnitId);
  const expectedUnitIds = expectedUnits.map((unit) => unit.sourceUnitId);
  if (new Set(actualUnitIds).size !== actualUnitIds.length ||
    actualUnitIds.join('|') !== expectedUnitIds.join('|')) {
    throw new Error('모든 Passage Source Unit을 코드 순서대로 정확히 한 번 coverage에 기록해야 한다.');
  }
  const knownUnitIds = new Set(expectedUnitIds);
  const units = new Map(registry.units.map((unit) => [unit.sourceUnitId, unit]));
  for (const entity of bundle.entities) {
    if (['AUDITED_DEFINES', 'AUDITED_SAME_AS', 'HUMAN_APPROVAL'].includes(entity.mergeBasis)) {
      throw new Error(`${entity.entityId}가 생성 단계에서 감사·인간 승인을 사칭한다.`);
    }
    if (entity.mergeBasis === 'SINGLE_SURFACE_NO_MERGE' && entity.surfaceForms.length !== 1) {
      throw new Error(`${entity.entityId}는 병합 근거 없이 여러 surface form을 합칠 수 없다.`);
    }
    if (entity.mergeBasis === 'EXPLICIT_DEFINITION' && (
      entity.definitionSourceUnitId === null || entity.definitionFragment === null
    )) {
      throw new Error(`${entity.entityId}의 명시적 정의 근거가 비어 있다.`);
    }
    if (entity.definitionSourceUnitId !== null) {
      const unit = units.get(entity.definitionSourceUnitId);
      if (unit?.rawText === null || unit === undefined ||
        entity.definitionFragment !== unit.rawText) {
        throw new Error(`${entity.entityId}의 정의 근거는 코드가 붙인 Source Unit 전체 문장이어야 한다.`);
      }
    }
  }
  for (const claim of bundle.claims) {
    if (!knownUnitIds.has(claim.sourceUnitId)) {
      throw new Error(`${claim.claimId}가 Passage 텍스트 unit 밖의 claim이다.`);
    }
    const unit = units.get(claim.sourceUnitId);
    if (unit?.rawText === null || unit === undefined || claim.evidenceFragments.length !== 1 ||
      claim.evidenceFragments[0] !== unit.rawText) {
      throw new Error(`${claim.claimId}의 근거는 코드가 붙인 Source Unit 전체 문장이어야 한다.`);
    }
  }
  for (const relation of bundle.relations) {
    if (!knownUnitIds.has(relation.sourceUnitId)) {
      throw new Error(`${relation.relationId}가 Passage 텍스트 unit 밖의 relation이다.`);
    }
    const relationClaimIds = relation.relationFamily === 'RATIO' ||
      relation.relationFamily === 'PROPORTIONALITY'
      ? relation.claimIds
      : [...relation.fromClaimIds, ...relation.toClaimIds, ...relation.conditionClaimIds];
    if (!relationClaimIds.some((claimId) => (
      bundle.claims.some((claim) => claim.claimId === claimId && claim.sourceUnitId === relation.sourceUnitId)
    ))) {
      throw new Error(`${relation.relationId}은 자신의 sourceUnitId에 속한 claim을 하나 이상 참조해야 한다.`);
    }
  }
  for (const coverage of artifact.unitCoverage) {
    const expected = idsForUnit(bundle, coverage.sourceUnitId);
    if ([...coverage.claimIds].sort().join('|') !== expected.claimIds.sort().join('|')) {
      throw new Error(`${coverage.sourceUnitId} coverage의 claimIds가 실제 claim과 다르다.`);
    }
    if ([...coverage.relationIds].sort().join('|') !== expected.relationIds.sort().join('|')) {
      throw new Error(`${coverage.sourceUnitId} coverage의 relationIds가 실제 relation과 다르다.`);
    }
    if (coverage.mediaGroundingStatus === 'PENDING' && packet.media.length === 0) {
      throw new Error(`${coverage.sourceUnitId}은 연결할 passage media가 없는데 PENDING이다.`);
    }
  }
  const expectedMediaStatus = packet.media.length === 0 ? 'NOT_APPLICABLE' : 'PENDING';
  if (artifact.mediaGroundingStatus !== expectedMediaStatus) {
    throw new Error(`mediaGroundingStatus는 ${expectedMediaStatus}여야 한다.`);
  }
  if (bundle.mediaAssessment.hasMedia !== (packet.media.length > 0)) {
    throw new Error('Passage mediaAssessment가 원자료와 다르다.');
  }
  return { ...artifact, bundle };
}

export const PassageAuditChunkV2Schema = z.object({
  chunkId: z.string().regex(/^PASSAGE-[A-Z0-9_-]+-C[1-9][0-9]*$/),
  documentId: z.string().min(1),
  sourceUnitIds: z.array(z.string().regex(/^P[1-9][0-9]*-S[1-9][0-9]*$/)).min(1).max(10),
}).strict();
export type PassageAuditChunkV2 = z.infer<typeof PassageAuditChunkV2Schema>;

export function buildPassageAuditChunks(
  registry: SourceUnitRegistry,
  maximumUnitsPerChunk = 10,
): PassageAuditChunkV2[] {
  if (!Number.isInteger(maximumUnitsPerChunk) || maximumUnitsPerChunk < 1 || maximumUnitsPerChunk > 10) {
    throw new Error('Passage 감사 chunk는 1~10개 Source Unit이어야 한다.');
  }
  const textUnits = registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT');
  const documentIds = [...new Set(textUnits.map((unit) => unit.documentId))];
  const chunks: PassageAuditChunkV2[] = [];
  for (const documentId of documentIds) {
    if (documentId === null) throw new Error('Passage text unit에 documentId가 없다.');
    const units = textUnits.filter((unit) => unit.documentId === documentId);
    for (let offset = 0; offset < units.length; offset += maximumUnitsPerChunk) {
      const sourceUnitIds = units.slice(offset, offset + maximumUnitsPerChunk)
        .map((unit) => unit.sourceUnitId);
      chunks.push(PassageAuditChunkV2Schema.parse({
        chunkId: `PASSAGE-${documentId.replaceAll(/[^A-Za-z0-9_-]/gu, '_')}-C${
          Math.floor(offset / maximumUnitsPerChunk) + 1
        }`,
        documentId,
        sourceUnitIds,
      }));
    }
  }
  return chunks;
}

export function projectPassageBundleChunk(options: {
  readonly artifact: PassageSourceBundleV2;
  readonly chunk: PassageAuditChunkV2;
}): unknown {
  const unitIds = new Set(options.chunk.sourceUnitIds);
  const canonicalClaims = options.artifact.bundle.claims.filter((claim) => unitIds.has(claim.sourceUnitId));
  const claims = canonicalClaims.map(({ evidenceFragments: _evidenceFragments, ...claim }) => claim);
  const claimIds = new Set(claims.map((claim) => claim.claimId));
  const relations = options.artifact.bundle.relations.filter((relation) => unitIds.has(relation.sourceUnitId));
  const quantityIds = new Set(relations.flatMap((relation) => {
    if (relation.relationFamily === 'RATIO') {
      return [relation.leftQuantityId, relation.rightQuantityId];
    }
    if (relation.relationFamily === 'PROPORTIONALITY') {
      return [relation.independentQuantityId, relation.dependentQuantityId];
    }
    return [];
  }));
  const quantities = options.artifact.bundle.quantities.filter((quantity) => quantityIds.has(quantity.quantityId));
  const entityIds = new Set([
    ...options.artifact.bundle.entities
      .filter((entity) => entity.definitionSourceUnitId !== null && unitIds.has(entity.definitionSourceUnitId))
      .map((entity) => entity.entityId),
    ...quantities.flatMap((quantity) => [quantity.subjectEntityId, quantity.referenceEntityId]
      .filter((id): id is string => id !== null)),
    ...relations.flatMap((relation) => relation.relationFamily === 'RATIO' ||
      relation.relationFamily === 'PROPORTIONALITY'
      ? []
      : [...relation.fromEntityIds, ...relation.toEntityIds]),
  ]);
  return {
    artifactHash: sourceArtifactHash(options.artifact),
    passageBundleVersion: options.artifact.passageBundleVersion,
    sourceClaimPolicy: options.artifact.sourceClaimPolicy,
    derivedRelationsIncluded: options.artifact.derivedRelationsIncluded,
    sourceUnitIds: options.chunk.sourceUnitIds,
    claims,
    entities: options.artifact.bundle.entities.filter((entity) => entityIds.has(entity.entityId))
      .map(({ definitionFragment: _definitionFragment, ...entity }) => entity),
    quantities,
    relations,
    unitCoverage: options.artifact.unitCoverage.filter((coverage) => unitIds.has(coverage.sourceUnitId)),
    unresolved: options.artifact.bundle.unresolved.filter((entry) => unitIds.has(entry.sourceUnitId)),
    projectedClaimIds: [...claimIds],
  };
}

export const PassageUnitRepairV2Schema = z.object({
  repairVersion: z.literal(PASSAGE_UNIT_REPAIR_V2_VERSION),
  repairId: z.string().min(1),
  baseArtifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  targetSourceUnitId: z.string().regex(/^P[1-9][0-9]*-S[1-9][0-9]*$/),
  globalEntityRegistryUnchanged: z.literal(true),
  globalQuantityRegistryUnchanged: z.literal(true),
  replacementClaims: z.array(SourceClaimProposalV2Schema),
  replacementRelations: z.array(SourceRelationProposalV2Schema),
  replacementUnresolved: z.array(z.object({
    sourceUnitId: z.string().min(1),
    description: z.string().min(1),
    disposition: z.enum(['HUMAN_REVIEW', 'DO_NOT_ASSERT']),
  }).strict()),
  replacementCoverage: PassageUnitCoverageV2Schema,
}).strict();
export type PassageUnitRepairV2 = z.infer<typeof PassageUnitRepairV2Schema>;

export const PassageUnitRepairProposalV2Schema = PassageUnitRepairV2Schema.extend({
  replacementClaims: z.array(PassageModelClaimV2Schema),
});
export type PassageUnitRepairProposalV2 = z.infer<typeof PassageUnitRepairProposalV2Schema>;

export function canonicalizePassageUnitRepairProposalV2(options: {
  readonly proposal: unknown;
  readonly registry: unknown;
}): PassageUnitRepairV2 {
  const proposal = PassageUnitRepairProposalV2Schema.parse(options.proposal);
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const unit = registry.units.find((candidate) => (
    candidate.sourceUnitId === proposal.targetSourceUnitId
  ));
  if (unit?.rawText === null || unit?.rawText === undefined) {
    throw new Error('부분 수리 target의 canonical evidence 문장이 없다.');
  }
  return PassageUnitRepairV2Schema.parse({
    ...proposal,
    replacementClaims: proposal.replacementClaims.map((claim) => ({
      ...claim,
      evidenceFragments: [unit.rawText],
    })),
  });
}

export function applyPassageUnitRepairV2(options: {
  readonly baseArtifact: unknown;
  readonly repair: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): PassageSourceBundleV2 {
  const base = validatePassageSourceBundleV2AgainstInputs({
    artifact: options.baseArtifact,
    sourcePacket: options.sourcePacket,
    registry: options.registry,
  });
  const repair = PassageUnitRepairV2Schema.parse(options.repair);
  if (repair.baseArtifactHash !== sourceArtifactHash(base)) {
    throw new Error('부분 수리의 baseArtifactHash가 현재 Passage Bundle과 다르다.');
  }
  const target = repair.targetSourceUnitId;
  if (repair.replacementCoverage.sourceUnitId !== target ||
    repair.replacementClaims.some((claim) => claim.sourceUnitId !== target) ||
    repair.replacementRelations.some((relation) => relation.sourceUnitId !== target) ||
    repair.replacementUnresolved.some((entry) => entry.sourceUnitId !== target)) {
    throw new Error('부분 수리는 target Source Unit 밖의 내용을 변경할 수 없다.');
  }
  const next = structuredClone(base);
  next.bundle.claims = [
    ...next.bundle.claims.filter((claim) => claim.sourceUnitId !== target),
    ...repair.replacementClaims,
  ];
  next.bundle.relations = [
    ...next.bundle.relations.filter((relation) => relation.sourceUnitId !== target),
    ...repair.replacementRelations,
  ];
  next.bundle.unresolved = [
    ...next.bundle.unresolved.filter((entry) => entry.sourceUnitId !== target),
    ...repair.replacementUnresolved,
  ];
  const coverageIndex = next.unitCoverage.findIndex((coverage) => coverage.sourceUnitId === target);
  if (coverageIndex < 0) throw new Error('부분 수리 대상 unit이 coverage에 없다.');
  next.unitCoverage[coverageIndex] = repair.replacementCoverage;
  return validatePassageSourceBundleV2AgainstInputs({
    artifact: next,
    sourcePacket: options.sourcePacket,
    registry: options.registry,
  });
}

export const PassageBundleStateV2Schema = z.object({
  artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  textBundleStatus: z.enum([
    'DRAFT', 'AUDIT_PENDING', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED', 'PASS',
  ]),
  mediaGroundingStatus: z.enum(['NOT_APPLICABLE', 'PENDING', 'PASS']),
  artifactFrozen: z.boolean(),
  productionEligible: z.boolean(),
  reasons: z.array(z.string().min(1)),
}).strict().superRefine((state, context) => {
  if (state.productionEligible && (
    !state.artifactFrozen || state.textBundleStatus !== 'PASS' ||
    !['NOT_APPLICABLE', 'PASS'].includes(state.mediaGroundingStatus)
  )) {
    context.addIssue({
      code: 'custom', path: ['productionEligible'],
      message: '동결·텍스트 PASS·미디어 완료 전에는 productionEligible일 수 없다.',
    });
  }
});

export const PassageCanonicalEvidenceV2Schema = z.object({
  semanticRecordId: z.string().min(1),
  semanticRecordType: z.enum(['CLAIM', 'ENTITY_DEFINITION']),
  sourceUnitId: z.string().min(1),
  documentId: z.string().min(1),
  rawText: z.string().min(1),
  documentStart: z.number().int().nonnegative(),
  documentEnd: z.number().int().positive(),
  offsetBasis: z.literal('DOCUMENT_UTF16'),
  sourceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  ownership: z.literal('CODE_FIXED_FROM_SOURCE_UNIT_REGISTRY'),
}).strict();

export const PassageEvidenceResolutionReportV2Schema = z.object({
  artifactHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  evidenceOwnership: z.literal('CODE_ONLY'),
  canonicalEvidence: z.array(PassageCanonicalEvidenceV2Schema),
  allSourceUnitsResolved: z.boolean(),
  unresolvedSemanticRecordIds: z.array(z.string().min(1)),
}).strict();
export type PassageEvidenceResolutionReportV2 = z.infer<
  typeof PassageEvidenceResolutionReportV2Schema
>;

export function buildPassageEvidenceResolutionReportV2(options: {
  readonly artifact: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): PassageEvidenceResolutionReportV2 {
  const artifact = validatePassageSourceBundleV2AgainstInputs(options);
  const sourcePacket = SourcePacketSchema.parse(options.sourcePacket);
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const unitById = new Map(registry.units.map((unit) => [unit.sourceUnitId, unit]));
  const unresolvedSemanticRecordIds: string[] = [];
  const canonicalFor = (
    semanticRecordId: string,
    semanticRecordType: 'CLAIM' | 'ENTITY_DEFINITION',
    sourceUnitId: string,
  ) => {
    const unit = unitById.get(sourceUnitId);
    if (unit?.documentId === null || unit?.documentId === undefined || unit.rawText === null ||
      unit.documentStart === null || unit.documentEnd === null) {
      unresolvedSemanticRecordIds.push(semanticRecordId);
      return null;
    }
    return PassageCanonicalEvidenceV2Schema.parse({
      semanticRecordId,
      semanticRecordType,
      sourceUnitId,
      documentId: unit.documentId,
      rawText: unit.rawText,
      documentStart: unit.documentStart,
      documentEnd: unit.documentEnd,
      offsetBasis: unit.offsetBasis,
      sourceHash: unit.sourceHash,
      ownership: 'CODE_FIXED_FROM_SOURCE_UNIT_REGISTRY',
    });
  };
  const claimEvidence = artifact.bundle.claims.map((claim) => (
    canonicalFor(claim.claimId, 'CLAIM', claim.sourceUnitId)
  ));
  const entityEvidence = artifact.bundle.entities.filter((entity) => (
    entity.definitionSourceUnitId !== null
  )).map((entity) => canonicalFor(
    entity.entityId,
    'ENTITY_DEFINITION',
    entity.definitionSourceUnitId!,
  ));
  const canonicalEvidence = [...claimEvidence, ...entityEvidence].filter(
    (entry): entry is z.infer<typeof PassageCanonicalEvidenceV2Schema> => entry !== null,
  );
  return PassageEvidenceResolutionReportV2Schema.parse({
    artifactHash: sourceArtifactHash(artifact),
    evidenceOwnership: 'CODE_ONLY',
    canonicalEvidence,
    allSourceUnitsResolved: unresolvedSemanticRecordIds.length === 0,
    unresolvedSemanticRecordIds,
  });
}

export const PassageCandidateUnitComparisonV2Schema = z.object({
  sourceUnitId: z.string().regex(/^P[1-9][0-9]*-S[1-9][0-9]*$/),
  candidateArtifactHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(2),
  claimSetHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(2),
  relationCoreHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(2),
  classification: z.enum([
    'EXACT_AGREEMENT', 'STRUCTURAL_VARIANT', 'MEANING_CONFLICT', 'UNRESOLVED',
  ]),
  requiresHighAudit: z.boolean(),
  reason: z.string().min(1),
}).strict();
export type PassageCandidateUnitComparisonV2 = z.infer<
  typeof PassageCandidateUnitComparisonV2Schema
>;

function quantitySemanticKey(bundle: SourceBundleV2, quantityId: string): unknown {
  const quantity = bundle.quantities.find((entry) => entry.quantityId === quantityId);
  if (quantity === undefined) return { missingQuantityId: quantityId };
  const subject = bundle.entities.find((entity) => entity.entityId === quantity.subjectEntityId);
  const reference = quantity.referenceEntityId === null
    ? null
    : bundle.entities.find((entity) => entity.entityId === quantity.referenceEntityId);
  return {
    quantityKind: quantity.quantityKind,
    subject: subject?.canonicalLabel ?? quantity.subjectEntityId,
    reference: reference?.canonicalLabel ?? quantity.referenceEntityId,
    qualifiers: [...quantity.qualifiers].sort(),
  };
}

function relationSemanticCore(bundle: SourceBundleV2, sourceUnitId: string): unknown[] {
  const claimById = new Map(bundle.claims.map((claim) => [claim.claimId, claim]));
  const claimCore = (claimId: string) => {
    const claim = claimById.get(claimId);
    return claim === undefined ? { missingClaimId: claimId } : {
      polarity: claim.polarity,
      modality: claim.modality,
      qualifierCount: claim.qualifiers.length,
    };
  };
  return bundle.relations.filter((relation) => relation.sourceUnitId === sourceUnitId)
    .map((relation) => {
      if (relation.relationFamily === 'RATIO') {
        return {
          relationFamily: relation.relationFamily,
          left: quantitySemanticKey(bundle, relation.leftQuantityId),
          operator: relation.operator,
          coefficient: relation.coefficient,
          right: quantitySemanticKey(bundle, relation.rightQuantityId),
          claimCores: relation.claimIds.map(claimCore),
        };
      }
      if (relation.relationFamily === 'PROPORTIONALITY') {
        return {
          relationFamily: relation.relationFamily,
          independent: quantitySemanticKey(bundle, relation.independentQuantityId),
          dependent: quantitySemanticKey(bundle, relation.dependentQuantityId),
          exponent: relation.exponent,
          polarity: relation.polarity,
          claimCores: relation.claimIds.map(claimCore),
        };
      }
      const entityLabel = (entityId: string) => bundle.entities.find(
        (entity) => entity.entityId === entityId,
      )?.canonicalLabel ?? entityId;
      return {
        relationFamily: relation.relationFamily,
        fromClaims: relation.fromClaimIds.map(claimCore),
        toClaims: relation.toClaimIds.map(claimCore),
        conditionClaims: relation.conditionClaimIds.map(claimCore),
        fromEntities: relation.fromEntityIds.map(entityLabel),
        toEntities: relation.toEntityIds.map(entityLabel),
        operator: relation.operator,
      };
    });
}

function quantityEndpointKey(bundle: SourceBundleV2, quantityId: string): string | null {
  const quantity = bundle.quantities.find((entry) => entry.quantityId === quantityId);
  if (quantity === undefined) return null;
  return `${quantity.subjectEntityId}|${quantity.referenceEntityId ?? 'NULL'}`;
}

function hasDirectCriticalRelationConflict(
  artifacts: readonly PassageSourceBundleV2[],
  sourceUnitId: string,
): boolean {
  const relations = artifacts.map((artifact) => artifact.bundle.relations
    .filter((relation) => relation.sourceUnitId === sourceUnitId));
  if (relations.some((entries) => entries.length !== relations[0]?.length)) return false;
  for (let index = 0; index < (relations[0]?.length ?? 0); index++) {
    const entries = relations.map((items) => items[index]!);
    if (new Set(entries.map((entry) => entry.relationFamily)).size !== 1) return false;
    const first = entries[0]!;
    if (first.relationFamily === 'RATIO' && entries.every((entry) => entry.relationFamily === 'RATIO')) {
      const endpoints = entries.map((entry, artifactIndex) => ({
        left: quantityEndpointKey(artifacts[artifactIndex]!.bundle, entry.leftQuantityId),
        right: quantityEndpointKey(artifacts[artifactIndex]!.bundle, entry.rightQuantityId),
      }));
      if (new Set(endpoints.map(sourceArtifactHash)).size === 1 &&
        new Set(entries.map((entry) => `${entry.operator}|${entry.coefficient}`)).size > 1) return true;
    } else if (first.relationFamily === 'PROPORTIONALITY' && entries.every(
      (entry) => entry.relationFamily === 'PROPORTIONALITY'
    )) {
      const endpoints = entries.map((entry, artifactIndex) => ({
        independent: quantityEndpointKey(
          artifacts[artifactIndex]!.bundle,
          entry.independentQuantityId,
        ),
        dependent: quantityEndpointKey(
          artifacts[artifactIndex]!.bundle,
          entry.dependentQuantityId,
        ),
      }));
      if (new Set(endpoints.map(sourceArtifactHash)).size === 1 &&
        new Set(entries.map((entry) => `${entry.exponent}|${entry.polarity}`)).size > 1) return true;
    } else if (entries.every((entry) => (
      entry.relationFamily !== 'RATIO' && entry.relationFamily !== 'PROPORTIONALITY'
    ))) {
      const topology = entries.map((entry) => sourceArtifactHash({
        family: entry.relationFamily,
        fromEntityIds: entry.fromEntityIds,
        toEntityIds: entry.toEntityIds,
      }));
      if (new Set(topology).size === 1 && new Set(entries.map((entry) => entry.operator)).size > 1) {
        return true;
      }
    }
  }
  return false;
}

export function comparePassageCandidatesByUnitV2(options: {
  readonly artifacts: readonly PassageSourceBundleV2[];
  readonly registry: SourceUnitRegistry;
}): PassageCandidateUnitComparisonV2[] {
  if (options.artifacts.length < 2) throw new Error('Passage 후보 비교에는 2개 이상이 필요하다.');
  const artifactHashes = options.artifacts.map(sourceArtifactHash);
  return options.registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT').map((unit) => {
    const claimSets = options.artifacts.map((artifact) => artifact.bundle.claims
      .filter((claim) => claim.sourceUnitId === unit.sourceUnitId)
      .map((claim) => ({
        normalizedClaim: claim.normalizedClaim,
        polarity: claim.polarity,
        modality: claim.modality,
        qualifiers: [...claim.qualifiers].sort(),
      })));
    const relationCores = options.artifacts.map((artifact) => (
      relationSemanticCore(artifact.bundle, unit.sourceUnitId)
    ));
    const claimSetHashes = claimSets.map(sourceArtifactHash);
    const relationCoreHashes = relationCores.map(sourceArtifactHash);
    const relationAgreement = new Set(relationCoreHashes).size === 1;
    const claimAgreement = new Set(claimSetHashes).size === 1;
    const allEmpty = claimSets.every((claims) => claims.length === 0) &&
      relationCores.every((relations) => relations.length === 0);
    const claimPresenceConflict = claimSets.some((claims) => claims.length === 0) &&
      claimSets.some((claims) => claims.length > 0);
    const relationPresenceConflict = relationCores.some((relations) => relations.length === 0) &&
      relationCores.some((relations) => relations.length > 0);
    const directCriticalConflict = hasDirectCriticalRelationConflict(
      options.artifacts,
      unit.sourceUnitId,
    );
    const classification = allEmpty
      ? 'UNRESOLVED'
      : relationAgreement && claimAgreement
        ? 'EXACT_AGREEMENT'
        : relationAgreement
          ? 'STRUCTURAL_VARIANT'
          : claimPresenceConflict || relationPresenceConflict || !directCriticalConflict
            ? 'UNRESOLVED'
            : 'MEANING_CONFLICT';
    return PassageCandidateUnitComparisonV2Schema.parse({
      sourceUnitId: unit.sourceUnitId,
      candidateArtifactHashes: artifactHashes,
      claimSetHashes,
      relationCoreHashes,
      classification,
      requiresHighAudit: classification === 'MEANING_CONFLICT' || classification === 'UNRESOLVED',
      reason: classification === 'EXACT_AGREEMENT'
        ? 'claim 핵심값과 구조화 relation이 일치한다.'
        : classification === 'STRUCTURAL_VARIANT'
          ? '구조화 relation은 일치하지만 claim 표현 또는 분할이 다르다.'
          : classification === 'MEANING_CONFLICT'
            ? '구조화 relation의 의미 핵심값이 다르다.'
            : '후보 중 claim 또는 relation이 비어 있어 코드만으로 합의할 수 없다.',
    });
  });
}

export function evaluatePassageBundleStateV2(options: {
  readonly artifact: PassageSourceBundleV2;
  readonly registry: SourceUnitRegistry;
  readonly evidenceResolutionReport: PassageEvidenceResolutionReportV2;
  readonly mediumAudits: readonly unknown[];
  readonly highAudits: readonly unknown[];
  readonly highRiskSourceUnitIds: readonly string[];
  readonly artifactFrozen: boolean;
}): z.infer<typeof PassageBundleStateV2Schema> {
  const evidenceReport = PassageEvidenceResolutionReportV2Schema.parse(
    options.evidenceResolutionReport,
  );
  if (evidenceReport.artifactHash !== sourceArtifactHash(options.artifact)) {
    throw new Error('근거 위치 보고서가 평가 대상 Passage artifact와 다르다.');
  }
  const mediumAudits = options.mediumAudits.map((audit) => SourceAuditV2Schema.parse(audit));
  const highAudits = options.highAudits.map((audit) => SourceAuditV2Schema.parse(audit));
  const expectedUnitIds = options.registry.units.filter((unit) => unit.unitRole === 'PASSAGE_CONTENT')
    .map((unit) => unit.sourceUnitId);
  const flatten = (audits: typeof mediumAudits) => audits.flatMap((audit) => audit.unitAudits);
  const mediumUnits = flatten(mediumAudits);
  const highUnits = flatten(highAudits);
  const mediumIds = mediumUnits.map((unit) => unit.sourceUnitId);
  if (new Set(mediumIds).size !== mediumIds.length ||
    [...mediumIds].sort().join('|') !== [...expectedUnitIds].sort().join('|')) {
    throw new Error('Medium Passage 감사가 모든 Source Unit을 정확히 한 번 덮지 않는다.');
  }
  const highRiskIds = [...new Set(options.highRiskSourceUnitIds)];
  const highIds = highUnits.map((unit) => unit.sourceUnitId);
  if (highRiskIds.some((id) => highIds.filter((candidate) => candidate === id).length !== 1)) {
    throw new Error('고위험 Source Unit은 High 감사에서 정확히 한 번 검토돼야 한다.');
  }
  const mediumById = new Map(mediumUnits.map((unit) => [unit.sourceUnitId, unit]));
  const highById = new Map(highUnits.map((unit) => [unit.sourceUnitId, unit]));
  const disagreements = highRiskIds.filter((id) => (
    mediumById.get(id)?.decision !== highById.get(id)?.decision
  ));
  const allUnits = [...mediumUnits, ...highUnits];
  let textBundleStatus: z.infer<typeof PassageBundleStateV2Schema>['textBundleStatus'] = 'PASS';
  if (allUnits.some((unit) => unit.decision === 'BLOCKING')) textBundleStatus = 'BLOCKING';
  else if (allUnits.some((unit) => unit.decision === 'REPAIR_REQUIRED')) textBundleStatus = 'REPAIR_REQUIRED';
  else if (allUnits.some((unit) => unit.decision === 'UNRESOLVED') || disagreements.length > 0) {
    textBundleStatus = 'UNRESOLVED';
  } else if (allUnits.some((unit) => (
    unit.decision === 'WARNING' && (
      unit.downstreamImpact !== 'NONE' || unit.omittedMeaningDetected || unit.unsupportedMeaningDetected
    )
  ))) {
    textBundleStatus = 'UNRESOLVED';
  }
  const mediaGroundingStatus = options.artifact.mediaGroundingStatus;
  const reasons: string[] = [];
  if (!options.artifactFrozen) reasons.push('Passage artifact가 불변 snapshot으로 동결되지 않았다.');
  if (!evidenceReport.allSourceUnitsResolved) {
    reasons.push(`Source Unit에 연결되지 않은 의미 레코드: ${
      evidenceReport.unresolvedSemanticRecordIds.join(', ')
    }`);
  }
  if (textBundleStatus !== 'PASS') reasons.push(`텍스트 Bundle 상태가 ${textBundleStatus}다.`);
  if (mediaGroundingStatus === 'PENDING') reasons.push('필요한 passage media grounding이 남아 있다.');
  if (disagreements.length > 0) {
    reasons.push(`Medium/High 판정 불일치: ${disagreements.join(', ')}`);
  }
  return PassageBundleStateV2Schema.parse({
    artifactHash: sourceArtifactHash(options.artifact),
    textBundleStatus,
    mediaGroundingStatus,
    artifactFrozen: options.artifactFrozen,
    productionEligible: reasons.length === 0,
    reasons,
  });
}
