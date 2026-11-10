import type { SimpleDialogueView, SimpleRespondRequest } from '../../shared/dialogue-simple.js';
import type { DiagnosticFeedbackRequest, DiagnosticFeedbackView, ItemRequest, ProgressView, QuestionsView, QuestionView, ResultView, SetInfo, SummaryCardView } from './types.js';

const root = '/api/diagnostic/participant';
export class ApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
export async function request<T>(url: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined && method === 'GET' ? undefined : {
    method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new ApiError(response.status, data.error ?? `요청 실패 (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export const at = (id: string, path = '') => `${root}/${encodeURIComponent(id)}${path}`;
const passagePath = (passageId: string, action: string) => `/passage/${encodeURIComponent(passageId)}/${action}`;

export const createParticipant = () => request<{ participantId: string; set: SetInfo }>(root, 'POST');
export const getProgress = (id: string) => request<ProgressView>(at(id));
export const startPassage = (id: string, passageId: string, summary: boolean) =>
  request<SimpleDialogueView | { questions: QuestionView[] }>(at(id, passagePath(passageId, 'start')), 'POST', { summary });
export const summaryRespond = (id: string, passageId: string, body: SimpleRespondRequest) => request<SimpleDialogueView>(at(id, passagePath(passageId, 'summary/respond')), 'POST', body);
export const summaryNavigate = (id: string, passageId: string, paragraphIndex: number) => request<SimpleDialogueView>(at(id, passagePath(passageId, 'summary/navigate')), 'POST', { paragraphIndex });
export const summaryFinish = (id: string, passageId: string) => request<{ questions: QuestionView[] }>(at(id, passagePath(passageId, 'summary/finish')), 'POST');
export const getQuestions = (id: string, passageId: string) => request<QuestionsView>(at(id, passagePath(passageId, 'questions')));
export const submitItem = (id: string, questionId: string, body: ItemRequest) => request<{ saved: true }>(at(id, `/item/${encodeURIComponent(questionId)}`), 'POST', body);
export const confirmItem = (id: string, questionId: string, body: ItemRequest) => request<{ confirmed: true }>(at(id, `/item/${encodeURIComponent(questionId)}/confirm`), 'POST', body);
export const answersDone = (id: string, passageId: string) => request<unknown>(at(id, passagePath(passageId, 'answers-done')), 'POST');
export const getSummaryCard = (id: string, passageId: string) => request<SummaryCardView>(at(id, passagePath(passageId, 'summary-card')));
export const revealItem = (id: string, passageId: string, questionId: string) => request<SummaryCardView>(at(id, passagePath(passageId, 'reveal')), 'POST', { questionId });
export const finishPassage = (id: string, passageId: string) => request<{ status: 'DONE' }>(at(id, passagePath(passageId, 'finish')), 'POST');
export const getFeedback = (id: string, questionId: string) => request<DiagnosticFeedbackView>(at(id, `/item/${encodeURIComponent(questionId)}/feedback`));
export const postFeedback = (id: string, questionId: string, body: DiagnosticFeedbackRequest) => request<DiagnosticFeedbackView>(at(id, `/item/${encodeURIComponent(questionId)}/feedback`), 'POST', body);
export const getResult = (id: string) => request<ResultView>(at(id, '/result'));
