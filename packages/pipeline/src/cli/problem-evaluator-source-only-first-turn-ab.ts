import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { ProblemQuestionGoldSchema } from '../problem-solving/gold.js';
import {
  createProblemPathEvaluatorInput,
} from '../problem-solving/path-evaluator-input.js';
import { OpenAIProblemPathEvaluator } from '../problem-solving/path-evaluator-runtime.js';
import {
  createProblemSolvingSession,
  submitInitialProblemResponse,
} from '../problem-solving/session.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const REPEATS = 3;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const CASE_IDS = [
  'hydrogen-production-q12',
  'law-guarantee-q8',
  'fta-origin-q8',
] as const;
const CATEGORIES = ['accurate', 'representativeWrong', 'lowInformation'] as const;
const EXPERIMENT_ROOT = resolve(
  'docs/experiments/problem-evaluator-source-only-first-turn-ab-2026-09-06',
);
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const SOURCE_ROOT = resolve(
  'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
);
const STUDENT_CASE_ROOT = resolve(
  'docs/experiments/problem-gold-extrapolation-2026-09-01/artifacts',
);
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/problem-solving/source-only-first-turn-prompt-v1.md',
);
const EXISTING_ACCURATE_RESULTS = resolve(
  'docs/experiments/problem-evaluator-four-route-correct-probes-postprocessor-fix-2026-09-02/artifacts/results.json',
);
const EXISTING_WRONG_RESULTS = resolve(
  'docs/experiments/problem-evaluator-four-route-wrong-probes-2026-09-02/artifacts/results.json',
);
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;

const CategorySchema = z.enum(CATEGORIES);
type Category = z.infer<typeof CategorySchema>;

const ActionSchema = z.enum([
  'COMPLETE',
  'ASK_DIAGNOSTIC',
  'ASK_CORRECTIVE',
  'EXPLAIN_ITEM_BOUNDARY',
]);
type Action = z.infer<typeof ActionSchema>;

const StudentResponseSchema = z.object({
  choiceId: z.string().min(1),
  rationale: z.string().min(1),
}).strict();
const StudentCasesSchema = z.object({
  accurate: StudentResponseSchema,
  representativeWrong: StudentResponseSchema,
  lowInformation: StudentResponseSchema,
}).passthrough();

const SourceChoiceSchema = z.object({
  choice_number: z.number().int().positive(),
  text: z.string().min(1),
}).passthrough();
const SourceQuestionSchema = z.object({
  question_number: z.number().int().positive(),
  stem: z.string().min(1),
  choices: z.array(SourceChoiceSchema).min(2),
  supplements: z.array(z.object({
    label: z.string(),
    text: z.string(),
  }).passthrough()),
}).passthrough();
const ExperimentInputSchema = z.object({
  caseId: z.string().min(1),
  sourceInput: z.object({
    source: z.object({
      sourceId: z.string().min(1),
      exam: z.string().min(1),
      title: z.string().min(1),
      passage: z.string().min(1),
      question: SourceQuestionSchema,
      answerKey: z.object({
        correctChoice: z.number().int().positive(),
        correctChoiceText: z.string().min(1),
      }).passthrough(),
      media: z.array(z.object({
        mediaId: z.string().min(1),
        sourceUrl: z.string().url(),
        mimeType: z.string().min(1),
        placement: z.unknown(),
      }).passthrough()).optional(),
    }).passthrough(),
  }).passthrough(),
  officialExplanationReference: z.object({
    text: z.string().min(1),
  }).passthrough(),
}).passthrough();

