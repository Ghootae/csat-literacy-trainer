// v5 다문항 비교. prepare는 로컬 자료만 읽으며 네트워크 전송은 하지 않는다.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand,
  applyFeedbackAssessment, feedbackRequestContent, feedbackObservationText,
  OpenAIFeedbackEvaluator, FeedbackSelectionAssessmentSchema } from '../packages/pipeline/dist/index.js';
import { CLAIM_BLOCK, QUOTE_BLOCK, validateClaims, instructionsFor, extendedSelectionSchema,
  transformRequest, claimSelfCheck } from './lib/v5-marker-judgment.mjs';

export const DEFAULT_DIR = 'docs/experiments/v5-multi-item-luna-sol-2026-10-08';
export const MODELS = {
  'gpt-6-luna': { input: 0.10, output: 0.50, maxRequests: 130, usdCap: 1.5 },
  'gpt-6.1-sol': { input: 2, output: 10, maxRequests: 130, usdCap: 6 },
};
const MRNA = 'mrna-vaccine-lipid-nanoparticle-q19';
const HARDENING = 'docs/experiments/problem-feedback-v4-hardening-2026-10-01';
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const jsonHash = x => hash(JSON.stringify(x));
const serialize = x => JSON.stringify(x, null, 2) + '\n';
const save = (p, x) => writeFileSync(p, serialize(x), { flag: 'wx' });
const labelFor = c => `${c.id}-r${c.r}`;
const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), index = (sorted.length - 1) * p;
  return sorted[Math.floor(index)] + (sorted[Math.ceil(index)] - sorted[Math.floor(index)]) * (index % 1);
};
const durations = xs => ({ median: quantile(xs, 0.5), p90: quantile(xs, 0.9) });
const formatErrorKind = error => /JSON_PARSE:/u.test(error) ? 'JSON_PARSE'
  : /OPERATING_SCHEMA:/u.test(error) ? 'OPERATING_SCHEMA' : /CLAIMS_CONTRACT:/u.test(error) ? 'CLAIMS_CONTRACT'
    : /"code":\s*"(?:invalid_|unrecognized_|too_)/u.test(error) ? 'OPERATING_SCHEMA' : null;

function mrnaCases() {
  const error = { gate: 'RECONSTRUCTABLE', verdict: 'INVALID', consistency: 'CONSISTENT', content: ['ERROR'],
    phase: 'AWAITING_CORRECTION', errorKinds: ['CONTENT'], minErrors: 1 };
  return [
    ['M1', 'C5', '투석으로 pH가 높아지면 이온화 지질이 중성이 된다는 건 지문에 있지만, 소수성이 약해져 인력이 줄고 더 작은 복합체가 생긴다는 내용은 지문에도 보기에도 없어요. 그래서 5번이 적절하지 않아요.',
      { gate: 'RECONSTRUCTABLE', verdict: 'INVALID', consistency: 'CONSISTENT', content: ['SUPPORTED'], phase: 'COMPLETED', outcome: 'VERIFIED_CORRECT' }, '정상'],
    ['M2', 'C5', 'pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요. 그러니까 소수성이 약해진다는 5번은 틀렸어요.', error, 'pH·수소 이온 방향 역전'],
    ['M3', 'C5', '그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요. 5번의 소수성이 약해져 더 작은 복합체가 생긴다는 건 지문에 근거가 없으니 틀렸어요.', error, '그림의 입구 오독(판정기에는 alt가 가지 않으므로 그림을 읽어야만 잡힌다)'],
    ['M4', 'C3', '이온화 지질은 pH가 높을 때 양전하를 띠니까, 산성 용액과 섞이면 양전하를 띤다는 3번이 적절하지 않아요.', error, '오답 선택+양이온화 방향 역전'],
    ['M5', 'C5', '이온화 지질은 용액의 pH에 따라 양이온성이 달라져요.',
      { gate: 'UNKNOWN', verdict: 'UNKNOWN', consistency: 'UNKNOWN', content: ['UNKNOWN', 'INSUFFICIENT'], phase: 'COMPLETED', outcome: 'UNVERIFIED_CORRECT' }, '참이지만 선지와 연결 없음'],
    ['M6', 'C4', '투석하면 pH가 높아져 수소 이온 농도가 낮아지고, 그러면 이온화 지질이 전기적으로 중성이 되니까 4번은 맞는 설명이에요.',
      { gate: 'RECONSTRUCTABLE', verdict: 'VALID', consistency: 'MISMATCH', content: ['SUPPORTED'], phase: 'AWAITING_CORRECTION', errorKinds: ['SELECTION_EXECUTION'] }, '맞는 근거와 선택 충돌'],
  ].map(([id, choiceId, rationale, expected, basis]) => ({ id, questionId: MRNA, choiceId, rationale,
    expected: structuredClone(expected), basis, expectationAuthor: 'Claude, user-confirmed 2026-10-08' }));
}

