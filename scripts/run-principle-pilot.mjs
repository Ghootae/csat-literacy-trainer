// D-0215 C: principle-application generation pilot P1. Three stages on gpt-6.1-sol: 1 rules (per passage), 2 situation + calculation table (per item), 3 write (per item).
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-11-09-principle-application-pilot-p1.md
// Usage: node --env-file-if-exists=.env scripts/run-principle-pilot.mjs [--dry-run] [--targets <json>] [--out <dir>] [--passages <id,...>] [--max-requests <n>] [--usd-cap <x>] [--runs <name>] [--reuse-from <run dir>]
// Requests carry the passage, earlier-stage outputs and item info only (never an exam question, exam number or gold map). The one exception is the
// excludedSituations description/quotes in item info. No retries; violations are recorded, not repaired.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, buildInput as buildPassageInput, instructionsFrom, usageCost, reserveUsd, hash, MODEL, TIMEOUT_MS } from './run-analysis-map-gongsun.mjs';
import { isConnectionError } from './run-analysis-judge-gongsun.mjs';
import { stemNegationCount, sentencesOf, quoteKeys, buildRequest, MAX_OUTPUT_TOKENS } from './run-item-generation.mjs';

export const EXP_DIR = 'docs/experiments/principle-application-pilot-2026-11-09';
export const TARGETS_PATH = `${EXP_DIR}/targets.json`;
export const PROMPT_PATHS = { RULES: `${EXP_DIR}/RULES-PROMPT-v2.md`, SITUATION: `${EXP_DIR}/SITUATION-PROMPT-v1.md`, WRITE: `${EXP_DIR}/WRITE-PROMPT-v1.md` };
export const LIMITS = { maxRequests: 20, usdCap: 5 };
// Per-request timeout for P1 (D-0227): the slowest completed request so far took 99 s; a hung request waited 21 min under the shared 15-min TIMEOUT_MS.
export const P1_TIMEOUT_MS = 5 * 60 * 1000;
export { MODEL, TIMEOUT_MS, MAX_OUTPUT_TOKENS };
export const FORMS = ['IN_PASSAGE', 'BOGI'];
export const POLARITIES = ['SELECT_CORRECT', 'SELECT_INCORRECT'];
export const P1_TWIST_TYPES = ['DIRECTION', 'WRONG_VARIABLE', 'HOLD_CONSTANT_ERROR', 'SCOPE', 'SWAP_OBJECTS'];
export const COPY_DICE_MIN = 0.7, EXCLUDED_DICE_MIN = 0.5;
const CHOICES = [1, 2, 3, 4, 5];
const END_PHRASE = { SELECT_CORRECT: '가장 적절한 것은?', SELECT_INCORRECT: '적절하지 않은 것은?' };

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const normWs = s => s.replace(/\s+/gu, '');

// Character 2-gram Dice coefficient over multisets, whitespace removed. Two empty/one-character texts: 1 when equal, else 0.
export function dice2(a, b) {
  const x = normWs(a), y = normWs(b);
  if (x.length < 2 || y.length < 2) return x === y && x !== '' ? 1 : 0;
  const grams = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) ?? 0) + 1); } return m; };
  const gx = grams(x), gy = grams(y);
  let common = 0; for (const [g, n] of gx) common += Math.min(n, gy.get(g) ?? 0);
  return 2 * common / ((x.length - 1) + (y.length - 1));
}
const round3 = n => Math.round(n * 1000) / 1000;

// ---- schemas (strict; counts and ranges are checked in code, not in the JSON schema) ---------------------------------------------

const Rules = z.strictObject({ passageId: z.string(), rules: z.array(z.strictObject({ id: z.string(), ruleQuote: z.string(), statement: z.string(),
  variables: z.array(z.strictObject({ name: z.string(), effect: z.string() })), scopeQuote: z.string().nullable(),
  statedApplications: z.array(z.strictObject({ target: z.string(), quote: z.string() })),
  openSlots: z.array(z.strictObject({ id: z.string(), target: z.string(), quote: z.string(), whatToDerive: z.string() })) })) });
const Situation = z.strictObject({ passageId: z.string(), itemKey: z.string(), form: z.enum(FORMS),
  situation: z.strictObject({ description: z.string(), slotRef: z.string().nullable(), bogiText: z.string().nullable() }),
  usedRuleIds: z.array(z.string()),
  steps: z.array(z.strictObject({ n: z.number().int(), given: z.string(), ruleId: z.string(), ruleQuote: z.string(), result: z.string() })),
  derivedFacts: z.array(z.strictObject({ id: z.string(), text: z.string(), fromSteps: z.array(z.number().int()), ifDifferent: z.string() })),
  selfCheck: z.string() });
