import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = process.cwd(), require = createRequire(`${root}/package.json`);
const { default: OpenAI } = require('openai');
const r = await import(pathToFileURL(`${root}/scripts/test-answer-path-sol.mjs`));
const { accounting, usageCosts } = await import(pathToFileURL(`${root}/scripts/test-trap-map-v0.mjs`));
const dir = r.DEFAULT_DIR, phase = 'run', label = 'N4-r3';
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const save = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', { flag: 'wx' });
const ledger = readFileSync(`${dir}/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const starts = ledger.filter(e => e.event === 'START' && e.phase === phase && e.label === label);
assert.equal(starts.length, 2, 'TWO_KNOWN_FAILED_REQUESTS');
const previous = ledger.find(e => e.event === 'END' && e.requestId === starts.at(-1).requestId);
assert.equal(previous.status, 'API_ERROR'); assert.equal(previous.httpStatus, null);
assert.ok(!ledger.some(s => s.event === 'START' && !ledger.some(e => e.event === 'END' && e.requestId === s.requestId)));
const { frozen, cases, sources, prompts } = r.verifyFrozen(dir), { maps, mapHash } = r.verifyMaps(dir, sources);
const c = cases.find(c => c.id === 'N4'), request = r.requestFor(phase, sources[c.questionId], prompts, frozen, c, maps[c.questionId]);
assert.equal(hash(request), starts[0].requestHash, 'IDENTICAL_FROZEN_REQUEST');
const reservedUsd = r.budgetCheck(ledger, phase, request);
const requestId = `run-${label}-${accounting(ledger).requests + 1}`, started = performance.now();
const record = e => { appendFileSync(`${dir}/requests.jsonl`, JSON.stringify(e) + '\n'); ledger.push(e); };
// attempt 1 is a fresh transport attempt; recoveryOf explicitly preserves network recovery separately from format retries.
record({ event: 'START', requestId, phase, label, attempt: 1, recoveryOf: starts.at(-1).requestId, recoveryReason: 'API_ERROR_NO_HTTP_STATUS', reservedUsd,
  frozenHash: hash(frozen), mapHash, requestedAtUtc: new Date().toISOString(), requestHash: hash(request) });
try {
  const response = await new OpenAI({ maxRetries: 0 }).responses.create(request, { timeout: frozen.timeoutMs });
  save(`${dir}/attempts/${requestId}.json`, response);
  record({ event: 'END', requestId, phase, label, attempt: 1, recoveryOf: starts.at(-1).requestId, durationMs: performance.now() - started,
    responseId: response.id, model: response.model, status: response.status, usage: response.usage ?? null,
    costs: usageCosts(response.usage, r.MODEL), responsePath: `attempts/${requestId}.json` });
  assert.equal(response.status, 'completed');
  const output = r.validateScore(JSON.parse(response.output_text), c, maps[c.questionId]);
  save(`${dir}/runs/${label}.json`, { caseId: c.id, replicate: 3, label, phase, model: r.MODEL, frozenHash: hash(frozen), mapHash,
    status: 'VALID', output, citations: r.quoteChecks(output, c.rationale),
    attempts: [...starts.map(s => ({ requestId: s.requestId, status: 'API_ERROR', httpStatus: null })), { requestId, status: 'VALID', recoveryOf: starts.at(-1).requestId }] });
  console.log(JSON.stringify({ recovered: label, ...accounting(ledger) }));
} catch (error) {
  if (!ledger.some(e => e.event === 'END' && e.requestId === requestId)) record({ event: 'END', requestId, phase, label, attempt: 1,
    recoveryOf: starts.at(-1).requestId, durationMs: performance.now() - started, status: 'API_ERROR', httpStatus: error.status ?? null,
    errorName: error.name ?? 'Error', costs: null, usage: null });
  let safeMessage = String(error.message ?? '').split(process.env.OPENAI_API_KEY || '__NO_KEY__').join('[REDACTED]').replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 300);
  console.error(JSON.stringify({ recoveryFailed: label, errorName: error.name, httpStatus: error.status ?? null, message: safeMessage })); process.exitCode = 1;
}
