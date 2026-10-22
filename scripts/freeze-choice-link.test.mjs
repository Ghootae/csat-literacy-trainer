import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectChoice, freezeKey, choiceViolations, summarizeFreeze, renderFreezeReport } from './freeze-choice-link.mjs';

const PARA = '근거 문장이다.';
const map = { propositions: [{ id: 'P1' }, { id: 'P2' }, { id: 'P3' }], nodes: [], relations: [] };
const part = (o = {}) => ({ quote: 'abc', source: 'PASSAGE', operation: 'RESTATE', twisted: false, twistTargetIds: [], supportIds: ['P1'], contextIds: [], inferenceBasisIds: [],
  twistType: null, twistDetail: '', evidenceQuote: '', choiceQuote: '', relationTypeChange: null, ...o });
const tw = (type, targets) => part({ twisted: true, twistType: type, twistDetail: 'd', evidenceQuote: PARA, choiceQuote: 'abc', twistTargetIds: targets, supportIds: [] });
const choice = (number, parts) => ({ number, readingGap: 'NONE', explanationAgreement: 'AGREE', note: '', parts });
const question = (choices, extraSegments = []) => ({ number: 10, stemPolarity: 'SELECT_INCORRECT', extraSegments, choices });
const out = (choices, extra) => ({ passageId: 'p', questions: [question(choices, extra)] });
const ctx = (truths = ['FALSE', 'TRUE']) => ({ passageId: 'p', map, paragraphs: [PARA],
  questions: [{ number: 10, stem: '적절하지 않은 것은?', supplementSegments: [{ id: 'S1', text: 'abcdef' }], choices: truths.map((truth, i) => ({ number: i + 1, text: 'abc', truth })) }] });
const val = (...bad) => ({ items: [{ violations: bad }] });
const runsOf = (...cs) => cs.map((c, i) => ({ k: i + 1, out: out([c]), validation: val() }));
const sel = (runs, truth = 'FALSE', override = null) => selectChoice({ runs, qn: 10, cn: 1, truth, override });

test('TYPE: most common set wins, ties go to earliest run', () => {
  const r = sel(runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])])));
  assert.equal(r.selected, 2); assert.equal(r.selection.decidedBy, 'FIRST'); assert.deepEqual(r.selection.candidatesAfter.TYPE, [2, 3]);
  const one = sel(runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])])));
  assert.equal(one.selected, 2); assert.equal(one.selection.decidedBy, 'FIRST');
  const single = sel(runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('NEGATION', ['P1'])])));
  assert.equal(single.selected, 1); assert.equal(single.selection.decidedBy, 'FIRST');
  const decided = sel(runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])])).map((x, i) => i === 2 ? { ...x, validation: val('q10#1: x') } : x));
  assert.equal(decided.selected, 2); assert.equal(decided.selection.decidedBy, 'VALID');
  const r2 = sel(runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('NEGATION', ['P1'])])));
  assert.deepEqual(r2.selection.candidatesAfter.TYPE, [1, 4]);
});

test('TYPE: no equal set -> runs holding a type seen twice', () => {
  const r = sel(runsOf(choice(1, [tw('NEGATION', ['P1']), tw('DEGREE', ['P1'])]), choice(1, [tw('SUBSTITUTION', ['P1'])]), choice(1, [tw('DEGREE', ['P1']), tw('SUBSTITUTION', ['P1'])])));
  assert.deepEqual(r.selection.candidatesAfter.TYPE, [1, 2, 3]);
});

test('TYPE: inclusion rule narrows candidates', () => {
  const r = sel(runsOf(choice(1, [tw('NEGATION', ['P1']), tw('DEGREE', ['P1'])]), choice(1, [tw('OTHER', ['P1'])]), choice(1, [tw('DEGREE', ['P1']), tw('SUBSTITUTION', ['P1'])])));
  assert.deepEqual(r.selection.candidatesAfter.TYPE, [1, 3]); assert.equal(r.selected, 1);
});

