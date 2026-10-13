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
const MAX_TURNS = 3;
const COST_CAP_USD = 6;
const COST_GUARD_USD = 0.2;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const PIPELINES = ['CONCISE_ONLY', 'HYBRID_UNCLEAR_FULL'] as const;
const SOURCE_ROOT = resolve(
  'docs/experiments/dialogue-three-reference-paragraph-summary-15-2026-09-07/artifacts',
);
const PAIRED_MANIFEST_PATH = resolve(
  'docs/experiments/dialogue-three-reference-followup-quality-42-2026-09-08/artifacts/target-manifest.json',
);
const EXPERIMENT_ROOT = resolve(
  'docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08',
);
const ARTIFACT_ROOT = resolve(EXPERIMENT_ROOT, 'artifacts');
const GOLD_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/gold-v2');
const PROMPT_ROOT = resolve('packages/pipeline/experiments/dialogue');

const DomainSchema = z.enum(['HUMANITIES', 'SCIENCE', 'SOCIAL']);
type Domain = z.infer<typeof DomainSchema>;
const PipelineSchema = z.enum(PIPELINES);
type Pipeline = z.infer<typeof PipelineSchema>;
const CategorySchema = z.enum(['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY']);
type Category = z.infer<typeof CategorySchema>;
const StatusSchema = z.enum(['PASS', 'UNCLEAR', 'ERROR']);
type Status = z.infer<typeof StatusSchema>;
const ActionSchema = z.enum(['COMPLETE', 'ASK_DIAGNOSTIC', 'ASK_CORRECTIVE']);
type Action = z.infer<typeof ActionSchema>;
const StudentProfileSchema = z.enum(['FAST', 'DELAYED', 'SLOW', 'STUCK']);
type StudentProfile = z.infer<typeof StudentProfileSchema>;
const ResponseModeSchema = z.enum([
  'DIRECT_ANSWER', 'SELF_CORRECTION', 'PARTIAL', 'STILL_UNCERTAIN',
]);
type ResponseMode = z.infer<typeof ResponseModeSchema>;
const QuestionSourceSchema = z.enum(['CONCISE', 'FULL']);
type QuestionSource = z.infer<typeof QuestionSourceSchema>;

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
  text: z.string().min(1).max(700),
}).strict();

const PreviousOutputSchema = z.object({
  status: StatusSchema,
  nextAction: ActionSchema,
  reason: z.string().min(1),
  nextQuestion: QuestionSchema.nullable(),
  studentFeedback: z.string().min(1),
}).passthrough();

const PreviousResultSchema = z.object({
  paragraphId: z.string(),
  category: z.string(),
  condition: z.string(),
  output: PreviousOutputSchema.optional(),
}).passthrough();

const PairedManifestSchema = z.object({
  targets: z.array(z.object({ targetKey: z.string() }).passthrough()),
}).passthrough();

const GeneratedQuestionSchema = z.object({
  outputVersion: z.literal('three-turn-question-v1'),
  status: z.enum(['UNCLEAR', 'ERROR']),
  feedback: z.string().min(1).max(700),
  targetDescription: z.string().min(1).max(700),
  targetAxisIds: z.array(z.string()).min(1).max(2),
  targetRelationIds: z.array(z.string()).max(3),
  question: QuestionSchema,
}).strict();
type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

const StudentAnswerBaseSchema = z.object({
  outputVersion: z.literal('controlled-student-answer-v1'),
  answer: z.string().min(1).max(500),
  responseMode: ResponseModeSchema,
  answerBasis: z.string().min(1).max(500),
}).strict();
type StudentAnswer = z.infer<typeof StudentAnswerBaseSchema>;

const GateEvaluationSchema = z.object({
  outputVersion: z.literal('concise-cumulative-gate-v1'),
  status: StatusSchema,
  nextAction: ActionSchema,
  reason: z.string().min(1).max(1000),
  summaryComplete: z.boolean(),
  originalErrorCorrected: z.boolean().nullable(),
  activeError: z.object({
    description: z.string().min(1).max(700),
    studentEvidence: z.string().min(1).max(300),
  }).strict().nullable(),
  unresolvedAxisIds: z.array(z.string()).max(6),
}).strict();
type GateEvaluation = z.infer<typeof GateEvaluationSchema>;

const JudgeTurnSchema = z.object({
  round: z.number().int().min(1).max(MAX_TURNS),
  questionTargetsUnresolvedCore: z.boolean(),
  questionNonLeading: z.boolean(),
  studentAddsRelevantEvidence: z.boolean(),
  cumulativeSummarySufficient: z.boolean(),
  gateDecisionAppropriate: z.boolean(),
  note: z.string().min(1).max(500),
}).strict();

const PipelineJudgeSchema = z.object({
  outputVersion: z.literal('three-turn-pipeline-pair-judge-v1'),
  evaluations: z.array(z.object({
    candidateId: z.enum(['K1', 'K2']),
    turnsUsed: z.number().int().min(1).max(MAX_TURNS),
    turnEvaluations: z.array(JudgeTurnSchema).min(1).max(MAX_TURNS),
    studentOutcome: z.enum([
      'COMPLETE', 'IMPROVED_UNRESOLVED', 'NO_MEANINGFUL_PROGRESS', 'ERROR_REMAINS',
    ]),
    finalDecisionAppropriate: z.boolean(),
    initialErrorCorrected: z.boolean().nullable(),
    prematurePass: z.boolean(),
    overHeld: z.boolean(),
    targetedQuestionCount: z.number().int().min(0).max(MAX_TURNS),
    nonLeadingQuestionCount: z.number().int().min(0).max(MAX_TURNS),
    solutionLeakageCount: z.number().int().min(0).max(MAX_TURNS),
    redundantQuestionCount: z.number().int().min(0).max(MAX_TURNS),
    overallScore: z.number().int().min(1).max(5),
    note: z.string().min(1).max(900),
  }).strict()).length(2),
  winner: z.enum(['K1', 'K2', 'TIE']),
  winnerReason: z.string().min(1).max(900),
}).strict();
type PipelineJudge = z.infer<typeof PipelineJudgeSchema>;

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
  readonly initialConciseOutput: z.infer<typeof PreviousOutputSchema>;
  readonly studentProfile: StudentProfile;
}

