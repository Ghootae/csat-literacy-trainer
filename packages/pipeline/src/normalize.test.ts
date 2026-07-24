/**
 * 정규화는 결정적이어야 한다 — 같은 입력이면 같은 구조가 나와야 한다.
 * 실제 D0 출력(「법인」 문단)을 픽스처로 삼아 규칙을 고정한다.
 */

import { describe, expect, it } from 'vitest';

import {
  type DraftLink,
  type DraftNode,
  mergeEquivalentLinks,
  normalizeHierarchy,
  partitionLinks,
  removePassThroughNodes,
  selectSlots,
  slotOwners,
  traceabilityPropositions,
  validateCompleteness,
} from './normalize.js';

function prop(id: string, aspect?: string, standalone = true): DraftNode {
  return {
    id,
    kind: 'proposition',
    text: `${id} 본문`,
    shortForm: id,
    childIds: [],
    standaloneSlotValue: standalone,
    ...(aspect === undefined ? {} : { aspect }),
  };
}

function comp(
  id: string,
  childIds: string[],
  opts: { introduces?: boolean; subsumed?: boolean; kind?: 'composite' | 'title' } = {},
): DraftNode {
  return {
    id,
    kind: opts.kind ?? 'composite',
    text: `${id} 본문`,
    shortForm: id,
    childIds,
    introducesRelation: opts.introduces ?? true,
    subsumedByParent: opts.subsumed ?? false,
  };
}

/** 실행 2에서 나온 실제 구조. c2가 얇은 통과 노드다. */
function corporateLaw(): DraftNode[] {
  return [
    comp('c0', ['c1', 'c5', 'c6', 'p11'], { kind: 'title' }),
    comp('c1', ['p1', 'c2'], { introduces: false }),
    comp('c2', ['c3', 'c4'], { introduces: false, subsumed: true }),
    comp('c3', ['p2', 'p3']),
    comp('c4', ['p4', 'p5']),
    comp('c5', ['p6', 'p7']),
    comp('c6', ['p8', 'p9', 'p10']),
    prop('p1'),
    prop('p2'),
    prop('p3'),
    prop('p4'),
    prop('p5'),
    prop('p6', 'legal_attribution'),
    prop('p7', 'legal_attribution'),
    prop('p8', 'legal_attribution'),
    prop('p9', 'actual_execution'),
    prop('p10', 'sanction'),
    prop('p11', 'purpose'),
  ];
}

const SLOTS = ['c1', 'c5', 'c6', 'p11'];

describe('removePassThroughNodes', () => {
  it('의미 증가분 없는 통과 노드를 흡수한다', () => {
    const log: string[] = [];
    const out = removePassThroughNodes(corporateLaw(), [], SLOTS, log);

    expect(out.map((n) => n.id)).not.toContain('c2');
    expect(out.find((n) => n.id === 'c1')!.childIds).toEqual(['p1', 'c3', 'c4']);
    expect(log[0]).toContain('통과 노드 제거: c2');
  });

  it('새 관계를 도입하면 남긴다', () => {
    const nodes = corporateLaw().map((n) =>
      n.id === 'c2' ? { ...n, introducesRelation: true } : n,
    );
    expect(removePassThroughNodes(nodes, [], SLOTS, []).map((n) => n.id)).toContain('c2');
  });

  it('부모가 일반화 의미를 포함하지 않으면 남긴다', () => {
    const nodes = corporateLaw().map((n) =>
      n.id === 'c2' ? { ...n, subsumedByParent: false } : n,
    );
    expect(removePassThroughNodes(nodes, [], SLOTS, []).map((n) => n.id)).toContain('c2');
  });

  it('슬롯인 노드는 흡수하지 않는다', () => {
    const out = removePassThroughNodes(corporateLaw(), [], [...SLOTS, 'c2'], []);
    expect(out.map((n) => n.id)).toContain('c2');
  });

  it('secondary link의 endpoint면 흡수하지 않는다', () => {
    const links: DraftLink[] = [{ fromId: 'c2', toId: 'c6', type: 'aspect_shift' }];
    expect(removePassThroughNodes(corporateLaw(), links, SLOTS, []).map((n) => n.id)).toContain('c2');
  });

  it('승격 후 부모의 자식이 5개를 넘으면 흡수하지 않는다', () => {
    // c1 ← [p1, x1, x2, c2], c2 ← [c3, c4] 이면 승격 시 5개 — 경계에서 허용
    const nodes = [
      comp('c0', ['c1'], { kind: 'title' }),
      comp('c1', ['p1', 'x1', 'x2', 'c2'], { introduces: false }),
      comp('c2', ['c3', 'c4'], { introduces: false, subsumed: true }),
      comp('c3', ['p2', 'p3']),
      comp('c4', ['p4', 'p5']),
      prop('p1'),
      prop('x1'),
      prop('x2'),
      prop('p2'),
      prop('p3'),
      prop('p4'),
      prop('p5'),
    ];
    expect(removePassThroughNodes(nodes, [], [], []).map((n) => n.id)).not.toContain('c2');

    // 자식을 하나 더 붙이면 승격 시 6개가 되어 초과 — 흡수하지 않는다
    const wider = nodes.map((n) => (n.id === 'c2' ? { ...n, childIds: ['c3', 'c4', 'p1'] } : n));
    expect(removePassThroughNodes(wider, [], [], []).map((n) => n.id)).toContain('c2');
  });
});

