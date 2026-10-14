import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { ProblemFeedbackV4Controller } from '../packages/app/dist/server/problem-feedback-v4.js';
import { OpenAIFeedbackEvaluator, validateFeedbackCoaching } from '../packages/pipeline/dist/index.js';

export const DIR = 'docs/experiments/v5-live-connection-2026-10-10';
const BASE = 'docs/experiments/v5-multi-item-luna-sol-2026-10-08';
const VARIANTS = 'docs/experiments/v5-repair-test-2026-10-10/variants.json';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const luna = 'gpt-6-luna', sol = 'gpt-6.1-sol';
const correction = 'AWAITING_CORRECTION', post = 'AWAITING_POST_REPAIR_CHOICE', selection = 'AWAITING_SELECTION', reselect = 'AWAITING_RESELECTION';
const repair = (text, errorId) => ({ phase: correction, type: 'CORRECT', text, ...(errorId ? { errorId } : {}) });
const button = type => ({ phase: post, type });
const choose = (position, text, phase = selection) => ({ phase, type: 'SELECT', position, text });
const coached = 'COACHING_TERMINATED', verified = 'VERIFIED_CORRECT', unverified = 'UNVERIFIED_CORRECT';
// SUFFICIENCY resolves from the committed last REPAIR assessment, not from the final result.
export const CELLS = [
  { id: 'L1', session: 'S2', replay: true, steps: [repair('작은 경우요.', 'E1')], endReason: 'REPAIR_FAILED', outcome: coached, models: [luna, sol] },
  { id: 'L2', session: 'S2', replay: true, steps: [repair('큰 경우요. 그러니까 다시 잘 나오게 하려면 수를 낮춰야 해요.', 'E1'), button('REQUEST_EXPLANATION')], endReason: 'COACHING_REQUESTED', outcome: coached, models: [luna, sol] },
  { id: 'L3', session: 'S2', replay: true, steps: [repair('큰 경우요. 그러니까 다시 잘 나오게 하려면 수를 낮춰야 해요.', 'E1'), button('RESELECT'), choose(3, '오네소르게 수는 점도가 클수록 크고 표면 장력·밀도·노즐 지름의 곱이 클수록 작아요. 점도와 표면 장력은 그대로고 밀도 두 배, 지름 절반이면 곱이 같으니 수가 안 바뀌어요.', reselect)], endReason: null, outcome: verified, models: [luna, luna] },
  { id: 'L4', session: 'S2', replay: true, steps: [repair('큰 경우요. 그러니까 다시 잘 나오게 하려면 수를 낮춰야 해요.', 'E1'), button('RESELECT'), choose(5, '끈적해지면 점도가 커지고, 점도가 커지면 오네소르게 수가 작아져서 위성 방울이 생겨요.', reselect)], endReason: 'RESELECTION_WRONG', outcome: coached, models: [luna, sol, sol] },
  { id: 'L5', session: 'S2', replay: true, steps: [repair('큰 경우요. 그러니까 다시 잘 나오게 하려면 수를 낮춰야 해요.', 'E1'), button('RESELECT'), choose(3, '오네소르게 수는 점도만으로 정해지니까 점도가 그대로면 안 바뀌어요.', reselect)], endReason: 'NO_CORRECTION', outcome: unverified, models: [luna, luna, luna] },
  { id: 'L6', session: 'D2', replay: true, steps: [repair('말초 조직이요. 거기서 레보도파가 도파민으로 바뀌는 걸 막으니까 뇌로 가는 레보도파는 오히려 늘어나요.', 'E1'), button('RESELECT'), choose(1, null, reselect)], endReason: 'RESELECTION_WRONG', outcome: coached, models: [luna, sol] },
  { id: 'L7', session: 'D2', replay: true, steps: [repair('말초 조직이요. 그래서 뇌로 가는 레보도파가 줄어들어요.', 'E1'), repair('그래도 줄어들 것 같아요.', 'E2')], endReason: 'REPAIR_FAILED', outcome: coached, models: [luna, luna, sol] },
  { id: 'L8', session: 'I2', replay: true, steps: [repair('아니요.', 'selection-mismatch'), button('REQUEST_EXPLANATION')], endReason: 'COACHING_REQUESTED', outcome: coached, models: [luna, sol] },
  { id: 'L9', session: 'S2', replay: false, steps: [choose(2, null), { phase: 'AWAITING_RATIONALE', type: 'RATIONALE', text: null }], endReason: 'RATIONALE_UNVERIFIABLE', outcome: coached, models: [sol] },
  { id: 'L10', session: 'I2', replay: false, steps: [choose(4, null), { phase: 'AWAITING_RATIONALE', type: 'RATIONALE', text: null }], endReason: 'RATIONALE_UNVERIFIABLE', outcome: coached, models: [sol] },
  { id: 'L11', session: 'I2', replay: false, steps: [choose(4, '그냥 느낌상 이게 답 같아요.')], endReason: 'RATIONALE_UNVERIFIABLE', outcome: coached, models: [sol, sol] },
  { id: 'L12', session: 'S4', replay: true, steps: [repair('점도만 영향을 줘요.', 'e1')], endReason: 'REPAIR_FAILED', outcome: unverified, models: [luna, luna] },
  { id: 'L13', session: 'S4', replay: true, steps: [repair('점도가 클수록 커지고, 표면 장력·밀도·지름의 곱이 클수록 작아져요. 그래서 밀도 두 배, 지름 절반이면 곱이 그대로라 안 바뀌어요.', 'e1'), button('REQUEST_EXPLANATION')], endReason: 'COACHING_REQUESTED', outcome: 'SUFFICIENCY', models: [luna, luna] },
  { id: 'L14', session: 'S4', replay: true, steps: [repair('점도가 클수록 커지고, 표면 장력·밀도·지름의 곱이 클수록 작아져요. 그래서 밀도 두 배, 지름 절반이면 곱이 그대로라 안 바뀌어요.', 'e1'), button('FINISH')], endReason: null, outcome: 'SUFFICIENCY', models: [luna] },
  { id: 'L15', session: 'M2', replay: true, steps: [repair('양전하를 띠어요.', 'E1')], endReason: 'REPAIR_FAILED', outcome: unverified, models: [luna, luna] },
  { id: 'L16', session: 'S2', replay: false, steps: [{ ...choose(2, null), caseRationale: 'S2' }, repair('큰 경우요. 그러니까 다시 잘 나오게 하려면 수를 낮춰야 해요.'), button('RESELECT'), choose(3, '오네소르게 수는 점도가 클수록 크고 표면 장력·밀도·노즐 지름의 곱이 클수록 작아요. 점도와 표면 장력은 그대로고 밀도 두 배, 지름 절반이면 곱이 같으니 수가 안 바뀌어요.', reselect)], endReason: null, outcome: verified, models: [sol, luna, luna] },
  { id: 'L17', session: 'S4', replay: false, steps: [{ ...choose(3, null), caseRationale: 'S4' }, repair('점도가 클수록 커지고, 표면 장력·밀도·지름의 곱이 클수록 작아져요. 그래서 밀도 두 배, 지름 절반이면 곱이 그대로라 안 바뀌어요.'), button('REQUEST_EXPLANATION')], endReason: 'COACHING_REQUESTED', outcome: 'SUFFICIENCY', models: [luna, luna, luna] },
];

