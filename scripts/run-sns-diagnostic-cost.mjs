// SNS 진단평가 비용·대기 시간 측정 드라이버 (docs/handoffs/2026-11-07-sns-diagnostic-cost-driver.md).
// 대본의 가상 참가자 H·M·L을 DiagnosticController에 프로세스 안에서 직접 넣는다(HTTP 없음).
// --mode fake(기본): 가짜 평가기·transport, 외부 전송 없음. --mode real: --confirm-send 필수(없으면 아무 호출 없이 종료).
// 실행: node scripts/run-sns-diagnostic-cost.mjs [--mode fake|real] [--confirm-send] [--participants H,M,L] [--out <dir>]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT_PATH = 'docs/experiments/sns-diagnostic-cost-2026-11-07/script/participants.json';
const RATES = { 'gpt-6.1-sol': { input: 2, output: 10 }, 'gpt-6-luna': { input: 0.1, output: 0.5 } }; // USD per 1M tokens, 캐시 할인 없음
const COST_CAP_USD = 3.0; const NEXT_PARTICIPANT_RESERVE_USD = 1.0;
const COMMAND_LIMIT = 8; const RESULT_TIMEOUT_MS = 10 * 60 * 1000;

function parseArgs(argv) {
  const args = { mode: 'fake', confirmSend: false, participants: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--confirm-send') args.confirmSend = true;
    else if (a === '--participants') args.participants = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--out') args.out = argv[++i];
    else throw new Error(`알 수 없는 인자: ${a}`);
  }
  if (args.mode !== 'fake' && args.mode !== 'real') throw new Error('--mode는 fake 또는 real이어야 합니다.');
  return args;
}
const args = parseArgs(process.argv.slice(2));
if (args.mode === 'real' && !args.confirmSend) {
  console.log('--mode real은 외부 API 전송을 한다. --confirm-send 없이는 아무 호출도 하지 않고 종료한다.');
  process.exit(0);
}
const out = resolve(args.out ?? (args.mode === 'fake' ? '.omc/adhoc/sns-diagnostic-cost-fake' : 'docs/experiments/sns-diagnostic-cost-2026-11-07/runs/real'));

const { DiagnosticController } = await import('../packages/app/dist/server/diagnostic/controller.js');
const { FileDiagnosticStore } = await import('../packages/app/dist/server/diagnostic/store.js');
const { loadDiagnosticBundle } = await import('../packages/app/dist/server/diagnostic/content.js');
const fakes = args.mode === 'fake' ? await import('../packages/app/dist/server/diagnostic/test-support.js') : null;

const scriptRaw = readFileSync(SCRIPT_PATH);
const script = JSON.parse(scriptRaw.toString('utf8'));
const scriptSha256 = createHash('sha256').update(scriptRaw).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now();
const pollMs = args.mode === 'fake' ? 50 : 1000;
const median = xs => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const readJsonl = path => existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const round6 = x => Math.round(x * 1e6) / 1e6;

// ---------- 가짜 ----------
function fakeOptions(participant) {
  const choiceCorrect = new Map(Object.entries(participant.items).map(([q, it]) => {
    const source = loadDiagnosticBundle(q).source;
    return [q, source.choices.find(c => c.position === it.choice).choiceId === source.answerChoiceId];
  }));
  const delay = () => new Promise(r => setTimeout(r, 5));
  const fb = fakes.feedbackFake({ behavior: q => choiceCorrect.get(q) ? 'SUPPORTED' : 'ERROR', delay });
  const feedbackEvaluator = { async evaluate(session) {
    const call = await fb.evaluator.evaluate(session);
    const wrong = session.selections.at(-1)?.choiceId !== session.source.answerChoiceId;
    return { ...call, metadata: { ...call.metadata, model: wrong ? 'gpt-6.1-sol' : 'gpt-6-luna', durationMs: 5, inputTokens: 1500, outputTokens: 300 } };
  } };
  const summaryEvaluator = { async complete(input) {
    const call = await fakes.summaryEvaluator.complete(input);
    return { ...call, metadata: { ...call.metadata, model: 'gpt-6-luna', durationMs: 5, inputTokens: 800, outputTokens: 200 } };
  } };
  return { feedbackEvaluator, summaryEvaluator, diagnosisTransport: fakes.diagnosisFake({ delay }).transport, judgeTransport: fakes.judgeFake({ delay }).transport };
}

