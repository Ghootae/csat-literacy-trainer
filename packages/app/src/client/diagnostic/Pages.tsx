/** 시작 안내·요약 선택·지문 결과 화면(인계 B (4), D-0218). */
import { useState } from 'react';
import { MEGASTUDY_NOTE, PENDING_TEXT, RESULT_GROUP_MARK, devCategoryText, finishHint, gradeSentence, resultGroup, resultRow } from './logic.js';
import { GradeBar } from './GradeBar.js';
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

/** 지문 결과 화면(D-0218): 문항 줄 목록(결과는 눌러서 하나씩 공개) → 등급 → 다음 지문. */
export function MidPage({ title, number, total, card, dev, last, busy, error, reveal, review, finish }: {
  title: string; number: number; total: number; card: SummaryCardView | null; dev: boolean; last: boolean; busy: boolean; error: string;
  reveal: (questionId: string) => void; review: (questionId: string) => void; finish: () => void;
}): React.JSX.Element {
  const hint = card ? finishHint(card) : null;
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><p className="diag-sub">지문 {number}/{total}</p><h1>{title}</h1></header>
    <section className="diag-card" aria-label="이 지문의 문제 풀이 결과"><span className="diag-label">이 지문의 문제 풀이 결과</span>
      {card ? <>
        {card.items.length === 0 ? <p className="diag-sentence">답한 문항이 없어.</p>
          : <><p className="diag-muted">문제 번호를 눌러 결과를 하나씩 열어 봐.</p>
            <ul className="diag-rows">{card.items.map(item => {
              const group = resultGroup(item.category); const row = item.revealed ? resultRow(item, card.qualityTiers) : null;
              const analyzing = item.revealed ? row!.analyzing : item.judging || item.category === 'PENDING' || item.category === 'CHECKING';
              return <li key={item.questionId} className="diag-row" data-testid={`row-${item.questionNumber}`} data-revealed={item.revealed}>
                <button type="button" className="diag-qbtn" data-group={group} data-analyzing={analyzing} data-testid={`qbtn-${item.questionNumber}`} disabled={busy && !item.revealed}
                  aria-label={`문제 ${item.questionNumber}, ${analyzing ? '분석 중' : RESULT_GROUP_MARK[group]}${item.revealed ? '' : ', 눌러서 결과 보기'}`}
                  onClick={() => { if (!item.revealed) reveal(item.questionId); }}>
                  <b>문제 {item.questionNumber}</b><small>{analyzing ? '… 분석 중' : RESULT_GROUP_MARK[group]}</small></button>
                {row ? <>
                  <p className="diag-rowtext" data-testid={`desc-${item.questionNumber}`}>{row.description}{dev && <span className="diag-devtag"> {devCategoryText(item.category, item.elimination)}</span>}</p>
                  <button type="button" className="diag-reviewbtn" data-testid={`review-${item.questionNumber}`} data-done={item.reviewDone} disabled={!row.button.enabled} onClick={() => review(item.questionId)}>{row.button.label}</button></>
                  : <><p className="diag-rowtext diag-rowhidden" data-testid={`desc-${item.questionNumber}`}>결과는 가려져 있어</p><span className="diag-reviewbtn diag-reviewhidden" aria-hidden="true" /></>}
              </li>;
            })}</ul>
            {card.items.some(item => item.revealed) && <p className="diag-muted">정답률과 같은 선지를 고른 비율은 {MEGASTUDY_NOTE}(두 수치는 화작 · 언매 순).</p>}</>}</> : <p className="diag-muted" role="status">{PENDING_TEXT}</p>}</section>
    <section className="diag-card" aria-label="이 지문까지의 위치"><div className="diag-card-head"><span className="diag-label">이 지문까지의 위치</span><span className="diag-sub">수능 기준 환산 추정</span></div>
      <p className="diag-big" data-testid="grade-text">{card?.position ? `${card.position.grade.mode}등급` : '나의 현재 등급은?'}</p>
      {card?.position && <p className="diag-gradeline" data-testid="grade-sentence">{gradeSentence(card.position.grade.probabilities, card.position.grade.mode)}</p>}
      <GradeBar grade={card?.position?.grade ?? null} />
      {!card?.position && <p className="diag-muted">모든 문제의 결과를 열어 보면 등급을 알려 줄게.</p>}</section>
    <div className="diag-footer">{error && <p className="err" role="alert">{error}</p>}
      {hint && <p className="diag-muted" role="status" data-testid="finish-hint">{hint}</p>}
      <button type="button" className="diag-primary" data-testid="finish" disabled={card === null || !card.canFinish || busy} onClick={finish}>{last ? '결과 보기' : '다음 지문'}</button></div>
  </div></main>;
}
