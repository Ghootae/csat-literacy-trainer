import { useEffect, useRef, useState } from 'react';
import type { FeedbackV4MediaView, FeedbackV4Request, FeedbackV4WorkbenchView } from '../shared/problem-feedback-v4.js';
import { getFeedbackV4, startFeedbackV4, submitFeedbackV4 } from './problem-feedback-v4-api.js';
import { FeedbackV4Drawer } from './FeedbackV4Drawer.js';
import './problem-feedback-workbench.css';
import { Markdown } from './markdown.js';
import { composerState, sequenceState, instantWaitingDelay, waitingKind, waitingText, type WaitingKind, type ButtonId } from './v4-composer-state.js';
import { AnnotatedText } from './annotated-text.js';
import { DevPartNav } from './DevPartNav.js';
import { paragraphLink, resolveReturnTo } from './dev-part-nav-links.js';
import { fetchDialoguePassages } from './api.js';
import type { DialoguePassageSummary } from '../shared/contract.js';

const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
const store = (key: string, value: string | null) => { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Server transcript remains authoritative. */ } };
function Media({ items }: { items: FeedbackV4MediaView[] }) {
  return <>{items.map(m => <img key={m.mediaId} src={m.url} alt="문항 원자료 시각 자료" loading="lazy" />)}</>;
}

