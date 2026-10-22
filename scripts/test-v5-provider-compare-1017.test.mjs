import { test, mock, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, CONFIGS } from './test-v5-provider-compare-1017.mjs';
import { buildReview } from './build-v5-provider-compare-1017-review.mjs';

const INPUT = 'docs/experiments/v5-provider-compare-gongsun-2026-10-07';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const responses = read(`${INPUT}/FROZEN.json`).responses;
const SCENARIO = { S1: 'SUPPORTED', S2: 'INSUFFICIENT', S3: 'ERROR', S4: 'FAIL' };
const scenarioOf = text => SCENARIO[Object.keys(responses).find(k => responses[k] === text)] ?? 'SUPPORTED';
const tmp = () => mkdtempSync(join(tmpdir(), 'pc1017-'));

// Fixed-response transport: the reply depends on the student response (SELECTION) or the request kind (END_EXPLANATION).
function fakeTransport() {
  const calls = [];
  return { calls, async create(request) {
    const kind = request.text.format.name;
    calls.push(kind);
    const usage = { input_tokens: 1000, output_tokens: 500, input_tokens_details: { cached_tokens: 0 } };
    if (kind === 'problem_feedback_v4_end_explanation') {
      return { status: 'completed', model: 'fake', usage, output_text: JSON.stringify({ firstChoice: '처음 고른 선택을 설명해 줄게.', reselection: null, answer: '정답이 되는 이유를 설명해 줄게.' }) };
    }
    const input = JSON.parse(request.input[0].content[0].text), o = input.observations[0], text = o.command.rationale.text;
    const scenario = scenarioOf(text);
    if (scenario === 'FAIL') throw new Error('boom');
    const [q1, q2] = [text.slice(0, 10), text.slice(-10)], ref = { observationId: o.observationId };
    const base = { mode: 'SELECTION', boundary: 'NONE', reason: '사유', reconstructability: 'RECONSTRUCTABLE', reconstructedPath: ['경로'],
      rationaleImpliedVerdict: input.targetVerdict, contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE',
      studentEvidence: [{ ...ref, quote: q1 }], sourceEvidence: [{ location: 'PASSAGE', quote: input.source.passage.slice(0, 30), mediaId: null, visualObservation: null }],
      errors: [], errorHypothesis: null, selectionMismatchQuestion: null, coaching: '한국어로 쓴 코칭 설명이야.',
      studentClaims: [{ ...ref, quote: q1, claimAsStated: '주장', sourceCheck: 'CONSISTENT', sourceBasis: '근거' }], claimConflicts: [],
      keyRelationCoverage: [{ element: 'a', covered: true, ...ref, quote: q1 }, { element: 'b', covered: true, ...ref, quote: q2 }] };
    const out = scenario === 'INSUFFICIENT' ? { ...base, contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'MISSING_LINK',
      keyRelationCoverage: [{ element: 'a', covered: true, ...ref, quote: q1 }, { element: 'b', covered: false, observationId: '', quote: '' }] }
      : scenario === 'ERROR' ? { ...base, contentAssessment: 'ERROR', studentClaims: [{ ...base.studentClaims[0], sourceCheck: 'CONTRADICTED' }],
        errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '대응 오류', studentEvidence: [{ ...ref, quote: q1 }],
          sourceEvidence: base.sourceEvidence, question: '그 부분을 원문에서 다시 볼래?', basis: 'STATED' }] }
        : base;
    return { status: 'completed', model: 'fake', usage, output_text: JSON.stringify(out) };
  } };
}

let runDir;
before(async () => {
  mock.method(console, 'log', () => {});
  runDir = tmp();
  await main({ mode: 'prepare', dir: runDir });
});

test('prepare writes FROZEN.json with zero external requests and is idempotent', async () => {
  assert.ok(existsSync(`${runDir}/FROZEN.json`));
  const again = await main({ mode: 'prepare', dir: runDir });
  assert.equal(again.externalRequests, 0); assert.equal(again.cellsPerConfig, 33);
});

test('prepare self test fails when an input hash differs', async () => {
  const input = tmp();
  for (const f of ['FROZEN.json', 'source.json', 'cases.json']) cpSync(`${INPUT}/${f}`, `${input}/${f}`);
  const source = read(`${input}/source.json`); source.stem += ' ';
  writeFileSync(`${input}/source.json`, JSON.stringify(source));
  await assert.rejects(main({ mode: 'prepare', dir: tmp(), inputDir: input }), /sourceHash changed/);
});

