// D-0167: re-generate the v5 END_EXPLANATION of the 42 sessions (30 wrong-ending, 12 correct-ending CT/CP) of the v5-diverse-48 regression under two conditions:
// BASE (stored request as is) and LINK (same request plus per-choice choiceLinks and a usage paragraph). Blind X/Y pairs are built for judging.
// Handoff: docs/handoffs/2026-10-23-choice-link-end-explanation-compare.md. Keys are loaded only by Node's --env-file-if-exists (real runs only).
// Usage: node --env-file-if-exists=.env scripts/run-end-explanation-choice-link-compare.mjs [--dry-run] [--reuse-base] --out <dir> [--max-requests <n>] [--usd-cap-sol <x>] [--usd-cap-luna <x>] [--usd-cap <x> (alias of sol)] [--seed <n>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { TIMEOUT_MS, hash } from './run-analysis-map-gongsun.mjs';
import { TWIST_KO, loadQuestions, FIXED_PATH } from './run-choice-link.mjs';
import { INCORRECT_END_INSTRUCTIONS, CORRECT_END_INSTRUCTIONS } from '../packages/pipeline/dist/problem-solving/feedback-v5-end-explanation.js';

export const REGRESSION_DIR = 'docs/experiments/v5-diverse-48-regression-2026-10-22';
export const B3_RECHECK_DIR = 'docs/experiments/v5-diverse-48-b3-recheck-2026-10-22';
export const CHOICE_LINK_DIR = 'docs/experiments/choice-link-2026-10-22';
export const TARGETS_PATH = `${CHOICE_LINK_DIR}/targets-ui.json`;
export const PREFIXES = ['C', 'D', 'G', 'I', 'M', 'S'];
export const ROLES = ['A1', 'A3', 'B1', 'B2', 'B3', 'CT', 'CP'];
export const CASE_IDS = PREFIXES.flatMap(p => ROLES.map(r => `${p}-${r}`));
export const USER_CASES = ['S-A1', 'D-B1', 'C-A3', 'I-B2', 'M-B3', 'G-CT'];
export const SOL = 'gpt-6.1-sol', LUNA = 'gpt-6-luna';
// USD per 1M tokens; same as LIMITS of scripts/run-v5-diverse-48.mjs.
export const RATES_BY_MODEL = { [SOL]: { input: 2, output: 10 }, [LUNA]: { input: 0.10, output: 0.50 } };
export const LIMITS = { maxRequests: 84, usdCap: { [SOL]: 4, [LUNA]: 0.5 } };
export const usageCostFor = (model, usage) => {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const r = RATES_BY_MODEL[model]; return (usage.input_tokens * r.input + usage.output_tokens * r.output) / 1e6;
};
export const reserveUsdFor = request => { const r = RATES_BY_MODEL[request.model]; return (Buffer.byteLength(JSON.stringify(request)) * r.input + request.max_output_tokens * r.output) / 1e6; };
export const DEFAULT_SEED = 20261023;
export const END_MARK = 'firstChoice, reselection, answer';
export const MAX_SUPPORT = 4;
export const CRITERIA = ['① 원문 정확성', '② 선지의 비튼 지점 짚기', '③ 학생 생각 단정 없음', '④ 형식'];
export const TWIST_NAMES = Object.entries(TWIST_KO).filter(([k]) => k !== 'OTHER').map(([, v]) => v);
export const MAP_ID_PATTERN = /\b(?:[PCGRX]\d+(?:-\d+)?|TOP)\b/u;

