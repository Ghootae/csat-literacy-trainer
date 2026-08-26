import { z } from 'zod/v4';

export const CENTRAL_AXIS_DECOMPOSITION_PROMPT_VERSION =
  'central-axis-decomposition-prompt-v2';
export const CENTRAL_AXIS_DECOMPOSITION_SCHEMA_VERSION =
  'central-axis-decomposition-openai-v2';

const AxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/);

export const CentralAxisDecompositionInputSchema = z.object({
  paragraphId: z.string().min(1),
  centralStory: z.string().min(1),
});

export type CentralAxisDecompositionInput = z.infer<
  typeof CentralAxisDecompositionInputSchema
>;

export const CentralAxisDecompositionResultSchema = z.object({
  schemaVersion: z.literal(CENTRAL_AXIS_DECOMPOSITION_SCHEMA_VERSION),
  paragraphId: z.string().min(1),
  centralStory: z.string().min(1),
  verdict: z.enum(['READY', 'NEEDS_REVIEW']),
  centralStoryMeanings: z.array(z.object({
    id: z.string().regex(/^CSM[1-9][0-9]*$/),
    description: z.string().min(1),
    axisIds: z.array(AxisIdSchema).min(1),
  })).min(1),
  centralAxes: z.array(z.object({
    id: AxisIdSchema,
    description: z.string().min(1),
  })).min(1),
  issues: z.array(z.object({
    code: z.enum(['CENTRAL_STORY_AMBIGUOUS', 'AXIS_BOUNDARY_AMBIGUOUS']),
    description: z.string().min(1),
    axisIds: z.array(AxisIdSchema),
  })),
});

export type CentralAxisDecompositionResult = z.infer<
  typeof CentralAxisDecompositionResultSchema
>;