const AssessmentSchema = z.enum([
  'NO_ERROR_DETECTED',
  'CLEAR_ERROR',
  'INSUFFICIENT_EVIDENCE',
  'REASONABLE_ALTERNATIVE_INTERPRETATION',
  'ITEM_OR_EXPLANATION_LIMITATION',
]);
const DirectOutputSchema = z.object({
  outputVersion: z.literal('source-only-first-turn-output-v1'),
  assessment: AssessmentSchema,
  pathSufficiency: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
  divergenceLayer: z.enum([
    'PASSAGE_CONTENT_RECALL',
    'SCENARIO_FACT_REPRESENTATION',
    'CONCEPT_RELATION',
    'CONDITION_APPLICATION',
    'INFERENCE_TRANSFORMATION',
    'OPTION_INTERPRETATION',
    'STEM_POLARITY',
    'SELECTION_EXECUTION',
  ]).nullable(),
  reason: z.string().min(1),
  studentEvidenceQuotes: z.array(z.string().min(1)),
  sourceEvidence: z.array(z.object({
    source: z.enum(['PASSAGE', 'QUESTION', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION']),
    quote: z.string().min(1),
  }).strict()),
  interventionQuestion: z.string().min(1).nullable(),
}).strict();
type DirectOutput = z.infer<typeof DirectOutputSchema>;

const expectationByProbe: Record<string, Action> = {
  'hydrogen-production-q12|accurate': 'COMPLETE',
  'hydrogen-production-q12|representativeWrong': 'ASK_CORRECTIVE',
  'hydrogen-production-q12|lowInformation': 'ASK_DIAGNOSTIC',
  'law-guarantee-q8|accurate': 'COMPLETE',
  'law-guarantee-q8|representativeWrong': 'ASK_CORRECTIVE',
  'law-guarantee-q8|lowInformation': 'ASK_CORRECTIVE',
  'fta-origin-q8|accurate': 'COMPLETE',
  'fta-origin-q8|representativeWrong': 'ASK_CORRECTIVE',
  'fta-origin-q8|lowInformation': 'ASK_DIAGNOSTIC',
};

interface Usage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

interface ComparableResult {
  readonly condition: 'CURRENT_GOLD' | 'SOURCE_ONLY';
  readonly provenance: 'REUSED_2026_09_02' | 'RUN_2026_09_06';
  readonly caseId: string;
  readonly category: Category;
  readonly iteration: number;
  readonly choiceId: string;
  readonly rationale: string;
  readonly expectedAction: Action;
  readonly observedAction: string;
  readonly actionPassed: boolean;
  readonly contractPassed: boolean;
  readonly question: string | null;
  readonly reason: string | null;
  readonly durationMs: number;
  readonly usage: Usage;
  readonly inputBytes?: number;
  readonly result?: unknown;
  readonly rawOutput?: unknown;
  readonly error?: string;
}

interface LoadedCase {
  readonly caseId: string;
  readonly source: z.infer<typeof ExperimentInputSchema>;
  readonly studentCases: z.infer<typeof StudentCasesSchema>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function expectedAction(caseId: string, category: Category): Action {
  const value = expectationByProbe[`${caseId}|${category}`];
  if (value === undefined) throw new Error(`기대 행동이 없는 프로브: ${caseId}|${category}`);
  return value;
}

function actionFromDirect(output: DirectOutput, selectionCorrect: boolean): Action {
  if (output.assessment === 'INSUFFICIENT_EVIDENCE') return 'ASK_DIAGNOSTIC';
  if (output.assessment === 'CLEAR_ERROR') return 'ASK_CORRECTIVE';
  if (
    output.assessment === 'REASONABLE_ALTERNATIVE_INTERPRETATION' ||
    output.assessment === 'ITEM_OR_EXPLANATION_LIMITATION'
  ) return 'EXPLAIN_ITEM_BOUNDARY';
  return selectionCorrect ? 'COMPLETE' : 'EXPLAIN_ITEM_BOUNDARY';
}

function validateDirectSemantics(output: DirectOutput, action: Action): void {
  const expectedSufficiency = output.assessment === 'INSUFFICIENT_EVIDENCE'
    ? 'INSUFFICIENT'
    : 'SUFFICIENT';
  if (output.pathSufficiency !== expectedSufficiency) {
    throw new Error('assessment와 pathSufficiency가 일치하지 않는다.');
  }
  const questionRequired = action === 'ASK_DIAGNOSTIC' || action === 'ASK_CORRECTIVE';
  if (questionRequired !== (output.interventionQuestion !== null)) {
    throw new Error('판정에 따른 질문 null 규칙을 위반했다.');
  }
  if (output.assessment === 'NO_ERROR_DETECTED' && output.divergenceLayer !== null) {
    throw new Error('오류 없음 판정에 divergenceLayer가 존재한다.');
  }
}

function sourceStrings(source: z.infer<typeof ExperimentInputSchema>): Record<string, string> {
  const raw = source.sourceInput.source;
  const questionText = [
    raw.question.stem,
    ...raw.question.supplements.map((item) => `${item.label}\n${item.text}`),
    ...raw.question.choices.map((choice) => `${choice.choice_number}. ${choice.text}`),
  ].join('\n');
  return {
    PASSAGE: raw.passage,
    QUESTION: questionText,
    ANSWER_KEY: `${raw.answerKey.correctChoice} ${raw.answerKey.correctChoiceText}`,
    OFFICIAL_EXPLANATION: source.officialExplanationReference.text,
  };
}

function validateExactEvidence(
  output: DirectOutput,
  rationale: string,
  source: z.infer<typeof ExperimentInputSchema>,
): void {
  for (const quote of output.studentEvidenceQuotes) {
    if (!rationale.includes(quote)) throw new Error(`학생 원문과 일치하지 않는 인용: ${quote}`);
  }
  const strings = sourceStrings(source);
  for (const evidence of output.sourceEvidence) {
    if (!strings[evidence.source]!.includes(evidence.quote)) {
      throw new Error(`출처 원문과 일치하지 않는 인용(${evidence.source}): ${evidence.quote}`);
    }
  }
}

function directInput(loaded: LoadedCase, category: Category) {
  const raw = loaded.source.sourceInput.source;
  const studentResponse = loaded.studentCases[category];
  const selectedNumber = Number(studentResponse.choiceId.replace(/^C/, ''));
  const selectedChoice = raw.question.choices.find(
    (choice) => choice.choice_number === selectedNumber,
  );
  if (selectedChoice === undefined) throw new Error(`${loaded.caseId}: 선택 선지를 찾을 수 없다.`);
  return {
    condition: 'SOURCE_ONLY_NO_PRECOMPUTED_GOLD',
    source: {
      sourceId: raw.sourceId,
      exam: raw.exam,
      title: raw.title,
      passage: raw.passage,
      question: {
        stem: raw.question.stem,
        supplements: raw.question.supplements.map((item) => ({
          label: item.label,
          text: item.text,
        })),
        choices: raw.question.choices.map((choice) => ({
          choiceId: `C${choice.choice_number}`,
          text: choice.text,
        })),
      },
      answerKey: {
        correctChoiceId: `C${raw.answerKey.correctChoice}`,
        correctChoiceText: raw.answerKey.correctChoiceText,
      },
      officialExplanation: loaded.source.officialExplanationReference.text,
      sourceMedia: (raw.media ?? []).map((media) => ({
        mediaId: media.mediaId,
        sourceUrl: media.sourceUrl,
        mimeType: media.mimeType,
        placement: media.placement,
      })),
    },
    studentResponse: {
      selectedChoiceId: studentResponse.choiceId,
      selectedChoiceText: selectedChoice.text,
      rationale: studentResponse.rationale,
    },
    workflowContext: {
      selectionCorrect: selectedNumber === raw.answerKey.correctChoice,
      firstTurn: true,
      maximumQuestionsThisTurn: 1,
    },
  };
}

function outputQuestion(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const action = isRecord(value['nextActionCandidate']) ? value['nextActionCandidate'] : null;
  return action !== null && typeof action['questionText'] === 'string'
    ? action['questionText']
    : null;
}

function outputReason(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const decision = isRecord(value['diagnosticDecision']) ? value['diagnosticDecision'] : null;
  if (decision !== null && typeof decision['reason'] === 'string') return decision['reason'];
  return typeof value['reason'] === 'string' ? value['reason'] : null;
}

function actionFromExistingAccurate(value: unknown): string {
  if (!isRecord(value)) return 'ERROR';
  if (value['mode'] !== 'ASSESS_SELECTION_RATIONALE') return 'ERROR';
  return value['assessment'] === 'CLEAR_ERROR' ? 'ASK_CORRECTIVE' : 'COMPLETE';
}

function actionFromDiagnostic(value: unknown): string {
  if (!isRecord(value)) return 'ERROR';
  const action = isRecord(value['nextActionCandidate']) ? value['nextActionCandidate'] : null;
  return action !== null && typeof action['type'] === 'string' ? action['type'] : 'ERROR';
}

function usageFromCall(callValue: unknown): Usage {
  if (!isRecord(callValue) || !isRecord(callValue['usage'])) {
    return { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  }
  const usage = callValue['usage'];
  return {
    inputTokens: typeof usage['inputTokens'] === 'number' ? usage['inputTokens'] : 0,
    cachedInputTokens: typeof usage['cacheReadTokens'] === 'number' ? usage['cacheReadTokens'] : 0,
    outputTokens: typeof usage['outputTokens'] === 'number' ? usage['outputTokens'] : 0,
  };
}

function durationFromCall(callValue: unknown): number {
  return isRecord(callValue) && typeof callValue['durationMs'] === 'number'
    ? callValue['durationMs']
    : 0;
}

async function reusedBaselineResults(
  loadedCases: readonly LoadedCase[],
): Promise<ComparableResult[]> {
  const accurateRows = z.array(z.record(z.string(), z.unknown())).parse(
    await readJson(EXISTING_ACCURATE_RESULTS),
  );
  const wrongRows = z.array(z.record(z.string(), z.unknown())).parse(
    await readJson(EXISTING_WRONG_RESULTS),
  );
  const selected = new Set(loadedCases.map((item) => item.caseId));
  const results: ComparableResult[] = [];
  for (const row of accurateRows) {
    if (typeof row['caseId'] !== 'string' || !selected.has(row['caseId'])) continue;
    if (typeof row['iteration'] !== 'number' || typeof row['choiceId'] !== 'string' ||
      typeof row['rationale'] !== 'string') continue;
    const observedAction = actionFromExistingAccurate(row['result']);
    const expected = expectedAction(row['caseId'], 'accurate');
    results.push({
      condition: 'CURRENT_GOLD',
      provenance: 'REUSED_2026_09_02',
      caseId: row['caseId'],
      category: 'accurate',
      iteration: row['iteration'],
      choiceId: row['choiceId'],
      rationale: row['rationale'],
      expectedAction: expected,
      observedAction,
      actionPassed: observedAction === expected,
      contractPassed: row['error'] === undefined,
      question: null,
      reason: outputReason(row['result']),
      durationMs: durationFromCall(row['call']),
      usage: usageFromCall(row['call']),
      result: row['result'],
      rawOutput: row['rawOutput'],
      ...(typeof row['error'] === 'string' ? { error: row['error'] } : {}),
    });
  }
  for (const row of wrongRows) {
    if (typeof row['caseId'] !== 'string' || !selected.has(row['caseId'])) continue;
    if (typeof row['iteration'] !== 'number' || typeof row['choiceId'] !== 'string' ||
      typeof row['rationale'] !== 'string') continue;
    const observedAction = actionFromDiagnostic(row['result']);
    const expected = expectedAction(row['caseId'], 'representativeWrong');
    results.push({
      condition: 'CURRENT_GOLD',
      provenance: 'REUSED_2026_09_02',
      caseId: row['caseId'],
      category: 'representativeWrong',
      iteration: row['iteration'],
      choiceId: row['choiceId'],
      rationale: row['rationale'],
      expectedAction: expected,
      observedAction,
      actionPassed: observedAction === expected,
      contractPassed: row['error'] === undefined,
      question: outputQuestion(row['result']),
      reason: outputReason(row['result']),
      durationMs: durationFromCall(row['call']),
      usage: usageFromCall(row['call']),
      result: row['result'],
      rawOutput: row['rawOutput'],
      ...(typeof row['error'] === 'string' ? { error: row['error'] } : {}),
    });
  }
  return results;
}

async function runGoldLowInformation(options: {
  readonly loaded: LoadedCase;
  readonly iteration: number;
}): Promise<ComparableResult> {
  const category = 'lowInformation' as const;
  const expected = expectedAction(options.loaded.caseId, category);
  const response = options.loaded.studentCases.lowInformation;
  const started = Date.now();
  try {
    const rawGold = ProblemQuestionGoldSchema.parse(await readJson(resolve(
      SOURCE_ROOT,
      options.loaded.caseId,
      'c-gold.json',
    )));
    const gold = { ...rawGold, reviewStatus: 'human_reviewed' as const };
    const session = submitInitialProblemResponse(createProblemSolvingSession({
      sessionId: `${options.loaded.caseId}-source-only-ab-gold-low-${options.iteration}`,
      questionId: gold.questionId,
      answerChoiceId: gold.answerChoiceId,
    }), {
      initialChoiceId: response.choiceId,
      rationale: response.rationale,
    });
    const input = createProblemPathEvaluatorInput({
      evaluationMode: 'DIAGNOSE_PATH',
      session,
      gold,
    });
    const evaluation = await new OpenAIProblemPathEvaluator({
      model: MODEL,
      effort: EFFORT,
      timeoutMs: TIMEOUT_MS,
      maxTransportRetries: 0,
      metricRecorder: () => {},
    }).evaluate(input);
    const observedAction = actionFromDiagnostic(evaluation.result);
    return {
      condition: 'CURRENT_GOLD',
      provenance: 'RUN_2026_09_06',
      caseId: options.loaded.caseId,
      category,
      iteration: options.iteration,
      choiceId: response.choiceId,
      rationale: response.rationale,
      expectedAction: expected,
      observedAction,
      actionPassed: observedAction === expected,
      contractPassed: true,
      question: outputQuestion(evaluation.result),
      reason: outputReason(evaluation.result),
      durationMs: evaluation.call.durationMs,
      usage: usageFromCall(evaluation.call),
      inputBytes: Buffer.byteLength(JSON.stringify(input)),
      result: evaluation.result,
      rawOutput: evaluation.rawOutput,
    };
  } catch (error) {
    return {
      condition: 'CURRENT_GOLD',
      provenance: 'RUN_2026_09_06',
      caseId: options.loaded.caseId,
      category,
      iteration: options.iteration,
      choiceId: response.choiceId,
      rationale: response.rationale,
      expectedAction: expected,
      observedAction: 'ERROR',
      actionPassed: false,
      contractPassed: false,
      question: null,
      reason: null,
      durationMs: Date.now() - started,
      usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runDirect(options: {
  readonly loaded: LoadedCase;
  readonly category: Category;
  readonly iteration: number;
  readonly prompt: string;
}): Promise<ComparableResult> {
  const expected = expectedAction(options.loaded.caseId, options.category);
  const response = options.loaded.studentCases[options.category];
  const input = directInput(options.loaded, options.category);
  const started = Date.now();
  let rawOutput: string | undefined;
  let usage: Usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  try {
    const includeImages = !process.argv.includes('--text-only');
    const mediaContent = (includeImages ? input.source.sourceMedia : []).map((media) => ({
      type: 'input_image' as const,
      detail: 'high' as const,
      image_url: media.sourceUrl,
    }));
    const apiResponse = await new OpenAI({ maxRetries: 0 }).responses.create({
      model: MODEL,
      instructions: options.prompt,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: JSON.stringify(input) },
          ...mediaContent,
        ],
      }],
      reasoning: { effort: EFFORT },
      max_output_tokens: 3_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'source_only_first_turn_output',
          strict: true,
          schema: z.toJSONSchema(DirectOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    rawOutput = apiResponse.output_text;
    usage = {
      inputTokens: apiResponse.usage?.input_tokens ?? 0,
      cachedInputTokens: apiResponse.usage?.input_tokens_details.cached_tokens ?? 0,
      outputTokens: apiResponse.usage?.output_tokens ?? 0,
    };
    const output = DirectOutputSchema.parse(JSON.parse(rawOutput));
    const action = actionFromDirect(output, input.workflowContext.selectionCorrect);
    let contractError: string | undefined;
    try {
      validateDirectSemantics(output, action);
      validateExactEvidence(output, response.rationale, options.loaded.source);
    } catch (error) {
      contractError = error instanceof Error ? error.message : String(error);
    }
    return {
      condition: 'SOURCE_ONLY',
      provenance: 'RUN_2026_09_06',
      caseId: options.loaded.caseId,
      category: options.category,
      iteration: options.iteration,
      choiceId: response.choiceId,
      rationale: response.rationale,
      expectedAction: expected,
      observedAction: action,
      actionPassed: action === expected,
      contractPassed: contractError === undefined,
      question: output.interventionQuestion,
      reason: output.reason,
      durationMs: Date.now() - started,
      usage,
      inputBytes: Buffer.byteLength(JSON.stringify(input)),
      result: output,
      rawOutput,
      ...(contractError === undefined ? {} : { error: contractError }),
    };
  } catch (error) {
    return {
      condition: 'SOURCE_ONLY',
      provenance: 'RUN_2026_09_06',
      caseId: options.loaded.caseId,
      category: options.category,
      iteration: options.iteration,
      choiceId: response.choiceId,
      rationale: response.rationale,
      expectedAction: expected,
      observedAction: 'ERROR',
      actionPassed: false,
      contractPassed: false,
      question: null,
      reason: null,
      durationMs: Date.now() - started,
      usage,
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function conditionSummary(results: readonly ComparableResult[], condition: ComparableResult['condition']) {
  const selected = results.filter((result) => result.condition === condition);
  const inputTokens = selected.reduce((sum, row) => sum + row.usage.inputTokens, 0);
  const cachedInputTokens = selected.reduce((sum, row) => sum + row.usage.cachedInputTokens, 0);
  const outputTokens = selected.reduce((sum, row) => sum + row.usage.outputTokens, 0);
  const cost = (
    (inputTokens - cachedInputTokens) * PRICE_PER_MILLION.input +
    cachedInputTokens * PRICE_PER_MILLION.cachedInput +
    outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
  const probes = CASE_IDS.flatMap((caseId) => CATEGORIES.map((category) => {
    const rows = selected.filter((row) => row.caseId === caseId && row.category === category);
    return {
      caseId,
      category,
      expectedAction: expectedAction(caseId, category),
      observedActions: rows.map((row) => row.observedAction),
      passed: rows.filter((row) => row.actionPassed).length,
      total: rows.length,
      stable: rows.length === REPEATS && new Set(rows.map((row) => row.observedAction)).size === 1,
      distinctQuestions: [...new Set(rows.flatMap((row) => row.question === null ? [] : [row.question]))],
    };
  }));
  return {
    calls: selected.length,
    actionPassed: selected.filter((row) => row.actionPassed).length,
    contractPassed: selected.filter((row) => row.contractPassed).length,
    stableLogicalProbes: probes.filter((probe) => probe.stable).length,
    logicalProbes: probes.length,
    averageInputTokens: mean(selected.map((row) => row.usage.inputTokens)),
    averageCachedInputTokens: mean(selected.map((row) => row.usage.cachedInputTokens)),
    averageOutputTokens: mean(selected.map((row) => row.usage.outputTokens)),
    averageDurationMs: mean(selected.map((row) => row.durationMs)),
    observedCostUsd: cost,
    observedCostPerCallUsd: selected.length === 0 ? 0 : cost / selected.length,
    probes,
  };
}

function pairedAgreement(results: readonly ComparableResult[]) {
  const pairs = CASE_IDS.flatMap((caseId) => CATEGORIES.flatMap((category) => (
    Array.from({ length: REPEATS }, (_, index) => {
      const iteration = index + 1;
      const gold = results.find((row) => row.condition === 'CURRENT_GOLD' &&
        row.caseId === caseId && row.category === category && row.iteration === iteration);
      const direct = results.find((row) => row.condition === 'SOURCE_ONLY' &&
        row.caseId === caseId && row.category === category && row.iteration === iteration);
      return {
        caseId,
        category,
        iteration,
        goldAction: gold?.observedAction ?? 'MISSING',
        sourceOnlyAction: direct?.observedAction ?? 'MISSING',
        agreed: gold !== undefined && direct !== undefined &&
          gold.observedAction === direct.observedAction,
      };
    })
  )));
  return {
    agreed: pairs.filter((pair) => pair.agreed).length,
    total: pairs.length,
    disagreements: pairs.filter((pair) => !pair.agreed),
  };
}

function displayCase(caseId: string): string {
  return ({
    'hydrogen-production-q12': '수소 생산 12번',
    'law-guarantee-q8': '보증 계약 8번',
    'fta-origin-q8': 'FTA 원산지 8번',
  } as Record<string, string>)[caseId] ?? caseId;
}

function displayCategory(category: Category): string {
  return ({
    accurate: '정확한 근거',
    representativeWrong: '대표 오답',
    lowInformation: '저정보 오답',
  } as Record<Category, string>)[category];
}

function reportMarkdown(summary: ReturnType<typeof buildSummary>): string {
  const gold = summary.conditions.CURRENT_GOLD;
  const direct = summary.conditions.SOURCE_ONLY;
  const rows = gold.probes.map((goldProbe) => {
    const sourceProbe = direct.probes.find((probe) =>
      probe.caseId === goldProbe.caseId && probe.category === goldProbe.category
    )!;
    return `| ${displayCase(goldProbe.caseId)} | ${displayCategory(goldProbe.category)} | ` +
      `${goldProbe.expectedAction} | ${goldProbe.observedActions.join(' / ')} | ` +
      `${sourceProbe.observedActions.join(' / ')} | ${goldProbe.passed}/${goldProbe.total} | ` +
      `${sourceProbe.passed}/${sourceProbe.total} |`;
  });
  const directQuestions = direct.probes.flatMap((probe) => probe.distinctQuestions.map((question) =>
    `- **${displayCase(probe.caseId)} · ${displayCategory(probe.category)}**: ${question}`
  ));
  const disagreements = summary.pairedActionAgreement.disagreements.length === 0
    ? '- 없음'
    : summary.pairedActionAgreement.disagreements.map((item) =>
        `- ${displayCase(item.caseId)} · ${displayCategory(item.category)} · ${item.iteration}회: ` +
        `골드 ${item.goldAction}, 원문 직접 ${item.sourceOnlyAction}`
      ).join('\n');
  return `# 골드 기반 대 원문 직접 판정 1차 A/B 실험\n\n` +
    `실행일: 2026-09-06\n\n` +
    `## 질문\n\n` +
    `사전에 만든 상세 문제 골드를 쓰는 현재 판정기와, 지문·문제·정답·공식 해설만 매 호출에 제공하는 직접 판정기가 같은 최초 학생 응답을 기존 흐름의 다음 행동으로 얼마나 동일하고 안정적으로 라우팅하는지 비교했다.\n\n` +
    `## 설계\n\n` +
    `- 문항: 수소 생산 12번, 보증 계약 8번, FTA 원산지 8번\n` +
    `- 응답: 정확한 근거, 경로가 드러난 대표 오답, 저정보 오답\n` +
    `- 반복: 문항×응답 조합마다 3회, 조건당 27개 판정\n` +
    `- 모델: 두 조건 모두 \`${MODEL}\`, reasoning effort \`${EFFORT}\`\n` +
    `- 골드 조건: 2026-09-02의 정확한 근거·대표 오답 결과 18개 재사용, 저정보 오답 9개만 현재 코드로 신규 실행\n` +
    `- 원문 직접 조건: 상세 골드 없이 지문·문제·정답·공식 해설과 학생 응답만 입력\n` +
    `- 비교 범위: 최초 응답 직후의 \`COMPLETE / ASK_DIAGNOSTIC / ASK_CORRECTIVE / EXPLAIN_ITEM_BOUNDARY\` 라우팅\n` +
    `- 기본 실행은 원자료 이미지를 포함하지만 \`--text-only\` 실행은 이미지 전송 없이 텍스트만 사용한다. FTA 문항은 (가)·(나)·㉠ 표지가 평문 추출에서 사라지므로 text-only 결과를 완전한 원문 조건으로 해석하면 안 된다.\n\n` +
    `## 결과\n\n` +
    `| 지표 | 현재 골드 | 원문 직접 |\n|---|---:|---:|\n` +
    `| 기대 행동 일치 | ${gold.actionPassed}/${gold.calls} | ${direct.actionPassed}/${direct.calls} |\n` +
    `| 출력·인용 계약 통과 | ${gold.contractPassed}/${gold.calls} | ${direct.contractPassed}/${direct.calls} |\n` +
    `| 3회 행동이 모두 같은 논리 프로브 | ${gold.stableLogicalProbes}/${gold.logicalProbes} | ${direct.stableLogicalProbes}/${direct.logicalProbes} |\n` +
    `| 두 조건 행동 일치 | \`${summary.pairedActionAgreement.agreed}/${summary.pairedActionAgreement.total}\` | \`${summary.pairedActionAgreement.agreed}/${summary.pairedActionAgreement.total}\` |\n` +
    `| 평균 입력 토큰 | ${gold.averageInputTokens.toFixed(1)} | ${direct.averageInputTokens.toFixed(1)} |\n` +
    `| 평균 출력 토큰 | ${gold.averageOutputTokens.toFixed(1)} | ${direct.averageOutputTokens.toFixed(1)} |\n` +
    `| 평균 지연 | ${(gold.averageDurationMs / 1000).toFixed(2)}초 | ${(direct.averageDurationMs / 1000).toFixed(2)}초 |\n` +
    `| 관측 비용 | $${gold.observedCostUsd.toFixed(6)} | $${direct.observedCostUsd.toFixed(6)} |\n\n` +
    `### 프로브별 행동\n\n` +
    `| 문항 | 응답 | 기대 | 현재 골드 3회 | 원문 직접 3회 | 골드 통과 | 직접 통과 |\n` +
    `|---|---|---|---|---|---:|---:|\n${rows.join('\n')}\n\n` +
    `### 조건 간 불일치\n\n${disagreements}\n\n` +
    `### 원문 직접 조건이 생성한 질문\n\n${directQuestions.join('\n')}\n\n` +
    `## 해석 시 주의\n\n` +
    `이 실험은 실제 학생의 후속 답변까지 진행한 학습 효과 실험이 아니라, 고정된 최초 응답을 다음 행동으로 라우팅하는 판정 실험이다. 질문이 서로 달라진 뒤 같은 후속 답변을 강제로 재생하면 공정하지 않으므로, 다중 턴 비교는 별도의 블라인드 학생 시뮬레이터 또는 실제 학생 파일럿으로 분리해야 한다. 또한 세 문항과 합성 응답 아홉 개는 회귀 사례이므로 새로운 지문 일반화의 증거가 아니다.\n`;
}

function buildSummary(results: readonly ComparableResult[]) {
  return {
    experiment: 'problem-evaluator-source-only-first-turn-ab-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    cases: CASE_IDS,
    categories: CATEGORIES,
    repeatsPerProbe: REPEATS,
    priceSnapshot: {
      date: '2026-09-02',
      model: MODEL,
      perMillionTokens: PRICE_PER_MILLION,
    },
    conditions: {
      CURRENT_GOLD: conditionSummary(results, 'CURRENT_GOLD'),
      SOURCE_ONLY: conditionSummary(results, 'SOURCE_ONLY'),
    },
    pairedActionAgreement: pairedAgreement(results),
  };
}

async function main(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const prompt = (await readFile(PROMPT_PATH, 'utf8')).trim();
  const loadedCases: LoadedCase[] = [];
  for (const caseId of CASE_IDS) {
    loadedCases.push({
      caseId,
      source: ExperimentInputSchema.parse(await readJson(resolve(
        SOURCE_ROOT,
        caseId,
        'experiment-input.json',
      ))),
      studentCases: StudentCasesSchema.parse(await readJson(resolve(
        STUDENT_CASE_ROOT,
        caseId,
        'student-response-cases.json',
      ))),
    });
  }

  const textOnlyResume = process.argv.includes('--resume-text-errors');
  const resume = process.env['SOURCE_ONLY_AB_RESUME'] === '1' ||
    process.argv.includes('--resume') || textOnlyResume;
  const baseline = resume
    ? z.array(z.custom<ComparableResult>()).parse(await readJson(resolve(
        ARTIFACT_ROOT,
        'current-gold.json',
      )))
    : await reusedBaselineResults(loadedCases);
  if (!resume) {
    const lowJobs = loadedCases.flatMap((loaded) => Array.from(
      { length: REPEATS },
      (_, index) => ({ loaded, iteration: index + 1 }),
    ));
    for (let index = 0; index < lowJobs.length; index += CONCURRENCY) {
      baseline.push(...await Promise.all(
        lowJobs.slice(index, index + CONCURRENCY).map(runGoldLowInformation),
      ));
      await writeJson(resolve(ARTIFACT_ROOT, 'current-gold.partial.json'), baseline);
    }
    await writeJson(resolve(ARTIFACT_ROOT, 'current-gold.json'), baseline);
  }

  const directResults: ComparableResult[] = resume
    ? z.array(z.custom<ComparableResult>()).parse(await readJson(resolve(
        ARTIFACT_ROOT,
        'source-only.json',
      )))
    : [];
  const allDirectJobs = loadedCases.flatMap((loaded) => CATEGORIES.flatMap((category) =>
    Array.from({ length: REPEATS }, (_, index) => ({
      loaded,
      category,
      iteration: index + 1,
      prompt,
    }))
  ));
  const directJobs = resume
    ? allDirectJobs.filter((job) => {
        const previous = directResults.find((row) => row.caseId === job.loaded.caseId &&
          row.category === job.category && row.iteration === job.iteration);
        if (textOnlyResume) {
          return job.loaded.caseId !== 'fta-origin-q8' && previous?.error !== undefined;
        }
        return job.loaded.caseId === 'fta-origin-q8' || previous?.error !== undefined;
      })
    : allDirectJobs;
  for (let index = 0; index < directJobs.length; index += CONCURRENCY) {
    const batch = await Promise.all(
      directJobs.slice(index, index + CONCURRENCY).map(runDirect),
    );
    for (const row of batch) {
      const previousIndex = directResults.findIndex((candidate) =>
        candidate.caseId === row.caseId && candidate.category === row.category &&
        candidate.iteration === row.iteration
      );
      if (previousIndex === -1) directResults.push(row);
      else directResults[previousIndex] = row;
    }
    await writeJson(resolve(ARTIFACT_ROOT, 'source-only.partial.json'), directResults);
  }
  await writeJson(resolve(ARTIFACT_ROOT, 'source-only.json'), directResults);

  const results = [...baseline, ...directResults].sort((a, b) =>
    a.caseId.localeCompare(b.caseId) ||
    CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) ||
    a.iteration - b.iteration ||
    a.condition.localeCompare(b.condition)
  );
  const summary = buildSummary(results);
  await writeJson(resolve(EXPERIMENT_ROOT, 'SUMMARY.json'), summary);
  // REPORT.md에는 원자료 완전성·계약 실패를 사람이 감사한 최종 해석을 보존한다.
  // 재실행의 기계 집계는 별도 파일에 써 수동 감사를 덮어쓰지 않는다.
  await writeFile(resolve(EXPERIMENT_ROOT, 'RAW-REPORT.md'), reportMarkdown(summary));
  console.log(JSON.stringify(summary, null, 2));
}

await main();
