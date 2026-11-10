/** 문항 답 입력 화면(인계 B (4), D-0221·D-0226). 정오는 보이지 않는다. 문항은 순서대로 풀고, 입력창 안 [제출]·근거 미입력 버튼으로 낸 답은 확정돼 고칠 수 없으며(읽기 전용), 확정한 문항은 돌아와 볼 수 있다. */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { RationaleSymbolBar } from '../RationaleSymbolBar.js';
import { appendConclusion, conclusionText, toSubmittedText, type SymbolMark } from '../rationale-tools.js';
import type { Confidence, ItemRequest, QuestionsView, QuestionView } from './types.js';
import { answerPayload, circledObject, focusRationale, newTimer, startTimer, stopTimer, timerValues, type ItemTimer } from './logic.js';
import { PassagePane, QuestionPane, paneFromContent } from './QuestionPanes.js';

interface Answer { choiceId: string | null; text: string }
const initial = (questions: readonly QuestionView[], drafts: QuestionsView['drafts']): Record<string, Answer> => Object.fromEntries(questions.map(q => {
  const draft = drafts[q.questionId];
  return [q.questionId, { choiceId: draft?.choiceId ?? null, text: draft?.rationale.mode === 'PROVIDED' ? draft.rationale.text : '' }];
}));
/** 근거 글로 낼 수 있는 답(선지 + 글). 근거 미입력 버튼은 선지만 있으면 된다. */
const isValid = (answer: Answer | undefined): answer is Answer & { choiceId: string } => !!answer && answer.choiceId !== null && answer.text.trim() !== '';

