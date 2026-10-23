// D-0170: generate the "examiner strategy" text (how the examiner twisted one wrong choice) with several models, check it automatically, and save a blind review page.
// Handoff: docs/handoffs/2026-10-23-examiner-strategy-trial.md. Keys are loaded only by Node's --env-file (real runs only).
// Usage: node --env-file=.env scripts/run-examiner-strategy.mjs [--dry-run] --out <dir> --targets <passageId:q:choice,...> --runs <N> --models <id,...>
//   [--conditions <name>=<prompt path>,...] [--schema v1|v2] [--source-quotes] [--max-requests <n>] [--usd-cap <x>]
// Handoff (2nd): docs/handoffs/2026-10-23-examiner-strategy-intent-compare.md
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { hash } from './run-analysis-map-gongsun.mjs';
import { TWIST_TYPES, FIXED_PATH, loadQuestions } from './run-choice-link.mjs';
import { CHOICE_LINK_DIR, TARGETS_PATH, RATES_BY_MODEL, SOL, LUNA, usageCostFor, textOfId } from './run-end-explanation-choice-link-compare.mjs';
import { CONFIGS, PRICES, createProviderTransport, usageCosts } from './lib/provider-adapter.mjs';

export const PROMPT_PATH = 'docs/experiments/examiner-strategy-2026-10-23/PROMPT-v1.md';
export const SOURCE_SESSIONS_DIR = 'docs/experiments/choice-link-end-explanation-compare-2026-10-23/run/sessions';
export const DEEPSEEK = 'deepseek-flash-high';
export const MODELS = [SOL, LUNA, DEEPSEEK];
export const LIMITS = { maxRequests: 18, usdCap: 1 };
export const TIMEOUT_MS = 300000;
export const MAX_ATTEMPTS = 2;
export const OPENAI_MAX_OUTPUT_TOKENS = 16000;
export const SEED = 20261023;
export const BASES = ['SOURCE_ECHO', 'COMMON_SENSE', 'NONE'];
export const MAP_ID_PATTERN = /\b(?:[PCGRXS]\d+(?:-\d+)?[a-z]?|TOP)\b/u;
export const MAP_ID_PATTERN_INPUT = /\b(?:[PCGRX]\d+(?:-\d+)?[a-z]?|TOP)\b/u;

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

// ---- instructions ----------------------------------------------------------------------------------------------------------------

export function extractInstructions(markdown) {
  const m = /^## 지시문[ \t]*\r?\n/mu.exec(markdown);
  if (!m) throw new Error('INSTRUCTIONS_MISSING: no "## 지시문" heading');
  return markdown.slice(m.index + m[0].length).trim();
}

// ---- output schema ---------------------------------------------------------------------------------------------------------------

const str = { type: 'string' };
export const OUTPUT_JSON_SCHEMA = { type: 'object', additionalProperties: false, required: ['parts', 'text'], properties: {
  parts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['choiceQuote', 'twisted', 'evidenceQuotes', 'lure'], properties: {
    choiceQuote: str, twisted: { type: 'boolean' }, evidenceQuotes: { type: 'array', items: str },
    lure: { type: 'object', additionalProperties: false, required: ['basis', 'sourceQuote', 'commonSense'], properties: { basis: { type: 'string', enum: BASES }, sourceQuote: str, commonSense: str } } } } },
  text: { type: 'string', minLength: 1 } } };
const OutputSchema = z.strictObject({ parts: z.array(z.strictObject({ choiceQuote: z.string(), twisted: z.boolean(), evidenceQuotes: z.array(z.string()),
  lure: z.strictObject({ basis: z.enum(BASES), sourceQuote: z.string(), commonSense: z.string() }) })), text: z.string().min(1) });
export const OUTPUT_JSON_SCHEMA_V2 = { type: 'object', additionalProperties: false, required: ['parts', 'text'], properties: {
  parts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['choiceQuote', 'twisted', 'evidenceQuotes', 'trapIntent', 'intentQuotes'], properties: {
    choiceQuote: str, twisted: { type: 'boolean' }, evidenceQuotes: { type: 'array', items: str }, trapIntent: str, intentQuotes: { type: 'array', items: str } } } },
  text: { type: 'string', minLength: 1 } } };
const OutputSchemaV2 = z.strictObject({ parts: z.array(z.strictObject({ choiceQuote: z.string(), twisted: z.boolean(), evidenceQuotes: z.array(z.string()),
  trapIntent: z.string(), intentQuotes: z.array(z.string()) })), text: z.string().min(1) });
