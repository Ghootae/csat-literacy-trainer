// 공손룡 12번 공급자 비교 재시험(DeepSeek 1017 포함, 현재 운영 v5 판정기). docs/handoffs/2026-10-22-v5-provider-compare-1017.md
// Modes: prepare | preflight <config> | run <config> | summary. Only preflight and run call an API.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment, applyFeedbackEndExplanation,
  feedbackRequestContent, OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';
import { CONFIGS as ADAPTER_CONFIGS, PRICES, toChatRequest, createProviderTransport, usageCosts } from './lib/provider-adapter.mjs';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const jsonHash = x => hash(JSON.stringify(x));
const serialize = x => JSON.stringify(x, null, 2) + '\n';
const save = (p, x) => writeFileSync(p, serialize(x), { flag: 'wx' });
const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1);
};
const formatErrorKind = (error, rawOutput) => typeof rawOutput === 'string' ? 'JSON_PARSE'
  : /CLAIMS_CONTRACT:/u.test(error) ? 'CLAIMS_CONTRACT' : /"code":\s*"(?:invalid_|unrecognized_|too_)/u.test(error) ? 'OPERATING_SCHEMA' : null;

const OPENAI_PRICES = { 'gpt-6.1-sol': { input: 2.00, cached: 2.00, output: 10.00 }, 'gpt-6-luna': { input: 0.10, cached: 0.10, output: 0.50 } };
const openaiConfig = model => ({ provider: 'openai', model, reasoningEffort: 'medium', keyEnv: 'OPENAI_API_KEY', maxTokens: 8000 });
export const CONFIGS = { 'deepseek-flash-low': ADAPTER_CONFIGS['deepseek-flash-low'], 'deepseek-flash-high': ADAPTER_CONFIGS['deepseek-flash-high'],
  'gemini-3.8-flash-medium': ADAPTER_CONFIGS['gemini-3.8-flash-medium'],
  'gpt-6.1-sol-medium': openaiConfig('gpt-6.1-sol'), 'gpt-6-luna-medium': openaiConfig('gpt-6-luna') };
const ratesOf = config => config.provider === 'openai' ? OPENAI_PRICES[config.model] : PRICES[config.provider];
// OpenAI cached input is billed at the input rate (conservative); usage.output_tokens already includes reasoning.
const costsOf = (usage, config, utc) => {
  if (config.provider !== 'openai') return usageCosts(usage, config.provider, utc);
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const r = ratesOf(config), usd = (usage.input_tokens * r.input + usage.output_tokens * r.output) / 1e6;
  return { conservativeUsd: usd, actualUsd: usd, peak: null, costIfReasoningSeparate: null };
};
const openaiTransport = () => { let client; return { create: (request, options) => (client ??= new OpenAI({ maxRetries: 0 })).responses.create(request, options) }; };
const slim = r => ({ output_text: r.output_text, status: r.status, model: r.model, id: r.id, usage: r.usage, rawUsage: r.rawUsage,
  finishReason: r.finishReason, reasoningContentLength: r.reasoningContentLength });
const labelFor = cell => `${cell.type}-r${cell.r}`;

