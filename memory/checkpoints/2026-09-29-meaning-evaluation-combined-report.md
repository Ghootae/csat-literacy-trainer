# 2026-09-29 — 구체 인정·이중 판정 통합 보고서

## 이번 변경분

사용자 요청으로 D-0037 후보 시험과 D-0039 두 수준 판정의 결과를 하나의 보고서로 정리했다.
짧은 명칭은 기존 후보 '구체 인정', 후속 실험 '기능·구체 이중 판정', 줄여서 '이중 판정'으로 연결했다.
기존 식별자 `v4-concrete-meaning-v1`, `functional-meta-axis-evaluation-v1` 및 원출력은 유지한다.

두 실험은 48+36=84판정호출, 47+35=82계약유효다. 같은 실제4문단 응답이 중복되어 총13개
고유 응답 문자열이며 실제 응답은2개다. 메타 생성6회는 별도로 설명하고 전체 정확도를 합산하지 않았다.
구체 인정 후보와 후속 Level1 지시문·실제4문단 응답은 같지만 축 description은 달라 순수 전후비교가 아님을 명시했다.

## 해석과 상태

같은 의미의 구체적 실현을 인정하는 것과, 세부가 덜 표현된 기능적 이해를 기본PASS로 허용하는 것을 구분했다.
후속 C3에서 Level1도PASS3/3이어서 승인된 기본PASS/추가보상 경계가 미분리라는 기존 결론을 유지한다.
새 의미 기준이나 보상 정책은 채택하지 않았다. 추가 API·코드·UI·운영골드·서버 변경0.

## 출처

- `docs/experiments/meaning-evaluation-combined-2026-09-29/REPORT.md`
- `docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/REPORT.md`
- `docs/experiments/axis-concrete-meaning-two-paragraphs-2026-09-29/results.jsonl`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REPORT.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/results.jsonl`
