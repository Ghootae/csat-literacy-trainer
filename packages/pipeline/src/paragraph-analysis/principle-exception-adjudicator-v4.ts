import { z } from 'zod/v4';

import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION,
  PrincipleExceptionEvidenceV3OutputSchema,
  validatePrincipleExceptionEvidenceV3,
  type PrincipleExceptionAdjudicationV3,
  type PrincipleExceptionEvidenceV3Output,
} from './principle-exception-adjudicator-v3.js';
import type { ParagraphGoldAuditInput } from './production-runtime.js';

export const PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION =
  'principle-exception-adjudicator-v4' as const;

export const ContrastTypeSchema = z.enum([
  'RULE_EXCEPTION',
  'MODEL_LIMITATION_REMEDY',
  'CONDITIONAL_BRANCH',
  'OTHER',
  'NOT_APPLICABLE',
]);

export const PropositionAggregationSchema = z.enum([
  'SINGLE_DIRECT',
  'MULTIPLE_DIRECT_UNION',
  'REQUIRES_INFERENCE',
  'ABSENT',
  'NOT_APPLICABLE',
]);

export const PrincipleExceptionEvidenceV4OutputSchema = PrincipleExceptionEvidenceV3OutputSchema.extend({
  schemaVersion: z.literal(PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION),
  contrastType: ContrastTypeSchema,
  propositionAggregation: z.object({
    principle: PropositionAggregationSchema,
    exception: PropositionAggregationSchema,
  }).strict(),
}).strict();
export type PrincipleExceptionEvidenceV4Output = z.infer<
  typeof PrincipleExceptionEvidenceV4OutputSchema
>;

function v3Projection(output: PrincipleExceptionEvidenceV4Output): PrincipleExceptionEvidenceV3Output {
  const { contrastType: _contrastType, propositionAggregation: _aggregation, ...rest } = output;
  return { ...rest, schemaVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_V3_VERSION };
}

export function validatePrincipleExceptionEvidenceV4(
  value: PrincipleExceptionEvidenceV4Output,
  input: ParagraphGoldAuditInput,
): PrincipleExceptionEvidenceV4Output {
  const output = PrincipleExceptionEvidenceV4OutputSchema.parse(value);
  validatePrincipleExceptionEvidenceV3(v3Projection(output), input);
  return output;
}

function aggregationIsExplicit(value: z.infer<typeof PropositionAggregationSchema>): boolean {
  return value === 'SINGLE_DIRECT' || value === 'MULTIPLE_DIRECT_UNION';
}

function aggregationWarnings(output: PrincipleExceptionEvidenceV4Output): string[] {
  const warnings: string[] = [];
  for (const [role, side, aggregation] of [
    ['원칙', output.principle, output.propositionAggregation.principle],
    ['예외', output.exception, output.propositionAggregation.exception],
  ] as const) {
    const count = side.propositionCoverage.targetIds.length;
    if (aggregation === 'SINGLE_DIRECT' && count !== 1) {
      warnings.push(`${role}: SINGLE_DIRECT인데 proposition ID가 1개가 아님`);
    }
    if (aggregation === 'MULTIPLE_DIRECT_UNION' && count < 2) {
      warnings.push(`${role}: MULTIPLE_DIRECT_UNION인데 proposition ID가 2개 미만임`);
    }
    if (aggregation === 'ABSENT' && count > 0) {
      warnings.push(`${role}: ABSENT인데 proposition ID가 제출됨`);
    }
  }
  if (output.contrastType === 'RULE_EXCEPTION' && output.applicability !== 'CENTRAL') {
    warnings.push('RULE_EXCEPTION인데 applicability가 CENTRAL이 아님');
  }
  return warnings;
}

export function adjudicatePrincipleExceptionCoverageV4(
  value: PrincipleExceptionEvidenceV4Output,
  input: ParagraphGoldAuditInput,
): PrincipleExceptionAdjudicationV3 & {
  readonly contrastType: z.infer<typeof ContrastTypeSchema>;
  readonly propositionAggregation: z.infer<typeof PrincipleExceptionEvidenceV4OutputSchema>['propositionAggregation'];
} {
  const output = validatePrincipleExceptionEvidenceV4(value, input);
  const warnings = aggregationWarnings(output);
  const empty = { propositionExplicit: true, diagnosticExplicit: true, failedLayers: [] };
  if (output.contrastType !== 'RULE_EXCEPTION') {
    return {
      status: 'NOT_APPLICABLE', principle: empty, exception: empty,
      scopeGateReason: `${output.contrastType} 구조이므로 원칙-예외 coverage를 적용하지 않는다.`,
      contractWarnings: warnings,
      productionEligibleForThisCheck: warnings.length === 0,
      contrastType: output.contrastType,
      propositionAggregation: output.propositionAggregation,
    };
  }

  const scopes = [output.principle.sourceScope, output.exception.sourceScope];
  const principleExplicit = aggregationIsExplicit(output.propositionAggregation.principle);
  const exceptionExplicit = aggregationIsExplicit(output.propositionAggregation.exception);
  const side = (
    target: PrincipleExceptionEvidenceV4Output['principle'],
    propositionExplicit: boolean,
  ) => {
    const failedLayers: Array<'PROPOSITION' | 'CENTRAL_STORY' | 'CENTRAL_AXIS' | 'CORE_RELATION'> = [];
    if (!propositionExplicit) failedLayers.push('PROPOSITION');
    if (target.centralStoryCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CENTRAL_STORY');
    if (target.centralAxisCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CENTRAL_AXIS');
    if (target.coreRelationCoverage.level !== 'EXPLICIT_EQUIVALENT') failedLayers.push('CORE_RELATION');
    return {
      propositionExplicit,
      diagnosticExplicit: failedLayers.every((layer) => layer === 'PROPOSITION'),
      failedLayers,
    };
  };
  const principle = side(output.principle, principleExplicit);
  const exceptionSide = side(output.exception, exceptionExplicit);
  const base = {
    principle, exception: exceptionSide, contractWarnings: warnings,
    contrastType: output.contrastType,
    propositionAggregation: output.propositionAggregation,
  };

  if (scopes.includes('UNRESOLVED') || scopes.includes('NOT_APPLICABLE')) {
    return {
      ...base, status: 'UNRESOLVED_SOURCE_SCOPE',
      scopeGateReason: '원칙 또는 예외의 출처 범위를 확정하지 못했다.',
      productionEligibleForThisCheck: false,
    };
  }
  if (scopes.includes('PASSAGE_CONTEXT_ONLY')) {
    return {
      ...base, status: 'OUT_OF_PARAGRAPH_SCOPE',
      scopeGateReason: '원칙 또는 예외가 다른 문단에만 있어 현재 문단 coverage에서 제외한다.',
      productionEligibleForThisCheck: warnings.length === 0,
    };
  }
  if (!principleExplicit || !exceptionExplicit) {
    return {
      ...base, status: 'DEFER_TO_SOURCE_FIDELITY',
      scopeGateReason: 'proposition 집합이 의미를 직접 완성하지 않아 source fidelity로 넘긴다.',
      productionEligibleForThisCheck: false,
    };
  }
  const status = principle.diagnosticExplicit && exceptionSide.diagnosticExplicit ? 'PASS' : 'FAIL';
  return {
    ...base, status,
    scopeGateReason: '양쪽 proposition 집합이 직접 의미를 완성하여 진단 coverage를 판정했다.',
    productionEligibleForThisCheck: status === 'PASS' && warnings.length === 0,
  };
}

