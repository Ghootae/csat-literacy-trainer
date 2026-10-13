import test from 'node:test';
import assert from 'node:assert/strict';
import { sentenceCount } from './axis-audit-v2-contract.mjs';
import { splitSentences, norm, isAppendOnly, minimumAxes, stage2InputFor, validateStage1, validateStage2 } from './central-story-two-stage-contract.mjs';

const input = () => ({ paragraphId: 'p1', centralStory: '권한은 법인이 갖는다.', sentences: [{ id: 'S1', text: '법인은 권한을 갖는다.' }, { id: 'S2', text: '그 권한에는 조건이 있다.' }] });
const output = () => ({
  paragraphId: 'p1', centralStory: input().centralStory, revisedCentralStory: input().centralStory, additions: [],
  paragraphFunction: { role: 'general', uncertain: false, evidenceQuote: '', reason: '설명' },
  explanationUnits: [{ id: 'E1', summary: '법인의 권한' }],
  sentenceAssignments: [{ sentenceId: 'S1', unit: 'E1', reason: '설명' }, { sentenceId: 'S2', unit: 'E1', reason: '조건' }],
});
const stage2 = (n = 1) => ({
  schemaVersion: 'central-axis-meta-openai-v1', paragraphId: 'p1', centralStory: input().centralStory, verdict: 'READY', issues: [],
  centralAxes: Array.from({ length: n }, (_, i) => ({ id: `AX${i + 1}`, description: '법인의 권한.', metaAxis: '권한이 귀속된다.' })),
  centralStoryMeanings: [{ id: 'CSM1', description: '권한', axisIds: Array.from({ length: n }, (_, i) => `AX${i + 1}`) }],
});
const check1 = (mutate, pattern) => { const out = output(); mutate(out); assert.ok(validateStage1(input(), out).some(e => pattern.test(e))); };

