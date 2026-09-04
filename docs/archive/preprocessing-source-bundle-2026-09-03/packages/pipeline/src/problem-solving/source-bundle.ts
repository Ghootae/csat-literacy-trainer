import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

export const SOURCE_PACKET_VERSION = 'problem-source-packet-v1' as const;
export const SOURCE_BUNDLE_VERSION = 'problem-source-bundle-v1' as const;
export const OPTION_CLAIM_BUNDLE_VERSION = 'problem-option-claim-bundle-v1' as const;
export const FROZEN_SOURCE_BUNDLE_VERSION = 'problem-frozen-source-bundle-v1' as const;
export const FROZEN_OPTION_CLAIM_BUNDLE_VERSION = 'problem-frozen-option-claim-bundle-v1' as const;

export const SourceScopeSchema = z.enum(['PASSAGE', 'ITEM', 'OPTIONS']);
export type SourceScope = z.infer<typeof SourceScopeSchema>;

export const SourceAreaSchema = z.enum([
  'PASSAGE_TEXT',
  'PASSAGE_VISUAL',
  'STEM',
  'SCENARIO_TEXT',
  'SCENARIO_VISUAL',
  'CHOICE',
]);

export const SourceMediaSchema = z.object({
  mediaId: z.string().min(1),
  sourceUrl: z.string().url(),
  localPath: z.string().min(1),
  mimeType: z.string().regex(/^image\//),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sourceArea: SourceAreaSchema,
  documentId: z.string().min(1).nullable(),
}).strict();
export type SourceMedia = z.infer<typeof SourceMediaSchema>;

export const RawSourceDocumentSchema = z.object({
  documentId: z.string().min(1),
  sourceArea: SourceAreaSchema,
  text: z.string(),
}).strict();

export const SourcePacketSchema = z.object({
  packetVersion: z.literal(SOURCE_PACKET_VERSION),
  packetId: z.string().min(1),
  sourceId: z.string().min(1),
  questionNumber: z.number().int().positive().nullable(),
  scope: SourceScopeSchema,
  documents: z.array(RawSourceDocumentSchema).min(1),
  media: z.array(SourceMediaSchema),
  upstreamFrozenBundleHashes: z.array(
    z.string().regex(/^sha256:[a-f0-9]{64}$/),
  ),
}).strict().superRefine((packet, context) => {
  const documentIds = packet.documents.map((document) => document.documentId);
  if (new Set(documentIds).size !== documentIds.length) {
    context.addIssue({ code: 'custom', path: ['documents'], message: 'documentId가 중복된다.' });
  }
  const mediaIds = packet.media.map((media) => media.mediaId);
  if (new Set(mediaIds).size !== mediaIds.length) {
    context.addIssue({ code: 'custom', path: ['media'], message: 'mediaId가 중복된다.' });
  }
  const allowedAreas: Record<SourceScope, ReadonlySet<z.infer<typeof SourceAreaSchema>>> = {
    PASSAGE: new Set(['PASSAGE_TEXT', 'PASSAGE_VISUAL']),
    ITEM: new Set(['STEM', 'SCENARIO_TEXT', 'SCENARIO_VISUAL']),
    OPTIONS: new Set(['CHOICE']),
  };
  for (const [index, document] of packet.documents.entries()) {
    if (!allowedAreas[packet.scope].has(document.sourceArea)) {
      context.addIssue({
        code: 'custom',
        path: ['documents', index, 'sourceArea'],
        message: `${packet.scope} packet에 허용되지 않는 sourceArea다.`,
      });
    }
  }
  for (const [index, media] of packet.media.entries()) {
    if (!allowedAreas[packet.scope].has(media.sourceArea)) {
      context.addIssue({
        code: 'custom',
        path: ['media', index, 'sourceArea'],
        message: `${packet.scope} packet에 허용되지 않는 media sourceArea다.`,
      });
    }
  }
  if (packet.scope === 'PASSAGE' && packet.upstreamFrozenBundleHashes.length !== 0) {
    context.addIssue({
      code: 'custom',
      path: ['upstreamFrozenBundleHashes'],
      message: 'PASSAGE packet에는 상위 Source Bundle이 없다.',
    });
  }
  if (packet.scope === 'OPTIONS' && packet.upstreamFrozenBundleHashes.length < 2) {
    context.addIssue({
      code: 'custom',
      path: ['upstreamFrozenBundleHashes'],
      message: 'OPTIONS packet은 동결된 PASSAGE·ITEM bundle 해시를 모두 참조해야 한다.',
    });
  }
});
export type SourcePacket = z.infer<typeof SourcePacketSchema>;

const TextOrVisualEvidenceSchema = z.object({
  evidenceId: z.string().min(1),
  sourceArea: SourceAreaSchema,
  documentId: z.string().min(1).nullable(),
  quote: z.string().nullable(),
  start: z.number().int().nonnegative().nullable(),
  end: z.number().int().nonnegative().nullable(),
  mediaId: z.string().min(1).nullable(),
  region: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
  ]).nullable(),
}).strict().superRefine((evidence, context) => {
  const isText = evidence.documentId !== null;
  const hasCompleteTextLocator = (
    evidence.quote !== null && evidence.start !== null && evidence.end !== null
  );
  if (isText !== hasCompleteTextLocator) {
    context.addIssue({
      code: 'custom',
      path: ['documentId'],
      message: '텍스트 근거는 documentId·quote·start·end를 모두 함께 가져야 한다.',
    });
  }
  if (evidence.start !== null && evidence.end !== null && evidence.end < evidence.start) {
    context.addIssue({
      code: 'custom', path: ['end'], message: '텍스트 근거 end는 start 이상이어야 한다.',
    });
  }
  const isVisual = evidence.mediaId !== null;
  if (isVisual !== (evidence.region !== null)) {
    context.addIssue({
      code: 'custom',
      path: ['mediaId'],
      message: '시각 근거는 mediaId와 정규화 region을 함께 가져야 한다.',
    });
  }
  if (!isText && !isVisual) {
    context.addIssue({
      code: 'custom',
      path: ['evidenceId'],
      message: '텍스트 또는 시각 근거가 하나 이상 필요하다.',
    });
  }
  if (
    evidence.region !== null &&
    (evidence.region[0] + evidence.region[2] > 1 || evidence.region[1] + evidence.region[3] > 1)
  ) {
    context.addIssue({
      code: 'custom', path: ['region'], message: '시각 region은 이미지 경계를 넘을 수 없다.',
    });
  }
});

