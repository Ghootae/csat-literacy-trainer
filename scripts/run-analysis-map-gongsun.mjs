// D-0143 stage 1: hierarchical analysis-map generation for one passage (gongsun-long-later-mohists).
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-16-analysis-map-gongsun-stage1.md
// Usage: node --env-file-if-exists=.env scripts/run-analysis-map-gongsun.mjs [--dry-run] [--passage <id>] [--exp-dir <dir>] [--prompt <path>] [--paragraphs <n>] [--passages-dir <dir>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod/v4';

export const PASSAGE_ID = 'gongsun-long-later-mohists';
// Same source dir as loadDialoguePassages() in packages/app/src/server/content.ts (DIALOGUE_ROOT).
export const PASSAGES_DIR = 'packages/pipeline/fixtures/experiments/dialogue/passages';
export const EXP_DIR = 'docs/experiments/analysis-map-gongsun-2026-10-16';
export const PROMPT_PATH = `${EXP_DIR}/MAP-PROMPT.md`;
export const MODEL = 'gpt-6.1-sol';
export const RATES = { input: 2, output: 10 }; // USD per 1M tokens, same as test-thought-diagnosis-v0.mjs
export const LIMITS = { maxRequests: 3, usdCap: 2 };
export const MAX_OUTPUT_TOKENS = 32000;
export const TIMEOUT_MS = 900000;
export const KINDS = ['COMPOSITE', 'PARAGRAPH_GIST', 'CROSS', 'TOP'];

export const hash = x => createHash('sha256').update(x).digest('hex');
const serialize = v => JSON.stringify(v, null, 2) + '\n';

export const OutputSchema = z.strictObject({
  passageId: z.string(),
  propositions: z.array(z.strictObject({ id: z.string(), paragraphId: z.string(), text: z.string(), sourceQuote: z.string(), role: z.string() })),
  nodes: z.array(z.strictObject({ id: z.string(), kind: z.enum(KINDS), paragraphId: z.string().nullable(), text: z.string(), childIds: z.array(z.string()) })),
  relations: z.array(z.strictObject({ id: z.string(), fromId: z.string(), toId: z.string(), name: z.string(), note: z.string() })),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);

export function loadPassage(dir = PASSAGES_DIR, passageId = PASSAGE_ID) {
  for (const name of readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const bytes = readFileSync(resolve(dir, name));
    const p = JSON.parse(bytes.toString('utf8'));
    if (p.passageId === passageId) return { passage: p, file: `${dir}/${name}`, fileHash: hash(bytes) };
  }
  throw new Error(`SOURCE_NOT_FOUND: ${passageId}`);
}
// User content: passage id and per-paragraph { paragraphId, index, text } only. No gold, axes, or student responses.
export function buildInput(passage) {
  return { passageId: passage.passageId, paragraphs: passage.paragraphs.map(p => p.section === undefined
    ? { paragraphId: p.paragraphId, index: p.position, text: p.text }
    : { paragraphId: p.paragraphId, index: p.position, section: p.section, text: p.text }) };
}
export function instructionsFrom(promptMd) {
  const m = /^## 지시문[ \t]*$/mu.exec(promptMd);
  if (!m) throw new Error('PROMPT_STRUCTURE');
  return promptMd.slice(m.index + m[0].length).trim();
}
export function buildRequest(instructions, input, schema = JSON_SCHEMA) {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: 'analysis_map_v1', strict: true, schema } } };
}

// Sentence rule: split after '.', '?' or '!' (plus any closing quotes/brackets) that is followed by whitespace or end of text.
// A terminator directly followed by other text (e.g. "아니다.’라는") does not split.
export function splitSentences(text) {
  const out = [], re = /[.?!]+[’”'")\]」』]*(?=\s|$)/gu;
  let start = 0, m;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + m[0].length;
    if (text.slice(start, end).trim()) out.push({ start, end, text: text.slice(start, end) });
    start = end;
  }
  if (text.slice(start).trim()) out.push({ start, end: text.length, text: text.slice(start) });
  return out;
}
const ws = s => s.replace(/\s+/gu, ' ').trim();
const numOf = p => p.position;

