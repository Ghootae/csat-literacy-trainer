// 공손룡 12번 역전 응답: 첫 평가의 단일 판정(A) vs 학생 주장별 원문 대조·충분성 분리 기록(B).
// 해석표 없음. 질문 단계는 두 조건 모두 원래 v3 그대로. prepare는 API를 호출하지 않는다.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput, OpenAISourceDirectProblemEvaluator,
  createSourceDirectProblemRequestContent, SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';
import { locateQuote } from './lib/marker-quote-validation.mjs';

const DIR = 'docs/experiments/gongsun-claim-split-2026-10-06';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
// 직전 해석 방식 시험의 직접 표시 원문(태그 포함)을 그대로 쓴다: inline_only 조건과 같은 원자료.
const source = SourceDirectProblemBundleSchema.parse(read('docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json'));
const fixture = read('docs/experiments/gongsun-marker-input-ab-2026-10-02/cases.json').cases.find(x => x.id === 'G-error');
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

const fresh = r => submitInitialProblemResponse(createProblemSolvingSession({ sessionId: `claim-split-r${r}`,
  questionId: source.questionId, answerChoiceId: source.answerChoiceId }), { initialChoiceId: fixture.choiceId, rationale: fixture.rationale });
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
const derivedLabel = (claims, support) => claims.some(c => c.sourceCheck === 'CONTRADICTED') ? 'CLEAR_ERROR'
  : support === 'SUFFICIENT' ? 'SUPPORTED' : 'UNCERTAIN';

// 오프라인 자체 점검: 의미 판정 기대값은 API 입력에 넣지 않는다.
const example = inputFor(fresh(1));
const okClaim = { observationId: 'O1', quote: fixture.rationale.slice(0, 10), claimAsStated: 'offline', sourceCheck: 'UNDETERMINED', sourceBasis: 'offline' };
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