export const StructuredRelationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('NONE') }).strict(),
  z.object({
    kind: z.literal('RATIO'),
    left: z.string().min(1),
    operator: z.literal('='),
    coefficient: z.number(),
    right: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('PROPORTIONALITY'),
    dependent: z.string().min(1),
    independent: z.string().min(1),
    exponent: z.number(),
  }).strict(),
  z.object({
    kind: z.literal('COMPARISON'),
    left: z.string().min(1),
    operator: z.enum(['<', '<=', '>', '>=', '=']),
    right: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('LOCATION'),
    entity: z.string().min(1),
    relation: z.enum(['ON', 'OFF', 'INSIDE', 'OUTSIDE', 'INTERSECTS']),
    reference: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('TOPOLOGY'),
    entity: z.string().min(1),
    relation: z.enum(['BETWEEN', 'CONNECTED_TO', 'CONTAINS', 'OVERLAPS']),
    references: z.array(z.string().min(1)).min(1),
  }).strict(),
  z.object({
    kind: z.literal('IDENTITY'),
    left: z.string().min(1),
    right: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('PERPENDICULAR'),
    left: z.string().min(1),
    right: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('CAUSAL'),
    cause: z.string().min(1),
    effect: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal('CONDITIONAL'),
    condition: z.string().min(1),
    consequence: z.string().min(1),
  }).strict(),
]);
export type StructuredRelation = z.infer<typeof StructuredRelationSchema>;

