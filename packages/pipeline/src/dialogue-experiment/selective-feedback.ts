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
import type { CentralStoryGateResult } from './gate.js';
import type { ParagraphDiagnosticGold, SourceGuide } from './schema.js';

export const SELECTIVE_FEEDBACK_PROMPT_VERSION = 'dialogue-selective-feedback-prompt-v3';
export const SELECTIVE_FEEDBACK_SCHEMA_VERSION = 'dialogue-selective-feedback-openai-v2';

export const UnclearRouteSchema = z.enum(['TARGETED_GAP', 'SPARSE_GAP']);
export type UnclearRoute = z.infer<typeof UnclearRouteSchema>;
export type SelectiveFeedbackRoute = 'ERROR' | UnclearRoute;

export interface SelectedDetailedRelation {
  readonly id: string;
  readonly description: string;
}

export interface SelectiveFeedbackInput {
  readonly dialogue: DialogueEvaluationInput;
  readonly gateDecision: CentralStoryGateResult;
  readonly route: SelectiveFeedbackRoute;
  readonly selectedDetailedRelation: SelectedDetailedRelation | null;
}

export const SelectiveFeedbackOutputSchema = z.object({
  route: z.enum(['ERROR', 'TARGETED_GAP', 'SPARSE_GAP']),
  targetAxisId: z.string().min(1),
  selectedRelationId: z.string().min(1).nullable(),
  targetDescription: z.string().min(1),
  studentFeedback: z.string().min(1),
  nextQuestion: z.object({
    type: z.enum(['DIAGNOSTIC', 'CORRECTIVE']),
    text: z.string().min(1),
  }).nullable(),
});

const SourceQuoteSchema = z.object({ quote: z.string().min(1), occurrence: z.number().int().nonnegative() });
export const SelectiveFeedbackGuidedOutputSchema = SelectiveFeedbackOutputSchema.extend({ sourceQuote: SourceQuoteSchema.nullable() });
export type SelectiveFeedbackOutput = z.infer<typeof SelectiveFeedbackOutputSchema> & { sourceGuide?: SourceGuide | null };

/** Invalid optional guidance is omitted, never used to change a verdict or block a valid question. */
export function locateSourceGuide(value: unknown, input: SelectiveFeedbackInput): SourceGuide | null {
  const target = input.gateDecision.axisFeedback?.find((axis) => axis.axisId === input.gateDecision.targetAxisId);
  if (target?.status !== 'UNCLEAR_SERIOUS' || input.route === 'ERROR' || input.dialogue.questionsAsked >= input.dialogue.maxQuestions) return null;
  const parsed = SourceQuoteSchema.safeParse(value);
  if (!parsed.success || !parsed.data.quote.trim()) return null;
  const { quote, occurrence } = parsed.data;
  const text = input.dialogue.gold.paragraphText;
  let start = -1;
  for (let n = 0; n <= occurrence; n++) {
    start = text.indexOf(quote, start + 1);
    if (start < 0) return null;
  }
  return { axisId: target.axisId, quote, start, end: start + quote.length };
}

export const TERMINAL_UNRESOLVED_STUDENT_FEEDBACK =
  '이번 답변만으로는 문단의 핵심 이해를 충분히 확인하지 못했습니다.';

export function selectiveStudentFeedback(
  route: SelectiveFeedbackRoute,
  canAskQuestion = true,
): string {
  if (!canAskQuestion) return TERMINAL_UNRESOLVED_STUDENT_FEEDBACK;
  return route === 'ERROR'
    ? '말한 내용 중 한 부분을 원문과 다시 비교해 봅시다.'
    : '말한 내용에서 한 가지를 더 확인해 볼게요.';
}

export interface SelectiveFeedbackCall {
  readonly result: SelectiveFeedbackOutput;
  readonly call: DialogueCallMetadata;
}

export interface SelectiveFeedbackEvaluator {
  evaluate(input: SelectiveFeedbackInput): Promise<SelectiveFeedbackCall>;
}

export interface OpenAISelectiveFeedbackEvaluatorOptions {
  readonly includeSourceGuide?: boolean;
  readonly promptRevision?: 'v3' | 'v3.1' | 'v4';
  readonly model?: string;
  readonly effort?: DialogueEffort;
  readonly timeoutMs?: number;
  readonly maxTransportRetries?: number;
  readonly retryDelayMs?: number;
  readonly client?: OpenAI;
}

