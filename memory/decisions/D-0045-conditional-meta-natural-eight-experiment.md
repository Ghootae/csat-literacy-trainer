---
id: D-0045
status: accepted
date: 2026-10-01
scope: conditional-meta-natural-eight-experiment
supersedes: none
---

# 실제8응답에서 SERIOUS에만 메타 판정을 호출하는 실험

사용자의 '진행해' 승인에 따라 D-0044의 실제8응답을 각3회 L1으로 평가하고,
유효 L1에서 SERIOUS인 축에만 L2를 호출한다. 같은 문단의 SERIOUS 축들은 한 호출로 묶는다.
PASS/OK와 ERROR에 L2를 불필요하게 호출하지 않는다. D-0040 결합 정책은 그대로다.

6문단은 앞선 실험의 공동 생성 구체 축·메타 축을 재사용하며, 없는 폐포2·mRNA1은 동일 생성
템플릿으로 각1회 준비한다. 학생 답변과 사람 판정에 맞춰 축을 수정하거나 재생성하지 않는다.
사람 기준은 acceptableRoutes로 동결하며 7번 ASK/OPTIONAL_REPAIR, 8번 OPTIONAL_REPAIR를 적용한다.
이번 accepted는 실험 실행 승인이지 판정기·생성물·운영 승격 승인이 아니다.

L2 실패는 해당 SERIOUS 축의 연구상 평가 실패로 남긴다. 다른 축의 PASS/ERROR를 취소하지 않으며
실패를 PASS로 간주하지 않는다. 운영 장애 처리 정책을 새로 정한 것은 아니다.
운영 V4·UI·서버·골드·보상 규칙은 변경하지 않는다. JEV 보류를 유지한다.

## 근거

- 사용자 2026-10-01 '진행해'.
- `docs/experiments/conditional-meta-natural-eight-2026-10-01/PLAN.md`
- `docs/experiments/conditional-meta-natural-eight-2026-10-01/human-reference.json`
- `scripts/test-conditional-meta-natural-eight.mjs`
