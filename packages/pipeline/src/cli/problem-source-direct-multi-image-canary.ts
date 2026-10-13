import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  OpenAISourceDirectProblemEvaluator,
  SourceDirectProblemBundleSchema,
  SourceDirectProblemEvaluatorError,
  createProblemSolvingSession,
  createSourceDirectProblemEvaluatorInput,
  createSourceDirectProblemRequestContent,
  submitInitialProblemResponse,
  type SourceDirectProblemEvaluatorCallMetadata,
  type SourceDirectProblemEvaluatorInput,
  type SourceDirectProblemEvaluatorOutput,
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const COST_CAP_USD = 1;
const MAX_OUTPUT_TOKENS = 2_400;
const IMAGE_TOKEN_GUARD = 20_000;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
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
  'packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v2.md',
);
const TARGET_CASE_FILTER = process.argv[2];
const OUTPUT_ROOT = resolve(
  process.cwd(),
  'docs/experiments/problem-source-direct-multi-image-canary-2026-09-09',
  ...(TARGET_CASE_FILTER === undefined ? [] : ['repair-1']),
);

const PlacementSchema = z.discriminatedUnion('scope', [
  z.object({
    scope: z.literal('PASSAGE'),
    elementIndex: z.number().int().nonnegative().optional(),
  }).passthrough(),
  z.object({
    scope: z.literal('SCENARIO'),
    supplementIndex: z.number().int().nonnegative(),
    elementIndex: z.number().int().nonnegative().optional(),
  }).passthrough(),
  z.object({
    scope: z.literal('CHOICE'),
    choiceId: z.string().min(1),
    elementIndex: z.number().int().nonnegative().optional(),
  }).passthrough(),
]);

const SourceExperimentSchema = z.object({
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
      media: z.array(z.object({
        mediaId: z.string().min(1),
        sourceUrl: z.string().url(),
        mimeType: z.string().regex(/^image\//u),
        contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        placement: PlacementSchema,
      }).passthrough()).min(2),
    }).passthrough(),
  }).passthrough(),
  officialExplanationReference: z.object({ text: z.string().min(1) }).passthrough(),
}).passthrough();

const FixtureSchema = z.object({
  cases: z.array(z.object({
    caseId: z.string().min(1),
    mediaFiles: z.array(z.object({
      path: z.string().min(1),
      mimeType: z.string().regex(/^image\//u),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
      placement: z.string().min(1),
    }).strict()),
    responses: z.record(z.string(), z.object({
      choiceId: z.string().min(1),
      rationale: z.string().min(1),
    }).passthrough()),
  }).passthrough()),
}).passthrough();

const TARGETS = [
  { caseId: '6a2294f386fd308968e10e95-q19', responseKey: 'wrongMediumLow' },
  { caseId: '6a22950f86fd308968e11320-q19', responseKey: 'wrongMediumLow' },
  { caseId: '69c0186c78128b2a9bede0c8-q25', responseKey: 'wrongMediumLow' },
  { caseId: '69c0994b78128b2a9bee0922-q30', responseKey: 'wrongMediumLow' },
] as const;

interface PreparedCase {
  readonly caseId: string;
  readonly responseKey: string;
  readonly rationale: string;
  readonly input: SourceDirectProblemEvaluatorInput;
  readonly mediaAudit: readonly {
    readonly mediaId: string;
    readonly mimeType: string;
    readonly width: number;
    readonly height: number;
    readonly contentHash?: string | undefined;
    readonly placement: unknown;
  }[];
  readonly maximumCostUsd: number;
}

interface ResultRow extends Omit<PreparedCase, 'input'> {
  readonly expected: 'ASK_CORRECTIVE';
  readonly observed: string;
  readonly actionPassed: boolean;
  readonly visualEvidenceIds: readonly string[];
  readonly durationMs: number;
  readonly costUsd: number;
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
});
const rows: ResultRow[] = [];
let spentUsd = 0;

function inferStemPolarity(stem: string): 'SELECT_CORRECT' | 'SELECT_INCORRECT' {
  return /적절하지\s*않|옳지\s*않|잘못된|일치하지\s*않/u.test(stem)
    ? 'SELECT_INCORRECT'
    : 'SELECT_CORRECT';
}

function fileHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function requestTextBytes(input: SourceDirectProblemEvaluatorInput): number {
  return createSourceDirectProblemRequestContent(input)
    .filter((part) => part['type'] === 'input_text')
    .reduce((sum, part) => sum + Buffer.byteLength(String(part['text'])), promptBytes);
}

