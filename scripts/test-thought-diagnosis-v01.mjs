// Offline v0.1 handoff execution. v0 runner and artifacts remain read-only.
// Keys are loaded only by Node's --env-file-if-exists.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadSources, hash, accounting, usageCosts as referenceCosts } from './test-trap-map-v0.mjs';
import * as v0 from './test-thought-diagnosis-v0.mjs';

export const DEFAULT_DIR = 'docs/experiments/thought-diagnosis-v01-2026-10-10';
export const BASELINE_DIR = v0.DEFAULT_DIR;
export const STEPS = v0.STEPS;
export const OUTCOMES = [...v0.OUTCOMES, 'UNJUDGEABLE']; // v0 schema + new outcome
export const MODELS = Object.fromEntries(Object.entries(v0.MODELS).map(([m, rates]) => [m, { ...rates, maxRequests: 120 }]));
export const OutputSchema = v0.OutputSchema.extend({
  outcomeType: z.enum(OUTCOMES),
  unjudgeableReason: z.enum(['NO_CONTENT', 'GUESS_ONLY', 'CONTRADICTORY']).nullable(),
  guessed: z.boolean(),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);
export const quoteChecks = v0.quoteChecks;
export const scheduleFor = v0.scheduleFor;
export const summarizeRun = v0.summarizeRun;
export const NO_MAJORITY = v0.NO_MAJORITY;
const NO_OUTPUT = 'NO_OUTPUT';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = v => JSON.stringify(v, null, 2) + '\n';
const save = (p, v, flag = 'wx') => writeFileSync(p, serialize(v), { flag });
const jsonHash = v => hash(JSON.stringify(v));
const readLedger = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const labelFor = c => `${c.caseId}-r${c.replicate}`;
const ratio = (n, d) => d ? n / d : null;
const mdCell = v => String(v).replace(/\|/gu, '\\|').replace(/\r?\n/gu, '<br>');

export function instructionsFromGuide(guide) {
  return '너는 수능 국어 독서 문항에서 학생 풀이를 진단하는 평가자다. 아래 가이드에 따라 이 학생의 풀이 하나를 진단한다.\n\n' + guide;
}
export function validateOutput(value, caseId) {
  const result = OutputSchema.parse(value);
  assert.equal(result.caseId, caseId, 'CASE_ID');
  assert.equal(result.firstFailedStep, STEPS.find(s => result.steps[s] === 'FAIL') ?? null, 'FIRST_FAILED_STEP');
  assert.equal(result.unjudgeableReason !== null, result.outcomeType === 'UNJUDGEABLE', 'UNJUDGEABLE_REASON');
  const hasErrors = ['ERROR', 'POLARITY_MISMATCH'].includes(result.outcomeType);
  assert.equal(result.errors.length > 0, hasErrors, 'ERRORS_OUTCOME');
  // Semantic rules such as INSUFFICIENT/UNJUDGEABLE having no FAIL are metrics only.
  return result;
}
export function requestFor(model, source, c, prompts, schema = JSON_SCHEMA) {
  const request = v0.requestFor(model, source, c, prompts, schema);
  request.text.format.name = 'thought_diagnosis_v01';
  return request;
}
export function directoryHashes(dir) {
  const files = {};
  function walk(path, prefix = '') {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = prefix + entry.name, file = join(path, entry.name);
      if (entry.isDirectory()) walk(file, relative + '/');
      else if (entry.isFile()) files[relative] = hash(readFileSync(file));
    }
  }
  walk(dir); return files;
}
function readGold(dir, cases) {
  const gold = read(`${dir}/gold-labels.json`);
  assert.equal(gold.guideHash, hash(readFileSync(`${dir}/LABEL-GUIDE.md`)), 'GOLD_GUIDE_HASH');
  assert.equal(gold.labels.length, cases.length);
  assert.equal(new Set(gold.labels.map(l => l.caseId)).size, cases.length);
  return cases.map(c => validateOutput(gold.labels.find(l => l.caseId === c.id), c.id));
}
function artifactsFor(dir, baselineDir) {
  const guidePath = `${dir}/LABEL-GUIDE.md`, casesPath = `${dir}/cases.json`, goldPath = `${dir}/gold-labels.json`;
  const guide = readFileSync(guidePath, 'utf8'), rawCases = read(casesPath).cases;
  assert.equal(rawCases.length, 36); assert.equal(new Set(rawCases.map(c => c.id)).size, 36);
  const cases = rawCases.map(({ id, questionId, choiceId, rationale }) => ({ id, questionId, choiceId, rationale }));
  readGold(dir, cases);
  const { sources: allSources, filePaths } = loadSources();
  const sources = Object.fromEntries([...new Set(cases.map(c => c.questionId))].map(id => [id, allSources[id]]));
  for (const c of cases) assert.ok(sources[c.questionId]?.choices.some(x => x.choiceId === c.choiceId), 'SOURCE_CASE');
  const baselineCases = read(`${baselineDir}/cases.json`);
  assert.equal(baselineCases.length, 30);
  for (const c of baselineCases) assert.deepEqual(cases.find(x => x.id === c.id), c, 'BASELINE_CASE_CHANGED');
  const prompts = { instructions: instructionsFromGuide(guide) };
  const frozen = { version: '0.1', baselineDir, baselineFileHashes: directoryHashes(baselineDir),
    guideHash: hash(guide), goldHash: hash(readFileSync(goldPath)),
    fileHashes: Object.fromEntries([casesPath, guidePath, goldPath, ...filePaths].map(p => [p, hash(readFileSync(p))])),
    runnerHash: hash(readFileSync(new URL(import.meta.url))),
    dependencyHashes: Object.fromEntries(['scripts/test-thought-diagnosis-v0.mjs', 'scripts/test-trap-map-v0.mjs'].map(p => [p, hash(readFileSync(p))])),
    casesHash: jsonHash(cases), sourcesHash: jsonHash(sources), promptsHash: jsonHash(prompts), schemaHash: jsonHash(JSON_SCHEMA), schema: JSON_SCHEMA,
    seed: 20261010, schedule: scheduleFor(cases), shuffle: 'LCG 1664525/1013904223; Fisher-Yates; persistent state across repeats',
    models: MODELS, priceSource: 'same user-supplied prices as test-trap-map-v0.mjs', cachedInputPricing: 'Full input price',
    reasoningEffort: 'medium', maxOutputTokens: 6000, timeoutMs: 90000, formatRetries: 1,
    metrics: { ...read(`${baselineDir}/FROZEN.json`).metrics,
      unjudgeableReason: 'All gold UNJUDGEABLE cases; misses retained in denominator',
      overclassification: 'Gold INSUFFICIENT/UNJUDGEABLE; any voted FAIL or positive voted errorCount',
      overdeferral: 'Gold ERROR/POLARITY_MISMATCH/NONE; predicted UNJUDGEABLE',
      majorityExtras: 'Fieldwise vote for unjudgeableReason and guessed; no 2-of-3 value = NO_MAJORITY',
      baselineComparison: 'Same 30 case IDs; each version uses its own approved gold labels; undefined ratios = null' } };
  return { artifacts: { 'FROZEN.json': frozen, 'prepared-cases.json': cases, 'sources.json': sources, 'prompts.json': prompts }, cases, sources, prompts, frozen };
}
export function prepare({ dir = DEFAULT_DIR, baselineDir = BASELINE_DIR } = {}) {
  const result = artifactsFor(dir, baselineDir);
  for (const [name, data] of Object.entries(result.artifacts)) {
    const p = `${dir}/${name}`;
    if (existsSync(p)) assert.equal(readFileSync(p, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
    else save(p, data);
  }
  return { prepared: true, cases: 36, cellsPerModel: 108, externalRequests: 0, frozenHash: jsonHash(result.frozen) };
}
export function verifyFrozen(dir = DEFAULT_DIR) {
  const frozen = read(`${dir}/FROZEN.json`), result = artifactsFor(dir, frozen.baselineDir);
  for (const [name, data] of Object.entries(result.artifacts)) assert.equal(readFileSync(`${dir}/${name}`, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
  return result;
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


export function majorityOutput(outputs) {
  return { ...v0.majorityOutput(outputs),
    unjudgeableReason: v0.majority(outputs.map(o => o && Object.hasOwn(o, 'unjudgeableReason') ? o.unjudgeableReason : NO_OUTPUT)),
    guessed: v0.majority(outputs.map(o => o && Object.hasOwn(o, 'guessed') ? o.guessed : NO_OUTPUT)) };
}
export function metrics(gold, predicted) {
  const counted = (include, hit) => {
    const indexes = gold.flatMap((g, i) => include(g) ? [i] : []);
    const count = indexes.filter(i => hit(gold[i], predicted[i])).length;
    return { count, total: indexes.length, rate: ratio(count, indexes.length) };
  };
  return { ...v0.metrics(gold, predicted),
    unjudgeableRecall: counted(g => g.outcomeType === 'UNJUDGEABLE', (g, p) => p?.outcomeType === 'UNJUDGEABLE'),
    unjudgeableReason: counted(g => g.outcomeType === 'UNJUDGEABLE', (g, p) => p?.unjudgeableReason === g.unjudgeableReason),
    overclassification: counted(g => ['INSUFFICIENT', 'UNJUDGEABLE'].includes(g.outcomeType), (g, p) =>
      STEPS.some(s => p?.steps[s] === 'FAIL') || (p?.errorCount ?? p?.errors?.length ?? 0) > 0),
    overdeferral: counted(g => ['ERROR', 'POLARITY_MISMATCH', 'NONE'].includes(g.outcomeType), (g, p) => p?.outcomeType === 'UNJUDGEABLE'),
    guessed: counted(g => typeof g.guessed === 'boolean', (g, p) => p?.guessed === g.guessed) };
}
function outputsFor(dir, cases, model, frozen, validate) {
  return cases.map(c => [1, 2, 3].map(replicate => {
    const p = `${dir}/${model}/${c.id}-r${replicate}.json`;
    if (!existsSync(p)) return null;
    const row = read(p);
    assert.equal(row.frozenHash, jsonHash(frozen)); assert.equal(row.caseId, c.id);
    assert.equal(row.replicate, replicate); assert.equal(row.model, model);
    return row.status === 'VALID' ? validate(row.output, c.id) : null;
  }));
}
function modelMetrics(gold, cases, triples) {
  const citationsFor = predicted => {
    const quotes = predicted.flatMap((o, i) => o ? quoteChecks(o, cases[i].rationale) : []);
    return { exact: quotes.filter(q => q.exact).length, total: quotes.length, rate: ratio(quotes.filter(q => q.exact).length, quotes.length) };
  };
  const repeats = [0, 1, 2].map(r => {
    const predicted = triples.map(t => t[r]);
    return { replicate: r + 1, ...metrics(gold, predicted), citations: citationsFor(predicted) };
  });
  const stable = triples.filter(t => t.every(Boolean) && t.every(o => o.outcomeType === t[0].outcomeType && o.firstFailedStep === t[0].firstFailedStep)).length;
  const quotes = triples.flatMap((t, i) => t.flatMap(o => o ? quoteChecks(o, cases[i].rationale) : []));
  return { repeats, majority: metrics(gold, triples.map(majorityOutput)),
    stability: { stableCases: stable, total: cases.length, rate: ratio(stable, cases.length) },
    citations: { exact: quotes.filter(q => q.exact).length, total: quotes.length, rate: ratio(quotes.filter(q => q.exact).length, quotes.length) } };
}
const percent = n => n === null ? '—' : `${(100 * n).toFixed(1)}%`;
const decimal = n => n === null ? '—' : n.toFixed(4);
const fraction = (n, d) => `${n}/${d} (${percent(ratio(n, d))})`;
const rateCell = m => fraction(m.count, m.total);
const accuracyCell = m => fraction(m.matches, m.total);
const precisionCell = m => fraction(m.truePositive, m.predictedFail);
function table(headers, rows) {
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n` +
    rows.map(row => `| ${row.map(mdCell).join(' | ')} |`).join('\n') + '\n\n';
}
const primaryHeaders = ['모델', '결과 유형 일치', '첫 실패 단계 일치', '함정 태그 Jaccard', '판단 불가 재현율', '과잉 분류율', '과잉 보류율', 'S5 실패 정밀도'];
const primaryCells = m => [accuracyCell(m.outcomeType), accuracyCell(m.firstFailedStep), decimal(m.traps.meanJaccard),
  rateCell(m.unjudgeableRecall), rateCell(m.overclassification), rateCell(m.overdeferral), precisionCell(m.steps.S5_JUDGE)];
export function report({ dir = DEFAULT_DIR } = {}) {
  const { cases, frozen } = verifyFrozen(dir), gold = readGold(dir, cases);
  const outputs = {}, results = { version: '0.1', frozenHash: jsonHash(frozen), goldHash: frozen.goldHash, models: {}, baselineComparison: {} };
  const baselineDir = frozen.baselineDir, baselineCases = read(`${baselineDir}/cases.json`), baselineFrozen = read(`${baselineDir}/FROZEN.json`);
  const baselineGoldFile = read(`${baselineDir}/gold-labels.json`);
  assert.equal(baselineGoldFile.guideHash, hash(readFileSync(`${baselineDir}/LABEL-GUIDE.md`)));
  const baselineGold = baselineCases.map(c => v0.validateOutput(baselineGoldFile.labels.find(l => l.caseId === c.id), c.id));
  const indexes = baselineCases.map(c => cases.findIndex(x => x.id === c.id));
  results.baselineComparison.caseIds = baselineCases.map(c => c.id);
  results.baselineComparison.goldHashes = { v0: hash(readFileSync(`${baselineDir}/gold-labels.json`)), v01: frozen.goldHash };
  results.baselineComparison.goldChanges = baselineGold.flatMap((g, i) => {
    const changedFields = ['outcomeType', 'firstFailedStep', ...STEPS].filter(k =>
      JSON.stringify(STEPS.includes(k) ? g.steps[k] : g[k]) !== JSON.stringify(STEPS.includes(k) ? gold[indexes[i]].steps[k] : gold[indexes[i]][k]));
    return changedFields.length ? [{ caseId: g.caseId, changedFields }] : [];
  });
  results.baselineComparison.models = {};
  for (const model of Object.keys(MODELS)) {
    const triples = outputsFor(dir, cases, model, frozen, validateOutput); outputs[model] = triples;
    results.models[model] = { run: read(`${dir}/${model}/RESULTS.json`), ...modelMetrics(gold, cases, triples) };
    const baselineTriples = outputsFor(baselineDir, baselineCases, model, baselineFrozen, v0.validateOutput);
    results.baselineComparison.models[model] = {
      v0: modelMetrics(baselineGold, baselineCases, baselineTriples),
      v01: modelMetrics(indexes.map(i => gold[i]), baselineCases, indexes.map(i => triples[i])) };
  }
  let markdown = '# 사고 진단 v0.1 결과\n\n36사례 × 모델별 3회. 첫 표는 3회 다수결이다.\n\n';
  markdown += table(primaryHeaders, Object.entries(results.models).map(([model, m]) => [model, ...primaryCells(m.majority)]));
  markdown += 'v0 대 v0.1: 공통 30사례의 다수결. 각 버전의 승인 정답지를 사용했다.\n\n';
  markdown += table(['모델', '버전', ...primaryHeaders.slice(1)], Object.entries(results.baselineComparison.models)
    .flatMap(([model, versions]) => Object.entries(versions).map(([version, m]) => [model, version, ...primaryCells(m.majority)])));
  markdown += `정답지가 바뀐 기존 사례: ${results.baselineComparison.goldChanges.map(c => `${c.caseId} (${c.changedFields.join(', ')})`).join('; ') || '0'}.\n\n`;
  markdown += '다수결은 칸별로 계산하며 2회 이상 일치하지 않으면 NO_MAJORITY다. 무효·누락 출력은 정확도 분모에 포함하고 태그 점수는 0으로 센다. —는 분모가 0인 지표다. 판단 불가 사유 일치의 분모는 정답 UNJUDGEABLE 전체다. 과잉 분류는 FAIL 단계 또는 오류가 하나라도 있는 경우다.\n\n';
  markdown += '## 반복별 지표와 다수결\n\n';
  const allRows = Object.entries(results.models).flatMap(([model, m]) => [...m.repeats.map(r => [model, `${r.replicate}회`, r]), [model, '다수결', m.majority]]);
  markdown += table(['모델', '집계', ...primaryHeaders.slice(1)], allRows.map(([model, label, m]) => [model, label, ...primaryCells(m)]));
  markdown += table(['모델', '집계', '결과 유형 κ', '판단 불가 사유 일치', 'guessed 일치', '정답 태그 전부 포함', '오류 개수 일치', '인용 부분 문자열 일치'],
    allRows.map(([model, label, m]) => [model, label, decimal(m.outcomeType.kappa), rateCell(m.unjudgeableReason), rateCell(m.guessed),
      fraction(m.traps.fullyIncluded, m.traps.total), accuracyCell(m.errorCount), m.citations ? fraction(m.citations.exact, m.citations.total) : '투표 인용 없음']));
  markdown += '## 단계별 지표\n\n';
  markdown += table(['모델', '집계', '단계', '일치', 'FAIL 재현율', 'FAIL 정밀도'], allRows.flatMap(([model, label, m]) =>
    STEPS.map(s => [model, label, s, accuracyCell(m.steps[s]), fraction(m.steps[s].truePositive, m.steps[s].goldFail), precisionCell(m.steps[s])])));
  markdown += '## 실행·반복 안정성·전체 인용\n\n';
  markdown += table(['모델', '완료 칸', '요청/상한', '추정 USD/상한', '미확정 예약 USD', 'VALID', '형식 오류 시도/최종', '정책 거부', 'API 오류', '재시도', '반복 안정성', '인용 일치'],
    Object.entries(results.models).map(([model, m]) => { const r = m.run; return [model, `${r.completedCells}/${r.plannedCells}`, `${r.requests}/${MODELS[model].maxRequests}`,
      `${r.conservativeUsd.toFixed(7)}/${MODELS[model].usdCap.toFixed(2)}`, r.unknownReservedUsd.toFixed(7), r.statuses.VALID,
      `${r.formatErrors}/${r.statuses.FORMAT_ERROR}`, r.statuses.POLICY_REFUSAL, r.statuses.API_ERROR, r.retries,
      fraction(m.stability.stableCases, m.stability.total), fraction(m.citations.exact, m.citations.total)]; }));
  markdown += '비용은 v0과 같은 사용자 제공 단가를 적용하고 캐시 입력도 전체 입력 단가로 계산했다. 반복 안정성은 세 출력이 모두 VALID이며 결과 유형·첫 실패 단계가 모두 같을 때 센다.\n\n';
  markdown += '## 공통 30사례 반복별 비교\n\n';
  markdown += table(['모델', '버전', '반복', ...primaryHeaders.slice(1)], Object.entries(results.baselineComparison.models).flatMap(([model, versions]) =>
    Object.entries(versions).flatMap(([version, m]) => m.repeats.map(r => [model, version, `${r.replicate}회`, ...primaryCells(r)]))));
  markdown += `정답 라벨 SHA-256: ${results.goldHash}\n\n고정 실행 계약 해시: ${results.frozenHash}\n\nv0 보존 파일 수: ${Object.keys(frozen.baselineFileHashes).length}. prepare·run·report에서 해시를 검증했다.\n`;
  let review = '# 사례별 정답 라벨과 모델 출력\n\n';
  for (const [i, c] of cases.entries()) {
    review += `## ${c.id}\n\n문항: ${c.questionId}\n\n학생 선택: ${c.choiceId}\n\n학생 풀이: ${c.rationale}\n\n`;
    const columns = [gold[i], ...outputs['gpt-6-luna'][i], ...outputs['gpt-6.1-sol'][i]];
    const fields = ['outcomeType', 'unjudgeableReason', 'guessed', ...STEPS, 'firstFailedStep', 'errors', 'note'];
    review += table(['항목', '정답', 'luna 1회', 'luna 2회', 'luna 3회', 'sol 1회', 'sol 2회', 'sol 3회'], fields.map(k => [k, ...columns.map(o => {
      if (!o) return NO_OUTPUT;
      if (STEPS.includes(k)) return o.steps[k];
      if (k === 'errors') return o.errors.map(e => `${e.tag} / ${e.step} / “${e.studentQuote}”`).join('\n') || '없음';
      return String(o[k]);
    })]));
  }
  save(`${dir}/RESULTS.json`, results, 'w');
  writeFileSync(`${dir}/REPORT.md`, markdown); writeFileSync(`${dir}/REVIEW.md`, review);
  return { reported: true, models: Object.keys(results.models), cases: cases.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, model] = process.argv.slice(2);
  try {
    const result = mode === 'prepare' ? prepare() : mode === 'run' ? await run({ model, onProgress: p => console.log(JSON.stringify(p)) }) : mode === 'report' ? report() : null;
    assert.ok(result, 'Usage: prepare | run <model> | report');
    console.log(JSON.stringify(result, null, 2));
    if (result.stop || (mode === 'run' && result.completedCells !== 108)) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
