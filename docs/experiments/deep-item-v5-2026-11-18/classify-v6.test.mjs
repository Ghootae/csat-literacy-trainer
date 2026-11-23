// classifyV6 시험 사례 6개 + 전략 점검 (가짜 e1·e2·e3 출력, API 호출 없음). 실행: node docs/experiments/deep-item-v5-2026-11-18/classify-v6.test.mjs
// 근거: rule-audit-2026-11-23/PROPOSAL-code-v6.md 4-4절
import assert from 'node:assert/strict';
import { classifyV6, checkStrategiesV6 } from './classify-v6.mjs';

const POS = '윗글을 바탕으로 〈보기〉를 이해한 내용으로 가장 적절한 것은?';
const NEG = '윗글을 바탕으로 〈보기〉를 이해한 내용으로 적절하지 않은 것은?';
// 선지 n의 e3 칸. 기본: 지문 한 사실 지름길 없음, 〈보기〉 근거 있음, 원리 적용, steps 2, 관찰 2개
const ch = (n, o = {}) => ({ n, one_fact_shortcut: { possible: false }, minimum_evidence: { bogi: '표 한 칸' }, steps: 2, bogi_sources: 2, task: '원리 적용', bogi_only: false, ...o });
const recheck = { one_fact_shortcut: { possible: true, proof: 'x' }, minimum_evidence: { bogi: '' }, task: '내용 확인', steps: 1, bogi_sources: 0 };
const mk = (answer, over = {}) => ({
  item: { version: 'V1', stem: POS, answer, ...over.item },
  mask: { rival: 2, keyEvidence: ['표 한 칸'], ...over.mask },
  e2: { surviving: [answer, 2], ...over.e2 },
  e3: { answer, valid_answers: [answer], closest_rival: { n: 2 }, mirror_pair: { exists: false }, choices: [1, 2, 3, 4, 5].map(n => ch(n)), ...over.e3 },
});
const run = c => classifyV6(c.item, c.mask, c.e2, c.e3);
const cases = [];
const t = (name, fn) => cases.push([name, fn]);

t('(1) 정답 유일성 문제 → defect, 수리 아님', () => {
  const d = run(mk(3, { e3: { valid_answers: [2, 3], answer: 3 } }));
  assert.equal(d.defect, true); assert.equal(d.repair, false);
  assert.match(d.reasons.join(), /정답 유일성 문제/);
});
t('(2) M4만 어김 → 경고, 수리 아님', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 1 || n === 4 ? recheck : {}));
  const d = run(mk(3, { e3: { choices } }));
  assert.deepEqual(d.methodViolations, ['M4']); assert.equal(d.defect, false); assert.equal(d.repair, false);
  assert.ok(d.warnings.some(w => w.startsWith('방식 위반 M4')));
});
t('(3) M2 + M5 → 수리 대상', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 1 ? { bogi_only: true } : {}));
  const d = run(mk(3, { e3: { choices, mirror_pair: { exists: true, choices: [1, 2], why: '같다/적다' } } }));
  assert.deepEqual(d.methodViolations, ['M2', 'M5']); assert.equal(d.repair, true); assert.equal(d.defect, false);
});
t('(4) 정답이 지문 한 사실 + S3 고름 → 전략 경고, 수리 아님', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 3 ? { one_fact_shortcut: { possible: true }, minimum_evidence: { bogi: '' }, task: '짝짓기' } : {}));
  const d = run(mk(3, { item: { strategies: ['S3'] }, e3: { choices } }));
  assert.equal(d.repair, false); assert.deepEqual(d.strategyWarnings, ['고른 전략 못 지킴: S3']);
  assert.ok(d.warnings.includes('정답이 〈보기〉 없이 지문 한 사실로 판정됨'));
  assert.deepEqual(run(mk(3, { e3: { choices } })).strategyWarnings, []); // 고르지 않으면 전략 경고 없음
});
t('(5) 아무 문제 없음 → 통과', () => {
  const d = run(mk(3));
  assert.equal(d.repair, false); assert.equal(d.defect, false); assert.deepEqual(d.methodViolations, []); assert.deepEqual(d.warnings, []);
});
t('(6) 거울 짝이 오답끼리 → M5 위반(정답 포함 여부와 무관)', () => {
  const d = run(mk(3, { e3: { mirror_pair: { exists: true, choices: [1, 2], why: '오답끼리' } } }));
  assert.deepEqual(d.methodViolations, ['M5']); assert.equal(d.repair, false);
});
t('(보충) M3: 부정 발문에서 참 선지(정답 아닌 선지)가 내용 확인이면 위반, 정답이 내용 확인이어도 위반 아님', () => {
  const neg = (task3, task1) => run(mk(3, { item: { stem: NEG }, e3: { choices: [1, 2, 3, 4, 5].map(n => ch(n, { task: n === 3 ? task3 : n === 1 ? task1 : '원리 적용' })) } }));
  assert.deepEqual(neg('내용 확인', '원리 적용').methodViolations, []);
  assert.deepEqual(neg('원리 적용', '내용 확인').methodViolations, ['M3']);
});
t('(보충) 전략 점검: 개수·목록·양식/갈래·strategyUse', () => {
  assert.deepEqual(checkStrategiesV6({ strategies: ['S3', 'S12'], strategyUse: { S3: '정답 ④', S12: '셋째 문장' } }, 'A', 'case'), []);
  assert.ok(checkStrategiesV6({ strategies: [] }, 'A', 'case').length);
  assert.ok(checkStrategiesV6({ strategies: ['S99'], strategyUse: {} }, 'A', 'case').some(x => x.includes('목록에 없는')));
  assert.ok(checkStrategiesV6({ strategies: ['S16'], strategyUse: { S16: 'x' } }, 'A', 'case').some(x => x.includes('A 양식에 쓸 수 없음')));
  assert.ok(checkStrategiesV6({ strategies: ['S5'], strategyUse: { S5: 'x' } }, 'B', 'table').some(x => x.includes('table 갈래에 쓸 수 없음')));
  assert.ok(checkStrategiesV6({ strategies: ['S3'], strategyUse: {} }, 'A', 'case').some(x => x.includes('strategyUse')));
  assert.ok(checkStrategiesV6({ strategies: ['S1', 'S3', 'S4', 'S7'], strategyUse: { S1: 'a', S3: 'a', S4: 'a', S7: 'a' } }, 'A', 'case').some(x => x.includes('4개')));
});

let fail = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('통과  ' + name); } catch (e) { fail++; console.log('실패  ' + name + '\n      ' + e.message.split('\n')[0]); }
}
console.log(`\n${cases.length - fail}/${cases.length} 통과`);
process.exit(fail ? 1 : 0);
