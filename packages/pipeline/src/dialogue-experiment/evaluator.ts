import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

import { recordMetric } from '../llm/client.js';
import {
  DIALOGUE_PROMPT_VERSION,
  DIALOGUE_SCHEMA_VERSION,
  EvaluationStatusSchema,
  EvidenceSourceSchema,
  QuestionTypeSchema,
  RelationStateSchema,
  type EvaluationResult,
  type DialoguePromptVersion,
  type ParagraphDiagnosticGold,
  type QuestionType,
  type StudentRepresentationSnapshot,
  validateEvaluationResult,
} from './schema.js';

export const DEFAULT_DIALOGUE_OPENAI_MODEL = 'gpt-5.6-terra';

export type DialogueEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface DialogueHistoryEntry {
  readonly question: {
    readonly type: QuestionType;
    readonly text: string;
  };
  readonly answer: string;
  /** 선택적 상세 진단에서 같은 관계를 반복 선택하지 않기 위한 내부 메타데이터. */
  readonly targetRelationIds?: readonly string[];
}

export interface DialogueEvaluationInput {
  readonly shownSourceGuides?: readonly { axisId: string; quote: string; turn: number }[];
  /** Displayed reference feedback is context, never independent student evidence. */
  readonly revealedAxisContent?: readonly { axisId: string; text: string; turn: number }[];
  readonly gold: ParagraphDiagnosticGold;
  readonly goldVersion: string;
  readonly goldHash: string;
  readonly initialResponse: string;
  readonly history: readonly DialogueHistoryEntry[];
  readonly turn: number;
  readonly questionsAsked: number;
  readonly maxQuestions: number;
  readonly previousSnapshot?: StudentRepresentationSnapshot;
  /**
   * 1단계 게이트는 중심축의 충분성을 판정한다. 2단계에서 명시적 관계 오류가
   * 발견되면 최종 판정은 ERROR로 승격될 수 있다.
   */
  readonly gateDecision?: {
    readonly status: 'CAPTURED' | 'UNCLEAR' | 'DISTORTED';
    readonly decisionSummary: string;
    readonly effectiveResponse: string;
    readonly expressedClaims: StudentRepresentationSnapshot['expressedClaims'];
    readonly targetAxisId: string | null;
    readonly axisStates: readonly {
      readonly axisId: string;
      readonly state: 'captured' | 'partial' | 'unknown' | 'distorted';
    }[];
  };
}

export interface DialogueCallMetadata {
  readonly provider: 'openai' | 'mock';
  readonly model: string;
  readonly effort: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
  readonly goldVersion: string;
  readonly goldHash: string;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly attempts?: readonly DialogueCallAttemptMetadata[];
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheWriteTokens?: number;
    readonly cacheReadTokens?: number;
  };
  /** 1차 판정기의 원출력과 결정론적 보정 결과를 구분해 남기는 감사 자료. */
  readonly decisionAudit?: {
    readonly rawResult: unknown;
    readonly validatedResult: unknown;
    readonly contractFailures?: readonly {
      readonly attempt: number;
      readonly validationError: string;
      readonly rawResult: unknown;
    }[];
    readonly normalizationEvents: readonly {
      readonly field: string;
      readonly before: unknown;
      readonly after: unknown;
      readonly reason: string;
    }[];
  };
  readonly stages?: readonly {
    readonly decisionAudit?: DialogueCallMetadata['decisionAudit'];
    readonly stage: 'central_story_gate' | 'relation_diagnostic' | 'selective_feedback' | 'conditional_meta';
    readonly promptVersion: string;
    readonly schemaVersion: string;
    readonly durationMs: number;
    readonly usage?: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cacheWriteTokens?: number;
      readonly cacheReadTokens?: number;
    };
  }[];
}

export interface DialogueCallAttemptMetadata {
  readonly attempt: number;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly outcome: 'success' | 'error';
  readonly error?: {
    readonly status?: number;
    readonly type: string;
    readonly retryable: boolean;
  };
}

export interface DialogueEvaluationCall {
  readonly result: EvaluationResult;
  readonly call: DialogueCallMetadata;
}

export interface DialogueEvaluator {
  evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall>;
  requestQuestion?(input: DialogueEvaluationInput, prior: DialogueEvaluationCall): Promise<DialogueEvaluationCall>;
}

export interface OpenAIDialogueEvaluatorOptions {
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly promptVersion?: DialoguePromptVersion;
  readonly timeoutMs?: number;
  readonly maxTransportRetries?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
  /** 테스트에서만 사용한다. 실제 클라이언트는 OPENAI_API_KEY를 읽어 지연 생성한다. */
  readonly client?: OpenAI;
}

