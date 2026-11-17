/** ③ 독해 패턴(설계 7절): 요지·묶음 점수 칸, 세부 한 줄, 관계 4갈래를 같은 틀로, 갈래마다 사례 하나와 "사례 더 보기". */
import type { ResultView as Result, SetInfo } from './types.js';
import { Notice, glossOf, passageTitles, type Box } from './ResultShared.js';
import { annotateSymbols, branchRows, caseAnchor, caseEntries, caseHeading, casesOfBranch, detailLine, layerRows, sumCounts, type CaseEntry } from './logic.js';

const percent = (caught: number, total: number) => total === 0 ? 0 : Math.round(caught / total * 100);

/** 사례 상자: "내 요약" = 그 문단의 첫 요약 원문, "지문" = 관계 양 끝 단위의 골드 원문. 설명 줄은 2단계. */
function CaseBox({ entry, result, titles }: { entry: CaseEntry; result: Result; titles: Record<string, string> }) {
  const found = entry.case; const gloss = glossOf(result, entry.passageId); const seen = new Set<string>();
  const mine = found.studentText === '' ? '이 문단은 첫 요약이 기록되지 않았어.' : annotateSymbols(found.studentText, gloss, seen);
  const source = found.sourceTexts.map(text => annotateSymbols(text, gloss, seen));
  return <div className="diag-case" id={caseAnchor(entry)} data-kind={found.kind} data-testid="reading-case">
    <p className="diag-warn">{caseHeading(found, titles[entry.passageId] ?? '')}</p>
    <div className="diag-evidence"><div className="diag-mine"><span>내 요약</span><br />{mine}</div>
      <div className="diag-source"><span>지문</span>{source.map((text, i) => <p key={i}><strong>{text}</strong></p>)}</div></div>
  </div>;
}

export function Reading({ result, set }: { result: Result; set: SetInfo }) {
  const titles = passageTitles(set);
  if (result.reading.length === 0) return <p className="diag-muted">요약을 고른 지문이 없어서 이 칸은 비어 있어.</p>;
  const settled = result.reading.filter(r => r.status === 'ready');
  const status: Box = result.reading.some(r => r.status === 'pending') ? 'pending' : result.reading.some(r => r.status === 'failed') ? 'failed' : 'ready';
  const counts = sumCounts(settled); const layers = layerRows(counts); const detail = detailLine(counts); const entries = caseEntries(result.reading);
  return <>
    <p className="diag-muted">요약한 지문 {result.reading.length}개({result.reading.map(r => titles[r.passageId]).join(', ')}) 기준</p>
    <p className="diag-muted">처음 쓴 요약 기준이야. 질문과 교정으로 보완한 내용은 넣지 않았어.</p>
    {status !== 'ready' && <Notice status={status} />}
    <div className="diag-layers">{layers.map(layer => <div key={layer.key} className="diag-layer" data-testid="layer">
      <span>{layer.name}</span>
      <strong>{layer.total === 0 ? <small>판단한 곳이 없어</small> : <>{layer.caught}<small> / {layer.total}곳</small></>}</strong>
      <div className="diag-track"><div style={{ width: `${percent(layer.caught, layer.total)}%` }} /></div></div>)}</div>
    {detail && <p className="diag-muted" data-testid="detail-line">{detail}</p>}
    {branchRows(counts).map(row => {
      const cases = casesOfBranch(entries, row.code);
      return <div key={row.code} className="diag-branch" data-testid="branch">
        <div className="diag-branch-head"><strong>{row.name}</strong><span>{row.text}</span></div>
        <p className="diag-muted">{row.line}</p>
        <div className="diag-track"><div style={{ width: `${percent(row.caught, row.total)}%` }} /></div>
        {cases[0] && <CaseBox entry={cases[0]} result={result} titles={titles} />}
        {cases.length > 1 && <details className="diag-more"><summary>사례 더 보기 ({cases.length - 1})</summary>
          {cases.slice(1).map(entry => <CaseBox key={caseAnchor(entry)} entry={entry} result={result} titles={titles} />)}</details>}
        {cases.length === 0 && status === 'ready' && <p className="diag-muted">{row.total === 0 ? '이번 요약에서는 판단할 곳이 없었어.' : '이 갈래는 요약에서 모두 잡았어.'}</p>}
      </div>;
    })}
  </>;
}
