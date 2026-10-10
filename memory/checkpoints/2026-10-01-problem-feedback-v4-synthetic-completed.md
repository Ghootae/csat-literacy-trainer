---
date: 2026-10-01
scope: problem-feedback-v4-synthetic-test-completion
base_commit: uncommitted
---

# 문제 피드백 v4 가상 응답 실모델 시험 완료

- 사용자 외부 전송 명시 승인 D-0062 후 동결한 4문항24응답+추가8반복·후속8경로를 실행했다.
  논리적 평가43건·자동재시도2회로 API45요청, 추정 USD 0.5191258. 추가 의미 재실행은 없다.
- 최초 사전 필드 일치30/32, 유효31/32. S2는 재구성에 학생이 참이라 판단했다고 적고 결론
  필드는 INVALID로 기록해 실행 오류를 오탐했다. C1반복2는 원문 별표 누락으로 인용 계약이
  두 번 실패했다. I1반복1 인용 차이는 자동재시도로 회복했다.
- 후속 최종 필드 일치7/8. I1-repair에서 입력에 CORRECT 학생 발화가 있는데도 모델이
  후속 답변이 없다고 판정해 재선택 없이 코칭 종료했다. 입력·원출력을 보존했다.
- 자동 일치와 별도로 최초 UNKNOWN 오답 코칭5건 중 C4·C6·D5에서 깨진/외국어 문구가
  학생용 message에 포함됐다. C1-new는 최종 필드가 맞아도 기존/새 오류 경계가 흔들려
  이미 수정한 절차 오류 질문이 계속된 문제가 있다. 독립 사람 판정은 아니다.
- 기존 I1 최초 내용 오류 분리3/3, UNKNOWN경로9/9, 짧은 도파민 근거3/3과 일부 누적 수정·
  예정 질문 생략·종료 경로는 작동했다. 전체 의미 품질 통과나 실제 학습 효과로 해석하지 않는다.
- 정책·평가기·프롬프트·UI·운영 서버를 변경하지 않았다. 다음 단계는 결론 필드 일관성,
  수정 발화 귀속, 코칭 유효성 보완 제안의 사용자 검토다. Q-0028~Q-0030은 open이다.
- 후속 로컬 검증은 엔진55·컨트롤러7·HTTP2개 모두 통과했다. HTTP는 첫 시도 loopback
  포트 권한 제한으로 실행되지 않아 허용 환경에서 재검증했다. 동결 해시와 원출력을 보존했다.

근거: `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/REPORT.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/RESULTS.json`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/REVIEW-PACKET.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/requests.jsonl`,
`memory/decisions/D-0062-problem-feedback-v4-external-transfer-approved.md`.
