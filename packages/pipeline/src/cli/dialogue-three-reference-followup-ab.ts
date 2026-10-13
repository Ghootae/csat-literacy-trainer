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
const COST_CAP_USD = 3;
const COST_GUARD_USD = 0.15;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const CONDITIONS = ['CONCISE_GOLD', 'CURRENT_FULL_GOLD'] as const;
const SOURCE_ROOT = resolve(
  'docs/experiments/dialogue-three-reference-paragraph-summary-15-2026-09-07/artifacts',
);
const EXPERIMENT_ROOT = resolve(
  'docs/experiments/dialogue-three-reference-followup-quality-42-2026-09-08',
);
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const GOLD_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/gold-v2');
const FOLLOWUP_PROMPT_PATH = resolve(
  'packages/pipeline/experiments/dialogue/three-reference-paragraph-followup-evaluator-prompt-v1.md',
);

const DomainSchema = z.enum(['HUMANITIES', 'SCIENCE', 'SOCIAL']);
type Domain = z.infer<typeof DomainSchema>;
const ConditionSchema = z.enum(CONDITIONS);
type Condition = z.infer<typeof ConditionSchema>;
const CategorySchema = z.enum(['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY']);
type Category = z.infer<typeof CategorySchema>;
const StatusSchema = z.enum(['PASS', 'UNCLEAR', 'ERROR']);
type Status = z.infer<typeof StatusSchema>;
const ActionSchema = z.enum(['COMPLETE', 'ASK_DIAGNOSTIC', 'ASK_CORRECTIVE']);
type Action = z.infer<typeof ActionSchema>;

const StudentResponseFixtureSchema = z.object({
  category: z.string(),
  text: z.string().min(1),
  expectedStatus: StatusSchema,
  expectedAction: ActionSchema,
  expectedFocus: z.string().min(1),
  designRationale: z.string().min(1),
  targetRelationIds: z.array(z.string()),
}).passthrough();

const FixtureRecordSchema = z.object({
  paragraphId: z.string(),
  domain: DomainSchema,
  responses: z.array(StudentResponseFixtureSchema),
}).passthrough();

const QuestionSchema = z.object({
  type: z.enum(['DIAGNOSTIC', 'CORRECTIVE']),
  text: z.string().min(1),
}).strict();

const PreviousOutputSchema = z.object({
  outputVersion: z.string(),
  status: StatusSchema,
  nextAction: ActionSchema,
  reason: z.string().min(1),
  studentEvidence: z.array(z.object({
    quote: z.string(),
    interpretation: z.string(),
  }).passthrough()),
  paragraphEvidence: z.array(z.object({
    quote: z.string(),
    claim: z.string(),
  }).passthrough()),
  nextQuestion: QuestionSchema.nullable(),
  studentFeedback: z.string().min(1),
}).passthrough();

const PreviousResultSchema = z.object({
  jobKey: z.string(),
  paragraphId: z.string(),
  domain: DomainSchema,
  category: z.string(),
  condition: z.enum(['RAW_SOURCE', ...CONDITIONS]),
  observedStatus: z.string(),
  output: PreviousOutputSchema.optional(),
}).passthrough();

const FollowupEvaluationSchema = z.object({
  outputVersion: z.literal('paragraph-followup-feedback-v1'),
  status: StatusSchema,
  nextAction: ActionSchema,
  reason: z.string().min(1).max(1200),
  studentEvidence: z.array(z.object({
    quote: z.string().min(1),
    interpretation: z.string().min(1),
  }).strict()).max(3),
  paragraphEvidence: z.array(z.object({
    quote: z.string().min(1),
    claim: z.string().min(1),
  }).strict()).max(3),
  nextQuestion: QuestionSchema.nullable(),
  studentFeedback: z.string().min(1).max(700),
}).strict();
type FollowupEvaluation = z.infer<typeof FollowupEvaluationSchema>;

const FeedbackPairJudgeSchema = z.object({
  outputVersion: z.literal('targeted-first-feedback-pair-judge-v1'),
  evaluations: z.array(z.object({
    candidateId: z.enum(['K1', 'K2']),
    statusActionAppropriate: z.boolean(),
    targetAccurate: z.boolean(),
    responseSpecific: z.boolean(),
    questionTypeAppropriate: z.boolean(),
    questionRelevant: z.boolean(),
    questionNonLeading: z.boolean(),
    questionSingleFocus: z.boolean(),
    solutionLeakage: z.boolean(),
    feedbackConcise: z.boolean(),
    overallScore: z.number().int().min(1).max(5),
    note: z.string().min(1).max(700),
  }).strict()).length(2),
  winner: z.enum(['K1', 'K2', 'TIE']),
  winnerReason: z.string().min(1).max(700),
}).strict();
type FeedbackPairJudge = z.infer<typeof FeedbackPairJudgeSchema>;

const StudentFollowupSchema = z.object({
  outputVersion: z.literal('simulated-student-followup-v1'),
  answer: z.string().min(1).max(500),
  responseMode: z.enum(['DIRECT_ANSWER', 'SELF_CORRECTION', 'PARTIAL', 'STILL_UNCERTAIN']),
  answerBasis: z.string().min(1).max(500),
}).strict();
type StudentFollowup = z.infer<typeof StudentFollowupSchema>;

const TrajectoryJudgeSchema = z.object({
  outputVersion: z.literal('followup-trajectory-pair-judge-v1'),
  evaluations: z.array(z.object({
    candidateId: z.enum(['K1', 'K2']),
    firstFeedbackTargeted: z.boolean(),
    followupAddressesQuestion: z.boolean(),
    targetRelationRecovered: z.boolean(),
    originalErrorCorrected: z.boolean().nullable(),
    finalAssessmentAppropriate: z.boolean(),
    pedagogicalProgress: z.enum(['NONE', 'PARTIAL', 'SUBSTANTIAL']),
    solutionLeakage: z.boolean(),
    overallScore: z.number().int().min(1).max(5),
    note: z.string().min(1).max(800),
  }).strict()).length(2),
  winner: z.enum(['K1', 'K2', 'TIE']),
  winnerReason: z.string().min(1).max(800),
}).strict();
type TrajectoryJudge = z.infer<typeof TrajectoryJudgeSchema>;