interface CallRecordBase {
  readonly callKey: string;
  readonly targetKey: string;
  readonly round?: number;
  readonly branchKeys: readonly string[];
  readonly durationMs: number;
  readonly usage: Usage;
  readonly observedCostUsd: number;
  readonly rawOutput?: string;
  readonly error?: string;
}

interface QuestionCallRecord extends CallRecordBase {
  readonly status: 'UNCLEAR' | 'ERROR';
  readonly questionSource: QuestionSource;
  readonly output?: GeneratedQuestion;
}

interface StudentCallRecord extends CallRecordBase {
  readonly requestedResponseMode: ResponseMode;
  readonly output?: StudentAnswer;
}

interface GateCallRecord extends CallRecordBase {
  readonly observedStatus: string;
  readonly contractPassed: boolean;
  readonly output?: GateEvaluation;
}

interface JudgeCallRecord extends CallRecordBase {
  readonly candidateMap: Readonly<Record<string, Pipeline>>;
  readonly output?: PipelineJudge;
}

interface TurnState {
  readonly round: number;
  readonly question: GeneratedQuestion;
  readonly studentAnswer: StudentAnswer;
  readonly gate: GateEvaluation;
}

interface BranchState {
  readonly branchKey: string;
  readonly target: TargetCase;
  readonly pipeline: Pipeline;
  status: Status;
  readonly turns: TurnState[];
}

interface Prompts {
  readonly gate: string;
  readonly question: string;
  readonly student: string;
  readonly judge: string;
}

