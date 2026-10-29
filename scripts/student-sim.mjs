#!/usr/bin/env node
// 학생 역할 시뮬레이션 도구. 빌드 산출물의 서비스 클래스를 프로세스 안에서 직접 쓴다(HTTP 서버 없음).
// 실행: node --env-file-if-exists=.env scripts/student-sim.mjs <명령> --run <dir> ...
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(REPO); // 서비스가 content 경로를 cwd 기준으로 푼다.

const PRICE = { // USD per 1M tokens
  'gpt-6-luna': { in: 0.10, out: 0.50 },
  'gpt-6.1-sol': { in: 2, out: 10 },
};

const HELP = `학생 역할 시뮬레이션 도구 (문단 요약·문제 풀이, 실제 판정기)

사용: node --env-file-if-exists=.env scripts/student-sim.mjs <명령> --run <dir> [옵션]
  모든 기록은 <dir>/logs 아래에만 쓴다. 상태는 기록에서 복원되므로 명령 사이에 프로세스가 끝나도 이어진다.

문단 (문단 v4.8)
  para-start --passage <passageId> --paragraph <n(1부터)> --label <이름>
        세션을 만들고 키와 문단 원문을 출력한다.
  para-say --key <키> --text "<학생 말>"
        학생 발화 한 턴. 그 턴에 학생이 받는 말풍선과 단계·action·category·corePartsCovered·끝 여부를 출력.
  para-retry --key <키>
        판정이 실패해 [다시 시도]가 뜬 경우, 같은 발화를 다시 보낸다.
  para-new-attempt --key <키>
        새 시도(처음부터 다시 쓰기). 끝나지 않은 시도는 중단으로 남는다.

문제 (문제 v5.6, 마지막 설명 레이아웃 v1)
  prob-start --question <questionId> --label <이름>
        세션을 만들고 키, 지문·발문·선지를 출력한다.
  prob-select --key <키> --choice <1~5> (--text "<근거>" | --no-rationale)
        선지 고르기 + 근거 쓰기(또는 근거 미제출). 선택 단계와 다시 고르기 단계에서 쓴다.
  prob-rationale --key <키> (--text "<근거>" | --none)
        근거 보완 요청에 답하기 / [근거 미제출].
  prob-correct --key <키> --text "<답>"
        교정 질문에 답하기.
  prob-reselect --key <키>        [다시 선택]
  prob-explain  --key <키>        [코칭 보기]/[설명 보기]
  prob-finish   --key <키>        [마치기]
  prob-end      --key <키> (--yes | --no)         "하나씩 같이 볼까?"에 응/아니
  prob-understood --key <키> (--yes | --no)       "이해됐어?"에 응/아니
  prob-resume   --key <키>        판정 실패 뒤 [평가 다시 시도]
  prob-restart  --key <키>        [다시 풀기]. 같은 문항의 새 세션(새 키)을 만든다.

공통
  show --key <키>      지금까지 전체 대화(학생·튜터)
  cost                 이 run의 누적 호출 수·토큰·비용
  --cap-usd <달러>     run의 비용 상한(기본 10). 누적 비용이 상한 이상이면 새 판정 명령을 거부한다.
  --help               이 도움말
`;

// ---------- 인자 ----------
function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`알 수 없는 인자: ${a}`);
    const k = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opts[k] = true;
    else { opts[k] = next; i++; }
  }
  return { cmd, opts };
}
const need = (opts, k) => {
  if (typeof opts[k] !== 'string' || !opts[k]) throw new Error(`--${k} 가 필요합니다.`);
  return opts[k];
};

