import { z } from 'zod/v4';

import { ParagraphDiagnosticGoldSchema, type ParagraphDiagnosticGold } from '../dialogue-experiment/schema.js';
import {
  ParagraphGoldAuditIssueSchema,
  ParagraphPropositionBundleSchema,
  ParagraphPropositionEdgeSchema,
  ParagraphPropositionSchema,
  artifactHash,
  type ParagraphGoldAuditIssue,
  type ParagraphPropositionBundle,
} from './production.js';
import { ParagraphGoldAuditInputSchema, type ParagraphGoldAuditInput } from './production-runtime.js';

export const PARAGRAPH_GOLD_AUDIT_V2_VERSION = 'paragraph-gold-audit-v2' as const;
export const PARAGRAPH_GOLD_PATCH_REPAIR_VERSION = 'paragraph-gold-patch-repair-v1' as const;

const DecisionSchema = z.enum(['PASS', 'REPAIR_REQUIRED', 'BLOCKING', 'UNRESOLVED']);
const CheckStatusSchema = z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']);
const IssueIdSchema = z.string().regex(/^ISSUE[1-9][0-9]*$/u);

export const AuditLayerIdSchema = z.enum([
  'PROPOSITION_SOURCE_FIDELITY',
  'EDGE_SOURCE_LICENSE',
  'CENTRAL_STORY_SELECTION',
  'DIAGNOSTIC_INTERNAL_COVERAGE',
  'CROSS_LAYER_CONSISTENCY',
]);

export const RegressionCheckIdSchema = z.enum([
  'PURPOSE_MEANS_OVERREACH',
  'UNSUPPORTED_TEMPORAL_QUALIFIER',
  'PRINCIPLE_EXCEPTION_COVERAGE',
  'NECESSARY_CONDITION_MODALITY',
  'CONDITIONAL_BRANCH_COVERAGE',
]);

const AuditCheckSchema = z.object({
  checkId: z.string().min(1),
  status: CheckStatusSchema,
  questionAnswered: z.string().min(1),
  sourceEvidence: z.string().min(1),
  checkedTargetIds: z.array(z.string().min(1)),
  issueIds: z.array(IssueIdSchema),
}).strict();

const CentralStoryMeaningCheckSchema = z.object({
  meaningId: z.string().regex(/^CSM[1-9][0-9]*$/u),
  centralStoryMeaning: z.string().min(1),
  sourceSupported: z.boolean(),
  centralAxisIds: z.array(z.string().regex(/^AX[1-9][0-9]*$/u)),
  coreRelationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)),
  status: z.enum(['PASS', 'FAIL']),
  issueIds: z.array(IssueIdSchema),
}).strict();

export const ParagraphGoldAuditV2OutputSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_GOLD_AUDIT_V2_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  decision: DecisionSchema,
  summary: z.string().min(1),
  reviewedPropositionIds: z.array(z.string().regex(/^P[1-9][0-9]*$/u)),
  reviewedPropositionEdgeIds: z.array(z.string().regex(/^E[1-9][0-9]*$/u)),
  reviewedCentralAxisIds: z.array(z.string().regex(/^AX[1-9][0-9]*$/u)),
  reviewedCoreRelationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)),
  layerChecks: z.array(AuditCheckSchema.extend({ checkId: AuditLayerIdSchema }).strict()),
  regressionChecks: z.array(AuditCheckSchema.extend({ checkId: RegressionCheckIdSchema }).strict()),
  centralStoryMeaningChecks: z.array(CentralStoryMeaningCheckSchema).min(1),
  omittedPropositionMeaningDetected: z.boolean(),
  unsupportedMeaningDetected: z.boolean(),
  visualDependencyDetected: z.boolean(),
  issues: z.array(ParagraphGoldAuditIssueSchema),
}).strict();
export type ParagraphGoldAuditV2Output = z.infer<typeof ParagraphGoldAuditV2OutputSchema>;

function assertExact(actual: readonly string[], expected: readonly string[], label: string): void {
  if (new Set(actual).size !== actual.length) throw new Error(`${label}: 중복 ID`);
  const actualSet = new Set(actual);
  if (actual.length !== expected.length || expected.some((id) => !actualSet.has(id))) {
    throw new Error(`${label}: coverage 불완전`);
  }
}

