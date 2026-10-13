import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TwoStageDialogueEvaluator } from '../packages/pipeline/dist/dialogue-experiment/two-stage-evaluator.js';
import { StudentRepresentationSnapshotSchema } from '../packages/pipeline/dist/dialogue-experiment/schema.js';

// Offline only: both evaluator stages return the previously saved outputs. No API client is used.
const source = 'docs/experiments/dialogue-v4-sensitive-2026-09-19';
const destination = 'docs/experiments/dialogue-error-recording-fix-2026-09-19';
const old = JSON.parse(readFileSync(`${source}/results.json`, 'utf8'));
const responses = readFileSync(`${source}/responses.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const withoutErrors = (result) => {
  const clone = structuredClone(result);
  delete clone.snapshot.explicitErrors;
  return clone;
};
const records = [];
for (const row of old.results) {
  assert.ok(row.result && row.call.decisionAudit, `Missing saved result: ${row.id}`);
  const gate = structuredClone(row.call.decisionAudit.validatedResult);
  const feedback = responses.find((entry) => entry.tag.id === row.id && entry.rawResponse?.output_parsed?.route);
  const metadata = { ...row.call, promptVersion: 'central-story-gate-prompt-v4', schemaVersion: 'central-story-gate-openai-v6' };
  const evaluated = await new TwoStageDialogueEvaluator({
    gateEvaluator: { evaluate: async () => ({ result: structuredClone(gate), call: metadata }) },
    feedbackEvaluator: { evaluate: async () => {
      assert.ok(feedback, `Unexpected feedback call: ${row.id}`);
      return { result: structuredClone(feedback.rawResponse.output_parsed), call: metadata };
    } },
  }).evaluate(row.input);
  assert.deepEqual(withoutErrors(evaluated.result), withoutErrors(row.result), `Behavior changed: ${row.id}`);
  StudentRepresentationSnapshotSchema.parse(evaluated.result.snapshot);
  const errors = evaluated.result.snapshot.explicitErrors;
  const distorted = gate.axisStates.filter((axis) => axis.state === 'distorted');
  assert.equal(errors.length, distorted.length);
  errors.forEach((error, index) => {
    assert.equal(error.evidence, null);
    assert.equal(error.evidenceScope, 'axis_context');
    assert.equal(error.axisId, distorted[index].axisId);
    assert.deepEqual(error.axisEvidence, distorted[index].evidence);
  });
  records.push({ id: row.id, behaviorUnchanged: true, before: row.result.snapshot.explicitErrors, after: errors });
}
const promptHashes = Object.fromEntries(['central-story-gate-prompt-v4.md', 'selective-feedback-prompt-v4.md'].map((name) => [
  name, createHash('sha256').update(readFileSync(`packages/pipeline/experiments/dialogue/${name}`)).digest('hex'),
]));
assert.deepEqual(promptHashes, old.manifest.promptHashes, 'Prompt changed during recording-only fix');
const result = {
  source, executedAt: new Date().toISOString(), apiCalls: 0, estimatedCostUsd: 0,
  records: records.length, errorRecords: records.reduce((n, row) => n + row.after.length, 0),
  allBehaviorUnchanged: true, promptHashes, results: records,
};
mkdirSync(destination, { recursive: true });
writeFileSync(`${destination}/REPLAY.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ records: result.records, errorRecords: result.errorRecords, allBehaviorUnchanged: true, apiCalls: 0 }));
