import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult,
} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT = 'docs/experiments/v4-output-field-ablation-s3-2026-09-22';
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rows = (name) => readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const cases = read(`${ROOT}/cases.json`);
const sources = read(`${ROOT}/sources.json`);
const human = read(`${ROOT}/human-reference.json`);
const GateSchema = CentralStoryGateV4ErrorClaimsResultSchema.omit({ centralObjectRepresentation: true, centralStoryRepresentation: true, decisionSummary: true });
const inputFor = (item) => ({ gold: sources[item.paragraphId].gold, goldVersion: 'original-gold-v2', goldHash: sources[item.paragraphId].fileHash,
  initialResponse: item.initialResponse, history: item.history, turn: item.turn, questionsAsked: item.history.length, maxQuestions: 3,
  ...(item.revealedAxisContent.length ? { revealedAxisContent: item.revealedAxisContent } : {}), ...(item.shownSourceGuides.length ? { shownSourceGuides: item.shownSourceGuides } : {}) });

const corrected = rows('gate-results.jsonl').map((stored) => {
  let error = null;
  try {
    const raw = GateSchema.parse(stored.raw);
    const item = cases.find((candidate) => candidate.id === stored.caseId);
    const automatic = raw.axisFeedback.some((axis) => ['ERROR', 'UNCLEAR_SERIOUS'].includes(axis.status));
    if (automatic && !raw.questionIntent?.trim()) throw new Error('automatic question requires nonempty questionIntent');
    if (!automatic && raw.questionIntent !== null) throw new Error('PASS/UNCLEAR_OK-only result requires questionIntent null');
    if (raw.status !== 'CAPTURED' && raw.targetAxisId === null) throw new Error('non-CAPTURED result requires targetAxisId even when questionIntent is null');
    validateCentralStoryGateResult({ ...raw, centralObjectRepresentation: null, centralStoryRepresentation: null,
      decisionSummary: 'S3 omitted decisionSummary', questionIntent: raw.status === 'CAPTURED' ? null : (raw.questionIntent ?? 'S3 delayed optional intent') }, inputFor(item));
  } catch (cause) { error = String(cause?.message ?? cause); }
  const ref = human.cases.find((candidate) => candidate.caseId === stored.caseId);
  const changes = ref.approvedAxes.flatMap((axis) => { const actual = stored.axes?.find((candidate) => candidate.axisId === axis.axisId); return actual?.status === axis.status ? [] : [{ axisId: axis.axisId, approved: axis.status, actual: actual?.status ?? null }]; });
  const actualQuestion = stored.axes?.some((axis) => ['ERROR', 'UNCLEAR_SERIOUS'].includes(axis.status)) ?? null;
  return { caseId: stored.caseId, contractError: error, axisSame: changes.length === 0, changes,
    questionSame: actualQuestion === ref.approvedQuestionCandidate, newQuestion: !ref.approvedQuestionCandidate && actualQuestion === true,
    targetAxisId: stored.raw?.targetAxisId ?? null, questionIntent: stored.raw?.questionIntent ?? null };
});
const result = { correctedAt: new Date().toISOString(), valid: corrected.filter((item) => !item.contractError).length,
  humanAxisMatch: corrected.filter((item) => item.axisSame).length, humanQuestionMatch: corrected.filter((item) => item.questionSame).length,
  newQuestions: corrected.filter((item) => item.newQuestion).length, cases: corrected };
writeFileSync(`${ROOT}/corrected-gate-audit.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));

