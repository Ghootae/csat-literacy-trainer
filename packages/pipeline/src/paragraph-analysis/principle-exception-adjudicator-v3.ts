import { z } from 'zod/v4';

import { ParagraphGoldAuditInputSchema, type ParagraphGoldAuditInput } from './production-runtime.js';

export const PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION =
  'principle-exception-adjudicator-v3' as const;

const PropositionIdSchema = z.string().regex(/^P[1-9][0-9]*$/u);
const CentralAxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/u);
const CoreRelationIdSchema = z.string().regex(/^MR[1-9][0-9]*$/u);
const ApplicabilitySchema = z.enum(['CENTRAL', 'NOT_CENTRAL', 'NOT_APPLICABLE']);
const SourceScopeSchema = z.enum([
  'TARGET_PARAGRAPH',
  'PASSAGE_CONTEXT_ONLY',
  'UNRESOLVED',
  'NOT_APPLICABLE',
]);
export const SemanticCoverageLevelSchema = z.enum([
  'EXPLICIT_EQUIVALENT',
  'IMPLICIT_ONLY',
  'ABSENT',
  'NOT_APPLICABLE',
]);

function layerCoverageSchema<T extends z.ZodType>(idSchema: T) {
  return z.object({
    level: SemanticCoverageLevelSchema,
    targetIds: z.array(idSchema),
    matchedMeaning: z.string().min(1).nullable(),
    explanation: z.string().min(1),
  }).strict();
}

const StoryCoverageSchema = z.object({
  level: SemanticCoverageLevelSchema,
  matchedMeaning: z.string().min(1).nullable(),
  explanation: z.string().min(1),
}).strict();

const V3SideSchema = z.object({
  meaning: z.string().min(1).nullable(),
  sourceScope: SourceScopeSchema,
  sourceEvidence: z.string().min(1).nullable(),
  propositionCoverage: layerCoverageSchema(PropositionIdSchema),
  centralStoryCoverage: StoryCoverageSchema,
  centralAxisCoverage: layerCoverageSchema(CentralAxisIdSchema),
  coreRelationCoverage: layerCoverageSchema(CoreRelationIdSchema),
}).strict();

