import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAuditV2, auditFlags, effectiveRole, sentenceCount } from './axis-audit-v2-contract.mjs';

const paragraphText = '폐포에는 압력 차이로 공기가 드나든다. 계면 활성제가 표면 장력을 낮춘다. 이에 따라 폐포의 확장이 쉬워진다.';
const input = {
  paragraphId: 'p', paragraphText,
  axes: [
    { id: 'AX1', centralQuestion: '공기는 왜 드나드는가?', description: '폐포에는 압력 차이로 공기가 드나든다.', metaAxis: '압력 차가 공기 이동을 낳는다.' },
    { id: 'AX2', centralQuestion: '계면 활성제는 무엇을 하는가?', description: '계면 활성제가 표면 장력을 낮춰 폐포 확장을 쉽게 한다.', metaAxis: '표면 장력 감소가 확장을 돕는다.' },
  ],
};
const general = { role: 'general', uncertain: false, evidenceQuote: '', reason: '본론' };
const noOpinion = { thinksSingleAxis: false, reason: '' };
const keepAll = () => ({
  paragraphId: 'p', paragraphFunction: general, singleAxisOpinion: noOpinion, deletedAxes: [], paragraphReview: '',
  axes: input.axes.map((a) => ({ ...a, fromAxisIds: [a.id], action: 'keep', reason: '유지', mergeReview: null })),
});
const review = (overrides = {}) => ({
  originalQuestions: input.axes.map((a) => ({ id: a.id, centralQuestion: a.centralQuestion })),
  originalRequirements: [
    { id: 'AX1', minimalMeaning: '압력 차로 공기 이동', quote: '압력 차이로 공기가 드나든다' },
    { id: 'AX2', minimalMeaning: '표면 장력 감소→확장 용이', quote: '표면 장력을 낮춰' },
  ],
  questionRelation: { type: 'distinct-questions', explanation: '서로 다른 인과' },
  requirementMapping: {
    mappings: [
      { id: 'AX1', finalPhrase: '압력 차이로 공기가 드나들고', excludedReason: null },
      { id: 'AX2', finalPhrase: '표면 장력을 낮춘다', excludedReason: null },
    ],
    newRequirements: [],
  },
  contrastResponse: { response: '압력 차로 공기가 움직인다.', expectedBeforeMerge: 'AX1 충족', expectedAfterMerge: '부분', rationale: '계면 활성제 누락' },
  ...overrides,
});
const mergeAll = (pf = general, rv = review()) => ({
  ...keepAll(), paragraphFunction: pf,
  axes: [{ id: 'AX1', fromAxisIds: ['AX1', 'AX2'], action: 'merge', centralQuestion: '폐포는?', description: '폐포에는 압력 차이로 공기가 드나들고 계면 활성제가 표면 장력을 낮춘다.', metaAxis: 'm', reason: 'r', mergeReview: rv }],
});

test('모두 유지하면 통과한다', () => assert.deepEqual(validateAuditV2(input, keepAll()), []));

test('일반 문단을 1축으로 병합하면 최소 2축 위반이다', () => {
  assert.ok(validateAuditV2(input, mergeAll()).some((e) => e.includes('최소 2축')));
});

test('원문 인용 근거가 있는 도입 문단은 1축을 허용한다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는 압력 차이로', reason: '도입' };
  assert.deepEqual(validateAuditV2(input, mergeAll(intro)), []);
});

test('불확실한 도입 판정은 일반 문단으로 본다', () => {
  const unsure = { role: 'introduction', uncertain: true, evidenceQuote: '폐포에는 압력 차이로', reason: '?' };
  assert.equal(effectiveRole(unsure), 'general');
  assert.ok(validateAuditV2(input, mergeAll(unsure)).some((e) => e.includes('최소 2축')));
});

test('도입 판정 근거가 원문에 없으면 위반이다', () => {
  const fake = { role: 'conclusion', uncertain: false, evidenceQuote: '원문에 없는 문장', reason: '정리' };
  assert.ok(validateAuditV2(input, mergeAll(fake)).some((e) => e.includes('원문 인용')));
});

test('삭제로 일반 문단이 1축이 되어도 위반이다', () => {
  const out = keepAll();
  out.axes = [out.axes[0]];
  out.deletedAxes = [{ id: 'AX2', reason: '불필요' }];
  assert.ok(validateAuditV2(input, out).some((e) => e.includes('최소 2축')));
});

