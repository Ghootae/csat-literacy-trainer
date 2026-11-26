// classifyV6 시험 사례 6개 + 전략 점검 (가짜 e1·e2·e3 출력, API 호출 없음). 실행: node docs/experiments/deep-item-v5-2026-11-18/classify-v6.test.mjs
// 근거: rule-audit-2026-11-23/PROPOSAL-code-v6.md 4-4절
import assert from 'node:assert/strict';
import { classifyV6, checkStrategiesV6, stemChanged, finalStatus, checkLeversV6, diceBigram, matchFactV6, premiseGuardV6 } from './classify-v6.mjs';

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
t('(2) M4만 어김(case) → 수리 대상(v6.3: 하나여도 수리)', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 1 || n === 4 ? recheck : {}));
  const d = run(mk(3, { e3: { choices } }));
  assert.deepEqual(d.methodViolations, ['M4']); assert.equal(d.defect, false); assert.equal(d.repair, true);
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
t('(6) 거울 짝이 오답끼리 → M5 위반(정답 포함 여부와 무관), 수리 대상', () => {
  const d = run(mk(3, { e3: { mirror_pair: { exists: true, choices: [1, 2], why: '오답끼리' } } }));
  assert.deepEqual(d.methodViolations, ['M5']); assert.equal(d.repair, true);
});
t('(보충) M3: 부정 발문에서 참 선지(정답 아닌 선지)가 내용 확인이면 위반, 정답이 내용 확인이어도 위반 아님', () => {
  const neg = (task3, task1) => run(mk(3, { item: { stem: NEG }, e3: { choices: [1, 2, 3, 4, 5].map(n => ch(n, { task: n === 3 ? task3 : n === 1 ? task1 : '원리 적용' })) } }));
  assert.deepEqual(neg('내용 확인', '원리 적용').methodViolations, []);
  assert.deepEqual(neg('원리 적용', '내용 확인').methodViolations, ['M3']);
});
t('(보충) 전략 점검: 개수·목록·양식/갈래·strategyUse', () => {
  assert.deepEqual(checkStrategiesV6({ answer: 4, rival: 2, strategies: ['S3', 'S12'], strategyUse: { S3: '정답 ④', S12: '선지 ② 경계' } }, 'A', 'case'), []);
  assert.ok(checkStrategiesV6({ strategies: [] }, 'A', 'case').length);
  assert.ok(checkStrategiesV6({ strategies: ['S99'], strategyUse: {} }, 'A', 'case').some(x => x.includes('목록에 없는')));
  assert.ok(checkStrategiesV6({ strategies: ['S16'], strategyUse: { S16: 'x' } }, 'A', 'case').some(x => x.includes('A 양식에 쓸 수 없음')));
  assert.ok(checkStrategiesV6({ strategies: ['S5'], strategyUse: { S5: 'x' } }, 'B', 'table').some(x => x.includes('table 갈래에 쓸 수 없음')));
  assert.ok(checkStrategiesV6({ strategies: ['S18'], strategyUse: { S18: 'x' } }, 'A', 'view').some(x => x.includes('view 갈래에 쓸 수 없음')));
  assert.deepEqual(checkStrategiesV6({ answer: 3, rival: 2, strategies: ['S18', 'S19'], strategyUse: { S18: '정답 ③', S19: 'y' } }, 'B', 'table'), []);
  assert.ok(checkStrategiesV6({ strategies: ['S3'], strategyUse: {} }, 'A', 'case').some(x => x.includes('strategyUse')));
  assert.ok(checkStrategiesV6({ strategies: ['S1', 'S3', 'S4', 'S7'], strategyUse: { S1: 'a', S3: 'a', S4: 'a', S7: 'a' } }, 'A', 'case').some(x => x.includes('4개')));
});
t('(v6.1-1) 배치 전략만 고름 → "깊이 전략 없음" 경고', () => {
  const w = checkStrategiesV6({ answer: 3, rival: 2, strategies: ['S5', 'S9'], strategyUse: { S5: '〈보기〉 한 사안', S9: '정답 ③' } }, 'A', 'case');
  assert.deepEqual(w, ['깊이 전략 없음']);
});
t('(v6.1-2) 깊이 전략이 정답·rival 아닌 선지에만 쓰임 → 경고, 정답이나 rival이면 통과', () => {
  const base = { answer: 3, rival: 2, strategies: ['S12'] };
  assert.ok(checkStrategiesV6({ ...base, strategyUse: { S12: '〈보기〉 셋째 문장, 선지 ①' } }, 'A', 'case').some(x => x.includes('S12이 정답·rival에 안 쓰임')));
  assert.deepEqual(checkStrategiesV6({ ...base, strategyUse: { S12: '〈보기〉 셋째 문장, 선지 ③' } }, 'A', 'case'), []);
  assert.deepEqual(checkStrategiesV6({ ...base, strategyUse: { S12: '경쟁 ②' } }, 'A', 'case'), []);
  assert.deepEqual(checkStrategiesV6({ ...base, strategyUse: { S12: '정답 ③' } }, 'A', 'case'), []);
});
t('(v6.1-3) 관점(view)에서 방식 위반 둘 → repair=false + 경고, 사례(case)는 repair=true', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 1 ? { bogi_only: true } : {}));
  const over = { e3: { choices, mirror_pair: { exists: true, choices: [1, 2], why: '같다/적다' } } };
  const v = run(mk(3, { ...over, item: { kind: 'view' } }));
  assert.deepEqual(v.methodViolations, ['M2', 'M5']); assert.equal(v.repair, false); assert.equal(v.defect, false);
  assert.ok(v.warnings.some(w => w.startsWith('관점: 방식 위반 둘 이상 — 수리 안 함')));
  assert.equal(run(mk(3, { ...over, item: { kind: 'case' } })).repair, true);
});

