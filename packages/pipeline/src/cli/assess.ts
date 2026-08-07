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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { MODEL } from '../llm/client.js';
import { EVAL_REQUEST_FINGERPRINT, type PreservationQuery, type QueryEval, evaluateQueries } from '../llm/query-eval.js';
import {
  type AssessQuery,
  type AssessRegionMeta,
  type QueryVerdict,
  assess,
  overallCategory,
} from '../assessment.js';
import { evalCacheKey } from '../eval-cache-key.js';
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
import { EVAL_SCHEMA_VERSION, GENERATOR_VERSION, type GeneratedQuerySet, generateQuerySet } from '../llm/query-gen.js';

const GEN_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');
const ORACLE_DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/query-oracles');

/**
 * 생성 fixture 경로. **버전마다 다른 파일에 쓴다** — 프롬프트를 고친 뒤 같은 경로에 쓰면
 * 기존 fixture가 있어 재생성이 일어나지 않거나(캐시 히트), 덮어써서 기준선이 사라진다.
 * v0 fixture는 버전 태그 없는 이름으로 이미 동결돼 있으므로 그 이름을 유지한다.
 */
function genFixturePath(prefix: string, run: number): string {
  const tag = GENERATOR_VERSION === 'v0' ? '' : `-${GENERATOR_VERSION}`;
  return resolve(GEN_DIR, `${prefix}${tag}-run${run}.json`);
}

