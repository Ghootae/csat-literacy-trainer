/**
 * 개발자 이동 화면(`/diagnostic?dev=1`, D-0217). 지도에서 고른 칸(또는 이전/다음 화면)이 정하는 화면을 띄운다.
 * 아직 가지 않은 단계는 서버 건너뛰기 API로 넘어가고, 지나온 화면은 읽기 전용이다. 학생 화면 컴포넌트를 그대로 쓴다.
 */
import { useEffect, useRef, useState } from 'react';
import type { SimpleDialogueView } from '../../shared/dialogue-simple.js';
import { answersDone, getFeedback, getQuestions, postFeedback, startPassage, submitItem, summaryFinish, summaryNavigate, summaryRespond } from './api.js';
import { AnswerScreen } from './AnswerScreen.js';
import { MidContainer, ResultContainer, message } from './Containers.js';
import { devResetPassage, devSkipItem, devSkipPassage, getDevAnswers, getDevMap, getDevSummary, type DevAnswersView, type DevMapView } from './dev-api.js';
import { buildFlow, neighbor, resolveKey, resultKey, statusRank, type Cell } from './dev-flow.js';
import { DevMap } from './DevMap.js';
import { FeedbackScreen } from './FeedbackScreen.js';
import { ChoosePage } from './Pages.js';
import { PassagePane, QuestionPane, paneFromContent } from './QuestionPanes.js';
import { SummaryDialogue } from './SummaryDialogue.js';
import type { QuestionsView, SetInfo } from './types.js';

type View =
  | { name: 'blank' } | { name: 'note'; text: string }
  | { name: 'choose'; passageId: string }
  | { name: 'summary'; passageId: string; view: SimpleDialogueView; readOnly: boolean }
  | { name: 'answer'; passageId: string; data: QuestionsView }
  | { name: 'answers'; passageId: string; data: DevAnswersView }
  | { name: 'mid'; passageId: string }
  | { name: 'feedback'; passageId: string; questionId: string; readOnly: boolean }
  | { name: 'result' };

/** 낸 답을 선지 표시와 근거 글로 읽기 전용으로 보인다(문항 사이는 번호로 오간다). */
function AnswersReadOnly({ data }: { data: DevAnswersView }): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const question = data.questions[index]!; const answer = data.answers[question.questionId] ?? null;
  const pane = paneFromContent(question.content);
  const rationale = !answer ? '답이 없어(건너뜀)' : answer.rationale.mode === 'PROVIDED' ? answer.rationale.text : `근거 미제출 · ${answer.confidence === 'UNSURE' ? '잘은 모르겠지만 정답 같음' : '확실해요'}`;
  return <main className="reading-workbench problem-lab-workbench diag-workbench" data-pane="problem">
    <header className="workbench-header"><div className="lab-strip-lead"><h1 className="diag-header-title">{question.content.title}</h1></div>
      <div className="workbench-actions"><span>문항 {index + 1} / {data.questions.length} · 읽기 전용</span></div></header>
    <div className="workbench-columns">
      <PassagePane question={pane} />
      <QuestionPane question={pane} selectedId={answer?.choiceId ?? null} enabled={false} onPick={() => {}} />
      <section className="workbench-pane chat-pane" aria-label="내 답">
        <header className="pane-header"><h2>낸 답</h2><small>{answer ? (answer.source === 'first' ? '제출한 답' : '임시 저장한 답') : '답 없음'}</small></header>
        <nav className="diag-cells" aria-label="문항 이동">{data.questions.map((q, i) => <button key={q.questionId} type="button" aria-current={i === index ? 'true' : undefined}
          data-answered={data.answers[q.questionId] != null} onClick={() => setIndex(i)}>{q.questionNumber}</button>)}</nav>
        <div className="chat-scroll"><article className="chat-message student" data-testid="dev-answer-text"><small>근거</small><p>{rationale}</p></article></div>
      </section>
    </div>
  </main>;
}

