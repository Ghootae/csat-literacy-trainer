// Offline repair of a mechanically derivable flag only. Never changes model-written text.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { applyAxisCoreFilter, hashFilterValue } from '../packages/pipeline/dist/dialogue-experiment/axis-core-filter.js';
const root = 'docs/experiments/axis-core-filter-six-2026-09-20';
const read = name => JSON.parse(readFileSync(`${root}/${name}`, 'utf8'));
const rows = name => readFileSync(`${root}/${name}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
if (existsSync(`${root}/evaluation-freeze.json`)) throw new Error('Cannot repair after evaluation freeze');
const filters = rows('filters.jsonl');
const responses = rows('responses.jsonl');
const requests = rows('requests.jsonl');
const sources = read('sources.json');
const repairs = [];
for (let i = 0; i < filters.length; i++) {
  const f = filters[i];
  if (f.error !== 'Error: axis filter: inconsistent changed flag') continue;
  const responseRow = responses.find(r => r.tag.phase === 'filter' && r.tag.paragraphId === f.paragraphId);
  if (!responseRow?.response?.output_parsed) throw new Error('No saved model output');
  const raw = responseRow.response.output_parsed;
  const result = structuredClone(raw);
  for (const axis of result.axes) axis.changed = axis.originalDescription !== axis.filteredDescription;
  const gold = sources[f.paragraphId].gold;
  const filteredGold = applyAxisCoreFilter(gold, result);
  const req = requests.find(r => r.index === responseRow.index).request;
  filters[i] = { paragraphId: f.paragraphId, result, filteredGold, metadata: {
    version: 'axis-core-filter-v1', model: req.model, effort: req.reasoning.effort,
    responseId: responseRow.response.id, inputHash: hashFilterValue(JSON.parse(req.input)),
    promptHash: hashFilterValue(req.instructions), originalGoldHash: hashFilterValue(gold),
    filteredGoldHash: hashFilterValue(filteredGold), usage: responseRow.response.usage, rawResult: raw,
    contractRepair: 'changed := originalDescription !== filteredDescription; no text changed',
  } };
  repairs.push({ originalFailure: f, responseIndex: responseRow.index, repair: filters[i].metadata.contractRepair });
}
if (repairs.length) {
  const backup = `${root}/filters-before-metadata-repair-${requests.length}.jsonl`;
  if (existsSync(backup)) throw new Error('Backup exists');
  writeFileSync(backup, readFileSync(`${root}/filters.jsonl`));
  writeFileSync(`${root}/metadata-repair-${requests.length}.json`, JSON.stringify(repairs, null, 2) + '\n');
  writeFileSync(`${root}/filters.jsonl`, filters.map(r => JSON.stringify(r)).join('\n') + '\n');
}
console.log(JSON.stringify({ repaired: repairs.length, noApiCalls: true }));
