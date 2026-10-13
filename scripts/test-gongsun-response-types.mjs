// 공손룡 12번: ②번(gongsun-claim-split-2026-10-06)의 B 방식(학생 주장별 원문 대조·충분성 분리 기록)을 고정하고
// 학생 응답만 네 유형(S1 정확, S2 역전, S3 한쪽만 틀림, S4 관계만)으로 바꾼다. 해석표 없음.
// 질문 단계는 원래 v3 그대로. prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput, OpenAISourceDirectProblemEvaluator,
  createSourceDirectProblemRequestContent, SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';
import { locateQuote } from './lib/marker-quote-validation.mjs';

const DIR = 'docs/experiments/gongsun-response-types-2026-10-06';
const PREV = 'docs/experiments/gongsun-claim-split-2026-10-06';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
// 직전 해석 방식 시험의 직접 표시 원문(태그 포함)을 그대로 쓴다: inline_only 조건과 같은 원자료.
const source = SourceDirectProblemBundleSchema.parse(read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json'));
const reversed = read('docs/experiments/gongsun-marker-input-ab-2026-10-02/cases.json').cases.find(x => x.id === 'G-error');
// 학생 응답 네 유형. 모두 ④(C4) 선택. 기대 판정은 FROZEN에만 기록하고 API 입력에는 넣지 않는다.
const responses = {
  S1: 'd는 색을 한정하지 않은 일반적인 옷, e는 빨간 옷을 가리켜요. 서로 다른 대상이니까 같다고 한 4번은 틀렸어요.',
  S2: reversed.rationale,
  S3: 'd는 색을 한정하지 않은 일반적인 옷이고, e는 파란 옷을 가리켜요. 서로 다른 대상이니까 4번은 틀렸어요.',
  S4: 'd와 e는 서로 다른 대상을 가리키니까 같다고 한 4번은 틀렸어요.',
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
const claimRow = z.object({ observationId: z.string(), quote: z.string(), claimAsStated: z.string(),
  sourceCheck: z.enum(['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED']), sourceBasis: z.string() }).strict();
const splitSchema = z.object({ studentClaims: z.array(claimRow).min(1), selectionSupport: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
  evaluation: SourceDirectRationaleOutputSchema }).strict();

// API 입력의 sessionId에 유형명이 드러나지 않도록 유형·반복에서 만든 불투명 ID를 쓴다.
const opaqueId = (type, r) => `response-types-${hash(`gongsun-response-types:${type}:${r}`).slice(0, 10)}`;
const fresh = (type, r) => submitInitialProblemResponse(createProblemSolvingSession({ sessionId: opaqueId(type, r),
  questionId: source.questionId, answerChoiceId: source.answerChoiceId }), { initialChoiceId: choiceId, rationale: responses[type] });
const inputFor = session => createSourceDirectProblemEvaluatorInput({ session, source, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  evaluationMode: session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT' ? 'ASSESS_SELECTION_RATIONALE' : 'DIAGNOSE_PATH' });

// 제품 textSources와 같은 출처 구분.
const textSources = { PASSAGE: source.passage, STEM: source.stem, SCENARIO: source.scenario,
  CHOICE: source.choices.map(c => c.text).join('\n'), OFFICIAL_EXPLANATION: source.officialExplanation };
/** 시험용 태그·공백·인용부호 차이만 원문의 유일한 정확 문자열로 바꾼다. 의미 필드는 건드리지 않는다. */
function normalizeSourceQuotes(output) {
  const changes = [];
  const sourceEvidence = output.sourceEvidence.map((ev, i) => {
    if (ev.kind !== 'TEXT' || textSources[ev.source].includes(ev.quote)) return ev;
    const found = locateQuote(textSources[ev.source], ev.quote);
    if (!found.ok) return ev; // 제품 검증기가 계약 실패로 처리한다.
    const exact = textSources[ev.source].slice(found.start, found.end);
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
const derivedLabel = (claims, support) => claims.some(c => c.sourceCheck === 'CONTRADICTED') ? 'CLEAR_ERROR'
  : support === 'SUFFICIENT' ? 'SUPPORTED' : 'UNCERTAIN';

// 오프라인 자체 점검: 의미 판정 기대값은 API 입력에 넣지 않는다.
const example = inputFor(fresh('S2', 1));
const okClaim = { observationId: 'O1', quote: responses.S2.slice(0, 10), claimAsStated: 'offline', sourceCheck: 'UNDETERMINED', sourceBasis: 'offline' };
validateClaims([okClaim], example.observations);
for (const bad of [[{ ...okClaim, quote: '학생이 말하지 않은 문장' }], [{ ...okClaim, observationId: 'O9' }], [{ ...okClaim, claimAsStated: ' ' }], [{ ...okClaim, quote: '' }], []]) {
  let rejected = false; try { validateClaims(bad, example.observations); } catch { rejected = true; }
  if (!rejected) throw new Error('Claim validator self-test failed');
}
const taglessQuote = '내 말은 옷이 정말 없다는 게 아니라, 빨간 옷이 필요한데 없다는 말이었어.';
const norm = normalizeSourceQuotes({ sourceEvidence: [{ kind: 'TEXT', source: 'SCENARIO', quote: taglessQuote }] });
if (norm.changes.length !== 1 || !source.scenario.includes(norm.output.sourceEvidence[0].quote)) throw new Error('Quote normalization self-test failed');
if (derivedLabel([{ sourceCheck: 'CONTRADICTED' }], 'SUFFICIENT') !== 'CLEAR_ERROR' || derivedLabel([{ sourceCheck: 'CONSISTENT' }], 'INSUFFICIENT') !== 'UNCERTAIN')
  throw new Error('Derived label self-test failed');
{ let rejected = false; try { splitSchema.parse({ studentClaims: [okClaim], selectionSupport: 'MAYBE', evaluation: {} }); } catch { rejected = true; }
  if (!rejected) throw new Error('Split schema self-test failed'); }
if (JSON.stringify(splitInstruction).includes('빨간') || splitInstruction.includes('ⓓ')) throw new Error('Item-specific meaning leaked into instruction');
// ②번 B 조건과 지시·스키마가 같아야 비교할 수 있다.
const prevFrozen = read(`${PREV}/FROZEN.json`);
if (hash(splitPrompt) !== prevFrozen.promptHashes.split || hash(JSON.stringify(z.toJSONSchema(splitSchema))) !== prevFrozen.schemaHash) throw new Error('B condition differs from experiment ②');
if (responses.S2 !== prevFrozen.fixture.rationale) throw new Error('S2 differs from experiment ②');
for (const type of Object.keys(responses)) {
  const sent = JSON.stringify(inputFor(fresh(type, 1)));
  if (inputFor(fresh(type, 1)).observations[0].rationale !== responses[type]) throw new Error('Response wiring failed');
  if (/S[1-4]/.test(sent.replace(responses[type], ''))) throw new Error('Response type id leaked into API input');
}

const arms = ['S1', 'S2', 'S3', 'S4'];
const schedule = [1, 2, 3].flatMap(r => [...arms.slice(r - 1), ...arms.slice(0, r - 1)].map(arm => ({ r, arm })));
const frozen = { sourceHash: hash(JSON.stringify(source)), responses, choiceId, schedule,
  promptHashes: { v3: hash(originalPrompt), split: hash(splitPrompt) }, schemaHash: hash(JSON.stringify(z.toJSONSchema(splitSchema))),
  runnerHash: hash(readFileSync(new URL(import.meta.url))), validatorHash: hash(readFileSync('scripts/lib/marker-quote-validation.mjs')),
  distHashes: Object.fromEntries(['index.js', 'problem-solving/source-direct-evaluator-runtime.js', 'problem-solving/source-direct-evaluator.js', 'problem-solving/session.js']
    .map(f => [f, hash(readFileSync(`packages/pipeline/dist/${f}`))])),
  model: 'gpt-5.6-terra', effort: 'medium', maxRequests: 24, estimatedUsdCap: 2, maxOutputTokens: 8000, maxRetries: 0,
  design: [
    '②번 B 조건(지시·스키마 해시 동일)을 고정하고 학생 응답만 바꾼다. 해석표 없음. 원래 v3는 프롬프트·평가 계약 기준이며 직접 표시 태그 원문과 시험용 인용 정규화를 포함한다.',
    '모든 런이 정답(answerChoiceId)과 제공 해설(officialExplanation, d/e 대응 포함)을 입력으로 받는다. 정답·해설 블라인드가 아니다. 추가 지시에는 문항별 의미가 없다.',
    'B는 복합 처치다(②번 FROZEN.design 참조). 이번 실험은 B 안에서 응답 유형별 행동을 보며 A와 비교하지 않는다.',
    '질문 단계(DIAGNOSE_PATH)는 원래 v3이며 최초 평가의 reason·B 기록을 받지 않는다. 최초 평가가 계약을 통과하고 CLEAR_ERROR일 때만 진입한다. SUPPORTED·UNCERTAIN 이후 제품 흐름은 실행하지 않는다.',
    '유형 순서는 반복마다 회전(무작위 아님). 계약 실패는 재시도·재생성하지 않는다. 예산 초과, API·전송 실패, 완료 기록 없는 호출이 생기면 전체 실행을 멈추고 그 런의 부분 결과를 *.stopped.json에 보존한다. 재개 시 원장의 완료 호출은 재사용하고 실패한 호출은 다시 보내지 않는다.',
    'API 입력은 sessionId(유형과 무관한 불투명 ID)와 학생 응답만 ②번과 다르다. 스키마 이름도 ②번과 같다.',
    'S1은 제공 해설과 어휘가 매우 가까운 쉬운 양성 대조이고, S3는 S1과 색 외에도 일부 어미가 다르다(사용자 승인 문구 유지). S1 성공을 자연스러운 학생 표현 일반으로, S1–S3 차이를 한 단어 최소 대조로 해석하지 않는다.',
    '확인 범위는 최초 판정과 조건부 첫 질문까지다. 종료 상태·UI·교정 후 재평가는 확인하지 않는다.',
    '단일 학생 응답(이전 대화 없음)이므로 S4 기대의 "앞선 응답에 모순 없음" 조건은 항상 충족된다. 유형당 3회이며 결과는 탐색용이다.',
  ],
  expected: {
    S1: { assessment: 'SUPPORTED', note: '정확한 대응과 관계. 교정·질문하지 않아야 한다.' },
    S2: { assessment: 'CLEAR_ERROR', note: 'ⓓ·ⓔ 대응 두 판단만 오류. "서로 다름"과 "④ 부적절"은 보존.' },
    S3: { assessment: 'CLEAR_ERROR', note: 'ⓔ=파란 옷만 오류. ⓓ=일반적인 옷, "서로 다름", "④ 부적절"은 보존.' },
    S4: { assessment: 'SUPPORTED', note: '2026-10-06 사용자 결정: 앞선 응답에 모순이 없으면 "서로 다른 대상이라 ④는 틀렸다"는 ④의 핵심 전제를 정확히 부정한 충분한 근거. 학생이 말하지 않은 ⓓ·ⓔ 대응을 학생 주장으로 채우지 않아야 한다.' },
  },
  reviewCriteria: {
    unit: '각 런의 최초 평가 출력 전체(studentClaims·selectionSupport 포함)와 질문 단계 출력 전체',
    outcomeCategories: ['계약 실패(원출력이 읽히면 의미 검토 포함, 읽을 수 없으면 결측)', 'API·전송 실패(결측)', '예산 중단·미실행(결측)', '기대 일치', '과잉 교정(SUPPORTED 기대에 CLEAR_ERROR)', '과잉 엄격(SUPPORTED 기대에 UNCERTAIN)', '오류 승인(CLEAR_ERROR 기대에 SUPPORTED)', '오류 약화(CLEAR_ERROR 기대에 UNCERTAIN)', '라벨은 맞으나 의미 실패'],
    P1_label: 'assessment가 expected와 같은가. 단독으로 성공 집계하지 않는다.',
    P2_sourceReading: '평가자가 원문 해석으로 서술한 ⓓ, ⓔ 대응을 각각 정확(ⓓ=색 미지정 일반적인 옷, ⓔ=빨간 옷)/오류/판단 불가(서술 없음)로 기록한다. 학생 발화의 인용·소개는 원문 해석으로 보지 않는다. 오류가 하나라도 있으면 실패.',
    P3_attribution: '출력 전체(reason, claimAsStated, reconstructedPath)의 학생 주장 서술이 그 유형의 학생 발화와 일치하는가. S4에서 학생이 말하지 않은 ⓓ·ⓔ 대응을 학생이 말했거나 이해한 내용으로 쓰면 실패. 평가자 자신의 원문 설명으로 올바른 대응을 쓰는 것은 실패가 아니다. 학생 주장을 원문 해석 쪽으로 바꿔 쓰면 실패.',
    P4_errorLocation: '판단 단위(ⓓ 대응, ⓔ 대응, "서로 다른 대상", "④ 부적절" 중 그 유형이 말한 것)마다 오류 지목 여부를 기록한다. 실제로 틀린 단위(S2: ⓓ·ⓔ 대응 둘 다, S3: ⓔ 대응)는 빠짐없이 지목해야 하고, 맞는 단위는 지목하지 않아야 한다. S1·S4는 지목이 없어야 한다. sourceCheck도 대상이다.',
    semanticPass: 'P1~P4 모두 충족(②번과 같은 정의). P2·P3·P4 결과는 따로도 보고한다.',
    strictPass: 'semanticPass에 더해 claimCoverage 누락·혼합 행·fieldConsistency 모순이 없을 것. ②번 결과에 소급 적용하지 않는다.',
    stageSeparation: '최초 평가와 질문 단계를 따로 집계한다. 질문 단계가 최초 오류를 바로잡아도 최초 실패는 유지한다. 질문 미진입은 정상 생략(SUPPORTED·UNCERTAIN 기대와 일치)·오판정·계약 실패·API 실패·예산 중단으로 나눈다.',
    claimCoverage: '학생이 말한 판단 단위가 studentClaims에 모두 표현됐는지, 참·거짓이 섞인 한 행에 하나의 sourceCheck를 붙였는지(혼합 행) 기록한다.',
    fieldConsistency: 'claimAsStated ↔ sourceCheck ↔ sourceBasis ↔ selectionSupport ↔ reason ↔ assessment 사이 모순을 기록한다.',
    questionStage: 'reason, reconstructedPath, nextAction.question·purpose에 P2·P3·P4를 적용한다. S3 질문은 ⓔ를 겨냥해야 하며, 올바른 ⓓ를 비교 배경으로 언급하는 것은 허용하되 ⓓ를 다시 교정하면 실패. 질문 문안은 표시 문자열만으로 답 가능/양자택일/잘못된 전제를 별도 기록한다.',
    secondary: ['요청 수·추정 비용(코드 고정 단가 2/0.2/12 기준 추정, 청구액 아님)·지연', '정규화 발생 수'],
    reviewers: '사람 판정 전 Claude와 GPT가 유형명·기대값을 지운 출력, 학생 응답, 원자료(지문·보기·선지·제공 해설)를 보고 각각 판정한다. 기대값 대조는 판정 고정 후 한다. 학생 응답을 보면 유형을 알 수 있으므로 완전 블라인드는 아니다.',
  },
};
mkdirSync(DIR, { recursive: true });
if (existsSync(`${DIR}/FROZEN.json`)) { if (JSON.stringify(read(`${DIR}/FROZEN.json`)) !== JSON.stringify(frozen)) throw new Error('Frozen run changed'); }
else {
  if (process.argv[2] !== 'prepare') throw new Error('Prepare first');
  save(`${DIR}/FROZEN.json`, frozen); save(`${DIR}/source.json`, source);
  save(`${DIR}/prompts.json`, { originalPrompt, splitInstruction, splitPrompt, splitSchema: z.toJSONSchema(splitSchema) });
  save(`${DIR}/input-example.json`, example);
}
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, schedule, selfTests: 'passed', maxRequests: 24, estimatedUsdCap: 2 })); process.exit(0); }
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
  if (done) return { output: JSON.parse(done.outputText), usage: undefined, reused: true };
  if (ledger.some(x => x.event === 'START' && x.label === label)) throw new IncompleteRequest(`완료 기록 없는 요청: ${label}`);
  const a = account(), bytes = Buffer.byteLength(JSON.stringify(request)), reservedUsd = (bytes * 2 + 8000 * 12) / 1e6;
  if (a.requests >= frozen.maxRequests || a.estimatedUsd + a.reservedUsd + reservedUsd > frozen.estimatedUsdCap || bytes > 220000) throw new BudgetStop('Budget/size cap');
  const id = a.requests + 1, started = Date.now();
  log({ event: 'START', id, label, at: new Date().toISOString(), reservedUsd, requestHash: hash(JSON.stringify(request)), instructionHash: hash(instructions), input });
  try {
    client ??= new OpenAI({ maxRetries: 0 });
    const response = await client.responses.create(request, { timeout: 60000, maxRetries: 0 });
    const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0;
    const estimatedUsd = u ? ((u.input_tokens - cached) * 2 + cached * 0.2 + u.output_tokens * 12) / 1e6 : reservedUsd;
    log({ event: 'END', id, label, at: new Date().toISOString(), durationMs: Date.now() - started, model: response.model, responseId: response.id,
      status: response.status, incompleteDetails: response.incomplete_details ?? null, usage: u, estimatedUsd, estimatedAtReservation: !u, outputText: response.output_text });
    return { output: JSON.parse(response.output_text), usage: u ? { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: cached } : undefined };
  } catch (e) { log({ event: 'ERROR', id, label, error: String(e) }); throw new ApiFailure(String(e)); }
}
for (const { r, arm } of schedule) {
  const file = `${DIR}/${arm}-r${r}.json`; if (existsSync(file)) continue;
  const steps = []; let session = fresh(arm, r), stage = 'assessment', extra = null;
  try {
    for (stage of ['assessment', 'question']) {
      const label = `${arm}-r${r}-${stage}`;
      extra = null;
      const evaluator = new OpenAISourceDirectProblemEvaluator({ model: frozen.model, effort: 'medium', maxRetries: 0, maxOutputTokens: 8000,
        timeoutMs: 60000, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION, transport: { async parse(o) {
          if (o.instructions !== originalPrompt.trim()) throw new Error('v3 mismatch');
          const assess = o.input.evaluationMode === 'ASSESS_SELECTION_RATIONALE';
          const input = JSON.parse(createSourceDirectProblemRequestContent(o.input)[0].text);
          const split = stage === 'assessment';
          const schema = split ? splitSchema : assess ? SourceDirectRationaleOutputSchema : SourceDirectDiagnosticOutputSchema;
          const response = await callApi(label, split ? splitPrompt : originalPrompt.trim(), input, schema);
          let parsed = response.output;
          extra = { rawOutput: parsed, reusedLedgerOutput: Boolean(response.reused) };
          if (split) {
            const checked = splitSchema.parse(parsed);
            extra = { ...extra, studentClaims: validateClaims(checked.studentClaims, input.observations), selectionSupport: checked.selectionSupport,
              derivedLabel: derivedLabel(checked.studentClaims, checked.selectionSupport) };
            parsed = checked.evaluation;
          }
          const normalized = normalizeSourceQuotes(parsed);
          extra = { ...extra, quoteNormalization: normalized.changes };
          return { outputParsed: normalized.output, usage: response.usage };
        } } });
      const input = inputFor(session), call = await evaluator.evaluate(input);
      steps.push({ stage, input, call, ...extra, labelMatchesDerived: extra?.derivedLabel ? extra.derivedLabel === call.result.assessment : null });
      console.log(JSON.stringify({ label, result: call.result, extra, account: account() }));
      if (stage === 'assessment' && call.result.assessment === 'CLEAR_ERROR') session = applyCorrectRationaleAssessment(session, 'CLEAR_ERROR'); else break;
    }
  } catch (e) {
    // 평가기는 transport 오류를 SourceDirectProblemEvaluatorError로 감싸므로 원인까지 확인한다.
    const root = e?.cause ?? e;
    if (root instanceof BudgetStop || root instanceof IncompleteRequest || root instanceof ApiFailure) {
      // 이 런은 완료로 저장하지 않는다(재개 시 원장의 완료 호출을 재사용). 부분 결과는 덮어쓸 수 있는 파일에 보존한다.
      const stopped = { arm, replicate: r, stage, stopKind: root.constructor.name, stopReason: root.message, steps };
      writeFileSync(`${DIR}/${arm}-r${r}.stopped.json`, JSON.stringify(stopped, null, 2) + '\n');
      console.log(JSON.stringify({ arm, r, stage, stopped: root.message })); break;
    }
    steps.push({ stage, error: String(e), errorName: e?.name ?? null, rawOutput: extra?.rawOutput ?? e?.rawOutput ?? null,
      callMetadata: e?.call ?? null, ...extra });
    console.log(JSON.stringify({ arm, r, stage, error: String(e) }));
  }
  save(file, { arm, replicate: r, steps });
}
const summarize = steps => steps.map(st => ({ stage: st.stage, assessment: st.call?.result?.assessment, action: st.call?.result?.nextAction?.type,
  derivedLabel: st.derivedLabel ?? null, labelMatchesDerived: st.labelMatchesDerived ?? null, error: st.error }));
// RESULTS는 런 파일에서 다시 만드는 요약이므로 재개 때 덮어쓴다.
writeFileSync(`${DIR}/RESULTS.json`, JSON.stringify({ ...account(), runs: schedule.map(({ arm, r }) => {
  if (existsSync(`${DIR}/${arm}-r${r}.json`)) return { arm, replicate: r, stages: summarize(read(`${DIR}/${arm}-r${r}.json`).steps) };
  if (existsSync(`${DIR}/${arm}-r${r}.stopped.json`)) { const x = read(`${DIR}/${arm}-r${r}.stopped.json`);
    return { arm, replicate: r, stopped: { kind: x.stopKind, reason: x.stopReason, stage: x.stage }, stages: summarize(x.steps) }; }
  return { arm, replicate: r, notRun: true };
}), semanticReview: 'reviewCriteria에 따른 수동 검토 필요. 라벨만으로 의미 통과로 집계하지 않는다.' }, null, 2) + '\n');
console.log(JSON.stringify(account()));
