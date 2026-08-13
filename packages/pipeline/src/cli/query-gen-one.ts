/**
 * 검수된 골드 하나에서 production 후보 보존 질의를 생성한다.
 *
 *   npm run qgen:one -- <paragraphId> <goldPath> [run=1]
 *
 * 생성 결과는 기존 실험 fixture와 같은 버전 경로에 보존한다. 이 명령은 질의를 생성할 뿐
 * content/로 승격하지 않는다. 사람이 내용을 검수한 뒤 content-import가 선택한다.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { MODEL } from '../llm/client.js';
import {
  EVAL_SCHEMA_VERSION,
  GENERATOR_VERSION,
  generateQuerySet,
  type GeneratedQuerySet,
} from '../llm/query-gen.js';
import { buildGeneratorInput, type Gold } from '../query-gen-lib.js';

const DIR = resolve(process.cwd(), 'packages/pipeline/fixtures/generated-queries');

function outputName(paragraphId: string, run: string): string {
  const tag = GENERATOR_VERSION === 'v0' ? '' : `-${GENERATOR_VERSION}`;
  return `${paragraphId}${tag}-run${run}.json`;
}

async function main(): Promise<void> {
  const paragraphId = process.argv[2];
  const goldPath = process.argv[3];
  const run = process.argv[4] ?? '1';
  if (paragraphId === undefined || goldPath === undefined) {
    throw new Error('사용법: npm run qgen:one -- <paragraphId> <goldPath> [run=1]');
  }

  const gold = JSON.parse(readFileSync(resolve(process.cwd(), goldPath), 'utf8')) as Gold;
  const input = { ...buildGeneratorInput(gold), paragraphId };
  const generated: GeneratedQuerySet = await generateQuerySet(input);
  const reviewedCandidate = {
    _meta: {
      kind: 'generated',
      run: Number(run),
      generatorVersion: GENERATOR_VERSION,
      schemaVersion: EVAL_SCHEMA_VERSION,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      review: { status: 'unreviewed' },
      note: 'production 후보. 사람 검수 전 content/로 승격하지 않는다.',
    },
    ...generated,
    paragraphId,
  };

  mkdirSync(DIR, { recursive: true });
  const path = resolve(DIR, outputName(paragraphId, run));
  writeFileSync(path, `${JSON.stringify(reviewedCandidate, null, 2)}\n`, 'utf8');

  const queryCount = generated.regions.reduce((sum, region) => sum + region.queries.length, 0);
  console.log(`${paragraphId} → ${path}`);
  console.log(`영역 ${generated.regions.length} · 질의 ${queryCount} · ${GENERATOR_VERSION}/${EVAL_SCHEMA_VERSION}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
