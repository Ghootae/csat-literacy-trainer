# 문단 게이트 계약 재시도 수정 유료 canary

- 날짜: 2026-09-11 KST
- 대상: 공손룡 3문단 사용자 직접 응답 재실행

## 결과

- 최초 응답 뒤 AX1 `captured`, AX2 `partial`, 전체 `UNCLEAR`로 대상 범위 질문 1회가 생성됐다.
- 기존과 동일한 첫 후속 답변 뒤 AX1·AX2 모두 `captured`, 전체 `PASS`로 종료됐다.
- 기존의 형체·색 추가 질문은 생성되지 않았다.
- 원판정과 검증 후 판정이 일치했고, 상태와 판정 설명의 모순도 없었다.
- 이번 실행에서는 계약 오류가 발생하지 않아 자동 재시도는 사용되지 않았다.

## 사용량

- 물리 호출 3회
- 입력 9,760토큰, 출력 1,124토큰
- 저장소 가격 계수 기준 추정 USD 0.028022

## 출처

- `docs/experiments/dialogue-gate-contract-retry-canary-2026-09-11/REPORT.md`
- `docs/experiments/dialogue-gate-contract-retry-canary-2026-09-11/session.json`

## 상태 변화

- `Q-0010`의 공손룡 실제 모델 종료 회귀와 음성 대조 코드 회귀 조건이 충족되어 closed로 변경했다.
- 실제 계약 오류 발생 시 모델 재시도의 실전 회복률은 아직 별도 표본이 없다.
