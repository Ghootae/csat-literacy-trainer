// 문단 분석 화면(D-0183)의 순수 계산. 판정·집계는 scripts/build-analysis-view.mjs가 끝내 두므로 여기서는 보여 줄 모양만 만든다.

export type Brightness = 'BRIGHT' | 'HALF' | 'DIM';
export interface MapProposition { readonly id: string; readonly paragraphId: string; readonly text: string }
export interface MapNode { readonly id: string; readonly kind: 'COMPOSITE' | 'PARAGRAPH_GIST' | 'CROSS' | 'TOP'; readonly paragraphId: string | null; readonly text: string; readonly childIds: readonly string[] }
export interface MapRelation { readonly id: string; readonly fromId: string; readonly toId: string; readonly name: string; readonly note: string }
export interface TreeCell { readonly brightness: Brightness; readonly computed: boolean; readonly label?: string }
export interface GraphCell { readonly D: number; readonly P: number; readonly A: number; readonly C: number; readonly Cinherited: number; readonly smallSample: boolean; readonly capture: number | null; readonly errorRate: number | null }
export interface TrendPoint { readonly passageId: string; readonly capture: number | null; readonly errorRate: number | null; readonly relationN: number }
export interface WrongRelation { readonly relId: string; readonly paragraphId: string; readonly dialogueId: string; readonly studentText: string; readonly fixedAfterDialogue: boolean }
export interface SessionView {
  readonly sessionId: string; readonly source: string;
  readonly judgedParagraphs: number; readonly totalParagraphs: number; readonly complete: boolean;
  readonly tree: Readonly<Record<string, TreeCell>>;
  readonly graph: {
    readonly branches: Readonly<Record<string, GraphCell>>; readonly types: Readonly<Record<string, GraphCell>>;
    readonly trendPoint: TrendPoint; readonly wrongRelations: readonly WrongRelation[];
  };
}
export interface PassageView {
  readonly passageId: string; readonly title?: string;
  readonly map: { readonly propositions: readonly MapProposition[]; readonly nodes: readonly MapNode[]; readonly relations: readonly MapRelation[] };
  readonly relationTypes: Readonly<Record<string, { readonly type: string; readonly typeKo: string; readonly branch: string }>>;
  readonly paragraphIds: readonly string[];
  readonly sessions: readonly SessionView[];
}
export interface AnalysisViewData { readonly generatedFrom: readonly { readonly path: string; readonly sha256: string }[]; readonly passages: readonly PassageView[] }

/** 판정 없는 지문(구조만)이나 세션을 아직 안 고른 상태의 수형도: 전부 흐리게, CROSS·TOP은 계산값. */
export function dimTree(map: PassageView['map']): Record<string, TreeCell> {
  const tree: Record<string, TreeCell> = {};
  for (const u of [...map.propositions, ...map.nodes, ...map.relations]) {
    tree[u.id] = { brightness: 'DIM', computed: 'kind' in u && (u.kind === 'CROSS' || u.kind === 'TOP') };
  }
  return tree;
}

/** 처음 펼쳐 둘 노드: TOP과 CROSS(그 아래 문단 요지까지 보인다). */
export function defaultExpanded(map: PassageView['map']): Set<string> {
  return new Set(map.nodes.filter(n => n.kind === 'TOP' || n.kind === 'CROSS').map(n => n.id));
}

export interface TreeRow { readonly key: string; readonly id: string; readonly depth: number; readonly kind: string; readonly text: string; readonly childCount: number; readonly open: boolean }

/** TOP에서 시작해 펼친 노드의 자식만 이어 붙인 줄 목록. key는 경로라 같은 노드가 두 번 나와도 구별된다. */
export function visibleRows(map: PassageView['map'], expanded: ReadonlySet<string>): TreeRow[] {
  const byId = new Map<string, MapNode | MapProposition>([...map.propositions, ...map.nodes].map(u => [u.id, u]));
  const rows: TreeRow[] = [];
  const walk = (id: string, depth: number, path: string): void => {
    const u = byId.get(id);
    if (u === undefined) return;
    const children = 'childIds' in u ? u.childIds : [];
    const open = children.length > 0 && expanded.has(id);
    rows.push({ key: path, id, depth, kind: 'kind' in u ? u.kind : 'PROPOSITION', text: u.text, childCount: children.length, open });
    if (open) for (const c of children) walk(c, depth + 1, `${path}/${c}`);
  };
  const top = map.nodes.find(n => n.kind === 'TOP');
  if (top !== undefined) walk(top.id, 0, top.id);
  return rows;
}

/** 노드 하나에 걸린 문단 안 관계. 아래 단위 중 하나라도 양 끝에 있고, 양 끝이 같은 문단인 관계. CROSS·TOP은 없음. */
export function relationsOfNode(map: PassageView['map'], nodeId: string): MapRelation[] {
  const byId = new Map<string, MapNode | MapProposition>([...map.propositions, ...map.nodes].map(u => [u.id, u]));
  const self = byId.get(nodeId);
  if (self === undefined || ('kind' in self && (self.kind === 'CROSS' || self.kind === 'TOP'))) return [];
  const under = new Set<string>();
  const collect = (id: string): void => {
    if (under.has(id)) return;
    under.add(id);
    const u = byId.get(id);
    if (u !== undefined && 'childIds' in u) u.childIds.forEach(collect);
  };
  collect(nodeId);
  const paragraphOf = (id: string): string | null => byId.get(id)?.paragraphId ?? null;
  return map.relations.filter(r => (under.has(r.fromId) || under.has(r.toId)) && paragraphOf(r.fromId) === paragraphOf(r.toId));
}

export const unitText = (map: PassageView['map'], id: string): string =>
  [...map.propositions, ...map.nodes].find(u => u.id === id)?.text ?? id;

/** 막대 폭 기준: 보이는 막대 중 가장 큰 (잡은+틀린) 개수. 0이면 1로 둔다. */
export function barScale(cells: readonly GraphCell[]): number {
  return Math.max(1, ...cells.map(c => c.D + c.P + c.C));
}

/** 기타 갈래는 값이 있을 때만 보인다. */
export function visibleBranches(branches: Readonly<Record<string, GraphCell>>): string[] {
  return Object.keys(branches).filter(b => b !== '기타' || (branches[b] !== undefined && branches[b].D + branches[b].P + branches[b].A + branches[b].C > 0));
}

/** 추이: 같은 세션 id의 점을 지문 순서대로 모은다. */
export function trendPoints(passages: readonly PassageView[], sessionId: string): TrendPoint[] {
  return passages.flatMap(p => p.sessions.filter(s => s.sessionId === sessionId).map(s => s.graph.trendPoint));
}

export const sessionLabel = (s: SessionView): string =>
  `${s.sessionId.slice(0, 8)} · ${s.source} · ${s.judgedParagraphs}/${s.totalParagraphs}${s.complete ? ' · 완료' : ''}`;
