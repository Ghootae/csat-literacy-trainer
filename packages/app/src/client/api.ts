/**
 * 서버 호출. **클라이언트가 채점에 닿는 유일한 통로다** (계획서 `D4` 프로세스 경계).
 *
 * 여기서 `@csat/pipeline`을 import 하지 않는다 — 하면 채점 코드가 번들에 들어간다.
 */

import type {
  AppCapabilitiesView,
  AttemptRequest,
  AttemptResponse,
  DialoguePassageSummary,
  DialogueResponseRequest,
  DialogueSessionView,
  PassageSummary,
  PassageTitleRequest,
  PassageTitleResponse,
  PassageView,
  ProblemActionResponseRequest,
  ProblemInitialSubmissionRequest,
  ProblemRationaleRequest,
  ProblemSessionView,
  RestoreResponse,
  TitleRequest,
  TitleResponse,
} from '../shared/contract.js';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `요청 실패 (${res.status})`);
  }
  return (await res.json()) as T;
}

export function fetchProblemInspection(sessionId: string): Promise<import('../shared/contract.js').ProblemDeveloperInspection> {
  return jsonFetch(`/api/developer/problem-inspect?sessionId=${encodeURIComponent(sessionId)}`);
}

export function fetchPassage(paragraphId: string): Promise<PassageView> {
  return jsonFetch<PassageView>(`/api/passage/${paragraphId}`);
}

/** 이어하기 — 저장된 마지막 제출을 되살린다. 채점을 부르지 않는다. */
export function fetchAttempt(paragraphId: string, sessionId: string): Promise<RestoreResponse> {
  return jsonFetch<RestoreResponse>(`/api/attempt/${paragraphId}/${sessionId}`);
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

/** 고를 수 있는 문단 목록. 골드도 질의도 담기지 않는다. */
export function fetchPassages(): Promise<PassageSummary[]> {
  return jsonFetch<PassageSummary[]>('/api/passages');
}

/** 타이틀 제출. `hypothesisOnly`면 서버가 저장만 하고 채점하지 않는다. */
export function submitTitle(
  paragraphId: string,
  sessionId: string,
  body: TitleRequest,
): Promise<TitleResponse> {
  return jsonFetch<TitleResponse>(`/api/title/${paragraphId}/${sessionId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchPassageTitle(passageId: string, sessionId: string): Promise<PassageTitleResponse> {
  return jsonFetch<PassageTitleResponse>(`/api/passage-title/${passageId}/${sessionId}`);
}

export function submitPassageTitle(
  passageId: string,
  sessionId: string,
  body: PassageTitleRequest,
): Promise<PassageTitleResponse> {
  return jsonFetch<PassageTitleResponse>(`/api/passage-title/${passageId}/${sessionId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchDialoguePassages(): Promise<DialoguePassageSummary[]> {
  return jsonFetch<DialoguePassageSummary[]>('/api/dialogue/passages');
}

export function fetchAppCapabilities(): Promise<AppCapabilitiesView> {
  return jsonFetch<AppCapabilitiesView>('/api/capabilities');
}

export function fetchDeveloperMap(): Promise<readonly import('../shared/contract.js').DialogueDeveloperPassage[]> {
  return jsonFetch('/api/developer/map');
}
export function fetchDeveloperInspection(sessionId: string): Promise<import('../shared/contract.js').DialogueDeveloperInspection> {
  return jsonFetch(`/api/developer/inspect?sessionId=${encodeURIComponent(sessionId)}`);
}
export function fetchStudentStateReport(context: 'student' | 'developer', days: 7 | 30 | 90): Promise<import('../shared/contract.js').StudentStateReportView> {
  return jsonFetch(`/api/developer/student-state?context=${context}&days=${days}`);
}
export function fetchStudentPeriodicFeedback(days: 7 | 30 | 90): Promise<import('../shared/contract.js').StudentStateReportView> {
  return jsonFetch(`/api/student-state?days=${days}`);
}
export function openDeveloperDialogue(passageId: string, paragraphIndex: number, sessionId?: string, fresh = false, mode: import('../shared/contract.js').DialogueMode = 'v4'): Promise<DialogueSessionView> {
  return jsonFetch('/api/developer/open', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passageId, paragraphIndex, sessionId, fresh, mode }) });
}

export function startDialogueSession(passageId: string): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>('/api/dialogue/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passageId }),
  });
}

export function fetchDialogueSession(sessionId: string): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}`);
}

export function submitDialogueRevision(sessionId: string, text: string): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}/revision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export function submitDialogueResponse(
  sessionId: string,
  body: DialogueResponseRequest,
): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}/respond`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function advanceDialogueSession(sessionId: string): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}/advance`, {
    method: 'POST',
  });
}

export function requestDialogueQuestion(sessionId: string): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}/question`, { method: 'POST' });
}

export function navigateDialogueSession(
  sessionId: string,
  paragraphIndex: number,
): Promise<DialogueSessionView> {
  return jsonFetch<DialogueSessionView>(`/api/dialogue/session/${sessionId}/navigate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paragraphIndex }),
  });
}

export function startProblemSession(questionId: string): Promise<ProblemSessionView> {
  return jsonFetch<ProblemSessionView>('/api/problem/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ questionId }),
  });
}

export function startLinkedProblemSession(dialogueSessionId: string): Promise<ProblemSessionView> {
  return jsonFetch<ProblemSessionView>(`/api/dialogue/session/${dialogueSessionId}/problem`, {
    method: 'POST',
  });
}

export function fetchProblemSession(sessionId: string): Promise<ProblemSessionView> {
  return jsonFetch<ProblemSessionView>(`/api/problem/session/${sessionId}`);
}

export function resumeProblemSession(sessionId: string): Promise<ProblemSessionView> {
  return jsonFetch<ProblemSessionView>(`/api/problem/session/${sessionId}/resume`, {
    method: 'POST',
  });
}

export function submitProblemInitial(
  sessionId: string,
  body: ProblemInitialSubmissionRequest,
): Promise<ProblemSessionView> {
  const requestBody = body.transitionId === undefined
    ? { ...body, transitionId: crypto.randomUUID() }
    : body;
  return jsonFetch<ProblemSessionView>(`/api/problem/session/${sessionId}/initial`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export function submitProblemRationale(
  sessionId: string,
  body: ProblemRationaleRequest,
): Promise<ProblemSessionView> {
  const requestBody = body.transitionId === undefined
    ? { ...body, transitionId: crypto.randomUUID() }
    : body;
  return jsonFetch<ProblemSessionView>(`/api/problem/session/${sessionId}/rationale`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}

export function submitProblemAction(
  sessionId: string,
  body: ProblemActionResponseRequest,
): Promise<ProblemSessionView> {
  const requestBody = body.transitionId === undefined
    ? { ...body, transitionId: crypto.randomUUID() }
    : body;
  return jsonFetch<ProblemSessionView>(`/api/problem/session/${sessionId}/respond`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}
