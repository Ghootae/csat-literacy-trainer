import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  CentralStoryGateV4ErrorClaimsResultSchema,
  validateCentralStoryGateResult,
} from '../packages/pipeline/dist/dialogue-experiment/gate.js';

const ROOT = 'docs/experiments/v4-output-field-ablation-s2-2026-09-22';
const IDS = ['N27', 'N36'];
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const rows = (name) => existsSync(`${ROOT}/${name}`)
  ? readFileSync(`${ROOT}/${name}`, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  : [];
const append = (name, value) => appendFileSync(`${ROOT}/${name}`, `${JSON.stringify(value)}\n`);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const usageCost = (usage) => usage ? ((usage.input_tokens ?? 0) * 2 + (usage.output_tokens ?? 0) * 12) / 1_000_000 : null;
const CandidateSchema = CentralStoryGateV4ErrorClaimsResultSchema.omit({
  centralObjectRepresentation: true,
  centralStoryRepresentation: true,
  decisionSummary: true,
});

const manifest = read(`${ROOT}/manifest.json`);
for (const [path, hash] of Object.entries(manifest.protectedHashes)) {
  assert.equal(sha(readFileSync(path)), hash, `Frozen file changed: ${path}`);
}
const cases = read(`${ROOT}/cases.json`);
const sources = read(`${ROOT}/sources.json`);
const jobs = read(`${ROOT}/jobs.json`).filter((job) => IDS.includes(job.caseId));
assert.deepEqual(jobs.map((job) => job.caseId), IDS);
const inputFor = (item) => ({
  gold: sources[item.paragraphId].gold,
  goldVersion: 'original-gold-v2',
  goldHash: sources[item.paragraphId].fileHash,
  initialResponse: item.initialResponse,
  history: item.history,
  turn: item.turn,
  questionsAsked: item.history.length,
  maxQuestions: 3,
  ...(item.revealedAxisContent.length ? { revealedAxisContent: item.revealedAxisContent } : {}),
  ...(item.shownSourceGuides.length ? { shownSourceGuides: item.shownSourceGuides } : {}),
});

assert.ok(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY missing');
assert.equal(rows('rerun-requests.jsonl').length, 0, 'Limited rerun already started');
const client = new OpenAI({ maxRetries: 0, timeout: 60000 });
for (const job of jobs) {
  const id = `${job.id}-rerun1`;
  append('rerun-requests.jsonl', { id, caseId: job.caseId, request: job.request, sentAt: new Date().toISOString() });
  const start = performance.now();
  let response = null;
  let transportError = null;
  try { response = await client.responses.create(job.request, { maxRetries: 0, timeout: 60000 }); }
  catch (error) { transportError = { name: error.name, status: error.status ?? null, code: error.code ?? null }; }
  append('rerun-responses.jsonl', { id, caseId: job.caseId, durationMs: performance.now() - start, response, transportError, costUsd: usageCost(response?.usage) });
  let raw = null;
  let validated = null;
  let contractError = null;
  try {
    assert.equal(response?.status, 'completed', 'API did not complete');
    raw = CandidateSchema.parse(JSON.parse(response.output_text));
    const item = cases.find((candidate) => candidate.id === job.caseId);
    validated = validateCentralStoryGateResult({
      ...raw,
      centralObjectRepresentation: null,
      centralStoryRepresentation: null,
      decisionSummary: 'S2 omitted decisionSummary',
    }, inputFor(item)).result;
  } catch (error) { contractError = String(error?.message ?? error); }
  const comparable = validated ?? raw;
  append('rerun-results.jsonl', {
    id, caseId: job.caseId, raw, validated,
    axes: comparable?.axisFeedback?.map(({ axisId, status, reason }) => ({ axisId, status, reason })) ?? null,
    targetAxisId: comparable?.targetAxisId ?? null,
    effectiveResponse: comparable?.effectiveResponse ?? null,
    contractError,
  });
  console.log(JSON.stringify({ completed: job.caseId, contractError }));
}
const requests = rows('rerun-requests.jsonl');
const responses = rows('rerun-responses.jsonl');
const results = rows('rerun-results.jsonl');
assert.equal(requests.length, 2); assert.equal(responses.length, 2); assert.equal(results.length, 2);
assert.equal(new Set(requests.map((item) => item.id)).size, 2);
const cost = responses.reduce((sum, item) => sum + (item.costUsd ?? 0), 0);
assert.ok(cost <= 0.2);
console.log(JSON.stringify({ audit: 'passed', calls: 2, costUsd: cost, results }, null, 2));