export const SCHEMAS = { v1: { json: OUTPUT_JSON_SCHEMA, zod: OutputSchema }, v2: { json: OUTPUT_JSON_SCHEMA_V2, zod: OutputSchemaV2 } };
const schemaOf = name => SCHEMAS[name] ?? (() => { throw new Error(`USAGE: unknown schema ${name} (allowed: ${Object.keys(SCHEMAS).join(', ')})`); })();
export const parseOutput = (text, schema = 'v1') => schemaOf(schema).zod.parse(JSON.parse(text));

// ---- input -----------------------------------------------------------------------------------------------------------------------

export function parseTargets(arg) {
  return arg.split(',').map(s => {
    const m = /^([\w-]+):(\d+):([1-5])$/u.exec(s.trim());
    if (!m) throw new Error(`USAGE: bad target "${s}" (passageId:question:choice)`);
    return { passageId: m[1], number: Number(m[2]), choice: Number(m[3]) };
  });
}
// "<name>=<prompt path>,..." -> [{ name, path }]; no argument means the v1 prompt alone under the name "v1".
export function parseConditions(arg) {
  if (arg == null) return [{ name: 'v1', path: PROMPT_PATH }];
  const list = arg.split(',').map(s => {
    const m = /^([A-Za-z0-9-]+)=(.+)$/u.exec(s.trim());
    if (!m) throw new Error(`USAGE: bad condition "${s}" (name=prompt path)`);
    return { name: m[1], path: m[2].trim() };
  });
  if (new Set(list.map(c => c.name)).size !== list.length) throw new Error('USAGE: duplicate condition name');
  return list;
}
export const targetKey = t => `${t.passageId}-q${t.number}-c${t.choice}`;

// First stored LINK request of the question in the 2026-10-23 comparison run; no other source is used.
export function findSource(passageId, number, root = '.') {
  const dir = `${root}/${SOURCE_SESSIONS_DIR}`, questionId = `${passageId}-q${number}`;
  for (const name of readdirSync(dir).sort()) {
    const file = `${dir}/${name}/LINK.request.json`;
    if (!existsSync(file)) continue;
    const source = JSON.parse(readJson(file).request.input[0].content[0].text).source;
    if (source?.questionId === questionId) return source;
  }
  throw new Error(`SOURCE_MISSING: no LINK.request.json with questionId ${questionId} in ${dir}`);
}

export function loadCtx(passageId, number, root = '.') {
  const t = readJson(`${root}/${TARGETS_PATH}`).find(x => x.passageId === passageId);
  if (!t) throw new Error(`TARGET_MISSING: ${passageId}`);
  const frozenPath = `${root}/${CHOICE_LINK_DIR}/runs/ui-v5/frozen/${passageId}.json`;
  const frozen = readJson(frozenPath), fixedItems = readJson(`${root}/${FIXED_PATH}`).items;
  const question = loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, fixedItems).questions.find(q => q.number === number);
  const frozenQuestion = frozen.questions.find(q => q.number === number);
  if (!question || !frozenQuestion) throw new Error(`QUESTION_MISSING: ${passageId} q${number}`);
  return { frozenPath, map: readJson(`${root}/${t.mapPath}`), question, frozenQuestion };
}

// Source-text version of textOfId: propositions give their sourceQuote, composite nodes the quotes of the propositions below them,
// relations the quotes of both ends. Returns an array of strings, or null when the id cannot be turned into source text.
export function sourceTextsOfId(id, ctx) {
  const props = new Map(ctx.map.propositions.map(p => [p.id, p])), nodes = new Map(ctx.map.nodes.map(n => [n.id, n]));
  const collect = (x, seen = new Set()) => {
    if (seen.has(x)) return [];
    seen.add(x);
    if (props.has(x)) return [props.get(x).sourceQuote];
    return (nodes.get(x)?.childIds ?? []).flatMap(c => collect(c, seen));
  };
  const unique = list => [...new Set(list)];
  if (id === 'TOP') return null;
  if (props.has(id) || nodes.get(id)?.childIds?.length) return unique(collect(id));
  const rel = ctx.map.relations.find(r => r.id === id);
  if (rel) { const list = unique([rel.fromId, rel.toId].flatMap(e => collect(e))); return list.length ? list : null; }
  const text = textOfId(id, ctx);
  return text == null ? null : [text];
}