export function loadInputs() {
  const cases = read(`${BASE}/cases.json`), sources = read(`${BASE}/sources.json`), suite = read(VARIANTS);
  const recordings = Object.fromEntries([...new Set(CELLS.map(c => c.session))].map(id => {
    const model = suite.sessions[id].firstJudgeModel;
    return [id, { model, path: `${BASE}/${model}/${id}-r1.json`, call: read(`${BASE}/${model}/${id}-r1.json`).call }];
  }));
  return { cases, sources, suite, recordings };
}
const replayCall = recording => ({ rawOutput: structuredClone(recording.call.rawOutput), metadata: {
  provider: 'mock', model: recording.model, promptVersion: 'recorded-first-assessment', durationMs: 0,
  inputTokens: 0, outputTokens: 0, cachedTokens: 0, attempts: [],
} });
const rationale = text => text === null ? { mode: 'OMITTED' } : { mode: 'PROVIDED', text };
function initialCommand(data, id) {
  const c = data.cases.find(c => c.id === id); assert.ok(c, `Missing case ${id}`);
  return { type: 'SELECT', choiceId: c.choiceId, rationale: rationale(c.rationale) };
}

export async function validateInputs(data) {
  for (const id of Object.keys(data.recordings)) {
    const c = data.cases.find(c => c.id === id), source = data.sources[c.questionId];
    const controller = new ProblemFeedbackV4Controller({ loadSource: () => source, save() {},
      evaluator: { async evaluate() { return replayCall(data.recordings[id]); } } });
    let view = controller.start(c.questionId);
    // Historical evidence references o1; replay must preserve this observation ID.
    view = await controller.submit(view.sessionId, { transitionId: 'o1', expectedRevision: view.revision, command: initialCommand(data, id) });
    assert.equal(view.phase, correction, `Replay phase: ${id}`);
    const errors = controller.inspect(view.sessionId).errors;
    for (const cell of CELLS.filter(c => c.session === id && c.replay)) {
      for (const step of cell.steps.filter(s => s.type === 'CORRECT')) assert.ok(errors.some(e => e.errorId === step.errorId), `${cell.id}: ${step.errorId}`);
      assert.equal(view.activeErrorId, cell.steps[0].errorId);
    }
    for (const v of data.suite.variants.filter(v => v.session === id)) {
      for (const key of Object.keys(v.answers)) assert.ok(errors.some(e => e.errorId === key), `${v.id}: ${key}`);
    }
  }
}