interface PreparedJob {
  readonly callKey: string;
  readonly input: string;
  readonly branch: BranchState;
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

async function loadPrompts(): Promise<Prompts> {
  const [gate, question, student, judge] = await Promise.all([
    readFile(resolve(PROMPT_ROOT, 'three-turn-concise-gate-prompt-v1.md'), 'utf8'),
    readFile(resolve(PROMPT_ROOT, 'three-turn-question-generator-prompt-v1.md'), 'utf8'),
    readFile(resolve(PROMPT_ROOT, 'three-turn-controlled-student-prompt-v1.md'), 'utf8'),
    readFile(resolve(PROMPT_ROOT, 'three-turn-pipeline-judge-prompt-v1.md'), 'utf8'),
  ]);
  return { gate: gate.trim(), question: question.trim(), student: student.trim(), judge: judge.trim() };
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

function totalCost(
  questions: readonly QuestionCallRecord[],
  students: readonly StudentCallRecord[],
  gates: readonly GateCallRecord[],
  judges: readonly JudgeCallRecord[],
): number {
  return recordsCost(questions) + recordsCost(students) + recordsCost(gates) + recordsCost(judges);
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

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function callKey(stage: string, input: string): string {
  return hash(`${stage}\n${input}`);
}

function branchKey(targetKey: string, pipeline: Pipeline): string {
  return `${targetKey}|${pipeline}`;
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

function assignProfiles(rawTargets: Omit<TargetCase, 'studentProfile'>[]): TargetCase[] {
  const profileByKey = new Map<string, StudentProfile>();
  for (const category of CategorySchema.options) {
    const group = rawTargets.filter((target) => target.category === category)
      .sort((left, right) => hash(left.targetKey).localeCompare(hash(right.targetKey)));
    group.forEach((target, index) => {
      const bucket = index % 10;
      const profile: StudentProfile = bucket <= 2 ? 'FAST' : bucket <= 6 ? 'DELAYED' :
        bucket <= 8 ? 'SLOW' : 'STUCK';
      profileByKey.set(target.targetKey, profile);
    });
  }
  return rawTargets.map((target) => ({
    ...target,
    studentProfile: profileByKey.get(target.targetKey) ?? 'DELAYED',
  }));
}

function responsePlan(profile: StudentProfile): readonly ('FULL' | 'PARTIAL' | 'UNCERTAIN')[] {
  if (profile === 'FAST') return ['FULL', 'FULL', 'FULL'];
  if (profile === 'DELAYED') return ['PARTIAL', 'FULL', 'FULL'];
  if (profile === 'SLOW') return ['UNCERTAIN', 'PARTIAL', 'FULL'];
  return ['UNCERTAIN', 'UNCERTAIN', 'PARTIAL'];
}

function requestedResponseMode(target: TargetCase, status: Status, round: number): ResponseMode {
  const level = responsePlan(target.studentProfile)[round - 1];
  if (level === undefined) throw new Error(`지원하지 않는 round: ${round}`);
  if (level === 'PARTIAL') return 'PARTIAL';
  if (level === 'UNCERTAIN') return 'STILL_UNCERTAIN';
  return status === 'ERROR' ? 'SELF_CORRECTION' : 'DIRECT_ANSWER';
}

async function loadTargets(): Promise<TargetCase[]> {
  const fixtureRecords = z.array(FixtureRecordSchema).parse(await readJson(
    resolve(SOURCE_ROOT, 'response-fixtures.json'),
  ));
  const previousResults = z.array(PreviousResultSchema).parse(await readJson(
    resolve(SOURCE_ROOT, 'results.json'),
  ));
  const pairedManifest = PairedManifestSchema.parse(await readJson(PAIRED_MANIFEST_PATH));
  const selectedKeys = new Set(pairedManifest.targets.map((item) => item.targetKey));
  const fixtureMap = new Map(fixtureRecords.map((record) => [record.paragraphId, record]));
  const rawTargets: Omit<TargetCase, 'studentProfile'>[] = [];
  for (const targetKeyValue of selectedKeys) {
    const separator = targetKeyValue.lastIndexOf('|');
    if (separator < 1) throw new Error(`잘못된 targetKey: ${targetKeyValue}`);
    const paragraphId = targetKeyValue.slice(0, separator);
    const category = CategorySchema.parse(targetKeyValue.slice(separator + 1));
    const fixtureRecord = fixtureMap.get(paragraphId);
    const fixture = fixtureRecord?.responses.find((item) => item.category === category);
    const concise = previousResults.find((item) => item.paragraphId === paragraphId &&
      item.category === category && item.condition === 'CONCISE_GOLD');
    if (fixtureRecord === undefined || fixture === undefined || concise?.output === undefined) {
      throw new Error(`${targetKeyValue}: 소스 자료 없음`);
    }
    if (concise.output.status === 'PASS') throw new Error(`${targetKeyValue}: 간결 최초 PASS`);
    const gold = ParagraphDiagnosticGoldSchema.parse(await readJson(
      resolve(GOLD_ROOT, `${paragraphId}.json`),
    ));
    rawTargets.push({
      targetKey: targetKeyValue,
      paragraphId,
      domain: fixtureRecord.domain,
      category,
      initialStatus: z.enum(['UNCLEAR', 'ERROR']).parse(concise.output.status),
      fixture,
      gold,
      initialConciseOutput: concise.output,
    });
  }
  rawTargets.sort((left, right) => hash(left.targetKey).localeCompare(hash(right.targetKey)));
  if (rawTargets.length !== 42) throw new Error(`대응 표본 ${rawTargets.length}/42`);
  return assignProfiles(rawTargets);
}

function activeDecision(branch: BranchState) {
  const lastTurn = branch.turns.at(-1);
  if (lastTurn === undefined) {
    return {
      status: branch.target.initialStatus,
      reason: branch.target.initialConciseOutput.reason,
      studentFeedback: branch.target.initialConciseOutput.studentFeedback,
      activeError: branch.target.initialStatus === 'ERROR'
        ? { description: branch.target.initialConciseOutput.reason }
        : null,
      unresolvedAxisIds: branch.target.initialStatus === 'UNCLEAR'
        ? branch.target.gold.centralAxes.map((axis) => axis.id)
        : [],
    };
  }
  return {
    status: lastTurn.gate.status,
    reason: lastTurn.gate.reason,
    studentFeedback: '',
    activeError: lastTurn.gate.activeError,
    unresolvedAxisIds: lastTurn.gate.unresolvedAxisIds,
  };
}

function visibleHistory(branch: BranchState) {
  return branch.turns.map((turn) => ({
    round: turn.round,
    tutorFeedback: turn.question.feedback,
    tutorQuestion: turn.question.question,
    studentAnswer: turn.studentAnswer.answer,
    gateStatus: turn.gate.status,
  }));
}

function questionSource(branch: BranchState): QuestionSource {
  if (branch.status === 'ERROR') return 'CONCISE';
  return branch.pipeline === 'CONCISE_ONLY' ? 'CONCISE' : 'FULL';
}

function buildQuestionInput(branch: BranchState): { input: string; source: QuestionSource } {
  if (branch.status === 'PASS') throw new Error(`${branch.branchKey}: PASS 질문 생성 시도`);
  const source = questionSource(branch);
  const decision = activeDecision(branch);
  const input = JSON.stringify({
    task: branch.status === 'ERROR' ? 'CREATE_CORRECTIVE_QUESTION' : 'CREATE_DIAGNOSTIC_QUESTION',
    paragraphText: branch.target.gold.paragraphText,
    initialStudentSummary: branch.target.fixture.text,
    cumulativeDialogue: visibleHistory(branch),
    upstreamDecision: decision,
    referencePacket: source === 'CONCISE' ? conciseGold(branch.target.gold) : branch.target.gold,
  });
  return { input, source };
}

function validateQuestion(output: GeneratedQuestion, branch: BranchState): void {
  if (output.status !== branch.status) throw new Error('질문 상태 불일치');
  const expectedType = branch.status === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC';
  if (output.question.type !== expectedType) throw new Error('질문 유형 불일치');
  const axisIds = new Set(branch.target.gold.centralAxes.map((axis) => axis.id));
  if (output.targetAxisIds.some((id) => !axisIds.has(id))) throw new Error('존재하지 않는 축 ID');
  const relationIds = new Set(branch.target.gold.coreRelations.map((relation) => relation.id));
  if (output.targetRelationIds.some((id) => !relationIds.has(id))) {
    throw new Error('존재하지 않는 관계 ID');
  }
}

function buildStudentInput(
  branch: BranchState,
  round: number,
  question: GeneratedQuestion,
  mode: ResponseMode,
): string {
  return JSON.stringify({
    paragraphText: branch.target.gold.paragraphText,
    initialStudentSummary: branch.target.fixture.text,
    studentProfile: branch.target.studentProfile,
    profilePlan: responsePlan(branch.target.studentProfile),
    currentRound: round,
    requestedResponseMode: mode,
    previousDialogue: visibleHistory(branch),
    tutorFeedback: question.feedback,
    tutorQuestion: question.question,
  });
}

function studentSchema(mode: ResponseMode) {
  return z.object({
    outputVersion: z.literal('controlled-student-answer-v1'),
    answer: z.string().min(1).max(500),
    responseMode: z.literal(mode),
    answerBasis: z.string().min(1).max(500),
  }).strict();
}

function buildGateInput(
  branch: BranchState,
  round: number,
  question: GeneratedQuestion,
  studentAnswer: StudentAnswer,
): string {
  return JSON.stringify({
    task: 'CUMULATIVE_CONCISE_GATE_ONLY',
    paragraphText: branch.target.gold.paragraphText,
    conciseGold: conciseGold(branch.target.gold),
    initialStudentSummary: branch.target.fixture.text,
    initialCase: {
      category: branch.target.category,
      initialStatus: branch.target.initialStatus,
      initialDecisionReason: branch.target.initialConciseOutput.reason,
    },
    dialogue: [
      ...visibleHistory(branch),
      {
        round,
        tutorFeedback: question.feedback,
        tutorQuestion: question.question,
        studentAnswer: studentAnswer.answer,
      },
    ],
  });
}

function validateGate(output: GateEvaluation, target: TargetCase): void {
  const expectedAction: Record<Status, Action> = {
    PASS: 'COMPLETE', UNCLEAR: 'ASK_DIAGNOSTIC', ERROR: 'ASK_CORRECTIVE',
  };
  if (output.nextAction !== expectedAction[output.status]) throw new Error('status-action 대응 위반');
  const axisIds = new Set(target.gold.centralAxes.map((axis) => axis.id));
  if (output.unresolvedAxisIds.some((id) => !axisIds.has(id))) throw new Error('존재하지 않는 미해결 축');
  if (target.initialStatus === 'ERROR' && output.originalErrorCorrected === null) {
    throw new Error('최초 오류 교정 여부 누락');
  }
  if (target.initialStatus !== 'ERROR' && output.originalErrorCorrected !== null) {
    throw new Error('비오류 사례의 교정 여부는 null이어야 함');
  }
  if (output.status === 'PASS') {
    if (!output.summaryComplete || output.activeError !== null || output.unresolvedAxisIds.length > 0) {
      throw new Error('PASS 계약 위반');
    }
  } else if (output.status === 'UNCLEAR') {
    if (output.summaryComplete || output.activeError !== null || output.unresolvedAxisIds.length === 0) {
      throw new Error('UNCLEAR 계약 위반');
    }
  } else if (output.summaryComplete || output.activeError === null) {
    throw new Error('ERROR 계약 위반');
  }
}

function groupPreparedJobs(jobs: readonly PreparedJob[]): Map<string, PreparedJob[]> {
  const groups = new Map<string, PreparedJob[]>();
  for (const job of jobs) {
    const group = groups.get(job.callKey) ?? [];
    group.push(job);
    groups.set(job.callKey, group);
  }
  return groups;
}

async function runQuestionCall(
  client: OpenAI,
  prompt: string,
  representative: PreparedJob,
  branches: readonly PreparedJob[],
): Promise<QuestionCallRecord> {
  const prepared = buildQuestionInput(representative.branch);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: representative.input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 1_400,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'three_turn_question', strict: true,
        schema: z.toJSONSchema(GeneratedQuestionSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = GeneratedQuestionSchema.parse(JSON.parse(rawOutput));
    validateQuestion(output, representative.branch);
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      status: z.enum(['UNCLEAR', 'ERROR']).parse(representative.branch.status),
      questionSource: prepared.source,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      status: z.enum(['UNCLEAR', 'ERROR']).parse(representative.branch.status),
      questionSource: prepared.source,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runStudentCall(
  client: OpenAI,
  prompt: string,
  representative: PreparedJob,
  branches: readonly PreparedJob[],
  mode: ResponseMode,
): Promise<StudentCallRecord> {
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const schema = studentSchema(mode);
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: representative.input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 1_000,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'controlled_student_answer', strict: true,
        schema: z.toJSONSchema(schema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = schema.parse(JSON.parse(rawOutput));
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      requestedResponseMode: mode,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      requestedResponseMode: mode,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runGateCall(
  client: OpenAI,
  prompt: string,
  representative: PreparedJob,
  branches: readonly PreparedJob[],
): Promise<GateCallRecord> {
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: representative.input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 1_800,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'concise_cumulative_gate', strict: true,
        schema: z.toJSONSchema(GateEvaluationSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = GateEvaluationSchema.parse(JSON.parse(rawOutput));
    validateGate(output, representative.branch.target);
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      observedStatus: output.status,
      contractPassed: true,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      callKey: representative.callKey,
      targetKey: representative.branch.target.targetKey,
      round: representative.branch.turns.length + 1,
      branchKeys: branches.map((job) => job.branch.branchKey),
      observedStatus: 'CALL_ERROR',
      contractPassed: false,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function judgeInput(target: TargetCase, branches: readonly BranchState[]) {
  const ordered = [...branches].sort((left, right) =>
    hash(`${target.targetKey}|judge|${left.pipeline}`)
      .localeCompare(hash(`${target.targetKey}|judge|${right.pipeline}`)));
  const candidateMap: Record<string, Pipeline> = {};
  const candidates = ordered.map((branch, index) => {
    const candidateId = `K${index + 1}`;
    candidateMap[candidateId] = branch.pipeline;
    return {
      candidateId,
      turns: branch.turns.map((turn) => ({
        round: turn.round,
        tutorFeedback: turn.question.feedback,
        tutorQuestion: turn.question.question,
        studentResponseMode: turn.studentAnswer.responseMode,
        studentAnswer: turn.studentAnswer.answer,
        gateDecision: {
          status: turn.gate.status,
          reason: turn.gate.reason,
          originalErrorCorrected: turn.gate.originalErrorCorrected,
          unresolvedAxisIds: turn.gate.unresolvedAxisIds,
        },
      })),
      terminalStatus: branch.status,
    };
  });
  return {
    candidateMap,
    input: JSON.stringify({
      paragraphText: target.gold.paragraphText,
      referenceGold: target.gold,
      initialStudentSummary: target.fixture.text,
      initialCase: {
        category: target.category,
        initialStatus: target.initialStatus,
        expectedFocus: target.fixture.expectedFocus,
        targetRelationIds: target.fixture.targetRelationIds,
      },
      controlledStudentProfile: {
        profile: target.studentProfile,
        responsePlan: responsePlan(target.studentProfile),
      },
      candidates,
    }),
  };
}

async function runJudgeCall(
  client: OpenAI,
  prompt: string,
  target: TargetCase,
  branches: readonly BranchState[],
): Promise<JudgeCallRecord> {
  const prepared = judgeInput(target, branches);
  const key = callKey('trajectory-judge-v1', prepared.input);
  const started = Date.now();
  let usage = emptyUsage();
  let rawOutput: string | undefined;
  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: prepared.input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 3_000,
      store: false,
      text: { format: {
        type: 'json_schema', name: 'three_turn_pipeline_pair_judge', strict: true,
        schema: z.toJSONSchema(PipelineJudgeSchema),
      } },
    }, { timeout: TIMEOUT_MS, maxRetries: 0 });
    usage = usageFromResponse(response);
    rawOutput = response.output_text;
    const output = PipelineJudgeSchema.parse(JSON.parse(rawOutput));
    const expectedIds = Object.keys(prepared.candidateMap).sort();
    const actualIds = output.evaluations.map((item) => item.candidateId).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) throw new Error('후보 ID 불일치');
    for (const evaluation of output.evaluations) {
      const pipeline = prepared.candidateMap[evaluation.candidateId];
      const branch = branches.find((item) => item.pipeline === pipeline);
      if (branch === undefined || evaluation.turnsUsed !== branch.turns.length ||
        evaluation.turnEvaluations.length !== branch.turns.length) {
        throw new Error('심사 턴 수 불일치');
      }
    }
    return {
      callKey: key,
      targetKey: target.targetKey,
      branchKeys: branches.map((branch) => branch.branchKey),
      candidateMap: prepared.candidateMap,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      output,
      rawOutput,
    };
  } catch (error) {
    return {
      callKey: key,
      targetKey: target.targetKey,
      branchKeys: branches.map((branch) => branch.branchKey),
      candidateMap: prepared.candidateMap,
      durationMs: Date.now() - started,
      usage,
      observedCostUsd: costFromUsage(usage),
      ...(rawOutput === undefined ? {} : { rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function loadRecords<T>(canonical: string, partial: string, resume: boolean): Promise<T[]> {
  if (!resume) return [];
  return z.array(z.custom<T>()).parse(await readJsonOr(partial, await readJsonOr(canonical, [])));
}

function judgeEvaluationLookup(records: readonly JudgeCallRecord[]) {
  const lookup = new Map<string, PipelineJudge['evaluations'][number]>();
  for (const record of records) {
    if (record.output === undefined) continue;
    for (const evaluation of record.output.evaluations) {
      const pipeline = record.candidateMap[evaluation.candidateId];
      if (pipeline !== undefined) lookup.set(branchKey(record.targetKey, pipeline), evaluation);
    }
  }
  return lookup;
}

function winnerCounts(records: readonly JudgeCallRecord[]) {
  const counts: Record<Pipeline | 'TIE', number> = {
    CONCISE_ONLY: 0, HYBRID_UNCLEAR_FULL: 0, TIE: 0,
  };
  for (const record of records) {
    const winner = record.output?.winner;
    if (winner === undefined) continue;
    if (winner === 'TIE') counts.TIE++;
    else {
      const pipeline = record.candidateMap[winner];
      if (pipeline !== undefined) counts[pipeline]++;
    }
  }
  return counts;
}

function allocatedCostForPipeline(
  pipeline: Pipeline,
  records: readonly CallRecordBase[],
): number {
  return records.reduce((sum, record) => {
    const matchingBranches = record.branchKeys.filter((key) => key.endsWith(`|${pipeline}`)).length;
    if (matchingBranches === 0 || record.branchKeys.length === 0) return sum;
    return sum + record.observedCostUsd * matchingBranches / record.branchKeys.length;
  }, 0);
}

function winnersByCategory(targets: readonly TargetCase[], records: readonly JudgeCallRecord[]) {
  return Object.fromEntries(CategorySchema.options.map((category) => {
    const keys = new Set(targets.filter((target) => target.category === category)
      .map((target) => target.targetKey));
    return [category, winnerCounts(records.filter((record) => keys.has(record.targetKey)))];
  }));
}

function buildSummary(
  targets: readonly TargetCase[],
  branches: readonly BranchState[],
  questions: readonly QuestionCallRecord[],
  students: readonly StudentCallRecord[],
  gates: readonly GateCallRecord[],
  judges: readonly JudgeCallRecord[],
) {
  const judgeLookup = judgeEvaluationLookup(judges);
  const summarizeBranches = (branchSet: readonly BranchState[]) => {
    const evaluations = branchSet.flatMap((branch) => {
      const evaluation = judgeLookup.get(branch.branchKey);
      return evaluation === undefined ? [] : [evaluation];
    });
    const errorBranches = branchSet.filter((branch) => branch.target.initialStatus === 'ERROR');
    const logicalTurns = branchSet.flatMap((branch) => branch.turns);
    return {
      branches: branchSet.length,
      logicalTurns: logicalTurns.length,
      averageTurnsUsed: mean(branchSet.map((branch) => branch.turns.length)),
      observedPassByRound: Object.fromEntries([1, 2, 3].map((round) => [
        `round${round}`,
        branchSet.filter((branch) => branch.turns.length === round && branch.status === 'PASS').length,
      ])),
      terminalStatuses: Object.fromEntries(StatusSchema.options.map((status) => [
        status,
        branchSet.filter((branch) => branch.status === status).length,
      ])),
      studentResponseModes: Object.fromEntries(ResponseModeSchema.options.map((mode) => [
        mode,
        logicalTurns.filter((turn) => turn.studentAnswer.responseMode === mode).length,
      ])),
      initialErrorsCorrectedByGate: errorBranches.filter((branch) =>
        branch.turns.at(-1)?.gate.originalErrorCorrected === true).length,
      judge: {
        judged: evaluations.length,
        completeStudentOutcome: evaluations.filter((item) => item.studentOutcome === 'COMPLETE').length,
        improvedUnresolved: evaluations.filter((item) =>
          item.studentOutcome === 'IMPROVED_UNRESOLVED').length,
        noMeaningfulProgress: evaluations.filter((item) =>
          item.studentOutcome === 'NO_MEANINGFUL_PROGRESS').length,
        errorRemains: evaluations.filter((item) => item.studentOutcome === 'ERROR_REMAINS').length,
        finalDecisionAppropriate: evaluations.filter((item) => item.finalDecisionAppropriate).length,
        prematurePass: evaluations.filter((item) => item.prematurePass).length,
        overHeld: evaluations.filter((item) => item.overHeld).length,
        targetedQuestions: evaluations.reduce((sum, item) => sum + item.targetedQuestionCount, 0),
        nonLeadingQuestions: evaluations.reduce((sum, item) => sum + item.nonLeadingQuestionCount, 0),
        solutionLeakageTurns: evaluations.reduce((sum, item) => sum + item.solutionLeakageCount, 0),
        redundantQuestions: evaluations.reduce((sum, item) => sum + item.redundantQuestionCount, 0),
        averageOverallScore: mean(evaluations.map((item) => item.overallScore)),
      },
    };
  };
  const byPipeline = Object.fromEntries(PIPELINES.map((pipeline) => {
    const branchSet = branches.filter((branch) => branch.pipeline === pipeline);
    return [pipeline, {
      ...summarizeBranches(branchSet),
      allocatedCostUsd: {
        question: allocatedCostForPipeline(pipeline, questions),
        student: allocatedCostForPipeline(pipeline, students),
        gate: allocatedCostForPipeline(pipeline, gates),
        judge: allocatedCostForPipeline(pipeline, judges),
        operational: allocatedCostForPipeline(pipeline, questions) +
          allocatedCostForPipeline(pipeline, students) + allocatedCostForPipeline(pipeline, gates),
        totalIncludingJudge: allocatedCostForPipeline(pipeline, questions) +
          allocatedCostForPipeline(pipeline, students) + allocatedCostForPipeline(pipeline, gates) +
          allocatedCostForPipeline(pipeline, judges),
      },
    }];
  }));
  const byCategory = Object.fromEntries(CategorySchema.options.map((category) => [
    category,
    Object.fromEntries(PIPELINES.map((pipeline) => [
      pipeline,
      summarizeBranches(branches.filter((branch) =>
        branch.pipeline === pipeline && branch.target.category === category)),
    ])),
  ]));
  const questionCost = recordsCost(questions);
  const studentCost = recordsCost(students);
  const gateCost = recordsCost(gates);
  const judgeCost = recordsCost(judges);
  return {
    experiment: 'dialogue-three-turn-concise-vs-hybrid-42-v1',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    maxFollowupTurns: MAX_TURNS,
    repeatsPerTrajectory: 1,
    targetCases: targets.length,
    targetByInitialStatus: {
      UNCLEAR: targets.filter((target) => target.initialStatus === 'UNCLEAR').length,
      ERROR: targets.filter((target) => target.initialStatus === 'ERROR').length,
    },
    studentProfiles: Object.fromEntries(StudentProfileSchema.options.map((profile) => [
      profile,
      targets.filter((target) => target.studentProfile === profile).length,
    ])),
    physicalCalls: {
      questionGeneration: questions.length,
      controlledStudent: students.length,
      conciseGate: gates.length,
      trajectoryPairJudge: judges.length,
      total: questions.length + students.length + gates.length + judges.length,
    },
    sharedCallSavings: branches.reduce((sum, branch) => sum + branch.turns.length, 0) * 3 -
      questions.length - students.length - gates.length,
    budget: {
      capUsd: COST_CAP_USD,
      guardUsd: COST_GUARD_USD,
      questionCostUsd: questionCost,
      studentCostUsd: studentCost,
      gateCostUsd: gateCost,
      judgeCostUsd: judgeCost,
      totalObservedCostUsd: questionCost + studentCost + gateCost + judgeCost,
    },
    priceSnapshot: { date: '2026-09-08', perMillionTokens: PRICE_PER_MILLION },
    trajectoryWinners: winnerCounts(judges),
    winnersByCategory: winnersByCategory(targets, judges),
    byPipeline,
    byCategory,
  };
}

function rawReport(summary: ReturnType<typeof buildSummary>): string {
  const rows = PIPELINES.map((pipeline) => {
    const item = summary.byPipeline[pipeline]!;
    return `| ${pipeline} | ${item.terminalStatuses.PASS}/${item.branches} | ` +
      `${item.judge.completeStudentOutcome}/${item.judge.judged} | ` +
      `${item.judge.finalDecisionAppropriate}/${item.judge.judged} | ` +
      `${item.averageTurnsUsed.toFixed(2)} | ${item.judge.targetedQuestions}/${item.logicalTurns} | ` +
      `${item.judge.averageOverallScore.toFixed(2)} |`;
  });
  return `# 간결 단독·혼합 파이프라인 최대 3턴 비교 원시 보고서\n\n` +
    `- 모델: \`${summary.model}\`, reasoning effort \`${summary.effort}\`\n` +
    `- 대응 표본: ${summary.targetCases}개\n` +
    `- 물리 호출: ${summary.physicalCalls.total}회\n` +
    `- 관측 비용: $${summary.budget.totalObservedCostUsd.toFixed(4)} / 하드캡 $${summary.budget.capUsd.toFixed(2)}\n\n` +
    `| 파이프라인 | 관측 PASS | 심사상 완성 | 최종 판정 적절 | 평균 턴 | 표적 질문 | 품질 |\n` +
    `|---|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n`;
}

async function main(): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const targets = await loadTargets();
  const prompts = await loadPrompts();
  const branches: BranchState[] = targets.flatMap((target) => PIPELINES.map((pipeline) => ({
    branchKey: branchKey(target.targetKey, pipeline),
    target,
    pipeline,
    status: target.initialStatus,
    turns: [],
  })));

  await writeJson(resolve(ARTIFACT_ROOT, 'target-manifest.json'), {
    targetCount: targets.length,
    pipelines: PIPELINES,
    maxTurns: MAX_TURNS,
    targets: targets.map((target) => ({
      targetKey: target.targetKey,
      paragraphId: target.paragraphId,
      domain: target.domain,
      category: target.category,
      initialStatus: target.initialStatus,
      initialStudentSummary: target.fixture.text,
      studentProfile: target.studentProfile,
      responsePlan: responsePlan(target.studentProfile),
    })),
  });

  if (process.argv.includes('--dry-run')) {
    const initialShared = targets.filter((target) => target.initialStatus === 'ERROR').length;
    const firstRoundUnique = targets.length * PIPELINES.length - initialShared;
    const maxPhysicalCalls = firstRoundUnique * 3 +
      targets.length * PIPELINES.length * 3 * (MAX_TURNS - 1) + targets.length;
    process.stdout.write(`dry-run targets=${targets.length} branches=${branches.length} ` +
      `maxTurns=${MAX_TURNS} maxPhysicalCalls=${maxPhysicalCalls} cap=$${COST_CAP_USD.toFixed(2)}\n`);
    return;
  }

  if (process.env['OPENAI_API_KEY'] === undefined) throw new Error('OPENAI_API_KEY가 설정되지 않았다.');
  const client = new OpenAI({ maxRetries: 0 });
  const resume = process.argv.includes('--resume');
  const questionPath = resolve(ARTIFACT_ROOT, 'question-calls.json');
  const questionPartial = resolve(ARTIFACT_ROOT, 'question-calls.partial.json');
  const studentPath = resolve(ARTIFACT_ROOT, 'student-calls.json');
  const studentPartial = resolve(ARTIFACT_ROOT, 'student-calls.partial.json');
  const gatePath = resolve(ARTIFACT_ROOT, 'gate-calls.json');
  const gatePartial = resolve(ARTIFACT_ROOT, 'gate-calls.partial.json');
  const judgePath = resolve(ARTIFACT_ROOT, 'trajectory-judgments.json');
  const judgePartial = resolve(ARTIFACT_ROOT, 'trajectory-judgments.partial.json');

  const questionCalls = await loadRecords<QuestionCallRecord>(questionPath, questionPartial, resume);
  const studentCalls = await loadRecords<StudentCallRecord>(studentPath, studentPartial, resume);
  const gateCalls = await loadRecords<GateCallRecord>(gatePath, gatePartial, resume);
  const judgeCalls = await loadRecords<JudgeCallRecord>(judgePath, judgePartial, resume);

  for (let round = 1; round <= MAX_TURNS; round++) {
    const active = branches.filter((branch) => branch.status !== 'PASS' && branch.turns.length === round - 1);
    if (active.length === 0) break;

    const questionJobs: PreparedJob[] = active.map((branch) => {
      const prepared = buildQuestionInput(branch);
      return { callKey: callKey('question-v1', prepared.input), input: prepared.input, branch };
    });
    const questionGroups = groupPreparedJobs(questionJobs);
    const existingQuestionKeys = new Set(questionCalls.map((record) => record.callKey));
    const missingQuestionGroups = [...questionGroups.values()].filter((group) => {
      const representative = group[0];
      return representative !== undefined && !existingQuestionKeys.has(representative.callKey);
    });
    for (let index = 0; index < missingQuestionGroups.length; index += CONCURRENCY) {
      const batch = missingQuestionGroups.slice(index, index + CONCURRENCY);
      assertBudget(totalCost(questionCalls, studentCalls, gateCalls, judgeCalls), batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) return 0;
        return conservativeCallCost(
          Buffer.byteLength(prompts.question) + Buffer.byteLength(representative.input), 1_400,
        );
      }));
      questionCalls.push(...await Promise.all(batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) throw new Error('빈 질문 그룹');
        return runQuestionCall(client, prompts.question, representative, group);
      })));
      await writeJson(questionPartial, questionCalls);
      process.stdout.write(`round${round} question ${questionCalls.length} physical totalCost=` +
        `$${totalCost(questionCalls, studentCalls, gateCalls, judgeCalls).toFixed(4)}\n`);
    }
    const questionMap = new Map(questionCalls.map((record) => [record.callKey, record]));
    if (questionJobs.some((job) => questionMap.get(job.callKey)?.output === undefined)) {
      throw new Error(`round${round}: 질문 생성 실패 존재`);
    }

    const studentJobs: PreparedJob[] = questionJobs.map((questionJob) => {
      const question = questionMap.get(questionJob.callKey)?.output;
      if (question === undefined) throw new Error('질문 출력 없음');
      const mode = requestedResponseMode(questionJob.branch.target, questionJob.branch.status, round);
      const input = buildStudentInput(questionJob.branch, round, question, mode);
      return { callKey: callKey(`student-v1|${mode}`, input), input, branch: questionJob.branch };
    });
    const studentGroups = groupPreparedJobs(studentJobs);
    const existingStudentKeys = new Set(studentCalls.map((record) => record.callKey));
    const missingStudentGroups = [...studentGroups.values()].filter((group) => {
      const representative = group[0];
      return representative !== undefined && !existingStudentKeys.has(representative.callKey);
    });
    for (let index = 0; index < missingStudentGroups.length; index += CONCURRENCY) {
      const batch = missingStudentGroups.slice(index, index + CONCURRENCY);
      assertBudget(totalCost(questionCalls, studentCalls, gateCalls, judgeCalls), batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) return 0;
        return conservativeCallCost(
          Buffer.byteLength(prompts.student) + Buffer.byteLength(representative.input), 1_000,
        );
      }));
      studentCalls.push(...await Promise.all(batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) throw new Error('빈 학생 그룹');
        const mode = requestedResponseMode(
          representative.branch.target, representative.branch.status, round,
        );
        return runStudentCall(client, prompts.student, representative, group, mode);
      })));
      await writeJson(studentPartial, studentCalls);
      process.stdout.write(`round${round} student ${studentCalls.length} physical totalCost=` +
        `$${totalCost(questionCalls, studentCalls, gateCalls, judgeCalls).toFixed(4)}\n`);
    }
    const studentMap = new Map(studentCalls.map((record) => [record.callKey, record]));
    if (studentJobs.some((job) => studentMap.get(job.callKey)?.output === undefined)) {
      throw new Error(`round${round}: 학생 응답 실패 존재`);
    }

    const gateJobs: PreparedJob[] = studentJobs.map((studentJob) => {
      const questionJob = questionJobs.find((job) => job.branch.branchKey === studentJob.branch.branchKey);
      const question = questionJob === undefined ? undefined : questionMap.get(questionJob.callKey)?.output;
      const studentAnswer = studentMap.get(studentJob.callKey)?.output;
      if (question === undefined || studentAnswer === undefined) throw new Error('게이트 입력 자료 없음');
      const input = buildGateInput(studentJob.branch, round, question, studentAnswer);
      return { callKey: callKey('concise-gate-v1', input), input, branch: studentJob.branch };
    });
    const gateGroups = groupPreparedJobs(gateJobs);
    const existingGateKeys = new Set(gateCalls.map((record) => record.callKey));
    const missingGateGroups = [...gateGroups.values()].filter((group) => {
      const representative = group[0];
      return representative !== undefined && !existingGateKeys.has(representative.callKey);
    });
    for (let index = 0; index < missingGateGroups.length; index += CONCURRENCY) {
      const batch = missingGateGroups.slice(index, index + CONCURRENCY);
      assertBudget(totalCost(questionCalls, studentCalls, gateCalls, judgeCalls), batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) return 0;
        return conservativeCallCost(
          Buffer.byteLength(prompts.gate) + Buffer.byteLength(representative.input), 1_800,
        );
      }));
      gateCalls.push(...await Promise.all(batch.map((group) => {
        const representative = group[0];
        if (representative === undefined) throw new Error('빈 게이트 그룹');
        return runGateCall(client, prompts.gate, representative, group);
      })));
      await writeJson(gatePartial, gateCalls);
      process.stdout.write(`round${round} gate ${gateCalls.length} physical totalCost=` +
        `$${totalCost(questionCalls, studentCalls, gateCalls, judgeCalls).toFixed(4)}\n`);
    }
    const gateMap = new Map(gateCalls.map((record) => [record.callKey, record]));
    if (gateJobs.some((job) => gateMap.get(job.callKey)?.output === undefined)) {
      throw new Error(`round${round}: 간결 게이트 실패 존재`);
    }

    for (const branch of active) {
      const questionJob = questionJobs.find((job) => job.branch.branchKey === branch.branchKey);
      const studentJob = studentJobs.find((job) => job.branch.branchKey === branch.branchKey);
      const gateJob = gateJobs.find((job) => job.branch.branchKey === branch.branchKey);
      const question = questionJob === undefined ? undefined : questionMap.get(questionJob.callKey)?.output;
      const studentAnswer = studentJob === undefined ? undefined : studentMap.get(studentJob.callKey)?.output;
      const gate = gateJob === undefined ? undefined : gateMap.get(gateJob.callKey)?.output;
      if (question === undefined || studentAnswer === undefined || gate === undefined) {
        throw new Error(`${branch.branchKey}: round${round} 재구성 실패`);
      }
      branch.turns.push({ round, question, studentAnswer, gate });
      branch.status = gate.status;
    }
    await writeJson(resolve(ARTIFACT_ROOT, `trajectories-after-round-${round}.json`), branches.map((branch) => ({
      branchKey: branch.branchKey,
      targetKey: branch.target.targetKey,
      pipeline: branch.pipeline,
      status: branch.status,
      turns: branch.turns,
    })));
    const passCount = branches.filter((branch) => branch.status === 'PASS').length;
    process.stdout.write(`round${round} complete active=${active.length} cumulativePass=${passCount}/${branches.length}\n`);
  }

  await writeJson(questionPath, questionCalls);
  await writeJson(studentPath, studentCalls);
  await writeJson(gatePath, gateCalls);
  await writeJson(resolve(ARTIFACT_ROOT, 'trajectories.json'), branches.map((branch) => ({
    branchKey: branch.branchKey,
    targetKey: branch.target.targetKey,
    paragraphId: branch.target.paragraphId,
    domain: branch.target.domain,
    category: branch.target.category,
    pipeline: branch.pipeline,
    studentProfile: branch.target.studentProfile,
    status: branch.status,
    turns: branch.turns,
  })));

  const judgeKeys = new Set(judgeCalls.map((record) => record.targetKey));
  const judgeTargets = targets.filter((target) => !judgeKeys.has(target.targetKey));
  for (let index = 0; index < judgeTargets.length; index += CONCURRENCY) {
    const batch = judgeTargets.slice(index, index + CONCURRENCY);
    assertBudget(totalCost(questionCalls, studentCalls, gateCalls, judgeCalls), batch.map((target) => {
      const targetBranches = branches.filter((branch) => branch.target.targetKey === target.targetKey);
      const prepared = judgeInput(target, targetBranches);
      return conservativeCallCost(
        Buffer.byteLength(prompts.judge) + Buffer.byteLength(prepared.input), 3_000,
      );
    }));
    judgeCalls.push(...await Promise.all(batch.map((target) => {
      const targetBranches = branches.filter((branch) => branch.target.targetKey === target.targetKey);
      return runJudgeCall(client, prompts.judge, target, targetBranches);
    })));
    await writeJson(judgePartial, judgeCalls);
    process.stdout.write(`judge ${judgeCalls.length}/${targets.length} totalCost=` +
      `$${totalCost(questionCalls, studentCalls, gateCalls, judgeCalls).toFixed(4)} errors=` +
      `${judgeCalls.filter((record) => record.output === undefined).length}\n`);
  }
  await writeJson(judgePath, judgeCalls);
  if (judgeCalls.some((record) => record.output === undefined)) throw new Error('최종 궤적 심사 실패 존재');

  const summary = buildSummary(targets, branches, questionCalls, studentCalls, gateCalls, judgeCalls);
  await writeJson(resolve(EXPERIMENT_ROOT, 'SUMMARY.json'), summary);
  await writeFile(resolve(EXPERIMENT_ROOT, 'RAW-REPORT.md'), rawReport(summary));
  process.stdout.write(`complete physicalCalls=${summary.physicalCalls.total} cost=` +
    `$${summary.budget.totalObservedCostUsd.toFixed(4)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
