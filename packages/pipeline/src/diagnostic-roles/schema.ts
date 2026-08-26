import { z } from 'zod/v4';

import { DiagnosticRoleSchema } from '../paragraph-analysis/schema.js';

export const DIAGNOSTIC_ROLES_PROMPT_VERSION = 'diagnostic-roles-prompt-v1';
export const DIAGNOSTIC_ROLES_SCHEMA_VERSION = 'diagnostic-roles-openai-v1';

const RelationIdSchema = z.string().regex(/^MR[1-9][0-9]*$/);
const AxisIdSchema = z.string().regex(/^AX[1-9][0-9]*$/);

export const DiagnosticRolesInputSchema = z.object({
  paragraphId: z.string().min(1),
  centralStory: z.string().min(1),
  coreRelations: z.array(z.object({
    id: RelationIdSchema,
    description: z.string().min(1),
  })).min(1),
  centralAxes: z.array(z.object({
    id: AxisIdSchema,
    description: z.string().min(1),
    relationIds: z.array(RelationIdSchema).min(1),
  })).min(1),
});

export type DiagnosticRolesInput = z.infer<typeof DiagnosticRolesInputSchema>;

export const DiagnosticRolesResultSchema = z.object({
  schemaVersion: z.literal(DIAGNOSTIC_ROLES_SCHEMA_VERSION),
  paragraphId: z.string().min(1),
  verdict: z.enum(['READY', 'NEEDS_REVIEW']),
  axisAudits: z.array(z.object({
    axisId: AxisIdSchema,
    assignments: z.array(z.object({
      relationId: RelationIdSchema,
      diagnosticRole: DiagnosticRoleSchema,
      counterfactualReason: z.string().min(1),
    })).min(1),
  })).min(1),
  relationRoles: z.array(z.object({
    relationId: RelationIdSchema,
    diagnosticRole: DiagnosticRoleSchema,
  })).min(1),
  issues: z.array(z.object({
    code: z.enum([
      'NO_PROBE_ANCHOR',
      'CROSS_AXIS_ROLE_CONFLICT',
      'AXIS_RELATION_MISMATCH',
      'ROLE_AMBIGUOUS',
    ]),
    description: z.string().min(1),
    axisIds: z.array(AxisIdSchema),
    relationIds: z.array(RelationIdSchema),
  })),
});

export type DiagnosticRolesResult = z.infer<typeof DiagnosticRolesResultSchema>;
