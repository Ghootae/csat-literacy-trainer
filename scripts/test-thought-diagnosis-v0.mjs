// D-0111 offline experiment. Keys are loaded only by Node's --env-file-if-exists.
// Responses text.format contract: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadSources, hash, accounting, usageCosts as referenceCosts } from './test-trap-map-v0.mjs';

export const DEFAULT_DIR = 'docs/experiments/thought-diagnosis-v0-2026-10-10';
export const CASES_PATH = 'docs/experiments/v5-multi-item-luna-sol-2026-10-08/cases.json';
export const GUIDE_PATH = `${DEFAULT_DIR}/LABEL-GUIDE.md`;
export const STEPS = ['S1_STEM', 'S2_CHOICE', 'S3_LOCATE', 'S4_INTERPRET', 'S5_JUDGE'];
export const OUTCOMES = ['NONE', 'ERROR', 'INSUFFICIENT', 'POLARITY_MISMATCH', 'SELF_CONTRADICTION'];
export const TAGS = ['POLARITY', 'REFERENT', 'ATTRIBUTION', 'DIRECTION', 'CONDITION', 'SCOPE', 'MAPPING',
  'SURFACE_MATCH', 'PARAPHRASE_DISTANCE', 'MULTI_STEP', 'OUTSIDE_KNOWLEDGE', 'MISREAD_FACT'];
