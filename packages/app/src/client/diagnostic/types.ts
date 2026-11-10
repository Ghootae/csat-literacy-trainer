/** 진단평가 API 응답의 화면 쪽 모양. 서버 `controller.ts`의 반환과 같다(서버 모듈은 클라이언트에서 가져오지 않는다). */
import type { ProblemContentView } from '../../shared/contract.js';
import type { FeedbackRationale, FeedbackRequest, FeedbackWorkbenchView } from '../../shared/problem-feedback.js';

export interface SetInfo { passages: { passageId: string; title: string; questionIds: string[] }[] }
export type PassageStatus = 'NOT_STARTED' | 'SUMMARY' | 'ANSWERING' | 'AWAITING_JUDGMENT' | 'FEEDBACK' | 'DONE';
export interface PositionView {
  answered: number; correct: number;
  percentile: { mean: number; low: number; high: number };
  grade: { mean: number; best: number; worst: number; probabilities: number[]; mode: number };
}
export interface ProgressView {
  participantId: string;
  passages: { passageId: string; status: PassageStatus; summaryChosen: boolean | null }[];
  set: SetInfo;
  current: { passageId: string; questionId: string | null } | null;
  position: PositionView | null;
}
export interface QuestionView { questionId: string; questionNumber: number; content: ProblemContentView }
/** 근거를 생략한 응답의 확신 구분. 두 버튼("근거 미입력(확실)" / "근거 미입력(잘 모르겠음)")에 대응한다. */
export type Confidence = 'SURE' | 'UNSURE';
/** 첫 응답 기준 범주(서버 `AnswerCategory`와 같다). 정답의 질 3단계는 SUPPORTED_CORRECT·WEAK_CORRECT·ERROR_CORRECT. */
export type AnswerCategory = 'WRONG' | 'SURE_CORRECT' | 'UNSURE_CORRECT' | 'PENDING' | 'CHECKING' | 'UNVERIFIED' | 'ERROR_CORRECT' | 'SUPPORTED_CORRECT' | 'WEAK_CORRECT';
export type QualityTiers = 3 | 2;
export interface Draft { choiceId: string; rationale: FeedbackRationale; confidence: Confidence | null }
/** `drafts[qid]`는 확정한 문항이면 확정한 답, 아니면 임시 답. `confirmed`는 확정 여부(D-0221). */
export interface QuestionsView { questions: QuestionView[]; confirmed: Record<string, boolean>; drafts: Record<string, Draft | null> }
export interface ItemRequest { choiceId: string; rationale: FeedbackRationale; solveMs: number; rationaleMs: number | null; confidence: Confidence | null }

/** 지문 결과 화면 자료(D-0218). 정오·범주는 바로 오고(문제 버튼 색), 등급(`position`)은 모든 문항 결과를 공개한 뒤에만 온다. */
export interface SummaryCardItem {
  questionId: string; questionNumber: number; correct: boolean; rationale: 'PROVIDED' | 'OMITTED'; category: AnswerCategory;
  megastudy: { correctRate: [number, number]; chosenPercents: [number, number] };
  /** 첫 선택 판정이 진행 중이다. */
  judging: boolean;
  reviewTarget: boolean; reviewDone: boolean; revealed: boolean;
}
export interface SummaryCardView {
  status: 'ready'; correct: number; total: number; judging: number;
  items: SummaryCardItem[];
  allRevealed: boolean; canFinish: boolean;
  /** 모든 문항을 공개하기 전, 또는 답한 문항이 없으면 null. `grade.probabilities`는 1~9등급 확률(합 1), `mode`는 확률 최대 등급, `density`는 실수 등급 축의 확률(등급마다 10칸, D-0219). */
  position: { answered: number; correct: number; grade: { mode: number; probabilities: number[]; density: number[] } } | null;
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
    byPassage: { passageId: string; low: number; high: number; grade: { mode: number; probabilities: number[] } }[] };
  items: ResultItem[];
  steps: { status: Box; counts: Record<string, number>; denominator: number };
  twists: { counts: Record<string, number> };
  recommendation: { twistType: string; setNames: string[] } | null;
  reading: { passageId: string; status: Box; counts: ReadingCounts }[];
}

/** 본 서비스 명령에 진단평가 전용 건너뛰기(`SKIP`, D-0208 1)를 더한 요청. 공용 계약(`shared`)은 건드리지 않는다. */
export type DiagnosticFeedbackRequest = Omit<FeedbackRequest, 'command'> & { command: FeedbackRequest['command'] | { type: 'SKIP' } };
