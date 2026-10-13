import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildState, requestFor, scheduleFor, prepare, preflight, run, report, validateResponse, ensureClosedLedger,
  stabilityFor, INSTRUCTIONS } from './test-trap-map-jev-choice.mjs';
import { loadSources, QUESTIONS, DEFAULT_DIR as PRIOR_DIR, predictionMetrics, aggregateMetrics } from './test-trap-map-v0.mjs';

const read = p => JSON.parse(readFileSync(p, 'utf8'));
const temporary = async fn => {
  const dir = mkdtempSync(join(tmpdir(), 'trap-map-jev-'));
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const responseBody = () => ({ ok: true, latencyMs: 12, result: { model: 'fake-jev',
  usage: { input_tokens: 123, output_tokens: 7 }, answers: { Q1: { choice: 'C5', confidence: 0.25,
    probabilities: { C1: 0.1, C2: 0.15, C3: 0.2, C4: 0.25, C5: 0.3 } } } } });
const response = (status = 200, body = responseBody()) => ({ status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
const fakeClock = () => {
  let clock = 0;
  const sleeps = [];
  return { now: () => clock, sleep: async ms => { assert.ok(ms >= 0); sleeps.push(ms); clock += ms; }, sleeps };
};

test('BARE/TRAP whitelist, source order, correct answer/explanation common, mRNA alt text', () => {
  const source = loadSources().sources['mrna-vaccine-lipid-nanoparticle-q19'];
  const analysis = read(`${PRIOR_DIR}/gpt-6.1-sol/${source.questionId}-r1.json`).output.choices;
  for (const a of analysis) { a.predictedSelectionPercent = 93.234567; a.decoy = 'NO_LEAK'; }
  const bare = buildState(source, 'BARE', analysis, 'Y자 그림'), trap = buildState(source, 'TRAP', analysis, 'Y자 그림');
  assert.ok(trap.startsWith(bare)); assert.ok(!bare.includes('[선지별 함정 분석]'));
  assert.ok(trap.includes('[선지별 함정 분석]')); assert.ok(trap.includes('attractionMechanism'));
  assert.ok(!/predictedSelectionPercent|93.234567|NO_LEAK|decisiveEvidence/.test(trap));
  assert.ok(bare.includes('[그림 설명]\n\nY자 그림'));
  assert.ok(bare.indexOf('[지문]') < bare.indexOf('[보기]'));
  assert.ok(bare.indexOf('[발문]') < bare.indexOf('[선지]'));
  assert.ok(bare.indexOf('[정답 번호]') < bare.indexOf('[공식 해설]'));
  const payload = requestFor(source, trap, ['C5', 'C4', 'C3', 'C2', 'C1']);
  assert.equal(payload.questions.Q1.instructions, INSTRUCTIONS);
  assert.equal(payload.questions.Q1.criteria.C1, source.choices[0].text);
});

test('state exceeding 8000 characters stops without truncation', () => {
  const source = Object.values(loadSources().sources)[0];
  assert.throws(() => buildState({ ...source, passage: '가'.repeat(8001) }, 'BARE', []), /STATE_TOO_LONG/);
});

test('60 deterministic jobs; five repeats; paired criteria order with stable meanings', () => {
  const jobs = scheduleFor(); assert.equal(jobs.length, 60); assert.deepEqual(jobs, scheduleFor());
  for (let i = 0; i < jobs.length; i += 2) {
    assert.deepEqual(jobs[i].criteriaOrder, jobs[i + 1].criteriaOrder);
    assert.deepEqual([...jobs[i].criteriaOrder].sort(), ['C1', 'C2', 'C3', 'C4', 'C5']);
  }
  assert.ok(new Set(jobs.map(j => j.criteriaOrder.join(''))).size > 5);
  for (const q of QUESTIONS) for (const c of ['BARE', 'TRAP'])
    assert.equal(jobs.filter(j => j.questionId === q.questionId && j.condition === c).length, 5);
});

test('prepare is offline, idempotent, frozen; external rate sentinels absent from every payload', () => temporary(dir => {
  const priorDir = `${dir}/prior`; mkdirSync(`${priorDir}/gpt-6.1-sol`, { recursive: true });
  for (const file of ['external-rates.json', 'RESULTS.json']) writeFileSync(`${priorDir}/${file}`, readFileSync(`${PRIOR_DIR}/${file}`));
  for (const q of QUESTIONS) writeFileSync(`${priorDir}/gpt-6.1-sol/${q.questionId}-r1.json`, readFileSync(`${PRIOR_DIR}/gpt-6.1-sol/${q.questionId}-r1.json`));
  const rates = read(`${priorDir}/external-rates.json`);
  const sentinels = [97.123456, 0.234567, 0.345678, 0.456789, 1.56789];
  for (const item of rates.items) for (const row of Object.values(item.bySelSubCd)) { row.choicePercents = sentinels; row.correctRate = 98.876543; }
  writeFileSync(`${priorDir}/external-rates.json`, JSON.stringify(rates));
  const a = prepare({ dir, priorDir }); assert.deepEqual(a, prepare({ dir, priorDir }));
  assert.equal(a.externalRequests, 0); assert.equal(a.cells, 60); assert.equal(a.stateLengths.length, 12);
  assert.ok(a.stateLengths.every(x => x.characters <= 8000));
  const requests = readFileSync(`${dir}/requests.json`, 'utf8');
  for (const n of [...sentinels, 98.876543]) assert.ok(!requests.includes(String(n)));
  assert.ok(!/choicePercents|correctRate|bySelSubCd|predictedSelectionPercent/.test(requests));
}));

test('probability field, labels, range and sum checked; no renormalization', () => {
  const body = responseBody(); assert.equal(validateResponse(body).probabilitySum, 1);
  assert.equal(validateResponse(body).usage.input_tokens, 123);
  for (const mutate of [b => delete b.result.answers.Q1.probabilities.C1,
    b => b.result.answers.Q1.probabilities.C1 = 0.9,
    b => b.result.answers.Q1.probabilities.C1 = -0.1,
    b => b.result.answers.Q1.probabilities.C1 = '0.1',
    b => b.result.answers.Q1.choice = 'C6', b => b.ok = false]) {
    const b = responseBody(); mutate(b); assert.throws(() => validateResponse(b), /RESPONSE_INVALID/);
  }
  body.result.answers.Q1.probabilities.C1 = 0.11;
  assert.equal(validateResponse(body).probabilities.C1, 0.11);
});

test('Playground envelope confidence and camel-case usage extracted from preserved live response shape', () => {
  const body = responseBody();
  delete body.result.answers.Q1.confidence;
  body.result.confidence = { Q1: 0.94 };
  body.result.usage = { inputTokens: 2823, outputTokens: 59, totalTokens: 2882 };
  assert.equal(validateResponse(body).confidence, 0.94);
  assert.deepEqual(validateResponse(body).usage, body.result.usage);
});

test('preflight HTTP or format failure retained raw; no retry and run prohibited', () => temporary(async dir => {
  prepare({ dir }); let calls = 0;
  const options = { dir, ...fakeClock(), fetchImpl: async () => { calls++; return response(400, 'bad request raw'); } };
  await assert.rejects(preflight(options), /PREFLIGHT_FAILED/);
  assert.equal(calls, 1); assert.equal(read(`${dir}/preflight.json`).attempts[0].raw, 'bad request raw');
  await assert.rejects(preflight(options), /retry refused/);
  await assert.rejects(run(options), /PREFLIGHT_REQUIRED/); assert.equal(calls, 1);
}));

test('preflight missing probabilities stops with the raw JSON saved', () => temporary(async dir => {
  prepare({ dir }); const body = responseBody(); delete body.result.answers.Q1.probabilities;
  await assert.rejects(preflight({ dir, fetchImpl: async () => response(200, body) }), /PREFLIGHT_FAILED/);
  assert.equal(read(`${dir}/preflight.json`).status, 'FORMAT_ERROR');
  assert.deepEqual(read(`${dir}/preflight.json`).attempts[0].body, body);
}));

test('60 valid cells + separate preflight; seven-second pacing; closed resume sends nothing; report matches reused metrics', () => temporary(async dir => {
  prepare({ dir }); const clock = fakeClock(), calls = [];
  const options = { dir, ...clock, fetchImpl: async (url, opts) => {
    calls.push({ at: clock.now(), payload: JSON.parse(opts.body) });
    assert.equal(url, 'https://jevplayground.com/api/evaluate'); assert.equal(opts.method, 'POST');
    assert.deepEqual(opts.headers, { 'Content-Type': 'application/json' }); return response();
  } };
  await preflight(options); const result = await run(options);
  assert.equal(calls.length, 61); assert.equal(result.cells, 60); assert.deepEqual(result.statuses, { VALID: 60 });
  assert.ok(calls.slice(1).every((c, i) => c.at - calls[i].at >= 7000));
  await run(options); await preflight(options); assert.equal(calls.length, 61);
  report({ dir }); const data = read(`${dir}/RESULTS.json`);
  assert.equal(data.summary.requests, 61); assert.equal(data.conditions.BARE.questions.length, 6);
  assert.equal(data.comparison.length, 8); assert.equal(data.conditions.TRAP.stability.questions, 5);
  assert.equal(data.conditions.TRAP.stability.meanPredictionPopulationSD, 0);
  const source = loadSources().sources[QUESTIONS[0].questionId], actual = read(`${PRIOR_DIR}/external-rates.json`).items[0].bySelSubCd['1004'];
  const manual = predictionMetrics([10, 15, 20, 25, 30], actual, source);
  assert.deepEqual(data.conditions.BARE.questions[0].byTab['1004'].meanPredictionMetrics, manual);
  assert.ok(readFileSync(`${dir}/REPORT.md`, 'utf8').includes('공손룡 날짜 불일치 후보'));
  assert.ok(existsSync(`${dir}/REVIEW.md`));
}));

test('429 waits sixty seconds then retries same payload once; second 429 RATE_LIMITED and continues', () => temporary(async dir => {
  prepare({ dir }); const clock = fakeClock(); let count = 0; const sent = [];
  const options = { dir, ...clock, fetchImpl: async (_, opts) => {
    count++; sent.push(opts.body); return [2, 3, 4].includes(count) ? response(429, { error: 'limited' }) : response();
  } };
  await preflight(options); const result = await run(options);
  assert.equal(result.requests, 63); assert.equal(result.statuses.RATE_LIMITED, 1); assert.equal(result.statuses.VALID, 59);
  assert.equal(clock.sleeps.filter(ms => ms === 60000).length, 2);
  assert.equal(sent[1], sent[2]); assert.equal(sent[3], sent[4]);
  const first = read(`${dir}/cells/${read(`${dir}/requests.json`)[0].label}.json`);
  assert.equal(first.attempts.length, 2); assert.equal(first.status, 'RATE_LIMITED');
  report({ dir }); const data = read(`${dir}/RESULTS.json`);
  assert.equal(data.conditions.BARE.questions[0].meanPredictions, null);
  assert.equal(data.conditions.BARE.byTab['1004'].meanPrediction.questions, 4);
}));

test('incomplete ledger and frozen request mutation refuse dispatch', () => temporary(async dir => {
  prepare({ dir });
  assert.throws(() => ensureClosedLedger([{ event: 'START', requestId: 'unfinished' }]), /INCOMPLETE_LEDGER/);
  appendFileSync(`${dir}/requests.jsonl`, JSON.stringify({ event: 'START', requestId: 'unfinished' }) + '\n');
  await assert.rejects(preflight({ dir, fetchImpl: () => assert.fail('no network') }), /INCOMPLETE_LEDGER/);
  const jobs = read(`${dir}/requests.json`); jobs[0].payload.state += 'mutation';
  writeFileSync(`${dir}/requests.json`, JSON.stringify(jobs));
  await assert.rejects(preflight({ dir, fetchImpl: () => assert.fail('no network') }), /Frozen artifact changed/);
}));

test('request cap includes preflight and historical attempts; no 76th call', () => temporary(async dir => {
  prepare({ dir }); await preflight({ dir, fetchImpl: async () => response() });
  for (let i = 2; i <= 75; i++) for (const event of ['START', 'END'])
    appendFileSync(`${dir}/requests.jsonl`, JSON.stringify({ event, requestId: `jev-${i}`, atMs: 0 }) + '\n');
  await assert.rejects(run({ dir, now: () => 100000, fetchImpl: () => assert.fail('no network') }), /REQUEST_CAP/);
}));

test('shared metrics agree with hand calculation including top ties and NA correlation; five-repeat stability', () => {
  const source = { choices: [1, 2, 3, 4, 5].map(position => ({ position, choiceId: `C${position}` })), answerChoiceId: 'C5' };
  const actual = { choicePercents: [1, 2, 3, 4, 90], correctRate: 90 };
  const m = predictionMetrics([1, 2, 3, 4, 90], actual, source);
  assert.equal(m.topWrongHit, 1); assert.equal(m.chance, 0.25); assert.equal(m.withinQuestionSpearman, 1);
  assert.equal(m.answerRateAbsoluteError, 0); assert.equal(aggregateMetrics([m]).pooledPearson, 1);
  const tied = predictionMetrics([10, 10, 10, 10, 60], actual, source);
  assert.equal(tied.topWrongHit, 0.25); assert.equal(tied.withinQuestionSpearman, null);
  assert.equal(aggregateMetrics([tied]).definedWithinQuestionCorrelations, 0);
  const stable = stabilityFor(Array.from({ length: 5 }, () => [1, 2, 3, 4, 90]), source);
  assert.equal(stable.topWrongAllFiveEqual, true); assert.equal(stable.meanPredictionPopulationSD, 0);
});
