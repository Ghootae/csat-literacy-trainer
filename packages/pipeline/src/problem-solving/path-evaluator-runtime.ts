import OpenAI from 'openai';
import { z } from 'zod/v4';

import { recordMetric, type CallMetric } from '../llm/client.js';
import {
  SelectionRationaleEvaluationOutputSchema,
  SelectionRationaleProviderOutputSchema,
  PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
  PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
  ProblemPathDiagnosticOutputSchema,
  loadProblemPathDiagnosticPrompt,
  resolveProblemPathEvaluatorIds,
  type ProblemPathEvaluatorOutput,
} from './path-evaluator.js';
import {
  ProblemPathEvaluatorInputSchema,
  projectProblemPathEvaluatorProviderInput,
  validateProblemPathEvaluatorOutput,
  type ProblemPathEvaluatorInput,
} from './path-evaluator-input.js';

export const DEFAULT_PROBLEM_PATH_OPENAI_MODEL = 'gpt-5.6-terra';
export const DEFAULT_PROBLEM_RATIONALE_OPENAI_MODEL = 'gpt-5.6-luna';
export const DEFAULT_PROBLEM_RATIONALE_FALLBACK_OPENAI_MODEL = 'gpt-5.6-terra';
export const DEFAULT_PROBLEM_RATIONALE_TOTAL_TIMEOUT_MS = 30_000;
export const DEFAULT_PROBLEM_RATIONALE_MINIMUM_FALLBACK_TIME_MS = 8_000;

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
    readonly model?: string;
    readonly route?: 'PRIMARY' | 'FALLBACK';
    readonly outcome: 'success' | 'error';
    readonly durationMs: number;
    readonly errorType?: string;
    readonly usage?: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cacheReadTokens?: number;
    };
  }[];
  readonly routing?: {
    readonly primaryModel: string;
    readonly fallbackModel: string | null;
    readonly finalModel: string;
    readonly fallbackUsed: boolean;
    readonly fallbackReason: string | null;
    readonly fallbackSkippedReason?: 'PRIMARY_TIMEOUT' | 'INSUFFICIENT_TIME_REMAINING' | null;
    readonly totalBudgetMs?: number | null;
    readonly remainingBudgetMs?: number | null;
  };
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
    readonly allowedActionTypes: ProblemPathEvaluatorInput['sessionState']['allowedActionTypes'];
    readonly allowedActionTargetKinds: readonly ('SELECTED_CHOICE' | 'MISSED_ANSWER' | 'ANSWER_RATIONALE')[];
    readonly timeoutMs: number;
  }): Promise<ParsedTransportResponse>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 코드 상태가 허용한 다음 행동만 공급자의 constrained decoding 후보로 남긴다. */
export function createProblemPathProviderOutputJsonSchema(options: {
  readonly mode: ProblemPathEvaluatorInput['evaluationMode'];
  readonly allowedActionTypes: ProblemPathEvaluatorInput['sessionState']['allowedActionTypes'];
  readonly allowedActionTargetKinds?: readonly ('SELECTED_CHOICE' | 'MISSED_ANSWER' | 'ANSWER_RATIONALE')[];
}) {
  const jsonSchema = options.mode === 'ASSESS_SELECTION_RATIONALE'
    ? z.toJSONSchema(SelectionRationaleProviderOutputSchema)
    : z.toJSONSchema(ProblemPathDiagnosticOutputSchema);
  if (options.mode !== 'DIAGNOSE_PATH') return jsonSchema;

  const properties = isRecord(jsonSchema) && isRecord(jsonSchema['properties'])
    ? jsonSchema['properties']
    : undefined;
  const nextAction = properties === undefined || !isRecord(properties['nextActionCandidate'])
    ? undefined
    : properties['nextActionCandidate'];
  const variants = nextAction === undefined || !Array.isArray(nextAction['anyOf'])
    ? undefined
    : nextAction['anyOf'];
  if (variants === undefined) {
    throw new Error('problem path evaluator의 다음 행동 JSON Schema를 찾을 수 없다.');
  }
  if (nextAction === undefined) {
    throw new Error('problem path evaluator의 다음 행동 JSON Schema 객체가 없다.');
  }

  const allowed = new Set<string>(options.allowedActionTypes);
  const filtered = variants.filter((variant) => {
    if (!isRecord(variant) || !isRecord(variant['properties'])) return false;
    const typeProperty = variant['properties']['type'];
    return isRecord(typeProperty) &&
      typeof typeProperty['const'] === 'string' &&
      allowed.has(typeProperty['const']);
  });
  if (filtered.length === 0) {
    throw new Error('현재 코드 상태가 허용한 evaluator 다음 행동 스키마가 없다.');
  }
  nextAction['anyOf'] = filtered;
  if (options.allowedActionTargetKinds !== undefined) {
    for (const variant of filtered) {
      if (!isRecord(variant) || !isRecord(variant['properties'])) continue;
      const target = variant['properties']['target'];
      if (!isRecord(target) || target['type'] !== 'string') continue;
      target['enum'] = [...options.allowedActionTargetKinds];
    }
  }
  return jsonSchema;
}

