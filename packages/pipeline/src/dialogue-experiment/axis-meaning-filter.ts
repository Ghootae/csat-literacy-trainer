import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { applyAxisCoreFilter, hashFilterValue } from './axis-core-filter.js';
import { buildAxisFunctionFilterPayload } from './axis-function-filter.js';
import type { ParagraphDiagnosticGold } from './schema.js';

export const AXIS_MEANING_FILTER_VERSION = 'axis-meaning-filter-v1';
export const AXIS_MEANING_FILTER_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/axis-meaning-filter-prompt-v1.md';
const nonblank = z.string().min(1);
export const AxisMeaningFilterOutputSchema = z.object({
  paragraphId: nonblank,
  axes: z.array(z.object({
    axisId: nonblank, originalDescription: nonblank, axisContribution: nonblank,
    semanticUnits: z.array(z.object({
      unitId: nonblank, meaning: nonblank, basisQuote: nonblank,
      status: z.enum(['required', 'optional']), omissionImpact: nonblank,
    })).min(1),
    retainedUnitIds: z.array(nonblank).min(1), filteredDescription: nonblank,
    jointOmissionCheck: nonblank, scopeCheck: nonblank,
  })).min(1),
});
export const buildAxisMeaningFilterPayload = buildAxisFunctionFilterPayload;

/** Provenance and reference integrity only; no claim of semantic entailment. */
export function validateAxisMeaningFilter(raw: unknown, gold: ParagraphDiagnosticGold) {
  const parsed = AxisMeaningFilterOutputSchema.parse(raw);
  const result = { ...parsed, axes: parsed.axes.map(axis => ({ ...axis,
    changed: axis.originalDescription !== axis.filteredDescription,
    rationale: axis.axisContribution,
    excluded: axis.semanticUnits.filter(u => u.status === 'optional').map(u => ({ originalQuote: u.basisQuote, reason: u.omissionImpact })),
  })) };
  applyAxisCoreFilter(gold, result);
  for (const axis of result.axes) {
    const text = [axis.axisContribution, axis.jointOmissionCheck, axis.scopeCheck,
      ...axis.semanticUnits.flatMap(u => [u.unitId, u.meaning, u.basisQuote, u.omissionImpact])];
    if (text.some(t => !t.trim())) throw new Error('meaning filter: blank audit');
    const ids = axis.semanticUnits.map(u => u.unitId);
    if (new Set(ids).size !== ids.length) throw new Error('meaning filter: duplicate unit ID');
    if (axis.semanticUnits.some(u => !axis.originalDescription.includes(u.basisQuote))) throw new Error('meaning filter: unit basis is not an original-axis quote');
    const required = axis.semanticUnits.filter(u => u.status === 'required').map(u => u.unitId);
    if (new Set(axis.retainedUnitIds).size !== axis.retainedUnitIds.length ||
      JSON.stringify([...required].sort()) !== JSON.stringify([...axis.retainedUnitIds].sort())) {
      throw new Error('meaning filter: retained IDs must match required units');
    }
  }
  return result;
}

/** Offline derivative only. Audit decomposition never enters the student gold. */
export function applyAxisMeaningFilter(gold: ParagraphDiagnosticGold, raw: unknown) {
  return applyAxisCoreFilter(gold, validateAxisMeaningFilter(raw, gold));
}

export class OpenAIAxisMeaningFilter {
  constructor(private readonly options: { client?: OpenAI } = {}) {}
  async filter(gold: ParagraphDiagnosticGold) {
    const instructions = readFileSync(AXIS_MEANING_FILTER_PROMPT_PATH, 'utf8').trim();
    const input = buildAxisMeaningFilterPayload(gold);
    const started = performance.now();
    const response = await (this.options.client ?? new OpenAI({ maxRetries: 0 })).responses.parse({
      model: 'gpt-5.6-terra', instructions, input, reasoning: { effort: 'medium' },
      max_output_tokens: 6500, store: false, service_tier: 'default',
      text: { format: zodTextFormat(AxisMeaningFilterOutputSchema, 'axis_meaning_filter') },
    }, { timeout: 60_000, maxRetries: 0 });
    if (!response.output_parsed) throw new Error('meaning filter: no structured output');
    const result = validateAxisMeaningFilter(response.output_parsed, gold);
    const filteredGold = applyAxisMeaningFilter(gold, result);
    return { result, filteredGold, metadata: {
      version: AXIS_MEANING_FILTER_VERSION, responseId: response.id,
      inputHash: hashFilterValue(JSON.parse(input)), promptHash: hashFilterValue(instructions),
      originalGoldHash: hashFilterValue(gold), filteredGoldHash: hashFilterValue(filteredGold),
      durationMs: Math.round(performance.now() - started), usage: response.usage, rawResult: response.output_parsed,
    } };
  }
}
