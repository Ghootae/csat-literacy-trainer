import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from '../problem-solving/gold.js';
import {
  SelectedOptionRationaleOutputSchema,
  createSelectedOptionRationaleInput,
  validateSelectedOptionRationaleOutput,
  type SelectedOptionRationaleInput,
  type SelectedOptionRationaleOutput,
} from '../problem-solving/selected-option-rationale-input.js';

const MODEL = process.env['BOUNDARY_PROBE_MODEL'] === 'gpt-5.6-terra'
  ? 'gpt-5.6-terra' as const
  : 'gpt-5.6-luna' as const;
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const SUITE = process.env['BOUNDARY_PROBE_SUITE'] === 'support-route'
  ? 'support-route' as const
  : 'target' as const;
const PROMPT_VERSION = 'selected-option-model-quality-prompt-v7';
const SUITE_CONFIG = SUITE === 'support-route' ? {
  corpusPath: resolve(
    'packages/pipeline/experiments/problem-solving/selected-option-support-route-boundary-probes-v1.json',
  ),
  outputRoot: resolve(MODEL === 'gpt-5.6-terra'
    ? 'docs/experiments/problem-evaluator-support-route-boundary-probes-terra-v2-2026-09-02'
    : 'docs/experiments/problem-evaluator-support-route-boundary-probes-v4-2026-09-02'),
  experiment: MODEL === 'gpt-5.6-terra'
    ? 'problem-evaluator-support-route-boundary-probes-terra-v2'
    : 'problem-evaluator-support-route-boundary-probes-v4',
} : {
  corpusPath: resolve(
    'packages/pipeline/experiments/problem-solving/selected-option-boundary-target-probes-v1.json',
  ),
  outputRoot: resolve(
    'docs/experiments/problem-evaluator-boundary-target-probes-v7-2026-09-02',
  ),
  experiment: 'problem-evaluator-boundary-target-probes-v7',
};
const PROMPT_PATHS = [resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v3.md',
), resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v4-addon.md',
), resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v5-addon.md',
), resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v6-addon.md',
), resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v7-addon.md',
)];
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const OUTPUT_ROOT = SUITE_CONFIG.outputRoot;
const PRICE_PER_MILLION = MODEL === 'gpt-5.6-terra'
  ? { input: 2, cachedInput: 0.2, output: 12 }
  : { input: 0.2, cachedInput: 0.02, output: 1.2 };

const ExpectedFindingSchema = z.object({
  quoteAnchor: z.string().min(1),
  relationToGold: z.enum(['MATCHES', 'CONFLICTS', 'NOT_ESTABLISHED']),
  decisionRelevance: z.enum(['DECISIVE', 'NON_DECISIVE']),
  sourceRefsAny: z.array(z.string().min(1)),
}).strict();
const ProbeSchema = z.object({
  probeId: z.string().min(1),
  caseId: z.string().min(1),
  choiceId: z.string().min(1),
  rationale: z.string().min(1),
  expectedProfile: z.enum([
    'CORRECT_ACCEPTED',
    'CORRECT_REJECTED',
    'WRONG_ACCEPTED',
    'WRONG_REJECTED',
  ]),
  expectedAssessment: z.enum(['SUPPORTED', 'CONTRADICTED', 'INSUFFICIENT']),
  expectedFindings: z.array(ExpectedFindingSchema),
}).strict();
const CorpusSchema = z.object({
  corpusVersion: z.string().min(1),
  probes: z.array(ProbeSchema).min(1),
}).strict();

type Probe = z.infer<typeof ProbeSchema>;

interface FindingGrade {
  readonly quoteAnchor: string;
  readonly passed: boolean;
  readonly observedRelation: string;
  readonly observedRelevance: string;
  readonly observedSourceRefs: readonly string[];
}

