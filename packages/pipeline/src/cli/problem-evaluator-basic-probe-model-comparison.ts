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

const LUNA = 'gpt-5.6-luna' as const;
const TERRA = 'gpt-5.6-terra' as const;
const MODELS = [LUNA, TERRA] as const;
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const PROMPT_VERSION = 'selected-option-model-quality-prompt-v7';
const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-basic-probes-v1.json',
);
const PROMPT_PATHS = [
  'selected-option-model-quality-prompt-v3.md',
  'selected-option-model-quality-prompt-v4-addon.md',
  'selected-option-model-quality-prompt-v5-addon.md',
  'selected-option-model-quality-prompt-v6-addon.md',
  'selected-option-model-quality-prompt-v7-addon.md',
].map((name) => resolve('packages/pipeline/experiments/problem-solving', name));
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-evaluator-basic-probes-terra-luna-v3-2026-09-02',
);
const PRICE_PER_MILLION = {
  [TERRA]: { input: 2, cachedInput: 0.2, output: 12 },
  [LUNA]: { input: 0.2, cachedInput: 0.02, output: 1.2 },
} as const;
const QUALITY_GATE = {
  minimumDetailedPasses: 57,
  totalCalls: 60,
  minimumPassesPerLogicalProbe: 2,
  minimumPassesPerCategory: 14,
  maximumErrors: 0,
} as const;

const CategorySchema = z.enum([
  'accurate',
  'negativeAccurate',
  'representativeWrong',
  'lowInformation',
]);
const ProfileSchema = z.enum([
  'CORRECT_ACCEPTED',
  'CORRECT_REJECTED',
  'WRONG_ACCEPTED',
  'WRONG_REJECTED',
]);
const ExpectedFindingSchema = z.object({
  relationToGold: z.enum(['MATCHES', 'CONFLICTS', 'NOT_ESTABLISHED']),
  decisionRelevance: z.enum(['DECISIVE', 'NON_DECISIVE']),
  sourceRefsAny: z.array(z.string().min(1)).min(1),
}).strict();
const ProbeSchema = z.object({
  probeId: z.string().min(1),
  caseId: z.string().min(1),
  category: CategorySchema,
  expectedProfile: ProfileSchema,
  expectedAssessment: z.enum(['SUPPORTED', 'CONTRADICTED', 'INSUFFICIENT']),
  expectedFinding: ExpectedFindingSchema.optional(),
}).strict();
const CorpusSchema = z.object({
  corpusVersion: z.literal('selected-option-basic-probes-v1'),
  sourceCasesRoot: z.string().min(1),
  probes: z.array(ProbeSchema).length(20),
}).strict();
const StudentResponseSchema = z.object({
  choiceId: z.string().min(1),
  rationale: z.string().min(1),
}).strict();
const StudentCasesSchema = z.object({
  accurate: StudentResponseSchema,
  negativeAccurate: StudentResponseSchema,
  representativeWrong: StudentResponseSchema,
  lowInformation: StudentResponseSchema,
}).strict();

type Model = typeof MODELS[number];
type Category = z.infer<typeof CategorySchema>;
type Probe = z.infer<typeof ProbeSchema>;

interface ResolvedProbe extends Probe {
  readonly choiceId: string;
  readonly rationale: string;
  readonly responseHash: string;
}

