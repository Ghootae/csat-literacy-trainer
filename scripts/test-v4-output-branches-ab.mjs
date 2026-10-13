import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import {
  buildCentralStoryGatePayload,
  loadCentralStoryGatePrompt,
  CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult,
} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT_A = 'docs/experiments/v4-output-branch-a-short-intent-2026-09-22';
const ROOT_B = 'docs/experiments/v4-output-branch-b1-compact-ledger-2026-09-22';
const SOURCE = 'docs/experiments/v4-light-output-v1-2026-09-22';
const phase = process.argv.find((value) => value.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run-a', 'run-b1', 'report', 'audit'].includes(phase));
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const write = (root, name, value) => writeFileSync(`${root}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
const append = (root, name, value) => appendFileSync(`${root}/${name}`, `${JSON.stringify(value)}\n`);
const rows = (root, name) => existsSync(`${root}/${name}`) ? readFileSync(`${root}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const sourceRows = (path) => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const usageCost = (usage) => usage ? ((usage.input_tokens ?? 0) * 2 + (usage.output_tokens ?? 0) * 12) / 1_000_000 : null;
const reserveUsd = (request) => (Math.ceil(JSON.stringify(request).length / 3) * 2 + (request.max_output_tokens ?? 3200) * 12) / 1_000_000;
const median = (values) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null; };
const needsQuestion = (axes) => axes.some((axis) => ['UNCLEAR_SERIOUS', 'ERROR'].includes(axis.status));

const removedLines = [
  '- centralObjectRepresentation: 학생이 표현한 중심 대상. 확인할 수 없으면 null',
  '- centralStoryRepresentation: 학생의 누적 중심 이야기 표상. 충분히 복원되지 않았으면 null일 수 있다.',
  '- decisionSummary: 전체 판정 이유와 대상 축의 확인·미확인 내용을 한두 문장으로 작성',
];
let s2Prompt = loadCentralStoryGatePrompt('v4');
for (const line of removedLines) {
  assert.equal(s2Prompt.split(line).length, 2, `Expected exactly one prompt line: ${line}`);
  s2Prompt = s2Prompt.replace(`${line}\n`, '');
}
const claimsFull = readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md', 'utf8').trim();
const errorsFull = readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md', 'utf8').trim();

const intentBefore = `questionIntent에는 이번 한 질문으로 확인할 의미와 요구의 한계를 한두 문장으로 확정한다. 질문이나 정답 문장이 아닌 내부 목적이다.
UNCLEAR이면 선택 축의 미확인 의미에 한정한다. 특징·결과 확인을 그 이유 확인으로 바꾸지 않으며, 원인 질문은 축에 그 원인이 표현되어 있고 미확인일 때만 정한다.
DISTORTED이면 학생이 실제로 표현한 오류의 관계·방향·조건을 보존하여 수정할 대상을 정한다. 축 밖의 잘못된 추가 설명은 철회로 해소될 수도 있다.
CAPTURED이면 questionIntent는 null이다. 질문 문장이나 정답 해설은 작성하지 않는다.`;
const intentAfter = `questionIntent에는 이번 한 질문으로 확인할 의미와 요구의 한계를 짧은 한 문장으로 확정한다. 질문이나 정답 문장이 아닌 내부 목적이다.
UNCLEAR이면 선택 축의 미확인 의미에 한정한다. 특징·결과 확인을 그 이유 확인으로 바꾸지 않으며, 원인 질문은 축에 그 원인이 표현되어 있고 미확인일 때만 정한다.
DISTORTED이면 학생이 실제로 표현한 오류의 관계·방향·조건을 보존하여 수정할 대상을 정한다. 축 밖의 잘못된 추가 설명은 철회로 해소될 수도 있다.
CAPTURED이면 questionIntent는 null이다. 그 밖의 모든 미통과 상태에는 targetAxisId와 비어 있지 않은 questionIntent를 유지한다. 질문 문장이나 정답 해설은 작성하지 않는다.`;
assert.equal(s2Prompt.split(intentBefore).length, 2);
let promptA = s2Prompt.replace(intentBefore, intentAfter);
const outputIntentBefore = '- questionIntent: 이번 질문의 확인 목적과 요구 범위. CAPTURED이면 null, 그 밖에는 비어 있지 않은 한두 문장.';
const outputIntentAfter = '- questionIntent: 이번 질문의 확인 목적과 요구 범위. CAPTURED이면 null, 그 밖에는 비어 있지 않은 짧은 한 문장.';
assert.equal(promptA.split(outputIntentBefore).length, 2);
promptA = promptA.replace(outputIntentBefore, outputIntentAfter);
const instructionsA = `${promptA}\n\n${claimsFull}\n\n${errorsFull}`;
const SchemaA = CentralStoryGateV4ErrorClaimsResultSchema.omit({ centralObjectRepresentation: true, centralStoryRepresentation: true, decisionSummary: true });

const CompactRevisionSchema = z.object({ evidence: z.string().min(1), responseIndex: z.number().int().positive() });
const CompactCurrentClaimSchema = z.object({ description: z.string().min(1), evidence: z.string().min(1), responseIndex: z.number().int().nonnegative(), state: z.literal('current') });
const CompactRetiredClaimSchema = z.object({ description: z.string().min(1), evidence: z.string().min(1), responseIndex: z.number().int().nonnegative(), state: z.enum(['superseded', 'retracted']), revisionEvidence: z.array(CompactRevisionSchema).min(1) });
const CompactClaimSchema = z.discriminatedUnion('state', [CompactCurrentClaimSchema, CompactRetiredClaimSchema]);
const SchemaB = CentralStoryGateV4ErrorClaimsResultSchema.omit({ centralObjectRepresentation: true, centralStoryRepresentation: true, decisionSummary: true, claimLedger: true }).extend({ claimLedger: z.array(CompactClaimSchema) });
const claimsCompact = `## 현재 주장과 변경 이력의 압축 기록 계약 (claims-b1)

이 절은 위의 expressedClaims 출력 지시를 대체한다. 통과 기준이나 질문 정책은 바꾸지 않는다. expressedClaims를 별도로 출력하지 말고 claimLedger 하나를 출력한다.

각 주요 주장에는 description, evidence, responseIndex, state를 기록한다. description은 질문 문맥까지 반영한 현재 또는 과거 주장의 짧은 의미이고, evidence는 해당 학생 응답의 정확한 연속 부분 문자열이다. responseIndex는 최초 응답 0, 첫 후속 답변 1, 두 번째 후속 답변 2 순서다. source는 출력하지 않는다. 애플리케이션이 responseIndex와 해당 질문 유형으로 복원한다.

- current: 학생이 현재 유지하는 주장. revisionEvidence 필드 자체를 출력하지 않는다.
- superseded: 후속 답변에서 의미가 명확히 수정·대체된 이전 주장.
- retracted: 학생이 명시적으로 취소한 이전 주장.
- superseded/retracted에는 더 나중 학생 답변의 정확한 인용을 {evidence, responseIndex}로 revisionEvidence에 하나 이상 기록한다. revisionEvidence의 source도 출력하지 않는다.

claimLedger의 순서는 학생 발화의 시간 순서와 같은 응답 안의 등장 순서를 따른다. errorClaims.claimIndex가 이 배열의 current 항목을 가리키므로, 압축을 위해 항목을 재정렬하거나 합치지 않는다.

effectiveResponse, claimLedger, 축 상태는 동일한 수정 해석을 사용한다. 명확히 수정된 옛 주장을 current로 남기지 않고, 새 수정 주장은 새 current 항목으로 기록한다. 서로 모순돼도 어느 주장을 바꿨는지 불분명하면 임의로 retired 처리하지 않는다. “네”, “헷갈려요”, 무응답만으로 기존 주장을 수정·철회된 것으로 만들지 않는다. 한 문장의 일부만 수정됐으면 바뀐 의미와 남은 의미를 분리한다.`;
const instructionsB = `${s2Prompt}\n\n${claimsCompact}\n\n${errorsFull}`;

const allCases = read(`${SOURCE}/cases.json`);
const sources = read(`${SOURCE}/sources.json`);
const human = read(`${SOURCE}/HUMAN-ADJUDICATION.json`);
const priorV4 = sourceRows(`${SOURCE}/results.jsonl`).filter((item) => item.arm === 'v4');
const casesA = human.cases.map((reference) => allCases.find((item) => item.id === reference.caseId));
assert.equal(casesA.length, 15); assert.ok(casesA.every(Boolean));
const inputForA = (item) => ({ gold: sources[item.paragraphId].gold, goldVersion: 'original-gold-v2', goldHash: sources[item.paragraphId].fileHash, initialResponse: item.initialResponse, history: item.history, turn: item.turn, questionsAsked: item.history.length, maxQuestions: 3, ...(item.revealedAxisContent.length ? { revealedAxisContent: item.revealedAxisContent } : {}), ...(item.shownSourceGuides.length ? { shownSourceGuides: item.shownSourceGuides } : {}) });

const baseGold = { paragraphId: 'compact-ledger-procedure', paragraphText: 'A는 허가가 필요하고 B는 보고만 필요하다.', centralObject: 'A와 B의 절차', centralStory: 'A에는 허가가 필요하고 B에는 보고만 필요하다.', centralAxes: [{ id: 'AX1', description: 'A의 허가와 B의 보고를 구분한다.', relationIds: ['MR1'] }], coreRelations: [{ id: 'MR1', description: 'A는 허가, B는 보고.' }] };
const rangeGold = { paragraphId: 'compact-ledger-range', paragraphText: '말을 구할 때는 여러 색의 말을 데려올 수 있지만 흰말을 구할 때는 흰말만 가능하므로 두 표현의 범위와 용법을 구분해야 한다.', centralObject: '말과 흰말', centralStory: '말과 흰말의 범위와 용법은 다르다.', centralAxes: [{ id: 'AX1', description: '말과 흰말의 지시 범위와 용법은 다르다.', relationIds: ['MR1'] }], coreRelations: [{ id: 'MR1', description: '말과 흰말의 용법은 구분해야 한다.' }] };
const ownershipGold = { paragraphId: 'compact-ledger-owner', paragraphText: '법인의 자산은 법인이 소유하고 이사회가 실제 운용한다.', centralObject: '법인 자산', centralStory: '소유와 운용의 주체가 다르다.', centralAxes: [{ id: 'AX1', description: '법인이 자산을 소유하고 이사회가 실제 운용한다.', relationIds: ['MR1'] }], coreRelations: [{ id: 'MR1', description: '소유는 법인, 운용은 이사회.' }] };
const fixture = (id, gold, initialResponse, history, expected) => ({ id, input: { gold, goldVersion: 'b1-fixture-v1', goldHash: sha(JSON.stringify(gold)), initialResponse, history, turn: history.length + 1, questionsAsked: history.length, maxQuestions: 3 }, expected });
const casesB = [
  fixture('B01-current-initial', baseGold, 'A는 허가가 필요하고 B는 보고만 필요하다.', [], { requireCurrent: ['A는 허가', 'B는 보고'], forbidRetired: true }),
  fixture('B02-short-context', ownershipGold, '자산에는 소유 주체와 운용 주체가 있다.', [{ question: { type: 'DIAGNOSTIC', text: '자산의 소유 주체는 누구인가요?' }, answer: '법인이요.' }], { requireCurrent: ['법인이요'], responseIndex: { quote: '법인이요', value: 1 } }),
  fixture('B03-full-correction', baseGold, 'B도 허가가 필요하다.', [{ question: { type: 'CORRECTIVE', text: 'B에 필요한 절차를 다시 확인해 보세요.' }, answer: '앞의 말은 잘못이고 B는 보고만 필요합니다.' }], { requireRetired: ['B도 허가'], requireCurrent: ['B는 보고만'], forbidCurrent: ['B도 허가'], errorMustExclude: ['B도 허가'] }),
  fixture('B04-partial-correction', rangeGold, '흰말을 구해도 검은 말을 가져와도 된다. 용법을 구분할 필요가 없다.', [{ question: { type: 'CORRECTIVE', text: '검은 말을 가져올 수 있나요? 용법은 어떻게 되나요?' }, answer: '흰말 달라면 검은 말은 안 돼요.' }], { requireRetired: ['흰말을 구해도 검은 말'], requireCurrent: ['용법을 구분할 필요가 없다', '흰말 달라면 검은 말은 안 돼요'], requireErrorCurrent: ['용법을 구분할 필요가 없다'] }),
  fixture('B05-explicit-retraction', baseGold, 'B도 허가가 필요하다.', [{ question: { type: 'CORRECTIVE', text: 'B에 필요한 절차를 다시 확인해 보세요.' }, answer: '앞의 말은 취소할게요. 모르겠어요.' }], { requireRetracted: ['B도 허가'], forbidCurrent: ['B도 허가'], errorMustExclude: ['B도 허가'] }),
  fixture('B06-ambiguous-contradiction', baseGold, 'B도 허가가 필요하다.', [{ question: { type: 'DIAGNOSTIC', text: 'B에 필요한 절차는 무엇인가요?' }, answer: 'B는 보고만 필요한 것 같지만 처음 말한 허가도 맞을 수 있어요.' }], { requireCurrent: ['B도 허가', '보고만 필요한 것 같지만'], requireErrorCurrent: ['B도 허가'] }),
  fixture('B07-unresolved-error', baseGold, 'A는 허가가 필요하다. B도 허가가 필요하다.', [], { requireCurrent: ['A는 허가', 'B도 허가'], requireErrorCurrent: ['B도 허가'] }),
  fixture('B08-corrected-new-error', baseGold, 'A는 허가가 필요하다. B도 허가가 필요하다.', [{ question: { type: 'CORRECTIVE', text: 'B의 절차는 무엇인가요?' }, answer: 'B는 보고예요. A도 보고만.' }], { requireRetired: ['B도 허가'], requireCurrent: ['B는 보고예요', 'A도 보고만'], forbidCurrent: ['B도 허가'], requireErrorCurrent: ['A도 보고만'], errorMustExclude: ['B도 허가'] }),
];

const requestA = (item) => ({ model: 'gpt-5.6-terra', instructions: instructionsA, input: buildCentralStoryGatePayload(inputForA(item)), reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 3200, store: false, text: { format: zodTextFormat(SchemaA, 'central_story_gate_result') } });
const requestB = (item) => ({ model: 'gpt-5.6-terra', instructions: instructionsB, input: buildCentralStoryGatePayload(item.input), reasoning: { effort: 'medium' }, service_tier: 'default', max_output_tokens: 3200, store: false, text: { format: zodTextFormat(SchemaB, 'central_story_gate_compact_claims') } });
const sourceFor = (input, responseIndex) => responseIndex === 0 ? 'initial' : input.history[responseIndex - 1]?.question.type === 'CORRECTIVE' ? 'corrective' : 'diagnostic';
function expandLedger(compact, input) { return compact.map((claim) => ({ ...claim, source: sourceFor(input, claim.responseIndex), revisionEvidence: claim.state === 'current' ? [] : claim.revisionEvidence.map((revision) => ({ ...revision, source: sourceFor(input, revision.responseIndex) })) })); }
const axesOf = (result) => result.axisFeedback.map(({ axisId, status, reason }) => ({ axisId, status, reason }));

if (phase === 'prepare') {
  assert.ok(!existsSync(`${ROOT_A}/manifest.json`) && !existsSync(`${ROOT_B}/manifest.json`), 'Already frozen; do not overwrite');
  mkdirSync(ROOT_A, { recursive: true }); mkdirSync(ROOT_B, { recursive: true });
  const jobsA = casesA.map((item) => ({ id: `${item.id}-a`, caseId: item.id, request: requestA(item) }));
  const jobsB = casesB.map((item) => ({ id: item.id, caseId: item.id, request: requestB(item) }));
  write(ROOT_A, 'cases.json', casesA); write(ROOT_A, 'sources.json', sources); write(ROOT_A, 'human-reference.json', human); write(ROOT_A, 'jobs.json', jobsA); writeFileSync(`${ROOT_A}/candidate-instructions.md`, `${instructionsA}\n`);
  write(ROOT_B, 'fixtures.json', casesB); write(ROOT_B, 'jobs.json', jobsB); writeFileSync(`${ROOT_B}/candidate-instructions.md`, `${instructionsB}\n`);
  const common = { preparedAt: new Date().toISOString(), authorization: 'User approved independent A and B1 tests, one call per case.', model: 'gpt-5.6-terra', effort: 'medium', serviceTier: 'default', store: false, retries: 0, sharedMaxEstimatedUsd: 1.0 };
  const pathsA = ['scripts/test-v4-output-branches-ab.mjs', `${ROOT_A}/PLAN.md`, `${ROOT_A}/jobs.json`, `${ROOT_A}/candidate-instructions.md`];
  const pathsB = ['scripts/test-v4-output-branches-ab.mjs', `${ROOT_B}/PLAN.md`, `${ROOT_B}/jobs.json`, `${ROOT_B}/candidate-instructions.md`];
  write(ROOT_A, 'manifest.json', { ...common, version: 'v4-output-branch-a-short-intent', cases: 15, maxCalls: 15, protectedHashes: Object.fromEntries(pathsA.map((path) => [path, sha(readFileSync(path))])) });
  write(ROOT_B, 'manifest.json', { ...common, version: 'v4-output-branch-b1-compact-ledger', cases: 8, maxCalls: 8, protectedHashes: Object.fromEntries(pathsB.map((path) => [path, sha(readFileSync(path))])) });
}

const manifestA = read(`${ROOT_A}/manifest.json`); const manifestB = read(`${ROOT_B}/manifest.json`);
for (const manifest of [manifestA, manifestB]) for (const [path, hash] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(path)), hash, `Frozen file changed: ${path}`);
const jobsA = read(`${ROOT_A}/jobs.json`); const jobsB = read(`${ROOT_B}/jobs.json`);
for (const job of jobsA) assert.deepEqual(job.request, requestA(casesA.find((item) => item.id === job.caseId)));
for (const job of jobsB) assert.deepEqual(job.request, requestB(casesB.find((item) => item.id === job.caseId)));