test('입력이 이미 1축이면 일반 문단이어도 1축을 유지할 수 있다', () => {
  const one = { ...input, axes: [input.axes[0]] };
  const out = { ...keepAll(), axes: [keepAll().axes[0]] };
  assert.deepEqual(validateAuditV2(one, out), []);
});

test('병합 기록의 질문 인용·요구 인용·대응 구절을 검사한다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는', reason: '도입' };
  const bad = review({
    originalQuestions: [{ id: 'AX1', centralQuestion: '바꾼 질문' }, { id: 'AX2', centralQuestion: input.axes[1].centralQuestion }],
    originalRequirements: [{ id: 'AX1', minimalMeaning: 'x', quote: 'L1에 없는 구절' }, { id: 'AX2', minimalMeaning: 'y', quote: '표면 장력을 낮춰' }],
    requirementMapping: { mappings: [{ id: 'AX1', finalPhrase: '최종 L1에 없는 구절', excludedReason: null }, { id: 'AX2', finalPhrase: null, excludedReason: '' }], newRequirements: [] },
  });
  const errors = validateAuditV2(input, mergeAll(intro, bad));
  for (const part of ['정확 인용', '원 L1 인용', '최종 L1에 없음', '제외 이유']) assert.ok(errors.some((e) => e.includes(part)), part);
});

test('병합 축에 기록이 없거나 비병합 축에 기록이 있으면 위반이다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는', reason: '도입' };
  assert.ok(validateAuditV2(input, mergeAll(intro, null)).some((e) => e.includes('mergeReview 없음')));
  const out = keepAll();
  out.axes[0].mergeReview = review();
  assert.ok(validateAuditV2(input, out).some((e) => e.includes('mergeReview가 있음')));
});

test('keep 문구 변경과 축 누락을 잡는다', () => {
  const out = keepAll();
  out.axes[0].description = '바뀜';
  out.axes = [out.axes[0]];
  const errors = validateAuditV2(input, out);
  assert.ok(errors.some((e) => e.includes('keep인데')));
  assert.ok(errors.some((e) => e.includes('정확히 한 번씩')));
});

test('검토 신호는 전체 병합과 병합 축 수를 기록한다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는', reason: '도입' };
  const flags = auditFlags(input, mergeAll(intro));
  assert.deepEqual(flags.merges[0], { id: 'AX1', mergedAxisCount: 2, wholeParagraphMerge: true, questionRelation: 'distinct-questions', excludedRequirements: [], newRequirements: 0 });
  assert.equal(flags.effectiveRole, 'introduction');
});

test('불확실한 기능 판정은 원문 인용이 없어도 일반 문단으로 통과한다', () => {
  const out = { ...keepAll(), paragraphFunction: { role: 'introduction', uncertain: true, evidenceQuote: '', reason: '?' } };
  assert.deepEqual(validateAuditV2(input, out), []);
});

test('띄어쓰기가 다른 인용은 정확 인용으로 보지 않는다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '압력차이로', reason: '도입' };
  assert.ok(validateAuditV2(input, mergeAll(intro)).some((e) => e.includes('원문 인용')));
});

test('대응 구절과 제외 이유를 함께 쓰거나 빈 새 요구를 쓰면 위반이다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는', reason: '도입' };
  const rv = review();
  rv.requirementMapping.mappings[0].excludedReason = '부수';
  rv.requirementMapping.newRequirements = [' '];
  const errors = validateAuditV2(input, mergeAll(intro, rv));
  assert.ok(errors.some((e) => e.includes('함께 있음')));
  assert.ok(errors.some((e) => e.includes('빈 newRequirements')));
});

test('1축 의견에는 근거가 필요하다', () => {
  const out = { ...keepAll(), singleAxisOpinion: { thinksSingleAxis: true, reason: '' } };
  assert.ok(validateAuditV2(input, out).some((e) => e.includes('1축 의견')));
});

test('삭제와 병합으로 축 하나가 되면 전체 병합 신호를 켠다', () => {
  const three = { ...input, axes: [{ ...input.axes[0], id: 'AX0', centralQuestion: '도입?', description: '도입 문장.' }, ...input.axes] };
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '폐포에는', reason: '도입' };
  const out = { ...mergeAll(intro), deletedAxes: [{ id: 'AX0', reason: '연결' }] };
  assert.deepEqual(validateAuditV2(three, out), []);
  assert.equal(auditFlags(three, out).merges[0].wholeParagraphMerge, true);
});

