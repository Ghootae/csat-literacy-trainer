// D-0143 stance marking: per-proposition stance (AUTHOR/FIGURE/COMMON) for the frozen gongsun map, one sol request.
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-17-analysis-map-gongsun-stance.md
// Usage: node --env-file-if-exists=.env scripts/run-analysis-stance-gongsun.mjs [--dry-run] [--passage <id> --exp-dir <dir>] [--passages-dir <dir>] [--stance-dir <dir>] [--prompt <file>]
// --passages-dir reads the passage from another folder; --stance-dir puts outputs (e.g. a dry-run) elsewhere (D-0151).
// --prompt sends another stance prompt file (STANCE-PROMPT-v2, D-0155).
// Other passages (D-0146) reuse the gongsun STANCE-PROMPT.md unchanged; map and outputs come from --exp-dir.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, instructionsFrom, usageCost, reserveUsd, hash, EXP_DIR, MODEL, RATES, PASSAGES_DIR } from './run-analysis-map-gongsun.mjs';

export const STANCE_DIR = `${EXP_DIR}/stance`;
const DEFAULT_STANCE_DIR = STANCE_DIR;
export const PROMPT_PATH = `${EXP_DIR}/STANCE-PROMPT.md`;
export const MAP_PATH = `${EXP_DIR}/frozen-map.json`;
const DEFAULT_MAP_PATH = MAP_PATH;
export const LIMITS = { maxRequests: 1, usdCap: 0.5 };
export const MAX_OUTPUT_TOKENS = 16000;
export const TIMEOUT_MS = 900000;
export const STANCE_KINDS = ['AUTHOR', 'FIGURE', 'COMMON'];

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const ws = s => s.replace(/\s+/gu, ' ').trim();

export const OutputSchema = z.strictObject({
  stances: z.array(z.strictObject({ id: z.string(), kind: z.enum(STANCE_KINDS), holder: z.string().nullable(), evidence: z.string(), note: z.string() })),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);

// User content: passage id, paragraphs and map propositions only. No nodes, relations, or student responses.
export function buildInput(passage, map) {
  return {
    passageId: passage.passageId,
    paragraphs: passage.paragraphs.map(p => ({ paragraphId: p.paragraphId, index: p.position, text: p.text })),
    propositions: map.propositions.map(p => ({ id: p.id, paragraphId: p.paragraphId, text: p.text, sourceQuote: p.sourceQuote })),
  };
}
export function buildRequest(instructions, input, schema = JSON_SCHEMA) {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: 'analysis_stance_v1', strict: true, schema } } };
}

const item = (id, name, violations, extra = {}) => ({ id, name, pass: violations.length === 0, violations, ...extra });

export function validateStances(out, map, passage) {
  const stances = out.stances ?? [], paraById = new Map(passage.paragraphs.map(p => [p.paragraphId, p]));
  const fullText = passage.paragraphs.map(p => p.text).join('\n');
  const propById = new Map(map.propositions.map(p => [p.id, p]));
  const items = [];

  const v1 = [], seen = new Set();
  for (const s of stances) {
    if (seen.has(s.id)) v1.push(`${s.id}: duplicate`);
    seen.add(s.id);
    if (!propById.has(s.id)) v1.push(`${s.id}: unknown id`);
  }
  for (const id of propById.keys()) if (!seen.has(id)) v1.push(`${id}: missing`);
  items.push(item(1, 'id set equals proposition ids', v1));

  const v2 = [];
  for (const s of stances) {
    if (s.kind === 'FIGURE') {
      if (typeof s.holder !== 'string' || s.holder.trim() === '') v2.push(`${s.id}: FIGURE without holder`);
      else if (!fullText.includes(s.holder)) v2.push(`${s.id}: holder "${s.holder}" not in passage text`);
    } else if (s.holder !== null) v2.push(`${s.id}: ${s.kind} must have holder null`);
  }
  items.push(item(2, 'kind/holder consistency', v2));

  const v3 = [], wsOnly = [];
  for (const s of stances) {
    const p = propById.get(s.id); if (!p) continue;
    const para = paraById.get(p.paragraphId);
    if (!para) { v3.push(`${s.id}: unknown paragraphId ${p.paragraphId}`); continue; }
    if (s.evidence.length === 0 || !para.text.includes(s.evidence)) {
      v3.push(`${s.id}: evidence not exact substring of paragraph`);
      if (s.evidence.length > 0 && ws(para.text).includes(ws(s.evidence))) wsOnly.push(s.id);
    }
  }
  items.push(item(3, 'evidence exact substring of proposition paragraph', v3, { matchesAfterWhitespaceNormalization: wsOnly }));

  const holders = [...new Set(stances.filter(s => typeof s.holder === 'string').map(s => s.holder))];
  return { allPass: items.every(i => i.pass), items, holders };
}

