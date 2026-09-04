import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  OPTION_CLAIM_BUNDLE_VERSION,
  OptionClaimBundleSchema,
  SourceBundleSchema,
  SourcePacketSchema,
  canonicalSourcePacketHash,
  normalizeSourceEvidenceSpans,
  sourceArtifactHash,
  type OptionClaimBundle,
  type SourceBundle,
  type SourcePacket,
} from './source-bundle.js';
import {
  SOURCE_ARTIFACT_AUDIT_VERSION,
  SOURCE_ARTIFACT_AUDIT_BATCH_VERSION,
  SourceArtifactAuditBatchSchema,
  SourceArtifactAuditSchema,
  validateSourceArtifactAuditBatch,
  validateSourceArtifactAudit,
  type SourceArtifactAudit,
  type SourceArtifactAuditBatch,
} from './source-bundle-audit.js';

export const DEFAULT_SOURCE_GENERATION_MODEL = 'gpt-5.6-terra';
export const DEFAULT_SOURCE_GENERATION_EFFORT = 'medium' as const;
export const DEFAULT_SOURCE_AUDIT_MODEL = 'gpt-5.6-terra';
export const DEFAULT_SOURCE_AUDIT_EFFORT = 'medium' as const;

export type SourceReasoningEffort = 'medium' | 'high';

export const PASSAGE_SOURCE_PROMPT_VERSION = 'passage-source-bundle-prompt-v1' as const;
export const ITEM_SOURCE_PROMPT_VERSION = 'item-source-bundle-prompt-v1' as const;
export const OPTION_CLAIM_PROMPT_VERSION = 'option-claim-bundle-prompt-v1' as const;
export const SOURCE_AUDIT_PROMPT_VERSION = 'source-bundle-audit-prompt-v1' as const;

const PROMPT_ROOT = resolve('packages/pipeline/experiments/problem-solving');

export interface SourceApiCallMetadata {
  readonly provider: 'openai';
  readonly model: string;
  readonly effort: string;
  readonly promptVersion: string;
  readonly inputHash: string;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly responseId: string;
  readonly store: false;
  readonly previousResponseId: null;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
  };
}

export const SourceApiCallMetadataSchema = z.object({
  provider: z.literal('openai'),
  model: z.string().min(1),
  effort: z.string().min(1),
  promptVersion: z.string().min(1),
  inputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  calledAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  responseId: z.string().min(1),
  store: z.literal(false),
  previousResponseId: z.null(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
  }).strict(),
}).strict();

export interface SourceApiCall<T> {
  readonly rawOutputText: string;
  readonly parsedOutput: T;
  readonly normalizationChanges: readonly string[];
  readonly metadata: SourceApiCallMetadata;
}

export class SourceApiOutputValidationError extends Error {
  readonly rawOutputText: string;
  readonly metadata: SourceApiCallMetadata;

  constructor(options: {
    readonly rawOutputText: string;
    readonly metadata: SourceApiCallMetadata;
    readonly cause: unknown;
  }) {
    super(
      `Source API structured output 검증 실패: ${
        options.cause instanceof Error ? options.cause.message : String(options.cause)
      }`,
      { cause: options.cause },
    );
    this.name = 'SourceApiOutputValidationError';
    this.rawOutputText = options.rawOutputText;
    this.metadata = options.metadata;
  }
}

export interface SourceAuditCall {
  readonly independentReading: SourceApiCall<SourceBundle>;
  readonly comparisonAudit: SourceApiCall<SourceArtifactAudit>;
}

export interface OptionClaimAuditCall {
  readonly independentReading: SourceApiCall<OptionClaimBundle>;
  readonly comparisonAudit: SourceApiCall<SourceArtifactAudit>;
}

export interface SourceAuditBatchCall {
  readonly independentReading: SourceApiCall<SourceBundle>;
  readonly comparisonAudit: SourceApiCall<SourceArtifactAuditBatch>;
}

function normalizeProviderJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeProviderJsonSchema);
  if (typeof value !== 'object' || value === null) return value;
  const normalized = Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
    key === 'format' ? [] : [[key, normalizeProviderJsonSchema(child)]]
  )));
  if (normalized['type'] === 'array' && Array.isArray(normalized['prefixItems'])) {
    const prefixItems = normalized['prefixItems'];
    if (prefixItems.length === 0) {
      throw new Error('OpenAI strict output 변환에서 빈 tuple은 지원하지 않는다.');
    }
    const [first, ...rest] = prefixItems;
    if (rest.some((item) => JSON.stringify(item) !== JSON.stringify(first))) {
      throw new Error('OpenAI strict output 변환에서 이질적인 tuple은 지원하지 않는다.');
    }
    normalized['items'] = first;
    normalized['minItems'] = prefixItems.length;
    normalized['maxItems'] = prefixItems.length;
    delete normalized['prefixItems'];
  }
  if (
    normalized['type'] === 'object' &&
    typeof normalized['properties'] === 'object' &&
    normalized['properties'] !== null &&
    !Array.isArray(normalized['properties'])
  ) {
    const properties = normalized['properties'] as Record<string, unknown>;
    const required = new Set(
      Array.isArray(normalized['required']) ? normalized['required'] : [],
    );
    normalized['properties'] = Object.fromEntries(
      Object.entries(properties).filter(([key]) => required.has(key)),
    );
    normalized['required'] = Object.keys(normalized['properties'] as Record<string, unknown>);
  }
  return normalized;
}

export function createSourceProviderJsonSchema(
  schema: z.ZodType,
): Record<string, unknown> {
  return normalizeProviderJsonSchema(z.toJSONSchema(schema)) as Record<string, unknown>;
}

async function loadPrompt(promptVersion: string): Promise<string> {
  return readFile(resolve(PROMPT_ROOT, `${promptVersion}.md`), 'utf8');
}

async function mediaContent(packet: SourcePacket): Promise<Array<{
  type: 'input_image';
  image_url: string;
  detail: 'high';
}>> {
  return Promise.all(packet.media.map(async (media) => {
    const bytes = await readFile(resolve(media.localPath));
    const actualHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (actualHash !== media.contentHash) {
      throw new Error(`${media.mediaId}의 로컬 바이트 해시가 packet과 일치하지 않는다.`);
    }
    return {
      type: 'input_image' as const,
      image_url: `data:${media.mimeType};base64,${bytes.toString('base64')}`,
      detail: 'high' as const,
    };
  }));
}

async function structuredCall<T>(options: {
  readonly model: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: string;
  readonly outputName: string;
  readonly schema: z.ZodType<T>;
  readonly input: unknown;
  readonly mediaPacket: SourcePacket;
  readonly maxOutputTokens: number;
  readonly timeoutMs?: number;
  readonly preprocessOutput?: (value: unknown) => {
    readonly value: unknown;
    readonly changes: readonly string[];
  };
}): Promise<SourceApiCall<T>> {
  const packet = SourcePacketSchema.parse(options.mediaPacket);
  const inputText = JSON.stringify(options.input, null, 2);
  const inputHash = sourceArtifactHash(options.input);
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();
  const response = await client.responses.create({
    model: options.model,
    instructions: await loadPrompt(options.promptVersion),
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: inputText },
        ...await mediaContent(packet),
      ],
    }],
    reasoning: { effort: options.effort },
    max_output_tokens: options.maxOutputTokens,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: options.outputName,
        strict: true,
        schema: createSourceProviderJsonSchema(options.schema),
      },
    },
  }, { timeout: options.timeoutMs ?? 360_000, maxRetries: 0 });
  const metadata: SourceApiCallMetadata = {
      provider: 'openai',
      model: options.model,
      effort: options.effort,
      promptVersion: options.promptVersion,
      inputHash,
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      store: false,
      previousResponseId: null,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
      },
  };
  let parsedOutput: T;
  let normalizationChanges: readonly string[] = [];
  try {
    const rawValue = JSON.parse(response.output_text) as unknown;
    const preprocessed = options.preprocessOutput?.(rawValue) ?? { value: rawValue, changes: [] };
    parsedOutput = options.schema.parse(preprocessed.value);
    normalizationChanges = preprocessed.changes;
  } catch (cause) {
    throw new SourceApiOutputValidationError({
      rawOutputText: response.output_text,
      metadata,
      cause,
    });
  }
  return {
    rawOutputText: response.output_text,
    parsedOutput,
    normalizationChanges,
    metadata,
  };
}

function sourceBundleGenerationInput(packet: SourcePacket): unknown {
  return {
    task: 'SOURCE_BUNDLE_GENERATION',
    exclusions: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'TRUTH_JUDGMENT'],
    requiredSourcePacketHash: canonicalSourcePacketHash(packet),
    sourcePacket: packet,
  };
}

