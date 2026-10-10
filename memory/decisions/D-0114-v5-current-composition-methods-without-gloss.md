---
id: D-0114
status: accepted
date: 2026-10-10
scope: problem-v5-current-composition
supersedes: D-0093
---

# 현재 v5 구성은 해석본 없는 methods다

## 결정

운영 후보 v5의 현재 구성은 v5 규칙 + 판정 방법(학생 주장 분리 기록, 인용 형식 규칙)이며
자동 기호 해석본은 쓰지 않는다(`methods` 조건). [D-0093](./D-0093-v5-composition-auto-gloss-pipeline.md)의
2번(자동 해석본 사용)만 대체해, 필요성을 다시 확인할 때까지 보류한다. D-0093의 해석본 파이프라인 설계와
결과물은 그대로 보존한다.

해석본을 다시 쓸지는 다음 순서로 판단한다: 다문항 시험 결과에서 luna·sol의 기호·지칭 오독
사례를 확인한다 → 없으면 보류를 유지하고, 있으면 해당 문항에 한정한 해석본 시험을 설계한다.
해석본의 S5 과잉 교정 문제(Q-0030)는 해석본을 다시 쓰기로 정할 때 다룬다.

사용자 확인: 2026-10-10 수형도 작업 중 이 해석과 반영안에 동의했다.

## 근거

- 세 조건 비교(terra): 해석본은 ⓓ 오독을 4/24→0/24로 줄였으나 S5 과잉 교정을 0/3→2/3으로 늘렸다(`docs/experiments/v5-marker-judgment-gongsun-2026-10-07/REVIEW-SUMMARY.json`).
- 원문 대입 확인·모델 비교: S5 과잉 교정과 ⓓ 오독은 terra에서만 나타났고, sol은 해석본 없는 methods로 32/33, S5 3/3이었다(`docs/experiments/v5-substitution-check-review-2026-10-07/REVIEW-SUMMARY.json`).
- 이후 공급자 비교·다문항 시험·라우팅 결정은 모두 methods 조건이었고 해석본 조건은 시험하지 않았다(`memory/checkpoints/2026-10-08-v5-provider-compare-gongsun.md`, `docs/review/v5-multi-item-luna-sol-report-2026-10-08.md`).
- 개발자 경로 연결 인계 문서는 해석본 연결을 범위 밖으로 두고 `v5_methods` 조성을 명시했다(`docs/handoffs/2026-10-10-v5-developer-path-connection.md`).

## 폐기한 대안

- 개발자 경로에 해석본을 바로 연결: 현재 판정 모델(luna·sol)과 해석본의 조합은 효과도 부작용도 시험되지 않았다.
- S5 허용 기준부터 해결: 해석본을 쓰지 않는 현재 v5에는 해당하지 않는 문제다.

## 재검토 조건

luna·sol 결과에서 기호·지칭 오독이 반복 확인되거나, 판정 모델을 terra 계열로 바꾸게 되면 해석본 사용을 다시 정한다.

## 근거 자료

- `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/REVIEW-SUMMARY.json`
- `docs/experiments/v5-substitution-check-review-2026-10-07/REVIEW-SUMMARY.json`
- `docs/review/v5-multi-item-luna-sol-report-2026-10-08.md`
- `docs/handoffs/2026-10-10-v5-developer-path-connection.md`