export function validateParagraphGoldAuditV2(
  value: ParagraphGoldAuditV2Output,
  inputValue: ParagraphGoldAuditInput,
): ParagraphGoldAuditV2Output {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = ParagraphGoldAuditV2OutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('audit v2: 원천 ID 불일치');
  }
  assertExact(output.reviewedPropositionIds, input.propositionBundle.propositions.map((item) => item.id), 'audit v2 명제');
  assertExact(output.reviewedPropositionEdgeIds, input.propositionBundle.propositionEdges.map((item) => item.id), 'audit v2 간선');
  assertExact(output.reviewedCentralAxisIds, input.diagnosticGold.centralAxes.map((item) => item.id), 'audit v2 축');
  assertExact(output.reviewedCoreRelationIds, input.diagnosticGold.coreRelations.map((item) => item.id), 'audit v2 핵심 관계');
  assertExact(output.layerChecks.map((item) => item.checkId), AuditLayerIdSchema.options, 'audit v2 층위 검사');
  assertExact(output.regressionChecks.map((item) => item.checkId), RegressionCheckIdSchema.options, 'audit v2 회귀 검사');

  const issueIds = output.issues.map((issue) => issue.issueId);
  assertExact(issueIds, issueIds.map((_, index) => `ISSUE${index + 1}`), 'audit v2 issue 순서');
  const issueIdSet = new Set(issueIds);
  const layerIssueIds = new Set(output.layerChecks.flatMap((check) => check.issueIds));
  for (const check of [...output.layerChecks, ...output.regressionChecks]) {
    if ((check.status === 'FAIL') !== (check.issueIds.length > 0)) {
      throw new Error(`audit v2: ${check.checkId} 상태와 issueIds 불일치`);
    }
    if (check.issueIds.some((id) => !issueIdSet.has(id))) {
      throw new Error(`audit v2: ${check.checkId}가 존재하지 않는 issue 참조`);
    }
  }
  if (output.issues.some((issue) => !layerIssueIds.has(issue.issueId))) {
    throw new Error('audit v2: 층위 검사에 연결되지 않은 issue');
  }

  const propositionIds = new Set(input.propositionBundle.propositions.map((item) => item.id));
  const edgeIds = new Set(input.propositionBundle.propositionEdges.map((item) => item.id));
  const axisIds = new Set(input.diagnosticGold.centralAxes.map((item) => item.id));
  const relationIds = new Set(input.diagnosticGold.coreRelations.map((item) => item.id));
  const validCheckTargetIds = new Set([
    ...propositionIds,
    ...edgeIds,
    ...axisIds,
    ...relationIds,
    'centralObject',
    'centralStory',
    'keyMappings',
    'supportingConcepts',
    'bundle',
  ]);
  for (const check of [...output.layerChecks, ...output.regressionChecks]) {
    if (check.checkedTargetIds.some((id) => !validCheckTargetIds.has(id))) {
      throw new Error(`audit v2: ${check.checkId}의 존재하지 않는 검사 target`);
    }
  }
  const validTargets = {
    PROPOSITION: propositionIds,
    PROPOSITION_EDGE: edgeIds,
    CENTRAL_STORY: new Set(['centralStory']),
    CENTRAL_AXIS: axisIds,
    CORE_RELATION: relationIds,
    BUNDLE: new Set(['bundle']),
  } satisfies Record<ParagraphGoldAuditIssue['targetType'], ReadonlySet<string>>;
  for (const issue of output.issues) {
    if (issue.targetId === null || !validTargets[issue.targetType].has(issue.targetId)) {
      throw new Error(`audit v2: ${issue.issueId}의 수리 target이 구체적이지 않음`);
    }
  }

  for (const meaning of output.centralStoryMeaningChecks) {
    if (meaning.centralAxisIds.some((id) => !axisIds.has(id)) ||
        meaning.coreRelationIds.some((id) => !relationIds.has(id))) {
      throw new Error(`audit v2: ${meaning.meaningId}의 존재하지 않는 진단 참조`);
    }
    if ((meaning.status === 'FAIL') !== (meaning.issueIds.length > 0) ||
        meaning.issueIds.some((id) => !issueIdSet.has(id))) {
      throw new Error(`audit v2: ${meaning.meaningId} 상태 또는 issue 참조 불일치`);
    }
    if (meaning.status === 'PASS' &&
        (!meaning.sourceSupported || meaning.centralAxisIds.length === 0 || meaning.coreRelationIds.length === 0)) {
      throw new Error(`audit v2: ${meaning.meaningId}의 무손실 연결 불완전`);
    }
  }

  const hasRepair = output.issues.some((issue) => issue.severity === 'REPAIR_REQUIRED');
  const hasBlocking = output.issues.some((issue) => issue.severity === 'BLOCKING');
  const hasFail = [...output.layerChecks, ...output.regressionChecks].some((check) => check.status === 'FAIL') ||
    output.centralStoryMeaningChecks.some((check) => check.status === 'FAIL');
  if (output.decision === 'PASS' && (
    output.issues.length > 0 || hasFail || output.omittedPropositionMeaningDetected ||
    output.unsupportedMeaningDetected || output.visualDependencyDetected
  )) throw new Error('audit v2: 결함이 있는 PASS');
  if (output.decision === 'REPAIR_REQUIRED' && (!hasRepair || hasBlocking)) {
    throw new Error('audit v2: REPAIR_REQUIRED 판정 불일치');
  }
  if (output.decision === 'BLOCKING' && !hasBlocking) throw new Error('audit v2: BLOCKING issue 없음');
  if (output.decision !== 'PASS' && output.issues.length === 0) throw new Error('audit v2: 미통과 issue 없음');
  return output;
}

