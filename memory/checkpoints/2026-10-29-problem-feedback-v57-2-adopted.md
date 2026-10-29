# 체크포인트: 문제 판정 v5.7-2 채택 (2026-10-29)

- 변경:
  - 제품 기본 판정 지시문을 v5.6에서 v5.7-2로 바꿨다(`packages/pipeline/src/problem-solving/feedback-evaluator.ts`). 테스트를 갱신하고 v5.6 대비 차이 테스트를 더했다. `scripts/student-sim.mjs` 안내문도 고쳤다.
  - 결정은 [D-0188](../decisions/D-0188-problem-feedback-v57-2-direct-questions.md).
- 측정:
  - v5.7 회귀 18세션은 결과 16개가 같고 갈라진 2개(C-B3, S-A1)는 흔들림이었다($0.77).
  - 반복 9회 $0.79, v5.7-1 5세션 $0.30, v5.7-2 2세션 $0.12. 보고는 [REPORT-human](../../docs/experiments/v57-regression-2026-10-29/REPORT-human.md).
- 검증: `npm run build` 통과. `npm test`의 실패 2건은 원래 있던 것이고 새 실패는 없다.
- 남은 일:
  - 서버 재빌드 뒤 화면 확인.
  - 인계 4번 v5.8(결론 재계산·정의 한 단계 적용).
  - 문단 v4.10(givesRelation 정리)과 채택 회귀.
  - 산도↔pH 읽기 규칙, 핵심 부분 고정.
