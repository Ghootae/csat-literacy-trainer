/** 결과 화면(설계 10절): 맨 위 요약 → ① 내 위치 → ② 문제 풀이 → ③ 독해 패턴 → 추천. */
import { useEffect, useState } from 'react';
import type { SetInfo, ResultItem, ResultView as Result } from './types.js';
import { GradeAxis, GradeBar } from './GradeBar.js';
import { Notice, Segs, glossOf, passageTitles } from './ResultShared.js';
import { Reading } from './ResultReading.js';
import { Solve } from './ResultSolve.js';
import {
  SERVICE_NOTE, POSITION_NOTE, accurateCorrect, annotateSegments, annotateSymbols, caseAnchor, caseHeading, circled, clip, excerptAround, gradeSentence, hasPair, pickFirstLook, twistsForPairs,
  type FirstLook,
} from './logic.js';

// ---------- 맨 위 요약 ----------

/** "가장 먼저 볼 것" 상자(설계 8절, 묶음이 없을 때). 출처 줄, 지문(또는 선지) 문장, "너는 …" 문장, 해당 카드·사례로 가는 링크. */
function FirstLookBox({ look, result, titles, onShowCard }: { look: FirstLook; result: Result; titles: Record<string, string>; onShowCard: (questionId: string) => void }) {
  const seen = new Set<string>();
  if (look.kind === 'case') {
    const { entry } = look; const gloss = glossOf(result, entry.passageId);
    const source = entry.case.sourceTexts.slice(0, 2).map(text => annotateSymbols(clip(text, 140), gloss, seen));
    const mine = entry.case.studentText === '' ? null : annotateSymbols(clip(entry.case.studentText, 140), gloss, seen);
    return <div className="diag-look" data-testid="first-look" data-source="reading">
      <p className="diag-label2">가장 먼저 볼 것</p>
      <p className="diag-look-source">요약 · {titles[entry.passageId] ?? ''} {entry.case.paragraphLabel}</p>
      {source.map((text, i) => <p key={i} className="diag-look-text"><span className="diag-pair-tag">지문</span> <strong>{text}</strong></p>)}
      {mine && <p className="diag-look-mine">너는 요약에 &ldquo;{mine}&rdquo;라고 썼어.</p>}
      <a className="diag-look-link" href={`#${caseAnchor(entry)}`}>{caseHeading(entry.case, titles[entry.passageId] ?? '')} 보러 가기 →</a>
    </div>;
  }
  const item: ResultItem = look.item; const gloss = glossOf(result, item.passageId);
  const pair = (twistsForPairs(item) ?? []).find(hasPair);
  const choiceText = item.stemPolarity === 'SELECT_INCORRECT' ? item.answerText ?? '' : item.chosenText;
  const choice = pair ? annotateSegments(excerptAround(choiceText, pair.choiceQuote), gloss, seen) : null;
  const evidence = pair ? annotateSegments([{ text: clip(pair.evidenceQuote, 140), bold: true }], gloss, seen) : null;
  const source = pair ? null : item.evidence?.source[0]?.quote ?? null;
  const sourceText = source === null ? null : annotateSymbols(clip(source, 140), gloss, seen);
  const student = item.evidence?.student ?? null;
  const mine = student === null ? null : annotateSymbols(clip(student, 140), gloss, seen);
  return <div className="diag-look" data-testid="first-look" data-source="item">
    <p className="diag-label2">가장 먼저 볼 것</p>
    <p className="diag-look-source">문제 풀이 · {titles[item.passageId] ?? ''} {item.questionNumber}번</p>
    {choice && <p className="diag-look-text"><span className="diag-pair-tag">{item.stemPolarity === 'SELECT_INCORRECT' ? `놓친 선지 ${circled(item.answerPosition ?? 0)}` : `선지 ${circled(item.chosenPosition)}`}</span> <Segs segments={choice} /></p>}
    {evidence && <p className="diag-look-text"><span className="diag-pair-tag">원문</span> <Segs segments={evidence} /></p>}
    {sourceText && <p className="diag-look-text"><span className="diag-pair-tag">원문</span> <strong>{sourceText}</strong></p>}
    {mine && <p className="diag-look-mine">너는 &ldquo;{mine}&rdquo;라고 적었어.</p>}
    <a className="diag-look-link" href="#diag-item-card" onClick={event => { event.preventDefault(); onShowCard(item.questionId); }}>{titles[item.passageId] ?? ''} {item.questionNumber}번 카드 보기 →</a>
  </div>;
}