export const LINK_APPENDIX = `입력 choiceLinks는 선지마다 미리 정리한 자료다. statement가 FALSE인 선지는 twists에 선지의 어느 부분(choicePart)이 원문의 어떤 내용(sourceText)을 어떻게 바꿨는지(how) 적혀 있고, TRUE인 선지는 support에 그 선지가 기대는 원문 내용이 적혀 있다. 판정은 이미 끝났고 이 자료로 판정을 바꾸지 않는다. 내용은 반드시 원문으로 확인한 뒤 쓴다.
firstChoice·reselection 칸: 그 선지가 FALSE이면, 선지의 어느 표현이 원문의 어떤 내용을 어떻게 바꿨는지 한두 문장으로 짚고, 비슷한 선지를 만났을 때 원문에서 무엇을 확인하면 걸러낼 수 있는지 한 문장으로 말한다. 그 선지가 TRUE이면(틀린 것을 고르는 문제에서 맞는 선지를 고른 경우), 선지 내용이 원문의 어디와 맞는지 짚는다.
answer 칸: 정답 선지가 FALSE이면 같은 방식으로 바뀐 곳을 짚고, TRUE이면 support의 원문 내용으로 이유를 잇는다.
choiceLinks는 선지에 대한 사실이지 학생 생각에 대한 자료가 아니다. 학생이 그 바뀐 부분 때문에 선지를 골랐다고 단정하지 않는다. 학생 발화가 그 내용을 말했을 때만 둘을 잇는다. kind 같은 분류 이름을 학생에게 쓰지 않는다.`;

// Correct-ending sessions (보완 1).
export const LINK_APPENDIX_CORRECT = `입력 choiceLinks는 선지마다 미리 정리한 자료다. statement가 FALSE인 선지는 twists에 선지의 어느 부분(choicePart)이 원문의 어떤 내용(sourceText)을 어떻게 바꿨는지(how) 적혀 있고, TRUE인 선지는 support에 그 선지가 기대는 원문 내용이 적혀 있다. 판정은 이미 끝났고 이 자료로 판정을 바꾸지 않는다. 내용은 반드시 원문으로 확인한 뒤 쓴다.
answer 칸: 정답 선지가 FALSE이면(틀린 것을 고르는 문제), 선지의 어느 표현이 원문의 어떤 내용을 어떻게 바꿨는지 한두 문장으로 짚고, 비슷한 선지를 만났을 때 원문에서 무엇을 확인하면 걸러낼 수 있는지 한 문장으로 말한다. 정답 선지가 TRUE이면 support의 원문 내용으로 이유를 잇는다. 학생이 말하지 않은 연결을 원문으로 채울 때 이 자료를 쓴다.
firstChoice·reselection 칸의 규칙(학생 근거에서 틀린 곳이 확인되지 않았으면 틀렸다고 단정하지 않음 등)은 그대로 따른다. 다른 칸에서 고르지 않은 선지가 있으면 오답 세션과 같은 방식으로 짚는다.
choiceLinks는 선지에 대한 사실이지 학생 생각에 대한 자료가 아니다. 학생이 그 바뀐 부분을 알아봤다거나 놓쳤다고 단정하지 않는다. kind 같은 분류 이름을 학생에게 쓰지 않는다.`;
export const KINDS = { INCORRECT: { instructions: INCORRECT_END_INSTRUCTIONS, appendix: LINK_APPENDIX, label: '오답 종료' },
  CORRECT: { instructions: CORRECT_END_INSTRUCTIONS, appendix: LINK_APPENDIX_CORRECT, label: '정답 종료' } };
// Kind is decided by which current constant the stored instructions equal; null if neither.
export const kindOfInstructions = ins => ins === INCORRECT_END_INSTRUCTIONS ? 'INCORRECT' : ins === CORRECT_END_INSTRUCTIONS ? 'CORRECT' : null;

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const jsonLine = o => JSON.stringify(o);
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
// Dry-run copy: base64 data URLs become a size/hash note; http(s) image URLs (stored M-session requests) stay as they are.
export function redactImages(request) {
  const r = structuredClone(request);
  for (const m of r.input) for (const c of m.content) if (c.type === 'input_image' && /^data:/u.test(c.image_url)) {
    const bytes = Buffer.from(c.image_url.split(',')[1], 'base64');
    c.image_url = `<base64 생략, ${bytes.length} bytes, ${hash(bytes)}>`;
  }
  return r;
}
const OutputSchema = z.strictObject({ firstChoice: z.string().min(1), reselection: z.string().min(1).nullable(), answer: z.string().min(1) });

// ---- session discovery -------------------------------------------------------------------------------------------------------------