export function checksFor(f, after, raw) {
  const expected = f.expected, failures = [];
  const check = (name, actual, want) => {
    if (want !== undefined && JSON.stringify(actual) !== JSON.stringify(want)) failures.push({ name, actual, expected: want });
  };
  check('gate', raw.reconstructability, expected.gate);
  check('verdict', raw.rationaleImpliedVerdict, expected.verdict);
  check('consistency', after.selectionComparisons.at(-1)?.selectionRationaleConsistency, expected.consistency);
  check('phase', after.phase, expected.phase); check('outcome', after.result?.outcome, expected.outcome);
  if (expected.content && !expected.content.includes(raw.contentAssessment)) failures.push({ name: 'content', actual: raw.contentAssessment, expected: expected.content });
  if (expected.errorKinds) check('errorKinds', [...new Set(after.errors.map(e => e.kind))].sort(), [...expected.errorKinds].sort());
  if (expected.minErrors && after.errors.length < expected.minErrors) failures.push({ name: 'minErrors', actual: after.errors.length, expected: expected.minErrors });
  return { passed: failures.length === 0, failures, semanticReview: 'PENDING_AGENT_REVIEW' };
}

export function usageCosts(usage, model) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const rates = MODELS[model];
  return { conservativeUsd: (usage.input_tokens * rates.input + usage.output_tokens * rates.output) / 1e6,
    cachedTokens: usage.input_tokens_details?.cached_tokens ?? 0 };
}

