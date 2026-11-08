/** 문항별 피드백 화면(인계 B (4)). `ProblemLabApp`의 말풍선·명령 버튼 표시를 떼어 쓰고, 건너뛰기 버튼을 더한다(기존 화면은 그대로 둔다). */
import { useEffect, useRef, useState } from 'react';
import type { FeedbackMessage, FeedbackRequest } from '../../shared/problem-feedback.js';
import { Markdown } from '../markdown.js';
import { RationaleSymbolBar } from '../RationaleSymbolBar.js';
import { toSubmittedText, type SymbolMark } from '../rationale-tools.js';
import { composerState, sequenceState, waitingKind, waitingText, type WaitingKind } from '../problem-composer-state.js';
import type { DiagnosticFeedbackRequest, DiagnosticFeedbackView } from './types.js';
import { PassagePane, QuestionPane, paneFromFeedback } from './QuestionPanes.js';

const coachLabel = (entry: FeedbackMessage) => entry.kind === 'WAIT_DONE' ? '진행' : entry.phase === 'AWAITING_CORRECTION' ? '틀린 부분 묻기'
  : entry.sequence === 'GATE' ? '설명 시작' : entry.sequence === 'CONNECTOR' || entry.sequence === 'SECTION' ? '선지별 설명'
  : entry.sequence === 'QUESTION' ? '이해 확인' : entry.sequence === 'CLOSING' ? '마무리' : '판정 결과';

