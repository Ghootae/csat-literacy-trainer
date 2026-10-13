import { z } from 'zod/v4';

import { ParagraphGoldAuditInputSchema, type ParagraphGoldAuditInput } from './production-runtime.js';

export const PRINCIPLE_EXCEPTION_ADJUDICATOR_V2_VERSION =
  'principle-exception-adjudicator-v2' as const;

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
const CoverageStateSchema = z.enum(['PRESENT', 'ABSENT', 'NOT_APPLICABLE']);

const ScopedCoverageSideSchema = z.object({
  meaning: z.string().min(1).nullable(),
  sourceScope: SourceScopeSchema,
  sourceEvidence: z.string().min(1).nullable(),
  propositionIds: z.array(PropositionIdSchema),
  centralStoryCoverage: CoverageStateSchema,
  centralStoryMapping: z.string().min(1).nullable(),
  centralAxisIds: z.array(CentralAxisIdSchema),
  coreRelationIds: z.array(CoreRelationIdSchema),
  mappingExplanation: z.string().min(1).nullable(),
}).strict();

export const PrincipleExceptionEvidenceV2OutputSchema = z.object({
  schemaVersion: z.literal(PRINCIPLE_EXCEPTION_ADJUDICATOR_V2_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  applicability: ApplicabilitySchema,
  centralityRationale: z.string().min(1),
  contrastExplanation: z.string().min(1).nullable(),
  principle: ScopedCoverageSideSchema,
  exception: ScopedCoverageSideSchema,
}).strict();
export type PrincipleExceptionEvidenceV2Output = z.infer<
  typeof PrincipleExceptionEvidenceV2OutputSchema
>;

const MissingComponentSchema = z.enum([
  'SOURCE_MEANING',
  'PROPOSITION',
  'CENTRAL_STORY',
  'CENTRAL_AXIS',
  'CORE_RELATION',
]);

const SideAdjudicationSchema = z.object({
  complete: z.boolean(),
  missingComponents: z.array(MissingComponentSchema),
}).strict();

export const PrincipleExceptionAdjudicationV2Schema = z.object({
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
  scopeGate: z.object({
    principleSourceScope: SourceScopeSchema,
    exceptionSourceScope: SourceScopeSchema,
    reason: z.string().min(1),
  }).strict(),
  contractWarnings: z.array(z.string().min(1)),
  requiresSourceFidelityReview: z.boolean(),
  productionEligibleForThisCheck: z.boolean(),
}).strict();
export type PrincipleExceptionAdjudicationV2 = z.infer<
  typeof PrincipleExceptionAdjudicationV2Schema
>;

function assertUnique(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: 중복 ID`);
}

export function validatePrincipleExceptionEvidenceV2(
  value: PrincipleExceptionEvidenceV2Output,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionEvidenceV2Output {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = PrincipleExceptionEvidenceV2OutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('원칙-예외 v2 증거: 원천 ID 불일치');
  }
  const validPropositions = new Set(input.propositionBundle.propositions.map((item) => item.id));
  const validAxes = new Set(input.diagnosticGold.centralAxes.map((item) => item.id));
  const validRelations = new Set(input.diagnosticGold.coreRelations.map((item) => item.id));
  for (const [label, side] of [
    ['원칙', output.principle],
    ['예외', output.exception],
  ] as const) {
    assertUnique(side.propositionIds, `${label} proposition`);
    assertUnique(side.centralAxisIds, `${label} centralAxis`);
    assertUnique(side.coreRelationIds, `${label} coreRelation`);
    if (side.propositionIds.some((id) => !validPropositions.has(id))) {
      throw new Error(`${label}: 존재하지 않는 proposition ID`);
    }
    if (side.centralAxisIds.some((id) => !validAxes.has(id))) {
      throw new Error(`${label}: 존재하지 않는 centralAxis ID`);
    }
    if (side.coreRelationIds.some((id) => !validRelations.has(id))) {
      throw new Error(`${label}: 존재하지 않는 coreRelation ID`);
    }
  }
  return output;
}

function adjudicateSide(side: PrincipleExceptionEvidenceV2Output['principle']) {
  const missing: z.infer<typeof MissingComponentSchema>[] = [];
  if (side.meaning === null || side.sourceEvidence === null) missing.push('SOURCE_MEANING');
  if (side.propositionIds.length === 0) missing.push('PROPOSITION');
  if (side.centralStoryCoverage !== 'PRESENT') missing.push('CENTRAL_STORY');
  if (side.centralAxisIds.length === 0) missing.push('CENTRAL_AXIS');
  if (side.coreRelationIds.length === 0) missing.push('CORE_RELATION');
  return { complete: missing.length === 0, missingComponents: missing };
}

function contractWarnings(output: PrincipleExceptionEvidenceV2Output): string[] {
  const warnings: string[] = [];
  for (const [label, side] of [
    ['원칙', output.principle],
    ['예외', output.exception],
  ] as const) {
    if (side.sourceScope === 'PASSAGE_CONTEXT_ONLY' && side.propositionIds.length > 0) {
      warnings.push(`${label}: PASSAGE_CONTEXT_ONLY인데 대상 문단 proposition ID가 제출됨`);
    }
    if (side.sourceScope === 'TARGET_PARAGRAPH' && side.sourceEvidence === null) {
      warnings.push(`${label}: TARGET_PARAGRAPH인데 sourceEvidence가 없음`);
    }
    if (side.sourceScope === 'NOT_APPLICABLE' && output.applicability === 'CENTRAL') {
      warnings.push(`${label}: CENTRAL인데 sourceScope가 NOT_APPLICABLE임`);
    }
  }
  return warnings;
}

export function adjudicatePrincipleExceptionCoverageV2(
  value: PrincipleExceptionEvidenceV2Output,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionAdjudicationV2 {
  const output = validatePrincipleExceptionEvidenceV2(value, inputValue);
  const warnings = contractWarnings(output);
  const emptySide: PrincipleExceptionAdjudicationV2['principle'] = {
    complete: true,
    missingComponents: [],
  };

  if (output.applicability !== 'CENTRAL') {
    return {
      status: 'NOT_APPLICABLE',
      principle: emptySide,
      exception: emptySide,
      scopeGate: {
        principleSourceScope: output.principle.sourceScope,
        exceptionSourceScope: output.exception.sourceScope,
        reason: '대상 문단이 중심적인 원칙-예외 구조로 분류되지 않았다.',
      },
      contractWarnings: warnings,
      requiresSourceFidelityReview: false,
      productionEligibleForThisCheck: warnings.length === 0,
    };
  }

  const principle = adjudicateSide(output.principle);
  const exceptionSide = adjudicateSide(output.exception);
  const scopes = [output.principle.sourceScope, output.exception.sourceScope];
  const scopeGateBase = {
    principleSourceScope: output.principle.sourceScope,
    exceptionSourceScope: output.exception.sourceScope,
  };

  if (scopes.includes('UNRESOLVED') || scopes.includes('NOT_APPLICABLE')) {
    return {
      status: 'UNRESOLVED_SOURCE_SCOPE',
      principle,
      exception: exceptionSide,
      scopeGate: { ...scopeGateBase, reason: '원칙 또는 예외의 출처 범위를 확정하지 못했다.' },
      contractWarnings: warnings,
      requiresSourceFidelityReview: true,
      productionEligibleForThisCheck: false,
    };
  }

  if (scopes.includes('PASSAGE_CONTEXT_ONLY')) {
    return {
      status: 'OUT_OF_PARAGRAPH_SCOPE',
      principle,
      exception: exceptionSide,
      scopeGate: {
        ...scopeGateBase,
        reason: '원칙 또는 예외가 앞뒤 지문 맥락에만 있어 현재 문단 diagnosticGold의 coverage 대상으로 삼지 않는다.',
      },
      contractWarnings: warnings,
      requiresSourceFidelityReview: false,
      productionEligibleForThisCheck: warnings.length === 0,
    };
  }

  if (output.principle.propositionIds.length === 0 || output.exception.propositionIds.length === 0) {
    return {
      status: 'DEFER_TO_SOURCE_FIDELITY',
      principle,
      exception: exceptionSide,
      scopeGate: {
        ...scopeGateBase,
        reason: '대상 문단에 명시된 의미를 담당하는 proposition이 없어 source fidelity 검사로 넘긴다.',
      },
      contractWarnings: warnings,
      requiresSourceFidelityReview: true,
      productionEligibleForThisCheck: false,
    };
  }

  const status = principle.complete && exceptionSide.complete ? 'PASS' : 'FAIL';
  return {
    status,
    principle,
    exception: exceptionSide,
    scopeGate: {
      ...scopeGateBase,
      reason: '원칙과 예외가 모두 대상 문단에 있어 진단 구조 coverage를 판정했다.',
    },
    contractWarnings: warnings,
    requiresSourceFidelityReview: false,
    productionEligibleForThisCheck: status === 'PASS' && warnings.length === 0,
  };
}
