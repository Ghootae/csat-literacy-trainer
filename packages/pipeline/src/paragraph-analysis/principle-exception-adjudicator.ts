import { z } from 'zod/v4';

import { ParagraphGoldAuditInputSchema, type ParagraphGoldAuditInput } from './production-runtime.js';

export const PRINCIPLE_EXCEPTION_ADJUDICATOR_VERSION =
  'principle-exception-adjudicator-v1' as const;

const PropositionIdSchema = z.string().regex(/^P[1-9][0-9]*$/u);
const CentralAxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/u);
const CoreRelationIdSchema = z.string().regex(/^MR[1-9][0-9]*$/u);

export const PrincipleExceptionApplicabilitySchema = z.enum([
  'CENTRAL',
  'NOT_CENTRAL',
  'NOT_APPLICABLE',
]);

const CoverageStateSchema = z.enum(['PRESENT', 'ABSENT', 'NOT_APPLICABLE']);

const CoverageSideSchema = z.object({
  meaning: z.string().min(1).nullable(),
  sourceEvidence: z.string().min(1).nullable(),
  propositionIds: z.array(PropositionIdSchema),
  centralStoryCoverage: CoverageStateSchema,
  centralStoryMapping: z.string().min(1).nullable(),
  centralAxisIds: z.array(CentralAxisIdSchema),
  coreRelationIds: z.array(CoreRelationIdSchema),
  mappingExplanation: z.string().min(1).nullable(),
}).strict();

export const PrincipleExceptionEvidenceOutputSchema = z.object({
  schemaVersion: z.literal(PRINCIPLE_EXCEPTION_ADJUDICATOR_VERSION),
  sourceId: z.string().min(1),
  paragraphId: z.string().regex(/^[a-z0-9]+-p[1-9][0-9]*$/u),
  applicability: PrincipleExceptionApplicabilitySchema,
  centralityRationale: z.string().min(1),
  contrastExplanation: z.string().min(1).nullable(),
  principle: CoverageSideSchema,
  exception: CoverageSideSchema,
}).strict();
export type PrincipleExceptionEvidenceOutput = z.infer<typeof PrincipleExceptionEvidenceOutputSchema>;

export const PrincipleExceptionComponentSchema = z.enum([
  'SOURCE_MEANING',
  'PROPOSITION',
  'CENTRAL_STORY',
  'CENTRAL_AXIS',
  'CORE_RELATION',
]);
export type PrincipleExceptionComponent = z.infer<typeof PrincipleExceptionComponentSchema>;

const SideAdjudicationSchema = z.object({
  complete: z.boolean(),
  missingComponents: z.array(PrincipleExceptionComponentSchema),
}).strict();

export const PrincipleExceptionAdjudicationSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
  principle: SideAdjudicationSchema,
  exception: SideAdjudicationSchema,
  productionEligibleForThisCheck: z.boolean(),
}).strict();
export type PrincipleExceptionAdjudication = z.infer<typeof PrincipleExceptionAdjudicationSchema>;

export const PrincipleExceptionScopedAdjudicationSchema = z.object({
  status: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE', 'DEFER_TO_SOURCE_FIDELITY']),
  principle: SideAdjudicationSchema,
  exception: SideAdjudicationSchema,
  scopeGate: z.object({
    principleGroundedInTargetProposition: z.boolean(),
    exceptionGroundedInTargetProposition: z.boolean(),
    reason: z.string().min(1),
  }).strict(),
  requiresSourceFidelityReview: z.boolean(),
  productionEligibleForThisCheck: z.boolean(),
}).strict();
export type PrincipleExceptionScopedAdjudication = z.infer<
  typeof PrincipleExceptionScopedAdjudicationSchema
>;