function interpretA(job, response) {
  let raw = null, validated = null, contractError = null;
  try { assert.equal(response?.status, 'completed'); raw = JSON.parse(response.output_text); const parsed = SchemaA.parse(raw); const item = casesA.find((value) => value.id === job.caseId); validated = validateCentralStoryGateResult({ ...parsed, centralObjectRepresentation: null, centralStoryRepresentation: null, decisionSummary: 'A omitted decisionSummary' }, inputForA(item)).result; }
  catch (error) { contractError = String(error?.message ?? error); }
  const comparable = validated ?? raw;
  return { id: job.id, caseId: job.caseId, raw, validated, axes: comparable?.axisFeedback ? axesOf(comparable) : null, targetAxisId: comparable?.targetAxisId ?? null, questionIntent: comparable?.questionIntent ?? null, intentChars: comparable?.questionIntent?.length ?? 0, effectiveResponse: comparable?.effectiveResponse ?? null, contractError };
}
function interpretB(job, response) {
  let raw = null, reconstructed = null, validated = null, contractError = null;
  const item = casesB.find((value) => value.id === job.caseId);
  try { assert.equal(response?.status, 'completed'); raw = JSON.parse(response.output_text); const parsed = SchemaB.parse(raw); reconstructed = { ...parsed, claimLedger: expandLedger(parsed.claimLedger, item.input), centralObjectRepresentation: null, centralStoryRepresentation: null, decisionSummary: 'B1 omitted decisionSummary' }; validated = validateCentralStoryGateResult(reconstructed, item.input).result; }
  catch (error) { contractError = String(error?.message ?? error); }
  return { id: job.id, caseId: job.caseId, raw, reconstructed, validated, contractError };
}
const quoteMatches = (claims, quote) => claims.filter((claim) => claim.evidence.includes(quote) || quote.includes(claim.evidence));
function checkB(result) {
  const fixtureCase = casesB.find((item) => item.id === result.caseId); const failures = [];
  if (result.contractError) return { pass: false, failures: [`contract: ${result.contractError}`] };
  const ledger = result.validated.claimLedger; const current = ledger.filter((claim) => claim.state === 'current'); const retired = ledger.filter((claim) => claim.state !== 'current'); const errors = result.validated.errorClaims;
  const expect = fixtureCase.expected;
  const require = (kind, list, claims) => { for (const quote of list ?? []) if (!quoteMatches(claims, quote).length) failures.push(`${kind} missing: ${quote}`); };
  require('current', expect.requireCurrent, current); require('retired', expect.requireRetired, retired); require('retracted', expect.requireRetracted, ledger.filter((claim) => claim.state === 'retracted'));
  for (const quote of expect.forbidCurrent ?? []) if (quoteMatches(current, quote).length) failures.push(`forbidden current: ${quote}`);
  if (expect.forbidRetired && retired.length) failures.push('unexpected retired claim');
  if (expect.responseIndex) for (const claim of quoteMatches(ledger, expect.responseIndex.quote)) if (claim.responseIndex !== expect.responseIndex.value) failures.push(`wrong responseIndex for ${expect.responseIndex.quote}`);
  for (const quote of expect.requireErrorCurrent ?? []) { const hits = errors.filter((error) => error.evidence.includes(quote) || quote.includes(error.evidence)); if (!hits.length) failures.push(`error missing: ${quote}`); for (const hit of hits) if (ledger[hit.claimIndex]?.state !== 'current') failures.push(`error points retired: ${quote}`); }
  for (const quote of expect.errorMustExclude ?? []) if (errors.some((error) => error.evidence.includes(quote) || quote.includes(error.evidence))) failures.push(`retired error retained: ${quote}`);
  return { pass: failures.length === 0, failures, lifecycle: Object.fromEntries(['current', 'superseded', 'retracted'].map((state) => [state, ledger.filter((claim) => claim.state === state).length])), errorClaims: errors.length };
}
function totalLedger() { const requests = [...rows(ROOT_A, 'requests.jsonl'), ...rows(ROOT_B, 'requests.jsonl')]; const responses = [...rows(ROOT_A, 'responses.jsonl'), ...rows(ROOT_B, 'responses.jsonl')]; return { calls: requests.length, costUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0) }; }
async function run(root, jobs, interpret, maxCalls) {
  assert.ok(process.env.OPENAI_API_KEY); const lock = `${root}/live.lock`; const fd = openSync(lock, 'wx'); closeSync(fd);
  try { const client = new OpenAI({ maxRetries: 0, timeout: 60000 }); for (const job of jobs.filter((candidate) => !rows(root, 'requests.jsonl').some((request) => request.id === candidate.id))) {
    const total = totalLedger(); const reservation = reserveUsd(job.request); assert.ok(total.calls + 1 <= 23 && total.costUsd + reservation <= 1.0, 'Shared local cap stops run'); assert.ok(rows(root, 'requests.jsonl').length + 1 <= maxCalls);
    append(root, 'requests.jsonl', { ...job, sentAt: new Date().toISOString(), reserveUsd: reservation }); const started = performance.now(); let response = null, transportError = null;
    try { response = await client.responses.create(job.request, { maxRetries: 0, timeout: 60000 }); } catch (error) { transportError = { name: error.name, status: error.status ?? null, code: error.code ?? null }; }
    append(root, 'responses.jsonl', { id: job.id, caseId: job.caseId, durationMs: performance.now() - started, response, transportError, costUsd: usageCost(response?.usage) }); append(root, 'results.jsonl', interpret(job, response)); console.log(JSON.stringify({ completed: job.id, ...totalLedger() }));
  }} finally { unlinkSync(lock); }
}
function summaryA() {
  const results = rows(ROOT_A, 'results.jsonl'); const responses = rows(ROOT_A, 'responses.jsonl'); const comparisons = results.map((result) => { const ref = human.cases.find((item) => item.caseId === result.caseId); const changes = ref.approvedAxes.flatMap((axis) => { const actual = result.axes?.find((value) => value.axisId === axis.axisId); return actual?.status === axis.status ? [] : [{ axisId: axis.axisId, approved: axis.status, actual: actual?.status ?? null }]; }); const actualQuestion = result.axes ? needsQuestion(result.axes) : null; const target = priorV4.find((item) => item.caseId === result.caseId)?.raw?.targetAxisId ?? priorV4.find((item) => item.caseId === result.caseId)?.validated?.targetAxisId ?? null; return { caseId: result.caseId, axisSame: !changes.length, changes, questionSame: actualQuestion === ref.approvedQuestionCandidate, newQuestion: !ref.approvedQuestionCandidate && actualQuestion === true, targetSame: result.targetAxisId === target, intentPolicyValid: result.axes ? (result.axes.every((axis) => axis.status === 'PASS') ? result.questionIntent === null : Boolean(result.questionIntent?.trim()) && Boolean(result.targetAxisId)) : false, intentChars: result.intentChars, contractError: result.contractError }; });
  const summary = { calls: results.length, valid: results.filter((item) => !item.contractError).length, humanAxisMatch: comparisons.filter((item) => item.axisSame).length, humanQuestionMatch: comparisons.filter((item) => item.questionSame).length, newQuestions: comparisons.filter((item) => item.newQuestion).length, targetMatch: comparisons.filter((item) => item.targetSame).length, intentPolicyValid: comparisons.filter((item) => item.intentPolicyValid).length, medianIntentChars: median(comparisons.filter((item) => item.intentChars).map((item) => item.intentChars)), medianApiMs: median(responses.map((item) => item.durationMs)), inputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.input_tokens ?? 0), 0), outputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.output_tokens ?? 0), 0), costUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0), comparisons }; write(ROOT_A, 'summary.json', summary); return summary;
}
function summaryB() { const results = rows(ROOT_B, 'results.jsonl'); const responses = rows(ROOT_B, 'responses.jsonl'); const checks = results.map((result) => ({ caseId: result.caseId, ...checkB(result) })); const summary = { calls: results.length, schemaAndLegacyContractValid: results.filter((item) => !item.contractError).length, fixturePass: checks.filter((item) => item.pass).length, medianApiMs: median(responses.map((item) => item.durationMs)), inputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.input_tokens ?? 0), 0), outputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.output_tokens ?? 0), 0), costUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0), checks }; write(ROOT_B, 'summary.json', summary); return summary; }

