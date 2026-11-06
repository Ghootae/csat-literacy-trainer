// 문단 판정 v3(D-0143·D-0146·D-0205 2). scripts/run-analysis-judge-gongsun.mjs의 단위 계산·요청 본문·인용 확인·묶기를 옮긴 것이다.
// 지시문·스키마는 바꾸지 않는다. 요청 본문은 스크립트와 깊은 비교로 같아야 한다(judge.test.ts).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod/v4';
import type { FeedbackTransport } from '../problem-solving/feedback-evaluator.js';

export const ANALYSIS_JUDGE_MODEL = 'gpt-6-luna';
export const ANALYSIS_JUDGE_MAX_OUTPUT_TOKENS = 2000;
export const ANALYSIS_JUDGE_TIMEOUT_MS = 60000;
export const ANALYSIS_JUDGE_SCHEMA_NAME = 'analysis_judgment_v3';
export const ANALYSIS_JUDGE_PROMPT_PATH = 'docs/experiments/analysis-map-gongsun-2026-10-16/JUDGE-PROMPT-v3.md';

export const JudgmentSchema = z.strictObject({ label: z.enum(['DIRECT', 'PARTIAL', 'ABSENT', 'CONTRADICTS']), quotes: z.array(z.string()), reason: z.string() });
export type Judgment = z.infer<typeof JudgmentSchema>;
export const ANALYSIS_JUDGE_JSON_SCHEMA = z.toJSONSchema(JudgmentSchema);
export const sha256 = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');

export interface MapProposition { id: string; paragraphId: string; text: string; sourceQuote: string; childIds?: undefined; kind?: string }
export interface MapNode { id: string; kind: string; paragraphId: string; text: string; childIds: string[] }
export interface MapRelation { id: string; fromId: string; toId: string; name?: string; note: string }
export interface AnalysisMap { propositions: MapProposition[]; nodes: MapNode[]; relations: MapRelation[] }
type MapItem = (MapProposition | MapNode) & { sourceQuote?: string };
export interface JudgeEnd { id: string; text: string; sourceQuotes: string[] }
export interface JudgeNodeUnit extends JudgeEnd { kind: string; childIds: string[] }
export interface JudgeRelationUnit { id: string; fromId: string; toId: string; from: JudgeEnd; to: JudgeEnd; note: string }
export interface DialogueTurn { role: string; text: string }
export interface JudgeRound { dialogue: DialogueTurn[] }

const paraNum = (paragraphId: string) => Number(/-p(\d+)$/u.exec(paragraphId)?.[1]);
const idOrder = (id: string): [number, number] => { const m = /^[A-Z]+(\d+)(?:-(\d+))?$/u.exec(id)!; return [Number(m[1]), Number(m[2] ?? 0)]; };
const cmpId = (a: string, b: string) => { const [a1, a2] = idOrder(a); const [b1, b2] = idOrder(b); return a1 - b1 || a2 - b2; };
const ws = (s: string) => s.replace(/\s+/gu, ' ').trim();
const serialize = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

export function indexMap(map: AnalysisMap) {
  const byId = new Map<string, MapItem>([...map.propositions, ...map.nodes].map(x => [x.id, x as MapItem]));
  const quotesOf = (id: string): string[] => {
    const x = byId.get(id)!;
    if (!x.childIds) return [x.sourceQuote!];
    const props = new Set<string>(); const st = [id];
    while (st.length) {
      const n = byId.get(st.pop()!)!;
      for (const c of n.childIds ?? []) { if (byId.get(c)!.childIds) st.push(c); else props.add(c); }
    }
    return [...new Set([...props].sort(cmpId).map(p => byId.get(p)!.sourceQuote!))];
  };
  return { byId, quotesOf };
}
const isJudgeable = (id: string) => /^[PCG]\d/u.test(id);

export function unitsForParagraph(map: AnalysisMap, paragraphId: string): { nodes: JudgeNodeUnit[]; relations: JudgeRelationUnit[] } {
  const { byId, quotesOf } = indexMap(map);
  const end = (id: string): JudgeEnd => ({ id, text: byId.get(id)!.text, sourceQuotes: quotesOf(id) });
  const nodes = [...map.propositions.filter(p => p.paragraphId === paragraphId),
    ...map.nodes.filter(n => (n.kind === 'COMPOSITE' || n.kind === 'PARAGRAPH_GIST') && n.paragraphId === paragraphId)]
    .map((x): JudgeNodeUnit => ({ ...end(x.id), kind: x.childIds ? x.kind : 'PROPOSITION', childIds: x.childIds ?? [] }));
  const relations = map.relations.filter(r => isJudgeable(r.fromId) && isJudgeable(r.toId))
    .filter(r => Math.max(paraNum(byId.get(r.fromId)!.paragraphId), paraNum(byId.get(r.toId)!.paragraphId)) === paraNum(paragraphId))
    .map((r): JudgeRelationUnit => ({ id: r.id, fromId: r.fromId, toId: r.toId, from: end(r.fromId), to: end(r.toId), note: r.note }));
  return { nodes, relations };
}

