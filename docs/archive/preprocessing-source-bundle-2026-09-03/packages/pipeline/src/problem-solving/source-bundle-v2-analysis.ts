import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import { sourceArtifactHash, type SourcePacket } from './source-bundle.js';
import {
  EntityRegistryEntrySchema,
  EvidenceResolutionStatusSchema,
  SemanticSignatureSchema,
  SourceUnitRegistrySchema,
  resolveEvidenceFragment,
  type EntityRegistryEntry,
  type SemanticSignature,
  type SourceUnitRegistry,
} from './source-bundle-v2.js';

const LegacyEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  documentId: z.string().nullable(),
  quote: z.string().nullable(),
  mediaId: z.string().nullable(),
}).passthrough();

const LegacyClaimSchema = z.object({
  claimId: z.string().min(1),
  normalizedClaim: z.string().min(1),
  claimType: z.string().min(1),
  modality: z.enum(['ASSERTED', 'CONDITIONAL', 'POSSIBLE', 'TYPICAL']),
  relation: z.object({ kind: z.string().min(1) }).passthrough(),
  conditions: z.array(z.string()),
  evidence: z.array(LegacyEvidenceSchema).min(1),
  riskFlags: z.array(z.string()),
}).passthrough();

export const LegacyRawSourceBundleSchema = z.object({
  bundleVersion: z.string().min(1),
  bundleId: z.string().min(1),
  claims: z.array(LegacyClaimSchema),
}).passthrough();
export type LegacyRawSourceBundle = z.infer<typeof LegacyRawSourceBundleSchema>;

export const LegacyClaimRemapSchema = z.object({
  run: z.number().int().positive(),
  rawBundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  claimId: z.string().min(1),
  normalizedClaim: z.string().min(1),
  mappedSourceUnitId: z.string().min(1).nullable(),
  evidenceResolutions: z.array(z.object({
    evidenceId: z.string().min(1),
    rawDocumentId: z.string().nullable(),
    rawQuote: z.string().nullable(),
    status: EvidenceResolutionStatusSchema,
    sourceUnitIds: z.array(z.string()),
    resolvedDocumentStart: z.number().int().nonnegative().nullable(),
    resolvedDocumentEnd: z.number().int().nonnegative().nullable(),
    reason: z.string().min(1),
  }).strict()),
  mappingStatus: z.enum(['EXACT', 'AMBIGUOUS', 'NON_EXACT', 'UNMAPPED', 'CROSS_UNIT']),
  rawRelation: z.record(z.string(), z.unknown()),
  rawModality: z.string().min(1),
  rawRiskFlags: z.array(z.string()),
}).strict();
export type LegacyClaimRemap = z.infer<typeof LegacyClaimRemapSchema>;

function mappingStatus(resolutions: LegacyClaimRemap['evidenceResolutions']): {
  readonly status: LegacyClaimRemap['mappingStatus'];
  readonly sourceUnitId: string | null;
} {
  if (resolutions.some((resolution) => resolution.status === 'NON_EXACT')) {
    return { status: 'NON_EXACT', sourceUnitId: null };
  }
  if (resolutions.some((resolution) => resolution.status === 'UNMAPPED')) {
    return { status: 'UNMAPPED', sourceUnitId: null };
  }
  if (resolutions.some((resolution) => resolution.status === 'EXACT_AMBIGUOUS')) {
    return { status: 'AMBIGUOUS', sourceUnitId: null };
  }
  const ids = [...new Set(resolutions.flatMap((resolution) => resolution.sourceUnitIds))];
  if (ids.length !== 1) return { status: 'CROSS_UNIT', sourceUnitId: null };
  return { status: 'EXACT', sourceUnitId: ids[0]! };
}

