// D-0143 stage 2: top-down judgment of existing gongsun dialogues against the frozen analysis map.
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-16-analysis-map-gongsun-stage2.md
// Usage: node --env-file-if-exists=.env scripts/run-analysis-judge-gongsun.mjs [--dry-run | --resume | --report-only]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { loadPassage, EXP_DIR } from './run-analysis-map-gongsun.mjs';

export const OUT_DIR = `${EXP_DIR}/stage2`;
export const MAP_PATH = `${EXP_DIR}/frozen-map.json`;
export const MAP_SHA256 = '58b6e811712092f463c0b1d26496745b4b718d8b5cf6676ee6b9cfe29c04ae29';
export const JUDGE_PROMPT_PATH = `${EXP_DIR}/JUDGE-PROMPT.md`;
export const MAP_PROMPT_PATH = `${EXP_DIR}/MAP-PROMPT.md`;
export const V4_LOG = '.omc/logs/dialogue-experiment/sessions.jsonl';
export const SH_LOG = '.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl';
export const MODEL = 'gpt-6-luna';
export const RATES = { input: 0.10, output: 0.50 }; // USD per 1M tokens (same as run-v5-diverse-48.mjs)
// 2026-10-17 사용자 승인: 시도 2,300건, 실제 청구 $1. 연결 오류(서버 미도달)는 $0, 타임아웃은 예약액으로 계산(D-0143).
export const LIMITS = { maxRequests: 2300, usdCap: 1 };
export const MAX_CONSECUTIVE_CONNECTION_ERRORS = 10;
export const MAX_OUTPUT_TOKENS = 2000;
export const TIMEOUT_MS = 60000;
export const CONCURRENCY = 8;
export const COPY_MIN = 30;
export const EXPECTED = { v4: 27, nodes: [8, 18, 17, 19, 19], relations: [1, 5, 7, 6, 5] };

export const hash = x => createHash('sha256').update(x).digest('hex');
const serialize = v => JSON.stringify(v, null, 2) + '\n';
const jsonLine = o => JSON.stringify(o);
const readJsonl = p => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const ws = s => s.replace(/\s+/gu, ' ').trim();

export const JudgmentSchema = z.strictObject({ label: z.enum(['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS']), quotes: z.array(z.string()), reason: z.string() });
export const JSON_SCHEMA = z.toJSONSchema(JudgmentSchema);

// ---------- 1. extraction ----------
export function hasCopiedSource(turns, paragraphText) {
  for (const t of turns) {
    if (t.role !== 'student') continue;
    for (let i = 0; i + COPY_MIN <= t.text.length; i++) if (paragraphText.includes(t.text.slice(i, i + COPY_MIN))) return true;
  }
  return false;
}
const isPrefix = (a, b) => a.length <= b.length && a.every((t, i) => t.role === b[i].role && t.text === b[i].text);

