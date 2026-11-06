// D-0206 보완 2(23): one blind judging bundle of 50 items for JUDGE-DEPTH-v1.md.
// A2 v3, B v3, A2 v2, B v2 (10 items each) + the 10 exam items, per passage, shuffled with a fixed seed, source hidden.
// Passage text: the unmarked generation-side text (v2/quality/blind-input.json) so that every item reads the same passage.
// Exam items carrying circled symbols get the symbol replaced by the concept it marks (listed in the key), so symbols do not reveal the source.
// Usage: node scripts/build-e1-depth-blind-input.mjs   (writes v3/quality/blind-input.json and blind-key.json; refuses to overwrite)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const EXP = 'docs/experiments/gold-item-generation-2026-11-06';
export const SEED = 20261108;
export const GROUPS = [
  { condition: 'A2', promptVersion: 'v3', dir: `${EXP}/v3/runs/A2` },
  { condition: 'B', promptVersion: 'v3', dir: `${EXP}/v3/runs/B` },
  { condition: 'A2', promptVersion: 'v2', dir: `${EXP}/v2/runs/A2` },
  { condition: 'B', promptVersion: 'v2', dir: `${EXP}/v2/runs/B` },
];
// Exam symbol replacements: [item id, field ('stem' | choice number), from, to].
export const SYMBOL_REPLACEMENTS = [
  ['corporate-law#R3', 'stem', '㉠과 ㉡에 대한', '무상 증자와 배당에 대한'],
  ['corporate-law#R3', 1, '㉠은 ㉡과', '무상 증자는 배당과'],
  ['corporate-law#R3', 2, '㉡은 ㉠과', '배당은 무상 증자와'],
  ['corporate-law#R3', 3, '㉠과 ㉡은', '무상 증자와 배당은'],
  ['corporate-law#R3', 4, '㉠과 ㉡은', '무상 증자와 배당은'],
  ['corporate-law#R3', 5, '㉠과 ㉡은', '무상 증자와 배당은'],
  ['surface-tension-laplace#R2', 'stem', '㉠에 대해', '두 기포가 합쳐져 더 큰 기포 하나가 만들어지는 현상에 대해'],
  ['plastic-polymerization#R2', 'stem', '㉠에 대한', '에틸렌의 중합 과정에 대한'],
];
const SYMBOLS = /[㉠-㉿ⓐ-ⓩ]/u;
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (xs, rnd) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function applyReplacements(item) {
  const out = JSON.parse(JSON.stringify(item)), applied = [];
  for (const [id, field, from, to] of SYMBOL_REPLACEMENTS) {
    if (id !== item.id) continue;
    if (field === 'stem') { if (!out.stem.includes(from)) throw new Error(`REPLACE: ${id} stem "${from}"`); out.stem = out.stem.replace(from, to); }
    else { const c = out.choices.find(x => x.number === field); if (!c?.text.includes(from)) throw new Error(`REPLACE: ${id} #${field} "${from}"`); c.text = c.text.replace(from, to); }
    applied.push({ field, from, to });
  }
  if (SYMBOLS.test(out.stem) || out.choices.some(c => SYMBOLS.test(c.text))) throw new Error(`SYMBOL_LEFT: ${item.id}`);
  return { item: out, applied };
}

export function build() {
  const passages = readJson(`${EXP}/v2/quality/blind-input.json`), real = readJson(`${EXP}/v2/quality-real/input.json`), realKey = readJson(`${EXP}/v2/quality-real/key.json`).key;
  const rnd = mulberry32(SEED), input = [], key = [];
  for (const p of passages) {
    const pool = [];
    for (const g of GROUPS) for (const it of readJson(`${g.dir}/${p.passageId}/items.json`).items)
      pool.push({ src: { source: 'GENERATED', condition: g.condition, promptVersion: g.promptVersion, slot: it.slot, answer: it.answer }, item: { stem: it.stem, stemPolarity: it.stemPolarity, choices: it.choices } });
    for (const it of real.find(x => x.passageId === p.passageId).items) {
      const { item, applied } = applyReplacements(it);
      pool.push({ src: { source: 'EXAM', realId: it.id, realNumber: realKey.find(k => k.id === it.id)?.realNumber ?? null, answer: it.answerKey, replacements: applied }, item: { stem: item.stem, stemPolarity: item.stemPolarity, choices: item.choices } });
    }
    const items = shuffle(pool, rnd).map((x, i) => { const id = `${p.passageId}#${String(i + 1).padStart(2, '0')}`; key.push({ id, ...x.src }); return { id, ...x.item }; });
    input.push({ passageId: p.passageId, paragraphs: p.paragraphs, items });
  }
  return { input, key };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = `${EXP}/v3/quality`; mkdirSync(dir, { recursive: true });
  if (existsSync(`${dir}/blind-input.json`)) throw new Error('EXISTS: v3/quality/blind-input.json');
  const { input, key } = build();
  writeFileSync(`${dir}/blind-input.json`, JSON.stringify(input, null, 2) + '\n');
  writeFileSync(`${dir}/blind-key.json`, JSON.stringify({ note: '판정 전 열지 않는다', seed: SEED, key }, null, 2) + '\n');
  console.log(JSON.stringify({ passages: input.length, items: input.reduce((a, p) => a + p.items.length, 0) }));
}
