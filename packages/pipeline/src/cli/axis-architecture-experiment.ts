import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';

import {
  decomposeCentralStoryWithOpenAI,
  loadCentralAxisDecompositionPrompt,
  type CentralAxisDecompositionEffort,
} from '../central-axis-decomposition/evaluator.js';
import {
  CentralAxisDecompositionInputSchema,
  type CentralAxisDecompositionInput,
} from '../central-axis-decomposition/schema.js';
import {
  loadAxisRelationMappingPrompt,
  mapRelationsToFixedAxesWithOpenAI,
} from '../axis-relation-mapping/evaluator.js';
import {
  AxisRelationMappingInputSchema,
  mergeAxesAndRelationMapping,
} from '../axis-relation-mapping/schema.js';

interface SourceCandidate {
  readonly axisInput: CentralAxisDecompositionInput;
  readonly coreRelations: Array<{ id: string; description: string }>;
}

interface Config {
  readonly inputRoot: string;
  readonly outputRoot: string;
  readonly model: string;
  readonly effort: CentralAxisDecompositionEffort;
  readonly concurrency: number;
}

type Outcome = 'ready' | 'review' | 'failed' | 'skipped';

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function extractAxisArchitectureCandidate(value: unknown): SourceCandidate {
  const root = objectValue(value);
  if (root === null) throw new Error('axis architecture: JSON object expected');
  const stages = objectValue(root['stages']);
  const analysis = stages === null ? null : objectValue(stages['analysis']);
  const analysisResult = analysis === null ? null : objectValue(analysis['result']);
  const result = objectValue(root['result']);
  const diagnosticGold = objectValue(root['diagnosticGold']) ??
    (result === null ? null : objectValue(result['diagnosticGold'])) ??
    (analysisResult === null ? null : objectValue(analysisResult['diagnosticGold']));
  const source = diagnosticGold ?? analysisResult ?? result ?? root;
  const axisInput = CentralAxisDecompositionInputSchema.parse({
    paragraphId: source['paragraphId'],
    centralStory: source['centralStory'],
  });
  const relations = source['coreRelations'];
  const parsed = AxisRelationMappingInputSchema.shape.coreRelations.parse(relations);
  return { axisInput, coreRelations: parsed };
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

function jsonFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) return path.endsWith('.json') ? [path] : [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) return jsonFiles(child);
    return entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'manifest.json'
      ? [child]
      : [];
  });
}

