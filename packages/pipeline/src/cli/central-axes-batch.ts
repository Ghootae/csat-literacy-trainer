import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';

import {
  generateCentralAxesWithOpenAI,
  loadCentralAxesPrompt,
  type CentralAxesEffort,
} from '../central-axes/evaluator.js';
import {
  CENTRAL_AXES_SCHEMA_VERSION,
  CentralAxesInputSchema,
  type CentralAxesInput,
} from '../central-axes/schema.js';

interface CliConfig {
  readonly inputPaths: readonly string[];
  readonly outputRoot: string;
  readonly model: string;
  readonly effort: CentralAxesEffort;
  readonly concurrency: number;
}

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function extractCentralAxesInput(value: unknown): CentralAxesInput {
  const root = objectValue(value);
  if (root === null) throw new Error('central axes batch: JSON object expected');
  const result = objectValue(root['result']);
  const diagnosticGold = objectValue(root['diagnosticGold']) ??
    (result === null ? null : objectValue(result['diagnosticGold']));
  const source = diagnosticGold ?? result ?? root;
  return CentralAxesInputSchema.parse({
    paragraphId: source['paragraphId'],
    centralObject: source['centralObject'],
    centralStory: source['centralStory'],
    coreRelations: source['coreRelations'],
  });
}
function jsonFiles(path: string): string[] {
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) throw new Error(`입력 경로가 없습니다: ${absolute}`);
  if (!statSync(absolute).isDirectory()) return extname(absolute) === '.json' ? [absolute] : [];
  return readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const child = resolve(absolute, entry.name);
      if (entry.isDirectory()) return jsonFiles(child);
      return entry.isFile() && extname(entry.name) === '.json' ? [child] : [];
    });
}

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name}은 양의 정수여야 합니다.`);
  return parsed;
}

function parseArgs(argv: readonly string[]): CliConfig {
  const inputPaths: string[] = [];
  let outputRoot = '.omc/adhoc/central-axes-v1';
  let model = 'gpt-5.6-terra';
  let effort: CentralAxesEffort = 'medium';
  let concurrency = 3;

  for (const arg of argv) {
    if (arg.startsWith('--output=')) outputRoot = arg.slice('--output='.length);
    else if (arg.startsWith('--model=')) model = arg.slice('--model='.length);
    else if (arg.startsWith('--effort=')) {
      const value = arg.slice('--effort='.length);
      if (value !== 'medium' && value !== 'high') throw new Error(`지원하지 않는 effort: ${value}`);
      effort = value;
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = positiveInteger(arg.slice('--concurrency='.length), 'concurrency');
    } else if (arg.startsWith('--')) throw new Error(`알 수 없는 옵션: ${arg}`);
    else inputPaths.push(arg);
  }

  return {
    inputPaths: inputPaths.length > 0
      ? inputPaths
      : ['packages/pipeline/fixtures/experiments/dialogue/gold-v2'],
    outputRoot: resolve(process.cwd(), outputRoot),
    model,
    effort,
    concurrency,
  };
}

async function runOne(path: string, config: CliConfig): Promise<'ready' | 'review' | 'failed' | 'skipped'> {
  let input: CentralAxesInput;
  try {
    input = extractCentralAxesInput(readJson(path));
  } catch (error) {
    console.warn(`입력 건너뜀 ${path}: ${error instanceof Error ? error.message : String(error)}`);
    return 'skipped';
  }

  const outputPath = resolve(config.outputRoot, `${input.paragraphId}.json`);
  const failurePath = resolve(config.outputRoot, 'failures', `${input.paragraphId}.json`);
  if (existsSync(outputPath)) {
    console.log(`결과 존재 ${input.paragraphId}`);
    return 'skipped';
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      console.log(`중심축 호출 ${input.paragraphId} (${attempt}/2)`);
      const calledAt = new Date().toISOString();
      const call = await generateCentralAxesWithOpenAI(input, config);
      writeJson(outputPath, {
        artifactType: 'central-axes-candidate',
        calledAt,
        sourcePath: path,
        sourceInputHash: hash(JSON.stringify(input)),
        promptHash: hash(loadCentralAxesPrompt()),
        schemaVersion: CENTRAL_AXES_SCHEMA_VERSION,
        attempt,
        ...call.metadata,
        result: call.result,
      });
      console.log(
        `중심축 완료 ${input.paragraphId}: ${call.result.verdict}, ` +
        `${call.metadata.durationMs}ms, in=${call.metadata.usage.inputTokens}, ` +
        `out=${call.metadata.usage.outputTokens}`,
      );
      return call.result.verdict === 'READY' ? 'ready' : 'review';
    } catch (error) {
      lastError = error;
      console.warn(
        `중심축 실패 ${input.paragraphId} (${attempt}/2): ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  writeJson(failurePath, {
    artifactType: 'central-axes-failure',
    failedAt: new Date().toISOString(),
    sourcePath: path,
    sourceInputHash: hash(JSON.stringify(input)),
    paragraphId: input.paragraphId,
    attempts: 2,
    error: lastError instanceof Error
      ? { name: lastError.name, message: lastError.message, stack: lastError.stack ?? null }
      : { name: 'UnknownError', message: String(lastError), stack: null },
  });
  return 'failed';
}

async function worker(
  queue: string[],
  config: CliConfig,
  results: Array<'ready' | 'review' | 'failed' | 'skipped'>,
): Promise<void> {
  while (queue.length > 0) {
    const path = queue.shift();
    if (path !== undefined) results.push(await runOne(path, config));
  }
}

async function main(): Promise<void> {
  if (process.env['OPENAI_API_KEY'] === undefined) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }
  const config = parseArgs(process.argv.slice(2));
  mkdirSync(config.outputRoot, { recursive: true });
  const paths = [...new Set(config.inputPaths.flatMap(jsonFiles))].sort();
  const queue = [...paths];
  const results: Array<'ready' | 'review' | 'failed' | 'skipped'> = [];
  await Promise.all(
    Array.from({ length: Math.min(config.concurrency, Math.max(queue.length, 1)) }, () =>
      worker(queue, config, results)),
  );
  const summary = {
    artifactType: 'central-axes-batch-manifest',
    completedAt: new Date().toISOString(),
    inputPaths: config.inputPaths,
    outputRoot: config.outputRoot,
    model: config.model,
    effort: config.effort,
    concurrency: config.concurrency,
    discoveredJsonFiles: paths.length,
    ready: results.filter((result) => result === 'ready').length,
    needsReview: results.filter((result) => result === 'review').length,
    failed: results.filter((result) => result === 'failed').length,
    skipped: results.filter((result) => result === 'skipped').length,
  };
  writeJson(resolve(config.outputRoot, 'manifest.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

if (basename(process.argv[1] ?? '') === 'central-axes-batch.js') {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
