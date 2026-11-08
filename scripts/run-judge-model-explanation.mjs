// 정답 판정 원인 가르기 실험 실행기(모델 x 해설). 첫 판정 + 판정이 이어지면 마지막 설명까지, 칸마다 파일로 남긴다.
// 설계: docs/experiments/judge-model-explanation-2026-11-08/DESIGN-DRAFT.md, 인계: docs/handoffs/2026-11-08-judge-model-explanation-runner.md
// Usage: node --env-file-if-exists=.env scripts/run-judge-model-explanation.mjs [selftest]   (인자 없으면 실제 OpenAI 호출)
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { SourceDirectProblemBundleSchema, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment,
  applyFeedbackEndExplanation, OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';

export const DIR = 'docs/experiments/judge-model-explanation-2026-11-08';
export const PARTICIPANT = 'sessions/diagnostic/d8743308-d746-4588-b403-954f2d7f3773.json';
export const REFERENCE = 'packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json';
export const LAB = `${DIR}/lab-style/output.json`, LAB_SHA = 'bd662569935a62375417851b88d7a189ef763b9ce32aaaea1a31b1b2562dcd4c';
export const PROMPT_PATH = 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md';
export const PRICES = { 'gpt-6.1-sol': { input: 2, output: 10 }, 'gpt-6-luna': { input: 0.1, output: 0.5 } }; // USD per 1M tokens, 캐시 할인 없음
export const USD_CAP = 8, TIMEOUT_MS = 240000, MAX_RETRIES = 1, CONCURRENCY = 4, REPLICATES = [1, 2, 3];
const SOL = 'gpt-6.1-sol', LUNA = 'gpt-6-luna';
export const CONDITIONS = {
  'L-now': { model: LUNA, kind: 'now' }, 'L-lab': { model: LUNA, kind: 'lab' }, 'L-none': { model: LUNA, kind: 'none' },
  'S-now': { model: SOL, kind: 'now' }, 'S-lab': { model: SOL, kind: 'lab' },
};
const ALL = Object.keys(CONDITIONS), NOW_ONLY = ['L-now', 'S-now'];
// text: null이면 참가자 기록의 first.rationale.text. B·C는 사용자 확정 글 그대로.
export const CASES = [
  { id: 'A-cog14', q: 'consciousness-cognition-q14', text: null, conds: ALL },
  { id: 'A-horse6', q: 'horse-race-reporting-q6', text: null, conds: ALL },
  { id: 'A-plas10', q: 'plastic-polymerization-q10', text: null, conds: ALL },
  { id: 'A-aud16', q: 'audio-perceptual-coding-q16', text: null, conds: ALL },
  { id: 'A-cog16', q: 'consciousness-cognition-q16', text: null, conds: ALL },
  { id: 'A-horse5', q: 'horse-race-reporting-q5', text: null, conds: ALL },
  { id: 'A-aud17', q: 'audio-perceptual-coding-q17', text: null, conds: ALL },
  { id: 'B-cog14', q: 'consciousness-cognition-q14', conds: NOW_ONLY,
    text: '(나)의 논지는 주체와 대상 분리가 인지 후에 나타난다는 것. ㉠은 지각 이전에 확정된 주체를 전제하므로 따라서 확장된 인지 이론을 타당하지 않다고 볼 것.' },
  { id: 'B-horse6', q: 'horse-race-reporting-q6', conds: NOW_ONLY,
    text: 'a는 제한이 합리적이란 입장. 2번 선지의 케이스는 역량 있는 정치 신인이 제한 때문에 토론회에 못 나가는 경우로, 규정이 소수 후보에게 차별적으로 작용함을 보여 줌. 그러므로 a의 입장이 약화될 것.' },
  { id: 'B-plas10', q: 'plastic-polymerization-q10', conds: NOW_ONLY,
    text: '(나)는 결정화된 플라스틱 -> 화학적으로 안정적. 그래서 화학 물질이 닿는 부분에는 ㉮보다 ㉯가 더 적합.' },
  { id: 'C1-cog14', q: 'consciousness-cognition-q14', conds: ALL, text: '①이 맞다. (나)의 입장에서는 타당하지 않다고 볼 것.' },
  { id: 'C1-plas10', q: 'plastic-polymerization-q10', conds: ALL, text: '③이 맞다. ㉯로 만든 소재가 더 적합하다.' },
  { id: 'C2-aud16', q: 'audio-perceptual-coding-q16', conds: ALL, text: '임계대역의 폭은 고음에서 저음보다 훨씬 넓다.' },
  { id: 'C2-horse6', q: 'horse-race-reporting-q6', conds: ALL, text: 'ⓐ는 다수 의견이고 ⓑ는 소수 의견이다.' },
];
export const CIRCLED = '①②③④⑤';

const hash = x => createHash('sha256').update(x).digest('hex');
export const costOf = (model, u) => u ? ((u.input_tokens ?? 0) * PRICES[model].input + (u.output_tokens ?? 0) * PRICES[model].output) / 1e6 : 0;
const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

/** 입력 읽기와 assert. 해시·글자 불일치면 던진다(중단 보고 대상). */
export function loadInputs() {
  assert.equal(hash(readFileSync(LAB)), LAB_SHA, 'lab식 해설 파일 해시가 FROZEN.md와 다름');
  const participant = readJson(PARTICIPANT), reference = new Map(readJson(REFERENCE).questions.map(q => [q.questionId, q]));
  const lab = new Map(readJson(LAB).explanations.map(e => [e.questionId, e.text]));
  const cases = CASES.map(c => {
    const item = participant.items[c.q];
    assert.ok(item, `참가자 기록에 ${c.q} 없음`);
    const source = SourceDirectProblemBundleSchema.parse(item.session.source);
    assert.equal(item.first.choiceId, source.answerChoiceId, `${c.id}: 선택이 정답과 다름`);
    const ref = reference.get(c.q);
    assert.ok(ref, `runtime-reference에 ${c.q} 없음`);
    assert.equal(source.officialExplanation, ref.officialExplanation, `${c.id}: 지금 해설이 runtime-reference와 다름`);
    assert.ok(lab.has(c.q), `lab식 해설에 ${c.q} 없음`);
    let text = c.text;
    if (text === null) { assert.equal(item.first.rationale.mode, 'PROVIDED', `${c.id}: 참가자 근거 글 없음`); text = item.first.rationale.text; }
    const position = source.choices.find(x => x.choiceId === source.answerChoiceId).position;
    const explanations = { now: source.officialExplanation, lab: lab.get(c.q), none: `정답은 ${CIRCLED[position - 1]}입니다.` };
    return { ...c, text, choiceId: item.first.choiceId, source, explanations };
  });
  return { cases, participant };
}

/** 반복 단위 순서: r1 전체 -> r2 -> r3. 반복 안에서는 사례 순서(A,B,C) x 조건 순서. */
export function buildSchedule(cases) {
  return REPLICATES.flatMap(r => cases.flatMap(c => ALL.filter(k => c.conds.includes(k)).map(cond => ({ caseDef: c, cond, replicate: r }))));
}
export const cellLabel = ({ caseDef, cond, replicate }) => `${caseDef.id}__${cond}__r${replicate}`;

const sourceFor = (caseDef, cond) => SourceDirectProblemBundleSchema.parse({
  ...caseDef.source, officialExplanation: caseDef.explanations[CONDITIONS[cond].kind] });
export function selectedSession(cell) {
  const { caseDef, cond, replicate } = cell, id = `${caseDef.id}-${cond}-r${replicate}`;
  return submitFeedbackCommand(createFeedbackSession(id, sourceFor(caseDef, cond)),
    { type: 'SELECT', choiceId: caseDef.choiceId, rationale: { mode: 'PROVIDED', text: caseDef.text } }, `${id}-select`);
}

const attemptRows = call => (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error: error ? String(error).slice(0, 300) : null }));

