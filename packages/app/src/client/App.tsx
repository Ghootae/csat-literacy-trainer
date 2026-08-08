import { useEffect, useMemo, useRef, useState } from 'react';

import type { PassageView, RegionView, Verdict } from '../shared/contract.js';
import { fetchPassage, submitAttempt } from './api.js';

/** §4.1.2 — 색만으로는 적록색맹에서 갈리지 않으므로 기호를 항상 함께 쓴다. */
const MARK: Record<Verdict, string> = {
  relation_preserved: '●',
  partial_relation_preservation: '◐',
  topic_only: '○',
  region_not_evidenced: '○',
  contradicted: '✗',
};
const LABEL: Record<Verdict, string> = {
  relation_preserved: '관계보존',
  partial_relation_preservation: '부분관계',
  topic_only: '주제만',
  region_not_evidenced: '미포착',
  contradicted: '모순',
};
const PROP_MARK: Record<string, string> = {
  evidenced: '●',
  supported_by_abstraction: '◐',
  not_evidenced: '○',
  contradicted: '✗',
};

/** 미달 영역의 제목. **골드가 아니라 위치로 부른다** (§4.1.3). */
function spanTitle(ids: readonly string[]): string {
  const ns = ids.map((s) => Number(s.replace(/\D/g, ''))).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
  if (ns.length === 0) return '이 부분';
  const [first] = ns;
  const last = ns[ns.length - 1];
  return first === last ? `${first}번째 문장` : `${first}~${last}번째 문장`;
}

