import { z } from 'zod/v4';

export const AXIS_RELATION_MAPPING_PROMPT_VERSION = 'axis-relation-mapping-prompt-v1';
export const AXIS_RELATION_MAPPING_SCHEMA_VERSION = 'axis-relation-mapping-openai-v1';

const AxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/);
const RelationIdSchema = z.string().regex(/^MR[1-9][0-9]*$/);

export const AxisRelationMappingInputSchema = z.object({
  paragraphId: z.string().min(1),
  centralStory: z.string().min(1),
  centralAxes: z.array(z.object({
    id: AxisIdSchema,
    description: z.string().min(1),
  })).min(1),
  coreRelations: z.array(z.object({
    id: RelationIdSchema,
    description: z.string().min(1),
  })).min(1),
});

export type AxisRelationMappingInput = z.infer<typeof AxisRelationMappingInputSchema>;

export const AxisRelationMappingResultSchema = z.object({
  schemaVersion: z.literal(AXIS_RELATION_MAPPING_SCHEMA_VERSION),
  paragraphId: z.string().min(1),
  verdict: z.enum(['READY', 'NEEDS_REVIEW']),
  axisMappings: z.array(z.object({
    axisId: AxisIdSchema,
    relationIds: z.array(RelationIdSchema),
  })).min(1),
  unmappedCoreRelationIds: z.array(RelationIdSchema),
  issues: z.array(z.object({
    code: z.enum([
      'CORE_RELATION_MISSING',
      'CORE_RELATION_OUTSIDE_STORY',
      'RELATION_AXIS_AMBIGUOUS',
    ]),
    description: z.string().min(1),
    axisIds: z.array(AxisIdSchema),
    relationIds: z.array(RelationIdSchema),
  })),
});

export type AxisRelationMappingResult = z.infer<typeof AxisRelationMappingResultSchema>;

export type MappedCentralAxis = AxisRelationMappingInput['centralAxes'][number] & {
  relationIds: string[];
};

export function mergeAxesAndRelationMapping(
  input: AxisRelationMappingInput,
  result: AxisRelationMappingResult,
): MappedCentralAxis[] {
  const relationsByAxis = new Map(
    result.axisMappings.map((mapping) => [mapping.axisId, mapping.relationIds]),
  );
  return input.centralAxes.map((axis) => ({
    ...axis,
    relationIds: [...(relationsByAxis.get(axis.id) ?? [])],
  }));
}
