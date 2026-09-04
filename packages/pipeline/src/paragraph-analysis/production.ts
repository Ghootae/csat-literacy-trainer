import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import {
  ParagraphAnalysisResultV3Schema,
  type ParagraphAnalysisResultV3,
} from './schema.js';
import {
  ParagraphDiagnosticGoldSchema,
  type ParagraphDiagnosticGold,
} from '../dialogue-experiment/schema.js';

export const PROSPECTIVE_PARAGRAPH_GOLD_MANIFEST_VERSION =
  'prospective-paragraph-gold-manifest-v1' as const;
export const PARAGRAPH_PROPOSITION_BUNDLE_VERSION =
  'paragraph-proposition-bundle-v1' as const;
export const PARAGRAPH_GOLD_AUDIT_VERSION = 'paragraph-gold-audit-v1' as const;
export const PARAGRAPH_GOLD_REPAIR_VERSION = 'paragraph-gold-repair-v1' as const;
export const PARAGRAPH_GOLD_STATUS_VERSION = 'paragraph-gold-production-status-v1' as const;

const HashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const ParagraphIdSchema = z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u);
const PropositionIdSchema = z.string().regex(/^P[1-9][0-9]*$/u);
const PropositionEdgeIdSchema = z.string().regex(/^E[1-9][0-9]*$/u);

export function artifactHash(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export function textHash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export const ParagraphSourceUnitSchema = z.object({
  paragraphId: ParagraphIdSchema,
  position: z.number().int().positive(),
  text: z.string().min(1),
  textHash: HashSchema,
  characterCount: z.number().int().positive(),
  sentenceCount: z.number().int().positive(),
  sourceLineStart: z.number().int().positive(),
  sourceLineEnd: z.number().int().positive(),
  attachedFootnoteCount: z.number().int().nonnegative(),
  textReferencesVisual: z.boolean(),
}).strict().superRefine((paragraph, context) => {
  if (paragraph.textHash !== textHash(paragraph.text)) {
    context.addIssue({
      code: 'custom',
      path: ['textHash'],
      message: '문단 원문 해시가 실제 텍스트와 다르다.',
    });
  }
  if (paragraph.sourceLineEnd < paragraph.sourceLineStart) {
    context.addIssue({
      code: 'custom',
      path: ['sourceLineEnd'],
      message: '문단의 끝 줄은 시작 줄보다 앞설 수 없다.',
    });
  }
});
export type ParagraphSourceUnit = z.infer<typeof ParagraphSourceUnitSchema>;

export const ProspectiveParagraphPassageSchema = z.object({
  sourceId: z.string().min(1),
  passageId: z.string().min(1),
  exam: z.string().min(1),
  title: z.string().min(1),
  sampleQuestionNumber: z.number().int().positive(),
  sampleSourceHash: HashSchema,
  problemSourceSnapshotFile: z.string().min(1),
  problemSourceSnapshotHash: HashSchema,
  resultFile: z.string().min(1),
  resultFileHash: HashSchema,
  enrichmentFile: z.string().min(1),
  enrichmentFileHash: HashSchema,
  passageHash: HashSchema,
  mediaCount: z.number().int().nonnegative(),
  paragraphCount: z.number().int().positive(),
  footnoteCount: z.number().int().nonnegative(),
  paragraphs: z.array(ParagraphSourceUnitSchema).min(1),
}).strict().superRefine((passage, context) => {
  if (passage.paragraphCount !== passage.paragraphs.length) {
    context.addIssue({
      code: 'custom',
      path: ['paragraphCount'],
      message: 'paragraphCount가 실제 문단 수와 다르다.',
    });
  }
  const positions = passage.paragraphs.map((paragraph) => paragraph.position);
  const expected = passage.paragraphs.map((_, index) => index + 1);
  if (positions.some((position, index) => position !== expected[index])) {
    context.addIssue({
      code: 'custom',
      path: ['paragraphs'],
      message: '문단 순서는 1부터 연속이어야 한다.',
    });
  }
  const ids = passage.paragraphs.map((paragraph) => paragraph.paragraphId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['paragraphs'], message: '문단 ID가 중복된다.' });
  }
  const attached = passage.paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.attachedFootnoteCount,
    0,
  );
  if (attached !== passage.footnoteCount) {
    context.addIssue({
      code: 'custom',
      path: ['footnoteCount'],
      message: '각주 합계가 문단별 부착 기록과 다르다.',
    });
  }
});
export type ProspectiveParagraphPassage = z.infer<typeof ProspectiveParagraphPassageSchema>;