export function DevDiagnostic({ id, set }: { id: string; set: SetInfo }): React.JSX.Element {
  const [map, setMap] = useState<DevMapView | null>(null);
  const [current, setCurrent] = useState('');
  const [view, setView] = useState<View>({ name: 'blank' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fatal, setFatal] = useState('');
  const booted = useRef(false);
  const flow = map ? buildFlow(map) : [];
  const titleOf = (passageId: string) => set.passages.find(p => p.passageId === passageId)?.title ?? '';
  const numberOf = (passageId: string) => set.passages.findIndex(p => p.passageId === passageId) + 1;

  async function refresh(): Promise<DevMapView> { const next = await getDevMap(id); setMap(next); return next; }
  async function guarded(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }

  /** 칸을 연다: 아직 가지 않은 단계면 건너뛰기를 먼저 부르고(확인 창 없이), 지나온 화면이면 읽기 전용으로 보인다. */
  async function openCell(cell: Cell) {
    let m = await refresh();
    const passage = cell.passageId ? m.passages.find(p => p.passageId === cell.passageId)! : null;
    const passageId = cell.passageId!;
    const rank = passage ? statusRank(passage.status) : 0;
    const skipTo = async (to: 'ANSWERING' | 'FEEDBACK') => { await devSkipPassage(id, passageId, to); m = await refresh(); };
    switch (cell.kind) {
      case 'choose': setView({ name: 'choose', passageId }); break;
      case 'summary':
        if (cell.paragraphIndex === undefined) setView({ name: 'note', text: passage!.summaryChosen === false ? '요약 없이 풀기를 골랐어.' : '요약 단계를 건너뜀.' });
        else if (passage!.status === 'SUMMARY') setView({ name: 'summary', passageId, view: await summaryNavigate(id, passageId, cell.paragraphIndex), readOnly: false });
        else {
          try { setView({ name: 'summary', passageId, view: await getDevSummary(id, passageId, cell.paragraphIndex), readOnly: true }); }
          catch (reason) { setView({ name: 'note', text: message(reason) }); }
        }
        break;
      case 'answer':
        if (rank < statusRank('ANSWERING')) await skipTo('ANSWERING');
        if (m.passages.find(p => p.passageId === passageId)!.status === 'ANSWERING') setView({ name: 'answer', passageId, data: await getQuestions(id, passageId) });
        else setView({ name: 'answers', passageId, data: await getDevAnswers(id, passageId) });
        break;
      case 'mid':
        if (rank < statusRank('AWAITING_JUDGMENT')) await skipTo('FEEDBACK');
        setView({ name: 'mid', passageId });
        break;
      case 'question': {
        if (rank < statusRank('FEEDBACK')) await skipTo('FEEDBACK');
        const now = m.passages.find(p => p.passageId === passageId)!;
        const index = now.questions.findIndex(q => q.questionId === cell.questionId);
        if (!now.questions[index]!.answered) { setView({ name: 'note', text: '이 문항은 답이 없어 판정·피드백 없이 건너뜀.' }); break; }
        if (now.status === 'FEEDBACK' && index > now.feedbackCursor) { await devSkipItem(id, cell.questionId!); m = await refresh(); }
        const after = m.passages.find(p => p.passageId === passageId)!;
        setView({ name: 'feedback', passageId, questionId: cell.questionId!, readOnly: after.status === 'DONE' || index < after.feedbackCursor });
        break;
      }
      default: setView({ name: 'result' });
    }
    setCurrent(cell.key);
    await refresh();
  }
  const go = (cell: Cell) => guarded(() => openCell(cell));
  const step = (direction: 1 | -1) => { const target = neighbor(flow, current, direction); return target ? go(target) : undefined; };

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      try {
        const first = await refresh();
        const cells = buildFlow(first);
        // 학생 흐름의 "첫 미완료 지문"에 해당하는 칸에서 시작한다.
        const active = first.passages.find(p => p.status !== 'DONE');
        const start = active ? cells.find(cell => cell.passageId === active.passageId && cell.status === 'CURRENT') ?? cells.find(cell => cell.passageId === active.passageId)! : cells.find(cell => cell.key === resultKey)!;
        await openCell(start);
      } catch (reason) { setFatal(message(reason)); }
    })();
  }, []);

  const previous = neighbor(flow, current, -1) ? () => void step(-1) : null;
  const nextStep = neighbor(flow, current, 1) ? () => void step(1) : null;
  const afterChange = () => refresh().then(next => { setCurrent(key => resolveKey(buildFlow(next), key)); });

  function body(): React.JSX.Element {
    if (fatal) return <main className="diag-page"><div className="diag-wrap"><p className="err" role="alert">개발자 지도를 불러오지 못했어: {fatal}</p></div></main>;
    const total = set.passages.length;
    switch (view.name) {
      case 'blank': return <main className="diag-page"><div className="diag-wrap"><p className="diag-muted" role="status">불러오는 중…</p></div></main>;
      case 'note': return <main className="diag-page"><div className="diag-wrap"><p className="diag-line" role="status" data-testid="dev-note">{view.text}</p></div></main>;
      case 'choose': {
        const { passageId } = view;
        return <ChoosePage title={titleOf(passageId)} number={numberOf(passageId)} total={total} busy={busy} error="" choose={summary => void guarded(async () => {
          const started = await startPassage(id, passageId, summary);
          const next = await refresh(); const nextFlow = buildFlow(next);
          if ('sessionId' in started) setView({ name: 'summary', passageId, view: started, readOnly: false });
          else setView({ name: 'answer', passageId, data: { questions: started.questions, drafts: {} } });
          setCurrent(nextFlow.find(cell => cell.passageId === passageId && cell.kind === (summary ? 'summary' : 'answer'))?.key ?? current);
        })} />;
      }
      case 'summary': {
        const { passageId, view: dialogue, readOnly } = view;
        const keyFor = (index: number) => `${passageId}:summary:${index}`;
        return <SummaryDialogue key={`${passageId}:${readOnly}`} view={dialogue} busy={busy} error={error} readOnly={readOnly}
          respond={async body => { const next = await summaryRespond(id, passageId, body); setView({ name: 'summary', passageId, view: next, readOnly: false }); void afterChange(); return next; }}
          go={index => void guarded(async () => {
            setView({ name: 'summary', passageId, view: readOnly ? await getDevSummary(id, passageId, index) : await summaryNavigate(id, passageId, index), readOnly });
            setCurrent(keyFor(index));
          })}
          finish={() => void guarded(async () => {
            const finished = await summaryFinish(id, passageId);
            setView({ name: 'answer', passageId, data: { questions: finished.questions, drafts: {} } }); setCurrent(`${passageId}:answer`); await refresh();
          })} />;
      }
      case 'answer': {
        const { passageId, data } = view;
        return <AnswerScreen key={passageId} questions={data.questions} drafts={data.drafts} save={(questionId, request) => submitItem(id, questionId, request)}
          done={async () => { await answersDone(id, passageId); setView({ name: 'mid', passageId }); setCurrent(`${passageId}:mid`); await refresh(); }} />;
      }
      case 'answers': return <AnswersReadOnly key={view.passageId} data={view.data} />;
      case 'mid': {
        const { passageId } = view;
        return <MidContainer key={passageId} id={id} passageId={passageId} title={titleOf(passageId)} number={numberOf(passageId)} total={total} error={error}
          start={() => void step(1)} />;
      }
      case 'feedback': {
        const { passageId, questionId, readOnly } = view;
        const passage = set.passages.find(p => p.passageId === passageId)!;
        const index = passage.questionIds.indexOf(questionId); const lastQuestion = index + 1 >= passage.questionIds.length;
        return <FeedbackScreen key={`${questionId}:${readOnly}`} readOnly={readOnly} load={() => getFeedback(id, questionId)} send={request => postFeedback(id, questionId, request).then(next => { void afterChange(); return next; })}
          nextLabel={!lastQuestion ? '다음 문항' : numberOf(passageId) >= set.passages.length ? '결과 보기' : '다음 지문'} next={() => void step(1)} />;
      }
      default: return <ResultContainer id={id} set={set} />;
    }
  }
  return <div className="diag-dev-shell">
    <DevMap flow={flow} passages={map?.passages ?? []} currentKey={current} busy={busy} error={error} open={cell => void go(cell)} previous={previous} next={nextStep}
      reset={passageId => void guarded(async () => {
        await devResetPassage(id, passageId);
        const next = await refresh(); const nextFlow = buildFlow(next);
        // 초기화한 지문을 보고 있었다면 그 지문의 요약 선택 화면으로 돌아간다.
        if (current.startsWith(`${passageId}:`) || current === '') { setView({ name: 'choose', passageId }); setCurrent(nextFlow.find(cell => cell.passageId === passageId)!.key); }
        else setCurrent(resolveKey(nextFlow, current));
      })} />
    <div className="diag-dev-body">{body()}</div>
  </div>;
}
