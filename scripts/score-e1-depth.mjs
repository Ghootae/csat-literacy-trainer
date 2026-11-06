// D-0206 보완 2(24): unblind v3/quality/blind-judgments.json with blind-key.json and tally accuracy and depth per group.
// Group: EXAM, or <condition> <promptVersion> (A2 v3, B v3, A2 v2, B v2). Intended truth of each choice comes from polarity + answer key.
// Usage: node scripts/score-e1-depth.mjs   (writes v3/quality/SCORE.json and prints the table)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EXP = 'docs/experiments/gold-item-generation-2026-11-06', Q = `${EXP}/v3/quality`;
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
export const groupOf = k => k.source === 'EXAM' ? 'EXAM' : `${k.condition} ${k.promptVersion}`;
const ORDER = ['B v3', 'A2 v3', 'B v2', 'A2 v2', 'EXAM'];

export function score(input, judgments, key) {
  const items = new Map(input.flatMap(p => p.items.map(i => [i.id, i]))), keys = new Map(key.map(k => [k.id, k])), rows = {};
  if (judgments.length !== items.size) throw new Error(`COUNT: ${judgments.length} judgments for ${items.size} items`);
  for (const j of judgments) {
    const k = keys.get(j.id), it = items.get(j.id); if (!k || !it) throw new Error(`ID: ${j.id}`);
    const g = rows[groupOf(k)] ??= { items: 0, ok: 0, verdicts: {}, keyMatch: 0, relation: 0, IN_SENTENCE: 0, CROSS_SENTENCE: 0, INFERRED: 0, deep: 0, relation2Items: 0, deep2Items: 0,
      invalidOnIntendedTrue: 0, invalidRelation: 0, twistOnRelationFalse: 0, chains: 0, chainDiffCondition: 0, signals: {}, cases: [] };
    g.items++; g.verdicts[j.verdict] = (g.verdicts[j.verdict] ?? 0) + 1; if (j.verdict === 'OK') g.ok++;
    if (j.candidates.length === 1 && j.candidates[0] === k.answer) g.keyMatch++;
    const keyTruth = it.stemPolarity === 'SELECT_INCORRECT' ? 'FALSE' : 'TRUE';
    let rel = 0, deep = 0;
    for (const c of j.choices) {
      const intended = c.number === k.answer ? keyTruth : (keyTruth === 'TRUE' ? 'FALSE' : 'TRUE');
      if (c.depth !== 'RELATION') continue;
      g.relation++; rel++;
      if (c.relationLevel) g[c.relationLevel]++;
      if (c.relationLevel === 'CROSS_SENTENCE' || c.relationLevel === 'INFERRED') { g.deep++; deep++; }
      if (c.relationInPassage === 'INVALID') { g.invalidRelation++; if (intended === 'TRUE') { g.invalidOnIntendedTrue++; g.cases.push({ id: j.id, number: c.number, kind: 'INVALID_ON_INTENDED_TRUE', reason: c.reason }); } }
      if (c.truth === 'FALSE' && c.twistOnRelation) g.twistOnRelationFalse++;
      if (c.chain?.isChain) { g.chains++; if (c.chain.sameCondition === false) g.chainDiffCondition++; }
    }
    if (rel >= 2) g.relation2Items++; if (deep >= 2) g.deep2Items++;
    for (const s of j.signals ?? []) g.signals[s.type] = (g.signals[s.type] ?? 0) + 1;
    if (j.verdict !== 'OK' || !(j.candidates.length === 1 && j.candidates[0] === k.answer)) g.cases.push({ id: j.id, kind: `VERDICT_${j.verdict}`, candidates: j.candidates, answer: k.answer, summary: j.summary });
  }
  return Object.fromEntries(ORDER.filter(g => rows[g]).map(g => [g, rows[g]]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const res = score(readJson(`${Q}/blind-input.json`), readJson(`${Q}/blind-judgments.json`), readJson(`${Q}/blind-key.json`).key);
  writeFileSync(`${Q}/SCORE.json`, JSON.stringify(res, null, 2) + '\n');
  console.log('group | items OK keyMatch | RELATION IN/CROSS/INF deep | rel2 deep2 | invalidOnTrue invalidRel twistRelFalse | chains(diffCond) | signals');
  for (const [g, r] of Object.entries(res)) console.log(`${g} | ${r.items} ${r.ok} ${r.keyMatch} | ${r.relation} ${r.IN_SENTENCE}/${r.CROSS_SENTENCE}/${r.INFERRED} ${r.deep} | ${r.relation2Items} ${r.deep2Items} | ${r.invalidOnIntendedTrue} ${r.invalidRelation} ${r.twistOnRelationFalse} | ${r.chains}(${r.chainDiffCondition}) | ${JSON.stringify(r.signals)}`);
}
