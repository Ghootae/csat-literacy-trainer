# 반자동 사용자 시험 판정: 학생 진술 모순·충분성 인용 1차 (2026-10-21)

- 인계 문서: `docs/handoffs/2026-10-21-v5-self-contradiction-unknown-and-sufficiency-evidence.md`
- 사례: `scripts/v5-contradiction-sufficiency-user-cases.mjs` (공손룡 12번 ④ U1·U2·V1·V2). V 근거에 두 번째 오류("…문제는 없어")가
  있어 V1·V2에 둘째 답 "문제가 있다고 봐"를 실행기 쪽에서 더했다(사례 모듈은 FROZEN 해시에 묶여 그대로).
- 실행 승인: 사용자 2026-10-21 "승인"
- 실행: luna 요청 10회, 약 $0.018. sol 0회.

## 집계: 2/4 기대대로

| 사례 | 기대 | 실제 | 판정 |
|---|---|---|---|
| U1 (사용자 원문, 진술 모순) | UNKNOWN, 질문 없음 | RECONSTRUCTABLE/ERROR, E1(ⓔ)·E2(뒷문장) 오류. 첫 질문 "표시한 부분에서 ⓔ는 일반적인 옷을 가리켜, 아니면 빨간 옷을 가리켜?" | 실패 |
| U2 (바른 근거) | SUPPORTED → 근거 확인 | SUPPORTED, "근거도 정확해. 잘 풀었어." | 통과 |
| V1 (라벨 답 "빨간 옷") | 충분성 false → 근거 미확인 | 둘째 교정 뒤 `rationaleSufficient: true`, 인용 ["d와 e 모두 일반적인 옷을 가리키니까", "빨간 옷"], VERIFIED_CORRECT | 실패 |
| V2 (관계까지 말함) | 충분성 true → 근거 확인 | true, 인용은 학생 관계 문장, VERIFIED_CORRECT | 통과 |

## 정리 (Claude)

- U1: 판정기가 학생 진술을 원문과 하나씩 대조했을 뿐 진술끼리 비교하지 않았다. 지시문 문단만으로는 부족.
- V1: 인용 요구는 지켰지만 조각(처음 근거의 오류 주장 포함)을 이어 냈다. reason "…함께 보면 … 핵심 관계가 드러납니다".
- 조치: [2차 인계](../../handoffs/2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote.md)로 출력 칸 `claimConflicts`와 충분성 인용
  하나·오류 인용 금지 검증을 더함. 결과는 [2차 판정 기록](../v5-contradiction-sufficiency-r2-user-2026-10-21/REVIEW.md).
