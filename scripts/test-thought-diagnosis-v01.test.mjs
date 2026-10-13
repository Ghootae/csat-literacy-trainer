import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSources, hash } from './test-trap-map-v0.mjs';
import { DEFAULT_DIR, BASELINE_DIR, STEPS, MODELS, JSON_SCHEMA, instructionsFromGuide, requestFor,
  validateOutput, prepare, verifyFrozen, run, metrics, majorityOutput, report, directoryHashes } from './test-thought-diagnosis-v01.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const cases = read(`${DEFAULT_DIR}/cases.json`).cases;
const guide = readFileSync(`${DEFAULT_DIR}/LABEL-GUIDE.md`, 'utf8');
const sources = loadSources().sources;
const baselineHashes = directoryHashes(BASELINE_DIR);
const v0RunnerHash = hash(readFileSync('scripts/test-thought-diagnosis-v0.mjs'));
const protectedInputHashes = Object.fromEntries(['cases.json', 'gold-labels.json', 'LABEL-GUIDE.md'].map(n => [n, hash(readFileSync(`${DEFAULT_DIR}/${n}`))]));
const output = (caseId, changes = {}) => ({ caseId, outcomeType: 'NONE', unjudgeableReason: null, guessed: false,
  steps: Object.fromEntries(STEPS.map(s => [s, 'PASS'])), firstFailedStep: null, errors: [], note: 'mock', ...changes });
