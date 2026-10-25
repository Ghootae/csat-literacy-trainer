import type { ExaminerStrategyView, FeedbackInspection, FeedbackRequest, FeedbackWorkbenchView } from '../shared/problem-feedback.js';

const root = '/api/developer/problem-lab/session';
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `요청 실패 (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export const startFeedback = (questionId: string) => request<FeedbackWorkbenchView>(root, { questionId });
export const getFeedback = (id: string) => request<FeedbackWorkbenchView>(`${root}/${encodeURIComponent(id)}`);
export const submitFeedback = (id: string, body: FeedbackRequest) => request<FeedbackWorkbenchView>(`${root}/${encodeURIComponent(id)}`, body);
export const inspectFeedback = (id: string) => request<FeedbackInspection>(`${root}/${encodeURIComponent(id)}/inspect`);
export const getExaminerStrategy = (id: string) => request<ExaminerStrategyView>(`${root}/${encodeURIComponent(id)}/examiner-strategy`);
export const markExaminerStrategyView = (id: string, position: number) => request<{ ok: true }>(`${root}/${encodeURIComponent(id)}/examiner-strategy/view`, { position });