export const LIMITS = { [sol]: { requests: 40, usd: 1.2, input: 2, output: 10 }, [luna]: { requests: 80, usd: 0.3, input: 0.10, output: 0.50 } };
// releaseUnsent (opt-in): an immediate connection error (< 2 s) never reached the server, so its reservation is released.
// Timeouts and every other error keep their conservative reservation.
const unsent = end => end?.status === 'ERROR' && end.durationMs < 2000 && /Connection error/u.test(end.error ?? '');
export function createLedger(path, transport, limits = LIMITS, { releaseUnsent = false } = {}) {
  const rows = existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  if (rows.some(s => s.event === 'START' && !rows.some(e => e.event === 'END' && e.requestId === s.requestId))) throw new Error('RUN_LIMIT: START without END; resume refused');
  const record = row => { appendFileSync(path, JSON.stringify(row) + '\n'); rows.push(row); };
  function account() {
    return Object.fromEntries(Object.keys(limits).map(model => {
      const starts = rows.filter(r => r.event === 'START' && r.model === model);
      let confirmedUsd = 0, reservedUsd = 0;
      for (const s of starts) {
        const end = rows.find(r => r.event === 'END' && r.requestId === s.requestId);
        if (Number.isFinite(end?.costUsd)) confirmedUsd += end.costUsd; else if (!(releaseUnsent && unsent(end))) reservedUsd += s.reservedUsd;
      }
      return [model, { requests: starts.length, confirmedUsd, reservedUsd }];
    }));
  }
  let client, stopped = null;
  return { rows, account, get stop() { return stopped; }, async send(request, options, label) {
    if (stopped) throw new Error(stopped);
    const rates = limits[request.model];
    if (!rates) throw new Error(`RUN_LIMIT: unknown model ${request.model}`);
    const a = account()[request.model];
    // Conservative text reservation (UTF-8 bytes as tokens), as in the repair runner.
    const reservedUsd = (Buffer.byteLength(JSON.stringify(request)) * rates.input + request.max_output_tokens * rates.output) / 1e6;
    if (!Number.isFinite(reservedUsd) || a.requests >= rates.requests || a.confirmedUsd + a.reservedUsd + reservedUsd > rates.usd) {
      stopped = `RUN_LIMIT: ${request.model} request/cost limit`; throw new Error(stopped);
    }
    const requestId = randomUUID(), started = performance.now();
    record({ event: 'START', requestId, label, model: request.model, reservedUsd, requestHash: hash(JSON.stringify(request)), at: new Date().toISOString() });
    let response;
    try { response = await (transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses).create(request, options); }
    catch (error) {
      record({ event: 'END', requestId, label, model: request.model, status: 'ERROR', error: String(error), usage: null, costUsd: null, responseId: null, durationMs: performance.now() - started });
      throw error;
    }
    const usage = response.usage ?? null;
    const costUsd = Number.isFinite(usage?.input_tokens) && Number.isFinite(usage?.output_tokens)
      ? (usage.input_tokens * rates.input + usage.output_tokens * rates.output) / 1e6 : null;
    record({ event: 'END', requestId, label, model: request.model, responseModel: response.model ?? null, status: response.status,
      usage, costUsd, responseId: response.id ?? null, durationMs: performance.now() - started });
    return response;
  } };
}

