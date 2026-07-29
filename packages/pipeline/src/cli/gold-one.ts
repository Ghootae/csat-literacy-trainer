/**
 * 문단 하나의 골드를 1회만 생성한다.
 *
 *   npm run gold1 -- <setId> <bodyParagraphIndex>
 *
 * `agreement`는 재현성 측정용이라 골드 3회 + 테스트 응답 + 평가까지 돌린다. 질의 실험에
 * 쓸 골드 하나만 필요할 때는 이쪽을 쓴다. 저장 경로·슬러그는 agreement와 동일하므로
 * 나중에 같은 문단으로 재현성을 재려면 gold-1은 재사용되고 gold-2,3만 새로 생성된다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { bodyParagraphs } from '@csat/core';

import { loadPassage } from '../adapter.js';
import { type Gold, buildGold } from '../gold.js';

const DATASET = process.env['SUNEUNG_DB'] ?? '/Users/mac/Projects/suneung_db/output';
const CACHE = resolve(process.cwd(), '.omc/agreement');

/** agreement.ts와 동일 — setId를 포함해야 지문 간 문단 id 충돌(s1_p4 등)을 피한다. */
function slug(setId: string, paragraphId: string): string {
  return `${setId}_${paragraphId}`.replace(/[^\w-]/g, '_');
}

async function main(): Promise<void> {
  const setId = process.argv[2];
  const index = Number(process.argv[3] ?? '0');
  if (setId === undefined) {
    console.error('사용법: npm run gold1 -- <setId> <bodyParagraphIndex>');
    process.exit(1);
  }

  const passage = loadPassage(DATASET, setId);
  const paragraph = bodyParagraphs(passage)[index];
  if (paragraph === undefined) {
    console.error(`본문 문단 ${index}가 없다`);
    process.exit(1);
  }

  const key = slug(setId, paragraph.id);
  const goldPath = resolve(CACHE, `${key}.gold-1.json`);

  console.log(`지문: ${passage.title}`);
  console.log(`문단: ${paragraph.id} (${paragraph.text.length}자)  →  ${goldPath}\n`);

  let gold: Gold;
  if (existsSync(goldPath)) {
    gold = JSON.parse(readFileSync(goldPath, 'utf8')) as Gold;
    console.log('캐시 재사용 (기존 골드 유지 — 실험 기준선 보호)');
  } else {
    gold = await buildGold(paragraph.text, passage.tags, paragraph.id, resolve(CACHE, `${key}.gold-1.steps`));
    mkdirSync(dirname(goldPath), { recursive: true });
    writeFileSync(goldPath, `${JSON.stringify(gold, null, 2)}\n`, 'utf8');
  }

  console.log(`\n문장 ${gold.sentences.length} / 명제 ${gold.propositions.length} / 슬롯 ${gold.slots.length}`);
  for (const s of gold.sentences) console.log(`  ${s.id}: ${s.text}`);
  console.log('\n명제:');
  for (const p of gold.propositions) {
    console.log(`  ${p.id} [${p.aspect}] ${p.shortForm}  (${p.sourceSentences.join(',')})`);
    console.log(`      ${p.text}`);
  }
  console.log('\n슬롯:');
  for (const s of gold.slots) {
    console.log(`  ${s.slotId} "${s.shortForm}"  명제=[${s.traceabilityPropositions.join(',')}]  문장=[${s.sentences.join(',')}]`);
    for (const c of s.requiredReasoningCore) console.log(`      - ${c}`);
  }
  console.log('\n관계 간선:');
  for (const e of gold.evaluationLinks) console.log(`  [eval] ${e.source} →(${e.relation})→ ${e.target}  witness=${e.witness ?? ''}`);
  for (const e of gold.discourseLinks) console.log(`  [disc] ${e.source} →(${e.relation})→ ${e.target}`);
  if (gold.log.length > 0) {
    console.log('\n정규화 로그:');
    for (const l of gold.log) console.log(`  * ${l}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
