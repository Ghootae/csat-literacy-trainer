# 선지 연결 v2 3회 실행 결과 — 논의용 보고 (Desktop Claude 대상)

작성 2026-10-22. 근거 결정: `memory/decisions/D-0162-choice-link-layer-direction.md`(보완 1·2). 설계 검토: `docs/review/choice-link-design-review-2026-10-21.md`. 이 문서는 측정과 해석을 구분해 적는다. "측정"은 결과 파일에서 계산한 값, "해석"은 Claude 메인 세션의 판단이다.

## 1. 실행 조건 (측정)

| 항목 | 값 | 출처 |
|---|---|---|
| 프롬프트 | `CHOICE-LINK-PROMPT-v2.md` (instructionsHash `a5e827f4…`, schemaHash `bffab1a5…`) | `runs/ui-v2/RUN.json` |
| 모델 | `gpt-6.1-sol`, reasoning medium | 같은 곳 |
| 대상 | UI 6지문, 비어휘 24문항, 120선지, 이미지 2장(공손룡 13번 전사로 대체·mRNA 19번 그림) | `targets-ui.json`, `supplement-fixed.json` |
| 회차 | 지문당 3회, 18요청, 재시도 0 | `RUN.json` |
| 상한 | usdCap $5, maxRequests 18 | 같은 곳 |
| 결과 | 18/18 PARSED, 실비 $1.992 | `runs/ui-v2/ledger.jsonl` |

## 2. 검증 결과 (측정)

회차별 전체 통과: 18건 중 4건(surface 3회, information-asymmetry r3). 위반 76건의 규칙별 분포:

| 규칙 (검증 항목) | 건수 | 분포 |
|---|---:|---|
| 4: `source NONE`인데 id 있음 | 32 | 공손룡 q11·q12, information-asymmetry q10, mRNA 등 |
| 5: 비틂 아님인데 `supportIds` 빔 | 27 | 대부분 공손룡 q12(3회 × 다수 조각) |
| 4: `INFER`인데 `inferenceBasisIds` 빔 | 5 | 공손룡 r2 q11#2, mRNA r2 q19·q20 |
| 4: `APPLY`인데 source가 BOTH 아님 | 5 | 공손룡 r3 q12, mRNA r3 q19#5 |
| 4: `PASSAGE`인데 〈보기〉 id 섞임 | 3 | 도파민 q11#5(3회 모두, contextIds에 `S2`) |
| 6: 정답 일관성 (answerConflict true와 함께) | 3 | 법인 q10#1(3회 모두) |
| 5: `evidenceQuote` 원문 불일치 | 1 | 법인 r3 q13#2.2 |

검토 표시: NOTE 231, EXPLANATION_DIFFER 30, ANSWER_CONFLICT 13, NONE_TWIST 9, MULTI_TWIST 6.

source × operation 조각 수(3회 합): PASSAGE·RESTATE 195, BOTH·APPLY 166, PASSAGE·INFER 139, SUPPLEMENT·RESTATE 33, NONE·INFER 19, SUPPLEMENT·INFER 12, NONE·RESTATE 8, NONE·APPLY 5, BOTH·INFER 4. 비틂 조각 172.

## 3. 정답 대비 판단 (측정)

정답 번호와 발문 극성에서 기대 truth를 계산해 3회 × 120선지 = 360판단과 비교했다.

| 기대 → 모델 | 수 |
|---|---:|
| TRUE → TRUE | 169 |
| FALSE → FALSE | 163 |
| TRUE → UNDETERMINED | 17 |
| FALSE → UNDETERMINED | 8 |
| TRUE → FALSE | 3 |

불일치 28판단은 선지 10개에 몰린다.

