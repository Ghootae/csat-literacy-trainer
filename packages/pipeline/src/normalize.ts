/**
 * 골드 위계 정규화 — 결정적 후처리.
 *
 * LLM은 **의미 사실**만 낸다 (이 합성 노드가 새 관계를 도입하는가, 부모가 이미 그 의미를
 * 포함하는가, 이 간선을 지우면 어떤 학생 문장의 판정이 달라지는가). 규칙 적용은 여기서
 * 결정적으로 한다 — 프롬프트 판단에 맡기면 같은 문단에서 실행마다 다른 구조가 나온다.
 *
 * 처리 순서 (권장 파이프라인 4~8단계):
 *   4. 의미 증가분 없는 통과 노드 제거
 *   5. 중복·역방향 동치 링크 병합
 *   6. secondary link의 평가 영향 검사
 *   7. 평가 비영향 링크를 discourse link로 이동
 *   8. 슬롯별 traceability / required_reasoning_core 분리
 */

export interface DraftNode {
  readonly id: string;
  readonly kind: 'proposition' | 'composite' | 'title';
  readonly text: string;
  readonly shortForm: string;
  readonly aspect?: string;
  readonly subjectRole?: string;
  readonly childIds: readonly string[];
  /** 명제가 독립된 학습 슬롯으로서 복원할 가치가 있는가. LLM이 판단해 채운다. */
  readonly standaloneSlotValue?: boolean;
  /** 합성 노드가 새로운 인과·조건·대조·목적·절차 관계를 도입하는가. LLM이 판단해 채운다. */
  readonly introducesRelation?: boolean;
  /** 부모의 내용이 이미 이 노드의 일반화 의미를 포함하는가. LLM이 판단해 채운다. */
  readonly subsumedByParent?: boolean;
}

export interface DraftLink {
  readonly fromId: string;
  readonly toId: string;
  readonly type: string;
  /** 이 간선이 없을 때 판정이 달라지는 구체적 학생 문장. 없으면 평가용으로 쓰지 않는다. */
  readonly witness?: string;
  readonly evaluationEffect?: string;
}

export interface MergedLink {
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly relationProperties: readonly string[];
  readonly contrastAxis: string | null;
  readonly evaluationEffect: string;
  readonly witness: string | null;
}

export interface NormalizeResult {
  readonly nodes: readonly DraftNode[];
  readonly evaluationLinks: readonly MergedLink[];
  readonly discourseLinks: readonly MergedLink[];
  /** 무엇을 왜 바꿨는지. 정규화 전후 차이를 사람이 검토할 수 있게 남긴다. */
  readonly log: readonly string[];
}

export interface CompletenessIssue {
  readonly code: 'uncovered-sentence' | 'unknown-sentence-ref' | 'no-propositions';
  readonly message: string;
}

/**
 * 명제 완전성 검증 (파이프라인 1단계).
 *
 * 분해가 문단의 일부만 다루고 조용히 끝나는 것을 막는다. 실제로 「법인」 문단에서 분해가
 * 첫 문장만 처리하고 나머지 6문장을 버렸는데, 이 검사가 없어 파이프라인이 끝까지 돌아
 * 슬롯과 채점 기준까지 만들어냈다. 골드가 문단의 1/7만 덮는 채로 완성된 것이다.
 *
 * 문장 하나하나가 최소 한 개의 명제에 근거로 인용되어야 한다.
 */
export function validateCompleteness(
  sentences: readonly { id: string }[],
  propositions: readonly { id: string; sourceSentences: readonly string[] }[],
): readonly CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];

  if (propositions.length === 0) {
    return [{ code: 'no-propositions', message: '명제가 하나도 생성되지 않았다' }];
  }

  const known = new Set(sentences.map((s) => s.id));
  const cited = new Set(propositions.flatMap((p) => p.sourceSentences));

  for (const s of sentences) {
    if (!cited.has(s.id)) {
      issues.push({
        code: 'uncovered-sentence',
        message: `${s.id}을 근거로 삼는 명제가 없다 — 이 문장이 통째로 누락됐다`,
      });
    }
  }

  for (const p of propositions) {
    for (const ref of p.sourceSentences) {
      if (!known.has(ref)) {
        issues.push({
          code: 'unknown-sentence-ref',
          message: `${p.id}이 존재하지 않는 문장 ${ref}을 근거로 든다`,
        });
      }
    }
  }

  return issues;
}

