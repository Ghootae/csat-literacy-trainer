/** 시작 안내·요약 선택·지문 끝 중간 화면(인계 B (4), 샘플 `Passage.dc.html` 배치). */
import { useState } from 'react';
import { PENDING_TEXT, cellState, gradeText, passageResultSentence, rangeBar } from './logic.js';
import type { SummaryCardView } from './types.js';

export function IntroPage({ busy, error, start }: { busy: boolean; error: string; start: () => void }): React.JSX.Element {
  const [agreed, setAgreed] = useState(false);
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><h1>독해력 진단</h1><p className="diag-lead">4지문 16문항 · 시간 제한 없음</p></header>
    <section className="diag-card"><p className="diag-line">PC·태블릿에서 하는 걸 권해</p>
      <label className="diag-agree"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />시연용 화면이야. 적은 답과 근거는 진단 분석을 위해 저장돼.</label>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="diag-buttons"><button type="button" className="diag-primary" disabled={!agreed || busy} onClick={start}>시작하기</button></div></section>
  </div></main>;
}

export function ChoosePage({ title, number, total, busy, error, choose }: {
  title: string; number: number; total: number; busy: boolean; error: string; choose: (summary: boolean) => void;
}): React.JSX.Element {
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><p className="diag-sub">지문 {number}/{total}</p><h1>{title}</h1></header>
    <section className="diag-card">
      {error && <p className="err" role="alert">{error}</p>}
      <div className="diag-buttons"><button type="button" className="diag-primary" disabled={busy} onClick={() => choose(true)}>문단별로 요약하고 풀기</button>
        <button type="button" className="diag-secondary" disabled={busy} onClick={() => choose(false)}>요약 없이 풀기</button></div></section>
  </div></main>;
}

export function MidPage({ title, number, total, card, start, error }: {
  title: string; number: number; total: number; card: SummaryCardView | null; start: () => void; error: string;
}): React.JSX.Element {
  const ready = card;
  const bar = ready ? rangeBar(ready.position.percentile.low, ready.position.percentile.high) : null;
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><p className="diag-sub">지문 {number}/{total}</p><h1>{title}</h1></header>
    <section className="diag-card" aria-label="이 지문 결과"><span className="diag-label">이 지문 결과</span>
      {ready ? <>
        <p className="diag-sentence" data-testid="passage-result">{passageResultSentence(ready)}</p>
        <div className="diag-cellrow"><div>{ready.items.map(item => <span key={item.questionId} className="diag-cell" data-state={cellState({ review: false, correct: item.correct })} data-checking={item.category === 'CHECKING'}>{item.questionNumber}</span>)}</div></div></>
        : <p className="diag-muted" role="status">{PENDING_TEXT}</p>}</section>
    {ready && bar && <section className="diag-card" aria-label="이 지문까지의 위치"><div className="diag-card-head"><span className="diag-label">이 지문까지의 위치</span><span className="diag-sub">수능 기준 환산 추정</span></div>
      <p className="diag-big">{gradeText(ready.position.grade)}</p>
      <div className="diag-track"><div style={{ left: `${bar.left}%`, width: `${bar.width}%` }} /></div></section>}
    <section className="diag-card">{error && <p className="err" role="alert">{error}</p>}
      <div className="diag-buttons"><button type="button" className="diag-primary" disabled={ready === null || !ready.firstItemOpen} onClick={start}>피드백 시작</button></div></section>
  </div></main>;
}
