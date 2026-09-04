import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphGoldAuditOutputSchema,
  ParagraphGoldRepairOutputSchema,
  ParagraphPropositionBundleSchema,
  createRepairedParagraphPropositionBundle,
  validateParagraphGoldAudit,
  validateParagraphGoldRepair,
  type ParagraphGoldAuditOutput,
  type ParagraphGoldRepairOutput,
  type ParagraphPropositionBundle,
} from './production.js';

export const PARAGRAPH_GOLD_AUDIT_PROMPT_VERSION = 'paragraph-gold-audit-prompt-v1' as const;
export const PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION = 'paragraph-gold-repair-prompt-v2' as const;

const AUDIT_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-audit-prompt-v1.md',
);
const REPAIR_PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-repair-prompt-v1.md',
);
const REPAIR_LESSONS_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-gold-repair-lessons-canary-batch-001.md',
);

export const ParagraphGoldAuditInputSchema = z.object({
  sourceId: z.string().min(1),
  passageId: z.string().min(1),
  passageParagraphs: z.array(z.object({
    paragraphId: z.string().min(1),
    position: z.number().int().positive(),
    text: z.string().min(1),
  }).strict()).min(1),
  targetParagraph: z.object({
    paragraphId: z.string().min(1),
    position: z.number().int().positive(),
    text: z.string().min(1),
    textReferencesVisual: z.boolean(),
    passageMediaCount: z.number().int().nonnegative(),
  }).strict(),
  diagnosticGold: ParagraphDiagnosticGoldSchema,
  propositionBundle: ParagraphPropositionBundleSchema,
}).strict().superRefine((input, context) => {
  const target = input.passageParagraphs.find((paragraph) =>
    paragraph.paragraphId === input.targetParagraph.paragraphId);
  if (
    target === undefined ||
    target.position !== input.targetParagraph.position ||
    target.text !== input.targetParagraph.text
  ) {
    context.addIssue({
      code: 'custom',
      path: ['targetParagraph'],
      message: '감사 대상 문단이 전체 지문 문단 목록과 일치하지 않는다.',
    });
  }
  if (
    input.diagnosticGold.paragraphId !== input.targetParagraph.paragraphId ||
    input.diagnosticGold.paragraphText !== input.targetParagraph.text ||
    input.propositionBundle.paragraphId !== input.targetParagraph.paragraphId ||
    input.propositionBundle.sourceId !== input.sourceId ||
    input.propositionBundle.passageId !== input.passageId
  ) {
    context.addIssue({
      code: 'custom',
      path: ['diagnosticGold'],
      message: '감사 후보의 원천 ID 또는 문단 원문이 입력과 일치하지 않는다.',
    });
  }
});
export type ParagraphGoldAuditInput = z.infer<typeof ParagraphGoldAuditInputSchema>;

export const ParagraphGoldRepairInputSchema = ParagraphGoldAuditInputSchema.extend({
  audit: ParagraphGoldAuditOutputSchema,
}).strict().superRefine((input, context) => {
  if (
    input.audit.sourceId !== input.sourceId ||
    input.audit.paragraphId !== input.targetParagraph.paragraphId
  ) {
    context.addIssue({
      code: 'custom',
      path: ['audit'],
      message: '수리 대상 감사 결과가 원천 문단과 일치하지 않는다.',
    });
  }
  if (input.audit.decision !== 'REPAIR_REQUIRED') {
    context.addIssue({
      code: 'custom',
      path: ['audit', 'decision'],
      message: 'REPAIR_REQUIRED인 문단만 자동 수리할 수 있다.',
    });
  }
});
export type ParagraphGoldRepairInput = z.infer<typeof ParagraphGoldRepairInputSchema>;

export interface ParagraphGoldApiMetadata {
  readonly provider: 'openai';
  readonly model: string;
  readonly effort: 'medium' | 'high';
  readonly serviceTier: 'default';
  readonly promptVersion: string;
  readonly responseId: string;
  readonly durationMs: number;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly reasoningTokens: number;
    readonly cachedInputTokens: number;
    readonly cacheWriteTokens: number;
  };
}

function metadata(options: {
  readonly response: Awaited<ReturnType<OpenAI['responses']['parse']>>;
  readonly model: string;
  readonly effort: 'medium' | 'high';
  readonly promptVersion: string;
  readonly durationMs: number;
}): ParagraphGoldApiMetadata {
  const usage = options.response.usage;
  return {
    provider: 'openai',
    model: options.model,
    effort: options.effort,
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

export function loadParagraphGoldAuditPrompt(): string {
  return readFileSync(AUDIT_PROMPT_PATH, 'utf8').trim();
}

export function loadParagraphGoldRepairPrompt(): string {
  return [
    readFileSync(REPAIR_PROMPT_PATH, 'utf8').trim(),
    readFileSync(REPAIR_LESSONS_PATH, 'utf8').trim(),
  ].join('\n\n');
}

export async function auditParagraphGoldWithOpenAI(
  inputValue: ParagraphGoldAuditInput,
  config: {
    readonly model: string;
    readonly effort: 'medium' | 'high';
    readonly maxOutputTokens?: number;
    readonly client?: OpenAI;
  },
): Promise<{ readonly result: ParagraphGoldAuditOutput; readonly metadata: ParagraphGoldApiMetadata }> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadParagraphGoldAuditPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: config.maxOutputTokens ?? 12_000,
    store: false,
    text: { format: zodTextFormat(ParagraphGoldAuditOutputSchema, 'paragraph_gold_audit') },
  });
  if (response.output_parsed === null) {
    throw new Error('paragraph gold audit: structured output parsing failed');
  }
  const result = validateParagraphGoldAudit({
    audit: response.output_parsed,
    sourceId: input.sourceId,
    diagnosticGold: input.diagnosticGold,
    propositionBundle: input.propositionBundle,
  });
  return {
    result,
    metadata: metadata({
      response,
      model: config.model,
      effort: config.effort,
      promptVersion: PARAGRAPH_GOLD_AUDIT_PROMPT_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}

export async function repairParagraphGoldWithOpenAI(
  inputValue: ParagraphGoldRepairInput,
  config: {
    readonly model: string;
    readonly effort: 'medium' | 'high';
    readonly maxOutputTokens?: number;
    readonly client?: OpenAI;
  },
): Promise<{
  readonly result: ParagraphGoldRepairOutput;
  readonly diagnosticGold: z.infer<typeof ParagraphDiagnosticGoldSchema>;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly metadata: ParagraphGoldApiMetadata;
}> {
  const input = ParagraphGoldRepairInputSchema.parse(inputValue);
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadParagraphGoldRepairPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: config.maxOutputTokens ?? 16_000,
    store: false,
    text: { format: zodTextFormat(ParagraphGoldRepairOutputSchema, 'paragraph_gold_repair') },
  });
  if (response.output_parsed === null) {
    throw new Error('paragraph gold repair: structured output parsing failed');
  }
  const result = validateParagraphGoldRepair({
    repair: response.output_parsed,
    sourceId: input.sourceId,
    paragraphText: input.targetParagraph.text,
    audit: input.audit,
  });
  return {
    result,
    diagnosticGold: result.diagnosticGold,
    propositionBundle: createRepairedParagraphPropositionBundle({
      original: input.propositionBundle,
      repair: result,
      repairRunId: response.id,
    }),
    metadata: metadata({
      response,
      model: config.model,
      effort: config.effort,
      promptVersion: PARAGRAPH_GOLD_REPAIR_PROMPT_VERSION,
      durationMs: Math.round(performance.now() - started),
    }),
  };
}