function independentSourceReadingInput(packet: SourcePacket): unknown {
  return {
    task: 'INDEPENDENT_SOURCE_READING',
    candidateArtifact: 'INTENTIONALLY_HIDDEN',
    exclusions: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'CANDIDATE_BUNDLE'],
    requiredSourcePacketHash: canonicalSourcePacketHash(packet),
    sourcePacket: packet,
  };
}

function longestCommonContiguousSubstring(left: string, right: string): string {
  let previous = new Uint32Array(right.length + 1);
  let bestLength = 0;
  let bestEnd = 0;
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = new Uint32Array(right.length + 1);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      if (left[leftIndex - 1] !== right[rightIndex - 1]) continue;
      current[rightIndex] = previous[rightIndex - 1]! + 1;
      if (current[rightIndex]! > bestLength) {
        bestLength = current[rightIndex]!;
        bestEnd = rightIndex;
      }
    }
    previous = current;
  }
  return right.slice(bestEnd - bestLength, bestEnd);
}

function preprocessSourceBundleOutput(value: unknown, packet: SourcePacket): {
  readonly value: unknown;
  readonly changes: readonly string[];
} {
  const copied = structuredClone(value);
  const changes: string[] = [];
  if (typeof copied !== 'object' || copied === null || !('claims' in copied) ||
    !Array.isArray(copied.claims)) {
    return { value: copied, changes };
  }
  const documents = new Map(packet.documents.map((document) => [document.documentId, document.text]));
  for (const [claimIndex, claimValue] of copied.claims.entries()) {
    if (typeof claimValue !== 'object' || claimValue === null) continue;
    const claim = claimValue as Record<string, unknown>;
    if (
      claim['modality'] === 'CONDITIONAL' && Array.isArray(claim['conditions']) &&
      claim['conditions'].length === 0 && typeof claim['relation'] === 'object' &&
      claim['relation'] !== null
    ) {
      const relation = claim['relation'] as Record<string, unknown>;
      const condition = relation['kind'] === 'CONDITIONAL'
        ? relation['condition']
        : relation['kind'] === 'CAUSAL'
          ? relation['cause']
          : undefined;
      if (typeof condition === 'string' && condition.length > 0) {
        claim['conditions'] = [condition];
        changes.push(`claims.${claimIndex}.conditions: relation의 조건 역할 필드 복사`);
      }
    }
    if (!Array.isArray(claim['evidence'])) continue;
    for (const [evidenceIndex, evidenceValue] of claim['evidence'].entries()) {
      if (typeof evidenceValue !== 'object' || evidenceValue === null) continue;
      const evidence = evidenceValue as Record<string, unknown>;
      const documentId = evidence['documentId'];
      const quote = evidence['quote'];
      if (typeof documentId !== 'string' || typeof quote !== 'string') continue;
      if (evidence['start'] !== null || evidence['end'] !== null) continue;
      const document = documents.get(documentId);
      if (document === undefined) continue;
      let exactQuote = quote;
      let start = document.indexOf(exactQuote);
      if (start < 0) {
        const groundedFragment = longestCommonContiguousSubstring(quote, document).trim();
        if (groundedFragment.length < 16 || groundedFragment.length / quote.length < 0.5) continue;
        exactQuote = groundedFragment;
        start = document.indexOf(exactQuote);
        evidence['quote'] = exactQuote;
        changes.push(
          `claims.${claimIndex}.evidence.${evidenceIndex}: 비연속 인용을 최장 공통 원문 조각으로 축소`,
        );
      }
      if (start < 0 || document.indexOf(exactQuote, start + 1) >= 0) continue;
      evidence['start'] = start;
      evidence['end'] = start + exactQuote.length;
      changes.push(`claims.${claimIndex}.evidence.${evidenceIndex}: 유일 quote span 복원`);
    }
  }
  return { value: copied, changes };
}

function preprocessAuditOutput(value: unknown, packet: SourcePacket): {
  readonly value: unknown;
  readonly changes: readonly string[];
} {
  const copied = structuredClone(value);
  const changes: string[] = [];
  const documents = new Map(packet.documents.map((document) => [document.documentId, document.text]));
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, `${path}.${index}`));
      return;
    }
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    const documentId = record['documentId'];
    const quote = record['quote'];
    if (typeof documentId === 'string' && typeof quote === 'string') {
      const document = documents.get(documentId);
      if (document !== undefined && !document.includes(quote)) {
        const groundedFragment = longestCommonContiguousSubstring(quote, document).trim();
        if (groundedFragment.length >= 12 && groundedFragment.length / quote.length >= 0.5) {
          record['quote'] = groundedFragment;
          changes.push(`${path}.quote: 비연속 감사 인용을 최장 공통 원문 조각으로 축소`);
        }
      }
    }
    Object.entries(record).forEach(([key, child]) => visit(child, `${path}.${key}`));
  };
  visit(copied, '$');
  return { value: copied, changes };
}

