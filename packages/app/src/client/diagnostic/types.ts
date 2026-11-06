/** 진단평가 API 응답의 화면 쪽 모양. 서버 `controller.ts`의 반환과 같다(서버 모듈은 클라이언트에서 가져오지 않는다). */
import type { ProblemContentView } from '../../shared/contract.js';
import type { FeedbackRationale, FeedbackRequest, FeedbackWorkbenchView } from '../../shared/problem-feedback.js';

export interface SetInfo { passages: { passageId: string; title: string; questionIds: string[] }[] }
export type PassageStatus = 'NOT_STARTED' | 'SUMMARY' | 'ANSWERING' | 'AWAITING_JUDGMENT' | 'FEEDBACK' | 'DONE';
export interface PositionView {
  answered: number; correct: number;
  percentile: { mean: number; low: number; high: number };
  grade: { mean: number; best: number; worst: number };
}
export interface ProgressView {
  participantId: string;
  passages: { passageId: string; status: PassageStatus; summaryChosen: boolean | null; feedbackCursor: number }[];
  set: SetInfo;
  current: { passageId: string; questionId: string | null } | null;
  position: PositionView | null;
}
export interface QuestionView { questionId: string; questionNumber: number; content: ProblemContentView }
export interface Draft { choiceId: string; rationale: FeedbackRationale }
export interface QuestionsView { questions: QuestionView[]; drafts: Record<string, Draft | null> }
export interface ItemRequest { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null }

export type SummaryCardView = { status: 'pending' } | {
  status: 'ready'; correct: number; total: number; supported: number; rationaleDenominator: number; omitted: number; checking: number;
  items: { questionId: string; questionNumber: number; correct: boolean; rationale: 'PROVIDED' | 'OMITTED'; quality: 'SUPPORTED' | 'NOT_SUPPORTED' | 'CHECKING' | null }[];
  position: PositionView;
};
export type DiagnosticFeedbackView = FeedbackWorkbenchView & { skippable: boolean };

type Box = 'pending' | 'ready' | 'failed';
export interface ResultTwist { twistType: string; twistDetail: string; studentText: string | null }
export interface ResultSummaryLink { status: Box; kind: 'MISREAD' | 'MISSED' | 'CAUGHT'; paragraphs: number[]; paragraphLabel: string }
export interface ResultItem {
  questionId: string; passageId: string; questionNumber: number; chosenPosition: number; correct: boolean; rationale: 'PROVIDED' | 'OMITTED';
  megastudy: { chosenPercents: [number, number]; correctRate: [number, number] };
  afterFeedback: { corrected: boolean; skipped: boolean };
  review: boolean;
  answerPosition: number | null;
  judgment: { status: Box; contentAssessment: string | null; boundary: string | null };
  twist: ResultTwist[] | null;
  thoughtDiagnosis: { status: Box; firstFailedStep: string | null; outcomeType: string | null } | null;
  evidence: { student: string | null; source: { location: string; quote: string }[] } | null;
  summaryLink: ResultSummaryLink | null;
}
export interface ReadingCounts {
  layers: Record<'요지' | '합성' | '명제', { caught: number; total: number }>;
  branches: Record<'내용' | '논증' | '관점' | '흐름', { caught: number; total: number; wrong: number }>;
}
export interface ResultView {
  position: { status: 'pending' } | { status: 'ready'; answered: number; correct: number; percentile: PositionView['percentile']; grade: PositionView['grade'];
    byPassage: { passageId: string; low: number; high: number }[] };
  items: ResultItem[];
  steps: { status: Box; counts: Record<string, number>; denominator: number };
  twists: { counts: Record<string, number> };
  recommendation: { twistType: string; setNames: string[] } | null;
  reading: { passageId: string; status: Box; counts: ReadingCounts }[];
}

/** 본 서비스 명령에 진단평가 전용 건너뛰기(`SKIP`, D-0208 1)를 더한 요청. 공용 계약(`shared`)은 건드리지 않는다. */
export type DiagnosticFeedbackRequest = Omit<FeedbackRequest, 'command'> & { command: FeedbackRequest['command'] | { type: 'SKIP' } };