/** 실행 층위를 나타내는 aspect. 역할 분리 간선의 방향을 정하는 데 쓴다. */
const EXECUTION_ASPECT = 'actual_execution';

/**
 * 역할 분리를 표현하는 링크 종류. 이들은 **모순 오판을 막는** 역할을 하므로
 * 양 끝이 각각 슬롯에 덮여 있어도 평가에 필요하다.
 */
const CONTRADICTION_GUARDS = new Set([
  'role_separation',
  'realization_method',
  'realized_by',
  'implements',
]);

const MIN_CHILDREN = 2;
const MAX_CHILDREN = 5;

export function normalizeHierarchy(
  nodes: readonly DraftNode[],
  links: readonly DraftLink[],
  slotIds: readonly string[],
): NormalizeResult {
  const log: string[] = [];
  const afterPassThrough = removePassThroughNodes(nodes, links, slotIds, log);
  const merged = mergeEquivalentLinks(afterPassThrough, links, log);
  const { evaluation, discourse } = partitionLinks(merged, afterPassThrough, slotIds, log);
  return { nodes: afterPassThrough, evaluationLinks: evaluation, discourseLinks: discourse, log };
}

/**
 * 통과 노드 제거 (4단계).
 *
 * "부모 아래 합성 자식이 하나면 무조건 흡수" 같은 규칙은 쓰지 않는다. 아래 일곱 조건을
 * **모두** 만족할 때만 제거한다.
 */
export function removePassThroughNodes(
  nodes: readonly DraftNode[],
  links: readonly DraftLink[],
  slotIds: readonly string[],
  log: string[],
): readonly DraftNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map<string, string>();
  for (const n of nodes) for (const c of n.childIds) parentOf.set(c, n.id);

  const slots = new Set(slotIds);
  const linkEndpoints = new Set(links.flatMap((l) => [l.fromId, l.toId]));

  let current = [...nodes];
  let changed = true;

  while (changed) {
    changed = false;

    for (const node of current) {
      if (node.kind !== 'composite') continue;

      const parentId = parentOf.get(node.id);
      if (parentId === undefined) continue; // 루트는 대상 아님
      const parent = byId.get(parentId);
      if (parent === undefined) continue;

      const reasons = passThroughViolations(node, parent, slots, linkEndpoints);
      if (reasons.length > 0) continue;

      // 흡수: 자식을 부모로 승격하고 노드를 제거한다. 자식이 재부모화될 뿐
      // 사라지는 명제가 없으므로 원문 범위와 관계는 보존된다.
      const promoted = parent.childIds.flatMap((c) => (c === node.id ? node.childIds : [c]));
      const nextParent: DraftNode = { ...parent, childIds: promoted };

      current = current.filter((n) => n.id !== node.id).map((n) => (n.id === parent.id ? nextParent : n));
      byId.set(parent.id, nextParent);
      byId.delete(node.id);
      parentOf.delete(node.id);
      for (const c of node.childIds) parentOf.set(c, parent.id);

      log.push(
        `통과 노드 제거: ${node.id} ("${node.shortForm}") → 자식 [${node.childIds.join(', ')}]을 ` +
          `${parent.id}로 승격 (${parent.id}의 자식 ${parent.childIds.length}→${promoted.length}개)`,
      );
      changed = true;
      break;
    }
  }

  return current;
}

