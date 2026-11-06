/**
 * 결과 화면 ③ 독해 패턴의 서버 계산(인계 B (2)·(2b)·(2c)·(5)). 순수 함수만 둔다.
 * 규칙은 D-0160과 `scripts/aggregate-student-fingerprint.mjs`를 따른다(스크립트 `aggregate`와 같은 칸 값이 나오는지 reading.test.ts가 대조한다).
 */
import { combineRound, unitsForParagraph, type AnalysisMap } from '@csat/pipeline';

export const LAYERS = ['요지', '합성', '명제'] as const;
export const BRANCHES = ['내용', '논증', '관점', '흐름'] as const;
export type Layer = typeof LAYERS[number];
export type Branch = typeof BRANCHES[number];

/** `scripts/run-relation-classify.mjs`의 BRANCHES 상수와 같다(테스트가 대조). 기타는 화면에 내지 않는다. */
export const BRANCH_TYPES: Readonly<Record<Branch | '기타', readonly string[]>> = {
  내용: ['CAUSE', 'PROCESS', 'CONDITION', 'MEANS_END', 'CONTRAST', 'PARALLEL', 'CLASSIFICATION'],
  논증: ['GROUNDS', 'ELABORATION', 'APPLICATION', 'DEFINITION', 'CONCESSION', 'PROBLEM_RESPONSE'],
  관점: ['VIEW_DIFFERENCE', 'VIEW_AGREEMENT', 'CRITIQUE', 'INTERPRETATION'],
  흐름: ['BACKGROUND', 'DEVELOPMENT'],
  기타: ['OTHER'],
};
const BRANCH_OF: Readonly<Record<string, Branch | '기타'>> = Object.fromEntries(
  Object.entries(BRANCH_TYPES).flatMap(([branch, types]) => types.map(type => [type, branch as Branch | '기타'])));
const LAYER_OF_KIND: Readonly<Record<string, Layer>> = { COMPOSITE: '합성', PARAGRAPH_GIST: '요지' };

export interface ReadingCounts {
  layers: Record<Layer, { caught: number; total: number }>;
  branches: Record<Branch, { caught: number; total: number; wrong: number }>;
}
export function emptyCounts(): ReadingCounts {
  return {
    layers: Object.fromEntries(LAYERS.map(layer => [layer, { caught: 0, total: 0 }])) as ReadingCounts['layers'],
    branches: Object.fromEntries(BRANCHES.map(branch => [branch, { caught: 0, total: 0, wrong: 0 }])) as ReadingCounts['branches'],
  };
}
export function addCounts(a: ReadingCounts, b: ReadingCounts): ReadingCounts {
  const sum = emptyCounts();
  for (const layer of LAYERS) sum.layers[layer] = { caught: a.layers[layer].caught + b.layers[layer].caught, total: a.layers[layer].total + b.layers[layer].total };
  for (const branch of BRANCHES) {
    sum.branches[branch] = { caught: a.branches[branch].caught + b.branches[branch].caught, total: a.branches[branch].total + b.branches[branch].total,
      wrong: a.branches[branch].wrong + b.branches[branch].wrong };
  }
  return sum;
}

const isCaught = (label: string | null) => label === 'DIRECT' || label === 'PARTIAL';

/**
 * 문단 하나의 첫 차례 판정을 센다. judgments: 단위 id → { finalLabel }(판정이 없거나 실패면 null).
 * 판정 없음은 분모에서 뺀다. 문단을 넘는 관계는 세지 않고, 끝 노드의 CONTRADICTS를 물려받은 관계의 CONTRADICTS는 total과 wrong 모두에서 뺀다.
 * typeOf: 관계 id → 유형(classify.json). 세지는 관계의 id가 없으면 던진다.
 */
