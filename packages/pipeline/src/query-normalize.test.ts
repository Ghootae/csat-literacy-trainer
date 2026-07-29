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

  /**
   * 구 "E3 유형" 테스트의 의미적 정정 (2026-07-29).
   *
   * 원래 시나리오는 `ASSET`에서 rel 미보존 + a1(역할 주체) 보존 → partial이었다. 이 테스트가
   * 표현하려던 것은 **사다리의 중간 단**(핵심 관계를 일부만 보존하면 partial)이지, 논항만
   * 맞혀도 partial이 된다는 규칙이 아니었다. 두 가지가 한 케이스에 뒤섞여 있었다.
   *
   * 원본 오라클(queries-corporate-law-p0.json)에서 a1에 해당하는 q6a는
   * `level: relation_argument`이고 수용 기준이 "법인과 사람을 서로 다른 역할에 배치하면
   * preserved"다 — **역할 배정 질의**이지 명칭 확인 질의가 아니다. 즉 이 질의의 보존은
   * 진짜 관계 증거다. 그런데 RegionPolicy에서는 argumentQueries에 들어가 있어 결정적
   * 계층에서는 명칭 확인 질의와 구분되지 않았다.
   *
   * 그래서 기대값만 뒤집지 않고 **표현을 바로잡는다**: 역할 배정 질의를 관계 층위로 분류한
   * 정책으로 사다리 단을 검사한다. `ASSET`처럼 논항 층위 핵심만 보존된 경우는 아래
   * 원칙 B 테스트에서 topic_only로 따로 확인한다.
   */
  it('핵심 관계 일부만 preserved → partial_relation_preservation (사다리 중간 단)', () => {
    // 역할 배정 질의(role)를 관계 층위로 둔 영역. 양측 분리(rel)는 미보존, 역할 배정만 보존.
    const ASSET_ROLE: RegionPolicy = {
      id: 'asset_role',
      label: '자산 운용 (역할 배정을 관계 층위로 분류)',
      scopeQueries: ['s'],
      relationQueries: ['rel', 'role'],
      argumentQueries: ['a2'],
      criticalForRelation: ['rel', 'role'],
      requiredForFullArgument: ['a2'],
    };
    const r = one(ASSET_ROLE, raw(P('s', 'explicit'), N('rel'), P('role', 'implicit'), N('a2')));
    expect(r.regionSemanticVerdict).toBe('partial_relation_preservation');
    expect(r.expressionProfile).toBe('implicit'); // 보존된 관계 질의가 병치이므로
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

/**
 * N2-b 회귀 — 대상 이름의 나열은 관계 충족 근거가 아니다.
 *
 * 실험(2026-07-29)에서 관찰된 문제: 명칭 확인 질의("첫 번째 공간은 무엇인가?")가
 * criticalForRelation으로 지정되면, 학생이 대상 이름만 나열해도 핵심 질의가 충족되어
 * 영역 판정이 관계보존 방향으로 올라간다. 이는 query-eval의 확립 원칙
 * ("화제어만으로 관계 질의를 통과시키면 안 된다")과 충돌한다.
 *
 * 아래는 **의미 축이 논항 커버리지에 오염되지 않는다**는 계약을 고정한다: 명칭 질의를
 * 보조 논항으로만 두면(핵심 지정 없음) 이름을 모두 맞혀 논항 커버리지가 full이어도
 * 관계 질의가 미보존인 한 topic_only를 넘지 못한다. 특정 지문 문구에 의존하지 않도록
 * 서로 다른 영역(광합성 분업 / 권력 분립)으로 같은 계약을 검사한다.
 */
describe('N2-b — 대상 이름 나열은 관계 질의를 충족시키지 못한다', () => {
  /** 관계 질의는 "어떻게 역할을 분담하는가"를 묻고, 명칭 질의는 보조 논항으로만 둔다. */
  const division = (id: string, label: string): RegionPolicy => ({
    id,
    label,
    scopeQueries: ['s'],
    relationQueries: ['rel'],
    argumentQueries: ['n1', 'n2'],
    criticalForRelation: ['rel'],
    requiredForFullArgument: ['n1', 'n2'],
  });

  const PHOTO = division('division', '두 공간의 분업');
  const BRANCHES = division('separation', '두 기관의 권력 분립');

  it('이름만 나열 → topic_only (부분관계 이상으로 올라가지 않는다)', () => {
    // "두 공간은 어떤 방식으로 역할을 분담하는가?" → "엽육 세포와 유관속초 세포."
    // 두 대상을 모두 맞게 지목해 논항은 full이지만, 연결·역할 분담이 없어 관계는 미보존.
    const r = one(PHOTO, raw(P('s', 'explicit'), N('rel'), P('n1', 'explicit'), P('n2', 'explicit')));
    expect(r.regionSemanticVerdict).toBe('topic_only');
    expect(r.regionSemanticVerdict).not.toBe('partial_relation_preservation');
    expect(r.regionSemanticVerdict).not.toBe('relation_preserved');
    // 논항 커버리지가 full이어도 의미 축은 올라가지 않는다 — 두 축은 독립이다.
    expect(r.argumentCoverage).toBe('full');
  });

  it('역할 분담을 진술 → relation_preserved', () => {
    // "엽육 세포가 이산화 탄소를 먼저 고정하고, 유관속초 세포에서 캘빈 회로가 진행된다."
    const r = one(PHOTO, raw(P('s', 'explicit'), P('rel', 'explicit'), P('n1', 'explicit'), P('n2', 'explicit')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.argumentCoverage).toBe('full');
  });

  it('일반화 — 이름만 나열 → topic_only (지문·분야 무관)', () => {
    // "두 기관은 업무를 어떻게 나누는가?" → "입법부와 행정부."
    const r = one(BRANCHES, raw(P('s', 'explicit'), N('rel'), P('n1', 'explicit'), P('n2', 'explicit')));
    expect(r.regionSemanticVerdict).toBe('topic_only');
    expect(r.regionSemanticVerdict).not.toBe('partial_relation_preservation');
  });

  it('일반화 — 역할 분담을 진술 → relation_preserved', () => {
    // "입법부는 법률을 만들고 행정부는 이를 집행한다."
    const r = one(BRANCHES, raw(P('s', 'explicit'), P('rel', 'explicit'), P('n1', 'explicit'), P('n2', 'explicit')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
  });

  it('이름 나열은 scope 승격도 일으키지 않는다 — 논항 보존만으로 화제가 확정되지 않는 경우', () => {
    // scope 질의조차 미보존이면, 명칭 논항이 보존돼도 규칙 1에 의해 scope가 승격되므로
    // topic_only가 된다. 이 경로가 관계 축으로 새지 않는지 확인한다.
    const r = one(PHOTO, raw(N('s'), N('rel'), P('n1', 'explicit'), P('n2', 'explicit')));
    expect(r.scope.source).toBe('promoted_argument');
    expect(r.regionSemanticVerdict).toBe('topic_only');
  });
});

/**
 * 원칙 B — 관계 증거가 없으면 부분관계로 승격하지 않는다 (실제 N2-b 경로).
 *
 * 2026-07-29 실험의 생성 run2가 명칭 확인 질의를 criticalForRelation으로 지정했다:
 *   q5  [argument] critical  "첫 번째 공간은 무엇인가?"        → 엽육 세포
 *   q10 [argument] critical  "두 번째 공간은 무엇인가?"        → 유관속초 세포
 *   q6  [relation] critical  "엽육 세포에서 4탄당은 어떻게 형성되는가?"
 *   q11 [relation] critical  "유관속초로 이동한 4탄당은 어떤 과정을 거치는가?"
 * 학생이 대상 이름만 나열하면 핵심 4개 중 2개가 충족돼 partial로 올라갔다. 두 대상을
 * 모두 알지만 그 사이의 역할 분담을 말하지 않았으므로 관계 증거는 0이다.
 */
describe('원칙 B — 관계 증거 0이면 논항이 full이어도 topic_only를 넘지 못한다', () => {
  /** 명칭 확인 논항 2개 + 각 공간의 과정을 묻는 관계 질의 2개, 전부 critical. */
  const TWO_SPACE: RegionPolicy = {
    id: 'division',
    label: '두 공간의 분업',
    scopeQueries: ['s'],
    relationQueries: ['relA', 'relB'],
    argumentQueries: ['nameA', 'nameB'],
    criticalForRelation: ['nameA', 'relA', 'nameB', 'relB'],
    requiredForFullArgument: ['nameA', 'nameB'],
  };

  it('A — 논항 전부 보존 + 관계 전부 미보존 → topic_only, argumentCoverage=full', () => {
    const r = one(
      TWO_SPACE,
      raw(P('s', 'explicit'), P('nameA', 'explicit'), P('nameB', 'explicit'), N('relA'), N('relB')),
    );
    expect(r.regionSemanticVerdict).toBe('topic_only');
    expect(r.regionSemanticVerdict).not.toBe('partial_relation_preservation');
    expect(r.regionSemanticVerdict).not.toBe('relation_preserved');
    // 원칙 A — 두 축은 독립이다. 대상을 모두 맞혔다는 사실은 여기에 남는다.
    expect(r.argumentCoverage).toBe('full');
  });

  it('B — 논항 일부만 보존 + 관계 전부 미보존 → topic_only, argumentCoverage=partial', () => {
    const r = one(
      TWO_SPACE,
      raw(P('s', 'explicit'), P('nameA', 'explicit'), N('nameB'), N('relA'), N('relB')),
    );
    expect(r.regionSemanticVerdict).toBe('topic_only');
    expect(r.argumentCoverage).toBe('partial');
  });

  it('C-1 — 역할을 실제로 배정하면 관계 증거가 생긴다 (한 축만) → partial_relation_preservation', () => {
    // "A는 X를 수행한다"까지만 말하고 B의 역할은 말하지 않은 경우.
    const r = one(
      TWO_SPACE,
      raw(P('s', 'explicit'), P('nameA', 'explicit'), P('nameB', 'explicit'), P('relA', 'explicit'), N('relB')),
    );
    expect(r.regionSemanticVerdict).toBe('partial_relation_preservation');
    expect(r.argumentCoverage).toBe('full');
  });

  it('C-2 — 두 대상에 각각 역할을 배정하면 → relation_preserved', () => {
    // "A는 X를 수행하고 B는 Y를 수행한다."
    const r = one(
      TWO_SPACE,
      raw(
        P('s', 'explicit'),
        P('nameA', 'explicit'),
        P('nameB', 'explicit'),
        P('relA', 'explicit'),
        P('relB', 'explicit'),
      ),
    );
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
  });

  it('D — 선형 인과: 중간 기제를 생략해도 시작·끝을 이었으면 관계 증거다 → relation_preserved', () => {
    // "금리를 올리면 사람들이 돈을 덜 써서 물가가 내린다" 유형. 이름 나열이 아니라
    // 인과를 진술한 것이므로 가드에 걸리면 안 된다.
    const CAUSAL: RegionPolicy = {
      id: 'causal',
      label: '조건 → 결과',
      scopeQueries: ['s'],
      relationQueries: ['chain'],
      argumentQueries: ['operand'],
      criticalForRelation: ['chain'],
      requiredForFullArgument: ['operand'],
    };
    const r = one(CAUSAL, raw(P('s', 'explicit'), P('chain', 'implicit'), N('operand')));
    expect(r.regionSemanticVerdict).toBe('relation_preserved');
    expect(r.argumentCoverage).toBe('none');
  });

  it('E — 관계 층위 핵심 질의가 없는 영역에는 가드가 적용되지 않는다 (기존 동작 보존)', () => {
    // 관계를 논항 핵심만으로 정의한 영역. 여기서는 논항 보존이 유일한 관계 증거이므로
    // 가드가 무조건 topic_only로 떨어뜨리면 안 된다.
    const ARG_ONLY: RegionPolicy = {
      id: 'arg_only',
      label: '논항 핵심만 있는 영역',
      scopeQueries: ['s'],
      relationQueries: [],
      argumentQueries: ['a1', 'a2'],
      criticalForRelation: ['a1', 'a2'],
      requiredForFullArgument: ['a1', 'a2'],
    };
    const partial = one(ARG_ONLY, raw(P('s', 'explicit'), P('a1', 'implicit'), N('a2')));
    expect(partial.regionSemanticVerdict).toBe('partial_relation_preservation');
    const full = one(ARG_ONLY, raw(P('s', 'explicit'), P('a1', 'implicit'), P('a2', 'implicit')));
    expect(full.regionSemanticVerdict).toBe('relation_preserved');
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