export const caseDir = caseId => caseId.endsWith('-B3') ? B3_RECHECK_DIR : REGRESSION_DIR;
export function findEndRequest(caseId, root = '.') {
  const dir = `${root}/${caseDir(caseId)}/requests`;
  const files = readdirSync(dir).filter(f => f.startsWith(`${caseId}-`) && f.endsWith('.request.json') && /^\d+\.request\.json$/u.test(f.slice(caseId.length + 1))).sort();
  const hits = files.filter(f => readJson(`${dir}/${f}`).request?.instructions?.includes(END_MARK));
  if (hits.length !== 1) throw new Error(`END_REQUEST_COUNT: ${caseId} has ${hits.length} end-explanation requests in ${dir} (${hits.join(', ')})`);
  const requestPath = `${dir}/${hits[0]}`, responsePath = requestPath.replace(/\.request\.json$/u, '.response.json');
  return { requestPath, responsePath, stored: readJson(requestPath), original: existsSync(responsePath) ? readJson(responsePath) : null };
}

export const payloadOf = request => JSON.parse(request.input[0].content[0].text);
export const passageKeyOf = questionId => questionId.replace(/-q\d+$/u, '');
export const questionNumberOf = questionId => Number(/-q(\d+)$/u.exec(questionId)[1]);

// Chosen choices of the payload: first selection, reselection (second one, if any), answer.
export function sessionChoices(payload) {
  const picked = payload.studentUtterances.filter(u => u.selectedChoice != null).map(u => u.selectedChoice);
  const answer = payload.source.choices.find(c => c.choiceId === payload.source.answerChoiceId)?.position;
  if (!picked.length || !answer) throw new Error(`CHOICES_MISSING: ${payload.source.questionId}`);
  return { firstChoice: picked[0], reselection: picked[1] ?? null, answer };
}

// ---- choiceLinks ------------------------------------------------------------------------------------------------------------------

// ctx: { map: {propositions, nodes, relations}, question: loaded question (supplementSegments), frozenQuestion }.
export function textOfId(id, ctx) {
  const mapped = [...ctx.map.propositions, ...ctx.map.nodes].find(m => m.id === id);
  if (mapped) return mapped.text;
  const extra = (ctx.frozenQuestion.extraSegments ?? []).find(s => s.id === id);
  if (extra) return extra.quote;
  return ctx.question.supplementSegments.find(s => s.id === id)?.text ?? null;
}
export function choiceLinkOf(number, ctx) {
  const choice = ctx.frozenQuestion.choices.find(c => c.number === number);
  if (!choice) throw new Error(`FROZEN_CHOICE_MISSING: q${ctx.frozenQuestion.number} ${number}`);
  if (choice.truth === 'FALSE') return { choice: number, statement: 'FALSE',
    twists: choice.parts.filter(p => p.twisted).map(p => ({ choicePart: p.choiceQuote, sourceText: p.evidenceQuote === '' ? null : p.evidenceQuote, how: p.twistDetail, kind: TWIST_KO[p.twistType] ?? p.twistType })) };
  if (choice.truth !== 'TRUE') throw new Error(`TRUTH_UNKNOWN: q${ctx.frozenQuestion.number} ${number} ${choice.truth}`);
  const support = [];
  for (const id of choice.parts.filter(p => !p.twisted).flatMap(p => p.supportIds)) {
    const text = textOfId(id, ctx);
    if (text != null && !support.includes(text)) support.push(text);
  }
  return { choice: number, statement: 'TRUE', support: support.slice(0, MAX_SUPPORT) };
}
export function buildChoiceLinks(choices, ctx) {
  const numbers = [...new Set([choices.firstChoice, choices.reselection, choices.answer].filter(n => n != null))];
  return numbers.map(n => choiceLinkOf(n, ctx));
}

export function makeLinkRequest(baseRequest, choiceLinks, appendix = LINK_APPENDIX) {
  const r = structuredClone(baseRequest);
  r.input[0].content[0].text = serialize({ ...JSON.parse(r.input[0].content[0].text), choiceLinks });
  r.instructions = `${baseRequest.instructions}\n${appendix}`;
  return r;
}

