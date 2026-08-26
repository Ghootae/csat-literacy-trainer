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

/** 목록 화면에 나가는 요약. **문장 본문도 담지 않는다** — 목록은 고르기 위한 것이다. */
export interface PassageSummary {
  readonly paragraphId: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly sentenceCount: number;
  /** 지문 manifest에 등록된 문단에만 존재한다. */
  readonly passageId?: string;
  readonly passageTitle?: string;
  /** 지문 안의 0-based 순서와 전체 문단 수. */
  readonly passageIndex?: number;
  readonly passageLength?: number;
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

/**
 * 타이틀 판정. **영역과 같은 5값 축을 그대로 쓴다** — 타이틀도 관계 진술이므로 새 축이
 * 필요 없다. `compressed`만 직교한 보너스 축이다.
 *
 * 근거: `docs/experiments/title-compression-2026-08-10.md`,
 *       `docs/experiments/title-generator-2026-08-10.md`
 */
export interface TitleView {
  readonly verdict: Verdict;
  /**
   * 하위 내용을 상위 관계로 **압축**했는가. 게이트가 아니라 보상이다 —
   * "'적당한' 추상화의 기준은 인간에게도 매번 달라질 수 있다"(사용자, 2026-08-10).
   * 실측에서도 연결↔압축 경계에서만 흔들렸으므로 진행을 막는 데 쓰지 않는다.
   *
   * **`관계보존`일 때만 참일 수 있다.** 모순 응답에 압축 보상이 붙으면 안 된다.
   */
  readonly compressed: boolean;
  readonly feedback: string;
  /** 아직 다듬을 수 있는가. 타이틀도 1회다. */
  readonly canRevise: boolean;
  /** 모범 타이틀. 시도 후 미달일 때만 담긴다 — 미달·미시도면 서버가 채우지 않는다. */
  readonly exemplar?: string;
}

export interface TitleRequest {
  readonly text: string;
  /** 참이면 저장만 하고 채점하지 않는다 (1단계 초기 가설). */
  readonly hypothesisOnly?: boolean;
  /** 지문 진행 누적용 로컬 세션 ID. 모델 입력에는 전달하지 않는다. */
  readonly passageSessionId?: string;
}

export interface TitleResponse {
  /** `hypothesisOnly`면 없다. */
  readonly title?: TitleView;
}

/** 지문 전체 표제는 아직 채점하지 않는다. 작성·저장·복원만 검증한다. */
export interface PassageTitleRequest {
  readonly text: string;
}

export interface PassageTitleResponse {
  readonly text?: string;
  readonly completedParagraphIds: readonly string[];
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

/**
 * 이어하기. 학생이 다른 문단에 갔다 돌아왔을 때 **채점을 다시 부르지 않고** 화면을 되살린다.
 * `attempts`가 없으면 `regions`는 비어 있고 첫 제출 화면으로 시작한다.
 */
export interface RestoreResponse {
  /** 마지막으로 제출한 섹션들. 없으면 빈 배열. */
  readonly sections: readonly string[];
  readonly regions: readonly RegionView[];
  /**
   * 직전 제출에서 겨냥한 영역. **세션의 성질이지 화면의 성질이 아니다** — 문단을 옮겼다
   * 돌아와도 "직전에 무엇을 고쳤는지"는 그대로다. 클라이언트 상태로만 두면 복귀 시 사라진다.
   */
  readonly rejudgedRegionIds: readonly string[];
  readonly blocked: boolean;
  /** 1단계에서 저장한 초기 가설. 판정하지 않는다 — 최종과 나란히 보여주기 위한 것이다. */
  readonly initialTitle?: string;
  /** 마지막으로 제출한 최종 타이틀. */
  readonly finalTitle?: string;
  readonly title?: TitleView;
}

export interface AttemptResponse {
  readonly regions: readonly RegionView[];
  /** 모순 영역이 남아 있는가. 남아 있으면 진행 전에 1회 시도가 강제된다. */
  readonly blocked: boolean;
}

export type DialogueStatus = 'ACTIVE' | 'AWAITING_NEXT' | 'COMPLETED' | 'UNRESOLVED';
export type DialogueEvaluationStatus = 'PASS' | 'UNCLEAR' | 'ERROR';
export type DialogueQuestionType = 'DIAGNOSTIC' | 'CORRECTIVE';

export interface DialoguePassageSummary {
  readonly passageId: string;
  readonly title: string;
  readonly exam: string;
  readonly paragraphCount: number;
  readonly available: boolean;
  readonly limitation?: string;
}

export interface DialogueParagraphView {
  readonly paragraphId: string;
  readonly position: number;
  readonly text: string;
  readonly state: 'COMPLETED' | 'CURRENT';
}

export interface DialogueStepView {
  readonly status: DialogueEvaluationStatus;
  readonly feedback: string;
  readonly question: string | null;
  readonly questionType: DialogueQuestionType | null;
  readonly questionsAnswered: number;
  readonly maxQuestions: number;
  readonly durationMs: number;
}

export interface DialogueSessionView {
  readonly sessionId: string;
  readonly passageId: string;
  readonly title: string;
  readonly exam: string;
  readonly status: DialogueStatus;
  readonly currentParagraphIndex: number;
  readonly paragraphCount: number;
  readonly visibleParagraphs: readonly DialogueParagraphView[];
  readonly step: DialogueStepView | null;
}

export interface StartDialogueRequest {
  readonly passageId: string;
}

export interface DialogueResponseRequest {
  readonly text: string;
}

export interface DialogueNavigationRequest {
  readonly paragraphIndex: number;
}
