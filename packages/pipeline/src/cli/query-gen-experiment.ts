/**
 * 자동 질의 생성 재현성 실험.
 *
 *   npm run qgen
 *
 * 질문은 "생성 질의가 손 질의와 같은 문장을 쓰는가"가 아니라
 * "같은 의미 영역·핵심 관계에 앵커링되고, 동일 학생 응답에 같은 교육적 판정·피드백을 내는가"이다.
 *   - 구조적 재현성: 영역/핵심관계/층위/필수플래그 (원인 지표)
 *   - 기능적 재현성: 동일 응답 프로브의 정렬된 영역별 3축 판정 (최종 게이트)
 *
 * 손 질의 fixture는 오라클로만 쓰고 생성기 입력/few-shot으로 절대 쓰지 않는다.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadPassage } from '../adapter.js';
import { type PreservationQuery, evaluateQueries } from '../llm/query-eval.js';
import {
  type GeneratedQuerySet,
  type GeneratorInput,
  type GenProposition,
  type GenRelationEdge,
  generateQuerySet,
} from '../llm/query-gen.js';
import {
  type CoreRelation,
  type QueryShape,
  type RegionShape,
  alignQueries,
  alignRegionsToReference,
  coreRelationCovered,
} from '../query-align.js';
import {
  type ArgumentCoverage,
  type ExpressionProfile,
  type RawQueryVerdict,
  type RegionPolicy,
  type RegionSemanticVerdict,
  normalizeQueryStates,
} from '../query-normalize.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const GOLD = resolve(process.cwd(), '.omc/agreement/s1_p1.gold-1.json');
const ORACLE = resolve(process.cwd(), 'packages/pipeline/fixtures/queries-corporate-law-p0.json');
const GEN_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');
const SET_ID = '69bbf88d8937cf14551903ca';
const RUNS = 3;

// ── 골드 → 생성기 입력 (합성 노드 제외) ──
interface Gold {
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

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

function buildGeneratorInput(gold: Gold): { input: GeneratorInput; edges: GenRelationEdge[] } {
  const edges: GenRelationEdge[] = [
    ...gold.evaluationLinks.map((e, i) => mkEdge(e, `e${i + 1}`, 'eval')),
    ...gold.discourseLinks.map((e, i) => mkEdge(e, `d${i + 1}`, 'discourse')),
  ];
  const title = gold.nodes.find((n) => n.id === gold.titleId);
  const topic = title?.shortForm ?? title?.label ?? title?.text ?? '문단 주제';
  const input: GeneratorInput = {
    paragraphId: gold.paragraphId,
    topic,
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
  return { input, edges };
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

// ── 오라클 fixture → EvalSet ──
interface OracleQuery extends PreservationQuery {
  propositions?: string[];
  requiredForRelation?: boolean;
  requiredForFullArgumentCoverage?: boolean;
}
interface OracleFixture {
  queries: OracleQuery[];
  regionPolicy: Array<{ id: string; label: string; scopeQueries: string[]; relationQueries: string[]; argumentQueries: string[] }>;
}

interface EvalSet {
  readonly name: string;
  readonly queries: readonly PreservationQuery[];
  readonly policy: readonly RegionPolicy[];
  readonly shapes: readonly RegionShape[];
  /** 기능 비교용: 이 세트의 질의를 오라클 영역으로 span 재버킷팅한 정책 (1:1 정렬 아티팩트 제거). */
  functionalPolicy?: readonly RegionPolicy[];
}

function overlapCount(a: readonly string[], b: readonly string[]): number {
  const sb = new Set(b);
  let n = 0;
  for (const x of new Set(a)) if (sb.has(x)) n += 1;
  return n;
}

/**
 * 세트의 모든 질의를 오라클 영역으로 문장 span 겹침에 따라 재배치한다. 생성기가 자산 영역을
 * 여러 개로 나눴어도, 오라클의 coarse 영역 기준으로 3축을 평가할 수 있게 한다.
 */
