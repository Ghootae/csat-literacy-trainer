# 선택 선지 근거 판정 A/B 프롬프트 v2

입력은 코드가 확정한 4방향 프로필, 학생이 버튼으로 고른 선지, 학생 근거, 그리고 전체 골드 또는 선택 선지 완전 슬라이스다.

## 결정권

- `evaluationContext.profile`, `selectionCorrect`, `choiceDecision`, `selectionIntent`는 코드가 확정했다. 바꾸거나 재계산하지 않는다.
- `choiceDecision`은 대상 선지가 실제로 채택되어야 하는지(`ACCEPTED`) 또는 기각되어야 하는지(`REJECTED`)를 뜻한다.
- 모델은 학생 근거가 이 실제 판단을 승인 근거로 타당하게 뒷받침하는지만 판정한다.
- 선지 문장을 다시 말한 부분은 근거가 아니다. 학생이 제시한 이유·관계·조건만 근거로 평가한다.
- 정답 번호나 다른 선지의 존재만으로 판정하지 않는다.

## 판정

- `SUPPORTED`: 학생 근거가 실제 `choiceDecision`의 결정적 근거를 하나 이상 충족하고 결정적 충돌이 없다.
- `CONTRADICTED`: 승인 근거로 학생이 제시한 결정적 주장의 부정을 도출할 수 있다.
- `INSUFFICIENT`: 학생이 제시한 결정적 주장도 그 부정도 승인 근거에서 도출되지 않거나, 실제 판단을 뒷받침할 근거가 부족하다.
- 프로필이 `WRONG_*`이거나 실제 선지가 `REJECTED`라는 이유만으로 `CONTRADICTED`를 출력하지 않는다. 학생 문장에서 실제 의미 충돌을 찾아야 한다.
- 짧은 표현과 세부 과정 생략은 허용한다. 선택 선지 완전 슬라이스의 `decisionRule.sufficientGroundSets`는 `ANY_OF` 집합 중 하나의 `ALL_OF`가 충족되면 충분하다는 뜻이다.

## DOES_NOT_JUSTIFY

- `DOES_NOT_JUSTIFY`는 약한 모순이 아니다. 주장과 그 부정 모두 승인 근거에서 도출되지 않으며 선지가 요구한 주장에 근거가 부족한 독립 관계다.
- 학생이 `DOES_NOT_JUSTIFY` 대상 주장을 사실이라고 단정하면 그 finding은 `NOT_ESTABLISHED`다. 그 주장과 반대되는 사실이 별도로 도출될 때만 `CONFLICTS`다.
- 따라서 학생이 근거 없이 `DOES_NOT_JUSTIFY` 선지를 채택한 경우는 원칙적으로 `INSUFFICIENT`다. 선지가 실제로 기각된다는 이유만으로 `CONTRADICTED`로 바꾸지 않는다.
- 학생이 해당 주장이 지문에서 정당화되지 않는다고 정확히 설명하면 실제 기각 판단과 `MATCHES`할 수 있다.

## 혼합 근거

- 결정적 일치와 비결정적 오류만 있으면 `SUPPORTED`로 판정할 수 있다. 비결정적 오류는 별도 finding으로 기록한다.
- 실제로 부정이 도출되는 결정적 충돌이 하나라도 있으면 `CONTRADICTED`다.
- 관련 사실만 말했거나 `ALL_OF`의 일부만 제시했다면 `INSUFFICIENT`다.

## 출력 근거

- `studentQuote`는 학생 근거에 실제로 존재하는 연속 문자열만 사용한다.
- `sourceRefs`는 입력 `evidenceGold`에 실제 존재하는 ID만 사용한다.
- `MATCHES`: 승인 근거로 학생 주장을 도출할 수 있다.
- `CONFLICTS`: 승인 근거로 학생 주장의 부정을 도출할 수 있다.
- `NOT_ESTABLISHED`: 학생 주장도 그 부정도 도출되지 않는다.
- 각 finding은 `DECISIVE` 또는 `NON_DECISIVE`를 명시한다.
- 자연어를 규칙으로 재해석해 프로필이나 최종 라벨을 뒤집는 후처리는 없다. 따라서 구조화 출력 자체를 엄밀하게 작성한다.
