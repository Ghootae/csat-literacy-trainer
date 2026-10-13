# 2026-10-13 정답 경로 파일럿 2차 결과 (D-0121 규칙)

- 인계: `docs/handoffs/2026-10-13-answer-path-depth-pilot-v2.md`. Codex가 직접 판단(API 0). 실행 A(지도 동결·채점 r1·보고), 실행 B(r1 미열람 독립 재채점 r2).
- 보고서: `docs/experiments/answer-path-depth-pilot-v2-2026-10-13/REPORT.md`. A 첫 실행은 N1·N4·N6을 누락해 12개로 오인하고 중단, 재지시 후 15개 완료.
- **재채점 일관성(Claude 비교):** result·failedOperation·failedNodeId·failedElement·tags 15/15 일치. I1 미확정 후보 목록만 3개(r1) 대 2개(r2)로 달랐다. 한계: 같은 에이전트 계열이고, 판단이 필요한 사례는 S2·I1 둘뿐(나머지 13개는 정답·근거 없음·극성으로 규칙상 자명).
- **깊이 변별력 소실:** 10개 선지 중 9개가 3층, 1개(표면장력 C5)가 4층. READ→LINK→APPLY 구조상 LINK가 이어지지 않으면 3층으로 수렴한다. 노드 수는 3~7로 차이가 난다.
- 오답 9개 중 실패 종류 확정 1(S2, READ·E5), 미확정 1(I1), 근거 없음 5, 극성 2. 정답 6 중 꼬리표: 근거 오류 4, 찍음 2.
- 지도 문제: S2 실패 요소가 노드 요소(E5)로 기록돼 선지 핵심 요소(E4)와 다름. 계산 노드 1개가 어휘 밖(E 없음).
- 후속: 사용자 결정으로 깊이 = 노드 수([D-0122](../decisions/D-0122-answer-path-depth-node-count.md)).
