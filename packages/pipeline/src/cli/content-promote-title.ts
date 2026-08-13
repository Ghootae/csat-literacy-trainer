/**
 * 사람이 검수한 타이틀 질의 fixture를 학생용 content/에 승격한다. LLM 호출은 하지 않는다.
 *
 *   npm run content:title -- <paragraphId> <fixturePath>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateTitleQuerySet } from '../llm/title-gen.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';

function main(): void {
  const paragraphId = process.argv[2];
  const fixturePath = process.argv[3];
  if (paragraphId === undefined || fixturePath === undefined) {
    throw new Error('사용법: npm run content:title -- <paragraphId> <fixturePath>');
  }

  const set = JSON.parse(
    readFileSync(resolve(process.cwd(), fixturePath), 'utf8'),
  ) as GeneratedQuerySet;
  if (set.paragraphId !== paragraphId) {
    throw new Error(`paragraphId 불일치: ${set.paragraphId} != ${paragraphId}`);
  }
  const problems = validateTitleQuerySet(set);
  if (problems.length > 0) throw new Error(`타이틀 질의 구조 오류: ${problems.join(', ')}`);

  const out = resolve(process.cwd(), 'content', paragraphId, 'title-queries.json');
  writeFileSync(out, `${JSON.stringify(set, null, 2)}\n`, 'utf8');
  console.log(`${fixturePath} → content/${paragraphId}/title-queries.json`);
}

main();
