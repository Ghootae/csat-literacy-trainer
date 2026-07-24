/**
 * 질의 보존 평가 타당성 실험 — 손으로 만든 질의로 접근 자체를 검증한다.
 *
 *   npm run qexp
 *
 * 응답 세트를 두 평가기에 나란히 넣고 인간 오라클(주석의 기대값)과 비교한다:
 *   - 현재 슬롯 중심 평가기 (evaluate)
 *   - 질의 보존 평가기 (evaluateQueries) → 코드로 verdict 파생
 *
 * 목적: (a) 질의 평가가 A/B/C/D를 가르는가, (b) 슬롯 평가기가 이미 가르는가(그러면 실익 작음),
 * (c) 경계 사례에서 둘이 갈리는가.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadPassage } from '../adapter.js';
import type { Gold } from '../gold.js';
import { evaluate } from '../llm/evaluate.js';
import { type PreservationQuery, type QueryEval, evaluateQueries } from '../llm/query-eval.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const GOLD = resolve(process.cwd(), '.omc/agreement/s1_p1.gold-1.json');
const QUERIES = resolve(process.cwd(), 'packages/pipeline/fixtures/queries-corporate-law-p0.json');
const SET_ID = '69bbf88d8937cf14551903ca';

interface ResponseCase {
  readonly id: string;
  readonly label: string;
  readonly text: string;
  readonly oracle: string; // 인간 기대 판정 (요약)
}

/** 명확한 A/B/C/D + 경계 사례. */
const CASES: readonly ResponseCase[] = [
  {
    id: 'A',
    label: '관계 보존 추상',
    text: '법인의 정의와 종류\n자산의 법인 귀속과 권한자의 실제 운용\n위법 운용에 대한 제재와 공동체 질서 유지',
    oracle: '전 영역 scope+relation 보존. 역할 분리·목적 관계 담김. 최상급.',
  },
  {
    id: 'B',
    label: '주제만 포착',
    text: '법인의 정의와 종류\n법인의 자산 운용\n법적 통제의 목적',
    oracle: '분류·목적은 관계 보존이나, 자산 운용은 topic_only (역할 분리 미보존).',
  },
  {
    id: 'C',
    label: '공허한 표제',
    text: '법인의 성격\n법인의 특징\n법인 제도',
    oracle: 'scope 질의조차 not_evidenced. 어느 영역도 특정 못 함.',
  },
  {
    id: 'D',
    label: '구체적 관계 오류',
    text: '영리성에 따라 재단법인과 사단법인으로 나뉨\n출자자가 법인의 자산을 소유함\n법인이 직접 자산을 운용함',
    oracle: 'q3(기준-유형 오배정) contradicted, q6(출자자 소유) contradicted, q5(법인 직접 운용) contradicted.',
  },
  // ── 경계 사례 ──
  {
    id: 'E1',
    label: '경계: 소유와 운영',
    text: '법인의 정의와 종류\n법인의 소유와 운영\n법적 통제의 목적',
    oracle: '"소유와 운영"이 두 역할을 가리키나 주체를 안 밝힘 — q5 not_evidenced 예상 (경계).',
  },
  {
    id: 'E2',
    label: '경계: 주체 병치',
    text: '법인의 정의와 종류\n법인의 자산 소유와 사람의 운영\n법적 통제의 목적',
    oracle: '법인(소유)과 사람(운영) 병치 → q5 preserved+implicit 예상 (병치 인정 정책 시험).',
  },
  {
    id: 'E3',
    label: '경계: 명사 병치만',
    text: '법인의 정의와 종류\n법인의 자산 소유와 운영 주체\n법적 통제의 목적',
    oracle: '"운영 주체"가 운용자 존재는 암시하나 법인과 구분 안 함 — q5 판정 갈림 (핵심 경계).',
  },
];

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

