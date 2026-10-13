import { readFileSync, writeFileSync } from 'node:fs';
const root = 'docs/experiments/axis-core-filter-six-2026-09-20';
const rows = name => readFileSync(`${root}/${name}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const requests = rows('requests.jsonl'), responses = rows('responses.jsonl'), results = rows('results.jsonl');
const filters = rows('filters.jsonl');
const unknown = requests.filter(r => !responses.find(s => s.index === r.index)?.response?.usage);
const measured = responses.reduce((s, r) => s + (r.estimatedCostUsd ?? 0), 0);
const reserved = unknown.reduce((s, r) => s + r.reserveUsd, 0);
const unchanged = filters.filter(f => f.result.axes.every(a => a.originalDescription === a.filteredDescription)).map(f => f.paragraphId);
const noOpPairs = results.filter(r => r.arm === 'original' && unchanged.includes(r.paragraphId)).map(r => {
  const other = results.find(o => o.caseId === r.caseId && o.arm === 'filtered');
  const request = arm => requests.find(q => q.tag.id === `${r.caseId}--${arm}`)?.request;
  const a = request('original'), b = request('filtered');
  return { caseId: r.caseId, exactFirstRequestEqual: JSON.stringify(a) === JSON.stringify(b),
    original: r.result?.status ?? r.error, filtered: other?.result?.status ?? other?.error,
    sameAxes: JSON.stringify(r.result?.snapshot.axisFeedback.map(a => a.status)) === JSON.stringify(other?.result?.snapshot.axisFeedback.map(a => a.status)) };
});
const repeatedGates = results.map(r => ({ id: r.id,
  gateResponses: responses.filter(s => s.tag.id === r.id && s.response?.output_parsed?.axisStates).map(s => ({
    index: s.index, rawStatus: s.response.output_parsed.status, errorClaims: s.response.output_parsed.errorClaims,
  })), finalError: r.error ?? null,
})).filter(r => r.gateResponses.length > 1 || r.finalError);
const audit = { requestedCalls: requests.length, savedResponses: responses.length,
  observedUsageEstimatedUsd: measured, unknownUsageRequests: unknown.map(r => ({ index: r.index, tag: r.tag, reserveUsd: r.reserveUsd })),
  reservedForUnknownUsd: reserved, localAccountedUsd: measured + reserved, completed: results.filter(r => r.result).length,
  failures: results.filter(r => !r.result).map(r => ({ id: r.id, error: r.error })),
  phaseCounts: Object.fromEntries(['filter', 'evaluate'].map(p => [p, requests.filter(r => r.tag.phase === p).length])),
  unchangedParagraphs: unchanged, noOpPairs, repeatedGates };
writeFileSync(`${root}/execution-audit.json`, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