// ---- blind pairs ----------------------------------------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// One draw per session in CASE_IDS order: X gets BASE or LINK.
export function assignBlind(caseIds, seed = DEFAULT_SEED) {
  const rnd = mulberry32(seed);
  return Object.fromEntries(caseIds.map(id => rnd() < 0.5 ? [id, { X: 'BASE', Y: 'LINK' }] : [id, { X: 'LINK', Y: 'BASE' }]));
}

const FIELDS = [['firstChoice', '처음 고른 선지에 대한 설명'], ['reselection', '다시 고른 선지에 대한 설명'], ['answer', '정답 설명']];
const quote = t => String(t).split('\n').map(l => `> ${l}`).join('\n');
export function renderPair(no, c, assignment, outputs, { withTable = false } = {}) {
  const kindLabel = KINDS[c.kind]?.label;
  const src = c.payload.source, label = String(no).padStart(2, '0');
  const lines = [`## 쌍 ${label}`, '', ...(kindLabel ? [`- 세션 종류: ${kindLabel}`] : []), `- 문항 발문: ${src.stem}`, ...(src.scenario ? ['- 〈보기〉:', '', quote(src.scenario), ''] : []),
    '- 선지:', ...src.choices.map(ch => `  - ${'①②③④⑤'[ch.position - 1]} ${ch.text}`), `- 정답: ${'①②③④⑤'[c.choices.answer - 1]}`, '',
    '<details><summary>원문</summary>', '', quote(src.passage), '', '</details>', '', '### 학생 대화', ''];
  for (const u of c.payload.studentUtterances) {
    if (u.question) lines.push(`- 교정 질문: ${u.question}`);
    lines.push(`- 학생${u.selectedChoice != null ? ` (선지 ${'①②③④⑤'[u.selectedChoice - 1]})` : ''}: ${u.text}`);
  }
  lines.push('');
  for (const side of ['X', 'Y']) {
    const out = outputs[assignment[side]];
    lines.push(`### 설명 ${side}`, '');
    for (const [k, name] of FIELDS) lines.push(`**${name}** (${k})`, '', out[k] == null ? '(없음)' : quote(out[k]), '');
  }
  if (withTable) lines.push('### 판정표', '', '| 기준 | X | Y |', '|---|---|---|', ...CRITERIA.map(k => `| ${k} | | |`), '', '- 더 도움이 되는 쪽 (X / Y / 비슷함):', '- 한 줄 이유:', '');
  return lines.join('\n');
}

// ---- automatic checks (supporting data, not a verdict) ------------------------------------------------------------------------------------

export async function textChecks(out, explanationChecks) {
  const result = {};
  for (const [k] of FIELDS) {
    const text = out[k];
    if (text == null) { result[k] = null; continue; }
    result[k] = { ...explanationChecks(text), noTwistNames: !TWIST_NAMES.some(n => text.includes(n)), noMapIds: !MAP_ID_PATTERN.test(text) };
  }
  return result;
}

// ---- limits -------------------------------------------------------------------------------------------------------------------------------

// Returns a stop reason or null. spentUsd is the actual cost so far of `model`; unknown-cost requests are counted at their reserved amount.
// limits.usdCap is a number (applies to every model) or a { model: cap } map.
export function limitCheck({ requests, spentUsd, reserved, model = SOL }, limits = LIMITS) {
  if (requests >= limits.maxRequests) return 'RUN_LIMIT: max requests';
  const cap = typeof limits.usdCap === 'number' ? limits.usdCap : limits.usdCap[model];
  if (spentUsd + reserved > cap) return `RUN_LIMIT: usd cap (${model})`;
  return null;
}

// ---- preparation ------------------------------------------------------------------------------------------------------------------------

