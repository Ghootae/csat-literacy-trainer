import { useEffect, useState } from 'react';

import type { ProblemSessionView } from '../shared/contract.js';
import {
  fetchProblemSession,
  startProblemSession,
  submitProblemAction,
  submitProblemInitial,
  submitProblemRationale,
} from './api.js';
import { recoverProblemMutation } from './problem-session-recovery.js';

const QUESTION_ID = 'mrna-vaccine-lipid-nanoparticle-q19';
const STORAGE_KEY = `csat.problem.${QUESTION_ID}`;

export function ProblemApp(): React.JSX.Element {
  const [session, setSession] = useState<ProblemSessionView | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confidence, setConfidence] = useState('');
  const [strategy, setStrategy] = useState('');
  const [runnerUpChoiceId, setRunnerUpChoiceId] = useState('');
  const [runnerUpRationale, setRunnerUpRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [busySeconds, setBusySeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const linkedSessionId = new URLSearchParams(window.location.search).get('sessionId');
    const saved = linkedSessionId ?? sessionStorage.getItem(STORAGE_KEY);
    const request = linkedSessionId !== null
      ? fetchProblemSession(linkedSessionId)
      : saved === null
        ? startProblemSession(QUESTION_ID)
        : fetchProblemSession(saved).catch(() => startProblemSession(QUESTION_ID));
    request.then((next) => {
      if (!active) return;
      sessionStorage.setItem(STORAGE_KEY, next.sessionId);
      setSession(next);
      setChoiceId(next.selectedChoiceId);
    }).catch(showError);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!busy) {
      setBusySeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setBusySeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [busy]);

  function showError(reason: unknown): void {
    setError(reason instanceof Error ? reason.message : String(reason));
  }

  async function run(
    request: Promise<ProblemSessionView>,
    recoverFrom: ProblemSessionView | null = null,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const next = recoverFrom === null
        ? await request
        : await recoverProblemMutation(
            request,
            recoverFrom,
            () => fetchProblemSession(recoverFrom.sessionId),
          );
      setSession(next);
      setChoiceId(next.selectedChoiceId);
      setDraft('');
      setConfidence('');
      setStrategy('');
      setRunnerUpChoiceId('');
      setRunnerUpRationale('');
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  }

  function restart(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setChoiceId(null);
    setDraft('');
    setConfidence('');
    setStrategy('');
    setRunnerUpChoiceId('');
    setRunnerUpRationale('');
    void run(startProblemSession(QUESTION_ID).then((next) => {
      sessionStorage.setItem(STORAGE_KEY, next.sessionId);
      return next;
    }));
  }

  if (session === null) {
    return <main className="problem-shell">문제를 불러오는 중…</main>;
  }

  const { content } = session;
  const dialogueSessionId = new URLSearchParams(window.location.search).get('dialogueSessionId');
  const awaitingChoice = session.phase === 'AWAITING_INITIAL_CHOICE';
  const awaitingRationale = session.phase === 'AWAITING_RATIONALE';
  const awaitingResponse = session.phase === 'AWAITING_RESPONSE';
  const awaitingReselection = session.phase === 'AWAITING_RESELECTION';
  const isCoaching = session.action?.kind === 'COACHING' || session.action?.kind === 'ITEM_BOUNDARY';

  return (
    <main className="problem-shell">
      <header className="problem-header">
        <div>
          <p className="dialogue-kicker">{content.exam}</p>
          <h1>{content.title} · 19번</h1>
        </div>
        <div className="dialogue-run-actions">
          <span className="dialogue-progress">추가 진단 질문 {session.questionBudget.used}/{session.questionBudget.maximum}</span>
          <a
            className="problem-link"
            href={dialogueSessionId === null ? '/dialogue' : `/dialogue?sessionId=${encodeURIComponent(dialogueSessionId)}`}
          >문단 대화</a>
          <button disabled={busy} onClick={restart}>새로 풀기</button>
        </div>
      </header>

      <div className="problem-layout">
        <section className="problem-passage" aria-label="지문">
          <h2>지문</h2>
          {content.passage.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </section>

        <section className="problem-workspace" aria-label="문제 풀이">
          <h2>{content.stem}</h2>
          <div className="problem-scenario">
            <strong>&lt;보기&gt;</strong>
            <p>{content.scenario}</p>
            {content.image !== null && (
              <img
                src={content.image.url}
                alt={content.image.alt}
                width={content.image.width}
                height={content.image.height}
              />
            )}
          </div>

          <fieldset className="problem-choices" disabled={busy || awaitingRationale || awaitingResponse || session.phase === 'COMPLETED'}>
            <legend>{awaitingReselection ? '다시 선택해 주세요.' : '답을 선택해 주세요.'}</legend>
            {content.choices.map((choice) => (
              <label key={choice.choiceId} className={choiceId === choice.choiceId ? 'selected' : ''}>
                <input
                  type="radio"
                  name="problem-choice"
                  value={choice.choiceId}
                  checked={choiceId === choice.choiceId}
                  onChange={() => setChoiceId(choice.choiceId)}
                />
                <span>{choice.position}</span>
                <p>{choice.text}</p>
              </label>
            ))}
          </fieldset>

          {awaitingChoice && (
            <div className="problem-compose">
              <label htmlFor="problem-rationale-optional">선택 근거 (선택 사항)</label>
              <textarea
                id="problem-rationale-optional"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="왜 이 답을 골랐는지 한두 문장으로 적어 보세요."
              />
              <details className="problem-optional-observations">
                <summary>풀이 정보 더 적기 (선택 사항)</summary>
                <label htmlFor="problem-confidence">확신도 (0~100)</label>
                <input
                  id="problem-confidence"
                  type="number"
                  min="0"
                  max="100"
                  value={confidence}
                  onChange={(event) => setConfidence(event.target.value)}
                  placeholder="예: 70"
                />
                <label htmlFor="problem-strategy">사용한 풀이 전략</label>
                <textarea
                  id="problem-strategy"
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                  placeholder="어떤 순서나 기준으로 판단했나요?"
                />
                <label htmlFor="problem-runner-up">끝까지 고민한 차선 후보</label>
                <select
                  id="problem-runner-up"
                  value={runnerUpChoiceId}
                  onChange={(event) => {
                    setRunnerUpChoiceId(event.target.value);
                    if (event.target.value === '') setRunnerUpRationale('');
                  }}
                >
                  <option value="">없음</option>
                  {content.choices
                    .filter((choice) => choice.choiceId !== choiceId)
                    .map((choice) => <option key={choice.choiceId} value={choice.choiceId}>{choice.position}번</option>)}
                </select>
                {runnerUpChoiceId !== '' && (
                  <>
                    <label htmlFor="problem-runner-up-rationale">차선 후보를 고민한 이유</label>
                    <textarea
                      id="problem-runner-up-rationale"
                      value={runnerUpRationale}
                      onChange={(event) => setRunnerUpRationale(event.target.value)}
                    />
                  </>
                )}
              </details>
              <button
                className="primary"
                disabled={busy || choiceId === null || (runnerUpChoiceId !== '' && runnerUpRationale.trim() === '')}
                onClick={() => choiceId !== null && void run(submitProblemInitial(session.sessionId, {
                  choiceId,
                  ...(draft.trim() === '' ? {} : { rationale: draft.trim() }),
                  ...(confidence === '' ? {} : { confidence: Number(confidence) }),
                  ...(strategy.trim() === '' ? {} : { strategy: strategy.trim() }),
                  ...(runnerUpChoiceId === '' ? {} : {
                    runnerUp: { choiceId: runnerUpChoiceId, rationale: runnerUpRationale.trim() },
                  }),
                }), session)}
              >{busy ? '판정 중…' : '선택 제출'}</button>
            </div>
          )}

          {awaitingRationale && (
            <div className="problem-compose">
              <label htmlFor="problem-rationale">왜 이 답을 골랐나요?</label>
              <textarea id="problem-rationale" value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
              <button
                className="primary"
                disabled={busy || draft.trim() === ''}
                onClick={() => void run(submitProblemRationale(session.sessionId, { rationale: draft.trim() }), session)}
              >{busy ? '진단 중…' : '근거 제출'}</button>
            </div>
          )}

          {awaitingResponse && session.action !== null && (
            <div className={`problem-action action-${session.action.kind.toLowerCase()}`}>
              <span>{session.action.kind === 'DIAGNOSTIC_QUESTION' ? '확인 질문' : session.action.kind === 'CORRECTIVE_QUESTION' ? '교정 질문' : '코칭'}</span>
              <p>{session.action.text}</p>
              {isCoaching ? (
                <button className="primary" disabled={busy} onClick={() => void run(submitProblemAction(session.sessionId, { type: 'TEXT', text: '확인했습니다.' }), session)}>
                  확인
                </button>
              ) : (
                <>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
                  <button className="primary" disabled={busy || draft.trim() === ''} onClick={() => void run(submitProblemAction(session.sessionId, { type: 'TEXT', text: draft.trim() }), session)}>
                    {busy ? '판정 중…' : '답변 제출'}
                  </button>
                </>
              )}
            </div>
          )}

          {awaitingReselection && (
            <div className="problem-action">
              <p>{session.reselectionPrompt}</p>
              <button
                className="primary"
                disabled={busy || choiceId === null || choiceId === session.selectedChoiceId}
                onClick={() => choiceId !== null && void run(submitProblemAction(session.sessionId, { type: 'RESELECT', choiceId }), session)}
              >{busy ? '확인 중…' : '다시 선택'}</button>
            </div>
          )}

          {session.phase === 'COMPLETED' && session.result !== null && (
            <div className={`problem-result ${session.result.correct ? 'correct' : 'incorrect'}`}>
              <strong>{session.result.correct ? '정답입니다.' : '풀이를 종료했습니다.'}</strong>
              <p>최종 선택: {content.choices.find((choice) => choice.choiceId === session.result!.finalChoiceId)?.position}번</p>
              <p>교정 수준: {session.result.outcome}</p>
            </div>
          )}

          {session.transcript.length > 0 && (
            <details className="problem-transcript">
              <summary>대화 기록</summary>
              {session.transcript.map((entry, index) => (
                <p key={index}><strong>{entry.role === 'STUDENT' ? '학생' : '코치'}</strong> {entry.text}</p>
              ))}
            </details>
          )}
          {error !== null && <p className="err" role="alert">{error}</p>}
          {busy && (
            <p className="problem-busy-status" role="status" aria-live="polite">
              답변을 분석하고 있습니다. {busySeconds}초
              {busySeconds >= 15 ? ' — 서버에서 완료된 상태를 자동으로 확인하고 있습니다.' : ''}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
