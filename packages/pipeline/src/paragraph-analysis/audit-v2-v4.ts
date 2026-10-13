import { z } from 'zod/v4';

import {
  ParagraphGoldAuditV2OutputSchema,
  validateParagraphGoldAuditV2,
  type ParagraphGoldAuditV2Output,
} from './audit-v2.js';
import {
  PrincipleExceptionEvidenceV4OutputSchema,
  adjudicatePrincipleExceptionCoverageV4,
  type PrincipleExceptionEvidenceV4Output,
} from './principle-exception-adjudicator-v4.js';
import type { ParagraphGoldAuditInput } from './production-runtime.js';

export const PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION =
  'paragraph-gold-audit-v2-v4-experiment-v1' as const;

export const ParagraphGoldAuditV2V4OutputSchema = ParagraphGoldAuditV2OutputSchema.extend({
  integrationVersion: z.literal(PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION),
  principleExceptionEvidence: PrincipleExceptionEvidenceV4OutputSchema,
}).strict();
export type ParagraphGoldAuditV2V4Output = z.infer<typeof ParagraphGoldAuditV2V4OutputSchema>;

export type PrincipleExceptionAdjudicationV4 = ReturnType<
  typeof adjudicatePrincipleExceptionCoverageV4
>;

export interface ParagraphGoldAuditV2V4Evaluation {
  readonly audit: ParagraphGoldAuditV2Output | null;
  readonly principleExceptionAdjudication: PrincipleExceptionAdjudicationV4 | null;
  readonly contractErrors: readonly string[];
}

function v2Projection(output: ParagraphGoldAuditV2V4Output): ParagraphGoldAuditV2Output {
  const {
    integrationVersion: _integrationVersion,
    principleExceptionEvidence: _principleExceptionEvidence,
    ...audit
  } = output;
  return audit;
}

function expectedRegressionStatus(
  adjudication: PrincipleExceptionAdjudicationV4,
): 'PASS' | 'FAIL' | 'NOT_APPLICABLE' {
  switch (adjudication.status) {
    case 'PASS':
      return 'PASS';
    case 'NOT_APPLICABLE':
    case 'OUT_OF_PARAGRAPH_SCOPE':
      return 'NOT_APPLICABLE';
    case 'FAIL':
    case 'DEFER_TO_SOURCE_FIDELITY':
    case 'UNRESOLVED_SOURCE_SCOPE':
      return 'FAIL';
  }
}

/**
 * v4는 증거만 모델이 작성하고 최종 원칙-예외 판정은 코드가 계산한다.
 * 계산 결과와 v2 감사 레코드가 어긋나면 원시 응답은 보존하되 수리 입력으로 승격하지 않는다.
 */
export function evaluateParagraphGoldAuditV2V4(
  value: ParagraphGoldAuditV2V4Output,
  input: ParagraphGoldAuditInput,
): ParagraphGoldAuditV2V4Evaluation {
  const output = ParagraphGoldAuditV2V4OutputSchema.parse(value);
  const contractErrors: string[] = [];
  let adjudication: PrincipleExceptionAdjudicationV4 | null = null;
  try {
    adjudication = adjudicatePrincipleExceptionCoverageV4(
      output.principleExceptionEvidence,
      input,
    );
  } catch (error) {
    contractErrors.push(
      `v4 증거 계약 오류: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const principleExceptionCheck = output.regressionChecks.find(
    (check) => check.checkId === 'PRINCIPLE_EXCEPTION_COVERAGE',
  );
  if (principleExceptionCheck === undefined) {
    contractErrors.push('v2 원칙-예외 회귀 검사 누락');
  } else if (adjudication !== null) {
    const expected = expectedRegressionStatus(adjudication);
    if (principleExceptionCheck.status !== expected) {
      contractErrors.push(
        `v4 기계 판정(${adjudication.status})과 v2 회귀 상태(${principleExceptionCheck.status}) 불일치; ` +
        `기대 상태=${expected}`,
      );
    }
    if (!adjudication.productionEligibleForThisCheck) {
      if (principleExceptionCheck.status !== 'FAIL') {
        contractErrors.push('v4가 생산 부적격인데 v2 원칙-예외 검사가 FAIL이 아님');
      }
      if (principleExceptionCheck.issueIds.length === 0) {
        contractErrors.push('v4가 생산 부적격인데 수리 가능한 issue가 없음');
      }
    }
  }

  let audit: ParagraphGoldAuditV2Output | null = null;
  try {
    audit = validateParagraphGoldAuditV2(v2Projection(output), input);
  } catch (error) {
    contractErrors.push(
      `v2 감사 계약 오류: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (contractErrors.length > 0) audit = null;
  return {
    audit,
    principleExceptionAdjudication: adjudication,
    contractErrors,
  };
}

export function principleExceptionEvidenceV4(
  output: ParagraphGoldAuditV2V4Output,
): PrincipleExceptionEvidenceV4Output {
  return output.principleExceptionEvidence;
}
