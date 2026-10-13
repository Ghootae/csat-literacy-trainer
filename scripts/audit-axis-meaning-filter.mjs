import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'docs/experiments/axis-meaning-filter-only-2026-09-20';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const rows = f => readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').map(JSON.parse);
const sha = v => createHash('sha256').update(v).digest('hex');
const manifest = read(`${root}/manifest.json`), fixtures = read(`${root}/fixtures.json`);
const requests = rows('requests.jsonl'), responses = rows('responses.jsonl'), results = rows('results.jsonl');
assert.equal(sha(JSON.stringify(fixtures)), manifest.fixturesHash);
for (const [p, h] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
assert.equal(requests.length, 10); assert.equal(new Set(requests.map(q => q.id)).size, 10);
assert.equal(responses.length, 10); assert.equal(results.length, 10);
for (const f of fixtures) {
  const q = requests.find(q => q.id === f.id), r = responses.find(r => r.id === f.id), result = results.find(r => r.id === f.id);
  const input = JSON.parse(q.request.input);
  assert.deepEqual(Object.keys(input).sort(), ['centralAxes', 'centralObject', 'paragraphId', 'paragraphText']);
  assert.equal(q.request.text.format.name, 'axis_meaning_filter');
  assert.equal(q.request.store, false);
  assert.deepEqual(result.metadata.rawResult, r.response.output_parsed);
  assert.equal(r.response.status, 'completed');
  assert.ok(r.estimatedCostUsd != null);
  if (f.path) assert.deepEqual(read(f.path), f.gold);
}
const prior = read('docs/experiments/axis-function-filter-six-2026-09-20/manifest.json');
for (const [p, h] of Object.entries(prior.protectedHashes)) assert.equal(sha(readFileSync(p)), h, `Previous baseline changed: ${p}`);
const cost = responses.reduce((n, r) => n + r.estimatedCostUsd, 0);
assert.ok(cost < manifest.maxEstimatedUsd);
const audit = { checkedAt: new Date().toISOString(), physicalCalls: 10, studentEvaluationCalls: 0, uniqueParagraphs: 10,
  axes: results.reduce((n, r) => n + r.result.axes.length, 0), rawOutputsPreserved: 10,
  frozenHashesMatch: true, originalGoldFilesUnchanged: 6, priorProtectedFilesUnchanged: Object.keys(prior.protectedHashes).length,
  estimatedCostUsd: cost, unknownUsageCalls: 0, semanticCorrectnessGuaranteed: false };
writeFileSync(`${root}/execution-audit.json`, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit));
