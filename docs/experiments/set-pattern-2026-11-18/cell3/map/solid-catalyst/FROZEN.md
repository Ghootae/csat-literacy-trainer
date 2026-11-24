# 동결 지도

- `frozen-map.json` = `runs/map-r1.json` 사본(수정 없음), sha256 `2df64fb00734e2b6b12a038b9920412e1d128f51e4b543f9922fb1c7235e59f6`. MAP-PROMPT-v2 무수정, 3회 모두 구조 검증 통과. 스크립트 `scripts/run-analysis-map-gongsun.mjs`(②·gen31·gen32 때와 같음), gpt-6.1-sol, 3회 합계 $0.318.
- 선택 이유(점검표 v2): 평평한 명제(묶음 없이 문단 요지에 바로 달린 명제)는 세 회차 모두 1문단 P1-9, 2문단 P2-1로 같다(합 2). 명제 수는 r1 42개, r2·r3 43개. 교차 노드는 r1·r3에 1개(X1), r2는 없다. r3은 2문단에서 암모니아 합성 예시와 전자 공유 안정화를 한 묶음(C2-4)에 넣어 성격이 다른 내용을 합쳤고, r2는 2문단 큰 묶음 C2-9에 세 묶음을 한 노드로 몰았다. r1은 금속·암모니아 예시(C2-3), 전자 공유 안정화(C2-4), 흡착 세기 적절성(C2-7: 약함·강함 한 묶음), 표면 원자 수(C2-8)를 갈라 두었다. 세 회차 차이가 작다(closeCall).
- 입장·관계 유형 층은 만들지 않음.
- 지문 JSON(`../passages/solid-catalyst.json`)은 `docs/experiments/deep-item-v5-2026-11-18/passages/solid-catalyst/passage.txt`와 같은 본문(4문단, 각주 없음).
