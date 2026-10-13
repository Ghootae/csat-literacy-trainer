import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const oldRoot = 'docs/experiments/axis-core-filter-six-2026-09-20';
const root = 'docs/experiments/axis-function-filter-six-2026-09-20';
const read = (base, name) => JSON.parse(readFileSync(`${base}/${name}`, 'utf8'));
const rows = (base, name) => readFileSync(`${base}/${name}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const old = rows(oldRoot, 'results.jsonl'), current = rows(root, 'results.jsonl');
const oldRequests = rows(oldRoot, 'requests.jsonl'), requests = rows(root, 'requests.jsonl');
const cases = read(root, 'cases.json');
if (JSON.stringify(cases) !== JSON.stringify(read(oldRoot, 'cases.json'))) throw new Error('Cases differ');
const sig = r => r?.result ? { status: r.result.status, axes: r.result.snapshot.axisFeedback.map(a => [a.axisId, a.status]) } : { error: r?.error ?? 'not run' };
const compact = r => r?.result ? `${r.result.status} (${r.result.snapshot.axisFeedback.map(a => `${a.axisId}:${a.status}`).join(', ')})` : `실패: ${r?.error ?? '미실행'}`;
const baseline = cases.map(c => {
  const a = old.find(r => r.caseId === c.id && r.arm === 'original');
  const b = current.find(r => r.caseId === c.id && r.arm === 'original');
  const q1 = oldRequests.find(r => r.tag.id === `${c.id}--original`)?.request;
  const q2 = requests.find(r => r.tag.id === `${c.id}--original`)?.request;
  return { id: c.id, exactFirstRequestEqual: JSON.stringify(q1) === JSON.stringify(q2),
    bothValid: !!a?.result && !!b?.result, changed: JSON.stringify(sig(a)) !== JSON.stringify(sig(b)), old: sig(a), current: sig(b) };
});
const protectedChanges = Object.entries(read(oldRoot, 'manifest.json').protectedHashes).filter(([p, hash]) => createHash('sha256').update(readFileSync(p)).digest('hex') !== hash).map(([p]) => p);
const audit = { sameCases: true, oldProtectedChanges: protectedChanges, baseline,
  validBaselinePairs: baseline.filter(r => r.bothValid).length,
  changedValidBaselinePairs: baseline.filter(r => r.bothValid && r.changed).length };
writeFileSync(`${root}/history-comparison.json`, JSON.stringify(audit, null, 2) + '\n');
let doc = '# 기존 실행과 기능 필터 실행 비교\n\n동일 시점 3군 실험이 아니다. 직전 원본·직접 필터와 이번 원본·기능 필터의 단회 결과를 구분한다.\n\n';
for (const c of cases) {
  doc += `## ${c.title} / ${c.kind}\n\n> ${c.initial}\n\n`;
  for (const [label, rs, arm] of [['직전 원본', old, 'original'], ['직전 직접 필터', old, 'filtered'], ['이번 원본', current, 'original'], ['이번 기능 필터', current, 'filtered']]) {
    doc += `- ${label}: ${compact(rs.find(r => r.caseId === c.id && r.arm === arm))}\n`;
  }
  doc += '\n';
}
writeFileSync(`${root}/HISTORY-COMPARISON.md`, doc);
console.log(JSON.stringify({ ...audit, baseline: baseline.filter(r => r.changed) }, null, 2));