const sumUsage = (ends, f) => ends.reduce((n, e) => n + (f(e.usage) ?? 0), 0);
function buildResults({ dir, configName, schedule, cases, semanticReview, stop, newRequests }) {
  const runDir = `${dir}/${configName}`, ledgerPath = `${runDir}/requests.jsonl`;
  const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  const rows = schedule.map(c => `${runDir}/${labelFor(c)}.json`).filter(existsSync).map(read);
  const ends = ledger.filter(x => x.event === 'END'), separate = ends.filter(e => e.costs?.costIfReasoningSeparate);
  const group = xs => ({ cells: xs.length, expectedMatch: xs.filter(x => x.expectedMatch).length, valid: xs.filter(x => x.status === 'VALID').length });
  const count = keys => keys.reduce((m, k) => ({ ...m, [k ?? 'none']: (m[k ?? 'none'] ?? 0) + 1 }), {});
  const timing = f => { const v = rows.map(f).filter(x => x != null); return { median: quantile(v, 0.5), p90: quantile(v, 0.9) }; };
  return { config: configName, requests: ledger.filter(s => s.event === 'START').length, newRequests, stop,
    conservativeUsd: ends.reduce((n, e) => n + (e.costs?.conservativeUsd ?? 0), 0), actualUsd: ends.reduce((n, e) => n + (e.costs?.actualUsd ?? 0), 0),
    completedCells: rows.length, plannedCells: schedule.length,
    nonBoundary: group(rows.filter(x => !x.boundary)), boundary: group(rows.filter(x => x.boundary)),
    byResponse: Object.fromEntries(cases.map(c => [c.type, group(rows.filter(x => x.type === c.type))])),
    byPhase: count(rows.map(x => x.after.phase)), byEndReason: count(rows.map(x => x.after.pendingEnd?.endReason)),
    selectionMs: timing(x => x.selectionMs), endExplanationMs: timing(x => x.endExplanationMs),
    cellMs: timing(x => x.selectionMs + (x.endExplanationMs ?? 0)),
    formatErrors: Object.fromEntries(['JSON_PARSE', 'OPERATING_SCHEMA', 'CLAIMS_CONTRACT'].map(k => [k, rows.flatMap(x => x.attempts).filter(x => x.formatError === k).length])),
    retries: rows.reduce((n, x) => n + x.retryCount, 0), evaluationErrors: rows.filter(x => x.status === 'EVALUATION_ERROR').length,
    tokens: { input: sumUsage(ends, u => u?.input_tokens), output: sumUsage(ends, u => u?.output_tokens),
      cached: sumUsage(ends, u => u?.input_tokens_details?.cached_tokens), reasoning: sumUsage(ends, u => u?.output_tokens_details?.reasoning_tokens),
      reasoningUnknownRequests: ends.filter(e => e.usage?.output_tokens_details?.reasoning_tokens == null).length },
    costIfReasoningSeparate: { knownRequests: separate.length, unknownRequests: ends.length - separate.length,
      conservativeUsd: separate.reduce((n, e) => n + e.costs.costIfReasoningSeparate.conservativeUsd, 0),
      actualUsd: separate.reduce((n, e) => n + e.costs.costIfReasoningSeparate.actualUsd, 0) },
    actualModels: [...new Set(ends.map(e => e.model).filter(Boolean))], semanticReview };
}

