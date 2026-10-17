# 2026-10-17 분석 지도 공손룡 2단계 결과

- [D-0143](../decisions/D-0143-analysis-map-gongsun-pilot.md) 2단계 절: r3 무수정 동결(`docs/experiments/analysis-map-gongsun-2026-10-16/FROZEN.md`), 목적은 구현 로직 확인, luna 1회, 관계를 별도 판정 단위로 추가. 판정 지시문 `JUDGE-PROMPT.md`(Claude), [인계](../../docs/handoffs/2026-10-16-analysis-map-gongsun-stage2.md).
- 실행(executor + Claude 재개 수정): 대화 47(V4 27·단순 형식 20, 원문 복사 8), 라운드 77, 판정 1,552(노드 1,202·관계 350), 실패 0, 실제 $0.2916. 첫 실행은 연결 오류 666건으로 중단 → 비용 계산·상한·연속 오류 차단 수정 뒤 재개(테스트 28/28).
- 결과(`stage2/REPORT.md`, Claude 집계):
  - 원문 복사 대조군 노드 DIRECT 133·PARTIAL 18·모순 0.
  - 합성·요지 노드 판정 390 중 상위 PARTIAL 204(52%)는 결합 규칙상 패턴 없음. SUBSUMED 102, LISTING 5, MISMATCH_TOP_ONLY 0, MISMATCH_RELATION 10.
  - 모순 94건은 오류 하나가 여러 노드·관계로 번진 경우가 많음(예: "후기 묵가: 일대일 대응 주장" 한 문장 → 13단위). 오탐 유형: 학생이 인용한 공손룡 주장을 학생 주장으로 읽음(P3-5), 일상 용법 명제와 공손룡 견해 충돌(P3-10), 다른 올바른 내용을 방향 뒤집기로 봄(P4-4 ← "명이 여러 실을 지시"), 세부 시점 차이(G1 "전국시대 이후").
  - 누적 입력인데 라운드 2 이상에서 라벨 하락 51건(PARTIAL→ABSENT 33 등), 상승 165건.
  - 문단을 넘는 관계 68판정 중 ABSENT 52. 동어반복 P4-5·P4-6은 22판정 중 ABSENT 16.
- 다음: 결합 로직 보완(모순 묶음 단위, 상위 PARTIAL 처리, 라운드 단조성, 교차 관계 배정) 사용자 논의.
