import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  adaptProblemPathDiagnosticOutput,
  applyAdaptedProblemEvaluatorTurn,
} from '../problem-solving/diagnostic-turn-v2.js';
import type { ProblemQuestionGold } from '../problem-solving/gold.js';
import { createProblemPathEvaluatorInput } from '../problem-solving/path-evaluator-input.js';
import {
  OpenAIProblemPathEvaluator,
  type ProblemPathEvaluatorEffort,
} from '../problem-solving/path-evaluator-runtime.js';
import {
  PROBLEM_PATH_PROBE_CASES,
  assessProblemPathProbe,
  compareProblemPathProbeVariants,
} from '../problem-solving/path-probe.js';
import {
  applyProblemEvaluatorTurn,
  createProblemSolvingSession,
  submitInitialProblemResponse,
  submitProblemActionResponse,
} from '../problem-solving/session.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const caseFilter = option('--case') ?? 'all';
const variantFilter = option('--variant') ?? 'both';
const repeat = Number(option('--repeat') ?? '1');
const dryRun = process.argv.includes('--dry-run');
const failFast = process.argv.includes('--fail-fast');
const outputRoot = resolve(option('--output-dir') ?? '.omc/experiments/problem-path');
if (!Number.isInteger(repeat) || repeat < 1) throw new Error('--repeat은 양의 정수여야 한다.');

const fixtureRoot = resolve(
  process.cwd(), 'packages/pipeline/fixtures/experiments/problem-solving',
);
const gold = JSON.parse(readFileSync(
  resolve(fixtureRoot, 'mrna-vaccine-lipid-nanoparticle-q19.json'), 'utf8',
)) as ProblemQuestionGold;
const diagnosticFixture = JSON.parse(readFileSync(
  resolve(fixtureRoot, 'episodes/mrna-q19-c2-ambiguous-speed.json'), 'utf8',
));

const selected = PROBLEM_PATH_PROBE_CASES.filter(
  (item) => caseFilter === 'all' || item.caseId === caseFilter,
);
if (selected.length === 0) throw new Error(`알 수 없는 probe case: ${caseFilter}`);
if (!dryRun && !process.env['OPENAI_API_KEY']) {
  throw new Error('실제 probe 실행에는 OPENAI_API_KEY가 필요하다. --dry-run으로 계획을 확인할 수 있다.');
}

const runId = new Date().toISOString().replaceAll(':', '-');
const outputDir = resolve(outputRoot, runId);
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, 'results.jsonl');
const modelOption = option('--model');
const effortOption = option('--effort');
const allowedEfforts = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
if (effortOption !== undefined && !allowedEfforts.has(effortOption)) {
  throw new Error(`지원하지 않는 effort: ${effortOption}`);
}
const evaluator = new OpenAIProblemPathEvaluator({
  ...(modelOption === undefined ? {} : { model: modelOption }),
  ...(effortOption === undefined
    ? {}
    : { effort: effortOption as ProblemPathEvaluatorEffort }),
});
const abResults = new Map<string, { withPaths?: unknown; withoutPaths?: unknown }>();

function variants(probe: (typeof PROBLEM_PATH_PROBE_CASES)[number]) {
  return probe.variants.filter((variant) =>
    variantFilter === 'both' ||
    (variantFilter === 'with-paths' && variant === 'WITH_REPRESENTATIVE_PATHS') ||
    (variantFilter === 'without-paths' && variant === 'WITHOUT_REPRESENTATIVE_PATHS'));
}

for (const probe of selected) {
  for (const variant of variants(probe)) {
    for (let iteration = 1; iteration <= repeat; iteration += 1) {
      let session = submitInitialProblemResponse(createProblemSolvingSession({
        sessionId: `${runId}-${probe.caseId}-${iteration}`,
        questionId: gold.questionId,
        answerChoiceId: gold.answerChoiceId,
      }), {
        initialChoiceId: probe.initialChoiceId,
        rationale: probe.rationale,
      });
      if (probe.followUpResponse !== null) {
        const fixtureTurn = structuredClone(diagnosticFixture.turns[0]);
        session = applyProblemEvaluatorTurn(session, fixtureTurn);
        session = submitProblemActionResponse(session, probe.followUpResponse);
      }
      const evaluationMode = session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
        ? 'ASSESS_CORRECT_RATIONALE' as const
        : 'DIAGNOSE_PATH' as const;
      const input = createProblemPathEvaluatorInput({
        evaluationMode,
        session,
        gold,
        includeRepresentativeWrongPaths: variant === 'WITH_REPRESENTATIVE_PATHS',
      });
      if (dryRun) {
        appendFileSync(outputPath, `${JSON.stringify({
          runId, caseId: probe.caseId, variant, iteration, dryRun: true,
          evaluationMode, observationCount: input.observations.length,
        })}\n`);
        continue;
      }
      try {
        const call = await evaluator.evaluate(input);
        const assessment = assessProblemPathProbe(probe, call.result);
        let adapted = null;
        let sessionAfter = null;
        if (call.result.mode === 'DIAGNOSE_PATH') {
          adapted = adaptProblemPathDiagnosticOutput({
            evaluatorInput: input,
            rawOutput: call.rawOutput,
            resolvedOutput: call.result,
          });
          sessionAfter = applyAdaptedProblemEvaluatorTurn(session, adapted);
        }
        appendFileSync(outputPath, `${JSON.stringify({
          runId, caseId: probe.caseId, variant, iteration,
          input, rawOutput: call.rawOutput, result: call.result,
          adapted, sessionAfter, assessment, call: call.call,
        })}\n`);
        const abKey = `${probe.caseId}#${iteration}`;
        const pair = abResults.get(abKey) ?? {};
        if (variant === 'WITH_REPRESENTATIVE_PATHS') pair.withPaths = call.result;
        else pair.withoutPaths = call.result;
        abResults.set(abKey, pair);
        process.stdout.write(`${assessment.passed ? 'PASS' : 'FAIL'} ${probe.caseId} ${variant} #${iteration}\n`);
      } catch (error) {
        const failure = {
          runId, caseId: probe.caseId, variant, iteration, input,
          assessment: { passed: false, failures: ['RUNTIME_OR_CONTRACT'] },
          error: error instanceof Error
            ? { name: error.name, message: error.message, parsedOutput: (error as any).parsedOutput ?? null }
            : { name: 'UnknownError', message: String(error), parsedOutput: null },
        };
        appendFileSync(outputPath, `${JSON.stringify(failure)}\n`);
        process.stdout.write(`FAIL ${probe.caseId} ${variant} #${iteration}: ${failure.error.message}\n`);
        if (failFast) throw error;
      }
    }
  }
}

for (const [key, pair] of abResults) {
  if (pair.withPaths === undefined || pair.withoutPaths === undefined) continue;
  const comparison = compareProblemPathProbeVariants(pair.withPaths, pair.withoutPaths);
  appendFileSync(outputPath, `${JSON.stringify({
    recordType: 'AB_COMPARISON', key, ...comparison,
  })}\n`);
  process.stdout.write(`${comparison.status} A/B ${key}\n`);
}

process.stdout.write(`결과: ${outputPath}\n`);
