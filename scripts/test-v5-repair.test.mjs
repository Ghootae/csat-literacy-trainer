import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, loadInputs, checksFor, evaluateRepair, evaluateCoaching, coachingRequest, createLedger,
  COACHING_INSTRUCTIONS, ROLES, read, runDirectory, staticChecks } from './test-v5-repair.mjs';
import { main as buildReview } from './build-v5-repair-review.mjs';
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('External request forbidden in tests'); };
test.after(() => { globalThis.fetch = originalFetch; });
const temporary = async fn => {
  const dir = mkdtempSync(join(tmpdir(), 'v5-repair-'));
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const response = a => ({ id: 'fake-response', model: 'fake-model-version', status: 'completed', output_text: JSON.stringify(a),
  usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 30 }, output_tokens_details: { reasoning_tokens: 5 } } });
function fakeTransport(hook = () => {}) {
  const calls = [];
  return { calls, async create(request, options) {
    calls.push(structuredClone(request));
    assert.deepEqual(request.reasoning, { effort: 'medium' }); assert.equal(request.store, false);
    assert.equal(options.timeout, 90000); assert.equal(options.maxRetries, 0);
    const input = JSON.parse(request.input[0].content[0].text);
    let a;
    if (request.text.format.name === 'repair_end_coaching') {
      assert.equal(request.model, 'gpt-6.1-sol'); assert.equal(request.max_output_tokens, 4000);
      assert.equal(request.instructions, COACHING_INSTRUCTIONS);
      a = { coaching: '학생의 생각과 원문의 관계를 차근차근 설명해요.' };
    } else {
      assert.equal(request.model, 'gpt-6-luna'); assert.equal(request.max_output_tokens, 8000);
      assert.equal(input.mode, 'REPAIR'); assert.equal(request.text.format.schema.properties.studentClaims, undefined);
      assert.equal(request.instructions, read('docs/experiments/v5-multi-item-luna-sol-2026-10-08/prompts.json').methods);
      const latest = input.currentStudentResponse;
      const evidence = { observationId: latest.observationId, quote: latest.text };
      a = { mode: 'REPAIR', boundary: 'NONE', reason: '학생의 답변을 확인했어요.', reviewedResponse: evidence,
        repairs: [...input.initialErrors, ...input.additionalErrors].map(e => ({ errorId: e.errorId, status: 'REPAIRED', studentEvidence: [evidence] })),
        newErrors: [], verificationComplete: true, rationaleSufficient: true, coaching: '원문의 관계와 학생의 답변을 대조해 설명해요.' };
    }
    return await hook({ a, input, request, calls: calls.length }) ?? response(a);
  } };
}

test('prepare replays 16 sessions, freezes required inputs, rejects errorId mismatch and changes', () => temporary(async dir => {
  const transport = { create() { assert.fail('prepare sent request'); } };
  const first = await main({ dir, transport }); assert.equal(first.externalRequests, 0);
  assert.equal(first.sessions, 16); assert.equal(first.variants, 61);
  assert.deepEqual(await main({ dir, transport }), first);
  const frozen = read(`${dir}/FROZEN.json`);
  assert.ok(frozen.fileHashes['scripts/test-v5-repair.mjs']);
  assert.ok(frozen.fileHashes['packages/pipeline/dist/problem-solving/feedback.js']);
  assert.equal(frozen.coachingInstructionsHash.length, 64);
  const suite = structuredClone(loadInputs().suite); suite.variants[0].answers.wrongId = '없어요.';
  assert.throws(() => loadInputs(suite), /errorId mismatch/);
  delete suite.variants[0].answers.wrongId; suite.variants[0].expected.statuses.wrongId = 'REPAIRED';
  assert.throws(() => loadInputs(suite), /errorId mismatch/);
  frozen.coachingInstructionsHash = 'changed'; writeFileSync(`${dir}/FROZEN.json`, JSON.stringify(frozen));
  await assert.rejects(main({ dir, mode: 'preflight', role: 'repair', transport }), /FROZEN hash mismatch/);
}));