export function explanationChecks(text) {
  let undamaged = true;
  try { validateFeedbackCoaching(text); } catch { undamaged = false; }
  const withoutQuotes = text.replace(/"[^"\n]*"|'[^'\n]*'|“[^”]*”|‘[^’]*’/gu, '');
  return { noInternalIdentifiers: !/(^|[^A-Za-z0-9])[CEce][0-9]+(?![0-9])|selection-mismatch|observationId|errorId/u.test(text),
    undamaged, noThirdPerson: !/학생[은이의을]/u.test(withoutQuotes),
    haeyo: !/(?:습니다|입니다|이다|한다)(?=[.!?。！？](?:\s|$)|\s*$|\n)/mu.test(withoutQuotes) };
}
function hasPrivateKey(value) {
  return value && typeof value === 'object' && Object.entries(value).some(([key, child]) => ['officialExplanation', 'explanation'].includes(key) || hasPrivateKey(child));
}
export function checkCell(row, source) {
  const v = row.actual.publicView, result = row.actual.result;
  const texts = [v.message, ...row.transcript.map(t => t.text)];
  const chars = [...source.officialExplanation];
  let noOfficialExplanation = true;
  for (let i = 0; i <= chars.length - 20; i++) if (texts.some(t => t.includes(chars.slice(i, i + 20).join('')))) { noOfficialExplanation = false; break; }
  const answer = source.choices.find(c => c.choiceId === source.answerChoiceId);
  // D-0112 5: the server no longer appends an answer line; only the answer card (answerRevealed) differs.
  const answerLine = result ? !/\n정답은\s*\d+번입니다\.$/u.test(v.message)
    && result.answerRevealed === !result.choiceCorrect && (result.choiceCorrect || result.answer?.position === answer.position) : null;
  // Preserve adjacent legitimate same-model calls; collapse only retries within each evaluator call.
  const groups = [...Map.groupBy(row.actual.evaluations.filter(e => !e.replay), e => e.key).values()]
    .map(es => ({ attempts: es.flatMap(e => e.attempts) }));
  const models = groups.length === row.expected.models.length && groups.every((e, i) =>
    e.attempts.filter(a => a.outcome === 'SUCCESS').length === 1 && e.attempts.every(a => a.model === row.expected.models[i]));
  return { path: row.status === 'PATH_DEVIATION' ? null : row.actual.endReason === row.expected.endReason
      && result?.outcome === row.expected.resolvedOutcome && JSON.stringify(row.actual.path) === JSON.stringify(row.expected.path),
    models, noOfficialExplanation, answerLine, publicView: !hasPrivateKey(v),
    explanationStatic: row.endExplanation === null ? null : explanationChecks(row.endExplanation),
    retries: groups.flatMap(e => e.attempts.filter(a => a.outcome === 'ERROR').map(a => ({ kind: a.kind, model: a.model, reason: a.error }))) };
}

