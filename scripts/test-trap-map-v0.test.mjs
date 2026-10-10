import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRateHtml, validateRate, collectRates, loadSources, QUESTIONS, MODELS, DEFAULT_DIR, prepare, run, report, requestFor, INSTRUCTIONS,
  validateOutput, citationChecks, scheduleFor, predictionMetrics, aggregateMetrics,
  spearman, pearson, ranks, jaccard, repetitionStability, usageCosts } from './test-trap-map-v0.mjs';

const temporary = async fn => {
  const dir = mkdtempSync(join(tmpdir(), 'trap-map-v0-'));
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const htmlRow = (number, answer, choices = [17, 23, 11, 19, 30]) =>
  `<tr><td>${number}</td><td>${answer}</td><td>&#49345;</td><td>3</td><td>${choices[answer - 1]}%</td>${choices.map(v => `<td><span>${v}%</span></td>`).join('')}</tr>`;

test('CP949 row parsing, circled answer and numeric HTML entities', () => {
  const bytes = Buffer.concat([Buffer.from('<table><tr><td>13</td><td>&#9313;</td><td>'),
    Buffer.from([0xbb, 0xf3]), Buffer.from('</td><td>3</td><td>23%</td><td>17%</td><td>23%</td><td>11%</td><td>19%</td><td>30%</td></tr></table>')]);
  assert.deepEqual(parseRateHtml(bytes).rows, [{ number: 13, answer: 2, difficulty: '상', points: 3,
    correctRate: 23, choicePercents: [17, 23, 11, 19, 30] }]);
  assert.throws(() => parseRateHtml(Buffer.from(htmlRow(13, 2).replace('<td><span>17%</span></td>', ''))), /RATE_STRUCTURE/);
});

test('USED number, answer and percent validation stops; candidate records failures', () => {
  const source = { questionId: 'sample', questionNumber: 13, answerChoiceId: 'C2' };
  const row = { number: 13, answer: 2, choicePercents: [17, 23, 11, 19, 30] };
  assert.equal(validateRate(row, source, 'USED').passed, true);
  for (const bad of [undefined, { ...row, number: 12 }, { ...row, answer: 3 }, { ...row, choicePercents: [0, 0, 0, 0, 0] }])
    assert.throws(() => validateRate(bad, source, 'USED'), /RATE_VALIDATION/);
  assert.deepEqual(validateRate({ ...row, answer: 3 }, source, 'DATE_MISMATCH_CANDIDATE').failures, ['ANSWER_MISMATCH']);
});

test('fake collection: nine POSTs, spacing, raw bytes, candidate, no-tab, repeat refusal', () => temporary(async dir => {
  const { sources } = loadSources(); let clock = 0; const calls = [], sleeps = [];
  const result = await collectRates({ dir, now: () => clock, sleep: async ms => { sleeps.push(ms); clock += ms; },
    fetchImpl: async (url, options) => {
      const body = new URLSearchParams(options.body), examSeq = Number(body.get('examSeq'));
      calls.push({ url, options, at: clock });
      const rows = QUESTIONS.filter(q => q.examSeq === examSeq).map(q => {
        const s = sources[q.questionId]; return htmlRow(s.questionNumber, Number(s.answerChoiceId.slice(1)));
      }).join('');
      const bytes = Buffer.from(`<table>${rows}</table>`);
      return { ok: true, arrayBuffer: async () => bytes };
    } });
  assert.equal(result.requests, 9); assert.equal(result.used, 5); assert.equal(result.candidates, 1);
  assert.equal(sleeps.length, 8); assert.ok(sleeps.every(ms => ms >= 1000));
  assert.ok(calls.every(c => c.options.method === 'POST' && c.options.headers.Referer.endsWith('/main.asp')));
  assert.ok(!calls.find(c => c.options.body.includes('examSeq=306')).options.body.includes('selSubCd'));
  const rates = read(`${dir}/external-rates.json`);
  assert.equal(rates.items.at(-1).status, 'DATE_MISMATCH_CANDIDATE');
  assert.match(rates.items[0].bySelSubCd['1004'].sha256, /^[a-f0-9]{64}$/);
  assert.equal(readFileSync(`${dir}/raw/.gitignore`, 'utf8'), '*\n!.gitignore\n');
  await assert.rejects(collectRates({ dir, fetchImpl: () => assert.fail('repeat request') }), /already exists/);
}));

test('mismatched USED answer stops after first request; network and structure failures stop', () => temporary(async dir => {
  let calls = 0;
  await assert.rejects(collectRates({ dir, fetchImpl: async () => {
    calls++; return { ok: true, arrayBuffer: async () => Buffer.from(htmlRow(13, 1)) };
  } }), /ANSWER_MISMATCH/);
  assert.equal(calls, 1); assert.equal(existsSync(`${dir}/external-rates.json`), false);
  await assert.rejects(collectRates({ dir, fetchImpl: () => assert.fail() }), /already attempted/);
}));
const write = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
const init = dir => writeFileSync(`${dir}/external-rates.json`, readFileSync(`${DEFAULT_DIR}/external-rates.json`));
const outputFor = source => ({ choices: source.choices.map(c => ({ choiceId: c.choiceId,
  isAnswer: c.choiceId === source.answerChoiceId, decisiveEvidence: [{ source: 'STEM', quote: source.stem }],
  evidenceSpan: 'SAME_SENTENCE', transformType: 'FAITHFUL_PARAPHRASE', transformSize: 'NONE',
  attractionTags: c.choiceId === source.answerChoiceId ? [] : ['SURFACE_MATCH'],
  attractionMechanism: `검토용 원문 ${c.choiceId}`, predictedSelectionPercent: 20 })) });
const responseFor = (source, output = outputFor(source)) => ({ id: 'fake-response', model: 'fake-response-model',
  status: 'completed', output_text: JSON.stringify(output), usage: { input_tokens: 1000, output_tokens: 1000,
    input_tokens_details: { cached_tokens: 200 }, output_tokens_details: { reasoning_tokens: 100 } } });
const sourceOf = request => JSON.parse(request.input[0].content[0].text);

test('prepare: API zero, exact instructions, deterministic shuffled schedule, hashes and repeat idempotence', () => temporary(dir => {
  init(dir); const a = prepare({ dir }), b = prepare({ dir });
  assert.deepEqual(a, b); assert.equal(a.externalRequests, 0);
  const frozen = read(`${dir}/FROZEN.json`);
  assert.match(frozen.externalRatesHash, /^[a-f0-9]{64}$/); assert.match(frozen.schemaHash, /^[a-f0-9]{64}$/);
  assert.equal(read(`${dir}/prompts.json`).instructions, INSTRUCTIONS);
  assert.deepEqual(frozen.schedule, scheduleFor()); assert.equal(frozen.schedule.length, 18);
  for (const r of [1, 2, 3]) assert.equal(new Set(frozen.schedule.filter(c => c.replicate === r).map(c => c.questionId)).size, 6);
  assert.notDeepEqual(frozen.schedule.slice(0, 6).map(c => c.questionId), frozen.schedule.slice(6, 12).map(c => c.questionId));
}));

test('freeze changes rejected before request: external rates, prompts, schema, sources and file hashes', () => temporary(async dir => {
  init(dir); prepare({ dir }); let calls = 0;
  const transport = { create: () => { calls++; assert.fail('no request after hash change'); } };
  for (const name of ['prompts.json', 'sources.json', 'FROZEN.json', 'external-rates.json']) {
    const p = `${dir}/${name}`, before = readFileSync(p, 'utf8');
    if (name === 'external-rates.json') { const value = read(p); value.source += '-changed'; write(p, value); }
    else writeFileSync(p, before + ' ');
    await assert.rejects(run({ dir, model: 'gpt-6-luna', transport }), /Frozen artifact changed/);
    writeFileSync(p, before);
  }
  assert.equal(calls, 0);
}));

test('requests independent of external percentages; sentinel number strings absent; mRNA image high, alt absent', () => temporary(async dir => {
  init(dir); prepare({ dir }); const sources = read(`${dir}/sources.json`);
  const before = Object.values(sources).map(s => requestFor('gpt-6-luna', s));
  const external = read(`${dir}/external-rates.json`);
  const sentinels = [97.123456, 0.234567, 0.345678, 0.456789, 1.56789];
  for (const item of external.items) for (const row of Object.values(item.bySelSubCd)) row.choicePercents = sentinels;
  write(`${dir}/external-rates.json`, external);
  const after = Object.values(sources).map(s => requestFor('gpt-6-luna', s));
  assert.deepEqual(before, after);
  for (const n of sentinels) assert.ok(!JSON.stringify(after).includes(String(n)));
  assert.ok(!/choicePercents|correctRate|megastudy|bySelSubCd/.test(JSON.stringify(after)));
  const mrna = sources['mrna-vaccine-lipid-nanoparticle-q19'];
  assert.ok(!JSON.stringify(mrna).includes('"alt"'));
  assert.deepEqual(requestFor('gpt-6.1-sol', mrna).input[0].content.slice(1),
    [{ type: 'input_image', image_url: mrna.media[0].url, detail: 'high' }]);
}));

test('strict schema and contracts, nonmatching citation is metric only', () => {
  const source = Object.values(loadSources().sources)[0], valid = outputFor(source);
  assert.deepEqual(validateOutput(valid, source), valid);
  const bad = mutate => { const o = structuredClone(valid); mutate(o); assert.throws(() => validateOutput(o, source)); };
  bad(o => { o.choices.pop(); }); bad(o => { o.choices[0].choiceId = o.choices[1].choiceId; });
  bad(o => { o.choices[0].isAnswer = !o.choices[0].isAnswer; });
  bad(o => { o.choices.find(c => c.isAnswer).attractionTags = ['POLARITY']; });
  bad(o => { o.choices[0].predictedSelectionPercent = 0; }); bad(o => { o.choices[0].predictedSelectionPercent = 20.5; });
  bad(o => { o.choices[0].transformType = 'INVALID'; }); bad(o => { o.choices[0].extra = true; });
  valid.choices[0].decisiveEvidence[0].quote = 'not in source';
  valid.choices[1].decisiveEvidence[0].quote = source.stem.replaceAll(' ', '   \n');
  valid.choices[2].decisiveEvidence[0].quote = '';
  validateOutput(valid, source);
  const checks = citationChecks(valid, source); assert.equal(checks[0].exact, false); assert.equal(checks[1].exact, true); assert.equal(checks[2].exact, false);
});

test('run all 18, one schema retry, second failure FORMAT_ERROR; no retry for quote mismatch; closed resume zero calls', () => temporary(async dir => {
  init(dir); prepare({ dir }); let calls = 0;
  const summary = await run({ dir, model: 'gpt-6-luna', transport: { async create(request, options) {
    assert.equal(options.timeout, 90000); assert.equal(request.reasoning.effort, 'medium'); assert.equal(request.max_output_tokens, 8000);
    assert.equal(request.text.format.strict, true); calls++;
    const source = sourceOf(request), response = responseFor(source);
    if (calls <= 2) response.output_text = calls === 1 ? 'invalid json' : JSON.stringify({ choices: [] });
    if (calls === 3) response.output_text = '{}'; // Next cell retries and recovers.
    if (calls === 5) { const o = outputFor(source); o.choices[0].decisiveEvidence[0].quote = 'no such quote'; response.output_text = JSON.stringify(o); }
    return response;
  } } });
  assert.equal(calls, 20); assert.equal(summary.completedCells, 18); assert.equal(summary.statuses.FORMAT_ERROR, 1);
  assert.equal(summary.statuses.VALID, 17); assert.equal(summary.retries, 2); assert.equal(summary.formatErrors, 3);
  assert.equal(summary.tokens.input, 20000); assert.ok(summary.citationExact < summary.citationTotal);
  assert.deepEqual(summary.actualModels, ['fake-response-model']);
  const ledger = readFileSync(`${dir}/gpt-6-luna/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(e => e.event === 'START').length, 20); assert.equal(ledger.filter(e => e.event === 'END').length, 20);
  assert.equal((await run({ dir, model: 'gpt-6-luna', transport: { create: () => assert.fail('completed resume resend') } })).requests, 20);
}));

test('HTTP 400 POLICY_REFUSAL exactly one attempt, costs unknown reservation preserved', () => temporary(async dir => {
  init(dir); prepare({ dir }); let calls = 0;
  const summary = await run({ dir, model: 'gpt-6-luna', transport: { async create(request) {
    calls++; if (calls === 1) throw Object.assign(new Error('fake policy refusal'), { status: 400 });
    return responseFor(sourceOf(request));
  } } });
  assert.equal(calls, 18); assert.equal(summary.statuses.POLICY_REFUSAL, 1); assert.equal(summary.retries, 0);
  assert.ok(summary.unknownReservedUsd > 0); assert.equal(summary.tokens.unknownUsageRequests, 1);
  const ledger = readFileSync(`${dir}/gpt-6-luna/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(e => e.event === 'ERROR').length, 1);
}));

test('network error stops without retry and stores cell; incomplete ledger and lost cell refuse resume', () => temporary(async dir => {
  init(dir); prepare({ dir }); let calls = 0;
  const summary = await run({ dir, model: 'gpt-6-luna', transport: { create: async () => { calls++; throw new Error('fake network'); } } });
  assert.equal(calls, 1); assert.match(summary.stop, /API_ERROR/); assert.equal(summary.statuses.API_ERROR, 1);
  const path = `${dir}/gpt-6-luna/requests.jsonl`;
  appendFileSync(path, JSON.stringify({ event: 'START', requestId: 'open', reservedUsd: 0.01 }) + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport: { create: () => assert.fail() } }), /incomplete ledger/);
}));

