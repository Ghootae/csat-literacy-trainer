import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runPipeline, adopt, judgePayload, GENERATION_INSTRUCTION, REDERIVATION_INSTRUCTION, COMPARISON_INSTRUCTION, comparisonProblems, GENERATION_SCHEMA, COMPARISON_SCHEMA } from './marker-gloss-pipeline-v2.mjs';

const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const QID = 'gongsun-long-later-mohists-q12';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const source = read(`${FIX}/public/${QID}.json`);
const key = read(`${FIX}/${QID}.json`);
const ctx = createContext({ source, answerKey: { answerChoiceId: key.answerChoiceId, stemPolarity: key.stemPolarity }, officialExplanation: '해설', questionId: QID });
const approved = read(`${FIX}/marker-glosses/${QID}.json`);
const goodGen = { markers: approved.markers.map((m) => ({ marker: m.marker, location: m.location, name: m.name, referentHere: m.referentHere,
  instances: [], speaker: m.speaker, operator: m.operator, sourceBasis: m.sourceBasis, keyForcedOnly: false })),
choiceReadings: approved.choiceReadings.map((r) => ({ choiceId: r.choiceId, level: r.level, reading: r.reading, choiceAppropriateUnderGloss: r.choiceAppropriateUnderGloss })) };
const red = { markers: goodGen.markers.map((m) => ({ marker: m.marker, referentHere: m.referentHere, speaker: m.speaker, sourceBasis: m.sourceBasis })) };
const cmp = (bad = [], markers = goodGen.markers) => ({ markers: markers.map((m) => ({ marker: m.marker,
  referent: { verdict: bad.includes(m.marker) ? 'DIFFERENT' : 'SAME', differenceType: bad.includes(m.marker) ? 'SCOPE_CHANGE' : 'NONE', reason: '대조 이유 비공개' },
  speaker: { verdict: 'SAME', reason: '화자' },
  instances: m.instances.map((_, i) => ({ instanceId: `${m.marker}-i${i + 1}`, verdict: 'VALID', kind: 'ENTITY_IN_SOURCE', reason: '사례' })),
  sourceSupports: bad.includes(m.marker) ? 'B' : 'BOTH', sourceBasis: [],
})) });
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
  assert.deepEqual(s.calls[3].input.previousRoundFeedback, { disagreedMarkers: ['ⓐ'], note: '이 기호들은 독립 확인과 대상 또는 화자가 어긋났다. 어느 쪽이 맞는지는 정해지지 않았다.' });
  assert.equal(JSON.stringify(s.calls[3].input).includes('대조 이유 비공개'), false);
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

const withInstances = () => {
  const g = structuredClone(goodGen);
  g.markers[0].instances = [{ text: '사례 하나', sourceBasis: [g.markers[0].sourceBasis[0]] }, { text: '사례 둘', sourceBasis: [g.markers[0].sourceBasis[0]] }];
  return g;
};

test('comparison contract rejects missing/duplicate/foreign markers and instance IDs, contradictory verdicts', () => {
  const g = withInstances(), input = ctx.comparisonInput(g.markers, red.markers);
  assert.deepEqual(comparisonProblems(cmp([], g.markers), input), []);
  for (const corrupt of [
    (x) => { x.markers.pop(); },
    (x) => { x.markers[1].marker = x.markers[0].marker; },
    (x) => { x.markers[0].marker = 'ⓩ'; },
    (x) => { x.markers[0].referent.differenceType = 'SCOPE_CHANGE'; },
    (x) => { x.markers[0].referent.verdict = 'DIFFERENT'; },
    (x) => { x.markers[0].instances.pop(); },
    (x) => { x.markers[0].instances[1].instanceId = x.markers[0].instances[0].instanceId; },
    (x) => { x.markers[0].instances[0].instanceId = 'ⓑ-i1'; },
    (x) => { x.markers[0].instances[0].kind = 'SUBCATEGORY'; },
    (x) => { x.markers[0].instances[0].verdict = 'INVALID'; },
  ]) { const c = cmp([], g.markers); corrupt(c); assert.ok(comparisonProblems(c, input).length); }
  const omitted = cmp([], g.markers); omitted.markers[0].referent.differenceType = 'OMITTED_DETAIL';
  assert.deepEqual(comparisonProblems(omitted, input), []);
});

