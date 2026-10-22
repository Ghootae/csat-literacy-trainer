// D-0162 (supplement 4): choice-link generation v4 (closed twist-type list; (가)/(나) section sets; truth fixed from the answer key and given as input; per choice: readingGap, source/operation parts, map links, twist) for non-vocabulary questions of a passage.
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-22-choice-link-generator.md (sections 보완 v4, v5)
// Usage: node --env-file-if-exists=.env scripts/run-choice-link.mjs [--dry-run] --targets <json> --out <dir> [--prompt <path>] [--fixed <json>] [--runs <n>] [--round <k>] [--max-requests <n>] [--usd-cap <x>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, buildInput as buildPassageInput, instructionsFrom, splitSentences, usageCost, reserveUsd, hash, MODEL, RATES, TIMEOUT_MS } from './run-analysis-map-gongsun.mjs';
import { isConnectionError } from './run-analysis-judge-gongsun.mjs';
import { TYPES } from './run-relation-classify.mjs';

export const PROMPT_PATH = 'docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v5.md';
export const FIXED_PATH = 'docs/experiments/choice-link-2026-10-22/supplement-fixed.json';
export const LIMITS = { maxRequests: 6, usdCap: 2 };
export const TOKENS_PER_QUESTION = 6000, MAX_OUTPUT_CAP = 32000;
export { MODEL, RATES, TIMEOUT_MS, usageCost, reserveUsd };

export const SOURCES = ['PASSAGE', 'SUPPLEMENT', 'BOTH', 'NONE'];
export const OPERATIONS = ['RESTATE', 'INFER', 'APPLY'];
export const READING_GAPS = ['NONE', 'IMPLICIT_PREMISE', 'STRICT_READING'];
const POLARITIES = ['SELECT_INCORRECT', 'SELECT_CORRECT', 'OTHER'];
export const stemPolarity = stem => /않은 것|않는 것/u.test(stem) ? 'SELECT_INCORRECT' : /적절한|일치하는/u.test(stem) ? 'SELECT_CORRECT' : 'OTHER';
export const TWIST_TYPES = ['NEGATION', 'DIRECTION', 'SUBSTITUTION', 'CONFLATION', 'CAUSE_SWAP', 'WRONG_REASON', 'CONDITION_SHIFT', 'HOLDER_SWAP', 'PAIR_SWAP', 'ABSOLUTIZE', 'SCOPE_EXTEND', 'DEGREE', 'ADDED_CONTENT', 'ADDED_METHOD', 'OTHER'];
export const TWIST_BRANCH = { NEGATION: 1, DIRECTION: 1, SUBSTITUTION: 1, CONFLATION: 1, CAUSE_SWAP: 2, WRONG_REASON: 2, CONDITION_SHIFT: 2, HOLDER_SWAP: 3, PAIR_SWAP: 3,
  ABSOLUTIZE: 4, SCOPE_EXTEND: 4, DEGREE: 4, ADDED_CONTENT: 5, ADDED_METHOD: 5, OTHER: '기타' };
export const TWIST_KO = { NEGATION: '긍정·부정 뒤집기', DIRECTION: '방향 뒤집기', SUBSTITUTION: '요소 바꿔치기', CONFLATION: '다른 것을 같은 것으로', CAUSE_SWAP: '원인·근거 바꿔치기',
  WRONG_REASON: '맞는 사실을 엉뚱한 이유로', CONDITION_SHIFT: '조건 옮기기', HOLDER_SWAP: '입장 주인 바꾸기', PAIR_SWAP: '대비 쌍 뒤바꾸기', ABSOLUTIZE: '전칭·절대화',
  SCOPE_EXTEND: '적용 범위 넓히기', DEGREE: '정도 바꾸기', ADDED_CONTENT: '없는 내용 덧붙이기', ADDED_METHOD: '글에 없는 서술 방식', OTHER: '기타' };
const serialize = v => JSON.stringify(v, null, 2) + '\n';
const jsonLine = o => JSON.stringify(o);
const norm = s => s.replace(/\s+/gu, ' ').trim();
const ids = z.array(z.string());

