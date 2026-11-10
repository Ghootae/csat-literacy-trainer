/** 개발자 지도(D-0217): 지문 > 단계 > 칸의 위치와 상태, 칸 이동, 지문 초기화, 이전/다음 화면 버튼. `?dev=1`에서만 그린다. */
import { CELL_STATUS_LABEL, type Cell } from './dev-flow.js';
import type { DevMapPassage } from './dev-api.js';

export function DevMap({ flow, passages, currentKey, busy, error, open, reset, previous, next }: {
  flow: readonly Cell[]; passages: readonly DevMapPassage[]; currentKey: string; busy: boolean; error: string;
  open: (cell: Cell) => void; reset: (passageId: string) => void; previous: (() => void) | null; next: (() => void) | null;
}): React.JSX.Element {
  const current = flow.find(cell => cell.key === currentKey);
  const chip = (cell: Cell) => <button key={cell.key} type="button" className="diag-dev-cell" data-status={cell.status} data-testid={`dev-cell-${cell.key}`}
    aria-current={cell.key === currentKey ? 'true' : undefined} disabled={busy} onClick={() => open(cell)}>
    {cell.label}<small>{CELL_STATUS_LABEL[cell.status]}</small></button>;
  return <aside className="diag-dev" aria-label="개발자 지도">
    <div className="diag-dev-bar">
      <strong>개발자 지도</strong>
      <button type="button" disabled={busy || !previous} onClick={() => previous?.()}>이전 화면</button>
      <button type="button" disabled={busy || !next} onClick={() => next?.()}>다음 화면</button>
      <span data-testid="dev-current">{current ? `지금: ${current.passageId ? `${passages.find(p => p.passageId === current.passageId)?.title ?? ''} · ` : ''}${current.label}` : ''}</span>
      {error && <span className="diag-dev-error" role="alert">{error}</span>}
    </div>
    <details className="diag-dev-map" open>
      <summary>지도 접기·펴기</summary>
      {passages.map((passage, index) => {
        const cells = flow.filter(cell => cell.passageId === passage.passageId);
        return <div key={passage.passageId} className="diag-dev-passage">
          <div className="diag-dev-passage-head"><b>지문 {index + 1} {passage.title}</b>
            <button type="button" disabled={busy} data-testid={`dev-reset-${passage.passageId}`} onClick={() => { if (window.confirm(`지문 ${index + 1}을 시작 전으로 되돌릴까요? 요약·답·피드백이 지워집니다.`)) reset(passage.passageId); }}>지문 초기화</button></div>
          <div className="diag-dev-cells">{cells.map(chip)}</div>
        </div>;
      })}
      <div className="diag-dev-cells">{flow.filter(cell => cell.kind === 'result').map(chip)}</div>
    </details>
  </aside>;
}
