# 동결 지도

- `frozen-map.json` = `runs/map-r3.json` 사본(수정 없음), sha256 `48db7282727006b5085ab014525ed9cce453dbad2a2a973b7e7ff7b13724ff5a`. MAP-PROMPT-v2 무수정, 3회 모두 구조 검증 통과. 스크립트 `scripts/run-analysis-map-gongsun.mjs`(②·gen31·gen32 때와 같음), gpt-6.1-sol, 3회 합계 $0.422.
- 선택 이유(점검표 v2): 평평한 명제(묶음 없이 문단 요지에 바로 달린 명제)는 r1 4개(P2-1·P3-1·P4-1·P5-1), r3 4개(P1-3·P3-1·P4-1·P5-1), r2 7개(P6-1·P6-2 포함)라 r2는 뒤로. r1과 r3은 같은 4개인데, r1은 3문단 C3-3에 반응 개시 농도(P3-2)·뿌리 감수성(C3-2)·눈(P3-8)·결론(P3-9)을 한 노드로 몰아 성격이 다른 내용을 합쳤고(감점 항목), r3은 농도–반응 곡선(C3-1)과 개시 농도(P3-2)를 C3-2로 묶고 기관별 감수성 비교(C3-4)를 따로 세웠다. r3은 2문단도 전제(C2-1)·산성화·익스팬신(C2-2)·유연성·물 유입(C2-3)으로 갈랐다. 명제 수는 r1 51, r2 51, r3 53(r3이 약간 더 쪼갬). 교차 노드는 r2·r3이 X1~X3, r1은 X1·X2. 세 회차 차이가 작다(closeCall).
- 입장·관계 유형 층은 만들지 않음.
- 지문 JSON(`../passages/auxin-growth.json`)은 `docs/experiments/deep-item-v5-2026-11-18/passages/auxin-growth/passage.txt`와 같은 본문(6문단, 각주 `* 팽압`·`* 감수성`은 notes).