export function countParagraph(map: AnalysisMap, paragraphId: string, judgments: Record<string, { finalLabel: string | null } | undefined>, typeOf: ReadonlyMap<string, string>): ReadingCounts {
  const combined = combineRound(map, paragraphId, judgments);
  const nodes = combined.nodes as Record<string, { label: string | null }>;
  const relations = combined.relations as Record<string, { label: string | null; crossEndUnchecked: string[] }>;
  const counts = emptyCounts();
  const propositions = new Set(map.propositions.map(p => p.id));
  const kindOf = new Map(map.nodes.map(n => [n.id, n.kind]));
  for (const [id, node] of Object.entries(nodes)) {
    if (node.label === null) continue;
    const layer: Layer | undefined = propositions.has(id) ? '명제' : LAYER_OF_KIND[kindOf.get(id) ?? ''];
    if (!layer) throw new Error(`지도에 층이 없는 노드: ${id}`);
    counts.layers[layer].total++;
    if (isCaught(node.label)) counts.layers[layer].caught++;
  }
  const relationById = new Map(map.relations.map(r => [r.id, r]));
  for (const [id, relation] of Object.entries(relations)) {
    if (relation.crossEndUnchecked.length > 0) continue;
    const type = typeOf.get(id);
    if (!type) throw new Error(`classify에 관계 id 없음: ${id}`);
    if (relation.label === null) continue;
    const source = relationById.get(id)!;
    const inherited = relation.label === 'CONTRADICTS' && [source.fromId, source.toId].some(end => nodes[end]?.label === 'CONTRADICTS');
    const branch = BRANCH_OF[type];
    if (inherited || !branch || branch === '기타') continue;
    const cell = counts.branches[branch];
    cell.total++;
    if (isCaught(relation.label)) cell.caught++;
    if (relation.label === 'CONTRADICTS') cell.wrong++;
  }
  return counts;
}

// ---------- 요약과 틀린 문항 연결(2b) ----------

export interface JudgedUnitInfo { ownerParagraphId: string; endParagraphIds: string[] }
/** 문단 판정이 실제로 판정하는 단위(명제·합성·요지 노드, 판정한 관계) → 판정을 맡은 문단과 쓰인 문단들. TOP·CROSS와 판정하지 않는 관계는 없다. */
export function judgedUnitIndex(map: AnalysisMap): Map<string, JudgedUnitInfo> {
  const paragraphOf = new Map([...map.propositions, ...map.nodes].map(x => [x.id, x.paragraphId]));
  const index = new Map<string, JudgedUnitInfo>();
  for (const paragraphId of new Set(map.propositions.map(p => p.paragraphId))) {
    const units = unitsForParagraph(map, paragraphId);
    for (const node of units.nodes) index.set(node.id, { ownerParagraphId: paragraphId, endParagraphIds: [paragraphId] });
    for (const relation of units.relations) {
      index.set(relation.id, { ownerParagraphId: paragraphId, endParagraphIds: [...new Set([paragraphOf.get(relation.fromId)!, paragraphOf.get(relation.toId)!])] });
    }
  }
  return index;
}

/** 선지 연결 id를 (지도 번호, 지도 안 id)로 바꾼다. 지도가 둘이면 id 앞의 `가.`/`나.`로 고른다. */
export function resolveTargetId(id: string, mapDirectories: readonly string[]): { mapIndex: number; localId: string } | null {
  const prefixed = /^(가|나)\.(.+)$/u.exec(id);
  if (mapDirectories.length === 1) return { mapIndex: 0, localId: prefixed ? prefixed[2]! : id };
  if (!prefixed) return null;
  const suffix = prefixed[1] === '가' ? '-ga' : '-na';
  const mapIndex = mapDirectories.findIndex(directory => directory.endsWith(suffix));
  return mapIndex < 0 ? null : { mapIndex, localId: prefixed[2]! };
}

export type SummaryLink = { status: 'pending' | 'ready' | 'failed'; kind: 'MISREAD' | 'MISSED' | 'CAUGHT'; paragraphs: number[]; paragraphLabel: string };

/**
 * 학생이 읽을 문단 표시. 지문 안 문단 번호(position)는 (가)(나) 지문에서 이어지므로(예: (나) 3문단 = 7), 문단 id의 `-ga-pN`/`-na-pN`으로
 * 구역과 구역 안 번호를 되살린다. 예: "2·3문단", "(나) 3문단", "(가) 4문단, (나) 1문단".
 */
