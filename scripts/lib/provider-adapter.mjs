// Provider wire conversion only. No SDK, environment reads, or implicit retries.
export const CONFIGS = {
  'gemini-3.8-flash-medium': { provider: 'gemini', model: 'gemini-3.8-flash', reasoningEffort: 'medium',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', keyEnv: 'GEMINI_API_KEY', maxTokens: 16000 },
  'deepseek-flash-low': { provider: 'deepseek', model: 'deepseek-flash', reasoningEffort: 'low',
    endpoint: 'https://api.deepseek.com/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', maxTokens: 32000 },
  'deepseek-flash-high': { provider: 'deepseek', model: 'deepseek-flash', reasoningEffort: 'high',
    endpoint: 'https://api.deepseek.com/chat/completions', keyEnv: 'DEEPSEEK_API_KEY', maxTokens: 32000 },
};
export const PRICES = {
  gemini: { input: 0.75, cached: 0.75, output: 3.75 },
  deepseek: { input: 0.30, cached: 0.006, output: 1.20 },
  deepseekOffPeak: { input: 0.15, cached: 0.003, output: 0.60 },
};
export const GEMINI_SCHEMA_RULE = 'Recursively remove $schema and replace const: x with enum: [x]; preserve all other keywords.';
export function toGeminiSchema(value) {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== '$schema')
    .map(([k, v]) => k === 'const' ? ['enum', [structuredClone(v)]] : [k, toGeminiSchema(v)]));
}
export function toChatRequest(request, config) {
  const texts = [];
  for (const item of request.input ?? []) for (const part of item.content ?? []) {
    if (part.type === 'input_image') throw new Error('RUN_LIMIT: input_image is not supported');
    if (part.type !== 'input_text') throw new Error(`RUN_LIMIT: unsupported input type ${part.type}`);
    texts.push(part.text);
  }
  const { name, schema } = request.text.format;
  const deepseek = config.provider === 'deepseek';
  return { model: config.model, reasoning_effort: config.reasoningEffort, max_tokens: config.maxTokens,
    ...(deepseek ? { thinking: { type: 'enabled' } } : {}),
    messages: [{ role: 'system', content: request.instructions + (deepseek
      ? '\n\n## 출력 형식\n아래 JSON Schema를 따르는 JSON 객체 하나만 출력한다. 코드 블록 표시나 설명을 붙이지 않는다.\n' + JSON.stringify(schema) : '') },
    { role: 'user', content: texts.join('\n\n') }],
    response_format: deepseek ? { type: 'json_object' }
      : { type: 'json_schema', json_schema: { name, schema: toGeminiSchema(schema), strict: true } } };
}
export function stripCodeFence(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n?```$/u, '$1').trim();
}
export function fromChatResponse(raw, config, httpStatus) {
  const choice = raw.choices?.[0], usage = raw.usage;
  return { output_text: stripCodeFence(choice?.message?.content),
    status: choice?.finish_reason === 'stop' ? 'completed' : choice?.finish_reason === 'length' ? 'incomplete' : choice?.finish_reason,
    model: raw.model, id: raw.id, finishReason: choice?.finish_reason,
    usage: usage ? { input_tokens: usage.prompt_tokens,
      input_tokens_details: { cached_tokens: (config.provider === 'deepseek' ? usage.prompt_cache_hit_tokens : usage.prompt_tokens_details?.cached_tokens) ?? 0 },
      // Gemini OpenAI 호환 응답은 생각(thinking) 토큰을 completion_tokens에 넣지 않고 total_tokens에만 반영한다(2026-10-08 preflight 확인).
      // 생각 토큰은 출력으로 과금되므로 출력 = total - prompt로 보고, 차이를 reasoning_tokens(추정)로 기록한다.
      output_tokens: geminiHiddenThinking(usage, config) === null ? usage.completion_tokens : usage.total_tokens - usage.prompt_tokens,
      output_tokens_details: { reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? geminiHiddenThinking(usage, config),
        reasoningTokensInferredFromTotal: geminiHiddenThinking(usage, config) !== null } } : null,
    rawUsage: { httpStatus, usage: usage ?? null },
    reasoningContentLength: choice?.message?.reasoning_content?.length ?? 0 };
}
function geminiHiddenThinking(usage, config) {
  if (config.provider !== 'gemini' || usage.completion_tokens_details?.reasoning_tokens != null) return null;
  const hidden = (usage.total_tokens ?? 0) - (usage.prompt_tokens ?? 0) - (usage.completion_tokens ?? 0);
  return hidden > 0 ? hidden : null;
}
export function createProviderTransport({ config, apiKey, fetchImpl = globalThis.fetch }) {
  return { async create(request, options) {
    if (!apiKey) throw new Error(`RUN_LIMIT: missing ${config.keyEnv}`);
    const response = await fetchImpl(config.endpoint, { method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(toChatRequest(request, config)), signal: AbortSignal.timeout(options.timeout) });
    if (!response.ok) {
      const error = new Error(`${response.status >= 400 && response.status < 500 && response.status !== 429 ? 'RUN_LIMIT: ' : ''}HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
      error.httpStatus = response.status;
      throw error;
    }
    return fromChatResponse(await response.json(), config, response.status);
  } };
}
export function isDeepSeekPeak(utc) {
  const date = new Date(utc);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid request time');
  const day = date.getUTCDay(), hour = date.getUTCHours();
  return day >= 1 && day <= 5 && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
}
export function usageCosts(usage, provider, utc) {
  if (!usage || !Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return null;
  const cached = usage.input_tokens_details?.cached_tokens ?? 0;
  const reasoning = usage.output_tokens_details?.reasoning_tokens ?? null;
  const peak = provider === 'deepseek' ? isDeepSeekPeak(utc) : null;
  const conservative = PRICES[provider], actual = provider === 'deepseek' && !peak ? PRICES.deepseekOffPeak : conservative;
  const cost = (prices, extra = 0) => ((usage.input_tokens - cached) * prices.input + cached * prices.cached
    + (usage.output_tokens + extra) * prices.output) / 1e6;
  return { conservativeUsd: cost(conservative), actualUsd: cost(actual), peak,
    costIfReasoningSeparate: reasoning === null ? null : { conservativeUsd: cost(conservative, reasoning), actualUsd: cost(actual, reasoning) } };
}