export const ProspectiveParagraphGoldManifestSchema = z.object({
  manifestVersion: z.literal(PROSPECTIVE_PARAGRAPH_GOLD_MANIFEST_VERSION),
  createdAt: z.string().datetime(),
  sourceSampleManifest: z.string().min(1),
  sourceSampleManifestHash: HashSchema,
  passageCount: z.number().int().positive(),
  paragraphCount: z.number().int().positive(),
  footnoteCount: z.number().int().nonnegative(),
  passages: z.array(ProspectiveParagraphPassageSchema).min(1),
}).strict().superRefine((manifest, context) => {
  if (manifest.passageCount !== manifest.passages.length) {
    context.addIssue({
      code: 'custom',
      path: ['passageCount'],
      message: 'passageCount가 실제 지문 수와 다르다.',
    });
  }
  const sourceIds = manifest.passages.map((passage) => passage.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) {
    context.addIssue({ code: 'custom', path: ['passages'], message: 'sourceId가 중복된다.' });
  }
  const paragraphCount = manifest.passages.reduce(
    (sum, passage) => sum + passage.paragraphCount,
    0,
  );
  if (paragraphCount !== manifest.paragraphCount) {
    context.addIssue({
      code: 'custom',
      path: ['paragraphCount'],
      message: 'paragraphCount가 지문별 문단 합계와 다르다.',
    });
  }
  const footnoteCount = manifest.passages.reduce(
    (sum, passage) => sum + passage.footnoteCount,
    0,
  );
  if (footnoteCount !== manifest.footnoteCount) {
    context.addIssue({
      code: 'custom',
      path: ['footnoteCount'],
      message: 'footnoteCount가 지문별 각주 합계와 다르다.',
    });
  }
});
export type ProspectiveParagraphGoldManifest = z.infer<
  typeof ProspectiveParagraphGoldManifestSchema
>;

export interface SplitParagraph {
  readonly position: number;
  readonly text: string;
  readonly sourceLineStart: number;
  readonly sourceLineEnd: number;
  readonly attachedFootnoteCount: number;
}

const FOOTNOTE = /^\s*[*＊※]/u;
// `표면`, `표현`처럼 `표`로 시작하는 일반 단어를 시각 자료 참조로 오인하지 않는다.
const VISUAL_REFERENCE = /(?:(?:위|아래|다음)\s*(?:그림|도표|그래프|표)|<\s*(?:그림|표)\s*>|(?:그림|도표|그래프)(?:\s*\d+)?|표(?:\s*\d+)?(?=\s|[은는이가을를의에서와과처럼]|$))/u;

/**
 * 원자료의 줄 단위 문단 경계를 보존하되, `* 용어: 설명` 형태의 각주는 바로 앞 문단에
 * 붙인다. 각주를 독립적인 학습 문단으로 만드는 것을 막기 위한 결정적 전처리다.
 */
