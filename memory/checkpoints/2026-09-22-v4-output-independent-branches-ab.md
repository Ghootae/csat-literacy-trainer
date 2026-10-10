# 2026-09-22 V4 출력 절삭 독립 후보 A·B1 완료

## 변경점

- S2에서 독립 분기한 A와 B1을 사례당 1회, 총23호출·`$0.455004`로 실행했다. 운영 코드·UI는 바꾸지 않았다.
- A는 모든 미통과에 짧은 `questionIntent`를 유지했다. 계획 중앙 길이는95→53자로 줄었지만 출력 토큰은 S2 1차 대비2.6%, 비용은0.9%만 감소했다. 사람 질문 행동14/15, 새 질문1건, 계약14/15로 S2보다 안전한 근거가 없어 미승격했다.
- B1은 description·evidence·responseIndex·state를 유지하고 파생 가능한 source와 current의 빈 revisionEvidence를 제거했다.8개 수명주기 사례에서 압축 스키마, 기존 형식 복원·검증, 사례별 current/수정/철회/오류 참조가 모두8/8 통과했다.
- B1 원장 직렬화 크기는 복원 형식 대비25.4% 작았다. 같은 사례의 기존 형식 API 대조는 하지 않아 총 토큰·비용 절감률은 미확정이다.
- A가 통과하지 않았으므로 A+B1 조합은 실행하지 않는다. B1은 자연 응답과 질문 흐름 검증 전까지 운영에 반영하지 않는다.

## 근거

- `docs/experiments/v4-output-branch-a-short-intent-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-branch-b1-compact-ledger-2026-09-22/REPORT.md`
- `docs/experiments/v4-output-branch-a-short-intent-2026-09-22/execution-audit.json`
- `docs/experiments/v4-output-branch-b1-compact-ledger-2026-09-22/execution-audit.json`
