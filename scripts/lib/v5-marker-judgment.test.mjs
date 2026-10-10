import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod/v4';
import { FeedbackSelectionAssessmentSchema, SourceDirectProblemBundleSchema, createFeedbackSession,
  submitFeedbackCommand, feedbackRequestContent, OpenAIFeedbackEvaluator, applyFeedbackAssessment } from '../../packages/pipeline/dist/index.js';
import { sourceBindingSha256 } from './marker-gloss-validation.mjs';
import { ARMS, CLAIM_BLOCK, QUOTE_BLOCK, GLOSS_BLOCK, instructionsFor, extendedSelectionSchema, validateClaims,
  assertJudgePayload, transformRequest, glossVerbatimInStudentText, makeSchedule, claimSelfCheck } from './v5-marker-judgment.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const base = read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json');
const product = read('packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json');
const source = SourceDirectProblemBundleSchema.parse({ ...base, passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
const baseline = readFileSync('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md', 'utf8');
const v5 = readFileSync('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md', 'utf8');
const { responses, choiceId } = read('docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json');
const session = (text = responses.S1, label = 'test') => submitFeedbackCommand(createFeedbackSession(label, source),
  { type: 'SELECT', choiceId, rationale: { mode: 'PROVIDED', text } }, 'o1');
const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema);
const gloss = read('docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07/pipeline-run1.json').judgePayload;
const options = arm => ({ arm, baseline, instructions: instructionsFor(v5, arm), selectionSchema: schema, markerGloss: gloss });
const claim = (quote = '서로 다르다', sourceCheck = 'CONSISTENT') => ({ observationId: 'o1', quote, claimAsStated: quote, sourceCheck, sourceBasis: '원문 대조' });
const observations = [{ observationId: 'o1', text: '대상이 서로 다르다' }];
const assessment = () => ({ reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'SUPPORTED', errors: [], studentClaims: [claim()] });
const rejection = a => assert.throws(() => validateClaims(a, observations), /CLAIMS_CONTRACT:/u);
function validOutput(s) {
  const quote = s.observations[0].command.rationale.text;
  return { mode: 'SELECTION', boundary: 'NONE', reason: '학생 발화를 대조했다.', reconstructability: 'RECONSTRUCTABLE',
    reconstructedPath: [quote], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'SUPPORTED',
    studentEvidence: [{ observationId: 'o1', quote }],
    sourceEvidence: [{ location: 'SCENARIO', quote: source.scenario, mediaId: null, visualObservation: null }],
    errors: [], selectionMismatchQuestion: null, coaching: '원문과 판단 근거를 확인했습니다.' };
}
test('세 블록은 인계 문구 그대로이며 문항 내용이 없다', () => {
  const handoff = readFileSync('docs/handoffs/2026-10-07-v5-marker-judgment-gongsun.md', 'utf8');
  for (const [name, block] of Object.entries({ CLAIM_BLOCK, QUOTE_BLOCK, GLOSS_BLOCK })) {
    assert.equal(block, handoff.split(name + ':\n```\n')[1].split('\n```')[0]);
    assert.doesNotMatch(block, /빨간|옷|공손룡|묵가|명실|흰 말/u);
  }
  assert.equal(instructionsFor(v5, 'v5'), v5);
  assert.equal(instructionsFor(v5, 'v5_methods'), v5 + '\n\n' + CLAIM_BLOCK + '\n\n' + QUOTE_BLOCK);
  assert.equal(instructionsFor(v5, 'v5_methods_gloss'), instructionsFor(v5, 'v5_methods') + '\n\n' + GLOSS_BLOCK);
});
test('확장 스키마는 운영 필드를 보존하고 strict required 주장 필드만 추가한다', () => {
  const extended = extendedSelectionSchema(schema);
  assert.equal(extended.additionalProperties, false);
  assert.deepEqual(extended.required, [...schema.required, 'studentClaims']);
  assert.deepEqual(Object.fromEntries(Object.entries(extended.properties).filter(([k]) => k !== 'studentClaims')), schema.properties);
  const item = extended.properties.studentClaims.items;
  assert.equal(item.additionalProperties, false);
  assert.equal(item.required.length, 5);
  assert.ok(Object.values(item.properties).every(x => x.type === 'string'));
  assert.deepEqual(schema, z.toJSONSchema(FeedbackSelectionAssessmentSchema));
});
test('세 반복 해석본의 원문 결속·금지 키 검사', () => {
  for (const r of [1, 2, 3]) {
    const run = read(`docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07/pipeline-run${r}.json`);
    assert.equal(run.gloss.sourceBinding.sha256, sourceBindingSha256(source));
    assert.doesNotThrow(() => assertJudgePayload(run.judgePayload));
  }
  for (const key of ['choiceReadings', 'answerKey', 'keyForcedOnly', 'instances']) {
    assert.throws(() => assertJudgePayload({ markers: [{ [key]: [] }] }), /Forbidden/u);
  }
});
test('같은 칸 세 조건 운영 입력 동일·gloss만 추가·기타 콘텐츠 순서 보존', () => {
  for (const text of Object.values(responses)) {
    const inputs = ARMS.map(arm => feedbackRequestContent(session(text, arm)));
    assert.deepEqual(inputs[0], inputs[1]); assert.deepEqual(inputs[0], inputs[2]);
    const req = { instructions: baseline, input: [{ role: 'user', content: [...inputs[0],
      { type: 'input_image', image_url: 'data:image/png;base64,fake' }, { type: 'input_text', text: 'retry feedback' }] }],
      text: { format: { name: 'problem_feedback_v4_assessment', schema } } };
    const before = structuredClone(req);
    for (const arm of ARMS) {
      const out = transformRequest(req, options(arm));
      assert.equal(out.instructions, instructionsFor(v5, arm));
      assert.deepEqual(out.text.format.schema, arm === 'v5' ? schema : extendedSelectionSchema(schema));
      if (arm !== 'v5_methods_gloss') assert.deepEqual(out.input, req.input);
      else {
        const { markerGloss, ...input } = JSON.parse(out.input[0].content[0].text);
        assert.deepEqual(markerGloss, gloss); assert.deepEqual(input, JSON.parse(inputs[0][0].text));
        assert.deepEqual(out.input[0].content.slice(1), req.input[0].content.slice(1));
      }
    }
    assert.deepEqual(req, before);
  }
});
test('CONCLUSION_AUDIT·COACHING은 지시·스키마·입력 모두 그대로다', () => {
  for (const kind of ['conclusion_audit', 'coaching']) for (const arm of ARMS) {
    const req = { instructions: 'original', text: { format: { name: `problem_feedback_v4_${kind}`, schema: {} } }, input: [] };
    assert.equal(transformRequest(req, options(arm)), req);
  }
});
test('운영 지시 불일치 시 RUN_LIMIT', () => {
  assert.throws(() => transformRequest({ instructions: 'changed', text: { format: { name: 'problem_feedback_v4_assessment' } } }, options('v5')), /RUN_LIMIT:/u);
});
test('정상 주장과 자체 점검', () => { assert.doesNotThrow(claimSelfCheck); assert.equal(validateClaims(assessment(), observations).length, 1); });
test('공백 정규화된 인용은 허용한다', () => { const a = assessment(); a.studentClaims[0].quote = '서로\n 다르다'; assert.doesNotThrow(() => validateClaims(a, observations)); });
test('빈 주장·잘못된 구조·발화 밖 인용·다른 observation을 거부한다', () => {
  rejection({ ...assessment(), studentClaims: [] });
  for (const extra of [{ quote: '' }, { quote: '없는 발화' }, { observationId: 'o2' }, { sourceCheck: 'OTHER' }, { extra: true }]) {
    rejection({ ...assessment(), studentClaims: [{ ...claim(), ...extra }] });
  }
});
test('CONTRADICTED 주장에 대응 오류가 없으면 거부한다', () => {
  rejection({ ...assessment(), studentClaims: [claim('서로 다르다', 'CONTRADICTED')] });
});
test('오류에 CONTRADICTED 주장이 없거나 observation이 다르면 거부한다', () => {
  const error = { studentEvidence: [{ observationId: 'o1', quote: '서로 다르다' }] };
  rejection({ ...assessment(), errors: [error] });
  rejection({ ...assessment(), studentClaims: [claim('서로 다르다', 'CONTRADICTED')], errors: [{ studentEvidence: [{ observationId: 'o2', quote: '서로 다르다' }] }] });
});
test('CONTRADICTED 없는 ERROR를 거부한다', () => rejection({ ...assessment(), contentAssessment: 'ERROR' }));
test('겹치는 인용의 양방향 대응을 허용한다', () => {
  for (const quote of ['서로', '대상이 서로 다르다']) {
    const a = { ...assessment(), contentAssessment: 'ERROR', studentClaims: [claim('서로 다르다', 'CONTRADICTED')],
      errors: [{ studentEvidence: [{ observationId: 'o1', quote }] }] };
    assert.doesNotThrow(() => validateClaims(a, observations));
  }
});
test('UNKNOWN은 오류 대응 검사를 건너뛰되 발화 인용은 검사한다', () => {
  const a = { ...assessment(), reconstructability: 'UNKNOWN', contentAssessment: 'ERROR' };
  assert.doesNotThrow(() => validateClaims(a, observations));
  rejection({ ...a, studentClaims: [claim('없는 발화')] });
});
test('해석본 referentHere 6자 경계·질문/불일치질문/코칭만 검사한다', () => {
  const payload = { markers: [{ referentHere: '가나다라마바사아자' }] };
  assert.equal(glossVerbatimInStudentText({ reason: '가나다라마바사아자', coaching: '가나다라마' }, payload).detected, false);
  for (const a of [{ errors: [{ question: '나 다 가나다라마바인가요?' }] }, { selectionMismatchQuestion: '가나다라마바' }, { coaching: '가나다라마바' }]) {
    assert.deepEqual(glossVerbatimInStudentText(a, payload), { detected: true, strings: ['가나다라마바'] });
  }
});
test('일정은 72개 고유 칸·반복별 응답 회전·조건별 위치 균형', () => {
  const types = Object.keys(responses), schedule = makeSchedule(types);
  assert.equal(schedule.length, 72);
  assert.equal(new Set(schedule.map(c => JSON.stringify(c))).size, 72);
  for (const r of [1, 2, 3]) assert.equal(schedule.find(c => c.r === r).type, types[r - 1]);
  for (const type of types) for (let pos = 0; pos < 3; pos++) {
    assert.equal(new Set([1, 2, 3].map(r => schedule.filter(c => c.r === r && c.type === type)[pos].arm)).size, 3);
  }
});
test('운영 평가기는 주장 계약 실패를 한 번 재시도하고 원래 strict 스키마로 적용한다', async () => {
  const s = session(), requests = []; let count = 0;
  const evaluator = new OpenAIFeedbackEvaluator({ maxRetries: 1, transport: { async create(request) {
    requests.push(transformRequest(request, options('v5_methods_gloss')));
    const output = { ...validOutput(s), studentClaims: [claim(++count === 1 ? '발화에 없음' : responses.S1)] };
    validateClaims(output, [{ observationId: 'o1', text: responses.S1 }]);
    const { studentClaims: _, ...rest } = output;
    return { status: 'completed', output_text: JSON.stringify(rest) };
  } } });
  const call = await evaluator.evaluate(s);
  assert.equal(count, 2);
  assert.match(requests[1].input[0].content.at(-1).text, /CLAIMS_CONTRACT/u);
  assert.deepEqual(call.metadata.attempts.map(a => a.outcome), ['ERROR', 'SUCCESS']);
  assert.equal(applyFeedbackAssessment(s, call.rawOutput).result.outcome, 'VERIFIED_CORRECT');
});
test('운영 독립 결론 확인도 원래 입력과 스키마로 실행한다', async () => {
  const s = session(); const kinds = [];
  const evaluator = new OpenAIFeedbackEvaluator({ transport: { async create(request) {
    const out = transformRequest(request, options('v5_methods_gloss'));
    kinds.push(request.text.format.name);
    if (request.text.format.name.endsWith('conclusion_audit')) {
      assert.equal(out, request);
      return { status: 'completed', output_text: JSON.stringify({ rationaleImpliedVerdict: 'VALID', studentEvidence: [{ observationId: 'o1', quote: responses.S1 }], reason: '독립 확인' }) };
    }
    return { status: 'completed', output_text: JSON.stringify({ ...validOutput(s), rationaleImpliedVerdict: 'VALID', selectionMismatchQuestion: '판단한 내용을 다시 설명해 주세요.' }) };
  } } });
  await evaluator.evaluate(s);
  assert.deepEqual(kinds, ['problem_feedback_v4_assessment', 'problem_feedback_v4_conclusion_audit']);
});
