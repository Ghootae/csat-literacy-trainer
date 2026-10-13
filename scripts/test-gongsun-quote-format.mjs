// 공손룡 12번 S5(실제 사용자 응답): 세 조건 실험의 gloss_markers 조건을 그대로 두고(control),
// reason에서 학생 판단을 학생 발화 인용으로 쓰게 하는 규칙 한 문단만 더한 조건(quote_format)과 비교한다.
// 목적: 학생 표현을 해석본 표현으로 바꿔 학생에게 귀속하는 부작용이 이 규칙으로 줄어드는지 본다. prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput, OpenAISourceDirectProblemEvaluator,
  createSourceDirectProblemRequestContent, SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';
import { validateMarkerGloss } from './lib/marker-gloss-validation.mjs';

const DIR = 'docs/experiments/gongsun-quote-format-2026-10-07';
const PREV = 'docs/experiments/gongsun-gloss-arms-2026-10-06';
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
// 처치: reason 서술 형식 규칙 한 문단. 문항별 의미는 넣지 않는다.
const quoteRule = [
  '## 학생 판단 서술 형식',
  'reason에서 학생의 판단을 서술할 때는 학생 발화의 해당 부분을 큰따옴표로 정확히 인용해 쓰고, 해석본이나 평가자의 표현으로 바꾸어 쓰지 않는다.',
  '학생 발화와 해석본의 관계는 학생 인용과 평가자 판단을 나누어 쓴다. 예: 학생은 "…"라고 했고, 이는 해석본의 …와 양립한다(또는 어긋난다).',
  '학생이 말하지 않은 일반화·개념은 평가자 판단 부분에만 쓰고 학생이 말하거나 이해한 것으로 쓰지 않는다.',
  '이 규칙은 reason에서 학생 판단을 서술하는 형식에만 적용한다. 의미상 동등한 학생 표현의 인정 기준, 해석본 사용 규칙, assessment 결정 기준은 기존 지시를 따른다.',
].join('\n');
const ARMS = { gloss_markers: false, quote_format: true };
const instructionsFor = (arm, stage) => {
  const core = (stage === 'assessment' ? splitPrompt : originalPrompt.trim()) + '\n\n' + glossInstruction(false);
  return ARMS[arm] ? core + '\n\n' + quoteRule : core;
};
// 학생에게 나가는 문장에 해석본 문구가 그대로 들어갔는지 보는 문자열 신호(의미 누출 판정은 사람 검토).
const glossPhrases = [...gloss.markers.flatMap(m => [m.referentHere, m.note, ...m.allowedReadings, ...m.conflictingReadings]),
  ...gloss.choiceReadings.flatMap(r => r.reading.split(/(?<=다\.)\s*/u))].map(x => x.trim()).filter(x => x.length >= 8);