export function extractDialogues(v4Records, shRecords, passage) {
  const paraText = new Map(passage.paragraphs.map(p => [p.paragraphId, p.text]));
  const out = [];
  for (const r of v4Records) {
    if (!r.paragraphId?.startsWith(`${passage.passageId}-`)) continue;
    if (r.turns?.[0]?.call?.provider === 'mock' || (r.initialResponse ?? '').includes('중심 관계를 이해했습니다')) continue;
    const turns = [{ role: 'student', text: r.initialResponse }];
    for (const t of r.turns ?? []) if (t.questionShown != null && t.studentAnswer != null) turns.push({ role: 'tutor', text: t.questionShown }, { role: 'student', text: t.studentAnswer });
    out.push({ dialogueId: `v4:${r.sessionId}`, source: 'v4', sessionId: r.sessionId, paragraphId: r.paragraphId, turns });
  }
  const groups = new Map();
  for (const r of shRecords) {
    if (r.passageId !== passage.passageId || r.event !== 'STEP') continue;
    const key = `${r.sessionId}\u0000${r.paragraphId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const recs of groups.values()) {
    const ts = recs.map(r => r.transcript.map(t => ({ role: t.role, text: t.text })));
    let seq = 0;
    ts.forEach((t, i) => {
      const dominated = ts.some((o, j) => j !== i && isPrefix(t, o) && (o.length > t.length || j < i));
      if (dominated) return;
      seq++;
      out.push({ dialogueId: `sh:${recs[0].sessionId}:${recs[0].paragraphId}:${seq}`, source: 'sh', sessionId: recs[0].sessionId, paragraphId: recs[0].paragraphId, turns: t });
    });
  }
  return out.map(d => ({ ...d, copiedSource: hasCopiedSource(d.turns, paraText.get(d.paragraphId) ?? '') }));
}

// Round k = dialogue from the start up to the k-th student turn (tutor turns in between included, trailing tutor turn excluded).
export function buildRounds(d) {
  const rounds = [];
  d.turns.forEach((t, i) => {
    if (t.role === 'student') rounds.push({ dialogueId: d.dialogueId, source: d.source, sessionId: d.sessionId, paragraphId: d.paragraphId, roundIndex: rounds.length + 1,
      dialogue: d.turns.slice(0, i + 1).map(x => ({ role: x.role, text: x.text })), copiedSource: d.copiedSource });
  });
  return rounds;
}

// ---------- 2. units ----------
const paraNum = paragraphId => Number(/-p(\d+)$/u.exec(paragraphId)?.[1]);
const idOrder = id => { const m = /^[A-Z]+(\d+)(?:-(\d+))?$/u.exec(id); return [Number(m[1]), Number(m[2] ?? 0)]; };
const cmpId = (a, b) => { const [a1, a2] = idOrder(a), [b1, b2] = idOrder(b); return a1 - b1 || a2 - b2; };

export function indexMap(map) {
  const byId = new Map([...map.propositions, ...map.nodes].map(x => [x.id, x]));
  const quotesOf = id => {
    const x = byId.get(id);
    if (!x.childIds) return [x.sourceQuote];
    const props = new Set(), st = [id];
    while (st.length) { const n = byId.get(st.pop()); for (const c of n.childIds ?? []) { if (byId.get(c).childIds) st.push(c); else props.add(c); } }
    return [...new Set([...props].sort(cmpId).map(p => byId.get(p).sourceQuote))];
  };
  return { byId, quotesOf };
}
const isJudgeable = x => /^[PCG]\d/u.test(x.id);

export function unitsForParagraph(map, paragraphId) {
  const { byId, quotesOf } = indexMap(map);
  const end = id => ({ id, text: byId.get(id).text, sourceQuotes: quotesOf(id) });
  const nodes = [...map.propositions.filter(p => p.paragraphId === paragraphId),
    ...map.nodes.filter(n => (n.kind === 'COMPOSITE' || n.kind === 'PARAGRAPH_GIST') && n.paragraphId === paragraphId)]
    .map(x => ({ ...end(x.id), kind: x.childIds ? x.kind : 'PROPOSITION', childIds: x.childIds ?? [] }));
  const relations = map.relations.filter(r => isJudgeable({ id: r.fromId }) && isJudgeable({ id: r.toId }))
    .filter(r => {
      const p = Math.max(paraNum(byId.get(r.fromId).paragraphId), paraNum(byId.get(r.toId).paragraphId));
      return p === paraNum(paragraphId);
    }).map(r => ({ id: r.id, fromId: r.fromId, toId: r.toId, from: end(r.fromId), to: end(r.toId), note: r.note }));
  return { nodes, relations };
}

// ---------- 3. requests ----------
export function parseJudgePrompt(md) {
  const section = title => {
    const m = new RegExp(`^## ${title}[ \\t]*$`, 'mu').exec(md);
    if (!m) throw new Error(`PROMPT_STRUCTURE: ${title}`);
    const rest = md.slice(m.index + m[0].length), next = /^## /mu.exec(rest);
    return (next ? rest.slice(0, next.index) : rest).trim();
  };
  return { node: section('노드 판정 지시문'), relation: section('관계 판정 지시문') };
}
export function buildJudgeInput(round, unitKind, unit) {
  const dialogue = round.dialogue.map(t => ({ role: t.role, text: t.text }));
  if (unitKind === 'node') return { dialogue, target: { text: unit.text, sourceQuotes: unit.sourceQuotes } };
  return { dialogue, relation: { from: { text: unit.from.text, sourceQuotes: unit.from.sourceQuotes }, to: { text: unit.to.text, sourceQuotes: unit.to.sourceQuotes }, note: unit.note } };
}
export function buildJudgeRequest(instructions, input) {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: 'analysis_judgment_v1', strict: true, schema: JSON_SCHEMA } } };
}
export const jobId = (dialogueId, roundIndex, unitKind, unitId) => `${dialogueId}|${roundIndex}|${unitKind}|${unitId}`;
export function planJobs(rounds, map) {
  const cache = new Map(), jobs = [];
  for (const round of rounds) {
    if (!cache.has(round.paragraphId)) cache.set(round.paragraphId, unitsForParagraph(map, round.paragraphId));
    const u = cache.get(round.paragraphId);
    for (const n of u.nodes) jobs.push({ jobId: jobId(round.dialogueId, round.roundIndex, 'node', n.id), round, unitKind: 'node', unit: n });
    for (const r of u.relations) jobs.push({ jobId: jobId(round.dialogueId, round.roundIndex, 'relation', r.id), round, unitKind: 'relation', unit: r });
  }
  return jobs;
}