export function remapLegacyRawBundle(options: {
  readonly run: number;
  readonly rawBundle: unknown;
  readonly rawBundleText: string;
  readonly registry: SourceUnitRegistry;
  readonly sourcePacket: SourcePacket;
}): LegacyClaimRemap[] {
  const rawBundle = LegacyRawSourceBundleSchema.parse(options.rawBundle);
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const rawBundleHash = `sha256:${createHash('sha256').update(options.rawBundleText).digest('hex')}`;
  return rawBundle.claims.map((claim) => {
    const evidenceResolutions = claim.evidence.map((evidence) => resolveEvidenceFragment({
      evidenceId: evidence.evidenceId,
      documentId: evidence.documentId,
      quote: evidence.quote,
      registry,
      sourcePacket: options.sourcePacket,
    }));
    const mapping = mappingStatus(evidenceResolutions);
    return LegacyClaimRemapSchema.parse({
      run: options.run,
      rawBundleHash,
      claimId: claim.claimId,
      normalizedClaim: claim.normalizedClaim,
      mappedSourceUnitId: mapping.sourceUnitId,
      evidenceResolutions,
      mappingStatus: mapping.status,
      rawRelation: claim.relation,
      rawModality: claim.modality,
      rawRiskFlags: claim.riskFlags,
    });
  });
}

function requireDefinitionUnit(
  registry: SourceUnitRegistry,
  fragment: string,
): string {
  const matches = registry.units.filter((unit) => unit.rawText?.includes(fragment));
  if (matches.length !== 1) throw new Error(`정의 fragment의 Source Unit을 하나로 찾지 못했다: ${fragment}`);
  return matches[0]!.sourceUnitId;
}

export function buildLensEntityRegistry(registryValue: unknown): EntityRegistryEntry[] {
  const registry = SourceUnitRegistrySchema.parse(registryValue);
  const entries: EntityRegistryEntry[] = [
    {
      entityId: 'E_ASTIGMATIC_GAP',
      canonicalLabel: '비점 격차',
      surfaceForms: ['비점 격차', '자오 상점과 구결 상점 사이의 거리'],
      definitionSourceUnitId: requireDefinitionUnit(registry, '자오 상점과 구결 상점 사이의 거리인 비점 격차'),
      definitionFragment: '자오 상점과 구결 상점 사이의 거리인 비점 격차',
      mergeBasis: 'EXPLICIT_DEFINITION',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    },
    {
      entityId: 'E_OFF_AXIS_DISTANCE',
      canonicalLabel: '물체점에서 광축까지의 거리',
      surfaceForms: [
        '물체점에서 광축까지의 거리',
        '물체점에서 광축까지 수직으로 그은 선의 길이',
      ],
      definitionSourceUnitId: requireDefinitionUnit(registry, '즉 물체점에서 광축까지 수직으로 그은 선의 길이'),
      definitionFragment: '물체점에서 광축까지의 거리의 제곱, 즉 물체점에서 광축까지 수직으로 그은 선의 길이의 제곱',
      mergeBasis: 'EXPLICIT_IDENTITY',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    },
    {
      entityId: 'E_MERIDIONAL_IMAGE_POINT',
      canonicalLabel: '자오 상점',
      surfaceForms: ['자오 상점', '자오 광선이 수렴하는 점'],
      definitionSourceUnitId: requireDefinitionUnit(registry, '자오 광선이 수렴하는 점을 자오 상점'),
      definitionFragment: '자오 광선이 수렴하는 점을 자오 상점',
      mergeBasis: 'EXPLICIT_DEFINITION',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    },
    {
      entityId: 'E_SAGITTAL_IMAGE_POINT',
      canonicalLabel: '구결 상점',
      surfaceForms: ['구결 상점', '구결 광선이 수렴하는 점'],
      definitionSourceUnitId: requireDefinitionUnit(registry, '구결 광선이 수렴하는 점을 구결 상점'),
      definitionFragment: '구결 광선이 수렴하는 점을 구결 상점',
      mergeBasis: 'EXPLICIT_DEFINITION',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    },
    {
      entityId: 'E_OPTICAL_AXIS',
      canonicalLabel: '광축',
      surfaceForms: ['광축'],
      definitionSourceUnitId: requireDefinitionUnit(registry, '광축은 렌즈의 중심을 지나면서'),
      definitionFragment: '광축은 렌즈의 중심을 지나면서 렌즈 면에 수직인 가상의 직선이다',
      mergeBasis: 'EXPLICIT_DEFINITION',
      status: 'EVIDENCE_GROUNDED_CANDIDATE',
    },
  ];
  return entries.map((entry) => EntityRegistryEntrySchema.parse(entry));
}

