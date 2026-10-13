// v5 live check (docs/experiments/v5-live-check-2026-10-13/PLAN.md).
// Modes: prepare | draft | wave <actions.json> | status | report. Only `wave` calls the API.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { ProblemFeedbackV4Controller } from '../packages/app/dist/server/problem-feedback-v4.js';
import { loadProblemSolvingBundle } from '../packages/app/dist/server/content.js';
import { OpenAIFeedbackEvaluator, FeedbackEvaluationError } from '../packages/pipeline/dist/index.js';
import { createLedger } from './test-v5-live-connection.mjs';
import { cases as allCases } from './v5-live-check-cases.mjs';
import { cases as diverse, specs } from './v5-diverse-48-cases.mjs';

// A rerun uses its own folder and case groups (e.g. V5_LIVE_CHECK_DIR=...-r2 V5_LIVE_CHECK_GROUPS=R,V).
export const DIR = process.env.V5_LIVE_CHECK_DIR ?? 'docs/experiments/v5-live-check-2026-10-13';
// V5_LIVE_CHECK_SET: comma list of groups (V) or case ids with repeats (R-I2*3 -> R-I2-r1..r3); first judgment only unless V5_LIVE_CHECK_FULL=1.
const set = process.env.V5_LIVE_CHECK_SET ?? process.env.V5_LIVE_CHECK_GROUPS;
const full = process.env.V5_LIVE_CHECK_FULL === '1'; // keep the case's own full-dialogue flag
const cases = !set ? allCases : set.split(',').flatMap(item => {
  const [key, times] = item.split('*'), picked = allCases.filter(c => c.group === key || c.id === key);
  if (!picked.length) throw new Error(`Unknown case set item: ${item}`);
  return picked.flatMap(c => times ? Array.from({ length: Number(times) }, (_, i) => ({ ...c, id: `${c.id}-r${i + 1}`, full: full && c.full })) : [{ ...c, full: full && c.full }]);
});
export const LIMITS = { 'gpt-6.1-sol': { requests: 60, usd: 2.5, input: 2, output: 10 }, 'gpt-6-luna': { requests: 60, usd: 0.5, input: 0.10, output: 0.50 } };
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const put = (p, x) => { writeFileSync(p + '.tmp', JSON.stringify(x, null, 2) + '\n'); renameSync(p + '.tmp', p); };
const questionIds = [...new Set(cases.map(c => c.questionId))];
const runtimePaths = [
  'packages/app/src/server/problem-feedback-v4.ts', 'packages/app/dist/server/problem-feedback-v4.js',
  'packages/pipeline/src/problem-solving/feedback-v4.ts', 'packages/pipeline/dist/problem-solving/feedback-v4.js',
  'packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts', 'packages/pipeline/dist/problem-solving/feedback-v4-evaluator.js',
  'packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts', 'packages/pipeline/dist/problem-solving/feedback-v5-end-explanation.js',
  'packages/pipeline/src/problem-solving/feedback-v5-claims.ts', 'packages/pipeline/dist/problem-solving/feedback-v5-claims.js',
  'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md',
  ...questionIds.map(q => `packages/pipeline/fixtures/experiments/problem-solving/public/${q}.json`),
  'scripts/run-v5-live-check.mjs', 'scripts/v5-live-check-cases.mjs', 'scripts/v5-diverse-48-cases.mjs', 'scripts/test-v5-live-connection.mjs',
];
const frozenNow = () => ({ hashes: Object.fromEntries(runtimePaths.map(p => [p, hash(readFileSync(p))])), caseHash: hash(JSON.stringify(cases)), limits: LIMITS });
const DONE = ['COMPLETED', 'ITEM_REVIEW'];
const semantic = v => { const { sessionId, ...rest } = v; return rest; };
const tick = () => new Promise(r => setImmediate(r));

