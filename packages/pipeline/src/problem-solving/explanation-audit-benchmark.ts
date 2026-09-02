import { z } from 'zod/v4';

import {
  ExplanationAuditSchema,
  ExplanationClaimClassificationSchema,
  ExplanationClaimPlacementSchema,
  type ExplanationAudit,
} from './explanation-audit.js';

export const EXPLANATION_AUDIT_BENCHMARK_VERSION =
  'problem-explanation-audit-benchmark-v1' as const;

export const ExplanationAuditBenchmarkCaseSchema = z.object({
  caseId: z.string().min(1),
  reviewStatus: z.enum(['candidate', 'human_reviewed']),
  claims: z.array(z.object({
    benchmarkClaimId: z.string().regex(/^BC[1-9][0-9]*$/),
    sourceText: z.string().min(1),
    classification: ExplanationClaimClassificationSchema,
    placement: ExplanationClaimPlacementSchema,
    reason: z.string().min(1),
  })).min(1),
});

export const ExplanationAuditBenchmarkSchema = z.object({
  benchmarkVersion: z.literal(EXPLANATION_AUDIT_BENCHMARK_VERSION),
  cases: z.array(ExplanationAuditBenchmarkCaseSchema).min(1),
});

export type ExplanationAuditBenchmarkCase = z.infer<
  typeof ExplanationAuditBenchmarkCaseSchema
>;

function normalizeSpan(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

export interface ExplanationAuditBenchmarkEvaluation {
  readonly totalBenchmarkClaims: number;
  readonly matchedClaims: number;
  readonly omittedClaims: number;
  readonly claimOmissionRate: number;
  readonly classificationCorrect: number;
  readonly classificationAccuracy: number;
  readonly placementCorrect: number;
  readonly placementAccuracy: number;
  readonly matches: readonly {
    readonly benchmarkClaimId: string;
    readonly auditClaimId: string | null;
    readonly classificationCorrect: boolean;
    readonly placementCorrect: boolean;
  }[];
}

export function evaluateExplanationAuditBenchmark(
  auditValue: unknown,
  benchmarkValue: unknown,
): ExplanationAuditBenchmarkEvaluation {
  const audit: ExplanationAudit = ExplanationAuditSchema.parse(auditValue);
  const benchmark = ExplanationAuditBenchmarkCaseSchema.parse(benchmarkValue);
  const usedAuditClaimIds = new Set<string>();
  const matches = benchmark.claims.map((expected) => {
    const expectedSpan = normalizeSpan(expected.sourceText);
    const candidates = audit.claims
      .filter((claim) => !usedAuditClaimIds.has(claim.claimId))
      .filter((claim) => {
        const actualSpan = normalizeSpan(claim.sourceText);
        return actualSpan.includes(expectedSpan) || expectedSpan.includes(actualSpan);
      })
      .sort((left, right) => (
        Math.abs(normalizeSpan(left.sourceText).length - expectedSpan.length) -
        Math.abs(normalizeSpan(right.sourceText).length - expectedSpan.length)
      ));
    const actual = candidates[0];
    if (actual === undefined) {
      return {
        benchmarkClaimId: expected.benchmarkClaimId,
        auditClaimId: null,
        classificationCorrect: false,
        placementCorrect: false,
      };
    }
    usedAuditClaimIds.add(actual.claimId);
    return {
      benchmarkClaimId: expected.benchmarkClaimId,
      auditClaimId: actual.claimId,
      classificationCorrect: actual.classification === expected.classification,
      placementCorrect: actual.placement === expected.placement,
    };
  });
  const matchedClaims = matches.filter((match) => match.auditClaimId !== null).length;
  const classificationCorrect = matches.filter(
    (match) => match.classificationCorrect,
  ).length;
  const placementCorrect = matches.filter((match) => match.placementCorrect).length;
  const totalBenchmarkClaims = benchmark.claims.length;
  return {
    totalBenchmarkClaims,
    matchedClaims,
    omittedClaims: totalBenchmarkClaims - matchedClaims,
    claimOmissionRate: (totalBenchmarkClaims - matchedClaims) / totalBenchmarkClaims,
    classificationCorrect,
    classificationAccuracy: classificationCorrect / totalBenchmarkClaims,
    placementCorrect,
    placementAccuracy: placementCorrect / totalBenchmarkClaims,
    matches,
  };
}