const CentralAxisValueSchema = z.object({
  id: z.string().regex(/^AX[1-9][0-9]*$/u),
  description: z.string().min(1),
  relationIds: z.array(z.string().regex(/^MR[1-9][0-9]*$/u)).min(1),
}).strict();
const CoreRelationValueSchema = z.object({
  id: z.string().regex(/^MR[1-9][0-9]*$/u),
  description: z.string().min(1),
}).strict();
const KeyMappingSchema = z.object({ left: z.string().min(1), right: z.string().min(1) }).strict();

export const PatchOperationNameSchema = z.enum([
  'REPLACE_CENTRAL_OBJECT',
  'REPLACE_CENTRAL_STORY',
  'REPLACE_PROPOSITION',
  'ADD_PROPOSITION',
  'REMOVE_PROPOSITION',
  'REPLACE_PROPOSITION_EDGE',
  'ADD_PROPOSITION_EDGE',
  'REMOVE_PROPOSITION_EDGE',
  'REPLACE_CENTRAL_AXIS',
  'ADD_CENTRAL_AXIS',
  'REMOVE_CENTRAL_AXIS',
  'REPLACE_CORE_RELATION',
  'ADD_CORE_RELATION',
  'REMOVE_CORE_RELATION',
  'REPLACE_KEY_MAPPINGS',
  'REPLACE_SUPPORTING_CONCEPTS',
]);

const PatchOperationSchema = z.object({
  patchId: z.string().regex(/^PATCH[1-9][0-9]*$/u),
  resolvedIssueIds: z.array(IssueIdSchema).min(1),
  operation: PatchOperationNameSchema,
  targetId: z.string().min(1).nullable(),
  reason: z.string().min(1),
  textValue: z.string().min(1).nullable(),
  propositionValue: ParagraphPropositionSchema.nullable(),
  propositionEdgeValue: ParagraphPropositionEdgeSchema.nullable(),
  centralAxisValue: CentralAxisValueSchema.nullable(),
  coreRelationValue: CoreRelationValueSchema.nullable(),
  keyMappingsValue: z.array(KeyMappingSchema),
  supportingConceptsValue: z.array(z.string().min(1)),
}).strict();
export type ParagraphGoldPatchOperation = z.infer<typeof PatchOperationSchema>;

export const ParagraphGoldPatchRepairOutputSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_GOLD_PATCH_REPAIR_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  summary: z.string().min(1),
  patches: z.array(PatchOperationSchema).min(1),
}).strict();
export type ParagraphGoldPatchRepairOutput = z.infer<typeof ParagraphGoldPatchRepairOutputSchema>;

