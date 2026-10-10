---
id: D-0035
status: superseded
date: 2026-09-23
scope: paragraph-jev-mr-gauge-ui-prototype
supersedes: none
---

# JEV MR 게이지·학생 선택 UI를 개인 사용 프로토타입으로 검증

사용자는 현재 운영 V4를 직접 사용한 결과가 나쁘지 않고 개입 수준도 적당했다고 평가했다. JEV는
V4 대체 판정기로 승격하지 않고, 기존 MR을 빠르게 측정해 학생의 진행 선택과 선택적 V4 호출을
돕는 UI 프로토타입으로 다음 검증을 진행한다.

후보 흐름은 다음과 같다.

1. 기존 골드의 `required` MR별 coverage를 JEV가 병렬 측정한다. 기본 입력 후보는
   `TARGET_MR + STUDENT_UTTERANCE`이며 원문·AX는 넣지 않는다.
2. 학생 화면에는 확률을 이해도 백분율로 표시하지 않고 `충분해 보임`, `보완 가능`, `보완 권장`
   같은 구간형 게이지를 보여 준다.
3. 모든 required MR이 고신뢰 기준을 넘고 오류 신호가 낮을 때만 자동 PASS·보상·다음 진행 후보로
   둔다. 평균이 아니라 required MR 최솟값을 사용한다.
4. 애매하거나 낮은 coverage에서는 학생이 `보완하기` 또는 `이대로 진행`을 선택한다. 진행 선택은
   검증 PASS와 다른 상태로 기록하며 V4를 호출하지 않는다.
5. 학생이 보완을 선택하거나 오류 신호가 높을 때만 V4가 독립 검증하고 질문·교정·이미 충분함
   확인을 생성한다. JEV collision의 MR 위치를 V4의 정답으로 취급하지 않는다.

이 결정은 **직접 사용감을 확인하기 위한 UI 프로토타입 방향**만 승인한다. HIGH/MID/LOW·오류
임계값, 자동 PASS 개방, 보상 규칙, 운영 배포, 공식 JEV API 연결은 승인하지 않는다. 현재 V4는
운영 기본값으로 유지하고 학생용 운영 경로는 바꾸지 않는다.

근거:

- `docs/experiments/jev-mr-coverage-information-asymmetry-v1-2026-09-23/REPORT.md`
- `docs/experiments/jev-collision-single-question-ab-v1-2026-09-23/REPORT.md`
- `docs/experiments/v4-light-output-v1-2026-09-22/REPORT.md`
- 사용자의 현재 V4 직접 사용 평가와 UI 프로토타입 진행 결정

2026-09-29: 자연 응답 shadow와 제품 실익 검토 뒤 [D-0036](./D-0036-jev-product-work-parked.md)이
이 UI 프로토타입 방향을 `PARKED`로 대체했다.

## 재검토 조건

개인 UI에서 게이지 의미가 오해되거나, 자동 진행이 학습 흐름을 끊거나, 보완 선택이 과도하게
늘거나, 자연 응답에서 false PASS가 관측되면 자동 PASS·학생 노출을 열지 않는다. 사용감이
양호하더라도 자연 응답 shadow 비교와 임계값 보정 없이 운영 승격하지 않는다.
