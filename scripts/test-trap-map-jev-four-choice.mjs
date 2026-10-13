// Offline four-option experiment directly authorized by the user on 2026-10-10; no handoff required.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { QUESTIONS, DEFAULT_DIR as PRIOR_DIR, loadSources, hash, pearson, spearman, topSet } from './test-trap-map-v0.mjs';

export const DEFAULT_DIR = 'docs/experiments/trap-map-jev-four-choice-2026-10-10';
export const ENDPOINT = 'https://jevplayground.com/api/evaluate';
export const INSTRUCTIONS = '아래 지문과 문항을 읽고, 제시된 네 선지 중 이 문항의 정답일 가능성이 가장 높은 선지를 고르라.';
export const CONDITIONS = ['BARE', 'TRAP'];
const REPEATS = [1, 2, 3, 4, 5];
const MAX_REQUESTS = 75;
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const serial = x => JSON.stringify(x, null, 2) + '\n';
const save = (p, x, flag = 'wx') => writeFileSync(p, serial(x), { flag });
const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const jsonHash = x => hash(JSON.stringify(x));
const labelFor = c => `${c.questionId}-${c.condition}-r${c.replicate}`;
const ledgerFor = dir => existsSync(`${dir}/requests.jsonl`) ? readFileSync(`${dir}/requests.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];

export const wrongChoices = source => source.choices.filter(c => c.choiceId !== source.answerChoiceId);

export function buildState(source, condition, analyses, imageAlt = '') {
  assert.ok(CONDITIONS.includes(condition));
  const lines = ['[지문]', source.passage];
  if (source.scenario) lines.push('[보기]', source.scenario);
  if (imageAlt) lines.push('[그림 설명]', imageAlt);
  lines.push('[발문]', source.stem, '[선지]', ...wrongChoices(source).map(c => `${c.position}. ${c.text}`));
  if (condition === 'TRAP') {
    assert.equal(analyses.length, 5);
    lines.push('[선지별 함정 분석]');
    for (const c of wrongChoices(source)) {
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
    criteria: Object.fromEntries(criteriaOrder.filter(id => id !== source.answerChoiceId).map(id => [id, source.choices.find(c => c.choiceId === id).text])) } } };
}

export function prepare({ dir = DEFAULT_DIR, priorDir = PRIOR_DIR } = {}) {
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
    criteriaOrder: c.criteriaOrder.filter(id => id !== sources[c.questionId].answerChoiceId),
    payload: requestFor(sources[c.questionId], states[c.questionId][c.condition], c.criteriaOrder) }));
  assert.ok(!/predictedSelectionPercent|choicePercents|correctRate|bySelSubCd/.test(JSON.stringify(payloads)), 'REQUEST_LEAK');
  const frozen = { version: 1, endpoint: ENDPOINT, instructions: INSTRUCTIONS, repeats: 5, maxRequests: MAX_REQUESTS,
    paceMs: 7000, rateLimitWaitMs: 60000, rateLimitRetries: 1, timeoutMs: 60000, seed: 20261010,
    criteriaShuffle: 'LCG 1664525/1013904223 Fisher-Yates; same order across paired conditions; fixed labels',
    authorization: 'User explicitly requested execution without handoff; four wrong options, correct answer number and official explanation excluded; question changed to most likely correct.',
    fileHashes: Object.fromEntries(inputPaths.map(p => [p, hash(readFileSync(p))])),
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

export function validateResponse(body, expectedLabels) {
  assert.equal(body?.ok, true, 'RESPONSE_INVALID: ok');
  const answer = body?.result?.answers?.Q1, p = answer?.probabilities;
  assert.ok(p && !Array.isArray(p), 'RESPONSE_INVALID: probabilities missing');
  assert.equal(expectedLabels.length, 4);
  assert.deepEqual(Object.keys(p).sort(), [...expectedLabels].sort(), 'RESPONSE_INVALID: labels');
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
      if (lastAt !== null) {
        while (now() - lastAt < frozen.paceMs) await sleep(frozen.paceMs - (now() - lastAt));
      }
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
        else { responseFields = validateResponse(body, Object.keys(job.payload.questions.Q1.criteria)); status = 'VALID'; }
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

export function normalizedActual(item, tab, source) {
  const row = item.bySelSubCd[tab] ?? item.bySelSubCd.NO_TAB;
  const values = wrongChoices(source).map(c => row.choicePercents[c.position - 1]);
  const denominator = values.reduce((a, b) => a + b, 0);
  assert.ok(denominator > 0);
  return { percents: values.map(v => v * 100 / denominator), denominator,
    rawWrongPercents: values, actualTab: item.bySelSubCd.NO_TAB ? 'NO_TAB' : tab };
}
export function metrics(predicted, actual, ids) {
  const P = topSet(predicted, ids), A = topSet(actual, ids);
  return { P, A, topWrongHit: P.filter(id => A.includes(id)).length / P.length,
    chance: A.length / 4, withinQuestionSpearman: spearman(predicted, actual),
    withinQuestionPearson: pearson(predicted, actual),
    distributionMAE: mean(predicted.map((v, i) => Math.abs(v - actual[i]))), predicted, actual };
}
export function aggregate(rows) {
  return { questions: rows.length, wrongChoices: rows.length * 4,
    topWrongHit: mean(rows.map(r => r.topWrongHit)), chance: mean(rows.map(r => r.chance)),
    withinQuestionSpearman: mean(rows.map(r => r.withinQuestionSpearman).filter(v => v !== null)),
    definedWithinQuestionCorrelations: rows.filter(r => r.withinQuestionSpearman !== null).length,
    pooledSpearman: spearman(rows.flatMap(r => r.predicted), rows.flatMap(r => r.actual)),
    pooledPearson: pearson(rows.flatMap(r => r.predicted), rows.flatMap(r => r.actual)),
    distributionMAE: mean(rows.map(r => r.distributionMAE)) };
}
export function stabilityFor(predictions, ids) {
  const sets = predictions.map(p => topSet(p, ids));
  const sds = ids.map((_, i) => { const xs = predictions.map(p => p[i]), m = mean(xs); return Math.sqrt(mean(xs.map(x => (x-m)**2))); });
  return { topSets: sets, topWrongAllFiveEqual: sets.every(s => JSON.stringify(s) === JSON.stringify(sets[0])),
    predictionPopulationSD: sds, meanPredictionPopulationSD: mean(sds) };
}
const fmt = v => v === null || v === undefined ? 'NA' : typeof v === 'number' ? v.toFixed(4) : String(v);
const table = (heads, rows) => [heads, heads.map(() => '---'), ...rows].map(r => `| ${r.join(' | ')} |`).join('\n');
const vector = xs => xs ? xs.map(v => v.toFixed(2)).join(', ') : 'NA';

export function report({ dir = DEFAULT_DIR } = {}) {
  const { frozen, sources, jobs } = verifyFrozen(dir), frozenHash = jsonHash(frozen), ledger = ledgerFor(dir);
  ensureClosedLedger(ledger);
  const rates = read(frozen.externalRatesPath);
  const cells = jobs.map(j => existsSync(`${dir}/cells/${j.label}.json`) ? read(`${dir}/cells/${j.label}.json`) : {...j, status:'MISSING'});
  for (const c of cells.filter(c => c.status !== 'MISSING')) assert.equal(c.frozenHash, frozenHash);
  const conditions = {};
  for (const condition of CONDITIONS) {
    const questions = rates.items.map(item => {
      const source = sources[item.questionId], ids = wrongChoices(source).map(c => c.choiceId);
      const repeats = REPEATS.map(replicate => {
        const c = cells.find(c => c.questionId === item.questionId && c.condition === condition && c.replicate === replicate);
        return { replicate, status: c.status, predictions: c.status === 'VALID' ? ids.map(id => c.probabilities[id] * 100) : null };
      });
      const valid = repeats.every(r => r.status === 'VALID');
      const average = valid ? ids.map((_,i) => mean(repeats.map(r => r.predictions[i]))) : null;
      const byTab = Object.fromEntries(['1004','1005'].map(tab => {
        const actual = normalizedActual(item, tab, source);
        return [tab, { ...actual,
          replicates: repeats.map(r => ({replicate:r.replicate, metrics: r.predictions ? metrics(r.predictions,actual.percents,ids):null})),
          meanPredictionMetrics: average ? metrics(average,actual.percents,ids):null }];
      }));
      return {questionId:item.questionId,status:item.status,optionIds:ids,repeats,meanPredictions:average,
        stability:valid ? stabilityFor(repeats.map(r=>r.predictions),ids):null,byTab};
    });
    const used = questions.filter(q=>q.status==='USED'), stable = used.filter(q=>q.stability);
    conditions[condition] = { questions,
      byTab:Object.fromEntries(['1004','1005'].map(tab => [tab,{
        replicates:REPEATS.map(r=>({replicate:r,...aggregate(used.map(q=>q.byTab[tab].replicates[r-1].metrics).filter(Boolean))})),
        meanPrediction:aggregate(used.map(q=>q.byTab[tab].meanPredictionMetrics).filter(Boolean))}])),
      stability:{questions:stable.length,topWrongAllFiveEqualQuestions:stable.filter(q=>q.stability.topWrongAllFiveEqual).length,
        meanPredictionPopulationSD:mean(stable.map(q=>q.stability.meanPredictionPopulationSD))}};
  }
  const starts=ledger.filter(r=>r.event==='START');
  const spacings=starts.slice(1).map((r,i)=>r.atMs-starts[i].atMs);
  const statuses=Object.fromEntries([...new Set(cells.map(c=>c.status))].map(s=>[s,cells.filter(c=>c.status===s).length]));
  const results={source:rates.source,frozenHash,instructions:INSTRUCTIONS,usedQuestions:5,usedWrongChoices:20,conditions,
    summary:{plannedCells:60,statuses,requests:starts.length,requestCap:MAX_REQUESTS,
      retries:starts.filter(r=>r.attempt===2).length,preflight:read(`${dir}/preflight.json`).status,
      minimumRequestStartSpacingMs:spacings.length?Math.min(...spacings):null,
      requestSpacingRequirementMet:spacings.every(s=>s>=7000),
      usage:ledger.filter(r=>r.usage).map(r=>r.usage),responseModels:[...new Set(cells.filter(c=>c.model).map(c=>c.model))]},
    metricConventions:{actual:'Four original wrong-option percentages normalized by their sum to 100; no correct-rate MAE.',
      topWrongHit:'|P intersection A|/|P|; chance |A|/4; ties by average ranks; constant-vector correlation NA.',
      predictions:'Returned probabilities times 100; no renormalization; mean requires all five VALID repeats.',
      stability:'Population SD ddof=0 across five repeats, four options only.'},stateLengths:frozen.stateLengths,
    factualLimitations:['All four supplied options are originally wrong; this is a modified task, not an actual five-option exam.',
      'TRAP analyses were produced with original correct answer and explanation available; wrongness cues and references may remain.',
      'Original option numbers retained; the omitted position can be inferred, although no answer key is provided.',
      'One shared prediction compared with both elective tables; mRNA grade-2 NO_TAB table reused for both.',
      'mRNA figure replaced by fixture alt text; no image sent.',
      'Question wording and available options/answer metadata changed together versus prior experiment.',
      'Gateway probabilities are rounded; empirical student calibration not assumed.']};
  const rows=[];
  for (const c of CONDITIONS) for (const [tab,d] of Object.entries(conditions[c].byTab))
    for (const [label,m] of [...d.replicates.map(m=>[`r${m.replicate}`,m]),['5회 평균',d.meanPrediction]])
      rows.push([c,tab,label,m.questions,fmt(m.topWrongHit),fmt(m.chance),fmt(m.withinQuestionSpearman),fmt(m.pooledSpearman),fmt(m.pooledPearson),fmt(m.distributionMAE)]);
  const distRows=status=>CONDITIONS.flatMap(c=>conditions[c].questions.filter(q=>q.status===status).flatMap(q=>['1004','1005'].map(tab=>{
    const a=q.byTab[tab],m=a.meanPredictionMetrics;
    return [q.questionId,tab,c,q.optionIds.join(','),vector(a.percents),vector(q.meanPredictions),m?.P.join(',')??'NA',m?.A.join(',')??'NA',fmt(m?.topWrongHit)];})));
  const heads=['문항','탭','조건','선지 순서','실제 오답 내 비율(%)','평균 JEV 확률(%)','P','A','적중'];
  const lines=['# JEV 네 오답 선지: 정답 가능성 판단 결과','',`정확한 질문: ${INSTRUCTIONS}`,'',
    `본 실험 상태 ${JSON.stringify(statuses)}. preflight 포함 ${starts.length}/${MAX_REQUESTS}요청. 재시도 ${results.summary.retries}.`,
    '', '입력: 지문·보기·발문·네 오답 선지. 정답 선지·정답 번호·공식 해설 제외. TRAP만 남은 네 선지의 sol r1 변형 종류·태그·유인 경로를 첨부. 실제 비율·예상 선택 비율은 전송하지 않았다.',
    '', '## 주 지표','', 'USED 5문항·20오답. 화작1004/언매1005. 실제 비율은 네 오답의 합을 100%로 환산. 분포 MAE는 네 선지의 평균 절대 오차(%p). 정답률은 측정하지 않는다.', '',
    table(['조건','탭','반복','문항','최다 오답 적중','우연','문항 내 Spearman','통합 Spearman','통합 Pearson','분포 MAE(%p)'],rows),
    '', '## 반복 안정성','',table(['조건','문항','최다 집합 5회 일치','평균 SD(%p)'],CONDITIONS.map(c=>{const s=conditions[c].stability;return[c,s.questions,s.topWrongAllFiveEqualQuestions,fmt(s.meanPredictionPopulationSD)];})),
    '', '## 문항별 분포','',table(heads,distRows('USED')),
    '', '## 공손룡 날짜 불일치 후보: 주 지표 제외','',table(heads,distRows('DATE_MISMATCH_CANDIDATE')),
    '', '## 실행 검증','',`- 요청 시작 최소 간격 ${results.summary.minimumRequestStartSpacingMs}ms, 7초 조건 충족: ${results.summary.requestSpacingRequirementMet}.`,
    '- 원 응답·요청 원장·사용량·동결 입력은 cells/, requests.jsonl, RESULTS.json, FROZEN.json에 보존.',
    '- 공개 경로의 USD 단가 미확인으로 비용은 산출하지 않았다. OpenAI 호출·메가스터디 재수집 0.',
    '', '## 해석상 한계','',...results.factualLimitations.map(x=>`- ${x}`),''];
  const review=['# 문항별 네 오답 반복 분포',''];
  for(const c of CONDITIONS) for(const q of conditions[c].questions) review.push(`## ${q.questionId} / ${c} / ${q.status}`,'',`선지 순서: ${q.optionIds.join(', ')}`,'',table(['반복','상태','확률(%)'],q.repeats.map(r=>[r.replicate,r.status,vector(r.predictions)])), '');
  save(`${dir}/RESULTS.json`,results,'w');writeFileSync(`${dir}/REPORT.md`,lines.join('\n'));writeFileSync(`${dir}/REVIEW.md`,review.join('\n'));
  return {reported:true,summary:{...results.summary,usageRecords:results.summary.usage.length,usage:undefined},
    metrics:CONDITIONS.flatMap(c=>Object.entries(conditions[c].byTab).map(([tab,d])=>({condition:c,tab,...d.meanPrediction})))};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2], onProgress = row => console.log(JSON.stringify({ progress: row }));
  try {
    const result = mode === 'prepare' ? prepare() : mode === 'preflight' ? await preflight({ onProgress }) :
      mode === 'run' ? await run({ onProgress }) : mode === 'report' ? report() : assert.fail('prepare | preflight | run | report');
    console.log(JSON.stringify(result));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
