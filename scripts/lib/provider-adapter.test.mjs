import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, appendFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CONFIGS, toGeminiSchema, toChatRequest, stripCodeFence, fromChatResponse,
  createProviderTransport, usageCosts, isDeepSeekPeak } from './provider-adapter.mjs';
import { main } from '../test-v5-provider-compare-gongsun.mjs';
const gemini = CONFIGS['gemini-3.8-flash-medium'], deepseek = CONFIGS['deepseek-flash-low'];
const request = () => ({ instructions: '지시', input: [{ content: [{ type: 'input_text', text: '첫째' }] },
  { content: [{ type: 'input_text', text: '둘째' }] }], text: { format: { name: 'sample', schema: { $schema: 'draft', type: 'object', properties: { mode: { const: 'SELECTION' } } } } } });
const rawResponse = (content = '{}') => ({ id: 'response-1', model: 'actual-version', choices: [{ finish_reason: 'stop', message: { content, reasoning_content: 'PRIVATE' } }],
  usage: { prompt_tokens: 100, completion_tokens: 20, prompt_cache_hit_tokens: 30, prompt_tokens_details: { cached_tokens: 40 }, completion_tokens_details: { reasoning_tokens: 5 } } });
const http = raw => ({ ok: true, status: 200, json: async () => raw });

