import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAICentralStoryGateEvaluator, CENTRAL_STORY_GATE_PROMPT_VERSION } from '../packages/pipeline/dist/dialogue-experiment/gate.js';
import { OpenAISelectiveFeedbackEvaluator, SELECTIVE_FEEDBACK_PROMPT_VERSION } from '../packages/pipeline/dist/dialogue-experiment/selective-feedback.js';
import { TwoStageDialogueEvaluator, TWO_STAGE_DIALOGUE_PROMPT_VERSION } from '../packages/pipeline/dist/dialogue-experiment/two-stage-evaluator.js';

const out = 'docs/experiments/dialogue-axis-v3-mrna-2026-09-18';
if (existsSync(`${out}/results.json`)) throw new Error('Existing run preserved; choose a new output path before rerunning.');
mkdirSync(out, { recursive: true });
const source = readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/mrna-vaccine-lipid-nanoparticle-p2.json', 'utf8');
const gold = JSON.parse(source);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const manifest = {
  startedAt: new Date().toISOString(), model: 'gpt-5.6-terra', effort: 'medium',
  runtime: TWO_STAGE_DIALOGUE_PROMPT_VERSION, gate: CENTRAL_STORY_GATE_PROMPT_VERSION,
  feedback: SELECTIVE_FEEDBACK_PROMPT_VERSION, goldHash: hash(source),
  promptHashes: Object.fromEntries(['central-story-gate-prompt-v3.md', 'selective-feedback-prompt-v3.md'].map(file =>
    [file, hash(readFileSync(`packages/pipeline/experiments/dialogue/${file}`))])),
  maxPhysicalCalls: 24, estimatedCostCapUsd: 1,
  costBasis: 'Repository historical estimate only: input $2/M, cached input $0.2/M, output $12/M; not provider invoice.',
};
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
const api = new OpenAI({ maxRetries: 0 });
let calls = 0;
let estimatedCostUsd = 0;
const transport = { responses: { parse: async (request, options) => {
  if (calls >= 24 || estimatedCostUsd + 0.08 > 1) throw new Error('Canary call/cost estimate limit reached');
  const index = ++calls;
  const startedAt = new Date().toISOString();
  appendFileSync(`${out}/requests.jsonl`, JSON.stringify({ index, startedAt, model: request.model,
    instructions: request.instructions, input: JSON.parse(request.input) }) + '\n');
  try {
    const response = await api.responses.parse(request, options);
    const u = response.usage;
    estimatedCostUsd += ((u?.input_tokens ?? 0) - (u?.input_tokens_details?.cached_tokens ?? 0)) * 2 / 1e6 +
      (u?.input_tokens_details?.cached_tokens ?? 0) * 0.2 / 1e6 + (u?.output_tokens ?? 0) * 12 / 1e6;
    appendFileSync(`${out}/responses.jsonl`, JSON.stringify({ index, startedAt, completedAt: new Date().toISOString(),
      responseId: response.id, result: response.output_parsed, usage: u, estimatedCostUsd }) + '\n');
    return response;
  } catch (error) {
    appendFileSync(`${out}/responses.jsonl`, JSON.stringify({ index, error: String(error) }) + '\n');
    throw error;
  }
} } };
const evaluator = new TwoStageDialogueEvaluator({
  gateEvaluator: new OpenAICentralStoryGateEvaluator({ client: transport, model: manifest.model, effort: 'medium', maxTransportRetries: 0, maxContractRetries: 1 }),
  feedbackEvaluator: new OpenAISelectiveFeedbackEvaluator({ client: transport, model: manifest.model, effort: 'medium', maxTransportRetries: 0 }),
});
const initial = 'mRNA 백신작동 방식: mRNA 주입-> 바이러스 단백질 합성-> 면역 유도.  세포 흡수 어려움 -> 지질나노입자 이용';
const mechanism = 'mRNA를 주입해 바이러스 단백질을 합성하고 면역 반응을 유도한다.';
const delivery = 'mRNA는 쉽게 분해되고 세포에 잘 흡수되지 않아 지질 나노 입자로 보호하여 세포 내로 전달한다.';
const cases = [
  { id: 'actual-response-replay', initial, answers: ['mRNA 보호-> 세포내 진입', '단백질 합성-> 감염 위험 회피', '바이러스가 아님 -> 감염 위험 회피'],
    purpose: 'Original student strings with newly generated questions; controlled replay, not evidence of natural question effectiveness.' },
  { id: 'axis-sufficient-without-extra-cause', initial: `${mechanism} 감염 위험은 없다. ${delivery}`, answers: [], expected: ['PASS'],
    purpose: 'All axis meanings present, no non-virus explanation or size/charge causes.' },
  { id: 'missing-risk-then-short-answer', initial: `${mechanism} ${delivery}`, answers: ['감염 위험이 없습니다.'], expected: ['UNCLEAR', 'PASS'],
    purpose: 'Ask only the missing feature; accept a short answer without requesting why or comparison.' },
  { id: 'explicit-extra-cause-then-retraction', initial: `${mechanism} 바이러스 단백질을 합성하기 때문에 백신 접종 자체로 바이러스에 감염될 위험이 없다. ${delivery}`,
    answers: ['단백질 합성 때문에 감염 위험이 없다는 원인 설명은 취소합니다. 백신 접종 자체의 감염 위험은 없다는 뜻입니다.'], expected: ['ERROR', 'PASS'],
    purpose: 'Correct volunteered false cause, then do not require a replacement cause absent from axis.' },
  { id: 'sparse-topic', initial: 'mRNA 백신과 지질 나노 입자에 대한 내용.', answers: [], expected: ['UNCLEAR'],
    purpose: 'Detailed relation may guide question approach but must not expand axis requirements.' },
];
writeFileSync(`${out}/cases.json`, JSON.stringify(cases, null, 2));
const results = [];
for (const c of cases) {
  const history = [];
  let previousSnapshot;
  const turns = [];
  for (let turn = 1; turn <= c.answers.length + 1; turn++) {
    try {
      const result = await evaluator.evaluate({ gold, goldVersion: 'paragraph-diagnostic-gold-v2-reviewed-candidate', goldHash: `sha256:${manifest.goldHash}`,
        initialResponse: c.initial, history, turn, questionsAsked: history.length, maxQuestions: 3,
        ...(previousSnapshot ? { previousSnapshot } : {}) });
      turns.push({ inputHistory: structuredClone(history), ...result });
      appendFileSync(`${out}/turns.jsonl`, JSON.stringify({ caseId: c.id, turn, ...turns.at(-1) }) + '\n');
      console.log(JSON.stringify({ caseId: c.id, turn, status: result.result.status,
        axes: result.result.snapshot.axisStates.map(a => `${a.axisId}:${a.state}`), question: result.result.nextQuestion?.text ?? null }));
      if (result.result.status === 'PASS' || !result.result.nextQuestion || turn > c.answers.length) break;
      history.push({ question: result.result.nextQuestion, answer: c.answers[turn - 1] });
      previousSnapshot = result.result.snapshot;
    } catch (error) {
      turns.push({ error: String(error) });
      console.log(JSON.stringify({ caseId: c.id, error: String(error) }));
      break;
    }
  }
  const observed = turns.map(t => t.result?.status ?? 'CALL_ERROR');
  results.push({ ...c, observed, expectedMatched: c.expected ? JSON.stringify(observed) === JSON.stringify(c.expected) : null, turns });
}
writeFileSync(`${out}/results.json`, JSON.stringify({ manifest, completedAt: new Date().toISOString(), physicalCalls: calls, estimatedCostUsd, results }, null, 2));
console.log(JSON.stringify({ physicalCalls: calls, estimatedCostUsd, results: results.map(r => ({ id: r.id, observed: r.observed, expectedMatched: r.expectedMatched })) }));
