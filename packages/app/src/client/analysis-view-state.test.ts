import { describe, expect, it } from 'vitest';
import {
  barScale, defaultExpanded, dimTree, relationsOfNode, trendPoints, visibleBranches, visibleRows,
  type GraphCell, type PassageView,
} from './analysis-view-state.js';

const map: PassageView['map'] = {
  propositions: [
    { id: 'P1-1', paragraphId: 'p1', text: 'a' }, { id: 'P1-2', paragraphId: 'p1', text: 'b' }, { id: 'P2-1', paragraphId: 'p2', text: 'c' },
  ],
  nodes: [
    { id: 'C1-1', kind: 'COMPOSITE', paragraphId: 'p1', text: 'ab', childIds: ['P1-1', 'P1-2'] },
    { id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: 'p1', text: 'g1', childIds: ['C1-1'] },
    { id: 'G2', kind: 'PARAGRAPH_GIST', paragraphId: 'p2', text: 'g2', childIds: ['P2-1'] },
    { id: 'X1', kind: 'CROSS', paragraphId: null, text: 'x', childIds: ['G1', 'G2'] },
    { id: 'TOP', kind: 'TOP', paragraphId: null, text: 't', childIds: ['X1'] },
  ],
  relations: [
    { id: 'R1', fromId: 'P1-1', toId: 'P1-2', name: 'n', note: '' },
    { id: 'R2', fromId: 'P1-1', toId: 'P2-1', name: 'n', note: '' },
  ],
};
const cell = (D: number, P: number, A: number, C: number): GraphCell => ({ D, P, A, C, Cinherited: 0, smallSample: false, capture: null, errorRate: null });

describe('visibleRows', () => {
  it('처음에는 TOP·CROSS·문단 요지까지만 보인다', () => {
    expect(visibleRows(map, defaultExpanded(map)).map(r => [r.id, r.depth, r.open])).toEqual([['TOP', 0, true], ['X1', 1, true], ['G1', 2, false], ['G2', 2, false]]);
  });
  it('노드를 펼치면 자식이 이어 붙는다', () => {
    const expanded = new Set([...defaultExpanded(map), 'G1', 'C1-1']);
    expect(visibleRows(map, expanded).map(r => r.id)).toEqual(['TOP', 'X1', 'G1', 'C1-1', 'P1-1', 'P1-2', 'G2']);
  });
});

describe('relationsOfNode', () => {
  it('명제는 닿는 문단 안 관계만, 문단을 넘는 관계는 뺀다', () => {
    expect(relationsOfNode(map, 'P1-1').map(r => r.id)).toEqual(['R1']);
  });
  it('요지·합성은 아래 단위의 관계를 모으고 CROSS·TOP은 비어 있다', () => {
    expect(relationsOfNode(map, 'G1').map(r => r.id)).toEqual(['R1']);
    expect(relationsOfNode(map, 'X1')).toEqual([]);
    expect(relationsOfNode(map, 'TOP')).toEqual([]);
  });
});

describe('dimTree', () => {
  it('전부 흐리게, CROSS·TOP만 계산값', () => {
    const t = dimTree(map);
    expect(t['P1-1']).toEqual({ brightness: 'DIM', computed: false });
    expect(t['TOP']).toEqual({ brightness: 'DIM', computed: true });
    expect(t['R1']?.brightness).toBe('DIM');
  });
});

describe('graph helpers', () => {
  it('기타 갈래는 값이 있을 때만 보인다', () => {
    expect(visibleBranches({ 내용: cell(1, 0, 0, 0), 기타: cell(0, 0, 0, 0) })).toEqual(['내용']);
    expect(visibleBranches({ 내용: cell(1, 0, 0, 0), 기타: cell(0, 0, 1, 0) })).toEqual(['내용', '기타']);
  });
  it('막대 기준은 가장 큰 잡은+틀린 개수', () => {
    expect(barScale([cell(2, 1, 0, 1), cell(0, 0, 3, 0)])).toBe(4);
    expect(barScale([cell(0, 0, 3, 0)])).toBe(1);
  });
  it('추이는 같은 세션의 점을 지문 순서대로 모은다', () => {
    const s = (sessionId: string, passageId: string) => ({ sessionId, source: 'sh', judgedParagraphs: 1, totalParagraphs: 1, complete: true, tree: {}, graph: { branches: {}, types: {}, trendPoint: { passageId, capture: 0.5, errorRate: 0, relationN: 2 }, wrongRelations: [] } });
    const passages = [{ passageId: 'a', map, relationTypes: {}, paragraphIds: [], sessions: [s('s1', 'a'), s('s2', 'a')] }, { passageId: 'b', map, relationTypes: {}, paragraphIds: [], sessions: [s('s1', 'b')] }];
    expect(trendPoints(passages, 's1').map(p => p.passageId)).toEqual(['a', 'b']);
    expect(trendPoints(passages, 's2').map(p => p.passageId)).toEqual(['a']);
  });
});
