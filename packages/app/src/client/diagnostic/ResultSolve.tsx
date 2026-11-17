/** ② 문제 풀이 결과: 분해 막대(설계 2절)와 문항 카드(설계 3절). 라벨이 아니라 선지 구절 ↔ 원문 짝으로 왜 틀렸는지 보여 준다. */
import { useState } from 'react';
import type { ResultItem, ResultTwist, ResultView as Result, SetInfo } from './types.js';
import { postSelfCheck } from './api.js';
import { Notice, Segs, glossOf, passageTitles } from './ResultShared.js';
import {
  MEGASTUDY_NOTE, RESULT_GROUP_MARK, SELF_CHECK_CHOICES, annotateSegments, annotateSymbols, answerQuality, boldQuotes, breakdown, circled, circledObject, excerptAround,
  hasPair, percentPair, resultGroup, sourceLocationName, summaryLinkSentence, twistName, twistsForPairs, type BreakdownCell, type TextSegment,
} from './logic.js';

// ---------- 분해 막대 ----------

function Chip({ item, titles, open, onToggle }: { item: ResultItem; titles: Record<string, string>; open: string | null; onToggle: (questionId: string) => void }) {
  const title = titles[item.passageId] ?? '';
  const group = resultGroup(item.category); const analyzing = item.category === 'PENDING' || item.category === 'CHECKING';
  return <button type="button" className="diag-cell" data-group={group} data-analyzing={analyzing} aria-expanded={open === item.questionId} aria-controls="diag-item-card"
    aria-label={`${title} ${item.questionNumber}번, ${analyzing ? '분석 중' : RESULT_GROUP_MARK[group]}`} onClick={() => onToggle(item.questionId)}>
    <b>{item.questionNumber}</b><small>{title.slice(0, 2)}</small></button>;
}

function Side({ side, cells2, cells3, count, titles, open, onToggle }: { side: 'correct' | 'wrong'; cells2: BreakdownCell[]; cells3: BreakdownCell[]; count: number;
  titles: Record<string, string>; open: string | null; onToggle: (questionId: string) => void }) {
  return <div className="diag-bd-side" data-side={side}>
    <div className="diag-bd-head">{side === 'correct' ? '정답' : '오답'} <b>{count}</b></div>
    <div className="diag-bd-row2">{cells2.map(cell => <div key={cell.key} className="diag-bd-seg" style={{ flexGrow: cell.items.length }}>{cell.label} <b>{cell.items.length}</b></div>)}</div>
    <div className="diag-bd-row3">{cells3.map(cell => <div key={cell.key} className="diag-bd-cell" data-gray={cell.gray === true} style={{ flexGrow: cell.items.length }}>
      {cell.label !== '' && <span className="diag-bd-label">{cell.label}</span>}
      <div className="diag-bd-chips">{cell.items.map(item => <Chip key={item.questionId} item={item} titles={titles} open={open} onToggle={onToggle} />)}</div></div>)}</div>
  </div>;
}

function Breakdown({ result, set, open, onToggle }: { result: Result; set: SetInfo; open: string | null; onToggle: (questionId: string) => void }) {
  const titles = passageTitles(set);
  const total = set.passages.reduce((sum, p) => sum + p.questionIds.length, 0);
  const bar = breakdown(result.items, total, result.qualityTiers);
  if (result.items.length === 0) return null;
  return <div className="diag-bd" data-testid="breakdown" style={{ gridTemplateColumns: `${Math.max(bar.correct, 0)}fr ${Math.max(bar.wrong, 0)}fr` }}>
    <div className="diag-bd-thin" aria-hidden="true"><div data-side="correct" style={{ flexGrow: bar.correct }} /><div data-side="wrong" style={{ flexGrow: bar.wrong }} /></div>
    {bar.correct > 0 && <Side side="correct" cells2={bar.row2.correct} cells3={bar.row3.correct} count={bar.correct} titles={titles} open={open} onToggle={onToggle} />}
    {bar.wrong > 0 && <Side side="wrong" cells2={bar.row2.wrong} cells3={bar.row3.wrong} count={bar.wrong} titles={titles} open={open} onToggle={onToggle} />}
  </div>;
}

// ---------- 문항 카드 ----------

type Gloss = Readonly<Record<string, string>>;

interface PairData { name: string; choice: TextSegment[]; evidence: TextSegment[] | null; changed: string | null }
/** 함정 짝: "선지: … **구절** …" ↔ "원문: **evidenceQuote**". 함정 이름은 작은 머리말로만 쓴다. 원문 쪽이 비면 원문 줄은 생략한다(원문 근거 상자가 대신한다).
 * 기호 풀이의 첫 등장 순서를 화면 순서와 맞추려고 자료를 렌더링 전에 순서대로 만든다. */
