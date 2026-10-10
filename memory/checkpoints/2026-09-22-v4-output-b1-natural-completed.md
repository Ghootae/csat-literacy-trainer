# 2026-09-22 B1 자연 응답·질문 연결 검증 완료

## 변경점

- S2에서 독립 분기한 압축 claimLedger B1을 자연 응답15건, 제한 재실행2건, 질문 연결4건으로 검증했다.21호출·`$0.401088`, 운영 변경 없음.
- 첫 판정은 계약14/15, 사람 질문 정책13/15, 새 질문2건이었다. N17 재실행은 OK로 돌아왔지만 N03 인용 계약 실패는 반복됐고 재실행하지 않은 N27 새 질문1건이 남았다. 확인값은 계약14/15·질문 정책14/15·새 질문1건이다.
- 유효14건의 source 복원, current/retired 분리, errorClaims current 참조에는 구조적 실패가 없었다. 자연 표본의 superseded 사례 N17도 옛 오류를 재활성화하지 않았다.
- 질문4건은 계약4/4, 옛 오류 반복0, 대상 축 이동0, 중심축 밖 요구0으로 Codex 검토됐다.
- 기존 S2 원장의 B1 오프라인 변환은 원장 내부23.7% 감소였지만 실제 B1 판정15회의 출력 토큰은 S2 1차보다2.2% 늘고 비용은1.9%만 줄었다. 제한 재실행을 포함하면 판정 비용은 오히려 높다.
- B1 자연 후보는 미승격한다. 운영V4와 S2를 유지하고 A+B1 결합은 실행하지 않는다.

## 근거

- `docs/experiments/v4-output-b1-natural-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-b1-natural-2026-09-22/QUESTION-REVIEW.md`
- `docs/experiments/v4-output-b1-natural-2026-09-22/execution-audit.json`