t('(v6.3) 방식 위반 하나: case·experiment는 수리, view는 수리 안 하고 경고만', () => {
  const choices = [1, 2, 3, 4, 5].map(n => ch(n, n === 1 ? { bogi_only: true } : {}));
  const c1 = kind => run(mk(3, { e3: { choices }, item: { kind } }));
  assert.deepEqual(c1('case').methodViolations, ['M2']); assert.equal(c1('case').repair, true);
  assert.equal(c1('experiment').repair, true);
  const v = c1('view'); assert.equal(v.repair, false); assert.ok(v.warnings.some(w => w.startsWith('방식 위반 M2')));
});
t('(v6.3) 전략: S18은 experiment 갈래에 쓸 수 있고 S5는 쓸 수 없음', () => {
  assert.deepEqual(checkStrategiesV6({ answer: 3, rival: 2, strategies: ['S18'], strategyUse: { S18: '정답 ③' } }, 'B', 'experiment'), []);
  assert.ok(checkStrategiesV6({ strategies: ['S5'], strategyUse: { S5: 'x' } }, 'B', 'experiment').some(x => x.includes('experiment 갈래에 쓸 수 없음')));
});

// v6.5 M6 (2026-11-25): e3f(별도 호출) 결과를 classifyV6 5번째 인자로 받는다. (v6.4에서는 e3 choices 안에 있었음)
const e3f = map => ({ answer: 3, choices: [1, 2, 3, 4, 5].map(n => ({ n, truth: '참', fact_sensitive: n in map ? map[n] : true, why: `w${n}` })) });
const runF = (c, f) => classifyV6(c.item, c.mask, c.e2, c.e3, f);
t('(v6.5-1) 부정 발문 정답 fact_sensitive=false → M6·수리', () => {
  const d = runF(mk(3, { item: { stem: NEG, kind: 'case' } }), e3f({ 3: false }));
  assert.deepEqual(d.methodViolations, ['M6']); assert.equal(d.repair, true); assert.deepEqual(d.m6Choices, [3]);
  assert.deepEqual(d.factSensitive, [true, true, false, true, true]); assert.equal(d.factWhy[2], 'w3');
});
t('(v6.5-2) 긍정 발문 오답 false 3개 → M6', () => {
  const d = runF(mk(3, { item: { kind: 'case' } }), e3f({ 1: false, 2: false, 4: false, 3: false }));
  assert.deepEqual(d.methodViolations, ['M6']); assert.deepEqual(d.m6Choices, [1, 2, 4]); assert.match(d.methodDetails.M6, /1,2,4/);
});
t('(v6.5-3) 긍정 발문 오답 false 2개 → M6 없음', () => {
  const d = runF(mk(3, { item: { kind: 'case' } }), e3f({ 1: false, 2: false }));
  assert.deepEqual(d.methodViolations, []); assert.equal(d.repair, false);
});
t('(v6.5-4) fact_sensitive null 3개 / e3f 없음 → M6 없음', () => {
  const d = runF(mk(3, { item: { kind: 'case' } }), e3f({ 1: null, 2: null, 4: null, 5: false }));
  assert.deepEqual(d.methodViolations, []);
  assert.deepEqual(runF(mk(3, { item: { stem: NEG, kind: 'case' } }), e3f({ 3: null })).methodViolations, []);
  const none = classifyV6(mk(3, { item: { stem: NEG, kind: 'case' } }).item, mk(3).mask, mk(3).e2, mk(3).e3); // 인자 없음
  assert.deepEqual(none.methodViolations, []); assert.deepEqual(none.factSensitive, [null, null, null, null, null]);
});
t('(v6.5-5) kind view + M6 → 수리 없음·경고', () => {
  const d = runF(mk(3, { item: { stem: NEG, kind: 'view' } }), e3f({ 3: false }));
  assert.deepEqual(d.methodViolations, ['M6']); assert.equal(d.repair, false);
  assert.ok(d.warnings.some(w => w.startsWith('방식 위반 M6')));
});
t('(v6.5-6) 수리가 발문을 바꾸면(조건 문장 지워짐 포함) 되돌림 판정', () => {
  assert.equal(stemChanged(NEG, NEG), false);
  assert.equal(stemChanged(NEG, NEG + ' '), true);
  assert.equal(stemChanged(POS, NEG), true);
  assert.equal(stemChanged(POS, undefined), false); // 발문을 안 돌려준 것은 원본 유지로 처리(바뀌지 않음)
});
t('(v6.5-7) 수리 뒤 결함이면 status=defect, 아니면 표시 없음', () => {
  const bad = run(mk(3, { e3: { valid_answers: [2, 3], answer: 3 } }));
  assert.equal(finalStatus(bad), 'defect');
  assert.equal(finalStatus(run(mk(3))), undefined); assert.equal(finalStatus(undefined), undefined);
});

