---
date: 2026-10-01
scope: problem-solving-multiple-error-correction
base_commit: uncommitted
---

# 복수 오류 순차 교정과 누적 최종 판정 합의

- [D-0055](../decisions/D-0055-multiple-error-correction-batch-deferred.md)에 최초 오답의 오류 2개를 순차 질문하고 끝에 누적 재평가하는 흐름을 기록했다.
- 중간 성공·실패로 분기하지 않으며 모두 수정된 경우에만 재선택 1회를 제공한다.
- 기존 D-0051의 총 교정 질문 1회 제한은 이 경로에서 대체되며, 예시에서는 오류별 1회씩 총 2회다.
- 전체 확인 불가의 코칭 종료, 과거 선택과 새 근거 비교 금지, 마지막 재선택 종료는 유지한다.
- 최초 정답 적용 범위·3개 이상 오류의 상한·새 오류 추가·이미 수정된 후속 대상의 질문 생략은 미정이다.
- 코드·프롬프트·UI·운영을 변경하지 않았다.

근거: 사용자 명시 결정(2026-10-01), `memory/decisions/D-0055-multiple-error-correction-batch-deferred.md`.
