import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, FeedbackSelectionAssessmentSchema, createFeedbackSession,
  submitFeedbackCommand, feedbackRequestContent, OpenAIFeedbackEvaluator, applyFeedbackAssessment } from '../../packages/pipeline/dist/index.js';
import { main } from '../test-v5-substitution-check-gongsun.mjs';
import { instructionsFor as baseInstructions, extendedSelectionSchema, validateClaims } from './v5-marker-judgment.mjs';
import { ARMS, CHECKS, SUBST_BLOCK, instructionsFor, selectionSchemaFor, transformRequest,
  validateSubstitutionClaims, substitutionSelfCheck, makeSchedule, expectedChecks, summarizeRows,
  faithfulSpans, substitutionDistribution } from './v5-substitution-check.mjs';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const base = read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json');
const product = read('packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json');
const source = SourceDirectProblemBundleSchema.parse({ ...base, passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
const baseline = readFileSync('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md', 'utf8');
const v5 = readFileSync('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md', 'utf8');
const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema);
const sourceSentence = 'ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.';
const substitution = (text = '옷장에 있는 옷') => ({ substitutedText: sourceSentence.replace('ⓓ옷', `ⓓ옷(${text})`),
  ...Object.fromEntries(CHECKS.map(k => [k, { result: 'PASS', basis: '원문 확인' }])) });
const claim = (quote = 'd는 옷장에 있는 옷') => ({ observationId: 'o1', quote, claimAsStated: quote,
  sourceCheck: 'CONSISTENT', sourceBasis: '원문 확인', substitution: substitution() });
const assessment = () => ({ reconstructability: 'RECONSTRUCTABLE', contentAssessment: 'SUPPORTED', errors: [], studentClaims: [claim()] });
const observations = [{ observationId: 'o1', text: 'd는 옷장에 있는 옷' }];
const validate = a => validateSubstitutionClaims(a, observations, source);
const options = arm => ({ arm, baseline, instructions: instructionsFor(v5, arm), selectionSchema: schema });
const temp = t => { const dir = mkdtempSync(join(tmpdir(), 'v5-substitution-test-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; };

test('SUBST_BLOCK 원문 일치·문항 내용 없음·두 조건 지시 정확한 연결', () => {
  const handoff = readFileSync('docs/handoffs/2026-10-07-v5-substitution-check-gongsun.md', 'utf8');
  assert.equal(SUBST_BLOCK, handoff.split('### 3. SUBST_BLOCK(문구 그대로)\n\n```\n')[1].split('\n```')[0]);
  assert.doesNotMatch(SUBST_BLOCK, /빨간|옷|공손룡|묵가|명실|흰 말/u);
  assert.equal(instructionsFor(v5, 'methods'), baseInstructions(v5, 'v5_methods'));
  assert.equal(instructionsFor(v5, 'methods_subst'), instructionsFor(v5, 'methods') + '\n\n' + SUBST_BLOCK);
});
test('strict 스키마: 기존 필드 보존·substitution 필수·null 또는 strict 객체', () => {
  assert.deepEqual(selectionSchemaFor(schema, 'methods'), extendedSelectionSchema(schema));
  const extended = selectionSchemaFor(schema, 'methods_subst');
  const item = extended.properties.studentClaims.items;
  assert.equal(item.additionalProperties, false);
  assert.deepEqual(item.required, [...extendedSelectionSchema(schema).properties.studentClaims.items.required, 'substitution']);
  const [nullable, object] = item.properties.substitution.anyOf;
  assert.deepEqual(nullable, { type: 'null' });
  assert.equal(object.additionalProperties, false);
  assert.deepEqual(object.required, ['substitutedText', ...CHECKS]);
  for (const k of CHECKS) {
    assert.equal(object.properties[k].additionalProperties, false);
    assert.deepEqual(object.properties[k].required, ['result', 'basis']);
    assert.deepEqual(object.properties[k].properties.result.enum, ['PASS', 'FAIL', 'UNCLEAR']);
  }
  delete item.properties.substitution; item.required.pop();
  assert.deepEqual(extended, extendedSelectionSchema(schema));
  assert.deepEqual(schema, z.toJSONSchema(FeedbackSelectionAssessmentSchema));
});
test('같은 칸 두 조건 운영 입력 동일·이미지 및 재시도 입력 보존·해석본 없음', () => {
  const responses = read('docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json').responses;
  for (const text of Object.values(responses)) {
    const inputs = ARMS.map(arm => feedbackRequestContent(submitFeedbackCommand(createFeedbackSession(arm, source),
      { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text } }, 'o1')));
    assert.deepEqual(inputs[0], inputs[1]);
    const request = { instructions: baseline, input: [{ role: 'user', content: [...inputs[0], { type: 'input_text', text: 'retry feedback' }] }],
      text: { format: { name: 'problem_feedback_v4_assessment', schema } } };
    const before = structuredClone(request);
    for (const arm of ARMS) {
      const out = transformRequest(request, options(arm));
      assert.deepEqual(out.input, request.input);
      assert.equal(out.instructions, instructionsFor(v5, arm));
      assert.deepEqual(out.text.format.schema, selectionSchemaFor(schema, arm));
      assert.ok(!Object.hasOwn(JSON.parse(out.input[0].content[0].text), 'markerGloss'));
    }
    assert.deepEqual(request, before);
  }
});
test('CONCLUSION_AUDIT·COACHING 무변경 및 baseline 불일치 차단', () => {
  for (const kind of ['conclusion_audit', 'coaching']) for (const arm of ARMS) {
    const request = { instructions: 'original', input: [], text: { format: { name: `problem_feedback_v4_${kind}`, schema: {} } } };
    assert.equal(transformRequest(request, options(arm)), request);
  }
  assert.throws(() => transformRequest({ instructions: 'wrong', text: { format: { name: 'problem_feedback_v4_assessment' } } }, options('methods')), /RUN_LIMIT/);
});
test('자체 점검: 인계 정상 대사 통과·네 위반 예 거부', () => assert.doesNotThrow(() => substitutionSelfCheck(source)));
test('5키 기존 검증은 복사본에만 적용·원본 불변·null 허용', () => {
  const a = assessment(), before = structuredClone(a);
  assert.throws(() => validateClaims(a, observations), /invalid claim structure/);
  assert.equal(validate(a), a.studentClaims);
  assert.deepEqual(a, before);
  a.studentClaims[0].substitution = null;
  assert.doesNotThrow(() => validate(a));
});
test('substitution 누락·undefined·잘못된 구조 및 추가 키 거부', () => {
  for (const value of [undefined, [], '', 3, {}, { ...substitution(), extra: 1 }, { ...substitution(), contextCheck: { result: 'OTHER', basis: '' } }]) {
    const a = assessment(); a.studentClaims[0].substitution = value;
    assert.throws(() => validate(a), /SUBSTITUTION_INVALID_STRUCTURE/);
  }
  const a = assessment(); delete a.studentClaims[0].substitution;
  assert.throws(() => validate(a), /missing substitution/);
  a.studentClaims[0].substitution = null; a.studentClaims[0].extra = true;
  assert.throws(() => validate(a), /invalid claim structure/);
});
test('FAIL 우선·UNCLEAR·모두 PASS 판정 규칙의 모든 조합 검증', () => {
  for (const x of ['PASS', 'FAIL', 'UNCLEAR']) for (const y of ['PASS', 'FAIL', 'UNCLEAR']) for (const z of ['PASS', 'FAIL', 'UNCLEAR']) {
    const results = [x, y, z];
    const correct = results.includes('FAIL') ? 'CONTRADICTED' : results.includes('UNCLEAR') ? 'UNDETERMINED' : 'CONSISTENT';
    for (const sourceCheck of ['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED']) {
      const a = assessment(), c = a.studentClaims[0]; c.sourceCheck = sourceCheck;
      CHECKS.forEach((k, i) => { c.substitution[k].result = results[i]; });
      if (sourceCheck === 'CONTRADICTED') { a.contentAssessment = 'ERROR'; a.errors = [{ studentEvidence: [{ observationId: 'o1', quote: c.quote }] }]; }
      if (correct === sourceCheck) assert.doesNotThrow(() => validate(a));
      else assert.throws(() => validate(a), /SUBSTITUTION_SOURCE_CHECK_MISMATCH/);
    }
  }
});
test('학생 미발화 만·오직 및 원문 밖 문장 거부', () => {
  for (const text of ['옷장에 있는 옷만', '오직 옷장에 있는 옷']) {
    const a = assessment(); a.studentClaims[0].substitution = substitution(text);
    assert.throws(() => validate(a), /SUBSTITUTION_NOT_FAITHFUL/);
  }
  const a = assessment(); a.studentClaims[0].substitution.substitutedText += '추가 문장';
  assert.throws(() => validate(a), /SUBSTITUTION_NOT_FAITHFUL/);
});
test('공백·따옴표 정규화 및 passage 대조 허용·학생이 쓴 만 보존', () => {
  const c = claim('d는 옷장 안에 있는 옷만'); c.substitution = substitution('  옷장 안에\n있는 옷만  ');
  c.substitution.substitutedText = '“' + c.substitution.substitutedText + '”';
  const a = { ...assessment(), studentClaims: [c] };
  assert.doesNotThrow(() => validateSubstitutionClaims(a, [{ observationId: 'o1', text: c.quote }], { scenario: '', passage: sourceSentence }));
});
test('여러 괄호는 같은 구간이 인용·원문 조건을 모두 만족해야 한다', () => {
  const c = claim('d는 옷'); c.substitution.substitutedText = '본문(옷)과 (다른 것)';
  assert.equal(faithfulSpans(c, { scenario: '본문과 (다른 것)' }).length, 1);
  assert.equal(faithfulSpans(c, { scenario: '본문(옷)과' }).length, 0);
  c.quote = '겉(속)'; c.substitution.substitutedText = '본문(겉(속))';
  assert.equal(faithfulSpans(c, { passage: '본문' }).length, 1);
});
test('기존 주장 인용·오류 대응 계약도 유지', () => {
  for (const mutate of [a => { a.studentClaims[0].quote = '발화에 없음'; }, a => { a.contentAssessment = 'ERROR'; },
    a => { a.studentClaims[0].sourceCheck = 'CONTRADICTED'; }, a => { a.errors = [{ studentEvidence: [{ observationId: 'o1', quote: '옷' }] }]; }]) {
    const a = assessment(); mutate(a); assert.throws(() => validate(a), /CLAIMS_CONTRACT:/);
  }
});
test('66개 고유 칸·응답 회전·조건 순서 교대', () => {
  const types = ['S1','S2','S3','S4','S5','S6','S7','S8','X1','X2','X3'];
  const schedule = makeSchedule(types);
  assert.equal(schedule.length, 66); assert.equal(new Set(schedule.map(JSON.stringify)).size, 66);
  for (const r of [1,2,3]) {
    const rows = schedule.filter(c => c.r === r); assert.equal(rows[0].type, types[r-1]);
    for (const type of types) assert.deepEqual(new Set(rows.filter(c => c.type === type).map(c => c.arm)), new Set(ARMS));
  }
  for (const type of types) assert.notEqual(schedule.find(c => c.r === 1 && c.type === type).arm, schedule.find(c => c.r === 2 && c.type === type).arm);
});
test('경계 응답 허용 결과와 상태 연결·경계 별도 집계·대입 분포와 비율', () => {
  const expected = { reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'INVALID', contentAssessment: ['SUPPORTED', 'ERROR'] };
  for (const contentAssessment of expected.contentAssessment) {
    const actual = { reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'INVALID', contentAssessment,
      phase: contentAssessment === 'SUPPORTED' ? 'COMPLETED' : 'AWAITING_CORRECTION', outcome: contentAssessment === 'SUPPORTED' ? 'VERIFIED_CORRECT' : null };
    assert.ok(Object.values(expectedChecks(actual, expected, 'VALID')).every(Boolean));
    assert.equal(expectedChecks({ ...actual, phase: 'WRONG' }, expected, 'VALID').phase, false);
  }
  const c = claim('d는 옷장 안에 있는 옷만'); c.substitution = substitution('옷장 안에 있는 옷만');
  const row = { arm: 'methods_subst', type: 'X2', status: 'VALID', expectedMatch: true, checks: {}, studentClaims: [c], claimAttempts: [] };
  const summary = summarizeRows([row, { ...row, type: 'S5', studentClaims: [claim()] }], [{ type: 'X2', boundary: true }, { type: 'S5' }], source);
  assert.equal(summary.byArm.methods_subst.boundary.cells, 1);
  assert.equal(summary.byArm.methods_subst.nonBoundary.cells, 1);
  assert.equal(summary.x2DOnlyRate.ratio, 1); assert.equal(summary.s5DAddedRestrictionRate.ratio, 0);
  assert.equal(substitutionDistribution([c, { substitution: null }]).contextCheck.PASS, 1);
});

function assertSchema(value, schema) {
  if (schema.anyOf) { assert.ok(schema.anyOf.some(s => { try { assertSchema(value, s); return true; } catch { return false; } })); return; }
  if (schema.type === 'null') { assert.equal(value, null); return; }
  if (schema.type === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value));
    for (const k of schema.required ?? []) assert.ok(Object.hasOwn(value, k), `required ${k}`);
    if (schema.additionalProperties === false) for (const k of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties, k), `unexpected ${k}`);
    for (const [k, v] of Object.entries(value)) if (schema.properties?.[k]) assertSchema(v, schema.properties[k]);
  } else if (schema.type === 'array') { assert.ok(Array.isArray(value)); for (const v of value) assertSchema(v, schema.items); }
  else if (schema.type) assert.equal(typeof value, schema.type);
  if (schema.enum) assert.ok(schema.enum.includes(value));
  if (Object.hasOwn(schema, 'const')) assert.equal(value, schema.const);
}
function fakeTransport() {
  let requests = 0, injected = false;
  return { get requests() { return requests; }, async create(request) {
    requests++;
    assert.equal(request.text.format.name, 'problem_feedback_v4_assessment');
    const input = JSON.parse(request.input[0].content[0].text);
    assert.ok(!Object.hasOwn(input, 'markerGloss'));
    assert.ok(!Object.hasOwn(input, 'expected'));
    const quote = input.observations[0].command.rationale.text;
    const subst = Object.hasOwn(request.text.format.schema.properties.studentClaims.items.properties, 'substitution');
    const c = claim(quote);
    c.substitution = quote.includes('옷장에 있는 옷') ? substitution()
      : quote.includes('옷장 안에 있는 옷만') ? substitution('옷장 안에 있는 옷만') : null;
    if (subst && quote.includes('옷장에 있는 옷') && !injected) {
      c.substitution = substitution('옷장에 있는 옷만'); injected = true;
    }
    if (!subst) delete c.substitution;
    const output = { mode: 'SELECTION', boundary: 'NONE', reason: '학생 발화를 대조했다.', reconstructability: 'RECONSTRUCTABLE',
      reconstructedPath: [quote], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'SUPPORTED',
      studentEvidence: [{ observationId: 'o1', quote }],
      sourceEvidence: [{ location: 'SCENARIO', quote: source.scenario, mediaId: null, visualObservation: null }],
      errors: [], selectionMismatchQuestion: null, coaching: '원문과 판단 근거를 확인했습니다.', studentClaims: [c] };
    assertSchema(output, request.text.format.schema);
    return { id: `fake-${requests}`, model: 'fake', status: 'completed', output_text: JSON.stringify(output),
      usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 20 }, output_tokens: 10 } };
  } };
}
test('가짜 전송 66칸 run·대입 계약 1회 재시도·원장 재개 시 새 요청 0', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network forbidden in fake run'); });
  const dir = temp(t), transport = fakeTransport();
  await main({ mode: 'prepare', dir, transport });
  const frozen = readFileSync(`${dir}/FROZEN.json`, 'utf8');
  await main({ mode: 'prepare', dir, transport });
  assert.equal(readFileSync(`${dir}/FROZEN.json`, 'utf8'), frozen); assert.equal(transport.requests, 0);
  const first = await main({ mode: 'run', dir, transport });
  assert.equal(first.completedCells, 66); assert.equal(first.requests, 67); assert.equal(first.evaluationErrors, 0);
  assert.equal(first.claimContractFailures, 1); assert.equal(first.claimContractRetries, 1);
  assert.equal(first.substitutionContractFailures, 1); assert.equal(first.substitutionContractRetries, 1);
  assert.equal(first.x2DOnlyRate.ratio, 1); assert.equal(first.s5DAddedRestrictionRate.ratio, 0);
  assert.equal(first.stop, null); assert.ok(Math.abs(first.estimatedUsd - 67 * 0.000284) < 1e-12);
  const cell = read(`${dir}/methods_subst-S5-r1.json`);
  assert.equal(cell.firstSubstitutionContractViolation, 'CLAIMS_CONTRACT: SUBSTITUTION_NOT_FAITHFUL');
  assert.deepEqual(cell.attempts.map(a => a.outcome), ['ERROR', 'SUCCESS']);
  assert.equal(cell.studentClaims[0].substitution.substitutedText, substitution().substitutedText);
  const ledger = readFileSync(`${dir}/requests.jsonl`, 'utf8');
  assert.equal(ledger.split('\n').filter(Boolean).length, 134);
  const second = await main({ mode: 'run', dir, transport });
  assert.equal(second.newRequests, 0); assert.equal(transport.requests, 67);
  assert.equal(readFileSync(`${dir}/requests.jsonl`, 'utf8'), ledger);
});
test('미종결 START 원장에서는 run 시작 전 차단', async t => {
  const dir = temp(t), transport = fakeTransport(); await main({ mode: 'prepare', dir, transport });
  appendFileSync(`${dir}/requests.jsonl`, JSON.stringify({ event: 'START', requestId: 'pending' }) + '\n');
  await assert.rejects(main({ mode: 'run', dir, transport }), /START without END/);
  assert.equal(transport.requests, 0);
});
test('동결 불일치는 prepare·run 모두 거부하고 파일을 보존', async t => {
  const dir = temp(t), transport = fakeTransport(); await main({ mode: 'prepare', dir, transport });
  writeFileSync(`${dir}/prompts.json`, '{}\n');
  for (const mode of ['prepare', 'run']) await assert.rejects(main({ mode, dir, transport }), /Frozen artifact changed: prompts.json/);
  assert.equal(readFileSync(`${dir}/prompts.json`, 'utf8'), '{}\n'); assert.equal(transport.requests, 0);
  assert.equal(existsSync(`${dir}/requests.jsonl`), false);
});

