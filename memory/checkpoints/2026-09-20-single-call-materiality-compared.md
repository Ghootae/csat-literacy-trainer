# 동일 호출 내 누락 중요도 후보 비교 완료

- 사용자 일괄 승인으로 기존 V4 평가 호출의 판정 지침만 바꾸는 독립 후보를 구현했다. 골드·운영 기본값·UI는 변경하지 않았다. [D-0021](../decisions/D-0021-single-call-materiality-experiment.md).
- 6문단20응답×2조건, 각1회40호출 유효. 추정$0.5105604, 재시도·질문 생성0. 입력·스키마 동일, instructions만 다름. 원본 골드6개·기존 보호 파일66개 불변, axisFeedback 사후 변경0.
- 충분6은 모두 PASS, 오류4는 모두 ERROR로 두 조건 동일. 사전 정의 핵심 누락은 기존 SERIOUS4/6·OK2/6, 후보 SERIOUS6/6. 사전 기대는 에이전트 작성이며 독립 사람 정답 아님.
- 경계에서 공손룡 AX2·법인의 부수적 누락 허용은 개선됐으나 공손룡 AX1은 OK→SERIOUS, 도파민은 PASS→OK. 순 과개입 감소를 확정할 수 없어 운영 미적용.
- mRNA 내부 questionIntent의 축 밖 원인 요구 위험은 양쪽에 남았다. 실제 질문 생성이나 학생 경험 검증은 하지 않았다.
- API 중앙값7.830초→9.375초. 단회 비교이므로 지연의 안정적 인과 효과로 확정하지 않는다.
- 문단 대화181테스트·build 통과. 원문·응답·양쪽 판정·모델 원출력 및 보고서를 보존했다.

근거: `docs/experiments/single-call-materiality-2026-09-20/REPORT.md`, `docs/experiments/single-call-materiality-2026-09-20/summary.json`, `docs/experiments/single-call-materiality-2026-09-20/execution-audit.json`; 구현·시험: `packages/pipeline/src/dialogue-experiment/materiality-gate-experiment.ts`, `packages/pipeline/src/dialogue-experiment/materiality-gate-experiment.test.ts`.