export const MODELS = {
  'gpt-6-luna': { input: 0.10, output: 0.50, maxRequests: 100, usdCap: 0.5 },
  'gpt-6.1-sol': { input: 2, output: 10, maxRequests: 100, usdCap: 4 },
};
export const OutputSchema = z.strictObject({
  caseId: z.string(), outcomeType: z.enum(OUTCOMES),
  steps: z.strictObject(Object.fromEntries(STEPS.map(s => [s, z.enum(['PASS', 'FAIL', 'NOT_OBSERVED'])]))),
  firstFailedStep: z.enum(STEPS).nullable(),
  errors: z.array(z.strictObject({ tag: z.enum(TAGS), step: z.enum(STEPS), studentQuote: z.string() })),
  note: z.string(),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = v => JSON.stringify(v, null, 2) + '\n';
const save = (p, v, flag = 'wx') => writeFileSync(p, serialize(v), { flag });
const jsonHash = v => hash(JSON.stringify(v));
const readLedger = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const labelFor = c => `${c.caseId}-r${c.replicate}`;

export function instructionsFromGuide(guide) {
  const start = guide.indexOf('## 1.'), end = guide.indexOf('```', guide.indexOf('```', guide.indexOf('## 4.')) + 3);
  assert.ok(start >= 0 && end > start, 'GUIDE_STRUCTURE');
  return '너는 수능 국어 독서 문항에서 학생 풀이를 진단하는 평가자다. 아래 가이드에 따라 이 학생의 풀이 하나를 진단한다.\n\n' + guide.slice(start, end + 3);
}
export function validateOutput(value, caseId) {
  const result = OutputSchema.parse(value);
  assert.equal(result.caseId, caseId, 'CASE_ID');
  assert.equal(result.firstFailedStep, STEPS.find(s => result.steps[s] === 'FAIL') ?? null, 'FIRST_FAILED_STEP');
  const hasErrors = ['ERROR', 'POLARITY_MISMATCH'].includes(result.outcomeType);
  assert.equal(result.errors.length > 0, hasErrors, 'ERRORS_OUTCOME');
  return result;
}
export function quoteChecks(output, rationale) {
  return output.errors.map(e => ({ ...e, exact: e.studentQuote.length > 0 && rationale.includes(e.studentQuote) }));
}
export function scheduleFor(cases, seed = 20261010) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  return [1, 2, 3].flatMap(replicate => {
    const ids = cases.map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.map(caseId => ({ caseId, replicate }));
  });
}
export function requestFor(model, source, c, prompts, schema = JSON_SCHEMA) {
  assert.ok(Object.hasOwn(MODELS, model), 'Unsupported model');
  // Whitelist both student and source fields; no authored basis/expected/labels/alt can cross this boundary.
  const { schemaVersion, questionId, questionNumber, passageId, title, exam, passage, stem, stemPolarity,
    scenario, textAnnotations, choices, answerChoiceId, officialExplanation } = source;
  const media = source.media.map(({ mediaId, url, mimeType, width, height, contentHash, placement }) =>
    ({ mediaId, url, mimeType, width, height, ...(contentHash === undefined ? {} : { contentHash }), placement }));
  const input = { source: { schemaVersion, questionId, questionNumber, passageId, title, exam, passage,
    stem, stemPolarity, scenario, textAnnotations, choices: choices.map(({ choiceId, position, text }) => ({ choiceId, position, text })),
    answerChoiceId, officialExplanation, media }, student: { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale } };
  return { model, instructions: prompts.instructions, reasoning: { effort: 'medium' }, max_output_tokens: 6000,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) },
      ...media.map(m => ({ type: 'input_image', image_url: m.url, detail: 'high' }))] }],
    text: { format: { type: 'json_schema', name: 'thought_diagnosis_v0', strict: true, schema } } };
}
function artifactsFor(dir) {
  const frozen = read(`${dir}/FROZEN.json`);
  const guide = readFileSync(GUIDE_PATH, 'utf8'), guideHash = hash(guide);
  assert.equal(frozen.guideHash, guideHash, 'Frozen guide changed');
  assert.equal(frozen.labelsCodexHash, hash(readFileSync(`${dir}/labels-codex.json`)), 'Frozen Codex labels changed');
  const labels = read(`${dir}/labels-codex.json`), rawCases = read(CASES_PATH);
  assert.equal(labels.labeler, 'codex'); assert.equal(labels.guideHash, guideHash);
  assert.equal(rawCases.length, 30); assert.equal(new Set(rawCases.map(c => c.id)).size, 30);
  assert.equal(labels.labels.length, 30);
  for (const c of rawCases) validateOutput(labels.labels.find(l => l.caseId === c.id), c.id);
  const cases = rawCases.map(({ id, questionId, choiceId, rationale }) => ({ id, questionId, choiceId, rationale }));
  const { sources: allSources, filePaths } = loadSources();
  const sources = Object.fromEntries([...new Set(cases.map(c => c.questionId))].map(id => [id, allSources[id]]));
  for (const c of cases) assert.ok(sources[c.questionId]?.choices.some(x => x.choiceId === c.choiceId), 'SOURCE_CASE');
  const prompts = { instructions: instructionsFromGuide(guide) };
  const complete = { version: 1, guideHash, labelsCodexHash: frozen.labelsCodexHash,
    fileHashes: Object.fromEntries([CASES_PATH, GUIDE_PATH, ...filePaths].map(p => [p, hash(readFileSync(p))])),
    runnerHash: hash(readFileSync(new URL(import.meta.url))), casesHash: jsonHash(cases), sourcesHash: jsonHash(sources),
    promptsHash: jsonHash(prompts), schemaHash: jsonHash(JSON_SCHEMA), schema: JSON_SCHEMA,
    seed: 20261010, schedule: scheduleFor(cases), shuffle: 'LCG 1664525/1013904223; Fisher-Yates; persistent state across repeats',
    models: MODELS, priceSource: 'same user-supplied prices as test-trap-map-v0.mjs', cachedInputPricing: 'Full input price',
    reasoningEffort: 'medium', maxOutputTokens: 6000, timeoutMs: 90000, formatRetries: 1,
    metrics: { majority: 'Each compared field; exact tag sets; error count separately; no 2-of-3 value = NO_MAJORITY',
      invalidOutputs: 'NO_OUTPUT; retained in accuracy denominators; zero tag credit',
      kappa: 'Observed and expected category agreement; zero denominator yields null',
      tags: 'ERROR/POLARITY_MISMATCH gold only; empty/empty Jaccard=1',
      quotes: 'Exact nonempty substring; final VALID outputs only; per-repeat and pooled; no voted quotes',
      failPrecisionRecall: 'Zero denominator yields null',
      stability: 'All three VALID; both outcomeType and firstFailedStep equal' } };
  return { artifacts: { 'FROZEN.json': complete, 'cases.json': cases, 'sources.json': sources, 'prompts.json': prompts }, cases, sources, prompts, frozen: complete };
}
export function prepare({ dir = DEFAULT_DIR } = {}) {
  const result = artifactsFor(dir);
  for (const [name, data] of Object.entries(result.artifacts)) {
    const p = `${dir}/${name}`;
    if (name === 'FROZEN.json' && !Object.hasOwn(read(p), 'runnerHash')) save(p, data, 'w');
    else if (existsSync(p)) assert.equal(readFileSync(p, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
    else save(p, data);
  }
  return { prepared: true, cases: 30, cellsPerModel: 90, externalRequests: 0, frozenHash: jsonHash(result.frozen) };
}
function verifyFrozen(dir) {
  const result = artifactsFor(dir);
  for (const [name, data] of Object.entries(result.artifacts)) assert.equal(readFileSync(`${dir}/${name}`, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
  return result;
}
export function summarizeRun(dir, model, frozen, ledger, stop = null) {
  const rows = frozen.schedule.map(c => `${dir}/${model}/${labelFor(c)}.json`).filter(existsSync).map(read);
  const citations = rows.flatMap(r => r.citations ?? []), ends = ledger.filter(e => e.event === 'END');
  return { model, ...accounting(ledger), completedCells: rows.length, plannedCells: frozen.schedule.length, stop,
    statuses: Object.fromEntries(['VALID', 'FORMAT_ERROR', 'POLICY_REFUSAL', 'API_ERROR'].map(s => [s, rows.filter(r => r.status === s).length])),
    retries: rows.reduce((n, r) => n + r.retryCount, 0),
    formatErrors: rows.reduce((n, r) => n + r.attempts.filter(a => a.status === 'FORMAT_ERROR').length, 0),
    citationExact: citations.filter(c => c.exact).length, citationTotal: citations.length,
    citationExactRate: citations.length ? citations.filter(c => c.exact).length / citations.length : null,
    tokens: { input: ends.reduce((n, e) => n + (e.usage?.input_tokens ?? 0), 0), output: ends.reduce((n, e) => n + (e.usage?.output_tokens ?? 0), 0),
      cached: ends.reduce((n, e) => n + (e.usage?.input_tokens_details?.cached_tokens ?? 0), 0),
      reasoning: ends.reduce((n, e) => n + (e.usage?.output_tokens_details?.reasoning_tokens ?? 0), 0), unknownUsageRequests: ends.filter(e => !e.costs).length },
    actualModels: [...new Set(ends.map(e => e.model).filter(Boolean))], frozenHash: jsonHash(frozen) };
}
export async function run({ dir = DEFAULT_DIR, model, transport, onProgress = () => {} } = {}) {
  assert.ok(Object.hasOwn(MODELS, model), 'Unsupported model');
  const { frozen, cases, sources, prompts } = verifyFrozen(dir), frozenHash = jsonHash(frozen);
  const runDir = `${dir}/${model}`, ledgerPath = `${runDir}/requests.jsonl`;
  mkdirSync(runDir, { recursive: true });
  const ledger = readLedger(ledgerPath);
  assert.ok(!ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId)), 'RUN_LIMIT: incomplete ledger resume refused');
  for (const cell of frozen.schedule) {
    const label = labelFor(cell), p = `${runDir}/${label}.json`;
    if (existsSync(p)) { const row = read(p); assert.equal(row.frozenHash, frozenHash); assert.equal(row.model, model); assert.equal(row.caseId, cell.caseId); assert.equal(row.replicate, cell.replicate); }
    else assert.ok(!ledger.some(e => e.label === label), `RUN_LIMIT: missing cell ${label} with prior requests; resume refused`);
  }
  const record = row => { appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); ledger.push(row); };
  let client, stop = null;
  for (const cell of frozen.schedule) {
    const label = labelFor(cell), p = `${runDir}/${label}.json`;
    if (existsSync(p)) continue;
    const c = cases.find(c => c.id === cell.caseId), request = requestFor(model, sources[c.questionId], c, prompts, frozen.schema);
    const row = { ...cell, label, model, frozenHash, status: null, output: null, citations: [], attempts: [], retryCount: 0,
      hasInputImage: request.input[0].content.some(c => c.type === 'input_image') };
    for (let attempt = 1; attempt <= 2; attempt++) {
      const rates = MODELS[model], a = accounting(ledger);
      const reservedUsd = (Buffer.byteLength(JSON.stringify(request)) * rates.input + 6000 * rates.output) / 1e6;
      if (a.requests >= rates.maxRequests || a.conservativeUsd + a.unknownReservedUsd + reservedUsd > rates.usdCap) { stop = 'RUN_LIMIT: request/cost limit'; break; }
      if (attempt === 2) row.retryCount++;
      const requestId = `${label}-${a.requests + 1}`, start = performance.now();
      record({ event: 'START', requestId, label, model, attempt, requestedAtUtc: new Date().toISOString(), reservedUsd, frozenHash,
        requestHash: jsonHash(request), instructionsHash: hash(request.instructions) });
      let response;
      try {
        const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
        response = await sender.create(request, { timeout: 90000 });
      } catch (error) {
        const httpStatus = error.status ?? error.httpStatus ?? null;
        const details = { requestId, label, attempt, durationMs: performance.now() - start, httpStatus, error: String(error) };
        record({ event: 'ERROR', ...details }); record({ event: 'END', ...details, costs: null, usage: null });
        row.status = httpStatus === 400 ? 'POLICY_REFUSAL' : 'API_ERROR'; row.error = String(error);
        row.attempts.push({ requestId, status: row.status, error: row.error });
        if (httpStatus !== 400) stop = `API_ERROR: ${error.message}`;
        break;
      }
      record({ event: 'END', requestId, label, attempt, durationMs: performance.now() - start,
        responseId: response.id, model: response.model, status: response.status,
        costs: referenceCosts(response.usage, model), usage: response.usage ?? null, outputText: response.output_text ?? null });
      const result = { requestId, status: 'VALID', response: structuredClone(response), error: null }; row.attempts.push(result);
      if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) { result.status = row.status = 'POLICY_REFUSAL'; break; }
      try {
        assert.equal(response.status, 'completed', `RESPONSE_STATUS: ${response.status}`);
        row.output = validateOutput(JSON.parse(response.output_text), c.id);
        row.citations = quoteChecks(row.output, c.rationale); row.status = 'VALID'; break;
      } catch (error) { result.status = row.status = 'FORMAT_ERROR'; result.error = row.error = String(error); }
    }
    if (stop?.startsWith('RUN_LIMIT')) break;
    save(p, row); onProgress({ model, label, status: row.status, ...accounting(ledger) });
    if (stop) break;
  }
  const summary = summarizeRun(dir, model, frozen, ledger, stop);
  save(`${runDir}/RESULTS.json`, summary, 'w'); return summary;
}

