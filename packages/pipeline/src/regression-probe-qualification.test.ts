import { describe, expect, it } from 'vitest';

import type { SourceBundle } from './candidate-qualification.js';
import { planProbeQualification } from './cli/content-qualify-probes.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  assertProbeVerifierReport,
  deriveProbeVerdict,
  ProbeVerifierReportSchema,
  probeVerifierModelInput,
  qualifyProbeFromPasses,
  type ProbeVerifierReport,
} from './regression-probe-qualification.js';

const QUERY: GeneratedQuerySet = {
  paragraphId: 'p-test',
  regions: [{
    regionId: 'r1', label: '관계', sourceSentenceIds: ['S1'], propositionIds: ['p1'], relationEdgeIds: [],
    queries: [
      { id: 'q-scope', level: 'scope', question: '화제?', expectedAnswer: '자산 통제', sourceSentenceIds: ['S1'], propositionIds: ['p1'], relationEdgeIds: [], criticalForRelation: false, requiredForFullArgumentCoverage: false, acceptanceCriteria: ['자산 통제'], contradictionCriteria: [] },
      { id: 'q-rel', level: 'relation', question: '조건?', expectedAnswer: '처분에는 허가', sourceSentenceIds: ['S1'], propositionIds: ['p1'], relationEdgeIds: [], criticalForRelation: true, requiredForFullArgumentCoverage: true, acceptanceCriteria: ['처분과 허가를 연결'], contradictionCriteria: ['허가 불필요'] },
    ],
  }],
};

const BUNDLE = {
  segments: [{ sourceSegmentId: 'S1', text: '자산 처분에는 허가가 필요하다.' }],
} as unknown as SourceBundle;

function report(rel: 'preserved' | 'not_evidenced' | 'contradicted', refs = ['S1']): ProbeVerifierReport {
  const relation = rel === 'preserved'
    ? { queryId: 'q-rel', semanticState: 'preserved' as const, expressionMode: 'explicit' as const, evidenceRole: 'relation' as const, studentEvidence: '처분에는 허가', sourceEvidenceRefs: refs.map((sourceSegmentId) => ({ sourceSegmentId })), rationale: '관계' }
    : rel === 'contradicted'
      ? { queryId: 'q-rel', semanticState: 'contradicted' as const, expressionMode: 'none' as const, evidenceRole: 'none' as const, studentEvidence: '허가 없이', sourceEvidenceRefs: refs.map((sourceSegmentId) => ({ sourceSegmentId })), rationale: '모순' }
      : { queryId: 'q-rel', semanticState: 'not_evidenced' as const, expressionMode: 'none' as const, evidenceRole: 'none' as const, studentEvidence: '' as const, sourceEvidenceRefs: [], rationale: '미보존' };
  return ProbeVerifierReportSchema.parse({
    schemaVersion: 'regression-probe-verifier-report-v3-contradiction-evidence',
    judgments: [
      { queryId: 'q-scope', semanticState: 'preserved', expressionMode: 'explicit', evidenceRole: 'scope', studentEvidence: '자산', sourceEvidenceRefs: [{ sourceSegmentId: 'S1' }], rationale: '화제' },
      relation,
    ],
  });
}

const PROBE = {
  id: 'probe', expectFocal: 'topic_only' as const, text: '자산',
  mutationSpec: { targetQueryIds: ['q-rel'], mutation: 'omit_relation' as const, preservedElements: ['자산'], omittedElements: ['처분과 허가'], contradictedElements: [], expectedCeiling: 'topic_only' as const, rationale: '관계 삭제' },
};