export function usageCost(usage) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  return (usage.input_tokens * RATES.input + usage.output_tokens * RATES.output) / 1e6;
}
export function reserveUsd(request) { return (Buffer.byteLength(JSON.stringify(request)) * RATES.input + request.max_output_tokens * RATES.output) / 1e6; }
// requests = already started, spentUsd = actual cost so far, reserved = in-flight + this request. Returns a stop reason or null.
export function limitCheck({ requests, spentUsd, reserved }) {
  if (requests >= LIMITS.maxRequests) return 'RUN_LIMIT: max requests';
  if (spentUsd + reserved > LIMITS.usdCap) return 'RUN_LIMIT: usd cap';
  return null;
}
// 연결 오류는 서버에 닿지 않은 요청이라 청구가 없다. 타임아웃(APIConnectionTimeoutError)은 서버가 처리했을 수 있어 예약액으로 둔다.
export function isConnectionError(error) { return typeof error === 'string' && /^Error: Connection error\./.test(error); }
export function nextConnErrStreak(streak, error) { return isConnectionError(error) ? streak + 1 : 0; }
export function circuitTripped(streak) { return streak >= MAX_CONSECUTIVE_CONNECTION_ERRORS; }
export function endCost(end) { return end.costUsd ?? (isConnectionError(end.error) ? 0 : end.reservedUsd ?? 0); }

// ---------- 4. quote check ----------
export function checkQuotes(round, judgment) {
  const students = round.dialogue.filter(t => t.role === 'student').map(t => t.text), tutors = round.dialogue.filter(t => t.role === 'tutor').map(t => t.text);
  const quoteChecks = judgment.quotes.map(q => {
    const valid = q.length > 0 && students.some(s => s.includes(q));
    return { quote: q, valid, wsNormalizedMatch: !valid && q.length > 0 && students.some(s => ws(s).includes(ws(q))), inTutorOnly: !valid && q.length > 0 && tutors.some(t => t.includes(q)) };
  });
  const validCount = quoteChecks.filter(c => c.valid).length;
  const label = judgment.label;
  const quoteDowngrade = label === 'DIRECT' && validCount === 0;
  return { quoteChecks, validCount, finalLabel: quoteDowngrade ? 'PARTIAL' : label, quoteDowngrade,
    noValidQuote: (label === 'PARTIAL' || label === 'CONTRADICTS') && validCount === 0, tutorQuote: quoteChecks.some(c => c.inTutorOnly) };
}

