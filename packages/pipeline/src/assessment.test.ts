import { describe, expect, it } from 'vitest';

import { type AssessQuery, type AssessRegionMeta, type QueryVerdict, assess, overallCategory } from './assessment.js';
import type { NormalizedRegion, RegionSemanticVerdict } from './query-normalize.js';

function region(id: string, verdict: RegionSemanticVerdict): NormalizedRegion {
  return {
    id,
    label: id,
    scope: { semanticState: 'preserved', expressionMode: 'explicit', source: 'scope_query' },
    rawScope: { semanticState: 'preserved', expressionMode: 'explicit', source: 'scope_query' },
    scopePromoted: false,
    relations: [],
    arguments: [],
    contradiction: verdict === 'contradicted',
    regionSemanticVerdict: verdict,
    argumentCoverage: 'partial',
    expressionProfile: 'explicit',
  };
}
const meta: AssessRegionMeta = { id: 'asset', label: '자산 운용', propositionIds: ['p7', 'p9a', 'p9b'] };
const queries: AssessQuery[] = [
  { id: 'qRel', regionId: 'asset', level: 'relation', propositionIds: ['p7', 'p9a'], expectedAnswer: '법인 소유 vs 사람 운용의 역할 분리', critical: true },
  { id: 'qArg', regionId: 'asset', level: 'argument', propositionIds: ['p9b'], expectedAnswer: '운용자는 권한자', critical: false },
];
const V = (semanticState: QueryVerdict['semanticState'], expressionMode: QueryVerdict['expressionMode'], viaItem = '항목1'): QueryVerdict => ({ semanticState, expressionMode, evidence: '', viaItem });

describe('명제 evidence — 골드 명제 앵커링, 점수 아님', () => {
  it('직접 진술→evidenced, 병치→supported_by_abstraction, 미언급→not_evidenced', () => {
    const verdicts = new Map([['qRel', V('preserved', 'implicit')], ['qArg', V('not_evidenced', 'none', '')]]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p7')).toBe('supported_by_abstraction'); // qRel implicit
    expect(byId.get('p9a')).toBe('supported_by_abstraction');
    expect(byId.get('p9b')).toBe('not_evidenced'); // qArg 미언급
  });

  it('모순이 다른 상태보다 우선', () => {
    const verdicts = new Map([['qRel', V('contradicted', 'none')], ['qArg', V('preserved', 'explicit')]]);
    const [a] = assess([region('asset', 'contradicted')], [meta], queries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p7')).toBe('contradicted');
    expect(byId.get('p9b')).toBe('evidenced');
  });
});

describe('핵심 채점축은 regionSemanticVerdict 그대로 통과', () => {
  it('verdict를 바꾸지 않는다', () => {
    for (const v of ['relation_preserved', 'topic_only', 'contradicted', 'region_not_evidenced'] as RegionSemanticVerdict[]) {
      const [a] = assess([region('asset', v)], [meta], queries, new Map());
      expect(a!.verdict).toBe(v);
    }
  });
  it('argumentCoverage/expressionProfile은 _debug로만 노출(점수 아님)', () => {
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, new Map());
    expect(a!._debug.argumentCoverage).toBe('partial');
    expect('argumentCoverage' in a!).toBe(false);
  });
});

describe('피드백 — 설명형, not_evidenced를 결손으로 취급하지 않음', () => {
  it('relation_preserved: 포착한 관계 + 세부는 감점 아닌 참고로', () => {
    const verdicts = new Map([['qRel', V('preserved', 'implicit')], ['qArg', V('not_evidenced', 'none', '')]]);
    const shortForms = new Map([['p9b', '운용자는 정관·법령상 권한자']]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts, shortForms);
    expect(a!.feedback).toContain('잘 포착');
    expect(a!.feedback).toContain('감점 요소는 아닙니다');
    expect(a!.feedback).toContain('권한자'); // 빠진 세부(p9b)를 참고로 안내
  });
  it('topic_only: 관계로 표현하도록 안내', () => {
    const [a] = assess([region('asset', 'topic_only')], [meta], queries, new Map());
    expect(a!.feedback).toContain('화제는 짚었지만');
    expect(a!.feedback).toContain('관계');
  });
  it('contradicted: 어긋난 지점을 지목', () => {
    const verdicts = new Map([['qRel', V('contradicted', 'none')]]);
    const [a] = assess([region('asset', 'contradicted')], [meta], queries, verdicts);
    expect(a!.feedback).toContain('잘못 이해');
  });
});

describe('overallCategory', () => {
  it('모순 하나라도 있으면 관계오류', () => {
    expect(overallCategory([region('a', 'relation_preserved'), region('b', 'contradicted')], 'a')).toBe('관계오류');
  });
  it('전부 미포착이면 공허', () => {
    expect(overallCategory([region('a', 'region_not_evidenced'), region('b', 'region_not_evidenced')], 'a')).toBe('공허');
  });
  it('focal 기준 관계보존/주제만', () => {
    expect(overallCategory([region('a', 'relation_preserved'), region('b', 'topic_only')], 'a')).toBe('관계보존');
    expect(overallCategory([region('a', 'topic_only'), region('b', 'region_not_evidenced')], 'a')).toBe('주제만');
  });
});
