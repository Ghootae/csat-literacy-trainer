import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from './source-bundle.js';
import { createSourceProviderJsonSchema } from './source-bundle-runtime.js';
import {
  LENS_VISUAL_AUDIT_VERSION,
  LENS_VISUAL_OBSERVATION_VERSION,
  LensVisualAuditSchema,
  LensVisualObservationSchema,
  LensVisualTextContextSchema,
  validateLensVisualAuditCoverage,
  type LensVisualAudit,
  type LensVisualObservation,
  type LensVisualTextContext,
  type VisualReadingMode,
} from './visual-source-experiment.js';

export const LENS_VISUAL_ONLY_PROMPT = 'lens-visual-only-prompt-v1' as const;
export const LENS_VISUAL_GROUNDED_PROMPT = 'lens-visual-grounded-prompt-v1' as const;
export const LENS_VISUAL_AUDIT_PROMPT = 'lens-visual-audit-prompt-v1' as const;
export const LENS_VISUAL_MODEL = 'gpt-5.6-terra' as const;
export const LENS_VISUAL_SERVICE_TIER = 'default' as const;
export const LENS_VISUAL_COST_VERSION = 'lens-visual-cost-v1-cache-write-aware' as const;
export const LENS_VISUAL_IMAGE_TOKEN_RESERVE = 10_000;

export const LENS_VISUAL_MAX_OUTPUT_TOKENS = {
  VISUAL_ONLY: 6_500,
  TEXT_GROUNDED: 7_000,
  AUDIT: 7_000,
} as const;

export const LENS_VISUAL_PRICING_USD_PER_MILLION = {
  uncachedInput: 2,
  cachedInputRead: 0.2,
  cachedInputWrite: 2.5,
  output: 12,
} as const;

const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');

export const LensVisualCallMetadataSchema = z.object({
  provider: z.literal('openai'),
  requestedModel: z.literal(LENS_VISUAL_MODEL),
  responseModel: z.string().min(1),
  effort: z.enum(['medium', 'high']),
  promptVersion: z.enum([
    LENS_VISUAL_ONLY_PROMPT,
    LENS_VISUAL_GROUNDED_PROMPT,
    LENS_VISUAL_AUDIT_PROMPT,
  ]),
  inputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  calledAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  responseId: z.string().min(1),
  requestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  store: z.literal(false),
  previousResponseId: z.null(),
  automaticRetries: z.literal(0),
  serviceTierRequested: z.literal(LENS_VISUAL_SERVICE_TIER),
  serviceTierReturned: z.string().min(1).nullable(),
  maxOutputTokens: z.number().int().positive(),
  derivation: z.object({
    approvalPlanHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    stage: z.string().min(1),
    dependencyArtifactHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)),
  }).strict(),
  preflight: z.object({
    costCalculatorVersion: z.literal(LENS_VISUAL_COST_VERSION),
    cumulativeActualCostUsdBeforeCall: z.number().nonnegative(),
    conservativeInputTokenCeiling: z.number().int().nonnegative(),
    maximumCallCostUsd: z.number().nonnegative(),
    projectedCumulativeCeilingUsd: z.number().nonnegative(),
    budgetCeilingUsd: z.number().positive(),
  }).strict(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    cacheWriteTokens: z.number().int().nonnegative(),
  }).strict(),
}).strict();
export type LensVisualCallMetadata = z.infer<typeof LensVisualCallMetadataSchema>;

export interface LensVisualApiCall<T> {
  readonly rawOutputText: string;
  readonly parsedOutput: T;
  readonly metadata: LensVisualCallMetadata;
}

export interface LensVisualCallControl {
  readonly approvalPlanHash: string;
  readonly cumulativeActualCostUsdBeforeCall: number;
  readonly budgetCeilingUsd: number;
  readonly stage: string;
  readonly dependencyArtifactHashes: readonly string[];
  readonly recordPreflight?: (record: LensVisualPreparedCallRecord) => Promise<void>;
}

export interface LensVisualPreparedCallRecord {
  readonly approvalPlanHash: string;
  readonly requestHash: string;
  readonly inputHash: string;
  readonly model: typeof LENS_VISUAL_MODEL;
  readonly serviceTier: typeof LENS_VISUAL_SERVICE_TIER;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: LensVisualCallMetadata['promptVersion'];
  readonly maxOutputTokens: number;
  readonly stage: string;
  readonly dependencyArtifactHashes: readonly string[];
  readonly preflight: LensVisualCallMetadata['preflight'];
  readonly apiKeyIncluded: false;
}

