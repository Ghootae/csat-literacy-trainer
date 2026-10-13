import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  ParagraphDiagnosticGoldSchema,
  TwoStageDialogueEvaluator,
  type DialogueCallMetadata,
  type DialogueHistoryEntry,
  type EvaluationResult,
  type ParagraphDiagnosticGold,
  type StudentRepresentationSnapshot,
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const MAX_QUESTIONS = 3;
const CONCURRENCY = 1;
const GUARD_USD = 0.2;
const PRICE = { input: 2, cachedInput: 0.2, output: 12 } as const;
const ROOT = resolve(
  process.env['DIALOGUE_REGRESSION_OUTPUT_ROOT'] ??
    'docs/experiments/dialogue-selective-router-v2-regression-42-2026-09-09',
);
const ARTIFACT_ROOT = resolve(ROOT, 'artifacts');
const SOURCE_ROOT = resolve('docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08');
const GOLD_ROOT = resolve('packages/pipeline/fixtures/experiments/dialogue/gold-v2');
const STUDENT_PROMPT_PATH = resolve(
  'packages/pipeline/experiments/dialogue/three-turn-controlled-student-prompt-v1.md',
);
const JUDGE_PROMPT_PATH = resolve(
  'packages/pipeline/experiments/dialogue/selective-router-regression-judge-prompt-v2.md',
);

const CategorySchema = z.enum(['PARTIAL', 'EXPLICIT_ERROR', 'TOPIC_ONLY']);
type Category = z.infer<typeof CategorySchema>;
const StudentProfileSchema = z.enum(['FAST', 'DELAYED', 'SLOW', 'STUCK']);
const ResponseModeSchema = z.enum(['DIRECT_ANSWER', 'SELF_CORRECTION', 'PARTIAL', 'STILL_UNCERTAIN']);
type ResponseMode = z.infer<typeof ResponseModeSchema>;

const TargetManifestSchema = z.object({
  targetCount: z.literal(42),
  targets: z.array(z.object({
    targetKey: z.string(),
    paragraphId: z.string(),
    domain: z.enum(['HUMANITIES', 'SCIENCE', 'SOCIAL']),
    category: CategorySchema,
    initialStatus: z.enum(['UNCLEAR', 'ERROR']),
    initialStudentSummary: z.string().min(1),
    studentProfile: StudentProfileSchema,
    responsePlan: z.array(z.enum(['FULL', 'PARTIAL', 'UNCERTAIN'])).length(3),
  })).length(42),
});

const StudentAnswerSchema = z.object({
  outputVersion: z.literal('controlled-student-answer-v1'),
  answer: z.string().min(1).max(500),
  responseMode: ResponseModeSchema,
  answerBasis: z.string().min(1).max(500),
}).strict();
type StudentAnswer = z.infer<typeof StudentAnswerSchema>;

const JudgeSchema = z.object({
  outputVersion: z.literal('selective-router-regression-judge-v2'),
  initialRouteAppropriate: z.boolean(),
  routeSequenceAppropriate: z.boolean(),
  studentOutcome: z.enum(['COMPLETE', 'IMPROVED_UNRESOLVED', 'NO_MEANINGFUL_PROGRESS', 'ERROR_REMAINS']),
  finalDecisionAppropriate: z.boolean(),
  initialErrorCorrected: z.boolean().nullable(),
  prematurePass: z.boolean(),
  overHeld: z.boolean(),
  targetedQuestionCount: z.number().int().min(0).max(3),
  nonLeadingQuestionCount: z.number().int().min(0).max(3),
  solutionLeakageCount: z.number().int().min(0).max(3),
  redundantQuestionCount: z.number().int().min(0).max(3),
  overallScore: z.number().int().min(1).max(5),
  note: z.string().min(1).max(1200),
}).strict();
type Judge = z.infer<typeof JudgeSchema>;

interface Usage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

type ManifestTarget = z.infer<typeof TargetManifestSchema>['targets'][number];
type Target = ManifestTarget & { readonly gold: ParagraphDiagnosticGold };

interface EvaluationRecord {
  readonly turn: number;
  readonly result: EvaluationResult;
  readonly call: DialogueCallMetadata;
  readonly costUsd: number;
}

interface StudentRecord {
  readonly round: number;
  readonly requestedMode: ResponseMode;
  readonly output: StudentAnswer;
  readonly usage: Usage;
  readonly costUsd: number;
  readonly durationMs: number;
}

