# 문제 풀이 기본 골드 생성

당신은 수능형 독해 문항의 기본 골드 후보를 생성한다. 입력은 지문, 발문, 보기·그림, 선지와 정답 키다. 공식 해설은 기본 골드 생성 근거가 아니며 별도 보충 층에서만 다룬다.

## 정보 층위

1. `passageDetailGold`: 지문에 명시되거나 지문 자체에서 안전하게 복원되는 명제만 기록한다.
2. `scenario.facts`와 `visualAssertions`: 보기·그림에 실제로 주어진 사실만 기록한다.
3. `optionClaims`: 각 선지가 주장하는 사실·조건·인과·비교를 원자적으로 분해한다.
4. `itemInferences`: 지문·보기·그림의 전제를 특정 선지 주장에 적용해 얻는 문항 수준 추론만 기록한다.
5. `supplementalExplanationInferences`: 기본 골드만으로 판정할 수 없을 때 사용하는 공식 해설의 추가 관계다.

문항 추론을 지문 명제로 역수입하지 않는다. 정답 키에 맞추기 위해 지문에 없는 사실을 만들지 않는다.

## 방향성 itemInference 계약

모든 `itemInference`는 다음 필드를 생성한다.

- `description`: 기존 소비자를 위한 요약이다. 추론 행위가 아니라 `conclusion`과 같은 방향의 완결된 명제여야 한다.
- `premiseRefs`: 실제 사용한 MP·SF·VA·관계 ID만 기록한다.
- `operation`: `APPLY_RULE`, `CHECK_CONDITION`, `COMPARE`, `CLASSIFY`, `MAP_CONCEPT`, `FOLLOW_CAUSAL_CHAIN`, `CALCULATE`, `CHECK_JUSTIFICATION` 중 하나다.
- `conclusion`: 전제를 적용한 결과 무엇이 성립하거나 성립하지 않는지 주어·조건·방향을 포함해 명시한다.
- `targetClaimEffect`: 결론이 대상 선지 주장을 `SUPPORTS`하는지 `CONTRADICTS`하는지 기록한다.
- `targetClaimIds`: 이 결론이 직접 판정하는 원자 선지 주장 ID만 기록한다.
- `grounding`: `SOURCE_EXPLICIT`, `SOURCE_ENTAILED`, `ANSWER_KEY_CONSTRAINED` 중 하나다.

`description`이나 `conclusion`을 다음과 같은 추론 행위만으로 끝내지 않는다.

- “A를 B에 적용한다.”
- “A와 B를 연결한다.”
- “두 개념을 구분한다.”
- “조건을 비교한다.”
- “가능성을 판단한다.”
- “값의 변화를 계산한다.”

반드시 적용·연결·구분·비교·계산한 결과를 문장에 포함한다.

나쁜 예:

```json
{
  "description": "위헌 결론의 법적 효과를 플랫폼 B 사례에 적용한다."
}
```

좋은 예:

```json
{
  "description": "다수 의견이 제재 규정을 위헌으로 판단했으므로 플랫폼 B를 해당 규정에 따라 제재할 수 있다는 결론은 성립하지 않는다.",
  "premiseRefs": ["MP5", "SF3", "SF5"],
  "operation": "APPLY_RULE",
  "conclusion": "다수 의견이 제재 규정을 위헌으로 판단했으므로 플랫폼 B를 해당 규정에 따라 제재할 수 있다는 결론은 성립하지 않는다.",
  "targetClaimEffect": "CONTRADICTS",
  "targetClaimIds": ["OC5-1"],
  "grounding": "SOURCE_ENTAILED"
}
```

## 최소 근거 연결

- 선지마다 실제 판정에 사용한 명제·보기 사실·시각 의미만 연결한다.
- 보기 사실 전체를 모든 선지에 복사하지 않는다.
- 같은 내용을 SF와 VA가 중복 표현하면 판단에 필요한 쪽만 사용한다.
- `premiseRefs`는 기존 `references`, `scenarioFactIds`, `visualAssertionIds`의 합집합과 정확히 일치시킨다.
- 대상 주장과 직접 관련 없는 배경 사실은 제외한다.

## 주장 판정과 효과의 일치

- `targetClaimEffect: SUPPORTS`이면 대상 주장은 `assessment: SUPPORTED`, `decision: ACCEPTED`여야 한다.
- `targetClaimEffect: CONTRADICTS`이면 대상 주장은 `assessment: CONTRADICTED` 또는 `NOT_JUSTIFIED`이고 `decision: REJECTED`여야 한다.
- 하나의 추론이 여러 주장을 대상으로 하면 모든 대상 주장에 같은 효과가 성립해야 한다. 효과가 다르면 추론을 분리한다.
- `targetClaimIds`와 각 `optionClaim.itemInferenceIds`는 서로 역참조해야 한다.

## 자기 검사

출력 전 모든 `itemInference`에 대해 다음을 순서대로 검사한다.

1. 이 추론을 단독으로 읽어도 최종 결론의 방향을 알 수 있는가?
2. 같은 문장을 읽고 대상 주장을 지지한다고도, 반박한다고도 해석할 수 있는가? 그렇다면 결론을 다시 쓴다.
3. “적용한다/연결한다/구분한다/비교한다/계산한다” 뒤의 결과가 생략되지 않았는가?
4. `premiseRefs`의 각 근거가 실제 결론 도출에 필요한가? 하나씩 제거해도 결론이 같다면 제거한다.
5. `targetClaimEffect`가 대상 주장의 `assessment`와 `decision`에 논리적으로 일치하는가?
6. 출처가 정당화하지 않는 관계를 `SOURCE_ENTAILED`로 표시하지 않았는가?
7. 공식 해설의 추가 설명을 passage proposition이나 source-entailment로 역수입하지 않았는가?

반대 방향도 가능한 추론, 결론이 생략된 추론, 불필요한 전제가 남은 추론은 완료된 골드로 출력하지 않는다.
