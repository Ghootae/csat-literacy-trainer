/** 결과 화면(인계 B (5)). 샘플 `Main.dc.html`의 배치와 순서를 따른다: 한 페이지, ① → ② → ③ → 추천. */
import { useState } from 'react';
import type { SetInfo, ResultItem, ResultView as Result } from './types.js';
import { GradeBar } from './GradeBar.js';
import {
  FAILED_TEXT, MEGASTUDY_NOTE, PENDING_TEXT, POSITION_NOTE, RESULT_GROUP_MARK, answerQuality, branchRows, cardStepName, cardTwists, circledObject, gradeSentence,
  layerSentence, percentPair, recommendationLines, resultGroup, solveStats, sourceLocationName, stepTendency, sumCounts, summaryLinkSentence, twistTags,
} from './logic.js';

type Box = 'pending' | 'ready' | 'failed';
const boxText = (status: Box) => status === 'pending' ? PENDING_TEXT : FAILED_TEXT;
function Notice({ status }: { status: Exclude<Box, 'ready'> }) { return <p className="diag-muted" role="status">{boxText(status)}</p>; }

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
      })}</div></div>
    <p className="diag-muted">{POSITION_NOTE}</p>
  </>;
}

// ---------- ② 문제 풀이 결과 ----------

function Card({ item, titles, tiers, onClose }: { item: ResultItem; titles: Record<string, string>; tiers: Result['qualityTiers']; onClose: () => void }) {
  const title = `${titles[item.passageId] ?? ''} ${item.questionNumber}번`;
  const same = <div className="diag-stats2">
    <div><span>{circledObject(item.chosenPosition)} 고른 비율</span><strong>{percentPair(item.megastudy.chosenPercents)}</strong></div>
    <div><span>이 문항 정답률</span><strong>{percentPair(item.megastudy.correctRate)}</strong></div></div>;
  if (item.review) return <article className="diag-item" id="diag-item-card" aria-label={`${title} 카드`}>
    <div className="diag-item-head"><h3>{title} · {circledObject(item.chosenPosition)} 골랐어</h3><button type="button" className="diag-close" onClick={onClose}>접기</button></div>
    <p>이 문항은 우리가 한 번 더 확인하고 있어.</p>{same}<p className="diag-muted">{MEGASTUDY_NOTE}</p></article>;
  const twists = cardTwists(item.twist); const step = cardStepName(item);
  const source = (item.evidence?.source ?? []).flatMap(s => { const name = sourceLocationName(s.location); return name === null ? [] : [{ name, quote: s.quote }]; });
  return <article className="diag-item" id="diag-item-card" aria-label={`${title} 카드`}>
    <div className="diag-item-head"><h3>{title} · {circledObject(item.chosenPosition)} 골랐어</h3><span className={item.correct ? 'diag-right' : 'diag-wrong'}>{item.correct ? '정답' : '오답'}</span>
      <button type="button" className="diag-close" onClick={onClose}>접기</button></div>
    {item.correct && (item.category === 'PENDING' ? <Notice status="pending" /> : <p className="diag-quality">{answerQuality(item, tiers)}</p>)}
    {same}<p className="diag-muted">{MEGASTUDY_NOTE}</p>
    {!item.correct && twists.map((t, i) => <div key={i} className="diag-twist"><span className="diag-warn">걸린 함정 · {t.name}</span>{t.line && <p>{t.line}</p>}{t.changed && <p>{t.changed}</p>}</div>)}
    {item.thoughtDiagnosis !== null && item.thoughtDiagnosis.status !== 'ready' && <Notice status={item.thoughtDiagnosis.status} />}
    {step && <span className="diag-step">어긋난 단계 · {step}</span>}
    {item.evidence !== null && (item.evidence.student !== null || source.length > 0) && <div className="diag-evidence">
      {item.evidence.student !== null && <div className="diag-mine"><span>내 근거</span><br />{item.evidence.student}</div>}
      {source.length > 0 && <div className="diag-source"><span>원문 · {source.map(s => s.name).join('·')}</span>{source.map((s, i) => <p key={i}>{s.quote}</p>)}</div>}</div>}
    {(item.afterFeedback.corrected || item.afterFeedback.skipped) && <div className="diag-after">{item.afterFeedback.corrected && <span>피드백으로 고쳤어</span>}{item.afterFeedback.skipped && <span>건너뜀</span>}</div>}
  </article>;
}

