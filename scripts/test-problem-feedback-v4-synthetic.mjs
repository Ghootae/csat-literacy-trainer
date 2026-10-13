import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import OpenAI from 'openai';
import {
  SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  feedbackEvaluationInput, OpenAIFeedbackEvaluator, FeedbackEvaluationError,
} from '../packages/pipeline/dist/index.js';

const OUT = resolve('docs/experiments/problem-feedback-v4-synthetic-2026-10-01');
const SOURCE_ROOT = resolve('packages/pipeline/fixtures/experiments/problem-solving');
const MODE = process.argv[2] ?? 'prepare';
if (!['prepare', 'initial', 'cycles', 'report'].includes(MODE)) throw new Error('mode: prepare | initial | cycles | report');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const save = (p, value) => writeFileSync(p, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const casesPath = join(OUT, 'cases.json');
const suite = read(casesPath);
const MODEL = 'gpt-5.6-terra';
const CAP = 3;
const MAX_CALLS = 64;
const MAX_OUTPUT = 8000;
const prices = { input: 2, cachedInput: 0.2, output: 12 };
const paths = [casesPath,
  resolve('packages/pipeline/src/problem-solving/feedback-v4.ts'),
  resolve('packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts'),
  resolve('packages/pipeline/dist/problem-solving/feedback-v4.js'),
  resolve('packages/pipeline/dist/problem-solving/feedback-v4-evaluator.js'),
  resolve('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md'),
  join(SOURCE_ROOT, 'source-direct-runtime-v1.json')];
const catalog = read(paths.at(-1));
const sources = {};
for (const questionId of new Set(suite.cases.map(c => c.questionId))) {
  const path = join(SOURCE_ROOT, 'public', questionId + '.json'); paths.push(path);
  const source = read(path); const reference = catalog.questions.find(r => r.questionId === questionId);
  sources[questionId] = SourceDirectProblemBundleSchema.parse({ ...source,
    schemaVersion: 'source-direct-problem-bundle-v2', stemPolarity: reference.stemPolarity,
    answerChoiceId: reference.answerChoiceId, officialExplanation: reference.officialExplanation });
  if (source.media.length) throw new Error('This frozen pilot contains text-only source items.');
}
const fileHashes = Object.fromEntries(paths.map(p => [p.replace(process.cwd() + '/', ''), hash(readFileSync(p))]));
const freezePath = join(OUT, 'FROZEN.json');
if (existsSync(freezePath)) {
  if (JSON.stringify(read(freezePath).fileHashes) !== JSON.stringify(fileHashes)) throw new Error('Frozen fixture/source/prompt/runtime changed. Do not silently resume.');
} else {
  if (MODE !== 'prepare') throw new Error('Prepare and review before live calls.');
  save(freezePath, { frozenAt: new Date().toISOString(), model: MODEL, effort: 'medium', maxOutputTokens: MAX_OUTPUT,
    maxApiRequests: MAX_CALLS, estimatedUsdCap: CAP, pricesPerMillion: prices,
    priceSource: 'https://developers.openai.com/api/docs/pricing', fileHashes,
    runnerHashAtFreeze: hash(readFileSync(new URL(import.meta.url))), labelAuthority: suite.expectationAuthor });
  save(join(OUT, 'sources.json'), sources);
}
for (const sub of ['initial', 'cycles']) mkdirSync(join(OUT, sub), { recursive: true });
const schedule = suite.cases.map(c => ({ fixture: c, replicate: 1 }));
for (const id of suite.repeatIds) for (const replicate of [2, 3]) schedule.push({ fixture: suite.cases.find(c => c.id === id), replicate });
if (new Set(suite.cases.map(c => c.id)).size !== 24 || schedule.length !== 32 || suite.cycles.length !== 8) throw new Error('Frozen suite cardinality mismatch');
for (const c of suite.cases) {
  submitFeedbackCommand(createFeedbackSession('dry-' + c.id, sources[c.questionId]), {
    type: 'SELECT', choiceId: c.choiceId, rationale: { mode: 'PROVIDED', text: c.rationale },
  }, 'o1');
}

const ledgerPath = join(OUT, 'requests.jsonl');
const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const record = item => { ledger.push(item); appendFileSync(ledgerPath, JSON.stringify(item) + '\n'); };
function account() {
  const starts = ledger.filter(e => e.event === 'START');
  let charged = 0; let uncertain = 0;
  for (const start of starts) {
    const end = ledger.find(e => e.event === 'END' && e.requestId === start.requestId);
    if (end?.costUsd !== undefined) charged += end.costUsd;
    else uncertain += start.reservedUsd;
  }
  return { requests: starts.length, observedCostUsd: charged, reservedOrUnknownCostUsd: uncertain, accountedUsd: charged + uncertain };
}
const cost = usage => ((usage.input_tokens - (usage.input_tokens_details?.cached_tokens ?? 0)) * prices.input
  + (usage.input_tokens_details?.cached_tokens ?? 0) * prices.cachedInput + usage.output_tokens * prices.output) / 1e6;
let stopped = false;
let client;
function evaluatorFor(label) {
  return new OpenAIFeedbackEvaluator({ model: MODEL, maxOutputTokens: MAX_OUTPUT, timeoutMs: 60000, maxRetries: 1,
    transport: { async create(request, options) {
      const a = account();
      const bytes = Buffer.byteLength(JSON.stringify(request));
      if (bytes > 200000) throw new Error('RUN_LIMIT: short-context guard');
      const reservedUsd = (bytes * prices.input + MAX_OUTPUT * prices.output) / 1e6;
      if (a.requests >= MAX_CALLS || a.accountedUsd + reservedUsd > CAP) { stopped = true; throw new Error('RUN_LIMIT: request/cost cap'); }
      const requestId = `${label}-${a.requests + 1}`; const started = Date.now();
      record({ event: 'START', requestId, label, at: new Date().toISOString(), reservedUsd, requestHash: hash(JSON.stringify(request)) });
      try {
        client ??= new OpenAI({ maxRetries: 0 });
        const response = await client.responses.create({ ...request, service_tier: 'default' }, options);
        record({ event: 'END', requestId, label, at: new Date().toISOString(), durationMs: Date.now() - started,
          responseId: response.id, model: response.model, status: response.status, usage: response.usage,
          ...(response.usage ? { costUsd: cost(response.usage) } : {}), outputText: response.output_text });
        return response;
      } catch (error) {
        record({ event: 'TRANSPORT_ERROR', requestId, label, at: new Date().toISOString(), durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    } } });
}
function checksFor(f, after, raw) {
  const expected = f.expected; const failures = [];
  const check = (name, value, want) => { if (want !== undefined && JSON.stringify(value) !== JSON.stringify(want)) failures.push({ name, actual: value, expected: want }); };
  check('gate', raw.reconstructability, expected.gate);
  check('verdict', raw.rationaleImpliedVerdict, expected.verdict);
  check('consistency', after.selectionComparisons.at(-1)?.selectionRationaleConsistency, expected.consistency);
  check('phase', after.phase, expected.phase); check('outcome', after.result?.outcome, expected.outcome);
  if (expected.content && !expected.content.includes(raw.contentAssessment)) failures.push({ name: 'content', actual: raw.contentAssessment, expected: expected.content });
  if (expected.errorKinds) check('errorKinds', [...new Set(after.errors.map(e => e.kind))].sort(), [...expected.errorKinds].sort());
  if (expected.minErrors && after.errors.length < expected.minErrors) failures.push({ name: 'minErrors', actual: after.errors.length, expected: expected.minErrors });
  return { passed: failures.length === 0, failures, semanticReview: 'PENDING_AGENT_REVIEW' };
}
async function evaluate(session, label) {
  const input = feedbackEvaluationInput(session); let call = null;
  try {
    call = await evaluatorFor(label).evaluate(session);
    const after = applyFeedbackAssessment(session, call.rawOutput);
    return { status: 'VALID', input, call, after };
  } catch (error) {
    if (error instanceof FeedbackEvaluationError) call = error.call;
    return { status: stopped ? 'BUDGET_STOP' : 'EVALUATION_ERROR', input, call,
      error: error instanceof Error ? error.message : String(error), after: session };
  }
}
async function initial({ fixture: f, replicate }) {
  const label = `${f.id}-r${replicate}`; const path = join(OUT, 'initial', label + '.json');
  if (existsSync(path)) return;
  const session = submitFeedbackCommand(createFeedbackSession(label, sources[f.questionId]), {
    type: 'SELECT', choiceId: f.choiceId, rationale: { mode: 'PROVIDED', text: f.rationale },
  }, 'o1');
  const result = await evaluate(session, label);
  const checks = result.status === 'VALID' ? checksFor(f, result.after, result.call.rawOutput) : { passed: false, failures: [{ name: result.status, actual: result.error }] };
  save(path, { caseId: f.id, replicate, ...result, checks });
  console.log(JSON.stringify({ label, status: result.status, phase: result.after.phase, passed: checks.passed, ...account() }));
}
async function cycle(f) {
  const path = join(OUT, 'cycles', f.id + '.json'); if (existsSync(path)) return;
  const initialPath = join(OUT, 'initial', f.initialId + '-r1.json');
  if (!existsSync(initialPath)) return;
  const origin = read(initialPath); let s = structuredClone(origin.after); s.sessionId = f.id;
  const steps = []; let responseIndex = 0; let status = 'COMPLETED';
  if (origin.status !== 'VALID' || s.phase !== 'AWAITING_CORRECTION') status = 'INITIAL_PATH_UNAVAILABLE';
  while (status === 'COMPLETED' && s.phase !== 'COMPLETED' && !stopped) {
    let command;
    if (s.phase === 'AWAITING_CORRECTION') {
      if (responseIndex >= 12) { status = 'HARNESS_SAFETY_STOP'; break; }
      command = { type: 'CORRECT', errorId: s.activeErrorId, text: f.responses[Math.min(responseIndex++, f.responses.length - 1)] };
    } else if (s.phase === 'AWAITING_RESELECTION' && f.finalSelection) {
      command = { type: 'SELECT', ...f.finalSelection };
    } else { status = 'UNEXPECTED_PHASE'; break; }
    const before = s; s = submitFeedbackCommand(s, command, 'o' + (s.observations.length + 1));
    const result = s.phase === 'AWAITING_EVALUATION' ? await evaluate(s, f.id + '-step' + (steps.length + 1)) : { status: 'NO_MODEL', after: s, call: null };
    s = result.after;
    steps.push({ shownMessage: before.message, beforePhase: before.phase, command, ...result });
    if (!['VALID', 'NO_MODEL'].includes(result.status)) { status = result.status; break; }
  }
  const failures = [];
  for (const key of ['outcome', 'correctionSucceeded', 'selectionCount']) {
    if (s.result?.[key] !== f.expected[key]) failures.push({ name: key, expected: f.expected[key], actual: s.result?.[key] ?? null });
  }
  if (f.expected.newErrorRequired && s.additionalErrors.length === 0) failures.push({ name: 'newErrorRequired', expected: true, actual: false });
  save(path, { cycleId: f.id, initialId: f.initialId, origin: 'initial/' + f.initialId + '-r1.json', status, steps, after: s,
    checks: { passed: status === 'COMPLETED' && failures.length === 0, failures, semanticReview: 'PENDING_AGENT_REVIEW' } });
  console.log(JSON.stringify({ cycle: f.id, status, outcome: s.result?.outcome, passed: !failures.length, steps: steps.length, ...account() }));
}
function report() {
  const records = sub => readdirSync(join(OUT, sub)).filter(f => f.endsWith('.json')).sort().map(f => read(join(OUT, sub, f)));
  const initials = records('initial'); const cycles = records('cycles');
  const summary = { updatedAt: new Date().toISOString(), ...account(), initialCount: initials.length,
    initialValid: initials.filter(r => r.status === 'VALID').length, initialExpectedMatch: initials.filter(r => r.checks.passed).length,
    cyclesCount: cycles.length, cyclesExpectedMatch: cycles.filter(r => r.checks.passed).length,
    initialDifferences: initials.filter(r => !r.checks.passed).map(r => ({ caseId: r.caseId, replicate: r.replicate, failures: r.checks.failures })),
    cycleDifferences: cycles.filter(r => !r.checks.passed).map(r => ({ cycleId: r.cycleId, status: r.status, failures: r.checks.failures })),
    semanticAccuracy: 'NOT_AUTOMATICALLY_SCORED', humanReview: 'NOT_PERFORMED' };
  writeFileSync(join(OUT, 'RESULTS.json'), JSON.stringify(summary, null, 2) + '\n');
  const md = ['# 가상 응답 원출력 검토 자료', '', '사전 기대값과 자동 일치 여부는 독립 사람 정답이 아니다. 아래는 실제 모델의 구조화 출력과 상태 전이다.', ''];
  for (const r of initials) {
    const f = suite.cases.find(c => c.id === r.caseId); const a = r.call?.rawOutput;
    md.push(`## ${r.caseId} 반복 ${r.replicate}`, '', `선택 ${f.choiceId} / ${f.questionId}`, '', `학생: ${f.rationale}`, '',
      `사전 기대 근거: ${f.basis}`, '', `호출 상태: ${r.status}. 기대값 일치: ${r.checks.passed}.`, '',
      `결과: ${r.after.phase} / ${r.after.result?.outcome ?? '-'} / ${a?.reconstructability ?? '-'} / ${a?.rationaleImpliedVerdict ?? '-'}`, '',
      `재구성: ${JSON.stringify(a?.reconstructedPath ?? null)}`, '', `모델 이유: ${a?.reason ?? r.error ?? '-'}`, '',
      `내용 오류: ${JSON.stringify(a?.errors?.map(e => ({ errorId: e.errorId, description: e.description, question: e.question })) ?? null)}`, '',
      `학생에게 표시: ${r.after.message}`, '', `차이: ${JSON.stringify(r.checks.failures)}`, '');
  }
  for (const r of cycles) {
    md.push(`## 후속 경로 ${r.cycleId}`, '', `시작 판정: ${r.initialId} 반복 1. 기대값 일치: ${r.checks.passed}. 상태: ${r.status}.`, '');
    for (const [i, step] of r.steps.entries()) md.push(`### 응답 ${i + 1}`, '', `실제 질문 또는 안내: ${step.shownMessage}`, '',
      `학생: ${JSON.stringify(step.command)}`, '', `판정: ${JSON.stringify(step.call?.rawOutput ?? null)}`, '',
      `결과: ${step.after.phase} / ${step.after.result?.outcome ?? '-'}`, '', `학생에게 표시: ${step.after.message}`, '');
    md.push(`최종 차이: ${JSON.stringify(r.checks.failures)}`, '');
  }
  writeFileSync(join(OUT, 'REVIEW-PACKET.md'), md.join('\n'));
  console.log(JSON.stringify(summary, null, 2));
}
if (MODE === 'prepare') console.log(JSON.stringify({ mode: MODE, cases: suite.cases.length, initialEvaluations: schedule.length, cycles: suite.cycles.length, sources: Object.keys(sources), capUsd: CAP, maxRequests: MAX_CALLS }));
if (MODE === 'initial' || MODE === 'cycles') {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const work = MODE === 'initial' ? [...schedule] : [...suite.cycles];
  const run = MODE === 'initial' ? initial : cycle;
  await Promise.all(Array.from({ length: 2 }, async () => { while (work.length && !stopped) { const item = work.shift(); if (item) await run(item); } }));
}
report();
