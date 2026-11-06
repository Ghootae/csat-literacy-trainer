// D-0206 E1: gold-based item generation on exam passages. Conditions A (passage -> items), A2 (passage -> design -> items), B (passage + frozen map + twist distribution -> design -> items).
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-11-06-e1-item-generation-implementation.md
// Usage: node --env-file-if-exists=.env scripts/run-item-generation.mjs [--dry-run] [--targets <json>] [--out <dir>] [--conditions A,A2,B] [--passages <id,...>] [--prompt-version v1|v2] [--max-requests <n>] [--usd-cap <x>]
// Generation requests carry only polarity and scope of each slot (never the exam number or any exam question text). No retries.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, buildInput as buildPassageInput, instructionsFrom, usageCost, reserveUsd, hash, MODEL, TIMEOUT_MS } from './run-analysis-map-gongsun.mjs';
import { isConnectionError } from './run-analysis-judge-gongsun.mjs';
import { TWIST_TYPES, stemPolarity } from './run-choice-link.mjs';

export const EXP_DIR = 'docs/experiments/gold-item-generation-2026-11-06';
export const TARGETS_PATH = `${EXP_DIR}/targets.json`;
export const PROMPT_PATHS = { A: `${EXP_DIR}/BASELINE-PROMPT-v1.md`, DESIGN_A2: `${EXP_DIR}/DESIGN-PROMPT-A2-v1.md`, DESIGN_B: `${EXP_DIR}/DESIGN-PROMPT-B-v1.md`, WRITE: `${EXP_DIR}/WRITE-PROMPT-v1.md` };
// v2 (D-0206 보완): relational choices for A2/B and the self-consistent-false-choice / single-negation stem rules in writing. A stays v1.
export const PROMPT_PATHS_V2 = { ...PROMPT_PATHS, DESIGN_A2: `${EXP_DIR}/DESIGN-PROMPT-A2-v2.md`, DESIGN_B: `${EXP_DIR}/DESIGN-PROMPT-B-v2.md`, WRITE: `${EXP_DIR}/WRITE-PROMPT-v2.md` };
// Two or more negation markers in one stem (e.g. "일치하지 않는 것으로 적절하지 않은 것은?") make the polarity ambiguous.
export const stemNegationCount = stem => (stem.match(/않은|않는|아닌|없는/gu) ?? []).length;
export const FROZEN_DIRS = ['docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen', 'docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/frozen'];
export const CONDITIONS = ['A', 'A2', 'B'];
export const LIMITS = { maxRequests: 20, usdCap: 5 };
export { MODEL, TIMEOUT_MS };
export const MAX_OUTPUT_TOKENS = 16000;
export const POLARITIES = ['SELECT_INCORRECT', 'SELECT_CORRECT'];
export const SCOPES = ['PASSAGE_WIDE', 'CONCEPT'];
export const DESIGN_TWIST_TYPES = TWIST_TYPES.filter(t => t !== 'OTHER');
const CHOICES = [1, 2, 3, 4, 5];

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const normWs = s => s.replace(/\s+/gu, '');

// ---- schemas ---------------------------------------------------------------------------------------------------------------------

const ItemsSchema = z.strictObject({ passageId: z.string(), items: z.array(z.strictObject({ slot: z.number().int(), stem: z.string(), stemPolarity: z.enum(POLARITIES),
  choices: z.array(z.strictObject({ number: z.number().int(), text: z.string() })), answer: z.number().int() })) });
const designSchema = twist => z.strictObject({ passageId: z.string(), slots: z.array(z.strictObject({ slot: z.number().int(), stemPolarity: z.enum(POLARITIES), scope: z.enum(SCOPES),
  concept: z.string().nullable(), answer: z.number().int(),
  choices: z.array(z.strictObject({ number: z.number().int(), truth: z.enum(['TRUE', 'FALSE']), basis: z.array(z.string()), twist: twist.nullable() })) })) });
