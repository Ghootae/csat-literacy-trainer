import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { ConditionalMetaGoldSchema } from '../packages/pipeline/dist/dialogue-experiment/conditional-meta.js';

const root = 'docs/experiments/conditional-meta-ui-2026-10-01';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const manifest = read(`${root}/manifest.json`);
for (const source of manifest.sources) assert.equal(hash(readFileSync(source.path, 'utf8')), source.hash);
const items = read(`${root}/items.json`), patches = read(`${root}/patches.json`);
assert.equal(hash(JSON.stringify(items)), manifest.itemsHash);
const rows = readFileSync(`${root}/results.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const output = [], review = ['# 개발자 실험용 구체 축과 메타 축', '', '6지문 30문단의 최종 연결 자산이다. 원문 전체는 개발자 UI에서 확인한다. 두 건의 수동 교정은 patches.json에 원출력과 대조하여 보존했다.', ''];
for (const item of items) {
  const path = `packages/pipeline/fixtures/experiments/dialogue/conditional-meta-v1/${item.paragraphId}.json`;
  const expected = structuredClone(item.axes ?? rows.find(row => row.id === item.paragraphId).validated.centralAxes);
  for (const patch of patches.filter(p => p.paragraphId === item.paragraphId)) {
    const axis = expected.find(a => a.id === patch.axisId); assert.equal(axis[patch.field], patch.before); axis[patch.field] = patch.after;
  }
  const asset = ConditionalMetaGoldSchema.parse(read(path));
  assert.deepEqual(asset.axes, expected); assert.equal(asset.sourceGoldHash, item.sourceGoldHash); assert.equal(asset.centralStory, item.centralStory);
  output.push({ paragraphId: item.paragraphId, path, sha256: hash(readFileSync(path, 'utf8')), axes: asset.axes.length, patched: patches.some(p => p.paragraphId === item.paragraphId) });
  review.push(`## ${item.paragraphId}`, '', `중심 이야기: ${asset.centralStory}`, '');
  for (const axis of asset.axes) review.push(`### ${axis.id}`, '', `구체 축: ${axis.description}`, '', `메타 축: ${axis.metaAxis}`, '');
}
writeFileSync(`${root}/final-assets-audit.json`, JSON.stringify({ at: new Date().toISOString(), originalSourcesUnchanged: true, assets: output.length, axisCount: output.reduce((s,a) => s+a.axes,0), patches: patches.length, files: output }, null, 2) + '\n');
writeFileSync(`${root}/AXES.md`, review.join('\n'));
console.log(JSON.stringify({ assets: output.length, axes: output.reduce((s,a) => s+a.axes,0), patches: patches.length, originalSourcesUnchanged: true }));
