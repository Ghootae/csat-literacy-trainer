import { z } from 'zod/v4';

export const CENTRAL_AXES_PROMPT_VERSION = 'central-axes-prompt-v1';
export const CENTRAL_AXES_SCHEMA_VERSION = 'central-axes-openai-v1';

const CoreRelationSchema = z.object({
  id: z.string().regex(/^MR[1-9][0-9]*$/),
  description: z.string().min(1),
});

export const CentralAxesInputSchema = z.object({
  paragraphId: z.string().min(1),
  centralObject: z.string().min(1),
  centralStory: z.string().min(1),
  coreRelations: z.array(CoreRelationSchema).min(1),
});

export type CentralAxesInput = z.infer<typeof CentralAxesInputSchema>;

const AxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/);

export const CentralAxesResultSchema = z.object({
  schemaVersion: z.literal(CENTRAL_AXES_SCHEMA_VERSION),
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
    relationIds: z.array(CoreRelationSchema.shape.id),
  })).min(1),
  unmappedCoreRelationIds: z.array(CoreRelationSchema.shape.id),
  issues: z.array(z.object({
    code: z.enum([
      'CENTRAL_STORY_AMBIGUOUS',
      'CORE_RELATION_MISSING',
      'CORE_RELATION_OUTSIDE_STORY',
      'AXIS_BOUNDARY_AMBIGUOUS',
    ]),
    description: z.string().min(1),
    relatedRelationIds: z.array(CoreRelationSchema.shape.id),
  })),
});

export type CentralAxesResult = z.infer<typeof CentralAxesResultSchema>;
