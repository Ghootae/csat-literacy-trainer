import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import { z } from 'zod/v4';

import {
  OpenAISourceDirectProblemEvaluator,
  SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION,
  SourceDirectProblemBundleSchema,
  SourceDirectProblemEvaluatorError,
  adaptSourceDirectDiagnosticOutput,
  applyCorrectRationaleAssessment,
  applySourceDirectProblemEvaluatorTurn,
  createProblemSolvingSession,
  createSourceDirectProblemEvaluatorInput,
  submitInitialProblemResponse,
  submitProblemActionResponse,
  type ProblemSolvingSession,
  type SourceDirectDiagnosticOutput,
  type SourceDirectProblemBundle,
  type SourceDirectProblemEvaluatorCallMetadata,
  type SourceDirectProblemEvaluatorInput,
  type SourceDirectProblemEvaluatorOutput,
  type SourceDirectProblemPromptVersion,
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const COST_CAP_USD = Number(process.env['SOURCE_DIRECT_CYCLE_COST_CAP_USD'] ?? '3');
const MAX_OUTPUT_TOKENS = 2_400;
const IMAGE_TOKEN_GUARD = 20_000;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const requestedPromptVersion = process.env['SOURCE_DIRECT_CYCLE_PROMPT_VERSION']?.trim() ??
  SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION;
if (requestedPromptVersion !== SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION &&
    requestedPromptVersion !== SOURCE_DIRECT_PROBLEM_PROMPT_VERSION) {
  throw new Error(`지원하지 않는 원문 직접 프롬프트 버전: ${requestedPromptVersion}`);
}
const PROMPT_VERSION: SourceDirectProblemPromptVersion = requestedPromptVersion;
const POLICY_ID = 'PS-PROBLEM-SOURCE-DIRECT-V1';
const FIXTURE_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/problem-solving/source-direct-v2-full-cycle-seven-fixtures-v1.json',
);
const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/problem-solving',
  PROMPT_VERSION === SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION
    ? 'source-direct-problem-dialogue-prompt-v3.md'
    : 'source-direct-problem-dialogue-prompt-v2.md',
);
const SOURCE_ROOT = resolve(
  process.cwd(),
  'docs/experiments/problem-gold-prospective-blind-2026-09-03/gold-production/artifacts',
);
const OUTPUT_BASE = resolve(
  process.cwd(),
  PROMPT_VERSION === SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION
    ? 'docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11'
    : 'docs/experiments/problem-source-direct-v2-full-cycle-seven-2026-09-11',
);
const RUN_LABEL = process.env['SOURCE_DIRECT_CYCLE_RUN_LABEL']?.trim() ||
  process.env['V2_CYCLE_RUN_LABEL']?.trim() || '';
const OUTPUT_ROOT = RUN_LABEL === '' ? OUTPUT_BASE : resolve(OUTPUT_BASE, RUN_LABEL);
const DRY_RUN = (process.env['SOURCE_DIRECT_CYCLE_DRY_RUN'] ??
  process.env['V2_CYCLE_DRY_RUN']) === '1';
const PRIOR_COST_USD = Number(process.env['SOURCE_DIRECT_CYCLE_PRIOR_COST_USD'] ??
  process.env['V2_CYCLE_PRIOR_COST_USD'] ?? '0');
const TARGET_KEYS = new Set((process.env['SOURCE_DIRECT_CYCLE_TARGETS'] ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0));
const V3_SYNTHETIC_KEYS = new Set([
  '69c006f178128b2a9bedd2f3-q10/simple-agreement',
  '69c006f178128b2a9bedd2f3-q10/partial-correction',
  '69c006f178128b2a9bedd2f3-q10/same-proposition-correct',
  '69c006f178128b2a9bedd2f3-q10/same-proposition-wrong',
]);
if (!Number.isFinite(COST_CAP_USD) || COST_CAP_USD <= 0) {
  throw new Error('SOURCE_DIRECT_CYCLE_COST_CAP_USD는 양수여야 한다.');
}
if (!Number.isFinite(PRIOR_COST_USD) || PRIOR_COST_USD < 0 || PRIOR_COST_USD >= COST_CAP_USD) {
  throw new Error('SOURCE_DIRECT_CYCLE_PRIOR_COST_USD가 하드캡 범위 밖이다.');
}

const ErrorCorrectionSchema = z.object({
  initial: z.string().min(1),
  correction: z.string().min(1),
}).strict();

const WrongCorrectionSchema = ErrorCorrectionSchema.extend({
  choiceId: z.string().regex(/^C[1-5]$/u),
}).strict();

const WrongAmbiguousSchema = z.object({
  choiceId: z.string().regex(/^C[1-5]$/u),
  initial: z.string().min(1),
  diagnosticReveal: z.string().min(1),
  correction: z.string().min(1),
}).strict();

