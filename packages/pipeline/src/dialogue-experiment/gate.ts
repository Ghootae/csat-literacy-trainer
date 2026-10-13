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
import { AxisFeedbackSchema, CentralAxisStateSchema, ClaimLedgerEntrySchema, ErrorClaimSchema, EvidenceSourceSchema } from './schema.js';
import { currentClaimsFromLedger } from './claim-recording.js';
import { validateErrorClaims } from './error-recording.js';

export const CENTRAL_STORY_GATE_PROMPT_VERSION = 'central-story-gate-prompt-v3';
export const CENTRAL_STORY_GATE_SCHEMA_VERSION = 'central-story-gate-openai-v4';

const GateEvidenceSchema = z.object({
  source: EvidenceSourceSchema,
  evidence: z.string().min(1),
});

export const CentralStoryGateResultSchema = z.object({
  status: z.enum(['CAPTURED', 'UNCLEAR', 'DISTORTED']),
  responseInformationLevel: z.enum(['RELATIONAL', 'TOPIC_ONLY', 'NONE']),
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
    evidence: z.array(GateEvidenceSchema),
    retractionEvidence: z.array(GateEvidenceSchema),
  })),
  missingAxisEvidence: z.array(z.object({
    axisId: z.string().min(1),
    axisQuote: z.string().min(1),
  })),
  targetAxisId: z.string().nullable(),
  decisionSummary: z.string().min(1),
});

export const CentralStoryGateV31ResultSchema = CentralStoryGateResultSchema.extend({
  questionIntent: z.string().min(1).nullable(),
});
export const CentralStoryGateV4ResultSchema = CentralStoryGateV31ResultSchema.extend({
  axisFeedback: z.array(AxisFeedbackSchema),
});
export const CentralStoryGateV4StoredResultSchema = CentralStoryGateV4ResultSchema.extend({
  claimLedger: z.array(ClaimLedgerEntrySchema).optional(),
  errorClaims: z.array(ErrorClaimSchema).optional(),
});
// One canonical claim ledger on the wire; expressedClaims is an application projection.
export const CentralStoryGateV4ClaimsResultSchema = CentralStoryGateV4ResultSchema.omit({ expressedClaims: true }).extend({
  claimLedger: z.array(ClaimLedgerEntrySchema),
});
export const CentralStoryGateV4ErrorClaimsResultSchema = CentralStoryGateV4ClaimsResultSchema.extend({
  errorClaims: z.array(ErrorClaimSchema),
});

export type CentralStoryGateResult = z.infer<typeof CentralStoryGateResultSchema> & {
  readonly questionIntent?: string | null;
  readonly axisFeedback?: z.infer<typeof AxisFeedbackSchema>[];
  readonly claimLedger?: z.infer<typeof ClaimLedgerEntrySchema>[] | undefined;
  readonly errorClaims?: z.infer<typeof ErrorClaimSchema>[] | undefined;
};
export type CentralStoryGateWireResult = CentralStoryGateResult | (z.infer<typeof CentralStoryGateV4ClaimsResultSchema> & {
  errorClaims?: z.infer<typeof ErrorClaimSchema>[] | undefined;
});

export interface CentralStoryGateNormalizationEvent {
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly reason: string;
}

export interface ValidatedCentralStoryGateResult {
  readonly result: CentralStoryGateResult;
  readonly normalizationEvents: readonly CentralStoryGateNormalizationEvent[];
}

export interface CentralStoryGateCall {
  readonly result: CentralStoryGateResult;
  readonly call: DialogueCallMetadata;
}

export interface CentralStoryGateEvaluator {
  evaluate(input: DialogueEvaluationInput): Promise<CentralStoryGateCall>;
}

export interface OpenAICentralStoryGateEvaluatorOptions {
  /** Full frozen experimental instructions, including the claim/error recording contract. */
  readonly instructionsOverride?: string;
  readonly promptVersionOverride?: string;
  /** Direct callers retain legacy v3; the student TwoStage runtime explicitly selects v4. */
  readonly promptRevision?: 'v3' | 'v3.1' | 'v4';
  /** False preserves the original v4 wire contract for frozen experiments. */
  readonly recordClaimLifecycle?: boolean;
  /** False preserves claims-v1 for historical replay; defaults to true with claim lifecycle. */
  readonly recordErrorEvidence?: boolean;
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly timeoutMs?: number;
  readonly maxTransportRetries?: number;
  readonly maxContractRetries?: number;
  readonly retryDelayMs?: number;
  readonly client?: OpenAI;
}

