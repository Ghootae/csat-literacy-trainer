import type { SimpleDialogueView, SimpleInspection, SimpleMemoRecord, SimpleRespondRequest } from '../shared/dialogue-simple.js';

const root = '/api/developer/dialogue-simple/session';
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
const at = (id: string, path = '') => `${root}/${encodeURIComponent(id)}${path}`;
export const startSimple = (passageId: string) => request<SimpleDialogueView>(root, { passageId });
export const getSimple = (id: string) => request<SimpleDialogueView>(at(id));
export const respondSimple = (id: string, body: SimpleRespondRequest) => request<SimpleDialogueView>(at(id, '/respond'), body);
export const navigateSimple = (id: string, paragraphIndex: number) => request<SimpleDialogueView>(at(id, '/navigate'), { paragraphIndex });
export const inspectSimple = (id: string, paragraphIndex: number) => request<SimpleInspection>(at(id, `/inspect?paragraphIndex=${paragraphIndex}`));
export const saveSimpleMemo = (id: string, body: { paragraphIndex: number; stepIndex: number | null; text: string }) =>
  request<SimpleMemoRecord>(at(id, '/memo'), body);