function rebucketToOracle(set: EvalSet, oracleShapes: readonly RegionShape[]): RegionPolicy[] {
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
    return {
      id: os.key,
      label: os.label,
      scopeQueries: b.scope,
      relationQueries: b.rel,
      argumentQueries: b.arg,
      criticalForRelation: b.crit,
      requiredForFullArgument: b.req,
    };
  });
}

function oracleEvalSet(fx: OracleFixture): EvalSet {
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
      queries: qs.map((q) => oracleQueryShape(q, m)),
    };
  });
  return { name: 'oracle(손질의)', queries: fx.queries, policy, shapes };
}
function oracleQueryShape(q: OracleQuery, m: { scopeQueries: string[]; relationQueries: string[] }): QueryShape {
  const level = m.scopeQueries.includes(q.id) ? 'scope' : m.relationQueries.includes(q.id) ? 'relation' : 'argument';
  return {
    id: q.id,
    level,
    sentenceIds: q.sentences,
    propositionIds: q.propositions ?? [],
    relationEdgeIds: [],
    criticalForRelation: q.requiredForRelation === true,
    requiredForFullArgumentCoverage: q.requiredForFullArgumentCoverage === true,
  };
}

// ── 생성 세트 → EvalSet ──
function generatedEvalSet(name: string, gen: GeneratedQuerySet): EvalSet {
  const queries: PreservationQuery[] = [];
  const policy: RegionPolicy[] = [];
  const shapes: RegionShape[] = [];
  for (const r of gen.regions) {
    const scopeQ: string[] = [];
    const relQ: string[] = [];
    const argQ: string[] = [];
    const critical: string[] = [];
    const reqArg: string[] = [];
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
        acceptanceCriteria: [
          ...q.acceptanceCriteria,
          ...q.contradictionCriteria.map((c) => `모순 조건: ${c}`),
        ],
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
    policy.push({
      id: r.regionId,
      label: r.label,
      scopeQueries: scopeQ,
      relationQueries: relQ,
      argumentQueries: argQ,
      criticalForRelation: critical,
      requiredForFullArgument: reqArg,
    });
    shapes.push({
      key: r.regionId,
      label: r.label,
      sentenceIds: r.sourceSentenceIds,
      propositionIds: r.propositionIds,
      relationEdgeIds: r.relationEdgeIds,
      queries: qShapes,
    });
  }
  return { name, queries, policy, shapes };
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

// ── 법인 문단 핵심 관계 (item 6.2) ──
const CORE_RELATIONS: CoreRelation[] = [
  { id: 'definition', label: '법인의 정의', propositionIds: ['p1'] },
  { id: 'classification', label: '두 기준 유형 분류', propositionIds: ['p2', 'p3', 'p4', 'p5'] },
  { id: 'asset_attribution', label: '자산의 법인 귀속', propositionIds: ['p7'] },
  { id: 'role_separation', label: '법적주체↔실제운용 역할 분리', propositionIds: ['p6', 'p9'], relationEdgeIds: ['e1'] },
  { id: 'authority_condition', label: '운용자의 권한 조건', propositionIds: ['p8', 'p9'] },
  { id: 'violation_sanction', label: '위반→제재', propositionIds: ['p10'] },
  { id: 'control_purpose', label: '법적 통제의 목적', propositionIds: ['p11'] },
];

// ── 프로브 (기능 평가) ──
interface Probe {
  readonly id: string;
  readonly text: string;
  readonly expectAsset?: { sem: RegionSemanticVerdict; cov: ArgumentCoverage; expr: ExpressionProfile } | { semNot: RegionSemanticVerdict };
}
const PROBES: readonly Probe[] = [
  { id: 'A', text: '법인의 정의와 종류\n자산의 법인 귀속과 권한자의 실제 운용\n위법 운용에 대한 제재와 공동체 질서 유지' },
  { id: 'B', text: '법인의 정의와 종류\n법인의 자산 운용\n법적 통제의 목적', expectAsset: { sem: 'topic_only', cov: 'none', expr: 'none' } },
  { id: 'C', text: '법인의 성격\n법인의 특징\n법인 제도', expectAsset: { sem: 'region_not_evidenced', cov: 'none', expr: 'none' } },
  { id: 'D', text: '영리성에 따라 재단법인과 사단법인으로 나뉨\n출자자가 법인의 자산을 소유함\n법인이 직접 자산을 운용함', expectAsset: { sem: 'contradicted', cov: 'none', expr: 'none' } },
  { id: 'E2', text: '법인의 정의와 종류\n법인의 자산 소유와 사람의 운영\n법적 통제의 목적', expectAsset: { sem: 'relation_preserved', cov: 'partial', expr: 'implicit' } },
  { id: 'E3', text: '법인의 정의와 종류\n법인의 자산 소유와 운영 주체\n법적 통제의 목적', expectAsset: { semNot: 'relation_preserved' } },
  { id: 'F', text: '법인의 정의와 종류\n자산은 법인에 귀속되지만 실제 운용은 권한자가 담당한다\n법적 통제의 목적', expectAsset: { sem: 'relation_preserved', cov: 'full', expr: 'explicit' } },
  { id: 'G8', text: '법인이 직접 운영한다' },
];

interface AssetOut {
  sem: RegionSemanticVerdict;
  cov: ArgumentCoverage;
  expr: ExpressionProfile;
}

async function evalProbe(set: EvalSet, paraText: string, probe: Probe, paraId: string): Promise<{
  asset: AssetOut | null;
  clusters: ContradictionCluster[];
}> {
  const qeval = await evaluateQueries(paraText, set.queries, probe.text, paraId);
  const rawMap = new Map(qeval.verdicts.map((v) => [v.queryId, v as RawQueryVerdict]));
  // 오라클 영역으로 재버킷팅한 정책으로 정규화 → 생성기의 영역 분할과 무관하게 비교
  const regions = normalizeQueryStates(rawMap, set.functionalPolicy ?? set.policy);
  const rg = regions.find((r) => r.id === 'asset_operation');
  const asset: AssetOut | null = rg
    ? { sem: rg.regionSemanticVerdict, cov: rg.argumentCoverage, expr: rg.expressionProfile }
    : null;

  // 모순 cluster: viaItem별로 contradicted 질의를 묶는다 (동일 주장 중복 벌점 방지)
  const clusters = clusterContradictions(qeval.verdicts, set);
  return { asset, clusters };
}


interface ContradictionCluster {
  readonly claim: string;
  readonly affectedQueryIds: string[];
  readonly affectedPropositionIds: string[];
  readonly primaryCorrectionTarget: string;
}

function clusterContradictions(
  verdicts: readonly { queryId: string; semanticState: string; evidence: string; viaItem: string }[],
  set: EvalSet,
): ContradictionCluster[] {
  const propOf = new Map<string, string[]>();
  const regionOf = new Map<string, string>();
  for (const r of set.shapes) for (const q of r.queries) {
    propOf.set(q.id, [...q.propositionIds]);
    regionOf.set(q.id, r.label);
  }
  const byItem = new Map<string, { claim: string; qids: string[]; props: Set<string>; region: string }>();
  for (const v of verdicts) {
    if (v.semanticState !== 'contradicted') continue;
    const key = v.viaItem || v.evidence || v.queryId;
    const e = byItem.get(key) ?? { claim: v.viaItem || v.evidence, qids: [], props: new Set(), region: regionOf.get(v.queryId) ?? '' };
    e.qids.push(v.queryId);
    for (const p of propOf.get(v.queryId) ?? []) e.props.add(p);
    byItem.set(key, e);
  }
  return [...byItem.values()].map((e) => ({
    claim: e.claim,
    affectedQueryIds: e.qids,
    affectedPropositionIds: [...e.props],
    primaryCorrectionTarget: e.region,
  }));
}

function axisStr(a: AssetOut | null): string {
  return a === null ? '—' : `${a.sem}/${a.cov}/${a.expr}`;
}
function assetMatch(a: AssetOut | null, exp: Probe['expectAsset']): boolean {
  if (exp === undefined || a === null) return a !== null;
  if ('semNot' in exp) return a.sem !== exp.semNot;
  return a.sem === exp.sem && a.cov === exp.cov && a.expr === exp.expr;
}

async function main(): Promise<void> {
  const gold = readJson<Gold>(GOLD);
  const oracleFx = readJson<OracleFixture>(ORACLE);
  const paragraph = loadPassage(DATASET, SET_ID).sections[0]!.paragraphs[0]!;
  const { input } = buildGeneratorInput(gold);

  const oracle = oracleEvalSet(oracleFx);
  oracle.functionalPolicy = rebucketToOracle(oracle, oracle.shapes);

  console.log(`자동 질의 생성 재현성 실험 (법인 문단, ${RUNS}회 생성)\n`);
  console.log(`생성기 입력: 문장 ${input.sentences.length} · 명제 ${input.propositions.length} · 관계간선 ${input.relationEdges.length} · 주제 "${input.topic}"`);
  console.log('합성 노드(c5/c6/c7) 미입력. 손 질의 오라클 미입력.\n');

  // ── 1. 생성 ×3 ──
  mkdirSync(GEN_DIR, { recursive: true });
  const genSets: EvalSet[] = [];
  for (let i = 1; i <= RUNS; i++) {
    const gen = await generateQuerySet(input);
    const out = {
      _meta: { kind: 'generated', run: i, model: 'claude-opus-4-8', generatedAt: new Date().toISOString(), note: '실험용. production gold 아님. 손 질의 오라클과 별개.' },
      ...gen,
    };
    writeFileSync(resolve(GEN_DIR, `corporate-law-run${i}.json`), JSON.stringify(out, null, 2), 'utf8');
    const es = generatedEvalSet(`gen-run${i}`, gen);
    es.functionalPolicy = rebucketToOracle(es, oracle.shapes);
    genSets.push(es);
    console.log(`생성 run${i}: 영역 ${gen.regions.length}개, 질의 ${gen.regions.reduce((n, r) => n + r.queries.length, 0)}개  → 저장`);
  }

  // ── 2. 구조적 재현성 ──
  console.log(`\n${'═'.repeat(78)}\n구조적 재현성`);
  console.log('\n2.1 의미 영역 (오라클 4영역에 정렬, 문장Jaccard·명제Jaccard)');
  for (const gs of genSets) {
    const al = alignRegionsToReference(gs.shapes, oracle.shapes);
    console.log(`  ${gs.name} (영역 ${gs.shapes.length}개):`);
    for (const a of al) {
      const m = a.matched;
      const ref = oracle.shapes.find((s) => s.key === a.refKey)!;
      const sj = m ? jac(ref.sentenceIds, m.sentenceIds) : 0;
      const pj = m ? jac(ref.propositionIds, m.propositionIds) : 0;
      console.log(`     ${a.refKey.padEnd(16)} ← ${(m?.label ?? '(없음)').padEnd(18)} 문장J=${sj.toFixed(2)} 명제J=${pj.toFixed(2)}`);
    }
  }

  console.log('\n2.2 핵심 관계 커버리지 (매 실행에 존재해야 함)');
  const allSets = [oracle, ...genSets];
  console.log(`  ${'관계'.padEnd(24)} ${allSets.map((s) => s.name.slice(0, 9).padEnd(10)).join('')}`);
  for (const cr of CORE_RELATIONS) {
    const marks = allSets.map((s) => {
      const qs = s.shapes.flatMap((r) => r.queries);
      return (coreRelationCovered(cr, qs).covered ? '✓' : '✗').padEnd(10);
    });
    console.log(`  ${cr.label.padEnd(24)} ${marks.join('')}`);
  }

  console.log('\n2.3 층위·필수플래그 재현성 (오라클 정렬 질의 대비)');
  for (const gs of genSets) {
    const regAlign = alignRegionsToReference(gs.shapes, oracle.shapes);
    let levelSame = 0, levelTot = 0, critSame = 0, reqSame = 0, flagTot = 0;
    for (const a of regAlign) {
      if (a.matched === null) continue;
      const ref = oracle.shapes.find((s) => s.key === a.refKey)!;
      for (const pair of alignQueries(ref.queries, a.matched.queries)) {
        if (pair.b === null) continue;
        levelTot += 1; flagTot += 1;
        if (pair.a.level === pair.b.level) levelSame += 1;
        if (pair.a.criticalForRelation === pair.b.criticalForRelation) critSame += 1;
        if (pair.a.requiredForFullArgumentCoverage === pair.b.requiredForFullArgumentCoverage) reqSame += 1;
      }
    }
    console.log(`  ${gs.name}: 층위일치 ${levelSame}/${levelTot} · critical일치 ${critSame}/${flagTot} · reqArg일치 ${reqSame}/${flagTot}`);
  }

  // ── 3. 기능적 재현성 ──
  console.log(`\n${'═'.repeat(78)}\n기능적 재현성 — 프로브별 자산 운용 영역 3축 (오라클 vs 생성 3회)`);
  const clusterLog: string[] = [];
  const funcRows: { probe: string; oracle: string; gens: string[]; agree: boolean }[] = [];
  for (const probe of PROBES) {
    const oRes = await evalProbe(oracle, paragraph.text, probe, paragraph.id);
    const gRes = await Promise.all(genSets.map((gs) => evalProbe(gs, paragraph.text, probe, paragraph.id)));
    const oStr = axisStr(oRes.asset);
    const gStrs = gRes.map((r) => axisStr(r.asset));
    // 기능 일치: 생성 3회가 오라클과 같은 자산 판정(축 전부)
    const agree = gStrs.every((s) => s === oStr);
    funcRows.push({ probe: probe.id, oracle: oStr, gens: gStrs, agree });
    console.log(`\n  [${probe.id}] 오라클: ${oStr}`);
    genSets.forEach((gs, i) => console.log(`        ${gs.name}: ${gStrs[i]}${gStrs[i] === oStr ? '' : '  ≠'}`));
    if (probe.expectAsset !== undefined) {
      const ok = [oRes, ...gRes].every((r) => assetMatch(r.asset, probe.expectAsset));
      console.log(`        기대 경계 충족(전 세트): ${ok ? '예' : '아니오'}`);
    }
    // 모순 cluster (D, G8)
    if (probe.id === 'D' || probe.id === 'G8') {
      for (const c of oRes.clusters) {
        clusterLog.push(`[${probe.id}] claim="${c.claim}" → 질의 ${c.affectedQueryIds.length}개(${c.affectedQueryIds.join(',')}) 명제[${c.affectedPropositionIds.join(',')}] 영역=${c.primaryCorrectionTarget}`);
      }
    }
  }

  // ── 4. 요약 ──
  console.log(`\n${'═'.repeat(78)}\n기능적 성공 기준 (핵심 구분이 생성 3회 = 오라클)`);
  for (const r of funcRows) console.log(`  ${r.probe.padEnd(4)} ${r.agree ? '일치 ✓' : '불일치 ✗'}   오라클=${r.oracle}  생성=[${r.gens.join(' | ')}]`);
  const agreeN = funcRows.filter((r) => r.agree).length;
  console.log(`\n  기능 일치: ${agreeN}/${funcRows.length}`);

  console.log('\n모순 cluster (동일 주장 → 하나로 묶어 중복 벌점 방지)');
  if (clusterLog.length === 0) console.log('  (없음)');
  else for (const c of clusterLog) console.log(`  ${c}`);
}

function jac(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a), sb = new Set(b);
  let i = 0;
  for (const x of sa) if (sb.has(x)) i += 1;
  return sa.size + sb.size - i === 0 ? 1 : i / (sa.size + sb.size - i);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