export function splitPassageParagraphs(passage: string): SplitParagraph[] {
  const paragraphs: Array<{
    position: number;
    text: string;
    sourceLineStart: number;
    sourceLineEnd: number;
    attachedFootnoteCount: number;
  }> = [];
  const lines = passage.replaceAll('\r\n', '\n').split('\n');
  for (const [index, rawLine] of lines.entries()) {
    const text = rawLine.trim();
    if (text === '') continue;
    const lineNumber = index + 1;
    if (FOOTNOTE.test(text)) {
      const previous = paragraphs.at(-1);
      if (previous === undefined) {
        throw new Error(`첫 본문 문단보다 앞선 각주가 있다: ${text}`);
      }
      previous.text = `${previous.text}\n${text}`;
      previous.sourceLineEnd = lineNumber;
      previous.attachedFootnoteCount += 1;
      continue;
    }
    paragraphs.push({
      position: paragraphs.length + 1,
      text,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber,
      attachedFootnoteCount: 0,
    });
  }
  if (paragraphs.length === 0) throw new Error('지문에 본문 문단이 없다.');
  return paragraphs;
}

export function sentenceList(text: string): readonly { id: string; text: string }[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence, index) => ({ id: `S${index + 1}`, text: sentence }));
  return sentences.length > 0 ? sentences : [{ id: 'S1', text }];
}

export function paragraphSourceUnit(options: {
  readonly sourceId: string;
  readonly paragraph: SplitParagraph;
}): ParagraphSourceUnit {
  const paragraphId = `${options.sourceId}-p${options.paragraph.position}`;
  return ParagraphSourceUnitSchema.parse({
    paragraphId,
    position: options.paragraph.position,
    text: options.paragraph.text,
    textHash: textHash(options.paragraph.text),
    characterCount: options.paragraph.text.length,
    sentenceCount: sentenceList(options.paragraph.text).length,
    sourceLineStart: options.paragraph.sourceLineStart,
    sourceLineEnd: options.paragraph.sourceLineEnd,
    attachedFootnoteCount: options.paragraph.attachedFootnoteCount,
    textReferencesVisual: VISUAL_REFERENCE.test(options.paragraph.text),
  });
}

export const ParagraphPropositionSchema = z.object({
  id: PropositionIdSchema,
  description: z.string().min(1),
  evidence: z.string().min(1),
}).strict();

export const ParagraphPropositionEdgeSchema = z.object({
  id: PropositionEdgeIdSchema,
  fromPropositionIds: z.array(PropositionIdSchema).min(1),
  toPropositionIds: z.array(PropositionIdSchema).min(1),
  type: z.enum([
    '정의',
    '분류',
    '대응',
    '원인-결과',
    '근거-주장',
    '조건-결과',
    '목적-수단',
    '대조',
    '양보',
    '구체화',
    '예시',
    '종합',
    '한계',
    '수정-전환',
  ]),
  direction: z.string().min(1),
  description: z.string().min(1),
}).strict();

export const ParagraphPropositionBundleSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_PROPOSITION_BUNDLE_VERSION),
  sourceId: z.string().min(1),
  passageId: z.string().min(1),
  paragraphId: ParagraphIdSchema,
  position: z.number().int().positive(),
  passageHash: HashSchema,
  paragraphHash: HashSchema,
  analysisRunId: z.string().min(1),
  analysisSchemaVersion: z.literal('paragraph-analysis-openai-v3'),
  analysisPromptVersion: z.literal('paragraph-analysis-prompt-v3.1'),
  derivation: z.enum(['INITIAL_ANALYSIS', 'AUDIT_REPAIR']),
  parentBundleHash: HashSchema.nullable(),
  repairRunId: z.string().min(1).nullable(),
  propositions: z.array(ParagraphPropositionSchema).min(1),
  propositionEdges: z.array(ParagraphPropositionEdgeSchema),
  generationStatus: z.literal('STATIC_VALIDATED'),
  auditStatus: z.literal('NOT_AUDITED'),
  productionEligible: z.literal(false),
}).strict().superRefine((bundle, context) => {
  if (
    bundle.derivation === 'INITIAL_ANALYSIS' &&
    (bundle.parentBundleHash !== null || bundle.repairRunId !== null)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['derivation'],
      message: '최초 분석 Bundle에는 수리 계보가 있을 수 없다.',
    });
  }
  if (
    bundle.derivation === 'AUDIT_REPAIR' &&
    (bundle.parentBundleHash === null || bundle.repairRunId === null)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['derivation'],
      message: '감사 수리 Bundle에는 부모 해시와 수리 실행 ID가 필요하다.',
    });
  }
  const propositionIds = bundle.propositions.map((proposition) => proposition.id);
  if (new Set(propositionIds).size !== propositionIds.length) {
    context.addIssue({ code: 'custom', path: ['propositions'], message: '명제 ID가 중복된다.' });
  }
  const edgeIds = bundle.propositionEdges.map((edge) => edge.id);
  if (new Set(edgeIds).size !== edgeIds.length) {
    context.addIssue({ code: 'custom', path: ['propositionEdges'], message: '간선 ID가 중복된다.' });
  }
  const allowed = new Set(propositionIds);
  for (const [index, edge] of bundle.propositionEdges.entries()) {
    for (const propositionId of [...edge.fromPropositionIds, ...edge.toPropositionIds]) {
      if (!allowed.has(propositionId)) {
        context.addIssue({
          code: 'custom',
          path: ['propositionEdges', index],
          message: `존재하지 않는 명제 참조: ${propositionId}`,
        });
      }
    }
  }
});
export type ParagraphPropositionBundle = z.infer<typeof ParagraphPropositionBundleSchema>;

