---
id: D-0033
status: superseded
date: 2026-09-23
scope: paragraph-jev-semantic-measurement-research
supersedes: none
---

# JEV를 단일 판정기가 아닌 다중 의미 측정 계층 후보로 연구

사용자는 JEV를 한 번에 PASS/OK/SERIOUS/ERROR를 정하는 작은 V4로 쓰지 않고, 축의 여러 의미
측면을 저비용·저지연 질의로 측정하는 `semantic measurement layer` 후보로 연구하는 방향에
동의했다.

- 축을 `core`, `optional`, `collision` 관계로 미리 분해한다.
- 이 분해는 JEV가 수행하지 않는다. OpenAI API를 사용한 오프라인 골드 생성 단계 또는 승인된
  골드의 후처리 단계에서 구조화 자산으로 만들고 고정하며, JEV는 그 결과를 학생 응답마다
  측정하는 하위 계층이다. 초기 검증은 기존 축을 보존하기 쉬운 후처리 후보부터 비교한다.
- core마다 같은 질문의 단순 반복보다 존재성·방향성·완결성처럼 서로 다른 기능의 질의를 우선한다.
  같은 질문 반복은 안정성 검증 단계에서 사용한다.
- 단순 평균만으로 PASS나 보상을 정하지 않는다. 모든 필수 core가 기준을 넘고 collision이 낮을
  때만 기준 도달 후보가 된다.
- JEV 출력은 실제 이해 백분율이 아니라 축별 의미 반영 신호다. 임계값과 학생용 표현은 사람
  판정 자료에서 별도로 보정해야 한다.
- 학생은 축별 신호를 보고 `보완` 또는 `다음으로`를 선택한다. 다음으로 가면 V4를 호출하지 않고,
  검증 PASS와 학생의 진행 선택을 서로 다른 상태로 기록한다.
- 보완을 선택한 경우에만 V4가 원문·축·학생 응답과 낮은 core/collision 후보를 독립 검증해
  피드백하거나 이미 충분함을 확인한다. JEV 신호를 V4의 정답으로 취급하지 않는다.
- 보완 응답 뒤에는 관련 JEV 질의를 다시 실행해 변화를 측정하는 구조를 후보로 둔다.

다음 비교 후보는 같은 20~30개 응답에서 broad JEV 1회와 core 3~5개+collision 1개의 다중 질의를
비교하고 false PASS, core 누락 탐지, 명시적 오류 탐지, 충분 답의 불필요한 보완 유도를 보는 것이다.
구체 임계값·호출 수·비용 상한·외부 실행은 아직 승인되지 않았다.

첫 파일럿은 도파민 1문단 AX1로 고정했다. C1 외부 도파민 기능 불가, C2 내부 합성 도파민의
신호 전달 기능, C3 `contrast(C1,C2)`, O1 혈액-뇌 장벽 원인이며 C3은
`inferable_from_arguments`다. Collision과 Broad는 graph 요소가 아니라 대조 평가 질의다.
근거 자산: `docs/experiments/jev-semantic-elements-dopamine-pilot-v1-2026-09-23/FROZEN-AXIS.json`.

이 결정은 운영 V4·UI·골드·서비스를 바꾸지 않는다. D-0030의 운영 V4 유지와 출력 절삭 보류도
그대로 유지한다. 근거는 `docs/experiments/jev-attribution-v1-2026-09-23/USER-REPORT.md`,
`docs/experiments/jev-error-input-v1-2026-09-23/REPORT.md`, 사용자의 명시적 방향 동의다.

2026-09-29: 자연 응답 shadow와 제품 실익 검토 뒤 [D-0036](./D-0036-jev-product-work-parked.md)이
이 연구 방향을 `PARKED`로 대체했다.

## 재검토 조건

다중 관계 질의가 broad 질의보다 false PASS와 core 누락 탐지를 개선하지 못하거나, 호출 제한·
동시성·축 분해 비용 때문에 V4 대비 제품 실익이 사라지면 역할을 collision shadow 신호로 다시
축소한다.