// ---------- run 디렉터리 ----------
function openRun(opts) {
  const dir = resolve(need(opts, 'run'));
  const omcLogs = resolve(REPO, '.omc/logs');
  if (dir === omcLogs || dir.startsWith(omcLogs + sep)) throw new Error('--run 은 .omc/logs 아래일 수 없습니다.');
  mkdirSync(resolve(dir, 'logs'), { recursive: true });
  const manifestPath = resolve(dir, 'run.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { capUsd: 10, sessions: {} };
  if (typeof opts['cap-usd'] === 'string') {
    const cap = Number(opts['cap-usd']);
    if (!(cap > 0)) throw new Error('--cap-usd 는 양수여야 합니다.');
    manifest.capUsd = cap;
  }
  const paths = {
    paraDir: resolve(dir, 'logs/dialogue'),
    paraLog: resolve(dir, 'logs/dialogue/sessions.jsonl'),
    probLog: resolve(dir, 'logs/problem-feedback/events.jsonl'),
    probSessionLog: resolve(dir, 'logs/problem-solving/sessions.jsonl'),
    strategyLog: resolve(dir, 'logs/problem-feedback/examiner-strategy.jsonl'),
    evidenceLog: resolve(dir, 'logs/student-state/evidence.jsonl'),
  };
  // 서비스 모듈이 env를 읽기 전에 모두 run 아래로 돌린다.
  process.env.CSAT_PROBLEM_FEEDBACK_LOG = paths.probLog;
  process.env.CSAT_PROBLEM_FEEDBACK_V4_LOG = paths.probLog;
  process.env.CSAT_PROBLEM_SESSION_LOG = paths.probSessionLog;
  process.env.CSAT_EXAMINER_STRATEGY_LOG = paths.strategyLog;
  process.env.CSAT_STUDENT_EVIDENCE_LOG = paths.evidenceLog;
  const save = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  save();
  return { dir, manifest, paths, save };
}

const readJsonl = (path) => existsSync(path)
  ? readFileSync(path, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];

// ---------- 비용 ----------
function addUsage(acc, model, inT, outT) {
  const e = (acc.byModel[model] ??= { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0 });
  const p = PRICE[model];
  e.calls++; e.inputTokens += inT; e.outputTokens += outT;
  if (p) e.usd += (inT * p.in + outT * p.out) / 1e6; else acc.unpriced.add(model);
}
function computeCost(paths) {
  const acc = { byModel: {}, unpriced: new Set(), failedParagraphEvals: 0 };
  for (const r of readJsonl(paths.paraLog)) {
    if (r.event === 'EVALUATION_FAILED') acc.failedParagraphEvals++;
    const c = r.step?.call;
    if (r.event === 'STEP' && c) {
      // call.attempts 번 호출됐을 수 있으나 토큰은 합산돼 있다. 모델은 하나.
      const e = (acc.byModel[c.model] ??= { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0 });
      e.calls += c.attempts ?? 1; e.inputTokens += c.inputTokens; e.outputTokens += c.outputTokens;
      const p = PRICE[c.model];
      if (p) e.usd += (c.inputTokens * p.in + c.outputTokens * p.out) / 1e6; else acc.unpriced.add(c.model);
    }
  }
  for (const r of readJsonl(paths.probLog)) {
    const m = r.call?.metadata;
    if (!m) continue;
    if (m.attempts?.length) for (const a of m.attempts) addUsage(acc, a.model, a.inputTokens, a.outputTokens);
    else addUsage(acc, m.model, m.inputTokens, m.outputTokens);
  }
  const total = Object.values(acc.byModel).reduce((n, e) => n + e.usd, 0);
  return { byModel: acc.byModel, totalUsd: total, unpricedModels: [...acc.unpriced], failedParagraphEvals: acc.failedParagraphEvals,
    calls: Object.values(acc.byModel).reduce((n, e) => n + e.calls, 0) };
}
function checkCap(run) {
  const cost = computeCost(run.paths);
  if (cost.totalUsd >= run.manifest.capUsd) {
    throw new Error(`비용 상한 도달: 누적 $${cost.totalUsd.toFixed(4)} >= 상한 $${run.manifest.capUsd}. 새 판정 명령을 거부합니다(--cap-usd 로 올릴 수 있음).`);
  }
}
function printCost(run) {
  const c = computeCost(run.paths);
  const lines = [`[비용] run=${run.dir}`, `  상한 $${run.manifest.capUsd}`];
  for (const [m, e] of Object.entries(c.byModel)) lines.push(`  ${m}: 호출 ${e.calls}, 입력 ${e.inputTokens}, 출력 ${e.outputTokens}, $${e.usd.toFixed(4)}`);
  lines.push(`  합계: 호출 ${c.calls}, $${c.totalUsd.toFixed(4)} (캐시 할인 미반영 상한치)`);
  if (c.failedParagraphEvals) lines.push(`  주의: 문단 판정 실패 ${c.failedParagraphEvals}건은 토큰이 기록되지 않아 비용에 없음`);
  if (c.unpricedModels.length) lines.push(`  주의: 단가 없는 모델 ${c.unpricedModels.join(', ')}`);
  console.log(lines.join('\n'));
  console.log(JSON.stringify({ cost: c }));
}

// ---------- 서비스 로딩 ----------
async function loadPara(run) {
  const mod = await import(resolve(REPO, 'packages/app/dist/server/dialogue-simple.js'));
  return new mod.SimpleDialogueController({ logDirectory: run.paths.paraDir });
}
async function loadProb() {
  const mod = await import(resolve(REPO, 'packages/app/dist/server/problem-feedback.js'));
  return new mod.ProblemFeedbackController();
}

// ---------- 출력 ----------
function renderPara(m) {
  const who = m.role === 'student' ? '학생' : '튜터';
  const out = [`[${who} · ${m.label}${m.kind === 'WAIT_DONE' ? ' · 대기 종료' : ''}${m.copied ? ' · 원문 옮김 판정' : ''}]`];
  if (m.quote) out.push(`  (인용) "${m.quote}"`);
  if (m.text) out.push(...m.text.split('\n').map(l => '  ' + l));
  if (m.items) m.items.forEach((q, i) => out.push(`  ${i + 1}. ${q}`));
  if (m.parts) {
    out.push(`  ┌ ${m.partsTitle ?? '문단 핵심'}`);
    m.parts.forEach((p, i) => out.push(`  │ ${i + 1}. ${p}${m.partTags?.[i] ? ' ' + m.partTags[i] : ''}`));
    out.push('  └');
  }
  return out.join('\n');
}
const SEQ = { INSTANT: '즉시', GATE: '게이트', CONNECTOR: '이음', SECTION: '설명', QUESTION: '질문', CLOSING: '마무리' };
function renderProb(m) {
  const who = m.role === 'STUDENT' ? '학생' : '코치';
  const tags = [m.sequence ? SEQ[m.sequence] : null, m.kind === 'WAIT_DONE' ? '대기 종료' : null].filter(Boolean);
  return `[${who}${tags.length ? ' · ' + tags.join(' · ') : ''}]\n` + m.text.split('\n').map(l => '  ' + l).join('\n');
}
const circled = (n) => '①②③④⑤'[n - 1];

// ---------- 키 ----------
function nextKey(run, prefix) {
  const n = Object.keys(run.manifest.sessions).filter(k => k.startsWith(prefix + '-')).length + 1;
  return `${prefix}-${n}`;
}
function session(run, opts, kind) {
  const key = need(opts, 'key');
  const s = run.manifest.sessions[key];
  if (!s) throw new Error(`알 수 없는 키: ${key}`);
  if (s.kind !== kind) throw new Error(`${key} 는 ${s.kind === 'para' ? '문단' : '문제'} 세션입니다.`);
  return { key, ...s };
}

// ---------- 문단 복원 ----------
async function paraRestore(ctl, run, key, s) {
  const view0 = ctl.start(s.passageId);
  const rt = ctl.sessions.get(view0.sessionId);
  ctl.sessions.delete(view0.sessionId);
  rt.sessionId = s.sessionId;
  ctl.sessions.set(s.sessionId, rt);
  const records = readJsonl(run.paths.paraLog).filter(r => r.sessionId === s.sessionId && r.paragraphIndex === s.paragraphIndex);
  const byAttempt = new Map();
  for (const r of records) {
    const e = byAttempt.get(r.attemptNumber) ?? { last: null, steps: [], abandoned: false };
    if (r.event === 'ATTEMPT_ABANDONED') e.abandoned = true;
    else { e.last = r; if (r.event === 'STEP' && r.step) e.steps.push(r.step); }
    byAttempt.set(r.attemptNumber, e);
  }
  const attempts = [...byAttempt.entries()].sort((a, b) => a[0] - b[0]).map(([n, e]) => ({
    attemptNumber: n, state: e.last.state, transcript: e.last.transcript, steps: e.steps,
    status: e.last.event === 'EVALUATION_FAILED' ? 'RETRYABLE_ERROR' : 'IDLE', abandoned: e.abandoned,
  }));
  if (attempts.length) rt.paragraphs.set(s.paragraphIndex, { attempts });
  rt.currentIndex = s.paragraphIndex;
  return rt;
}

function paraButtons(view) {
  const c = view.current;
  const b = [];
  if (c.evaluationStatus === 'RETRYABLE_ERROR') b.push('para-retry (같은 발화 다시 시도)');
  else if (c.canRespond) b.push(`para-say --text "..." (${{ INITIAL: '나의 요약', RETRY: '다시 쓴 요약', AFTER_CORRECTION: '나의 답', AFTER_GAP: '나의 답' }[c.stage]})`);
  if (c.canStartNewAttempt) b.push('para-new-attempt (새 시도)');
  if (c.done) b.unshift('(이 시도는 끝남)');
  return b;
}
async function paraTurn(run, key, s, ctl, before, view, extra = {}) {
  const c = view.current;
  const inspect = ctl.inspect(s.sessionId, s.paragraphIndex);
  const attempt = inspect.attempts.at(-1);
  const step = attempt.steps.at(-1);
  const out = [];
  const fresh = c.messages.slice(before).filter(m => m.role === 'tutor');
  out.push(`[문단 ${key} · 시도 ${c.attemptNumber}]`);
  if (c.evaluationStatus === 'RETRYABLE_ERROR') out.push('(판정 실패) ' + c.evaluationError);
  for (const m of fresh) out.push(renderPara(m));
  const info = step ? { stage: step.stage, action: step.action, category: step.output.category, corePartsCovered: step.output.corePartsCovered } : {};
  out.push(`-- 판정(마지막 단계): ${step ? `단계=${info.stage}, action=${info.action}, category=${info.category}, corePartsCovered=${JSON.stringify(info.corePartsCovered)}` : '없음'}`);
  out.push(`-- 다음 단계=${c.stage}, 끝남=${c.done}${attempt.state.outcome ? ' (결과 ' + attempt.state.outcome + ')' : ''}`);
  out.push(`-- 지금 할 수 있는 것: ${paraButtons(view).join(' / ') || '없음'}`);
  console.log(out.join('\n'));
  console.log(JSON.stringify({ key, attempt: c.attemptNumber, ...info, nextStage: c.stage, done: c.done, outcome: attempt.state.outcome,
    evaluationStatus: c.evaluationStatus, canRespond: c.canRespond, canStartNewAttempt: c.canStartNewAttempt, bubbles: fresh, ...extra }));
}

// ---------- 문제 복원 ----------
async function probRestore(ctl, run, key, s) {
  const records = readJsonl(run.paths.probLog).filter(r => r.session.sessionId === s.sessionId);
  const last = records.at(-1);
  if (!last) throw new Error('이 세션의 기록이 없습니다.');
  const rt = {
    session: last.session, transcript: last.transcript ?? [], busy: false, endGeneration: null, evaluation: null, transitions: new Map(),
    // 평가 중에 프로세스가 끝났다면 [평가 다시 시도] 상태로 둔다.
    evaluationStatus: last.session.phase === 'AWAITING_EVALUATION' ? 'RETRYABLE_ERROR' : 'IDLE',
  };
  ctl.sessions.set(s.sessionId, rt);
  return rt;
}
async function probSettle(ctl, sessionId) {
  const rt = ctl.sessions.get(sessionId);
  for (let i = 0; i < 20 && (rt.evaluation || rt.endGeneration); i++) {
    if (rt.evaluation) await rt.evaluation;
    if (rt.endGeneration) await rt.endGeneration;
  }
  return ctl.get(sessionId);
}
function probButtons(view) {
  const b = [];
  if (view.evaluationStatus === 'RETRYABLE_ERROR') return ['prob-resume (평가 다시 시도)'];
  const ph = view.phase;
  if (ph === 'AWAITING_SELECTION') b.push('prob-select --choice N (--text "..." | --no-rationale)');
  if (ph === 'AWAITING_RESELECTION') b.push('prob-select --choice N(처음 고른 번호는 불가) (--text "..." | --no-rationale)');
  if (ph === 'AWAITING_RATIONALE') b.push('prob-rationale --text "..." (제출)', 'prob-rationale --none ([근거 미제출])');
  if (ph === 'AWAITING_CORRECTION') b.push('prob-correct --text "..." (답변 전송)');
  if (ph === 'AWAITING_POST_REPAIR_CHOICE') for (const o of view.postRepairOptions ?? [])
    b.push(o === 'RESELECT' ? 'prob-reselect ([다시 선택])' : o === 'FINISH' ? 'prob-finish ([마치기])' : `prob-explain ([${view.postRepairOptions.includes('RESELECT') ? '코칭 보기' : '설명 보기'}])`);
  if (ph === 'AWAITING_END_START') b.push('prob-end --yes ([응])', 'prob-end --no ([아니])');
  if (ph === 'AWAITING_UNDERSTANDING') b.push('prob-understood --yes ([응])', 'prob-understood --no ([아니])');
  if (ph === 'COMPLETED') b.push('prob-restart ([다시 풀기])');
  return b;
}
function printProbTurn(key, view, before, extra = {}) {
  const fresh = view.transcript.slice(before).filter(m => m.role === 'COACH');
  const out = [`[문제 ${key} · 단계 ${view.phase}]`];
  if (view.evaluationStatus === 'RETRYABLE_ERROR') out.push('(판정 실패) ' + view.evaluationError);
  for (const m of fresh) out.push(renderProb(m));
  if (view.activeErrorId) out.push(`-- 교정 질문 대상 errorId=${view.activeErrorId}${view.correctionHighlights.length ? '; 지문 강조: ' + view.correctionHighlights.map(h => `"${h.text}"`).join(', ') : ''}`);
  if (view.result) out.push(`-- 결과: ${view.result.outcome}, 고른 답 정답=${view.result.choiceCorrect}, 이해 자가보고=${view.result.selfReportedUnderstanding}`);
  out.push(`-- 지금 할 수 있는 것: ${probButtons(view).join(' / ') || '없음'}`);
  console.log(out.join('\n'));
  console.log(JSON.stringify({ key, phase: view.phase, revision: view.revision, evaluationStatus: view.evaluationStatus, selectionCount: view.selectionCount,
    questionsAsked: view.questionsAsked, result: view.result, buttons: probButtons(view), bubbles: fresh, ...extra }));
}

async function probSubmit(run, opts, command) {
  const s = session(run, opts, 'prob');
  checkCap(run);
  const ctl = await loadProb();
  await probRestore(ctl, run, s.key, s);
  const cur = ctl.get(s.sessionId);
  const before = cur.transcript.length;
  const rt = ctl.sessions.get(s.sessionId);
  if (command.type !== 'RESUME' && rt.evaluationStatus === 'RETRYABLE_ERROR') throw new Error('판정이 실패한 상태입니다. prob-resume 을 먼저 쓰세요.');
  if (command.type === 'RESUME' && rt.evaluationStatus !== 'RETRYABLE_ERROR') throw new Error('다시 시도할 평가가 없습니다.');
  await ctl.submit(s.sessionId, { transitionId: `sim-${randomUUID()}`, expectedRevision: cur.revision, command });
  const view = await probSettle(ctl, s.sessionId);
  printProbTurn(s.key, view, before);
}

// ---------- 명령 ----------
async function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === '--help' || argv[0] === 'help' || argv.includes('--help')) { console.log(HELP); return; }
  const { cmd, opts } = parseArgs(argv);
  const run = openRun(opts);

  if (cmd === 'cost') return printCost(run);

  if (cmd === 'para-start') {
    const passageId = need(opts, 'passage'); const n = Number(need(opts, 'paragraph')); const label = need(opts, 'label');
    const ctl = await loadPara(run);
    const view = ctl.start(passageId);
    if (!Number.isInteger(n) || n < 1 || n > view.paragraphs.length) throw new Error(`--paragraph 은 1~${view.paragraphs.length}`);
    const paragraphIndex = n - 1;
    const key = nextKey(run, 'para');
    run.manifest.sessions[key] = { kind: 'para', label, passageId, paragraphIndex, sessionId: view.sessionId, startedAt: new Date().toISOString() };
    run.save();
    const p = view.paragraphs[paragraphIndex];
    console.log(`[문단 세션 시작] 키=${key} 라벨=${label}\n지문: ${view.title} (${passageId}), ${n}문단 (${p.paragraphId})\n----- 문단 원문 -----\n${p.text}\n---------------------\n-- 지금 할 수 있는 것: para-say --key ${key} --text "..." (나의 요약)`);
    console.log(JSON.stringify({ key, label, passageId, paragraphId: p.paragraphId, paragraphIndex, text: p.text }));
    return;
  }
  if (cmd === 'para-say' || cmd === 'para-retry' || cmd === 'para-new-attempt') {
    const s = session(run, opts, 'para');
    const ctl = await loadPara(run);
    const rt = await paraRestore(ctl, run, s.key, s);
    const cur = ctl.get(s.sessionId);
    if (cmd === 'para-new-attempt') {
      const view = ctl.startAttempt(s.sessionId, { paragraphIndex: s.paragraphIndex });
      console.log(`[문단 ${s.key}] 새 시도 ${view.current.attemptNumber} 시작\n-- 지금 할 수 있는 것: ${paraButtons(view).join(' / ')}`);
      console.log(JSON.stringify({ key: s.key, attempt: view.current.attemptNumber, canRespond: view.current.canRespond }));
      return;
    }
    checkCap(run);
    let text;
    if (cmd === 'para-retry') {
      if (cur.current.evaluationStatus !== 'RETRYABLE_ERROR') throw new Error('다시 시도할 판정이 없습니다.');
      text = cur.current.messages.at(-1).text;
    } else text = need(opts, 'text');
    const before = cur.current.messages.length - (cmd === 'para-retry' ? 1 : 0);
    const view = await ctl.respond(s.sessionId, { transitionId: `sim-${randomUUID()}`, paragraphIndex: s.paragraphIndex, text });
    // 학생 발화 말풍선 바로 뒤부터가 이번 턴에 받은 말풍선이다.
    await paraTurn(run, s.key, s, ctl, before + 1, view);
    void rt;
    return;
  }

  if (cmd === 'prob-start') {
    const questionId = need(opts, 'question'); const label = need(opts, 'label');
    const ctl = await loadProb();
    const view = ctl.start(questionId);
    const key = nextKey(run, 'prob');
    run.manifest.sessions[key] = { kind: 'prob', label, questionId, sessionId: view.sessionId, startedAt: new Date().toISOString() };
    run.save();
    const q = view.question;
    const out = [`[문제 세션 시작] 키=${key} 라벨=${label}`, `${view.title} · ${view.exam} · ${view.questionNumber}번 (${questionId})`,
      '----- 지문 -----', q.passageText];
    if (q.scenarioText) out.push('----- 보기/상황 -----', q.scenarioText);
    out.push('----- 발문 -----', q.stem, '----- 선지 -----', ...q.choices.map(c => `${circled(c.position)} ${c.text}`));
    if (q.media.length) out.push(`(시각 자료 ${q.media.length}개 있음 — 이 도구는 텍스트만 보여 줌)`);
    out.push('---------------', ...view.transcript.map(renderProb), `-- 지금 할 수 있는 것: ${probButtons(view).join(' / ')}`);
    console.log(out.join('\n'));
    console.log(JSON.stringify({ key, label, questionId, phase: view.phase, choices: q.choices.map(c => ({ position: c.position, choiceId: c.choiceId })) }));
    return;
  }
  if (cmd === 'prob-restart') {
    const s = session(run, opts, 'prob');
    const ctl = await loadProb();
    const view = ctl.start(s.questionId);
    const key = nextKey(run, 'prob');
    run.manifest.sessions[key] = { kind: 'prob', label: s.label, questionId: s.questionId, sessionId: view.sessionId, restartedFrom: s.key, startedAt: new Date().toISOString() };
    run.save();
    console.log(`[다시 풀기] 새 키=${key} (이전 ${s.key})\n${view.transcript.map(renderProb).join('\n')}\n-- 지금 할 수 있는 것: ${probButtons(view).join(' / ')}`);
    console.log(JSON.stringify({ key, restartedFrom: s.key, phase: view.phase }));
    return;
  }
  if (cmd === 'prob-select') {
    const s = session(run, opts, 'prob');
    const n = Number(need(opts, 'choice'));
    const ctl = await loadProb();
    const rt = await probRestore(ctl, run, s.key, s);
    const choice = rt.session.source.choices.find(c => c.position === n);
    if (!choice) throw new Error('--choice 는 선지 번호(1~5)여야 합니다.');
    const rationale = opts['no-rationale'] ? { mode: 'OMITTED' } : { mode: 'PROVIDED', text: need(opts, 'text') };
    return probSubmit(run, opts, { type: 'SELECT', choiceId: choice.choiceId, rationale });
  }
  if (cmd === 'prob-rationale') {
    return probSubmit(run, opts, { type: 'RATIONALE', rationale: opts.none ? { mode: 'OMITTED' } : { mode: 'PROVIDED', text: need(opts, 'text') } });
  }
  if (cmd === 'prob-correct') {
    const s = session(run, opts, 'prob');
    const ctl = await loadProb();
    const rt = await probRestore(ctl, run, s.key, s);
    if (!rt.session.activeErrorId) throw new Error('지금은 교정 질문이 없습니다.');
    return probSubmit(run, opts, { type: 'CORRECT', errorId: rt.session.activeErrorId, text: need(opts, 'text') });
  }
  if (cmd === 'prob-reselect') return probSubmit(run, opts, { type: 'RESELECT' });
  if (cmd === 'prob-explain') return probSubmit(run, opts, { type: 'REQUEST_EXPLANATION' });
  if (cmd === 'prob-finish') return probSubmit(run, opts, { type: 'FINISH' });
  if (cmd === 'prob-end' || cmd === 'prob-understood') {
    if (!!opts.yes === !!opts.no) throw new Error('--yes 또는 --no 중 하나를 주세요.');
    return probSubmit(run, opts, cmd === 'prob-end' ? { type: 'END_START', accept: !!opts.yes } : { type: 'UNDERSTOOD', answer: !!opts.yes });
  }
  if (cmd === 'prob-resume') return probSubmit(run, opts, { type: 'RESUME' });

  if (cmd === 'show') {
    const key = need(opts, 'key');
    const s = run.manifest.sessions[key];
    if (!s) throw new Error(`알 수 없는 키: ${key}`);
    if (s.kind === 'para') {
      const ctl = await loadPara(run);
      await paraRestore(ctl, run, key, s);
      const insp = ctl.inspect(s.sessionId, s.paragraphIndex);
      const out = [`[문단 ${key} 전체 대화] 라벨=${s.label} ${s.passageId} ${s.paragraphIndex + 1}문단`];
      for (const a of insp.attempts) {
        out.push(`=== 시도 ${a.attemptNumber} (${a.status}) ===`, ...a.messages.map(renderPara));
      }
      console.log(out.join('\n'));
      console.log(JSON.stringify({ key, attempts: insp.attempts.map(a => ({ n: a.attemptNumber, status: a.status, messages: a.messages })) }));
    } else {
      const ctl = await loadProb();
      const rt = await probRestore(ctl, run, key, s);
      console.log([`[문제 ${key} 전체 대화] 라벨=${s.label} ${s.questionId} 단계=${rt.session.phase}`, ...rt.transcript.map(renderProb)].join('\n'));
      console.log(JSON.stringify({ key, phase: rt.session.phase, transcript: rt.transcript }));
    }
    return;
  }
  throw new Error(`알 수 없는 명령: ${cmd}\n\n${HELP}`);
}

main().catch(e => { console.error('오류: ' + (e instanceof Error ? e.message : String(e))); process.exitCode = 1; });
