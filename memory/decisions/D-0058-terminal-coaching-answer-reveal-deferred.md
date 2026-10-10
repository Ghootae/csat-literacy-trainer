---
id: D-0058
status: accepted
date: 2026-10-01
scope: problem-solving-terminal-coaching
supersedes: none
---

# 코칭 종료 시 정답을 공개하고 재선택을 허용하지 않는다

## 결정

사용자 결정에 따라 후속 후보의 코칭 종료는 선택 회차와 관계없이 정답 공개와 문항 종료를
포함한다. 코칭을 확인한 뒤에도 재선택 기회를 제공하지 않는다.

- 최초 오답의 근거 확인 불가 → 상세 코칭·정답 공개·종료.
- 교정 묶음 최종 평가에서 실패 또는 수정 확인 불가 → 상세 코칭·정답 공개·종료.
- 마지막 재선택 오답 또는 정답의 오류 근거로 코칭 종료 → 상세 코칭·정답 공개·종료.
- 최초 정답 근거의 교정 실패 등 다른 코칭 종료 경로에도 같은 종료 원칙을 적용한다.
- 재선택은 코칭 종료 이전, 최초 오답의 실제 교정 성공 경로에만 남는다.
- 정답 공개가 학생의 실제 수정이나 독립 정답 도달을 입증하는 것은 아니다. 기존 제출·교정
  기록을 공개된 정답으로 덮어쓰거나 학생 해결 성공으로 승격하지 않는다.

## 기존 정책과의 관계

정답 공개 기준은 ‘3차 오답’ 같은 고정 회차가 아니라 ‘코칭으로 종료하는가’다. 이는 현행 v3의
초기 코칭 정답 비공개·일부 코칭 확인 후 재선택 구현을 후속 후보에서 대체하는 설계 결정이며,
현재 코드나 운영 설정을 바꾸지 않는다. 교정 질문·재선택 안내에서 정답을 유도하지 않는 원칙은
유지한다. 자료·정답 자체가 불확실한 문항 경계나 시스템 오류를 정상 코칭 종료로 치환하지 않는다.

## 근거

- 사용자 명시 결정: 2026-10-01 ‘코칭 종료 시엔 정답 공개. 재선택 기회 없음.’
- `memory/decisions/D-0051-bounded-problem-feedback-flow-deferred.md`
- `memory/decisions/D-0055-multiple-error-correction-batch-deferred.md`
- `memory/checkpoints/2026-10-01-problem-candidates-path-audit.md`
- `memory/checkpoints/2026-10-01-problem-feedback-policy-runtime-discrepancy.md`