export const SourceClaimSchema = z.object({
  claimId: z.string().regex(/^SC[1-9][0-9]*$/),
  normalizedClaim: z.string().min(1),
  claimType: z.enum([
    'DEFINITION',
    'ENTITY_ATTRIBUTE',
    'QUANTITATIVE_RELATION',
    'QUALITATIVE_RELATION',
    'CONDITION',
    'CAUSAL_RELATION',
    'VISUAL_RELATION',
  ]),
  modality: z.enum(['ASSERTED', 'CONDITIONAL', 'POSSIBLE', 'TYPICAL']),
  grounding: z.enum([
    'TEXT_EXPLICIT',
    'VISUAL_EXPLICIT',
    'CROSS_MODAL_CORROBORATED',
  ]),
  visualPrecision: z.enum([
    'NOT_APPLICABLE',
    'EXACT',
    'ORDINAL',
    'TOPOLOGICAL',
    'ILLUSTRATIVE',
  ]),
  relation: StructuredRelationSchema,
  conditions: z.array(z.string().min(1)),
  evidence: z.array(TextOrVisualEvidenceSchema).min(1),
  riskFlags: z.array(z.enum([
    'NONE',
    'NEGATION',
    'RATIO_DIRECTION',
    'COMPARISON_DIRECTION',
    'CONDITION_SCOPE',
    'CROSS_MODAL_CONFLICT',
    'NON_SCALE_VISUAL',
    'UNCERTAIN_READING',
  ])).min(1),
  isDerived: z.literal(false),
}).strict().superRefine((claim, context) => {
  if (new Set(claim.riskFlags).size !== claim.riskFlags.length) {
    context.addIssue({ code: 'custom', path: ['riskFlags'], message: 'riskFlags가 중복된다.' });
  }
  if (claim.riskFlags.includes('NONE') && claim.riskFlags.length !== 1) {
    context.addIssue({
      code: 'custom',
      path: ['riskFlags'],
      message: 'NONE은 다른 위험 플래그와 함께 사용할 수 없다.',
    });
  }
  if (claim.modality === 'CONDITIONAL' && claim.conditions.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['conditions'],
      message: '조건부 claim은 조건을 생략할 수 없다.',
    });
  }
  if (claim.grounding === 'TEXT_EXPLICIT' && claim.visualPrecision !== 'NOT_APPLICABLE') {
    context.addIssue({
      code: 'custom',
      path: ['visualPrecision'],
      message: '텍스트 전용 claim에는 시각 정밀도를 부여하지 않는다.',
    });
  }
});
export type SourceClaim = z.infer<typeof SourceClaimSchema>;

export const SourceBundleSchema = z.object({
  bundleVersion: z.literal(SOURCE_BUNDLE_VERSION),
  bundleId: z.string().min(1),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  scope: z.enum(['PASSAGE', 'ITEM']),
  claims: z.array(SourceClaimSchema).min(1),
  mediaAssessment: z.object({
    hasMedia: z.boolean(),
    visualRelevant: z.boolean(),
    visualRequiredForSourceUnderstanding: z.boolean(),
    visualRequiredForSolving: z.literal('UNASSESSED'),
    reason: z.string().min(1),
  }).strict(),
  unresolved: z.array(z.object({
    description: z.string().min(1),
    evidenceIds: z.array(z.string().min(1)),
    disposition: z.enum(['HUMAN_REVIEW', 'DO_NOT_ASSERT']),
  }).strict()),
}).strict().superRefine((bundle, context) => {
  const claimIds = bundle.claims.map((claim) => claim.claimId);
  if (new Set(claimIds).size !== claimIds.length) {
    context.addIssue({ code: 'custom', path: ['claims'], message: 'claimId가 중복된다.' });
  }
  if (!bundle.mediaAssessment.hasMedia && (
    bundle.mediaAssessment.visualRelevant ||
    bundle.mediaAssessment.visualRequiredForSourceUnderstanding
  )) {
    context.addIssue({
      code: 'custom',
      path: ['mediaAssessment'],
      message: '미디어가 없으면 시각 관련·필수를 true로 둘 수 없다.',
    });
  }
  if (
    bundle.mediaAssessment.visualRequiredForSourceUnderstanding &&
    !bundle.mediaAssessment.visualRelevant
  ) {
    context.addIssue({
      code: 'custom',
      path: ['mediaAssessment', 'visualRequiredForSourceUnderstanding'],
      message: 'source 이해에 필수인 시각 자료는 VISUAL_RELEVANT를 전제한다.',
    });
  }
});
export type SourceBundle = z.infer<typeof SourceBundleSchema>;