describe('mergeEquivalentLinks', () => {
  it('역방향 동치 링크를 하나로 병합하고 role_separation을 속성으로 내린다', () => {
    const links: DraftLink[] = [
      { fromId: 'p6', toId: 'p9', type: 'role_separation', witness: '학생 문장 X', evaluationEffect: '모순 오판 방지' },
      { fromId: 'p9', toId: 'p6', type: 'realization_method' },
    ];
    const log: string[] = [];
    const merged = mergeEquivalentLinks(corporateLaw(), links, log);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      source: 'p6',
      target: 'p9',
      relation: 'realized_by',
      contrastAxis: 'legal_attribution_vs_actual_execution',
      witness: '학생 문장 X',
    });
    expect(merged[0]!.relationProperties.sort()).toEqual(['realization_method', 'role_separation']);
    expect(log[0]).toContain('링크 병합');
  });

  it('실행 층위 노드가 target이 되도록 방향을 정한다', () => {
    const links: DraftLink[] = [
      { fromId: 'p9', toId: 'p6', type: 'realization_method' },
      { fromId: 'p6', toId: 'p9', type: 'role_separation' },
    ];
    const merged = mergeEquivalentLinks(corporateLaw(), links, []);
    expect(merged[0]!.source).toBe('p6');
    expect(merged[0]!.target).toBe('p9');
  });

  it('단일 링크는 그대로 둔다', () => {
    const links: DraftLink[] = [{ fromId: 'p10', toId: 'p11', type: 'aspect_shift' }];
    const merged = mergeEquivalentLinks(corporateLaw(), links, []);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.relation).toBe('aspect_shift');
    expect(merged[0]!.relationProperties).toEqual([]);
  });
});