export const PrincipleExceptionEvidenceV3OutputSchema = z.object({
  schemaVersion: z.literal(PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  applicability: ApplicabilitySchema,
  centralityRationale: z.string().min(1),
  contrastExplanation: z.string().min(1).nullable(),
  principle: V3SideSchema,
  exception: V3SideSchema,
}).strict();
export type PrincipleExceptionEvidenceV3Output = z.infer<
  typeof PrincipleExceptionEvidenceV3OutputSchema
>;

const FailedLayerSchema = z.enum([
  'PROPOSITION',
  'CENTRAL_STORY',
  'CENTRAL_AXIS',
  'CORE_RELATION',
]);

const SideAdjudicationSchema = z.object({
  propositionExplicit: z.boolean(),
  diagnosticExplicit: z.boolean(),
  failedLayers: z.array(FailedLayerSchema),
}).strict();

export const PrincipleExceptionAdjudicationV3Schema = z.object({
  status: z.enum([
    'PASS',
    'FAIL',
    'NOT_APPLICABLE',
    'OUT_OF_PARAGRAPH_SCOPE',
    'DEFER_TO_SOURCE_FIDELITY',
    'UNRESOLVED_SOURCE_SCOPE',
  ]),
  principle: SideAdjudicationSchema,
  exception: SideAdjudicationSchema,
  scopeGateReason: z.string().min(1),
  contractWarnings: z.array(z.string().min(1)),
  productionEligibleForThisCheck: z.boolean(),
}).strict();
export type PrincipleExceptionAdjudicationV3 = z.infer<
  typeof PrincipleExceptionAdjudicationV3Schema
>;

function assertUnique(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: 중복 ID`);
}

export function validatePrincipleExceptionEvidenceV3(
  value: PrincipleExceptionEvidenceV3Output,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionEvidenceV3Output {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = PrincipleExceptionEvidenceV3OutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('원칙-예외 v3 증거: 원천 ID 불일치');
  }
  const validIds = {
    propositions: new Set(input.propositionBundle.propositions.map((item) => item.id)),
    axes: new Set(input.diagnosticGold.centralAxes.map((item) => item.id)),
    relations: new Set(input.diagnosticGold.coreRelations.map((item) => item.id)),
  };
  for (const [label, side] of [['원칙', output.principle], ['예외', output.exception]] as const) {
    const groups = [
      ['proposition', side.propositionCoverage.targetIds, validIds.propositions],
      ['centralAxis', side.centralAxisCoverage.targetIds, validIds.axes],
      ['coreRelation', side.coreRelationCoverage.targetIds, validIds.relations],
    ] as const;
    for (const [kind, ids, valid] of groups) {
      assertUnique(ids, `${label} ${kind}`);
      if (ids.some((id) => !valid.has(id))) throw new Error(`${label}: 존재하지 않는 ${kind} ID`);
    }
  }
  return output;
}

function warningsForLayer(
  label: string,
  layer: string,
  coverage: { readonly level: z.infer<typeof SemanticCoverageLevelSchema>; readonly targetIds?: readonly string[]; readonly matchedMeaning: string | null },
): string[] {
  const warnings: string[] = [];
  const ids = coverage.targetIds ?? [];
  if (coverage.level === 'EXPLICIT_EQUIVALENT' && (coverage.matchedMeaning === null || ('targetIds' in coverage && ids.length === 0))) {
    warnings.push(`${label} ${layer}: EXPLICIT_EQUIVALENT 근거가 불완전함`);
  }
  if (coverage.level === 'ABSENT' && (coverage.matchedMeaning !== null || ids.length > 0)) {
    warnings.push(`${label} ${layer}: ABSENT인데 mapping이 제출됨`);
  }
  if (coverage.level === 'NOT_APPLICABLE' && (coverage.matchedMeaning !== null || ids.length > 0)) {
    warnings.push(`${label} ${layer}: NOT_APPLICABLE인데 mapping이 제출됨`);
  }
  return warnings;
}

function adjudicateSide(side: PrincipleExceptionEvidenceV3Output['principle']) {
  const failedLayers: z.infer<typeof FailedLayerSchema>[] = [];
  if (side.propositionCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('PROPOSITION');
  if (side.centralStoryCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CENTRAL_STORY');
  if (side.centralAxisCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CENTRAL_AXIS');
  if (side.coreRelationCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CORE_RELATION');
  return {
    propositionExplicit: side.propositionCoverage.level === 'EXPLICIT_EQUIVALENT',
    diagnosticExplicit: failedLayers.every((layer) => layer === 'PROPOSITION'),
    failedLayers,
  };
}

function collectWarnings(output: PrincipleExceptionEvidenceV3Output): string[] {
  const warnings: string[] = [];
  for (const [label, side] of [['원칙', output.principle], ['예외', output.exception]] as const) {
    warnings.push(
      ...warningsForLayer(label, 'proposition', side.propositionCoverage),
      ...warningsForLayer(label, 'centralStory', side.centralStoryCoverage),
      ...warningsForLayer(label, 'centralAxis', side.centralAxisCoverage),
      ...warningsForLayer(label, 'coreRelation', side.coreRelationCoverage),
    );
  }
  return warnings;
}

export function adjudicatePrincipleExceptionCoverageV3(
  value: PrincipleExceptionEvidenceV3Output,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionAdjudicationV3 {
  const output = validatePrincipleExceptionEvidenceV3(value, inputValue);
  const warnings = collectWarnings(output);
  const empty = { propositionExplicit: true, diagnosticExplicit: true, failedLayers: [] };
  if (output.applicability !== 'CENTRAL') {
    return {
      status: 'NOT_APPLICABLE',
      principle: empty,
      exception: empty,
      scopeGateReason: '중심적인 원칙-예외 구조가 아니다.',
      contractWarnings: warnings,
      productionEligibleForThisCheck: warnings.length === 0,
    };
  }

  const principle = adjudicateSide(output.principle);
  const exceptionSide = adjudicateSide(output.exception);
  const scopes = [output.principle.sourceScope, output.exception.sourceScope];
  if (scopes.includes('UNRESOLVED') || scopes.includes('NOT_APPLICABLE')) {
    return {
      status: 'UNRESOLVED_SOURCE_SCOPE', principle, exception: exceptionSide,
      scopeGateReason: '원칙 또는 예외의 출처 범위를 확정하지 못했다.',
      contractWarnings: warnings, productionEligibleForThisCheck: false,
    };
  }
  if (scopes.includes('PASSAGE_CONTEXT_ONLY')) {
    return {
      status: 'OUT_OF_PARAGRAPH_SCOPE', principle, exception: exceptionSide,
      scopeGateReason: '원칙 또는 예외가 다른 문단에만 있어 현재 문단 진단 coverage에서 제외한다.',
      contractWarnings: warnings, productionEligibleForThisCheck: warnings.length === 0,
    };
  }
  if (!principle.propositionExplicit || !exceptionSide.propositionExplicit) {
    return {
      status: 'DEFER_TO_SOURCE_FIDELITY', principle, exception: exceptionSide,
      scopeGateReason: '대상 문단 의미가 proposition에서 명시적으로 보존되지 않아 source fidelity로 넘긴다.',
      contractWarnings: warnings, productionEligibleForThisCheck: false,
    };
  }
  const status = principle.diagnosticExplicit && exceptionSide.diagnosticExplicit ? 'PASS' : 'FAIL';
  return {
    status, principle, exception: exceptionSide,
    scopeGateReason: '양쪽 proposition이 명시적이므로 진단 계층의 직접 진술 여부를 판정했다.',
    contractWarnings: warnings,
    productionEligibleForThisCheck: status === 'PASS' && warnings.length === 0,
  };
}