// ---------- 비용 집계 ----------
function usdOf(model, input, output) {
  const rate = RATES[model];
  if (!rate) throw new Error(`단가표에 없는 모델: ${model}`);
  return (input * rate.input + output * rate.output) / 1e6;
}
/** 호출 한 건의 모델별 토큰. attempts가 있으면 attempts 합, 없으면 상위 metadata. */
function usageOf(meta) {
  if (Array.isArray(meta.attempts) && meta.attempts.length > 0) return meta.attempts.map(a => ({ model: a.model, input: a.inputTokens ?? 0, output: a.outputTokens ?? 0 }));
  return [{ model: meta.model, input: meta.inputTokens ?? 0, output: meta.outputTokens ?? 0 }];
}
function aggregateCost(events, summaryRecords, correctOf) {
  const kinds = {}; const models = {};
  const commandOf = new Map(events.filter(e => e.type === 'FEEDBACK_COMMAND').map(e => [`${e.questionId}|${e.transitionId}`, e.command.type]));
  const add = (kind, meta, failed, durationMs) => {
    const k = kinds[kind] ??= { calls: 0, failures: 0, requests: 0, inputTokens: 0, outputTokens: 0, usd: 0, durations: [] };
    k.calls++; if (failed) k.failures++;
    if (meta) {
      for (const u of usageOf(meta)) {
        const usd = usdOf(u.model, u.input, u.output);
        k.requests++; k.inputTokens += u.input; k.outputTokens += u.output; k.usd += usd;
        const m = models[u.model] ??= { requests: 0, inputTokens: 0, outputTokens: 0, usd: 0 };
        m.requests++; m.inputTokens += u.input; m.outputTokens += u.output; m.usd += usd;
      }
      k.durations.push(meta.durationMs ?? 0);
    }
  };
  for (const e of events) {
    if (e.type === 'JUDGMENT_DONE' || e.type === 'JUDGMENT_FAILED') {
      const call = e.call; const meta = call?.metadata ?? null; const raw = call?.rawOutput;
      let kind;
      if (raw && typeof raw === 'object' && 'answer' in raw && 'firstChoice' in raw) kind = 'end_explanation';
      else if (raw?.mode === 'REPAIR') kind = 'repair';
      else if (raw?.mode === 'SELECTION') kind = correctOf.get(e.questionId) ? 'selection_correct' : 'selection_wrong';
      else {
        const attemptKind = meta?.attempts?.[0]?.kind; const cmd = commandOf.get(`${e.questionId}|${e.transitionId}`);
        kind = attemptKind === 'END_EXPLANATION' || cmd === 'END_START' ? 'end_explanation' : cmd === 'CORRECT' ? 'repair'
          : correctOf.get(e.questionId) ? 'selection_correct' : 'selection_wrong';
      }
      add(kind, meta, e.type === 'JUDGMENT_FAILED');
    } else if (e.type === 'THOUGHT_DIAGNOSIS_DONE' || e.type === 'THOUGHT_DIAGNOSIS_FAILED') add('thought_diagnosis', e.metadata ?? null, e.type.endsWith('FAILED'));
    else if (e.type === 'ANALYSIS_DONE' || e.type === 'ANALYSIS_FAILED') add('paragraph_judgment', e.metadata ?? null, e.type.endsWith('FAILED'));
  }
  for (const r of summaryRecords) {
    if (r.event === 'STEP' && r.step?.call) add('summary_dialogue', r.step.call, false);
    else if (r.event === 'EVALUATION_FAILED') add('summary_dialogue', null, true);
  }
  const byKind = Object.fromEntries(Object.entries(kinds).map(([kind, k]) => [kind, { calls: k.calls, failures: k.failures, requests: k.requests,
    inputTokens: k.inputTokens, outputTokens: k.outputTokens, usd: round6(k.usd), durationMsMedian: median(k.durations), durationMsMax: Math.max(0, ...k.durations) }]));
  const byModel = Object.fromEntries(Object.entries(models).map(([m, v]) => [m, { ...v, usd: round6(v.usd) }]));
  return { totalUsd: round6(Object.values(kinds).reduce((n, k) => n + k.usd, 0)), byKind, byModel };
}