export const OutputSchema = z.strictObject({
  passageId: z.string(),
  questions: z.array(z.strictObject({
    number: z.number().int(),
    stemPolarity: z.enum(POLARITIES),
    extraSegments: z.array(z.strictObject({ id: z.string(), parentId: z.string(), quote: z.string() })),
    choices: z.array(z.strictObject({
      number: z.number().int(),
      readingGap: z.enum(READING_GAPS),
      explanationAgreement: z.enum(['AGREE', 'DIFFER', 'NO_EXPLANATION']),
      note: z.string(),
      parts: z.array(z.strictObject({
        quote: z.string(), source: z.enum(SOURCES), operation: z.enum(OPERATIONS), twisted: z.boolean(),
        twistTargetIds: ids, supportIds: ids, contextIds: ids, inferenceBasisIds: ids,
        twistType: z.enum(TWIST_TYPES).nullable(), twistDetail: z.string(), evidenceQuote: z.string(), choiceQuote: z.string(),
        relationTypeChange: z.strictObject({ original: z.enum(TYPES), claimed: z.enum(TYPES) }).nullable(),
      })),
    })),
  })),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
export const isVocabulary = q => [...(q.source_tags ?? []), q.source_title ?? ''].some(s => s.includes('어휘'))
  || q.prompt_blocks.some(b => b.type === 'stem' && b.text.includes('문맥상'));

// Supplement text -> fixed segments: a line starting with a marker is one segment, other lines are split into sentences. Ids S1.. in order.
const MARKER = /^(?:\([가-힣]\)|[◦•-]|[가-힣]{1,2}:|\(단,)/u;
export function splitSupplement(text) {
  const parts = [];
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean))
    if (MARKER.test(line)) parts.push(line); else for (const s of splitSentences(line)) if (s.text.trim()) parts.push(s.text.trim());
  return parts.map((t, i) => ({ id: `S${i + 1}`, kind: 'TEXT', text: t }));
}
// Marks arrive as offsets into `text` (the joined supplement text); each lands in the segment that contains it, as offsets inside that segment's text.
function attachMarks(segs, text, marks) {
  let cur = 0;
  const ranges = segs.map(sg => { const start = text.indexOf(sg.text, cur); if (start < 0) throw new Error(`SEGMENT_LOCATE: ${sg.id}`); cur = start + sg.text.length; return { start, end: cur }; });
  const out = segs.map(sg => ({ ...sg, marks: [] }));
  for (const m of marks) {
    const i = ranges.findIndex(r => m.start >= r.start && m.start < r.end);
    if (i < 0 || m.end > ranges[i].end) throw new Error(`MARK_SPLIT: ${m.symbol} ${m.start}-${m.end} is not inside one segment`);
    const start = m.start - ranges[i].start, end = m.end - ranges[i].start;
    if (segs[i].text.slice(start, end) !== m.text) throw new Error(`MARK_MISMATCH: ${m.symbol} "${m.text}" vs "${segs[i].text.slice(start, end)}"`);
    out[i].marks.push({ symbol: m.symbol, text: m.text, start, end });
  }
  return out;
}
export function supplementSegments(text, fixed, marks = []) {
  const transcribed = fixed?.transcribedText != null;
  const segs = splitSupplement(transcribed ? fixed.transcribedText : text);
  return [...(transcribed ? segs.map(sg => ({ ...sg, marks: [] })) : attachMarks(segs, text, marks)),
    ...(fixed?.figureElements ?? []).map(f => ({ id: f.id, kind: 'FIGURE', text: f.description, marks: [] }))];
}

// Raw DB question -> { question, images }. Throws on a missing answer, image file, or unfixed supplement figure.
export function loadQuestion(q, rec, assetsDir, setId, fixedItems = []) {
  const answer = rec?.correct_choice;
  if (!Number.isInteger(answer) || !q.choices.some(c => c.number === answer)) throw new Error(`ANSWER_MISSING: question ${q.number}`);
  const stem = [], supplements = [], suppMarks = [], found = new Map();
  const collect = (where, holder) => {
    const refs = [...(holder.images ?? []), ...(holder.elements ?? []).filter(e => e.kind === 'image' && e.local_path)];
    for (const r of refs) if (!found.has(r.image_id)) found.set(r.image_id, { where, localPath: r.local_path, mime: r.mime_type });
  };
  for (const b of q.prompt_blocks) {
    if (b.type === 'stem') stem.push(b.text.trim());
    else if (b.type === 'supplement') {
      const lead = b.text.length - b.text.trimStart().length, base = supplements.join('\n').length + (supplements.length ? 1 : 0);
      for (const e of b.elements ?? []) if (e.kind !== 'paragraph' && e.symbol) {
        if (e.start < lead) throw new Error(`MARK_OFFSET: question ${q.number} ${e.symbol}`);
        suppMarks.push({ symbol: e.symbol, text: e.text, start: base + e.start - lead, end: base + e.end - lead });
      }
      supplements.push(b.text.trim());
    }
    else throw new Error(`UNKNOWN_BLOCK: question ${q.number} ${b.type}`);
    collect(b.type, b);
  }
  for (const c of q.choices) collect('choice', c);
  const fixed = fixedItems.find(f => f.setId === setId && f.questionNumber === q.number) ?? null;
  if (!fixed && [...found.values()].some(f => f.where === 'supplement')) throw new Error(`FIGURE_UNFIXED: question ${q.number}`);
  const images = [...found].map(([imageId, f]) => {
    const file = resolve(assetsDir, f.localPath);
    if (!existsSync(file)) throw new Error(`IMAGE_MISSING: question ${q.number} ${imageId} ${file}`);
    const bytes = readFileSync(file), mime = f.mime ?? MIME[extname(file).toLowerCase()];
    if (!mime) throw new Error(`IMAGE_MIME: question ${q.number} ${imageId}`);
    return { question: q.number, imageId, where: f.where, mime, dataUrl: `data:${mime};base64,${bytes.toString('base64')}`, bytes: bytes.length, sha256: hash(bytes) };
  });
  const polarity = stemPolarity(stem.join('\n'));
  if (polarity === 'OTHER') throw new Error(`POLARITY_OTHER: question ${q.number}`);
  const exp = rec.official_explanation ?? {}, byChoice = new Map((exp.choice_explanations ?? []).map(e => [e.choice_number, e.explanation_ko]));
  return { question: { number: q.number, stem: stem.join('\n'), supplementSegments: supplementSegments(supplements.join('\n'), fixed, suppMarks),
    choices: q.choices.map(c => ({ number: c.number, text: c.text, truth: (polarity === 'SELECT_INCORRECT') === (c.number === answer) ? 'FALSE' : 'TRUE', explanation: byChoice.get(c.number) ?? null })), answer, explanationSummary: exp.detailed_explanation_ko ?? null }, images };
}

// Questions of a set without vocabulary questions; answers and explanations joined from the enrichment record.
export function loadQuestions(questionsPath, answersPath, assetsDir, fixedItems = []) {
  const set = readJson(questionsPath);
  const recs = new Map(readJson(answersPath).questions.map(a => [a.question_number, a]));
  const kept = set.questions.filter(q => !isVocabulary(q)).map(q => loadQuestion(q, recs.get(q.number), assetsDir, set.set_id, fixedItems));
  return { setId: set.set_id, questions: kept.map(k => k.question), images: kept.flatMap(k => k.images) };
}

// map.relations[].relationType is attached by loadTargets from the classify file.
export function buildInput(passage, map, stances, passageMarks, questions) {
  return { passageId: passage.passageId, paragraphs: buildPassageInput(passage).paragraphs, passageMarks,
    map: { propositions: map.propositions.map(p => ({ id: p.id, paragraphId: p.paragraphId, text: p.text })),
      nodes: map.nodes.map(n => ({ id: n.id, kind: n.kind, paragraphId: n.paragraphId, text: n.text, childIds: n.childIds })),
      relations: map.relations.map(r => ({ id: r.id, fromId: r.fromId, toId: r.toId, name: r.name, note: r.note, relationType: r.relationType })) },
    stances: stances.map(s => ({ id: s.id, kind: s.kind, holder: s.holder })), questions };
}
export const maxOutputTokens = n => Math.min(MAX_OUTPUT_CAP, TOKENS_PER_QUESTION * n);
// User content: JSON input, then each image preceded by its [IMAGE q<number> <image_id>] marker.
export function buildRequest(instructions, input, images = []) {
  const content = [{ type: 'input_text', text: serialize(input) }];
  for (const im of images) content.push({ type: 'input_text', text: `[IMAGE q${im.question} ${im.imageId}]` }, { type: 'input_image', image_url: im.dataUrl, detail: 'high' });
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: maxOutputTokens(input.questions.length),
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name: 'choice_link_v4', strict: true, schema: JSON_SCHEMA } } };
}
// Dry-run copy: data URLs replaced by a size/hash note.
export function redactImages(request) {
  const r = structuredClone(request);
  for (const m of r.input) for (const c of m.content) if (c.type === 'input_image') {
    const bytes = Buffer.from(c.image_url.split(',')[1], 'base64');
    c.image_url = `<base64 생략, ${bytes.length} bytes, ${hash(bytes)}>`;
  }
  return r;
}

