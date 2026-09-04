import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import { SourcePacketSchema, sourceArtifactHash, type SourcePacket } from './source-bundle.js';
import { createSourceProviderJsonSchema } from './source-bundle-runtime.js';
import {
  SOURCE_AUDIT_V2_VERSION,
  SourceAuditV2Schema,
  SourceBundleV2Schema,
  validateSourceAuditV2Coverage,
  validateSourceBundleV2AgainstInputs,
  validateSourceUnitRegistryAgainstPacket,
  type SourceAuditV2,
  type SourceBundleV2,
  type SourceUnitRegistry,
} from './source-bundle-v2.js';

export const ITEM_SOURCE_PROMPT_V2 = 'item-source-bundle-prompt-v2' as const;
export const SOURCE_INDEPENDENT_PROMPT_V2 = 'source-bundle-independent-read-prompt-v2' as const;
export const SOURCE_COMPARE_PROMPT_V2 = 'source-bundle-compare-audit-prompt-v2' as const;
export const PASSAGE_SOURCE_PROMPT_V2 = 'passage-source-bundle-prompt-v2' as const;
export const PASSAGE_COMPARE_PROMPT_V2 = 'passage-source-compare-audit-prompt-v2' as const;
export const PASSAGE_REPAIR_PROMPT_V2 = 'passage-source-unit-repair-prompt-v2' as const;
export const SOURCE_V2_MODEL = 'gpt-5.6-terra' as const;
export const SOURCE_V2_SERVICE_TIER = 'default' as const;
export const SOURCE_V2_COST_CALCULATOR_VERSION = 'source-v2-cost-v2-cache-write-aware' as const;
export const SOURCE_V2_IMAGE_INPUT_TOKEN_RESERVE_PER_IMAGE = 10_000;

export const SOURCE_V2_PRICING_USD_PER_MILLION = {
  uncachedInput: 2,
  cachedInputRead: 0.2,
  cachedInputWrite: 2.5,
  output: 12,
} as const;

const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');

export const SOURCE_V2_MAX_OUTPUT_TOKENS = {
  ITEM_GENERATE: 9_000,
  ITEM_INDEPENDENT_READ: 9_000,
  ITEM_COMPARE: 6_000,
  PASSAGE_GENERATE: 32_000,
  PASSAGE_COMPARE_MEDIUM: 16_000,
  PASSAGE_COMPARE_HIGH: 24_000,
  PASSAGE_REPAIR: 12_000,
} as const;

