# 2026-10-21 선지 연결 방향과 UI 4지문 분석 골드

- [D-0162](../decisions/D-0162-choice-link-layer-direction.md): 선지 연결 층(정오·지도 단위·비틂)을 오프라인 진단용으로 먼저 만들고 피드백 런타임에는 넣지 않음(D-0002 유지). 비틂 목록은 UI 6지문 문항으로 만들고 맞춰 보기 6지도로 검증.
- UI 4지문(법인·정보 비대칭·mRNA·표면 장력) 분석 골드, `docs/experiments/analysis-gold-ui-2026-10-21/`: 지도 v2 12회 검증 통과 $1.49, 동결 r1·r1·r2(closeCall)·r2, 입장 덮어쓰기 0($0.159), 관계 156개 기타 0($0.219). 지문 원천은 `packages/pipeline/fixtures/experiments/dialogue/passages/`(읽기만).
- 지도 v2 세 회차 문장 묶음 일치는 21문단 중 10(첫 묶음 v1 8/21, 둘째 묶음 v2 14/18; 갈린 곳은 주로 나열·하위 묶음 깊이).
- 다음: 비틂 종류 목록 — 처음 기술을 Claude가 할지 sol이 할지 결정 남음.
