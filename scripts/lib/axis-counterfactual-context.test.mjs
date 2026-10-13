import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCases, makeDiagnosticJobs, makeBenchmarkGroups, summarizeDiagnostic, canReserveGroup, reservationUsd, usageCost } from './axis-counterfactual-context.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const fixtures = read('packages/pipeline/experiments/dialogue/counterfactual-context-fixtures-v1.json');
const sources = read('docs/experiments/axis-direct-judgment-v1-2026-09-20/sources.json');
const cases = buildCases(fixtures, sources), jobs = makeDiagnosticJobs(cases), groups = makeBenchmarkGroups(cases);
const mockResults = () => jobs.map(j => {
  const c = cases.find(c => c.id === j.caseId), status = c.kind === 'sufficient' ? 'PASS' : 'UNCLEAR_SERIOUS';
  return { ...j, kind: c.kind, context: c.context, targetStatus: status, contractValid: true, expectedMatch: true };
});

test('five original paragraphs, sufficient and insufficient, three context variants', () => {
  assert.equal(fixtures.length, 5); assert.equal(cases.length, 30);
  assert.equal(new Set(cases.map(c => c.id)).size, 30);
  for (const c of cases) assert.equal(c.payload.paragraphText, sources[c.paragraphId].gold.paragraphText);
});
test('target utterance is byte identical across A/B/C; full student text remains', () => {
  for (const f of fixtures) for (const kind of ['sufficient', 'insufficient']) {
    const cc = cases.filter(c => c.setId === f.id && c.kind === kind);
    assert.equal(new Set(cc.map(c => c.targetText)).size, 1);
    assert.equal(new Set(cc.map(c => c.payload.evidence.initialResponse)).size, 3);
    for (const c of cc) {
      assert.ok(c.payload.evidence.initialResponse.includes(f[kind]));
      assert.ok(c.payload.evidence.initialResponse.includes(f.contexts[c.context]));
    }
  }
});
test('model payload has no target markers, expectations, new quote fields or central story', () => {
  for (const c of cases) {
    assert.deepEqual(Object.keys(c.payload), ['paragraphText', 'centralAxes', 'evidence', 'turn']);
    for (const a of c.payload.centralAxes) assert.deepEqual(Object.keys(a), ['id', 'description']);
  }
});
test('diagnostic schedule is deterministic, balanced and unique at 180 calls', () => {
  assert.deepEqual(jobs, makeDiagnosticJobs(cases)); assert.equal(jobs.length, 180);
  assert.equal(new Set(jobs.map(j => j.id)).size, 180);
  for (const c of cases) for (const scope of ['full', 'isolated']) assert.equal(jobs.filter(j => j.caseId === c.id && j.scope === scope).length, 3);
});
test('benchmark performs all axes and schedules 96 calls in 60 paragraph groups', () => {
  assert.equal(groups.length, 60); assert.equal(groups.flatMap(g => g.jobs).length, 96);
  for (const g of groups) {
    const c = cases.find(c => c.id === g.caseId);
    assert.equal(c.context, 'A');
    assert.deepEqual(g.jobs.map(j => j.axisId), g.mode === 'full' ? [null] : c.payload.centralAxes.map(a => a.id));
  }
});
test('perfect judgments in both scopes do not justify architecture progression', () => {
  const s = summarizeDiagnostic(mockResults(), cases);
  assert.equal(s.benchmarkGate.proceed, false);
  assert.equal(s.counts.full.expectedErrors, 0);
});
test('three improved errors and reduced context range in two paragraphs open exploratory gate', () => {
  const results = mockResults();
  for (const r of results) if (r.scope === 'full' && r.kind === 'sufficient' && r.context === 'C' && ['G', 'H'].some(p => r.caseId.startsWith(p + '-'))) {
    r.targetStatus = 'UNCLEAR_OK'; r.expectedMatch = false;
  }
  const s = summarizeDiagnostic(results, cases);
  assert.equal(s.benchmarkGate.proceed, true); assert.equal(s.reducedContextRangeParagraphs.length, 2);
});
test('stable always-PASS isolated results fail insufficient safety gate', () => {
  const results = mockResults();
  for (const r of results) if (r.scope === 'isolated') { r.targetStatus = 'PASS'; r.expectedMatch = r.kind === 'sufficient'; }
  const s = summarizeDiagnostic(results, cases);
  assert.equal(s.counts.isolated.insufficientPass, 45); assert.equal(s.benchmarkGate.proceed, false);
});
test('contract failures are not semantic errors and block progression', () => {
  const results = mockResults(); results[0].contractValid = false; results[0].targetStatus = null; results[0].expectedMatch = null;
  const s = summarizeDiagnostic(results, cases);
  assert.equal(s.counts.full.expectedErrors + s.counts.isolated.expectedErrors, 0);
  assert.equal(s.benchmarkGate.conditions.completeValid, false);
});
test('reserve full concurrent group before dispatch; respect money and call ceilings', () => {
  const req = { input: 'test', max_output_tokens: 4000 };
  const one = reservationUsd(req);
  assert.equal(canReserveGroup(2 - one * 2.5, 0, [req, req, req], 276), false);
  assert.equal(canReserveGroup(0, 274, [req, req, req], 276), false);
  assert.equal(canReserveGroup(0, 273, [req, req, req], 276), true);
});
test('cost calculation handles cached/written tokens and unknown usage', () => {
  assert.equal(usageCost(null), null);
  assert.equal(usageCost({ input_tokens: 1000, output_tokens: 100, input_tokens_details: { cached_tokens: 500, cache_write_tokens: 100 } }), .00235);
});