const Item = z.strictObject({ passageId: z.string(), itemKey: z.string(), stem: z.string(), bogi: z.string().nullable(), answer: z.number().int(),
  choices: z.array(z.strictObject({ number: z.number().int(), text: z.string(), truth: z.enum(['TRUE', 'FALSE']), onSituation: z.boolean(), fromFact: z.string().nullable(),
    breaksStep: z.number().int().nullable(), twistType: z.enum(P1_TWIST_TYPES).nullable() })) });
export const SCHEMAS = { rules: { name: 'p1_rules_v1', zod: Rules }, situation: { name: 'p1_situation_v1', zod: Situation }, write: { name: 'p1_item_v1', zod: Item } };
for (const s of Object.values(SCHEMAS)) s.json = z.toJSONSchema(s.zod);

// ---- targets and inputs ----------------------------------------------------------------------------------------------------------

const quoteOf = (paragraphs, q) => paragraphs.join('\n').includes(q);
export function loadPilotTargets(targetsPath = TARGETS_PATH) {
  return readJson(targetsPath).map(t => {
    const { passage, file, fileHash } = loadPassage(t.passagesDir, t.passageId), paragraphs = passage.paragraphs.map(p => p.text);
    if (!Array.isArray(t.items) || !t.items.length) throw new Error(`ITEMS: ${t.passageId}`);
    for (const it of t.items) {
      if (!FORMS.includes(it.form) || !POLARITIES.includes(it.stemPolarity) || !it.itemKey || !Array.isArray(it.excludedSituations)) throw new Error(`ITEM: ${t.passageId} ${it.itemKey}`);
      for (const ex of it.excludedSituations) for (const q of ex.passageQuotes) if (!quoteOf(paragraphs, q)) throw new Error(`EXCLUDED_QUOTE: ${t.passageId} ${it.itemKey} "${q.slice(0, 30)}"`);
    }
    return { passageId: t.passageId, setId: t.setId, passage, paragraphs, items: t.items, protectedFiles: { [file]: fileHash } };
  });
}
export const itemInfo = it => ({ itemKey: it.itemKey, form: it.form, stemPolarity: it.stemPolarity, excludedSituations: it.excludedSituations });

// Open slots of an IN_PASSAGE item that do not overlap an excluded situation: (i) same sentence key, or (ii) 2-gram Dice of target and description >= 0.5.
export function filterOpenSlots(rules, excluded, paragraphs) {
  const sentences = sentencesOf(paragraphs), exKeys = new Set(excluded.flatMap(ex => ex.passageQuotes.flatMap(q => [...quoteKeys(sentences, q)]))), removed = [];
  const out = rules.map(r => ({ ...r, openSlots: r.openSlots.filter(s => {
    const shared = [...quoteKeys(sentences, s.quote)].filter(k => exKeys.has(k));
    if (shared.length) { removed.push({ id: s.id, reason: `SENTENCE_KEY: ${shared.join(',')}` }); return false; }
    for (const ex of excluded) { const d = dice2(s.target, ex.description); if (d >= EXCLUDED_DICE_MIN) { removed.push({ id: s.id, reason: `TARGET_DICE: ${round3(d)} with "${ex.description.slice(0, 20)}"` }); return false; } }
    return true;
  }) }));
  return { rules: out, removed, usableIds: out.flatMap(r => r.openSlots.map(s => s.id)) };
}

const passageInput = t => buildPassageInput(t.passage);
export const situationInput = (t, rulesOut, it, rules = rulesOut.rules) => ({ ...passageInput(t), rules, item: itemInfo(it) });
export const writeInput = (t, situationOut, it) => ({ ...passageInput(t), calculation: { situation: situationOut.situation, usedRuleIds: situationOut.usedRuleIds, steps: situationOut.steps,
  derivedFacts: situationOut.derivedFacts, selfCheck: situationOut.selfCheck }, item: { itemKey: it.itemKey, form: it.form, stemPolarity: it.stemPolarity } });

// ---- validation ------------------------------------------------------------------------------------------------------------------

const matchKind = (text, quote) => text.includes(quote) ? 'EXACT' : normWs(quote) !== '' && normWs(text).includes(normWs(quote)) ? 'WHITESPACE' : null;
const result = (violations, info = [], extra = {}) => ({ allPass: violations.length === 0, violations, info, ...extra });