let gateClient: OpenAI | undefined;

function client(): OpenAI {
  gateClient ??= new OpenAI({ maxRetries: 0 });
  return gateClient;
}

export function loadCentralStoryGatePrompt(revision: 'v3' | 'v3.1' | 'v4' = 'v3'): string {
  return readFileSync(resolve(
    process.cwd(),
    `packages/pipeline/experiments/dialogue/central-story-gate-prompt-${revision}.md`,
  ), 'utf8').trim();
}

interface GateContractCorrection {
  readonly validationError: string;
  readonly previousInvalidOutput: CentralStoryGateWireResult;
}

export function buildCentralStoryGatePayload(
  input: DialogueEvaluationInput,
  contractCorrection?: GateContractCorrection,
): string {
  return JSON.stringify({
    paragraphText: input.gold.paragraphText,
    centralAxes: input.gold.centralAxes.map(({ id, description }) => ({ id, description })),
    evidence: {
      initialResponse: input.initialResponse,
      followUpExchanges: input.history,
      previousAxisStates: input.previousSnapshot?.axisStates ?? null,
    },
    turn: input.turn,
    ...(input.shownSourceGuides?.length ? { shownSourceGuides: input.shownSourceGuides,
      sourceGuideBoundary: '원문 위치 안내는 제공된 도움이며 학생의 독립 이해 근거가 아니다. 학생 발화에 합치지 않는다.' } : {}),
    ...(input.revealedAxisContent === undefined ? {} : { revealedAxisContent: input.revealedAxisContent }),
    ...(contractCorrection === undefined ? {} : { contractCorrection }),
  }, null, 2);
}

export class CentralStoryGateContractError extends Error {
  readonly parsedOutput: CentralStoryGateWireResult;

  constructor(message: string, parsedOutput: CentralStoryGateWireResult) {
    super(message);
    this.name = 'CentralStoryGateContractError';
    this.parsedOutput = structuredClone(parsedOutput);
  }
}

function hasCurrentTurnEvidence(
  evidence: readonly {
    readonly source: 'initial' | 'diagnostic' | 'corrective';
    readonly evidence: string;
  }[],
  input: DialogueEvaluationInput,
): boolean {
  const latest = input.history.at(-1);
  if (latest === undefined) return false;
  const expectedSource = latest.question.type === 'CORRECTIVE' ? 'corrective' : 'diagnostic';
  const unwrapQuotation = (value: string): string => {
    const trimmed = value.trim();
    const pairs = new Map([
      ['"', '"'],
      ["'", "'"],
      ['“', '”'],
      ['‘', '’'],
    ]);
    const closing = pairs.get(trimmed[0] ?? '');
    return closing !== undefined && trimmed.endsWith(closing)
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  };
  return evidence.some((item) =>
    item.source === expectedSource && latest.answer.includes(unwrapQuotation(item.evidence))
  );
}

