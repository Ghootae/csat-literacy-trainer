// luna 기호 오독(Q-0030) 후속: v5.8 표적 재현에서 오독이 난 두 세션(S2-r3, G2-r1)을 저장된 판정 그대로 되살려,
// 교정 질문에 "잘 모르겠어."로 답한 뒤(교정 실패) 마지막 설명(layout-v2 기본)까지 이어 생성한다. 오독이 학생 화면으로 옮겨 가는지 확인용.
// Usage: node --env-file=.env scripts/run-luna-marker-misread-end.mjs [selftest]
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  applyFeedbackEndExplanation, OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';

const REPRO = 'docs/experiments/luna-marker-misread-count-2026-11-03/repro-v58';
const OUT = 'docs/experiments/luna-marker-misread-count-2026-11-03/end-v58';
const LABELS = ['S2-r3', 'G2-r1'], ANSWER = '잘 모르겠어.', USD_CAP = 0.1, TIMEOUT_MS = 120000, MAX_STEPS = 6;
const PRICES = { input: 0.10, cached: 0.01, output: 0.50 }; // gpt-6-luna, run-luna-marker-misread-repro.mjs와 같음
const costOf = u => u ? ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * PRICES.input
  + (u.input_tokens_details?.cached_tokens ?? 0) * PRICES.cached + u.output_tokens * PRICES.output) / 1e6 : 0;

const rows = readFileSync('docs/experiments/v57-regression-2026-10-29/cases/G-A2.records.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const source = SourceDirectProblemBundleSchema.parse(rows[0].session.source);
// 저장된 SELECTION 판정을 다시 적용해 재현 때와 같은 교정 대기 상태를 만든다(외부 전송 없음).
function restore(label) {
  const saved = JSON.parse(readFileSync(`${REPRO}/${label}.json`, 'utf8'));
  const s0 = submitFeedbackCommand(createFeedbackSession(`marker-${saved.type}-r${saved.replicate}`, source),
    { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text: saved.response } }, label);
  const s = applyFeedbackAssessment(s0, saved.rawOutput);
  assert.equal(s.phase, saved.server.phase); assert.equal(s.message, saved.server.message);
  return s;
}
const restored = Object.fromEntries(LABELS.map(l => [l, restore(l)]));
if (process.argv[2] === 'selftest') {
  console.log(JSON.stringify({ selftest: 'passed', sessions: LABELS.map(l => ({ l, phase: restored[l].phase, errors: restored[l].errors.length })) }));
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const ledgerPath = `${OUT}/requests.jsonl`;
let spent = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
const client = new OpenAI({ maxRetries: 0 });
for (const label of LABELS) {
  const path = `${OUT}/${label}.json`;
  if (existsSync(path)) continue;
  const requests = [], steps = [];
  const evaluator = new OpenAIFeedbackEvaluator({ timeoutMs: TIMEOUT_MS, maxRetries: 1,
    transport: { async create(request, options) {
      const requestedAtUtc = new Date().toISOString(), started = performance.now(), kind = request.text.format.name;
      try {
        const res = await client.responses.create(request, options);
        const usd = costOf(res.usage); spent += usd;
        const row = { label, kind, requestedAtUtc, durationMs: performance.now() - started, model: res.model, usage: res.usage, usd };
        appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); requests.push({ ...row, output_text: res.output_text });
        return res;
      } catch (error) {
        const row = { label, kind, requestedAtUtc, durationMs: performance.now() - started, error: String(error).slice(0, 300), usd: 0 };
        appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); requests.push(row); throw error;
      }
    } } });
  let s = restored[label], status = 'DONE', error = null;
  try {
    for (let i = 1; i <= MAX_STEPS && s.phase !== 'AWAITING_UNDERSTANDING'; i++) {
      if (spent >= USD_CAP) { status = 'USD_CAP'; break; }
      if (s.phase === 'AWAITING_CORRECTION') {
        steps.push({ question: s.message, errorId: s.activeErrorId, answer: ANSWER });
        s = submitFeedbackCommand(s, { type: 'CORRECT', errorId: s.activeErrorId, text: ANSWER }, `${label}-c${i}`);
      } else if (s.phase === 'AWAITING_END_START') {
        steps.push({ endStart: s.message, pendingEnd: s.pendingEnd });
        s = submitFeedbackCommand(s, { type: 'END_START', accept: true }, `${label}-e${i}`);
      } else if (s.phase === 'AWAITING_POST_REPAIR_CHOICE') {
        steps.push({ postRepair: s.message });
        s = submitFeedbackCommand(s, { type: 'REQUEST_EXPLANATION' }, `${label}-x${i}`);
      }
      if (s.phase === 'AWAITING_EVALUATION') {
        const mode = s.evaluationMode, call = await evaluator.evaluate(s);
        s = mode === 'END_EXPLANATION' ? applyFeedbackEndExplanation(s, call.rawOutput) : applyFeedbackAssessment(s, call.rawOutput);
        steps.push({ evaluated: mode, rawOutput: call.rawOutput, normalized: call.metadata.attempts?.map(a => a.normalized ?? null), phase: s.phase, message: s.message });
      } else if (!['AWAITING_CORRECTION', 'AWAITING_END_START', 'AWAITING_POST_REPAIR_CHOICE', 'AWAITING_UNDERSTANDING'].includes(s.phase)) {
        status = 'UNEXPECTED_PHASE'; break;
      }
    }
  } catch (e) { status = 'ERROR'; error = String(e).slice(0, 500); }
  writeFileSync(path, JSON.stringify({ label, status, error, finalPhase: s.phase, pendingEnd: s.pendingEnd,
    endExplanation: s.endExplanation ?? null, steps, requests }, null, 2) + '\n');
  console.log(JSON.stringify({ label, status, phase: s.phase, steps: steps.length, spent: spent.toFixed(4) }));
}
console.log(JSON.stringify({ done: true, spent }));
