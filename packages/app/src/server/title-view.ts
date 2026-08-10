/**
 * 타이틀 판정 → 화면 계약. **골드 차단선이 영역과 같은 자리에 있다.**
 *
 * 모범 타이틀은 시도 후 미달일 때만 담는다. 미달·미시도면 보내지 않는다 — 숨기는 것이
 * 아니라 전송하지 않는 것이 유일한 보장이다(`view.ts`와 같은 규칙).
 *
 * 판정축은 영역과 같은 5값을 그대로 쓴다. 타이틀도 관계 진술이므로 새 축이 필요 없고,
 * `compressed`만 직교한 보너스로 얹는다.
 */

import type { RegionAssessment } from '@csat/pipeline';
import type { TitleView, Verdict } from '../shared/contract.js';

export interface TitleInput {
  readonly assessment: RegionAssessment;
  /** `qT3`(압축 판별) 질의가 보존됐는가. */
  readonly compressedRaw: boolean;
  /** 이미 다듬기를 썼는가. 타이틀도 1회다. */
  readonly attempted: boolean;
  /**
   * 모범 타이틀 — **골드 타이틀 노드의 `shortForm`이다.**
   * `assessment.label`을 쓰면 질의 영역의 라벨("문단의 중심 관계")이 나간다. 판정 대상은
   * 영역이지만 학생에게 보여줄 것은 그 문단의 실제 타이틀이다.
   */
  readonly exemplar: string;
}

/**
 * 문구. 영역 피드백과 목적이 다르다 — 영역은 "무엇이 빠졌는가"를 짚지만, 타이틀은
 * **"한 층 위로 올려라"**를 유도한다.
 *
 * `관계보존 + 압축 아님`이 이 화면의 핵심 상태다. 설계상 **이미 성공(1단계 보상)이고 수정
 * 기회가 없다.** 그러므로 문구가 "지금 고치라"고 읽히면 안 된다 — 다음 문단을 위한 안내여야
 * 한다. 실측에서 엔진은 나열과 연결을 구분하지 않는다(둘 다 qT2 보존·qT3 미보존)는 것이
 * 확인됐으므로, 사용자 설계의 "나열"은 `qT2` 미보존 쪽에 해당한다.
 */
function buildFeedback(verdict: Verdict, compressed: boolean, canRevise: boolean): string {
  switch (verdict) {
    case 'relation_preserved':
      return compressed
        ? '이 문단이 결국 무엇을 말하는지, 한 층 위에서 담아냈습니다.'
        : canRevise
          ? '내용은 모두 정확합니다. 다만 각각을 다시 설명하는 데 그쳤어요. ' +
            '이것들이 하나로 모여 무엇을 이루는지 한 문장으로 표현해 보세요.'
          : '내용은 모두 정확합니다. 다음에는 각각을 설명하는 대신, ' +
            '이것들이 하나로 모여 무엇을 이루는지 한 문장으로 묶어 보세요.';
    case 'partial_relation_preservation':
      return '관계의 한 축은 담겼어요. 나머지 축도 함께 드러나도록 다듬어 보세요.';
    case 'topic_only':
      return '화제는 짚었어요. 이 문단이 결국 무엇을 말하는지까지 담아 보세요.';
    case 'region_not_evidenced':
      return '이 문단이 무엇에 관한 글인지부터 담아 보세요.';
    case 'contradicted':
      return '관계 방향이 원문과 어긋납니다. 무엇이 무엇에 대한 것인지 다시 확인해 보세요.';
  }
}

export function toTitleView(input: TitleInput): TitleView {
  const verdict: Verdict = input.assessment.verdict; // 캐스트 없음 — view.ts의 드리프트 가드 참조
  const solved = verdict === 'relation_preserved';

  // **압축 보상은 관계보존일 때만.** 실측에서 모순 응답에도 조직상 압축 판정이 나올 수 있음이
  // 확인됐다(2026-08-10). 생성 질의는 대체로 스스로 걸러내지만 보장이 아니므로 여기서 막는다.
  const compressed = solved && input.compressedRaw;

  // 타이틀은 **완료 조건이 아니다.** 실패해도 다음 문단으로 갈 수 있으므로, 1회 시도 후에는
  // 모범 타이틀을 공개하고 끝낸다. `canRevise`는 그 1회가 남았는지만 뜻한다.
  const canRevise = !solved && !input.attempted;

  return {
    verdict,
    compressed,
    feedback: buildFeedback(verdict, compressed, canRevise),
    canRevise,
    // 공개 조건은 영역과 같다: 성공했거나, 시도했으나 미달이거나.
    ...(solved || input.attempted ? { exemplar: input.exemplar } : {}),
  };
}

/**
 * 보상 등급. **별도 스케일이다** — 슬롯 보상과 합산하지 않는다(합의문 R2 반-게이밍 제약).
 * 합산하면 같은 W를 두 번 세게 된다.
 */
export function titleReward(view: TitleView): 0 | 1 | 2 {
  if (view.verdict !== 'relation_preserved') return 0;
  return view.compressed ? 2 : 1;
}

/**
 * 저장된 판정값에서 화면 계약을 되살린다. **채점을 다시 부르지 않는다** — 학생이 문단을
 * 옮겼다 돌아온 것뿐인데 LLM을 태울 이유가 없다(영역의 `viewsFromRecords`와 같은 규칙).
 */
export function restoreTitleView(
  verdict: string | undefined,
  compressed: boolean,
  attempted: boolean,
  exemplar: string,
): TitleView {
  const v = (verdict ?? 'region_not_evidenced') as Verdict;
  const solved = v === 'relation_preserved';
  const canRevise = !solved && !attempted;
  return {
    verdict: v,
    compressed: solved && compressed,
    feedback: buildFeedback(v, solved && compressed, canRevise),
    canRevise,
    ...(solved || attempted ? { exemplar } : {}),
  };
}
