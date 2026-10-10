---
id: D-0015
status: accepted
date: 2026-09-19
scope: paragraph-error-recording
supersedes: none
---

# 현재 오류 구절을 별도로 지정하여 기록

사용자 ‘이 부분을 수정하고 ui로 넘어가는게 좋을 것 같아’에 따라 1번의 미완성 부분을 구현한다.
평가 기준이나 학생의 진행 선택은 변경하지 않는다.

- 모델이 errorClaims에 현재 오류의 직접 인용·출처·응답 번호·현재 주장 참조를 반환한다.
- 코드가 인용 출처, current 여부, distorted 축과의 일치 및 누락/중복을 검증한다.
- 실패 시 D-0009의 재시도·학생 입력과 실패 원출력 보존을 사용한다.
- 지정 오류를 snapshot/2차 입력/handoff에 보존한다. 구 기록만 axis_context/null로 유지한다.
- 구조 검증과 실제 오류 판단의 의미 품질을 구별한다. UI용 확정 정답표로 취급하지 않는다.

근거: `docs/experiments/dialogue-error-quotes-fix-2026-09-19/REPORT.md`,
`packages/pipeline/src/dialogue-experiment/error-recording.ts`,
`packages/pipeline/src/dialogue-experiment/error-recording.test.ts`.

재검토 조건: 실제 모델의 잘못된 오류 구절 선택, 과거 오류 재인용, 기록 계약으로 인한
반복 실패가 관측되면 표적 검증한다. 이번 작업은 유료 시험·공개 서버 재시작을 포함하지 않는다.
