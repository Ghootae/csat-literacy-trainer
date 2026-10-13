// Offline experiment authorized by the 2026-10-10 JEV Choice handoff.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { QUESTIONS, DEFAULT_DIR as PRIOR_DIR, loadSources, hash, predictionMetrics, aggregateMetrics, topSet } from './test-trap-map-v0.mjs';

export const DEFAULT_DIR = 'docs/experiments/trap-map-jev-choice-2026-10-10';
export const HANDOFF = 'docs/handoffs/2026-10-10-trap-map-jev-choice.md';
export const ENDPOINT = 'https://jevplayground.com/api/evaluate';
export const INSTRUCTIONS = '이 문항을 실제로 응시한 고3 수험생 집단에서 무작위로 한 명을 뽑았을 때, 그 학생이 답으로 고른 선지를 고르라. 정답 여부가 아니라 실제 수험생들이 어떤 선지를 얼마나 고르는지를 기준으로 판단한다.';
export const CONDITIONS = ['BARE', 'TRAP'];
const REPEATS = [1, 2, 3, 4, 5];
const MAX_REQUESTS = 75;
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serial = x => JSON.stringify(x, null, 2) + '\n';
const save = (p, x, flag = 'wx') => writeFileSync(p, serial(x), { flag });
const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const jsonHash = x => hash(JSON.stringify(x));
const handoffDesignHash = () => hash(readFileSync(HANDOFF, 'utf8').split('## 결과 보고 (실행 후 작성)')[0]);
const labelFor = c => `${c.questionId}-${c.condition}-r${c.replicate}`;
const ledgerFor = dir => existsSync(`${dir}/requests.jsonl`) ? readFileSync(`${dir}/requests.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];

export function buildState(source, condition, analyses, imageAlt = '') {
  assert.ok(CONDITIONS.includes(condition));
  const lines = ['[지문]', source.passage];
  if (source.scenario) lines.push('[보기]', source.scenario);
  if (imageAlt) lines.push('[그림 설명]', imageAlt);
  lines.push('[발문]', source.stem, '[선지]', ...source.choices.map(c => `${c.position}. ${c.text}`),
    '[정답 번호]', source.answerChoiceId.slice(1), '[공식 해설]', source.officialExplanation);
  if (condition === 'TRAP') {
    assert.equal(analyses.length, 5);
    lines.push('[선지별 함정 분석]');
    for (const c of source.choices) {
      const a = analyses.find(a => a.choiceId === c.choiceId);
      assert.ok(a, `Missing analysis ${c.choiceId}`);
      // Explicit whitelist; original predicted percentages cannot enter this projection.
      lines.push(`${c.choiceId}: ${JSON.stringify({ transformType: a.transformType,
        attractionTags: a.attractionTags, attractionMechanism: a.attractionMechanism })}`);
    }
  }
  const state = lines.join('\n\n');
  assert.ok(state.length <= 8000, `STATE_TOO_LONG: ${source.questionId} ${condition}: ${state.length}`);
  return state;
}

export function scheduleFor(seed = 20261010) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  return REPEATS.flatMap(replicate => QUESTIONS.flatMap(({ questionId }) => {
    const order = ['C1', 'C2', 'C3', 'C4', 'C5'];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];
    }
    return CONDITIONS.map(condition => ({ questionId, condition, replicate, criteriaOrder: [...order] }));
  }));
}

export function requestFor(source, state, criteriaOrder) {
  return { state, questions: { Q1: { type: 'choice', instructions: INSTRUCTIONS,
    criteria: Object.fromEntries(criteriaOrder.map(id => [id, source.choices.find(c => c.choiceId === id).text])) } } };
}

export function prepare({ dir = DEFAULT_DIR, priorDir = PRIOR_DIR } = {}) {
  assert.ok(readFileSync(HANDOFF, 'utf8').includes(INSTRUCTIONS), 'HANDOFF_CONFLICT: instructions');
  const { sources, filePaths } = loadSources();
  const inputPaths = [...filePaths, `${priorDir}/external-rates.json`, `${priorDir}/RESULTS.json`];
  const states = {}, lengths = [];
  for (const { questionId } of QUESTIONS) {
    const p = `${priorDir}/gpt-6.1-sol/${questionId}-r1.json`, cell = read(p);
    assert.equal(cell.status, 'VALID'); inputPaths.push(p);
    const fixturePath = `packages/pipeline/fixtures/experiments/problem-solving/public/${questionId}.json`;
    const alt = questionId === 'mrna-vaccine-lipid-nanoparticle-q19' ? read(fixturePath).media[0].alt : '';
    if (questionId === 'mrna-vaccine-lipid-nanoparticle-q19') assert.ok(typeof alt === 'string' && alt.length);
    states[questionId] = {};
    for (const condition of CONDITIONS) {
      states[questionId][condition] = buildState(sources[questionId], condition, cell.output.choices, alt);
      lengths.push({ questionId, condition, characters: states[questionId][condition].length });
    }
  }
  const schedule = scheduleFor(), payloads = schedule.map(c => ({ ...c, label: labelFor(c),
    payload: requestFor(sources[c.questionId], states[c.questionId][c.condition], c.criteriaOrder) }));
  assert.ok(!/predictedSelectionPercent|choicePercents|correctRate|bySelSubCd/.test(JSON.stringify(payloads)), 'REQUEST_LEAK');
  const frozen = { version: 1, endpoint: ENDPOINT, instructions: INSTRUCTIONS, repeats: 5, maxRequests: MAX_REQUESTS,
    paceMs: 7000, rateLimitWaitMs: 60000, rateLimitRetries: 1, timeoutMs: 60000, seed: 20261010,
    criteriaShuffle: 'LCG 1664525/1013904223 Fisher-Yates; same order across paired conditions; fixed labels',
    fileHashes: Object.fromEntries(inputPaths.map(p => [p, hash(readFileSync(p))])), handoffDesignHash: handoffDesignHash(),
    runnerHash: hash(readFileSync(new URL(import.meta.url))), upstreamRunnerHash: hash(readFileSync('scripts/test-trap-map-v0.mjs')),
    artifactHashes: { 'sources.json': jsonHash(sources), 'requests.json': jsonHash(payloads) }, stateLengths: lengths,
    externalRatesPath: `${priorDir}/external-rates.json`, priorResultsPath: `${priorDir}/RESULTS.json`, schedule };
  mkdirSync(dir, { recursive: true });
  if (existsSync(`${dir}/FROZEN.json`)) {
    assert.deepEqual(read(`${dir}/FROZEN.json`), frozen, 'Frozen artifact changed'); verifyFrozen(dir);
  } else {
    save(`${dir}/sources.json`, sources); save(`${dir}/requests.json`, payloads); save(`${dir}/FROZEN.json`, frozen);
  }
  return { prepared: true, externalRequests: 0, cells: payloads.length, stateLengths: lengths };
}

export function verifyFrozen(dir) {
  const frozen = read(`${dir}/FROZEN.json`);
  assert.equal(handoffDesignHash(), frozen.handoffDesignHash, 'Frozen handoff design changed');
  for (const [p, expected] of Object.entries(frozen.fileHashes)) assert.equal(hash(readFileSync(p)), expected, `Frozen artifact changed: ${p}`);
  for (const [p, expected] of Object.entries(frozen.artifactHashes)) assert.equal(jsonHash(read(`${dir}/${p}`)), expected, `Frozen artifact changed: ${p}`);
  assert.equal(hash(readFileSync(new URL(import.meta.url))), frozen.runnerHash, 'Frozen runner changed');
  assert.equal(hash(readFileSync('scripts/test-trap-map-v0.mjs')), frozen.upstreamRunnerHash, 'Frozen upstream runner changed');
  return { frozen, sources: read(`${dir}/sources.json`), jobs: read(`${dir}/requests.json`) };
}

export function ensureClosedLedger(ledger) {
  const open = new Set();
  for (const r of ledger) {
    if (r.event === 'START') { assert.ok(!open.has(r.requestId)); open.add(r.requestId); }
    else if (r.event === 'END' || r.event === 'ERROR') { assert.ok(open.has(r.requestId), 'Unmatched ledger close'); open.delete(r.requestId); }
    else assert.fail('Unknown ledger event');
  }
  assert.equal(open.size, 0, 'INCOMPLETE_LEDGER: resume refused');
}

export function validateResponse(body) {
  assert.equal(body?.ok, true, 'RESPONSE_INVALID: ok');
  const answer = body?.result?.answers?.Q1, p = answer?.probabilities;
  assert.ok(p && !Array.isArray(p), 'RESPONSE_INVALID: probabilities missing');
  assert.deepEqual(Object.keys(p).sort(), ['C1', 'C2', 'C3', 'C4', 'C5'], 'RESPONSE_INVALID: labels');
  assert.ok(Object.values(p).every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'RESPONSE_INVALID: probability bounds');
  const sum = Object.values(p).reduce((a, b) => a + b, 0);
  assert.ok(sum >= 0.98 && sum <= 1.02, `RESPONSE_INVALID: probability sum ${sum}`);
  assert.ok(Object.hasOwn(p, answer.choice), 'RESPONSE_INVALID: choice');
  const confidence = answer.confidence ?? body.result.confidence?.Q1;
  assert.ok(Number.isFinite(confidence) && confidence >= 0 && confidence <= 1, 'RESPONSE_INVALID: confidence');
  return { probabilities: p, probabilitySum: sum, choice: answer.choice, confidence,
    usage: body.result.usage ?? body.usage ?? null, latencyMs: body.latencyMs ?? body.result.latencyMs ?? null,
    model: body.result.model ?? body.model ?? null };
}

async function execute({ dir, preflightMode = false, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)),
  now = () => Date.now(), onProgress = () => {} }) {
  const { frozen, jobs } = verifyFrozen(dir), frozenHash = jsonHash(frozen);
  const ledger = ledgerFor(dir); ensureClosedLedger(ledger);
  let requests = ledger.filter(r => r.event === 'START').length;
  let lastAt = ledger.filter(r => r.event === 'START').at(-1)?.atMs ?? null;
  const preflightPath = `${dir}/preflight.json`;
  if (preflightMode && existsSync(preflightPath)) {
    const prior = read(preflightPath); assert.equal(prior.status, 'VALID', 'PREFLIGHT_FAILED: retry refused'); return prior;
  }
  if (!preflightMode) assert.equal(read(preflightPath).status, 'VALID', 'PREFLIGHT_REQUIRED');
  const selected = preflightMode ? [{ ...jobs[0], label: 'preflight' }] : jobs;
  mkdirSync(`${dir}/cells`, { recursive: true });
  for (const job of selected) {
    const path = preflightMode ? preflightPath : `${dir}/cells/${job.label}.json`;
    if (existsSync(path)) {
      const c = read(path); assert.equal(c.frozenHash, frozenHash); continue;
    }
    const attempts = [];
    let result;
    for (let attempt = 1; attempt <= (preflightMode ? 1 : 2); attempt++) {
      assert.ok(requests < MAX_REQUESTS, 'REQUEST_CAP: stop');
      if (lastAt !== null) { const delay = Math.max(0, frozen.paceMs - (now() - lastAt)); if (delay) await sleep(delay); }
      const requestId = `jev-${++requests}`, atMs = now(); lastAt = atMs;
      const metadata = { requestId, label: job.label, questionId: job.questionId, condition: job.condition,
        replicate: job.replicate, attempt, atMs, at: new Date(atMs).toISOString(), payloadHash: jsonHash(job.payload) };
      appendFileSync(`${dir}/requests.jsonl`, JSON.stringify({ event: 'START', ...metadata }) + '\n');
      let httpStatus = null, body = null, raw = null, error = null, responseFields = null, status;
      try {
        const response = await fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.payload), signal: AbortSignal.timeout(frozen.timeoutMs) });
        httpStatus = response.status; raw = await response.text();
        try { body = JSON.parse(raw); } catch { /* raw response retained */ }
        if (httpStatus === 429) status = 'RATE_LIMITED';
        else if (httpStatus !== 200) { status = 'API_ERROR'; error = `HTTP ${httpStatus}`; }
        else { responseFields = validateResponse(body); status = 'VALID'; }
      } catch (e) { error = e.message; status = httpStatus === 200 ? 'FORMAT_ERROR' : 'API_ERROR'; }
      const record = { ...metadata, httpStatus, status, raw, body, error, wallTimeMs: now() - atMs, ...responseFields };
      attempts.push(record);
      appendFileSync(`${dir}/requests.jsonl`, JSON.stringify({ event: error ? 'ERROR' : 'END', ...metadata,
        httpStatus, status, error, wallTimeMs: record.wallTimeMs, usage: responseFields?.usage ?? null }) + '\n');
      onProgress({ label: job.label, attempt, requests, httpStatus, status });
      if (!preflightMode && httpStatus === 429 && attempt === 1) { await sleep(frozen.rateLimitWaitMs); continue; }
      result = { label: job.label, questionId: job.questionId, condition: job.condition, replicate: job.replicate,
        frozenHash, status, attempts, ...responseFields };
      break;
    }
    save(path, result);
    if (preflightMode) {
      assert.equal(result.status, 'VALID', `PREFLIGHT_FAILED: ${result.status}; raw response saved in ${path}`);
      return result;
    }
  }
  const cells = jobs.map(j => read(`${dir}/cells/${j.label}.json`));
  const statuses = Object.fromEntries([...new Set(cells.map(c => c.status))].map(s => [s, cells.filter(c => c.status === s).length]));
  return { completed: true, cells: cells.length, requests, requestCap: MAX_REQUESTS, statuses };
}
export const preflight = options => execute({ dir: DEFAULT_DIR, ...options, preflightMode: true });
export const run = options => execute({ dir: DEFAULT_DIR, ...options });

export function stabilityFor(predictions, source) {
  assert.equal(predictions.length, 5);
  const wrong = source.choices.map((c, i) => ({ ...c, i })).filter(c => c.choiceId !== source.answerChoiceId);
  const sets = predictions.map(p => topSet(wrong.map(c => p[c.i]), wrong.map(c => c.choiceId)));
  const sds = source.choices.map((_, i) => { const xs = predictions.map(p => p[i]), m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))); });
  return { topSets: sets, topWrongAllFiveEqual: sets.every(s => JSON.stringify(s) === JSON.stringify(sets[0])),
    predictionPopulationSD: sds, meanPredictionPopulationSD: mean(sds) };
}
const fmt = (v, digits = 4) => v === null || v === undefined ? 'NA' : typeof v === 'number' ? v.toFixed(digits) : String(v);
const table = (heads, rows) => [heads, heads.map(() => '---'), ...rows].map(r => `| ${r.join(' | ')} |`).join('\n');
const vector = xs => xs ? xs.map(v => fmt(v, 2)).join(', ') : 'NA';
const rowForTab = (item, tab) => item.bySelSubCd[tab] ?? item.bySelSubCd.NO_TAB;

export function report({ dir = DEFAULT_DIR } = {}) {
  const { frozen, sources, jobs } = verifyFrozen(dir), frozenHash = jsonHash(frozen), ledger = ledgerFor(dir);
  ensureClosedLedger(ledger);
  const rates = read(frozen.externalRatesPath), prior = read(frozen.priorResultsPath);
  const cells = jobs.map(j => { const p = `${dir}/cells/${j.label}.json`; return existsSync(p) ? read(p) : { ...j, status: 'MISSING' }; });
  for (const c of cells.filter(c => c.status !== 'MISSING')) assert.equal(c.frozenHash, frozenHash);
  const conditions = {};
  for (const condition of CONDITIONS) {
    const questions = rates.items.map(item => {
      const s = sources[item.questionId];
      const repeats = REPEATS.map(replicate => {
        const c = cells.find(c => c.questionId === item.questionId && c.condition === condition && c.replicate === replicate);
        return { replicate, status: c.status, predictions: c.status === 'VALID' ? s.choices.map(x => c.probabilities[x.choiceId] * 100) : null };
      });
      const valid = repeats.every(r => r.status === 'VALID');
      const average = valid ? s.choices.map((_, i) => mean(repeats.map(r => r.predictions[i]))) : null;
      const byTab = Object.fromEntries(['1004', '1005'].map(tab => {
        const actual = rowForTab(item, tab);
        return [tab, { actualChoicePercents: actual.choicePercents, actualCorrectRate: actual.correctRate,
          actualTab: item.bySelSubCd.NO_TAB ? 'NO_TAB' : tab,
          replicates: repeats.map(r => ({ replicate: r.replicate, metrics: r.predictions ? predictionMetrics(r.predictions, actual, s) : null })),
          meanPredictionMetrics: average ? predictionMetrics(average, actual, s) : null }];
      }));
      return { questionId: item.questionId, status: item.status, answerChoiceId: s.answerChoiceId, repeats,
        meanPredictions: average, stability: valid ? stabilityFor(repeats.map(r => r.predictions), s) : null, byTab };
    });
    const used = questions.filter(q => q.status === 'USED'), stable = used.filter(q => q.stability);
    conditions[condition] = { questions,
      byTab: Object.fromEntries(['1004', '1005'].map(tab => [tab, {
        replicates: REPEATS.map(r => ({ replicate: r, ...aggregateMetrics(used.map(q => q.byTab[tab].replicates[r - 1].metrics).filter(Boolean)) })),
        meanPrediction: aggregateMetrics(used.map(q => q.byTab[tab].meanPredictionMetrics).filter(Boolean)) }])),
      stability: { questions: stable.length, topWrongAllFiveEqualQuestions: stable.filter(q => q.stability.topWrongAllFiveEqual).length,
        meanPredictionPopulationSD: mean(stable.map(q => q.stability.meanPredictionPopulationSD)) } };
  }
  const statuses = Object.fromEntries([...new Set(cells.map(c => c.status))].map(s => [s, cells.filter(c => c.status === s).length]));
  const comparison = ['1004', '1005'].flatMap(tab => [
    ...CONDITIONS.map(c => ({ name: `JEV ${c}`, tab, repeats: 5, ...conditions[c].byTab[tab].meanPrediction })),
    ...Object.entries(prior.models).map(([name, m]) => ({ name, tab, repeats: 3, ...m.byTab[tab].meanPrediction })) ]);
  const usage = ledger.filter(r => r.usage).map(r => r.usage);
  const preflightCell = existsSync(`${dir}/preflight.json`) ? read(`${dir}/preflight.json`) : null;
  // A parser repair can recover usage from the preserved preflight response without a new call.
  if (preflightCell?.usage && !ledger.some(r => r.label === 'preflight' && r.usage)) usage.unshift(preflightCell.usage);
  const results = { source: rates.source, frozenHash, usedQuestions: 5, usedWrongChoices: 20, conditions, comparison,
    summary: { plannedCells: 60, statuses, requests: ledger.filter(r => r.event === 'START').length, requestCap: MAX_REQUESTS,
      retries: ledger.filter(r => r.event === 'START' && r.attempt === 2).length,
      preflight: existsSync(`${dir}/preflight.json`) ? read(`${dir}/preflight.json`).status : 'MISSING', usage,
      responseModels: [...new Set(cells.filter(c => c.model).map(c => c.model))] },
    metricConventions: { ...prior.metricConventions, meanPrediction: 'All five VALID repeats required; arithmetic mean without rounding',
      stability: 'Five equal P sets; population SD ddof=0, all five choices; USED questions only' },
    stateLengths: frozen.stateLengths,
    factualLimitations: ['Instructions specify grade 3 for every item; mRNA external table is grade 2.',
      'One shared prediction compared with both elective-group tables; no-tab mRNA table reused for both.',
      'mRNA image replaced by fixture media[0].alt; no image sent.', 'Correct answer and official explanation included in both conditions.',
      'External rates excluded from requests; preflight excluded from experiment cells.'] };
  const metricRows = [];
  for (const c of CONDITIONS) for (const [tab, d] of Object.entries(conditions[c].byTab))
    for (const [label, m] of [...d.replicates.map(m => [`r${m.replicate}`, m]), ['5회 평균 예측', d.meanPrediction]])
      metricRows.push([c, tab, label, `${m.questions}/5`, fmt(m.topWrongHit), fmt(m.chance), fmt(m.withinQuestionSpearman),
        m.definedWithinQuestionCorrelations, fmt(m.pooledSpearman), fmt(m.pooledPearson), fmt(m.answerRateMAE)]);
  const distributionRows = status => rates.items.filter(i => i.status === status).flatMap(item => ['1004', '1005'].flatMap(tab => CONDITIONS.map(c => {
    const q = conditions[c].questions.find(q => q.questionId === item.questionId), actual = q.byTab[tab], m = actual.meanPredictionMetrics;
    return [item.questionId, tab, c, q.answerChoiceId, vector(actual.actualChoicePercents), actual.actualCorrectRate,
      vector(q.meanPredictions), m?.P.join(', ') ?? 'NA', m?.A.join(', ') ?? 'NA', fmt(m?.topWrongHit)];
  })));
  const distHeads = ['문항', '탭', '조건', '정답', '실제 C1~C5(%)', '실제 정답률(%)', '평균 예측 C1~C5(%)', 'P', 'A', '적중'];
  const lines = ['# JEV Choice 선지별 선택 확률 대조 결과', '', `출처: ${rates.source}`, '',
    `60칸 상태: ${JSON.stringify(statuses)}. preflight 포함 요청 ${results.summary.requests}/${MAX_REQUESTS}, 재시도 ${results.summary.retries}. OpenAI 호출 0, 메가스터디 재수집 0.`, '',
    'BARE와 TRAP의 공통 입력은 지문·보기·발문·5선지·정답·공식 해설이다. TRAP만 sol r1의 변형 종류·태그·유인 경로를 붙였다. 예상 선택 비율은 제외했다.', '',
    '## 주 지표', '', '화작=1004, 언매=1005. USED 5문항·오답 20개. 적중=|P∩A|/|P|, 우연=|A|/4. 동률은 평균 순위, 상수 벡터 상관은 NA로 문항 평균에서 제외한다. 평균 예측은 5회 모두 VALID인 문항에만 산출하며 반올림 전에 비교한다.', '',
    table(['조건', '탭', '예측', '문항', '최다 오답 적중', '우연', '문항 내 Spearman', '상관 정의 문항', '통합 Spearman', '통합 Pearson', '정답률 MAE(%p)'], metricRows), '',
    '## 선행 실험 비교', '', table(['예측', '탭', '평균 반복 수', '문항', '최다 오답 적중', '문항 내 Spearman', '통합 Spearman', '정답률 MAE(%p)'],
      comparison.map(m => [m.name, m.tab, m.repeats, m.questions, fmt(m.topWrongHit), fmt(m.withinQuestionSpearman), fmt(m.pooledSpearman), fmt(m.answerRateMAE)])), '',
    '## 반복 안정성', '', '모집단 SD(ddof=0), 모든 5선지 포함. USED 5문항만 집계.', '',
    table(['조건', '5반복 확보 문항', 'P 집합 5회 일치 문항', '평균 SD(%p)'], CONDITIONS.map(c => {
      const s = conditions[c].stability; return [c, s.questions, s.topWrongAllFiveEqualQuestions, fmt(s.meanPredictionPopulationSD)]; })), '',
    '## 문항별 실제 비율·평균 예측', '', table(distHeads, distributionRows('USED')), '',
    '## 공손룡 날짜 불일치 후보 — 주 지표 제외', '', table(distHeads, distributionRows('DATE_MISMATCH_CANDIDATE')), '',
    '## 입력 길이', '', table(['문항', '조건', 'state 문자 수'], frozen.stateLengths.map(x => [x.questionId, x.condition, x.characters])), '',
    '## 실행 조건과 관측 범위', '',
    '- 지시문은 모든 문항을 고3 집단으로 지정한다. mRNA 외부 표는 고2 회차다.',
    '- 같은 예측을 화작·언매 양쪽에 대조한다. mRNA는 탭 없는 같은 표를 두 번 표시한다.',
    '- mRNA 그림은 fixture alt 텍스트로 대체했다. 이미지는 전송하지 않았다.',
    '- preflight는 60칸 지표에 포함하지 않는다. 토큰 사용량·응답 모델·원문·실패 이력은 RESULTS.json과 cells/, requests.jsonl에 보존한다.',
    '- USD 비용은 이 공개 경로의 과금 단가가 인계에 없어 산출하지 않았다.', ''];
  const review = ['# JEV Choice 사람 검토 자료', '', '분포는 선지 C1~C5 순서. 원 응답·실패 이력은 cells/에 보존한다.', ''];
  for (const item of rates.items) {
    review.push(`## ${item.questionId} (${item.status})`, '', `정답: ${item.answerChoiceId}`, '',
      `실제 화작: ${vector(rowForTab(item, '1004').choicePercents)}`, `실제 언매: ${vector(rowForTab(item, '1005').choicePercents)}`, '');
    for (const c of CONDITIONS) {
      const q = conditions[c].questions.find(q => q.questionId === item.questionId);
      review.push(`### ${c}`, '', `5회 평균: ${vector(q.meanPredictions)}`, '', table(['반복', '상태', 'C1~C5(%)'], q.repeats.map(r => [r.replicate, r.status, vector(r.predictions)])), '');
    }
  }
  save(`${dir}/RESULTS.json`, results, 'w'); writeFileSync(`${dir}/REPORT.md`, lines.join('\n')); writeFileSync(`${dir}/REVIEW.md`, review.join('\n'));
  return { reported: true, summary: results.summary, comparison };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2], onProgress = row => console.log(JSON.stringify({ progress: row }));
  try {
    const result = mode === 'prepare' ? prepare() : mode === 'preflight' ? await preflight({ onProgress }) :
      mode === 'run' ? await run({ onProgress }) : mode === 'report' ? report() : assert.fail('prepare | preflight | run | report');
    console.log(JSON.stringify(result));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
