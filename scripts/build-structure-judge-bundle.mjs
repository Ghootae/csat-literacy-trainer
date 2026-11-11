// D-0215 A5: input bundle for the structure judges (JUDGE-STRUCTURE-v1.md) and the P1 solve check (SOLVE-PROMPT-v1.md). No external calls.
// One bundle: 31 exam items (8 passages, no vocabulary) + E1 v3 generated items (A2, B; 20) + with --include-p1 the P1 items (8).
// Output (judge/): j1/<passageId>.json and j2/<passageId>.json (same items, different order per judge), blind-key.json (id -> source info; judges never read it),
// solve-input-p1/<passageId>.json (--include-p1 only; passage, stem, <보기>, choices; no answer).
// Usage: node scripts/build-structure-judge-bundle.mjs [--include-p1] [--out <dir>] [--p1-runs <dir>]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPassage, hash } from './run-analysis-map-gongsun.mjs';
import { loadQuestions } from './run-choice-link.mjs';
import { displayParagraphs, displayPath } from './run-item-solve-check.mjs';
import { EXP_DIR as P1_DIR } from './run-principle-pilot.mjs';

export const STRUCTURE_DIR = 'docs/experiments/principle-application-structure-2026-11-09';
export const OUT_DIR = `${STRUCTURE_DIR}/judge`;
export const E1_DIR = 'docs/experiments/gold-item-generation-2026-11-06';
export const E1_TARGETS = `${E1_DIR}/targets.json`;
export const UI_TARGETS = 'docs/experiments/choice-link-2026-10-22/targets-ui.json';
export const FIXED_PATHS = ['docs/experiments/sns-diagnostic-gold-2026-11-05/supplement-fixed.json', 'docs/experiments/choice-link-2026-10-22/supplement-fixed.json'];
export const E1_BLIND_KEY = `${E1_DIR}/v3/quality/blind-key.json`;
export const E1_RUNS = `${E1_DIR}/v3/runs`;
export const P1_RUNS = `${P1_DIR}/runs`;
export const E1_PASSAGES = ['corporate-law', 'surface-tension-laplace', 'audio-perceptual-coding', 'plastic-polymerization'];
export const UI_PASSAGES = ['gongsun-long-later-mohists', 'dopamine-motor-control', 'information-asymmetry-free-marketplace', 'mrna-vaccine-lipid-nanoparticle'];
export const SEEDS = { j1: 20261109, j2: 20261110 }, ID_SEED = 20261108;
// Exam items whose symbols in the stem and choices refer to marks inside the <보기>; they stay (the key lists them as a possible source clue).
export const KEEP_SYMBOL_ITEMS = ['plastic-polymerization#10'];
// Stem types of the 31 exam items (D-0215 handoff 4.3), kept as a constant. Numbers per passage.
export const STEM_TABLE = {
  'corporate-law': { CONTENT_MATCH: [10], CONCEPT: [11], COMPARE_TWO: [12], BOGI_APPLY: [13] },
  'surface-tension-laplace': { CONTENT_MATCH: [14], CONCEPT: [15], BOGI_APPLY: [16] },
  'audio-perceptual-coding': { CONTENT_MATCH: [15], CONCEPT: [16], BOGI_APPLY: [17], METHOD: [14] },
  'plastic-polymerization': { CONTENT_MATCH: [8], CONCEPT: [9], BOGI_APPLY: [10] },
  'gongsun-long-later-mohists': { CONTENT_MATCH: [10], CONCEPT: [11], BOGI_APPLY: [12, 13] },
  'dopamine-motor-control': { CONTENT_MATCH: [10], COMPARE_TWO: [12], BOGI_APPLY: [11, 13] },
  'information-asymmetry-free-marketplace': { CONTENT_MATCH: [11], COMPARE_TWO: [12], BOGI_APPLY: [13], METHOD: [10] },
  'mrna-vaccine-lipid-nanoparticle': { CONCEPT: [16, 17, 18, 20], BOGI_APPLY: [19] },
};
const SYMBOLS = /[㉠-㉿ⓐ-ⓩ]/u, SYMBOLS_G = /[㉠-㉿ⓐ-ⓩ]/gu;
export const FORBIDDEN_KEYS = ['source', 'condition', 'realNumber', 'slot', 'itemKey', 'explanation', 'explanationSummary', 'truth', 'dataUrl', 'stemType', 'hasBogi', 'replaced', 'direction'];

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const oneLine = s => s.replace(/\s+/gu, ' ').trim();
// Stem direction (D-0224, key only, never shown to judges): REVERSE when the stem asks for a reason or cause (result -> cause), else FORWARD (condition -> result).
// '원인' right after an amount ('1,000원인 회사') is the currency word, not 'cause'.
export const directionOf = stem => /이유|(?<![\d,십백천만억])원인|때문/u.test(stem) ? 'REVERSE' : 'FORWARD';
const stemTypeOf = (passageId, number) => Object.entries(STEM_TABLE[passageId]).find(([, ns]) => ns.includes(number))?.[0] ?? null;
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Per-passage seed, so rebuilding with P1 leaves passages without P1 items unchanged.
const shuffle = (xs, seed, passageId) => { const rnd = mulberry32(seed + parseInt(hash(passageId).slice(0, 6), 16)), a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// <보기> text with its marks written in (marker before an underlined phrase, [ ] around a boxed one), from the raw supplement blocks; a fixed transcription replaces it.
function bogiTextOf(rawQ, fixed) {
  if (fixed?.transcribedText != null) return fixed.transcribedText.trim();
  return rawQ.prompt_blocks.filter(b => b.type === 'supplement').map(b => {
    let text = b.text, limit = text.length;
    for (const e of [...(b.elements ?? [])].filter(x => x.kind !== 'paragraph' && x.symbol).sort((x, y) => y.start - x.start)) {
      if (text.slice(e.start, e.end) !== e.text || e.end > limit) throw new Error(`BOGI_MARK: question ${rawQ.number} ${e.symbol}`);
      text = text.slice(0, e.start) + (e.style === 'box' ? `[${e.text}]` : `${e.symbol}${e.text}`) + text.slice(e.end); limit = e.start;
    }
    return text.trim();
  }).join('\n');
}
// Absolute image paths of a raw question, in the order loadQuestion finds them (stem/supplement blocks, then choices), each checked to exist.
function imagePathsOf(rawQ, assetsDir) {
  const found = new Map(), collect = h => { for (const r of [...(h.images ?? []), ...(h.elements ?? []).filter(e => e.kind === 'image' && e.local_path)]) if (!found.has(r.image_id)) found.set(r.image_id, r.local_path); };
  for (const b of rawQ.prompt_blocks) collect(b);
  for (const c of rawQ.choices) collect(c);
  return [...found.values()].map(p => { const f = resolve(assetsDir, p); if (!existsSync(f)) throw new Error(`IMAGE_MISSING: question ${rawQ.number} ${f}`); return f; });
}
function replacementsOf(e1Key) {
  const m = new Map();
  for (const k of e1Key.key.filter(x => x.source === 'EXAM')) m.set(`${k.realId.split('#')[0]}#${k.realNumber}`, k.replacements);
  return m;
}
const symbolsIn = s => [...new Set(s.match(SYMBOLS_G) ?? [])];

// Exam items of one passage target -> [{ pool entry }]. Throws when the question set, the stem-type table or hasBogi disagree.
function examItems(t, fixed, replacements, paragraphs) {
  const loaded = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, fixed), raw = readJson(t.questionsPath), isE1 = E1_PASSAGES.includes(t.passageId);
  const wanted = Object.values(STEM_TABLE[t.passageId]).flat().sort((a, b) => a - b), got = loaded.questions.map(q => q.number).sort((a, b) => a - b);
  if (wanted.join() !== got.join()) throw new Error(`EXAM_SET: ${t.passageId} table ${wanted.join()} != loaded ${got.join()}`);
  return loaded.questions.map(q => {
    const rawQ = raw.questions.find(x => x.number === q.number), stemType = stemTypeOf(t.passageId, q.number);
    const hasBogi = rawQ.prompt_blocks.length >= 2 || rawQ.prompt_blocks.some(b => b.type === 'supplement');
    if (hasBogi !== (stemType === 'BOGI_APPLY')) throw new Error(`HAS_BOGI: ${t.passageId} #${q.number} hasBogi ${hasBogi} vs ${stemType}`);
    const fx = fixed.find(f => f.setId === loaded.setId && f.questionNumber === q.number), notes = [], applied = [];
    let stem = oneLine(q.stem.replace(/<보기>/gu, '〈보기〉')), choices = q.choices.map(c => ({ number: c.number, text: oneLine(c.text) }));
    if (stem !== oneLine(q.stem)) notes.push('<보기> in the stem was rewritten as 〈보기〉 (generated stems use 〈보기〉; the bracket style would reveal the source)');
    const id = `${t.passageId}#${q.number}`;
    if (isE1) {
      for (const r of replacements.get(id) ?? []) {
        if (r.field === 'stem') { if (!stem.includes(r.from)) throw new Error(`REPLACE: ${id} stem "${r.from}"`); stem = stem.replace(r.from, r.to); }
        else { const c = choices.find(x => x.number === r.field); if (!c?.text.includes(r.from)) throw new Error(`REPLACE: ${id} #${r.field} "${r.from}"`); c.text = c.text.replace(r.from, r.to); }
        applied.push(r);
      }
      if (!KEEP_SYMBOL_ITEMS.includes(id) && (SYMBOLS.test(stem) || choices.some(c => SYMBOLS.test(c.text)))) throw new Error(`SYMBOL_LEFT: ${id}`);
    }
    const bogi = hasBogi ? bogiTextOf(rawQ, fx) : null, left = symbolsIn([stem, ...choices.map(c => c.text)].join(''));
    if (isE1 && (left.length || (bogi && SYMBOLS.test(bogi)))) notes.push(`SYMBOLS_KEPT: ${[...new Set([...left, ...symbolsIn(bogi ?? '')])].join('')} (marks inside the <보기>; a possible source clue)`);
    if (left.length) { const hay = paragraphs.join('\n') + '\n' + (bogi ?? ''); for (const s of left) if (!hay.includes(s)) throw new Error(`SYMBOL_NOT_IN_PASSAGE: ${id} ${s}`); }
    return { src: { source: 'EXAM', realNumber: q.number, stemType, hasBogi, replaced: applied.length > 0, notes },
      item: { stem, bogi, images: imagePathsOf(rawQ, t.assetsDir), choices, answer: q.answer } };
  });
}

