// 공손룡 12번: 학생 주장 분리(B 방식) 판정에 기호 해석본을 넣지 않음(none) / 기호 해석만(gloss_markers) /
// 기호 해석+선지 해석(gloss_full) 세 조건으로 학생 응답 다섯 유형을 채점한다. 원문은 운영 원문(기호 문자 포함).
// 해석본 조건은 최초 평가와 질문 단계 모두에 해석본과 사용 규칙을 넣는다. prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput, OpenAISourceDirectProblemEvaluator,
  createSourceDirectProblemRequestContent, SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';
import { validateMarkerGloss } from './lib/marker-gloss-validation.mjs';

const DIR = 'docs/experiments/gongsun-gloss-arms-2026-10-06';
const PREV = 'docs/experiments/gongsun-response-types-2026-10-06';
const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
// 정답·해설이 있는 실험 원자료에서 지문·보기·기호 위치만 운영 원문(기호 문자 포함, 실험용 태그 없음)으로 바꾼다.
const product = read(`${FIX}/public/gongsun-long-later-mohists-q12.json`);
const base = read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json');
const source = SourceDirectProblemBundleSchema.parse({ ...base, passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
const answerKeyFile = read(`${FIX}/gongsun-long-later-mohists-q12.json`);
const answerKey = { answerChoiceId: answerKeyFile.answerChoiceId, stemPolarity: answerKeyFile.stemPolarity };
if (source.answerChoiceId !== answerKey.answerChoiceId || source.stemPolarity !== answerKey.stemPolarity || source.stem !== product.stem
  || JSON.stringify(source.choices.map(c => [c.choiceId, c.text])) !== JSON.stringify(product.choices.map(c => [c.choiceId, c.text]))) throw new Error('Source assembly mismatch');
const gloss = read(`${FIX}/marker-glosses/gongsun-long-later-mohists-q12.json`);
const glossProblems = validateMarkerGloss(gloss, source, answerKey);
if (glossProblems.length) throw new Error(`Marker gloss invalid: ${glossProblems.join(', ')}`);
const reversed = read('docs/experiments/gongsun-marker-input-ab-2026-10-02/cases.json').cases.find(x => x.id === 'G-error');
// 학생 응답 네 유형. 모두 ④(C4) 선택. 기대 판정은 FROZEN에만 기록하고 API 입력에는 넣지 않는다.
const responses = {
  S1: 'd는 색을 한정하지 않은 일반적인 옷, e는 빨간 옷을 가리켜요. 서로 다른 대상이니까 같다고 한 4번은 틀렸어요.',
  S2: reversed.rationale,
  S3: 'd는 색을 한정하지 않은 일반적인 옷이고, e는 파란 옷을 가리켜요. 서로 다른 대상이니까 4번은 틀렸어요.',
  S4: 'd와 e는 서로 다른 대상을 가리키니까 같다고 한 4번은 틀렸어요.',
  // 2026-10-02 개발자 UI에서 프로젝트 사용자가 실제로 제출한 응답(memory/checkpoints/2026-10-02-gongsun-q12-v4-user-review.md).
  S5: "d는 '옷장에 있는 옷', e는 '빨간 옷'을 지시 -> 다른 대상 지시.",
};
const choiceId = reversed.choiceId;
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md';
const originalPrompt = readFileSync(promptPath, 'utf8');
if (hash(originalPrompt) !== '3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff') throw new Error('Original v3 changed');

// B 조건 추가 지시. 문항별 의미(d/e의 정답 대응)는 넣지 않는다.
const splitInstruction = `## 실험용 학생 주장 분리 기록
최종 assessment를 정하기 전에 다음 두 가지를 따로 기록한다.
1. studentClaims: 학생 발화에서 학생이 명시한 판단을 의미 단위로 나누어 빠짐없이 적는다. 각 항목은 observationId, 해당 학생 발화에서 정확히 복사한 quote, 학생이 말한 대상·관계 방향·조건·대응 순서를 바꾸지 않고 다시 쓴 claimAsStated, 원문 대조 결과 sourceCheck, 그 근거 sourceBasis를 가진다.
   claimAsStated에는 평가자가 원문에서 확인한 해석을 넣지 않는다. 학생이 말한 것을 그대로 옮기며, 원문과 다르더라도 고치지 않는다.
   sourceCheck는 원문과 일치하면 CONSISTENT, 원문과 명시적으로 충돌하면 CONTRADICTED, 원문만으로 판단할 수 없으면 UNDETERMINED다.
   각 항목은 독립적으로 판정한다. 다른 항목의 정오나 학생 선택의 정오를 이유로 한 항목의 판정을 바꾸지 않는다.
2. selectionSupport: CONTRADICTED 항목을 제외하고 남은 학생 판단만으로 현재 선택을 지지하기에 충분하면 SUFFICIENT, 부족하면 INSUFFICIENT다. CONTRADICTED 항목의 유무와 별개로 판단한다.
이어서 evaluation에 원래 평가 모드의 출력을 작성한다. CONTRADICTED 항목이 하나라도 있으면 assessment는 CLEAR_ERROR다. 없으면 selectionSupport가 SUFFICIENT일 때 SUPPORTED, INSUFFICIENT일 때 UNCERTAIN이다. 최상위 출력은 studentClaims, selectionSupport, evaluation을 가진 객체다.`;
const splitPrompt = originalPrompt.trim() + '\n\n' + splitInstruction;

// 해석본 조건의 추가 지시. 문항별 의미는 지시에 넣지 않고 입력 markerGloss로만 전달한다.
const markerFieldKeys = ['name', 'referentHere', 'speaker', 'operator', 'allowedReadings', 'conflictingReadings'];
const glossInstruction = full => [
  '## 기호 해석본 입력',
  `입력 markerGloss는 문항 검토자가 정답·발문·모든 선지를 알고 미리 만들어 확인한 기호 해석본이다. 학생 발화가 아니며 원문도 아니다.${full ? ' choiceReadings는 각 선지를 해석본으로 읽은 내용이다.' : ''}`,
  '칸의 뜻:',
  ...Object.entries(gloss.fieldDefinitions).filter(([k]) => full || !k.startsWith('choiceReadings')).map(([k, v]) => `- ${k}: ${v}`),
  '사용 규칙:',
  ...gloss.usageRules.map(r => `- ${r}`),
  '원문 인용 근거(sourceEvidence)는 원문에서만 가져오고 해석본 문구를 원문처럼 인용하지 않는다. 해석본이 원문과 충돌하면 원문을 우선하고 그 사실을 reason에 적는다.',
  '적용 관계: 이 해석본은 위 지침의 "사전에 가공한 자료는 없다"는 자료 경계에 대한 예외로 추가된 입력이다. 학생 주장 분리 기록의 sourceCheck에서 "원문 대조"는 원문을 이 해석본의 기호 해석과 함께 읽어 판단한다는 뜻이다.',
].join('\n');
const glossPayload = full => ({
  markers: gloss.markers.map(m => ({ marker: m.marker, location: m.location, markedText: m.markedText,
    ...Object.fromEntries(markerFieldKeys.map(k => [k, m[k]])), sourceBasis: m.sourceBasis, note: m.note })),
  ...(full ? { choiceReadings: gloss.choiceReadings.map(r => ({ choiceId: r.choiceId, level: r.level, reading: r.reading, choiceAppropriateUnderGloss: r.choiceAppropriateUnderGloss })) } : {}),
});
const ARMS = { none: null, gloss_markers: false, gloss_full: true };
const instructionsFor = (arm, stage) => {
  const core = stage === 'assessment' ? splitPrompt : originalPrompt.trim();
  return ARMS[arm] === null ? core : core + '\n\n' + glossInstruction(ARMS[arm]);
};
// 학생에게 나가는 문장에 해석본 문구가 그대로 들어갔는지 보는 문자열 신호(의미 누출 판정은 사람 검토).
const glossPhrases = [...gloss.markers.flatMap(m => [m.referentHere, m.note, ...m.allowedReadings, ...m.conflictingReadings]),
  ...gloss.choiceReadings.flatMap(r => r.reading.split(/(?<=다\.)\s*/u))].map(x => x.trim()).filter(x => x.length >= 8);
const glossVerbatim = text => glossPhrases.filter(p => (text ?? '').includes(p));
// 학생에게 나갈 수 있는 문장 전체(질문·안내 메시지).
const studentFacingText = result => [result?.nextAction?.question, result?.nextAction?.message].filter(Boolean).join('\n');
const claimRow = z.object({ observationId: z.string(), quote: z.string(), claimAsStated: z.string(),
  sourceCheck: z.enum(['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED']), sourceBasis: z.string() }).strict();
const splitSchema = z.object({ studentClaims: z.array(claimRow).min(1), selectionSupport: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
  evaluation: SourceDirectRationaleOutputSchema }).strict();

// API 입력의 sessionId에 유형명이 드러나지 않도록 유형·반복에서 만든 불투명 ID를 쓴다.
// 모델 입력의 sessionId는 조건과 무관하게 유형·반복으로만 만든다(조건 간 입력 차이를 해석본 두 가지로 한정).
const opaqueId = (type, r) => `gloss-arms-${hash(`gongsun-gloss-arms:${type}:${r}`).slice(0, 10)}`;
const fresh = (arm, type, r) => submitInitialProblemResponse(createProblemSolvingSession({ sessionId: opaqueId(type, r),
  questionId: source.questionId, answerChoiceId: source.answerChoiceId }), { initialChoiceId: choiceId, rationale: responses[type] });
// 실제 API에 보내는 입력. 실행 경로와 사전 점검이 같은 함수를 쓴다.
const apiInputFor = (arm, evaluatorInput) => {
  const baseInput = JSON.parse(createSourceDirectProblemRequestContent(evaluatorInput)[0].text);
  return ARMS[arm] === null ? baseInput : { ...baseInput, markerGloss: glossPayload(ARMS[arm]) };
};
const inputFor = session => createSourceDirectProblemEvaluatorInput({ session, source, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  evaluationMode: session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT' ? 'ASSESS_SELECTION_RATIONALE' : 'DIAGNOSE_PATH' });

// 제품 textSources와 같은 출처 구분.
const textSources = { PASSAGE: source.passage, STEM: source.stem, SCENARIO: source.scenario,
  CHOICE: source.choices.map(c => c.text).join('\n'), OFFICIAL_EXPLANATION: source.officialExplanation };
// 운영 원문에는 기호 문자(ⓐ 등)가 본문에 있다. 인용에서 기호 문자·공백·인용부호만 빠진 경우를 원문의 유일한 정확 문자열로 복원한다.
const QUOTE_IGNORABLE = /[\s"'‘’“”ⓐ-ⓩ㉠-㉻]/u;
const MARKERS = /[ⓐ-ⓩ㉠-㉻]/gu;
// 인용에 적힌 기호들이 원문 해당 구간의 기호 순서 안에 그대로 있어야 한다(생략만 허용, 다른 기호로 바꿔 쓴 것은 복원하지 않음).
const markersAreOmissionOnly = (quoteMarkers, spanMarkers) => {
  let j = 0; for (const m of quoteMarkers) { while (j < spanMarkers.length && spanMarkers[j] !== m) j += 1; if (j === spanMarkers.length) return false; j += 1; }
  return true;
};
function locateQuote(text, quote) {
  let norm = ''; const offsets = [];
  for (let o = 0; o < text.length;) { const ch = String.fromCodePoint(text.codePointAt(o));
    if (!QUOTE_IGNORABLE.test(ch)) { norm += ch; for (let u = 0; u < ch.length; u += 1) offsets.push(o); } o += ch.length; }
  const target = Array.from(quote).filter(ch => !QUOTE_IGNORABLE.test(ch)).join('');
  if (target.length < 4) return { ok: false };
  const first = norm.indexOf(target);
  if (first < 0 || norm.indexOf(target, first + 1) >= 0) return { ok: false };
  const last = offsets[first + target.length - 1];
  return { ok: true, start: offsets[first], end: last + String.fromCodePoint(text.codePointAt(last)).length };
}
/** 기호 문자·공백·인용부호 차이만 원문의 유일한 정확 문자열로 바꾼다. 의미 필드는 건드리지 않는다. */
function normalizeSourceQuotes(output) {
  const changes = [];
  const sourceEvidence = output.sourceEvidence.map((ev, i) => {
    if (ev.kind !== 'TEXT' || textSources[ev.source].includes(ev.quote)) return ev;
    const found = locateQuote(textSources[ev.source], ev.quote);
    if (!found.ok) return ev; // 제품 검증기가 계약 실패로 처리한다.
    const exact = textSources[ev.source].slice(found.start, found.end);
    if (!markersAreOmissionOnly(ev.quote.match(MARKERS) ?? [], exact.match(MARKERS) ?? [])) {
      changes.push({ field: `sourceEvidence[${i}].quote`, before: ev.quote, after: null, rejected: 'MARKER_SUBSTITUTED' });
      return ev; // 기호를 바꿔 쓴 인용은 고치지 않는다. 제품 검증기가 계약 실패로 처리한다.
    }
    changes.push({ field: `sourceEvidence[${i}].quote`, before: ev.quote, after: exact });
    return { ...ev, quote: exact };
  });
  return { output: { ...output, sourceEvidence }, changes };
}
function validateClaims(claims, observations) {
  if (!Array.isArray(claims) || claims.length === 0) throw new Error('Invalid student claim row');
  for (const c of claims) {
    const o = observations.find(x => x.observationId === c.observationId);
    if (!o || !c.quote.trim() || !o.rationale.includes(c.quote) || !c.claimAsStated.trim() || !c.sourceBasis.trim()) throw new Error('Invalid student claim row');
  }
  return claims;
}
class BudgetStop extends Error {}
class IncompleteRequest extends Error {}
class ApiFailure extends Error {}
class ResponseContractFailure extends Error {}
// 신규 응답과 원장 재사용 응답에 같은 처리: 완료 상태가 아니거나 JSON이 아니면 계약 실패(실행은 계속).
const parseEnd = end => {
  if (end.status && end.status !== 'completed') throw new ResponseContractFailure(`응답 미완료: ${end.status} ${JSON.stringify(end.incompleteDetails ?? null)}`);
  try { return JSON.parse(end.outputText); } catch (e) { throw new ResponseContractFailure(`JSON 파싱 실패: ${e.message}`); }
};
const derivedLabel = (claims, support) => claims.some(c => c.sourceCheck === 'CONTRADICTED') ? 'CLEAR_ERROR'
  : support === 'SUFFICIENT' ? 'SUPPORTED' : 'UNCERTAIN';

// 오프라인 자체 점검: 의미 판정 기대값은 API 입력에 넣지 않는다.
const example = inputFor(fresh('gloss_full', 'S2', 1));
const okClaim = { observationId: 'O1', quote: responses.S2.slice(0, 10), claimAsStated: 'offline', sourceCheck: 'UNDETERMINED', sourceBasis: 'offline' };
validateClaims([okClaim], example.observations);
for (const bad of [[{ ...okClaim, quote: '학생이 말하지 않은 문장' }], [{ ...okClaim, observationId: 'O9' }], [{ ...okClaim, claimAsStated: ' ' }], [{ ...okClaim, quote: '' }], []]) {
  let rejected = false; try { validateClaims(bad, example.observations); } catch { rejected = true; }
  if (!rejected) throw new Error('Claim validator self-test failed');
}
const markerlessQuote = '내 말은 옷이 정말 없다는 게 아니라, 빨간 옷이 필요한데 없다는 말이었어.';
const norm = normalizeSourceQuotes({ sourceEvidence: [{ kind: 'TEXT', source: 'SCENARIO', quote: markerlessQuote }] });
if (norm.changes.length !== 1 || norm.output.sourceEvidence[0].quote !== '내 말은 ⓓ옷이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.') throw new Error('Quote normalization self-test failed');
if (locateQuote(source.scenario, '옷').ok) throw new Error('Ambiguous quote self-test failed');
{ const wrong = normalizeSourceQuotes({ sourceEvidence: [{ kind: 'TEXT', source: 'SCENARIO', quote: '내 말은 ⓔ옷이 정말 없다는 게 아니라' }] });
  if (wrong.output.sourceEvidence[0].quote !== '내 말은 ⓔ옷이 정말 없다는 게 아니라' || wrong.changes[0]?.rejected !== 'MARKER_SUBSTITUTED') throw new Error('Marker substitution self-test failed'); }
if (derivedLabel([{ sourceCheck: 'CONTRADICTED' }], 'SUFFICIENT') !== 'CLEAR_ERROR' || derivedLabel([{ sourceCheck: 'CONSISTENT' }], 'INSUFFICIENT') !== 'UNCERTAIN')
  throw new Error('Derived label self-test failed');
{ let rejected = false; try { splitSchema.parse({ studentClaims: [okClaim], selectionSupport: 'MAYBE', evaluation: {} }); } catch { rejected = true; }
  if (!rejected) throw new Error('Split schema self-test failed'); }
for (const ins of [splitInstruction, glossInstruction(false), glossInstruction(true)]) {
  if (/빨간|옷장|ⓓ|ⓔ|공손룡|묵가/u.test(ins)) throw new Error('Item-specific meaning leaked into instruction');
}
if (!glossVerbatim(`질문 ${gloss.markers[3].referentHere}`).length || glossVerbatim('ⓓ와 ⓔ는 각각 무엇을 가리키나요?').length) throw new Error('Gloss leak check self-test failed');
if ('choiceReadings' in glossPayload(false) || !('choiceReadings' in glossPayload(true))) throw new Error('Gloss payload arm wiring failed');
// ③번 실험과 학생 주장 분리 지시·스키마·S1~S4 응답이 같아야 비교할 수 있다.
const prevFrozen = read(`${PREV}/FROZEN.json`);
if (hash(splitPrompt) !== prevFrozen.promptHashes.split || hash(JSON.stringify(z.toJSONSchema(splitSchema))) !== prevFrozen.schemaHash) throw new Error('Split condition differs from experiment ③');
for (const t of ['S1', 'S2', 'S3', 'S4']) if (responses[t] !== prevFrozen.responses[t]) throw new Error(`${t} differs from experiment ③`);
// 최종 API 입력 비교: 조건 간 차이는 markerGloss와 지시 끝 해석본 지시뿐이어야 한다.
for (const type of Object.keys(responses)) for (const stage of ['assessment', 'question']) {
  let session = fresh('none', type, 1);
  if (stage === 'question') session = applyCorrectRationaleAssessment(session, 'CLEAR_ERROR');
  const finals = Object.fromEntries(Object.keys(ARMS).map(arm => [arm, apiInputFor(arm, inputFor(session))]));
  const strip = x => { const { markerGloss: _g, ...rest } = x; return JSON.stringify(rest); };
  if (new Set(Object.values(finals).map(strip)).size !== 1) throw new Error('API inputs differ beyond markerGloss');
  for (const arm of Object.keys(ARMS)) {
    if (!instructionsFor(arm, stage).startsWith(instructionsFor('none', stage))) throw new Error('Instructions differ beyond gloss suffix');
    if (finals[arm].observations[0].rationale !== responses[type]) throw new Error('Response wiring failed');
    if (/S[1-5]\b|\bnone\b|gloss_/.test(JSON.stringify(finals[arm]).replace(responses[type], ''))) throw new Error('Arm or response type id leaked into API input');
  }
}

const types = Object.keys(responses), armNames = Object.keys(ARMS);
// 반복마다 유형 순서를 회전하고, 같은 유형 안에서 조건 순서는 세 반복에 걸쳐 각 조건이 처음·가운데·끝에 한 번씩 오도록 회전한다.
const schedule = [1, 2, 3].flatMap(r => [...types.slice(r - 1), ...types.slice(0, r - 1)].flatMap(type => {
  const k = (r + types.indexOf(type)) % armNames.length; return [...armNames.slice(k), ...armNames.slice(0, k)].map(arm => ({ r, type, arm })); }));
const cellId = ({ arm, type, r }) => `${arm}-${type}-r${r}`;
const frozen = { sourceHash: hash(JSON.stringify(source)), responses, choiceId, schedule,
  glossFile: `${FIX}/marker-glosses/gongsun-long-later-mohists-q12.json`, glossHash: hash(JSON.stringify(gloss)), glossSourceBinding: gloss.sourceBinding.sha256,
  promptHashes: { v3: hash(originalPrompt), split: hash(splitPrompt), glossMarkers: hash(glossInstruction(false)), glossFull: hash(glossInstruction(true)) },
  schemaHash: hash(JSON.stringify(z.toJSONSchema(splitSchema))),
  runnerHash: hash(readFileSync(new URL(import.meta.url))), validatorHash: hash(readFileSync('scripts/lib/marker-gloss-validation.mjs')),
  distHashes: Object.fromEntries(['index.js', 'problem-solving/source-direct-evaluator-runtime.js', 'problem-solving/source-direct-evaluator.js', 'problem-solving/session.js']
    .map(f => [f, hash(readFileSync(`packages/pipeline/dist/${f}`))])),
  model: 'gpt-5.6-terra', effort: 'medium', maxRequests: 90, estimatedUsdCap: 2, maxOutputTokens: 8000, maxRetries: 0,
  design: [
    '조건 3개: none(③번과 같은 학생 주장 분리 판정), gloss_markers(+기호 해석본 ⓐ~ⓔ와 사용 규칙), gloss_full(+기호 해석본과 선지 ①~⑤ 해석). 해석본 조건은 최초 평가와 질문 단계 모두에 해석본과 사용 규칙을 넣는다.',
    '원문은 세 조건 모두 운영 원문(본문에 기호 문자 포함, 실험용 태그 없음)이다. ③번은 실험용 태그 원문을 썼으므로 none 결과를 ③번과 합산하지 않는다.',
    '모든 런이 정답과 제공 해설을 받는다. 해석본은 2026-10-06 사용자 승인본(상태: ⓒ 원 시험지 위치 미확인)이며 문항별 의미는 지시가 아니라 입력 markerGloss로만 전달한다.',
    'gloss_full은 D-0002가 폐기한 선지 주장 골드에 가까운 조건이다. 결과가 좋아도 채택은 별도 사용자 결정이다.',
    '증거 인용의 기호 문자·공백·인용부호 차이만 코드가 복원하고 원출력은 원장에 보존한다. 계약 실패는 재시도·재생성하지 않는다. 예산 초과·API 실패·완료 기록 없는 호출이 생기면 전체 실행을 멈추고 부분 결과를 *.stopped.json에 보존한다.',
    'API 입력의 sessionId는 조건과 무관하게 유형·반복으로만 만든 불투명 ID다. 조건 간 최종 API 입력 차이가 markerGloss와 지시 끝 해석본 지시뿐인지 사전 점검에서 확인한다.',
    '인용 복원은 기호 문자의 생략·공백·인용부호 차이만 고친다. 다른 기호로 바꿔 쓴 인용은 고치지 않고 계약 실패로 남기며, 원출력의 인용 정확 여부(rawQuoteExact)를 따로 기록한다.',
    '응답이 완료 상태가 아니거나 JSON이 아니면 계약 실패로 기록하고 다음 칸으로 진행한다(신규·재사용 동일). API·전송 오류만 전체 중단한다.',
    'gloss_markers도 허용·오류 읽기 경계와 메모를 주므로 기호 위치 정보만의 효과로 해석하지 않는다. gloss_full은 선지별 정오와 판정 논리를 구조화해 준다.',
    '조건 순서는 같은 유형 안에서 세 반복에 걸쳐 각 조건이 처음·가운데·끝에 한 번씩 오도록 회전한다(무작위 아님). 단일 프로세스 실행만 전제한다.',
    '확인 범위는 최초 판정과 조건부 첫 질문까지다. 조건·유형당 3회이며 결과는 탐색용이다.',
  ],
  expected: {
    S1: { assessment: 'SUPPORTED', note: '정확한 대응과 관계.' },
    S2: { assessment: 'CLEAR_ERROR', note: 'ⓓ·ⓔ 대응 둘 다 오류, "서로 다름"·"④ 부적절" 보존.' },
    S3: { assessment: 'CLEAR_ERROR', note: 'ⓔ=파란 옷만 오류.' },
    S4: { assessment: 'SUPPORTED', note: '2026-10-06 사용자 결정: 관계만 말해도 앞선 모순이 없으면 충분.' },
    S5: { assessment: 'SUPPORTED', note: 'ⓓ="옷장에 있는 옷"은 해석본의 허용 읽기, ⓔ=빨간 옷, 다른 대상 판단으로 ④의 핵심 전제를 부정. 2026-10-02 v4 판정기는 이를 오류로 교정했다.' },
  },
  reviewCriteria: {
    ...prevFrozen.reviewCriteria,
    P2_sourceReading: '평가자가 원문 해석으로 서술한 ⓓ, ⓔ의 가리키는 대상을 해석본 기준으로 정확/오류/판단 불가로 기록한다. ⓓ는 옷 일반·색을 정하지 않은 옷·옷장의 옷·지금 있는 옷 모두 정확, 빨간 옷·ⓔ와 같은 대상은 오류. 가리키는 대상 자리에 문장의 뜻("~의 부재")을 쓰면 오류. 학생 발화의 인용·소개는 원문 해석으로 보지 않는다. 오류가 하나라도 있으면 실패, 판단 불가(서술 없음)는 실패가 아니다(S4 등에서 대응을 새로 설명하지 않아도 통과).',
    P4_errorLocation: '판단 단위(ⓓ 대응, ⓔ 대응, "서로 다른 대상", "④ 부적절" 중 그 유형이 말한 것)마다 오류 지목 여부를 sourceCheck와 reason 양쪽에서 기록한다. 실제로 틀린 단위(S2: ⓓ·ⓔ 대응 둘 다, S3: ⓔ 대응)는 sourceCheck에서 CONTRADICTED이고 reason에서도 오류로 지목돼야 한다. 맞는 단위를 어느 쪽에서든 오류로 지목하면 실패. S1·S4·S5는 지목이 없어야 한다. 해석본 표현과 다르다는 이유만으로 지목하면 실패.',
    questionStageScope: '질문 단계 reason은 그 유형의 모든 오류를 식별해야 한다. 첫 질문은 한 판단에 초점을 둘 수 있으며 S2의 두 오류를 한 질문에서 모두 교정할 필요는 없다. 질문의 초점·단일 판단 요구는 별도로 기록한다.',
    glossLeak: '세 조건 모두에서 학생에게 나가는 문장(질문·안내 메시지)이 학생이 아직 말하지 않은 정답 대응을 제공·암시하거나 질문 전제로 넣었는지 의미로 검토한다. 코드 신호 glossVerbatimInStudentText는 해석본 문구의 그대로 복사만 잡는 보조 자료이며, none 조건의 적중은 해석본 복사가 아니다.',
    safePass: 'semanticPass이면서 질문 단계(진입한 경우)도 P2·P3·P4를 통과하고 glossLeak가 없을 것.',
    denominators: '두 분모로 따로 보고한다: (가) 질문이 생성된 사례 중 질문 단계 통과율, (나) 조건별 예정 15칸 중 최초 판정이 기대와 맞고 오류 유형(S2·S3)에서는 통과하는 질문까지 생성한 비율.',
    glossOverreach: '해석본 조건에서 해석본에 없는 표현이라는 이유로 오류·불충분 처리하거나, 해석본 내용을 학생이 말한 것으로 보충한 경우를 기록한다.',
    reviewers: '사람 판정 전 Claude와 GPT가 조건명·유형명·기대값을 지운 출력을 각각 판정한다. 모든 조건의 출력에 같은 기준 자료(원자료, 학생 응답, 승인 해석본, 이 기준)를 제공하고 조건 라벨만 가린다. 출력의 해석본 언급 여부로 조건을 짐작할 수 있으므로 완전 블라인드는 아니다. 결론은 승인 해석본 기준에서의 성능으로 한정한다.',
  },
};
mkdirSync(DIR, { recursive: true });
if (existsSync(`${DIR}/FROZEN.json`)) { if (JSON.stringify(read(`${DIR}/FROZEN.json`)) !== JSON.stringify(frozen)) throw new Error('Frozen run changed'); }
else {
  if (process.argv[2] !== 'prepare') throw new Error('Prepare first');
  save(`${DIR}/FROZEN.json`, frozen); save(`${DIR}/source.json`, source);
  save(`${DIR}/prompts.json`, { originalPrompt, splitInstruction, glossInstructionMarkers: glossInstruction(false), glossInstructionFull: glossInstruction(true),
    glossPayloadMarkers: glossPayload(false), glossPayloadFull: glossPayload(true), splitSchema: z.toJSONSchema(splitSchema) });
  save(`${DIR}/input-example.json`, { note: 'gloss_full 조건 S2 1회 최초 평가의 실제 API 입력(지시는 prompts.json)', input: apiInputFor('gloss_full', example) });
}
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, cells: schedule.length, selfTests: 'passed', maxRequests: 90, estimatedUsdCap: 2 })); process.exit(0); }
if (process.argv[2] !== 'run') throw new Error('Use prepare or run');

const ledgerPath = `${DIR}/requests.jsonl`, ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const log = x => { ledger.push(x); appendFileSync(ledgerPath, JSON.stringify(x) + '\n'); };
const account = () => { const starts = ledger.filter(x => x.event === 'START'); return { requests: starts.length,
  estimatedUsd: ledger.filter(x => x.event === 'END').reduce((s, x) => s + x.estimatedUsd, 0),
  reservedUsd: starts.filter(s => !ledger.some(x => x.event === 'END' && x.id === s.id)).reduce((s, x) => s + x.reservedUsd, 0) }; };
let client;
async function callApi(label, instructions, input, schema) {
  const request = { model: frozen.model, instructions, input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }],
    reasoning: { effort: 'medium' }, max_output_tokens: 8000, store: false, service_tier: 'default',
    text: { format: { type: 'json_schema', name: 'source_direct_claim_split_experiment', strict: true, schema: z.toJSONSchema(schema) } } };
  const done = ledger.find(x => x.event === 'END' && x.label === label);
  if (done) return { output: parseEnd(done), usage: undefined, reused: true };
  if (ledger.some(x => x.event === 'START' && x.label === label)) throw new IncompleteRequest(`완료 기록 없는 요청: ${label}`);
  const a = account(), bytes = Buffer.byteLength(JSON.stringify(request)), reservedUsd = (bytes * 2 + 8000 * 12) / 1e6;
  if (a.requests >= frozen.maxRequests || a.estimatedUsd + a.reservedUsd + reservedUsd > frozen.estimatedUsdCap || bytes > 220000) throw new BudgetStop('Budget/size cap');
  const id = a.requests + 1, started = Date.now();
  log({ event: 'START', id, label, at: new Date().toISOString(), reservedUsd, requestHash: hash(JSON.stringify(request)), instructionHash: hash(instructions), input });
  let response;
  try {
    client ??= new OpenAI({ maxRetries: 0 });
    response = await client.responses.create(request, { timeout: 60000, maxRetries: 0 });
  } catch (e) { log({ event: 'ERROR', id, label, error: String(e) }); throw new ApiFailure(String(e)); }
  const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0;
  const estimatedUsd = u ? ((u.input_tokens - cached) * 2 + cached * 0.2 + u.output_tokens * 12) / 1e6 : reservedUsd;
  const end = { event: 'END', id, label, at: new Date().toISOString(), durationMs: Date.now() - started, model: response.model, responseId: response.id,
    status: response.status, incompleteDetails: response.incomplete_details ?? null, usage: u, estimatedUsd, estimatedAtReservation: !u, outputText: response.output_text };
  log(end);
  return { output: parseEnd(end), usage: u ? { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: cached } : undefined };
}
for (const cell of schedule) {
  const { r, arm, type } = cell, id = cellId(cell);
  const file = `${DIR}/${id}.json`; if (existsSync(file)) continue;
  const steps = []; let session = fresh(arm, type, r), stage = 'assessment', extra = null;
  try {
    for (stage of ['assessment', 'question']) {
      const label = `${id}-${stage}`;
      extra = null;
      const evaluator = new OpenAISourceDirectProblemEvaluator({ model: frozen.model, effort: 'medium', maxRetries: 0, maxOutputTokens: 8000,
        timeoutMs: 60000, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION, transport: { async parse(o) {
          if (o.instructions !== originalPrompt.trim()) throw new Error('v3 mismatch');
          const assess = o.input.evaluationMode === 'ASSESS_SELECTION_RATIONALE';
          const input = apiInputFor(arm, o.input);
          const split = stage === 'assessment';
          const schema = split ? splitSchema : assess ? SourceDirectRationaleOutputSchema : SourceDirectDiagnosticOutputSchema;
          const response = await callApi(label, instructionsFor(arm, stage), input, schema);
          let parsed = response.output;
          extra = { rawOutput: parsed, reusedLedgerOutput: Boolean(response.reused) };
          if (split) {
            const checked = splitSchema.parse(parsed);
            extra = { ...extra, studentClaims: validateClaims(checked.studentClaims, input.observations), selectionSupport: checked.selectionSupport,
              derivedLabel: derivedLabel(checked.studentClaims, checked.selectionSupport) };
            parsed = checked.evaluation;
          }
          const normalized = normalizeSourceQuotes(parsed);
          const rawQuoteExact = (parsed.sourceEvidence ?? []).every(ev => ev.kind !== 'TEXT' || textSources[ev.source].includes(ev.quote));
          extra = { ...extra, quoteNormalization: normalized.changes, rawQuoteExact };
          return { outputParsed: normalized.output, usage: response.usage };
        } } });
      const input = inputFor(session), call = await evaluator.evaluate(input);
      steps.push({ stage, input, call, ...extra, labelMatchesDerived: extra?.derivedLabel ? extra.derivedLabel === call.result.assessment : null,
        glossVerbatimInStudentText: stage === 'question' ? glossVerbatim(studentFacingText(call.result)) : null });
      console.log(JSON.stringify({ label, result: call.result, extra, account: account() }));
      if (stage === 'assessment' && call.result.assessment === 'CLEAR_ERROR') session = applyCorrectRationaleAssessment(session, 'CLEAR_ERROR'); else break;
    }
  } catch (e) {
    // 평가기는 transport 오류를 SourceDirectProblemEvaluatorError로 감싸므로 원인까지 확인한다.
    const root = e?.cause ?? e;
    if (root instanceof BudgetStop || root instanceof IncompleteRequest || root instanceof ApiFailure) {
      // 이 런은 완료로 저장하지 않는다(재개 시 원장의 완료 호출을 재사용). 부분 결과는 덮어쓸 수 있는 파일에 보존한다.
      const stopped = { arm, type, replicate: r, stage, stopKind: root.constructor.name, stopReason: root.message, steps };
      writeFileSync(`${DIR}/${id}.stopped.json`, JSON.stringify(stopped, null, 2) + '\n');
      console.log(JSON.stringify({ id, stage, stopped: root.message })); break;
    }
    steps.push({ stage, error: String(e), errorName: e?.name ?? null, rawOutput: extra?.rawOutput ?? e?.rawOutput ?? null,
      callMetadata: e?.call ?? null, ...extra });
    console.log(JSON.stringify({ id, stage, error: String(e) }));
  }
  save(file, { arm, type, replicate: r, steps });
}
const summarize = steps => steps.map(st => ({ stage: st.stage, assessment: st.call?.result?.assessment, action: st.call?.result?.nextAction?.type,
  derivedLabel: st.derivedLabel ?? null, labelMatchesDerived: st.labelMatchesDerived ?? null, rawQuoteExact: st.rawQuoteExact ?? null,
  glossVerbatimInStudentText: st.glossVerbatimInStudentText ?? null, error: st.error, errorName: st.errorName ?? null }));
