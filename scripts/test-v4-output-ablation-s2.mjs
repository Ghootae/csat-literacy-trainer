import { appendFileSync, closeSync, createReadStream, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  buildCentralStoryGatePayload,
  loadCentralStoryGatePrompt,
  CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult,
} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT = 'docs/experiments/v4-output-field-ablation-s2-2026-09-22';
const SOURCE = 'docs/experiments/v4-light-output-v1-2026-09-22';
const S1 = 'docs/experiments/v4-output-field-ablation-v1-2026-09-22';
const phase = process.argv.find((value) => value.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report', 'audit'].includes(phase));
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const write = (name, value) => writeFileSync(`${ROOT}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
const append = (name, value) => appendFileSync(`${ROOT}/${name}`, `${JSON.stringify(value)}\n`);
const rows = (name) => existsSync(`${ROOT}/${name}`)
  ? readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  : [];
const sourceRows = (path) => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null;
};
const usageCost = (usage) => usage ? ((usage.input_tokens ?? 0) * 2 + (usage.output_tokens ?? 0) * 12) / 1_000_000 : null;
const reservationUsd = (request) => (Math.ceil(JSON.stringify(request).length / 3) * 2 + (request.max_output_tokens ?? 4000) * 12) / 1_000_000;
const needsQuestion = (axes) => axes.some((axis) => ['UNCLEAR_SERIOUS', 'ERROR'].includes(axis.status));

const removedLines = [
  '- centralObjectRepresentation: 학생이 표현한 중심 대상. 확인할 수 없으면 null',
  '- centralStoryRepresentation: 학생의 누적 중심 이야기 표상. 충분히 복원되지 않았으면 null일 수 있다.',
  '- decisionSummary: 전체 판정 이유와 대상 축의 확인·미확인 내용을 한두 문장으로 작성',
];
const basePrompt = loadCentralStoryGatePrompt('v4');
let candidatePrompt = basePrompt;
for (const line of removedLines) {
  assert.equal(candidatePrompt.split(line).length, 2, `Expected exactly one prompt line: ${line}`);
  candidatePrompt = candidatePrompt.replace(`${line}\n`, '');
}
assert.equal(basePrompt.length - candidatePrompt.length, removedLines.reduce((sum, line) => sum + line.length + 1, 0));
const claims = readFileSync('packages/pipeline/experiments/dialogue/current-claims-recording-v1.md', 'utf8').trim();
const errors = readFileSync('packages/pipeline/experiments/dialogue/error-claims-recording-v1.md', 'utf8').trim();
const instructions = `${candidatePrompt}\n\n${claims}\n\n${errors}`;
const CandidateSchema = CentralStoryGateV4ErrorClaimsResultSchema.omit({
  centralObjectRepresentation: true,
  centralStoryRepresentation: true,
  decisionSummary: true,
});

const allCases = read(`${SOURCE}/cases.json`);
const sources = read(`${SOURCE}/sources.json`);
const human = read(`${SOURCE}/HUMAN-ADJUDICATION.json`);
const priorResults = sourceRows(`${SOURCE}/results.jsonl`);
const cases = human.cases.map((reference) => allCases.find((item) => item.id === reference.caseId));
assert.equal(cases.length, 15);
assert.ok(cases.every(Boolean));
const inputFor = (item) => ({
  gold: sources[item.paragraphId].gold,
  goldVersion: 'original-gold-v2',
  goldHash: sources[item.paragraphId].fileHash,
  initialResponse: item.initialResponse,
  history: item.history,
  turn: item.turn,
  questionsAsked: item.history.length,
  maxQuestions: 3,
  ...(item.revealedAxisContent.length ? { revealedAxisContent: item.revealedAxisContent } : {}),
  ...(item.shownSourceGuides.length ? { shownSourceGuides: item.shownSourceGuides } : {}),
});
const requestFor = (item) => ({
  model: 'gpt-5.6-terra',
  instructions,
  input: buildCentralStoryGatePayload(inputFor(item)),
  reasoning: { effort: 'medium' },
  service_tier: 'default',
  max_output_tokens: 4000,
  store: false,
  text: { format: zodTextFormat(CandidateSchema, 'central_story_gate_result') },
});
const axesOf = (result) => result.axisFeedback.map(({ axisId, status, reason }) => ({ axisId, status, reason }));
const humanFor = (id) => human.cases.find((item) => item.caseId === id);
const priorV4For = (id) => priorResults.find((item) => item.caseId === id && item.arm === 'v4');
const priorTargetFor = (id) => priorV4For(id)?.raw?.targetAxisId ?? priorV4For(id)?.validated?.targetAxisId ?? null;
const lifecycleCounts = (ledger = []) => Object.fromEntries(['current', 'superseded', 'retracted'].map((state) => [state, ledger.filter((item) => item.state === state).length]));

if (phase === 'prepare') {
  assert.ok(!existsSync(`${ROOT}/manifest.json`), 'Already frozen; do not overwrite');
  mkdirSync(ROOT, { recursive: true });
  const jobs = cases.map((item) => ({ id: `${item.id}-s2`, caseId: item.id, arm: 's2', request: requestFor(item) }));
  const expected = human.cases.map((reference) => ({
    ...reference,
    approvedTargetAxisId: priorTargetFor(reference.caseId),
    approvedLifecycleCounts: lifecycleCounts(priorV4For(reference.caseId)?.raw?.claimLedger),
  }));
  write('cases.json', cases);
  write('sources.json', sources);
  write('human-reference.json', { ...human, cases: expected });
  write('jobs.json', jobs);
  writeFileSync(`${ROOT}/candidate-instructions.md`, `${instructions}\n`);
  const paths = [
    'scripts/test-v4-output-ablation-s2.mjs', `${ROOT}/PLAN.md`, `${ROOT}/cases.json`, `${ROOT}/sources.json`,
    `${ROOT}/human-reference.json`, `${ROOT}/jobs.json`, `${ROOT}/candidate-instructions.md`,
    'packages/pipeline/experiments/dialogue/central-story-gate-prompt-v4.md',
    'packages/pipeline/experiments/dialogue/current-claims-recording-v1.md',
    'packages/pipeline/experiments/dialogue/error-claims-recording-v1.md',
  ];
  write('manifest.json', {
    version: 'v4-output-field-ablation-s2', preparedAt: new Date().toISOString(),
    authorization: 'User directed cumulative S2 screening on the 15 frozen human-reference cases, one call per case.',
    source: SOURCE, priorStage: S1, cases: 15, repeats: 1, arms: ['s2'], maxCalls: 15,
    maxEstimatedUsd: 0.6, retries: 0, feedbackCalls: 0, model: 'gpt-5.6-terra', effort: 'medium',
    serviceTier: 'default', store: false,
    removedFields: ['centralObjectRepresentation', 'centralStoryRepresentation', 'decisionSummary'],
    removedPromptLines: removedLines, instructionHash: sha(instructions),
    protectedHashes: Object.fromEntries(paths.map((path) => [path, sha(readFileSync(path))])),
  });
}

const manifest = read(`${ROOT}/manifest.json`);
for (const [path, hash] of Object.entries(manifest.protectedHashes)) assert.equal(sha(readFileSync(path)), hash, `Frozen file changed: ${path}`);
const jobs = read(`${ROOT}/jobs.json`);
for (const job of jobs) assert.deepEqual(job.request, requestFor(cases.find((item) => item.id === job.caseId)));

function interpret(job, response) {
  let raw = null;
  let validated = null;
  let contractError = null;
  const item = cases.find((candidate) => candidate.id === job.caseId);
  try {
    assert.equal(response?.status, 'completed', 'API did not complete');
    raw = JSON.parse(response.output_text);
    const parsed = CandidateSchema.parse(raw);
    validated = validateCentralStoryGateResult({
      ...parsed,
      centralObjectRepresentation: null,
      centralStoryRepresentation: null,
      decisionSummary: 'S2 omitted decisionSummary',
    }, inputFor(item)).result;
  } catch (error) {
    contractError = String(error?.message ?? error);
  }
  const comparable = validated ?? (raw ? {
    ...raw, centralObjectRepresentation: null, centralStoryRepresentation: null, decisionSummary: null,
  } : null);
  return {
    id: job.id, caseId: job.caseId, arm: job.arm, raw, validated,
    axes: comparable?.axisFeedback ? axesOf(comparable) : null,
    targetAxisId: comparable?.targetAxisId ?? null,
    effectiveResponse: comparable?.effectiveResponse ?? null,
    lifecycleCounts: lifecycleCounts(comparable?.claimLedger),
    errorClaims: comparable?.errorClaims ?? null,
    contractError,
  };
}
function ledger() {
  const requests = rows('requests.jsonl');
  const responses = rows('responses.jsonl');
  return {
    calls: requests.length,
    knownEstimatedUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
    accountedUsd: requests.reduce((sum, item) => sum + (responses.find((response) => response.id === item.id)?.costUsd ?? item.reserveUsd), 0),
  };
}
function compareHuman(result) {
  const reference = read(`${ROOT}/human-reference.json`).cases.find((item) => item.caseId === result.caseId);
  const changes = reference.approvedAxes.flatMap((axis) => {
    const actual = result.axes?.find((candidate) => candidate.axisId === axis.axisId);
    return actual?.status === axis.status ? [] : [{ axisId: axis.axisId, approved: axis.status, actual: actual?.status ?? null }];
  });
  const question = result.axes ? needsQuestion(result.axes) : null;
  const errorLoss = reference.approvedAxes.filter((axis) => axis.status === 'ERROR').some((axis) => result.axes?.find((candidate) => candidate.axisId === axis.axisId)?.status !== 'ERROR');
  return {
    axisSame: changes.length === 0, changes,
    approvedQuestion: reference.approvedQuestionCandidate, actualQuestion: question,
    questionSame: question === reference.approvedQuestionCandidate,
    approvedTargetAxisId: reference.approvedTargetAxisId,
    actualTargetAxisId: result.targetAxisId,
    targetSame: reference.approvedQuestionCandidate ? result.targetAxisId === reference.approvedTargetAxisId : true,
    errorLoss,
    approvedLifecycleCounts: reference.approvedLifecycleCounts,
    actualLifecycleCounts: result.lifecycleCounts,
  };
}
function summarize() {
  const results = rows('results.jsonl');
  const responses = rows('responses.jsonl');
  const comparisons = results.map((result) => ({ caseId: result.caseId, ...compareHuman(result), contractError: result.contractError }));
  const summary = {
    ...ledger(), calls: results.length,
    valid: results.filter((result) => !result.contractError).length,
    humanAxisMatch: comparisons.filter((item) => item.axisSame).length,
    humanQuestionMatch: comparisons.filter((item) => item.questionSame).length,
    targetMatch: comparisons.filter((item) => item.targetSame).length,
    errorLosses: comparisons.filter((item) => item.errorLoss).length,
    newQuestions: comparisons.filter((item) => item.approvedQuestion === false && item.actualQuestion === true).length,
    questionCandidates: comparisons.filter((item) => item.actualQuestion === true).length,
    medianApiMs: median(responses.filter((item) => item.response).map((item) => item.durationMs)),
    inputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.input_tokens ?? 0), 0),
    outputTokens: responses.reduce((sum, item) => sum + (item.response?.usage?.output_tokens ?? 0), 0),
    estimatedUsd: responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
    comparisons,
  };
  write('summary.json', summary);
  return summary;
}

if (phase === 'run') {
  assert.ok(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY missing');
  const lock = `${ROOT}/live.lock`;
  const descriptor = openSync(lock, 'wx'); closeSync(descriptor);
  try {
    const client = new OpenAI({ maxRetries: 0, timeout: 60000 });
    for (const job of jobs.filter((candidate) => !rows('requests.jsonl').some((request) => request.id === candidate.id))) {
      const current = ledger();
      const reserve = reservationUsd(job.request);
      assert.ok(current.calls + 1 <= manifest.maxCalls && current.accountedUsd + reserve <= manifest.maxEstimatedUsd, 'Local cap stops run');
      append('requests.jsonl', { ...job, sentAt: new Date().toISOString(), reserveUsd: reserve });
      const start = performance.now();
      let response = null;
      let transportError = null;
      try { response = await client.responses.create(job.request, { maxRetries: 0, timeout: 60000 }); }
      catch (error) { transportError = { name: error.name, status: error.status ?? null, code: error.code ?? null }; }
      append('responses.jsonl', { id: job.id, caseId: job.caseId, arm: job.arm, durationMs: performance.now() - start, response, transportError, costUsd: usageCost(response?.usage) });
      append('results.jsonl', interpret(job, response));
      console.log(JSON.stringify({ completed: job.caseId, ...ledger() }));
    }
  } finally { unlinkSync(lock); }
  console.log(JSON.stringify(summarize(), null, 2));
} else if (phase === 'report') {
  console.log(JSON.stringify(summarize(), null, 2));
} else if (phase === 'audit') {
  const requests = rows('requests.jsonl');
  const responses = rows('responses.jsonl');
  const results = rows('results.jsonl');
  assert.equal(requests.length, 15); assert.equal(responses.length, 15); assert.equal(results.length, 15);
  for (const list of [requests, responses, results]) assert.equal(new Set(list.map((item) => item.id)).size, 15);
  for (const job of jobs) {
    assert.deepEqual(requests.find((item) => item.id === job.id).request, job.request);
    assert.deepEqual(results.find((item) => item.id === job.id), interpret(job, responses.find((item) => item.id === job.id).response));
  }
  const summary = summarize();
  assert.ok(summary.accountedUsd <= manifest.maxEstimatedUsd);
  write('execution-audit.json', { auditedAt: new Date().toISOString(), calls: 15, frozenHashesMatch: true, retries: 0, feedbackCalls: 0, ...ledger() });
  console.log(JSON.stringify({ audit: 'passed', valid: summary.valid, humanQuestionMatch: summary.humanQuestionMatch }));
} else {
  console.log(JSON.stringify({ prepared: true, cases: cases.length, jobs: jobs.length, removedLines }));
}

