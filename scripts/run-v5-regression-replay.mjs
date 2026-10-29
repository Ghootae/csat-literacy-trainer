// 기준 회귀 폴더의 각 세션을 새 지시문으로 처음부터 다시 진행하며 기준 학생 명령을 같은 순서로 넣는다.
// 화면 단계(phase)가 기준과 갈라지면 그 세션을 멈추고 DIVERGED로 기록한다.
// 근거: docs/handoffs/2026-10-29-v57-regression-replay.md
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ProblemFeedbackController } from '../packages/app/dist/server/problem-feedback.js';
import { OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';

const RATES = { 'gpt-6.1-sol': { input: 2, output: 10 }, 'gpt-6-luna': { input: 0.10, output: 0.50 } }; // USD per 1M tokens
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const put = (p, x) => { writeFileSync(p + '.tmp', JSON.stringify(x, null, 2) + '\n'); renameSync(p + '.tmp', p); };

export const HELP = `사용법:
  node --env-file-if-exists=.env scripts/run-v5-regression-replay.mjs \\
    --base <기준 폴더> --out <새 폴더> --prompt <지시문 경로> --prompt-version <이름> --cap-usd <n> \\
    [--only <id,id>] [--answers <json 경로>]
  node scripts/run-v5-regression-replay.mjs --base <기준 폴더> --dry     (외부 호출 없이 입력만 읽어 세션별 step 수·첫 명령 출력)

기준 세션의 학생 명령을 같은 순서로 새 지시문에 넣는다. 기준 step의 inReplyTo.phase가 현재 화면 phase와 같을 때만 넣고,
다르면 그 세션을 DIVERGED로 멈춘다. CORRECT의 errorId는 현재 화면의 activeErrorId로 바꿔 넣는다.
--answers JSON: { "<id>": [{ "atStep": n, "command": {...} }] }  (n = 그 세션에 이미 넣은 명령 수. 갈라진 지점에서 그 명령을 넣고
  기준 step 위치는 그대로 둔 채 이어 간다.)
<out>에 이미 있는 세션은 --only로 지정하지 않으면 건너뛴다. 비용 누적(<out>/ledger.jsonl 포함)이 --cap-usd를 넘으면 새 요청 전에 멈춘다.
출력: <out>/cases/<id>.json, <out>/cases/<id>.records.jsonl, <out>/requests/, <out>/SUMMARY.json`;

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--dry') o.dry = true;
    else if (a.startsWith('--')) { o[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i]; }
    else throw new Error(`알 수 없는 인자: ${a}`);
  }
  return o;
}

export function loadBase(base) {
  const ids = readFileSync(`${base}/SET.txt`, 'utf8').trim().split(',').map(s => s.trim()).filter(Boolean);
  const sources = read(`${base}/sources.json`);
  return { ids, sources, cases: Object.fromEntries(ids.map(id => [id, read(`${base}/cases/${id}.json`)])) };
}

export function dryReport(base) {
  const { ids, cases } = loadBase(base);
  return ids.map(id => {
    const steps = cases[id].steps;
    return { id, questionId: cases[id].case.questionId, steps: steps.length, firstCommand: steps[0]?.command.type ?? null,
      commands: steps.map(s => s.command.type) };
  });
}

function makeTransport(out, capUsd, send) {
  const ledgerPath = `${out}/ledger.jsonl`;
  const rows = existsSync(ledgerPath) ? readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
  const t = { label: null, stopped: null, usd: rows.reduce((n, r) => n + (r.costUsd ?? 0), 0), requests: rows.length,
    async create(request, options) {
      if (t.stopped) throw new Error(t.stopped);
      if (t.usd >= capUsd) { t.stopped = `RUN_CAP: 누적 $${t.usd.toFixed(4)} >= 상한 $${capUsd}`; throw new Error(t.stopped); }
      const rates = RATES[request.model];
      if (!rates) throw new Error(`알 수 없는 모델 단가: ${request.model}`);
      const id = randomUUID(), p = `${out}/requests/${id}`;
      put(p + '.request.json', { caseId: t.label, at: new Date().toISOString(), request, options });
      let response;
      try { response = await send(request, options); }
      catch (e) { put(p + '.error.json', { name: e.name, message: e.message, status: e.status ?? null, at: new Date().toISOString() }); throw e; }
      put(p + '.response.json', response);
      const u = response.usage;
      const costUsd = Number.isFinite(u?.input_tokens) && Number.isFinite(u?.output_tokens) ? (u.input_tokens * rates.input + u.output_tokens * rates.output) / 1e6 : 0;
      t.usd += costUsd; t.requests++;
      appendFileSync(ledgerPath, JSON.stringify({ at: new Date().toISOString(), caseId: t.label, model: request.model, costUsd, usage: u ?? null }) + '\n');
      return response;
    } };
  return t;
}