// Returns { input, missingIds }. Twist type codes and map ids are deliberately left out.
// sourceQuotes: support/changed/nearby carry the passage's own wording (sourceTextsOfId) instead of the map's proposition text.
export function buildInput(target, source, ctx, { sourceQuotes = false } = {}) {
  const choice = ctx.frozenQuestion.choices.find(c => c.number === target.choice);
  if (!choice) throw new Error(`FROZEN_CHOICE_MISSING: q${target.number} ${target.choice}`);
  if (choice.truth !== 'FALSE') throw new Error(`TRUTH_NOT_FALSE: q${target.number} ${target.choice} is ${choice.truth} (out of D-0170 scope)`);
  const missingIds = [];
  const textsOf = ids => {
    const texts = ids.flatMap(id => {
      const found = sourceQuotes ? sourceTextsOfId(id, ctx) : [textOfId(id, ctx)];
      if (found == null || found[0] == null) { missingIds.push({ target: targetKey(target), id }); return []; }
      return found;
    });
    return sourceQuotes ? [...new Set(texts)] : texts;
  };
  const parts = choice.parts.map(p => p.twisted
    ? { choiceQuote: p.quote, twisted: true, how: p.twistDetail, evidenceQuote: p.evidenceQuote, changed: textsOf(p.twistTargetIds), nearby: textsOf(p.contextIds) }
    : { choiceQuote: p.quote, twisted: false, support: textsOf(p.supportIds) });
  const position = id => source.choices.find(c => c.choiceId === id)?.position;
  const chosen = source.choices.find(c => c.position === target.choice);
  return { missingIds, input: { passage: source.passage,
    question: { number: source.questionNumber, stem: source.stem, scenario: source.scenario,
      supplementSegments: (ctx.frozenQuestion.extraSegments ?? []).map(s => ({ id: s.id, quote: s.quote })), textAnnotations: source.textAnnotations,
      choices: source.choices.map(c => ({ position: c.position, text: c.text })), answer: position(source.answerChoiceId) },
    target: { choice: target.choice, text: chosen.text, parts },
    officialExplanation: source.officialExplanation } };
}

// ---- requests and limits ---------------------------------------------------------------------------------------------------------

export function buildRequest(model, instructions, input, schema = 'v1') {
  if (!MODELS.includes(model)) throw new Error(`USAGE: unknown model ${model} (allowed: ${MODELS.join(', ')})`);
  return { model: model === DEEPSEEK ? CONFIGS[DEEPSEEK].model : model, store: false, reasoning: { effort: 'medium' }, max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS, instructions,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: 'examiner_strategy', strict: true, schema: schemaOf(schema).json } } };
}
// Reserved USD: request bytes x input rate + max output x output rate (DeepSeek: conservative rates and the config's max tokens).
export function reserveUsd(model, request) {
  const bytes = Buffer.byteLength(JSON.stringify(request));
  if (model === DEEPSEEK) return (bytes * PRICES.deepseek.input + CONFIGS[DEEPSEEK].maxTokens * PRICES.deepseek.output) / 1e6;
  const r = RATES_BY_MODEL[model];
  return (bytes * r.input + request.max_output_tokens * r.output) / 1e6;
}
export function costOf(model, usage, utc = new Date().toISOString()) {
  if (model === DEEPSEEK) return usageCosts(usage, 'deepseek', utc)?.conservativeUsd ?? null;
  return usageCostFor(model, usage);
}
// Returns a stop reason or null. `requests` is the number already sent (retries included); spentUsd is settled cost so far.
export function limitCheck({ requests, spentUsd, reservedUsd }, limits = LIMITS) {
  if (requests >= limits.maxRequests) return 'RUN_LIMIT: max requests';
  if (spentUsd + reservedUsd > limits.usdCap) return 'RUN_LIMIT: usd cap';
  return null;
}

// ---- retry ----------------------------------------------------------------------------------------------------------------------