const DesignSchemaA2 = designSchema(z.strictObject({ label: z.string(), targetQuote: z.string(), change: z.string() }));
const DesignSchemaB = designSchema(z.strictObject({ type: z.enum(DESIGN_TWIST_TYPES), targetIds: z.array(z.string()), change: z.string() }));
export const SCHEMAS = {
  items: { name: 'item_generation_items_v1', zod: ItemsSchema },
  designA2: { name: 'item_generation_design_a2_v1', zod: DesignSchemaA2 },
  designB: { name: 'item_generation_design_b_v1', zod: DesignSchemaB },
};
for (const s of Object.values(SCHEMAS)) s.json = z.toJSONSchema(s.zod);

// ---- targets and inputs ----------------------------------------------------------------------------------------------------------

// Passage, frozen map (relations carry relationType from classify), stances and slots. No exam question or answer file is read here.
export function loadGenTargets(targetsPath = TARGETS_PATH) {
  return readJson(targetsPath).map(t => {
    const { passage, file, fileHash } = loadPassage(t.passagesDir, t.passageId);
    const mapBytes = readFileSync(t.mapPath), stanceBytes = readFileSync(t.stancePath), classifyBytes = readFileSync(t.classifyPath);
    const map = JSON.parse(mapBytes.toString('utf8')), stances = JSON.parse(stanceBytes.toString('utf8')).stances;
    const types = new Map(JSON.parse(classifyBytes.toString('utf8')).items.map(i => [i.id, i.type]));
    map.relations = map.relations.map(r => { if (!types.has(r.id)) throw new Error(`CLASSIFY_MISSING: ${t.passageId} ${r.id}`); return { ...r, relationType: types.get(r.id) }; });
    t.slots.forEach((s, i) => {
      if (s.slot !== i + 1 || !POLARITIES.includes(s.stemPolarity) || !SCOPES.includes(s.scope) || !Number.isInteger(s.realNumber)) throw new Error(`SLOT: ${t.passageId} #${i + 1}`);
    });
    return { passageId: t.passageId, setId: t.setId, passage, map, stances, slots: t.slots,
      protectedFiles: { [file]: fileHash, [t.mapPath]: hash(mapBytes), [t.stancePath]: hash(stanceBytes), [t.classifyPath]: hash(classifyBytes) } };
  });
}

// Twist-type counts over FALSE choices of every frozen choice-link file except the target passage's own.
export function frozenFiles(dirs = FROZEN_DIRS) {
  return dirs.flatMap(d => readdirSync(d).filter(n => n.endsWith('.json')).sort().map(n => `${d}/${n}`));
}
export function twistDistribution(passageId, files = frozenFiles()) {
  const counts = {}, sourcePassages = [];
  for (const f of files) {
    const frozen = readJson(f);
    if (!Array.isArray(frozen?.questions) || frozen.passageId === passageId) continue;
    sourcePassages.push(frozen.passageId);
    for (const q of frozen.questions) for (const c of q.choices) if (c.truth === 'FALSE') for (const p of c.parts) if (p.twisted) counts[p.twistType] = (counts[p.twistType] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { excludedPassageId: passageId, sourcePassages, totalTwistedParts: total,
    byType: Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, count]) => ({ type, count, ratio: Math.round(count / total * 1000) / 1000 })) };
}

export const slotsOf = t => t.slots.map(({ slot, stemPolarity: p, scope }) => ({ slot, stemPolarity: p, scope }));
const passageInput = t => buildPassageInput(t.passage);
// The A and A2 design inputs are the same: passage and slots only.
export const baselineInput = t => ({ ...passageInput(t), slots: slotsOf(t) });
export const designInputB = (t, distribution) => ({ ...passageInput(t), slots: slotsOf(t),
  map: { propositions: t.map.propositions.map(p => ({ id: p.id, paragraphId: p.paragraphId, text: p.text })),
    nodes: t.map.nodes.map(n => ({ id: n.id, kind: n.kind, paragraphId: n.paragraphId, text: n.text, childIds: n.childIds })),
    relations: t.map.relations.map(r => ({ id: r.id, fromId: r.fromId, toId: r.toId, name: r.name, note: r.note, relationType: r.relationType })) },
  stances: t.stances.map(s => ({ id: s.id, kind: s.kind, holder: s.holder })),
  twistDistribution: { totalTwistedParts: distribution.totalTwistedParts, byType: distribution.byType } });
