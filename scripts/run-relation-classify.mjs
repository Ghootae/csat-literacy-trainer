// D-0147: relation type classification for each relation of an analysis map (separate stage after the map).
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-19-relation-classify-tuning.md
// Usage: node --env-file-if-exists=.env scripts/run-relation-classify.mjs [--dry-run] --targets <json> --out <dir> [--prompt <path>] [--max-requests <n>] [--usd-cap <x>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, buildInput as buildPassageInput, instructionsFrom, usageCost, reserveUsd, hash, MODEL, RATES, TIMEOUT_MS } from './run-analysis-map-gongsun.mjs';
import { isConnectionError } from './run-analysis-judge-gongsun.mjs';

export const PROMPT_PATH = 'docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT.md';
export const LIMITS = { maxRequests: 16, usdCap: 2 };
export const MAX_OUTPUT_TOKENS = 10000; // keeps the summed per-request reservation of 16 requests under the $2 cap
export { MODEL, RATES, TIMEOUT_MS, usageCost, reserveUsd };

// Branch -> types (code constant). Korean names follow the prompt's notation.
export const BRANCHES = [
  ['내용', ['CAUSE', 'PROCESS', 'CONDITION', 'MEANS_END', 'CONTRAST', 'PARALLEL', 'CLASSIFICATION']],
  ['논증', ['GROUNDS', 'ELABORATION', 'APPLICATION', 'DEFINITION', 'CONCESSION', 'PROBLEM_RESPONSE']],
  ['관점', ['VIEW_DIFFERENCE', 'VIEW_AGREEMENT', 'CRITIQUE', 'INTERPRETATION']],
  ['흐름', ['BACKGROUND', 'DEVELOPMENT']],
  ['기타', ['OTHER']],
];
export const TYPES = BRANCHES.flatMap(([, ts]) => ts);
export const BRANCH_OF = Object.fromEntries(BRANCHES.flatMap(([b, ts]) => ts.map(t => [t, b])));
export const TYPE_KO = {
  CAUSE: '인과·작용', PROCESS: '과정·순서', CONDITION: '조건·분기', MEANS_END: '수단·목적', CONTRAST: '대조', PARALLEL: '병렬·공통', CLASSIFICATION: '분류·구성',
  GROUNDS: '근거·도출', ELABORATION: '구체화·예시', APPLICATION: '원리 적용', DEFINITION: '정의·명명', CONCESSION: '양보·한계', PROBLEM_RESPONSE: '문제·대응',
  VIEW_DIFFERENCE: '관점 차이', VIEW_AGREEMENT: '공통·수용', CRITIQUE: '비판·반박', INTERPRETATION: '해석·평가',
  BACKGROUND: '배경·계기', DEVELOPMENT: '전개·전환', OTHER: '기타',
};

const serialize = v => JSON.stringify(v, null, 2) + '\n';
const jsonLine = o => JSON.stringify(o);

export const OutputSchema = z.strictObject({
  passageId: z.string(),
  items: z.array(z.strictObject({ id: z.string(), type: z.enum(TYPES), otherName: z.string(), reason: z.string() })),
});
export const JSON_SCHEMA = z.toJSONSchema(OutputSchema);

// User content: passage id, paragraphs (map-script rule), relations in map order. The relation `name` is never included.
export function buildInput(passage, map) {
  const byId = new Map([...map.propositions.map(p => [p.id, { id: p.id, kind: 'PROPOSITION', paragraphId: p.paragraphId, text: p.text }]),
    ...map.nodes.map(n => [n.id, { id: n.id, kind: n.kind, paragraphId: n.paragraphId, text: n.text }])]);
  const side = id => { const x = byId.get(id); if (!x) throw new Error(`UNKNOWN_ENDPOINT: ${id}`); return { ...x }; };
  return { passageId: passage.passageId, paragraphs: buildPassageInput(passage).paragraphs,
    relations: map.relations.map(r => ({ id: r.id, from: side(r.fromId), to: side(r.toId), note: r.note })) };
}
export function buildRequest(instructions, input) {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: 'relation_classify_v1', strict: true, schema: JSON_SCHEMA } } };
}