export const SourceV2ApiCallMetadataSchema = z.object({
  provider: z.literal('openai'),
  requestedModel: z.literal(SOURCE_V2_MODEL),
  responseModel: z.string().min(1),
  effort: z.enum(['medium', 'high']),
  promptVersion: z.enum([
    ITEM_SOURCE_PROMPT_V2,
    SOURCE_INDEPENDENT_PROMPT_V2,
    SOURCE_COMPARE_PROMPT_V2,
    PASSAGE_SOURCE_PROMPT_V2,
    PASSAGE_COMPARE_PROMPT_V2,
    PASSAGE_REPAIR_PROMPT_V2,
  ]),
  inputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  calledAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  responseId: z.string().min(1),
  requestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  store: z.literal(false),
  previousResponseId: z.null(),
  automaticRetries: z.literal(0),
  serviceTierRequested: z.literal(SOURCE_V2_SERVICE_TIER),
  serviceTierReturned: z.string().min(1).nullable(),
  responseStatus: z.string().min(1).optional(),
  incompleteReason: z.string().min(1).nullable().optional(),
  maxOutputTokens: z.number().int().positive(),
  derivation: z.object({
    approvalPlanHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    conditionBranch: z.string().min(1),
    dependencyArtifactHashes: z.array(z.string().regex(/^sha256:[a-f0-9]{64}$/)),
  }).strict(),
  preflight: z.object({
    costCalculatorVersion: z.literal(SOURCE_V2_COST_CALCULATOR_VERSION),
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
export type SourceV2ApiCallMetadata = z.infer<typeof SourceV2ApiCallMetadataSchema>;

export interface SourceV2ApiCall<T> {
  readonly rawOutputText: string;
  readonly parsedOutput: T;
  readonly metadata: SourceV2ApiCallMetadata;
}

export interface SourceV2CallControl {
  readonly approvalPlanHash: string;
  readonly cumulativeActualCostUsdBeforeCall: number;
  readonly budgetCeilingUsd: number;
  readonly conditionBranch: string;
  readonly dependencyArtifactHashes: readonly string[];
  readonly recordPreflight?: (record: SourceV2PreparedCallRecord) => Promise<void>;
}

export interface SourceV2PreflightCost {
  readonly costCalculatorVersion: typeof SOURCE_V2_COST_CALCULATOR_VERSION;
  readonly cumulativeActualCostUsdBeforeCall: number;
  readonly conservativeInputTokenCeiling: number;
  readonly maximumCallCostUsd: number;
  readonly projectedCumulativeCeilingUsd: number;
  readonly budgetCeilingUsd: number;
}

export interface SourceV2PreparedCallRecord {
  readonly approvalPlanHash: string;
  readonly requestHash: string;
  readonly inputHash: string;
  readonly model: typeof SOURCE_V2_MODEL;
  readonly serviceTier: typeof SOURCE_V2_SERVICE_TIER;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: SourceV2ApiCallMetadata['promptVersion'];
  readonly maxOutputTokens: number;
  readonly conditionBranch: string;
  readonly dependencyArtifactHashes: readonly string[];
  readonly preflight: SourceV2PreflightCost;
  readonly apiKeyIncluded: false;
}

export function estimateSourceV2PreflightCost(options: {
  readonly input: unknown;
  readonly promptBytes: number;
  readonly imageCount: number;
  readonly maxOutputTokens: number;
  readonly cumulativeActualCostUsdBeforeCall: number;
  readonly budgetCeilingUsd: number;
}): SourceV2PreflightCost {
  const conservativeInputTokenCeiling = Buffer.byteLength(JSON.stringify(options.input), 'utf8') +
    options.promptBytes + options.imageCount * SOURCE_V2_IMAGE_INPUT_TOKEN_RESERVE_PER_IMAGE;
  const maximumCallCostUsd = (
    conservativeInputTokenCeiling * SOURCE_V2_PRICING_USD_PER_MILLION.cachedInputWrite +
    options.maxOutputTokens * SOURCE_V2_PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
  return {
    costCalculatorVersion: SOURCE_V2_COST_CALCULATOR_VERSION,
    cumulativeActualCostUsdBeforeCall: options.cumulativeActualCostUsdBeforeCall,
    conservativeInputTokenCeiling,
    maximumCallCostUsd,
    projectedCumulativeCeilingUsd: options.cumulativeActualCostUsdBeforeCall + maximumCallCostUsd,
    budgetCeilingUsd: options.budgetCeilingUsd,
  };
}

export class SourceV2ApiOutputValidationError extends Error {
  readonly rawOutputText: string;
  readonly metadata: SourceV2ApiCallMetadata;

  constructor(options: {
    readonly rawOutputText: string;
    readonly metadata: SourceV2ApiCallMetadata;
    readonly cause: unknown;
  }) {
    super(
      `Source Bundle v2 API 출력 검증 실패: ${
        options.cause instanceof Error ? options.cause.message : String(options.cause)
      }`,
      { cause: options.cause },
    );
    this.name = 'SourceV2ApiOutputValidationError';
    this.rawOutputText = options.rawOutputText;
    this.metadata = options.metadata;
  }
}

function expectedClaimsByUnit(
  registry: SourceUnitRegistry,
  bundle: SourceBundleV2,
): Record<string, string[]> {
  return Object.fromEntries(registry.units.map((unit) => [
    unit.sourceUnitId,
    bundle.claims.filter((claim) => claim.sourceUnitId === unit.sourceUnitId)
      .map((claim) => claim.claimId),
  ]));
}

function expectedVisualsByUnit(
  registry: SourceUnitRegistry,
  bundle: SourceBundleV2,
): Record<string, string[]> {
  return Object.fromEntries(registry.units.map((unit) => [
    unit.sourceUnitId,
    bundle.visualCandidates
      .filter((candidate) => candidate.parentFigureUnitId === unit.sourceUnitId)
      .map((candidate) => candidate.candidateId),
  ]));
}

export function buildItemGenerationInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
}): unknown {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope !== 'ITEM') throw new Error('ITEM packet만 v2 ITEM 생성에 사용할 수 있다.');
  const registry = validateSourceUnitRegistryAgainstPacket({
    registry: options.registry,
    sourcePacket: packet,
  });
  return {
    task: 'ITEM_SOURCE_BUNDLE_GENERATION_V2',
    exclusions: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD', 'TRUTH_JUDGMENT'],
    requiredScope: 'ITEM',
    requiredSourcePacketHash: sourceArtifactHash(packet),
    requiredSourceUnitRegistryHash: sourceArtifactHash(registry),
    requiredItemDirectives: registry.units.filter((unit) => unit.unitRole === 'ITEM_DIRECTIVE')
      .map((unit) => ({
        sourceUnitId: unit.sourceUnitId,
        unitRole: unit.unitRole,
        claimExtractionPolicy: unit.claimExtractionPolicy,
        questionPolarity: unit.questionPolarity,
      })),
    sourcePacket: packet,
    sourceUnitRegistry: registry,
  };
}

export function buildIndependentReadingInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
}): unknown {
  return {
    ...buildItemGenerationInputV2(options) as Record<string, unknown>,
    task: 'INDEPENDENT_ITEM_SOURCE_READING_V2',
    candidateArtifact: 'INTENTIONALLY_HIDDEN',
  };
}

