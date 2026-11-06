// Classifies relations of map run A that are not reproduced in run B (same passage, prompt v2),
// and writes a stratified sample for judgment. Local only.
// Usage: node scripts/classify-relation-mismatch.mjs [--per-class 12] [--seed 20261106]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeMasks, iou } from './measure-map-run-agreement.mjs';

const OUT = 'docs/experiments/map-run-agreement-2026-11-06/mismatch';

export function containment(a, b) {
  let inter = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { if (a[i]) na++; if (b[i]) nb++; if (a[i] & b[i]) inter++; }
  return Math.min(na, nb) === 0 ? 0 : inter / Math.min(na, nb);
}
// "Same place": IoU >= 0.5. "Overlapping place": one contains the other (>= 0.8) and IoU >= 0.2 (excludes TOP-covers-all).
const same = (a, b) => iou(a, b) >= 0.5;
const near = (a, b) => same(a, b) || (containment(a, b) >= 0.8 && iou(a, b) >= 0.2);

export function classifyMismatch(r, A, mapB, B) {
  const fa = A.get(r.fromId)?.mask, ta = A.get(r.toId)?.mask;
  if (!fa || !ta) return null;
  const rels = (mapB.relations ?? []).map(x => ({ x, f: B.get(x.fromId)?.mask, t: B.get(x.toId)?.mask })).filter(o => o.f && o.t);
  if (rels.some(o => same(fa, o.f) && same(ta, o.t))) return { cls: 'REPRODUCED' };
  const pick = pred => rels.find(pred)?.x;
  let m;
  if ((m = pick(o => same(fa, o.t) && same(ta, o.f)))) return { cls: 'REVERSED', match: m };
  if ((m = pick(o => near(fa, o.f) && near(ta, o.t)))) return { cls: 'GRANULARITY', match: m };
  if ((m = pick(o => near(fa, o.t) && near(ta, o.f)))) return { cls: 'GRANULARITY_REVERSED', match: m };
  const one = rels.filter(o => near(fa, o.f) || near(ta, o.t) || near(fa, o.t) || near(ta, o.f)).map(o => o.x);
  if (one.length) return { cls: 'ONE_END', candidates: one.slice(0, 4) };
  return { cls: 'NONE' };
}

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

export function main({ perClass = 12, seed = 20261106 } = {}) {
  const rows = JSON.parse(readFileSync('docs/experiments/map-run-agreement-2026-11-06/results.json', 'utf8')).filter(r => r.prompt === 'v2');
  const all = []; const counts = {}; const byPassage = {}; let total = 0;
  for (const row of rows) {
    const run = JSON.parse(readFileSync(join(row.dir, 'RUN.json'), 'utf8'));
    const paragraphs = JSON.parse(readFileSync(run.sourceFile, 'utf8')).paragraphs;
    const maps = [1, 2, 3].map(i => {
      for (const p of [join(row.dir, 'runs', `map-r${i}.json`), join(row.dir, 'rerun-r2', 'runs', `map-r${i}.json`)]) {
        try { return JSON.parse(readFileSync(p, 'utf8')); } catch {}
      }
      throw new Error(`missing ${row.dir} r${i}`);
    });
    const masks = maps.map(m => nodeMasks(m, paragraphs).nodes);
    const textOf = (m, id) => (m.propositions.find(p => p.id === id) ?? m.nodes.find(n => n.id === id))?.text ?? '';
    const kindOf = (k, id) => masks[k].get(id)?.kind;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) {
      for (const r of maps[a].relations ?? []) {
        const c = classifyMismatch(r, masks[a], maps[b], masks[b]); if (!c) continue;
        total++; counts[c.cls] = (counts[c.cls] ?? 0) + 1;
        const bp = (byPassage[row.passageId] ??= {}); bp[c.cls] = (bp[c.cls] ?? 0) + 1;
        if (c.cls === 'REPRODUCED') continue;
        const rel = x => ({ id: x.id, name: x.name, from: `${x.fromId} [${kindOf(b, x.fromId)}] ${textOf(maps[b], x.fromId)}`, to: `${x.toId} [${kindOf(b, x.toId)}] ${textOf(maps[b], x.toId)}`, note: x.note });
        all.push({
          passageId: row.passageId, runA: a + 1, runB: b + 1, cls: c.cls,
          a: { id: r.id, name: r.name, from: `${r.fromId} [${kindOf(a, r.fromId)}] ${textOf(maps[a], r.fromId)}`, to: `${r.toId} [${kindOf(a, r.toId)}] ${textOf(maps[a], r.toId)}`, note: r.note },
          bMatch: c.match ? rel(c.match) : null,
          bCandidates: (c.candidates ?? []).map(rel),
        });
      }
    }
  }
  // Stratified sample: per class, at most one case per (passage, A relation) to avoid duplicates across run pairs.
  const rand = rng(seed); const sample = [];
  for (const cls of ['REVERSED', 'GRANULARITY', 'GRANULARITY_REVERSED', 'ONE_END', 'NONE']) {
    const pool = all.filter(x => x.cls === cls).sort((x, y) => rand() - 0.5 || 0);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const seen = new Set(); let k = 0;
    for (const x of pool) { const key = `${x.passageId}:${x.runA}:${x.a.id}`; if (seen.has(key)) continue; seen.add(key); sample.push({ caseId: `${cls}-${++k}`, ...x }); if (k >= perClass) break; }
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'counts.json'), JSON.stringify({ promptVersion: 'v2', passages: rows.length, relationChecks: total, counts, byPassage }, null, 2) + '\n');
  writeFileSync(join(OUT, 'sample.json'), JSON.stringify(sample, null, 2) + '\n');
  return { total, counts, sample: sample.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opt = n => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : undefined; };
  console.log(JSON.stringify(main({ perClass: opt('--per-class') ?? 12, seed: opt('--seed') ?? 20261106 }), null, 1));
}
