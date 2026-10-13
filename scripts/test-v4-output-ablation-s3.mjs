import { appendFileSync, closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  buildCentralStoryGatePayload, loadCentralStoryGatePrompt, CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult,
} from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import {
  buildSelectiveFeedbackPayload, selectDialogueFeedbackRoute, selectSparseDetailedRelation,
  SelectiveFeedbackOutputSchema, validateSelectiveFeedbackOutput,
} from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';

const ROOT = 'docs/experiments/v4-output-field-ablation-s3-2026-09-22';
const SOURCE = 'docs/experiments/v4-light-output-v1-2026-09-22';
const phase = process.argv.find((value) => value.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run-gate', 'run-questions', 'report', 'audit'].includes(phase));
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const write = (name, value) => writeFileSync(`${ROOT}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
const append = (name, value) => appendFileSync(`${ROOT}/${name}`, `${JSON.stringify(value)}\n`);
const rows = (name) => existsSync(`${ROOT}/${name}`) ? readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const sourceRows = (path) => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const median = (values) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null; };
const usageCost = (usage) => usage ? ((usage.input_tokens ?? 0) * 2 + (usage.output_tokens ?? 0) * 12) / 1_000_000 : null;
const reservationUsd = (request) => (Math.ceil(JSON.stringify(request).length / 3) * 2 + (request.max_output_tokens ?? 4000) * 12) / 1_000_000;
const needsQuestion = (axes) => axes.some((axis) => ['UNCLEAR_SERIOUS', 'ERROR'].includes(axis.status));

const baseGate = loadCentralStoryGatePrompt('v4');
const removals = [
  '- centralObjectRepresentation: 학생이 표현한 중심 대상. 확인할 수 없으면 null',
  '- centralStoryRepresentation: 학생의 누적 중심 이야기 표상. 충분히 복원되지 않았으면 null일 수 있다.',
  'decisionSummary에는 전체 판정 이유와 함께, 선택한 축에서 이미 확인한 내용과 아직 확인하지 못한 핵심 연결을 한두 문장으로 구분해 적는다.',
  '- decisionSummary: 전체 판정 이유와 대상 축의 확인·미확인 내용을 한두 문장으로 작성',
];
let gatePrompt = baseGate;
for (const line of removals) { assert.equal(gatePrompt.split(line).length, 2, `Expected one line: ${line}`); gatePrompt = gatePrompt.replace(`${line}\n`, ''); }
const replacements = [
  [
    'questionIntent에는 이번 한 질문으로 확인할 의미와 요구의 한계를 한두 문장으로 확정한다. 질문이나 정답 문장이 아닌 내부 목적이다.\nUNCLEAR이면 선택 축의 미확인 의미에 한정한다. 특징·결과 확인을 그 이유 확인으로 바꾸지 않으며, 원인 질문은 축에 그 원인이 표현되어 있고 미확인일 때만 정한다.\nDISTORTED이면 학생이 실제로 표현한 오류의 관계·방향·조건을 보존하여 수정할 대상을 정한다. 축 밖의 잘못된 추가 설명은 철회로 해소될 수도 있다.\nCAPTURED이면 questionIntent는 null이다. 질문 문장이나 정답 해설은 작성하지 않는다.',
    '자동 질문이 필요한 경우에만 questionIntent를 짧게 작성한다. 선택 축이 ERROR 또는 UNCLEAR_SERIOUS이면 이번 한 질문의 확인·교정 대상과 요구 한계를 한 문장으로 확정한다. ERROR에서는 학생의 실제 오류 관계를 보존하고, SERIOUS에서는 축에 표현된 미확인 의미만 대상으로 삼는다. 모든 축이 PASS 또는 UNCLEAR_OK이면 questionIntent는 null이다. 질문 문장이나 정답 해설은 작성하지 않는다.',
  ],
  [
    'PASS가 아닌 축의 questionIntent는 이후 선택적 보완에서도 사용하므로 유지한다. OK에는 시스템이 자동으로 질문하지 않으며 학생이 보완을 요청할 때만 그 목적을 사용한다.',
    'OK에는 자동 질문 계획을 미리 만들지 않는다. 학생이 선택적으로 보완을 요청하면 targetAxisId와 남은 판정 근거를 이용해 그때 질문 계획을 정한다.',
  ],
  [
    '- questionIntent: 이번 질문의 확인 목적과 요구 범위. CAPTURED이면 null, 그 밖에는 비어 있지 않은 한두 문장.',
    '- questionIntent: ERROR 또는 UNCLEAR_SERIOUS가 있어 자동 질문이 필요하면 짧은 한 문장, 그 밖에는 null.',
  ],
];
for (const [before, after] of replacements) { assert.equal(gatePrompt.split(before).length, 2, `Expected one block: ${before}`); gatePrompt = gatePrompt.replace(before, after); }
const claims = readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md', 'utf8').trim();
const errors = readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md', 'utf8').trim();
const gateInstructions = `${gatePrompt}\n\n${claims}\n\n${errors}`;
const GateSchema = CentralStoryGateV4ErrorClaimsResultSchema.omit({ centralObjectRepresentation: true, centralStoryRepresentation: true, decisionSummary: true });

let questionPrompt = readFileSync('packages/pipeline/experiments/dialogue/selective-feedback-prompt-v4.md', 'utf8').trim();
const questionReplacements = [
  ['상태, 경로, 질문 대상 축과 questionIntent를 다시 판정하거나 바꾸지 않는다. 1차가 확정한 확인 목적을 학생이 알아들을 수 있는 질문으로 표현하는 역할이다.', '상태, 경로와 질문 대상 축을 다시 판정하거나 바꾸지 않는다. questionIntent가 제공되면 그 범위를 따르고, 없으면 동결된 축 상태와 누락·오류 근거 안에서 질문 목적 하나만 정한다.'],
  ['- decision: 확정된 경로, 대상 축, 축 상태, missingAxisEvidence, questionIntent와 판정 요약', '- decision: 확정된 경로, 대상 축, 축 상태, missingAxisEvidence와 선택적 questionIntent'],
  ['questionIntent가 이번 질문 범위를 결정한다. 원문·상세 관계·축 전체에서 별도의 확인 목적을 다시 선정하지 않는다.\n특징·결과를 확인하는 목적을 이유·근거를 설명하는 요구로 확대하지 않는다. 목적이 충분한 답의 범위를 정하며, 더 깊거나 더 교육적으로 보이는 질문을 위해 범위를 늘리지 않는다.', 'questionIntent가 있으면 그 범위가 질문을 구속한다. questionIntent가 없으면 targetAxisId, targetFeedbackStatus, missingAxisEvidence, explicitErrors와 학생 발화에서 아직 확인되지 않은 중심 의미 하나만 선택한다. 어느 경우에도 특징·결과 확인을 이유·근거 요구로 확대하거나 더 교육적으로 보인다는 이유로 범위를 늘리지 않는다.'],
  ['decisionSummary와 학생의 실제 발화를 함께 참고한다.', '축 상태·누락 또는 오류 근거와 학생의 실제 발화를 함께 참고한다.'],
  ['UNCLEAR_OK에서는 학생이 보완을 선택했기 때문에 이 호출이 실행된다. 기존 questionIntent의 범위만 확인한다.', 'UNCLEAR_OK에서는 학생이 보완을 선택했기 때문에 이 호출이 실행된다. questionIntent가 없으면 targetAxisId의 미확인 중심 의미 하나만 확인한다.'],
];
for (const [before, after] of questionReplacements) { assert.equal(questionPrompt.split(before).length, 2, `Expected one question block: ${before}`); questionPrompt = questionPrompt.replace(before, after); }

const allCases = read(`${SOURCE}/cases.json`);
const sources = read(`${SOURCE}/sources.json`);
const human = read(`${SOURCE}/HUMAN-ADJUDICATION.json`);
const prior = sourceRows(`${SOURCE}/results.jsonl`).filter((item) => item.arm === 'v4');
const gateCases = human.cases.map((reference) => allCases.find((item) => item.id === reference.caseId));
const inputFor = (item) => ({ gold: sources[item.paragraphId].gold, goldVersion: 'original-gold-v2', goldHash: sources[item.paragraphId].fileHash,
  initialResponse: item.initialResponse, history: item.history, turn: item.turn, questionsAsked: item.history.length, maxQuestions: 3,
  ...(item.revealedAxisContent.length ? { revealedAxisContent: item.revealedAxisContent } : {}), ...(item.shownSourceGuides.length ? { shownSourceGuides: item.shownSourceGuides } : {}) });
const gateRequest = (item) => ({ model: 'gpt-5.6-terra', instructions: gateInstructions, input: buildCentralStoryGatePayload(inputFor(item)), reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 4000, store: false, text: { format: zodTextFormat(GateSchema, 'central_story_gate_result') } });
const shortIntents = {
  N16: '수익 활동에 기관 허가가 필요하다는 현재 오류를 고쳐, 허용 목적과 절차를 확인한다.',
  N33: '공기 중에 형성되는 대상이 공기방울인지 잉크 방울인지 현재 오류를 고친다.',
  N13: '법인 자산의 소유 주체와 실제 운용 담당자, 법적 통제의 관계를 확인한다.',
  N31: '크기가 다른 두 기포가 합쳐질 때 공기 이동과 최종 결과를 확인한다.',
  N03: '말과 흰말을 요구할 때 가능한 대상 범위의 차이를 확인한다.',
  N36: '백신이 면역 반응을 실제 감염 전 대비와 어떻게 연결하는지 확인한다.',
  N17: '수익 활동 오류는 다시 묻지 말고, 이사회의 역할과 주요 결정의 허가 통제를 확인한다.',
  N42: '실험실에서 전기적 반발 감소가 mRNA 세포막 진입에 미치는 역할만 확인한다.',
};
const questionIds = Object.keys(shortIntents);
function gateFor(id, intentMode) {
  const result = prior.find((item) => item.caseId === id); assert.ok(result);
  const raw = structuredClone(result.validated ?? result.raw);
  raw.expressedClaims ??= (raw.claimLedger ?? []).filter((item) => item.state === 'current').map(({ description, source, evidence }) => ({ description, source, evidence }));
  delete raw.decisionSummary;
  if (intentMode === 'none') delete raw.questionIntent;
  else if (intentMode === 'short') raw.questionIntent = shortIntents[id];
  return raw;
}
function questionInput(id, intentMode) {
  const item = allCases.find((candidate) => candidate.id === id); const dialogue = inputFor(item); const gateDecision = gateFor(id, intentMode);
  const route = selectDialogueFeedbackRoute(gateDecision); assert.notEqual(route, 'PASS');
  const selectedDetailedRelation = route === 'SPARSE_GAP' ? selectSparseDetailedRelation(dialogue.gold, gateDecision, dialogue) : null;
  return { dialogue, gateDecision, route, selectedDetailedRelation };
}
const questionRequest = (id, mode) => ({ model: 'gpt-5.6-terra', instructions: questionPrompt, input: buildSelectiveFeedbackPayload(questionInput(id, mode)), reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 1800, store: false, text: { format: zodTextFormat(SelectiveFeedbackOutputSchema, 'selective_dialogue_feedback') } });

if (phase === 'prepare') {
  assert.ok(!existsSync(`${ROOT}/manifest.json`)); mkdirSync(ROOT, { recursive: true });
  const gateJobs = gateCases.map((item) => ({ id: `${item.id}-s3-gate`, caseId: item.id, request: gateRequest(item) }));
  const questionJobs = questionIds.flatMap((id) => ['full', 'none', 'short'].map((mode) => ({ id: `${id}-${mode}`, caseId: id, mode, request: questionRequest(id, mode) })));
  write('cases.json', allCases); write('sources.json', sources); write('human-reference.json', human); write('gate-jobs.json', gateJobs); write('question-jobs.json', questionJobs); write('question-fixtures.json', { ids: questionIds, shortIntents });
  writeFileSync(`${ROOT}/gate-instructions.md`, `${gateInstructions}\n`); writeFileSync(`${ROOT}/question-instructions.md`, `${questionPrompt}\n`);
  const paths = ['scripts/test-v4-output-ablation-s3.mjs', `${ROOT}/PLAN.md`, `${ROOT}/gate-jobs.json`, `${ROOT}/question-jobs.json`, `${ROOT}/question-fixtures.json`, `${ROOT}/gate-instructions.md`, `${ROOT}/question-instructions.md`];
  write('manifest.json', { version: 'v4-output-field-ablation-s3', preparedAt: new Date().toISOString(), authorization: 'User approved S3 experiment.', gateCalls: 15, questionCalls: 24, maxCalls: 39, maxEstimatedUsd: 1.2, retries: 0, model: 'gpt-5.6-terra', effort: 'medium', store: false, protectedHashes: Object.fromEntries(paths.map((path) => [path, sha(readFileSync(path))])) });
}
const manifest = read(`${ROOT}/manifest.json`); for (const [path, hash] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(path)), hash, `Frozen file changed: ${path}`);
const gateJobs = read(`${ROOT}/gate-jobs.json`); const questionJobs = read(`${ROOT}/question-jobs.json`);
for (const job of gateJobs) assert.deepEqual(job.request, gateRequest(gateCases.find((item) => item.id === job.caseId)));
for (const job of questionJobs) assert.deepEqual(job.request, questionRequest(job.caseId, job.mode));

async function execute(jobs, prefix) {
  assert.ok(process.env.OPENAI_API_KEY); const lock = `${ROOT}/${prefix}.lock`; const descriptor = openSync(lock, 'wx'); closeSync(descriptor);
  try { const client = new OpenAI({ maxRetries: 0, timeout: 60000 }); for (const job of jobs.filter((candidate) => !rows(`${prefix}-requests.jsonl`).some((request) => request.id === candidate.id))) {
    const allRequests = rows('gate-requests.jsonl').length + rows('question-requests.jsonl').length; const allResponses = [...rows('gate-responses.jsonl'), ...rows('question-responses.jsonl')];
    const accounted = allResponses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0) + reservationUsd(job.request); assert.ok(allRequests + 1 <= manifest.maxCalls && accounted <= manifest.maxEstimatedUsd);
    append(`${prefix}-requests.jsonl`, { ...job, sentAt: new Date().toISOString(), reserveUsd: reservationUsd(job.request) }); const start = performance.now(); let response = null; let transportError = null;
    try { response = await client.responses.create(job.request, { maxRetries: 0, timeout: 60000 }); } catch (error) { transportError = { name: error.name, status: error.status ?? null, code: error.code ?? null }; }
    append(`${prefix}-responses.jsonl`, { id: job.id, caseId: job.caseId, mode: job.mode ?? null, durationMs: performance.now() - start, response, transportError, costUsd: usageCost(response?.usage) });
    if (prefix === 'gate') { let raw = null, validated = null, contractError = null; try { raw = GateSchema.parse(JSON.parse(response.output_text)); const item = gateCases.find((candidate) => candidate.id === job.caseId); const placeholderIntent = raw.questionIntent ?? (raw.axisFeedback.some((axis) => ['ERROR', 'UNCLEAR_SERIOUS'].includes(axis.status)) ? null : 'S3 delayed optional intent'); assert.ok(placeholderIntent); validated = validateCentralStoryGateResult({ ...raw, centralObjectRepresentation: null, centralStoryRepresentation: null, decisionSummary: 'S3 omitted decisionSummary', questionIntent: placeholderIntent }, inputFor(item)).result; } catch (error) { contractError = String(error?.message ?? error); }
      const comparable = validated ?? raw; append('gate-results.jsonl', { id: job.id, caseId: job.caseId, raw, validated, axes: comparable?.axisFeedback?.map(({ axisId, status, reason }) => ({ axisId, status, reason })) ?? null, targetAxisId: comparable?.targetAxisId ?? null, questionIntent: raw?.questionIntent ?? null, effectiveResponse: comparable?.effectiveResponse ?? null, contractError });
    } else { let raw = null, validated = null, contractError = null; try { raw = SelectiveFeedbackOutputSchema.parse(JSON.parse(response.output_text)); validated = validateSelectiveFeedbackOutput(raw, questionInput(job.caseId, job.mode)); } catch (error) { contractError = String(error?.message ?? error); } append('question-results.jsonl', { id: job.id, caseId: job.caseId, mode: job.mode, raw, validated, contractError }); }
    console.log(JSON.stringify({ completed: job.id, calls: allRequests + 1 }));
  }} finally { unlinkSync(lock); }
}
function summarize() {
  const gr = rows('gate-results.jsonl'), qr = rows('question-results.jsonl'), h = human.cases; const gateComparisons = gr.map((result) => { const ref = h.find((item) => item.caseId === result.caseId); const changes = ref.approvedAxes.flatMap((axis) => { const actual = result.axes?.find((item) => item.axisId === axis.axisId); return actual?.status === axis.status ? [] : [{ axisId: axis.axisId, approved: axis.status, actual: actual?.status ?? null }]; }); const actualQuestion = result.axes ? needsQuestion(result.axes) : null; return { caseId: result.caseId, axisSame: !changes.length, changes, questionSame: actualQuestion === ref.approvedQuestionCandidate, newQuestion: !ref.approvedQuestionCandidate && actualQuestion === true, intentPolicyValid: actualQuestion ? Boolean(result.questionIntent?.trim()) : result.questionIntent === null, contractError: result.contractError }; });
  const responses = [...rows('gate-responses.jsonl'), ...rows('question-responses.jsonl')]; const summary = { gate: { calls: gr.length, valid: gr.filter((item) => !item.contractError).length, humanAxisMatch: gateComparisons.filter((item) => item.axisSame).length, humanQuestionMatch: gateComparisons.filter((item) => item.questionSame).length, newQuestions: gateComparisons.filter((item) => item.newQuestion).length, intentPolicyValid: gateComparisons.filter((item) => item.intentPolicyValid).length, comparisons: gateComparisons }, questions: { calls: qr.length, valid: qr.filter((item) => !item.contractError).length, byMode: Object.fromEntries(['full', 'none', 'short'].map((mode) => [mode, qr.filter((item) => item.mode === mode).length])) }, total: { calls: responses.length, costUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0), inputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.input_tokens ?? 0), 0), outputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.output_tokens ?? 0), 0), medianApiMs: median(responses.filter((item) => item.response).map((item) => item.durationMs)) } }; write('summary.json', summary); return summary;
}

if (phase === 'run-gate') { await execute(gateJobs, 'gate'); console.log(JSON.stringify(summarize(), null, 2)); }
else if (phase === 'run-questions') { await execute(questionJobs, 'question'); console.log(JSON.stringify(summarize(), null, 2)); }
else if (phase === 'report') console.log(JSON.stringify(summarize(), null, 2));
else if (phase === 'audit') { const gq = rows('gate-requests.jsonl'), gr = rows('gate-results.jsonl'), qq = rows('question-requests.jsonl'), qr = rows('question-results.jsonl'); assert.equal(gq.length, 15); assert.equal(gr.length, 15); assert.equal(qq.length, 24); assert.equal(qr.length, 24); for (const list of [gq, gr, qq, qr]) assert.equal(new Set(list.map((item) => item.id)).size, list.length); const summary = summarize(); assert.ok(summary.total.costUsd <= manifest.maxEstimatedUsd); write('execution-audit.json', { auditedAt: new Date().toISOString(), gateCalls: 15, questionCalls: 24, frozenHashesMatch: true, retries: 0, costUsd: summary.total.costUsd }); console.log(JSON.stringify({ audit: 'passed', summary })); }
else console.log(JSON.stringify({ prepared: true, gateJobs: gateJobs.length, questionJobs: questionJobs.length }));