function makeEvaluator() {
  const state = { replay: true, queue: [], live: null, onCall: null, inflight: 0 };
  state.evaluator = { async evaluate(session) {
    state.inflight++;
    try {
      if (state.replay) {
        const c = state.queue.shift();
        // Asserts here would be swallowed into RETRYABLE_ERROR by the controller; record them for wave() to rethrow.
        if (!c || c.kind !== session.evaluationMode) { state.replayError = `Replay mismatch: expected ${c?.kind ?? 'none'}, got ${session.evaluationMode}`; throw new Error(state.replayError); }
        if (c.status === 'ERROR') throw new FeedbackEvaluationError(c.error, c.call);
        return structuredClone(c.call);
      }
      try { const call = await state.live.evaluate(session); state.onCall({ status: 'SUCCESS', kind: session.evaluationMode, call }); return call; }
      catch (e) { state.onCall({ status: 'ERROR', kind: session.evaluationMode, call: e.call ?? null, error: String(e) }); throw e; }
    } finally { state.inflight--; }
  } };
  return state;
}
/** Waits for the evaluation and any background end explanation; a microtask gap between chained calls is not idle. */
async function idle(controller, ev, sessionId) {
  const deadline = Date.now() + 15 * 60 * 1000;
  for (;;) {
    if (Date.now() > deadline) throw new Error(`idle timeout: ${sessionId}`);
    if (ev.inflight === 0) { await tick(); await tick(); if (ev.inflight === 0 && controller.get(sessionId).evaluationStatus !== 'PROCESSING') return controller.get(sessionId); }
    await new Promise(r => setTimeout(r, ev.replay ? 0 : 100));
  }
}
async function step(controller, ev, view, transitionId, command) {
  await controller.submit(view.sessionId, { transitionId, expectedRevision: view.revision, command });
  return idle(controller, ev, view.sessionId);
}
async function restore(state, source) {
  const ev = makeEvaluator();
  const controller = new ProblemFeedbackV4Controller({ loadSource: () => source, save: r => ev.onRecord?.(r), evaluator: ev.evaluator });
  let view = controller.start(state.case.questionId);
  for (const s of state.steps) {
    ev.queue = structuredClone(s.evaluations);
    view = await step(controller, ev, view, s.transitionId, s.command);
    if (ev.replayError) throw new Error(ev.replayError);
    assert.equal(ev.queue.length, 0, 'Unused replay evaluation');
    assert.deepEqual(semantic(view), semantic(s.view), `Replay changed observed state: ${state.case.id}`);
  }
  ev.replay = false;
  return { controller, ev, view };
}

export function prepare() {
  mkdirSync(`${DIR}/cases`, { recursive: true }); mkdirSync(`${DIR}/requests`, { recursive: true }); mkdirSync(`${DIR}/actions`, { recursive: true });
  const sources = Object.fromEntries(questionIds.map(q => [q, loadProblemSolvingBundle(q).source]));
  for (const c of cases) assert.ok(sources[c.questionId].choices.some(x => x.choiceId === c.choiceId), `Unknown choice ${c.id}`);
  put(`${DIR}/sources.json`, sources); put(`${DIR}/CASES.json`, cases);
  put(`${DIR}/FROZEN.json`, { at: new Date().toISOString(), content: frozenNow(), authorization: 'User 2026-10-13: "승인" for PLAN.md (26 sessions, runner by Claude, live API run).' });
  put(`${DIR}/actions/initial.json`, cases.map(c => ({ id: c.id, stepIndex: 0, command: { type: 'SELECT', choiceId: c.choiceId, rationale: c.rationale === null ? { mode: 'OMITTED' } : { mode: 'PROVIDED', text: c.rationale } } })));
  for (const c of cases) { const p = `${DIR}/cases/${c.id}.json`; if (!existsSync(p)) put(p, { case: c, steps: [] }); }
  return { cases: cases.length, externalCalls: 0 };
}