export function createParagraphPropositionBundle(options: {
  readonly sourceId: string;
  readonly passageId: string;
  readonly position: number;
  readonly passageHash: string;
  readonly analysisRunId: string;
  readonly analysis: ParagraphAnalysisResultV3;
}): ParagraphPropositionBundle {
  const analysis = ParagraphAnalysisResultV3Schema.parse(options.analysis);
  return ParagraphPropositionBundleSchema.parse({
    schemaVersion: PARAGRAPH_PROPOSITION_BUNDLE_VERSION,
    sourceId: options.sourceId,
    passageId: options.passageId,
    paragraphId: analysis.paragraphId,
    position: options.position,
    passageHash: options.passageHash,
    paragraphHash: textHash(analysis.paragraphText),
    analysisRunId: options.analysisRunId,
    analysisSchemaVersion: analysis.schemaVersion,
    analysisPromptVersion: 'paragraph-analysis-prompt-v3.1',
    derivation: 'INITIAL_ANALYSIS',
    parentBundleHash: null,
    repairRunId: null,
    propositions: analysis.propositions,
    propositionEdges: analysis.propositionEdges,
    generationStatus: 'STATIC_VALIDATED',
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

export const ParagraphGoldAuditIssueSchema = z.object({
  issueId: z.string().regex(/^ISSUE[1-9][0-9]*$/u),
  severity: z.enum(['WARNING', 'REPAIR_REQUIRED', 'BLOCKING']),
  category: z.enum([
    'OMITTED_MEANING',
    'UNSUPPORTED_MEANING',
    'DIRECTION',
    'QUANTITY_OR_RATIO',
    'POLARITY_OR_NEGATION',
    'CONDITION_OR_SCOPE',
    'MODALITY',
    'ENTITY_OR_ROLE',
    'CENTRALITY',
    'AXIS_COVERAGE',
    'INTERNAL_CONFLICT',
    'VISUAL_DEPENDENCY',
    'OTHER',
  ]),
  targetType: z.enum([
    'PROPOSITION',
    'PROPOSITION_EDGE',
    'CENTRAL_STORY',
    'CENTRAL_AXIS',
    'CORE_RELATION',
    'BUNDLE',
  ]),
  targetId: z.string().min(1).nullable(),
  description: z.string().min(1),
  sourceEvidence: z.string().min(1),
  suggestedCorrection: z.string().min(1).nullable(),
}).strict();
export type ParagraphGoldAuditIssue = z.infer<typeof ParagraphGoldAuditIssueSchema>;

export const ParagraphGoldAuditOutputSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_GOLD_AUDIT_VERSION),
  sourceId: z.string().min(1),
  paragraphId: ParagraphIdSchema,
  decision: z.enum(['PASS', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED']),
  summary: z.string().min(1),
  reviewedPropositionIds: z.array(PropositionIdSchema),
  reviewedPropositionEdgeIds: z.array(PropositionEdgeIdSchema),
  reviewedCentralAxisIds: z.array(z.string().regex(/^AX[1-9][0-9]*$/u)),
  reviewedCoreRelationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)),
  omittedMeaningDetected: z.boolean(),
  unsupportedMeaningDetected: z.boolean(),
  visualDependencyDetected: z.boolean(),
  issues: z.array(ParagraphGoldAuditIssueSchema),
}).strict();
export type ParagraphGoldAuditOutput = z.infer<typeof ParagraphGoldAuditOutputSchema>;

