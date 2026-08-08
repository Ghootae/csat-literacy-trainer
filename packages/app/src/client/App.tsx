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
   * 이번 패스에서 고친 영역. 섹션을 고칠 때 **그 순간 선택돼 있던 영역**에 귀속시킨다.
   * 눌러보기만 하고 안 고친 영역은 여기 안 들어가 "다듬기"가 소진되지 않는다.
   *
   * **`useRef`가 아니라 상태다.** ref는 리렌더를 일으키지 않아, 첫 영역을 고친 뒤 다른
   * 영역을 선택하면 먼저 고친 카드의 표시가 갱신되지 않는다 — 학생 입장에서는 첫 수정이
   * 저장됐는지 알 수 없다(코덱스 테스트 2026-08-09). 누적 표시가 이 화면의 요구사항이므로
   * 렌더에 반영되는 자료구조여야 한다.
   */
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  /** 직전 제출에서 겨냥했던 영역. "재판정 완료"를 표시하는 데 쓴다. */
  const [rejudged, setRejudged] = useState<ReadonlySet<string>>(new Set());
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
    if (selected !== null && !touched.has(selected)) {
      setTouched(new Set([...touched, selected]));
    }
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
      const ids = [...touched].filter((id) => regions?.some((r) => r.regionId === id) === true);
      const res = await submitAttempt(paragraphId, sessionId, {
        sections,
        ...(ids.length === 0 ? {} : { regionIds: ids }),
      });
      setRegions(res.regions);
      setRejudged(new Set(ids)); // 방금 재판정된 영역 — 결과 화면에서 표시한다
      setTouched(new Set());
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
  const changed = touched.size > 0;
  const canSubmit = !busy && filled && (first || changed) && unvisitedForced.length === 0;
  // 모든 영역이 관계보존이면 이 문단은 끝났다. 남은 할 일이 없는데 "고치고 싶은 부분을
  // 눌러 보세요"가 계속 떠 있으면 학생이 완료 여부를 알 수 없다(코덱스 테스트 2026-08-09).
  const done = regions !== null && regions.every((r) => r.verdict === 'relation_preserved');

  return (
    <div className="wrap">
      <h1>{passage.title}</h1>
      <p className="sub">
        {first
          ? '문단을 읽고 주요 내용을 섹션별로 요약해 보세요. 몇 개로 나눌지는 스스로 정합니다.'
          : done
            ? '이 문단은 끝났습니다. 아래에서 각 부분을 다시 훑어볼 수 있습니다.'
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
                  touched={touched.has(r.regionId)}
                  rejudged={rejudged.has(r.regionId)}
                  onSelect={() => select(r.regionId)}
                />
              ))}
              {done ? (
                <div className="done">
                  <strong>이 문단의 핵심 관계를 모두 담았습니다.</strong>
                  <p>{summarize(regions)}</p>
                  {/* 다음 문단은 아직 하나뿐이라 이동할 곳이 없다. 지문이 늘면 여기가 진입점이 된다. */}
                  <button className="primary" disabled title="다음 문단은 아직 준비 중입니다">
                    다음 문단으로
                  </button>
                </div>
              ) : (
                <p className="summary">{summarize(regions)}</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * 카드의 진행 상태. **도달 수준(판정)과 직교한 축이다.**
 *
 * 한 영역을 고친 뒤 다른 영역을 선택해도 먼저 고친 카드는 `수정됨`을 유지해야 한다 —
 * 그러지 않으면 학생이 첫 수정이 저장됐는지, 재판정 대상인지 알 수 없다
 * (코덱스 테스트 2026-08-09). 즉 이 상태는 **누적**이지 현재 선택의 함수가 아니다.
 */
function progressBadge(region: RegionView, touched: boolean, rejudged: boolean): React.JSX.Element | null {
  if (touched) return <span className="badge edited">수정됨 · 제출 대기</span>;
  if (rejudged) return <span className="badge judged">재판정 완료</span>;
  if (region.canRevise) return <span className="badge dim">눌러서 다듬기</span>;
  return null;
}

function RegionBox({
  region,
  selected,
  touched,
  rejudged,
  onSelect,
}: {
  region: RegionView;
  selected: boolean;
  touched: boolean;
  rejudged: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  // 정답을 확인한 상태는 채움이 아니라 테두리로 (§4.1.2 — 도달 수준과 직교한 축).
  const checked = region.revealed && region.verdict !== 'relation_preserved';
  const cls = [
    'region',
    `v-${region.verdict}`,
    selected ? 'selected' : '',
    checked ? 'checked' : '',
    touched ? 'edited' : '',
  ];

  return (
    <div className={cls.filter(Boolean).join(' ')} onClick={onSelect}>
      <div className="head">
        <span className="mark">{MARK[region.verdict]}</span>
        <span className="verdict">{LABEL[region.verdict]}</span>
        {progressBadge(region, touched, rejudged)}
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
