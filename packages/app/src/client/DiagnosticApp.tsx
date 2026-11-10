/** SNS 진단평가 화면(`/diagnostic`, 인계 B). 시작 안내 → 지문마다 (요약 선택 → 요약 대화) → 문항 답 → 지문 결과 화면(결과 공개·리뷰할 문항 고르기) ↔ 문항 검토 → 결과. 브라우저에는 참가자 id만 둔다. */
import { useEffect, useRef, useState } from 'react';
import type { SimpleDialogueView } from '../shared/dialogue-simple.js';
import {
  ApiError, answersDone, confirmItem, createParticipant, getFeedback, getProgress, getQuestions, postFeedback, startPassage, submitItem,
  summaryFinish, summaryNavigate, summaryRespond,
} from './diagnostic/api.js';
import { AnswerScreen } from './diagnostic/AnswerScreen.js';
import { FeedbackScreen } from './diagnostic/FeedbackScreen.js';
import { MidContainer, ResultContainer, message } from './diagnostic/Containers.js';
import { ChoosePage, IntroPage } from './diagnostic/Pages.js';
import { DevDiagnostic } from './diagnostic/DevDiagnostic.js';
import { SummaryDialogue } from './diagnostic/SummaryDialogue.js';
import type { ProgressView, QuestionsView, SetInfo } from './diagnostic/types.js';
import './diagnostic/diagnostic.css';

/** `/diagnostic?dev=1`: 개발자 이동 지도(D-0217). 없으면 학생 화면 그대로다. */
const DEV = new URLSearchParams(window.location.search).get('dev') === '1';
const STORAGE_KEY = 'csat-diagnostic-participant';
const readId = (): string | null => { try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; } };
const writeId = (id: string | null) => { try { if (id === null) window.localStorage.removeItem(STORAGE_KEY); else window.localStorage.setItem(STORAGE_KEY, id); } catch { /* 저장하지 못하면 새로 고침 때 새 참가자로 시작한다. */ } };

type Screen =
  | { name: 'loading' } | { name: 'fatal'; message: string } | { name: 'intro' }
  | { name: 'choose'; passageId: string }
  | { name: 'summary'; passageId: string; view: SimpleDialogueView }
  | { name: 'answer'; passageId: string; data: QuestionsView }
  | { name: 'mid'; passageId: string }
  | { name: 'feedback'; passageId: string; questionId: string }
  | { name: 'result' } | { name: 'dev' };