export const OptionClaimBundleSchema = z.object({
  bundleVersion: z.literal(OPTION_CLAIM_BUNDLE_VERSION),
  bundleId: z.string().min(1),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  upstreamFrozenBundleHashes: z.tuple([
    z.string().regex(/^sha256:[a-f0-9]{64}$/),
    z.string().regex(/^sha256:[a-f0-9]{64}$/),
  ]),
  choices: z.array(z.object({
    choiceId: z.string().regex(/^C[1-9][0-9]*$/),
    rawText: z.string().min(1),
    claims: z.array(z.object({
      claimId: z.string().regex(/^OC[1-9][0-9]*-[1-9][0-9]*$/),
      atomicClaim: z.string().min(1),
      polarity: z.enum(['POSITIVE', 'NEGATIVE']),
      condition: z.string().min(1).nullable(),
      quantifier: z.string().min(1).nullable(),
      relation: StructuredRelationSchema,
      sourceQuote: z.string().min(1),
    }).strict()).min(1),
  }).strict()).min(2),
  truthJudgmentsIncluded: z.literal(false),
  answerKeyUsed: z.literal(false),
}).strict().superRefine((bundle, context) => {
  const choiceIds = bundle.choices.map((choice) => choice.choiceId);
  if (new Set(choiceIds).size !== choiceIds.length) {
    context.addIssue({ code: 'custom', path: ['choices'], message: 'choiceId가 중복된다.' });
  }
  const claimIds = bundle.choices.flatMap((choice) => choice.claims.map((claim) => claim.claimId));
  if (new Set(claimIds).size !== claimIds.length) {
    context.addIssue({ code: 'custom', path: ['choices'], message: 'option claimId가 중복된다.' });
  }
});
export type OptionClaimBundle = z.infer<typeof OptionClaimBundleSchema>;

export const FrozenOptionClaimBundleSchema = z.object({
  freezeVersion: z.literal(FROZEN_OPTION_CLAIM_BUNDLE_VERSION),
  frozenAt: z.string().datetime(),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  optionClaimBundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  semanticFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  acceptedGenerationHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(1),
  acceptedAuditHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(1),
  bundle: OptionClaimBundleSchema,
}).strict();
export type FrozenOptionClaimBundle = z.infer<typeof FrozenOptionClaimBundleSchema>;

export const DerivedRelationSchema = z.object({
  relationId: z.string().regex(/^DR[1-9][0-9]*$/),
  premiseSourceClaimIds: z.array(z.string().regex(/^SC[1-9][0-9]*$/)).min(1),
  operation: z.enum(['INVERT_RATIO', 'COMBINE_RELATIONS', 'ALGEBRAIC_REWRITE']),
  conclusion: z.string().min(1),
  relation: StructuredRelationSchema,
}).strict();

export const SourceAwareItemInferenceSchema = z.object({
  inferenceId: z.string().regex(/^II[1-9][0-9]*$/),
  premiseSourceClaimIds: z.array(z.string().regex(/^SC[1-9][0-9]*$/)),
  premiseDerivedRelationIds: z.array(z.string().regex(/^DR[1-9][0-9]*$/)),
  targetOptionClaimIds: z.array(z.string().regex(/^OC[1-9][0-9]*-[1-9][0-9]*$/)).min(1),
  operation: z.enum([
    'APPLY_RULE',
    'CHECK_CONDITION',
    'COMPARE',
    'MAP_CONCEPT',
    'FOLLOW_CAUSAL_CHAIN',
    'CALCULATE',
  ]),
  conclusion: z.string().min(1),
  targetClaimEffect: z.enum(['SUPPORTS', 'CONTRADICTS', 'DOES_NOT_JUSTIFY']),
}).strict();

export const FrozenSourceBundleSchema = z.object({
  freezeVersion: z.literal(FROZEN_SOURCE_BUNDLE_VERSION),
  frozenAt: z.string().datetime(),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceBundleHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  semanticFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  acceptedGenerationHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(1),
  acceptedAuditHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)).min(1),
  bundle: SourceBundleSchema,
}).strict();
export type FrozenSourceBundle = z.infer<typeof FrozenSourceBundleSchema>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([key, child]) => [key, canonicalize(child)]));
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sourceArtifactHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

export function canonicalSourcePacketHash(packetValue: unknown): string {
  return sourceArtifactHash(SourcePacketSchema.parse(packetValue));
}

