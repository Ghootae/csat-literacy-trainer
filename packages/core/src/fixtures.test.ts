/**
 * 손으로 만든 캘리브레이션 픽스처가 구조 불변식을 지키는지 검사한다.
 *
 * 픽스처는 이후 모든 변경이 대조되는 기준점이므로, 사람이 눈으로 확인한 것에 더해
 * 기계가 확인할 수 있는 부분은 기계가 확인한다.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { GoldNode } from './domain/gold.js';
import { validateGold } from './validate-gold.js';
import { allGlobalWeights } from './weights.js';

const FIXTURE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../pipeline/fixtures',
);

interface PairwiseLabel {
  parent: string;
  a: string;
  b: string;
  moreDamaging: string;
  note: string;
}

interface Fixture {
  paragraphId: string;
  titleNodeId: string;
  nodes: GoldNode[];
  proposedCoreSlots: string[];
  pairwiseLabels: PairwiseLabel[];
  stressCases: { id: string; purpose: string; targetSlot: string; studentText: string }[];
}

function load(name: string): Fixture {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), 'utf8')) as Fixture;
}

const FIXTURES = ['gold-corporate-law-p0.json', 'gold-missing-values-p1.json'];

describe.each(FIXTURES)('%s', (name) => {
  const fx = load(name);

  it('구조 불변식을 모두 지킨다', () => {
    expect(validateGold(fx.nodes, fx.proposedCoreSlots)).toEqual([]);
  });

  it('선언된 타이틀 노드가 실제 루트다', () => {
    const title = fx.nodes.find((n) => n.id === fx.titleNodeId);
    expect(title).toBeDefined();
    expect(title!.primaryParentId).toBeNull();
    expect(title!.kind).toBe('title');
  });

  it('제안된 코어 슬롯 개수가 3~6 범위다', () => {
    expect(fx.proposedCoreSlots.length).toBeGreaterThanOrEqual(3);
    expect(fx.proposedCoreSlots.length).toBeLessThanOrEqual(6);
  });

  it('모든 잎이 어떤 슬롯의 하위에 있거나 슬롯 자신이다 — 커버되지 않는 내용이 없다', () => {
    const slots = new Set(fx.proposedCoreSlots);
    const byId = new Map(fx.nodes.map((n) => [n.id, n]));
    const leaves = fx.nodes.filter((n) => !fx.nodes.some((m) => m.primaryParentId === n.id));

    for (const leaf of leaves) {
      let cursor: GoldNode | undefined = leaf;
      let covered = false;
      while (cursor !== undefined) {
        if (slots.has(cursor.id)) {
          covered = true;
          break;
        }
        cursor = cursor.primaryParentId === null ? undefined : byId.get(cursor.primaryParentId);
      }
      expect(covered, `잎 ${leaf.id}이 어떤 코어 슬롯에도 속하지 않는다`).toBe(true);
    }
  });

  it('명제 노드는 R1 판정에 필요한 relation을 갖는다', () => {
    for (const n of fx.nodes.filter((x) => x.kind === 'proposition')) {
      expect(n.relation, `${n.id}에 relation이 없다`).toBeDefined();
      expect(n.relation!.from.trim()).not.toBe('');
      expect(n.relation!.to.trim()).not.toBe('');
    }
  });

  it('쌍대 라벨이 실재하는 노드와 부모-자식 관계를 가리킨다', () => {
    const byId = new Map(fx.nodes.map((n) => [n.id, n]));
    for (const l of fx.pairwiseLabels) {
      expect(byId.has(l.parent), `부모 ${l.parent} 없음`).toBe(true);
      for (const child of [l.a, l.b]) {
        expect(byId.get(child)?.primaryParentId, `${child}의 primary 부모가 ${l.parent}가 아니다`).toBe(
          l.parent,
        );
      }
      expect([l.a, l.b, 'tie']).toContain(l.moreDamaging);
    }
  });

  it('스트레스 케이스가 실재하는 슬롯을 겨냥한다', () => {
    for (const s of fx.stressCases) {
      expect(fx.proposedCoreSlots, `${s.id}의 targetSlot`).toContain(s.targetSlot);
    }
  });

  it('가중치가 붙으면 W 계산이 성립한다 (임의 국소값으로 연결성 확인)', () => {
    const local = new Map(
      fx.nodes.filter((n) => n.primaryParentId !== null).map((n) => [n.id, 0.5]),
    );
    const all = allGlobalWeights(fx.nodes, local);
    expect(all.size).toBe(fx.nodes.length);
    expect(all.get(fx.titleNodeId)).toBe(1);
  });
});