// Non-proposition node stance: all propositions below it share (kind, holder) -> that value, else MIXED with parts.
export function deriveNodeStances(map, stances) {
  const sBy = new Map(stances.map(s => [s.id, s])), nodeBy = new Map(map.nodes.map(n => [n.id, n]));
  const leaves = id => { const n = nodeBy.get(id); return n ? n.childIds.flatMap(leaves) : [id]; };
  const out = {};
  for (const n of map.nodes) {
    const counts = new Map();
    for (const pid of leaves(n.id)) {
      const s = sBy.get(pid); if (!s) continue;
      const k = `${s.kind}\u0000${s.holder ?? ''}`, e = counts.get(k) ?? { kind: s.kind, holder: s.holder ?? null, count: 0 };
      e.count++; counts.set(k, e);
    }
    const parts = [...counts.values()];
    out[n.id] = parts.length === 1 ? { kind: parts[0].kind, holder: parts[0].holder } : { kind: 'MIXED', holder: null, parts };
  }
  return out;
}

// Fixed example for dry-run: every proposition AUTHOR, evidence = its sourceQuote.
export function exampleStances(map) {
  return { stances: map.propositions.map(p => ({ id: p.id, kind: 'AUTHOR', holder: null, evidence: p.sourceQuote, note: '' })) };
}

const stanceLabel = s => s.kind === 'MIXED' ? `MIXED (${s.parts.map(p => `${p.kind}${p.holder ? `:${p.holder}` : ''} ${p.count}`).join(', ')})` : s.holder ? `${s.kind}:${s.holder}` : s.kind;
const cell = s => String(s).replace(/\|/gu, '\\|').replace(/\n/gu, ' ');
export function renderStances(map, out, validation, nodeStances) {
  const kindCounts = STANCE_KINDS.map(k => `${k} ${out.stances.filter(s => s.kind === k).length}`).join(', ');
  const lines = ['# 공손룡 입장 표시 결과', '', '해석·평가 없음. 원자료는 `stance.raw.json`, 검증은 `validation.json`.', '',
    `- 검증: ${validation.allPass ? '전부 통과' : '실패 있음'}`];
  for (const i of validation.items) {
    lines.push(`  - 항목 ${i.id} ${i.name}: ${i.pass ? '통과' : `실패 ${i.violations.length}건`}`);
    for (const v of i.violations.slice(0, 30)) lines.push(`    - ${v}`);
    if (i.matchesAfterWhitespaceNormalization?.length) lines.push(`    - 공백 정규화 시 일치: ${i.matchesAfterWhitespaceNormalization.join(', ')}`);
  }
  lines.push(`- holder 목록: ${validation.holders.length ? validation.holders.join(', ') : '(없음)'}`, `- kind 개수: ${kindCounts}`, '');
  const sBy = new Map(out.stances.map(s => [s.id, s]));
  for (const pid of [...new Set(map.propositions.map(p => p.paragraphId))]) {
    lines.push(`## ${pid}`, '', '| ID | 명제 | kind | holder | evidence | note |', '| --- | --- | --- | --- | --- | --- |');
    for (const p of map.propositions.filter(x => x.paragraphId === pid)) {
      const s = sBy.get(p.id);
      lines.push(s ? `| ${p.id} | ${cell(p.text)} | ${s.kind} | ${s.holder ?? ''} | ${cell(s.evidence)} | ${cell(s.note)} |` : `| ${p.id} | ${cell(p.text)} | (없음) | | | |`);
    }
    lines.push('');
  }
  lines.push('## 노드 입장', '', '| ID | 노드 문장 | 계산된 입장 |', '| --- | --- | --- |');
  for (const n of map.nodes) lines.push(`| ${n.id} | ${cell(n.text)} | ${cell(stanceLabel(nodeStances[n.id]))} |`);
  return lines.join('\n') + '\n';
}

