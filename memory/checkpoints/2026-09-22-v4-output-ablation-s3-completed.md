# 2026-09-22 V4 누적 절삭 S3 완료

## 변경점

- S2에 조건부 `questionIntent`를 추가한 S3를 판정15호출, 질문 생성8사례×3조건24호출로 시험했다. 총 비용은 `$0.514854`였다.
- S3 판정은 사람 질문 행동14/15, 새 질문1건, 정확한 후보 계약11/15였다. N03·N08·N27·N43에서 UNCLEAR_OK인데 `targetAxisId`까지 null로 소실됐다.
- 질문 생성은 전체 계획8/8, 계획 없음6/8, 짧은 계획8/8로 검토했다. 계획 없음은 N13·N17의 핵심 관계 일부를 놓쳤다. 짧은 계획은 비용도 세 조건 중 가장 낮았다.
- 현재 S3는 누적 절삭의 첫 명확한 위험 지점으로 미승격했다. S2를 유지하고, 다음 후보는 target을 보존하면서 모든 미통과에 짧은 계획을 남기는 S3.1이다.
- 운영 코드·UI는 변경하지 않았다.

## 근거

- `docs/experiments/v4-output-field-ablation-s3-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-field-ablation-s3-2026-09-22/QUESTION-REVIEW.md`
- `docs/experiments/v4-output-field-ablation-s3-2026-09-22/corrected-gate-audit.json`
- `docs/experiments/v4-output-field-ablation-s3-2026-09-22/execution-audit.json`