const item = (id, name, violations) => ({ id, name, pass: violations.length === 0, violations });
export function validateClassification(out, map) {
  const want = map.relations.map(r => r.id), wantSet = new Set(want), seen = new Map();
  const items = out.items ?? [];
  for (const i of items) seen.set(i.id, (seen.get(i.id) ?? 0) + 1);
  const v1 = [];
  for (const id of want) if (!seen.has(id)) v1.push(`${id}: missing`);
  for (const [id, n] of seen) { if (n > 1) v1.push(`${id}: duplicate x${n}`); if (!wantSet.has(id)) v1.push(`${id}: unknown id`); }
  const v2 = out.passageId === map.passageId ? [] : [`passageId ${out.passageId}`];
  const v3 = [];
  for (const i of items) {
    if (i.type === 'OTHER' && i.otherName.trim() === '') v3.push(`${i.id}: OTHER without otherName`);
    if (i.type !== 'OTHER' && i.otherName !== '') v3.push(`${i.id}: otherName on ${i.type}`);
  }
  const list = [item(1, 'relation id set exactly once', v1), item(2, 'passageId matches', v2), item(3, 'otherName rule', v3)];
  return { allPass: list.every(x => x.pass), items: list };
}

// Fixed valid classification for dry-run / tests (every relation CAUSE).
export function exampleClassification(map) {
  return { passageId: map.passageId, items: map.relations.map(r => ({ id: r.id, type: 'CAUSE', otherName: '', reason: '예시' })) };
}

const freq = arr => Object.entries(arr.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : '0.0%';
const cell = s => String(s ?? '').replace(/\|/gu, '\\|').replace(/\s*\n\s*/gu, ' ');

// results: [{ passageId, map, passage, classification|null }]
export function summarize(results) {
  const done = results.filter(r => r.classification), all = done.flatMap(r => r.classification.items);
  const byType = Object.fromEntries(TYPES.map(t => [t, all.filter(i => i.type === t).length]));
  const byBranch = Object.fromEntries(BRANCHES.map(([b]) => [b, all.filter(i => BRANCH_OF[i.type] === b).length]));
  const other = all.filter(i => i.type === 'OTHER');
  const perPassage = done.map(r => {
    const its = r.classification.items;
    return { key: r.key ?? r.passageId, passageId: r.passageId, relations: its.length, byBranch: Object.fromEntries(BRANCHES.map(([b]) => [b, its.filter(i => BRANCH_OF[i.type] === b).length])), other: its.filter(i => i.type === 'OTHER').length };
  });
  const cross = new Map();
  for (const r of done) {
    const nameOf = new Map(r.map.relations.map(x => [x.id, x.name]));
    for (const i of r.classification.items) { const n = nameOf.get(i.id); if (n === undefined) continue; const k = `${n}\u0000${i.type}`; cross.set(k, (cross.get(k) ?? 0) + 1); }
  }
  const nameTotals = new Map();
  for (const [k, c] of cross) { const n = k.split('\u0000')[0]; nameTotals.set(n, (nameTotals.get(n) ?? 0) + c); }
  const topNames = [...nameTotals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko')).slice(0, 30).map(([n, total]) => ({ name: n, total,
    types: Object.fromEntries(TYPES.map(t => [t, cross.get(`${n}\u0000${t}`) ?? 0]).filter(([, c]) => c > 0)) }));
  return { relations: all.length, byType, byBranch, other: other.length, otherNames: freq(other.map(i => i.otherName)), perPassage, topNames };
}

