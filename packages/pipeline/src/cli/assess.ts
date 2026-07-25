/**
 * 확정된 최소 평가 구조 — 3문단 회귀.
 *
 *   npm run assess
 *
 * 핵심축 regionSemanticVerdict가 (a) 질의 분해 변화(오라클+생성 3세트 = 4종 분해)와
 * (b) 반복 실행에도 안정적인지, 특히 **topic_only/contradicted를 relation_preserved로
 * 과대평가하는 오류**가 없는지 점검한다. 명제 evidence·피드백은 설명형으로 함께 출력.
 * 실험 경로 전용 — production 미연결.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { type PreservationQuery, type QueryEval, evaluateQueries } from '../llm/query-eval.js';
import {
  type AssessQuery,
  type AssessRegionMeta,
  type QueryVerdict,
  assess,
  overallCategory,
} from '../assessment.js';
import {
  type EvalSet,
  type Gold,
  type OracleFixture,
  buildGeneratorInput,
  generatedEvalSet,
  oracleEvalSet,
  paragraphText,
  rebucketToOracle,
} from '../query-gen-lib.js';
import { type RawQueryVerdict, type RegionSemanticVerdict, normalizeQueryStates } from '../query-normalize.js';
import { type GeneratedQuerySet, generateQuerySet } from '../llm/query-gen.js';

const GEN_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');
const ORACLE_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/query-oracles');

interface Probe {
  readonly id: string;
  readonly text: string;
  readonly expectFocal: RegionSemanticVerdict;
}
interface Config {
  readonly name: string;
  readonly gold: string;
  readonly oracle: string;
  readonly genPrefix: string;
  readonly focal: string;
  readonly probes: readonly Probe[];
}

const CONFIGS: readonly Config[] = [
  {
    name: '법인(역할 분리)',
    gold: '.omc/agreement/s1_p1.gold-1.json',
    oracle: 'packages/pipeline/fixtures/queries-corporate-law-p0.json',
    genPrefix: 'corporate-law',
    focal: 'asset_operation',
    probes: [
      { id: 'A(관계보존)', expectFocal: 'relation_preserved', text: '법인의 정의와 종류\n자산의 법인 귀속과 권한자의 실제 운용\n위법 운용에 대한 제재와 공동체 질서 유지' },
      { id: 'B(주제만)', expectFocal: 'topic_only', text: '법인의 정의와 종류\n법인의 자산 운용\n법적 통제의 목적' },
      { id: 'D(관계오류)', expectFocal: 'contradicted', text: '영리성에 따라 재단법인과 사단법인으로 나뉨\n출자자가 법인의 자산을 소유함\n법인이 직접 자산을 운용함' },
      { id: 'E3(경계)', expectFocal: 'topic_only', text: '법인의 정의와 종류\n법인의 자산 소유와 운영 주체\n법적 통제의 목적' },
    ],
  },
  {
    name: '과학(인과·트레이드오프)',
    gold: '.omc/agreement/69bffacbfa5063deffe19cc6_s1_p5.gold-1.json',
    oracle: 'science-p5-hand.json',
    genPrefix: 'science-p5',
    focal: 'nickel',
    probes: [
      { id: 'A(관계보존)', expectFocal: 'relation_preserved', text: '리튬 코발트 산화물의 한계로 NCM이 제안됐고, 니켈을 늘리면 용량과 사용 시간은 늘지만 수명이 줄고, 망가니즈를 늘리면 안정성은 오르지만 용량이 준다' },
      { id: 'B(주제만)', expectFocal: 'topic_only', text: 'NCM계 산화물의 함량비와 전지 성능' },
      { id: 'D(관계오류)', expectFocal: 'contradicted', text: '니켈을 늘리면 수명이 늘어나고, 망가니즈를 늘리면 용량이 늘어난다' },
      { id: 'Bd1(경계)', expectFocal: 'topic_only', text: '니켈 함량비와 전지 용량·수명' },
    ],
  },
  {
    name: '인문(주장·근거)',
    gold: '.omc/agreement/69c011fd78128b2a9beddd5e_s1_p4.gold-1.json',
    oracle: 'humanities-p4-hand.json',
    genPrefix: 'humanities-p4',
    focal: 'real_to_names',
    probes: [
      { id: 'A(관계보존)', expectFocal: 'relation_preserved', text: '후기 묵가는 하나의 실이 여러 명으로, 하나의 명이 여러 실로 지시될 수 있다고 보고 흰 말과 학을 예로 들었으며, 흰 말은 말이라고 주장했다' },
      { id: 'B(주제만)', expectFocal: 'topic_only', text: '후기 묵가의 명과 실에 대한 견해' },
      { id: 'D(관계오류)', expectFocal: 'contradicted', text: '후기 묵가는 흰 말은 말이 아니라고 보았고, 하나의 실은 오직 하나의 명으로만 지시된다고 주장했다' },
      { id: 'Bd1(경계)', expectFocal: 'topic_only', text: '하나의 실과 여러 명, 흰 말과 검은 말' },
    ],
  },
];

// ── 미사용 지문 (새 관계 구조) — v0 그대로 적용 ──
const NEW_CONFIGS: readonly Config[] = [
  {
    name: '공시(조건·예외+절차)',
    gold: '.omc/agreement/s1_p3.gold-1.json',
    oracle: 'disclosure-p3-hand.json',
    genPrefix: 'disclosure-p3',
    focal: 'obligation',
    probes: [
      { id: '관계보존', expectFocal: 'relation_preserved', text: '공시 의무는 발행·유통 두 시장에서 발생하며, 발행 시장에서 공모하면 증권 신고서로 공시를 이행하지만 사모로 발행하면 면제된다; 신고서가 심사를 통과해 증권이 발행되면 청약이 이루어진다' },
      { id: '주제만', expectFocal: 'topic_only', text: '상장 법인의 공시 의무와 증권 발행' },
      { id: '공허', expectFocal: 'region_not_evidenced', text: '법인의 의무\n시장 제도\n증권 관련 규정' },
      { id: '관계오류', expectFocal: 'contradicted', text: '사모로 발행하면 공시 의무를 이행하고, 공모로 발행하면 공시 의무가 면제된다' },
      { id: '암묵적', expectFocal: 'relation_preserved', text: '공모는 증권 신고서 제출, 사모는 신고서 제출 불요' },
      { id: '구체적', expectFocal: 'relation_preserved', text: '발행 시장에서 공모할 때 상장 법인은 증권 신고서로 공모 수량·가격과 사업 내용·대주주 사항을 공개해 공시 의무를 이행하고, 사모로 발행하면 면제된다' },
    ],
  },
  {
    name: '광합성(문제-해결+과정)',
    gold: '.omc/agreement/s1_p4.gold-1.json',
    oracle: 'photosynthesis-p4-hand.json',
    genPrefix: 'photosynthesis-p4',
    focal: 'c4_solution',
    probes: [
      { id: '관계보존', expectFocal: 'relation_preserved', text: 'C3 식물은 기온이 높거나 건조할 때 광합성 효율이 떨어지는 한계가 있어, 고온에서도 잘 자라는 C4 식물에 대한 연구가 활발하다' },
      { id: '주제만', expectFocal: 'topic_only', text: 'C3 식물과 C4 식물' },
      { id: '공허', expectFocal: 'region_not_evidenced', text: '식물의 특성\n광합성 연구\n작물 문제' },
      { id: '관계오류', expectFocal: 'contradicted', text: 'C4 식물이 고온에 약한 한계가 있어서 C3 식물에 대한 연구가 활발하다' },
      { id: '암묵적', expectFocal: 'relation_preserved', text: '고온에 취약한 C3, 고온에서도 잘 자라는 C4 연구' },
      { id: '구체적', expectFocal: 'relation_preserved', text: 'C3는 고온·건조 시 기공을 닫아 포도당 생산이 줄어 생장이 저하되는 한계가 있어, 이를 극복하려 고온에 잘 견디는 C4 식물 연구가 진행된다' },
    ],
  },
];
/** 이번 실행: 미사용 지문만 (기존 3문단은 이미 검증됨). CONFIGS는 회귀 회복용으로 보존. */
const ACTIVE: readonly Config[] = NEW_CONFIGS;
void CONFIGS;

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/**
 * query-eval 결과를 (문단·프로브·질의셋) 해시로 캐시한다. 입력이 고정 fixture이므로
 * 재실행이 완료된 콜을 다시 쓰지 않는다 — 네트워크 중단 시 재개용. .omc/state는 gitignore.
 */