interface JudgeRecord {
  readonly output: Judge;
  readonly usage: Usage;
  readonly costUsd: number;
  readonly durationMs: number;
}

interface Trajectory {
  readonly targetKey: string;
  readonly paragraphId: string;
  readonly domain: Target['domain'];
  readonly category: Category;
  readonly studentProfile: Target['studentProfile'];
  readonly initialStudentSummary: string;
  readonly evaluations: readonly EvaluationRecord[];
  readonly students: readonly StudentRecord[];
  readonly finalStatus: EvaluationResult['status'];
  readonly judge: JudgeRecord | null;
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

function cost(usage: Usage): number {
  return (
    (usage.inputTokens - usage.cachedInputTokens) * PRICE.input +
    usage.cachedInputTokens * PRICE.cachedInput +
    usage.outputTokens * PRICE.output
  ) / 1_000_000;
}

function callCost(call: DialogueCallMetadata): number {
  const usage = call.usage;
  if (usage === undefined) return 0;
  return cost({
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cacheReadTokens ?? 0,
    outputTokens: usage.outputTokens,
  });
}

class Budget {
  spent: number;
  reserved = 0;

  constructor(
    readonly cap: number,
    initialSpent = 0,
    readonly unrecordedCostAllowance = 0,
  ) {
    this.spent = initialSpent;
  }

  async use<T>(reservation: number, operation: () => Promise<{ value: T; cost: number }>): Promise<T> {
    if (
      this.spent + this.unrecordedCostAllowance + this.reserved + reservation + GUARD_USD >
      this.cap
    ) {
      throw new Error(
        `비용 안전 중단: spent=$${this.spent.toFixed(4)}, ` +
        `unrecorded=$${this.unrecordedCostAllowance.toFixed(4)}, reserved=$${this.reserved.toFixed(4)}, ` +
        `next=$${reservation.toFixed(4)}, guard=$${GUARD_USD.toFixed(2)}, cap=$${this.cap.toFixed(2)}`,
      );
    }
    this.reserved += reservation;
    try {
      const completed = await operation();
      this.spent += completed.cost;
      return completed.value;
    } finally {
      this.reserved -= reservation;
    }
  }
}

function requestedMode(target: Target, round: number, status: EvaluationResult['status']): ResponseMode {
  const planned = target.responsePlan[round - 1];
  if (planned === 'PARTIAL') return 'PARTIAL';
  if (planned === 'UNCERTAIN') return 'STILL_UNCERTAIN';
  return status === 'ERROR' ? 'SELF_CORRECTION' : 'DIRECT_ANSWER';
}

async function loadTargets(): Promise<Target[]> {
  const manifest = TargetManifestSchema.parse(JSON.parse(await readFile(
    resolve(SOURCE_ROOT, 'artifacts/target-manifest.json'),
    'utf8',
  )));
  const selectedKeys = new Set(
    (process.env['DIALOGUE_REGRESSION_TARGET_KEYS'] ?? '').split(',').filter(Boolean),
  );
  const targets = selectedKeys.size === 0
    ? manifest.targets
    : manifest.targets.filter((target) => selectedKeys.has(target.targetKey));
  if (selectedKeys.size > 0 && targets.length !== selectedKeys.size) {
    throw new Error('선택한 회귀 targetKey 중 manifest에 없는 값이 있습니다.');
  }
  return Promise.all(targets.map(async (target) => ({
    ...target,
    gold: ParagraphDiagnosticGoldSchema.parse(JSON.parse(await readFile(
      resolve(GOLD_ROOT, `${target.paragraphId}.json`),
      'utf8',
    ))),
  })));
}

async function generateStudentAnswer(
  client: OpenAI,
  prompt: string,
  target: Target,
  evaluations: readonly EvaluationRecord[],
  students: readonly StudentRecord[],
  mode: ResponseMode,
  budget: Budget,
): Promise<StudentRecord> {
  const current = evaluations.at(-1)!;
  const round = students.length + 1;
  const input = JSON.stringify({
    paragraphText: target.gold.paragraphText,
    initialStudentSummary: target.initialStudentSummary,
    studentProfile: target.studentProfile,
    profilePlan: target.responsePlan,
    currentRound: round,
    requestedResponseMode: mode,
    previousDialogue: students.map((student, index) => ({
      round: student.round,
      tutorFeedback: evaluations[index]!.result.studentFeedback,
      tutorQuestion: evaluations[index]!.result.nextQuestion,
      studentAnswer: student.output.answer,
      gateStatus: evaluations[index + 1]?.result.status ?? null,
    })),
    tutorFeedback: current.result.studentFeedback,
    tutorQuestion: current.result.nextQuestion,
  });
  return budget.use(0.04, async () => {
    const started = Date.now();
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input,
      reasoning: { effort: EFFORT },
      max_output_tokens: 1_000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'controlled_student_answer',
          strict: true,
          schema: z.toJSONSchema(StudentAnswerSchema),
        },
      },
    }, { timeout: 120_000, maxRetries: 2 });
    const usage = usageFromResponse(response);
    const output = StudentAnswerSchema.parse(JSON.parse(response.output_text));
    if (output.responseMode !== mode) throw new Error('통제 학생 응답 모드 불일치');
    const value = { round, requestedMode: mode, output, usage, costUsd: cost(usage), durationMs: Date.now() - started };
    return { value, cost: value.costUsd };
  });
}

