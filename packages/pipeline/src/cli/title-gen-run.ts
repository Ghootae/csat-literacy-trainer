/**
 * 타이틀 질의 생성 — 손 오라클과 같은 구조를 생성기가 만들 수 있는지 본다.
 *
 *   npm run title:gen -- <paragraphId> [run=1]
 *
 * 생성 결과는 `fixtures/title-queries/<id>-gen<run>.json`에 쓴다. 손 오라클(`-hand.json`)은
 * 덮지 않는다 — 둘을 같은 프로브로 돌려 비교하는 것이 목적이기 때문이다.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Gold } from '../gold.js';
import { TITLE_GENERATOR_VERSION, generateTitleQuerySet, validateTitleQuerySet } from '../llm/title-gen.js';

const DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/title-queries');

async function main(): Promise<void> {
  const paragraphId = process.argv[2];
  const run = process.argv[3] ?? '1';
  if (paragraphId === undefined) throw new Error('paragraphId가 필요하다');

  const gold = JSON.parse(
    readFileSync(resolve(process.cwd(), 'content', paragraphId, 'gold.json'), 'utf8'),
  ) as Gold;
  const by = new Map(gold.nodes.map((n) => [n.id, n]));
  const title = by.get(gold.titleId);
  if (title === undefined) throw new Error(`타이틀 노드 ${gold.titleId} 없음`);

  const set = await generateTitleQuerySet({
    paragraphId,
    titleShortForm: title.shortForm ?? title.text,
    sentences: gold.sentences,
    slots: gold.slots.map((s) => ({
      id: s.slotId,
      shortForm: by.get(s.slotId)?.shortForm ?? s.slotId,
    })),
  });

  const problems = validateTitleQuerySet(set);
  mkdirSync(DIR, { recursive: true });
  // **경로에 버전을 넣는다.** 주석은 그러겠다고 했는데 실제로는 빠져 있어서, 프롬프트를
  // 고치고 다시 돌리면 이전 버전 산출물이 덮였다 — 기준선이 사라진다.
  const tag = TITLE_GENERATOR_VERSION === 'v1' ? '' : `-${TITLE_GENERATOR_VERSION}`;
  const path = resolve(DIR, `${paragraphId}${tag}-gen${run}.json`);
  writeFileSync(path, `${JSON.stringify(set, null, 2)}\n`, 'utf8');

  console.log(`${paragraphId} → ${path.split('/').slice(-1)[0]}`);
  const region = set.regions[0];
  for (const q of region?.queries ?? []) {
    console.log(`  [${q.id}] ${q.level}${q.criticalForRelation ? ' ★critical' : ''}`);
    console.log(`      ${q.question}`);
    console.log(`      기대: ${q.expectedAnswer.slice(0, 70)}`);
    for (const c of q.acceptanceCriteria) console.log(`      · ${c.slice(0, 88)}`);
  }
  console.log(problems.length === 0 ? '\n  구조 검사 ✓' : `\n  ⚠ 구조 문제: ${problems.join(', ')}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
