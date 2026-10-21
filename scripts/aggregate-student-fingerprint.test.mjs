import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, finishCell, renderMarkdown } from './aggregate-student-fingerprint.mjs';

// 가짜 지도: p1(명제 P1-1·P1-2, 합성 C1-1, 요지 G1, 관계 R1), p2(명제 P2-1, 관계 R2는 P1-1을 가리키는 문단 간 관계)
const map = {
  passageId: 'x',
  propositions: [
    { id: 'P1-1', paragraphId: 'x-p1', text: 'a', sourceQuote: 'a' }, { id: 'P1-2', paragraphId: 'x-p1', text: 'b', sourceQuote: 'b' },
    { id: 'P2-1', paragraphId: 'x-p2', text: 'c', sourceQuote: 'c' },
  ],
  nodes: [
    { id: 'C1-1', kind: 'COMPOSITE', paragraphId: 'x-p1', text: 'ab', childIds: ['P1-1', 'P1-2'] },
    { id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: 'x-p1', text: 'g', childIds: ['C1-1'] },
  ],
  relations: [{ id: 'R1', fromId: 'P1-1', toId: 'P1-2', note: '' }, { id: 'R2', fromId: 'P1-1', toId: 'P2-1', note: '' }],
};
const classify = { items: [{ id: 'R1', type: 'CAUSE' }, { id: 'R2', type: 'GROUNDS' }] };
const rd = (dialogueId, source, sessionId, paragraphId, roundIndex, text) => ({ dialogueId, source, sessionId, paragraphId, roundIndex, dialogue: [{ role: 'student', text }], copiedSource: false });
const rounds = [
  rd('d1', 'v4', 's1', 'x-p1', 1, '철수는 밥을 먹었다.'),
  rd('d1', 'v4', 's1', 'x-p1', 2, '철수는 밥을 먹었다. 영희는 갔다.'),
  rd('d2', 'copy', 's2', 'x-p2', 1, '다다.'),
];
const rowOf = (d, r, kind, id, label, quote) => ({ jobId: `${d}|${r}|${kind}|${id}`, status: 'OK', finalLabel: label, quoteChecks: quote ? [{ valid: true, quote }] : [] });
const judgmentRows = [
  rowOf('d1', 1, 'node', 'P1-1', 'CONTRADICTS', '철수는 밥을 먹었다'), rowOf('d1', 1, 'node', 'P1-2', 'ABSENT'), rowOf('d1', 1, 'node', 'C1-1', 'CONTRADICTS', '철수는 밥을 먹었다'), rowOf('d1', 1, 'node', 'G1', 'PARTIAL'),
  rowOf('d1', 1, 'relation', 'R1', 'CONTRADICTS', '철수는 밥을 먹었다'),
  rowOf('d1', 2, 'node', 'P1-1', 'DIRECT'), rowOf('d1', 2, 'node', 'P1-2', 'PARTIAL'), rowOf('d1', 2, 'node', 'C1-1', 'DIRECT'), rowOf('d1', 2, 'node', 'G1', 'DIRECT'),
  rowOf('d1', 2, 'relation', 'R1', 'DIRECT'),
  rowOf('d2', 1, 'node', 'P2-1', 'PARTIAL'), rowOf('d2', 1, 'relation', 'R2', 'CONTRADICTS', '다다'),
];
const nd = label => ({ label, pattern: null });
const combined = [
  { dialogueId: 'd1', roundIndex: 1, paragraphId: 'x-p1', nodes: { 'P1-1': nd('CONTRADICTS'), 'P1-2': nd('ABSENT'), 'C1-1': nd('CONTRADICTS'), G1: nd('PARTIAL') }, relations: { R1: { label: 'CONTRADICTS', crossEndUnchecked: [] } } },
  { dialogueId: 'd1', roundIndex: 2, paragraphId: 'x-p1', nodes: { 'P1-1': nd('DIRECT'), 'P1-2': nd('PARTIAL'), 'C1-1': nd('DIRECT'), G1: nd('DIRECT') }, relations: { R1: { label: 'DIRECT', crossEndUnchecked: [] } } },
  { dialogueId: 'd2', roundIndex: 1, paragraphId: 'x-p2', nodes: { 'P2-1': nd('PARTIAL') }, relations: { R2: { label: 'CONTRADICTS', crossEndUnchecked: ['P1-1'] } } },
];
const passages = [{ passageId: 'x', map, rounds, judgmentRows, combined, classify }];
const get = (fp, key) => fp.groups.find(g => g.key === key);

