import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  OpenAISourceDirectProblemEvaluator,
  SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION,
  SourceDirectProblemBundleSchema,
  SourceDirectProblemEvaluatorError,
  createProblemSolvingSession,
  createSourceDirectProblemEvaluatorInput,
  submitInitialProblemResponse,
  type SourceDirectProblemEvaluatorCallMetadata,
  type SourceDirectProblemEvaluatorInput,
  type SourceDirectProblemEvaluatorOutput,
  type SourceDirectProblemPromptVersion,
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const COST_CAP_USD = Number(process.env['SOURCE_DIRECT_RISK_COST_CAP_USD'] ?? '1');
const MAX_OUTPUT_TOKENS = 2_200;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const requestedPromptVersion = process.env['SOURCE_DIRECT_RISK_PROMPT_VERSION']?.trim() ??
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION;
if (requestedPromptVersion !== SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION &&
    requestedPromptVersion !== SOURCE_DIRECT_PROBLEM_PROMPT_VERSION) {
  throw new Error(`지원하지 않는 원문 직접 프롬프트 버전: ${requestedPromptVersion}`);
}
const PROMPT_VERSION: SourceDirectProblemPromptVersion = requestedPromptVersion;
const EXPERIMENT_ROOT = resolve(
  process.cwd(),
  'docs/experiments/problem-evaluator-three-reference-low-skill-10-item-2026-09-06',
);
const SOURCE_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts/source-cases');
const FIXTURE_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/problem-solving/three-reference-low-skill-ten-case-fixtures-v1.json',
);
const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/problem-solving',
  PROMPT_VERSION === SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION
    ? 'source-direct-problem-dialogue-prompt-v3.md'
    : 'source-direct-problem-dialogue-prompt-v2.md',
);
const OUTPUT_ROOT = resolve(
  process.cwd(),
  process.env['SOURCE_DIRECT_RISK_OUTPUT'] ??
    (PROMPT_VERSION === SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION
      ? 'docs/experiments/problem-source-direct-v3-intermediate-canary-2026-09-11/new-items'
      : 'docs/experiments/problem-source-direct-risk-format-canary-2026-09-08'),
);
const DRY_RUN = process.env['SOURCE_DIRECT_RISK_DRY_RUN'] === '1';

const SourceExperimentSchema = z.object({
  caseId: z.string().min(1),
  sourceInput: z.object({
    source: z.object({
      exam: z.string().min(1),
      title: z.string().min(1),
      passage: z.string().min(1),
      question: z.object({
        question_number: z.number().int().positive(),
        stem: z.string().min(1),
        supplements: z.array(z.object({
          label: z.string(),
          text: z.string(),
        }).passthrough()),
        choices: z.array(z.object({
          choice_number: z.number().int().positive(),
          text: z.string().min(1),
        }).passthrough()).min(2),
      }).passthrough(),
      answerKey: z.object({ correctChoice: z.number().int().positive() }).passthrough(),
    }).passthrough(),
  }).passthrough(),
  officialExplanationReference: z.object({ text: z.string().min(1) }).passthrough(),
}).passthrough();

const FixtureSchema = z.object({
  cases: z.array(z.object({
    caseId: z.string().min(1),
    mediaFiles: z.array(z.unknown()),
    responses: z.record(z.string(), z.object({
      choiceId: z.string().min(1),
      rationale: z.string().min(1),
    }).passthrough()),
  }).passthrough()),
}).passthrough();

const TARGETS = [
  {
    caseId: '69c01c4f78128b2a9bede42e-q27',
    risk: 'CORRECT_INSUFFICIENT_OVERACCEPT',
    responseKey: 'correctInsufficient',
    expected: 'ASSESS:UNCERTAIN',
  },
  {
    caseId: '69c0ad79fa5063deffe1e90b-q22',
    risk: 'CORRECT_INSUFFICIENT_OVERACCEPT',
    responseKey: 'correctInsufficient',
    expected: 'ASSESS:UNCERTAIN',
  },
  {
    caseId: '69bffa62fa5063deffe19c88-q8',
    risk: 'CORRECT_INSUFFICIENT_OVERACCEPT',
    responseKey: 'correctInsufficient',
    expected: 'ASSESS:UNCERTAIN',
  },
  {
    caseId: '69c01e63fa5063deffe1b596-q20',
    risk: 'WRONG_LOW_EVIDENCE_OVERCORRECTION',
    responseKey: 'wrongLow',
    expected: 'ASK_DIAGNOSTIC',
  },
  {
    caseId: '69bffb2978128b2a9bedcf17-q6',
    risk: 'WRONG_LOW_EVIDENCE_OVERCORRECTION',
    responseKey: 'wrongLow',
    expected: 'ASK_DIAGNOSTIC',
  },
  {
    caseId: '69c02034fa5063deffe1b915-q22',
    risk: 'WRONG_LOW_EVIDENCE_OVERCORRECTION',
    responseKey: 'wrongLow',
    expected: 'ASK_DIAGNOSTIC',
  },
] as const;

