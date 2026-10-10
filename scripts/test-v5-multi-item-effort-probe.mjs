// v5 다문항 시험의 luna 불일치 칸만 reasoning effort를 바꿔 다시 판정한다.
// 입력(cases·sources·prompts)은 본 실행이 고정한 파일을 그대로 읽고 해시로 확인한다. effort 외 조건은 본 실행과 같다.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import OpenAI from 'openai';
import { createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment, feedbackObservationText,
  OpenAIFeedbackEvaluator, FeedbackSelectionAssessmentSchema } from '../packages/pipeline/dist/index.js';
import { z } from 'zod/v4';
import { validateClaims, transformRequest } from './lib/v5-marker-judgment.mjs';
import { checksFor, usageCosts, MODELS, DEFAULT_DIR } from './test-v5-multi-item-models.mjs';
import { BOUNDARY_ARMS, withJudgmentSteps, derivedAssessment } from './lib/v5-boundary-arms.mjs';

const [effort = 'high', model = 'gpt-6-luna', set = 'misses', arm = 'v5_methods'] = process.argv.slice(2);
if (!['low', 'medium', 'high'].includes(effort) || !MODELS[model] || !['misses', 'all-r1', 'boundary'].includes(set) || !Object.hasOwn(BOUNDARY_ARMS, arm)) throw new Error('Usage: <effort> <model> [misses|all-r1|boundary] [arm]');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
// misses: 본 실행(medium)에서 luna가 기대와 어긋난 5칸. all-r1: 30응답 1회씩(본 실행 r1과 같은 라벨).
// boundary: Q-0032 경계 응답 I1·D6 각 3회.
const CELLS = set === 'misses' ? [['I1', 1], ['I1', 2], ['I1', 3], ['D6', 1], ['D6', 2]]
  : set === 'boundary' ? [['I1', 1], ['I1', 2], ['I1', 3], ['D6', 1], ['D6', 2], ['D6', 3]]
  : read(`${DEFAULT_DIR}/cases.json`).map(c => [c.id, 1]);
const USD_CAP = 0.3, MAX_REQUESTS = set === 'all-r1' ? 80 : 20;
const jsonHash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const frozen = read(`${DEFAULT_DIR}/FROZEN.json`);
const cases = read(`${DEFAULT_DIR}/cases.json`), sources = read(`${DEFAULT_DIR}/sources.json`), prompts = read(`${DEFAULT_DIR}/prompts.json`);
if (jsonHash(cases) !== frozen.casesHash || jsonHash(sources) !== frozen.sourcesHash || jsonHash(prompts) !== frozen.promptsHash) {
  throw new Error('Frozen inputs changed');
}
const baseline = readFileSync('packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md', 'utf8');
const schema = z.toJSONSchema(FeedbackSelectionAssessmentSchema);
if (jsonHash(schema) !== frozen.selectionSchemaHash) throw new Error('Selection schema changed');

const instructions = BOUNDARY_ARMS[arm] ? prompts.methods + '\n\n' + BOUNDARY_ARMS[arm] : prompts.methods;
const outDir = arm === 'v5_methods' ? `${DEFAULT_DIR}/effort-probe-${effort}/${model}` : `${DEFAULT_DIR}/arm-${arm}-${effort}/${model}`;
mkdirSync(outDir, { recursive: true });
const ledgerPath = `${outDir}/requests.jsonl`;
const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
if (ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId))) {
  throw new Error('START without END; resolve ledger first');
}
const record = row => { appendFileSync(ledgerPath, JSON.stringify(row) + '\n'); ledger.push(row); };
const spent = () => ledger.filter(e => e.event === 'END').reduce((n, e) => n + (e.costs?.conservativeUsd ?? 0), 0);
let client;
const rates = MODELS[model];

