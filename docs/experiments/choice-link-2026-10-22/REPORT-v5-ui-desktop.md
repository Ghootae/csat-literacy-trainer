# 선지 연결 v5 UI 6지문 재생성 — 논의용 보고 (Desktop Claude 대상)

작성 2026-10-22. 근거 결정: D-0162 보완 5, D-0163. 앞선 보고: `REPORT-v4-calib-desktop.md`(일반화 검증), `REPORT-v3-run-desktop.md`·`TWIST-LIST-DRAFT-v1.md`(같은 6지문 v3와 목록 초안). 측정은 결과 파일에서 계산했고, 종류 정답 판정은 Claude 메인 세션의 판단이다.

## 1. v4 → v5 변경 (설계)

- 지시문 `CHOICE-LINK-PROMPT-v5.md`에서 정의 5곳을 다듬었다.
  - DIRECTION에 선후·전제 관계를 넣었다.
  - CONDITION_SHIFT에 시점을 넣었다.
  - ADDED_METHOD를 "글에 없는 서술 방식"으로 바꾸고, 절차를 보탠 것은 ADDED_CONTENT로 보낸다.
  - HOLDER_SWAP에 다른 관점의 주장으로 내놓는 경우를 넣었다.
  - HOLDER_SWAP과 PAIR_SWAP의 경계를 적었다.
- 검증 V4: PASSAGE·SUPPLEMENT는 바뀐 곳·근거·추론 전제로만 판정한다. `contextIds`는 양쪽 id를 허용한다. v4 맞춰 보기 결과를 다시 검증하면 위반이 8에서 0이 된다.
- 테스트: 새 묶음 28개, 기존 묶음 74개 통과.

## 2. 실행 조건 (측정)

| 항목 | 값 |
|---|---|
| 모델 | `gpt-6.1-sol` medium, 6지문 × 3회 = 18요청, 재시도 0, 상한 $4 |
| 결과 | 18/18 파싱, 실비 $2.077 (`runs/ui-v5/ledger.jsonl`) |
| 대상 | 비어휘 24문항 120선지, 입력 truth 기준 FALSE 57개 |

## 3. 결과 (측정, v3 대비)

| 지표 | v3 (자유 이름) | v5 (목록) |
|---|---:|---:|
| 검증 위반 | 3 | 3 |
| 비틂 조각 | 184 | 207 |
| OTHER 조각 | – | 0 |
| 종류: 세 회차 집합 같음 | – | 42/57 (73.7%) |
| 종류: 두 회차 이상 공유 | – | 56/57 (98.2%) |
| 대상: noneOnly | 12 | 8 |
| 대상: 바뀐 곳 있는 선지 중 교집합 비지 않음 | 36/45 (80%) | 38/49 (77.6%) |
| readingGap ≠ NONE (선지×회차) | 76 | 55 |

- 종류 분류: ALL_SAME 42, INTERSECTION 7, TWO_SHARE 7, DISJOINT 1.
- 종류 분포(조각): NEGATION 43, ADDED_CONTENT 39, SUBSTITUTION 22, ADDED_METHOD 12, CONDITION_SHIFT 12, DIRECTION 12, CAUSE_SWAP 11, ABSOLUTIZE 10, CONFLATION 10, HOLDER_SWAP 9, SCOPE_EXTEND 9, WRONG_REASON 9, PAIR_SWAP 6, DEGREE 3.
- 14종이 모두 쓰였다.
- ADDED_METHOD는 정보 q10 네 선지 × 3회에만 쓰였다. 맞춰 보기에서 본 "처리 절차" 오용은 다시 나오지 않았다.

## 4. 검증 위반 3건 (측정)

모두 인용 문자열이 조금 어긋난 경우다. 연결 구조 문제는 아니다.