test('request cap and conservative cost cap stop before request; unsupported model rejected', () => temporary(async dir => {
  init(dir); prepare({ dir });
  const model = 'gpt-6.1-sol', path = `${dir}/${model}/requests.jsonl`; mkdirSync(`${dir}/${model}`);
  const sender = { create: () => assert.fail('cap must stop request') };
  const capped = Array.from({ length: 40 }, (_, i) => [
    { event: 'START', requestId: `previous-${i}`, reservedUsd: 0.1 },
    { event: 'END', requestId: `previous-${i}`, costs: { conservativeUsd: 0.01 } }]).flat();
  writeFileSync(path, capped.map(JSON.stringify).join('\n') + '\n');
  assert.match((await run({ dir, model, transport: sender })).stop, /RUN_LIMIT/);
  const cost = [{ event: 'START', requestId: 'previous', reservedUsd: 0.1 },
    { event: 'END', requestId: 'previous', costs: { conservativeUsd: 2.99 } }];
  writeFileSync(path, cost.map(JSON.stringify).join('\n') + '\n');
  assert.match((await run({ dir, model, transport: sender })).stop, /RUN_LIMIT/);
  await assert.rejects(run({ dir, model: 'not-allowed', transport: sender }), /Unsupported model/);
  assert.deepEqual(usageCosts({ input_tokens: 1e6, output_tokens: 1e6, input_tokens_details: { cached_tokens: 1e6 } }, 'gpt-6-luna'), { conservativeUsd: 0.6 });
}));