function canonicalEntity(value: string, entities: readonly EntityRegistryEntry[]): string {
  const matching = entities.flatMap((entity) => entity.surfaceForms
    .filter((surface) => value.includes(surface))
    .map((surface) => ({ entityId: entity.entityId, surfaceLength: surface.length })));
  matching.sort((left, right) => right.surfaceLength - left.surfaceLength);
  if (
    matching.length > 0 &&
    (matching.length === 1 || matching[0]!.surfaceLength > matching[1]!.surfaceLength ||
      matching.every((entry) => entry.entityId === matching[0]!.entityId))
  ) {
    return matching[0]!.entityId;
  }
  return `TEXT:${value.replaceAll(/\s+/g, ' ').trim()}`;
}

function evidenceStatus(remap: LegacyClaimRemap): z.infer<typeof EvidenceResolutionStatusSchema> {
  if (remap.mappingStatus === 'EXACT') return 'EXACT_UNIQUE';
  if (remap.mappingStatus === 'AMBIGUOUS') return 'EXACT_AMBIGUOUS';
  if (remap.mappingStatus === 'NON_EXACT') return 'NON_EXACT';
  return 'UNMAPPED';
}

export function semanticSignatureFromLegacyClaim(options: {
  readonly remap: LegacyClaimRemap;
  readonly entities: readonly EntityRegistryEntry[];
}): SemanticSignature | null {
  const remap = LegacyClaimRemapSchema.parse(options.remap);
  if (remap.mappedSourceUnitId === null) return null;
  const relation = remap.rawRelation;
  const kind = typeof relation['kind'] === 'string' ? relation['kind'] : 'ATTRIBUTE';
  let from = '';
  let to = '';
  if (kind === 'PROPORTIONALITY') {
    from = String(relation['independent'] ?? '');
    to = String(relation['dependent'] ?? '');
  } else if (kind === 'RATIO' || kind === 'COMPARISON' || kind === 'IDENTITY') {
    from = String(relation['right'] ?? '');
    to = String(relation['left'] ?? '');
  } else if (kind === 'CAUSAL') {
    from = String(relation['cause'] ?? '');
    to = String(relation['effect'] ?? '');
  } else if (kind === 'CONDITIONAL') {
    from = String(relation['condition'] ?? '');
    to = String(relation['consequence'] ?? '');
  } else if (kind === 'LOCATION' || kind === 'TOPOLOGY') {
    from = String(relation['entity'] ?? '');
    to = String(relation['reference'] ?? relation['references'] ?? '');
  }
  const direction = from.length > 0 || to.length > 0
    ? [canonicalEntity(from, options.entities), canonicalEntity(to, options.entities)] as const
    : null;
  const entityIds = direction === null ? [] : [...new Set(direction.filter((value) => value.length > 0))];
  return SemanticSignatureSchema.parse({
    sourceUnitId: remap.mappedSourceUnitId,
    entities: entityIds,
    relationFamily: kind === 'NONE' ? 'ATTRIBUTE' : kind,
    direction,
    operator: typeof relation['operator'] === 'string' ? relation['operator'] : null,
    coefficient: typeof relation['coefficient'] === 'number' ? relation['coefficient'] : null,
    exponent: typeof relation['exponent'] === 'number' ? relation['exponent'] : null,
    polarity: remap.rawRiskFlags.includes('NEGATION') ? 'NEGATIVE' : 'POSITIVE',
    modality: remap.rawModality,
    qualifiers: remap.rawRiskFlags.filter((flag) => flag !== 'NONE').sort(),
    evidenceStatus: evidenceStatus(remap),
  });
}