export const NO_MAJORITY = 'NO_MAJORITY';
const NO_OUTPUT = 'NO_OUTPUT';
const ratio = (n, d) => d ? n / d : null;
const tagSet = o => o?.tagSet ?? (o?.errors ? [...new Set(o.errors.map(e => e.tag))].sort() : NO_OUTPUT);
const errorCount = o => o?.errorCount ?? (o?.errors ? o.errors.length : NO_OUTPUT);
const key = v => JSON.stringify(v);
const equal = (a, b) => key(a) === key(b);
export function majority(values) {
  const counts = new Map();
  for (const v of values) counts.set(key(v), (counts.get(key(v)) ?? 0) + 1);
  const winner = [...counts].find(([, count]) => count >= 2);
  return winner ? JSON.parse(winner[0]) : NO_MAJORITY;
}
export function majorityOutput(outputs) {
  assert.equal(outputs.length, 3);
  return { outcomeType: majority(outputs.map(o => o?.outcomeType ?? NO_OUTPUT)),
    firstFailedStep: majority(outputs.map(o => o ? o.firstFailedStep : NO_OUTPUT)),
    steps: Object.fromEntries(STEPS.map(s => [s, majority(outputs.map(o => o?.steps[s] ?? NO_OUTPUT))])),
    tagSet: majority(outputs.map(tagSet)), errorCount: majority(outputs.map(errorCount)) };
}
export function cohenKappa(gold, predicted) {
  assert.equal(gold.length, predicted.length);
  if (!gold.length) return null;
  const n = gold.length, categories = new Set([...gold, ...predicted].map(key));
  const po = gold.filter((v, i) => equal(v, predicted[i])).length / n;
  let pe = 0;
  for (const k of categories) pe += gold.filter(v => key(v) === k).length / n * predicted.filter(v => key(v) === k).length / n;
  return pe === 1 ? null : (po - pe) / (1 - pe);
}
export function metrics(gold, predicted) {
  assert.equal(gold.length, predicted.length);
  const n = gold.length;
  const match = fn => { const matches = gold.filter((g, i) => equal(fn(g), fn(predicted[i]))).length; return { matches, total: n, accuracy: ratio(matches, n) }; };
  const outcomeType = match(o => o?.outcomeType ?? NO_OUTPUT);
  outcomeType.kappa = cohenKappa(gold.map(g => g.outcomeType), predicted.map(p => p?.outcomeType ?? NO_OUTPUT));
  const steps = Object.fromEntries(STEPS.map(s => {
    const accuracy = match(o => o?.steps[s] ?? NO_OUTPUT);
    const goldFail = gold.filter(g => g.steps[s] === 'FAIL').length;
    const predictedFail = predicted.filter(p => p?.steps[s] === 'FAIL').length;
    const truePositive = gold.filter((g, i) => g.steps[s] === 'FAIL' && predicted[i]?.steps[s] === 'FAIL').length;
    return [s, { ...accuracy, goldFail, predictedFail, truePositive, failRecall: ratio(truePositive, goldFail), failPrecision: ratio(truePositive, predictedFail) }];
  }));
  const trapIndexes = gold.flatMap((g, i) => ['ERROR', 'POLARITY_MISMATCH'].includes(g.outcomeType) ? [i] : []);
  let jaccardSum = 0, fullyIncluded = 0;
  for (const i of trapIndexes) {
    const a = new Set(tagSet(gold[i])), p = tagSet(predicted[i]);
    if (!Array.isArray(p)) continue;
    const b = new Set(p), intersection = [...a].filter(t => b.has(t)).length, union = new Set([...a, ...b]).size;
    jaccardSum += union ? intersection / union : 1;
    if ([...a].every(t => b.has(t))) fullyIncluded++;
  }
  return { outcomeType, firstFailedStep: match(o => o ? o.firstFailedStep : NO_OUTPUT), steps,
    traps: { total: trapIndexes.length, meanJaccard: ratio(jaccardSum, trapIndexes.length), fullyIncluded, fullyIncludedRate: ratio(fullyIncluded, trapIndexes.length) },
    errorCount: match(errorCount) };
}
function readLabelFile(dir, name, cases) {
  const v = read(`${dir}/${name}`);
  assert.equal(v.guideHash, hash(readFileSync(GUIDE_PATH)), `GUIDE_HASH: ${name}`);
  assert.equal(v.labels.length, cases.length);
  assert.equal(new Set(v.labels.map(l => l.caseId)).size, cases.length);
  return cases.map(c => validateOutput(v.labels.find(l => l.caseId === c.id), c.id));
}
const mdCell = v => String(v).replace(/\|/gu, '\\|').replace(/\r?\n/gu, '<br>');
export function compareLabelers({ dir = DEFAULT_DIR } = {}) {
  assert.ok(existsSync(`${dir}/labels-codex.json`) && existsSync(`${dir}/labels-claude.json`), 'Both independent labels required');
  const { cases } = verifyFrozen(dir);
  const codex = readLabelFile(dir, 'labels-codex.json', cases), claude = readLabelFile(dir, 'labels-claude.json', cases);
  const comparisons = cases.map((c, i) => ({ c, a: codex[i], b: claude[i], fields: [
    ...['outcomeType', 'firstFailedStep'].filter(k => !equal(codex[i][k], claude[i][k])),
    ...STEPS.filter(k => codex[i].steps[k] !== claude[i].steps[k]).map(k => `steps.${k}`),
    ...(!equal(tagSet(codex[i]), tagSet(claude[i])) ? ['errorTags'] : []),
  ] })).filter(r => r.fields.length);
  let text = '# 독립 라벨 불일치\n\n';
  for (const { c, a, b, fields } of comparisons) {
    text += `## ${c.id}\n\n학생 풀이: ${c.rationale}\n\n비교 칸: ${fields.join(', ')}\n\n| 칸 | CODEX | CLAUDE |\n|---|---|---|\n`;
    for (const k of ['outcomeType', 'firstFailedStep', ...STEPS, 'errors', 'note']) {
      const value = l => STEPS.includes(k) ? l.steps[k] : l[k];
      text += `| ${k} | ${mdCell(JSON.stringify(value(a)))} | ${mdCell(JSON.stringify(value(b)))} |\n`;
    }
    text += '\n판정: CODEX | CLAUDE | 직접 수정\n\n사용자 판정 내용: \n\n';
  }
  if (!comparisons.length) text += '불일치 사례: 0\n';
  writeFileSync(`${dir}/DISAGREEMENTS.md`, text);
  const interLabeler = { reference: 'codex', compared: 'claude', ...metrics(codex, claude), disagreementCases: comparisons.map(r => r.c.id),
    citations: Object.fromEntries([['codex', codex], ['claude', claude]].map(([name, ls]) => {
      const quotes = ls.flatMap((l, i) => quoteChecks(l, cases[i].rationale));
      return [name, { exact: quotes.filter(q => q.exact).length, total: quotes.length, rate: ratio(quotes.filter(q => q.exact).length, quotes.length) }];
    })) };
  const results = existsSync(`${dir}/RESULTS.json`) ? read(`${dir}/RESULTS.json`) : {};
  save(`${dir}/RESULTS.json`, { ...results, interLabeler }, 'w');
  return { compared: true, cases: cases.length, disagreements: comparisons.length };
}
export function report({ dir = DEFAULT_DIR } = {}) {
  assert.ok(existsSync(`${dir}/gold-labels.json`), 'User-adjudicated gold-labels.json required');
  const { cases, frozen } = verifyFrozen(dir), gold = readLabelFile(dir, 'gold-labels.json', cases);
  const results = existsSync(`${dir}/RESULTS.json`) ? read(`${dir}/RESULTS.json`) : {};
  const outputs = {};
  results.goldHash = hash(readFileSync(`${dir}/gold-labels.json`)); results.models = {};
  for (const model of Object.keys(MODELS)) {
    outputs[model] = cases.map(c => [1, 2, 3].map(replicate => {
      const p = `${dir}/${model}/${c.id}-r${replicate}.json`;
      if (!existsSync(p)) return null;
      const row = read(p); assert.equal(row.frozenHash, jsonHash(frozen)); assert.equal(row.caseId, c.id); assert.equal(row.replicate, replicate); assert.equal(row.model, model);
      return row.status === 'VALID' ? validateOutput(row.output, c.id) : null;
    }));
    const triples = outputs[model];
    const citationsFor = predicted => {
      const quotes = predicted.flatMap((o, i) => o ? quoteChecks(o, cases[i].rationale) : []);
      return { exact: quotes.filter(q => q.exact).length, total: quotes.length, rate: ratio(quotes.filter(q => q.exact).length, quotes.length) };
    };
    const repeats = [0, 1, 2].map(r => { const predicted = triples.map(t => t[r]); return { replicate: r + 1, ...metrics(gold, predicted), citations: citationsFor(predicted) }; });
    const stable = triples.filter(t => t.every(Boolean) && t.every(o => o.outcomeType === t[0].outcomeType && o.firstFailedStep === t[0].firstFailedStep)).length;
    const quotes = triples.flatMap((t, i) => t.flatMap(o => o ? quoteChecks(o, cases[i].rationale) : []));
    results.models[model] = { run: read(`${dir}/${model}/RESULTS.json`), repeats,
      majority: metrics(gold, triples.map(majorityOutput)), stability: { stableCases: stable, total: cases.length, rate: ratio(stable, cases.length) },
      citations: { exact: quotes.filter(q => q.exact).length, total: quotes.length, rate: ratio(quotes.filter(q => q.exact).length, quotes.length) } };
  }
  save(`${dir}/RESULTS.json`, results, 'w');
  let review = '# 사례별 정답 라벨과 모델 출력\n\n';
  for (const [i, c] of cases.entries()) {
    review += `## ${c.id}\n\n학생 선택: ${c.choiceId}\n\n학생 풀이: ${c.rationale}\n\n| 정답 라벨 | gpt-6-luna (1·2·3회) | gpt-6.1-sol (1·2·3회) |\n|---|---|---|\n`;
    review += `| ${mdCell(JSON.stringify(gold[i]))} | ${mdCell(JSON.stringify(outputs['gpt-6-luna'][i]))} | ${mdCell(JSON.stringify(outputs['gpt-6.1-sol'][i]))} |\n\n`;
  }
  writeFileSync(`${dir}/REVIEW.md`, review);
  writeFileSync(`${dir}/REPORT.md`, '# 사고 진단 v0 결과\n\n정답 라벨 SHA-256: ' + results.goldHash + '\n\n```json\n' + serialize(results) + '```\n');
  return { reported: true, models: Object.keys(results.models), cases: cases.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, model] = process.argv.slice(2);
  try {
    const result = mode === 'prepare' ? prepare() : mode === 'run' ? await run({ model, onProgress: p => console.log(JSON.stringify(p)) })
      : mode === 'compare-labelers' ? compareLabelers() : mode === 'report' ? report() : null;
    assert.ok(result, 'Usage: prepare | run <model> | compare-labelers | report');
    console.log(JSON.stringify(result, null, 2));
    if (result.stop || (mode === 'run' && result.completedCells !== 90)) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
