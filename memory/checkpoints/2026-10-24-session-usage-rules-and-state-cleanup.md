# 사용량 절감 규칙과 CURRENT_STATE 정리

- 날짜: 2026-10-24
- 결정: [D-0171](../decisions/D-0171-session-usage-rules.md)

## 바뀐 것

- 최근 30일 사용량 집계에서 Sonnet 구현 몫은 약 4~5%, 비용의 약 2/3는 메인 세션 캐시 읽기로 나와 구현의 DeepSeek 전환은 하지 않기로 했다.
- `AGENTS.md`에 "모델 배분과 긴 산출물 검토"·"과제 종료 절차" 절을 추가하고, 시작 때 `INDEX.md`는 소제목 → 관련 구역 → 낱말 검색 순으로 읽도록 바꿨다.
- `CURRENT_STATE.md`를 지금 참인 것만 남겨 63KB → 약 16KB로 다시 썼다. 원문은 [`CURRENT_STATE-ARCHIVE-2026-10-24.md`](../CURRENT_STATE-ARCHIVE-2026-10-24.md)에 보존했다.
- 정정: 이전 `CURRENT_STATE.md`의 출제자 전략 피드백 "질문 1 답 대기"는 낡은 기록이었다. 57편 생성·검토 완료(커밋 3fa6c3c)와 화면 연결 인계(`docs/handoffs/2026-10-24-examiner-strategy-ui.md`)로 고쳤다.
- `scripts/validate-memory.mjs`에 `CURRENT_STATE.md` 20KB 상한 검사를 추가했다.

## 다음

- 1~2주 새 규칙으로 작업한 뒤 같은 집계로 사용량을 다시 잰다(D-0171 재검토 조건).