export function estimateLensVisualPreflightCost(options: {
  readonly input: unknown;
  readonly promptBytes: number;
  readonly imageCount: number;
  readonly maxOutputTokens: number;
  readonly cumulativeActualCostUsdBeforeCall: number;
  readonly budgetCeilingUsd: number;
}): LensVisualCallMetadata['preflight'] {
  const conservativeInputTokenCeiling = Buffer.byteLength(JSON.stringify(options.input), 'utf8') +
    options.promptBytes + options.imageCount * LENS_VISUAL_IMAGE_TOKEN_RESERVE;
  const maximumCallCostUsd = (
    conservativeInputTokenCeiling * LENS_VISUAL_PRICING_USD_PER_MILLION.cachedInputWrite +
    options.maxOutputTokens * LENS_VISUAL_PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
  return {
    costCalculatorVersion: LENS_VISUAL_COST_VERSION,
    cumulativeActualCostUsdBeforeCall: options.cumulativeActualCostUsdBeforeCall,
    conservativeInputTokenCeiling,
    maximumCallCostUsd,
    projectedCumulativeCeilingUsd: options.cumulativeActualCostUsdBeforeCall + maximumCallCostUsd,
    budgetCeilingUsd: options.budgetCeilingUsd,
  };
}

export function lensVisualCallCostUsd(metadataValue: unknown): number {
  const metadata = LensVisualCallMetadataSchema.parse(metadataValue);
  const uncached = Math.max(
    0,
    metadata.usage.inputTokens - metadata.usage.cacheReadTokens - metadata.usage.cacheWriteTokens,
  );
  return (
    uncached * LENS_VISUAL_PRICING_USD_PER_MILLION.uncachedInput +
    metadata.usage.cacheReadTokens * LENS_VISUAL_PRICING_USD_PER_MILLION.cachedInputRead +
    metadata.usage.cacheWriteTokens * LENS_VISUAL_PRICING_USD_PER_MILLION.cachedInputWrite +
    metadata.usage.outputTokens * LENS_VISUAL_PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
}

export function buildLensVisualOnlyInput(options: {
  readonly packet: unknown;
  readonly observationId: string;
}): unknown {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.media.length !== 1) throw new Error('볼록렌즈 시각 실험은 원본 그림 하나만 사용한다.');
  const media = packet.media[0]!;
  return {
    task: 'WHOLE_IMAGE_VISUAL_OBSERVATION',
    requiredObservationVersion: LENS_VISUAL_OBSERVATION_VERSION,
    requiredObservationId: options.observationId,
    requiredMode: 'VISUAL_ONLY',
    imagePolicy: {
      wholeOriginalImageOnly: true,
      cropsProvided: false,
      inferExactScaleWithoutMarks: false,
      separatePixelObservationFromDomainInterpretation: true,
    },
    exclusions: [
      'SOURCE_TEXT', 'OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD',
      'HUMAN_EVALUATION_REFERENCE', 'OTHER_MODEL_OUTPUT',
    ],
    media: {
      mediaId: media.mediaId,
      mediaHash: media.contentHash,
      width: media.width,
      height: media.height,
    },
  };
}

export function buildLensTextGroundedVisualInput(options: {
  readonly packet: unknown;
  readonly textContext: unknown;
  readonly observationId: string;
}): unknown {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.media.length !== 1) throw new Error('볼록렌즈 시각 실험은 원본 그림 하나만 사용한다.');
  const media = packet.media[0]!;
  const textContext = LensVisualTextContextSchema.parse(options.textContext);
  return {
    task: 'WHOLE_IMAGE_TEXT_GROUNDED_VISUAL_OBSERVATION',
    requiredObservationVersion: LENS_VISUAL_OBSERVATION_VERSION,
    requiredObservationId: options.observationId,
    requiredMode: 'TEXT_GROUNDED',
    requiredTextContextHash: sourceArtifactHash(textContext),
    imagePolicy: {
      wholeOriginalImageOnly: true,
      cropsProvided: false,
      keepVisualObservationSeparateFromTextClaim: true,
      crossModalInterpretationMustReferenceBothSources: true,
      inferExactScaleWithoutMarks: false,
    },
    exclusions: [
      'OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD',
      'HUMAN_EVALUATION_REFERENCE', 'OTHER_MODEL_OUTPUT',
    ],
    media: {
      mediaId: media.mediaId,
      mediaHash: media.contentHash,
      width: media.width,
      height: media.height,
    },
    verifiedTextContext: textContext,
  };
}

