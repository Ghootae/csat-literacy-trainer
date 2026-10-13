import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSources, hash } from './test-trap-map-v0.mjs';
import { DEFAULT_DIR, GUIDE_PATH, CASES_PATH, STEPS, JSON_SCHEMA, MODELS, instructionsFromGuide, requestFor,
  validateOutput, quoteChecks, scheduleFor, prepare, run, majority, majorityOutput, cohenKappa, metrics,
  compareLabelers, report } from './test-thought-diagnosis-v0.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const cases = read(CASES_PATH), sources = loadSources().sources;
const guide = readFileSync(GUIDE_PATH, 'utf8');
const prompts = { instructions: instructionsFromGuide(guide) };
const output = (caseId, changes = {}) => ({ caseId, outcomeType: 'NONE', steps: Object.fromEntries(STEPS.map(s => [s, 'PASS'])),
  firstFailedStep: null, errors: [], note: 'mock', ...changes });
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'thought-diagnosis-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const labels = readFileSync(`${DEFAULT_DIR}/labels-codex.json`);
  writeFileSync(`${dir}/labels-codex.json`, labels);
  save(`${dir}/FROZEN.json`, { version: 1, guideHash: hash(guide), labelsCodexHash: hash(labels) });
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

test('request whitelist excludes basis, expected, every label and media alt; mRNA carries image high', () => {
  const c = { ...cases.find(c => c.id === 'M3'), labels: 'FORBIDDEN_LABEL', label: 'FORBIDDEN_LABEL' };
  const source = structuredClone(sources[c.questionId]);
  source.basis = 'FORBIDDEN'; source.expected = 'FORBIDDEN'; source.label = 'FORBIDDEN'; source.media[0].alt = 'FORBIDDEN_ALT';
  source.choices[0].label = 'FORBIDDEN';
  const request = requestFor('gpt-6-luna', source, c, prompts);
  const text = JSON.stringify(request);
  for (const forbidden of ['"basis"', '"expected"', '"labels"', '"label"', '"alt"', 'FORBIDDEN']) assert.ok(!text.includes(forbidden), forbidden);
  assert.deepEqual(request.input[0].content[1], { type: 'input_image', image_url: source.media[0].url, detail: 'high' });
  assert.deepEqual(request.reasoning, { effort: 'medium' }); assert.equal(request.max_output_tokens, 6000);
  assert.equal(request.text.format.strict, true);
  const student = JSON.parse(request.input[0].content[0].text).student;
  assert.deepEqual(student, { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale });
});
test('instructions contain the exact guide §1–4 and fixed opening line; schema strict and enums', () => {
  assert.equal(prompts.instructions.split('\n')[0], '너는 수능 국어 독서 문항에서 학생 풀이를 진단하는 평가자다. 아래 가이드에 따라 이 학생의 풀이 하나를 진단한다.');
  assert.equal(prompts.instructions.slice(prompts.instructions.indexOf('## 1.')), guide.slice(guide.indexOf('## 1.')).trimEnd());
  assert.equal(JSON_SCHEMA.additionalProperties, false);
  assert.equal(JSON_SCHEMA.properties.steps.additionalProperties, false);
  assert.equal(JSON_SCHEMA.properties.errors.items.additionalProperties, false);
  assert.ok(JSON_SCHEMA.properties.errors.items.properties.tag.enum.includes('MISREAD_FACT'));
});
test('prepare is API-free, repeatable, freezes all artifacts and refuses mutation', t => {
  const dir = fixture(t), f = read(`${dir}/FROZEN.json`);
  assert.equal(prepare({ dir }).externalRequests, 0); assert.equal(f.schedule.length, 90);
  assert.equal(f.labelsCodexHash, hash(readFileSync(`${dir}/labels-codex.json`)));
  assert.equal(f.fileHashes[CASES_PATH], hash(readFileSync(CASES_PATH)));
  assert.deepEqual(scheduleFor(cases), f.schedule);
  for (const r of [1, 2, 3]) assert.deepEqual(f.schedule.filter(c => c.replicate === r).map(c => c.caseId).sort(), cases.map(c => c.id).sort());
  writeFileSync(`${dir}/prompts.json`, '{}'); assert.throws(() => prepare({ dir }), /Frozen artifact changed/);
});
test('schema and contract failures, exact quote mismatch remains a metric only', () => {
  assert.throws(() => validateOutput({ ...output('I1'), unexpected: 1 }, 'I1'));
  assert.throws(() => validateOutput(output('I2'), 'I1'), /CASE_ID/);
  assert.throws(() => validateOutput(output('I1', { firstFailedStep: 'S1_STEM' }), 'I1'), /FIRST_FAILED_STEP/);
  assert.throws(() => validateOutput(output('I1', { outcomeType: 'ERROR' }), 'I1'), /ERRORS_OUTCOME/);
  assert.throws(() => validateOutput(output('I1', { steps: { ...output('I1').steps, S1_STEM: 'UNKNOWN' } }), 'I1'));
  const o = output('I1', { outcomeType: 'ERROR', errors: [{ tag: 'DIRECTION', step: 'S5_JUDGE', studentQuote: 'absent' }] });
  assert.equal(validateOutput(o, 'I1').errors.length, 1);
  assert.equal(quoteChecks(o, cases[0].rationale)[0].exact, false);
});
test('full mock run preserves requests, usage, image flags; completed resume sends nothing', async t => {
  const dir = fixture(t), transport = fakeTransport();
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.completedCells, 90); assert.equal(r.requests, 90); assert.equal(r.statuses.VALID, 90);
  assert.equal(r.conservativeUsd.toFixed(6), '0.005400'); assert.equal(r.unknownReservedUsd, 0);
  assert.ok(transport.requests.every(r => r.options.timeout === 90000));
  assert.equal(read(`${dir}/gpt-6-luna/M3-r1.json`).hasInputImage, true);
  assert.equal(read(`${dir}/gpt-6-luna/C3-r1.json`).hasInputImage, false);
  const again = await run({ dir, model: 'gpt-6-luna', transport }); assert.equal(again.requests, 90); assert.equal(transport.requests.length, 90);
});
test('format error retries once, preserves bad response; twice failing becomes FORMAT_ERROR', async t => {
  const dir = fixture(t), first = read(`${dir}/FROZEN.json`).schedule[0].caseId;
  const transport = fakeTransport((c, n) => c.caseId === first && n <= 2 ? output('WRONG') : output(c.caseId));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.completedCells, 90); assert.equal(r.requests, 91); assert.equal(r.retries, 1); assert.equal(r.statuses.FORMAT_ERROR, 1);
  const row = read(`${dir}/gpt-6-luna/${first}-r1.json`); assert.equal(row.attempts.length, 2); assert.equal(row.output, null);
  assert.ok(row.attempts.every(a => a.response.output_text.includes('WRONG')));
});
test('single schema failure then recovery retains both attempts', async t => {
  const dir = fixture(t), transport = fakeTransport((c, n) => n === 1 ? { ...output(c.caseId), extra: 1 } : output(c.caseId));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 91); assert.equal(r.statuses.VALID, 90); assert.equal(r.formatErrors, 1);
});
test('request cap includes validation retries; no hidden SDK retries', async t => {
  const dir = fixture(t), transport = fakeTransport(() => ({}));
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 100); assert.equal(r.completedCells, 50); assert.match(r.stop, /RUN_LIMIT/);
  assert.equal(transport.requests.length, MODELS['gpt-6-luna'].maxRequests);
});
test('cost cap stops before sending; unknown cost retains reservation', async t => {
  const dir = fixture(t), transport = fakeTransport();
  mkdirSync(`${dir}/gpt-6.1-sol`);
  writeFileSync(`${dir}/gpt-6.1-sol/requests.jsonl`, [
    { event: 'START', requestId: 'past', label: 'past', reservedUsd: 3.999 },
    { event: 'END', requestId: 'past', label: 'past', costs: null },
  ].map(JSON.stringify).join('\n') + '\n');
  const r = await run({ dir, model: 'gpt-6.1-sol', transport });
  assert.match(r.stop, /RUN_LIMIT/); assert.equal(r.unknownReservedUsd, 3.999); assert.equal(transport.requests.length, 0);
});
test('incomplete ledger and completed requests whose cell is missing refuse resume', async t => {
  const dir = fixture(t), transport = fakeTransport(); mkdirSync(`${dir}/gpt-6-luna`);
  const label = read(`${dir}/FROZEN.json`).schedule[0];
  const start = { event: 'START', requestId: 'one', label: `${label.caseId}-r${label.replicate}`, reservedUsd: .01 };
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, JSON.stringify(start) + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport }), /incomplete ledger/);
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, [start, { event: 'END', requestId: 'one', costs: null }].map(JSON.stringify).join('\n') + '\n');
  await assert.rejects(run({ dir, model: 'gpt-6-luna', transport }), /missing cell/); assert.equal(transport.requests.length, 0);
});
test('HTTP policy refusal gets no retry and continues; network error stops with closed accounting', async t => {
  const dir = fixture(t), base = fakeTransport(); let calls = 0;
  const transport = { async create(req, opts) { calls++; if (calls === 1) throw Object.assign(new Error('mock policy refusal'), { status: 400 }); return base.create(req, opts); } };
  const r = await run({ dir, model: 'gpt-6-luna', transport });
  assert.equal(r.requests, 90); assert.equal(r.statuses.POLICY_REFUSAL, 1); assert.equal(r.retries, 0); assert.ok(r.unknownReservedUsd > 0);
  const network = { async create() { throw new Error('mock network'); } };
  const stopped = await run({ dir, model: 'gpt-6.1-sol', transport: network });
  assert.equal(stopped.requests, 1); assert.equal(stopped.statuses.API_ERROR, 1); assert.match(stopped.stop, /API_ERROR/);
});
test('structured refusal does not become FORMAT_ERROR or retry', async t => {
  const dir = fixture(t), base = fakeTransport(); let calls = 0;
  const transport = { async create(req, opts) { const r = await base.create(req, opts); if (++calls === 1) r.output = [{ content: [{ type: 'refusal', refusal: 'mock' }] }]; return r; } };
  const r = await run({ dir, model: 'gpt-6-luna', transport }); assert.equal(r.statuses.POLICY_REFUSAL, 1); assert.equal(r.retries, 0);
});
test('hand calculated accuracy, kappa, first failure, FAIL precision/recall, tag metrics and count', () => {
  const gold = [output('a'), output('b'), output('c', { outcomeType: 'ERROR', firstFailedStep: 'S4_INTERPRET', steps: { ...output('c').steps, S4_INTERPRET: 'FAIL' }, errors: [{ tag: 'DIRECTION' }, { tag: 'ATTRIBUTION' }] }),
    output('d', { outcomeType: 'ERROR', firstFailedStep: 'S4_INTERPRET', steps: { ...output('d').steps, S4_INTERPRET: 'FAIL' }, errors: [{ tag: 'DIRECTION' }] })];
  const predicted = [gold[0], { ...gold[1], outcomeType: 'ERROR', steps: { ...gold[1].steps, S4_INTERPRET: 'FAIL' }, firstFailedStep: 'S4_INTERPRET', errors: [{ tag: 'DIRECTION' }] },
    { ...gold[2], errors: [{ tag: 'DIRECTION' }] }, { ...gold[3], outcomeType: 'NONE', steps: output('d').steps, firstFailedStep: null, errors: [] }];
  const m = metrics(gold, predicted);
  assert.equal(m.outcomeType.accuracy, .5); assert.equal(m.outcomeType.kappa, 0); assert.equal(m.firstFailedStep.accuracy, .5);
  assert.equal(m.steps.S4_INTERPRET.failRecall, .5); assert.equal(m.steps.S4_INTERPRET.failPrecision, .5);
  assert.equal(m.traps.meanJaccard, .25); assert.equal(m.traps.fullyIncludedRate, 0); assert.equal(m.errorCount.accuracy, .25);
  assert.equal(cohenKappa(['NONE','NONE','ERROR','ERROR'], ['NONE','NONE','ERROR','NONE']), .5);
  assert.equal(cohenKappa(['NONE'], ['NONE']), null);
  assert.equal(metrics(gold, gold).steps.S1_STEM.failRecall, null);
  assert.equal(metrics(gold, [null,null,null,null]).outcomeType.accuracy, 0);
});
test('fieldwise majority, exact tag sets, null first failure, tie is NO_MAJORITY', () => {
  assert.equal(majority(['NONE','ERROR','INSUFFICIENT']), 'NO_MAJORITY'); assert.equal(majority([null,null,'S1_STEM']), null);
  const a = output('a'), b = output('a', { outcomeType: 'ERROR', errors: [{ tag: 'DIRECTION' }] });
  const c = output('a', { outcomeType: 'INSUFFICIENT', errors: [{ tag: 'ATTRIBUTION' }] });
  const m = majorityOutput([a,b,c]); assert.equal(m.outcomeType, 'NO_MAJORITY'); assert.equal(m.firstFailedStep, null);
  assert.equal(m.tagSet, 'NO_MAJORITY'); assert.equal(m.errorCount, 1);
  assert.equal(metrics([a], [m]).outcomeType.accuracy, 0);
  assert.deepEqual(majorityOutput([a,a,b]).tagSet, []);
});
test('compare-labelers uses synthetic labels only; creates side by side disagreement and interLabeler', t => {
  const dir = fixture(t); assert.throws(() => compareLabelers({ dir }), /Both independent labels required/);
  const claude = read(`${dir}/labels-codex.json`); claude.labeler = 'claude'; claude.labels[0].steps.S1_STEM = 'NOT_OBSERVED';
  save(`${dir}/labels-claude.json`, claude);
  const r = compareLabelers({ dir }); assert.equal(r.disagreements, 1);
  const md = readFileSync(`${dir}/DISAGREEMENTS.md`, 'utf8');
  assert.ok(md.includes(cases[0].rationale)); assert.ok(md.includes('steps.S1_STEM')); assert.ok(md.includes('판정: CODEX | CLAUDE | 직접 수정'));
  assert.equal(read(`${dir}/RESULTS.json`).interLabeler.steps.S1_STEM.matches, 29);
});
test('report requires gold; complete synthetic report includes repeated and majority metrics, stability and all output triples', async t => {
  const dir = fixture(t); assert.throws(() => report({ dir }), /gold-labels/);
  save(`${dir}/gold-labels.json`, { guideHash: hash(guide), labels: cases.map(c => output(c.id)) });
  for (const model of Object.keys(MODELS)) await run({ dir, model, transport: fakeTransport() });
  const r = report({ dir }); assert.equal(r.cases, 30);
  const results = read(`${dir}/RESULTS.json`);
  for (const model of Object.keys(MODELS)) {
    assert.equal(results.models[model].repeats.length, 3); assert.equal(results.models[model].majority.outcomeType.accuracy, 1);
    assert.equal(results.models[model].stability.rate, 1);
  }
  const review = readFileSync(`${dir}/REVIEW.md`, 'utf8'); assert.ok(review.includes(cases[0].rationale)); assert.ok(review.includes('gpt-6.1-sol'));
  assert.ok(existsSync(`${dir}/REPORT.md`)); assert.equal(readdirSync(`${dir}/gpt-6-luna`).filter(n => /^[ICDSM]\d-r[123]\.json$/u.test(n)).length, 90);
});
