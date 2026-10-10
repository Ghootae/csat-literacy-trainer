---
date: 2026-09-29
scope: paragraph-v4-repeatability
---

# 기존 V4 복원UI 완전동일 본문3회 재생

- 사용자가 완전히 같은 요청에서 같은 응답이 나오는지 확인하도록 요청해 기존V4 복원UI 요청을 순차3회 실행했다.
- revealedAxisContent:[] 포함. SDK fetch 전송 직전 본문·해시를 저장해3회 동일성 확인. 과거 원요청 미저장이므로 과거UI와의 완전 동일성까지 주장하지 않는다.
- AX3 PASS/PASS/UNCLEAR_OK, AX1은OK3/3·AX2 PASS3/3. 기존V4 자체의 동일 요청 판정 변동을 직접 관측했다. 설명 포함 전체 출력도3회 다름.
- 2회차 이유 '목적과 제한적 성격 확인', 3회차 '용도는 확인했지만 제한적 허용 범위는 불명확'. 원출력부터 차이가 났으며 계약 검사 사후 변경 아님.
- API3/3·계약3/3, 재시도0. 입력6134씩(과거UI 계측과 같음), 총입력18402·출력3570. 운영 코드·UI 미변경.
- 이 결과는 이전 빈항목 누락이 없어도 판정 변동이 있음을 보여주지만 그 항목의 효과0 또는 공급자 내부 변동 원인까지 확정하지 않는다.
- 근거: `docs/experiments/corporate-ui-exact-replay-2026-09-29/REPORT.md`, `request.json`, `manifest.json`, `wire.jsonl`, `results.jsonl`, `summary.json`; `scripts/replay-corporate-ui-exact.mjs`.
