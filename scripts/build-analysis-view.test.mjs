import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPassageView, main } from './build-analysis-view.mjs';

// 가짜 지도: p1(명제 P1-1·P1-2, 합성 C1-1, 요지 G1, 관계 R1), p2(명제 P2-1, 요지 G2), 문단 넘는 관계 R2, CROSS X1, TOP
const map = pid => ({
  passageId: pid,
  propositions: [
    { id: 'P1-1', paragraphId: `${pid}-p1`, text: 'a' }, { id: 'P1-2', paragraphId: `${pid}-p1`, text: 'b' },
    { id: 'P2-1', paragraphId: `${pid}-p2`, text: 'c' },
  ],
  nodes: [
    { id: 'C1-1', kind: 'COMPOSITE', paragraphId: `${pid}-p1`, text: 'ab', childIds: ['P1-1', 'P1-2'] },
    { id: 'G1', kind: 'PARAGRAPH_GIST', paragraphId: `${pid}-p1`, text: 'g1', childIds: ['C1-1'] },
    { id: 'G2', kind: 'PARAGRAPH_GIST', paragraphId: `${pid}-p2`, text: 'g2', childIds: ['P2-1'] },
    { id: 'X1', kind: 'CROSS', paragraphId: null, text: 'x', childIds: ['G1', 'G2'] },
    { id: 'TOP', kind: 'TOP', paragraphId: null, text: 't', childIds: ['X1'] },
  ],
  relations: [{ id: 'R1', fromId: 'P1-1', toId: 'P1-2', name: 'n', note: '' }, { id: 'R2', fromId: 'P1-1', toId: 'P2-1', name: 'n', note: '' }],
});
const classify = { items: [{ id: 'R1', type: 'CAUSE' }, { id: 'R2', type: 'GROUNDS' }] };

// 한 차례의 판정: [dialogueId, roundIndex, paragraphId, 노드 라벨, 관계 라벨, 학생 발화]
class Data {
  constructor(pid) { this.pid = pid; this.rounds = []; this.combined = []; this.judgmentRows = []; }
  add(dialogueId, sessionId, roundIndex, para, nodes, relations, text, crossEnd = false) {
    const paragraphId = `${this.pid}-${para}`;
    this.rounds.push({ dialogueId, source: 'sh', sessionId, paragraphId, roundIndex, dialogue: [{ role: 'student', text }, { role: 'tutor', text: '질문' }, { role: 'student', text: `${text}2` }] });
    this.combined.push({
      dialogueId, roundIndex, paragraphId,
      nodes: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { label: v, pattern: null }])),
      relations: Object.fromEntries(Object.entries(relations).map(([k, v]) => [k, { label: v, ...(k === 'R2' && crossEnd ? { crossEndUnchecked: ['P2-1'] } : {}) }])),
    });
    for (const [k, v] of Object.entries(nodes)) this.judgmentRows.push({ jobId: `${dialogueId}|${roundIndex}|node|${k}`, status: 'OK', finalLabel: v, quoteChecks: [] });
    for (const [k, v] of Object.entries(relations)) this.judgmentRows.push({ jobId: `${dialogueId}|${roundIndex}|relation|${k}`, status: 'OK', finalLabel: v, quoteChecks: [] });
    return this;
  }
  view() { return buildPassageView({ passageId: this.pid, map: map(this.pid), classify, rounds: this.rounds, judgmentRows: this.judgmentRows, combined: this.combined }); }
}
const N = (a, b, c) => ({ 'P1-1': a, 'P1-2': b, 'C1-1': c, G1: c });
const N2 = l => ({ 'P2-1': l, G2: l });

function fixture(pid, s1R1First) {
  const d = new Data(pid);
  // s1: p1 대화 2와 10(번호는 숫자로 비교), p2 대화 1 → 완료 세션
  d.add(`sh:s1:${pid}-p1:2`, 's1', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), { R1: s1R1First }, '가');
  d.add(`sh:s1:${pid}-p1:2`, 's1', 3, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), { R1: 'DIRECT' }, '나');
  d.add(`sh:s1:${pid}-p1:10`, 's1', 1, 'p1', N('PARTIAL', 'ABSENT', 'PARTIAL'), { R1: 'ABSENT' }, '다');
  d.add(`sh:s1:${pid}-p1:10`, 's1', 2, 'p1', N('PARTIAL', 'PARTIAL', 'PARTIAL'), { R1: 'PARTIAL' }, '라');
  d.add(`sh:s1:${pid}-p2:1`, 's1', 1, 'p2', N2('PARTIAL'), { R2: 'DIRECT' }, '마', true);
  // s2: 문단 하나만, 첫 차례에 관계 R1 자체 오류 → 대화 뒤 고침
  d.add(`v4:s2`, 's2', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), { R1: 'CONTRADICTS' }, '바');
  d.add(`v4:s2`, 's2', 2, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), { R1: 'DIRECT' }, '사');
  // s3: 끝 노드 오류를 물려받은 관계 오류는 틀린 관계 목록에서 뺀다
  d.add(`v4:s3`, 's3', 1, 'p1', N('CONTRADICTS', 'DIRECT', 'CONTRADICTS'), { R1: 'CONTRADICTS' }, '아');
  return d;
}

