---
date: 2026-10-01
scope: problem-solving-rationale-submission-boundary
base_commit: uncommitted
---

# 근거 제출 상태와 무응답 경계 합의

- [D-0057](../decisions/D-0057-explicit-rationale-submission-deferred.md)로 명시적 근거 미제출/근거 입력 후 제출의 두 경로를 기록했다.
- 어느 것도 누르지 않으면 대기이며 교정 실패로 기록하지 않는다.
- 최초 오답의 근거 확인 단계에서 판단 근거가 없는 ‘모르겠다/찍었다’ 답변은 확인 불가·코칭 종료한다.
- 기존 최초 오답 근거 요구·최종 재선택 종료·교정 묶음 중간 실패 처리 원칙을 유지한다.
- 오답 후 보완 요청에서 반복 미제출 선택을 허용할지와 처리는 별도 확인 대상이다.
- 코드·UI·프롬프트·운영을 변경하지 않았다.

근거: 사용자 명시 결정(2026-10-01), `memory/decisions/D-0057-explicit-rationale-submission-deferred.md`.
