/**
 * 데이터셋에 없는 **임의 문단**으로 골드·질의셋을 만들고 학생 응답을 판정한다.
 *
 *   npm run adhoc -- gold <문단파일> <paragraphId> [태그,태그]
 *   npm run adhoc -- eval <paragraphId> <응답파일>
 *
 * `gold-one.ts`는 `suneung_db` 좌표(setId + 문단 인덱스)를 요구하므로 붙여넣은 문단에는
 * 쓸 수 없다. 이 CLI는 원문 텍스트만 받아 같은 파이프라인을 돌린다 — 손으로 골드를
 * 지어내지 않고 실제 생성기 출력으로 시연·검토하기 위한 경로다.
 *
 * 산출물은 `.omc/adhoc/`에 남는다(gitignore). 실험 fixture가 아니므로 회귀 세트와 섞지 않는다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { RegionAssessment } from '../assessment.js';
import { evaluateResponse } from '../evaluate-response.js';
import { type Gold as PipelineGold, buildGold } from '../gold.js';
import { GENERATOR_VERSION, type GeneratedQuerySet, generateQuerySet } from '../llm/query-gen.js';
import { type Gold as LibGold, buildGeneratorInput } from '../query-gen-lib.js';

const DIR = resolve(process.cwd(), '.omc/adhoc');

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}
function write(p: string, v: unknown): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(p, JSON.stringify(v, null, 2), 'utf8');
}
const goldPath = (id: string) => resolve(DIR, `${id}.gold.json`);
const queryPath = (id: string) => resolve(DIR, `${id}.queries.json`);

// ── 수형도 기호 (STUDENT-LOOP-DESIGN.md §4.1) ──
const EV_MARK: Record<string, string> = {
  evidenced: '●',
  supported_by_abstraction: '◐',
  not_evidenced: '○',
  contradicted: '✗',
};
const VERDICT_LABEL: Record<string, string> = {
  relation_preserved: '관계보존',
  partial_relation_preservation: '부분관계',
  topic_only: '주제만',
  region_not_evidenced: '미포착',
  contradicted: '모순',
};

async function cmdGold(textFile: string, paragraphId: string, tagArg?: string): Promise<void> {
  const text = readFileSync(resolve(process.cwd(), textFile), 'utf8').trim();
  const tags = (tagArg ?? '').split(',').filter((t) => t.length > 0);
  console.log(`문단 ${paragraphId} (${text.length}자, 태그: ${tags.join(', ') || '미분류'})\n`);

  const gp = goldPath(paragraphId);
  let gold: PipelineGold;
  if (existsSync(gp)) {
    gold = readJson<PipelineGold>(gp);
    console.log('골드 캐시 사용');
  } else {
    gold = await buildGold(text, tags, paragraphId, resolve(DIR, `${paragraphId}.steps`));
    write(gp, gold);
    console.log('골드 생성 완료');
  }

  const qp = queryPath(paragraphId);
  let gen: GeneratedQuerySet;
  if (existsSync(qp)) {
    gen = readJson<GeneratedQuerySet>(qp);
    console.log('질의셋 캐시 사용');
  } else {
    gen = await generateQuerySet(buildGeneratorInput(gold as unknown as LibGold));
    write(qp, { _meta: { generatorVersion: GENERATOR_VERSION, generatedAt: new Date().toISOString() }, ...gen });
    console.log(`질의셋 생성 완료 (${GENERATOR_VERSION})`);
  }

  printGold(gold, gen);
}

function printGold(gold: PipelineGold, gen: GeneratedQuerySet): void {
  const byId = new Map(gold.nodes.map((n) => [n.id, n]));
  const title = byId.get(gold.titleId);
  console.log(`\n${'━'.repeat(76)}\n골드 위계\n`);
  console.log(`[타이틀] ${title?.shortForm ?? '?'}`);

  const walk = (id: string, depth: number): void => {
    const n = byId.get(id);
    if (n === undefined) return;
    const pad = '  '.repeat(depth);
    const kind = n.kind === 'proposition' ? 'p' : 'c';
    console.log(`${pad}${depth === 1 ? '├─' : '│ '} (${kind}) ${n.id.padEnd(4)} ${n.shortForm}`);
    for (const c of n.childIds) walk(c, depth + 1);
  };
  for (const c of title?.childIds ?? []) walk(c, 1);

  console.log(`\n[슬롯] ${gold.slots.length}개`);
  for (const s of gold.slots) console.log(`  ${s.slotId.padEnd(5)} ${s.shortForm}`);

  console.log(`\n[평가 영역] ${gen.regions.length}개 — 질의 ${gen.regions.reduce((n, r) => n + r.queries.length, 0)}개`);
  for (const r of gen.regions) {
    const crit = r.queries.filter((q) => q.criticalForRelation).length;
    console.log(`  ${r.regionId.padEnd(4)} ${r.label}  (질의 ${r.queries.length}, 핵심 ${crit})`);
    for (const q of r.queries) {
      const mark = q.criticalForRelation ? '★' : ' ';
      console.log(`      ${mark}${q.id.padEnd(12)} [${q.level.padEnd(8)}] ${q.question}`);
    }
  }
}

async function cmdEval(paragraphId: string, responseFile: string): Promise<void> {
  const gold = readJson<PipelineGold>(goldPath(paragraphId));
  const gen = readJson<GeneratedQuerySet>(queryPath(paragraphId));
  const response = readFileSync(resolve(process.cwd(), responseFile), 'utf8').trim();

  const { assessments, said, sentenceIds } = await evaluateResponse(
    gold,
    gen,
    response,
    resolve(DIR, 'eval-cache'),
  );
  printScreen(gold, assessments, said, sentenceIds);
}

/** 문장 id 목록 → "1~2번째 문장" 같은 위치 표기. 골드를 노출하지 않는 유일한 지시 수단이다. */
function sentenceSpan(ids: readonly string[]): string {
  const ns = ids.map((s) => Number(s.replace(/\D/g, ''))).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (ns.length === 0) return '이 부분';
  const first = ns[0]!;
  const last = ns[ns.length - 1]!;
  return first === last ? `${first}번째 문장` : `${first}~${last}번째 문장`;
}