/**
 * UNCLEAR 세부 경로는 모델에 상세 골드를 보여 주기 전에 코드가 결정한다.
 * 일부 축이 이미 포착됐거나 partial이면 간결 자료만으로 질문할 수 있다.
 * 포착된 축 없이 여러 축이 unknown인 경우에만 상세 관계 선택을 허용한다.
 */
export function selectDialogueFeedbackRoute(
  gate: CentralStoryGateResult,
): 'PASS' | SelectiveFeedbackRoute {
  if (gate.status === 'CAPTURED') return 'PASS';
  if (gate.status === 'DISTORTED') return 'ERROR';

  if (gate.responseInformationLevel !== 'RELATIONAL') return 'SPARSE_GAP';

  const capturedOrPartial = gate.axisStates.some(
    (axis) => axis.state === 'captured' || axis.state === 'partial',
  );
  const unknownCount = gate.axisStates.filter((axis) => axis.state === 'unknown').length;
  return capturedOrPartial || unknownCount <= 1 ? 'TARGETED_GAP' : 'SPARSE_GAP';
}

function previouslyTargetedRelationIds(input: DialogueEvaluationInput): Set<string> {
  return new Set(input.history.flatMap((entry) => entry.targetRelationIds ?? []));
}

/**
 * SPARSE_GAP에서도 질문 생성기에는 상세 관계 하나만 전달한다. 같은 관계를 이미
 * 질문했다면 다음 미질문 관계를 우선하고, required 표지가 있는 관계를 먼저 쓴다.
 */
export function selectSparseDetailedRelation(
  gold: ParagraphDiagnosticGold,
  gate: CentralStoryGateResult,
  dialogue: DialogueEvaluationInput,
): SelectedDetailedRelation {
  if (gate.targetAxisId === null) {
    throw new Error('selective dialogue: SPARSE_GAP requires targetAxisId');
  }
  const axis = gold.centralAxes.find((candidate) => candidate.id === gate.targetAxisId);
  if (axis === undefined) {
    throw new Error(`selective dialogue: unknown targetAxisId ${gate.targetAxisId}`);
  }
  const relationById = new Map(gold.coreRelations.map((relation) => [relation.id, relation]));
  const candidates = axis.relationIds.map((id) => relationById.get(id)).filter(
    (relation): relation is ParagraphDiagnosticGold['coreRelations'][number] => relation !== undefined,
  );
  if (candidates.length === 0) {
    throw new Error(`selective dialogue: axis ${axis.id} has no detailed relation`);
  }

  const targeted = previouslyTargetedRelationIds(dialogue);
  const untargeted = candidates.filter((relation) => !targeted.has(relation.id));
  const pool = untargeted.length > 0 ? untargeted : candidates;
  const selected = pool.find((relation) => relation.diagnosticRole === 'required') ?? pool[0]!;
  return { id: selected.id, description: selected.description };
}

export function buildSelectiveFeedbackPayload(input: SelectiveFeedbackInput): string {
  const targetAxisId = input.gateDecision.targetAxisId;
  const targetAxis = input.dialogue.gold.centralAxes.find((axis) => axis.id === targetAxisId);
  if (targetAxisId === null || targetAxis === undefined) {
    throw new Error('selective dialogue: feedback requires a valid target axis');
  }
  if (input.route === 'SPARSE_GAP' && input.selectedDetailedRelation === null) {
    throw new Error('selective dialogue: SPARSE_GAP requires one selected detailed relation');
  }
  return JSON.stringify({
    paragraphText: input.dialogue.gold.paragraphText,
    ...(input.dialogue.shownSourceGuides?.length ? { shownSourceGuides: input.dialogue.shownSourceGuides } : {}),
    ...(input.dialogue.revealedAxisContent === undefined ? {} : { revealedAxisContent: input.dialogue.revealedAxisContent }),
    conciseGold: {
      centralAxes: input.dialogue.gold.centralAxes.map(({ id, description }) => ({ id, description })),
    },
    evidence: {
      initialResponse: input.dialogue.initialResponse,
      followUpExchanges: input.dialogue.history.map(({ question, answer }) => ({ question, answer })),
      effectiveResponse: input.gateDecision.effectiveResponse,
      expressedClaims: input.gateDecision.expressedClaims,
    },
    decision: {
      route: input.route,
      targetAxisId,
      targetAxisDescription: targetAxis.description,
      axisStates: input.gateDecision.axisStates,
      ...(input.gateDecision.axisFeedback === undefined ? {} : { targetFeedbackStatus: input.gateDecision.axisFeedback.find((axis) => axis.axisId === targetAxisId)?.status }),
      missingAxisEvidence: input.gateDecision.missingAxisEvidence,
      decisionSummary: input.gateDecision.decisionSummary,
      ...(input.gateDecision.errorClaims === undefined ? {} : {
        explicitErrors: input.gateDecision.errorClaims.filter((error) => error.axisId === targetAxisId),
      }),
      ...(input.gateDecision.questionIntent === undefined ? {} : { questionIntent: input.gateDecision.questionIntent }),
    },
    selectedDetailedRelation: input.route === 'SPARSE_GAP'
      ? input.selectedDetailedRelation
      : null,
    session: {
      turn: input.dialogue.turn,
      questionsAsked: input.dialogue.questionsAsked,
      maxQuestions: input.dialogue.maxQuestions,
      canAskQuestion: input.dialogue.questionsAsked < input.dialogue.maxQuestions,
    },
  }, null, 2);
}