// v6.6 CASE_FLOW=lever: checkLeversV6 (L1~L5)
const LB = '갑은 점검표를 읽었다. 을은 통로에 물을 흘렸고 곧 닦았다. 병은 다음 날 공방에 왔다.';
const lvItem = (o = {}) => ({ stem: NEG, answer: 2, bogi: LB,
  leverTable: [{ fact: '갑은 점검표를 읽었다.', value: 'a', pair: 'P', verdicts: {} }, { fact: '을은 통로에 물을 흘렸고 곧 닦았다.', value: 'b', pair: 'P', verdicts: {} }, { fact: '병은 다음 날 공방에 왔다.', value: 'c', pair: null, verdicts: {} }],
  choiceLevers: [1, 2, 3, 4, 5].map(n => ({ n, facts: ['을은 통로에 물을 흘렸고 곧 닦았다.'], misread: n === 2 ? '곧 닦음→안 닦음' : null, corrected: null })), // v6.6b: 기본 lvItem은 pair 짝(갑·을 줄)을 갖는다
  principleCards: [{ principle: 'p1' }, { principle: 'p2' }], ...o });
t('(v6.6-1) L1 통과 / fact가 〈보기〉에 없으면 오류', () => {
  assert.deepEqual(checkLeversV6(lvItem()).errors, []);
  const r = checkLeversV6(lvItem({ leverTable: [{ fact: '〈보기〉에 없는 문장입니다 정말로', value: 'x' }] }));
  assert.ok(r.errors.some(e => e.startsWith('L1')));
  assert.deepEqual(checkLeversV6(lvItem({ bogi: '  **' + LB + '**  ' })).errors, []); // 정규화(마크다운·공백)
});
t('(v6.6-2) L3 facts 없음 → 오류', () => {
  const cl = lvItem().choiceLevers.map(c => c.n === 4 ? { ...c, facts: [] } : c);
  assert.ok(checkLeversV6(lvItem({ choiceLevers: cl })).errors.some(e => e.startsWith('L3') && e.includes('선지 4')));
  assert.ok(checkLeversV6(lvItem({ choiceLevers: cl.slice(0, 4) })).errors.some(e => e.includes('4개')));
});
t('(v6.6-3) 부정 발문 정답 misread 없음 → 오류', () => {
  const cl = lvItem().choiceLevers.map(c => c.n === 2 ? { ...c, misread: '' } : c);
  assert.ok(checkLeversV6(lvItem({ choiceLevers: cl })).errors.some(e => e.startsWith('L4') && e.includes('선지 2')));
});
t('(v6.6-4) 긍정 발문 오답 facts 합집합 2개뿐 → 오류', () => {
  const f1 = '갑은 점검표를 읽었다.', f2 = '을은 통로에 물을 흘렸고 곧 닦았다.';
  const cl = [1, 2, 3, 4, 5].map(n => ({ n, facts: [n % 2 ? f1 : f2], misread: n === 2 ? null : 'm', corrected: null }));
  const r = checkLeversV6(lvItem({ stem: POS, answer: 2, choiceLevers: cl }));
  assert.ok(r.errors.some(e => e.startsWith('L4') && e.includes('합집합')));
});
t('(v6.6-5) L2 안 쓰인 〈보기〉 문장 → 경고만', () => {
  const r = checkLeversV6(lvItem({ bogi: LB + ' 정은 그날 공방 문을 열어 두었다.' }));
  assert.deepEqual(r.errors, []); assert.ok(r.warnings.some(w => w.startsWith('L2')));
});
t('(v6.6-6) L5 principleCards 1개 → 경고만', () => {
  const r = checkLeversV6(lvItem({ principleCards: [{ principle: 'p1' }] }));
  assert.deepEqual(r.errors, []); assert.ok(r.warnings.some(w => w.startsWith('L5')));
});

