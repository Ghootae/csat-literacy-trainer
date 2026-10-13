import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  ParagraphDiagnosticGoldSchema,
  type ParagraphDiagnosticGold,
} from '../dialogue-experiment/schema.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const CONCURRENCY = 3;
const TIMEOUT_MS = 120_000;
const COST_CAP_USD = 6;
const COST_GUARD_USD = 0.20;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const CONDITIONS = ['RAW_SOURCE', 'CONCISE_GOLD', 'CURRENT_FULL_GOLD'] as const;
const CATEGORIES = ['ACCURATE_COMPRESSED', 'PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY'] as const;
const EXPERIMENT_ROOT = resolve(
  'docs/experiments/dialogue-three-reference-paragraph-summary-15-2026-09-07',
);
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const PROMPT_PATH = resolve(
  'packages/pipeline/experiments/dialogue/three-reference-paragraph-feedback-prompt-v1.md',
);
const GOLD_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/gold-v2');
const PASSAGE_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/passages');

const SELECTION = [
  { domain: 'HUMANITIES', passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p1' },
  { domain: 'HUMANITIES', passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p2' },
  { domain: 'HUMANITIES', passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p3' },
  { domain: 'HUMANITIES', passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p4' },
  { domain: 'HUMANITIES', passageId: 'gongsun-long-later-mohists', paragraphId: 'gongsun-long-later-mohists-p5' },
  { domain: 'SCIENCE', passageId: 'mrna-vaccine-lipid-nanoparticle', paragraphId: 'mrna-vaccine-lipid-nanoparticle-p1' },
  { domain: 'SCIENCE', passageId: 'mrna-vaccine-lipid-nanoparticle', paragraphId: 'mrna-vaccine-lipid-nanoparticle-p2' },
  { domain: 'SCIENCE', passageId: 'mrna-vaccine-lipid-nanoparticle', paragraphId: 'mrna-vaccine-lipid-nanoparticle-p3' },
  { domain: 'SCIENCE', passageId: 'mrna-vaccine-lipid-nanoparticle', paragraphId: 'mrna-vaccine-lipid-nanoparticle-p4' },
  { domain: 'SCIENCE', passageId: 'mrna-vaccine-lipid-nanoparticle', paragraphId: 'mrna-vaccine-lipid-nanoparticle-p5' },
  { domain: 'SOCIAL', passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p1' },
  { domain: 'SOCIAL', passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p2' },
  { domain: 'SOCIAL', passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p3' },
  { domain: 'SOCIAL', passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p4' },
  { domain: 'SOCIAL', passageId: 'information-asymmetry-free-marketplace', paragraphId: 'information-asymmetry-free-marketplace-p5' },
] as const;

const DomainSchema = z.enum(['HUMANITIES', 'SCIENCE', 'SOCIAL']);
type Domain = z.infer<typeof DomainSchema>;
const ConditionSchema = z.enum(CONDITIONS);
type Condition = z.infer<typeof ConditionSchema>;
const CategorySchema = z.enum(CATEGORIES);
type Category = z.infer<typeof CategorySchema>;
const StatusSchema = z.enum(['PASS', 'UNCLEAR', 'ERROR']);
type Status = z.infer<typeof StatusSchema>;
const ActionSchema = z.enum(['COMPLETE', 'ASK_DIAGNOSTIC', 'ASK_CORRECTIVE']);
type Action = z.infer<typeof ActionSchema>;

const GeneratedResponseSchema = z.object({
  category: CategorySchema,
  text: z.string().min(2).max(500),
  expectedStatus: StatusSchema,
  expectedAction: ActionSchema,
  expectedFocus: z.string().min(1).max(500),
  designRationale: z.string().min(1).max(700),
  targetRelationIds: z.array(z.string().min(1)).max(4),
}).strict();

const GeneratorOutputSchema = z.object({
  outputVersion: z.literal('paragraph-response-fixtures-v1'),
  responses: z.array(GeneratedResponseSchema).length(4),
}).strict();

const EvaluatorOutputSchema = z.object({
  outputVersion: z.literal('paragraph-first-turn-feedback-v1'),
  status: StatusSchema,
  nextAction: ActionSchema,
  reason: z.string().min(1).max(1000),
  studentEvidence: z.array(z.object({
    quote: z.string().min(1),
    interpretation: z.string().min(1),
  }).strict()).max(2),
  paragraphEvidence: z.array(z.object({
    quote: z.string().min(1),
    claim: z.string().min(1),
  }).strict()).max(3),
  nextQuestion: z.object({
    type: z.enum(['DIAGNOSTIC', 'CORRECTIVE']),
    text: z.string().min(1).max(500),
  }).strict().nullable(),
  studentFeedback: z.string().min(1).max(700),
}).strict();
type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;

const JudgeOutputSchema = z.object({
  outputVersion: z.literal('paragraph-feedback-blind-judge-v1'),
  evaluations: z.array(z.object({
    candidateId: z.string().regex(/^K[1-3]$/),
    routeCorrect: z.boolean(),
    diagnosisGrounded: z.boolean(),
    overInference: z.boolean(),
    questionQuality: z.object({
      relevant: z.boolean(),
      nonLeading: z.boolean(),
      singleFocus: z.boolean(),
    }).strict().nullable(),
    feedbackConcise: z.boolean(),
    overallScore: z.number().int().min(1).max(5),
    note: z.string().min(1).max(700),
  }).strict()).length(3),
}).strict();
type JudgeOutput = z.infer<typeof JudgeOutputSchema>;

interface Usage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

interface LoadedParagraph {
  readonly domain: Domain;
  readonly passageId: string;
  readonly passageTitle: string;
  readonly paragraphId: string;
  readonly position: number;
  readonly goldReviewStatus: string;
  readonly gold: ParagraphDiagnosticGold;
}

interface FixtureRecord {
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly passageId: string;
  readonly passageTitle: string;
  readonly goldReviewStatus: string;
  readonly responses: readonly z.infer<typeof GeneratedResponseSchema>[];
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface EvaluatorResult {
  readonly jobKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly condition: Condition;
  readonly responseText: string;
  readonly expectedStatus: Status;
  readonly observedStatus: string;
  readonly statusPassed: boolean;
  readonly expectedAction: Action;
  readonly observedAction: string;
  readonly actionPassed: boolean;
  readonly contractPassed: boolean;
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly inputBytes: number;
  readonly output?: EvaluatorOutput;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface JudgeResult {
  readonly groupKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly candidateMap: Readonly<Record<string, string>>;
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly output?: JudgeOutput;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface EvaluatorJob {
  readonly paragraph: LoadedParagraph;
  readonly fixture: z.infer<typeof GeneratedResponseSchema>;
  readonly condition: Condition;
}

const emptyUsage = (): Usage => ({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 });

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOr<T>(path: string, fallback: T): Promise<T | unknown> {
  try {
    return await readJson(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function usageFromResponse(response: {
  readonly usage?: {
    readonly input_tokens?: number;
    readonly input_tokens_details?: { readonly cached_tokens?: number };
    readonly output_tokens?: number;
  } | null;
}): Usage {
  return {
    inputTokens: response.usage?.input_tokens ?? 0,
    cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

function costFromUsage(usage: Usage): number {
  return (
    (usage.inputTokens - usage.cachedInputTokens) * PRICE_PER_MILLION.input +
    usage.cachedInputTokens * PRICE_PER_MILLION.cachedInput +
    usage.outputTokens * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function resultCost(rows: readonly { readonly usage: Usage }[]): number {
  return rows.reduce((sum, row) => sum + costFromUsage(row.usage), 0);
}

function conservativeCallCost(inputBytes: number, maxOutputTokens: number): number {
  return (inputBytes * PRICE_PER_MILLION.input +
    maxOutputTokens * PRICE_PER_MILLION.output) / 1_000_000;
}

function assertBudget(spent: number, reservations: readonly number[]): void {
  const reserved = reservations.reduce((sum, value) => sum + value, 0);
  if (spent + reserved + COST_GUARD_USD > COST_CAP_USD) {
    throw new Error(
      `비용 안전 중단: 관측 $${spent.toFixed(4)} + 호출 상한예약 $${reserved.toFixed(4)} + ` +
      `여유 $${COST_GUARD_USD.toFixed(2)} > 하드캡 $${COST_CAP_USD.toFixed(2)}`,
    );
  }
}

function hashOrder(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function expectedForCategory(category: Category): { status: Status; action: Action } {
  if (category === 'ACCURATE_COMPRESSED') return { status: 'PASS', action: 'COMPLETE' };
  if (category === 'EXPLICIT_ERROR') return { status: 'ERROR', action: 'ASK_CORRECTIVE' };
  return { status: 'UNCLEAR', action: 'ASK_DIAGNOSTIC' };
}

function validateGeneratedResponses(output: z.infer<typeof GeneratorOutputSchema>, gold: ParagraphDiagnosticGold) {
  const actual = output.responses.map((item) => item.category).sort();
  const expected = [...CATEGORIES].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`합성 응답 범주 집합 불일치: ${actual.join(',')}`);
  }
  const relationIds = new Set(gold.coreRelations.map((item) => item.id));
  for (const item of output.responses) {
    const route = expectedForCategory(item.category);
    if (item.expectedStatus !== route.status || item.expectedAction !== route.action) {
      throw new Error(`${item.category}: 기대 라우팅 불일치`);
    }
    if (item.targetRelationIds.some((id) => !relationIds.has(id))) {
      throw new Error(`${item.category}: 존재하지 않는 targetRelationId`);
    }
    if (item.category === 'EXPLICIT_ERROR' && item.targetRelationIds.length === 0) {
      throw new Error('EXPLICIT_ERROR는 targetRelationIds가 필요하다.');
    }
  }
}

function normalizeGeneratedResponses(
  output: z.infer<typeof GeneratorOutputSchema>,
): z.infer<typeof GeneratorOutputSchema> {
  return {
    ...output,
    responses: output.responses.map((item) => ({
      ...item,
      targetRelationIds: item.targetRelationIds.flatMap((id) =>
        id.split(/[^A-Za-z0-9_-]+/u).filter((part) => part.length > 0)
      ),
    })),
  };
}

function recoverFixtureRecord(
  record: FixtureRecord,
  paragraph: LoadedParagraph | undefined,
): FixtureRecord {
  if (record.responses.length === 4 || record.rawOutput === undefined || paragraph === undefined) {
    return record;
  }
  try {
    const parsed = GeneratorOutputSchema.parse(JSON.parse(record.rawOutput));
    const normalized = normalizeGeneratedResponses(parsed);
    validateGeneratedResponses(normalized, paragraph.gold);
    return {
      paragraphId: record.paragraphId,
      domain: record.domain,
      passageId: record.passageId,
      passageTitle: record.passageTitle,
      goldReviewStatus: record.goldReviewStatus,
      responses: normalized.responses,
      durationMs: record.durationMs,
      usage: record.usage,
      observedCostUsd: record.observedCostUsd,
      rawOutput: record.rawOutput,
    };
  } catch {
    return record;
  }
}

async function loadParagraphs(): Promise<LoadedParagraph[]> {
  const passageCache = new Map<string, unknown>();
  const loaded: LoadedParagraph[] = [];
  for (const selected of SELECTION) {
    let passageRaw = passageCache.get(selected.passageId);
    if (passageRaw === undefined) {
      passageRaw = await readJson(resolve(PASSAGE_ROOT, `${selected.passageId}.json`));
      passageCache.set(selected.passageId, passageRaw);
    }
    const passage = z.object({
      passageId: z.string(),
      title: z.string(),
      paragraphs: z.array(z.object({
        paragraphId: z.string(),
        position: z.number().int().positive(),
        text: z.string().min(1),
        goldReviewStatus: z.string().optional(),
      }).passthrough()),
    }).passthrough().parse(passageRaw);
    const sourceParagraph = passage.paragraphs.find((item) => item.paragraphId === selected.paragraphId);
    if (sourceParagraph === undefined) throw new Error(`${selected.paragraphId}: 원문 문단 없음`);
    const gold = ParagraphDiagnosticGoldSchema.parse(await readJson(
      resolve(GOLD_ROOT, `${selected.paragraphId}.json`),
    ));
    if (gold.paragraphId !== selected.paragraphId || gold.paragraphText !== sourceParagraph.text) {
      throw new Error(`${selected.paragraphId}: 원문-골드 불일치`);
    }
    loaded.push({
      domain: selected.domain,
      passageId: selected.passageId,
      passageTitle: passage.title,
      paragraphId: selected.paragraphId,
      position: sourceParagraph.position,
      goldReviewStatus: sourceParagraph.goldReviewStatus ?? 'legacy_no_explicit_status',
      gold,
    });
  }
  return loaded;
}

function generatorPrompt(): string {
  return `당신은 문단 요약 피드백 비교 실험의 학생 응답 설계자다. 제공된 문단과 골드를 바탕으로 ` +
    `서로 다른 학생 요약 4개를 만든다. 평가 조건 이름이나 골드 필드명을 학생 문장에 넣지 않는다.\n\n` +
    `ACCURATE_COMPRESSED: 자기 말로 간결하게 바꾸되 모든 centralAxes의 최소 의미 연결을 보존한다. PASS/COMPLETE.\n` +
    `PARTIAL: 관련 내용을 일부 정확히 말하지만 한 필수 축 또는 한 축의 필수 연결을 명확히 빠뜨린다. ` +
    `오류를 명시하지 않는다. UNCLEAR/ASK_DIAGNOSTIC.\n` +
    `EXPLICIT_ERROR: 그럴듯하지만 coreRelations 중 중심적인 관계 하나의 방향·주체·인과·대조·귀속을 ` +
    `학생 문장 안에서 분명히 뒤집는다. 단순 누락이 아니다. ERROR/ASK_CORRECTIVE.\n` +
    `TOPIC_ONLY: 문단의 소재나 대상만 언급하고 어떤 핵심 관계를 이해했는지는 드러내지 않는다. ` +
    `오류를 명시하지 않는다. UNCLEAR/ASK_DIAGNOSTIC.\n\n` +
    `각 text는 실제 학생이 쓸 법한 1~2문장으로 만들고, expectedFocus에는 평가자가 확인하거나 교정해야 할 ` +
    `한 가지 초점을 적는다. targetRelationIds는 설계에 직접 관련된 원본 관계 ID만 쓴다. JSON만 출력한다.`;
}

async function generateFixture(
  client: OpenAI,
  paragraph: LoadedParagraph,
): Promise<FixtureRecord> {
  const input = JSON.stringify({
    domain: paragraph.domain,
    passageTitle: paragraph.passageTitle,
    paragraphText: paragraph.gold.paragraphText,
    gold: paragraph.gold,
  });
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: generatorPrompt(),
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 3_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'paragraph_response_fixtures',
          strict: true,
          schema: z.toJSONSchema(GeneratorOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = normalizeGeneratedResponses(
      GeneratorOutputSchema.parse(JSON.parse(rawOutput)),
    );
    validateGeneratedResponses(output, paragraph.gold);
    return {
      paragraphId: paragraph.paragraphId,
      domain: paragraph.domain,
      passageId: paragraph.passageId,
      passageTitle: paragraph.passageTitle,
      goldReviewStatus: paragraph.goldReviewStatus,
      responses: output.responses,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      rawOutput,
    };
  } catch (error) {
    return {
      paragraphId: paragraph.paragraphId,
      domain: paragraph.domain,
      passageId: paragraph.passageId,
      passageTitle: paragraph.passageTitle,
      goldReviewStatus: paragraph.goldReviewStatus,
      responses: [],
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function conciseGold(gold: ParagraphDiagnosticGold) {
  return {
    centralStory: gold.centralStory,
    centralAxes: gold.centralAxes.map((axis) => ({
      id: axis.id,
      description: axis.description,
    })),
  };
}

function inputForJob(job: EvaluatorJob) {
  return {
    task: 'EVALUATE_FIRST_PARAGRAPH_SUMMARY',
    paragraphText: job.paragraph.gold.paragraphText,
    studentSummary: job.fixture.text,
    referencePacket: job.condition === 'RAW_SOURCE'
      ? null
      : job.condition === 'CONCISE_GOLD'
        ? conciseGold(job.paragraph.gold)
        : job.paragraph.gold,
  };
}

function jobKey(paragraphId: string, category: Category, condition: Condition): string {
  return `${paragraphId}|${category}|${condition}`;
}

function validateEvaluatorOutput(output: EvaluatorOutput, job: EvaluatorJob): void {
  const route: Record<Status, Action> = {
    PASS: 'COMPLETE', UNCLEAR: 'ASK_DIAGNOSTIC', ERROR: 'ASK_CORRECTIVE',
  };
  if (output.nextAction !== route[output.status]) throw new Error('status-nextAction 대응 위반');
  if (output.status === 'PASS' && output.nextQuestion !== null) {
    throw new Error('PASS는 질문을 만들 수 없다.');
  }
  if (output.status === 'UNCLEAR' && output.nextQuestion?.type !== 'DIAGNOSTIC') {
    throw new Error('UNCLEAR는 DIAGNOSTIC 질문이 필요하다.');
  }
  if (output.status === 'ERROR' && output.nextQuestion?.type !== 'CORRECTIVE') {
    throw new Error('ERROR는 CORRECTIVE 질문이 필요하다.');
  }
  if (output.status !== 'PASS' && output.studentEvidence.length === 0) {
    throw new Error('미통과 판정에는 학생 근거가 필요하다.');
  }
  for (const evidence of output.studentEvidence) {
    if (!job.fixture.text.includes(evidence.quote)) {
      throw new Error(`학생 응답에 없는 인용: ${evidence.quote}`);
    }
  }
  for (const evidence of output.paragraphEvidence) {
    if (!job.paragraph.gold.paragraphText.includes(evidence.quote)) {
      throw new Error(`문단 원문에 없는 인용: ${evidence.quote}`);
    }
  }
}

async function runEvaluatorJob(
  client: OpenAI,
  prompt: string,
  job: EvaluatorJob,
): Promise<EvaluatorResult> {
  const key = jobKey(job.paragraph.paragraphId, job.fixture.category, job.condition);
  const inputText = JSON.stringify(inputForJob(job));
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: inputText,
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'paragraph_first_turn_feedback',
          strict: true,
          schema: z.toJSONSchema(EvaluatorOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = EvaluatorOutputSchema.parse(JSON.parse(rawOutput));
    let contractError: string | undefined;
    try {
      validateEvaluatorOutput(output, job);
    } catch (error) {
      contractError = error instanceof Error ? error.message : String(error);
    }
    return {
      jobKey: key,
      paragraphId: job.paragraph.paragraphId,
      domain: job.paragraph.domain,
      category: job.fixture.category,
      condition: job.condition,
      responseText: job.fixture.text,
      expectedStatus: job.fixture.expectedStatus,
      observedStatus: output.status,
      statusPassed: output.status === job.fixture.expectedStatus,
      expectedAction: job.fixture.expectedAction,
      observedAction: output.nextAction,
      actionPassed: output.nextAction === job.fixture.expectedAction,
      contractPassed: contractError === undefined,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      inputBytes: Buffer.byteLength(inputText),
      output,
      rawOutput,
      ...(contractError === undefined ? {} : { error: contractError }),
    };
  } catch (error) {
    return {
      jobKey: key,
      paragraphId: job.paragraph.paragraphId,
      domain: job.paragraph.domain,
      category: job.fixture.category,
      condition: job.condition,
      responseText: job.fixture.text,
      expectedStatus: job.fixture.expectedStatus,
      observedStatus: 'CALL_ERROR',
      statusPassed: false,
      expectedAction: job.fixture.expectedAction,
      observedAction: 'CALL_ERROR',
      actionPassed: false,
      contractPassed: false,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      inputBytes: Buffer.byteLength(inputText),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function judgePrompt(): string {
  return `당신은 문단 요약에 대한 최초 피드백을 블라인드 심사한다. 후보 생성 조건을 추정하지 말고 각 후보를 독립적으로 절대평가한다.\n\n` +
    `expectedReference는 응답 설계 단계에서 고정된 기대 라우팅과 초점이다. routeCorrect는 status와 nextAction이 ` +
    `그 기대에 맞을 때만 true다. diagnosisGrounded는 판정 이유가 학생이 실제로 쓴 말과 원문에 근거하고 ` +
    `기대 초점을 정확히 다룰 때만 true다. overInference는 학생이 표현하지 않은 구체적 오류·방향·이해를 ` +
    `후보가 확정했을 때 true다. 단, EXPLICIT_ERROR에서 학생이 실제로 명시한 오류의 직접 교정은 과잉 추론이 아니다.\n` +
    `질문이 없으면 questionQuality는 null이다. 질문이 있으면 관련성, 정답 비노출성, 단일 초점을 각각 판단한다. ` +
    `overallScore는 1(위험/무관)~5(정확하고 바로 사용 가능)다. JSON만 출력한다.`;
}

async function runJudgeGroup(
  client: OpenAI,
  paragraph: LoadedParagraph,
  fixture: z.infer<typeof GeneratedResponseSchema>,
  results: readonly EvaluatorResult[],
): Promise<JudgeResult> {
  const groupKey = `${paragraph.paragraphId}|${fixture.category}`;
  const group = results.filter((item) =>
    item.paragraphId === paragraph.paragraphId && item.category === fixture.category
  );
  if (group.length !== CONDITIONS.length) throw new Error(`${groupKey}: 후보 ${group.length}/3`);
  const shuffled = [...group].sort((left, right) =>
    hashOrder(`${groupKey}|${left.jobKey}`).localeCompare(hashOrder(`${groupKey}|${right.jobKey}`))
  );
  const candidateMap: Record<string, string> = {};
  const candidates = shuffled.map((item, index) => {
    const candidateId = `K${index + 1}`;
    candidateMap[candidateId] = item.jobKey;
    return {
      candidateId,
      status: item.output?.status ?? 'CALL_ERROR',
      nextAction: item.output?.nextAction ?? 'CALL_ERROR',
      reason: item.output?.reason ?? item.error ?? 'NO_OUTPUT',
      studentEvidence: item.output?.studentEvidence ?? [],
      paragraphEvidence: item.output?.paragraphEvidence ?? [],
      nextQuestion: item.output?.nextQuestion ?? null,
      studentFeedback: item.output?.studentFeedback ?? '',
    };
  });
  const input = JSON.stringify({
    paragraphText: paragraph.gold.paragraphText,
    referenceGold: paragraph.gold,
    studentSummary: fixture.text,
    expectedReference: {
      category: fixture.category,
      status: fixture.expectedStatus,
      nextAction: fixture.expectedAction,
      focus: fixture.expectedFocus,
      designRationale: fixture.designRationale,
      targetRelationIds: fixture.targetRelationIds,
    },
    candidates,
  });
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: judgePrompt(),
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_500,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'paragraph_feedback_blind_judge',
          strict: true,
          schema: z.toJSONSchema(JudgeOutputSchema),
        },
      },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = JudgeOutputSchema.parse(JSON.parse(rawOutput));
    const expectedIds = Object.keys(candidateMap).sort();
    const actualIds = output.evaluations.map((item) => item.candidateId).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
      throw new Error('심사 candidateId 집합 불일치');
    }
    return {
      groupKey,
      paragraphId: paragraph.paragraphId,
      domain: paragraph.domain,
      category: fixture.category,
      candidateMap,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      groupKey,
      paragraphId: paragraph.paragraphId,
      domain: paragraph.domain,
      category: fixture.category,
      candidateMap,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function judgeLookup(judges: readonly JudgeResult[]) {
  const lookup = new Map<string, JudgeOutput['evaluations'][number]>();
  for (const judge of judges) {
    if (judge.output === undefined) continue;
    for (const item of judge.output.evaluations) {
      const key = judge.candidateMap[item.candidateId];
      if (key !== undefined) lookup.set(key, item);
    }
  }
  return lookup;
}

function categorySummary(rows: readonly EvaluatorResult[]) {
  return Object.fromEntries(CATEGORIES.map((category) => {
    const selected = rows.filter((item) => item.category === category);
    return [category, {
      calls: selected.length,
      statusPassed: selected.filter((item) => item.statusPassed).length,
      actionPassed: selected.filter((item) => item.actionPassed).length,
      observedStatus: Object.fromEntries([...new Set(selected.map((item) => item.observedStatus))]
        .map((status) => [status, selected.filter((item) => item.observedStatus === status).length])),
    }];
  }));
}

function conditionSummary(
  condition: Condition,
  results: readonly EvaluatorResult[],
  judges: readonly JudgeResult[],
) {
  const selected = results.filter((item) => item.condition === condition);
  const lookup = judgeLookup(judges);
  const judged = selected.flatMap((item) => {
    const value = lookup.get(item.jobKey);
    return value === undefined ? [] : [value];
  });
  const questions = judged.flatMap((item) => item.questionQuality === null ? [] : [item.questionQuality]);
  return {
    calls: selected.length,
    statusPassed: selected.filter((item) => item.statusPassed).length,
    actionPassed: selected.filter((item) => item.actionPassed).length,
    contractPassed: selected.filter((item) => item.contractPassed).length,
    averageInputTokens: mean(selected.map((item) => item.usage.inputTokens)),
    averageCachedInputTokens: mean(selected.map((item) => item.usage.cachedInputTokens)),
    averageOutputTokens: mean(selected.map((item) => item.usage.outputTokens)),
    averageDurationMs: mean(selected.map((item) => item.durationMs)),
    observedCostUsd: resultCost(selected),
    blindJudge: {
      judged: judged.length,
      routeCorrect: judged.filter((item) => item.routeCorrect).length,
      diagnosisGrounded: judged.filter((item) => item.diagnosisGrounded).length,
      overInference: judged.filter((item) => item.overInference).length,
      feedbackConcise: judged.filter((item) => item.feedbackConcise).length,
      averageOverallScore: mean(judged.map((item) => item.overallScore)),
      questionsJudged: questions.length,
      questionRelevant: questions.filter((item) => item.relevant).length,
      questionNonLeading: questions.filter((item) => item.nonLeading).length,
      questionSingleFocus: questions.filter((item) => item.singleFocus).length,
    },
    byCategory: categorySummary(selected),
    byDomain: Object.fromEntries(DomainSchema.options.map((domain) => {
      const rows = selected.filter((item) => item.domain === domain);
      const domainJudged = rows.flatMap((item) => {
        const value = lookup.get(item.jobKey);
        return value === undefined ? [] : [value];
      });
      return [domain, {
        calls: rows.length,
        statusPassed: rows.filter((item) => item.statusPassed).length,
        diagnosisGrounded: domainJudged.filter((item) => item.diagnosisGrounded).length,
        overInference: domainJudged.filter((item) => item.overInference).length,
        averageOverallScore: mean(domainJudged.map((item) => item.overallScore)),
      }];
    })),
  };
}

function buildSummary(
  paragraphs: readonly LoadedParagraph[],
  fixtures: readonly FixtureRecord[],
  results: readonly EvaluatorResult[],
  judges: readonly JudgeResult[],
) {
  const generationCost = resultCost(fixtures);
  const primaryCost = resultCost(results);
  const judgeCost = resultCost(judges);
  const pairAgreement = (left: Condition, right: Condition) => {
    let same = 0;
    let compared = 0;
    for (const paragraph of paragraphs) for (const category of CATEGORIES) {
      const l = results.find((item) => item.paragraphId === paragraph.paragraphId &&
        item.category === category && item.condition === left);
      const r = results.find((item) => item.paragraphId === paragraph.paragraphId &&
        item.category === category && item.condition === right);
      if (l === undefined || r === undefined) continue;
      compared++;
      if (l.observedAction === r.observedAction) same++;
    }
    return { same, compared };
  };
  return {
    experiment: 'dialogue-three-reference-paragraph-summary-15-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    paragraphCount: paragraphs.length,
    domains: Object.fromEntries(DomainSchema.options.map((domain) => [
      domain,
      paragraphs.filter((item) => item.domain === domain).map((item) => item.paragraphId),
    ])),
    categories: CATEGORIES,
    conditions: CONDITIONS,
    repeatsPerProbe: 1,
    calls: {
      responseGeneration: fixtures.length,
      primaryExpected: paragraphs.length * CATEGORIES.length * CONDITIONS.length,
      primaryObserved: results.length,
      judgeExpected: paragraphs.length * CATEGORIES.length,
      judgeObserved: judges.length,
    },
    budget: {
      capUsd: COST_CAP_USD,
      guardUsd: COST_GUARD_USD,
      generationObservedCostUsd: generationCost,
      primaryObservedCostUsd: primaryCost,
      judgeObservedCostUsd: judgeCost,
      totalObservedCostUsd: generationCost + primaryCost + judgeCost,
    },
    priceSnapshot: {
      date: '2026-09-07',
      perMillionTokens: PRICE_PER_MILLION,
    },
    byCondition: Object.fromEntries(CONDITIONS.map((condition) => [
      condition,
      conditionSummary(condition, results, judges),
    ])),
    actionAgreement: {
      rawVsConcise: pairAgreement('RAW_SOURCE', 'CONCISE_GOLD'),
      rawVsFull: pairAgreement('RAW_SOURCE', 'CURRENT_FULL_GOLD'),
      conciseVsFull: pairAgreement('CONCISE_GOLD', 'CURRENT_FULL_GOLD'),
    },
  };
}

function rawReport(summary: ReturnType<typeof buildSummary>): string {
  const rows = CONDITIONS.map((condition) => {
    const item = summary.byCondition[condition]!;
    return `| ${condition} | ${item.statusPassed}/${item.calls} | ${item.contractPassed}/${item.calls} | ` +
      `${item.blindJudge.diagnosisGrounded}/${item.blindJudge.judged} | ` +
      `${item.blindJudge.overInference}/${item.blindJudge.judged} | ` +
      `${item.blindJudge.averageOverallScore.toFixed(2)} | ${item.averageInputTokens.toFixed(0)} | ` +
      `${item.averageOutputTokens.toFixed(0)} | ${(item.averageDurationMs / 1000).toFixed(2)}초 | ` +
      `$${item.observedCostUsd.toFixed(4)} |`;
  });
  return `# 15문단·4응답·3조건 문단 요약 피드백 비교 원시 보고서\n\n` +
    `- 모델: \`${summary.model}\`, reasoning effort \`${summary.effort}\`\n` +
    `- 반복: 문단·응답·조건 조합당 1회\n` +
    `- 응답 생성: ${summary.calls.responseGeneration}회\n` +
    `- 주 평가: ${summary.calls.primaryObserved}/${summary.calls.primaryExpected}회\n` +
    `- 블라인드 심사: ${summary.calls.judgeObserved}/${summary.calls.judgeExpected}회\n` +
    `- 관측 총비용: $${summary.budget.totalObservedCostUsd.toFixed(4)} / 하드캡 $${summary.budget.capUsd.toFixed(2)}\n\n` +
    `| 조건 | 상태 일치 | 계약 통과 | 진단 근거성 | 과잉 추론 | 품질(5점) | 입력 토큰 | 출력 토큰 | 평균 지연 | 주 평가 비용 |\n` +
    `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n`;
}

async function main(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const paragraphs = await loadParagraphs();
  await writeJson(resolve(ARTIFACT_ROOT, 'selection.json'), paragraphs.map((item) => ({
    domain: item.domain,
    passageId: item.passageId,
    passageTitle: item.passageTitle,
    paragraphId: item.paragraphId,
    position: item.position,
    goldReviewStatus: item.goldReviewStatus,
    paragraphTextHash: `sha256:${createHash('sha256').update(item.gold.paragraphText).digest('hex')}`,
    goldHash: `sha256:${createHash('sha256').update(JSON.stringify(item.gold)).digest('hex')}`,
  })));

  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`dry-run complete paragraphs=${paragraphs.length} plannedPrimary=180 plannedJudges=60\n`);
    return;
  }
  if (process.env['OPENAI_API_KEY'] === undefined) throw new Error('OPENAI_API_KEY가 설정되지 않았다.');

  const client = new OpenAI({ maxRetries: 0 });
  const fixturePath = resolve(ARTIFACT_ROOT, 'response-fixtures.json');
  const fixturePartialPath = resolve(ARTIFACT_ROOT, 'response-fixtures.partial.json');
  const resume = process.argv.includes('--resume');
  const resumedFixtures = resume
    ? z.array(z.custom<FixtureRecord>()).parse(await readJsonOr(fixturePartialPath,
      await readJsonOr(fixturePath, [])))
    : [];
  const paragraphMap = new Map(paragraphs.map((item) => [item.paragraphId, item]));
  const fixtures: FixtureRecord[] = resumedFixtures.map((record) =>
    recoverFixtureRecord(record, paragraphMap.get(record.paragraphId))
  );
  const fixtureIds = new Set(fixtures.map((item) => item.paragraphId));
  const generationJobs = paragraphs.filter((item) => !fixtureIds.has(item.paragraphId));
  for (let index = 0; index < generationJobs.length; index += CONCURRENCY) {
    const batch = generationJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((paragraph) => conservativeCallCost(
      Buffer.byteLength(generatorPrompt()) + Buffer.byteLength(JSON.stringify(paragraph.gold)) + 2_000,
      3_000,
    ));
    assertBudget(resultCost(fixtures), reservations);
    fixtures.push(...await Promise.all(batch.map((paragraph) => generateFixture(client, paragraph))));
    await writeJson(fixturePartialPath, fixtures);
    process.stdout.write(`fixtures ${fixtures.length}/${paragraphs.length} cost=$${resultCost(fixtures).toFixed(4)} ` +
      `errors=${fixtures.filter((item) => item.error !== undefined).length}\n`);
  }
  await writeJson(fixturePath, fixtures);
  const fixtureErrors = fixtures.filter((item) => item.error !== undefined || item.responses.length !== 4);
  if (fixtureErrors.length > 0) throw new Error(`합성 응답 생성 실패 ${fixtureErrors.length}건`);
  if (process.argv.includes('--fixtures-only')) {
    process.stdout.write(`fixtures-only complete cost=$${resultCost(fixtures).toFixed(4)}\n`);
    return;
  }

  const fixtureMap = new Map(fixtures.map((item) => [item.paragraphId, item]));
  const prompt = (await readFile(PROMPT_PATH, 'utf8')).trim();
  const resultPath = resolve(ARTIFACT_ROOT, 'results.json');
  const resultPartialPath = resolve(ARTIFACT_ROOT, 'results.partial.json');
  const resumedResults = resume
    ? z.array(z.custom<EvaluatorResult>()).parse(await readJsonOr(resultPartialPath,
      await readJsonOr(resultPath, [])))
    : [];
  const results: EvaluatorResult[] = [...resumedResults];
  const existingKeys = new Set(results.map((item) => item.jobKey));
  const jobs: EvaluatorJob[] = paragraphs.flatMap((paragraph) => {
    const record = fixtureMap.get(paragraph.paragraphId);
    if (record === undefined) throw new Error(`${paragraph.paragraphId}: 합성 응답 없음`);
    return record.responses.flatMap((fixture) => CONDITIONS.map((condition) => ({
      paragraph, fixture, condition,
    })));
  }).sort((left, right) => hashOrder(jobKey(
    left.paragraph.paragraphId, left.fixture.category, left.condition,
  )).localeCompare(hashOrder(jobKey(
    right.paragraph.paragraphId, right.fixture.category, right.condition,
  )))).filter((job) => !existingKeys.has(jobKey(
    job.paragraph.paragraphId, job.fixture.category, job.condition,
  )));
  const expectedPrimary = paragraphs.length * CATEGORIES.length * CONDITIONS.length;
  for (let index = 0; index < jobs.length; index += CONCURRENCY) {
    const batch = jobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((job) => {
      const inputBytes = Buffer.byteLength(prompt) + Buffer.byteLength(JSON.stringify(inputForJob(job)));
      return conservativeCallCost(inputBytes, 2_000);
    });
    assertBudget(resultCost(fixtures) + resultCost(results), reservations);
    results.push(...await Promise.all(batch.map((job) => runEvaluatorJob(client, prompt, job))));
    await writeJson(resultPartialPath, results);
    process.stdout.write(`primary ${results.length}/${expectedPrimary} totalCost=` +
      `$${(resultCost(fixtures) + resultCost(results)).toFixed(4)} errors=` +
      `${results.filter((item) => item.observedAction === 'CALL_ERROR').length}\n`);
  }
  await writeJson(resultPath, results);

  const judgePath = resolve(ARTIFACT_ROOT, 'judgments.json');
  const judgePartialPath = resolve(ARTIFACT_ROOT, 'judgments.partial.json');
  const resumedJudges = resume
    ? z.array(z.custom<JudgeResult>()).parse(await readJsonOr(judgePartialPath,
      await readJsonOr(judgePath, [])))
    : [];
  const judges: JudgeResult[] = [...resumedJudges];
  const existingGroups = new Set(judges.map((item) => item.groupKey));
  const judgeJobs = paragraphs.flatMap((paragraph) => {
    const record = fixtureMap.get(paragraph.paragraphId)!;
    return record.responses.map((fixture) => ({ paragraph, fixture }));
  }).filter((job) => !existingGroups.has(`${job.paragraph.paragraphId}|${job.fixture.category}`));
  const expectedJudges = paragraphs.length * CATEGORIES.length;
  for (let index = 0; index < judgeJobs.length; index += CONCURRENCY) {
    const batch = judgeJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((job) => {
      const group = results.filter((item) => item.paragraphId === job.paragraph.paragraphId &&
        item.category === job.fixture.category);
      const inputBytes = Buffer.byteLength(judgePrompt()) + Buffer.byteLength(JSON.stringify({
        gold: job.paragraph.gold, fixture: job.fixture, group,
      }));
      return conservativeCallCost(inputBytes, 2_500);
    });
    assertBudget(
      resultCost(fixtures) + resultCost(results) + resultCost(judges),
      reservations,
    );
    judges.push(...await Promise.all(batch.map((job) =>
      runJudgeGroup(client, job.paragraph, job.fixture, results)
    )));
    await writeJson(judgePartialPath, judges);
    process.stdout.write(`judge ${judges.length}/${expectedJudges} totalCost=` +
      `$${(resultCost(fixtures) + resultCost(results) + resultCost(judges)).toFixed(4)} errors=` +
      `${judges.filter((item) => item.output === undefined).length}\n`);
  }
  await writeJson(judgePath, judges);

  const summary = buildSummary(paragraphs, fixtures, results, judges);
  await writeJson(resolve(EXPERIMENT_ROOT, 'SUMMARY.json'), summary);
  await writeFile(resolve(EXPERIMENT_ROOT, 'RAW-REPORT.md'), rawReport(summary));
  process.stdout.write(`complete primary=${results.length}/${expectedPrimary} judges=` +
    `${judges.length}/${expectedJudges} cost=$${summary.budget.totalObservedCostUsd.toFixed(4)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
