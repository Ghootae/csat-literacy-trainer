/**
 * 질의 보존 평가 — 세 축 분리 정규화 + 반복 안정성 실험.
 *
 *   npm run qexp
 *
 * 손 질의(고정 오라클)로 다음을 확인한다:
 *   1. 의미 보존(regionSemanticVerdict)·논항 커버리지(argumentCoverage)·표현 방식
 *      (expressionProfile)을 분리한 상태에서 경계 응답을 안정적으로 구분하는가.
 *   2. 동일 응답을 3회 반복했을 때 세 축이 각각 일치하는가.
 *
 * LLM 프롬프트는 바꾸지 않는다. 원시 판정과 정규화 판정을 모두 로그로 남긴다.
 * 반복 안정성을 재려면 캐시하면 안 되므로 매 반복 실제 호출한다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadPassage } from '../adapter.js';
import { type PreservationQuery, evaluateQueries } from '../llm/query-eval.js';
import {
  type ArgumentCoverage,
  type ExpressionProfile,
  type NormalizedRegion,
  type RawQueryVerdict,
  type RegionPolicy,
  type RegionSemanticVerdict,
  type SemanticState,
  displayLabel,
  normalizeQueryStates,
} from '../query-normalize.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const QUERIES = resolve(process.cwd(), 'packages/pipeline/fixtures/queries-corporate-law-p0.json');
const SET_ID = '69bbf88d8937cf14551903ca';
const REPEATS = 3;

type AxisExpectation = {
  readonly sem: RegionSemanticVerdict;
  readonly cov: ArgumentCoverage;
  readonly expr: ExpressionProfile;
};

interface ResponseCase {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly oracle: string;
  /** 확신 있는 영역의 세 축 기대 (다수결 기준 불일치 집계용). */
  readonly expect?: Readonly<Record<string, AxisExpectation>>;
  /** G 경계용 질의별 기대 상태 (q6a/q6b). */
  readonly expectQuery?: Readonly<Record<string, SemanticState>>;
  /** q6a/q6b에 초점을 둔 최소 응답인가 (리포트에서 별도 처리). */
  readonly focusQ6?: boolean;
}

