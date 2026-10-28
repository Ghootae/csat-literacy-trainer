import { useEffect, useRef, useState } from 'react';
import type { ExaminerStrategyView, FeedbackMediaView, FeedbackRequest, FeedbackWorkbenchView } from '../shared/problem-feedback.js';
import { getExaminerStrategy, getFeedback, markExaminerStrategyView, startFeedback, submitFeedback } from './problem-feedback-api.js';
import { FeedbackDrawer } from './FeedbackDrawer.js';
import './problem-feedback-workbench.css';
import { Markdown } from './markdown.js';
import { composerState, sequenceState, waitingKind, waitingText, type WaitingKind, type ButtonId } from './problem-composer-state.js';
import { choiceHintText, circled, currentStrategyPosition, defaultStrategyPosition, initialStrategyState, strategyLeadText, nextStrategyParagraph, openStrategy, seenStrategyPositions, strategyBubbles, strategyStage } from './examiner-strategy-state.js';
import { bubbleDelayMs } from './bubble-pacing.js';
import { AnnotatedText } from './annotated-text.js';
import { DevPartNav } from './DevPartNav.js';
import { paragraphLink, resolveReturnTo } from './dev-part-nav-links.js';
import { fetchDialoguePassages } from './api.js';
import type { DialoguePassageSummary } from '../shared/contract.js';

const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
const store = (key: string, value: string | null) => { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Server transcript remains authoritative. */ } };
function Media({ items }: { items: FeedbackMediaView[] }) {
  return <>{items.map(m => <img key={m.mediaId} src={m.url} alt="문항 원자료 시각 자료" loading="lazy" />)}</>;
}

