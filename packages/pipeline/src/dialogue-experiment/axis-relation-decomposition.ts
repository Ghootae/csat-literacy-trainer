import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { hashFilterValue } from './axis-core-filter.js';

export const AXIS_RELATION_VERSION = 'axis-relation-decomposition-v1';
export const AXIS_RELATION_PROMPT = 'packages/pipeline/experiments/dialogue/axis-relation-decomposition-prompt-v1.md';
const text = z.string().min(1);
const annotation = z.strictObject({ text, basisQuote: text });
export const AxisRelationInputSchema = z.strictObject({ paragraphId: text,
  centralAxes: z.array(z.strictObject({ id: text, description: text })).min(1) });
export type AxisRelationInput = z.infer<typeof AxisRelationInputSchema>;
export const AxisRelationOutputSchema = z.strictObject({ paragraphId: text,
  axes: z.array(z.strictObject({ axisId: text, originalDescription: text,
    relations: z.array(z.strictObject({ relationId: text, statement: text,
      subjects: z.array(text).min(1), objects: z.array(text),
      direction: z.enum(['subject_to_object', 'mutual', 'state_or_attribute']),
      transition: z.strictObject({ from: text, to: text }).nullable(),
      conditions: z.array(annotation), modifiers: z.array(annotation), evidenceQuotes: z.array(text).min(1),
    })),
    unresolved: z.array(z.strictObject({ quote: text, issue: text })),
  })).min(1),
});

/** Allowlist prevents paragraph text, gold, expectations and student data entering requests. */
export function buildAxisRelationPayload(input: AxisRelationInput): string {
  return JSON.stringify(AxisRelationInputSchema.parse({ paragraphId: input.paragraphId,
    centralAxes: input.centralAxes.map(({ id, description }) => ({ id, description })) }));
}

/** Structural/provenance checks, not a semantic completeness or entailment proof. */
export function validateAxisRelations(raw: unknown, input: AxisRelationInput) {
  const result = AxisRelationOutputSchema.parse(raw);
  if (result.paragraphId !== input.paragraphId || result.axes.length !== input.centralAxes.length) throw new Error('relation extraction: axis/paragraph count mismatch');
  result.axes.forEach((a, i) => {
    const original = input.centralAxes[i]!;
    if (a.axisId !== original.id || a.originalDescription !== original.description) throw new Error('relation extraction: axis ID/order/original mismatch');
    if (!a.relations.length && !a.unresolved.length) throw new Error('relation extraction: silent empty extraction');
    if (new Set(a.relations.map(r => r.relationId)).size !== a.relations.length) throw new Error('relation extraction: duplicate relation ID');
    const quotes = [...a.unresolved.map(u => u.quote), ...a.relations.flatMap(r => [
      ...r.evidenceQuotes, ...r.conditions.map(c => c.basisQuote), ...r.modifiers.map(m => m.basisQuote),
    ])];
    if (quotes.some(q => !q.trim() || !original.description.includes(q))) throw new Error('relation extraction: non-axis quote');
    const strings = [...a.unresolved.map(u => u.issue), ...a.relations.flatMap(r => [r.relationId, r.statement,
      ...r.subjects, ...r.objects, ...(r.transition ? [r.transition.from, r.transition.to] : []),
      ...r.conditions.map(c => c.text), ...r.modifiers.map(m => m.text)])];
    if (strings.some(s => !s.trim())) throw new Error('relation extraction: blank meaning');
  });
  return result;
}

export class OpenAIAxisRelationDecomposer {
  constructor(private readonly options: { client?: OpenAI } = {}) {}
  async extract(source: AxisRelationInput) {
    const input = buildAxisRelationPayload(source);
    const instructions = readFileSync(AXIS_RELATION_PROMPT, 'utf8').trim();
    const started = performance.now();
    const response = await (this.options.client ?? new OpenAI({ maxRetries: 0 })).responses.parse({
      model: 'gpt-5.6-terra', instructions, input, reasoning: { effort: 'medium' },
      max_output_tokens: 6500, store: false, service_tier: 'default',
      text: { format: zodTextFormat(AxisRelationOutputSchema, 'axis_relation_decomposition') },
    }, { timeout: 60_000, maxRetries: 0 });
    if (!response.output_parsed) throw new Error('relation extraction: no structured output');
    const result = validateAxisRelations(response.output_parsed, source);
    return { result, metadata: { version: AXIS_RELATION_VERSION, responseId: response.id,
      inputHash: hashFilterValue(JSON.parse(input)), promptHash: hashFilterValue(instructions),
      durationMs: Math.round(performance.now() - started), usage: response.usage, rawResult: response.output_parsed,
    } };
  }
}
