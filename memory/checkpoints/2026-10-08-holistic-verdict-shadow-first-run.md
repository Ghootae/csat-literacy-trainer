---
date: 2026-10-08
scope: holistic-verdict-shadow-first-run
base_commit: uncommitted
---

# 그림자 실험 1차 실행 (사람 판정 전)

- 결과: `docs/experiments/holistic-verdict-shadow-2026-10-08/REPORT.md`. 승인: [D-0102](../decisions/D-0102-holistic-verdict-shadow-transfer-approved.md).
- Claude 검토 중 두 가지를 직접 고쳤다.
  - 운영 로그 전체 해시를 고정하던 것을 선택 줄 해시로 바꿨다. 앱을 쓰면 로그에 줄이 덧붙어 run이 실패하기 때문이다.
  - PLAN-DRAFT를 고정 대상에서 뺐다.
- **호출:** 220회, 계약 실패 0, 약 $1.54
- **실데이터 최초 45시점 갈림:** H0 3개(그림자가 더 물음 1, FA 방향 2), H1 5개(3, 2)
- **탐침:**
  - 오류는 모두 잡았다.
  - FA 감소 2개(T05, T12)로 "뚜렷하다"는 미충족이다.
  - T10은 V4와 그림자 모두 질문 후보를 냈다(사람 판정은 충분).
  - T02와 T04는 V4만 잡았다.
  - 사람 판정과 질문 여부가 일치한 수는 셋 모두 10/13이다. V4는 FA 쪽, 그림자는 miss 쪽으로 틀렸다.
- **오류 놓침 후보:** A-N16(H0), A-N33(H1). 이 두 시점이 사람 판정에서 오류로 나오면 운영 후보 조건 2를 깨뜨린다.
- **다음:** 사용자가 `REVIEW.md` 20시점을 블라인드로 판정한다. 며칠 뒤 `REVIEW-SECOND.md`로 재판정하고, 그 뒤 11절 규칙으로 결론을 낸다.