test('세션 묶음·완료·정렬: 완료 세션이 먼저, 판정 문단 수가 센다', () => {
  const v = fixture('x', 'ABSENT').view();
  assert.deepEqual(v.sessions.map(s => [s.sessionId, s.judgedParagraphs, s.totalParagraphs, s.complete]), [['s1', 2, 2, true], ['s2', 1, 2, false], ['s3', 1, 2, false]]);
  assert.deepEqual(v.paragraphIds, ['x-p1', 'x-p2']);
  assert.equal(v.relationTypes.R1.typeKo, '인과·작용');
  assert.equal(v.relationTypes.R2.branch, '논증');
});

test('수형도 차례: 문단마다 마지막 대화(번호 숫자 비교)의 마지막 roundIndex, 밝기 변환', () => {
  const s1 = fixture('x', 'ABSENT').view().sessions[0];
  // p1은 대화 :10의 라운드 2 → P1-1 PARTIAL·P1-2 PARTIAL (:2의 라운드 3이면 BRIGHT)
  assert.deepEqual(s1.tree['P1-1'], { brightness: 'HALF', computed: false, label: 'PARTIAL' });
  assert.equal(s1.tree['P1-2'].brightness, 'HALF');
  assert.equal(s1.tree.R1.label, 'PARTIAL');
  assert.deepEqual(fixture('x', 'ABSENT').view().sessions[1].tree['P2-1'], { brightness: 'DIM', computed: false });
  const s3 = fixture('x', 'ABSENT').view().sessions[2];
  assert.equal(s3.tree['P1-1'].brightness, 'DIM'); // CONTRADICTS도 DIM
  assert.equal(s3.tree['P2-1'].label, undefined); // 판정 안 된 문단은 label 없음
});

test('계산값: CROSS·TOP은 자식 밝기에서 계산', () => {
  const [s1, s2] = fixture('x', 'ABSENT').view().sessions;
  assert.deepEqual(s1.tree.G1, { brightness: 'HALF', computed: false, label: 'PARTIAL' });
  assert.deepEqual(s1.tree.X1, { brightness: 'HALF', computed: true }); // 모두 HALF 이상
  assert.deepEqual(s1.tree.TOP, { brightness: 'HALF', computed: true });
  assert.equal(s2.tree.G1.brightness, 'BRIGHT');
  assert.deepEqual(s2.tree.X1, { brightness: 'DIM', computed: true }); // G2가 판정 안 됨
  assert.equal(s2.tree.TOP.brightness, 'DIM');
  // 문단별 대화가 달라야 하므로 dialogueId를 분리한 자료로 확인
  const d = new Data('x').add('sh:s9:x-p1:1', 's9', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), {}, '가').add('sh:s9:x-p2:1', 's9', 1, 'p2', N2('DIRECT'), {}, '나');
  const s9 = d.view().sessions[0];
  assert.deepEqual(s9.tree.TOP, { brightness: 'BRIGHT', computed: true });
});

test('대화 번호로 마지막을 정할 수 없으면 멈춘다', () => {
  const d = new Data('x').add('v4:a', 's1', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), {}, '가').add('v4:b', 's1', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), {}, '나');
  assert.throws(() => d.view(), /마지막 대화를 정할 수 없음/);
});

test('그래프: aggregate() 첫 차례 views.first와 같은 숫자', async () => {
  const { aggregate } = await import('./aggregate-student-fingerprint.mjs');
  const d = fixture('x', 'ABSENT');
  const fp = aggregate({ passages: [{ passageId: 'x', map: map('x'), rounds: d.rounds, judgmentRows: d.judgmentRows, combined: d.combined, classify }], groupBy: 'session' });
  for (const s of d.view().sessions) {
    const first = fp.groups.find(g => g.key === s.sessionId).views.first;
    for (const [b, c] of Object.entries(first.branches)) for (const k of ['D', 'P', 'A', 'C', 'Cinherited', 'smallSample', 'capture', 'errorRate']) assert.equal(s.graph.branches[b][k], c[k]);
    for (const [t, c] of Object.entries(first.types)) for (const k of ['D', 'P', 'A', 'C', 'Cinherited', 'smallSample', 'capture', 'errorRate']) assert.equal(s.graph.types[t][k], c[k]);
  }
  const s1 = d.view().sessions[0].graph.branches;
  // s1 첫 차례: p1 대화 :2 R1 ABSENT, 대화 :10 R1 ABSENT, p2의 R2는 문단 넘는 관계라 제외
  assert.equal(s1['내용'].A, 2);
  assert.equal(s1['논증'].A + s1['논증'].D + s1['논증'].P, 0);
});

