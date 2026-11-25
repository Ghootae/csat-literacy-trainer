// graphPlan 서버 확인(plan-check.mjs) 시험. API 호출 없음. 실행: node docs/experiments/deep-item-v5-2026-11-18/graph/plan-check.test.mjs
// 근거: set-pattern-2026-11-18/CLI-graphB-code.md 3-c·5-d절.
import assert from 'node:assert/strict';
import { checkGraphPlan } from './plan-check.mjs';

const passage = '옥신의 농도가 일정 범위까지\n증가할 때는 생장 촉진의 정도가 높아지지만, 최고 생장점을 지난 이후에는 생장 촉진의 정도가 낮아진다. 기관별로 반응이 다르다.';
const spec = { xAxis: { label: '옥신의 농도', unit: 'M' }, yAxis: { label: '생장 반응 정도', unit: null }, series: [{ id: 'a' }, { id: 'b' }] };
const plan = (o = {}) => ({
  focus: '옥신 농도에 따른 생장 반응', variables: { x: '옥신의 농도(M)', y: '생장 반응 정도(0 위 촉진, 아래 억제)', others: ['기관'] },
  relation: [{ quote: '옥신의 농도가 일정 범위까지 증가할 때는 생장 촉진의 정도가 높아지지만', para: 3 }],
  graphType: '관계 평면', series: [{ id: 'a', shape: '봉우리', shapeFrom: '지문' }, { id: 'b', shape: '봉우리, a보다 높음', shapeFrom: '보기' }], why: '농도 축에서 기관별 비교', ...o,
});
const cases = [];
const t = (name, fn) => cases.push([name, fn]);

t('정상: 통과(괄호·공백·줄바꿈 차이는 무시)', () => assert.deepEqual(checkGraphPlan(plan(), spec, passage), { ok: true, errs: [] }));
t('graphPlan 없음', () => { assert.deepEqual(checkGraphPlan(undefined, spec, passage), { ok: false, errs: ['graphPlan이 없음'] }); assert.equal(checkGraphPlan('x', spec, passage).ok, false); });
t('축 불일치: xAxis.label이 variables.x를 포함하지 않음', () => {
  const r = checkGraphPlan(plan({ variables: { x: '기관의 크기', y: '생장 반응 정도' } }), spec, passage);
  assert.equal(r.ok, false); assert.equal(r.errs.length, 1); assert.match(r.errs[0], /xAxis\.label .*variables\.x/);
});
t('축 불일치: yAxis.label이 variables.y를 포함하지 않음', () => {
  const r = checkGraphPlan(plan({ variables: { x: '옥신의 농도', y: '뿌리 길이' } }), spec, passage);
  assert.match(r.errs.join(), /yAxis\.label .*variables\.y/);
});
t('축: 단위를 variables에 붙여도 통과, label이 더 길어도 포함이면 통과', () => {
  assert.equal(checkGraphPlan(plan({ variables: { x: '옥신의 농도 M', y: '생장 반응' } }), spec, passage).ok, true);
});
t('인용 없음: 지문에 그대로 없는 quote', () => {
  const r = checkGraphPlan(plan({ relation: [{ quote: '옥신이 늘면 생장이 계속 늘어난다', para: 3 }] }), spec, passage);
  assert.equal(r.ok, false); assert.match(r.errs[0], /relation\[0\]\.quote가 지문에 그대로 없음/);
});
t('relation 0개·3개 이상은 오류', () => {
  assert.match(checkGraphPlan(plan({ relation: [] }), spec, passage).errs.join(), /relation이 0개/);
  const q = { quote: '기관별로 반응이 다르다', para: 3 };
  assert.match(checkGraphPlan(plan({ relation: [q, q, q] }), spec, passage).errs.join(), /relation이 3개/);
  assert.equal(checkGraphPlan(plan({ relation: [q, q] }), spec, passage).ok, true);
});
t('계열 id 불일치: graphPlan이 하나 빼먹거나 더 씀', () => {
  const r = checkGraphPlan(plan({ series: [{ id: 'a', shape: 's', shapeFrom: '지문' }, { id: 'z', shape: 's', shapeFrom: '지문' }] }), spec, passage);
  assert.equal(r.ok, false); assert.match(r.errs.join(), /graphPlan에 없음: b/); assert.match(r.errs.join(), /graphSpec에 없음: z/);
});
t('shapeFrom이 지문|보기가 아님', () => {
  const r = checkGraphPlan(plan({ series: [{ id: 'a', shape: 's', shapeFrom: '추측' }, { id: 'b', shape: 's', shapeFrom: '보기' }] }), spec, passage);
  assert.equal(r.ok, false); assert.match(r.errs[0], /series a shapeFrom "추측"/);
});

let fail = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('통과  ' + name); } catch (e) { fail++; console.log('실패  ' + name + '\n      ' + e.message.split('\n')[0]); }
}
console.log(`\n${cases.length - fail}/${cases.length} 통과`);
process.exit(fail ? 1 : 0);
