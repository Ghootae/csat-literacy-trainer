import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  ParagraphDiagnosticGoldSchema,
  TwoStageDialogueEvaluator,
  type ParagraphDiagnosticGold,
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const PRICE = { input: 2, cached: 0.2, output: 12 } as const;
const CAP_USD = 4;
const GUARD_USD = 0.2;
const PRIOR_ACCOUNTED_COST_USD = 2.8929132;
const ROOT = resolve('docs/experiments/dialogue-selective-router-regression-42-2026-09-09/repair-1');
const GOLD_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/gold-v2');

const ManifestSchema = z.object({
  targets: z.array(z.object({
    targetKey: z.string(),
    paragraphId: z.string(),
    category: z.enum(['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY']),
    initialStudentSummary: z.string(),
  })),
});

const PriorTrajectorySchema = z.array(z.object({
  targetKey: z.string(),
  category: z.enum(['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY']),
  judge: z.object({
    output: z.object({ solutionLeakageCount: z.number() }),
  }).nullable(),
}));

const JudgeSchema = z.object({
  outputVersion: z.literal('selective-router-repair-judge-v1'),
  routeAppropriate: z.boolean(),
  targetAppropriate: z.boolean(),
  questionNonLeading: z.boolean(),
  solutionLeakage: z.boolean(),
  note: z.string().min(1).max(700),
}).strict();

interface Usage {
  readonly input: number;
  readonly cached: number;
  readonly output: number;
}

interface Target {
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly category: 'PARTIAL' | 'EXPLICIT_ERROR' | 'TOPIC_ONLY';
  readonly initialStudentSummary: string;
  readonly gold: ParagraphDiagnosticGold;
}

function usage(response: { readonly usage?: {
  readonly input_tokens?: number;
  readonly input_tokens_details?: { readonly cached_tokens?: number };
  readonly output_tokens?: number;
} | null }): Usage {
  return {
    input: response.usage?.input_tokens ?? 0,
    cached: response.usage?.input_tokens_details?.cached_tokens ?? 0,
    output: response.usage?.output_tokens ?? 0,
  };
}

function cost(value: Usage): number {
  return ((value.input - value.cached) * PRICE.input + value.cached * PRICE.cached +
    value.output * PRICE.output) / 1_000_000;
}

function evaluatorCost(call: { readonly usage?: {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens?: number;
} }): number {
  return cost({
    input: call.usage?.inputTokens ?? 0,
    cached: call.usage?.cacheReadTokens ?? 0,
    output: call.usage?.outputTokens ?? 0,
  });
}

async function loadTargets(): Promise<Target[]> {
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(
    'docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08/artifacts/target-manifest.json',
    'utf8',
  )));
  const prior = PriorTrajectorySchema.parse(JSON.parse(await readFile(
    'docs/experiments/dialogue-selective-router-regression-42-2026-09-09/artifacts/trajectories.json',
    'utf8',
  )));
  const nonTopicLeakage = new Set(prior
    .filter((item) => item.category !== 'TOPIC_ONLY' && (item.judge?.output.solutionLeakageCount ?? 0) > 0)
    .slice(0, 5)
    .map((item) => item.targetKey));
  const selected = manifest.targets.filter((target) =>
    target.category === 'TOPIC_ONLY' || nonTopicLeakage.has(target.targetKey)
  );
  return Promise.all(selected.map(async (target) => ({
    ...target,
    gold: ParagraphDiagnosticGoldSchema.parse(JSON.parse(await readFile(
      resolve(GOLD_ROOT, `${target.paragraphId}.json`),
      'utf8',
    ))),
  })));
}

function expectedRoute(category: Target['category']): 'ERROR' | 'TARGETED_GAP' | 'SPARSE_GAP' {
  if (category === 'EXPLICIT_ERROR') return 'ERROR';
  if (category === 'TOPIC_ONLY') return 'SPARSE_GAP';
  return 'TARGETED_GAP';
}