export function usageCost(usage) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  return (usage.input_tokens * RATES.input + usage.output_tokens * RATES.output) / 1e6;
}
export function reserveUsd(request) { return (Buffer.byteLength(JSON.stringify(request)) * RATES.input + request.max_output_tokens * RATES.output) / 1e6; }
// Returns a stop reason or null. spentUsd is actual cost so far; unknown-cost requests must be passed as reserved amounts in spentUsd.
export function limitCheck({ requests, spentUsd, reserved }) {
  if (requests >= LIMITS.maxRequests) return 'RUN_LIMIT: max requests';
  if (spentUsd + reserved > LIMITS.usdCap) return 'RUN_LIMIT: usd cap';
  return null;
}

const item = (id, name, violations, extra = {}) => ({ id, name, pass: violations.length === 0, violations, ...extra });

export function validateMap(map, passage) {
  const paras = passage.paragraphs, paraById = new Map(paras.map(p => [p.paragraphId, p]));
  const props = map.propositions ?? [], nodes = map.nodes ?? [], rels = map.relations ?? [];
  const items = [];

  // 1. sourceQuote is a contiguous substring of its paragraph (exact); whitespace-normalized match flagged separately.
  const v1 = [], wsOnly = [];
  for (const p of props) {
    const para = paraById.get(p.paragraphId);
    if (!para) { v1.push(`${p.id}: unknown paragraphId ${p.paragraphId}`); continue; }
    if (p.sourceQuote.length === 0 || !para.text.includes(p.sourceQuote)) {
      v1.push(`${p.id}: sourceQuote not exact substring`);
      if (p.sourceQuote.length > 0 && ws(para.text).includes(ws(p.sourceQuote))) wsOnly.push(p.id);
    }
  }
  items.push(item(1, 'sourceQuote exact substring', v1, { matchesAfterWhitespaceNormalization: wsOnly }));

  // 2. sentence coverage: every sentence overlaps at least one sourceQuote occurrence in its paragraph.
  const v2 = [];
  for (const para of paras) {
    const ranges = [];
    for (const p of props.filter(x => x.paragraphId === para.paragraphId && x.sourceQuote.length > 0)) {
      for (let i = para.text.indexOf(p.sourceQuote); i >= 0; i = para.text.indexOf(p.sourceQuote, i + 1)) ranges.push([i, i + p.sourceQuote.length]);
    }
    splitSentences(para.text).forEach((s, k) => {
      if (!ranges.some(([a, b]) => a < s.end && b > s.start)) v2.push(`${para.paragraphId} sentence ${k + 1}: not covered (${s.text.slice(0, 30)})`);
    });
  }
  items.push(item(2, 'sentence coverage', v2));

  // 3. tree: unique ids, exactly one parent each (except TOP), no cycles, single TOP root, all reachable.
  const v3 = [], all = new Map();
  for (const x of [...props, ...nodes]) { if (all.has(x.id)) v3.push(`${x.id}: duplicate id`); all.set(x.id, x); }
  const parents = new Map();
  for (const n of nodes) for (const c of n.childIds) { if (!parents.has(c)) parents.set(c, []); parents.get(c).push(n.id); }
  const tops = nodes.filter(n => n.kind === 'TOP');
  if (tops.length !== 1) v3.push(`TOP count ${tops.length}`);
  for (const [id] of all) {
    const ps = parents.get(id) ?? [], isTop = all.get(id).kind === 'TOP';
    if (isTop) { if (ps.length) v3.push(`${id}: TOP has parent ${ps.join(',')}`); }
    else if (ps.length !== 1) v3.push(`${id}: parent count ${ps.length}`);
  }
  for (const p of props) if (p.childIds) v3.push(`${p.id}: proposition has childIds`);
  const reach = new Set(), onPath = new Set();
  const walk = id => {
    if (onPath.has(id)) { v3.push(`${id}: cycle`); return; }
    if (reach.has(id)) return;
    reach.add(id); onPath.add(id);
    for (const c of all.get(id)?.childIds ?? []) if (all.has(c)) walk(c);
    onPath.delete(id);
  };
  if (tops.length === 1) { walk(tops[0].id); for (const [id] of all) if (!reach.has(id)) v3.push(`${id}: not reachable from TOP`); }
  items.push(item(3, 'tree structure', v3));

  // 4. exactly one PARAGRAPH_GIST per paragraph; all propositions of the paragraph below it.
  const v4 = [], below = id => { const out = new Set(), st = [id]; while (st.length) { const n = all.get(st.pop()); for (const c of n?.childIds ?? []) if (!out.has(c)) { out.add(c); st.push(c); } } return out; };
  for (const para of paras) {
    const gists = nodes.filter(n => n.kind === 'PARAGRAPH_GIST' && n.paragraphId === para.paragraphId);
    if (gists.length !== 1) { v4.push(`${para.paragraphId}: PARAGRAPH_GIST count ${gists.length}`); continue; }
    const under = below(gists[0].id);
    for (const p of props.filter(x => x.paragraphId === para.paragraphId)) if (!under.has(p.id)) v4.push(`${p.id}: not under ${gists[0].id}`);
  }
  for (const n of nodes.filter(n => n.kind === 'PARAGRAPH_GIST' && !paraById.has(n.paragraphId))) v4.push(`${n.id}: unknown paragraphId ${n.paragraphId}`);
  items.push(item(4, 'paragraph gist', v4));

  // 5. every synthesized node has two or more children.
  const v5 = nodes.filter(n => n.childIds.length < 2).map(n => `${n.id} (${n.kind}): ${n.childIds.length} children`);
  items.push(item(5, 'composite has >=2 children', v5));

  // 6. id format and referential integrity.
  const v6 = [], numOfPara = new Map(paras.map(p => [p.paragraphId, numOf(p)]));
  if (map.passageId !== passage.passageId) v6.push(`passageId ${map.passageId}`);
  for (const p of props) {
    const m = /^P(\d+)-(\d+)$/u.exec(p.id);
    if (!m) v6.push(`${p.id}: bad proposition id`); else if (numOfPara.get(p.paragraphId) !== Number(m[1])) v6.push(`${p.id}: paragraph number mismatch`);
  }
  for (const n of nodes) {
    let ok;
    if (n.kind === 'TOP') ok = n.id === 'TOP' && n.paragraphId === null;
    else if (n.kind === 'PARAGRAPH_GIST') { const m = /^G(\d+)$/u.exec(n.id); ok = !!m && numOfPara.get(n.paragraphId) === Number(m[1]); }
    else if (n.kind === 'COMPOSITE') { const m = /^C(\d+)-\d+$/u.exec(n.id); ok = !!m && numOfPara.get(n.paragraphId) === Number(m[1]); }
    else ok = /^X\d+$/u.test(n.id) && n.paragraphId === null;
    if (!ok) v6.push(`${n.id}: id/kind/paragraphId mismatch (${n.kind}, ${n.paragraphId})`);
    for (const c of n.childIds) if (!all.has(c)) v6.push(`${n.id}: childId ${c} missing`);
  }
  for (const r of rels) {
    if (!/^R\d+$/u.test(r.id)) v6.push(`${r.id}: bad relation id`);
    for (const k of ['fromId', 'toId']) if (!all.has(r[k])) v6.push(`${r.id}: ${k} ${r[k]} missing`);
  }
  if (new Set(rels.map(r => r.id)).size !== rels.length) v6.push('duplicate relation id');
  items.push(item(6, 'id format and referential integrity', v6));

  return { allPass: items.every(i => i.pass), items };
}