test('messages preserve input_text order and reject images without mutation', () => {
  const req = request(), before = structuredClone(req), chat = toChatRequest(req, gemini);
  assert.deepEqual(chat.messages, [{ role: 'system', content: '지시' }, { role: 'user', content: '첫째\n\n둘째' }]);
  assert.deepEqual(req, before); assert.equal(chat.max_tokens, 16000); assert.equal(chat.reasoning_effort, 'medium');
  assert.equal(chat.response_format.json_schema.strict, true);
  req.input[0].content.push({ type: 'input_image', image_url: 'fake' });
  assert.throws(() => toChatRequest(req, gemini), /RUN_LIMIT: input_image/u);
});
test('DeepSeek exact schema appendix, thinking, low and high', () => {
  for (const config of [deepseek, CONFIGS['deepseek-flash-high']]) {
    const req = request(), chat = toChatRequest(req, config);
    assert.equal(chat.messages[0].content, '지시\n\n## 출력 형식\n아래 JSON Schema를 따르는 JSON 객체 하나만 출력한다. 코드 블록 표시나 설명을 붙이지 않는다.\n' + JSON.stringify(req.text.format.schema));
    assert.deepEqual(chat.response_format, { type: 'json_object' }); assert.deepEqual(chat.thinking, { type: 'enabled' });
    assert.equal(chat.max_tokens, 32000); assert.equal(chat.reasoning_effort, config.reasoningEffort);
  }
});
test('Gemini recursive schema conversion preserves other keywords', () => {
  const schema = { $schema: 'draft', type: 'object', additionalProperties: false,
    properties: { a: { anyOf: [{ const: null }, { type: 'array', items: { const: 'x', description: 'text' } }] } } };
  const before = structuredClone(schema), after = toGeminiSchema(schema);
  assert.deepEqual(after, { type: 'object', additionalProperties: false, properties: { a: { anyOf: [{ enum: [null] }, { type: 'array', items: { enum: ['x'], description: 'text' } }] } } });
  assert.deepEqual(schema, before);
});
test('strip only whitespace and whole JSON fences', () => {
  for (const value of ['  {"a":1}  ', '```json\n{"a":1}\n```', '```\n{"a":1}\n```']) assert.equal(stripCodeFence(value), '{"a":1}');
  for (const value of ['prefix ```json\n{}\n```', '{"a": 1,}', '```python\n{}\n```']) assert.equal(stripCodeFence(value), value);
});
test('status mapping, actual model and id, provider usage, reasoning privacy', () => {
  for (const [finish, status] of [['stop', 'completed'], ['length', 'incomplete'], ['content_filter', 'content_filter']]) {
    const raw = rawResponse(); raw.choices[0].finish_reason = finish;
    for (const config of [gemini, deepseek]) {
      const out = fromChatResponse(raw, config, 200);
      assert.equal(out.status, status); assert.equal(out.model, raw.model); assert.equal(out.id, raw.id);
      assert.equal(out.usage.input_tokens_details.cached_tokens, config === gemini ? 40 : 30);
      assert.equal(out.usage.output_tokens_details.reasoning_tokens, 5);
      assert.deepEqual(out.rawUsage, { httpStatus: 200, usage: raw.usage }); assert.equal(out.reasoningContentLength, 7);
      assert.doesNotMatch(JSON.stringify(out), /PRIVATE|reasoning_content/u);
    }
  }
  const raw = rawResponse(); raw.usage = { prompt_tokens: 1, completion_tokens: 2 };
  assert.deepEqual(fromChatResponse(raw, gemini, 200).usage, { input_tokens: 1, input_tokens_details: { cached_tokens: 0 }, output_tokens: 2, output_tokens_details: { reasoning_tokens: null, reasoningTokensInferredFromTotal: false } });
});
test('injected fetch receives endpoint, authorization, timeout; no adapter retry', async () => {
  let calls = 0;
  const transport = createProviderTransport({ config: gemini, apiKey: 'fake', fetchImpl: async (url, options) => {
    calls++; assert.equal(url, gemini.endpoint); assert.equal(options.headers.Authorization, 'Bearer fake');
    assert.ok(options.signal instanceof AbortSignal); assert.deepEqual(JSON.parse(options.body), toChatRequest(request(), gemini));
    return http(rawResponse());
  } });
  assert.equal((await transport.create(request(), { timeout: 5000 })).status, 'completed'); assert.equal(calls, 1);
});
test('HTTP 4xx except 429 stops retries; body limited to 300 characters', async () => {
  for (const status of [400, 401, 408, 429, 500]) {
    let calls = 0;
    const transport = createProviderTransport({ config: deepseek, apiKey: 'fake', fetchImpl: async () => {
      calls++; return { ok: false, status, text: async () => 'x'.repeat(400) };
    } });
    await assert.rejects(transport.create(request(), { timeout: 1000 }), e => {
      assert.equal(e.message.startsWith('RUN_LIMIT:'), status < 500 && status !== 429);
      assert.equal(e.message.split(': ').at(-1).length, 300); assert.equal(e.httpStatus, status); return true;
    }); assert.equal(calls, 1);
  }
});
test('peak windows use UTC weekdays and half-open endpoints', () => {
  for (const [time, peak] of [['00:59:59', false], ['01:00:00', true], ['03:59:59', true], ['04:00:00', false], ['06:00:00', true], ['09:59:59', true], ['10:00:00', false]]) {
    assert.equal(isDeepSeekPeak(`2026-10-07T${time}Z`), peak);
  }
  assert.equal(isDeepSeekPeak('2026-10-10T02:00:00Z'), false);
  assert.equal(isDeepSeekPeak('2026-10-11T07:00:00Z'), false);
});
test('official rates, caching, off-peak, separate reasoning and unknown usage', () => {
  const u = { input_tokens: 1000000, input_tokens_details: { cached_tokens: 200000 }, output_tokens: 1000000, output_tokens_details: { reasoning_tokens: 1000000 } };
  const peak = usageCosts(u, 'deepseek', '2026-10-07T02:00:00Z');
  assert.equal(peak.conservativeUsd, 1.4412); assert.equal(peak.actualUsd, 1.4412);
  assert.equal(peak.costIfReasoningSeparate.conservativeUsd, 2.6412);
  assert.equal(usageCosts(u, 'deepseek', '2026-10-07T04:00:00Z').actualUsd, 0.7206);
  assert.equal(usageCosts(u, 'gemini', '2026-10-07T04:00:00Z').actualUsd, 4.5);
  assert.equal(usageCosts(null, 'gemini', ''), null);
  delete u.output_tokens_details; assert.equal(usageCosts(u, 'gemini', '2026-10-07').costIfReasoningSeparate, null);
});