const item = (id, name, violations, info = []) => ({ id, name, pass: violations.length === 0, violations, ...(info.length ? { info } : {}) });
const gapOk = g => { const rest = g.replace(/[\s\p{P}]/gu, ''); return rest === '' || (rest.length <= 2 && /^[가-힣]+$/u.test(rest)); };
const REL_TYPE = r => r.relationType;
// ctx: { passageId, map (relations carry relationType), questions (as in buildInput), paragraphs: [text] }.
export function validateChoiceLink(out, ctx) {
  const mapIds = new Set([...ctx.map.propositions, ...ctx.map.nodes, ...ctx.map.relations].map(x => x.id));
  const relType = new Map(ctx.map.relations.map(r => [r.id, REL_TYPE(r)]));
  const oq = out.questions ?? [], byNum = new Map(oq.map(q => [q.number, q]));
  const v = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }, info2 = [], info5 = [], review = [];
  if (out.passageId !== ctx.passageId) v[1].push(`passageId ${out.passageId}`);
  const seenQ = new Set();
  for (const q of oq) { if (seenQ.has(q.number)) v[1].push(`q${q.number}: duplicate question`); seenQ.add(q.number); }
  for (const q of oq) if (!ctx.questions.some(x => x.number === q.number)) v[1].push(`q${q.number}: unknown question`);
  for (const iq of ctx.questions) {
    const q = byNum.get(iq.number);
    if (!q) { v[1].push(`q${iq.number}: missing`); continue; }
    const want = iq.choices.map(c => c.number), got = q.choices.map(c => c.number);
    if (q.stemPolarity !== stemPolarity(iq.stem)) v[6].push(`q${iq.number}: stemPolarity ${q.stemPolarity} != code ${stemPolarity(iq.stem)}`);
    if (want.join() !== got.join()) v[1].push(`q${iq.number}: choices ${got.join(',')} != ${want.join(',')}`);
    // V3: extra segments
    const inSeg = new Map(iq.supplementSegments.map(s => [s.id, s.text])), segText = new Map(inSeg), extraIds = new Set();
    for (const e of q.extraSegments) {
      if (inSeg.has(e.id) || extraIds.has(e.id)) v[3].push(`q${iq.number} ${e.id}: id collides`);
      extraIds.add(e.id);
      const parent = inSeg.get(e.parentId);
      if (parent === undefined) v[3].push(`q${iq.number} ${e.id}: unknown parentId ${e.parentId}`);
      else if (!parent.includes(e.quote)) v[3].push(`q${iq.number} ${e.id}: quote not in parent`);
      segText.set(e.id, e.quote);
    }
    const suppIds = new Set(segText.keys());
    const evidencePool = [...ctx.paragraphs, ...segText.values()];
    const byChoice = new Map(iq.choices.map(c => [c.number, c]));
    for (const c of q.choices) {
      const ic = byChoice.get(c.number); if (!ic) continue;
      const at = `q${iq.number}#${c.number}`;
      // V2: parts cover the choice without overlap
      const placed = []; let normalizedOnly = false;
      c.parts.forEach((p, k) => {
        const pos = ic.text.indexOf(p.quote);
        if (pos >= 0 && p.quote !== '') placed.push({ k, start: pos, end: pos + p.quote.length });
        else if (p.quote.trim() && norm(ic.text).includes(norm(p.quote))) { info2.push(`${at}.${k}: whitespace-normalized match`); normalizedOnly = true; }
        else v[2].push(`${at}.${k}: quote not in choice`);
      });
      if (!normalizedOnly && placed.length === c.parts.length) {
        placed.sort((a, b) => a.start - b.start);
        let cur = 0;
        if (!placed.length) v[2].push(`${at}: no parts`);
        for (const pl of placed) {
          if (pl.start < cur) v[2].push(`${at}.${pl.k}: overlaps previous part`);
          else if (!gapOk(ic.text.slice(cur, pl.start))) v[2].push(`${at}.${pl.k}: gap before part "${ic.text.slice(cur, pl.start)}"`);
          cur = Math.max(cur, pl.end);
        }
        if (placed.length && !gapOk(ic.text.slice(cur))) v[2].push(`${at}: trailing gap "${ic.text.slice(cur)}"`);
      }
      c.parts.forEach((p, k) => {
        const pa = `${at}.${k}`;
        // V4: ids, source, operation
        const all = [...p.twistTargetIds, ...p.supportIds, ...p.contextIds, ...p.inferenceBasisIds];
        for (const id of all) if (!mapIds.has(id) && !suppIds.has(id)) v[4].push(`${pa}: unknown id ${id}`);
        // v5: PASSAGE/SUPPLEMENT are judged from twist targets, support and inference basis only (contextIds may point to either side); BOTH counts all ids.
        const core = [...p.twistTargetIds, ...p.supportIds, ...p.inferenceBasisIds], m = core.filter(id => mapIds.has(id)).length, s = core.filter(id => suppIds.has(id)).length;
        if (p.source === 'PASSAGE' && (m < 1 || s > 0)) v[4].push(`${pa}: PASSAGE needs map ids only`);
        if (p.source === 'SUPPLEMENT' && (s < 1 || m > 0)) v[4].push(`${pa}: SUPPLEMENT needs supplement ids only`);
        if (p.source === 'BOTH' && (!all.some(id => mapIds.has(id)) || !all.some(id => suppIds.has(id)))) v[4].push(`${pa}: BOTH needs both`);
        if (p.source === 'NONE' && [...p.twistTargetIds, ...p.supportIds, ...p.inferenceBasisIds].length) v[4].push(`${pa}: NONE with twistTargetIds/supportIds/inferenceBasisIds`);
        if (p.operation === 'APPLY' && p.source !== 'BOTH') v[4].push(`${pa}: APPLY needs source BOTH`);
        if (p.operation === 'APPLY') {
          const side = list => ({ m: list.filter(id => mapIds.has(id)).length, s: list.filter(id => suppIds.has(id)).length });
          const need = p.twisted ? side([...p.twistTargetIds, ...p.contextIds]) : side(p.supportIds);
          if (need.m < 1 || need.s < 1) v[4].push(`${pa}: APPLY needs map and supplement ids in ${p.twisted ? 'twistTargetIds+contextIds' : 'supportIds'}`);
        }
        if (p.operation === 'INFER' && p.source !== 'NONE' && p.inferenceBasisIds.length < 1) v[4].push(`${pa}: INFER without inferenceBasisIds`);
        // V5: twist
        if (p.twisted) {
          if (p.twistType === null) v[5].push(`${pa}: twisted without twistType`);
          if (p.twistDetail.trim() === '') v[5].push(`${pa}: twisted without twistDetail`);
          if (p.choiceQuote.trim() === '') v[5].push(`${pa}: twisted without choiceQuote`);
          else if (!p.quote.includes(p.choiceQuote)) { if (norm(p.quote).includes(norm(p.choiceQuote))) info5.push(`${pa}: choiceQuote whitespace-normalized match`); else v[5].push(`${pa}: choiceQuote not in part quote`); }
          if (p.supportIds.length) v[5].push(`${pa}: twisted with supportIds`);
          if (p.source === 'NONE') {
            if (p.twistTargetIds.length) v[5].push(`${pa}: NONE twist with twistTargetIds`);
            if (p.evidenceQuote !== '') v[5].push(`${pa}: NONE twist with evidenceQuote`);
          } else {
            if (p.twistTargetIds.length < 1) v[5].push(`${pa}: twisted without twistTargetIds`);
            if (p.evidenceQuote.trim() === '' || !evidencePool.some(t => t.includes(p.evidenceQuote))) {
              if (p.evidenceQuote.trim() && evidencePool.some(t => norm(t).includes(norm(p.evidenceQuote)))) info5.push(`${pa}: evidenceQuote whitespace-normalized match`);
              else v[5].push(`${pa}: evidenceQuote not in passage/supplement`);
            }
          }
        } else {
          if (p.twistTargetIds.length) v[5].push(`${pa}: not twisted with twistTargetIds`);
          if (p.source !== 'NONE' && p.supportIds.length < 1) v[5].push(`${pa}: not twisted without supportIds`);
          if (p.twistType !== null || p.twistDetail !== '' || p.evidenceQuote !== '' || p.choiceQuote !== '') v[5].push(`${pa}: not twisted with twist fields`);
        }
        const rels = p.twistTargetIds.filter(id => relType.has(id));
        if (p.relationTypeChange) {
          if (!rels.length) v[5].push(`${pa}: relationTypeChange without relation in twistTargetIds`);
          else if (!rels.some(id => relType.get(id) === p.relationTypeChange.original)) v[5].push(`${pa}: relationTypeChange.original ${p.relationTypeChange.original} != input ${rels.map(id => relType.get(id)).join('/')}`);
        }
      });
      const tw = c.parts.filter(p => p.twisted);
      if (ic.truth === 'FALSE' && tw.length < 1) v[6].push(`${at}: input truth FALSE without twisted part`);
      if (ic.truth === 'TRUE' && tw.length) v[6].push(`${at}: input truth TRUE with twisted part`);
      if (c.readingGap !== 'NONE' && c.note.trim() === '') v[5].push(`${at}: readingGap ${c.readingGap} without note`);
      if (c.readingGap !== 'NONE') review.push({ kind: 'READING_GAP', at, readingGap: c.readingGap });
      if (c.explanationAgreement === 'DIFFER') review.push({ kind: 'EXPLANATION_DIFFER', at });
      c.parts.forEach((p, k) => { if (p.twistType === 'OTHER') review.push({ kind: 'TWIST_OTHER', at: `${at}.${k}` }); });
      c.parts.forEach((p, k) => { if (p.source === 'NONE') review.push({ kind: p.twisted ? 'NONE_TWIST' : 'NONE_UNTWISTED', at: `${at}.${k}` }); });
      if (tw.length >= 2) review.push({ kind: 'MULTI_TWIST', at });
      if (c.note.trim() !== '') review.push({ kind: 'NOTE', at });
    }
  }
  const list = [item(1, 'question and choice numbers match input', v[1]), item(2, 'parts cover the choice without overlap', v[2], info2), item(3, 'extra supplement segments valid', v[3]),
    item(4, 'link ids, source and operation rules', v[4]), item(5, 'twist rules', v[5], info5), item(6, 'input truth and stem polarity consistency', v[6])];
  return { allPass: list.every(x => x.pass), items: list, review };
}

