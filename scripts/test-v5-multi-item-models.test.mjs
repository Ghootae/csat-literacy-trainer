import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, checksFor, usageCosts, MODELS } from './test-v5-multi-item-models.mjs';
import { main as buildReview } from './build-v5-multi-item-review.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const temporary = async fn => {
  const dir = mkdtempSync(join(tmpdir(), 'v5-multi-item-'));
  try { return await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
// Fail closed if a test ever misses its injected transport.
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('External request forbidden in tests'); };
test.after(() => { globalThis.fetch = originalFetch; });
const response = a => ({ id: 'fake-response', model: 'fake-model-version', status: 'completed', output_text: JSON.stringify(a),
  usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 30 }, output_tokens_details: { reasoning_tokens: 5 } } });
function fakeTransport(cases, hook = () => {}) {
  const calls = [];
  return { calls, async create(request, options) {
    calls.push(structuredClone(request));
    assert.deepEqual(request.reasoning, { effort: 'medium' });
    assert.equal(request.max_output_tokens, 8000); assert.equal(options.timeout, 90000); assert.equal(options.maxRetries, 0);
    const input = JSON.parse(request.input[0].content[0].text), kind = request.text.format.name;
    if (kind === 'problem_feedback_v4_conclusion_audit') {
      assert.ok(!request.text.format.schema.properties.studentClaims);
      const text = input.studentResponses[0].text, c = cases.find(c => c.rationale === text);
      return response({ rationaleImpliedVerdict: c.expected.verdict, studentEvidence: [{ observationId: 'o1', quote: text }], reason: '독립 확인' });
    }
    if (kind === 'problem_feedback_v4_coaching') {
      assert.ok(!request.text.format.schema.properties.studentClaims);
      return response({ coaching: '선지와 원문의 관계를 다시 살펴봅시다.' });
    }
    assert.equal(kind, 'problem_feedback_v4_assessment');
    assert.ok(request.text.format.schema.required.includes('studentClaims'));
    const quote = input.observations[0].command.rationale.text, c = cases.find(c => c.rationale === quote), e = c.expected;
    const sourceQuote = input.source.passage[0]?.text ?? input.source.passage;
    const studentEvidence = [{ observationId: 'o1', quote }];
    const sourceEvidence = [{ location: 'PASSAGE', quote: sourceQuote, mediaId: null, visualObservation: null }];
    const contentAssessment = e.content.includes('ERROR') && e.content.length === 1 ? 'ERROR' : e.content[0];
    const a = { mode: 'SELECTION', boundary: 'NONE', reason: '학생 발화를 대조했다.', reconstructability: e.gate,
      reconstructedPath: e.gate === 'UNKNOWN' ? [] : [quote], rationaleImpliedVerdict: e.verdict, contentAssessment,
      studentEvidence, sourceEvidence,
      errors: contentAssessment === 'ERROR' ? Array.from({ length: e.minErrors ?? 1 }, (_, i) => ({
        errorId: `content-error-${i + 1}`, description: `원문의 관계 ${i + 1}과 다릅니다.`, studentEvidence, sourceEvidence,
        question: `원문에서 관계 ${i + 1}을 어떻게 설명하나요?`,
      })) : [],
      selectionMismatchQuestion: e.consistency === 'MISMATCH' ? '선지에 대한 판단과 선택을 어떻게 연결했나요?' : null,
      coaching: '선지와 원문의 관계를 다시 살펴봅시다.',
      studentClaims: [{ observationId: 'o1', quote, claimAsStated: quote, sourceCheck: contentAssessment === 'ERROR' ? 'CONTRADICTED' : 'CONSISTENT', sourceBasis: '원문 대조' }] };
    const override = await hook({ a, c, request, calls: calls.length });
    return override ?? response(a);
  } };
}
async function setup(dir, model = 'gpt-6-luna') {
  await main({ dir });
  const cases = read(`${dir}/cases.json`), transport = fakeTransport(cases);
  const preflight = await main({ dir, mode: 'preflight', model, transport });
  assert.equal(preflight.operatingValidationPassed, true, preflight.cell.error);
  return { cases, transport, preflight };
}

