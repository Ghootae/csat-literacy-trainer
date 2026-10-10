---
id: D-0078
status: accepted
date: 2026-10-02
scope: gongsun-marker-input-ab-external-transfer
supersedes: none
---

# 공손룡 기호 보완 A/B 외부 전송 승인

사용자는 공손룡 원문·문항·해설·기호 범위와 기존 실제/가상 응답을 OpenAI API로 보내는
수정 전후 비교 설명 뒤 “승인”이라고 명시했다. 최대24요청·과거 단가 추정2달러 상한으로,
준비된14최초 평가와 후속1경로만 실행한다. 프롬프트 자동 수정이나 UI 승격 승인은 아니다.

총15요청으로 완료했다. 수정 입력의 분기 필드는7/7 일치하고 수정 답변1경로도 통과했으나,
수정 입력의 대상 역전 응답1회에서 내부 오류 설명·미공개 코칭의 의미 오류가 남았다.
결과를 완전 해결이나 운영 승격으로 해석하지 않는다.

근거: 이 대화의 사용자 승인, `scripts/test-gongsun-marker-input-ab.mjs`,
`docs/experiments/gongsun-marker-input-ab-2026-10-02/FROZEN.json`, `requests.jsonl`, `RESULTS.json`,
`memory/checkpoints/2026-10-02-gongsun-marker-ab-completed.md`.