// v6.6b: L6·L7·유사도. (v6.6-1~6의 lvItem은 pair가 없으므로 L6 오류가 늘 있다 → 아래 시험은 pair를 넣은 변형 사용)
const pairRows = [{ fact: '갑은 점검표를 읽었다.', pair: 'P' }, { fact: '을은 통로에 물을 흘렸고 곧 닦았다.', pair: 'P' }, { fact: '병은 다음 날 공방에 왔다.', pair: null }].map(r => ({ ...r, value: 'v', verdicts: {} }));
const pItem = (o = {}) => lvItem({ leverTable: pairRows, choiceLevers: [1, 2, 3, 4, 5].map(n => ({ n, facts: [n === 2 ? '갑은 점검표를 읽었다.' : '병은 다음 날 공방에 왔다.'], misread: n === 2 ? 'x' : null, corrected: null })), ...o });
t('(v6.6b-1) L6 pair가 없거나 한 줄뿐이면 오류, 두 줄이면 통과', () => {
  assert.ok(checkLeversV6(lvItem({ leverTable: pairRows.map(r => ({ ...r, pair: null })) })).errors.some(e => e.startsWith('L6')));
  assert.ok(checkLeversV6(pItem({ leverTable: pairRows.map((r, i) => i === 1 ? { ...r, pair: null } : r) })).errors.some(e => e.startsWith('L6')));
  assert.deepEqual(checkLeversV6(pItem()).errors, []);
});
t('(v6.6b-2) L7 부정 발문 정답이 pair 줄을 안 쓰면 오류', () => {
  const cl = pItem().choiceLevers.map(c => c.n === 2 ? { ...c, facts: ['병은 다음 날 공방에 왔다.'] } : c);
  assert.ok(checkLeversV6(pItem({ choiceLevers: cl })).errors.some(e => e.startsWith('L7')));
  assert.deepEqual(checkLeversV6(pItem()).errors.filter(e => e.startsWith('L7')), []);
});
t('(v6.6b-3) L7 긍정 발문에서 오답이 pair 줄을 안 쓰면 경고만', () => {
  const cl = [1, 2, 3, 4, 5].map(n => ({ n, facts: ['병은 다음 날 공방에 왔다.', '을은 통로에 물을 흘렸고 곧 닦았다.', '갑은 점검표를 읽었다.'].slice(n === 1 ? 0 : 0, 3), misread: n === 2 ? null : 'm', corrected: null }));
  // 오답(1,3,4,5)이 모두 pair 줄을 쓰므로 경고 없음, 오답이 pair 줄을 하나도 안 쓰면 경고
  const none = [1, 2, 3, 4, 5].map(n => ({ n, facts: ['병은 다음 날 공방에 왔다.'], misread: n === 2 ? null : 'm', corrected: null }));
  const r = checkLeversV6(pItem({ stem: POS, answer: 2, choiceLevers: none }));
  assert.ok(r.warnings.some(w => w.startsWith('L7')) && !r.errors.some(e => e.startsWith('L7')));
});
t('(v6.6b-4) 유사도 0.6 경계: 0.6 → 유사, 0.4 → 없음, 글자 일치 → 일치', () => {
  assert.equal(diceBigram('abcdef', 'abcdxy'), 0.6);
  assert.equal(matchFactV6('abcdef', 'abcdxy').status, '유사');
  assert.equal(diceBigram('abcdef', 'abxyzw') < 0.6, true);
  assert.equal(matchFactV6('abcdef', 'abxyzw').status, '없음');
  assert.equal(matchFactV6('갑은 점검표를 읽었다.', '전날 갑은 점검표를 읽었다. 을은 갔다.').status, '일치');
});

