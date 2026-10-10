// D-0109 offline experiment. No operating code, memory writes, or .env reads.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema } from '../packages/pipeline/dist/index.js';

export const DEFAULT_DIR = 'docs/experiments/trap-map-v0-external-rates-2026-10-10';
export const MODELS = {
  'gpt-6-luna': { input: 0.10, output: 0.50, maxRequests: 40, usdCap: 0.5 },
  'gpt-6.1-sol': { input: 2, output: 10, maxRequests: 40, usdCap: 3.0 },
};
export const QUESTIONS = [
  { questionId: 'corporate-law-q13', examSeq: 348, status: 'USED' },
  { questionId: 'dopamine-motor-control-q13', examSeq: 352, status: 'USED' },
  { questionId: 'information-asymmetry-free-marketplace-q13', examSeq: 356, status: 'USED' },
  { questionId: 'surface-tension-laplace-q16', examSeq: 356, status: 'USED' },
  { questionId: 'mrna-vaccine-lipid-nanoparticle-q19', examSeq: 306, status: 'USED' },
  { questionId: 'gongsun-long-later-mohists-q12', examSeq: 308, status: 'DATE_MISMATCH_CANDIDATE' },
];
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const ENDPOINT = 'https://www.megastudy.net/Entinfo/correctRate/main_rate_ax.asp';
const REFERER = 'https://www.megastudy.net/Entinfo/correctRate/main.asp';
const SOURCE = 'megastudy-correctRate, 풀서비스 이용자 채점 기준, 내부 실험 전용(D-0109)';
export const hash = x => createHash('sha256').update(x).digest('hex');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = x => JSON.stringify(x, null, 2) + '\n';
const save = (p, x, flag = 'wx') => writeFileSync(p, serialize(x), { flag });
const normalize = x => x.replace(/\s+/gu, ' ').trim();

// HTML cell text, including numeric entities and percent signs.
const cellText = x => normalize(x.replace(/<[^>]*>/gu, ' ').replace(/&#x([0-9a-f]+);/giu,
  (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/gu,
  (_, n) => String.fromCodePoint(Number(n))).replace(/&nbsp;/giu, ' ').replace(/&amp;/giu, '&'));

export function parseRateHtml(bytes) {
  const html = new TextDecoder('euc-kr', { fatal: true }).decode(bytes);
  const rows = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(m => cellText(m[1]));
    if (!/^\d+$/u.test(cells[0] ?? '')) continue;
    assert.equal(cells.length, 10, `RATE_STRUCTURE: expected 10 cells, got ${cells.length}`);
    const number = Number(cells[0]);
    const answer = /^[1-5]$/u.test(cells[1]) ? Number(cells[1]) : '①②③④⑤'.indexOf(cells[1]) + 1;
    assert.ok(answer >= 1 && answer <= 5, `RATE_STRUCTURE: invalid answer at ${number}`);
    const percent = s => {
      assert.match(s, /^\d+(?:\.\d+)?\s*%$/u, `RATE_STRUCTURE: invalid percentage ${s}`);
      return Number(s.replace(/\s*%$/u, ''));
    };
    assert.match(cells[3], /^\d+$/u, 'RATE_STRUCTURE: invalid points');
    rows.push({ number, answer, difficulty: cells[2], points: Number(cells[3]),
      correctRate: percent(cells[4]), choicePercents: cells.slice(5).map(percent) });
  }
  assert.ok(rows.length, 'RATE_STRUCTURE: no question rows');
  assert.equal(new Set(rows.map(r => r.number)).size, rows.length, 'RATE_STRUCTURE: duplicate question rows');
  return { html, rows, hasSubjectTabs: /1004/u.test(html) && /1005/u.test(html) };
}

export function validateRate(row, source, status) {
  const failures = [];
  if (!row || row.number !== source.questionNumber) failures.push('QUESTION_NUMBER_MISMATCH');
  if (row?.answer !== Number(source.answerChoiceId.slice(1))) failures.push('ANSWER_MISMATCH');
  const sum = row?.choicePercents?.reduce((n, v) => n + v, 0);
  if (!(sum >= 97 && sum <= 103) || row?.choicePercents?.some(v => v < 0 || v > 100)) failures.push('PERCENT_SUM_INVALID');
  if (status === 'USED') assert.equal(failures.length, 0, `RATE_VALIDATION: ${source.questionId}: ${failures.join(', ')}`);
  return { passed: failures.length === 0, failures, choicePercentSum: sum ?? null };
}

export function loadSources() {
  const catalogPath = `${FIX}/source-direct-runtime-v1.json`, catalog = read(catalogPath);
  const filePaths = [catalogPath], sources = {};
  for (const { questionId } of QUESTIONS) {
    const path = `${FIX}/public/${questionId}.json`; filePaths.push(path);
    const product = read(path), reference = catalog.questions.find(q => q.questionId === questionId);
    assert.ok(reference, `Missing reference ${questionId}`);
    sources[questionId] = SourceDirectProblemBundleSchema.parse({ ...product, schemaVersion: 'source-direct-problem-bundle-v2',
      media: product.media.map(({ mediaId, url, mimeType, width, height, contentHash, placement }) =>
        ({ mediaId, url, mimeType, width, height, ...(contentHash === undefined ? {} : { contentHash }), placement })),
      stemPolarity: reference.stemPolarity, answerChoiceId: reference.answerChoiceId, officialExplanation: reference.officialExplanation });
  }
  return { sources, filePaths };
}

