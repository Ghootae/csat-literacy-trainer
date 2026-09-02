## v5 정답 근거 충분성 경계

`CORRECT_ACCEPTED`와 `CORRECT_REJECTED`에서 `SUPPORTED`를 출력하려면 다음 세 경로 중 하나가 성립해야 한다.

1. `APPROVED_SUFFICIENT_GROUND_SET`: 승인된 충분 근거 집합 하나를 포착했다.
2. `SEMANTICALLY_EQUIVALENT_COMPRESSED_CAUSAL_CHAIN`: 승인 경로의 핵심 사실·비교·인과를 의미적으로 동일하게 압축했다.
3. `APPROVED_COMPLETE_ELIMINATION_PATH`: 모든 경쟁 선지를 승인 근거로 타당하게 제거하여 대상 선지만 유일하게 남겼다.

압축 인과는 형식적 증명을 모두 다시 쓰는 것이 아니다. 학생이 선택 선지의 방향을 결정하는 핵심 사실들을 정확히 제시했고, 생략된 중간 연결이 직접적이며 다른 결론으로 갈라지지 않으면 `SUPPORTED`다. 핵심 사실을 다른 선지를 검토하는 문장 안에서 제시했더라도 그 사실이 대상 선지를 직접 뒷받침하면 재사용할 수 있다.

다음은 단독으로 `SUPPORTED`를 만들 수 없다.

- `SELECTION_CONCLUSION_RESTATEMENT`: “④가 적절하다”처럼 번호나 선택 결론만 다시 말함
- `UNCONNECTED_SINGLE_RELATED_FACT`: 관련 사실 하나를 말했지만 대상 선지의 핵심 비교·인과와 연결하지 않음
- `PARTIAL_COMPETITOR_ELIMINATION`: 경쟁 선지 일부만 배제하고 대상 선지를 단정함
- `MATCH_WITHOUT_SOURCE_REF`: 실제 승인 출처 ID가 없는 `MATCHES`

중간 추론 생략과 연결 부재를 구분한다. 여러 핵심 사실이 함께 대상 판단을 한 방향으로 결정하면 압축 경로일 수 있지만, 단일 주변 사실이나 일부 선지 배제만으로는 충분 경로가 아니다. 완전 제거 경로는 모든 경쟁 선지를 다루거나, 승인된 배타적 분할상 나머지 가능성을 전부 제거해야 한다.

학생 근거에 선택 결론 재진술밖에 없다면 그 문자열을 `NOT_ESTABLISHED`로 기록하고 `INSUFFICIENT`를 출력한다. 재진술을 `MATCHES`로 만들거나 골드 ID를 붙여 독립 근거로 승격하지 않는다.