describe('partitionLinks', () => {
  const nodes = corporateLaw();

  it('witness가 없으면 discourse로 보낸다', () => {
    const log: string[] = [];
    const { evaluation, discourse } = partitionLinks(
      mergeEquivalentLinks(nodes, [{ fromId: 'p10', toId: 'p11', type: 'aspect_shift' }], []),
      nodes,
      SLOTS,
      log,
    );
    expect(evaluation).toHaveLength(0);
    expect(discourse).toHaveLength(1);
    expect(log[0]).toContain('witness 없음');
  });

  it('양 끝이 서로 다른 슬롯에 덮인 비-모순방지 링크는 discourse로 보낸다', () => {
    // p10은 c6 슬롯, p11은 자기 자신이 슬롯 — 누락은 각 슬롯에서 이미 잡힌다
    const log: string[] = [];
    const links: DraftLink[] = [
      { fromId: 'p10', toId: 'p11', type: 'aspect_shift', witness: '학생 문장 Y', evaluationEffect: '목적 누락' },
    ];
    const { evaluation, discourse } = partitionLinks(
      mergeEquivalentLinks(nodes, links, []),
      nodes,
      SLOTS,
      log,
    );
    expect(evaluation).toHaveLength(0);
    expect(discourse).toHaveLength(1);
    expect(log[0]).toContain('각각 덮여 있고');
  });

  it('모순 오판을 막는 링크는 슬롯이 갈려도 평가용으로 남긴다', () => {
    // p6은 c5 슬롯, p9는 c6 슬롯 — 갈렸지만 역할 분리라 남아야 한다
    const links: DraftLink[] = [
      { fromId: 'p6', toId: 'p9', type: 'role_separation', witness: '학생 문장 Z', evaluationEffect: '모순 오판 방지' },
    ];
    const { evaluation, discourse } = partitionLinks(
      mergeEquivalentLinks(nodes, links, []),
      nodes,
      SLOTS,
      [],
    );
    expect(evaluation).toHaveLength(1);
    expect(discourse).toHaveLength(0);
  });
});