export function prepareCases({ root = '.', caseIds = CASE_IDS } = {}) {
  const fixedItems = readJson(`${root}/${FIXED_PATH}`).items;
  const targets = new Map(readJson(`${root}/${TARGETS_PATH}`).map(t => [t.passageId, t]));
  const loaded = new Map(), cases = [];
  for (const caseId of caseIds) {
    const found = findEndRequest(caseId, root), payload = payloadOf(found.stored.request);
    if (!RATES_BY_MODEL[found.stored.request.model]) throw new Error(`MODEL_MISMATCH: ${caseId} ${found.stored.request.model} (allowed: ${Object.keys(RATES_BY_MODEL).join(', ')})`);
    const kind = kindOfInstructions(found.stored.request.instructions);
    if (!kind) {
      const a = found.stored.request.instructions, b = caseId.endsWith('-CT') || caseId.endsWith('-CP') ? CORRECT_END_INSTRUCTIONS : INCORRECT_END_INSTRUCTIONS;
      let i = 0; while (i < a.length && a[i] === b[i]) i++;
      throw new Error(`INSTRUCTIONS_MISMATCH: ${caseId} equals neither INCORRECT_END_INSTRUCTIONS nor CORRECT_END_INSTRUCTIONS; vs the expected one differs at char ${i} (stored ${a.length} chars, current ${b.length} chars): stored "${a.slice(i, i + 60)}" vs current "${b.slice(i, i + 60)}"`);
    }
    const key = passageKeyOf(payload.source.questionId), number = questionNumberOf(payload.source.questionId), t = targets.get(key);
    if (!t) throw new Error(`TARGET_MISSING: ${key}`);
    if (!loaded.has(key)) {
      const frozenPath = `${root}/${CHOICE_LINK_DIR}/runs/ui-v5/frozen/${key}.json`;
      loaded.set(key, { frozenPath, frozen: readJson(frozenPath), map: readJson(`${root}/${t.mapPath}`), questions: loadQuestions(t.questionsPath, t.answersPath, t.assetsDir, fixedItems).questions });
    }
    const L = loaded.get(key), question = L.questions.find(q => q.number === number), frozenQuestion = L.frozen.questions.find(q => q.number === number);
    if (!question || !frozenQuestion) throw new Error(`QUESTION_MISSING: ${caseId} q${number}`);
    const choices = sessionChoices(payload), choiceLinks = buildChoiceLinks(choices, { map: L.map, question, frozenQuestion });
    const base = structuredClone(found.stored.request), link = makeLinkRequest(base, choiceLinks, KINDS[kind].appendix);
    cases.push({ caseId, kind, model: found.stored.request.model, ...found, payload, questionId: payload.source.questionId, role: caseId.split('-')[1], choices, choiceLinks, frozenPath: L.frozenPath,
      options: found.stored.options, requests: { BASE: base, LINK: link } });
  }
  return cases;
}

