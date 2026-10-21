# 반자동 사용자 시험 판정: 학생 진술 충돌 칸·충분성 인용 하나 2차 (2026-10-21)

- 인계 문서: `docs/handoffs/2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote.md`
- 사례: `scripts/v5-contradiction-sufficiency-r2-user-cases.mjs` (공손룡 12번 ④, 1차 실패 U1·V1은 두 번씩)
- 실행 승인: 사용자 2026-10-21 "일괄로 승인"(설계 수정·위임·재시험)
- 실행: luna 요청 14회, 약 $0.022. sol 0회. 검증 재시도 0회.

## 집계: 6/6 기대대로

| 사례 | 판정기 출력 | 결과 |
|---|---|---|
| U1a | `claimConflicts` 1건("d는 일반적인 옷" ↔ "특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로"), UNKNOWN, 오류 없음 | 질문 없이 마지막 설명, UNVERIFIED_CORRECT |
| U1b | U1a와 같은 짝 | 같음 |
| U2 | 충돌 없음, SUPPORTED | "근거도 정확해. 잘 풀었어.", VERIFIED_CORRECT |
| V1a | E1 REPAIRED("빨간 옷"), 충분성 false | UNVERIFIED_CORRECT |
| V1b | 같음. reason: "이 답변만으로는 ⓓ와 ⓔ의 지시 대상이 어떻게 다른지 … 드러나지 않는다" | UNVERIFIED_CORRECT |
| V2 | E1 REPAIRED, 충분성 true, 인용 하나 "ⓓ의 그냥 옷이랑 ⓔ 빨간 옷은 같은 대상을 가리키는 게 아니네." | VERIFIED_CORRECT |

## 정리 (Claude)

- 이번에는 V 근거의 두 번째 오류("…문제는 없어")를 판정기가 잡지 않아 V 세션은 교정 한 번으로 끝났다(1차와 다름, 모델 변동).
  둘째 답은 쓰이지 않았다. 충분성 판정에는 영향 없음.
- U1 마지막 설명 첫 칸은 학생 앞문장만 인정("ⓓ를 일반적인 '옷'이라고 본 건 맞아")하고 모순된 뒷문장은 다루지 않았다. 문제
  없음으로 본다.
- 한 문항·한 선지 사례다. 다른 문항의 진술 모순·라벨 답 충분성은 아직 시험하지 않았다.
