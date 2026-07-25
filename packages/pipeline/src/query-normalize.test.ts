import { describe, expect, it } from 'vitest';

import {
  type RawQueryVerdict,
  type RegionPolicy,
  displayLabel,
  normalizeQueryStates,
} from './query-normalize.js';

/**
 * 자산 운용 영역 모사: scope(s) + 관계 구조(rel) + 논항 두 개(a1=역할주체, a2=자격조건).
 * criticalForRelation = [rel, a1] (a1은 논항이지만 역할 분리의 핵심).
 * requiredForFullArgument = [a1, a2].
 */
const ASSET: RegionPolicy = {
  id: 'asset',
  label: '자산 운용',
  scopeQueries: ['s'],
  relationQueries: ['rel'],
  argumentQueries: ['a1', 'a2'],
  criticalForRelation: ['rel', 'a1'],
  requiredForFullArgument: ['a1', 'a2'],
};

/** 관계만 있는 영역 (scope 질의도 논항도 없음). */
const RELATION_ONLY: RegionPolicy = {
  id: 'ro',
  label: '관계만',
  scopeQueries: [],
  relationQueries: ['rel'],
  argumentQueries: [],
  criticalForRelation: ['rel'],
  requiredForFullArgument: [],
};

function raw(...vs: RawQueryVerdict[]): Map<string, RawQueryVerdict> {
  return new Map(vs.map((v) => [v.queryId, v]));
}
const P = (id: string, mode: 'explicit' | 'implicit'): RawQueryVerdict => ({
  queryId: id,
  semanticState: 'preserved',
  expressionMode: mode,
});
const N = (id: string): RawQueryVerdict => ({ queryId: id, semanticState: 'not_evidenced', expressionMode: 'none' });
const C = (id: string): RawQueryVerdict => ({ queryId: id, semanticState: 'contradicted', expressionMode: 'none' });

function one(policy: RegionPolicy, m: Map<string, RawQueryVerdict>) {
  return normalizeQueryStates(m, [policy])[0]!;
}