export async function main({ dryRun = false, transport, passageId, expDir, passagesDir = PASSAGES_DIR, stanceDir, promptPath = PROMPT_PATH } = {}) {
  const STANCE_DIR = stanceDir ?? (expDir ? `${expDir}/stance` : DEFAULT_STANCE_DIR), MAP_PATH = expDir ? `${expDir}/frozen-map.json` : DEFAULT_MAP_PATH;
  const { passage, file, fileHash } = passageId ? loadPassage(passagesDir, passageId) : loadPassage();
  const mapBytes = readFileSync(MAP_PATH), map = JSON.parse(mapBytes.toString('utf8'));
  const promptBytes = readFileSync(promptPath), promptHashBefore = hash(promptBytes);
  const instructions = instructionsFrom(promptBytes.toString('utf8')), input = buildInput(passage, map), request = buildRequest(instructions, input);
  mkdirSync(STANCE_DIR, { recursive: true });
  if (dryRun) {
    writeFileSync(`${STANCE_DIR}/dry-run.request.json`, serialize(request));
    const ex = exampleStances(map), v = validateStances(ex, map, passage);
    writeFileSync(`${STANCE_DIR}/dry-run.validation.json`, serialize(v));
    return { dryRun: true, externalRequests: 0, reserveUsd: reserveUsd(request), exampleAllPass: v.allPass, propositions: map.propositions.length, inputBytes: Buffer.byteLength(JSON.stringify(request)) };
  }
  const ledgerPath = `${STANCE_DIR}/ledger.jsonl`;
  if (existsSync(ledgerPath) || existsSync(`${STANCE_DIR}/RUN.json`)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const reserved = reserveUsd(request);
  if (reserved > LIMITS.usdCap) throw new Error(`RUN_LIMIT: usd cap (reserve ${reserved})`);
  const runInfo = { version: 1, startedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS,
    rates: RATES, limits: LIMITS, retries: 0, promptFile: promptPath, promptFileHashBefore: promptHashBefore, instructionsHash: hash(instructions),
    passageId: passage.passageId, mapFile: MAP_PATH, mapFileHash: hash(mapBytes), sourceFile: file, sourceFileHash: fileHash, inputHash: hash(JSON.stringify(input)),
    requestHash: hash(JSON.stringify(request)), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), schema: JSON_SCHEMA };
  const record = row => appendFileSync(ledgerPath, JSON.stringify(row) + '\n');
  const requestId = 'stance-r1', t0 = performance.now();
  record({ event: 'START', requestId, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: reserved });
  let response = null, error = null, status = null, spent = 0;
  try {
    const sender = transport ?? new OpenAI({ maxRetries: 0 }).responses;
    response = await sender.create(request, { timeout: TIMEOUT_MS });
  } catch (e) { status = 'API_ERROR'; error = String(e); spent = reserved; }
  const cost = response ? usageCost(response.usage) : null;
  if (response) spent = cost ?? reserved;
  record({ event: 'END', requestId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null,
    responseId: response?.id ?? null, status: response?.status ?? status, usage: response?.usage ?? null, costUsd: cost, costAssumedReserved: !!response && cost === null, error });
  writeFileSync(`${STANCE_DIR}/stance.raw.json`, serialize(response ?? { error }), { flag: 'wx' });
  let validation = null, nodeStances = null;
  if (response) {
    try {
      if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
      if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
      const out = OutputSchema.parse(JSON.parse(response.output_text));
      writeFileSync(`${STANCE_DIR}/stance.json`, serialize(out), { flag: 'wx' });
      status = 'PARSED'; validation = validateStances(out, map, passage);
      nodeStances = deriveNodeStances(map, out.stances);
      writeFileSync(`${STANCE_DIR}/node-stances.json`, serialize(nodeStances), { flag: 'wx' });
      writeFileSync(`${STANCE_DIR}/STANCES.md`, renderStances(map, out, validation, nodeStances), { flag: 'wx' });
    } catch (e) { status = 'FORMAT_ERROR'; error = String(e); }
  }
  writeFileSync(`${STANCE_DIR}/validation.json`, serialize({ requestStatus: status, error, validation }));
  const promptHashAfter = hash(readFileSync(promptPath));
  writeFileSync(`${STANCE_DIR}/RUN.json`, serialize({ ...runInfo, finishedAtUtc: new Date().toISOString(), requests: 1, requestStatus: status, totalCostUsd: spent,
    promptFileHashAfter: promptHashAfter, promptUnchanged: promptHashAfter === promptHashBefore }));
  return { requestStatus: status, totalCostUsd: spent, allPass: validation?.allPass ?? null, promptUnchanged: promptHashAfter === promptHashBefore };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const result = await main({ dryRun: argv.includes('--dry-run'), passageId: opt('--passage'), expDir: opt('--exp-dir'),
    passagesDir: opt('--passages-dir'), stanceDir: opt('--stance-dir'), promptPath: opt('--prompt') });
  console.log(JSON.stringify(result, null, 2));
}
