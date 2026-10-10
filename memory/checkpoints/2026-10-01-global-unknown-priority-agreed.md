---
date: 2026-10-01
scope: problem-solving-reconstructability-priority
base_commit: uncommitted
---

# 전체 확인 불가 우선 원칙 기록

- 사용자 결정에 따라 [D-0053](../decisions/D-0053-global-unknown-priority-deferred.md)을 추가했다.
- 전체 결론 확인 불가이면 국소 오류가 명확해도 확인불가로 처리하며, 국소 교정 질문으로 우회하지 않는다.
- 최초 오답은 확인 어려움 안내·코칭 종료로 간다. 감사 당시 에이전트의 국소 오류 우선안은 미채택이다.
- 정답 근거의 명시 오류 교정/코칭 규칙에도 이 우선순위를 적용할지는 확인이 필요하다.
- 현재 상태·색인·열린 질문을 갱신했고, 런타임과 기존 결정 본문은 변경하지 않았다.

근거: 사용자 명시 결정(2026-10-01), `memory/decisions/D-0053-global-unknown-priority-deferred.md`.