// Valid fake output for dry-run / tests: polarity from the stem, one NONE part per choice, twisted when the input truth is FALSE.
export function exampleOutput(passageId, questions) {
  return { passageId, questions: questions.map(q => ({ number: q.number, stemPolarity: stemPolarity(q.stem), extraSegments: [], choices: q.choices.map(c => {
    const tw = c.truth === 'FALSE';
    return { number: c.number, readingGap: 'NONE', explanationAgreement: 'NO_EXPLANATION', note: '', parts: [{ quote: c.text, source: 'NONE', operation: 'RESTATE', twisted: tw,
      twistTargetIds: [], supportIds: [], contextIds: [], inferenceBasisIds: [], twistType: tw ? 'OTHER' : null, twistDetail: tw ? '예시 비틂' : '', evidenceQuote: '', choiceQuote: tw ? c.text : '', relationTypeChange: null }] };
  }) })) };
}

const freq = arr => Object.entries(arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
const cell = s => String(s ?? '').replace(/\|/gu, '\\|').replace(/\s*\n\s*/gu, ' ');
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : '0.0%';

// FALSE choices (input truth): union of twistTargetIds over parts, compared across the parsed runs of one passage.
export function stability(results) {
  const byKey = new Map();
  for (const r of results.filter(x => x.out)) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);
  let total = 0, allSame = 0, twoSame = 0, interNonEmpty = 0, noneOnly = 0; const mismatches = [];
  for (const [key, runs] of byKey) {
    if (runs.length < 2) continue;
    for (const iq of runs[0].questions) for (const ic of iq.choices.filter(c => c.truth === 'FALSE')) {
      const sets = runs.map(r => {
        const cc = r.out.questions.find(x => x.number === iq.number)?.choices.find(x => x.number === ic.number);
        const targets = cc ? [...new Set(cc.parts.flatMap(p => p.twistTargetIds))].sort() : null;
        return { run: r.run, targets, sig: targets ? targets.join(',') : null };
      });
      const counts = sets.reduce((m, x) => (m[x.sig] = (m[x.sig] ?? 0) + 1, m), {});
      total++;
      if (sets.every(x => x.targets && x.targets.length === 0)) noneOnly++;
      if (Object.keys(counts).length === 1 && sets[0].sig !== null) allSame++;
      if (Math.max(...Object.values(counts)) >= 2) twoSame++;
      if (sets.every(x => x.targets) && sets[0].targets.some(id => sets.every(x => x.targets.includes(id)))) interNonEmpty++;
      if (Object.keys(counts).length > 1) mismatches.push({ key, question: iq.number, choice: ic.number, runs: sets.map(({ run, targets }) => ({ run, targets })) });
    }
  }
  // noneOnly: choices whose target union is empty in every run (NONE twists only); the *OfChanged values use the rest as denominator.
  const changed = total - noneOnly;
  return { choices: total, allSame, allSamePct: pct(allSame, total), atLeastTwoSame: twoSame, atLeastTwoSamePct: pct(twoSame, total),
    intersectionNonEmpty: interNonEmpty, intersectionNonEmptyPct: pct(interNonEmpty, total), noneOnly, changedChoices: changed,
    allSameOfChanged: allSame - noneOnly, allSameOfChangedPct: pct(allSame - noneOnly, changed), atLeastTwoSameOfChanged: twoSame - noneOnly, atLeastTwoSameOfChangedPct: pct(twoSame - noneOnly, changed),
    intersectionNonEmptyOfChangedPct: pct(interNonEmpty, changed), mismatches };
}

