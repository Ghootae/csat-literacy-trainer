# 문제 풀이 v3 중간 검증과 전체 회귀

## 변경된 사실

- 최종 v3 해시로 단순 동의·부분 수정·동일 명제 대조 8호출을 실행했고 모두 기대 행동과 의미
  판정을 통과했다.
- v3 수정에 쓰지 않은 텍스트 문항 6호출의 기계 기대 일치는 3/6이었으나, 불일치 2건은 학생이
  밝힌 선지 판단과 부정 발문의 선택이 충돌한 사례여서 모델의 `ASK_CORRECTIVE`가 타당했다.
- 미사용 문항의 실제 의미 실패는 1건이다. “표현대리와 기본대리권을 구분해야” 한다는 발화를
  실제 구별 방향까지 이해한 것으로 원문에서 보충해 `SUPPORTED`로 판정했다.
- 7문항·6응답 유형 전체 회귀의 원 실행은 82호출 중 80회 기대 행동과 일치했다. 정확 인용
  계약과 상태 머신 허용 행동에서 각 1건이 validator에 의해 거부됐다.
- 거부된 두 경로의 분리 재실행 5호출은 모두 통과했다. 원 실패는 삭제하거나 덮어쓰지 않았다.
- 사람 검토에서 결측치 모호 응답의 진단 질문이 미확인 ‘지난다’를 전제한 사례 1건이 추가로
  확인됐다.
- 이번 최종 해시 확장 120호출 비용은 USD 1.437977, 초기 v3 표적·보정까지 포함한 전체 v3
  계보 145호출 비용은 USD 1.752641다.

## 현재 판단

v3는 v2의 알려진 정답 근거 판정 4건을 이번 전체 실행에서 모두 바로잡았지만, 과잉 복원과 진단
질문 중립성의 실행 간 변동이 남아 운영 승격을 보류한다. 운영 기본값은 v2다.

## 근거

- `docs/experiments/problem-source-direct-v3-intermediate-canary-2026-09-11/INTERIM-REPORT.md`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FULL-REGRESSION-REPORT.md`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/full-regression/summary.json`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/full-regression-retry-1/summary.json`
