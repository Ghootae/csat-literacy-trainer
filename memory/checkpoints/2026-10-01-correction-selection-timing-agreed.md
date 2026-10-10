---
date: 2026-10-01
scope: problem-solving-correction-phase-semantics
base_commit: uncommitted
---

# 교정 답변과 과거 선택 비교 시점 합의

- 사용자 동의에 따라 [D-0052](../decisions/D-0052-correction-vs-historical-selection-deferred.md)를 기록했다.
- 선택 제출 시 일관성 평가와 교정 답변의 실제 오류 수정 평가를 분리한다.
- 교정된 근거와 과거 선택의 불일치를 새 실행 오류로 만들지 않는다.
- 수정된 국소 판단에서 학생이 말하지 않은 최종 선지 결론을 자동 보충하지 않는다.
- 분기 감사 A 쟁점만 설계상 해결했으며 다른 감사 쟁점과 구현·검증은 남아 있다.
- 코드·프롬프트·UI·운영은 변경하지 않았다.

근거: `memory/decisions/D-0052-correction-vs-historical-selection-deferred.md`, 사용자 명시 동의(2026-10-01).
