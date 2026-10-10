---
date: 2026-10-10
scope: thought-tracker-trap-map-jev
base_commit: f1b6131
---

# JEV Choice 선지 선택 확률 예측 실패와 목표 재정의

## 새로 확인된 것

- [보고서](../../docs/experiments/trap-map-jev-choice-2026-10-10/REPORT.md): 6문항 × BARE/TRAP × 5반복, 60칸 모두 VALID. 화작 기준 5회 평균 예측은 BARE 최다 오답 적중 0.00, 문항 내 Spearman −0.58, 정답률 MAE 53%p. TRAP은 0.20, −0.31, 49%p.
- JEV는 정답에 약 88~95%를 배정했다. 수험생 집단의 분포가 아니라 정답 판단의 확신을 낸 것으로 보인다(Claude 해석). BARE의 예측 최다 오답은 5문항 중 4문항이 C1이다(위치 편향 의심).
- 함정 분석 첨부(TRAP)는 정보 비대칭 13번 ②만 맞혔고, 전체로는 여전히 음의 상관이다.

## 결정된 것

- 사용자 판단(2026-10-10): JEV는 깔끔한 실패. 사용자 목표는 선택 비율 예측이 아니라 학생이 **어느 유형의 함정에 걸렸는지, 어느 논리 단계에서 성공·실패했는지 파악**하는 것이다. 예측 성공은 현실적으로 기대하지 않는다.

## 변경한 것

- Codex: `scripts/test-trap-map-jev-choice.mjs`(+ 테스트), 실험 폴더 산출물, 인계 문서 `docs/handoffs/2026-10-10-trap-map-jev-choice.md`의 결과 보고 절.

## 미해결

- 선지 분석(근거·논리 단계·함정 유형)의 정확성과 학생 풀이 분류가 사람 판정과 일치하는지는 미검증이다.

## 다음 행동

- 기존 가상 학생 풀이 30개를 함정 유형·실패 단계로 사람이 라벨링하고, 분류기 출력과의 일치를 시험하는 설계를 사용자와 논의한다.

## 근거

- `docs/experiments/trap-map-jev-choice-2026-10-10/REPORT.md`, `RESULTS.json`
