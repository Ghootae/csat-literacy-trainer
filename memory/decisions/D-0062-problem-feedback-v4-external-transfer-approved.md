---
id: D-0062
status: accepted
date: 2026-10-01
scope: problem-feedback-v4-synthetic-external-transfer
supersedes: none
---

# 가상 응답 시험의 외부 전송 승인

사용자는 자동 보안 검토가 차단한 전송 범위를 안내받은 뒤 ‘승인’이라고 답했다.
정보 비대칭 13번·법인 13번·도파민 13번·표면 장력 16번의 지문·선지·정답·해설과
가상 응답·후속 대화 및 기존 응답 재현 1건을 OpenAI API `api.openai.com`으로 전송한다.
재시도 포함 최대 64요청, 표준 단가 기반 추정 비용 3달러 한도를 유지한다.

D-0061의 고정 시험을 재개하는 승인이다. 다른 데이터의 전송, 정책 변경, UI 구현,
운영 전환이나 학생 상태 집계 편입은 승인 범위에 포함하지 않는다.
기대 기준은 모델 입력에서 제외하고 원출력과 비용을 보존한다.

근거: 사용자 명시 승인(2026-10-01),
`memory/decisions/D-0061-problem-feedback-v4-synthetic-test.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/PLAN.md`,
`docs/experiments/problem-feedback-v4-synthetic-2026-10-01/STATUS.md`.
