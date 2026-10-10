---
id: D-0066
status: accepted
date: 2026-10-02
scope: offline-paragraph-axis-candidate-selection-pilot
supersedes: none
---

# 8문단 분할 후보 생성과 JEV 반복 평가의 한정 시험

## 결정

사용자는 “테스트 승인” 뒤 범위를 8문단·새 프롬프트·2/3/4축 대안·문단마다3회 생성·다른 경계 모두 후보·JEV 반복 평가·최종 비교로 명시했다. 실행 전 안내한 구현은 한 생성 호출에서 세 대안을 모두 작성하는24호출·72분할이며, JEV는 고유 후보별5회·평균점수 선택이다. 동률은 공동1위로 보존한다.

이는 D-0036의 JEV 보류에 대한 **오프라인 골드 분할 시험만의 명시적 예외**다. 학생 PASS·게이지·오류 센서·제품 UI 적용 연구는 보류를 유지한다. 기존 생산 골드·운영 V4·조건부 L1/L2 자산을 대체하지 않는다.

## 근거

- 사용자 “테스트 승인” 및4항목 범위 명시.
- 실행 전 `docs/experiments/axis-candidate-jev-eight-2026-10-02/PLAN.md`, `manifest.json` 동결.
- 기존 보류: `memory/decisions/D-0036-jev-product-work-parked.md`.

## 채택하지 않은 범위

- 단일 최고점으로 선택하거나 생성 빈도를 중복 표로 사용하는 방식.
- JEV 점수를 사람 정답 확률·학생 이해 정확도로 표현하는 방식.
- 새 골드 자동 배포·학생 대화 판정 변경.

## 재검토 조건

실제 생성 후보와 JEV 선택의 사람 경계 일치·반복 변동을 보고 다음 시험 여부를 정한다. 이번 승인만으로 추가 호출을 자동 연장하지 않는다.

## 근거 자료

- `docs/experiments/axis-candidate-jev-eight-2026-10-02/PLAN.md`
- `scripts/test-axis-candidate-jev-eight.mjs`
