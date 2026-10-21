# 반자동 사용자 시험 판정: 정답·근거 미확인의 판단 방식 표시 1차 (2026-10-21)

- 인계 문서: `docs/handoffs/2026-10-21-v5-correct-unverified-judgment-method.md`
- 사례: `scripts/v5-judgment-method-user-cases.mjs` (도파민 13번 ②, M1은 사용자 원문, M2·L1·S1은 Claude 작성)
- 실행 승인: 사용자 2026-10-21 "승인"
- 실행: luna 요청 7회, 약 $0.011. 검증 재시도 0회.

## 집계

| 사례 | 판정기 | 결과 | 판정 |
|---|---|---|---|
| M1a | INSUFFICIENT, JUDGMENT_METHOD | 첫 칸: "…지문에 없음"만으로는 그 설명이 틀렸다고 판단할 수 없어. 약물이 어디에서 어떤 작용을 하는지 확인해야 해. | 방식 인정 없음 ✅, 까닭 빠짐 △ |
| M1b | INSUFFICIENT, JUDGMENT_METHOD | 첫 칸: "…지문에 없음"이라는 점만으로는 선지가 적절한지 판정하기 어려워. … 확인해야 해. | 같음 △ |
| M2 (원문 밖 지식) | SUPPORTED, NONE | "근거도 정확해. 잘 풀었어." | 예상(INSUFFICIENT+JUDGMENT_METHOD)과 다름 |
| L1 (사실만) | SUPPORTED, NONE | 같음 | 예상(INSUFFICIENT+MISSING_LINK)과 다름 |
| S1 (충분) | SUPPORTED, NONE | 같음 | ✅ |

## 정리 (Claude)

- 25번 대상의 판정 표시와 "네가 말한 대로 지문에는 없어" 인정 제거는 2/2. 그러나 "왜 그 방식만으로 부족한지"를 말하지 않아
  설계안의 "원리 한 문장"을 채우지 못했다 → 마지막 설명 지시문에 "'…만으로는 판단할 수 없다'에서 멈추지 말고 … 까닭을 말한다"를
  더해 M1만 재시험([2차](../v5-judgment-method-r2-user-2026-10-21/REVIEW.md)).
- M2·L1은 첫 판정이 SUPPORTED라 바뀐 마지막 설명 경로에 닿지 않았다. MISSING_LINK 경로는 실모델로 확인하지 못했다. 첫 판정의
  충분성 범위는 25번 범위 밖이라 UI 메모장 29번으로 올렸다.
- 칸 앞뒤 고정 문구("빠진 연결을 같이 채워 볼게.", "네 근거에서 빠진 부분이 이해됐으면,")는 판단 방식 경우에 조금 어긋난다(범위 밖, 기록만).
