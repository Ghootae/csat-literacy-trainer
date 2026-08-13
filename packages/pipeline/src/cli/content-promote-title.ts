/**
 * 사람이 검수한 타이틀 질의 fixture를 학생용 content/에 승격한다. LLM 호출은 하지 않는다.
 *
 *   npm run content:title -- <paragraphId> <fixturePath>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateTitleQuerySet } from '../llm/title-gen.js';
import type { GeneratedQuerySet } from '../llm/query-gen.js';
import type { Gold } from '../gold.js';
import { assertVerificationGate } from '../semantic-verification.js';

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

  const contentDir = resolve(process.cwd(), 'content', paragraphId);
  const passage = JSON.parse(readFileSync(resolve(contentDir, 'passage.json'), 'utf8')) as { text: string };
  const gold = JSON.parse(readFileSync(resolve(contentDir, 'gold.json'), 'utf8')) as Gold;
  assertVerificationGate(passage.text, gold, gold.semanticVerification);
  assertVerificationGate(passage.text, set, set.semanticVerification);

  const out = resolve(contentDir, 'title-queries.json');
  writeFileSync(out, `${JSON.stringify(set, null, 2)}\n`, 'utf8');
  console.log(`${fixturePath} → content/${paragraphId}/title-queries.json`);
}

main();
