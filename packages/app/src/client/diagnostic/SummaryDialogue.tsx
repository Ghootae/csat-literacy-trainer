/** 요약 대화 화면(인계 B (4)). `SimpleDialogueApp`의 대화 표시를 떼어 쓴다(기존 화면은 그대로 둔다). 개발자 서랍·메모·새 시도는 없다. */
import { useEffect, useRef, useState } from 'react';
import { simpleStudentLabel, type SimpleDialogueView, type SimpleStage } from '../../shared/dialogue-simple.js';
import { AnnotatedText } from '../annotated-text.js';
import { bubbleDelayMs } from '../bubble-pacing.js';
import { RationaleSymbolBar } from '../RationaleSymbolBar.js';
import { RestatedSummary } from '../RestatedSummary.js';
import { toSubmittedText, type SymbolMark } from '../rationale-tools.js';
import { simpleWaitingText } from '../simple-waiting.js';
import { SimpleBubble } from '../SimpleDialogueDrawer.js';
import '../simple-dialogue.css';

export function SummaryDialogue({ view, busy, error, respond, go, finish, readOnly = false }: {
  view: SimpleDialogueView; busy: boolean; error: string;
  respond: (body: { transitionId: string; paragraphIndex: number; text: string }) => Promise<SimpleDialogueView>;
  go: (index: number) => void; finish: () => void;
  /** 개발자 이동으로 돌아온 화면(D-0217): 입력·마침 버튼 없이 대화 기록만 보인다. */
  readOnly?: boolean;
}): React.JSX.Element {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [mobilePane, setMobilePane] = useState('chat');
  const [pending, setPending] = useState<{ text: string; stage: SimpleStage; startedAt: number; transitionId: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reveal, setReveal] = useState({ key: '', count: 0 });
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const responseBox = useRef<HTMLTextAreaElement>(null);
  const symbolMarks = useRef<SymbolMark[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);
  const { current } = view;
  useEffect(() => { symbolMarks.current = []; }, [current.index]);
  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  // 새로 받은 메시지만 하나씩 보인다. 복원된 메시지는 한 번에 보인다. 학생 발화와 마무리 말풍선은 바로 보인다.
  const messages = current.messages;
  const revealKey = `${view.sessionId}:${current.index}:${current.attemptNumber}`;
  let visible = reveal.key === revealKey ? Math.min(reveal.count, messages.length) : messages.length;
  while (visible < messages.length && (messages[visible]!.role === 'student' || messages[visible]!.kind === 'WAIT_DONE')) visible++;
  const sequenceDone = visible === messages.length;
  const sequenceDelay = sequenceDone ? null : bubbleDelayMs(messages[visible - 1]?.text ?? '');
  useEffect(() => {
    if (reveal.key !== revealKey || reveal.count !== visible) setReveal({ key: revealKey, count: visible });
    if (sequenceDelay === null) return;
    const timer = window.setTimeout(() => setReveal({ key: revealKey, count: visible + 1 }), sequenceDelay);
    return () => window.clearTimeout(timer);
  }, [revealKey, visible, sequenceDelay]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [visible, messages.length, busy, pending]);

  const draft = drafts[current.index] ?? '';
  const failed = current.evaluationStatus === 'RETRYABLE_ERROR';
  const last = current.index + 1 >= view.paragraphs.length;
  const locked = busy || !current.canRespond || !sequenceDone;
  const submit = () => {
    const text = toSubmittedText(draft, symbolMarks.current).trim();
    if (!text || locked) return;
    const transitionId = crypto.randomUUID();
    setPending({ text, stage: current.stage, startedAt: Date.now(), transitionId });
    void respond({ transitionId, paragraphIndex: current.index, text })
      .then(next => { if (next.current.evaluationStatus !== 'RETRYABLE_ERROR') setDrafts(old => ({ ...old, [current.index]: '' })); })
      .catch(() => { /* 오류는 부모가 보여 주고 입력은 그대로 둔다 */ })
      .finally(() => setPending(null));
  };
  return <main className="reading-workbench simple-workbench diag-workbench" data-pane={mobilePane}>
    <header className="workbench-header"><div className="simple-strip-lead"><h1 className="diag-header-title">{view.title}</h1></div>
      <div className="workbench-actions"><span>문단 {current.index + 1} / {view.paragraphs.length}</span>
        {!readOnly && <button className="primary" disabled={busy} onClick={finish}>요약 마치고 문제 풀기</button>}</div>
    </header>
    <nav className="workbench-tabs" aria-label="화면 전환">{[['source', '원문'], ['chat', '대화']].map(([id, label]) =>
      <button key={id} aria-pressed={mobilePane === id} onClick={() => setMobilePane(id!)}>{label}</button>)}</nav>
    <div className="workbench-columns">
      <section className="source-pane workbench-pane" aria-label="원문">
        <header className="pane-header source-head"><div className="source-title"><h1 title={view.title}>{view.title}</h1><small>{view.exam}</small></div>
          <nav className="diag-paragraph-nav" aria-label="문단 이동">{view.paragraphs.map((p, i) =>
            <button key={p.paragraphId} type="button" disabled={busy} aria-current={i === current.index ? 'true' : undefined} onClick={() => go(i)}>문단 {p.position}{p.done ? ' ✓' : ''}</button>)}</nav></header>
        <div className="source-scroll simple-source">
          {view.paragraphs.map((p, i) => i === current.index
            ? <article className={`dialogue-paragraph current${current.highlightKind === 'HINT' ? ' is-hint' : ''}`} key={p.paragraphId}><span className="paragraph-chip">문단 {p.position}</span>
                <AnnotatedText text={p.text} annotations={[]} highlights={pending ? [] : current.highlights} /></article>
            : <details className="previous-paragraph" key={p.paragraphId}><summary>문단 {p.position}<small>{p.done ? '완료' : '다시 읽기'}</small></summary><p>{p.text}</p></details>)}
        </div>
      </section>
      <section className="chat-pane workbench-pane" aria-label="응답과 피드백">
        <header className="pane-header"><h2>생각을 나누는 공간</h2><small>문단 {current.index + 1}</small></header>
        <RestatedSummary current={current} />
        <div className="chat-scroll" ref={chatRef} aria-label="대화 기록" aria-live="polite">
          {!messages.length && <p className="chat-welcome">이 문단의 중심 내용과 관계를 자기 말로 써 봐.</p>}
          {messages.slice(0, visible).map((m, i) => <div className="chat-round" key={i}><SimpleBubble message={m} /></div>)}
          {!sequenceDone && !reducedMotion && <div className="chat-round"><article className="chat-message tutor simple-waiting simple-sequence-waiting" role="status" aria-label="다음 이야기 준비 중"><span className="simple-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></article></div>}
          {pending && <div className="chat-round"><SimpleBubble message={{ role: 'student', text: pending.text, label: simpleStudentLabel[pending.stage] }} /></div>}
          {pending && <div className="chat-round"><article className="chat-message tutor simple-waiting" role="status" aria-live="polite"><small className="simple-label">피드백</small>
            <p>{simpleWaitingText(pending.stage, Math.max(0, now - pending.startedAt), pending.transitionId)}<span className="simple-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article></div>}
          {current.evaluationError && <p role="alert" className="chat-notice">{current.evaluationError}</p>}
        </div>
        <footer className="chat-footer">{error && <p className="err" role="alert">{error}</p>}
          {readOnly ? <p className="diag-muted" role="status">읽기 전용(지나온 화면)</p> : current.done ? !sequenceDone ? null : <div className="chat-progress-actions"><p>이 문단은 끝났어.</p><div>
            {!last && <button className="primary" disabled={busy} onClick={() => go(current.index + 1)}>다음 문단</button>}</div></div>
            : <div className="dialogue-compose"><label className="simple-sr-only" htmlFor="diag-summary-response">이 문단의 중심 내용과 관계를 설명해 줘.</label>
              <textarea ref={responseBox} id="diag-summary-response" value={draft} disabled={locked} placeholder="내 생각을 적어 봐…"
                onChange={e => setDrafts(old => ({ ...old, [current.index]: e.target.value }))}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }} />
              <RationaleSymbolBar key={current.index} marks={symbolMarks} value={draft} onChange={text => setDrafts(old => ({ ...old, [current.index]: text }))} input={responseBox} disabled={locked} />
              <div className="dialogue-compose-row"><small>⌘/Ctrl + Enter</small>
                <button data-rationale-submit="" className="primary" disabled={locked || !draft.trim()} onClick={submit}>{failed ? '다시 시도' : '보내기'}</button></div></div>}
        </footer>
      </section>
    </div>
  </main>;
}
