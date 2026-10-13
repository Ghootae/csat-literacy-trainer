import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { SourceDirectProblemBundleSchema, createProblemSolvingSession, submitInitialProblemResponse,
  applyCorrectRationaleAssessment, createSourceDirectProblemEvaluatorInput,
  OpenAISourceDirectProblemEvaluator, createSourceDirectProblemRequestContent,
  SourceDirectRationaleOutputSchema, SourceDirectDiagnosticOutputSchema,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION } from '../packages/pipeline/dist/index.js';

const dir = 'docs/experiments/gongsun-v3-reversed-response-2026-10-02';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = x => createHash('sha256').update(x).digest('hex');
const save = (p, x) => writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx' });
const source = SourceDirectProblemBundleSchema.parse(read('docs/experiments/gongsun-marker-input-ab-2026-10-02/sources.json').candidate);
const fixture = read('docs/experiments/gongsun-marker-input-ab-2026-10-02/cases.json').cases.find(x => x.id === 'G-error');
const promptPath = 'packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md';
const prompt = readFileSync(promptPath, 'utf8');
if (sha(prompt) !== '3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff') throw new Error('Original v3 prompt changed');
const inputFor = session => createSourceDirectProblemEvaluatorInput({
  evaluationMode: session.phase === 'AWAITING_CORRECT_RATIONALE_ASSESSMENT' ? 'ASSESS_SELECTION_RATIONALE' : 'DIAGNOSE_PATH',
  session, source, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION });
const fresh = replicate => submitInitialProblemResponse(createProblemSolvingSession({
  sessionId: `gongsun-v3-reversed-r${replicate}`, questionId: source.questionId, answerChoiceId: source.answerChoiceId,
}), { initialChoiceId: fixture.choiceId, rationale: fixture.rationale });
const frozen = { promptPath, promptHash: sha(prompt), sourceHash: sha(JSON.stringify(source)), fixture,
  runnerHash: sha(readFileSync(new URL(import.meta.url))),
  runtimeHash: sha(readFileSync('packages/pipeline/dist/problem-solving/source-direct-evaluator-runtime.js')),
  model: 'gpt-5.6-terra', effort: 'medium', maxRequests: 6, estimatedUsdCap: 1,
  historicalRatesPerMillion: { input: 2, cached: 0.2, output: 12 },
  expected: { assessment: 'CLEAR_ERROR', action: 'ASK_CORRECTIVE',
    semantic: 'd=색을 한정하지 않은 일반적인 옷, e=빨간 옷. 학생의 역전 설명을 보존하여 오류로 지적. d도 빨간 옷이라고 설명하거나 4번이 적절하다고 바꾸지 않음.' },
  expectedAuthority: 'AGENT_EXPECTATION_NOT_INDEPENDENT_HUMAN_ACCURACY' };
mkdirSync(dir, { recursive: true });
if (existsSync(`${dir}/FROZEN.json`)) {
  if (JSON.stringify(read(`${dir}/FROZEN.json`)) !== JSON.stringify(frozen)) throw new Error('Frozen test changed');
} else {
  if (process.argv[2] !== 'prepare') throw new Error('Prepare first');
  save(`${dir}/FROZEN.json`, frozen); save(`${dir}/source.json`, source);
  save(`${dir}/input-example.json`, inputFor(fresh(1)));
}
if (process.argv[2] === 'prepare') { console.log('Prepared: original v3, 3 repetitions, at most 6 requests, $1 estimated cap'); process.exit(0); }
if (process.argv[2] !== 'run') throw new Error('Use prepare or run');
const ledgerPath = `${dir}/requests.jsonl`;
const ledger = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const log = x => { ledger.push(x); appendFileSync(ledgerPath, JSON.stringify(x) + '\n'); };
const account = () => { const starts = ledger.filter(x => x.event === 'START'); return { requests: starts.length,
  estimatedUsd: ledger.filter(x => x.event === 'END').reduce((s,x) => s + x.estimatedUsd, 0),
  reservedUsd: starts.filter(s => !ledger.some(x => x.event === 'END' && x.id === s.id)).reduce((s,x) => s+x.reservedUsd,0) }; };
