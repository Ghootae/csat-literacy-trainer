import type { ProblemChoiceView } from './contract.js';

export interface FeedbackMediaView {
  mediaId: string; url: string; mimeType: string; width: number; height: number;
  contentHash?: string | undefined;
  placement: { scope: 'PASSAGE'; elementIndex?: number | undefined }
    | { scope: 'SCENARIO'; supplementIndex: number; elementIndex?: number | undefined }
    | { scope: 'CHOICE'; choiceId: string; elementIndex?: number | undefined };
}

export interface FeedbackTextAnnotationView {
  location: 'PASSAGE' | 'SCENARIO'; marker: string; style: 'underline' | 'box' | 'label';
  /** UTF-16 offsets into passageText or scenarioText, end exclusive. */
  start: number; end: number; text: string;
}

// No evaluator/pipeline imports: client-safe contracts.
export type FeedbackRationale = { mode: 'PROVIDED'; text: string } | { mode: 'OMITTED' };
export interface FeedbackRequest {
  transitionId: string;
  expectedRevision: number;
  command: { type: 'SELECT'; choiceId: string; rationale: FeedbackRationale }
    | { type: 'RATIONALE'; rationale: FeedbackRationale }
    | { type: 'CORRECT'; errorId: string; text: string }
    | { type: 'RESELECT' } | { type: 'REQUEST_EXPLANATION' } | { type: 'FINISH' }
    | { type: 'END_START'; accept: boolean } | { type: 'UNDERSTOOD'; answer: boolean }
    | { type: 'RESUME' };
}
export interface FeedbackView {
  // 저장 자료 호환을 위해 값 유지(D-0173)
  version: 'problem-feedback-v4';
  sessionId: string;
  revision: number;
  phase: 'AWAITING_SELECTION' | 'AWAITING_RATIONALE' | 'AWAITING_EVALUATION'
    | 'AWAITING_END_START' | 'AWAITING_UNDERSTANDING' | 'AWAITING_CORRECTION' | 'AWAITING_POST_REPAIR_CHOICE' | 'AWAITING_RESELECTION' | 'ITEM_REVIEW' | 'COMPLETED';
  question: { questionId: string; passageText: string; stem: string; scenarioText: string;
    choices: ProblemChoiceView[]; media: FeedbackMediaView[];
    textAnnotations: FeedbackTextAnnotationView[] };
  message: string;
  correctionHighlights: { location: 'PASSAGE' | 'SCENARIO'; start: number; end: number; text: string }[];
  activeErrorId: string | null;
  postRepairOptions: ('RESELECT' | 'REQUEST_EXPLANATION' | 'FINISH')[] | null;
  selectionCount: number;
  maxSelections: number;
  questionsAsked: number;
  questionTargets: number;
  penaltyEligibleSelections: number;
  pointsDeducted: number;
  evaluationStatus: 'IDLE' | 'PROCESSING' | 'RETRYABLE_ERROR';
  evaluationError: string | null;
  result: {
    outcome: 'VERIFIED_CORRECT' | 'UNVERIFIED_CORRECT' | 'COACHING_TERMINATED';
    selectedChoiceId: string;
    choiceCorrect: boolean;
    selectionCount: number;
    rationaleVerified: boolean;
    correctionSucceeded: boolean;
    answerRevealed: boolean;
    resolvedByStudent: boolean;
    selfReportedUnderstanding: 'YES' | 'NO' | null;
    answer: { choiceId: string; position: number; text: string } | null;
  } | null;
}

export interface FeedbackMessage {
  sequence?: 'INSTANT' | 'GATE' | 'CONNECTOR' | 'SECTION' | 'QUESTION' | 'CLOSING';
  id: string; role: 'STUDENT' | 'COACH'; text: string; phase: FeedbackView['phase'];
}
export interface FeedbackWorkbenchView extends FeedbackView {
  title: string; exam: string; questionNumber: number;
  selectedChoiceId: string | null;
  transcript: FeedbackMessage[];
}
export interface FeedbackInspection {
  revision: number;
  choiceImpliedVerdict: 'VALID' | 'INVALID';
  comparisons: { observationId: string; choiceImpliedVerdict: string; rationaleImpliedVerdict: string; selectionRationaleConsistency: string }[];
  assessments: { mode: 'SELECTION' | 'REPAIR'; reason: string; reconstructedPath: string[];
    verdict: string | null; contentAssessment: string | null;
    studentEvidence: { observationId: string; quote: string }[];
    repairs: { errorId: string; status: string }[]; raw: unknown }[];
  errors: { errorId: string; description: string; kind: string; status: string; asked: boolean; skipped: boolean }[];
  additionalErrors: { errorId: string; description: string; status: string }[];
}

/** 출제자 전략 글. COMPLETED 전에는 항상 available: false다. */
export type ExaminerStrategyView = { available: false }
  | { available: true; stemPolarity: 'SELECT_INCORRECT' | 'SELECT_CORRECT'; firstPosition: number; choices: { position: number; paragraphs: string[] }[] };