const glossVerbatim = text => glossPhrases.filter(p => (text ?? '').includes(p));
// 학생에게 나갈 수 있는 문장 전체(질문·안내 메시지).
// 검토 후보 문장 신호: reason에서 "학생은 …" 서술에 해석본의 ⓓ 대상 표현이 따옴표 밖에 붙은 문장을 고른다.
// 오류율 지표가 아니다(부정문 오탐, 가짜 인용·다른 표현 미탐). 16건 전체를 의미 검토한다.
const GLOSS_REFERENT_WORDS = /(색을\s*(한정하지|정하지|지정하지)\s*않은|색이\s*(한정되지|정해지지)\s*않은|옷\s*일반)/u;
const attributionFlag = reason => (reason ?? '').split(/(?<=[.다])\s+/u)
  .filter(sent => /학생(은|이|의)/u.test(sent) && GLOSS_REFERENT_WORDS.test(sent.replace(/["“][^"”]*["”]|‘[^’]*’|'[^']*'/gu, '')));
if (!attributionFlag('학생은 ⓓ가 색을 한정하지 않은 옷을 가리킨다고 판단했다.').length
  || attributionFlag('학생은 "옷장에 있는 옷"이라고 했고, 이는 해석본의 색을 정하지 않은 옷 일반과 양립한다.').length !== 1
  || attributionFlag('학생은 ⓓ와 ⓔ가 서로 다른 대상을 지시한다고 판단했다.').length) throw new Error('Attribution flag self-test failed');
const studentFacingText = result => [result?.nextAction?.question, result?.nextAction?.message].filter(Boolean).join('\n');
const claimRow = z.object({ observationId: z.string(), quote: z.string(), claimAsStated: z.string(),
  sourceCheck: z.enum(['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED']), sourceBasis: z.string() }).strict();
const splitSchema = z.object({ studentClaims: z.array(claimRow).min(1), selectionSupport: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
  evaluation: SourceDirectRationaleOutputSchema }).strict();

// API 입력의 sessionId에 유형명이 드러나지 않도록 유형·반복에서 만든 불투명 ID를 쓴다.
// 모델 입력의 sessionId는 조건과 무관하게 유형·반복으로만 만든다(조건 간 입력 차이를 해석본 두 가지로 한정).
const opaqueId = (type, r) => `quote-format-${hash(`gongsun-quote-format:${type}:${r}`).slice(0, 10)}`;
const fresh = (arm, type, r) => submitInitialProblemResponse(createProblemSolvingSession({ sessionId: opaqueId(type, r),
  questionId: source.questionId, answerChoiceId: source.answerChoiceId }), { initialChoiceId: choiceId, rationale: responses[type] });
// 실제 API에 보내는 입력. 실행 경로와 사전 점검이 같은 함수를 쓴다.
const apiInputFor = (arm, evaluatorInput) => {
  const baseInput = JSON.parse(createSourceDirectProblemRequestContent(evaluatorInput)[0].text);
  return { ...baseInput, markerGloss: glossPayload(false) };
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
const example = inputFor(fresh('quote_format', 'S5', 1));
const okClaim = { observationId: 'O1', quote: responses.S5.slice(0, 10), claimAsStated: 'offline', sourceCheck: 'UNDETERMINED', sourceBasis: 'offline' };
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
for (const ins of [splitInstruction, glossInstruction(false), quoteRule]) {
  if (/빨간|옷장|ⓓ|ⓔ|공손룡|묵가/u.test(ins)) throw new Error('Item-specific meaning leaked into instruction');
}
if (!glossVerbatim(`질문 ${gloss.markers[3].referentHere}`).length || glossVerbatim('ⓓ와 ⓔ는 각각 무엇을 가리키나요?').length) throw new Error('Gloss leak check self-test failed');
if ('choiceReadings' in glossPayload(false) || !('choiceReadings' in glossPayload(true))) throw new Error('Gloss payload arm wiring failed');
// control은 세 조건 실험의 gloss_markers와 지시·스키마·해석본·S5 응답이 같아야 한다.
const prevFrozen = read(`${PREV}/FROZEN.json`);
if (hash(splitPrompt) !== prevFrozen.promptHashes.split || hash(JSON.stringify(z.toJSONSchema(splitSchema))) !== prevFrozen.schemaHash) throw new Error('Split condition differs from gloss-arms experiment');
if (hash(glossInstruction(false)) !== prevFrozen.promptHashes.glossMarkers || hash(JSON.stringify(gloss)) !== prevFrozen.glossHash) throw new Error('Gloss condition differs from gloss-arms experiment');
if (responses.S5 !== prevFrozen.responses.S5) throw new Error('S5 differs from gloss-arms experiment');
// 최종 API 입력 비교: 조건 간 차이는 markerGloss와 지시 끝 해석본 지시뿐이어야 한다.
for (const type of Object.keys(responses)) for (const stage of ['assessment', 'question']) {
  let session = fresh('none', type, 1);
  if (stage === 'question') session = applyCorrectRationaleAssessment(session, 'CLEAR_ERROR');
  const finals = Object.fromEntries(Object.keys(ARMS).map(arm => [arm, apiInputFor(arm, inputFor(session))]));
  if (new Set(Object.values(finals).map(x => JSON.stringify(x))).size !== 1) throw new Error('API inputs differ between arms');
  for (const arm of Object.keys(ARMS)) {
    const expected = ARMS[arm] ? instructionsFor('gloss_markers', stage) + '\n\n' + quoteRule : instructionsFor('gloss_markers', stage);
    if (instructionsFor(arm, stage) !== expected) throw new Error('Instructions differ beyond quote rule suffix');
    if (finals[arm].observations[0].rationale !== responses[type]) throw new Error('Response wiring failed');
    if (/S[1-5]\b|quote_format|gloss_markers/.test(JSON.stringify(finals[arm]).replace(responses[type], ''))) throw new Error('Arm or response type id leaked into API input');
  }
}

const types = Object.keys(responses), armNames = Object.keys(ARMS);
// S5만 8회. 반복마다 조건 순서를 번갈아 바꾼다(무작위 아님).
const schedule = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(r => (r % 2 ? armNames : [...armNames].reverse()).map(arm => ({ r, type: 'S5', arm })));
const cellId = ({ arm, type, r }) => `${arm}-${type}-r${r}`;
const frozen = { sourceHash: hash(JSON.stringify(source)), responses, choiceId, schedule,
  glossFile: `${FIX}/marker-glosses/gongsun-long-later-mohists-q12.json`, glossHash: hash(JSON.stringify(gloss)), glossSourceBinding: gloss.sourceBinding.sha256,
  promptHashes: { v3: hash(originalPrompt), split: hash(splitPrompt), glossMarkers: hash(glossInstruction(false)), quoteRule: hash(quoteRule) },
  schemaHash: hash(JSON.stringify(z.toJSONSchema(splitSchema))),
  runnerHash: hash(readFileSync(new URL(import.meta.url))), validatorHash: hash(readFileSync('scripts/lib/marker-gloss-validation.mjs')),
  distHashes: Object.fromEntries(['index.js', 'problem-solving/source-direct-evaluator-runtime.js', 'problem-solving/source-direct-evaluator.js', 'problem-solving/session.js']
    .map(f => [f, hash(readFileSync(`packages/pipeline/dist/${f}`))])),
  model: 'gpt-5.6-terra', effort: 'medium', maxRequests: 32, estimatedUsdCap: 1, maxOutputTokens: 8000, maxRetries: 0,
  design: [
    '조건 2개: gloss_markers(세 조건 실험의 같은 이름 조건과 지시·스키마·해석본이 같고 API 입력은 sessionId만 다름) / quote_format(여기에 quoteRule 한 문단만 추가). 최초 평가 지시에는 학생 주장 분리 지시가 있고 질문 단계에는 없다. quoteRule은 두 단계 모두에 추가한다.',
    '같은 반복·단계에서 두 조건의 API 입력(markerGloss 포함)은 완전히 같고, 지시는 control 지시 + quoteRule 한 문단으로 정확히 일치하는지 사전 점검한다.',
    '처치는 직접 인용, 학생 인용과 평가자 판단 분리, 학생이 말하지 않은 일반화의 학생 귀속 금지를 함께 요구하는 문단이다. 따옴표 표기만의 효과로 해석하지 않는다. 출력 스키마는 바꾸지 않으며 라벨 변화 가능성을 함께 본다.',
    '과거 실험의 S5 귀속 대체(gloss_markers 2/3, gloss_full 1/3)는 발견 배경일 뿐 기준선이 아니다. 효과 비교는 이번에 함께 실행한 control 8회 대 treatment 8회로만 한다. 조건당 8회는 탐색용이며 0/8도 제거의 증명이 아니다.',
  ],
  expected: { S5: { assessment: 'SUPPORTED', note: '세 조건 실험과 같다.' } },
  reviewCriteria: {
    ...prevFrozen.reviewCriteria,
    primary: '학생 귀속 대체(최초 평가 reason 기준): 학생이 말하지 않은 해석본·평가자 표현(예: 색을 한정하지 않은 옷, 옷 일반, 일반적인 옷)을 학생이 말하거나 판단·이해한 것으로 서술했는가. 출력마다 대체 있음/없음/판단 불가와 근거 구절을 기록한다. 판단 불가에는 reason에 학생 판단 서술 자체가 없는 경우를 포함하며 따로 표시한다(회피·생략을 개선으로 세지 않는다).',
    primaryExamples: {
      fail: ['학생은 ⓓ가 색을 한정하지 않은 옷을 가리킨다고 판단했다.', '학생은 "옷장에 있는 옷"이라고 했으므로 색을 한정하지 않은 옷 일반을 이해했다.(정확한 인용이 있어도 일반화를 학생 이해로 귀속하면 실패)', '학생은 "색을 한정하지 않은 옷"이라고 말했다.(가짜 인용)'],
      pass: ['학생은 "옷장에 있는 옷"이라고 했고, 이는 해석본의 옷 일반과 양립한다.', '학생은 ⓓ와 ⓔ가 다른 대상을 지시한다고 판단했다.(학생이 실제로 말한 판단)', '따옴표 없이 쓴 평가자 자신의 원문 설명', 'd→ⓓ 같은 표기 정리나 조사 보완'],
    },
    questionStageAttribution: '질문 단계(진입한 경우)의 reason·reconstructedPath·question의 귀속 대체는 1차 지표와 따로 집계한다.',
    outcomeReport: '조건별로 귀속 대체 건수/8, 판단 불가 건수, SUPPORTED 유지 건수/8(과잉 교정·과잉 엄격 포함), semanticPass 건수, 계약 실패·API 실패·예산 중단·미실행을 분리해 보고한다. 결측을 귀속 대체 없음으로 세지 않는다.',
    reviewCandidateSentences: '코드가 고른 검토 후보 문장이다. 오류율로 쓰지 않으며 조건 간 빈도 비교에도 쓰지 않는다(처치가 따옴표 사용을 바꾸고 신호는 따옴표 안을 제외한다).',
    denominators: '각 조건 S5 8회가 분모다.',
    secondary: ['P1~P4 semanticPass(세 조건 실험과 같은 정의)', '과잉 교정(SUPPORTED 기대에 CLEAR_ERROR)·과잉 엄격', 'claimAsStated의 학생 표현 보존', '코드 신호 attributionFlag(문자열 기준 보조 지표)', '처치 문단이 출력에 나타난 형식(학생 인용 사용 여부)', '요청 수·추정 비용·지연'],
    reviewers: '사람 판정 전 Claude와 GPT가 조건명을 지운 출력, 원자료, 승인 해석본, 이 기준을 보고 각각 판정한다. 출력 형식(따옴표 인용)으로 조건을 짐작할 수 있으므로 완전 블라인드는 아니다.',
  },
};
mkdirSync(DIR, { recursive: true });
if (existsSync(`${DIR}/FROZEN.json`)) { if (JSON.stringify(read(`${DIR}/FROZEN.json`)) !== JSON.stringify(frozen)) throw new Error('Frozen run changed'); }
else {
  if (process.argv[2] !== 'prepare') throw new Error('Prepare first');
  save(`${DIR}/FROZEN.json`, frozen); save(`${DIR}/source.json`, source);
  save(`${DIR}/prompts.json`, { instructionsControlAssessment: instructionsFor('gloss_markers', 'assessment'), quoteRule,
    instructionsTreatmentAssessment: instructionsFor('quote_format', 'assessment'), glossPayloadMarkers: glossPayload(false), splitSchema: z.toJSONSchema(splitSchema) });
  save(`${DIR}/input-example.json`, { note: '두 조건 공통 S5 1회 최초 평가의 실제 API 입력(지시는 prompts.json)', input: apiInputFor('quote_format', example) });
}
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, cells: schedule.length, selfTests: 'passed', maxRequests: 32, estimatedUsdCap: 1 })); process.exit(0); }
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
        glossVerbatimInStudentText: stage === 'question' ? glossVerbatim(studentFacingText(call.result)) : null,
        reviewCandidateSentences: attributionFlag(call.result.reason) });
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
  glossVerbatimInStudentText: st.glossVerbatimInStudentText ?? null, reviewCandidateSentences: st.reviewCandidateSentences ?? null, error: st.error, errorName: st.errorName ?? null }));
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
