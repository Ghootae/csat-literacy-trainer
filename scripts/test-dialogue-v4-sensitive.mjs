import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAICentralStoryGateEvaluator } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { OpenAISelectiveFeedbackEvaluator } from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';
import { TwoStageDialogueEvaluator } from '../packages/pipeline/dist/dialogue-experiment/two-stage-evaluator.js';

const root = 'docs/experiments/dialogue-v4-sensitive-2026-09-19';
const phase = process.argv.find((arg) => arg.startsWith('--phase='))?.slice(8) ?? 'prepare';
if (!['prepare', 'initial', 'optin', 'followup'].includes(phase)) throw new Error('Invalid phase');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const lines = (file) => existsSync(`${root}/${file}`) ? readFileSync(`${root}/${file}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const write = (file, value) => writeFileSync(`${root}/${file}`, JSON.stringify(value, null, 2) + '\n');
const append = (file, value) => appendFileSync(`${root}/${file}`, JSON.stringify(value) + '\n');
const suiteText = readFileSync(`${root}/cases.json`, 'utf8');
const suite = JSON.parse(suiteText);
const prompts = ['central-story-gate-prompt-v4.md', 'selective-feedback-prompt-v4.md'];
const promptHashes = Object.fromEntries(prompts.map((name) => [name, hash(readFileSync(`packages/pipeline/experiments/dialogue/${name}`))]));
const golds = Object.fromEntries(suite.specs.map(({ gold: id }) => {
  const source = readFileSync(`packages/pipeline/fixtures/experiments/dialogue/gold-v2/${id}.json`, 'utf8');
  return [id, { gold: JSON.parse(source), goldHash: `sha256:${hash(source)}` }];
}));
const cases = suite.specs.flatMap((spec) => ['sufficient', 'minor', 'topic', 'error'].map((kind) => ({
  id: `${spec.gold}--${kind}`, gold: spec.gold, title: spec.title, kind, initial: spec[kind], history: [],
  source: 'synthetic-prewritten', expected: { sufficient: 'PASS', minor: 'NO_AUTO', topic: 'SERIOUS', error: 'ERROR' }[kind],
}))).concat(suite.extraCases);
const expectedHashes = {
  caseHash: hash(suiteText), promptHashes,
  goldHashes: Object.fromEntries(Object.entries(golds).map(([id, item]) => [id, item.goldHash])),
};
const manifestPath = `${root}/manifest.json`;
let manifest;
if (!existsSync(manifestPath)) {
  if (phase !== 'prepare') throw new Error('Prepare and review the frozen manifest first.');
  mkdirSync(root, { recursive: true });
  manifest = {
    preparedAt: new Date().toISOString(), model: 'gpt-5.6-terra', effort: 'medium', profile: 'v4', serviceTier: 'default',
    initialCases: cases.length, maxPhysicalCalls: 64, maxEstimatedUsd: 2, maxOptIns: 2, maxFollowUps: 4,
    pricesPerMillion: { input: 2, cachedInput: 0.2, cacheWrite: 2.5, output: 12 },
    pricingSource: 'https://developers.openai.com/api/docs/pricing', pricingCheckedOn: '2026-09-19',
    transportRetries: 0, contractRetries: 1, ...expectedHashes,
  };
  write('manifest.json', manifest); write('golds.json', golds); write('expanded-cases.json', cases);
} else {
  manifest = json(manifestPath);
  for (const [key, value] of Object.entries(expectedHashes)) {
    if (JSON.stringify(manifest[key]) !== JSON.stringify(value)) throw new Error(`Frozen ${key} changed`);
  }
}
if (phase === 'prepare') {
  console.log(JSON.stringify({ prepared: true, cases: cases.length, ...expectedHashes, capUsd: manifest.maxEstimatedUsd }));
  process.exit(0);
}
if (!process.argv.includes('--approved-live')) throw new Error('Live execution requires --approved-live.');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is unavailable');
const api = new OpenAI({ maxRetries: 0 });
const requests = lines('requests.jsonl');
const responses = lines('responses.jsonl');
let physicalCalls = requests.length;
let chargedOrReserved = requests.reduce((sum, request) => sum + (responses.find((r) => r.index === request.index)?.estimatedCostUsd ?? request.reserveUsd), 0);
const observed = lines('results.jsonl');
const matched = (expected, result) => {
  const states = result.snapshot.axisFeedback?.map((axis) => axis.status) ?? [];
  if (expected === 'REVIEW') return null;
  if (expected === 'PASS') return result.status === 'PASS' && result.nextQuestion === null;
  if (expected === 'NO_AUTO') return result.nextQuestion === null && states.every((s) => ['PASS', 'UNCLEAR_OK'].includes(s));
  if (expected === 'SERIOUS') return states.includes('UNCLEAR_SERIOUS') && !states.includes('ERROR') && result.nextQuestion?.type === 'DIAGNOSTIC';
  return result.status === 'ERROR' && states.includes('ERROR') && result.nextQuestion?.type === 'CORRECTIVE';
};

function transport(tag) {
  return { responses: { parse: async (request, options) => {
    const bytes = Buffer.byteLength(JSON.stringify(request));
    if (request.model !== manifest.model || bytes > 100_000) throw new Error('Model/input bound violation');
    // A conservative byte-per-token ceiling plus schema/framing slack. Unknown failures retain this reserve.
    const reserveUsd = ((bytes + 4_000) * 2.5 + request.max_output_tokens * 12) / 1e6;
    if (physicalCalls >= manifest.maxPhysicalCalls || chargedOrReserved + reserveUsd > manifest.maxEstimatedUsd) throw new Error('LOCAL_BUDGET_STOP');
    const index = ++physicalCalls;
    chargedOrReserved += reserveUsd;
    const startedAt = new Date().toISOString();
    append('requests.jsonl', { index, tag, startedAt, reserveUsd, request: { ...request, service_tier: 'default' } });
    try {
      const response = await api.responses.parse({ ...request, service_tier: 'default' }, options);
      const u = response.usage;
      const cached = u?.input_tokens_details?.cached_tokens ?? 0;
      const writes = u?.input_tokens_details?.cache_write_tokens ?? 0;
      const estimatedCostUsd = u ? (Math.max(0, u.input_tokens - cached - writes) * 2 + cached * 0.2 + writes * 2.5 + u.output_tokens * 12) / 1e6 : null;
      if (estimatedCostUsd !== null) chargedOrReserved += estimatedCostUsd - reserveUsd;
      append('responses.jsonl', { index, tag, startedAt, completedAt: new Date().toISOString(), responseId: response.id, serviceTier: response.service_tier, usage: u, estimatedCostUsd, rawResponse: response });
      return response;
    } catch (error) {
      append('responses.jsonl', { index, tag, completedAt: new Date().toISOString(), error: String(error), estimatedCostUsd: null, retainedReserveUsd: reserveUsd });
      throw error;
    }
  } } };
}
function evaluator(tag) {
  const client = transport(tag);
  return new TwoStageDialogueEvaluator({
    gateEvaluator: new OpenAICentralStoryGateEvaluator({ client, promptRevision: 'v4', recordClaimLifecycle: false, model: manifest.model, effort: 'medium', maxTransportRetries: 0, maxContractRetries: 1 }),
    feedbackEvaluator: new OpenAISelectiveFeedbackEvaluator({ client, promptRevision: 'v4', includeSourceGuide: false, model: manifest.model, effort: 'medium', maxTransportRetries: 0 }),
  });
}
function baseInput(c) {
  return { ...golds[c.gold], goldVersion: 'paragraph-diagnostic-gold-v2-reviewed-candidate', initialResponse: c.initial,
    history: c.history, turn: c.history.length + 1, questionsAsked: c.history.length, maxQuestions: 3 };
}
function disclosures(record) {
  return (record.result.snapshot.axisFeedback ?? []).flatMap((a) => a.revealedText === null ? [] : [{ axisId: a.axisId, text: a.revealedText, turn: record.input.turn }]);
}
async function saveRun(meta, input, task) {
  if (observed.some((row) => row.id === meta.id)) return;
  let row;
  try {
    const evaluated = await task();
    row = { ...meta, input, ...evaluated, behavioralMatch: matched(meta.expected, evaluated.result) };
  } catch (error) { row = { ...meta, input, error: String(error), behavioralMatch: false }; }
  observed.push(row); append('results.jsonl', row);
  console.log(JSON.stringify({ id: row.id, kind: row.kind, status: row.result?.status ?? 'CALL_ERROR', axes: row.result?.snapshot.axisFeedback?.map((a) => `${a.axisId}:${a.status}`), question: row.result?.nextQuestion?.text ?? null, match: row.behavioralMatch, physicalCalls, accountedUsd: chargedOrReserved, error: row.error }));
}
if (phase === 'initial') {
  let cursor = 0;
  async function worker() {
    while (cursor < cases.length) {
      const c = cases[cursor++];
      const input = baseInput(c);
      await saveRun({ ...c, phase }, input, () => evaluator({ id: c.id, phase }).evaluate(input));
    }
  }
  await Promise.all([worker(), worker()]);
} else if (phase === 'optin') {
  // Preselected, no searching repeatedly for a favorable result.
  for (const parentId of ['mrna-vaccine-lipid-nanoparticle-p2--minor', 'hegel-aesthetics-absolute-spirit-p1--minor']) {
    const parent = observed.find((row) => row.id === parentId);
    if (!parent?.result || parent.result.nextQuestion !== null || parent.result.status !== 'UNCLEAR') {
      console.log(JSON.stringify({ optInSkipped: parentId, reason: 'not eligible' })); continue;
    }
    const id = `${parentId}--optin`;
    const input = { ...parent.input, previousSnapshot: parent.result.snapshot, revealedAxisContent: disclosures(parent) };
    await saveRun({ id, parentId, phase, gold: parent.gold, kind: 'optin', expected: 'REVIEW' }, input,
      () => evaluator({ id, phase }).requestQuestion(input, parent));
  }
} else {
  const answers = json(`${root}/followups.json`);
  if (answers.length > manifest.maxFollowUps) throw new Error('Followup count exceeds approved test design');
  for (const spec of answers) {
    const parent = observed.find((row) => row.id === spec.parentId);
    if (!parent?.result?.nextQuestion) throw new Error(`No actual generated question: ${spec.parentId}`);
    const history = [...parent.input.history, { question: parent.result.nextQuestion, answer: spec.answer }];
    const input = { ...parent.input, history, turn: history.length + 1, questionsAsked: history.length,
      previousSnapshot: parent.result.snapshot, revealedAxisContent: [...(parent.input.revealedAxisContent ?? []), ...disclosures(parent)] };
    await saveRun({ ...spec, phase, gold: parent.gold, kind: 'connected-followup' }, input,
      () => evaluator({ id: spec.id, phase }).evaluate(input));
  }
}
const finalResponses = lines('responses.jsonl');
write('results.json', {
  manifest, updatedAt: new Date().toISOString(), physicalCalls,
  observedEstimatedCostUsd: finalResponses.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0),
  unknownCostCalls: finalResponses.filter((row) => row.estimatedCostUsd === null).length,
  accountedIncludingReservationsUsd: chargedOrReserved, results: observed,
});
console.log(JSON.stringify({ phaseComplete: phase, physicalCalls, accountedIncludingReservationsUsd: chargedOrReserved }));