// ---------- 5. combination ----------
// judgments: { [unitId]: { finalLabel } } for one round. Returns per-node pattern, per-relation pattern, contradictions.
export function combineRound(map, paragraphId, judgments) {
  const { nodes, relations } = unitsForParagraph(map, paragraphId);
  const { byId } = indexMap(map);
  const lab = id => judgments[id]?.finalLabel ?? null, caught = l => l === 'DIRECT' || l === 'PARTIAL';
  const nodeResults = {}, relResults = {}, contradictions = [];
  for (const n of nodes) {
    const label = lab(n.id);
    if (label === 'CONTRADICTS') contradictions.push(n.id);
    if (n.kind === 'PROPOSITION') { nodeResults[n.id] = { label, pattern: null }; continue; }
    const kids = n.childIds, kidLabels = kids.map(lab), k = kidLabels.filter(caught).length;
    let pattern = null;
    if (label === null || kidLabels.some(l => l === null)) pattern = 'INCOMPLETE';
    else if (label === 'DIRECT') pattern = k >= 1 ? 'SUBSUMED' : 'MISMATCH_TOP_ONLY';
    else if (label === 'ABSENT' && k >= 2) pattern = 'LISTING';
    nodeResults[n.id] = { label, pattern, children: kids.length, caught: k };
  }
  for (const r of relations) {
    const label = lab(r.id);
    if (label === 'CONTRADICTS') contradictions.push(r.id);
    const crossEndUnchecked = [r.fromId, r.toId].filter(id => byId.get(id).paragraphId !== paragraphId);
    const own = [r.fromId, r.toId].filter(id => !crossEndUnchecked.includes(id));
    const pattern = caught(label) && own.some(id => lab(id) === 'ABSENT') ? 'MISMATCH_RELATION' : null;
    relResults[r.id] = { label, pattern, crossEndUnchecked };
  }
  return { paragraphId, nodes: nodeResults, relations: relResults, contradictions };
}
export function roundChanges(prevJudgments, curJudgments) {
  const out = [];
  for (const id of Object.keys(curJudgments)) {
    const a = prevJudgments[id]?.finalLabel ?? null, b = curJudgments[id]?.finalLabel ?? null;
    if (a !== b) out.push({ unitId: id, from: a, to: b });
  }
  return out;
}

// ---------- results assembly + report ----------
export function latestByJob(rows) { const m = new Map(); for (const r of rows) m.set(r.jobId, r); return m; }
export function assemble(rounds, map, judgmentRows) {
  const byJob = latestByJob(judgmentRows), combined = [], prevByDialogue = new Map();
  for (const round of rounds) {
    const u = unitsForParagraph(map, round.paragraphId), judgments = {};
    for (const [kind, list] of [['node', u.nodes], ['relation', u.relations]]) for (const x of list) {
      const row = byJob.get(jobId(round.dialogueId, round.roundIndex, kind, x.id));
      judgments[x.id] = { finalLabel: row?.status === 'OK' ? row.finalLabel : null, status: row?.status ?? 'MISSING' };
    }
    const c = combineRound(map, round.paragraphId, judgments);
    const prev = prevByDialogue.get(round.dialogueId);
    combined.push({ dialogueId: round.dialogueId, roundIndex: round.roundIndex, paragraphId: round.paragraphId, ...c,
      changes: prev ? roundChanges(prev, judgments) : null });
    prevByDialogue.set(round.dialogueId, judgments);
  }
  return combined;
}
const MARK = { DIRECT: '●', PARTIAL: '◐', ABSENT: '○', CONTRADICTS: '✕' };
const mark = l => MARK[l] ?? '?';
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const dist = o => ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS', 'UNJUDGED'].map(k => `${k} ${o[k] ?? 0}`).join(', ');