type CandidateLabel = 'CANDIDATE_A' | 'CANDIDATE_B' | 'CANDIDATE_C' | 'CANDIDATE_D';
export type LensVisualCandidateSet = Readonly<Record<CandidateLabel, LensVisualObservation>>;

function coverage(candidate: LensVisualObservation): unknown {
  return {
    declaredMode: candidate.mode,
    expectedLabelCandidateIds: candidate.labels.map((entry) => entry.candidateId),
    expectedObjectCandidateIds: candidate.objects.map((entry) => entry.candidateId),
    expectedRelationCandidateIds: candidate.visualRelations.map((entry) => entry.candidateId),
    expectedInterpretationIds: candidate.crossModalInterpretations.map((entry) => entry.interpretationId),
  };
}

export function buildLensVisualAuditInput(options: {
  readonly packet: unknown;
  readonly textContext: unknown;
  readonly candidates: Readonly<Record<CandidateLabel, unknown>>;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
}): unknown {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.media.length !== 1) throw new Error('볼록렌즈 시각 실험은 원본 그림 하나만 사용한다.');
  const media = packet.media[0]!;
  const textContext = LensVisualTextContextSchema.parse(options.textContext);
  const candidates = Object.fromEntries(
    Object.entries(options.candidates).map(([label, candidate]) => [
      label,
      LensVisualObservationSchema.parse(candidate),
    ]),
  ) as Record<CandidateLabel, LensVisualObservation>;
  return {
    task: 'AUDIT_WHOLE_IMAGE_VISUAL_CANDIDATES',
    exclusions: [
      'OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD',
      'HUMAN_EVALUATION_REFERENCE', 'OTHER_AUDIT_OUTPUT', 'MODEL_EFFORT_LABELS',
    ],
    requiredAudit: {
      auditVersion: LENS_VISUAL_AUDIT_VERSION,
      auditId: options.auditId,
      model: LENS_VISUAL_MODEL,
      effort: options.effort,
      independentOfOtherAudit: true,
      mediaHash: media.contentHash,
      expectedCoverage: Object.fromEntries(
        Object.entries(candidates).map(([label, candidate]) => [label, coverage(candidate)]),
      ),
    },
    media: {
      mediaId: media.mediaId,
      mediaHash: media.contentHash,
      width: media.width,
      height: media.height,
    },
    verifiedTextContext: textContext,
    candidates,
  };
}

