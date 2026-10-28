// Handoff: docs/handoffs/2026-10-28-ui-memo-38-42.md (memo 42). Re-generates the end explanation of the stored session fb4090c8 (INFERRED error, asked: true) with the default layout-v1 evaluator.
// The stored SUBMITTED snapshot (phase AWAITING_EVALUATION, mode END_EXPLANATION) is used as is. The old end explanation is taken from the next EVALUATED record's transcript.
// Usage: node --env-file-if-exists=.env scripts/run-end-inferred-asked-check.mjs [--dry-run] --out <dir> [--runs 3] [--usd-cap 0.3] [--events <events.jsonl>]
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hash } from './run-analysis-map-gongsun.mjs';
import { SOL, LUNA, usageCostFor, reserveUsdFor } from './run-end-explanation-choice-link-compare.mjs';
import { OpenAIFeedbackEvaluator } from '../packages/pipeline/dist/index.js';
import { feedbackEndExplanationContent, END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS } from '../packages/pipeline/dist/problem-solving/feedback-end-explanation.js';

export const SESSION_ID = 'fb4090c8-36be-43b2-b0b5-44c90d024b07';
export const EVENTS_PATH = '.omc/logs/problem-feedback-v4/events.jsonl';

export function loadSnapshot(eventsPath = EVENTS_PATH, sessionId = SESSION_ID) {
  const records = readFileSync(eventsPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.session?.sessionId === sessionId);
  const i = records.findIndex(r => r.event === 'SUBMITTED' && r.session.phase === 'AWAITING_EVALUATION' && r.session.evaluationMode === 'END_EXPLANATION');
  if (i < 0) throw new Error(`SNAPSHOT_MISSING: no END_EXPLANATION SUBMITTED record for ${sessionId}`);
  const next = records.slice(i + 1).find(r => r.event === 'EVALUATED');
  const oldSections = (next?.transcript ?? []).filter(t => t.role === 'COACH' && /section/u.test(t.id)).map(t => t.text);
  return { session: records[i].session, oldSections };
}

export const modelFor = s => s.selections.at(-1)?.choiceId === s.source.answerChoiceId ? LUNA : SOL;
const sectionsOf = raw => [raw?.firstChoice, raw?.reselection, raw?.answer].filter(t => typeof t === 'string' && t);

export async function main({ dryRun = false, out, runs = 3, usdCap = 0.3, eventsPath = EVENTS_PATH, evaluator = new OpenAIFeedbackEvaluator() } = {}) {
  const { session, oldSections } = loadSnapshot(eventsPath);
  const content = feedbackEndExplanationContent(structuredClone(session), { layout: 'layout-v1' });
  const payload = JSON.parse(content[0].text);
  const model = modelFor(session);
  const reservedPerRun = reserveUsdFor({ model, max_output_tokens: 8000, instructions: END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS, input: [{ role: 'user', content }] });
  const summary = { model, instructionsHash: hash(END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS), runs, usdCap, reservedPerRunUsd: reservedPerRun, errors: payload.errors };
  if (dryRun) return { dryRun: true, ...summary };
  if (!out) throw new Error('OUT_REQUIRED: --out <dir>');
  const runsPath = `${out}/runs.jsonl`;
  if (existsSync(runsPath)) throw new Error(`RUN_EXISTS: ${runsPath} already exists`);
  if (reservedPerRun > usdCap) throw new Error(`USD_CAP: one request may reserve ${reservedPerRun.toFixed(4)} > cap ${usdCap}; nothing sent`);
  mkdirSync(out, { recursive: true });
  const results = [];
  let spent = 0;
  for (let n = 1; n <= runs; n++) {
    if (spent + reservedPerRun > usdCap) { appendFileSync(runsPath, JSON.stringify({ run: n, event: 'STOP', reason: 'USD_CAP', spent }) + '\n'); break; }
    let row;
    try {
      const call = await evaluator.evaluate(structuredClone(session));
      const m = call.metadata, raw = call.rawOutput;
      const usage = { input_tokens: m.inputTokens, output_tokens: m.outputTokens, cached_tokens: m.cachedTokens };
      spent += usageCostFor(m.model, usage) ?? reservedPerRun;
      row = { run: n, model: m.model, promptVersion: m.promptVersion, attempts: m.attempts.length, usage, firstChoice: raw?.firstChoice ?? null, answer: raw?.answer ?? null, reselection: raw?.reselection ?? null };
    } catch (e) { spent += reservedPerRun; row = { run: n, error: String(e) }; }
    appendFileSync(runsPath, JSON.stringify(row) + '\n');
    results.push(row);
  }
  const md = ['# 마지막 설명 비교 (짐작 오류 질문 연결)', '', `- 세션: ${SESSION_ID}`, `- 모델: ${model}, 지시문 해시: ${summary.instructionsHash}`, '', '## 기록의 기존 마지막 설명', '', ...oldSections.flatMap(t => [t, '']),
    ...results.flatMap(r => [`## 새 글 ${r.run}`, '', ...(r.error ? [`오류: ${r.error}`] : sectionsOf({ firstChoice: r.firstChoice, reselection: r.reselection, answer: r.answer }).flatMap(t => [t, ''])), ''])].join('\n');
  writeFileSync(`${out}/END-EXPLANATIONS.md`, md);
  return { ...summary, completed: results.length, spentUsd: spent };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv, opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const result = await main({ dryRun: argv.includes('--dry-run'), out: opt('--out'),
    ...(opt('--runs') ? { runs: Number(opt('--runs')) } : {}), ...(opt('--usd-cap') ? { usdCap: Number(opt('--usd-cap')) } : {}), ...(opt('--events') ? { eventsPath: opt('--events') } : {}) });
  console.log(JSON.stringify(result, null, 2));
}
