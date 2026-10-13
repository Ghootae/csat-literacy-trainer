import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  OpenAISourceDirectProblemEvaluator,
  SourceDirectProblemBundleSchema,
  SourceDirectProblemEvaluatorError,
  SourceDirectProblemReferenceCatalogSchema,
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
} from '../index.js';

const MODEL = 'gpt-5.6-terra';
const EFFORT = 'medium' as const;
const COST_CAP_USD = 6;
const MAX_OUTPUT_TOKENS = 2_200;
const PRICE_PER_MILLION = { input: 2, cachedInput: 0.2, output: 12 } as const;
const OUTPUT_BASE = resolve(
  process.cwd(),
  'docs/experiments/problem-source-direct-live-canary-2026-09-08',
);
const RUN_LABEL = process.env['CANARY_RUN_LABEL']?.trim() || '';
const OUTPUT_ROOT = RUN_LABEL === '' ? OUTPUT_BASE : resolve(OUTPUT_BASE, RUN_LABEL);
const CASE_FILTER = new Set(
  (process.env['CANARY_CASE_FILTER'] ?? '').split(',').map((value) => value.trim()).filter(Boolean),
);
const PRIOR_COST_USD = Number(process.env['CANARY_PRIOR_COST_USD'] ?? '0');
if (!Number.isFinite(PRIOR_COST_USD) || PRIOR_COST_USD < 0 || PRIOR_COST_USD >= COST_CAP_USD) {
  throw new Error('CANARY_PRIOR_COST_USD가 $6 하드캡 범위 밖이다.');
}
const PROBLEM_ROOT = resolve(
  process.cwd(),
  'packages/pipeline/fixtures/experiments/problem-solving',
);
const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v2.md',
);

interface CanaryRow {
  readonly caseId: string;
  readonly responseType: string;
  readonly stage: string;
  readonly questionId: string;
  readonly expected: readonly string[];
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

const references = SourceDirectProblemReferenceCatalogSchema.parse(JSON.parse(readFileSync(
  resolve(PROBLEM_ROOT, 'source-direct-runtime-v1.json'),
  'utf8',
)));
const promptBytes = Buffer.byteLength(readFileSync(PROMPT_PATH, 'utf8'));
const evaluator = new OpenAISourceDirectProblemEvaluator({
  model: MODEL,
  effort: EFFORT,
  maxRetries: 0,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  timeoutMs: 90_000,
});
const rows: CanaryRow[] = [];
let runSpentUsd = 0;

function source(questionId: string): SourceDirectProblemBundle {
  const publicContent = JSON.parse(readFileSync(
    resolve(PROBLEM_ROOT, 'public', `${questionId}.json`),
    'utf8',
  )) as Record<string, unknown>;
  const reference = references.questions.find((candidate) => candidate.questionId === questionId);
  if (reference === undefined) throw new Error(`원문 직접 참조 없음: ${questionId}`);
  const publicMedia = publicContent['media'];
  if (!Array.isArray(publicMedia)) throw new Error(`공개 미디어 배열 없음: ${questionId}`);
  return SourceDirectProblemBundleSchema.parse({
    schemaVersion: 'source-direct-problem-bundle-v2',
    ...publicContent,
    media: publicMedia.map((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`잘못된 공개 미디어: ${questionId}`);
      }
      const { alt: _accessibilityAlt, ...sourceMedia } = item as Record<string, unknown>;
      return sourceMedia;
    }),
    stemPolarity: reference.stemPolarity,
    answerChoiceId: reference.answerChoiceId,
    officialExplanation: reference.officialExplanation,
  });
}