- 법인 q13② r2 `evidenceQuote`: 원문 "정관*이나"의 각주 표시 `*`를 뺐다.
- 법인 q12① r3 `evidenceQuote`: 원문과 정확히 일치하지 않는다. r1·r2는 같은 비틂을 정확한 인용으로 남겼다.
- mRNA q16③ r3 `choiceQuote`: 조각 quote보다 길게 잡아 조각 밖까지 포함했다.

해석: 동결할 때 다른 회차를 고르면 피할 수 있다.

## 5. Claude 종류 검토 (해석)

FALSE 57개 각각에 대해 선지 원문, 세 회차의 종류와 twistDetail, 근거 인용을 보고 다수 종류가 맞는지 판정했다. v3 목록 초안의 수작업 분류와도 대조했다.

- **맞음 56/57 (98.2%).**
- **다수 없음 1개:** 도파민 q10④ "결합하지 않은 것은 모두 뉴런 밖에서 분해된다".
  - 회차별 종류: ABSOLUTIZE / CONDITION_SHIFT / SCOPE_EXTEND.
  - 원문: "DAT가 없는 도파민성 뉴런에서 분비된 도파민은 뉴런 밖에서 분해된다."
  - 한정된 경우를 "모두"로 바꾼 것이므로 ABSOLUTIZE가 맞다. 세 이름 모두 "넓힘"을 말하지만 축이 다르다.
- **초안과 다르지만 맞음으로 본 경우:**
  - 표면 q15③ "공기의 이동이 이루어지는 것은 두 기포 내부의 압력이 동일하기 때문": 초안은 NEGATION, v5는 CAUSE_SWAP ×3. 이유 자리를 바꾼 것이므로 v5가 더 정확하다.
  - mRNA q17① 인산기·지방산 위치: 초안은 SUBSTITUTION, v5는 PAIR_SWAP ×2. 머리·꼬리가 원문에서 대비된 쌍이라 둘 다 가능하다.
  - 공손룡 q13①⑤: 초안은 HOLDER_SWAP, v5는 NEGATION ×3. ㉯ 진술이 후기 묵가 입장의 부정이라 NEGATION도 맞다.
- **여러 비틂 선지:** 회차 간에 일관되게 나뉘었다(예: mRNA q20⑤ SUBSTITUTION+ADDED_CONTENT ×3, 정보 q12① NEGATION+ADDED_CONTENT ×3). v4의 "조각 나누기" 지시가 작동했다.

## 6. 동결 방안 (제안)

목적은 UI 6지문 선지 연결의 오프라인 골드 한 벌이다. 세 회차를 어떻게 하나로 만들지가 남았다.

1. **선지별 대표 회차 고르기(추천).**
   - 각 선지에서 다수 종류 집합과 같고, 대상이 세 회차 교집합을 포함하고, 검증 위반이 없는 회차의 선지 연결을 그대로 가져온다.
   - 대상 id 합집합은 `altTargetIds`로 따로 보관한다.
   - Claude 검토 수정은 도파민 q10④(ABSOLUTIZE 회차 선택) 1개뿐이다.
   - 코드로 하고, 결과는 `frozen-choice-link/<지문>.json`에 둔다.
2. 회차 하나를 통째로 고르기: 단순하다. 하지만 어느 회차든 선지 몇 개는 소수 의견이다.
3. 조각 단위 병합: 가장 정밀하다. 하지만 조각 나누기가 회차마다 달라 규칙이 복잡하다.

## 7. 열린 질문

- Q1. 동결 방안 1로 진행해도 되는가?
- Q2. 맞춰 보기 5세트의 v4 결과도 같은 방식으로 동결할 것인가? 정의 변경 전 결과라 v5 재실행(15요청 약 $1.6)이 필요하다.
- Q3. readingGap `MULTI_STEP`(v5에서도 NONE이 아닌 선지 23개).

## 8. 파일

- 결과: `runs/ui-v5/`
- 지시문: `CHOICE-LINK-PROMPT-v5.md`
- 코드: `scripts/run-choice-link.mjs`(+test)
- 인계: `docs/handoffs/2026-10-22-choice-link-generator.md` 보완 v5
