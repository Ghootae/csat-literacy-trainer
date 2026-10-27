import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TARGETS, LIMITS, LUNA_DIR, REGRESSION_DIR, replayTransport, payloadMatches, layoutRequest, findEndRequest, prepareCases, main } from './run-end-explanation-layout-v1.mjs';
import { END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS } from '../packages/pipeline/dist/problem-solving/feedback-end-explanation.js';

const haveData = existsSync(`${LUNA_DIR}/requests`) && existsSync(`${REGRESSION_DIR}/requests`);
const tmp = () => mkdtempSync(join(tmpdir(), 'end-layout-'));

test('fixed target list: 12 sessions, 9 luna folders plus 3 wrong endings', () => {
  assert.equal(TARGETS.length, 12);
  assert.deepEqual(TARGETS.filter(t => t.dir === LUNA_DIR).length, 8);
  assert.deepEqual(LIMITS, { maxRequests: 20, usdCap: { 'gpt-6.1-sol': 1, 'gpt-6-luna': 0.2 } });
});

test('replayTransport returns stored raw outputs in order and then fails', async () => {
  const t = replayTransport([{ rawOutput: { a: 1 } }, { rawOutput: 'text' }]);
  assert.equal((await t.create()).output_text, '{"a":1}');
  assert.equal((await t.create()).output_text, 'text');
  await assert.rejects(t.create(), /REPLAY_EXHAUSTED/u);
});

test('payloadMatches accepts trailing retry items and rejects differences', () => {
  const a = [{ type: 'input_text', text: 'x' }];
  assert.ok(payloadMatches(a, [...a, { type: 'input_text', text: 'validationFeedback' }]));
  assert.ok(!payloadMatches(a, [{ type: 'input_text', text: 'y' }]));
});

test('layoutRequest swaps only instructions and content', () => {
  const stored = { model: 'm', reasoning: { effort: 'medium' }, max_output_tokens: 8000, instructions: 'old', input: [{ role: 'user', content: [{ type: 'input_text', text: 'old' }] }] };
  const r = layoutRequest(stored, [{ type: 'input_text', text: 'new' }]);
  assert.equal(r.instructions, END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS);
  assert.deepEqual({ ...r, instructions: 0, input: 0 }, { ...stored, instructions: 0, input: 0 });
  assert.equal(stored.input[0].content[0].text, 'old');
});

test('dry-run: 12 requests, default payloads of the rebuilt sessions equal the stored requests, no external call', { skip: !haveData }, async () => {
  const out = tmp();
  const r = await main({ dryRun: true, out, transport: { create: () => { throw new Error('no external call'); } } });
  assert.equal(r.sessions, 12); assert.equal(r.baseMatch, 12); assert.deepEqual(r.baseMismatch, []); assert.equal(r.externalRequests, 0);
  assert.ok(!r.overCap && !r.overMaxRequests);
  const req = JSON.parse(readFileSync(`${out}/requests/KC-r1.request.json`, 'utf8')).request;
  assert.equal(req.instructions, END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS);
  const payload = JSON.parse(req.input[0].content[0].text);
  assert.equal(payload.sections.firstChoice.type, 'GAP'); assert.equal(payload.sections.firstChoice.conclusionOnly, true);
  assert.ok(!('insufficiencyKind' in payload) && !('insufficiencyCase' in payload));
});

test('the wrong endings keep their section structure', { skip: !haveData }, async () => {
  const { cases } = await prepareCases({ targets: TARGETS.filter(t => ['D-A3', 'C-B3'].includes(t.caseId)) });
  const by = Object.fromEntries(cases.map(c => [c.caseId, c.payload.sections]));
  assert.equal(by['D-A3'].firstChoice.repair, 'NOT_REPAIRED'); assert.equal(by['D-A3'].reselection, null);
  assert.equal(by['C-B3'].reselection.type, 'ERROR');
});

test('real run with a mocked transport writes responses, ledger and results; a validation failure is retried at most twice', { skip: !haveData }, async () => {
  const targets = TARGETS.filter(t => t.caseId === 'KC-r1');
  const stored = findEndRequest('KC-r1', LUNA_DIR);
  const good = stored.original.output_text;
  const calls = [];
  const transport = { create: async request => { calls.push(request); return { status: 'completed', output_text: calls.length === 1 ? '{"firstChoice":"","reselection":null,"answer":""}' : good, usage: { input_tokens: 1000, output_tokens: 500 } }; } };
  const out = tmp();
  const r = await main({ out, targets, transport });
  assert.equal(calls.length, 2); assert.equal(r.parsed, 1); assert.deepEqual(r.failed, []);
  assert.equal(calls[0].instructions, END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS);
  assert.ok(JSON.stringify(calls[1].input[0].content.at(-1)).includes('validationFeedback'));
  for (const f of ['ledger.jsonl', 'RESULTS.json', 'END-EXPLANATIONS.md', 'responses/KC-r1-1.response.json', 'responses/KC-r1-2.response.json']) assert.ok(existsSync(`${out}/${f}`), f);
  await assert.rejects(main({ out, targets, transport }), /RUN_EXISTS/u);
});

test('request cap stops the run', { skip: !haveData }, async () => {
  const targets = TARGETS.filter(t => ['KC-r1', 'QP-r1'].includes(t.caseId));
  const out = tmp();
  const r = await main({ out, targets, limits: { ...LIMITS, maxRequests: 1 }, transport: { create: async () => ({ status: 'completed', output_text: findEndRequest('KC-r1', LUNA_DIR).original.output_text, usage: { input_tokens: 1, output_tokens: 1 } }) } });
  assert.equal(r.externalRequests, 1); assert.match(r.stop, /RUN_LIMIT/u);
});