function Solve({ result, set }: { result: Result; set: SetInfo }) {
  const [open, setOpen] = useState<string | null>(null);
  const titles = Object.fromEntries(set.passages.map(p => [p.passageId, p.title]));
  const total = set.passages.reduce((sum, p) => sum + p.questionIds.length, 0);
  const stats = solveStats(result.items, total, result.qualityTiers); const tendency = stepTendency(result.steps); const tags = twistTags(result.twists.counts);
  const opened = result.items.find(item => item.questionId === open);
  return <>
    <div className="diag-stats3">
      <div><span>정답</span><strong>{stats.correct}<small> / {stats.total}</small></strong></div>
      <div><span>{result.qualityTiers === 2 ? '근거가 확인되는 정답' : '근거까지 정확한 정답'}</span>{stats.qualityDenominator > 0
        ? <strong>{stats.accurate}<small> / 근거를 쓴 정답 {stats.qualityDenominator}</small></strong>
        : <strong><small>근거를 쓴 정답 없음</small></strong>}</div>
      <div><span>근거 없이 낸 정답</span><strong>{stats.sure + stats.unsure}<small> 문항 (확실하다고 한 {stats.sure} · 확신 없이 맞힌 {stats.unsure})</small></strong></div></div>
    {stats.unverified > 0 && <p className="diag-muted">{stats.unverified}개는 정답이지만 근거로 풀이를 확인하지는 못했어.</p>}
    {result.steps.status !== 'ready' ? <Notice status={result.steps.status} />
      : tendency && <div className="diag-block"><h2>어긋난 단계 <small>(경향)</small></h2><p>{tendency.sentence}</p>
        <div className="diag-bars">{tendency.bars.map(bar => <div key={bar.code} className="diag-bar-row"><span>{bar.name}</span>
          <div className="diag-track"><div style={{ width: `${Math.round(bar.ratio * 100)}%` }} data-warn /></div><span>{bar.count}</span></div>)}</div></div>}
    {tags.length > 0 && <div className="diag-block"><h2>걸린 함정</h2><div className="diag-tags">{tags.map(tag => <span key={tag.name} className="diag-tag">{tag.name} {tag.count}</span>)}</div></div>}
    <div className="diag-block"><h2>문항별</h2>
      <div className="diag-cellgrid">{set.passages.map(passage => {
        const items = result.items.filter(item => item.passageId === passage.passageId);
        return items.length === 0 ? null : <div key={passage.passageId} className="diag-cellrow"><span>{passage.title}</span><div>{items.map(item => {
          const group = resultGroup(item.category); const analyzing = item.category === 'PENDING' || item.category === 'CHECKING';
          return <button key={item.questionId} type="button" className="diag-cell" data-group={group} data-analyzing={analyzing} aria-expanded={open === item.questionId} aria-controls="diag-item-card"
            aria-label={`${passage.title} ${item.questionNumber}번, ${analyzing ? '분석 중' : RESULT_GROUP_MARK[group]}`} onClick={() => setOpen(open === item.questionId ? null : item.questionId)}>{item.questionNumber}</button>;
        })}</div></div>;
      })}</div>
      <p className="diag-muted">초록 칸은 정답, 초록 점선 칸은 정답이지만 근거 확인이 필요한 문항, 빨간 칸은 오답이야. 줄무늬 칸은 분석 중이야. 지문 결과의 문제 버튼과 같은 색이야. 칸을 누르면 아래 카드가 펼쳐져.</p></div>
    {opened && <Card item={opened} titles={titles} tiers={result.qualityTiers} onClose={() => setOpen(null)} />}
  </>;
}

// ---------- ③ 독해 패턴 ----------

function Reading({ result, set }: { result: Result; set: SetInfo }) {
  const titles = Object.fromEntries(set.passages.map(p => [p.passageId, p.title]));
  if (result.reading.length === 0) return <p className="diag-muted">요약을 고른 지문이 없어서 이 칸은 비어 있어.</p>;
  const settled = result.reading.filter(r => r.status === 'ready');
  const status: Box = result.reading.some(r => r.status === 'pending') ? 'pending' : result.reading.some(r => r.status === 'failed') ? 'failed' : 'ready';
  const counts = sumCounts(settled); const layers = layerSentence(counts); const rows = branchRows(counts);
  const links = result.items.filter(item => item.summaryLink !== null);
  return <>
    <p className="diag-muted">요약한 지문 {result.reading.length}개({result.reading.map(r => titles[r.passageId]).join(', ')}) 기준 · 첫 요약만</p>
    {status !== 'ready' && <Notice status={status} />}
    {layers && <p className="diag-line">{layers}</p>}
    {rows.map(row => <div key={row.code} className="diag-branch"><div className="diag-branch-head"><strong>{row.name}</strong><span>{row.text}</span></div>
      <p className="diag-muted">{row.line}</p>
      <div className="diag-track"><div style={{ width: `${Math.round(row.caught / row.total * 100)}%` }} /></div>
      {row.wrongText && <p className="diag-warn-text">{row.wrongText}</p>}</div>)}
    {links.length > 0 && <div className="diag-block"><div className="diag-links">{links.map(item => <p key={item.questionId} className="diag-line" data-status={item.summaryLink!.status}>
      {summaryLinkSentence(item.summaryLink!, titles[item.passageId] ?? '', item.questionNumber)}</p>)}</div></div>}
  </>;
}

export function ResultView({ result, set }: { result: Result; set: SetInfo }): React.JSX.Element {
  const recommendation = recommendationLines(result.recommendation, result.twists.counts);
  return <main className="diag-page"><div className="diag-wrap">
    <header className="diag-heading"><h1>독해력 진단 결과</h1></header>
    <section className="diag-card" aria-label="내 위치"><div className="diag-card-head"><span className="diag-label">① 내 위치</span><span className="diag-sub">수능 기준 환산 추정</span></div><Position result={result} /></section>
    <section className="diag-card" aria-label="문제 풀이 결과"><span className="diag-label">② 문제 풀이 결과</span><Solve result={result} set={set} /></section>
    <section className="diag-card" aria-label="독해 패턴"><span className="diag-label">③ 독해 패턴</span><Reading result={result} set={set} /></section>
    <section className="diag-card" aria-label="추천"><span className="diag-label">추천</span>{recommendation.map((line, i) => <p key={i} className="diag-line">{line}</p>)}</section>
  </div></main>;
}