// FALSE choices (input truth), passages with >= 2 parsed runs: per run the set of twistType over the choice's twisted parts.
// category: ALL_SAME (all run sets equal) / INTERSECTION (shared type in every run) / TWO_SHARE (a type in >= 2 runs) / DISJOINT. majority = types seen in the most runs (ties all).
export function typeStability(results) {
  const byKey = new Map();
  for (const r of results.filter(x => x.out)) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r]);
  const cats = { ALL_SAME: 0, INTERSECTION: 0, TWO_SHARE: 0, DISJOINT: 0 }; let total = 0, majorityOnlyOther = 0; const choices = [];
  for (const [key, runs] of byKey) {
    if (runs.length < 2) continue;
    for (const iq of runs[0].questions) for (const ic of iq.choices.filter(c => c.truth === 'FALSE')) {
      const sets = runs.map(r => {
        const cc = r.out.questions.find(x => x.number === iq.number)?.choices.find(x => x.number === ic.number);
        return { run: r.run, types: cc ? [...new Set(cc.parts.filter(p => p.twisted).map(p => p.twistType))].sort() : null };
      });
      const sig = x => x.types ? x.types.join(',') : null, valid = sets.every(x => x.types);
      const count = {}; for (const x of sets) for (const t of x.types ?? []) count[t] = (count[t] ?? 0) + 1;
      const top = Math.max(0, ...Object.values(count)), majority = Object.keys(count).filter(t => count[t] === top).sort();
      const category = valid && sets.every(x => sig(x) === sig(sets[0])) ? 'ALL_SAME' : valid && sets[0].types.some(t => sets.every(x => x.types.includes(t))) ? 'INTERSECTION' : top >= 2 ? 'TWO_SHARE' : 'DISJOINT';
      cats[category]++; total++;
      if (majority.length === 1 && majority[0] === 'OTHER') majorityOnlyOther++;
      choices.push({ key, question: iq.number, choice: ic.number, category, majority, runs: sets });
    }
  }
  return { choices: total, categories: cats, categoriesPct: Object.fromEntries(Object.entries(cats).map(([k, c]) => [k, pct(c, total)])), majorityOnlyOther, items: choices };
}

// readingGap over the parsed runs: choice-run counts per kind, and per choice the number of runs with a gap (kinds listed).
export function readingGapStats(results) {
  const byKind = {}, perChoice = new Map();
  for (const r of results.filter(x => x.out)) for (const q of r.out.questions) for (const c of q.choices) {
    byKind[c.readingGap] = (byKind[c.readingGap] ?? 0) + 1;
    if (c.readingGap === 'NONE') continue;
    const k = `${r.key}|${q.number}|${c.number}`, e = perChoice.get(k) ?? { key: r.key, question: q.number, choice: c.number, runsWithGap: 0, kinds: [] };
    e.runsWithGap++; e.kinds.push(`r${r.run} ${c.readingGap}`); perChoice.set(k, e);
  }
  return { byKind, perChoice: [...perChoice.values()] };
}

// results: [{ key, run, passageId, questions, out|null, validation|null }]
export function summarize(results) {
  const done = results.filter(r => r.out), parts = done.flatMap(r => r.out.questions.flatMap(q => q.choices.flatMap(c => c.parts)));
  const twisted = parts.filter(p => p.twisted);
  const viol = r => (r.validation?.items ?? []).reduce((b, i) => b + i.violations.length, 0);
  const first = new Map(); for (const r of done) if (!first.has(r.key)) first.set(r.key, r);
  return { requestsParsed: done.length, passages: first.size,
    questions: [...first.values()].reduce((a, r) => a + r.out.questions.length, 0), choices: [...first.values()].reduce((a, r) => a + r.out.questions.reduce((b, q) => b + q.choices.length, 0), 0),
    perRun: done.map(r => ({ key: r.key, run: r.run, violations: viol(r), review: r.validation?.review.length ?? 0, allPass: r.validation?.allPass ?? null })),
    reviewByKind: Object.fromEntries(freq(done.flatMap(r => (r.validation?.review ?? []).map(x => x.kind)))),
    sourceOperation: Object.fromEntries(freq(parts.map(p => `${p.source}|${p.operation}`))),
    twistedParts: parts.filter(p => p.twisted).length,
    twistTypes: { byType: freq(twisted.map(p => p.twistType)), byBranch: freq(twisted.map(p => `${TWIST_BRANCH[p.twistType]}`)),
      other: { count: twisted.filter(p => p.twistType === 'OTHER').length, details: twisted.filter(p => p.twistType === 'OTHER').map(p => p.twistDetail) } },
    validationViolations: done.reduce((a, r) => a + viol(r), 0), readingGap: readingGapStats(results), stability: stability(results), typeStability: typeStability(results) };
}

