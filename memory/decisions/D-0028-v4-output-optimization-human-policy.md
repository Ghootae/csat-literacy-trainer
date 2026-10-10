---
id: D-0028
status: superseded
date: 2026-09-22
scope: paragraph-v4-output-optimization
supersedes: none
superseded_by: D-0030
---

# V4를 기준선으로 유지하고 짧은 판정 발판을 둔 단계적 출력 최적화

사용자는 V4-light 실험의 불일치15건이 담긴 REVIEW-PACKET을 직접 검토한 뒤, 각 사례에서 V4의 표시 결과를 승인했다. 학생의 실제 이해가 충분해도 작성 요약은 표현 비용 때문에 한 번 더 필터링될 수 있으므로, 표면 누락을 곧바로 질문 대상으로 삼으면 과개입이 늘어난다는 제품 가정이다.

- 현재 V4를 운영·품질 기준선으로 유지한다.
- V4-light는 상세 기록 일부가 판정 발판일 가능성을 드러낸 진단 실험으로 보존하며 승격하지 않는다.
- 기록 필드는 한꺼번에 제거하지 않고 묶음별로 제거한다.
- 완전히 숨은 내부 검토 대신 축별 `확인된 중심 의미`, `남은 중요한 공백`, `명시적 오류`, `상태`의 짧은 판정 발판을 남긴다.
- 질문이 필요한 경우에만 questionFocus, ERROR일 때만 errorEvidence를 조건부로 출력하는 후보를 검토한다. effectiveResponse는 유지한다.
- 정확한 V4 상태 일치보다 사람 기준의 질문 적절성, 과개입, 중요한 공백 미탐지, 명시적 오류 보존을 우선 평가한다.
- 1차 후보가 통과한 뒤에만 수정·철회·짧은 답변·질문 생성을 포함한 전체 흐름을 시험한다.

첫 제거 묶음은 `centralObjectRepresentation`과 `centralStoryRepresentation`이다. 현재 코드에서 이 둘은 snapshot·handoff·개발자 검사 기록으로 보존되지만 질문 라우팅·축 공개·학생 UI 행동에 직접 사용되지 않는다. 사용자 승인 아래 사람 승인 불일치15건에서 조건별1회, 총30호출을 실행했다. 후보는 사람 승인 질문 여부15/15를 보존하고 지연8.9%·비용9.2%를 줄였지만, 축 상태 사람 일치는10/15로 개선되지 않았고 숨은 주장 인용 계약은13/15만 유효했다. 단회 실행이므로 제거 효과와 V4 자체 변동을 분리할 수 없어 후보를 운영에 반영하지 않는다.

누적 스크리닝 S2는 첫 묶음에 `decisionSummary` 제거를 추가했다.15사례1회 실행에서 계약 실패1건과 새 질문1건이 발생했으나, 합의한 제한 재실행에서 둘 다 재현되지 않았다. 확인값은 질문 정책·질문 축·계약15/15, ERROR 소실0이었지만 사람 승인 축 상태 일치는7/15였다. 차이는 모두 질문 행동이 같은 PASS↔UNCLEAR_OK였으므로 행동 기준 스크리닝은 조건부 통과로 두되 운영에 반영하지 않는다. 다음 질문 계획 절삭부터는 작은 질문 생성 품질 검사를 같이 동결한다.

S3는 S2에서 OK의 `questionIntent`를 null로 지연시키고 자동 질문 상태에만 짧은 계획을 남겼다.15사례 중4건에서 UNCLEAR_OK의 `targetAxisId`까지 null로 소실됐고 N17에서 새 자동 질문이 생겨 미통과했다. 별도의 동결 질문8사례 비교에서는 전체 계획8/8, 계획 없음6/8, 짧은 계획8/8로 검토됐다. 따라서 계획 완전 삭제·OK null 정책은 채택하지 않으며, 다음 후보는 target을 유지하면서 모든 미통과 상태에 짧은 계획을 남기는 S3.1이다. 현재 최심 조건부 통과점은 S2다.

15건의 V4 effectiveResponse와 축별 상태·이유·질문 후보 여부를 사례별 사람 기준으로 동결한다. 검토 문서에 보이지 않은 claimLedger·errorClaims나 계약 유효성은 승인 범위가 아니다. 특히 N03의 V4 표시 판정은 승인됐지만 claimLedger 인용 계약 실패는 유지한다. 기계 판독 기록은 `docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.json`이다.

근거: `docs/review/v4-output-optimization-human-policy-2026-09-22.md`, `docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md`, `docs/experiments/v4-output-field-ablation-v1-2026-09-22/REPORT.md`, `docs/experiments/v4-output-field-ablation-s2-2026-09-22/REPORT.md`, `docs/experiments/v4-output-field-ablation-s3-2026-09-22/REPORT.md`, 사용자 직접 검토 결정.

재검토: 조건부 최소 출력 후보가 V4보다 과개입을 늘리지 않으면서 중요한 공백·오류를 보존하고 비용·지연을 줄인다는 자연 응답 및 전체 흐름 근거가 생길 때.
