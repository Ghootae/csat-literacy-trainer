/** 지문 끝 중간 화면·결과 화면의 불러오기 껍데기. 학생 화면(`DiagnosticApp`)과 개발자 이동 화면(`DevDiagnostic`)이 함께 쓴다. */
import { useEffect, useState } from 'react';
import { finishPassage, getResult, getSummaryCard, revealItem } from './api.js';
import { hasPending } from './logic.js';
import { MidPage } from './Pages.js';
import { ResultView } from './ResultView.js';
import type { ResultView as Result, SetInfo, SummaryCardView } from './types.js';

export const message = (reason: unknown) => reason instanceof Error ? reason.message : String(reason);
const RESULT_POLL_MS = 3000; const RESULT_POLL_LIMIT_MS = 10 * 60 * 1000; const CARD_POLL_MS = 2000;

export function MidContainer({ id, passageId, title, number, total, last, dev, review, finished, error }: {
  id: string; passageId: string; title: string; number: number; total: number; last: boolean; dev: boolean;
  /** 리뷰 대상 문항의 검토 화면으로 간다. */
  review: (questionId: string) => void;
  /** 지문을 끝냈다(서버가 DONE으로 바꾼 뒤). */
  finished: () => void; error: string;
}) {
  const [card, setCard] = useState<SummaryCardView | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; let timer: number | undefined;
    const poll = () => getSummaryCard(id, passageId).then(next => {
      if (!active) return;
      setCard(next); setProblem('');
      if (next.judging > 0) timer = window.setTimeout(poll, CARD_POLL_MS);
    }).catch((reason: unknown) => { if (active) { setProblem(message(reason)); timer = window.setTimeout(poll, CARD_POLL_MS); } });
    void poll();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id, passageId]);
  async function guarded(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); setProblem(''); } catch (reason) { setProblem(message(reason)); } finally { setBusy(false); }
  }
  return <MidPage title={title} number={number} total={total} card={card} dev={dev} last={last} busy={busy} error={error || problem}
    reveal={questionId => void guarded(async () => { setCard(await revealItem(id, passageId, questionId)); })}
    review={review} finish={() => void guarded(async () => { await finishPassage(id, passageId); finished(); })} />;
}

export function ResultContainer({ id, set }: { id: string; set: SetInfo }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true; let timer: number | undefined; const startedAt = Date.now();
    const load = () => getResult(id).then(next => {
      if (!active) return;
      setResult(next); setError('');
      if (hasPending(next) && Date.now() - startedAt < RESULT_POLL_LIMIT_MS) timer = window.setTimeout(load, RESULT_POLL_MS);
    }).catch((reason: unknown) => { if (active) { setError(message(reason)); timer = window.setTimeout(load, RESULT_POLL_MS); } });
    void load();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id]);
  if (!result) return <main className="diag-page"><div className="diag-wrap"><p className="diag-muted" role={error ? 'alert' : 'status'}>{error || '불러오는 중…'}</p></div></main>;
  return <ResultView result={result} set={set} />;
}