// E1 v3 generated items: items.json plus the slot of design.json (answer and scope).
function e1Items(passageId, runsDir) {
  return ['A2', 'B'].flatMap(condition => {
    const dir = `${runsDir}/${condition}/${passageId}`, items = readJson(`${dir}/items.json`).items, design = readJson(`${dir}/design.json`).slots;
    return items.map(it => {
      const d = design.find(s => s.slot === it.slot);
      if (!d || !Number.isInteger(d.answer) || !['PASSAGE_WIDE', 'CONCEPT'].includes(d.scope)) throw new Error(`E1_DESIGN: ${dir} slot ${it.slot} has no answer/scope`);
      if (it.answer !== d.answer) throw new Error(`E1_ANSWER: ${dir} slot ${it.slot} items ${it.answer} != design ${d.answer}`);
      return { src: { source: 'E1_V3', condition, slot: it.slot, stemType: d.scope === 'PASSAGE_WIDE' ? 'CONTENT_MATCH' : 'CONCEPT', hasBogi: false, replaced: false, notes: [] },
        item: { stem: oneLine(it.stem), bogi: null, images: [], choices: it.choices.map(c => ({ number: c.number, text: oneLine(c.text) })), answer: d.answer } };
    });
  });
}
function p1Items(passageId, runsDir, itemKeys) {
  return itemKeys.flatMap(k => {
    const p = `${runsDir}/${passageId}/item-${k}.json`; if (!existsSync(p)) return [];
    const it = readJson(p);
    return [{ src: { source: 'P1', itemKey: k, stemType: k === 'a' ? 'CONCEPT' : 'BOGI_APPLY', hasBogi: it.bogi !== null, replaced: false, notes: [] },
      item: { stem: oneLine(it.stem), bogi: it.bogi, images: [], choices: it.choices.map(c => ({ number: c.number, text: oneLine(c.text) })), answer: it.answer } }];
  });
}