export function buildComparisonAuditInputV2(options: {
  readonly packet: unknown;
  readonly registry: unknown;
  readonly independentReading: unknown;
  readonly candidate: unknown;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
}): unknown {
  const packet = SourcePacketSchema.parse(options.packet);
  const registry = validateSourceUnitRegistryAgainstPacket({
    registry: options.registry,
    sourcePacket: packet,
  });
  const independentReading = validateSourceBundleV2AgainstInputs({
    bundle: options.independentReading,
    sourcePacket: packet,
    registry,
  });
  const candidate = validateSourceBundleV2AgainstInputs({
    bundle: options.candidate,
    sourcePacket: packet,
    registry,
  });
  return {
    task: 'COMPARE_ITEM_SOURCE_CANDIDATE_V2',
    candidateLabel: 'CANDIDATE_A',
    exclusions: [
      'OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'EXISTING_GOLD',
      'OTHER_AUDIT_RESULT',
    ],
    requiredAudit: {
      auditVersion: SOURCE_AUDIT_V2_VERSION,
      auditId: options.auditId,
      model: SOURCE_V2_MODEL,
      effort: options.effort,
      independentOfOtherAudit: true,
      expectedSourceUnitIds: registry.units.map((unit) => unit.sourceUnitId),
      expectedClaimsByUnit: expectedClaimsByUnit(registry, candidate),
      expectedVisualsByUnit: expectedVisualsByUnit(registry, candidate),
    },
    requiredSourcePacketHash: sourceArtifactHash(packet),
    requiredSourceUnitRegistryHash: sourceArtifactHash(registry),
    sourcePacket: packet,
    sourceUnitRegistry: registry,
    independentReading,
    candidateArtifact: candidate,
  };
}