const CACHE_DIR = resolve(process.cwd(), '.omc/state/assess-cache');
async function cachedEval(paraText: string, queries: readonly PreservationQuery[], probeText: string, paraId: string): Promise<QueryEval> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = createHash('sha256').update(`${paraId} ${probeText} ${JSON.stringify(queries)}`).digest('hex').slice(0, 32);
  const path = resolve(CACHE_DIR, `${key}.json`);
  if (existsSync(path)) return readJson<QueryEval>(path);
  // 구조화 출력 파싱 실패(스키마 비순응)는 instrumented 재시도 밖에서 던져지므로 여기서 재시도.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await evaluateQueries(paraText, queries, probeText, paraId);
      writeFileSync(path, JSON.stringify(result), 'utf8');
      return result;
    } catch (err) {
      lastErr = err;
      if (!(err instanceof Error && err.message.includes('구조화 출력 파싱 실패'))) throw err;
      console.error(`  ↻ 파싱 실패 재시도 ${attempt + 1}/3`);
    }
  }
  throw lastErr;
}

/** functionalPolicy(오라클 재버킷팅) + shapes + queries → assess 입력 질의 목록. */
function assessQueries(set: EvalSet): AssessQuery[] {
  const shapeById = new Map(set.shapes.flatMap((r) => r.queries).map((q) => [q.id, q]));
  const pqById = new Map(set.queries.map((q) => [q.id, q]));
  const out: AssessQuery[] = [];
  for (const rp of set.functionalPolicy ?? set.policy) {
    const add = (id: string, level: 'scope' | 'relation' | 'argument') => {
      const sh = shapeById.get(id);
      out.push({
        id,
        regionId: rp.id,
        level,
        propositionIds: sh?.propositionIds ?? [],
        expectedAnswer: pqById.get(id)?.expectedAnswer ?? '',
        critical: rp.criticalForRelation.includes(id),
      });
    };
    rp.scopeQueries.forEach((id) => add(id, 'scope'));
    rp.relationQueries.forEach((id) => add(id, 'relation'));
    rp.argumentQueries.forEach((id) => add(id, 'argument'));
  }
  return out;
}