function assertExactIdCoverage(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (new Set(actual).size !== actual.length) {
    throw new Error(`paragraph gold audit: ${label} 검토 ID가 중복된다.`);
  }
  const actualSet = new Set(actual);
  if (actualSet.size !== expected.length || expected.some((id) => !actualSet.has(id))) {
    throw new Error(`paragraph gold audit: ${label} coverage가 완전하지 않다.`);
  }
}

export function validateParagraphGoldAudit(options: {
  readonly audit: ParagraphGoldAuditOutput;
  readonly sourceId: string;
  readonly diagnosticGold: ParagraphDiagnosticGold;
  readonly propositionBundle: ParagraphPropositionBundle;
}): ParagraphGoldAuditOutput {
  const audit = ParagraphGoldAuditOutputSchema.parse(options.audit);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(options.diagnosticGold);
  const bundle = ParagraphPropositionBundleSchema.parse(options.propositionBundle);
  if (audit.sourceId !== options.sourceId || bundle.sourceId !== options.sourceId) {
    throw new Error('paragraph gold audit: sourceId가 감사 입력과 다르다.');
  }
  if (
    audit.paragraphId !== diagnosticGold.paragraphId ||
    audit.paragraphId !== bundle.paragraphId
  ) {
    throw new Error('paragraph gold audit: paragraphId가 후보 산출물과 다르다.');
  }

  assertExactIdCoverage(
    audit.reviewedPropositionIds,
    bundle.propositions.map((proposition) => proposition.id),
    '명제',
  );
  assertExactIdCoverage(
    audit.reviewedPropositionEdgeIds,
    bundle.propositionEdges.map((edge) => edge.id),
    '명제 간선',
  );
  assertExactIdCoverage(
    audit.reviewedCentralAxisIds,
    diagnosticGold.centralAxes.map((axis) => axis.id),
    '중심축',
  );
  assertExactIdCoverage(
    audit.reviewedCoreRelationIds,
    diagnosticGold.coreRelations.map((relation) => relation.id),
    '핵심 관계',
  );

  const targetIds = {
    PROPOSITION: new Set(bundle.propositions.map((proposition) => proposition.id)),
    PROPOSITION_EDGE: new Set(bundle.propositionEdges.map((edge) => edge.id)),
    CENTRAL_STORY: new Set(['centralStory']),
    CENTRAL_AXIS: new Set(diagnosticGold.centralAxes.map((axis) => axis.id)),
    CORE_RELATION: new Set(diagnosticGold.coreRelations.map((relation) => relation.id)),
    BUNDLE: new Set(['bundle']),
  } satisfies Record<ParagraphGoldAuditIssue['targetType'], ReadonlySet<string>>;
  for (const issue of audit.issues) {
    if (issue.targetId !== null && !targetIds[issue.targetType].has(issue.targetId)) {
      throw new Error(
        `paragraph gold audit: ${issue.issueId}가 존재하지 않는 ${issue.targetType} ${issue.targetId}를 가리킨다.`,
      );
    }
  }

  const hasRepair = audit.issues.some((issue) => issue.severity === 'REPAIR_REQUIRED');
  const hasBlocking = audit.issues.some((issue) => issue.severity === 'BLOCKING');
  if (audit.decision === 'PASS') {
    if (
      hasRepair ||
      hasBlocking ||
      audit.omittedMeaningDetected ||
      audit.unsupportedMeaningDetected ||
      audit.visualDependencyDetected
    ) {
      throw new Error('paragraph gold audit: PASS에는 의미 결함이나 시각 의존성이 남을 수 없다.');
    }
  } else if (audit.decision === 'REPAIR_REQUIRED') {
    if (!hasRepair || hasBlocking) {
      throw new Error('paragraph gold audit: REPAIR_REQUIRED에는 수리 쟁점만 있어야 한다.');
    }
  } else if (audit.decision === 'BLOCKING' && !hasBlocking) {
    throw new Error('paragraph gold audit: BLOCKING에는 BLOCKING 쟁점이 필요하다.');
  }
  if (audit.decision !== 'PASS' && audit.issues.length === 0) {
    throw new Error('paragraph gold audit: 미통과 결정에는 쟁점 설명이 필요하다.');
  }
  return audit;
}