function rethrowAsOutputValidationError<T>(options: {
  readonly call: SourceApiCall<T>;
  readonly cause: unknown;
}): never {
  throw new SourceApiOutputValidationError({
    rawOutputText: options.call.rawOutputText,
    metadata: options.call.metadata,
    cause: options.cause,
  });
}

export async function generateSourceBundle(options: {
  readonly packet: SourcePacket;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
}): Promise<SourceApiCall<SourceBundle>> {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope === 'OPTIONS') throw new Error('OPTIONS는 OptionClaimBundle 생성기를 사용한다.');
  const promptVersion = packet.scope === 'PASSAGE'
    ? PASSAGE_SOURCE_PROMPT_VERSION
    : ITEM_SOURCE_PROMPT_VERSION;
  const call = await structuredCall({
    model: options.model ?? DEFAULT_SOURCE_GENERATION_MODEL,
    effort: options.effort ?? DEFAULT_SOURCE_GENERATION_EFFORT,
    promptVersion,
    outputName: `${packet.scope.toLowerCase()}_source_bundle`,
    schema: SourceBundleSchema,
    input: sourceBundleGenerationInput(packet),
    mediaPacket: packet,
    maxOutputTokens: 18_000,
    preprocessOutput: (value) => preprocessSourceBundleOutput(value, packet),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  let normalized: ReturnType<typeof normalizeSourceEvidenceSpans>;
  try {
    normalized = normalizeSourceEvidenceSpans({ bundle: call.parsedOutput, packet });
  } catch (cause) {
    throw new SourceApiOutputValidationError({
      rawOutputText: call.rawOutputText,
      metadata: call.metadata,
      cause,
    });
  }
  return {
    ...call,
    parsedOutput: normalized.bundle,
    normalizationChanges: [...call.normalizationChanges, ...normalized.changes],
  };
}

export function recoverGeneratedSourceBundle(options: {
  readonly packet: SourcePacket;
  readonly rawOutputText: string;
  readonly metadata: SourceApiCallMetadata;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
}): SourceApiCall<SourceBundle> {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope === 'OPTIONS') throw new Error('OPTIONS 응답은 Source Bundle로 복구할 수 없다.');
  const metadata = SourceApiCallMetadataSchema.parse(options.metadata);
  const expectedModel = options.model ?? DEFAULT_SOURCE_GENERATION_MODEL;
  const expectedEffort = options.effort ?? DEFAULT_SOURCE_GENERATION_EFFORT;
  const expectedPrompt = packet.scope === 'PASSAGE'
    ? PASSAGE_SOURCE_PROMPT_VERSION
    : ITEM_SOURCE_PROMPT_VERSION;
  const expectedInputHash = sourceArtifactHash(sourceBundleGenerationInput(packet));
  if (
    metadata.model !== expectedModel || metadata.effort !== expectedEffort ||
    metadata.promptVersion !== expectedPrompt || metadata.inputHash !== expectedInputHash
  ) {
    throw new Error('복구하려는 API 응답의 모델·effort·prompt·input hash가 현재 실행과 다르다.');
  }
  const preprocessed = preprocessSourceBundleOutput(JSON.parse(options.rawOutputText), packet);
  const parsed = SourceBundleSchema.parse(preprocessed.value);
  const normalized = normalizeSourceEvidenceSpans({ bundle: parsed, packet });
  return {
    rawOutputText: options.rawOutputText.trim(),
    parsedOutput: normalized.bundle,
    normalizationChanges: [
      '이전 검증 실패 응답을 동일 호출 artifact로 복구',
      ...preprocessed.changes,
      ...normalized.changes,
    ],
    metadata,
  };
}