export function validateRules(out, paragraphs) {
  const v = [], info = [], text = paragraphs.join('\n');
  const quote = (at, q) => { const k = matchKind(text, q); if (!k) v.push(`QUOTE_NOT_IN_PASSAGE: ${at} "${q.slice(0, 40)}"`); else if (k === 'WHITESPACE') info.push(`${at}: matches ignoring whitespace "${q.slice(0, 40)}"`); };
  if (out.rules.length < 1 || out.rules.length > 8) v.push(`RULE_COUNT: ${out.rules.length} (want 1-8)`);
  const ids = new Set();
  for (const r of out.rules) {
    const at = r.id;
    if (!/^R\d+$/u.test(r.id)) v.push(`ID_FORMAT: rule ${r.id}`);
    if (ids.has(r.id)) v.push(`ID_DUPLICATE: ${r.id}`); ids.add(r.id);
    quote(`${at} ruleQuote`, r.ruleQuote);
    if (r.scopeQuote !== null) quote(`${at} scopeQuote`, r.scopeQuote);
    if (r.variables.length < 1) v.push(`VARIABLES: ${at} has none`);
    r.statedApplications.forEach((a, i) => quote(`${at} statedApplications[${i}]`, a.quote));
    const slotIds = new Set(), slotRe = new RegExp(`^${r.id}-S\\d+$`, 'u');
    for (const s of r.openSlots) {
      if (!slotRe.test(s.id)) v.push(`ID_FORMAT: open slot ${s.id} of ${r.id}`);
      if (slotIds.has(s.id)) v.push(`ID_DUPLICATE: ${s.id}`); slotIds.add(s.id);
      quote(`${s.id} quote`, s.quote);
    }
  }
  const count = out.rules.reduce((a, r) => a + r.openSlots.length, 0);
  info.push(`openSlots: ${count} (${out.rules.map(r => `${r.id}:${r.openSlots.length}`).join(', ')})`);
  return result(v, info, { openSlotCount: count });
}

// ctx: { item, rules (stage 1 rules), usableIds (Set|null), removedIds (Set), sentences ([{ norm }]), excluded }
export function validateSituation(out, ctx) {
  const v = [], info = [], { item } = ctx, ruleById = new Map(ctx.rules.map(r => [r.id, r]));
  if (out.itemKey !== item.itemKey) v.push(`ITEM_KEY: ${out.itemKey} != ${item.itemKey}`);
  if (out.form !== item.form) v.push(`FORM: ${out.form} != ${item.form}`);
  const s = out.situation;
  if (item.form === 'IN_PASSAGE') {
    if (s.slotRef === null) v.push('SLOT_REF: null for IN_PASSAGE');
    else if (ctx.removedIds.has(s.slotRef)) v.push(`EXCLUDED_SLOT: ${s.slotRef} overlaps an excluded situation`);
    else if (!ctx.usableIds.has(s.slotRef)) v.push(`SLOT_REF: ${s.slotRef} is not a usable open slot`);
    if (s.bogiText !== null) v.push('BOGI_TEXT: must be null for IN_PASSAGE');
  } else {
    if (s.slotRef !== null) v.push('SLOT_REF: must be null for BOGI');
    if (s.bogiText === null || s.bogiText.trim() === '') v.push('BOGI_TEXT: empty for BOGI');
  }
  if (out.usedRuleIds.length < 1 || out.usedRuleIds.length > 2) v.push(`USED_RULES: ${out.usedRuleIds.length} (want 1-2)`);
  for (const id of out.usedRuleIds) if (!ruleById.has(id)) v.push(`RULE_ID: usedRuleIds ${id} not in stage 1`);
  if (out.steps.length < 1 || out.steps.length > 4) v.push(`STEP_COUNT: ${out.steps.length} (want 1-4)`);
  const stepNs = new Set(out.steps.map(x => x.n));
  for (const st of out.steps) {
    const r = ruleById.get(st.ruleId);
    if (!r) { v.push(`RULE_ID: step ${st.n} ruleId ${st.ruleId} not in stage 1`); continue; }
    if (normWs(st.ruleQuote) !== normWs(r.ruleQuote)) v.push(`RULE_QUOTE: step ${st.n} ruleQuote differs from ${r.id} ruleQuote`);
  }
  const want = item.stemPolarity === 'SELECT_CORRECT' ? [3, 5] : [4, 5];
  if (out.derivedFacts.length < want[0] || out.derivedFacts.length > want[1]) v.push(`FACT_COUNT: ${out.derivedFacts.length} for ${item.stemPolarity} (want ${want[0]}-${want[1]})`);
  const factIds = new Set();
  for (const f of out.derivedFacts) {
    if (factIds.has(f.id)) v.push(`ID_DUPLICATE: fact ${f.id}`); factIds.add(f.id);
    if (f.fromSteps.length === 0) v.push(`FROM_STEPS: fact ${f.id} is empty`);
    for (const n of f.fromSteps) if (!stepNs.has(n)) v.push(`FROM_STEPS: fact ${f.id} names step ${n}`);
    let best = 0, bestSentence = '';
    for (const sn of ctx.sentences) { const d = dice2(f.text, sn.norm); if (d > best) { best = d; bestSentence = sn.norm; } }
    info.push(`fact ${f.id}: max dice ${round3(best)} with "${bestSentence.slice(0, 30)}"`);
    if (best >= COPY_DICE_MIN) v.push(`FACT_COPIES_PASSAGE: fact ${f.id} dice ${round3(best)}`);
  }
  for (const ex of ctx.excluded) {
    const d = dice2(s.description, ex.description);
    info.push(`excluded situation dice ${round3(d)} with "${ex.description.slice(0, 20)}"`);
    if (d >= EXCLUDED_DICE_MIN) v.push(`EXCLUDED_SITUATION: description dice ${round3(d)}`);
  }
  return result(v, info);
}

