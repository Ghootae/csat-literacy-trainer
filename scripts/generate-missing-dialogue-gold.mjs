import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { analyzeParagraphWithOpenAI } from '../packages/pipeline/dist/paragraph-analysis/evaluator.js';

const projectRoot = process.cwd();
const passageRoot = resolve(
  projectRoot,
  'packages/pipeline/fixtures/experiments/dialogue/passages',
);
const goldRoot = resolve(
  projectRoot,
  'packages/pipeline/fixtures/experiments/dialogue/gold-v2',
);
const artifactRoot = resolve(projectRoot, '.omc/adhoc/dialogue-full-passage-gold-2026-08-25');
const passageIds = [
  'corporate-law',
  'surface-tension-laplace',
  'information-asymmetry-free-marketplace',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) => ({ id: `S${index + 1}`, text: value }));
}

async function analyze(task) {
  const targetPath = resolve(goldRoot, `${task.paragraph.paragraphId}.json`);
  if (existsSync(targetPath)) {
    console.log(`건너뜀 ${task.paragraph.paragraphId}: 골드 존재`);
    return;
  }

  console.log(`호출 시작 ${task.paragraph.paragraphId}`);
  const input = {
    paragraphId: task.paragraph.paragraphId,
    paragraphText: task.paragraph.text,
    sentences: sentences(task.paragraph.text),
    passageParagraphs: task.passage.paragraphs.map(({ paragraphId, text }) => ({
      paragraphId,
      text,
    })),
    fullPassageAvailable: true,
  };
  const calledAt = new Date().toISOString();
  const call = await analyzeParagraphWithOpenAI(input, {
    model: 'gpt-5.6-sol',
    effort: 'medium',
    promptVersion: 'paragraph-analysis-prompt-v2',
  });
  writeJson(resolve(artifactRoot, `${task.paragraph.paragraphId}.json`), {
    calledAt,
    ...call.metadata,
    result: call.result,
  });
  writeJson(targetPath, call.result.diagnosticGold);
  console.log(
    `완료 ${task.paragraph.paragraphId}: ${call.metadata.durationMs}ms, ` +
      `in=${call.metadata.usage.inputTokens}, out=${call.metadata.usage.outputTokens}`,
  );
}

async function worker(queue) {
  while (queue.length > 0) {
    const task = queue.shift();
    if (task !== undefined) await analyze(task);
  }
}

async function main() {
  if (process.env.OPENAI_API_KEY === undefined) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  const tasks = passageIds.flatMap((passageId) => {
    const passage = readJson(resolve(passageRoot, `${passageId}.json`));
    return passage.paragraphs.map((paragraph) => ({ passage, paragraph }));
  });
  await Promise.all([worker(tasks), worker(tasks), worker(tasks)]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
