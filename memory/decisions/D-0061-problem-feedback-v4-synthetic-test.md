---
id: D-0061
status: accepted
date: 2026-10-01
scope: problem-feedback-v4-synthetic-test
supersedes: none
---

# 문제 피드백 v4 가상 응답 시험 방향 승인

사용자가 가상 응답으로 오답 표본을 보완하는 실모델 시험 제안에 ‘테스트 진행 승인’이라고
답했다. 최초 응답 진단과 후속 교정 경로를 나누고 기대 기준을 실행 전에 고정한다. 숨은
학생 의도를 판정기가 맞혀야 하는 정답으로 취급하지 않으며 기대 기준을 평가 입력에 넣지 않는다.

구체적 시험 구성은 정보 비대칭·법인·도파민·표면 장력 4문항의 최초 응답 24개, 4개 민감 사례의
추가 2회 반복, 대표 후속 8경로다. 에이전트가 작성한 기준은 사람 승인 라벨과 구별한다.
실제 학습 효과나 운영 전환을 검증·승인하는 시험은 아니다. 정책·프롬프트·판정 코드를
시험 도중 수정하지 않는다.

API 실행은 자동 보안 검토에서 차단됐다. 특정 목적지로 문항 원자료·응답을 전송하는 명시적
승인이 필요하다는 판단에 따라 우회하지 않고 사용자 승인을 요청한다. 준비 자료만 저장했으며
API 호출·과금은 0이다. 테스트 진행 승인과 외부 전송 승인 대기 상태를 구분한다.

근거: 사용자 승인(2026-10-01),
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/PLAN.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/STATUS.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/FROZEN.json`,
`scripts/test-problem-feedback-v4-synthetic.mjs`.

후속: 사용자 외부 전송 명시 승인은 [D-0062](./D-0062-problem-feedback-v4-external-transfer-approved.md)에
기록했다. 위 API 0회·승인 대기는 준비 시점의 이력이다.
