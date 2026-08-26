import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  AXIS_RELATION_MAPPING_PROMPT_VERSION,
  AxisRelationMappingResultSchema,
  type AxisRelationMappingInput,
  type AxisRelationMappingResult,
} from './schema.js';

export type AxisRelationMappingEffort = 'medium' | 'high';

export interface AxisRelationMappingCallResult {
  readonly result: AxisRelationMappingResult;
  readonly metadata: {
    readonly provider: 'openai';
    readonly model: string;
    readonly effort: AxisRelationMappingEffort;
    readonly promptVersion: typeof AXIS_RELATION_MAPPING_PROMPT_VERSION;
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
  'packages/pipeline/experiments/dialogue/axis-relation-mapping-prompt-v1.md',
);

export function loadAxisRelationMappingPrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`axis relation mapping: duplicate ${field}`);
  }
}

export function validateAxisRelationMappingResult(
  result: AxisRelationMappingResult,
  input: AxisRelationMappingInput,
): AxisRelationMappingResult {
  if (result.paragraphId !== input.paragraphId) {
    throw new Error(`axis relation mapping: paragraphId changed to ${result.paragraphId}`);
  }
  const axisIds = input.centralAxes.map((axis) => axis.id);
  const relationIds = input.coreRelations.map((relation) => relation.id);
  assertUnique(axisIds, 'input axis IDs');
  assertUnique(relationIds, 'input relation IDs');
  assertUnique(result.axisMappings.map((mapping) => mapping.axisId), 'axis mappings');
  assertUnique(result.unmappedCoreRelationIds, 'unmapped relation IDs');

  if (
    result.axisMappings.length !== axisIds.length ||
    result.axisMappings.some((mapping) => !axisIds.includes(mapping.axisId))
  ) {
    throw new Error('axis relation mapping: every fixed input axis must appear exactly once');
  }

  const allowedAxes = new Set(axisIds);
  const allowedRelations = new Set(relationIds);
  for (const mapping of result.axisMappings) {
    assertUnique(mapping.relationIds, `relations of ${mapping.axisId}`);
    for (const relationId of mapping.relationIds) {
      if (!allowedRelations.has(relationId)) {
        throw new Error(`axis relation mapping: unknown relation ${relationId}`);
      }
    }
  }
  for (const relationId of result.unmappedCoreRelationIds) {
    if (!allowedRelations.has(relationId)) {
      throw new Error(`axis relation mapping: unknown unmapped relation ${relationId}`);
    }
  }
  for (const issue of result.issues) {
    if (issue.axisIds.some((axisId) => !allowedAxes.has(axisId))) {
      throw new Error('axis relation mapping: issue refers to an unknown axis');
    }
    if (issue.relationIds.some((relationId) => !allowedRelations.has(relationId))) {
      throw new Error('axis relation mapping: issue refers to an unknown relation');
    }
  }

  const mapped = new Set(result.axisMappings.flatMap((mapping) => mapping.relationIds));
  const unmapped = new Set(result.unmappedCoreRelationIds);
  for (const relationId of relationIds) {
    if (mapped.has(relationId) === unmapped.has(relationId)) {
      throw new Error(
        `axis relation mapping: ${relationId} must be mapped or declared unmapped, but not both`,
      );
    }
  }

  if (result.verdict === 'READY') {
    if (result.issues.length > 0 || result.unmappedCoreRelationIds.length > 0) {
      throw new Error('axis relation mapping: READY cannot contain issues or unmapped relations');
    }
    if (result.axisMappings.some((mapping) => mapping.relationIds.length === 0)) {
      throw new Error('axis relation mapping: every READY axis needs a relation');
    }
  } else if (result.issues.length === 0) {
    throw new Error('axis relation mapping: NEEDS_REVIEW must explain an issue');
  }
  return result;
}

export async function mapRelationsToFixedAxesWithOpenAI(
  input: AxisRelationMappingInput,
  config: {
    readonly model: string;
    readonly effort: AxisRelationMappingEffort;
    readonly client?: OpenAI;
  },
): Promise<AxisRelationMappingCallResult> {
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    instructions: loadAxisRelationMappingPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: 5_000,
    store: false,
    text: {
      format: zodTextFormat(AxisRelationMappingResultSchema, 'axis_relation_mapping_result'),
    },
  });
  if (response.output_parsed === null) {
    throw new Error('axis relation mapping: structured output parsing failed');
  }
  const usage = response.usage;
  return {
    result: validateAxisRelationMappingResult(response.output_parsed, input),
    metadata: {
      provider: 'openai',
      model: config.model,
      effort: config.effort,
      promptVersion: AXIS_RELATION_MAPPING_PROMPT_VERSION,
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