const VERDICT_MARK: Record<string, string> = {
  relation_preserved: '●',
  partial_relation_preservation: '◐',
  topic_only: '○',
  region_not_evidenced: '○',
  contradicted: '✗',
};

/**
 * 학생이 보는 화면 (§4.1.1~4.1.3).
 *
 * 영역 박스가 주인공이다. **관계보존 영역에만** 정답(label)과 명제를 공개하고, 미달 영역은
 * 위치와 힌트만 준다 — 골드 노출 0. 화제어는 골드가 아니라 학생 자신이 쓴 표현이 채운다.
 */
function printScreen(
  gold: PipelineGold,
  assessments: readonly RegionAssessment[],
  said: ReadonlyMap<string, readonly string[]>,
  spanOf: ReadonlyMap<string, readonly string[]>,
): void {
  console.log(`\n${'━'.repeat(76)}`);
  console.log(`이 문단은 ${assessments.length}개 부분으로 나뉩니다.`);
  console.log('━'.repeat(76));

  for (const a of assessments) {
    const mark = VERDICT_MARK[a.verdict] ?? '?';
    const solved = a.verdict === 'relation_preserved';
    const title = solved ? a.label : sentenceSpan(spanOf.get(a.regionId) ?? []);

    console.log(`\n┌─ ${mark} ${VERDICT_LABEL[a.verdict] ?? a.verdict} ${'─'.repeat(Math.max(0, 58 - VERDICT_LABEL[a.verdict]!.length))}`);
    console.log(`│  ${title}`);

    if (solved) {
      console.log('│');
      for (const e of a.propositionEvidence) {
        console.log(`│    ${EV_MARK[e.state] ?? '?'} ${e.shortForm}`);
      }
    }
    console.log('│');
    console.log(`│  ${a.feedback}`);

    const mine = said.get(a.regionId) ?? [];
    if (mine.length > 0) {
      console.log('│');
      console.log(`│  내가 쓴 것: ${mine.map((m) => `"${m}"`).join(', ')}`);
    }
    console.log('└' + '─'.repeat(74));
  }
  console.log('');
  void gold;

  // 하단 요약은 **영역 단위만** 낸다. 명제 개수(특히 ○)를 집계해 보여주면 결손표 인상이
  // 되살아난다 — 명제는 관계보존 영역 안에서 성취 표시로만 쓴다 (§4.1.1).
  const v = (k: string) => assessments.filter((a) => a.verdict === k).length;
  const parts = [
    ['관계보존', v('relation_preserved'), '●'],
    ['부분관계', v('partial_relation_preservation'), '◐'],
    ['다듬을 곳', v('topic_only') + v('region_not_evidenced'), '○'],
    ['꼭 고칠 곳', v('contradicted'), '✗'],
  ] as const;
  console.log('─'.repeat(76));
  console.log(parts.filter(([, n]) => n > 0).map(([label, n, m]) => `${m} ${label} ${n}`).join('   '));
}

async function main(): Promise<void> {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'gold' && a !== undefined && b !== undefined) await cmdGold(a, b, c);
  else if (cmd === 'eval' && a !== undefined && b !== undefined) await cmdEval(a, b);
  else {
    console.error('사용법:\n  npm run adhoc -- gold <문단파일> <paragraphId> [태그,태그]\n  npm run adhoc -- eval <paragraphId> <응답파일>');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