// ctx: { item, situation (stage 2 output) }
export function validateItem(out, ctx) {
  const v = [], info = [], { item, situation } = ctx, factIds = new Set(situation.derivedFacts.map(f => f.id)), stepNs = new Set(situation.steps.map(s => s.n));
  if (out.itemKey !== item.itemKey) v.push(`ITEM_KEY: ${out.itemKey} != ${item.itemKey}`);
  if (out.choices.map(c => c.number).join() !== CHOICES.join()) v.push(`CHOICE_NUMBERS: ${out.choices.map(c => c.number).join()}`);
  if (!CHOICES.includes(out.answer)) v.push(`ANSWER_RANGE: ${out.answer}`);
  const key = item.stemPolarity === 'SELECT_CORRECT' ? 'TRUE' : 'FALSE', keyed = out.choices.filter(c => c.truth === key);
  if (keyed.length !== 1) v.push(`POLARITY: ${keyed.length} choices with truth ${key} (want 1)`);
  else if (keyed[0].number !== out.answer) v.push(`POLARITY: answer ${out.answer} != the ${key} choice ${keyed[0].number}`);
  for (const c of out.choices) {
    const at = `#${c.number}`;
    if (c.truth === 'TRUE') {
      if (c.fromFact === null || !factIds.has(c.fromFact)) v.push(`FROM_FACT: ${at} ${c.fromFact}`);
      if (c.breaksStep !== null || c.twistType !== null) v.push(`TRUE_TWIST: ${at} has breaksStep/twistType`);
    } else {
      if (c.breaksStep === null || !stepNs.has(c.breaksStep)) v.push(`BREAKS_STEP: ${at} ${c.breaksStep}`);
      if (c.twistType === null) v.push(`TWIST_TYPE: ${at} is null`);
      if (c.fromFact !== null) v.push(`FALSE_FROM_FACT: ${at} has fromFact`);
    }
  }
  const falses = out.choices.filter(c => c.truth === 'FALSE');
  if (falses.length >= 2 && new Set(falses.map(c => c.twistType)).size < 2) v.push('TWIST_VARIETY: false choices share one twistType');
  info.push(`onSituation true: ${out.choices.filter(c => c.onSituation).length} of ${out.choices.length} (generator's own value, record only)`);
  if (stemNegationCount(out.stem) > 1) v.push('STEM_NEGATION: more than one negation in the stem');
  if (!out.stem.trim().endsWith(END_PHRASE[item.stemPolarity])) v.push(`STEM_END: not "${END_PHRASE[item.stemPolarity]}"`);
  if (item.form === 'BOGI') { if (out.bogi !== situation.situation.bogiText) v.push('BOGI_TEXT: differs from the stage 2 bogiText'); }
  else if (out.bogi !== null) v.push('BOGI_TEXT: must be null for IN_PASSAGE');
  const len = out.choices.map(c => [c.number, normWs(c.text).length]), ans = len.find(([n]) => n === out.answer), others = len.filter(([n]) => n !== out.answer).map(([, l]) => l);
  if (ans && others.length && ans[1] > Math.max(...others)) v.push(`FORM_GIVEAWAY_LENGTH: answer uniquely longest (${ans[1]} vs ${Math.max(...others)})`);
  const onCount = out.choices.filter(c => c.onSituation).length;
  if (onCount < 4) info.push(`onSituation below 4 (${onCount}); the judge's onItemSituation decides (D-0215 12)`);
  return result(v, info);
}

// ---- fake outputs (dry-run and tests): valid against the schemas and the validators -----------------------------------------------