export function paragraphLabel(paragraphIds: readonly string[], positionOf: (paragraphId: string) => number | null): string {
  const parts = [...new Set(paragraphIds)]
    .map(id => ({ id, position: positionOf(id) }))
    .filter((x): x is { id: string; position: number } => x.position !== null)
    .sort((a, b) => a.position - b.position)
    .map(({ id, position }) => {
      const m = /-(ga|na)-p(\d+)$/u.exec(id);
      return m ? { section: m[1] === 'ga' ? '(가) ' : '(나) ', number: Number(m[2]) } : { section: '', number: position };
    });
  const groups: { section: string; numbers: number[] }[] = [];
  for (const part of parts) {
    const last = groups.at(-1);
    if (last && last.section === part.section) last.numbers.push(part.number);
    else groups.push({ section: part.section, numbers: [part.number] });
  }
  return groups.map(g => `${g.section}${g.numbers.join('·')}문단`).join(', ');
}
export interface SummaryLinkInput {
  /** 선지 연결 동결본의 지도 단위 id */
  targetIds: readonly string[];
  mapDirectories: readonly string[];
  unitIndexes: readonly ReadonlyMap<string, JudgedUnitInfo>[];
  /** 문단 id → 그 문단의 첫 요약 판정(없으면 그 문단을 요약하지 않음) */
  analysisOf: (paragraphId: string) => { judgments: Record<string, unknown> } | undefined;
  /** 문단 id → 지문 안 문단 번호 */
  positionOf: (paragraphId: string) => number | null;
}
/** 첫 요약 판정이 있는 단위만 쓴다. 남는 단위가 없으면 null. 아직 판정 중이면 pending, 실패가 있으면 failed(status만 있고 kind는 채우지 않는다). */
export function summaryLink(input: SummaryLinkInput): SummaryLink | null {
  const labels: string[] = []; const paragraphs = new Set<number>(); const paragraphIds: string[] = []; let pending = false; let failed = false; let used = 0;
  for (const id of input.targetIds) {
    const resolved = resolveTargetId(id, input.mapDirectories);
    const info = resolved ? input.unitIndexes[resolved.mapIndex]?.get(resolved.localId) : undefined;
    if (!resolved || !info) continue;
    const analysis = input.analysisOf(info.ownerParagraphId);
    if (!analysis) continue;
    used++;
    for (const paragraphId of info.endParagraphIds) { const position = input.positionOf(paragraphId); if (position !== null) { paragraphs.add(position); paragraphIds.push(paragraphId); } }
    const judgment = analysis.judgments[resolved.localId] as { status?: string; finalLabel?: string } | undefined;
    if (judgment === undefined) pending = true;
    else if (judgment.status !== 'OK' || typeof judgment.finalLabel !== 'string') failed = true;
    else labels.push(judgment.finalLabel);
  }
  if (used === 0) return null;
  const sorted = [...paragraphs].sort((a, b) => a - b);
  const kind = labels.includes('CONTRADICTS') ? 'MISREAD' : labels.includes('ABSENT') ? 'MISSED' : 'CAUGHT';
  return { status: pending ? 'pending' : failed ? 'failed' : 'ready', kind, paragraphs: sorted, paragraphLabel: paragraphLabel(paragraphIds, input.positionOf) };
}

// ---------- 원문 복사 정도(2c) ----------

export interface CopyOverlap { n: 5; windows: number; matched: number; ratio: number }
/** 학생 발화에서 공백을 지운 연속 5글자 묶음 중 문단 원문(공백 제거)에 그대로 있는 묶음의 비율. 5글자보다 짧으면 null. */
export function copyOverlap(studentText: string, paragraphText: string): CopyOverlap | null {
  const student = Array.from(studentText.replace(/\s+/gu, ''));
  const source = paragraphText.replace(/\s+/gu, '');
  const n = 5;
  if (student.length < n) return null;
  const windows = student.length - n + 1;
  let matched = 0;
  for (let i = 0; i < windows; i++) if (source.includes(student.slice(i, i + n).join(''))) matched++;
  return { n, windows, matched, ratio: Math.round(matched / windows * 1000) / 1000 };
}

// ---------- 추천(J5) ----------

/** 확정본 1절 비틂 14종의 표 순서. 같은 횟수면 앞의 것을 고른다(OTHER는 뺀다). */
export const TWIST_ORDER = ['NEGATION', 'DIRECTION', 'SUBSTITUTION', 'CONFLATION', 'CAUSE_SWAP', 'WRONG_REASON', 'CONDITION_SHIFT', 'HOLDER_SWAP',
  'PAIR_SWAP', 'ABSOLUTIZE', 'SCOPE_EXTEND', 'DEGREE', 'ADDED_CONTENT', 'ADDED_METHOD'] as const;
/** 함정 집계에서 OTHER를 뺀 가장 많은 비틂 하나. 없으면 null. */
export function pickTwist(counts: Record<string, number>): string | null {
  let best: string | null = null;
  for (const type of TWIST_ORDER) if ((counts[type] ?? 0) > (best === null ? 0 : counts[best] ?? 0)) best = type;
  return best;
}
