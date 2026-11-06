---
date: 2026-11-06
scope: gold-based-generation-experiment
base_commit: e46ba82f
---

# 골드 기반 생성 실험 설계 검토와 지도 회차 간 일치 천장

## 새로 확인된 것

- 같은 원문·같은 지시문 지도 3회차 간 일치(36지문, v2 10지문): 노드 대응(IoU ≥ 0.5) 97%, 관계 재현(양 끝 대응·같은 방향) 68%(v2 최저 62%), 재현 관계 쌍의 유형 일치 94%(v1 지도·분류 v2, heldout 6지문 831쌍), 선지 고리(`twistTargetIds`) 보존 92%(7지문 53노드, 실패 9건 모두 명제 분할 크기 차이, IoU 0.39~0.48) (`docs/experiments/map-run-agreement-2026-11-06/REPORT-desktop.md`).
- 관계 불일치 표본 51건(opus 하위 에이전트 판정, 코드 에이전트 3건 확인): 같은 연결인데 방향·범위·이름만 다름 35, 묶음·명제 병합 표현 12, 비슷하나 성격 다름 2, 진짜 해석 차이 2. 실질 일치 추정 약 96%, 엄격 68%는 측정 하한이다. 방향·범위 허용 기계 지표는 86.3%(지문별 81~91%)다 (`docs/experiments/map-run-agreement-2026-11-06/REPORT-desktop.md` 7절, `mismatch/judgments.json`).
- 설계 초안이 가설 사례로 든 볼록 렌즈 11번은 문항 생성이 아니라 풀이 골드 후보 생성 실패였다(`docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md` 217~221행).

## 결정된 것

- 없음(설계는 승인 전, 결정 기록 D-0205 대기).

## 변경한 것

- `docs/handoffs/2026-11-06-gold-based-generation-experiment.md` 1차 수정: A′안(골드 없는 2단계) 추가·주 비교 A′ 대 B, 출처 추측은 사용자 제외, E2 기준을 측정 천장에 맞춤, 볼록 렌즈 근거 정정, 세트 E 자산 반영.
- `scripts/measure-map-run-agreement.mjs`(+ 시험 3/3), `scripts/classify-relation-mismatch.mjs`(+ 시험 2/2) 추가.

## 미해결

- E2 기준을 고정 숫자로 할지, 생성 지문 지도 3회와 원문 회차 간 범위 비교로 할지(코드 에이전트 권고: 범위 비교).
- 지도 v2 + 분류 v3 조합의 관계 유형 천장은 미측정(외부 전송 필요).

## 다음 행동

- 결정 기록 D-0205로 E1·E2 설계 확정(성립 기준, 출처 추측 판정자, 다른 공급자 모델, 검토 지적 6~12).

## 근거

- `docs/experiments/map-run-agreement-2026-11-06/REPORT-desktop.md`, `results.json`
- `docs/handoffs/2026-11-06-gold-based-generation-experiment.md`
