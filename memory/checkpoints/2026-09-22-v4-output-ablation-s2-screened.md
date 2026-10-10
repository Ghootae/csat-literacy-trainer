# 2026-09-22 V4 누적 절삭 S2 스크리닝

## 변경점

- S1의 중심 표상 두 필드 제거에 `decisionSummary` 제거를 누적한 S2를 사람 승인 자연 응답15사례에서 각1회 실행했다.
- 1차15호출 비용은 `$0.324970`였다. N27 계약 실패와 N36 새 질문을 각1회 제한 재실행했고 추가 비용은 `$0.038604`였다.
- 제한 재실행에서 두 문제는 모두 사라졌다. 확인값은 계약15/15, 질문 정책15/15, 질문 축15/15, ERROR 소실0, 새 질문0이었다.
- 사람 승인 축 상태 완전 일치는7/15로 S1의10/15보다 낮았다. 차이는 모두 질문 행동이 같은 PASS↔UNCLEAR_OK였으나 N44의 논쟁 축 과소평가 신호를 남겼다.
- S2는 행동 기준 스크리닝을 조건부 통과했지만 최종 채택·운영 반영하지 않았다. S3는 작은 질문 생성 검사를 함께 설계해야 한다.

## 근거

- `docs/experiments/v4-output-field-ablation-s2-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-field-ablation-s2-2026-09-22/summary.json`
- `docs/experiments/v4-output-field-ablation-s2-2026-09-22/execution-audit.json`
- `docs/experiments/v4-output-field-ablation-s2-2026-09-22/rerun-results.jsonl`