test('비율: 분모 0이면 null, UNJUDGED는 분모에서 제외', () => {
  const c = finishCell({ D: 1, P: 1, A: 2, C: 0, UNJUDGED: 5, events: new Set() });
  assert.equal(c.capture, 0.5); assert.equal(c.precision, 0.5); assert.equal(c.errorRate, 0);
  const z = finishCell({ D: 0, P: 0, A: 3, C: 0, UNJUDGED: 0, events: new Set() });
  assert.equal(z.capture, 0); assert.equal(z.precision, null); assert.equal(z.errorRate, null);
  const e = finishCell({ D: 0, P: 0, A: 0, C: 0, UNJUDGED: 2, events: new Set() });
  assert.equal(e.capture, null); assert.equal(e.UNJUDGED, 2);
});

test('문단을 넘는 관계는 어떤 칸에도 들어가지 않고 건수만 센다', () => {
  const fp = aggregate({ passages, groupBy: 'source' });
  assert.equal(fp.excludedCrossRelations, 1);
  const all = get(fp, 'ALL').views.first;
  assert.equal(all.types.GROUNDS.C, 0);
  assert.equal(all.types.GROUNDS.errorEvents, 0);
  assert.equal(all.branches['논증'].C, 0);
  assert.equal(get(fp, 'copy').views.first.errorEvents, 0);
});

test('노드 층 분류와 first/last 선택', () => {
  const fp = aggregate({ passages, groupBy: 'source' });
  const v4 = get(fp, 'v4');
  assert.deepEqual(v4.rounds, { first: 1, last: 1 });
  const f = v4.views.first.layers, l = v4.views.last.layers;
  assert.equal(f['명제'].C, 1); assert.equal(f['명제'].A, 1); assert.equal(f['합성'].C, 1); assert.equal(f['요지'].P, 1);
  assert.equal(l['명제'].D, 1); assert.equal(l['명제'].P, 1); assert.equal(l['합성'].D, 1); assert.equal(l['요지'].D, 1);
  assert.equal(v4.views.first.types.CAUSE.Cinherited, 1); assert.equal(v4.views.last.types.CAUSE.D, 1);
  assert.equal(v4.views.first.branches['내용'].Cinherited, 1);
  // copy 묶음은 라운드가 하나라 first = last
  const copy = get(fp, 'copy');
  assert.deepEqual(copy.views.first.layers, copy.views.last.layers);
});

test('오류 사건: 한 학생 문장이 명제·합성(+물려받은 관계)에 ✕를 내면 각 칸 1, 묶음 전체 1', () => {
  const fp = aggregate({ passages, groupBy: 'source' });
  const v = get(fp, 'v4').views.first;
  assert.equal(v.errorEvents, 1);
  assert.equal(v.layers['명제'].errorEvents, 1); assert.equal(v.layers['합성'].errorEvents, 1); assert.equal(v.layers['요지'].errorEvents, 0);
  assert.equal(v.types.CAUSE.errorEvents, 0); assert.equal(v.branches['내용'].errorEvents, 0); // 물려받은 관계 오류는 관계 칸 사건에 안 넣는다
  assert.equal(get(fp, 'v4').views.last.errorEvents, 0);
});