// 제품 컨트롤러와 같은 방식(student-sim.mjs probSettle): 판정·끝 설명 생성이 끝날 때까지 기다린다.
async function settle(controller, sessionId) {
  const rt = controller.sessions.get(sessionId);
  for (let i = 0; i < 20 && (rt.evaluation || rt.endGeneration); i++) {
    if (rt.evaluation) await rt.evaluation;
    if (rt.endGeneration) await rt.endGeneration;
  }
  return controller.get(sessionId);
}

const attemptsOf = evals => evals.flatMap(e => e.call?.metadata?.attempts ?? []);
const brief = v => ({ phase: v.phase, message: v.message, activeErrorId: v.activeErrorId ?? null });

async function runSession({ id, baseState, source, out, makeEvaluator, transport, answers }) {
  const recordsPath = `${out}/cases/${id}.records.jsonl`;
  if (existsSync(recordsPath)) rmSync(recordsPath);
  const evals = [];
  const inner = makeEvaluator(transport);
  const evaluator = { async evaluate(session) {
    try { const call = await inner.evaluate(session); evals.push({ status: 'SUCCESS', kind: session.evaluationMode, call }); return call; }
    catch (e) { evals.push({ status: 'ERROR', kind: session.evaluationMode, call: e.call ?? null, error: String(e) }); throw e; }
  } };
  const controller = new ProblemFeedbackController({ loadSource: () => source, save: r => appendFileSync(recordsPath, JSON.stringify(r) + '\n'), evaluator });
  let view = controller.start(baseState.case.questionId);
  const state = { case: baseState.case, status: null, steps: [], divergence: null, error: null };
  const baseSteps = baseState.steps;
  let basePos = 0, submitted = 0;
  const pendingAnswers = [...(answers ?? [])];

  const submit = async (command, meta) => {
    submitted++;
    const transitionId = `${id}-s${submitted}`;
    const inReplyTo = brief(view);
    evals.length = 0;
    const started = performance.now();
    await controller.submit(view.sessionId, { transitionId, expectedRevision: view.revision, command });
    view = await settle(controller, view.sessionId);
    let resumed = false;
    if (view.evaluationStatus === 'RETRYABLE_ERROR' && !transport.stopped) {
      resumed = true;
      state.steps.push(stepRecord(transitionId, command, meta, inReplyTo, view, evals, performance.now() - started));
      submitted++;
      evals.length = 0;
      const t2 = `${id}-s${submitted}`;
      await controller.submit(view.sessionId, { transitionId: t2, expectedRevision: view.revision, command: { type: 'RESUME' } });
      view = await settle(controller, view.sessionId);
      state.steps.push(stepRecord(t2, { type: 'RESUME' }, { source: 'RESUME' }, brief(view), view, evals, performance.now() - started));
    }
    if (!resumed) state.steps.push(stepRecord(transitionId, command, meta, inReplyTo, view, evals, performance.now() - started));
    return view.evaluationStatus === 'RETRYABLE_ERROR';
  };

  while (true) {
    const done = view.phase === 'COMPLETED';
    const base = baseSteps[basePos];
    const matches = base && !done && base.inReplyTo.phase === view.phase;
    let command = null, meta = null;
    if (matches) {
      command = structuredClone(base.command);
      if (command.type === 'CORRECT') command.errorId = view.activeErrorId;
      meta = { source: 'BASE', baseIndex: basePos };
      basePos++;
    } else if (!base && done) break;
    else {
      const k = pendingAnswers.findIndex(a => a.atStep === submitted);
      if (k >= 0) { command = pendingAnswers.splice(k, 1)[0].command; meta = { source: 'ANSWER', baseIndex: basePos }; }
      else {
        state.status = 'DIVERGED';
        state.divergence = { atStep: submitted, current: brief(view), baseIndex: basePos, baseInReplyTo: base?.inReplyTo ?? null,
          reason: done ? '기준 step이 남았는데 세션이 끝났다' : !base ? '기준 step이 끝났는데 세션이 안 끝났다' : 'phase가 다르다' };
        break;
      }
    }
    const failed = await submit(command, meta);
    if (failed) { state.status = 'ERROR'; state.error = transport.stopped ?? '평가 실패(RESUME 후에도)'; break; }
  }
  if (!state.status) state.status = 'COMPLETED';
  state.finalView = view;
  state.result = view.result ?? null;
  state.inspection = (() => { try { return controller.inspect(view.sessionId); } catch { return null; } })();
  return state;
}