// Korean names of design twist types (DESIGN-PROMPT-B-v1.md table), given to the writer with B designs.
export const TWIST_NAMES_KO = { NEGATION: '긍정·부정 뒤집기', DIRECTION: '방향 뒤집기', SUBSTITUTION: '요소 바꿔치기', CONFLATION: '다른 것을 같은 것으로',
  CAUSE_SWAP: '원인·근거 바꿔치기', WRONG_REASON: '맞는 사실을 엉뚱한 이유로', CONDITION_SHIFT: '조건 옮기기', HOLDER_SWAP: '입장 주인 바꾸기',
  PAIR_SWAP: '대비 쌍 뒤바꾸기', ABSOLUTIZE: '전칭·절대화', SCOPE_EXTEND: '적용 범위 넓히기', DEGREE: '정도 바꾸기', ADDED_CONTENT: '없는 내용 덧붙이기', ADDED_METHOD: '글에 없는 서술 방식' };
// B designs refer to map units by id; the writer has no map, so ids are resolved to { id, text } and twist types get their Korean name.
// A2 designs already carry passage quotes and are passed unchanged.
export function resolveDesignB(design, map) {
  const units = new Map([...map.propositions, ...map.nodes].map(u => [u.id, u.text]));
  const relations = new Map(map.relations.map(r => [r.id, `${r.fromId} → ${r.toId} (${r.name}): ${r.note ?? ''}`.trim()]));
  const res = id => ({ id, text: units.get(id) ?? relations.get(id) ?? null });
  return { slots: design.slots.map(s => ({ ...s, choices: s.choices.map(c => ({ ...c, basis: c.basis.map(res),
    twist: c.twist ? { ...c.twist, typeName: TWIST_NAMES_KO[c.twist.type] ?? c.twist.type, targetIds: undefined, targets: c.twist.targetIds.map(res) } : null })) })) };
}
export const writeInput = (t, design, cond = 'A2') => ({ ...passageInput(t), design: cond === 'B' ? JSON.parse(JSON.stringify(resolveDesignB(design, t.map))) : { slots: design.slots } });

export function buildRequest(instructions, input, schema) {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: schema.name, strict: true, schema: schema.json } } };
}

// ---- validation ------------------------------------------------------------------------------------------------------------------

const SYMBOLS = /[㉠-㉿ⓐ-ⓩ]/u;
const matchKind = (text, quote) => text.includes(quote) ? 'EXACT' : normWs(text).includes(normWs(quote)) && normWs(quote) !== '' ? 'WHITESPACE' : null;
const result = (violations, info = []) => ({ allPass: violations.length === 0, violations, info });

