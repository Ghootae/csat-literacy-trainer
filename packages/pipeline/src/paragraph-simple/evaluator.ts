import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod/v4';
import { detectSourceCopy } from './copy.js';
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
  /** 서버가 정한 원문 옮김 판정. INITIAL·RETRY만 값이 있고 그 밖은 null. */
  sourceCopyDetected: boolean | null;
}
export class SimpleEvaluationError extends Error {
  constructor(message: string, readonly validationFailures: { rawOutput: unknown; problems: string[] }[]) { super(message); }
}

/** 검증 실패 시 이유를 담아 1회만 재요청한다. 일시적 API 오류(408·409·429·5xx)도 1회 다시 묻는다. 재요청 한도는 둘이 공유해 전체 호출은 최대 2회. 그 밖의 오류·타임아웃은 즉시 오류. */
export async function evaluateSimple(evaluator: SimpleEvaluator, baseInput: SimpleEvaluationInput): Promise<SimpleEvaluationResult> {
  const input = withSourceCopy(baseInput);
  const failures: SimpleEvaluationResult['validationFailures'] = [];
  const calls: SimpleCallMetadata[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const request: SimpleEvaluationInput = failures.length
      ? { ...input, validationFeedback: failures.at(-1)!.problems.join('\n') } : input;
    let call: SimpleModelCall;
    try { call = await evaluator.complete(structuredClone(request)); }
    catch (error) {
      if (attempt === 0 && isTransientApiError(error)) continue;
      throw new SimpleEvaluationError(error instanceof Error ? error.message : String(error), failures); }
    calls.push(call.metadata);
    const { output, problems } = checkSimpleOutput(input, call.rawOutput);
    if (output && !problems.length) {
      const sum = (key: 'durationMs' | 'inputTokens' | 'outputTokens' | 'cachedTokens') => calls.reduce((n, c) => n + c[key], 0);
      return { output, validationFailures: failures, sourceCopyDetected: input.sourceCopyDetected ?? null, call: { ...call.metadata, durationMs: sum('durationMs'),
        inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), cachedTokens: sum('cachedTokens'), attempts: calls.length } };
    }
    failures.push({ rawOutput: call.rawOutput, problems });
  }
  throw new SimpleEvaluationError(`검증 2회 실패: ${failures.at(-1)!.problems.join(' / ')}`, failures);
}

function isTransientApiError(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  const status = error.status;
  return typeof status === 'number' && ([408, 409, 429].includes(status) || status >= 500);
}

/** INITIAL·RETRY의 마지막 학생 발화가 원문 옮겨 적기인지 서버가 정해 입력에 싣는다. 판정 검증이 COPY를 강제한다. */
export function withSourceCopy(input: SimpleEvaluationInput): SimpleEvaluationInput {
  if (input.stage !== 'INITIAL' && input.stage !== 'RETRY') return input;
  const last = input.dialogue.findLast(m => m.role === 'student');
  return { ...input, sourceCopyDetected: last ? detectSourceCopy(last.text, input.passage.paragraphs.map(p => p.text)) : false };
}

export interface SimpleTransport {
  create(request: OpenAI.Responses.ResponseCreateParamsNonStreaming, options: { timeout: number; maxRetries: number }): Promise<{
    status: string; output_text: string;
    usage?: { input_tokens: number; output_tokens: number; input_tokens_details?: { cached_tokens: number } } | null;
  }>;
}
// 운영 후보 판정 모델(D-0174). 환경변수 PARAGRAPH_SIMPLE_OPENAI_MODEL로만 바꾼다.
export const PARAGRAPH_SIMPLE_DEFAULT_MODEL = 'gpt-6-luna';
export const PARAGRAPH_SIMPLE_DEFAULT_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md';

/** 모델 요청용 JSON Schema. OpenAI strict는 모든 칸이 required여야 하므로 gaps.givesRelation은 v4.9 지시문일 때만 required로 넣고, 아니면 뺀다(v4.8 요청은 이전과 같다). */
export function simpleRequestJsonSchema(withGivesRelation: boolean): Record<string, unknown> {
  const schema = z.toJSONSchema(SimpleOutputSchema) as { properties: { gaps: { items: { properties: Record<string, unknown>; required: string[] } } } };
  const gap = schema.properties.gaps.items;
  if (withGivesRelation) gap.required = [...gap.required, 'givesRelation'];
  else delete gap.properties['givesRelation'];
  return schema;
}

export class OpenAISimpleEvaluator implements SimpleEvaluator {
  private client: OpenAI | undefined;
  constructor(private readonly options: { model?: string; timeoutMs?: number; maxOutputTokens?: number; transport?: SimpleTransport; promptPath?: string; promptVersion?: string } = {}) {}
  async complete(input: SimpleEvaluationInput): Promise<SimpleModelCall> {
    const started = performance.now();
    const model = this.options.model ?? process.env['PARAGRAPH_SIMPLE_OPENAI_MODEL'] ?? PARAGRAPH_SIMPLE_DEFAULT_MODEL;
    const transport = this.options.transport ?? (this.client ??= new OpenAI({ maxRetries: 0 })).responses;
    const response = await transport.create({
      model, store: false, reasoning: { effort: 'medium' }, max_output_tokens: this.options.maxOutputTokens ?? 8000,
      instructions: readFileSync(resolve(process.cwd(), this.options.promptPath ?? PARAGRAPH_SIMPLE_DEFAULT_PROMPT_PATH), 'utf8'),
      input: [{ role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] }] as never,
      text: { format: { type: 'json_schema', name: 'paragraph_simple_holistic', strict: true, schema: simpleRequestJsonSchema(/v4\.9/.test(`${this.options.promptVersion ?? ''} ${this.options.promptPath ?? ''}`)) } },
    }, { timeout: this.options.timeoutMs ?? 60_000, maxRetries: 0 });
    if (response.status !== 'completed') throw new Error(`평가 응답 미완료: ${response.status}`);
    let raw: unknown = response.output_text;
    try { raw = JSON.parse(response.output_text); } catch { /* 검증이 스키마 위반으로 기록한다 */ }
    return { rawOutput: raw, metadata: { provider: 'openai', model, promptVersion: this.options.promptVersion ?? PARAGRAPH_SIMPLE_PROMPT_VERSION,
      durationMs: Math.round(performance.now() - started),
      inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0,
      cachedTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0 } };
  }
}