function replaceById<T extends { readonly id: string }>(items: T[], targetId: string, value: T): void {
  const index = items.findIndex((item) => item.id === targetId);
  if (index === -1 || value.id !== targetId) throw new Error(`patch repair: 교체 target 불일치 ${targetId}`);
  items[index] = value;
}

function removeById<T extends { readonly id: string }>(items: T[], targetId: string): void {
  const index = items.findIndex((item) => item.id === targetId);
  if (index === -1) throw new Error(`patch repair: 삭제 target 없음 ${targetId}`);
  items.splice(index, 1);
}

function addUnique<T extends { readonly id: string }>(items: T[], value: T): void {
  if (items.some((item) => item.id === value.id)) throw new Error(`patch repair: 추가 ID 중복 ${value.id}`);
  items.push(value);
}

function assertPayloadShape(patch: ParagraphGoldPatchOperation): void {
  const populated = [
    patch.textValue !== null ? 'text' : null,
    patch.propositionValue !== null ? 'proposition' : null,
    patch.propositionEdgeValue !== null ? 'edge' : null,
    patch.centralAxisValue !== null ? 'axis' : null,
    patch.coreRelationValue !== null ? 'relation' : null,
    patch.operation === 'REPLACE_KEY_MAPPINGS' ? 'mappings' : null,
    patch.operation === 'REPLACE_SUPPORTING_CONCEPTS' ? 'concepts' : null,
  ].filter(Boolean);
  const removal = patch.operation.startsWith('REMOVE_');
  if ((!removal && populated.length !== 1) || (removal && populated.length !== 0)) {
    throw new Error(`patch repair: ${patch.patchId} payload 개수 불일치`);
  }
  if (!['REPLACE_KEY_MAPPINGS', 'REPLACE_SUPPORTING_CONCEPTS'].includes(patch.operation) &&
      (patch.keyMappingsValue.length > 0 || patch.supportingConceptsValue.length > 0)) {
    throw new Error(`patch repair: ${patch.patchId}의 사용하지 않는 배열 payload`);
  }
}