test('문장 분할: 닫는 기호, 소수, 인용 뒤 조사, 각주와 끝 부호 없는 꼬리', () => {
  const text = '값은 0.1이다. ‘아니다.’라는 말을 썼다. 정관*이나 법령을 본다! (질문?) "끝." 마지막 꼬리';
  assert.deepEqual(splitSentences(text), ['값은 0.1이다.', '‘아니다.’라는 말을 썼다.', '정관*이나 법령을 본다!', '(질문?)', '"끝."', '마지막 꼬리']);
  assert.deepEqual(splitSentences('끝.* 다음?] 마지막!'), ['끝.*', '다음?]', '마지막!']);
  for (const t of [text, '', '  ', '꼬리', '문장.\n\n다음.', '끝.* 다음?] 마지막!']) {
    assert.equal(splitSentences(t).length, sentenceCount(t));
    assert.equal(norm(splitSentences(t).join(' ')), norm(t));
  }
});
test('덧붙이기만 허용하며 문자 순서·삭제·치환을 구별한다', () => {
  assert.ok(isAppendOnly('가 나.', '추가 가 새 나. 끝'));
  assert.ok(isAppendOnly('가\n 나.', '가 나.'));
  assert.ok(isAppendOnly('😀가', '😀추가가'));
  assert.equal(isAppendOnly('가 나.', '나 가.'), false);
  assert.equal(isAppendOnly('가 나.', '가.'), false);
  assert.equal(isAppendOnly('가 나.', '가 다.'), false);
});
test('보충 없음 및 원문에 근거한 덧붙이기 통과', () => {
  assert.deepEqual(validateStage1(input(), output()), []);
  const out = output(); out.revisedCentralStory += ' 그 권한에는 조건이 있다.';
  out.additions = [{ content: '그 권한에는 조건이 있다.', sourceQuote: '그 권한에는 조건이 있다.', reason: '조건' }];
  assert.deepEqual(validateStage1(input(), out), []);
});
test('삭제·치환은 계약 위반', () => {
  check1(o => { o.revisedCentralStory = '법인이 갖는다.'; }, /삭제·치환/);
  check1(o => { o.revisedCentralStory = '권한은 개인이 갖는다.'; }, /삭제·치환/);
});
test('보충 기록 없이 문구 변경 거부, 공백 정규화는 허용', () => {
  check1(o => { o.revisedCentralStory += ' 조건.'; }, /additions 없음/);
  const out = output(); out.revisedCentralStory = '권한은\n  법인이 갖는다.';
  assert.deepEqual(validateStage1(input(), out), []);
});
test('paragraphId·centralStory는 정확히 보존', () => {
  check1(o => { o.paragraphId = 'p2'; }, /paragraphId/);
  check1(o => { o.centralStory += ' '; }, /centralStory 불일치/);
});
test('content와 sourceQuote는 연속 구절이고 띄어쓰기를 보존해야 한다', () => {
  const make = () => { const o = output(); o.revisedCentralStory += ' 조건이 있다.'; o.additions = [{ content: '조건이 있다.', sourceQuote: '그 권한에는 조건이 있다.', reason: '조건' }]; return o; };
  let out = make(); out.additions[0].content = '없는 내용'; assert.match(validateStage1(input(), out).join(';'), /content/);
  out = make(); out.additions[0].sourceQuote = '법인은 … 있다.'; assert.match(validateStage1(input(), out).join(';'), /sourceQuote/);
  out = make(); out.additions[0].sourceQuote = '그권한에는 조건이 있다.'; assert.match(validateStage1(input(), out).join(';'), /sourceQuote/);
  out = make(); out.additions[0].sourceQuote = '그\n  권한에는 조건이 있다.'; assert.deepEqual(validateStage1(input(), out), []);
  out = make(); out.additions[0].content = '조건이있다.'; assert.match(validateStage1(input(), out).join(';'), /content/);
});
test('도입·정리 evidenceQuote 인용 의무, uncertain이면 면제', () => {
  for (const role of ['introduction', 'conclusion']) {
    const out = output(); Object.assign(out.paragraphFunction, { role, evidenceQuote: '없는 인용' });
    assert.match(validateStage1(input(), out).join(';'), /evidenceQuote/);
    out.paragraphFunction.uncertain = true; assert.deepEqual(validateStage1(input(), out), []);
    out.paragraphFunction.uncertain = false; out.paragraphFunction.evidenceQuote = '법인은 권한을 갖는다.';
    assert.deepEqual(validateStage1(input(), out), []);
  }
});
test('설명 단위 ID 순서와 문장 누락·중복·순서 검사', () => {
  check1(o => { o.explanationUnits[0].id = 'E2'; }, /ID 순서/);
  check1(o => { o.sentenceAssignments.pop(); }, /문장 누락·순서/);
  check1(o => { o.sentenceAssignments.reverse(); }, /문장 누락·순서/);
  check1(o => { o.sentenceAssignments[1].sentenceId = 'S1'; }, /문장 누락·순서/);
});
test('알 수 없는 단위와 빈 설명 단위 거부, CONNECTIVE 허용', () => {
  check1(o => { o.sentenceAssignments[0].unit = 'E9'; }, /알 수 없는/);
  check1(o => { o.explanationUnits.push({ id: 'E2', summary: '조건' }); }, /빈 설명 단위/);
  const out = output(); out.sentenceAssignments[0].unit = 'CONNECTIVE'; assert.deepEqual(validateStage1(input(), out), []);
});
test('minimumAxes: 일반 E≥2만 2, 불확실 기능은 general', () => {
  const out = output(); assert.equal(minimumAxes(out), 1);
  out.explanationUnits.push({ id: 'E2', summary: '조건' }); assert.equal(minimumAxes(out), 2);
  for (const role of ['introduction', 'conclusion']) { out.paragraphFunction.role = role; assert.equal(minimumAxes(out), 1); }
  out.paragraphFunction.uncertain = true; assert.equal(minimumAxes(out), 2);
  assert.deepEqual(Object.keys(stage2InputFor(out)), ['paragraphId', 'centralStory', 'minimumAxes', 'explanationUnits']);
  assert.equal(stage2InputFor(out).centralStory, out.revisedCentralStory);
});
test('2단계 최소 축 수 및 정상 2축', () => {
  const i = { ...stage2InputFor(output()), minimumAxes: 2 };
  assert.match(validateStage2(i, stage2()).join(';'), /minimumAxes=2/);
  assert.deepEqual(validateStage2(i, stage2(2)), []);
});
test('2단계 NEEDS_REVIEW, ID 순서, 빈 metaAxis 거부', () => {
  const i = stage2InputFor(output()); let out = stage2();
  out.verdict = 'NEEDS_REVIEW'; out.issues = [{ code: 'AXIS_BOUNDARY_AMBIGUOUS', description: '경계', axisIds: ['AX1'] }];
  assert.match(validateStage2(i, out).join(';'), /NEEDS_REVIEW/);
  out = stage2(2); out.centralAxes.reverse(); assert.match(validateStage2(i, out).join(';'), /ID 순서/);
  for (const blank of ['', '  ']) { out = stage2(); out.centralAxes[0].metaAxis = blank; assert.ok(validateStage2(i, out).length); }
});
test('기존 2단계 검증기의 보존·참조·커버리지·issues 계약을 유지', () => {
  const i = stage2InputFor(output());
  for (const mutate of [o => { o.paragraphId = 'p2'; }, o => { o.centralStory += '다른 의미'; }, o => { o.centralStoryMeanings[0].axisIds = ['AX9']; }, o => { o.centralStoryMeanings[0].axisIds = ['AX2']; }, o => { o.issues = [{ code: 'AXIS_BOUNDARY_AMBIGUOUS', description: '문제', axisIds: [] }]; }]) {
    const out = stage2(); mutate(out); assert.ok(validateStage2(i, out).length);
  }
});
test('형식이 손상된 출력은 throw 대신 위반 배열로 반환', () => {
  for (const raw of [null, {}, { explanationUnits: null }]) {
    assert.ok(validateStage1(input(), raw).length); assert.ok(validateStage2(stage2InputFor(output()), raw).length);
  }
});