function TopSummary({ result, set, onShowCard }: { result: Result; set: SetInfo; onShowCard: (questionId: string) => void }) {
  const total = set.passages.reduce((sum, p) => sum + p.questionIds.length, 0);
  const correct = result.items.filter(item => item.correct).length;
  const grade = result.position.status === 'ready' ? `추정 ${result.position.grade.mode}등급` : '등급 계산 중';
  // 2단계에서 `summaryGroups`(두 번 이상 나온 실수 묶음)가 들어오면 그것을 올린다. 지금은 늘 null이라 "가장 먼저 볼 것" 하나로 대신한다.
  const look = result.summaryGroups === null ? pickFirstLook(result.items, result.reading) : null;
  return <section className="diag-card diag-top" aria-label="요약">
    <p className="diag-sentence" data-testid="headline">처음 고른 답 기준 정답 {correct} / {total} · 근거까지 맞은 정답 {accurateCorrect(result.items, result.qualityTiers)} · {grade}</p>
    {look && <FirstLookBox look={look} result={result} titles={passageTitles(set)} onShowCard={onShowCard} />}
  </section>;
}

// ---------- ① 내 위치 ----------

function Position({ result }: { result: Result }) {
  if (result.position.status === 'pending') return <Notice status="pending" />;
  const { grade, byPassage } = result.position;
  const percentOf = (probabilities: number[], mode: number) => Math.round(probabilities[mode - 1]! * 100);
  return <>
    <p className="diag-big" data-testid="grade">{grade.mode}등급</p>
    <p className="diag-gradeline" data-testid="grade-sentence">{gradeSentence(grade.probabilities, grade.mode)}</p>
    <GradeBar grade={grade} />
    <div className="diag-narrowing"><p className="diag-label2">지문을 풀수록 또렷해진 위치</p>
      <div className="diag-narrowing-grid">{byPassage.map((p, i) => {
        const last = i === byPassage.length - 1;
        return <div key={p.passageId} className="diag-narrowing-row" data-testid="passage-row" data-last={last}>
          <span>{i === 0 ? '지문 1' : `지문 1~${i + 1}`}</span><GradeBar grade={p.grade} small />
          <span>{p.grade.mode}등급 · {percentOf(p.grade.probabilities, p.grade.mode)}%</span></div>;
      })}
        <div className="diag-narrowing-row diag-narrowing-axis" data-testid="grade-axis"><span /><GradeAxis /><span /></div></div></div>
    <p className="diag-muted">{POSITION_NOTE}</p>
  </>;
}

export function ResultView({ result, set, participantId }: { result: Result; set: SetInfo; participantId: string }): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(null);
  const [scrollKey, setScrollKey] = useState(0);
  // 맨 위 요약의 링크: 카드를 연 채 그 카드로 스크롤한다.
  useEffect(() => { if (scrollKey > 0) document.getElementById('diag-item-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [scrollKey]);
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><h1>독해력 진단 결과</h1></header>
    <TopSummary result={result} set={set} onShowCard={questionId => { setOpen(questionId); setScrollKey(key => key + 1); }} />
    <section className="diag-card" aria-label="내 위치"><div className="diag-card-head"><span className="diag-label">① 내 위치</span><span className="diag-sub">수능 기준 환산 추정</span></div><Position result={result} /></section>
    <section className="diag-card" aria-label="문제 풀이 결과"><span className="diag-label">② 문제 풀이 결과</span>
      <Solve result={result} set={set} participantId={participantId} open={open} onToggle={questionId => setOpen(open === questionId ? null : questionId)} onClose={() => setOpen(null)} /></section>
    <section className="diag-card" aria-label="독해 패턴"><span className="diag-label">③ 독해 패턴</span><Reading result={result} set={set} /></section>
    <section className="diag-card" aria-label="추천"><span className="diag-label">추천</span><p className="diag-line">{SERVICE_NOTE}</p></section>
  </div></main>;
}
