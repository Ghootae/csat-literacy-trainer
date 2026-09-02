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

const MODELS = ['gpt-5.6-terra', 'gpt-5.6-luna'] as const;
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const PROMPT_VERSION = 'selected-option-model-quality-prompt-v1';
const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-risk-probes-v1.json',
);
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-model-quality-prompt-v1.md',
);
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-evaluator-terra-luna-quality-2026-09-02',
);
const PRICE_PER_MILLION = {
  'gpt-5.6-terra': { input: 2, cachedInput: 0.2, output: 12 },
  'gpt-5.6-luna': { input: 0.2, cachedInput: 0.02, output: 1.2 },
} as const;

const ExpectedFindingSchema = z.object({
  quoteAnchor: z.string().min(1),
  relationToGold: z.enum(['MATCHES', 'CONFLICTS', 'NOT_ESTABLISHED']),
  decisionRelevance: z.enum(['DECISIVE', 'NON_DECISIVE']),
  sourceRefsAny: z.array(z.string().min(1)).min(1),
}).strict();
const ProbeSchema = z.object({
  probeId: z.string().min(1),
  riskType: z.string().min(1),
  caseId: z.string().min(1),
  choiceId: z.string().min(1),
  rationale: z.string().min(1),
  expectedAssessment: z.enum(['SUPPORTED', 'CONTRADICTED', 'INSUFFICIENT']),
  expectedFindings: z.array(ExpectedFindingSchema).min(1),
}).strict();
const CorpusSchema = z.object({
  corpusVersion: z.literal('selected-option-risk-probes-v1'),
  probes: z.array(ProbeSchema).min(1),
}).strict();

type Model = typeof MODELS[number];
type Probe = z.infer<typeof ProbeSchema>;

interface FindingGrade {
  readonly quoteAnchor: string;
  readonly passed: boolean;
  readonly observedRelation: string;
  readonly observedRelevance: string;
  readonly observedSourceRefs: readonly string[];
  readonly reason: string;
}

interface Result {
  readonly probeId: string;
  readonly riskType: string;
  readonly caseId: string;
  readonly iteration: number;
  readonly model: Model;
  readonly profile: string;
  readonly expectedAssessment: Probe['expectedAssessment'];
  readonly observedAssessment: string;
  readonly assessmentPassed: boolean;
  readonly findingsPassed: boolean;
  readonly passed: boolean;
  readonly findingGrades: readonly FindingGrade[];
  readonly inputBytes: number;
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

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchingFinding(
  output: SelectedOptionRationaleOutput,
  anchor: string,
): SelectedOptionRationaleOutput['evidenceFindings'][number] | undefined {
  return output.evidenceFindings.find((finding) =>
    finding.studentQuote.includes(anchor) || anchor.includes(finding.studentQuote));
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
        reason: '기대 anchor를 포함한 finding이 없다.',
      };
    }
    const sourceMatch = finding.sourceRefs.some((ref) => expected.sourceRefsAny.includes(ref));
    const passed = finding.relationToGold === expected.relationToGold &&
      finding.decisionRelevance === expected.decisionRelevance &&
      sourceMatch;
    return {
      quoteAnchor: expected.quoteAnchor,
      passed,
      observedRelation: finding.relationToGold,
      observedRelevance: finding.decisionRelevance,
      observedSourceRefs: finding.sourceRefs,
      reason: passed
        ? '기대 관계·결정성·출처를 충족했다.'
        : `expected ${expected.relationToGold}|${expected.decisionRelevance}|${expected.sourceRefsAny.join(',')}`,
    };
  });
}

