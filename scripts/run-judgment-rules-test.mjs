// v5.9·v5.10 시험 실행기: 묶음(set) 이름으로 칸을 만들어 선택 판정(필요하면 교정 판정 1회)만 실행하고 칸마다 파일로 남긴다.
// 마지막 설명(END_EXPLANATION)은 만들지 않는다. 구조는 scripts/run-judge-model-explanation.mjs를 따른다.
// 인계: docs/handoffs/2026-11-09-v59-v510-test-runners.md
// Usage: node --env-file-if-exists=.env scripts/run-judgment-rules-test.mjs <set> [--cap-usd n] [--dry]
//        node scripts/run-judgment-rules-test.mjs selftest      (외부 호출 0)
// set: v59-t1 | v59-t2 | v510-t | v510-k | v510-r | v510-h
import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment, OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';
import { SET_NAMES, SET_META, CONDITIONS, SOL, LUNA, EST_USD, DESIGN_59, DESIGN_510, K_CASES, V_CASES, H_CASES,
  buildSet, loadWorld, cellLabel, callModels, estimateUsd, sourceFor } from './judgment-rules-test-cases.mjs';

export const PRICES = { [SOL]: { input: 2, output: 10 }, [LUNA]: { input: 0.1, output: 0.5 } }; // USD per 1M tokens, 캐시 할인 없음
export const TIMEOUT_MS = 240000, MAX_RETRIES = 1, CONCURRENCY = 4;
const hash = x => createHash('sha256').update(x).digest('hex');
export const costOf = (model, u) => u ? ((u.input_tokens ?? 0) * PRICES[model].input + (u.output_tokens ?? 0) * PRICES[model].output) / 1e6 : 0;

const attemptRows = call => (call?.metadata.attempts ?? []).map(({ kind, outcome, error }) => ({ kind, outcome, error: error ? String(error).slice(0, 300) : null }));
const errorRows = raw => (raw?.errors ?? []).map(({ errorId, errorType, basis, description, question }) => ({ errorId, errorType, basis, description, question }));
const lastAssessment = call => (call?.metadata.attempts ?? []).filter(a => a.kind === 'ASSESSMENT').at(-1) ?? null;

function selectedSession(cell) {
  const { caseDef, cond, replicate } = cell, id = `${caseDef.id}-${cond}-r${replicate}`;
  return submitFeedbackCommand(createFeedbackSession(id, sourceFor(caseDef, cond)),
    { type: 'SELECT', choiceId: caseDef.choiceId, rationale: { mode: 'PROVIDED', text: caseDef.text } }, `${id}-select`);
}
export { selectedSession };

/**
 * 한 칸 실행. send(request, options) -> 응답. 실제 모드는 OpenAI client, 시험은 가짜.
 * state = { spent }. 장부(requests.jsonl)에 요청마다 한 줄.
 */
