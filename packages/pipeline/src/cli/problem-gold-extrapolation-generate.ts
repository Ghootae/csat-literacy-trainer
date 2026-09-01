import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  generateProblemGoldCandidate,
  type ProblemGoldGenerationSource,
  type ProblemGoldSourceMedia,
} from '../problem-solving/gold-generation-runtime.js';

const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-extrapolation-corpus-v1.json',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);

const CorpusSchema = z.object({
  corpusVersion: z.string(),
  sourceRoot: z.string(),
  items: z.array(z.object({
    caseId: z.string(),
    productId: z.string(),
    questionNumber: z.number().int().positive(),
    coverage: z.array(z.string()),
  })),
});

const QuestionSchema = z.object({
  question_number: z.number().int().positive(),
  points: z.number().optional(),
  title: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  stem: z.string(),
  supplements: z.array(z.object({
    label: z.string(),
    text: z.string(),
    elements: z.array(z.record(z.string(), z.unknown())).default([]),
    image_urls: z.array(z.string().url()).default([]),
  })).default([]),
  choices: z.array(z.object({
    choice_number: z.number().int().positive(),
    text: z.string(),
  })),
  image_urls: z.array(z.string().url()).default([]),
});

const ResultSchema = z.object({
  product_id: z.string(),
  exam: z.string(),
  title: z.string(),
  passage: z.string(),
  image_urls: z.array(z.string().url()).default([]),
  questions: z.array(QuestionSchema),
});