export function recoverIndependentSourceReading(options: {
  readonly packet: SourcePacket;
  readonly rawOutputText: string;
  readonly metadata: SourceApiCallMetadata;
  readonly model: string;
  readonly effort: SourceReasoningEffort;
}): SourceApiCall<SourceBundle> {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope === 'OPTIONS') throw new Error('OPTIONS 독립 판독은 별도 원자화 복구가 필요하다.');
  const metadata = SourceApiCallMetadataSchema.parse(options.metadata);
  const expectedInputHash = sourceArtifactHash(independentSourceReadingInput(packet));
  if (
    metadata.model !== options.model || metadata.effort !== options.effort ||
    metadata.promptVersion !== SOURCE_AUDIT_PROMPT_VERSION ||
    metadata.inputHash !== expectedInputHash
  ) {
    throw new Error('복구하려는 독립 판독의 모델·effort·prompt·input hash가 현재 실행과 다르다.');
  }
  const preprocessed = preprocessSourceBundleOutput(JSON.parse(options.rawOutputText), packet);
  const parsed = SourceBundleSchema.parse(preprocessed.value);
  const normalized = normalizeSourceEvidenceSpans({ bundle: parsed, packet });
  return {
    rawOutputText: options.rawOutputText.trim(),
    parsedOutput: normalized.bundle,
    normalizationChanges: [
      '이전 검증 실패 독립 판독을 동일 호출 artifact로 복구',
      ...preprocessed.changes,
      ...normalized.changes,
    ],
    metadata,
  };
}