describe('slotOwners / traceabilityPropositions', () => {
  it('각 노드를 덮는 슬롯을 찾는다', () => {
    const owner = slotOwners(corporateLaw(), SLOTS);
    expect(owner.get('p2')).toBe('c1');
    expect(owner.get('p6')).toBe('c5');
    expect(owner.get('p10')).toBe('c6');
    expect(owner.get('p11')).toBe('p11');
    expect(owner.get('c0')).toBeUndefined(); // 루트는 어느 슬롯에도 덮이지 않는다
  });

  it('슬롯이 덮는 명제를 정렬해 반환한다', () => {
    const nodes = corporateLaw();
    expect(traceabilityPropositions(nodes, 'c1')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(traceabilityPropositions(nodes, 'c6')).toEqual(['p8', 'p9', 'p10']);
    expect(traceabilityPropositions(nodes, 'p11')).toEqual(['p11']);
  });
});

describe('normalizeHierarchy', () => {
  it('통과 노드 제거 · 링크 병합 · discourse 분리를 한 번에 수행한다', () => {
    const links: DraftLink[] = [
      { fromId: 'p6', toId: 'p9', type: 'role_separation', witness: '학생 문장', evaluationEffect: '모순 오판 방지' },
      { fromId: 'p9', toId: 'p6', type: 'realization_method' },
      { fromId: 'p10', toId: 'p11', type: 'aspect_shift', witness: '', evaluationEffect: '' },
    ];
    const result = normalizeHierarchy(corporateLaw(), links, SLOTS);

    expect(result.nodes.map((n) => n.id)).not.toContain('c2');
    expect(result.evaluationLinks).toHaveLength(1);
    expect(result.evaluationLinks[0]!.relation).toBe('realized_by');
    expect(result.discourseLinks).toHaveLength(1);
    expect(result.log.length).toBeGreaterThanOrEqual(3);
  });
});


describe('selectSlots', () => {
  /** 「데이터 결측치」 구조: 루트 c1 ← [p1(도입 정의), c2, c5] */
  function missingValues(standaloneP1: boolean): DraftNode[] {
    return [
      comp('c1', ['p1', 'c2', 'c5'], { kind: 'title' }),
      comp('c2', ['p2', 'p3']),
      comp('c5', ['p9', 'p10']),
      prop('p1', 'definition', standaloneP1),
      prop('p2'),
      prop('p3'),
      prop('p9'),
      prop('p10'),
    ];
  }

  it('루트의 자식이 3개 이상이면 그대로 슬롯이 된다', () => {
    const { slots, absorbed } = selectSlots(missingValues(true), 'c1');
    expect(slots).toEqual(['p1', 'c2', 'c5']);
    expect(absorbed.size).toBe(0);
  });

  it('독립 가치 없는 도입·정의 단독 노드를 인접 슬롯에 흡수한다', () => {
    const log: string[] = [];
    const { slots, absorbed } = selectSlots(missingValues(false), 'c1', log);
    // [p1, c2, c5] → p1 흡수 → [c2, c5] = 2개로 하한 미달 → 흡수 전 프론티어를 더 전개
    // → [p1, p2, p3, c5] → p1 흡수 → [p2, p3, c5] = 3개
    expect(slots).toEqual(['p2', 'p3', 'c5']);
    expect(absorbed.get('p1')).toBe('p2'); // 흡수 매핑이 유지된다
    expect(log.some((l) => l.includes('재전개'))).toBe(true);
  });

  it('마지막 노드가 흡수 대상이면 이전 슬롯으로 보낸다', () => {
    // 재전개가 일어나지 않도록 슬롯을 넉넉히 둔다
    const nodes = [
      comp('c1', ['c2', 'c5', 'c6', 'p1'], { kind: 'title' }),
      comp('c2', ['p2', 'p3']),
      comp('c5', ['p9', 'p10']),
      comp('c6', ['p11', 'p12']),
      prop('p1', 'definition', false),
      prop('p2'),
      prop('p3'),
      prop('p9'),
      prop('p10'),
      prop('p11'),
      prop('p12'),
    ];
    const { slots, absorbed } = selectSlots(nodes, 'c1');
    expect(slots).toEqual(['c2', 'c5', 'c6']);
    expect(absorbed.get('p1')).toBe('c6');
  });

  it('명제 개수 불균형만으로는 흡수하지 않는다', () => {
    // p11은 명제 1개짜리 슬롯이지만 독립 가치가 있으면 유지된다 (「법인」의 목적 명제)
    const { slots } = selectSlots(corporateLaw(), 'c0');
    expect(slots).toContain('p11');
  });

  it('루트 자식이 3개 미만이면 전개한다', () => {
    const nodes = [
      comp('c0', ['c1', 'c2'], { kind: 'title' }),
      comp('c1', ['p1', 'p2']),
      comp('c2', ['p3', 'p4']),
      prop('p1'),
      prop('p2'),
      prop('p3'),
      prop('p4'),
    ];
    expect(selectSlots(nodes, 'c0').slots).toEqual(['p1', 'p2', 'c2']);
  });
});

describe('traceabilityPropositions with absorption', () => {
  it('흡수된 노드를 호스트 슬롯의 추적 대상에 포함한다', () => {
    // 루트 자식이 4개라 흡수 후에도 3개가 남아 재전개가 일어나지 않는다
    const nodes = [
      comp('c1', ['p1', 'c2', 'c5', 'c6'], { kind: 'title' }),
      comp('c2', ['p2', 'p3']),
      comp('c5', ['p9', 'p10']),
      comp('c6', ['p11', 'p12']),
      prop('p1', 'definition', false),
      prop('p2'),
      prop('p3'),
      prop('p9'),
      prop('p10'),
      prop('p11'),
      prop('p12'),
    ];
    const { slots, absorbed } = selectSlots(nodes, 'c1');
    expect(slots).toEqual(['c2', 'c5', 'c6']);
    expect(absorbed.get('p1')).toBe('c2');
    expect(traceabilityPropositions(nodes, 'c2', absorbed)).toEqual(['p1', 'p2', 'p3']);
    // 흡수되지 않은 슬롯은 영향받지 않는다
    expect(traceabilityPropositions(nodes, 'c5', absorbed)).toEqual(['p9', 'p10']);
  });

  it('전개가 흡수보다 먼저 일어난다 — 루트 자식이 3개 미만이면 흡수 대상이 사라질 수 있다', () => {
    // c1 ← [p1, c2]에서 c2가 전개되면 p1은 형제가 늘어 흡수 조건(인접 슬롯)이 바뀐다.
    // 이 순서를 명시적으로 고정해 둔다.
    const nodes = [
      comp('c1', ['p1', 'c2'], { kind: 'title' }),
      comp('c2', ['p2', 'p3']),
      prop('p1', 'definition', false),
      prop('p2'),
      prop('p3'),
    ];
    const { slots, absorbed } = selectSlots(nodes, 'c1');
    expect(slots).toEqual(['p2', 'p3']);
    expect(absorbed.get('p1')).toBe('p2');
  });
});


describe('validateCompleteness', () => {
  const sentences = [{ id: 'S1' }, { id: 'S2' }, { id: 'S3' }];

  it('모든 문장이 덮이면 통과한다', () => {
    const props = [
      { id: 'p1', sourceSentences: ['S1'] },
      { id: 'p2', sourceSentences: ['S2', 'S3'] },
    ];
    expect(validateCompleteness(sentences, props)).toEqual([]);
  });

  it('덮이지 않은 문장을 잡는다 — 「법인」에서 실제로 6문장이 사라졌던 사례', () => {
    const props = [{ id: 'p1', sourceSentences: ['S1'] }];
    const issues = validateCompleteness(sentences, props);
    expect(issues.map((i) => i.code)).toEqual(['uncovered-sentence', 'uncovered-sentence']);
    expect(issues[0]!.message).toContain('S2');
    expect(issues[1]!.message).toContain('S3');
  });

  it('존재하지 않는 문장 참조를 잡는다', () => {
    const props = [
      { id: 'p1', sourceSentences: ['S1'] },
      { id: 'p2', sourceSentences: ['S2'] },
      { id: 'p3', sourceSentences: ['S3', 'S9'] },
    ];
    const issues = validateCompleteness(sentences, props);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.code).toBe('unknown-sentence-ref');
    expect(issues[0]!.message).toContain('S9');
  });

  it('명제가 없으면 즉시 실패한다', () => {
    expect(validateCompleteness(sentences, [])[0]!.code).toBe('no-propositions');
  });
});


