import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { recordMetric } from '../llm/client.js';
import {
  SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION,
  SOURCE_DIRECT_PROBLEM_PROMPT_VERSION,
  SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION,
  SOURCE_TEXT_ANNOTATION_GUIDE,
  SourceDirectDiagnosticOutputSchema,
  SourceDirectProblemEvaluatorInputSchema,
  SourceDirectRationaleOutputSchema,
  assertNoStructuredProblemGold,
  validateSourceDirectProblemEvaluatorOutput,
  type SourceDirectProblemEvaluatorInput,
  type SourceDirectProblemEvaluatorOutput,
  type SourceDirectProblemPromptVersion,
} from './source-direct-evaluator.js';

export const DEFAULT_SOURCE_DIRECT_PROBLEM_MODEL = 'gpt-5.6-terra';

export type SourceDirectProblemEvaluatorEffort =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';

export interface SourceDirectProblemEvaluatorCallMetadata {
  readonly provider: 'openai' | 'mock';
  readonly model: string;
  readonly effort: SourceDirectProblemEvaluatorEffort;
  readonly promptVersion: SourceDirectProblemPromptVersion;
  readonly schemaVersion: typeof SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly attempts: readonly {
    readonly attempt: number;
    readonly outcome: 'success' | 'error';
    readonly durationMs: number;
    readonly errorType?: string;
    readonly usage?: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cacheReadTokens?: number;
    };
  }[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens?: number;
  };
}

export interface SourceDirectProblemEvaluatorCall {
  readonly result: SourceDirectProblemEvaluatorOutput;
  readonly rawOutput: unknown;
  readonly call: SourceDirectProblemEvaluatorCallMetadata;
}

export interface SourceDirectProblemEvaluator {
  evaluate(input: SourceDirectProblemEvaluatorInput): Promise<SourceDirectProblemEvaluatorCall>;
}

interface TransportResponse {
  readonly outputParsed: unknown;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens?: number;
  };
}

export interface SourceDirectProblemEvaluatorTransport {
  parse(options: {
    readonly model: string;
    readonly effort: SourceDirectProblemEvaluatorEffort;
    readonly instructions: string;
    readonly input: SourceDirectProblemEvaluatorInput;
    readonly timeoutMs: number;
    readonly maxOutputTokens: number;
  }): Promise<TransportResponse>;
}

function loadPrompt(version: SourceDirectProblemPromptVersion): string {
  const fileName = version === SOURCE_DIRECT_PROBLEM_V3_PROMPT_VERSION
    ? 'source-direct-problem-dialogue-prompt-v3.md'
    : 'source-direct-problem-dialogue-prompt-v2.md';
  return readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/experiments/problem-solving',
    fileName,
  ), 'utf8').trim();
}

function placementLabel(
  placement: SourceDirectProblemEvaluatorInput['source']['media'][number]['placement'],
): string {
  if (placement.scope === 'PASSAGE') {
    return placement.elementIndex === undefined
      ? 'PASSAGE'
      : `PASSAGE element ${placement.elementIndex}`;
  }
  if (placement.scope === 'SCENARIO') {
    return placement.elementIndex === undefined
      ? `SCENARIO[${placement.supplementIndex}]`
      : `SCENARIO[${placement.supplementIndex}] element ${placement.elementIndex}`;
  }
  return placement.elementIndex === undefined
    ? `CHOICE ${placement.choiceId}`
    : `CHOICE ${placement.choiceId} element ${placement.elementIndex}`;
}

/** JSON 원문 다음에 각 원자료 이미지를 ID·소속 표지와 일대일로 붙인다. */
export function createSourceDirectProblemRequestContent(
  input: SourceDirectProblemEvaluatorInput,
): Array<Record<string, unknown>> {
  const textInput = {
    ...input,
    ...(input.source.textAnnotations?.length ? { sourceTextAnnotationGuide: SOURCE_TEXT_ANNOTATION_GUIDE } : {}),
    source: {
      ...input.source,
      media: input.source.media.map(({ url: _url, ...media }) => media),
    },
  };
  const content: Array<Record<string, unknown>> = [{
    type: 'input_text',
    text: JSON.stringify(textInput),
  }];
  for (const media of input.source.media) {
    content.push({
      type: 'input_text',
      text: `[SOURCE_MEDIA ${media.mediaId} | ${placementLabel(media.placement)}]`,
    });
    content.push({
      type: 'input_image',
      image_url: media.url,
      detail: 'high',
    });
  }
  return content;
}

