// Handoff: docs/handoffs/2026-10-28-judge-reading-paraphrase-d1.md (4th). No external call, no .env.
// Re-validates stored attempts that failed with the READING/contentAssessment mismatch through the current evaluator path
// (normalizeCells -> settleConclusion -> validateClaims -> validateFeedbackAssessment) with a transport that returns the stored raw output.
// Usage: node scripts/replay-reading-error-normalization.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ProblemFeedbackController } from '../packages/app/dist/server/problem-feedback.js';
import { loadProblemSolvingBundle } from '../packages/app/dist/server/content.js';
import { OpenAIFeedbackEvaluator, FeedbackEvaluationError } from '../packages/pipeline/dist/index.js';

const BASE = 'docs/experiments/judge-reading-paraphrase-d1-2026-10-28';
export const FOLDERS = [`${BASE}/three-cell-v56`, `${BASE}/three-cell`, 'docs/experiments/v53-three-cell-check-2026-10-27-b'];
export const OUT = `${BASE}/REPLAY-normalization.json`;
export const MISMATCH = '내용 오류 판정과 오류 목록이 불일치합니다.';
const AUDIT = 'REPLAY_STOP: conclusion audit would be requested';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const semantic = v => { const { sessionId, ...rest } = v; return rest; };
const tick = () => new Promise(r => setImmediate(r));

/** Every stored attempt that failed with the mismatch error: { dir, caseId, stepIndex, evalIndex, attemptIndex, attempt }. */
export function targets(dirs = FOLDERS) {
  const found = [];
  for (const dir of dirs) {
    if (!existsSync(`${dir}/cases`)) continue;
    for (const f of readdirSync(`${dir}/cases`).filter(f => f.endsWith('.json')).sort()) {
      const state = read(`${dir}/cases/${f}`);
      state.steps.forEach((s, stepIndex) => s.evaluations.forEach((e, evalIndex) => (e.call?.metadata?.attempts ?? []).forEach((attempt, attemptIndex) => {
        if (attempt.error === MISMATCH) found.push({ dir, caseId: f.replace(/\.json$/, ''), stepIndex, evalIndex, attemptIndex, attempt });
      })));
    }
  }
  return found;
}

/** Stored raw output as the one response of the model; a conclusion audit request stops the replay (its answer is not stored). */
export function replayTransport(rawOutput) {
  return { async create(request) {
    if (request.text?.format?.name === 'problem_feedback_conclusion_audit') throw new Error(AUDIT);
    return { status: 'completed', output_text: JSON.stringify(rawOutput), usage: { input_tokens: 0, output_tokens: 0 } };
  } };
}

/** Replays the stored steps before stepIndex from stored evaluations, then runs step stepIndex once through the real evaluator on the stored raw output. */
async function replayAttempt(t) {
  const state = read(`${t.dir}/cases/${t.caseId}.json`);
  assert.equal(t.evalIndex, 0, `Only the first evaluation of a step is replayed: ${t.caseId}`);
  const sourcesPath = `${t.dir}/sources.json`;
  const source = existsSync(sourcesPath) ? read(sourcesPath)[state.case.questionId] : loadProblemSolvingBundle(state.case.questionId).source;
  const ctl = { replay: true, queue: [], inflight: 0, replayError: null, result: null };
  const real = new OpenAIFeedbackEvaluator({ transport: replayTransport(t.attempt.rawOutput), maxRetries: 0 });
  const evaluator = { async evaluate(session) {
    ctl.inflight++;
    try {
      if (ctl.replay) {
        const c = ctl.queue.shift();
        if (!c || c.kind !== session.evaluationMode) { ctl.replayError = `Replay mismatch: expected ${c?.kind ?? 'none'}, got ${session.evaluationMode}`; throw new Error(ctl.replayError); }
        if (c.status === 'ERROR') throw new FeedbackEvaluationError(c.error, c.call);
        return structuredClone(c.call);
      }
      if (ctl.result) throw new Error('REPLAY_STOP: later evaluation');
      try { const call = await real.evaluate(session); ctl.result = { call, error: null }; return call; }
      catch (e) { ctl.result = { call: e.call ?? null, error: String(e.message ?? e) }; throw e; }
    } finally { ctl.inflight--; }
  } };
  const controller = new ProblemFeedbackController({ loadSource: () => source, save: () => {}, evaluator });
  const idle = async view => { for (;;) { if (ctl.inflight === 0) { await tick(); await tick(); if (ctl.inflight === 0 && controller.get(view.sessionId).evaluationStatus !== 'PROCESSING') return controller.get(view.sessionId); } await tick(); } };
  let view = controller.start(state.case.questionId);
  for (const s of state.steps.slice(0, t.stepIndex)) {
    ctl.queue = structuredClone(s.evaluations);
    await controller.submit(view.sessionId, { transitionId: s.transitionId, expectedRevision: view.revision, command: s.command });
    view = await idle(view);
    if (ctl.replayError) throw new Error(ctl.replayError);
    assert.equal(ctl.queue.length, 0, 'Unused replay evaluation');
    assert.deepEqual(semantic(view), semantic(s.view), `Replay changed observed state: ${t.caseId}`);
  }
  ctl.replay = false;
  const s = state.steps[t.stepIndex];
  await controller.submit(view.sessionId, { transitionId: s.transitionId, expectedRevision: view.revision, command: s.command });
  while (!ctl.result) await tick();
  const first = ctl.result.call?.metadata?.attempts?.[0];
  return { error: ctl.result.error, notes: first?.normalized ?? [] };
}

export async function main() {
  const rows = [];
  for (const t of targets()) {
    const r = await replayAttempt(t);
    const result = r.error === null ? '통과' : r.error === `Error: ${AUDIT}` || r.error.includes(AUDIT) ? '통과(독립 결론 확인 호출 직전)' : `실패: ${r.error}`;
    rows.push({ folder: t.dir.split('/').slice(-1)[0], caseId: t.caseId, stepIndex: t.stepIndex, attemptNumber: t.attemptIndex + 1,
      previousError: t.attempt.error, result, normalizationNotes: r.notes });
  }
  writeFileSync(OUT, JSON.stringify({ externalCalls: 0, rows }, null, 2) + '\n');
  for (const r of rows) console.log(`${r.folder}\t${r.caseId}\tstep${r.stepIndex}\t#${r.attemptNumber}\t${r.result}\t${r.normalizationNotes.join(' | ')}`);
  return rows;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