function fakeAssessment(input) {
  const quote = input.observations[0].command.rationale.text;
  return { mode: 'SELECTION', boundary: 'NONE', reason: '학생 발화를 대조했다.', reconstructability: 'RECONSTRUCTABLE',
    reconstructedPath: [quote], rationaleImpliedVerdict: 'INVALID', contentAssessment: 'SUPPORTED',
    studentEvidence: [{ observationId: 'o1', quote }],
    sourceEvidence: [{ location: 'SCENARIO', quote: input.source.scenario, mediaId: null, visualObservation: null }],
    errors: [], selectionMismatchQuestion: null, coaching: '원문과 판단 근거를 확인했습니다.',
    studentClaims: [{ observationId: 'o1', quote, claimAsStated: quote, sourceCheck: 'CONSISTENT', sourceBasis: '원문 대조' }] };
}
for (const config of Object.keys(CONFIGS)) test(`${config}: fake fetch full run, fence, schema retry, zero-request resume, pending ledger`, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'provider-compare-'));
  try {
    const a = await main({ dir }), b = await main({ dir }); assert.equal(a.frozenHash, b.frozenHash);
    let calls = 0;
    const fetchImpl = async (_url, options) => {
      const chat = JSON.parse(options.body), input = JSON.parse(chat.messages[1].content.split('\n\n')[0]);
      const output = fakeAssessment(input); calls++;
      if (calls === 2) delete output.reason;
      const text = JSON.stringify(output);
      return http(rawResponse(calls === 1 ? '```json\n' + text + '\n```' : text));
    };
    const result = await main({ mode: 'run', config, dir, apiKey: 'fake', fetchImpl });
    assert.equal(result.completedCells, 33); assert.equal(result.newRequests, 34); assert.equal(result.evaluationErrors, 0);
    assert.deepEqual(result.formatErrors, { JSON_PARSE: 0, OPERATING_SCHEMA: 1, CLAIMS_CONTRACT: 0 }); assert.equal(result.retries, 1);
    assert.equal(result.tokens.input, 3400); assert.equal(result.tokens.output, 680);
    assert.deepEqual(result.actualModels, ['actual-version']);
    const first = JSON.parse(readFileSync(`${dir}/${config}/S1-r1.json`, 'utf8'));
    assert.equal(first.retryCount, 0); assert.equal(first.requests.length, 1);
    const resumed = await main({ mode: 'run', config, dir, apiKey: 'fake', fetchImpl: () => { throw new Error('unexpected fetch'); } });
    assert.equal(resumed.newRequests, 0); assert.equal(calls, 34);
    const ledger = readFileSync(`${dir}/${config}/requests.jsonl`, 'utf8');
    assert.doesNotMatch(ledger, /PRIVATE|reasoning_content/u);
    assert.equal(ledger.trim().split('\n').length, 68);
    appendFileSync(`${dir}/${config}/requests.jsonl`, JSON.stringify({ event: 'START', requestId: 'unresolved' }) + '\n');
    await assert.rejects(main({ mode: 'run', config, dir, apiKey: 'fake', fetchImpl }), /START without END/u);
  } finally { rmSync(dir, { recursive: true, force: true }); assert.equal(existsSync(dir), false); }
});

