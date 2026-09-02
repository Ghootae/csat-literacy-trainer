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
} from '../problem-solving/selected-option-rationale-input.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const PROMPT_VERSION = 'selected-option-rationale-ab-prompt-v2';
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-rationale-ab-prompt-v2.md',
);
const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/problem-gold-explanation-cycle-corpus-v1.json',
);
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-evaluator-selected-option-slice-ab-v2-2026-09-02',
);

const CorpusSchema = z.object({
  baselineExperimentRoot: z.string(),
  items: z.array(z.object({ caseId: z.string() })),
});
const StudentCasesSchema = z.object({
  accurate: z.object({ choiceId: z.string(), rationale: z.string() }),
  representativeWrong: z.object({ choiceId: z.string(), rationale: z.string() }),
});

type Arm = SelectedOptionRationaleInput['arm'];
type Category = 'accurate' | 'representativeWrong';

interface Job {
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly arm: Arm;
  readonly gold: ProblemQuestionGold;
  readonly choiceId: string;
  readonly rationale: string;
  readonly goldHash: string;
}

interface Result {
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly arm: Arm;
  readonly profile: string;
  readonly expected: 'SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT';
  readonly expectedBasis: string;
  readonly passed: boolean;
  readonly observed: string;
  readonly durationMs: number;
  readonly inputBytes: number;
  readonly inputHash: string;
  readonly goldHash: string;
  readonly sliceHash: string | null;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cachedInputTokens: number;
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

async function runJob(job: Job, prompt: string): Promise<{
  readonly result: Result;
  readonly auditManifest: unknown;
}> {
  const expectedContract = expectedAssessment(job);
  const { expected, basis: expectedBasis } = expectedContract;
  const startedAt = Date.now();
  let input: SelectedOptionRationaleInput | undefined;
  let auditManifest: unknown = null;
  try {
    const projection = createSelectedOptionRationaleInput({
      arm: job.arm,
      gold: job.gold,
      selectedChoiceId: job.choiceId,
      studentRationale: job.rationale,
      observationId: 'O1',
      experimentAuditId: `${PROMPT_VERSION}:${job.caseId}:${job.choiceId}`,
    });
    input = projection.input;
    auditManifest = projection.auditManifest;
    const inputJson = JSON.stringify(input);
    const client = new OpenAI({ maxRetries: 0 });
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: inputJson,
      reasoning: { effort: EFFORT },
      max_output_tokens: 4_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'selected_option_rationale_output',
          strict: true,
          schema: z.toJSONSchema(SelectedOptionRationaleOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    const output = validateSelectedOptionRationaleOutput(
      JSON.parse(response.output_text),
      input,
    );
    return {
      result: {
        caseId: job.caseId,
        category: job.category,
        iteration: job.iteration,
        arm: job.arm,
        profile: input.evaluationContext.profile,
        expected,
        expectedBasis,
        passed: output.rationaleAssessment === expected,
        observed: output.rationaleAssessment,
        durationMs: Date.now() - startedAt,
        inputBytes: Buffer.byteLength(inputJson),
        inputHash: sha256(inputJson),
        goldHash: job.goldHash,
        sliceHash: input.arm === 'SELECTED_OPTION_COMPLETE'
          ? input.evidenceGold.sliceHash
          : null,
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        },
        output,
        rawOutput: response.output_text,
        responseId: response.id,
      },
      auditManifest,
    };
  } catch (error) {
    const inputJson = input === undefined ? '' : JSON.stringify(input);
    return {
      result: {
        caseId: job.caseId,
        category: job.category,
        iteration: job.iteration,
        arm: job.arm,
        profile: input?.evaluationContext.profile ?? 'PROJECTION_ERROR',
        expected,
        expectedBasis,
        passed: false,
        observed: 'ERROR',
        durationMs: Date.now() - startedAt,
        inputBytes: Buffer.byteLength(inputJson),
        inputHash: sha256(inputJson),
        goldHash: job.goldHash,
        sliceHash: input?.arm === 'SELECTED_OPTION_COMPLETE'
          ? input.evidenceGold.sliceHash
          : null,
        error: error instanceof Error ? error.message : String(error),
      },
      auditManifest,
    };
  }
}

function expectedAssessment(job: Job): {
  readonly expected: 'SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT';
  readonly basis: string;
} {
  if (job.category === 'accurate') {
    return { expected: 'SUPPORTED', basis: 'ACCURATE_RATIONALE' };
  }
  const choice = job.gold.choices.find((item) => item.choiceId === job.choiceId);
  if (choice === undefined) throw new Error(`기대 라벨 대상 선지를 찾을 수 없다: ${job.choiceId}`);
  const claims = job.gold.optionClaims.filter((claim) => choice.claimIds.includes(claim.claimId));
  const explicitCritical = claims.filter((claim) => claim.decisionCritical);
  const decisionClaims = explicitCritical.length > 0
    ? explicitCritical
    : claims.filter((claim) => claim.itemInferenceIds.length > 0);
  const inferenceIds = new Set(decisionClaims.flatMap((claim) => claim.itemInferenceIds));
  const effects = new Set(job.gold.itemInferences
    .filter((inference) => inferenceIds.has(inference.inferenceId))
    .map((inference) => inference.targetClaimEffect));
  if (effects.size > 0 && [...effects].every((effect) => effect === 'DOES_NOT_JUSTIFY')) {
    return {
      expected: 'INSUFFICIENT',
      basis: 'WRONG_RATIONALE_FOR_DOES_NOT_JUSTIFY',
    };
  }
  return { expected: 'CONTRADICTED', basis: 'WRONG_RATIONALE_WITH_DERIVABLE_NEGATION' };
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  const prompt = await readFile(PROMPT_PATH, 'utf8');
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const jobs: Job[] = [];
  for (const { caseId } of corpus.items) {
    const rawGold = await readFile(resolve(GOLD_ROOT, caseId, 'c-gold.json'), 'utf8');
    const gold = ProblemQuestionGoldSchema.parse(JSON.parse(rawGold));
    const cases = StudentCasesSchema.parse(await readJson(resolve(
      corpus.baselineExperimentRoot,
      caseId,
      'student-response-cases.json',
    )));
    for (const category of ['accurate', 'representativeWrong'] as const) {
      for (const arm of ['BASELINE_FULL_GOLD', 'SELECTED_OPTION_COMPLETE'] as const) {
        for (let iteration = 1; iteration <= REPEATS; iteration += 1) {
          jobs.push({
            caseId,
            category,
            iteration,
            arm,
            gold,
            choiceId: cases[category].choiceId,
            rationale: cases[category].rationale,
            goldHash: sha256(rawGold),
          });
        }
      }
    }
  }

  const results: Result[] = [];
  const manifests = new Map<string, unknown>();
  for (let index = 0; index < jobs.length; index += CONCURRENCY) {
    const batch = await Promise.all(jobs.slice(index, index + CONCURRENCY)
      .map((job) => runJob(job, prompt)));
    for (const item of batch) {
      results.push(item.result);
      if (item.auditManifest !== null) {
        manifests.set([
          item.result.caseId,
          item.result.category,
          item.result.arm,
        ].join('|'), item.auditManifest);
      }
    }
    await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.partial.json'), results);
    process.stdout.write(`[${results.length}/${jobs.length}] completed\n`);
  }

  const arms = ['BASELINE_FULL_GOLD', 'SELECTED_OPTION_COMPLETE'] as const;
  const byArm = Object.fromEntries(arms.map((arm) => {
    const selected = results.filter((result) => result.arm === arm);
    return [arm, {
      passed: selected.filter((result) => result.passed).length,
      total: selected.length,
      errors: selected.filter((result) => result.error !== undefined).length,
      averageInputBytes: mean(selected.map((result) => result.inputBytes)),
      averageInputTokens: mean(selected.map((result) => result.usage?.inputTokens ?? 0)),
      totalInputTokens: selected.reduce(
        (sum, result) => sum + (result.usage?.inputTokens ?? 0),
        0,
      ),
      averageOutputTokens: mean(selected.map((result) => result.usage?.outputTokens ?? 0)),
      averageDurationMs: mean(selected.map((result) => result.durationMs)),
    }];
  }));
  const byProfile = Object.fromEntries(
    [...new Set(results.map((result) => result.profile))].sort().map((profile) => [
      profile,
      Object.fromEntries(arms.map((arm) => {
        const selected = results.filter(
          (result) => result.profile === profile && result.arm === arm,
        );
        return [arm, {
          passed: selected.filter((result) => result.passed).length,
          total: selected.length,
        }];
      })),
    ]),
  );
  let equivalent = 0;
  let paired = 0;
  for (const result of results.filter((item) => item.arm === 'BASELINE_FULL_GOLD')) {
    const pair = results.find((item) =>
      item.arm === 'SELECTED_OPTION_COMPLETE' &&
      item.caseId === result.caseId &&
      item.category === result.category &&
      item.iteration === result.iteration
    );
    if (pair === undefined) continue;
    paired += 1;
    if (pair.observed === result.observed) equivalent += 1;
  }
  const baseline = byArm['BASELINE_FULL_GOLD']!;
  const slice = byArm['SELECTED_OPTION_COMPLETE']!;
  const summary = {
    experiment: 'problem-evaluator-selected-option-slice-ab-v2',
    promptVersion: PROMPT_VERSION,
    promptHash: sha256(prompt),
    model: MODEL,
    effort: EFFORT,
    repeatsPerCaseAndCategory: REPEATS,
    cases: corpus.items.length,
    categories: ['accurate', 'representativeWrong'],
    calls: results.length,
    byArm,
    byProfile,
    pairedAssessmentEquivalence: { equivalent, paired },
    deltas: {
      passed: slice.passed - baseline.passed,
      averageInputTokenReductionRate: baseline.averageInputTokens === 0
        ? null
        : 1 - slice.averageInputTokens / baseline.averageInputTokens,
      averageInputByteReductionRate: baseline.averageInputBytes === 0
        ? null
        : 1 - slice.averageInputBytes / baseline.averageInputBytes,
    },
    sliceFallbacks: 0,
    note: 'candidate 골드의 DOES_NOT_JUSTIFY coverage certificate는 EXPERIMENT_ONLY이며 운영 승인이 아니다. DOES_NOT_JUSTIFY 오답 근거의 기대 라벨은 INSUFFICIENT다.',
  };
  await writeJson(resolve(OUTPUT_ROOT, 'artifacts', 'results.json'), results);
  await writeJson(
    resolve(OUTPUT_ROOT, 'artifacts', 'slice-audit-manifests.json'),
    Object.fromEntries(manifests),
  );
  await writeJson(resolve(OUTPUT_ROOT, 'SUMMARY.json'), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
