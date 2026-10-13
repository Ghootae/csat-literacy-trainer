import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = 'docs/experiments/axis-relation-decomposition-2026-09-20';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const rows = f => readFileSync(`${root}/${f}`, 'utf8').trim().split('\n').map(JSON.parse);
const sha = v => createHash('sha256').update(v).digest('hex');
const fixtures = read(`${root}/fixtures.json`), m = read(`${root}/manifest.json`);
const qs = rows('requests.jsonl'), rs = rows('responses.jsonl'), results = rows('results.jsonl');
assert.equal(sha(JSON.stringify(fixtures)), m.fixturesHash);
for (const [p, h] of Object.entries(m.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
assert.equal(qs.length, 10); assert.equal(rs.length, 10); assert.equal(results.length, 10);
assert.equal(new Set(qs.map(q => q.id)).size, 10);
let doc = '# 관계 추출 원출력 전체 — 검증 실패 포함\n\n축 문장만 입력했다. 아래 출력은 구조 검증 전 모델 원출력이며, 정확성 승인을 뜻하지 않는다.\n\n';
const quoteFailures = [];
let relationCount = 0, axisCount = 0;
for (const f of fixtures) {
  const q = qs.find(q => q.id === f.id), r = rs.find(r => r.id === f.id), result = results.find(r => r.id === f.id);
  assert.deepEqual(JSON.parse(q.request.input), f.input);
  assert.equal(q.request.text.format.name, 'axis_relation_decomposition');
  assert.equal(q.request.store, false); assert.equal(q.request.service_tier, 'default');
  assert.equal(r.response.status, 'completed'); assert.ok(r.estimatedCostUsd != null);
  const raw = JSON.parse(r.response.output_text);
  if (result.result) assert.deepEqual(result.metadata.rawResult, raw);
  for (const a of raw.axes) {
    axisCount++; relationCount += a.relations.length;
    for (const rel of a.relations) {
      assert.ok(!('importance' in rel) && !('role' in rel) && !('status' in rel));
      for (const quote of [...rel.evidenceQuotes, ...rel.conditions.map(c => c.basisQuote), ...rel.modifiers.map(c => c.basisQuote)]) {
        if (!a.originalDescription.includes(quote)) quoteFailures.push({ id: f.id, axisId: a.axisId, relationId: rel.relationId, quote });
      }
    }
  }
  doc += `## ${f.id}\n\n검증: ${result.result ? '형식·인용 통과 (의미 정확성과 별개)' : result.error}\n\n사전 기대: ${f.expectation}\n\n`;
  for (const a of f.input.centralAxes) doc += `- ${a.id}: ${a.description}\n`;
  doc += '\n```json\n' + JSON.stringify(raw, null, 2) + '\n```\n\n';
}
const prior = read('docs/experiments/axis-function-filter-six-2026-09-20/manifest.json');
for (const [p, h] of Object.entries(prior.protectedHashes)) assert.equal(sha(readFileSync(p)), h, p);
const oldFixtures = read('docs/experiments/axis-meaning-filter-only-2026-09-20/fixtures.json');
for (const f of oldFixtures.filter(f => f.path)) assert.deepEqual(read(f.path), f.gold);
const cost = rs.reduce((n, r) => n + r.estimatedCostUsd, 0);
assert.ok(cost <= 1);
const audit = { checkedAt: new Date().toISOString(), calls: 10, axes: axisCount, rawRelations: relationCount,
  validExtractions: results.filter(r => r.result).length, rawResponsesPreserved: 10,
  studentEvaluationCalls: 0, filterCalls: 0, priorProtectedFilesUnchanged: Object.keys(prior.protectedHashes).length,
  originalGoldUnchanged: 6, frozenHashesMatch: true, estimatedCostUsd: cost, quoteFailures,
  semanticCorrectnessGuaranteed: false };
writeFileSync(`${root}/execution-audit.json`, JSON.stringify(audit, null, 2) + '\n');
writeFileSync(`${root}/RAW-OUTPUTS.md`, doc);
console.log(JSON.stringify(audit));