// v6.8 L8 (premise): 전제형
const prem = (o = {}) => {
  const base = lvItem({
    choices: ['갑이 점검표를 읽었으므로 갑에게 주의 의무가 있겠군.', '을이 통로를 곧 닦지 않았으므로 갑은 비난받겠군.', '병이 다음 날 왔으므로 해명은 무관하겠군.', '을이 물을 흘렸으므로 책임이 있겠군.', '갑이 읽었으므로 알았겠군.'],
    choiceLevers: [1, 2, 3, 4, 5].map(n => ({ n, facts: [n === 2 ? '을은 통로에 물을 흘렸고 곧 닦았다.' : '병은 다음 날 공방에 왔다.'], premise: ['갑이 점검표를 읽었으므로', '을이 통로를 곧 닦지 않았으므로', '병이 다음 날 왔으므로', '을이 물을 흘렸으므로', '갑이 읽었으므로'][n - 1], premiseTrue: n !== 2, verdict: 'v', misread: n === 2 ? '곧 닦음→안 닦음' : null, corrected: null })) });
  return { ...base, ...o };
};
t('(v6.8-L8a) premise·verdict가 비면 오류, 채우면 통과', () => {
  assert.deepEqual(checkLeversV6(prem(), { premise: true }).errors, []);
  const cl = prem().choiceLevers.map(c => c.n === 3 ? { ...c, premise: '' } : c);
  assert.ok(checkLeversV6(prem({ choiceLevers: cl }), { premise: true }).errors.some(e => e.startsWith('L8a')));
  assert.deepEqual(checkLeversV6(prem({ choiceLevers: cl })).errors.filter(e => e.startsWith('L8')), []); // premise 옵션이 없으면 L8 안 돎
});
t('(v6.8-L8b) premiseTrue=false가 정답 하나뿐이어야 한다', () => {
  const cl2 = prem().choiceLevers.map(c => c.n === 4 ? { ...c, premiseTrue: false } : c);
  assert.ok(checkLeversV6(prem({ choiceLevers: cl2 }), { premise: true }).errors.some(e => e.startsWith('L8b')));
  const cl3 = prem().choiceLevers.map(c => c.n === 2 ? { ...c, premiseTrue: true } : c);
  assert.ok(checkLeversV6(prem({ choiceLevers: cl3 }), { premise: true }).errors.some(e => e.startsWith('L8b')));
});
t('(v6.8-L8c) 정답 선지에 가정 표현이 있으면 오류, 참 선지에는 허용', () => {
  const ch = prem().choices.map((x, i) => i === 1 ? '을이 곧 닦았다면 갑은 비난받지 않겠군.' : x);
  assert.ok(checkLeversV6(prem({ choices: ch }), { premise: true }).errors.some(e => e.startsWith('L8c')));
  const ch2 = prem().choices.map((x, i) => i === 0 ? '갑이 읽었다면 주의 의무가 있겠군.' : x);
  assert.ok(!checkLeversV6(prem({ choices: ch2 }), { premise: true }).errors.some(e => e.startsWith('L8c')));
});