test('묶음 키: source / session, 그리고 ALL', () => {
  const bySource = aggregate({ passages, groupBy: 'source' });
  assert.deepEqual(bySource.groups.map(g => g.key), ['copy', 'v4', 'ALL']);
  const bySession = aggregate({ passages, groupBy: 'session' });
  assert.deepEqual(bySession.groups.map(g => g.key), ['s1', 's2', 'ALL']);
  const all = get(bySession, 'ALL');
  assert.equal(all.views.first.layers['명제'].C + all.views.first.layers['명제'].P + all.views.first.layers['명제'].A, 3);
  assert.deepEqual(all.rounds, { first: 2, last: 2 });
  assert.match(renderMarkdown({ groupBy: 'source', excludedCrossRelations: 1, unlocatedErrors: 0, ...bySource }), /오류율을 먼저 쓴다/);
});

test('끝 명제가 ✕인 관계 ✕는 물려받은 오류: C 제외·분모 제외·관계 칸 사건 0, 끝이 ✕ 아니면 자체 오류', () => {
  const fp = aggregate({ passages, groupBy: 'source' });
  const v = get(fp, 'v4').views.first;
  assert.equal(v.types.CAUSE.Cinherited, 1); assert.equal(v.types.CAUSE.C, 0); assert.equal(v.types.CAUSE.errorRate, null);
  assert.equal(v.types.CAUSE.errorEvents, 0); assert.equal(v.branches['내용'].errorEvents, 0);
  assert.equal(v.layers['명제'].errorEvents, 1); assert.equal(v.errorEvents, 1); assert.equal(v.layers['명제'].Cinherited, 0);
  // 끝이 모두 ✕ 아님 -> 자체 오류
  const own = combined.map(e => e.dialogueId === 'd1' && e.roundIndex === 1 ? { ...e, nodes: { ...e.nodes, 'P1-1': nd('DIRECT'), 'C1-1': nd('DIRECT') } } : e);
  const rows = judgmentRows.map(r => ['d1|1|node|P1-1', 'd1|1|node|C1-1'].includes(r.jobId) ? { ...r, finalLabel: 'DIRECT', quoteChecks: [] } : r);
  const v2 = get(aggregate({ passages: [{ ...passages[0], combined: own, judgmentRows: rows }], groupBy: 'source' }), 'v4').views.first;
  assert.equal(v2.types.CAUSE.C, 1); assert.equal(v2.types.CAUSE.Cinherited, 0); assert.equal(v2.types.CAUSE.errorEvents, 1);
});

test('smallSample 경계: N=9 true, N=10 false', () => {
  assert.equal(finishCell({ D: 9, P: 0, A: 0, C: 0, UNJUDGED: 0, events: new Set() }).smallSample, true);
  assert.equal(finishCell({ D: 5, P: 5, A: 0, C: 0, UNJUDGED: 0, events: new Set() }).smallSample, false);
});

test('묶음 표에는 유형 행이 없고 ALL 표에는 있다', () => {
  const md = renderMarkdown({ groupBy: 'source', excludedCrossRelations: 0, unlocatedErrors: 0, ...aggregate({ passages, groupBy: 'source' }) });
  const [head, ...rest] = md.split('## ');
  const sec = (k, v = 'first') => rest.find(x => x.startsWith(`${k} — ${v}`));
  assert.doesNotMatch(sec('v4'), /유형 CAUSE/); assert.match(sec('ALL', 'last'), /유형 CAUSE/);
  assert.match(sec('v4'), /표본 적음/); assert.match(head, /물려받은 오류'로 따로 적는다/);
});

test('combined와 judgments 라벨이 어긋나면 멈춘다', () => {
  const bad = judgmentRows.map(r => r.jobId === 'd1|2|node|G1' ? { ...r, finalLabel: 'ABSENT' } : r);
  assert.throws(() => aggregate({ passages: [{ ...passages[0], judgmentRows: bad }] }), /라벨 불일치/);
});