function pairData(twists: ResultItem['twist'], choiceText: string, gloss: Gloss, seen: Set<string>): PairData[] {
  return (twists ?? []).filter(t => t.choiceQuote !== '').map(t => ({ name: twistName(t.twistType),
    choice: annotateSegments(excerptAround(choiceText, t.choiceQuote), gloss, seen),
    evidence: t.evidenceQuote === '' ? null : annotateSegments([{ text: t.evidenceQuote, bold: true }], gloss, seen),
    changed: t.studentText === null ? null : annotateSymbols(t.studentText, gloss, seen) }));
}
function Pairs({ pairs }: { pairs: readonly PairData[] }) {
  return <>{pairs.map((pair, i) => <div key={i} className="diag-twist" data-testid="twist-pair">
    <span className="diag-warn">{pair.name}</span>
    <p className="diag-pair-choice"><span className="diag-pair-tag">선지</span> <Segs segments={pair.choice} /></p>
    {pair.evidence && <p className="diag-pair-source"><span className="diag-pair-tag">원문</span> <Segs segments={pair.evidence} /></p>}
    {pair.changed && <p>{pair.changed}</p>}
  </div>)}</>;
}

function SelfCheck({ selected, error, onSelect }: { selected: string | null; error: boolean; onSelect: (choice: string) => void }) {
  return <div className="diag-selfcheck" data-testid="self-check">
    <p>어디서 헷갈렸는지는 몰라. 어디서 헷갈렸어?</p>
    <div className="diag-buttons">{SELF_CHECK_CHOICES.map(choice => <button key={choice} type="button" className="diag-secondary diag-choice" aria-pressed={selected === choice} onClick={() => onSelect(choice)}>{choice}</button>)}</div>
    {error && <p className="err" role="alert">저장하지 못했어. 다시 눌러 줘.</p>}
  </div>;
}