interface Probe {
  readonly id: string;
  readonly text: string;
  readonly expectFocal: RegionSemanticVerdict;
  /** 이 프로브만 다른 영역을 focal로 본다. 같은 문단 안 대조군(선형 인과) 검사용. */
  readonly focal?: string;
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
// ── N2 실험: 관계 하위 유형별 압축 허용도 ──
//
// 가설(2026-07-27 학생 루프 교차검증): 과정형 관계는 하위 유형마다 중간 생략 허용도가 다르다.
//   선형 인과 연쇄 → 양 끝이 방향대로 이어지면 관계보존 (중간 생략 OK)
//   순환(되먹임)   → 되먹임 간선이 관계 자체이므로 생략 시 부분관계
//   공간 분업      → 두 항의 병치가 관계 자체이므로 한쪽만이면 부분관계
// v0 생성기 프롬프트(원칙 A~F)에는 이 구분이 없다. 생성기가 순환·분업에도 선형 연쇄식
// 수용 기준을 쓰면 "중간 생략" 응답을 관계보존으로 **과대평가**한다.
//
// 검사 방법: 순환·분업 영역의 핵심 관계를 두 축(진행/되먹임, 앞 공간/뒤 공간)으로 나눈 손
// 오라클을 동결하고, 한 축만 보존한 프로브를 넣는다. 오라클은 partial을 내야 하고, 생성기가
// relation_preserved를 내면 위험이 실증된다. 같은 문단의 선형 인과 영역을 대조군으로 둔다.
const N2_CONFIGS: readonly Config[] = [
  {
    name: '광합성 P3(캘빈 회로 = 순환)',
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p3.gold-1.json',
    oracle: 'photosynthesis-p3-hand.json',
    genPrefix: 'photosynthesis-p3',
    focal: 'calvin_cycle',
    probes: [
      {
        id: '관계보존',
        expectFocal: 'relation_preserved',
        text: '암반응은 명반응이 만든 화학 에너지와 흡수한 이산화 탄소로 포도당을 만드는 단계다\n이산화 탄소가 RuBP와 결합해 3탄당이 되고 3탄당이 포도당이 되며, 쓰고 남은 화합물은 다시 RuBP로 돌아가 이산화 탄소와 결합하는 과정이 되풀이된다\n이렇게 광합성하는 대부분의 식물을 C3 식물이라 한다',
      },
      { id: '주제만', expectFocal: 'topic_only', text: '암반응과 캘빈 회로\nC3 식물' },
      { id: '공허', expectFocal: 'region_not_evidenced', text: '식물의 내부 작용\n여러 가지 화학 반응\n식물의 분류' },
      {
        // ★ N2 핵심: 순환의 진행 축만 보존하고 되먹임을 생략 → 오라클 기대 = 부분관계
        id: '순환중간생략',
        expectFocal: 'partial_relation_preservation',
        text: '암반응에서는 이산화 탄소를 이용해 포도당이 만들어지고, 이 과정이 계속 반복된다',
      },
      {
        id: '관계오류',
        expectFocal: 'contradicted',
        text: '암반응에서는 3탄당이 분해되어 이산화 탄소와 RuBP가 되고, 포도당이 RuBP로 재생되어 순환이 이어진다',
      },
      {
        id: '구체적',
        expectFocal: 'relation_preserved',
        text: '대기에서 흡수한 이산화 탄소가 루비스코의 촉진으로 RuBP와 결합해 탄소 3개짜리 3탄당을 만들고, 3탄당은 화학적 변환을 거쳐 포도당이 되며, 포도당 생성에 쓰이고 남은 화합물은 RuBP로 재생되어 다시 이산화 탄소와 결합한다',
      },
      {
        // ★ 대조군: 같은 문단의 선형 인과 영역에서 중간(결합 비율) 생략 → 기대 = 관계보존
        id: '대조군-선형중간생략',
        expectFocal: 'relation_preserved',
        focal: 'cycle_condition',
        text: '캘빈 회로는 이산화 탄소 농도와 온도가 적정해야 포도당을 만들 수 있고, 그렇지 않으면 포도당 생산 효율이 떨어진다',
      },
    ],
  },
  {
    name: '광합성 P5(두 공간 = 분업)',
    gold: '.omc/agreement/69bce4ece23376a28e12cb7c_s1_p5.gold-1.json',
    oracle: 'photosynthesis-p5-hand.json',
    genPrefix: 'photosynthesis-p5',
    focal: 'division',
    probes: [
      {
        id: '관계보존',
        expectFocal: 'relation_preserved',
        text: 'C4 식물은 두 공간에서 광합성을 한다\n엽육 세포에서 이산화 탄소를 PEP와 결합시켜 4탄당으로 저장했다가, 유관속초 세포로 보내 분해해 이산화 탄소를 내놓는다\n그 농도를 높게 유지해 C3보다 광합성 효율이 높다',
      },
      { id: '주제만', expectFocal: 'topic_only', text: 'C4 식물의 광합성\n엽육 세포와 유관속초 세포' },
      {
        // 분업이 있다는 사실만 — 각 공간의 역할이 없음 → 기대 = 주제만
        id: '조직만',
        expectFocal: 'topic_only',
        text: 'C4 식물은 두 개의 공간에서 광합성이 진행되어 효율이 높다',
      },
      {
        // ★ N2 핵심: 앞 공간의 역할만 보존하고 뒤 공간을 생략 → 오라클 기대 = 부분관계
        id: '한쪽공간만',
        expectFocal: 'partial_relation_preservation',
        text: 'C4 식물은 엽육 세포에서 이산화 탄소를 붙잡아 4탄당의 형태로 저장해 두고 광합성을 한다',
      },
      {
        id: '관계오류',
        expectFocal: 'contradicted',
        text: 'C4 식물은 유관속초 세포에서 이산화 탄소를 PEP와 결합시켜 4탄당을 만든 뒤 엽육 세포로 보내 분해한다',
      },
      {
        // ★ 대조군: 같은 문단의 선형 인과 영역에서 중간(4탄당 이동·분해) 생략 → 기대 = 관계보존
        id: '대조군-선형중간생략',
        expectFocal: 'relation_preserved',
        focal: 'efficiency',
        text: 'C4 식물은 유관속초 세포 안의 이산화 탄소 농도를 높게 유지하기 때문에 C3 식물보다 광합성 효율이 높다',
      },
    ],
  },
];

/** 이번 실행: N2 실험만. 기존 configs는 회귀 회복용으로 보존. */
/**
 * 실행할 회귀 세트. 인자로 고른다.
 *
 *   npm run assess                    n2 세트 (기본)
 *   npm run assess -- base            법인·과학·인문
 *   npm run assess -- base 법인        이름에 '법인'이 든 문단만
 *   npm run assess -- all
 *
 * 평가 캐시가 무효화되는 변경(프롬프트·스키마) 뒤에는 **모든 세트가 재측정 대상**이다.
 * 한 세트만 돌리고 끝내면 다른 문단의 회귀를 못 본다.
 */
const SUITES: Readonly<Record<string, readonly Config[]>> = {
  n2: N2_CONFIGS,
  base: CONFIGS,
  new: NEW_CONFIGS,
  all: [...CONFIGS, ...NEW_CONFIGS, ...N2_CONFIGS],
};

const SUITE_NAME = process.argv[2] ?? 'n2';
const NAME_FILTER = process.argv[3];
const SUITE = SUITES[SUITE_NAME];
if (SUITE === undefined) {
  console.error(`알 수 없는 세트 '${SUITE_NAME}'. 가능한 값: ${Object.keys(SUITES).join(', ')}`);
  process.exit(1);
}
const ACTIVE: readonly Config[] =
  NAME_FILTER === undefined ? SUITE : SUITE.filter((c) => c.name.includes(NAME_FILTER));
if (ACTIVE.length === 0) {
  console.error(`'${SUITE_NAME}' 세트에 이름이 '${NAME_FILTER}'을 포함하는 문단이 없다.`);
  process.exit(1);
}

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
  // 키에 모델·시스템 프롬프트·출력 스키마·요청 설정을 포함한다 — 이것들이 빠져 있으면
  // 프롬프트를 고쳐도 과거 결과가 재사용돼 수정 후 검증이 조용히 무효가 된다.
  const key = evalCacheKey({
    paragraphId: paraId,
    probeText,
    queries,
    requestFingerprint: EVAL_REQUEST_FINGERPRINT,
  });
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
        question: pqById.get(id)?.question ?? '',
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
    qeval.verdicts.map((v) => [v.queryId, { semanticState: v.semanticState, expressionMode: v.expressionMode, evidence: v.evidence, viaItem: v.viaItem, evidenceRole: v.evidenceRole }]),
  );
  const assessments = assess(regions, regionMeta, assessQueries(set), verdicts, propShort);
  const focalId = probe.focal ?? cfg.focal;
  const focalVerdict = regions.find((r) => r.id === focalId)?.regionSemanticVerdict ?? 'region_not_evidenced';
  return { focalVerdict, category: overallCategory(regions, focalId), assessments };
}