for (const [id, r] of CELLS) {
  const label = `${id}-r${r}`, path = `${outDir}/${label}.json`;
  if (existsSync(path)) continue;
  const fixture = cases.find(c => c.id === id);
  const session = submitFeedbackCommand(createFeedbackSession(label, sources[fixture.questionId]),
    { type: 'SELECT', choiceId: fixture.choiceId, rationale: { mode: 'PROVIDED', text: fixture.rationale } }, 'o1');
  const rawOutputs = [], started = performance.now(); let lastSteps = null;
  const evaluator = new OpenAIFeedbackEvaluator({ model, maxOutputTokens: 8000, maxRetries: 1, timeoutMs: 90000,
    transport: { async create(request, options) {
      const outgoing = transformRequest(request, { arm: 'v5_methods', baseline, instructions, selectionSchema: schema });
      if (arm === 'v5_methods_steps' && outgoing.text.format.schema.properties?.mode?.const === 'SELECTION') {
        outgoing.text.format.schema = withJudgmentSteps(outgoing.text.format.schema);
      }
      outgoing.reasoning = { effort };
      if (process.env.DRY) { console.log(JSON.stringify({ dry: label, kind: request.text.format.name, reasoning: outgoing.reasoning, model: outgoing.model,
        instructionsIsMethods: outgoing.instructions === prompts.methods, arm, instructionsTail: outgoing.instructions.slice(-80), schemaKeys: Object.keys(outgoing.text.format.schema.properties), hasStudentClaims: !!outgoing.text.format.schema.properties?.studentClaims })); process.exit(0); }
      const kind = request.text.format.name.replace('problem_feedback_v4_', '').toUpperCase();
      const requests = ledger.filter(x => x.event === 'START').length;
      if (requests >= MAX_REQUESTS || spent() + (8000 * rates.output + 60000 * rates.input) / 1e6 > USD_CAP) throw new Error('RUN_LIMIT');
      const requestId = `${label}-${requests + 1}`, t0 = performance.now();
      record({ event: 'START', requestId, label, kind, model, effort, requestedAtUtc: new Date().toISOString() });
      let response;
      try { response = await (client ??= new OpenAI({ maxRetries: 0 })).responses.create(outgoing, options); }
      catch (error) {
        record({ event: 'END', requestId, label, kind, error: String(error), httpStatus: error.status ?? null, durationMs: performance.now() - t0, costs: null });
        throw error;
      }
      record({ event: 'END', requestId, label, kind, durationMs: performance.now() - t0, costs: usageCosts(response.usage, model),
        responseId: response.id, model: response.model, status: response.status, usage: response.usage ?? null });
      rawOutputs.push({ requestId, kind, response: structuredClone(response) });
      if (kind !== 'ASSESSMENT') return response;
      const parsed = JSON.parse(response.output_text);
      lastSteps = parsed.judgmentSteps ? { steps: parsed.judgmentSteps, reported: parsed.contentAssessment,
        derived: derivedAssessment(parsed.judgmentSteps, parsed.reconstructability) } : null;
      validateClaims(parsed, session.observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) })));
      const { studentClaims: _claims, judgmentSteps: _steps, ...assessment } = parsed;
      const v = FeedbackSelectionAssessmentSchema.safeParse(assessment);
      if (!v.success) throw new Error(`OPERATING_SCHEMA: ${v.error.message}`);
      return { ...response, output_text: JSON.stringify(assessment) };
    } } });
  let after = session, status = 'VALID', error = null, call = null;
  try { call = await evaluator.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
  catch (e) { status = 'EVALUATION_ERROR'; error = String(e); if (/RUN_LIMIT/u.test(error)) { console.log('stop', error); break; } }
  const checks = status === 'VALID' ? checksFor(fixture, after, call.rawOutput) : { passed: false, failures: [{ name: status, actual: error }] };
  writeFileSync(path, JSON.stringify({ model, effort, arm, judgmentSteps: lastSteps, id, replicate: r, status, error, durationMs: performance.now() - started,
    rawOutputs, attempts: (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error })),
    after: { phase: after.phase, result: after.result, errors: after.errors.map(({ kind, description, question }) => ({ kind, description, question })) },
    checks, expectedMatch: checks.passed }, null, 2) + '\n', { flag: 'wx' });
  console.log(label, status, checks.passed ? 'MATCH' : JSON.stringify(checks.failures.map(f => `${f.name}:${f.actual}`)));
}
console.log(JSON.stringify({ requests: ledger.filter(x => x.event === 'START').length, usd: spent() }));