export async function executeCell(cell, replicate, data, ledger, { recordsPath } = {}) {
  const records = [], evaluations = [], calls = [], correctionQuestions = [], submissionDurationsMs = [], history = [];
  const c = data.cases.find(c => c.id === cell.session), source = data.sources[c.questionId];
  let first = true, currentKind;
  const live = new OpenAIFeedbackEvaluator({ transport: { async create(request, options) {
    const started = performance.now();
    const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
    const entry = { kind: kind === 'ASSESSMENT' ? currentKind : kind, model: request.model, durationMs: 0, outcome: 'SUCCESS' };
    calls.push(entry);
    try { return await ledger.send(request, options, `${cell.id}-r${replicate}`); }
    catch (error) { entry.outcome = 'ERROR'; entry.error = String(error); throw error; }
    finally { entry.durationMs = performance.now() - started; }
  } } });
  const controller = new ProblemFeedbackV4Controller({ loadSource: () => source,
    save(record) { records.push(record); if (recordsPath) appendFileSync(recordsPath, JSON.stringify(record) + '\n'); },
    evaluator: { async evaluate(session) {
      const replay = first && cell.replay; first = false; currentKind = session.evaluationMode;
      const entry = { key: `${session.observations.at(-1)?.observationId}:${currentKind}`, kind: currentKind, replay, attempts: [] }; evaluations.push(entry);
      const startCall = calls.length;
      try {
        const call = replay ? replayCall(data.recordings[cell.session]) : await live.evaluate(session);
        entry.model = call.metadata.model;
        entry.attempts = (call.metadata.attempts ?? []).map(a => ({ ...a, kind: a.kind === 'ASSESSMENT' ? currentKind : a.kind }));
        return call;
      } catch (error) { entry.attempts = (error.call?.metadata.attempts ?? []).map(a => ({ ...a, kind: a.kind === 'ASSESSMENT' ? currentKind : a.kind })); throw error; }
      finally {
        entry.attempts.forEach((a, i) => { if (calls[startCall + i]) Object.assign(calls[startCall + i], { outcome: a.outcome, error: a.error }); });
      }
    } } });
  let view = controller.start(c.questionId), status = 'VALID', deviation = null;
  const path = [view.phase];
  const submit = async command => {
    const started = performance.now();
    view = await controller.submit(view.sessionId, { transitionId: `o${submissionDurationsMs.length + 1}`, expectedRevision: view.revision, command });
    submissionDurationsMs.push(performance.now() - started);
    history.push({ command, phase: view.phase, evaluationStatus: view.evaluationStatus, message: view.message });
  };
  const submitWithResume = async command => {
    await submit(command);
    if (ledger.stop) { status = 'RUN_LIMIT'; return; }
    if (view.evaluationStatus === 'RETRYABLE_ERROR') await submit({ type: 'RESUME' });
    if (ledger.stop) status = 'RUN_LIMIT';
    else if (view.evaluationStatus === 'RETRYABLE_ERROR') status = 'EVALUATION_ERROR';
    path.push(view.phase);
  };
  const deviate = reason => { status = 'PATH_DEVIATION'; deviation = { reason, phase: view.phase, message: view.message }; };
  if (cell.replay) await submitWithResume(initialCommand(data, cell.session));
  for (const step of cell.steps) {
    if (status !== 'VALID') break;
    if (view.phase !== step.phase) { deviate(`Expected ${step.phase}`); break; }
    let command;
    if (step.type === 'CORRECT') {
      if ((!cell.replay && view.questionTargets !== 1) || (step.errorId && step.errorId !== view.activeErrorId)) { deviate('Unexpected correction count or active error'); break; }
      correctionQuestions.push({ errorId: view.activeErrorId, text: view.message });
      command = { type: 'CORRECT', errorId: view.activeErrorId, text: step.text };
    } else if (step.type === 'SELECT' || step.type === 'RATIONALE') {
      const text = step.caseRationale ? data.cases.find(c => c.id === step.caseRationale).rationale : step.text;
      command = { type: step.type, rationale: rationale(text), ...(step.type === 'SELECT' ? { choiceId: source.choices.find(c => c.position === step.position).choiceId } : {}) };
    } else command = { type: step.type };
    await submitWithResume(command);
  }
  if (status === 'VALID' && view.phase !== 'COMPLETED') deviate('Expected COMPLETED');
  const lastSession = records.at(-1).session;
  const pending = records.map(r => r.session.pendingEnd).filter(Boolean).at(-1);
  const resolvedOutcome = cell.outcome === 'SUFFICIENCY'
    ? (lastSession.assessments.filter(a => a.mode === 'REPAIR').at(-1)?.rationaleSufficient ? verified : unverified) : cell.outcome;
  const expectedPath = [selection, ...(cell.replay ? [correction] : []), ...cell.steps.map((_, i) => cell.steps[i + 1]?.phase ?? 'COMPLETED')];
  const endCall = records.filter(r => r.event === 'EVALUATED' && r.session.phase === 'COMPLETED').at(-1)?.call;
  const row = { id: cell.id, replicate, status, expected: { path: expectedPath, endReason: cell.endReason, outcome: cell.outcome, resolvedOutcome, models: cell.models },
    actual: { path, history, publicView: view, result: view.result, endReason: pending?.endReason ?? null, calls, evaluations, correctionQuestions },
    endExplanation: pending ? endCall?.rawOutput?.coaching ?? null : null, submissionDurationsMs, transcript: view.transcript, deviation };
  if (status === 'VALID' && (row.actual.endReason !== cell.endReason || view.result?.outcome !== resolvedOutcome)) {
    row.status = 'PATH_DEVIATION'; row.deviation = { reason: 'Unexpected endReason/outcome', phase: view.phase, message: view.message };
  }
  row.checks = checkCell(row, source);
  return row;
}