describe('selectSlots — 흡수 후 재전개', () => {
  /** 「법인」에서 실제로 나온 구조: c0 ← [c1, c7], c1 ← [p1(도입), c2] */
  const nodes: DraftNode[] = [
    comp('c0', ['c1', 'c7'], { kind: 'title' }),
    comp('c1', ['p1', 'c2']),
    comp('c2', ['p2', 'p3', 'p4', 'p5']),
    comp('c7', ['c5', 'c6', 'p10']),
    comp('c5', ['p6', 'p7']),
    comp('c6', ['p8', 'p9']),
    prop('p1', 'definition', false),
    prop('p2'),
    prop('p3'),
    prop('p4'),
    prop('p5'),
    prop('p6'),
    prop('p7'),
    prop('p8'),
    prop('p9'),
    prop('p10'),
  ];

  it('흡수가 슬롯을 하한 아래로 떨어뜨리면 다시 전개한다', () => {
    const log: string[] = [];
    const { slots, absorbed } = selectSlots(nodes, 'c0', log);

    // [c1, c7] → 가장 무거운 c7 전개 → [c1, c5, c6, p10] → 흡수 대상 없음
    expect(slots).toEqual(['c1', 'c5', 'c6', 'p10']);
    expect(absorbed.size).toBe(0);
    // p1은 c1 아래에 그대로 있으므로 유실되지 않는다
    expect(traceabilityPropositions(nodes, 'c1')).toContain('p1');
  });

  it('재전개해도 조상·자손이 함께 슬롯이 되지 않는다 (안티체인 유지)', () => {
    const { slots } = selectSlots(nodes, 'c0');
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const descendants = (id: string): string[] => {
      const kids = byId.get(id)?.childIds ?? [];
      return [...kids, ...kids.flatMap(descendants)];
    };
    for (const s of slots) {
      for (const d of descendants(s)) {
        expect(slots, `${s}의 자손 ${d}가 함께 슬롯이 됨`).not.toContain(d);
      }
    }
  });

  it('더 전개할 것이 없으면 하한 미만이어도 멈춘다', () => {
    const flat: DraftNode[] = [
      comp('c0', ['p1', 'p2'], { kind: 'title' }),
      prop('p1', 'definition', false),
      prop('p2'),
    ];
    expect(selectSlots(flat, 'c0').slots).toEqual(['p2']);
  });
});