// kind: 'A2' | 'B'. A2 basis and targetQuote are passage substrings (whitespace-only differences pass and are listed in info); B ids exist in the map.
export function validateDesign(design, kind, slots, paragraphs, map = null) {
  const v = [], info = [], text = paragraphs.join('\n'), ids = map ? new Set([...map.propositions, ...map.nodes, ...map.relations].map(x => x.id)) : null;
  const quote = (at, q) => { const k = matchKind(text, q); if (!k) v.push(`${at}: not in passage "${q.slice(0, 40)}"`); else if (k === 'WHITESPACE') info.push(`${at}: matches ignoring whitespace "${q.slice(0, 40)}"`); };
  if (design.slots.map(s => s.slot).join() !== slots.map(s => s.slot).join()) v.push(`slots ${design.slots.map(s => s.slot).join()} != ${slots.map(s => s.slot).join()}`);
  for (const want of slots) {
    const s = design.slots.find(x => x.slot === want.slot); if (!s) continue;
    const at = `slot ${s.slot}`;
    if (s.stemPolarity !== want.stemPolarity) v.push(`${at}: stemPolarity ${s.stemPolarity} != ${want.stemPolarity}`);
    if (s.scope !== want.scope) v.push(`${at}: scope ${s.scope} != ${want.scope}`);
    if ((want.scope === 'CONCEPT') !== (s.concept !== null && s.concept.trim() !== '')) v.push(`${at}: concept ${s.concept === null ? 'null' : 'set'} with scope ${want.scope}`);
    if (s.choices.map(c => c.number).join() !== CHOICES.join()) v.push(`${at}: choice numbers ${s.choices.map(c => c.number).join()}`);
    const key = want.stemPolarity === 'SELECT_INCORRECT' ? 'FALSE' : 'TRUE', keyed = s.choices.filter(c => c.truth === key);
    if (keyed.length !== 1) v.push(`${at}: ${keyed.length} choices with truth ${key} (want 1)`);
    else if (keyed[0].number !== s.answer) v.push(`${at}: answer ${s.answer} != the ${key} choice ${keyed[0].number}`);
    const typeCount = {};
    for (const c of s.choices) {
      const ca = `${at}#${c.number}`;
      if (c.basis.length === 0) v.push(`${ca}: empty basis`);
      if (c.truth === 'TRUE' && c.twist !== null) v.push(`${ca}: TRUE choice with twist`);
      if (c.truth === 'FALSE' && c.twist === null) v.push(`${ca}: FALSE choice without twist`);
      if (kind === 'A2') {
        c.basis.forEach((b, i) => quote(`${ca} basis[${i}]`, b));
        if (c.twist) quote(`${ca} twist.targetQuote`, c.twist.targetQuote);
      } else {
        for (const id of c.basis) if (!ids.has(id)) v.push(`${ca}: basis id ${id} not in map`);
        if (c.twist) {
          if (!DESIGN_TWIST_TYPES.includes(c.twist.type)) v.push(`${ca}: twist type ${c.twist.type} not in list`);
          if (c.twist.targetIds.length === 0) v.push(`${ca}: empty twist targetIds`);
          for (const id of c.twist.targetIds) if (!ids.has(id)) v.push(`${ca}: twist target id ${id} not in map`);
          typeCount[c.twist.type] = (typeCount[c.twist.type] ?? 0) + 1;
        }
      }
    }
    for (const [type, n] of Object.entries(typeCount)) if (n > 2) v.push(`${at}: twist type ${type} used ${n} times (max 2)`);
  }
  return result(v, info);
}

// design: the validated design table (A2/B) or null (A: no table, so the answer can only be range-checked).
export function validateItems(items, slots, design) {
  const v = [], seen = new Map();
  if (items.items.map(i => i.slot).join() !== slots.map(s => s.slot).join()) v.push(`slots ${items.items.map(i => i.slot).join()} != ${slots.map(s => s.slot).join()}`);
  for (const want of slots) {
    const it = items.items.find(x => x.slot === want.slot); if (!it) continue;
    const at = `slot ${it.slot}`, d = design?.slots.find(x => x.slot === want.slot);
    if (it.stemPolarity !== want.stemPolarity) v.push(`${at}: stemPolarity ${it.stemPolarity} != ${want.stemPolarity}`);
    if (stemPolarity(it.stem) !== want.stemPolarity) v.push(`${at}: stem text polarity ${stemPolarity(it.stem)} != ${want.stemPolarity}`);
    if (stemNegationCount(it.stem) >= 2) v.push(`${at}: stem double negation`);
    if (it.choices.map(c => c.number).join() !== CHOICES.join()) v.push(`${at}: choice numbers ${it.choices.map(c => c.number).join()}`);
    if (!CHOICES.includes(it.answer)) v.push(`${at}: answer ${it.answer} out of range`);
    if (d) {
      if (it.answer !== d.answer) v.push(`${at}: answer ${it.answer} != design answer ${d.answer}`);
      const key = want.stemPolarity === 'SELECT_INCORRECT' ? 'FALSE' : 'TRUE', keyed = d.choices.filter(c => c.truth === key);
      if (keyed.length !== 1 || keyed[0].number !== it.answer) v.push(`${at}: answer ${it.answer} does not match the design ${key} choice`);
      if (want.scope === 'CONCEPT' && d.concept && !it.stem.includes(d.concept)) v.push(`${at}: stem does not name concept "${d.concept}"`);
    }
    if (SYMBOLS.test(it.stem) || it.choices.some(c => SYMBOLS.test(c.text))) v.push(`${at}: circled symbol in stem or choice`);
    for (const c of it.choices) {
      if (c.text.trim() === '') v.push(`${at}#${c.number}: empty text`);
      const k = normWs(c.text), prev = seen.get(k);
      if (prev && k !== '') v.push(`${at}#${c.number}: same text as ${prev}`);
      seen.set(k, `${at}#${c.number}`);
    }
  }
  return result(v);
}