test('lost cell with closed requests refuses duplicate billable resume', () => temporary(async dir => {
  init(dir); prepare({ dir }); const cell = scheduleFor()[0], label = `${cell.questionId}-r1`;
  mkdirSync(`${dir}/gpt-6-luna`);
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, [{ event: 'START', requestId: 'lost', label, reservedUsd: 0.01 },
    { event: 'END', requestId: 'lost', costs: { conservativeUsd: 0.001 } }].map(JSON.stringify).join('\n') + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport: { create: () => assert.fail() } }), /missing cell/);
}));

test('hand-computed metrics: predicted ties, actual ties, average ranks, constant correlations', () => {
  const source = { choices: [1, 2, 3, 4, 5].map(n => ({ choiceId: `C${n}`, position: n })), answerChoiceId: 'C5' };
  const m = predictionMetrics([15, 15, 5, 5, 60], { choicePercents: [10, 20, 5, 5, 60], correctRate: 60 }, source);
  assert.deepEqual(m.P, ['C1', 'C2']); assert.deepEqual(m.A, ['C2']); assert.equal(m.topWrongHit, 0.5); assert.equal(m.chance, 0.25);
  assert.ok(Math.abs(m.withinQuestionSpearman - 4 / Math.sqrt(18)) < 1e-12); assert.equal(m.answerRateAbsoluteError, 0);
  const tied = predictionMetrics([15, 15, 5, 5, 60], { choicePercents: [20, 20, 5, 5, 50], correctRate: 50 }, source);
  assert.equal(tied.topWrongHit, 1); assert.equal(tied.chance, 0.5); assert.equal(tied.answerRateAbsoluteError, 10);
  assert.deepEqual(ranks([10, 10, 20, 30]), [1.5, 1.5, 3, 4]); assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1);
  assert.equal(pearson([1, 1], [1, 2]), null); assert.equal(spearman([], []), null);
  const a = aggregateMetrics([m, tied]); assert.equal(a.topWrongHit, 0.75); assert.equal(a.chance, 0.375);
  assert.equal(a.answerRateMAE, 5); assert.equal(a.wrongChoices, 8);
});

