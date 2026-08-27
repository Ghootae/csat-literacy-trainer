import OpenAI from 'openai';
import { z } from 'zod/v4';

import { recordMetric, type CallMetric } from '../llm/client.js';
import {
  CorrectRationaleEvaluationOutputSchema,
  PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
  PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
  ProblemPathDiagnosticOutputSchema,
  loadProblemPathDiagnosticPrompt,
  resolveProblemPathEvaluatorIds,
  type ProblemPathEvaluatorOutput,
} from './path-evaluator.js';
import {
  ProblemPathEvaluatorInputSchema,
  validateProblemPathEvaluatorOutput,
  type ProblemPathEvaluatorInput,
} from './path-evaluator-input.js';

export const DEFAULT_PROBLEM_PATH_OPENAI_MODEL = 'gpt-5.6-terra';

export type ProblemPathEvaluatorEffort =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';

export interface ProblemPathEvaluatorCallMetadata {
  readonly provider: 'openai' | 'mock';
  readonly model: string;
  readonly effort: ProblemPathEvaluatorEffort;
  readonly promptVersion: typeof PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION;
  readonly schemaVersion: typeof PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly attempts: readonly {
    readonly attempt: number;
    readonly outcome: 'success' | 'error';
    readonly durationMs: number;
    readonly errorType?: string;
  }[];
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens?: number;
  };
}

export interface ProblemPathEvaluatorCall {
  readonly result: ProblemPathEvaluatorOutput;
  /** 계약 오류 감사와 프롬프트 회귀를 위해 공급자 원출력을 별도 보존한다. */
  readonly rawOutput: unknown;
  readonly call: ProblemPathEvaluatorCallMetadata;
}

export interface ProblemPathEvaluator {
  evaluate(input: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall>;
}

interface ParsedTransportResponse {
  readonly outputParsed: unknown;
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens?: number;
  };
}

export interface ProblemPathEvaluatorTransport {
  parse(options: {
    readonly model: string;
    readonly effort: ProblemPathEvaluatorEffort;
    readonly instructions: string;
    readonly input: string;
    readonly mode: ProblemPathEvaluatorInput['evaluationMode'];
    readonly timeoutMs: number;
  }): Promise<ParsedTransportResponse>;
}

class OpenAIProblemPathTransport implements ProblemPathEvaluatorTransport {
  private client: OpenAI | undefined;

  async parse(options: Parameters<ProblemPathEvaluatorTransport['parse']>[0]): Promise<ParsedTransportResponse> {
    this.client ??= new OpenAI({ maxRetries: 0 });
    const outputSchema = options.mode === 'ASSESS_CORRECT_RATIONALE'
      ? CorrectRationaleEvaluationOutputSchema
      : ProblemPathDiagnosticOutputSchema;
    const response = await this.client.responses.create({
      model: options.model,
      instructions: options.instructions,
      input: options.input,
      reasoning: { effort: options.effort },
      max_output_tokens: 8000,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'problem_path_evaluator_output',
          strict: true,
          schema: z.toJSONSchema(outputSchema),
        },
      },
    }, { timeout: options.timeoutMs, maxRetries: 0 });
    let outputParsed: unknown = response.output_text;
    try {
      outputParsed = JSON.parse(response.output_text);
    } catch {
      // 애플리케이션 계약 경계가 원문을 보존한 채 파싱 실패로 분류한다.
    }
    return {
      outputParsed,
      ...(response.usage === undefined
        ? {}
        : { usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            ...(response.usage.input_tokens_details.cached_tokens === 0
              ? {}
              : { cacheReadTokens: response.usage.input_tokens_details.cached_tokens }),
          } }),
    };
  }
}

export class ProblemPathEvaluatorContractError extends Error {
  readonly parsedOutput: unknown;
  override readonly cause: unknown;

  constructor(cause: unknown, parsedOutput: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'ProblemPathEvaluatorContractError';
    this.cause = cause;
    this.parsedOutput = structuredClone(parsedOutput);
  }
}

