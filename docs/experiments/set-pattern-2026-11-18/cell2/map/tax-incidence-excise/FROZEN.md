# 동결 지도

- `frozen-map.json` = `runs/map-r1.json` 사본(수정 없음), sha256 `1748a6ceafe1165eccc43a31bee71b01597b53cdd7f642f6958da734ca3f28d1`. MAP-PROMPT-v2 무수정, 3회 모두 구조 검증 통과. 스크립트 `scripts/run-analysis-map-gongsun.mjs`(gen31·gen32 때와 같음), gpt-6.1-sol, 3회 합계 $0.332.
- 선택 이유(점검표 v2): 평평한 명제(묶음 없이 문단 요지에 바로 달린 명제)는 세 회차 모두 1문단 P1-1, 4문단 P4-7로 같다(합 2). 명제 수는 r1·r3 37개, r2 36개. 같은 37개에서 교차 노드가 r1 2개, r3 1개라 r1을 골랐다. 세 회차 차이가 작다(closeCall).
- 입장·관계 유형 층은 만들지 않음.
- 지문 JSON(`../passages/tax-incidence-excise.json`)은 `docs/experiments/deep-item-v5-2026-11-18/passages/tax-incidence-excise/passage.txt`와 같은 본문(ⓐ 표시 포함, 5문단, 각주 `* 세수`는 notes). 본문 [A] 상자 표시는 넣지 않았다.