const PROMPT_PATHS: Readonly<Record<DialoguePromptVersion, string>> = {
  'dialogue-prompt-v6': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/prompt-v6.md',
  ),
  'dialogue-prompt-v7': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/prompt-v7.md',
  ),
  'dialogue-prompt-v8': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/prompt-v8.md',
  ),
  'dialogue-diagnostic-prompt-v1': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/diagnostic-prompt-v1.md',
  ),
  'dialogue-axis-diagnostic-prompt-v1': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/axis-diagnostic-prompt-v1.md',
  ),
  'dialogue-axis-diagnostic-prompt-v2': resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/axis-diagnostic-prompt-v2.md',
  ),
};

export function loadDialoguePrompt(
  version: DialoguePromptVersion = DIALOGUE_PROMPT_VERSION,
): string {
  return readFileSync(PROMPT_PATHS[version], 'utf8').trim();
}

/* OpenAI strict Structured Outputs는 모든 필드를 required로 요구한다. 저장 시 제거할
 * unknown의 근거 필드는 API 경계에서 nullable로 받고 아래에서 생략형으로 정규화한다. */
const OpenAIStudentRepresentationSnapshotSchema = z.object({
  turn: z.number().int().nonnegative(),
  centralObjectRepresentation: z.string().nullable(),
  centralStoryRepresentation: z.string().nullable(),
  expressedClaims: z.array(z.object({
    description: z.string().min(1),
    source: EvidenceSourceSchema,
    evidence: z.string().min(1),
  })),
  relationStates: z.array(z.object({
    relationId: z.string().min(1),
    state: RelationStateSchema,
    source: EvidenceSourceSchema.nullable(),
    evidence: z.string().nullable(),
  })),
  unresolvedQuestions: z.array(z.string()),
});

const OpenAIEvaluationResultOutputSchema = z.object({
  status: EvaluationStatusSchema,
  snapshot: OpenAIStudentRepresentationSnapshotSchema,
  decisionSummary: z.string().min(1),
  targetIssue: z.object({
    description: z.string().min(1),
    relatedRelationIds: z.array(z.string()),
  }).nullable(),
  nextQuestion: z.object({
    type: QuestionTypeSchema,
    text: z.string().min(1),
  }).nullable(),
  studentFeedback: z.string().min(1),
});

type OpenAIEvaluationResultOutput = z.infer<typeof OpenAIEvaluationResultOutputSchema>;

/**
 * Structured Output은 JSON Schema를 통과했지만 애플리케이션의 상태 계약을 위반했다.
 * 실험용 호출자가 재호출 없이 거부 원인을 감사할 수 있도록 파싱 결과를 보존한다.
 */
export class DialogueEvaluationContractError extends Error {
  readonly parsedOutput: unknown;
  override readonly cause: unknown;

  constructor(cause: unknown, parsedOutput: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'DialogueEvaluationContractError';
    this.cause = cause;
    this.parsedOutput = structuredClone(parsedOutput);
  }
}

let openAIClient: OpenAI | undefined;

function getOpenAIClient(): OpenAI {
  // 시도별 실패를 직접 기록하기 위해 SDK 내부 재시도는 끈다.
  openAIClient ??= new OpenAI({ maxRetries: 0 });
  return openAIClient;
}

function normalizeOpenAIOutput(value: OpenAIEvaluationResultOutput): EvaluationResult {
  return {
    ...value,
    snapshot: {
      ...value.snapshot,
      relationStates: value.snapshot.relationStates.map((relation) => ({
        relationId: relation.relationId,
        state: relation.state,
        ...(relation.source === null ? {} : { source: relation.source }),
        ...(relation.evidence === null ? {} : { evidence: relation.evidence }),
      })),
      // 실제 오류 목록은 validateEvaluationResult에서 contradicted 관계로부터 파생한다.
      explicitErrors: [],
    },
  };
}

