// v5 원문 대입 시험 v2: 모델별 실행(gpt-6.1-sol, gpt-6-luna). test-v5-substitution-check-gongsun.mjs에서 하네스 결함 두 가지를 고친 v2 계약(lib/v5-substitution-check-v2.mjs), 모델 인자, 요청 상한 120만 바꿨다.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pathToFileURL } from 'node:url';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand,
  applyFeedbackAssessment, feedbackRequestContent, feedbackObservationText,
  OpenAIFeedbackEvaluator, FeedbackSelectionAssessmentSchema } from '../packages/pipeline/dist/index.js';
import { sourceBindingSha256 } from './lib/marker-gloss-validation.mjs';
import { CLAIM_BLOCK, QUOTE_BLOCK, validateClaims, instructionsFor as baseInstructions } from './lib/v5-marker-judgment.mjs';
import { ARMS, SUBST_BLOCK, instructionsFor, transformRequest, validateSubstitutionClaims,
  makeSchedule, substitutionSelfCheck, substitutionDistribution, expectedChecks, summarizeRows } from './lib/v5-substitution-check-v2.mjs';

export async function main({ mode = 'prepare', model, dir = `docs/experiments/v5-substitution-check-v2-${model}-gongsun-2026-10-07`, transport } = {}) {
  if (!['gpt-6.1-sol', 'gpt-6-luna', 'gpt-5.6-terra'].includes(model)) throw new Error('Usage: prepare|run <gpt-6.1-sol|gpt-6-luna|gpt-5.6-terra>');
  const DIR = dir, MODE = mode;
  if (!['prepare', 'run'].includes(MODE)) throw new Error('Expected prepare | run');
  const read = p => JSON.parse(readFileSync(p, 'utf8'));
  const hash = x => createHash('sha256').update(x).digest('hex');
  const jsonHash = x => hash(JSON.stringify(x));
  const serialize = x => JSON.stringify(x, null, 2) + '\n';
  const save = (p, x) => writeFileSync(p, serialize(x), { flag: 'wx' });
  const FIX = 'packages/pipeline/fixtures/experiments/problem-solving';
  const productPath = `${FIX}/public/gongsun-long-later-mohists-q12.json`;
  const basePath = 'docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json';
  const answerPath = `${FIX}/gongsun-long-later-mohists-q12.json`;
  const responsesPath = 'docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json';
  const product = read(productPath), base = read(basePath), answer = read(answerPath);
  const source = SourceDirectProblemBundleSchema.parse({ ...base, passage: product.passage, scenario: product.scenario, textAnnotations: product.textAnnotations });
  assert.equal(source.stem, product.stem, 'Source stem mismatch');
  assert.deepEqual(source.choices.map(c => [c.choiceId, c.text]), product.choices.map(c => [c.choiceId, c.text]), 'Source choices mismatch');
  assert.equal(source.answerChoiceId, answer.answerChoiceId, 'Source answer mismatch');
  assert.equal(source.stemPolarity, answer.stemPolarity, 'Source polarity mismatch');
  const { responses, choiceId } = read(responsesPath);
  assert.deepEqual(Object.keys(responses).sort(), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']);
  assert.equal(choiceId, 'C4');
  Object.assign(responses, {
    X1: 'd는 갑이 들고 있는 옷이고, e는 빨간 옷이라 서로 다른 대상이니 4번은 틀렸어요.',
    X2: 'd는 옷장 안에 있는 옷만 가리키고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.',
    X3: 'd는 옷장에 있는 빨간 옷이고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.',
  });
  const v5Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md';
  const v4Path = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md';
  const v5 = readFileSync(v5Path, 'utf8'), baseline = readFileSync(v4Path, 'utf8');
  const prompts = Object.fromEntries(ARMS.map(arm => [arm, instructionsFor(v5, arm)]));
  const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema);
  const errorUnits = { S2: ['ⓓ 대응', 'ⓔ 대응'], S3: ['ⓔ 대응'], S7: ['ⓓ 대응'], X1: ['ⓓ 대응'], X2: ['ⓓ 대응'], X3: ['ⓓ 대응'] };
  const cases = Object.entries(responses).map(([type, text]) => ({ type, text, choiceId, boundary: ['X1', 'X2'].includes(type), expected: {
    reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'INVALID',
    contentAssessment: ['X1', 'X2'].includes(type) ? ['SUPPORTED', 'ERROR'] : [errorUnits[type] ? 'ERROR' : 'SUPPORTED'],
    preferredContentAssessment: type === 'X1' ? 'SUPPORTED' : null,
    byContentAssessment: {
      SUPPORTED: { phase: 'COMPLETED', outcome: 'VERIFIED_CORRECT', errorUnits: [] },
      ERROR: { phase: 'AWAITING_CORRECTION', outcome: null, errorUnits: errorUnits[type] ?? [] },
    },
  } }));
  const schedule = makeSchedule(Object.keys(responses));
  const labelFor = ({ arm, type, r }) => `${arm}-${type}-r${r}`;
  const sessionFor = cell => submitFeedbackCommand(createFeedbackSession(labelFor(cell), source),
    { type: 'SELECT', choiceId, rationale: { mode: 'PROVIDED', text: responses[cell.type] } }, 'o1');
  const optionsFor = cell => ({ arm: cell.arm, baseline, instructions: prompts[cell.arm], selectionSchema: schema });
  function selfCheck() {
    assert.doesNotMatch(SUBST_BLOCK, /빨간|옷|공손룡|묵가|명실|흰 말/u);
    assert.equal(prompts.methods, baseInstructions(v5, 'v5_methods'));
    assert.equal(prompts.methods_subst, prompts.methods + '\n\n' + SUBST_BLOCK);
    for (const r of [1, 2, 3]) for (const type of Object.keys(responses)) {
      const inputs = ARMS.map(arm => feedbackRequestContent(sessionFor({ arm, type, r })));
      assert.deepEqual(inputs[0], inputs[1]);
      for (const arm of ARMS) {
        const request = { instructions: baseline, input: [{ role: 'user', content: inputs[0] }],
          text: { format: { name: 'problem_feedback_v4_assessment', schema } } };
        assert.deepEqual(transformRequest(request, optionsFor({ arm, r })).input, request.input);
      }
    }
    substitutionSelfCheck(source);
  }
  selfCheck();
  // 비용 상한은 terra 단가 기준 추정치(다른 모델 단가 미확인). 사용자 승인으로 상한을 올린 경우 DIR/CAP-AMENDMENT.json에 기록하고 그 값을 쓴다.
  const capAmendmentPath = `${DIR}/CAP-AMENDMENT.json`;
  const MODEL = model, MAX_OUTPUT = 8000, MAX_REQUESTS = 120, CAP_USD = existsSync(capAmendmentPath) ? read(capAmendmentPath).estimatedUsdCap : 2.5;
  const prices = { input: 2, cached: 0.2, output: 12 };
  const distDir = 'packages/pipeline/dist/problem-solving';
  const filePaths = [v5Path, v4Path, ...readdirSync(distDir).filter(p => /^feedback(-evaluator)?\.js$/u.test(p)).sort().map(p => `${distDir}/${p}`),
    'scripts/lib/v5-marker-judgment.mjs', 'scripts/lib/v5-substitution-check.mjs', 'scripts/lib/marker-gloss-validation.mjs',
    productPath, basePath, answerPath, responsesPath];
  const frozen = {
    fileHashes: Object.fromEntries(filePaths.map(p => [p, hash(readFileSync(p))])),
    runnerHash: hash(readFileSync(new URL(import.meta.url))),
    blocks: Object.fromEntries(Object.entries({ CLAIM_BLOCK, QUOTE_BLOCK, SUBST_BLOCK }).map(([k, v]) => [k, hash(v)])),
    sourceHash: jsonHash(source), sourceBindingSha256: sourceBindingSha256(source), responsesHash: jsonHash(responses),
    promptsHash: jsonHash(prompts), casesHash: jsonHash(cases), selectionSchemaHash: jsonHash(schema),
    responses, choiceId, schedule, model: MODEL, reasoningEffort: 'medium', maxOutputTokens: MAX_OUTPUT,
    maxRetries: 1, timeoutMs: 90000, maxRequests: MAX_REQUESTS, estimatedUsdCap: CAP_USD, historicalRatesPerMillion: prices,
    design: 'v5 규칙 + SELECTION 학생 주장 분리·인용 형식 + 원문 대입 확인(해석본 없음). CONCLUSION_AUDIT·COACHING 입력은 운영 그대로 유지한다.',
    semanticReview: '의미 판정은 별도 검토하며 자동 비교를 의미 통과로 집계하지 않는다',
  };
  const artifacts = { 'FROZEN.json': frozen, 'prompts.json': prompts, 'source.json': source, 'cases.json': cases };
  // 모든 기존 산출물부터 검사해 동결 불일치 때 부분 갱신하지 않는다.
  for (const [name, value] of Object.entries(artifacts)) {
    const path = `${DIR}/${name}`;
    if (existsSync(path)) assert.equal(readFileSync(path, 'utf8'), serialize(value), `Frozen artifact changed: ${name}`);
    else if (MODE !== 'prepare') throw new Error(`Run prepare first: ${name}`);
  }
  if (MODE === 'prepare') {
    mkdirSync(DIR, { recursive: true });
    for (const [name, value] of Object.entries(artifacts)) if (!existsSync(`${DIR}/${name}`)) save(`${DIR}/${name}`, value);
    console.log(JSON.stringify({ prepared: true, cells: schedule.length, selfTests: 'passed', frozenHash: jsonHash(frozen), externalRequests: 0 }));
  } else {
    return await run();
  }
  async function run() {
    const ledgerPath = `${DIR}/requests.jsonl`;
    const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
    const pending = () => ledger.filter(x => x.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === x.requestId));
    if (pending().length) throw new Error('RUN_LIMIT: START without END; resolve incomplete ledger before resume');
    const record = x => { appendFileSync(ledgerPath, JSON.stringify(x) + '\n'); ledger.push(x); };
    const account = () => ({ requests: ledger.filter(x => x.event === 'START').length,
      estimatedUsd: ledger.filter(x => x.event === 'END').reduce((sum, e) => sum + (e.estimatedUsd ?? 0), 0),
      unknownReservedUsd: ledger.filter(x => x.event === 'START').reduce((sum, s) => {
        const end = ledger.find(e => e.event === 'END' && e.requestId === s.requestId);
        return sum + (end?.estimatedUsd === undefined ? s.reservedUsd : 0);
      }, 0) });
    const cost = u => ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * prices.input
      + (u.input_tokens_details?.cached_tokens ?? 0) * prices.cached + u.output_tokens * prices.output) / 1e6;
    let client, stop = null;
    const beforeRequests = account().requests;
    for (const cell of schedule) {
      const label = labelFor(cell), path = `${DIR}/${label}.json`;
      if (existsSync(path)) continue;
      const session = sessionFor(cell), rawOutputs = [], claimAttempts = [];
      const limit = message => { stop = `RUN_LIMIT: ${message}`; throw new Error(stop); };
      const evaluator = new OpenAIFeedbackEvaluator({ model: MODEL, maxOutputTokens: MAX_OUTPUT, maxRetries: 1, timeoutMs: 90000,
        transport: { async create(request, options) {
          if (stop) throw new Error(stop);
          let outgoing;
          try { outgoing = transformRequest(request, optionsFor(cell)); }
          catch (e) { if (e.message.startsWith('RUN_LIMIT:')) stop = e.message; throw e; }
          const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
          const reservedUsd = (Buffer.byteLength(JSON.stringify(outgoing)) * prices.input + MAX_OUTPUT * prices.output) / 1e6;
          const a = account();
          if (a.requests >= MAX_REQUESTS || a.estimatedUsd + a.unknownReservedUsd + reservedUsd > CAP_USD) limit('request/cost limit');
          const requestId = `${label}-${a.requests + 1}`, started = Date.now();
          record({ event: 'START', requestId, label, arm: cell.arm, kind, reservedUsd,
            requestHash: jsonHash(outgoing), instructionsHash: hash(outgoing.instructions) });
          let response;
          try {
            if (transport) response = await transport.create(outgoing, options);
            else {
              client ??= new OpenAI({ maxRetries: 0 });
              response = await client.responses.create(outgoing, options);
            }
          } catch (error) {
            record({ event: 'TRANSPORT_ERROR', requestId, label, arm: cell.arm, kind, error: String(error) });
            throw error;
          }
          record({ event: 'END', requestId, label, arm: cell.arm, kind, durationMs: Date.now() - started,
            usage: response.usage ?? null, ...(response.usage ? { estimatedUsd: cost(response.usage) } : {}),
            outputText: response.output_text, status: response.status, model: response.model, responseId: response.id });
          rawOutputs.push({ requestId, kind, response: structuredClone(response) });
          if (kind === 'ASSESSMENT') {
            const attempt = { requestId, studentClaims: null, status: 'VALID', error: null };
            claimAttempts.push(attempt);
            try {
              const parsed = JSON.parse(response.output_text);
              attempt.studentClaims = parsed.studentClaims ?? null;
              const observations = session.observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) }));
              if (cell.arm === 'methods_subst') validateSubstitutionClaims(parsed, observations, source);
              else validateClaims(parsed, observations);
              const { studentClaims: _claims, ...assessment } = parsed;
              return { ...response, output_text: JSON.stringify(assessment) };
            } catch (error) {
              attempt.status = 'ERROR';
              attempt.error = error.message.startsWith('CLAIMS_CONTRACT:') ? error.message : `CLAIMS_CONTRACT: ${error.message}`;
              throw new Error(attempt.error);
            }
          }
          return response;
        } } });
      let call = null, after = session, status = 'VALID', error = null;
      try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
      catch (e) { call = e.call ?? null; status = stop ? 'BUDGET_STOP' : 'EVALUATION_ERROR'; error = String(e); }
      const attempts = (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error }));
      const expected = cases.find(c => c.type === cell.type).expected;
      const actual = { reconstructability: call?.rawOutput?.reconstructability ?? null,
        rationaleImpliedVerdict: call?.rawOutput?.rationaleImpliedVerdict ?? null, contentAssessment: call?.rawOutput?.contentAssessment ?? null,
        phase: after.phase, outcome: after.result?.outcome ?? null };
      const checks = expectedChecks(actual, expected, status);
      const result = { arm: cell.arm, type: cell.type, replicate: cell.r, status, error, rawOutputs, call,
        studentClaims: claimAttempts.at(-1)?.studentClaims ?? null, claimAttempts,
        firstSubstitutionContractViolation: claimAttempts[0]?.error?.startsWith('CLAIMS_CONTRACT: SUBSTITUTION_') ? claimAttempts[0].error : null,
        substitutionResults: substitutionDistribution(claimAttempts.at(-1)?.studentClaims),
        claimContractFailures: claimAttempts.filter(x => x.status === 'ERROR').length,
        claimContractRetries: claimAttempts.filter((x, i) => i > 0 && claimAttempts[i - 1].status === 'ERROR').length,
        attempts, conclusionAuditExecuted: rawOutputs.some(x => x.kind === 'CONCLUSION_AUDIT'),
        after: { phase: after.phase, result: after.result, errors: after.errors.map(({ kind, description, studentEvidence, question }) => ({ kind, description, studentEvidence, question })),
          selectionComparison: after.selectionComparisons.at(-1) ?? null },
        actual, checks, expectedMatch: Object.values(checks).every(Boolean),
        boundary: cases.find(c => c.type === cell.type).boundary };
      save(path, result);
      console.log(JSON.stringify({ label, status, expectedMatch: result.expectedMatch }));
      if (stop) break;
    }
    const rows = schedule.map(c => `${DIR}/${labelFor(c)}.json`).filter(existsSync).map(read);
    const summary = { ...account(), newRequests: account().requests - beforeRequests, stop,
      completedCells: rows.length, plannedCells: schedule.length,
      ...summarizeRows(rows, cases, source),
      claimContractFailures: rows.reduce((n, r) => n + r.claimContractFailures, 0),
      claimContractRetries: rows.reduce((n, r) => n + r.claimContractRetries, 0),
      conclusionAuditRequests: ledger.filter(x => x.event === 'START' && x.kind === 'CONCLUSION_AUDIT').length,
      evaluationErrors: rows.filter(x => x.status === 'EVALUATION_ERROR').length,
      semanticReview: frozen.semanticReview };
    writeFileSync(`${DIR}/RESULTS.json`, serialize(summary));
    console.log(JSON.stringify(summary));
    return summary;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main({ mode: process.argv[2] ?? 'prepare', model: process.argv[3] });
}