function positiveInteger(value: string, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${field} must be positive`);
  return number;
}

function parseArgs(argv: readonly string[]): Config {
  let inputRoot = '.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26';
  let outputRoot = '.omc/adhoc/axis-architecture-v2-six-3x-2026-08-26';
  let model = 'gpt-5.6-sol';
  let effort: CentralAxisDecompositionEffort = 'medium';
  let concurrency = 3;
  for (const arg of argv) {
    if (arg.startsWith('--input=')) inputRoot = arg.slice('--input='.length);
    else if (arg.startsWith('--output=')) outputRoot = arg.slice('--output='.length);
    else if (arg.startsWith('--model=')) model = arg.slice('--model='.length);
    else if (arg.startsWith('--effort=')) {
      const value = arg.slice('--effort='.length);
      if (value !== 'medium' && value !== 'high') throw new Error(`unsupported effort: ${value}`);
      effort = value;
    } else if (arg.startsWith('--concurrency=')) {
      concurrency = positiveInteger(arg.slice('--concurrency='.length), 'concurrency');
    } else throw new Error(`unknown option: ${arg}`);
  }
  return {
    inputRoot: resolve(process.cwd(), inputRoot),
    outputRoot: resolve(process.cwd(), outputRoot),
    model,
    effort,
    concurrency,
  };
}

async function runOne(sourcePath: string, config: Config): Promise<Outcome> {
  let candidate: SourceCandidate;
  try {
    candidate = extractAxisArchitectureCandidate(readJson(sourcePath));
  } catch (error) {
    console.warn(`skip ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    return 'skipped';
  }
  const relativePath = relative(config.inputRoot, sourcePath);
  const outputPath = resolve(config.outputRoot, relativePath);
  const failurePath = resolve(config.outputRoot, 'failures', relativePath);
  if (existsSync(outputPath)) {
    console.log(`exists ${relativePath}`);
    return 'skipped';
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      console.log(`decompose ${relativePath} (${attempt}/2)`);
      const decomposition = await decomposeCentralStoryWithOpenAI(candidate.axisInput, config);
      let mapping = null;
      let mappedCentralAxes = null;
      if (decomposition.result.verdict === 'READY') {
        const mappingInput = AxisRelationMappingInputSchema.parse({
          ...candidate.axisInput,
          centralAxes: decomposition.result.centralAxes,
          coreRelations: candidate.coreRelations,
        });
        console.log(`map ${relativePath} (${attempt}/2)`);
        mapping = await mapRelationsToFixedAxesWithOpenAI(mappingInput, config);
        mappedCentralAxes = mergeAxesAndRelationMapping(mappingInput, mapping.result);
      }
      const verdict = decomposition.result.verdict === 'READY' && mapping?.result.verdict === 'READY'
        ? 'READY'
        : 'NEEDS_REVIEW';
      writeJson(outputPath, {
        artifactType: 'axis-architecture-v2-candidate',
        calledAt: new Date().toISOString(),
        sourcePath,
        sourceInputHash: hash(JSON.stringify(candidate)),
        promptHashes: {
          decomposition: hash(loadCentralAxisDecompositionPrompt()),
          mapping: hash(loadAxisRelationMappingPrompt()),
        },
        attempt,
        model: config.model,
        effort: config.effort,
        verdict,
        input: candidate,
        stages: { decomposition, mapping },
        mappedCentralAxes,
      });
      console.log(
        `done ${relativePath}: ${verdict}, axes=${decomposition.result.centralAxes.length}`,
      );
      return verdict === 'READY' ? 'ready' : 'review';
    } catch (error) {
      lastError = error;
      console.warn(
        `failed ${relativePath} (${attempt}/2): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  writeJson(failurePath, {
    artifactType: 'axis-architecture-v2-failure',
    failedAt: new Date().toISOString(),
    sourcePath,
    paragraphId: candidate.axisInput.paragraphId,
    error: lastError instanceof Error
      ? { name: lastError.name, message: lastError.message, stack: lastError.stack ?? null }
      : { name: 'UnknownError', message: String(lastError), stack: null },
  });
  return 'failed';
}

async function worker(queue: string[], config: Config, outcomes: Outcome[]): Promise<void> {
  while (queue.length > 0) {
    const path = queue.shift();
    if (path !== undefined) outcomes.push(await runOne(path, config));
  }
}

async function main(): Promise<void> {
  if (process.env['OPENAI_API_KEY'] === undefined) throw new Error('OPENAI_API_KEY is missing');
  const config = parseArgs(process.argv.slice(2));
  if (!existsSync(config.inputRoot)) throw new Error(`input not found: ${config.inputRoot}`);
  mkdirSync(config.outputRoot, { recursive: true });
  const paths = jsonFiles(config.inputRoot).sort();
  const queue = [...paths];
  const outcomes: Outcome[] = [];
  await Promise.all(Array.from(
    { length: Math.min(config.concurrency, Math.max(queue.length, 1)) },
    () => worker(queue, config, outcomes),
  ));
  const summary = {
    artifactType: 'axis-architecture-v2-manifest',
    completedAt: new Date().toISOString(),
    inputRoot: config.inputRoot,
    outputRoot: config.outputRoot,
    model: config.model,
    effort: config.effort,
    concurrency: config.concurrency,
    discovered: paths.length,
    ready: outcomes.filter((value) => value === 'ready').length,
    needsReview: outcomes.filter((value) => value === 'review').length,
    failed: outcomes.filter((value) => value === 'failed').length,
    skipped: outcomes.filter((value) => value === 'skipped').length,
  };
  writeJson(resolve(config.outputRoot, 'manifest.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

if (basename(process.argv[1] ?? '') === 'axis-architecture-experiment.js') {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
