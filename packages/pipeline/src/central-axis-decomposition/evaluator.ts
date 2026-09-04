import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  CENTRAL_AXIS_DECOMPOSITION_PROMPT_VERSION,
  CentralAxisDecompositionResultSchema,
  type CentralAxisDecompositionInput,
  type CentralAxisDecompositionResult,
} from './schema.js';

export type CentralAxisDecompositionEffort = 'medium' | 'high';

export interface CentralAxisDecompositionCallResult {
  readonly result: CentralAxisDecompositionResult;
  readonly metadata: {
    readonly provider: 'openai';
    readonly model: string;
    readonly effort: CentralAxisDecompositionEffort;
    readonly promptVersion: typeof CENTRAL_AXIS_DECOMPOSITION_PROMPT_VERSION;
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
  'packages/pipeline/experiments/dialogue/central-axis-decomposition-prompt-v2.md',
);

export function loadCentralAxisDecompositionPrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`central axis decomposition: duplicate ${field}`);
  }
}

export function validateCentralAxisDecompositionResult(
  result: CentralAxisDecompositionResult,
  input: CentralAxisDecompositionInput,
): CentralAxisDecompositionResult {
  if (result.paragraphId !== input.paragraphId) {
    throw new Error(`central axis decomposition: paragraphId changed to ${result.paragraphId}`);
  }
  if (result.centralStory !== input.centralStory) {
    throw new Error('central axis decomposition: centralStory must be preserved exactly');
  }

  const axisIds = result.centralAxes.map((axis) => axis.id);
  const meaningIds = result.centralStoryMeanings.map((meaning) => meaning.id);
  assertUnique(axisIds, 'axis IDs');
  assertUnique(meaningIds, 'meaning IDs');

  const allowedAxisIds = new Set(axisIds);
  for (const meaning of result.centralStoryMeanings) {
    for (const axisId of meaning.axisIds) {
      if (!allowedAxisIds.has(axisId)) {
        throw new Error(`central axis decomposition: unknown axis reference ${axisId}`);
      }
    }
  }
  const coveredAxes = new Set(result.centralStoryMeanings.flatMap((meaning) => meaning.axisIds));
  for (const axisId of axisIds) {
    if (!coveredAxes.has(axisId)) {
      throw new Error(`central axis decomposition: uncovered axis ${axisId}`);
    }
  }
  for (const issue of result.issues) {
    if (issue.axisIds.some((axisId) => !allowedAxisIds.has(axisId))) {
      throw new Error('central axis decomposition: issue refers to an unknown axis');
    }
  }

  if (result.verdict === 'READY' && result.issues.length > 0) {
    throw new Error('central axis decomposition: READY cannot contain issues');
  }
  if (result.verdict === 'NEEDS_REVIEW' && result.issues.length === 0) {
    throw new Error('central axis decomposition: NEEDS_REVIEW must explain an issue');
  }
  return result;
}

export async function decomposeCentralStoryWithOpenAI(
  input: CentralAxisDecompositionInput,
  config: {
    readonly model: string;
    readonly effort: CentralAxisDecompositionEffort;
    readonly serviceTier?: 'default';
    readonly maxOutputTokens?: number;
    readonly client?: OpenAI;
  },
): Promise<CentralAxisDecompositionCallResult> {
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    ...(config.serviceTier === undefined ? {} : { service_tier: config.serviceTier }),
    instructions: loadCentralAxisDecompositionPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: config.maxOutputTokens ?? 5_000,
    store: false,
    text: {
      format: zodTextFormat(
        CentralAxisDecompositionResultSchema,
        'central_axis_decomposition_result',
      ),
    },
  });
  if (response.output_parsed === null) {
    throw new Error('central axis decomposition: structured output parsing failed');
  }
  const usage = response.usage;
  return {
    result: validateCentralAxisDecompositionResult(response.output_parsed, input),
    metadata: {
      provider: 'openai',
      model: config.model,
      effort: config.effort,
      promptVersion: CENTRAL_AXIS_DECOMPOSITION_PROMPT_VERSION,
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
