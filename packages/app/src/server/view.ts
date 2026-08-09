/**
 * 채점 결과 → 화면 계약. **골드 차단선이 여기다.**
 *
 * 미달 영역의 `label`·`propositions`를 채우지 않는 것이 §4.1.3 "골드 노출 0"의 구현이다.
 * 클라이언트에서 숨기는 방식은 보장이 되지 못한다 — 브라우저에 보낸 것은 개발자 도구로
 * 볼 수 있기 때문이다. **보내지 않는 것만이 보장이다.**
 */

import type { PropositionEvidenceState, RegionAssessment, RegionSemanticVerdict } from '@csat/pipeline';
import type { PropState, PropView, RegionView, Verdict } from '../shared/contract.js';

/**
 * 계약 드리프트 가드.
 *
 * `shared/contract.ts`는 프로세스 경계 때문에 판정값 유니온을 **중복 정의**한다. 두 정의가
 * 어긋나면 여기서 컴파일이 깨진다 — 캐스트(`as Verdict`)를 쓰면 드리프트가 조용히 가려지므로
 * 아래 변환에서 캐스트를 쓰지 않는 것이 규칙이다.
 */
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _verdictsMatch: Eq<Verdict, RegionSemanticVerdict> = true;
const _propStatesMatch: Eq<PropState, PropositionEvidenceState> = true;
void _verdictsMatch;
void _propStatesMatch;

/**
 * 한 시점의 영역 내용. 세션에 보관해 **강등을 가릴 때 그 시점 그대로** 복원한다.
 *
 * 판정값만 보관하면 박스는 ◐인데 문구는 `주제만`용이 붙어 화면이 서로 다른 말을 한다.
 */
export interface RegionRecord {
  readonly regionId: string;
  readonly verdict: Verdict;
  readonly feedback: string;
  readonly said: readonly string[];
  readonly label?: string;
  readonly propositions?: readonly PropView[];
}

export interface ViewInput {
  readonly assessments: readonly RegionAssessment[];
  readonly said: ReadonlyMap<string, readonly string[]>;
  readonly sentenceIds: ReadonlyMap<string, readonly string[]>;
  /** 이미 "다듬기"를 쓴 영역. 영역당 1회이므로 여기 들어 있으면 버튼이 사라진다. */
  readonly revised: ReadonlySet<string>;
  /** 영역별 지금까지의 최고 기록. 겨냥하지 않은 영역의 강등을 가리는 데 쓴다. */
  readonly best?: ReadonlyMap<string, RegionRecord>;
  /** 이번 패스에서 고친 영역들. 여기만 강등을 그대로 보여준다. */
  readonly targetRegionIds?: ReadonlySet<string>;
}

/** 도달 수준 사다리. `contradicted`는 사다리 밖이라 따로 다룬다. */
const RANK: Record<Verdict, number> = {
  contradicted: -1,
  region_not_evidenced: 0,
  topic_only: 1,
  partial_relation_preservation: 2,
  relation_preserved: 3,
};

/** 채점 결과 하나를 보관 가능한 기록으로. 공개 조건(§2.1)이 여기서 적용된다. */
export function toRecord(a: RegionAssessment, said: readonly string[], attempted: boolean): RegionRecord {
  const verdict: Verdict = a.verdict; // 캐스트 없음 — 위 가드 참조
  const solved = verdict === 'relation_preserved';
  const base = { regionId: a.regionId, verdict, feedback: a.feedback, said };

  // 공개 조건은 둘뿐이다: 관계보존이거나, 수정을 시도했으나 미달이거나.
  if (!solved && !attempted) return base;

  // 명제는 **관계보존일 때만** 붙인다. 수정 실패 시에는 간략 정답만 공개하고 명제는
  // 표시하지 않는다(§2.1) — 성취 표시 채널을 미달 영역에 쓰지 않기 위해서다.
  if (!solved) return { ...base, label: a.label };

  const propositions: PropView[] = a.propositionEvidence.map((e) => ({
    shortForm: e.shortForm,
    state: e.state,
  }));
  return { ...base, label: a.label, propositions };
}