export function parseJudgePrompt(md: string): { node: string; relation: string } {
  const section = (title: string) => {
    const m = new RegExp(`^## ${title}[ \\t]*$`, 'mu').exec(md);
    if (!m) throw new Error(`PROMPT_STRUCTURE: ${title}`);
    const rest = md.slice(m.index + m[0].length); const next = /^## /mu.exec(rest);
    return (next ? rest.slice(0, next.index) : rest).trim();
  };
  return { node: section('노드 판정 지시문'), relation: section('관계 판정 지시문') };
}
export function loadJudgePrompts(root = process.cwd()): { node: string; relation: string; sha256: string } {
  const md = readFileSync(resolve(root, ANALYSIS_JUDGE_PROMPT_PATH), 'utf8');
  return { ...parseJudgePrompt(md), sha256: sha256(md) };
}

interface Stance { id?: string; kind: string; holder?: string | null; parts?: Stance[] & { count?: number }[] }
export function stanceLabel(stance: any): string {
  if (stance.kind === 'AUTHOR') return '필자 서술';
  if (stance.kind === 'COMMON') return '상식·통념';
  if (stance.kind === 'FIGURE') return `${stance.holder}의 주장`;
  if (stance.kind === 'MIXED') {
    return `혼합(${(stance.parts as any[]).map((p, i) => ({ p, i })).sort((a, b) => b.p.count - a.p.count || a.i - b.i).map(({ p }) => `${stanceLabel(p)} ${p.count}`).join(', ')})`;
  }
  throw new Error(`STANCE_KIND: ${stance.kind}`);
}
/**
 * 합성 노드(C·G·X·TOP)의 입장: 잎 명제 입장의 개수로 정한다(run-analysis-stance-gongsun.mjs deriveNodeStances).
 * 확정본(stance-final.json)에 nodeStances가 들어 있으면 그것을 쓰고(공손룡·경마식 보도), 없으면(세트 E 지도) 확정 명제 입장에서 다시 만든다.
 */
export function deriveNodeStances(map: AnalysisMap, stances: Stance[]): Record<string, Stance> {
  const sBy = new Map(stances.map(s => [s.id!, s])); const nodeBy = new Map(map.nodes.map(n => [n.id, n]));
  const leaves = (id: string): string[] => { const n = nodeBy.get(id); return n ? n.childIds.flatMap(leaves) : [id]; };
  const out: Record<string, Stance> = {};
  for (const n of map.nodes) {
    const counts = new Map<string, { kind: string; holder: string | null; count: number }>();
    for (const pid of leaves(n.id)) {
      const s = sBy.get(pid); if (!s) continue;
      const k = `${s.kind}\u0000${s.holder ?? ''}`; const e = counts.get(k) ?? { kind: s.kind, holder: s.holder ?? null, count: 0 };
      e.count++; counts.set(k, e);
    }
    const parts = [...counts.values()];
    out[n.id] = parts.length === 1 ? { kind: parts[0]!.kind, holder: parts[0]!.holder } : { kind: 'MIXED', holder: null, parts } as unknown as Stance;
  }
  return out;
}
export function loadStanceLabels(path: string, map?: AnalysisMap): Map<string, string> {
  const f = JSON.parse(readFileSync(path, 'utf8')) as { stances: Stance[]; nodeStances?: Record<string, Stance> };
  const m = new Map<string, string>();
  for (const s of f.stances) m.set(s.id!, stanceLabel(s));
  const nodeStances = f.nodeStances ?? (map ? deriveNodeStances(map, f.stances) : undefined);
  if (!nodeStances) throw new Error('STANCE_NODE_STANCES: 확정본에 nodeStances가 없고 지도도 주어지지 않았습니다.');
  for (const [id, s] of Object.entries(nodeStances)) m.set(id, stanceLabel(s));
  return m;
}

export type JudgeUnitKind = 'node' | 'relation';
export function buildJudgeInput(round: JudgeRound, unitKind: JudgeUnitKind, unit: any, stances: Map<string, string> | null = null) {
  const dialogue = round.dialogue.map(t => ({ role: t.role, text: t.text }));
  const st = (id: string) => { if (!stances!.has(id)) throw new Error(`STANCE_MISSING: ${id}`); return { stance: stances!.get(id) }; };
  if (unitKind === 'node') return { dialogue, target: { text: unit.text, sourceQuotes: unit.sourceQuotes, ...(stances ? st(unit.id) : {}) } };
  return { dialogue, relation: { from: { text: unit.from.text, sourceQuotes: unit.from.sourceQuotes, ...(stances ? st(unit.fromId) : {}) }, to: { text: unit.to.text, sourceQuotes: unit.to.sourceQuotes, ...(stances ? st(unit.toId) : {}) }, note: unit.note } };
}
export function buildJudgeRequest(instructions: string, input: unknown, schemaName: string = ANALYSIS_JUDGE_SCHEMA_NAME) {
  return { model: ANALYSIS_JUDGE_MODEL, instructions, reasoning: { effort: 'medium' }, max_output_tokens: ANALYSIS_JUDGE_MAX_OUTPUT_TOKENS,
    input: [{ role: 'user', content: [{ type: 'input_text', text: serialize(input) }] }],
    text: { format: { type: 'json_schema', name: schemaName, strict: true, schema: ANALYSIS_JUDGE_JSON_SCHEMA } } };
}