function judgeInput(target: Target, trajectory: Omit<Trajectory, 'judge'>): string {
  return JSON.stringify({
    paragraphText: target.gold.paragraphText,
    referenceGold: target.gold,
    initialStudentSummary: target.initialStudentSummary,
    initialCase: {
      category: target.category,
      expectedInitialStatus: target.initialStatus,
    },
    controlledStudentProfile: {
      profile: target.studentProfile,
      responsePlan: target.responsePlan,
    },
    trajectory: {
      initialRoute: trajectory.evaluations[0]?.result.snapshot.diagnosticRoute ?? null,
      turns: trajectory.students.map((student, index) => {
        const before = trajectory.evaluations[index]!;
        const after = trajectory.evaluations[index + 1]!;
        return {
          round: student.round,
          route: before.result.snapshot.diagnosticRoute ?? null,
          tutorFeedback: before.result.studentFeedback,
          tutorQuestion: before.result.nextQuestion,
          studentResponseMode: student.output.responseMode,
          studentAnswer: student.output.answer,
          cumulativeDecision: {
            status: after.result.status,
            reason: after.result.decisionSummary,
            capturedAxisIds: after.result.snapshot.capturedAxisIds ?? [],
            unresolvedAxisIds: after.result.snapshot.unresolvedAxisIds ?? [],
            repairTargetRecovered: after.result.snapshot.repairTargetRecovered ?? false,
            summaryComplete: after.result.snapshot.summaryComplete ?? false,
          },
          gateDecisionAudit: after.call.decisionAudit ?? null,
        };
      }),
      finalStatus: trajectory.finalStatus,
    },
  });
}

async function judgeTrajectory(
  client: OpenAI,
  prompt: string,
  target: Target,
  trajectory: Omit<Trajectory, 'judge'>,
  budget: Budget,
): Promise<JudgeRecord> {
  return budget.use(0.06, async () => {
    const started = Date.now();
    const response = await client.responses.create({
      model: MODEL,
      instructions: prompt,
      input: judgeInput(target, trajectory),
      reasoning: { effort: EFFORT },
      max_output_tokens: 2_400,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'selective_router_regression_judge',
          strict: true,
          schema: z.toJSONSchema(JudgeSchema),
        },
      },
    }, { timeout: 120_000, maxRetries: 2 });
    const usage = usageFromResponse(response);
    const value = {
      output: JudgeSchema.parse(JSON.parse(response.output_text)),
      usage,
      costUsd: cost(usage),
      durationMs: Date.now() - started,
    };
    return { value, cost: value.costUsd };
  });
}

