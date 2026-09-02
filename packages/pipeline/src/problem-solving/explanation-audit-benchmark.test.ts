import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EXPLANATION_AUDIT_VERSION,
  canonicalExplanationReferenceHash,
} from './explanation-audit.js';
import {
  ExplanationAuditBenchmarkSchema,
  evaluateExplanationAuditBenchmark,
} from './explanation-audit-benchmark.js';

const reference = {
  publisher: 'EBS', service: 'EBSi', officiality: '배포 해설',
  sourceUrl: 'https://example.com/e.pdf', pdfPages: [1], sectionTitle: '문항',
  text: 'A는 B보다 크다. 따라서 C가 성립한다.',
};

function claim(claimId: string, sourceText: string, classification: string, placement: string) {
  return {
    claimId, sourceText, normalizedClaim: sourceText, claimKind: 'SOURCE_STATEMENT',
    classification, sourceEvidence: classification.startsWith('SOURCE_')
      ? [{ sourceArea: 'PASSAGE', locator: 'P1', quote: '근거' }]
      : [],
    derivationOperation: classification === 'SOURCE_DERIVED' ? 'COMPARE' : 'NONE',
    derivation: classification === 'SOURCE_DERIVED' ? '비교한다.' : null,
    placement,
    supplementalGroundedness: placement === 'SUPPLEMENTAL' ? 'ENTAILED' : null,
    riskFlags: ['NONE'], reason: '검수',
  };
}

describe('ExplanationAudit benchmark', () => {
  it('5문항 후보 기준의 모든 claim 인용이 해설 정본에 존재한다', () => {
    const root = process.cwd();
    const benchmark = ExplanationAuditBenchmarkSchema.parse(JSON.parse(readFileSync(resolve(
      root,
      'packages/pipeline/experiments/problem-solving/problem-gold-explanation-audit-benchmark-v1.json',
    ), 'utf8')));
    const corpus = JSON.parse(readFileSync(resolve(
      root,
      'packages/pipeline/experiments/problem-solving/problem-gold-explanation-cycle-corpus-v1.json',
    ), 'utf8')) as { items: { caseId: string; explanation: { text: string } }[] };

    expect(benchmark.cases).toHaveLength(5);
    for (const benchmarkCase of benchmark.cases) {
      const explanation = corpus.items.find((item) => item.caseId === benchmarkCase.caseId)
        ?.explanation.text;
      expect(explanation).toBeDefined();
      for (const claim of benchmarkCase.claims) {
        expect(explanation).toContain(claim.sourceText);
      }
    }
  });

  it('사람 기준 claim의 누락률·등급·배치 정확도를 계산한다', () => {
    const audit = {
      schemaVersion: EXPLANATION_AUDIT_VERSION,
      explanationHash: canonicalExplanationReferenceHash(reference),
      claims: [claim('EC1', 'A는 B보다 크다.', 'SOURCE_EXPLICIT', 'BASE_GOLD')],
      omittedSegments: [], coverage: 'COMPLETE', overallDecision: 'PASS',
      unresolvedRisks: [], reason: '완료',
    };
    const benchmark = {
      caseId: 'case-1', reviewStatus: 'human_reviewed',
      claims: [
        { benchmarkClaimId: 'BC1', sourceText: 'A는 B보다 크다.', classification: 'SOURCE_EXPLICIT', placement: 'BASE_GOLD', reason: '직접 명시' },
        { benchmarkClaimId: 'BC2', sourceText: '따라서 C가 성립한다.', classification: 'SOURCE_DERIVED', placement: 'BASE_GOLD', reason: '도출' },
      ],
    };

    expect(evaluateExplanationAuditBenchmark(audit, benchmark)).toEqual(
      expect.objectContaining({
        totalBenchmarkClaims: 2,
        matchedClaims: 1,
        omittedClaims: 1,
        claimOmissionRate: 0.5,
        classificationAccuracy: 0.5,
        placementAccuracy: 0.5,
      }),
    );
  });
});
