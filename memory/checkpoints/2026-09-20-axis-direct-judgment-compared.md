# 중심축 최소 출력 직접 판정 비교 완료

- 명칭 `axis-direct-judgment-v1`. 사용자 명칭 지정·시험 승인에 따라 독립 후보 구현. 원본 골드·운영 기본값·UI 변경 없음. [D-0022](../decisions/D-0022-axis-direct-judgment-experiment.md).
- 같은6문단20응답, 기존 V4와 직접 후보 각각3회120호출. 재시도·질문 생성0, 비용 추정$0.8665124, 미확인 사용량0. 입력 동일, 지시·출력 스키마만 다름.
- 충분 PASS17/18→18/18, 충분 자동 질문0/18→0/18. 핵심 누락 SERIOUS14/18 동일이나 기존 OK4, 후보 OK1·PASS3. 오류12/12 동일.
- 후보 PASS3은 도파민의 외부/뇌내 기능 대조가 빠진 동일 답3회. 에이전트 의미 검토상 과수용이며 안정성과 정확성을 구별해야 한다.
- 전체 자동 질문 대상은26/60 동일. 경계 PASS2/12→9/12는 사람 정답 미확정으로 개선율이 아니다.
- 전체 축 라벨3회 일치14/20→19/20. API 중앙값7.9675초→2.083초. 프롬프트·스키마 동시 단순화의 묶음 비교이며 스키마 단독 인과 효과는 미확정.
- 전체 계약 기존59/60·후보60/60. 기존 인용 실패1건도 원판정은 읽을 수 있어 의미 집계에 포함. 검증 통과 결과의 축 라벨 변경0. 원본 골드6개·보호24파일 불변.
- 관련188테스트·build 통과. 실익은 있으나 의미 품질·운영 대체는 미검증이므로 운영 미적용.

근거: `docs/experiments/axis-direct-judgment-v1-2026-09-20/REPORT.md`, `docs/experiments/axis-direct-judgment-v1-2026-09-20/summary.json`, `docs/experiments/axis-direct-judgment-v1-2026-09-20/execution-audit.json`; 구현: `packages/pipeline/src/dialogue-experiment/direct-judgment-experiment.ts` 및 동명 `.test.ts`.
