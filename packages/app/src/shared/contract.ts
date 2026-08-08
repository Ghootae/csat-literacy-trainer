/**
 * 서버 ↔ 클라이언트 뷰 계약.
 *
 * **`@csat/pipeline`을 import 하지 않는다.** 계획서 `D4`가 요구하는 프로세스 경계 때문이다 —
 * 여기서 채점 패키지를 끌어오면 클라이언트 번들이 채점 코드에 묶인다. 판정값 유니온은
 * 그래서 중복 정의하고, 드리프트는 단위 테스트로 막는다(`contract.test.ts`).
 */

export type Verdict =
  | 'relation_preserved'
  | 'partial_relation_preservation'
  | 'topic_only'
  | 'region_not_evidenced'
  | 'contradicted';

export type PropState = 'evidenced' | 'supported_by_abstraction' | 'not_evidenced' | 'contradicted';

export interface Sentence {
  readonly id: string;
  readonly text: string;
}

export interface PassageView {
  readonly paragraphId: string;
  readonly title: string;
  readonly sentences: readonly Sentence[];
}

export interface PropView {
  readonly shortForm: string;
  readonly state: PropState;
}

/**
 * 영역 하나의 화면 표현.
 *
 * **`label`·`propositions`가 선택 필드인 것이 이 계약의 핵심이다.** 미달이고 아직 수정을
 * 시도하지 않았으면 서버가 채우지 않는다 — 클라이언트는 정답을 *숨기는* 것이 아니라
 * **갖고 있지 않다**. 브라우저에 보낸 것은 개발자 도구로 볼 수 있으므로, 애초에 보내지
 * 않는 것만이 §4.1.3 "미달 영역 골드 노출 0"의 보장이다.
 */
export interface RegionView {
  readonly regionId: string;
  readonly verdict: Verdict;
  /** 원문 하이라이트 좌표. 미달 영역의 박스 제목도 이것으로 만든다. */
  readonly sentenceIds: readonly string[];
  /** 힌트(미달) 또는 포착 확인(관계보존). 미달 문구는 골드를 노출하지 않는다. */
  readonly feedback: string;
  /** 학생 자신이 쓴 조각 인용. 화제어가 골드가 아니라 여기서 온다. */
  readonly said: readonly string[];
  /** 아직 쓰지 않은 "다듬기"가 있는가. 영역당 1회. */
  readonly canRevise: boolean;
  /** 모순 — 건너뛸 수 없다. */
  readonly forced: boolean;

  /** 정답을 공개하는 상태인가. 관계보존이거나, 수정을 시도했으나 미달일 때만 참. */
  readonly revealed: boolean;
  readonly label?: string;
  readonly propositions?: readonly PropView[];
}

export interface AttemptRequest {
  readonly sections: readonly string[];
  /**
   * 이번 패스에서 **실제로 고친** 영역들. 학생은 영역을 하나씩 짚어가며 고치고 마지막에
   * 한 번 낸다 — 영역마다 채점을 부르면 거의 같은 텍스트를 N번 평가하게 된다.
   *
   * **평가 범위를 좁히지 않는다** — 재평가는 항상 전체다(§2.1). 이 목록은 (a) 강등을
   * 그대로 보여줄 영역을 가리고, (b) "다듬기" 소진을 표시하는 데만 쓴다.
   */
  readonly regionIds?: readonly string[];
}

export interface AttemptResponse {
  readonly regions: readonly RegionView[];
  /** 모순 영역이 남아 있는가. 남아 있으면 진행 전에 1회 시도가 강제된다. */
  readonly blocked: boolean;
}