function Card({ item, titles, result, selfCheck, selfCheckError, onSelfCheck, onClose }: { item: ResultItem; titles: Record<string, string>; result: Result; selfCheck: string | null;
  selfCheckError: boolean; onSelfCheck: (choice: string) => void; onClose: () => void }) {
  const title = `${titles[item.passageId] ?? ''} ${item.questionNumber}번`;
  const head = <div className="diag-item-head"><h3>{title} · {circledObject(item.chosenPosition)} 골랐어</h3>{!item.review && <span className={item.correct ? 'diag-right' : 'diag-wrong'}>{item.correct ? '정답' : '오답'}</span>}
    <button type="button" className="diag-close" onClick={onClose}>접기</button></div>;
  const stats = <div className="diag-stats2">
    <div><span>{circledObject(item.chosenPosition)} 고른 비율</span><strong>{percentPair(item.megastudy.chosenPercents)}</strong></div>
    <div><span>이 문항 정답률</span><strong>{percentPair(item.megastudy.correctRate)}</strong></div></div>;
  if (item.review) return <article className="diag-item" id="diag-item-card" aria-label={`${title} 카드`}>{head}
    <p>이 문항은 우리가 한 번 더 확인하고 있어.</p>{stats}<p className="diag-muted">{MEGASTUDY_NOTE}</p></article>;

  // 기호 풀이는 한 카드 안에서 처음 나올 때만 붙는다. 화면에 나오는 순서대로 이어서 부른다.
  const gloss = glossOf(result, item.passageId); const seen = new Set<string>();
  const missedAnswer = !item.correct && item.stemPolarity === 'SELECT_INCORRECT';
  const stem = annotateSymbols(item.stem, gloss, seen);
  const quotes = item.correct || missedAnswer ? [] : (item.twist ?? []).map(t => t.choiceQuote);
  const chosen: TextSegment[] = annotateSegments([{ text: `${circled(item.chosenPosition)} `, bold: false }, ...boldQuotes(item.chosenText, quotes)], gloss, seen);
  const source = (item.evidence?.source ?? []).flatMap(s => sourceLocationName(s.location) === null ? [] : [s.quote]);
  const pairTwists = twistsForPairs(item);
  const missingPair = !item.correct && (pairTwists ?? []).some(t => !hasPair(t));
  const student = item.evidence?.student ?? null;
  const showSource = source.length > 0 && (student !== null || missingPair);
  const weakCorrect = item.correct && !item.elimination && (item.category === 'WEAK_CORRECT' || item.category === 'ERROR_CORRECT');
  const summaryLine = item.summaryLink === null ? null : summaryLinkSentence(item.summaryLink, titles[item.passageId] ?? '', item.questionNumber);
  const omittedWrong = !item.correct && item.rationale === 'OMITTED';

  const pairs = missedAnswer ? [] : pairData(item.twist, item.chosenText, gloss, seen);
  const mine = student === null ? null : annotateSymbols(student, gloss, seen);
  const sourceNotes = showSource ? source.map(quote => annotateSymbols(quote, gloss, seen)) : [];
  const answerSegs = missedAnswer && item.answerText !== null && item.answerPosition !== null
    ? annotateSegments([{ text: `${circled(item.answerPosition)} `, bold: false }, ...boldQuotes(item.answerText, (item.answerTwist ?? []).map(t => t.choiceQuote))], gloss, seen) : null;
  const answerPairs = missedAnswer ? pairData(item.answerTwist, item.answerText ?? '', gloss, seen) : [];

  return <article className="diag-item" id="diag-item-card" aria-label={`${title} 카드`}>{head}
    <p className="diag-stem">{stem}</p>
    <p className="diag-chosen" data-testid="chosen-choice"><Segs segments={chosen} /></p>
    {item.correct && (item.category === 'PENDING' ? <Notice status="pending" /> : <p className="diag-quality">{answerQuality(item, result.qualityTiers)}</p>)}
    {stats}<p className="diag-muted">{MEGASTUDY_NOTE}</p>
    {missedAnswer && <p className="diag-line">고른 선지는 지문과 맞는 말이야.</p>}
    <Pairs pairs={pairs} />
    {weakCorrect && showSource && <p className="diag-warn">답은 맞았는데 근거에서 빠진 것</p>}
    {mine !== null && <div className="diag-evidence"><div className="diag-mine"><span>내 근거</span><br />{mine}</div>
      {showSource && <div className="diag-source"><span>{weakCorrect ? '결정적 원문' : '원문은 이렇게 말해'}</span>{sourceNotes.map((quote, i) => <p key={i}>{quote}</p>)}</div>}</div>}
    {mine === null && showSource && <div className="diag-source"><span>{weakCorrect ? '결정적 원문' : '원문은 이렇게 말해'}</span>{sourceNotes.map((quote, i) => <p key={i}>{quote}</p>)}</div>}
    {answerSegs && <div className="diag-missed" data-testid="missed-answer"><h4>네가 놓친 진짜 틀린 선지</h4><p className="diag-chosen"><Segs segments={answerSegs} /></p><Pairs pairs={answerPairs} /></div>}
    {summaryLine !== null && <p className="diag-line" data-status={item.summaryLink!.status}>{summaryLine}</p>}
    {omittedWrong && <SelfCheck selected={selfCheck} error={selfCheckError} onSelect={onSelfCheck} />}
    {(item.afterFeedback.corrected || item.afterFeedback.skipped) && <div className="diag-after">{item.afterFeedback.corrected && <span>피드백으로 고쳤어</span>}{item.afterFeedback.skipped && <span>건너뜀</span>}</div>}
    {item.strategyAvailable && <a className="diag-secondary diag-strategy" href={`/problem/lab?questionId=${encodeURIComponent(item.questionId)}`}>문항으로 돌아가 출제자 설명 보기 →</a>}
  </article>;
}

export function Solve({ result, set, participantId, open, onToggle, onClose }: { result: Result; set: SetInfo; participantId: string; open: string | null;
  onToggle: (questionId: string) => void; onClose: () => void }) {
  const titles = passageTitles(set);
  const total = set.passages.reduce((sum, p) => sum + p.questionIds.length, 0);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const opened = result.items.find(item => item.questionId === open);
  async function select(questionId: string, choice: string) {
    const before = chosen[questionId];
    setChosen(current => ({ ...current, [questionId]: choice })); setFailed(null);
    try { await postSelfCheck(participantId, questionId, choice); }
    catch {
      setChosen(current => { const next = { ...current }; if (before === undefined) delete next[questionId]; else next[questionId] = before; return next; });
      setFailed(questionId);
    }
  }
  return <>
    <p className="diag-line" data-testid="solve-lead">처음 고른 답 기준 정답 {result.items.filter(item => item.correct).length} / {total}. 코칭 뒤 고쳐 고른 답은 점수에 넣지 않았어.</p>
    <Breakdown result={result} set={set} open={open} onToggle={onToggle} />
    {opened && <Card key={opened.questionId} item={opened} titles={titles} result={result} selfCheck={chosen[opened.questionId] ?? opened.selfCheck?.choice ?? null}
      selfCheckError={failed === opened.questionId} onSelfCheck={choice => void select(opened.questionId, choice)} onClose={onClose} />}
  </>;
}
