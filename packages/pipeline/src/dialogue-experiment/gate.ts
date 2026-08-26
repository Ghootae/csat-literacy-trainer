import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

import { recordMetric } from '../llm/client.js';
import type {
  DialogueCallAttemptMetadata,
  DialogueCallMetadata,
  DialogueEffort,
  DialogueEvaluationInput,
} from './evaluator.js';
import { parseEffort } from './evaluator.js';
import { CentralAxisStateSchema, EvidenceSourceSchema } from './schema.js';

export const CENTRAL_STORY_GATE_PROMPT_VERSION = 'central-story-gate-prompt-v1';
export const CENTRAL_STORY_GATE_SCHEMA_VERSION = 'central-story-gate-openai-v2';

export const CentralStoryGateResultSchema = z.object({
  status: z.enum(['CAPTURED', 'UNCLEAR', 'DISTORTED']),
  effectiveResponse: z.string().min(1),
  centralObjectRepresentation: z.string().nullable(),
  centralStoryRepresentation: z.string().nullable(),
  expressedClaims: z.array(z.object({
    description: z.string().min(1),
    source: EvidenceSourceSchema,
    evidence: z.string().min(1),
  })),
  axisStates: z.array(z.object({
    axisId: z.string().min(1),
    state: CentralAxisStateSchema,
    evidence: z.array(z.object({
      source: EvidenceSourceSchema,
      evidence: z.string().min(1),
    })),
  })),
  targetAxisId: z.string().nullable(),
  decisionSummary: z.string().min(1),
});

export type CentralStoryGateResult = z.infer<typeof CentralStoryGateResultSchema>;

export interface CentralStoryGateCall {
  readonly result: CentralStoryGateResult;
  readonly call: DialogueCallMetadata;
}

export interface CentralStoryGateEvaluator {
  evaluate(input: DialogueEvaluationInput): Promise<CentralStoryGateCall>;
}

export interface OpenAICentralStoryGateEvaluatorOptions {
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly timeoutMs?: number;
  readonly maxTransportRetries?: number;
  readonly retryDelayMs?: number;
  readonly client?: OpenAI;
}

let gateClient: OpenAI | undefined;

function client(): OpenAI {
  gateClient ??= new OpenAI({ maxRetries: 0 });
  return gateClient;
}

export function loadCentralStoryGatePrompt(): string {
  return readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/experiments/dialogue/central-story-gate-prompt-v1.md',
  ), 'utf8').trim();
}

function payload(input: DialogueEvaluationInput): string {
  return JSON.stringify({
    paragraphText: input.gold.paragraphText,
    centralStory: input.gold.centralStory,
    centralAxes: input.gold.centralAxes,
    evidence: {
      initialResponse: input.initialResponse,
      followUpExchanges: input.history,
      previousAxisStates: input.previousSnapshot?.axisStates ?? null,
    },
    turn: input.turn,
  }, null, 2);
}

function validateGateResult(
  result: CentralStoryGateResult,
  input: DialogueEvaluationInput,
): CentralStoryGateResult {
  const allowed = new Set(input.gold.centralAxes.map((axis) => axis.id));
  const returned = result.axisStates.map((axis) => axis.axisId);
  if (returned.length !== allowed.size || new Set(returned).size !== returned.length) {
    throw new Error('central story gate: axisStates must contain every central axis once');
  }
  for (const id of returned) {
    if (!allowed.has(id)) throw new Error(`central story gate: unknown axisId ${id}`);
  }

  for (const axis of result.axisStates) {
    if (axis.state === 'unknown' && axis.evidence.length > 0) {
      throw new Error('central story gate: unknown axis must not include evidence');
    }
    if (axis.state !== 'unknown' && axis.evidence.length === 0) {
      throw new Error('central story gate: known axis requires evidence');
    }
  }

  const previous = new Map(
    (input.previousSnapshot?.axisStates ?? []).map((axis) => [axis.axisId, axis]),
  );
  const axisStates = result.axisStates.map((axis) => {
    const prior = previous.get(axis.axisId);
    if (prior === undefined || prior.state === axis.state) return axis;
    const hasNewEvidence = axis.evidence.some((item) => item.source !== 'initial');
    return hasNewEvidence ? axis : prior;
  });

  const distorted = axisStates.filter((axis) => axis.state === 'distorted');
  const unknown = axisStates.filter((axis) => axis.state === 'unknown');
  const partial = axisStates.filter((axis) => axis.state === 'partial');
  const expectedStatus = distorted.length > 0
    ? 'DISTORTED'
    : unknown.length === 0 && partial.length === 0
      ? 'CAPTURED'
      : 'UNCLEAR';
  if (expectedStatus === 'CAPTURED') {
    return { ...result, status: expectedStatus, axisStates, targetAxisId: null };
  }

  const candidates = distorted.length > 0 ? distorted : unknown.length > 0 ? unknown : partial;
  const targetAxisId = candidates.some((axis) => axis.axisId === result.targetAxisId)
    ? result.targetAxisId
    : candidates[0]!.axisId;
  return { ...result, status: expectedStatus, axisStates, targetAxisId };
}

