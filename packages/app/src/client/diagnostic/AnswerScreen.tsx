/** 문항 답 입력 화면(인계 B (4)). 정오는 보이지 않고, 답은 고칠 수 있으며, 문항 사이를 오갈 수 있다. */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { RationaleSymbolBar } from '../RationaleSymbolBar.js';
import { toSubmittedText, type SymbolMark } from '../rationale-tools.js';
import type { Confidence, ItemRequest, QuestionsView, QuestionView } from './types.js';
import { answerPayload, circledObject, focusRationale, newTimer, startTimer, stopTimer, timerValues, toggleConfidence, type ItemTimer } from './logic.js';
import { PassagePane, QuestionPane, paneFromContent } from './QuestionPanes.js';

/** `confidence`가 있으면 근거 없는 응답(두 버튼 중 눌린 쪽)이다. */
interface Answer { choiceId: string | null; text: string; confidence: Confidence | null }
const initial = (questions: readonly QuestionView[], drafts: QuestionsView['drafts']): Record<string, Answer> => Object.fromEntries(questions.map(q => {
  const draft = drafts[q.questionId];
  return [q.questionId, { choiceId: draft?.choiceId ?? null, text: draft?.rationale.mode === 'PROVIDED' ? draft.rationale.text : '', confidence: draft?.rationale.mode === 'OMITTED' ? draft.confidence ?? 'SURE' : null }];
}));
const isValid = (answer: Answer | undefined): answer is Answer & { choiceId: string } => !!answer && answer.choiceId !== null && (answer.confidence !== null || answer.text.trim() !== '');