const FixtureCaseSchema = z.object({
  questionId: z.string().min(1),
  correctSupported: z.string().min(1),
  correctInsufficient: z.string().min(1),
  correctExplicitError: ErrorCorrectionSchema,
  wrongExplicitError: WrongCorrectionSchema,
  wrongAmbiguous: WrongAmbiguousSchema,
  choiceRationaleConflict: WrongCorrectionSchema,
}).strict();

const FixtureSchema = z.object({
  fixtureVersion: z.literal('source-direct-v2-full-cycle-seven-fixtures-v1'),
  createdAt: z.string().min(1),
  policyId: z.literal(POLICY_ID),
  promptVersion: z.literal(SOURCE_DIRECT_PROBLEM_V2_PROMPT_VERSION),
  excludedPreviouslyTestedQuestionIds: z.array(z.string().min(1)).length(4),
  cases: z.array(FixtureCaseSchema).length(7),
}).strict();

const MediaPlacementSchema = z.discriminatedUnion('scope', [
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

const SourceInputSchema = z.object({
  sample: z.object({
    caseId: z.string().min(1),
    productId: z.string().min(1),
    enrichmentFile: z.string().min(1),
    sourceHash: z.string().min(1),
  }).passthrough(),
  source: z.object({
    sourceId: z.string().min(1),
    exam: z.string().min(1),
    title: z.string().min(1),
    passage: z.string().min(1),
    questionNumber: z.number().int().positive(),
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
    answerKey: z.object({
      correctChoice: z.number().int().positive(),
      correctChoiceText: z.string().min(1),
    }).strict(),
    media: z.array(z.object({
      mediaId: z.string().min(1),
      sourceUrl: z.string().url(),
      mimeType: z.string().regex(/^image\//u),
      contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      placement: MediaPlacementSchema,
    }).strict()),
  }).passthrough(),
}).passthrough();

const OfficialExplanationSchema = z.object({
  available: z.literal(true),
  source_pdf_page: z.number().int().positive(),
  source_pdf_pages: z.array(z.number().int().positive()).min(1),
  section_title: z.string().min(1),
  content_type: z.literal('independent_paraphrase'),
  detailed_explanation_ko: z.string().min(1),
  choice_explanations: z.array(z.object({
    choice_number: z.number().int().positive(),
    selected_as_answer: z.boolean(),
    explanation_ko: z.string().min(1),
  }).strict()).min(2),
}).strict();

const EnrichmentSchema = z.object({
  source: z.object({
    publisher: z.string().min(1),
    service: z.string().min(1),
    document_type: z.string().min(1),
    url: z.string().url(),
    officiality: z.string().min(1),
    officiality_note: z.string().min(1),
  }).passthrough(),
  questions: z.array(z.object({
    question_number: z.number().int().positive(),
    official_explanation: OfficialExplanationSchema,
  }).passthrough()),
}).passthrough();

type FixtureCase = z.infer<typeof FixtureCaseSchema>;

interface PreparedSource {
  readonly bundle: SourceDirectProblemBundle;
  readonly sourceInputPath: string;
  readonly sourceInputHash: string;
  readonly enrichmentPath: string;
  readonly enrichmentHash: string;
  readonly officialExplanationSource: {
    readonly url: string;
    readonly pages: readonly number[];
    readonly sectionTitle: string;
    readonly contentType: 'independent_paraphrase';
    readonly officiality: string;
    readonly officialityNote: string;
  };
  readonly mediaTransport: readonly {
    readonly mediaId: string;
    readonly localPath: string;
    readonly sourceUrl: string;
    readonly contentHash: string;
    readonly hashVerified: true;
  }[];
}

interface ResultRow {
  readonly caseId: string;
  readonly questionId: string;
  readonly responseType: string;
  readonly stage: string;
  readonly expected: readonly string[];
  readonly observed: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly costUsd: number;
  readonly inputWithoutMediaBytes: unknown;
  readonly provenance: Omit<PreparedSource, 'bundle'>;
  readonly output?: SourceDirectProblemEvaluatorOutput;
  readonly rawOutput?: unknown;
  readonly call?: SourceDirectProblemEvaluatorCallMetadata;
  readonly error?: string;
}

const fixture = FixtureSchema.parse(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')));
const fixtureHash = fileHash(readFileSync(FIXTURE_PATH));
const promptBytes = Buffer.byteLength(readFileSync(PROMPT_PATH, 'utf8'));
const promptHash = fileHash(readFileSync(PROMPT_PATH));
const evaluator = new OpenAISourceDirectProblemEvaluator({
  model: MODEL,
  effort: EFFORT,
  maxRetries: 0,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  timeoutMs: 90_000,
  promptVersion: PROMPT_VERSION,
});
const rows: ResultRow[] = [];
let runSpentUsd = 0;
let runStatus: 'PREPARED' | 'RUNNING' | 'COMPLETED' | 'ABORTED' = 'PREPARED';

function fileHash(value: string | Uint8Array): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function inferStemPolarity(stem: string): 'SELECT_CORRECT' | 'SELECT_INCORRECT' {
  return /적절하지\s*않|옳지\s*않|잘못된|일치하지\s*않/u.test(stem)
    ? 'SELECT_INCORRECT'
    : 'SELECT_CORRECT';
}

function buildOfficialExplanation(
  source: z.infer<typeof EnrichmentSchema>['source'],
  explanation: z.infer<typeof OfficialExplanationSchema>,
): string {
  const choiceText = explanation.choice_explanations
    .map((choice) => `${choice.choice_number}번: ${choice.explanation_ko}`)
    .join('\n');
  return [
    `출처 성격: ${source.officiality}`,
    `주의: ${source.officiality_note}`,
    `해설 형식: ${explanation.content_type}`,
    `해설: ${explanation.detailed_explanation_ko}`,
    `선지별 분석:\n${choiceText}`,
  ].join('\n');
}

function prepareSource(questionId: string): PreparedSource {
  const artifactId = `prospective-${questionId}`;
  const artifactRoot = resolve(SOURCE_ROOT, artifactId);
  const sourceInputPath = resolve(artifactRoot, 'source-input.json');
  const sourceInputBytes = readFileSync(sourceInputPath);
  const input = SourceInputSchema.parse(JSON.parse(sourceInputBytes.toString('utf8')));
  const expectedCaseId = `prospective-${questionId}`;
  if (input.sample.caseId !== expectedCaseId) {
    throw new Error(`source-input caseId 불일치: ${questionId}`);
  }
  const enrichmentPath = resolve(input.sample.enrichmentFile);
  const enrichmentBytes = readFileSync(enrichmentPath);
  const enrichment = EnrichmentSchema.parse(JSON.parse(enrichmentBytes.toString('utf8')));
  const explanation = enrichment.questions.find(
    (candidate) => candidate.question_number === input.source.questionNumber,
  )?.official_explanation;
  if (explanation === undefined) throw new Error(`공식 해설 참조 없음: ${questionId}`);
  const selectedAnswers = explanation.choice_explanations
    .filter((choice) => choice.selected_as_answer)
    .map((choice) => choice.choice_number);
  if (selectedAnswers.length !== 1 || selectedAnswers[0] !== input.source.answerKey.correctChoice) {
    throw new Error(`정답과 해설의 선택 불일치: ${questionId}`);
  }

  const mediaTransport = input.source.media.map((media) => {
    const matches = readdirSync(resolve(artifactRoot, 'input-media'))
      .filter((name) => name.startsWith(`${media.mediaId}.`));
    if (matches.length !== 1) throw new Error(`미디어 파일 식별 실패: ${questionId}/${media.mediaId}`);
    const localPath = resolve(artifactRoot, 'input-media', matches[0]!);
    const bytes = readFileSync(localPath);
    if (fileHash(bytes) !== media.contentHash) {
      throw new Error(`미디어 해시 불일치: ${questionId}/${media.mediaId}`);
    }
    const extension = extname(localPath).toLowerCase();
    if ((media.mimeType === 'image/png' && extension !== '.png') ||
        (media.mimeType === 'image/jpeg' && !['.jpg', '.jpeg'].includes(extension))) {
      throw new Error(`미디어 확장자 불일치: ${questionId}/${media.mediaId}`);
    }
    return {
      mediaId: media.mediaId,
      localPath,
      sourceUrl: media.sourceUrl,
      contentHash: media.contentHash,
      hashVerified: true as const,
      dataUrl: `data:${media.mimeType};base64,${bytes.toString('base64')}`,
    };
  });

  const bundle = SourceDirectProblemBundleSchema.parse({
    schemaVersion: 'source-direct-problem-bundle-v2',
    questionId,
    questionNumber: input.source.questionNumber,
    passageId: input.source.sourceId,
    title: input.source.title,
    exam: input.source.exam,
    passage: input.source.passage,
    stem: input.source.question.stem,
    stemPolarity: inferStemPolarity(input.source.question.stem),
    scenario: input.source.question.supplements
      .map((supplement) => `${supplement.label}\n${supplement.text}`.trim())
      .join('\n\n'),
    media: input.source.media.map((media) => ({
      mediaId: media.mediaId,
      url: mediaTransport.find((item) => item.mediaId === media.mediaId)!.dataUrl,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      contentHash: media.contentHash,
      placement: media.placement,
    })),
    choices: input.source.question.choices.map((choice) => ({
      choiceId: `C${choice.choice_number}`,
      position: choice.choice_number,
      text: choice.text,
    })),
    answerChoiceId: `C${input.source.answerKey.correctChoice}`,
    officialExplanation: buildOfficialExplanation(enrichment.source, explanation),
  });

  return {
    bundle,
    sourceInputPath,
    sourceInputHash: fileHash(sourceInputBytes),
    enrichmentPath,
    enrichmentHash: fileHash(enrichmentBytes),
    officialExplanationSource: {
      url: enrichment.source.url,
      pages: explanation.source_pdf_pages,
      sectionTitle: explanation.section_title,
      contentType: explanation.content_type,
      officiality: enrichment.source.officiality,
      officialityNote: enrichment.source.officiality_note,
    },
    mediaTransport: mediaTransport.map(({ dataUrl: _dataUrl, ...item }) => item),
  };
}

const preparedSources = new Map(
  fixture.cases.map((item) => [item.questionId, prepareSource(item.questionId)]),
);

for (const fixtureCase of fixture.cases) {
  const answerChoiceId = preparedSources.get(fixtureCase.questionId)!.bundle.answerChoiceId;
  const wrongChoices = [
    fixtureCase.wrongExplicitError.choiceId,
    fixtureCase.wrongAmbiguous.choiceId,
    fixtureCase.choiceRationaleConflict.choiceId,
  ];
  if (wrongChoices.some((choiceId) => choiceId === answerChoiceId)) {
    throw new Error(`오답 fixture가 정답을 선택함: ${fixtureCase.questionId}`);
  }
}

function fresh(bundle: SourceDirectProblemBundle, caseId: string): ProblemSolvingSession {
  return createProblemSolvingSession({
    sessionId: `${PROMPT_VERSION}-${bundle.questionId}-${caseId}`,
    questionId: bundle.questionId,
    answerChoiceId: bundle.answerChoiceId,
  });
}

function evaluatorInput(
  session: ProblemSolvingSession,
  bundle: SourceDirectProblemBundle,
  previousDiagnosticState: SourceDirectDiagnosticOutput | null = null,
): SourceDirectProblemEvaluatorInput {
  return createSourceDirectProblemEvaluatorInput({
    evaluationMode: session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT'
      ? 'ASSESS_SELECTION_RATIONALE'
      : 'DIAGNOSE_PATH',
    session,
    source: bundle,
    previousDiagnosticState,
    promptVersion: PROMPT_VERSION,
  });
}

function usageCost(usage: SourceDirectProblemEvaluatorCallMetadata['usage']): number {
  const cached = usage.cacheReadTokens ?? 0;
  return (
    (usage.inputTokens - cached) * PRICE_PER_MILLION.input +
    cached * PRICE_PER_MILLION.cachedInput +
    usage.outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function conservativeNextCallCost(input: SourceDirectProblemEvaluatorInput): number {
  const withoutMediaBytes = sanitizeInput(input);
  const textTokenUpperBound = promptBytes + Buffer.byteLength(JSON.stringify(withoutMediaBytes));
  const imageTokenGuard = input.source.media.length * IMAGE_TOKEN_GUARD;
  return (
    (textTokenUpperBound + imageTokenGuard) * PRICE_PER_MILLION.input +
    MAX_OUTPUT_TOKENS * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function sanitizeInput(input: SourceDirectProblemEvaluatorInput): unknown {
  const prepared = preparedSources.get(input.source.questionId);
  if (prepared === undefined) throw new Error(`prepared source 없음: ${input.source.questionId}`);
  return {
    ...input,
    source: {
      ...input.source,
      media: input.source.media.map((media) => ({
        ...media,
        url: prepared.mediaTransport.find((item) => item.mediaId === media.mediaId)?.sourceUrl,
        transport: 'data-url-bytes-omitted-from-artifact',
      })),
    },
  };
}

function observed(output: SourceDirectProblemEvaluatorOutput): string {
  return output.mode === 'ASSESS_SELECTION_RATIONALE'
    ? `ASSESS:${output.assessment}`
    : output.nextAction.type;
}

function writeArtifacts(): void {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const passed = rows.filter((row) => row.passed).length;
  const plan = selectedPlan();
  const plannedCalls = plan.reduce((sum, item) => sum + item.calls, 0);
  const targetQuestionCount = new Set(plan.map((item) => item.questionId)).size;
  const summary = {
    artifactType: 'problem-source-direct-full-cycle-summary-v2',
    executedAt: new Date().toISOString(),
    runStatus,
    policyId: POLICY_ID,
    model: MODEL,
    effort: EFFORT,
    promptVersion: PROMPT_VERSION,
    promptHash,
    fixtureVersion: fixture.fixtureVersion,
    fixtureHash,
    hardCapUsd: COST_CAP_USD,
    maxOutputTokensPerCall: MAX_OUTPUT_TOKENS,
    targetQuestionCount,
    plannedCases: plan.length,
    plannedCalls,
    calls: rows.length,
    passed,
    failed: rows.length - passed,
    priorObservedCostUsd: PRIOR_COST_USD,
    observedCostUsd: Number(runSpentUsd.toFixed(6)),
    cumulativeObservedCostUsd: Number((PRIOR_COST_USD + runSpentUsd).toFixed(6)),
    inputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.inputTokens ?? 0), 0),
    cachedInputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.cacheReadTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.outputTokens ?? 0), 0),
    recommendation: runStatus === 'COMPLETED' && rows.length === plannedCalls &&
      passed === rows.length
      ? 'SELECTED_CYCLE_PASS'
      : 'HOLD_AND_REVIEW',
  };
  writeFileSync(resolve(OUTPUT_ROOT, 'results.json'), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const details = rows.map((row) =>
    `| ${row.questionId} | ${row.responseType} | ${row.stage} | ${row.expected.join(' / ')} | ` +
    `${row.observed} | ${row.passed ? 'PASS' : 'FAIL'} | $${row.costUsd.toFixed(4)} |`,
  ).join('\n');
  writeFileSync(resolve(OUTPUT_ROOT, 'REPORT.md'),
    `# 원문 직접 선택 사이클\n\n` +
    `- 상태: \`${summary.runStatus}\`\n` +
    `- 정책: \`${POLICY_ID}\`\n` +
    `- 모델: \`${MODEL}\` / effort \`${EFFORT}\`\n` +
    `- 프롬프트: \`${PROMPT_VERSION}\` / \`${promptHash}\`\n` +
    `- fixture: \`${fixture.fixtureVersion}\` / \`${fixtureHash}\`\n` +
    `- 대상: ${summary.targetQuestionCount}문항, 문항당 6사례, 계획 ${summary.plannedCalls}호출\n` +
    `- 실행: ${summary.calls}호출, 기대 행동 일치 ${summary.passed}/${summary.calls}\n` +
    `- 비용: $${summary.cumulativeObservedCostUsd.toFixed(4)} / 하드캡 $${COST_CAP_USD.toFixed(2)}\n` +
    `- 권고: \`${summary.recommendation}\`\n\n` +
    `| 문항 | 응답 유형 | 단계 | 기대 | 관측 | 결과 | 비용 |\n` +
    `|---|---|---|---|---|---|---:|\n${details}\n`,
  );
}

async function call(options: {
  readonly caseId: string;
  readonly responseType: string;
  readonly stage: string;
  readonly input: SourceDirectProblemEvaluatorInput;
  readonly expected: readonly string[];
}): Promise<SourceDirectProblemEvaluatorOutput | null> {
  const maximumNext = conservativeNextCallCost(options.input);
  if (PRIOR_COST_USD + runSpentUsd + maximumNext > COST_CAP_USD) {
    throw new Error(
      `비용 하드캡 전 중단: 이전 $${PRIOR_COST_USD.toFixed(4)} + 이번 ` +
      `$${runSpentUsd.toFixed(4)} + 다음 호출 최대 ` +
      `$${maximumNext.toFixed(4)} > $${COST_CAP_USD.toFixed(2)}`,
    );
  }
  const source = preparedSources.get(options.input.source.questionId);
  if (source === undefined) throw new Error(`prepared source 없음: ${options.input.source.questionId}`);
  const { bundle: _bundle, ...provenance } = source;
  const started = Date.now();
  try {
    const result = await evaluator.evaluate(options.input);
    const costUsd = usageCost(result.call.usage);
    runSpentUsd += costUsd;
    const action = observed(result.result);
    rows.push({
      ...options,
      questionId: options.input.source.questionId,
      observed: action,
      passed: options.expected.includes(action),
      durationMs: Date.now() - started,
      costUsd,
      inputWithoutMediaBytes: sanitizeInput(options.input),
      provenance,
      output: result.result,
      rawOutput: result.rawOutput,
      call: result.call,
    });
    writeArtifacts();
    process.stdout.write(
      `${options.input.source.questionId}/${options.caseId}/${options.stage}: ${action} ` +
      `${options.expected.includes(action) ? 'PASS' : 'FAIL'} cost=$${costUsd.toFixed(4)}\n`,
    );
    return result.result;
  } catch (error) {
    const failed = error instanceof SourceDirectProblemEvaluatorError ? error : null;
    const costUsd = failed === null ? 0 : usageCost(failed.call.usage);
    runSpentUsd += costUsd;
    rows.push({
      ...options,
      questionId: options.input.source.questionId,
      observed: 'ERROR',
      passed: false,
      durationMs: Date.now() - started,
      costUsd,
      inputWithoutMediaBytes: sanitizeInput(options.input),
      provenance,
      ...(failed === null ? {} : { call: failed.call, rawOutput: failed.rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    });
    writeArtifacts();
    process.stdout.write(
      `${options.input.source.questionId}/${options.caseId}/${options.stage}: ERROR ` +
      `cost=$${costUsd.toFixed(4)} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return null;
  }
}

function applyDiagnostic(
  session: ProblemSolvingSession,
  input: SourceDirectProblemEvaluatorInput,
  output: SourceDirectProblemEvaluatorOutput,
): ProblemSolvingSession | null {
  if (output.mode !== 'DIAGNOSE_PATH') return null;
  return applySourceDirectProblemEvaluatorTurn(session, adaptSourceDirectDiagnosticOutput({
    evaluatorInput: input,
    rawOutput: output,
    output,
  }));
}

async function correctSingle(
  fixtureCase: FixtureCase,
  caseId: 'correct-supported' | 'correct-insufficient',
  rationale: string,
  expected: 'ASSESS:SUPPORTED' | 'ASSESS:UNCERTAIN',
): Promise<void> {
  const source = preparedSources.get(fixtureCase.questionId)!;
  const session = submitInitialProblemResponse(fresh(source.bundle, caseId), {
    initialChoiceId: source.bundle.answerChoiceId,
    rationale,
  });
  await call({
    caseId,
    responseType: caseId === 'correct-supported' ? '정답·충분한 근거' : '정답·불충분한 근거',
    stage: 'initial-assessment',
    input: evaluatorInput(session, source.bundle),
    expected: [expected],
  });
}

async function correctExplicitError(fixtureCase: FixtureCase): Promise<void> {
  const caseId = 'correct-explicit-error';
  const responseType = '정답·명시적 오류';
  const source = preparedSources.get(fixtureCase.questionId)!;
  let session = submitInitialProblemResponse(fresh(source.bundle, caseId), {
    initialChoiceId: source.bundle.answerChoiceId,
    rationale: fixtureCase.correctExplicitError.initial,
  });
  const firstInput = evaluatorInput(session, source.bundle);
  const first = await call({
    caseId, responseType, stage: 'initial-assessment', input: firstInput,
    expected: ['ASSESS:CLEAR_ERROR'],
  });
  if (first?.mode !== 'ASSESS_SELECTION_RATIONALE' || first.assessment !== 'CLEAR_ERROR') return;
  session = applyCorrectRationaleAssessment(session, first.assessment);
  const correctionInput = evaluatorInput(session, source.bundle);
  const correction = await call({
    caseId, responseType, stage: 'corrective-question', input: correctionInput,
    expected: ['ASK_CORRECTIVE'],
  });
  if (correction === null) return;
  const asking = applyDiagnostic(session, correctionInput, correction);
  if (asking?.phase !== 'AWAITING_STUDENT_RESPONSE') return;
  session = submitProblemActionResponse(asking, fixtureCase.correctExplicitError.correction);
  const repairedInput = evaluatorInput(
    session,
    source.bundle,
    correction.mode === 'DIAGNOSE_PATH' ? correction : null,
  );
  await call({
    caseId, responseType, stage: 'repair-assessment', input: repairedInput,
    expected: ['COMPLETE'],
  });
}

async function wrongFlow(options: {
  readonly fixtureCase: FixtureCase;
  readonly caseId: string;
  readonly responseType: string;
  readonly choiceId: string;
  readonly initial: string;
  readonly expectedInitial: string;
  readonly followups: readonly { readonly response: string; readonly expected: string }[];
}): Promise<void> {
  const source = preparedSources.get(options.fixtureCase.questionId)!;
  let session = submitInitialProblemResponse(fresh(source.bundle, options.caseId), {
    initialChoiceId: options.choiceId,
    rationale: options.initial,
  });
  let previous: SourceDirectDiagnosticOutput | null = null;
  let input = evaluatorInput(session, source.bundle);
  let output = await call({
    caseId: options.caseId,
    responseType: options.responseType,
    stage: 'initial-diagnosis',
    input,
    expected: [options.expectedInitial],
  });
  for (let index = 0; index < options.followups.length; index += 1) {
    if (output === null) return;
    const applied = applyDiagnostic(session, input, output);
    if (applied?.phase !== 'AWAITING_STUDENT_RESPONSE') return;
    session = submitProblemActionResponse(applied, options.followups[index]!.response);
    if (output.mode === 'DIAGNOSE_PATH') previous = output;
    input = evaluatorInput(session, source.bundle, previous);
    output = await call({
      caseId: options.caseId,
      responseType: options.responseType,
      stage: `followup-${index + 1}`,
      input,
      expected: [options.followups[index]!.expected],
    });
  }
}

async function runQuestion(fixtureCase: FixtureCase): Promise<void> {
  if (isSelected(fixtureCase.questionId, 'correct-supported')) {
    await correctSingle(
      fixtureCase,
      'correct-supported',
      fixtureCase.correctSupported,
      'ASSESS:SUPPORTED',
    );
  }
  if (isSelected(fixtureCase.questionId, 'correct-insufficient')) {
    await correctSingle(
      fixtureCase,
      'correct-insufficient',
      fixtureCase.correctInsufficient,
      'ASSESS:UNCERTAIN',
    );
  }
  if (isSelected(fixtureCase.questionId, 'correct-explicit-error')) {
    await correctExplicitError(fixtureCase);
  }
  if (isSelected(fixtureCase.questionId, 'wrong-explicit-error')) await wrongFlow({
    fixtureCase,
    caseId: 'wrong-explicit-error',
    responseType: '오답·명시적 오류',
    choiceId: fixtureCase.wrongExplicitError.choiceId,
    initial: fixtureCase.wrongExplicitError.initial,
    expectedInitial: 'ASK_CORRECTIVE',
    followups: [{
      response: fixtureCase.wrongExplicitError.correction,
      expected: 'REQUEST_RESELECTION',
    }],
  });
  if (isSelected(fixtureCase.questionId, 'wrong-ambiguous')) await wrongFlow({
    fixtureCase,
    caseId: 'wrong-ambiguous',
    responseType: '오답·모호한 근거',
    choiceId: fixtureCase.wrongAmbiguous.choiceId,
    initial: fixtureCase.wrongAmbiguous.initial,
    expectedInitial: 'ASK_DIAGNOSTIC',
    followups: [
      {
        response: fixtureCase.wrongAmbiguous.diagnosticReveal,
        expected: 'ASK_CORRECTIVE',
      },
      {
        response: fixtureCase.wrongAmbiguous.correction,
        expected: 'REQUEST_RESELECTION',
      },
    ],
  });
  if (isSelected(fixtureCase.questionId, 'choice-rationale-conflict')) await wrongFlow({
    fixtureCase,
    caseId: 'choice-rationale-conflict',
    responseType: '오답·정확한 근거와 선택 충돌',
    choiceId: fixtureCase.choiceRationaleConflict.choiceId,
    initial: fixtureCase.choiceRationaleConflict.initial,
    expectedInitial: 'ASK_CORRECTIVE',
    followups: [{
      response: fixtureCase.choiceRationaleConflict.correction,
      expected: 'REQUEST_RESELECTION',
    }],
  });
  if (fixtureCase.questionId === '69c006f178128b2a9bedd2f3-q10') {
    if (isSyntheticSelected(fixtureCase.questionId, 'simple-agreement')) {
      await correctRationaleCompletenessProbe({
        fixtureCase,
        caseId: 'simple-agreement',
        responseType: '정답·명시적 오류 후 단순 동의',
        initial: fixtureCase.correctExplicitError.initial,
        followup: () => '네, 알겠습니다.',
      });
    }
    if (isSyntheticSelected(fixtureCase.questionId, 'partial-correction')) {
      await correctRationaleCompletenessProbe({
        fixtureCase,
        caseId: 'partial-correction',
        responseType: '정답·복수 오류 후 일부만 수정',
        initial: 'B 기법의 최종 선택 직선은 이상치를 지나고, A 기법은 이상치의 개수가 문턱값보다 적으면 후보 직선을 버리기 때문에 ⑤가 맞습니다.',
        followup: (question) => /B\s*기법|최종\s*선택|후보\s*직선/u.test(question)
          ? 'B에 대해서는 후보 직선과 최종 선택 직선을 혼동했습니다. B에서는 후보 직선이 이상치를 지날 수 있습니다. 다만 A는 이상치 수가 문턱값보다 적으면 후보 직선을 버린다고 생각합니다.'
          : 'A에 대해서는 문턱값이 정상치 집합의 점 개수에 적용된다는 점으로 고치겠습니다. 다만 B의 최종 선택 직선은 이상치를 지난다고 생각합니다.',
      });
    }
    if (isSyntheticSelected(fixtureCase.questionId, 'same-proposition-correct')) {
      await samePropositionProbe(fixtureCase, true);
    }
    if (isSyntheticSelected(fixtureCase.questionId, 'same-proposition-wrong')) {
      await samePropositionProbe(fixtureCase, false);
    }
  }
}

async function correctRationaleCompletenessProbe(options: {
  readonly fixtureCase: FixtureCase;
  readonly caseId: string;
  readonly responseType: string;
  readonly initial: string;
  readonly followup: (question: string) => string;
}): Promise<void> {
  const source = preparedSources.get(options.fixtureCase.questionId)!;
  let session = submitInitialProblemResponse(fresh(source.bundle, options.caseId), {
    initialChoiceId: source.bundle.answerChoiceId,
    rationale: options.initial,
  });
  const firstInput = evaluatorInput(session, source.bundle);
  const first = await call({
    caseId: options.caseId,
    responseType: options.responseType,
    stage: 'initial-assessment',
    input: firstInput,
    expected: ['ASSESS:CLEAR_ERROR'],
  });
  if (first?.mode !== 'ASSESS_SELECTION_RATIONALE' || first.assessment !== 'CLEAR_ERROR') return;
  session = applyCorrectRationaleAssessment(session, first.assessment);
  const questionInput = evaluatorInput(session, source.bundle);
  const question = await call({
    caseId: options.caseId,
    responseType: options.responseType,
    stage: 'corrective-question',
    input: questionInput,
    expected: ['ASK_CORRECTIVE'],
  });
  if (question?.mode !== 'DIAGNOSE_PATH' || question.nextAction.type !== 'ASK_CORRECTIVE') return;
  const asking = applyDiagnostic(session, questionInput, question);
  if (asking?.phase !== 'AWAITING_STUDENT_RESPONSE') return;
  session = submitProblemActionResponse(asking, options.followup(question.nextAction.question));
  await call({
    caseId: options.caseId,
    responseType: options.responseType,
    stage: 'followup-assessment',
    input: evaluatorInput(session, source.bundle, question),
    expected: ['DIRECT_COACHING'],
  });
}

async function samePropositionProbe(fixtureCase: FixtureCase, correctSelection: boolean): Promise<void> {
  const source = preparedSources.get(fixtureCase.questionId)!;
  const caseId = correctSelection ? 'same-proposition-correct' : 'same-proposition-wrong';
  const choiceId = correctSelection ? source.bundle.answerChoiceId : 'C3';
  const rationale = `B 기법의 최종 선택 직선은 이상치를 직접 지난다고 판단했고, 그래서 ${choiceId.replace('C', '')}번을 골랐습니다.`;
  const session = submitInitialProblemResponse(fresh(source.bundle, caseId), {
    initialChoiceId: choiceId,
    rationale,
  });
  await call({
    caseId,
    responseType: correctSelection ? '동일 거짓 명제·정답 선택' : '동일 거짓 명제·오답 선택',
    stage: 'initial-contrast',
    input: evaluatorInput(session, source.bundle),
    expected: [correctSelection ? 'ASSESS:CLEAR_ERROR' : 'ASK_CORRECTIVE'],
  });
}

const CASE_CALLS = {
  'correct-supported': 1,
  'correct-insufficient': 1,
  'correct-explicit-error': 3,
  'wrong-explicit-error': 2,
  'wrong-ambiguous': 3,
  'choice-rationale-conflict': 2,
} as const;

const SYNTHETIC_CASE_CALLS = {
  'simple-agreement': 3,
  'partial-correction': 3,
  'same-proposition-correct': 1,
  'same-proposition-wrong': 1,
} as const;

function isSelected(questionId: string, caseId: keyof typeof CASE_CALLS): boolean {
  return TARGET_KEYS.size === 0 || TARGET_KEYS.has(`${questionId}/${caseId}`);
}

function isSyntheticSelected(
  questionId: string,
  caseId: keyof typeof SYNTHETIC_CASE_CALLS,
): boolean {
  const key = `${questionId}/${caseId}`;
  return PROMPT_VERSION === SOURCE_DIRECT_PROBLEM_CANDIDATE_PROMPT_VERSION &&
    TARGET_KEYS.has(key) && V3_SYNTHETIC_KEYS.has(key);
}

function selectedPlan(): { readonly questionId: string; readonly caseId: string; readonly calls: number }[] {
  const standard = fixture.cases.flatMap((item) =>
    (Object.entries(CASE_CALLS) as [keyof typeof CASE_CALLS, number][])
      .filter(([caseId]) => isSelected(item.questionId, caseId))
      .map(([caseId, calls]) => ({ questionId: item.questionId, caseId, calls })),
  );
  const synthetic = fixture.cases.flatMap((item) =>
    (Object.entries(SYNTHETIC_CASE_CALLS) as [keyof typeof SYNTHETIC_CASE_CALLS, number][])
      .filter(([caseId]) => isSyntheticSelected(item.questionId, caseId))
      .map(([caseId, calls]) => ({ questionId: item.questionId, caseId, calls })),
  );
  return [...standard, ...synthetic];
}

async function main(): Promise<void> {
  if (DRY_RUN) {
    const plan = selectedPlan();
    const selectedQuestionIds = new Set(plan.map((item) => item.questionId));
    process.stdout.write(`${JSON.stringify({
      fixtureVersion: fixture.fixtureVersion,
      fixtureHash,
      promptVersion: PROMPT_VERSION,
      promptHash,
      targetQuestionCount: selectedQuestionIds.size,
      plannedCases: plan.length,
      selectedPlan: plan,
      plannedCalls: plan.reduce((sum, item) => sum + item.calls, 0),
      sources: [...preparedSources]
        .filter(([questionId]) => selectedQuestionIds.has(questionId))
        .map(([questionId, source]) => ({
        questionId,
        title: source.bundle.title,
        answerChoiceId: source.bundle.answerChoiceId,
        mediaCount: source.bundle.media.length,
        officialExplanation: source.officialExplanationSource,
        mediaTransport: source.mediaTransport,
      })),
    }, null, 2)}\n`);
    return;
  }
  runStatus = 'RUNNING';
  writeArtifacts();
  try {
    for (const fixtureCase of fixture.cases) await runQuestion(fixtureCase);
    runStatus = 'COMPLETED';
  } catch (error) {
    runStatus = 'ABORTED';
    throw error;
  } finally {
    writeArtifacts();
  }
}

await main();
