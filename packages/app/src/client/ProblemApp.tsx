import { useEffect, useRef, useState } from 'react';

import type { ProblemSessionView } from '../shared/contract.js';
import {
  fetchProblemSession,
  resumeProblemSession,
  startProblemSession,
  submitProblemAction,
  submitProblemInitial,
  submitProblemRationale,
} from './api.js';
import { recoverProblemMutation } from './problem-session-recovery.js';

const QUESTION_ID = 'mrna-vaccine-lipid-nanoparticle-q19';
const STORAGE_KEY = `csat.problem.${QUESTION_ID}`;

function rationaleAssessmentLabel(result: NonNullable<ProblemSessionView['result']>): string {
  if (result.rationaleAssessment !== 'NOT_EVALUATED') return result.rationaleAssessment;
  return result.rationaleNonEvaluationReason === 'FINAL_ATTEMPT_STATIC_TERMINATION'
    ? '최종 시도 정적 종결로 별도 평가하지 않음'
    : '오답 경로 진단에만 사용하고 정답 근거로는 별도 평가하지 않음';
}

export function ProblemApp(): React.JSX.Element {
  const [session, setSession] = useState<ProblemSessionView | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confidence, setConfidence] = useState('');
  const [strategy, setStrategy] = useState('');
  const [runnerUpChoiceId, setRunnerUpChoiceId] = useState('');
  const [runnerUpRationale, setRunnerUpRationale] = useState('');
  const [reselectionRationale, setReselectionRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [busySeconds, setBusySeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const automaticResumeKeys = useRef(new Set<string>());

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

  useEffect(() => {
    if (session?.phase !== 'PROCESSING') return;
    let active = true;
    const poll = window.setInterval(() => {
      void fetchProblemSession(session.sessionId).then((next) => {
        if (!active || next.phase === 'PROCESSING') return;
        setSession(next);
        setChoiceId(next.selectedChoiceId);
      }).catch(() => undefined);
    }, 1_000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [session?.phase, session?.sessionId]);

  useEffect(() => {
    if (session?.phase !== 'EVALUATION_ERROR') return;
    const key = [
      session.sessionId,
      session.selectionProgress.current,
      session.selectedChoiceId,
    ].join(':');
    if (automaticResumeKeys.current.has(key)) return;
    automaticResumeKeys.current.add(key);
    void run(resumeProblemSession(session.sessionId), session);
  }, [session?.phase, session?.sessionId, session?.selectionProgress.current, session?.selectedChoiceId]);

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
      setReselectionRationale('');
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
    setReselectionRationale('');
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
  const processing = session.phase === 'PROCESSING';
  const evaluationError = session.phase === 'EVALUATION_ERROR';
  const isCoaching = session.action?.kind === 'COACHING' || session.action?.kind === 'ITEM_BOUNDARY';

  return (
    <main className="problem-shell">
      <header className="problem-header">
        <div>
          <p className="dialogue-kicker">{content.exam}</p>
          <h1>{content.title} · 19번</h1>
        </div>
        <div className="dialogue-run-actions">
          <span className="dialogue-progress">이번 선택 질문 {session.attemptQuestionBudget.used}/{session.attemptQuestionBudget.maximum}</span>
          <span className="dialogue-progress">선택 {session.selectionProgress.current}/{session.selectionProgress.maximum}</span>
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

          <fieldset className="problem-choices" disabled={busy || awaitingRationale || awaitingResponse || processing || evaluationError || session.phase === 'COMPLETED'}>
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
              <label htmlFor="problem-reselection-rationale">바꾼 이유 (선택 사항)</label>
              <textarea
                id="problem-reselection-rationale"
                value={reselectionRationale}
                onChange={(event) => setReselectionRationale(event.target.value)}
                placeholder="새 답을 고른 근거를 적으면 이해 여부를 함께 확인합니다."
              />
              <button
                className="primary"
                disabled={busy || choiceId === null || choiceId === session.selectedChoiceId}
                onClick={() => choiceId !== null && void run(submitProblemAction(session.sessionId, {
                  type: 'RESELECT',
                  choiceId,
                  ...(reselectionRationale.trim() === '' ? {} : { rationale: reselectionRationale.trim() }),
                }), session)}
              >{busy ? '확인 중…' : '다시 선택'}</button>
            </div>
          )}

          {processing && (
            <div className="problem-action" role="status" aria-live="polite">
              <span>후속 상태 생성 중</span>
              <p>선택과 근거는 저장되었습니다. 다음 질문이나 결과를 준비하고 있습니다.</p>
            </div>
          )}

          {evaluationError && (
            <div className="problem-action" role="alert">
              <span>진행을 다시 시작할 수 있습니다</span>
              <p>{session.evaluation.message ?? '저장된 선택부터 후속 진단을 다시 생성합니다.'}</p>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void run(resumeProblemSession(session.sessionId), session)}
              >{busy ? '다시 진행 중…' : '다시 진행'}</button>
            </div>
          )}

          {session.phase === 'COMPLETED' && session.result !== null && (
            <div className={`problem-result ${session.result.correct ? 'correct' : 'incorrect'}`}>
              <strong>{session.result.answerRevealed
                ? '상세 코칭으로 풀이를 마쳤습니다.'
                : session.result.correct
                  ? '정답입니다.'
                  : '풀이를 종료했습니다.'}</strong>
              <p>최종 선택: {content.choices.find((choice) => choice.choiceId === session.result!.finalChoiceId)?.position}번</p>
              <p>선택 횟수: {session.result.selectionAttempt}회</p>
              <p>최종 근거: {session.result.rationaleSubmission === 'PROVIDED' ? '제출됨' : '제출하지 않음'}</p>
              <p>최종 근거 검증: {rationaleAssessmentLabel(session.result)}</p>
              <p>학생 스스로 해결: {session.result.resolvedByStudent ? '예' : '아니요'}</p>
              <p>정답 공개: {session.result.answerRevealed ? '예' : '아니요'}</p>
              <p>최종 결과: {session.result.resolutionOutcome}</p>
              <p>상세 결과 유형: {session.result.outcome}</p>
              <p>해결 단계: {session.result.resolutionStage}</p>
              <p>최종 유효 교정 경로: {session.result.effectiveRepairPath}</p>
              <p>전체 개입 이력: {session.result.interventionHistory.length === 0
                ? 'NONE'
                : session.result.interventionHistory.join(' → ')}</p>
              {session.result.answerExplanation !== null && <p>{session.result.answerExplanation}</p>}
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
