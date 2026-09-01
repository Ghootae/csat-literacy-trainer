import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { ProblemQuestionGold } from '../problem-solving/gold.js';
import { createProblemPathEvaluatorInput } from '../problem-solving/path-evaluator-input.js';
import { OpenAIProblemPathEvaluator } from '../problem-solving/path-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from '../problem-solving/session.js';

const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const REPEATS = 3;

type Category = 'accurate' | 'negativeAccurate' | 'representativeWrong' | 'lowInformation';

interface StudentCase {
  readonly choiceId: string;
  readonly rationale: string;
}

interface Job {
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly gold: ProblemQuestionGold;
  readonly response: StudentCase;
}

const evaluator = new OpenAIProblemPathEvaluator({ effort: 'medium' });

async function runJob(job: Job) {
  const session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `${job.caseId}-${job.category}-${job.iteration}`,
    questionId: job.gold.questionId,
    answerChoiceId: job.gold.answerChoiceId,
  }), {
    initialChoiceId: job.response.choiceId,
    rationale: job.response.rationale,
  });
  const evaluationMode = job.response.choiceId === job.gold.answerChoiceId
    ? 'ASSESS_SELECTION_RATIONALE' as const
    : 'DIAGNOSE_PATH' as const;
  try {
    const evaluation = await evaluator.evaluate(createProblemPathEvaluatorInput({
      evaluationMode,
      session,
      gold: job.gold,
    }));
    let passed = false;
    let observed: string;
    if (evaluation.result.mode === 'ASSESS_SELECTION_RATIONALE') {
      observed = evaluation.result.assessment;
      passed = (
        (job.category === 'accurate' || job.category === 'negativeAccurate') &&
        evaluation.result.assessment === 'SUPPORTED'
      );
    } else {
      const selected = evaluation.result.targets.find(
        (target) => target.kind === 'SELECTED_CHOICE',
      );
      observed = [
        selected?.status ?? 'MISSING',
        selected?.errorAssessment ?? 'NULL',
        evaluation.result.nextActionCandidate.type,
      ].join('|');
      if (job.category === 'representativeWrong') {
        passed = selected?.errorAssessment === 'CLEAR_ERROR' &&
          evaluation.result.nextActionCandidate.target === 'SELECTED_CHOICE';
      } else if (job.category === 'lowInformation') {
        passed = selected?.status === 'INSUFFICIENT' &&
          selected.errorAssessment === 'UNCERTAIN' &&
          evaluation.result.nextActionCandidate.type === 'ASK_DIAGNOSTIC' &&
          evaluation.result.nextActionCandidate.target === 'SELECTED_CHOICE';
      }
    }
    return {
      caseId: job.caseId,
      category: job.category,
      iteration: job.iteration,
      choiceId: job.response.choiceId,
      rationale: job.response.rationale,
      passed,
      observed,
      result: evaluation.result,
      rawOutput: evaluation.rawOutput,
      call: evaluation.call,
    };
  } catch (error) {
    return {
      caseId: job.caseId,
      category: job.category,
      iteration: job.iteration,
      choiceId: job.response.choiceId,
      rationale: job.response.rationale,
      passed: false,
      observed: 'ERROR',
      error: error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: 'UnknownError', message: String(error) },
    };
  }
}

async function main(): Promise<void> {
  const categoryArgument = process.argv.find((argument) => argument.startsWith('--category='))
    ?.slice('--category='.length) as Category | undefined;
  const categories = categoryArgument === undefined
    ? ['accurate', 'negativeAccurate', 'representativeWrong', 'lowInformation'] as const
    : [categoryArgument];
  const runName = process.argv.find((argument) => argument.startsWith('--run='))
    ?.slice('--run='.length) ?? 'initial-repeated-evaluation';
  const resultRoot = resolve(
    'docs/experiments/problem-gold-extrapolation-2026-09-01/evaluation',
    runName,
  );
  const directories = (await readdir(OUTPUT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(OUTPUT_ROOT, entry.name));
  const jobs: Job[] = [];
  for (const directory of directories) {
    const gold = JSON.parse(
      await readFile(resolve(directory, 'evaluation-gold.json'), 'utf8'),
    ) as ProblemQuestionGold;
    const cases = JSON.parse(
      await readFile(resolve(directory, 'student-response-cases.json'), 'utf8'),
    ) as Record<Category, StudentCase>;
    for (const category of categories) {
      const response = category === 'lowInformation'
        ? {
            ...cases[category],
            rationale: `잘 모르겠지만 ${cases[category].choiceId.slice(1)}번 같습니다.`,
          }
        : cases[category];
      for (let iteration = 1; iteration <= REPEATS; iteration += 1) {
        jobs.push({
          caseId: basename(directory),
          category,
          iteration,
          gold,
          response,
        });
      }
    }
  }

  const results: Awaited<ReturnType<typeof runJob>>[] = [];
  const concurrency = 6;
  for (let index = 0; index < jobs.length; index += concurrency) {
    results.push(...await Promise.all(jobs.slice(index, index + concurrency).map(runJob)));
    process.stdout.write(`progress ${results.length}/${jobs.length}\n`);
  }
  const byCategory = Object.fromEntries([
    'accurate',
    'negativeAccurate',
    'representativeWrong',
    'lowInformation',
  ].map((category) => {
    const selected = results.filter((result) => result.category === category);
    return [category, {
      passed: selected.filter((result) => result.passed).length,
      total: selected.length,
    }];
  }));
  const byCase = Object.fromEntries([...new Set(results.map((result) => result.caseId))]
    .map((caseId) => {
      const selected = results.filter((result) => result.caseId === caseId);
      return [caseId, {
        passed: selected.filter((result) => result.passed).length,
        total: selected.length,
        failures: selected.filter((result) => !result.passed).map((result) => ({
          category: result.category,
          iteration: result.iteration,
          observed: result.observed,
        })),
      }];
    }));
  const summary = {
    repeats: REPEATS,
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    byCategory,
    byCase,
  };
  await mkdir(resultRoot, { recursive: true });
  await writeFile(resolve(resultRoot, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(resolve(resultRoot, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