test('가짜 ERROR 출력은 대입 FAIL·오류 대응 검증 후 AWAITING_CORRECTION', async () => {
  const quote = 'd는 옷장에 있는 옷';
  const session = submitFeedbackCommand(createFeedbackSession('fake-error', source),
    { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text: quote } }, 'o1');
  const evaluator = new OpenAIFeedbackEvaluator({ transport: { async create(request) {
    const out = transformRequest(request, options('methods_subst'));
    const c = claim(); c.sourceCheck = 'CONTRADICTED'; c.substitution.contextCheck.result = 'FAIL';
    const studentEvidence = [{ observationId: 'o1', quote }];
    const sourceEvidence = [{ location: 'SCENARIO', quote: source.scenario, mediaId: null, visualObservation: null }];
    const output = { mode: 'SELECTION', boundary: 'NONE', reason: '가짜 오류', reconstructability: 'RECONSTRUCTABLE',
      reconstructedPath: [quote], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'ERROR', studentEvidence, sourceEvidence,
      errors: [{ errorId: 'e1', description: '가짜 오류', studentEvidence, sourceEvidence, question: '판단한 내용을 다시 설명해 주세요.' }],
      selectionMismatchQuestion: null, coaching: '원문과 판단 근거를 확인했습니다.', studentClaims: [c] };
    assertSchema(output, out.text.format.schema);
    validateSubstitutionClaims(output, observations, source);
    const { studentClaims: _, ...rest } = output;
    return { status: 'completed', output_text: JSON.stringify(rest) };
  } } });
  const call = await evaluator.evaluate(session);
  assert.equal(applyFeedbackAssessment(session, call.rawOutput).phase, 'AWAITING_CORRECTION');
});
test('가짜 CONCLUSION_AUDIT도 원래 지시·스키마·입력으로 실행', async () => {
  const text = 'd는 옷장에 있는 옷';
  const session = submitFeedbackCommand(createFeedbackSession('fake-audit', source),
    { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text } }, 'o1');
  const kinds = [];
  const evaluator = new OpenAIFeedbackEvaluator({ transport: { async create(request) {
    const out = transformRequest(request, options('methods_subst')); kinds.push(request.text.format.name);
    const studentEvidence = [{ observationId: 'o1', quote: text }];
    if (request.text.format.name.endsWith('conclusion_audit')) {
      assert.equal(out, request);
      return { status: 'completed', output_text: JSON.stringify({ rationaleImpliedVerdict: 'VALID', studentEvidence, reason: '가짜 독립 확인' }) };
    }
    const output = { mode: 'SELECTION', boundary: 'NONE', reason: '가짜 확인', reconstructability: 'RECONSTRUCTABLE',
      reconstructedPath: [text], rationaleImpliedVerdict: 'VALID', contentAssessment: 'SUPPORTED', studentEvidence,
      sourceEvidence: [{ location: 'SCENARIO', quote: source.scenario, mediaId: null, visualObservation: null }], errors: [],
      selectionMismatchQuestion: '판단한 내용을 다시 설명해 주세요.', coaching: '원문과 판단 근거를 확인했습니다.', studentClaims: [claim()] };
    assertSchema(output, out.text.format.schema); validate(output);
    const { studentClaims: _, ...rest } = output;
    return { status: 'completed', output_text: JSON.stringify(rest) };
  } } });
  await evaluator.evaluate(session);
  assert.deepEqual(kinds, ['problem_feedback_v4_assessment', 'problem_feedback_v4_conclusion_audit']);
});
test('요청 상한·비용 상한 도달 시 전송 없이 BUDGET_STOP 저장', async t => {
  for (const limit of ['requests', 'cost']) {
    const dir = temp(t), transport = fakeTransport(); await main({ mode: 'prepare', dir, transport });
    const events = Array.from({ length: limit === 'requests' ? 150 : 1 }, (_, i) => [
      { event: 'START', requestId: `seed-${i}`, reservedUsd: 0 },
      { event: 'END', requestId: `seed-${i}`, estimatedUsd: limit === 'cost' ? 2.5 : 0 },
    ]).flat();
    writeFileSync(`${dir}/requests.jsonl`, events.map(x => JSON.stringify(x)).join('\n') + '\n');
    const result = await main({ mode: 'run', dir, transport });
    assert.equal(transport.requests, 0); assert.equal(result.newRequests, 0);
    assert.match(result.stop, /request\/cost limit/); assert.equal(result.completedCells, 1);
    assert.equal(read(`${dir}/methods_subst-S1-r1.json`).status, 'BUDGET_STOP');
  }
});
test('가짜 전송 오류 기록·END 없는 원장은 다음 run 차단', async t => {
  const dir = temp(t); await main({ mode: 'prepare', dir });
  let count = 0;
  const transport = { async create() { count++; throw new Error('FAKE_TRANSPORT_ERROR'); } };
  await main({ mode: 'run', dir, transport });
  const ledger = readFileSync(`${dir}/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(ledger.some(e => e.event === 'TRANSPORT_ERROR'));
  assert.ok(!ledger.some(e => e.event === 'END'));
  const before = count;
  await assert.rejects(main({ mode: 'run', dir, transport }), /START without END/);
  assert.equal(count, before);
});