// ---- fake outputs (dry-run and tests): valid against the schemas and the validators ---------------------------------------------

export function exampleDesign(kind, t) {
  const first = kind === 'A2' ? t.passage.paragraphs[0].text.slice(0, 12) : t.map.propositions[0].id;
  return { passageId: t.passageId, slots: slotsOf(t).map(s => {
    const key = s.stemPolarity === 'SELECT_INCORRECT' ? 'FALSE' : 'TRUE', answer = 3;
    return { ...s, concept: s.scope === 'CONCEPT' ? '예시 개념' : null, answer, choices: CHOICES.map(n => {
      const truth = (n === answer) === (key === 'TRUE') ? 'TRUE' : 'FALSE';
      return { number: n, truth, basis: [first], twist: truth === 'TRUE' ? null
        : kind === 'A2' ? { label: '예시 비틂', targetQuote: first, change: '예시' } : { type: DESIGN_TWIST_TYPES[n % DESIGN_TWIST_TYPES.length], targetIds: [first], change: '예시' } };
    }) };
  }) };
}
export function exampleItems(t, design = null) {
  return { passageId: t.passageId, items: slotsOf(t).map(s => {
    const concept = design?.slots.find(x => x.slot === s.slot)?.concept ?? (s.scope === 'CONCEPT' ? '예시 개념' : null);
    const stem = `${concept ? `${concept}에 대한 ` : '윗글에 대한 '}이해로 ${s.stemPolarity === 'SELECT_INCORRECT' ? '적절하지 않은' : '적절한'} 것은?`;
    return { slot: s.slot, stem, stemPolarity: s.stemPolarity, choices: CHOICES.map(n => ({ number: n, text: `예시 ${s.slot}번 문항의 ${n}번 선지` })), answer: design?.slots.find(x => x.slot === s.slot)?.answer ?? 3 };
  }) };
}

// ---- run -------------------------------------------------------------------------------------------------------------------------

// Request plan of one (passage, condition): stages in order; a later stage's request is built from the earlier stage's parsed output.
function stagesOf(cond, t, instr, distribution) {
  if (cond === 'A') return [{ stage: 'items', kind: 'baseline', request: () => buildRequest(instr.A, baselineInput(t), SCHEMAS.items) }];
  const a2 = cond === 'A2', schema = a2 ? SCHEMAS.designA2 : SCHEMAS.designB;
  return [
    { stage: 'design', kind: 'design', schema, exampleDesign: () => exampleDesign(a2 ? 'A2' : 'B', t), request: () => buildRequest(a2 ? instr.DESIGN_A2 : instr.DESIGN_B, a2 ? baselineInput(t) : designInputB(t, distribution), schema) },
    { stage: 'items', kind: 'write', request: design => buildRequest(instr.WRITE, writeInput(t, design, cond), SCHEMAS.items) },
  ];
}

