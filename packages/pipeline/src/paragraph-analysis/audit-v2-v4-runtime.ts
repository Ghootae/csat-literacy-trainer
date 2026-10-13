import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION,
  ParagraphGoldAuditV2V4OutputSchema,
  evaluateParagraphGoldAuditV2V4,
  type ParagraphGoldAuditV2V4Evaluation,
  type ParagraphGoldAuditV2V4Output,
} from './audit-v2-v4.js';
import { loadParagraphGoldAuditV2Prompt } from './audit-v2-runtime.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from './production-runtime.js';

const SUPPLEMENT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-audit-v2-v4-supplement.md',
);

export function loadParagraphGoldAuditV2V4Prompt(): string {
  return `${loadParagraphGoldAuditV2Prompt()}\n\n${readFileSync(SUPPLEMENT_PATH, 'utf8').trim()}`;
}

function metadata(options: {
  readonly response: Awaited<ReturnType<OpenAI['responses']['parse']>>;
  readonly model: string;
  readonly durationMs: number;
}): ParagraphGoldApiMetadata {
  const usage = options.response.usage;
  return {
    provider: 'openai',
    model: options.model,
    effort: 'medium',
    serviceTier: 'default',
    promptVersion: PARAGRAPH_GOLD_AUDIT_V2_V4_VERSION,
    responseId: options.response.id,
    durationMs: options.durationMs,
    usage: {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
      cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
      cacheWriteTokens: usage?.input_tokens_details.cache_write_tokens ?? 0,
    },
  };
}

export async function auditParagraphGoldV2V4WithOpenAI(
  inputValue: ParagraphGoldAuditInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
): Promise<{
  readonly rawResult: ParagraphGoldAuditV2V4Output;
  readonly evaluation: ParagraphGoldAuditV2V4Evaluation;
  readonly metadata: ParagraphGoldApiMetadata;
}> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadParagraphGoldAuditV2V4Prompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: {
      format: zodTextFormat(ParagraphGoldAuditV2V4OutputSchema, 'paragraph_gold_audit_v2_v4'),
    },
  });
  if (response.output_parsed === null) throw new Error('paragraph gold audit v2+v4 parsing failed');
  const rawResult = ParagraphGoldAuditV2V4OutputSchema.parse(response.output_parsed);
  return {
    rawResult,
    evaluation: evaluateParagraphGoldAuditV2V4(rawResult, input),
    metadata: metadata({
      response,
      model: config.model,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}