export function renderReport(results, s = summarize(results)) {
  const out = ['# 관계 유형 분류 결과', '', '해석·평가 없음. 지시문 파일·해시는 `RUN.json`. 원자료는 지문별 `classify.json`, 요청 기록은 `ledger.jsonl`, 실행 설정은 `RUN.json`.', '',
    '## 전체 요약', '', `- 분류된 관계 수: ${s.relations} (지문 ${results.filter(r => r.classification).length}/${results.length})`, '', '### 유형별', '', '| 유형 | 이름 | 갈래 | 수 | 비율 |', '|---|---|---|---:|---:|'];
  for (const t of TYPES) out.push(`| ${t} | ${TYPE_KO[t]} | ${BRANCH_OF[t]} | ${s.byType[t]} | ${pct(s.byType[t], s.relations)} |`);
  out.push('', '### 갈래별', '', '| 갈래 | 수 | 비율 |', '|---|---:|---:|');
  for (const [b] of BRANCHES) out.push(`| ${b} | ${s.byBranch[b]} | ${pct(s.byBranch[b], s.relations)} |`);
  out.push('', `### OTHER: ${s.other}건 (${pct(s.other, s.relations)})`, '');
  if (s.otherNames.length) for (const [n, c] of s.otherNames) out.push(`- ${n || '(빈 이름)'} ${c}`);
  else out.push('- 없음');
  out.push('', '## 지문별', '', `| 지문 | 관계 수 | ${BRANCHES.map(([b]) => b).join(' | ')} | OTHER |`, `|---|---:|${BRANCHES.map(() => '---:').join('|')}|---:|`);
  for (const p of s.perPassage) out.push(`| ${p.key} | ${p.relations} | ${BRANCHES.map(([b]) => p.byBranch[b]).join(' | ')} | ${p.other} |`);
  out.push('', '## 원래 name × 분류 유형 (자주 나온 이름 상위 30)', '', '| name | 합계 | 분류 유형 분포 |', '|---|---:|---|');
  for (const n of s.topNames) out.push(`| ${cell(n.name)} | ${n.total} | ${Object.entries(n.types).map(([t, c]) => `${TYPE_KO[t]} ${c}`).join(', ')} |`);
  out.push('', '## 지문별 관계 전체 (검토용)', '');
  for (const r of results) {
    out.push(`### ${r.key ?? r.passageId}`, '');
    if (!r.classification) { out.push('분류 결과 없음.', ''); continue; }
    const rel = new Map(r.map.relations.map(x => [x.id, x]));
    const text = new Map([...r.map.propositions, ...r.map.nodes].map(x => [x.id, x.text]));
    out.push('| id | from 문장 | to 문장 | 지도의 원래 name | 분류 유형 | reason |', '|---|---|---|---|---|---|');
    for (const i of r.classification.items) {
      const x = rel.get(i.id);
      const label = i.type === 'OTHER' ? `${TYPE_KO.OTHER}: ${i.otherName}` : TYPE_KO[i.type];
      out.push(`| ${i.id} | ${cell(x ? text.get(x.fromId) : '')} | ${cell(x ? text.get(x.toId) : '')} | ${cell(x?.name)} | ${cell(label)} | ${cell(i.reason)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
export function loadTargets(targetsPath) {
  return readJson(targetsPath).map(t => {
    const { passage, file, fileHash } = loadPassage(t.passagesDir, t.passageId);
    const mapBytes = readFileSync(t.mapPath);
    return { key: t.key ?? t.passageId, passageId: t.passageId, passage, sourceFile: file, sourceFileHash: fileHash, mapPath: t.mapPath, mapFileHash: hash(mapBytes), map: JSON.parse(mapBytes.toString('utf8')) };
  });
}

export async function main({ dryRun = false, transport, targetsPath, out, promptPath = PROMPT_PATH, limits = LIMITS } = {}) {
  if (!targetsPath || !out) throw new Error('USAGE: --targets and --out are required');
  const targets = loadTargets(targetsPath);
  if (new Set(targets.map(t => t.key)).size !== targets.length) throw new Error('DUPLICATE_TARGET');
  const promptBytes = readFileSync(promptPath), promptHashBefore = hash(promptBytes);
  const instructions = instructionsFrom(promptBytes.toString('utf8'));
  const jobs = targets.map(t => {
    const input = buildInput(t.passage, t.map), request = buildRequest(instructions, input);
    return { ...t, input, request, reserved: reserveUsd(request) };
  });
  const protectedBefore = Object.fromEntries(targets.flatMap(t => [[t.sourceFile, t.sourceFileHash], [t.mapPath, t.mapFileHash]]));
  mkdirSync(out, { recursive: true });
  if (dryRun) {
    for (const j of jobs) { mkdirSync(`${out}/${j.key}`, { recursive: true }); writeFileSync(`${out}/${j.key}/dry-run.request.json`, serialize(j.request)); }
    const allPass = jobs.every(j => validateClassification(exampleClassification(j.map), j.map).allPass);
    const perPassage = jobs.map(j => ({ key: j.key, passageId: j.passageId, relations: j.map.relations.length, reserveUsd: j.reserved }));
    return { dryRun: true, externalRequests: 0, exampleAllPass: allPass, perPassage, totalReserveUsd: jobs.reduce((a, j) => a + j.reserved, 0), overCap: jobs.reduce((a, j) => a + j.reserved, 0) > limits.usdCap };
  }
  const ledgerPath = `${out}/ledger.jsonl`;
  if (existsSync(ledgerPath) || existsSync(`${out}/RUN.json`)) throw new Error('RUN_EXISTS: refusing to rerun (no retries)');
  const runInfo = { version: 1, startedAtUtc: new Date().toISOString(), model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS, rates: RATES, limits, retries: 0,
    promptFile: promptPath, promptFileHashBefore: promptHashBefore, instructionsHash: hash(instructions), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), targetsFile: targetsPath,
    inputs: Object.fromEntries(jobs.map(j => [j.key, { passageId: j.passageId, inputHash: hash(JSON.stringify(j.input)), requestHash: hash(JSON.stringify(j.request)), relations: j.map.relations.length }])) };
  const record = row => appendFileSync(ledgerPath, jsonLine(row) + '\n');
  let spent = 0, requests = 0, stop = null, client;
  const results = [];
  for (const j of jobs) {
    const res = { key: j.key, passageId: j.passageId, map: j.map, passage: j.passage, classification: null, requestStatus: 'NOT_SENT', error: null, validation: null, costUsd: 0 };
    results.push(res);
    if (!stop) {
      if (requests >= limits.maxRequests) stop = 'RUN_LIMIT: max requests';
      else if (spent + j.reserved > limits.usdCap) stop = 'RUN_LIMIT: usd cap';
      if (stop) record({ event: 'STOP', key: j.key, passageId: j.passageId, reason: stop, atUtc: new Date().toISOString() });
    }
    if (stop) continue;
    const dir = `${out}/${j.key}`, requestId = `classify-${j.key}`, t0 = performance.now();
    mkdirSync(dir, { recursive: true }); requests++;
    record({ event: 'START', requestId, key: j.key, passageId: j.passageId, model: MODEL, atUtc: new Date().toISOString(), reservedUsd: j.reserved });
    let response = null;
    try {
      const sender = transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses;
      response = await sender.create(j.request, { timeout: TIMEOUT_MS });
    } catch (e) { res.requestStatus = 'API_ERROR'; res.error = String(e); }
    const cost = response ? usageCost(response.usage) : null;
    const charged = response ? (cost ?? j.reserved) : (isConnectionError(res.error) ? 0 : j.reserved);
    spent += charged; res.costUsd = charged;
    record({ event: 'END', requestId, key: j.key, passageId: j.passageId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null,
      responseId: response?.id ?? null, status: response?.status ?? res.requestStatus, usage: response?.usage ?? null, costUsd: cost, chargedUsd: charged, costAssumedReserved: !!response && cost === null, error: res.error });
    writeFileSync(`${dir}/classify.raw.json`, serialize(response ?? { error: res.error }), { flag: 'wx' });
    if (response) {
      try {
        if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        const parsed = OutputSchema.parse(JSON.parse(response.output_text));
        writeFileSync(`${dir}/classify.json`, serialize(parsed), { flag: 'wx' });
        res.classification = parsed; res.requestStatus = 'PARSED'; res.validation = validateClassification(parsed, j.map);
      } catch (e) { res.requestStatus = 'FORMAT_ERROR'; res.error = String(e); }
    }
    writeFileSync(`${dir}/classify.validation.json`, serialize({ key: j.key, passageId: j.passageId, requestStatus: res.requestStatus, error: res.error, validation: res.validation }), { flag: 'wx' });
  }
  const protectedAfter = Object.fromEntries(Object.keys(protectedBefore).map(p => [p, hash(readFileSync(p))]));
  const promptHashAfter = hash(readFileSync(promptPath));
  const protectedUnchanged = Object.keys(protectedBefore).every(p => protectedBefore[p] === protectedAfter[p]);
  const summary = summarize(results);
  writeFileSync(`${out}/RUN.json`, serialize({ ...runInfo, finishedAtUtc: new Date().toISOString(), requests, totalCostUsd: spent, stop, promptFileHashAfter: promptHashAfter, promptUnchanged: promptHashAfter === promptHashBefore,
    protectedFilesUnchanged: protectedUnchanged, protectedFileHashes: { before: protectedBefore, after: protectedAfter },
    results: results.map(r => ({ key: r.key, passageId: r.passageId, requestStatus: r.requestStatus, error: r.error, costUsd: r.costUsd, validationAllPass: r.validation?.allPass ?? null })) }));
  writeFileSync(`${out}/summary.json`, serialize(summary));
  writeFileSync(`${out}/REPORT.md`, renderReport(results, summary) + '\n');
  return { requests, totalCostUsd: spent, stop, promptUnchanged: promptHashAfter === promptHashBefore, protectedFilesUnchanged: protectedUnchanged,
    results: results.map(r => ({ key: r.key, passageId: r.passageId, relations: r.map.relations.length, requestStatus: r.requestStatus, costUsd: r.costUsd, validationAllPass: r.validation?.allPass ?? null, other: r.classification?.items.filter(i => i.type === 'OTHER').length ?? null })) };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const result = await main({ dryRun: argv.includes('--dry-run'), targetsPath: opt('--targets'), out: opt('--out'), promptPath: opt('--prompt'),
    limits: { maxRequests: opt('--max-requests') ? Number(opt('--max-requests')) : LIMITS.maxRequests, usdCap: opt('--usd-cap') ? Number(opt('--usd-cap')) : LIMITS.usdCap } });
  console.log(JSON.stringify(result, null, 2));
}
