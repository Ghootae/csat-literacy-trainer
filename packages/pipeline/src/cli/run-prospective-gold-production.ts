import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { z } from 'zod/v4';

import type { ProblemQuestionGold } from '../problem-solving/gold.js';
import {
  generateProblemGoldCandidate,
  validateProblemGoldCandidate,
  type ProblemGoldGenerationSource,
  type ProblemGoldSourceMedia,
} from '../problem-solving/gold-generation-runtime.js';
import {
  GoldProductionMeasurementSchema,
  ProspectiveGoldSampleManifestSchema,
  ProspectiveSampleItemSchema,
  SufficientGroundSetCandidateSchema,
  createPendingProspectiveGoldReview,
  deriveSufficientGroundSetCandidates,
  summarizeGoldProduction,
  type GoldProductionMeasurement,
  type ProspectiveGoldSampleManifest,
} from '../problem-solving/prospective-gold-experiment.js';

const DEFAULT_MANIFEST = resolve(
  'packages/pipeline/experiments/problem-solving/prospective-gold-sample-v1.json',
);
const DEFAULT_OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production',
);

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

type SampleItem = z.infer<typeof ProspectiveSampleItemSchema>;

function option(name: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function expectedSourceHash(
  resultText: string,
  enrichmentText: string,
  questionNumber: number,
): string {
  return sha256(`${resultText}\n${enrichmentText}\nquestion=${questionNumber}`);
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
  for (const url of options.passageImageUrls) placements.set(url, { scope: 'PASSAGE' });
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

async function loadSource(
  item: SampleItem,
  outputDirectory: string,
): Promise<ProblemGoldGenerationSource> {
  const [resultText, enrichmentText] = await Promise.all([
    readFile(item.resultFile, 'utf8'),
    readFile(item.enrichmentFile, 'utf8'),
  ]);
  const actualHash = expectedSourceHash(resultText, enrichmentText, item.questionNumber);
  if (actualHash !== item.sourceHash) {
    throw new Error(`${item.caseId}: manifest 생성 이후 원천이 변경되었다.`);
  }
  const result = ResultSchema.parse(JSON.parse(resultText));
  const enrichment = EnrichmentSchema.parse(JSON.parse(enrichmentText));
  if (result.product_id !== item.productId || enrichment.product_id !== item.productId) {
    throw new Error(`${item.caseId}: productId가 원천과 일치하지 않는다.`);
  }
  const question = result.questions.find((candidate) =>
    candidate.question_number === item.questionNumber);
  const answer = enrichment.questions.find((candidate) =>
    candidate.question_number === item.questionNumber);
  if (question === undefined || answer === undefined) {
    throw new Error(`${item.caseId}: 문항 또는 정답 정보를 찾을 수 없다.`);
  }
  const media = await prepareMedia({
    passageImageUrls: result.image_urls,
    question,
    outputDirectory,
  });
  return {
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
}

function estimateCost(options: {
  readonly inputTokens: number;
  readonly cacheReadTokens: number;
  readonly outputTokens: number;
  readonly inputUsdPerMillion: number | null;
  readonly cachedInputUsdPerMillion: number | null;
  readonly outputUsdPerMillion: number | null;
}): number | null {
  if (
    options.inputUsdPerMillion === null ||
    options.cachedInputUsdPerMillion === null ||
    options.outputUsdPerMillion === null
  ) return null;
  const uncachedInputTokens = Math.max(0, options.inputTokens - options.cacheReadTokens);
  return Number((
    uncachedInputTokens / 1_000_000 * options.inputUsdPerMillion +
    options.cacheReadTokens / 1_000_000 * options.cachedInputUsdPerMillion +
    options.outputTokens / 1_000_000 * options.outputUsdPerMillion
  ).toFixed(6));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runCase(options: {
  readonly item: SampleItem;
  readonly outputRoot: string;
  readonly execute: boolean;
  readonly model?: string;
  readonly inputUsdPerMillion: number | null;
  readonly cachedInputUsdPerMillion: number | null;
  readonly outputUsdPerMillion: number | null;
}): Promise<GoldProductionMeasurement | null> {
  const outputDirectory = resolve(options.outputRoot, 'artifacts', options.item.caseId);
  await mkdir(outputDirectory, { recursive: true });
  const measurementPath = resolve(outputDirectory, 'production-measurement.json');
  if (await fileExists(measurementPath)) {
    const existing = GoldProductionMeasurementSchema.parse(
      JSON.parse(await readFile(measurementPath, 'utf8')),
    );
    const rawResponsePath = resolve(outputDirectory, 'first-generation-response.json');
    const sourceInputPath = resolve(outputDirectory, 'source-input.json');
    if (!existing.schemaValid &&
      await fileExists(rawResponsePath) &&
      await fileExists(sourceInputPath)) {
      const stored = JSON.parse(await readFile(sourceInputPath, 'utf8')) as {
        source: ProblemGoldGenerationSource;
      };
      const rawOutput = JSON.parse(await readFile(rawResponsePath, 'utf8')) as unknown;
      const validation = validateProblemGoldCandidate(rawOutput, stored.source);
      await writeFile(
        resolve(outputDirectory, 'initial-validation.json'),
        `${JSON.stringify({
          rawSchemaValid: validation.rawValidationErrors.length === 0,
          rawValidationErrors: validation.rawValidationErrors,
          normalizationChanges: validation.normalizationChanges,
          schemaValid: validation.validatedGold !== null,
          validationErrors: validation.validationErrors,
        }, null, 2)}\n`,
      );
      if (validation.validatedGold !== null) {
        await writeFile(
          resolve(outputDirectory, 'candidate-gold.json'),
          `${JSON.stringify(validation.validatedGold, null, 2)}\n`,
        );
        const candidates = deriveSufficientGroundSetCandidates(validation.validatedGold);
        await writeFile(
          resolve(outputDirectory, 'sufficient-ground-candidates.json'),
          `${JSON.stringify(candidates, null, 2)}\n`,
        );
        await writeFile(
          resolve(outputDirectory, 'human-review.json'),
          `${JSON.stringify(createPendingProspectiveGoldReview({
            caseId: options.item.caseId,
            gold: validation.validatedGold,
            candidates,
          }), null, 2)}\n`,
        );
      }
      const recovered = GoldProductionMeasurementSchema.parse({
        ...existing,
        rawSchemaValid: validation.rawValidationErrors.length === 0,
        schemaValid: validation.validatedGold !== null,
        automaticNormalizationCount: validation.normalizationChanges.length,
        riskLevel: validation.validatedGold === null ? 'HIGH' : 'MEDIUM',
      });
      await writeFile(measurementPath, `${JSON.stringify(recovered, null, 2)}\n`);
      await writeFile(
        resolve(outputDirectory, 'production-status.json'),
        `${JSON.stringify({
          status: recovered.schemaValid ? 'PENDING_HUMAN_REVIEW' : 'REQUIRES_HUMAN_CORRECTION',
          caseId: options.item.caseId,
        }, null, 2)}\n`,
      );
      process.stdout.write(`[revalidated] ${options.item.caseId}\n`);
      return recovered;
    }
    const candidateGoldPath = resolve(outputDirectory, 'candidate-gold.json');
    const candidateSetsPath = resolve(outputDirectory, 'sufficient-ground-candidates.json');
    const reviewPath = resolve(outputDirectory, 'human-review.json');
    if (existing.schemaValid &&
      await fileExists(candidateGoldPath) &&
      await fileExists(candidateSetsPath) &&
      await fileExists(reviewPath)) {
      const currentReview = JSON.parse(await readFile(reviewPath, 'utf8')) as { status?: unknown };
      if (currentReview.status === 'PENDING') {
        const gold = JSON.parse(await readFile(candidateGoldPath, 'utf8')) as ProblemQuestionGold;
        const candidates = SufficientGroundSetCandidateSchema.array().parse(
          JSON.parse(await readFile(candidateSetsPath, 'utf8')),
        );
        await writeFile(reviewPath, `${JSON.stringify(createPendingProspectiveGoldReview({
          caseId: options.item.caseId,
          gold,
          candidates,
        }), null, 2)}\n`);
      }
    }
    await writeFile(
      resolve(outputDirectory, 'production-status.json'),
      `${JSON.stringify({
        status: existing.schemaValid ? 'PENDING_HUMAN_REVIEW' : 'REQUIRES_HUMAN_CORRECTION',
        caseId: options.item.caseId,
      }, null, 2)}\n`,
    );
    process.stdout.write(`[preserved] ${options.item.caseId}\n`);
    return existing;
  }
  const source = await loadSource(options.item, outputDirectory);
  await writeFile(
    resolve(outputDirectory, 'source-input.json'),
    `${JSON.stringify({ sample: options.item, source }, null, 2)}\n`,
  );
  if (!options.execute) {
    await writeFile(
      resolve(outputDirectory, 'production-status.json'),
      `${JSON.stringify({ status: 'READY_FOR_GENERATION', caseId: options.item.caseId }, null, 2)}\n`,
    );
    return null;
  }

  const call = await generateProblemGoldCandidate({
    source,
    ...(options.model === undefined ? {} : { model: options.model }),
  });
  // 공급자 최초 응답은 다른 파싱·검수 산출물보다 먼저 보존한다.
  await writeFile(resolve(outputDirectory, 'first-generation-response.json'), `${call.rawOutputText}\n`);
  await writeFile(
    resolve(outputDirectory, 'generation-metadata.json'),
    `${JSON.stringify(call.metadata, null, 2)}\n`,
  );
  await writeFile(
    resolve(outputDirectory, 'initial-validation.json'),
    `${JSON.stringify({
      rawSchemaValid: call.rawValidationErrors.length === 0,
      rawValidationErrors: call.rawValidationErrors,
      normalizationChanges: call.normalizationChanges,
      schemaValid: call.validatedGold !== null,
      validationErrors: call.validationErrors,
    }, null, 2)}\n`,
  );

  let riskLevel: GoldProductionMeasurement['riskLevel'] = call.validatedGold === null
    ? 'HIGH'
    : 'LOW';
  if (call.validatedGold !== null) {
    await writeFile(
      resolve(outputDirectory, 'candidate-gold.json'),
      `${JSON.stringify(call.validatedGold, null, 2)}\n`,
    );
    const candidates = deriveSufficientGroundSetCandidates(call.validatedGold);
    await writeFile(
      resolve(outputDirectory, 'sufficient-ground-candidates.json'),
      `${JSON.stringify(candidates, null, 2)}\n`,
    );
    const review = createPendingProspectiveGoldReview({
      caseId: options.item.caseId,
      gold: call.validatedGold,
      candidates,
    });
    await writeFile(
      resolve(outputDirectory, 'human-review.json'),
      `${JSON.stringify(review, null, 2)}\n`,
    );
    const flags = new Set(candidates.flatMap((candidate) => candidate.riskFlags));
    riskLevel = flags.has('ANSWER_KEY_CONSTRAINED') || flags.has('DOES_NOT_JUSTIFY')
      ? 'HIGH'
      : flags.size > 0
        ? 'MEDIUM'
        : 'LOW';
  }
  const measurement = GoldProductionMeasurementSchema.parse({
    caseId: options.item.caseId,
    generationCalls: 1,
    generationDurationMs: call.metadata.durationMs,
    inputTokens: call.metadata.usage.inputTokens,
    cacheReadTokens: call.metadata.usage.cacheReadTokens,
    outputTokens: call.metadata.usage.outputTokens,
    estimatedCostUsd: estimateCost({
      inputTokens: call.metadata.usage.inputTokens,
      cacheReadTokens: call.metadata.usage.cacheReadTokens,
      outputTokens: call.metadata.usage.outputTokens,
      inputUsdPerMillion: options.inputUsdPerMillion,
      cachedInputUsdPerMillion: options.cachedInputUsdPerMillion,
      outputUsdPerMillion: options.outputUsdPerMillion,
    }),
    rawSchemaValid: call.rawValidationErrors.length === 0,
    schemaValid: call.validatedGold !== null,
    automaticNormalizationCount: call.normalizationChanges.length,
    reviewStatus: 'PENDING',
    reviewMinutes: 0,
    modifiedFieldCount: 0,
    modifiedInferenceCount: 0,
    riskLevel,
  });
  await writeFile(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`);
  await writeFile(
    resolve(outputDirectory, 'production-status.json'),
    `${JSON.stringify({
      status: measurement.schemaValid ? 'PENDING_HUMAN_REVIEW' : 'REQUIRES_HUMAN_CORRECTION',
      caseId: options.item.caseId,
    }, null, 2)}\n`,
  );
  return measurement;
}

function optionalRate(name: string): number | null {
  const raw = option(name);
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name}은 0 이상의 숫자여야 한다.`);
  return value;
}

async function main(): Promise<void> {
  const manifestPath = resolve(option('--manifest') ?? DEFAULT_MANIFEST);
  const outputRoot = resolve(option('--output-root') ?? DEFAULT_OUTPUT_ROOT);
  const execute = process.argv.includes('--execute');
  const onlyCase = option('--case');
  const model = option('--model');
  const concurrency = Number(option('--concurrency') ?? (execute ? 3 : 1));
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
    throw new Error('--concurrency는 1~6 사이의 정수여야 한다.');
  }
  const inputUsdPerMillion = optionalRate('--input-usd-per-million');
  const cachedInputUsdPerMillion = optionalRate('--cached-input-usd-per-million');
  const outputUsdPerMillion = optionalRate('--output-usd-per-million');
  const suppliedRateCount = [inputUsdPerMillion, cachedInputUsdPerMillion, outputUsdPerMillion]
    .filter((rate) => rate !== null).length;
  if (suppliedRateCount !== 0 && suppliedRateCount !== 3) {
    throw new Error('비용 계산에는 일반 입력·캐시 입력·출력 백만 토큰당 단가를 모두 제공해야 한다.');
  }
  const manifest: ProspectiveGoldSampleManifest = ProspectiveGoldSampleManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')),
  );
  const selected = onlyCase === undefined
    ? manifest.items
    : manifest.items.filter((item) => item.caseId === onlyCase);
  if (selected.length === 0) throw new Error(`manifest에 없는 caseId: ${onlyCase}`);
  await mkdir(outputRoot, { recursive: true });
  const measurements: GoldProductionMeasurement[] = [];
  const failures: Array<{ caseId: string; name: string; message: string }> = [];
  for (let offset = 0; offset < selected.length; offset += concurrency) {
    const chunk = selected.slice(offset, offset + concurrency);
    const results = await Promise.all(chunk.map(async (item, chunkIndex) => {
      process.stdout.write(
        `[${offset + chunkIndex + 1}/${selected.length}] ${execute ? 'generate' : 'prepare'} ${item.caseId}\n`,
      );
      try {
        return await runCase({
          item,
          outputRoot,
          execute,
          ...(model === undefined ? {} : { model }),
          inputUsdPerMillion,
          cachedInputUsdPerMillion,
          outputUsdPerMillion,
        });
      } catch (error) {
        const failure = {
          caseId: item.caseId,
          name: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
        };
        failures.push(failure);
        const directory = resolve(outputRoot, 'artifacts', item.caseId);
        await mkdir(directory, { recursive: true });
        await writeFile(
          resolve(directory, 'production-error.json'),
          `${JSON.stringify(failure, null, 2)}\n`,
        );
        process.stdout.write(`[failed] ${item.caseId}: ${failure.message}\n`);
        return null;
      }
    }));
    measurements.push(...results.filter(
      (measurement): measurement is GoldProductionMeasurement => measurement !== null,
    ));
  }
  const summary = {
    manifestVersion: manifest.manifestVersion,
    mode: execute ? 'GENERATE' : 'PREPARE_ONLY',
    selectedCount: selected.length,
    measuredCount: measurements.length,
    failureCount: failures.length,
    failures,
    ...(execute ? { production: summarizeGoldProduction(measurements) } : {}),
  };
  await writeFile(resolve(outputRoot, 'production-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