export function assertNoLensVisualInputLeak(value: unknown): void {
  const forbiddenKeys = new Set([
    'choices', 'correctchoice', 'correct_choice', 'answerkey', 'answer_key',
    'officialexplanation', 'official_explanation', 'detailed_explanation_ko',
    'existinggold', 'existing_gold', 'evaluationreference', 'evaluation_reference',
    'requiredlabels', 'criticalfacts', 'prohibitedvisualassertions',
    'expecteddecision', 'expected_decision', 'privatecandidatemapping',
  ]);
  const visit = (current: unknown, path: string): void => {
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}.${index}`));
      return;
    }
    if (typeof current !== 'object' || current === null) return;
    for (const [key, child] of Object.entries(current)) {
      if (forbiddenKeys.has(key.toLowerCase())) throw new Error(`${path}.${key}에 금지 정보가 있다.`);
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, '$');
}

export function assertLensVisualOnlyIsolation(value: unknown): void {
  assertNoLensVisualInputLeak(value);
  const input = value as Record<string, unknown>;
  if (input['task'] !== 'WHOLE_IMAGE_VISUAL_OBSERVATION') throw new Error('순수 시각 task가 아니다.');
  if ('verifiedTextContext' in input || 'sourcePacket' in input || 'sourceUnitRegistry' in input) {
    throw new Error('순수 시각 입력에 텍스트 원자료가 포함됐다.');
  }
}

export class LensVisualApiOutputValidationError extends Error {
  readonly rawOutputText: string;
  readonly metadata: LensVisualCallMetadata;

  constructor(options: {
    readonly rawOutputText: string;
    readonly metadata: LensVisualCallMetadata;
    readonly cause: unknown;
  }) {
    super(
      `볼록렌즈 시각 API 출력 검증 실패: ${
        options.cause instanceof Error ? options.cause.message : String(options.cause)
      }`,
      { cause: options.cause },
    );
    this.name = 'LensVisualApiOutputValidationError';
    this.rawOutputText = options.rawOutputText;
    this.metadata = options.metadata;
  }
}

async function imageContent(packet: SourcePacket): Promise<{
  type: 'input_image';
  image_url: string;
  detail: 'high';
}> {
  const media = packet.media[0];
  if (media === undefined || packet.media.length !== 1) throw new Error('원본 그림 하나가 필요하다.');
  const bytes = await readFile(resolve(media.localPath));
  const actualHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  if (actualHash !== media.contentHash) throw new Error(`${media.mediaId} 이미지 hash가 다르다.`);
  return {
    type: 'input_image',
    image_url: `data:${media.mimeType};base64,${bytes.toString('base64')}`,
    detail: 'high',
  };
}

async function structuredVisualCall<T>(options: {
  readonly packet: SourcePacket;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: LensVisualCallMetadata['promptVersion'];
  readonly outputName: string;
  readonly schema: z.ZodType<T>;
  readonly input: unknown;
  readonly maxOutputTokens: number;
  readonly callControl: LensVisualCallControl;
}): Promise<LensVisualApiCall<T>> {
  assertNoLensVisualInputLeak(options.input);
  const prompt = await readFile(resolve(PROMPT_ROOT, `${options.promptVersion}.md`), 'utf8');
  const image = await imageContent(options.packet);
  const inputHash = sourceArtifactHash(options.input);
  const providerSchema = createSourceProviderJsonSchema(options.schema);
  const preflight = estimateLensVisualPreflightCost({
    input: options.input,
    promptBytes: Buffer.byteLength(prompt, 'utf8'),
    imageCount: 1,
    maxOutputTokens: options.maxOutputTokens,
    cumulativeActualCostUsdBeforeCall: options.callControl.cumulativeActualCostUsdBeforeCall,
    budgetCeilingUsd: options.callControl.budgetCeilingUsd,
  });
  if (preflight.projectedCumulativeCeilingUsd > preflight.budgetCeilingUsd) {
    throw new Error(
      `호출 전 최악 비용 ${preflight.projectedCumulativeCeilingUsd.toFixed(6)}가 ` +
      `승인 예산 $${preflight.budgetCeilingUsd.toFixed(2)}를 넘는다.`,
    );
  }
  const requestHash = sourceArtifactHash({
    model: LENS_VISUAL_MODEL,
    serviceTier: LENS_VISUAL_SERVICE_TIER,
    effort: options.effort,
    promptVersion: options.promptVersion,
    promptHash: sourceArtifactHash(prompt),
    inputHash,
    imageHash: options.packet.media[0]?.contentHash,
    maxOutputTokens: options.maxOutputTokens,
    store: false,
    previousResponseId: null,
    outputName: options.outputName,
    outputSchemaHash: sourceArtifactHash(providerSchema),
  });
  await options.callControl.recordPreflight?.({
    approvalPlanHash: options.callControl.approvalPlanHash,
    requestHash,
    inputHash,
    model: LENS_VISUAL_MODEL,
    serviceTier: LENS_VISUAL_SERVICE_TIER,
    effort: options.effort,
    promptVersion: options.promptVersion,
    maxOutputTokens: options.maxOutputTokens,
    stage: options.callControl.stage,
    dependencyArtifactHashes: [...options.callControl.dependencyArtifactHashes],
    preflight,
    apiKeyIncluded: false,
  });
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: LENS_VISUAL_MODEL,
    instructions: prompt,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: JSON.stringify(options.input, null, 2) },
        image,
      ],
    }],
    reasoning: { effort: options.effort },
    max_output_tokens: options.maxOutputTokens,
    service_tier: LENS_VISUAL_SERVICE_TIER,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: options.outputName,
        strict: true,
        schema: providerSchema,
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  const metadata = LensVisualCallMetadataSchema.parse({
    provider: 'openai',
    requestedModel: LENS_VISUAL_MODEL,
    responseModel: response.model,
    effort: options.effort,
    promptVersion: options.promptVersion,
    inputHash,
    calledAt,
    durationMs: Date.now() - startedAt,
    responseId: response.id,
    requestHash,
    store: false,
    previousResponseId: null,
    automaticRetries: 0,
    serviceTierRequested: LENS_VISUAL_SERVICE_TIER,
    serviceTierReturned: response.service_tier ?? null,
    maxOutputTokens: options.maxOutputTokens,
    derivation: {
      approvalPlanHash: options.callControl.approvalPlanHash,
      stage: options.callControl.stage,
      dependencyArtifactHashes: [...options.callControl.dependencyArtifactHashes],
    },
    preflight,
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      cacheReadTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
      cacheWriteTokens: response.usage?.input_tokens_details?.cache_write_tokens ?? 0,
    },
  });
  try {
    return {
      rawOutputText: response.output_text,
      parsedOutput: options.schema.parse(JSON.parse(response.output_text)),
      metadata,
    };
  } catch (cause) {
    throw new LensVisualApiOutputValidationError({
      rawOutputText: response.output_text,
      metadata,
      cause,
    });
  }
}

function rethrow<T>(call: LensVisualApiCall<T>, cause: unknown): never {
  throw new LensVisualApiOutputValidationError({
    rawOutputText: call.rawOutputText,
    metadata: call.metadata,
    cause,
  });
}

export async function readLensVisualSource(options: {
  readonly packet: SourcePacket;
  readonly mode: VisualReadingMode;
  readonly textContext?: LensVisualTextContext;
  readonly effort: 'medium' | 'high';
  readonly observationId: string;
  readonly callControl: LensVisualCallControl;
}): Promise<LensVisualApiCall<LensVisualObservation>> {
  const input = options.mode === 'VISUAL_ONLY'
    ? buildLensVisualOnlyInput({ packet: options.packet, observationId: options.observationId })
    : buildLensTextGroundedVisualInput({
        packet: options.packet,
        textContext: options.textContext,
        observationId: options.observationId,
      });
  if (options.mode === 'VISUAL_ONLY') assertLensVisualOnlyIsolation(input);
  const call = await structuredVisualCall({
    packet: options.packet,
    effort: options.effort,
    promptVersion: options.mode === 'VISUAL_ONLY'
      ? LENS_VISUAL_ONLY_PROMPT
      : LENS_VISUAL_GROUNDED_PROMPT,
    outputName: options.mode === 'VISUAL_ONLY'
      ? 'lens_visual_only_observation_v1'
      : 'lens_text_grounded_visual_observation_v1',
    schema: LensVisualObservationSchema,
    input,
    maxOutputTokens: options.mode === 'VISUAL_ONLY'
      ? LENS_VISUAL_MAX_OUTPUT_TOKENS.VISUAL_ONLY
      : LENS_VISUAL_MAX_OUTPUT_TOKENS.TEXT_GROUNDED,
    callControl: options.callControl,
  });
  try {
    const media = options.packet.media[0]!;
    if (call.parsedOutput.observationId !== options.observationId) {
      throw new Error('observationId가 요청과 다르다.');
    }
    if (call.parsedOutput.mode !== options.mode || call.parsedOutput.mediaHash !== media.contentHash) {
      throw new Error('시각 판독 mode 또는 media hash가 요청과 다르다.');
    }
    const expectedTextHash = options.mode === 'TEXT_GROUNDED'
      ? sourceArtifactHash(LensVisualTextContextSchema.parse(options.textContext))
      : null;
    if (call.parsedOutput.textContextHash !== expectedTextHash) {
      throw new Error('시각 판독 textContextHash가 요청과 다르다.');
    }
    if (options.mode === 'TEXT_GROUNDED') {
      const context = LensVisualTextContextSchema.parse(options.textContext);
      const allowedClaimIds = new Set(context.claims.map((claim) => claim.claimId));
      for (const interpretation of call.parsedOutput.crossModalInterpretations) {
        if (interpretation.sourceTextClaimIds.some((claimId) => !allowedClaimIds.has(claimId))) {
          throw new Error(`${interpretation.interpretationId}가 존재하지 않는 text claim을 참조한다.`);
        }
      }
    }
  } catch (cause) {
    rethrow(call, cause);
  }
  return call;
}

export async function auditLensVisualSources(options: {
  readonly packet: SourcePacket;
  readonly textContext: LensVisualTextContext;
  readonly candidates: LensVisualCandidateSet;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
  readonly callControl: LensVisualCallControl;
}): Promise<LensVisualApiCall<LensVisualAudit>> {
  const input = buildLensVisualAuditInput(options);
  const call = await structuredVisualCall({
    packet: options.packet,
    effort: options.effort,
    promptVersion: LENS_VISUAL_AUDIT_PROMPT,
    outputName: 'lens_visual_source_audit_v1',
    schema: LensVisualAuditSchema,
    input,
    maxOutputTokens: LENS_VISUAL_MAX_OUTPUT_TOKENS.AUDIT,
    callControl: options.callControl,
  });
  try {
    if (call.parsedOutput.auditId !== options.auditId || call.parsedOutput.effort !== options.effort) {
      throw new Error('감사 ID 또는 effort가 요청과 다르다.');
    }
    validateLensVisualAuditCoverage({ audit: call.parsedOutput, candidates: options.candidates });
  } catch (cause) {
    rethrow(call, cause);
  }
  return call;
}