describe('세 축 분리 — 축 혼합 verdict를 기본 데이터로 반환하지 않는다', () => {
  it('relation preserved + arguments partial + implicit → relation_preserved / partial / implicit (E2 유형)', () => {
    // s 미표현, rel/a1 병치 보존(implicit), a2(자격) 미보존
    const r = one(ASSET, raw(N('s'), P('rel', 'implicit'), P('a1', 'implicit'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.argumentCoverage).toBe('partial');
    expect(r.expressionProfile).toBe('implicit');
    // 편의 라벨은 고해상도가 아니어야 한다 (암묵·부분).
    expect(displayLabel(r)).toBe('relation_preserving_abstraction');
  });

  it('relation preserved + arguments full + explicit → relation_preserved / full / explicit (F 유형)', () => {
    const r = one(ASSET, raw(P('s', 'explicit'), P('rel', 'explicit'), P('a1', 'explicit'), P('a2', 'explicit')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.argumentCoverage).toBe('full');
    expect(r.expressionProfile).toBe('explicit');
    expect(displayLabel(r)).toBe('explicit_high_resolution');
  });

  it('E2와 F는 동일 의미(relation_preserved)라도 논항·표현 축에서 구분된다', () => {
    const e2 = one(ASSET, raw(N('s'), P('rel', 'implicit'), P('a1', 'implicit'), N('a2')));
    const f = one(ASSET, raw(P('s', 'explicit'), P('rel', 'explicit'), P('a1', 'explicit'), P('a2', 'explicit')));
    expect(e2.regionSemanticVerdict).toBe(f.regionSemanticVerdict); // 둘 다 관계 보존
    expect(e2.argumentCoverage).not.toBe(f.argumentCoverage); // partial vs full
    expect(e2.expressionProfile).not.toBe(f.expressionProfile); // implicit vs explicit
  });
});

describe('의미 축 사다리', () => {
  it('scope preserved + 핵심 관계 없음 → topic_only (B 유형)', () => {
    const r = one(ASSET, raw(P('s', 'explicit'), N('rel'), N('a1'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('topic_only');
    expect(r.argumentCoverage).toBe('none');
    expect(r.expressionProfile).toBe('none');
  });

  it('핵심 관계 일부만 preserved → partial_relation_preservation (E3 유형)', () => {
    // rel 미보존, a1만 병치 보존 → 핵심 2개 중 1개. 관계 구조는 표현 안 됐으므로 expr=none.
    const r = one(ASSET, raw(P('s', 'explicit'), N('rel'), P('a1', 'implicit'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('partial_relation_preservation');
    expect(r.argumentCoverage).toBe('partial');
    expect(r.expressionProfile).toBe('none');
  });

  it('어디에도 증거 없음 → region_not_evidenced (C 유형)', () => {
    const r = one(ASSET, raw(N('s'), N('rel'), N('a1'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('region_not_evidenced');
    expect(r.scope.semanticState).toBe('not_evidenced');
  });

  it('contradicted 존재 → contradicted (D 유형)', () => {
    const r = one(ASSET, raw(P('s', 'explicit'), C('rel'), C('a1'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('contradicted');
    expect(r.contradiction).toBe(true);
    expect(displayLabel(r)).toBe('region_contradicted');
  });
});

describe('규칙 1·2 — scope 승격 (양방향)', () => {
  it('scope 미표현이라도 핵심 관계 preserved면 scope preserved+implicit로 승격', () => {
    const r = one(ASSET, raw(N('s'), P('rel', 'implicit'), P('a1', 'implicit'), N('a2')));
    expect(r.rawScope.semanticState).toBe('not_evidenced');
    expect(r.scope.semanticState).toBe('preserved');
    expect(r.scope.source).toBe('promoted_relation');
    expect(r.scopePromoted).toBe(true);
  });

  it('scope가 이미 preserved+explicit이면 승격이 implicit으로 낮추지 않음', () => {
    const r = one(ASSET, raw(P('s', 'explicit'), P('rel', 'implicit'), N('a1'), N('a2')));
    expect(r.scope.expressionMode).toBe('explicit');
    expect(r.scopePromoted).toBe(false);
  });

  it('모순은 scope 미포착이 아니라 preserved+implicit로 정렬 + contradiction 표시', () => {
    const r = one(ASSET, raw(N('s'), C('rel'), N('a1'), N('a2')));
    expect(r.scope.source).toBe('promoted_contradiction');
    expect(r.regionSemanticVerdict).toBe('contradicted');
  });
});

describe('논항 없는 영역 — 커버리지는 none, 상한은 관계 보존', () => {
  it('scope 질의·논항 없이 핵심 관계만 preserved', () => {
    const r = one(RELATION_ONLY, raw(P('rel', 'explicit')));
    expect(r.scope.source).toBe('promoted_relation');
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.argumentCoverage).toBe('none');
    // 논항이 없으므로 full+explicit 조건 불충족 → 고해상도 아님
    expect(displayLabel(r)).toBe('relation_preserving_abstraction');
  });

  it('관계도 없으면 region_not_evidenced', () => {
    const r = one(RELATION_ONLY, raw(N('rel')));
    expect(r.regionSemanticVerdict).toBe('region_not_evidenced');
  });
});

describe('표현 프로필은 관계 구조 기준 — 논항 명시성을 섞지 않는다', () => {
  it('관계 병치(implicit) + 논항 명시(explicit)여도 expr=implicit (E2 유형 — mixed로 오염 안 됨)', () => {
    const r = one(ASSET, raw(N('s'), P('rel', 'implicit'), P('a1', 'explicit'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.expressionProfile).toBe('implicit'); // rel이 implicit이므로 — a1의 explicit에 오염되지 않음
    expect(r.argumentCoverage).toBe('partial');
  });

  it('관계 구조 질의가 둘이고 표현이 갈릴 때만 mixed', () => {
    const twoRel: RegionPolicy = {
      id: 'tr',
      label: '두 관계',
      scopeQueries: [],
      relationQueries: ['r1', 'r2'],
      argumentQueries: [],
      criticalForRelation: ['r1', 'r2'],
      requiredForFullArgument: [],
    };
    const r = one(twoRel, raw(P('r1', 'explicit'), P('r2', 'implicit')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.expressionProfile).toBe('mixed');
  });
});