export function canonicalSourceBundleHash(bundleValue: unknown): string {
  return sourceArtifactHash(SourceBundleSchema.parse(bundleValue));
}

export function sourceBundleSemanticFingerprint(bundleValue: unknown): string {
  const bundle = SourceBundleSchema.parse(bundleValue);
  const semanticClaims = bundle.claims.map((claim) => ({
    normalizedClaim: claim.relation.kind === 'NONE' ? claim.normalizedClaim : null,
    claimType: claim.claimType,
    modality: claim.modality,
    grounding: claim.grounding,
    visualPrecision: claim.visualPrecision,
    relation: claim.relation,
    conditions: [...claim.conditions].sort(),
    sourceAnchors: claim.evidence.map((evidence) => ({
      documentId: evidence.documentId,
      quote: evidence.quote,
      mediaId: evidence.mediaId,
    })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right), 'en')),
  })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right), 'en'));
  return sourceArtifactHash({
    scope: bundle.scope,
    claims: semanticClaims,
    mediaAssessment: {
      hasMedia: bundle.mediaAssessment.hasMedia,
      visualRelevant: bundle.mediaAssessment.visualRelevant,
      visualRequiredForSourceUnderstanding:
        bundle.mediaAssessment.visualRequiredForSourceUnderstanding,
      visualRequiredForSolving: bundle.mediaAssessment.visualRequiredForSolving,
    },
    unresolved: bundle.unresolved.map((item) => item.disposition).sort(),
  });
}

export function optionClaimSemanticFingerprint(bundleValue: unknown): string {
  const bundle = OptionClaimBundleSchema.parse(bundleValue);
  return sourceArtifactHash(bundle.choices.map((choice) => ({
    choiceId: choice.choiceId,
    rawText: choice.rawText,
    claims: choice.claims.map((claim) => ({
      atomicClaim: claim.atomicClaim,
      polarity: claim.polarity,
      condition: claim.condition,
      quantifier: claim.quantifier,
      relation: claim.relation,
      sourceQuote: claim.sourceQuote,
    })),
  })));
}

export function auditOptionClaimBundleAgainstPacket(
  bundleValue: unknown,
  packetValue: unknown,
): SourceBundleStaticAudit {
  const bundle = OptionClaimBundleSchema.parse(bundleValue);
  const packet = SourcePacketSchema.parse(packetValue);
  const issues: string[] = [];
  if (packet.scope !== 'OPTIONS') issues.push('option claim packet scope가 OPTIONS가 아니다.');
  if (bundle.sourcePacketHash !== canonicalSourcePacketHash(packet)) {
    issues.push('sourcePacketHash 불일치');
  }
  if (canonicalJson(bundle.upstreamFrozenBundleHashes) !== canonicalJson(packet.upstreamFrozenBundleHashes)) {
    issues.push('upstreamFrozenBundleHashes 불일치');
  }
  const documents = new Map(packet.documents.map((document) => [document.documentId, document.text]));
  for (const choice of bundle.choices) {
    const expected = documents.get(choice.choiceId);
    if (expected === undefined) {
      issues.push(`${choice.choiceId}: 원문 CHOICE 문서가 없다.`);
      continue;
    }
    if (choice.rawText !== expected) issues.push(`${choice.choiceId}: rawText 불일치`);
    for (const claim of choice.claims) {
      if (!choice.rawText.includes(claim.sourceQuote)) {
        issues.push(`${claim.claimId}: sourceQuote가 선지 원문에 없다.`);
      }
    }
  }
  if (bundle.choices.length !== packet.documents.length) {
    issues.push('선지 수와 원자화 choice 수가 다르다.');
  }
  return { passed: issues.length === 0, issues };
}

export interface SourceBundleStaticAudit {
  readonly passed: boolean;
  readonly issues: readonly string[];
}

