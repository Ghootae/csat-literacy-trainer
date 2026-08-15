import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildSourceBundle, qualificationArtifactHash } from './candidate-qualification.js';
import { planRegressionArbitration } from './cli/content-arbitrate-regression.js';
import { GeneratedQuerySetSchema, type GeneratedQuerySet } from './llm/query-gen.js';
import {
  ArbitrationReportSchema,
  arbitrateFromPasses,
  arbitrationHash,
  arbitrationPreflight,
  arbitrationRequired,
  type ArbitrationInput,
  type ProductionQueryJudgment,
} from './regression-arbitration.js';
import { ProbeQualificationRecordSchema, ProbeVerifierReportSchema, type ProbeVerifierReport } from './regression-probe-qualification.js';
import { semanticCandidateHash } from './semantic-verification.js';
import { assertPassageSourceFixtureIntegrity } from './source-fixture.js';

const ROOT = process.cwd();
const read = (path: string) => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
const source = assertPassageSourceFixtureIntegrity(read('packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json'));
const bundle = buildSourceBundle(source, 'p2');
const querySet = GeneratedQuerySetSchema.parse(read('packages/pipeline/fixtures/candidates/corporate-law-p2/queries.json')) as GeneratedQuerySet;
const oracle = ProbeQualificationRecordSchema.parse(read('packages/pipeline/fixtures/probe-qualification/corporate-law-p2/2026-08-15-v4/이사회-관계오류.json'));
const response = '재단 법인의 이사회는 최종 결정권자이므로 주요 사항도 관할 기관의 허가 없이 결정한다.';

function production(report: ProbeVerifierReport): ProductionQueryJudgment[] {
  return report.judgments.map((item) => ({ queryId: item.queryId, semanticState: item.semanticState, expressionMode: item.expressionMode, evidenceRole: item.evidenceRole, evidence: item.studentEvidence }));
}

function topicJudgments(): ProductionQueryJudgment[] {
  return querySet.regions.flatMap((region) => region.queries.map((query) => ({
    queryId: query.id,
    semanticState: query.id === 'r3-scope' ? 'preserved' as const : 'not_evidenced' as const,
    expressionMode: query.id === 'r3-scope' ? 'explicit' as const : 'none' as const,
    evidenceRole: query.id === 'r3-scope' ? 'scope' as const : 'none' as const,
    evidence: query.id === 'r3-scope' ? '재단 법인의 이사회' : '',
  })));
}

function reportFrom(values: readonly ProductionQueryJudgment[]) {
  return ArbitrationReportSchema.parse({
    schemaVersion: 'regression-arbitration-report-v1',
    judgments: values.map((item) => ({
      queryId: item.queryId,
      semanticState: item.semanticState,
      expressionMode: item.semanticState === 'preserved' ? item.expressionMode : 'none',
      evidenceRole: item.semanticState === 'preserved' ? (item.evidenceRole ?? 'scope') : 'none',
      studentEvidence: item.semanticState === 'not_evidenced' ? '' : item.evidence,
      sourceEvidenceRefs: item.semanticState === 'contradicted' ? [{ sourceSegmentId: 'S5' }] : item.semanticState === 'preserved' ? [{ sourceSegmentId: 'S4' }] : [],
      rationale: '고정 중재 fixture',
    })),
  });
}

function input(overrides: Partial<ArbitrationInput> = {}): ArbitrationInput {
  const evaluatorJudgments = topicJudgments();
  return {
    paragraphId: 'corporate-law-p2', probeId: '이사회-관계오류', focalRegionId: 'r3', studentResponse: response,
    bundle, sourceBundleHash: qualificationArtifactHash(bundle), querySet, queryCandidateHash: semanticCandidateHash(querySet),
    oracle, oracleRecordHash: arbitrationHash(oracle), evaluatorJudgments, evaluatorVerdict: 'topic_only', ...overrides,
  };
}

const pass = (id: string, report: ReturnType<typeof reportFrom>) => ({ invocationId: id, resultReplay: false as const, report });