const rel = p => p.replace(/^\.\//u, '');
const casesJson = (cases, root) => cases.map(c => ({ caseId: c.caseId, originalRequest: rel(c.requestPath.replace(`${root}/`, '')), questionId: c.questionId, role: c.role, kind: c.kind, model: c.model,
  firstChoice: c.choices.firstChoice, reselection: c.choices.reselection, answer: c.choices.answer, choiceLinks: c.choiceLinks }));

// ---- main -----------------------------------------------------------------------------------------------------------------------------------

export async function main({ dryRun = false, transport, out, root = '.', limits = LIMITS, seed = DEFAULT_SEED, caseIds = CASE_IDS, explanationChecks, reuseBase = false } = {}) {
  // D-0168: reuseBase uses the stored regression output (same instructions/model/input, checked in prepareCases) as BASE and sends LINK only.
  const conds = reuseBase ? ['LINK'] : ['BASE', 'LINK'];
  if (!out) throw new Error('USAGE: --out is required');
  const cases = prepareCases({ root, caseIds });
  const reservedOf = c => ({ BASE: reserveUsdFor(c.requests.BASE), LINK: reserveUsdFor(c.requests.LINK) });
  const totalReserveUsd = cases.reduce((a, c) => a + conds.reduce((b, k) => b + reservedOf(c)[k], 0), 0), totalRequests = cases.length * conds.length;
  const byModel = {};
  for (const c of cases) { const m = byModel[c.model] ??= { sessions: 0, requests: 0, reserveUsd: 0 }; m.sessions++; m.requests += conds.length; m.reserveUsd += conds.reduce((b, k) => b + reservedOf(c)[k], 0); }
  const capOf = m => typeof limits.usdCap === 'number' ? limits.usdCap : limits.usdCap[m];
  for (const [m, v] of Object.entries(byModel)) v.usdCap = capOf(m);
  mkdirSync(`${out}/sessions`, { recursive: true });
  const w = (path, data, flag = 'w') => writeFileSync(path, typeof data === 'string' ? data : serialize(data), { flag });
  for (const c of cases) {
    const dir = `${out}/sessions/${c.caseId}`; mkdirSync(dir, { recursive: true });
    for (const cond of ['BASE', 'LINK']) w(`${dir}/${cond}.request.json`, { caseId: c.caseId, condition: cond, request: redactImages(c.requests[cond]), options: c.options });
    w(`${dir}/ORIGINAL.json`, c.original?.output_text ? JSON.parse(c.original.output_text) : null);
  }
  w(`${out}/CASES.json`, casesJson(cases, root));
  const hashes = { originalRequests: Object.fromEntries(cases.map(c => [c.caseId, hash(readFileSync(c.requestPath))])), instructions: { INCORRECT: hash(INCORRECT_END_INSTRUCTIONS), CORRECT: hash(CORRECT_END_INSTRUCTIONS) },
    linkAppendix: { INCORRECT: hash(LINK_APPENDIX), CORRECT: hash(LINK_APPENDIX_CORRECT) }, frozenFiles: Object.fromEntries([...new Set(cases.map(c => c.frozenPath))].map(p => [p.replace(`${root}/`, ''), hash(readFileSync(p))])) };
  const config = { models: Object.keys(byModel), rates: RATES_BY_MODEL, limits, retries: 0, seed, timeoutMs: TIMEOUT_MS, sessions: cases.length, requests: totalRequests, reuseBase };
  const summary = { sessions: cases.length, requests: totalRequests, externalRequests: 0, instructionsMatchCurrent: true, byModel, totalReserveUsd,
    overCap: Object.values(byModel).some(v => v.reserveUsd > v.usdCap), overMaxRequests: totalRequests > limits.maxRequests };
  if (dryRun) { w(`${out}/RUN.json`, { version: 1, dryRun: true, config, hashes, summary }); return { dryRun: true, ...summary }; }

  // ---- real run: sequential, no retries, BASE and LINK alternating per session ----
  const ledgerPath = `${out}/ledger.jsonl`;
  if (existsSync(ledgerPath)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  let client, requests = 0, stop = null;
  const spentBy = {};
  const record = row => appendFileSync(ledgerPath, jsonLine(row) + '\n');
  const results = [];
  if (reuseBase) for (const c of cases) {
    let parsed = null, status = 'REUSED', error = null;
    try { parsed = OutputSchema.parse(JSON.parse(c.original.output_text)); w(`${out}/sessions/${c.caseId}/BASE.json`, parsed, 'wx'); } catch (e) { status = 'REUSE_ERROR'; error = String(e); }
    results.push({ caseId: c.caseId, condition: 'BASE', status, error, costUsd: 0, parsed });
  }
  outer: for (const c of cases) for (const cond of conds) {
    const reserved = reserveUsdFor(c.requests[cond]);
    stop = limitCheck({ requests, spentUsd: spentBy[c.model] ?? 0, reserved, model: c.model }, limits);
    if (stop) { record({ event: 'STOP', caseId: c.caseId, condition: cond, reason: stop, atUtc: new Date().toISOString() }); break outer; }
    const base = `${out}/sessions/${c.caseId}/${cond}`, requestId = `${c.caseId}-${cond}`, t0 = performance.now(); requests++;
    record({ event: 'START', requestId, model: c.model, atUtc: new Date().toISOString(), reservedUsd: reserved });
    let response = null, error = null, status = null, parsed = null;
    try {
      const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
      response = await sender.create(c.requests[cond], c.options ?? { timeout: TIMEOUT_MS, maxRetries: 0 });
    } catch (e) { status = 'API_ERROR'; error = String(e); spentBy[c.model] = (spentBy[c.model] ?? 0) + reserved; }
    const cost = response ? usageCostFor(c.model, response.usage) : null;
    if (response) spentBy[c.model] = (spentBy[c.model] ?? 0) + (cost ?? reserved);
    record({ event: 'END', requestId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null, responseId: response?.id ?? null,
      status: response?.status ?? status, usage: response?.usage ?? null, costUsd: cost, costAssumedReserved: !!response && cost === null, error });
    w(`${base}.response.json`, response ?? { error }, 'wx');
    if (response) {
      try {
        if (response.output?.some(o => o.content?.some(x => x.type === 'refusal'))) throw new Error('REFUSAL');
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        parsed = OutputSchema.parse(JSON.parse(response.output_text));
        w(`${base}.json`, parsed, 'wx'); status = 'PARSED';
      } catch (e) { status = 'FORMAT_ERROR'; error = String(e); }
    }
    results.push({ caseId: c.caseId, condition: cond, status, error, costUsd: cost, parsed });
  }

  // ---- blind material and checks (pairs with both outputs only) ----
  const assignment = assignBlind(CASE_IDS, seed), byCase = new Map(cases.map(c => [c.caseId, c]));
  const parsedOf = (id, cond) => results.find(r => r.caseId === id && r.condition === cond)?.parsed ?? null;
  const pairs = [], userPairs = [], missing = [];
  CASE_IDS.forEach((id, i) => {
    const c = byCase.get(id); if (!c) return;
    const outputs = { BASE: parsedOf(id, 'BASE'), LINK: parsedOf(id, 'LINK') };
    if (!outputs.BASE || !outputs.LINK) { missing.push(id); return; }
    pairs.push(renderPair(i + 1, c, assignment[id], outputs));
    if (USER_CASES.includes(id)) userPairs.push({ id, text: renderPair(i + 1, c, assignment[id], outputs, { withTable: true }) });
  });
  const head = (title, n) => `# ${title}\n\n- 조건 이름과 선지 연결 자료는 넣지 않았다. 쌍마다 설명 X·Y를 비교해 기준 ①~④를 판정한다.\n- 쌍 ${n}개${missing.length ? ` (응답이 없어 빠진 세션 ${missing.length}개)` : ''}.\n\n`;
  w(`${out}/KEY.json`, { seed, note: '판정 전 열지 않는다.', assignment: Object.fromEntries(CASE_IDS.map((id, i) => [String(i + 1).padStart(2, '0'), { caseId: id, ...assignment[id] }])) });
  w(`${out}/BLIND-PAIRS.md`, head('블라인드 쌍', pairs.length) + pairs.join('\n---\n\n') + '\n');
  w(`${out}/USER-PAIRS.md`, head('사용자용 6쌍', userPairs.length) + userPairs.map(p => p.text).join('\n---\n\n') + '\n');
  explanationChecks ??= (await import('./test-v5-live-connection.mjs')).explanationChecks;
  const checks = {};
  for (const r of results) if (r.parsed) (checks[r.caseId] ??= {})[r.condition] = await textChecks(r.parsed, explanationChecks);
  w(`${out}/CHECKS.json`, { note: '보조 자료이며 판정이 아니다.', checks });
  const final = { ...summary, externalRequests: requests, spentUsd: spentBy, stop, parsed: results.filter(r => r.parsed).length, failed: results.filter(r => !r.parsed).map(r => ({ caseId: r.caseId, condition: r.condition, status: r.status, error: r.error })), missingPairs: missing };
  w(`${out}/RUN.json`, { version: 1, dryRun: false, config, hashes, summary: final });
  return final;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }, num = name => opt(name) !== undefined ? Number(opt(name)) : undefined;
  const result = await main({ dryRun: argv.includes('--dry-run'), reuseBase: argv.includes('--reuse-base'), out: opt('--out'), seed: num('--seed') ?? DEFAULT_SEED,
    limits: { maxRequests: num('--max-requests') ?? LIMITS.maxRequests,
      usdCap: { [SOL]: num('--usd-cap-sol') ?? num('--usd-cap') ?? LIMITS.usdCap[SOL], [LUNA]: num('--usd-cap-luna') ?? LIMITS.usdCap[LUNA] } } });
  console.log(JSON.stringify(result, null, 2));
}