export function ProblemLabApp(): React.JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const questionId = params.get('questionId') ?? 'information-asymmetry-free-marketplace-q13';
  const requestedReturn = params.get('returnTo') ?? '';
  const returnTo = resolveReturnTo(requestedReturn);
  const cacheKey = `csat.problem.lab.${questionId}.${returnTo}`;
  const [view, setView] = useState<FeedbackWorkbenchView | null>(null);
  const [navPassage, setNavPassage] = useState<DialoguePassageSummary | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [omit, setOmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<FeedbackRequest | null>(null);
  const [instantWaitReady, setInstantWaitReady] = useState(false);
  const [waitClock, setWaitClock] = useState({ kind: 'UNKNOWN' as WaitingKind, startedAt: Date.now(), elapsedMs: 0 });
  const previousView = useRef<FeedbackWorkbenchView | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [released, setReleased] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const sequenceSession = useRef<string | null>(null);
  const previousButtons = useRef<{ id: ButtonId; label: string; disabled: boolean }[]>([]);
  const [strategy, setStrategy] = useState<ExaminerStrategyView>({ available: false });
  const [strategyState, setStrategyState] = useState(initialStrategyState);
  const [pane, setPane] = useState('chat');
  const [drawer, setDrawer] = useState(false);
  const initialization = useRef<Promise<FeedbackWorkbenchView> | null>(null);
  const submitting = useRef(false);
  const chat = useRef<HTMLDivElement>(null);
  const sourcePanes = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const response = useRef<HTMLTextAreaElement>(null);
  const draftKey = view ? `csat.problem.lab.draft.${view.sessionId}` : '';
  function accept(next: FeedbackWorkbenchView) {
    if (sequenceSession.current !== next.sessionId) {
      sequenceSession.current = next.sessionId; setRevealed(next.transcript.length); setReleased(false); previousButtons.current = [];
      setStrategy({ available: false }); setStrategyState(initialStrategyState);
    }
    setView(next); setChoice(next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId);
    store(cacheKey, next.sessionId);
    const query = new URLSearchParams({ questionId: next.question.questionId, sessionId: next.sessionId, returnTo });
    window.history.replaceState(null, '', `/problem/lab?${query}`);
  }
  useEffect(() => {
    let active = true;
    if (!initialization.current) {
      const id = params.get('sessionId') ?? read(cacheKey);
      initialization.current = id ? getFeedback(id) : startFeedback(questionId);
    }
    void initialization.current.then(next => {
      if (!active) return;
      accept(next);
      try {
        const saved = JSON.parse(read(`csat.problem.lab.draft.${next.sessionId}`) ?? '{}') as { text?: string; choice?: string; omit?: boolean };
        setDraft(saved.text ?? ''); setChoice(saved.choice ?? (next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId)); setOmit(saved.omit ?? false);
        const request = JSON.parse(read(`csat.problem.lab.pending.${next.sessionId}`) ?? 'null') as FeedbackRequest | null;
        if (request) setWaitClock({ kind: waitingKind(request.command, 'UNKNOWN'), startedAt: Date.now(), elapsedMs: 0 });
        // RESUME carries no student text and never moves the revision, so only an in-flight RESUME is worth restoring.
        const live = request && (request.command.type === 'RESUME' ? next.evaluationStatus === 'PROCESSING' : next.evaluationStatus === 'PROCESSING' || next.revision === request.expectedRevision);
        if (request && live) setPending(request);
        else if (request) { store(`csat.problem.lab.pending.${next.sessionId}`, null); store(`csat.problem.lab.draft.${next.sessionId}`, null); setDraft(''); setOmit(false); setChoice(next.phase === 'AWAITING_RESELECTION' ? null : next.selectedChoiceId); }
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
      store(`csat.problem.lab.pending.${view.sessionId}`, null); store(draftKey, null);
    }
  }, [view?.revision, view?.evaluationStatus, pending]);
  const completedSession = view?.phase === 'COMPLETED' ? view.sessionId : null;
  useEffect(() => {
    if (!completedSession) return;
    let active = true;
    getExaminerStrategy(completedSession).then(next => { if (active) setStrategy(next); }).catch(() => { /* 전략 보기만 생략한다. */ });
    return () => { active = false; };
  }, [completedSession]);
  const waiting = busy || view?.evaluationStatus === 'PROCESSING';
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
  const stickToBottom = useRef(true);
  const hasView = !!view;
  const bottom = () => { const el = chat.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' }); };
  // New bubbles always bring the bottom into view, even when the student had scrolled up.
  useEffect(() => { stickToBottom.current = true; bottom(); }, [sequence.visibleCount, sequence.showDots, pending?.transitionId, waiting, view?.result?.answerRevealed, view?.phase, view?.transcript.length, pane, strategyState.opened.length, strategyState.opened.at(-1)?.shown]);
  // Size changes (markdown, images, composer, window) keep the bottom only if the student was near it.
  useEffect(() => {
    const el = chat.current;
    if (!el) return;
    const follow = () => { if (stickToBottom.current) bottom(); };
    const onScroll = () => { stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80; };
    const mutations = new MutationObserver(follow);
    mutations.observe(el, { childList: true, subtree: true, characterData: true });
    const sizes = new ResizeObserver(follow);
    sizes.observe(el);
    el.addEventListener('scroll', onScroll); el.addEventListener('load', follow, true);
    return () => { mutations.disconnect(); sizes.disconnect(); el.removeEventListener('scroll', onScroll); el.removeEventListener('load', follow, true); };
  }, [hasView]);
  useEffect(() => {
    if (!view || view.evaluationStatus !== 'PROCESSING' || busy) return;
    let active = true;
    const timer = window.setInterval(() => {
      void getFeedback(view.sessionId).then(next => { if (active) { accept(next); setError(''); } })
        .catch(() => { if (active) setError('서버 확인이 늦어지고 있어. 제출한 내용은 서버에서 확인한 뒤 이어서 보여 줄게.'); });
    }, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [view?.sessionId, view?.evaluationStatus, busy]);

  const firstHighlight = view?.correctionHighlights[0];
  function scrollToHighlight() {
    if (!firstHighlight) return;
    const selector = firstHighlight.location === 'PASSAGE' ? '.source-pane .lab-highlight' : '.question-pane .lab-highlight';
    const target = sourcePanes.current?.querySelector<HTMLElement>(selector);
    if (!target) return;
    // Scroll only the region that holds the highlight; the page and the other panes stay put.
    let region = target.parentElement;
    while (region && !(region.scrollHeight > region.clientHeight && /auto|scroll/.test(getComputedStyle(region).overflowY))) region = region.parentElement;
    if (!region || region === document.body || region.clientHeight === 0) return;
    const box = target.getBoundingClientRect(); const frame = region.getBoundingClientRect();
    const top = region.scrollTop + box.top - frame.top - (region.clientHeight - box.height) / 2;
    region.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  const correctionRevealed = !!view && sequence.visibleCount === view.transcript.length;
  useEffect(() => { if (correctionRevealed) scrollToHighlight(); }, [view?.sessionId, view?.revision, pane, reducedMotion, correctionRevealed]);

  const instant = view?.transcript.findLast(m => m.sequence === 'INSTANT' && !m.kind);
  const pendingInstant = pending?.command.type === 'SELECT' && pending.command.rationale.mode === 'PROVIDED';
  useEffect(() => {
    setInstantWaitReady(false);
    if (!instant || !pendingInstant) return;
    const timer = window.setTimeout(() => setInstantWaitReady(true), bubbleDelayMs(instant.text));
    return () => window.clearTimeout(timer);
  }, [instant?.id, pendingInstant]);
  useEffect(() => {
    if (!waiting && !pending) return;
    const timer = window.setInterval(() => setWaitClock(clock => ({ ...clock, elapsedMs: Date.now() - clock.startedAt })), 1000);
    return () => window.clearInterval(timer);
  }, [waiting, !!pending]);

  async function send(command?: FeedbackRequest['command']) {
    if (!view || submitting.current) return;
    const request = pending ?? (command ? { transitionId: crypto.randomUUID(), expectedRevision: view.revision, command } : null);
    if (!request) return;
    previousView.current = view.phase === 'AWAITING_EVALUATION' ? previousView.current : view;
    setWaitClock(clock => ({ kind: waitingKind(request.command, clock.kind), startedAt: Date.now(), elapsedMs: 0 }));
    submitting.current = true; setBusy(true); setError(''); setPending(request);
    store(`csat.problem.lab.pending.${view.sessionId}`, JSON.stringify(request));
    function received(next: FeedbackWorkbenchView) {
      accept(next);
      // An accepted RESUME is done from the client's side; a repeated failure must surface the RESUME button again.
      if (next.evaluationStatus === 'PROCESSING' && request!.command.type !== 'RESUME') return;
      setPending(null); setDraft(''); setOmit(false);
      store(`csat.problem.lab.pending.${view!.sessionId}`, null); store(draftKey, null);
    }
    try { received(await submitFeedback(view.sessionId, request)); }
    catch (reason) {
      try {
        const next = await getFeedback(view.sessionId);
        if (next.revision > request.expectedRevision) received(next);
        else { accept(next); setError('제출이 끝났는지 확인하지 못했어. 같은 제출을 다시 보내도 두 번 처리되지 않아.'); }
      } catch { setError(`연결을 확인해 줘. 입력한 내용은 그대로 있어. ${String(reason)}`); }
    } finally { submitting.current = false; setBusy(false); }
  }
  async function restart(confirmed = false) {
    // A finished session needs no confirmation: its record is already saved server-side.
    if (busy || (view && !confirmed && view.phase !== 'COMPLETED' && !window.confirm('기존 기록을 유지하고 새 테스트를 시작할까요?'))) return;
    setBusy(true); setError('');
    try { const next = await startFeedback(questionId); setPending(null); setDraft(''); setOmit(false); setDrawer(false); accept(next); }
    catch (reason) { setError(String(reason)); } finally { setBusy(false); }
  }
  if (!view) return <main className="reading-workbench"><h1>문제 풀이</h1>{error ? <><p role="alert">{error}</p><p>이전 풀이가 끝났거나 서버에 연결할 수 없어.</p><button onClick={() => void restart()} disabled={busy}>새 테스트 시작</button><a href={returnTo}>문단 학습으로</a></> : <p role="status">문제를 불러오는 중…</p>}</main>;
  const selection = view.phase === 'AWAITING_SELECTION' || view.phase === 'AWAITING_RESELECTION';
  const correction = view.phase === 'AWAITING_CORRECTION';
  const basePhase = (waiting || pending) && view.phase === 'AWAITING_EVALUATION' ? (previousView.current ?? view).phase : view.phase;
  const choosable = basePhase === 'AWAITING_SELECTION' || basePhase === 'AWAITING_RESELECTION' || basePhase === 'AWAITING_RATIONALE';
  const strategyChoices = strategy.available ? strategy.choices : [];
  const strategyStageNow = strategy.available && sequence.complete ? strategyStage(strategyState, strategyChoices) : null;
  const strategyPosition = strategyStageNow ? currentStrategyPosition(strategyState) : null;
  const seenPositions = strategyStageNow ? seenStrategyPositions(strategyState, strategyStageNow) : [];
  const solving = basePhase === 'AWAITING_SELECTION' || basePhase === 'AWAITING_RESELECTION';
  function openStrategyChoice(position: number) {
    if (!view || !strategy.available) return;
    setStrategyState(openStrategy(strategyState, position, strategy.choices));
    void markExaminerStrategyView(view.sessionId, position).catch(() => { /* 사용 기록 실패가 화면을 막지 않는다. */ });
  }
  const composer = composerState(view, { strategy: strategyStageNow ? { stage: strategyStageNow, position: strategyPosition } : undefined, choice, draft, omit, waiting, pending: !!pending, error, previousView: previousView.current, sequence, previousButtons: previousButtons.current });
  if (composer.actions.buttons.length && (sequence.complete || sequence.needsNext)) previousButtons.current = composer.actions.buttons;
  const options = view.question.choices.map(c => {
    const pressed = composer.choices.find(x => x.choiceId === c.choiceId)!;
    if (view.phase === 'COMPLETED') {
      const has = strategyChoices.some(s => s.position === c.position);
      const reading = strategyStageNow === 'READING' && c.position === strategyPosition;
      return { choice: c, enabled: has && !!strategyStageNow && !waiting, selected: reading, dim: strategy.available && !has, tag: reading ? '전략 보는 중' : seenPositions.includes(c.position) ? '봤음' : '' };
    }
    const selected = choice === c.choiceId;
    return { choice: c, enabled: !pressed.disabled, selected, dim: false, tag: choosable && selected ? '고름' : '' };
  });
  const focusTarget = (options.find(o => o.enabled && o.selected) ?? options.find(o => o.enabled))?.choice.choiceId;
  function pickChoice(c: { choiceId: string; position: number }) {
    if (view!.phase === 'COMPLETED') openStrategyChoice(c.position); else setChoice(c.choiceId);
  }
  function changeChoice() {
    if (window.matchMedia('(max-width: 900px)').matches) { setPane('problem'); return; }
    const target = sourcePanes.current?.querySelector<HTMLElement>('.lab-choices li[data-selected=true]');
    target?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' }); target?.focus({ preventScroll: true });
  }
  const canSubmit = composer.actions.buttons.some(button => button.id === 'SUBMIT' && !button.disabled);
  const pendingCommand = pending?.command;
  const pendingText = !pendingCommand || pendingCommand.type === 'RESUME' ? null : pendingCommand.type === 'RESELECT' || pendingCommand.type === 'REQUEST_EXPLANATION' || pendingCommand.type === 'FINISH' || pendingCommand.type === 'END_START' || pendingCommand.type === 'UNDERSTOOD' ? null : pendingCommand.type === 'CORRECT' ? pendingCommand.text
    : `${pendingCommand.type === 'SELECT' ? `${view.question.choices.find(c => c.choiceId === pendingCommand.choiceId)?.position}번 선택\n` : ''}${pendingCommand.rationale.mode === 'PROVIDED' ? pendingCommand.rationale.text : '근거 미제출'}`;
  function submit() {
    if (!canSubmit) return;
    const evidence = omit ? { mode: 'OMITTED' as const } : { mode: 'PROVIDED' as const, text: draft.trim() };
    void send(correction ? { type: 'CORRECT', errorId: view!.activeErrorId!, text: draft.trim() } : selection ? { type: 'SELECT', choiceId: choice!, rationale: evidence } : { type: 'RATIONALE', rationale: evidence });
  }
  return <main className="reading-workbench is-developer problem-lab-workbench" data-pane={pane}>
    <header className="workbench-header"><div className="lab-strip-lead"><p className="dialogue-kicker">COGAXIS / PERSONAL LAB</p><p className="developer-notice" title="문제 풀이 개발자 테스트 · 평가 서랍에 내부 판정이 공개됩니다. 실제 포인트는 차감하지 않습니다.">문제 풀이 개발자 테스트 · 평가 서랍에 내부 판정이 공개됩니다. 실제 포인트는 차감하지 않습니다.</p></div>
      <div className="workbench-actions"><span>선택 {view.selectionCount} / {view.maxSelections}</span><button ref={trigger} aria-haspopup="dialog" aria-expanded={drawer} onClick={() => setDrawer(true)}>응답 평가</button><a href={returnTo}>학습 맵</a><button disabled={waiting} onClick={() => void restart()}>새 테스트</button></div></header>
    <nav className="workbench-tabs" aria-label="문제 화면 전환">{[['source', '지문'], ['problem', '문제'], ['chat', '대화']].map(([id, title]) => <button key={id} aria-pressed={pane === id} onClick={() => setPane(id!)}>{title}</button>)}</nav>
    <div className="workbench-columns" ref={sourcePanes}>
      <section className="workbench-pane source-pane" aria-label="전체 지문"><header className="pane-header source-head"><div className="source-title"><h1 title={view.title}>{view.title}</h1><small>{view.exam}</small></div>{navPassage && <DevPartNav currentParagraph={null} currentIsProblem problem={{ onSelect: () => {} }}
            paragraphs={Array.from({ length: navPassage.paragraphCount }, (_, i) => ({ label: `문단 ${i + 1}`, onSelect: () => window.location.assign(paragraphLink(returnTo, navPassage.passageId, i)) }))} />}</header><div className="source-scroll"><AnnotatedText text={view.question.passageText} annotations={view.question.textAnnotations.filter(a => a.location === 'PASSAGE')} highlights={view.correctionHighlights.filter(a => a.location === 'PASSAGE')} /><Media items={view.question.media.filter(m => m.placement.scope === 'PASSAGE')} /></div></section>
      <section className="workbench-pane question-pane" aria-label="문제와 선지"><header className="pane-header question-head"><h2>문제 {view.questionNumber}</h2><h3>{view.question.stem}</h3></header><div className="lab-question-scroll"><p className="lab-choice-hint">{choiceHintText(solving, strategyStageNow, strategyChoices.length)}</p>{(view.question.scenarioText || view.question.media.some(m => m.placement.scope === 'SCENARIO')) && <section className="lab-scenario"><h4>보기</h4><AnnotatedText text={view.question.scenarioText} annotations={view.question.textAnnotations.filter(a => a.location === 'SCENARIO')} highlights={view.correctionHighlights.filter(a => a.location === 'SCENARIO')} /><Media items={view.question.media.filter(m => m.placement.scope === 'SCENARIO')} /></section>}
        <div className="lab-choices-scroll"><ol className="lab-choices" role="radiogroup" aria-label="선지">{options.map(o => <li key={o.choice.choiceId} role="radio" aria-checked={o.selected} aria-disabled={!o.enabled} aria-label={`${circled(o.choice.position)}번 선지`} aria-describedby={`lab-choice-text-${o.choice.position}`} tabIndex={o.choice.choiceId === focusTarget ? 0 : -1} data-selected={o.selected} data-dim={o.dim}
          onClick={() => { if (o.enabled) pickChoice(o.choice); }}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (o.enabled) pickChoice(o.choice); return; }
            const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const items = Array.from(e.currentTarget.parentElement!.querySelectorAll<HTMLElement>('[role=radio]:not([aria-disabled=true])'));
            const at = items.indexOf(e.currentTarget);
            items[(at + step + items.length) % items.length]?.focus();
          }}><span>{o.choice.position}</span><div><p id={`lab-choice-text-${o.choice.position}`}>{o.choice.text}{o.tag && <em className={`lab-choice-tag${o.tag === '봤음' ? ' is-seen' : ''}`}>{o.tag}</em>}</p><Media items={view.question.media.filter(m => m.placement.scope === 'CHOICE' && m.placement.choiceId === o.choice.choiceId)} /></div></li>)}</ol></div></div></section>
      <section className="workbench-pane chat-pane" aria-label="응답과 피드백"><header className="pane-header"><h2>생각을 나누는 공간</h2><small>{view.phase === 'COMPLETED' ? '풀이 완료' : correction ? '생각 다시 살피기' : view.phase === 'AWAITING_RESELECTION' ? '마지막 선택' : '선택과 근거'}</small></header>
        <div className="chat-scroll lab-chat-scroll" ref={chat} aria-label="대화 기록">{view.transcript.slice(0, sequence.visibleCount).map(entry => <article className={`chat-message ${entry.role === 'STUDENT' ? 'student' : 'tutor'}${entry.kind === 'WAIT_DONE' ? ' lab-wait-done' : ''}`} key={entry.id}><small>{entry.role === 'STUDENT' ? '나의 응답' : entry.kind !== 'WAIT_DONE' && entry.phase === 'AWAITING_CORRECTION' ? '함께 확인하기' : '피드백'}</small>{entry.kind === 'WAIT_DONE' ? <p>{entry.text}</p> : entry.role === 'COACH' ? <Markdown text={entry.text} /> : <p>{entry.text}</p>}{correction && firstHighlight && entry.role === 'COACH' && entry.phase === 'AWAITING_CORRECTION' && entry.id === view.transcript.at(-1)?.id && <button onClick={() => { setPane(firstHighlight.location === 'PASSAGE' ? 'source' : 'problem'); scrollToHighlight(); }}>지문에서 보기</button>}</article>)}
          {sequence.showDots && <article className="chat-message tutor lab-sequence-waiting" role="status" aria-label="다음 이야기 준비 중"><span className="lab-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></article>}
          {pendingText && !view.transcript.some(m => m.id === `student-${pending?.transitionId}`) && <article className="chat-message student"><small>나의 응답 · 전송 확인 중</small><p>{pendingText}</p></article>}
          {(waiting || pending) && (!pendingInstant || (instant?.id === `instant-${pending?.transitionId}` && instantWaitReady)) && <article className="chat-message tutor lab-waiting" role="status" aria-live="polite"><small>피드백</small><p>{waitingText(waitClock.kind, waitClock.elapsedMs, pending?.transitionId ?? view.sessionId)}<span className="lab-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article>}
          {view.result?.answerRevealed && view.result.answer && <article className="lab-answer-reveal"><h3>정답 {view.result.answer.position}번</h3><p>{view.result.answer.text}</p></article>}
          {view.phase === 'COMPLETED' && view.transcript.filter(m => m.role === 'COACH').at(-1)?.sequence !== 'CLOSING' && <p className="lab-terminal">이 문제 풀이는 여기까지야.</p>}
          {strategyStageNow && <article className="chat-message tutor"><small>피드백</small><p>{strategy.available ? strategyLeadText(strategy.stemPolarity) : ''}</p></article>}
          {strategyStageNow && strategyBubbles(strategyState, strategyChoices).map(b => <article className="chat-message tutor" key={b.key}><small>{b.label}</small>{b.end ? <p>{b.text}</p> : <Markdown text={b.text} />}</article>)}
        </div>
        <div className="chat-footer lab-composer">
          <div className="lab-composer-top"><div className="lab-composer-notice" role={composer.notice.kind === 'error' ? 'alert' : 'status'} title={composer.notice.text || undefined}>{composer.notice.text || composer.status.text}{!composer.notice.text && composer.status.canChange && <button type="button" className="lab-change-choice" onClick={changeChoice}>문제에서 바꾸기</button>}</div>
            <label className="lab-omit"><input type="checkbox" checked={composer.actions.check ? omit : false} disabled={!composer.actions.check || composer.actions.checkDisabled} onChange={e => setOmit(e.target.checked)} />{composer.actions.check ?? '정답만 입력'}</label></div>
          <div className="lab-composer-input"><label className="lab-sr-only" htmlFor="lab-response">{composer.input.label}</label><textarea ref={response} id="lab-response" value={draft} disabled={composer.input.disabled} onChange={e => setDraft(e.target.value)} placeholder={composer.input.placeholder} /></div>
          <div className="lab-compose-actions"><div className="lab-primary-actions">{composer.actions.buttons.map(button => <button key={button.id} className={button.id === 'RESTART' ? undefined : 'primary'} disabled={button.disabled} onClick={() => {
            if (button.id === 'SUBMIT') submit();
            else if (button.id === 'RETRY') void send();
            else if (button.id === 'RESTART') void restart(true);
            else if (button.id === 'NEXT') setReleased(true);
            else if (button.id === 'STRATEGY_OPEN') { if (strategy.available) { const position = defaultStrategyPosition(strategyState, strategy.choices, view.question.choices.find(c => c.choiceId === view.selectedChoiceId)?.position ?? null); if (position !== null) openStrategyChoice(position); } }
            else if (button.id === 'STRATEGY_NEXT') { if (strategy.available) setStrategyState(nextStrategyParagraph(strategyState, strategy.choices)); }
            else if (button.id === 'END_YES' || button.id === 'END_NO') void send({ type: 'END_START', accept: button.id === 'END_YES' });
            else if (button.id === 'UNDERSTOOD_YES' || button.id === 'UNDERSTOOD_NO') void send({ type: 'UNDERSTOOD', answer: button.id === 'UNDERSTOOD_YES' });
            else void send({ type: button.id });
          }}>{button.label}</button>)}</div></div>
        </div>
      </section>
    </div>
    {drawer && <FeedbackDrawer view={view} close={() => { setDrawer(false); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </main>;
}