describe('regression mismatch arbitration', () => {
  it('exact-match p2 canary dry-run은 API 0회를 계획한다', () => {
    const plan = planRegressionArbitration([
      '--fixture', 'packages/pipeline/fixtures/regression/corporate-law-p2.json',
      '--source-fixture', 'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
      '--source-paragraph-id', 'p2',
      '--oracle-record', 'packages/pipeline/fixtures/probe-qualification/corporate-law-p2/2026-08-15-v4/기본재산-논항누락.json',
      '--regression-result', 'packages/pipeline/fixtures/semantic-qualification/corporate-law-p2/2026-08-14T11-34-30-000Z/production-regression-result.json',
      '--probe-id', '기본재산-논항누락',
      '--output', 'packages/pipeline/fixtures/regression-arbitration/test-dry-run.json',
      '--dry-run',
    ]);
    expect(plan.preflightStatus).toBe('passed');
    expect(plan.arbitrationRequired).toBe(false);
    expect(plan.expectedLogicalApiCalls).toBe(0);
  });

  it('hash/evidence/aggregation 계약 오류를 API 전에 격리한다', () => {
    const bad = input({ queryCandidateHash: `sha256:${'0'.repeat(64)}` });
    expect(arbitrationPreflight(bad)).toContain('oracle/query candidate hash 불일치');
    const result = arbitrateFromPasses(bad, []);
    expect(result.arbitrationOutcome).toBe('contract_error');
    expect(result.passes).toHaveLength(0);
    expect(result.promotionBlocked).toBe(true);
  });

  it('action mismatch만 중재 대상으로 삼는다', () => {
    expect(arbitrationRequired(input())).toBe(true);
    expect(arbitrationRequired(input({ evaluatorJudgments: production(oracle.passes[1]!.report), evaluatorVerdict: 'contradicted' }))).toBe(false);
  });

  it('독립 권고가 oracle과 일치하면 evaluator_error다', () => {
    const recommendation = reportFrom(production(oracle.passes[1]!.report));
    const result = arbitrateFromPasses(input(), [pass('a', recommendation), pass('b', recommendation)]);
    expect(result.arbitrationOutcome).toBe('evaluator_error');
    expect(result.promotionBlocked).toBe(true);
    expect(result.repairCandidate).toBeUndefined();
  });

  it('독립 권고가 evaluator와 일치하면 적용되지 않은 oracle repair candidate를 만든다', () => {
    const recommendation = reportFrom(topicJudgments());
    const result = arbitrateFromPasses(input(), [pass('a', recommendation), pass('b', recommendation)]);
    expect(result.arbitrationOutcome).toBe('oracle_error_candidate');
    expect(result.repairCandidate).toEqual({ status: 'pending_independent_revalidation', proposedExpectedVerdict: 'topic_only', applied: false });
    expect(result.qualificationOutcome).toBe('auto_qualified');
    expect(result.promotionBlocked).toBe(true);
  });

  it('두 중재 pass의 state/source refs가 다르면 inconclusive quarantine이다', () => {
    const first = reportFrom(production(oracle.passes[1]!.report));
    const second = structuredClone(first);
    second.judgments.find((item) => item.queryId === 'r3-scope')!.sourceEvidenceRefs = [{ sourceSegmentId: 'S4' }];
    first.judgments.find((item) => item.queryId === 'r3-scope')!.sourceEvidenceRefs = [{ sourceSegmentId: 'S5' }];
    const result = arbitrateFromPasses(input(), [pass('a', first), pass('b', second)]);
    expect(result.arbitrationOutcome).toBe('inconclusive');
    expect(result.qualificationOutcome).toBe('quarantined');
  });

  it('같은 invocation 두 개는 독립 pass가 아니다', () => {
    const recommendation = reportFrom(topicJudgments());
    expect(arbitrateFromPasses(input(), [pass('same', recommendation), pass('same', recommendation)]).arbitrationOutcome).toBe('inconclusive');
  });

  it('topic_only와 region_not_evidenced의 비차단 차이는 중재하지 않는다', () => {
    const topicOracle = structuredClone(oracle);
    topicOracle.derivedExpectedVerdict = 'topic_only';
    topicOracle.fixtureExpectedVerdict = 'topic_only';
    const topicReport = reportFrom(topicJudgments());
    const probeReport = ProbeVerifierReportSchema.parse({ schemaVersion: 'regression-probe-verifier-report-v3-contradiction-evidence', judgments: topicReport.judgments });
    topicOracle.passes = [
      { invocationId: 'topic-a', resultReplay: false, report: probeReport },
      { invocationId: 'topic-b', resultReplay: false, report: probeReport },
    ];
    const evaluator = querySet.regions.flatMap((region) => region.queries.map((query) => ({ queryId: query.id, semanticState: 'not_evidenced' as const, expressionMode: 'none' as const, evidenceRole: 'none' as const, evidence: '' })));
    const value = input({ oracle: topicOracle, evaluatorJudgments: evaluator, evaluatorVerdict: 'region_not_evidenced' });
    const result = arbitrateFromPasses(value, []);
    expect(result.arbitrationOutcome).toBe('not_required');
    expect(result.promotionBlocked).toBe(false);
  });
});
