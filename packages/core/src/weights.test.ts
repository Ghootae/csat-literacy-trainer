import { describe, expect, it } from 'vitest';

import type { GoldNode } from './domain/gold.js';
import { PrimaryPathError, allGlobalWeights, globalWeight, primaryPath } from './weights.js';

function node(
  id: string,
  primaryParentId: string | null,
  secondaryParentIds: readonly string[] = [],
): GoldNode {
  return {
    id,
    paragraphId: 'para-1',
    kind: primaryParentId === null ? 'title' : 'proposition',
    text: `text of ${id}`,
    shortForm: `short ${id}`,
    primaryParentId,
    secondaryParentIds,
  };
}

/**
 *        root
 *        /  \
 *      c1    c2
 *     /  \     \
 *    p1  p2    p3
 *
 * p2는 c2를 secondary 부모로도 갖는다 — DAG지만 primary 간선만 보면 트리다.
 */
const nodes: readonly GoldNode[] = [
  node('root', null),
  node('c1', 'root'),
  node('c2', 'root'),
  node('p1', 'c1'),
  node('p2', 'c1', ['c2']),
  node('p3', 'c2'),
];

const localWeights = new Map([
  ['c1', 0.5],
  ['c2', 0.4],
  ['p1', 0.6],
  ['p2', 0.3],
  ['p3', 0.8],
]);

describe('primaryPath', () => {
  it('노드에서 루트까지 primary 간선만 따라간다', () => {
    expect(primaryPath(nodes, 'p1').map((n) => n.id)).toEqual(['p1', 'c1', 'root']);
  });

  it('secondary 부모는 경로에 끼어들지 않는다', () => {
    // p2는 c2도 부모로 갖지만 primary는 c1뿐이다.
    expect(primaryPath(nodes, 'p2').map((n) => n.id)).toEqual(['p2', 'c1', 'root']);
  });

  it('루트 자신의 경로는 자기 하나다', () => {
    expect(primaryPath(nodes, 'root').map((n) => n.id)).toEqual(['root']);
  });

  it('primary 간선에 사이클이 있으면 거부한다', () => {
    const cyclic = [node('a', 'b'), node('b', 'a')];
    expect(() => primaryPath(cyclic, 'a')).toThrow(PrimaryPathError);
  });

  it('primary 부모가 존재하지 않으면 거부한다', () => {
    expect(() => primaryPath([node('a', 'ghost')], 'a')).toThrow(PrimaryPathError);
  });
});

describe('globalWeight', () => {
  it('경로상의 국소 가중치를 모두 곱한다', () => {
    // W(p1) = w(p1) * w(c1) = 0.6 * 0.5
    expect(globalWeight(nodes, 'p1', localWeights)).toBeCloseTo(0.3);
  });

  it('루트의 국소 가중치는 1로 취급해 곱에 영향을 주지 않는다', () => {
    expect(globalWeight(nodes, 'root', localWeights)).toBe(1);
    // W(c1) = w(c1) * 1
    expect(globalWeight(nodes, 'c1', localWeights)).toBeCloseTo(0.5);
  });

  it('같은 국소 가중치라도 부모가 다르면 W가 달라진다', () => {
    // rev2의 결함: 슬롯까지만 할인하면 사소한 슬롯의 잎과 핵심 슬롯의 잎이 같은 스케일이 된다.
    // 루트까지 곱하면 상위 가지의 중요도가 반영된다.
    const underHeavy = globalWeight(nodes, 'p2', localWeights); // 0.3 * 0.5 = 0.15
    const underLight = globalWeight(nodes, 'p3', localWeights); // 0.8 * 0.4 = 0.32
    expect(underHeavy).toBeCloseTo(0.15);
    expect(underLight).toBeCloseTo(0.32);
    // p3는 국소 가중치가 더 크고 상위 가지도 살아 있어 전역에서도 앞선다.
    expect(underLight).toBeGreaterThan(underHeavy);
  });

  it('국소 가중치가 없으면 조용히 넘어가지 않고 거부한다', () => {
    expect(() => globalWeight(nodes, 'p1', new Map([['p1', 0.6]]))).toThrow(PrimaryPathError);
  });
});

describe('allGlobalWeights', () => {
  it('모든 노드에 대해 W를 산출한다', () => {
    const all = allGlobalWeights(nodes, localWeights);
    expect([...all.keys()].sort()).toEqual(['c1', 'c2', 'p1', 'p2', 'p3', 'root']);
    expect(all.get('p3')).toBeCloseTo(0.32);
  });

  it('W는 부모의 W를 넘지 않는다 (w <= 1이므로 깊이에 대해 단조 감소)', () => {
    const all = allGlobalWeights(nodes, localWeights);
    for (const n of nodes) {
      if (n.primaryParentId === null) continue;
      expect(all.get(n.id)!).toBeLessThanOrEqual(all.get(n.primaryParentId)!);
    }
  });
});