export const isRunLimit = e => String(e?.message ?? e).startsWith('RUN_LIMIT');
export function isTransient(e) {
  const status = e?.status ?? e?.httpStatus;
  if (status === 429 || status >= 500) return true;
  return ['TimeoutError', 'AbortError', 'APIConnectionTimeoutError'].includes(e?.name) || /timed? ?out/iu.test(String(e?.message ?? ''));
}
// At most `maxAttempts` sends. Retries transient errors and output parse/schema failures; a RUN_LIMIT error is thrown at once.
// guard(attempt) may throw RUN_LIMIT before a send; settle(attempt, { response, error, parseError }) is called after each send.
// parse(text) turns the output text into an object (throws on failure); accept(parsed) false counts as a format failure and keeps that output as the last result.
export async function generateWithRetry({ send, guard = () => {}, settle = () => {}, maxAttempts = MAX_ATTEMPTS, parse = parseOutput, accept = () => true }) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    guard(attempt);
    let response = null;
    try { response = await send(); } catch (error) {
      settle(attempt, { response: null, error, parseError: null });
      if (isRunLimit(error)) throw error;
      last = { attempt, status: 'API_ERROR', error: String(error), response: null, parsed: null };
      if (isTransient(error)) continue;
      return last;
    }
    try {
      if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
      const parsed = parse(response.output_text);
      if (!accept(parsed)) {
        const parseError = new Error('PARTS_MISMATCH: output parts differ from the input parts');
        settle(attempt, { response, error: null, parseError });
        last = { attempt, status: 'FORMAT_ERROR', error: String(parseError), response, parsed };
        continue;
      }
      settle(attempt, { response, error: null, parseError: null });
      return { attempt, status: 'PARSED', error: null, response, parsed };
    } catch (parseError) {
      settle(attempt, { response, error: null, parseError });
      last = { attempt, status: 'FORMAT_ERROR', error: String(parseError), response, parsed: null };
    }
  }
  return last;
}

// ---- automatic checks (recorded only; they never block generation) ---------------------------------------------------------------

