import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAICentralStoryGateEvaluator } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { OpenAISelectiveFeedbackEvaluator } from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';
import { TwoStageDialogueEvaluator } from '../packages/pipeline/dist/dialogue-experiment/two-stage-evaluator.js';

const out = 'docs/experiments/dialogue-axis-v31-cross-paragraph-2026-09-18';
if (existsSync(`${out}/manifest.json`)) throw new Error('Existing run is immutable; use a new directory for a new run.');
mkdirSync(out, { recursive: true });
const hash = x => createHash('sha256').update(x).digest('hex');
const suiteText = readFileSync(`${out}/cases.json`, 'utf8');
const suite = JSON.parse(suiteText);
const promptNames = ['central-story-gate-prompt-v3.md', 'selective-feedback-prompt-v3.md', 'central-story-gate-prompt-v3.1.md', 'selective-feedback-prompt-v3.1.md'];
const golds = Object.fromEntries(suite.specs.map(s => {
  const source = readFileSync(`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${s.gold}.json`, 'utf8');
  return [s.gold, { gold: JSON.parse(source), goldHash: `sha256:${hash(source)}` }];
}));
const manifest = {
  startedAt: new Date().toISOString(), model: 'gpt-5.6-terra', effort: 'medium',
  profiles: ['v3', 'v3.1'], caseHash: hash(suiteText), maxPhysicalCalls: 120, estimatedCostCapUsd: 2,
  promptHashes: Object.fromEntries(promptNames.map(f => [f, hash(readFileSync(`packages/pipeline/experiments/dialogue/${f}`))])),
  goldHashes: Object.fromEntries(Object.entries(golds).map(([id, g]) => [id, g.goldHash])),
  costBasis: 'Historical repository estimate input $2/M, cached $0.2/M, output $12/M; not current billing verification.',
};
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
const api = new OpenAI({ maxRetries: 0 });
let calls = 0, estimatedCostUsd = 0, inFlight = 0;
function transport(tag) {
  return { responses: { parse: async (request, options) => {
    if (calls >= manifest.maxPhysicalCalls || estimatedCostUsd + (inFlight + 1) * 0.12 > manifest.estimatedCostCapUsd) {
      throw new Error('Experiment request/estimated budget limit reached');
    }
    const index = ++calls;
    inFlight++;
    const startedAt = new Date().toISOString();
    appendFileSync(`${out}/requests.jsonl`, JSON.stringify({ index, tag, startedAt, model: request.model,
      instructions: request.instructions, input: JSON.parse(request.input), maxOutputTokens: request.max_output_tokens }) + '\n');
    try {
      const response = await api.responses.parse(request, options);
      const u = response.usage;
      const cost = ((u?.input_tokens ?? 0) - (u?.input_tokens_details?.cached_tokens ?? 0)) * 2 / 1e6 +
        (u?.input_tokens_details?.cached_tokens ?? 0) * 0.2 / 1e6 + (u?.output_tokens ?? 0) * 12 / 1e6;
      estimatedCostUsd += cost;
      appendFileSync(`${out}/responses.jsonl`, JSON.stringify({ index, tag, startedAt, completedAt: new Date().toISOString(),
        responseId: response.id, result: response.output_parsed, usage: u, estimatedCostUsd: cost }) + '\n');
      return response;
    } catch (error) {
      appendFileSync(`${out}/responses.jsonl`, JSON.stringify({ index, tag, error: String(error) }) + '\n');
      throw error;
    } finally { inFlight--; }
  } } };
}
function evaluator(profile, tag) {
  const client = transport(tag);
  return new TwoStageDialogueEvaluator({
    gateEvaluator: new OpenAICentralStoryGateEvaluator({ client, promptRevision: profile, model: manifest.model, effort: 'medium', maxTransportRetries: 0, maxContractRetries: 1 }),
    feedbackEvaluator: new OpenAISelectiveFeedbackEvaluator({ client, promptRevision: profile, model: manifest.model, effort: 'medium', maxTransportRetries: 0 }),
  });
}
function input(c) {
  return { ...golds[c.gold], goldVersion: 'paragraph-diagnostic-gold-v2-reviewed-candidate', initialResponse: c.initial,
    history: structuredClone(c.history), turn: c.history.length + 1, questionsAsked: c.history.length, maxQuestions: 3 };
}
const tasks = suite.cases.flatMap((c, i) => (i % 2 ? ['v3.1', 'v3'] : ['v3', 'v3.1']).map(profile => ({ c, profile })));
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const { c, profile } = tasks[cursor++];
    const tag = { caseId: c.id, profile, kind: 'fixed-input' };
    let row;
    try {
      const evaluated = await evaluator(profile, tag).evaluate(input(c));
      row = { ...tag, group: c.group, condition: c.kind, expected: c.expected, observed: evaluated.result.status,
        expectedMatched: evaluated.result.status === c.expected, ...evaluated };
    } catch (error) {
      row = { ...tag, group: c.group, condition: c.kind, expected: c.expected, observed: 'CALL_ERROR', expectedMatched: false, error: String(error) };
    }
    results.push(row);
    appendFileSync(`${out}/results.jsonl`, JSON.stringify(row) + '\n');
    console.log(JSON.stringify({ done: results.length, total: tasks.length, caseId: c.id, profile, observed: row.observed,
      expected: c.expected, q: row.result?.nextQuestion?.text ?? null, error: row.error }));
  }
}
await Promise.all([worker(), worker()]);

// Actual generated-question follow-up samples, distinct from fixed histories.
const chains = [];
for (const id of ['mrna-vaccine-lipid-nanoparticle-p2', 'corporate-law-p2', 'dopamine-motor-control-p1']) {
  const spec = suite.specs.find(s => s.gold === id);
  const c = suite.cases.find(c => c.id === `${id}--missing`);
  for (const profile of manifest.profiles) {
    const first = results.find(r => r.caseId === c.id && r.profile === profile);
    if (!first.result?.nextQuestion || first.result.status === 'PASS') {
      chains.push({ gold: id, profile, skipped: 'initial passed or no question', firstStatus: first.observed });
      continue;
    }
    const tag = { caseId: `${id}--actual-question-followup`, profile, kind: 'connected-followup' };
    const follow = { ...input(c), history: [{ question: first.result.nextQuestion, answer: spec.answer }],
      previousSnapshot: first.result.snapshot, turn: 2, questionsAsked: 1 };
    try {
      const evaluated = await evaluator(profile, tag).evaluate(follow);
      chains.push({ ...tag, gold: id, question: first.result.nextQuestion, answer: spec.answer, expected: 'PASS',
        expectedMatched: evaluated.result.status === 'PASS', ...evaluated });
    } catch (error) { chains.push({ ...tag, gold: id, error: String(error), expectedMatched: false }); }
    console.log(JSON.stringify({ chain: id, profile, status: chains.at(-1).result?.status ?? 'CALL_ERROR' }));
  }
}
const final = { manifest, completedAt: new Date().toISOString(), physicalCalls: calls, estimatedCostUsd, results, chains };
writeFileSync(`${out}/results.json`, JSON.stringify(final, null, 2));
console.log(JSON.stringify({ complete: true, physicalCalls: calls, estimatedCostUsd,
  profiles: manifest.profiles.map(profile => ({ profile, matched: results.filter(r => r.profile === profile && r.expectedMatched).length,
    total: results.filter(r => r.profile === profile).length })) }));