export function AnswerScreen({ questions, drafts, confirmed: initialConfirmed, save, confirm, done }: {
  questions: readonly QuestionView[]; drafts: QuestionsView['drafts']; confirmed: QuestionsView['confirmed'];
  save: (questionId: string, body: ItemRequest) => Promise<unknown>; confirm: (questionId: string, body: ItemRequest) => Promise<unknown>; done: () => Promise<void>;
}): React.JSX.Element {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  // 지금 차례 문항 = 확정 안 된 첫 문항(모두 확정했으면 마지막). 그 뒤 문항은 열지 않는다.
  const firstOpen = questions.findIndex(q => !confirmed[q.questionId]);
  const turn = firstOpen < 0 ? questions.length - 1 : firstOpen;
  const [index, setIndex] = useState(() => { const open = questions.findIndex(q => !initialConfirmed[q.questionId]); return open < 0 ? questions.length - 1 : open; });
  const [answers, setAnswers] = useState(() => initial(questions, drafts));
  const [pane, setPane] = useState('problem');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef<Record<string, ItemTimer>>({});
  const marks = useRef<Record<string, MutableRefObject<SymbolMark[]>>>({});
  const savedKey = useRef<Record<string, string>>({});
  const box = useRef<HTMLTextAreaElement>(null);
  const current = questions[index]!; const qid = current.questionId; const answer = answers[qid]!;
  const locked = !!confirmed[qid];
  const confirmedRef = useRef(confirmed); confirmedRef.current = confirmed;
  const markRef = (id: string) => (marks.current[id] ??= { current: [] });
  const timer = (id: string) => timers.current[id] ?? newTimer();
  const setTimer = (id: string, next: ItemTimer) => { timers.current[id] = next; };

  // 화면에 보이는 문항만 잰다: 문항이 바뀌거나 탭이 숨으면 멈추고, 돌아오면 이어서 더한다.
  useEffect(() => {
    const now = () => Date.now();
    if (confirmedRef.current[qid]) return;   // 확정한 문항은 재지 않는다
    if (document.visibilityState === 'visible') setTimer(qid, startTimer(timer(qid), now()));
    const onVisibility = () => setTimer(qid, document.visibilityState === 'visible' ? startTimer(timer(qid), now()) : stopTimer(focusRationale(timer(qid), false, now()), now()));
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); setTimer(qid, stopTimer(focusRationale(timer(qid), false, now()), now())); };
  }, [qid]);

  /** 확정·저장 요청 본문. `confidence`가 있으면 근거 미입력(누른 버튼의 확신)이라 글은 보내지 않는다. */
  function body(id: string, confidence: Confidence | null): { request: ItemRequest; key: string } | null {
    const a = answers[id];
    if (!a || a.choiceId === null || (confidence === null && a.text.trim() === '')) return null;
    const text = confidence !== null ? '' : toSubmittedText(a.text, markRef(id).current).trim();
    const { solveMs, rationaleMs } = timerValues(timer(id), Date.now(), confidence !== null);
    return { request: { choiceId: a.choiceId, ...answerPayload(confidence, text), solveMs, rationaleMs }, key: `${a.choiceId}|${confidence ?? ''}|${text}` };
  }
  /** 임시 저장. 확정한 문항에는 하지 않는다. */
  async function persist(id: string): Promise<void> {
    if (confirmedRef.current[id]) return;
    const next = body(id, null);
    if (!next || savedKey.current[id] === next.key) return;
    await save(id, next.request);
    savedKey.current[id] = next.key;
  }
  /** 지금 차례 문항의 답을 낸다(확정). 시간을 멈추고 보내며, 실패하면 시간을 다시 잰다. */
  async function confirmCurrent(confidence: Confidence | null): Promise<void> {
    setTimer(qid, stopTimer(focusRationale(timer(qid), false, Date.now()), Date.now()));
    const next = body(qid, confidence);
    if (!next) return;
    setBusy(true); setError('');
    try { await confirm(qid, next.request); }
    catch (reason) { setTimer(qid, startTimer(timer(qid), Date.now())); setError(reason instanceof Error ? reason.message : String(reason)); return; }
    finally { setBusy(false); }
    confirmedRef.current = { ...confirmedRef.current, [qid]: true };
    setConfirmed(confirmedRef.current);
  }
  // 답이 바뀐 뒤 잠시 멈추면 임시 저장한다(새로 고침해도 고른 답이 남는다).
  useEffect(() => {
    if (!isValid(answer) || locked) return;
    const timeout = window.setTimeout(() => { persist(qid).catch(reason => setError(String(reason))); }, 700);
    return () => window.clearTimeout(timeout);
  }, [qid, locked, answer.choiceId, answer.text]);

  const update = (patch: Partial<Answer>) => setAnswers(old => ({ ...old, [qid]: { ...old[qid]!, ...patch } }));
  async function go(next: number) {
    if (next === index || next < 0 || next >= questions.length || next > turn) return;
    setError('');
    try { await persist(qid); } catch (reason) { setError(String(reason)); }
    setIndex(next);
  }
  /** "이 지문 답 다 냈어": 문항은 이미 확정돼 있으니 끝만 알린다. */
  async function finish() {
    setBusy(true); setError('');
    try { await done(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  const last = questions.length - 1;
  const isLast = index === last;
  const canFinish = questions.every(q => confirmed[q.questionId]);
  const chosen = current.content.choices.find(c => c.choiceId === answer.choiceId);
  const question = paneFromContent(current.content);
  const conclusion = chosen ? conclusionText(current.content.stem, chosen.position) : null;
  return <main className="reading-workbench problem-lab-workbench diag-workbench" data-pane={pane}>
    <header className="workbench-header"><div className="lab-strip-lead"><h1 className="diag-header-title">{current.content.title}</h1></div>
      <div className="workbench-actions"><span>문항 {index + 1} / {questions.length}</span></div></header>
    <nav className="workbench-tabs" aria-label="문제 화면 전환">{[['source', '지문'], ['problem', '문제'], ['chat', '내 답']].map(([id, title]) =>
      <button key={id} aria-pressed={pane === id} onClick={() => setPane(id!)}>{title}</button>)}</nav>
    <div className="workbench-columns">
      <PassagePane question={question} />
      <QuestionPane question={question} selectedId={answer.choiceId} enabled={!busy && !locked} onPick={choiceId => update({ choiceId })} />
      <section className="workbench-pane chat-pane" aria-label="내 답">
        <header className="pane-header"><h2>내 답</h2><small>{chosen ? `${circledObject(chosen.position)} 골랐어` : '문제에서 답을 골라 줘'}</small></header>
        <nav className="diag-cells" aria-label="문항 이동">{questions.map((q, i) => <button key={q.questionId} type="button" aria-current={i === index ? 'true' : undefined}
          data-answered={!!confirmed[q.questionId] || isValid(answers[q.questionId])} disabled={i > turn} onClick={() => void go(i)}>{q.questionNumber}</button>)}</nav>
        <div className="chat-footer diag-composer">
          <label className="lab-sr-only" htmlFor="diag-rationale">선택한 이유를 적어 줘</label>
          <div className="diag-input-box">
            <textarea ref={box} id="diag-rationale" value={answer.text} disabled={busy || locked} placeholder="이 선지를 고른 이유를 적어 줘."
              onChange={e => update({ text: e.target.value })}
              onFocus={() => setTimer(qid, focusRationale(timer(qid), true, Date.now()))}
              onBlur={() => setTimer(qid, focusRationale(timer(qid), false, Date.now()))} />
            <div className="diag-input-actions">
              <button type="button" className="primary" data-rationale-submit="" disabled={busy || locked || !isValid(answer)} onClick={() => void confirmCurrent(null)}>제출</button>
              <button type="button" disabled={busy || locked || !answer.choiceId} onClick={() => void confirmCurrent('SURE')}>근거 미입력(확실)</button>
              <button type="button" disabled={busy || locked || !answer.choiceId} onClick={() => void confirmCurrent('UNSURE')}>근거 미입력(잘 모르겠음)</button>
            </div>
          </div>
          <RationaleSymbolBar key={qid} value={answer.text} onChange={text => update({ text })} input={box} marks={markRef(qid)} disabled={busy || locked}>
            <button type="button" className="rationale-conclusion" data-hint={conclusion ? `→ ${conclusion.replace('따라서 ', '').replace('번은', '')}` : '선지 고른 뒤 결론'} disabled={busy || locked || !conclusion} onClick={() => {
              const text = appendConclusion(box.current?.value ?? answer.text, conclusion!); update({ text });
              requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange(text.length, text.length); });
            }}>결론</button>
          </RationaleSymbolBar>
          {locked && <p className="diag-muted" role="status">이미 낸 답이야</p>}
          {error && <p className="err" role="alert">{error}</p>}
          <div className="diag-actions">
            <button type="button" disabled={busy || index === 0} onClick={() => void go(index - 1)}>이전 문항</button>
            {isLast
              ? <button type="button" className="primary" disabled={busy || !canFinish} onClick={() => void finish()}>이 지문 답 다 냈어</button>
              : <button type="button" disabled={busy || !locked} onClick={() => void go(index + 1)}>다음 문항</button>}
          </div>
        </div>
      </section>
    </div>
  </main>;
}
