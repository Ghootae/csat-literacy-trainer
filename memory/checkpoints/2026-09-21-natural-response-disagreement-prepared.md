# 자연 응답 비교 준비 · 외부 전송 승인 대기

- 사용자 승인으로 후속 방향을 자연 응답 V4↔direct-v1 불일치 검토로 전환했다([D-0026](../decisions/D-0026-natural-response-disagreement-mining.md)).
- 출처 확인31세션·고유30문단·45시점의 실제 발화와90개 요청을 동결했다. 최초31/후속14, 이전 상태null, 미래 답변 제외. 기존 실사용 질문·공개 도움은 보존했다.
- 빌드 성공, 신규 Node5/5 및 기존 관련 Vitest34/34 통과. API 입력 미리보기와 동결 검증 산출물을 생성했다.
- 유료 실행은 안전 검토에서 자연 응답의 OpenAI API 전송 명시적 승인 필요 사유로 프로세스 생성 전에 거절됐다. 실제 호출0·비용0, 우회 없음. 다음 행동은 정확한 전송 범위에 대한 승인 확인이다.
- 운영·골드·UI 변경 없음. 아직 불일치 수나 개선 결과 없음.

근거: `docs/experiments/natural-response-disagreement-v1-2026-09-21/STATUS.md`, `PLAN.md`, `manifest.json`, `preflight-audit.json`(같은 디렉터리); 구현 `scripts/test-natural-response-disagreement.mjs`, `scripts/lib/natural-response-disagreement.mjs`; 테스트 `scripts/natural-response-disagreement.test.mjs`.