async function main(): Promise<void> {
  if (!process.argv.includes('--approved-cost-cap=4')) {
    throw new Error('유료 표적 재검증에는 --approved-cost-cap=4가 필요합니다.');
  }
  const targets = await loadTargets();
  const judgePrompt = await readFile(
    'packages/pipeline/experiments/dialogue/selective-router-repair-judge-prompt-v1.md',
    'utf8',
  );
  const evaluator = new TwoStageDialogueEvaluator({ promptRevision: 'v3' });
  const client = new OpenAI({ maxRetries: 2 });
  const results: unknown[] = [];
  let accounted = PRIOR_ACCOUNTED_COST_USD;
  let newObserved = 0;

  for (const target of targets) {
    if (accounted + 0.16 + GUARD_USD > CAP_USD) {
      throw new Error(`비용 안전 중단: accounted=$${accounted.toFixed(4)}`);
    }
    const evaluated = await evaluator.evaluate({
      gold: target.gold,
      goldVersion: 'paragraph-diagnostic-gold-v2-reviewed-candidate',
      goldHash: 'repair-canary',
      initialResponse: target.initialStudentSummary,
      history: [],
      turn: 1,
      questionsAsked: 0,
      maxQuestions: 3,
    });
    const evaluationCost = evaluatorCost(evaluated.call);
    accounted += evaluationCost;
    newObserved += evaluationCost;

    const judgeResponse = await client.responses.create({
      model: MODEL,
      instructions: judgePrompt,
      input: JSON.stringify({
        paragraphText: target.gold.paragraphText,
        referenceGold: target.gold,
        initialStudentSummary: target.initialStudentSummary,
        expectedRoute: expectedRoute(target.category),
        observed: {
          route: evaluated.result.snapshot.diagnosticRoute,
          feedback: evaluated.result.studentFeedback,
          question: evaluated.result.nextQuestion,
          targetDescription: evaluated.result.targetIssue?.description ?? null,
        },
      }),
      reasoning: { effort: 'medium' },
      max_output_tokens: 1_400,
      store: false,
      text: { format: {
        type: 'json_schema',
        name: 'selective_router_repair_judge',
        strict: true,
        schema: z.toJSONSchema(JudgeSchema),
      } },
    }, { timeout: 120_000, maxRetries: 2 });
    const judgeUsage = usage(judgeResponse);
    const judgeCost = cost(judgeUsage);
    accounted += judgeCost;
    newObserved += judgeCost;
    results.push({
      targetKey: target.targetKey,
      category: target.category,
      expectedRoute: expectedRoute(target.category),
      observedRoute: evaluated.result.snapshot.diagnosticRoute,
      responseInformationLevel: evaluated.result.snapshot.axisStates === undefined
        ? null
        : evaluated.result.snapshot.diagnosticRoute,
      feedback: evaluated.result.studentFeedback,
      question: evaluated.result.nextQuestion,
      judge: JudgeSchema.parse(JSON.parse(judgeResponse.output_text)),
      costUsd: evaluationCost + judgeCost,
    });
    await mkdir(ROOT, { recursive: true });
    await writeFile(resolve(ROOT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
    process.stdout.write(`완료 ${results.length}/${targets.length}, 신규 $${newObserved.toFixed(4)}, 계상 $${accounted.toFixed(4)}\n`);
  }

  const parsed = results as Array<{
    readonly category: Target['category'];
    readonly expectedRoute: string;
    readonly observedRoute: string;
    readonly judge: z.infer<typeof JudgeSchema>;
  }>;
  const summary = {
    cases: parsed.length,
    topicOnlyCases: parsed.filter((item) => item.category === 'TOPIC_ONLY').length,
    routeMatch: parsed.filter((item) => item.expectedRoute === item.observedRoute).length,
    routeAppropriate: parsed.filter((item) => item.judge.routeAppropriate).length,
    targetAppropriate: parsed.filter((item) => item.judge.targetAppropriate).length,
    nonLeading: parsed.filter((item) => item.judge.questionNonLeading).length,
    leakage: parsed.filter((item) => item.judge.solutionLeakage).length,
    newObservedCostUsd: newObserved,
    totalAccountedAgainstCapUsd: accounted,
    capUsd: CAP_USD,
  };
  await writeFile(resolve(ROOT, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

await main();
