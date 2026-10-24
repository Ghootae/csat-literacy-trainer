import type { ExaminerStrategyView, FeedbackV4Inspection, FeedbackV4Request, FeedbackV4WorkbenchView } from '../shared/problem-feedback-v4.js';

const root = '/api/developer/problem-feedback-v4/session';
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
export const startFeedbackV4 = (questionId: string) => request<FeedbackV4WorkbenchView>(root, { questionId });
export const getFeedbackV4 = (id: string) => request<FeedbackV4WorkbenchView>(`${root}/${encodeURIComponent(id)}`);
export const submitFeedbackV4 = (id: string, body: FeedbackV4Request) => request<FeedbackV4WorkbenchView>(`${root}/${encodeURIComponent(id)}`, body);
export const inspectFeedbackV4 = (id: string) => request<FeedbackV4Inspection>(`${root}/${encodeURIComponent(id)}/inspect`);
export const getExaminerStrategy = (id: string) => request<ExaminerStrategyView>(`${root}/${encodeURIComponent(id)}/examiner-strategy`);
export const markExaminerStrategyView = (id: string, position: number) => request<{ ok: true }>(`${root}/${encodeURIComponent(id)}/examiner-strategy/view`, { position });