async function runTarget(
  target: Target,
  evaluator: TwoStageDialogueEvaluator,
  client: OpenAI,
  studentPrompt: string,
  judgePrompt: string,
  budget: Budget,
): Promise<Trajectory> {
  const evaluations: EvaluationRecord[] = [];
  const students: StudentRecord[] = [];
  const history: DialogueHistoryEntry[] = [];
  let previousSnapshot: StudentRepresentationSnapshot | undefined;

  for (let turn = 1; turn <= MAX_QUESTIONS + 1; turn += 1) {
    const evaluated = await budget.use(0.12, async () => {
      const value = await evaluator.evaluate({
        gold: target.gold,
        goldVersion: 'paragraph-diagnostic-gold-v2-reviewed-candidate',
        goldHash: createHash('sha256').update(JSON.stringify(target.gold)).digest('hex'),
        initialResponse: target.initialStudentSummary,
        history,
        turn,
        questionsAsked: history.length,
        maxQuestions: MAX_QUESTIONS,
        ...(previousSnapshot === undefined ? {} : { previousSnapshot }),
      });
      return { value, cost: callCost(value.call) };
    });
    evaluations.push({ turn, result: evaluated.result, call: evaluated.call, costUsd: callCost(evaluated.call) });
    previousSnapshot = evaluated.result.snapshot;

    if (evaluated.result.status === 'PASS' || history.length >= MAX_QUESTIONS || evaluated.result.nextQuestion === null) break;
    const mode = requestedMode(target, students.length + 1, evaluated.result.status);
    const student = await generateStudentAnswer(client, studentPrompt, target, evaluations, students, mode, budget);
    students.push(student);
    history.push({
      question: evaluated.result.nextQuestion,
      answer: student.output.answer,
      targetRelationIds: evaluated.result.targetIssue?.relatedRelationIds ?? [],
    });
  }

  const withoutJudge: Omit<Trajectory, 'judge'> = {
    targetKey: target.targetKey,
    paragraphId: target.paragraphId,
    domain: target.domain,
    category: target.category,
    studentProfile: target.studentProfile,
    initialStudentSummary: target.initialStudentSummary,
    evaluations,
    students,
    finalStatus: evaluations.at(-1)!.result.status,
  };
  const judge = await judgeTrajectory(client, judgePrompt, target, withoutJudge, budget);
  return { ...withoutJudge, judge };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function summarize(trajectories: readonly Trajectory[], budget: Budget) {
  const byCategory = Object.fromEntries(CategorySchema.options.map((category) => {
    const group = trajectories.filter((item) => item.category === category);
    return [category, {
      cases: group.length,
      initialRoutes: Object.fromEntries(['ERROR', 'TARGETED_GAP', 'SPARSE_GAP', 'PASS'].map((route) => [
        route,
        group.filter((item) => (item.evaluations[0]?.result.snapshot.diagnosticRoute ?? 'PASS') === route).length,
      ])),
      finalPass: group.filter((item) => item.finalStatus === 'PASS').length,
      completeStudentOutcome: group.filter((item) => item.judge?.output.studentOutcome === 'COMPLETE').length,
      finalDecisionAppropriate: group.filter((item) => item.judge?.output.finalDecisionAppropriate).length,
      prematurePass: group.filter((item) => item.judge?.output.prematurePass).length,
      overHeld: group.filter((item) => item.judge?.output.overHeld).length,
      leakageTurns: sum(group.map((item) => item.judge?.output.solutionLeakageCount ?? 0)),
      redundantTurns: sum(group.map((item) => item.judge?.output.redundantQuestionCount ?? 0)),
      questions: sum(group.map((item) => item.students.length)),
    }];
  }));
  const allJudges = trajectories.flatMap((item) => item.judge === null ? [] : [item.judge.output]);
  return {
    experiment: 'dialogue-selective-router-regression-42-v2',
    executedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    cases: trajectories.length,
    byCategory,
    overall: {
      finalPass: trajectories.filter((item) => item.finalStatus === 'PASS').length,
      completeStudentOutcome: allJudges.filter((item) => item.studentOutcome === 'COMPLETE').length,
      finalDecisionAppropriate: allJudges.filter((item) => item.finalDecisionAppropriate).length,
      initialRouteAppropriate: allJudges.filter((item) => item.initialRouteAppropriate).length,
      routeSequenceAppropriate: allJudges.filter((item) => item.routeSequenceAppropriate).length,
      prematurePass: allJudges.filter((item) => item.prematurePass).length,
      overHeld: allJudges.filter((item) => item.overHeld).length,
      leakageTurns: sum(allJudges.map((item) => item.solutionLeakageCount)),
      redundantTurns: sum(allJudges.map((item) => item.redundantQuestionCount)),
      questions: sum(trajectories.map((item) => item.students.length)),
      averageScore: allJudges.length === 0 ? 0 : sum(allJudges.map((item) => item.overallScore)) / allJudges.length,
    },
    budget: {
      capUsd: budget.cap,
      guardUsd: GUARD_USD,
      recordedSuccessfulCostUsd: budget.spent,
      unrecordedFailedCallAllowanceUsd: budget.unrecordedCostAllowance,
      accountedCostUsd: budget.spent + budget.unrecordedCostAllowance,
    },
  };
}

function approvedCap(argv: readonly string[]): number | null {
  const argument = argv.find((item) => item.startsWith('--approved-cost-cap='));
  if (argument === undefined) return null;
  const parsed = Number(argument.slice('--approved-cost-cap='.length));
  if (!Number.isFinite(parsed) || parsed <= GUARD_USD) throw new Error('유효한 승인 비용 상한이 필요합니다.');
  return parsed;
}

async function writeArtifacts(trajectories: readonly Trajectory[], summary: unknown): Promise<void> {
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  await writeFile(resolve(ARTIFACT_ROOT, 'trajectories.json'), `${JSON.stringify(trajectories, null, 2)}\n`);
  await writeFile(resolve(ROOT, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
}

async function loadExistingTrajectories(): Promise<Trajectory[]> {
  try {
    return JSON.parse(await readFile(resolve(ARTIFACT_ROOT, 'trajectories.json'), 'utf8')) as Trajectory[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function recordedCost(trajectories: readonly Trajectory[]): number {
  return sum(trajectories.flatMap((trajectory) => [
    ...trajectory.evaluations.map((evaluation) => evaluation.costUsd),
    ...trajectory.students.map((student) => student.costUsd),
    trajectory.judge?.costUsd ?? 0,
  ]));
}

async function main(): Promise<void> {
  const targets = await loadTargets();
  const maxPhysicalCalls = targets.length * (MAX_QUESTIONS + 1) * 2 +
    targets.length * MAX_QUESTIONS + targets.length;
  const historicalAverageCallCost = 2.54141 / 450;
  const preflight = {
    cases: targets.length,
    categories: Object.fromEntries(CategorySchema.options.map((category) => [
      category,
      targets.filter((target) => target.category === category).length,
    ])),
    maxQuestionsPerCase: MAX_QUESTIONS,
    maxPhysicalCalls,
    historicalAverageCallCostUsd: historicalAverageCallCost,
    estimatedMaxObservedCostUsd: maxPhysicalCalls * historicalAverageCallCost,
    recommendedHardCapUsd: 6,
  };
  await mkdir(ROOT, { recursive: true });
  await writeFile(resolve(ROOT, 'PREFLIGHT.json'), `${JSON.stringify(preflight, null, 2)}\n`);
  const cap = approvedCap(process.argv.slice(2));
  if (cap === null || process.argv.includes('--dry-run')) {
    process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
    if (cap === null) process.stdout.write('유료 실행에는 --approved-cost-cap=<USD>가 필요합니다.\n');
    return;
  }

  const [studentPrompt, judgePrompt] = await Promise.all([
    readFile(STUDENT_PROMPT_PATH, 'utf8'),
    readFile(JUDGE_PROMPT_PATH, 'utf8'),
  ]);
  const existing = await loadExistingTrajectories();
  const completedKeys = new Set(existing.map((trajectory) => trajectory.targetKey));
  const remainingTargets = targets.filter((target) => !completedKeys.has(target.targetKey));
  const recoveryAllowance = existing.length > 0 && existing.length < targets.length ? 0.15 : 0;
  const evaluator = new TwoStageDialogueEvaluator({ promptRevision: 'v3' });
  const client = new OpenAI({ maxRetries: 2 });
  const priorAccountedCost = Number(process.env['DIALOGUE_REGRESSION_PRIOR_ACCOUNTED_COST_USD'] ?? 0);
  if (!Number.isFinite(priorAccountedCost) || priorAccountedCost < 0) {
    throw new Error('DIALOGUE_REGRESSION_PRIOR_ACCOUNTED_COST_USD는 0 이상의 수여야 합니다.');
  }
  const budget = new Budget(cap, priorAccountedCost + recordedCost(existing), recoveryAllowance);
  const trajectories: Trajectory[] = [...existing];
  if (recoveryAllowance > 0) {
    process.stdout.write(
      `재개: 저장 ${existing.length}/${targets.length}, 기록비용 $${recordedCost(existing).toFixed(4)}, ` +
      `미기록 병렬호출 안전충당 $${recoveryAllowance.toFixed(2)}\n`,
    );
  }
  for (let index = 0; index < remainingTargets.length; index += CONCURRENCY) {
    const batch = remainingTargets.slice(index, index + CONCURRENCY);
    trajectories.push(...await Promise.all(batch.map((target) =>
      runTarget(target, evaluator, client, studentPrompt, judgePrompt, budget)
    )));
    await writeArtifacts(trajectories, summarize(trajectories, budget));
    process.stdout.write(
      `완료 ${trajectories.length}/${targets.length}, 관측 비용 $${budget.spent.toFixed(4)}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(summarize(trajectories, budget), null, 2)}\n`);
}

await main();