export function normalizeSourceEvidenceSpans(options: {
  readonly bundle: unknown;
  readonly packet: unknown;
}): { readonly bundle: SourceBundle; readonly changes: readonly string[] } {
  const bundle = structuredClone(SourceBundleSchema.parse(options.bundle));
  const packet = SourcePacketSchema.parse(options.packet);
  const documents = new Map(packet.documents.map((document) => [document.documentId, document.text]));
  const changes: string[] = [];
  const expectedPacketHash = canonicalSourcePacketHash(packet);
  if (bundle.sourcePacketHash !== expectedPacketHash) {
    bundle.sourcePacketHash = expectedPacketHash;
    changes.push('sourcePacketHash: 원자료 packet hash로 정규화');
  }
  if (bundle.scope !== packet.scope) {
    if (packet.scope === 'OPTIONS') throw new Error('OPTIONS packet은 SourceBundle 대상이 아니다.');
    bundle.scope = packet.scope;
    changes.push('scope: 원자료 packet scope로 정규화');
  }
  const expectedBundleId = `${packet.packetId}-bundle`;
  if (bundle.bundleId !== expectedBundleId) {
    bundle.bundleId = expectedBundleId;
    changes.push('bundleId: packet 기반 결정적 ID로 정규화');
  }
  const expectedHasMedia = packet.media.length > 0;
  if (bundle.mediaAssessment.hasMedia !== expectedHasMedia) {
    bundle.mediaAssessment.hasMedia = expectedHasMedia;
    changes.push('mediaAssessment.hasMedia: packet media 유무로 정규화');
  }
  for (const claim of bundle.claims) {
    for (const evidence of claim.evidence) {
      if (evidence.documentId === null || evidence.quote === null) continue;
      const document = documents.get(evidence.documentId);
      if (document === undefined) continue;
      if (
        evidence.start !== null && evidence.end !== null &&
        document.slice(evidence.start, evidence.end) === evidence.quote
      ) continue;
      const first = document.indexOf(evidence.quote);
      const second = first < 0 ? -1 : document.indexOf(evidence.quote, first + 1);
      if (first < 0 || second >= 0) continue;
      evidence.start = first;
      evidence.end = first + evidence.quote.length;
      changes.push(`${claim.claimId}/${evidence.evidenceId}: unique quote로 span 정규화`);
    }
  }
  return { bundle: SourceBundleSchema.parse(bundle), changes };
}

export function auditSourceBundleAgainstPacket(
  bundleValue: unknown,
  packetValue: unknown,
): SourceBundleStaticAudit {
  const bundle = SourceBundleSchema.parse(bundleValue);
  const packet = SourcePacketSchema.parse(packetValue);
  const issues: string[] = [];
  const packetHash = canonicalSourcePacketHash(packet);
  if (bundle.sourcePacketHash !== packetHash) issues.push('sourcePacketHash 불일치');
  if (bundle.scope !== packet.scope) issues.push('bundle scope와 packet scope 불일치');
  const documents = new Map(packet.documents.map((document) => [document.documentId, document]));
  const mediaIds = new Set(packet.media.map((media) => media.mediaId));
  for (const claim of bundle.claims) {
    for (const evidence of claim.evidence) {
      if (evidence.documentId !== null) {
        const document = documents.get(evidence.documentId);
        if (document === undefined) {
          issues.push(`${claim.claimId}/${evidence.evidenceId}: 존재하지 않는 documentId`);
        } else if (
          evidence.start === null || evidence.end === null || evidence.quote === null ||
          document.text.slice(evidence.start, evidence.end) !== evidence.quote
        ) {
          issues.push(`${claim.claimId}/${evidence.evidenceId}: quote span 불일치`);
        }
      }
      if (evidence.mediaId !== null && !mediaIds.has(evidence.mediaId)) {
        issues.push(`${claim.claimId}/${evidence.evidenceId}: 존재하지 않는 mediaId`);
      }
    }
  }
  if (bundle.mediaAssessment.hasMedia !== (packet.media.length > 0)) {
    issues.push('HAS_MEDIA 판정과 packet media 수 불일치');
  }
  return { passed: issues.length === 0, issues };
}

export function invertRatio(relationValue: unknown): z.infer<typeof StructuredRelationSchema> {
  const relation = StructuredRelationSchema.parse(relationValue);
  if (relation.kind !== 'RATIO') throw new Error('RATIO 관계만 역변환할 수 있다.');
  if (relation.coefficient === 0) throw new Error('계수가 0인 비율은 역변환할 수 없다.');
  return {
    kind: 'RATIO',
    left: relation.right,
    operator: '=',
    coefficient: 1 / relation.coefficient,
    right: relation.left,
  };
}