export function FeedbackScreen({ load, send, nextLabel, next }: {
  load: () => Promise<DiagnosticFeedbackView>; send: (request: DiagnosticFeedbackRequest) => Promise<DiagnosticFeedbackView>;
  /** 이 문항이 끝난 뒤 보이는 버튼 이름(다음 문항·다음 지문·결과 보기). */
  nextLabel: string; next: () => void;
}): React.JSX.Element {
  const [view, setView] = useState<DiagnosticFeedbackView | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [omit, setOmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<DiagnosticFeedbackRequest | null>(null);
  const [waitClock, setWaitClock] = useState({ kind: 'UNKNOWN' as WaitingKind, startedAt: Date.now(), elapsedMs: 0 });
  const [revealed, setRevealed] = useState(0);
  const [released, setReleased] = useState(false);
  const [pane, setPane] = useState('chat');
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const previousView = useRef<DiagnosticFeedbackView | null>(null);
  const previousButtons = useRef<{ id: string; label: string; disabled: boolean }[]>([]);
  const symbolMarks = useRef<SymbolMark[]>([]);
  const submitting = useRef(false);
  const first = useRef(true);
  const chat = useRef<HTMLDivElement>(null);
  const response = useRef<HTMLTextAreaElement>(null);
  const columns = useRef<HTMLDivElement>(null);

  function accept(nextView: DiagnosticFeedbackView) {
    if (first.current) { first.current = false; setRevealed(nextView.transcript.length); }   // 처음 열 때의 말풍선은 한 번에 보인다
    setView(nextView);
    setChoice(old => nextView.phase === 'AWAITING_RESELECTION' ? (old === nextView.selectedChoiceId ? null : old) : nextView.selectedChoiceId);
  }
  useEffect(() => {
    let active = true;
    load().then(v => { if (active) accept(v); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (view && pending && view.evaluationStatus !== 'PROCESSING' && view.revision > pending.expectedRevision) { setPending(null); setDraft(''); setOmit(false); }
  }, [view?.revision, view?.evaluationStatus, pending]);
  const waiting = busy || view?.evaluationStatus === 'PROCESSING';
  const sequence = sequenceState(view?.transcript ?? [], revealed, reducedMotion, released);
  useEffect(() => {
    if (sequence.visibleCount !== revealed) { setRevealed(sequence.visibleCount); setReleased(false); }
    if (sequence.delayMs === null) return;
    const timer = window.setTimeout(() => { setRevealed(sequence.visibleCount + 1); setReleased(false); }, sequence.delayMs);
    return () => window.clearTimeout(timer);
  }, [view?.transcript.length, revealed, released, sequence.visibleCount, sequence.delayMs]);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: 'auto' }); }, [sequence.visibleCount, sequence.showDots, pending?.transitionId, waiting, view?.phase, view?.transcript.length]);
  useEffect(() => {
    if (!view || view.evaluationStatus !== 'PROCESSING' || busy) return;
    let active = true;
    const timer = window.setInterval(() => {
      void load().then(v => { if (active) { accept(v); setError(''); } }).catch(() => { if (active) setError('서버 확인이 늦어지고 있어. 제출한 내용은 서버에서 확인한 뒤 이어서 보여 줄게.'); });
    }, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [view?.evaluationStatus, busy]);
  // 칠한 곳으로 그 칸만 스크롤한다(`ProblemLabApp.scrollToHighlight`와 같은 방식).
  function scrollToHighlight(location: 'PASSAGE' | 'SCENARIO' | undefined) {
    if (!location) return;
    const target = columns.current?.querySelector<HTMLElement>(location === 'PASSAGE' ? '.source-pane .lab-highlight' : '.question-pane .lab-highlight');
    if (!target) return;
    let region = target.parentElement;
    while (region && !(region.scrollHeight > region.clientHeight && /auto|scroll/.test(getComputedStyle(region).overflowY))) region = region.parentElement;
    if (!region || region === document.body || region.clientHeight === 0) return;
    const box = target.getBoundingClientRect(); const frame = region.getBoundingClientRect();
    const top = region.scrollTop + box.top - frame.top - (region.clientHeight - box.height) / 2;
    region.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  const correctionRevealed = !!view && sequence.visibleCount === view.transcript.length;
  useEffect(() => { if (correctionRevealed) scrollToHighlight(view?.correctionHighlights[0]?.location); }, [view?.revision, pane, reducedMotion, correctionRevealed]);
  // 마지막 설명 문단 말풍선: 보이는 것 중 가장 최근 문단의 칠할 곳을 지문·<보기>에 칠한다(lab `sectionMarks`와 같은 규칙).
  const sectionBubble = view?.transcript.slice(0, sequence.visibleCount).findLast(m => m.phase === 'AWAITING_UNDERSTANDING' && m.sequence === 'SECTION' && m.highlights);
  const sectionMarks = !view?.correctionHighlights.length && view?.phase === 'AWAITING_UNDERSTANDING' ? sectionBubble?.highlights ?? [] : [];
  useEffect(() => { if (sectionMarks[0]) scrollToHighlight(sectionMarks[0].location); }, [sectionBubble?.id]);
  useEffect(() => {
    if (!waiting && !pending) return;
    const timer = window.setInterval(() => setWaitClock(clock => ({ ...clock, elapsedMs: Date.now() - clock.startedAt })), 1000);
    return () => window.clearInterval(timer);
  }, [waiting, !!pending]);

  async function dispatch(command?: DiagnosticFeedbackRequest['command']) {
    if (!view || submitting.current) return;
    const request = pending ?? (command ? { transitionId: crypto.randomUUID(), expectedRevision: view.revision, command } : null);
    if (!request) return;
    previousView.current = view.phase === 'AWAITING_EVALUATION' ? previousView.current : view;
    setWaitClock(clock => ({ kind: waitingKind(request.command as FeedbackRequest['command'], clock.kind), startedAt: Date.now(), elapsedMs: 0 }));
    submitting.current = true; setBusy(true); setError(''); setPending(request);
    try {
      const received = await send(request);
      accept(received);
      // 판정이 비동기로 이어지면 서버가 진행을 알릴 때까지 제출을 유지한다(RESUME은 클라이언트 쪽에서는 끝난 것).
      if (!(received.evaluationStatus === 'PROCESSING' && request.command.type !== 'RESUME')) { setPending(null); setDraft(''); setOmit(false); }
    } catch (reason) {
      try {
        const latest = await load();
        if (latest.revision > request.expectedRevision) { accept(latest); setPending(null); setDraft(''); setOmit(false); }
        else { accept(latest); setError('제출이 끝났는지 확인하지 못했어. 같은 제출을 다시 보내도 두 번 처리되지 않아.'); }
      } catch { setError(`연결을 확인해 줘. 입력한 내용은 그대로 있어. ${reason instanceof Error ? reason.message : String(reason)}`); }
    } finally { submitting.current = false; setBusy(false); }
  }

  if (!view) return <main className="reading-workbench diag-workbench"><p role={error ? 'alert' : 'status'}>{error || '문제를 불러오는 중…'}</p></main>;
  const selection = view.phase === 'AWAITING_SELECTION' || view.phase === 'AWAITING_RESELECTION';
  const correction = view.phase === 'AWAITING_CORRECTION';
  const finished = view.phase === 'COMPLETED' || view.phase === 'ITEM_REVIEW';
  const composer = composerState(view, { choice, draft, omit, waiting, pending: !!pending, error, previousView: previousView.current, sequence, previousButtons: previousButtons.current as never });
  if (composer.actions.buttons.length && (sequence.complete || sequence.needsNext)) previousButtons.current = composer.actions.buttons;
  const buttons = composer.actions.buttons.filter(button => button.id !== 'RESTART' && button.id !== 'STRATEGY_NEXT');
  const noticeText = composer.notice.kind === 'error' ? composer.notice.text : (correction || view.phase === 'AWAITING_RESELECTION') && !omit ? composer.notice.text : '';
  const canSubmit = buttons.some(button => button.id === 'SUBMIT' && !button.disabled);
  const firstHighlight = view.correctionHighlights[0];
  const pendingCommand = pending?.command;
  const pendingText = !pendingCommand ? null : pendingCommand.type === 'CORRECT' ? pendingCommand.text
    : pendingCommand.type === 'SELECT' || pendingCommand.type === 'RATIONALE' ? `${pendingCommand.type === 'SELECT' ? `${view.question.choices.find(c => c.choiceId === pendingCommand.choiceId)?.position}번 선택\n` : ''}${pendingCommand.rationale.mode === 'PROVIDED' ? pendingCommand.rationale.text : '근거 미제출'}` : null;
  function submit() {
    if (!canSubmit) return;
    const text = toSubmittedText(draft, symbolMarks.current).trim();
    const evidence = omit ? { mode: 'OMITTED' as const } : { mode: 'PROVIDED' as const, text };
    void dispatch(correction ? { type: 'CORRECT', errorId: view!.activeErrorId!, text } : selection ? { type: 'SELECT', choiceId: choice!, rationale: evidence } : { type: 'RATIONALE', rationale: evidence });
  }
  const question = paneFromFeedback(view);
  return <main className="reading-workbench problem-lab-workbench diag-workbench" data-pane={pane}>
    <header className="workbench-header"><div className="lab-strip-lead"><h1 className="diag-header-title">{view.title} {view.questionNumber}번</h1></div></header>
    <nav className="workbench-tabs" aria-label="문제 화면 전환">{[['source', '지문'], ['problem', '문제'], ['chat', '대화']].map(([id, title]) =>
      <button key={id} aria-pressed={pane === id} onClick={() => setPane(id!)}>{title}</button>)}</nav>
    <div className="workbench-columns" ref={columns}>
      <PassagePane question={question} highlights={[...view.correctionHighlights, ...sectionMarks]} />
      <QuestionPane question={question} selectedId={choice ?? (selection ? null : view.selectedChoiceId)} enabled={view.phase === 'AWAITING_RESELECTION' && !waiting && !pending}
        onPick={setChoice} highlights={[...view.correctionHighlights, ...sectionMarks]} />
      <section className="workbench-pane chat-pane" aria-label="응답과 피드백">
        <header className="pane-header"><h2>생각을 나누는 공간</h2></header>
        <div className="chat-scroll lab-chat-scroll" ref={chat} aria-label="대화 기록">
          {view.transcript.slice(0, sequence.visibleCount).map(entry => <article className={`chat-message ${entry.role === 'STUDENT' ? 'student' : 'tutor'}${entry.kind === 'WAIT_DONE' ? ' lab-wait-done' : ''}`} key={entry.id}>
            <small>{entry.role === 'STUDENT' ? '나의 응답' : coachLabel(entry)}</small>
            {entry.kind === 'WAIT_DONE' ? <p>{entry.text}</p> : entry.role === 'COACH' ? <Markdown text={entry.text} /> : <p>{entry.text}</p>}
            {correction && firstHighlight && entry.role === 'COACH' && entry.phase === 'AWAITING_CORRECTION' && entry.id === view.transcript.at(-1)?.id && <button onClick={() => { setPane(firstHighlight.location === 'PASSAGE' ? 'source' : 'problem'); scrollToHighlight(firstHighlight.location); }}>지문에서 보기</button>}
          </article>)}
          {sequence.showDots && <article className="chat-message tutor lab-sequence-waiting" role="status" aria-label="다음 이야기 준비 중"><span className="lab-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></article>}
          {pendingText && !view.transcript.some(m => m.id === `student-${pending?.transitionId}`) && <article className="chat-message student"><small>나의 응답 · 전송 확인 중</small><p>{pendingText}</p></article>}
          {(waiting || pending) && <article className="chat-message tutor lab-waiting" role="status" aria-live="polite"><small>피드백</small>
            <p>{waitingText(waitClock.kind, waitClock.elapsedMs, pending?.transitionId ?? view.sessionId)}<span className="lab-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article>}
          {view.result?.answerRevealed && view.result.answer && <article className="lab-answer-reveal"><h3>정답 {view.result.answer.position}번</h3><p>{view.result.answer.text}</p></article>}
        </div>
        <div className="chat-footer diag-composer">
          <div className="diag-composer-top"><div role={composer.notice.kind === 'error' ? 'alert' : 'status'} className="lab-composer-notice">{noticeText}</div>
            {composer.actions.check && <button type="button" className="diag-omit" aria-pressed={omit} disabled={composer.actions.checkDisabled} onClick={() => setOmit(old => !old)}>근거 미제출</button>}</div>
          {!finished && <><label className="lab-sr-only" htmlFor="diag-feedback-response">{composer.input.label}</label>
            <textarea ref={response} id="diag-feedback-response" value={draft} disabled={composer.input.disabled} onChange={e => setDraft(e.target.value)} placeholder={composer.input.placeholder} />
            <RationaleSymbolBar value={draft} onChange={setDraft} input={response} marks={symbolMarks} disabled={composer.input.disabled} hidden={composer.input.disabled} /></>}
          <div className="diag-actions">
            {view.skippable && <button type="button" disabled={waiting || !!pending} onClick={() => void dispatch({ type: 'SKIP' })}>이 문항 건너뛰기</button>}
            {buttons.map(button => <button key={button.id} data-rationale-submit={button.id === 'SUBMIT' ? '' : undefined} className="primary" disabled={button.disabled} onClick={() => {
              if (button.id === 'SUBMIT') submit();
              else if (button.id === 'RETRY') void dispatch();
              else if (button.id === 'NEXT') setReleased(true);
              else if (button.id === 'END_YES' || button.id === 'END_NO') void dispatch({ type: 'END_START', accept: button.id === 'END_YES' });
              else if (button.id === 'UNDERSTOOD_YES' || button.id === 'UNDERSTOOD_NO') void dispatch({ type: 'UNDERSTOOD', answer: button.id === 'UNDERSTOOD_YES' });
              else void dispatch({ type: button.id } as DiagnosticFeedbackRequest['command']);
            }}>{button.label}</button>)}
            {finished && sequence.complete && <button type="button" className="primary" onClick={next}>{nextLabel}</button>}
          </div>
        </div>
      </section>
    </div>
  </main>;
}
