---
date: 2026-10-01
scope: problem-feedback-v4-synthetic-test-preparation
base_commit: uncommitted
---

# 문제 피드백 v4 가상 응답 시험 준비

- 사용자 테스트 승인 후 4문항·24최초 응답·민감4개 추가2회 반복·8후속 경로의 사전 기준을
  작성했다. I1은 사용자 원응답 재현이고 다른 최초 응답은 합성이다. 독립 사람 기준은 아니다.
- 기대 기준과 실제 모델 입력을 분리한 실행기, 64요청·추정3달러 상한, 사용량/원출력 기록,
  해시 동결·중복 재실행 방지·원판정 재사용 후속 경로를 준비했다.
- 실제 API 실행 명령은 자동 보안 검토에서 거부됐다. 원자료·응답의 OpenAI API 전송에 대한
  명시적 승인이 필요하다는 판단이다. 요청·과금0이며 우회 실행하지 않았다.
- 준비 명령과 로컬 검사에서 24개 제출 계약·평가 입력 분리, 8경로 참조, 동결 해시를 확인했다.
  엔진·컨트롤러 기존 테스트 62/62도 통과했다.
  실제 모델 판정 결과나 후속 경로 성공률은 아직 없다. 운영 코드·프롬프트·UI·서버는 미변경이다.

다음 행동: `STATUS.md`에 명시한 payload와 목적지에 대한 사용자 전송 승인 후
`scripts/test-problem-feedback-v4-synthetic.mjs initial`부터 재개한다.

근거: `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/PLAN.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/cases.json`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/FROZEN.json`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/STATUS.md`,
`memory/decisions/D-0061-problem-feedback-v4-synthetic-test.md`.