| 선지 | 회차별 | answerConflict | 원인(측정된 note 요지) |
|---|---|---|---|
| 법인 q10① | FALSE ×3 | true | "구성원들에게"를 개인들로 읽어 원문 "구성원 단체"와 다르다고 판단. 해설은 같은 것으로 봄 |
| 공손룡 q12 ①②③④⑤ | UNDETERMINED ×3 (15판단) | **false** | 〈보기〉 조각에 ⓐ~ⓔ 표시가 없어 지시 대상을 확인할 수 없다고 보류 |
| mRNA q18④ | U / T / U | true(r1·r3) | 혈장 단백질의 음전하가 원문에 없음. 흡착에서 전하를 추론하지 않음 |
| mRNA q19② | U ×3 | true | 투입 속도 조절 → 균일도 인과가 〈보기〉에 없음 |
| mRNA q20③ | U / U / F | true(r1·r2) | 세포막의 표면 재방출이 원문에 없음. 거짓 확정 대신 보류 |
| mRNA q20⑤ | U ×3 | true | 엔도솜 막 산성화·효소 분해 기제가 원문에 없음 |

**정정:** 1차 구두 보고에서 "정답과 실제로 어긋난 선지는 3개"라고 했으나 틀렸다. 공손룡 q12 다섯 선지가 answerConflict를 false로 둔 채 UNDETERMINED여서 ANSWER_CONFLICT 집계에 잡히지 않았다. 검증 6번은 truth가 정답과 반대(TRUE↔FALSE)일 때만 위반으로 잡고 UNDETERMINED는 잡지 않는다.

## 4. 입력 결함 발견 (측정)

공손룡 q12 〈보기〉 원본(`suneung_db/output/questions/69c011fd78128b2a9beddd5e.json`, block `…_q12_supp01`)에는 `elements`에 `kind: "phrase"`, `symbol: ⓐ~ⓔ`, `style: underline` 구간 5개가 있다(ⓐ S1의 "옷", ⓑ·ⓒ S2의 두 "옷", ⓓ·ⓔ S3의 "옷"·"빨간 옷"). 생성기의 〈보기〉 조각은 `paragraph` 글만 옮기고 phrase 표지를 버렸다. 6지문 전체 supplement를 훑은 결과 표지가 있는 〈보기〉는 이 하나뿐이다.

해석: q12의 UNDETERMINED 15판단, 비틂 아님·supportIds 빔 위반의 대부분, APPLY·NONE 표기 흔들림 일부는 모델 문제가 아니라 이 입력 결함의 결과다. 모델은 note에 원인을 정확히 적었다.

## 5. 회차 간 안정성 (측정)

- truth 3회 일치: 118/120. 불일치는 mRNA q18④, q20③.
- 단, 공손룡 q12처럼 "3회 모두 UNDETERMINED"도 일치로 셌다. 일치율은 정확성을 뜻하지 않는다.
- 거짓 선지(어느 회차든 FALSE) 56개 중 3회 `twistTargetIds` 교집합이 비지 않은 것: 43/56.
- 교집합이 빈 13개:
  - 도파민 q11 ①③④: r1은 지문 명제(P2-12 등), r2·r3는 〈보기〉 `S2`를 바뀐 곳으로 지목. 〈보기〉를 지문 원리에 대응시키는 문항에서 "어디가 틀렸나"를 지문 쪽에 둘지 〈보기〉 쪽에 둘지가 정해져 있지 않다.
  - information-asymmetry q10 ①③④⑤: 서술 방식 문항("장단점을 분석하여 제시"). 2회는 NONE이라 대상 없음, 1회는 G1·TOP·X2. 글 전체 서술 방식을 비트는 선지의 표기 규칙이 없다.
  - mRNA q19⑤·q20①·q20③, surface q15②③·q16②: 인접 명제·관계·합성 사이에서 단위 고르기가 흔들림.

## 6. 해설과의 일치 (측정)

EXPLANATION_DIFFER 30판단: 법인 q10①×3, q11③×3, 공손룡 q11⑤ r2, q12 전 선지×3(15), mRNA q18④×2, q19②×3, q19⑤×3. q12 15건은 입력 결함 몫이다.

## 7. 비틂 이름 (측정)