/**
 * 표시할 기록을 고른다 (§2.1, 2026-08-08 개정).
 *
 * **겨냥한 영역은 그대로, 그 외는 상승만 반영한다.** 같은 입력에도 영역 판정이 갈리는 것이
 * 측정됐으므로(2/9), 학생이 건드리지도 않은 영역이 모델 변동으로 내려가는 것을 보여주면
 * 설명할 수 없는 강등이 된다.
 *
 * **모순은 예외다** — 새로 생기면 반드시 표시한다. 가리면 하드 게이트가 조용히 실패한다.
 */
function pick(current: RegionRecord, best: RegionRecord | undefined, targeted: boolean): RegionRecord {
  if (targeted || best === undefined) return current;
  if (current.verdict === 'contradicted') return current;
  return RANK[best.verdict] > RANK[current.verdict] ? best : current;
}

/** 보여줄 기록 하나 → 화면 계약. */
function toView(shown: RegionRecord, sentenceIds: readonly string[], attempted: boolean): RegionView {
  const solved = shown.verdict === 'relation_preserved';
  return {
    regionId: shown.regionId,
    verdict: shown.verdict,
    sentenceIds,
    feedback: shown.feedback,
    said: shown.said,
    canRevise: !solved && !attempted,
    forced: shown.verdict === 'contradicted' && !attempted,
    revealed: shown.label !== undefined,
    ...(shown.label === undefined ? {} : { label: shown.label }),
    ...(shown.propositions === undefined ? {} : { propositions: shown.propositions }),
  };
}

export function toRegionViews(input: ViewInput): RegionView[] {
  return input.assessments.map((a) => {
    const attempted = input.revised.has(a.regionId);
    const current = toRecord(a, input.said.get(a.regionId) ?? [], attempted);
    const shown = pick(current, input.best?.get(a.regionId), input.targetRegionIds?.has(a.regionId) === true);
    return toView(shown, input.sentenceIds.get(a.regionId) ?? [], attempted);
  });
}

/**
 * 저장된 기록에서 화면을 복원한다. **채점을 다시 부르지 않는다** — 학생이 문단을 옮겼다
 * 돌아온 것뿐인데 LLM을 태우면 비용도 지연도 이유가 없다.
 *
 * 제출 경로와 같은 `pick`을 쓴다. 기록이 그 시점의 화면 내용을 그대로 담고 있으므로
 * (`toRecord`가 최종 `attempted`로 만들어진다), 같은 입력에 같은 규칙을 적용하면 같은 화면이 된다.
 */
export function viewsFromRecords(input: {
  readonly records: readonly RegionRecord[];
  readonly best?: ReadonlyMap<string, RegionRecord>;
  readonly targetRegionIds?: ReadonlySet<string>;
  readonly revised: ReadonlySet<string>;
  readonly sentenceIds: ReadonlyMap<string, readonly string[]>;
}): RegionView[] {
  return input.records.map((r) => {
    const shown = pick(r, input.best?.get(r.regionId), input.targetRegionIds?.has(r.regionId) === true);
    return toView(shown, input.sentenceIds.get(r.regionId) ?? [], input.revised.has(r.regionId));
  });
}

/** 영역별 지금까지의 최고 기록. 동률이면 먼저 도달한 것을 남긴다. */
export function bestOf(records: readonly (readonly RegionRecord[])[]): Map<string, RegionRecord> {
  const out = new Map<string, RegionRecord>();
  for (const attempt of records) {
    for (const r of attempt) {
      const prev = out.get(r.regionId);
      if (prev === undefined || RANK[r.verdict] > RANK[prev.verdict]) out.set(r.regionId, r);
    }
  }
  return out;
}

/** 모순 영역 중 아직 시도하지 않은 것이 있으면 진행을 막는다. */
export function isBlocked(regions: readonly RegionView[]): boolean {
  return regions.some((r) => r.forced);
}
