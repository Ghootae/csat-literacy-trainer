import OpenAI from 'openai';
import { z } from 'zod/v4';

import { recordMetric, type CallMetric } from '../llm/client.js';
import {
  SelectionRationaleEvaluationOutputSchema,
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
    ? z.toJSONSchema(SelectionRationaleEvaluationOutputSchema)
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
  readonly maxSemanticContradictionRetries?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
  readonly transport?: ProblemPathEvaluatorTransport;
  readonly metricRecorder?: (metric: CallMetric) => void;
}

type SelectionRationaleOutput = z.infer<typeof SelectionRationaleEvaluationOutputSchema>;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function explicitTargetStance(
  text: string,
  targetMarkers: readonly string[],
): 'ACCEPTS_OPTION' | 'REJECTS_OPTION' | 'CONTRADICTORY' | null {
  const marker = targetMarkers.map(escapeRegExp).join('|');
  if (marker === '') return null;
  const targetThenReject = new RegExp(
    `(?:${marker})[\\s\\S]{0,60}(?:틀(?:리|린|렸)|잘못|부적절|옳지\\s*않|맞지\\s*않|성립하지\\s*않|거부|결론의\\s*방향이\\s*반대)`,
    'u',
  );
  const targetThenAccept = new RegExp(
    `(?:${marker})[\\s\\S]{0,60}(?:맞는\\s*설명|맞다고|옳은|옳다고|적절하|성립한다|부합한다|받아들인)`,
    'u',
  );
  const rejects = targetThenReject.test(text);
  const accepts = targetThenAccept.test(text);
  if (rejects && accepts) return 'CONTRADICTORY';
  if (rejects) return 'REJECTS_OPTION';
  if (accepts) return 'ACCEPTS_OPTION';
  return null;
}

/** 모델 설명·인용이 명시한 대상 선지 태도와 구조화 enum의 의미 모순을 찾는다. */
export function hasSelectionRationaleSemanticContradiction(
  output: SelectionRationaleOutput,
  input: ProblemPathEvaluatorInput,
): boolean {
  if (input.evaluationMode !== 'ASSESS_SELECTION_RATIONALE') return false;
  const targetChoice = input.basicGold.choices.find(
    (choice) => choice.choiceId === input.sessionState.currentChoiceId,
  );
  if (targetChoice === undefined) return false;
  const circled = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'][targetChoice.position] ?? '';
  const markers = [
    '대상 선지',
    '해당 선지',
    '이 선지',
    targetChoice.choiceId,
    `${targetChoice.position}번`,
    circled,
  ].filter((value) => value !== '');
  const texts = [
    output.reason,
    ...output.evidence.flatMap((item) => item.kind === 'QUOTE' ? [item.quote] : []),
  ];
  const stances = texts
    .map((text) => explicitTargetStance(text, markers))
    .filter((stance): stance is NonNullable<typeof stance> => stance !== null);
  if (stances.includes('CONTRADICTORY')) return true;
  const explicit = new Set(stances);
  if (explicit.size > 1) return true;
  const [stance] = explicit;
  return stance !== undefined &&
    output.optionStance !== 'UNCLEAR' &&
    stance !== output.optionStance;
}

