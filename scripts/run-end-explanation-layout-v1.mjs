// Handoff: docs/handoffs/2026-10-28-end-explanation-layout-v1.md. Re-generates only the END_EXPLANATION (M4) of 12 stored sessions with the layout-v1 instructions.
// Sessions are rebuilt without external calls: the stored raw model outputs (attempts of every M1/M3 evaluation) are re-applied to the current evaluator and state machine.
// The default ('v5.3') M4 payload of each rebuilt session must equal the stored END_EXPLANATION request input, otherwise the run stops.
// Usage: node --env-file-if-exists=.env scripts/run-end-explanation-layout-v1.mjs [--dry-run] --out <dir> [--max-requests <n>] [--usd-cap-sol <x>] [--usd-cap-luna <x>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { hash } from './run-analysis-map-gongsun.mjs';
import { SOL, LUNA, RATES_BY_MODEL, usageCostFor, reserveUsdFor, limitCheck, redactImages } from './run-end-explanation-choice-link-compare.mjs';
import {
  OpenAIFeedbackEvaluator, createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment, applyFeedbackEndExplanation,
  FeedbackEndExplanationSchema,
} from '../packages/pipeline/dist/index.js';
import { feedbackEndExplanationContent, END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS } from '../packages/pipeline/dist/problem-solving/feedback-end-explanation.js';

export const LUNA_DIR = 'docs/experiments/v53-three-cell-check-2026-10-27-b';
export const REGRESSION_DIR = 'docs/experiments/v5-diverse-48-regression-2026-10-27-v53-b';
export const END_MARK = 'firstChoice, reselection, answer';
export const TARGETS = [
  ...['KC-r1', 'QP-r1', 'QP-r2', 'XA-r1', 'XS-r1', 'K4-r3', 'K4-r1', 'KF-r1'].map(caseId => ({ caseId, dir: LUNA_DIR })),
  { caseId: 'C-CT', dir: REGRESSION_DIR },
  ...['D-A3', 'S-A1', 'C-B3'].map(caseId => ({ caseId, dir: REGRESSION_DIR })),
];
export const LIMITS = { maxRequests: 20, usdCap: { [SOL]: 1, [LUNA]: 0.2 } };
export const MAX_ATTEMPTS = 3; // first try plus at most 2 retries

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const serialize = v => JSON.stringify(v, null, 2) + '\n';

// ---- session rebuild (no external call) -------------------------------------------------------------------------------------------------

// Transport that answers each request with the next stored raw output of the evaluation being replayed.
export function replayTransport(attempts) {
  const queue = attempts.map(a => a.rawOutput);
  return { create: async () => {
    if (!queue.length) throw new Error('REPLAY_EXHAUSTED: stored attempts ran out');
    const raw = queue.shift();
    return { status: 'completed', output_text: typeof raw === 'string' ? raw : JSON.stringify(raw), usage: { input_tokens: 0, output_tokens: 0 } };
  } };
}

// Replays the case up to the point where the end explanation is requested; returns the snapshot the controller would pass to the evaluator.
export async function rebuildEndSession({ caseData, source, sessionId = 'replay' }) {
  let session = createFeedbackSession(sessionId, source);
  const endSnapshot = s => {
    if (s.phase === 'AWAITING_END_START') { const snap = structuredClone(s); snap.phase = 'AWAITING_EVALUATION'; snap.evaluationMode = 'END_EXPLANATION'; return snap; }
    if (s.phase === 'AWAITING_EVALUATION' && s.evaluationMode === 'END_EXPLANATION') return structuredClone(s);
    return null;
  };
  for (const step of caseData.steps) {
    if (step.command.type !== 'RESUME') session = submitFeedbackCommand(session, step.command, step.transitionId);
    for (const ev of step.evaluations) {
      const snap = endSnapshot(session);
      if (snap) return snap;
      if (ev.kind === 'END_EXPLANATION') continue;
      if (ev.status !== 'SUCCESS' || !ev.call) continue;
      if (session.phase !== 'AWAITING_EVALUATION') throw new Error(`REPLAY_STATE: ${step.transitionId} expects an evaluation in phase ${session.phase}`);
      const call = await new OpenAIFeedbackEvaluator({ transport: replayTransport(ev.call.metadata.attempts) }).evaluate(structuredClone(session));
      session = applyFeedbackAssessment(session, call.rawOutput);
    }
    const snap = endSnapshot(session);
    if (snap) return snap;
  }
  throw new Error(`NO_END_SESSION: ${caseData.case.id} never reached the end explanation`);
}

// ---- stored requests ------------------------------------------------------------------------------------------------------------------

export function findEndRequest(caseId, dir, root = '.') {
  const reqDir = `${root}/${dir}/requests`;
  const files = readdirSync(reqDir).filter(f => f.startsWith(`${caseId}-`) && /^\d+\.request\.json$/u.test(f.slice(caseId.length + 1))).sort();
  const hits = files.filter(f => readJson(`${reqDir}/${f}`).request?.instructions?.includes(END_MARK));
  if (!hits.length) throw new Error(`END_REQUEST_MISSING: ${caseId} in ${reqDir}`);
  const requestPath = `${reqDir}/${hits[0]}`, responsePath = requestPath.replace(/\.request\.json$/u, '.response.json');
  return { requestPath, responsePath, stored: readJson(requestPath), original: existsSync(responsePath) ? readJson(responsePath) : null };
}