// v6.9 L9 (pairCard)
import fs from 'node:fs';
const PSG = '포장은 물품을 담은 것이다. 손잡이는 물품의 구성이다.';
const pcItem = (o = {}) => ({ ...prem(), pairCards: [{ name: 'P', quote: '포장은 물품을 담은 것이다.', sideA: '포장', sideB: '물품', card: 'C1' }], ...o });
const opt = { premise: true, pairCard: true, passage: PSG };
t('(v6.9-L9a) pairCards 없거나 빈 필드면 오류, 채우면 통과', () => {
  assert.deepEqual(checkLeversV6(pcItem(), opt).errors.filter(e => e.startsWith('L9')), []);
  assert.ok(checkLeversV6(pcItem({ pairCards: [] }), opt).errors.some(e => e.startsWith('L9a')));
  assert.ok(checkLeversV6(pcItem({ pairCards: [{ name: 'P', quote: '', sideA: 'a', sideB: 'b' }] }), opt).errors.some(e => e.startsWith('L9a')));
});
t('(v6.9-L9b) quote가 지문에 없으면 오류, 지문 한 문장과 Dice≥0.8이면 통과', () => {
  assert.ok(checkLeversV6(pcItem({ pairCards: [{ name: 'P', quote: '지문에 전혀 없는 문장입니다 정말로', sideA: 'a', sideB: 'b' }] }), opt).errors.some(e => e.startsWith('L9b')));
  assert.ok(!checkLeversV6(pcItem({ pairCards: [{ name: 'P', quote: '포장은 물품을 담은 것이다', sideA: 'a', sideB: 'b' }] }), opt).errors.some(e => e.startsWith('L9b')));
});
t('(v6.9-L9c) pair 값이 카드 name이 아니면 오류', () => {
  assert.ok(checkLeversV6(pcItem({ pairCards: [{ name: 'Q', quote: '포장은 물품을 담은 것이다.', sideA: 'a', sideB: 'b' }] }), opt).errors.some(e => e.startsWith('L9c')));
});
t('(v6.9-L9d) pair 줄 fact에 방향·배치어가 있으면 오류, pair 없는 줄은 무관', () => {
  const lt = prem().leverTable.map((r, i) => i === 0 ? { ...r, fact: '갑은 북쪽 섬에 사진을 넣었다.' } : r);
  assert.ok(checkLeversV6(pcItem({ leverTable: lt }), opt).errors.some(e => e.startsWith('L9d')));
  const lt2 = prem().leverTable.map(r => r.pair ? r : { ...r, fact: r.fact + ' 북쪽' });
  assert.ok(!checkLeversV6(pcItem({ leverTable: lt2 }), opt).errors.some(e => e.startsWith('L9d')));
});
t('(v6.9-fixture) 242c021f 공손룡 항목은 L9에서 걸리고 청약 항목은 L9b~d를 통과', () => {
  const rd = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8')).items[0];
  const g = rd('out-case-premise/gongsun-long-later-mohists-A/items.json'); const cy = rd('out-case-premise/gen32-T3-2-A/items.json');
  const gp = fs.readFileSync(new URL('passages/gongsun-long-later-mohists/passage.txt', import.meta.url), 'utf8');
  const cp = fs.readFileSync(new URL('passages/gen32-T3-2/passage.txt', import.meta.url), 'utf8');
  const gq = gp.split(/\n+/).flatMap(l => l.split(/(?<=[.?!])\s+/)).find(x => x.length > 20);
  const gr = checkLeversV6({ ...g, pairCards: [{ name: g.leverTable.find(r => r.pair).pair, quote: gq, sideA: '가', sideB: '나' }] }, { premise: true, pairCard: true, passage: gp });
  assert.ok(gr.errors.some(e => e.startsWith('L9d')), '공손룡 사진 배치 짝이 L9d에 걸려야 함');
  const cname = cy.leverTable.find(r => r.pair).pair; const cq = cp.split(/\n+/).flatMap(l => l.split(/(?<=[.?!])\s+/)).find(x => x.includes('포장'));
  const cr = checkLeversV6({ ...cy, pairCards: [{ name: cname, quote: cq, sideA: '포장', sideB: '물품' }] }, { premise: true, pairCard: true, passage: cp });
  assert.deepEqual(cr.errors.filter(e => /^L9[bcd]/.test(e)), []);
});

