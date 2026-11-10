/** 지문 끝 중간 화면·결과 화면의 불러오기 껍데기. 학생 화면(`DiagnosticApp`)과 개발자 이동 화면(`DevDiagnostic`)이 함께 쓴다. */
import { useEffect, useState } from 'react';
import { getResult, getSummaryCard } from './api.js';
import { hasPending } from './logic.js';
import { MidPage } from './Pages.js';
import { ResultView } from './ResultView.js';
import type { ResultView as Result, SetInfo, SummaryCardView } from './types.js';

export const message = (reason: unknown) => reason instanceof Error ? reason.message : String(reason);
const RESULT_POLL_MS = 3000; const RESULT_POLL_LIMIT_MS = 10 * 60 * 1000; const CARD_POLL_MS = 2000;

export function MidContainer({ id, passageId, title, number, total, start, error }: { id: string; passageId: string; title: string; number: number; total: number; start: () => void; error: string }) {
  const [card, setCard] = useState<SummaryCardView | null>(null);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    let active = true; let timer: number | undefined;
    const poll = () => getSummaryCard(id, passageId).then(next => {
      if (!active) return;
      setCard(next); setProblem('');
      if (next.judging > 0 || !next.firstItemOpen) timer = window.setTimeout(poll, CARD_POLL_MS);
    }).catch((reason: unknown) => { if (active) { setProblem(message(reason)); timer = window.setTimeout(poll, CARD_POLL_MS); } });
    void poll();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id, passageId]);
  return <MidPage title={title} number={number} total={total} card={card} start={start} error={error || problem} />;
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
