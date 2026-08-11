/**
 * 전용 질의 감사 — 4단계 검증 세트를 확정한다.
 *
 *   npm run qaudit           감사하고 fixtures/dedicated-query-audit.json에 쓴다
 *   npm run qaudit -- show   기존 결과만 출력 (호출 없음)
 *
 * **왜 필요한가.** 4단계(명제별 직접 증거를 판정에 실어 오기)의 신뢰성을 재려면 정답이
 * 필요하고, 전용 질의(앵커 1개)의 판정을 정답으로 쓰려 했다. 그런데 `anchorCount === 1`은
 * **그 질의가 그 명제를 정확히 묻는다는 보장이 아니다.**
 *
 * 실측 반례(2026-08-11): 니체 `p12`(니체=삶 수단화에 반대)의 전용 질의 `q11`은 "반대하는
 * 사유는 삶을 *무엇의* 수단으로 간주하는가"를 묻는다 — 명제보다 좁다. 학생이 "니체는 이런
 * 전도적 사유에 반대"라고 직접 썼는데도 q11의 미보존이 그 명제를 ○로 덮었다.
 *
 * 그래서 32쌍을 먼저 감사해 **명제를 정확히 묻는 질의만** 검증 세트에 넣는다. 제외한 것과
 * 사유를 함께 남긴다 — 나중에 "왜 32개가 N개가 됐나"를 재검토할 수 있어야 한다.
 *
 * **사람이 눈으로 고르지 않는다.** 감사자가 결과를 보고 정답을 정하면 그 검증은 성립하지
 * 않는다(타이틀 스파이크에서 겪은 과적합). 기준을 문장으로 못박고 그대로 적용한다.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';

import { MODEL, getClient, instrumented } from '../llm/client.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

const VERDICTS = ['일치', '좁음', '넓음', '다름'] as const;

const AuditSchema = z.object({
  items: z.array(
    z.object({
      propositionId: z.string(),
      verdict: z.enum(VERDICTS),
      reason: z.string().describe('한 문장. 무엇이 넘치거나 모자란지 구체적으로.'),
    }),
  ),
});

const SYSTEM = `당신은 채점 질의가 **한 명제를 정확히 묻는지** 감사한다.

각 항목은 명제 하나와, 그 명제만을 앵커링하는 질의 하나다. 질의의 **기대 답**이 명제의 내용을
넘치지도 모자라지도 않게 담는지 판정한다.

    일치  기대 답이 명제의 내용과 같다. 학생이 이 명제를 쓰면 이 질의에 답한 것이고,
          이 질의에 답하면 이 명제를 쓴 것이다. 양방향이 성립한다.
    좁음  기대 답이 명제의 **일부만** 묻는다. 명제를 써도 이 질의에는 답하지 않을 수 있다.
    넓음  기대 답이 명제 **말고 다른 것까지** 요구한다. 이 질의에 답하려면 명제 이상을 써야 한다.
    다름  기대 답이 이 명제와 다른 것을 묻는다.

# 판단 기준

**표현이 아니라 내용으로 본다.** 어휘가 달라도 요구하는 내용이 같으면 일치다.

**양방향을 확인하라.** 한쪽만 성립하면 일치가 아니다:
  - 명제를 쓴 학생이 이 질의에 답하지 못할 수 있는가? → 좁음 또는 다름
  - 이 질의에 답한 학생이 명제를 안 썼을 수 있는가? → 넓음 또는 다름

**애매하면 일치가 아닌 쪽으로.** 이 감사는 검증 세트를 고르는 것이고, 의심스러운 쌍을 넣으면
검증 자체가 오염된다. 걸러내는 비용은 표본이 줄어드는 것뿐이다.`;

interface GoldNode {
  readonly id: string;
  readonly text?: string;
  readonly shortForm?: string;
}
interface Gold {
  readonly nodes: readonly GoldNode[];
}

const CONTENT = resolve(process.cwd(), 'content');
const OUT = resolve(process.cwd(), 'packages/pipeline/fixtures/dedicated-query-audit.json');
const readJson = <T>(id: string, f: string): T =>
  JSON.parse(readFileSync(resolve(CONTENT, id, f), 'utf8')) as T;

const ALL = [
  'corporate-law-p1',
  'science-p5',
  'humanities-p4',
  'photosynthesis-p4',
  'disclosure-p3',
  'photosynthesis-p3',
  'photosynthesis-p5',
  'nietzsche-p1',
];

interface Pair {
  readonly propositionId: string;
  readonly propositionText: string;
  readonly shortForm: string;
  readonly queryId: string;
  readonly question: string;
  readonly expectedAnswer: string;
}

/** 전용 질의를 가진 명제 쌍. scope 질의는 애초에 증거로 안 세므로 제외한다. */
function pairsOf(id: string): Pair[] {
  const gen = readJson<GeneratedQuerySet>(id, 'queries.json');
  const gold = readJson<Gold>(id, 'gold.json');
  const node = new Map(gold.nodes.map((n) => [n.id, n]));
  const out: Pair[] = [];
  for (const r of gen.regions) {
    for (const q of r.queries) {
      if (q.level === 'scope' || q.propositionIds.length !== 1) continue;
      const pid = q.propositionIds[0]!;
      const n = node.get(pid);
      out.push({
        propositionId: pid,
        propositionText: n?.text ?? pid,
        shortForm: n?.shortForm ?? pid,
        queryId: q.id,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
      });
    }
  }
  return out;
}