const fail = (caseId, changes = {}) => output(caseId, { outcomeType: 'ERROR',
  steps: { ...output(caseId).steps, S5_JUDGE: 'FAIL' }, firstFailedStep: 'S5_JUDGE',
  errors: [{ tag: 'DIRECTION', step: 'S5_JUDGE', studentQuote: 'mock' }], ...changes });
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'thought-v01-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const name of ['cases.json', 'gold-labels.json', 'LABEL-GUIDE.md']) writeFileSync(`${dir}/${name}`, readFileSync(`${DEFAULT_DIR}/${name}`));
  prepare({ dir }); return dir;
}
function fakeTransport(fn = c => output(c.caseId)) {
  const requests = [];
  return { requests, async create(request, options) {
    requests.push({ request, options });
    const c = JSON.parse(request.input[0].content[0].text).student;
    const value = await fn(c, requests.length);
    return { id: `mock-${requests.length}`, model: request.model, status: 'completed', output: [],
      usage: { input_tokens: 100, output_tokens: 100 }, output_text: JSON.stringify(value) };
  } };
}
test('fixed first line + entire unchanged v0.1 guide; strict extended schema', () => {
  const instructions = instructionsFromGuide(guide);
  assert.equal(instructions.split('\n')[0], '너는 수능 국어 독서 문항에서 학생 풀이를 진단하는 평가자다. 아래 가이드에 따라 이 학생의 풀이 하나를 진단한다.');
  assert.equal(instructions.slice(instructions.indexOf('\n\n') + 2), guide);
  assert.ok(instructions.includes('## 0.'));
  assert.equal(JSON_SCHEMA.additionalProperties, false);
  assert.equal(JSON_SCHEMA.properties.steps.additionalProperties, false);
  assert.equal(JSON_SCHEMA.properties.errors.items.additionalProperties, false);
  assert.ok(JSON_SCHEMA.required.includes('guessed'));
  assert.ok(JSON_SCHEMA.properties.outcomeType.enum.includes('UNJUDGEABLE'));
});
test('request excludes basis, expected, labels, gold and alt; image and v0 settings preserved', () => {
  const c = { ...cases.find(c => c.id === 'M3'), gold: 'FORBIDDEN', labels: 'FORBIDDEN', expected: 'FORBIDDEN' };
  const source = structuredClone(sources[c.questionId]);
  source.basis = 'FORBIDDEN'; source.expected = 'FORBIDDEN'; source.gold = 'FORBIDDEN'; source.media[0].alt = 'FORBIDDEN';
  source.choices[0].label = 'FORBIDDEN';
  const request = requestFor('gpt-6-luna', source, c, { instructions: instructionsFromGuide(guide) });
  const text = JSON.stringify(request);
  for (const forbidden of ['"basis"', '"expected"', '"labels"', '"label"', '"gold"', '"alt"', 'FORBIDDEN']) assert.ok(!text.includes(forbidden), forbidden);
  assert.deepEqual(JSON.parse(request.input[0].content[0].text).student, { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale });
  assert.deepEqual(request.input[0].content[1], { type: 'input_image', image_url: source.media[0].url, detail: 'high' });
  assert.deepEqual(request.reasoning, { effort: 'medium' }); assert.equal(request.max_output_tokens, 6000);
  assert.equal(request.text.format.name, 'thought_diagnosis_v01'); assert.equal(request.text.format.strict, true);
});
test('schema checks reason iff UNJUDGEABLE, boolean guessed, error outcome, ID and first FAIL', () => {
  const o = output('a', { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'NO_CONTENT', guessed: true });
  assert.equal(validateOutput(o, 'a').unjudgeableReason, 'NO_CONTENT');
  assert.throws(() => validateOutput({ ...o, unjudgeableReason: null }, 'a'), /UNJUDGEABLE_REASON/);
  assert.throws(() => validateOutput({ ...o, outcomeType: 'NONE' }, 'a'), /UNJUDGEABLE_REASON/);
  assert.throws(() => validateOutput({ ...o, unjudgeableReason: 'UNKNOWN' }, 'a'));
  assert.throws(() => validateOutput({ ...o, guessed: 'true' }, 'a'));
  assert.throws(() => validateOutput({ ...o, extra: 1 }, 'a'));
  assert.throws(() => validateOutput({ ...o, errors: fail('a').errors }, 'a'), /ERRORS_OUTCOME/);
  assert.throws(() => validateOutput(output('a', { outcomeType: 'INSUFFICIENT', errors: fail('a').errors }), 'a'), /ERRORS_OUTCOME/);
  assert.throws(() => validateOutput(output('a', { outcomeType: 'ERROR' }), 'a'), /ERRORS_OUTCOME/);
  assert.throws(() => validateOutput(o, 'b'), /CASE_ID/);
  assert.throws(() => validateOutput({ ...o, firstFailedStep: 'S1_STEM' }, 'a'), /FIRST_FAILED_STEP/);
});
test('semantic no-FAIL rule and inaccurate quotes remain measurable, no contract retry', () => {
  for (const outcomeType of ['UNJUDGEABLE', 'INSUFFICIENT']) {
    const o = fail('a', { outcomeType, unjudgeableReason: outcomeType === 'UNJUDGEABLE' ? 'NO_CONTENT' : null, errors: [] });
    assert.equal(validateOutput(o, 'a').steps.S5_JUDGE, 'FAIL');
  }
  assert.equal(validateOutput(fail('a'), 'a').errors[0].studentQuote, 'mock');
});
test('prepare API-free, 108 schedule cells, originals unchanged, idempotent hashes', t => {
  const dir = fixture(t), f = read(`${dir}/FROZEN.json`);
  assert.equal(prepare({ dir }).externalRequests, 0); assert.equal(f.schedule.length, 108);
  assert.equal(f.goldHash, protectedInputHashes['gold-labels.json']);
  assert.equal(f.models['gpt-6-luna'].maxRequests, 120);
  assert.deepEqual(f.baselineFileHashes, baselineHashes);
  assert.equal(f.dependencyHashes['scripts/test-thought-diagnosis-v0.mjs'], v0RunnerHash);
  for (const r of [1, 2, 3]) assert.deepEqual(f.schedule.filter(c => c.replicate === r).map(c => c.caseId).sort(), cases.map(c => c.id).sort());
  for (const [name, h] of Object.entries(protectedInputHashes)) assert.equal(hash(readFileSync(`${dir}/${name}`)), h);
  assert.ok(!readFileSync(`${dir}/prepared-cases.json`, 'utf8').includes('"basis"'));
  writeFileSync(`${dir}/prompts.json`, '{}'); assert.throws(() => verifyFrozen(dir), /Frozen artifact changed/);
});
test('gold and guide mutation refused before requests', async t => {
  const dir = fixture(t), transport = fakeTransport();
  writeFileSync(`${dir}/gold-labels.json`, '{}');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport })); assert.equal(transport.requests.length, 0);
});
test('full fake run, semantic FAIL not retried, resume sends nothing', async t => {
  const dir = fixture(t), transport = fakeTransport(c => fail(c.caseId, { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'NO_CONTENT', errors: [] }));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.completedCells, 108); assert.equal(r.requests, 108); assert.equal(r.statuses.VALID, 108); assert.equal(r.retries, 0);
  assert.equal(r.conservativeUsd.toFixed(6), '0.006480');
  assert.ok(transport.requests.every(r => r.options.timeout === 90000));
  assert.equal(read(`${dir}/gpt-6-luna/M3-r1.json`).hasInputImage, true);
  assert.equal((await run({ dir, model: 'gpt-6-luna', transport })).requests, 108);
  assert.equal(transport.requests.length, 108);
});
test('schema failure retries once and retains both responses, no gold in transport', async t => {
  const dir = fixture(t), transport = fakeTransport((c, n) => n === 1 ? { ...output(c.caseId), guessed: 'invalid' } : output(c.caseId));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 109); assert.equal(r.statuses.VALID, 108); assert.equal(r.formatErrors, 1); assert.equal(r.retries, 1);
  const first = read(`${dir}/FROZEN.json`).schedule[0];
  assert.equal(read(`${dir}/gpt-6-luna/${first.caseId}-r1.json`).attempts.length, 2);
  for (const { request } of transport.requests) {
    const text = JSON.stringify(request);
    for (const k of ['"basis"', '"goldHash"', '"adjudication"', '"labels"']) assert.ok(!text.includes(k));
  }
});
test('request cap counts retries and stops at exactly 120', async t => {
  const dir = fixture(t), transport = fakeTransport(() => ({}));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 120); assert.equal(r.completedCells, 60); assert.equal(r.statuses.FORMAT_ERROR, 60); assert.match(r.stop, /RUN_LIMIT/);
  assert.equal(transport.requests.length, MODELS['gpt-6-luna'].maxRequests);
});
test('cost reservation cap stops before sending and retains unknown usage', async t => {
  const dir = fixture(t), transport = fakeTransport(); mkdirSync(`${dir}/gpt-6.1-sol`);
  writeFileSync(`${dir}/gpt-6.1-sol/requests.jsonl`, [{ event: 'START', requestId: 'old', label: 'old', reservedUsd: 3.999 },
    { event: 'END', requestId: 'old', costs: null }].map(JSON.stringify).join('\n') + '\n');
  const r = await run({ dir, model: 'gpt-6.1-sol', transport });
  assert.match(r.stop, /RUN_LIMIT/); assert.equal(r.unknownReservedUsd, 3.999); assert.equal(transport.requests.length, 0);
});
test('incomplete ledger and missing cell after request refuse resume', async t => {
  const dir = fixture(t), transport = fakeTransport(); mkdirSync(`${dir}/gpt-6-luna`);
  const c = read(`${dir}/FROZEN.json`).schedule[0];
  const start = { event: 'START', requestId: 'one', label: `${c.caseId}-r${c.replicate}`, reservedUsd: .01 };
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, JSON.stringify(start) + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport }), /incomplete ledger/);
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, [start, { event: 'END', requestId: 'one', costs: null }].map(JSON.stringify).join('\n') + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport }), /missing cell/);
  assert.equal(transport.requests.length, 0);
});
test('policy refusal no retry; API failure stops with reserved unknown cost', async t => {
  const dir = fixture(t), base = fakeTransport(); let calls = 0;
  const transport = { async create(req, opts) { if (++calls === 1) throw Object.assign(new Error('mock policy'), { status: 400 }); return base.create(req, opts); } };
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 108); assert.equal(r.statuses.POLICY_REFUSAL, 1); assert.equal(r.retries, 0);
  const network = { async create() { throw new Error('mock network'); } };
  const stopped = await run({ dir, model: 'gpt-6.1-sol', transport: network });
  assert.equal(stopped.requests, 1); assert.match(stopped.stop, /API_ERROR/); assert.ok(stopped.unknownReservedUsd > 0);
});
test('new metrics hand calculation, all gold UNJUDGEABLE denominator, FAIL and errors independently', () => {
  const gold = [output('a', { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'NO_CONTENT', guessed: true }),
    output('b', { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'GUESS_ONLY' }),
    output('c', { outcomeType: 'INSUFFICIENT' }), fail('d'), output('e'), output('f', { outcomeType: 'POLARITY_MISMATCH' })];
  const predicted = [{ ...gold[0], unjudgeableReason: 'GUESS_ONLY' }, output('b'), fail('c', { errors: [] }),
    output('d', { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'NO_CONTENT' }), gold[4], gold[5]];
  const m = metrics(gold, predicted);
  assert.deepEqual(m.unjudgeableRecall, { count: 1, total: 2, rate: .5 });
  assert.deepEqual(m.unjudgeableReason, { count: 0, total: 2, rate: 0 });
  assert.deepEqual(m.overclassification, { count: 1, total: 3, rate: 1/3 });
  assert.deepEqual(m.overdeferral, { count: 1, total: 3, rate: 1/3 });
  assert.equal(m.guessed.rate, 1);
  assert.equal(m.steps.S5_JUDGE.failPrecision, 0);
  predicted[2] = output('c', { errors: fail('c').errors }); assert.equal(metrics(gold, predicted).overclassification.rate, 1/3);
  assert.equal(metrics(gold, [null,null,null,null,null,null]).guessed.rate, 0);
  assert.equal(metrics([output('a')], [output('a')]).unjudgeableRecall.rate, null);
});
test('fieldwise majority includes reason and guessed; errorCount flags overclassification; ties counted incorrect', () => {
  const a = output('a', { outcomeType: 'UNJUDGEABLE', unjudgeableReason: 'NO_CONTENT' });
  const b = { ...a, guessed: true }, c = { ...b, unjudgeableReason: 'GUESS_ONLY' };
  const vote = majorityOutput([a,b,c]); assert.equal(vote.guessed, true); assert.equal(vote.unjudgeableReason, 'NO_CONTENT');
  assert.equal(metrics([a], [vote]).guessed.rate, 0);
  const tie = majorityOutput([a, { ...b, unjudgeableReason: 'CONTRADICTORY' }, c]);
  assert.equal(tie.unjudgeableReason, 'NO_MAJORITY'); assert.equal(metrics([a], [tie]).unjudgeableReason.rate, 0);
  const erroneous = majorityOutput([fail('a'), fail('a'), a]);
  assert.equal(metrics([a], [erroneous]).overclassification.rate, 1);
});
test('report human-readable tables, all new/v0 metrics, 30-case baseline, side-by-side raw triples', async t => {
  const dir = fixture(t), labels = read(`${dir}/gold-labels.json`).labels;
  for (const model of Object.keys(MODELS)) await run({ dir, model, transport: fakeTransport(c => labels.find(l => l.caseId === c.caseId)) });
  assert.equal(report({ dir }).cases, 36);
  const r = read(`${dir}/RESULTS.json`);
  assert.equal(r.baselineComparison.caseIds.length, 30);
  for (const model of Object.keys(MODELS)) {
    const m = r.models[model]; assert.equal(m.repeats.length, 3); assert.equal(m.majority.outcomeType.accuracy, 1);
    assert.equal(m.majority.unjudgeableRecall.rate, 1); assert.equal(m.majority.guessed.rate, 1);
    assert.equal(m.majority.overclassification.rate, 0); assert.equal(m.majority.overdeferral.rate, 0);
    assert.equal(m.stability.rate, 1); assert.equal(r.baselineComparison.models[model].v01.majority.outcomeType.total, 30);
  }
  const md = readFileSync(`${dir}/REPORT.md`, 'utf8'); assert.ok(!md.includes('```json')); assert.ok(!md.includes('"models"'));
  const tables = md.split('\n').filter(l => l.startsWith('| '));
  assert.ok(tables[0].includes('판단 불가 재현율')); assert.ok(tables[0].includes('S5 실패 정밀도'));
  assert.ok(md.includes('과잉 보류율')); assert.ok(md.includes('결과 유형 κ')); assert.ok(md.includes('guessed 일치'));
  const review = readFileSync(`${dir}/REVIEW.md`, 'utf8'); assert.ok(review.includes('## N6')); assert.ok(review.includes('luna 3회')); assert.ok(review.includes('sol 3회'));
  assert.ok(review.includes(cases[0].rationale));
});
test('v0 artifacts/runner and v0.1 input byte hashes unchanged after all tests', () => {
  assert.deepEqual(directoryHashes(BASELINE_DIR), baselineHashes);
  assert.equal(hash(readFileSync('scripts/test-thought-diagnosis-v0.mjs')), v0RunnerHash);
  for (const [name, h] of Object.entries(protectedInputHashes)) assert.equal(hash(readFileSync(`${DEFAULT_DIR}/${name}`)), h);
});