class OpenAISourceDirectProblemTransport implements SourceDirectProblemEvaluatorTransport {
  private client: OpenAI | undefined;

  async parse(options: Parameters<SourceDirectProblemEvaluatorTransport['parse']>[0]): Promise<TransportResponse> {
    this.client ??= new OpenAI({ maxRetries: 0 });
    assertNoStructuredProblemGold(options.input);
    const outputSchema = options.input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
      ? SourceDirectRationaleOutputSchema
      : SourceDirectDiagnosticOutputSchema;
    const content = createSourceDirectProblemRequestContent(options.input);
    const response = await this.client.responses.create({
      model: options.model,
      instructions: options.instructions,
      input: [{ role: 'user', content }] as never,
      reasoning: { effort: options.effort },
      max_output_tokens: options.maxOutputTokens,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'source_direct_problem_evaluator_output',
          strict: true,
          schema: z.toJSONSchema(outputSchema),
        },
      },
    }, { timeout: options.timeoutMs, maxRetries: 0 });
    let outputParsed: unknown = response.output_text;
    try {
      outputParsed = JSON.parse(response.output_text);
    } catch {
      // 계약 경계에서 원시 출력을 보존한 채 파싱 오류로 처리한다.
    }
    return {
      outputParsed,
      ...(response.usage === undefined
        ? {}
        : {
            usage: {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              ...(response.usage.input_tokens_details.cached_tokens === 0
                ? {}
                : { cacheReadTokens: response.usage.input_tokens_details.cached_tokens }),
            },
          }),
    };
  }
}

function errorType(error: unknown): string {
  if (error instanceof SourceDirectProblemContractValidationError) return 'contract_validation';
  if (error instanceof OpenAI.APIError) return `http_${error.status ?? 'unknown'}`;
  if (error instanceof Error && /timeout/i.test(error.name + error.message)) return 'timeout';
  if (error instanceof Error) return error.name || 'error';
  return 'unknown';
}

class SourceDirectProblemContractValidationError extends Error {
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'SourceDirectProblemContractValidationError';
    this.cause = cause;
  }
}

function retryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === 408 || error.status === 409 || error.status === 429 ||
      (error.status !== undefined && error.status >= 500);
  }
  return error instanceof Error && /timeout|connection|socket|network/i.test(error.name + error.message);
}

export class SourceDirectProblemEvaluatorError extends Error {
  readonly call: SourceDirectProblemEvaluatorCallMetadata;
  override readonly cause: unknown;
  readonly rawOutput: unknown;

  constructor(
    cause: unknown,
    call: SourceDirectProblemEvaluatorCallMetadata,
    rawOutput?: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'SourceDirectProblemEvaluatorError';
    this.cause = cause;
    this.call = structuredClone(call);
    this.rawOutput = structuredClone(rawOutput);
  }
}

export interface OpenAISourceDirectProblemEvaluatorOptions {
  readonly model?: string;
  readonly effort?: SourceDirectProblemEvaluatorEffort;
  readonly timeoutMs?: number;
  readonly maxOutputTokens?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly promptVersion?: SourceDirectProblemPromptVersion;
  readonly transport?: SourceDirectProblemEvaluatorTransport;
  readonly now?: () => Date;
  readonly monotonicNow?: () => number;
}

export class OpenAISourceDirectProblemEvaluator implements SourceDirectProblemEvaluator {
  private readonly model: string;
  private readonly effort: SourceDirectProblemEvaluatorEffort;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly promptVersion: SourceDirectProblemPromptVersion;
  private readonly transport: SourceDirectProblemEvaluatorTransport;
  private readonly now: () => Date;
  private readonly monotonicNow: () => number;

  constructor(options: OpenAISourceDirectProblemEvaluatorOptions = {}) {
    this.model = options.model ?? process.env['SOURCE_DIRECT_PROBLEM_MODEL'] ??
      DEFAULT_SOURCE_DIRECT_PROBLEM_MODEL;
    this.effort = options.effort ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxOutputTokens = options.maxOutputTokens ?? 5_000;
    this.maxRetries = options.maxRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.promptVersion = options.promptVersion ?? SOURCE_DIRECT_PROBLEM_PROMPT_VERSION;
    this.transport = options.transport ?? new OpenAISourceDirectProblemTransport();
    this.now = options.now ?? (() => new Date());
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
  }

