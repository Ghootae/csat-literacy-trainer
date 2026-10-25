import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import OpenAI from 'openai';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand,
  applyFeedbackAssessment, feedbackEvaluationInput, OpenAIFeedbackEvaluator, FeedbackEvaluationError,
} from '../packages/pipeline/dist/index.js';

// Paired source-marker A/B: same approved candidate instructions, model, runtime, and responses.
const OUT = resolve('docs/experiments/gongsun-marker-input-ab-2026-10-02');
const MODE = process.argv[2] ?? 'prepare';
if (!['prepare', 'initial', 'cycles', 'report'].includes(MODE)) throw new Error('Unknown mode');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = x => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
const candidatePath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md';
const baselinePath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md';
const candidate = readFileSync(candidatePath, 'utf8');
const baseline = readFileSync(baselinePath, 'utf8');
const previousDir = 'docs/experiments/problem-v3-based-v4-smoke-2026-10-02';
const previousCases = read(previousDir + '/cases.json');
const gongsun = 'gongsun-long-later-mohists-q12';
const legacy = read(previousDir + '/sources.json')[gongsun];
const publicSource = read('packages/pipeline/fixtures/experiments/problem-solving/public/' + gongsun + '.json');
if (legacy.passage !== publicSource.passage) throw new Error('Passage changed beyond marker scope');
const corrected = { ...legacy, scenario: publicSource.scenario, textAnnotations: publicSource.textAnnotations };
const sources = { baseline: legacy, candidate: corrected };
for (const source of Object.values(sources)) SourceDirectProblemBundleSchema.parse(source);
if (hash(candidate) !== '98d36119a84d612fbb0b1a20553a49df2170633e1a78470f632b0b24ee7ec2b2') throw new Error('Candidate changed');
const cases = previousCases.cases.filter(c => c.questionId === gongsun);
const cycles = previousCases.cycles.filter(c => c.id === 'G-repair');
const schedule = [];
// Arms differ only in source marker inputs, NOT assessment instructions.
for (const f of cases) for (let replicate = 1; replicate <= (f.id === 'G-unknown' ? 1 : 3); replicate++) {
  for (const arm of ['baseline', 'candidate']) schedule.push({ fixture: f, arm, replicate });
}
const MODEL = 'gpt-5.6-terra', MAX_REQUESTS = 24, MAX_OUTPUT = 8000, CAP_USD = 2;
// Budget estimates reuse the documented prior pilot rates, not a newly verified pricing quote.
const prices = { input: 2, cached: 0.2, output: 12 };
const snapshotPaths = [candidatePath, baselinePath,
  'packages/pipeline/src/problem-solving/feedback.ts', 'packages/pipeline/src/problem-solving/feedback-evaluator.ts',
  'packages/pipeline/dist/problem-solving/feedback.js', 'packages/pipeline/dist/problem-solving/feedback-evaluator.js'];
const fileHashes = Object.fromEntries(snapshotPaths.map(p => [p, hash(readFileSync(p))]));
const frozen = { fileHashes, runnerHash: hash(readFileSync(new URL(import.meta.url))),
  casesHash: hash(JSON.stringify({ cases, cycles })), sourcesHash: hash(JSON.stringify(sources)) };
mkdirSync(OUT, { recursive: true });
for (const sub of ['initial', 'cycles']) mkdirSync(join(OUT, sub), { recursive: true });
const frozenPath = join(OUT, 'FROZEN.json');
if (existsSync(frozenPath)) {
  if (JSON.stringify(read(frozenPath).snapshot) !== JSON.stringify(frozen)) throw new Error('Frozen inputs/runtime/runner changed');
} else {
  if (MODE !== 'prepare') throw new Error('Run prepare first');
  save(frozenPath, { at: new Date().toISOString(), snapshot: frozen, model: MODEL, effort: 'medium',
    maxRequests: MAX_REQUESTS, maxOutputTokens: MAX_OUTPUT, estimatedUsdCap: CAP_USD, historicalRatesPerMillion: prices,
    armMeaning: { baseline: 'legacy marker input', candidate: 'corrected marker input' }, expectedLabelAuthority: 'AGENT_EXPECTATIONS_NOT_INDEPENDENT_HUMAN_ACCURACY' });
  save(join(OUT, 'cases.json'), { cases, cycles }); save(join(OUT, 'sources.json'), sources);
}
const ledgerPath = join(OUT, 'requests.jsonl');
const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const record = x => { ledger.push(x); appendFileSync(ledgerPath, JSON.stringify(x) + '\n'); };
function account() {
  let estimatedUsd = 0, unknownReservedUsd = 0;
  const starts = ledger.filter(x => x.event === 'START');
  for (const s of starts) { const end = ledger.find(x => x.event === 'END' && x.requestId === s.requestId);
    if (end?.estimatedUsd !== undefined) estimatedUsd += end.estimatedUsd; else unknownReservedUsd += s.reservedUsd; }
  return { requests: starts.length, estimatedUsd, unknownReservedUsd };
}
const cost = u => ((u.input_tokens - (u.input_tokens_details?.cached_tokens ?? 0)) * prices.input
  + (u.input_tokens_details?.cached_tokens ?? 0) * prices.cached + u.output_tokens * prices.output) / 1e6;