function uncertainSemanticFallback(
  input: ProblemPathEvaluatorInput,
  providerInput: ReturnType<typeof projectProblemPathEvaluatorProviderInput>,
): SelectionRationaleOutput {
  if (
    input.evaluationMode !== 'ASSESS_SELECTION_RATIONALE' ||
    providerInput.evaluationMode !== 'ASSESS_SELECTION_RATIONALE' ||
    !('rationaleReview' in providerInput)
  ) {
    throw new Error('빠른 근거 평가의 의미 모순 폴백은 블라인드 근거 판정에만 사용할 수 있다.');
  }
  const rationale = providerInput.rationaleReview.studentRationale;
  return SelectionRationaleEvaluationOutputSchema.parse({
    schemaVersion: PROBLEM_PATH_EVALUATOR_SCHEMA_VERSION,
    mode: 'ASSESS_SELECTION_RATIONALE',
    optionStance: 'UNCLEAR',
    requiredStanceForSelection: input.basicGold.stemPolarity === 'SELECT_INCORRECT'
      ? 'REJECTS_OPTION'
      : 'ACCEPTS_OPTION',
    stanceConsistency: 'UNCLEAR',
    groundingAssessment: 'NOT_ENOUGH_EVIDENCE',
    assessment: 'UNCERTAIN',
    reason: '두 차례의 빠른 근거 평가에서 자연어 설명과 구조화 선지 태도가 모순되어 안전하게 판정할 수 없다.',
    evidence: [{
      kind: 'QUOTE',
      observationId: rationale.observationId,
      sourceField: rationale.sourceField,
      quote: rationale.text,
    }],
    sourceRefs: [],
  });
}

export class OpenAIProblemPathEvaluator implements ProblemPathEvaluator {
  readonly model: string;
  readonly effort: ProblemPathEvaluatorEffort;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly maxSemanticContradictionRetries: number;
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
    this.maxSemanticContradictionRetries = options.maxSemanticContradictionRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.now = options.now ?? (() => new Date());
    this.transport = options.transport ?? new OpenAIProblemPathTransport();
    this.metricRecorder = options.metricRecorder ?? recordMetric;
  }

  async evaluate(inputValue: ProblemPathEvaluatorInput): Promise<ProblemPathEvaluatorCall> {
    const input = ProblemPathEvaluatorInputSchema.parse(inputValue);
    const providerInput = projectProblemPathEvaluatorProviderInput(input);
    const calledAt = this.now().toISOString();
    const started = performance.now();
    const attempts: ProblemPathEvaluatorCallMetadata['attempts'][number][] = [];

    let attempt = 0;
    let transportRetriesUsed = 0;
    let semanticContradictionRetriesUsed = 0;
    while (true) {
      attempt += 1;
      const attemptStarted = performance.now();
      try {
        const response = await this.transport.parse({
          model: this.model,
          effort: this.effort,
          instructions: loadProblemPathDiagnosticPrompt(),
          input: JSON.stringify(providerInput),
          mode: input.evaluationMode,
          allowedActionTypes: input.sessionState.allowedActionTypes,
          allowedActionTargetKinds: input.sessionState.entryReason === 'WRONG_CHOICE'
            ? ['SELECTED_CHOICE']
            : ['ANSWER_RATIONALE'],
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
        const semanticContradiction = result.mode === 'ASSESS_SELECTION_RATIONALE' &&
          hasSelectionRationaleSemanticContradiction(result, input);
        if (
          semanticContradiction &&
          semanticContradictionRetriesUsed < this.maxSemanticContradictionRetries
        ) {
          semanticContradictionRetriesUsed += 1;
          const durationMs = Math.round(performance.now() - attemptStarted);
          attempts.push({
            attempt,
            outcome: 'error',
            durationMs,
            errorType: 'semantic_stance_contradiction',
          });
          this.metricRecorder({
            ts: this.now().toISOString(),
            op: 'problem-solving-evaluator',
            model: this.model,
            effort: this.effort,
            paragraphId: input.basicGold.passageId,
            inputTokens: response.usage?.inputTokens ?? 0,
            outputTokens: response.usage?.outputTokens ?? 0,
            ms: durationMs,
            attempt,
            error: { type: 'semantic_stance_contradiction', retryable: true },
          });
          continue;
        }
        const semanticFallback = semanticContradiction;
        if (semanticFallback) result = uncertainSemanticFallback(input, providerInput);
        const durationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({
          attempt,
          outcome: 'success',
          durationMs,
          ...(semanticFallback ? { errorType: 'semantic_stance_contradiction_fallback' } : {}),
        });
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
        if (!classified.retryable || transportRetriesUsed >= this.maxTransportRetries) throw error;
        transportRetriesUsed += 1;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
  }
}
