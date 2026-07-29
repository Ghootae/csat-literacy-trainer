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

// N1 — 과정형 문단(명제 다수)에서 참고 세부가 결손표처럼 길어지던 회귀.
const procMeta: AssessRegionMeta = {
  id: 'calvin',
  label: '캘빈 회로',
  propositionIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
};
const procQueries: AssessQuery[] = [
  {
    id: 'qCore',
    regionId: 'calvin',
    level: 'relation',
    propositionIds: ['c1', 'c2'],
    expectedAnswer: '이산화 탄소 고정 → 3탄당 → RuBP 재생의 순환',
    critical: true,
  },
];
const procShortForms = new Map([
  ['c1', '이산화 탄소 고정'],
  ['c2', '순환 구조'],
  ['c3', '기공 폐쇄'],
  ['c4', '3탄당 생성'],
  ['c5', 'RuBP 재생'],
  ['c6', 'ATP 소모'],
  ['c7', '결합 비율'],
]);
/** 관계보존 + 나머지 명제는 전부 미확인 — 참고 세부 후보가 c3~c7 다섯 개가 되는 상황. */
function procFeedback(propWeight?: ReadonlyMap<string, number>): string {
  const verdicts = new Map([['qCore', V('preserved', 'explicit')]]);
  const [a] = assess(
    [region('calvin', 'relation_preserved')],
    [procMeta],
    procQueries,
    verdicts,
    procShortForms,
    propWeight,
  );
  return a!.feedback;
}

describe('참고 세부 상한 (N1)', () => {
  it('후보가 상한을 넘으면 3개까지만 나열한다', () => {
    const feedback = procFeedback();
    const listed = ['기공 폐쇄', '3탄당 생성', 'RuBP 재생', 'ATP 소모', '결합 비율'].filter((s) =>
      feedback.includes(s),
    );
    expect(listed).toHaveLength(3);
  });

  it('가중치가 없으면 골드 순서로 자른다 (결정적)', () => {
    const feedback = procFeedback();
    expect(feedback).toContain('기공 폐쇄');
    expect(feedback).toContain('3탄당 생성');
    expect(feedback).toContain('RuBP 재생');
    expect(feedback).not.toContain('ATP 소모');
    expect(feedback).not.toContain('결합 비율');
  });

  it('가중치를 주면 상위부터 남는다 — 골드 순서 뒤쪽이라도', () => {
    const weights = new Map([
      ['c3', 0.1],
      ['c4', 0.2],
      ['c5', 0.3],
      ['c6', 0.8],
      ['c7', 0.9],
    ]);
    const feedback = procFeedback(weights);
    expect(feedback).toContain('결합 비율'); // W 0.9
    expect(feedback).toContain('ATP 소모'); // W 0.8
    expect(feedback).toContain('RuBP 재생'); // W 0.3
    expect(feedback).not.toContain('기공 폐쇄');
    expect(feedback).not.toContain('3탄당 생성');
  });

  it('핵심 관계를 이루는 명제는 상한과 무관하게 참고 세부에서 빠진다', () => {
    const feedback = procFeedback();
    expect(feedback).not.toContain('순환 구조'); // c2 = 핵심 질의 앵커
  });

  it('후보가 상한 이하면 그대로 나열한다', () => {
    const verdicts = new Map([['qRel', V('preserved', 'implicit')], ['qArg', V('not_evidenced', 'none', '')]]);
    const shortForms = new Map([['p9b', '운용자는 정관·법령상 권한자']]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts, shortForms);
    expect(a!.feedback).toContain('권한자');
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
