/** ② 문항 카드의 3층 구조(인계 docs/handoffs/2026-11-20-wrong-card-3-layer-impl.md): 1층 한 문장·기호 풀이·선택률, 2층 근거 짝, 3층 "자세히 보기". `card.status === 'ready'`일 때만 쓴다. */
import type { ReactNode } from 'react';
import type { ResultItem, WrongCardView } from './types.js';
import { Segs } from './ResultShared.js';
import { MEGASTUDY_NOTE, circled, hasAnswerButton, circledObject, focusSegments, parseBold, percentPair, summaryLinkSentence } from './logic.js';

type ReadyCard = Extract<WrongCardView, { status: 'ready' }>;

function Arrow() { return <div className="diag-l2-arrow" aria-hidden="true">↓</div>; }

/** `selfCheck`는 근거 없는 오답에서 자기 점검 버튼 자리에 끼우는 조각(버튼 동작은 ResultSolve가 맡는다). */
export function LayeredCard({ item, card, passageTitle, selfCheck, onClose, expanded = false, onExpandedChange, onOpenAnswer }: { item: ResultItem; card: ReadyCard; passageTitle: string; selfCheck: ReactNode; onClose: () => void;
  /** 3층 펼침 상태(결과 화면이 들고 있어 정답 해설 화면에 다녀와도 유지된다). */
  expanded?: boolean; onExpandedChange?: (expanded: boolean) => void;
  /** 있으면 정답 선지 칸 아래에 "정답 해설 보기" 버튼을 둔다. */
  onOpenAnswer?: () => void }) {
  const omitted = item.rationale === 'OMITTED';
  const missed = !item.correct && item.stemPolarity === 'SELECT_INCORRECT' && card.missedAnswer !== undefined;
  const title = `${passageTitle} ${item.questionNumber}번`;
  const summaryLine = item.summaryLink === null ? null : summaryLinkSentence(item.summaryLink, passageTitle, item.questionNumber);
  return <article className="diag-item diag-card3" id="diag-item-card" aria-label={`${title} 카드`}>
    <div className="diag-item-head"><h3>{title} · {circledObject(item.chosenPosition)} 골랐어</h3><span className={item.correct ? 'diag-right' : 'diag-wrong'}>{item.correct ? '정답' : '오답'}</span>
      <button type="button" className="diag-close" onClick={onClose}>접기</button></div>
    <p className="diag-l0" data-testid="card-stem">{item.stem}</p>
    <p className="diag-l0" data-testid="card-chosen">{circled(item.chosenPosition)} {item.chosenText}</p>

    <section className="diag-l1" data-testid="card-layer1">
      <p className="diag-l1-text">{card.layer1}</p>
      {card.symbolGlosses.length > 0 && <>
        <hr className="diag-l1-rule" />
        <dl className="diag-l1-gloss" data-testid="card-symbols">{card.symbolGlosses.map(g => <div key={g.symbol}><dt>{g.symbol}</dt><dd>{g.gloss}</dd></div>)}</dl></>}
      {!item.correct && <p className="diag-muted" data-testid="card-rate">{circledObject(item.chosenPosition)} 고른 수험생 {percentPair(item.megastudy.chosenPercents)}</p>}
    </section>

    <section className="diag-l2" data-testid="card-layer2">
      <div className="diag-l2-box" data-kind="top"><span className="diag-l2-label">{omitted ? '선지에서 맞는 부분' : '내 근거'}</span><p><Segs segments={parseBold(card.pair.top)} /></p></div>
      <Arrow />
      <div className="diag-l2-box" data-kind="source"><span className="diag-l2-label">원문</span><p><Segs segments={focusSegments(card.pair.source, card.pair.sourceFocus)} /></p></div>
      <Arrow />
      <div className="diag-l2-box" data-kind="so"><span className="diag-l2-label">그래서</span><p>{card.pair.conclusion}</p></div>
      {!item.correct && item.answerPosition !== null && item.answerText !== null
        && <div className="diag-l2-answer" data-testid="card-answer"><span className="diag-l2-label">정답 선지</span><p>{circled(item.answerPosition)} {item.answerText}</p>
          {onOpenAnswer && hasAnswerButton(item) && <button type="button" className="diag-secondary" data-testid="open-answer" onClick={onOpenAnswer}>문항 화면에서 정답 해설 보기</button>}</div>}
      {missed && <div className="diag-missed" data-testid="missed-answer"><h4>네가 놓친 진짜 틀린 선지</h4><p>{card.missedAnswer!.text}</p>
        <div className="diag-l2-box" data-kind="source"><span className="diag-l2-label">원문</span><p>{card.missedAnswer!.source}</p></div></div>}
      {!item.correct && omitted && <><p className="diag-line">근거를 안 써서 어디서 헷갈렸는지는 몰라. 너는 어땠어?</p>{selfCheck}</>}
    </section>

    <details className="diag-l3" data-testid="card-layer3" open={expanded} onToggle={e => onExpandedChange?.(e.currentTarget.open)}>
      <summary>자세히 보기</summary>
      <div className="diag-l3-body">
        <div><span className="diag-warn">다른 수험생은</span>
          <div className="diag-stats2">
            <div><span>이 문항 정답률</span><strong>{percentPair(item.megastudy.correctRate)}</strong></div>
            <div><span>{circledObject(item.chosenPosition)} 고른 비율</span><strong>{percentPair(item.megastudy.chosenPercents)}</strong></div></div>
          <p className="diag-muted">{MEGASTUDY_NOTE}</p></div>
        <div><span className="diag-warn">출제자가 노린 것</span><p>{card.examinerIntent}</p></div>
        {summaryLine !== null && <div><span className="diag-warn">네 요약과 연결</span><p data-status={item.summaryLink!.status}>{summaryLine}</p></div>}
        {item.strategyAvailable && <a className="diag-secondary diag-strategy" href={`/problem/lab?questionId=${encodeURIComponent(item.questionId)}`}>문항으로 돌아가 출제자 설명 보기 →</a>}
      </div>
    </details>
  </article>;
}