/**
 * 한 칸 실행. send(request, options) -> 응답. 실제 모드는 OpenAI client, 시험은 가짜.
 * state = { spent, outDir }. 장부(requests.jsonl)에 요청마다 한 줄.
 */
export async function runCell(cell, { send, outDir, state, endModelOf = m => m }) {
  const { caseDef, cond, replicate } = cell, label = cellLabel(cell), spec = CONDITIONS[cond];
  const model = spec.model, endModel = endModelOf(model), requests = [];
  const mkTransport = m => ({ async create(request, options) {
    const requestedAtUtc = new Date().toISOString(), started = performance.now(), kind = request.text.format.name;
    try {
      const res = await send(request, options), usd = costOf(m, res.usage); state.spent += usd;
      const row = { label, kind, model: m, requestedAtUtc, durationMs: Math.round(performance.now() - started), usage: res.usage ?? null, usd };
      appendFileSync(`${outDir}/requests.jsonl`, JSON.stringify(row) + '\n'); requests.push({ ...row, output_text: res.output_text });
      return res;
    } catch (error) {
      const row = { label, kind, model: m, requestedAtUtc, durationMs: Math.round(performance.now() - started), error: String(error).slice(0, 300), usd: 0 };
      appendFileSync(`${outDir}/requests.jsonl`, JSON.stringify(row) + '\n'); requests.push(row); throw error;
    }
  } });
  const judge = new OpenAIFeedbackEvaluator({ model, timeoutMs: TIMEOUT_MS, maxRetries: MAX_RETRIES, transport: mkTransport(model) });
  const endJudge = new OpenAIFeedbackEvaluator({ model: endModel, timeoutMs: TIMEOUT_MS, maxRetries: MAX_RETRIES, transport: mkTransport(endModel) });
  const session = selectedSession(cell);
  let call = null, after = session, status = 'VALID', error = null;
  try { call = await judge.evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
  catch (e) { call = e.call ?? null; status = 'EVALUATION_ERROR'; error = String(e).slice(0, 500); }
  const raw = status === 'VALID' ? call.rawOutput : null;
  const phaseAfterSelection = status === 'VALID' ? after.phase : null;
  let endStatus = 'NONE', endError = null, endCall = null, endExplanation = null;
  if (phaseAfterSelection === 'AWAITING_END_START') {
    const ready = submitFeedbackCommand(after, { type: 'END_START', accept: true }, `${caseDef.id}-${cond}-r${replicate}-end`);
    if (ready.phase !== 'AWAITING_EVALUATION' || ready.evaluationMode !== 'END_EXPLANATION') {
      const e = new Error(`STATE_MACHINE_MISMATCH: END_START 뒤 phase=${ready.phase}, mode=${ready.evaluationMode}`); e.fatal = true; throw e;
    }
    try { endCall = await endJudge.evaluate(ready); endExplanation = applyFeedbackEndExplanation(ready, endCall.rawOutput).endExplanation; endStatus = 'OK'; }
    catch (e) { endCall = e.call ?? null; endStatus = 'ERROR'; endError = String(e).slice(0, 500); }
  }
  const result = {
    caseId: caseDef.id, questionId: caseDef.q, condition: cond, model, endModel, replicate, explanationKind: spec.kind,
    explanationText: caseDef.explanations[spec.kind], rationaleText: caseDef.text, choiceId: caseDef.choiceId,
    status, error,
    judge: raw ? { contentAssessment: raw.contentAssessment, insufficiencyKind: raw.insufficiencyKind ?? null, boundary: raw.boundary,
      reason: raw.reason, rationaleImpliedVerdict: raw.rationaleImpliedVerdict } : null,
    errors: (raw?.errors ?? []).map(({ errorId, errorType, description, question }) => ({ errorId, errorType, description, question })),
    phaseAfterSelection, endStatus, endError, endExplanation,
    attempts: attemptRows(call), endAttempts: attemptRows(endCall), rawOutput: raw, endRawOutput: endCall?.rawOutput ?? null, requests,
  };
  writeFileSync(`${outDir}/${label}.json`, JSON.stringify(result, null, 2) + '\n');
  return result;
}

export function readSpent(outDir) {
  const p = `${outDir}/requests.jsonl`;
  return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
}

export function metaFor(cases, participantHash, promptText) {
  return {
    promptPath: PROMPT_PATH, promptHash: hash(promptText), labExplanationHash: LAB_SHA, participantPath: PARTICIPANT, participantHash,
    conditions: CONDITIONS, reasoningEffort: 'medium', scheduleLength: buildSchedule(cases).length, prices: PRICES, usdCap: USD_CAP,
    timeoutMs: TIMEOUT_MS, maxRetries: MAX_RETRIES, concurrency: CONCURRENCY, replicates: REPLICATES,
    cases: cases.map(c => ({ caseId: c.id, questionId: c.q, conditions: c.conds, choiceId: c.choiceId, rationaleText: c.text,
      rationaleSource: CASES.find(x => x.id === c.id).text === null ? 'participant-record' : 'user-confirmed-constant' })),
    notReused: '실제 진단 출력은 나쁜 결과로 고른 사례라 치우쳐 있어 L-now도 새로 3회 돌린다(D-0168 검토, 설계 초안 2.6)',
    referenceValues: 'sessions/diagnostic/events.jsonl 판정 기록',
  };
}

/** 칸 전체 실행: 동시 CONCURRENCY칸, 새 칸 시작 전 상한 확인, 이미 있는 칸은 건너뜀. */
export async function runAll({ cases, send, outDir, capUsd = USD_CAP, concurrency = CONCURRENCY, log = () => {} }) {
  mkdirSync(outDir, { recursive: true });
  const schedule = buildSchedule(cases), state = { spent: readSpent(outDir) };
  let next = 0, stopped = null, ran = 0, fatal = null;
  const worker = async () => {
    while (!stopped && !fatal) {
      const cell = schedule[next++];
      if (!cell) return;
      if (existsSync(`${outDir}/${cellLabel(cell)}.json`)) continue;
      if (state.spent >= capUsd) { stopped = { stop: 'USD_CAP', spent: state.spent }; return; }
      try {
        const r = await runCell(cell, { send, outDir, state }); ran++;
        log({ label: cellLabel(cell), status: r.status, judge: r.judge?.contentAssessment, phase: r.phaseAfterSelection, end: r.endStatus, spent: state.spent.toFixed(4) });
      } catch (e) { if (e.fatal) { fatal = e; return; } throw e; }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (fatal) throw fatal;
  return { ran, total: schedule.length, spent: state.spent, stopped };
}

/** selftest: 조건마다 첫 칸 요청을 붙잡아 모양을 검사한다. 외부 호출 0. */
export async function selftest() {
  const { cases, participant } = loadInputs(), prompt = readFileSync(PROMPT_PATH, 'utf8');
  const schedule = buildSchedule(cases);
  assert.equal(schedule.length, 183);
  assert.equal(schedule.length, cases.reduce((n, c) => n + c.conds.length, 0) * REPLICATES.length);
  for (const id of ['B-cog14', 'B-horse6', 'B-plas10']) assert.deepEqual(cases.find(c => c.id === id).conds, NOW_ONLY);
  assert.equal(cases.find(c => c.id === 'C2-horse6').text, 'ⓐ는 다수 의견이고 ⓑ는 소수 의견이다.');
  assert.ok(cases.filter(c => c.id.startsWith('A-')).every(c => c.text === participant.items[c.q].first.rationale.text));
  let captured = null;
  const capture = { async create(req) { captured = req; throw new Error('RUN_LIMIT: capture'); } };
  const imageChecks = [];
  for (const cond of ALL) {
    for (const caseDef of [cases[0], cases.find(c => c.id === 'A-aud17')]) {
      const cell = { caseDef, cond, replicate: 1 };
      await new OpenAIFeedbackEvaluator({ model: CONDITIONS[cond].model, maxRetries: 0, transport: capture }).evaluate(selectedSession(cell)).catch(() => {});
      assert.equal(captured.instructions, prompt);
      assert.equal(captured.model, CONDITIONS[cond].model);
      assert.equal(captured.reasoning?.effort, 'medium');
      const body = JSON.parse(captured.input[0].content[0].text);
      assert.equal(body.source.officialExplanation, caseDef.explanations[CONDITIONS[cond].kind], `${cond}: 해설이 요청과 다름`);
      assert.ok(JSON.stringify(body.observations).includes(JSON.stringify(caseDef.text).slice(1, -1)), `${cond}: 학생 근거가 요청에 없음`);
      if (caseDef.id === 'A-aud17') { assert.equal(captured.input[0].content.filter(p => p.type === 'input_image').length, 1); imageChecks.push(cond); }
    }
  }
  const meta = metaFor(cases, hash(readFileSync(PARTICIPANT)), prompt);
  return { selftest: 'passed', externalRequests: 0, cells: schedule.length, conditions: ALL.length, cases: cases.length, imageChecked: imageChecks.length,
    promptHash: meta.promptHash, labHash: LAB_SHA, usdCap: USD_CAP };
}

async function main() {
  if (process.argv[2] === 'selftest') { console.log(JSON.stringify(await selftest())); return; }
  const { default: OpenAI } = await import('openai');
  const { cases } = loadInputs(), outDir = `${DIR}/runs`, prompt = readFileSync(PROMPT_PATH, 'utf8');
  mkdirSync(outDir, { recursive: true });
  if (!existsSync(`${outDir}/META.json`)) writeFileSync(`${outDir}/META.json`, JSON.stringify(metaFor(cases, hash(readFileSync(PARTICIPANT)), prompt), null, 2) + '\n');
  const client = new OpenAI({ maxRetries: 0 });
  const res = await runAll({ cases, outDir, send: (request, options) => client.responses.create(request, options), log: x => console.log(JSON.stringify(x)) });
  console.log(JSON.stringify({ done: true, ...res }));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
