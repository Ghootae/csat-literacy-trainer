import { createHash } from 'node:crypto';

import { z } from 'zod/v4';

import { GOLD_GENERATION_EFFORT, MODEL } from './llm/client.js';

export const GOLD_PROMPT_VERSION = 'gold-prompts-2026-08-13-v1';
export const GOLD_SCHEMA_VERSION = 'gold-map-v1';

export type GoldGenerationStatus = 'recorded' | 'legacy/no-fingerprint';

const Sha256Schema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const GoldGenerationMetadataSchema = z.object({
  provider: z.literal('anthropic'),
  model: z.string().min(1),
  effort: z.string().min(1),
  promptVersion: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  /** 정확한 입력 문단을 식별한다. `sha256:` 접두사 뒤는 소문자 hex다. */
  sourceHash: Sha256Schema,
  /** 입력과 무관한 생성기 계약(provider/model/effort/prompt/schema)의 지문이다. */
  generatorFingerprint: Sha256Schema,
  review: z.discriminatedUnion('status', [
    z.object({ status: z.literal('unreviewed') }),
    z.object({ status: z.literal('reviewed'), reviewedAt: z.string().datetime() }),
  ]),
  revisions: z.array(
    z.object({
      at: z.string().datetime(),
      kind: z.enum(['human_edit', 'regeneration', 'migration']),
      note: z.string().min(1).optional(),
    }),
  ),
});

export type GoldGenerationMetadata = z.infer<typeof GoldGenerationMetadataSchema>;

export interface GoldGenerationConfig {
  readonly provider: 'anthropic';
  readonly model: string;
  readonly effort: string;
  readonly promptVersion: string;
  readonly schemaVersion: string;
}

export const GOLD_GENERATION_CONFIG: GoldGenerationConfig = {
  provider: 'anthropic',
  model: MODEL,
  effort: GOLD_GENERATION_EFFORT,
  promptVersion: GOLD_PROMPT_VERSION,
  schemaVersion: GOLD_SCHEMA_VERSION,
};

/** CRLF와 파일 끝 공백 차이는 같은 원문으로 취급하되 본문 내부 공백은 보존한다. */
export function normalizeGoldSource(source: string): string {
  return source.replace(/\r\n?/g, '\n').trim();
}

function sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

/** 키 순서를 코드로 고정해 런타임 JSON 구현과 무관한 지문을 만든다. */
export function goldGeneratorFingerprint(config: GoldGenerationConfig): string {
  return sha256(
    JSON.stringify({
      provider: config.provider,
      model: config.model,
      effort: config.effort,
      promptVersion: config.promptVersion,
      schemaVersion: config.schemaVersion,
    }),
  );
}

export function createGoldGenerationMetadata(
  source: string,
  generatedAt = new Date().toISOString(),
  config: GoldGenerationConfig = GOLD_GENERATION_CONFIG,
): GoldGenerationMetadata {
  return GoldGenerationMetadataSchema.parse({
    ...config,
    generatedAt,
    sourceHash: sha256(normalizeGoldSource(source)),
    generatorFingerprint: goldGeneratorFingerprint(config),
    review: { status: 'unreviewed' },
    revisions: [],
  });
}

/** 메타데이터가 없는 기존 골드는 정상 자산이다. 있는 metadata는 runtime schema를 통과해야 한다. */
export function goldGenerationStatus(gold: { readonly generationMetadata?: unknown }): GoldGenerationStatus {
  if (gold.generationMetadata === undefined) return 'legacy/no-fingerprint';
  GoldGenerationMetadataSchema.parse(gold.generationMetadata);
  return 'recorded';
}