interface ResultRow {
  readonly caseId: string;
  readonly risk: string;
  readonly responseKey: string;
  readonly rationale: string;
  readonly expected: string;
  readonly observed: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly costUsd: number;
  readonly input: SourceDirectProblemEvaluatorInput;
  readonly output?: SourceDirectProblemEvaluatorOutput;
  readonly rawOutput?: unknown;
  readonly call?: SourceDirectProblemEvaluatorCallMetadata;
  readonly error?: string;
}

const fixtures = FixtureSchema.parse(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')));
const promptBytes = Buffer.byteLength(readFileSync(PROMPT_PATH, 'utf8'));
const evaluator = new OpenAISourceDirectProblemEvaluator({
  model: MODEL,
  effort: EFFORT,
  maxRetries: 0,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  timeoutMs: 90_000,
  promptVersion: PROMPT_VERSION,
});
const rows: ResultRow[] = [];
let spentUsd = 0;

function inferStemPolarity(stem: string): 'SELECT_CORRECT' | 'SELECT_INCORRECT' {
  return /적절하지\s*않|옳지\s*않|잘못된|일치하지\s*않/u.test(stem)
    ? 'SELECT_INCORRECT'
    : 'SELECT_CORRECT';
}

function loadTarget(target: typeof TARGETS[number]) {
  const sourceExperiment = SourceExperimentSchema.parse(JSON.parse(readFileSync(
    resolve(SOURCE_ROOT, target.caseId, 'experiment-input.json'),
    'utf8',
  )));
  const fixture = fixtures.cases.find((candidate) => candidate.caseId === target.caseId);
  if (fixture === undefined) throw new Error(`응답 fixture 없음: ${target.caseId}`);
  if (fixture.mediaFiles.length !== 0) {
    throw new Error(`완전한 원문 입력을 보장할 수 없는 다중 이미지 문항: ${target.caseId}`);
  }
  const response = fixture.responses[target.responseKey];
  if (response === undefined) throw new Error(`응답 없음: ${target.caseId}/${target.responseKey}`);
  const raw = sourceExperiment.sourceInput.source;
  const scenario = raw.question.supplements
    .map((supplement) => `${supplement.label}\n${supplement.text}`.trim())
    .join('\n\n');
  const bundle = SourceDirectProblemBundleSchema.parse({
    schemaVersion: 'source-direct-problem-bundle-v2',
    questionId: target.caseId,
    questionNumber: raw.question.question_number,
    passageId: target.caseId.replace(/-q[0-9]+$/u, ''),
    title: raw.title,
    exam: raw.exam,
    passage: raw.passage,
    stem: raw.question.stem,
    stemPolarity: inferStemPolarity(raw.question.stem),
    scenario,
    media: [],
    choices: raw.question.choices.map((choice) => ({
      choiceId: `C${choice.choice_number}`,
      position: choice.choice_number,
      text: choice.text,
    })),
    answerChoiceId: `C${raw.answerKey.correctChoice}`,
    officialExplanation: sourceExperiment.officialExplanationReference.text,
  });
  return { bundle, response };
}

function usageCost(usage: SourceDirectProblemEvaluatorCallMetadata['usage']): number {
  const cached = usage.cacheReadTokens ?? 0;
  return (
    (usage.inputTokens - cached) * PRICE_PER_MILLION.input +
    cached * PRICE_PER_MILLION.cachedInput +
    usage.outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function maximumCallCost(input: SourceDirectProblemEvaluatorInput): number {
  const tokenUpperBound = promptBytes + Buffer.byteLength(JSON.stringify(input));
  return (
    tokenUpperBound * PRICE_PER_MILLION.input +
    MAX_OUTPUT_TOKENS * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function observed(output: SourceDirectProblemEvaluatorOutput): string {
  return output.mode === 'ASSESS_SELECTION_RATIONALE'
    ? `ASSESS:${output.assessment}`
    : output.nextAction.type;
}

async function run(target: typeof TARGETS[number]): Promise<void> {
  const { bundle, response } = loadTarget(target);
  const session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `RISK-CANARY-${target.caseId}`,
    questionId: target.caseId,
    answerChoiceId: bundle.answerChoiceId,
  }), {
    initialChoiceId: response.choiceId,
    rationale: response.rationale,
  });
  const input = createSourceDirectProblemEvaluatorInput({
    evaluationMode: response.choiceId === bundle.answerChoiceId
      ? 'ASSESS_SELECTION_RATIONALE'
      : 'DIAGNOSE_PATH',
    session,
    source: bundle,
    promptVersion: PROMPT_VERSION,
  });
  const nextMaximum = maximumCallCost(input);
  if (spentUsd + nextMaximum > COST_CAP_USD) {
    throw new Error(
      `비용 하드캡 전 중단: $${spentUsd.toFixed(4)} + 다음 최대 ` +
      `$${nextMaximum.toFixed(4)} > $${COST_CAP_USD.toFixed(2)}`,
    );
  }
  const started = Date.now();
  try {
    const result = await evaluator.evaluate(input);
    const costUsd = usageCost(result.call.usage);
    spentUsd += costUsd;
    const action = observed(result.result);
    rows.push({
      ...target,
      rationale: response.rationale,
      observed: action,
      passed: action === target.expected,
      durationMs: Date.now() - started,
      costUsd,
      input,
      output: result.result,
      rawOutput: result.rawOutput,
      call: result.call,
    });
    process.stdout.write(
      `${target.caseId}: ${action} ${action === target.expected ? 'PASS' : 'FAIL'} ` +
      `cost=$${costUsd.toFixed(4)}\n`,
    );
  } catch (error) {
    const failure = error instanceof SourceDirectProblemEvaluatorError ? error : null;
    const costUsd = failure === null ? 0 : usageCost(failure.call.usage);
    spentUsd += costUsd;
    rows.push({
      ...target,
      rationale: response.rationale,
      observed: 'ERROR',
      passed: false,
      durationMs: Date.now() - started,
      costUsd,
      input,
      ...(failure === null ? {} : { call: failure.call, rawOutput: failure.rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    });
    process.stdout.write(
      `${target.caseId}: ERROR cost=$${costUsd.toFixed(4)} ` +
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

function writeArtifacts(): void {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const passed = rows.filter((row) => row.passed).length;
  const summary = {
    artifactType: 'problem-source-direct-risk-format-canary-summary-v1',
    executedAt: new Date().toISOString(),
    policyId: 'PS-PROBLEM-SOURCE-DIRECT-V1',
    model: MODEL,
    effort: EFFORT,
    promptVersion: PROMPT_VERSION,
    hardCapUsd: COST_CAP_USD,
    calls: rows.length,
    passed,
    failed: rows.length - passed,
    observedCostUsd: Number(spentUsd.toFixed(6)),
    inputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.inputTokens ?? 0), 0),
    cachedInputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.cacheReadTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.outputTokens ?? 0), 0),
    recommendation: passed === rows.length && rows.length === TARGETS.length
      ? 'TARGETED_RISK_PASS'
      : 'HOLD_AND_REVIEW',
  };
  writeFileSync(resolve(OUTPUT_ROOT, 'results.json'), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const lines = rows.map((row) =>
    `| ${row.caseId} | ${row.risk} | ${row.expected} | ${row.observed} | ` +
    `${row.passed ? 'PASS' : 'FAIL'} | $${row.costUsd.toFixed(4)} |`,
  ).join('\n');
  writeFileSync(resolve(OUTPUT_ROOT, 'REPORT.md'),
    `# 문제 풀이 원문 직접 고위험 형식 canary\n\n` +
    `- 호출: ${summary.calls}회\n` +
    `- 기대 일치: ${summary.passed}/${summary.calls}\n` +
    `- 비용: $${summary.observedCostUsd.toFixed(4)} / 하드캡 $${COST_CAP_USD.toFixed(2)}\n` +
    `- 권고: \`${summary.recommendation}\`\n\n` +
    `| 문항 | 위험 | 기대 | 관측 | 결과 | 비용 |\n` +
    `|---|---|---|---|---|---:|\n${lines}\n`,
  );
}

if (DRY_RUN) {
  process.stdout.write(`${JSON.stringify({
    promptVersion: PROMPT_VERSION,
    targets: TARGETS.map((target) => {
      const loaded = loadTarget(target);
      return {
        ...target,
        answerChoiceId: loaded.bundle.answerChoiceId,
        selectedChoiceId: loaded.response.choiceId,
        mediaCount: loaded.bundle.media.length,
      };
    }),
    plannedCalls: TARGETS.length,
  }, null, 2)}\n`);
} else {
  try {
    for (const target of TARGETS) await run(target);
  } finally {
    writeArtifacts();
  }
}