test('prepare freezes 30 unchanged cases, five current sources, images, schema and rotation without requests', () => temporary(async dir => {
  const transport = { create() { assert.fail('prepare sent request'); } };
  const first = await main({ dir, transport }), second = await main({ dir, transport });
  assert.deepEqual(first, second); assert.equal(first.externalRequests, 0); assert.equal(first.cellsPerModel, 90);
  const cases = read(`${dir}/cases.json`), old = read('docs/experiments/problem-feedback-v4-hardening-2026-10-01/cases.json');
  assert.equal(cases.length, 30);
  for (const [i, c] of old.cases.entries()) for (const k of ['id', 'questionId', 'choiceId', 'rationale', 'expected', 'basis']) assert.deepEqual(cases[i][k], c[k]);
  const frozen = read(`${dir}/FROZEN.json`);
  assert.equal(frozen.schedule[30].id, cases[1].id); assert.equal(frozen.schedule[60].id, cases[2].id);
  assert.equal(Object.keys(frozen.sourceDiffVsHardening).length, 4);
  assert.equal(Object.keys(read(`${dir}/sources.json`)).length, 5);
  const questionId = 'mrna-vaccine-lipid-nanoparticle-q19';
  const source = read(`${dir}/sources.json`)[questionId];
  const product = read(`packages/pipeline/fixtures/experiments/problem-solving/public/${questionId}.json`);
  assert.equal(typeof product.media[0].alt, 'string');
  assert.deepEqual(source.media, product.media.map(({ alt, ...media }) => media));
  assert.equal(Object.hasOwn(source.media[0], 'alt'), false);
  for (const name of ['cases.json', 'sources.json', 'prompts.json', 'FROZEN.json']) {
    const original = readFileSync(`${dir}/${name}`);
    writeFileSync(`${dir}/${name}`, '{}\n');
    await assert.rejects(main({ dir, mode: 'run', model: 'gpt-6-luna', transport }), /Frozen artifact changed/);
    writeFileSync(`${dir}/${name}`, original);
  }
  await assert.rejects(main({ dir, mode: 'run', model: 'gpt-5.6-terra', transport }), /Unknown model/);
  await assert.rejects(main({ dir, mode: 'run', model: 'gpt-6-luna', transport }), /Run preflight first/);
}));

for (const model of Object.keys(MODELS)) test(`${model}: preflight image, 90 cells, M5/M6, ledger and no-request resume`, () => temporary(async dir => {
  const { transport, preflight } = await setup(dir, model);
  assert.equal(preflight.requests, 1); assert.equal(preflight.hasInputImage, true);
  assert.deepEqual(preflight.usage, response({}).usage);
  const frozenSource = read(`${dir}/sources.json`)['mrna-vaccine-lipid-nanoparticle-q19'];
  const sourceInput = JSON.parse(transport.calls[0].input[0].content[0].text).source;
  assert.equal(Object.hasOwn(sourceInput.media[0], 'alt'), false);
  assert.deepEqual(transport.calls[0].input[0].content.filter(x => x.type === 'input_image'),
    [{ type: 'input_image', image_url: frozenSource.media[0].url, detail: 'high' }]);
  await assert.rejects(main({ dir, mode: 'preflight', model, transport }), /Preflight already exists/);
  const summary = await main({ dir, mode: 'run', model, transport });
  assert.equal(summary.completedCells, 90); assert.equal(summary.evaluationErrors, 0);
  assert.equal(summary.stop, null); assert.equal(summary.expectedMatch, 90);
  assert.deepEqual(summary.actualModels, ['fake-model-version']);
  assert.equal(summary.tokens.input, summary.requests * 100);
  assert.equal(summary.tokens.cached, summary.requests * 30);
  assert.ok(summary.requestDurationMs.p90 >= summary.requestDurationMs.median);
  const m5 = read(`${dir}/${model}/M5-r1.json`), m6 = read(`${dir}/${model}/M6-r1.json`);
  assert.equal(m5.after.phase, 'COMPLETED'); assert.equal(m5.after.result.outcome, 'UNVERIFIED_CORRECT');
  assert.equal(m6.after.phase, 'AWAITING_CORRECTION'); assert.equal(m6.conclusionAuditExecuted, true);
  assert.deepEqual(m6.after.errors.map(e => e.kind), ['SELECTION_EXECUTION']);
  assert.ok(m6.studentClaims.length); assert.equal(m6.call.rawOutput.studentClaims, undefined);
  const resumed = await main({ dir, mode: 'run', model, transport: { create() { assert.fail('resume request'); } } });
  assert.equal(resumed.newRequests, 0);
  appendFileSync(`${dir}/${model}/requests.jsonl`, JSON.stringify({ event: 'START', requestId: 'unfinished', reservedUsd: 0.1 }) + '\n');
  await assert.rejects(main({ dir, mode: 'run', model, transport }), /START without END/);
}));

