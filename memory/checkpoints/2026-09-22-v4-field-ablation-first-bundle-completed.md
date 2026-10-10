# 2026-09-22 V4 기록 필드 절삭 1차 묶음 완료

## 변경점

- 사용자 승인에 따라 사람 기준이 동결된 자연 응답15사례에서 현재 V4와 `centralObjectRepresentation`·`centralStoryRepresentation`만 제거한 후보를 조건·사례당1회 비교했다.
- 총30호출, `gpt-5.6-terra`, `store:false`, 실제 추정 비용은 `$0.704402`였다.
- 후보는 사람 승인 질문 여부15/15, 현재 V4 재실행은14/15였다. 사람 승인 축 상태 완전 일치는 두 조건 모두10/15였다.
- 두 조건의 축 상태는13/15, 질문 여부는14/15에서 같았다.
- 후보는 중앙 지연8.9%, 출력 토큰16.8%, 비용9.2%를 줄였다.
- 후보의 N03·N17에서 `claimLedger` 인용/출처 계약 실패가 발생해 유효 출력은13/15였다. 사례당1회뿐이므로 판정 차이의 인과와 안정성은 확정하지 않았다.
- 후보는 운영에 반영하지 않았다.

## 근거

- `docs/experiments/v4-output-field-ablation-v1-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-field-ablation-v1-2026-09-22/summary.json`
- `docs/experiments/v4-output-field-ablation-v1-2026-09-22/execution-audit.json`
- `docs/experiments/v4-light-output-v1-2026-09-22/HUMAN-ADJUDICATION.json`