/** 제거를 막는 사유들. 비어 있으면 제거 대상이다. */
function passThroughViolations(
  node: DraftNode,
  parent: DraftNode,
  slots: ReadonlySet<string>,
  linkEndpoints: ReadonlySet<string>,
): readonly string[] {
  const v: string[] = [];

  if (node.introducesRelation !== false) v.push('새 관계를 도입함 (인과·조건·대조·목적·절차)');
  if (node.subsumedByParent !== true) v.push('부모가 이 노드의 일반화 의미를 포함하지 않음');
  if (slots.has(node.id)) v.push('독립 학습 슬롯으로 유지되어야 함');
  if (linkEndpoints.has(node.id)) v.push('secondary link의 endpoint임');

  const promotedCount = parent.childIds.length - 1 + node.childIds.length;
  if (promotedCount < MIN_CHILDREN || promotedCount > MAX_CHILDREN) {
    v.push(`승격 후 부모의 자식 수가 ${promotedCount}개 (허용 ${MIN_CHILDREN}~${MAX_CHILDREN})`);
  }

  return v;
}

/**
 * 중복·역방향 동치 링크 병합 (5단계).
 *
 * `p6 →role_separation→ p9`와 `p9 →realization_method→ p6`은 같은 사실의 두 표현이다.
 * 평가기가 두 개의 독립 필수 관계로 오해하지 않도록 하나로 표준화한다.
 * `role_separation`은 별도 역방향 간선이 아니라 **관계 속성**으로 둔다.
 */