// ---------- 참가자 한 명 ----------
async function runParticipant(participant) {
  const started = now();
  const base = resolve(out, participant.id);
  rmSync(base, { recursive: true, force: true });
  const storeRoot = resolve(base, 'store'); const summaryDir = resolve(base, 'summary-logs');
  const controller = new DiagnosticController({
    store: new FileDiagnosticStore(storeRoot), summaryLogDirectory: summaryDir,
    ...(fakes ? fakeOptions(participant) : {}),
  });
  const { participantId } = controller.create();
  const waits = { summaryCardMs: {}, resultFromLastAnswersDoneMs: null, resultFromLastFeedbackMs: null, feedbackTurnMs: [], summaryTurnMs: [] };
  const stoppedItems = []; const correctOf = new Map();
  let correct = 0; let omitted = 0; let summaryPassages = 0; let lastAnswersDoneAt = 0; let tid = 0;
  const choiceIdOf = (questionId, position) => loadDiagnosticBundle(questionId).source.choices.find(c => c.position === position).choiceId;
  const setPassages = new Map(controller.progress(participantId).set.passages.map(p => [p.passageId, p]));

  for (const passageId of script.passageOrder) {
    const passage = setPassages.get(passageId);
    if (!passage) throw new Error(`대본 지문이 세트에 없다: ${passageId}`);
    for (const q of passage.questionIds) if (!participant.items[q]) throw new Error(`대본에 문항이 없다: ${q}`);
    const summary = participant.summaryPassages.includes(passageId);

    // 시작·요약 대화
    let view = controller.start(participantId, passageId, { summary });
    if (summary) {
      summaryPassages++;
      const texts = participant.summaries[passageId];
      if (!texts || texts.length !== view.paragraphs.length) throw new Error(`대본 요약 문단 수(${texts?.length})가 지문(${passageId}, ${view.paragraphs.length})과 다르다.`);
      for (let i = 0; i < texts.length; i++) {
        const send = async text => {
          const t0 = now();
          view = await controller.summaryRespond(participantId, passageId, { transitionId: `s-${++tid}`, paragraphIndex: i, text });
          waits.summaryTurnMs.push(Math.round(now() - t0));
        };
        await send(texts[i]);
        if (!view.current.done && view.current.canRespond) await send(script.followUps.summarySecondTurn);
        if (i + 1 < texts.length) view = controller.summaryNavigate(participantId, passageId, { paragraphIndex: i + 1 });
      }
      controller.summaryFinish(participantId, passageId);
    }

    // 문항 답: 생각할 시간 없이 바로 제출
    for (const questionId of passage.questionIds) {
      const item = participant.items[questionId];
      const choiceId = choiceIdOf(questionId, item.choice);
      correctOf.set(questionId, choiceId === loadDiagnosticBundle(questionId).source.answerChoiceId);
      controller.submitItem(participantId, questionId, { choiceId, solveMs: 0,
        rationale: item.rationale === null ? { mode: 'OMITTED' } : { mode: 'PROVIDED', text: item.rationale }, rationaleMs: item.rationale === null ? null : 0 });
    }
    const doneAt = now(); lastAnswersDoneAt = doneAt;
    controller.answersDone(participantId, passageId);

    // 대기 (가)
    let card;
    for (;;) {
      card = controller.summaryCard(participantId, passageId);
      if (card.status !== 'pending') break;
      await sleep(pollMs);
    }
    waits.summaryCardMs[passageId] = Math.round(now() - doneAt);
    correct += card.correct; omitted += card.omitted;

    // 문항별 피드백
    for (const questionId of passage.questionIds) await runFeedback(controller, participantId, questionId, stoppedItems, waits, () => `f-${++tid}`, script.followUps);
  }
  const lastFeedbackAt = now();

  // 대기 (나)
  const resultStart = now(); let timedOut = false;
  for (;;) {
    const r = controller.result(participantId);
    const pending = r.position.status === 'pending' || r.steps.status === 'pending'
      || r.items.some(i => !i.review && (i.judgment.status === 'pending' || i.thoughtDiagnosis?.status === 'pending'))
      || r.reading.some(x => x.status === 'pending');
    if (!pending) break;
    if (now() - resultStart > RESULT_TIMEOUT_MS) { timedOut = true; break; }
    await sleep(pollMs);
  }
  const endAt = now();
  waits.resultFromLastAnswersDoneMs = Math.round(endAt - lastAnswersDoneAt);
  waits.resultFromLastFeedbackMs = Math.round(endAt - lastFeedbackAt);

  let idleError = null;
  try { await controller.idle(); } catch (error) { idleError = error instanceof Error ? error.message : String(error); }
  const events = readJsonl(resolve(storeRoot, 'events.jsonl')).filter(e => e.participantId === participantId);
  const summaryRecords = readJsonl(resolve(summaryDir, 'sessions.jsonl'));
  const cost = aggregateCost(events, summaryRecords, correctOf);
  return { id: participant.id, participantId, correct, omitted, summaryPassages, cost, waits, stoppedItems,
    ...(timedOut ? { resultTimedOut: true } : {}), ...(idleError ? { idleError } : {}), elapsedMs: Math.round(now() - started) };
}