async function auditParagraph(id: string, pairs: readonly Pair[]) {
  const block = pairs
    .map(
      (p) =>
        `[${p.propositionId}]\n` +
        `  명제: ${p.propositionText}\n` +
        `  질의(${p.queryId}): ${p.question}\n` +
        `  기대 답: ${p.expectedAnswer}`,
    )
    .join('\n\n');

  const response = await instrumented('dedicated-query-audit', 'medium', id, () =>
    getClient().messages.parse({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: zodOutputFormat(AuditSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `문단: ${id}\n\n${block}` }],
    }),
  );
  const parsed = response.parsed_output;
  if (parsed === null || parsed === undefined) throw new Error(`감사 실패: ${id}`);
  return parsed.items;
}

function show(): void {
  const a = JSON.parse(readFileSync(OUT, 'utf8')) as {
    generatedAt: string;
    counts: Record<string, number>;
    items: { paragraphId: string; propositionId: string; queryId: string; shortForm: string; verdict: string; reason: string }[];
  };
  console.log(`감사 ${a.generatedAt}`);
  console.log(`  ${Object.entries(a.counts).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  for (const v of VERDICTS) {
    const rows = a.items.filter((i) => i.verdict === v);
    if (rows.length === 0) continue;
    console.log(`\n── ${v} (${rows.length})`);
    for (const r of rows) {
      console.log(`  ${r.paragraphId}/${r.propositionId} (${r.queryId})  ${r.shortForm}`);
      if (v !== '일치') console.log(`      ${r.reason}`);
    }
  }
}

if (process.argv[2] === 'show') {
  show();
} else {
  const items: unknown[] = [];
  const counts: Record<string, number> = { 일치: 0, 좁음: 0, 넓음: 0, 다름: 0 };
  for (const id of ALL) {
    const pairs = pairsOf(id);
    if (pairs.length === 0) continue;
    const verdicts = await auditParagraph(id, pairs);
    const byId = new Map(verdicts.map((v) => [v.propositionId, v]));
    for (const p of pairs) {
      const v = byId.get(p.propositionId);
      const verdict = v?.verdict ?? '다름';
      counts[verdict] = (counts[verdict] ?? 0) + 1;
      items.push({
        paragraphId: id,
        propositionId: p.propositionId,
        queryId: p.queryId,
        shortForm: p.shortForm,
        verdict,
        reason: v?.reason ?? '감사 결과 없음',
      });
    }
    console.log(`${id}: ${pairs.length}쌍 감사`);
  }
  writeFileSync(
    OUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), model: MODEL, counts, items }, null, 2)}\n`,
    'utf8',
  );
  console.log(`\n→ ${OUT}`);
  show();
}
