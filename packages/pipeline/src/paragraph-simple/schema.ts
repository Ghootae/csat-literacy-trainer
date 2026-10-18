import { z } from 'zod/v4';

/** 단순 형식 문단 판정(simple-holistic) 계약. 프롬프트: experiments/dialogue/paragraph-simple-holistic-prompt-v4.4.md */
export const PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v4.4';

export const SimpleCategorySchema = z.enum(['CAPTURED', 'GAP', 'ONE_ERROR', 'MULTI_ERROR', 'IRRELEVANT', 'COPY']);
export const SimpleActionSchema = z.enum([
  'PRAISE', 'RETRY_PROMPT', 'GAP_QUESTION', 'CORRECTION_QUESTION', 'CLOSE_GAP', 'CLOSE_ERRORS', 'CLOSE_NO_RESPONSE',
]);
export const SimpleStageSchema = z.enum(['INITIAL', 'RETRY', 'AFTER_CORRECTION', 'AFTER_GAP']);

export const SimpleCorePartSchema = z.object({ description: z.string(), sourceQuote: z.string() }).strict();

export const SimpleErrorSchema = z.object({
  studentQuote: z.string(),
  correction: z.string(),
  sourceQuote: z.string(),
  corePartIndex: z.number().int(),
  gapIndex: z.number().int().nullable(),
  feedback: z.string(),
}).strict();

export const SimpleGapSchema = z.object({ corePartIndex: z.number().int(), description: z.string(), sourceQuote: z.string(), question: z.string(), asksOneThing: z.boolean() }).strict();

export const SimpleOutputSchema = z.object({
  category: SimpleCategorySchema,
  reason: z.string(),
  coreParts: z.array(SimpleCorePartSchema),
  corePartsCovered: z.array(z.boolean()),
  errors: z.array(SimpleErrorSchema),
  gaps: z.array(SimpleGapSchema),
  targetErrorResolved: z.boolean().nullable(),
  targetGapReadings: z.array(z.string()).nullable(),
  targetGapsFilled: z.array(z.boolean()).nullable(),
  restatedSummary: z.string(),
  action: SimpleActionSchema,
  message: z.string(),
  coreIntro: z.string().nullable(),
  coreSummary: z.string().nullable(),
  missingNote: z.string().nullable(),
  coreSourceQuote: z.string().nullable(),
}).strict();

export type SimpleCategory = z.infer<typeof SimpleCategorySchema>;
export type SimpleAction = z.infer<typeof SimpleActionSchema>;
export type SimpleStage = z.infer<typeof SimpleStageSchema>;
export type SimpleCorePart = z.infer<typeof SimpleCorePartSchema>;
export type SimpleGap = z.infer<typeof SimpleGapSchema>;
export type SimpleError = z.infer<typeof SimpleErrorSchema>;
export type SimpleOutput = z.infer<typeof SimpleOutputSchema>;

/** copied: 원문 옮겨 적기(COPY)로 판정된 학생 발화. 모델은 학생 이해로 치지 않는다. */
export interface SimpleDialogueMessage { role: 'student' | 'tutor'; text: string; copied?: true }

/** 모델 입력. 골드·축은 없다 — 지문과 이 문단의 대화뿐이다. */
export interface SimpleEvaluationInput {
  passage: { title: string; paragraphs: { paragraphId: string; text: string }[] };
  targetParagraph: { paragraphId: string; text: string };
  stage: SimpleStage;
  dialogue: SimpleDialogueMessage[];
  coreParts: SimpleCorePart[] | null;
  targetError: SimpleError | null;
  targetGaps: SimpleGap[] | null;
  validationFeedback?: string;
}
