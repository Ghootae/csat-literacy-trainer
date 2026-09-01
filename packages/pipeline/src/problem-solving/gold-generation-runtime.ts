import { createHash } from 'node:crypto';

import OpenAI from 'openai';
import { z } from 'zod/v4';

import {
  PROBLEM_GOLD_VERSION,
  ProblemQuestionGoldSchema,
  type ProblemQuestionGold,
} from './gold.js';
import {
  PROBLEM_GOLD_GENERATION_PROMPT_VERSION,
  loadProblemGoldGenerationPrompt,
} from './gold-generation.js';

export const DEFAULT_PROBLEM_GOLD_GENERATION_MODEL = 'gpt-5.6-terra';
export const DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT = 'medium' as const;

export interface ProblemGoldSourceMedia {
  readonly mediaId: string;
  readonly sourceUrl: string;
  readonly mimeType: string;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly placement: {
    readonly scope: 'PASSAGE' | 'SCENARIO' | 'CHOICE';
    readonly supplementIndex?: number;
    readonly elementIndex?: number;
  };
}

export interface ProblemGoldGenerationSource {
  readonly sourceId: string;
  readonly exam: string;
  readonly title: string;
  readonly questionNumber: number;
  readonly passage: string;
  readonly question: unknown;
  readonly answerKey: {
    readonly correctChoice: number;
    readonly correctChoiceText: string;
  };
  readonly media: readonly ProblemGoldSourceMedia[];
}

export interface ProblemGoldGenerationMetadata {
  readonly provider: 'openai';
  readonly model: string;
  readonly effort: typeof DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT;
  readonly promptVersion: typeof PROBLEM_GOLD_GENERATION_PROMPT_VERSION;
  readonly schemaVersion: typeof PROBLEM_GOLD_VERSION;
  readonly sourceHash: string;
  readonly calledAt: string;
  readonly durationMs: number;
  readonly responseId: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
  };
}

export interface ProblemGoldGenerationCall {
  readonly rawOutputText: string;
  readonly parsedOutput: unknown;
  readonly validatedGold: ProblemQuestionGold | null;
  readonly validationErrors: readonly string[];
  readonly metadata: ProblemGoldGenerationMetadata;
}

export function canonicalProblemGoldSourceHash(
  source: ProblemGoldGenerationSource,
): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(source)).digest('hex')}`;
}

function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? '<root>' : issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
}

function normalizeProviderJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeProviderJsonSchema);
  if (typeof value !== 'object' || value === null) return value;
  const normalized = Object.fromEntries(Object.entries(value).flatMap(([key, child]) => (
    key === 'format'
      ? []
      : [[key, normalizeProviderJsonSchema(child)]]
  )));
  if (
    normalized['type'] === 'object' &&
    typeof normalized['properties'] === 'object' &&
    normalized['properties'] !== null &&
    !Array.isArray(normalized['properties'])
  ) {
    const properties = normalized['properties'] as Record<string, unknown>;
    const required = new Set(
      Array.isArray(normalized['required']) ? normalized['required'] : [],
    );
    normalized['properties'] = Object.fromEntries(
      Object.entries(properties).filter(([key]) => required.has(key)),
    );
    normalized['required'] = Object.keys(normalized['properties'] as Record<string, unknown>);
  }
  return normalized;
}

export function createProblemGoldProviderJsonSchema(): Record<string, unknown> {
  return normalizeProviderJsonSchema(
    z.toJSONSchema(ProblemQuestionGoldSchema),
  ) as Record<string, unknown>;
}

export async function generateProblemGoldCandidate(options: {
  readonly source: ProblemGoldGenerationSource;
  readonly model?: string;
  readonly timeoutMs?: number;
}): Promise<ProblemGoldGenerationCall> {
  const model = options.model ?? DEFAULT_PROBLEM_GOLD_GENERATION_MODEL;
  const timeoutMs = options.timeoutMs ?? 360_000;
  const client = new OpenAI({ maxRetries: 0 });
  const calledAt = new Date().toISOString();
  const startedAt = Date.now();

  const sourcePayload = JSON.stringify({
    generationContract: {
      reviewStatus: 'candidate',
      schemaVersion: PROBLEM_GOLD_VERSION,
      supplementalExplanationPolicy:
        '공식 해설은 입력되지 않았다. supplementalExplanationInferences는 빈 배열로 둔다.',
      identifierPolicy: {
        passageId: `${options.source.sourceId}-passage`,
        questionId: `${options.source.sourceId}-q${options.source.questionNumber}`,
        choiceIds: '선지 순서대로 C1, C2, C3, C4, C5',
        paragraphIds: '지문 순서대로 P1부터 부여',
      },
      mediaPolicy:
        'mediaAssets는 source.media의 URL·해시·크기·placement를 정확히 복사하고 교육적 role, requiredForSolving, altText만 판단한다.',
    },
    source: options.source,
  }, null, 2);

  const response = await client.responses.create({
    model,
    instructions: loadProblemGoldGenerationPrompt(),
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: sourcePayload },
        ...options.source.media.map((media) => ({
          type: 'input_image' as const,
          image_url: media.sourceUrl,
          detail: 'high' as const,
        })),
      ],
    }],
    reasoning: { effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT },
    max_output_tokens: 30_000,
    store: false,
    text: {
      format: {
        type: 'json_schema',
        name: 'problem_question_gold_candidate',
        strict: true,
        schema: createProblemGoldProviderJsonSchema(),
      },
    },
  }, { timeout: timeoutMs, maxRetries: 0 });

  let parsedOutput: unknown = response.output_text;
  try {
    parsedOutput = JSON.parse(response.output_text);
  } catch {
    // 최초 공급자 출력은 호출자가 원문 그대로 저장하고 검수한다.
  }
  const validated = ProblemQuestionGoldSchema.safeParse(parsedOutput);

  return {
    rawOutputText: response.output_text,
    parsedOutput,
    validatedGold: validated.success ? validated.data : null,
    validationErrors: validated.success ? [] : formatValidationErrors(validated.error),
    metadata: {
      provider: 'openai',
      model,
      effort: DEFAULT_PROBLEM_GOLD_GENERATION_EFFORT,
      promptVersion: PROBLEM_GOLD_GENERATION_PROMPT_VERSION,
      schemaVersion: PROBLEM_GOLD_VERSION,
      sourceHash: canonicalProblemGoldSourceHash(options.source),
      calledAt,
      durationMs: Date.now() - startedAt,
      responseId: response.id,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        cacheReadTokens: response.usage?.input_tokens_details.cached_tokens ?? 0,
      },
    },
  };
}
