// 19번 ⑤ P1·N1·N2를 gpt-6.1-terra(medium)로 v5.8 SELECTION 판정. sol 기준은 v58-conclusion sol-p1·sol-check 기록 재사용.
// 그림(〈보기〉 이미지)은 sol과 같이 그대로 보낸다(대체 없음). 근거: docs/handoffs/2026-11-04-terra-vs-sol-runners.md
// Usage: node --env-file-if-exists=.env scripts/run-v58-terra-p1.mjs [selftest]
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';

const BASE = 'docs/experiments/v58-conclusion-2026-10-29', OUT = 'docs/experiments/terra-vs-sol-2026-11-04/B-p1';
const MODEL = 'gpt-6.1-terra', PRICES = { input: 1, cached: 0.05, output: 5 }; // USD per 1M tokens
const SCHEDULE = [...Array.from({ length: 10 }, (_, i) => ['P1', i + 1]), ...[1, 2, 3].map(r => ['N1', r]), ...[1, 2, 3].map(r => ['N2', r])];
const USD_CAP = 0.8, TIMEOUT_MS = 240000;
const hash = x => createHash('sha256').update(x).digest('hex');
const records = f => readFileSync(`${BASE}/sol-check/${f}.records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const costOf = u => u ? ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * PRICES.input
  + (u.input_tokens_details?.cached_tokens ?? 0) * PRICES.cached + u.output_tokens * PRICES.output) / 1e6 : 0;

// 입력은 sol-check 기록에서: 같은 원자료 번들, 선지 C5, 학생 글.
const inputs = Object.fromEntries(['P1-r4', 'N1-r1', 'N2-r1'].map(f => {
  const rows = records(f), selection = rows.find(r => r.event === 'SUBMITTED').session.selections[0];
  return [f.split('-')[0], { source: SourceDirectProblemBundleSchema.parse(rows[0].session.source), choiceId: selection.choiceId, text: selection.rationale.text }];
}));
const sourceHashes = new Set(Object.values(inputs).map(x => hash(JSON.stringify(x.source))));
assert.equal(sourceHashes.size, 1); assert.ok(Object.values(inputs).every(x => x.choiceId === 'C5'));
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md', prompt = readFileSync(promptPath, 'utf8');
const sessionFor = (type, r) => submitFeedbackCommand(createFeedbackSession(`terra-${type}-r${r}`, inputs[type].source),
  { type: 'SELECT', choiceId: 'C5', rationale: { mode: 'PROVIDED', text: inputs[type].text } }, `${type}-r${r}`);

// 시험: 외부 호출 없이 요청 모양만 잡는다(sol 기준과 같은 지시문·모델 외 입력, 그림 이미지 유지).
let captured = null;
await new OpenAIFeedbackEvaluator({ model: MODEL, maxRetries: 0, transport: { async create(req) { captured = req; throw new Error('RUN_LIMIT: capture'); } } })
  .evaluate(sessionFor('P1', 0)).catch(() => {});
assert.equal(captured.instructions, prompt); assert.equal(captured.model, MODEL); assert.equal(captured.reasoning?.effort, 'medium');
assert.equal(captured.input[0].content.filter(p => p.type === 'input_image').length, 1);
assert.ok(JSON.stringify(captured.input).includes(inputs.P1.text));
const meta = { model: MODEL, reasoningEffort: captured.reasoning.effort, promptPath, promptHash: hash(prompt), sourceHash: [...sourceHashes][0],
  inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.text])), schedule: SCHEDULE, figureReplacement: null, timeoutMs: TIMEOUT_MS, maxRetries: 1,
  usdCap: USD_CAP, prices: PRICES, baseline: 'sol-p1/r1~r3 + sol-check/P1-r4~r10, N1-r1~r3, N2-r1~r3 (gpt-6.1-sol medium, v5.8)' };
if (process.argv[2] === 'selftest') { console.log(JSON.stringify({ selftest: 'passed', externalRequests: 0, ...meta, inputs: undefined, schedule: SCHEDULE.length })); process.exit(0); }
mkdirSync(OUT, { recursive: true });
if (!existsSync(`${OUT}/META.json`)) writeFileSync(`${OUT}/META.json`, JSON.stringify(meta, null, 2) + '\n');

const ledgerPath = `${OUT}/requests.jsonl`;
let spent = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
const client = new OpenAI({ maxRetries: 0 });
for (const [type, r] of SCHEDULE) {
  const label = `${type}-r${r}`, path = `${OUT}/${label}.json`;
  if (existsSync(path)) continue;
  if (spent >= USD_CAP) { console.log(JSON.stringify({ stop: 'USD_CAP', spent })); break; }
  const requests = [];
  const evaluator = new OpenAIFeedbackEvaluator({ model: MODEL, timeoutMs: TIMEOUT_MS, maxRetries: 1,
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
  const session = sessionFor(type, r), started = performance.now();
  let call = null, after = session, status = 'VALID', error = null;
  try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
  catch (e) { call = e.call ?? null; status = 'EVALUATION_ERROR'; error = String(e).slice(0, 500); }
  const raw = call?.rawOutput;
  const result = { label, type, replicate: r, status, error, selectionMs: performance.now() - started,
    judge: raw ? { contentAssessment: raw.contentAssessment, insufficiencyKind: raw.insufficiencyKind ?? null, reconstructability: raw.reconstructability,
      rationaleImpliedVerdict: raw.rationaleImpliedVerdict, reason: raw.reason } : null,
    server: { phase: after.phase, outcome: after.result?.outcome ?? null, message: after.message ?? null },
    attempts: (call?.metadata.attempts ?? []).map(({ kind, outcome, error: e }) => ({ kind, outcome, error: e ? String(e).slice(0, 300) : null })),
    assessmentAttempt: call?.metadata.attempts?.find(a => a.kind === 'ASSESSMENT' && a.outcome === 'SUCCESS')?.rawOutput ?? null,
    rawOutput: raw ?? null, requests };
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ label, status, judge: result.judge?.contentAssessment, phase: after.phase, sec: Math.round(result.selectionMs / 1000), spent: spent.toFixed(4) }));
}
console.log(JSON.stringify({ done: true, spent }));