/** 질의 상태 → verdict 파생 (결정적 코드). region별로 집계. */
function deriveVerdicts(
  queries: readonly PreservationQuery[],
  qeval: QueryEval,
): Map<string, { scope: string; relation: string; argument: string }> {
  const byId = new Map(qeval.verdicts.map((v) => [v.queryId, v]));
  const regions = new Map<string, { scope: string; relation: string; argument: string }>();

  for (const q of queries) {
    const v = byId.get(q.id);
    const state = v === undefined ? 'not_evidenced' : v.semanticState;
    const cur = regions.get(q.region) ?? { scope: '-', relation: '-', argument: '-' };
    const mark =
      state === 'preserved' ? (v?.expressionMode === 'implicit' ? '◐' : '●') : state === 'contradicted' ? '✗' : '○';
    if (q.level === 'scope') cur.scope = mark;
    else if (q.level === 'relation_structure') cur.relation = mark;
    else cur.argument = mark;
    regions.set(q.region, cur);
  }
  return regions;
}

/** region 상태 → 학생에게 보일 한 줄 판정. */
function regionVerdict(s: { scope: string; relation: string; argument: string }): string {
  if (s.scope === '✗' || s.relation === '✗' || s.argument === '✗') return '⚠ 모순';
  if (s.scope === '○') return '○ 미포착';
  if (s.relation === '●' || s.relation === '◐') return '● 관계 보존';
  if (s.relation === '○') return '◑ 주제만 (topic_only)';
  return '· scope만';
}

async function main(): Promise<void> {
  const gold = readJson<Gold>(GOLD);
  const queries = readJson<{ queries: PreservationQuery[] }>(QUERIES).queries;
  const paragraph = loadPassage(DATASET, SET_ID).sections[0]!.paragraphs[0]!;
  const propById = new Map(gold.propositions.map((p) => [p.id, p]));

  console.log(`실험: 질의 보존 평가 vs 슬롯 평가  (법인 문단, 질의 ${queries.length}개)\n`);

  for (const c of CASES) {
    console.log('━'.repeat(72));
    console.log(`[${c.id}] ${c.label}`);
    console.log(`  응답: ${c.text.replace(/\n/g, ' / ')}`);
    console.log(`  오라클: ${c.oracle}\n`);

    // ── 질의 평가기 ──
    const qeval = await evaluateQueries(paragraph.text, queries, c.text, paragraph.id);
    const regions = deriveVerdicts(queries, qeval);
    console.log('  ▸ 질의 평가:');
    for (const [region, s] of regions) {
      console.log(`      ${regionVerdict(s).padEnd(22)} ${region}  [scope ${s.scope} · relation ${s.relation} · arg ${s.argument}]`);
    }
    const contradictions = qeval.verdicts.filter((v) => v.semanticState === 'contradicted');
    if (contradictions.length > 0) {
      console.log('      모순:');
      for (const v of contradictions) console.log(`        ${v.queryId}: "${v.evidence}"`);
    }

    // ── 슬롯 평가기 (현재) ──
    const seval = await evaluate(
      paragraph.text,
      gold.slots.map((s) => ({
        slotId: s.slotId,
        shortForm: s.shortForm,
        requiredReasoningCore: s.requiredReasoningCore,
        propositions: s.traceabilityPropositions.map((id) => ({
          id,
          text: propById.get(id)?.text ?? id,
          aspect: propById.get(id)?.aspect ?? '',
        })),
      })),
      gold.evaluationLinks.map((l) => ({
        source: l.source,
        target: l.target,
        relation: l.relation,
        contrastAxis: l.contrastAxis,
        evaluationEffect: l.evaluationEffect,
      })),
      c.text,
      paragraph.id,
    );
    const slotLine = seval.slotVerdicts.map((v) => `${v.slotId}:${v.verdict}`).join(' ');
    console.log(`\n  ▸ 슬롯 평가: ${slotLine}`);
    console.log(`      첫 수정: ${seval.firstRevisionTarget.kind}(${seval.firstRevisionTarget.slotId || '-'})\n`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
