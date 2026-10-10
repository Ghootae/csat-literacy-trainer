# 문제 풀이 v3 최종 해시 표적 재실행

## 변경된 사실

- 최종 프롬프트 SHA-256 `3ba91f7093612560a874304265d510d5d968e3101983aff449152f08301a48ff`로
  표적 19호출을 다시 실행했다.
- 6문항·10경로·19호출이 모두 provider 재시도 없이 완료됐고 모델 원출력과 검증 후 출력은
  19/19 동일했다.
- 엄격 fixture 기대 행동은 18/19 일치했다. 나머지 1건은 회귀 계약이 `SUPPORTED`와
  `UNCERTAIN`을 모두 허용한 결측치 압축 경계다.
- 이 경계 사례는 `SUPPORTED` 이유에서 학생이 직접 말하지 않은 A의 정상치 집합과 B의 후보
  직선을 학생 근거로 귀속했다. 따라서 라벨 허용과 별개로 의미 범위 보존 문제로 남긴다.
- 이번 실행 비용은 USD 0.233931, v3 계보 누적 비용은 USD 0.548595다.

## 현재 판단

v3는 운영으로 승격하지 않는다. 단순 동의·부분 수정·동일 명제의 정답/오답 대조와 v3 수정에
사용하지 않은 문항 검증을 먼저 수행하고, 사람 의미 검토 결과를 보고한 뒤 82호출 전체 회귀
여부를 결정한다.

## 근거

- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/final-19/summary.json`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/final-19/results.json`
- `docs/experiments/problem-source-direct-v3-targeted-canary-2026-09-11/FINAL-REPORT.md`
- `docs/experiments/problem-source-direct-v3-intermediate-canary-2026-09-11/PLAN.md`