export function renderReport(results, s = summarize(results)) {
  const out = ['# 선지 연결 결과 (v4)', '', '해석·평가 없음. 원자료는 `<지문>/r<k>/choice-link.json`, 검증은 `choice-link.validation.json`, 요청 기록은 ledger, 실행 설정은 RUN 파일.', '',
    '## 전체 요약', '', `- 응답 파싱 ${s.requestsParsed}/${results.length}건, 지문 ${s.passages}, 문항 ${s.questions}, 선지 ${s.choices}(첫 회차 기준), 검증 위반 합계 ${s.validationViolations}, 비틂 조각 ${s.twistedParts}`, '',
    '### 회차별 검증 위반·검토 표시', '', '| 지문 | 회차 | 위반 | 검토 표시 | 전체 통과 |', '|---|---:|---:|---:|---|', ...s.perRun.map(p => `| ${p.key} | ${p.run} | ${p.violations} | ${p.review} | ${p.allPass} |`), '',
    '### 검토 표시 종류', '', ...(Object.keys(s.reviewByKind).length ? ['| 종류 | 수 |', '|---|---:|', ...Object.entries(s.reviewByKind).map(([k, c]) => `| ${k} | ${c} |`)] : ['- 없음']), '',
    '### source × operation 조각 수', '', '| source | operation | 수 |', '|---|---|---:|', ...Object.entries(s.sourceOperation).map(([k, c]) => `| ${k.split('|')[0]} | ${k.split('|')[1]} | ${c} |`), '',
    '### twistType 빈도 (비틂 조각)', '', ...(s.twistTypes.byType.length ? ['| twistType | 이름 | 갈래 | 수 |', '|---|---|---|---:|', ...s.twistTypes.byType.map(([n, c]) => `| ${n} | ${TWIST_KO[n]} | ${TWIST_BRANCH[n]} | ${c} |`)] : ['- 없음']), '',
    '### 갈래별 비틂 조각 수', '', ...(s.twistTypes.byBranch.length ? ['| 갈래 | 수 |', '|---|---:|', ...s.twistTypes.byBranch.map(([n, c]) => `| ${n} | ${c} |`)] : ['- 없음']), '',
    `### OTHER 조각 ${s.twistTypes.other.count}건의 twistDetail`, '', ...(s.twistTypes.other.details.length ? s.twistTypes.other.details.map(d => `- ${cell(d)}`) : ['- 없음']), '',
    '### readingGap 분포 (선지×회차 건수)', '', ...(Object.keys(s.readingGap.byKind).length ? ['| readingGap | 수 |', '|---|---:|', ...Object.entries(s.readingGap.byKind).map(([k, c]) => `| ${k} | ${c} |`)] : ['- 없음']), '',
    '### readingGap이 NONE이 아닌 선지 (회차 수)', '', ...(s.readingGap.perChoice.length ? ['| 지문 | 문항 | 선지 | 회차 수 | 회차별 |', '|---|---:|---:|---:|---|', ...s.readingGap.perChoice.map(e => `| ${e.key} | ${e.question} | ${e.choice} | ${e.runsWithGap} | ${cell(e.kinds.join(', '))} |`)] : ['- 없음']), '',
    '## 회차 간 안정성 (FALSE 선지 단위: twistTargetIds 합집합)', '', `- 비교한 선지 ${s.stability.choices}, 모든 회차 같음 ${s.stability.allSame} (${s.stability.allSamePct}), 두 회차 이상 같음 ${s.stability.atLeastTwoSame} (${s.stability.atLeastTwoSamePct}), 모든 회차 교집합이 비지 않음 ${s.stability.intersectionNonEmpty} (${s.stability.intersectionNonEmptyPct})`, '',
    `- 바뀐 곳이 없는 선지(NONE 비틂만, 모든 회차 합집합이 빈 선지) ${s.stability.noneOnly}. 나머지 ${s.stability.changedChoices}개 기준: 모든 회차 같음 ${s.stability.allSameOfChanged} (${s.stability.allSameOfChangedPct}), 두 회차 이상 같음 ${s.stability.atLeastTwoSameOfChanged} (${s.stability.atLeastTwoSameOfChangedPct}), 교집합이 비지 않음 ${s.stability.intersectionNonEmpty} (${s.stability.intersectionNonEmptyOfChangedPct})`, '',
    ...(s.stability.mismatches.length ? ['| 지문 | 문항 | 선지 | 회차별 대상 id |', '|---|---:|---:|---|', ...s.stability.mismatches.map(m => `| ${m.key} | ${m.question} | ${m.choice} | ${cell(m.runs.map(r => `r${r.run}: ${r.targets?.join(',') ?? '-'}`).join(' / '))} |`)] : ['- 불일치 없음']), '',
    '## 종류 안정성 (FALSE 선지 단위: 회차별 twistType 집합)', '', `- 비교한 선지 ${s.typeStability.choices}, ` + Object.entries(s.typeStability.categories).map(([k, c]) => `${k} ${c} (${s.typeStability.categoriesPct[k]})`).join(', ') + `, 다수 종류가 OTHER뿐인 선지 ${s.typeStability.majorityOnlyOther}`, '',
    ...(s.typeStability.items.length ? ['| 지문 | 문항 | 선지 | 분류 | 다수 종류 | 회차별 종류 |', '|---|---:|---:|---|---|---|', ...s.typeStability.items.map(m => `| ${m.key} | ${m.question} | ${m.choice} | ${m.category} | ${m.majority.join(',') || '-'} | ${cell(m.runs.map(r => `r${r.run}: ${r.types?.join(',') ?? '-'}`).join(' / '))} |`)] : ['- 비교할 선지 없음']), '',
    '## 비틂 조각 전체 (검토용)', ''];
  for (const r of results) {
    out.push(`### ${r.key} r${r.run}`, '');
    if (!r.out) { out.push('결과 없음.', ''); continue; }
    out.push('| 문항 | 선지 | truth(입력) | 조각 | twistType | twistDetail | 대상 id | 원문 인용 | 선지 인용 |', '|---:|---:|---|---|---|---|---|---|---|');
    for (const q of r.out.questions) for (const c of q.choices) for (const p of c.parts.filter(x => x.twisted))
      out.push(`| ${q.number} | ${c.number} | ${r.questions.find(x => x.number === q.number)?.choices.find(x => x.number === c.number)?.truth} | ${cell(p.quote)} | ${p.twistType} | ${cell(p.twistDetail)} | ${p.twistTargetIds.join(',')} | ${cell(p.evidenceQuote)} | ${cell(p.choiceQuote)} |`);
    out.push('');
  }
  return out.join('\n');
}