test('run: supported, end explanation, correction and evaluation-error cells; summary over five configs', async () => {
  for (const name of Object.keys(CONFIGS)) await main({ mode: 'run', config: name, dir: runDir, transport: fakeTransport() });
  const cell = f => read(`${runDir}/gpt-6-luna-medium/${f}.json`);
  const s1 = cell('S1-r1'), s2 = cell('S2-r1'), s3 = cell('S3-r1'), s4 = cell('S4-r1');
  assert.equal(s1.status, 'VALID'); assert.equal(s1.after.phase, 'COMPLETED'); assert.equal(s1.endExplanation, null); assert.equal(s1.endExplanationMs, null);
  assert.equal(s1.checks.path, true); assert.ok(s1.assessmentRaw.studentClaims.length);
  assert.equal(s2.status, 'VALID'); assert.equal(s2.after.phase, 'AWAITING_UNDERSTANDING'); assert.equal(s2.after.pendingEnd.endReason, 'CORRECT_UNVERIFIED');
  assert.equal(s2.endExplanation.reselection, null); assert.ok(s2.endExplanationMs >= 0); assert.equal(s2.requests.filter(r => r.event === 'START').length, 2);
  assert.equal(s3.after.phase, 'AWAITING_CORRECTION'); assert.equal(s3.checks.path, true); assert.equal(s3.after.errors[0].question, '그 부분을 원문에서 다시 볼래?');
  assert.equal(s4.status, 'EVALUATION_ERROR'); assert.equal(s4.errorStage, 'SELECTION'); assert.equal(s4.retryCount, 1); assert.equal(s4.expectedMatch, false);
  const results = read(`${runDir}/gpt-6-luna-medium/RESULTS.json`);
  assert.equal(results.completedCells, 33); assert.equal(results.evaluationErrors, 3);
  assert.equal(results.tokens.input, (results.requests - 6) * 1000); // the 3 S4 cells fail twice each, without usage assert.ok(results.conservativeUsd > 0);
  const summary = await main({ mode: 'summary', dir: runDir });
  assert.deepEqual(Object.keys(summary), Object.keys(CONFIGS));
  assert.match(readFileSync(`${runDir}/SUMMARY.md`, 'utf8'), /gpt-6-luna-medium/); assert.ok(existsSync(`${runDir}/SUMMARY.json`));
});

test('run stops at the request limit and resumes without redoing completed cells', async () => {
  const dir = tmp(); await main({ mode: 'prepare', dir });
  const first = await main({ mode: 'run', config: 'deepseek-flash-low', dir, transport: fakeTransport(), limitOverride: { maxRequests: 2 } });
  assert.match(first.stop, /^RUN_LIMIT/); assert.ok(first.completedCells < 33); assert.equal(first.requests, 2);
  const transport = fakeTransport();
  const second = await main({ mode: 'run', config: 'deepseek-flash-low', dir, transport });
  assert.equal(second.stop, null); assert.equal(second.completedCells, 33);
  assert.equal(second.requests, first.requests + second.newRequests);
  assert.ok(transport.calls.length < second.requests, 'completed cells were not repeated');
  const capped = tmp(); await main({ mode: 'prepare', dir: capped });
  const usd = await main({ mode: 'run', config: 'gpt-6.1-sol-medium', dir: capped, transport: fakeTransport(), limitOverride: { usdCap: 0.0001 } });
  assert.match(usd.stop, /^RUN_LIMIT/); assert.equal(usd.requests, 0);
});

test('run refuses a changed FROZEN.json or a missing prepare', async () => {
  await assert.rejects(main({ mode: 'run', config: 'gpt-6-luna-medium', dir: tmp(), transport: fakeTransport() }), /Run prepare first/);
  const dir = tmp(); await main({ mode: 'prepare', dir });
  writeFileSync(`${dir}/FROZEN.json`, '{}\n');
  await assert.rejects(main({ mode: 'run', config: 'gpt-6-luna-medium', dir, transport: fakeTransport() }), /Frozen artifact changed/);
});

test('review packet hides configs, matches the key and is reproducible per seed', () => {
  const anchors = `${runDir}/anchors.json`;
  writeFileSync(anchors, JSON.stringify([`${runDir}/gpt-6-luna-medium/S1-r1.json`, `${runDir}/deepseek-flash-low/S2-r2.json`]));
  const configs = Object.keys(CONFIGS), a = buildReview({ dir: runDir, anchorsPath: anchors, configs });
  assert.equal(a.packet.length, 5 * 33 + 2); assert.equal(Object.keys(a.key).length, a.packet.length);
  assert.deepEqual(a.packet.map(p => p.id), Object.keys(a.key));
  const text = JSON.stringify(a.packet);
  for (const word of [...configs, 'deepseek', 'gemini', 'gpt-6', 'luna', 'fake', 'durationMs']) assert.ok(!text.includes(word), word);
  assert.equal(JSON.stringify(buildReview({ dir: runDir, anchorsPath: anchors, configs }).key), JSON.stringify(a.key));
  assert.notEqual(JSON.stringify(buildReview({ dir: runDir, anchorsPath: anchors, configs, seed: 'other' }).key), JSON.stringify(a.key));
  assert.ok(a.packet.some(p => p.endExplanation?.answer));
});
