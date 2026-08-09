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
  { id: 'qRel', regionId: 'asset', level: 'relation', question: '자산의 법적 주체와 실제 운용 주체는 어떤 관계인가?', propositionIds: ['p7', 'p9a'], expectedAnswer: '법인 소유 vs 사람 운용의 역할 분리', critical: true },
  { id: 'qArg', regionId: 'asset', level: 'argument', question: '어떤 사람이 실제로 자산을 운용할 수 있는가?', propositionIds: ['p9b'], expectedAnswer: '운용자는 권한자', critical: false },
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

  /**
   * 2026-08-09 코덱스 테스트에서 드러난 결함. 학생이 "CO2가 RuBP와 결합해 포도당을 만들고"라고만
   * 썼는데 `결합→3탄당 형성`이 `evidenced`로 표시됐다 — 3탄당은 쓰지도 않았다.
   *
   * 원인은 **판정의 해상도가 질의인데 명제 단위로 표시**하는 데 있다. 질의 하나가 명제 여럿을
   * 앵커링하므로, 그 질의가 explicit이라 해도 앵커링된 명제를 각각 직접 썼다는 뜻이 아니다.
   */
  it('★ 광역 질의(여러 명제 앵커)의 explicit은 명제를 evidenced로 올리지 못한다', () => {
    const verdicts = new Map([['qRel', V('preserved', 'explicit')]]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    // qRel은 p7·p9a를 함께 앵커링한다 — 어느 쪽을 직접 썼는지 알 수 없다.
    expect(byId.get('p7')).toBe('supported_by_abstraction');
    expect(byId.get('p9a')).toBe('supported_by_abstraction');
  });

  it('★ 전용 질의(이 명제만 앵커)가 광역 질의를 이긴다 — 없다고 말하는 쪽도', () => {
    // p7만 묻는 전용 질의가 "안 썼다"고 하는데, p7·p9a를 묶어 묻는 광역 질의가 explicit이다.
    const withSpecific: AssessQuery[] = [
      ...queries,
      { id: 'qP7', regionId: 'asset', level: 'argument', question: 'p7만 묻는 질의', propositionIds: ['p7'], expectedAnswer: 'p7', critical: false },
    ];
    const verdicts = new Map([['qRel', V('preserved', 'explicit')], ['qP7', V('not_evidenced', 'none', '')]]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], withSpecific, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p7')).toBe('not_evidenced'); // 전용 질의가 정본
    expect(byId.get('p9a')).toBe('supported_by_abstraction'); // 전용 질의 없음 → 광역 상한
  });

  it('전용 질의가 explicit이면 evidenced 그대로 — 정밀도를 잃지 않는다', () => {
    const verdicts = new Map([['qArg', V('preserved', 'explicit')]]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p9b')).toBe('evidenced'); // qArg는 p9b 하나만 앵커링
  });

  it('모순이 다른 상태보다 우선', () => {
    const verdicts = new Map([['qRel', V('contradicted', 'none')], ['qArg', V('preserved', 'explicit')]]);
    const [a] = assess([region('asset', 'contradicted')], [meta], queries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p7')).toBe('contradicted');
    expect(byId.get('p9b')).toBe('evidenced');
  });
});

/**
 * 화제만 짚은 응답이 명제를 뒷받침한 것으로 표시되면 안 된다.
 *
 * 실측(2026-08-05, 니체 문단): 학생이 "니체가 본 삶과 가치의 관계"라는 **화제 이름표만**
 * 썼는데 scope 질의가 preserved되어 그 질의에 앵커된 명제 3개가 ◐(병치·함축으로 뒷받침)로
 * 칠해졌다. 영역 판정은 `주제만`으로 정확했으나 **오버레이가 채점축과 다른 말을 했다** —
 * 학생이 실제로 보는 화면이 오버레이다.
 *
 * 판별은 질의의 층위 라벨이 아니라 `evidenceRole`로 한다(N2-e와 같은 이유: 생성기가 붙인
 * 라벨은 틀릴 수 있고, 학생이 무엇을 했는지가 기준이다). scope 질의에 답하면서 관계를
 * 진술했다면 그 증거는 `relation`이므로 명제를 뒷받침한다.
 */
describe('scope 역할 증거는 명제를 뒷받침하지 않는다', () => {
  const scopeMeta: AssessRegionMeta = { id: 'r1', label: '영역1', propositionIds: ['p1', 'p2'] };
  const scopeQueries: AssessQuery[] = [
    { id: 'qScope', regionId: 'r1', level: 'scope', propositionIds: ['p1'], expectedAnswer: '이 영역의 화제', critical: false },
    { id: 'qRel', regionId: 'r1', level: 'relation', propositionIds: ['p2'], expectedAnswer: '핵심 관계', critical: true },
  ];
  const R = (
    semanticState: QueryVerdict['semanticState'],
    expressionMode: QueryVerdict['expressionMode'],
    evidenceRole: QueryVerdict['evidenceRole'],
  ): QueryVerdict => ({ semanticState, expressionMode, evidence: '', viaItem: '항목1', evidenceRole });

  it('화제 이름표만 쓴 응답 → 앵커된 명제는 not_evidenced (◐로 칠하지 않는다)', () => {
    const verdicts = new Map([
      ['qScope', R('preserved', 'implicit', 'scope')],
      ['qRel', R('not_evidenced', 'none', 'none')],
    ]);
    const [a] = assess([region('r1', 'topic_only')], [scopeMeta], scopeQueries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p1')).toBe('not_evidenced');
    expect(byId.get('p2')).toBe('not_evidenced');
  });

  it('scope 질의라도 답이 관계를 진술하면 명제를 뒷받침한다', () => {
    const verdicts = new Map([
      ['qScope', R('preserved', 'explicit', 'relation')],
      ['qRel', R('not_evidenced', 'none', 'none')],
    ]);
    const [a] = assess([region('r1', 'topic_only')], [scopeMeta], scopeQueries, verdicts);
    const byId = new Map(a!.propositionEvidence.map((e) => [e.propositionId, e.state]));
    expect(byId.get('p1')).toBe('evidenced');
  });

  it('scope 역할이어도 모순은 그대로 표시한다', () => {
    const verdicts = new Map([['qScope', R('contradicted', 'none', 'none')]]);
    const [a] = assess([region('r1', 'contradicted')], [scopeMeta], scopeQueries, verdicts);
    expect(a!.propositionEvidence.find((e) => e.propositionId === 'p1')?.state).toBe('contradicted');
  });

  it('evidenceRole이 없는 판정은 기존대로 뒷받침으로 본다 (하위 호환)', () => {
    const verdicts = new Map([['qScope', V('preserved', 'implicit')]]);
    const [a] = assess([region('r1', 'topic_only')], [scopeMeta], scopeQueries, verdicts);
    expect(a!.propositionEvidence.find((e) => e.propositionId === 'p1')?.state).toBe('supported_by_abstraction');
  });
});

/**
 * 힌트 문구 4종 — 미달 영역은 골드를 노출하지 않는다 (§4.1.3 · §7).
 *
 * 이전 `topic_only` 문구는 `critical.expectedAnswer`를 그대로 끼워 넣어 정답을 공개했다:
 *   "화제는 짚었지만, 핵심 관계 「법인은 자산의 법적 권리·소유 주체이고 …」가 아직…"
 * 학생이 답을 이미 봤으므로 수정할 이유가 사라진다.
 *
 * 안전한 필드는 질의 `question`(질문 형태라 답을 주지 않는다)과 위치뿐이다.
 * 영역 `label`·`expectedAnswer`·명제 `shortForm`은 미달 영역에서 전부 금지.
 */
describe('힌트 문구 — 미달 영역 골드 노출 0', () => {
  const ANSWER = '법인 소유 vs 사람 운용의 역할 분리';
  const QUESTION = '실제 자산 운용은 법인 자체와 사람 중 누가 수행하는가?';
  // 자연스러운 label("자산 운용")을 쓰면 질의 question 안에 같은 어구가 들어 있어 오탐이 난다.
  // 코드가 meta.label을 **필드로 끼워 넣는지**만 보려면 자연 발생하지 않는 표지가 필요하다.
  const LABEL = '§LABEL§';
  const hintMeta: AssessRegionMeta = { id: 'r', label: LABEL, propositionIds: ['p1'] };
  const hintQueries: AssessQuery[] = [
    { id: 'qs', regionId: 'r', level: 'scope', question: '이 영역은 무엇에 관한 내용인가?', propositionIds: ['p1'], expectedAnswer: '자산 운용에 관한 내용', critical: false },
    { id: 'qr', regionId: 'r', level: 'relation', question: QUESTION, propositionIds: ['p1'], expectedAnswer: ANSWER, critical: true },
  ];
  const fb = (v: RegionSemanticVerdict, m: Map<string, QueryVerdict>) =>
    assess([region('r', v)], [hintMeta], hintQueries, m)[0]!.feedback;
  const none = new Map<string, QueryVerdict>([['qr', V('not_evidenced', 'none', '')]]);

  it('부분관계 — 미포착과 다른 전용 문구를 받는다', () => {
    const f = fb('partial_relation_preservation', none);
    expect(f).not.toBe(fb('region_not_evidenced', none));
    expect(f).toContain(QUESTION);
  });

  it('주제만 — question은 주되 정답은 주지 않는다', () => {
    const f = fb('topic_only', none);
    expect(f).toContain(QUESTION);
    expect(f).not.toContain(ANSWER);
  });

  it('미포착 — 전용 문구, 골드 노출 없음', () => {
    const f = fb('region_not_evidenced', none);
    expect(f).not.toContain(ANSWER);
    expect(f).not.toContain(LABEL);
  });

  it('모순 — 되물음은 주되 정답·명제는 주지 않는다', () => {
    const f = fb('contradicted', new Map([['qr', V('contradicted', 'none', '')]]));
    expect(f).toContain(QUESTION);
    expect(f).not.toContain(ANSWER);
  });

  it('미달 4종 전부 expectedAnswer·label을 노출하지 않는다', () => {
    for (const v of ['partial_relation_preservation', 'topic_only', 'region_not_evidenced', 'contradicted'] as RegionSemanticVerdict[]) {
      const f = fb(v, none);
      expect(f, `${v}에 정답이 노출됨`).not.toContain(ANSWER);
      expect(f, `${v}에 영역 label이 노출됨`).not.toContain(LABEL);
    }
  });

  it('관계보존은 정답을 공개한다 (§4.1.3 — 성공 영역은 허용)', () => {
    const f = fb('relation_preserved', new Map([['qr', V('preserved', 'explicit')]]));
    expect(f).toContain(ANSWER);
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
  /**
   * 관계보존이어도 **학생이 쓰지 않은 것을 썼다고 말하지 않는다.** 기대 답을 그대로 인용하고
   * "잘 포착했습니다"라고만 하면, 인용문에 든 중간 산물까지 표현한 것처럼 읽힌다.
   */
  it('★ relation_preserved: 나타나지 않은 핵심 중간 단계를 포착했다고 하지 않는다', () => {
    const withSpecific: AssessQuery[] = [
      ...queries,
      { id: 'qP7', regionId: 'asset', level: 'argument', question: 'p7만 묻는 질의', propositionIds: ['p7'], expectedAnswer: 'p7', critical: false },
    ];
    const verdicts = new Map([['qRel', V('preserved', 'explicit')], ['qP7', V('not_evidenced', 'none', '')]]);
    const shortForms = new Map([['p7', '자산의 법인 귀속']]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], withSpecific, verdicts, shortForms);
    expect(a!.feedback).toContain('구조를 보존');
    expect(a!.feedback).toContain('자산의 법인 귀속'); // 빠진 중간 단계를 밝힌다
    expect(a!.feedback).toContain('직접 쓰지 않았지만');
    expect(a!.feedback).not.toContain('잘 포착'); // 포착했다고 단정하지 않는다
  });

  it('★ 압축 보존(◐)은 "안 썼다"고 단정하지 않는다 — 반대 방향 과장 금지', () => {
    // qRel만 있고 전용 질의가 없다 → p7·p9a는 supported_by_abstraction.
    // 직접 썼는지 "알 수 없다"이지 "안 썼다"가 아니므로 문구에 넣지 않는다.
    const verdicts = new Map([['qRel', V('preserved', 'explicit')]]);
    const shortForms = new Map([['p7', '자산의 법인 귀속']]);
    const [a] = assess([region('asset', 'relation_preserved')], [meta], queries, verdicts, shortForms);
    expect(a!.feedback).not.toContain('직접 쓰지 않았지만');
    expect(a!.feedback).toContain('잘 포착');
  });

  // 문구 자체가 아니라 **의도**를 검사한다 — 화제 포착을 인정하고 관계 쪽으로 유도하는가.
  // (2026-08-07 문구 개정: 정답 노출을 없애고 질의 question으로 되묻는 형태로 바뀌었다.)
  it('topic_only: 화제 포착을 인정하고 관계로 유도한다', () => {
    const [a] = assess([region('asset', 'topic_only')], [meta], queries, new Map());
    expect(a!.feedback).toContain('화제');
    expect(a!.feedback).toContain('어떤 관계인가'); // 핵심 관계 질의로 되물음
    expect(a!.feedback).not.toContain('법인 소유 vs 사람 운용'); // 정답 미노출
  });
  it('contradicted: 어긋남을 지목하고 재확인을 요구한다', () => {
    const verdicts = new Map([['qRel', V('contradicted', 'none')]]);
    const [a] = assess([region('asset', 'contradicted')], [meta], queries, verdicts);
    expect(a!.feedback).toContain('어긋');
    expect(a!.feedback).toContain('다시 확인');
    expect(a!.feedback).not.toContain('법인 소유 vs 사람 운용'); // 정답 미노출
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
