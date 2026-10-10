import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand,
  applyFeedbackAssessment, feedbackRequestContent, feedbackObservationText,
  OpenAIFeedbackEvaluator, FeedbackSelectionAssessmentSchema } from '../packages/pipeline/dist/index.js';
import { sourceBindingSha256 } from './lib/marker-gloss-validation.mjs';
import { CLAIM_BLOCK, QUOTE_BLOCK, validateClaims, instructionsFor, extendedSelectionSchema, transformRequest } from './lib/v5-marker-judgment.mjs';
import { instructionsFor as comparisonInstructions, expectedChecks } from './lib/v5-substitution-check.mjs';
import { CONFIGS, PRICES, GEMINI_SCHEMA_RULE, toGeminiSchema, toChatRequest, createProviderTransport, usageCosts } from './lib/provider-adapter.mjs';

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
const formatErrorKind = error => /JSON_PARSE:/u.test(error) ? 'JSON_PARSE'
  : /OPERATING_SCHEMA:/u.test(error) ? 'OPERATING_SCHEMA' : /CLAIMS_CONTRACT:/u.test(error) ? 'CLAIMS_CONTRACT'
    : /"code":\s*"(?:invalid_|unrecognized_|too_)/u.test(error) ? 'OPERATING_SCHEMA' : null;

