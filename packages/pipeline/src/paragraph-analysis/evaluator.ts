import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  PARAGRAPH_ANALYSIS_PROMPT_VERSION,
  ParagraphAnalysisResultSchema,
  type ParagraphAnalysisResult,
} from './schema.js';

export type ParagraphAnalysisEffort = 'medium' | 'high';

export interface ParagraphAnalysisInput {
  readonly paragraphId: string;
  readonly paragraphText: string;
  readonly sentences: readonly { readonly id: string; readonly text: string }[];
  readonly passageParagraphs: readonly {
    readonly paragraphId: string;
    readonly text: string;
  }[];
  readonly fullPassageAvailable: boolean;
}

export interface ParagraphAnalysisCallResult {
  readonly result: ParagraphAnalysisResult;
  readonly metadata: {
    readonly provider: 'openai';
    readonly model: string;
    readonly effort: ParagraphAnalysisEffort;
    readonly promptVersion: string;
    readonly responseId: string;
    readonly durationMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly reasoningTokens: number;
      readonly cachedInputTokens: number;
    };
  };
}

const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/paragraph-analysis-prompt-v1.md',
);

export function loadParagraphAnalysisPrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

export function validateParagraphAnalysisResult(
  value: ParagraphAnalysisResult,
  input: ParagraphAnalysisInput,
): ParagraphAnalysisResult {
  if (value.paragraphId !== input.paragraphId) {
    throw new Error(`paragraph analysis: paragraphId changed to ${value.paragraphId}`);
  }
  if (value.paragraphText !== input.paragraphText) {
    throw new Error('paragraph analysis: paragraphText was not preserved exactly');
  }
  if (
    value.diagnosticGold.paragraphId !== input.paragraphId ||
    value.diagnosticGold.paragraphText !== input.paragraphText
  ) {
    throw new Error('paragraph analysis: diagnosticGold source identity mismatch');
  }

  const propositionIds = new Set(value.propositions.map((item) => item.id));
  const regionIds = new Set(value.regions.map((item) => item.id));
  const majorRelationIds = new Set(value.majorRelations.map((item) => item.id));
  const coreRelationIds = new Set(
    value.majorRelations
      .filter((item) => item.classification === 'core')
      .map((item) => item.id),
  );

  const assertRefs = (refs: readonly string[], allowed: ReadonlySet<string>, field: string): void => {
    for (const ref of refs) {
      if (!allowed.has(ref)) throw new Error(`paragraph analysis: invalid ${field} reference ${ref}`);
    }
  };

  for (const edge of value.propositionEdges) {
    assertRefs(edge.fromPropositionIds, propositionIds, 'proposition');
    assertRefs(edge.toPropositionIds, propositionIds, 'proposition');
  }
  for (const region of value.regions) {
    assertRefs(region.propositionIds, propositionIds, 'proposition');
  }
  for (const relation of value.majorRelations) {
    assertRefs(relation.relatedRegionIds, regionIds, 'region');
    if (relation.classification === 'core' && relation.essentialReason === null) {
      throw new Error(`paragraph analysis: core relation ${relation.id} needs essentialReason`);
    }
    if (relation.classification === 'supporting' && relation.essentialReason !== null) {
      throw new Error(`paragraph analysis: supporting relation ${relation.id} must use null essentialReason`);
    }
  }
  for (const boundary of value.conceptBoundaries) {
    if (
      boundary.relatedCoreRelationId !== null &&
      !coreRelationIds.has(boundary.relatedCoreRelationId)
    ) {
      throw new Error(
        `paragraph analysis: invalid concept boundary relation ${boundary.relatedCoreRelationId}`,
      );
    }
  }
  assertRefs(
    value.minimumLogic.unknownIfUnmentionedRelationIds,
    majorRelationIds,
    'major relation',
  );
  assertRefs(
    value.minimumLogic.explicitMisunderstandingConditions.map((item) => item.relationId),
    majorRelationIds,
    'major relation',
  );
  const diagnosticIds = value.diagnosticGold.coreRelations.map((item) => item.id);
  assertRefs(diagnosticIds, coreRelationIds, 'core relation');
  if (new Set(diagnosticIds).size !== coreRelationIds.size) {
    throw new Error('paragraph analysis: diagnosticGold must include every core relation once');
  }
  return value;
}

export async function analyzeParagraphWithOpenAI(
  input: ParagraphAnalysisInput,
  config: {
    readonly model: string;
    readonly effort: ParagraphAnalysisEffort;
    readonly client?: OpenAI;
  },
): Promise<ParagraphAnalysisCallResult> {
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    instructions: loadParagraphAnalysisPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: 20_000,
    store: false,
    text: {
      format: zodTextFormat(ParagraphAnalysisResultSchema, 'paragraph_analysis_result'),
    },
  });

  if (response.output_parsed === null) {
    throw new Error('paragraph analysis: structured output parsing failed');
  }

  const usage = response.usage;
  return {
    result: validateParagraphAnalysisResult(response.output_parsed, input),
    metadata: {
      provider: 'openai',
      model: config.model,
      effort: config.effort,
      promptVersion: PARAGRAPH_ANALYSIS_PROMPT_VERSION,
      responseId: response.id,
      durationMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
        cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
      },
    },
  };
}
