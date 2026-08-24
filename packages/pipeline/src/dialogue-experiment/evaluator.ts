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
  type ParagraphDiagnosticGold,
  type QuestionType,
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
}

export interface DialogueEvaluationInput {
  readonly gold: ParagraphDiagnosticGold;
  readonly goldVersion: string;
  readonly goldHash: string;
  readonly initialResponse: string;
  readonly history: readonly DialogueHistoryEntry[];
  readonly turn: number;
  readonly questionsAsked: number;
  readonly maxQuestions: number;
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
  readonly usage?: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheWriteTokens?: number;
    readonly cacheReadTokens?: number;
  };
}

export interface DialogueEvaluationCall {
  readonly result: EvaluationResult;
  readonly call: DialogueCallMetadata;
}

export interface DialogueEvaluator {
  evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall>;
}

export interface OpenAIDialogueEvaluatorOptions {
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly now?: () => Date;
  /** 테스트에서만 사용한다. 실제 클라이언트는 OPENAI_API_KEY를 읽어 지연 생성한다. */
  readonly client?: OpenAI;
}

const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/prompt-v6.md',
);

export function loadDialoguePrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
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
  // 한 학생 입력당 실제 HTTP 요청도 정확히 한 번이어야 하므로 SDK 재시도를 끈다.
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

function evaluatorPayload(input: DialogueEvaluationInput): string {
  return JSON.stringify(
    {
      paragraphText: input.gold.paragraphText,
      diagnosticGold: {
        paragraphId: input.gold.paragraphId,
        centralObject: input.gold.centralObject,
        centralStory: input.gold.centralStory,
        coreRelations: input.gold.coreRelations,
        keyMappings: input.gold.keyMappings ?? [],
        supportingConcepts: input.gold.supportingConcepts ?? [],
      },
      evidence: {
        initialResponse: input.initialResponse,
        followUpExchanges: input.history,
      },
      session: {
        turn: input.turn,
        questionsAsked: input.questionsAsked,
        maxQuestions: input.maxQuestions,
        canAskQuestion: input.questionsAsked < input.maxQuestions,
      },
      outputSchemaVersion: DIALOGUE_SCHEMA_VERSION,
    },
    null,
    2,
  );
}

export class OpenAIDialogueEvaluator implements DialogueEvaluator {
  readonly model: string;
  readonly effort: DialogueEffort;
  private readonly now: () => Date;
  private readonly providedClient: OpenAI | undefined;

  constructor(options: OpenAIDialogueEvaluatorOptions = {}) {
    this.model =
      options.model ??
      process.env['DIALOGUE_EXPERIMENT_OPENAI_MODEL'] ??
      DEFAULT_DIALOGUE_OPENAI_MODEL;
    this.effort =
      options.effort ?? parseEffort(process.env['DIALOGUE_EXPERIMENT_EFFORT']) ?? 'medium';
    this.now = options.now ?? (() => new Date());
    this.providedClient = options.client;
  }

  async evaluate(input: DialogueEvaluationInput): Promise<DialogueEvaluationCall> {
    const calledAt = this.now().toISOString();
    const started = performance.now();
    let measuredUsage:
      | {
          readonly inputTokens: number;
          readonly outputTokens: number;
          readonly cacheReadTokens: number;
        }
      | undefined;
    try {
      const response = await (this.providedClient ?? getOpenAIClient()).responses.parse({
        model: this.model,
        instructions: loadDialoguePrompt(),
        input: evaluatorPayload(input),
        reasoning: { effort: this.effort },
        max_output_tokens: 6000,
        store: false,
        text: {
          format: zodTextFormat(
            OpenAIEvaluationResultOutputSchema,
            'dialogue_evaluation_result',
          ),
        },
      });

      if (response.output_parsed === null) {
        throw new Error('dialogue evaluation: structured output parsing failed');
      }
      const usage = response.usage;
      const cacheReadTokens = usage?.input_tokens_details.cached_tokens ?? 0;
      measuredUsage = {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cacheReadTokens,
      };
      let result: EvaluationResult;
      try {
        result = validateEvaluationResult(normalizeOpenAIOutput(response.output_parsed), {
          canAskQuestion: input.questionsAsked < input.maxQuestions,
          expectedTurn: input.turn,
          gold: input.gold,
        });
        assertRelationIds(result, input.gold);
      } catch (error) {
        throw new DialogueEvaluationContractError(error, response.output_parsed);
      }

      const durationMs = Math.round(performance.now() - started);
      recordMetric({
        ts: calledAt,
        op: 'dialogue-experiment',
        model: this.model,
        effort: this.effort,
        paragraphId: input.gold.paragraphId,
        inputTokens: measuredUsage.inputTokens,
        outputTokens: measuredUsage.outputTokens,
        ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
        ms: durationMs,
      });

      return {
        result,
        call: {
          provider: 'openai',
          model: this.model,
          effort: this.effort,
          promptVersion: DIALOGUE_PROMPT_VERSION,
          schemaVersion: DIALOGUE_SCHEMA_VERSION,
          goldVersion: input.goldVersion,
          goldHash: input.goldHash,
          calledAt,
          durationMs,
          usage: {
            inputTokens: usage?.input_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? 0,
            ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
          },
        },
      };
    } catch (error) {
      recordMetric({
        ts: calledAt,
        op: 'dialogue-experiment',
        model: this.model,
        effort: this.effort,
        paragraphId: input.gold.paragraphId,
        inputTokens: measuredUsage?.inputTokens ?? 0,
        outputTokens: measuredUsage?.outputTokens ?? 0,
        ...(measuredUsage === undefined || measuredUsage.cacheReadTokens === 0
          ? {}
          : { cacheReadTokens: measuredUsage.cacheReadTokens }),
        ms: Math.round(performance.now() - started),
        error: openAIErrorMetric(error),
      });
      throw error;
    }
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
