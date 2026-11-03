// luna 기호 오독 표적 재현(Q-0030): 공손룡 12번 ④ 정답 선택, 학생이 ⓓ·ⓔ를 틀리게 말한 두 답을 v5.8·luna로 각 10회 SELECTION 판정.
// 입력 답: S2 = v5-provider-compare-1017 S2(뒤바꿈), G2 = v5-contradiction-sufficiency-user-2026-10-21 e9fc 답(둘 다 일반 옷).
// Usage: node --env-file=.env scripts/run-luna-marker-misread-repro.mjs [selftest]
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';

const OUT = 'docs/experiments/luna-marker-misread-count-2026-11-03/repro-v58';
const MODEL = 'gpt-6-luna', USD_CAP = 0.3, TIMEOUT_MS = 120000;
const PRICES = { input: 0.10, cached: 0.01, output: 0.50 }; // USD per 1M tokens, run-v5-diverse-48 LIMITS 기준(cached는 보수적으로 input의 1/10)
const INPUTS = {
  S2: 'd는 빨간 옷만 가리키고, e는 색을 한정하지 않은 일반적인 옷을 가리켜요. 서로 다른 대상을 지시하므로 같다고 한 4번은 틀렸어요.',
  G2: 'd와 e 모두 일반적인 옷을 가리키니까, 4번처럼 속성이 지정되지 않은 말로 속성 있는 대상을 가리키는 문제는 없어. 그래서 4번은 적절하지 않아.',
};
const SCHEDULE = Object.keys(INPUTS).flatMap(type => Array.from({ length: 10 }, (_, i) => [type, i + 1]));
const hash = x => createHash('sha256').update(x).digest('hex');
const costOf = u => u ? ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * PRICES.input
  + (u.input_tokens_details?.cached_tokens ?? 0) * PRICES.cached + u.output_tokens * PRICES.output) / 1e6 : 0;

// 원자료: v5.7 회귀에서 쓴 공손룡 세션 원자료(같은 번들).
const rows = readFileSync('docs/experiments/v57-regression-2026-10-29/cases/G-A2.records.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const source = SourceDirectProblemBundleSchema.parse(rows[0].session.source);
assert.equal(source.questionId, 'gongsun-long-later-mohists-q12'); assert.equal(source.answerChoiceId, 'C4');
// 원문 대조: 저장된 원래 답과 글자가 같은지 확인.
assert.equal(JSON.parse(readFileSync('docs/experiments/v5-provider-compare-1017-2026-10-22/gpt-6-luna-medium/S2-r1.json', 'utf8')).response, INPUTS.S2);
assert.ok(readFileSync('docs/experiments/luna-marker-misread-count-2026-11-03/candidates.jsonl', 'utf8').includes(INPUTS.G2));
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md', prompt = readFileSync(promptPath, 'utf8');
const sessionFor = (type, r) => submitFeedbackCommand(createFeedbackSession(`marker-${type}-r${r}`, source),
  { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text: INPUTS[type] } }, `${type}-r${r}`);

let captured = null;
await new OpenAIFeedbackEvaluator({ model: MODEL, maxRetries: 0, transport: { async create(req) { captured = req; throw new Error('RUN_LIMIT: capture'); } } })
  .evaluate(sessionFor('S2', 0)).catch(() => {});
assert.equal(captured.instructions, prompt); assert.equal(captured.model, MODEL);
const meta = { model: MODEL, reasoningEffort: captured.reasoning?.effort ?? null, promptPath, promptHash: hash(prompt),
  sourceHash: hash(JSON.stringify(source)), inputs: INPUTS, schedule: SCHEDULE, usdCap: USD_CAP, prices: PRICES, timeoutMs: TIMEOUT_MS, maxRetries: 1 };
if (process.argv[2] === 'selftest') { console.log(JSON.stringify({ selftest: 'passed', ...meta, inputs: undefined, schedule: SCHEDULE.length })); process.exit(0); }
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
  writeFileSync(path, JSON.stringify({ label, type, replicate: r, response: INPUTS[type], status, error, selectionMs: performance.now() - started,
    server: { phase: after.phase, outcome: after.result?.outcome ?? null, message: after.message ?? null },
    attempts: (call?.metadata.attempts ?? []).map(({ kind, outcome, error: e }) => ({ kind, outcome, error: e ? String(e).slice(0, 300) : null })),
    rawOutput: raw ?? null, requests }, null, 2) + '\n');
  console.log(JSON.stringify({ label, status, judge: raw?.contentAssessment, phase: after.phase, sec: Math.round((performance.now() - started) / 1000), spent: spent.toFixed(4) }));
}
console.log(JSON.stringify({ done: true, spent }));
