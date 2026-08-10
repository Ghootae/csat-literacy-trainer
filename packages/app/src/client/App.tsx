import { useEffect, useMemo, useRef, useState } from 'react';

import type { PassageSummary, PassageView, RegionView, TitleView, Verdict } from '../shared/contract.js';
import { fetchAttempt, fetchPassage, fetchPassages, submitAttempt, submitTitle } from './api.js';


/**
 * 셸 — 문단 목록과 선택.
 *
 * `Trainer`에 `key={paragraphId}`를 주는 것이 핵심이다. 문단을 옮기면 React가 컴포넌트를
 * 다시 마운트하므로 요약·판정·수정 상태가 **전부 초기화된다.** 상태를 하나씩 수동으로
 * 비우면 새 상태가 생길 때마다 빠뜨리게 된다.
 */
export function App(): React.JSX.Element {
  const [list, setList] = useState<readonly PassageSummary[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPassages()
      .then((xs) => {
        setList(xs);
        setCurrent(xs[0]?.paragraphId ?? null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error !== null) return <div className="wrap"><p className="err">{error}</p></div>;
  if (list === null || current === null) {
    return <div className="wrap">{list?.length === 0 ? '문단이 없습니다.' : '불러오는 중…'}</div>;
  }

  const i = list.findIndex((p) => p.paragraphId === current);
  const next = i >= 0 ? list[i + 1] : undefined;

  return (
    <>
      <nav className="picker">
        {list.map((p, n) => (
          <button
            key={p.paragraphId}
            className={p.paragraphId === current ? 'chip on' : 'chip'}
            onClick={() => setCurrent(p.paragraphId)}
            title={p.tags.join(' · ')}
          >
            <span className="n">{n + 1}</span>
            {p.title}
          </button>
        ))}
      </nav>
      <Trainer
        key={current}
        paragraphId={current}
        next={next}
        onNext={() => next !== undefined && setCurrent(next.paragraphId)}
      />
    </>
  );
}

/**
 * 탭 안에서 문단마다 고정된 세션 id. 없으면 만들어 `sessionStorage`에 넣는다.
 * 저장소를 못 쓰는 환경(프라이빗 모드 등)에서는 매번 새 id가 되지만, 그래도 동작은 한다.
 */
function sessionKey(paragraphId: string): string {
  const k = `csat.session.${paragraphId}`;
  try {
    const found = sessionStorage.getItem(k);
    if (found !== null) return found;
    const made = `${paragraphId}-${Date.now().toString(36)}`;
    sessionStorage.setItem(k, made);
    return made;
  } catch {
    return `${paragraphId}-${Date.now().toString(36)}`;
  }
}

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

function Trainer({
  paragraphId,
  next,
  onNext,
}: {
  paragraphId: string;
  next: PassageSummary | undefined;
  onNext: () => void;
}): React.JSX.Element {
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [sections, setSections] = useState<string[]>(['', '', '', '']);
  const [regions, setRegions] = useState<readonly RegionView[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * 이어할 것이 있는지 아직 모른다. **끝날 때까지 입력 화면을 그리지 않는다** — 그리면
   * 복원 직전에 빈 최초 화면이 잠깐 보이고(측정: 약 0.3초), 그 창에 학생이 타이핑하면
   * 복원이 덮어쓴다(2026-08-10 코덱스 회귀).
   */
  const [restoring, setRestoring] = useState(true);
  /** 1단계에서 쓴 초기 가설. 판정하지 않고 저장만 한다. */
  const [initialTitle, setInitialTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [title, setTitle] = useState<TitleView | null>(null);
  const [finalTitle, setFinalTitle] = useState<string | null>(null);

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

  // **문단마다 다르되, 같은 문단이면 항상 같아야 한다.**
  //
  // 서버의 `Session`은 `paragraphId` 하나를 들고 있어서 문단끼리 세션을 공유하면 기록이
  // 서로 덮인다. 반대로 문단으로 돌아올 때마다 새 id를 만들면 이전 세션이 고아가 되어
  // **"다듬기는 영역당 1회"가 무력화된다** — 다른 문단을 들렀다 오면 기회가 되살아난다.
  // `sessionStorage`는 탭 단위라 새로고침에도 남고 탭을 닫으면 정리된다.
  const sessionId = useMemo(() => sessionKey(paragraphId), [paragraphId]);

  useEffect(() => {
    fetchPassage(paragraphId).then(setPassage).catch((e: unknown) => setError(String(e)));
  }, [paragraphId]);

  // 이어하기. 이 문단에 이미 제출한 적이 있으면 그때 화면을 되살린다 (채점 호출 없음).
  useEffect(() => {
    let live = true;
    fetchAttempt(paragraphId, sessionId)
      .then((r) => {
        if (!live || r.regions.length === 0) return;
        setSections(r.sections.length > 0 ? [...r.sections] : ['', '', '', '']);
        setRegions(r.regions);
        setRejudged(new Set(r.rejudgedRegionIds));
        if (r.initialTitle !== undefined) setInitialTitle(r.initialTitle);
        if (r.finalTitle !== undefined) setFinalTitle(r.finalTitle);
        if (r.title !== undefined) setTitle(r.title);
      })
      .catch(() => {
        /* 이어할 것이 없으면 첫 제출 화면으로 시작한다 */
      })
      .finally(() => {
        if (live) setRestoring(false);
      });
    return () => {
      live = false;
    };
  }, [paragraphId, sessionId]);

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

  /** 1단계 — 초기 가설. 저장만 하고 채점하지 않는다. */
  async function submitHypothesis(): Promise<void> {
    const text = titleDraft.trim();
    if (text === '') return;
    setBusy(true);
    setError(null);
    try {
      await submitTitle(paragraphId, sessionId, { text, hypothesisOnly: true });
      setInitialTitle(text);
      setTitleDraft('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** 3단계 — 최종 타이틀. 채점한다. */
  async function submitFinalTitle(): Promise<void> {
    const text = titleDraft.trim();
    if (text === '') return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitTitle(paragraphId, sessionId, { text });
      setFinalTitle(text);
      if (res.title !== undefined) setTitle(res.title);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (error !== null && passage === null) return <div className="wrap"><p className="err">{error}</p></div>;
  // 원문과 이어하기가 **둘 다** 끝나야 그린다.
  if (passage === null || restoring) return <div className="wrap">불러오는 중…</div>;

  const filled = sections.some((s) => s.trim() !== '');
  const first = regions === null;
  const changed = touched.size > 0;
  const canSubmit = !busy && filled && (first || changed) && unvisitedForced.length === 0;
  /**
   * 영역 단계가 끝났는가. **전부 관계보존일 필요는 없다** — 다듬기를 소진한 영역은 더 할 일이
   * 없으므로 그것도 종료다. 그러지 않으면 못 맞춘 학생이 타이틀 단계에 영영 못 온다.
   */
  const regionsSettled =
    regions !== null && regions.every((r) => r.verdict === 'relation_preserved' || !r.canRevise);

  /**
   * 단계. **서버 상태에서 파생시킨다** — 별도 상태로 두면 복원할 때 어긋난다.
   *
   *   hypothesis  초기 가설을 아직 안 씀
   *   regions     영역 요약·판정·수정 (기존 루프)
   *   title       최종 타이틀 입력·판정·1회 수정
   *   done        타이틀까지 끝남
   */
  const phase: 'hypothesis' | 'regions' | 'title' | 'done' =
    initialTitle === null
      ? 'hypothesis'
      : title !== null && !title.canRevise
        ? 'done'
        : regionsSettled
          ? 'title'
          : 'regions';

  // 영역이 다 관계보존인가 — 완료 배너 문구를 가른다.
  const allPreserved = regions !== null && regions.every((r) => r.verdict === 'relation_preserved');

  return (
    <div className="wrap">
      <h1>{passage.title}</h1>
      <p className="sub">
        {phase === 'hypothesis'
          ? '먼저 문단을 훑어 읽고, 이 글이 결국 무엇을 말하는지 짐작해 보세요. 채점하지 않습니다.'
          : phase === 'title'
            ? '이제 각 부분을 하나로 묶어 보세요. 각각을 다시 설명하는 것이 아니라, 그것들이 모여 무엇을 이루는지 한 문장으로 씁니다.'
            : phase === 'done'
              ? '이 문단은 끝났습니다. 아래에서 각 부분을 다시 훑어볼 수 있습니다.'
              : first
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

        {/* ── 1단계: 초기 가설 ── */}
        {phase === 'hypothesis' && (
          <section className="panel">
            <h2>첫 짐작</h2>
            <p className="sub">
              이 문단이 결국 무엇을 말한다고 생각하나요? 한 문장으로 적어 보세요.
              <strong> 채점하지 않습니다</strong> — 나중에 자기 생각이 어떻게 바뀌었는지 보기 위한 것입니다.
            </p>
            <div className="section">
              <textarea
                value={titleDraft}
                disabled={busy}
                placeholder="예: 두 입장이 무엇을 두고 맞서는지…"
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </div>
            <div className="row">
              <button
                className="primary"
                disabled={busy || titleDraft.trim() === ''}
                onClick={() => void submitHypothesis()}
              >
                {busy ? '저장 중…' : '적었어요 — 이제 자세히 읽기'}
              </button>
            </div>
            {error !== null && <p className="err">{error}</p>}
          </section>
        )}

        {/* ── 내 요약 — 결과를 본 뒤에도 계속 편집 가능하다 ── */}
        {phase !== 'hypothesis' && (
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
        )}

        {/* ── 평가 ── */}
        <section className="panel">
          <h2>평가</h2>
          {phase === 'hypothesis' ? (
            <p className="sub">
              첫 짐작을 적으면 문단을 부분별로 정리하는 단계로 넘어갑니다.
            </p>
          ) : regions === null ? (
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
              <p className="summary">{summarize(regions)}</p>

              {(phase === 'title' || phase === 'done') && (
                <TitlePanel
                  initialTitle={initialTitle}
                  finalTitle={finalTitle}
                  title={title}
                  draft={titleDraft}
                  busy={busy}
                  onDraft={setTitleDraft}
                  onSubmit={() => void submitFinalTitle()}
                  allPreserved={allPreserved}
                  next={next}
                  onNext={onNext}
                />
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


/**
 * 3단계 — 최종 타이틀.
 *
 * **완료 조건이 아니다.** 실패해도 다음 문단으로 갈 수 있다 — "'적당한' 추상화의 기준은
 * 인간에게도 매번 달라질 수 있다"(사용자, 2026-08-10). 그래서 압축은 보상이고, 미달이어도
 * 1회 수정 후 모범 타이틀을 공개하고 넘어간다.
 *
 * 초기 가설을 나란히 보여주는 것이 이 화면의 핵심이다. 판정하지 않지만, 학생이 **자기 생각이
 * 어떻게 바뀌었는지** 보는 것이 3단계 설계의 목적이기 때문이다.
 */
function TitlePanel({
  initialTitle,
  finalTitle,
  title,
  draft,
  busy,
  onDraft,
  onSubmit,
  allPreserved,
  next,
  onNext,
}: {
  initialTitle: string | null;
  finalTitle: string | null;
  title: TitleView | null;
  draft: string;
  busy: boolean;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  allPreserved: boolean;
  next: PassageSummary | undefined;
  onNext: () => void;
}): React.JSX.Element {
  const reward = title === null ? 0 : title.verdict !== 'relation_preserved' ? 0 : title.compressed ? 2 : 1;
  const settled = title !== null && !title.canRevise;

  return (
    <div className={`title-step${settled ? ' settled' : ''}`}>
      <h3>이 문단을 한 문장으로</h3>

      {initialTitle !== null && (
        <p className="prior">
          <span>처음 짐작</span> {initialTitle}
        </p>
      )}

      {title !== null && (
        <div className={`title-verdict v-${title.verdict}`}>
          <span className="mark">{MARK[title.verdict]}</span>
          <span className="verdict">{LABEL[title.verdict]}</span>
          {reward > 0 && <span className={`badge reward r${reward}`}>보상 {reward}단계</span>}
          <p className="fb">{title.feedback}</p>
          {finalTitle !== null && <p className="mine">내가 쓴 것: “{finalTitle}”</p>}
          {title.exemplar !== undefined && <p className="exemplar">모범: {title.exemplar}</p>}
        </div>
      )}

      {!settled && (
        <>
          <textarea
            value={draft}
            disabled={busy}
            placeholder={title === null ? '각 부분을 하나로 묶어 한 문장으로…' : '한 층 위에서 다시 써 보세요…'}
            onChange={(e) => onDraft(e.target.value)}
          />
          <div className="row">
            <button className="primary" disabled={busy || draft.trim() === ''} onClick={onSubmit}>
              {busy ? '채점 중…' : title === null ? '제출' : '다시 제출'}
            </button>
          </div>
        </>
      )}

      {settled && (
        <div className="done">
          <strong>
            {allPreserved ? '이 문단을 끝냈습니다.' : '이 문단을 마쳤습니다.'}
          </strong>
          {!allPreserved && (
            <p className="sub">일부 부분은 정답을 확인하고 넘어왔습니다.</p>
          )}
          {next === undefined ? (
            <p className="sub">마지막 문단입니다. 위에서 다른 문단을 골라 다시 해 볼 수 있습니다.</p>
          ) : (
            <button className="primary" onClick={onNext}>
              다음 문단 — {next.title}
            </button>
          )}
        </div>
      )}
    </div>
  );
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
