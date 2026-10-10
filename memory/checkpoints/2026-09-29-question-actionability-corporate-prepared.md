---
date: 2026-09-29
scope: paragraph-v4-question-quality
---

# 법인 2문단 질문 진단 가치 실험 준비

- 사용자가 V4 질문 생성 내부 진단 가치 검토를 법인 2문단부터 시험하도록 승인했다.
- 실제 세션의 AX1 귀속 질문 전·AX3 제한 확인 질문 전 2시점을 고정했다. 현재 V4와 후보 각3회, 총12 요청을 준비했다. 운영 코드·UI·서버 변경은 없다.
- 모델·effort는 실제 questionCall과 동일한 gpt-5.6-terra/medium이다. 새로운 예상 답은 실제 학생 근거로 기록하지 않고, 질문 생략과 PASS를 분리하는 계약을 후보에 넣었다.
- 자동 승인 검토는 학생 응답·내부 골드·판정의 OpenAI 외부 전송에 대한 구체적 동의 부족을 사유로 실행을 거절했다. API 호출0회·실험 결과 없음이며 명시적 전송 승인 대기다.
- 준비 자료와 제한의 정본: `docs/experiments/question-actionability-corporate-p2-2026-09-29/REPORT.md`, `PLAN.md`, `manifest.json`, `cases.json`.
- 실행 도구: `scripts/test-question-actionability-corporate.mjs`.
- 다음 행동은 고정된12 요청의 외부 전송 승인 후 실행·검토다. 타 문단 확장·운영 승격은 미실행이다.