if (phase === 'run-a') { await run(ROOT_A, jobsA, interpretA, 15); console.log(JSON.stringify(summaryA(), null, 2)); }
else if (phase === 'run-b1') { await run(ROOT_B, jobsB, interpretB, 8); console.log(JSON.stringify(summaryB(), null, 2)); }
else if (phase === 'report') console.log(JSON.stringify({ A: summaryA(), B1: summaryB(), total: totalLedger() }, null, 2));
else if (phase === 'audit') { assert.equal(rows(ROOT_A, 'requests.jsonl').length, 15); assert.equal(rows(ROOT_A, 'responses.jsonl').length, 15); assert.equal(rows(ROOT_A, 'results.jsonl').length, 15); assert.equal(rows(ROOT_B, 'requests.jsonl').length, 8); assert.equal(rows(ROOT_B, 'responses.jsonl').length, 8); assert.equal(rows(ROOT_B, 'results.jsonl').length, 8); for (const job of jobsA) assert.deepEqual(rows(ROOT_A, 'results.jsonl').find((item) => item.id === job.id), interpretA(job, rows(ROOT_A, 'responses.jsonl').find((item) => item.id === job.id).response)); for (const job of jobsB) assert.deepEqual(rows(ROOT_B, 'results.jsonl').find((item) => item.id === job.id), interpretB(job, rows(ROOT_B, 'responses.jsonl').find((item) => item.id === job.id).response)); const total = totalLedger(); assert.ok(total.calls <= 23 && total.costUsd <= 1.0); write(ROOT_A, 'execution-audit.json', { auditedAt: new Date().toISOString(), calls: 15, retries: 0, hashesMatch: true }); write(ROOT_B, 'execution-audit.json', { auditedAt: new Date().toISOString(), calls: 8, retries: 0, hashesMatch: true }); console.log(JSON.stringify({ audit: 'passed', A: summaryA(), B1: summaryB(), total }, null, 2)); }
else console.log(JSON.stringify({ prepared: true, A: casesA.length, B1: casesB.length }));
