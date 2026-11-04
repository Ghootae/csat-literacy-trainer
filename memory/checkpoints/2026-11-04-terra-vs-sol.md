---
date: 2026-11-04
scope: problem-evaluator-model-routing
base_commit: uncommitted
---

# gpt-6.1-terra 대 sol 비교 (오답 경로)

## 새로 확인된 것

- terra 판정은 sol과 사실상 같다: 회귀 13세션 outcome 13/13, 기호 S2·G2 오독 0(terra·sol 모두).
- 19번 ⑤ P1에서 terra는 SUPPORTED 0/10(sol 4/10), luna 쪽 엄격 패턴.
- 마지막 설명 v2.2 정확성 대등, layout v1에서 terra 압축으로 근거 단계 누락 1건(S-B2).
- 비용 약 절반, 지연 같음. 단가는 외부 사이트 일치 값(input $1·cached $0.05·output $5/1M).

## 결정된 것

- 오답 경로 sol 유지, terra는 대체 후보로 기록([D-0199](../decisions/D-0199-keep-sol-over-terra-61.md)).

## 변경한 것

- `scripts/run-v5-regression-replay.mjs`: `--incorrect-model`, `--end-layout` 옵션, terra 단가(시험 추가).
- 새 실행기: `scripts/run-v58-terra-p1.mjs`, `scripts/run-end-explanation-v22-terra.mjs`, `scripts/run-marker-terra-sol.mjs`.
- 실험 기록·보고: `docs/experiments/terra-vs-sol-2026-11-04/`, 인계 `docs/handoffs/2026-11-04-terra-vs-sol-runners.md`.

## 미해결

- 없음(P1을 SUPPORTED로 볼지는 기존 Q-0041 계열).

## 다음 행동

- 문제 경로 다음 과제(모델이 문단·칠할 곳을 쓰는 지시문 시험)로 돌아간다.

## 근거

- `docs/experiments/terra-vs-sol-2026-11-04/REPORT-desktop.md`, `REPORT-human.md`