  async evaluate(inputValue: SourceDirectProblemEvaluatorInput): Promise<SourceDirectProblemEvaluatorCall> {
    const input = SourceDirectProblemEvaluatorInputSchema.parse(inputValue);
    assertNoStructuredProblemGold(input);
    if (input.promptVersion !== this.promptVersion) {
      throw new Error(
        `원문 직접 evaluator 프롬프트 버전 불일치: input=${input.promptVersion}, evaluator=${this.promptVersion}`,
      );
    }
    const calledAt = this.now().toISOString();
    const started = this.monotonicNow();
    const attempts: SourceDirectProblemEvaluatorCallMetadata['attempts'][number][] = [];
    const totalUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    const metadata = (): SourceDirectProblemEvaluatorCallMetadata => ({
      provider: 'openai',
      model: this.model,
      effort: this.effort,
      promptVersion: this.promptVersion,
      schemaVersion: SOURCE_DIRECT_PROBLEM_EVALUATOR_OUTPUT_VERSION,
      calledAt,
      durationMs: Math.round(this.monotonicNow() - started),
      attempts,
      usage: {
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        ...(totalUsage.cacheReadTokens === 0
          ? {}
          : { cacheReadTokens: totalUsage.cacheReadTokens }),
      },
    });

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      const attemptStarted = this.monotonicNow();
      let attemptUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
      let attemptRawOutput: unknown;
      try {
        const response = await this.transport.parse({
          model: this.model,
          effort: this.effort,
          instructions: loadPrompt(this.promptVersion),
          input,
          timeoutMs: this.timeoutMs,
          maxOutputTokens: this.maxOutputTokens,
        });
        attemptRawOutput = response.outputParsed;
        attemptUsage = {
          inputTokens: response.usage?.inputTokens ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          cacheReadTokens: response.usage?.cacheReadTokens ?? 0,
        };
        totalUsage.inputTokens += attemptUsage.inputTokens;
        totalUsage.outputTokens += attemptUsage.outputTokens;
        totalUsage.cacheReadTokens += attemptUsage.cacheReadTokens;
        let result: SourceDirectProblemEvaluatorOutput;
        try {
          result = validateSourceDirectProblemEvaluatorOutput(response.outputParsed, input);
        } catch (validationError) {
          throw new SourceDirectProblemContractValidationError(validationError);
        }
        const durationMs = Math.round(this.monotonicNow() - attemptStarted);
        attempts.push({
          attempt,
          outcome: 'success',
          durationMs,
          usage: {
            inputTokens: attemptUsage.inputTokens,
            outputTokens: attemptUsage.outputTokens,
            ...(attemptUsage.cacheReadTokens === 0
              ? {}
              : { cacheReadTokens: attemptUsage.cacheReadTokens }),
          },
        });
        recordMetric({
          ts: this.now().toISOString(),
          op: 'problem-solving-evaluator',
          model: this.model,
          effort: this.effort,
          paragraphId: input.source.passageId,
          inputTokens: attemptUsage.inputTokens,
          outputTokens: attemptUsage.outputTokens,
          ...(attemptUsage.cacheReadTokens === 0
            ? {}
            : { cacheReadTokens: attemptUsage.cacheReadTokens }),
          ms: durationMs,
          attempt,
        });
        return { result, rawOutput: structuredClone(response.outputParsed), call: metadata() };
      } catch (error) {
        const durationMs = Math.round(this.monotonicNow() - attemptStarted);
        attempts.push({
          attempt,
          outcome: 'error',
          durationMs,
          errorType: errorType(error),
          usage: {
            inputTokens: attemptUsage.inputTokens,
            outputTokens: attemptUsage.outputTokens,
            ...(attemptUsage.cacheReadTokens === 0
              ? {}
              : { cacheReadTokens: attemptUsage.cacheReadTokens }),
          },
        });
        if (attempt <= this.maxRetries && retryable(error)) {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
          continue;
        }
        throw new SourceDirectProblemEvaluatorError(error, metadata(), attemptRawOutput);
      }
    }
    throw new Error('원문 직접 문제 evaluator가 결과 없이 종료됐다.');
  }
}
