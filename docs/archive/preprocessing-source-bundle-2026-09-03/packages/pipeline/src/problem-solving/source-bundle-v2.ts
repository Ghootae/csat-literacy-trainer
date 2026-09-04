import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from './source-bundle.js';

export const SOURCE_UNIT_REGISTRY_VERSION = 'problem-source-unit-registry-v2' as const;
export const SOURCE_BUNDLE_V2_VERSION = 'problem-source-bundle-v2' as const;
export const SOURCE_AUDIT_V2_VERSION = 'problem-source-audit-v2' as const;

export const SourceUnitTypeSchema = z.enum([
  'PROSE_SENTENCE',
  'SCENARIO_SENTENCE',
  'TABLE_CELL',
  'FORMULA',
  'FIGURE',
  'FIGURE_LABEL',
  'CAPTION',
  'FOOTNOTE',
]);
export type SourceUnitType = z.infer<typeof SourceUnitTypeSchema>;

export const SourceUnitRoleSchema = z.enum([
  'PASSAGE_CONTENT',
  'ITEM_DIRECTIVE',
  'SCENARIO_CONTENT',
  'VISUAL_SOURCE',
]);
export const QuestionPolarityV2Schema = z.enum([
  'SELECT_CORRECT',
  'SELECT_INCORRECT',
  'UNRESOLVED',
]);

export const SourceUnitSchema = z.object({
  sourceUnitId: z.string().regex(/^(?:P[1-9][0-9]*-S[1-9][0-9]*|I[0-9]+-S[1-9][0-9]*|FIG[1-9][0-9]*)$/),
  unitType: SourceUnitTypeSchema,
  sourceArea: z.enum([
    'PASSAGE_TEXT',
    'PASSAGE_VISUAL',
    'STEM',
    'SCENARIO_TEXT',
    'SCENARIO_VISUAL',
    'CHOICE',
  ]),
  documentId: z.string().min(1).nullable(),
  mediaId: z.string().min(1).nullable(),
  rawText: z.string().nullable(),
  documentStart: z.number().int().nonnegative().nullable(),
  documentEnd: z.number().int().nonnegative().nullable(),
  offsetBasis: z.literal('DOCUMENT_UTF16'),
  sourceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  status: z.enum(['FIXED', 'CANDIDATE']),
  unitRole: SourceUnitRoleSchema,
  claimExtractionPolicy: z.enum(['INCLUDE', 'EXCLUDE']),
  questionPolarity: QuestionPolarityV2Schema.nullable(),
}).strict().superRefine((unit, context) => {
  const isText = unit.documentId !== null;
  const hasTextPayload = unit.rawText !== null && unit.documentStart !== null &&
    unit.documentEnd !== null;
  if (isText !== hasTextPayload) {
    context.addIssue({
      code: 'custom', path: ['documentId'], message: '텍스트 unit은 원문과 offset을 함께 가져야 한다.',
    });
  }
  if (unit.documentEnd !== null && unit.documentStart !== null &&
    unit.documentEnd <= unit.documentStart) {
    context.addIssue({ code: 'custom', path: ['documentEnd'], message: '빈 텍스트 unit은 허용하지 않는다.' });
  }
  const isFigure = unit.unitType === 'FIGURE';
  if (isFigure !== (unit.mediaId !== null)) {
    context.addIssue({ code: 'custom', path: ['mediaId'], message: 'FIGURE unit은 mediaId를 정확히 하나 가진다.' });
  }
  if (unit.status !== 'FIXED') {
    context.addIssue({
      code: 'custom', path: ['status'], message: '코드 생성 Source Unit registry에는 고정 unit만 들어간다.',
    });
  }
  if (unit.unitRole === 'ITEM_DIRECTIVE' && (
    unit.sourceArea !== 'STEM' || unit.claimExtractionPolicy !== 'EXCLUDE'
  )) {
    context.addIssue({
      code: 'custom', path: ['unitRole'],
      message: 'ITEM_DIRECTIVE는 STEM이며 과학적 claim 추출에서 제외해야 한다.',
    });
  }
  if (unit.questionPolarity !== null && unit.unitRole !== 'ITEM_DIRECTIVE') {
    context.addIssue({
      code: 'custom', path: ['questionPolarity'],
      message: '발문 극성은 ITEM_DIRECTIVE에만 기록한다.',
    });
  }
});
export type SourceUnit = z.infer<typeof SourceUnitSchema>;

export const SourceUnitRegistrySchema = z.object({
  registryVersion: z.literal(SOURCE_UNIT_REGISTRY_VERSION),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  offsetOwnership: z.literal('CODE_ONLY'),
  sentenceSegmentation: z.literal('PUNCTUATION_PRESERVING_V1'),
  units: z.array(SourceUnitSchema).min(1),
}).strict().superRefine((registry, context) => {
  const ids = registry.units.map((unit) => unit.sourceUnitId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['units'], message: 'sourceUnitId가 중복된다.' });
  }
});
export type SourceUnitRegistry = z.infer<typeof SourceUnitRegistrySchema>;