test('repetition stability compares full P sets, population SD, pairwise Jaccard and transforms', () => {
  const source = Object.values(loadSources().sources)[0], base = outputFor(source);
  const a = structuredClone(base), b = structuredClone(base), c = structuredClone(base);
  // Answer is C2. r1 and r2 have the same P; r3 breaks their C1/C3 tie.
  for (const output of [a, b, c]) for (const choice of output.choices) choice.predictedSelectionPercent = 10;
  a.choices[0].predictedSelectionPercent = a.choices[2].predictedSelectionPercent = 20;
  b.choices[0].predictedSelectionPercent = b.choices[2].predictedSelectionPercent = 20;
  c.choices[0].predictedSelectionPercent = 21; c.choices[2].predictedSelectionPercent = 19;
  b.choices[0].attractionTags = ['SURFACE_MATCH', 'POLARITY']; c.choices[0].attractionTags = ['POLARITY'];
  c.choices[0].transformType = 'CONDITION_CHANGE';
  const s = repetitionStability([a, b, c], source);
  assert.equal(s.topWrongAllThreeEqual, false); assert.deepEqual(s.topSets, [['C1', 'C3'], ['C1', 'C3'], ['C1']]);
  assert.ok(Math.abs(s.predictionPopulationSD[0] - Math.sqrt(2 / 9)) < 1e-12);
  assert.ok(Math.abs(s.tagPairwiseJaccard - 13 / 15) < 1e-12); assert.ok(Math.abs(s.transformPairwiseAgreement - 13 / 15) < 1e-12);
  assert.equal(jaccard([], []), 1); assert.equal(jaccard(['A', 'A'], ['A']), 1);
});