/** 공급자 어댑터가 SDK 밖의 전송 실패를 같은 재시도 정책으로 전달할 때 사용한다. */
export class ProblemPathTransportError extends Error {
  readonly errorType: string;
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor(options: {
    readonly errorType: string;
    readonly retryable: boolean;
    readonly status?: number;
    readonly message?: string;
  }) {
    super(options.message ?? options.errorType);
    this.name = 'ProblemPathTransportError';
    this.errorType = options.errorType;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

function transportError(error: unknown): { type: string; retryable: boolean; status?: number } {
  if (error instanceof ProblemPathEvaluatorContractError) {
    return { type: 'contract_validation', retryable: false };
  }
  if (error instanceof ProblemPathTransportError) {
    return {
      type: error.errorType,
      retryable: error.retryable,
      ...(error.status === undefined ? {} : { status: error.status }),
    };
  }
  if (error instanceof OpenAI.RateLimitError) {
    return { status: error.status, type: 'rate_limit', retryable: true };
  }
  if (error instanceof OpenAI.InternalServerError) {
    return { status: error.status, type: 'server_error', retryable: true };
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return { type: 'connection', retryable: true };
  }
  if (error instanceof OpenAI.APIError) {
    return { status: error.status, type: error.name, retryable: false };
  }
  return { type: 'unknown', retryable: false };
}

export interface OpenAIProblemPathEvaluatorOptions {
  readonly model?: string;
  readonly effort?: ProblemPathEvaluatorEffort;
  readonly timeoutMs?: number;
  readonly maxTransportRetries?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
  readonly transport?: ProblemPathEvaluatorTransport;
  readonly metricRecorder?: (metric: CallMetric) => void;
}

export class OpenAIProblemPathEvaluator implements ProblemPathEvaluator {
  readonly model: string;
  readonly effort: ProblemPathEvaluatorEffort;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly retryDelayMs: number;
  private readonly now: () => Date;
  private readonly transport: ProblemPathEvaluatorTransport;
  private readonly metricRecorder: (metric: CallMetric) => void;

  constructor(options: OpenAIProblemPathEvaluatorOptions = {}) {
    this.model = options.model ??
      process.env['PROBLEM_PATH_OPENAI_MODEL'] ??
      DEFAULT_PROBLEM_PATH_OPENAI_MODEL;
    this.effort = options.effort ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.now = options.now ?? (() => new Date());
    this.transport = options.transport ?? new OpenAIProblemPathTransport();
    this.metricRecorder = options.metricRecorder ?? recordMetric;
  }

  async evaluate(inputValue: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
    const input = ProblemPathEvaluatorInputSchema.parse(inputValue);
    const calledAt = this.now().toISOString();
    const started = performance.now();
    const attempts: ProblemPathEvaluatorCallMetadata['attempts'][number][] = [];

    for (let attempt = 1; attempt <= this.maxTransportRetries + 1; attempt += 1) {
      const attemptStarted = performance.now();
      try {
        const response = await this.transport.parse({
          model: this.model,
          effort: this.effort,
          instructions: loadProblemPathDiagnosticPrompt(),
          input: JSON.stringify(input),
          mode: input.evaluationMode,
          timeoutMs: this.timeoutMs,
        });
        if (response.outputParsed === null) {
          throw new ProblemPathEvaluatorContractError(
            new Error('problem path evaluator: structured output parsing failed'),
            null,
          );
        }
        let result: ProblemPathEvaluatorOutput;
        try {
          const validated = validateProblemPathEvaluatorOutput(response.outputParsed, input);
          result = validated.mode === 'DIAGNOSE_PATH'
            ? resolveProblemPathEvaluatorIds(validated, {
                turnSequence: input.sessionState.evaluationSequence,
              })
            : validated;
        } catch (error) {
          throw new ProblemPathEvaluatorContractError(error, response.outputParsed);
        }
        const durationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({ attempt, outcome: 'success', durationMs });
        this.metricRecorder({
          ts: this.now().toISOString(),
          op: 'problem-solving-evaluator',
          model: this.model,
          effort: this.effort,
          paragraphId: input.basicGold.passageId,
          inputTokens: response.usage?.inputTokens ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          ...(response.usage?.cacheReadTokens === undefined
            ? {}
            : { cacheReadTokens: response.usage.cacheReadTokens }),
          ms: durationMs,
          attempt,
        });
        return {
          result,
          rawOutput: structuredClone(response.outputParsed),
          call: {
            provider: 'openai',
            model: this.model,
            effort: this.effort,
            promptVersion: PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
            schemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
            calledAt,
            durationMs: Math.round(performance.now() - started),
            attempts,
            usage: {
              inputTokens: response.usage?.inputTokens ?? 0,
              outputTokens: response.usage?.outputTokens ?? 0,
              ...(response.usage?.cacheReadTokens === undefined
                ? {}
                : { cacheReadTokens: response.usage.cacheReadTokens }),
            },
          },
        };
      } catch (error) {
        const classified = transportError(error);
        const durationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({ attempt, outcome: 'error', durationMs, errorType: classified.type });
        this.metricRecorder({
          ts: this.now().toISOString(),
          op: 'problem-solving-evaluator',
          model: this.model,
          effort: this.effort,
          paragraphId: input.basicGold.passageId,
          inputTokens: 0,
          outputTokens: 0,
          ms: durationMs,
          attempt,
          error: classified,
        });
        if (!classified.retryable || attempt > this.maxTransportRetries) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
    throw new Error('problem path evaluator: retry loop exhausted');
  }
}