// A fixed, structurally valid map built from the passage itself (one proposition per sentence) for dry-run.
export function exampleMap(passage) {
  const propositions = [], nodes = [];
  for (const para of passage.paragraphs) {
    const sents = splitSentences(para.text), n = para.position, ids = [];
    sents.forEach((s, i) => { const id = `P${n}-${i + 1}`; ids.push(id); propositions.push({ id, paragraphId: para.paragraphId, text: s.text.trim(), sourceQuote: s.text.trim(), role: '예시' }); });
    nodes.push({ id: `G${n}`, kind: 'PARAGRAPH_GIST', paragraphId: para.paragraphId, text: `문단 ${n} 요지`, childIds: ids });
  }
  nodes.push({ id: 'TOP', kind: 'TOP', paragraphId: null, text: '지문 최상위', childIds: passage.paragraphs.map(p => `G${p.position}`) });
  return { passageId: passage.passageId, propositions, nodes, relations: [{ id: 'R1', fromId: 'P1-1', toId: 'P2-1', name: '예시', note: '' }] };
}

const freq = arr => Object.entries(arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
export function mapStats(map) {
  const byId = new Map([...map.propositions, ...map.nodes].map(x => [x.id, x]));
  const depth = id => { const x = byId.get(id); return x?.childIds?.length ? 1 + Math.max(...x.childIds.map(c => byId.has(c) ? depth(c) : 0)) : 0; };
  const gistDepth = Object.fromEntries(map.nodes.filter(n => n.kind === 'PARAGRAPH_GIST').map(n => [n.paragraphId, depth(n.id)]));
  return { propositions: map.propositions.length, nodesByKind: Object.fromEntries(KINDS.map(k => [k, map.nodes.filter(n => n.kind === k).length])),
    compositeNodes: map.nodes.filter(n => n.kind === 'COMPOSITE').length, gistDepthByParagraph: gistDepth,
    relations: map.relations.length, relationNames: freq(map.relations.map(r => r.name)), roles: freq(map.propositions.map(p => p.role)) };
}
export function renderTree(map) {
  const byId = new Map([...map.propositions, ...map.nodes].map(x => [x.id, x])), seen = new Set(), lines = [];
  const walk = (id, d) => {
    const x = byId.get(id); if (!x || seen.has(id)) { lines.push(`${'  '.repeat(d)}- ${id} (missing or repeated)`); return; }
    seen.add(id); lines.push(`${'  '.repeat(d)}- ${id}: ${x.text}`);
    for (const c of x.childIds ?? []) walk(c, d + 1);
  };
  const top = map.nodes.find(n => n.kind === 'TOP');
  if (top) walk(top.id, 0);
  const orphans = [...byId.keys()].filter(id => !seen.has(id));
  if (orphans.length) { lines.push('', '트리에 닿지 않는 항목:'); for (const id of orphans) lines.push(`- ${id}: ${byId.get(id).text}`); }
  return lines.join('\n');
}
const jsonLine = o => JSON.stringify(o);
export function renderMaps(dir = EXP_DIR, title = '분석 지도 생성 결과 (공손룡 1단계)') {
  const out = [`# ${title}`, '', '해석·평가 없음. 원자료는 `runs/`, 요청 기록은 `ledger.jsonl`, 실행 설정은 `RUN.json`.', ''];
  for (const r of [1, 2, 3]) {
    const base = `${dir}/runs/map-r${r}`;
    out.push(`## 회차 ${r}`, '');
    const val = existsSync(`${base}.validation.json`) ? JSON.parse(readFileSync(`${base}.validation.json`, 'utf8')) : null;
    if (!val) { out.push('실행 기록 없음.', ''); continue; }
    out.push(`- 요청 상태: ${val.requestStatus}${val.error ? ` (${val.error})` : ''}`);
    if (!existsSync(`${base}.json`)) { out.push('- 파싱된 지도 없음.', ''); continue; }
    const map = JSON.parse(readFileSync(`${base}.json`, 'utf8')), s = mapStats(map);
    out.push(`- 명제 수: ${s.propositions}`, `- 노드 수(종류별): ${Object.entries(s.nodesByKind).map(([k, v]) => `${k} ${v}`).join(', ')}`,
      `- 합성 노드 수(COMPOSITE): ${s.compositeNodes}`, `- 문단 요지 노드의 층 깊이(명제=0): ${Object.entries(s.gistDepthByParagraph).map(([k, v]) => `${k.split('-').pop()} ${v}`).join(', ')}`,
      `- 관계 수: ${s.relations}`, `- 관계 이름 빈도: ${s.relationNames.map(([k, v]) => `${k} ${v}`).join(', ')}`,
      `- 역할 이름 빈도: ${s.roles.map(([k, v]) => `${k} ${v}`).join(', ')}`, `- 검증: ${val.validation.allPass ? '전부 통과' : '실패 있음'}`);
    for (const i of val.validation.items) {
      out.push(`  - 항목 ${i.id} ${i.name}: ${i.pass ? '통과' : `실패 ${i.violations.length}건`}`);
      for (const v of i.violations.slice(0, 20)) out.push(`    - ${v}`);
      if (i.violations.length > 20) out.push(`    - ... 외 ${i.violations.length - 20}건`);
      if (i.matchesAfterWhitespaceNormalization?.length) out.push(`    - 공백 정규화 시 일치: ${i.matchesAfterWhitespaceNormalization.join(', ')}`);
    }
    out.push('', '```text', renderTree(map), '```', '');
  }
  return out.join('\n');
}

// Options default to the gongsun stage-1 setup (D-0146: passage id, experiment dir, prompt path, expected paragraph count).
export async function main({ dryRun = false, transport, passageId = PASSAGE_ID, expDir = EXP_DIR, promptPath = PROMPT_PATH, paragraphs = 5, passagesDir = PASSAGES_DIR } = {}) {
  const { passage, file, fileHash } = loadPassage(passagesDir, passageId);
  if (passage.paragraphs.length !== paragraphs) throw new Error(`PARAGRAPH_COUNT: ${passage.paragraphs.length}`);
  const promptBytes = readFileSync(promptPath), promptHashBefore = hash(promptBytes);
  const instructions = instructionsFrom(promptBytes.toString('utf8')), input = buildInput(passage), request = buildRequest(instructions, input);
  mkdirSync(`${expDir}/runs`, { recursive: true });
  if (dryRun) {
    writeFileSync(`${expDir}/runs/dry-run.request.json`, serialize(request));
    const v = validateMap(exampleMap(passage), passage);
    writeFileSync(`${expDir}/runs/dry-run.validation.json`, serialize(v));
    return { dryRun: true, externalRequests: 0, reserveUsdPerRequest: reserveUsd(request), exampleAllPass: v.allPass, inputBytes: Buffer.byteLength(JSON.stringify(request)) };
  }
  const ledgerPath = `${expDir}/ledger.jsonl`;
  if (existsSync(ledgerPath) || existsSync(`${expDir}/RUN.json`)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const runInfo = { version: 1, startedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS,
    rates: RATES, limits: LIMITS, retries: 0, promptFile: promptPath, promptFileHashBefore: promptHashBefore, instructionsHash: hash(instructions),
    passageId, sourceFile: file, sourceFileHash: fileHash, inputHash: hash(JSON.stringify(input)), requestHash: hash(JSON.stringify(request)), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), schema: JSON_SCHEMA };
  let spent = 0, requests = 0, stop = null, client;
  const record = row => appendFileSync(ledgerPath, jsonLine(row) + '\n');
  for (const r of [1, 2, 3]) {
    const reserved = reserveUsd(request);
    stop = limitCheck({ requests, spentUsd: spent, reserved });
    if (stop) { record({ event: 'STOP', round: r, reason: stop, atUtc: new Date().toISOString() }); break; }
    const base = `${expDir}/runs/map-r${r}`, requestId = `map-r${r}`, t0 = performance.now(); requests++;
    record({ event: 'START', requestId, round: r, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: reserved });
    const outcome = { round: r, requestStatus: null, error: null, validation: null };
    let response = null;
    try {
      const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
      response = await sender.create(request, { timeout: TIMEOUT_MS });
    } catch (e) { outcome.requestStatus = 'API_ERROR'; outcome.error = String(e); spent += reserved; }
    const cost = response ? usageCost(response.usage) : null;
    if (response) spent += cost ?? reserved;
    record({ event: 'END', requestId, round: r, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null,
      responseId: response?.id ?? null, status: response?.status ?? outcome.requestStatus, usage: response?.usage ?? null, costUsd: cost, costAssumedReserved: !!response && cost === null, error: outcome.error });
    writeFileSync(`${base}.raw.json`, serialize(response ?? { error: outcome.error }), { flag: 'wx' });
    if (response) {
      try {
        if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        const map = OutputSchema.parse(JSON.parse(response.output_text));
        writeFileSync(`${base}.json`, serialize(map), { flag: 'wx' });
        outcome.requestStatus = 'PARSED'; outcome.validation = validateMap(map, passage);
      } catch (e) { outcome.requestStatus = 'FORMAT_ERROR'; outcome.error = String(e); }
    }
    writeFileSync(`${base}.validation.json`, serialize(outcome), { flag: 'wx' });
  }
  const promptHashAfter = hash(readFileSync(promptPath));
  writeFileSync(`${expDir}/RUN.json`, serialize({ ...runInfo, finishedAtUtc: new Date().toISOString(), requests, totalCostUsd: spent, stop, promptFileHashAfter: promptHashAfter, promptUnchanged: promptHashAfter === promptHashBefore }));
  writeFileSync(`${expDir}/MAPS.md`, renderMaps(expDir, passageId === PASSAGE_ID ? undefined : `분석 지도 생성 결과 (${passageId} 1단계)`) + '\n');
  return { requests, totalCostUsd: spent, stop, promptUnchanged: promptHashAfter === promptHashBefore };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const result = await main({ dryRun: argv.includes('--dry-run'), passageId: opt('--passage'), expDir: opt('--exp-dir'),
    promptPath: opt('--prompt'), passagesDir: opt('--passages-dir'), paragraphs: opt('--paragraphs') ? Number(opt('--paragraphs')) : undefined });
  console.log(JSON.stringify(result, null, 2));
}
