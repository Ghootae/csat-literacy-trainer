# 2026-09-23 JEV 정보 비대칭 materiality 파일럿

- 사용자가 익숙한 정보 비대칭 1문단을 첫 중요도 시험 표본으로 선택했다.
- 현재 dialogue gold-v2에는 P/E 중간 산출물이 없고 AX/MR 및 `diagnosticRole`만 있다. 따라서 기존 역할을 사전 기대값으로 고정한 MR 수준 통제 시험을 수행했다.
- 5개 boolean 질문을 한 호출에 묶어 동일 요청을 5회 실행했다. required(MR2·MR3·MR4)는 0.78–0.88, error_only(MR1·MR5)는 0.22–0.40이었다. required 최솟값과 error_only 최댓값의 최악 간격은 0.38이며 순위 분리는 5/5회였다.
- 이 결과는 omission/materiality 질문 형식의 양성 신호지만 MR 내부 candidate P 필터 성능을 입증하지 않는다. MR 역할은 이미 골드에 있으므로 운영 호출 가치도 없다.
- 다음 검증은 3단계 중간 산출물이 남은 생산 문단에서 사람 기준을 사전 고정한 `MR × candidate P` 시험이다.
- 근거: `docs/experiments/jev-materiality-information-asymmetry-v1-2026-09-23/REPORT.md`