async function main(): Promise<void> {
  const header =
    SUITE_NAME === 'n2'
      ? 'N2 실험 — 관계 하위 유형별 압축 허용도 (순환·분업 vs 선형 인과)'
      : `회귀 — 세트 '${SUITE_NAME}'${NAME_FILTER === undefined ? '' : ` / 필터 '${NAME_FILTER}'`}`;
  console.log(`${header}  (문단 ${ACTIVE.length}개, 생성기 ${GENERATOR_VERSION})\n`);
  let overcredit = 0;
  let unstable = 0;
  let oracleMiss = 0;
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
      const p = genFixturePath(cfg.genPrefix, i);
      let fx: GeneratedQuerySet;
      if (existsSync(p)) fx = readJson<GeneratedQuerySet>(p);
      else {
        console.log(`  생성 run${i} (fixture 없음, ${GENERATOR_VERSION} 생성)…`);
        fx = await generateQuerySet(genInput);
        writeFileSync(p, JSON.stringify({ _meta: { kind: 'generated', run: i, generatorVersion: GENERATOR_VERSION, schemaVersion: EVAL_SCHEMA_VERSION, model: MODEL, generatedAt: new Date().toISOString(), note: '실험용' }, ...fx }, null, 2), 'utf8');
      }
      sets.push(loadSet(`gen${i}`, fx, oracle.shapes));
    }

    for (const probe of cfg.probes) {
      const results = [];
      for (const set of sets) results.push(await runOne(set, cfg, probe, paraText, gold.paragraphId, regionMeta, propShort));
      const verdicts = results.map((r) => r.focalVerdict);
      const unanimous = new Set(verdicts).size === 1;
      if (!unanimous) unstable++;
      // 과대평가 점검: relation_preserved 미만을 기대했는데 relation_preserved로 나온 세트.
      // partial 기대(순환·분업의 한 축만 보존)를 포함하는 것이 N2의 핵심 신호다.
      const under: RegionSemanticVerdict[] = ['topic_only', 'contradicted', 'region_not_evidenced', 'partial_relation_preservation'];
      const oc = under.includes(probe.expectFocal) && verdicts.some((v) => v === 'relation_preserved');
      if (oc) overcredit++;
      // 오라클이 기대와 어긋나면 손 오라클 자체를 재검토해야 한다 (생성기 문제와 구분).
      const oracleMismatch = verdicts[0] !== probe.expectFocal;
      if (oracleMismatch) oracleMiss++;
      const probeFocal = probe.focal ?? cfg.focal;
      console.log(`\n  [${probe.id}] 기대 focal(${probeFocal})=${VSHORT[probe.expectFocal]}`);
      console.log(`     focal 판정 (오라클|gen1|gen2|gen3): ${verdicts.map((v) => VSHORT[v]).join(' | ')}  ${unanimous ? '✓안정' : '⚠분해변이'}${oracleMismatch ? '  ⚠오라클≠기대' : ''}${oc ? '  ✗과대평가!' : ''}`);
      // 피드백 예시: 오라클 세트의 focal 영역
      const focalAssess = results[0]!.assessments.find((a) => a.regionId === probeFocal);
      if (focalAssess && ['관계보존', '주제만', '관계오류', '암묵적'].some((k) => probe.id.includes(k))) {
        feedbackSamples.push(`[${cfg.name} · ${probe.id}] "${probe.text.split('\n').slice(0, 2).join(' / ')}…"\n    판정: ${VSHORT[focalAssess.verdict]}\n    피드백: ${focalAssess.feedback}\n    명제 evidence: ${focalAssess.propositionEvidence.map((e) => `${e.propositionId}:${e.state}`).join(' ')}`);
      }
    }
  }

  const total = ACTIVE.reduce((n, c) => n + c.probes.length, 0);
  console.log(`\n${'═'.repeat(76)}\n요약`);
  console.log(`  과대평가 오류(관계보존 미만 기대 → 관계보존 판정): ${overcredit}건`);
  console.log(`  손 오라클이 기대와 어긋난 프로브: ${oracleMiss}/${total} (오라클 재검토 대상)`);
  console.log(`  분해 4종 간 focal 판정 불안정: ${unstable}/${total} 프로브`);
  if (SUITE_NAME === 'n2') {
    console.log(`\n  N2 판정 기준:`);
    console.log(`    - '순환중간생략'·'한쪽공간만'에서 생성기가 관계보존 → **위험 실증** (v0 프롬프트 수정 필요)`);
    console.log(`    - 오라클도 생성기도 부분관계 → 생성기 무사 (정책만 문서화)`);
    console.log(`    - 둘 다 관계보존 → N2 가설 자체 재검토 (압축 허용이 정답일 수 있음)`);
    console.log(`    - '대조군-선형중간생략'은 관계보존이 나와야 구분이 실재함을 보인다`);
  }
  console.log(`\n── 학생 피드백 예시 ──`);
  for (const s of feedbackSamples) console.log(`\n  ${s}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