let client, stopped = false;
function evaluator(label, arm) {
  return new OpenAIFeedbackEvaluator({ model: MODEL, maxOutputTokens: MAX_OUTPUT, maxRetries: 1, timeoutMs: 60000,
    transport: { async create(request, options) {
      const assessment = request.text.format.name === 'problem_feedback_v4_assessment';
      if (assessment && request.instructions !== baseline) throw new Error('RUN_LIMIT: unexpected baseline instructions');
      const outgoing = { ...request, instructions: assessment ? candidate : request.instructions, service_tier: 'default' };
      const bytes = Buffer.byteLength(JSON.stringify(outgoing));
      const reservedUsd = (bytes * prices.input + MAX_OUTPUT * prices.output) / 1e6;
      const a = account();
      if (bytes > 200000 || a.requests >= MAX_REQUESTS || a.estimatedUsd + a.unknownReservedUsd + reservedUsd > CAP_USD) {
        stopped = true; throw new Error('RUN_LIMIT: pilot request/cost/size limit');
      }
      const requestId = `${label}-${a.requests + 1}`, started = Date.now();
      record({ event: 'START', requestId, label, arm, at: new Date().toISOString(), reservedUsd,
        requestHash: hash(JSON.stringify(outgoing)), instructionsHash: hash(outgoing.instructions), kind: request.text.format.name });
      try {
        client ??= new OpenAI({ maxRetries: 0 });
        const response = await client.responses.create(outgoing, options);
        record({ event: 'END', requestId, label, at: new Date().toISOString(), durationMs: Date.now() - started,
          model: response.model, responseId: response.id, status: response.status, usage: response.usage,
          ...(response.usage ? { estimatedUsd: cost(response.usage) } : {}), outputText: response.output_text });
        return response;
      } catch (error) {
        record({ event: 'TRANSPORT_ERROR', requestId, label, at: new Date().toISOString(), error: String(error) }); throw error;
      }
    } } });
}
async function evaluate(session, label, arm = 'candidate') {
  let call = null; const input = feedbackEvaluationInput(session);
  try { call = await evaluator(label, arm).evaluate(session); return { status: 'VALID', input, call, after: applyFeedbackAssessment(session, call.rawOutput) }; }
  catch (error) { if (error instanceof FeedbackEvaluationError) call = error.call;
    return { status: stopped ? 'BUDGET_STOP' : 'EVALUATION_ERROR', input, call, after: session, error: String(error) }; }
}
function checks(f, result) {
  if (result.status !== 'VALID') return { passed: false, failures: [result.status] };
  const a = result.call.rawOutput, s = result.after, e = f.expected, failures = [];
  const values = { gate: a.reconstructability, verdict: a.rationaleImpliedVerdict,
    consistency: s.selectionComparisons.at(-1)?.selectionRationaleConsistency, phase: s.phase, outcome: s.result?.outcome };
  for (const [key, actual] of Object.entries(values)) if (e[key] !== undefined && actual !== e[key]) failures.push({ key, expected: e[key], actual });
  if (!e.content.includes(a.contentAssessment)) failures.push({ key: 'content', expected: e.content, actual: a.contentAssessment });
  if (e.errorKinds && JSON.stringify([...new Set(s.errors.map(x => x.kind))].sort()) !== JSON.stringify([...e.errorKinds].sort())) failures.push({ key: 'errorKinds', actual: s.errors.map(x => x.kind), expected: e.errorKinds });
  return { passed: failures.length === 0, failures };
}
async function initial({ fixture: f, arm, replicate }) {
  const label = `${arm}-${f.id}-r${replicate}`, path = join(OUT, 'initial', label + '.json');
  if (existsSync(path)) return;
  const s = submitFeedbackCommand(createFeedbackSession(label, sources[arm]), { type: 'SELECT', choiceId: f.choiceId, rationale: { mode: 'PROVIDED', text: f.rationale } }, 'o1');
  const result = await evaluate(s, label, arm); const check = checks(f, result);
  save(path, { caseId: f.id, arm, replicate, ...result, checks: check });
  console.log(JSON.stringify({ label, status: result.status, content: result.call?.rawOutput?.contentAssessment, phase: result.after.phase, passed: check.passed, ...account() }));
}
async function cycle(f) {
  const path = join(OUT, 'cycles', f.id + '.json'); if (existsSync(path)) return;
  const origin = read(join(OUT, 'initial', `candidate-${f.initialId}-r1.json`));
  let s = structuredClone(origin.after), status = 'COMPLETED'; const steps = [];
  if (origin.status !== 'VALID' || s.phase !== 'AWAITING_CORRECTION') status = 'INITIAL_PATH_UNAVAILABLE';
  while (status === 'COMPLETED' && s.phase !== 'COMPLETED' && !stopped) {
    if (steps.length >= 6) { status = 'HARNESS_STOP'; break; }
    let command;
    if (s.phase === 'AWAITING_CORRECTION') command = { type: 'CORRECT', errorId: s.activeErrorId, text: f.response };
    else if (s.phase === 'AWAITING_RESELECTION' && f.finalSelection) command = { type: 'SELECT', ...f.finalSelection };
    else { status = 'UNEXPECTED_PHASE'; break; }
    const shownMessage = s.message;
    s = submitFeedbackCommand(s, command, 'o' + (s.observations.length + 1));
    const result = s.phase === 'AWAITING_EVALUATION' ? await evaluate(s, `${f.id}-step${steps.length + 1}`) : { status: 'NO_MODEL', after: s, call: null };
    steps.push({ shownMessage, command, ...result }); s = result.after;
    if (!['VALID', 'NO_MODEL'].includes(result.status)) status = result.status;
  }
  if (stopped && s.phase !== 'COMPLETED') status = 'BUDGET_STOP';
  const failures = Object.entries(f.expected).filter(([k, v]) => s.result?.[k] !== v).map(([key, expected]) => ({ key, expected, actual: s.result?.[key] ?? null }));
  save(path, { cycleId: f.id, status, steps, after: s, checks: { passed: status === 'COMPLETED' && failures.length === 0, failures } });
  console.log(JSON.stringify({ cycle: f.id, status, steps: steps.length, outcome: s.result?.outcome, failures, ...account() }));
}
function report() {
  const rows = sub => readdirSync(join(OUT, sub)).filter(x => x.endsWith('.json')).sort().map(x => read(join(OUT, sub, x)));
  const initial = rows('initial'), follow = rows('cycles');
  const summary = { updatedAt: new Date().toISOString(), ...account(), candidateInitials: initial.filter(x => x.arm === 'candidate').length,
    candidateInitialMatches: initial.filter(x => x.arm === 'candidate' && x.checks.passed).length,
    baselineInitials: initial.filter(x => x.arm === 'baseline').length,
    cycles: follow.length, cycleMatches: follow.filter(x => x.checks.passed).length,
    mismatches: [...initial, ...follow].filter(x => !x.checks.passed).map(x => ({ id: x.caseId ?? x.cycleId, arm: x.arm, failures: x.checks.failures })),
    semanticReview: 'Requires source-based agent review; not independent human accuracy' };
  writeFileSync(join(OUT, 'RESULTS.json'), JSON.stringify(summary, null, 2) + '\n'); console.log(JSON.stringify(summary));
}
if (MODE === 'prepare') {
  for (const f of cases) feedbackEvaluationInput(submitFeedbackCommand(createFeedbackSession(f.id, sources.candidate), { type: 'SELECT', choiceId: f.choiceId, rationale: { mode: 'PROVIDED', text: f.rationale } }, 'o1'));
  console.log(JSON.stringify({ mode: MODE, questions: Object.keys(sources), uniqueCases: cases.length, initialAssessments: schedule.length, cycles: cycles.length, maxRequests: MAX_REQUESTS, estimatedUsdCap: CAP_USD }));
}
if (['initial', 'cycles'].includes(MODE)) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  const queue = MODE === 'initial' ? [...schedule] : [...cycles], run = MODE === 'initial' ? initial : cycle;
  await Promise.all(Array.from({ length: 2 }, async () => { while (queue.length && !stopped) { const item = queue.shift(); if (item) await run(item); } }));
}
report();