const sentenceTexts = paragraphs => paragraphs.map(p => p.split(/(?<=[.?!])\s+/u));
export function exampleRules(t) {
  const sents = sentenceTexts(t.paragraphs), at = (pi, si = 0) => sents[Math.min(pi, sents.length - 1)][si] ?? sents[Math.min(pi, sents.length - 1)][0];
  // Open-slot quotes come from the first and last paragraphs, so a middle-paragraph exclusion leaves them usable.
  return { passageId: t.passageId, rules: [
    { id: 'R1', ruleQuote: at(0), statement: '예시 규칙 1', variables: [{ name: '예시 변수', effect: '값이 커지면 결과가 커진다' }], scopeQuote: null,
      statedApplications: [{ target: '예시 대상 A', quote: at(1) }], openSlots: [{ id: 'R1-S1', target: '예시 대상 B', quote: at(0, 0), whatToDerive: '예시 규칙 1을 대상 B에 적용하면 무엇을 알 수 있는가' }] },
    { id: 'R2', ruleQuote: at(sents.length - 1), statement: '예시 규칙 2', variables: [{ name: '예시 변수 2', effect: '값이 같으면 결과가 같다' }], scopeQuote: at(sents.length - 1),
      statedApplications: [], openSlots: [{ id: 'R2-S1', target: '예시 대상 C', quote: at(sents.length - 1, 0), whatToDerive: '예시 규칙 2를 대상 C에 적용하면 무엇을 알 수 있는가' }] }] };
}
export function exampleSituation(t, rulesOut, it, usableIds) {
  const r = rulesOut.rules[0], facts = (it.stemPolarity === 'SELECT_CORRECT' ? 3 : 4);
  return { passageId: t.passageId, itemKey: it.itemKey, form: it.form,
    situation: { description: `${it.itemKey}번 문항의 예시 상황`, slotRef: it.form === 'IN_PASSAGE' ? (usableIds?.[0] ?? null) : null, bogiText: it.form === 'BOGI' ? '예시 보기 첫 문장이다. 예시 보기 둘째 문장이다. 예시 보기 셋째 문장이다.' : null },
    usedRuleIds: [r.id], steps: [{ n: 1, given: '예시 값', ruleId: r.id, ruleQuote: r.ruleQuote, result: '예시 결과' }, { n: 2, given: '앞 단계 결과', ruleId: r.id, ruleQuote: r.ruleQuote, result: '예시 결과 2' }],
    derivedFacts: Array.from({ length: facts }, (_, i) => ({ id: `F${i + 1}`, text: `예시 결론 ${i + 1}번`, fromSteps: [1 + (i % 2)], ifDifferent: '값이 다르면 결론도 달라진다' })), selfCheck: '예시 확인' };
}
export function exampleItem(t, sit, it) {
  const correct = it.stemPolarity === 'SELECT_CORRECT', answer = 3, types = P1_TWIST_TYPES;
  return { passageId: t.passageId, itemKey: it.itemKey, bogi: it.form === 'BOGI' ? sit.situation.bogiText : null, answer,
    stem: it.form === 'BOGI' ? `윗글을 바탕으로 〈보기〉를 이해한 내용으로 ${correct ? '가장 적절한 것은?' : '적절하지 않은 것은?'}` : `윗글을 바탕으로 예시 상황을 이해한 내용으로 ${correct ? '가장 적절한 것은?' : '적절하지 않은 것은?'}`,
    choices: CHOICES.map(n => { const truth = (n === answer) === correct ? 'TRUE' : 'FALSE';
      return { number: n, text: `예시 ${n}번 선지 문장`, truth, onSituation: true, fromFact: truth === 'TRUE' ? sit.derivedFacts[(n - 1) % sit.derivedFacts.length].id : null,
        breaksStep: truth === 'FALSE' ? 1 : null, twistType: truth === 'FALSE' ? types[n % types.length] : null }; }) };
}

// ---- run -------------------------------------------------------------------------------------------------------------------------

// Per target: usable open slots and removed slots for each item (IN_PASSAGE items are filtered; BOGI items pass the rules unchanged).
function filterFor(t, rulesOut, it) {
  if (it.form !== 'IN_PASSAGE') return { rules: rulesOut.rules, removed: [], usableIds: [] };
  return filterOpenSlots(rulesOut.rules, it.excludedSituations, t.paragraphs);
}
const ctxSituation = (t, rulesOut, it, f) => ({ item: it, rules: rulesOut.rules, usableIds: new Set(f.usableIds), removedIds: new Set(f.removed.map(x => x.id)),
  sentences: sentencesOf(t.paragraphs), excluded: it.excludedSituations });
const filterInfo = f => f.removed.map(x => `removed open slot ${x.id}: ${x.reason}`);

