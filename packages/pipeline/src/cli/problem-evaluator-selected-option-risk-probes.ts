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

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const PROMPT_VERSION = 'selected-option-rationale-risk-prompt-v2';
const CORPUS_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-risk-probes-v1.json',
);
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/selected-option-rationale-risk-prompt-v2.md',
);
const GOLD_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const OUTPUT_ROOT = resolve(
  'docs/experiments/problem-evaluator-selected-option-risk-probes-v2-2026-09-02',
);

const ExpectedFindingSchema = z.object({
  quoteAnchor: z.string().min(1),
  relationToGold: z.enum(['MATCHES', 'CONFLICTS', 'NOT_ESTABLISHED']),
  decisionRelevance: z.enum(['DECISIVE', 'NON_DECISIVE']),
  sourceRefsAny: z.array(z.string().min(1)).min(1),
}).strict();
const ProbeSchema = z.object({
  probeId: z.string().min(1),
  riskType: z.enum([
    'ALTERNATIVE_VALID_RATIONALE',
    'CORRECT_CORE_WITH_FALSE_ANCILLARY',
    'RELATED_NON_DECISIVE_ONLY',
    'MISSING_ONE_OF_MULTIPLE_PREMISES',
    'CONTRADICTS_VS_DOES_NOT_JUSTIFY',
    'NEW_VALID_GROUND_OUTSIDE_SLICE',
  ]),
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

type Arm = SelectedOptionRationaleInput['arm'];
type Probe = z.infer<typeof ProbeSchema>;

interface Job {
  readonly probe: Probe;
  readonly iteration: number;
  readonly arm: Arm;
  readonly gold: ProblemQuestionGold;
  readonly goldHash: string;
}

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
  readonly riskType: Probe['riskType'];
  readonly caseId: string;
  readonly choiceId: string;
  readonly iteration: number;
  readonly arm: Arm;
  readonly profile: string;
  readonly expectedAssessment: Probe['expectedAssessment'];
  readonly observedAssessment: string;
  readonly assessmentPassed: boolean;
  readonly findingsPassed: boolean;
  readonly passed: boolean;
  readonly findingGrades: readonly FindingGrade[];
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

async function runJob(job: Job, prompt: string): Promise<{
  readonly result: Result;
  readonly auditManifest: unknown;
}> {
  const startedAt = Date.now();
  let input: SelectedOptionRationaleInput | undefined;
  let auditManifest: unknown = null;
  let rawOutput: string | undefined;
  let responseId: string | undefined;
  try {
    const projection = createSelectedOptionRationaleInput({
      arm: job.arm,
      gold: job.gold,
      selectedChoiceId: job.probe.choiceId,
      studentRationale: job.probe.rationale,
      observationId: 'O1',
      experimentAuditId: `${PROMPT_VERSION}:${job.probe.probeId}`,
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
          name: 'selected_option_rationale_risk_output',
          strict: true,
          schema: z.toJSONSchema(SelectedOptionRationaleOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    rawOutput = response.output_text;
    responseId = response.id;
    const output = validateSelectedOptionRationaleOutput(
      JSON.parse(rawOutput),
      input,
    );
    const findingGrades = gradeFindings(output, job.probe);
    const assessmentPassed = output.rationaleAssessment === job.probe.expectedAssessment;
    const findingsPassed = findingGrades.every((grade) => grade.passed);
    return {
      result: {
        probeId: job.probe.probeId,
        riskType: job.probe.riskType,
        caseId: job.probe.caseId,
        choiceId: job.probe.choiceId,
        iteration: job.iteration,
        arm: job.arm,
        profile: input.evaluationContext.profile,
        expectedAssessment: job.probe.expectedAssessment,
        observedAssessment: output.rationaleAssessment,
        assessmentPassed,
        findingsPassed,
        passed: assessmentPassed && findingsPassed,
        findingGrades,
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
        rawOutput,
        responseId,
      },
      auditManifest,
    };
  } catch (error) {
    const inputJson = input === undefined ? '' : JSON.stringify(input);
    return {
      result: {
        probeId: job.probe.probeId,
        riskType: job.probe.riskType,
        caseId: job.probe.caseId,
        choiceId: job.probe.choiceId,
        iteration: job.iteration,
        arm: job.arm,
        profile: input?.evaluationContext.profile ?? 'PROJECTION_ERROR',
        expectedAssessment: job.probe.expectedAssessment,
        observedAssessment: 'ERROR',
        assessmentPassed: false,
        findingsPassed: false,
        passed: false,
        findingGrades: [],
        durationMs: Date.now() - startedAt,
        inputBytes: Buffer.byteLength(inputJson),
        inputHash: sha256(inputJson),
        goldHash: job.goldHash,
        sliceHash: input?.arm === 'SELECTED_OPTION_COMPLETE'
          ? input.evidenceGold.sliceHash
          : null,
        error: error instanceof Error ? error.message : String(error),
        ...(rawOutput === undefined ? {} : { rawOutput }),
        ...(responseId === undefined ? {} : { responseId }),
      },
      auditManifest,
    };
  }
}

function anchorSignature(result: Result): string {
  return result.findingGrades.map((grade) => [
    grade.quoteAnchor,
    grade.observedRelation,
    grade.observedRelevance,
  ].join('|')).join('||');
}

async function main(): Promise<void> {
  const corpus = CorpusSchema.parse(await readJson(CORPUS_PATH));
  const prompt = await readFile(PROMPT_PATH, 'utf8');
  await mkdir(resolve(OUTPUT_ROOT, 'artifacts'), { recursive: true });
  const goldByCase = new Map<string, { gold: ProblemQuestionGold; hash: string }>();
  for (const caseId of new Set(corpus.probes.map((probe) => probe.caseId))) {
    const rawGold = await readFile(resolve(GOLD_ROOT, caseId, 'c-gold.json'), 'utf8');
    goldByCase.set(caseId, {
      gold: ProblemQuestionGoldSchema.parse(JSON.parse(rawGold)),
      hash: sha256(rawGold),
    });
  }
  const jobs: Job[] = [];
  for (const probe of corpus.probes) {
    const goldEntry = goldByCase.get(probe.caseId)!;
    for (const arm of ['BASELINE_FULL_GOLD', 'SELECTED_OPTION_COMPLETE'] as const) {
      for (let iteration = 1; iteration <= REPEATS; iteration += 1) {
        jobs.push({ probe, iteration, arm, gold: goldEntry.gold, goldHash: goldEntry.hash });
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
        manifests.set(`${item.result.probeId}|${item.result.arm}`, item.auditManifest);
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
      assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
      findingsPassed: selected.filter((result) => result.findingsPassed).length,
      total: selected.length,
      errors: selected.filter((result) => result.error !== undefined).length,
      averageInputTokens: mean(selected.map((result) => result.usage?.inputTokens ?? 0)),
      averageInputBytes: mean(selected.map((result) => result.inputBytes)),
    }];
  }));
  const byRiskType = Object.fromEntries(
    [...new Set(corpus.probes.map((probe) => probe.riskType))].map((riskType) => [
      riskType,
      Object.fromEntries(arms.map((arm) => {
        const selected = results.filter(
          (result) => result.riskType === riskType && result.arm === arm,
        );
        return [arm, {
          passed: selected.filter((result) => result.passed).length,
          assessmentPassed: selected.filter((result) => result.assessmentPassed).length,
          findingsPassed: selected.filter((result) => result.findingsPassed).length,
          total: selected.length,
        }];
      })),
    ]),
  );
  let paired = 0;
  let assessmentEquivalent = 0;
  let findingSignatureEquivalent = 0;
  for (const baseline of results.filter((result) => result.arm === 'BASELINE_FULL_GOLD')) {
    const slice = results.find((candidate) =>
      candidate.arm === 'SELECTED_OPTION_COMPLETE' &&
      candidate.probeId === baseline.probeId &&
      candidate.iteration === baseline.iteration);
    if (slice === undefined) continue;
    paired += 1;
    if (slice.observedAssessment === baseline.observedAssessment) assessmentEquivalent += 1;
    if (anchorSignature(slice) === anchorSignature(baseline)) findingSignatureEquivalent += 1;
  }
  const full = byArm['BASELINE_FULL_GOLD']!;
  const slice = byArm['SELECTED_OPTION_COMPLETE']!;
  const summary = {
    experiment: 'problem-evaluator-selected-option-risk-probes-v2',
    corpusVersion: corpus.corpusVersion,
    promptVersion: PROMPT_VERSION,
    promptHash: sha256(prompt),
    model: MODEL,
    effort: EFFORT,
    probes: corpus.probes.length,
    riskTypes: new Set(corpus.probes.map((probe) => probe.riskType)).size,
    repeatsPerProbe: REPEATS,
    calls: results.length,
    byArm,
    byRiskType,
    pairedEquivalence: { paired, assessmentEquivalent, findingSignatureEquivalent },
    deltas: {
      passed: slice.passed - full.passed,
      assessmentPassed: slice.assessmentPassed - full.assessmentPassed,
      findingsPassed: slice.findingsPassed - full.findingsPassed,
      averageInputTokenReductionRate: full.averageInputTokens === 0
        ? null
        : 1 - slice.averageInputTokens / full.averageInputTokens,
    },
    note: '상세 통과는 최종 라벨뿐 아니라 고정 quote anchor의 관계·결정성·필수 source ref를 모두 요구한다.',
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