export function AnswerScreen({ questions, drafts, save, done }: {
  questions: readonly QuestionView[]; drafts: QuestionsView['drafts'];
  save: (questionId: string, body: ItemRequest) => Promise<unknown>; done: () => Promise<void>;
}): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => initial(questions, drafts));
  const [pane, setPane] = useState('problem');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef<Record<string, ItemTimer>>({});
  const marks = useRef<Record<string, MutableRefObject<SymbolMark[]>>>({});
  const savedKey = useRef<Record<string, string>>({});
  const box = useRef<HTMLTextAreaElement>(null);
  const current = questions[index]!; const qid = current.questionId; const answer = answers[qid]!;
  const markRef = (id: string) => (marks.current[id] ??= { current: [] });
  const timer = (id: string) => timers.current[id] ?? newTimer();
  const setTimer = (id: string, next: ItemTimer) => { timers.current[id] = next; };

  // 화면에 보이는 문항만 잰다: 문항이 바뀌거나 탭이 숨으면 멈추고, 돌아오면 이어서 더한다.
  useEffect(() => {
    const now = () => Date.now();
    if (document.visibilityState === 'visible') setTimer(qid, startTimer(timer(qid), now()));
    const onVisibility = () => setTimer(qid, document.visibilityState === 'visible' ? startTimer(timer(qid), now()) : stopTimer(focusRationale(timer(qid), false, now()), now()));
    document.addEventListener('visibilitychange', onVisibility);
    return () => { document.removeEventListener('visibilitychange', onVisibility); setTimer(qid, stopTimer(focusRationale(timer(qid), false, now()), now())); };
  }, [qid]);

  async function persist(id: string, force = false): Promise<void> {
    const a = answers[id];
    if (!isValid(a)) return;
    const text = a.confidence !== null ? '' : toSubmittedText(a.text, markRef(id).current).trim();
    const key = `${a.choiceId}|${a.confidence ?? ''}|${text}`;
    if (!force && savedKey.current[id] === key) return;
    const { solveMs, rationaleMs } = timerValues(timer(id), Date.now(), a.confidence !== null);
    await save(id, { choiceId: a.choiceId, ...answerPayload(a.confidence, text), solveMs, rationaleMs });
    savedKey.current[id] = key;
  }
  // 답이 바뀐 뒤 잠시 멈추면 임시 저장한다(새로 고침해도 고른 답이 남는다).
  useEffect(() => {
    if (!isValid(answer)) return;
    const timeout = window.setTimeout(() => { persist(qid).catch(reason => setError(String(reason))); }, 700);
    return () => window.clearTimeout(timeout);
  }, [qid, answer.choiceId, answer.text, answer.confidence]);

  const update = (patch: Partial<Answer>) => setAnswers(old => ({ ...old, [qid]: { ...old[qid]!, ...patch } }));
  async function go(next: number) {
    if (next === index || next < 0 || next >= questions.length) return;
    setError('');
    try { await persist(qid); } catch (reason) { setError(String(reason)); }
    setIndex(next);
  }
  async function finish() {
    setBusy(true); setError('');
    try {
      setTimer(qid, stopTimer(focusRationale(timer(qid), false, Date.now()), Date.now()));
      await persist(qid, true);
      await done();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setTimer(qid, startTimer(timer(qid), Date.now())); }
    finally { setBusy(false); }
  }
  const allValid = questions.every(q => isValid(answers[q.questionId]));
  const omit = answer.confidence !== null;
  const chosen = current.content.choices.find(c => c.choiceId === answer.choiceId);
  const question = paneFromContent(current.content);
  return <main className="reading-workbench problem-lab-workbench diag-workbench" data-pane={pane}>
    <header className="workbench-header"><div className="lab-strip-lead"><h1 className="diag-header-title">{current.content.title}</h1></div>
      <div className="workbench-actions"><span>문항 {index + 1} / {questions.length}</span></div></header>
    <nav className="workbench-tabs" aria-label="문제 화면 전환">{[['source', '지문'], ['problem', '문제'], ['chat', '내 답']].map(([id, title]) =>
      <button key={id} aria-pressed={pane === id} onClick={() => setPane(id!)}>{title}</button>)}</nav>
    <div className="workbench-columns">
      <PassagePane question={question} />
      <QuestionPane question={question} selectedId={answer.choiceId} enabled={!busy} onPick={choiceId => update({ choiceId })} />
      <section className="workbench-pane chat-pane" aria-label="내 답">
        <header className="pane-header"><h2>내 답</h2><small>{chosen ? `${circledObject(chosen.position)} 골랐어` : '문제에서 답을 골라 줘'}</small></header>
        <nav className="diag-cells" aria-label="문항 이동">{questions.map((q, i) => <button key={q.questionId} type="button" aria-current={i === index ? 'true' : undefined}
          data-answered={isValid(answers[q.questionId])} onClick={() => void go(i)}>{q.questionNumber}</button>)}</nav>
        <div className="chat-footer diag-composer">
          <label className="lab-sr-only" htmlFor="diag-rationale">선택한 이유를 적어 줘</label>
          <textarea ref={box} id="diag-rationale" value={answer.text} disabled={busy || omit} placeholder="이 선지를 고른 이유를 적어 줘."
            onChange={e => update({ text: e.target.value })}
            onFocus={() => setTimer(qid, focusRationale(timer(qid), true, Date.now()))}
            onBlur={() => setTimer(qid, focusRationale(timer(qid), false, Date.now()))} />
          <RationaleSymbolBar key={qid} value={answer.text} onChange={text => update({ text })} input={box} marks={markRef(qid)} disabled={busy || omit} />
          <div className="diag-omit-row">
            <button type="button" className="diag-omit" aria-pressed={answer.confidence === 'SURE'} disabled={busy} onClick={() => update({ confidence: toggleConfidence(answer.confidence, 'SURE') })}>확실해요</button>
            <button type="button" className="diag-omit" aria-pressed={answer.confidence === 'UNSURE'} disabled={busy} onClick={() => update({ confidence: toggleConfidence(answer.confidence, 'UNSURE') })}>잘은 모르겠지만 정답 같음</button>
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="diag-actions">
            <button type="button" disabled={busy || index === 0} onClick={() => void go(index - 1)}>이전 문항</button>
            <button type="button" disabled={busy || index + 1 >= questions.length} onClick={() => void go(index + 1)}>다음 문항</button>
            <button type="button" className="primary" data-rationale-submit="" disabled={busy || !allValid} onClick={() => void finish()}>이 지문 답 다 냈어</button>
          </div>
        </div>
      </section>
    </div>
  </main>;
}