let label, client;
const evaluator = new OpenAISourceDirectProblemEvaluator({ model: frozen.model, effort: 'medium',
  maxRetries: 0, maxOutputTokens: 8000, timeoutMs: 60000, promptVersion: SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  transport: { async parse(o) {
    if (o.instructions !== prompt.trim()) throw new Error('Unexpected instructions');
    const schema = o.input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' ? SourceDirectRationaleOutputSchema : SourceDirectDiagnosticOutputSchema;
    const request = { model: o.model, instructions: o.instructions,
      input: [{ role: 'user', content: createSourceDirectProblemRequestContent(o.input) }],
      reasoning: { effort: o.effort }, max_output_tokens: o.maxOutputTokens, store: false, service_tier: 'default',
      text: { format: { type: 'json_schema', name: 'source_direct_problem_evaluator_output', strict: true, schema: z.toJSONSchema(schema) } } };
    const bytes = Buffer.byteLength(JSON.stringify(request)), reservedUsd = (bytes * 2 + 8000 * 12) / 1e6;
    const a = account();
    if (bytes > 200000 || a.requests >= 6 || a.estimatedUsd + a.reservedUsd + reservedUsd > 1) throw new Error('Budget limit');
    const id = a.requests + 1;
    log({ event: 'START', id, label, at: new Date().toISOString(), reservedUsd, requestHash: sha(JSON.stringify(request)), instructionHash: sha(o.instructions), input: o.input });
    try {
      client ??= new OpenAI({ maxRetries: 0 });
      const response = await client.responses.create(request, { timeout: o.timeoutMs, maxRetries: 0 });
      const u = response.usage, cached = u?.input_tokens_details?.cached_tokens ?? 0;
      const estimatedUsd = u ? ((u.input_tokens-cached)*2+cached*0.2+u.output_tokens*12)/1e6 : reservedUsd;
      log({ event: 'END', id, label, at: new Date().toISOString(), model: response.model, usage: u,
        estimatedUsd, estimatedAtReservation: !u, outputText: response.output_text });
      let outputParsed = response.output_text;
      try { outputParsed = JSON.parse(response.output_text); } catch {}
      return { outputParsed, ...(u ? { usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: cached } } : {}) };
    } catch (e) { log({ event: 'ERROR', id, label, error: String(e) }); throw e; }
  } } });
for (let r = 1; r <= 3; r++) {
  const path = `${dir}/r${r}.json`; if (existsSync(path)) continue;
  const steps = []; let session = fresh(r);
  for (const stage of ['assessment', 'question']) {
    label = `r${r}-${stage}`;
    try {
      const input = inputFor(session), call = await evaluator.evaluate(input);
      steps.push({ stage, input, call });
      console.log(JSON.stringify({ label, result: call.result, account: account() }));
      if (stage === 'assessment' && call.result.assessment === 'CLEAR_ERROR') session = applyCorrectRationaleAssessment(session, 'CLEAR_ERROR');
      else break;
    } catch (e) { steps.push({ stage, error: String(e) }); console.log(JSON.stringify({label,error:String(e)})); break; }
  }
  save(path, { replicate: r, steps });
}
save(`${dir}/RESULTS.json`, { ...account(), repetitions: [1,2,3].map(r => {
  const result = read(`${dir}/r${r}.json`); return { replicate: r, steps: result.steps.map(s => ({ stage: s.stage,
    assessment: s.call?.result?.assessment, errorStatus: s.call?.result?.errorStatus,
    action: s.call?.result?.nextAction?.type, error: s.error })) }; }), semanticReview: 'Requires reading every reason and diagnostic explanation, not only field matches.' });
console.log(JSON.stringify(account()));