export async function runCell(cell, { send, outDir, state }) {
  const { caseDef, cond, replicate } = cell, label = cellLabel(cell), spec = CONDITIONS[cond], requests = [];
  const transport = { async create(request, options) {
    const requestedAtUtc = new Date().toISOString(), started = performance.now(), kind = request.text.format.name;
    try {
      const res = await send(request, options), usd = costOf(request.model, res.usage); state.spent += usd;
      const row = { label, kind, model: request.model, requestedAtUtc, durationMs: Math.round(performance.now() - started), usage: res.usage ?? null, usd };
      appendFileSync(`${outDir}/requests.jsonl`, JSON.stringify(row) + '\n'); requests.push({ ...row, output_text: res.output_text });
      return res;
    } catch (error) {
      const row = { label, kind, model: request.model, requestedAtUtc, durationMs: Math.round(performance.now() - started), error: String(error).slice(0, 300), usd: 0 };
      appendFileSync(`${outDir}/requests.jsonl`, JSON.stringify(row) + '\n'); requests.push(row); throw error;
    }
  } };
  const evaluator = model => new OpenAIFeedbackEvaluator({ ...(model ? { model } : {}), promptPath: spec.promptPath, promptVersion: spec.promptVersion,
    ...(spec.judgmentRules ? { judgmentRules: spec.judgmentRules } : {}), timeoutMs: TIMEOUT_MS, maxRetries: MAX_RETRIES, transport });
  const session = selectedSession(cell);
  let call = null, after = session, status = 'VALID', error = null;
  try { call = await evaluator(spec.model).evaluate(session); after = applyFeedbackAssessment(session, call.rawOutput); }
  catch (e) { call = e.call ?? null; status = 'EVALUATION_ERROR'; error = String(e).slice(0, 500); }
  const raw = status === 'VALID' ? call.rawOutput : null, model = call?.metadata.model ?? spec.model;
  const phaseAfterSelection = status === 'VALID' ? after.phase : null;
  const last = lastAssessment(call), modelRaw = last?.rawOutput ?? null;
  const result = {
    set: cell.setName, caseId: caseDef.id, questionId: caseDef.questionId, condition: cond, model, promptVersion: spec.promptVersion,
    judgmentRules: spec.judgmentRules ?? null, replicate, choiceId: caseDef.choiceId, rationaleText: caseDef.text,
    ...(caseDef.expected !== undefined ? { expected: caseDef.expected } : {}), ...(caseDef.expectedForm !== undefined ? { expectedForm: caseDef.expectedForm } : {}),
    ...(caseDef.observeOnly ? { observeOnly: true } : {}), ...(caseDef.formObserveOnly ? { formObserveOnly: true } : {}),
    ...(caseDef.kind ? { kind: caseDef.kind } : {}), ...(caseDef.lenient !== undefined ? { lenient: caseDef.lenient } : {}),
    ...(caseDef.hint ? { hint: caseDef.hint } : {}), ...(cell.reference ? { reference: true } : {}),
    status, error,
    judge: raw ? { contentAssessment: raw.contentAssessment, insufficiencyKind: raw.insufficiencyKind ?? null, boundary: raw.boundary,
      reason: raw.reason, rationaleImpliedVerdict: raw.rationaleImpliedVerdict } : null,
    modelJudge: modelRaw ? { contentAssessment: modelRaw.contentAssessment ?? null, insufficiencyKind: modelRaw.insufficiencyKind ?? null,
      groundKind: modelRaw.ground?.kind ?? null, locatedSource: modelRaw.ground?.locatedSource ?? null } : null,
    normalizedNotes: last?.normalized ?? [],
    errors: errorRows(raw), phaseAfterSelection, attempts: attemptRows(call), rawOutput: raw, requests,
  };
  if (caseDef.repair && status === 'VALID' && after.phase === 'AWAITING_CORRECTION') {
    const ready = submitFeedbackCommand(after, { type: 'CORRECT', errorId: after.activeErrorId, text: caseDef.repair.answerText }, `${caseDef.id}-${cond}-r${replicate}-correct`);
    if (ready.phase !== 'AWAITING_EVALUATION' || ready.evaluationMode !== 'REPAIR') {
      const e = new Error(`STATE_MACHINE_MISMATCH: CORRECT 뒤 phase=${ready.phase}, mode=${ready.evaluationMode}`); e.fatal = true; throw e;
    }
    const repair = { answerText: caseDef.repair.answerText, status: 'VALID', error: null, judge: null, errors: [], nextQuestion: null, phaseAfter: null, attempts: [], rawOutput: null };
    try {
      const rc = await evaluator(LUNA).evaluate(ready), done = applyFeedbackAssessment(ready, rc.rawOutput);
      Object.assign(repair, { model: rc.metadata.model, judge: rc.rawOutput, errors: done.errors.map(({ errorId, errorType, basis, description, question, status: st }) => ({ errorId, errorType, basis, description, question, status: st })),
        nextQuestion: done.phase === 'AWAITING_CORRECTION' ? done.errors.find(x => x.errorId === done.activeErrorId)?.question ?? null : null,
        phaseAfter: done.phase, attempts: attemptRows(rc), rawOutput: rc.rawOutput });
    } catch (e) { Object.assign(repair, { status: 'EVALUATION_ERROR', error: String(e).slice(0, 500), attempts: attemptRows(e.call ?? null) }); }
    result.repair = repair;
  }
  writeFileSync(`${outDir}/${label}.json`, JSON.stringify(result, null, 2) + '\n');
  return result;
}

export function readSpent(outDir) {
  const p = `${outDir}/requests.jsonl`;
  return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n, x) => n + (x.usd ?? 0), 0) : 0;
}

export function metaFor(set, capUsd) {
  const prompts = Object.fromEntries([...new Set(set.cells.map(c => CONDITIONS[c.cond].ver))].map(v => {
    const spec = Object.values(CONDITIONS).find(c => c.ver === v);
    return [v, { promptPath: spec.promptPath, promptVersion: spec.promptVersion, judgmentRules: spec.judgmentRules, promptHash: hash(readFileSync(spec.promptPath, 'utf8')) }];
  }));
  return { set: set.name, title: set.title, cells: set.cells.length, calls: set.cells.reduce((n, c) => n + callModels(c).length, 0), usdCap: capUsd,
    estimatedUsd: +estimateUsd(set.cells).toFixed(3), prompts, conditions: CONDITIONS, reasoningEffort: 'medium', prices: PRICES, timeoutMs: TIMEOUT_MS,
    maxRetries: MAX_RETRIES, concurrency: CONCURRENCY,
    cases: set.cases.map(c => ({ caseId: c.id, questionId: c.questionId, choiceId: c.choiceId, rationaleText: c.text, expected: c.expected ?? null, runs: c.runs, reuse: c.reuse ?? null })) };
}