const HONORIFIC_END = /(?:요\.|니다[.!?]?)["'’”)\]*_\s]*$/u;
export const partsMatchOf = (output, input) => {
  const expected = input.target.parts, parts = output.parts ?? [];
  return parts.length === expected.length && parts.every((p, i) => p.choiceQuote === expected[i].choiceQuote);
};
// Single-quoted spans ('...' or ‘...’) of the text, trimmed, final periods dropped, <보기> written as 〈보기〉.
export const quotedSpans = text => [...String(text).matchAll(/'([^']+)'|‘([^’]+)’/gu)]
  .map(m => (m[1] ?? m[2]).trim().replace(/[.。]+$/u, '').trim().replaceAll('<보기>', '〈보기〉')).filter(q => q !== '');
const wordChecks = text => ({
  forbiddenTerms: [...TWIST_TYPES.filter(c => text.includes(c)), ...(text.match(new RegExp(MAP_ID_PATTERN.source, 'gu')) ?? []), ...['골드', '조각'].filter(w => text.includes(w))],
  honorific: text.split(/(?<=[.!?])\s+|\n+/u).map(s => s.trim()).filter(s => HONORIFIC_END.test(s)) });
export function runChecksV2(output, input) {
  const expected = input.target.parts, parts = output.parts ?? [], text = output.text ?? '';
  const found = (q, hay) => hay.some(h => h.includes(q));
  const source = [input.passage, input.question.scenario ?? ''];
  const missing = parts.flatMap(p => [...p.evidenceQuotes, ...p.intentQuotes]).filter(q => !found(q, source));
  const spans = quotedSpans(text), notFound = spans.filter(q => !found(q, [...source, input.target.text]));
  const problems = [], twistedIntentEmpty = [];
  parts.forEach((p, i) => {
    const twisted = expected[i]?.twisted ?? p.twisted;
    if (!twisted && (p.trapIntent.trim() !== '' || p.intentQuotes.length > 0)) problems.push({ index: i, problem: 'untwisted part needs empty trapIntent and intentQuotes' });
    if (twisted && p.trapIntent.trim() === '') twistedIntentEmpty.push(i);
  });
  return { partsMatch: partsMatchOf(output, input), quotesFound: { ok: missing.length === 0, missing }, textQuotes: { quotes: spans, notFound },
    intentFields: { ok: problems.length === 0, problems, twistedIntentEmpty }, ...wordChecks(text) };
}
export function runChecks(output, input, schema = 'v1') {
  if (schema === 'v2') return runChecksV2(output, input);
  const expected = input.target.parts, parts = output.parts ?? [];
  const partsMatch = partsMatchOf(output, input);
  const haystacks = [input.passage, input.question.scenario ?? ''];
  const found = q => haystacks.some(h => h.includes(q));
  const quoted = parts.flatMap(p => [...p.evidenceQuotes, ...(p.lure.basis === 'SOURCE_ECHO' ? [p.lure.sourceQuote] : [])]);
  const missing = quoted.filter(q => !found(q));
  const lureProblems = [];
  parts.forEach((p, i) => {
    const twisted = expected[i]?.twisted ?? p.twisted, { basis, sourceQuote, commonSense } = p.lure;
    if (!twisted && basis !== 'NONE') lureProblems.push({ index: i, problem: 'untwisted part must be NONE' });
    else if (basis === 'SOURCE_ECHO' && sourceQuote.trim() === '') lureProblems.push({ index: i, problem: 'SOURCE_ECHO needs sourceQuote' });
    else if (basis === 'COMMON_SENSE' && commonSense.trim() === '') lureProblems.push({ index: i, problem: 'COMMON_SENSE needs commonSense' });
    else if (basis === 'NONE' && (sourceQuote !== '' || commonSense !== '')) lureProblems.push({ index: i, problem: 'NONE needs empty sourceQuote and commonSense' });
  });
  const text = output.text ?? '';
  const forbidden = [...TWIST_TYPES.filter(c => text.includes(c)), ...(text.match(new RegExp(MAP_ID_PATTERN.source, 'gu')) ?? []), ...['골드', '조각'].filter(w => text.includes(w))];
  const honorific = text.split(/(?<=[.!?])\s+|\n+/u).map(s => s.trim()).filter(s => HONORIFIC_END.test(s));
  return { partsMatch, quotesFound: { ok: missing.length === 0, missing }, lureFields: { ok: lureProblems.length === 0, problems: lureProblems },
    forbiddenTerms: forbidden, honorific };
}

// ---- review page ----------------------------------------------------------------------------------------------------------------

const esc = s => String(s ?? '').replace(/[&<>"]/gu, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/gu, '<strong>$1</strong>');
// Markdown subset: paragraphs, line breaks, bold, lists.
export function markdownToHtml(md) {
  return String(md).split(/\n{2,}/u).map(block => {
    const lines = block.split('\n').filter(l => l.trim() !== '');
    if (!lines.length) return '';
    if (lines.every(l => /^\s*[-*]\s+/u.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/u, ''))}</li>`).join('')}</ul>`;
    if (lines.every(l => /^\s*\d+\.\s+/u.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\s*\d+\.\s+/u, ''))}</li>`).join('')}</ol>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('\n');
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const NUMS = '①②③④⑤';
// entries: [{ target (key), model, run, output, checks }] with an output; returns { html, key }. Model names appear only in key.
export function renderReview(targets, entries) {
  const key = {}, sections = [];
  const rnd = mulberry32(SEED);
  for (const t of targets) {
    const mine = entries.filter(e => e.target === targetKey(t) && e.output);
    const order = [...mine];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const { input } = t, q = input.question;
    const rows = input.target.parts.map(p => `<tr><td>${esc(p.choiceQuote)}</td><td>${p.twisted ? '비틂' : '맞음'}</td><td>${p.twisted
      ? `${esc(p.how)}<br><em>원문</em> ${esc(p.evidenceQuote) || '(없음)'}<br><em>바뀐 곳</em> ${esc(p.changed.join(' / '))}<br><em>확인할 곳</em> ${esc(p.nearby.join(' / '))}` : esc(p.support.join(' / '))}</td></tr>`).join('');
    const cards = order.map((e, i) => {
      const label = `글 ${String.fromCharCode(65 + i)}`;
      key[`${targetKey(t)}:${label}`] = { condition: e.condition, model: e.model, run: e.run };
      const c = e.checks;
      const fieldItem = c.intentFields
        ? `<li>의도 칸: ${c.intentFields.ok}${c.intentFields.problems.length ? ` (${esc(JSON.stringify(c.intentFields.problems))})` : ''}, 비튼 조각 중 의도 비움: ${esc(c.intentFields.twistedIntentEmpty.join(', ')) || '없음'}</li>`
          + `<li>글 속 따옴표: ${c.textQuotes.quotes.length}개${c.textQuotes.notFound.length ? ` (못 찾음: ${esc(c.textQuotes.notFound.join(' | '))})` : ''}</li>`
        : `<li>매력 요인 칸: ${c.lureFields.ok}${c.lureFields.problems.length ? ` (${esc(JSON.stringify(c.lureFields.problems))})` : ''}</li>`;
      return `<article><h3>${label}</h3>${markdownToHtml(e.output.text)}<details><summary>자동 검사</summary><ul>`
        + `<li>조각 일치: ${c.partsMatch}</li><li>인용 찾음: ${c.quotesFound.ok}${c.quotesFound.missing.length ? ` (못 찾음: ${esc(c.quotesFound.missing.join(' | '))})` : ''}</li>${fieldItem}`
        + `<li>금지어: ${esc(c.forbiddenTerms.join(', ')) || '없음'}</li><li>존댓말: ${c.honorific.length ? esc(c.honorific.join(' / ')) : '없음'}</li></ul></details></article>`;
    }).join('');
    sections.push(`<section><h2>${esc(targetKey(t))}</h2><p>${esc(q.stem)}</p><p><strong>${NUMS[t.choice - 1]}</strong> ${esc(input.target.text)} (정답 ${NUMS[q.answer - 1]})</p>`
      + `<table><tr><th>선지 조각</th><th>판정</th><th>동결 지도</th></tr>${rows}</table><div class="grid">${cards}</div></section>`);
  }
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>출제자 전략 글 검토</title>`
    + `<style>body{font-family:sans-serif;max-width:1400px;margin:0 auto;padding:16px;line-height:1.6}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #bbb;padding:6px;vertical-align:top}`
    + `.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}article{border:1px solid #bbb;border-radius:6px;padding:8px 12px}</style></head><body><h1>출제자 전략 글 검토</h1>${sections.join('\n')}</body></html>\n`;
  return { html, key };
}

// Blind page for the user: per target, the choice sentence on top, the texts shuffled (seed USER_SEED) with no model or condition, a grade and memo per text, one best text per target.
// Outputs whose parts do not match the input are left out of the page and listed under `excluded` in the key.
export const USER_SEED = 20261024;
export function renderUserReview(targets, entries, trial) {
  const rnd = mulberry32(USER_SEED), key = {}, excluded = [], sections = [], plan = [];
  targets.forEach((t, ti) => {
    const mine = entries.filter(e => e.target === targetKey(t) && e.output);
    for (const e of mine.filter(x => !x.checks?.partsMatch)) excluded.push({ target: targetKey(t), condition: e.condition, model: e.model, run: e.run, excluded: true });
    const order = mine.filter(e => e.checks?.partsMatch);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const labels = order.map((_, i) => String.fromCharCode(65 + i));
    plan.push({ target: targetKey(t), labels });
    const radio = (name, v) => `<label><input type="radio" name="${name}" value="${v}"> ${v}</label>`;
    const cards = order.map((e, i) => {
      key[`${targetKey(t)}:${labels[i]}`] = { condition: e.condition, model: e.model, run: e.run };
      return `<article><h3>글 ${labels[i]}</h3>${markdownToHtml(e.output.text)}<div class="j">이해 용이성: ${['상', '중', '하'].map(v => radio(`g${ti}_${labels[i]}`, v)).join(' ')}<br>`
        + `<textarea id="m${ti}_${labels[i]}" placeholder="메모(선택)"></textarea></div></article>`;
    }).join('\n');
    sections.push(`<section><h2>${esc(t.passageId)} ${t.number}번 ${NUMS[t.choice - 1]}</h2><p class="q">선지 ${NUMS[t.choice - 1]}: ${esc(t.input.target.text)}</p><div class="grid">${cards}</div>`
      + `<p><strong>가장 좋은 글</strong> ${labels.map(l => radio(`b${ti}`, l)).join(' ')}</p></section>`);
  });
  const data = JSON.stringify({ trial, plan }).replace(/</gu, '\\u003c');
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>출제자 전략 판정</title>`
    + `<style>:root{--bg:#fff;--fg:#1d1d1f;--card:#f5f5f7;--line:#d2d2d7;--accent:#888}@media (prefers-color-scheme:dark){:root{--bg:#1c1c1e;--fg:#f2f2f7;--card:#2c2c2e;--line:#48484a}}`
    + `body{background:var(--bg);color:var(--fg);font-family:-apple-system,sans-serif;max-width:1500px;margin:0 auto;padding:16px;line-height:1.7}`
    + `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:16px}@media (max-width:480px){.grid{grid-template-columns:1fr}}`
    + `article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}.j{border-top:1px solid var(--line);margin-top:8px;padding-top:8px}`
    + `textarea{width:100%;min-height:48px;box-sizing:border-box;background:var(--bg);color:var(--fg);border:1px solid var(--line)}button{font-size:16px;padding:8px 16px;margin:8px 0}`
    + `.q{background:var(--card);border-left:4px solid var(--accent);padding:8px 12px}</style></head><body><h1>출제자 전략 글 판정</h1>`
    + `<p>학생이 문제를 다 푼 뒤 [출제자 전략 보기]를 눌렀을 때 보는 글입니다. 글마다 이해 용이성(상·중·하)을 고르고, 문항마다 가장 좋은 글 하나를 고른 뒤 [결과 복사]를 눌러 대화창에 붙여 주세요. 모델과 조건 이름은 가렸습니다.</p>`
    + `${sections.join('\n')}<h2>전체</h2><textarea id="overall" placeholder="전체 메모(선택)"></textarea><br><button id="copy">결과 복사</button> <span id="msg"></span>`
    + `<script>const D=${data};document.getElementById('copy').onclick=async()=>{const v=n=>document.querySelector('input[name="'+n+'"]:checked')?.value??null;`
    + `const r={trial:D.trial,targets:Object.fromEntries(D.plan.map((p,ti)=>[p.target,{grades:Object.fromEntries(p.labels.map(l=>[l,{grade:v('g'+ti+'_'+l),memo:document.getElementById('m'+ti+'_'+l).value}])),best:v('b'+ti)}])),overall:document.getElementById('overall').value};`
    + `const t=JSON.stringify(r,null,1);try{await navigator.clipboard.writeText(t);document.getElementById('msg').textContent='복사됨'}catch(e){prompt('복사해 주세요',t)}};</script></body></html>\n`;
  return { html, key, excluded };
}

// ---- main -----------------------------------------------------------------------------------------------------------------------

export async function main({ dryRun = false, out, targets, runs, models, root = '.', limits = LIMITS, transports = {}, argv = [],
  conditions = parseConditions(), schema = 'v1', sourceQuotes = false } = {}) {
  if (!out || !targets?.length || !(runs >= 1) || !models?.length) throw new Error('USAGE: --out, --targets, --runs, --models are required');
  schemaOf(schema);
  const startedAt = new Date().toISOString();
  const prompts = conditions.map(c => { const md = readFileSync(`${root}/${c.path}`, 'utf8'); return { ...c, md, instructions: extractInstructions(md) }; });
  const built = targets.map(t => { const source = findSource(t.passageId, t.number, root), ctx = loadCtx(t.passageId, t.number, root); return { ...t, source, ...buildInput(t, source, ctx, { sourceQuotes }), frozenPath: ctx.frozenPath }; });
  const jobs = [];
  for (const t of built) for (const c of prompts) for (let run = 1; run <= runs; run++) for (const model of models) {
    const request = buildRequest(model, c.instructions, t.input, schema), name = `${targetKey(t)}__${c.name}__${model}__r${run}`;
    jobs.push({ t, condition: c.name, run, model, name, request, reservedUsd: reserveUsd(model, request) });
  }
  const w = (path, data, flag = 'w') => writeFileSync(path, typeof data === 'string' ? data : serialize(data), { flag });
  for (const d of ['requests', 'responses', 'outputs']) mkdirSync(`${out}/${d}`, { recursive: true });
  for (const j of jobs) w(`${out}/requests/${j.name}.json`, j.request);
  const reserveByModel = {};
  for (const j of jobs) reserveByModel[j.model] = (reserveByModel[j.model] ?? 0) + j.reservedUsd;
  const base = { version: 2, dryRun, args: argv, startedAtUtc: startedAt, schema, sourceQuotes,
    conditions: Object.fromEntries(prompts.map(c => [c.name, { promptPath: c.path, instructionsSha256: hash(c.md) }])),
    modelConfigs: { [SOL]: { api: 'openai-responses', reasoning: 'medium', maxOutputTokens: OPENAI_MAX_OUTPUT_TOKENS, rates: RATES_BY_MODEL[SOL] },
      [LUNA]: { api: 'openai-responses', reasoning: 'medium', maxOutputTokens: OPENAI_MAX_OUTPUT_TOKENS, rates: RATES_BY_MODEL[LUNA] }, [DEEPSEEK]: { ...CONFIGS[DEEPSEEK], prices: PRICES.deepseek } },
    limits, timeoutMs: TIMEOUT_MS, maxAttempts: MAX_ATTEMPTS, plannedRequests: jobs.length,
    frozenFiles: Object.fromEntries([...new Set(built.map(t => t.frozenPath))].map(p => [p.replace(`${root}/`, ''), hash(readFileSync(p))])),
    missingIds: built.flatMap(t => t.missingIds) };
  if (dryRun) {
    const totalReserveUsd = jobs.reduce((a, j) => a + j.reservedUsd, 0);
    const summary = { requests: jobs.length, externalRequests: 0, reserveUsdByModel: reserveByModel, totalReserveUsd, overCap: totalReserveUsd > limits.usdCap, overMaxRequests: jobs.length > limits.maxRequests };
    w(`${out}/RUN.json`, { ...base, endedAtUtc: new Date().toISOString(), summary });
    return summary;
  }

  // ---- real run: sequential ----
  const ledgerPath = `${out}/ledger.jsonl`;
  if (existsSync(ledgerPath)) throw new Error('RUN_EXISTS: refusing to rerun into an existing output folder');
  const senders = {};
  const senderOf = model => senders[model] ??= transports[model] ?? (model === DEEPSEEK
    ? createProviderTransport({ config: CONFIGS[DEEPSEEK], apiKey: process.env[CONFIGS[DEEPSEEK].keyEnv] })
    : new OpenAI({ maxRetries: 0 }).responses);
  let requests = 0, spentUsd = 0, stop = null;
  const spentByModel = {}, entries = [];
  for (const j of jobs) {
    const attempts = [];
    let result = null;
    try {
      result = await generateWithRetry({
        send: () => senderOf(j.model).create(j.request, { timeout: TIMEOUT_MS, maxRetries: 0 }),
        parse: text => parseOutput(text, schema),
        accept: schema === 'v2' ? parsed => partsMatchOf(parsed, j.t.input) : undefined,
        guard: () => { const why = limitCheck({ requests, spentUsd, reservedUsd: j.reservedUsd }, limits); if (why) throw new Error(why); requests++; },
        settle: (attempt, { response, error, parseError }) => {
          const cost = response ? costOf(j.model, response.usage) : null;
          const charged = response ? (cost ?? j.reservedUsd) : j.reservedUsd;
          spentUsd += charged; spentByModel[j.model] = (spentByModel[j.model] ?? 0) + charged;
          const status = error ? 'API_ERROR' : parseError ? 'FORMAT_ERROR' : 'PARSED';
          attempts.push({ attempt, status, response: response ?? { error: String(error) }, usage: response?.usage ?? null, costUsd: cost, chargedUsd: charged });
          appendFileSync(ledgerPath, JSON.stringify({ atUtc: new Date().toISOString(), target: targetKey(j.t), condition: j.condition, model: j.model, run: j.run, attempt, status, costUsd: cost, chargedUsd: charged, reservedUsd: j.reservedUsd }) + '\n');
        } });
    } catch (e) {
      if (!isRunLimit(e)) throw e;
      stop = String(e.message);
      appendFileSync(ledgerPath, JSON.stringify({ event: 'STOP', atUtc: new Date().toISOString(), target: targetKey(j.t), condition: j.condition, model: j.model, run: j.run, reason: stop }) + '\n');
    }
    w(`${out}/responses/${j.name}.json`, attempts.map(a => ({ attempt: a.attempt, status: a.status, response: a.response })));
    if (stop) break;
    const parsed = result?.parsed ?? null, last = attempts.at(-1);
    const checks = parsed ? runChecks(parsed, j.t.input, schema) : null;
    w(`${out}/outputs/${j.name}.json`, { target: targetKey(j.t), condition: j.condition, model: j.model, run: j.run, status: result?.status ?? 'NONE', attempts: attempts.length, error: result?.error ?? null,
      output: parsed, checks, usage: last?.usage ?? null, costUsd: last?.costUsd ?? null, totalChargedUsd: attempts.reduce((a, x) => a + x.chargedUsd, 0) });
    if (parsed) entries.push({ target: targetKey(j.t), condition: j.condition, model: j.model, run: j.run, output: parsed, checks });
  }
  const { html, key } = renderReview(built, entries);
  w(`${out}/REVIEW.html`, html);
  w(`${out}/KEY.json`, { seed: SEED, note: '판정 전 열지 않는다.', key });
  const user = renderUserReview(built, entries, out.split('/').filter(Boolean).at(-1));
  w(`${out}/USER-REVIEW.html`, user.html);
  w(`${out}/USER-REVIEW-KEY.json`, { seed: USER_SEED, note: '판정 전 열지 않는다.', key: user.key, excluded: user.excluded });
  const summary = { requests, externalRequests: requests, parsed: entries.length, plannedRequests: jobs.length, spentUsd, spentUsdByModel: spentByModel, stop };
  w(`${out}/RUN.json`, { ...base, endedAtUtc: new Date().toISOString(), summary });
  return summary;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const limits = { maxRequests: opt('--max-requests') != null ? Number(opt('--max-requests')) : LIMITS.maxRequests, usdCap: opt('--usd-cap') != null ? Number(opt('--usd-cap')) : LIMITS.usdCap };
  const result = await main({ dryRun: argv.includes('--dry-run'), out: opt('--out'), targets: opt('--targets') ? parseTargets(opt('--targets')) : [], runs: Number(opt('--runs')),
    models: opt('--models')?.split(',').map(s => s.trim()), argv: argv.slice(2), limits, conditions: parseConditions(opt('--conditions')), schema: opt('--schema') ?? 'v1',
    sourceQuotes: argv.includes('--source-quotes') });
  console.log(JSON.stringify(result, null, 2));
}