export function build({ includeP1 = false, p1Runs = P1_RUNS, e1Runs = E1_RUNS } = {}) {
  const fixed = FIXED_PATHS.filter(existsSync).flatMap(p => readJson(p).items), e1Key = readJson(E1_BLIND_KEY), replacements = replacementsOf(e1Key);
  const targets = [...readJson(E1_TARGETS).filter(t => E1_PASSAGES.includes(t.passageId)), ...readJson(UI_TARGETS).filter(t => UI_PASSAGES.includes(t.passageId))];
  const judges = { j1: [], j2: [] }, key = {}, solveInputP1 = [], p1Missing = [];
  for (const t of targets) {
    const isE1 = E1_PASSAGES.includes(t.passageId);
    // E1 passages: the unmarked generation-side text (generated items must read the same passage). Developer-screen passages: the display text with marks.
    const paragraphs = isE1 ? loadPassage(t.passagesDir, t.passageId).passage.paragraphs.map(p => p.text) : displayParagraphs(readJson(displayPath(t)));
    const pool = [...examItems(t, fixed, replacements, paragraphs), ...(isE1 ? e1Items(t.passageId, e1Runs) : []), ...(isE1 && includeP1 ? p1Items(t.passageId, p1Runs, ['a', 'b']) : [])];
    if (isE1 && includeP1 && pool.filter(x => x.src.source === 'P1').length < 2) p1Missing.push(t.passageId);
    const withId = shuffle(pool, ID_SEED, t.passageId).map((x, i) => ({ ...x, id: `${t.passageId}#${String(i + 1).padStart(2, '0')}` }));
    for (const x of withId) key[x.id] = { ...x.src, direction: directionOf(x.item.stem) };
    let order1 = shuffle(withId, SEEDS.j1, t.passageId), order2 = shuffle(withId, SEEDS.j2, t.passageId);
    if (order1.map(x => x.id).join() === order2.map(x => x.id).join()) order2 = [...order2.slice(1), order2[0]];
    for (const [name, order] of [['j1', order1], ['j2', order2]]) judges[name].push({ passageId: t.passageId, paragraphs, items: order.map(x => ({ id: x.id, ...x.item })) });
    if (isE1 && includeP1) {
      const p1 = pool.filter(x => x.src.source === 'P1');
      if (p1.length) solveInputP1.push({ passageId: t.passageId, paragraphs, items: p1.map(x => ({ id: `${t.passageId}#${x.src.itemKey}`, stem: x.item.stem, bogi: x.item.bogi, choices: x.item.choices })) });
    }
  }
  return { judges, key: { note: '판정 전 열지 않는다', seeds: { ids: ID_SEED, ...SEEDS }, includeP1, key }, solveInputP1, p1Missing };
}

export function write(out = OUT_DIR, opts = {}) {
  const r = build(opts), put = (p, v) => { mkdirSync(resolve(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
  for (const j of ['j1', 'j2']) for (const p of r.judges[j]) put(`${out}/${j}/${p.passageId}.json`, p);
  put(`${out}/blind-key.json`, r.key);
  for (const p of r.solveInputP1) put(`${out}/solve-input-p1/${p.passageId}.json`, p);
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const r = write(opt('--out') ?? OUT_DIR, { includeP1: argv.includes('--include-p1'), p1Runs: opt('--p1-runs') ?? P1_RUNS });
  const count = list => list.reduce((a, p) => a + p.items.length, 0);
  console.log(JSON.stringify({ passagesPerJudge: r.judges.j1.length, itemsPerJudge: count(r.judges.j1), exam: Object.values(r.key.key).filter(k => k.source === 'EXAM').length,
    e1v3: Object.values(r.key.key).filter(k => k.source === 'E1_V3').length, p1: Object.values(r.key.key).filter(k => k.source === 'P1').length, solveInputP1Files: r.solveInputP1.length, p1Missing: r.p1Missing }, null, 2));
}