function signatureCore(signature: SemanticSignature): unknown {
  return {
    entities: signature.entities,
    relationFamily: signature.relationFamily,
    direction: signature.direction,
    operator: signature.operator,
    coefficient: signature.coefficient,
    exponent: signature.exponent,
    polarity: signature.polarity,
    modality: signature.modality,
    qualifiers: signature.qualifiers,
  };
}

function signatureSetHash(signatures: readonly SemanticSignature[]): string {
  return sourceArtifactHash(signatures.map(signatureCore)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en')));
}

export function compareLegacyRunsBySourceUnit(options: {
  readonly registry: SourceUnitRegistry;
  readonly remaps: readonly LegacyClaimRemap[];
  readonly entities: readonly EntityRegistryEntry[];
}): Array<{
  readonly sourceUnitId: string;
  readonly classification: 'SEMANTIC_AGREEMENT' | 'STRUCTURAL_VARIANT' | 'MEANING_CONFLICT' | 'UNRESOLVED';
  readonly runs: Array<{
    readonly run: number;
    readonly claimIds: string[];
    readonly mappingIssues: string[];
    readonly semanticSignatures: SemanticSignature[];
    readonly signatureSetHash: string | null;
  }>;
}> {
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const runIds = [...new Set(options.remaps.map((remap) => remap.run))].sort((a, b) => a - b);
  return registry.units.filter((unit) => unit.rawText !== null).map((unit) => {
    const runs = runIds.map((run) => {
      const exact = options.remaps.filter((remap) => (
        remap.run === run && remap.mappedSourceUnitId === unit.sourceUnitId
      ));
      const mappingIssues = options.remaps.filter((remap) => (
        remap.run === run && remap.mappingStatus !== 'EXACT' &&
        remap.evidenceResolutions.some((resolution) => (
          resolution.rawDocumentId === unit.documentId && unit.rawText?.includes(resolution.rawQuote ?? '')
        ))
      )).map((remap) => `${remap.claimId}:${remap.mappingStatus}`);
      const semanticSignatures = exact.flatMap((remap) => {
        const signature = semanticSignatureFromLegacyClaim({ remap, entities: options.entities });
        return signature === null ? [] : [signature];
      });
      return {
        run,
        claimIds: exact.map((remap) => remap.claimId),
        mappingIssues,
        semanticSignatures,
        signatureSetHash: semanticSignatures.length === 0 ? null : signatureSetHash(semanticSignatures),
      };
    });
    const hashes = runs.map((run) => run.signatureSetHash);
    let classification: 'SEMANTIC_AGREEMENT' | 'STRUCTURAL_VARIANT' | 'MEANING_CONFLICT' | 'UNRESOLVED';
    if (runs.some((run) => run.mappingIssues.length > 0 || run.signatureSetHash === null)) {
      classification = 'UNRESOLVED';
    } else if (new Set(hashes).size === 1) {
      classification = 'SEMANTIC_AGREEMENT';
    } else {
      const highRiskByRun = runs.map((run) => run.semanticSignatures.filter((signature) => (
        signature.relationFamily !== 'ATTRIBUTE' || signature.polarity === 'NEGATIVE' ||
        signature.modality !== 'ASSERTED'
      )));
      const highRiskHashes = highRiskByRun.map(signatureSetHash);
      classification = new Set(highRiskHashes).size === 1 ? 'STRUCTURAL_VARIANT' : 'MEANING_CONFLICT';
    }
    return { sourceUnitId: unit.sourceUnitId, classification, runs };
  });
}