test('추이 점: 세션·지문별 전체 관계 기준, 지문 두 개면 점 두 개', () => {
  const x = fixture('x', 'ABSENT').view().sessions;
  const y = fixture('y', 'DIRECT').view().sessions; // 같은 세션 id가 다른 지문에도 있음
  // x s1: 첫 차례 R1 ABSENT 2건 → 포착 0, 오류율 null / y s1: 첫 차례 R1 DIRECT 1·ABSENT 1
  assert.deepEqual(x[0].graph.trendPoint, { passageId: 'x', capture: 0, errorRate: null, relationN: 2 });
  assert.deepEqual(y[0].graph.trendPoint, { passageId: 'y', capture: 0.5, errorRate: 0, relationN: 2 });
  // s2: 자체 오류 1건 → 오류율 1, 포착 0
  assert.deepEqual(x[1].graph.trendPoint, { passageId: 'x', capture: 0, errorRate: 1, relationN: 1 });
  // s3: 물려받은 오류는 분모에서 제외
  assert.deepEqual(x[2].graph.trendPoint, { passageId: 'x', capture: null, errorRate: null, relationN: 0 });
  assert.equal(x[2].graph.branches['내용'].Cinherited, 1);
});

test('틀린 관계 목록: 자체 CONTRADICTS만, 학생 발화 이어 붙임, 대화 뒤 고침 표시', () => {
  const [s1, s2, s3] = fixture('x', 'ABSENT').view().sessions;
  assert.deepEqual(s1.graph.wrongRelations, []);
  assert.deepEqual(s2.graph.wrongRelations, [{ relId: 'R1', paragraphId: 'x-p1', dialogueId: 'v4:s2', studentText: '바\n바2', fixedAfterDialogue: true }]);
  assert.deepEqual(s3.graph.wrongRelations, []); // 물려받은 오류 제외
  const d = new Data('x').add('v4:s4', 's4', 1, 'p1', N('DIRECT', 'DIRECT', 'DIRECT'), { R1: 'CONTRADICTS' }, '가');
  assert.equal(d.view().sessions[0].graph.wrongRelations[0].fixedAfterDialogue, false); // 차례가 하나뿐이면 고침 아님
});

test('지도만 있는 지문은 세션 없음', () => {
  const v = buildPassageView({ passageId: 'x', map: map('x'), classify });
  assert.deepEqual(v.sessions, []);
});

test('실제 자료: 6지문, 공손룡 완료 세션 2·도파민 0, 그래프가 by-session 기존 결과와 일치', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'analysis-view-')), 'view-data.json');
  const data = main(['--out', out]);
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).passages.length, 6);
  const byId = Object.fromEntries(data.passages.map(p => [p.passageId, p]));
  assert.equal(byId['gongsun-long-later-mohists'].sessions.filter(s => s.complete).length, 2);
  assert.equal(byId['dopamine-motor-control'].sessions.filter(s => s.complete).length, 0);
  assert.equal(byId['gongsun-long-later-mohists'].sessions.length + byId['dopamine-motor-control'].sessions.length, 53);
  assert.deepEqual(byId['corporate-law'].sessions, []);
  const fp = JSON.parse(readFileSync('docs/experiments/student-fingerprint-2026-10-21/by-session/fingerprint.json', 'utf8'));
  for (const p of data.passages) for (const s of p.sessions) {
    const first = fp.groups.find(g => g.key === s.sessionId).views.first;
    for (const [b, c] of Object.entries(first.branches)) for (const k of ['D', 'P', 'A', 'C', 'Cinherited', 'smallSample', 'capture', 'errorRate']) assert.equal(s.graph.branches[b][k], c[k], `${s.sessionId} ${b} ${k}`);
    for (const [t, c] of Object.entries(first.types)) for (const k of ['D', 'P', 'A', 'C', 'Cinherited', 'smallSample', 'capture', 'errorRate']) assert.equal(s.graph.types[t][k], c[k], `${s.sessionId} ${t} ${k}`);
  }
});
