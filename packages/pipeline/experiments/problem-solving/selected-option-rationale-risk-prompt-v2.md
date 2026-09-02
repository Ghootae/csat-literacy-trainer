# 선택 선지 근거 위험 프로브 프롬프트 v2

입력은 코드가 확정한 4방향 프로필, 학생이 버튼으로 고른 선지, 학생 근거, 그리고 전체 골드 또는 선택 선지 완전 슬라이스다.

## 결정권

- `evaluationContext.profile`, `selectionCorrect`, `choiceDecision`, `selectionIntent`는 코드가 확정했다. 바꾸거나 재계산하지 않는다.
- `choiceDecision`은 대상 선지가 실제로 채택되어야 하는지(`ACCEPTED`) 또는 기각되어야 하는지(`REJECTED`)를 뜻한다.
- 모델은 학생 근거가 이 실제 판단을 승인 근거로 타당하게 뒷받침하는지만 판정한다.
- 선지 문장을 다시 말한 부분은 근거가 아니다. 학생이 제시한 이유·관계·조건만 근거로 평가한다.

## 모든 실질 주장 분해

- 학생 근거의 선택 결론만 보지 말고, 그 이유로 제시한 실질 주장을 빠짐없이 별도 finding으로 평가한다.
- 핵심 근거가 맞아도 틀린 부가 설명을 생략하지 않는다. 학생이 제시한 추론 경로에서 선택 결론을 도출하는 데 필요한 전제이면 `DECISIVE`, 그 전제가 없어도 학생의 선택 근거가 유지되면 `NON_DECISIVE`다.
- `DECISIVE MATCHES` finding이 있더라도 `ALL_OF`의 다른 전제가 빠졌거나 선지의 복합 claim 일부만 설명했다면 전체는 `INSUFFICIENT`일 수 있다.
- 관련 사실만 말했거나 `ALL_OF`의 일부만 제시했다면 `INSUFFICIENT`다.
- 입력에 없는 사실을 상식이나 정답 키로 보충하지 않는다. 승인 출처가 없으면 `NOT_ESTABLISHED`로 기록한다.
- 추론의 결론이 학생의 최종 선택을 지지하더라도, 그 추론에 포함되지 않은 별도 전제 주장을 그 결론만으로 `MATCHES` 처리하지 않는다.

## 판정

- `SUPPORTED`: 학생 근거가 실제 `choiceDecision`의 충분 근거 집합 하나를 충족하고 결정적 충돌이 없다.
- `CONTRADICTED`: 승인 근거로 학생이 제시한 결정적 주장의 부정을 도출할 수 있다.
- `INSUFFICIENT`: 학생이 충분 근거 집합을 완성하지 못했거나, 제시한 결정적 주장도 그 부정도 승인 근거에서 도출되지 않는다.
- 결정적 일치와 비결정적 오류만 있으면 충분 근거 집합이 완성된 경우 `SUPPORTED`로 판정할 수 있고, 비결정적 오류는 별도 finding으로 보존한다.
- 실제로 부정이 도출되는 결정적 충돌이 하나라도 있으면 `CONTRADICTED`다.

## DOES_NOT_JUSTIFY

- `DOES_NOT_JUSTIFY`는 약한 모순이 아니다. 주장과 그 부정 모두 승인 근거에서 도출되지 않는 독립 관계다.
- 학생이 `DOES_NOT_JUSTIFY` 대상 주장을 사실이라고 단정하면 `NOT_ESTABLISHED`다. 반대 사실이 별도로 도출될 때만 `CONFLICTS`다.
- 프로필이 `WRONG_*`이거나 실제 선지가 `REJECTED`라는 이유만으로 `CONTRADICTED`를 출력하지 않는다.

## 출력 근거

- `studentQuote`는 학생 근거에 실제로 존재하는 연속 문자열만 사용한다.
- `sourceRefs`는 입력 `evidenceGold`에 실제 존재하며 해당 finding을 직접 뒷받침하는 ID만 사용한다.
- `MATCHES`: 승인 근거로 학생 주장을 도출할 수 있다.
- `CONFLICTS`: 승인 근거로 학생 주장의 부정을 도출할 수 있다.
- `NOT_ESTABLISHED`: 학생 주장도 그 부정도 도출되지 않는다.
- 자연어를 정규식으로 다시 판정해 라벨을 뒤집는 후처리는 없다.