function loadSet(name: string, gen: GeneratedQuerySet, oracleShapes: EvalSet['shapes']): EvalSet {
  const es = generatedEvalSet(name, gen);
  es.functionalPolicy = rebucketToOracle(es, oracleShapes);
  return es;
}

const VSHORT: Record<RegionSemanticVerdict, string> = {
  relation_preserved: '관계보존', topic_only: '주제만', partial_relation_preservation: '부분관계',
  contradicted: '모순', region_not_evidenced: '미포착',
};

async function runOne(set: EvalSet, cfg: Config, probe: Probe, paraText: string, paraId: string, regionMeta: AssessRegionMeta[], propShort: Map<string, string>) {
  const qeval = await cachedEval(paraText, set.queries, probe.text, paraId);
  const rawMap = new Map(qeval.verdicts.map((v) => [v.queryId, v as RawQueryVerdict]));
  const regions = normalizeQueryStates(rawMap, set.functionalPolicy ?? set.policy);
  const verdicts = new Map<string, QueryVerdict>(
    qeval.verdicts.map((v) => [v.queryId, { semanticState: v.semanticState, expressionMode: v.expressionMode, evidence: v.evidence, viaItem: v.viaItem }]),
  );
  const assessments = assess(regions, regionMeta, assessQueries(set), verdicts, propShort);
  const focalVerdict = regions.find((r) => r.id === cfg.focal)?.regionSemanticVerdict ?? 'region_not_evidenced';
  return { focalVerdict, category: overallCategory(regions, cfg.focal), assessments };
}