export async function main({ mode = 'prepare', model, dir = DEFAULT_DIR, transport } = {}) {
  if (!['prepare', 'preflight', 'run'].includes(mode)) throw new Error('Expected prepare | preflight <model> | run <model>');
  if ((model !== undefined || mode !== 'prepare') && !Object.hasOwn(MODELS, model)) throw new Error('Unknown model');
  const oldCasesPath = `${HARDENING}/cases.json`, oldFrozenPath = `${HARDENING}/FROZEN.json`, oldSourcesPath = `${HARDENING}/sources.json`;
  assert.equal(hash(readFileSync(oldCasesPath)), read(oldFrozenPath).fileHashes[oldCasesPath], 'Hardening cases hash mismatch');
  const oldSuite = read(oldCasesPath), oldSources = read(oldSourcesPath);
  assert.equal(oldSuite.cases.length, 24);
  const cases = [...oldSuite.cases.map(({ id, questionId, choiceId, rationale, expected, basis }) =>
    ({ id, questionId, choiceId, rationale, expected, basis })), ...mrnaCases()];
  assert.equal(new Set(cases.map(c => c.id)).size, 30);
  const catalogPath = `${FIX}/source-direct-runtime-v1.json`, catalog = read(catalogPath);
  assert.equal(catalog.questions.find(q => q.questionId === MRNA)?.answerChoiceId, 'C5', 'mRNA answer mismatch');
  assert.equal(catalog.questions.find(q => q.questionId === MRNA)?.stemPolarity, 'SELECT_INCORRECT');
  const questionIds = [...new Set(cases.map(c => c.questionId))], sources = {}, sourceDiffVsHardening = {};
  const productPaths = questionIds.map(id => `${FIX}/public/${id}.json`);
  for (const [i, questionId] of questionIds.entries()) {
    const product = read(productPaths[i]), reference = catalog.questions.find(q => q.questionId === questionId);
    sources[questionId] = SourceDirectProblemBundleSchema.parse({ ...product, schemaVersion: 'source-direct-problem-bundle-v2',
      // Match the operating app's source projection; descriptive alt is not evaluator evidence.
      media: product.media.map(media => ({
        mediaId: media.mediaId, url: media.url, mimeType: media.mimeType, width: media.width, height: media.height,
        ...(media.contentHash === undefined ? {} : { contentHash: media.contentHash }),
        placement: structuredClone(media.placement),
      })),
      stemPolarity: reference.stemPolarity, answerChoiceId: reference.answerChoiceId, officialExplanation: reference.officialExplanation });
    if (questionId !== MRNA) {
      assert.ok(oldSources[questionId], `Missing hardening source: ${questionId}`);
      const fields = [...new Set([...Object.keys(oldSources[questionId]), ...Object.keys(sources[questionId])])].sort();
      const byField = Object.fromEntries(fields.map(k => [k, JSON.stringify(oldSources[questionId][k]) === JSON.stringify(sources[questionId][k]) ? 'SAME' : 'DIFFERENT']));
      const changedFields = fields.filter(k => byField[k] === 'DIFFERENT');
      sourceDiffVsHardening[questionId] = { equal: changedFields.length === 0, changedFields, byField };
    }
  }
  assert.equal(sources[MRNA].media.length, 1);
  const v5Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md';
  const v4Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md';
  const baseline = readFileSync(v4Path, 'utf8');
  const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema), extended = extendedSelectionSchema(schema);
  const prompts = { methods: instructionsFor(readFileSync(v5Path, 'utf8'), 'v5_methods') };
  const schedule = [1, 2, 3].flatMap(r => [...cases.slice(r - 1), ...cases.slice(0, r - 1)].map(c => ({ id: c.id, r })));
  const sessionFor = cell => {
    const c = cases.find(c => c.id === cell.id);
    return submitFeedbackCommand(createFeedbackSession(labelFor(cell), sources[c.questionId]),
      { type: 'SELECT', choiceId: c.choiceId, rationale: { mode: 'PROVIDED', text: c.rationale } }, 'o1');
  };
  const transform = request => transformRequest(request, { arm: 'v5_methods', baseline, instructions: prompts.methods, selectionSchema: schema });
  claimSelfCheck();
  for (const cell of schedule) {
    const input = [{ role: 'user', content: feedbackRequestContent(sessionFor(cell)) }];
    const request = { instructions: baseline, input, text: { format: { name: 'problem_feedback_v4_assessment', schema } } };
    const outgoing = transform(request);
    assert.deepEqual(outgoing.input, input); assert.deepEqual(outgoing.text.format.schema, extended);
    if (cell.id.startsWith('M')) {
      const images = outgoing.input[0].content.filter(c => c.type === 'input_image');
      assert.deepEqual(images, [{ type: 'input_image', image_url: sources[MRNA].media[0].url, detail: 'high' }]);
    }
  }
  const distDir = 'packages/pipeline/dist/problem-solving';
  const filePaths = [oldCasesPath, oldFrozenPath, oldSourcesPath, catalogPath, ...productPaths, v5Path, v4Path,
    'scripts/lib/v5-marker-judgment.mjs',
    ...readdirSync(distDir).filter(p => /^(feedback(-evaluator)?|source-direct-evaluator)\.js$/u.test(p)).sort().map(p => `${distDir}/${p}`)];
  const frozen = {
    fileHashes: Object.fromEntries(filePaths.map(p => [p, hash(readFileSync(p))])), runnerHash: hash(readFileSync(new URL(import.meta.url))),
    blocks: { CLAIM_BLOCK: hash(CLAIM_BLOCK), QUOTE_BLOCK: hash(QUOTE_BLOCK) },
    sourcesHash: jsonHash(sources), casesHash: jsonHash(cases), promptsHash: jsonHash(prompts),
    selectionSchema: schema, extendedSelectionSchema: extended,
    selectionSchemaHash: jsonHash(schema), extendedSelectionSchemaHash: jsonHash(extended), sourceDiffVsHardening,
    models: MODELS, priceSource: 'user-supplied official prices 2026-10-07', cachedInputPricing: 'Full input rate; cachedTokens recorded separately',
    schedule, reasoningEffort: 'medium', maxOutputTokens: 8000, maxRetries: 1, timeoutMs: 90000,
    legacyExpectationAuthor: oldSuite.expectationAuthor,
    quantiles: 'Linear interpolation at (n - 1) * p',
    design: 'v5 + 학생 주장 분리·인용 형식. 해석본·대입 확인 없음. CONCLUSION_AUDIT·COACHING 지시·스키마 유지.',
    semanticReview: '기대 필드 자동 일치는 의미 정확도 검토를 대신하지 않는다.',
  };
  const artifacts = { 'FROZEN.json': frozen, 'prompts.json': prompts, 'sources.json': sources, 'cases.json': cases };
  for (const [name, value] of Object.entries(artifacts)) {
    if (existsSync(`${dir}/${name}`)) assert.equal(readFileSync(`${dir}/${name}`, 'utf8'), serialize(value), `Frozen artifact changed: ${name}`);
    else if (mode !== 'prepare') throw new Error(`Run prepare first: ${name}`);
  }
  if (mode === 'prepare') {
    mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries(artifacts)) if (!existsSync(`${dir}/${name}`)) save(`${dir}/${name}`, value);
    return { prepared: true, cases: cases.length, cellsPerModel: schedule.length, models: 2, selfTests: 'passed', frozenHash: jsonHash(frozen), externalRequests: 0 };
  }
  const preflightPath = `${dir}/preflight-${model}.json`;
  if (mode === 'preflight' && existsSync(preflightPath)) throw new Error('Preflight already exists');
  if (mode === 'run') {
    if (!existsSync(preflightPath)) throw new Error('Run preflight first');
    const preflight = read(preflightPath);
    if (!preflight.operatingValidationPassed || !preflight.hasInputImage || preflight.responseStatus !== 'completed'
      || preflight.frozenHash !== jsonHash(frozen) || preflight.model !== model) throw new Error('Preflight failed or changed; stop before run');
  }
  const runDir = `${dir}/${model}`; mkdirSync(runDir, { recursive: true });
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
  const rates = MODELS[model], beforeRequests = account().requests;
  let client, stop = null;
  async function evaluateCell(cell, preflight = false) {
    const label = preflight ? 'preflight-M1' : labelFor(cell), fixture = cases.find(c => c.id === cell.id);
    const session = sessionFor(cell), cellStarted = performance.now(), rawOutputs = [], claimAttempts = [], requestRecords = [];
    let policyRefusal = null, hasInputImage = false;
    const evaluator = new OpenAIFeedbackEvaluator({ model, maxOutputTokens: 8000, maxRetries: preflight ? 0 : 1, timeoutMs: 90000,
      transport: { async create(request, options) {
        if (stop) throw new Error(stop);
        if (policyRefusal) throw policyRefusal;
        if (preflight && requestRecords.length) throw new Error('RUN_LIMIT: preflight permits exactly one request');
        let outgoing;
        try { outgoing = transform(request); }
        catch (e) { if (/RUN_LIMIT:/u.test(e.message)) stop = e.message; throw e; }
        const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
        const reservedUsd = (Buffer.byteLength(JSON.stringify(outgoing)) * rates.input + 8000 * rates.output) / 1e6;
        const a = account();
        if (a.requests >= rates.maxRequests || a.conservativeUsd + a.unknownReservedUsd + reservedUsd > rates.usdCap) {
          stop = 'RUN_LIMIT: request/cost limit'; throw new Error(stop);
        }
        hasInputImage ||= outgoing.input.some(x => x.content?.some(c => c.type === 'input_image'));
        const requestId = `${label}-${a.requests + 1}`, started = performance.now(), requestedAtUtc = new Date().toISOString();
        record({ event: 'START', requestId, label, kind, model, requestedAtUtc, reservedUsd,
          requestHash: jsonHash(outgoing), instructionsHash: hash(outgoing.instructions) });
        let response;
        try {
          const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
          response = await sender.create(outgoing, options);
        } catch (error) {
          const httpStatus = error.status ?? error.httpStatus ?? null;
          const details = { requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started, error: String(error), httpStatus };
          record({ event: 'ERROR', ...details });
          const end = { event: 'END', ...details, costs: null, usage: null };
          record(end); requestRecords.push(end);
          if (httpStatus === 400) {
            // The runtime recognizes APIError as non-retryable for HTTP 400, including injected transports.
            policyRefusal = new OpenAI.APIError(400, { message: String(error) }, String(error), undefined);
            throw policyRefusal;
          }
          throw error;
        }
        const end = { event: 'END', requestId, label, kind, requestedAtUtc, durationMs: performance.now() - started,
          costs: usageCosts(response.usage, model), responseId: response.id, model: response.model, status: response.status,
          usage: response.usage ?? null, outputText: response.output_text };
        record(end); requestRecords.push(end); rawOutputs.push({ requestId, kind, response: structuredClone(response) });
        if (kind !== 'ASSESSMENT') return response;
        let parsed;
        try { parsed = JSON.parse(response.output_text); } catch (e) { throw new Error(`JSON_PARSE: ${e.message}`); }
        const attempt = { requestId, studentClaims: parsed?.studentClaims ?? null, status: 'VALID', error: null };
        claimAttempts.push(attempt);
        try {
          validateClaims(parsed, session.observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) })));
          const { studentClaims: _claims, ...assessment } = parsed;
          const validation = FeedbackSelectionAssessmentSchema.safeParse(assessment);
          if (!validation.success) throw new Error(`OPERATING_SCHEMA: ${validation.error.message}`);
          return { ...response, output_text: JSON.stringify(assessment) };
        } catch (e) { attempt.status = 'ERROR'; attempt.error = e.message; throw e; }
      } } });
    let call = null, after = session, status = 'VALID', error = null;
    try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
    catch (e) { call = e.call ?? null; status = stop ? 'RUN_LIMIT' : policyRefusal ? 'POLICY_REFUSAL' : 'EVALUATION_ERROR'; error = String(e); }
    const attempts = (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error, formatError: formatErrorKind(error ?? '') }));
    const checks = status === 'VALID' ? checksFor(fixture, after, call.rawOutput) : { passed: false, failures: [{ name: status, actual: error }] };
    return { model, arm: 'methods', id: cell.id, questionId: fixture.questionId, choiceId: fixture.choiceId, replicate: cell.r,
      status, error, durationMs: performance.now() - cellStarted, requests: requestRecords, rawOutputs, call, attempts,
      retryCount: Math.max(0, attempts.filter(a => a.outcome === 'ERROR').length - (status === 'VALID' ? 0 : 1)),
      actualModels: [...new Set(rawOutputs.map(x => x.response.model))],
      studentClaims: claimAttempts.at(-1)?.studentClaims ?? null, claimAttempts,
      conclusionAuditExecuted: rawOutputs.some(x => x.kind === 'CONCLUSION_AUDIT'),
      after: { phase: after.phase, result: after.result,
        errors: after.errors.map(({ kind, description, studentEvidence, question }) => ({ kind, description, studentEvidence, question })),
        selectionComparison: after.selectionComparisons.at(-1) ?? null },
      checks, expectedMatch: checks.passed, hasInputImage };
  }
  if (mode === 'preflight') {
    const cell = await evaluateCell({ id: 'M1', r: 1 }, true);
    const response = cell.rawOutputs[0]?.response;
    const result = { model, frozenHash: jsonHash(frozen), hasInputImage: cell.hasInputImage,
      responseStatus: response?.status ?? null, usage: response?.usage ?? null,
      operatingValidationPassed: cell.status === 'VALID', requests: cell.requests.length, cell };
    save(preflightPath, result); return result;
  }
  for (const cell of schedule) {
    const path = `${runDir}/${labelFor(cell)}.json`;
    if (existsSync(path)) continue;
    const result = await evaluateCell(cell);
    if (stop) break; // A limit is not a completed cell.
    save(path, result);
  }
  const rows = schedule.map(c => `${runDir}/${labelFor(c)}.json`).filter(existsSync).map(read);
  const ends = ledger.filter(x => x.event === 'END');
  const group = xs => ({ cells: xs.length, expectedMatch: xs.filter(x => x.expectedMatch).length, valid: xs.filter(x => x.status === 'VALID').length });
  const summary = { model, ...account(), newRequests: account().requests - beforeRequests, stop,
    completedCells: rows.length, plannedCells: schedule.length, ...group(rows),
    byQuestion: Object.fromEntries(questionIds.map(id => [id, group(rows.filter(x => x.questionId === id))])),
    byResponse: Object.fromEntries(cases.map(c => [c.id, group(rows.filter(x => x.id === c.id))])),
    cellDurationMs: durations(rows.map(x => x.durationMs)), requestDurationMs: durations(ends.map(x => x.durationMs)),
    formatErrors: Object.fromEntries(['JSON_PARSE', 'OPERATING_SCHEMA', 'CLAIMS_CONTRACT'].map(k => [k, rows.flatMap(x => x.attempts).filter(x => x.formatError === k).length])),
    retries: rows.reduce((n, x) => n + x.retryCount, 0), evaluationErrors: rows.filter(x => x.status === 'EVALUATION_ERROR').length,
    policyRefusals: rows.filter(x => x.status === 'POLICY_REFUSAL').length,
    tokens: { input: ends.reduce((n, e) => n + (e.usage?.input_tokens ?? 0), 0), output: ends.reduce((n, e) => n + (e.usage?.output_tokens ?? 0), 0),
      cached: ends.reduce((n, e) => n + (e.usage?.input_tokens_details?.cached_tokens ?? 0), 0),
      reasoning: ends.reduce((n, e) => n + (e.usage?.output_tokens_details?.reasoning_tokens ?? 0), 0),
      unknownUsageRequests: ends.filter(e => !e.costs).length },
    actualModels: [...new Set(ends.map(e => e.model).filter(Boolean))],
    requestScope: 'Model ledger includes preflight; cell metrics include run only', semanticReview: frozen.semanticReview };
  writeFileSync(`${runDir}/RESULTS.json`, serialize(summary)); return summary;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await main({ mode: process.argv[2] ?? 'prepare', model: process.argv[3] })));
}
