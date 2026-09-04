# 카나리 16개 문단 직접 검토 자료

이 폴더는 최초 생성 결과와 이후 수정 과정을 분리해 보존한다.

- `initial-results/`: 원문, 최초 진단 골드·명제 Bundle, 최초 독립 감사 결과
- `repair-history/`: 감사 쟁점, 1·2차 수리 결과, 재감사 결과, 필드별 변경 내역
- `paragraphs/`: 사람이 읽기 쉬운 문단별 요약
- `collaborative-repair/`: 2차 수리 후 남은 3개 문단의 협업 수리 후보, 사례집, 규칙 승격 검토

협업 수리 결과와 규칙 후보는 [규칙 승격 검토 보고서](collaborative-repair/RULE-PROMOTION-REVIEW.md)에서 확인할 수 있다.

사용자가 승인한 최종 16개 산출물과 자동·반자동 경로 라벨은
[카나리 승인 manifest](../canary-approved-manifest-v1.json)에 기록되어 있다.

- `AUTOMATIC_AGENT_AUDITED`: 13개
- `SEMIAUTOMATIC_USER_AGENT_APPROVED`: 3개

현재 결과: AGENT_AUDITED 13개, REVIEW_REQUIRED 3개

| 지문 | 문단 | 최초 감사 | 수리 횟수 | 최종 상태 | 검토 |
|---|---:|---|---:|---|---|
| 볼록 렌즈와 비점 수차 | 1 | PASS | 0 | AGENT_AUDITED | [열기](paragraphs/69fd388386fd308968e0b9f4-p1.md) |
| 볼록 렌즈와 비점 수차 | 2 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69fd388386fd308968e0b9f4-p2.md) |
| 볼록 렌즈와 비점 수차 | 3 | REPAIR_REQUIRED | 2 | REVIEW_REQUIRED | [열기](paragraphs/69fd388386fd308968e0b9f4-p3.md) |
| 볼록 렌즈와 비점 수차 | 4 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69fd388386fd308968e0b9f4-p4.md) |
| 지진파의 특성과 내진설계 | 1 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c0961c78128b2a9bee0717-p1.md) |
| 지진파의 특성과 내진설계 | 2 | REPAIR_REQUIRED | 2 | REVIEW_REQUIRED | [열기](paragraphs/69c0961c78128b2a9bee0717-p2.md) |
| 지진파의 특성과 내진설계 | 3 | PASS | 0 | AGENT_AUDITED | [열기](paragraphs/69c0961c78128b2a9bee0717-p3.md) |
| 지진파의 특성과 내진설계 | 4 | PASS | 0 | AGENT_AUDITED | [열기](paragraphs/69c0961c78128b2a9bee0717-p4.md) |
| 지진파의 특성과 내진설계 | 5 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c0961c78128b2a9bee0717-p5.md) |
| 지진파의 특성과 내진설계 | 6 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c0961c78128b2a9bee0717-p6.md) |
| 준거가격과 거래효용 | 1 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c09163fa5063deffe1c180-p1.md) |
| 준거가격과 거래효용 | 2 | PASS | 0 | AGENT_AUDITED | [열기](paragraphs/69c09163fa5063deffe1c180-p2.md) |
| 준거가격과 거래효용 | 3 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c09163fa5063deffe1c180-p3.md) |
| 준거가격과 거래효용 | 4 | REPAIR_REQUIRED | 1 | AGENT_AUDITED | [열기](paragraphs/69c09163fa5063deffe1c180-p4.md) |
| 준거가격과 거래효용 | 5 | REPAIR_REQUIRED | 2 | REVIEW_REQUIRED | [열기](paragraphs/69c09163fa5063deffe1c180-p5.md) |
| 준거가격과 거래효용 | 6 | PASS | 0 | AGENT_AUDITED | [열기](paragraphs/69c09163fa5063deffe1c180-p6.md) |

주의: REVIEW_REQUIRED 문단은 2차 자동 수리까지 완료했지만 감사 쟁점이 남아 있으며, 더 이상 자동 수정하지 않았다.