// RESULTS는 런 파일에서 다시 만드는 요약이므로 재개 때 덮어쓴다.
writeFileSync(`${DIR}/RESULTS.json`, JSON.stringify({ ...account(), runs: schedule.map(cell => {
  const { arm, type, r } = cell, id = cellId(cell);
  if (existsSync(`${DIR}/${id}.json`)) return { arm, type, replicate: r, stages: summarize(read(`${DIR}/${id}.json`).steps) };
  if (existsSync(`${DIR}/${id}.stopped.json`)) { const x = read(`${DIR}/${id}.stopped.json`);
    return { arm, type, replicate: r, stopped: { kind: x.stopKind, reason: x.stopReason, stage: x.stage }, stages: summarize(x.steps) }; }
  return { arm, type, replicate: r, notRun: true };
}), costByArm: Object.fromEntries(armNames.map(arm => { const ends = ledger.filter(x => x.event === 'END' && x.label.startsWith(`${arm}-`));
  return [arm, { requests: ends.length, estimatedUsd: ends.reduce((t, x) => t + x.estimatedUsd, 0), durationMs: ends.map(x => x.durationMs) }]; })),
  semanticReview: 'reviewCriteria에 따른 수동 검토 필요. 라벨만으로 의미 통과로 집계하지 않는다. 비용·지연은 원장 END 기준.' }, null, 2) + '\n');
console.log(JSON.stringify(account()));
