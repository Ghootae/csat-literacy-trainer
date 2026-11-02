// Handoff: docs/handoffs/2026-11-03-judge-format-slip-normalization.md. No external call, no .env.
// Re-runs every stored v5.8 SELECTION ASSESSMENT attempt through the current server cleaning
// (normalizeCells -> snapQuotes -> settleConclusion -> validateClaims) on the session saved just before the evaluation.
// Usage: node scripts/replay-judge-normalization.mjs   (needs a built packages/pipeline/dist)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { feedbackEvaluationInput, feedbackObservationText } from '../packages/pipeline/dist/index.js';
import { normalizeCells, snapQuotes, settleConclusion, validateClaims } from '../packages/pipeline/dist/problem-solving/feedback-claims.js';

const PROMPT_VERSION = 'problem-feedback-v5.8';
const EVENTS = '.omc/logs/problem-feedback-v4/events.jsonl';

function recordFiles(dir = 'docs/experiments') {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) found.push(...recordFiles(path));
    else if (name.endsWith('.records.jsonl')) found.push(path);
  }
  return found;
}

/** Stored attempts: { file, ordinal, attempt, last, finalOutput, session } for each v5.8 SELECTION ASSESSMENT attempt. */
function attemptsOf(file) {
  const rows = readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const found = [];
  rows.forEach((row, i) => {
    const metadata = row.call?.metadata;
    if (row.event !== 'EVALUATED' || metadata?.promptVersion !== PROMPT_VERSION) return;
    const submitted = rows.slice(0, i).reverse().find(r => r.event === 'SUBMITTED' && r.transitionId === row.transitionId);
    const assessments = metadata.attempts.filter(a => a.kind === 'ASSESSMENT');
    assessments.forEach((attempt, k) => {
      if (submitted?.session?.evaluationMode !== 'SELECTION') return;
      found.push({ file, ordinal: i, attempt, last: k === assessments.length - 1, finalOutput: row.call.rawOutput, session: submitted.session });
    });
  });
  return found;
}

/** The evaluator's SELECTION path after the model call; returns { pass, error, assessment }. */
function clean(t) {
  const s = t.session;
  const choice = s.source.choices.find(c => c.choiceId === s.selections.at(-1)?.choiceId);
  const options = { correctChoice: choice.choiceId === s.source.answerChoiceId, targetVerdict: s.choiceImpliedVerdict, choiceText: choice.text };
  const observations = feedbackEvaluationInput(s).observations.map(o => ({ observationId: o.observationId, text: feedbackObservationText(o) }));
  try {
    const normalized = normalizeCells(t.attempt.rawOutput, options);
    const snapped = snapQuotes(normalized.assessment, observations);
    const settled = settleConclusion(snapped.assessment, observations, options);
    validateClaims(settled.assessment, observations, options);
    return { pass: true, error: null, assessment: settled.assessment, notes: [...normalized.notes, ...snapped.notes, ...settled.notes] };
  } catch (e) { return { pass: false, error: String(e.message ?? e), assessment: null, notes: [] }; }
}

const targets = [EVENTS, ...recordFiles()].filter(existsSync).flatMap(attemptsOf);
const fixed = []; const stillFailing = []; const changed = [];
let originalError = 0; let originalSuccess = 0;
for (const t of targets) {
  const r = clean(t);
  const tag = `${t.file}#${t.ordinal} ${t.session.source.questionId} ${t.session.sessionId.slice(0, 8)}`;
  if (t.attempt.error) {
    originalError++;
    (r.pass ? fixed : stillFailing).push(`${tag} | ${t.attempt.error.slice(0, 80)}${r.pass ? ` | ${r.notes.join(' / ')}` : ` | now: ${r.error.slice(0, 80)}`}`);
  } else {
    originalSuccess++;
    const before = t.finalOutput;
    const differs = !r.pass || (t.last && before?.mode === 'SELECTION' && 'contentAssessment' in before
      && (r.assessment.contentAssessment !== before.contentAssessment || r.assessment.rationaleImpliedVerdict !== before.rationaleImpliedVerdict));
    if (differs) changed.push(`${tag} | ${r.pass ? 'verdict or contentAssessment differs' : r.error}`);
  }
}
console.log(`stored v5.8 SELECTION ASSESSMENT attempts: ${targets.length} (ERROR ${originalError}, SUCCESS ${originalSuccess})`);
console.log(`originally ERROR, now passing: ${fixed.length}`); fixed.forEach(l => console.log(`  ${l}`));
console.log(`originally ERROR, still failing: ${stillFailing.length}`); stillFailing.forEach(l => console.log(`  ${l}`));
console.log(`originally SUCCESS, result changed: ${changed.length}`); changed.forEach(l => console.log(`  ${l}`));