test('TYPE: nothing repeated -> unresolved, r1 temporary; override resolves', () => {
  const runs = runsOf(choice(1, [tw('NEGATION', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('SUBSTITUTION', ['P1'])]));
  const r = sel(runs);
  assert.equal(r.selection.unresolved, true); assert.equal(r.selected, 1);
  const o = sel(runs, 'FALSE', { run: 3, reason: 'why' });
  assert.equal(o.selected, 3); assert.equal(o.selection.decidedBy, 'OVERRIDE'); assert.equal(o.selection.override, 'why'); assert.equal(o.selection.unresolved, false);
});

test('TARGET: the target set shared by the most runs keeps its holders', () => {
  const r = sel(runsOf(choice(1, [tw('DEGREE', ['P2'])]), choice(1, [tw('DEGREE', ['P1', 'P2'])]), choice(1, [tw('DEGREE', ['P1', 'P2'])])));
  assert.deepEqual(r.selection.candidatesAfter.TARGET, [2, 3]); assert.equal(r.selected, 2); assert.equal(r.selection.decidedBy, 'FIRST'); assert.deepEqual(r.altTargetIds, []);
  const d = sel(runsOf(choice(1, [tw('DEGREE', ['P2'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])])).map((x, i) => i === 2 ? { ...x, validation: val('q10#1: x') } : x));
  assert.equal(d.selected, 2); assert.equal(d.selection.decidedBy, 'VALID');
});

test('TARGET: no shared set passes; TRUE uses supportIds', () => {
  const r = sel(runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P2'])])));
  assert.deepEqual(r.selection.candidatesAfter.TARGET, [1, 2]);
  const t = sel(runsOf(choice(1, [part({ supportIds: ['P1'] })]), choice(1, [part({ supportIds: ['P1', 'P3'] })])), 'TRUE');
  assert.deepEqual(t.altTargetIds, ['P3']); assert.deepEqual(t.runTypes, {});
});

test('VALID: runs with violations on the choice are dropped; others ignored', () => {
  const runs = runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]));
  runs[0].validation = val('q10#1.0: bad', 'q10#2: other choice'); runs[1].validation = val('q10#2.0: other choice', 'q1#1: other question');
  const r = sel(runs);
  assert.equal(r.selected, 2); assert.equal(r.selection.decidedBy, 'FIRST'); assert.deepEqual(r.selection.candidatesAfter.VALID, [2, 3]);
  assert.deepEqual(choiceViolations(runs[0].validation, 10, 1), ['q10#1.0: bad']);
});

test('FIRST and UNANIMOUS', () => {
  const same = runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]));
  assert.equal(sel(same).selection.decidedBy, 'UNANIMOUS'); assert.equal(sel(same).selected, 1);
  const diffTarget = runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1', 'P2'])]), choice(1, [tw('DEGREE', ['P1'])]));
  const r = sel(diffTarget);
  assert.equal(r.selected, 1); assert.deepEqual(r.altTargetIds, ['P2']);
  assert.equal(r.selection.decidedBy, 'FIRST');
});

test('skipped step when no candidate remains', () => {
  const runs = runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]));
  runs[0].validation = val('q10#1: x'); runs[1].validation = val('q10#1: y');
  const r = sel(runs);
  assert.deepEqual(r.selection.skippedSteps, ['VALID']); assert.deepEqual(r.selection.candidatesAfter.VALID, [1, 2]); assert.equal(r.selected, 1);
});

test('override onto a run with violations throws', () => {
  const runs = runsOf(choice(1, [tw('DEGREE', ['P1'])]), choice(1, [tw('DEGREE', ['P1'])]));
  runs[1].validation = val('q10#1.0: bad');
  assert.throws(() => sel(runs, 'FALSE', { run: 2, reason: 'r' }), /FREEZE_OVERRIDE_VIOLATION/);
});

const ok = () => [choice(1, [tw('DEGREE', ['P1'])]), choice(2, [part()])];
// choice 1 (FALSE) references the extra segment S1x in twistTargetIds (source BOTH).
const withExtra = () => [choice(1, [{ ...tw('DEGREE', ['P1', 'S1x']), source: 'BOTH' }]), choice(2, [part()])];
const ex = { id: 'S1x', parentId: 'S1', quote: 'abc' };

test('freezeKey: extraSegments merge and dedupe', () => {
  const runs = [1, 2].map(k => ({ k, out: out(withExtra(), [ex]) }));
  const r = freezeKey({ key: 'k', ctx: ctx(), runs });
  assert.deepEqual(r.frozen.questions[0].extraSegments, [ex]);
  assert.equal(r.validation.allPass, true, JSON.stringify(r.validation.items.filter(i => !i.pass)));
  assert.equal(r.frozen.questions[0].choices[0].truth, 'FALSE'); assert.equal(r.frozen.questions[0].choices[0].selectedRun, 1);
});

test('freezeKey: same extra id with a different quote across selected choices throws', () => {
  // choice 1 comes from run 1 (S1x = abc); choice 2 is overridden to run 2 (S1x = abd) and references S1x too
  const c2 = choice(2, [{ ...part({ supportIds: ['P1', 'S1x'] }), source: 'BOTH' }]);
  const a = out([withExtra()[0], choice(2, [part()])], [ex]);
  const b = out([withExtra()[0], c2], [{ ...ex, quote: 'abd' }]);
  const ov = [{ key: 'k', question: 10, choice: 2, run: 2, reason: 'r' }];
  assert.throws(() => freezeKey({ key: 'k', ctx: ctx(), runs: [{ k: 1, out: a }, { k: 2, out: b }], overrides: ov }), /FREEZE_EXTRA_CONFLICT: k q10 S1x/);
});

test('summary and report', () => {
  const r = freezeKey({ key: 'k', ctx: ctx(), runs: [1, 2].map(k => ({ k, out: out(ok()) })) });
  const [s] = summarizeFreeze([{ key: 'k', ...r }]);
  assert.equal(s.choices, 2); assert.deepEqual(s.decidedBy, { UNANIMOUS: 2 }); assert.deepEqual(s.twistTypes, { DEGREE: 1 }); assert.equal(s.violations, 0);
  assert.match(renderFreezeReport([s]), /UNANIMOUS 2/);
});
