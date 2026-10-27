import { useEffect, useMemo, useState } from 'react';
import {
  barScale, defaultExpanded, dimTree, relationsOfNode, sessionLabel, trendPoints, unitText, visibleBranches, visibleRows,
  type AnalysisViewData, type GraphCell, type PassageView, type SessionView, type TrendPoint,
} from './analysis-view-state.js';
import './analysis-view.css';

const KIND_KO: Record<string, string> = { TOP: '지문', CROSS: '문단 묶음', PARAGRAPH_GIST: '문단 요지', COMPOSITE: '합성', PROPOSITION: '명제' };
const LABEL_KO: Record<string, string> = { DIRECT: '직접 드러남', PARTIAL: '일부', ABSENT: '없음', CONTRADICTS: '틀림' };
const BRANCH_ORDER = ['내용', '논증', '관점', '흐름', '기타'];
const pct = (x: number | null): string => (x === null ? '-' : `${Math.round(x * 100)}%`);

async function fetchView(): Promise<AnalysisViewData> {
  const response = await fetch('/api/developer/dialogue-analysis/view');
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `요청 실패 (${response.status})`);
  }
  return response.json() as Promise<AnalysisViewData>;
}

function Bar({ name, cell, scale, onClick, open }: { name: string; cell: GraphCell; scale: number; onClick?: () => void; open?: boolean }): React.JSX.Element {
  const caught = cell.D + cell.P;
  return (
    <div className={`av-bar${cell.smallSample ? ' is-small' : ''}`}>
      <button type="button" className="av-bar-name" onClick={onClick} disabled={onClick === undefined} aria-expanded={open}>{name}</button>
      <div className="av-bar-track" aria-hidden="true">
        <span className="av-bar-caught" style={{ width: `${(caught / scale) * 100}%` }} />
        <span className="av-bar-wrong" style={{ width: `${(cell.C / scale) * 100}%` }} />
      </div>
      <span className="av-bar-num">잡은 {caught} · 틀린 {cell.C}{cell.smallSample ? ' · 아직 적음' : ''}</span>
    </div>
  );
}

function Trend({ points }: { points: readonly TrendPoint[] }): React.JSX.Element {
  const w = 260; const h = 110; const pad = 22;
  const x = (i: number): number => (points.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (points.length - 1));
  const y = (v: number): number => h - pad - v * (h - 2 * pad);
  const line = (pick: (p: TrendPoint) => number | null): string =>
    points.map((p, i) => ({ v: pick(p), i })).filter(d => d.v !== null).map(d => `${x(d.i)},${y(d.v ?? 0)}`).join(' ');
  return (
    <svg className="av-trend" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="지문별 관계 오류율과 포착률">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="av-axis" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} className="av-axis" />
      <text x={2} y={pad + 3} className="av-tick">100%</text>
      <text x={8} y={h - pad + 3} className="av-tick">0</text>
      <polyline points={line(p => p.capture)} className="av-line-capture" />
      <polyline points={line(p => p.errorRate)} className="av-line-error" />
      {points.map((p, i) => (
        <g key={p.passageId}>
          {p.capture !== null && <circle cx={x(i)} cy={y(p.capture)} r={3} className="av-dot-capture" />}
          {p.errorRate !== null && <circle cx={x(i)} cy={y(p.errorRate)} r={4} className="av-dot-error" />}
          <text x={x(i)} y={h - 6} textAnchor="middle" className="av-tick">{p.passageId.slice(0, 8)}</text>
        </g>
      ))}
    </svg>
  );
}

