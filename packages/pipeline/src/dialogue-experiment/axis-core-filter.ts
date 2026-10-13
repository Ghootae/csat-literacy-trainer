import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { ParagraphDiagnosticGoldSchema, type ParagraphDiagnosticGold } from './schema.js';
import type { DialogueEffort } from './evaluator.js';

export const AXIS_CORE_FILTER_VERSION = 'axis-core-filter-v1';
export const AXIS_CORE_FILTER_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/axis-core-filter-prompt-v1.md';
export const AxisCoreFilterOutputSchema = z.object({
  paragraphId: z.string().min(1),
  axes: z.array(z.object({
    axisId: z.string().min(1), originalDescription: z.string().min(1),
    filteredDescription: z.string().min(1), changed: z.boolean(), rationale: z.string().min(1),
    excluded: z.array(z.object({ originalQuote: z.string().min(1), reason: z.string().min(1) })),
  })).min(1),
});
export type AxisCoreFilterOutput = z.infer<typeof AxisCoreFilterOutputSchema>;
export const hashFilterValue = (value: unknown): string => 'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Deliberately allowlists inputs: no student answers, case expectations, or detailed gold. */
export function buildAxisCoreFilterPayload(gold: ParagraphDiagnosticGold): string {
  return JSON.stringify({ paragraphId: gold.paragraphId, paragraphText: gold.paragraphText,
    centralAxes: gold.centralAxes.map(({ id, description }) => ({ id, description })) });
}

/** Checks provenance/shape, not whether the model's semantic removal is justified. */
export function validateAxisCoreFilter(raw: unknown, gold: ParagraphDiagnosticGold): AxisCoreFilterOutput {
  const result = AxisCoreFilterOutputSchema.parse(raw);
  if (result.paragraphId !== gold.paragraphId || result.axes.length !== gold.centralAxes.length) {
    throw new Error('axis filter: paragraph or axis count mismatch');
  }
  result.axes.forEach((axis, i) => {
    const original = gold.centralAxes[i]!;
    if (axis.axisId !== original.id || axis.originalDescription !== original.description) {
      throw new Error('axis filter: axis order/ID or original description mismatch');
    }
    if (!axis.filteredDescription.trim() || !axis.rationale.trim()) throw new Error('axis filter: empty meaning');
    if (axis.changed !== (axis.originalDescription !== axis.filteredDescription)) throw new Error('axis filter: inconsistent changed flag');
    if (!axis.changed && axis.excluded.length) throw new Error('axis filter: unchanged axis cannot exclude content');
    for (const excluded of axis.excluded) {
      if (!excluded.originalQuote.trim() || !original.description.includes(excluded.originalQuote)) {
        throw new Error('axis filter: exclusion is not an exact original-axis quote');
      }
    }
  });
  return result;
}

/** Returns an experimental derivative; never edits the original gold or relation metadata. */
export function applyAxisCoreFilter(gold: ParagraphDiagnosticGold, raw: unknown): ParagraphDiagnosticGold {
  const result = validateAxisCoreFilter(raw, gold);
  const copy = structuredClone(gold);
  return ParagraphDiagnosticGoldSchema.parse({ ...copy,
    centralAxes: copy.centralAxes.map((axis, i) => ({ ...axis, description: result.axes[i]!.filteredDescription })),
  });
}

export class OpenAIAxisCoreFilter {
  constructor(private readonly options: { client?: OpenAI; model?: string; effort?: DialogueEffort } = {}) {}

  async filter(gold: ParagraphDiagnosticGold) {
    const instructions = readFileSync(resolve(process.cwd(), AXIS_CORE_FILTER_PROMPT_PATH), 'utf8').trim();
    const input = buildAxisCoreFilterPayload(gold);
    const model = this.options.model ?? 'gpt-5.6-terra';
    const effort = this.options.effort ?? 'medium';
    const started = performance.now();
    const response = await (this.options.client ?? new OpenAI({ maxRetries: 0 })).responses.parse({
      model, instructions, input, reasoning: { effort }, max_output_tokens: 3500, store: false,
      text: { format: zodTextFormat(AxisCoreFilterOutputSchema, 'axis_core_filter') },
    }, { timeout: 60_000, maxRetries: 0 });
    if (response.output_parsed === null) throw new Error('axis filter: no structured output');
    const result = validateAxisCoreFilter(response.output_parsed, gold);
    const filteredGold = applyAxisCoreFilter(gold, result);
    return { result, filteredGold, metadata: {
      version: AXIS_CORE_FILTER_VERSION, model, effort, responseId: response.id,
      inputHash: hashFilterValue(JSON.parse(input)), promptHash: hashFilterValue(instructions),
      originalGoldHash: hashFilterValue(gold), filteredGoldHash: hashFilterValue(filteredGold),
      durationMs: Math.round(performance.now() - started), usage: response.usage,
      rawResult: response.output_parsed,
    } };
  }
}