interface Result {
  readonly probeId: string;
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly model: Model;
  readonly choiceId: string;
  readonly rationale: string;
  readonly responseHash: string;
  readonly expectedProfile: string;
  readonly observedProfile: string;
  readonly profilePassed: boolean;
  readonly expectedAssessment: Probe['expectedAssessment'];
  readonly observedAssessment: string;
  readonly assessmentPassed: boolean;
  readonly findingPassed: boolean;
  readonly passed: boolean;
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

function expectedFindingPassed(output: SelectedOptionRationaleOutput, probe: Probe): boolean {
  if (probe.expectedFinding === undefined) return true;
  return output.evidenceFindings.some((finding) => (
    finding.relationToGold === probe.expectedFinding?.relationToGold &&
    finding.decisionRelevance === probe.expectedFinding.decisionRelevance &&
    finding.sourceRefs.some((ref) => probe.expectedFinding?.sourceRefsAny.includes(ref))
  ));
}

async function run(options: {
  readonly probe: ResolvedProbe;
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
    const profilePassed = input.evaluationContext.profile === options.probe.expectedProfile;
    if (!profilePassed) {
      throw new Error(
        `${options.probe.probeId}: 기대 프로필 ${options.probe.expectedProfile}, 실제 ${input.evaluationContext.profile}`,
      );
    }
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
          name: 'selected_option_basic_probe_output',
          strict: true,
          schema: z.toJSONSchema(SelectedOptionRationaleOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    rawOutput = response.output_text;
    responseId = response.id;
    const output = validateSelectedOptionRationaleOutput(JSON.parse(rawOutput), input);
    const assessmentPassed = output.rationaleAssessment === options.probe.expectedAssessment;
    const findingPassed = expectedFindingPassed(output, options.probe);
    return {
      probeId: options.probe.probeId,
      caseId: options.probe.caseId,
      category: options.probe.category,
      iteration: options.iteration,
      model: options.model,
      choiceId: options.probe.choiceId,
      rationale: options.probe.rationale,
      responseHash: options.probe.responseHash,
      expectedProfile: options.probe.expectedProfile,
      observedProfile: input.evaluationContext.profile,
      profilePassed,
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: output.rationaleAssessment,
      assessmentPassed,
      findingPassed,
      passed: profilePassed && assessmentPassed && findingPassed,
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
      caseId: options.probe.caseId,
      category: options.probe.category,
      iteration: options.iteration,
      model: options.model,
      choiceId: options.probe.choiceId,
      rationale: options.probe.rationale,
      responseHash: options.probe.responseHash,
      expectedProfile: options.probe.expectedProfile,
      observedProfile: input?.evaluationContext.profile ?? 'PROJECTION_ERROR',
      profilePassed: false,
      expectedAssessment: options.probe.expectedAssessment,
      observedAssessment: 'ERROR',
      assessmentPassed: false,
      findingPassed: false,
      passed: false,
      inputBytes: input === undefined ? 0 : Buffer.byteLength(JSON.stringify(input)),
      durationMs: Date.now() - startedAt,
      ...(rawOutput === undefined ? {} : { rawOutput }),
      ...(responseId === undefined ? {} : { responseId }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resultKey(result: Pick<Result, 'model' | 'probeId' | 'iteration'>): string {
  return `${result.model}|${result.probeId}|${result.iteration}`;
}

function regradeResult(result: Result, probesById: ReadonlyMap<string, ResolvedProbe>): Result {
  const probe = probesById.get(result.probeId);
  if (probe === undefined) throw new Error(`저장 결과가 알 수 없는 프로브를 참조한다: ${result.probeId}`);
  if (result.responseHash !== probe.responseHash) {
    throw new Error(`${result.probeId}: 저장 결과와 현재 학생 응답 해시가 다르다.`);
  }
  const profilePassed = result.observedProfile === probe.expectedProfile;
  if (result.error !== undefined) {
    return {
      ...result,
      expectedProfile: probe.expectedProfile,
      profilePassed,
      expectedAssessment: probe.expectedAssessment,
      assessmentPassed: false,
      findingPassed: false,
      passed: false,
    };
  }
  const parsedOutput = SelectedOptionRationaleOutputSchema.parse(result.output);
  const assessmentPassed = parsedOutput.rationaleAssessment === probe.expectedAssessment;
  const findingPassed = expectedFindingPassed(parsedOutput, probe);
  return {
    ...result,
    expectedProfile: probe.expectedProfile,
    profilePassed,
    expectedAssessment: probe.expectedAssessment,
    observedAssessment: parsedOutput.rationaleAssessment,
    assessmentPassed,
    findingPassed,
    passed: profilePassed && assessmentPassed && findingPassed,
  };
}

function modelSummary(results: readonly Result[], model: Model) {
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
  const coldCacheCost = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  const byCategory = Object.fromEntries(CategorySchema.options.map((category) => {
    const categoryResults = selected.filter((result) => result.category === category);
    return [category, {
      passed: categoryResults.filter((result) => result.passed).length,
      total: categoryResults.length,
    }];
  }));
  const byProfile = Object.fromEntries(ProfileSchema.options.map((profile) => {
    const profileResults = selected.filter((result) => result.expectedProfile === profile);
    return [profile, {
      passed: profileResults.filter((result) => result.passed).length,
      total: profileResults.length,
    }];
  }));
  const byCase = Object.fromEntries([...new Set(selected.map((result) => result.caseId))]
    .map((caseId) => {
      const caseResults = selected.filter((result) => result.caseId === caseId);
      return [caseId, {
        passed: caseResults.filter((result) => result.passed).length,
        total: caseResults.length,
      }];
    }));
  const byProbe = Object.fromEntries([...new Set(selected.map((result) => result.probeId))]
    .map((probeId) => {
      const probeResults = selected.filter((result) => result.probeId === probeId);
      return [probeId, {
        passed: probeResults.filter((result) => result.passed).length,
        total: probeResults.length,
        observedAssessments: probeResults.map((result) => result.observedAssessment),
      }];
    }));
  return {
    assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
    findingPassed: selected.filter((result) => result.findingPassed).length,
    detailedPassed: selected.filter((result) => result.passed).length,
    total: selected.length,
    errors: selected.filter((result) => result.error !== undefined).length,
    byCategory,
    byProfile,
    byCase,
    byProbe,
    averageInputTokens: selected.length === 0 ? 0 : inputTokens / selected.length,
    averageCachedInputTokens: selected.length === 0 ? 0 : cachedInputTokens / selected.length,
    averageOutputTokens: selected.length === 0 ? 0 : outputTokens / selected.length,
    averageDurationMs: mean(selected.map((result) => result.durationMs)),
    observedCostUsd: observedCost,
    observedCostPerCallUsd: selected.length === 0 ? 0 : observedCost / selected.length,
    coldCacheCostUsd: coldCacheCost,
    coldCacheCostPerCallUsd: selected.length === 0 ? 0 : coldCacheCost / selected.length,
  };
}

function qualityGate(results: readonly Result[]) {
  const summary = modelSummary(results, LUNA);
  const perProbePass = Object.values(summary.byProbe)
    .every((probe) => probe.passed >= QUALITY_GATE.minimumPassesPerLogicalProbe);
  const perCategoryPass = Object.values(summary.byCategory)
    .every((category) => category.passed >= QUALITY_GATE.minimumPassesPerCategory);
  const checks = {
    callCount: summary.total === QUALITY_GATE.totalCalls,
    overallQuality: summary.detailedPassed >= QUALITY_GATE.minimumDetailedPasses,
    everyLogicalProbe: perProbePass,
    everyCategory: perCategoryPass,
    noErrors: summary.errors <= QUALITY_GATE.maximumErrors,
  };
  return { passed: Object.values(checks).every(Boolean), thresholds: QUALITY_GATE, checks };
}

function findingSignature(result: Result): string {
  if (typeof result.output !== 'object' || result.output === null) return 'ERROR';
  const parsed = SelectedOptionRationaleOutputSchema.safeParse(result.output);
  if (!parsed.success) return 'ERROR';
  return parsed.data.evidenceFindings
    .map((finding) => `${finding.relationToGold}|${finding.decisionRelevance}`)
    .sort()
    .join('||');
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  const prompt = (await Promise.all(PROMPT_PATHS.map((path) => readFile(path, 'utf8'))))
    .join('\n\n');
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });

  const seenIds = new Set<string>();
  const goldByCase = new Map<string, ProblemQuestionGold>();
  const casesByCase = new Map<string, z.infer<typeof StudentCasesSchema>>();
  const resolvedProbes: ResolvedProbe[] = [];
  for (const probe of corpus.probes) {
    if (seenIds.has(probe.probeId)) throw new Error(`중복 probeId: ${probe.probeId}`);
    seenIds.add(probe.probeId);
    if (!goldByCase.has(probe.caseId)) {
      goldByCase.set(probe.caseId, ProblemQuestionGoldSchema.parse(await readJson(resolve(
        GOLD_ROOT,
        probe.caseId,
        'c-gold.json',
      ))));
      casesByCase.set(probe.caseId, StudentCasesSchema.parse(await readJson(resolve(
        corpus.sourceCasesRoot,
        probe.caseId,
        'student-response-cases.json',
      ))));
    }
    const response = casesByCase.get(probe.caseId)?.[probe.category];
    if (response === undefined) throw new Error(`${probe.probeId}: 학생 응답을 찾을 수 없다.`);
    resolvedProbes.push({
      ...probe,
      ...response,
      responseHash: sha256(JSON.stringify(response)),
    });
  }
  const categoryCounts = Object.fromEntries(CategorySchema.options.map((category) => [
    category,
    resolvedProbes.filter((probe) => probe.category === category).length,
  ]));
  if (Object.values(categoryCounts).some((count) => count !== 5)) {
    throw new Error(`기본 프로브 카테고리는 각각 5개여야 한다: ${JSON.stringify(categoryCounts)}`);
  }

  const partialPath = resolve(OUTPUT_ROOT, 'artifacts', 'results.partial.json');
  const probesById = new Map(resolvedProbes.map((probe) => [probe.probeId, probe] as const));
  let results: Result[] = [];
  try {
    results = (await readJson(partialPath) as Result[])
      .map((result) => regradeResult(result, probesById));
  } catch {
    // 최초 실행에는 부분 결과가 없다.
  }
  await writeJson(partialPath, results);

  const runModel = async (model: Model): Promise<void> => {
    const completed = new Set(results.map(resultKey));
    const jobs = resolvedProbes.flatMap((probe) => Array.from({ length: REPEATS }, (_, index) => ({
      probe,
      iteration: index + 1,
      model,
      gold: goldByCase.get(probe.caseId)!,
    }))).filter((job) => !completed.has(resultKey({
      model: job.model,
      probeId: job.probe.probeId,
      iteration: job.iteration,
    })));
    for (let index = 0; index < jobs.length; index += CONCURRENCY) {
      results.push(...await Promise.all(jobs.slice(index, index + CONCURRENCY)
        .map((job) => run({ ...job, prompt }))));
      await writeJson(partialPath, results);
      const modelCompleted = results.filter((result) => result.model === model).length;
      process.stdout.write(`[${model}] ${modelCompleted}/${resolvedProbes.length * REPEATS} completed\n`);
    }
  };

  await runModel(LUNA);
  const lunaGate = qualityGate(results);
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'luna-quality-gate.json'), lunaGate);
  if (lunaGate.passed) await runModel(TERRA);

  const executedModels = MODELS.filter((model) => results.some((result) => result.model === model));
  const byModel = Object.fromEntries(executedModels.map((model) => [model, modelSummary(results, model)]));
  let paired = 0;
  let assessmentEquivalent = 0;
  let detailedPassEquivalent = 0;
  let findingSignatureEquivalent = 0;
  for (const luna of results.filter((result) => result.model === LUNA)) {
    const terra = results.find((result) => (
      result.model === TERRA && result.probeId === luna.probeId && result.iteration === luna.iteration
    ));
    if (terra === undefined) continue;
    paired += 1;
    if (terra.observedAssessment === luna.observedAssessment) assessmentEquivalent += 1;
    if (terra.passed === luna.passed) detailedPassEquivalent += 1;
    if (findingSignature(terra) === findingSignature(luna)) findingSignatureEquivalent += 1;
  }
  const summary = {
    experiment: 'problem-evaluator-basic-probes-terra-luna-v3',
    corpusVersion: corpus.corpusVersion,
    corpusHash: sha256(JSON.stringify(corpus)),
    promptVersion: PROMPT_VERSION,
    promptHash: sha256(prompt),
    effort: EFFORT,
    inputMode: 'BASELINE_FULL_GOLD',
    logicalProbes: resolvedProbes.length,
    repeatsPerProbe: REPEATS,
    expectedAssessmentDistribution: Object.fromEntries([
      'SUPPORTED',
      'CONTRADICTED',
      'INSUFFICIENT',
    ].map((assessment) => [
      assessment,
      resolvedProbes.filter((probe) => probe.expectedAssessment === assessment).length,
    ])),
    categoryCounts,
    qualityPriority: ['detailedPassed', 'assessmentPassed', 'findingPassed', 'errors'],
    lunaGate,
    terraExecuted: executedModels.includes(TERRA),
    priceSnapshot: { date: '2026-09-02', perMillionTokens: PRICE_PER_MILLION },
    byModel,
    pairedEquivalence: {
      paired,
      assessmentEquivalent,
      detailedPassEquivalent,
      findingSignatureEquivalent,
    },
  };
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.json'), results);
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