export async function main({ dryRun = false, transport, targetsPath = TARGETS_PATH, out = EXP_DIR, promptPaths = PROMPT_PATHS, passages, limits = LIMITS, runsName = 'runs', reuseFrom } = {}) {
  const targets = loadPilotTargets(targetsPath).filter(t => !passages || passages.includes(t.passageId));
  if (!targets.length) throw new Error('NO_TARGETS');
  const promptBytes = Object.fromEntries(Object.entries(promptPaths).map(([k, p]) => [k, readFileSync(p)]));
  const instr = Object.fromEntries(Object.entries(promptBytes).map(([k, b]) => [k, instructionsFrom(b.toString('utf8'))]));
  const rulesRequest = t => buildRequest(instr.RULES, passageInput(t), SCHEMAS.rules);
  const situationRequest = (t, rulesOut, it, f) => buildRequest(instr.SITUATION, situationInput(t, rulesOut, it, f.rules), SCHEMAS.situation);
  const writeRequest = (t, sit, it) => buildRequest(instr.WRITE, writeInput(t, sit, it), SCHEMAS.write);

  if (dryRun) {
    const rows = [], exampleChecks = [], skipped = [], reused = [];
    // With reuseFrom, real earlier outputs replace the example ones and are not counted as requests (D-0227).
    const priorOf = (t, name) => { const p = reuseFrom ? `${reuseFrom}/${t.passageId}/${name}.json` : null; return p && existsSync(p) ? (reused.push(`${t.passageId}/${name}`), JSON.parse(readFileSync(p, 'utf8'))) : null; };
    const add = (t, stage, it, request) => rows.push({ passageId: t.passageId, stage, itemKey: it?.itemKey ?? null, inputBytes: Buffer.byteLength(JSON.stringify(request)), maxOutputTokens: request.max_output_tokens, reserveUsd: reserveUsd(request) });
    const dump = (t, name, request) => { const dir = `${out}/${runsName === 'runs' ? 'dry-run' : `dry-run-${runsName}`}/${t.passageId}`; mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/${name}.request.json`, serialize(request)); };
    for (const t of targets) {
      const r1 = rulesRequest(t), priorRules = priorOf(t, 'rules'); if (!priorRules) { dump(t, 'rules', r1); add(t, 'rules', null, r1); }
      const rulesOut = SCHEMAS.rules.zod.parse(priorRules ?? exampleRules(t));
      exampleChecks.push({ passageId: t.passageId, stage: 'rules', ...validateRules(rulesOut, t.paragraphs) });
      for (const it of t.items) {
        const f = filterFor(t, rulesOut, it);
        if (it.form === 'IN_PASSAGE' && f.usableIds.length === 0) { skipped.push({ passageId: t.passageId, itemKey: it.itemKey, reason: 'NO_OPEN_SLOT' }); continue; }
        const r2 = situationRequest(t, rulesOut, it, f), priorSit = priorOf(t, `situation-${it.itemKey}`); if (!priorSit) { dump(t, `situation-${it.itemKey}`, r2); add(t, 'situation', it, r2); }
        const sit = SCHEMAS.situation.zod.parse(priorSit ?? exampleSituation(t, rulesOut, it, f.usableIds));
        exampleChecks.push({ passageId: t.passageId, stage: `situation-${it.itemKey}`, ...validateSituation(sit, ctxSituation(t, rulesOut, it, f)) });
        const r3 = writeRequest(t, sit, it); if (!priorOf(t, `item-${it.itemKey}`)) { dump(t, `write-${it.itemKey}`, r3); add(t, 'write', it, r3); }
        const item = SCHEMAS.write.zod.parse(exampleItem(t, sit, it));
        exampleChecks.push({ passageId: t.passageId, stage: `write-${it.itemKey}`, ...validateItem(item, { item: it, situation: sit }) });
      }
    }
    const total = rows.reduce((a, r) => a + r.reserveUsd, 0), byStage = {};
    for (const r of rows) { const s = byStage[r.stage] ??= { requests: 0, inputBytes: 0, maxOutputTokens: 0, reserveUsd: 0 }; s.requests++; s.inputBytes += r.inputBytes; s.maxOutputTokens += r.maxOutputTokens; s.reserveUsd += r.reserveUsd; }
    return { dryRun: true, externalRequests: 0, requests: rows.length, model: MODEL, totalReserveUsd: total, overCap: total > limits.usdCap, overMaxRequests: rows.length > limits.maxRequests,
      byStage, skipped, reused, exampleChecksPass: exampleChecks.every(c => c.allPass), exampleChecks, rows };
  }

  const runDir = `${out}/${runsName}`, ledgerPath = `${runDir}/ledger.jsonl`, runPath = `${runDir}/RUN.json`;
  mkdirSync(runDir, { recursive: true });
  if (existsSync(ledgerPath) || existsSync(runPath)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const protectedBefore = Object.assign({}, ...targets.map(t => t.protectedFiles));
  const startedAtUtc = new Date().toISOString();
  const record = row => appendFileSync(ledgerPath, JSON.stringify(row) + '\n');
  let spent = 0, requests = 0, stop = null, client;
  const outcomes = [];

  // One request: limit check, ledger, raw/parsed/validation files. Returns the parsed output (or null) and its row.
  // Reuse (D-0227): a parsed output from an earlier run folder is taken instead of sending, only when that run sent the very same request (same hash).
  const reusedStarts = new Map();
  if (reuseFrom) for (const line of readFileSync(`${reuseFrom}/ledger.jsonl`, 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(line); if (e.event === 'START') reusedStarts.set(e.requestId, e.requestHash); }
  async function send({ t, dir, name, stage, request, schema, validate }) {
    const reserved = reserveUsd(request), requestId = `p1-${t.passageId}-${name}`, row = { passageId: t.passageId, stage, name, requestStatus: 'NOT_SENT', error: null, costUsd: 0 };
    outcomes.push(row);
    const prior = reuseFrom ? `${reuseFrom}/${t.passageId}/${name}` : null;
    if (prior && existsSync(`${prior}.json`)) {
      const requestHash = hash(JSON.stringify(request));
      if (reusedStarts.get(requestId) !== requestHash) throw new Error(`REUSE_MISMATCH: ${requestId} request differs from ${reuseFrom}`);
      const parsed = schema.zod.parse(JSON.parse(readFileSync(`${prior}.json`, 'utf8'))), validation = validate(parsed);
      record({ event: 'REUSED', requestId, from: `${prior}.json`, requestHash, atUtc: new Date().toISOString() });
      writeFileSync(`${dir}/${name}.raw.json`, readFileSync(`${prior}.raw.json`), { flag: 'wx' });
      writeFileSync(`${dir}/${name}.json`, serialize(parsed), { flag: 'wx' });
      writeFileSync(`${dir}/${name}.validation.json`, serialize({ passageId: t.passageId, stage, name, requestStatus: 'REUSED', reusedFrom: `${prior}.json`, error: null, validation }), { flag: 'wx' });
      row.requestStatus = 'REUSED'; row.allPass = validation.allPass;
      return { row, parsed };
    }
    if (!stop) {
      if (requests >= limits.maxRequests) stop = 'RUN_LIMIT: max requests'; else if (spent + reserved > limits.usdCap) stop = 'RUN_LIMIT: usd cap';
      if (stop) record({ event: 'STOP', requestId, reason: stop, atUtc: new Date().toISOString() });
    }
    if (stop) return { row, parsed: null };
    requests++;
    record({ event: 'START', requestId, passageId: t.passageId, stage, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: reserved, requestHash: hash(JSON.stringify(request)) });
    const t0 = performance.now();
    let response = null;
    try { response = await (transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses).create(request, { timeout: P1_TIMEOUT_MS }); }
    catch (e) { row.requestStatus = 'API_ERROR'; row.error = String(e); }
    const cost = response ? usageCost(response.usage) : null, charged = response ? (cost ?? reserved) : (isConnectionError(row.error) ? 0 : reserved);
    spent += charged; row.costUsd = charged;
    record({ event: 'END', requestId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null, responseId: response?.id ?? null,
      status: response?.status ?? row.requestStatus, usage: response?.usage ?? null, costUsd: cost, chargedUsd: charged, costAssumedReserved: !!response && cost === null, error: row.error });
    writeFileSync(`${dir}/${name}.raw.json`, serialize(response ?? { error: row.error }), { flag: 'wx' });
    let parsed = null, validation = null;
    if (response) {
      try {
        if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        parsed = schema.zod.parse(JSON.parse(response.output_text));
        if (parsed.passageId !== t.passageId) throw new Error(`passageId ${parsed.passageId}`);
        validation = validate(parsed);
        writeFileSync(`${dir}/${name}.json`, serialize(parsed), { flag: 'wx' }); row.requestStatus = 'PARSED';
      } catch (e) { row.requestStatus = 'FORMAT_ERROR'; row.error = String(e); parsed = null; }
    }
    writeFileSync(`${dir}/${name}.validation.json`, serialize({ passageId: t.passageId, stage, name, requestStatus: row.requestStatus, error: row.error, validation }), { flag: 'wx' });
    row.allPass = validation?.allPass ?? null;
    return { row, parsed };
  }
  const notSent = (t, dir, name, stage, reason, info = []) => {
    outcomes.push({ passageId: t.passageId, stage, name, requestStatus: 'NOT_SENT', error: reason, costUsd: 0, allPass: null });
    writeFileSync(`${dir}/${name}.validation.json`, serialize({ passageId: t.passageId, stage, name, requestStatus: 'NOT_SENT', error: reason, validation: { allPass: null, violations: [], info } }), { flag: 'wx' });
  };

  // Stage 1: every passage first.
  const rulesOf = new Map();
  for (const t of targets) {
    const dir = `${runDir}/${t.passageId}`; mkdirSync(dir, { recursive: true });
    const { parsed } = await send({ t, dir, name: 'rules', stage: 'rules', request: rulesRequest(t), schema: SCHEMAS.rules, validate: o => validateRules(o, t.paragraphs) });
    if (parsed) rulesOf.set(t.passageId, parsed);
  }

  // Filter open slots per item and apply the gate (D-0227): two or more passages whose IN_PASSAGE item has no usable open slot stop every IN_PASSAGE item
  // before stage 2. BOGI items do not use open slots, so they go on.
  const filtered = new Map();
  for (const t of targets) { const rulesOut = rulesOf.get(t.passageId); if (rulesOut) for (const it of t.items) filtered.set(`${t.passageId}/${it.itemKey}`, filterFor(t, rulesOut, it)); }
  const emptyPassages = targets.filter(t => rulesOf.has(t.passageId) && t.items.some(it => it.form === 'IN_PASSAGE' && filtered.get(`${t.passageId}/${it.itemKey}`).usableIds.length === 0)).map(t => t.passageId);
  const gateStopped = emptyPassages.length >= 2;
  if (gateStopped) record({ event: 'GATE', requestId: 'p1-gate', reason: 'GATE: openSlots (IN_PASSAGE items not sent)', passagesWithoutOpenSlot: emptyPassages, atUtc: new Date().toISOString() });

  for (const t of targets) {
    const dir = `${runDir}/${t.passageId}`, rulesOut = rulesOf.get(t.passageId);
    for (const it of t.items) {
      const sName = `situation-${it.itemKey}`, wName = `item-${it.itemKey}`, f = rulesOut ? filtered.get(`${t.passageId}/${it.itemKey}`) : null;
      if (!rulesOut) { notSent(t, dir, sName, 'situation', 'RULES_FAILED'); notSent(t, dir, wName, 'write', 'RULES_FAILED'); continue; }
      if (gateStopped && it.form === 'IN_PASSAGE') { notSent(t, dir, sName, 'situation', 'GATE: openSlots', filterInfo(f)); notSent(t, dir, wName, 'write', 'GATE: openSlots'); continue; }
      if (it.form === 'IN_PASSAGE' && f.usableIds.length === 0) { notSent(t, dir, sName, 'situation', 'NOT_SENT: NO_OPEN_SLOT', filterInfo(f)); notSent(t, dir, wName, 'write', 'NOT_SENT: NO_OPEN_SLOT'); continue; }
      const s2 = await send({ t, dir, name: sName, stage: 'situation', request: situationRequest(t, rulesOut, it, f), schema: SCHEMAS.situation,
        validate: o => { const v = validateSituation(o, ctxSituation(t, rulesOut, it, f)); v.info.push(...filterInfo(f)); return v; } });
      if (!s2.parsed) { notSent(t, dir, wName, 'write', stop ?? 'SITUATION_FAILED'); continue; }
      await send({ t, dir, name: wName, stage: 'write', request: writeRequest(t, s2.parsed, it), schema: SCHEMAS.write, validate: o => validateItem(o, { item: it, situation: s2.parsed }) });
    }
  }
  const protectedAfter = Object.fromEntries(Object.keys(protectedBefore).map(p => [p, hash(readFileSync(p))]));
  const protectedUnchanged = Object.keys(protectedBefore).every(p => protectedBefore[p] === protectedAfter[p]);
  writeFileSync(runPath, serialize({ version: 1, startedAtUtc, finishedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: P1_TIMEOUT_MS, retries: 0, reuseFrom: reuseFrom ?? null,
    limits, passages: targets.map(t => t.passageId), targetsFile: targetsPath, targetsHash: hash(readFileSync(targetsPath)),
    promptFiles: promptPaths, promptHashes: Object.fromEntries(Object.entries(promptBytes).map(([k, b]) => [k, hash(b)])), instructionsHashes: Object.fromEntries(Object.entries(instr).map(([k, x]) => [k, hash(x)])),
    schemaHashes: Object.fromEntries(Object.entries(SCHEMAS).map(([k, s]) => [k, hash(JSON.stringify(s.json))])),
    inputHashes: Object.fromEntries(targets.map(t => [`rules/${t.passageId}`, hash(JSON.stringify(passageInput(t)))])),
    requests, totalCostUsd: spent, stop, gate: { passagesWithoutOpenSlot: emptyPassages, inPassageBlocked: gateStopped }, protectedFilesUnchanged: protectedUnchanged, protectedFileHashes: { before: protectedBefore, after: protectedAfter }, outcomes }));
  return { requests, totalCostUsd: spent, stop, gateStopped, protectedFilesUnchanged: protectedUnchanged, outcomes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }, num = name => opt(name) ? Number(opt(name)) : undefined;
  const res = await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), out: opt('--out'), passages: opt('--passages')?.split(','), runsName: opt('--runs'), reuseFrom: opt('--reuse-from'),
    limits: { maxRequests: num('--max-requests') ?? LIMITS.maxRequests, usdCap: num('--usd-cap') ?? LIMITS.usdCap } });
  console.log(JSON.stringify(res.dryRun ? { ...res, rows: undefined, exampleChecks: undefined } : res, null, 2));
}