// 기존 v1 테스트는 유지하고 v2 계약만 추가한다.
const v2Module = await import('./central-story-two-stage-contract.mjs');
const outputV2 = () => { const { centralStory, ...out } = output(); return out; };
const augmentedV2 = () => {
  const out = outputV2();
  out.revisedCentralStory += ' 그 권한에는 조건이 있다.';
  out.additions = [{ content: '그 권한에는 조건이 있다.', sourceQuote: '그 권한에는 조건이 있다.', reason: '핵심 조건' }];
  return out;
};
test('v2 정상 통과: centralStory 없는 스키마와 파생 2단계 입력', () => {
  const out = outputV2();
  assert.equal('centralStory' in v2Module.Stage1V2.shape, false);
  assert.deepEqual(v2Module.validateStage1V2(input(), out), []);
  assert.deepEqual(stage2InputFor(out), stage2InputFor(output()));
  assert.equal(minimumAxes(out), minimumAxes(output()));
});
test('v2 CONNECTIVE 문장만 근거로 한 보충 거부, v1 동작 유지', () => {
  const out = augmentedV2(); out.sentenceAssignments[1].unit = 'CONNECTIVE';
  assert.match(v2Module.validateStage1V2(input(), out).join(';'), /CONNECTIVE 문장 내용 보충/);
  assert.deepEqual(validateStage1(input(), { ...out, centralStory: input().centralStory }), []);
});
test('v2 설명 단위 문장 근거 통과, 공백 정규화 및 중복 인용 허용', () => {
  const out = augmentedV2(); out.additions[0].sourceQuote = '그\n  권한에는 조건이 있다.';
  assert.deepEqual(v2Module.validateStage1V2(input(), out), []);
  const i = input(); i.sentences[0].text = i.sentences[1].text;
  out.sentenceAssignments[0].unit = 'CONNECTIVE';
  assert.deepEqual(v2Module.validateStage1V2(i, out), []);
});
test('v2 centralStory 없어도 덧붙이기·삭제·치환·보충 없음 검사 유지', () => {
  assert.deepEqual(v2Module.validateStage1V2(input(), augmentedV2()), []);
  for (const text of ['법인이 갖는다.', '권한은 개인이 갖는다.']) {
    const out = outputV2(); out.revisedCentralStory = text;
    assert.match(v2Module.validateStage1V2(input(), out).join(';'), /삭제·치환/);
  }
  const out = outputV2(); out.revisedCentralStory += ' 조건.';
  assert.match(v2Module.validateStage1V2(input(), out).join(';'), /additions 없음/);
});
test('v2 연속된 설명 단위 문장에 걸친 인용은 허용, CONNECTIVE 문장에 걸치면 거부', () => {
  const out = augmentedV2(); out.additions[0].sourceQuote = '갖는다. 그 권한에는';
  assert.deepEqual(v2Module.validateStage1V2(input(), out), []);
  out.sentenceAssignments[0].unit = 'CONNECTIVE';
  assert.match(v2Module.validateStage1V2(input(), out).join(';'), /CONNECTIVE 문장 내용 보충/);
});
test('v2 원문 밖 인용·알 수 없는 단위는 근거로 인정하지 않음', () => {
  {
    const out = augmentedV2(); out.additions[0].sourceQuote = '없는 인용';
    assert.ok(v2Module.validateStage1V2(input(), out).length);
  }
  const out = augmentedV2(); out.sentenceAssignments[1].unit = 'E9';
  const errors = v2Module.validateStage1V2(input(), out).join(';');
  assert.match(errors, /알 수 없는/); assert.match(errors, /설명 단위 문장 근거 없음/);
});
test('v2 v1의 ID·배정·인용·기능 검사 유지, 손상 스키마는 위반 배열', () => {
  for (const raw of [null, {}, { explanationUnits: null }]) assert.ok(v2Module.validateStage1V2(input(), raw).length);
  for (const mutate of [o => { o.paragraphId = 'p2'; }, o => { o.sentenceAssignments.reverse(); }, o => { o.explanationUnits.push({ id: 'E2', summary: '조건' }); }, o => { o.paragraphFunction.role = 'introduction'; o.paragraphFunction.evidenceQuote = '없는 인용'; }, o => { o.additions[0].content = '없는 내용'; }]) {
    const out = augmentedV2(); mutate(out); assert.ok(v2Module.validateStage1V2(input(), out).length);
  }
});