const CASES: readonly ResponseCase[] = [
  {
    id: 'A',
    label: '관계 보존 추상',
    text: '법인의 정의와 종류\n자산의 법인 귀속과 권한자의 실제 운용\n위법 운용에 대한 제재와 공동체 질서 유지',
    oracle: '전 영역 관계 보존. 자산 운용은 법인·권한자 병치, 권한자까지 명시 → relation_preserved / full / implicit.',
    expect: { asset_operation: { sem: 'relation_preserved', cov: 'full', expr: 'implicit' } },
  },
  {
    id: 'B',
    label: '주제만 포착',
    text: '법인의 정의와 종류\n법인의 자산 운용\n법적 통제의 목적',
    oracle: '자산 운용은 topic_only. 위법 운용은 아예 미포착.',
    expect: { asset_operation: { sem: 'topic_only', cov: 'none', expr: 'none' } },
  },
  {
    id: 'C',
    label: '공허한 표제',
    text: '법인의 성격\n법인의 특징\n법인 제도',
    oracle: '어느 영역도 특정 못 함 → 전 영역 region_not_evidenced.',
    expect: {
      classification: { sem: 'region_not_evidenced', cov: 'none', expr: 'none' },
      asset_operation: { sem: 'region_not_evidenced', cov: 'none', expr: 'none' },
    },
  },
  {
    id: 'D',
    label: '구체적 관계 오류',
    text: '영리성에 따라 재단법인과 사단법인으로 나뉨\n출자자가 법인의 자산을 소유함\n법인이 직접 자산을 운용함',
    oracle: 'q5/q6a 모순 → 자산 운용 contradicted.',
    expect: { asset_operation: { sem: 'contradicted', cov: 'none', expr: 'none' } },
  },
  {
    id: 'E1',
    label: '경계: 소유와 운영',
    text: '법인의 정의와 종류\n법인의 소유와 운영\n법적 통제의 목적',
    oracle: '"소유와 운영"이 두 역할을 가리키나 주체를 안 밝힘 — 경계.',
  },
  {
    id: 'E2',
    label: '경계: 주체 병치',
    text: '법인의 정의와 종류\n법인의 자산 소유와 사람의 운영\n법적 통제의 목적',
    oracle: '법인(소유)·사람(운영) 병치 → relation_preserved / partial / implicit.',
    expect: { asset_operation: { sem: 'relation_preserved', cov: 'partial', expr: 'implicit' } },
  },
  {
    id: 'E3',
    label: '경계: 명사 병치만',
    text: '법인의 정의와 종류\n법인의 자산 소유와 운영 주체\n법적 통제의 목적',
    oracle: '"운영 주체"는 법인과 구분 안 함 → relation_preserved 미만 (topic_only 또는 partial).',
    // relation_preserved만 아니면 됨 — 아래 커스텀 체크로 처리.
  },
  {
    id: 'F',
    label: '명시적 고해상도',
    text: '법인의 정의와 종류\n자산은 법인에 귀속되지만 실제 운용은 권한자가 담당한다\n법적 통제의 목적',
    oracle: '법인·권한자 명시, 자격까지 → relation_preserved / full / explicit (고해상도).',
    expect: { asset_operation: { sem: 'relation_preserved', cov: 'full', expr: 'explicit' } },
  },
  // ── G: q6a(역할 주체) vs q6b(권한 자격) 경계 ──
  { id: 'G1', label: '사람이 운영', text: '사람이 운영한다', oracle: 'q6a preserved / q6b not_evidenced', focusQ6: true, expectQuery: { q6a: 'preserved', q6b: 'not_evidenced' } },
  { id: 'G2', label: '대표자가 운영', text: '대표자가 운영한다', oracle: 'q6a preserved / q6b 경계', focusQ6: true, expectQuery: { q6a: 'preserved' } },
  { id: 'G3', label: '직원이 운영', text: '직원이 운영한다', oracle: 'q6a preserved(또는 경계) / q6b not_evidenced', focusQ6: true, expectQuery: { q6b: 'not_evidenced' } },
  { id: 'G4', label: '출자자가 운영', text: '출자자가 운영한다', oracle: 'q6a preserved / q6b contradicted 검토', focusQ6: true, expectQuery: { q6a: 'preserved' } },
  { id: 'G5', label: '권한자가 운영', text: '권한자가 운영한다', oracle: 'q6a preserved / q6b preserved', focusQ6: true, expectQuery: { q6a: 'preserved', q6b: 'preserved' } },
  { id: 'G6', label: '정관상 권한자가 운영', text: '정관상 권한자가 운영한다', oracle: 'q6a preserved / q6b preserved', focusQ6: true, expectQuery: { q6a: 'preserved', q6b: 'preserved' } },
  { id: 'G7', label: '법인이 사람을 통해 운영', text: '법인이 사람을 통해 운영한다', oracle: 'q6a preserved / q6b not_evidenced', focusQ6: true, expectQuery: { q6a: 'preserved', q6b: 'not_evidenced' } },
  { id: 'G8', label: '법인이 직접 운영', text: '법인이 직접 운영한다', oracle: 'q6a contradicted / q6b not_evidenced', focusQ6: true, expectQuery: { q6a: 'contradicted', q6b: 'not_evidenced' } },
];

interface FixtureQuery extends PreservationQuery {
  readonly requiredForRelation?: boolean;
  readonly requiredForFullArgumentCoverage?: boolean;
}
interface RegionMembership {
  readonly id: string;
  readonly label: string;
  readonly scopeQueries: readonly string[];
  readonly relationQueries: readonly string[];
  readonly argumentQueries: readonly string[];
}

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/** 멤버십 + 질의 플래그 → 정규화가 받는 완결된 RegionPolicy. */
function resolvePolicy(memberships: readonly RegionMembership[], queries: readonly FixtureQuery[]): RegionPolicy[] {
  const byId = new Map(queries.map((q) => [q.id, q]));
  return memberships.map((m) => {
    const memberIds = [...m.scopeQueries, ...m.relationQueries, ...m.argumentQueries];
    return {
      id: m.id,
      label: m.label,
      scopeQueries: m.scopeQueries,
      relationQueries: m.relationQueries,
      argumentQueries: m.argumentQueries,
      criticalForRelation: memberIds.filter((id) => byId.get(id)?.requiredForRelation === true),
      requiredForFullArgument: memberIds.filter((id) => byId.get(id)?.requiredForFullArgumentCoverage === true),
    };
  });
}

const MARK: Record<string, string> = {
  'preserved:explicit': '●',
  'preserved:implicit': '◐',
  'not_evidenced:none': '○',
  'contradicted:none': '✗',
};
function mark(v: RawQueryVerdict | undefined): string {
  if (v === undefined) return '·';
  return MARK[`${v.semanticState}:${v.expressionMode}`] ?? '?';
}

const SEM_LABEL: Record<RegionSemanticVerdict, string> = {
  region_not_evidenced: '미포착',
  topic_only: '주제만',
  partial_relation_preservation: '부분관계',
  relation_preserved: '관계보존',
  contradicted: '모순',
};

