---
date: 2026-10-08
scope: holistic-verdict-shadow-experiment-design-handoff
base_commit: uncommitted
---

# 문단 전체 판정 그림자 실험 설계·인계

- 결정: [D-0101](../decisions/D-0101-holistic-verdict-shadow-experiment.md). 설계: `docs/experiments/holistic-verdict-shadow-2026-10-08/PLAN-DRAFT.md`. 인계: `docs/handoffs/2026-10-08-holistic-verdict-shadow.md`.
- 지시서의 "V4"는 두 단계 생성 v3가 아니라 운영 문단 요약 판정기 `axis-dialogue-selective-v4`임을 확인했다.
- 데이터: 실데이터 72시점(A 09-21 재판정 45, B sessions.jsonl V4 14세션 27)과 탐침 13개. A·B 모두 gold-v2와 `gpt-5.6-terra` medium이다. B의 골드 해시는 현재 gold-v2와 같다.
  - 처음에 B를 41시점으로 잘못 셌다가 27시점으로 바로잡았다.
- V4 미해결은 72시점 중 8시점뿐이다. 실데이터로는 비열등성만 잴 수 있고, FA 감소는 탐침으로 본다.
- 탐침: Claude가 쓰고 사용자가 블라인드로 판정한 뒤 해시로 고정했다.
  - 고정 전 사실 확인으로 두 개를 다시 판정했다: T13 충분 → 오류, T05 오류 → 충분.
  - FA 표적 8개 중 7개를 사용자가 충분·질문 불필요로 판정했다.
- 성공 규칙은 PLAN 11절로 확정했다. "뚜렷하다"는 FA 탐침 7개 중 V4 미해결·그림자 해결이 4개 이상이고, 오류 탐침 3개를 모두 잡는 경우다.
- 지시문 `shadow-instructions.md`, `attribution-instructions.md`를 Claude가 작성했다. 축 귀속을 별도 호출로 두어 1차 최대 호출이 353회가 됐다(귀속 제외 183회).
- 근거 논의 `notes/no-chunk-evaluator-review-2026-10-07.md`는 저장소에 없다. 사용자가 대화로 전달했다.
- 다음: Codex 구현·모의 검증 → Claude 검토 → 전송 승인 → 1차 실행.