// Responses API Structured Output은 모든 속성이 required여야 한다. 운영 골드의 선택 필드를
// 그대로 재사용하지 않고 수리 응답에서는 빈 배열까지 명시적으로 반환하게 한다.
const RepairDiagnosticGoldSchema = z.object({
  paragraphId: z.string().min(1),
  paragraphText: z.string().min(1),
  centralObject: z.string().min(1),
  centralStory: z.string().min(1),
  centralAxes: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    relationIds: z.array(z.string().min(1)).min(1),
  }).strict()).min(1),
  coreRelations: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
  }).strict()).min(1),
  keyMappings: z.array(z.object({
    left: z.string().min(1),
    right: z.string().min(1),
  }).strict()),
  supportingConcepts: z.array(z.string().min(1)),
}).strict().superRefine((gold, context) => {
  const relationIds = new Set(gold.coreRelations.map((relation) => relation.id));
  const axisIds = gold.centralAxes.map((axis) => axis.id);
  if (new Set(axisIds).size !== axisIds.length) {
    context.addIssue({ code: 'custom', path: ['centralAxes'], message: 'central axis ID 중복' });
  }
  for (const [index, axis] of gold.centralAxes.entries()) {
    for (const relationId of axis.relationIds) {
      if (!relationIds.has(relationId)) {
        context.addIssue({
          code: 'custom',
          path: ['centralAxes', index, 'relationIds'],
          message: `존재하지 않는 relationId: ${relationId}`,
        });
      }
    }
  }
});

export const ParagraphGoldRepairOutputSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_GOLD_REPAIR_VERSION),
  sourceId: z.string().min(1),
  paragraphId: ParagraphIdSchema,
  resolvedIssueIds: z.array(z.string().regex(/^ISSUE[1-9][0-9]*$/u)).min(1),
  summary: z.string().min(1),
  diagnosticGold: RepairDiagnosticGoldSchema,
  propositions: z.array(ParagraphPropositionSchema).min(1),
  propositionEdges: z.array(ParagraphPropositionEdgeSchema),
}).strict();
export type ParagraphGoldRepairOutput = z.infer<typeof ParagraphGoldRepairOutputSchema>;

