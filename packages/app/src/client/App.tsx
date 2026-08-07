import { useEffect, useMemo, useState } from 'react';

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
  const [blocked, setBlocked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMemo(() => `s${Date.now().toString(36)}`, []);
  const editing = regions === null || target !== null;

  useEffect(() => {
    fetchPassage(paragraphId).then(setPassage).catch((e: unknown) => setError(String(e)));
  }, [paragraphId]);

  // 배타적 단일 선택 — 선택된 영역의 문장과 응답 조각만 켜진다 (§4.1.3).
  const lit = regions?.find((r) => r.regionId === (target ?? selected));
  const litSentences = new Set(lit?.sentenceIds ?? []);
  const litSection = (text: string): boolean =>
    lit !== undefined && lit.said.some((s) => s !== '' && text.includes(s));

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const res = await submitAttempt(paragraphId, sessionId, {
        sections,
        ...(target === null ? {} : { regionId: target }),
      });
      setRegions(res.regions);
      setBlocked(res.blocked);
      setSelected(target);
      setTarget(null);
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

  return (
    <div className="wrap">
      <h1>{passage.title}</h1>
      <p className="sub">
        문단을 읽고 주요 내용을 섹션별로 요약해 보세요. 몇 개로 나눌지는 스스로 정합니다.
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

        {/* ── 내 요약 ── */}
        <section className="panel">
          <h2>내 요약</h2>
          {sections.map((text, i) => (
            <div key={i} className={`section${litSection(text) ? ' lit' : ''}`}>
              <label htmlFor={`s${i}`}>섹션 {i + 1}</label>
              {editing ? (
                <textarea
                  id={`s${i}`}
                  value={text}
                  disabled={busy}
                  onChange={(e) => setSections(sections.map((v, j) => (j === i ? e.target.value : v)))}
                />
              ) : (
                <div>{text === '' ? <span className="sub">(비어 있음)</span> : text}</div>
              )}
            </div>
          ))}
          {editing && (
            <div className="row">
              <button onClick={() => setSections([...sections, ''])} disabled={busy}>
                + 섹션 추가
              </button>
              <button className="primary" onClick={() => void submit()} disabled={busy || !filled}>
                {busy ? '채점 중…' : target === null ? '제출' : '다시 제출'}
              </button>
              {target !== null && (
                <button onClick={() => setTarget(null)} disabled={busy}>
                  취소
                </button>
              )}
            </div>
          )}
          {error !== null && <p className="err">{error}</p>}
        </section>

        {/* ── 평가 ── */}
        <section className="panel">
          <h2>평가</h2>
          {regions === null ? (
            <p className="sub">제출하면 이 문단이 몇 개 부분으로 나뉘는지, 각 부분을 어느 수준으로 담았는지 보여줍니다.</p>
          ) : (
            <>
              <p className="sub">이 문단은 {regions.length}개 부분으로 나뉩니다.</p>
              {blocked && (
                <p className="notice">
                  ✗ 표시된 부분은 원문과 어긋납니다. 한 번 고쳐 본 뒤에 넘어갈 수 있어요.
                </p>
              )}
              {regions.map((r) => (
                <RegionBox
                  key={r.regionId}
                  region={r}
                  selected={(target ?? selected) === r.regionId}
                  onSelect={() => setSelected(selected === r.regionId ? null : r.regionId)}
                  onRevise={() => {
                    setTarget(r.regionId);
                    setSelected(r.regionId);
                  }}
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
  onSelect,
  onRevise,
}: {
  region: RegionView;
  selected: boolean;
  onSelect: () => void;
  onRevise: () => void;
}): React.JSX.Element {
  // 정답을 확인한 상태는 채움이 아니라 테두리로 (§4.1.2 — 도달 수준과 직교한 축).
  const checked = region.revealed && region.verdict !== 'relation_preserved';
  const cls = ['region', `v-${region.verdict}`, selected ? 'selected' : '', checked ? 'checked' : ''];

  return (
    <div className={cls.filter(Boolean).join(' ')} onClick={onSelect}>
      <div className="head">
        <span className="mark">{MARK[region.verdict]}</span>
        <span className="verdict">{LABEL[region.verdict]}</span>
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

      {region.said.length > 0 && <div className="said">내가 쓴 것: {region.said.map((s) => `"${s}"`).join(', ')}</div>}

      {region.canRevise && (
        <div className="row">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRevise();
            }}
          >
            {region.forced ? '고치기 (필수)' : '다듬기'}
          </button>
        </div>
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
