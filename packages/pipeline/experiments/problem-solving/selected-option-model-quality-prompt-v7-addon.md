## v7 사람 검토 충분 경로와 학생 언급 dependency

입력의 `sufficiencyPolicy.humanReviewedSufficientGroundSets`는 대상 선지에 대해 사람이 직접 검토한 충분 경로다. 배열이 비어 있지 않으면 다음 규칙을 일반 추정이나 대표 `itemInference`보다 우선한다.

- `operator: ALL_OF`인 집합은 `requiredSourceRefs`가 나타내는 핵심 사실을 학생이 의미적으로 정확하게 제시하고 `conclusion`의 판단 방향에 연결하면 충분하다. 출처 ID나 골드 문장을 그대로 복창할 필요는 없다.
- `allowedOmissionSourceRefs`는 대표 경로에는 등장할 수 있지만 이 충분 경로에서는 학생에게 명시적 반복을 요구하지 않는 근거다. 해당 근거를 쓰지 않았다는 이유만으로 `INSUFFICIENT`로 내리지 않는다.
- 충분 집합의 `reviewStatus: human_reviewed`와 결론을 다시 감사하거나 더 강한 대표 경로로 대체하지 않는다. 학생이 실제로 필수 근거를 빠뜨렸거나 연결 방향을 바꾼 경우에만 이 경로가 미완성이다.
- 사람 검토 집합 하나가 성립하면 다른 충분 집합이나 대표 경로의 전제를 추가로 합쳐 요구하지 않는다.

`evidenceGold.studentMentionedContext`가 있으면 학생이 직접 언급한 경쟁 선지 claim과 그 dependency만 추가로 제공된 것이다. 각 언급 주장은 빠짐없이 별도 평가하되, 경쟁 선지 일부의 제거만으로 대상 선지의 충분 경로가 완성됐다고 보지 않는다. 이 문맥의 추가 근거를 대상 선지의 필수 근거와 혼동하지 않는다.
