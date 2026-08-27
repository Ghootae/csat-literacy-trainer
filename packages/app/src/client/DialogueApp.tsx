import { useEffect, useState } from 'react';

import type {
  DialoguePassageSummary,
  DialogueSessionView,
  DialogueStepView,
} from '../shared/contract.js';
import {
  fetchDialoguePassages,
  fetchDialogueSession,
  navigateDialogueSession,
  startLinkedProblemSession,
  startDialogueSession,
  submitDialogueResponse,
} from './api.js';

interface TranscriptEntry {
  readonly answer: string;
  readonly step: DialogueStepView;
}

export function DialogueApp(): React.JSX.Element {
  const [passages, setPassages] = useState<readonly DialoguePassageSummary[] | null>(null);
  const [session, setSession] = useState<DialogueSessionView | null>(null);
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const [transcripts, setTranscripts] = useState<Readonly<Record<string, readonly TranscriptEntry[]>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDialoguePassages().then(setPassages).catch(showError);
    const sessionId = new URLSearchParams(window.location.search).get('sessionId');
    if (sessionId !== null) fetchDialogueSession(sessionId).then(setSession).catch(showError);
  }, []);

  function showError(reason: unknown): void {
    setError(reason instanceof Error ? reason.message : String(reason));
  }

  async function start(passageId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setSession(await startDialogueSession(passageId));
      setTranscripts({});
      setDrafts({});
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    if (session === null) return;
    const paragraphId = session.visibleParagraphs.find((paragraph) => paragraph.state === 'CURRENT')?.paragraphId;
    if (paragraphId === undefined) return;
    const draft = drafts[paragraphId] ?? '';
    if (draft.trim() === '') return;
    const answer = draft.trim();
    setBusy(true);
    setError(null);
    try {
      const next = await submitDialogueResponse(session.sessionId, { text: answer });
      setSession(next);
      if (next.step !== null) {
        setTranscripts((byParagraph) => ({
          ...byParagraph,
          [paragraphId]: [...(byParagraph[paragraphId] ?? []), { answer, step: next.step! }],
        }));
      }
      setDrafts((byParagraph) => ({ ...byParagraph, [paragraphId]: '' }));
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  async function navigate(paragraphIndex: number): Promise<void> {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      setSession(await navigateDialogueSession(session.sessionId, paragraphIndex));
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  function returnToPassages(): void {
    setSession(null);
    setTranscripts({});
    setDrafts({});
    setError(null);
  }

  async function continueToProblem(): Promise<void> {
    if (session === null || session.nextProblemQuestionId === null) return;
    setBusy(true);
    setError(null);
    try {
      const problem = await startLinkedProblemSession(session.sessionId);
      sessionStorage.setItem(`csat.problem.${problem.content.questionId}`, problem.sessionId);
      window.location.assign(
        `/problem?sessionId=${encodeURIComponent(problem.sessionId)}&dialogueSessionId=${encodeURIComponent(session.sessionId)}`,
      );
    } catch (reason) {
      showError(reason);
      setBusy(false);
    }
  }

  if (passages === null) return <main className="dialogue-shell">불러오는 중…</main>;

  if (session === null) {
    return (
      <main className="dialogue-shell dialogue-start">
        <header>
          <p className="dialogue-kicker">자유 응답 판정기 · 개발자용</p>
          <h1>순차 지문 테스트</h1>
          <p>문단을 자유롭게 이동하며 응답과 피드백을 테스트할 수 있습니다.</p>
          <p><a className="problem-link" href="/problem">mRNA 19번 문제 풀이 진단 열기</a></p>
        </header>
        <section className="dialogue-passage-list" aria-label="테스트할 지문">
          {passages.map((passage) => (
            <article className="dialogue-passage-card" key={passage.passageId}>
              <div>
                <h2>{passage.title}</h2>
                <p>{passage.exam} · {passage.paragraphCount}문단</p>
                {!passage.available && <p className="dialogue-limitation">{passage.limitation}</p>}
              </div>
              <button
                className="primary"
                disabled={busy || !passage.available}
                onClick={() => void start(passage.passageId)}
              >
                시작
              </button>
            </article>
          ))}
        </section>
        {error !== null && <p className="err" role="alert">{error}</p>}
      </main>
    );
  }

  const current = session.visibleParagraphs.find((paragraph) => paragraph.state === 'CURRENT')!;
  const transcript = transcripts[current.paragraphId] ?? [];
  const draft = drafts[current.paragraphId] ?? '';
  const isFollowUp = transcript.length > 0 && transcript.at(-1)?.step.question !== null;

  return (
    <main className="dialogue-shell dialogue-run">
      <header className="dialogue-run-header">
        <div>
          <p className="dialogue-kicker">{session.exam}</p>
          <h1>{session.title}</h1>
        </div>
        <div className="dialogue-run-actions">
          <div className="dialogue-progress">
            {session.currentParagraphIndex + 1} / {session.paragraphCount}
          </div>
          <button disabled={busy} onClick={returnToPassages}>지문 선택</button>
        </div>
      </header>

      <nav className="dialogue-navigation" aria-label="문단 이동">
        <button
          disabled={busy || session.currentParagraphIndex === 0}
          onClick={() => void navigate(session.currentParagraphIndex - 1)}
        >
          이전 문단
        </button>
        <button
          disabled={busy || session.currentParagraphIndex === session.paragraphCount - 1}
          onClick={() => void navigate(session.currentParagraphIndex + 1)}
        >
          다음 문단
        </button>
      </nav>

      <section className="dialogue-reading" aria-label="누적 지문">
        {session.visibleParagraphs.map((paragraph) => (
          <article
            key={paragraph.paragraphId}
            className={`dialogue-paragraph ${paragraph.state === 'CURRENT' ? 'current' : 'completed'}`}
          >
            <span className="dialogue-paragraph-number">{paragraph.position}</span>
            <p>{paragraph.text}</p>
          </article>
        ))}
      </section>

      <section className="dialogue-workspace">
        <div className="dialogue-transcript">
          {transcript.map((entry, index) => (
            <div className="dialogue-exchange" key={index}>
              <div className="dialogue-answer"><strong>내 응답</strong><p>{entry.answer}</p></div>
              <div className={`dialogue-feedback status-${entry.step.status.toLowerCase()}`}>
                <div className="dialogue-feedback-head">
                  <strong>{entry.step.status}</strong>
                  <span>{(entry.step.durationMs / 1000).toFixed(1)}초</span>
                </div>
                <p>{entry.step.feedback}</p>
                {entry.step.question !== null && (
                  <div className="dialogue-question">
                    <span>{entry.step.questionType === 'DIAGNOSTIC' ? '확인 질문' : '교정 질문'}</span>
                    <p>{entry.step.question}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {session.status === 'ACTIVE' && (
          <div className="dialogue-compose">
            <label htmlFor="dialogue-response">
              {isFollowUp ? '질문에 답해 주세요.' : '이 문단에서 이해한 중심 내용과 관계를 자유롭게 설명해 주세요.'}
            </label>
            <textarea
              id="dialogue-response"
              value={draft}
              onChange={(event) => setDrafts((byParagraph) => ({
                ...byParagraph,
                [current.paragraphId]: event.target.value,
              }))}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit();
              }}
              disabled={busy}
              autoFocus
            />
            <div className="dialogue-compose-row">
              <span>후속 답변 {session.step?.questionsAnswered ?? 0} / 3 · ⌘/Ctrl + Enter</span>
              <button className="primary" disabled={busy || draft.trim() === ''} onClick={() => void submit()}>
                {busy ? '판정 중…' : '제출'}
              </button>
            </div>
          </div>
        )}

        {session.status === 'AWAITING_NEXT' && (
          <div className="dialogue-terminal pass">
            <strong>{current.position}문단 PASS</strong>
          </div>
        )}
        {session.status === 'COMPLETED' && (
          <div className="dialogue-terminal pass">
            <strong>전체 지문을 완료했습니다.</strong>
            {session.nextProblemQuestionId !== null && (
              <button className="primary" disabled={busy} onClick={() => void continueToProblem()}>
                {busy ? '문제 준비 중…' : '이 이해 기록으로 19번 풀기'}
              </button>
            )}
            <button onClick={returnToPassages}>지문 목록</button>
          </div>
        )}
        {session.status === 'UNRESOLVED' && (
          <div className="dialogue-terminal unresolved">
            <strong>3회의 후속 질문 뒤에도 PASS되지 않아 세션을 종료했습니다.</strong>
            <button onClick={returnToPassages}>지문 목록</button>
          </div>
        )}
        {error !== null && <p className="err" role="alert">{error}</p>}
      </section>
    </main>
  );
}