test('activeErrorId drives the chain; repaired future errors are skipped, fallback is recorded', () => temporary(async dir => {
  const data = loadInputs(), v = data.suite.variants.find(v => v.id === 'C1-A');
  const chain = fakeTransport(({ a, input }) => {
    if (input.currentStudentResponse.observationId === 'o2') a.repairs[1] = { ...a.repairs[1], status: 'UNCONFIRMED', studentEvidence: [] };
    return response(a);
  });
  const result = await evaluateRepair(data, v, 1, createLedger(`${dir}/chain.jsonl`, 'repair', chain));
  assert.equal(result.status, 'VALID', result.error); assert.deepEqual(result.askedErrorIds, ['E1', 'E2']);
  assert.deepEqual(result.turns.map(t => t.answer), [v.answers.E1, v.answers.E2]);
  assert.equal(result.after.phase, 'AWAITING_RESELECTION');
  const skip = data.suite.variants.find(v => v.session === 'C1' && v.boundary === 3);
  const skipped = await evaluateRepair(data, skip, 1, createLedger(`${dir}/skip.jsonl`, 'repair', fakeTransport()));
  assert.deepEqual(skipped.askedErrorIds, ['E1']); assert.deepEqual(skipped.skippedErrorIds, ['E2']);
  assert.equal(skipped.checks.questionOmission, true); assert.equal(skipped.checks.passed, true);
  const fallbackVariant = structuredClone(v); delete fallbackVariant.answers.E2;
  const fallback = await evaluateRepair(data, fallbackVariant, 1, createLedger(`${dir}/fallback.jsonl`, 'repair', fakeTransport(({ a, input }) => {
    a.repairs[1] = { ...a.repairs[1], status: 'UNCONFIRMED', studentEvidence: [] }; return response(a);
  })));
  assert.equal(fallback.status, 'VALID', fallback.error); assert.deepEqual(fallback.fallbackUsed, ['E2']);
  assert.equal(fallback.turns[1].answer, data.suite.fallbackAnswer);
}));

test('status matching, new errors, falseRepair and success use the specified rules', () => {
  const data = loadInputs(), v = data.suite.variants.find(v => v.id === 'I1-C');
  const s = structuredClone(data.sessions.I1); s.phase = 'COMPLETED';
  for (const status of ['REMAINING', 'UNCONFIRMED']) {
    s.errors[0].status = status; assert.equal(checksFor(v, s, ['E1']).passed, true);
  }
  s.errors[0].status = 'REPAIRED'; assert.deepEqual(checksFor(v, s, ['E1']).falseRepair, ['E1']);
  const correct = data.suite.variants.find(v => v.id === 'M3-A'), cs = structuredClone(data.sessions.M3);
  cs.errors[0].status = 'REPAIRED'; cs.phase = 'COMPLETED'; cs.result = { correctionSucceeded: true };
  assert.equal(checksFor(correct, cs, ['E1']).repairSuccess, true);
  cs.additionalErrors = [{ errorId: 'new' }]; assert.ok(checksFor(correct, cs, ['E1']).failures.some(f => f.name === 'newErrors'));
});

for (const limit of ['requests', 'cost']) test(`ledger ${limit} cap stops before sending and saves no cell`, () => temporary(async dir => {
  await main({ dir }); const transport = fakeTransport();
  const p = await main({ dir, mode: 'preflight', role: 'repair', transport }); assert.equal(p.operatingValidationPassed, true);
  const path = `${runDirectory(dir, 'repair')}/requests.jsonl`;
  if (limit === 'requests') {
    for (let i = 1; i < ROLES.repair.maxRequests; i++) appendFileSync(path,
      JSON.stringify({ event: 'START', requestId: `seed-${i}`, reservedUsd: 0 }) + '\n' +
      JSON.stringify({ event: 'END', requestId: `seed-${i}`, costs: { conservativeUsd: 0 } }) + '\n');
  } else appendFileSync(path, JSON.stringify({ event: 'START', requestId: 'cap', reservedUsd: ROLES.repair.usdCap }) + '\n' +
    JSON.stringify({ event: 'END', requestId: 'cap', costs: null }) + '\n');
  const summary = await main({ dir, mode: 'run', role: 'repair', transport });
  assert.match(summary.stop, /RUN_LIMIT/); assert.equal(summary.completedCells, 0); assert.equal(transport.calls.length, 1);
  assert.equal(existsSync(`${runDirectory(dir, 'repair')}/I1-A-r1.json`), false);
}));