async function main(): Promise<void> {
  console.log('v0 일반화 — 미사용 지문 회귀 (핵심축=regionSemanticVerdict, 분해 4종)\n');
  let overcredit = 0;
  let unstable = 0;
  const feedbackSamples: string[] = [];

  for (const cfg of ACTIVE) {
    console.log(`${'━'.repeat(76)}\n${cfg.name}  (focal=${cfg.focal})`);
    const gold = readJson<Gold>(resolve(process.cwd(), cfg.gold));
    const oracleFx = readJson<OracleFixture>(cfg.oracle.startsWith('packages/') ? resolve(process.cwd(), cfg.oracle) : resolve(ORACLE_DIR, cfg.oracle));
    const paraText = paragraphText(gold);
    const propShort = new Map(gold.propositions.map((p) => [p.id, p.shortForm]));

    const oracle = oracleEvalSet(oracleFx);
    oracle.functionalPolicy = rebucketToOracle(oracle, oracle.shapes);
    const regionMeta: AssessRegionMeta[] = oracle.shapes.map((s) => ({ id: s.key, label: s.label, propositionIds: s.propositionIds }));

    const sets: EvalSet[] = [oracle];
    const genInput = buildGeneratorInput(gold);
    for (let i = 1; i <= 3; i++) {
      const p = resolve(GEN_DIR, `${cfg.genPrefix}-run${i}.json`);
      let fx: GeneratedQuerySet;
      if (existsSync(p)) fx = readJson<GeneratedQuerySet>(p);
      else {
        console.log(`  생성 run${i} (fixture 없음, v0 생성)…`);
        fx = await generateQuerySet(genInput);
        writeFileSync(p, JSON.stringify({ _meta: { kind: 'generated', run: i, generatorVersion: 'v0', schemaVersion: 'query-3axis-v1', model: 'claude-opus-4-8', generatedAt: new Date().toISOString(), note: '실험용' }, ...fx }, null, 2), 'utf8');
      }
      sets.push(loadSet(`gen${i}`, fx, oracle.shapes));
    }

    for (const probe of cfg.probes) {
      const results = [];
      for (const set of sets) results.push(await runOne(set, cfg, probe, paraText, gold.paragraphId, regionMeta, propShort));
      const verdicts = results.map((r) => r.focalVerdict);
      const unanimous = new Set(verdicts).size === 1;
      if (!unanimous) unstable++;
      // 과대평가 점검: topic_only/contradicted/미포착 기대인데 relation_preserved로 나온 세트
      const oc = (probe.expectFocal === 'topic_only' || probe.expectFocal === 'contradicted' || probe.expectFocal === 'region_not_evidenced') && verdicts.some((v) => v === 'relation_preserved');
      if (oc) overcredit++;
      console.log(`\n  [${probe.id}] 기대 focal=${VSHORT[probe.expectFocal]}`);
      console.log(`     focal 판정 (오라클|gen1|gen2|gen3): ${verdicts.map((v) => VSHORT[v]).join(' | ')}  ${unanimous ? '✓안정' : '⚠분해변이'}${oc ? '  ✗과대평가!' : ''}`);
      // 피드백 예시: 오라클 세트의 focal 영역
      const focalAssess = results[0]!.assessments.find((a) => a.regionId === cfg.focal);
      if (focalAssess && ['관계보존', '주제만', '관계오류', '암묵적'].some((k) => probe.id.includes(k))) {
        feedbackSamples.push(`[${cfg.name} · ${probe.id}] "${probe.text.split('\n').slice(0, 2).join(' / ')}…"\n    판정: ${VSHORT[focalAssess.verdict]}\n    피드백: ${focalAssess.feedback}\n    명제 evidence: ${focalAssess.propositionEvidence.map((e) => `${e.propositionId}:${e.state}`).join(' ')}`);
      }
    }
  }

  console.log(`\n${'═'.repeat(76)}\n요약`);
  console.log(`  과대평가 오류(topic_only/contradicted→relation_preserved): ${overcredit}건`);
  console.log(`  분해 4종 간 focal 판정 불안정: ${unstable}/${ACTIVE.reduce((n, c) => n + c.probes.length, 0)} 프로브`);
  console.log(`\n── 학생 피드백 예시 ──`);
  for (const s of feedbackSamples) console.log(`\n  ${s}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