export async function main({ mode = 'prepare', config: configName, dir = 'docs/experiments/v5-provider-compare-1017-2026-10-22',
  inputDir = 'docs/experiments/v5-provider-compare-gongsun-2026-10-07', fetchImpl, apiKey, transport: injected, limitOverride = {} } = {}) {
  if (!['prepare', 'preflight', 'run', 'summary'].includes(mode)) throw new Error('Expected prepare | preflight <config> | run <config> | summary');
  const config = CONFIGS[configName];
  if (['preflight', 'run'].includes(mode) && !Object.hasOwn(CONFIGS, configName)) throw new Error('Unknown config');
  if (mode === 'preflight') {
    const schema = { type: 'object', properties: { answer: { type: 'integer' } }, required: ['answer'], additionalProperties: false };
    const path = `${dir}/preflight-${configName}.json`;
    if (existsSync(path)) throw new Error('Preflight already exists');
    const openai = config.provider === 'openai';
    const request = { instructions: '다음 JSON Schema에 맞춰 답한다',
      input: [{ role: 'user', content: [{ type: 'input_text', text: '2와 3을 더한 값을 answer에 넣어라' }] }],
      text: { format: openai ? { type: 'json_schema', name: 'preflight', strict: true, schema } : { name: 'preflight', schema } },
      ...(openai ? { model: config.model, store: false, reasoning: { effort: config.reasoningEffort }, max_output_tokens: config.maxTokens } : {}) };
    const base = injected ?? (openai ? openaiTransport() : createProviderTransport({ config, fetchImpl, apiKey: apiKey ?? process.env[config.keyEnv] }));
    const response = slim(await base.create(request, { timeout: 90000, maxRetries: 0 }));
    let parsed = null, parseError = null;
    try { parsed = JSON.parse(response.output_text); } catch (e) { parseError = String(e); }
    const result = { ...response, parsed, parseError };
    mkdirSync(dir, { recursive: true }); save(path, result);
    return result;
  }
  // Inputs are the 10-07 frozen files; their hashes must match the old FROZEN.json.
  const old = read(`${inputDir}/FROZEN.json`), sourcePath = `${inputDir}/source.json`, casesPath = `${inputDir}/cases.json`;
  const source = SourceDirectProblemBundleSchema.parse(read(sourcePath)), cases = read(casesPath), { responses, choiceId, schedule } = old;
  assert.equal(jsonHash(source), old.sourceHash, 'sourceHash changed'); assert.equal(jsonHash(responses), old.responsesHash, 'responsesHash changed');
  assert.equal(jsonHash(cases), old.casesHash, 'casesHash changed');
  assert.equal(choiceId, 'C4'); assert.equal(schedule.length, 33);
  assert.deepEqual(cases.map(c => [c.type, c.text, c.choiceId]), Object.entries(responses).map(([type, text]) => [type, text, choiceId]));
  const v5Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md', v5 = readFileSync(v5Path, 'utf8');
  const sessionFor = (cell, name) => submitFeedbackCommand(createFeedbackSession(`${name}-${labelFor(cell)}`, source),
    { type: 'SELECT', choiceId, rationale: { mode: 'PROVIDED', text: responses[cell.type] } }, 'o1');
  const evaluatorFor = (c, transport) => new OpenAIFeedbackEvaluator({ model: c.model, timeoutMs: 90000, maxRetries: 1, transport,
    ...(c.provider === 'openai' ? {} : { maxOutputTokens: c.maxTokens }) });
  // Self test: the first ASSESSMENT request is the same for every config except the model and wire conversion.
  const captureFirst = async (c, session) => {
    let seen = null;
    await new OpenAIFeedbackEvaluator({ model: c.model, maxRetries: 0, transport: { async create(request) { seen = request; throw new Error('RUN_LIMIT: capture'); } } })
      .evaluate(session).catch(() => {});
    return seen;
  };
  for (const cell of schedule) {
    const requests = await Promise.all(Object.entries(CONFIGS).map(([name, c]) => captureFirst(c, sessionFor(cell, name))));
    const [first, ...rest] = requests.map(({ model: _model, ...r }) => r);
    assert.equal(first.instructions, v5); assert.equal(first.text.format.name, 'problem_feedback_v4_assessment');
    for (const r of rest) assert.deepEqual(r, first);
    const input = feedbackRequestContent(sessionFor(cell, 'x'));
    assert.deepEqual(first.input, [{ role: 'user', content: input }]);
    Object.values(CONFIGS).filter(c => c.provider !== 'openai').forEach(c => {
      const chat = toChatRequest(requests[0], c);
      assert.equal(chat.messages[1].content, input.map(x => x.text).join('\n\n')); assert.ok(chat.messages[0].content.startsWith(v5));
    });
  }
  const distDir = 'packages/pipeline/dist/problem-solving';
  const filePaths = [v5Path, `${inputDir}/FROZEN.json`, sourcePath, casesPath, 'scripts/lib/provider-adapter.mjs',
    ...readdirSync(distDir).filter(p => /^feedback-v[45].*\.js$/u.test(p)).sort().map(p => `${distDir}/${p}`)];
  const frozen = {
    fileHashes: Object.fromEntries(filePaths.map(p => [p, hash(readFileSync(p))])), runnerHash: hash(readFileSync(new URL(import.meta.url))),
    sourceHash: jsonHash(source), responsesHash: jsonHash(responses), casesHash: jsonHash(cases),
    configs: CONFIGS, pricesPerMillion: { ...PRICES, openai: OPENAI_PRICES }, priceSource: 'adapter PRICES; sol/luna as scripts/run-v5-live-check.mjs BASE_LIMITS; OpenAI cached input billed at input rate',
    deepseekPeakUtc: 'Monday-Friday [01:00,04:00), [06:00,10:00)',
    responses, choiceId, schedule, maxRetries: 1, timeoutMs: 90000, maxRequests: 100, usdCap: 1.5,
    quantiles: 'Linear interpolation at (n - 1) * p',
    design: '현재 운영 v5 OpenAIFeedbackEvaluator(지시문 source-direct-problem-feedback-v5.md). 최초 선택 판정과 종료 설명(END_START accept)까지만.',
    semanticReview: '기대 필드 자동 일치는 의미 정확도 검토를 대신하지 않는다.',
  };
  const frozenPath = `${dir}/FROZEN.json`;
  if (existsSync(frozenPath)) assert.equal(readFileSync(frozenPath, 'utf8'), serialize(frozen), 'Frozen artifact changed: FROZEN.json');
  else if (mode !== 'prepare') throw new Error('Run prepare first: FROZEN.json');
  if (mode === 'prepare') {
    mkdirSync(dir, { recursive: true });
    if (!existsSync(frozenPath)) save(frozenPath, frozen);
    const result = { prepared: true, cellsPerConfig: schedule.length, configs: Object.keys(CONFIGS).length, selfTests: 'passed', frozenHash: jsonHash(frozen), externalRequests: 0 };
    console.log(JSON.stringify(result)); return result;
  }
  const resultsFor = (name, extra = {}) => buildResults({ dir, configName: name, schedule, cases, semanticReview: frozen.semanticReview, stop: null, newRequests: 0, ...extra });
  if (mode === 'summary') {
    const summary = Object.fromEntries(Object.keys(CONFIGS).map(name => [name, read(`${dir}/${name}/RESULTS.json`)]));
    const sec = x => x.median == null ? '-' : `${(x.median / 1000).toFixed(1)} / ${(x.p90 / 1000).toFixed(1)}`;
    const md = ['# 공급자 비교 재시험 요약 (자동 검사 일치는 의미 검토를 대신하지 않음)', '',
      '| 설정 | 완료/계획 | 일치(비경계) | 일치(경계) | 판정 실패 | 재시도 | 형식 오류 | 칸 중앙/p90(초) | 요청 | 입력 | 출력 | 보수 $ | 실제 $ | 실제 모델 |', '|' + ' --- |'.repeat(14),
      ...Object.entries(summary).map(([name, r]) => `| ${name} | ${r.completedCells}/${r.plannedCells} | ${r.nonBoundary.expectedMatch}/${r.nonBoundary.cells} | ${r.boundary.expectedMatch}/${r.boundary.cells} | ${r.evaluationErrors} | ${r.retries} | ${Object.values(r.formatErrors).reduce((n, v) => n + v, 0)} | ${sec(r.cellMs)} | ${r.requests} | ${r.tokens.input} | ${r.tokens.output} | ${r.conservativeUsd.toFixed(4)} | ${r.actualUsd.toFixed(4)} | ${r.actualModels.join(', ')} |`), ''];
    writeFileSync(`${dir}/SUMMARY.json`, serialize(summary)); writeFileSync(`${dir}/SUMMARY.md`, md.join('\n'));
    return summary;
  }
  const runDir = `${dir}/${configName}`; mkdirSync(runDir, { recursive: true });
  const ledgerPath = `${runDir}/requests.jsonl`;
  const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  if (ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId))) {
    throw new Error('RUN_LIMIT: START without END; resolve incomplete ledger before resume');
  }
  const record = row => { appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); ledger.push(row); };
  const account = () => ({ requests: ledger.filter(x => x.event === 'START').length,
    conservativeUsd: ledger.filter(x => x.event === 'END').reduce((n, e) => n + (e.costs?.conservativeUsd ?? 0), 0),
    unknownReservedUsd: ledger.filter(x => x.event === 'START').reduce((n, s) => n +
      (ledger.find(e => e.event === 'END' && e.requestId === s.requestId)?.costs ? 0 : s.reservedUsd), 0) });
  const cap = { maxRequests: frozen.maxRequests, usdCap: frozen.usdCap, ...limitOverride };
  const beforeRequests = account().requests;
  const base = injected ?? (config.provider === 'openai' ? openaiTransport() : createProviderTransport({ config, fetchImpl, apiKey: apiKey ?? process.env[config.keyEnv] }));
  const rates = ratesOf(config);
  let stop = null;
  for (const cell of schedule) {
    const label = labelFor(cell), path = `${runDir}/${label}.json`;
    if (existsSync(path)) continue;
    const cellStarted = performance.now(), rawOutputs = [], requestRecords = [];
    let assessmentRaw = null;
    const evaluator = evaluatorFor(config, { async create(request, options) {
      if (stop) throw new Error(stop);
      const wire = config.provider === 'openai' ? request : toChatRequest(request, config);
      const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
      const reservedUsd = (Buffer.byteLength(JSON.stringify(wire)) * rates.input + config.maxTokens * rates.output) / 1e6;
      const a = account();
      if (a.requests >= cap.maxRequests || a.conservativeUsd + a.unknownReservedUsd + reservedUsd > cap.usdCap) {
        stop = 'RUN_LIMIT: request/cost limit'; throw new Error(stop);
      }
      const requestId = `${label}-${a.requests + 1}`, started = performance.now(), requestedAtUtc = new Date().toISOString();
      const start = { event: 'START', requestId, label, kind, config: configName, requestedAtUtc, reservedUsd,
        requestHash: jsonHash(wire), instructionsHash: hash(request.instructions) };
      record(start); requestRecords.push(start);
      let response;
      try { response = slim(await base.create(request, options)); }
      catch (error) {
        const status = error.httpStatus ?? error.status ?? null;
        if (/RUN_LIMIT:/u.test(String(error))) stop = error.message;
        else if (config.provider === 'openai' && status >= 400 && status < 500 && ![408, 409, 429].includes(status)) stop = `RUN_LIMIT: HTTP ${status}: ${error.message}`.slice(0, 300);
        const end = { event: 'END', requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started,
          error: String(error), costs: null, rawUsage: { httpStatus: status, usage: null } };
        record(end); requestRecords.push(end); throw error;
      }
      const end = { event: 'END', requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started,
        costs: costsOf(response.usage, config, requestedAtUtc), ...response };
      record(end); requestRecords.push(end); rawOutputs.push({ requestId, kind, response: structuredClone(response) });
      if (kind === 'ASSESSMENT') { try { assessmentRaw = JSON.parse(response.output_text); } catch { assessmentRaw = null; } }
      return response;
    } });
    const session = sessionFor(cell, configName);
    let call = null, endCall = null, after = session, status = 'VALID', error = null, errorStage = null, selectionMs, endExplanationMs = null;
    let timer = performance.now();
    try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
    catch (e) { call = e.call ?? null; status = stop ? 'BUDGET_STOP' : 'EVALUATION_ERROR'; error = String(e); errorStage = 'SELECTION'; }
    selectionMs = performance.now() - timer;
    if (status === 'VALID' && after.phase === 'AWAITING_END_START') {
      timer = performance.now();
      const pending = submitFeedbackCommand(after, { type: 'END_START', accept: true }, 'o2');
      try { endCall = await evaluator.evaluate(pending); after = applyFeedbackEndExplanation(pending, endCall.rawOutput); }
      catch (e) { endCall = e.call ?? null; status = stop ? 'BUDGET_STOP' : 'EVALUATION_ERROR'; error = String(e); errorStage = 'END_EXPLANATION'; }
      endExplanationMs = performance.now() - timer;
    }
    const attempts = [...(call?.metadata.attempts ?? []), ...(endCall?.metadata.attempts ?? [])]
      .map(({ kind, outcome, error, rawOutput }) => ({ kind, outcome, error, formatError: formatErrorKind(error ?? '', outcome === 'ERROR' ? rawOutput : null) }));
    const spec = cases.find(c => c.type === cell.type), expected = spec.expected, raw = call?.rawOutput;
    const actual = { reconstructability: raw?.reconstructability ?? null, rationaleImpliedVerdict: raw?.rationaleImpliedVerdict ?? null,
      contentAssessment: raw?.contentAssessment ?? null, phase: after.phase, outcome: after.result?.outcome ?? null, endReason: after.pendingEnd?.endReason ?? null };
    const ok = status === 'VALID';
    const checks = { reconstructability: ok && actual.reconstructability === expected.reconstructability,
      rationaleImpliedVerdict: ok && actual.rationaleImpliedVerdict === expected.rationaleImpliedVerdict,
      contentAssessment: ok && expected.contentAssessment.includes(actual.contentAssessment),
      path: ok && (actual.contentAssessment === 'SUPPORTED' ? after.phase !== 'AWAITING_CORRECTION'
        : actual.contentAssessment === 'ERROR' ? after.phase === 'AWAITING_CORRECTION' : false) };
    const result = { config: configName, type: cell.type, replicate: cell.r, response: responses[cell.type], status, error, errorStage,
      selectionMs, endExplanationMs, requests: requestRecords, rawOutputs, calls: { selection: call?.metadata ?? null, endExplanation: endCall?.metadata ?? null },
      attempts, retryCount: Math.max(0, attempts.filter(a => a.outcome === 'ERROR').length - (ok ? 0 : 1)),
      actualModels: [...new Set(rawOutputs.map(x => x.response.model))],
      assessment: call?.rawOutput ?? null, assessmentRaw,
      after: { phase: after.phase, result: after.result, pendingEnd: after.pendingEnd,
        errors: after.errors.map(({ kind, description, studentEvidence, question }) => ({ kind, description, studentEvidence, question })),
        selectionComparison: after.selectionComparisons.at(-1) ?? null },
      endExplanation: after.endExplanation, actual, checks, expectedMatch: Object.values(checks).every(Boolean), boundary: spec.boundary,
      cellMs: performance.now() - cellStarted };
    // A budget stop is resumable once the ledger issue is resolved; never mark it a completed cell.
    if (!stop) save(path, result);
    console.log(JSON.stringify({ config: configName, label, status, expectedMatch: result.expectedMatch }));
    if (stop) break;
  }
  const summary = resultsFor(configName, { stop, newRequests: account().requests - beforeRequests });
  writeFileSync(`${runDir}/RESULTS.json`, serialize(summary)); console.log(JSON.stringify(summary)); return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({ mode: process.argv[2] ?? 'prepare', config: process.argv[3] });
}
