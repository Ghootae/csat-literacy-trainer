// 마지막 설명 문단·칠하기 미리보기 자료. 글은 end-explanation-layout-2026-10-28 RESULTS.json 그대로, 문장 경계에서만 나누고 칠할 곳을 사람이 정했다.
// Usage: node docs/experiments/end-explanation-paragraph-preview-2026-10-30/build-fixture.mjs  → FIXTURE.json (검사 실패 시 중단)
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const DIR = 'docs/experiments/end-explanation-paragraph-preview-2026-10-30';
const results = Object.values(JSON.parse(readFileSync('docs/experiments/end-explanation-layout-2026-10-28/RESULTS.json', 'utf8')))[0];
const SESSIONS = {
  'S-A1': 'docs/experiments/v5-diverse-48-regression-2026-10-27-v53-b/cases/S-A1.records.jsonl',
  'KF-r1': 'docs/experiments/v53-three-cell-check-2026-10-27-b/cases/KF-r1.records.jsonl',
  'QP-r2': 'docs/experiments/v53-three-cell-check-2026-10-27-b/cases/QP-r2.records.jsonl',
};
const P = q => ({ location: 'PASSAGE', quote: q }), S = q => ({ location: 'SCENARIO', quote: q });
// 각 문단: [시작 문장 앞부분(원문 그대로), 칠할 곳 | null]. 문단은 다음 문단 시작 직전까지.
const PLAN = {
  'S-A1': {
    firstChoice: [
      ['첨가제를 넣은 뒤 인쇄가 잘되는 상황에 주목한 건 좋아.', P("잉크 방울이 노즐에서 나와서 목표 지점에 얼마나 안정적으로 도착하는지의 정도는 '오네소르게 수'로 표현된다")],
      ['네가 이 값의 변화 방향을 직접 말하지는 않아서,', null],
      ['원문에서는 점도, 즉 끈적거림의 정도가 클수록', P('가령 점도가 커서 오네소르게 수가 이 범위보다 크게 되면 잉크가 노즐 밖으로 나오지 못한다')],
      ['아까 내 질문에 대한 답에서도', null],
    ],
    answer: [
      ['③은 파란색 잉크의 밀도를 두 배로 높이고', null],
      ['원문에서는 오네소르게 수가 잉크의 점도에 영향을 받는다고 했어.', P('오네소르게 수는 잉크의 점도, 표면 장력, 밀도와 잉크젯 프린터의 노즐 지름에 의해 결정된다')],
      ['밀도는 같은 부피에 담긴 질량을 뜻해.', P('오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다')],
      ['오네소르게 수에 영향을 주는 점도도 그대로야.', null],
    ],
  },
  'KF-r1': {
    firstChoice: [['네가 말한 주식회사의 법인격이', P('법인격은 주식회사의 구성원 단체에 부여된다')]],
    answer: [
      ['선지는 갑이 회사를 세울 때', P('법인격은 주식회사의 구성원 단체에 부여된다')],
      ['글에서는 개인이 출자해 자산을 만들었더라도', P('자산의 소유권은 특정 개인이 아닌 법인에게 귀속된다')],
      ['보기에는 갑이 현재 대표 이사라고 나와 있어.', S('A의 설립자이자 현재 대표 이사인 갑은')],
    ],
  },
  'QP-r2': {
    firstChoice: [['점도와 표면 장력이 그대로라는 조건을 짚은 건 맞아.', null]],
    answer: [['③은 점도와 표면 장력을 유지하면서', P('오네소르게 수는 잉크의 점도가 클수록 크고, 잉크의 표면 장력, 잉크의 밀도, 노즐의 지름, 이 세 값의 곱이 클수록 작다')]],
  },
};
const flat = t => t.replace(/\s+/gu, ' ').trim();
const count = (hay, needle) => hay.split(needle).length - 1;
const cases = {};
for (const [id, sections] of Object.entries(PLAN)) {
  const output = results.find(r => r.caseId === id).output;
  const records = readFileSync(SESSIONS[id], 'utf8').trim().split('\n').map(JSON.parse);
  const source = records[0].session.source;
  const fixture = { sessionRecords: SESSIONS[id], originalOutput: output, sections: {} };
  for (const [key, plan] of Object.entries(sections)) {
    const text = output[key];
    const starts = plan.map(([head]) => { const at = text.indexOf(head); assert.ok(at >= 0, `${id}.${key}: 시작 문장 없음 ${head}`); return at; });
    assert.equal(starts[0], 0, `${id}.${key}: 첫 문단은 글 처음에서 시작`);
    starts.forEach((s, i) => i && assert.ok(s > starts[i - 1], `${id}.${key}: 순서`));
    const paragraphs = plan.map(([, mark], i) => {
      const body = text.slice(starts[i], starts[i + 1] ?? text.length).trim();
      if (mark) {
        const hay = flat(mark.location === 'PASSAGE' ? source.passage : source.scenario);
        assert.equal(count(hay, flat(mark.quote)), 1, `${id}.${key}[${i}]: 칠할 곳이 원문에 정확히 한 번이 아님`);
      }
      return { text: body.replace(/\n(?!\n)/gu, ' '), mark };
    });
    // 글 손실·변형 없음: 문단을 이으면 원문 글(공백 무시)과 같다.
    assert.equal(paragraphs.map(p => p.text).join('').replace(/\s/gu, ''), text.replace(/\s/gu, ''), `${id}.${key}: 글이 달라짐`);
    fixture.sections[key] = paragraphs;
  }
  assert.ok(!output.reselection || sections.reselection, `${id}: reselection 계획 없음`);
  cases[id] = fixture;
}
writeFileSync(`${DIR}/FIXTURE.json`, JSON.stringify({ version: 1, note: '글은 원문 그대로(문단 안 줄바꿈만 공백으로), 나누기·칠할 곳은 코드 에이전트가 정함', cases }, null, 2) + '\n');
for (const [id, c] of Object.entries(cases)) for (const [k, ps] of Object.entries(c.sections))
  console.log(id, k, ps.map(p => `${p.text.length}자${p.mark ? '·' + (p.mark.location === 'PASSAGE' ? '지문' : '보기') : '·없음'}`).join(' | '));