function openAIErrorMetric(error: unknown): {
  readonly status?: number;
  readonly type: string;
  readonly retryable: boolean;
} {
  if (error instanceof DialogueEvaluationContractError) {
    return { type: 'contract_validation', retryable: false };
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
  if (error instanceof Error && error.message.includes('structured output')) {
    return { type: 'schema_mismatch', retryable: false };
  }
  return { type: 'unknown', retryable: false };
}

function assertRelationIds(result: EvaluationResult, gold: ParagraphDiagnosticGold): void {
  const allowed = new Set(gold.coreRelations.map((relation) => relation.id));
  const states = result.snapshot.relationStates.map((relation) => relation.relationId);
  if (states.length !== allowed.size || new Set(states).size !== states.length) {
    throw new Error('dialogue evaluation: relationStates must contain every core relation once');
  }
  for (const id of states) {
    if (!allowed.has(id)) throw new Error(`dialogue evaluation: unknown relationId ${id}`);
  }
  const referenced = [
    ...(result.targetIssue?.relatedRelationIds ?? []),
    ...result.snapshot.explicitErrors.flatMap((error) => error.relatedRelationIds),
  ];
  for (const id of referenced) {
    if (!allowed.has(id)) throw new Error(`dialogue evaluation: unknown relatedRelationId ${id}`);
  }
}

function evaluatorPayload(
  input: DialogueEvaluationInput,
  promptVersion: DialoguePromptVersion,
): string {
  const coreRelations = promptVersion === 'dialogue-axis-diagnostic-prompt-v1' ||
      promptVersion === 'dialogue-axis-diagnostic-prompt-v2'
    ? input.gold.coreRelations.map(({ id, description }) => ({ id, description }))
    : input.gold.coreRelations;
  return JSON.stringify(
    {
      paragraphText: input.gold.paragraphText,
      diagnosticGold: {
        paragraphId: input.gold.paragraphId,
        centralObject: input.gold.centralObject,
        centralStory: input.gold.centralStory,
        centralAxes: input.gold.centralAxes,
        coreRelations,
        keyMappings: input.gold.keyMappings ?? [],
        supportingConcepts: input.gold.supportingConcepts ?? [],
      },
      evidence: {
        initialResponse: input.initialResponse,
        followUpExchanges: input.history,
        previousSnapshot: input.previousSnapshot ?? null,
      },
      session: {
        turn: input.turn,
        questionsAsked: input.questionsAsked,
        maxQuestions: input.maxQuestions,
        canAskQuestion: input.questionsAsked < input.maxQuestions,
      },
      gateDecision: input.gateDecision ?? null,
      outputSchemaVersion: DIALOGUE_SCHEMA_VERSION,
    },
    null,
    2,
  );
}

/**
 * 누적 증거로 이미 판정한 관계를 모델이 다음 턴에서 근거 없이 unknown으로 되돌리지 못하게 한다.
 * 새 답변이 명시적으로 수정하거나 반박한 경우의 known 상태는 그대로 존중한다.
 */
export function preserveCumulativeRelationEvidence(
  result: EvaluationResult,
  previousSnapshot: StudentRepresentationSnapshot | undefined,
): EvaluationResult {
  if (previousSnapshot === undefined) return result;
  const previous = new Map(
    previousSnapshot.relationStates
      .filter((relation) => relation.state !== 'unknown')
      .map((relation) => [relation.relationId, relation]),
  );
  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      relationStates: result.snapshot.relationStates.map((relation) => {
        if (relation.state !== 'unknown') return relation;
        return previous.get(relation.relationId) ?? relation;
      }),
    },
  };
}

export class OpenAIDialogueEvaluator implements DialogueEvaluator {
  readonly model: string;
  readonly effort: DialogueEffort;
  readonly promptVersion: DialoguePromptVersion;
  private readonly now: () => Date;
  private readonly providedClient: OpenAI | undefined;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly retryDelayMs: number;

  constructor(options: OpenAIDialogueEvaluatorOptions = {}) {
    this.model =
      options.model ??
      process.env['DIALOGUE_EXPERIMENT_OPENAI_MODEL'] ??
      DEFAULT_DIALOGUE_OPENAI_MODEL;
    this.effort =
      options.effort ?? parseEffort(process.env['DIALOGUE_EXPERIMENT_EFFORT']) ?? 'medium';
    this.promptVersion = options.promptVersion ?? DIALOGUE_PROMPT_VERSION;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.now = options.now ?? (() => new Date());
    this.providedClient = options.client;
  }

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const calledAt = this.now().toISOString();
    const started = performance.now();
    const attempts: DialogueCallAttemptMetadata[] = [];