비틂 조각 172개, 이름은 거의 모두 고유. 같은 비틂이 회차마다 다른 표현으로 나온다(예: "간접 경로의 활성 억제를 활성 유도로 변경/역전", "간접 경로 억제를 활성 유도로 반전"). 전체 빈도표는 `runs/ui-v2/REPORT.md`. 큰 갈래 묶기는 아직 하지 않았다.

## 8. 해석과 제안

1. **입력 수정(필수):** 〈보기〉 조각 글에 phrase 표지를 넣는다. 형식 제안: 조각 `text`에 "옷ⓐ"처럼 표지를 구간 뒤에 덧붙이고, 조각에 `marks: [{symbol, text}]`를 함께 준다. 지문 표시(밑줄·기호)와 같은 방식.
2. **truth 처리(사용자 판단 필요):** 모델은 시험보다 엄격하게 읽는다(법인 q10①, mRNA 4선지). 이 층의 목적은 정답 판정이 아니라 좌표 남기기다. 그래서 제안은 다음과 같다. 정답에서 도출한 truth를 입력으로 고정하고, 모델은 연결만 한다. 모델이 정답 판단에 동의하지 않으면 `readingGap`(예: `IMPLICIT_PREMISE` 상식 보충 필요, `STRICT_READING` 표현을 엄격히 읽으면 다름) 표시와 note로 남긴다. 대안은 현행(모델 판단 + answerConflict 표시)이다. 현행을 유지하면 UNDETERMINED도 검증 6에서 잡아야 한다.
3. **규칙 충돌 해소:**
   - `source NONE`이면 `contextIds`에 "가장 가까운 단위"를 허용한다(지시문 4번과 검증 4의 충돌).
   - `APPLY` 조각은 대응시킨 〈보기〉 조각과 지문 원리를 모두 `supportIds`(비틂이면 바뀐 쪽을 `twistTargetIds`)에 넣도록 명시한다.
   - `INFER`면 `inferenceBasisIds` 필수를 지시문에 굵게 둔다.
4. **바뀐 곳 지목 규칙:**
   - 〈보기〉 적용 문항에서는 선지가 〈보기〉를 잘못 옮겼으면 〈보기〉 조각, 지문 원리를 잘못 적용했으면 지문 단위를 지목한다(도파민 q11).
   - 서술 방식 문항은 `TOP`이나 해당 `X`/`G`를 contextIds로, source NONE으로 고정한다.
5. **비틂 목록:** 172조각을 6개 큰 갈래(내용 바꿈·관계 바꿈·주체 바꿈·범위·정도 바꿈·근거 없는 추가·대응 오류)와 세부 이름으로 묶어 초안을 낸다. 외부 전송 없음.
6. **v3 실행:** 위 1·3·4와 목록을 넣고, 같은 6지문을 3회 재생성한다. 예상 약 $2.

## 9. 열린 질문 (논의 요청)

- Q1. truth를 정답에서 고정할 것인가, 모델 판단으로 둘 것인가(8-2).
- Q2. 〈보기〉 적용 문항에서 바뀐 곳을 〈보기〉 쪽에 둘지 지문 쪽에 둘지(8-4)를 모델 판단에 맡길 것인가, 규칙으로 정할 것인가.
- Q3. 비틂 세부 이름의 입도: 회차 간 같은 비틂을 하나로 묶을 수 있을 만큼 거칠게, 아니면 학생 피드백 문장에 쓸 수 있을 만큼 구체적으로.

## 10. 파일

- 결과: `docs/experiments/choice-link-2026-10-22/runs/ui-v2/<지문>/r<k>/choice-link.json`·`.validation.json`·`.raw.json`, `summary.json`, `REPORT.md`, `RUN.json`, `ledger.jsonl`
- 입력: `targets-ui.json`, `supplement-fixed.json`, `CHOICE-LINK-PROMPT-v2.md`
- 생성기: `scripts/run-choice-link.mjs`(+ test)
- 주의: `runs/ui-v2/.omc/`는 OMC 도구가 자동으로 만든 폴더라 결과물이 아니다(커밋 제외).