export function applyParagraphGoldPatchRepair(options: {
  readonly input: ParagraphGoldAuditInput;
  readonly audit: ParagraphGoldAuditV2Output;
  readonly repair: ParagraphGoldPatchRepairOutput;
  readonly repairRunId: string;
}): { readonly diagnosticGold: ParagraphDiagnosticGold; readonly propositionBundle: ParagraphPropositionBundle } {
  const input = ParagraphGoldAuditInputSchema.parse(options.input);
  const audit = validateParagraphGoldAuditV2(options.audit, input);
  const repair = ParagraphGoldPatchRepairOutputSchema.parse(options.repair);
  if (audit.decision !== 'REPAIR_REQUIRED') throw new Error('patch repair: REPAIR_REQUIRED만 수리 가능');
  if (repair.sourceId !== input.sourceId || repair.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('patch repair: 원천 ID 불일치');
  }
  assertExact(repair.patches.map((item) => item.patchId), repair.patches.map((_, i) => `PATCH${i + 1}`), 'patch repair 순서');
  const repairableIssueIds = new Set(
    audit.issues.filter((issue) => issue.severity === 'REPAIR_REQUIRED').map((issue) => issue.issueId),
  );
  const resolved = new Set(repair.patches.flatMap((patch) => patch.resolvedIssueIds));
  if ([...resolved].some((id) => !repairableIssueIds.has(id)) ||
      [...repairableIssueIds].some((id) => !resolved.has(id))) {
    throw new Error('patch repair: 감사 issue coverage 불일치');
  }

  const diagnostic = structuredClone(input.diagnosticGold);
  const propositions = structuredClone(input.propositionBundle.propositions);
  const edges = structuredClone(input.propositionBundle.propositionEdges);
  for (const patch of repair.patches) {
    assertPayloadShape(patch);
    const targetId = patch.targetId;
    switch (patch.operation) {
      case 'REPLACE_CENTRAL_OBJECT':
        if (targetId !== 'centralObject' || patch.textValue === null) throw new Error('patch repair: centralObject payload');
        diagnostic.centralObject = patch.textValue;
        break;
      case 'REPLACE_CENTRAL_STORY':
        if (targetId !== 'centralStory' || patch.textValue === null) throw new Error('patch repair: centralStory payload');
        diagnostic.centralStory = patch.textValue;
        break;
      case 'REPLACE_PROPOSITION':
        if (targetId === null || patch.propositionValue === null) throw new Error('patch repair: proposition payload');
        replaceById(propositions, targetId, patch.propositionValue);
        break;
      case 'ADD_PROPOSITION':
        if (targetId === null || patch.propositionValue === null || targetId !== patch.propositionValue.id) throw new Error('patch repair: add proposition payload');
        addUnique(propositions, patch.propositionValue);
        break;
      case 'REMOVE_PROPOSITION':
        if (targetId === null) throw new Error('patch repair: remove proposition target');
        removeById(propositions, targetId);
        break;
      case 'REPLACE_PROPOSITION_EDGE':
        if (targetId === null || patch.propositionEdgeValue === null) throw new Error('patch repair: edge payload');
        replaceById(edges, targetId, patch.propositionEdgeValue);
        break;
      case 'ADD_PROPOSITION_EDGE':
        if (targetId === null || patch.propositionEdgeValue === null || targetId !== patch.propositionEdgeValue.id) throw new Error('patch repair: add edge payload');
        addUnique(edges, patch.propositionEdgeValue);
        break;
      case 'REMOVE_PROPOSITION_EDGE':
        if (targetId === null) throw new Error('patch repair: remove edge target');
        removeById(edges, targetId);
        break;
      case 'REPLACE_CENTRAL_AXIS':
        if (targetId === null || patch.centralAxisValue === null) throw new Error('patch repair: axis payload');
        replaceById(diagnostic.centralAxes, targetId, patch.centralAxisValue);
        break;
      case 'ADD_CENTRAL_AXIS':
        if (targetId === null || patch.centralAxisValue === null || targetId !== patch.centralAxisValue.id) throw new Error('patch repair: add axis payload');
        addUnique(diagnostic.centralAxes, patch.centralAxisValue);
        break;
      case 'REMOVE_CENTRAL_AXIS':
        if (targetId === null) throw new Error('patch repair: remove axis target');
        removeById(diagnostic.centralAxes, targetId);
        break;
      case 'REPLACE_CORE_RELATION':
        if (targetId === null || patch.coreRelationValue === null) throw new Error('patch repair: relation payload');
        replaceById(diagnostic.coreRelations, targetId, patch.coreRelationValue);
        break;
      case 'ADD_CORE_RELATION':
        if (targetId === null || patch.coreRelationValue === null || targetId !== patch.coreRelationValue.id) throw new Error('patch repair: add relation payload');
        addUnique(diagnostic.coreRelations, patch.coreRelationValue);
        break;
      case 'REMOVE_CORE_RELATION':
        if (targetId === null) throw new Error('patch repair: remove relation target');
        removeById(diagnostic.coreRelations, targetId);
        break;
      case 'REPLACE_KEY_MAPPINGS':
        if (targetId !== 'keyMappings') throw new Error('patch repair: mappings target');
        diagnostic.keyMappings = patch.keyMappingsValue;
        break;
      case 'REPLACE_SUPPORTING_CONCEPTS':
        if (targetId !== 'supportingConcepts') throw new Error('patch repair: concepts target');
        diagnostic.supportingConcepts = patch.supportingConceptsValue;
        break;
    }
  }
  const parsedDiagnostic = ParagraphDiagnosticGoldSchema.parse(diagnostic);
  const parsedBundle = ParagraphPropositionBundleSchema.parse({
    ...input.propositionBundle,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(input.propositionBundle),
    repairRunId: options.repairRunId,
    propositions,
    propositionEdges: edges,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
  if (artifactHash(parsedDiagnostic) === artifactHash(input.diagnosticGold) &&
      artifactHash(parsedBundle.propositions) === artifactHash(input.propositionBundle.propositions) &&
      artifactHash(parsedBundle.propositionEdges) === artifactHash(input.propositionBundle.propositionEdges)) {
    throw new Error('patch repair: 실질 변경 없음');
  }
  return { diagnosticGold: parsedDiagnostic, propositionBundle: parsedBundle };
}
