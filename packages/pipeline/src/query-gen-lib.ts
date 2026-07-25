/**
 * 자동 질의 생성 재현성 실험의 공유 로직 (문단 무관).
 *
 * 골드 → 생성기 입력 구성, 손 오라클/생성 결과 → EvalSet 변환, 오라클 영역 재버킷팅,
 * 모순 cluster 파생. 법인 문단 실험과 과학·인문 일반화 실험이 공유한다.
 */

import type { GeneratorInput, GeneratedQuerySet, GenProposition, GenRelationEdge } from './llm/query-gen.js';
import type { PreservationQuery } from './llm/query-eval.js';
import type { QueryShape, RegionShape } from './query-align.js';
import type { RegionPolicy } from './query-normalize.js';

// ── 골드 타입 (생성기 입력에 필요한 최소) ──
export interface Gold {
  paragraphId: string;
  titleId: string;
  nodes: Array<{ id: string; shortForm?: string; label?: string; text?: string }>;
  propositions: Array<GenProposition & { relation: { from: string; to: string; kind: string } }>;
  sentences: Array<{ id: string; text: string }>;
  evaluationLinks: Array<EdgeRaw>;
  discourseLinks: Array<EdgeRaw>;
}
interface EdgeRaw {
  source: string;
  target: string;
  relation: string;
  relationProperties?: string[];
  contrastAxis?: string | null;
}

/** 문단 원문을 골드 문장에서 복원한다 (loadPassage 좌표 의존 제거). */
export function paragraphText(gold: Gold): string {
  return gold.sentences.map((s) => s.text).join(' ');
}

export function buildGeneratorInput(gold: Gold): GeneratorInput {
  const edges: GenRelationEdge[] = [
    ...gold.evaluationLinks.map((e, i) => mkEdge(e, `e${i + 1}`, 'eval')),
    ...gold.discourseLinks.map((e, i) => mkEdge(e, `d${i + 1}`, 'discourse')),
  ];
  const title = gold.nodes.find((n) => n.id === gold.titleId);
  return {
    paragraphId: gold.paragraphId,
    topic: title?.shortForm ?? title?.label ?? title?.text ?? '문단 주제',
    sentences: gold.sentences,
    propositions: gold.propositions.map((p) => ({
      id: p.id,
      text: p.text,
      shortForm: p.shortForm,
      aspect: p.aspect,
      subjectRole: p.subjectRole,
      sourceSentences: p.sourceSentences,
      relation: p.relation,
    })),
    relationEdges: edges,
  };
}
function mkEdge(e: EdgeRaw, id: string, kind: 'eval' | 'discourse'): GenRelationEdge {
  return {
    id,
    source: e.source,
    target: e.target,
    relation: e.relation,
    relationProperties: e.relationProperties ?? [],
    contrastAxis: e.contrastAxis ?? null,
    kind,
  };
}

// ── 오라클 fixture 타입 (손 질의) ──
export interface OracleQuery extends PreservationQuery {
  propositions?: string[];
  requiredForRelation?: boolean;
  requiredForFullArgumentCoverage?: boolean;
}
export interface OracleFixture {
  paragraphId: string;
  queries: OracleQuery[];
  regionPolicy: Array<{ id: string; label: string; scopeQueries: string[]; relationQueries: string[]; argumentQueries: string[] }>;
}

