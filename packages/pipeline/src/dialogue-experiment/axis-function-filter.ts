import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { applyAxisCoreFilter, hashFilterValue } from './axis-core-filter.js';
import type { ParagraphDiagnosticGold } from './schema.js';
import type { DialogueEffort } from './evaluator.js';

export const AXIS_FUNCTION_FILTER_VERSION = 'axis-function-filter-v1';
export const AXIS_FUNCTION_FILTER_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/axis-function-filter-prompt-v1.md';
export const AxisFunctionFilterOutputSchema = z.object({
  paragraphId: z.string().min(1),
  axes: z.array(z.object({
    axisId: z.string().min(1), originalDescription: z.string().min(1),
    explanationFunction: z.string().min(1), functionBasisAxisQuote: z.string().min(1),
    objectConnection: z.string().min(1), filteredDescription: z.string().min(1),
    rationale: z.string().min(1), preservationCheck: z.string().min(1),
    excluded: z.array(z.object({ originalQuote: z.string().min(1), reason: z.string().min(1) })),
  })).min(1),
});

/** Central object is interpretive context, not a new rubric or a student-conditioned input. */
export function buildAxisFunctionFilterPayload(gold: ParagraphDiagnosticGold): string {
  return JSON.stringify({ paragraphId: gold.paragraphId, paragraphText: gold.paragraphText,
    centralObject: gold.centralObject,
    centralAxes: gold.centralAxes.map(({ id, description }) => ({ id, description })) });
}

export function validateAxisFunctionFilter(raw: unknown, gold: ParagraphDiagnosticGold) {
  const parsed = AxisFunctionFilterOutputSchema.parse(raw);
  const result = { ...parsed, axes: parsed.axes.map(axis => ({ ...axis,
    changed: axis.originalDescription !== axis.filteredDescription,
  })) };
  // Existing provenance checks remain; changed is derived rather than predicted.
  applyAxisCoreFilter(gold, result);
  result.axes.forEach((axis, i) => {
    for (const text of [axis.explanationFunction, axis.functionBasisAxisQuote, axis.objectConnection, axis.preservationCheck]) {
      if (!text.trim()) throw new Error('axis function filter: empty function audit');
    }
    if (!gold.centralAxes[i]!.description.includes(axis.functionBasisAxisQuote)) {
      throw new Error('axis function filter: function basis is not an original-axis quote');
    }
  });
  return result;
}

/** Only description reaches evaluation. Function/audit fields never become student requirements. */
export function applyAxisFunctionFilter(gold: ParagraphDiagnosticGold, raw: unknown): ParagraphDiagnosticGold {
  return applyAxisCoreFilter(gold, validateAxisFunctionFilter(raw, gold));
}

export class OpenAIAxisFunctionFilter {
  constructor(private readonly options: { client?: OpenAI; model?: string; effort?: DialogueEffort } = {}) {}
  async filter(gold: ParagraphDiagnosticGold) {
    const instructions = readFileSync(AXIS_FUNCTION_FILTER_PROMPT_PATH, 'utf8').trim();
    const input = buildAxisFunctionFilterPayload(gold);
    const model = this.options.model ?? 'gpt-5.6-terra';
    const effort = this.options.effort ?? 'medium';
    const started = performance.now();
    const response = await (this.options.client ?? new OpenAI({ maxRetries: 0 })).responses.parse({
      model, instructions, input, reasoning: { effort }, max_output_tokens: 3500, store: false,
      text: { format: zodTextFormat(AxisFunctionFilterOutputSchema, 'axis_function_filter') },
    }, { timeout: 60_000, maxRetries: 0 });
    if (!response.output_parsed) throw new Error('axis function filter: no structured output');
    const result = validateAxisFunctionFilter(response.output_parsed, gold);
    const filteredGold = applyAxisFunctionFilter(gold, result);
    return { result, filteredGold, metadata: {
      version: AXIS_FUNCTION_FILTER_VERSION, model, effort, responseId: response.id,
      inputHash: hashFilterValue(JSON.parse(input)), promptHash: hashFilterValue(instructions),
      originalGoldHash: hashFilterValue(gold), filteredGoldHash: hashFilterValue(filteredGold),
      durationMs: Math.round(performance.now() - started), usage: response.usage, rawResult: response.output_parsed,
    } };
  }
}
