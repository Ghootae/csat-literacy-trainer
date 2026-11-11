---
date: 2026-11-11
scope: principle-application-item-generation
base_commit: 9543f913
---

# P1 중단, 깊은 〈보기〉 문항 갈래로 전환

- 사용자 판정: P1 법인 a "사용 가능, 품질 중하"(`docs/experiments/principle-application-pilot-2026-11-09/REVIEW-p1-items.md`). 나머지 6문항은 판정하지 않았다.
- 사용자 결정: P1 생성 방식을 중단하고 중단된 실험으로 기록한다([D-0230](../decisions/D-0230-p1-principle-application-generation-stopped.md)).
  - 이유 1: 상황이 변수와 값을 직접 줘서 개념으로 옮기는 단계가 빠진다.
  - 이유 2: 문항이 산수가 된다.
  - 이유 3: a와 b가 겹친다.
- 새 갈래: 출제자 시뮬레이션으로 규칙을 뽑고, 골드 지도 탐색 → 선별 → 〈보기〉 조립 → 풀이 검증 API 파이프라인으로 문항을 만든다([D-0229](../decisions/D-0229-deep-bogi-item-generation-gold-map-search.md)).
- 계산 양식 규칙 21개(`docs/handoffs/2026-11-11-calculation-format-rules.md`)는 사용자 확인 전이다. 결정 기록이 없다.
- 저장소 원격(`Ghootae/csat-literacy-trainer`)은 공개 저장소다. 인증 없는 GitHub API 응답이 200이었다. 기출 지문 원문이 커밋돼 있다.
