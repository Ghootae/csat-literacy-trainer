// 19번 ⑤ P1·N1·N2를 DeepSeek(Pro·Flash high)로 v5.8 SELECTION 판정. sol 기준은 v58-conclusion sol-p1·sol-check 기록 재사용.
// Usage: node scripts/run-v58-deepseek-p1.mjs <deepseek-v4-pro-high|deepseek-flash-high> [selftest]
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';
import { CONFIGS as ADAPTER, createProviderTransport, toChatRequest, isDeepSeekPeak } from './lib/provider-adapter.mjs';

const BASE = 'docs/experiments/v58-conclusion-2026-10-29';
const CONFIGS = {
  'deepseek-v4-pro-high': { ...ADAPTER['deepseek-flash-high'], model: 'deepseek-v4-pro',
    prices: { peak: { input: 1.32, cached: 0.044, output: 3.96 }, offPeak: { input: 0.66, cached: 0.022, output: 1.98 } } },
  'deepseek-flash-high': { ...ADAPTER['deepseek-flash-high'],
    prices: { peak: { input: 0.30, cached: 0.006, output: 1.20 }, offPeak: { input: 0.15, cached: 0.003, output: 0.60 } } },
};
const SCHEDULE = [...Array.from({ length: 10 }, (_, i) => ['P1', i + 1]), ...[1, 2, 3].map(r => ['N1', r]), ...[1, 2, 3].map(r => ['N2', r])];
const USD_CAP = 0.9, TIMEOUT_MS = 240000;
const hash = x => createHash('sha256').update(x).digest('hex');
const records = f => readFileSync(`${BASE}/sol-check/${f}.records.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const costOf = (usage, prices) => usage ? ((usage.input_tokens - (usage.input_tokens_details?.cached_tokens ?? 0)) * prices.input
  + (usage.input_tokens_details?.cached_tokens ?? 0) * prices.cached + usage.output_tokens * prices.output) / 1e6 : 0;

const configName = process.argv[2], config = CONFIGS[configName];
if (!config) throw new Error(`config: ${Object.keys(CONFIGS).join(' | ')}`);
// Inputs come from the sol-check records: same source bundle, choice C5, and student text.
const inputs = Object.fromEntries(['P1-r4', 'N1-r1', 'N2-r1'].map(f => {
  const rows = records(f), selection = rows.find(r => r.event === 'SUBMITTED').session.selections[0];
  return [f.split('-')[0], { source: SourceDirectProblemBundleSchema.parse(rows[0].session.source), choiceId: selection.choiceId, text: selection.rationale.text }];
}));
const sourceHashes = new Set(Object.values(inputs).map(x => hash(JSON.stringify(x.source))));
assert.equal(sourceHashes.size, 1); assert.ok(Object.values(inputs).every(x => x.choiceId === 'C5'));
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md', prompt = readFileSync(promptPath, 'utf8');
const sessionFor = (type, r) => submitFeedbackCommand(createFeedbackSession(`${configName}-${type}-r${r}`, inputs[type].source),
  { type: 'SELECT', choiceId: 'C5', rationale: { mode: 'PROVIDED', text: inputs[type].text } }, `${type}-r${r}`);

// DeepSeek은 이미지 입력이 없어 〈보기〉 그림(MEDIA1)을 JEV 탐색 때 쓴 설명 문장으로 바꾼다(사용자 승인 2026-10-30). sol과의 유일한 입력 차이.
const FIGURE_TEXT = '[그림 설명] 두 용액이 Y자 미세관의 서로 다른 입구로 들어가 합류한 뒤 복합체가 형성되는 과정도';
const withFigureText = request => ({ ...request, input: request.input.map(item => ({ ...item,
  content: item.content.map(part => part.type === 'input_image' ? { type: 'input_text', text: FIGURE_TEXT } : part) })) });

// Self test: the sol-shaped request and the DeepSeek wire request carry the same v5.8 instructions and user content.
let captured = null;
await new OpenAIFeedbackEvaluator({ model: 'gpt-6.1-sol', maxRetries: 0, transport: { async create(req) { captured = req; throw new Error('RUN_LIMIT: capture'); } } })
  .evaluate(sessionFor('P1', 0)).catch(() => {});
assert.equal(captured.instructions, prompt);
assert.equal(captured.input[0].content.filter(p => p.type === 'input_image').length, 1);
const wire = toChatRequest(withFigureText(captured), config);
assert.ok(wire.messages[1].content.includes(FIGURE_TEXT) && wire.messages[1].content.includes(inputs.P1.text));
assert.ok(wire.messages[0].content.startsWith(prompt)); assert.equal(wire.model, config.model); assert.equal(wire.reasoning_effort, 'high');
const outDir = `${BASE}/deepseek/${configName}`; mkdirSync(outDir, { recursive: true });
const meta = { configName, model: config.model, reasoningEffort: config.reasoningEffort, promptPath, promptHash: hash(prompt),
  sourceHash: [...sourceHashes][0], inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.text])), schedule: SCHEDULE,
  figureReplacement: FIGURE_TEXT, timeoutMs: TIMEOUT_MS, maxRetries: 1, usdCap: USD_CAP, prices: config.prices, baseline: 'sol-p1/r1~r3 + sol-check/P1-r4~r10, N1-r1~r3, N2-r1~r3 (gpt-6.1-sol medium, v5.8)' };
if (process.argv[3] === 'selftest') { console.log(JSON.stringify({ selftest: 'passed', ...meta, inputs: undefined })); process.exit(0); }
if (!existsSync(`${outDir}/META.json`)) writeFileSync(`${outDir}/META.json`, JSON.stringify(meta, null, 2) + '\n');

const ledgerPath = `${outDir}/requests.jsonl`;
let spent = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
const base = createProviderTransport({ config, apiKey: process.env[config.keyEnv] });
for (const [type, r] of SCHEDULE) {
  const label = `${type}-r${r}`, path = `${outDir}/${label}.json`;
  if (existsSync(path)) continue;
  if (spent >= USD_CAP) { console.log(JSON.stringify({ stop: 'USD_CAP', spent })); break; }
  const requests = [];
  const evaluator = new OpenAIFeedbackEvaluator({ model: config.model, timeoutMs: TIMEOUT_MS, maxRetries: 1, maxOutputTokens: config.maxTokens,
    transport: { async create(request, options) {
      const requestedAtUtc = new Date().toISOString(), started = performance.now();
      const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
      try {
        const res = await base.create(withFigureText(request), options);
        const usd = costOf(res.usage, isDeepSeekPeak(requestedAtUtc) ? config.prices.peak : config.prices.offPeak);
        spent += usd;
        const row = { label, kind, requestedAtUtc, durationMs: performance.now() - started, model: res.model, finishReason: res.finishReason,
          usage: res.usage, reasoningContentLength: res.reasoningContentLength, peak: isDeepSeekPeak(requestedAtUtc), usd };
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