export async function generateOptionClaimBundle(options: {
  readonly packet: SourcePacket;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
}): Promise<SourceApiCall<OptionClaimBundle>> {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope !== 'OPTIONS') throw new Error('OPTIONS packet만 원자화할 수 있다.');
  return structuredCall({
    model: options.model ?? DEFAULT_SOURCE_GENERATION_MODEL,
    effort: options.effort ?? DEFAULT_SOURCE_GENERATION_EFFORT,
    promptVersion: OPTION_CLAIM_PROMPT_VERSION,
    outputName: 'option_claim_bundle',
    schema: OptionClaimBundleSchema,
    input: {
      task: 'OPTION_ATOMIZATION',
      bundleVersion: OPTION_CLAIM_BUNDLE_VERSION,
      exclusions: ['ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'TRUTH_JUDGMENT'],
      requiredSourcePacketHash: canonicalSourcePacketHash(packet),
      sourcePacket: packet,
    },
    mediaPacket: packet,
    maxOutputTokens: 12_000,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
}

/**
 * 첫 호출은 후보를 전혀 받지 않고 감사 모델이 원자료를 독립 재인식한다. 두 번째 호출만
 * 독립 판독과 후보를 비교한다. 두 호출은 previous_response_id 없이 각각 store:false다.
 */
export async function auditSourceBundle(options: {
  readonly packet: SourcePacket;
  readonly candidate: SourceBundle;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
  readonly onIndependentReading?: (call: SourceApiCall<SourceBundle>) => Promise<void>;
}): Promise<SourceAuditCall> {
  const packet = SourcePacketSchema.parse(options.packet);
  const candidate = SourceBundleSchema.parse(options.candidate);
  const model = options.model ?? DEFAULT_SOURCE_AUDIT_MODEL;
  const common = {
    model,
    effort: options.effort ?? DEFAULT_SOURCE_AUDIT_EFFORT,
    promptVersion: SOURCE_AUDIT_PROMPT_VERSION,
    mediaPacket: packet,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  } as const;
  const rawIndependentReading = await structuredCall({
    ...common,
    outputName: 'independent_source_reading',
    schema: SourceBundleSchema,
    input: independentSourceReadingInput(packet),
    maxOutputTokens: 18_000,
    preprocessOutput: (value) => preprocessSourceBundleOutput(value, packet),
  });
  let normalizedReading: ReturnType<typeof normalizeSourceEvidenceSpans>;
  try {
    normalizedReading = normalizeSourceEvidenceSpans({
      bundle: rawIndependentReading.parsedOutput,
      packet,
    });
  } catch (cause) {
    throw new SourceApiOutputValidationError({
      rawOutputText: rawIndependentReading.rawOutputText,
      metadata: rawIndependentReading.metadata,
      cause,
    });
  }
  const independentReading: SourceApiCall<SourceBundle> = {
    ...rawIndependentReading,
    parsedOutput: normalizedReading.bundle,
    normalizationChanges: [
      ...rawIndependentReading.normalizationChanges,
      ...normalizedReading.changes,
    ],
  };
  await options.onIndependentReading?.(independentReading);
  const comparisonAudit = await compareSourceBundleWithIndependentReading({
    packet,
    candidate,
    independentReading: independentReading.parsedOutput,
    model,
    effort: options.effort ?? DEFAULT_SOURCE_AUDIT_EFFORT,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  return { independentReading, comparisonAudit };
}

export async function compareSourceBundleWithIndependentReading(options: {
  readonly packet: SourcePacket;
  readonly candidate: SourceBundle;
  readonly independentReading: SourceBundle;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
}): Promise<SourceApiCall<SourceArtifactAudit>> {
  const packet = SourcePacketSchema.parse(options.packet);
  const candidate = SourceBundleSchema.parse(options.candidate);
  const independentReading = SourceBundleSchema.parse(options.independentReading);
  const comparisonAudit = await structuredCall({
    model: options.model ?? DEFAULT_SOURCE_AUDIT_MODEL,
    effort: options.effort ?? DEFAULT_SOURCE_AUDIT_EFFORT,
    promptVersion: SOURCE_AUDIT_PROMPT_VERSION,
    mediaPacket: packet,
    outputName: 'source_artifact_comparison_audit',
    schema: SourceArtifactAuditSchema,
    input: {
      task: 'COMPARE_INDEPENDENT_READING_WITH_CANDIDATE',
      auditVersion: SOURCE_ARTIFACT_AUDIT_VERSION,
      requiredArtifactHash: sourceArtifactHash(candidate),
      requiredSourcePacketHash: canonicalSourcePacketHash(packet),
      exclusions: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION'],
      sourcePacket: packet,
      independentReading,
      candidateArtifact: candidate,
    },
    maxOutputTokens: 14_000,
    preprocessOutput: (value) => preprocessAuditOutput(value, packet),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  try {
    validateSourceArtifactAudit({
      audit: comparisonAudit.parsedOutput,
      artifact: candidate,
      sourcePacket: packet,
    });
  } catch (cause) {
    rethrowAsOutputValidationError({ call: comparisonAudit, cause });
  }
  return comparisonAudit;
}

export async function auditSourceBundleCandidates(options: {
  readonly packet: SourcePacket;
  readonly candidates: readonly [SourceBundle, ...SourceBundle[]];
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
  readonly recoveredIndependentReading?: SourceApiCall<SourceBundle>;
  readonly onIndependentReading?: (call: SourceApiCall<SourceBundle>) => Promise<void>;
}): Promise<SourceAuditBatchCall> {
  const packet = SourcePacketSchema.parse(options.packet);
  const candidates = options.candidates.map((candidate) => SourceBundleSchema.parse(candidate)) as [
    SourceBundle,
    ...SourceBundle[],
  ];
  const model = options.model ?? DEFAULT_SOURCE_AUDIT_MODEL;
  const effort = options.effort ?? DEFAULT_SOURCE_AUDIT_EFFORT;
  const resolvedIndependentReading = options.recoveredIndependentReading ?? await (async () => {
    const rawIndependentReading = await structuredCall({
      model,
      effort,
      promptVersion: SOURCE_AUDIT_PROMPT_VERSION,
      mediaPacket: packet,
      outputName: 'independent_source_reading',
      schema: SourceBundleSchema,
      input: independentSourceReadingInput(packet),
      maxOutputTokens: 18_000,
      preprocessOutput: (value) => preprocessSourceBundleOutput(value, packet),
      ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    });
    let normalizedReading: ReturnType<typeof normalizeSourceEvidenceSpans>;
    try {
      normalizedReading = normalizeSourceEvidenceSpans({
        bundle: rawIndependentReading.parsedOutput,
        packet,
      });
    } catch (cause) {
      throw new SourceApiOutputValidationError({
        rawOutputText: rawIndependentReading.rawOutputText,
        metadata: rawIndependentReading.metadata,
        cause,
      });
    }
    return {
      ...rawIndependentReading,
      parsedOutput: normalizedReading.bundle,
      normalizationChanges: [
        ...rawIndependentReading.normalizationChanges,
        ...normalizedReading.changes,
      ],
    };
  })();
  if (
    resolvedIndependentReading.metadata.model !== model ||
    resolvedIndependentReading.metadata.effort !== effort
  ) {
    throw new Error('복구된 독립 판독의 모델 또는 effort가 감사 설정과 다르다.');
  }
  await options.onIndependentReading?.(resolvedIndependentReading);
  const comparisonAudit = await structuredCall({
    model,
    effort,
    promptVersion: SOURCE_AUDIT_PROMPT_VERSION,
    mediaPacket: packet,
    outputName: 'source_artifact_batch_comparison_audit',
    schema: SourceArtifactAuditBatchSchema,
    input: {
      task: 'COMPARE_INDEPENDENT_READING_WITH_CANDIDATES',
      batchVersion: SOURCE_ARTIFACT_AUDIT_BATCH_VERSION,
      requiredSourcePacketHash: canonicalSourcePacketHash(packet),
      exclusions: ['OPTIONS', 'ANSWER_KEY', 'OFFICIAL_EXPLANATION'],
      sourcePacket: packet,
      independentReading: resolvedIndependentReading.parsedOutput,
      candidates: candidates.map((candidate, index) => ({
        candidateId: `RUN${index + 1}`,
        requiredArtifactHash: sourceArtifactHash(candidate),
        candidateArtifact: candidate,
      })),
    },
    maxOutputTokens: 30_000,
    preprocessOutput: (value) => preprocessAuditOutput(value, packet),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });
  try {
    validateSourceArtifactAuditBatch({
      batch: comparisonAudit.parsedOutput,
      candidates,
      sourcePacket: packet,
    });
  } catch (cause) {
    rethrowAsOutputValidationError({ call: comparisonAudit, cause });
  }
  return { independentReading: resolvedIndependentReading, comparisonAudit };
}

export async function auditOptionClaimBundle(options: {
  readonly packet: SourcePacket;
  readonly candidate: OptionClaimBundle;
  readonly model?: string;
  readonly effort?: SourceReasoningEffort;
  readonly timeoutMs?: number;
  readonly onIndependentReading?: (call: SourceApiCall<OptionClaimBundle>) => Promise<void>;
}): Promise<OptionClaimAuditCall> {
  const packet = SourcePacketSchema.parse(options.packet);
  if (packet.scope !== 'OPTIONS') throw new Error('OPTIONS packet만 option claim 감사를 할 수 있다.');
  const candidate = OptionClaimBundleSchema.parse(options.candidate);
  const model = options.model ?? DEFAULT_SOURCE_AUDIT_MODEL;
  const common = {
    model,
    effort: options.effort ?? DEFAULT_SOURCE_AUDIT_EFFORT,
    promptVersion: SOURCE_AUDIT_PROMPT_VERSION,
    mediaPacket: packet,
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  } as const;
  const independentReading = await structuredCall({
    ...common,
    outputName: 'independent_option_atomization',
    schema: OptionClaimBundleSchema,
    input: {
      task: 'INDEPENDENT_OPTION_ATOMIZATION',
      candidateArtifact: 'INTENTIONALLY_HIDDEN',
      exclusions: ['ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'TRUTH_JUDGMENT', 'CANDIDATE_BUNDLE'],
      requiredSourcePacketHash: canonicalSourcePacketHash(packet),
      sourcePacket: packet,
    },
    maxOutputTokens: 12_000,
  });
  await options.onIndependentReading?.(independentReading);
  const comparisonAudit = await structuredCall({
    ...common,
    outputName: 'option_claim_comparison_audit',
    schema: SourceArtifactAuditSchema,
    input: {
      task: 'COMPARE_INDEPENDENT_READING_WITH_CANDIDATE',
      auditVersion: SOURCE_ARTIFACT_AUDIT_VERSION,
      requiredArtifactHash: sourceArtifactHash(candidate),
      requiredSourcePacketHash: canonicalSourcePacketHash(packet),
      exclusions: ['ANSWER_KEY', 'OFFICIAL_EXPLANATION', 'TRUTH_JUDGMENT'],
      sourcePacket: packet,
      independentReading: independentReading.parsedOutput,
      candidateArtifact: candidate,
    },
    maxOutputTokens: 12_000,
    preprocessOutput: (value) => preprocessAuditOutput(value, packet),
  });
  try {
    validateSourceArtifactAudit({
      audit: comparisonAudit.parsedOutput,
      artifact: candidate,
      sourcePacket: packet,
    });
  } catch (cause) {
    rethrowAsOutputValidationError({ call: comparisonAudit, cause });
  }
  return { independentReading, comparisonAudit };
}

export function estimateSourceCallInputCharacters(options: {
  readonly promptText: string;
  readonly input: unknown;
}): number {
  return options.promptText.length + JSON.stringify(options.input).length;
}
