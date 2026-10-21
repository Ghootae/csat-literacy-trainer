# v5 오답 선지 칸 첫 문장·판정어 구현과 재시험 (2026-10-21)

## 바뀐 것

- 오답 선지 칸 첫 문장을 내용 판정 + 목표 대조로, 판정어는 발문 술어로([D-0153](../decisions/D-0153-section-lead-content-verdict-and-goal.md), [인계](../../docs/handoffs/2026-10-20-v5-section-lead-verdict-words.md)). UI 메모장 20번 질문 1~3 닫음(정답 선택 문장 유지). executor 구현, Claude diff 검토.
- 지시문: 짐작 도입 끊기, 판정에 쓰이지 않는 개념 대비 금지(메모장 27번 남은 두 점).
- 재시험 사례 모듈 `scripts/v5-lead-user-cases.mjs`(반대 극성 표면 장력 16번 S1·S2는 Claude 작성).

## 결과

- [판정 기록](../../docs/experiments/v5-lead-user-2026-10-21/REVIEW.md): 12/12 적절, 0.32달러.
- 판정 중 사용자 발견: 교정 질문에 틀리게 답한 뒤 피드백 없이 정답 공개(UI 메모장 28번). 원인은 `appendCoach` 안내 문장이 REPAIR_FAILED에 없음. Claude 권고: REPAIR_FAILED(오답/정답 선택별)와 RESELECTION_WRONG에 안내 문장 추가.
- 판정 질문 전에 원문을 같은 응답에서 다시 보여 주지 않아 사용자가 두 번 질문을 거절했다(작업 방식 교훈).

## 추가: 28번 반영

- 교정 실패(오답/정답 선택)·다시 고른 답 오답에 정답 공개 앞 안내 문장 추가([D-0154](../decisions/D-0154-gate-note-after-failed-repair-and-reselection.md)). Claude 직접 수정, 서버 시험·e2e 확인.

## 다음

- UI 메모장 23·24·25번 설계 미착수.
- 커밋 전(21·22·26·27·20번 변경 포함).
