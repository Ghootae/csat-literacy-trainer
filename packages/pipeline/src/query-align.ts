/**
 * 자동 생성 질의 세트의 **구조적 정렬** (결정적).
 *
 * regionId·queryId는 실행마다 달라지므로 ID 문자열이나 질문 표면 문구가 아니라
 * source span·proposition·relation edge 겹침으로 의미 영역을 정렬한다. 정렬 결과 위에서
 * 핵심 관계 커버리지·층위·필수 플래그 재현성을 계산한다.
 */

export type QueryLevel = 'scope' | 'relation' | 'argument';

export interface QueryShape {
  readonly id: string;
  readonly level: QueryLevel;
  readonly sentenceIds: readonly string[];
  readonly propositionIds: readonly string[];
  readonly relationEdgeIds: readonly string[];
  readonly criticalForRelation: boolean;
  readonly requiredForFullArgumentCoverage: boolean;
}

export interface RegionShape {
  readonly key: string;
  readonly label: string;
  readonly sentenceIds: readonly string[];
  readonly propositionIds: readonly string[];
  readonly relationEdgeIds: readonly string[];
  readonly queries: readonly QueryShape[];
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function overlapCount(a: readonly string[], b: readonly string[]): number {
  const sb = new Set(b);
  let n = 0;
  for (const x of new Set(a)) if (sb.has(x)) n += 1;
  return n;
}

/** 영역 정렬 점수: 문장 겹침 우선, 명제 겹침 보조. */
function regionScore(a: RegionShape, b: RegionShape): number {
  return jaccard(a.sentenceIds, b.sentenceIds) * 2 + jaccard(a.propositionIds, b.propositionIds);
}

export interface RegionAlignment {
  readonly refKey: string;
  readonly matched: RegionShape | null;
  readonly score: number;
}

/**
 * 각 참조(reference) 영역에 후보 영역을 그리디로 정렬한다. 점수 높은 쌍부터 확정하며
 * 후보는 한 번만 쓰인다. 매칭 실패(점수 0)는 matched=null.
 */
export function alignRegionsToReference(
  candidates: readonly RegionShape[],
  reference: readonly RegionShape[],
): RegionAlignment[] {
  const pairs: { ri: number; ci: number; score: number }[] = [];
  reference.forEach((r, ri) =>
    candidates.forEach((c, ci) => {
      const score = regionScore(r, c);
      if (score > 0) pairs.push({ ri, ci, score });
    }),
  );
  pairs.sort((x, y) => y.score - x.score);

  const usedRef = new Set<number>();
  const usedCand = new Set<number>();
  const result: RegionAlignment[] = reference.map((r) => ({ refKey: r.key, matched: null, score: 0 }));
  for (const p of pairs) {
    if (usedRef.has(p.ri) || usedCand.has(p.ci)) continue;
    usedRef.add(p.ri);
    usedCand.add(p.ci);
    result[p.ri] = { refKey: reference[p.ri]!.key, matched: candidates[p.ci]!, score: p.score };
  }
  return result;
}

export interface CoreRelation {
  readonly id: string;
  readonly label: string;
  readonly propositionIds: readonly string[];
  readonly relationEdgeIds?: readonly string[];
}

export interface CoreRelationHit {
  readonly id: string;
  readonly label: string;
  readonly covered: boolean;
  readonly bestQueryId: string | null;
  readonly propCoverage: number;
}

/**
 * 핵심 관계가 질의 세트에 존재하는가. 어떤 질의든 (a) 관계 간선 앵커가 일치하거나
 * (b) 명제 앵커가 핵심 관계 명제의 절반 이상을 덮으면 커버된 것으로 본다.
 */
export function coreRelationCovered(cr: CoreRelation, queries: readonly QueryShape[]): CoreRelationHit {
  let best: { id: string; cov: number } | null = null;
  for (const q of queries) {
    const edgeHit =
      cr.relationEdgeIds !== undefined &&
      cr.relationEdgeIds.length > 0 &&
      overlapCount(q.relationEdgeIds, cr.relationEdgeIds) > 0;
    const cov = cr.propositionIds.length === 0 ? 0 : overlapCount(q.propositionIds, cr.propositionIds) / cr.propositionIds.length;
    const score = edgeHit ? Math.max(cov, 1) : cov;
    if (best === null || score > best.cov) best = { id: q.id, cov: score };
  }
  const covered = best !== null && best.cov >= 0.5;
  return { id: cr.id, label: cr.label, covered, bestQueryId: best?.id ?? null, propCoverage: best?.cov ?? 0 };
}

/** 정렬된 두 영역 사이에서 질의를 명제·문장 겹침으로 1:1 매칭 (층위·플래그 비교용). */
export function alignQueries(a: readonly QueryShape[], b: readonly QueryShape[]): Array<{ a: QueryShape; b: QueryShape | null }> {
  const pairs: { ai: number; bi: number; score: number }[] = [];
  a.forEach((qa, ai) =>
    b.forEach((qb, bi) => {
      const score = jaccard(qa.propositionIds, qb.propositionIds) * 2 + jaccard(qa.sentenceIds, qb.sentenceIds);
      if (score > 0) pairs.push({ ai, bi, score });
    }),
  );
  pairs.sort((x, y) => y.score - x.score);
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const out: Array<{ a: QueryShape; b: QueryShape | null }> = a.map((qa) => ({ a: qa, b: null }));
  for (const p of pairs) {
    if (usedA.has(p.ai) || usedB.has(p.bi)) continue;
    usedA.add(p.ai);
    usedB.add(p.bi);
    out[p.ai] = { a: a[p.ai]!, b: b[p.bi]! };
  }
  return out;
}