function fresh(bundle: SourceDirectProblemBundle): ProblemSolvingSession {
  return createProblemSolvingSession({
    sessionId: `CANARY-${bundle.questionId}`,
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
  const textTokenUpperBound = promptBytes + Buffer.byteLength(JSON.stringify(input));
  const imageTokenGuard = input.source.media.length * 20_000;
  return (
    (textTokenUpperBound + imageTokenGuard) * PRICE_PER_MILLION.input +
    MAX_OUTPUT_TOKENS * PRICE_PER_MILLION.output
  ) / 1_000_000;
}

function observed(output: SourceDirectProblemEvaluatorOutput): string {
  return output.mode === 'ASSESS_SELECTION_RATIONALE'
    ? `ASSESS:${output.assessment}`
    : output.nextAction.type;
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
      output: result.result,
      rawOutput: result.rawOutput,
      call: result.call,
    });
    process.stdout.write(
      `${options.caseId}/${options.stage}: ${action} ` +
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
      ...(failed === null ? {} : { call: failed.call, rawOutput: failed.rawOutput }),
      error: error instanceof Error ? error.message : String(error),
    });
    process.stdout.write(
      `${options.caseId}/${options.stage}: ERROR cost=$${costUsd.toFixed(4)} ` +
      `${error instanceof Error ? error.message : String(error)}\n`,
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

async function correctSingle(options: {
  readonly caseId: string;
  readonly responseType: string;
  readonly rationale: string;
  readonly expected: string;
}): Promise<void> {
  const bundle = source('mrna-vaccine-lipid-nanoparticle-q19');
  const session = submitInitialProblemResponse(fresh(bundle), {
    initialChoiceId: bundle.answerChoiceId,
    rationale: options.rationale,
  });
  await call({
    ...options,
    stage: 'initial-assessment',
    input: evaluatorInput(session, bundle),
    expected: [options.expected],
  });
}

async function correctExplicitError(): Promise<void> {
  const caseId = 'correct-explicit-error';
  const responseType = '정답·명시적 오류';
  const bundle = source('mrna-vaccine-lipid-nanoparticle-q19');
  let session = submitInitialProblemResponse(fresh(bundle), {
    initialChoiceId: bundle.answerChoiceId,
    rationale: 'pH가 높아지면 이온화 지질의 양전하가 더 강해져서 ⑤가 적절하지 않습니다.',
  });
  const firstInput = evaluatorInput(session, bundle);
  const first = await call({
    caseId, responseType, stage: 'initial-assessment', input: firstInput,
    expected: ['ASSESS:CLEAR_ERROR'],
  });
  if (first?.mode !== 'ASSESS_SELECTION_RATIONALE' || first.assessment !== 'CLEAR_ERROR') return;
  session = applyCorrectRationaleAssessment(session, first.assessment);
  const correctionInput = evaluatorInput(session, bundle);
  const correction = await call({
    caseId, responseType, stage: 'corrective-question', input: correctionInput,
    expected: ['ASK_CORRECTIVE'],
  });
  if (correction === null) return;
  const asking = applyDiagnostic(session, correctionInput, correction);
  if (asking?.phase !== 'AWAITING_STUDENT_RESPONSE') return;
  session = submitProblemActionResponse(
    asking,
    '아니요. 높은 pH에서는 이온화 지질이 전기적으로 중성이 됩니다.',
  );
  const repairedInput = evaluatorInput(session, bundle,
    correction.mode === 'DIAGNOSE_PATH' ? correction : null);
  await call({
    caseId, responseType, stage: 'repair-assessment', input: repairedInput,
    expected: ['COMPLETE'],
  });
}

async function wrongFlow(options: {
  readonly caseId: string;
  readonly responseType: string;
  readonly questionId: string;
  readonly choiceId: string;
  readonly rationale: string;
  readonly expectedInitial: string;
  readonly followups: readonly { readonly response: string; readonly expected: string }[];
}): Promise<void> {
  const bundle = source(options.questionId);
  let session = submitInitialProblemResponse(fresh(bundle), {
    initialChoiceId: options.choiceId,
    rationale: options.rationale,
  });
  let previous: SourceDirectDiagnosticOutput | null = null;
  let input = evaluatorInput(session, bundle);
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
    input = evaluatorInput(session, bundle, previous);
    output = await call({
      caseId: options.caseId,
      responseType: options.responseType,
      stage: `followup-${index + 1}`,
      input,
      expected: [options.followups[index]!.expected],
    });
  }
}