function Graph({ passage, session, passages }: { passage: PassageView; session: SessionView; passages: readonly PassageView[] }): React.JSX.Element {
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const { graph } = session;
  const branches = BRANCH_ORDER.filter(b => visibleBranches(graph.branches).includes(b));
  const scale = barScale(branches.map(b => graph.branches[b]).filter((c): c is GraphCell => c !== undefined));
  // 이 지문에 실제로 나온 유형만 갈래 아래에 보인다(유형 이름·갈래는 relationTypes에서 얻는다).
  const typeInfo = new Map(Object.values(passage.relationTypes).map(t => [t.type, t]));
  const typesOf = (branch: string): string[] => Object.keys(graph.types).filter(t => typeInfo.get(t)?.branch === branch && (graph.types[t]?.D ?? 0) + (graph.types[t]?.P ?? 0) + (graph.types[t]?.A ?? 0) + (graph.types[t]?.C ?? 0) > 0);
  const points = trendPoints(passages, session.sessionId);
  return (
    <section className="av-graph">
      <h2>관계 유형 <small>첫 차례 기준</small></h2>
      <h3>갈래별 누적</h3>
      {branches.map(b => {
        const cell = graph.branches[b];
        if (cell === undefined) return null;
        return (
          <div key={b}>
            <Bar name={b} cell={cell} scale={scale} open={openBranch === b} onClick={() => setOpenBranch(openBranch === b ? null : b)} />
            {openBranch === b && (
              <div className="av-types">
                {typesOf(b).map(t => {
                  const tc = graph.types[t];
                  return tc === undefined ? null : <Bar key={t} name={typeInfo.get(t)?.typeKo ?? t} cell={tc} scale={scale} />;
                })}
              </div>
            )}
          </div>
        );
      })}
      <h3>추이 <small>진한 선 오류율 · 흐린 선 포착률</small></h3>
      <Trend points={points} />
      <h3>틀린 관계 ({graph.wrongRelations.length})</h3>
      {graph.wrongRelations.length === 0 && <p className="av-muted">첫 차례에 틀린 관계가 없다.</p>}
      <ul className="av-wrong">
        {graph.wrongRelations.map(w => {
          const rel = passage.map.relations.find(r => r.id === w.relId);
          const type = passage.relationTypes[w.relId];
          return (
            <li key={`${w.dialogueId}|${w.relId}`}>
              <p><strong>{type?.typeKo ?? ''}</strong> {rel?.name} {w.fixedAfterDialogue && <span className="av-fixed">대화 뒤 고침</span>}</p>
              {rel !== undefined && <p className="av-muted">{unitText(passage.map, rel.fromId)} → {unitText(passage.map, rel.toId)}</p>}
              <blockquote>{w.studentText}</blockquote>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Tree({ passage, session }: { passage: PassageView; session: SessionView | undefined }): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded(passage.map));
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setExpanded(defaultExpanded(passage.map)); setSelected(null); }, [passage]);
  const tree = session?.tree ?? dimTree(passage.map);
  const rows = visibleRows(passage.map, expanded);
  const toggle = (id: string): void => setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const rels = selected === null ? [] : relationsOfNode(passage.map, selected);
  return (
    <section className="av-tree-pane">
      <h2>지문 수형도 <small>마지막 차례 기준</small></h2>
      <div className="av-tree-grid">
        <ul className="av-tree" role="tree">
          {rows.map(r => {
            const cell = tree[r.id];
            const brightness = cell?.brightness ?? 'DIM';
            const complete = r.kind === 'TOP' && session?.complete === true;
            return (
              <li key={r.key} role="treeitem" aria-expanded={r.childCount > 0 ? r.open : undefined} style={{ paddingLeft: r.depth * 18 }}>
                {r.childCount > 0
                  ? <button type="button" className="av-toggle" onClick={() => toggle(r.id)} aria-label={r.open ? '접기' : '펼치기'}>{r.open ? '▾' : '▸'}</button>
                  : <span className="av-toggle" />}
                <button type="button" className={`av-node is-${brightness.toLowerCase()}${complete ? ' is-complete' : ''}${selected === r.id ? ' is-selected' : ''}`} onClick={() => setSelected(r.id)}>
                  <span className="av-kind">{KIND_KO[r.kind] ?? r.kind}</span> {r.text.length > 36 ? `${r.text.slice(0, 36)}…` : r.text}
                  {cell?.computed === true && <em className="av-tag">계산값</em>}
                  {complete && <em className="av-tag is-complete">완료</em>}
                </button>
              </li>
            );
          })}
        </ul>
        <aside className="av-detail">
          {selected === null ? <p className="av-muted">노드를 누르면 문장과 관계가 보인다.</p> : (
            <>
              <p>{unitText(passage.map, selected)}</p>
              <p className="av-muted">밝기 {tree[selected]?.brightness ?? 'DIM'}{tree[selected]?.label !== undefined ? ` · 판정 ${LABEL_KO[tree[selected]?.label ?? ''] ?? tree[selected]?.label}` : ''}{tree[selected]?.computed === true ? ' · 계산값' : ''}</p>
              {rels.map(r => (
                <div key={r.id} className="av-rel">
                  <p><strong>{passage.relationTypes[r.id]?.typeKo}</strong> · {r.name}{tree[r.id]?.label !== undefined ? ` · ${LABEL_KO[tree[r.id]?.label ?? ''] ?? ''}` : ''}</p>
                  <p className="av-muted">{r.note}</p>
                  <p>{unitText(passage.map, r.fromId)}</p>
                  <p>→ {unitText(passage.map, r.toId)}</p>
                </div>
              ))}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export function AnalysisViewApp(): React.JSX.Element {
  const [data, setData] = useState<AnalysisViewData | null>(null);
  const [error, setError] = useState('');
  const [passageId, setPassageId] = useState('');
  const [sessionId, setSessionId] = useState('');
  useEffect(() => { fetchView().then(d => { setData(d); setPassageId(d.passages[0]?.passageId ?? ''); }).catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); }, []);
  const passage = useMemo(() => data?.passages.find(p => p.passageId === passageId), [data, passageId]);
  useEffect(() => { setSessionId(passage?.sessions[0]?.sessionId ?? ''); }, [passage]);
  const session = passage?.sessions.find(s => s.sessionId === sessionId);
  if (error !== '') return <main className="av-app"><p role="alert">{error}</p></main>;
  if (data === null || passage === undefined) return <main className="av-app"><p>불러오는 중…</p></main>;
  return (
    <main className="av-app">
      <header className="av-head">
        <h1>문단 분석 화면 <small>개발자용</small></h1>
        <label>지문
          <select value={passageId} onChange={e => setPassageId(e.target.value)}>
            {data.passages.map(p => <option key={p.passageId} value={p.passageId}>{p.title ?? p.passageId}{p.sessions.length === 0 ? ' (구조만, 판정 없음)' : ''}</option>)}
          </select>
        </label>
        <label>세션
          {passage.sessions.length === 0
            ? <span className="av-muted">구조만(판정 없음)</span>
            : <select value={sessionId} onChange={e => setSessionId(e.target.value)}>{passage.sessions.map(s => <option key={s.sessionId} value={s.sessionId}>{sessionLabel(s)}</option>)}</select>}
        </label>
      </header>
      <div className="av-columns">
        <Tree passage={passage} session={session} />
        {session !== undefined
          ? <Graph key={`${passage.passageId}|${session.sessionId}`} passage={passage} session={session} passages={data.passages} />
          : <section className="av-graph"><h2>관계 유형</h2><p className="av-muted">구조만(판정 없음): 그래프 자료가 없다.</p></section>}
      </div>
    </main>
  );
}
