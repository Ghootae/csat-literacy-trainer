import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION,
  PrincipleExceptionEvidenceV4OutputSchema,
  validatePrincipleExceptionEvidenceV4,
  type PrincipleExceptionEvidenceV4Output,
} from './principle-exception-adjudicator-v4.js';
import {
  ParagraphGoldAuditInputSchema,
  type ParagraphGoldApiMetadata,
  type ParagraphGoldAuditInput,
} from './production-runtime.js';

const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/principle-exception-adjudicator-prompt-v4.md',
);

export function loadPrincipleExceptionAdjudicatorV4Prompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

export async function extractPrincipleExceptionEvidenceV4WithOpenAI(
  inputValue: ParagraphGoldAuditInput,
  config: { readonly model: string; readonly maxOutputTokens: number; readonly client: OpenAI },
): Promise<{
  readonly result: PrincipleExceptionEvidenceV4Output;
  readonly metadata: ParagraphGoldApiMetadata;
}> {
  const input = ParagraphGoldAuditInputSchema.parse(inputValue);
  const started = performance.now();
  const response = await config.client.responses.parse({
    model: config.model,
    service_tier: 'default',
    instructions: loadPrincipleExceptionAdjudicatorV4Prompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: 'medium' },
    max_output_tokens: config.maxOutputTokens,
    store: false,
    text: {
      format: zodTextFormat(PrincipleExceptionEvidenceV4OutputSchema, 'principle_exception_evidence_v4'),
    },
  });
  if (response.output_parsed === null) throw new Error('원칙-예외 v4 증거 parsing failed');
  return {
    result: validatePrincipleExceptionEvidenceV4(response.output_parsed, input),
    metadata: {
      provider: 'openai', model: config.model, effort: 'medium', serviceTier: 'default',
      promptVersion: PRINCIPLE_EXCEPTION_ADJUDICATOR_V4_VERSION,
      responseId: response.id, durationMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        reasoningTokens: response.usage?.output_tokens_details.reasoning_tokens ?? 0,
        cachedInputTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteTokens: response.usage?.input_tokens_details.cache_write_tokens ?? 0,
      },
    },
  };
}