// One passage's files: paragraphs, map (relations carry relationType from classify), stances. `label` (sections only) prefixes every map/stance id as "<label>.".
function loadSection(t, label = null) {
  const { passage, file, fileHash } = loadPassage(t.passagesDir, t.passageId);
  const mapBytes = readFileSync(t.mapPath), stanceBytes = readFileSync(t.stancePath), classifyBytes = readFileSync(t.classifyPath);
  const map = JSON.parse(mapBytes.toString('utf8')), stances = JSON.parse(stanceBytes.toString('utf8')).stances;
  const types = new Map(JSON.parse(classifyBytes.toString('utf8')).items.map(i => [i.id, i.type]));
  map.relations = map.relations.map(r => { if (!types.has(r.id)) throw new Error(`CLASSIFY_MISSING: ${t.passageId} ${r.id}`); return { ...r, relationType: types.get(r.id) }; });
  const protectedFiles = { [file]: fileHash, [t.mapPath]: hash(mapBytes), [t.stancePath]: hash(stanceBytes), [t.classifyPath]: hash(classifyBytes) };
  if (label === null) return { passage, map, stances, protectedFiles };
  const pre = id => `${label}.${id}`;
  return { passage: { ...passage, paragraphs: passage.paragraphs.map(p => ({ ...p, section: label })) }, protectedFiles,
    map: { ...map, propositions: map.propositions.map(p => ({ ...p, id: pre(p.id) })), nodes: map.nodes.map(n => ({ ...n, id: pre(n.id), childIds: n.childIds.map(pre) })),
      relations: map.relations.map(r => ({ ...r, id: pre(r.id), fromId: pre(r.fromId), toId: pre(r.toId) })) },
    stances: stances.map(x => ({ ...x, id: pre(x.id) })) };
}
const dupes = list => list.filter((x, i) => list.indexOf(x) !== i);
// Merge the sections of a (가)/(나) set into one passage/map/stance input; duplicate ids stop the run.
function mergeSections(parts, key) {
  const paragraphs = parts.flatMap(x => x.passage.paragraphs), ids = parts.flatMap(x => [...x.map.propositions, ...x.map.nodes, ...x.map.relations].map(m => m.id));
  const dp = dupes(paragraphs.map(p => p.paragraphId)); if (dp.length) throw new Error(`DUPLICATE_PARAGRAPH_ID: ${key} ${dp.join(',')}`);
  const di = dupes(ids); if (di.length) throw new Error(`DUPLICATE_MAP_ID: ${key} ${di.join(',')}`);
  return { passage: { passageId: key, paragraphs }, stances: parts.flatMap(x => x.stances), protectedFiles: Object.assign({}, ...parts.map(x => x.protectedFiles)),
    map: { propositions: parts.flatMap(x => x.map.propositions), nodes: parts.flatMap(x => x.map.nodes), relations: parts.flatMap(x => x.map.relations) } };
}

export function loadTargets(targetsPath, fixedPath = FIXED_PATH) {
  const fixedItems = readJson(fixedPath).items;
  return readJson(targetsPath).map(t => {
    const key = t.key ?? t.passageId, passageId = t.passageId ?? t.key;
    const { passage, map, stances, protectedFiles: sectionFiles } = t.sections ? mergeSections(t.sections.map(s => loadSection(s, s.label)), key) : loadSection(t);
    const { setId, questions, images } = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, fixedItems);
    if (setId !== t.setId) throw new Error(`SET_MISMATCH: ${t.setId} vs ${setId}`);
    const displayPath = resolve(dirname(t.questionsPath), '../passages', `${t.setId}.json`), displayBytes = readFileSync(displayPath);
    const passageMarks = JSON.parse(displayBytes.toString('utf8')).elements.filter(e => e.kind !== 'paragraph')
      .map(e => Object.fromEntries(['kind', 'symbol', 'style', 'text'].filter(k => e[k] != null).map(k => [k, e[k]])));
    const protectedFiles = { ...sectionFiles, [displayPath]: hash(displayBytes), [t.questionsPath]: hash(readFileSync(t.questionsPath)), [t.answersPath]: hash(readFileSync(t.answersPath)) };
    return { key, passageId, passage, map, stances, passageMarks, questions, images, protectedFiles };
  });
}
const ctxOf = j => ({ passageId: j.passageId, map: j.map, questions: j.questions, paragraphs: j.passage.paragraphs.map(p => p.text) });