export function assertNoSourceV2InputLeak(value: unknown): void {
  const forbiddenKeys = new Set([
    'choices', 'correctchoice', 'correct_choice', 'answerkey', 'answer_key',
    'officialexplanation', 'official_explanation', 'detailed_explanation_ko',
    'existinggold', 'existing_gold', 'evaluationreference', 'evaluation_reference',
    'mutationkind', 'mutation_kind', 'expecteddecision', 'expected_decision',
  ]);
  const visit = (current: unknown, path: string): void => {
    if (typeof current === 'string' && /RATIO_DIRECTION_REVERSAL|EXPECTED_(?:PASS|REJECT)/u.test(current)) {
      throw new Error(`${path}에 변이 종류 또는 기대 판정이 노출됐다.`);
    }
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}.${index}`));
      return;
    }
    if (typeof current !== 'object' || current === null) return;
    for (const [key, child] of Object.entries(current)) {
      if (forbiddenKeys.has(key.toLowerCase())) throw new Error(`${path}.${key}에 금지된 정보가 있다.`);
      visit(child, `${path}.${key}`);
    }
  };
  visit(value, '$');
}

async function mediaContent(packet: SourcePacket): Promise<Array<{
  type: 'input_image';
  image_url: string;
  detail: 'high';
}>> {
  return Promise.all(packet.media.map(async (media) => {
    const bytes = await readFile(resolve(media.localPath));
    const actualHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (actualHash !== media.contentHash) throw new Error(`${media.mediaId} 이미지 hash가 다르다.`);
    return {
      type: 'input_image' as const,
      image_url: `data:${media.mimeType};base64,${bytes.toString('base64')}`,
      detail: 'high' as const,
    };
  }));
}

export async function structuredCallV2<T>(options: {
  readonly packet: SourcePacket;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: SourceV2ApiCallMetadata['promptVersion'];
  readonly outputName: string;
  readonly schema: z.ZodType<T>;
  readonly input: unknown;
  readonly maxOutputTokens: number;
  readonly includeMedia?: boolean;
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<T>> {
  assertNoSourceV2InputLeak(options.input);
  const inputHash = sourceArtifactHash(options.input);
  const prompt = await readFile(resolve(PROMPT_ROOT, `${options.promptVersion}.md`), 'utf8');
  const images = options.includeMedia === false ? [] : await mediaContent(options.packet);
  const schema = createSourceProviderJsonSchema(options.schema);
  const preflight = estimateSourceV2PreflightCost({
    input: options.input,
    promptBytes: Buffer.byteLength(prompt, 'utf8'),
    imageCount: images.length,
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
    model: SOURCE_V2_MODEL,
    serviceTier: SOURCE_V2_SERVICE_TIER,
    effort: options.effort,
    promptVersion: options.promptVersion,
    promptHash: sourceArtifactHash(prompt),
    inputHash,
    imageHashes: options.includeMedia === false
      ? []
      : options.packet.media.map((media) => media.contentHash),
    maxOutputTokens: options.maxOutputTokens,
    store: false,
    previousResponseId: null,
    outputName: options.outputName,
    outputSchemaHash: sourceArtifactHash(schema),
  });
  await options.callControl.recordPreflight?.({
    approvalPlanHash: options.callControl.approvalPlanHash,
    requestHash,
    inputHash,
    model: SOURCE_V2_MODEL,
    serviceTier: SOURCE_V2_SERVICE_TIER,
    effort: options.effort,
    promptVersion: options.promptVersion,
    maxOutputTokens: options.maxOutputTokens,
    conditionBranch: options.callControl.conditionBranch,
    dependencyArtifactHashes: [...options.callControl.dependencyArtifactHashes],
    preflight,
    apiKeyIncluded: false,
  });
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: SOURCE_V2_MODEL,
    instructions: prompt,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: JSON.stringify(options.input, null, 2) },
        ...images,
      ],
    }],
    reasoning: { effort: options.effort },
    max_output_tokens: options.maxOutputTokens,
    service_tier: SOURCE_V2_SERVICE_TIER,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: options.outputName,
        strict: true,
        schema,
      },
    },
  }, { timeout: 360_000, maxRetries: 0 });
  const metadata = SourceV2ApiCallMetadataSchema.parse({
      provider: 'openai',
      requestedModel: SOURCE_V2_MODEL,
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
      serviceTierRequested: SOURCE_V2_SERVICE_TIER,
      serviceTierReturned: response.service_tier ?? null,
      responseStatus: response.status,
      incompleteReason: response.incomplete_details?.reason ?? null,
      maxOutputTokens: options.maxOutputTokens,
      derivation: {
        approvalPlanHash: options.callControl.approvalPlanHash,
        conditionBranch: options.callControl.conditionBranch,
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
    if (response.status !== 'completed') {
      throw new Error(
        `응답 상태가 ${response.status}다` +
        (response.incomplete_details?.reason === undefined
          ? '.'
          : `: ${response.incomplete_details.reason}`),
      );
    }
    return {
      rawOutputText: response.output_text,
      parsedOutput: options.schema.parse(JSON.parse(response.output_text)),
      metadata,
    };
  } catch (cause) {
    throw new SourceV2ApiOutputValidationError({
      rawOutputText: response.output_text,
      metadata,
      cause,
    });
  }
}

function rethrowOutputValidation<T>(call: SourceV2ApiCall<T>, cause: unknown): never {
  throw new SourceV2ApiOutputValidationError({
    rawOutputText: call.rawOutputText,
    metadata: call.metadata,
    cause,
  });
}

export async function generateItemSourceBundleV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<SourceBundleV2>> {
  const input = buildItemGenerationInputV2(options);
  const call = await structuredCallV2({
    packet: options.packet,
    effort: 'medium',
    promptVersion: ITEM_SOURCE_PROMPT_V2,
    outputName: 'item_source_bundle_v2',
    schema: SourceBundleV2Schema,
    input,
    maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_GENERATE,
    callControl: options.callControl,
  });
  try {
    validateSourceBundleV2AgainstInputs({
      bundle: call.parsedOutput,
      sourcePacket: options.packet,
      registry: options.registry,
    });
  } catch (cause) {
    rethrowOutputValidation(call, cause);
  }
  return call;
}

export async function readItemSourceIndependentlyV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly effort: 'medium' | 'high';
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<SourceBundleV2>> {
  const input = buildIndependentReadingInputV2(options);
  const call = await structuredCallV2({
    packet: options.packet,
    effort: options.effort,
    promptVersion: SOURCE_INDEPENDENT_PROMPT_V2,
    outputName: 'independent_item_source_reading_v2',
    schema: SourceBundleV2Schema,
    input,
    maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_INDEPENDENT_READ,
    callControl: options.callControl,
  });
  try {
    validateSourceBundleV2AgainstInputs({
      bundle: call.parsedOutput,
      sourcePacket: options.packet,
      registry: options.registry,
    });
  } catch (cause) {
    rethrowOutputValidation(call, cause);
  }
  return call;
}

export async function compareItemSourceBundleV2(options: {
  readonly packet: SourcePacket;
  readonly registry: SourceUnitRegistry;
  readonly independentReading: SourceBundleV2;
  readonly candidate: SourceBundleV2;
  readonly auditId: string;
  readonly effort: 'medium' | 'high';
  readonly callControl: SourceV2CallControl;
}): Promise<SourceV2ApiCall<SourceAuditV2>> {
  const input = buildComparisonAuditInputV2(options);
  const call = await structuredCallV2({
    packet: options.packet,
    effort: options.effort,
    promptVersion: SOURCE_COMPARE_PROMPT_V2,
    outputName: 'item_source_comparison_audit_v2',
    schema: SourceAuditV2Schema,
    input,
    maxOutputTokens: SOURCE_V2_MAX_OUTPUT_TOKENS.ITEM_COMPARE,
    callControl: options.callControl,
  });
  try {
    validateSourceAuditV2Coverage({
      audit: call.parsedOutput,
      expectedClaimsByUnit: expectedClaimsByUnit(options.registry, options.candidate),
      expectedVisualsByUnit: expectedVisualsByUnit(options.registry, options.candidate),
    });
  } catch (cause) {
    rethrowOutputValidation(call, cause);
  }
  return call;
}

export function sourceV2CallCostUsd(metadataValue: unknown): number {
  const metadata = SourceV2ApiCallMetadataSchema.parse(metadataValue);
  const uncached = Math.max(
    0,
    metadata.usage.inputTokens - metadata.usage.cacheReadTokens - metadata.usage.cacheWriteTokens,
  );
  return (
    uncached * SOURCE_V2_PRICING_USD_PER_MILLION.uncachedInput +
    metadata.usage.cacheReadTokens * SOURCE_V2_PRICING_USD_PER_MILLION.cachedInputRead +
    metadata.usage.cacheWriteTokens * SOURCE_V2_PRICING_USD_PER_MILLION.cachedInputWrite +
    metadata.usage.outputTokens * SOURCE_V2_PRICING_USD_PER_MILLION.output
  ) / 1_000_000;
}