// v3(D-0088): 원문 한 문장의 소개·연결 축은 실질 설명 수에서 뺀다.
const v3Text = '라플라스 식은 기포 결합을 이해하는 데 도움이 된다. 크기가 다른 두 기포가 합쳐지면 공기가 이동한다. 그 결과 큰 기포가 된다.';
const v3Input = {
  paragraphId: 'p', paragraphText: v3Text,
  axes: [
    { id: 'AX1', centralQuestion: '라플라스 식은 무엇에 도움이 되는가?', description: '라플라스 식은 기포 결합 이해에 도움이 된다.', metaAxis: 'm1', sourceText: '라플라스 식은 기포 결합을 이해하는 데 도움이 된다.' },
    { id: 'AX2', centralQuestion: '두 기포는 어떻게 합쳐지는가?', description: '크기가 다른 두 기포가 합쳐지면 공기가 이동해 큰 기포가 된다.', metaAxis: 'm2', sourceText: '크기가 다른 두 기포가 합쳐지면 공기가 이동한다. 그 결과 큰 기포가 된다.' },
  ],
};
const v3Review = (type = 'connective-absorption') => ({
  originalQuestions: v3Input.axes.map((a) => ({ id: a.id, centralQuestion: a.centralQuestion })),
  originalRequirements: [
    { id: 'AX1', minimalMeaning: '도입', quote: '기포 결합 이해에 도움' },
    { id: 'AX2', minimalMeaning: '공기 이동→큰 기포', quote: '공기가 이동해 큰 기포가 된다' },
  ],
  questionRelation: { type, explanation: '도입 문장 흡수' },
  requirementMapping: { mappings: [{ id: 'AX1', finalPhrase: null, excludedReason: '도입 문장' }, { id: 'AX2', finalPhrase: '공기가 이동해 큰 기포가 된다', excludedReason: null }], newRequirements: [] },
  contrastResponse: { response: '공기가 이동해 큰 기포가 된다.', expectedBeforeMerge: 'AX2 충족', expectedAfterMerge: '충족', rationale: '도입 불필요' },
});
const v3Out = (connectiveAxes, type) => ({
  paragraphId: 'p', paragraphFunction: general, singleAxisOpinion: noOpinion, deletedAxes: [], paragraphReview: '', connectiveAxes,
  axes: [{ id: 'AX1', fromAxisIds: ['AX1', 'AX2'], action: 'merge', centralQuestion: 'q', description: '크기가 다른 두 기포가 합쳐지면 공기가 이동해 큰 기포가 된다.', metaAxis: 'm', reason: 'r', mergeReview: v3Review(type) }],
});
const v3 = { substantiveRule: true };
const intro1 = [{ id: 'AX1', evidenceQuote: '도움이 된다', reason: '적용 사례 소개' }];

test('v3: 한 문장 소개 축을 표시하면 일반 문단도 1축이 된다', () => {
  assert.deepEqual(validateAuditV2(v3Input, v3Out(intro1), v3), []);
});

test('v3: 소개 축 표시가 없으면 최소 2축 위반이다', () => {
  assert.ok(validateAuditV2(v3Input, v3Out([]), v3).some((e) => e.includes('최소 2축')));
});

test('v3: 두 문장 축은 소개·연결 축으로 표시할 수 없다', () => {
  const errors = validateAuditV2(v3Input, v3Out([{ id: 'AX2', evidenceQuote: '공기가 이동한다', reason: '연결' }]), v3);
  assert.ok(errors.some((e) => e.includes('한 문장')));
});

test('v3: 소개·연결 근거는 해당 축 원문 인용이어야 한다', () => {
  const errors = validateAuditV2(v3Input, v3Out([{ id: 'AX1', evidenceQuote: '큰 기포가 된다', reason: '연결' }]), v3);
  assert.ok(errors.some((e) => e.includes('해당 축 원문 인용')));
});