/** 칸 전체 실행: 동시 CONCURRENCY칸, 새 칸 시작 전 상한 확인, 이미 있는 칸은 건너뜀. */
export async function runAll({ set, send, outDir, capUsd = set.capUsd, concurrency = CONCURRENCY, log = () => {} }) {
  mkdirSync(outDir, { recursive: true });
  const state = { spent: readSpent(outDir) };
  let next = 0, stopped = null, ran = 0, fatal = null;
  const worker = async () => {
    while (!stopped && !fatal) {
      const cell = set.cells[next++];
      if (!cell) return;
      if (existsSync(`${outDir}/${cellLabel(cell)}.json`)) continue;
      if (state.spent >= capUsd) { stopped = { stop: 'USD_CAP', spent: state.spent }; return; }
      try {
        const r = await runCell(cell, { send, outDir, state }); ran++;
        log({ label: cellLabel(cell), status: r.status, judge: r.judge?.contentAssessment, phase: r.phaseAfterSelection, repair: r.repair?.phaseAfter, spent: state.spent.toFixed(4) });
      } catch (e) { if (e.fatal) { fatal = e; return; } throw e; }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (fatal) throw fatal;
  return { ran, total: set.cells.length, spent: state.spent, stopped };
}

/** --dry: 칸 목록과 칸 수·추정 비용. */
export function dryReport(set, capUsd = set.capUsd) {
  const rows = set.cells.map(c => ({ label: cellLabel(c), condition: c.cond, rationale40: c.caseDef.text.slice(0, 40), models: callModels(c), ...(c.reference ? { reference: true } : {}) }));
  const calls = rows.reduce((n, r) => n + r.models.length, 0), usd = estimateUsd(set.cells);
  return { rows, summary: { set: set.name, cells: rows.length, calls, estimatedUsd: +usd.toFixed(3), usdCap: capUsd, capCoversEstimate: usd <= capUsd,
    perCall: { sol: EST_USD[SOL], luna: EST_USD[LUNA] }, dir: set.dir } };
}

const EXPECTED_CELLS = { 'v59-t1': 36, 'v59-t2': 5, 'v510-t': 42, 'v510-k': 72, 'v510-r': 9, 'v510-h': 27 };
const EXPECTED_CALLS = { 'v59-t2': 6 };

/** selftest: 묶음 칸 수, 조건마다 첫 칸 요청 모양, 상수 글을 설계 초안과 대조. 외부 호출 0. */
export async function selftest() {
  const world = loadWorld(), sets = Object.fromEntries(SET_NAMES.map(n => [n, buildSet(n, world)]));
  for (const n of SET_NAMES) {
    assert.equal(sets[n].cells.length, EXPECTED_CELLS[n], `${n}: 칸 수`);
    assert.equal(new Set(sets[n].cells.map(cellLabel)).size, sets[n].cells.length, `${n}: 라벨 중복`);
    if (EXPECTED_CALLS[n]) assert.equal(sets[n].cells.reduce((m, c) => m + callModels(c).length, 0), EXPECTED_CALLS[n], `${n}: 호출 수`);
  }
  assert.equal(sets['v510-t'].cases.length, 14); assert.equal(sets['v510-k'].cases.length, 18);
  assert.equal(sets['v510-k'].cells.filter(c => c.reference).length, 18); assert.equal(sets['v59-t1'].cells.filter(c => c.reference).length, 9);
  // 상수 글이 설계 초안 파일에 들어 있다.
  const d59 = readFileSync(DESIGN_59, 'utf8'), d510 = readFileSync(DESIGN_510, 'utf8'), quoted = (d, t) => assert.ok(d.includes(`"${t}"`), `설계 초안에 없는 글: ${t}`);
  for (const v of V_CASES) quoted(d59, v.text);
  for (const k of K_CASES) quoted(d510, k.text ?? k.realText);
  for (const h of H_CASES) { quoted(d510, h.text); quoted(d510, h.hint); }
  for (const c of sets['v510-r'].cases) quoted(d510, c.text);
  for (const id of ['A-horse5', 'A-aud17']) quoted(d59, sets['v59-t1'].cases.find(c => c.id === id).text);
  // 선지 번호 대응·형태 값
  assert.deepEqual([...new Set(K_CASES.map(k => k.expectedForm ?? 'null'))].sort(), ['CONCLUSION_RESTATED', 'FACT', 'LOCATION_ONLY', 'null']);
  // v5.10 조건에서만 lenientCorrect: 경마 4·오디오 15
  const withLenient = [];
  for (const s of Object.values(sets)) for (const c of s.cases) for (const r of c.runs) {
    const src = sourceFor(c, r.cond), has = !!src.lenientCorrect;
    if (has) withLenient.push(`${c.questionId}@${r.cond}`);
    if (CONDITIONS[r.cond].ver !== 'v5.10') assert.ok(!has, `${c.id}/${r.cond}: v5.8·v5.9 조건에 lenientCorrect가 붙음`);
  }
  assert.deepEqual([...new Set(withLenient.map(x => x.split('@')[0]))].sort(), ['audio-perceptual-coding-q15', 'horse-race-reporting-q4']);
  assert.ok(withLenient.every(x => x.endsWith('@v5.10-sol')));
  // 조건마다 첫 칸 요청을 붙잡아 모양 검사
  let captured = null;
  const capture = { async create(req) { captured = req; throw new Error('RUN_LIMIT: capture'); } };
  const checked = [];
  const firstCellByCond = new Map();
  for (const s of Object.values(sets)) for (const c of s.cells) if (!firstCellByCond.has(c.cond)) firstCellByCond.set(c.cond, c);
  for (const [cond, cell] of firstCellByCond) {
    const spec = CONDITIONS[cond], session = selectedSession(cell);
    await new OpenAIFeedbackEvaluator({ ...(spec.model ? { model: spec.model } : {}), promptPath: spec.promptPath, promptVersion: spec.promptVersion,
      ...(spec.judgmentRules ? { judgmentRules: spec.judgmentRules } : {}), maxRetries: 0, transport: capture }).evaluate(session).catch(() => {});
    assert.equal(captured.instructions, readFileSync(spec.promptPath, 'utf8'), `${cond}: 지시문이 다름`);
    const expectedModel = spec.model ?? (cell.caseDef.choiceId === cell.caseDef.source.answerChoiceId ? LUNA : SOL);
    assert.equal(captured.model, expectedModel, `${cond}: model`);
    assert.equal(captured.reasoning?.effort, 'medium');
    const bodyText = captured.input[0].content[0].text;
    assert.ok(JSON.stringify(JSON.parse(bodyText).observations).includes(JSON.stringify(cell.caseDef.text).slice(1, -1)), `${cond}: 근거 글이 요청에 없음`);
    assert.ok(!bodyText.includes('lenientCorrect'), `${cond}: lenientCorrect가 요청에 새어 나감`);
    const schema = JSON.stringify(captured.text.format.schema);
    assert.equal(schema.includes('LOCATION_ONLY'), spec.ver === 'v5.10', `${cond}: LOCATION_ONLY 스키마`);
    checked.push(cond);
  }
  assert.deepEqual(checked.sort(), ['v5.10-sol', 'v5.8-sol', 'v5.9-luna', 'v5.9-product', 'v5.9-sol']); // v5.8-luna는 재활용 기준 칸만 쓰므로 새 칸 없음
  // T2 첫 판정 모델 배정: 정답 선택 prob-5 luna, 나머지 sol
  assert.deepEqual(sets['v59-t2'].cells.map(c => callModels(c)[0]), [LUNA, SOL, SOL, SOL, SOL]);
  return { selftest: 'passed', externalRequests: 0, cells: Object.fromEntries(SET_NAMES.map(n => [n, sets[n].cells.length])), conditions: checked, lenientQuestions: [...new Set(withLenient.map(x => x.split('@')[0]))] };
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry') o.dry = true;
    else if (argv[i] === '--cap-usd') o.capUsd = Number(argv[++i]);
    else if (argv[i].startsWith('--')) throw new Error(`알 수 없는 인자: ${argv[i]}`);
    else o._.push(argv[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2)), name = o._[0];
  if (name === 'selftest') { console.log(JSON.stringify(await selftest())); return; }
  if (!SET_NAMES.includes(name)) throw new Error(`사용법: run-judgment-rules-test.mjs <${SET_NAMES.join('|')}|selftest> [--cap-usd n] [--dry]`);
  if (o.capUsd !== undefined && !(Number.isFinite(o.capUsd) && o.capUsd > 0)) throw new Error('--cap-usd는 양수');
  const set = buildSet(name), capUsd = o.capUsd ?? set.capUsd;
  if (o.dry) {
    const { rows, summary } = dryReport(set, capUsd);
    for (const r of rows) console.log(JSON.stringify(r));
    console.log(JSON.stringify(summary)); return;
  }
  const { default: OpenAI } = await import('openai');
  mkdirSync(set.dir, { recursive: true });
  if (!existsSync(`${set.dir}/META.json`)) writeFileSync(`${set.dir}/META.json`, JSON.stringify(metaFor(set, capUsd), null, 2) + '\n');
  const client = new OpenAI({ maxRetries: 0 });
  const res = await runAll({ set, outDir: set.dir, capUsd, send: (request, options) => client.responses.create(request, options), log: x => console.log(JSON.stringify(x)) });
  console.log(JSON.stringify({ done: true, ...res }));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