// v6.10 L9f·L9g(PAIR_CARD=2)와 수리 가드
const opt2 = { premise: true, pairCard: 2, passage: PSG };
const lt2 = [{ fact: '갑은 푸른 등잔에 새벽이라 불렀다.', pair: 'P', value: 'a', verdicts: {} }, { fact: '안내 화면에서 등잔을 누르자 두 등잔이 떴다.', pair: 'P', value: 'b', verdicts: {} }, { fact: '병은 다음 날 공방에 왔다.', pair: null, value: 'c', verdicts: {} }];
const pc2 = (o = {}) => pcItem({ leverTable: lt2, pairCards: [{ name: 'P', word: '등잔', quote: '포장은 물품을 담은 것이다.', sideA: '두 개체', sideB: '한 개체' }], ...o });
t('(v6.10-L9f) word가 비었거나 짝 두 줄에 안 나오면 오류, 두 줄에 나오면 통과', () => {
  assert.deepEqual(checkLeversV6(pc2(), opt2).errors.filter(e => /^L9[fg]/.test(e)), []);
  assert.ok(checkLeversV6(pc2({ pairCards: [{ name: 'P', quote: '포장은 물품을 담은 것이다.', sideA: 'a', sideB: 'b' }] }), opt2).errors.some(e => e.startsWith('L9f')));
  assert.ok(checkLeversV6(pc2({ pairCards: [{ name: 'P', word: '새벽', quote: '포장은 물품을 담은 것이다.', sideA: 'a', sideB: 'b' }] }), opt2).errors.some(e => e.startsWith('L9f')));
  assert.deepEqual(checkLeversV6(pc2({ leverTable: lt2 }), { ...opt2, pairCard: true }).errors.filter(e => e.startsWith('L9f')), []); // PAIR_CARD=1이면 L9f 안 돎
});
t('(v6.10-L9g) pair 줄 fact에 식별 기호·표식이 있으면 오류', () => {
  const lt = lt2.map((r, i) => i === 1 ? { ...r, fact: '◇ 접시에서 등잔을 닦았다.' } : r);
  assert.ok(checkLeversV6(pc2({ leverTable: lt }), opt2).errors.some(e => e.startsWith('L9g')));
});
t('(v6.10-fixture) 594213c9 짝 카드 1판 항목은 L9f·L9g에 걸린다', () => {
  const it = JSON.parse(fs.readFileSync(new URL('out-case-pair/gongsun-long-later-mohists-A/items.json', import.meta.url), 'utf8')).items[0];
  const gp = fs.readFileSync(new URL('passages/gongsun-long-later-mohists/passage.txt', import.meta.url), 'utf8');
  const r = checkLeversV6(it, { premise: true, pairCard: 2, passage: gp });
  assert.ok(r.errors.some(e => e.startsWith('L9f')) && r.errors.some(e => e.startsWith('L9g')), r.errors.join(' | '));
});
t('(v6.10-guard) 수리가 정답을 가정형으로/번호를 바꾸면 되돌림, 긍정 발문·원래 가정형은 그대로', () => {
  const o = { kind: 'case', stem: NEG, answer: 2, choices: ['① a므로 b겠군.', '② c므로 d겠군.', '③ e'] };
  assert.equal(premiseGuardV6(o, { ...o, choices: ['① a', '② c였다면 d겠군.', '③ e'] }), '수리가 정답을 가정형으로 바꿔 되돌림');
  assert.equal(premiseGuardV6(o, { ...o, answer: 3 }), '수리가 정답 번호를 바꿔 되돌림');
  assert.equal(premiseGuardV6(o, { ...o, choices: ['① a', '② c므로 d겠군.', '③ e라면 f'] }), null);
  assert.equal(premiseGuardV6({ ...o, stem: POS }, { ...o, stem: POS, choices: ['① a', '② c라면 d', '③ e'] }), null);
  assert.equal(premiseGuardV6({ ...o, choices: ['① a', '② c라면 d겠군.', '③ e'] }, { ...o, choices: ['① a', '② c라면 d겠군.', '③ e'] }), null);
});

let fail = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('통과  ' + name); } catch (e) { fail++; console.log('실패  ' + name + '\n      ' + e.message.split('\n')[0]); }
}
console.log(`\n${cases.length - fail}/${cases.length} 통과`);
process.exit(fail ? 1 : 0);