interface Usage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

interface TargetCase {
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly initialStatus: 'UNCLEAR' | 'ERROR';
  readonly fixture: z.infer<typeof StudentResponseFixtureSchema>;
  readonly gold: ParagraphDiagnosticGold;
  readonly firstTurns: Readonly<Record<Condition, z.infer<typeof PreviousOutputSchema>>>;
}

interface CallRecordBase {
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface FeedbackJudgeRecord extends CallRecordBase {
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly candidateMap: Readonly<Record<string, Condition>>;
  readonly output?: FeedbackPairJudge;
}

interface StudentFollowupRecord extends CallRecordBase {
  readonly jobKey: string;
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly condition: Condition;
  readonly output?: StudentFollowup;
}

interface SecondTurnRecord extends CallRecordBase {
  readonly jobKey: string;
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly condition: Condition;
  readonly observedStatus: string;
  readonly observedAction: string;
  readonly contractPassed: boolean;
  readonly output?: FollowupEvaluation;
}

interface TrajectoryJudgeRecord extends CallRecordBase {
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Domain;
  readonly category: Category;
  readonly candidateMap: Readonly<Record<string, Condition>>;
  readonly output?: TrajectoryJudge;
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

function recordsCost(records: readonly { readonly usage: Usage }[]): number {
  return records.reduce((sum, record) => sum + costFromUsage(record.usage), 0);
}

function conservativeCallCost(inputBytes: number, maxOutputTokens: number): number {
  return (inputBytes * PRICE_PER_MILLION.input +
    maxOutputTokens * PRICE_PER_MILLION.output) / 1_000_000;
}

function assertBudget(spent: number, reservations: readonly number[]): void {
  const reserved = reservations.reduce((sum, value) => sum + value, 0);
  if (spent + reserved + COST_GUARD_USD > COST_CAP_USD) {
    throw new Error(
      `비용 안전 중단: 관측 $${spent.toFixed(4)} + 호출예약 $${reserved.toFixed(4)} + ` +
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

function conciseGold(gold: ParagraphDiagnosticGold) {
  return {
    centralStory: gold.centralStory,
    centralAxes: gold.centralAxes.map((axis) => ({ id: axis.id, description: axis.description })),
  };
}

function referencePacket(target: TargetCase, condition: Condition) {
  return condition === 'CONCISE_GOLD' ? conciseGold(target.gold) : target.gold;
}

async function loadTargets(): Promise<{ targets: TargetCase[]; asymmetric: unknown[] }> {
  const fixtureRecords = z.array(FixtureRecordSchema).parse(await readJson(
    resolve(SOURCE_ROOT, 'response-fixtures.json'),
  ));
  const previousResults = z.array(PreviousResultSchema).parse(await readJson(
    resolve(SOURCE_ROOT, 'results.json'),
  ));
  const fixtureMap = new Map(fixtureRecords.map((record) => [record.paragraphId, record]));
  const logicalKeys = [...new Set(previousResults.map((item) => `${item.paragraphId}|${item.category}`))];
  const targets: TargetCase[] = [];
  const asymmetric: unknown[] = [];
  for (const key of logicalKeys) {
    const [paragraphId, rawCategory] = key.split('|');
    if (paragraphId === undefined || rawCategory === undefined) continue;
    const concise = previousResults.find((item) => item.paragraphId === paragraphId &&
      item.category === rawCategory && item.condition === 'CONCISE_GOLD');
    const full = previousResults.find((item) => item.paragraphId === paragraphId &&
      item.category === rawCategory && item.condition === 'CURRENT_FULL_GOLD');
    if (concise?.output === undefined || full?.output === undefined) continue;
    const conciseNonPass = concise.output.status === 'UNCLEAR' || concise.output.status === 'ERROR';
    const fullNonPass = full.output.status === 'UNCLEAR' || full.output.status === 'ERROR';
    if (conciseNonPass !== fullNonPass) {
      asymmetric.push({
        targetKey: key,
        conciseStatus: concise.output.status,
        fullStatus: full.output.status,
        exclusionReason: '한 조건에 후속 질문이 없어 대응 후속 턴 비교 불가',
      });
      continue;
    }
    if (!conciseNonPass || !fullNonPass) continue;
    if (concise.output.status !== full.output.status) {
      asymmetric.push({
        targetKey: key,
        conciseStatus: concise.output.status,
        fullStatus: full.output.status,
        exclusionReason: '두 조건의 최초 판정 유형 불일치',
      });
      continue;
    }
    const category = CategorySchema.parse(rawCategory);
    const fixtureRecord = fixtureMap.get(paragraphId);
    const fixture = fixtureRecord?.responses.find((item) => item.category === category);
    if (fixtureRecord === undefined || fixture === undefined) {
      throw new Error(`${key}: 응답 fixture 없음`);
    }
    if (concise.output.nextQuestion === null || full.output.nextQuestion === null) {
      throw new Error(`${key}: 비통과 결과에 질문 없음`);
    }
    const gold = ParagraphDiagnosticGoldSchema.parse(await readJson(
      resolve(GOLD_ROOT, `${paragraphId}.json`),
    ));
    targets.push({
      targetKey: key,
      paragraphId,
      domain: fixtureRecord.domain,
      category,
      initialStatus: z.enum(['UNCLEAR', 'ERROR']).parse(concise.output.status),
      fixture,
      gold,
      firstTurns: { CONCISE_GOLD: concise.output, CURRENT_FULL_GOLD: full.output },
    });
  }
  targets.sort((left, right) => hashOrder(left.targetKey).localeCompare(hashOrder(right.targetKey)));
  if (targets.length !== 42) throw new Error(`대응 비통과 표본 ${targets.length}/42`);
  return { targets, asymmetric };
}

function feedbackJudgePrompt(): string {
  return `당신은 문단 요약에 대한 첫 피드백과 질문의 블라인드 쌍대 심사자다. 후보의 생성 조건을 추정하지 않는다. ` +
    `학생에게 실제로 보이는 studentFeedback과 question을 중심으로 각 후보를 독립 평가한 뒤 승자 또는 동률을 고른다.\n\n` +
    `expectedReference는 사전에 고정된 응답 유형과 확인·교정 초점이다. statusActionAppropriate는 상태와 행동이 기대와 맞는지, ` +
    `targetAccurate는 피드백과 질문이 학생이 실제로 빠뜨리거나 틀린 핵심을 겨냥하는지, responseSpecific은 학생 발화를 구체적으로 ` +
    `반영하는지 판단한다. questionNonLeading은 질문 자체가 정답 관계·방향을 알려 주지 않을 때 true다. solutionLeakage는 ` +
    `학생이 생각하기 전에 정답을 사실상 제공하면 true다. 질문이 한 핵심 판단만 요구할 때 singleFocus다. overallScore는 ` +
    `1(위험/무관)~5(바로 사용 가능)다. 승부 차이가 실질적으로 없으면 TIE를 사용한다. JSON만 출력한다.`;
}

function feedbackJudgeInput(target: TargetCase) {
  const candidates = CONDITIONS.map((condition) => ({
    condition,
    output: target.firstTurns[condition],
  })).sort((left, right) => hashOrder(`${target.targetKey}|feedback|${left.condition}`)
    .localeCompare(hashOrder(`${target.targetKey}|feedback|${right.condition}`)));
  const candidateMap: Record<string, Condition> = {};
  const visible = candidates.map((candidate, index) => {
    const candidateId = `K${index + 1}`;
    candidateMap[candidateId] = candidate.condition;
    return {
      candidateId,
      status: candidate.output.status,
      nextAction: candidate.output.nextAction,
      studentFeedback: candidate.output.studentFeedback,
      question: candidate.output.nextQuestion,
    };
  });
  return {
    candidateMap,
    input: JSON.stringify({
      paragraphText: target.gold.paragraphText,
      referenceGold: target.gold,
      initialStudentSummary: target.fixture.text,
      expectedReference: {
        category: target.category,
        expectedStatus: target.fixture.expectedStatus,
        expectedAction: target.fixture.expectedAction,
        expectedFocus: target.fixture.expectedFocus,
        designRationale: target.fixture.designRationale,
        targetRelationIds: target.fixture.targetRelationIds,
      },
      candidates: visible,
    }),
  };
}

async function runFeedbackJudge(client: OpenAI, target: TargetCase): Promise<FeedbackJudgeRecord> {
  const { candidateMap, input } = feedbackJudgeInput(target);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: feedbackJudgePrompt(),
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_200,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'targeted_first_feedback_pair_judge', strict: true,
        schema: z.toJSONSchema(FeedbackPairJudgeSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = FeedbackPairJudgeSchema.parse(JSON.parse(rawOutput));
    const expectedIds = Object.keys(candidateMap).sort();
    const actualIds = output.evaluations.map((item) => item.candidateId).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) throw new Error('후보 ID 불일치');
    return {
      targetKey: target.targetKey, paragraphId: target.paragraphId, domain: target.domain,
      category: target.category, candidateMap, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), output, rawOutput,
    };
  } catch (error) {
    return {
      targetKey: target.targetKey, paragraphId: target.paragraphId, domain: target.domain,
      category: target.category, candidateMap, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function studentProfile(category: Category): string {
  if (category === 'PARTIAL') {
    return '중하 수준. 최초 요약에서 말한 관계는 이해하지만 일부 관계를 빠뜨렸다. 질문이 빠진 관계를 정확히 겨냥하면 문단을 다시 읽고 한 가지 관계를 추가로 설명할 수 있다. 질문과 무관한 전체 정답을 자발적으로 모두 쓰지는 않는다.';
  }
  if (category === 'TOPIC_ONLY') {
    return '낮은 수준. 최초에는 소재만 확인했다. 문단을 다시 볼 수 있으며, 초점이 분명한 질문에는 해당 관계 하나를 찾아 짧게 답할 수 있지만 나머지 중심 구조까지 자발적으로 확장하지 않는다.';
  }
  return '중하 수준. 최초 요약의 명시적 오해를 실제로 가지고 있다. 피드백과 질문이 해당 관계를 정확히 원문과 비교하게 하면 스스로 수정할 수 있지만, 질문이 빗나가거나 답을 암시만 하면 기존 생각을 반복하거나 불확실하게 답할 수 있다.';
}

function simulatorPrompt(): string {
  return `당신은 평가자가 아니라 수능 독서 훈련 중인 한 학생을 일관되게 모사한다. 문단은 화면에 계속 보인다. ` +
    `최초 요약과 studentProfile을 현재 이해 상태로 삼고, 튜터 피드백과 질문을 받은 뒤 실제 학생처럼 1~2문장으로 답한다. ` +
    `채점 기준이나 숨은 정답을 추측해 전체 문단을 새로 요약하지 않는다. 질문이 정확하면 해당 초점만 문단에서 다시 찾아 답하고, ` +
    `모호하거나 빗나가면 부분 답변 또는 불확실성을 표현한다. 질문 속 문장을 그대로 복사해 이해한 척하지 않는다. JSON만 출력한다.`;
}

function simulatorInput(target: TargetCase, condition: Condition): string {
  const first = target.firstTurns[condition];
  return JSON.stringify({
    paragraphText: target.gold.paragraphText,
    initialStudentSummary: target.fixture.text,
    studentProfile: studentProfile(target.category),
    tutorFeedback: first.studentFeedback,
    tutorQuestion: first.nextQuestion,
  });
}

function branchKey(targetKey: string, condition: Condition): string {
  return `${targetKey}|${condition}`;
}

async function runStudentFollowup(
  client: OpenAI,
  target: TargetCase,
  condition: Condition,
): Promise<StudentFollowupRecord> {
  const input = simulatorInput(target, condition);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: simulatorPrompt(),
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 1_200,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'simulated_student_followup', strict: true,
        schema: z.toJSONSchema(StudentFollowupSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = StudentFollowupSchema.parse(JSON.parse(rawOutput));
    return {
      jobKey: branchKey(target.targetKey, condition), targetKey: target.targetKey,
      paragraphId: target.paragraphId, domain: target.domain, category: target.category,
      condition, durationMs: Date.now() - started, usage, observedCostUsd: costFromUsage(usage),
      output, rawOutput,
    };
  } catch (error) {
    return {
      jobKey: branchKey(target.targetKey, condition), targetKey: target.targetKey,
      paragraphId: target.paragraphId, domain: target.domain, category: target.category,
      condition, durationMs: Date.now() - started, usage, observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function secondTurnInput(
  target: TargetCase,
  condition: Condition,
  followup: StudentFollowupRecord,
): string {
  const first = target.firstTurns[condition];
  if (followup.output === undefined) throw new Error(`${followup.jobKey}: 후속 답변 없음`);
  return JSON.stringify({
    task: 'REEVALUATE_AFTER_ONE_FOLLOWUP',
    paragraphText: target.gold.paragraphText,
    initialStudentSummary: target.fixture.text,
    priorIntervention: {
      studentFeedback: first.studentFeedback,
      question: first.nextQuestion,
    },
    followUpAnswer: followup.output.answer,
    referencePacket: referencePacket(target, condition),
  });
}

function validateFollowupOutput(
  output: FollowupEvaluation,
  target: TargetCase,
  followup: StudentFollowupRecord,
): void {
  const action: Record<Status, Action> = {
    PASS: 'COMPLETE', UNCLEAR: 'ASK_DIAGNOSTIC', ERROR: 'ASK_CORRECTIVE',
  };
  if (output.nextAction !== action[output.status]) throw new Error('status-action 대응 위반');
  if (output.status === 'PASS' && output.nextQuestion !== null) throw new Error('PASS 질문 존재');
  if (output.status === 'UNCLEAR' && output.nextQuestion?.type !== 'DIAGNOSTIC') {
    throw new Error('UNCLEAR 진단 질문 없음');
  }
  if (output.status === 'ERROR' && output.nextQuestion?.type !== 'CORRECTIVE') {
    throw new Error('ERROR 교정 질문 없음');
  }
  const studentTexts = [target.fixture.text, followup.output?.answer ?? ''];
  for (const evidence of output.studentEvidence) {
    if (!studentTexts.some((text) => text.includes(evidence.quote))) {
      throw new Error(`학생 응답에 없는 인용: ${evidence.quote}`);
    }
  }
  for (const evidence of output.paragraphEvidence) {
    if (!target.gold.paragraphText.includes(evidence.quote)) {
      throw new Error(`문단에 없는 인용: ${evidence.quote}`);
    }
  }
}

async function runSecondTurn(
  client: OpenAI,
  prompt: string,
  target: TargetCase,
  condition: Condition,
  followup: StudentFollowupRecord,
): Promise<SecondTurnRecord> {
  const input = secondTurnInput(target, condition, followup);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_200,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'paragraph_followup_feedback', strict: true,
        schema: z.toJSONSchema(FollowupEvaluationSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = FollowupEvaluationSchema.parse(JSON.parse(rawOutput));
    let contractError: string | undefined;
    try {
      validateFollowupOutput(output, target, followup);
    } catch (error) {
      contractError = error instanceof Error ? error.message : String(error);
    }
    return {
      jobKey: branchKey(target.targetKey, condition), targetKey: target.targetKey,
      paragraphId: target.paragraphId, domain: target.domain, category: target.category,
      condition, observedStatus: output.status, observedAction: output.nextAction,
      contractPassed: contractError === undefined, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), output, rawOutput,
      ...(contractError === undefined ? {} : { error: contractError }),
    };
  } catch (error) {
    return {
      jobKey: branchKey(target.targetKey, condition), targetKey: target.targetKey,
      paragraphId: target.paragraphId, domain: target.domain, category: target.category,
      condition, observedStatus: 'CALL_ERROR', observedAction: 'CALL_ERROR',
      contractPassed: false, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function trajectoryJudgePrompt(): string {
  return `당신은 문단 요약 튜터의 첫 피드백부터 학생 후속 답변과 재판정까지를 블라인드 쌍대 심사한다. ` +
    `후보 생성 조건을 추정하지 않는다. 두 후보의 학생 답변은 별도 모사 결과이므로 단순히 문장이 더 유창한 쪽을 고르지 말고, ` +
    `첫 피드백이 목표 관계를 드러내거나 오류를 수정하도록 얼마나 효과적으로 이끌었는지를 본다.\n\n` +
    `targetRelationRecovered는 후속 답변에 기대 초점의 핵심 관계가 실제로 나타날 때만 true다. ERROR 사례의 ` +
    `originalErrorCorrected는 최초의 명시적 오류를 후속 답변이 분명히 수정했는지 판단하고, UNCLEAR 사례에서는 null이다. ` +
    `finalAssessmentAppropriate는 누적 학생 응답에 비추어 재판정이 적절할 때 true다. solutionLeakage는 최초 피드백이나 질문이 ` +
    `정답 관계를 먼저 제공해 학생이 독립적으로 생각할 필요가 없게 했을 때 true다. overallScore는 1~5, 실질적 차이가 없으면 ` +
    `TIE다. JSON만 출력한다.`;
}

function trajectoryJudgeInput(
  target: TargetCase,
  followups: readonly StudentFollowupRecord[],
  secondTurns: readonly SecondTurnRecord[],
) {
  const branches = CONDITIONS.map((condition) => {
    const followup = followups.find((item) => item.targetKey === target.targetKey &&
      item.condition === condition);
    const second = secondTurns.find((item) => item.targetKey === target.targetKey &&
      item.condition === condition);
    if (followup?.output === undefined || second?.output === undefined) {
      throw new Error(`${target.targetKey}|${condition}: 궤적 자료 없음`);
    }
    return { condition, followup: followup.output, second: second.output };
  }).sort((left, right) => hashOrder(`${target.targetKey}|trajectory|${left.condition}`)
    .localeCompare(hashOrder(`${target.targetKey}|trajectory|${right.condition}`)));
  const candidateMap: Record<string, Condition> = {};
  const candidates = branches.map((branch, index) => {
    const candidateId = `K${index + 1}`;
    candidateMap[candidateId] = branch.condition;
    const first = target.firstTurns[branch.condition];
    return {
      candidateId,
      firstTurn: {
        status: first.status,
        studentFeedback: first.studentFeedback,
        question: first.nextQuestion,
      },
      studentFollowup: branch.followup.answer,
      secondTurn: {
        status: branch.second.status,
        nextAction: branch.second.nextAction,
        reason: branch.second.reason,
        nextQuestion: branch.second.nextQuestion,
        studentFeedback: branch.second.studentFeedback,
      },
    };
  });
  return {
    candidateMap,
    input: JSON.stringify({
      paragraphText: target.gold.paragraphText,
      referenceGold: target.gold,
      initialStudentSummary: target.fixture.text,
      expectedReference: {
        category: target.category,
        initialStatus: target.initialStatus,
        expectedFocus: target.fixture.expectedFocus,
        designRationale: target.fixture.designRationale,
        targetRelationIds: target.fixture.targetRelationIds,
      },
      candidates,
    }),
  };
}

async function runTrajectoryJudge(
  client: OpenAI,
  target: TargetCase,
  followups: readonly StudentFollowupRecord[],
  secondTurns: readonly SecondTurnRecord[],
): Promise<TrajectoryJudgeRecord> {
  const { candidateMap, input } = trajectoryJudgeInput(target, followups, secondTurns);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: trajectoryJudgePrompt(),
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_400,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'followup_trajectory_pair_judge', strict: true,
        schema: z.toJSONSchema(TrajectoryJudgeSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = TrajectoryJudgeSchema.parse(JSON.parse(rawOutput));
    const expectedIds = Object.keys(candidateMap).sort();
    const actualIds = output.evaluations.map((item) => item.candidateId).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) throw new Error('후보 ID 불일치');
    return {
      targetKey: target.targetKey, paragraphId: target.paragraphId, domain: target.domain,
      category: target.category, candidateMap, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), output, rawOutput,
    };
  } catch (error) {
    return {
      targetKey: target.targetKey, paragraphId: target.paragraphId, domain: target.domain,
      category: target.category, candidateMap, durationMs: Date.now() - started, usage,
      observedCostUsd: costFromUsage(usage), ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function feedbackEvaluationLookup(records: readonly FeedbackJudgeRecord[]) {
  const lookup = new Map<string, FeedbackPairJudge['evaluations'][number]>();
  for (const record of records) {
    if (record.output === undefined) continue;
    for (const evaluation of record.output.evaluations) {
      const condition = record.candidateMap[evaluation.candidateId];
      if (condition !== undefined) lookup.set(branchKey(record.targetKey, condition), evaluation);
    }
  }
  return lookup;
}

function trajectoryEvaluationLookup(records: readonly TrajectoryJudgeRecord[]) {
  const lookup = new Map<string, TrajectoryJudge['evaluations'][number]>();
  for (const record of records) {
    if (record.output === undefined) continue;
    for (const evaluation of record.output.evaluations) {
      const condition = record.candidateMap[evaluation.candidateId];
      if (condition !== undefined) lookup.set(branchKey(record.targetKey, condition), evaluation);
    }
  }
  return lookup;
}

function winnerByCondition<T extends { readonly candidateMap: Readonly<Record<string, Condition>>; readonly output?: { readonly winner: string } }>(
  records: readonly T[],
) {
  const counts: Record<Condition | 'TIE', number> = {
    CONCISE_GOLD: 0, CURRENT_FULL_GOLD: 0, TIE: 0,
  };
  for (const record of records) {
    const winner = record.output?.winner;
    if (winner === undefined) continue;
    if (winner === 'TIE') counts.TIE++;
    else {
      const condition = record.candidateMap[winner];
      if (condition !== undefined) counts[condition]++;
    }
  }
  return counts;
}

function buildSummary(
  targets: readonly TargetCase[],
  asymmetric: readonly unknown[],
  feedbackJudges: readonly FeedbackJudgeRecord[],
  followups: readonly StudentFollowupRecord[],
  secondTurns: readonly SecondTurnRecord[],
  trajectoryJudges: readonly TrajectoryJudgeRecord[],
) {
  const feedbackLookup = feedbackEvaluationLookup(feedbackJudges);
  const trajectoryLookup = trajectoryEvaluationLookup(trajectoryJudges);
  const byCondition = Object.fromEntries(CONDITIONS.map((condition) => {
    const branchFollowups = followups.filter((item) => item.condition === condition);
    const branchSeconds = secondTurns.filter((item) => item.condition === condition);
    const firstEval = targets.flatMap((target) => {
      const value = feedbackLookup.get(branchKey(target.targetKey, condition));
      return value === undefined ? [] : [value];
    });
    const trajectoryEval = targets.flatMap((target) => {
      const value = trajectoryLookup.get(branchKey(target.targetKey, condition));
      return value === undefined ? [] : [value];
    });
    const unclearKeys = new Set(targets.filter((item) => item.initialStatus === 'UNCLEAR')
      .map((item) => item.targetKey));
    const errorKeys = new Set(targets.filter((item) => item.initialStatus === 'ERROR')
      .map((item) => item.targetKey));
    const unclearSeconds = branchSeconds.filter((item) => unclearKeys.has(item.targetKey));
    const errorSeconds = branchSeconds.filter((item) => errorKeys.has(item.targetKey));
    const unclearTraj = targets.filter((item) => unclearKeys.has(item.targetKey)).flatMap((target) => {
      const value = trajectoryLookup.get(branchKey(target.targetKey, condition));
      return value === undefined ? [] : [value];
    });
    const errorTraj = targets.filter((item) => errorKeys.has(item.targetKey)).flatMap((target) => {
      const value = trajectoryLookup.get(branchKey(target.targetKey, condition));
      return value === undefined ? [] : [value];
    });
    return [condition, {
      firstFeedback: {
        judged: firstEval.length,
        targetAccurate: firstEval.filter((item) => item.targetAccurate).length,
        responseSpecific: firstEval.filter((item) => item.responseSpecific).length,
        questionNonLeading: firstEval.filter((item) => item.questionNonLeading).length,
        questionSingleFocus: firstEval.filter((item) => item.questionSingleFocus).length,
        solutionLeakage: firstEval.filter((item) => item.solutionLeakage).length,
        averageOverallScore: mean(firstEval.map((item) => item.overallScore)),
      },
      simulatedFollowups: {
        calls: branchFollowups.length,
        modes: Object.fromEntries(StudentFollowupSchema.shape.responseMode.options.map((mode) => [
          mode,
          branchFollowups.filter((item) => item.output?.responseMode === mode).length,
        ])),
      },
      secondTurn: {
        calls: branchSeconds.length,
        contractPassed: branchSeconds.filter((item) => item.contractPassed).length,
        finalStatuses: Object.fromEntries(StatusSchema.options.map((status) => [
          status,
          branchSeconds.filter((item) => item.observedStatus === status).length,
        ])),
        unclearCases: {
          calls: unclearSeconds.length,
          pass: unclearSeconds.filter((item) => item.observedStatus === 'PASS').length,
          targetRecovered: unclearTraj.filter((item) => item.targetRelationRecovered).length,
        },
        errorCases: {
          calls: errorSeconds.length,
          pass: errorSeconds.filter((item) => item.observedStatus === 'PASS').length,
          noLongerError: errorSeconds.filter((item) => item.observedStatus !== 'ERROR').length,
          originalErrorCorrected: errorTraj.filter((item) => item.originalErrorCorrected === true).length,
        },
      },
      trajectory: {
        judged: trajectoryEval.length,
        firstFeedbackTargeted: trajectoryEval.filter((item) => item.firstFeedbackTargeted).length,
        followupAddressesQuestion: trajectoryEval.filter((item) => item.followupAddressesQuestion).length,
        targetRelationRecovered: trajectoryEval.filter((item) => item.targetRelationRecovered).length,
        finalAssessmentAppropriate: trajectoryEval.filter((item) => item.finalAssessmentAppropriate).length,
        solutionLeakage: trajectoryEval.filter((item) => item.solutionLeakage).length,
        substantialProgress: trajectoryEval.filter((item) => item.pedagogicalProgress === 'SUBSTANTIAL').length,
        averageOverallScore: mean(trajectoryEval.map((item) => item.overallScore)),
      },
      observedCostUsd: recordsCost(branchFollowups) + recordsCost(branchSeconds),
    }];
  }));
  const feedbackCost = recordsCost(feedbackJudges);
  const followupCost = recordsCost(followups);
  const secondCost = recordsCost(secondTurns);
  const trajectoryCost = recordsCost(trajectoryJudges);
  return {
    experiment: 'dialogue-three-reference-followup-quality-42-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    repeatsPerBranch: 1,
    targetCases: targets.length,
    targetByInitialStatus: {
      UNCLEAR: targets.filter((item) => item.initialStatus === 'UNCLEAR').length,
      ERROR: targets.filter((item) => item.initialStatus === 'ERROR').length,
    },
    targetByCategory: Object.fromEntries(CategorySchema.options.map((category) => [
      category,
      targets.filter((item) => item.category === category).length,
    ])),
    excludedAsymmetricCases: asymmetric,
    calls: {
      firstFeedbackPairJudge: feedbackJudges.length,
      simulatedStudentFollowup: followups.length,
      secondTurnEvaluation: secondTurns.length,
      trajectoryPairJudge: trajectoryJudges.length,
      total: feedbackJudges.length + followups.length + secondTurns.length + trajectoryJudges.length,
    },
    budget: {
      capUsd: COST_CAP_USD,
      guardUsd: COST_GUARD_USD,
      firstFeedbackJudgeCostUsd: feedbackCost,
      simulatedFollowupCostUsd: followupCost,
      secondTurnCostUsd: secondCost,
      trajectoryJudgeCostUsd: trajectoryCost,
      totalObservedCostUsd: feedbackCost + followupCost + secondCost + trajectoryCost,
    },
    priceSnapshot: { date: '2026-09-08', perMillionTokens: PRICE_PER_MILLION },
    firstFeedbackWinners: winnerByCondition(feedbackJudges),
    trajectoryWinners: winnerByCondition(trajectoryJudges),
    byCondition,
  };
}

function rawReport(summary: ReturnType<typeof buildSummary>): string {
  const rows = CONDITIONS.map((condition) => {
    const item = summary.byCondition[condition]!;
    return `| ${condition} | ${item.firstFeedback.targetAccurate}/${item.firstFeedback.judged} | ` +
      `${item.firstFeedback.averageOverallScore.toFixed(2)} | ` +
      `${item.secondTurn.unclearCases.targetRecovered}/${item.secondTurn.unclearCases.calls} | ` +
      `${item.secondTurn.errorCases.originalErrorCorrected}/${item.secondTurn.errorCases.calls} | ` +
      `${item.trajectory.finalAssessmentAppropriate}/${item.trajectory.judged} | ` +
      `${item.trajectory.averageOverallScore.toFixed(2)} |`;
  });
  return `# 간결 골드·상세 골드 후속 한 턴 비교 원시 보고서\n\n` +
    `- 모델: \`${summary.model}\`, reasoning effort \`${summary.effort}\`\n` +
    `- 대응 표본: ${summary.targetCases}개 (UNCLEAR ${summary.targetByInitialStatus.UNCLEAR}, ERROR ${summary.targetByInitialStatus.ERROR})\n` +
    `- 총 호출: ${summary.calls.total}회\n` +
    `- 관측 비용: $${summary.budget.totalObservedCostUsd.toFixed(4)} / 하드캡 $${summary.budget.capUsd.toFixed(2)}\n\n` +
    `| 조건 | 첫 피드백 목표 정확 | 첫 피드백 품질 | UNCLEAR 목표 회수 | ERROR 교정 | 재판정 적절 | 궤적 품질 |\n` +
    `|---|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n`;
}

async function main(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const { targets, asymmetric } = await loadTargets();
  await writeJson(resolve(ARTIFACT_ROOT, 'target-manifest.json'), {
    targetCount: targets.length,
    targets: targets.map((target) => ({
      targetKey: target.targetKey,
      paragraphId: target.paragraphId,
      domain: target.domain,
      category: target.category,
      initialStatus: target.initialStatus,
      initialResponse: target.fixture.text,
      expectedFocus: target.fixture.expectedFocus,
      firstTurns: Object.fromEntries(CONDITIONS.map((condition) => [condition, {
        status: target.firstTurns[condition].status,
        studentFeedback: target.firstTurns[condition].studentFeedback,
        question: target.firstTurns[condition].nextQuestion,
      }])),
    })),
    asymmetric,
  });
  if (process.argv.includes('--dry-run')) {
    process.stdout.write(`dry-run targets=${targets.length} plannedCalls=${targets.length * 6}\n`);
    return;
  }
  if (process.env['OPENAI_API_KEY'] === undefined) throw new Error('OPENAI_API_KEY가 설정되지 않았다.');
  const client = new OpenAI({ maxRetries: 0 });
  const resume = process.argv.includes('--resume');

  const feedbackPath = resolve(ARTIFACT_ROOT, 'first-feedback-judgments.json');
  const feedbackPartial = resolve(ARTIFACT_ROOT, 'first-feedback-judgments.partial.json');
  const feedbackJudges: FeedbackJudgeRecord[] = resume
    ? z.array(z.custom<FeedbackJudgeRecord>()).parse(await readJsonOr(feedbackPartial,
      await readJsonOr(feedbackPath, [])))
    : [];
  const feedbackKeys = new Set(feedbackJudges.map((item) => item.targetKey));
  const feedbackJobs = targets.filter((target) => !feedbackKeys.has(target.targetKey));
  for (let index = 0; index < feedbackJobs.length; index += CONCURRENCY) {
    const batch = feedbackJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((target) => {
      const { input } = feedbackJudgeInput(target);
      return conservativeCallCost(Buffer.byteLength(feedbackJudgePrompt()) + Buffer.byteLength(input), 2_200);
    });
    assertBudget(recordsCost(feedbackJudges), reservations);
    feedbackJudges.push(...await Promise.all(batch.map((target) => runFeedbackJudge(client, target))));
    await writeJson(feedbackPartial, feedbackJudges);
    process.stdout.write(`feedbackJudge ${feedbackJudges.length}/${targets.length} cost=` +
      `$${recordsCost(feedbackJudges).toFixed(4)} errors=${feedbackJudges.filter((x) => x.output === undefined).length}\n`);
  }
  await writeJson(feedbackPath, feedbackJudges);
  if (feedbackJudges.some((item) => item.output === undefined)) throw new Error('첫 피드백 심사 실패 존재');

  const followupPath = resolve(ARTIFACT_ROOT, 'student-followups.json');
  const followupPartial = resolve(ARTIFACT_ROOT, 'student-followups.partial.json');
  const followups: StudentFollowupRecord[] = resume
    ? z.array(z.custom<StudentFollowupRecord>()).parse(await readJsonOr(followupPartial,
      await readJsonOr(followupPath, [])))
    : [];
  const followupKeys = new Set(followups.map((item) => item.jobKey));
  const followupJobs = targets.flatMap((target) => CONDITIONS.map((condition) => ({ target, condition })))
    .sort((left, right) => hashOrder(branchKey(left.target.targetKey, left.condition))
      .localeCompare(hashOrder(branchKey(right.target.targetKey, right.condition))))
    .filter((job) => !followupKeys.has(branchKey(job.target.targetKey, job.condition)));
  for (let index = 0; index < followupJobs.length; index += CONCURRENCY) {
    const batch = followupJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((job) => conservativeCallCost(
      Buffer.byteLength(simulatorPrompt()) + Buffer.byteLength(simulatorInput(job.target, job.condition)),
      1_200,
    ));
    assertBudget(recordsCost(feedbackJudges) + recordsCost(followups), reservations);
    followups.push(...await Promise.all(batch.map((job) =>
      runStudentFollowup(client, job.target, job.condition)
    )));
    await writeJson(followupPartial, followups);
    process.stdout.write(`followup ${followups.length}/${targets.length * 2} totalCost=` +
      `$${(recordsCost(feedbackJudges) + recordsCost(followups)).toFixed(4)} errors=` +
      `${followups.filter((x) => x.output === undefined).length}\n`);
  }
  await writeJson(followupPath, followups);
  if (followups.some((item) => item.output === undefined)) throw new Error('학생 후속 답변 실패 존재');

  const followupPrompt = (await readFile(FOLLOWUP_PROMPT_PATH, 'utf8')).trim();
  const secondPath = resolve(ARTIFACT_ROOT, 'second-turn-results.json');
  const secondPartial = resolve(ARTIFACT_ROOT, 'second-turn-results.partial.json');
  const secondTurns: SecondTurnRecord[] = resume
    ? z.array(z.custom<SecondTurnRecord>()).parse(await readJsonOr(secondPartial,
      await readJsonOr(secondPath, [])))
    : [];
  const secondKeys = new Set(secondTurns.map((item) => item.jobKey));
  const secondJobs = targets.flatMap((target) => CONDITIONS.map((condition) => {
    const followup = followups.find((item) => item.targetKey === target.targetKey &&
      item.condition === condition);
    if (followup === undefined) throw new Error(`${target.targetKey}|${condition}: 후속 답변 없음`);
    return { target, condition, followup };
  })).sort((left, right) => hashOrder(branchKey(left.target.targetKey, left.condition))
    .localeCompare(hashOrder(branchKey(right.target.targetKey, right.condition))))
    .filter((job) => !secondKeys.has(branchKey(job.target.targetKey, job.condition)));
  for (let index = 0; index < secondJobs.length; index += CONCURRENCY) {
    const batch = secondJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((job) => conservativeCallCost(
      Buffer.byteLength(followupPrompt) + Buffer.byteLength(secondTurnInput(
        job.target, job.condition, job.followup,
      )), 2_200,
    ));
    assertBudget(
      recordsCost(feedbackJudges) + recordsCost(followups) + recordsCost(secondTurns),
      reservations,
    );
    secondTurns.push(...await Promise.all(batch.map((job) =>
      runSecondTurn(client, followupPrompt, job.target, job.condition, job.followup)
    )));
    await writeJson(secondPartial, secondTurns);
    process.stdout.write(`secondTurn ${secondTurns.length}/${targets.length * 2} totalCost=` +
      `$${(recordsCost(feedbackJudges) + recordsCost(followups) + recordsCost(secondTurns)).toFixed(4)} ` +
      `errors=${secondTurns.filter((x) => x.observedStatus === 'CALL_ERROR').length}\n`);
  }
  await writeJson(secondPath, secondTurns);
  if (secondTurns.some((item) => item.output === undefined)) throw new Error('누적 재판정 실패 존재');

  const trajectoryPath = resolve(ARTIFACT_ROOT, 'trajectory-judgments.json');
  const trajectoryPartial = resolve(ARTIFACT_ROOT, 'trajectory-judgments.partial.json');
  const trajectoryJudges: TrajectoryJudgeRecord[] = resume
    ? z.array(z.custom<TrajectoryJudgeRecord>()).parse(await readJsonOr(trajectoryPartial,
      await readJsonOr(trajectoryPath, [])))
    : [];
  const trajectoryKeys = new Set(trajectoryJudges.map((item) => item.targetKey));
  const trajectoryJobs = targets.filter((target) => !trajectoryKeys.has(target.targetKey));
  for (let index = 0; index < trajectoryJobs.length; index += CONCURRENCY) {
    const batch = trajectoryJobs.slice(index, index + CONCURRENCY);
    const reservations = batch.map((target) => {
      const { input } = trajectoryJudgeInput(target, followups, secondTurns);
      return conservativeCallCost(Buffer.byteLength(trajectoryJudgePrompt()) + Buffer.byteLength(input), 2_400);
    });
    assertBudget(
      recordsCost(feedbackJudges) + recordsCost(followups) + recordsCost(secondTurns) +
      recordsCost(trajectoryJudges),
      reservations,
    );
    trajectoryJudges.push(...await Promise.all(batch.map((target) =>
      runTrajectoryJudge(client, target, followups, secondTurns)
    )));
    await writeJson(trajectoryPartial, trajectoryJudges);
    process.stdout.write(`trajectoryJudge ${trajectoryJudges.length}/${targets.length} totalCost=` +
      `$${(recordsCost(feedbackJudges) + recordsCost(followups) + recordsCost(secondTurns) +
        recordsCost(trajectoryJudges)).toFixed(4)} errors=` +
      `${trajectoryJudges.filter((x) => x.output === undefined).length}\n`);
  }
  await writeJson(trajectoryPath, trajectoryJudges);
  if (trajectoryJudges.some((item) => item.output === undefined)) throw new Error('궤적 심사 실패 존재');

  const summary = buildSummary(
    targets, asymmetric, feedbackJudges, followups, secondTurns, trajectoryJudges,
  );
  await writeJson(resolve(EXPERIMENT_ROOT, 'SUMMARY.json'), summary);
  await writeFile(resolve(EXPERIMENT_ROOT, 'RAW-REPORT.md'), rawReport(summary));
  process.stdout.write(`complete calls=${summary.calls.total} cost=` +
    `$${summary.budget.totalObservedCostUsd.toFixed(4)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
