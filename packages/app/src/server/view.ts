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

export interface ViewInput {
  readonly assessments: readonly RegionAssessment[];
  readonly said: ReadonlyMap<string, readonly string[]>;
  readonly sentenceIds: ReadonlyMap<string, readonly string[]>;
  /** 이미 "다듬기"를 쓴 영역. 영역당 1회이므로 여기 들어 있으면 버튼이 사라진다. */
  readonly revised: ReadonlySet<string>;
}

export function toRegionViews(input: ViewInput): RegionView[] {
  return input.assessments.map((a) => {
    const verdict: Verdict = a.verdict; // 캐스트 없음 — 위 가드 참조
    const solved = verdict === 'relation_preserved';
    const attempted = input.revised.has(a.regionId);

    // 공개 조건은 둘뿐이다(§2.1): 관계보존이거나, 수정을 시도했으나 미달이거나.
    // 시도하지 않은 미달 영역은 문단을 마칠 때까지 공개하지 않는다.
    const revealed = solved || attempted;

    const base = {
      regionId: a.regionId,
      verdict,
      sentenceIds: input.sentenceIds.get(a.regionId) ?? [],
      feedback: a.feedback,
      said: input.said.get(a.regionId) ?? [],
      canRevise: !solved && !attempted,
      forced: verdict === 'contradicted' && !attempted,
      revealed,
    };

    if (!revealed) return base;

    // 명제는 **관계보존일 때만** 붙인다. 수정 실패 시에는 간략 정답만 공개하고 명제는
    // 표시하지 않는다(§2.1) — 성취 표시 채널을 미달 영역에 쓰지 않기 위해서다.
    if (!solved) return { ...base, label: a.label };

    const propositions: PropView[] = a.propositionEvidence.map((e) => ({
      shortForm: e.shortForm,
      state: e.state,
    }));
    return { ...base, label: a.label, propositions };
  });
}

/** 모순 영역 중 아직 시도하지 않은 것이 있으면 진행을 막는다. */
export function isBlocked(regions: readonly RegionView[]): boolean {
  return regions.some((r) => r.forced);
}