test('expectation checks enforce each field, allowed content alternatives and minimum error count', () => temporary(async dir => {
  await setup(dir); const cases = read(`${dir}/cases.json`);
  const f = cases.find(c => c.id === 'M2');
  const raw = { reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'INVALID', contentAssessment: 'ERROR' };
  const after = { phase: 'AWAITING_CORRECTION', result: null, errors: [{ kind: 'CONTENT' }], selectionComparisons: [{ selectionRationaleConsistency: 'CONSISTENT' }] };
  assert.equal(checksFor(f, after, raw).passed, true);
  const bad = checksFor(f, { ...after, phase: 'COMPLETED', errors: [], selectionComparisons: [] },
    { ...raw, reconstructability: 'UNKNOWN', rationaleImpliedVerdict: 'VALID', contentAssessment: 'SUPPORTED' });
  assert.deepEqual(bad.failures.map(x => x.name).sort(), ['gate', 'verdict', 'consistency', 'phase', 'content', 'errorKinds', 'minErrors'].sort());
  const m5 = cases.find(c => c.id === 'M5');
  for (const contentAssessment of ['UNKNOWN', 'INSUFFICIENT']) assert.equal(checksFor(m5,
    { phase: 'COMPLETED', result: { outcome: 'UNVERIFIED_CORRECT' }, errors: [], selectionComparisons: [{ selectionRationaleConsistency: 'UNKNOWN' }] },
    { reconstructability: 'UNKNOWN', rationaleImpliedVerdict: 'UNKNOWN', contentAssessment }).passed, true);
  assert.equal(checksFor(m5, after, raw).failures.some(f => f.name === 'outcome'), true);
}));

