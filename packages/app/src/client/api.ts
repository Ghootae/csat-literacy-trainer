/**
 * 서버 호출. **클라이언트가 채점에 닿는 유일한 통로다** (계획서 `D4` 프로세스 경계).
 *
 * 여기서 `@csat/pipeline`을 import 하지 않는다 — 하면 채점 코드가 번들에 들어간다.
 */

import type { AttemptRequest, AttemptResponse, PassageView } from '../shared/contract.js';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `요청 실패 (${res.status})`);
  }
  return (await res.json()) as T;
}

export function fetchPassage(paragraphId: string): Promise<PassageView> {
  return jsonFetch<PassageView>(`/api/passage/${paragraphId}`);
}

export function submitAttempt(
  paragraphId: string,
  sessionId: string,
  body: AttemptRequest,
): Promise<AttemptResponse> {
  return jsonFetch<AttemptResponse>(`/api/attempt/${paragraphId}/${sessionId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