async function runFeedback(controller, participantId, questionId, stoppedItems, waits, nextId, followUps) {
  let commands = 0; let corrected = false; let view;
  try { view = controller.feedbackView(participantId, questionId); }
  catch (error) { stoppedItems.push({ questionId, reason: `VIEW_FAILED: ${error.message}`, lastView: null }); return; }
  const stop = reason => stoppedItems.push({ questionId, reason, lastView: { phase: view.phase, evaluationStatus: view.evaluationStatus, activeErrorId: view.activeErrorId,
    postRepairOptions: view.postRepairOptions, skippable: view.skippable, message: view.message } });
  for (let guard = 0; guard < 600; guard++) {
    if (view.phase === 'COMPLETED' || view.phase === 'ITEM_REVIEW') return;
    if (view.phase === 'AWAITING_EVALUATION') {
      if (view.evaluationStatus === 'RETRYABLE_ERROR') return stop('EVALUATION_RETRYABLE_ERROR');
      await sleep(50); view = controller.feedbackView(participantId, questionId); continue;
    }
    let command = null;
    if (view.phase === 'AWAITING_RATIONALE') command = { type: 'RATIONALE', rationale: { mode: 'PROVIDED', text: followUps.omittedRationaleText } };
    else if (view.phase === 'AWAITING_CORRECTION' && view.activeErrorId) {
      command = corrected ? { type: 'SKIP' } : { type: 'CORRECT', errorId: view.activeErrorId, text: followUps.correctionText };
      corrected = true;
    } else if (view.phase === 'AWAITING_POST_REPAIR_CHOICE' && view.postRepairOptions?.length === 2 && view.postRepairOptions.includes('RESELECT') && view.postRepairOptions.includes('REQUEST_EXPLANATION')) command = { type: 'REQUEST_EXPLANATION' };
    else if (view.phase === 'AWAITING_END_START') command = { type: 'END_START', accept: true };
    else if (view.phase === 'AWAITING_UNDERSTANDING') command = { type: 'UNDERSTOOD', answer: true };
    else if (view.phase === 'AWAITING_POST_REPAIR_CHOICE' && view.postRepairOptions?.length === 1 && view.postRepairOptions[0] === 'FINISH') command = { type: 'FINISH' };
    if (!command) return stop('NO_RULE_FOR_STATE');
    if (commands >= COMMAND_LIMIT) return stop('COMMAND_LIMIT');
    commands++;
    const t0 = now();
    try { view = await controller.feedbackSubmit(participantId, questionId, { transitionId: nextId(), expectedRevision: view.revision, command }); }
    catch (error) { return stop(`SUBMIT_FAILED(${command.type}): ${error.message}`); }
    waits.feedbackTurnMs.push(Math.round(now() - t0));
  }
  stop('GUARD_EXCEEDED');
}

// ---------- 실행 ----------
const startedAt = new Date().toISOString();
const wanted = args.participants ?? script.participants.map(p => p.id);
const selected = wanted.map(id => script.participants.find(p => p.id === id) ?? (() => { throw new Error(`대본에 없는 참가자: ${id}`); })());
mkdirSync(out, { recursive: true });
const measurements = { schemaVersion: 'sns-diagnostic-cost-measurements-v1', mode: args.mode, startedAt, scriptSha256, participants: [], cumulativeUsd: 0, stoppedBeforeParticipant: null };
const write = () => { const p = resolve(out, 'measurements.json'); writeFileSync(`${p}.tmp`, JSON.stringify(measurements, null, 2) + '\n'); renameSync(`${p}.tmp`, p); };

for (const participant of selected) {
  if (args.mode === 'real' && measurements.cumulativeUsd + NEXT_PARTICIPANT_RESERVE_USD > COST_CAP_USD) {
    measurements.stoppedBeforeParticipant = { id: participant.id, reason: `누적 ${measurements.cumulativeUsd} + ${NEXT_PARTICIPANT_RESERVE_USD} > ${COST_CAP_USD}` };
    break;
  }
  const result = await runParticipant(participant);
  measurements.participants.push(result);
  measurements.cumulativeUsd = round6(measurements.participants.reduce((n, p) => n + p.cost.totalUsd, 0));
  write();
  console.log(`${result.id}: correct=${result.correct} omitted=${result.omitted} summaryPassages=${result.summaryPassages} usd=${result.cost.totalUsd} stopped=${result.stoppedItems.length} elapsedMs=${result.elapsedMs}`);
}
write();
console.log(`measurements: ${resolve(out, 'measurements.json')}`);
