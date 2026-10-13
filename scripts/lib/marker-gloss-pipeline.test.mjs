import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runPipeline, adopt, judgePayload, GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION } from './marker-gloss-pipeline.mjs';

const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const QID = 'gongsun-long-later-mohists-q12';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const source = read(`${FIX}/public/${QID}.json`);
const key = read(`${FIX}/${QID}.json`);
const ctx = createContext({ source, answerKey: { answerChoiceId: key.answerChoiceId, stemPolarity: key.stemPolarity }, officialExplanation: '해설', questionId: QID });
const approved = read(`${FIX}/marker-glosses/${QID}.json`);
const goodGen = { markers: approved.markers.map((m) => ({ marker: m.marker, location: m.location, name: m.name, referentHere: m.referentHere,
  speaker: m.speaker, operator: m.operator, sourceBasis: m.sourceBasis, keyForcedOnly: false })),
choiceReadings: approved.choiceReadings.map((r) => ({ choiceId: r.choiceId, level: r.level, reading: r.reading, choiceAppropriateUnderGloss: r.choiceAppropriateUnderGloss })) };
const red = { markers: goodGen.markers.map((m) => ({ marker: m.marker, referentHere: m.referentHere, speaker: m.speaker, sourceBasis: m.sourceBasis })) };
const cmp = (bad = []) => ({ markers: ctx.targets.map((m) => ({ marker: m, verdict: bad.includes(m) ? 'DISAGREE' : 'AGREE',
  issue: bad.includes(m) ? 'DIFFERENT_REFERENT' : 'NONE', reason: 'r', sourceBasis: [] })) });
const scripted = (seq) => { const calls = []; return { calls, call: async (kind, label, _i, input) => { calls.push({ kind, label, input }); return seq.shift()(kind); } }; };

test('instructions carry no item content', () => {
  for (const t of [GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION]) assert.doesNotMatch(t, /빨간|옷|공손룡|묵가|명실|흰 말/u);
});

test('approved gloss passes code check; payload excludes choiceReadings', () => {
  assert.deepEqual(ctx.structureCheck(goodGen).problems, []);
  const p = judgePayload(ctx.structureCheck(goodGen).assembled);
  assert.deepEqual(Object.keys(p.markers[0]), ['marker', 'location', 'markedText', 'name', 'referentHere', 'speaker', 'operator', 'sourceBasis']);
  assert.equal(JSON.stringify(p).includes('choiceAppropriateUnderGloss'), false);
});

test('all agree in round 1 adopts full gloss with 3 calls', async () => {
  const s = scripted([() => ({ ok: true, value: goodGen }), () => ({ ok: true, value: red }), () => ({ ok: true, value: cmp() })]);
  const res = await runPipeline(ctx, s.call, 't');
  assert.equal(res.status, 'ALL_AGREED'); assert.equal(res.gloss.markers.length, 5); assert.equal(s.calls.length, 3);
  assert.equal(s.calls[1].input.glossA, undefined, 'rederivation must not see the generated gloss');
});

test('persistent disagreement drops only that marker; regeneration gets neutral feedback', async () => {
  const seq = []; for (let i = 0; i < 3; i += 1) seq.push(() => ({ ok: true, value: goodGen }), () => ({ ok: true, value: red }), () => ({ ok: true, value: cmp(['ⓐ']) }));
  const s = scripted(seq);
  const res = await runPipeline(ctx, s.call, 't');
  assert.equal(res.status, 'PARTIAL'); assert.deepEqual(res.droppedMarkers, ['ⓐ']); assert.equal(res.gloss.markers.length, 4); assert.equal(s.calls.length, 9);
  assert.deepEqual(s.calls[3].input.previousRoundFeedback.disagreedMarkers, ['ⓐ']);
  assert.equal(JSON.stringify(s.calls[3].input).includes('independentB'), false, 'generator must not receive the independent reading');
});

test('three code failures give no gloss and no rederivation calls', async () => {
  const broken = structuredClone(goodGen); broken.markers[0].sourceBasis = ['원문에 없는 문장'];
  const s = scripted([0, 1, 2].map(() => () => ({ ok: true, value: broken })));
  const res = await runPipeline(ctx, s.call, 't');
  assert.equal(res.status, 'GENERATION_FAILED'); assert.equal(res.gloss, null); assert.equal(s.calls.length, 3);
  assert.ok(s.calls[1].input.previousRoundFeedback.codeProblems.some((p) => p.startsWith('BASIS_NOT_IN_SOURCE')));
});

test('adopt prefers more agreement, earlier on ties', () => {
  const passed = (round, agreement) => ({ round, generation: { codeProblems: [], assembled: ctx.structureCheck(goodGen).assembled }, agreement });
  const a = { 'ⓐ': 'AGREE', 'ⓑ': 'AGREE', 'ⓒ': 'AGREE', 'ⓓ': 'DISAGREE', 'ⓔ': 'DISAGREE' };
  const b = { 'ⓐ': 'AGREE', 'ⓑ': 'AGREE', 'ⓒ': 'AGREE', 'ⓓ': 'AGREE', 'ⓔ': 'DISAGREE' };
  assert.equal(adopt([passed(1, a), passed(2, b), passed(3, b)]).adoptedRound, 2);
});
