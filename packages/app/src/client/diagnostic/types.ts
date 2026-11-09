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
/** 근거를 생략한 응답의 확신 구분. 두 버튼("확실해요" / "잘은 모르겠지만 정답 같음")에 대응한다. */
export type Confidence = 'SURE' | 'UNSURE';
/** 첫 응답 기준 범주(서버 `AnswerCategory`와 같다). 정답의 질 3단계는 SUPPORTED_CORRECT·WEAK_CORRECT·ERROR_CORRECT. */
export type AnswerCategory = 'WRONG' | 'SURE_CORRECT' | 'UNSURE_CORRECT' | 'PENDING' | 'CHECKING' | 'UNVERIFIED' | 'ERROR_CORRECT' | 'SUPPORTED_CORRECT' | 'WEAK_CORRECT';
export type QualityTiers = 3 | 2;
export interface Draft { choiceId: string; rationale: FeedbackRationale; confidence: Confidence | null }
export interface QuestionsView { questions: QuestionView[]; drafts: Record<string, Draft | null> }
export interface ItemRequest { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null; confidence: Confidence | null }

/** 답 입력을 마친 뒤 언제나 이 모양이다. 근거 결과는 판정이 끝난 범주부터 채워지고(`judging > 0`이면 아직 진행 중), `firstItemOpen`이 켜지면 피드백을 시작할 수 있다. */
export interface SummaryCardView {
  status: 'ready'; correct: number; total: number; qualityTiers: QualityTiers; judging: number; firstItemOpen: boolean;
  counts: Record<AnswerCategory, number>;
  items: { questionId: string; questionNumber: number; correct: boolean; rationale: 'PROVIDED' | 'OMITTED'; category: AnswerCategory }[];
  position: PositionView;
}
export type DiagnosticFeedbackView = FeedbackWorkbenchView & { skippable: boolean; judgmentPending?: boolean };

type Box = 'pending' | 'ready' | 'failed';
export interface ResultTwist { twistType: string; twistDetail: string; studentText: string | null }
export interface ResultSummaryLink { status: Box; kind: 'MISREAD' | 'MISSED' | 'CAUGHT'; paragraphs: number[]; paragraphLabel: string }
export interface ResultItem {
  questionId: string; passageId: string; questionNumber: number; chosenPosition: number; correct: boolean; rationale: 'PROVIDED' | 'OMITTED'; category: AnswerCategory;
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
  qualityTiers: QualityTiers;
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
