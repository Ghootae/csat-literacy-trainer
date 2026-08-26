import { z } from 'zod/v4';

export const PARAGRAPH_ANALYSIS_SCHEMA_VERSION = 'paragraph-analysis-openai-v1';
export const PARAGRAPH_ANALYSIS_SCHEMA_V2_VERSION = 'paragraph-analysis-openai-v2';
export const PARAGRAPH_ANALYSIS_SCHEMA_V3_VERSION = 'paragraph-analysis-openai-v3';
export const PARAGRAPH_ANALYSIS_PROMPT_VERSION = 'paragraph-analysis-prompt-v1';
export const PARAGRAPH_ANALYSIS_PROMPT_VERSIONS = [
  'paragraph-analysis-prompt-v1',
  'paragraph-analysis-prompt-v2',
  'paragraph-analysis-prompt-v3',
  'paragraph-analysis-prompt-v3.1',
] as const;
export type ParagraphAnalysisPromptVersion =
  (typeof PARAGRAPH_ANALYSIS_PROMPT_VERSIONS)[number];

const PropositionIdSchema = z.string().regex(/^P[1-9][0-9]*$/);
const EdgeIdSchema = z.string().regex(/^E[1-9][0-9]*$/);
const RegionIdSchema = z.string().regex(/^RGN[1-9][0-9]*$/);
const MajorRelationIdSchema = z.string().regex(/^MR[1-9][0-9]*$/);
export const DiagnosticRoleSchema = z.enum(['required', 'error_only']);
export type DiagnosticRole = z.infer<typeof DiagnosticRoleSchema>;

const MajorRelationSchema = z.object({
  id: MajorRelationIdSchema,
  relatedRegionIds: z.array(RegionIdSchema),
  relatedObjects: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
  classification: z.enum(['core', 'supporting']),
  essentialReason: z.string().nullable(),
});

const DiagnosticGoldCoreRelationSchema = z.object({
  id: MajorRelationIdSchema,
  description: z.string().min(1),
});

const DiagnosticGoldSchema = z.object({
  paragraphId: z.string().min(1),
  paragraphText: z.string().min(1),
  centralObject: z.string().min(1),
  centralStory: z.string().min(1),
  coreRelations: z.array(DiagnosticGoldCoreRelationSchema).min(1),
  keyMappings: z.array(z.object({
    left: z.string().min(1),
    right: z.string().min(1),
  })),
  supportingConcepts: z.array(z.string().min(1)),
});

export const ParagraphAnalysisResultSchema = z.object({
  schemaVersion: z.literal(PARAGRAPH_ANALYSIS_SCHEMA_VERSION),
  paragraphId: z.string().min(1),
  paragraphText: z.string().min(1),
  passageContext: z.object({
    summary: z.string().min(1),
    targetRole: z.string().min(1),
    contextLimitations: z.array(z.string().min(1)),
  }),
  propositions: z.array(z.object({
    id: PropositionIdSchema,
    description: z.string().min(1),
    evidence: z.string().min(1),
  })).min(1),
  propositionEdges: z.array(z.object({
    id: EdgeIdSchema,
    fromPropositionIds: z.array(PropositionIdSchema).min(1),
    toPropositionIds: z.array(PropositionIdSchema).min(1),
    type: z.enum([
      '정의',
      '분류',
      '대응',
      '원인-결과',
      '근거-주장',
      '조건-결과',
      '목적-수단',
      '대조',
      '양보',
      '구체화',
      '예시',
      '종합',
      '한계',
      '수정-전환',
    ]),
    direction: z.string().min(1),
    description: z.string().min(1),
  })),
  centralObject: z.string().min(1),
  centralStory: z.string().min(1),
  regions: z.array(z.object({
    id: RegionIdSchema,
    name: z.string().min(1),
    summary: z.string().min(1),
    propositionIds: z.array(PropositionIdSchema).min(1),
    contribution: z.string().min(1),
  })).min(1),
  majorRelations: z.array(MajorRelationSchema).min(1),
  conceptBoundaries: z.array(z.object({
    id: z.string().regex(/^CB[1-9][0-9]*$/),
    left: z.string().min(1),
    right: z.string().min(1),
    distinction: z.string().min(1),
    relatedCoreRelationId: MajorRelationIdSchema.nullable(),
  })),
  minimumLogic: z.object({
    requiredMeanings: z.array(z.string().min(1)).min(1),
    omissibleDetails: z.array(z.string().min(1)),
    unknownIfUnmentionedRelationIds: z.array(MajorRelationIdSchema),
    explicitMisunderstandingConditions: z.array(z.object({
      relationId: MajorRelationIdSchema,
      description: z.string().min(1),
    })),
  }),
  ambiguities: z.array(z.object({
    description: z.string().min(1),
    impact: z.string().min(1),
    alternatives: z.array(z.string().min(1)).min(1),
  })),
  diagnosticGold: DiagnosticGoldSchema,
});

export type ParagraphAnalysisResult = z.infer<typeof ParagraphAnalysisResultSchema>;

const MajorRelationV2Schema = MajorRelationSchema.extend({
  diagnosticRole: DiagnosticRoleSchema.nullable(),
});

const DiagnosticGoldV2Schema = DiagnosticGoldSchema.extend({
  coreRelations: z.array(DiagnosticGoldCoreRelationSchema.extend({
    diagnosticRole: DiagnosticRoleSchema,
  })).min(1),
});

export const ParagraphAnalysisResultV2Schema = ParagraphAnalysisResultSchema.extend({
  schemaVersion: z.literal(PARAGRAPH_ANALYSIS_SCHEMA_V2_VERSION),
  majorRelations: z.array(MajorRelationV2Schema).min(1),
  diagnosticGold: DiagnosticGoldV2Schema,
});

export type ParagraphAnalysisResultV2 = z.infer<typeof ParagraphAnalysisResultV2Schema>;

export const ParagraphAnalysisResultV3Schema = ParagraphAnalysisResultSchema.extend({
  schemaVersion: z.literal(PARAGRAPH_ANALYSIS_SCHEMA_V3_VERSION),
});

export type ParagraphAnalysisResultV3 = z.infer<typeof ParagraphAnalysisResultV3Schema>;
export type AnyParagraphAnalysisResult =
  | ParagraphAnalysisResult
  | ParagraphAnalysisResultV2
  | ParagraphAnalysisResultV3;