// 48세션의 `supported` 근거: 정답·충분 근거 재선택(A2).
const SUPPORTED = Object.fromEntries(specs.map(s => [s.key, s.supported]));
/** Button and fixed steps follow PLAN.md; any free-text reply is left as null for a human author. */
export function draft() {
  const out = [];
  cases.forEach((c, i) => {
    const s = read(`${DIR}/cases/${c.id}.json`), v = s.steps.at(-1)?.view;
    if (!v || DONE.includes(v.phase) || (!c.full && s.steps.length)) return;
    let command = null;
    if (v.evaluationStatus === 'RETRYABLE_ERROR' && v.phase === 'AWAITING_EVALUATION') command = { type: 'RESUME' };
    else if (v.phase === 'AWAITING_END_START') command = { type: 'END_START', accept: true };
    else if (v.phase === 'AWAITING_UNDERSTANDING') command = { type: 'UNDERSTOOD', answer: i % 2 === 0 };
    else if (v.phase === 'AWAITING_RATIONALE' && c.rationale === null) command = { type: 'RATIONALE', rationale: { mode: 'OMITTED' } };
    else if (v.phase === 'AWAITING_POST_REPAIR_CHOICE') command = { type: c.role === 'A2' && v.postRepairOptions.includes('RESELECT') ? 'RESELECT' : 'REQUEST_EXPLANATION' };
    else if (v.phase === 'AWAITING_RESELECTION' && c.role === 'A2') {
      const k = c.id.split('-')[1], spec = diverse.find(d => d.id === `${k}-CP`);
      command = { type: 'SELECT', choiceId: spec.choiceId, rationale: { mode: 'PROVIDED', text: SUPPORTED[k] } };
    }
    out.push({ id: c.id, stepIndex: s.steps.length, phase: v.phase, message: v.message, command });
  });
  const path = `${DIR}/actions/draft-${Date.now()}.json`; put(path, out);
  return { path, total: out.length, needsAuthor: out.filter(a => !a.command).map(a => a.id) };
}
export async function wave(path) {
  assert.deepEqual(read(`${DIR}/FROZEN.json`).content, frozenNow(), 'Frozen input or runtime changed');
  const actions = read(path); assert.equal(new Set(actions.map(a => a.id)).size, actions.length, 'Duplicate action');
  for (const a of actions) { assert.ok(a.command, `Action without command: ${a.id}`); assert.ok(Number.isInteger(a.stepIndex), `Action without stepIndex: ${a.id}`); }
  const sources = read(`${DIR}/sources.json`); let client, label;
  const transport = { async create(request, options) {
    const id = `${label}-${Date.now()}`, p = `${DIR}/requests/${id}`; put(p + '.request.json', { caseId: label, at: new Date().toISOString(), request, options });
    try { const response = await (client ??= new OpenAI({ maxRetries: 0 })).responses.create(request, options); put(p + '.response.json', response); return response; }
    catch (e) { put(p + '.error.json', { name: e.name, message: e.message, status: e.status ?? null, at: new Date().toISOString() }); throw e; }
  } };
  const ledger = createLedger(`${DIR}/ledger.jsonl`, transport, LIMITS), log = [];
  // Sequential: one case at a time keeps request attribution exact.
  for (const action of actions) {
    const p = `${DIR}/cases/${action.id}.json`, state = read(p);
    const actionKey = hash(JSON.stringify({ id: action.id, stepIndex: action.stepIndex, command: action.command })); // Path-free: the same step in a later wave file is skipped.
    if (state.steps.some(s => s.actionKey === actionKey)) { log.push({ id: action.id, skipped: true }); continue; }
    if (action.stepIndex !== state.steps.length) { log.push({ id: action.id, skipped: 'stale stepIndex' }); continue; }
    if (existsSync(p + '.inflight')) throw new Error(`Uncommitted step: ${action.id}; review before resume`);
    label = action.id;
    const { controller, ev, view: before } = await restore(state, sources[state.case.questionId]);
    const evaluations = [];
    ev.live = new OpenAIFeedbackEvaluator({ transport: { create: (request, options) => ledger.send(request, options, action.id) } });
    ev.onCall = c => { evaluations.push(c); put(p + '.inflight', { action, evaluations }); };
    ev.onRecord = r => appendFileSync(`${DIR}/cases/${action.id}.records.jsonl`, JSON.stringify(r) + '\n');
    const transitionId = `${action.id}-s${state.steps.length + 1}`;
    let view;
    try { view = await step(controller, ev, before, transitionId, action.command); }
    catch (e) { if (evaluations.length) throw e; log.push({ id: action.id, error: String(e) }); console.log(JSON.stringify(log.at(-1))); continue; }
    state.steps.push({ actionKey, transitionId, command: action.command, inReplyTo: { phase: before.phase, message: before.message },
      evaluations, view, inspection: controller.inspect(view.sessionId), at: new Date().toISOString() });
    put(p, state); if (existsSync(p + '.inflight')) unlinkSync(p + '.inflight');
    log.push({ id: action.id, phase: view.phase, status: view.evaluationStatus, calls: evaluations.length });
    console.log(JSON.stringify(log.at(-1)));
    if (ledger.stop) { log.push({ stop: ledger.stop }); break; }
  }
  return { log, account: ledger.account() };
}

export function status() {
  return cases.map(c => { const s = read(`${DIR}/cases/${c.id}.json`), v = s.steps.at(-1)?.view;
    return { id: c.id, steps: s.steps.length, phase: v?.phase ?? null, status: v?.evaluationStatus ?? null, done: !v ? false : DONE.includes(v.phase) || (!c.full && s.steps.length > 0) }; });
}