export function ProblemFeedbackV4App(): React.JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const questionId = params.get('questionId') ?? 'information-asymmetry-free-marketplace-q13';
  const requestedReturn = params.get('returnTo') ?? '';
  const returnTo = resolveReturnTo(requestedReturn);
  const cacheKey = `csat.problem.v4.${questionId}.${returnTo}`;
  const [view, setView] = useState<FeedbackV4WorkbenchView | null>(null);
  const [navPassage, setNavPassage] = useState<DialoguePassageSummary | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [omit, setOmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<FeedbackV4Request | null>(null);
  const [instantWaitReady, setInstantWaitReady] = useState(false);
  const [waitClock, setWaitClock] = useState({ kind: 'UNKNOWN' as WaitingKind, startedAt: Date.now(), elapsedMs: 0 });
  const previousView = useRef<FeedbackV4WorkbenchView | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [released, setReleased] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sequenceSession = useRef<string | null>(null);
  const previousButtons = useRef<{ id: ButtonId; label: string; disabled: boolean }[]>([]);
  const [pane, setPane] = useState('chat');
  const [drawer, setDrawer] = useState(false);
  const initialization = useRef<Promise<FeedbackV4WorkbenchView> | null>(null);
  const submitting = useRef(false);
  const chat = useRef<HTMLDivElement>(null);
  const sourcePanes = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const response = useRef<HTMLTextAreaElement>(null);
  const draftKey = view ? `csat.problem.v4.draft.${view.sessionId}` : '';
  function accept(next: FeedbackV4WorkbenchView) {
    if (sequenceSession.current !== next.sessionId) {
      sequenceSession.current = next.sessionId; setRevealed(next.transcript.length); setReleased(false); previousButtons.current = [];
    }
    setView(next); setChoice(next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId);
    store(cacheKey, next.sessionId);
    const query = new URLSearchParams({ questionId: next.question.questionId, sessionId: next.sessionId, returnTo });
    window.history.replaceState(null, '', `/problem/dev/v4?${query}`);
  }
  useEffect(() => {
    let active = true;
    if (!initialization.current) {
      const id = params.get('sessionId') ?? read(cacheKey);
      initialization.current = id ? getFeedbackV4(id) : startFeedbackV4(questionId);
    }
    void initialization.current.then(next => {
      if (!active) return;
      accept(next);
      try {
        const saved = JSON.parse(read(`csat.problem.v4.draft.${next.sessionId}`) ?? '{}') as { text?: string; choice?: string; omit?: boolean };
        setDraft(saved.text ?? ''); setChoice(saved.choice ?? (next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId)); setOmit(saved.omit ?? false);
        const request = JSON.parse(read(`csat.problem.v4.pending.${next.sessionId}`) ?? 'null') as FeedbackV4Request | null;
        if (request) setWaitClock({ kind: waitingKind(request.command, 'UNKNOWN'), startedAt: Date.now(), elapsedMs: 0 });
        // RESUME carries no student text and never moves the revision, so only an in-flight RESUME is worth restoring.
        const live = request && (request.command.type === 'RESUME' ? next.evaluationStatus === 'PROCESSING' : next.evaluationStatus === 'PROCESSING' || next.revision === request.expectedRevision);
        if (request && live) setPending(request);
        else if (request) { store(`csat.problem.v4.pending.${next.sessionId}`, null); store(`csat.problem.v4.draft.${next.sessionId}`, null); setDraft(''); setOmit(false); setChoice(next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId); }
      } catch { /* A malformed local draft cannot change server state. */ }
    }).catch((reason: unknown) => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    fetchDialoguePassages().then(list => { if (active) setNavPassage(list.find(p => p.problemQuestionId === questionId) ?? null); }).catch(() => { /* 막대만 생략한다. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (draftKey) store(draftKey, JSON.stringify({ text: draft, choice, omit }));
  }, [draftKey, draft, choice, omit]);
  useEffect(() => {
    if (view && pending && view.evaluationStatus !== 'PROCESSING' && view.revision > pending.expectedRevision) {
      setPending(null); setDraft(''); setOmit(false);
      store(`csat.problem.v4.pending.${view.sessionId}`, null); store(draftKey, null);
    }
  }, [view?.revision, view?.evaluationStatus, pending]);
  const sequence = sequenceState(view?.transcript ?? [], revealed, reducedMotion, released);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (sequence.visibleCount !== revealed) { setRevealed(sequence.visibleCount); setReleased(false); }
    if (sequence.delayMs === null) return;
    const timer = window.setTimeout(() => { setRevealed(sequence.visibleCount + 1); setReleased(false); }, sequence.delayMs);
    return () => window.clearTimeout(timer);
  }, [view?.sessionId, view?.transcript.length, revealed, reducedMotion, released, sequence.visibleCount, sequence.delayMs]);
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: 'auto' }); }, [sequence.visibleCount, sequence.showDots, pending]);
  useEffect(() => {
    if (!view || view.evaluationStatus !== 'PROCESSING' || busy) return;
    let active = true;
    const timer = window.setInterval(() => {
      void getFeedbackV4(view.sessionId).then(next => { if (active) { accept(next); setError(''); } })
        .catch(() => { if (active) setError('서버 확인이 늦어지고 있어. 제출한 내용은 서버에서 확인한 뒤 이어서 보여 줄게.'); });
    }, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [view?.sessionId, view?.evaluationStatus, busy]);

  const firstHighlight = view?.correctionHighlights[0];
  function scrollToHighlight() {
    if (!firstHighlight) return;
    const selector = firstHighlight.location === 'PASSAGE' ? '.source-pane .v4-highlight' : '.question-pane .v4-highlight';
    sourcePanes.current?.querySelector(selector)?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
  }
  useEffect(() => { scrollToHighlight(); }, [view?.sessionId, view?.revision, pane, reducedMotion]);

  const instant = view?.transcript.findLast(m => m.sequence === 'INSTANT');
  const pendingInstant = pending?.command.type === 'SELECT' && pending.command.rationale.mode === 'PROVIDED';
  useEffect(() => {
    setInstantWaitReady(false);
    if (!instant || !pendingInstant) return;
    const timer = window.setTimeout(() => setInstantWaitReady(true), instantWaitingDelay(reducedMotion));
    return () => window.clearTimeout(timer);
  }, [instant?.id, pendingInstant, reducedMotion]);
  const waiting = busy || view?.evaluationStatus === 'PROCESSING';
  useEffect(() => {
    if (!waiting && !pending) return;
    const timer = window.setInterval(() => setWaitClock(clock => ({ ...clock, elapsedMs: Date.now() - clock.startedAt })), 1000);
    return () => window.clearInterval(timer);
  }, [waiting, !!pending]);

  async function send(command?: FeedbackV4Request['command']) {
    if (!view || submitting.current) return;
    const request = pending ?? (command ? { transitionId: crypto.randomUUID(), expectedRevision: view.revision, command } : null);
    if (!request) return;
    previousView.current = view.phase === 'AWAITING_EVALUATION' ? previousView.current : view;
    setWaitClock(clock => ({ kind: waitingKind(request.command, clock.kind), startedAt: Date.now(), elapsedMs: 0 }));
    submitting.current = true; setBusy(true); setError(''); setPending(request);
    store(`csat.problem.v4.pending.${view.sessionId}`, JSON.stringify(request));
    function received(next: FeedbackV4WorkbenchView) {
      accept(next);
      // An accepted RESUME is done from the client's side; a repeated failure must surface the RESUME button again.
      if (next.evaluationStatus === 'PROCESSING' && request!.command.type !== 'RESUME') return;
      setPending(null); setDraft(''); setOmit(false);
      store(`csat.problem.v4.pending.${view!.sessionId}`, null); store(draftKey, null);
    }
    try { received(await submitFeedbackV4(view.sessionId, request)); }
    catch (reason) {
      try {
        const next = await getFeedbackV4(view.sessionId);
        if (next.revision > request.expectedRevision) received(next);
        else { accept(next); setError('제출이 끝났는지 확인하지 못했어. 같은 제출을 다시 보내도 두 번 처리되지 않아.'); }
      } catch { setError(`연결을 확인해 줘. 입력한 내용은 그대로 있어. ${String(reason)}`); }
    } finally { submitting.current = false; setBusy(false); }
  }
  async function restart(confirmed = false) {
    // A finished session needs no confirmation: its record is already saved server-side.
    if (busy || (view && !confirmed && view.phase !== 'COMPLETED' && !window.confirm('기존 기록을 유지하고 새 테스트를 시작할까요?'))) return;
    setBusy(true); setError('');
    try { const next = await startFeedbackV4(questionId); setPending(null); setDraft(''); setOmit(false); setDrawer(false); accept(next); }
    catch (reason) { setError(String(reason)); } finally { setBusy(false); }
  }
  if (!view) return <main className="reading-workbench"><h1>문제 풀이</h1>{error ? <><p role="alert">{error}</p><p>이전 풀이가 끝났거나 서버에 연결할 수 없어.</p><button onClick={() => void restart()} disabled={busy}>새 테스트 시작</button><a href={returnTo}>문단 학습으로</a></> : <p role="status">문제를 불러오는 중…</p>}</main>;
  const selection = view.phase === 'AWAITING_SELECTION' || view.phase === 'AWAITING_RESELECTION';
  const correction = view.phase === 'AWAITING_CORRECTION';
  const composer = composerState(view, { choice, draft, omit, waiting, pending: !!pending, error, previousView: previousView.current, sequence, previousButtons: previousButtons.current });
  if (composer.actions.buttons.length && (sequence.complete || sequence.needsNext)) previousButtons.current = composer.actions.buttons;
  const canSubmit = composer.actions.buttons.some(button => button.id === 'SUBMIT' && !button.disabled);
  const pendingCommand = pending?.command;
  const pendingText = !pendingCommand || pendingCommand.type === 'RESUME' ? null : pendingCommand.type === 'RESELECT' || pendingCommand.type === 'REQUEST_EXPLANATION' || pendingCommand.type === 'FINISH' || pendingCommand.type === 'END_START' || pendingCommand.type === 'UNDERSTOOD' ? null : pendingCommand.type === 'CORRECT' ? pendingCommand.text
    : `${pendingCommand.type === 'SELECT' ? `${view.question.choices.find(c => c.choiceId === pendingCommand.choiceId)?.position}번 선택\n` : ''}${pendingCommand.rationale.mode === 'PROVIDED' ? pendingCommand.rationale.text : '근거 미제출'}`;
  function submit() {
    if (!canSubmit) return;
    const evidence = omit ? { mode: 'OMITTED' as const } : { mode: 'PROVIDED' as const, text: draft.trim() };
    void send(correction ? { type: 'CORRECT', errorId: view!.activeErrorId!, text: draft.trim() } : selection ? { type: 'SELECT', choiceId: choice!, rationale: evidence } : { type: 'RATIONALE', rationale: evidence });
  }
  return <main className="reading-workbench is-developer problem-v4-workbench" data-pane={pane}>
    <header className="workbench-header"><div><p className="dialogue-kicker">COGAXIS / PERSONAL LAB</p><h1>{view.title} <span>· {view.questionNumber}번</span></h1></div>
      <div className="workbench-actions"><span>선택 {view.selectionCount} / 2</span><button ref={trigger} aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}>응답 평가</button><a href={returnTo}>학습 맵</a><button disabled={waiting} onClick={() => void restart()}>새 테스트</button></div></header>
    {navPassage && <DevPartNav currentParagraph={null} currentIsProblem problem={{ onSelect: () => {} }}
      paragraphs={Array.from({ length: navPassage.paragraphCount }, (_, i) => ({ label: `문단 ${i + 1}`, onSelect: () => window.location.assign(paragraphLink(returnTo, navPassage.passageId, i)) }))} />}
    <p className="developer-notice">문제 풀이 v4 · 개발자 테스트 · 평가 서랍에 내부 판정이 공개됩니다. 실제 포인트는 차감하지 않습니다.</p>
    <nav className="workbench-tabs" aria-label="문제 화면 전환">{[['source', '지문'], ['problem', '문제'], ['chat', '대화']].map(([id, title]) => <button key={id} aria-pressed={pane === id} onClick={() => setPane(id!)}>{title}</button>)}</nav>
    <div className="workbench-columns" ref={sourcePanes}>
      <section className="workbench-pane source-pane" aria-label="전체 지문"><header className="pane-header"><h2>전체 지문</h2><small>{view.exam}</small></header><div className="source-scroll"><AnnotatedText text={view.question.passageText} annotations={view.question.textAnnotations.filter(a => a.location === 'PASSAGE')} highlights={view.correctionHighlights.filter(a => a.location === 'PASSAGE')} /><Media items={view.question.media.filter(m => m.placement.scope === 'PASSAGE')} /></div></section>
      <section className="workbench-pane question-pane" aria-label="문제와 선지"><header className="pane-header"><h2>문제 {view.questionNumber}</h2><small>읽고, 오른쪽에서 골라 줘</small></header><div className="v4-question-scroll"><h3>{view.question.stem}</h3>{(view.question.scenarioText || view.question.media.some(m => m.placement.scope === 'SCENARIO')) && <section className="v4-scenario"><h4>보기</h4><AnnotatedText text={view.question.scenarioText} annotations={view.question.textAnnotations.filter(a => a.location === 'SCENARIO')} highlights={view.correctionHighlights.filter(a => a.location === 'SCENARIO')} /><Media items={view.question.media.filter(m => m.placement.scope === 'SCENARIO')} /></section>}
        <ol className="v4-choices">{view.question.choices.map(c => <li key={c.choiceId} data-selected={choice === c.choiceId}><span>{c.position}</span><div><p>{c.text}</p><Media items={view.question.media.filter(m => m.placement.scope === 'CHOICE' && m.placement.choiceId === c.choiceId)} /></div></li>)}</ol></div></section>
      <section className="workbench-pane chat-pane" aria-label="응답과 피드백"><header className="pane-header"><h2>생각을 나누는 공간</h2><small>{view.phase === 'COMPLETED' ? '풀이 완료' : correction ? '생각 다시 살피기' : view.phase === 'AWAITING_RESELECTION' ? '마지막 선택' : '선택과 근거'}</small></header>
        <div className="chat-scroll v4-chat-scroll" ref={chat} aria-label="대화 기록">{view.transcript.slice(0, sequence.visibleCount).map(entry => <article className={`chat-message ${entry.role === 'STUDENT' ? 'student' : 'tutor'}`} key={entry.id}><small>{entry.role === 'STUDENT' ? '나의 응답' : entry.phase === 'AWAITING_CORRECTION' ? '함께 확인하기' : '피드백'}</small>{entry.role === 'COACH' ? <Markdown text={entry.text} /> : <p>{entry.text}</p>}{correction && firstHighlight && entry.role === 'COACH' && entry.phase === 'AWAITING_CORRECTION' && entry.id === view.transcript.at(-1)?.id && <button onClick={() => { setPane(firstHighlight.location === 'PASSAGE' ? 'source' : 'problem'); scrollToHighlight(); }}>지문에서 보기</button>}</article>)}
          {sequence.showDots && <article className="chat-message tutor v4-sequence-waiting" role="status" aria-label="다음 이야기 준비 중"><span className="v4-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></article>}
          {pendingText && !view.transcript.some(m => m.id === `student-${pending?.transitionId}`) && <article className="chat-message student"><small>나의 응답 · 전송 확인 중</small><p>{pendingText}</p></article>}
          {(waiting || pending) && (!pendingInstant || (instant?.id === `instant-${pending?.transitionId}` && (reducedMotion || instantWaitReady))) && <article className="chat-message tutor v4-waiting" role="status" aria-live="polite"><small>피드백</small><p>{waitingText(waitClock.kind, waitClock.elapsedMs)}<span className="v4-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article>}
          {view.result?.answerRevealed && view.result.answer && <article className="v4-answer-reveal"><h3>정답 {view.result.answer.position}번</h3><p>{view.result.answer.text}</p></article>}
          {view.phase === 'COMPLETED' && view.transcript.filter(m => m.role === 'COACH').at(-1)?.sequence !== 'CLOSING' && <p className="v4-terminal">이 문제 풀이는 여기까지야.</p>}
        </div>
        <div className="chat-footer v4-composer">
          <div className="v4-composer-notice" role={composer.notice.kind === 'error' ? 'alert' : 'status'}>{composer.notice.text}</div>
          <fieldset className="v4-choice-buttons"><legend>선지 선택</legend>{composer.choices.map(c => <button type="button" key={c.choiceId} disabled={c.disabled} aria-label={`${c.position}번 선택`} aria-pressed={c.pressed} onClick={() => { setChoice(c.choiceId); response.current?.focus(); }}>{c.position}</button>)}</fieldset>
          <div className="v4-composer-input"><label htmlFor="v4-response">{composer.input.label}</label><textarea ref={response} id="v4-response" value={draft} disabled={composer.input.disabled} onChange={e => setDraft(e.target.value)} placeholder={composer.input.placeholder} /></div>
          <div className="v4-compose-actions"><div>{composer.actions.check && <label className="v4-omit"><input type="checkbox" checked={omit} disabled={composer.actions.checkDisabled} onChange={e => setOmit(e.target.checked)} />{composer.actions.check}</label>}</div><div className="v4-primary-actions">{composer.actions.buttons.map(button => button.id === 'RETURN' ? <a key={button.id} className="v4-return" href={button.disabled ? undefined : returnTo} aria-disabled={button.disabled}>{button.label}</a> : <button key={button.id} className="primary" disabled={button.disabled} onClick={() => {
            if (button.id === 'SUBMIT') submit();
            else if (button.id === 'RETRY') void send();
            else if (button.id === 'RESTART') void restart(true);
            else if (button.id === 'NEXT') setReleased(true);
            else if (button.id === 'END_YES' || button.id === 'END_NO') void send({ type: 'END_START', accept: button.id === 'END_YES' });
            else if (button.id === 'UNDERSTOOD_YES' || button.id === 'UNDERSTOOD_NO') void send({ type: 'UNDERSTOOD', answer: button.id === 'UNDERSTOOD_YES' });
            else if (button.id !== 'RETURN') void send({ type: button.id });
          }}>{button.label}</button>)}</div></div>
        </div>
      </section>
    </div>
    {drawer && <FeedbackV4Drawer view={view} close={() => { setDrawer(false); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </main>;
}