export function renderReport({ rounds, dialogues, map, judgmentRows, combined, run }) {
  const byJob = latestByJob(judgmentRows), rows = [...byJob.values()];
  const { byId } = indexMap(map);
  const lblOf = r => r.status === 'OK' ? r.finalLabel : 'UNJUDGED';
  const patterns = {};
  for (const c of combined) for (const x of [...Object.values(c.nodes), ...Object.values(c.relations)]) if (x.pattern) patterns[x.pattern] = (patterns[x.pattern] ?? 0) + 1;
  const bySrc = count(dialogues, d => d.source);
  const L = ['# 분석 지도 공손룡 2단계 결과', '', '결과만 기록한다. 해석·평가 문장 없음. 원자료: `rounds.jsonl`, `judgments.jsonl`, `combined.json`, `ledger.jsonl`, `RUN.json`.', '',
    '## 요약', '', '| 항목 | 값 |', '|---|---|',
    `| 대화 수 | ${dialogues.length} (V4 ${bySrc.v4 ?? 0}, 단순 형식 ${bySrc.sh ?? 0}) |`,
    `| 원문 복사 표시 대화 | ${dialogues.filter(d => d.copiedSource).length} |`,
    `| 라운드 수 | ${rounds.length} |`, `| 판정 수 | ${rows.length} (노드 ${rows.filter(r => r.unitKind === 'node').length}, 관계 ${rows.filter(r => r.unitKind === 'relation').length}) |`,
    `| 노드 라벨 분포(finalLabel) | ${dist(count(rows.filter(r => r.unitKind === 'node'), lblOf))} |`,
    `| 관계 라벨 분포(finalLabel) | ${dist(count(rows.filter(r => r.unitKind === 'relation'), lblOf))} |`,
    `| 패턴 | ${['SUBSUMED', 'MISMATCH_TOP_ONLY', 'LISTING', 'INCOMPLETE', 'MISMATCH_RELATION'].map(k => `${k} ${patterns[k] ?? 0}`).join(', ')} |`,
    `| 인용 강등(quoteDowngrade) | ${rows.filter(r => r.quoteDowngrade).length} |`, `| 교사 인용(tutorQuote) | ${rows.filter(r => r.tutorQuote).length} |`,
    `| 유효 인용 없음(noValidQuote) | ${rows.filter(r => r.noValidQuote).length} |`,
    `| 무효 인용 개수 / 전체 인용 개수 | ${rows.reduce((s, r) => s + (r.quoteChecks ?? []).filter(c => !c.valid).length, 0)} / ${rows.reduce((s, r) => s + (r.quoteChecks ?? []).length, 0)} |`,
    `| 공백 정규화 시에만 일치하는 인용 | ${rows.reduce((s, r) => s + (r.quoteChecks ?? []).filter(c => c.wsNormalizedMatch).length, 0)} |`,
    `| 실패 판정 | ${rows.filter(r => r.status !== 'OK').length} |`,
    `| 요청 수 / 비용 | ${run?.requests ?? '-'} / $${(run?.totalCostUsd ?? 0).toFixed(4)} |`, ''];
  const combinedBy = new Map(combined.map(c => [`${c.dialogueId}|${c.roundIndex}`, c]));
  const treeLines = (c, paragraphId) => {
    const out = [], u = unitsForParagraph(map, paragraphId), inPara = new Set(u.nodes.map(n => n.id));
    const walk = (id, d) => {
      const x = byId.get(id), r = c.nodes[id];
      out.push(`${'  '.repeat(d)}- ${mark(r.label)} ${id}${r.pattern ? ` [${r.pattern}${r.children != null && r.pattern === 'SUBSUMED' ? ` ${r.caught}/${r.children}` : ''}]` : ''}: ${x.text}`);
      for (const ch of x.childIds ?? []) if (inPara.has(ch)) walk(ch, d + 1);
    };
    walk(u.nodes.find(n => n.kind === 'PARAGRAPH_GIST').id, 0);
    return out;
  };
  L.push('## 대화별 결과', '');
  for (const d of dialogues) {
    L.push(`### ${d.dialogueId}`, '', `- 출처 ${d.source}, 문단 ${d.paragraphId}${d.copiedSource ? ', 원문 복사 표시' : ''}`, '');
    for (const round of rounds.filter(r => r.dialogueId === d.dialogueId)) {
      const c = combinedBy.get(`${d.dialogueId}|${round.roundIndex}`), u = unitsForParagraph(map, d.paragraphId);
      L.push(`#### 라운드 ${round.roundIndex}`, '');
      for (const t of round.dialogue) L.push(`- ${t.role === 'student' ? '학생' : '교사'}: ${t.text.replace(/\n/gu, ' ')}`);
      L.push('', ...treeLines(c, d.paragraphId), '');
      if (u.relations.length) { L.push('관계:'); for (const r of u.relations) { const x = c.relations[r.id]; L.push(`- ${mark(x.label)} ${r.id} ${r.fromId}→${r.toId}${x.pattern ? ` [${x.pattern}]` : ''}${x.crossEndUnchecked.length ? ` (다른 문단 끝 미검사: ${x.crossEndUnchecked.join(', ')})` : ''}`); } L.push(''); }
      L.push(`모순 목록: ${c.contradictions.length ? c.contradictions.join(', ') : '없음'}`);
      if (c.changes) L.push(`직전 라운드 대비 변화: ${c.changes.length ? c.changes.map(x => `${x.unitId} ${x.from ?? '?'} → ${x.to ?? '?'}`).join(', ') : '없음'}`);
      L.push('');
    }
  }
  L.push('## 단순 형식 세션 누적표', '');
  const sessions = [...new Set(dialogues.filter(d => d.source === 'sh').map(d => d.sessionId))];
  for (const sid of sessions) {
    L.push(`### 세션 ${sid}`, '', '| 문단 | 마지막 라운드 G 라벨 | 패턴 개수 | 모순 수 |', '|---|---|---|---|');
    const paras = [...new Set(dialogues.filter(d => d.sessionId === sid).map(d => d.paragraphId))].sort();
    for (const pid of paras) {
      const last = dialogues.filter(d => d.sessionId === sid && d.paragraphId === pid).at(-1);
      const lr = rounds.filter(r => r.dialogueId === last.dialogueId).at(-1), c = combinedBy.get(`${last.dialogueId}|${lr.roundIndex}`);
      const g = unitsForParagraph(map, pid).nodes.find(n => n.kind === 'PARAGRAPH_GIST').id;
      const pc = [...Object.values(c.nodes), ...Object.values(c.relations)].filter(x => x.pattern).length;
      L.push(`| ${pid.split('-').pop()} (${last.dialogueId.split(':').pop()}번 대화) | ${mark(c.nodes[g].label)} ${c.nodes[g].label ?? '미판정'} | ${pc} | ${c.contradictions.length} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

// ---------- main ----------
function loadInputs() {
  const mapBytes = readFileSync(MAP_PATH);
  if (hash(mapBytes) !== MAP_SHA256) throw new Error('FROZEN_MAP_HASH_MISMATCH');
  const map = JSON.parse(mapBytes.toString('utf8')), { passage } = loadPassage();
  const dialogues = extractDialogues(readJsonl(V4_LOG), readJsonl(SH_LOG), passage);
  const v4 = dialogues.filter(d => d.source === 'v4').length;
  if (v4 !== EXPECTED.v4) throw new Error(`EXTRACTION_COUNT: v4 ${v4} != ${EXPECTED.v4}`);
  passage.paragraphs.forEach((p, i) => {
    const u = unitsForParagraph(map, p.paragraphId);
    if (u.nodes.length !== EXPECTED.nodes[i] || u.relations.length !== EXPECTED.relations[i]) throw new Error(`UNIT_COUNT: ${p.paragraphId} nodes ${u.nodes.length} relations ${u.relations.length}`);
  });
  const rounds = dialogues.flatMap(buildRounds);
  return { map, passage, dialogues, rounds, jobs: planJobs(rounds, map) };
}
const protectedHashes = () => Object.fromEntries([MAP_PATH, JUDGE_PROMPT_PATH, MAP_PROMPT_PATH].map(p => [p, hash(readFileSync(p))]));

function writeResults(inp, run) {
  const judgmentRows = readJsonl(`${OUT_DIR}/judgments.jsonl`), combined = assemble(inp.rounds, inp.map, judgmentRows);
  writeFileSync(`${OUT_DIR}/combined.json`, serialize(combined));
  writeFileSync(`${OUT_DIR}/REPORT.md`, renderReport({ rounds: inp.rounds, dialogues: inp.dialogues, map: inp.map, judgmentRows, combined, run }) + '\n');
}

export async function main({ dryRun = false, resume = false, reportOnly = false, transport } = {}) {
  const inp = loadInputs(), promptMd = readFileSync(JUDGE_PROMPT_PATH, 'utf8'), prompts = parseJudgePrompt(promptMd), hashesBefore = protectedHashes();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/rounds.jsonl`, inp.rounds.map(jsonLine).join('\n') + '\n');
  const makeRequest = j => buildJudgeRequest(prompts[j.unitKind], buildJudgeInput(j.round, j.unitKind, j.unit));
  const stats = { dialoguesBySource: count(inp.dialogues, d => d.source), copiedSource: inp.dialogues.filter(d => d.copiedSource).length,
    rounds: inp.rounds.length, requests: inp.jobs.length };
  if (dryRun) {
    const reqs = inp.jobs.map(makeRequest), bytes = reqs.reduce((s, r) => s + Buffer.byteLength(JSON.stringify(r)), 0);
    const upper = reqs.reduce((s, r) => s + reserveUsd(r), 0);
    const estimate = (bytes / 2 * RATES.input + inp.jobs.length * 800 * RATES.output) / 1e6;
    const pick = [0, Math.floor(inp.jobs.length / 2), inp.jobs.length - 1].map(i => ({ jobId: inp.jobs[i].jobId, request: reqs[i] }));
    writeFileSync(`${OUT_DIR}/dry-run.requests-sample.json`, serialize({ samples: pick, schema: JSON_SCHEMA }));
    return { dryRun: true, externalRequests: 0, ...stats, estimatedUsd: estimate, upperBoundUsd: upper, overRequestLimit: inp.jobs.length > LIMITS.maxRequests };
  }
  const ledgerPath = `${OUT_DIR}/ledger.jsonl`, judgPath = `${OUT_DIR}/judgments.jsonl`, runPath = `${OUT_DIR}/RUN.json`;
  if (reportOnly) { writeResults(inp, existsSync(runPath) ? JSON.parse(readFileSync(runPath, 'utf8')) : null); return { reportOnly: true }; }
  if (!resume && (existsSync(ledgerPath) || existsSync(judgPath))) throw new Error('RUN_EXISTS: use --resume (no retries otherwise)');
  if (inp.jobs.length > LIMITS.maxRequests && !resume) throw new Error(`REQUESTS_OVER_LIMIT: ${inp.jobs.length}`);
  const prior = readJsonl(ledgerPath), done = new Set([...latestByJob(readJsonl(judgPath)).values()].filter(r => r.status === 'OK').map(r => r.jobId));
  let requests = prior.filter(e => e.event === 'START').length, spent = prior.filter(e => e.event === 'END').reduce((s, e) => s + endCost(e), 0), inflight = 0, stop = null, connErrStreak = 0;
  const queue = inp.jobs.filter(j => !done.has(j.jobId));
  const priorRun = existsSync(runPath) ? JSON.parse(readFileSync(runPath, 'utf8')) : null;
  const runInfo = { version: 1, startedAtUtc: priorRun?.startedAtUtc ?? new Date().toISOString(), resumes: [...(priorRun?.resumes ?? []), ...(resume ? [new Date().toISOString()] : [])],
    model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS, concurrency: CONCURRENCY, retries: 0, rates: RATES, limits: LIMITS,
    judgePromptHash: hash(promptMd), nodeInstructionsHash: hash(prompts.node), relationInstructionsHash: hash(prompts.relation), frozenMapHash: MAP_SHA256,
    scriptHash: hash(readFileSync(new URL(import.meta.url))), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), plannedRequests: inp.jobs.length, protectedHashesBefore: hashesBefore };
  let client;
  const ledger = row => appendFileSync(ledgerPath, jsonLine(row) + '\n');
  const runOne = async job => {
    const request = makeRequest(job), reserved = reserveUsd(request), t0 = performance.now();
    ledger({ event: 'START', requestId: job.jobId, atUtc: new Date().toISOString(), reservedUsd: reserved });
    let response = null, error = null;
    try { response = await (transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses).create(request, { timeout: TIMEOUT_MS }); }
    catch (e) { error = String(e); }
    const cost = response ? usageCost(response.usage) : null;
    const connectionError = isConnectionError(error);
    spent += connectionError ? 0 : error ? reserved : (cost ?? reserved);
    connErrStreak = nextConnErrStreak(connErrStreak, error);
    if (circuitTripped(connErrStreak) && !stop) { stop = 'CIRCUIT: consecutive connection errors'; ledger({ event: 'STOP', reason: stop, atUtc: new Date().toISOString() }); }
    ledger({ event: 'END', requestId: job.jobId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), model: response?.model ?? null,
      responseId: response?.id ?? null, status: response?.status ?? 'API_ERROR', usage: response?.usage ?? null, costUsd: error ? null : cost, costAssumedReserved: connectionError ? false : error ? true : cost === null, connectionError, reservedUsd: reserved, error });
    const base = { jobId: job.jobId, dialogueId: job.round.dialogueId, roundIndex: job.round.roundIndex, unitKind: job.unitKind, unitId: job.unit.id,
      tokens: response?.usage ? { input: response.usage.input_tokens, output: response.usage.output_tokens } : null };
    let row;
    try {
      if (error) throw new Error(error);
      if (response.output?.some(o => o.content?.some(c => c.type === 'refusal'))) throw new Error('REFUSAL');
      if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
      const j = JudgmentSchema.parse(JSON.parse(response.output_text)), q = checkQuotes(job.round, j);
      row = { ...base, status: 'OK', label: j.label, quotes: j.quotes, reason: j.reason, ...q };
    } catch (e) { row = { ...base, status: 'FAILED', error: String(e), finalLabel: null }; }
    appendFileSync(judgPath, jsonLine(row) + '\n');
    return reserved;
  };
  const worker = async () => {
    while (queue.length && !stop) {
      const job = queue.shift(), reserved = reserveUsd(makeRequest(job));
      stop = limitCheck({ requests, spentUsd: spent, reserved: reserved + inflight });
      if (stop) { ledger({ event: 'STOP', reason: stop, atUtc: new Date().toISOString() }); break; }
      requests++; inflight += reserved;
      try { await runOne(job); } finally { inflight -= reserved; }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const run = { ...runInfo, finishedAtUtc: new Date().toISOString(), requests, totalCostUsd: spent, stop, protectedHashesAfter: protectedHashes() };
  run.protectedUnchanged = jsonLine(run.protectedHashesAfter) === jsonLine(hashesBefore);
  writeFileSync(runPath, serialize(run));
  writeResults(inp, run);
  const rows = [...latestByJob(readJsonl(judgPath)).values()];
  return { ...stats, requests, totalCostUsd: spent, stop, failures: rows.filter(r => r.status !== 'OK').length, missing: inp.jobs.length - rows.filter(r => r.status === 'OK').length, protectedUnchanged: run.protectedUnchanged };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = process.argv;
  console.log(JSON.stringify(await main({ dryRun: a.includes('--dry-run'), resume: a.includes('--resume'), reportOnly: a.includes('--report-only') }), null, 2));
}