export function mergeEquivalentLinks(
  nodes: readonly DraftNode[],
  links: readonly DraftLink[],
  log: string[],
): readonly MergedLink[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups = new Map<string, DraftLink[]>();

  for (const l of links) {
    const key = [l.fromId, l.toId].sort().join('|');
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  return [...groups.values()].map((group) => {
    const first = group[0]!;
    if (group.length === 1) return toMerged(first, first.type, [], byId);

    // 방향 결정: 실행 층위 노드가 target이 되도록 한다. 판단 불가하면 첫 링크의 방향.
    const [a, b] = [first.fromId, first.toId];
    const aExec = byId.get(a!)?.aspect === EXECUTION_ASPECT;
    const bExec = byId.get(b!)?.aspect === EXECUTION_ASPECT;
    const source = bExec && !aExec ? a! : aExec && !bExec ? b! : first.fromId;
    const target = source === a ? b! : a!;

    const properties = [...new Set(group.map((l) => l.type))].filter((t) => t !== 'realized_by');
    const witness = group.find((l) => l.witness !== undefined && l.witness !== '');
    const canonical: DraftLink = {
      fromId: source,
      toId: target,
      type: 'realized_by',
      ...(witness?.witness === undefined ? {} : { witness: witness.witness }),
      ...(witness?.evaluationEffect === undefined
        ? { evaluationEffect: group.map((l) => l.evaluationEffect).find((e) => e) ?? '' }
        : { evaluationEffect: witness.evaluationEffect }),
    };

    log.push(
      `링크 병합: ${group.map((l) => `${l.fromId}→(${l.type})→${l.toId}`).join(' + ')} ` +
        `⇒ ${source} →(realized_by)→ ${target} [속성: ${properties.join(', ')}]`,
    );

    return toMerged(canonical, 'realized_by', properties, byId);
  });
}

function toMerged(
  link: DraftLink,
  relation: string,
  properties: readonly string[],
  byId: ReadonlyMap<string, DraftNode>,
): MergedLink {
  const fromAspect = byId.get(link.fromId)?.aspect;
  const toAspect = byId.get(link.toId)?.aspect;
  const axis =
    fromAspect !== undefined && toAspect !== undefined && fromAspect !== toAspect
      ? `${fromAspect}_vs_${toAspect}`
      : null;

  return {
    source: link.fromId,
    target: link.toId,
    relation,
    relationProperties: properties,
    contrastAxis: axis,
    evaluationEffect: link.evaluationEffect ?? '',
    witness: link.witness ?? null,
  };
}

/**
 * 평가 영향 검사와 discourse 분리 (6~7단계).
 *
 * 반사실 기준: "이 간선을 삭제했을 때 실제 학생 답변의 충족·누락·모순 판정이 달라지는가?"
 * witness를 못 내면 평가용이 아니다.
 *
 * 추가 구조 검사: 양 끝이 **서로 다른 슬롯에 각각 덮여 있고** 모순 오판을 막는 종류가
 * 아니면, 누락은 각 슬롯에서 이미 잡히므로 판정이 달라지지 않는다.
 */
export function partitionLinks(
  links: readonly MergedLink[],
  nodes: readonly DraftNode[],
  slotIds: readonly string[],
  log: string[],
): { evaluation: readonly MergedLink[]; discourse: readonly MergedLink[] } {
  const owner = slotOwners(nodes, slotIds);
  const evaluation: MergedLink[] = [];
  const discourse: MergedLink[] = [];

  for (const l of links) {
    const guard = CONTRADICTION_GUARDS.has(l.relation) ||
      l.relationProperties.some((p) => CONTRADICTION_GUARDS.has(p));

    if (l.witness === null || l.witness === '') {
      discourse.push(l);
      log.push(`discourse로 이동: ${l.source}→${l.target} — witness 없음 (판정 변화 입증 실패)`);
      continue;
    }

    const sourceSlot = owner.get(l.source);
    const targetSlot = owner.get(l.target);
    if (!guard && sourceSlot !== undefined && targetSlot !== undefined && sourceSlot !== targetSlot) {
      discourse.push(l);
      log.push(
        `discourse로 이동: ${l.source}→${l.target} — 양 끝이 서로 다른 슬롯(${sourceSlot}, ${targetSlot})에 ` +
          `각각 덮여 있고 모순 오판 방지 종류가 아니므로, 누락은 슬롯에서 이미 잡힌다`,
      );
      continue;
    }

    evaluation.push(l);
  }

  return { evaluation, discourse };
}

/**
 * 슬롯 프론티어 선정 (파이프라인 8단계 앞).
 *
 * 루트의 자식에서 시작해 3~6개가 될 때까지 전개한 뒤, **독립적인 한 번의 수정 행동으로
 * 복원할 가치가 없는 도입·배경·정의 단독 노드는 인접 핵심 슬롯에 흡수**한다.
 *
 * 명제 **개수** 균형은 보지 않는다. 슬롯은 개수가 아니라 하나의 사고 단위다 — 명제 5개짜리
 * 슬롯과 1개짜리 슬롯이 나란히 있어도, 후자가 독립적으로 복원할 가치가 있으면 그대로 둔다.
 */
export function selectSlots(
  nodes: readonly DraftNode[],
  titleId: string,
  log: string[] = [],
): { slots: readonly string[]; absorbed: ReadonlyMap<string, string> } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let frontier = [...(byId.get(titleId)?.childIds ?? [])];
  let absorbed = new Map<string, string>();
  let slots = frontier;
  const passLogs: string[][] = [];

  // 전개 → 흡수를 번갈아 반복한다. 흡수가 슬롯 수를 하한 아래로 떨어뜨릴 수 있으므로
  // 한 번의 전개로 끝내면 안 된다 — 「법인」에서 [c1, c7]을 전개해 [p1, c2, c7]을 얻은 뒤
  // p1이 흡수되어 다시 2개가 된 적이 있다.
  //
  // 흡수는 **매 패스마다 새로 계산한다.** 재전개하면 이전 패스의 호스트가 슬롯에서
  // 밀려날 수 있어, 누적하면 존재하지 않는 슬롯을 가리키는 매핑이 남는다.
  for (let pass = 0; pass < MAX_SLOT_PASSES; pass++) {
    while (frontier.length < MIN_SLOTS) {
      const next = expandOnce(byId, frontier);
      if (next === null) break;
      frontier = next;
    }

    const result = absorbLoneIntroductory(byId, frontier);
    absorbed = result.absorbed;
    slots = result.slots;
    passLogs.push(result.log);

    if (slots.length >= MIN_SLOTS) break;

    // **흡수 후 프론티어가 아니라 흡수 전 프론티어를 더 전개한다.** 흡수된 노드를
    // 빼고 전개하면 그 노드가 어느 슬롯에도 덮이지 않은 채 통째로 사라진다.
    const next = expandOnce(byId, frontier);
    if (next === null) break;

    passLogs.push([
      `슬롯 재전개: 흡수 후 ${slots.length}개로 하한(${MIN_SLOTS}) 미만 — 흡수 전 프론티어를 더 전개한다`,
    ]);
    frontier = next;
  }

  // 마지막 패스의 흡수 기록만 유효하다. 중간 패스의 흡수는 재전개로 무효가 됐다.
  log.push(...passLogs.flat().filter((l) => l.includes('재전개')));
  log.push(...(passLogs.at(-1) ?? []).filter((l) => !l.includes('재전개')));

  return { slots, absorbed };
}