test('v3: 실질 설명 축이 둘 이상이면 소개 축이 있어도 1축이 될 수 없다', () => {
  const three = { ...v3Input, axes: [...v3Input.axes, { id: 'AX3', centralQuestion: 'q3', description: '그 결과 큰 기포가 된다.', metaAxis: 'm3', sourceText: '추가 설명이다.' }] };
  const out = v3Out(intro1);
  out.deletedAxes = [{ id: 'AX3', reason: '불필요' }];
  assert.ok(validateAuditV2(three, out, v3).some((e) => e.includes('최소 2축')));
});

test('connective-absorption 관계는 v3에서만 허용한다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '라플라스 식은', reason: '도입' };
  const out = { ...v3Out(intro1), paragraphFunction: intro };
  assert.ok(validateAuditV2(v3Input, out).some((e) => e.includes('질문 관계 값 오류')));
  assert.deepEqual(validateAuditV2(v3Input, out, v3), []);
});

test('문장 수는 문장 끝 부호로 센다', () => {
  assert.equal(sentenceCount('하나다. 둘이다.'), 2);
  assert.equal(sentenceCount('정관*이나 법령에서 권한을 부여한 사람이다.'), 1);
  assert.equal(sentenceCount('‘흰 말은 말이 아니다.’라는 주장을 폈다.'), 1);
});

// 리뷰 반영(2026-10-07)
const v3Three = {
  ...v3Input,
  axes: [v3Input.axes[0], v3Input.axes[1], { id: 'AX3', centralQuestion: 'q3', description: '추가 설명이다.', metaAxis: 'm3', sourceText: '추가 설명이다.' }],
};

test('v3: 소개 축을 따로 남기고 실질 설명 둘을 합치면 최소 2축 위반이다', () => {
  const out = v3Out(intro1);
  out.axes = [
    { id: 'AX1', fromAxisIds: ['AX1'], action: 'keep', ...(({ id, sourceText, ...rest }) => rest)(v3Three.axes[0]), reason: 'r', mergeReview: null },
    { id: 'AX2', fromAxisIds: ['AX2', 'AX3'], action: 'merge', centralQuestion: 'q', description: '공기가 이동해 큰 기포가 된다. 추가 설명이다.', metaAxis: 'm', reason: 'r',
      mergeReview: { ...v3Review('distinct-questions'),
        originalQuestions: v3Three.axes.slice(1).map((a) => ({ id: a.id, centralQuestion: a.centralQuestion })),
        originalRequirements: [{ id: 'AX2', minimalMeaning: 'x', quote: '공기가 이동해' }, { id: 'AX3', minimalMeaning: 'y', quote: '추가 설명' }],
        requirementMapping: { mappings: [{ id: 'AX2', finalPhrase: '공기가 이동해', excludedReason: null }, { id: 'AX3', finalPhrase: '추가 설명이다', excludedReason: null }], newRequirements: [] } } },
  ];
  assert.ok(validateAuditV2(v3Three, out, v3).some((e) => e.includes('최종 실질 설명 축이 2개 미만')));
});

test('v3: 소개 축이 없는 병합에 connective-absorption을 붙이면 위반이다', () => {
  const intro = { role: 'introduction', uncertain: false, evidenceQuote: '라플라스 식은', reason: '도입' };
  const out = { ...v3Out([]), paragraphFunction: intro };
  assert.ok(validateAuditV2(v3Input, out, v3).some((e) => e.includes('소개·연결 축이 병합에 없음')));
});

test('v3: connectiveAxes가 없으면 예외 대신 위반을 보고한다', () => {
  const { connectiveAxes, ...out } = v3Out(intro1);
  assert.ok(validateAuditV2(v3Input, out, v3).some((e) => e.includes('connectiveAxes 없음')));
});

test('v3: 입력 대부분을 소개·연결로 표시하면 검토 신호를 켠다', () => {
  const flags = auditFlags(v3Input, v3Out(intro1));
  assert.equal(flags.substantiveInputAxes, 1);
  assert.equal(flags.mostlyConnective, true);
});

test('문장 수: 끝 부호 없는 나머지와 각주 표시를 센다', () => {
  assert.equal(sentenceCount('하나다. 둘이며'), 2);
  assert.equal(sentenceCount('하나다.* 둘이다.'), 2);
  assert.equal(sentenceCount('끝 부호 없음'), 1);
  assert.equal(sentenceCount('0.1에서 1.0 사이이다.'), 1);
});