function stepRecord(transitionId, command, meta, inReplyTo, view, evals, durationMs) {
  return { transitionId, ...meta, command, inReplyTo, view, durationMs: Math.round(durationMs),
    evaluations: evals.map(e => ({ status: e.status, kind: e.kind, error: e.error ?? null, metadata: e.call?.metadata ?? null, rawOutput: e.call?.rawOutput ?? null })) };
}

const correctionQuestions = steps => steps.filter(s => s.view?.phase === 'AWAITING_CORRECTION').map(s => s.view.message);

export function summarize({ base, out, transport }) {
  const { ids, cases: baseCases } = loadBase(base);
  const sessions = ids.filter(id => existsSync(`${out}/cases/${id}.json`)).map(id => {
    const s = read(`${out}/cases/${id}.json`), b = baseCases[id].steps;
    return { id, status: s.status, outcome: s.result?.outcome ?? null, baseOutcome: b.at(-1)?.view?.result?.outcome ?? null,
      divergence: s.divergence, error: s.error,
      correctionQuestions: { base: correctionQuestions(b), new: correctionQuestions(s.steps) },
      formatRetries: s.steps.reduce((n, st) => n + st.evaluations.reduce((m, e) => m + (e.metadata?.attempts ?? []).filter(a => a.outcome === 'ERROR').length, 0), 0) };
  });
  const counts = Object.fromEntries([...new Set(sessions.map(s => s.status))].map(k => [k, sessions.filter(s => s.status === k).length]));
  const summary = { at: new Date().toISOString(), base, counts, usd: transport?.usd ?? ledgerUsd(out), sessions };
  put(`${out}/SUMMARY.json`, summary);
  return summary;
}
function ledgerUsd(out) {
  const p = `${out}/ledger.jsonl`;
  return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).reduce((n, l) => n + (JSON.parse(l).costUsd ?? 0), 0) : 0;
}

export async function runReplay(opts, deps = {}) {
  const { base, out, promptPath, promptVersion, capUsd } = opts;
  const { ids, sources, cases } = loadBase(base);
  for (const d of [out, `${out}/cases`, `${out}/requests`]) mkdirSync(d, { recursive: true });
  const send = deps.send ?? (async (request, options) => {
    const { default: OpenAI } = await import('openai');
    return (send.client ??= new OpenAI({ maxRetries: 0 })).responses.create(request, options);
  });
  const transport = makeTransport(out, capUsd, send);
  const makeEvaluator = deps.makeEvaluator ?? (t => new OpenAIFeedbackEvaluator({ promptPath, promptVersion, transport: t }));
  const only = opts.only ? opts.only.split(',').filter(Boolean) : null;
  const answers = opts.answers ? read(opts.answers) : {};
  for (const id of only ?? []) if (!ids.includes(id)) throw new Error(`기준 SET에 없는 세션: ${id}`);
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    const p = `${out}/cases/${id}.json`;
    if (!only && existsSync(p)) { console.log(JSON.stringify({ id, skipped: true })); continue; }
    if (transport.stopped) break;
    transport.label = id;
    const state = await runSession({ id, baseState: cases[id], source: sources[cases[id].case.questionId], out, makeEvaluator, transport, answers: answers[id] });
    put(p, state);
    console.log(JSON.stringify({ id, status: state.status, steps: state.steps.length, outcome: state.result?.outcome ?? null, usd: +transport.usd.toFixed(4) }));
  }
  const summary = summarize({ base, out, transport });
  if (transport.stopped) summary.stopped = transport.stopped;
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || process.argv.length <= 2) console.log(HELP);
  else if (o.dry) {
    if (!o.base) throw new Error('--base 필요');
    for (const r of dryReport(o.base)) console.log(JSON.stringify(r));
  } else {
    for (const k of ['base', 'out', 'prompt', 'promptVersion', 'capUsd']) if (!o[k]) throw new Error(`--${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())} 필요`);
    const capUsd = Number(o.capUsd);
    if (!Number.isFinite(capUsd) || capUsd <= 0) throw new Error('--cap-usd는 양수');
    const summary = await runReplay({ base: o.base, out: o.out, promptPath: o.prompt, promptVersion: o.promptVersion, capUsd, only: o.only, answers: o.answers });
    console.log(JSON.stringify({ counts: summary.counts, usd: summary.usd, stopped: summary.stopped ?? null }));
  }
}