function retryable(error: unknown): boolean {
  return error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.InternalServerError ||
    error instanceof OpenAI.APIConnectionError;
}

function errorType(error: unknown): NonNullable<DialogueCallAttemptMetadata['error']> {
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  return {
    ...(status === undefined ? {} : { status }),
    type: error instanceof Error ? error.name : 'unknown',
    retryable: retryable(error),
  };
}

export class OpenAICentralStoryGateEvaluator implements CentralStoryGateEvaluator {
  readonly model: string;
  readonly effort: DialogueEffort;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly retryDelayMs: number;
  private readonly providedClient: OpenAI | undefined;

  constructor(options: OpenAICentralStoryGateEvaluatorOptions = {}) {
    this.model = options.model ?? process.env['DIALOGUE_EXPERIMENT_OPENAI_MODEL'] ?? 'gpt-5.6-terra';
    this.effort = options.effort ?? parseEffort(process.env['DIALOGUE_EXPERIMENT_EFFORT']) ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.providedClient = options.client;
  }

  async evaluate(input: DialogueEvaluationInput): Promise<CentralStoryGateCall> {
    const calledAt = new Date().toISOString();
    const started = performance.now();
    const attempts: DialogueCallAttemptMetadata[] = [];

    for (let attempt = 1; attempt <= this.maxTransportRetries + 1; attempt += 1) {
      const attemptCalledAt = new Date().toISOString();
      const attemptStarted = performance.now();
      try {
        const response = await (this.providedClient ?? client()).responses.parse({
          model: this.model,
          instructions: loadCentralStoryGatePrompt(),
          input: payload(input),
          reasoning: { effort: this.effort },
          max_output_tokens: 3_000,
          store: false,
          text: {
            format: zodTextFormat(CentralStoryGateResultSchema, 'central_story_gate_result'),
          },
        }, { timeout: this.timeoutMs, maxRetries: 0 });
        if (response.output_parsed === null) {
          throw new Error('central story gate: structured output parsing failed');
        }
        const result = validateGateResult(
          CentralStoryGateResultSchema.parse(response.output_parsed),
          input,
        );
        const durationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({
          attempt,
          calledAt: attemptCalledAt,
          durationMs,
          outcome: 'success',
        });
        const usage = response.usage;
        const cacheWriteTokens = usage?.input_tokens_details.cache_write_tokens ?? 0;
        const cacheReadTokens = usage?.input_tokens_details.cached_tokens ?? 0;
        recordMetric({
          ts: attemptCalledAt,
          op: 'dialogue-experiment',
          model: this.model,
          effort: this.effort,
          paragraphId: input.gold.paragraphId,
          inputTokens: usage?.input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          ...(cacheWriteTokens === 0 ? {} : { cacheWriteTokens }),
          ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
          ms: durationMs,
          attempt,
        });
        return {
          result,
          call: {
            provider: 'openai',
            model: this.model,
            effort: this.effort,
            promptVersion: CENTRAL_STORY_GATE_PROMPT_VERSION,
            schemaVersion: CENTRAL_STORY_GATE_SCHEMA_VERSION,
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
        const metadata = errorType(error);
        attempts.push({
          attempt,
          calledAt: attemptCalledAt,
          durationMs: Math.round(performance.now() - attemptStarted),
          outcome: 'error',
          error: metadata,
        });
        if (!metadata.retryable || attempt > this.maxTransportRetries) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
    throw new Error('central story gate: retry loop exhausted');
  }
}
