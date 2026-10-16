import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { checkSimpleOutput } from './rules.js';
import { PARAGRAPH_SIMPLE_PROMPT_VERSION, SimpleOutputSchema, type SimpleEvaluationInput, type SimpleOutput } from './schema.js';

export interface SimpleCallMetadata {
  provider: 'openai' | 'mock'; model: string; promptVersion: string; durationMs: number;
  inputTokens: number; outputTokens: number; cachedTokens: number;
}
export interface SimpleModelCall { rawOutput: unknown; metadata: SimpleCallMetadata }
/** 모델 한 번 호출. 검증·재요청은 `evaluateSimple`이 맡는다. 테스트는 이 인터페이스의 모의 구현을 주입한다. */
export interface SimpleEvaluator { complete(input: SimpleEvaluationInput): Promise<SimpleModelCall> }

export interface SimpleEvaluationResult {
  output: SimpleOutput;
  /** 단계 하나의 호출 합계(재요청 포함). */
  call: SimpleCallMetadata & { attempts: number };
  /** 검증에 실패해 버려진 원출력과 이유. */
  validationFailures: { rawOutput: unknown; problems: string[] }[];
}
export class SimpleEvaluationError extends Error {
  constructor(message: string, readonly validationFailures: { rawOutput: unknown; problems: string[] }[]) { super(message); }
}

/** 검증 실패 시 이유를 담아 1회만 재요청한다. 그래도 실패하면 오류. API 오류·타임아웃은 재요청하지 않는다. */
export async function evaluateSimple(evaluator: SimpleEvaluator, input: SimpleEvaluationInput): Promise<SimpleEvaluationResult> {
  const failures: SimpleEvaluationResult['validationFailures'] = [];
  const calls: SimpleCallMetadata[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const request: SimpleEvaluationInput = failures.length
      ? { ...input, validationFeedback: failures.at(-1)!.problems.join('\n') } : input;
    let call: SimpleModelCall;
    try { call = await evaluator.complete(structuredClone(request)); }
    catch (error) { throw new SimpleEvaluationError(error instanceof Error ? error.message : String(error), failures); }
    calls.push(call.metadata);
    const { output, problems } = checkSimpleOutput(input, call.rawOutput);
    if (output && !problems.length) {
      const sum = (key: 'durationMs' | 'inputTokens' | 'outputTokens' | 'cachedTokens') => calls.reduce((n, c) => n + c[key], 0);
      return { output, validationFailures: failures, call: { ...call.metadata, durationMs: sum('durationMs'),
        inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), cachedTokens: sum('cachedTokens'), attempts: calls.length } };
    }
    failures.push({ rawOutput: call.rawOutput, problems });
  }
  throw new SimpleEvaluationError(`검증 2회 실패: ${failures.at(-1)!.problems.join(' / ')}`, failures);
}

export interface SimpleTransport {
  create(request: OpenAI.Responses.ResponseCreateParamsNonStreaming, options: { timeout: number; maxRetries: number }): Promise<{
    status: string; output_text: string;
    usage?: { input_tokens: number; output_tokens: number; input_tokens_details?: { cached_tokens: number } } | null;
  }>;
}
export const PARAGRAPH_SIMPLE_DEFAULT_MODEL = 'gpt-5.6-terra';
const PROMPT_PATH = 'packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v1.md';

export class OpenAISimpleEvaluator implements SimpleEvaluator {
  private client: OpenAI | undefined;
  constructor(private readonly options: { model?: string; timeoutMs?: number; maxOutputTokens?: number; transport?: SimpleTransport } = {}) {}
  async complete(input: SimpleEvaluationInput): Promise<SimpleModelCall> {
    const started = performance.now();
    const model = this.options.model ?? process.env['PARAGRAPH_SIMPLE_OPENAI_MODEL'] ?? PARAGRAPH_SIMPLE_DEFAULT_MODEL;
    const transport = this.options.transport ?? (this.client ??= new OpenAI({ maxRetries: 0 })).responses;
    const response = await transport.create({
      model, store: false, reasoning: { effort: 'medium' }, max_output_tokens: this.options.maxOutputTokens ?? 8000,
      instructions: readFileSync(resolve(process.cwd(), PROMPT_PATH), 'utf8'),
      input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }] as never,
      text: { format: { type: 'json_schema', name: 'paragraph_simple_holistic', strict: true, schema: z.toJSONSchema(SimpleOutputSchema) } },
    }, { timeout: this.options.timeoutMs ?? 60_000, maxRetries: 0 });
    if (response.status !== 'completed') throw new Error(`평가 응답 미완료: ${response.status}`);
    let raw: unknown = response.output_text;
    try { raw = JSON.parse(response.output_text); } catch { /* 검증이 스키마 위반으로 기록한다 */ }
    return { rawOutput: raw, metadata: { provider: 'openai', model, promptVersion: PARAGRAPH_SIMPLE_PROMPT_VERSION,
      durationMs: Math.round(performance.now() - started),
      inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0,
      cachedTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0 } };
  }
}