export function validateCentralStoryGateResult(
  rawResult: CentralStoryGateWireResult,
  input: DialogueEvaluationInput,
): ValidatedCentralStoryGateResult {
  const normalizationEvents: CentralStoryGateNormalizationEvent[] = [];
  let result: CentralStoryGateResult;
  if (rawResult.claimLedger !== undefined) {
    try {
      const expressedClaims = currentClaimsFromLedger(rawResult.claimLedger, input);
      result = { ...rawResult, expressedClaims };
      normalizationEvents.push({ field: 'expressedClaims', before: null, after: expressedClaims,
        reason: 'claimLedger의 current 주장만 현재 목록으로 투영했다. 과거 주장·수정 근거는 claimLedger에 보존한다.' });
    } catch (error) {
      throw new CentralStoryGateContractError(String(error), rawResult);
    }
  } else {
    result = rawResult as CentralStoryGateResult;
  }
  if (result.errorClaims !== undefined) {
    try {
      validateErrorClaims(result.errorClaims, result.claimLedger, result.axisStates);
    } catch (error) {
      throw new CentralStoryGateContractError(String(error), rawResult);
    }
  }
  if (result.questionIntent !== undefined &&
    (result.status === 'CAPTURED' ? result.questionIntent !== null : !result.questionIntent?.trim())) {
    throw new CentralStoryGateContractError(
      'questionIntent must be null for CAPTURED and nonempty for UNCLEAR/DISTORTED.', result,
    );
  }
  const allowed = new Set(input.gold.centralAxes.map((axis) => axis.id));
  if (result.axisFeedback !== undefined) {
    const feedback = result.axisFeedback;
    if (feedback.length !== allowed.size || new Set(feedback.map((item) => item.axisId)).size !== allowed.size) {
      throw new CentralStoryGateContractError('axisFeedback must contain every axis exactly once.', result);
    }
    for (const item of feedback) {
      const axis = result.axisStates.find((candidate) => candidate.axisId === item.axisId);
      const expected = axis?.state === 'captured' ? 'PASS' : axis?.state === 'distorted' ? 'ERROR' : null;
      if (!allowed.has(item.axisId) || !axis || (expected !== null ? item.status !== expected
        : !['UNCLEAR_OK', 'UNCLEAR_SERIOUS'].includes(item.status))) {
        throw new CentralStoryGateContractError('axisFeedback status must agree with axisStates.', result);
      }
      const visible = item.status === 'PASS' || item.status === 'UNCLEAR_OK';
      if ((visible && !item.revealedText?.trim()) || (!visible && item.revealedText !== null) ||
        (visible && axis.evidence.length === 0)) {
        throw new CentralStoryGateContractError('Only evidenced PASS/UNCLEAR_OK may reveal nonempty text.', result);
      }
    }
    if (result.status !== 'CAPTURED') {
      const priority = feedback.some((item) => item.status === 'ERROR') ? 'ERROR'
        : feedback.some((item) => item.status === 'UNCLEAR_SERIOUS') ? 'UNCLEAR_SERIOUS' : 'UNCLEAR_OK';
      if (!feedback.some((item) => item.axisId === result.targetAxisId && item.status === priority)) {
        throw new CentralStoryGateContractError('Target priority is ERROR, then UNCLEAR_SERIOUS, then UNCLEAR_OK. Preserve questionIntent for that target.', result);
      }
    }
  }
  const returned = result.axisStates.map((axis) => axis.axisId);
  if (returned.length !== allowed.size || new Set(returned).size !== returned.length) {
    throw new Error('central story gate: axisStates must contain every central axis once');
  }
  for (const id of returned) {
    if (!allowed.has(id)) throw new Error(`central story gate: unknown axisId ${id}`);
  }

  // Verifies provenance only; semantic scope remains a model/review responsibility.
  const missing = result.axisStates.filter((axis) => axis.state === 'partial' || axis.state === 'unknown');
  const refs = result.missingAxisEvidence;
  if (refs.length !== missing.length || new Set(refs.map((ref) => ref.axisId)).size !== refs.length ||
    refs.some((ref) => !missing.some((axis) => axis.axisId === ref.axisId) ||
      !ref.axisQuote.trim() ||
      !input.gold.centralAxes.find((axis) => axis.id === ref.axisId)?.description.includes(ref.axisQuote))) {
    throw new CentralStoryGateContractError(
      'missingAxisEvidence must cite an exact nonempty substring of each partial/unknown axis description once; ' +
      'do not cite paragraphText or infer additional requirements from it.', result,
    );
  }

  for (const axis of result.axisStates) {
    if (axis.state === 'unknown' && axis.evidence.length > 0) {
      throw new Error('central story gate: unknown axis must not include evidence');
    }
    if (axis.state !== 'unknown' && axis.evidence.length === 0) {
      throw new Error('central story gate: known axis requires evidence');
    }
  }

  const sanitizedAxisStates = result.axisStates.map((axis) => {
    const retractionEvidence = axis.retractionEvidence.filter((item) => item.source !== 'initial');
    if (retractionEvidence.length !== axis.retractionEvidence.length) {
      normalizationEvents.push({
        field: `axisStates.${axis.axisId}.retractionEvidence`,
        before: axis.retractionEvidence,
        after: retractionEvidence,
        reason: '철회는 후속 학생 답변에서만 성립하므로 최초 응답으로 표기된 철회 근거를 제거했다.',
      });
    }
    return { ...axis, retractionEvidence };
  });

  const previous = new Map(
    (input.previousSnapshot?.axisStates ?? []).map((axis) => [axis.axisId, axis]),
  );
  for (const axis of sanitizedAxisStates) {
    const prior = previous.get(axis.axisId);
    if (prior === undefined || prior.state === axis.state) continue;
    const hasNewEvidence = hasCurrentTurnEvidence(axis.evidence, input);
    const hasRetraction = hasCurrentTurnEvidence(axis.retractionEvidence, input);
    const transitionAllowed = axis.state === 'captured'
      ? hasNewEvidence
      : axis.state === 'unknown'
        ? hasRetraction
        : hasNewEvidence || hasRetraction;
    if (transitionAllowed) continue;

    throw new CentralStoryGateContractError(
      `axisStates.${axis.axisId}.state changed from ${prior.state} to ${axis.state} ` +
      'without current-turn evidence or explicit retraction. ' +
      'Either cite a short exact phrase from the latest student answer with the correct source, ' +
      'or keep the previous axis state. Do not infer missing understanding from the gold.',
      result,
    );
  }
  const axisStates = sanitizedAxisStates;

  const distorted = axisStates.filter((axis) => axis.state === 'distorted');
  const unknown = axisStates.filter((axis) => axis.state === 'unknown');
  const partial = axisStates.filter((axis) => axis.state === 'partial');
  const expectedStatus = distorted.length > 0
    ? 'DISTORTED'
    : unknown.length === 0 && partial.length === 0
      ? 'CAPTURED'
      : 'UNCLEAR';
  if (result.status !== expectedStatus) {
    throw new CentralStoryGateContractError(
      `status ${result.status} conflicts with axisStates; expected ${expectedStatus}. ` +
      'Return a status that matches the axis states instead of relying on post-processing.',
      result,
    );
  }
  if (expectedStatus === 'CAPTURED') {
    if (result.targetAxisId !== null) {
      normalizationEvents.push({
        field: 'targetAxisId',
        before: result.targetAxisId,
        after: null,
        reason: 'CAPTURED 상태에는 질문 대상 축이 없어야 한다.',
      });
    }
    return {
      result: { ...result, status: expectedStatus, axisStates, targetAxisId: null },
      normalizationEvents,
    };
  }

  const candidates = distorted.length > 0
    ? distorted
    : axisStates.filter((axis) => axis.state === 'unknown' || axis.state === 'partial');
  const targetAxisId = candidates.some((axis) => axis.axisId === result.targetAxisId)
    ? result.targetAxisId
    : candidates[0]!.axisId;
  if (targetAxisId !== result.targetAxisId) {
    normalizationEvents.push({
      field: 'targetAxisId',
      before: result.targetAxisId,
      after: targetAxisId,
      reason: distorted.length > 0
        ? '명시적 오류가 있으면 distorted 축 중 하나를 먼저 선택해야 한다.'
        : '질문 대상은 unknown 또는 partial 축이어야 하며 captured 축이나 알 수 없는 ID는 선택할 수 없다.',
    });
  }
  return {
    result: { ...result, status: expectedStatus, axisStates, targetAxisId },
    normalizationEvents,
  };
}