function toRawMap(verdicts: readonly RawQueryVerdict[]): Map<string, RawQueryVerdict> {
  return new Map(verdicts.map((v) => [v.queryId, v]));
}

interface RunResult {
  readonly raw: Map<string, RawQueryVerdict>;
  readonly regions: readonly NormalizedRegion[];
}

function majority<T>(xs: readonly T[]): { value: T; unanimous: boolean } {
  const counts = new Map<string, { value: T; n: number }>();
  for (const x of xs) {
    const k = JSON.stringify(x);
    const e = counts.get(k) ?? { value: x, n: 0 };
    e.n += 1;
    counts.set(k, e);
  }
  let best: { value: T; n: number } = { value: xs[0]!, n: 0 };
  for (const e of counts.values()) if (e.n > best.n) best = e;
  return { value: best.value, unanimous: counts.size === 1 };
}

function pct(a: number, b: number): string {
  return b === 0 ? '—' : `${Math.round((100 * a) / b)}%`;
}

async function main(): Promise<void> {
  const fixture = readJson<{ queries: FixtureQuery[]; regionPolicy: RegionMembership[] }>(QUERIES);
  const queries = fixture.queries;
  const policy = resolvePolicy(fixture.regionPolicy, queries);
  const paragraph = loadPassage(DATASET, SET_ID).sections[0]!.paragraphs[0]!;
  const orderedQ = queries.map((q) => q.id);
  const assetIdx = policy.findIndex((p) => p.id === 'asset_operation');

  console.log(
    `실험: 세 축 분리 정규화 (법인 문단, 질의 ${queries.length}개, 영역 ${policy.length}개, 응답 ${CASES.length}개, 반복 ${REPEATS}회)\n`,
  );

  // 집계
  let stateAgree = 0, stateTotal = 0, modeAgree = 0, modeTotal = 0;
  let semAgree = 0, covAgree = 0, exprAgree = 0, axisTotal = 0;
  let promotionEvents = 0;
  const boundary: Record<string, NormalizedRegion[]> = {};
  const mismatches: string[] = [];
  const gRows: string[] = [];
  const e2f: Record<string, NormalizedRegion[]> = {};

  for (const c of CASES) {
    console.log('━'.repeat(78));
    console.log(`[${c.id}] ${c.label}   응답: ${c.text.replace(/\n/g, ' / ')}`);
    console.log(`  오라클: ${c.oracle}`);

    const runs: RunResult[] = [];
    for (let r = 0; r < REPEATS; r++) {
      const qeval = await evaluateQueries(paragraph.text, queries, c.text, paragraph.id);
      const rawMap = toRawMap(qeval.verdicts as RawQueryVerdict[]);
      const regions = normalizeQueryStates(rawMap, policy);
      runs.push({ raw: rawMap, regions });

      const rawLine = orderedQ.map((id) => `${id}${mark(rawMap.get(id))}`).join(' ');
      console.log(`\n  run ${r + 1} ─ raw:  ${rawLine}`);
      if (c.focusQ6) {
        // q6a/q6b 초점 — 자산 운용 영역만 요약
        const rg = regions[assetIdx]!;
        console.log(
          `        [자산운용] sem=${SEM_LABEL[rg.regionSemanticVerdict]} cov=${rg.argumentCoverage} expr=${rg.expressionProfile}` +
            `  (q6a=${rawMap.get('q6a')?.semanticState ?? '·'} / q6b=${rawMap.get('q6b')?.semanticState ?? '·'})`,
        );
      } else {
        for (const rg of regions) {
          const sc = mark({ queryId: '', ...rg.scope } as RawQueryVerdict);
          const promo = rg.scopePromoted ? ` ⤴(${rg.scope.source})` : '';
          console.log(
            `        ${rg.label.padEnd(12)} sem=${SEM_LABEL[rg.regionSemanticVerdict].padEnd(4)} cov=${rg.argumentCoverage.padEnd(7)} expr=${rg.expressionProfile.padEnd(8)} [scope ${sc}]${promo}  → ${displayLabel(rg)}`,
          );
          if (rg.scopePromoted) promotionEvents += 1;
        }
      }
    }

    // 반복 일치 집계
    for (const id of orderedQ) {
      stateTotal += 1; modeTotal += 1;
      if (majority(runs.map((r) => r.raw.get(id)?.semanticState ?? 'not_evidenced')).unanimous) stateAgree += 1;
      if (majority(runs.map((r) => r.raw.get(id)?.expressionMode ?? 'none')).unanimous) modeAgree += 1;
    }
    for (let i = 0; i < policy.length; i++) {
      axisTotal += 1;
      const sems = runs.map((r) => r.regions[i]!.regionSemanticVerdict);
      const covs = runs.map((r) => r.regions[i]!.argumentCoverage);
      const exprs = runs.map((r) => r.regions[i]!.expressionProfile);
      if (majority(sems).unanimous) semAgree += 1;
      if (majority(covs).unanimous) covAgree += 1;
      if (majority(exprs).unanimous) exprAgree += 1;

      const regionId = policy[i]!.id;
      const exp = c.expect?.[regionId];
      if (exp !== undefined) {
        const majReg = runs.map((r) => r.regions[i]!);
        const s = majority(majReg.map((x) => x.regionSemanticVerdict)).value;
        const cv = majority(majReg.map((x) => x.argumentCoverage)).value;
        const ex = majority(majReg.map((x) => x.expressionProfile)).value;
        if (s !== exp.sem || cv !== exp.cov || ex !== exp.expr) {
          mismatches.push(
            `[${c.id}] ${policy[i]!.label}: 기대 ${exp.sem}/${exp.cov}/${exp.expr} → 실제 ${s}/${cv}/${ex}`,
          );
        }
      }
    }

    if (['B', 'E3'].includes(c.id)) boundary[c.id] = runs.map((r) => r.regions[assetIdx]!);
    if (['E2', 'F'].includes(c.id)) e2f[c.id] = runs.map((r) => r.regions[assetIdx]!);

    // G 경계: q6a/q6b 상태 집계 + 기대 대비
    if (c.focusQ6) {
      const q6a = runs.map((r) => r.raw.get('q6a')?.semanticState ?? 'not_evidenced');
      const q6b = runs.map((r) => r.raw.get('q6b')?.semanticState ?? 'not_evidenced');
      const q6aMaj = majority(q6a);
      const q6bMaj = majority(q6b);
      gRows.push(
        `  ${c.id} ${c.label.padEnd(16)} q6a=${q6aMaj.value}${q6aMaj.unanimous ? '' : '*'} / q6b=${q6bMaj.value}${q6bMaj.unanimous ? '' : '*'}`,
      );
      for (const [qid, want] of Object.entries(c.expectQuery ?? {})) {
        const got = majority(runs.map((r) => r.raw.get(qid)?.semanticState ?? 'not_evidenced')).value;
        if (got !== want) mismatches.push(`[${c.id}] ${qid}: 기대 ${want} → 실제 ${got}`);
      }
    }
    console.log('');
  }

  // ── 종합 보고 ──
  console.log('═'.repeat(78));
  console.log('반복 안정성 (3회 만장일치)');
  console.log(`  1. semanticState: ${stateAgree}/${stateTotal} (${pct(stateAgree, stateTotal)})`);
  console.log(`  2. expressionMode: ${modeAgree}/${modeTotal} (${pct(modeAgree, modeTotal)})`);
  console.log(`  3. regionSemanticVerdict: ${semAgree}/${axisTotal} (${pct(semAgree, axisTotal)})`);
  console.log(`  4. argumentCoverage: ${covAgree}/${axisTotal} (${pct(covAgree, axisTotal)})`);
  console.log(`  5. expressionProfile: ${exprAgree}/${axisTotal} (${pct(exprAgree, axisTotal)})`);
  console.log(`     scope 승격 이벤트(raw≠normalized): ${promotionEvents}건`);

  console.log('\n6. E2 vs F — 세 축 구분 (자산 운용)');
  for (const id of ['E2', 'F']) {
    const rs = e2f[id]!;
    const s = majority(rs.map((x) => x.regionSemanticVerdict)).value;
    const cv = majority(rs.map((x) => x.argumentCoverage)).value;
    const ex = majority(rs.map((x) => x.expressionProfile)).value;
    console.log(`  ${id}: ${SEM_LABEL[s]} / ${cv} / ${ex}  → ${displayLabel(rs[0]!)}`);
  }

  console.log('\n   핵심 경계 — 자산 운용 3회 의미 판정');
  for (const id of ['B', 'E3']) {
    const rs = boundary[id]!;
    const sems = rs.map((x) => x.regionSemanticVerdict);
    console.log(`  ${id}: ${sems.map((s) => SEM_LABEL[s]).join(' | ')}  → ${majority(sems).unanimous ? '안정' : '불안정'}`);
  }

  console.log('\n7. G1~G8 — q6a(역할주체) / q6b(권한자격)   (* = 3회 불일치)');
  for (const row of gRows) console.log(row);

  console.log('\n8. 인간 기대값과 불일치');
  if (mismatches.length === 0) console.log('  없음');
  else for (const m of mismatches) console.log(`  ✗ ${m}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
