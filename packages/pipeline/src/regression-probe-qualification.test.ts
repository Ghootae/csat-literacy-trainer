import { describe, expect, it } from 'vitest';

import type { SourceBundle } from './candidate-qualification.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  assertProbeVerifierReport,
  deriveProbeVerdict,
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
  return {
    schemaVersion: 'regression-probe-verifier-report-v1',
    judgments: [
      { queryId: 'q-scope', semanticState: 'preserved', expressionMode: 'explicit', evidenceRole: 'scope', studentEvidence: '자산', sourceEvidenceRefs: [{ sourceSegmentId: 'S1' }], rationale: '화제' },
      { queryId: 'q-rel', semanticState: rel, expressionMode: rel === 'preserved' ? 'explicit' : 'none', evidenceRole: rel === 'preserved' ? 'relation' : 'none', studentEvidence: rel === 'preserved' ? '처분에는 허가' : '', sourceEvidenceRefs: refs.map((sourceSegmentId) => ({ sourceSegmentId })), rationale: '관계' },
    ],
  };
}

const PROBE = {
  id: 'probe', expectFocal: 'topic_only' as const, text: '자산',
  mutationSpec: { targetQueryIds: ['q-rel'], mutation: 'omit_relation' as const, preservedElements: ['자산'], omittedElements: ['처분과 허가'], contradictedElements: [], expectedCeiling: 'topic_only' as const, rationale: '관계 삭제' },
};

describe('regression probe qualification', () => {
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

  it('query state나 source evidence ref가 다르면 quarantine한다', () => {
    const changedRefs = report('not_evidenced', []);
    const result = qualifyProbeFromPasses({ paragraphId: 'p-test', probe: PROBE, defaultFocal: 'r1', querySet: QUERY, queryCandidateHash: `sha256:${'1'.repeat(64)}`, sourceBundleHash: `sha256:${'2'.repeat(64)}`, passes: [
      { invocationId: 'a', resultReplay: false, report: report('not_evidenced') },
      { invocationId: 'b', resultReplay: false, report: changedRefs },
    ], now: '2026-08-14T00:00:00.000Z' });
    expect(result.qualificationOutcome).toBe('quarantined');
  });

  it('응답 substring과 source ID 계약을 fail-closed로 검사한다', () => {
    expect(() => assertProbeVerifierReport({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산' }, report('preserved'))).toThrow('studentEvidence');
    expect(() => assertProbeVerifierReport({ paragraphId: 'p-test', bundle: BUNDLE, querySet: QUERY, studentResponse: '자산' }, report('not_evidenced', ['S9']))).toThrow('source segment');
  });
});
