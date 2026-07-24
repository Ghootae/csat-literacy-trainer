/**
 * primary 경로를 따라 국소 가중치 w를 전역 가중치 W로 접는다.
 *
 *   W(v) = Π w(a) for a on the primary path from v up to root (v 포함)
 *
 * w는 직속 부모 대비 손상도라 부모마다 스케일이 다르다. 서로 다른 부모·깊이의 노드를 한
 * 스케일에서 비교하려면(슬롯 선정과 보상이 둘 다 그렇게 한다) 경로 곱으로 정규화해야 한다.
 *
 * 루트는 부모가 없어 손상도가 정의되지 않으므로 w(root) ≡ 1로 둔다 — 곱셈의 항등원이라
 * 경로 곱에 영향을 주지 않는다.
 */

import type { GoldNode } from './domain/gold.js';

export const ROOT_LOCAL_WEIGHT = 1;

export class PrimaryPathError extends Error {}

/** 노드에서 루트까지의 primary 경로. 노드 자신이 첫 원소, 루트가 마지막이다. */
export function primaryPath(nodes: readonly GoldNode[], nodeId: string): readonly GoldNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: GoldNode[] = [];
  const visited = new Set<string>();

  let current = byId.get(nodeId);
  if (current === undefined) {
    throw new PrimaryPathError(`unknown node: ${nodeId}`);
  }

  while (current !== undefined) {
    if (visited.has(current.id)) {
      throw new PrimaryPathError(`primary parent cycle at: ${current.id}`);
    }
    visited.add(current.id);
    path.push(current);

    const parentId = current.primaryParentId;
    if (parentId === null) break;

    const parent = byId.get(parentId);
    if (parent === undefined) {
      throw new PrimaryPathError(`dangling primary parent: ${current.id} -> ${parentId}`);
    }
    current = parent;
  }

  const last = path[path.length - 1];
  if (last === undefined || last.primaryParentId !== null) {
    throw new PrimaryPathError(`primary path from ${nodeId} does not reach a root`);
  }
  return path;
}

/**
 * 전역 가중치 W(v)를 계산한다.
 *
 * @param localWeights 노드 id → 국소 가중치 w. 루트는 없어도 되며 있으면 무시된다.
 */
export function globalWeight(
  nodes: readonly GoldNode[],
  nodeId: string,
  localWeights: ReadonlyMap<string, number>,
): number {
  return primaryPath(nodes, nodeId).reduce((product, node) => {
    if (node.primaryParentId === null) return product * ROOT_LOCAL_WEIGHT;

    const w = localWeights.get(node.id);
    if (w === undefined) {
      throw new PrimaryPathError(`missing local weight for node: ${node.id}`);
    }
    return product * w;
  }, 1);
}

/** 모든 노드의 W를 한 번에 계산한다. */
export function allGlobalWeights(
  nodes: readonly GoldNode[],
  localWeights: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  return new Map(nodes.map((n) => [n.id, globalWeight(nodes, n.id, localWeights)]));
}