function assertUnique(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: 중복 ID`);
}

function validateSideReferences(
  side: PrincipleExceptionEvidenceOutput['principle'],
  validIds: {
    readonly propositions: ReadonlySet<string>;
    readonly axes: ReadonlySet<string>;
    readonly relations: ReadonlySet<string>;
  },
  label: string,
): void {
  assertUnique(side.propositionIds, `${label} proposition`);
  assertUnique(side.centralAxisIds, `${label} centralAxis`);
  assertUnique(side.coreRelationIds, `${label} coreRelation`);
  if (side.propositionIds.some((id) => !validIds.propositions.has(id))) {
    throw new Error(`${label}: 존재하지 않는 proposition ID`);
  }
  if (side.centralAxisIds.some((id) => !validIds.axes.has(id))) {
    throw new Error(`${label}: 존재하지 않는 centralAxis ID`);
  }
  if (side.coreRelationIds.some((id) => !validIds.relations.has(id))) {
    throw new Error(`${label}: 존재하지 않는 coreRelation ID`);
  }
}

export function validatePrincipleExceptionEvidence(
  value: PrincipleExceptionEvidenceOutput,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionEvidenceOutput {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const output = PrincipleExceptionEvidenceOutputSchema.parse(value);
  if (output.sourceId !== input.sourceId || output.paragraphId !== input.targetParagraph.paragraphId) {
    throw new Error('원칙-예외 증거: 원천 ID 불일치');
  }
  const validIds = {
    propositions: new Set(input.propositionBundle.propositions.map((item) => item.id)),
    axes: new Set(input.diagnosticGold.centralAxes.map((item) => item.id)),
    relations: new Set(input.diagnosticGold.coreRelations.map((item) => item.id)),
  };
  validateSideReferences(output.principle, validIds, '원칙');
  validateSideReferences(output.exception, validIds, '예외');

  for (const [label, side] of [
    ['원칙', output.principle],
    ['예외', output.exception],
  ] as const) {
    if (output.applicability === 'CENTRAL') {
      if (side.centralStoryCoverage === 'NOT_APPLICABLE') {
        throw new Error(`${label}: 중심 대조에서 NOT_APPLICABLE coverage 사용 불가`);
      }
      if ((side.centralStoryCoverage === 'PRESENT') !== (side.centralStoryMapping !== null)) {
        throw new Error(`${label}: centralStory coverage와 mapping 불일치`);
      }
    } else if (
      side.meaning !== null || side.sourceEvidence !== null || side.propositionIds.length > 0 ||
      side.centralStoryCoverage !== 'NOT_APPLICABLE' || side.centralStoryMapping !== null ||
      side.centralAxisIds.length > 0 || side.coreRelationIds.length > 0 ||
      side.mappingExplanation !== null
    ) {
      throw new Error(`${label}: 비적용 판정에는 coverage 증거를 제출할 수 없음`);
    }
  }
  return output;
}

function adjudicateSide(
  side: PrincipleExceptionEvidenceOutput['principle'],
): PrincipleExceptionAdjudication['principle'] {
  const missing: PrincipleExceptionComponent[] = [];
  if (side.meaning === null || side.sourceEvidence === null) missing.push('SOURCE_MEANING');
  if (side.propositionIds.length === 0) missing.push('PROPOSITION');
  if (side.centralStoryCoverage !== 'PRESENT') missing.push('CENTRAL_STORY');
  if (side.centralAxisIds.length === 0) missing.push('CENTRAL_AXIS');
  if (side.coreRelationIds.length === 0) missing.push('CORE_RELATION');
  return { complete: missing.length === 0, missingComponents: missing };
}

export function adjudicatePrincipleExceptionCoverage(
  value: PrincipleExceptionEvidenceOutput,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionAdjudication {
  const output = validatePrincipleExceptionEvidence(value, inputValue);
  if (output.applicability !== 'CENTRAL') {
    return {
      status: 'NOT_APPLICABLE',
      principle: { complete: true, missingComponents: [] },
      exception: { complete: true, missingComponents: [] },
      productionEligibleForThisCheck: true,
    };
  }
  const principle = adjudicateSide(output.principle);
  const exceptionSide = adjudicateSide(output.exception);
  const status = principle.complete && exceptionSide.complete ? 'PASS' : 'FAIL';
  return {
    status,
    principle,
    exception: exceptionSide,
    productionEligibleForThisCheck: status === 'PASS',
  };
}

/**
 * 문단 진단 구조의 원칙-예외 coverage와 proposition 원천 충실도 문제를 분리한다.
 *
 * CENTRAL이라고 해도 한쪽 의미를 담당하는 대상 문단 proposition이 없으면 diagnosticGold의
 * 누락으로 단정하지 않는다. 이 경우 PROPOSITION_SOURCE_FIDELITY가 원문 누락인지, 앞 문단
 * 맥락을 잘못 끌어온 것인지 먼저 판단하도록 넘긴다.
 */
export function adjudicatePrincipleExceptionCoverageWithScopeGate(
  value: PrincipleExceptionEvidenceOutput,
  inputValue: ParagraphGoldAuditInput,
): PrincipleExceptionScopedAdjudication {
  const output = validatePrincipleExceptionEvidence(value, inputValue);
  if (output.applicability !== 'CENTRAL') {
    return {
      status: 'NOT_APPLICABLE',
      principle: { complete: true, missingComponents: [] },
      exception: { complete: true, missingComponents: [] },
      scopeGate: {
        principleGroundedInTargetProposition: false,
        exceptionGroundedInTargetProposition: false,
        reason: '대상 문단이 중심적인 원칙-예외 구조로 분류되지 않았다.',
      },
      requiresSourceFidelityReview: false,
      productionEligibleForThisCheck: true,
    };
  }

  const principle = adjudicateSide(output.principle);
  const exceptionSide = adjudicateSide(output.exception);
  const principleGrounded = output.principle.propositionIds.length > 0;
  const exceptionGrounded = output.exception.propositionIds.length > 0;
  if (!principleGrounded || !exceptionGrounded) {
    const missingRoles = [
      !principleGrounded ? '원칙' : null,
      !exceptionGrounded ? '예외' : null,
    ].filter((item): item is string => item !== null);
    return {
      status: 'DEFER_TO_SOURCE_FIDELITY',
      principle,
      exception: exceptionSide,
      scopeGate: {
        principleGroundedInTargetProposition: principleGrounded,
        exceptionGroundedInTargetProposition: exceptionGrounded,
        reason: `${missingRoles.join('·')} 의미를 담당하는 대상 문단 proposition이 없어 진단 구조 누락으로 판정하지 않는다.`,
      },
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
      principleGroundedInTargetProposition: true,
      exceptionGroundedInTargetProposition: true,
      reason: '원칙과 예외 양쪽이 대상 문단 proposition에 연결되어 진단 구조 coverage를 판정했다.',
    },
    requiresSourceFidelityReview: false,
    productionEligibleForThisCheck: status === 'PASS',
  };
}
