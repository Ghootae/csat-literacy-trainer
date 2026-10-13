import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

import {
  PARAGRAPH_GOLD_AUDIT_V2_VERSION,
  PARAGRAPH_GOLD_PATCH_REPAIR_VERSION,
  ParagraphGoldAuditV2OutputSchema,
  ParagraphGoldPatchRepairOutputSchema,
  applyParagraphGoldPatchRepair,
  validateParagraphGoldAuditV2,
  type ParagraphGoldAuditV2Output,
} from './audit-v2.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from './production-runtime.js';

const AUDIT_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-audit-prompt-v2.md',
);
const PATCH_REPAIR_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-patch-repair-prompt-v1.md',
);

export const ParagraphGoldPatchRepairInputSchema = ParagraphGoldAuditInputSchema.extend({
  audit: ParagraphGoldAuditV2OutputSchema,
}).strict().superRefine((input, context) => {
  if (input.audit.sourceId !== input.sourceId ||
      input.audit.paragraphId !== input.targetParagraph.paragraphId) {
    context.addIssue({ code: 'custom', path: ['audit'], message: '수리 감사 원천 ID 불일치' });
  }
  if (input.audit.decision !== 'REPAIR_REQUIRED') {
    context.addIssue({ code: 'custom', path: ['audit', 'decision'], message: 'REPAIR_REQUIRED만 patch 수리 가능' });
  }
});
export type ParagraphGoldPatchRepairInput = z.infer<typeof ParagraphGoldPatchRepairInputSchema>;

export function loadParagraphGoldAuditV2Prompt(): string {
  return readFileSync(AUDIT_PROMPT_PATH, 'utf8').trim();
}

export function loadParagraphGoldPatchRepairPrompt(): string {
  return readFileSync(PATCH_REPAIR_PROMPT_PATH, 'utf8').trim();
}

function metadata(options: {
  readonly response: Awaited<ReturnType<OpenAI['responses']['parse']>>;
  readonly model: string;
  readonly promptVersion: string;
  readonly durationMs: number;
}): ParagraphGoldApiMetadata {
  const usage = options.response.usage;
  return {
    provider: 'openai',
    model: options.model,
    effort: 'medium',
    serviceTier: 'default',
    promptVersion: options.promptVersion,
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

export async function auditParagraphGoldV2WithOpenAI(
  inputValue: ParagraphGoldAuditInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
): Promise<{ readonly result: ParagraphGoldAuditV2Output; readonly metadata: ParagraphGoldApiMetadata }> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadParagraphGoldAuditV2Prompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: { format: zodTextFormat(ParagraphGoldAuditV2OutputSchema, 'paragraph_gold_audit_v2') },
  });
  if (response.output_parsed === null) throw new Error('paragraph gold audit v2 parsing failed');
  return {
    result: validateParagraphGoldAuditV2(response.output_parsed, input),
    metadata: metadata({
      response,
      model: config.model,
      promptVersion: PARAGRAPH_GOLD_AUDIT_V2_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}

export async function repairParagraphGoldByPatchWithOpenAI(
  inputValue: ParagraphGoldPatchRepairInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
) {
  const input = ParagraphGoldPatchRepairInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadParagraphGoldPatchRepairPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: { format: zodTextFormat(ParagraphGoldPatchRepairOutputSchema, 'paragraph_gold_patch_repair') },
  });
  if (response.output_parsed === null) throw new Error('paragraph gold patch repair parsing failed');
  const {
    audit: _audit,
    ...auditInput
  } = input;
  const patched = applyParagraphGoldPatchRepair({
    input: auditInput,
    audit: input.audit,
    repair: response.output_parsed,
    repairRunId: response.id,
  });
  return {
    result: ParagraphGoldPatchRepairOutputSchema.parse(response.output_parsed),
    ...patched,
    metadata: metadata({
      response,
      model: config.model,
      promptVersion: PARAGRAPH_GOLD_PATCH_REPAIR_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}