export async function main({ dryRun = false, transport, targetsPath, out, promptPath = PROMPT_PATH, fixedPath = FIXED_PATH, runs = 1, round, limits = LIMITS } = {}) {
  if (!targetsPath || !out) throw new Error('USAGE: --targets and --out are required');
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`RUNS: ${runs}`);
  if (round !== undefined && !(Number.isInteger(round) && round >= 1 && round <= runs)) throw new Error(`ROUND: ${round}`);
  const targets = loadTargets(targetsPath, fixedPath);
  if (new Set(targets.map(t => t.key)).size !== targets.length) throw new Error('DUPLICATE_TARGET');
  const promptBytes = readFileSync(promptPath), promptHashBefore = hash(promptBytes);
  const instructions = instructionsFrom(promptBytes.toString('utf8'));
  const prepared = targets.map(t => {
    const input = buildInput(t.passage, t.map, t.stances, t.passageMarks, t.questions), request = buildRequest(instructions, input, t.images);
    return { ...t, input, request, reserved: reserveUsd(request) };
  });
  const protectedBefore = Object.assign({}, ...prepared.map(j => j.protectedFiles));
  mkdirSync(out, { recursive: true });
  if (dryRun) {
    for (const j of prepared) { mkdirSync(`${out}/${j.key}`, { recursive: true }); writeFileSync(`${out}/${j.key}/dry-run.request.json`, serialize(redactImages(j.request))); }
    const allPass = prepared.every(j => validateChoiceLink(exampleOutput(j.passageId, j.questions), ctxOf(j)).allPass);
    const perPassage = prepared.map(j => ({ passageId: j.passageId, questions: j.questions.length, choices: j.questions.reduce((a, q) => a + q.choices.length, 0),
      supplementSegments: j.questions.reduce((a, q) => a + q.supplementSegments.length, 0), marks: j.questions.reduce((a, q) => a + q.supplementSegments.reduce((b, sg) => b + sg.marks.length, 0), 0), images: j.images.length, reserveUsdPerRequest: j.reserved }));
    const roundsN = round === undefined ? runs : 1, total = prepared.reduce((a, j) => a + j.reserved * roundsN, 0);
    return { dryRun: true, externalRequests: 0, runs, requests: prepared.length * roundsN, exampleAllPass: allPass, perPassage, totalReserveUsd: total,
      overCap: total > limits.usdCap, overMaxRequests: prepared.length * roundsN > limits.maxRequests };
  }
  const sfx = round === undefined ? '' : `-rerun-${round}`, ledgerPath = `${out}/ledger${sfx}.jsonl`;
  if (existsSync(ledgerPath) || existsSync(`${out}/RUN${sfx}.json`)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const runInfo = { version: 4, ...(round === undefined ? {} : { round }), runs, startedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, tokensPerQuestion: TOKENS_PER_QUESTION, maxOutputCap: MAX_OUTPUT_CAP, timeoutMs: TIMEOUT_MS, rates: RATES, limits, retries: 0,
    promptFile: promptPath, promptFileHashBefore: promptHashBefore, instructionsHash: hash(instructions), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), targetsFile: targetsPath, fixedFile: fixedPath, fixedFileHash: hash(readFileSync(fixedPath)),
    inputs: Object.fromEntries(prepared.map(j => [j.key, { passageId: j.passageId, inputHash: hash(JSON.stringify(j.input)), requestHash: hash(JSON.stringify(j.request)), questions: j.questions.length, images: j.images.map(i => ({ question: i.question, imageId: i.imageId, sha256: i.sha256 })), maxOutputTokens: j.request.max_output_tokens }])) };
  const record = row => appendFileSync(ledgerPath, jsonLine(row) + '\n');
  let spent = 0, requests = 0, stop = null, client;
  const results = [];
  for (const k of round === undefined ? Array.from({ length: runs }, (_, i) => i + 1) : [round]) for (const j of prepared) {
    const res = { key: j.key, run: k, passageId: j.passageId, questions: j.questions, out: null, requestStatus: 'NOT_SENT', error: null, validation: null, costUsd: 0 };
    results.push(res);
    if (!stop) {
      if (requests >= limits.maxRequests) stop = 'RUN_LIMIT: max requests';
      else if (spent + j.reserved > limits.usdCap) stop = 'RUN_LIMIT: usd cap';
      if (stop) record({ event: 'STOP', key: j.key, run: k, passageId: j.passageId, reason: stop, atUtc: new Date().toISOString() });
    }
    if (stop) continue;
    const dir = `${out}/${j.key}/r${k}${round === undefined ? '' : '-rerun'}`, requestId = `choice-link-${j.key}-r${k}${round === undefined ? '' : '-rerun'}`, t0 = performance.now();
    mkdirSync(dir, { recursive: true }); requests++;
    record({ event: 'START', requestId, key: j.key, run: k, passageId: j.passageId, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: j.reserved });
    let response = null;
    try {
      const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
      response = await sender.create(j.request, { timeout: TIMEOUT_MS });
    } catch (e) { res.requestStatus = 'API_ERROR'; res.error = String(e); }
    const cost = response ? usageCost(response.usage) : null;
    const charged = response ? (cost ?? j.reserved) : (isConnectionError(res.error) ? 0 : j.reserved);
    spent += charged; res.costUsd = charged;
    record({ event: 'END', requestId, key: j.key, run: k, passageId: j.passageId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null,
      responseId: response?.id ?? null, status: response?.status ?? res.requestStatus, usage: response?.usage ?? null, costUsd: cost, chargedUsd: charged, costAssumedReserved: !!response && cost === null, error: res.error });
    writeFileSync(`${dir}/choice-link.raw.json`, serialize(response ?? { error: res.error }), { flag: 'wx' });
    if (response) {
      try {
        if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        const parsed = OutputSchema.parse(JSON.parse(response.output_text));
        writeFileSync(`${dir}/choice-link.json`, serialize(parsed), { flag: 'wx' });
        res.out = parsed; res.requestStatus = 'PARSED'; res.validation = validateChoiceLink(parsed, ctxOf(j));
      } catch (e) { res.requestStatus = 'FORMAT_ERROR'; res.error = String(e); }
    }
    writeFileSync(`${dir}/choice-link.validation.json`, serialize({ key: j.key, run: k, passageId: j.passageId, requestStatus: res.requestStatus, error: res.error, validation: res.validation }), { flag: 'wx' });
  }
  const protectedAfter = Object.fromEntries(Object.keys(protectedBefore).map(p => [p, hash(readFileSync(p))]));
  const promptHashAfter = hash(readFileSync(promptPath));
  const protectedUnchanged = Object.keys(protectedBefore).every(p => protectedBefore[p] === protectedAfter[p]);
  const summary = summarize(results);
  writeFileSync(`${out}/RUN${sfx}.json`, serialize({ ...runInfo, finishedAtUtc: new Date().toISOString(), requests, totalCostUsd: spent, stop, promptFileHashAfter: promptHashAfter, promptUnchanged: promptHashAfter === promptHashBefore,
    protectedFilesUnchanged: protectedUnchanged, protectedFileHashes: { before: protectedBefore, after: protectedAfter },
    results: results.map(r => ({ key: r.key, run: r.run, passageId: r.passageId, requestStatus: r.requestStatus, error: r.error, costUsd: r.costUsd, validationAllPass: r.validation?.allPass ?? null })) }));
  writeFileSync(`${out}/summary${sfx}.json`, serialize(summary));
  writeFileSync(`${out}/REPORT${sfx}.md`, renderReport(results, summary) + '\n');
  return { requests, totalCostUsd: spent, stop, promptUnchanged: promptHashAfter === promptHashBefore, protectedFilesUnchanged: protectedUnchanged,
    results: results.map(r => ({ key: r.key, run: r.run, passageId: r.passageId, questions: r.questions.length, requestStatus: r.requestStatus, costUsd: r.costUsd, validationAllPass: r.validation?.allPass ?? null })) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }, num = name => opt(name) ? Number(opt(name)) : undefined;
  const result = await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), out: opt('--out'), promptPath: opt('--prompt'), fixedPath: opt('--fixed'), runs: num('--runs'), round: num('--round'),
    limits: { maxRequests: num('--max-requests') ?? LIMITS.maxRequests, usdCap: num('--usd-cap') ?? LIMITS.usdCap } });
  console.log(JSON.stringify(result, null, 2));
}
