// Measures run-to-run agreement of analysis maps (same passage, same prompt, 3 runs).
// Purpose: ceiling for E2 reverse-analysis gates (docs/handoffs/2026-11-06-gold-based-generation-experiment.md).
// Local only: reads saved runs, no external requests.
// Usage: node scripts/measure-map-run-agreement.mjs [--out <dir>]
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ws = s => s.replace(/\s+/g, '');

// Locate each proposition's sourceQuote in the passage; returns Map propId -> Uint8Array mask over the whole passage.
export function propMasks(map, paragraphs) {
  let offset = 0; const base = {}; const total = paragraphs.reduce((n, p) => n + p.text.length, 0);
  for (const p of paragraphs) { base[p.paragraphId] = offset; offset += p.text.length; }
  const masks = new Map(); const unlocated = [];
  for (const prop of map.propositions ?? []) {
    const para = paragraphs.find(p => p.paragraphId === prop.paragraphId);
    const m = new Uint8Array(total);
    let start = para ? para.text.indexOf(prop.sourceQuote) : -1, len = prop.sourceQuote.length;
    if (para && start < 0 && prop.sourceQuote) {
      // whitespace-tolerant fallback: map normalized index back to raw index
      const idx = []; let norm = '';
      for (let i = 0; i < para.text.length; i++) if (!/\s/.test(para.text[i])) { idx.push(i); norm += para.text[i]; }
      const q = ws(prop.sourceQuote), k = norm.indexOf(q);
      if (k >= 0 && q.length) { start = idx[k]; len = idx[k + q.length - 1] - start + 1; }
    }
    if (start < 0 || !prop.sourceQuote) { unlocated.push(prop.id); masks.set(prop.id, m); continue; }
    m.fill(1, base[prop.paragraphId] + start, base[prop.paragraphId] + start + len);
    masks.set(prop.id, m);
  }
  return { masks, unlocated, total };
}

// Every node (proposition or higher) -> { kind, mask } with mask = union of descendant proposition spans.
export function nodeMasks(map, paragraphs) {
  const { masks, unlocated, total } = propMasks(map, paragraphs);
  const byId = new Map((map.nodes ?? []).map(n => [n.id, n]));
  const memo = new Map();
  const maskOf = (id, seen = new Set()) => {
    if (masks.has(id)) return masks.get(id);
    if (memo.has(id)) return memo.get(id);
    const n = byId.get(id); const m = new Uint8Array(total);
    if (n && !seen.has(id)) { seen.add(id); for (const c of n.childIds ?? []) { const cm = maskOf(c, seen); for (let i = 0; i < total; i++) m[i] |= cm[i]; } }
    memo.set(id, m); return m;
  };
  const out = new Map();
  for (const p of map.propositions ?? []) out.set(p.id, { kind: 'PROP', mask: maskOf(p.id) });
  for (const n of map.nodes ?? []) out.set(n.id, { kind: n.kind, mask: maskOf(n.id) });
  return { nodes: out, unlocated };
}

export function iou(a, b) {
  let inter = 0, uni = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] & b[i]) inter++; if (a[i] | b[i]) uni++; }
  return uni === 0 ? 0 : inter / uni;
}

// Best match in B for each node of A. sameKind: restrict candidates to same kind.
export function bestMatches(A, B, { sameKind = false } = {}) {
  const res = new Map();
  for (const [id, a] of A) {
    let best = { id: null, iou: 0 };
    for (const [bid, b] of B) {
      if (sameKind && b.kind !== a.kind) continue;
      const v = iou(a.mask, b.mask); if (v > best.iou) best = { id: bid, iou: v };
    }
    res.set(id, best);
  }
  return res;
}

