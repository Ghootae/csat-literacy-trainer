# 반자동 사용자 시험 판정: 정답 선택 "근거 충분"의 조각별 학생 인용 1차 (2026-10-21)

- 인계 문서: `docs/handoffs/2026-10-21-v5-supported-key-relation-coverage.md`
- 사례: `scripts/v5-supported-coverage-user-cases.mjs` (6개 근거 × 2회. B1·K1은 Claude 작성, 나머지도 시험용 문장)
- 실행 승인: 사용자 2026-10-21 "승인"
- 실행: luna 요청 17회, 약 $0.033. 검증 재시도 0회.

## 집계: 9/12 기대대로

| 근거 | a | b | 판정 |
|---|---|---|---|
| M2 원문 밖 지식("…배웠어") | INSUFFICIENT, MISSING_LINK | INSUFFICIENT, MISSING_LINK | 부족은 맞음, 종류가 틀림(JUDGMENT_METHOD 기대) |
| L1 사실 한 줄("말초 조직에서만 작용함") | INSUFFICIENT, MISSING_LINK | **SUPPORTED** | b는 조각 하나에 관계 전체를 넣고 학생 한 줄로 덮음 |
| B1 경계("뇌에 못 들어가") | INSUFFICIENT, MISSING_LINK | INSUFFICIENT, MISSING_LINK | 사용자 판정: 근거 부족 동의 |
| S1·U2·K1 대조군 | SUPPORTED ×3 | SUPPORTED ×3 | ✅ |

## 정리 (Claude)

- M2의 종류 오분류로 마지막 설명이 "네가 말한 대로 … 늘리는 약이 아니라는 점은 맞아"라고 판단 방식을 인정했다(25번 문제 재발).
- L1b의 빈틈: 조각 수·인용 분리를 검사하지 않았다.
- 조치(사용자 승인): 정답 SUPPORTED는 조각 2개 이상·조각별 겹치지 않는 인용, 원문 밖 출처·결론 되풀이는 JUDGMENT_METHOD
  → [2차](../v5-supported-coverage-r2-user-2026-10-21/REVIEW.md).