test('invalid instance alone keeps AGREE, removes only invalid instance and preserves audit', async () => {
  const g = withInstances(), c = cmp([], g.markers);
  c.markers[0].instances[0] = { instanceId: 'ⓐ-i1', verdict: 'INVALID', kind: 'SUBCATEGORY', reason: '구체 개체 아님' };
  const s = scripted([() => ({ ok: true, value: g }), () => ({ ok: true, value: red }), () => ({ ok: true, value: c })]);
  const result = await runPipeline(ctx, s.call, 'instances');
  assert.equal(result.status, 'ALL_AGREED'); assert.equal(s.calls.length, 3);
  assert.deepEqual(result.gloss.markers[0].instances, [g.markers[0].instances[1]]);
  assert.deepEqual(result.removedInstances, [{ marker: 'ⓐ', instanceId: 'ⓐ-i1', text: '사례 하나', kind: 'SUBCATEGORY', reason: '구체 개체 아님' }]);
  assert.deepEqual(result.rounds[0].markerJudgments['ⓐ'], { agree: true, referent: c.markers[0].referent, speaker: c.markers[0].speaker, sourceSupports: 'BOTH' });
  assert.equal(g.markers[0].instances.length, 2, 'original generation retained');
});

test('judgePayload joins instances exactly and excludes every forbidden key', () => {
  const g = withInstances(), assembled = ctx.assemble(g), payload = judgePayload(assembled);
  assert.equal(payload.markers[0].referentHere, `${g.markers[0].referentHere} (그 범위에 드는 원문 속 사례: 사례 하나, 사례 둘)`);
  assert.equal(payload.markers[1].referentHere, g.markers[1].referentHere);
  assert.deepEqual(Object.keys(payload), ['markers']);
  for (const m of payload.markers) assert.deepEqual(Object.keys(m), ['marker', 'location', 'markedText', 'name', 'referentHere', 'speaker', 'operator', 'sourceBasis']);
  assert.equal(judgePayload(null), null);
});

test('instance source quotes use location, reject empty text/basis, and repair whitespace only', () => {
  const g = withInstances();
  g.markers[0].instances[0].sourceBasis = ['원문에 없는 문장'];
  assert.ok(ctx.structureCheck(g).problems.includes('INSTANCE_BASIS_NOT_IN_SOURCE:ⓐ'));
  g.markers[0].instances[0] = { text: ' ', sourceBasis: [] };
  assert.ok(ctx.structureCheck(g).problems.includes('INSTANCE_TEXT_EMPTY:ⓐ'));
  assert.equal(GENERATION_SCHEMA.safeParse(g).success, false);
  const repairable = withInstances();
  const q = repairable.markers[0].sourceBasis[0];
  assert.ok(q.includes(' '));
  repairable.markers[0].instances[0].sourceBasis = [q.replaceAll(' ', '  ')];
  const { out, changes } = ctx.repairQuotes(repairable);
  assert.equal(out.markers[0].instances[0].sourceBasis[0], q);
  assert.ok(changes.some((c) => c.instanceId === 'ⓐ-i1'));
  assert.deepEqual(ctx.structureCheck(out).problems, []);
  assert.equal(out.markers[0].instances[0].text, '사례 하나');
});

test('strict schemas reject unexpected fields', () => {
  const g = structuredClone(goodGen); g.markers[0].extra = true;
  assert.equal(GENERATION_SCHEMA.safeParse(g).success, false);
  const c = cmp(); c.markers[0].referent.extra = true;
  assert.equal(COMPARISON_SCHEMA.safeParse(c).success, false);
});

test('comparison contract failure fails round and never adopts its markers', async () => {
  const bad = cmp(); bad.markers[0].referent.differenceType = 'SCOPE_CHANGE';
  const result = await runPipeline(ctx, async (kind) => ({ ok: true, value: kind === 'GENERATE' ? goodGen : kind === 'REDERIVE' ? red : bad }), 'bad');
  assert.equal(result.status, 'NONE_AGREED'); assert.equal(result.gloss, null);
  assert.equal(result.rounds.length, 3);
  assert.ok(result.rounds.every((r) => r.comparison.contractFailure.length));
});

test('speaker disagreement alone regenerates and sourceSupports does not select a winner', async () => {
  let comparisons = 0;
  const result = await runPipeline(ctx, async (kind) => {
    if (kind === 'GENERATE') return { ok: true, value: goodGen };
    if (kind === 'REDERIVE') return { ok: true, value: red };
    const c = cmp(); comparisons += 1;
    c.markers[0].speaker.verdict = 'DIFFERENT'; c.markers[0].sourceSupports = comparisons === 1 ? 'B' : 'A';
    return { ok: true, value: c };
  }, 'speaker');
  assert.equal(result.status, 'PARTIAL'); assert.equal(result.adoptedRound, 1);
  assert.deepEqual(result.droppedMarkers, ['ⓐ']);
});