export function validateSelectiveFeedbackOutput(
  value: unknown,
  input: SelectiveFeedbackInput,
): SelectiveFeedbackOutput {
  const output = SelectiveFeedbackOutputSchema.parse(value);
  const targetAxisId = input.gateDecision.targetAxisId;
  if (output.route !== input.route) {
    throw new Error(`selective dialogue: route ${output.route}, expected ${input.route}`);
  }
  if (targetAxisId === null || output.targetAxisId !== targetAxisId) {
    throw new Error('selective dialogue: feedback changed targetAxisId');
  }
  const selectedId = input.selectedDetailedRelation?.id ?? null;
  if (output.selectedRelationId !== selectedId) {
    throw new Error('selective dialogue: feedback changed selectedRelationId');
  }
  const canAsk = input.dialogue.questionsAsked < input.dialogue.maxQuestions;
  if (output.studentFeedback !== selectiveStudentFeedback(input.route, canAsk)) {
    throw new Error('selective dialogue: studentFeedback must use the non-leading fixed message');
  }
  if (!canAsk) {
    if (output.nextQuestion !== null) {
      throw new Error('selective dialogue: exhausted question budget requires nextQuestion null');
    }
    return output;
  }
  const expectedType = input.route === 'ERROR' ? 'CORRECTIVE' : 'DIAGNOSTIC';
  if (output.nextQuestion?.type !== expectedType) {
    throw new Error(`selective dialogue: ${input.route} requires ${expectedType}`);
  }
  return output;
}

export function loadSelectiveFeedbackPrompt(revision: 'v3' | 'v3.1' | 'v4' = 'v3'): string {
  return readFileSync(resolve(
    process.cwd(),
    `packages/pipeline/experiments/dialogue/selective-feedback-prompt-${revision}.md`,
  ), 'utf8').trim();
}

let selectiveFeedbackClient: OpenAI | undefined;

function client(): OpenAI {
  selectiveFeedbackClient ??= new OpenAI({ maxRetries: 0 });
  return selectiveFeedbackClient;
}

function retryable(error: unknown): boolean {
  return error instanceof OpenAI.RateLimitError ||
    error instanceof OpenAI.InternalServerError ||
    error instanceof OpenAI.APIConnectionError;
}

function errorMetadata(error: unknown): NonNullable<DialogueCallAttemptMetadata['error']> {
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  return {
    ...(status === undefined ? {} : { status }),
    type: error instanceof Error ? error.name : 'unknown',
    retryable: retryable(error),
  };
}

export class OpenAISelectiveFeedbackEvaluator implements SelectiveFeedbackEvaluator {
  readonly includeSourceGuide: boolean;
  readonly promptRevision: 'v3' | 'v3.1' | 'v4';
  readonly model: string;
  readonly effort: DialogueEffort;
  private readonly timeoutMs: number;
  private readonly maxTransportRetries: number;
  private readonly retryDelayMs: number;
  private readonly providedClient: OpenAI | undefined;