test('START without END blocks resume even with ERROR', () => temporary(async dir => {
  const path = `${dir}/requests.jsonl`;
  writeFileSync(path, '{"event":"START","requestId":"unfinished"}\n{"event":"ERROR","requestId":"unfinished"}\n');
  assert.throws(() => createLedger(path, 'repair', fakeTransport()), /START without END/);
}));

test('coaching has exact instructions, images, question-linked utterances and URL-free source JSON', () => {
  const data = loadInputs(), s = data.sessions.M4;
  const request = coachingRequest(s, null, 'REPAIR_FAILED');
  assert.equal(request.instructions, COACHING_INSTRUCTIONS);
  const payload = JSON.parse(request.input[0].content[0].text);
  assert.equal(payload.source.stemPolarity, undefined); assert.equal(payload.endReason, 'REPAIR_FAILED');
  assert.equal(payload.lastRepairAssessment, null); assert.equal(payload.studentUtterances[0].observationId, 'o1');
  assert.equal(payload.source.answerChoiceId, s.source.answerChoiceId);
  assert.deepEqual(payload.source.officialExplanation, s.source.officialExplanation);
  assert.ok(payload.source.media.every(m => !Object.hasOwn(m, 'url')));
  assert.deepEqual(request.input[0].content.filter(c => c.type === 'input_image'), s.source.media.map(m => ({ type: 'input_image', image_url: m.url, detail: 'high' })));
  for (const m of s.source.media) assert.ok(!request.input[0].content[0].text.includes(m.url));
  const withRepair = JSON.parse(coachingRequest(s, { mode: 'REPAIR', reason: '판정 이유', coaching: '판정기 코칭' }, 'REPAIR_FAILED').input[0].content[0].text);
  assert.deepEqual(withRepair.lastRepairAssessment, { mode: 'REPAIR', reason: '판정 이유' });
  assert.ok(!JSON.stringify(withRepair).includes('판정기 코칭'));
  assert.deepEqual(staticChecks('C1'), { internalChoiceId: true, empty: false, fewerThanFourHangul: true });
  assert.equal(staticChecks('').empty, true);
});