export function App({ paragraphId }: { paragraphId: string }): React.JSX.Element {
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [sections, setSections] = useState<string[]>(['', '', '', '']);
  const [regions, setRegions] = useState<readonly RegionView[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 섹션을 고칠 때 **그 순간 선택돼 있던 영역**에 귀속시킨다. 학생은 영역을 하나씩 짚어가며
   * 고치므로 이 귀속이 정확하고, 최종 제출 때 "실제로 고친 영역"이 그대로 나온다.
   * 눌러보기만 하고 안 고친 영역은 여기 안 들어가 "다듬기"가 소진되지 않는다.
   */
  const touched = useRef(new Set<string>());
  /** 모순 영역을 한 번은 열어봤는지 (§2 하드 게이트 — 강제 1회 시도). */
  const visited = useRef(new Set<string>());

  const sessionId = useMemo(() => `s${Date.now().toString(36)}`, []);

  useEffect(() => {
    fetchPassage(paragraphId).then(setPassage).catch((e: unknown) => setError(String(e)));
  }, [paragraphId]);

  // 배타적 단일 선택 — 선택된 영역의 문장과 응답 조각만 켜진다 (§4.1.3).
  const lit = regions?.find((r) => r.regionId === selected);
  const litSentences = new Set(lit?.sentenceIds ?? []);
  const litSection = (text: string): boolean =>
    lit !== undefined && text.trim() !== '' && lit.said.some((s) => s !== '' && text.includes(s));

  function edit(index: number, value: string): void {
    if (selected !== null) touched.current.add(selected);
    setSections(sections.map((v, j) => (j === index ? value : v)));
  }

  function select(regionId: string): void {
    const next = selected === regionId ? null : regionId;
    setSelected(next);
    if (next !== null) visited.current.add(next);
  }

  const unvisitedForced = (regions ?? []).filter((r) => r.forced && !visited.current.has(r.regionId));

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const ids = [...touched.current].filter((id) => regions?.some((r) => r.regionId === id) === true);
      const res = await submitAttempt(paragraphId, sessionId, {
        sections,
        ...(ids.length === 0 ? {} : { regionIds: ids }),
      });
      setRegions(res.regions);
      touched.current = new Set();
      visited.current = new Set();
      setSelected(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (passage === null) {
    return <div className="wrap">{error === null ? '불러오는 중…' : <p className="err">{error}</p>}</div>;
  }

  const filled = sections.some((s) => s.trim() !== '');
  const first = regions === null;
  const changed = touched.current.size > 0;
  const canSubmit = !busy && filled && (first || changed) && unvisitedForced.length === 0;

  return (
    <div className="wrap">
      <h1>{passage.title}</h1>
      <p className="sub">
        {first
          ? '문단을 읽고 주요 내용을 섹션별로 요약해 보세요. 몇 개로 나눌지는 스스로 정합니다.'
          : '고치고 싶은 부분을 눌러 보세요. 원문과 내 요약에서 관련된 곳이 켜집니다. 다 고치면 한 번에 제출합니다.'}
      </p>

      <div className="panels">
        {/* ── 원문 ── */}
        <section className="panel">
          <h2>원문</h2>
          <p>
            {passage.sentences.map((s) => (
              <span key={s.id} className={`sentence${litSentences.has(s.id) ? ' lit' : ''}`}>
                {s.text}{' '}
              </span>
            ))}
          </p>
        </section>

        {/* ── 내 요약 — 결과를 본 뒤에도 계속 편집 가능하다 ── */}
        <section className="panel">
          <h2>내 요약</h2>
          {lit !== undefined && lit.said.length === 0 && (
            <p className="hint">
              이 부분은 아직 안 쓰셨어요. 빈 섹션에 쓰거나 섹션을 추가해 보세요.
            </p>
          )}
          {sections.map((text, i) => (
            <div key={i} className={`section${litSection(text) ? ' lit' : ''}`}>
              <label htmlFor={`s${i}`}>섹션 {i + 1}</label>
              <textarea
                id={`s${i}`}
                value={text}
                disabled={busy}
                onChange={(e) => edit(i, e.target.value)}
              />
            </div>
          ))}
          <div className="row">
            <button onClick={() => setSections([...sections, ''])} disabled={busy}>
              + 섹션 추가
            </button>
            <button className="primary" onClick={() => void submit()} disabled={!canSubmit}>
              {busy ? '채점 중…' : first ? '제출' : '다시 제출'}
            </button>
          </div>
          {!first && !changed && !busy && <p className="sub">고친 곳이 없으면 다시 제출하지 않아도 됩니다.</p>}
          {unvisitedForced.length > 0 && (
            <p className="notice">✗ 표시된 부분을 눌러 확인해야 다시 제출할 수 있어요.</p>
          )}
          {error !== null && <p className="err">{error}</p>}
        </section>

        {/* ── 평가 ── */}
        <section className="panel">
          <h2>평가</h2>
          {regions === null ? (
            <p className="sub">
              제출하면 이 문단이 몇 개 부분으로 나뉘는지, 각 부분을 어느 수준으로 담았는지 보여줍니다.
            </p>
          ) : (
            <>
              <p className="sub">이 문단은 {regions.length}개 부분으로 나뉩니다.</p>
              {regions.map((r) => (
                <RegionBox
                  key={r.regionId}
                  region={r}
                  selected={selected === r.regionId}
                  touched={touched.current.has(r.regionId)}
                  onSelect={() => select(r.regionId)}
                />
              ))}
              <p className="summary">{summarize(regions)}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RegionBox({
  region,
  selected,
  touched,
  onSelect,
}: {
  region: RegionView;
  selected: boolean;
  touched: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  // 정답을 확인한 상태는 채움이 아니라 테두리로 (§4.1.2 — 도달 수준과 직교한 축).
  const checked = region.revealed && region.verdict !== 'relation_preserved';
  const cls = ['region', `v-${region.verdict}`, selected ? 'selected' : '', checked ? 'checked' : ''];

  return (
    <div className={cls.filter(Boolean).join(' ')} onClick={onSelect}>
      <div className="head">
        <span className="mark">{MARK[region.verdict]}</span>
        <span className="verdict">{LABEL[region.verdict]}</span>
        {touched && <span className="badge">고치는 중</span>}
        {region.canRevise && !touched && <span className="badge dim">눌러서 다듬기</span>}
      </div>

      {/* 미달 영역은 골드가 아니라 **위치**로 부른다. label은 서버가 보내지도 않는다. */}
      <div className="title">{region.label ?? spanTitle(region.sentenceIds)}</div>

      {region.propositions !== undefined && (
        <ul className="props">
          {region.propositions.map((p, i) => (
            <li key={i}>
              {PROP_MARK[p.state] ?? '?'} {p.shortForm}
            </li>
          ))}
        </ul>
      )}

      <p className="fb">{region.feedback}</p>

      {region.said.length > 0 && (
        <div className="said">내가 쓴 것: {region.said.map((s) => `"${s}"`).join(', ')}</div>
      )}
    </div>
  );
}

function summarize(regions: readonly RegionView[]): string {
  const n = (v: Verdict): number => regions.filter((r) => r.verdict === v).length;
  const parts: string[] = [];
  const push = (mark: string, label: string, count: number): void => {
    if (count > 0) parts.push(`${mark} ${label} ${count}`);
  };
  push('●', '관계보존', n('relation_preserved'));
  push('◐', '부분관계', n('partial_relation_preservation'));
  push('○', '다듬을 곳', n('topic_only') + n('region_not_evidenced'));
  push('✗', '꼭 고칠 곳', n('contradicted'));
  return parts.join('   ');
}