export async function main({ mode = 'prepare', config: configName,
  dir = 'docs/experiments/v5-provider-compare-gongsun-2026-10-07', fetchImpl, apiKey } = {}) {
  if (!['prepare', 'preflight', 'run'].includes(mode)) throw new Error('Expected prepare | preflight <config> | run <config>');
  const config = CONFIGS[configName];
  if (mode !== 'prepare' && !Object.hasOwn(CONFIGS, configName)) throw new Error('Unknown config');
  const provider = () => createProviderTransport({ config, fetchImpl, apiKey: apiKey ?? process.env[config.keyEnv] });
  if (mode === 'preflight') {
    const schema = { type: 'object', properties: { answer: { type: 'integer' } }, required: ['answer'], additionalProperties: false };
    const path = `${dir}/preflight-${configName}.json`;
    if (existsSync(path)) throw new Error('Preflight already exists');
    const response = await provider().create({ instructions: '다음 JSON Schema에 맞춰 답한다',
      input: [{ role: 'user', content: [{ type: 'input_text', text: '2와 3을 더한 값을 answer에 넣어라' }] }],
      text: { format: { name: 'preflight', schema } } }, { timeout: 90000 });
    let parsed = null, parseError = null;
    try { parsed = JSON.parse(response.output_text); } catch (e) { parseError = String(e); }
    const result = { ...response, parsed, parseError };
    mkdirSync(dir, { recursive: true }); save(path, result);
    return result;
  }
  const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
  const productPath = `${FIX}/public/gongsun-long-later-mohists-q12.json`;
  const basePath = 'docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json';
  const answerPath = `${FIX}/gongsun-long-later-mohists-q12.json`;
  const responsesPath = 'docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json';
  const casesPath = 'docs/experiments/v5-substitution-check-gongsun-2026-10-07/cases.json';
  const product = read(productPath), base = read(basePath), answer = read(answerPath);
  const source = SourceDirectProblemBundleSchema.parse({ ...base, passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
  assert.equal(source.stem, product.stem);
  assert.deepEqual(source.choices.map(c => [c.choiceId, c.text]), product.choices.map(c => [c.choiceId, c.text]));
  assert.equal(source.answerChoiceId, answer.answerChoiceId); assert.equal(source.stemPolarity, answer.stemPolarity);
  const { responses, choiceId } = read(responsesPath);
  assert.deepEqual(Object.keys(responses).sort(), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']); assert.equal(choiceId, 'C4');
  Object.assign(responses, {
    X1: 'd는 갑이 들고 있는 옷이고, e는 빨간 옷이라 서로 다른 대상이니 4번은 틀렸어요.',
    X2: 'd는 옷장 안에 있는 옷만 가리키고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.',
    X3: 'd는 옷장에 있는 빨간 옷이고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.',
  });
  const cases = read(casesPath);
  assert.deepEqual(cases.map(c => [c.type, c.text, c.choiceId]), Object.entries(responses).map(([type, text]) => [type, text, choiceId]));
  const v5Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md';
  const v4Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md';
  const v5 = readFileSync(v5Path, 'utf8'), baseline = readFileSync(v4Path, 'utf8');
  const prompts = { methods: instructionsFor(v5, 'v5_methods') };
  assert.equal(hash(prompts.methods), hash(comparisonInstructions(v5, 'methods')));
  const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema), extended = extendedSelectionSchema(schema);
  const types = Object.keys(responses);
  const schedule = [1, 2, 3].flatMap(r => [...types.slice(r - 1), ...types.slice(0, r - 1)].map(type => ({ r, type })));
  const labelFor = cell => `${cell.type}-r${cell.r}`;
  const sessionFor = (cell, name) => submitFeedbackCommand(createFeedbackSession(`${name}-${labelFor(cell)}`, source),
    { type: 'SELECT', choiceId, rationale: { mode: 'PROVIDED', text: responses[cell.type] } }, 'o1');
  const transform = request => transformRequest(request, { arm: 'v5_methods', baseline, instructions: prompts.methods, selectionSchema: schema });
  for (const cell of schedule) {
    const inputs = Object.keys(CONFIGS).map(name => feedbackRequestContent(sessionFor(cell, name)));
    assert.deepEqual(inputs[0], inputs[1]); assert.deepEqual(inputs[0], inputs[2]);
    const request = { instructions: baseline, input: [{ role: 'user', content: inputs[0] }],
      text: { format: { name: 'problem_feedback_v4_assessment', schema } } };
    const outgoing = transform(request);
    assert.deepEqual(outgoing.input, request.input); assert.deepEqual(outgoing.text.format.schema, extended);
    for (const c of Object.values(CONFIGS)) assert.equal(toChatRequest(outgoing, c).messages[1].content, inputs[0].map(x => x.text).join('\n\n'));
  }
  const distDir = 'packages/pipeline/dist/problem-solving';
  const filePaths = [v5Path, v4Path, productPath, basePath, answerPath, responsesPath, casesPath,
    'scripts/lib/provider-adapter.mjs', 'scripts/lib/v5-marker-judgment.mjs', 'scripts/lib/v5-substitution-check.mjs',
    'scripts/lib/marker-gloss-validation.mjs',
    ...readdirSync(distDir).filter(p => /^feedback-v4.*\.js$/u.test(p)).sort().map(p => `${distDir}/${p}`)];
  const frozen = {
    fileHashes: Object.fromEntries(filePaths.map(p => [p, hash(readFileSync(p))])), runnerHash: hash(readFileSync(new URL(import.meta.url))),
    blocks: { CLAIM_BLOCK: hash(CLAIM_BLOCK), QUOTE_BLOCK: hash(QUOTE_BLOCK) },
    sourceHash: jsonHash(source), sourceBindingSha256: sourceBindingSha256(source), responsesHash: jsonHash(responses),
    promptsHash: jsonHash(prompts), methodsInstructionsHash: hash(prompts.methods), casesHash: jsonHash(cases),
    schemaConversion: { rule: GEMINI_SCHEMA_RULE, beforeHash: jsonHash(extended), afterHash: jsonHash(toGeminiSchema(extended)) },
    configs: CONFIGS, pricesPerMillion: PRICES, priceSource: '2026-10-07 handoff section 4 (user/Claude supplied)',
    deepseekPeakUtc: 'Monday-Friday [01:00,04:00), [06:00,10:00)',
    responses, choiceId, schedule, maxRetries: 1, timeoutMs: 90000, maxRequests: 80, usdCap: 1.5,
    quantiles: 'Linear interpolation at (n - 1) * p',
    design: 'v5 + 학생 주장 분리·인용 형식. 대입 확인·해석본 없음. CONCLUSION_AUDIT·COACHING 지시·스키마 유지.',
    semanticReview: '기대 필드 자동 일치는 의미 정확도 검토를 대신하지 않는다.',
  };
  const artifacts = { 'FROZEN.json': frozen, 'prompts.json': prompts, 'source.json': source, 'cases.json': cases };
  for (const [name, value] of Object.entries(artifacts)) {
    if (existsSync(`${dir}/${name}`)) assert.equal(readFileSync(`${dir}/${name}`, 'utf8'), serialize(value), `Frozen artifact changed: ${name}`);
    else if (mode !== 'prepare') throw new Error(`Run prepare first: ${name}`);
  }
  if (mode === 'prepare') {
    mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries(artifacts)) if (!existsSync(`${dir}/${name}`)) save(`${dir}/${name}`, value);
    const result = { prepared: true, cellsPerConfig: schedule.length, configs: 3, selfTests: 'passed', frozenHash: jsonHash(frozen), externalRequests: 0 };
    console.log(JSON.stringify(result)); return result;
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
    actualUsd: ledger.filter(x => x.event === 'END').reduce((n, e) => n + (e.costs?.actualUsd ?? 0), 0),
    unknownReservedUsd: ledger.filter(x => x.event === 'START').reduce((n, s) => n +
      (ledger.find(e => e.event === 'END' && e.requestId === s.requestId)?.costs ? 0 : s.reservedUsd), 0) });
  const beforeRequests = account().requests, transport = provider();
  let stop = null;
  for (const cell of schedule) {
    const label = labelFor(cell), path = `${runDir}/${label}.json`;
    if (existsSync(path)) continue;
    const cellStarted = performance.now(), session = sessionFor(cell, configName), rawOutputs = [], claimAttempts = [], requestRecords = [];
    const evaluator = new OpenAIFeedbackEvaluator({ model: config.model, maxOutputTokens: config.maxTokens, maxRetries: 1, timeoutMs: 90000,
      transport: { async create(request, options) {
        if (stop) throw new Error(stop);
        const outgoing = transform(request), chat = toChatRequest(outgoing, config);
        const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
        const rates = PRICES[config.provider];
        const reservedUsd = (Buffer.byteLength(JSON.stringify(chat)) * rates.input + config.maxTokens * rates.output) / 1e6;
        const a = account();
        if (a.requests >= frozen.maxRequests || a.conservativeUsd + a.unknownReservedUsd + reservedUsd > frozen.usdCap) {
          stop = 'RUN_LIMIT: request/cost limit'; throw new Error(stop);
        }
        const requestId = `${label}-${a.requests + 1}`, started = performance.now(), requestedAtUtc = new Date().toISOString();
        record({ event: 'START', requestId, label, kind, config: configName, requestedAtUtc, reservedUsd,
          requestHash: jsonHash(chat), instructionsHash: hash(outgoing.instructions) });
        let response;
        try { response = await transport.create(outgoing, options); }
        catch (error) {
          if (/RUN_LIMIT:/u.test(String(error))) stop = error.message;
          const end = { event: 'END', requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started,
            error: String(error), costs: null, rawUsage: { httpStatus: error.httpStatus ?? null, usage: null } };
          record(end); requestRecords.push(end); throw error;
        }
        const end = { event: 'END', requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started,
          costs: usageCosts(response.usage, config.provider, requestedAtUtc), ...response };
        record(end); requestRecords.push(end); rawOutputs.push({ requestId, kind, response: structuredClone(response) });
        let parsed;
        try { parsed = JSON.parse(response.output_text); }
        catch (e) { throw new Error(`JSON_PARSE: ${e.message}`); }
        if (kind !== 'ASSESSMENT') return response;
        const attempt = { requestId, studentClaims: parsed?.studentClaims ?? null, status: 'VALID', error: null };
        claimAttempts.push(attempt);
        try {
          const { studentClaims: _claims, ...assessment } = parsed ?? {};
          const validation = FeedbackSelectionAssessmentSchema.safeParse(assessment);
          if (!validation.success) throw new Error(`OPERATING_SCHEMA: ${validation.error.message}`);
          validateClaims(parsed, session.observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) })));
          return { ...response, output_text: JSON.stringify(assessment) };
        } catch (e) { attempt.status = 'ERROR'; attempt.error = e.message; throw e; }
      } } });
    let call = null, after = session, status = 'VALID', error = null;
    try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
    catch (e) { call = e.call ?? null; status = stop ? 'BUDGET_STOP' : 'EVALUATION_ERROR'; error = String(e); }
    const attempts = (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error, formatError: formatErrorKind(error ?? '') }));
    const expected = cases.find(c => c.type === cell.type).expected;
    const actual = { reconstructability: call?.rawOutput?.reconstructability ?? null,
      rationaleImpliedVerdict: call?.rawOutput?.rationaleImpliedVerdict ?? null, contentAssessment: call?.rawOutput?.contentAssessment ?? null,
      phase: after.phase, outcome: after.result?.outcome ?? null };
    const checks = expectedChecks(actual, expected, status);
    const result = { config: configName, arm: 'methods', type: cell.type, replicate: cell.r, status, error,
      durationMs: performance.now() - cellStarted, requests: requestRecords, rawOutputs, call, attempts,
      retryCount: Math.max(0, attempts.filter(a => a.outcome === 'ERROR').length - (status === 'VALID' ? 0 : 1)),
      actualModels: [...new Set(rawOutputs.map(x => x.response.model))],
      studentClaims: claimAttempts.at(-1)?.studentClaims ?? null, claimAttempts,
      claimContractFailures: attempts.filter(x => x.formatError === 'CLAIMS_CONTRACT').length,
      conclusionAuditExecuted: rawOutputs.some(x => x.kind === 'CONCLUSION_AUDIT'),
      after: { phase: after.phase, result: after.result,
        errors: after.errors.map(({ kind, description, studentEvidence, question }) => ({ kind, description, studentEvidence, question })),
        selectionComparison: after.selectionComparisons.at(-1) ?? null },
      actual, checks, expectedMatch: Object.values(checks).every(Boolean), boundary: cases.find(c => c.type === cell.type).boundary };
    // A budget stop is resumable once the ledger issue is resolved; never mark it a completed cell.
    if (!stop) save(path, result);
    console.log(JSON.stringify({ config: configName, label, status, expectedMatch: result.expectedMatch }));
    if (stop) break;
  }
  const rows = schedule.map(c => `${runDir}/${labelFor(c)}.json`).filter(existsSync).map(read);
  const ends = ledger.filter(x => x.event === 'END');
  const group = xs => ({ cells: xs.length, expectedMatch: xs.filter(x => x.expectedMatch).length, valid: xs.filter(x => x.status === 'VALID').length });
  const separate = ends.filter(e => e.costs?.costIfReasoningSeparate);
  const summary = { config: configName, ...account(), newRequests: account().requests - beforeRequests, stop,
    completedCells: rows.length, plannedCells: schedule.length,
    nonBoundary: group(rows.filter(x => !x.boundary)), boundary: group(rows.filter(x => x.boundary)),
    byResponse: Object.fromEntries(cases.map(c => [c.type, group(rows.filter(x => x.type === c.type))])),
    cellDurationMs: { median: quantile(rows.map(x => x.durationMs), 0.5), p90: quantile(rows.map(x => x.durationMs), 0.9) },
    requestDurationMs: { median: quantile(ends.map(x => x.durationMs), 0.5) },
    formatErrors: Object.fromEntries(['JSON_PARSE', 'OPERATING_SCHEMA', 'CLAIMS_CONTRACT'].map(k => [k, rows.flatMap(x => x.attempts).filter(x => x.formatError === k).length])),
    retries: rows.reduce((n, x) => n + x.retryCount, 0), evaluationErrors: rows.filter(x => x.status === 'EVALUATION_ERROR').length,
    tokens: { input: ends.reduce((n, e) => n + (e.usage?.input_tokens ?? 0), 0), output: ends.reduce((n, e) => n + (e.usage?.output_tokens ?? 0), 0),
      cached: ends.reduce((n, e) => n + (e.usage?.input_tokens_details?.cached_tokens ?? 0), 0),
      reasoning: ends.reduce((n, e) => n + (e.usage?.output_tokens_details?.reasoning_tokens ?? 0), 0),
      reasoningUnknownRequests: ends.filter(e => e.usage?.output_tokens_details?.reasoning_tokens == null).length },
    costIfReasoningSeparate: { knownRequests: separate.length, unknownRequests: ends.length - separate.length,
      conservativeUsd: separate.reduce((n, e) => n + e.costs.costIfReasoningSeparate.conservativeUsd, 0),
      actualUsd: separate.reduce((n, e) => n + e.costs.costIfReasoningSeparate.actualUsd, 0) },
    actualModels: [...new Set(ends.map(e => e.model).filter(Boolean))], semanticReview: frozen.semanticReview };
  writeFileSync(`${runDir}/RESULTS.json`, serialize(summary)); console.log(JSON.stringify(summary)); return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({ mode: process.argv[2] ?? 'prepare', config: process.argv[3] });
}