for (const role of ['repair', 'coaching']) test(`${role} HTTP 400 is POLICY_REFUSAL with no retry`, () => temporary(async dir => {
  await main({ dir }); let calls = 0;
  const transport = { async create() { calls++; throw Object.assign(new Error('blocked'), { status: 400 }); } };
  const p = await main({ dir, mode: 'preflight', role, transport });
  assert.equal(calls, 1); assert.equal(p.cell.status, 'POLICY_REFUSAL'); assert.equal(p.operatingValidationPassed, false);
  const lines = readFileSync(`${runDirectory(dir, role)}/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.map(x => x.event), ['START', 'ERROR', 'END']);
  await assert.rejects(main({ dir, mode: 'run', role, transport }), /Preflight failed/);
}));

test('coaching retries JSON parse once with identical request, records static defects without rejecting', () => temporary(async dir => {
  const data = loadInputs(), variant = data.suite.variants.find(v => v.id === 'M4-A');
  const transport = fakeTransport(({ calls }) => calls === 1 ? { ...response({}), output_text: '{' } : response({ coaching: 'C1' }));
  const cell = await evaluateCoaching(variant, 1, { after: data.sessions.M4, lastRepairAssessment: null, endReason: 'REPAIR_FAILED' },
    createLedger(`${dir}/requests.jsonl`, 'coaching', transport));
  assert.equal(cell.status, 'VALID'); assert.equal(transport.calls.length, 2); assert.deepEqual(transport.calls[0], transport.calls[1]);
  assert.equal(cell.staticChecks.internalChoiceId, true); assert.equal(cell.attempts[0].outcome, 'ERROR');
}));

test('full fake runs, resume, coaching prerequisites and blind review cover all 183 cells', () => temporary(async dir => {
  await main({ dir }); const transport = fakeTransport();
  for (const role of ['repair', 'coaching']) {
    const p = await main({ dir, mode: 'preflight', role, transport });
    assert.equal(p.operatingValidationPassed, true, p.cell.error); assert.equal(p.requests, 1); assert.equal(p.hasInputImage, true);
    await assert.rejects(main({ dir, mode: 'preflight', role, transport }), /Preflight already exists/);
  }
  await assert.rejects(main({ dir, mode: 'run', role: 'coaching', transport }), /Missing repair cell/);
  const repair = await main({ dir, mode: 'run', role: 'repair', transport });
  assert.equal(repair.completedCells, 183); assert.equal(repair.valid, 183); assert.equal(repair.stop, null);
  const coaching = await main({ dir, mode: 'run', role: 'coaching', transport });
  assert.equal(coaching.completedCells, 126); assert.equal(coaching.valid, 126);
  assert.deepEqual(coaching.actualModels, ['fake-model-version']); assert.equal(coaching.requests, 127);
  assert.ok(coaching.tokens.input > 0); assert.ok(coaching.conservativeUsd > 0);
  const count = transport.calls.length;
  await main({ dir, mode: 'run', role: 'repair', transport }); await main({ dir, mode: 'run', role: 'coaching', transport });
  assert.equal(transport.calls.length, count);
  const cell = read(`${runDirectory(dir, 'coaching')}/M4-A-r1.json`);
  assert.equal(cell.endReason, 'COACHING_REQUESTED'); assert.ok(cell.studentUtterances[1].question);
  const out = `${dir}/review`, review = buildReview({ dir, out, seed: 'fixed-test-seed' }), groups = review.packets;
  assert.equal(groups.length, 5); assert.equal(groups.reduce((n, g) => n + g.cells, 0), 183); assert.deepEqual(review.skipped, []);
  assert.deepEqual(buildReview({ dir, out }), review);
  for (const name of readdirSync(out).filter(n => n.includes('packet'))) {
    const text = readFileSync(`${out}/${name}`, 'utf8');
    assert.doesNotMatch(text, /gpt-6|fake-model|replicate|model|"seed"|-r[123]/u);
    for (const row of JSON.parse(text)) {
      assert.equal(typeof row.studentRationale, 'string'); assert.equal(typeof row.coaching, 'string'); assert.ok(row.corrections.length >= 1);
    }
  }
  const keys = readdirSync(out).filter(n => n.includes('key')).map(n => read(`${out}/${n}`));
  assert.ok(keys.every(k => k.seed === 'fixed-test-seed'));
  assert.equal(keys.flatMap(k => Object.values(k.entries)).filter(e => e.model === 'gpt-6-luna').length, 57);
}));


test('REPAIR retains new errors and last coaching; malformed JSON retries within the shared bound', () => temporary(async dir => {
  const data = loadInputs(), variant = data.suite.variants.find(v => v.id === 'M4-H');
  assert.ok(variant);
  const transport = fakeTransport(({ a, input, calls }) => {
    if (calls === 1) return { ...response({}), output_text: '{' };
    a.newErrors = [{ errorId: 'new-error', description: '새로 드러난 오류예요.',
      studentEvidence: [a.reviewedResponse], sourceEvidence: input.initialErrors[0].sourceEvidence }];
    return response(a);
  });
  const result = await evaluateRepair(data, variant, 1, createLedger(`${dir}/requests.jsonl`, 'repair', transport));
  assert.equal(result.status, 'VALID', result.error); assert.equal(transport.calls.length, 2);
  assert.equal(result.after.additionalErrors.length, 1); assert.equal(result.after.additionalErrors[0].status, 'REMAINING');
  assert.equal(result.after.phase, 'COMPLETED'); assert.equal(result.endReason, 'REPAIR_FAILED');
  assert.equal(result.requests[0].response.output_text, '{');
  assert.equal(result.coaching, result.lastRepairAssessment.coaching);
  assert.equal(result.turns[0].call.metadata.attempts[0].outcome, 'ERROR');
}));

test('coaching instructions match the handoff verbatim', () => {
  const handoff = readFileSync('docs/handoffs/2026-10-10-v5-repair-test.md', 'utf8');
  const original = handoff.split('**종료 코칭 지시문 원문**')[1].split('```')[1].trim();
  assert.equal(COACHING_INSTRUCTIONS, original);
});