export function compareRuns(mapA, mapB, paragraphs, { thresholds = [0.3, 0.5, 0.7], twistTargets = [], typesA = null, typesB = null } = {}) {
  const A = nodeMasks(mapA, paragraphs).nodes, B = nodeMasks(mapB, paragraphs).nodes;
  const any = bestMatches(A, B), same = bestMatches(A, B, { sameKind: true });
  const kinds = [...new Set([...A.values()].map(n => n.kind))];
  const rate = (ids, matches, t) => ids.length ? ids.filter(id => matches.get(id).iou >= t).length / ids.length : null;
  const allIds = [...A.keys()];
  const nodeAgreement = Object.fromEntries(thresholds.map(t => [t, rate(allIds, any, t)]));
  const sameKindAgreement = Object.fromEntries(thresholds.map(t => [t, rate(allIds, same, t)]));
  const byKind = Object.fromEntries(kinds.map(k => { const ids = allIds.filter(id => A.get(id).kind === k); return [k, { n: ids.length, any: rate(ids, any, 0.5), same: rate(ids, same, 0.5) }]; }));
  // Relations: A edge preserved if B has an edge between the matched nodes (IoU >= 0.5).
  const bEdges = new Set((mapB.relations ?? []).map(r => `${r.fromId}>${r.toId}`));
  const bUndirected = new Set((mapB.relations ?? []).flatMap(r => [`${r.fromId}>${r.toId}`, `${r.toId}>${r.fromId}`]));
  let directed = 0, undirected = 0; const rels = mapA.relations ?? [];
  for (const r of rels) {
    const f = any.get(r.fromId), t = any.get(r.toId);
    if (!f || !t || f.iou < 0.5 || t.iou < 0.5) continue;
    if (bEdges.has(`${f.id}>${t.id}`)) directed++;
    if (bUndirected.has(`${f.id}>${t.id}`)) undirected++;
  }
  // Loose: B edge whose endpoints each overlap A's endpoints (IoU >= 0.5), same direction; best by min IoU.
  let loose = 0, typed = 0, typeSame = 0; const typePairs = [];
  for (const r of rels) {
    const fa = A.get(r.fromId), ta = A.get(r.toId); if (!fa || !ta) continue;
    let best = null, bestScore = 0;
    for (const rb of mapB.relations ?? []) {
      const fb = B.get(rb.fromId), tb = B.get(rb.toId); if (!fb || !tb) continue;
      const sc = Math.min(iou(fa.mask, fb.mask), iou(ta.mask, tb.mask));
      if (sc >= 0.5 && sc > bestScore) { best = rb; bestScore = sc; }
    }
    if (!best) continue;
    loose++;
    if (typesA && typesB && typesA[r.id] && typesB[best.id]) { typed++; if (typesA[r.id] === typesB[best.id]) typeSame++; else typePairs.push(`${typesA[r.id]}/${typesB[best.id]}`); }
  }
  const tt = twistTargets.filter(id => A.has(id));
  return {
    nodeCount: A.size, nodeAgreement, sameKindAgreement, byKind,
    relationCount: rels.length,
    relationDirected: rels.length ? directed / rels.length : null,
    relationUndirected: rels.length ? undirected / rels.length : null,
    relationLoose: rels.length ? loose / rels.length : null,
    relationType: typed ? { n: typed, same: typeSame / typed, diffs: typePairs } : null,
    twistTargets: tt.length ? { n: tt.length, missingInA: twistTargets.length - tt.length, preserved: tt.filter(id => any.get(id).iou >= 0.5).length / tt.length,
      misses: tt.filter(id => any.get(id).iou < 0.5).map(id => ({ id, bestIou: +any.get(id).iou.toFixed(2) })) } : null,
  };
}

// ---- discovery ----
function findRunSets(root) {
  const sets = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = join(d, e.name);
      if (e.name === 'runs' && existsSync(join(p, 'map-r1.json')) && !d.endsWith('rerun-r2')) sets.push(d);
      else walk(p);
    }
  };
  walk(root);
  return sets.sort();
}

function loadSet(dir) {
  const run = JSON.parse(readFileSync(join(dir, 'RUN.json'), 'utf8'));
  const paths = [1, 2, 3].map(i => {
    const p = join(dir, 'runs', `map-r${i}.json`), alt = join(dir, 'rerun-r2', 'runs', `map-r${i}.json`);
    return existsSync(p) ? p : existsSync(alt) ? alt : null;
  });
  if (paths.some(p => !p)) return { dir, skip: 'missing run' };
  const passage = JSON.parse(readFileSync(run.sourceFile, 'utf8'));
  const maps = paths.map(p => JSON.parse(readFileSync(p, 'utf8')));
  const frozenPath = join(dir, 'frozen-map.json');
  let frozenIndex = null;
  if (existsSync(frozenPath)) { const f = JSON.stringify(JSON.parse(readFileSync(frozenPath, 'utf8'))); frozenIndex = maps.findIndex(m => JSON.stringify(m) === f); if (frozenIndex < 0) frozenIndex = 'edited'; }
  const prompt = /v2/.test(run.promptFile ?? '') ? 'v2' : 'v1';
  // Existing per-run relation classification (relation-classify heldout: <id>-r<n>/classify.json).
  const pid = run.passageId ?? passage.passageId;
  const cls = [1, 2, 3].map(i => join(dirname(dirname(dir)), 'classify', `${pid}-r${i}`, 'classify.json'));
  const types = cls.every(existsSync) ? cls.map(f => Object.fromEntries(JSON.parse(readFileSync(f, 'utf8')).items.map(it => [it.id, it.type]))) : null;
  return { dir, passageId: pid, prompt, paragraphs: passage.paragraphs, maps, paths, frozenIndex, types };
}