async function run(options: {
  readonly probe: Probe;
  readonly iteration: number;
  readonly model: Model;
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
    const inputJson = JSON.stringify(input);
    const response = await new OpenAI({ maxRetries: 0 }).responses.create({
      model: options.model,
      instructions: options.prompt,
      input: inputJson,
      reasoning: { effort: EFFORT },
      max_output_tokens: 4_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'selected_option_model_quality_output',
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
      riskType: options.probe.riskType,
      caseId: options.probe.caseId,
      iteration: options.iteration,
      model: options.model,
      profile: input.evaluationContext.profile,
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: output.rationaleAssessment,
      assessmentPassed,
      findingsPassed,
      passed: assessmentPassed && findingsPassed,
      findingGrades,
      inputBytes: Buffer.byteLength(inputJson),
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
      riskType: options.probe.riskType,
      caseId: options.probe.caseId,
      iteration: options.iteration,
      model: options.model,
      profile: input?.evaluationContext.profile ?? 'PROJECTION_ERROR',
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: 'ERROR',
      assessmentPassed: false,
      findingsPassed: false,
      passed: false,
      findingGrades: [],
      inputBytes: input === undefined ? 0 : Buffer.byteLength(JSON.stringify(input)),
      durationMs: Date.now() - startedAt,
      ...(rawOutput === undefined ? {} : { rawOutput }),
      ...(responseId === undefined ? {} : { responseId }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function signature(result: Result): string {
  return result.findingGrades.map((grade) =>
    `${grade.quoteAnchor}|${grade.observedRelation}|${grade.observedRelevance}`).join('||');
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  const prompt = await readFile(PROMPT_PATH, 'utf8');
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const goldByCase = new Map<string, ProblemQuestionGold>();
  for (const caseId of new Set(corpus.probes.map((probe) => probe.caseId))) {
    goldByCase.set(caseId, ProblemQuestionGoldSchema.parse(await readJson(resolve(
      GOLD_ROOT,
      caseId,
      'c-gold.json',
    ))));
  }
  const jobs = corpus.probes.flatMap((probe) => {
    return Array.from({ length: REPEATS }, (_, index) =>
      MODELS.map((model) => ({
        probe,
        iteration: index + 1,
        model,
        gold: goldByCase.get(probe.caseId)!,
      }))).flat();
  });
  const results: Result[] = [];
  for (let index = 0; index < jobs.length; index += CONCURRENCY) {
    results.push(...await Promise.all(jobs.slice(index, index + CONCURRENCY)
      .map((job) => run({ ...job, prompt }))));
    await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.partial.json'), results);
    process.stdout.write(`[${results.length}/${jobs.length}] completed\n`);
  }

  const byModel = Object.fromEntries(MODELS.map((model) => {
    const selected = results.filter((result) => result.model === model);
    const inputTokens = selected.reduce((sum, result) => sum + (result.usage?.inputTokens ?? 0), 0);
    const cachedInputTokens = selected.reduce(
      (sum, result) => sum + (result.usage?.cachedInputTokens ?? 0),
      0,
    );
    const outputTokens = selected.reduce((sum, result) => sum + (result.usage?.outputTokens ?? 0), 0);
    const price = PRICE_PER_MILLION[model];
    const observedCost = (
      (inputTokens - cachedInputTokens) * price.input +
      cachedInputTokens * price.cachedInput +
      outputTokens * price.output
    ) / 1_000_000;
    const coldCacheCost = (
      inputTokens * price.input + outputTokens * price.output
    ) / 1_000_000;
    return [model, {
      assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
      findingsPassed: selected.filter((result) => result.findingsPassed).length,
      detailedPassed: selected.filter((result) => result.passed).length,
      total: selected.length,
      errors: selected.filter((result) => result.error !== undefined).length,
      averageInputTokens: inputTokens / selected.length,
      averageCachedInputTokens: cachedInputTokens / selected.length,
      averageOutputTokens: outputTokens / selected.length,
      averageDurationMs: mean(selected.map((result) => result.durationMs)),
      observedCostUsd: observedCost,
      observedCostPerCallUsd: observedCost / selected.length,
      coldCacheCostUsd: coldCacheCost,
      coldCacheCostPerCallUsd: coldCacheCost / selected.length,
    }];
  }));
  const byRiskType = Object.fromEntries(
    [...new Set(corpus.probes.map((probe) => probe.riskType))].map((riskType) => [
      riskType,
      Object.fromEntries(MODELS.map((model) => {
        const selected = results.filter(
          (result) => result.riskType === riskType && result.model === model,
        );
        return [model, {
          assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
          findingsPassed: selected.filter((result) => result.findingsPassed).length,
          detailedPassed: selected.filter((result) => result.passed).length,
          total: selected.length,
        }];
      })),
    ]),
  );
  let paired = 0;
  let assessmentEquivalent = 0;
  let findingSignatureEquivalent = 0;
  for (const terra of results.filter((result) => result.model === 'gpt-5.6-terra')) {
    const luna = results.find((result) =>
      result.model === 'gpt-5.6-luna' &&
      result.probeId === terra.probeId &&
      result.iteration === terra.iteration);
    if (luna === undefined) continue;
    paired += 1;
    if (luna.observedAssessment === terra.observedAssessment) assessmentEquivalent += 1;
    if (signature(luna) === signature(terra)) findingSignatureEquivalent += 1;
  }
  const summary = {
    experiment: 'problem-evaluator-terra-luna-quality-v1',
    corpusVersion: corpus.corpusVersion,
    promptVersion: PROMPT_VERSION,
    promptHash: sha256(prompt),
    models: MODELS,
    effort: EFFORT,
    inputMode: 'BASELINE_FULL_GOLD',
    probes: corpus.probes.length,
    repeatsPerProbe: REPEATS,
    calls: results.length,
    qualityPriority: ['assessmentPassed', 'findingsPassed', 'detailedPassed', 'errors'],
    priceSnapshot: { date: '2026-09-02', perMillionTokens: PRICE_PER_MILLION },
    byModel,
    byRiskType,
    pairedEquivalence: { paired, assessmentEquivalent, findingSignatureEquivalent },
  };
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.json'), results);
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