function retryable(error: unknown): boolean {
  return error instanceof CentralStoryGateContractError ||
    error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.InternalServerError ||
    error instanceof OpenAI.APIConnectionError;
}

function errorType(error: unknown): NonNullable<DialogueCallAttemptMetadata['error']> {
  if (error instanceof CentralStoryGateContractError) {
    return { type: 'contract_validation', retryable: true };
  }
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  return {
    ...(status === undefined ? {} : { status }),
    type: error instanceof Error ? error.name : 'unknown',
    retryable: retryable(error),
  };
}

export class OpenAICentralStoryGateEvaluator implements CentralStoryGateEvaluator {
  private readonly instructionsOverride: string | undefined;
  private readonly promptVersionOverride: string | undefined;
  readonly promptRevision: 'v3' | 'v3.1' | 'v4';
  readonly recordClaimLifecycle: boolean;
  readonly recordErrorEvidence: boolean;
  readonly model: string;
  readonly effort: DialogueEffort;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly maxContractRetries: number;
  private readonly retryDelayMs: number;
  private readonly providedClient: OpenAI | undefined;

  constructor(options: OpenAICentralStoryGateEvaluatorOptions = {}) {
    this.instructionsOverride = options.instructionsOverride;
    this.promptVersionOverride = options.promptVersionOverride;
    this.promptRevision = options.promptRevision ?? 'v3';
    this.recordClaimLifecycle = this.promptRevision === 'v4' && (options.recordClaimLifecycle ?? true);
    this.recordErrorEvidence = this.recordClaimLifecycle && (options.recordErrorEvidence ?? true);
    this.model = options.model ?? process.env['DIALOGUE_EXPERIMENT_OPENAI_MODEL'] ?? 'gpt-5.6-terra';
    this.effort = options.effort ?? parseEffort(process.env['DIALOGUE_EXPERIMENT_EFFORT']) ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.maxContractRetries = options.maxContractRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.providedClient = options.client;
  }