// ---- automatic checks (PLAN.md 검사 1–5) ----
const unquote = t => t.replace(/"[^"\n]*"|'[^'\n]*'|“[^”]*”|‘[^’]*’|「[^」]*」/gu, '');
// Nouns ending in 요 are not polite endings.
const YO_NOUNS = new Set(['필요', '중요', '수요', '주요', '개요', '강요', '동요', '소요', '요요', '불필요']);
const hasBieup = ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 && c % 28 === 17; };
/** 해요체: a Hangul word ending in 요/죠 (not a 요-noun). 합쇼체: 니다/니까 after a ㅂ-final syllable (아니다 is banmal). */
export function polite(text) {
  for (const m of text.matchAll(/[가-힣]+/gu)) {
    const w = m[0];
    if (/[요죠]$/u.test(w) && !YO_NOUNS.has(w) && w.length > 1) return true;
    const i = w.search(/니[다까]$/u);
    if (i > 0 && hasBieup(w[i - 1])) return true;
  }
  return false;
}
export function textChecks(text) {
  const t = unquote(text), v = [];
  if (polite(t)) v.push('POLITE');
  if (/교정 질문|판정|종료 사유/u.test(t)) v.push('INTERNAL_TERM');
  if (/(^|[^A-Za-z0-9])[CE][0-9]+(?![0-9])|selection-mismatch|errorId|observationId/u.test(text)) v.push('INTERNAL_ID');
  if (/학생[은이의을에]/u.test(t)) v.push('THIRD_PERSON');
  return v;
}
function caseChecks(state) {
  const violations = [], last = state.steps.at(-1)?.view;
  if (!last) return violations;
  for (const m of last.transcript.filter(m => m.role === 'COACH')) for (const k of textChecks(m.text)) violations.push({ check: k, entry: m.id, text: m.text });
  for (const s of state.steps) {
    if (s.view.phase !== 'AWAITING_CORRECTION') continue;
    const active = s.view.activeErrorId, q = s.view.question;
    // Search every assessment: an A3 follow-up error comes from the SELECTION assessment, not the latest REPAIR.
    const err = s.inspection.assessments.flatMap(a => [...(a.raw?.errors ?? []), ...(a.raw?.repairs ?? []).flatMap(r => r.newErrors ?? [])]).findLast(e => e.errorId === active);
    // selection-mismatch carries the SELECTION assessment's own sourceEvidence (feedback-v4.ts applyFeedbackAssessment).
    const evidence = active === 'selection-mismatch' ? s.inspection.assessments.findLast(a => a.mode === 'SELECTION')?.raw?.sourceEvidence : err?.sourceEvidence;
    const quotes = (evidence ?? []).filter(e => ['PASSAGE', 'SCENARIO'].includes(e.location) && e.quote && !e.mediaId && !e.visualObservation);
    if (!s.view.correctionHighlights.length) violations.push({ check: 'NO_HIGHLIGHT', step: s.transitionId, question: s.view.message });
    for (const e of quotes) if (!(e.location === 'PASSAGE' ? q.passageText : q.scenarioText ?? '').includes(e.quote)) violations.push({ check: 'HIGHLIGHT_NOT_IN_SOURCE', step: s.transitionId, location: e.location, quote: e.quote });
    for (const h of s.view.correctionHighlights) if (!quotes.some(e => e.location === h.location && e.quote === h.text)) violations.push({ check: 'HIGHLIGHT_NOT_EVIDENCE', step: s.transitionId, text: h.text });
  }
  const sections = last.transcript.filter(m => m.sequence === 'SECTION');
  if (!sections.length && last.phase === 'COMPLETED' && state.steps.some(s => s.command.type === 'END_START' && s.command.accept)) violations.push({ check: 'SECTION_MISSING', ids: [] });
  if (sections.length) {
    const ids = sections.map(m => m.id.replace(/^coach-\d+/, ''));
    const reselected = state.steps.filter(s => s.command.type === 'SELECT').length === 2;
    if (!ids.includes('-first-section') || !ids.includes('-answer-section')) violations.push({ check: 'SECTION_MISSING', ids });
    if (ids.includes('-reselection-section') !== reselected) violations.push({ check: 'RESELECTION_SECTION_MISMATCH', ids, reselected });
    for (const m of sections) if (/부터 볼게|다음은 다시 고른|정답인 이유를 볼게/u.test(m.text.replace(/\n\n설명이 이해됐으면 다음 설명으로 넘어가 보자\.$/u, ''))) violations.push({ check: 'CONNECTOR_REPEATED', entry: m.id });
  }
  return violations;
}
function firstJudgment(state) {
  const s = state.steps[0]; if (!s) return null;
  const raw = s.inspection.assessments[0]?.raw ?? {};
  return { reconstructability: raw.reconstructability ?? null, rationaleImpliedVerdict: raw.rationaleImpliedVerdict ?? null,
    contentAssessment: raw.contentAssessment ?? null, errors: (raw.errors ?? []).length, mismatchQuestion: !!raw.selectionMismatchQuestion,
    phaseAfter: s.view.phase, question: s.view.phase === 'AWAITING_CORRECTION' ? s.view.message : null,
    highlights: s.view.correctionHighlights.map(h => h.text), reconstructedPath: raw.reconstructedPath ?? [], reason: raw.reason ?? null };
}
export function report() {
  const rows = cases.map(c => { const state = read(`${DIR}/cases/${c.id}.json`), last = state.steps.at(-1)?.view;
    return { id: c.id, group: c.group, steps: state.steps.length, finalPhase: last?.phase ?? null, endReason: last?.result?.endReason ?? null,
      selfReportedUnderstanding: last?.result?.selfReportedUnderstanding ?? null, first: firstJudgment(state), violations: caseChecks(state) }; });
  const ledger = existsSync(`${DIR}/ledger.jsonl`) ? readFileSync(`${DIR}/ledger.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  const ends = ledger.filter(r => r.event === 'END');
  const summary = {
    // A question after the first judgment means the rationale was judged (ERROR or selection mismatch), not left unverifiable.
    R: { total: rows.filter(r => r.group === 'R').length, questioned: rows.filter(r => r.group === 'R' && r.first?.phaseAfter === 'AWAITING_CORRECTION').map(r => r.id) },
    V: { total: rows.filter(r => r.group === 'V').length, questioned: rows.filter(r => r.group === 'V' && r.first?.phaseAfter === 'AWAITING_CORRECTION').map(r => r.id), previouslyQuestioned: ['V-I'] },
    violations: rows.reduce((n, r) => n + r.violations.length, 0),
    requests: ends.length, errors: ends.filter(r => r.status === 'ERROR').length, costUsd: Number(ends.reduce((n, r) => n + (r.costUsd ?? 0), 0).toFixed(4)),
  };
  put(`${DIR}/RESULTS.json`, { summary, rows });
  writeFileSync(`${DIR}/TRANSCRIPTS.md`, transcripts());
  return summary;
}
function transcripts() {
  const out = ['# v5 실모델 확인 시험 대화 기록 (2026-10-13)', '', '학생에게 보인 대화(코치·학생)와, 질문 단계에서 칠한 곳. 내부 판정은 각 세션 끝에 따로 적는다.', ''];
  for (const c of cases) {
    const state = read(`${DIR}/cases/${c.id}.json`), last = state.steps.at(-1)?.view; if (!last) continue;
    out.push(`## ${c.id} (${c.group}${c.role ? ' ' + c.role : ''}, ${c.questionId}, ${c.source})`, '');
    for (const m of last.transcript) out.push(`- **${m.role === 'STUDENT' ? '학생' : '루나'}**${m.sequence ? ` _${m.sequence}_` : ''}: ${m.text.replace(/\n+/g, ' / ')}`);
    for (const s of state.steps.filter(s => s.view.correctionHighlights.length)) out.push(`- 칠한 곳(${s.transitionId}): ${s.view.correctionHighlights.map(h => `[${h.location}] ${h.text}`).join(' | ')}`);
    const f = firstJudgment(state);
    out.push(`- 첫 판정: ${f.reconstructability} / ${f.rationaleImpliedVerdict} / ${f.contentAssessment} / 오류 ${f.errors}개${f.mismatchQuestion ? ' / 선택 확인 질문' : ''}`);
    if (f.reconstructedPath.length) out.push(`- 재구성: ${JSON.stringify(f.reconstructedPath).slice(0, 600)}`);
    out.push(`- 마지막 상태: ${last.phase}${last.result?.endReason ? ' / ' + last.result.endReason : ''}`, '');
  }
  return out.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, arg] = process.argv.slice(2);
  const run = { prepare, draft, status, report, wave: () => wave(arg) }[mode];
  if (!run) throw new Error('mode: prepare | draft | wave <actions.json> | status | report');
  console.log(JSON.stringify(await run(), null, 2));
}