function writeArtifacts(): void {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const passed = rows.filter((row) => row.passed).length;
  const summary = {
    artifactType: 'problem-source-direct-live-canary-summary-v1',
    executedAt: new Date().toISOString(),
    policyId: 'PS-PROBLEM-SOURCE-DIRECT-V1',
    model: MODEL,
    effort: EFFORT,
    promptVersion: 'source-direct-problem-dialogue-prompt-v2',
    hardCapUsd: COST_CAP_USD,
    maxOutputTokensPerCall: MAX_OUTPUT_TOKENS,
    calls: rows.length,
    passed,
    failed: rows.length - passed,
    priorObservedCostUsd: PRIOR_COST_USD,
    observedCostUsd: Number(runSpentUsd.toFixed(6)),
    cumulativeObservedCostUsd: Number((PRIOR_COST_USD + runSpentUsd).toFixed(6)),
    inputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.inputTokens ?? 0), 0),
    cachedInputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.cacheReadTokens ?? 0), 0),
    outputTokens: rows.reduce((sum, row) => sum + (row.call?.usage.outputTokens ?? 0), 0),
    activationRecommendation: CASE_FILTER.size > 0
      ? passed === rows.length && rows.length > 0
        ? 'TARGETED_REGRESSION_PASS'
        : 'HOLD_AND_REVIEW'
      : passed === rows.length && rows.length >= 6
        ? 'PASS_CANARY'
        : 'HOLD_AND_REVIEW',
  };
  writeFileSync(resolve(OUTPUT_ROOT, 'results.json'), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const details = rows.map((row) =>
    `| ${row.caseId} | ${row.stage} | ${row.expected.join(' / ')} | ${row.observed} | ` +
    `${row.passed ? 'PASS' : 'FAIL'} | $${row.costUsd.toFixed(4)} |`,
  ).join('\n');
  writeFileSync(resolve(OUTPUT_ROOT, 'REPORT.md'), `# 문제 풀이 원문 직접 실모형 canary\n\n` +
    `- 정책: \`PS-PROBLEM-SOURCE-DIRECT-V1\`\n` +
    `- 모델: \`${MODEL}\` / effort \`${EFFORT}\`\n` +
    `- 호출: ${summary.calls}회\n` +
    `- 계약·행동 기대 일치: ${summary.passed}/${summary.calls}\n` +
    `- 이번 실행 비용: $${summary.observedCostUsd.toFixed(4)}\n` +
    `- 누적 관측 비용: $${summary.cumulativeObservedCostUsd.toFixed(4)} / 하드캡 $${COST_CAP_USD.toFixed(2)}\n` +
    `- 권고: \`${summary.activationRecommendation}\`\n\n` +
    `| 사례 | 단계 | 기대 | 관측 | 결과 | 비용 |\n` +
    `|---|---|---|---|---|---:|\n${details}\n`, 'utf8');
}

async function main(): Promise<void> {
  try {
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('correct-supported')) await correctSingle({
      caseId: 'correct-supported', responseType: '정답·충분한 근거',
      rationale: '⑤는 pH 상승으로 소수성이 약해지고 크기가 작아진다는 관계를 말하지만, 지문과 보기에는 높은 pH에서 전기적으로 중성이 된다는 내용만 있어 그 연결은 근거가 없습니다.',
      expected: 'ASSESS:SUPPORTED',
    });
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('correct-insufficient')) await correctSingle({
      caseId: 'correct-insufficient', responseType: '정답·불충분한 근거',
      rationale: '그냥 ⑤가 이상해 보여서 골랐습니다.',
      expected: 'ASSESS:UNCERTAIN',
    });
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('correct-explicit-error')) await correctExplicitError();
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('wrong-explicit-error')) await wrongFlow({
      caseId: 'wrong-explicit-error', responseType: '오답·명시적 오류',
      questionId: 'corporate-law-q13', choiceId: 'C1',
      rationale: '적자가 누적되면 이익 잉여금이 오히려 늘어 배당 재원이 충분하므로 ①이 적절하지 않습니다.',
      expectedInitial: 'ASK_CORRECTIVE',
      followups: [{
        response: '제가 반대로 생각했습니다. 적자가 누적되면 이익 잉여금이 부족해져 배당 재원이 부족합니다.',
        expected: 'REQUEST_RESELECTION',
      }],
    });
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('wrong-insufficient')) await wrongFlow({
      caseId: 'wrong-insufficient', responseType: '오답·불충분한 근거',
      questionId: 'surface-tension-laplace-q16', choiceId: 'C2',
      rationale: '첨가제를 넣은 부분이 이상해서 ②라고 생각했습니다.',
      expectedInitial: 'ASK_DIAGNOSTIC',
      followups: [
        {
          response: '더 끈적일수록 점도가 커지고 오네소르게 수도 커지는데, 첨가제를 넣으면 더 끈적여져 수가 커진다고 봤습니다.',
          expected: 'ASK_CORRECTIVE',
        },
        {
          response: '반대로 이해했습니다. 인쇄가 되게 하려면 점도와 오네소르게 수를 낮추는 쪽이어야 합니다.',
          expected: 'REQUEST_RESELECTION',
        },
      ],
    });
    if (CASE_FILTER.size === 0 || CASE_FILTER.has('choice-rationale-conflict')) await wrongFlow({
      caseId: 'choice-rationale-conflict', responseType: '오답·정확한 근거와 선택 충돌',
      questionId: 'information-asymmetry-free-marketplace-q13', choiceId: 'C1',
      rationale: '헌법 재판소 결론은 실명 확인 의무 위반 언론사를 제재하는 규정이 위헌이라는 것이므로, 플랫폼 B가 제재받는다는 진술이 틀렸습니다.',
      expectedInitial: 'ASK_CORRECTIVE',
      followups: [{
        response: '제 근거를 적용한 선지는 ①이 아니라 ⑤입니다. 선택을 잘못 눌렀습니다.',
        expected: 'REQUEST_RESELECTION',
      }],
    });
  } finally {
    writeArtifacts();
  }
}

await main();