export function checkQuotes(round: JudgeRound, judgment: Judgment) {
  const students = round.dialogue.filter(t => t.role === 'student').map(t => t.text);
  const tutors = round.dialogue.filter(t => t.role === 'tutor').map(t => t.text);
  const quoteChecks = judgment.quotes.map(q => {
    const valid = q.length > 0 && students.some(s => s.includes(q));
    return { quote: q, valid, wsNormalizedMatch: !valid && q.length > 0 && students.some(s => ws(s).includes(ws(q))), inTutorOnly: !valid && q.length > 0 && tutors.some(t => t.includes(q)) };
  });
  const validCount = quoteChecks.filter(c => c.valid).length;
  const label = judgment.label;
  const quoteDowngrade = label === 'DIRECT' && validCount === 0;
  return { quoteChecks, validCount, finalLabel: quoteDowngrade ? 'PARTIAL' as const : label, quoteDowngrade,
    noValidQuote: (label === 'PARTIAL' || label === 'CONTRADICTS') && validCount === 0, tutorQuote: quoteChecks.some(c => c.inTutorOnly) };
}

export interface UnitJudgment { finalLabel: string | null }
/** judgments: 한 라운드의 단위 id → { finalLabel }. 노드별 패턴·관계별 패턴·모순 목록을 돌려준다. */
export function combineRound(map: AnalysisMap, paragraphId: string, judgments: Record<string, UnitJudgment | undefined>) {
  const { nodes, relations } = unitsForParagraph(map, paragraphId);
  const { byId } = indexMap(map);
  const lab = (id: string) => judgments[id]?.finalLabel ?? null;
  const caught = (l: string | null) => l === 'DIRECT' || l === 'PARTIAL';
  const nodeResults: Record<string, unknown> = {}; const relResults: Record<string, unknown> = {}; const contradictions: string[] = [];
  for (const n of nodes) {
    const label = lab(n.id);
    if (label === 'CONTRADICTS') contradictions.push(n.id);
    if (n.kind === 'PROPOSITION') { nodeResults[n.id] = { label, pattern: null }; continue; }
    const kids = n.childIds; const kidLabels = kids.map(lab); const k = kidLabels.filter(caught).length;
    let pattern: string | null = null;
    if (label === null || kidLabels.some(l => l === null)) pattern = 'INCOMPLETE';
    else if (label === 'DIRECT') pattern = k >= 1 ? 'SUBSUMED' : 'MISMATCH_TOP_ONLY';
    else if (label === 'ABSENT' && k >= 2) pattern = 'LISTING';
    nodeResults[n.id] = { label, pattern, children: kids.length, caught: k };
  }
  for (const r of relations) {
    const label = lab(r.id);
    if (label === 'CONTRADICTS') contradictions.push(r.id);
    const crossEndUnchecked = [r.fromId, r.toId].filter(id => byId.get(id)!.paragraphId !== paragraphId);
    const own = [r.fromId, r.toId].filter(id => !crossEndUnchecked.includes(id));
    const pattern = caught(label) && own.some(id => lab(id) === 'ABSENT') ? 'MISMATCH_RELATION' : null;
    relResults[r.id] = { label, pattern, crossEndUnchecked };
  }
  return { paragraphId, nodes: nodeResults, relations: relResults, contradictions };
}

export interface JudgeUnitCallResult {
  judgment: Judgment;
  checked: ReturnType<typeof checkQuotes>;
  metadata: { model: string; durationMs: number; inputTokens: number; outputTokens: number; rawText: string };
}
/** 단위(노드·관계) 하나를 판정한다. 호출은 주입한 transport로만 한다. */
export async function judgeUnit(transport: FeedbackTransport, instructions: { node: string; relation: string }, round: JudgeRound,
  unitKind: JudgeUnitKind, unit: unknown, stances: Map<string, string>): Promise<JudgeUnitCallResult> {
  const request = buildJudgeRequest(instructions[unitKind], buildJudgeInput(round, unitKind, unit, stances));
  const started = performance.now();
  const response = await transport.create(request as never, { timeout: ANALYSIS_JUDGE_TIMEOUT_MS, maxRetries: 0 });
  if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
  const judgment = JudgmentSchema.parse(JSON.parse(response.output_text));
  return { judgment, checked: checkQuotes(round, judgment), metadata: { model: ANALYSIS_JUDGE_MODEL, durationMs: Math.round(performance.now() - started),
    inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0, rawText: response.output_text } };
}
