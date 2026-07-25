/**
 * 자동 질의 생성 v0 — 관계 유형 일반화 실험 (과학·인문 문단).
 *
 *   npm run qgen:general
 *
 * 질문: v0 생성기가 법인의 역할 분리를 넘어, 과학의 인과·트레이드오프와 인문의 주장–근거
 * 구조에서도 핵심 관계를 빠뜨리지 않고 동일 학생 응답에 같은 교육 판정·교정 대상을 내는가?
 * 1차 게이트는 표면 문장이 아니라 regionSemanticVerdict·모순대상·교정대상. 프롬프트는 동결(v0).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateQueries } from '../llm/query-eval.js';
import {
  EVAL_SCHEMA_VERSION,
  GENERATOR_VERSION,
  generateQuerySet,
} from '../llm/query-gen.js';
import {
  type CoreRelation,
  type RegionShape,
  alignQueries,
  alignRegionsToReference,
  coreRelationCovered,
} from '../query-align.js';
import {
  type EvalSet,
  type Gold,
  type OracleFixture,
  buildGeneratorInput,
  clusterContradictions,
  generatedEvalSet,
  oracleEvalSet,
  paragraphText,
  rebucketToOracle,
} from '../query-gen-lib.js';
import { type NormalizedRegion, type RawQueryVerdict, normalizeQueryStates } from '../query-normalize.js';

const GEN_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');
const ORACLE_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/query-oracles');
const RUNS = 3;

interface ProbeDef {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly expectCategory: string; // 인간 기대 교육 범주 (오라클 검증용)
  readonly expectFocalSem: string; // 인간 기대 focal region 의미 판정
}
interface ParaConfig {
  readonly name: string;
  readonly goldFile: string;
  readonly oracleFile: string;
  readonly genPrefix: string;
  readonly focalRegionId: string;
  readonly coreRelations: readonly CoreRelation[];
  readonly probes: readonly ProbeDef[];
}

// ── 과학 문단 설정 ──
const SCIENCE: ParaConfig = {
  name: '과학(NCM 산화물)',
  goldFile: '.omc/agreement/69bffacbfa5063deffe19cc6_s1_p5.gold-1.json',
  oracleFile: 'science-p5-hand.json',
  genPrefix: 'science-p5',
  focalRegionId: 'nickel',
  coreRelations: [
    { id: 'problem_solution', label: '문제→NCM 제안', propositionIds: ['p1', 'p3'] },
    { id: 'classification', label: '함량비 분류', propositionIds: ['p4', 'p5'] },
    { id: 'nickel_causal', label: '니켈↑→용량↑ 방향', propositionIds: ['p6', 'p7'] },
    { id: 'nickel_tradeoff', label: '니켈 용량↑vs수명↓', propositionIds: ['p6', 'p8'], relationEdgeIds: ['e1'] },
    { id: 'manganese_tradeoff', label: '망가니즈 안정성↑vs용량↓', propositionIds: ['p10', 'p11'], relationEdgeIds: ['e2'] },
  ],
  probes: [
    { id: 'A', label: '관계 보존 추상', expectCategory: '관계보존', expectFocalSem: 'relation_preserved',
      text: '리튬 코발트 산화물의 한계로 NCM이 제안됐고, 니켈을 늘리면 용량과 사용 시간은 늘지만 수명이 줄고, 망가니즈를 늘리면 안정성은 오르지만 용량이 준다' },
    { id: 'B', label: '주제만 포착', expectCategory: '주제만', expectFocalSem: 'topic_only',
      text: 'NCM계 산화물의 함량비와 전지 성능' },
    { id: 'C', label: '공허한 표현', expectCategory: '공허', expectFocalSem: 'region_not_evidenced',
      text: '물질의 특성\n전지의 성질\n재료의 구성 요소' },
    { id: 'D', label: '관계 오류', expectCategory: '관계오류', expectFocalSem: 'contradicted',
      text: '니켈을 늘리면 수명이 늘어나고, 망가니즈를 늘리면 용량이 늘어난다' },
    { id: 'Bd1', label: '경계: 병치·방향 미표현', expectCategory: '주제만', expectFocalSem: 'topic_only',
      text: '니켈 함량비와 전지 용량·수명' },
    { id: 'Bd2', label: '경계: 기제만·조건 생략', expectCategory: '부분', expectFocalSem: 'partial_relation_preservation',
      text: '니켈의 높은 반응성으로 기체가 발생해 구조가 무너진다' },
  ],
};

// ── 인문 문단 설정 ──
const HUMANITIES: ParaConfig = {
  name: '인문(후기 묵가 명실론)',
  goldFile: '.omc/agreement/69c011fd78128b2a9beddd5e_s1_p4.gold-1.json',
  oracleFile: 'humanities-p4-hand.json',
  genPrefix: 'humanities-p4',
  focalRegionId: 'real_to_names',
  coreRelations: [
    { id: 'claim_horse', label: '흰 말은 말이다', propositionIds: ['p1', 'p2'] },
    { id: 'real_to_names', label: '하나의 실→여러 명', propositionIds: ['p3'] },
    { id: 'support1', label: '사례(흰말)가 원리1 지지', propositionIds: ['p4', 'p5'], relationEdgeIds: ['d1'] },
    { id: 'name_to_reals', label: '하나의 명→여러 실', propositionIds: ['p6', 'p7'] },
    { id: 'support2', label: '사례(학)가 원리2 지지', propositionIds: ['p8'], relationEdgeIds: ['d2'] },
  ],
  probes: [
    { id: 'A', label: '관계 보존 추상', expectCategory: '관계보존', expectFocalSem: 'relation_preserved',
      text: '후기 묵가는 하나의 실이 여러 명으로, 하나의 명이 여러 실로 지시될 수 있다고 보고 흰 말과 학을 예로 들었으며, 흰 말은 말이라고 주장했다' },
    { id: 'B', label: '주제만 포착', expectCategory: '주제만', expectFocalSem: 'topic_only',
      text: '후기 묵가의 명과 실에 대한 견해' },
    { id: 'C', label: '공허한 표현', expectCategory: '공허', expectFocalSem: 'region_not_evidenced',
      text: '묵가의 철학\n명실의 관계\n논리적 주장' },
    { id: 'D', label: '관계 오류', expectCategory: '관계오류', expectFocalSem: 'contradicted',
      text: '후기 묵가는 흰 말은 말이 아니라고 보았고, 하나의 실은 오직 하나의 명으로만 지시된다고 주장했다' },
    { id: 'Bd1', label: '경계: 병치·지지관계 미표현', expectCategory: '주제만', expectFocalSem: 'topic_only',
      text: '하나의 실과 여러 명, 흰 말과 검은 말' },
    { id: 'Bd2', label: '경계: 사례만·지지 주장 모호', expectCategory: '부분', expectFocalSem: 'partial_relation_preservation',
      text: '흰 말도 말이고 검은 말도 말이다' },
  ],
};

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

const SEV: Record<string, number> = {
  contradicted: 4,
  partial_relation_preservation: 2,
  topic_only: 1.5,
  region_not_evidenced: 1,
  relation_preserved: 0,
};

function category(regions: readonly NormalizedRegion[], focalId: string): string {
  if (regions.some((r) => r.regionSemanticVerdict === 'contradicted')) return '관계오류';
  if (regions.every((r) => r.regionSemanticVerdict === 'region_not_evidenced')) return '공허';
  const focal = regions.find((r) => r.id === focalId);
  const s = focal?.regionSemanticVerdict;
  if (s === 'relation_preserved') return '관계보존';
  if (s === 'topic_only') return '주제만';
  if (s === 'partial_relation_preservation') return '부분';
  return '기타';
}

function firstCorrection(regions: readonly NormalizedRegion[]): string {
  let best: { id: string; sev: number } | null = null;
  for (const r of regions) {
    const sev = SEV[r.regionSemanticVerdict] ?? 0;
    if (sev > 0 && (best === null || sev > best.sev)) best = { id: r.id, sev };
  }
  return best?.id ?? 'none';
}

interface ProbeResult {
  readonly regionSem: Map<string, string>;
  readonly focal: { sem: string; cov: string; expr: string } | null;
  readonly category: string;
  readonly contraRegions: string[];
  readonly firstCorrection: string;
  readonly clusters: number;
}

async function evalProbe(set: EvalSet, paraText: string, text: string, paraId: string, oracleShapes: readonly RegionShape[], focalId: string): Promise<ProbeResult> {
  const qeval = await evaluateQueries(paraText, set.queries, text, paraId);
  const rawMap = new Map(qeval.verdicts.map((v) => [v.queryId, v as RawQueryVerdict]));
  const regions = normalizeQueryStates(rawMap, set.functionalPolicy ?? set.policy);
  const regionSem = new Map(regions.map((r) => [r.id, r.regionSemanticVerdict]));
  const focal = regions.find((r) => r.id === focalId);
  const clusters = clusterContradictions(qeval.verdicts, set, oracleShapes);
  return {
    regionSem,
    focal: focal ? { sem: focal.regionSemanticVerdict, cov: focal.argumentCoverage, expr: focal.expressionProfile } : null,
    category: category(regions, focalId),
    contraRegions: regions.filter((r) => r.regionSemanticVerdict === 'contradicted').map((r) => r.id).sort(),
    firstCorrection: firstCorrection(regions),
    clusters: clusters.length,
  };
}

async function runParagraph(cfg: ParaConfig): Promise<void> {
  console.log(`\n${'█'.repeat(78)}\n█ ${cfg.name}  (생성기 ${GENERATOR_VERSION}, 스키마 ${EVAL_SCHEMA_VERSION})\n${'█'.repeat(78)}`);
  const gold = readJson<Gold>(resolve(process.cwd(), cfg.goldFile));
  const oracleFx = readJson<OracleFixture>(resolve(ORACLE_DIR, cfg.oracleFile));
  const input = buildGeneratorInput(gold);
  const paraText = paragraphText(gold);

  const oracle = oracleEvalSet(oracleFx);
  oracle.functionalPolicy = rebucketToOracle(oracle, oracle.shapes);
  console.log(`입력: 문장 ${input.sentences.length}·명제 ${input.propositions.length}·간선 ${input.relationEdges.length} | 주제 "${input.topic}"`);
  console.log(`오라클 영역 ${oracle.shapes.length}개: ${oracle.shapes.map((s) => s.key).join(', ')} | focal=${cfg.focalRegionId}`);

  // 1. 생성 ×3
  mkdirSync(GEN_DIR, { recursive: true });
  const genSets: EvalSet[] = [];
  for (let i = 1; i <= RUNS; i++) {
    const gen = await generateQuerySet(input);
    writeFileSync(
      resolve(GEN_DIR, `${cfg.genPrefix}-run${i}.json`),
      JSON.stringify({ _meta: { kind: 'generated', run: i, generatorVersion: GENERATOR_VERSION, schemaVersion: EVAL_SCHEMA_VERSION, model: 'claude-opus-4-8', generatedAt: new Date().toISOString(), note: '실험용. production 아님.' }, ...gen }, null, 2),
      'utf8',
    );
    const es = generatedEvalSet(`gen${i}`, gen);
    es.functionalPolicy = rebucketToOracle(es, oracle.shapes);
    genSets.push(es);
    console.log(`  생성 run${i}: 영역 ${gen.regions.length}·질의 ${gen.regions.reduce((n, r) => n + r.queries.length, 0)}`);
  }
  const allSets = [oracle, ...genSets];

  // 2. 구조적 재현성
  console.log('\n── 구조: 핵심 관계 커버리지 (매 실행 존재해야 함) ──');
  console.log(`  ${'관계'.padEnd(22)} ${allSets.map((s) => s.name.padEnd(7)).join('')}`);
  const missing: string[] = [];
  for (const cr of cfg.coreRelations) {
    const marks = allSets.map((s) => coreRelationCovered(cr, s.shapes.flatMap((r) => r.queries)).covered);
    marks.forEach((ok, i) => { if (!ok && i > 0) missing.push(`${cr.label}@gen${i}`); });
    console.log(`  ${cr.label.padEnd(22)} ${marks.map((m) => (m ? '✓' : '✗').padEnd(7)).join('')}`);
  }
  console.log('\n── 구조: 영역 정렬 + 층위 변이 ──');
  for (const gs of genSets) {
    const al = alignRegionsToReference(gs.shapes, oracle.shapes);
    let lv = 0, lt = 0;
    for (const a of al) {
      if (!a.matched) continue;
      const ref = oracle.shapes.find((s) => s.key === a.refKey)!;
      for (const p of alignQueries(ref.queries, a.matched.queries)) { if (p.b) { lt++; if (p.a.level === p.b.level) lv++; } }
    }
    const aligned = al.filter((a) => a.matched).length;
    console.log(`  ${gs.name}: 영역 ${gs.shapes.length}개, 오라클 ${aligned}/${oracle.shapes.length} 정렬, 층위일치 ${lv}/${lt}`);
  }

  // 3. 기능적 재현성
  console.log('\n── 기능: 프로브별 (오라클 vs 생성 3회) ──');
  let semCells = 0, semAgree = 0, catAgree = 0, contraAgree = 0, fcAgree = 0, probeN = 0;
  let oracleCatOk = 0;
  const argVar: string[] = [];
  for (const probe of cfg.probes) {
    const oRes = await evalProbe(oracle, paraText, probe.text, gold.paragraphId, oracle.shapes, cfg.focalRegionId);
    const gRes = await Promise.all(genSets.map((gs) => evalProbe(gs, paraText, probe.text, gold.paragraphId, oracle.shapes, cfg.focalRegionId)));
    probeN++;
    if (oRes.category === probe.expectCategory) oracleCatOk++;
    // regionSemanticVerdict 셀 일치 (전 오라클 영역 × 생성 3회)
    for (const key of oracle.shapes.map((s) => s.key))
      for (const g of gRes) { semCells++; if (oRes.regionSem.get(key) === g.regionSem.get(key)) semAgree++; }
    const catOk = gRes.every((g) => g.category === oRes.category);
    const contraOk = gRes.every((g) => g.contraRegions.join(',') === oRes.contraRegions.join(','));
    const fcOk = gRes.every((g) => g.firstCorrection === oRes.firstCorrection);
    if (catOk) catAgree++;
    if (contraOk) contraAgree++;
    if (fcOk) fcAgree++;
    const fstr = (r: ProbeResult) => (r.focal ? `${r.focal.sem}/${r.focal.cov}/${r.focal.expr}` : '—');
    console.log(`\n  [${probe.id}] ${probe.label}  (인간기대 범주=${probe.expectCategory}, focal=${probe.expectFocalSem})`);
    console.log(`     오라클: 범주=${oRes.category} focal=${fstr(oRes)} 모순영역=[${oRes.contraRegions.join(',')}] 교정=${oRes.firstCorrection}`);
    gRes.forEach((g, i) => console.log(`     gen${i + 1}:  범주=${g.category} focal=${fstr(g)} 모순영역=[${g.contraRegions.join(',')}] 교정=${g.firstCorrection}${g.category === oRes.category ? '' : '  ≠범주'}`));
  }

  // 4. argumentCoverage 변이 수집 (관계 유형별 패턴)
  console.log('\n── argumentCoverage 변이 (탐색 지표): focal 영역 논항 질의 분해 ──');
  for (const gs of genSets) {
    const fp = gs.functionalPolicy!.find((p) => p.id === cfg.focalRegionId);
    argVar.push(`${gs.name}: focal 논항질의 ${fp?.argumentQueries.length ?? 0}개, requiredForFull ${fp?.requiredForFullArgument.length ?? 0}개, 핵심관계질의 ${fp?.criticalForRelation.length ?? 0}개`);
  }
  for (const a of argVar) console.log(`  ${a}`);

  // 5. 요약
  console.log(`\n── ${cfg.name} 요약 ──`);
  console.log(`  오라클 자체 범주 일치(인간기대): ${oracleCatOk}/${probeN}`);
  console.log(`  regionSemanticVerdict 셀 일치: ${semAgree}/${semCells} (${pct(semAgree, semCells)})`);
  console.log(`  교육 범주 일치(생성 3회=오라클): ${catAgree}/${probeN} (${pct(catAgree, probeN)})`);
  console.log(`  모순 대상영역 일치: ${contraAgree}/${probeN} (${pct(contraAgree, probeN)})`);
  console.log(`  첫 교정 대상 일치: ${fcAgree}/${probeN} (${pct(fcAgree, probeN)})`);
  if (missing.length) console.log(`  ⚠ 핵심 관계 누락: ${missing.join(', ')}`);
  else console.log(`  ✓ 핵심 관계 누락 0`);
}

function pct(a: number, b: number): string {
  return b === 0 ? '—' : `${Math.round((100 * a) / b)}%`;
}

async function main(): Promise<void> {
  console.log(`자동 질의 생성 v0 일반화 실험 (과학·인문, 각 ${RUNS}회 생성)`);
  await runParagraph(SCIENCE);
  await runParagraph(HUMANITIES);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