export function validateParagraphGoldRepair(options: {
  readonly repair: ParagraphGoldRepairOutput;
  readonly sourceId: string;
  readonly paragraphText: string;
  readonly audit: ParagraphGoldAuditOutput;
}): ParagraphGoldRepairOutput {
  const repair = ParagraphGoldRepairOutputSchema.parse(options.repair);
  if (repair.sourceId !== options.sourceId || repair.paragraphId !== options.audit.paragraphId) {
    throw new Error('paragraph gold repair: 원천 식별자가 감사 결과와 다르다.');
  }
  if (
    repair.diagnosticGold.paragraphId !== repair.paragraphId ||
    repair.diagnosticGold.paragraphText !== options.paragraphText
  ) {
    throw new Error('paragraph gold repair: 원문 문단의 ID 또는 텍스트를 변경했다.');
  }
  const issueIds = new Set(options.audit.issues.map((issue) => issue.issueId));
  if (
    new Set(repair.resolvedIssueIds).size !== repair.resolvedIssueIds.length ||
    repair.resolvedIssueIds.some((issueId) => !issueIds.has(issueId))
  ) {
    throw new Error('paragraph gold repair: 존재하지 않거나 중복된 감사 쟁점을 수리했다고 보고했다.');
  }
  const propositionIds = new Set(repair.propositions.map((proposition) => proposition.id));
  if (propositionIds.size !== repair.propositions.length) {
    throw new Error('paragraph gold repair: 명제 ID가 중복된다.');
  }
  const edgeIds = new Set<string>();
  for (const edge of repair.propositionEdges) {
    if (edgeIds.has(edge.id)) throw new Error('paragraph gold repair: 간선 ID가 중복된다.');
    edgeIds.add(edge.id);
    if (
      [...edge.fromPropositionIds, ...edge.toPropositionIds]
        .some((propositionId) => !propositionIds.has(propositionId))
    ) {
      throw new Error('paragraph gold repair: 간선이 존재하지 않는 명제를 참조한다.');
    }
  }
  return repair;
}

export function createRepairedParagraphPropositionBundle(options: {
  readonly original: ParagraphPropositionBundle;
  readonly repair: ParagraphGoldRepairOutput;
  readonly repairRunId: string;
}): ParagraphPropositionBundle {
  const original = ParagraphPropositionBundleSchema.parse(options.original);
  return ParagraphPropositionBundleSchema.parse({
    ...original,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(original),
    repairRunId: options.repairRunId,
    propositions: options.repair.propositions,
    propositionEdges: options.repair.propositionEdges,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

export const ParagraphGoldProductionStatusSchema = z.object({
  statusVersion: z.literal(PARAGRAPH_GOLD_STATUS_VERSION),
  sourceId: z.string().min(1),
  paragraphId: ParagraphIdSchema,
  diagnosticGoldHash: HashSchema,
  propositionBundleHash: HashSchema,
  auditHash: HashSchema,
  status: z.enum(['AGENT_AUDITED', 'REPAIR_REQUIRED', 'REVIEW_REQUIRED']),
  reason: z.string().min(1),
  productionEligible: z.boolean(),
}).strict().superRefine((status, context) => {
  if (status.productionEligible !== (status.status === 'AGENT_AUDITED')) {
    context.addIssue({
      code: 'custom',
      path: ['productionEligible'],
      message: 'AGENT_AUDITED만 productionEligible일 수 있다.',
    });
  }
});
export type ParagraphGoldProductionStatus = z.infer<
  typeof ParagraphGoldProductionStatusSchema
>;

export function deriveParagraphGoldProductionStatus(options: {
  readonly sourceId: string;
  readonly diagnosticGold: ParagraphDiagnosticGold;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly audit: ParagraphGoldAuditOutput;
}): ParagraphGoldProductionStatus {
  const audit = validateParagraphGoldAudit(options);
  const status = audit.decision === 'PASS'
    ? 'AGENT_AUDITED'
    : audit.decision === 'REPAIR_REQUIRED'
      ? 'REPAIR_REQUIRED'
      : 'REVIEW_REQUIRED';
  return ParagraphGoldProductionStatusSchema.parse({
    statusVersion: PARAGRAPH_GOLD_STATUS_VERSION,
    sourceId: options.sourceId,
    paragraphId: audit.paragraphId,
    diagnosticGoldHash: artifactHash(options.diagnosticGold),
    propositionBundleHash: artifactHash(options.propositionBundle),
    auditHash: artifactHash(audit),
    status,
    reason: audit.summary,
    productionEligible: status === 'AGENT_AUDITED',
  });
}
