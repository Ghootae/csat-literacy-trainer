/** 개발자 이동 API(`/api/diagnostic/participant/:id/dev/*`, D-0217) 호출. 서버가 `CSAT_DIAGNOSTIC_DEV=1`이 아니면 404다. */
import type { SimpleDialogueView } from '../../shared/dialogue-simple.js';
import type { FeedbackRationale } from '../../shared/problem-feedback.js';
import { at, request } from './api.js';
import type { Confidence, PassageStatus, QuestionView } from './types.js';

export interface DevMapQuestion {
  questionId: string; questionNumber: number; answered: boolean; draft: boolean;
  firstJudgment: 'NONE' | 'PENDING' | 'READY' | 'FAILED'; feedbackPhase: string | null; skipped: boolean;
  /** 학생 지문 결과 화면의 리뷰 대상(D-0218)과 검토 완료 여부. */
  reviewTarget: boolean; reviewDone: boolean;
}
export interface DevMapPassage {
  passageId: string; title: string; status: PassageStatus; summaryChosen: boolean | null; summarySkipped: boolean;
  paragraphs: { paragraphId: string; position: number; answered: boolean }[];
  questions: DevMapQuestion[];
}
export interface DevMapView { passages: DevMapPassage[]; resultAvailable: boolean }
export interface DevAnswersView {
  questions: QuestionView[];
  answers: Record<string, { source: 'first' | 'draft'; choiceId: string; rationale: FeedbackRationale; confidence: Confidence | null; eliminationNote: string | null; elimination: boolean } | null>;
}

const devPath = (id: string, path: string) => at(id, `/dev/${path}`);
const passageDev = (id: string, passageId: string, action: string) => devPath(id, `passage/${encodeURIComponent(passageId)}/${action}`);
export const getDevMap = (id: string) => request<DevMapView>(devPath(id, 'map'));
export const getDevSummary = (id: string, passageId: string, paragraphIndex: number) =>
  request<SimpleDialogueView>(`${passageDev(id, passageId, 'summary')}?paragraph=${paragraphIndex}`);
export const getDevAnswers = (id: string, passageId: string) => request<DevAnswersView>(passageDev(id, passageId, 'answers'));
export const devSkipPassage = (id: string, passageId: string, to: 'ANSWERING' | 'FEEDBACK' | 'DONE') =>
  request<{ status: PassageStatus }>(passageDev(id, passageId, 'skip'), 'POST', { to });
export const devResetPassage = (id: string, passageId: string) => request<{ status: 'NOT_STARTED' }>(passageDev(id, passageId, 'reset'), 'POST');