  constructor(options: OpenAISelectiveFeedbackEvaluatorOptions = {}) {
    this.promptRevision = options.promptRevision ?? 'v3';
    this.includeSourceGuide = this.promptRevision === 'v4' && (options.includeSourceGuide ?? true);
    this.model = options.model ?? process.env['DIALOGUE_EXPERIMENT_OPENAI_MODEL'] ?? 'gpt-5.6-terra';
    this.effort = options.effort ?? parseEffort(process.env['DIALOGUE_EXPERIMENT_EFFORT']) ?? 'medium';
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxTransportRetries = options.maxTransportRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.providedClient = options.client;
  }

  async evaluate(input: SelectiveFeedbackInput): Promise<SelectiveFeedbackCall> {
    if (this.promptRevision !== 'v3' && !input.gateDecision.questionIntent?.trim()) {
      throw new Error(`selective dialogue ${this.promptRevision} requires the gate questionIntent`);
    }
    const calledAt = new Date().toISOString();
    const started = performance.now();
    const attempts: DialogueCallAttemptMetadata[] = [];

    for (let attempt = 1; attempt <= this.maxTransportRetries + 1; attempt += 1) {
      const attemptCalledAt = new Date().toISOString();
      const attemptStarted = performance.now();
      try {
        const response = await (this.providedClient ?? client()).responses.parse({
          model: this.model,
          instructions: loadSelectiveFeedbackPrompt(this.promptRevision) + (this.includeSourceGuide
            ? '\n\n' + readFileSync(resolve(process.cwd(), 'packages/pipeline/experiments/dialogue/source-guide-v1.md'), 'utf8') : ''),
          input: buildSelectiveFeedbackPayload(input),
          reasoning: { effort: this.effort },
          max_output_tokens: 1_800,
          store: false,
          text: {
            format: zodTextFormat(this.includeSourceGuide ? SelectiveFeedbackGuidedOutputSchema : SelectiveFeedbackOutputSchema, 'selective_dialogue_feedback'),
          },
        }, { timeout: this.timeoutMs, maxRetries: 0 });
        if (response.output_parsed === null) {
          throw new Error('selective dialogue: structured output parsing failed');
        }
        const result = validateSelectiveFeedbackOutput(response.output_parsed, input);
        const sourceQuote: unknown = (response.output_parsed as Record<string, unknown>)['sourceQuote'];
        if (this.includeSourceGuide) result.sourceGuide = result.nextQuestion === null ? null : locateSourceGuide(sourceQuote, input);
        const durationMs = Math.round(performance.now() - attemptStarted);
        attempts.push({ attempt, calledAt: attemptCalledAt, durationMs, outcome: 'success' });
        const usage = response.usage;
        const cacheWriteTokens = usage?.input_tokens_details.cache_write_tokens ?? 0;
        const cacheReadTokens = usage?.input_tokens_details.cached_tokens ?? 0;
        recordMetric({
          ts: attemptCalledAt,
          op: 'dialogue-experiment',
          model: this.model,
          effort: this.effort,
          paragraphId: input.dialogue.gold.paragraphId,
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
            promptVersion: `dialogue-selective-feedback-prompt-${this.promptRevision}${this.includeSourceGuide ? '-guide-v1' : ''}`,
            schemaVersion: this.includeSourceGuide ? 'dialogue-selective-feedback-openai-v3' : SELECTIVE_FEEDBACK_SCHEMA_VERSION,
            ...(this.includeSourceGuide ? { decisionAudit: { rawResult: structuredClone(response.output_parsed), validatedResult: structuredClone(result),
              normalizationEvents: [{ field: 'sourceGuide', before: sourceQuote ?? null, after: result.sourceGuide,
                reason: '현재 SERIOUS 질문의 원문 인용·위치만 허용한다. 무효 안내는 판정·질문을 바꾸지 않고 생략한다.' }] } } : {}),
            goldVersion: input.dialogue.goldVersion,
            goldHash: input.dialogue.goldHash,
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
        const durationMs = Math.round(performance.now() - attemptStarted);
        const metadata = errorMetadata(error);
        attempts.push({
          attempt,
          calledAt: attemptCalledAt,
          durationMs,
          outcome: 'error',
          error: metadata,
        });
        if (!metadata.retryable || attempt > this.maxTransportRetries) throw error;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, this.retryDelayMs));
      }
    }
    throw new Error('selective dialogue: retry loop exhausted');
  }
}