function maximumCallCost(input: SourceDirectProblemEvaluatorInput): number {
  const maximumInputTokens = requestTextBytes(input) + input.source.media.length * IMAGE_TOKEN_GUARD;
  return (
    maximumInputTokens * PRICE_PER_MILLION.input +
    MAX_OUTPUT_TOKENS * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function usageCost(usage: SourceDirectProblemEvaluatorCallMetadata['usage']): number {
  const cached = usage.cacheReadTokens ?? 0;
  return (
    (usage.inputTokens - cached) * PRICE_PER_MILLION.input +
    cached * PRICE_PER_MILLION.cachedInput +
    usage.outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function observed(output: SourceDirectProblemEvaluatorOutput): string {
  return output.mode === 'DIAGNOSE_PATH' ? output.nextAction.type : `ASSESS:${output.assessment}`;
}

function visualEvidenceIds(output: SourceDirectProblemEvaluatorOutput): string[] {
  return output.sourceEvidence.flatMap((evidence) =>
    evidence.kind === 'VISUAL' ? [evidence.mediaId] : []);
}

function prepare(target: typeof TARGETS[number]): PreparedCase {
  const experiment = SourceExperimentSchema.parse(JSON.parse(readFileSync(
    resolve(SOURCE_ROOT, target.caseId, 'experiment-input.json'),
    'utf8',
  )));
  const fixture = fixtures.cases.find((candidate) => candidate.caseId === target.caseId);
  if (fixture === undefined) throw new Error(`fixture 없음: ${target.caseId}`);
  const response = fixture.responses[target.responseKey];
  if (response === undefined) throw new Error(`응답 없음: ${target.caseId}/${target.responseKey}`);
  const raw = experiment.sourceInput.source;
  if (raw.media.length !== 2 || fixture.mediaFiles.length !== 2) {
    throw new Error(`다중 이미지 2장 대상이 아님: ${target.caseId}`);
  }
  if (raw.media.length !== fixture.mediaFiles.length) {
    throw new Error(`원자료/로컬 미디어 개수 불일치: ${target.caseId}`);
  }
  const media = raw.media.map((sourceMedia, index) => {
    const local = fixture.mediaFiles[index]!;
    const bytes = readFileSync(resolve(process.cwd(), local.path));
    const actualHash = fileHash(bytes);
    if (actualHash !== local.sha256 || `sha256:${actualHash}` !== sourceMedia.contentHash) {
      throw new Error(`미디어 해시 불일치: ${target.caseId}/${sourceMedia.mediaId}`);
    }
    if (local.mimeType !== sourceMedia.mimeType) {
      throw new Error(`미디어 MIME 불일치: ${target.caseId}/${sourceMedia.mediaId}`);
    }
    return {
      mediaId: sourceMedia.mediaId,
      url: `data:${local.mimeType};base64,${bytes.toString('base64')}`,
      mimeType: sourceMedia.mimeType,
      width: sourceMedia.width,
      height: sourceMedia.height,
      contentHash: sourceMedia.contentHash,
      placement: sourceMedia.placement,
    };
  });
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
    scenario: raw.question.supplements
      .map((supplement) => `${supplement.label}\n${supplement.text}`.trim())
      .join('\n\n'),
    media,
    choices: raw.question.choices.map((choice) => ({
      choiceId: `C${choice.choice_number}`,
      position: choice.choice_number,
      text: choice.text,
    })),
    answerChoiceId: `C${raw.answerKey.correctChoice}`,
    officialExplanation: experiment.officialExplanationReference.text,
  });
  const session = submitInitialProblemResponse(createProblemSolvingSession({
    sessionId: `MULTI-IMAGE-CANARY-${target.caseId}`,
    questionId: target.caseId,
    answerChoiceId: bundle.answerChoiceId,
  }), {
    initialChoiceId: response.choiceId,
    rationale: response.rationale,
  });
  if (session.phase !== 'AWAITING_EVALUATION') {
    throw new Error(`오답 진단 입력이 아님: ${target.caseId}`);
  }
  const input = createSourceDirectProblemEvaluatorInput({
    evaluationMode: 'DIAGNOSE_PATH',
    session,
    source: bundle,
  });
  return {
    ...target,
    rationale: response.rationale,
    input,
    mediaAudit: bundle.media.map(({ url: _url, ...item }) => item),
    maximumCostUsd: maximumCallCost(input),
  };
}

async function run(prepared: PreparedCase): Promise<void> {
  const started = Date.now();
  try {
    const result = await evaluator.evaluate(prepared.input);
    const costUsd = usageCost(result.call.usage);
    spentUsd += costUsd;
    const action = observed(result.result);
    const visualIds = visualEvidenceIds(result.result);
    rows.push({
      caseId: prepared.caseId,
      responseKey: prepared.responseKey,
      rationale: prepared.rationale,
      mediaAudit: prepared.mediaAudit,
      maximumCostUsd: prepared.maximumCostUsd,
      expected: 'ASK_CORRECTIVE',
      observed: action,
      actionPassed: action === 'ASK_CORRECTIVE',
      visualEvidenceIds: visualIds,
      durationMs: Date.now() - started,
      costUsd,
      output: result.result,
      rawOutput: result.rawOutput,
      call: result.call,
    });
    process.stdout.write(
      `${prepared.caseId}: ${action} visual=[${visualIds.join(',')}] cost=$${costUsd.toFixed(4)}\n`,
    );
  } catch (error) {
    const failure = error instanceof SourceDirectProblemEvaluatorError ? error : null;
    const costUsd = failure === null ? 0 : usageCost(failure.call.usage);
    spentUsd += costUsd;
    rows.push({
      caseId: prepared.caseId,
      responseKey: prepared.responseKey,
      rationale: prepared.rationale,
      mediaAudit: prepared.mediaAudit,
      maximumCostUsd: prepared.maximumCostUsd,
      expected: 'ASK_CORRECTIVE',
      observed: 'ERROR',
      actionPassed: false,
      visualEvidenceIds: [],
      durationMs: Date.now() - started,
      costUsd,
      ...(failure === null ? {} : { call: failure.call, rawOutput: failure.rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    });
    process.stdout.write(`${prepared.caseId}: ERROR cost=$${costUsd.toFixed(4)}\n`);
  }
}

function writeArtifacts(): void {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const actionPassed = rows.filter((row) => row.actionPassed).length;
  const visualGrounded = rows.filter((row) => row.visualEvidenceIds.length > 0).length;
  const summary = {
    artifactType: 'problem-source-direct-multi-image-canary-summary-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    hardCapUsd: COST_CAP_USD,
    calls: rows.length,
    actionPassed,
    visualGrounded,
    observedCostUsd: Number(spentUsd.toFixed(6)),
    inputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.inputTokens ?? 0), 0),
    cachedInputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.cacheReadTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.outputTokens ?? 0), 0),
    averageDurationMs: rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length),
    recommendation: rows.length > 0 && actionPassed === rows.length && visualGrounded === rows.length
      ? 'MULTI_IMAGE_CANARY_PASS'
      : 'REVIEW_REQUIRED',
  };
  writeFileSync(resolve(OUTPUT_ROOT, 'results.json'), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const table = rows.map((row) =>
    `| ${row.caseId} | ${row.observed} | ${row.actionPassed ? 'PASS' : 'FAIL'} | ` +
    `${row.visualEvidenceIds.join(', ') || '없음'} | ${row.mediaAudit.length} | ` +
    `$${row.costUsd.toFixed(4)} |`,
  ).join('\n');
  writeFileSync(resolve(OUTPUT_ROOT, 'REPORT.md'),
    `# 원문 직접 다중 이미지 canary\n\n` +
    `- 호출: ${summary.calls}회\n` +
    `- 행동 일치: ${summary.actionPassed}/${summary.calls}\n` +
    `- 시각 근거 사용: ${summary.visualGrounded}/${summary.calls}\n` +
    `- 비용: $${summary.observedCostUsd.toFixed(4)} / 하드캡 $${COST_CAP_USD.toFixed(2)}\n` +
    `- 평균 지연: ${(summary.averageDurationMs / 1_000).toFixed(2)}초\n` +
    `- 권고: \`${summary.recommendation}\`\n\n` +
    `| 문항 | 관측 행동 | 행동 | 시각 근거 | 이미지 수 | 비용 |\n` +
    `|---|---|---|---|---:|---:|\n${table}\n`,
  );
}

try {
  const selectedTargets = TARGET_CASE_FILTER === undefined
    ? TARGETS
    : TARGETS.filter((target) => target.caseId === TARGET_CASE_FILTER);
  if (selectedTargets.length === 0) throw new Error(`등록되지 않은 대상 문항: ${TARGET_CASE_FILTER}`);
  const prepared = selectedTargets.map(prepare);
  const maximumRunCost = prepared.reduce((sum, item) => sum + item.maximumCostUsd, 0);
  if (maximumRunCost > COST_CAP_USD) {
    throw new Error(
      `비용 하드캡 전 중단: 최대 $${maximumRunCost.toFixed(4)} > $${COST_CAP_USD.toFixed(2)}`,
    );
  }
  for (const item of prepared) {
    if (spentUsd + item.maximumCostUsd > COST_CAP_USD) {
      throw new Error(`비용 하드캡 전 중단: ${item.caseId}`);
    }
    await run(item);
  }
  writeArtifacts();
} catch (error) {
  writeArtifacts();
  throw error;
}