// Choice-link frozen files whose ids refer to a given frozen map.
const CHOICE_LINK = {
  'docs/experiments/analysis-gold-ui-2026-10-21': 'docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen',
  'docs/experiments/sns-diagnostic-gold-2026-11-05': 'docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/frozen',
  // set E horse-race links use the calibration frozen map (sns-diagnostic-gold-2026-11-05/targets.json)
  'docs/experiments/analysis-gold-calibration-2026-10-20/horse-race-reporting': 'docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/frozen',
};
function twistTargetsFor(set) {
  const root = Object.keys(CHOICE_LINK).find(r => set.dir.startsWith(r));
  if (!root) return [];
  const f = join(CHOICE_LINK[root], `${set.passageId}.json`);
  if (!existsSync(f)) return [];
  const j = JSON.parse(readFileSync(f, 'utf8'));
  return [...new Set(j.questions.flatMap(q => q.choices.flatMap(c => c.parts.flatMap(p => p.twistTargetIds ?? []))))];
}

const mean = xs => { const v = xs.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function main({ out = 'docs/experiments/map-run-agreement-2026-11-06' } = {}) {
  const sets = findRunSets('docs/experiments').map(loadSet);
  const rows = [];
  for (const s of sets) {
    if (s.skip) { rows.push({ dir: s.dir, skip: s.skip }); continue; }
    const tts = twistTargetsFor(s);
    const pairs = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) {
      pairs.push({ a: a + 1, b: b + 1, ...compareRuns(s.maps[a], s.maps[b], s.paragraphs, { twistTargets: a === s.frozenIndex ? tts : [], typesA: s.types?.[a], typesB: s.types?.[b] }) });
    }
    const unlocated = s.maps.map(m => nodeMasks(m, s.paragraphs).unlocated.length);
    const fromFrozen = typeof s.frozenIndex === 'number' ? pairs.filter(p => p.a === s.frozenIndex + 1) : [];
    rows.push({
      dir: s.dir, passageId: s.passageId, prompt: s.prompt, frozenRun: typeof s.frozenIndex === 'number' ? s.frozenIndex + 1 : s.frozenIndex,
      unlocatedProps: unlocated,
      allPairs: {
        node05: mean(pairs.map(p => p.nodeAgreement[0.5])), node03: mean(pairs.map(p => p.nodeAgreement[0.3])), node07: mean(pairs.map(p => p.nodeAgreement[0.7])),
        sameKind05: mean(pairs.map(p => p.sameKindAgreement[0.5])),
        relDirected: mean(pairs.map(p => p.relationDirected)), relUndirected: mean(pairs.map(p => p.relationUndirected)),
        relLoose: mean(pairs.map(p => p.relationLoose)),
        relType: s.types ? mean(pairs.map(p => p.relationType?.same)) : null,
      },
      fromFrozen: fromFrozen.length ? {
        node05: mean(fromFrozen.map(p => p.nodeAgreement[0.5])), sameKind05: mean(fromFrozen.map(p => p.sameKindAgreement[0.5])),
        relDirected: mean(fromFrozen.map(p => p.relationDirected)), relLoose: mean(fromFrozen.map(p => p.relationLoose)),
        twist: fromFrozen[0].twistTargets ? { n: fromFrozen[0].twistTargets.n, preserved: mean(fromFrozen.map(p => p.twistTargets.preserved)), misses: fromFrozen.map(p => ({ to: p.b, misses: p.twistTargets.misses })) } : null,
      } : null,
      pairs,
    });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'results.json'), JSON.stringify(rows, null, 2) + '\n');
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--out');
  const rows = main(i > 0 ? { out: process.argv[i + 1] } : {});
  const f = x => x == null ? '  -  ' : (x * 100).toFixed(0).padStart(4) + '%';
  console.log('prompt passage                                   frz unloc  node.3 node.5 node.7 same.5 relDir relUnd relLoo relTyp | frz:node.5 same.5 relLoo twist');
  for (const r of rows) {
    if (r.skip) { console.log('SKIP', r.dir, r.skip); continue; }
    const a = r.allPairs, z = r.fromFrozen;
    console.log(`${r.prompt}     ${(r.dir.replace('docs/experiments/', '')).slice(0, 40).padEnd(40)} ${String(r.frozenRun ?? '-').padStart(3)} ${r.unlocatedProps.join('/').padEnd(6)} ${f(a.node03)} ${f(a.node05)} ${f(a.node07)} ${f(a.sameKind05)} ${f(a.relDirected)} ${f(a.relUndirected)} ${f(a.relLoose)} ${f(a.relType)} | ${z ? `${f(z.node05)} ${f(z.sameKind05)} ${f(z.relLoose)} ${z.twist ? f(z.twist.preserved) + ` (n=${z.twist.n})` : ''}` : ''}`);
  }
}