interface Result {
  readonly probeId: string;
  readonly caseId: string;
  readonly iteration: number;
  readonly expectedProfile: string;
  readonly observedProfile: string;
  readonly expectedAssessment: Probe['expectedAssessment'];
  readonly observedAssessment: string;
  readonly assessmentPassed: boolean;
  readonly findingsPassed: boolean;
  readonly passed: boolean;
  readonly findingGrades: readonly FindingGrade[];
  readonly durationMs: number;
  readonly usage?: {
    readonly inputTokens: number;
    readonly cachedInputTokens: number;
    readonly outputTokens: number;
  };
  readonly output?: unknown;
  readonly rawOutput?: string;
  readonly responseId?: string;
  readonly error?: string;
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function matchingFinding(
  output: SelectedOptionRationaleOutput,
  anchor: string,
): SelectedOptionRationaleOutput['evidenceFindings'][number] | undefined {
  return output.evidenceFindings.find((finding) => (
    finding.studentQuote.includes(anchor) || anchor.includes(finding.studentQuote)
  ));
}

function gradeFindings(output: SelectedOptionRationaleOutput, probe: Probe): FindingGrade[] {
  return probe.expectedFindings.map((expected) => {
    const finding = matchingFinding(output, expected.quoteAnchor);
    if (finding === undefined) {
      return {
        quoteAnchor: expected.quoteAnchor,
        passed: false,
        observedRelation: 'MISSING',
        observedRelevance: 'MISSING',
        observedSourceRefs: [],
      };
    }
    const sourceMatch = expected.sourceRefsAny.length === 0 ||
      finding.sourceRefs.some((ref) => expected.sourceRefsAny.includes(ref));
    return {
      quoteAnchor: expected.quoteAnchor,
      passed: finding.relationToGold === expected.relationToGold &&
        finding.decisionRelevance === expected.decisionRelevance &&
        sourceMatch,
      observedRelation: finding.relationToGold,
      observedRelevance: finding.decisionRelevance,
      observedSourceRefs: finding.sourceRefs,
    };
  });
}

async function run(options: {
  readonly probe: Probe;
  readonly iteration: number;
  readonly gold: ProblemQuestionGold;
  readonly prompt: string;
}): Promise<Result> {
  const startedAt = Date.now();
  let input: SelectedOptionRationaleInput | undefined;
  let rawOutput: string | undefined;
  let responseId: string | undefined;
  try {
    input = createSelectedOptionRationaleInput({
      arm: 'BASELINE_FULL_GOLD',
      gold: options.gold,
      selectedChoiceId: options.probe.choiceId,
      studentRationale: options.probe.rationale,
      observationId: 'O1',
    }).input;
    if (input.evaluationContext.profile !== options.probe.expectedProfile) {
      throw new Error(
        `${options.probe.probeId}: 기대 프로필 ${options.probe.expectedProfile}, 실제 ${input.evaluationContext.profile}`,
      );
    }
    const response = await new OpenAI({ maxRetries: 0 }).responses.create({
      model: MODEL,
      instructions: options.prompt,
      input: JSON.stringify(input),
      reasoning: { effort: EFFORT },
      max_output_tokens: 4_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'selected_option_boundary_target_output',
          strict: true,
          schema: z.toJSONSchema(SelectedOptionRationaleOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    rawOutput = response.output_text;
    responseId = response.id;
    const output = validateSelectedOptionRationaleOutput(JSON.parse(rawOutput), input);
    const findingGrades = gradeFindings(output, options.probe);
    const assessmentPassed = output.rationaleAssessment === options.probe.expectedAssessment;
    const findingsPassed = findingGrades.every((grade) => grade.passed);
    return {
      probeId: options.probe.probeId,
      caseId: options.probe.caseId,
      iteration: options.iteration,
      expectedProfile: options.probe.expectedProfile,
      observedProfile: input.evaluationContext.profile,
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: output.rationaleAssessment,
      assessmentPassed,
      findingsPassed,
      passed: assessmentPassed && findingsPassed,
      findingGrades,
      durationMs: Date.now() - startedAt,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
      output,
      rawOutput,
      responseId,
    };
  } catch (error) {
    return {
      probeId: options.probe.probeId,
      caseId: options.probe.caseId,
      iteration: options.iteration,
      expectedProfile: options.probe.expectedProfile,
      observedProfile: input?.evaluationContext.profile ?? 'PROJECTION_ERROR',
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: 'ERROR',
      assessmentPassed: false,
      findingsPassed: false,
      passed: false,
      findingGrades: [],
      durationMs: Date.now() - startedAt,
      ...(rawOutput === undefined ? {} : { rawOutput }),
      ...(responseId === undefined ? {} : { responseId }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resultKey(result: Pick<Result, 'probeId' | 'iteration'>): string {
  return `${result.probeId}:${result.iteration}`;
}

function regradeResult(result: Result, probesById: ReadonlyMap<string, Probe>): Result {
  const probe = probesById.get(result.probeId);
  if (probe === undefined || result.output === undefined || result.error !== undefined) return result;
  const parsed = SelectedOptionRationaleOutputSchema.safeParse(result.output);
  if (!parsed.success) return result;
  const findingGrades = gradeFindings(parsed.data, probe);
  const assessmentPassed = parsed.data.rationaleAssessment === probe.expectedAssessment;
  const findingsPassed = findingGrades.every((grade) => grade.passed);
  return {
    ...result,
    expectedAssessment: probe.expectedAssessment,
    observedAssessment: parsed.data.rationaleAssessment,
    assessmentPassed,
    findingsPassed,
    passed: assessmentPassed && findingsPassed,
    findingGrades,
  };
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(SUITE_CONFIG.corpusPath));
  const prompt = (await Promise.all(PROMPT_PATHS.map((path) => readFile(path, 'utf8'))))
    .join('\n\n');
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const goldByCase = new Map<string, ProblemQuestionGold>();
  for (const caseId of new Set(corpus.probes.map((probe) => probe.caseId))) {
    goldByCase.set(caseId, ProblemQuestionGoldSchema.parse(await readJson(resolve(
      GOLD_ROOT,
      caseId,
      'c-gold.json',
    ))));
  }
  const probesById = new Map(corpus.probes.map((probe) => [probe.probeId, probe] as const));
  const partialPath = resolve(OUTPUT_ROOT, 'artifacts', 'results.partial.json');
  let results: Result[] = [];
  try {
    results = (await readJson(partialPath) as Result[])
      .map((result) => regradeResult(result, probesById));
  } catch {
    // 최초 실행에는 부분 결과가 없다.
  }
  const completed = new Set(results.map(resultKey));
  const jobs = corpus.probes.flatMap((probe) => Array.from({ length: REPEATS }, (_, index) => ({
    probe,
    iteration: index + 1,
    gold: goldByCase.get(probe.caseId)!,
  }))).filter((job) => !completed.has(resultKey({
    probeId: job.probe.probeId,
    iteration: job.iteration,
  })));
  for (let index = 0; index < jobs.length; index += CONCURRENCY) {
    results.push(...await Promise.all(jobs.slice(index, index + CONCURRENCY)
      .map((job) => run({ ...job, prompt }))));
    await writeJson(partialPath, results);
    process.stdout.write(`[${results.length}/${corpus.probes.length * REPEATS}] completed\n`);
  }
  await writeJson(partialPath, results);
  const byProbe = Object.fromEntries(corpus.probes.map((probe) => {
    const selected = results.filter((result) => result.probeId === probe.probeId);
    return [probe.probeId, {
      passed: selected.filter((result) => result.passed).length,
      total: selected.length,
      assessments: selected.map((result) => result.observedAssessment),
    }];
  }));
  const inputTokens = results.reduce((sum, result) => sum + (result.usage?.inputTokens ?? 0), 0);
  const cachedInputTokens = results.reduce(
    (sum, result) => sum + (result.usage?.cachedInputTokens ?? 0),
    0,
  );
  const outputTokens = results.reduce((sum, result) => sum + (result.usage?.outputTokens ?? 0), 0);
  const observedCostUsd = (
    (inputTokens - cachedInputTokens) * PRICE_PER_MILLION.input +
    cachedInputTokens * PRICE_PER_MILLION.cachedInput +
    outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
  const summary = {
    experiment: SUITE_CONFIG.experiment,
    corpusVersion: corpus.corpusVersion,
    corpusHash: sha256(JSON.stringify(corpus)),
    promptVersion: PROMPT_VERSION,
    promptHash: sha256(prompt),
    model: MODEL,
    effort: EFFORT,
    inputMode: 'BASELINE_FULL_GOLD',
    logicalProbes: corpus.probes.length,
    repeatsPerProbe: REPEATS,
    calls: results.length,
    assessmentPassed: results.filter((result) => result.assessmentPassed).length,
    findingsPassed: results.filter((result) => result.findingsPassed).length,
    detailedPassed: results.filter((result) => result.passed).length,
    errors: results.filter((result) => result.error !== undefined).length,
    usage: {
      inputTokens,
      cachedInputTokens,
      outputTokens,
      averageInputTokens: results.length === 0 ? 0 : inputTokens / results.length,
      averageOutputTokens: results.length === 0 ? 0 : outputTokens / results.length,
      averageDurationMs: results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.durationMs, 0) / results.length,
      observedCostUsd,
      observedCostPerCallUsd: results.length === 0 ? 0 : observedCostUsd / results.length,
    },
    gatePassed: results.length === corpus.probes.length * REPEATS &&
      results.every((result) => result.passed) &&
      results.every((result) => result.error === undefined),
    byProbe,
  };
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.json'), results);
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
