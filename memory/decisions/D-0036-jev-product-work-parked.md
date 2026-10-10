---
id: D-0036
status: accepted
date: 2026-09-29
scope: paragraph-jev-product-work
supersedes: D-0033, D-0035
---

# JEV 제품 적용 연구를 보류하고 운영 V4를 유지

사용자는 지금까지의 JEV 예비 시험과 자연 응답 shadow 결과를 검토한 뒤, 현재 제품 계획에서
JEV를 계속 유지하기 위한 추가 복잡성을 감수할 이유가 충분하지 않다고 판단했다.

- 학생용 문단 평가기는 현재 V4를 운영 기본값으로 유지한다.
- JEV 자동 PASS, MR coverage 게이지, 학생용 JEV 신호 노출, 선택적 V4 호출 UI 프로토타입을
  진행하지 않는다.
- `required` MR 안에 중요도·가중치·예외 계층을 추가해 JEV 판정을 V4와 맞추는 작업을 하지 않는다.
- collision을 entity substitution, attribute misbinding, wrong referent 등 여러 오류 탐지기로 확장하는
  작업을 진행하지 않는다.
- AX broad 판정, MR 센서, collision, materiality, 자연 응답 shadow의 원시 결과와 스크립트는 실패를
  지우거나 운영 성능으로 재해석하지 않고 연구 자료로 보존한다.
- 자연 응답 shadow에서 드러난 AX-only V4와 required-MR 계약의 불일치는 JEV 채택 이유가 아니라
  골드 구조를 해석할 때 주의할 별도 정보로 보존한다.
- JEV 관련 추가 API·플레이그라운드 호출과 UI 구현은 `PARKED`다.

근거:

- `docs/experiments/jev-v4-natural-agreement-v1-2026-09-29/REPORT.md`
- `docs/experiments/jev-mr-coverage-information-asymmetry-v1-2026-09-23/REPORT.md`
- `docs/experiments/jev-collision-single-question-ab-v1-2026-09-23/REPORT.md`
- `docs/experiments/jev-attribution-v1-2026-09-23/USER-REPORT.md`
- 사용자의 명시적 보류 결정

## 재검토 조건

실제 학생 사용에서 V4의 비용이나 지연이 반복적인 중단·이탈 요인으로 확인되고, 공식 API 접근과
모델 성능이 개선되며, 자동 PASS나 특정 오류 탐지처럼 좁고 검증 가능한 제품 효용을 새 사람 판정
표본에서 입증할 후보가 생길 때만 JEV 또는 유사한 저비용 평가 계층을 다시 검토한다.