const EnrichmentSchema = z.object({
  product_id: z.string(),
  questions: z.array(z.object({
    question_number: z.number().int().positive(),
    correct_choice: z.number().int().positive(),
    correct_choice_text: z.string(),
  })),
});

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function imageDimensions(bytes: Uint8Array, mimeType: string): {
  width: number;
  height: number;
} {
  if (mimeType.includes('png') && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    const byte = (index: number): number => bytes[index] ?? 0;
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (byte(offset) !== 0xff) break;
      const marker = byte(offset + 1);
      const length = (byte(offset + 2) << 8) + byte(offset + 3);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
        .includes(marker)) {
        return {
          height: (byte(offset + 5) << 8) + byte(offset + 6),
          width: (byte(offset + 7) << 8) + byte(offset + 8),
        };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  throw new Error(`지원하지 않는 이미지 형식 또는 손상된 이미지: ${mimeType}`);
}

function extensionForMime(mimeType: string, url: string): string {
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  return extname(new URL(url).pathname) || '.bin';
}

async function prepareMedia(options: {
  readonly passageImageUrls: readonly string[];
  readonly question: z.infer<typeof QuestionSchema>;
  readonly outputDirectory: string;
}): Promise<ProblemGoldSourceMedia[]> {
  const placements = new Map<string, ProblemGoldSourceMedia['placement']>();
  for (const url of options.passageImageUrls) {
    placements.set(url, { scope: 'PASSAGE' });
  }
  for (const [supplementIndex, supplement] of options.question.supplements.entries()) {
    for (const [elementIndex, element] of supplement.elements.entries()) {
      if (element['kind'] === 'image' && typeof element['src'] === 'string') {
        placements.set(element['src'], { scope: 'SCENARIO', supplementIndex, elementIndex });
      }
    }
    for (const url of supplement.image_urls) {
      placements.set(url, { scope: 'SCENARIO', supplementIndex });
    }
  }
  for (const url of options.question.image_urls) {
    if (!placements.has(url)) placements.set(url, { scope: 'CHOICE' });
  }

  const mediaDirectory = resolve(options.outputDirectory, 'input-media');
  await mkdir(mediaDirectory, { recursive: true });
  const media: ProblemGoldSourceMedia[] = [];
  let index = 0;
  for (const [sourceUrl, placement] of placements) {
    index += 1;
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`이미지 다운로드 실패 ${response.status}: ${sourceUrl}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    const dimensions = imageDimensions(bytes, mimeType);
    const mediaId = `MEDIA${index}`;
    const localPath = resolve(mediaDirectory, `${mediaId}${extensionForMime(mimeType, sourceUrl)}`);
    await writeFile(localPath, bytes);
    media.push({
      mediaId,
      sourceUrl,
      mimeType,
      contentHash: sha256(bytes),
      ...dimensions,
      placement,
    });
  }
  return media;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function generateCase(
  corpus: z.infer<typeof CorpusSchema>,
  item: z.infer<typeof CorpusSchema>['items'][number],
): Promise<{ caseId: string; valid: boolean; errorCount: number }> {
  const outputDirectory = resolve(OUTPUT_ROOT, item.caseId);
  await mkdir(outputDirectory, { recursive: true });
  const firstResponsePath = resolve(outputDirectory, 'first-generation-response.json');
  try {
    await access(firstResponsePath);
    const validation = z.object({
      schemaValid: z.boolean(),
      validationErrors: z.array(z.string()),
    }).parse(await readJson(resolve(outputDirectory, 'initial-validation.json')));
    process.stdout.write(`[preserved] ${item.caseId} 최초 생성 원본을 덮어쓰지 않는다.\n`);
    return {
      caseId: item.caseId,
      valid: validation.schemaValid,
      errorCount: validation.validationErrors.length,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const resultPath = resolve(corpus.sourceRoot, `${item.productId}_result.json`);
  const enrichmentPath = resolve(
    corpus.sourceRoot,
    'enrichment/records',
    `${item.productId}.json`,
  );
  const result = ResultSchema.parse(await readJson(resultPath));
  const enrichment = EnrichmentSchema.parse(await readJson(enrichmentPath));
  const question = result.questions.find(
    (candidate) => candidate.question_number === item.questionNumber,
  );
  const answer = enrichment.questions.find(
    (candidate) => candidate.question_number === item.questionNumber,
  );
  if (question === undefined || answer === undefined) {
    throw new Error(`${item.caseId}: 문항 또는 정답 정보를 찾을 수 없다.`);
  }

  const media = await prepareMedia({
    passageImageUrls: result.image_urls,
    question,
    outputDirectory,
  });
  const source: ProblemGoldGenerationSource = {
    sourceId: item.productId,
    exam: result.exam,
    title: result.title,
    questionNumber: item.questionNumber,
    passage: result.passage,
    question,
    answerKey: {
      correctChoice: answer.correct_choice,
      correctChoiceText: answer.correct_choice_text,
    },
    media,
  };
  await writeFile(
    resolve(outputDirectory, 'source-input.json'),
    `${JSON.stringify({ ...item, source }, null, 2)}\n`,
  );

  const call = await generateProblemGoldCandidate({ source });
  // 최초 공급자 응답은 다른 산출물보다 먼저 별도 파일로 보존한다.
  await writeFile(
    firstResponsePath,
    `${call.rawOutputText}\n`,
  );
  await writeFile(
    resolve(outputDirectory, 'generation-metadata.json'),
    `${JSON.stringify(call.metadata, null, 2)}\n`,
  );
  await writeFile(
    resolve(outputDirectory, 'initial-validation.json'),
    `${JSON.stringify({
      schemaValid: call.validatedGold !== null,
      validationErrors: call.validationErrors,
    }, null, 2)}\n`,
  );
  if (call.validatedGold !== null) {
    await writeFile(
      resolve(outputDirectory, 'first-generation-gold.json'),
      `${JSON.stringify(call.validatedGold, null, 2)}\n`,
    );
  }
  return {
    caseId: item.caseId,
    valid: call.validatedGold !== null,
    errorCount: call.validationErrors.length,
  };
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  await mkdir(OUTPUT_ROOT, { recursive: true });
  if (process.argv.includes('--summarize-only')) {
    const results = await Promise.all(corpus.items.map(async (item) => {
      const directory = resolve(OUTPUT_ROOT, item.caseId);
      const validation = z.object({
        schemaValid: z.boolean(),
        validationErrors: z.array(z.string()),
      }).parse(await readJson(resolve(directory, 'initial-validation.json')));
      const metadata = await readJson(resolve(directory, 'generation-metadata.json'));
      return {
        caseId: item.caseId,
        coverage: item.coverage,
        schemaValid: validation.schemaValid,
        validationErrors: validation.validationErrors,
        metadata,
      };
    }));
    await writeFile(
      resolve(OUTPUT_ROOT, 'generation-summary.json'),
      `${JSON.stringify({ corpusVersion: corpus.corpusVersion, results }, null, 2)}\n`,
    );
    return;
  }
  const onlyCase = process.argv.find((argument) => argument.startsWith('--case='))
    ?.slice('--case='.length);
  const selected = onlyCase === undefined
    ? corpus.items
    : corpus.items.filter((item) => item.caseId === onlyCase);
  if (selected.length === 0) throw new Error(`알 수 없는 caseId: ${onlyCase}`);

  const results: { caseId: string; valid: boolean; errorCount: number }[] = [];
  for (const item of selected) {
    process.stdout.write(`[generate] ${item.caseId}\n`);
    const result = await generateCase(corpus, item);
    results.push(result);
    process.stdout.write(`[saved] ${item.caseId} valid=${result.valid} errors=${result.errorCount}\n`);
  }
  await writeFile(
    resolve(OUTPUT_ROOT, 'generation-summary.json'),
    `${JSON.stringify({ corpusVersion: corpus.corpusVersion, results }, null, 2)}\n`,
  );
}

await main();
