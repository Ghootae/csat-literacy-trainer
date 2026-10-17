// D-0143 stage 2: top-down judgment of existing gongsun dialogues against the frozen analysis map.
// Keys are loaded only by Node's --env-file-if-exists. Handoff: docs/handoffs/2026-10-16-analysis-map-gongsun-stage2.md
// Usage: node --env-file-if-exists=.env scripts/run-analysis-judge-gongsun.mjs [--prompt v2|v3] [--rounds-from <rounds.jsonl>] [--dry-run | --resume | --report-only]
//        node scripts/run-analysis-judge-gongsun.mjs --compare [v2 v3]   (comparison report, no network; default v1 v2; handoffs 2026-10-17-analysis-map-gongsun-stage2-v2.md, -v3.md)
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
export const JUDGE_PROMPT_V2_PATH = `${EXP_DIR}/JUDGE-PROMPT-v2.md`;
export const JUDGE_PROMPT_V3_PATH = `${EXP_DIR}/JUDGE-PROMPT-v3.md`;
export const FIXED_ROUNDS_PATH = `${EXP_DIR}/stage2/rounds.jsonl`; // 77라운드 고정 입력(stage2-v2/rounds.jsonl과 동일). --rounds-from·--compare가 쓰며 로그는 읽지 않는다.
export const STANCE_PATH = `${EXP_DIR}/stance/stance-final.json`;
export const MAP_PROMPT_PATH = `${EXP_DIR}/MAP-PROMPT.md`;
export const V4_LOG = '.omc/logs/dialogue-experiment/sessions.jsonl';
export const SH_LOG = '.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl';
export const MODEL = 'gpt-6-luna';
export const RATES = { input: 0.10, output: 0.50 }; // USD per 1M tokens (same as run-v5-diverse-48.mjs)
// 2026-10-17 사용자 승인: 시도 2,300건, 실제 청구 $1. 연결 오류(서버 미도달)는 $0, 타임아웃은 예약액으로 계산(D-0143).
export const LIMITS = { maxRequests: 2300, usdCap: 1 };
// --prompt v2 (2026-10-17 사용자 승인): 요청 2,000(시도 기준), 실제 청구 $1. 기본값(v1)은 위 LIMITS 그대로.
export const VERSIONS = {
  v1: { dir: OUT_DIR, promptPath: JUDGE_PROMPT_PATH, schemaName: 'analysis_judgment_v1', limits: LIMITS },
  v2: { dir: `${EXP_DIR}/stage2-v2`, promptPath: JUDGE_PROMPT_V2_PATH, schemaName: 'analysis_judgment_v2', limits: { maxRequests: 2000, usdCap: 1 } },
  // --prompt v3 (2026-10-17 사용자 승인): v2 + 판정 대상 입장 입력(stance-final.json). 요청 2,000(시도 기준), 실제 청구 $1.
  v3: { dir: `${EXP_DIR}/stage2-v3`, promptPath: JUDGE_PROMPT_V3_PATH, schemaName: 'analysis_judgment_v3', limits: { maxRequests: 2000, usdCap: 1 }, stance: true },
};
export const MAX_CONSECUTIVE_CONNECTION_ERRORS = 10;
export const MAX_OUTPUT_TOKENS = 2000;
export const TIMEOUT_MS = 60000;
export const CONCURRENCY = 8;
export const COPY_MIN = 30;
// 일반화 실행(--exp-dir, 도파민 판정 인계 2026-10-18, D-0146 ④): 요청 1,000(시도 기준), 실제 청구 $0.5.
export const GENERALIZED_LIMITS = { maxRequests: 1000, usdCap: 0.5 };
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
// v3: stances = Map(unitId -> 입장 문자열). 없으면(v1·v2) 요청 본문은 이전과 같다.
export function stanceLabel(stance) {
  if (stance.kind === 'AUTHOR') return '필자 서술';
  if (stance.kind === 'COMMON') return '상식·통념';
  if (stance.kind === 'FIGURE') return `${stance.holder}의 주장`;
  if (stance.kind === 'MIXED') return `혼합(${stance.parts.map((p, i) => ({ p, i })).sort((a, b) => b.p.count - a.p.count || a.i - b.i).map(({ p }) => `${stanceLabel(p)} ${p.count}`).join(', ')})`;
  throw new Error(`STANCE_KIND: ${stance.kind}`);
}
export function loadStanceLabels(path = STANCE_PATH) {
  const f = JSON.parse(readFileSync(path, 'utf8')), m = new Map();
  for (const s of f.stances) m.set(s.id, stanceLabel(s));
  for (const [id, s] of Object.entries(f.nodeStances)) m.set(id, stanceLabel(s));
  return m;
}
export function buildJudgeInput(round, unitKind, unit, stances = null) {
  const dialogue = round.dialogue.map(t => ({ role: t.role, text: t.text }));
  const st = id => { if (!stances.has(id)) throw new Error(`STANCE_MISSING: ${id}`); return { stance: stances.get(id) }; };
  if (unitKind === 'node') return { dialogue, target: { text: unit.text, sourceQuotes: unit.sourceQuotes, ...(stances ? st(unit.id) : {}) } };
  return { dialogue, relation: { from: { text: unit.from.text, sourceQuotes: unit.from.sourceQuotes, ...(stances ? st(unit.fromId) : {}) }, to: { text: unit.to.text, sourceQuotes: unit.to.sourceQuotes, ...(stances ? st(unit.toId) : {}) }, note: unit.note } };
}
export function buildJudgeRequest(instructions, input, schemaName = 'analysis_judgment_v1') {
  return { model: MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: schemaName, strict: true, schema: JSON_SCHEMA } } };
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
export function limitCheck({ requests, spentUsd, reserved }, limits = LIMITS) {
  if (requests >= limits.maxRequests) return 'RUN_LIMIT: max requests';
  if (spentUsd + reserved > limits.usdCap) return 'RUN_LIMIT: usd cap';
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

export function renderReport({ rounds, dialogues, map, judgmentRows, combined, run, title = '분석 지도 공손룡 2단계 결과' }) {
  const byJob = latestByJob(judgmentRows), rows = [...byJob.values()];
  const { byId } = indexMap(map);
  const lblOf = r => r.status === 'OK' ? r.finalLabel : 'UNJUDGED';
  const patterns = {};
  for (const c of combined) for (const x of [...Object.values(c.nodes), ...Object.values(c.relations)]) if (x.pattern) patterns[x.pattern] = (patterns[x.pattern] ?? 0) + 1;
  const bySrc = count(dialogues, d => d.source);
  const L = [`# ${title}`, '', '결과만 기록한다. 해석·평가 문장 없음. 원자료: `rounds.jsonl`, `judgments.jsonl`, `combined.json`, `ledger.jsonl`, `RUN.json`.', '',
    '## 요약', '', '| 항목 | 값 |', '|---|---|',
    `| 대화 수 | ${dialogues.length} (V4 ${bySrc.v4 ?? 0}, 단순 형식 ${bySrc.sh ?? 0}${bySrc.test ? `, 시험 응답 ${bySrc.test}` : ''}${bySrc.copy ? `, 원문 복사 ${bySrc.copy}` : ''}) |`,
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

// ---------- 6. error events (D-0143 오류 집계 규칙) ----------
// 1차 . ? ! 。 줄바꿈, 2차 , ; / 에서 나눈다. 구분 기호(연속하면 모두)는 앞 구간에 붙고, 공백만 남은 구간은 버린다. 오프셋은 원문 기준.
export function segmentStudentTurn(text, turnIndex = 1) {
  const cut = (str, base, delims) => {
    const out = [];
    let start = 0, i = 0;
    while (i < str.length) {
      if (delims.includes(str[i])) {
        while (i < str.length && delims.includes(str[i])) i++;
        out.push([base + start, base + i]); start = i;
      } else i++;
    }
    if (start < str.length) out.push([base + start, base + str.length]);
    return out;
  };
  const spans = cut(text, 0, ['.', '?', '!', '。', '\n']).flatMap(([a, b]) => cut(text.slice(a, b), a, [',', ';', '/']));
  return spans.filter(([a, b]) => text.slice(a, b).trim()).map(([start, end], segmentIndex) => ({ turnIndex, segmentIndex, start, end, text: text.slice(start, end) }));
}
export const segmentsOfRound = round => round.dialogue.filter(t => t.role === 'student').flatMap((t, i) => segmentStudentTurn(t.text, i + 1));

// 걸린 노드들을 모두 덮는 가장 낮은 노드(최소 공통 조상). 노드 하나면 그 노드. 공통 조상이 없으면 null.
export function lowestCommonAncestor(map, ids) {
  const parent = new Map();
  for (const n of map.nodes) for (const c of n.childIds ?? []) if (!parent.has(c)) parent.set(c, n.id);
  const chain = id => { const out = [id]; while (parent.has(out.at(-1))) out.push(parent.get(out.at(-1))); return out; };
  const chains = [...new Set(ids)].map(chain);
  if (!chains.length) return null;
  return chains[0].find(a => chains.every(c => c.includes(a))) ?? null;
}
function eventRepresentative(map, paragraphId, units) {
  const { byId } = indexMap(map);
  if (units.nodes.length) return lowestCommonAncestor(map, units.nodes);
  const ends = units.relations.flatMap(rid => { const r = map.relations.find(x => x.id === rid); return [r.fromId, r.toId]; }).filter(id => byId.get(id).paragraphId === paragraphId);
  return lowestCommonAncestor(map, ends);
}

// 라운드별 ✕ 판정 -> 오류 사건. 반환: events(꼬리표 NEW/KEPT/LATE), ended(이전 라운드 사건의 RESOLVED/DROPPED), unlocated.
export function errorEvents(rounds, judgmentRows, map) {
  const byJob = latestByJob(judgmentRows), events = [], ended = [], unlocated = [], prevEvents = new Map();
  const roundsByDialogue = new Map();
  for (const r of rounds) { if (!roundsByDialogue.has(r.dialogueId)) roundsByDialogue.set(r.dialogueId, []); roundsByDialogue.get(r.dialogueId).push(r); }
  for (const list of roundsByDialogue.values()) {
    list.sort((a, b) => a.roundIndex - b.roundIndex);
    let prev = null; // Map key -> event of the previous round
    for (const round of list) {
      const students = round.dialogue.filter(t => t.role === 'student').map(t => t.text), segs = segmentsOfRound(round), lastTurn = students.length;
      const u = unitsForParagraph(map, round.paragraphId), cur = new Map();
      for (const [kind, list2] of [['node', u.nodes], ['relation', u.relations]]) for (const x of list2) {
        const row = byJob.get(jobId(round.dialogueId, round.roundIndex, kind, x.id));
        if (row?.status !== 'OK' || row.finalLabel !== 'CONTRADICTS') continue;
        let located = false;
        for (const q of (row.quoteChecks ?? []).filter(c => c.valid).map(c => c.quote)) {
          const ti = students.findIndex(s => s.includes(q));
          if (ti < 0) continue;
          const pos = students[ti].indexOf(q), qEnd = pos + q.length;
          for (const seg of segs.filter(g => g.turnIndex === ti + 1 && g.start < qEnd && g.end > pos)) {
            located = true;
            const key = `${round.dialogueId}|${seg.turnIndex}|${seg.segmentIndex}`;
            if (!cur.has(key)) cur.set(key, { key, dialogueId: round.dialogueId, paragraphId: round.paragraphId, turnIndex: seg.turnIndex, segmentText: seg.text, round: round.roundIndex, units: { nodes: [], relations: [] }, representative: null });
            const ids = cur.get(key).units[kind === 'node' ? 'nodes' : 'relations'];
            if (!ids.includes(x.id)) ids.push(x.id);
          }
        }
        if (!located) unlocated.push({ dialogueId: round.dialogueId, paragraphId: round.paragraphId, round: round.roundIndex, unitKind: kind, unitId: x.id });
      }
      for (const e of cur.values()) {
        e.representative = eventRepresentative(map, round.paragraphId, e.units);
        e.tag = e.turnIndex === lastTurn ? 'NEW' : prev?.has(e.key) ? 'KEPT' : 'LATE';
        events.push(e);
      }
      if (prev) for (const pe of prev.values()) {
        if (cur.has(pe.key)) continue;
        const resolved = [['node', pe.units.nodes], ['relation', pe.units.relations]].some(([kind, ids]) => ids.some(id => {
          const row = byJob.get(jobId(round.dialogueId, round.roundIndex, kind, id));
          return row?.status === 'OK' && (row.finalLabel === 'DIRECT' || row.finalLabel === 'PARTIAL')
            && (row.quoteChecks ?? []).some(c => c.valid && students[lastTurn - 1].includes(c.quote));
        }));
        ended.push({ key: pe.key, dialogueId: pe.dialogueId, paragraphId: pe.paragraphId, turnIndex: pe.turnIndex, segmentText: pe.segmentText, fromRound: pe.round, round: round.roundIndex,
          units: pe.units, representative: pe.representative, tag: resolved ? 'RESOLVED' : 'DROPPED' });
      }
      prev = cur;
    }
  }
  return { events, ended, unlocated };
}

// ---------- 6b. scoring (도파민 판정 인계 2026-10-18, D-0146 ④ 통과 기준 ③) ----------
export const SCORE_CRITERIA = { copyContradicts: 0, copyDirectRatio: 0.85, detectionRate: 0.8 };
const spansOf = (text, q) => { const out = []; if (!q) return out; for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + 1)) out.push([i, i + q.length]); return out; };
const overlaps = (spans, [a, b]) => spans.some(([c, d]) => c < b && a < d);
// 시험 응답 한 개의 ✕ 판정을 심은 오류(errorSpan)와 대조한다. rows = 그 응답 대화의 판정 행 전체. 반환: errors(검출 여부·판정), falsePositiveCandidates, unlocated.
export function scoreTestResponse(resp, rows) {
  const spans = resp.errors.map(e => { const i = resp.text.indexOf(e.errorSpan); if (i < 0) throw new Error(`ERROR_SPAN_NOT_FOUND: ${e.id}`); return { id: e.id, span: [i, i + e.errorSpan.length] }; });
  const errors = resp.errors.map(e => ({ id: e.id, type: e.type, errorSpan: e.errorSpan, detected: false, detectedBy: [] }));
  const candidates = [], unlocated = [];
  for (const row of rows.filter(r => r.status === 'OK' && r.finalLabel === 'CONTRADICTS')) {
    const valid = (row.quoteChecks ?? []).filter(c => c.valid).map(c => c.quote);
    if (!valid.length) { unlocated.push({ responseId: resp.id, unitKind: row.unitKind, unitId: row.unitId, reason: row.reason }); continue; }
    const stray = [];
    for (const q of valid) {
      const qs = spansOf(resp.text, q);
      const hit = spans.filter(s => qs.some(x => overlaps([s.span], x)));
      for (const s of hit) {
        const err = errors.find(e => e.id === s.id); err.detected = true;
        let d = err.detectedBy.find(x => x.unitId === row.unitId && x.unitKind === row.unitKind);
        if (!d) err.detectedBy.push(d = { unitKind: row.unitKind, unitId: row.unitId, quotes: [] });
        if (!d.quotes.includes(q)) d.quotes.push(q);
      }
      if (!hit.length) stray.push(q);
    }
    if (stray.length) candidates.push({ responseId: resp.id, unitKind: row.unitKind, unitId: row.unitId, quotes: stray, reason: row.reason });
  }
  return { errors, falsePositiveCandidates: candidates, unlocated };
}
export function scoreRun({ rounds, dialogues, map, judgmentRows, testResponses, run = null }) {
  const byJob = latestByJob(judgmentRows), rows = [...byJob.values()], srcOf = new Map(dialogues.map(d => [d.dialogueId, d.source]));
  const bySource = src => ({ dialogues: dialogues.filter(d => d.source === src).length, rounds: rounds.filter(r => r.source === src).length, judgments: rows.filter(r => srcOf.get(r.dialogueId) === src && r.status === 'OK').length });
  const sources = Object.fromEntries(['v4', 'sh', 'test', 'copy'].map(k => [k, bySource(k)]));
  const lbl = r => r.status === 'OK' ? r.finalLabel : 'UNJUDGED';
  const copyNodes = rows.filter(r => srcOf.get(r.dialogueId) === 'copy' && r.unitKind === 'node'), copyRels = rows.filter(r => srcOf.get(r.dialogueId) === 'copy' && r.unitKind === 'relation');
  const nodeDist = count(copyNodes, lbl), contradicts = nodeDist.CONTRADICTS ?? 0, directRatio = copyNodes.length ? (nodeDist.DIRECT ?? 0) / copyNodes.length : 0;
  const control = { nodeJudgments: copyNodes.length, nodeLabels: nodeDist, relationLabels: count(copyRels, lbl), contradicts, directRatio,
    pass: copyNodes.length > 0 && contradicts <= SCORE_CRITERIA.copyContradicts && directRatio >= SCORE_CRITERIA.copyDirectRatio };
  const responses = testResponses.responses.map(resp => ({ id: resp.id, paragraphId: resp.paragraphId, ...scoreTestResponse(resp, rows.filter(r => r.dialogueId === `test:${resp.id}`)) }));
  const errors = responses.flatMap(r => r.errors.map(e => ({ responseId: r.id, paragraphId: r.paragraphId, ...e })));
  const detected = errors.filter(e => e.detected).length;
  const detection = { total: errors.length, detected, rate: errors.length ? detected / errors.length : 0, pass: errors.length > 0 && detected / errors.length >= SCORE_CRITERIA.detectionRate, errors };
  const falsePositiveCandidates = responses.flatMap(r => r.falsePositiveCandidates), unlocatedTest = responses.flatMap(r => r.unlocated);
  const rec = rounds.filter(r => r.source === 'v4' || r.source === 'sh'), ev = errorEvents(rec, rows, map);
  const reasonOf = e => { const cand = [...e.units.nodes.map(id => ['node', id]), ...e.units.relations.map(id => ['relation', id])];
    const pick = (e.representative && e.units.nodes.includes(e.representative) ? [['node', e.representative]] : []).concat(cand)[0];
    return { reasonUnit: pick?.[1] ?? null, reason: byJob.get(jobId(e.dialogueId, e.round, pick?.[0], pick?.[1]))?.reason ?? null }; };
  const recordEvents = ev.events.map(e => ({ dialogueId: e.dialogueId, paragraphId: e.paragraphId, round: e.round, turnIndex: e.turnIndex, segmentText: e.segmentText, unitCount: e.units.nodes.length + e.units.relations.length,
    units: e.units, representative: e.representative, tag: e.tag, ...reasonOf(e) }));
  return { criteria: SCORE_CRITERIA, sources, cost: { requests: run?.requests ?? null, totalCostUsd: run?.totalCostUsd ?? null }, failures: rows.filter(r => r.status !== 'OK').length,
    control, detection, falsePositiveCandidates, unlocatedTest, recordEvents, recordEventsEnded: ev.ended.map(e => ({ dialogueId: e.dialogueId, fromRound: e.fromRound, round: e.round, segmentText: e.segmentText, tag: e.tag })), recordUnlocated: ev.unlocated };
}
export function renderScore(sc) {
  const flat = s => String(s ?? '').trim().replace(/\s*\n\s*/gu, ' ').replace(/\|/gu, '\\|'), pc = x => `${(x * 100).toFixed(1)}%`;
  const d = o => ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS', 'UNJUDGED'].map(k => `${k} ${o[k] ?? 0}`).join(', ');
  const L = ['# 분석 지도 도파민 판정 채점 (판정 v3)', '', '기계적 채점 결과만 기록한다. 오탐 여부와 오류 사건의 의미 판단은 Claude 검토 칸에 남긴다. 원자료: `judgments.jsonl`, `score.json`.', '',
    '## 요약', '', '| 항목 | 값 |', '|---|---|',
    ...Object.entries(sc.sources).map(([k, v]) => `| 원천 ${k}: 대화 / 라운드 / 판정 | ${v.dialogues} / ${v.rounds} / ${v.judgments} |`),
    `| 요청 수 / 비용 | ${sc.cost.requests ?? '-'} / $${(sc.cost.totalCostUsd ?? 0).toFixed(4)} |`, `| 실패 판정 | ${sc.failures} |`,
    `| 대조군: ✕ 수 (기준 ${sc.criteria.copyContradicts}) | ${sc.control.contradicts} |`, `| 대조군: DIRECT 비율 (기준 ≥ ${pc(sc.criteria.copyDirectRatio)}) | ${pc(sc.control.directRatio)} |`,
    `| 대조군 통과 | ${sc.control.pass ? '통과' : '미통과'} |`, `| 심은 오류 검출률 (기준 ≥ ${pc(sc.criteria.detectionRate)}) | ${sc.detection.detected}/${sc.detection.total} = ${pc(sc.detection.rate)} (${sc.detection.pass ? '통과' : '미통과'}) |`,
    `| 시험 응답 오탐 후보 수 | ${sc.falsePositiveCandidates.length} |`, `| 기록 응답 오류 사건 수 | ${sc.recordEvents.length} |`, '',
    '## 대조군(원문 복사)', '', `- 노드 판정 ${sc.control.nodeJudgments}건: ${d(sc.control.nodeLabels)}`, `- 관계 판정(보고만): ${d(sc.control.relationLabels)}`, `- CONTRADICTS ${sc.control.contradicts}건, DIRECT 비율 ${pc(sc.control.directRatio)}`, '',
    '## 심은 오류 검출', '', '| 오류 | 응답 | 유형 | 검출 | 검출한 단위 | 겹친 인용 |', '|---|---|---|---|---|---|'];
  for (const e of sc.detection.errors) L.push(`| ${e.id} | ${e.responseId} | ${flat(e.type)} | ${e.detected ? '검출' : '미검출'} | ${e.detectedBy.map(x => `${x.unitId}`).join(', ') || '-'} | ${e.detectedBy.map(x => x.quotes.map(q => `「${flat(q)}」`).join(' ')).join(' / ') || '-'} |`);
  L.push('', '## 시험 응답 오탐 후보 (어떤 errorSpan과도 겹치지 않는 ✕ 인용)', '');
  if (!sc.falsePositiveCandidates.length) L.push('없음');
  else { L.push('| 응답 | 단위 | 인용 | reason | Claude 검토 |', '|---|---|---|---|---|'); for (const c of sc.falsePositiveCandidates) L.push(`| ${c.responseId} | ${c.unitId} | ${c.quotes.map(q => `「${flat(q)}」`).join(' ')} | ${flat(c.reason)} |  |`); }
  if (sc.unlocatedTest.length) { L.push('', '유효 인용 없는 ✕ 판정(시험 응답):', ''); for (const u of sc.unlocatedTest) L.push(`- ${u.responseId} ${u.unitId}: ${flat(u.reason)}`); }
  L.push('', '## 기록 응답(v4·sh) 오류 사건 목록', '');
  if (!sc.recordEvents.length) L.push('없음');
  else { L.push('| 대화 | 라운드 | 학생 구간 | 걸린 단위 수 | 대표 위치 | 꼬리표 | 대표 판정 reason | Claude 검토 |', '|---|---|---|---|---|---|---|---|');
    for (const e of sc.recordEvents) L.push(`| ${e.dialogueId} | ${e.round} | 차례 ${e.turnIndex} 「${flat(e.segmentText)}」 | ${e.unitCount} (${[...e.units.nodes, ...e.units.relations].join(', ')}) | ${e.representative ?? '-'} | ${e.tag} | ${e.reasonUnit ?? '-'}: ${flat(e.reason)} |  |`); }
  if (sc.recordEventsEnded.length) { L.push('', '끝난 사건:', ''); for (const e of sc.recordEventsEnded) L.push(`- ${e.dialogueId} 라운드 ${e.fromRound}→${e.round} 「${flat(e.segmentText)}」 ${e.tag}`); }
  if (sc.recordUnlocated.length) L.push('', `unlocated(기록 응답): ${sc.recordUnlocated.map(u => `${u.dialogueId} 라운드 ${u.round} ${u.unitId}`).join('; ')}`);
  return L.join('\n');
}

// ---------- 7. v1 vs v2 comparison ----------
export const CASES = [
  ['F1', 'v4:5f5ba586', 'p1', 1, ['G1']], ['F2', 'v4:8e2ead22', 'p1', 1, ['G1']], ['F3', 'v4:d1b8b941', 'p3', 1, ['P3-5', 'P3-10']],
  ['F4', 'v4:19b3cc0d', 'p3', 1, ['P3-10', 'R11']], ['F5', 'sh:54bfce80', 'p3', 1, ['P3-10']],
  ['F6', 'sh:54bfce80', 'p4', 1, ['P4-4', 'P4-10', 'C4-2', 'C4-3', 'C4-4', 'R17', 'R18', 'R19']], ['F7', 'v4:81557ccb', 'p2', 1, ['P2-8', 'P2-9']],
  ['T1', 'sh:578fc718', 'p4', 1, ['P4-11', 'C4-4', 'C4-5', 'G4']], ['T2', 'sh:54bfce80', 'p4', 2, ['P4-4', 'C4-4']], ['T3', 'sh:54bfce80', 'p5', 2, ['P5-4', 'P5-8', 'C5-2']],
  ['T4', 'v4:83601960', 'p2', 1, ['P2-5', 'C2-1']], ['T5', 'sh:578fc718', 'p5', 2, ['P5-6', 'P5-8']], ['T6', 'v4:83601960', 'p2', 2, ['P2-5', 'C2-1']],
];
export const CASES_V3 = [...CASES, ['T7', 'sh:6c177d02', 'p4', 1, ['G4']], ['F8', 'v4:0929fd23', 'p3', 1, ['P3-5']], ['F9', 'sh:6c177d02', 'p3', 1, ['P3-5']]];
const LABELS = ['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS'];
const RANK = { ABSENT: 0, PARTIAL: 1, DIRECT: 2 };
const okRows = rows => [...latestByJob(rows).values()].filter(r => r.status === 'OK');
const labelDist = rows => Object.fromEntries(LABELS.map(l => [l, rows.filter(r => r.finalLabel === l).length]));
const rowOf = (byJob, dialogueId, round, id) => byJob.get(jobId(dialogueId, round, /^R/u.test(id) ? 'relation' : 'node', id));
const cellOf = row => row?.status === 'OK' ? `${row.finalLabel}${row.quotes.length ? ` (${row.quotes.map((q, i) => row.quoteChecks[i]?.valid ? q : `${q} [무효]`).join(' / ')})` : ''}` : '미판정';

export function summarizeRun(rounds, judgmentRows, map) {
  const rows = okRows(judgmentRows), byJob = latestByJob(judgmentRows), copied = new Set(rounds.filter(r => r.copiedSource).map(r => r.dialogueId));
  const nodes = rows.filter(r => r.unitKind === 'node'), rels = rows.filter(r => r.unitKind === 'relation');
  const combined = assemble(rounds, map, judgmentRows), patterns = {};
  for (const c of combined) for (const x of [...Object.values(c.nodes), ...Object.values(c.relations)]) if (x.pattern) patterns[x.pattern] = (patterns[x.pattern] ?? 0) + 1;
  const quotes = rows.flatMap(r => r.quotes ?? []), ev = errorEvents(rounds, judgmentRows, map), tags = t => ev.events.filter(e => e.tag === t).length;
  let rise = 0, fall = 0, toFromContradicts = 0;
  const prevBy = new Map();
  for (const round of rounds) {
    const prev = prevBy.get(round.dialogueId), cur = {};
    for (const x of unitsForParagraph(map, round.paragraphId).nodes.map(n => ['node', n.id]).concat(unitsForParagraph(map, round.paragraphId).relations.map(r => ['relation', r.id]))) {
      const row = byJob.get(jobId(round.dialogueId, round.roundIndex, x[0], x[1]));
      cur[x[1]] = row?.status === 'OK' ? row.finalLabel : null;
      const a = prev?.[x[1]], b = cur[x[1]];
      if (!prev || a == null || b == null || a === b) continue;
      if (a in RANK && b in RANK) { if (RANK[b] > RANK[a]) rise++; else fall++; } else toFromContradicts++;
    }
    prevBy.set(round.dialogueId, cur);
  }
  return { judgments: rows.length, nodeLabels: labelDist(nodes), relationLabels: labelDist(rels), copiedControlNodeLabels: labelDist(nodes.filter(r => copied.has(r.dialogueId))),
    patterns, patternTotal: Object.values(patterns).reduce((a, b) => a + b, 0), quoteDowngrade: rows.filter(r => r.quoteDowngrade).length,
    invalidQuotes: rows.reduce((s, r) => s + (r.quoteChecks ?? []).filter(c => !c.valid).length, 0), totalQuotes: quotes.length,
    meanQuoteChars: quotes.length ? quotes.reduce((s, q) => s + q.length, 0) / quotes.length : 0,
    events: { total: ev.events.length, NEW: tags('NEW'), KEPT: tags('KEPT'), LATE: tags('LATE'), RESOLVED: ev.ended.filter(e => e.tag === 'RESOLVED').length, DROPPED: ev.ended.filter(e => e.tag === 'DROPPED').length },
    unlocated: ev.unlocated.length, rise, fall, contradictsChanges: toFromContradicts, errors: ev };
}
export function transitionTable(rowsV1, rowsV2, unitKind) {
  const b2 = latestByJob(rowsV2), t = Object.fromEntries(LABELS.map(a => [a, Object.fromEntries(LABELS.map(b => [b, 0]))]));
  let n = 0;
  for (const r of latestByJob(rowsV1).values()) {
    const o = b2.get(r.jobId);
    if (r.unitKind !== unitKind || r.status !== 'OK' || o?.status !== 'OK') continue;
    t[r.finalLabel][o.finalLabel]++; n++;
  }
  return { table: t, n };
}
export function caseTable(rounds, rowsV1, rowsV2, cases = CASES, names = ['v1', 'v2']) {
  const b1 = latestByJob(rowsV1), b2 = latestByJob(rowsV2);
  return cases.map(([name, prefix, para, round, units]) => {
    const ds = [...new Set(rounds.filter(r => r.dialogueId.startsWith(prefix) && r.paragraphId.endsWith(`-${para}`)).map(r => r.dialogueId))];
    return { name, prefix, paragraph: para, round, dialogues: ds.map(d => ({ dialogueId: d, units: units.map(id => {
      const x = rowOf(b1, d, round, id), y = rowOf(b2, d, round, id);
      return { unitId: id, [names[0]]: cellOf(x), [names[1]]: cellOf(y) };
    }) })) };
  });
}
const pct = (o, k) => o[k] ?? 0;
export function renderCompare({ s1, s2, relT, nodeT, cases, names = ['v1', 'v2'], dirs = ['stage2', 'stage2-v2'], tracking = null }) {
  const [n1, n2] = names;
  const row = (name, a, b) => `| ${name} | ${a} | ${b} |`;
  const dist = o => LABELS.map(k => `${k} ${pct(o, k)}`).join(', ');
  const L = [`# 분석 지도 공손룡 판정 기준 ${n1} / ${n2} 비교`, '', `결과만 기록한다. 해석·평가 문장 없음. 원자료: \`${dirs[0]}/\`(${n1}), \`${dirs[1]}/\`(${n2}), \`compare-${n1}-${n2}.json\`.`, '',
    '집계 정의: 라벨은 `finalLabel`(인용 강등 반영), 미판정 제외. 라벨 상승·하락은 라운드 k≥2에서 직전 라운드 대비 ABSENT<PARTIAL<DIRECT 순서의 변화, ✕가 들어간 변화는 별도 행. 평균 인용 길이는 판정 성공 행의 모든 인용 기준.', '',
    `## 요약 (${n1} | ${n2})`, '', `| 항목 | ${n1} | ${n2} |`, '|---|---|---|',
    row('판정 수(성공)', s1.judgments, s2.judgments), row('노드 라벨 분포', dist(s1.nodeLabels), dist(s2.nodeLabels)), row('관계 라벨 분포', dist(s1.relationLabels), dist(s2.relationLabels)),
    row('원문 복사 대조군 노드 라벨 분포', dist(s1.copiedControlNodeLabels), dist(s2.copiedControlNodeLabels)),
    row('결합 패턴 수', `${s1.patternTotal} (${Object.entries(s1.patterns).map(([k, v]) => `${k} ${v}`).join(', ')})`, `${s2.patternTotal} (${Object.entries(s2.patterns).map(([k, v]) => `${k} ${v}`).join(', ')})`),
    row('인용 강등', s1.quoteDowngrade, s2.quoteDowngrade), row('무효 인용 / 전체 인용', `${s1.invalidQuotes} / ${s1.totalQuotes}`, `${s2.invalidQuotes} / ${s2.totalQuotes}`),
    row('평균 인용 길이(글자)', s1.meanQuoteChars.toFixed(1), s2.meanQuoteChars.toFixed(1)),
    row('오류 사건 수(NEW / KEPT / LATE)', `${s1.events.total} (${s1.events.NEW} / ${s1.events.KEPT} / ${s1.events.LATE})`, `${s2.events.total} (${s2.events.NEW} / ${s2.events.KEPT} / ${s2.events.LATE})`),
    row('오류 사건 끝남(RESOLVED / DROPPED)', `${s1.events.RESOLVED} / ${s1.events.DROPPED}`, `${s2.events.RESOLVED} / ${s2.events.DROPPED}`),
    row('unlocated(인용 없는 ✕ 판정)', s1.unlocated, s2.unlocated), row('라운드 k≥2 라벨 상승 / 하락', `${s1.rise} / ${s1.fall}`, `${s2.rise} / ${s2.fall}`),
    row('라운드 k≥2 ✕ 관련 변화', s1.contradictsChanges, s2.contradictsChanges), ''];
  for (const [name, t] of [['노드', nodeT], ['관계', relT]]) {
    L.push(`## 라벨 전이표: ${name} (행 ${n1}, 열 ${n2}, 양쪽 성공 ${t.n}건)`, '', `| ${n1} \\ ${n2} | ${LABELS.join(' | ')} |`, `|---|${LABELS.map(() => '---').join('|')}|`);
    for (const a of LABELS) L.push(`| ${a} | ${LABELS.map(b => t.table[a][b]).join(' | ')} |`);
    L.push('');
  }
  L.push(`## 지정 사례표 (${n1} 라벨(인용) → ${n2} 라벨(인용))`, '');
  for (const c of cases) {
    L.push(`### ${c.name}: ${c.prefix} ${c.paragraph} 라운드 ${c.round}`, '');
    if (c.dialogues.length !== 1) L.push(`대화 ${c.dialogues.length}건 찾음${c.dialogues.length ? `: ${c.dialogues.map(d => d.dialogueId).join(', ')}` : ''}`, '');
    for (const d of c.dialogues) {
      if (c.dialogues.length > 1) L.push(`대화 ${d.dialogueId}`, '');
      L.push(`| 단위 | ${n1} → ${n2} |`, '|---|---|');
      for (const u of d.units) L.push(`| ${u.unitId} | ${`${u[n1]} → ${u[n2]}`.replace(/\|/gu, '\\|')} |`);
      L.push('');
    }
  }
  if (tracking) L.push(...renderTracking(tracking, names));
  L.push('## 오류 사건 목록', '');
  for (const [name, s] of [[n1, s1], [n2, s2]]) {
    L.push(`### ${name}`, '');
    const byD = new Map();
    for (const e of [...s.errors.events, ...s.errors.ended]) { const k = `${e.dialogueId}|${e.round}`; if (!byD.has(k)) byD.set(k, []); byD.get(k).push(e); }
    if (!byD.size) L.push('없음', '');
    for (const [k, list] of byD) {
      const [d, r] = k.split('|');
      L.push(`- ${d} 라운드 ${r}`);
      for (const e of list) L.push(`  - ${e.tag} 차례 ${e.turnIndex} 「${e.segmentText.trim().replace(/\n/gu, ' ')}」 단위 ${e.units.nodes.length + e.units.relations.length}개(${[...e.units.nodes, ...e.units.relations].join(', ')}) 대표 ${e.representative ?? '-'}${e.fromRound ? ` (라운드 ${e.fromRound} 사건)` : ''}`);
    }
    if (s.errors.unlocated.length) L.push('', `unlocated: ${s.errors.unlocated.map(u => `${u.dialogueId} 라운드 ${u.round} ${u.unitId}`).join('; ')}`);
    L.push('');
  }
  return L.join('\n');
}
// 앞 버전(A)의 오류 사건마다 걸린 단위의 라벨 변화와 뒤 버전(B)에 같은 키 사건이 남았는지, 그리고 B에만 있는 사건.
export function trackEvents(sA, sB, rowsA, rowsB) {
  const bA = latestByJob(rowsA), bB = latestByJob(rowsB), same = (x, e) => x.dialogueId === e.dialogueId && x.round === e.round && x.key === e.key;
  const tracked = sA.errors.events.map(e => ({ ...e, unitChanges: [...e.units.nodes.map(id => ['node', id]), ...e.units.relations.map(id => ['relation', id])].map(([kind, id]) => {
    const a = bA.get(jobId(e.dialogueId, e.round, kind, id)), b = bB.get(jobId(e.dialogueId, e.round, kind, id));
    return { unitId: id, from: a?.status === 'OK' ? a.finalLabel : '미판정', to: cellOf(b) };
  }), survived: sB.errors.events.some(x => same(x, e)) }));
  return { tracked, newEvents: sB.errors.events.filter(e => !sA.errors.events.some(x => same(x, e))) };
}
function renderTracking({ tracked, newEvents }, [n1, n2]) {
  const flat = s => s.trim().replace(/\n/gu, ' ').replace(/\|/gu, '\\|');
  const L = [`## ${n1} 오류 사건 추적 (${n1} 사건 ${tracked.length}개, ${n2}에 같은 키로 남음 ${tracked.filter(t => t.survived).length}개)`, '', `| 대화 | 라운드 | 학생 구간 | 걸린 단위 ${n1} 라벨 → ${n2} 라벨(인용) | ${n2}에서 |`, '|---|---|---|---|---|'];
  for (const t of tracked) L.push(`| ${t.dialogueId} | ${t.round} | 차례 ${t.turnIndex} 「${flat(t.segmentText)}」 | ${t.unitChanges.map(u => `${u.unitId} ${u.from} → ${flat(u.to)}`).join('<br>')} | ${t.survived ? '남음' : '사라짐'} |`);
  L.push('', `## ${n2} 새 오류 사건 (${n2}에만 있는 사건 ${newEvents.length}개)`, '');
  if (!newEvents.length) L.push('없음');
  else { L.push('| 대화 | 라운드 | 학생 구간 | 걸린 단위 | 대표 위치 | 꼬리표 |', '|---|---|---|---|---|---|');
    for (const e of newEvents) L.push(`| ${e.dialogueId} | ${e.round} | 차례 ${e.turnIndex} 「${flat(e.segmentText)}」 | ${[...e.units.nodes, ...e.units.relations].join(', ')} | ${e.representative ?? '-'} | ${e.tag} |`); }
  L.push('');
  return L;
}
export function runCompare(a = 'v1', b = 'v2') {
  if (!VERSIONS[a] || !VERSIONS[b]) throw new Error(`COMPARE_VERSIONS: ${a} ${b}`);
  const inp = loadInputs(FIXED_ROUNDS_PATH), r1 = readJsonl(`${VERSIONS[a].dir}/judgments.jsonl`), r2 = readJsonl(`${VERSIONS[b].dir}/judgments.jsonl`), names = [a, b];
  const s1 = summarizeRun(inp.rounds, r1, inp.map), s2 = summarizeRun(inp.rounds, r2, inp.map), v3 = b === 'v3';
  const nodeT = transitionTable(r1, r2, 'node'), relT = transitionTable(r1, r2, 'relation'), cases = caseTable(inp.rounds, r1, r2, v3 ? CASES_V3 : CASES, names);
  const tracking = v3 ? trackEvents(s1, s2, r1, r2) : null;
  const dirs = names.map(n => VERSIONS[n].dir.split('/').pop());
  writeFileSync(`${EXP_DIR}/compare-${a}-${b}.json`, serialize({ [a]: s1, [b]: s2, nodeTransitions: nodeT, relationTransitions: relT, cases, ...(tracking ? { tracking } : {}) }));
  writeFileSync(`${EXP_DIR}/COMPARE-${a}-${b}.md`, renderCompare({ s1, s2, nodeT, relT, cases, names, dirs, tracking }) + '\n');
  return { [a]: { ...s1, errors: undefined }, [b]: { ...s2, errors: undefined } };
}

// ---------- main ----------
// roundsFrom: 고정 라운드 파일을 쓰면 로그를 읽지 않는다(대화는 라운드에서 복원). 없으면 기존처럼 로그에서 추출.
export function loadInputs(roundsFrom = null, opts = {}) {
  const gen = !!opts.passageId; // 일반화 실행: 공손룡 전용 해시·기대값 검사 대신 단위 수를 보고만 한다.
  const mapBytes = readFileSync(opts.mapPath ?? MAP_PATH);
  if (!gen && hash(mapBytes) !== MAP_SHA256) throw new Error('FROZEN_MAP_HASH_MISMATCH');
  const map = JSON.parse(mapBytes.toString('utf8')), { passage } = gen ? loadPassage(undefined, opts.passageId) : loadPassage();
  if (opts.paragraphs != null && passage.paragraphs.length !== opts.paragraphs) throw new Error(`PARAGRAPH_COUNT: ${passage.paragraphs.length}`);
  let dialogues, rounds, roundsSource = null;
  if (roundsFrom) {
    const bytes = readFileSync(roundsFrom);
    rounds = bytes.toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    dialogues = [...new Map(rounds.map(r => [r.dialogueId, r])).values()].map(r => ({ dialogueId: r.dialogueId, source: r.source, sessionId: r.sessionId, paragraphId: r.paragraphId,
      turns: rounds.filter(x => x.dialogueId === r.dialogueId).at(-1).dialogue, copiedSource: r.copiedSource }));
    roundsSource = { path: roundsFrom, sha256: hash(bytes), bytes };
  } else {
    dialogues = extractDialogues(readJsonl(V4_LOG), readJsonl(SH_LOG), passage);
    const v4 = dialogues.filter(d => d.source === 'v4').length;
    if (!gen && v4 !== EXPECTED.v4) throw new Error(`EXTRACTION_COUNT: v4 ${v4} != ${EXPECTED.v4}`);
    dialogues.push(...extraDialogues(passage, opts));
    rounds = dialogues.flatMap(buildRounds);
  }
  const unitCounts = Object.fromEntries(passage.paragraphs.map(p => { const u = unitsForParagraph(map, p.paragraphId); return [p.paragraphId, { nodes: u.nodes.length, relations: u.relations.length }]; }));
  if (!gen) passage.paragraphs.forEach((p, i) => {
    const u = unitCounts[p.paragraphId];
    if (u.nodes !== EXPECTED.nodes[i] || u.relations !== EXPECTED.relations[i]) throw new Error(`UNIT_COUNT: ${p.paragraphId} nodes ${u.nodes} relations ${u.relations}`);
  });
  return { map, passage, dialogues, rounds, roundsSource, unitCounts, mapSha256: hash(mapBytes), jobs: planJobs(rounds, map) };
}
// 시험 응답(source test, 학생 차례 1개) · 원문 복사(source copy, 문단마다 원문 전체가 학생 차례 1개).
export function extraDialogues(passage, { testResponsesPath = null, copyControls = false } = {}) {
  const paraText = new Map(passage.paragraphs.map(p => [p.paragraphId, p.text])), out = [];
  const mk = (dialogueId, source, sessionId, paragraphId, text) => { const turns = [{ role: 'student', text }];
    return { dialogueId, source, sessionId, paragraphId, turns, copiedSource: hasCopiedSource(turns, paraText.get(paragraphId) ?? '') }; };
  if (testResponsesPath) for (const r of JSON.parse(readFileSync(testResponsesPath, 'utf8')).responses) out.push(mk(`test:${r.id}`, 'test', r.id, r.paragraphId, r.text));
  if (copyControls) for (const p of passage.paragraphs) out.push(mk(`copy:${p.paragraphId}`, 'copy', `copy:${p.paragraphId}`, p.paragraphId, p.text));
  return out;
}
const protectedHashes = (cfg, g = {}) => Object.fromEntries([g.mapPath ?? MAP_PATH, JUDGE_PROMPT_PATH, MAP_PROMPT_PATH, ...(cfg.promptPath === JUDGE_PROMPT_PATH ? [] : [cfg.promptPath]), ...(cfg.stance ? [g.stancePath ?? STANCE_PATH] : []), ...(g.testResponsesPath ? [g.testResponsesPath] : [])].map(p => [p, hash(readFileSync(p))]));

function writeResults(inp, run, cfg, version, OUT = cfg.dir, g = null) {
  const judgmentRows = readJsonl(`${OUT}/judgments.jsonl`), combined = assemble(inp.rounds, inp.map, judgmentRows);
  writeFileSync(`${OUT}/combined.json`, serialize(combined));
  writeFileSync(`${OUT}/REPORT.md`, renderReport({ rounds: inp.rounds, dialogues: inp.dialogues, map: inp.map, judgmentRows, combined, run,
    ...(g ? { title: `분석 지도 판정 결과 (${g.passageId}, 판정 기준 ${version})` } : version === 'v1' ? {} : { title: `분석 지도 공손룡 2단계 결과 (판정 기준 ${version})` }) }) + '\n');
  if (g?.testResponsesPath) {
    const score = scoreRun({ rounds: inp.rounds, dialogues: inp.dialogues, map: inp.map, judgmentRows, testResponses: JSON.parse(readFileSync(g.testResponsesPath, 'utf8')), run });
    writeFileSync(`${OUT}/score.json`, serialize(score));
    writeFileSync(`${OUT}/SCORE.md`, renderScore(score) + '\n');
  }
}

export async function main({ dryRun = false, resume = false, reportOnly = false, transport, promptVersion = 'v1', roundsFrom = null, passageId = null, expDir = null, outName = null, paragraphs = null, testResponses = null, copyControls = false } = {}) {
  const cfg = VERSIONS[promptVersion];
  if (!cfg) throw new Error(`PROMPT_VERSION: ${promptVersion}`);
  if (expDir && !passageId) throw new Error('PASSAGE_REQUIRED: --exp-dir needs --passage');
  const g = expDir ? { passageId, mapPath: `${expDir}/frozen-map.json`, stancePath: `${expDir}/stance/stance-final.json`, paragraphs, testResponsesPath: testResponses, copyControls } : null;
  const OUT = g ? `${expDir}/${outName ?? cfg.dir.split('/').pop()}` : cfg.dir, limits = g ? GENERALIZED_LIMITS : cfg.limits;
  const inp = loadInputs(roundsFrom, g ?? {}), promptMd = readFileSync(cfg.promptPath, 'utf8'), prompts = parseJudgePrompt(promptMd), hashesBefore = protectedHashes(cfg, g ?? {});
  mkdirSync(OUT, { recursive: true });
  if (inp.roundsSource) writeFileSync(`${OUT}/rounds.jsonl`, inp.roundsSource.bytes);
  else writeFileSync(`${OUT}/rounds.jsonl`, inp.rounds.map(jsonLine).join('\n') + '\n');
  const stances = cfg.stance ? loadStanceLabels(g?.stancePath ?? STANCE_PATH) : null;
  const makeRequest = j => buildJudgeRequest(prompts[j.unitKind], buildJudgeInput(j.round, j.unitKind, j.unit, stances), cfg.schemaName);
  const stats = { dialoguesBySource: count(inp.dialogues, d => d.source), copiedSource: inp.dialogues.filter(d => d.copiedSource).length,
    rounds: inp.rounds.length, requests: inp.jobs.length,
    ...(g ? { roundsBySource: count(inp.rounds, r => r.source), requestsBySource: count(inp.jobs, j => j.round.source), unitCounts: inp.unitCounts } : {}) };
  if (dryRun) {
    const reqs = inp.jobs.map(makeRequest), bytes = reqs.reduce((s, r) => s + Buffer.byteLength(JSON.stringify(r)), 0);
    const upper = reqs.reduce((s, r) => s + reserveUsd(r), 0);
    const estimate = (bytes / 2 * RATES.input + inp.jobs.length * 800 * RATES.output) / 1e6;
    const pick = [0, Math.floor(inp.jobs.length / 2), inp.jobs.length - 1].map(i => ({ jobId: inp.jobs[i].jobId, request: reqs[i] }));
    writeFileSync(`${OUT}/dry-run.requests-sample.json`, serialize({ samples: pick, schema: JSON_SCHEMA }));
    return { dryRun: true, externalRequests: 0, ...stats, estimatedUsd: estimate, upperBoundUsd: upper, overRequestLimit: inp.jobs.length > limits.maxRequests };
  }
  const ledgerPath = `${OUT}/ledger.jsonl`, judgPath = `${OUT}/judgments.jsonl`, runPath = `${OUT}/RUN.json`;
  if (reportOnly) { writeResults(inp, existsSync(runPath) ? JSON.parse(readFileSync(runPath, 'utf8')) : null, cfg, promptVersion, OUT, g); return { reportOnly: true }; }
  if (!resume && (existsSync(ledgerPath) || existsSync(judgPath))) throw new Error('RUN_EXISTS: use --resume (no retries otherwise)');
  if (inp.jobs.length > limits.maxRequests && !resume) throw new Error(`REQUESTS_OVER_LIMIT: ${inp.jobs.length}`);
  const prior = readJsonl(ledgerPath), done = new Set([...latestByJob(readJsonl(judgPath)).values()].filter(r => r.status === 'OK').map(r => r.jobId));
  let requests = prior.filter(e => e.event === 'START').length, spent = prior.filter(e => e.event === 'END').reduce((s, e) => s + endCost(e), 0), inflight = 0, stop = null, connErrStreak = 0;
  const queue = inp.jobs.filter(j => !done.has(j.jobId));
  const priorRun = existsSync(runPath) ? JSON.parse(readFileSync(runPath, 'utf8')) : null;
  const runInfo = { version: 1, startedAtUtc: priorRun?.startedAtUtc ?? new Date().toISOString(), resumes: [...(priorRun?.resumes ?? []), ...(resume ? [new Date().toISOString()] : [])],
    model: MODEL, reasoning: { effort: 'medium' }, maxOutputTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS, concurrency: CONCURRENCY, retries: 0, rates: RATES, limits, promptVersion, promptPath: cfg.promptPath, schemaName: cfg.schemaName,
    judgePromptHash: hash(promptMd), nodeInstructionsHash: hash(prompts.node), relationInstructionsHash: hash(prompts.relation), frozenMapHash: g ? inp.mapSha256 : MAP_SHA256, ...(g ? { passageId, expDir, outDir: OUT } : {}), ...(cfg.stance ? { stanceFinalPath: g?.stancePath ?? STANCE_PATH, stanceFinalHash: hash(readFileSync(g?.stancePath ?? STANCE_PATH)) } : {}),
    scriptHash: hash(readFileSync(new URL(import.meta.url))), schemaHash: hash(JSON.stringify(JSON_SCHEMA)), plannedRequests: inp.jobs.length, ...(inp.roundsSource ? { roundsSource: { path: inp.roundsSource.path, sha256: inp.roundsSource.sha256 } } : {}), protectedHashesBefore: hashesBefore };
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
      stop = limitCheck({ requests, spentUsd: spent, reserved: reserved + inflight }, limits);
      if (stop) { ledger({ event: 'STOP', reason: stop, atUtc: new Date().toISOString() }); break; }
      requests++; inflight += reserved;
      try { await runOne(job); } finally { inflight -= reserved; }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const run = { ...runInfo, finishedAtUtc: new Date().toISOString(), requests, totalCostUsd: spent, stop, protectedHashesAfter: protectedHashes(cfg, g ?? {}) };
  run.protectedUnchanged = jsonLine(run.protectedHashesAfter) === jsonLine(hashesBefore);
  writeFileSync(runPath, serialize(run));
  writeResults(inp, run, cfg, promptVersion, OUT, g);
  const rows = [...latestByJob(readJsonl(judgPath)).values()];
  return { ...stats, requests, totalCostUsd: spent, stop, failures: rows.filter(r => r.status !== 'OK').length, missing: inp.jobs.length - rows.filter(r => r.status === 'OK').length, protectedUnchanged: run.protectedUnchanged };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const a = process.argv;
  const pi = a.indexOf('--prompt');
  if (a.includes('--compare')) { const ci = a.indexOf('--compare'); console.log(JSON.stringify(a[ci + 1] && !a[ci + 1].startsWith('--') ? runCompare(a[ci + 1], a[ci + 2]) : runCompare(), null, 2)); }
  else {
    const opt = n => a.includes(n) ? a[a.indexOf(n) + 1] : null;
    console.log(JSON.stringify(await main({ dryRun: a.includes('--dry-run'), resume: a.includes('--resume'), reportOnly: a.includes('--report-only'), promptVersion: pi >= 0 ? a[pi + 1] : 'v1', roundsFrom: opt('--rounds-from'),
      passageId: opt('--passage'), expDir: opt('--exp-dir'), outName: opt('--out'), paragraphs: opt('--paragraphs') == null ? null : Number(opt('--paragraphs')), testResponses: opt('--test-responses'), copyControls: a.includes('--copy-controls') }), null, 2));
  }
}