  async evaluate(input: DialogueEvaluationInput): Promise<CentralStoryGateCall> {
    const calledAt = new Date().toISOString();
    const started = performance.now();
    const attempts: DialogueCallAttemptMetadata[] = [];
    const contractFailures: {
      attempt: number;
      validationError: string;
      rawResult: CentralStoryGateWireResult;
    }[] = [];
    let transportRetriesUsed = 0;
    let contractRetriesUsed = 0;
    let contractCorrection: GateContractCorrection | undefined;
    const resultSchema = this.recordErrorEvidence ? CentralStoryGateV4ErrorClaimsResultSchema : this.recordClaimLifecycle ? CentralStoryGateV4ClaimsResultSchema : this.promptRevision === 'v4' ? CentralStoryGateV4ResultSchema : this.promptRevision === 'v3.1'
      ? CentralStoryGateV31ResultSchema : CentralStoryGateResultSchema;

    const maxAttempts = this.maxTransportRetries + this.maxContractRetries + 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const attemptCalledAt = new Date().toISOString();
      const attemptStarted = performance.now();
      try {
        const response = await (this.providedClient ?? client()).responses.parse({
          model: this.model,
          instructions: this.instructionsOverride ?? (loadCentralStoryGatePrompt(this.promptRevision) + (this.recordClaimLifecycle
            ? '\n\n' + readFileSync(resolve(process.cwd(), 'packages/pipeline/experiments/dialogue/current-claims-recording-v1.md'), 'utf8').trim() : '') + (this.recordErrorEvidence
            ? '\n\n' + readFileSync(resolve(process.cwd(), 'packages/pipeline/experiments/dialogue/error-claims-recording-v1.md'), 'utf8').trim() : '')),
          input: buildCentralStoryGatePayload(input, contractCorrection),
          reasoning: { effort: this.effort },
          max_output_tokens: this.promptRevision === 'v4' ? 4_000 : 3_000,
          store: false,
          text: {
            format: zodTextFormat(resultSchema, 'central_story_gate_result'),
          },
        }, { timeout: this.timeoutMs, maxRetries: 0 });
        if (response.output_parsed === null) {
          throw new Error('central story gate: structured output parsing failed');
        }
        const rawResult = resultSchema.parse(response.output_parsed);
        let validated: ValidatedCentralStoryGateResult;
        try {
          validated = validateCentralStoryGateResult(rawResult, input);
        } catch (error) {
          if (error instanceof CentralStoryGateContractError) throw new CentralStoryGateContractError(error.message, rawResult);
          throw error;
        }
        const result = validated.result;
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
            promptVersion: this.promptVersionOverride ?? `central-story-gate-prompt-${this.promptRevision}${this.recordErrorEvidence ? '-claims-v2' : this.recordClaimLifecycle ? '-claims-v1' : ''}`,
            schemaVersion: this.recordErrorEvidence ? 'central-story-gate-openai-v8' : this.recordClaimLifecycle ? 'central-story-gate-openai-v7' : this.promptRevision === 'v4' ? 'central-story-gate-openai-v6' : this.promptRevision === 'v3.1' ? 'central-story-gate-openai-v5' : CENTRAL_STORY_GATE_SCHEMA_VERSION,
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
            decisionAudit: {
              rawResult: structuredClone(rawResult),
              validatedResult: structuredClone(result),
              ...(contractFailures.length === 0
                ? {}
                : { contractFailures: structuredClone(contractFailures) }),
              normalizationEvents: structuredClone(validated.normalizationEvents),
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
        if (error instanceof CentralStoryGateContractError) {
          contractFailures.push({
            attempt,
            validationError: error.message,
            rawResult: structuredClone(error.parsedOutput),
          });
          if (contractRetriesUsed >= this.maxContractRetries) throw error;
          contractRetriesUsed += 1;
          contractCorrection = {
            validationError: error.message,
            previousInvalidOutput: structuredClone(error.parsedOutput),
          };
          await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
          continue;
        }
        if (!metadata.retryable || transportRetriesUsed >= this.maxTransportRetries) throw error;
        transportRetriesUsed += 1;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
    throw new Error('central story gate: retry loop exhausted');
  }
}
