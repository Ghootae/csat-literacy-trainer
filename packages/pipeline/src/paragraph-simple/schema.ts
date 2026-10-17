import { z } from 'zod/v4';

/** 단순 형식 문단 판정(simple-holistic) 계약. 프롬프트: experiments/dialogue/paragraph-simple-holistic-prompt-v3.md */
export const PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v3';

export const SimpleCategorySchema = z.enum(['CAPTURED', 'GAP', 'ONE_ERROR', 'MULTI_ERROR', 'IRRELEVANT', 'COPY']);
export const SimpleActionSchema = z.enum([
  'PRAISE', 'RETRY_PROMPT', 'GAP_QUESTION', 'CORRECTION_QUESTION', 'CLOSE_GAP', 'CLOSE_ERRORS', 'CLOSE_NO_RESPONSE',
]);
export const SimpleStageSchema = z.enum(['INITIAL', 'RETRY', 'AFTER_CORRECTION', 'AFTER_GAP']);

export const SimpleErrorSchema = z.object({
  studentQuote: z.string(),
  correction: z.string(),
  sourceQuote: z.string(),
  feedback: z.string(),
}).strict();

export const SimpleOutputSchema = z.object({
  category: SimpleCategorySchema,
  reason: z.string(),
  errors: z.array(SimpleErrorSchema),
  gap: z.object({ description: z.string(), sourceQuote: z.string() }).strict().nullable(),
  targetErrorResolved: z.boolean().nullable(),
  restatedSummary: z.string(),
  action: SimpleActionSchema,
  message: z.string(),
  coreIntro: z.string().nullable(),
  coreSummary: z.string().nullable(),
  coreSourceQuote: z.string().nullable(),
}).strict();

export type SimpleCategory = z.infer<typeof SimpleCategorySchema>;
export type SimpleAction = z.infer<typeof SimpleActionSchema>;
export type SimpleStage = z.infer<typeof SimpleStageSchema>;
export type SimpleError = z.infer<typeof SimpleErrorSchema>;
export type SimpleOutput = z.infer<typeof SimpleOutputSchema>;

export interface SimpleDialogueMessage { role: 'student' | 'tutor'; text: string }

/** 모델 입력. 골드·축은 없다 — 지문과 이 문단의 대화뿐이다. */
export interface SimpleEvaluationInput {
  passage: { title: string; paragraphs: { paragraphId: string; text: string }[] };
  targetParagraph: { paragraphId: string; text: string };
  stage: SimpleStage;
  dialogue: SimpleDialogueMessage[];
  targetError: SimpleError | null;
  targetGap: { description: string; sourceQuote: string } | null;
  validationFeedback?: string;
}
