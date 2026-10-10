---
date: 2026-09-29
scope: paragraph-v4-request-audit
---

# 과거 법인UI와 1차 판정 실험 요청 대조

- 사용자가 기존V4의 과거OK/실험PASS 차이 원인을 확인하도록 요청했다. 추가 API0회.
- 현재 빌드의 실제 세션→2단계 평가기→게이트를 가짜 클라이언트로 전송 직전 캡처했다. 과거 원요청 전체는 저장되지 않아 역사적 요청이 아닌 코드 복원본임을 명시한다.
- 복원UI와 실험baseline은 원문·축·학생 발화·model/effort·프롬프트·스키마·출력한도·store가 일치한다. 발견된 유일한 본문 차이는 UI의 revealedAxisContent:[]가 실험에서는 생략된 것. 나머지 본문 완전 일치 검사 통과.
- 과거 입력6134토큰, 실험C1 baseline3회모두6126토큰. 빈 항목 차이가 판정 차이를 유발했다고 단정하지 않는다.
- 관련 프롬프트·빌드 수정시각은 UI 호출보다 이전. 원판정/검증판정 모두AX3 OK, 해당 시간의 계측은attempt1 한 건. 사후 상태 보정 때문에 달라진 것은 아니다.
- 따라서 과거UI OK→이번기존PASS를 완전 동일 요청의 순수 변동이라고 확정할 수 없다. 반면 후보C1의3회 요청해시는 동일하고 결과PASS/OK/PASS라 동일 후보 요청의 변동은 직접 확인된다.
- 실제 문단 로그 ID는 deba1db1-ab28-455c-a351-4c676a6b905a이며, 상위 개발자 UI ID126037eb-1619-49b9-a490-ba5bc6795e0f와 구분한다.
- 근거: `docs/experiments/axis-expression-recheck-corporate-p2-2026-09-29/REPORT.md`, `request-comparison-audit.json`, `reconstructed-ui-request.json`; `scripts/audit-corporate-ui-request.mjs`; `.omc/logs/dialogue-experiment/sessions.jsonl`; `.omc/metrics/llm.jsonl`.
