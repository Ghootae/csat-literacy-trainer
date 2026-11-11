---
date: 2026-11-12
scope: deep-bogi-item-generation
base_commit: 82e709a9
---

# 깊은 문항 생성 방향 확정(D-0231)

- 사용자 결정(2026-11-11): 출제자 시뮬레이션 규칙 → 골드 지도 탐색 → 선별 → 〈보기〉 조립 → 독립 풀이 검증 API 파이프라인으로 간다. 판정 promising([D-0231](../decisions/D-0231-deep-item-generation-api-pipeline-confirmed.md)).
- 근거: 법인 블라인드(웹·API 차이 없음, 모두 사용 가능), 표면 장력 A/B 블라인드(순위 라>다>가>나, 라는 기출 16번보다 깊은 3단계 연결). 자료: `docs/experiments/gold-search-api-surface-tension-2026-11-11/`.
- 계산 양식 규칙(21개 + 22번 사례 건너뛰기 연결)은 아직 후보다.
- 다음: 지시문 v3 → 새 과학 지문 → 스크립트화.