// v3 추가: 기존 함수·입력·출력을 바꾸지 않는다.
const { minimumAxesV3, stage2InputForV3 } = await import('./central-story-two-stage-contract.mjs');
for (const role of ['introduction', 'conclusion', 'general']) {
  for (const uncertain of [false, true]) {
    test(`v3 ${role}, uncertain=${uncertain}: 설명 단위 수만 적용, 기존 결과 보존`, () => {
      for (const count of [1, 2, 3]) {
        const out = outputV2();
        Object.assign(out.paragraphFunction, { role, uncertain });
        out.explanationUnits = Array.from({ length: count }, (_, i) => ({ id: `E${i + 1}`, summary: `설명 ${i + 1}` }));
        const before = structuredClone(out), oldInput = stage2InputFor(out);
        const oldMinimum = (role === 'general' || uncertain) && count >= 2 ? 2 : 1;
        assert.equal(minimumAxesV3(out), count >= 2 ? 2 : 1);
        assert.deepEqual(stage2InputForV3(out), { ...oldInput, minimumAxes: count >= 2 ? 2 : 1 });
        assert.equal(minimumAxes(out), oldMinimum);
        assert.deepEqual(stage2InputFor(out), oldInput);
        assert.deepEqual(out, before);
      }
    });
  }
}
test('v3 최소 2축 입력에서 정상 2축 통과·1축 계약 위반, v1 입력 유지', () => {
  const out = outputV2(); out.paragraphFunction.role = 'introduction';
  out.explanationUnits.push({ id: 'E2', summary: '조건' });
  assert.deepEqual(validateStage2(stage2InputFor(out), stage2()), []);
  assert.match(validateStage2(stage2InputForV3(out), stage2()).join(';'), /minimumAxes=2/);
  assert.deepEqual(validateStage2(stage2InputForV3(out), stage2(2)), []);
});
