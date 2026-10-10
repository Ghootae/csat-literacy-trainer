---
date: 2026-10-01
scope: problem-solving-correction-question-budget
base_commit: uncommitted
---

# 오류 수에 따른 교정 질문 수 확정

- 사용자 결정에 따라 [D-0056](../decisions/D-0056-question-count-per-error-deferred.md)을 기록했다.
- 한 응답의 교정 대상 오류 N개에는 오류별 1회씩 N개 질문을 제시하고 고정 총수 상한은 두지 않는다.
- D-0055의 순차 질문·누적 최종 판정은 유지한다. 같은 오류의 반복 재시도로 확대하지 않는다.
- 질문 상한의 미정 상태를 닫고, 새 오류 추가·이미 수정한 대상의 질문 생략 등은 별도로 남겼다.
- 코드·프롬프트·UI·운영 설정은 변경하지 않았다.

근거: 사용자 명시 결정(2026-10-01), `memory/decisions/D-0056-question-count-per-error-deferred.md`.