const contentOf = request => request.input[0].content;
// Stored content may carry trailing validationFeedback items of a retry; the generated items must be a prefix.
export const payloadMatches = (generated, stored) => generated.length <= stored.length && generated.every((c, i) => JSON.stringify(c) === JSON.stringify(stored[i]));

export function layoutRequest(stored, content) {
  const r = structuredClone(stored);
  r.instructions = END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS;
  r.input[0].content = content;
  return r;
}

// ---- preparation -------------------------------------------------------------------------------------------------------------------------

export async function prepareCases({ root = '.', targets = TARGETS } = {}) {
  const cases = [], mismatches = [];
  const sourcesBy = new Map();
  for (const { caseId, dir } of targets) {
    const caseData = readJson(`${root}/${dir}/cases/${caseId}.json`);
    if (!sourcesBy.has(dir)) sourcesBy.set(dir, readJson(`${root}/${dir}/sources.json`));
    const source = sourcesBy.get(dir)[caseData.case.questionId];
    if (!source) throw new Error(`SOURCE_MISSING: ${caseId} ${caseData.case.questionId}`);
    const found = findEndRequest(caseId, dir, root);
    const model = found.stored.request.model;
    if (!RATES_BY_MODEL[model]) throw new Error(`MODEL_MISMATCH: ${caseId} ${model}`);
    const snapshot = await rebuildEndSession({ caseData, source });
    const base = feedbackEndExplanationContent(structuredClone(snapshot));
    const baseMatch = payloadMatches(base, contentOf(found.stored.request));
    if (!baseMatch) mismatches.push(caseId);
    const content = feedbackEndExplanationContent(structuredClone(snapshot), { layout: 'layout-v1' });
    const payload = JSON.parse(content[0].text);
    cases.push({ caseId, dir, model, snapshot, source, ...found, baseMatch, payload,
      request: layoutRequest(found.stored.request, content), options: found.stored.options });
  }
  return { cases, mismatches };
}

// ---- output ------------------------------------------------------------------------------------------------------------------------------

const quote = t => String(t).split('\n').map(l => `> ${l}`).join('\n');
export function renderResult(c, result) {
  const original = c.original?.output_text ? JSON.parse(c.original.output_text) : null;
  const sec = c.payload.sections;
  const lines = [`## ${c.caseId}`, '', `- 모델: ${c.model}`, `- 문항: ${c.payload.source.questionId}`,
    `- 칸 유형: 처음 고른 선지 ${sec.firstChoice.type}${sec.reselection ? `, 다시 고른 선지 ${sec.reselection.type}` : ''}`, '', '### 학생 근거', ''];
  for (const u of c.payload.studentUtterances) {
    if (u.question) lines.push(`- 교정 질문: ${u.question}`);
    lines.push(`- 학생${u.selectedChoice != null ? ` (선지 ${'①②③④⑤'[u.selectedChoice - 1]})` : ''}: ${u.text || '(근거 없음)'}`);
  }
  lines.push('');
  for (const [k, name] of [['firstChoice', '처음 고른 선지'], ['reselection', '다시 고른 선지'], ['answer', '정답']]) {
    lines.push(`### ${name} (${k})`, '', '**기존**', '', original?.[k] == null ? '(없음)' : quote(original[k]), '', '**새 판**', '', result?.parsed?.[k] == null ? '(없음)' : quote(result.parsed[k]), '');
  }
  if (result && !result.parsed) lines.push(`- 새 판 생성 실패: ${result.status} ${result.error ?? ''}`, '');
  return lines.join('\n');
}

// ---- main ---------------------------------------------------------------------------------------------------------------------------------