function sha256Text(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function detectQuestionPolarityV2(text: string): z.infer<typeof QuestionPolarityV2Schema> | null {
  if (!/[?？]\s*$/u.test(text)) return null;
  if (/(?:적절하지\s*않|옳지\s*않|타당하지\s*않|일치하지\s*않|잘못된|틀린)/u.test(text)) {
    return 'SELECT_INCORRECT';
  }
  if (/(?:적절한|옳은|타당한|일치하는|맞는)/u.test(text)) return 'SELECT_CORRECT';
  return 'UNRESOLVED';
}

export function splitSentencesWithOffsets(text: string): Array<{
  readonly text: string;
  readonly start: number;
  readonly end: number;
}> {
  const results: Array<{ text: string; start: number; end: number }> = [];
  const pattern = /[^.!?]+(?:[.!?]+(?:["'’”\])}]+)?|$)/gu;
  for (const match of text.matchAll(pattern)) {
    const matched = match[0];
    if (matched.length === 0 || match.index === undefined) continue;
    const leading = matched.length - matched.trimStart().length;
    const trimmed = matched.trim();
    if (trimmed.length === 0) continue;
    const start = match.index + leading;
    results.push({ text: trimmed, start, end: start + trimmed.length });
  }
  if (results.length === 0 && text.trim().length > 0) {
    const start = text.length - text.trimStart().length;
    const trimmed = text.trim();
    return [{ text: trimmed, start, end: start + trimmed.length }];
  }
  return results;
}

export function buildSourceUnitRegistry(packetValue: unknown): SourceUnitRegistry {
  const packet = SourcePacketSchema.parse(packetValue);
  const units: SourceUnit[] = [];
  for (const [documentIndex, document] of packet.documents.entries()) {
    const sentences = splitSentencesWithOffsets(document.text);
    for (const [sentenceIndex, sentence] of sentences.entries()) {
      const passage = packet.scope === 'PASSAGE';
      const sourceUnitId = passage
        ? `P${documentIndex + 1}-S${sentenceIndex + 1}`
        : `I${documentIndex}-S${sentenceIndex + 1}`;
      units.push(SourceUnitSchema.parse({
        sourceUnitId,
        unitType: passage ? 'PROSE_SENTENCE' : 'SCENARIO_SENTENCE',
        sourceArea: document.sourceArea,
        documentId: document.documentId,
        mediaId: null,
        rawText: sentence.text,
        documentStart: sentence.start,
        documentEnd: sentence.end,
        offsetBasis: 'DOCUMENT_UTF16',
        sourceHash: sha256Text(sentence.text),
        status: 'FIXED',
        unitRole: passage
          ? 'PASSAGE_CONTENT'
          : document.sourceArea === 'STEM'
            ? 'ITEM_DIRECTIVE'
            : 'SCENARIO_CONTENT',
        claimExtractionPolicy: !passage && document.sourceArea === 'STEM' ? 'EXCLUDE' : 'INCLUDE',
        questionPolarity: !passage && document.sourceArea === 'STEM'
          ? detectQuestionPolarityV2(sentence.text)
          : null,
      }));
    }
  }
  for (const [mediaIndex, media] of packet.media.entries()) {
    units.push(SourceUnitSchema.parse({
      sourceUnitId: `FIG${mediaIndex + 1}`,
      unitType: 'FIGURE',
      sourceArea: media.sourceArea,
      documentId: null,
      mediaId: media.mediaId,
      rawText: null,
      documentStart: null,
      documentEnd: null,
      offsetBasis: 'DOCUMENT_UTF16',
      sourceHash: media.contentHash,
      status: 'FIXED',
      unitRole: 'VISUAL_SOURCE',
      claimExtractionPolicy: 'INCLUDE',
      questionPolarity: null,
    }));
  }
  return SourceUnitRegistrySchema.parse({
    registryVersion: SOURCE_UNIT_REGISTRY_VERSION,
    sourcePacketHash: sourceArtifactHash(packet),
    offsetOwnership: 'CODE_ONLY',
    sentenceSegmentation: 'PUNCTUATION_PRESERVING_V1',
    units,
  });
}

export function validateSourceUnitRegistryAgainstPacket(options: {
  readonly registry: unknown;
  readonly sourcePacket: unknown;
}): SourceUnitRegistry {
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  if (registry.sourcePacketHash !== sourceArtifactHash(packet)) {
    throw new Error('Source Unit registry의 packet hash가 원자료와 다르다.');
  }

  const textUnits = registry.units.filter((unit) => unit.documentId !== null);
  for (const [documentIndex, document] of packet.documents.entries()) {
    const documentUnits = textUnits
      .filter((unit) => unit.documentId === document.documentId)
      .sort((left, right) => left.documentStart! - right.documentStart!);
    if (documentUnits.length === 0 && document.text.trim().length > 0) {
      throw new Error(`${document.documentId}의 비어 있지 않은 원문에 Source Unit이 없다.`);
    }
    let cursor = 0;
    for (const [sentenceIndex, unit] of documentUnits.entries()) {
      const expectedId = packet.scope === 'PASSAGE'
        ? `P${documentIndex + 1}-S${sentenceIndex + 1}`
        : `I${documentIndex}-S${sentenceIndex + 1}`;
      if (unit.sourceUnitId !== expectedId) {
        throw new Error(`${document.documentId}의 Source Unit 순서 또는 ID가 다르다.`);
      }
      if (unit.sourceArea !== document.sourceArea) {
        throw new Error(`${unit.sourceUnitId}의 sourceArea가 원자료와 다르다.`);
      }
      const start = unit.documentStart!;
      const end = unit.documentEnd!;
      if (start < cursor) throw new Error(`${unit.sourceUnitId}의 offset이 앞 unit과 겹친다.`);
      if (document.text.slice(cursor, start).trim().length > 0) {
        throw new Error(`${unit.sourceUnitId} 앞에 Source Unit으로 보존되지 않은 원문이 있다.`);
      }
      const reconstructed = document.text.slice(start, end);
      if (reconstructed !== unit.rawText) {
        throw new Error(`${unit.sourceUnitId}의 offset slice가 rawText와 다르다.`);
      }
      if (unit.sourceHash !== sha256Text(reconstructed)) {
        throw new Error(`${unit.sourceUnitId}의 sourceHash가 원문 slice와 다르다.`);
      }
      cursor = end;
    }
    if (document.text.slice(cursor).trim().length > 0) {
      throw new Error(`${document.documentId} 끝에 Source Unit으로 보존되지 않은 원문이 있다.`);
    }
  }
  const knownDocumentIds = new Set(packet.documents.map((document) => document.documentId));
  if (textUnits.some((unit) => !knownDocumentIds.has(unit.documentId!))) {
    throw new Error('원자료에 없는 documentId를 참조하는 Source Unit이 있다.');
  }

  const figureUnits = registry.units.filter((unit) => unit.unitType === 'FIGURE');
  if (figureUnits.length !== packet.media.length) {
    throw new Error('FIGURE Source Unit 수가 원자료 media 수와 다르다.');
  }
  for (const [mediaIndex, media] of packet.media.entries()) {
    const unit = figureUnits[mediaIndex];
    if (unit === undefined || unit.sourceUnitId !== `FIG${mediaIndex + 1}` ||
      unit.mediaId !== media.mediaId || unit.sourceArea !== media.sourceArea ||
      unit.sourceHash !== media.contentHash) {
      throw new Error(`${media.mediaId}의 FIGURE Source Unit이 원자료와 다르다.`);
    }
  }
  return registry;
}

export const EvidenceResolutionStatusSchema = z.enum([
  'EXACT_UNIQUE',
  'EXACT_AMBIGUOUS',
  'NON_EXACT',
  'UNMAPPED',
]);

export const EvidenceResolutionSchema = z.object({
  evidenceId: z.string().min(1),
  rawDocumentId: z.string().min(1).nullable(),
  rawQuote: z.string().nullable(),
  status: EvidenceResolutionStatusSchema,
  sourceUnitIds: z.array(z.string().min(1)),
  resolvedDocumentStart: z.number().int().nonnegative().nullable(),
  resolvedDocumentEnd: z.number().int().nonnegative().nullable(),
  reason: z.string().min(1),
}).strict();
export type EvidenceResolution = z.infer<typeof EvidenceResolutionSchema>;

export function resolveEvidenceFragment(options: {
  readonly evidenceId: string;
  readonly documentId: string | null;
  readonly quote: string | null;
  readonly registry: SourceUnitRegistry;
  readonly sourcePacket: SourcePacket;
}): EvidenceResolution {
  const registry = SourceUnitRegistrySchema.parse(options.registry);
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  if (options.documentId === null || options.quote === null || options.quote.length === 0) {
    return EvidenceResolutionSchema.parse({
      evidenceId: options.evidenceId,
      rawDocumentId: options.documentId,
      rawQuote: options.quote,
      status: 'UNMAPPED',
      sourceUnitIds: [],
      resolvedDocumentStart: null,
      resolvedDocumentEnd: null,
      reason: '텍스트 documentId 또는 quote가 없다.',
    });
  }
  const document = packet.documents.find((candidate) => candidate.documentId === options.documentId);
  if (document === undefined) {
    return EvidenceResolutionSchema.parse({
      evidenceId: options.evidenceId,
      rawDocumentId: options.documentId,
      rawQuote: options.quote,
      status: 'UNMAPPED',
      sourceUnitIds: [],
      resolvedDocumentStart: null,
      resolvedDocumentEnd: null,
      reason: 'documentId가 원자료 packet에 없다.',
    });
  }
  const starts: number[] = [];
  let cursor = document.text.indexOf(options.quote);
  while (cursor >= 0) {
    starts.push(cursor);
    cursor = document.text.indexOf(options.quote, cursor + 1);
  }
  if (starts.length === 0) {
    return EvidenceResolutionSchema.parse({
      evidenceId: options.evidenceId,
      rawDocumentId: options.documentId,
      rawQuote: options.quote,
      status: 'NON_EXACT',
      sourceUnitIds: [],
      resolvedDocumentStart: null,
      resolvedDocumentEnd: null,
      reason: '원시 quote가 원문에 정확히 연속 일치하지 않는다. 자동 축약·유사 연결을 하지 않았다.',
    });
  }
  const matchingUnits = registry.units.filter((unit) => (
    unit.documentId === options.documentId && unit.documentStart !== null && unit.documentEnd !== null &&
    starts.some((start) => start >= unit.documentStart! &&
      start + options.quote!.length <= unit.documentEnd!)
  ));
  if (starts.length !== 1 || matchingUnits.length !== 1) {
    return EvidenceResolutionSchema.parse({
      evidenceId: options.evidenceId,
      rawDocumentId: options.documentId,
      rawQuote: options.quote,
      status: 'EXACT_AMBIGUOUS',
      sourceUnitIds: matchingUnits.map((unit) => unit.sourceUnitId),
      resolvedDocumentStart: null,
      resolvedDocumentEnd: null,
      reason: '원문에서 정확한 일치 위치 또는 포함 Source Unit이 하나로 확정되지 않는다.',
    });
  }
  return EvidenceResolutionSchema.parse({
    evidenceId: options.evidenceId,
    rawDocumentId: options.documentId,
    rawQuote: options.quote,
    status: 'EXACT_UNIQUE',
    sourceUnitIds: [matchingUnits[0]!.sourceUnitId],
    resolvedDocumentStart: starts[0],
    resolvedDocumentEnd: starts[0]! + options.quote.length,
    reason: '원문과 Source Unit 안에서 유일하게 정확히 일치한다.',
  });
}

export const ClaimPolaritySchema = z.enum(['POSITIVE', 'NEGATIVE']);
export const ClaimModalitySchema = z.enum(['ASSERTED', 'CONDITIONAL', 'POSSIBLE', 'TYPICAL']);

export const SourceClaimProposalV2Schema = z.object({
  claimId: z.string().regex(/^(?:P[1-9][0-9]*-S[1-9][0-9]*|I[0-9]+-S[1-9][0-9]*|FIG[1-9][0-9]*)-C[1-9][0-9]*$/),
  sourceUnitId: z.string().min(1),
  normalizedClaim: z.string().min(1),
  polarity: ClaimPolaritySchema,
  modality: ClaimModalitySchema,
  qualifiers: z.array(z.string().min(1)),
  evidenceFragments: z.array(z.string().min(1)).min(1),
}).strict();

export const EntityRegistryEntrySchema = z.object({
  entityId: z.string().regex(/^E_[A-Z0-9_]+$/),
  canonicalLabel: z.string().min(1),
  surfaceForms: z.array(z.string().min(1)).min(1),
  definitionSourceUnitId: z.string().min(1).nullable(),
  definitionFragment: z.string().min(1).nullable(),
  mergeBasis: z.enum([
    'SINGLE_SURFACE_NO_MERGE',
    'EXPLICIT_DEFINITION',
    'EXPLICIT_IDENTITY',
    'AUDITED_DEFINES',
    'AUDITED_SAME_AS',
    'HUMAN_APPROVAL',
  ]),
  status: z.literal('EVIDENCE_GROUNDED_CANDIDATE'),
}).strict();
export type EntityRegistryEntry = z.infer<typeof EntityRegistryEntrySchema>;

export const RelationFamilySchema = z.enum([
  'DEFINES',
  'SAME_AS',
  'ATTRIBUTE',
  'RATIO',
  'PROPORTIONALITY',
  'COMPARISON',
  'CAUSAL',
  'LOCATION',
  'TOPOLOGY',
]);

export const SourceQuantityV2Schema = z.object({
  quantityId: z.string().regex(/^Q_[A-Z0-9_]+$/),
  quantityKind: z.enum(['DISTANCE', 'LENGTH', 'ANGLE', 'AREA', 'COUNT', 'VALUE', 'OTHER']),
  subjectEntityId: z.string().regex(/^E_[A-Z0-9_]+$/),
  referenceEntityId: z.string().regex(/^E_[A-Z0-9_]+$/).nullable(),
  qualifiers: z.array(z.string().min(1)),
}).strict();
export type SourceQuantityV2 = z.infer<typeof SourceQuantityV2Schema>;

export const RatioRelationV2Schema = z.object({
  relationId: z.string().regex(/^R[1-9][0-9]*$/),
  sourceUnitId: z.string().min(1),
  relationFamily: z.literal('RATIO'),
  claimIds: z.array(z.string().min(1)).min(1),
  leftQuantityId: z.string().regex(/^Q_[A-Z0-9_]+$/),
  operator: z.literal('='),
  coefficient: z.number().finite(),
  rightQuantityId: z.string().regex(/^Q_[A-Z0-9_]+$/),
  interpretationRule: z.literal('LEFT_EQUALS_COEFFICIENT_TIMES_RIGHT'),
}).strict().superRefine((relation, context) => {
  if (relation.coefficient === 0) {
    context.addIssue({ code: 'custom', path: ['coefficient'], message: '비율 계수 0은 허용하지 않는다.' });
  }
  if (relation.leftQuantityId === relation.rightQuantityId) {
    context.addIssue({ code: 'custom', path: ['rightQuantityId'], message: '동일 quantity 간 비율은 허용하지 않는다.' });
  }
});
export type RatioRelationV2 = z.infer<typeof RatioRelationV2Schema>;

export const ProportionalityRelationV2Schema = z.object({
  relationId: z.string().regex(/^R[1-9][0-9]*$/),
  sourceUnitId: z.string().min(1),
  relationFamily: z.literal('PROPORTIONALITY'),
  claimIds: z.array(z.string().min(1)).min(1),
  independentQuantityId: z.string().regex(/^Q_[A-Z0-9_]+$/),
  dependentQuantityId: z.string().regex(/^Q_[A-Z0-9_]+$/),
  exponent: z.number().finite(),
  polarity: z.enum(['POSITIVE', 'NEGATIVE']),
}).strict();

export const GenericSourceRelationV2Schema = z.object({
  relationId: z.string().regex(/^R[1-9][0-9]*$/),
  sourceUnitId: z.string().min(1),
  relationFamily: z.enum([
    'DEFINES', 'SAME_AS', 'ATTRIBUTE', 'COMPARISON', 'CAUSAL', 'LOCATION', 'TOPOLOGY',
  ]),
  fromClaimIds: z.array(z.string().min(1)),
  toClaimIds: z.array(z.string().min(1)),
  conditionClaimIds: z.array(z.string().min(1)),
  fromEntityIds: z.array(z.string().min(1)),
  toEntityIds: z.array(z.string().min(1)),
  operator: z.enum(['=', '<', '<=', '>', '>=']).nullable(),
}).strict();

export const SourceRelationProposalV2Schema = z.discriminatedUnion('relationFamily', [
  RatioRelationV2Schema,
  ProportionalityRelationV2Schema,
  GenericSourceRelationV2Schema,
]);

export const ItemDirectiveV2Schema = z.object({
  sourceUnitId: z.string().regex(/^I[0-9]+-S[1-9][0-9]*$/),
  unitRole: z.literal('ITEM_DIRECTIVE'),
  claimExtractionPolicy: z.literal('EXCLUDE'),
  questionPolarity: QuestionPolarityV2Schema.nullable(),
}).strict();

export const VisualCandidateV2Schema = z.object({
  candidateId: z.string().regex(/^FIG[1-9][0-9]*-V[1-9][0-9]*$/),
  parentFigureUnitId: z.string().regex(/^FIG[1-9][0-9]*$/),
  candidateType: z.enum(['OBJECT', 'LABEL', 'REGION', 'RELATION']),
  label: z.string().min(1),
  region: z.tuple([
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
    z.number().min(0).max(1),
  ]).nullable(),
  precision: z.enum(['EXACT', 'ORDINAL', 'TOPOLOGICAL', 'ILLUSTRATIVE']),
  evidenceDescription: z.string().min(1),
  status: z.literal('CANDIDATE'),
}).strict().superRefine((candidate, context) => {
  if (candidate.region !== null && (
    candidate.region[0] + candidate.region[2] > 1 ||
    candidate.region[1] + candidate.region[3] > 1
  )) {
    context.addIssue({ code: 'custom', path: ['region'], message: '시각 후보 영역이 이미지 경계를 벗어난다.' });
  }
});

export const SourceBundleV2Schema = z.object({
  bundleVersion: z.literal(SOURCE_BUNDLE_V2_VERSION),
  scope: z.enum(['PASSAGE', 'ITEM']),
  sourcePacketHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceUnitRegistryHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  offsetFieldsProducedByModel: z.literal(false),
  itemDirectives: z.array(ItemDirectiveV2Schema),
  claims: z.array(SourceClaimProposalV2Schema),
  entities: z.array(EntityRegistryEntrySchema),
  quantities: z.array(SourceQuantityV2Schema),
  relations: z.array(SourceRelationProposalV2Schema),
  visualCandidates: z.array(VisualCandidateV2Schema),
  mediaAssessment: z.object({
    hasMedia: z.boolean(),
    visualRelevant: z.boolean(),
    visualRequiredForSourceUnderstanding: z.boolean(),
    visualRequiredForSolving: z.literal('UNASSESSED'),
    reason: z.string().min(1),
  }).strict(),
  unresolved: z.array(z.object({
    sourceUnitId: z.string().min(1),
    description: z.string().min(1),
    disposition: z.enum(['HUMAN_REVIEW', 'DO_NOT_ASSERT']),
  }).strict()),
}).strict().superRefine((bundle, context) => {
  const uniqueFields: Array<[string, string[]]> = [
    ['claims', bundle.claims.map((claim) => claim.claimId)],
    ['entities', bundle.entities.map((entity) => entity.entityId)],
    ['quantities', bundle.quantities.map((quantity) => quantity.quantityId)],
    ['relations', bundle.relations.map((relation) => relation.relationId)],
    ['visualCandidates', bundle.visualCandidates.map((candidate) => candidate.candidateId)],
    ['itemDirectives', bundle.itemDirectives.map((directive) => directive.sourceUnitId)],
  ];
  for (const [field, ids] of uniqueFields) {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', path: [field], message: `${field} ID가 중복된다.` });
    }
  }
  const claimIds = new Set(bundle.claims.map((claim) => claim.claimId));
  const entityIds = new Set(bundle.entities.map((entity) => entity.entityId));
  const quantityIds = new Set(bundle.quantities.map((quantity) => quantity.quantityId));
  for (const [index, quantity] of bundle.quantities.entries()) {
    if (!entityIds.has(quantity.subjectEntityId) ||
      (quantity.referenceEntityId !== null && !entityIds.has(quantity.referenceEntityId))) {
      context.addIssue({
        code: 'custom', path: ['quantities', index], message: 'quantity가 존재하지 않는 entity를 참조한다.',
      });
    }
  }
  for (const [index, relation] of bundle.relations.entries()) {
    const relationClaimIds = relation.relationFamily === 'RATIO' ||
      relation.relationFamily === 'PROPORTIONALITY'
      ? relation.claimIds
      : [...relation.fromClaimIds, ...relation.toClaimIds, ...relation.conditionClaimIds];
    if (relationClaimIds.some((id) => !claimIds.has(id))) {
      context.addIssue({
        code: 'custom', path: ['relations', index], message: 'relation이 존재하지 않는 claim을 참조한다.',
      });
    }
    if (relation.relationFamily === 'RATIO' && (
      !quantityIds.has(relation.leftQuantityId) || !quantityIds.has(relation.rightQuantityId)
    )) {
      context.addIssue({
        code: 'custom', path: ['relations', index], message: 'RATIO가 존재하지 않는 quantity를 참조한다.',
      });
    }
    if (relation.relationFamily === 'PROPORTIONALITY' && (
      !quantityIds.has(relation.independentQuantityId) ||
      !quantityIds.has(relation.dependentQuantityId)
    )) {
      context.addIssue({
        code: 'custom', path: ['relations', index],
        message: 'PROPORTIONALITY가 존재하지 않는 quantity를 참조한다.',
      });
    }
    if (relation.relationFamily !== 'RATIO' && relation.relationFamily !== 'PROPORTIONALITY' &&
      [...relation.fromEntityIds, ...relation.toEntityIds].some((id) => !entityIds.has(id))) {
      context.addIssue({
        code: 'custom', path: ['relations', index], message: 'relation이 존재하지 않는 entity를 참조한다.',
      });
    }
  }
  if (!bundle.mediaAssessment.hasMedia && (
    bundle.mediaAssessment.visualRelevant || bundle.mediaAssessment.visualRequiredForSourceUnderstanding ||
    bundle.visualCandidates.length > 0
  )) {
    context.addIssue({ code: 'custom', path: ['mediaAssessment'], message: '미디어가 없는데 시각 정보가 있다.' });
  }
});
export type SourceBundleV2 = z.infer<typeof SourceBundleV2Schema>;

export function validateSourceBundleV2AgainstInputs(options: {
  readonly bundle: unknown;
  readonly sourcePacket: unknown;
  readonly registry: unknown;
}): SourceBundleV2 {
  const bundle = SourceBundleV2Schema.parse(options.bundle);
  const packet = SourcePacketSchema.parse(options.sourcePacket);
  const registry = validateSourceUnitRegistryAgainstPacket({
    registry: options.registry,
    sourcePacket: packet,
  });
  if (bundle.scope !== packet.scope) throw new Error('Bundle scope가 Source Packet과 다르다.');
  if (bundle.sourcePacketHash !== sourceArtifactHash(packet)) {
    throw new Error('Bundle sourcePacketHash가 원자료와 다르다.');
  }
  if (bundle.sourceUnitRegistryHash !== sourceArtifactHash(registry)) {
    throw new Error('Bundle sourceUnitRegistryHash가 고정 registry와 다르다.');
  }
  const units = new Map(registry.units.map((unit) => [unit.sourceUnitId, unit]));
  for (const claim of bundle.claims) {
    const unit = units.get(claim.sourceUnitId);
    if (unit === undefined) throw new Error(`${claim.claimId}가 존재하지 않는 Source Unit을 참조한다.`);
    if (unit.claimExtractionPolicy !== 'INCLUDE') {
      throw new Error(`${claim.claimId}가 claim 추출 제외 unit을 사용한다.`);
    }
    if (!claim.claimId.startsWith(`${claim.sourceUnitId}-C`)) {
      throw new Error(`${claim.claimId}가 Source Unit 계보를 보존하지 않는다.`);
    }
    if (unit.rawText !== null && claim.evidenceFragments.some((fragment) => !unit.rawText!.includes(fragment))) {
      throw new Error(`${claim.claimId}의 evidenceFragment가 해당 Source Unit 원문에 없다.`);
    }
  }
  const expectedDirectives = registry.units
    .filter((unit) => unit.unitRole === 'ITEM_DIRECTIVE')
    .map((unit) => ({ sourceUnitId: unit.sourceUnitId, questionPolarity: unit.questionPolarity }));
  if (bundle.scope === 'ITEM') {
    if (bundle.itemDirectives.length !== expectedDirectives.length) {
      throw new Error('ITEM_DIRECTIVE가 고정 발문 unit을 정확히 덮지 않는다.');
    }
    for (const [index, expected] of expectedDirectives.entries()) {
      const actual = bundle.itemDirectives[index];
      if (actual?.sourceUnitId !== expected.sourceUnitId ||
        actual.questionPolarity !== expected.questionPolarity) {
        throw new Error(`${expected.sourceUnitId}의 발문 역할 또는 극성이 코드 판정과 다르다.`);
      }
    }
  } else if (bundle.itemDirectives.length > 0) {
    throw new Error('PASSAGE Bundle에는 ITEM_DIRECTIVE가 없어야 한다.');
  }
  const figureIds = new Set(registry.units
    .filter((unit) => unit.unitType === 'FIGURE')
    .map((unit) => unit.sourceUnitId));
  for (const candidate of bundle.visualCandidates) {
    if (!figureIds.has(candidate.parentFigureUnitId) ||
      !candidate.candidateId.startsWith(`${candidate.parentFigureUnitId}-V`)) {
      throw new Error(`${candidate.candidateId}가 고정 FIGURE 계보를 보존하지 않는다.`);
    }
  }
  if (bundle.mediaAssessment.hasMedia !== (packet.media.length > 0)) {
    throw new Error('mediaAssessment.hasMedia가 원자료와 다르다.');
  }
  return bundle;
}

export const SemanticSignatureSchema = z.object({
  sourceUnitId: z.string().min(1),
  entities: z.array(z.string().min(1)),
  relationFamily: z.string().min(1),
  direction: z.tuple([z.string().min(1), z.string().min(1)]).nullable(),
  operator: z.string().min(1).nullable(),
  coefficient: z.number().nullable(),
  exponent: z.number().nullable(),
  polarity: ClaimPolaritySchema,
  modality: ClaimModalitySchema,
  qualifiers: z.array(z.string().min(1)),
  evidenceStatus: EvidenceResolutionStatusSchema,
}).strict();
export type SemanticSignature = z.infer<typeof SemanticSignatureSchema>;

export const AuditDecisionV2Schema = z.enum([
  'PASS',
  'WARNING',
  'REPAIR_REQUIRED',
  'BLOCKING',
  'UNRESOLVED',
]);
export type AuditDecisionV2 = z.infer<typeof AuditDecisionV2Schema>;

export const SourceUnitAuditV2Schema = z.object({
  sourceUnitId: z.string().min(1),
  candidateClaimIds: z.array(z.string().min(1)),
  claimsReviewed: z.array(z.string().min(1)),
  candidateVisualIds: z.array(z.string().min(1)),
  visualCandidatesReviewed: z.array(z.string().min(1)),
  omittedMeaningDetected: z.boolean(),
  unsupportedMeaningDetected: z.boolean(),
  omittedVisualMeaningDetected: z.boolean(),
  unsupportedVisualMeaningDetected: z.boolean(),
  decision: AuditDecisionV2Schema,
  downstreamImpact: z.enum(['NONE', 'POSSIBLE', 'CONFIRMED']),
  issues: z.array(z.object({
    issueCode: z.string().min(1),
    issueClass: z.enum([
      'NON_SEMANTIC_EXPRESSION',
      'CLAIM_GRANULARITY',
      'CANONICAL_LABEL',
      'UNUSED_AUXILIARY',
      'DIRECTION',
      'COEFFICIENT',
      'EXPONENT',
      'NEGATION',
      'MODALITY',
      'REQUIRED_CONDITION',
      'CAUSE_EFFECT',
      'DEFINITION_TARGET',
      'ENTITY_IDENTITY',
      'SOURCE_LINEAGE',
      'OMITTED_MEANING',
      'UNSUPPORTED_MEANING',
      'OTHER',
    ]),
    description: z.string().min(1),
    affectedClaimIds: z.array(z.string().min(1)),
    affectedVisualCandidateIds: z.array(z.string().min(1)),
  }).strict()),
}).strict();

export const SourceAuditV2Schema = z.object({
  auditVersion: z.literal(SOURCE_AUDIT_V2_VERSION),
  auditId: z.string().min(1),
  model: z.string().min(1),
  effort: z.enum(['medium', 'high']),
  independentOfOtherAudit: z.literal(true),
  expectedSourceUnitIds: z.array(z.string().min(1)).min(1),
  unitAudits: z.array(SourceUnitAuditV2Schema).min(1),
}).strict();
export type SourceAuditV2 = z.infer<typeof SourceAuditV2Schema>;

function hasRangeId(value: string): boolean {
  return /(?:^|-)C?\d+\s*[-–]\s*C?\d+$/u.test(value) || /S\d+\s*[-–]\s*S\d+/u.test(value);
}

export function validateSourceAuditV2Coverage(options: {
  readonly audit: unknown;
  readonly expectedClaimsByUnit: Readonly<Record<string, readonly string[]>>;
  readonly expectedVisualsByUnit?: Readonly<Record<string, readonly string[]>>;
}): SourceAuditV2 {
  const audit = SourceAuditV2Schema.parse(options.audit);
  const expectedUnitIds = Object.keys(options.expectedClaimsByUnit);
  if (audit.expectedSourceUnitIds.join('|') !== expectedUnitIds.join('|')) {
    throw new Error('감사 입력의 expectedSourceUnitIds가 코드 기준 unit 순서와 다르다.');
  }
  const actualUnitIds = audit.unitAudits.map((unit) => unit.sourceUnitId);
  if (new Set(actualUnitIds).size !== actualUnitIds.length ||
    actualUnitIds.join('|') !== expectedUnitIds.join('|')) {
    throw new Error('모든 Source Unit을 코드 순서대로 정확히 한 번씩 감사해야 한다.');
  }
  for (const unit of audit.unitAudits) {
    const expectedClaimIds = [...(options.expectedClaimsByUnit[unit.sourceUnitId] ?? [])];
    const expectedVisualIds = [...(options.expectedVisualsByUnit?.[unit.sourceUnitId] ?? [])];
    if ([...unit.candidateClaimIds].sort().join('|') !== expectedClaimIds.sort().join('|')) {
      throw new Error(`${unit.sourceUnitId}의 candidateClaimIds가 후보 claim과 일치하지 않는다.`);
    }
    if (unit.claimsReviewed.some(hasRangeId)) {
      throw new Error(`${unit.sourceUnitId}에 범위형 claim ID가 있다.`);
    }
    if (new Set(unit.claimsReviewed).size !== unit.claimsReviewed.length ||
      [...unit.claimsReviewed].sort().join('|') !== expectedClaimIds.sort().join('|')) {
      throw new Error(`${unit.sourceUnitId}의 모든 후보 claim을 정확히 한 번씩 검토해야 한다.`);
    }
    if ([...unit.candidateVisualIds].sort().join('|') !== expectedVisualIds.sort().join('|')) {
      throw new Error(`${unit.sourceUnitId}의 candidateVisualIds가 시각 후보와 일치하지 않는다.`);
    }
    if (unit.visualCandidatesReviewed.some(hasRangeId)) {
      throw new Error(`${unit.sourceUnitId}에 범위형 visual candidate ID가 있다.`);
    }
    if (new Set(unit.visualCandidatesReviewed).size !== unit.visualCandidatesReviewed.length ||
      [...unit.visualCandidatesReviewed].sort().join('|') !== expectedVisualIds.sort().join('|')) {
      throw new Error(`${unit.sourceUnitId}의 모든 시각 후보를 정확히 한 번씩 검토해야 한다.`);
    }
    for (const issue of unit.issues) {
      if (issue.affectedClaimIds.some((id) => !expectedClaimIds.includes(id))) {
        throw new Error(`${unit.sourceUnitId} issue가 존재하지 않는 claim을 참조한다.`);
      }
      if (issue.affectedVisualCandidateIds.some((id) => !expectedVisualIds.includes(id))) {
        throw new Error(`${unit.sourceUnitId} issue가 존재하지 않는 시각 후보를 참조한다.`);
      }
    }
  }
  return audit;
}

export const ProductionEligibilitySchema = z.object({
  artifactFrozen: z.boolean(),
  productionEligible: z.boolean(),
  decision: z.enum(['ELIGIBLE', 'INELIGIBLE', 'HUMAN_EXCEPTION_REQUIRED']),
  reasons: z.array(z.string().min(1)),
  warningDownstreamImpactVerifiedNone: z.boolean(),
  unresolvedExclusions: z.array(z.object({
    sourceUnitId: z.string().min(1),
    sourceMeaningNonDecisive: z.boolean(),
    passageGoldImpactNone: z.boolean(),
    allLinkedItemImpactNone: z.boolean(),
    coverageReasonRecorded: z.boolean(),
    humanApproved: z.boolean(),
  }).strict()),
}).strict();
export type ProductionEligibility = z.infer<typeof ProductionEligibilitySchema>;

export function evaluateProductionEligibility(options: {
  readonly artifactFrozen: boolean;
  readonly unitAudits: readonly z.infer<typeof SourceUnitAuditV2Schema>[];
  readonly unresolvedExclusions?: ProductionEligibility['unresolvedExclusions'];
}): ProductionEligibility {
  const audits = options.unitAudits.map((audit) => SourceUnitAuditV2Schema.parse(audit));
  const exclusions = options.unresolvedExclusions ?? [];
  const reasons: string[] = [];
  if (!options.artifactFrozen) reasons.push('artifact가 불변 상태로 보존되지 않았다.');
  if (audits.some((audit) => audit.decision === 'BLOCKING')) reasons.push('BLOCKING unit이 남아 있다.');
  if (audits.some((audit) => audit.decision === 'REPAIR_REQUIRED')) {
    reasons.push('수리·재감사가 필요한 unit이 남아 있다.');
  }
  const warnings = audits.filter((audit) => audit.decision === 'WARNING');
  const warningEligibleIssueClasses = new Set([
    'NON_SEMANTIC_EXPRESSION',
    'CLAIM_GRANULARITY',
    'CANONICAL_LABEL',
    'UNUSED_AUXILIARY',
  ]);
  const warningSafe = warnings.every((audit) => (
    audit.downstreamImpact === 'NONE' &&
    !audit.omittedMeaningDetected &&
    !audit.unsupportedMeaningDetected &&
    !audit.omittedVisualMeaningDetected &&
    !audit.unsupportedVisualMeaningDetected &&
    audit.issues.every((issue) => warningEligibleIssueClasses.has(issue.issueClass))
  ));
  if (!warningSafe) reasons.push('downstream impact가 없는 것으로 확인되지 않은 WARNING이 있다.');
  const unresolvedUnits = audits.filter((audit) => audit.decision === 'UNRESOLVED');
  const exclusionByUnit = new Map(exclusions.map((exclusion) => [exclusion.sourceUnitId, exclusion]));
  const unresolvedSafe = unresolvedUnits.every((audit) => {
    const exclusion = exclusionByUnit.get(audit.sourceUnitId);
    return exclusion !== undefined && Object.entries(exclusion)
      .filter(([key]) => key !== 'sourceUnitId')
      .every(([, value]) => value === true);
  });
  if (!unresolvedSafe) reasons.push('승인 조건을 모두 만족하지 않은 UNRESOLVED unit이 있다.');
  const eligible = options.artifactFrozen && reasons.length === 0;
  return ProductionEligibilitySchema.parse({
    artifactFrozen: options.artifactFrozen,
    productionEligible: eligible,
    decision: eligible ? 'ELIGIBLE' : unresolvedUnits.length > 0 &&
      !audits.some((audit) => ['BLOCKING', 'REPAIR_REQUIRED'].includes(audit.decision))
      ? 'HUMAN_EXCEPTION_REQUIRED'
      : 'INELIGIBLE',
    reasons,
    warningDownstreamImpactVerifiedNone: warningSafe,
    unresolvedExclusions: exclusions,
  });
}

export const AuditAdjudicationV2Schema = z.object({
  sourceUnitId: z.string().min(1),
  mediumAuditId: z.string().min(1),
  highAuditId: z.string().min(1),
  mediumDecision: AuditDecisionV2Schema,
  highDecision: AuditDecisionV2Schema,
  semanticSignaturesAgree: z.boolean(),
  resolution: z.enum([
    'PASS',
    'REPAIR_AND_REAUDIT',
    'HUMAN_REVIEW',
    'MUTATION_CHECK_REQUIRED',
  ]),
  majorityVoteUsed: z.literal(false),
}).strict();

export function isHighRiskSignature(signature: SemanticSignature): boolean {
  return signature.relationFamily !== 'ATTRIBUTE' || signature.coefficient !== null ||
    signature.exponent !== null || signature.polarity === 'NEGATIVE' ||
    signature.modality !== 'ASSERTED';
}