export async function collectRates({ dir = DEFAULT_DIR, fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now() } = {}) {
  assert.ok(!existsSync(`${dir}/external-rates.json`), 'external-rates.json already exists; recollection refused');
  const { sources } = loadSources();
  mkdirSync(`${dir}/raw`, { recursive: true });
  if (!existsSync(`${dir}/raw/.gitignore`)) writeFileSync(`${dir}/raw/.gitignore`, '*\n!.gitignore\n');
  const ledgerPath = `${dir}/collect-requests.jsonl`;
  const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  assert.ok(!ledger.length, 'Collection already attempted; stop and report before another collection');
  let lastRequestAt = null;
  const requests = [], items = [];
  async function request(examSeq, selSubCd) {
    assert.ok(requests.length < 14, 'RUN_LIMIT: collection request cap');
    if (lastRequestAt !== null) await sleep(Math.max(1000 - (now() - lastRequestAt), 0));
    const body = `examSeq=${examSeq}&tabNo=1${selSubCd ? `&selSubCd=${selSubCd}` : ''}&selExamType=1`;
    const requestId = `rate-${requests.length + 1}`, fetchedAt = new Date(now()).toISOString();
    const metadata = { requestId, examSeq, selSubCd: selSubCd ?? null, url: ENDPOINT, body, fetchedAt };
    requests.push(metadata); lastRequestAt = now();
    appendFileSync(ledgerPath, JSON.stringify({ event: 'START', ...metadata }) + '\n');
    try {
      const response = await fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error',
        headers: { Referer: REFERER, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
        signal: AbortSignal.timeout(90000) });
      assert.ok(response.ok, `RATE_NETWORK: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const rawPath = `raw/${examSeq}-${selSubCd ?? 'no-tab'}.html`;
      writeFileSync(`${dir}/${rawPath}`, bytes, { flag: 'wx' });
      Object.assign(metadata, { sha256: hash(bytes), rawPath });
      const parsed = parseRateHtml(bytes);
      appendFileSync(ledgerPath, JSON.stringify({ event: 'END', ...metadata, status: 'VALID', rows: parsed.rows.length }) + '\n');
      return { ...parsed, metadata };
    } catch (error) {
      appendFileSync(ledgerPath, JSON.stringify({ event: 'ERROR', ...metadata, error: error.message }) + '\n');
      throw error;
    }
  }
  for (const examSeq of [...new Set(QUESTIONS.map(q => q.examSeq))]) {
    // All listed grade-3 rounds have elective tabs; grade-2 306 has one table.
    const tabs = examSeq === 306 ? [null] : ['1004', '1005'];
    for (const selSubCd of tabs) {
      const result = await request(examSeq, selSubCd);
      for (const q of QUESTIONS.filter(q => q.examSeq === examSeq)) {
        const source = sources[q.questionId], row = result.rows.find(r => r.number === source.questionNumber);
        const validation = validateRate(row, source, q.status);
        let item = items.find(i => i.questionId === q.questionId);
        if (!item) { item = { ...q, exam: source.exam, questionNumber: source.questionNumber,
          answerChoiceId: source.answerChoiceId, bySelSubCd: {} }; items.push(item); }
        item.bySelSubCd[selSubCd ?? 'NO_TAB'] = { ...row, ...result.metadata, validation };
      }
    }
  }
  const result = { source: SOURCE, requests: requests.length, requestCap: 14, items };
  save(`${dir}/external-rates.json`, result);
  return { collected: true, requests: requests.length, used: items.filter(i => i.status === 'USED').length,
    candidates: items.filter(i => i.status === 'DATE_MISMATCH_CANDIDATE').length };
}

// The literal instruction block is checked against §1-3 at prepare and run.
export const INSTRUCTIONS = `너는 수능 국어 독서 문항 분석가다. 지문, 〈보기〉, 발문, 다섯 선지, 정답, 공식 해설을 읽고 선지마다 다음을 분석한다.

1. 판정 근거(decisiveEvidence): 그 선지의 정오를 가르는 원문 구절. 지문·〈보기〉·발문의 문자열을 그대로 인용한다.
2. 근거 범위(evidenceSpan): SAME_SENTENCE(한 문장) / SAME_PARAGRAPH(한 문단 안 여러 문장) / CROSS_PARAGRAPH(여러 문단 결합) / PASSAGE_PLUS_SCENARIO(지문과 〈보기〉 결합).
3. 변형 종류(transformType): 선지가 근거를 어떻게 바꾸었는가.
   FAITHFUL_PARAPHRASE(충실한 재진술), INFERENCE_VALID(타당한 추론으로 참), DIRECTION_REVERSAL(인과·증감·논리 방향 역전),
   ATTRIBUTION_SWAP(주장·입장의 주체 교체), CONDITION_CHANGE(조건·한정의 누락·추가), SCOPE_CHANGE(범위 확대·축소),
   MAPPING_SHIFT(〈보기〉 요소를 지문의 다른 개념에 대응), UNSUPPORTED_ADDITION(근거 없는 내용 추가).
4. 변형 크기(transformSize): NONE / WORD(한 단어) / PHRASE(구) / STRUCTURE(문장 구조·관계).
5. 유인 태그(attractionTags): 수험생이 이 선지를 답으로 고르게 만드는 사고 오류. 정답 선지는 빈 배열로 둔다.
   발문이 '적절하지 않은 것'을 고르게 하면, 오답 선지를 고르는 것은 '맞는 진술을 틀렸다고 판단'하는 것임에 주의한다.
   POLARITY(발문의 적절/부적절 방향 처리 실패), REFERENT(기호·지시 대상 혼동), ATTRIBUTION(입장·주체 귀속 혼동),
   DIRECTION(인과·논리·증감 방향 오독), CONDITION(조건·한정 누락), SCOPE(범위 과잉 일반화·축소),
   MAPPING(〈보기〉 사례를 지문 개념에 잘못 대응), SURFACE_MATCH(지문 어휘와 표면적으로 일치해 그럴듯해 보임),
   PARAPHRASE_DISTANCE(맞는 내용이지만 재진술이 멀어 틀려 보임), MULTI_STEP(여러 근거를 결합하다 이탈),
   OUTSIDE_KNOWLEDGE(배경지식·상식에 기대 판단).
6. 유인 경로(attractionMechanism): 수험생이 이 선지를 고르게 되는 사고 경로를 한두 문장으로 쓴다. 정답 선지는 정답을 맞히는 데 필요한 핵심 판단을 쓴다.
7. 예상 선택 비율(predictedSelectionPercent): 고3 수험생 집단이 각 선지를 고를 비율(정수 %). 다섯 선지 합은 100이다.
   정답 선지의 비율이 예상 정답률이다.`;
export const OutputSchema = z.strictObject({ choices: z.array(z.strictObject({
  choiceId: z.enum(['C1', 'C2', 'C3', 'C4', 'C5']), isAnswer: z.boolean(),
  decisiveEvidence: z.array(z.strictObject({ source: z.enum(['PASSAGE', 'SCENARIO', 'STEM']), quote: z.string() })),
  evidenceSpan: z.enum(['SAME_SENTENCE', 'SAME_PARAGRAPH', 'CROSS_PARAGRAPH', 'PASSAGE_PLUS_SCENARIO']),
  transformType: z.enum(['FAITHFUL_PARAPHRASE', 'INFERENCE_VALID', 'DIRECTION_REVERSAL', 'ATTRIBUTION_SWAP',
    'CONDITION_CHANGE', 'SCOPE_CHANGE', 'MAPPING_SHIFT', 'UNSUPPORTED_ADDITION']),
  transformSize: z.enum(['NONE', 'WORD', 'PHRASE', 'STRUCTURE']),
  attractionTags: z.array(z.enum(['POLARITY', 'REFERENT', 'ATTRIBUTION', 'DIRECTION', 'CONDITION', 'SCOPE',
    'MAPPING', 'SURFACE_MATCH', 'PARAPHRASE_DISTANCE', 'MULTI_STEP', 'OUTSIDE_KNOWLEDGE'])),
  attractionMechanism: z.string(), predictedSelectionPercent: z.int().min(0).max(100),
})).length(5) });
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);
const HANDOFF = 'docs/handoffs/2026-10-10-trap-map-v0-external-rates.md';
const jsonHash = x => hash(JSON.stringify(x));
const labelFor = c => `${c.questionId}-r${c.replicate}`;
const readLedger = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];

export function scheduleFor(seed = 20261010) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  return [1, 2, 3].flatMap(replicate => {
    const ids = QUESTIONS.map(q => q.questionId);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.map(questionId => ({ questionId, replicate }));
  });
}

export function requestFor(model, source, prompts = { instructions: INSTRUCTIONS }, schema = JSON_SCHEMA) {
  assert.ok(Object.hasOwn(MODELS, model), 'Unsupported model');
  // A source-only projection. No external-rates object is accepted here, including on retries.
  return { model, instructions: prompts.instructions, reasoning: { effort: 'medium' }, max_output_tokens: 8000,
    input: [{ role: 'user', content: [
      { type: 'input_text', text: serialize(source) },
      ...source.media.map(m => ({ type: 'input_image', image_url: m.url, detail: 'high' })),
    ] }], text: { format: { type: 'json_schema', name: 'trap_map_v0', strict: true, schema } } };
}

export function frozenArtifacts(dir) {
  const documented = readFileSync(HANDOFF, 'utf8').split('### 1-3. 지시문')[1]?.split('```')[1]?.trim();
  assert.equal(INSTRUCTIONS, documented, 'HANDOFF_CONFLICT: instructions differ from §1-3');
  const { sources, filePaths } = loadSources(), ratesPath = `${dir}/external-rates.json`, rates = read(ratesPath);
  assert.equal(rates.items.length, QUESTIONS.length, 'External question count changed');
  for (const q of QUESTIONS) {
    const item = rates.items.find(i => i.questionId === q.questionId);
    assert.ok(item, `Missing external item: ${q.questionId}`);
    assert.equal(item.status, q.status); assert.equal(item.examSeq, q.examSeq);
    const tabs = q.examSeq === 306 ? ['NO_TAB'] : ['1004', '1005'];
    assert.deepEqual(Object.keys(item.bySelSubCd).sort(), tabs.sort());
    for (const row of Object.values(item.bySelSubCd)) validateRate(row, sources[q.questionId], q.status);
  }
  const prompts = { instructions: INSTRUCTIONS }, schedule = scheduleFor();
  const frozen = { version: 1, fileHashes: Object.fromEntries([...filePaths, ratesPath].map(p => [p, hash(readFileSync(p))])),
    runnerHash: hash(readFileSync(new URL(import.meta.url))), promptsHash: jsonHash(prompts), sourcesHash: jsonHash(sources),
    schemaHash: jsonHash(JSON_SCHEMA), schema: JSON_SCHEMA, externalRatesHash: hash(readFileSync(ratesPath)),
    schedule, seed: 20261010, shuffle: 'LCG 1664525/1013904223, Fisher-Yates, persistent state across repetitions',
    models: MODELS, priceSource: 'user-supplied official prices 2026-10-07', cachedInputPricing: 'Full input price',
    reasoningEffort: 'medium', maxOutputTokens: 8000, timeoutMs: 90000, formatRetries: 1,
    metrics: { topWrong: '|P intersect A| / |P|; chance = |A|/4; exact floating-point ties',
      ranks: 'Average ranks for ties; constant-vector correlation null; nulls excluded from mean with counts',
      meanPrediction: 'All three VALID repeats required per question; arithmetic mean, no rounding before comparisons',
      stability: 'Three equal P sets; population SD (ddof=0); all 3 pairwise tag Jaccards and transform equality; empty/empty Jaccard=1',
      stabilityScope: 'USED five questions; tags/transforms and SD include all five choices; candidate reported separately',
      citations: 'Per quote, normalized whitespace substring in declared source; empty quote does not match; final VALID outputs only' } };
  return { artifacts: { 'FROZEN.json': frozen, 'prompts.json': prompts, 'sources.json': sources }, rates, sources, prompts, frozen };
}
export function prepare({ dir = DEFAULT_DIR } = {}) {
  const { artifacts, frozen } = frozenArtifacts(dir);
  mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(artifacts)) {
    const p = `${dir}/${name}`;
    if (existsSync(p)) assert.equal(readFileSync(p, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
    else save(p, data);
  }
  return { prepared: true, questions: 6, cellsPerModel: 18, externalRequests: 0, frozenHash: jsonHash(frozen) };
}
function verifyFrozen(dir) {
  const result = frozenArtifacts(dir);
  for (const [name, data] of Object.entries(result.artifacts)) {
    assert.ok(existsSync(`${dir}/${name}`), `Run prepare first: ${name}`);
    assert.equal(readFileSync(`${dir}/${name}`, 'utf8'), serialize(data), `Frozen artifact changed: ${name}`);
  }
  return result;
}
export function validateOutput(value, source) {
  const output = OutputSchema.parse(value);
  assert.deepEqual(output.choices.map(c => c.choiceId).sort(), source.choices.map(c => c.choiceId).sort(), 'CHOICE_IDS');
  for (const c of output.choices) {
    assert.equal(c.isAnswer, c.choiceId === source.answerChoiceId, 'IS_ANSWER');
    if (c.isAnswer) assert.equal(c.attractionTags.length, 0, 'ANSWER_TAGS');
  }
  const sum = output.choices.reduce((n, c) => n + c.predictedSelectionPercent, 0);
  assert.ok(sum >= 98 && sum <= 102, `PERCENT_SUM: ${sum}`);
  return output;
}
export function citationChecks(output, source) {
  const texts = { PASSAGE: source.passage, SCENARIO: source.scenario ?? '', STEM: source.stem };
  return output.choices.flatMap(c => c.decisiveEvidence.map(e => ({ choiceId: c.choiceId, ...e,
    exact: normalize(e.quote).length > 0 && normalize(texts[e.source]).includes(normalize(e.quote)) })));
}
export function usageCosts(usage, model) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const rates = MODELS[model];
  return { conservativeUsd: (usage.input_tokens * rates.input + usage.output_tokens * rates.output) / 1e6 };
}
export function accounting(ledger) {
  const starts = ledger.filter(e => e.event === 'START'), ends = ledger.filter(e => e.event === 'END');
  return { requests: starts.length, conservativeUsd: ends.reduce((n, e) => n + (e.costs?.conservativeUsd ?? 0), 0),
    unknownReservedUsd: starts.reduce((n, s) => n + (ends.find(e => e.requestId === s.requestId)?.costs ? 0 : s.reservedUsd), 0) };
}
function ensureClosedLedger(ledger) {
  assert.ok(!ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId)),
    'RUN_LIMIT: START without END; incomplete ledger resume refused');
}
function runSummary(dir, model, frozen, ledger, stop = null) {
  const rows = frozen.schedule.map(c => `${dir}/${model}/${labelFor(c)}.json`).filter(existsSync).map(read);
  const ends = ledger.filter(e => e.event === 'END'), citations = rows.flatMap(r => r.citations ?? []);
  return { model, ...accounting(ledger), completedCells: rows.length, plannedCells: 18, stop,
    statuses: Object.fromEntries(['VALID', 'FORMAT_ERROR', 'POLICY_REFUSAL', 'API_ERROR'].map(s => [s, rows.filter(r => r.status === s).length])),
    formatErrors: rows.reduce((n, r) => n + r.attempts.filter(a => a.status === 'FORMAT_ERROR').length, 0),
    retries: rows.reduce((n, r) => n + r.retryCount, 0),
    citationExact: citations.filter(c => c.exact).length, citationTotal: citations.length,
    citationExactRate: citations.length ? citations.filter(c => c.exact).length / citations.length : null,
    tokens: { input: ends.reduce((n, e) => n + (e.usage?.input_tokens ?? 0), 0),
      output: ends.reduce((n, e) => n + (e.usage?.output_tokens ?? 0), 0),
      cached: ends.reduce((n, e) => n + (e.usage?.input_tokens_details?.cached_tokens ?? 0), 0),
      reasoning: ends.reduce((n, e) => n + (e.usage?.output_tokens_details?.reasoning_tokens ?? 0), 0),
      unknownUsageRequests: ends.filter(e => !e.costs).length },
    actualModels: [...new Set(ends.map(e => e.model).filter(Boolean))], frozenHash: jsonHash(frozen) };
}
export async function run({ dir = DEFAULT_DIR, model, transport, onProgress = () => {} } = {}) {
  assert.ok(Object.hasOwn(MODELS, model), 'Unsupported model');
  const { frozen, sources, prompts } = verifyFrozen(dir), frozenHash = jsonHash(frozen);
  const runDir = `${dir}/${model}`, ledgerPath = `${runDir}/requests.jsonl`;
  mkdirSync(runDir, { recursive: true });
  const ledger = readLedger(ledgerPath); ensureClosedLedger(ledger);
  // Never resend a completed request whose cell was lost after a process interruption.
  for (const cell of frozen.schedule) {
    const label = labelFor(cell), p = `${runDir}/${label}.json`;
    if (existsSync(p)) { const row = read(p); assert.equal(row.frozenHash, frozenHash); assert.equal(row.model, model); }
    else assert.ok(!ledger.some(e => e.label === label), `RUN_LIMIT: ledger has requests but missing cell ${label}; stop before resume`);
  }
  const record = row => { appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); ledger.push(row); };
  let client, stop = null;
  for (const cell of frozen.schedule) {
    const label = labelFor(cell), p = `${runDir}/${label}.json`;
    if (existsSync(p)) continue;
    const source = sources[cell.questionId], request = requestFor(model, source, prompts, frozen.schema);
    const row = { ...cell, label, model, frozenHash, status: null, output: null, citations: [], attempts: [], retryCount: 0,
      hasInputImage: request.input[0].content.some(c => c.type === 'input_image') };
    for (let attempt = 1; attempt <= 2; attempt++) {
      const rates = MODELS[model], a = accounting(ledger);
      // Same conservative byte-bound input reservation as the reference experiment.
      const reservedUsd = (Buffer.byteLength(JSON.stringify(request)) * rates.input + 8000 * rates.output) / 1e6;
      if (a.requests >= rates.maxRequests || a.conservativeUsd + a.unknownReservedUsd + reservedUsd > rates.usdCap) {
        stop = 'RUN_LIMIT: request/cost limit'; break;
      }
      if (attempt === 2) row.retryCount++;
      const requestId = `${label}-${a.requests + 1}`, start = performance.now(), requestedAtUtc = new Date().toISOString();
      record({ event: 'START', requestId, label, model, attempt, requestedAtUtc, reservedUsd, frozenHash,
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
        // HTTP errors are not format-validation retries. Network failures stop the run.
        if (httpStatus !== 400) stop = `API_ERROR: ${error.message}`;
        break;
      }
      record({ event: 'END', requestId, label, attempt, durationMs: performance.now() - start,
        responseId: response.id, model: response.model, status: response.status,
        costs: usageCosts(response.usage, model), usage: response.usage ?? null, outputText: response.output_text ?? null });
      const result = { requestId, status: 'VALID', response: structuredClone(response), error: null };
      row.attempts.push(result);
      if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) {
        result.status = row.status = 'POLICY_REFUSAL'; break;
      }
      try {
        assert.equal(response.status, 'completed', `RESPONSE_STATUS: ${response.status}`);
        row.output = validateOutput(JSON.parse(response.output_text), source);
        row.citations = citationChecks(row.output, source); row.status = 'VALID'; break;
      } catch (error) { result.status = row.status = 'FORMAT_ERROR'; result.error = String(error); row.error = String(error); }
    }
    if (stop?.startsWith('RUN_LIMIT')) break; // Not a completed cell; preserve any prior request in ledger.
    save(p, row); onProgress({ model, label, status: row.status, ...accounting(ledger) });
    if (stop) break;
  }
  const summary = runSummary(dir, model, frozen, ledger, stop);
  writeFileSync(`${runDir}/RESULTS.json`, serialize(summary)); return summary;
}
const mean = xs => { const valid = xs.filter(x => x !== null); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; };
export function pearson(xs, ys) {
  assert.equal(xs.length, ys.length);
  if (xs.length < 2) return null;
  const mx = mean(xs), my = mean(ys);
  const vx = xs.reduce((n, x) => n + (x - mx) ** 2, 0), vy = ys.reduce((n, y) => n + (y - my) ** 2, 0);
  if (vx === 0 || vy === 0) return null;
  return xs.reduce((n, x, i) => n + (x - mx) * (ys[i] - my), 0) / Math.sqrt(vx * vy);
}
export function ranks(xs) {
  return xs.map(x => 1 + xs.filter(y => y < x).length + (xs.filter(y => y === x).length - 1) / 2);
}
export const spearman = (xs, ys) => pearson(ranks(xs), ranks(ys));
export function topSet(xs, ids) {
  const maximum = Math.max(...xs);
  return ids.filter((_, i) => xs[i] === maximum);
}
export function predictionMetrics(predictions, rates, source) {
  const positions = source.choices.map(c => c.position - 1), ids = source.choices.map(c => c.choiceId);
  const wrong = ids.map((id, i) => ({ id, i })).filter(c => c.id !== source.answerChoiceId);
  const predictedWrong = wrong.map(c => predictions[c.i]), actualWrong = wrong.map(c => rates.choicePercents[positions[c.i]]);
  const wrongIds = wrong.map(c => c.id), P = topSet(predictedWrong, wrongIds), A = topSet(actualWrong, wrongIds);
  return { P, A, topWrongHit: P.filter(id => A.includes(id)).length / P.length, chance: A.length / 4,
    withinQuestionSpearman: spearman(predictedWrong, actualWrong),
    answerRateAbsoluteError: Math.abs(predictions[ids.indexOf(source.answerChoiceId)] - rates.correctRate),
    predictedWrong, actualWrong };
}
export function aggregateMetrics(rows) {
  return { questions: rows.length, wrongChoices: rows.reduce((n, r) => n + r.predictedWrong.length, 0),
    topWrongHit: mean(rows.map(r => r.topWrongHit)), chance: mean(rows.map(r => r.chance)),
    withinQuestionSpearman: mean(rows.map(r => r.withinQuestionSpearman)),
    definedWithinQuestionCorrelations: rows.filter(r => r.withinQuestionSpearman !== null).length,
    pooledSpearman: spearman(rows.flatMap(r => r.predictedWrong), rows.flatMap(r => r.actualWrong)),
    pooledPearson: pearson(rows.flatMap(r => r.predictedWrong), rows.flatMap(r => r.actualWrong)),
    answerRateMAE: mean(rows.map(r => r.answerRateAbsoluteError)) };
}
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b), union = new Set([...A, ...B]);
  return union.size ? [...A].filter(v => B.has(v)).length / union.size : 1;
}
export function repetitionStability(outputs, source) {
  assert.equal(outputs.length, 3);
  const aligned = outputs.map(o => source.choices.map(c => o.choices.find(x => x.choiceId === c.choiceId)));
  const wrong = source.choices.filter(c => c.choiceId !== source.answerChoiceId).map(c => c.choiceId);
  const sets = aligned.map(cs => topSet(cs.filter(c => wrong.includes(c.choiceId)).map(c => c.predictedSelectionPercent), wrong));
  const sds = source.choices.map((_, i) => {
    const xs = aligned.map(cs => cs[i].predictedSelectionPercent), m = mean(xs);
    return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
  });
  const pairs = [[0, 1], [0, 2], [1, 2]], tags = [], transforms = [];
  for (const [a, b] of pairs) for (let i = 0; i < source.choices.length; i++) {
    tags.push(jaccard(aligned[a][i].attractionTags, aligned[b][i].attractionTags));
    transforms.push(Number(aligned[a][i].transformType === aligned[b][i].transformType));
  }
  return { topSets: sets, topWrongAllThreeEqual: sets.every(s => JSON.stringify(s) === JSON.stringify(sets[0])),
    predictionPopulationSD: sds, meanPredictionPopulationSD: mean(sds),
    tagPairwiseJaccard: mean(tags), tagComparisons: tags.length,
    transformPairwiseAgreement: mean(transforms), transformComparisons: transforms.length };
}
const predictionsFor = (output, source) => source.choices.map(c => output.choices.find(x => x.choiceId === c.choiceId).predictedSelectionPercent);
const rowForTab = (item, tab) => item.bySelSubCd[tab] ?? item.bySelSubCd.NO_TAB;
const fmt = (x, digits = 4) => x === null || x === undefined ? 'NA' : typeof x === 'number' ? x.toFixed(digits) : String(x);
const vector = xs => xs ? xs.map(x => fmt(x, 2)).join(', ') : 'NA';
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map(row => `| ${row.join(' | ')} |`).join('\n');

