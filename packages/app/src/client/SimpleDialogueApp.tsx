import { useEffect, useRef, useState } from 'react';
import type { DialoguePassageSummary } from '../shared/contract.js';
import { simpleStudentLabel, type SimpleDialogueView, type SimpleStage } from '../shared/dialogue-simple.js';
import { fetchDialoguePassages } from './api.js';
import { DevPartNav } from './DevPartNav.js';
import { parseInitialParagraph, problemLink } from './dev-part-nav-links.js';
import { AnnotatedText } from './annotated-text.js';
import { SimpleBubble, SimpleDialogueDrawer } from './SimpleDialogueDrawer.js';
import { getSimple, navigateSimple, newAttemptSimple, respondSimple, startSimple } from './simple-dialogue-api.js';
import { simpleWaitingText } from './simple-waiting.js';
import './simple-dialogue.css';

const base = '/dialogue/lab';

export function SimpleDialogueApp(): React.JSX.Element {
  const [passages, setPassages] = useState<readonly DialoguePassageSummary[] | null>(null);
  const [view, setView] = useState<SimpleDialogueView | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [mobilePane, setMobilePane] = useState('chat');
  const [pending, setPending] = useState<{ text: string; stage: SimpleStage; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [seenAt, setSeenAt] = useState(() => Date.now());
  const inFlight = useRef(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const accept = (next: SimpleDialogueView) => {
    setView(next);
    window.history.replaceState(null, '', `${base}?sessionId=${encodeURIComponent(next.sessionId)}`);
  };
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    fetchDialoguePassages().then(p => { if (active) setPassages(p); }).catch(reason => { if (active) setError(String(reason)); });
    const { sessionId: id, passageId, paragraph } = parseInitialParagraph(window.location.search);
    const inRange = (v: SimpleDialogueView) => paragraph !== null && paragraph < v.paragraphs.length;
    const fail = (reason: unknown) => { if (active) setError(String(reason)); };
    if (id) getSimple(id).then(async v => {
      if (paragraph !== null && inRange(v) && paragraph !== v.current.index) v = await navigateSimple(id, paragraph);
      if (active) accept(v);
    }).catch(fail);
    else if (passageId && paragraph !== null) startSimple(passageId).then(async v => {
      if (inRange(v) && paragraph > 0) v = await navigateSimple(v.sessionId, paragraph);
      if (active) accept(v);
    }).catch(fail);
    return () => { active = false; };
  }, []);
  const processing = view?.current.evaluationStatus === 'PROCESSING';
  const waiting = pending !== null || processing;
  useEffect(() => { if (processing) setSeenAt(Date.now()); }, [processing]);
  useEffect(() => {
    if (!waiting) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [view?.current.messages.length, busy, waiting]);

  if (!passages) return <main className="dialogue-shell"><p>불러오는 중…</p>{error && <p role="alert">{error}</p>}</main>;
  if (!view) return <main className="dialogue-shell dialogue-start">
    <header className="dialogue-hero"><p className="dialogue-kicker">COGAXIS / PERSONAL LAB</p><h1>단순 형식 문단 대화</h1>
      <p>개발자 전용 화면입니다. 문단마다 직접 요약을 쓰고, 단계별 판정과 인상을 메모합니다. 골드와 축은 쓰지 않습니다.</p></header>
    <section className="dialogue-passage-list" aria-label="학습할 지문">{passages.filter(p => p.available).map(p =>
      <article className="dialogue-passage-card" key={p.passageId}><div><h2>{p.title}</h2><p>{p.exam}</p><span>{p.paragraphCount}개 문단</span></div>
        <div className="simple-start-actions"><button className="primary" disabled={busy} onClick={() => void run(async () => accept(await startSimple(p.passageId)))}>시작</button>
          <nav aria-label={`${p.title} 시작 문단 선택`}>{Array.from({ length: p.paragraphCount }, (_, i) =>
            <button key={i} disabled={busy} onClick={() => void run(async () => {
              const started = await startSimple(p.passageId);
              accept(i === 0 ? started : await navigateSimple(started.sessionId, i));
            })}>문단 {i + 1}</button>)}</nav></div></article>)}</section>
    {error && <p className="err" role="alert">{error}</p>}
  </main>;

  const { current } = view;
  const draft = drafts[current.index] ?? '';
  const failed = current.evaluationStatus === 'RETRYABLE_ERROR';
  const last = current.index + 1 >= view.paragraphs.length;
  const submit = () => {
    const text = draft.trim();
    if (!text || busy || !current.canRespond) return;
    setPending({ text, stage: current.stage, startedAt: Date.now() });
    void run(async () => {
      try {
        const next = await respondSimple(view.sessionId, { transitionId: crypto.randomUUID(), paragraphIndex: current.index, text });
        if (next.current.evaluationStatus !== 'RETRYABLE_ERROR') setDrafts(old => ({ ...old, [current.index]: '' }));
        accept(next);
      } finally { setPending(null); }
    });
  };
  const startAttempt = () => {
    if (!current.canStartNewAttempt || busy) return;
    if (!current.done && !window.confirm('지금 시도를 중단하고 새로 시작할까?')) return;
    void run(async () => accept(await newAttemptSimple(view.sessionId, current.index)));
  };
  const go = (index: number) => void run(async () => accept(await navigateSimple(view.sessionId, index)));
  return <main className="reading-workbench is-developer simple-workbench" data-pane={mobilePane}>
    <header className="workbench-header"><div className="simple-strip-lead"><p className="dialogue-kicker">COGAXIS / PERSONAL LAB / SIMPLE</p><p className="developer-notice" title="simple-holistic · 개인 테스트 · 판정과 원출력은 서랍에서만 보입니다. 학생 상태 원장에는 쓰지 않습니다.">simple-holistic · 개인 테스트 · 판정과 원출력은 서랍에서만 보입니다. 학생 상태 원장에는 쓰지 않습니다.</p></div>
      <div className="workbench-actions"><span>문단 {current.index + 1} / {view.paragraphs.length}</span>
        <button onClick={() => setDrawer(true)}>단계별 판정·메모</button>
        <button disabled={busy} onClick={() => { setView(null); window.history.replaceState(null, '', base); }}>나가기</button></div>
    </header>
    <nav className="workbench-tabs" aria-label="화면 전환">{[['source', '원문'], ['chat', '대화']].map(([id, label]) =>
      <button key={id} aria-pressed={mobilePane === id} onClick={() => setMobilePane(id!)}>{label}</button>)}</nav>
    <div className="workbench-columns">
      <section className="source-pane workbench-pane" aria-label="원문"><header className="pane-header source-head"><div className="source-title"><h1 title={view.title}>{view.title}</h1><small>{view.exam}</small></div><DevPartNav disabled={busy} currentParagraph={current.index} currentIsProblem={false}
        paragraphs={view.paragraphs.map((p, i) => ({ label: `문단 ${p.position}`, done: p.done, onSelect: () => go(i) }))}
        problem={view.problemQuestionId === null ? null : { onSelect: () => window.location.assign(problemLink(view.problemQuestionId!, view.sessionId)) }} /></header>
        <div className="source-scroll simple-source">
          {view.paragraphs.map((p, i) => i === current.index
            ? <article className={`dialogue-paragraph current${current.highlightKind === 'HINT' ? ' is-hint' : ''}`} key={p.paragraphId}><span className="paragraph-chip">문단 {p.position}</span>
                <AnnotatedText text={p.text} annotations={[]} highlights={pending ? [] : current.highlights} /></article>
            : <details className="previous-paragraph" key={p.paragraphId}><summary>문단 {p.position}<small>{p.done ? '완료' : '다시 읽기'}</small></summary><p>{p.text}</p></details>)}
        </div>
      </section>
      <section className="chat-pane workbench-pane" aria-label="응답과 피드백"><header className="pane-header"><h2>생각을 나누는 공간</h2>
        <small>문단 {current.index + 1} · 시도 {current.attemptNumber}</small>
        <button disabled={busy || !current.canStartNewAttempt} onClick={startAttempt}>새 시도</button></header>
        <section className="simple-restated" aria-label="지금까지 내 요약"><small>지금까지 내 요약</small>
          <p>{current.restatedSummary === null ? '첫 요약을 보내면 여기에 정리돼.' : current.restatedSummary === '' ? '아직 이 문단에 대한 내용이 없어.' : current.restatedSummary}</p></section>
        <div className="chat-scroll" ref={chatRef} aria-label="대화 기록" aria-live="polite">
          {!current.messages.length && <p className="chat-welcome">이 문단의 중심 내용과 관계를 자기 말로 써 보세요.</p>}
          {current.messages.map((m, i) => <div className="chat-round" key={i}>
            <SimpleBubble message={m} /></div>)}
          {pending && <div className="chat-round"><SimpleBubble message={{ role: 'student', text: pending.text, label: simpleStudentLabel[pending.stage] }} /></div>}
          {waiting && <div className="chat-round"><article className="chat-message tutor simple-waiting" role="status" aria-live="polite"><small className="simple-label">피드백</small>
            <p>{simpleWaitingText(pending?.stage ?? current.stage, Math.max(0, now - (pending?.startedAt ?? seenAt)))}<span className="simple-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article></div>}
          {current.evaluationError && <p role="alert" className="chat-notice">{current.evaluationError}</p>}
        </div>
        <footer className="chat-footer">{error && <p className="err" role="alert">{error}</p>}
          {current.done ? <div className="chat-progress-actions"><p>이 문단은 끝났어요.</p><div>
            {!last && <button className="primary" disabled={busy} onClick={() => go(current.index + 1)}>다음 문단</button>}
            {last && view.problemUrl && <button className="primary" onClick={() => window.location.assign(view.problemUrl!)}>문제 풀기</button>}
            {last && !view.allDone && <small>끝나지 않은 문단이 있어요. 위의 문단 번호로 이동하세요.</small>}</div></div>
            : <div className="dialogue-compose"><label className="simple-sr-only" htmlFor="simple-response">이 문단의 중심 내용과 관계를 설명해 주세요.</label>
              <textarea id="simple-response" value={draft} disabled={busy || !current.canRespond} placeholder="내 생각을 적어보세요…"
                onChange={e => setDrafts(old => ({ ...old, [current.index]: e.target.value }))}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } }} />
              <div className="dialogue-compose-row"><small>⌘/Ctrl + Enter</small>
                <button className="primary" disabled={busy || !current.canRespond || !draft.trim()} onClick={submit}>{failed ? '다시 시도' : '보내기'}</button></div></div>}
        </footer>
      </section>
    </div>
    {drawer && <SimpleDialogueDrawer sessionId={view.sessionId} paragraphIndex={current.index} attemptNumber={current.attemptNumber} attemptCount={current.attemptCount} close={() => setDrawer(false)} />}
  </main>;
}