test('report separates 5 USED questions and candidate; both tabs, mean before tie comparisons, facts and original review', () => temporary(async dir => {
  init(dir); prepare({ dir });
  for (const model of Object.keys(MODELS)) {
    await run({ dir, model, transport: { create: async request => {
      const source = sourceOf(request), o = outputFor(source); const wrong = o.choices.filter(c => !c.isAnswer);
      const r = Math.floor(readFileSync(`${dir}/${model}/requests.jsonl`, 'utf8').split('\n').filter(Boolean).length / 12) + 1;
      // Categorical repeats unchanged; fractional mean is intentionally retained.
      wrong[0].predictedSelectionPercent += r === 3 ? 1 : 0; wrong[1].predictedSelectionPercent -= r === 3 ? 1 : 0;
      return responseFor(source, o);
    } } });
  }
  const summary = report({ dir }); assert.equal(summary.reported, true);
  const results = read(`${dir}/RESULTS.json`); assert.equal(results.usedWrongChoices, 20);
  for (const data of Object.values(results.models)) {
    assert.equal(data.questions.length, 6); assert.equal(data.stability.questions, 5);
    for (const tab of ['1004', '1005']) { assert.equal(data.byTab[tab].meanPrediction.questions, 5); assert.equal(data.byTab[tab].meanPrediction.wrongChoices, 20); }
    const mrna = data.questions.find(q => q.questionId.startsWith('mrna'));
    assert.deepEqual(mrna.byTab['1004'], mrna.byTab['1005']);
    const candidate = data.questions.find(q => q.status === 'DATE_MISMATCH_CANDIDATE'); assert.ok(candidate.meanPredictions);
    for (const q of data.questions) {
      const wrong = q.repeats[0].predictions.map((_, i) => i).filter(i => `C${i + 1}` !== q.answerChoiceId);
      assert.equal(q.meanPredictions[wrong[0]], 20 + 1 / 3);
      assert.deepEqual(q.byTab['1004'].meanPredictionMetrics.P, [`C${wrong[0] + 1}`]);
    }
  }
  assert.match(readFileSync(`${dir}/REPORT.md`, 'utf8'), /공손룡 후보 회차/);
  assert.match(readFileSync(`${dir}/REVIEW.md`, 'utf8'), /검토용 원문 C1/);
  assert.deepEqual(report({ dir }), summary); // Read-only report regeneration, no requests.
}));
