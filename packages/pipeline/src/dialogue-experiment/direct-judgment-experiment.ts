import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v4';
import { buildCentralStoryGatePayload } from './gate.js';
import type { DialogueEvaluationInput } from './evaluator.js';

export const DIRECT_JUDGMENT_VERSION = 'axis-direct-judgment-v1';
export const DIRECT_JUDGMENT_PROMPT_PATH = 'packages/pipeline/experiments/dialogue/axis-direct-judgment-prompt-v1.md';
export const DirectJudgmentSchema = z.object({ axes: z.array(z.object({
  axisId: z.string(),
  status: z.enum(['PASS', 'UNCLEAR_OK', 'UNCLEAR_SERIOUS', 'ERROR']),
  reason: z.string(),
}).strict()) }).strict();

export function validateDirectJudgment(raw: unknown, axisIds: readonly string[]) {
  const result = DirectJudgmentSchema.parse(raw);
  const ids = result.axes.map(a => a.axisId);
  if (ids.length !== axisIds.length || new Set(ids).size !== ids.length || ids.some(id => !axisIds.includes(id))) {
    throw new Error('direct judgment: all input axes must appear exactly once');
  }
  if (result.axes.some(a => !a.reason.trim())) throw new Error('direct judgment: empty reason');
  return result; // Never change the model's labels to satisfy expectations.
}

/** Offline candidate only. No production routing, retries, extra evaluator or feedback call. */
export class DirectJudgmentExperiment {
  constructor(private readonly transport: OpenAI) {}
  async evaluate(input: DialogueEvaluationInput) {
    const response = await this.transport.responses.parse({
      model: 'gpt-5.6-terra',
      instructions: readFileSync(DIRECT_JUDGMENT_PROMPT_PATH, 'utf8').trim(),
      input: buildCentralStoryGatePayload(input),
      reasoning: { effort: 'medium' },
      max_output_tokens: 4000,
      store: false,
      text: { format: zodTextFormat(DirectJudgmentSchema, 'axis_direct_judgment') },
    }, { timeout: 60_000, maxRetries: 0 });
    if (response.output_parsed == null) throw new Error('direct judgment: missing parsed output');
    return validateDirectJudgment(response.output_parsed, input.gold.centralAxes.map(a => a.id));
  }
}