export interface EvalSet {
  readonly name: string;
  readonly queries: readonly PreservationQuery[];
  readonly policy: readonly RegionPolicy[];
  readonly shapes: readonly RegionShape[];
  functionalPolicy?: readonly RegionPolicy[];
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

export function oracleEvalSet(fx: OracleFixture, name = 'oracle(손질의)'): EvalSet {
  const byId = new Map(fx.queries.map((q) => [q.id, q]));
  const policy: RegionPolicy[] = fx.regionPolicy.map((m) => {
    const ids = [...m.scopeQueries, ...m.relationQueries, ...m.argumentQueries];
    return {
      id: m.id,
      label: m.label,
      scopeQueries: m.scopeQueries,
      relationQueries: m.relationQueries,
      argumentQueries: m.argumentQueries,
      criticalForRelation: ids.filter((id) => byId.get(id)?.requiredForRelation === true),
      requiredForFullArgument: ids.filter((id) => byId.get(id)?.requiredForFullArgumentCoverage === true),
    };
  });
  const shapes: RegionShape[] = fx.regionPolicy.map((m) => {
    const ids = [...m.scopeQueries, ...m.relationQueries, ...m.argumentQueries];
    const qs = ids.map((id) => byId.get(id)!);
    return {
      key: m.id,
      label: m.label,
      sentenceIds: uniq(qs.flatMap((q) => q.sentences)),
      propositionIds: uniq(qs.flatMap((q) => q.propositions ?? [])),
      relationEdgeIds: [],
      queries: qs.map((q) => ({
        id: q.id,
        level: m.scopeQueries.includes(q.id) ? 'scope' : m.relationQueries.includes(q.id) ? 'relation' : 'argument',
        sentenceIds: q.sentences,
        propositionIds: q.propositions ?? [],
        relationEdgeIds: [],
        criticalForRelation: q.requiredForRelation === true,
        requiredForFullArgumentCoverage: q.requiredForFullArgumentCoverage === true,
      })) as QueryShape[],
    };
  });
  return { name, queries: fx.queries, policy, shapes };
}

export function generatedEvalSet(name: string, gen: GeneratedQuerySet): EvalSet {
  const queries: PreservationQuery[] = [];
  const policy: RegionPolicy[] = [];
  const shapes: RegionShape[] = [];
  for (const r of gen.regions) {
    const scopeQ: string[] = [], relQ: string[] = [], argQ: string[] = [], critical: string[] = [], reqArg: string[] = [];
    const qShapes: QueryShape[] = [];
    for (const q of r.queries) {
      if (q.level === 'scope') scopeQ.push(q.id);
      else if (q.level === 'relation') relQ.push(q.id);
      else argQ.push(q.id);
      if (q.criticalForRelation) critical.push(q.id);
      if (q.requiredForFullArgumentCoverage) reqArg.push(q.id);
      queries.push({
        id: q.id,
        level: q.level,
        region: r.label,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        sentences: q.sourceSentenceIds,
        acceptanceCriteria: [...q.acceptanceCriteria, ...q.contradictionCriteria.map((c) => `모순 조건: ${c}`)],
      });
      qShapes.push({
        id: q.id,
        level: q.level,
        sentenceIds: q.sourceSentenceIds,
        propositionIds: q.propositionIds,
        relationEdgeIds: q.relationEdgeIds,
        criticalForRelation: q.criticalForRelation,
        requiredForFullArgumentCoverage: q.requiredForFullArgumentCoverage,
      });
    }
    policy.push({ id: r.regionId, label: r.label, scopeQueries: scopeQ, relationQueries: relQ, argumentQueries: argQ, criticalForRelation: critical, requiredForFullArgument: reqArg });
    shapes.push({ key: r.regionId, label: r.label, sentenceIds: r.sourceSentenceIds, propositionIds: r.propositionIds, relationEdgeIds: r.relationEdgeIds, queries: qShapes });
  }
  return { name, queries, policy, shapes };
}

function overlapCount(a: readonly string[], b: readonly string[]): number {
  const sb = new Set(b);
  let n = 0;
  for (const x of new Set(a)) if (sb.has(x)) n += 1;
  return n;
}

/** 세트의 모든 질의를 오라클 영역으로 span 겹침에 따라 재배치 (생성기 영역 분할과 무관하게 비교). */
export function rebucketToOracle(set: EvalSet, oracleShapes: readonly RegionShape[]): RegionPolicy[] {
  const buckets = new Map<string, { scope: string[]; rel: string[]; arg: string[]; crit: string[]; req: string[] }>();
  for (const os of oracleShapes) buckets.set(os.key, { scope: [], rel: [], arg: [], crit: [], req: [] });
  for (const r of set.shapes)
    for (const q of r.queries) {
      let bestKey: string | null = null;
      let bestScore = 0;
      for (const os of oracleShapes) {
        const s = overlapCount(q.sentenceIds, os.sentenceIds) * 2 + overlapCount(q.propositionIds, os.propositionIds);
        if (s > bestScore) {
          bestScore = s;
          bestKey = os.key;
        }
      }
      if (bestKey === null) continue;
      const b = buckets.get(bestKey)!;
      if (q.level === 'scope') b.scope.push(q.id);
      else if (q.level === 'relation') b.rel.push(q.id);
      else b.arg.push(q.id);
      if (q.criticalForRelation) b.crit.push(q.id);
      if (q.requiredForFullArgumentCoverage) b.req.push(q.id);
    }
  return oracleShapes.map((os) => {
    const b = buckets.get(os.key)!;
    return { id: os.key, label: os.label, scopeQueries: b.scope, relationQueries: b.rel, argumentQueries: b.arg, criticalForRelation: b.crit, requiredForFullArgument: b.req };
  });
}

export interface ContradictionCluster {
  readonly claim: string;
  readonly affectedQueryIds: string[];
  readonly affectedRegions: string[];
}

/** viaItem별로 contradicted 질의를 묶는다 (동일 주장 중복 벌점 방지). 영역은 오라클 키로 매핑. */
export function clusterContradictions(
  verdicts: readonly { queryId: string; semanticState: string; evidence: string; viaItem: string }[],
  set: EvalSet,
  oracleShapes: readonly RegionShape[],
): ContradictionCluster[] {
  const rebucket = rebucketToOracle(set, oracleShapes);
  const regionOfQuery = new Map<string, string>();
  for (const rp of rebucket)
    for (const id of [...rp.scopeQueries, ...rp.relationQueries, ...rp.argumentQueries]) regionOfQuery.set(id, rp.id);
  const byItem = new Map<string, { claim: string; qids: string[]; regions: Set<string> }>();
  for (const v of verdicts) {
    if (v.semanticState !== 'contradicted') continue;
    const key = v.viaItem || v.evidence || v.queryId;
    const e = byItem.get(key) ?? { claim: v.viaItem || v.evidence, qids: [], regions: new Set() };
    e.qids.push(v.queryId);
    const rk = regionOfQuery.get(v.queryId);
    if (rk !== undefined) e.regions.add(rk);
    byItem.set(key, e);
  }
  return [...byItem.values()].map((e) => ({ claim: e.claim, affectedQueryIds: e.qids, affectedRegions: [...e.regions] }));
}