export async function main({ dryRun = false, transport, targetsPath = TARGETS_PATH, out = EXP_DIR, promptPaths = PROMPT_PATHS, conditions = CONDITIONS, passages, limits = LIMITS, frozen = frozenFiles() } = {}) {
  const bad = conditions.filter(c => !CONDITIONS.includes(c)); if (bad.length) throw new Error(`CONDITION: ${bad.join(',')}`);
  const targets = loadGenTargets(targetsPath).filter(t => !passages || passages.includes(t.passageId));
  if (!targets.length) throw new Error('NO_TARGETS');
  const promptBytes = Object.fromEntries(Object.entries(promptPaths).map(([k, p]) => [k, readFileSync(p)]));
  const instr = Object.fromEntries(Object.entries(promptBytes).map(([k, b]) => [k, instructionsFrom(b.toString('utf8'))]));
  const distributions = Object.fromEntries(targets.map(t => [t.passageId, twistDistribution(t.passageId, frozen)]));
  mkdirSync(`${out}/inputs`, { recursive: true });
  for (const t of targets) writeFileSync(`${out}/inputs/${t.passageId}.twist-distribution.json`, serialize({ passageId: t.passageId, ...distributions[t.passageId] }));
  const plan = targets.flatMap(t => conditions.map(cond => ({ t, cond, stages: stagesOf(cond, t, instr, distributions[t.passageId]) })));

  if (dryRun) {
    const rows = [];
    for (const { t, cond, stages } of plan) {
      const dir = `${out}/dry-run/generation/${cond}/${t.passageId}`; mkdirSync(dir, { recursive: true });
      let design = null;
      for (const s of stages) {
        const request = s.request(design); writeFileSync(`${dir}/${s.stage}.request.json`, serialize(request));
        rows.push({ condition: cond, passageId: t.passageId, stage: s.stage, kind: s.kind, inputBytes: Buffer.byteLength(JSON.stringify(request)), maxOutputTokens: request.max_output_tokens, reserveUsd: reserveUsd(request) });
        if (s.exampleDesign) design = s.exampleDesign();
      }
    }
    const total = rows.reduce((a, r) => a + r.reserveUsd, 0);
    return { dryRun: true, externalRequests: 0, requests: rows.length, model: MODEL, totalReserveUsd: total, overCap: total > limits.usdCap, overMaxRequests: rows.length > limits.maxRequests, rows };
  }

  const runDir = `${out}/runs`, ledgerPath = `${runDir}/ledger.jsonl`, runPath = `${runDir}/RUN.json`;
  mkdirSync(runDir, { recursive: true });
  if (existsSync(ledgerPath) || existsSync(runPath)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const protectedBefore = Object.assign({}, ...targets.map(t => t.protectedFiles));
  const startedAtUtc = new Date().toISOString();
  const record = row => appendFileSync(ledgerPath, JSON.stringify(row) + '\n');
  let spent = 0, requests = 0, stop = null, client;
  const outcomes = [];
  for (const { t, cond, stages } of plan) {
    const dir = `${runDir}/${cond}/${t.passageId}`; mkdirSync(dir, { recursive: true });
    let design = null;
    for (const s of stages) {
      const request = s.request(design), reserved = reserveUsd(request), requestId = `item-generation-${cond}-${t.passageId}-${s.stage}`;
      if (!stop) {
        if (requests >= limits.maxRequests) stop = 'RUN_LIMIT: max requests'; else if (spent + reserved > limits.usdCap) stop = 'RUN_LIMIT: usd cap';
        if (stop) record({ event: 'STOP', requestId, reason: stop, atUtc: new Date().toISOString() });
      }
      const row = { condition: cond, passageId: t.passageId, stage: s.stage, requestStatus: 'NOT_SENT', error: null, costUsd: 0 };
      outcomes.push(row);
      if (stop) break;
      requests++;
      record({ event: 'START', requestId, condition: cond, passageId: t.passageId, stage: s.stage, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: reserved, requestHash: hash(JSON.stringify(request)) });
      const t0 = performance.now();
      let response = null;
      try { response = await (transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses).create(request, { timeout: TIMEOUT_MS }); }
      catch (e) { row.requestStatus = 'API_ERROR'; row.error = String(e); }
      const cost = response ? usageCost(response.usage) : null, charged = response ? (cost ?? reserved) : (isConnectionError(row.error) ? 0 : reserved);
      spent += charged; row.costUsd = charged;
      record({ event: 'END', requestId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null, responseId: response?.id ?? null,
        status: response?.status ?? row.requestStatus, usage: response?.usage ?? null, costUsd: cost, chargedUsd: charged, costAssumedReserved: !!response && cost === null, error: row.error });
      writeFileSync(`${dir}/${s.stage}.raw.json`, serialize(response ?? { error: row.error }), { flag: 'wx' });
      let parsed = null, validation = null;
      if (response) {
        try {
          if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
          if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
          parsed = (s.schema ?? SCHEMAS.items).zod.parse(JSON.parse(response.output_text));
          if (parsed.passageId !== t.passageId) throw new Error(`passageId ${parsed.passageId}`);
          validation = s.stage === 'design' ? validateDesign(parsed, cond, slotsOf(t), t.passage.paragraphs.map(p => p.text), cond === 'B' ? t.map : null)
            : validateItems(parsed, slotsOf(t), design);
          writeFileSync(`${dir}/${s.stage}.json`, serialize(parsed), { flag: 'wx' }); row.requestStatus = 'PARSED';
        } catch (e) { row.requestStatus = 'FORMAT_ERROR'; row.error = String(e); parsed = null; }
      }
      writeFileSync(`${dir}/${s.stage}.validation.json`, serialize({ condition: cond, passageId: t.passageId, stage: s.stage, requestStatus: row.requestStatus, error: row.error, validation }), { flag: 'wx' });
      row.allPass = validation?.allPass ?? null;
      if (s.stage === 'design') { if (!parsed) break; design = parsed; }
    }
  }
  const protectedAfter = Object.fromEntries(Object.keys(protectedBefore).map(p => [p, hash(readFileSync(p))]));
  const protectedUnchanged = Object.keys(protectedBefore).every(p => protectedBefore[p] === protectedAfter[p]);
  writeFileSync(runPath, serialize({ version: 1, startedAtUtc, finishedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS, retries: 0,
    limits, conditions, passages: targets.map(t => t.passageId), targetsFile: targetsPath, targetsHash: hash(readFileSync(targetsPath)),
    promptFiles: promptPaths, promptHashes: Object.fromEntries(Object.entries(promptBytes).map(([k, b]) => [k, hash(b)])), instructionsHashes: Object.fromEntries(Object.entries(instr).map(([k, x]) => [k, hash(x)])),
    schemaHashes: Object.fromEntries(Object.entries(SCHEMAS).map(([k, s]) => [k, hash(JSON.stringify(s.json))])),
    inputHashes: Object.fromEntries(plan.map(({ t, cond }) => [`${cond}/${t.passageId}`, hash(JSON.stringify(cond === 'B' ? designInputB(t, distributions[t.passageId]) : baselineInput(t)))])),
    twistDistributionHashes: Object.fromEntries(targets.map(t => [t.passageId, hash(JSON.stringify(distributions[t.passageId]))])),
    requests, totalCostUsd: spent, stop, protectedFilesUnchanged: protectedUnchanged, protectedFileHashes: { before: protectedBefore, after: protectedAfter }, outcomes }));
  return { requests, totalCostUsd: spent, stop, protectedFilesUnchanged: protectedUnchanged, outcomes };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }, num = name => opt(name) ? Number(opt(name)) : undefined;
  const pv = opt('--prompt-version') ?? 'v1'; if (!['v1', 'v2'].includes(pv)) throw new Error(`PROMPT_VERSION: ${pv}`);
  const res = await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), out: opt('--out'), promptPaths: pv === 'v2' ? PROMPT_PATHS_V2 : PROMPT_PATHS, conditions: opt('--conditions')?.split(','), passages: opt('--passages')?.split(','),
    limits: { maxRequests: num('--max-requests') ?? LIMITS.maxRequests, usdCap: num('--usd-cap') ?? LIMITS.usdCap } });
  console.log(JSON.stringify(res.dryRun ? { ...res, rows: undefined } : res, null, 2));
}
