/**
 * 골드 위계의 구조 불변식 검사.
 *
 * 손으로 만든 캘리브레이션 픽스처와 LLM이 생성한 골드 모두 같은 검사를 통과해야 한다.
 * 위반은 조용히 넘기지 않고 전부 수집해 돌려준다 — 골드가 깨진 채로 파이프라인에 들어가면
 * 검수 단계에 가서야 드러나고, 그때는 이미 배치 비용을 다 쓴 뒤다.
 */

import type { GoldNode } from './domain/gold.js';
import { PrimaryPathError, primaryPath } from './weights.js';

export interface GoldViolation {
  readonly code:
    | 'no-root'
    | 'multiple-roots'
    | 'dangling-primary'
    | 'dangling-secondary'
    | 'primary-cycle'
    | 'self-parent'
    | 'duplicate-id'
    | 'primary-in-secondary'
    | 'slot-not-antichain'
    | 'unknown-slot'
    | 'empty-short-form';
  readonly message: string;
  readonly nodeId?: string;
}

export function validateGold(
  nodes: readonly GoldNode[],
  coreSlotIds: readonly string[] = [],
): readonly GoldViolation[] {
  const violations: GoldViolation[] = [];
  const byId = new Map<string, GoldNode>();

  for (const n of nodes) {
    if (byId.has(n.id)) {
      violations.push({ code: 'duplicate-id', message: `중복 노드 id: ${n.id}`, nodeId: n.id });
      continue;
    }
    byId.set(n.id, n);
  }

  const roots = nodes.filter((n) => n.primaryParentId === null);
  if (roots.length === 0) {
    violations.push({ code: 'no-root', message: 'primaryParentId가 null인 루트가 없다' });
  } else if (roots.length > 1) {
    violations.push({
      code: 'multiple-roots',
      message: `루트가 ${roots.length}개다: ${roots.map((r) => r.id).join(', ')}`,
    });
  }

  for (const n of nodes) {
    if (n.shortForm.trim() === '') {
      violations.push({
        code: 'empty-short-form',
        message: `shortForm이 비어 있다 — 충족 시 공개할 축약형이 없다: ${n.id}`,
        nodeId: n.id,
      });
    }

    if (n.primaryParentId === n.id) {
      violations.push({ code: 'self-parent', message: `자기 자신이 부모다: ${n.id}`, nodeId: n.id });
      continue;
    }

    if (n.primaryParentId !== null && !byId.has(n.primaryParentId)) {
      violations.push({
        code: 'dangling-primary',
        message: `primary 부모가 존재하지 않는다: ${n.id} -> ${n.primaryParentId}`,
        nodeId: n.id,
      });
    }

    for (const sid of n.secondaryParentIds) {
      if (!byId.has(sid)) {
        violations.push({
          code: 'dangling-secondary',
          message: `secondary 부모가 존재하지 않는다: ${n.id} -> ${sid}`,
          nodeId: n.id,
        });
      }
      if (sid === n.primaryParentId) {
        violations.push({
          code: 'primary-in-secondary',
          message: `primary 부모가 secondary에도 들어 있다: ${n.id} -> ${sid}`,
          nodeId: n.id,
        });
      }
    }
  }

  // primary 간선의 사이클 및 루트 도달성. 위에서 dangling이 잡힌 노드는 건너뛴다.
  const dangling = new Set(
    violations.filter((v) => v.code === 'dangling-primary').map((v) => v.nodeId),
  );
  for (const n of nodes) {
    if (dangling.has(n.id)) continue;
    try {
      primaryPath(nodes, n.id);
    } catch (e) {
      if (e instanceof PrimaryPathError) {
        violations.push({ code: 'primary-cycle', message: e.message, nodeId: n.id });
      } else {
        throw e;
      }
    }
  }

  violations.push(...validateSlots(nodes, byId, coreSlotIds));
  return violations;
}

/**
 * 코어 슬롯은 primary 신장 트리 위의 **안티체인**이어야 한다 — 한 노드와 그 조상이 동시에
 * 슬롯이 되면 같은 하위 내용이 두 슬롯에 걸쳐 두 번 계산된다.
 */
function validateSlots(
  nodes: readonly GoldNode[],
  byId: ReadonlyMap<string, GoldNode>,
  coreSlotIds: readonly string[],
): readonly GoldViolation[] {
  const violations: GoldViolation[] = [];
  const slots = new Set(coreSlotIds);

  for (const id of coreSlotIds) {
    if (!byId.has(id)) {
      violations.push({ code: 'unknown-slot', message: `슬롯이 가리키는 노드가 없다: ${id}`, nodeId: id });
    }
  }

  for (const id of coreSlotIds) {
    if (!byId.has(id)) continue;
    let ancestors: readonly GoldNode[];
    try {
      ancestors = primaryPath(nodes, id).slice(1);
    } catch {
      continue; // 경로 결함은 위에서 이미 보고됐다
    }
    for (const a of ancestors) {
      if (slots.has(a.id)) {
        violations.push({
          code: 'slot-not-antichain',
          message: `슬롯 ${id}의 조상 ${a.id}도 슬롯이다 — 안티체인이 아니다`,
          nodeId: id,
        });
      }
    }
  }

  return violations;
}
