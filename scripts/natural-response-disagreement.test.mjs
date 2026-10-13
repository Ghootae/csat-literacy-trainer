import test from 'node:test';
import assert from 'node:assert/strict';
import { casesFromRecord, compareAxes, reviewSelection } from './lib/natural-response-disagreement.mjs';
const question = { type: 'DIAGNOSTIC', text: '누가 했나요?' };
const record = { row: { paragraphId: 'p', sessionId: 's', initialResponse: '처음', turns: [
  { evaluation: { nextQuestion: question, snapshot: { axisFeedback: [{ axisId: 'AX1', revealedText: '공개된 도움' }] } }, questionShown: question.text, studentAnswer: '후속' },
  { evaluation: {}, questionShown: null, studentAnswer: null },
] } };
test('history is prior-only and preserves actual wording and supplied help', () => {
  const c = casesFromRecord(record);
  assert.deepEqual(c[0].history, []); assert.deepEqual(c[0].revealedAxisContent, []);
  assert.deepEqual(c[1].history, [{ question, answer: '후속' }]);
  assert.deepEqual(c[1].revealedAxisContent, [{ axisId: 'AX1', text: '공개된 도움', turn: 1 }]);
  assert.equal(c[1].initialResponse, '처음'); assert.ok(!('previousSnapshot' in c[1]));
});
test('missing or inconsistent historic question is rejected', () => {
  const bad = structuredClone(record); bad.row.turns[0].questionShown = '다른 질문';
  assert.throws(() => casesFromRecord(bad));
});
const axes = (...states) => states.map((status, i) => ({ axisId: `AX${i+1}`, status }));
test('PASS/OK is not an automatic-question difference', () => {
  const c = compareAxes(axes('UNCLEAR_OK'), axes('PASS'), 0);
  assert.equal(c.same, false); assert.equal(c.paragraphInterventionChange, false);
});
test('axis differences can leave paragraph intervention unchanged; no slots is distinct', () => {
  const c = compareAxes(axes('UNCLEAR_SERIOUS', 'ERROR'), axes('PASS', 'ERROR'), 3);
  assert.equal(c.axisInterventionChange, true); assert.equal(c.paragraphInterventionChange, false);
  assert.equal(c.questionSlotAvailable, false);
});
test('failed contract can never be treated as agreement', () => {
  const cs = [{ id: 'a', stratum: 'initial' }, { id: 'b', stratum: 'followup' }];
  const sel = reviewSelection([{ caseId: 'a', raw: { same: true, comparable: true }, contractFailure: true },
    { caseId: 'b', raw: { same: true, comparable: true }, contractFailure: false }], cs);
  assert.deepEqual(sel.mandatory, ['a']); assert.deepEqual(sel.agreement, ['b']);
  assert.equal(compareAxes(null, axes('PASS'), 0).comparable, false);
});