export function DiagnosticApp(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });
  const [id, setId] = useState<string | null>(null);
  const [set, setSet] = useState<SetInfo>({ passages: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const booted = useRef(false);

  const titleOf = (passageId: string) => set.passages.find(p => p.passageId === passageId)?.title ?? '';
  const numberOf = (passageId: string) => set.passages.findIndex(p => p.passageId === passageId) + 1;

  /** 서버의 진행 상태로 어느 화면에서 이어 갈지 정한다. */
  async function route(participantId: string, progress?: ProgressView) {
    const state = progress ?? await getProgress(participantId);
    setSet(state.set);
    if (DEV) { setScreen({ name: 'dev' }); return; }
    if (!state.current) { setScreen({ name: 'result' }); return; }
    const { passageId } = state.current;
    const passage = state.passages.find(p => p.passageId === passageId)!;
    switch (passage.status) {
      case 'NOT_STARTED': setScreen({ name: 'choose', passageId }); break;
      case 'SUMMARY': setScreen({ name: 'summary', passageId, view: await summaryNavigate(participantId, passageId, 0) }); break;
      case 'ANSWERING': setScreen({ name: 'answer', passageId, data: await getQuestions(participantId, passageId) }); break;
      default: setScreen({ name: 'mid', passageId });
    }
  }
  async function guarded(work: () => Promise<void>) {
    setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      const stored = readId();
      if (stored) {
        try { setId(stored); await route(stored); return; }
        catch (reason) {
          if (reason instanceof ApiError && (reason.status === 404 || reason.status === 400)) { writeId(null); setId(null); }
          else { setScreen({ name: 'fatal', message: message(reason) }); return; }
        }
      }
      // 처음 오거나 저장된 참가자가 없으면 새 참가자로 시작한다(시작 안내에서 만든다). 안내 문구에 필요한 세트 크기는 만들 때 받는다.
      setScreen({ name: 'intro' });
    })();
  }, []);

  const start = () => guarded(async () => {
    const created = await createParticipant();
    writeId(created.participantId); setId(created.participantId); setSet(created.set);
    if (DEV) { setScreen({ name: 'dev' }); return; }
    setScreen({ name: 'choose', passageId: created.set.passages[0]!.passageId });
  });

  if (screen.name === 'loading') return <main className="diag-page"><div className="diag-wrap"><p className="diag-muted" role="status">불러오는 중…</p></div></main>;
  if (screen.name === 'fatal') return <main className="diag-page"><div className="diag-wrap"><p className="err" role="alert">{screen.message}</p></div></main>;
  if (screen.name === 'intro') return <IntroPage busy={busy} error={error} start={() => void start()} />;
  const participantId = id!;
  const total = set.passages.length;

  if (screen.name === 'dev') return <DevDiagnostic id={participantId} set={set} />;

  if (screen.name === 'choose') {
    const { passageId } = screen;
    return <ChoosePage title={titleOf(passageId)} number={numberOf(passageId)} total={total} busy={busy} error={error} choose={summary => void guarded(async () => {
      const started = await startPassage(participantId, passageId, summary);
      if ('sessionId' in started) setScreen({ name: 'summary', passageId, view: started });
      else setScreen({ name: 'answer', passageId, data: { questions: started.questions, drafts: {}, confirmed: {} } });
    })} />;
  }
  if (screen.name === 'summary') {
    const { passageId, view } = screen;
    return <SummaryDialogue view={view} busy={busy} error={error}
      respond={async body => { setBusy(true); setError(''); try { const next = await summaryRespond(participantId, passageId, body); setScreen({ name: 'summary', passageId, view: next }); return next; } catch (reason) { setError(message(reason)); throw reason; } finally { setBusy(false); } }}
      go={index => void guarded(async () => setScreen({ name: 'summary', passageId, view: await summaryNavigate(participantId, passageId, index) }))}
      finish={() => void guarded(async () => { const finished = await summaryFinish(participantId, passageId); setScreen({ name: 'answer', passageId, data: { questions: finished.questions, drafts: {}, confirmed: {} } }); })} />;
  }
  if (screen.name === 'answer') {
    const { passageId, data } = screen;
    return <AnswerScreen key={passageId} questions={data.questions} drafts={data.drafts} confirmed={data.confirmed} confirm={(questionId, body) => confirmItem(participantId, questionId, body)} save={(questionId, body) => submitItem(participantId, questionId, body)}
      done={async () => { await answersDone(participantId, passageId); setScreen({ name: 'mid', passageId }); }} />;
  }
  if (screen.name === 'mid') {
    const { passageId } = screen;
    return <MidContainer key={passageId} id={participantId} passageId={passageId} title={titleOf(passageId)} number={numberOf(passageId)} total={total} error={error}
      last={numberOf(passageId) >= total} dev={DEV}
      review={questionId => setScreen({ name: 'feedback', passageId, questionId })}
      finished={() => void guarded(() => route(participantId))} />;
  }
  if (screen.name === 'feedback') {
    const { passageId, questionId } = screen;
    const backToResult = () => setScreen({ name: 'mid', passageId });
    return <FeedbackScreen key={questionId} load={() => getFeedback(participantId, questionId)} send={request => postFeedback(participantId, questionId, request)}
      nextLabel="지문 결과로 돌아가기" next={backToResult} back={backToResult} />;
  }
  return <ResultContainer id={participantId} set={set} />;
}