export async function main({ dryRun = false, transport, out, root = '.', limits = LIMITS, targets = TARGETS } = {}) {
  if (!out) throw new Error('USAGE: --out is required');
  const { cases, mismatches } = await prepareCases({ root, targets });
  mkdirSync(`${out}/requests`, { recursive: true });
  const w = (path, data, flag = 'w') => writeFileSync(path, typeof data === 'string' ? data : serialize(data), { flag });
  for (const c of cases) w(`${out}/requests/${c.caseId}.request.json`, { caseId: c.caseId, condition: 'LAYOUT_V1', request: redactImages(c.request), options: c.options });
  const byModel = {};
  for (const c of cases) { const m = byModel[c.model] ??= { sessions: 0, reserveUsd: 0, usdCap: limits.usdCap[c.model] }; m.sessions++; m.reserveUsd += reserveUsdFor(c.request); }
  const summary = { sessions: cases.length, requests: cases.length, externalRequests: 0, baseMatch: cases.filter(c => c.baseMatch).length, baseMismatch: mismatches,
    byModel, totalReserveUsd: Object.values(byModel).reduce((a, m) => a + m.reserveUsd, 0),
    overCap: Object.values(byModel).some(m => m.reserveUsd > m.usdCap), overMaxRequests: cases.length > limits.maxRequests };
  const hashes = { instructions: hash(END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS), originalRequests: Object.fromEntries(cases.map(c => [c.caseId, hash(readFileSync(c.requestPath))])) };
  if (mismatches.length) { w(`${out}/RUN.json`, { version: 1, dryRun, stopped: 'BASE_PAYLOAD_MISMATCH', hashes, summary }); throw new Error(`BASE_PAYLOAD_MISMATCH: ${mismatches.join(', ')}`); }
  if (dryRun) { w(`${out}/RUN.json`, { version: 1, dryRun: true, limits, hashes, summary }); return { dryRun: true, ...summary }; }

  // ---- real run: sequential; one request per session plus at most two retries on end-explanation validation failure ----
  const ledgerPath = `${out}/ledger.jsonl`;
  if (existsSync(ledgerPath)) throw new Error('RUN_EXISTS: refusing to rerun');
  mkdirSync(`${out}/responses`, { recursive: true });
  const record = row => appendFileSync(ledgerPath, JSON.stringify(row) + '\n');
  let client, requests = 0, stop = null;
  const spentBy = {}, results = [];
  outer: for (const c of cases) {
    let validationFeedback = null, result = { caseId: c.caseId, status: 'NOT_RUN', parsed: null, error: null, attempts: 0, costUsd: 0 };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const request = structuredClone(c.request);
      if (validationFeedback) request.input[0].content.push({ type: 'input_text', text: JSON.stringify({ validationFeedback }) });
      const reserved = reserveUsdFor(request);
      stop = limitCheck({ requests, spentUsd: spentBy[c.model] ?? 0, reserved, model: c.model }, limits);
      if (stop) { record({ event: 'STOP', caseId: c.caseId, attempt, reason: stop, atUtc: new Date().toISOString() }); results.push(result); break outer; }
      requests++; result.attempts = attempt;
      const requestId = `${c.caseId}-${attempt}`, t0 = performance.now();
      record({ event: 'START', requestId, model: c.model, atUtc: new Date().toISOString(), reservedUsd: reserved });
      let response = null, error = null;
      try {
        response = await (transport ?? (client ??= new OpenAI({ maxRetries: 0 })).responses).create(request, c.options ?? { timeout: 900000, maxRetries: 0 });
      } catch (e) { error = String(e); spentBy[c.model] = (spentBy[c.model] ?? 0) + reserved; }
      const cost = response ? usageCostFor(c.model, response.usage) : null;
      if (response) spentBy[c.model] = (spentBy[c.model] ?? 0) + (cost ?? reserved);
      result.costUsd += cost ?? (response ? reserved : 0);
      record({ event: 'END', requestId, atUtc: new Date().toISOString(), durationMs: Math.round(performance.now() - t0), status: response?.status ?? 'API_ERROR', usage: response?.usage ?? null, costUsd: cost, error });
      w(`${out}/responses/${requestId}.response.json`, response ?? { error }, 'wx');
      if (!response) { result = { ...result, status: 'API_ERROR', error }; break; }
      try {
        if (response.status !== 'completed') throw new Error(`RESPONSE_STATUS: ${response.status}`);
        const parsed = FeedbackEndExplanationSchema.parse(JSON.parse(response.output_text));
        applyFeedbackEndExplanation(structuredClone(c.snapshot), parsed);
        result = { ...result, status: 'PARSED', parsed, error: null }; break;
      } catch (e) { error = e instanceof Error ? e.message : String(e); result = { ...result, status: 'VALIDATION_FAILED', error }; validationFeedback = error; }
    }
    results.push(result);
  }
  const final = { ...summary, externalRequests: requests, spentUsd: spentBy, stop, parsed: results.filter(r => r.parsed).length,
    failed: results.filter(r => !r.parsed).map(r => ({ caseId: r.caseId, status: r.status, error: r.error })) };
  w(`${out}/RESULTS.json`, { results: results.map(({ parsed, ...r }) => ({ ...r, output: parsed })) });
  w(`${out}/END-EXPLANATIONS.md`, '# 마지막 설명 칸 유형 레이아웃 v1: 기존과 새 판\n\n' + cases.map(c => renderResult(c, results.find(r => r.caseId === c.caseId))).join('\n---\n\n') + '\n');
  w(`${out}/RUN.json`, { version: 1, dryRun: false, limits, hashes, summary: final });
  return final;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }, num = name => opt(name) !== undefined ? Number(opt(name)) : undefined;
  const result = await main({ dryRun: argv.includes('--dry-run'), out: opt('--out'),
    limits: { maxRequests: num('--max-requests') ?? LIMITS.maxRequests, usdCap: { [SOL]: num('--usd-cap-sol') ?? LIMITS.usdCap[SOL], [LUNA]: num('--usd-cap-luna') ?? LIMITS.usdCap[LUNA] } } });
  console.log(JSON.stringify(result, null, 2));
}
