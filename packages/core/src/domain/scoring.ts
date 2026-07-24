/**
 * 학생 응답 판정과 보상의 도메인 모델.
 *
 * 판정은 2단이다 (계획 D1). 1차는 골드 명제 하나를 학생 응답 명제와 대조하는 국소 판정이고,
 * 2차는 1차가 모순을 의심한 경우에만 문단 원문 전체를 맥락으로 재확인한다.
 *
 * 2단으로 나눈 이유는 예외 조항이다. "매도인은 원인과 무관하게 책임진다. **다만** 매수인이
 * 알았던 경우에는 책임지지 않는다" 같은 문단에서, 예외를 정확히 읽은 학생의 진술은 골드 명제
 * 하나만 놓고 보면 모순으로 보인다. 1차에서 바로 Gate A를 발동하면 **정확히 읽은 학생을
 * 강제 교정**하게 되고, 이는 학습 앱에서 가장 치명적인 실패다.
 */

/** 학생이 자유 서술로 입력한 원문. */
export interface StudentResponse {
  readonly id: string;
  readonly sessionId: string;
  /** 대상 코어 슬롯의 노드 id. 타이틀 단계에서는 타이틀 노드 id. */
  readonly targetNodeId: string;
  /** 0 = 최초 시도, 1 = 재도전. 재도전은 학생이 자발적으로 선택한다. */
  readonly attempt: number;
  readonly text: string;
}

/** 학생 응답을 골드와 동일한 형식으로 파싱한 결과 (스펙 요구사항). */
export interface ParsedProposition {
  readonly text: string;
  readonly from: string;
  readonly to: string;
  readonly kind: string;
}

/**
 * 1차 판정 결과.
 * - `entail`: 학생이 이 골드 명제를 말했다 → 충족
 * - `neutral`: 언급하지 않았다 → 누락. 보상에서 빠지되 학생 재량으로 재도전 가능
 * - `contradict-suspect`: 같은 관계를 다르게 주장했다 → **에스컬레이션 트리거일 뿐**,
 *   그 자체로 Gate A를 발동하지 않는다
 */
export type FirstPassVerdict = 'entail' | 'neutral' | 'contradict-suspect';

export interface FirstPassJudgment {
  readonly goldNodeId: string;
  readonly verdict: FirstPassVerdict;
  /** 판정 근거가 된 학생 명제. `neutral`이면 비어 있다. */
  readonly matchedStudentProposition?: ParsedProposition;
}

/**
 * 2차 확인 결과. `contradict-suspect`인 1차 판정에 대해서만 수행한다.
 * `exception-consistent`는 학생이 문단의 예외 조항을 정확히 반영한 경우이며,
 * Gate A를 발동하지 않고 해당 명제를 누락으로 처리한다.
 */
export type SecondPassVerdict = 'true-contradiction' | 'exception-consistent';

export interface SecondPassJudgment {
  readonly goldNodeId: string;
  readonly verdict: SecondPassVerdict;
  readonly rationale: string;
}

/** 슬롯 하나에 대한 최종 판정. */
export interface SlotEvaluation {
  readonly slotNodeId: string;
  readonly first: readonly FirstPassJudgment[];
  readonly second: readonly SecondPassJudgment[];
  /** 2차까지 통과해 확정된 모순. 비어 있지 않으면 Gate A가 발동한다. */
  readonly confirmedContradictionNodeIds: readonly string[];
  /** `reward = Σ(충족 × W)`. Gate A 발동 시에는 산출하지 않는다. */
  readonly reward: number;
}

/** Gate A 발동 여부. 학생 재량이 없는 유일한 강제 개입 지점이다. */
export function gateATriggered(evaluation: SlotEvaluation): boolean {
  return evaluation.confirmedContradictionNodeIds.length > 0;
}

/**
 * 타이틀 판정 (계획 R2).
 *
 * 골드 타이틀 문자열과의 유사도가 아니라, 학생 타이틀이 **코어 슬롯들을 아우르는가**로 잰다.
 * 세 가지 반-게이밍 제약이 붙는다:
 *  1. 분모는 **코어 슬롯 전체**다. 충족 슬롯만 세면 덜 맞춘 학생일수록 타이틀이 쉬워진다.
 *  2. 슬롯 문장의 **표층 재사용은 포괄로 치지 않는다**. 이어 붙이기가 최적 전략이 되면
 *     스펙이 훈련시키려는 상위 추상화가 오히려 손해가 된다.
 *  3. 타이틀 보상은 슬롯 보상과 **합산하지 않는다**. 합산하면 같은 W를 두 번 세게 된다.
 */
export interface TitleEvaluation {
  readonly titleNodeId: string;
  /** 코어 슬롯 전체에 대한 포괄 여부. 분모가 고정된다. */
  readonly coveredSlotIds: readonly string[];
  readonly allSlotIds: readonly string[];
  /** 표층 재사용으로 판정되어 포괄에서 제외된 슬롯. */
  readonly surfaceReuseSlotIds: readonly string[];
  /** 포괄률. 슬롯 보상과 별도 스케일이며 합산되지 않는다. */
  readonly coverageRatio: number;
}