describe('regression probe qualification', () => {
  it('단일 probe dry-run은 정확히 두 호출만 계획한다', () => {
    const plan = planProbeQualification([
      '--fixture', 'packages/pipeline/fixtures/regression/corporate-law-p2.json',
      '--source-fixture', 'packages/pipeline/fixtures/sources/69bbf88d8937cf14551903ca.json',
      '--source-paragraph-id', 'p2',
      '--output-dir', 'packages/pipeline/fixtures/probe-qualification/test-dry-run-only',
      '--probe-ids', '이사회-관계오류',
      '--dry-run',
    ]);
    expect(plan.probeIds).toEqual(['이사회-관계오류']);
    expect(plan.expectedLogicalApiCalls).toBe(2);
  });

  it('모델 입력에서 mutation과 기대 verdict를 제외한다', () => {
    const input = probeVerifierModelInput({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산' });
    expect(Object.keys(input).sort()).toEqual(['primaryTextSegments', 'queries', 'studentResponse']);
    expect(JSON.stringify(input)).not.toContain('expectFocal');
    expect(JSON.stringify(input)).not.toContain('mutationSpec');
  });

  it('query별 판정을 제품 집계기로 계산한다', () => {
    expect(deriveProbeVerdict(QUERY, report('not_evidenced'), 'r1')).toBe('topic_only');
    expect(deriveProbeVerdict(QUERY, report('preserved'), 'r1')).toBe('relation_preserved');
    expect(deriveProbeVerdict(QUERY, report('contradicted'), 'r1')).toBe('contradicted');
  });

  it('서로 다른 invocation의 완전 일치 두 pass만 자동 확정한다', () => {
    const result = qualifyProbeFromPasses({ paragraphId: 'p-test', probe: PROBE, defaultFocal: 'r1', querySet: QUERY, queryCandidateHash: `sha256:${'1'.repeat(64)}`, sourceBundleHash: `sha256:${'2'.repeat(64)}`, passes: [
      { invocationId: 'a', resultReplay: false, report: report('not_evidenced') },
      { invocationId: 'b', resultReplay: false, report: report('not_evidenced') },
    ], now: '2026-08-14T00:00:00.000Z' });
    expect(result.qualificationOutcome).toBe('auto_qualified');
    expect(result.derivedExpectedVerdict).toBe('topic_only');
    expect(result.fixtureAgreement).toBe(true);
  });

  it('부수 진단 expressionMode 차이는 semantic oracle agreement를 깨지 않는다', () => {
    const second = structuredClone(report('not_evidenced'));
    second.judgments[0]!.expressionMode = 'implicit';
    const result = qualifyProbeFromPasses({ paragraphId: 'p-test', probe: PROBE, defaultFocal: 'r1', querySet: QUERY, queryCandidateHash: `sha256:${'1'.repeat(64)}`, sourceBundleHash: `sha256:${'2'.repeat(64)}`, passes: [
      { invocationId: 'a', resultReplay: false, report: report('not_evidenced') },
      { invocationId: 'b', resultReplay: false, report: second },
    ], now: '2026-08-14T00:00:00.000Z' });
    expect(result.qualificationOutcome).toBe('auto_qualified');
  });

  it('query state나 source evidence ref가 다르면 quarantine한다', () => {
    const changedRefs = report('preserved', []);
    const result = qualifyProbeFromPasses({ paragraphId: 'p-test', probe: { ...PROBE, expectFocal: 'relation_preserved' }, defaultFocal: 'r1', querySet: QUERY, queryCandidateHash: `sha256:${'1'.repeat(64)}`, sourceBundleHash: `sha256:${'2'.repeat(64)}`, passes: [
      { invocationId: 'a', resultReplay: false, report: report('preserved') },
      { invocationId: 'b', resultReplay: false, report: changedRefs },
    ], now: '2026-08-14T00:00:00.000Z' });
    expect(result.qualificationOutcome).toBe('quarantined');
  });

  it('source evidence ref의 순서와 중복은 정규화한 뒤 비교한다', () => {
    const first = report('contradicted', ['S1', 'S1']);
    const second = report('contradicted', ['S1']);
    const result = qualifyProbeFromPasses({ paragraphId: 'p-test', probe: { ...PROBE, expectFocal: 'contradicted' }, defaultFocal: 'r1', querySet: QUERY, queryCandidateHash: `sha256:${'1'.repeat(64)}`, sourceBundleHash: `sha256:${'2'.repeat(64)}`, passes: [
      { invocationId: 'a', resultReplay: false, report: first },
      { invocationId: 'b', resultReplay: false, report: second },
    ], now: '2026-08-14T00:00:00.000Z' });
    expect(result.qualificationOutcome).toBe('auto_qualified');
  });

  it('contradicted는 학생 근거와 source ref가 필수이고 not_evidenced는 둘 다 비운다', () => {
    const contradicted = report('contradicted');
    expect(() => assertProbeVerifierReport({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산' }, contradicted)).toThrow('studentEvidence');
    const missingSource = structuredClone(contradicted) as unknown as { judgments: Array<{ sourceEvidenceRefs: unknown[] }> };
    missingSource.judgments[1]!.sourceEvidenceRefs = [];
    expect(() => ProbeVerifierReportSchema.parse(missingSource)).toThrow();
    const unexpectedEvidence = structuredClone(report('not_evidenced')) as unknown as { judgments: Array<{ studentEvidence: string }> };
    unexpectedEvidence.judgments[1]!.studentEvidence = '자산';
    expect(() => ProbeVerifierReportSchema.parse(unexpectedEvidence)).toThrow();
  });

  it('응답 substring과 source ID 계약을 fail-closed로 검사한다', () => {
    expect(() => assertProbeVerifierReport({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산' }, report('preserved'))).toThrow('studentEvidence');
    expect(() => assertProbeVerifierReport({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산 처분에는 허가' }, report('preserved', ['S9']))).toThrow('source segment');
  });
});
