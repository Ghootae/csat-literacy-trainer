import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  CENTRAL_AXES_PROMPT_VERSION,
  CentralAxesResultSchema,
  type CentralAxesInput,
  type CentralAxesResult,
} from './schema.js';

export type CentralAxesEffort = 'medium' | 'high';

export interface CentralAxesCallResult {
  readonly result: CentralAxesResult;
  readonly metadata: {
    readonly provider: 'openai';
    readonly model: string;
    readonly effort: CentralAxesEffort;
    readonly promptVersion: typeof CENTRAL_AXES_PROMPT_VERSION;
    readonly responseId: string;
    readonly durationMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly reasoningTokens: number;
      readonly cachedInputTokens: number;
      readonly cacheWriteTokens: number;
    };
  };
}
const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/central-axes-prompt-v1.md',
);

export function loadCentralAxesPrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return true;
    seen.add(value);
    return false;
  });
}

export function validateCentralAxesResult(
  result: CentralAxesResult,
  input: CentralAxesInput,
): CentralAxesResult {
  if (result.paragraphId !== input.paragraphId) {
    throw new Error(`central axes: paragraphId changed to ${result.paragraphId}`);
  }
  if (result.centralStory !== input.centralStory) {
    throw new Error('central axes: centralStory must be preserved exactly');
  }

  const axisIds = result.centralAxes.map((axis) => axis.id);
  if (duplicates(axisIds).length > 0) throw new Error('central axes: duplicate axis IDs');
  const meaningIds = result.centralStoryMeanings.map((meaning) => meaning.id);
  if (duplicates(meaningIds).length > 0) throw new Error('central axes: duplicate meaning IDs');

  const allowedAxisIds = new Set(axisIds);
  for (const meaning of result.centralStoryMeanings) {
    for (const axisId of meaning.axisIds) {
      if (!allowedAxisIds.has(axisId)) {
        throw new Error(`central axes: unknown axis reference ${axisId}`);
      }
    }
  }
  const coveredAxes = new Set(result.centralStoryMeanings.flatMap((meaning) => meaning.axisIds));
  for (const axisId of axisIds) {
    if (!coveredAxes.has(axisId)) throw new Error(`central axes: uncovered axis ${axisId}`);
  }

  const relationIds = input.coreRelations.map((relation) => relation.id);
  if (duplicates(relationIds).length > 0) throw new Error('central axes: duplicate input relation IDs');
  const allowedRelationIds = new Set(relationIds);
  for (const relationId of [
    ...result.centralAxes.flatMap((axis) => axis.relationIds),
    ...result.unmappedCoreRelationIds,
    ...result.issues.flatMap((issue) => issue.relatedRelationIds),
  ]) {
    if (!allowedRelationIds.has(relationId)) {
      throw new Error(`central axes: unknown relation reference ${relationId}`);
    }
  }

  const mapped = new Set(result.centralAxes.flatMap((axis) => axis.relationIds));
  const declaredUnmapped = new Set(result.unmappedCoreRelationIds);
  for (const relationId of relationIds) {
    const membershipCount = Number(mapped.has(relationId)) + Number(declaredUnmapped.has(relationId));
    if (membershipCount !== 1) {
      throw new Error(`central axes: relation ${relationId} must be mapped or declared unmapped`);
    }
  }

  if (result.verdict === 'READY') {
    if (result.issues.length > 0 || result.unmappedCoreRelationIds.length > 0) {
      throw new Error('central axes: READY result cannot contain issues or unmapped relations');
    }
    if (result.centralAxes.some((axis) => axis.relationIds.length === 0)) {
      throw new Error('central axes: every READY axis needs at least one relation');
    }
  } else if (result.issues.length === 0) {
    throw new Error('central axes: NEEDS_REVIEW result must explain at least one issue');
  }

  return result;
}

export async function generateCentralAxesWithOpenAI(
  input: CentralAxesInput,
  config: {
    readonly model: string;
    readonly effort: CentralAxesEffort;
    readonly client?: OpenAI;
  },
): Promise<CentralAxesCallResult> {
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    instructions: loadCentralAxesPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: 8_000,
    store: false,
    text: {
      format: zodTextFormat(CentralAxesResultSchema, 'central_axes_result'),
    },
  });

  if (response.output_parsed === null) {
    throw new Error('central axes: structured output parsing failed');
  }

  const usage = response.usage;
  return {
    result: validateCentralAxesResult(response.output_parsed, input),
    metadata: {
      provider: 'openai',
      model: config.model,
      effort: config.effort,
      promptVersion: CENTRAL_AXES_PROMPT_VERSION,
      responseId: response.id,
      durationMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
        cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteTokens: usage?.input_tokens_details.cache_write_tokens ?? 0,
      },
    },
  };
}
