---
id: D-0063
status: accepted
date: 2026-10-01
scope: problem-feedback-v4-hardening-and-revalidation
supersedes: none
---

# 문제 피드백 네 실패 수정과 재검증 승인

사용자는 수정 가능성 검토 이후 ‘수정 후 재검증 승인’이라고 답했다. 학생 결론 필드 역전,
제출된 교정 답변 미인식, 공개 코칭 손상, 반복 원문 인용 실패의 보완을 구현하고 다시 시험한다.
D-0059의 교육 정책과 운영 v3, UI, 포인트 실제 차감, 학생 상태 집계 편입은 변경하지 않는다.

## 구현 경계

학생 관점의 결론과 객관적 정오를 분리한다. 선택 충돌 후보에는 정답·목표 극성·기존 모델
판정을 주지 않는 별도 학생 발화 확인을 적용한다. 서로 다르면 값을 조용히 뒤집지 않고
검증 실패로 재시도한다. 이 확인도 모델 판정이므로 의미 정확성을 보장하지 않는다.

최신 교정 답변을 명시적으로 전달하고 최신 응답 ID와 실제 인용을 요구한다. 읽기 증거를
수정 성공의 충분조건으로 사용하지 않는다. 기존 누적 오류별 수정 확인과 동의만으로 성공
처리하지 않는 규칙을 유지한다.

공개 직전 코칭의 명백한 손상을 검사한다. 재생성할 때 판정은 고정하고 코칭만 교체한다.
원문 인용의 공백·따옴표 차이는 유일한 원문 구절로 복원하되 학생 인용, 숫자·부정어·별표·
수식 기호를 고치거나 지우지 않는다. 검증 이유를 재시도 입력에 전달한다.

자동 재시도는 계약·코칭·의미 확인을 합쳐 기본 1회이며 원출력·보조 호출·토큰 사용량을
기록한다. 실패가 남으면 학생 응답을 보존한 시스템 오류로 남기고 교정 실패·정답 공개로
바꾸지 않는다.

## 재검증 범위

D-0062와 같은 네 문항 원자료 및 가상 응답을 api.openai.com으로 전송한다. 별도 실행은
최초 34판정과 후속 10경로이며 보조 확인·재시도 포함 최대 64요청·추정 3달러로 제한한다.
기존 실행본은 덮어쓰지 않는다. 추가 문항 전송·운영 승격은 승인하지 않았다.

근거: 사용자 명시 승인(2026-10-01),
`memory/checkpoints/2026-10-01-problem-feedback-v4-fix-feasibility.md`,
`memory/decisions/D-0062-problem-feedback-v4-external-transfer-approved.md`,
`docs/experiments/problem-feedback-v4-hardening-2026-10-01/PLAN.md`,
`packages/pipeline/src/problem-solving/feedback-v4.ts`,
`packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`.
