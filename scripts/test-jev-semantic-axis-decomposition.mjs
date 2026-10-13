import { appendFileSync, existsSync, mkdirSync, openSync, closeSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

const root = 'docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23';
const promptPath = 'packages/pipeline/experiments/dialogue/semantic-axis-element-decomposition-prompt-v1.md';
const passagePath = 'packages/pipeline/fixtures/experiments/dialogue/passages/dopamine-motor-control.json';
const goldPath = 'packages/pipeline/fixtures/experiments/dialogue/gold-v2/dopamine-motor-control-p1.json';
const frozenPath = `${root}/FROZEN-AXIS.json`;
const phase = process.argv.find((value) => value.startsWith('--phase='))?.slice(8) ?? 'prepare';
assert.ok(['prepare', 'run', 'report'].includes(phase), 'unsupported phase');

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const rows = (name) => existsSync(`${root}/${name}`)
  ? readFileSync(`${root}/${name}`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  : [];
const append = (name, value) => appendFileSync(`${root}/${name}`, `${JSON.stringify(value)}\n`);
const write = (name, value) => writeFileSync(`${root}/${name}`, `${JSON.stringify(value, null, 2)}\n`);

const passage = read(passagePath);
const gold = read(goldPath);
const frozen = read(frozenPath);
const paragraph = passage.paragraphs.find((item) => item.paragraphId === frozen.paragraphId);
const axis = gold.centralAxes.find((item) => item.id === frozen.axisId);
assert.ok(paragraph && axis, 'paragraph or axis unavailable');
assert.equal(axis.description, frozen.axisText, 'frozen axis differs from approved gold');

const inputObject = { paragraphId: paragraph.paragraphId, paragraphText: paragraph.text,
  axisId: axis.id, approvedAxisText: axis.description };
const input = JSON.stringify(inputObject);
const instructions = readFileSync(promptPath, 'utf8').trim();
const semanticFunction = z.enum(['function', 'limitation', 'cause', 'contrast', 'sequence', 'condition', 'other']);
const outputSchema = z.strictObject({
  paragraphId: z.string().min(1),
  axisId: z.string().min(1),
  originalAxisText: z.string().min(1),
  elements: z.array(z.strictObject({
    id: z.string().min(1),
    importance: z.enum(['core', 'optional']),
    kind: z.enum(['claim', 'relation']),
    semanticFunction,
    statement: z.string().min(1),
    arguments: z.array(z.string().min(1)),
    supports: z.array(z.string().min(1)),
    sourceEvidence: z.array(z.string().min(1)).min(1),
    realization: z.enum(['explicit_required', 'inferable_from_arguments', 'not_applicable']),
    rationale: z.string().min(1),
  })).min(1),
});

function validate(raw) {
  const result = outputSchema.parse(raw);
  assert.equal(result.paragraphId, inputObject.paragraphId);
  assert.equal(result.axisId, inputObject.axisId);
  assert.equal(result.originalAxisText, inputObject.approvedAxisText);
  const ids = result.elements.map((element) => element.id);
  assert.deepEqual(ids, ids.map((_, index) => `E${index + 1}`), 'element IDs must be sequential');
  for (const [index, element] of result.elements.entries()) {
    assert.ok(element.sourceEvidence.every((quote) => paragraph.text.includes(quote)), `${element.id}: source evidence mismatch`);
    const earlierIds = new Set(ids.slice(0, index));
    assert.ok(element.supports.every((id) => earlierIds.has(id)), `${element.id}: supports must reference earlier elements`);
    if (element.kind === 'claim') assert.equal(element.realization, 'not_applicable', `${element.id}: claim realization`);
    if (element.kind === 'relation') {
      const idArguments = element.arguments.filter((argument) => /^E\d+$/.test(argument));
      assert.ok(idArguments.every((id) => earlierIds.has(id)), `${element.id}: relation argument must reference earlier elements`);
    }
  }
  return result;
}

mkdirSync(root, { recursive: true });
const fingerprint = { inputHash: hash(input), promptHash: hash(instructions), frozenHash: hash(readFileSync(frozenPath)),
  sourceHashes: { [passagePath]: hash(readFileSync(passagePath)), [goldPath]: hash(readFileSync(goldPath)) } };
const manifestPath = `${root}/openai-decomposition-manifest.json`;
if (!existsSync(manifestPath)) {
  if (phase !== 'prepare') throw new Error('prepare first');
  write('openai-decomposition-manifest.json', { preparedAt: new Date().toISOString(), ...fingerprint,
    model: 'gpt-5.6-terra', effort: 'medium', repeats: 3, maxPhysicalCalls: 3,
    maxOutputTokens: 3500, maxEstimatedUsd: 0.25, serviceTier: 'default', retries: 0,
    authorization: 'User explicitly approved the OpenAI API decomposition test on 2026-09-23.',
    referencePolicy: 'FROZEN-AXIS.json is withheld from the API and used only for post-run comparison.' });
}
const manifest = read(manifestPath);
for (const [key, value] of Object.entries(fingerprint)) assert.deepEqual(manifest[key], value, `frozen ${key} changed`);

function usageCost(usage) {
  if (!usage) return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const writes = usage.input_tokens_details?.cache_write_tokens ?? 0;
  return (Math.max(0, usage.input_tokens - cached - writes) * 2 + cached * 0.2 + writes * 2.5 + usage.output_tokens * 12) / 1e6;
}

function makeReport() {
  const results = rows('openai-decomposition-results.jsonl');
  const responses = rows('openai-decomposition-responses.jsonl');
  const summary = {
    requestedRepeats: manifest.repeats,
    completedCalls: responses.length,
    validResults: results.filter((item) => item.result).length,
    failedResults: results.filter((item) => !item.result).length,
    estimatedCostUsd: responses.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0),
    frozenInputUnchanged: true,
  };
  write('openai-decomposition-summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
}

if (phase === 'prepare') {
  console.log(JSON.stringify({ phase, inputHash: manifest.inputHash, repeats: manifest.repeats, capUsd: manifest.maxEstimatedUsd }));
  process.exit(0);
}
if (phase === 'report') {
  makeReport();
  process.exit(0);
}

assert.ok(process.argv.includes('--approved-live'), 'live approval flag required');
assert.ok(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY missing');
assert.ok(!process.env.OPENAI_BASE_URL, 'custom endpoint not approved');
const lockPath = `${root}/openai-decomposition.lock`;
const lock = openSync(lockPath, 'wx'); closeSync(lock);
const api = new OpenAI({ maxRetries: 0, timeout: 60_000 });
try {
  for (let repeat = 1; repeat <= manifest.repeats; repeat += 1) {
    if (rows('openai-decomposition-results.jsonl').some((item) => item.repeat === repeat)) continue;
    const completed = rows('openai-decomposition-responses.jsonl');
    const spent = completed.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0);
    assert.ok(completed.length < manifest.maxPhysicalCalls, 'physical call cap reached');
    assert.ok(spent < manifest.maxEstimatedUsd, 'cost cap reached');
    const request = { model: manifest.model, instructions, input,
      reasoning: { effort: manifest.effort }, max_output_tokens: manifest.maxOutputTokens,
      store: false, service_tier: manifest.serviceTier,
      text: { format: zodTextFormat(outputSchema, 'semantic_axis_element_decomposition') } };
    append('openai-decomposition-requests.jsonl', { repeat, sentAt: new Date().toISOString(), request });
    const started = performance.now();
    try {
      const response = await api.responses.parse(request, { maxRetries: 0, timeout: 60_000 });
      const estimatedCostUsd = usageCost(response.usage);
      append('openai-decomposition-responses.jsonl', { repeat, receivedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - started), estimatedCostUsd, response });
      if (!response.output_parsed) throw new Error('no structured output');
      const result = validate(response.output_parsed);
      append('openai-decomposition-results.jsonl', { repeat, result });
      console.log(JSON.stringify({ repeat, elementCount: result.elements.length, estimatedCostUsd }));
    } catch (error) {
      if (!rows('openai-decomposition-responses.jsonl').some((item) => item.repeat === repeat)) {
        append('openai-decomposition-responses.jsonl', { repeat, receivedAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - started), estimatedCostUsd: null,
          error: { name: error.name, message: error.message, status: error.status ?? null, code: error.code ?? null } });
      }
      append('openai-decomposition-results.jsonl', { repeat, error: String(error) });
      console.log(JSON.stringify({ repeat, error: String(error) }));
    }
  }
} finally {
  unlinkSync(lockPath);
  makeReport();
}