test('format retries, claim validation, coaching retry and HTTP 400 refusal use fake requests only', () => temporary(async dir => {
  const { cases } = await setup(dir); const seen = {};
  const transport = fakeTransport(cases, ({ a, c }) => {
    seen[c.id] = (seen[c.id] ?? 0) + 1;
    if (seen[c.id] !== 1) return;
    if (c.id === 'I1') return { ...response(a), output_text: '{invalid' };
    if (c.id === 'I2') delete a.reason;
    if (c.id === 'I3') a.studentClaims[0].quote = '발화에 없는 인용';
    if (c.id === 'C4') a.coaching = 'JSON Schema에 맞춰 답한다';
    if (c.id === 'S2') throw Object.assign(new Error('fake policy refusal'), { status: 400 });
  });
  const summary = await main({ dir, mode: 'run', model: 'gpt-6-luna', transport });
  assert.equal(summary.completedCells, 90); assert.equal(summary.policyRefusals, 1); assert.equal(summary.evaluationErrors, 0);
  assert.deepEqual(summary.formatErrors, { JSON_PARSE: 1, OPERATING_SCHEMA: 1, CLAIMS_CONTRACT: 1 });
  const refused = read(`${dir}/gpt-6-luna/S2-r1.json`);
  assert.equal(refused.status, 'POLICY_REFUSAL'); assert.equal(refused.requests.length, 1); assert.equal(refused.retryCount, 0);
  assert.equal(seen.S2, 3); // One request per scheduled replicate, no refusal retry.
  const ledger = readFileSync(`${dir}/gpt-6-luna/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ledger.filter(x => x.event === 'ERROR').length, 1); assert.ok(summary.unknownReservedUsd > 0);
  assert.ok(transport.calls.some(r => r.text.format.name === 'problem_feedback_v4_coaching'));
}));

for (const reason of ['requests', 'cost']) test(`${reason} cap stops before transport and does not save a cell`, () => temporary(async dir => {
  await setup(dir);
  const entries = Array.from({ length: reason === 'requests' ? 130 : 1 }, (_, i) => [
    { event: 'START', requestId: String(i), reservedUsd: 0.1 },
    { event: 'END', requestId: String(i), durationMs: 1, costs: { conservativeUsd: reason === 'cost' ? 1.5 : 0 } },
  ]).flat();
  writeFileSync(`${dir}/gpt-6-luna/requests.jsonl`, entries.map(JSON.stringify).join('\n') + '\n');
  const result = await main({ dir, mode: 'run', model: 'gpt-6-luna', transport: { create() { assert.fail('cap allowed request'); } } });
  assert.equal(result.newRequests, 0); assert.match(result.stop, /RUN_LIMIT/); assert.equal(result.completedCells, 0);
  assert.equal(existsSync(`${dir}/gpt-6-luna/I1-r1.json`), false);
}));

test('failed preflight sends only once, stores raw usage, and blocks run', () => temporary(async dir => {
  await main({ dir }); let calls = 0;
  const result = await main({ dir, mode: 'preflight', model: 'gpt-6-luna', transport: { async create() { calls++; return response({}); } } });
  assert.equal(calls, 1); assert.equal(result.operatingValidationPassed, false); assert.deepEqual(result.usage, response({}).usage);
  await assert.rejects(main({ dir, mode: 'run', model: 'gpt-6-luna', transport: { create() { assert.fail(); } } }), /Preflight failed/);
}));

test('cached input is billed conservatively at the supplied full input rate', () => {
  assert.deepEqual(usageCosts({ input_tokens: 1e6, output_tokens: 1e6, input_tokens_details: { cached_tokens: 500000 } }, 'gpt-6-luna'),
    { conservativeUsd: 0.6, cachedTokens: 500000 });
  assert.equal(usageCosts({ input_tokens: 1e6, output_tokens: 1e6 }, 'gpt-6.1-sol').conservativeUsd, 12);
  assert.equal(usageCosts(null, 'gpt-6-luna'), null);
});

test('review creates ten stable disjoint blind packets with full coaching and error-only failed cells', () => temporary(async dir => {
  for (const model of Object.keys(MODELS)) {
    const { transport } = await setup(dir, model);
    await main({ dir, mode: 'run', model, transport });
  }
  const path = `${dir}/gpt-6-luna/I1-r1.json`, cell = read(path);
  cell.call.rawOutput.coaching = '전체 코칭 문장. '.repeat(1000); writeFileSync(path, JSON.stringify(cell));
  const failedPath = `${dir}/gpt-6-luna/I2-r1.json`, failed = read(failedPath);
  failed.status = 'POLICY_REFUSAL'; failed.error = 'fake refusal'; writeFileSync(failedPath, JSON.stringify(failed));
  const out = `${dir}/review`, groups = buildReview({ dir, out });
  assert.equal(groups.length, 10); assert.equal(groups.reduce((n, g) => n + g.cells, 0), 180);
  const allIds = [], snapshots = [];
  for (const g of groups) {
    const packetPath = `${out}/REVIEW-blind-packet-${g.prefix}.json`, packet = read(packetPath);
    snapshots.push(readFileSync(packetPath, 'utf8'));
    const key = read(`${out}/REVIEW-blind-key-${g.prefix}.json`);
    assert.equal(packet.length, 18); assert.equal(Object.keys(key).length, 18);
    for (const item of packet) {
      allIds.push(item.id); assert.ok(!Object.hasOwn(item, 'model')); assert.ok(!Object.hasOwn(item, 'replicate'));
      if (key[item.id] === 'gpt-6-luna:I1-r1') assert.equal(item.coaching, cell.call.rawOutput.coaching);
      if (key[item.id] === 'gpt-6-luna:I2-r1') assert.deepEqual(Object.keys(item).sort(), ['error', 'id', 'status']);
    }
  }
  assert.equal(new Set(allIds).size, 180);
  buildReview({ dir, out });
  assert.deepEqual(groups.map(g => readFileSync(`${out}/REVIEW-blind-packet-${g.prefix}.json`, 'utf8')), snapshots);
}));
