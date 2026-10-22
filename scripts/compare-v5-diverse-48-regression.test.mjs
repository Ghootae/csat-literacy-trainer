import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { compare, renderMarkdown, writeComparison } from './compare-v5-diverse-48-regression.mjs';

const Q = 'corporate-law-q13'; // correct choice C2
const sel = (choiceId, raw, attempts = [{ outcome: 'SUCCESS', rawOutput: raw }], status = 'SUCCESS') =>
  ({ command: { type: 'SELECT', choiceId }, evaluations: [{ kind: 'SELECTION', status, call: { rawOutput: raw, metadata: { attempts } } }] });
const view = (outcome, selectionCount, questionsAsked) => ({ phase: 'COMPLETED', selectionCount, questionsAsked, result: { outcome } });
function makeDir(caseSpecs) {
  const dir = mkdtempSync(`${tmpdir()}/cmp-`); mkdirSync(`${dir}/cases`);
  for (const [id, role, steps] of caseSpecs) writeFileSync(`${dir}/cases/${id}.json`, JSON.stringify({ case: { id, role, questionId: Q }, steps }));
  return dir;
}
const supported = { reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE', errors: [{ basis: 'STATED' }] };
const insufficient = { reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'NOT_IN_SOURCE', errors: [] };
const full = { claimConflicts: [{ observationId: 'o' }], keyRelationCoverage: [{ element: 'e1', covered: true }, { element: 'e2', covered: false }] };

test('changed is computed from outcome, end reason, selections and questions', () => {
  const same = { ...sel('C2', supported), view: view('VERIFIED_CORRECT', 1, 0) };
  const oldDir = makeDir([['X-CT', 'CT', [same]], ['X-A1', 'A1', [{ ...same, view: view('VERIFIED_CORRECT', 1, 0) }]]]);
  const newDir = makeDir([['X-CT', 'CT', [same]], ['X-A1', 'A1', [{ ...same, view: view('VERIFIED_CORRECT', 1, 2) }]]]);
  const { rows, summary } = compare(oldDir, newDir);
  assert.deepEqual(rows.map(r => [r.id, r.changed]), [['X-A1', true], ['X-CT', false]]);
  assert.equal(summary.changed, 1); assert.deepEqual(summary.changedIds, ['X-A1']);
  assert.equal(compare(oldDir, oldDir).summary.changed, 0);
});

test('summary table: outcome distribution, retries, claim conflicts, unsupported correct choice', () => {
  const oldDir = makeDir([['X-CT', 'CT', [{ ...sel('C2', insufficient), view: view('UNVERIFIED_CORRECT', 1, 0) }]]]);
  const retried = sel('C2', insufficient, [{ outcome: 'FAILED' }, { outcome: 'SUCCESS', rawOutput: { ...insufficient, ...full } }]);
  const newDir = makeDir([
    ['X-CT', 'CT', [{ ...retried, view: view('UNVERIFIED_CORRECT', 1, 0) }]],
    ['X-A2', 'A2', [{ ...sel('C1', supported), view: view('VERIFIED_CORRECT', 2, 1) }]],
  ]);
  const result = compare(oldDir, newDir), { summary } = result;
  assert.deepEqual(summary.outcomeByRole.CT, { old: { UNVERIFIED_CORRECT: 1 }, new: { UNVERIFIED_CORRECT: 1 } });
  assert.equal(summary.verificationRetries, 1);
  assert.deepEqual(summary.claimConflictSessions, ['X-CT']);
  assert.deepEqual(summary.correctChoiceNotSupported, [{ id: 'X-CT', which: 'first', contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'NOT_IN_SOURCE', emptyPieces: ['e2'] }]);
  const ct = result.rows.find(r => r.id === 'X-CT');
  assert.equal(ct.old.first.claimConflicts, null); // not recorded in the older run
  assert.equal(ct.new.first.keyRelationCoverage.pieces, 2);
  assert.equal(result.rows.find(r => r.id === 'X-A2').new.first.stated, 1);
  const md = renderMarkdown(result);
  assert.match(md, /\| CT \| UNVERIFIED_CORRECT 1 \| UNVERIFIED_CORRECT 1 \|/);
  assert.match(md, /X-CT \| first \| INSUFFICIENT \| NOT_IN_SOURCE \| e2/);
});

test('writeComparison writes COMPARISON.json and COMPARISON.md to the output directory', () => {
  const d = makeDir([['X-CT', 'CT', [{ ...sel('C2', supported), view: view('VERIFIED_CORRECT', 1, 0) }]]]);
  const out = mkdtempSync(`${tmpdir()}/cmp-out-`);
  assert.equal(writeComparison(d, d, out).changed, 0);
  assert.equal(JSON.parse(readFileSync(`${out}/COMPARISON.json`, 'utf8')).rows.length, 1);
  assert.match(readFileSync(`${out}/COMPARISON.md`, 'utf8'), /^# COMPARISON/);
});
