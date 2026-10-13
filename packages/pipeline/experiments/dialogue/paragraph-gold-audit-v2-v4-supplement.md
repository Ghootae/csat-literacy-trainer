## 원칙-예외 v4 기계 판정 통합 계약

`PRINCIPLE_EXCEPTION_COVERAGE`만 다음 증거 계약을 추가로 적용한다. 다른 네 회귀 검사는 기존
통합 감사 v2 규칙대로 판정한다.

최종 원칙-예외 판정은 코드가 계산한다. 당신은 `principleExceptionEvidence`에 판정에 필요한
증거를 빠짐없이 기록하고, 같은 결과를 `PRINCIPLE_EXCEPTION_COVERAGE` 검사와 issue에 일관되게
반영한다.

### 구조 유형을 먼저 분류한다

- `RULE_EXCEPTION`: 같은 규칙·결정 대상에 관해 일반 원칙을 제시하고, 더 좁은 조건에서 그
  원칙을 제한·변경하거나 다른 규칙을 우선 적용한다.
- `MODEL_LIMITATION_REMEDY`: 하나의 설명·제도 모델에 한계가 있어 다른 모델이 보완한다.
- `CONDITIONAL_BRANCH`: 조건 성립 여부에 따라 서로 다른 절차나 결과로 나뉜다.
- `OTHER`: 위 유형이 아닌 대조·인과·절차·개념 설명이다.
- `NOT_APPLICABLE`: 비교할 구조 자체가 없다.

원칙-예외 coverage는 `RULE_EXCEPTION`에만 적용한다. 자유주의적 법 모델의 한계 때문에
사회복지국가적 법 모델이 등장한 구조는 `MODEL_LIMITATION_REMEDY`다. 재판과 합의 시 조정으로
갈리는 구조는 `CONDITIONAL_BRANCH`다.

### 출처, 명시성, proposition 결합

원칙과 예외의 `sourceScope`는 `TARGET_PARAGRAPH`, `PASSAGE_CONTEXT_ONLY`, `UNRESOLVED`,
`NOT_APPLICABLE` 중 하나다. 각 coverage는 `EXPLICIT_EQUIVALENT`, `IMPLICIT_ONLY`, `ABSENT`,
`NOT_APPLICABLE` 중 하나다. 직접 진술만 `EXPLICIT_EQUIVALENT`다.

원칙과 예외 각각에 `propositionAggregation`을 부여한다.

- `SINGLE_DIRECT`: proposition 하나가 의미를 직접 완성한다.
- `MULTIPLE_DIRECT_UNION`: 둘 이상의 원자 proposition이 의미 요소를 나누어 담고, 합치면 새
  전제 없이 의미가 완성된다.
- `REQUIRES_INFERENCE`: 합쳐도 생략된 전제나 새 관계를 보충해야 한다.
- `ABSENT`: 대응 proposition이 없다.
- `NOT_APPLICABLE`: 검사가 적용되지 않는다.

propositionBundle은 의도적으로 원자화되어 있다. 하나의 proposition이 전체 예외를 혼자 말하지
않는다는 이유만으로 `IMPLICIT_ONLY`라고 하지 않는다. 예를 들어 하나가 법률로 내용을 정하는
경우를 말하고 다른 하나가 그 경우 계약으로 변경할 수 없다고 직접 말한다면 두 proposition의
합은 `MULTIPLE_DIRECT_UNION`이다.

`RULE_EXCEPTION`이 아니면 양쪽 side의 coverage와 aggregation은 `NOT_APPLICABLE`로 반환한다.

### v2 회귀 검사와의 일치

코드의 상태 대응은 다음과 같다.

- v4 `PASS` → v2 `PRINCIPLE_EXCEPTION_COVERAGE.status = PASS`
- v4 `NOT_APPLICABLE` 또는 `OUT_OF_PARAGRAPH_SCOPE` → v2 status `NOT_APPLICABLE`
- v4 `FAIL`, `DEFER_TO_SOURCE_FIDELITY`, `UNRESOLVED_SOURCE_SCOPE` → v2 status `FAIL`

마지막 경우에는 반드시 실제 수리 target을 가진 issue를 작성하고, 관련 layerCheck와
`PRINCIPLE_EXCEPTION_COVERAGE.issueIds`에 연결한다. centralStory, centralAxis, coreRelation에서
각각 의미가 빠졌다면 한 issue로 합치지 말고 필드별로 나눈다.

`principleExceptionEvidence.schemaVersion`은 `principle-exception-adjudicator-v4`, 최상위
`integrationVersion`은 `paragraph-gold-audit-v2-v4-experiment-v1`을 사용한다.