export function report({ dir = DEFAULT_DIR } = {}) {
  const { frozen, sources, rates } = verifyFrozen(dir), frozenHash = jsonHash(frozen);
  const models = {}, sensitivities = rates.items.map(item => ({ questionId: item.questionId, status: item.status,
    maxChoicePercentDifference: Math.max(...rowForTab(item, '1004').choicePercents.map((p, i) => Math.abs(p - rowForTab(item, '1005').choicePercents[i]))),
    answerRateDifference: Math.abs(rowForTab(item, '1004').correctRate - rowForTab(item, '1005').correctRate) }));
  for (const model of Object.keys(MODELS)) {
    const ledger = readLedger(`${dir}/${model}/requests.jsonl`); ensureClosedLedger(ledger);
    const cells = frozen.schedule.map(c => `${dir}/${model}/${labelFor(c)}.json`).filter(existsSync).map(read);
    for (const c of cells) { assert.equal(c.frozenHash, frozenHash); assert.equal(c.model, model); }
    const questions = rates.items.map(item => {
      const source = sources[item.questionId], repeats = [1, 2, 3].map(replicate => {
        const cell = cells.find(c => c.questionId === item.questionId && c.replicate === replicate);
        return { replicate, status: cell?.status ?? 'MISSING', predictions: cell?.status === 'VALID' ? predictionsFor(cell.output, source) : null };
      });
      const valid = repeats.every(r => r.status === 'VALID');
      const average = valid ? source.choices.map((_, i) => mean(repeats.map(r => r.predictions[i]))) : null;
      const stability = valid ? repetitionStability([1, 2, 3].map(r => cells.find(c => c.questionId === item.questionId && c.replicate === r).output), source) : null;
      const byTab = Object.fromEntries(['1004', '1005'].map(tab => {
        const actual = rowForTab(item, tab);
        return [tab, { actualChoicePercents: actual.choicePercents, actualCorrectRate: actual.correctRate,
          actualTab: item.bySelSubCd.NO_TAB ? 'NO_TAB' : tab,
          replicates: repeats.map(r => ({ replicate: r.replicate, metrics: r.predictions ? predictionMetrics(r.predictions, actual, source) : null })),
          meanPredictionMetrics: average ? predictionMetrics(average, actual, source) : null }];
      }));
      return { questionId: item.questionId, status: item.status, answerChoiceId: source.answerChoiceId, repeats,
        meanPredictions: average, stability, byTab };
    });
    const used = questions.filter(q => q.status === 'USED'), stable = used.filter(q => q.stability);
    const byTab = Object.fromEntries(['1004', '1005'].map(tab => [tab, {
      replicates: [1, 2, 3].map(r => ({ replicate: r, ...aggregateMetrics(used.map(q => q.byTab[tab].replicates[r - 1].metrics).filter(Boolean)) })),
      meanPrediction: aggregateMetrics(used.map(q => q.byTab[tab].meanPredictionMetrics).filter(Boolean)),
    }]));
    const stability = { questions: stable.length, topWrongAllThreeEqualQuestions: stable.filter(q => q.stability.topWrongAllThreeEqual).length,
      meanPredictionPopulationSD: mean(stable.map(q => q.stability.meanPredictionPopulationSD)),
      tagPairwiseJaccard: mean(stable.map(q => q.stability.tagPairwiseJaccard)),
      tagComparisons: stable.reduce((n, q) => n + q.stability.tagComparisons, 0),
      transformPairwiseAgreement: mean(stable.map(q => q.stability.transformPairwiseAgreement)),
      transformComparisons: stable.reduce((n, q) => n + q.stability.transformComparisons, 0) };
    models[model] = { summary: runSummary(dir, model, frozen, ledger, existsSync(`${dir}/${model}/RESULTS.json`) ? read(`${dir}/${model}/RESULTS.json`).stop : null),
      byTab, stability, questions };
  }
  const results = { source: rates.source, frozenHash, usedQuestions: 5, usedWrongChoices: 20,
    externalRequests: rates.requests, externalRatesHash: frozen.externalRatesHash, metricConventions: frozen.metrics, models, sensitivities };
  const lines = ['# 함정 지도 v0 외부 비율 대조 결과', '', `출처: ${rates.source}`, '',
    `메가스터디 수집 ${rates.requests}/${rates.requestCap}요청. 이번 재개 수집 0요청. USED 5문항·오답 20개, 날짜 불일치 후보 1문항은 별도 표.`, '',
    '원자료·지시문·출력 스키마·외부 비율의 해시는 FROZEN.json에 고정했다. 외부 비율은 모델 요청 입력에 포함하지 않았다.', '',
    '## 주 지표', '', '화작=1004, 언매=1005. 고2 탭 없는 회차는 두 탭 계산에 같은 값을 쓴다. 평균 예측은 선지별 3회 평균이며 비교 전에 반올림하지 않는다.', '',
    '적중 = |P ∩ A| / |P|, 우연 = |A| / 4. 순위 동률은 평균 순위. 상수 벡터 상관은 NA이며 문항 평균에서 제외하고 정의된 개수를 표시한다.', ''];
  const metricRows = [];
  for (const [model, data] of Object.entries(models)) for (const [tab, values] of Object.entries(data.byTab)) {
    for (const [label, m] of [...values.replicates.map(m => [`r${m.replicate}`, m]), ['3회 평균 예측', values.meanPrediction]])
      metricRows.push([model, tab, label, `${m.questions}/5`, fmt(m.topWrongHit), fmt(m.chance), fmt(m.withinQuestionSpearman),
        m.definedWithinQuestionCorrelations, fmt(m.pooledSpearman), fmt(m.pooledPearson), fmt(m.answerRateMAE)]);
  }
  lines.push(table(['모델', '탭', '예측', '문항', '최다 오답 적중', '우연', '문항 내 Spearman', '상관 정의 문항', '통합 Spearman', '통합 Pearson', '정답률 MAE(%p)'], metricRows), '',
    '## 반복 안정성', '', 'USED 5문항. SD는 모집단 표준편차(ddof=0), 모든 5선지를 포함한다. 태그 Jaccard와 변형 종류 일치는 세 반복쌍(1/2, 1/3, 2/3)·선지별 평균이며 빈 태그끼리는 Jaccard=1이다.', '',
    table(['모델', '3반복 확보 문항', '최다 오답 P 집합 3회 일치', '평균 SD(%p)', '태그 Jaccard', '태그 비교 수', '변형 종류 일치율', '변형 비교 수'], Object.entries(models).map(([model, { stability: s }]) =>
      [model, s.questions, s.topWrongAllThreeEqualQuestions, fmt(s.meanPredictionPopulationSD), fmt(s.tagPairwiseJaccard), s.tagComparisons, fmt(s.transformPairwiseAgreement), s.transformComparisons])), '',
    '## 형식·원장·비용', '', '캐시 입력도 전체 입력 단가로 계산. 단가 출처: user-supplied official prices 2026-10-07. 인용 일치는 최종 VALID 출력의 인용별 공백 정규화 후 선언한 출처 안 부분 문자열 검사이다.', '',
    table(['모델', '칸', 'VALID', 'FORMAT_ERROR', 'POLICY_REFUSAL', 'API_ERROR', '형식 실패 시도', '재시도', '정확 인용/전체', '입력 토큰', '출력 토큰', '캐시', 'reasoning', '요청/상한', '추정 USD', '미확정 예약 USD', 'USD 상한', '실제 응답 모델', '중단'],
      Object.entries(models).map(([model, { summary: s }]) => [model, `${s.completedCells}/18`, s.statuses.VALID, s.statuses.FORMAT_ERROR,
        s.statuses.POLICY_REFUSAL, s.statuses.API_ERROR, s.formatErrors, s.retries, `${s.citationExact}/${s.citationTotal}`,
        s.tokens.input, s.tokens.output, s.tokens.cached, s.tokens.reasoning, `${s.requests}/${MODELS[model].maxRequests}`,
        fmt(s.conservativeUsd, 7), fmt(s.unknownReservedUsd, 7), MODELS[model].usdCap, s.actualModels.join(', '), s.stop ?? '없음'])), '',
    '## 탭 간 실제 비율 차이', '', table(['문항', '상태', '선지 비율 최대 차이(%p)', '정답률 차이(%p)'], sensitivities.map(s =>
      [s.questionId, s.status, s.maxChoicePercentDifference, s.answerRateDifference])), '', '## 문항별 실제 비율·모델 평균 예측', '');
  const predictionRows = status => {
    const rows = [];
    for (const item of rates.items.filter(q => q.status === status)) for (const tab of ['1004', '1005']) {
      const actual = rowForTab(item, tab);
      for (const [model, data] of Object.entries(models)) {
        const q = data.questions.find(q => q.questionId === item.questionId), m = q.byTab[tab].meanPredictionMetrics;
        rows.push([item.questionId, tab, model, item.answerChoiceId, vector(actual.choicePercents), actual.correctRate,
          vector(q.meanPredictions), m?.P.join(', ') ?? 'NA', m?.A.join(', ') ?? 'NA', fmt(m?.topWrongHit)]);
      }
    }
    return rows;
  };
  const predictionHeaders = ['문항', '탭', '모델', '정답', '실제 C1~C5(%)', '실제 정답률(%)', '평균 예측 C1~C5(%)', 'P', 'A', '적중'];
  lines.push(table(predictionHeaders, predictionRows('USED')), '', '## 공손룡 후보 회차 대조 — 주 지표 제외', '',
    'fixture: 고3 2023년 4월 교육청. 후보 examSeq=308: 2023.05.10 학력평가. DATE_MISMATCH_CANDIDATE 상태 유지.', '',
    table(predictionHeaders, predictionRows('DATE_MISMATCH_CANDIDATE')), '', '반복별 원문 태그·유인 경로와 전체 분석은 REVIEW.md, 원 응답·시도 이력은 모델별 칸 JSON과 requests.jsonl에 보존한다.', '');
  const review = ['# 함정 지도 v0 사람 검토 자료', '', '모델 출력 원문. 외부 실제 비율과 평균 예측은 REPORT.md/RESULTS.json. 후보 공손룡은 주 지표 제외.', ''];
  for (const item of rates.items) {
    const source = sources[item.questionId];
    review.push(`## ${item.questionId} (${item.status})`, '', `정답: ${source.answerChoiceId}`, '',
      `실제 화작 C1~C5: ${vector(rowForTab(item, '1004').choicePercents)}`, `실제 언매 C1~C5: ${vector(rowForTab(item, '1005').choicePercents)}`, '');
    for (const [model, data] of Object.entries(models)) {
      review.push(`### ${model}`, '', `평균 예측 C1~C5: ${vector(data.questions.find(q => q.questionId === item.questionId).meanPredictions)}`, '');
      for (const r of [1, 2, 3]) {
        const p = `${dir}/${model}/${item.questionId}-r${r}.json`, cell = existsSync(p) ? read(p) : null;
        review.push(`#### r${r}: ${cell?.status ?? 'MISSING'}`, '');
        if (cell?.output) for (const choice of cell.output.choices) {
          review.push(`##### ${choice.choiceId}`, '', `태그: ${JSON.stringify(choice.attractionTags)}`, '', '유인 경로 원문:', '',
            choice.attractionMechanism, '', '전체 선지 분석 원문:', '', '```json', JSON.stringify(choice, null, 2), '```', '');
        }
        else review.push('```json', JSON.stringify(cell?.attempts ?? [], null, 2), '```', '');
      }
    }
  }
  writeFileSync(`${dir}/RESULTS.json`, serialize(results));
  writeFileSync(`${dir}/REPORT.md`, lines.join('\n')); writeFileSync(`${dir}/REVIEW.md`, review.join('\n'));
  return { reported: true, files: ['RESULTS.json', 'REPORT.md', 'REVIEW.md'],
    models: Object.fromEntries(Object.entries(models).map(([model, d]) => [model, d.summary])) };
}
export async function main({ mode = 'prepare', ...options } = {}) {
  if (mode === 'collect-rates') return collectRates(options);
  if (mode === 'prepare') return prepare(options);
  if (mode === 'run') return run(options);
  if (mode === 'report') return report(options);
  throw new Error(`Unknown mode: ${mode}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await main({ mode: process.argv[2], model: process.argv[3],
    onProgress: row => console.log(JSON.stringify({ progress: row })) });
  console.log(JSON.stringify(result));
  if (result.stop) process.exitCode = 1;
}
