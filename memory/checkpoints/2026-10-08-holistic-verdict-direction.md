---
date: 2026-10-08
scope: holistic-verdict-direction
base_commit: uncommitted
---

# 문단 판정 방향 확인

- [D-0103](../decisions/D-0103-holistic-verdict-axis-recording-direction.md): 질문 여부는 H0 전체 판정으로, 미확인 기록과 질문 생성은 축 근거로 한다. 사용자가 동의했다.
- 철회 규칙은 학생이 중요한 정보를 빠뜨린 경우를 통과시킨다. 사용자가 이 결함을 확인했다.
- 운영 V4, UI, 프롬프트는 바꾸지 않았다. 블라인드 재판정(REVIEW-SECOND)은 여전히 대기 중이다.
- 새 열린 질문 Q-0033: 기록만 할 공백과 질문할 공백을 가르는 기준.
- **추가 합의(GPT 의견에 사용자 동의):**
  - 자동 철회 대신 종류별 근거 요건을 둔다. 오류는 인용, 누락은 빠진 핵심 관계와 그 중요성이 근거다.
  - "오류 존재"와 "질문 필요"를 분리한다.
  - "오류 놓침 0건"은 안전성 근거가 아니다. REPORT와 DISCUSSION-BRIEF를 정정했다.
  - REVIEW-SECOND.md에 "원문과 다른 주장" 칸을 추가했다.
