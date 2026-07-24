/**
 * 골드 의미지도의 도메인 모델.
 *
 * 위계는 **DAG**다 (계획 D3). 한 명제가 두 상위 개념을 동시에 지지하는 구조가 수능 지문에
 * 흔하므로 트리를 강제하지 않는다. 대신 노드마다 `primaryParentId`를 하나 지정해 신장 트리를
 * 얻고, 슬롯 배정과 보상 회계는 그 위에서만 한다 — 안티체인 컷의 분할성과 가중치 가법성이
 * primary 간선 위에서 보존된다. secondary 간선은 시각화와 힌트 생성 전용이다.
 */

/**
 * 위계 노드의 종류.
 * - `proposition`: 최소 의미 명제. 위계의 잎.
 * - `composite`: 명제 또는 하위 합성의 상위 합성.
 * - `title`: 문단 전체의 핵심. 위계의 루트. 문단당 정확히 하나.
 */
export type GoldNodeKind = 'proposition' | 'composite' | 'title';

/**
 * 명제가 담는 관계. 판정 규칙 R1(양끝 노드)이 이 구조 위에서 동작한다 —
 * 학생이 `from`과 `to`를 모두 언급하고 방향이 일치하면 충족.
 */
export interface Relation {
  readonly from: string;
  readonly to: string;
  /** 예: '인과', '조건', '분류', '정의', '대조'. 자유 문자열로 두되 프롬프트가 어휘를 고정한다. */
  readonly kind: string;
}

export interface GoldNode {
  readonly id: string;
  readonly paragraphId: string;
  readonly kind: GoldNodeKind;

  /** 노드의 의미를 서술한 문장. ablation 시 이 텍스트를 임베딩한다. */
  readonly text: string;

  /**
   * 충족 시 학생에게 공개하는 축약형 (스펙: "간략화된 정답").
   * 미충족 노드는 위치만 노출되고 이 값은 공개하지 않는다.
   */
  readonly shortForm: string;

  /** `kind === 'proposition'`일 때 채워진다. R1 판정의 입력. */
  readonly relation?: Relation;

  /**
   * 이 명제에 붙은 예외 조항 ("다만 …인 경우에는").
   * 사용 가능 지문의 상당수가 예외 구조를 가지므로 스키마에 자리를 둔다.
   * 채우는 것은 후속 과제이며, 비어 있어도 Gate A 2차 확인이 문단 원문으로 판정한다.
   */
  readonly exceptions?: readonly string[];

  /**
   * 신장 트리를 이루는 유일한 부모. 루트(`title`)만 `null`이다.
   * 합성 프롬프트가 직접 지정한다 (계획 D2).
   */
  readonly primaryParentId: string | null;

  /**
   * primary 외의 부모들. 다중 지지 구조를 보존하되 보상 회계에는 참여하지 않는다.
   */
  readonly secondaryParentIds: readonly string[];
}

/**
 * 노드 하나의 ablation 가중치.
 *
 * `local`은 **직속 부모 대비** 손상도다 (계획 D2):
 *   w(v) = 1 − cos( embed(parent.text), embed(regenerate(parent without v)) )
 * 국소량이므로 슬롯이 무엇인지와 무관하게 계산된다 — 순환 의존이 없다.
 *
 * `global`은 primary 경로를 따라 루트까지 곱한 값이다:
 *   W(v) = Π w(a) for a on the primary path from v up to root
 * 서로 다른 부모·깊이의 노드를 한 스케일에서 비교하기 위한 값이며, 보상 산출에 쓴다.
 */
export interface NodeWeight {
  readonly nodeId: string;
  readonly local: number;
  readonly global: number;
  /** 재현·재계산용. 프로바이더를 바꾸면 이 텍스트를 다시 임베딩만 하면 된다. */
  readonly regeneratedParentText: string;
}

/** 문단 하나의 완성된 골드. */
export interface GoldMap {
  readonly paragraphId: string;
  readonly nodes: readonly GoldNode[];
  readonly weights: readonly NodeWeight[];
  /** 학생에게 제시되는 노드들. primary 신장 트리 위의 안티체인 컷. */
  readonly coreSlotIds: readonly string[];
  readonly titleNodeId: string;
}
