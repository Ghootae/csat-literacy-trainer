---
id: D-0053
status: accepted
date: 2026-10-01
scope: problem-solving-reconstructability-priority
supersedes: none
---

# 전체 결론 확인 불가를 국소 오류 교정보다 우선

## 결정

사용자는 단순화를 위해 ‘전체 결론이 확인 불가인 경우, 국소적 오류가 명확해도 확인불가로
처리’하도록 지정했다. 후속 구현 후보의 게이트 우선순위로 보존하며 현재 운영은 변경하지 않는다.

- 전체 선지 결론을 확인할 수 없으면 `UNKNOWN`으로 처리한다.
- 이 경우 일부 명제의 오류가 명확해도 그 오류만을 이유로 교정 질문 경로를 열지 않는다.
- 최초 오답에서는 D-0051의 확인 어려움 안내·상세 코칭 후 종료 경로로 보낸다.
- `UNKNOWN`을 오류 없음·근거 타당·교정 성공으로 해석하지 않는다.
- 분기 감사 B의 ‘국소 오류가 명확하면 그 부분만 우선 교정’ 제안은 채택하지 않는다.

## 남은 적용 범위

후속 확정: [D-0059](./D-0059-problem-feedback-clarifications-consolidated.md)에서 정답에도 확인 불가를
우선하여 국소 오류가 있어도 미검증 정답 종료하기로 승인했다. 아래는 당시 미정 이력이다.

D-0051의 정답 근거 규칙은 명시적 오류가 있으면 최초 선택에서 교정 질문, 재선택에서 코칭
종료를 요구한다. 이번 우선순위를 정답 근거에도 적용하여 ‘전체 확인 불가이면 국소 오류가
있어도 미검증 정답 종료’로 바꿀지는 별도 확인한다. 오답 문맥의 명확한 결정과 정답 분기로의
확대를 구별하며, 확인 전 정답 분기의 명시 오류 조건을 묵시적으로 삭제하지 않는다.
교정 답변의 평가 시점은 D-0052를 유지하며, 최종 결론을 새로 요구해 정상 교정을 막지 않는다.

## 구현 상태

설계 결정만 기록했다. 코드·프롬프트·UI·테스트·운영 설정은 변경하지 않는다.

## 근거

- 사용자 명시 결정: 2026-10-01 전체 결론 확인 불가이면 국소 오류가 명확해도 확인불가로 처리, 단순화 목적.
- `memory/checkpoints/2026-10-01-problem-candidates-path-audit.md` B 항목.
- `memory/decisions/D-0050-reasoning-reconstructability-gate-deferred.md`
- `memory/decisions/D-0051-bounded-problem-feedback-flow-deferred.md`
- `memory/decisions/D-0052-correction-vs-historical-selection-deferred.md`