const arms = ['single_enum', 'claim_split'];
const schedule = [1, 2, 3, 4, 5].flatMap(r => (r % 2 ? arms : [...arms].reverse()).map(arm => ({ r, arm })));
const frozen = { sourceHash: hash(JSON.stringify(source)), fixture, schedule,
  promptHashes: { v3: hash(originalPrompt), split: hash(splitPrompt) }, schemaHash: hash(JSON.stringify(z.toJSONSchema(splitSchema))),
  runnerHash: hash(readFileSync(new URL(import.meta.url))), validatorHash: hash(readFileSync('scripts/lib/marker-quote-validation.mjs')),
  distHashes: Object.fromEntries(['index.js', 'problem-solving/source-direct-evaluator-runtime.js', 'problem-solving/source-direct-evaluator.js', 'problem-solving/session.js']
    .map(f => [f, hash(readFileSync(`packages/pipeline/dist/${f}`))])),
  model: 'gpt-5.6-terra', effort: 'medium', maxRequests: 20, estimatedUsdCap: 2, maxOutputTokens: 8000, maxRetries: 0,
  design: [
    '해석표 없음. 원래 v3는 프롬프트·평가 계약 기준이며, 직접 표시 태그 원문과 시험용 인용 정규화를 포함한 실행 전체가 과거 v3 실행과 동일한 것은 아니다.',
    '두 조건 모두 정답(answerChoiceId)과 제공 해설(officialExplanation, d/e 대응 포함)을 입력으로 받는다. 정답·해설 블라인드 실험이 아니다. B 추가 지시에는 문항별 의미가 없다.',
    'B는 복합 처치다: 주장 전체 열거, 학생 발화 그대로 옮기기 재강조, 항목별 독립 판정과 선택 정오에 따른 판정 변경 금지, 충분성 별도 기록과 그 정의, 평가 전 선행 출력, 라벨 유도 규칙 명시. 출력량도 늘어난다. 어느 요소의 효과인지 분리되지 않는다.',
    '질문 단계(DIAGNOSE_PATH)는 두 조건 모두 원래 v3이며 최초 평가의 reason이나 B 기록을 받지 않는다. 최초 평가가 계약을 통과하고 CLEAR_ERROR일 때만 진입한다. 질문 차이를 B 기록의 효과로 해석하지 않는다.',
    '순서는 AB/BA 교대(무작위 아님). 증거 인용의 시험용 태그·공백·인용부호 차이만 코드가 정규화하고 원출력은 원장에 보존한다. 계약 실패는 재시도·재생성하지 않는다. 중단 후 재개 시 원장에 완료된 호출은 재사용하고, 완료 기록 없는 호출이 있으면 멈춘다.',
    '과거 실험의 계약 실패율·호출 수와 단순 합산 비교하지 않는다. 결과는 탐색용이며 조건 우열을 확정하지 않는다.',
  ],
  reviewCriteria: {
    unit: '각 런의 최초 평가 출력 전체(B는 studentClaims·selectionSupport 포함)와 질문 단계 출력 전체',
    outcomeCategories: ['계약 실패(원출력이 읽히면 의미 검토 포함, 읽을 수 없으면 결측)', '예산 중단·미실행(결측)', '의미 통과', '의미 실패', '질문 미진입'],
    P1_label: 'assessment가 CLEAR_ERROR인가. 단독으로 성공 집계하지 않는다.',
    P2_sourceReading: '평가자가 원문 해석으로 서술한 ⓓ, ⓔ 대응 각각을 정확(ⓓ=색 미지정 일반적인 옷, ⓔ=빨간 옷)/오류(ⓓ=빨간 옷, ⓔ=일반적인 옷, ⓓ와 ⓔ가 같은 대상 등)/판단 불가(서술 없음)로 기록한다. 학생 발화의 인용·소개는 원문 해석으로 보지 않는다. 오류가 하나라도 있으면 실패.',
    P3_attribution: '출력 전체(reason, B의 claimAsStated)에서 학생 주장 서술이 학생이 말한 대응(ⓓ=빨간 옷, ⓔ=일반적인 옷)과 일치하는가. 한 곳이라도 학생 주장을 원문 해석 쪽으로 바꿔 서술하면 실패.',
    P4_errorLocation: '판단 단위를 ⓓ 대응, ⓔ 대응, "ⓓ와 ⓔ는 서로 다른 대상", "따라서 ④는 부적절" 넷으로 나눈다. 오류 지목은 앞의 둘에만 있어야 하고 뒤의 둘을 오류로 지목하면 실패. B의 sourceCheck도 대상이다.',
    semanticPass: 'P1~P4 모두 충족. P2·P3·P4 결과는 따로도 보고한다.',
    B_claimCoverage: '네 판단 단위가 studentClaims에 모두 표현됐는지, 참·거짓이 섞인 한 행에 하나의 sourceCheck를 붙였는지(혼합 행) 기록한다.',
    B_fieldConsistency: 'claimAsStated ↔ sourceCheck ↔ sourceBasis ↔ reason ↔ assessment 사이 모순을 기록한다. derivedLabel 일치는 보조 지표다.',
    questionStage: 'reason, reconstructedPath, nextAction.question·purpose에 P2·P3·P4를 적용한다. 질문 문안은 표시 문자열만으로 답 가능/양자택일/잘못된 전제를 별도 기록한다.',
    secondary: ['요청 수·추정 비용(코드 고정 단가 2/0.2/12 기준 추정, 청구액 아님)·지연', '정규화 발생 수'],
    reviewers: '사람 판정 전 Claude와 GPT가 조건명을 지운 출력으로 각각 판정하고 불일치를 보존한다. B 전용 필드로 조건을 알 수 있으므로 완전 블라인드는 아니다.',
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
if (process.argv[2] === 'prepare') { console.log(JSON.stringify({ prepared: true, schedule, selfTests: 'passed', maxRequests: 20, estimatedUsdCap: 2 })); process.exit(0); }
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
  } catch (e) { log({ event: 'ERROR', id, label, error: String(e) }); throw e; }
}
for (const { r, arm } of schedule) {
  const file = `${DIR}/${arm}-r${r}.json`; if (existsSync(file)) continue;
  const steps = []; let session = fresh(r), stage = 'assessment', extra = null;
  try {
    for (stage of ['assessment', 'question']) {
      const label = `${arm}-r${r}-${stage}`;
      extra = null;
      const evaluator = new OpenAISourceDirectProblemEvaluator({ model: frozen.model, effort: 'medium', maxRetries: 0, maxOutputTokens: 8000,
        timeoutMs: 60000, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION, transport: { async parse(o) {
          if (o.instructions !== originalPrompt.trim()) throw new Error('v3 mismatch');
          const assess = o.input.evaluationMode === 'ASSESS_SELECTION_RATIONALE';
          const input = JSON.parse(createSourceDirectProblemRequestContent(o.input)[0].text);
          const split = arm === 'claim_split' && stage === 'assessment';
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
    if (root instanceof BudgetStop || root instanceof IncompleteRequest) { console.log(JSON.stringify({ arm, r, stage, stopped: root.message })); break; }
    steps.push({ stage, error: String(e), errorName: e?.name ?? null, rawOutput: extra?.rawOutput ?? e?.rawOutput ?? null,
      callMetadata: e?.call ?? null, ...extra });
    console.log(JSON.stringify({ arm, r, stage, error: String(e) }));
  }
  save(file, { arm, replicate: r, steps });
}
save(`${DIR}/RESULTS.json`, { ...account(), runs: schedule.map(({ arm, r }) => { if (!existsSync(`${DIR}/${arm}-r${r}.json`)) return { arm, replicate: r, notRun: true };
  const x = read(`${DIR}/${arm}-r${r}.json`); return { arm, replicate: r,
  stages: x.steps.map(s => ({ stage: s.stage, assessment: s.call?.result?.assessment, action: s.call?.result?.nextAction?.type,
    derivedLabel: s.derivedLabel ?? null, labelMatchesDerived: s.labelMatchesDerived ?? null, error: s.error })) }; }),
  semanticReview: 'reviewCriteria에 따른 조건 가림 수동 검토 필요. 라벨만으로 의미 통과로 집계하지 않는다.' });
console.log(JSON.stringify(account()));