function frozenInputs(data) {
  const paths = [VARIANTS, `${BASE}/cases.json`, `${BASE}/sources.json`, ...Object.values(data.recordings).map(r => r.path),
    'scripts/test-v5-live-connection.mjs', 'scripts/test-v5-live-connection.test.mjs',
    'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md',
    'packages/app/src/server/problem-feedback-v4.ts', 'packages/app/dist/server/problem-feedback-v4.js',
    ...['src', 'dist'].flatMap(tree => readdirSync(`packages/pipeline/${tree}/problem-solving`).filter(f => /^feedback-v[45].*\.(?:ts|js)$/u.test(f) && !f.includes('.test.') && !f.endsWith('.d.ts')).sort().map(f => `packages/pipeline/${tree}/problem-solving/${f}`))];
  return { fileHashes: Object.fromEntries(paths.map(p => [p, hash(readFileSync(p))])), cells: CELLS, repetitions: 2, limits: LIMITS };
}
const durations = xs => {
  const a = xs.filter(Number.isFinite).sort((a, b) => a - b), n = a.length;
  return { count: n, median: n ? (a[Math.floor((n - 1) / 2)] + a[Math.ceil((n - 1) / 2)]) / 2 : null, max: n ? a[n - 1] : null };
};
export function summarize(rows, ledger, stop) {
  const violations = [];
  for (const row of rows) {
    for (const [name, value] of Object.entries(row.checks)) {
      if (value === false) violations.push({ id: row.id, replicate: row.replicate, check: name });
      if (name === 'explanationStatic' && value) for (const [key, pass] of Object.entries(value)) if (!pass) violations.push({ id: row.id, replicate: row.replicate, check: `${name}.${key}` });
    }
  }
  const calls = rows.flatMap(r => r.actual.calls);
  const retries = rows.flatMap(r => r.checks.retries.map(e => ({ id: r.id, replicate: r.replicate, ...e })));
  return { plannedCells: 34, cells: rows.length, states: Object.fromEntries(['VALID', 'PATH_DEVIATION', 'EVALUATION_ERROR', 'RUN_LIMIT'].map(s => [s, rows.filter(r => r.status === s).length])),
    violations, deviations: rows.filter(r => r.status === 'PATH_DEVIATION').map(r => ({ id: r.id, replicate: r.replicate, ...r.deviation })),
    models: ledger.account(), callDurationsMs: Object.fromEntries([...new Set(calls.map(c => c.kind))].map(k => [k, durations(calls.filter(c => c.kind === k).map(c => c.durationMs))])),
    submissionDurationsMs: durations(rows.flatMap(r => r.submissionDurationsMs)),
    retries, errorAttemptsByKind: Object.fromEntries([...Map.groupBy(retries, r => r.kind)].map(([kind, attempts]) => [kind, { count: attempts.length, reasons: attempts.map(a => a.reason) }])), stop };
}
export async function main({ mode = 'prepare', dir = DIR, transport } = {}) {
  assert.ok(['prepare', 'run'].includes(mode), 'Expected prepare | run');
  const data = loadInputs(); await validateInputs(data);
  const frozen = frozenInputs(data), frozenPath = `${dir}/FROZEN.json`, frozenHash = hash(JSON.stringify(frozen));
  if (existsSync(frozenPath)) assert.deepEqual(read(frozenPath), frozen, 'FROZEN mismatch');
  else if (mode !== 'prepare') throw new Error('Run prepare first');
  if (mode === 'prepare') {
    mkdirSync(dir, { recursive: true });
    if (!existsSync(frozenPath)) write(frozenPath, frozen);
    return { prepared: true, cells: 17, repetitions: 2, replaySessions: Object.keys(data.recordings).length, selfTests: 'passed', externalRequests: 0, frozenHash };
  }
  const ledger = createLedger(`${dir}/requests.jsonl`, transport), rows = [];
  let stop = null;
  for (const replicate of [1, 2]) {
    for (const cell of CELLS) {
      const label = `${cell.id}-r${replicate}`, path = `${dir}/${label}.json`;
      let row;
      if (existsSync(path)) { row = read(path); assert.equal(row.frozenHash, frozenHash, `Cell hash mismatch: ${label}`); }
      else {
        const recordsPath = `${dir}/${label}.records.jsonl`;
        // Do not silently overwrite an interrupted session or mix two attempts in one record file.
        if (existsSync(recordsPath)) throw new Error(`Incomplete cell records: ${label}; review before resume`);
        row = { ...await executeCell(cell, replicate, data, ledger, { recordsPath }), frozenHash }; write(path, row);
      }
      rows.push(row);
      if (row.status === 'RUN_LIMIT') { stop = ledger.stop ?? 'RUN_LIMIT in saved cell'; break; }
    }
    if (stop) break;
  }
  const summary = { frozenHash, ...summarize(rows, ledger, stop) };
  writeFileSync(`${dir}/RESULTS.json`, JSON.stringify(summary, null, 2) + '\n'); return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await main({ mode: process.argv[2] ?? 'prepare' }), null, 2));