/**
 * 프론티어에서 노드 하나를 자식으로 대체한다.
 *
 * **하위 트리가 가장 큰 노드**를 고른다. 가장 무거운 가지를 먼저 펼쳐야 슬롯이 고르게
 * 나뉜다 — 「법인」에서 첫 번째 후보(분류 가지)를 펼치면 명제 4개가 낱낱이 슬롯이 되지만,
 * 가장 무거운 가지(자산 운용)를 펼치면 의미 단위 3개가 나온다.
 */
function expandOnce(
  byId: ReadonlyMap<string, DraftNode>,
  frontier: readonly string[],
): string[] | null {
  const expandable = frontier.filter((id) => (byId.get(id)?.childIds.length ?? 0) > 0);
  if (expandable.length === 0) return null;

  const target = expandable.reduce((best, id) =>
    subtreeSize(byId, id) > subtreeSize(byId, best) ? id : best,
  );

  return frontier.flatMap((id) => (id === target ? (byId.get(id)?.childIds ?? []) : [id]));
}

function subtreeSize(byId: ReadonlyMap<string, DraftNode>, id: string): number {
  const children = byId.get(id)?.childIds ?? [];
  return 1 + children.reduce((n, c) => n + subtreeSize(byId, c), 0);
}

/** 독립 가치 없는 도입·배경·정의 단독 명제를 인접 슬롯에 흡수한다. */
function absorbLoneIntroductory(
  byId: ReadonlyMap<string, DraftNode>,
  frontier: readonly string[],
): { slots: string[]; absorbed: Map<string, string>; log: string[] } {
  const absorbed = new Map<string, string>();
  const log: string[] = [];
  const kept: string[] = [];

  for (const [i, id] of frontier.entries()) {
    const node = byId.get(id);
    const lone = node?.kind === 'proposition' && node.standaloneSlotValue === false;
    if (!lone) {
      kept.push(id);
      continue;
    }

    // 인접: 문서 순서상 다음 슬롯, 없으면 이전 슬롯.
    const host = frontier[i + 1] ?? frontier[i - 1];
    if (host === undefined) {
      kept.push(id);
      continue;
    }

    absorbed.set(id, host);
    log.push(
      `슬롯 흡수: ${id} ("${node.shortForm}") → ${host} — 독립적인 한 번의 수정 행동으로 ` +
        `복원할 가치가 없는 도입·배경·정의 단독 노드`,
    );
  }

  return { slots: kept.filter((id) => !absorbed.has(id)), absorbed, log };
}

const MAX_SLOT_PASSES = 5;

const MIN_SLOTS = 3;

/** 노드 → 그 노드를 덮는 슬롯. 슬롯 자신은 자기 자신을 덮는다. */
export function slotOwners(
  nodes: readonly DraftNode[],
  slotIds: readonly string[],
): ReadonlyMap<string, string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const owner = new Map<string, string>();

  for (const slot of slotIds) {
    const stack = [slot];
    while (stack.length > 0) {
      const id = stack.pop()!;
      owner.set(id, slot);
      for (const c of byId.get(id)?.childIds ?? []) stack.push(c);
    }
  }

  return owner;
}

/**
 * 슬롯이 덮는 명제 id들 (8단계의 traceability_propositions).
 *
 * 흡수된 노드도 포함해야 한다 — 흡수는 슬롯 경계를 옮기는 것이지 내용을 버리는 것이 아니다.
 */
export function traceabilityPropositions(
  nodes: readonly DraftNode[],
  slotId: string,
  absorbed: ReadonlyMap<string, string> = new Map(),
): readonly string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const stack = [slotId, ...[...absorbed].filter(([, host]) => host === slotId).map(([id]) => id)];

  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = byId.get(id);
    if (node === undefined) continue;
    if (node.kind === 'proposition') out.push(id);
    for (const c of node.childIds) stack.push(c);
  }

  return out.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}
