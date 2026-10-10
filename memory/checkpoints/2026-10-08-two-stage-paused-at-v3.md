---
date: 2026-10-08
scope: central-story-two-stage-paused-overfitting
base_commit: uncommitted
---

# 두 단계 생성 실험을 v3에서 멈춤

- 마지막 버전: 두 단계 생성 v3([D-0099](../decisions/D-0099-central-story-two-stage-v3-no-role-exemption.md), [결과](../../docs/experiments/central-story-two-stage-v3-2026-10-07/REPORT.md), [사용자 판정](../../docs/experiments/central-story-two-stage-v3-2026-10-07/HUMAN-REVIEW.md)).
- Claude가 정보 비대칭3 판정을 근거로 1단계 규칙("원리와 적용은 별개 설명 단위, 같은 원리의 여러 적용은 한 단위")과 25문단 2회 반복 실행을 제안했다. 사용자가 과적합을 우려했다("너무 과적합 문제를 만들고 있는거 아닐까?"). 이 규칙은 채택하지 않았고, 반복 실행도 승인되지 않았다.
- 과적합 근거(Claude 의견):
  - 조정과 평가에 같은 25문단을 썼다.
  - 규칙 하나를 사례 1~2건에서 도출했다.
  - 실행 간 변동을 측정하지 않았다(도파민1이 3→1→3축으로 바뀜).
  - 판정 기준이 출력을 보며 바뀌었다(정보 비대칭2).
- Claude 권고(미승인): 규칙을 v3로 고정한다. 같은 버전을 반복 실행해 변동을 재고, 조정에 쓰지 않은 문단에서 사전 판정과 비교한다.
- 사용자는 이어서 새 방향의 실험(문단 전체 판정 그림자 실험)을 제안했다. 두 단계 생성 실험의 재개 여부는 정해지지 않았다.