test('fake run distinguishes JSON parsing and claim errors and counts their usage', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'provider-errors-'));
  try {
    await main({ dir }); let calls = 0;
    const result = await main({ mode: 'run', config: 'deepseek-flash-low', dir, apiKey: 'fake', fetchImpl: async (_url, options) => {
      const input = JSON.parse(JSON.parse(options.body).messages[1].content.split('\n\n')[0]);
      const output = fakeAssessment(input); calls++;
      if (calls === 1) return http(rawResponse('{invalid'));
      if (calls === 3) output.studentClaims[0].quote = '발화 밖 인용';
      return http(rawResponse(JSON.stringify(output)));
    } });
    assert.equal(result.newRequests, 35); assert.equal(result.evaluationErrors, 0); assert.equal(result.retries, 2);
    assert.deepEqual(result.formatErrors, { JSON_PARSE: 1, OPERATING_SCHEMA: 0, CLAIMS_CONTRACT: 1 });
    assert.equal(result.tokens.input, 3500);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fake HTTP 400 stops after one request and keeps unknown cost reservation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'provider-http-'));
  try {
    await main({ dir }); let calls = 0;
    const result = await main({ mode: 'run', config: 'gemini-3.8-flash-medium', dir, apiKey: 'fake', fetchImpl: async () => {
      calls++; return { ok: false, status: 400, text: async () => 'unsupported' };
    } });
    assert.equal(calls, 1); assert.equal(result.newRequests, 1); assert.equal(result.completedCells, 0);
    assert.match(result.stop, /RUN_LIMIT: HTTP 400/u); assert.ok(result.unknownReservedUsd > 0);
    const records = readFileSync(`${dir}/gemini-3.8-flash-medium/requests.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(records[1].rawUsage.httpStatus, 400);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('request and cost ceilings prevent fetch', async () => {
  for (const reason of ['requests', 'cost']) {
    const dir = mkdtempSync(join(tmpdir(), 'provider-cap-'));
    try {
      await main({ dir });
      // Create the config directory using the real run with a permanent HTTP error, then replace its ledger.
      await main({ mode: 'run', config: 'deepseek-flash-high', dir, apiKey: 'fake', fetchImpl: async () => ({ ok: false, status: 400, text: async () => 'fake' }) });
      const { writeFileSync } = await import('node:fs');
      const entries = Array.from({ length: reason === 'requests' ? 80 : 1 }, (_, i) => [
        { event: 'START', requestId: String(i), reservedUsd: 0.1 },
        { event: 'END', requestId: String(i), durationMs: 1, costs: { conservativeUsd: reason === 'cost' ? 1.5 : 0, actualUsd: 0 } },
      ]).flat();
      writeFileSync(`${dir}/deepseek-flash-high/requests.jsonl`, entries.map(JSON.stringify).join('\n') + '\n');
      const result = await main({ mode: 'run', config: 'deepseek-flash-high', dir, apiKey: 'fake', fetchImpl: () => { throw new Error('unexpected fetch'); } });
      assert.equal(result.newRequests, 0); assert.match(result.stop, /request\/cost limit/u);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('gemini hidden thinking tokens are billed as output (preflight 2026-10-08 shape)', () => {
  const r = fromChatResponse({ choices: [{ finish_reason: 'stop', message: { content: '{"answer":5}' } }], model: 'gemini-3.8-flash',
    usage: { completion_tokens: 5, prompt_tokens: 21, total_tokens: 214 } }, CONFIGS['gemini-3.8-flash-medium'], 200);
  assert.equal(r.usage.output_tokens, 193); assert.equal(r.usage.output_tokens_details.reasoning_tokens, 188);
  assert.equal(r.usage.output_tokens_details.reasoningTokensInferredFromTotal, true);
  const d = fromChatResponse({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }], model: 'deepseek-flash',
    usage: { completion_tokens: 41, prompt_tokens: 139, total_tokens: 180, completion_tokens_details: { reasoning_tokens: 35 }, prompt_cache_hit_tokens: 0 } }, CONFIGS['deepseek-flash-high'], 200);
  assert.equal(d.usage.output_tokens, 41); assert.equal(d.usage.output_tokens_details.reasoningTokensInferredFromTotal, false);
});