    for (let attempt = 1; attempt <= this.maxTransportRetries + 1; attempt += 1) {
      const attemptCalledAt = this.now().toISOString();
      const attemptStarted = performance.now();
      let measuredUsage:
        | {
            readonly inputTokens: number;
            readonly outputTokens: number;
            readonly cacheWriteTokens: number;
            readonly cacheReadTokens: number;
          }
        | undefined;
      try {
        const response = await (this.providedClient ?? getOpenAIClient()).responses.parse({
          model: this.model,
          instructions: loadDialoguePrompt(this.promptVersion),
          input: evaluatorPayload(input, this.promptVersion),
          reasoning: { effort: this.effort },
          max_output_tokens: 6000,
          store: false,
          text: {
            format: zodTextFormat(
              OpenAIEvaluationResultOutputSchema,
              'dialogue_evaluation_result',
            ),
          },
        }, { timeout: this.timeoutMs, maxRetries: 0 });

        if (response.output_parsed === null) {
          throw new Error('dialogue evaluation: structured output parsing failed');
        }
        const usage = response.usage;
        const cacheWriteTokens = usage?.input_tokens_details.cache_write_tokens ?? 0;
        const cacheReadTokens = usage?.input_tokens_details.cached_tokens ?? 0;
        measuredUsage = {
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          cacheWriteTokens,
          cacheReadTokens,
        };
        let result: EvaluationResult;
        try {
          const normalized = normalizeOpenAIOutput(response.output_parsed);
          const cumulative = preserveCumulativeRelationEvidence(
            normalized,
            input.previousSnapshot,
          );
          result = validateEvaluationResult(cumulative, {
            canAskQuestion: input.questionsAsked < input.maxQuestions,
            expectedTurn: input.turn,
            gold: input.gold,
            enforceDiagnosticRoles:
              this.promptVersion === 'dialogue-prompt-v7' ||
              this.promptVersion === 'dialogue-prompt-v8' ||
              this.promptVersion === 'dialogue-diagnostic-prompt-v1',
            axisTargeting:
              this.promptVersion === 'dialogue-axis-diagnostic-prompt-v1' ||
              this.promptVersion === 'dialogue-axis-diagnostic-prompt-v2',
            requiredRelationsAreQuestionOnly:
              this.promptVersion === 'dialogue-prompt-v8' ||
              this.promptVersion === 'dialogue-diagnostic-prompt-v1' ||
              this.promptVersion === 'dialogue-axis-diagnostic-prompt-v1' ||
              this.promptVersion === 'dialogue-axis-diagnostic-prompt-v2',
          });
          assertRelationIds(result, input.gold);
        } catch (error) {
          throw new DialogueEvaluationContractError(error, response.output_parsed);
        }

        const attemptDurationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({
          attempt,
          calledAt: attemptCalledAt,
          durationMs: attemptDurationMs,
          outcome: 'success',
        });
        recordMetric({
          ts: attemptCalledAt,
          op: 'dialogue-experiment',
          model: this.model,
          effort: this.effort,
          paragraphId: input.gold.paragraphId,
          inputTokens: measuredUsage.inputTokens,
          outputTokens: measuredUsage.outputTokens,
          ...(cacheWriteTokens === 0 ? {} : { cacheWriteTokens }),
          ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
          ms: attemptDurationMs,
          attempt,
        });

        return {
          result,
          call: {
            provider: 'openai',
            model: this.model,
            effort: this.effort,
            promptVersion: this.promptVersion,
            schemaVersion: DIALOGUE_SCHEMA_VERSION,
            goldVersion: input.goldVersion,
            goldHash: input.goldHash,
            calledAt,
            durationMs: Math.round(performance.now() - started),
            attempts,
            usage: {
              inputTokens: usage?.input_tokens ?? 0,
              outputTokens: usage?.output_tokens ?? 0,
              ...(cacheWriteTokens === 0 ? {} : { cacheWriteTokens }),
              ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
            },
          },
        };
      } catch (error) {
        const errorMetadata = openAIErrorMetric(error);
        const attemptDurationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({
          attempt,
          calledAt: attemptCalledAt,
          durationMs: attemptDurationMs,
          outcome: 'error',
          error: errorMetadata,
        });
        recordMetric({
          ts: attemptCalledAt,
          op: 'dialogue-experiment',
          model: this.model,
          effort: this.effort,
          paragraphId: input.gold.paragraphId,
          inputTokens: measuredUsage?.inputTokens ?? 0,
          outputTokens: measuredUsage?.outputTokens ?? 0,
          ...(measuredUsage === undefined || measuredUsage.cacheWriteTokens === 0
            ? {}
            : { cacheWriteTokens: measuredUsage.cacheWriteTokens }),
          ...(measuredUsage === undefined || measuredUsage.cacheReadTokens === 0
            ? {}
            : { cacheReadTokens: measuredUsage.cacheReadTokens }),
          ms: attemptDurationMs,
          attempt,
          error: errorMetadata,
        });
        if (!errorMetadata.retryable || attempt > this.maxTransportRetries) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
    throw new Error('dialogue evaluation: retry loop exhausted');
  }
}

export function parseEffort(value: string | undefined): DialogueEffort | undefined {
  if (value === undefined) return undefined;
  if (
    value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh' ||
    value === 'max'
  ) {
    return value;
  }
  throw new Error(`지원하지 않는 effort입니다: ${value}`);
}
