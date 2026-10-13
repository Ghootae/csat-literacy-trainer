import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import { TwoStageDialogueEvaluator } from '../dialogue-experiment/two-stage-evaluator.js';

interface SourceSession {
  readonly sessionId: string;
  readonly paragraphId: string;
  readonly initialResponse: string;
  readonly history: readonly {
    readonly question: { readonly type: 'DIAGNOSTIC' | 'CORRECTIVE'; readonly text: string };
    readonly answer: string;
  }[];
  readonly lastEvaluation?: { readonly status?: string };
}

interface Config {
  readonly inputRoot: string;
  readonly outputRoot: string;
  readonly goldRoot: string;
  readonly concurrency: number;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function parseSourceSession(value: unknown): SourceSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('live replay: session object expected');
  }
  const source = value as Record<string, unknown>;
  if (
    typeof source['sessionId'] !== 'string' ||
    typeof source['paragraphId'] !== 'string' ||
    typeof source['initialResponse'] !== 'string' ||
    !Array.isArray(source['history'])
  ) {
    throw new Error('live replay: malformed session');
  }
  return value as SourceSession;
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error('concurrency must be positive');
  return parsed;
}

function parseArgs(argv: readonly string[]): Config {
  let inputRoot = '.omc/adhoc/dialogue-live-participant';
  let outputRoot = '.omc/adhoc/dialogue-live-participant-axis-replay-2026-08-26';
  let goldRoot = 'packages/pipeline/fixtures/experiments/dialogue/gold-v2';
  let concurrency = 3;
  for (const arg of argv) {
    if (arg.startsWith('--input=')) inputRoot = arg.slice('--input='.length);
    else if (arg.startsWith('--output=')) outputRoot = arg.slice('--output='.length);
    else if (arg.startsWith('--gold=')) goldRoot = arg.slice('--gold='.length);
    else if (arg.startsWith('--concurrency=')) {
      concurrency = positiveInteger(arg.slice('--concurrency='.length));
    } else throw new Error(`unknown option: ${arg}`);
  }
  return {
    inputRoot: resolve(process.cwd(), inputRoot),
    outputRoot: resolve(process.cwd(), outputRoot),
    goldRoot: resolve(process.cwd(), goldRoot),
    concurrency,
  };
}

async function replay(path: string, config: Config): Promise<Record<string, unknown>> {
  const session = parseSourceSession(readJson(path));
  const goldPath = resolve(config.goldRoot, `${session.paragraphId}.json`);
  const sourceGold = readFileSync(goldPath, 'utf8');
  const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(sourceGold));
  const evaluator = new TwoStageDialogueEvaluator({ promptRevision: 'v3' });
  const prefixes = [];
  let previousSnapshot;
  let terminalAt: number | null = null;

  for (let historyLength = 0; historyLength <= session.history.length; historyLength += 1) {
    if (terminalAt !== null) break;
    const history = session.history.slice(0, historyLength);
    const evaluated = await evaluator.evaluate({
      gold,
      goldVersion: 'paragraph-diagnostic-gold-axis-reviewed',
      goldHash: `sha256:${createHash('sha256').update(sourceGold).digest('hex')}`,
      initialResponse: session.initialResponse,
      history,
      turn: historyLength + 1,
      questionsAsked: historyLength,
      maxQuestions: 3,
      ...(previousSnapshot === undefined ? {} : { previousSnapshot }),
    });
    prefixes.push({
      historyLength,
      latestSourceExchange: historyLength === 0 ? null : history[historyLength - 1],
      evaluation: evaluated.result,
      call: evaluated.call,
    });
    previousSnapshot = evaluated.result.snapshot;
    if (evaluated.result.status === 'PASS') terminalAt = historyLength;
  }

  return {
    sourceSessionId: session.sessionId,
    paragraphId: session.paragraphId,
    initialResponse: session.initialResponse,
    sourceHistoryLength: session.history.length,
    sourceFinalStatus: session.lastEvaluation?.status ?? null,
    counterfactualTranscriptReplay: true,
    terminalAtHistoryLength: terminalAt,
    unusedSourceExchanges: terminalAt === null
      ? 0
      : Math.max(0, session.history.length - terminalAt),
    prefixes,
  };
}

async function worker(
  queue: string[],
  config: Config,
  results: Record<string, unknown>[],
  failures: Record<string, unknown>[],
): Promise<void> {
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) return;
    try {
      console.log(`replay ${basename(path)}`);
      const result = await replay(path, config);
      results.push(result);
      writeJson(resolve(config.outputRoot, basename(path)), result);
    } catch (error) {
      failures.push({
        path,
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack ?? null }
          : String(error),
      });
    }
  }
}

async function main(): Promise<void> {
  if (process.env['OPENAI_API_KEY'] === undefined) throw new Error('OPENAI_API_KEY is missing');
  const config = parseArgs(process.argv.slice(2));
  if (!existsSync(config.inputRoot)) throw new Error(`input not found: ${config.inputRoot}`);
  mkdirSync(config.outputRoot, { recursive: true });
  const paths = readdirSync(config.inputRoot)
    .filter((name) => name.endsWith('.json') && name !== 'results.json')
    .map((name) => resolve(config.inputRoot, name))
    .sort();
  const queue = [...paths];
  const results: Record<string, unknown>[] = [];
  const failures: Record<string, unknown>[] = [];
  await Promise.all(Array.from(
    { length: Math.min(config.concurrency, Math.max(queue.length, 1)) },
    () => worker(queue, config, results, failures),
  ));
  results.sort((left, right) => String(left['sourceSessionId']).localeCompare(
    String(right['sourceSessionId']),
  ));
  const manifest = {
    artifactType: 'live-participant-axis-counterfactual-replay',
    generatedAt: new Date().toISOString(),
    inputRoot: config.inputRoot,
    goldRoot: config.goldRoot,
    sessionCount: paths.length,
    successCount: results.length,
    failureCount: failures.length,
    results,
    failures,
  };
  writeJson(resolve(config.outputRoot, 'results.json'), manifest);
  console.log(JSON.stringify({
    sessionCount: manifest.sessionCount,
    successCount: manifest.successCount,
    failureCount: manifest.failureCount,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

if (basename(process.argv[1] ?? '') === 'live-participant-axis-replay.js') {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
