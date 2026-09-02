import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from '../problem-solving/gold.js';
import {
  createProblemPathEvaluatorInput,
  type ProblemPathEvaluationContext,
} from '../problem-solving/path-evaluator-input.js';
import { OpenAIProblemPathEvaluator } from '../problem-solving/path-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from '../problem-solving/session.js';

const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-explanation-cycle-corpus-v1.json',
);
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const PREVIOUS_ROOT = GOLD_ROOT;
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-evaluator-four-route-wrong-probes-2026-09-02',
);
const REPEATS = 3;

const CorpusSchema = z.object({
  baselineExperimentRoot: z.string(),
  items: z.array(z.object({ caseId: z.string() })),
});

const StudentCasesSchema = z.object({
  representativeWrong: z.object({
    choiceId: z.string(),
    rationale: z.string(),
  }),
});

interface ProbeResult {
  readonly caseId: string;
  readonly iteration: number;
  readonly choiceId: string;
  readonly rationale: string;
  readonly evaluationContext: ProblemPathEvaluationContext;
  readonly passed: boolean;
  readonly observed: string;
  readonly result?: unknown;
  readonly rawOutput?: unknown;
  readonly call?: unknown;
  readonly error?: string;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strictWrongDiagnosis(resultValue: unknown): {
  readonly passed: boolean;
  readonly observed: string;
} {
  if (!isRecord(resultValue) || resultValue['mode'] !== 'DIAGNOSE_PATH') {
    return { passed: false, observed: 'ERROR' };
  }
  const targets = Array.isArray(resultValue['targets'])
    ? resultValue['targets'].filter(isRecord)
    : [];
  const selected = targets.find((target) => target['kind'] === 'SELECTED_CHOICE');
  const action = isRecord(resultValue['nextActionCandidate'])
    ? resultValue['nextActionCandidate']
    : {};
  const observed = [
    selected?.['status'] ?? 'MISSING',
    selected?.['errorAssessment'] ?? 'NULL',
    action['type'] ?? 'MISSING',
  ].join('|');
  return {
    passed: selected?.['status'] === 'SUFFICIENT' &&
      selected['errorAssessment'] === 'CLEAR_ERROR' &&
      action['type'] === 'ASK_CORRECTIVE' &&
      action['target'] === 'SELECTED_CHOICE',
    observed,
  };
}

async function runProbe(options: {
  readonly caseId: string;
  readonly iteration: number;
  readonly gold: ProblemQuestionGold;
  readonly response: { choiceId: string; rationale: string };
}): Promise<ProbeResult> {
  const session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `${options.caseId}-four-route-wrong-${options.iteration}`,
    questionId: options.gold.questionId,
    answerChoiceId: options.gold.answerChoiceId,
  }), {
    initialChoiceId: options.response.choiceId,
    rationale: options.response.rationale,
  });
  const input = createProblemPathEvaluatorInput({
    evaluationMode: 'DIAGNOSE_PATH',
    session,
    gold: options.gold,
  });
  const base = {
    caseId: options.caseId,
    iteration: options.iteration,
    choiceId: options.response.choiceId,
    rationale: options.response.rationale,
    evaluationContext: input.evaluationContext,
  };
  try {
    const evaluator = new OpenAIProblemPathEvaluator({
      effort: 'medium',
      timeoutMs: 120_000,
    });
    const evaluation = await evaluator.evaluate(input);
    const grade = strictWrongDiagnosis(evaluation.result);
    return {
      ...base,
      ...grade,
      result: evaluation.result,
      rawOutput: evaluation.rawOutput,
      call: evaluation.call,
    };
  } catch (error) {
    return {
      ...base,
      passed: false,
      observed: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function previousStrictResults(value: unknown): { passed: number; total: number } {
  if (!isRecord(value) || !Array.isArray(value['results'])) return { passed: 0, total: 0 };
  const selected = value['results'].filter((entry) => (
    isRecord(entry) && entry['category'] === 'representativeWrong'
  ));
  return {
    passed: selected.filter((entry) => (
      isRecord(entry) && strictWrongDiagnosis(entry['result']).passed
    )).length,
    total: selected.length,
  };
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const results: ProbeResult[] = [];
  const previousByCase: Record<string, { passed: number; total: number }> = {};
  const goldHashes: Record<string, string> = {};

  const jobs = await Promise.all(corpus.items.map(async ({ caseId }) => {
    const goldPath = resolve(GOLD_ROOT, caseId, 'c-gold.json');
    const rawGold = await readFile(goldPath, 'utf8');
    const parsedGold = ProblemQuestionGoldSchema.parse(JSON.parse(rawGold));
    const gold = { ...parsedGold, reviewStatus: 'human_reviewed' as const };
    const cases = StudentCasesSchema.parse(await readJson(resolve(
      corpus.baselineExperimentRoot,
      caseId,
      'student-response-cases.json',
    )));
    goldHashes[caseId] = sha256(rawGold);
    previousByCase[caseId] = previousStrictResults(await readJson(resolve(
      PREVIOUS_ROOT,
      caseId,
      'c-probes.json',
    )));
    return Array.from({ length: REPEATS }, (_, index) => ({
      caseId,
      iteration: index + 1,
      gold,
      response: cases.representativeWrong,
    }));
  }));

  const flattened = jobs.flat();
  for (let index = 0; index < flattened.length; index += 3) {
    const batch = await Promise.all(flattened.slice(index, index + 3).map(runProbe));
    results.push(...batch);
    await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.partial.json'), results);
  }

  const byCase = Object.fromEntries(corpus.items.map(({ caseId }) => {
    const selected = results.filter((result) => result.caseId === caseId);
    return [caseId, {
      passed: selected.filter((result) => result.passed).length,
      total: selected.length,
      profiles: [...new Set(selected.map((result) => result.evaluationContext.profile))],
      observed: selected.map((result) => result.observed),
    }];
  }));
  const previous = Object.values(previousByCase).reduce(
    (sum, current) => ({
      passed: sum.passed + current.passed,
      total: sum.total + current.total,
    }),
    { passed: 0, total: 0 },
  );
  const current = {
    passed: results.filter((result) => result.passed).length,
    total: results.length,
  };
  const summary = {
    experiment: 'problem-evaluator-four-route-wrong-probes-v1',
    criterion: 'SUFFICIENT|CLEAR_ERROR|ASK_CORRECTIVE targeted at SELECTED_CHOICE',
    repeatsPerCase: REPEATS,
    previous,
    current,
    deltaPassed: current.passed - previous.passed,
    byCase,
    previousByCase,
    goldHashes,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.json'), results);
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