class OpenAIProblemPathTransport implements ProblemPathEvaluatorTransport {
  private client: OpenAI | undefined;

  async parse(options: Parameters<ProblemPathEvaluatorTransport['parse']>[0]): Promise<ParsedTransportResponse> {
    this.client ??= new OpenAI({ maxRetries: 0 });
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
          schema: createProblemPathProviderOutputJsonSchema(options),
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
  readonly usage: ParsedTransportResponse['usage'];
  override readonly cause: unknown;

  constructor(
    cause: unknown,
    parsedOutput: unknown,
    usage?: ParsedTransportResponse['usage'],
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'ProblemPathEvaluatorContractError';
    this.cause = cause;
    this.parsedOutput = structuredClone(parsedOutput);
    this.usage = usage === undefined ? undefined : structuredClone(usage);
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

/** 정답 근거의 주·폴백 모델이 모두 실패했을 때 감사 메타데이터를 보존한다. */
export class ProblemPathEvaluatorFallbackError extends Error {
  readonly call: ProblemPathEvaluatorCallMetadata;
  override readonly cause: unknown;

  constructor(cause: unknown, call: ProblemPathEvaluatorCallMetadata) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'ProblemPathEvaluatorFallbackError';
    this.cause = cause;
    this.call = structuredClone(call);
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
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return { type: 'timeout', retryable: true };
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
  /** 모든 평가 모드에 적용하는 명시적 운영 롤백/강제 모델. */
  readonly model?: string;
  /** 정답 근거 사전 판정에만 적용한다. model보다 우선한다. */
  readonly rationaleModel?: string;
  /** 정답 근거 주 모델 실패 시 한 번만 호출한다. null이면 폴백을 끈다. */
  readonly rationaleFallbackModel?: string | null;
  readonly effort?: ProblemPathEvaluatorEffort;
  readonly timeoutMs?: number;
  /** @deprecated rationaleTotalTimeoutMs를 사용한다. */
  readonly rationaleTimeoutMs?: number;
  /** 정답 근거 주 모델과 폴백 모델이 공유하는 학생 대기시간 상한. */
  readonly rationaleTotalTimeoutMs?: number;
  /** Terra가 실행될 수 있다고 판단하는 최소 잔여시간. */
  readonly rationaleMinimumFallbackTimeMs?: number;
  readonly maxTransportRetries?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
  readonly monotonicNow?: () => number;
  readonly transport?: ProblemPathEvaluatorTransport;
  readonly metricRecorder?: (metric: CallMetric) => void;
}

/** 공급자의 근거 판정만 사용하고 선택 의미·최종 라벨은 코드가 파생한다. */
export function resolveSelectionRationaleProviderOutput(
  outputValue: unknown,
  input: ProblemPathEvaluatorInput,
) {
  if (input.evaluationMode !== 'ASSESS_SELECTION_RATIONALE') {
    throw new Error('선택 근거 공급자 출력은 ASSESS_SELECTION_RATIONALE 입력에서만 해석할 수 있다.');
  }
  const output = SelectionRationaleProviderOutputSchema.parse(outputValue);
  const requiredStance = input.evaluationContext.selectionIntent;
  const groundingAssessment = output.rationaleAssessment === 'SUPPORTED'
    ? 'SUPPORTED' as const
    : output.rationaleAssessment === 'CONTRADICTED'
      ? 'CONTRADICTED' as const
      : 'NOT_ENOUGH_EVIDENCE' as const;
  const assessment = output.rationaleAssessment === 'SUPPORTED'
    ? 'SUPPORTED' as const
    : output.rationaleAssessment === 'CONTRADICTED'
      ? 'CLEAR_ERROR' as const
      : 'UNCERTAIN' as const;
  const evidence = output.evidenceFindings.map((finding) => finding.studentQuote);
  const sourceRefs = [...new Set(output.evidenceFindings.flatMap((finding) => finding.sourceRefs))];
  return SelectionRationaleEvaluationOutputSchema.parse({
    schemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
    mode: 'ASSESS_SELECTION_RATIONALE',
    optionStance: requiredStance,
    requiredStanceForSelection: requiredStance,
    stanceConsistency: 'CONSISTENT',
    groundingAssessment,
    assessment,
    reason: output.reason,
    evidence,
    sourceRefs,
  });
}

export class OpenAIProblemPathEvaluator implements ProblemPathEvaluator {
  readonly model: string;
  readonly rationaleModel: string;
  readonly rationaleFallbackModel: string | null;
  readonly effort: ProblemPathEvaluatorEffort;
  private readonly timeoutMs: number;
  private readonly rationaleTotalTimeoutMs: number;
  private readonly rationaleMinimumFallbackTimeMs: number;
  private readonly maxTransportRetries: number;
  private readonly retryDelayMs: number;
  private readonly now: () => Date;
  private readonly monotonicNow: () => number;
  private readonly transport: ProblemPathEvaluatorTransport;
  private readonly metricRecorder: (metric: CallMetric) => void;

  constructor(options: OpenAIProblemPathEvaluatorOptions = {}) {
    const forcedModel = options.model ?? process.env['PROBLEM_PATH_OPENAI_MODEL'];
    this.model = forcedModel ?? DEFAULT_PROBLEM_PATH_OPENAI_MODEL;
    this.rationaleModel = options.rationaleModel ??
      forcedModel ??
      process.env['PROBLEM_RATIONALE_OPENAI_MODEL'] ??
      DEFAULT_PROBLEM_RATIONALE_OPENAI_MODEL;
    this.rationaleFallbackModel = options.rationaleFallbackModel === undefined
      ? forcedModel ??
        process.env['PROBLEM_RATIONALE_FALLBACK_OPENAI_MODEL'] ??
        DEFAULT_PROBLEM_RATIONALE_FALLBACK_OPENAI_MODEL
      : options.rationaleFallbackModel;
    this.effort = options.effort ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.rationaleTotalTimeoutMs = options.rationaleTotalTimeoutMs ??
      options.rationaleTimeoutMs ??
      DEFAULT_PROBLEM_RATIONALE_TOTAL_TIMEOUT_MS;
    this.rationaleMinimumFallbackTimeMs = options.rationaleMinimumFallbackTimeMs ??
      DEFAULT_PROBLEM_RATIONALE_MINIMUM_FALLBACK_TIME_MS;
    if (!Number.isFinite(this.rationaleTotalTimeoutMs) || this.rationaleTotalTimeoutMs <= 0) {
      throw new Error('정답 근거 전체 제한 시간은 양수여야 한다.');
    }
    if (
      !Number.isFinite(this.rationaleMinimumFallbackTimeMs) ||
      this.rationaleMinimumFallbackTimeMs < 0 ||
      this.rationaleMinimumFallbackTimeMs > this.rationaleTotalTimeoutMs
    ) {
      throw new Error('정답 근거 폴백 최소 잔여시간은 0 이상이며 전체 제한 시간 이하여야 한다.');
    }
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.now = options.now ?? (() => new Date());
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
    this.transport = options.transport ?? new OpenAIProblemPathTransport();
    this.metricRecorder = options.metricRecorder ?? recordMetric;
  }

  async evaluate(inputValue: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
    const input = ProblemPathEvaluatorInputSchema.parse(inputValue);
    const primaryModel = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
      ? this.rationaleModel
      : this.model;
    const fallbackModel = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE' &&
      this.rationaleFallbackModel !== null &&
      this.rationaleFallbackModel !== primaryModel
      ? this.rationaleFallbackModel
      : null;
    const providerInput = projectProblemPathEvaluatorProviderInput(input);
    const calledAt = this.now().toISOString();
    const started = this.monotonicNow();
    const attempts: ProblemPathEvaluatorCallMetadata['attempts'][number][] = [];
    const totalUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
    let fallbackReason: string | null = null;
    let attempt = 0;
    const remainingBudget = (): number => Math.max(
      0,
      Math.floor(this.rationaleTotalTimeoutMs - (this.monotonicNow() - started)),
    );
    const callMetadata = (options: {
      readonly finalModel: string;
      readonly fallbackUsed: boolean;
      readonly fallbackSkippedReason: 'PRIMARY_TIMEOUT' | 'INSUFFICIENT_TIME_REMAINING' | null;
    }): ProblemPathEvaluatorCallMetadata => ({
      provider: 'openai',
      model: options.finalModel,
      effort: this.effort,
      promptVersion: PROBLEM_PATH_DIAGNOSTIC_PROMPT_VERSION,
      schemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
      calledAt,
      durationMs: Math.round(this.monotonicNow() - started),
      attempts,
      routing: {
        primaryModel,
        fallbackModel,
        finalModel: options.finalModel,
        fallbackUsed: options.fallbackUsed,
        fallbackReason,
        fallbackSkippedReason: options.fallbackSkippedReason,
        totalBudgetMs: input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
          ? this.rationaleTotalTimeoutMs
          : null,
        remainingBudgetMs: input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
          ? remainingBudget()
          : null,
      },
      usage: {
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        ...(totalUsage.cacheReadTokens === 0
          ? {}
          : { cacheReadTokens: totalUsage.cacheReadTokens }),
      },
    });
    const routes = fallbackModel === null
      ? [{ model: primaryModel, route: 'PRIMARY' as const }]
      : [
          { model: primaryModel, route: 'PRIMARY' as const },
          { model: fallbackModel, route: 'FALLBACK' as const },
        ];

    for (const route of routes) {
      let transportRetriesUsed = 0;
      const maxRetriesForRoute = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
        ? 0
        : this.maxTransportRetries;
      while (true) {
        attempt += 1;
        const attemptStarted = this.monotonicNow();
        try {
          const timeoutMs = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
            ? remainingBudget()
            : this.timeoutMs;
          const response = await this.transport.parse({
            model: route.model,
            effort: this.effort,
            instructions: loadProblemPathDiagnosticPrompt(),
            input: JSON.stringify(providerInput),
            mode: input.evaluationMode,
            allowedActionTypes: input.sessionState.allowedActionTypes,
            allowedActionTargetKinds: input.sessionState.entryReason === 'WRONG_CHOICE'
              ? ['SELECTED_CHOICE']
              : ['ANSWER_RATIONALE'],
            timeoutMs,
          });
          if (response.outputParsed === null) {
            throw new ProblemPathEvaluatorContractError(
              new Error('problem path evaluator: structured output parsing failed'),
              null,
              response.usage,
            );
          }
          let result: ProblemPathEvaluatorOutput;
          try {
            const resolvedOutput = input.evaluationMode === 'ASSESS_SELECTION_RATIONALE'
              ? resolveSelectionRationaleProviderOutput(response.outputParsed, input)
              : response.outputParsed;
            const validated = validateProblemPathEvaluatorOutput(resolvedOutput, input);
            result = validated.mode === 'DIAGNOSE_PATH'
              ? resolveProblemPathEvaluatorIds(validated, {
                  turnSequence: input.sessionState.evaluationSequence,
                })
              : validated;
          } catch (error) {
            throw new ProblemPathEvaluatorContractError(error, response.outputParsed, response.usage);
          }
          const durationMs = Math.round(this.monotonicNow() - attemptStarted);
          const responseUsage = {
            inputTokens: response.usage?.inputTokens ?? 0,
            outputTokens: response.usage?.outputTokens ?? 0,
            cacheReadTokens: response.usage?.cacheReadTokens ?? 0,
          };
          totalUsage.inputTokens += responseUsage.inputTokens;
          totalUsage.outputTokens += responseUsage.outputTokens;
          totalUsage.cacheReadTokens += responseUsage.cacheReadTokens;
          attempts.push({
            attempt,
            model: route.model,
            route: route.route,
            outcome: 'success',
            durationMs,
            usage: {
              inputTokens: responseUsage.inputTokens,
              outputTokens: responseUsage.outputTokens,
              ...(responseUsage.cacheReadTokens === 0
                ? {}
                : { cacheReadTokens: responseUsage.cacheReadTokens }),
            },
          });
          this.metricRecorder({
            ts: this.now().toISOString(),
            op: 'problem-solving-evaluator',
            model: route.model,
            effort: this.effort,
            paragraphId: input.basicGold.passageId,
            inputTokens: responseUsage.inputTokens,
            outputTokens: responseUsage.outputTokens,
            ...(responseUsage.cacheReadTokens === 0
              ? {}
              : { cacheReadTokens: responseUsage.cacheReadTokens }),
            ms: durationMs,
            attempt,
          });
          return {
            result,
            rawOutput: structuredClone(response.outputParsed),
            call: callMetadata({
              finalModel: route.model,
              fallbackUsed: route.route === 'FALLBACK',
              fallbackSkippedReason: null,
            }),
          };
        } catch (error) {
          const classified = transportError(error);
          const durationMs = Math.round(this.monotonicNow() - attemptStarted);
          const errorUsage = error instanceof ProblemPathEvaluatorContractError
            ? error.usage
            : undefined;
          totalUsage.inputTokens += errorUsage?.inputTokens ?? 0;
          totalUsage.outputTokens += errorUsage?.outputTokens ?? 0;
          totalUsage.cacheReadTokens += errorUsage?.cacheReadTokens ?? 0;
          attempts.push({
            attempt,
            model: route.model,
            route: route.route,
            outcome: 'error',
            durationMs,
            errorType: classified.type,
            usage: {
              inputTokens: errorUsage?.inputTokens ?? 0,
              outputTokens: errorUsage?.outputTokens ?? 0,
              ...(errorUsage?.cacheReadTokens === undefined || errorUsage.cacheReadTokens === 0
                ? {}
                : { cacheReadTokens: errorUsage.cacheReadTokens }),
            },
          });
          this.metricRecorder({
            ts: this.now().toISOString(),
            op: 'problem-solving-evaluator',
            model: route.model,
            effort: this.effort,
            paragraphId: input.basicGold.passageId,
            inputTokens: errorUsage?.inputTokens ?? 0,
            outputTokens: errorUsage?.outputTokens ?? 0,
            ...(errorUsage?.cacheReadTokens === undefined
              ? {}
              : { cacheReadTokens: errorUsage.cacheReadTokens }),
            ms: durationMs,
            attempt,
            error: classified,
          });
          if (classified.retryable && transportRetriesUsed < maxRetriesForRoute) {
            transportRetriesUsed += 1;
            await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
            continue;
          }
          if (route.route === 'PRIMARY' && fallbackModel !== null) {
            fallbackReason = classified.type;
            const fallbackSkippedReason = classified.type.includes('timeout')
              ? 'PRIMARY_TIMEOUT' as const
              : remainingBudget() < this.rationaleMinimumFallbackTimeMs
                ? 'INSUFFICIENT_TIME_REMAINING' as const
                : null;
            if (fallbackSkippedReason !== null) {
              throw new ProblemPathEvaluatorFallbackError(error, callMetadata({
                finalModel: route.model,
                fallbackUsed: false,
                fallbackSkippedReason,
              }));
            }
            break;
          }
          if (route.route === 'FALLBACK') {
            throw new ProblemPathEvaluatorFallbackError(error, callMetadata({
              finalModel: route.model,
              fallbackUsed: true,
              fallbackSkippedReason: null,
            }));
          }
          throw error;
        }
      }
    }
    throw new Error('problem path evaluator가 결과 없이 종료되었습니다.');
  }
}
