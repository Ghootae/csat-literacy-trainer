# v5.3 재구성 세 칸 판정 2단계 실측 — Desktop 보고

- 날짜: 2026-10-27. 실행: 코드 에이전트. 승인: 사용자 "승인, 63세션 실행해줘"(계획 [PLAN.md](./PLAN.md)).
- 기준 코드: 커밋 `0348d5e`(v5.3 1단계), 지시문 `source-direct-problem-feedback-v5.3.md`. 빌드 뒤 FROZEN 해시 고정.
- 상태: **중단**. 사례 점검 45세션 첫 판정과 회귀 18세션 첫 단계까지 보냈고, 회귀의 후속 단계와 정답 선택의 마지막 설명(END_START)은 보내지 않았다.

## 실행 조건

| 묶음 | 폴더 | 보낸 것 | 호출(luna/sol) | 비용 |
|---|---|---|---|---|
| A 사례 점검 | `v53-three-cell-check-2026-10-27/` | 45세션 첫 판정 | 59 / 18 | $0.94 |
| B 회귀 | `../v5-diverse-48-regression-2026-10-27-v53/` | 18세션 첫 단계(근거 미제출 2세션은 판정 호출 없음) | 10 / 19 | $0.77 |
| 합계 | | | 106 | **$1.71** |

- 첫 실행 시도는 FROZEN의 호출 상한이 실행 상한과 달라 고정 검사에서 멈췄다(외부 호출 0). 같은 상한으로 `prepare`를 다시 하고 실행했다.
- 재시도: 판정 호출은 형식 검사 실패 때 1회 재요청(최대 2회 시도). 두 번 모두 실패하면 세션은 `RETRYABLE_ERROR`(학생 화면 [평가 다시 시도]).
- 원자료: 세션별 `cases/*.json`, 요청·응답 `requests/`, 원장 `ledger.jsonl`, 첫 판정 표 [`RESULTS-first-judgment.tsv`](./RESULTS-first-judgment.tsv).

## 측정

### M1. 형식 검사 실패(두 시도 모두 실패한 세션)

| 묶음 | 판정한 세션 | 실패 | 첫 시도 실패(재시도로 회복 포함) |
|---|---|---|---|
| A 사례 점검 | 45 | **14 (31%)** | 17 |
| B 회귀 | 16 | **7 (44%)** | 10 |

회귀 실패 7세션: C-CT, C-A1, D-CP, M-CP, S-CT, S-A1, S-B2(10-26 v5.1에서는 같은 세션 모두 정상 진행).

실패 사유(실패한 시도 단위, 두 묶음 합 52회):

| 사유(서버 검사) | 횟수 | 뜻 |
|---|---|---|
| `UNTOUCHED claim must have empty studentReading, null readingQuote and no blanks` | 17 | 닿지 않은 주장에 "학생은 …를 밝히지 않았다" 같은 설명을 적음. 응답 93개의 UNTOUCHED 57개 중 22개(39%) |
| `SUPPORTED requires the three cells to meet the sufficiency criteria` | 10 | 모델의 contentAssessment가 서버가 세 칸에서 계산한 값과 다름(QF 긍정 발문 정답 2/3 실패 포함) |
| `judgment target must be a touched choiceReading claim` | 5 | 판단 대상으로 UNTOUCHED 주장을 가리킴(소재만 말한 CT·CP 학생에서 집중) |
| `READING error is only for a wrong choice` | 6 | 정답 선택에서 읽기 차이를 READING 오류로 냄(XA 3/3, XS 1/3) |
| `judgment verdict NONE must have no targets and no contradiction` | 2 | NONE인데 대상·설명을 채움 |
| 그 밖(CONTRADICTED 오류 대응 2, 부족 종류 2, 내용 오류–오류 목록 1, choiceText 1, ground NONE 1) | 7 | 기존 계약 위반 |

### M2. 기대 대비 결과(형식 통과 세션만, 각 3회)

| 사례 | 기대 | 결과 |
|---|---|---|
| K4 | SUPPORTED | UNKNOWN 1, 실패 2 → **0/3** |
| K1 | SUPPORTED | SUPPORTED 3/3 |
| DA | SUPPORTED | SUPPORTED 3/3 |
| KC | INSUFFICIENT·CONCLUSION_ONLY | 2/3 일치, 실패 1 |
| KF | INSUFFICIENT·BLANK_UNSUPPORTED | UNKNOWN 1, INSUFFICIENT·MISSING_LINK 1, 실패 1 → **0/3** |
| XS | INSUFFICIENT·READING_GAP | 2/3 일치, 실패 1 |
| XA | INSUFFICIENT·READING_GAP | **실패 3/3** |
| XB | 경계 관찰 | 정답 선택인데 TARGET 오류 1(교정 질문으로 감), 실패 2 |
| QF | SUPPORTED | 1/3, 실패 2 |
| QP | INSUFFICIENT·PARTIAL_SUPPORT | READING_GAP 2, MISSING_LINK 1 → **0/3** |
| WR | ERROR·READING | 3/3 |
| WQ | ERROR·READING | 3/3 |
| WT | ERROR·TARGET | ERROR·CONTENT 3/3(모델은 (다)에 대한 사실 오류로 봄) |
| WC | ERROR·CONTENT | 2/3, 실패 1 |
| WH | ERROR·CONTENT(INFERRED) | 3/3 |

### M3. 빈자리 채움 사용

- 응답 93개의 `blanks` 합계 **0**. BLANK_FILLED 관계 0. K4를 SUPPORTED로 만드는 핵심 장치(받는 쪽 빈자리를 '갑'으로 채우고 "not 개인"을 단서로)가 한 번도 쓰이지 않았다.
- K4 읽기 기록: r1 2차 시도는 '주주들에 의해 법인격이 부여되었기 때문'을 ADDED로, r2는 OTHER_TARGET("부여 주체에 대한 읽기는 드러나지 않는다")으로 기록했다. r1 1차·r3는 주장 모두 UNTOUCHED.
- 관계 분포(주장 단위): EXACT 62, UNTOUCHED 57, ADDED 10, WEAKER 7, OTHER_TARGET 5, REVERSED 4, STRONGER 4.

## 해석

1. **형식 실패의 주원인은 "모델이 내린 결론과 서버 재계산이 다르면 실패" 구조와 칸 규칙의 엄격함이다.** 실패 사유의 대부분은 판정 내용이 틀려서가 아니다. 모델이 쓴 설명 글(UNTOUCHED의 설명문)이 남았거나, 모델 결론이 서버 계산과 어긋나서 생겼다. v5.1에 없던 실패가 소재만 말한 학생(CT·CP)에서 집중적으로 생겨 학생용 흐름을 막는다.
2. **K4 해결이라는 설계 목표는 실측에서 달성되지 않았다.** 모델은 '받는 쪽' 빈자리를 보지 않고 학생 근거를 다른 관계(ADDED·OTHER_TARGET)로 분류했다. 빈자리 채움 규칙은 지시문에 있었지만 출력에 한 번도 나오지 않았다. 지시문 수준의 칸 정의만으로는 이 읽기를 끌어내지 못한다는 뜻으로 본다(가설).
3. **오답 쪽은 잘 작동했다.** READING(WR·WQ) 6/6, INFERRED(WH) 3/3. 읽기 오류 분리는 이번 설계에서 성과가 확인된 부분이다.
4. 과잉 인정 방지는 부분 확인에 그쳤다. STRONGER(XS)는 2/2 READING_GAP으로 막혔다. ADDED(XA)는 모델이 정답 선택에 READING 오류를 내서 모두 실패했다. 판정 방향은 맞았지만 계약 위반으로 끝난 것이다.
5. QP(일부 지지)는 PARTIAL_SUPPORT 대신 READING_GAP·MISSING_LINK로 나왔다. 모델이 UNTOUCHED 주장을 남기지 않고 한 주장으로 묶거나 WEAKER로 분류했다. 근거 부족이라는 방향은 맞다.

## 제안

- 이 상태로는 회귀를 계속하지 않는다(형식 실패가 회귀 비교를 가린다). 남은 회귀 단계·마지막 설명 생성은 보류.
- 수정 방향 후보(판단 필요):
  - (가) **서버가 결론을 계산하고, 모델 결론과 다르면 실패 대신 서버 값을 쓴다.** 설명문 같은 형식 잡음은 정규화한다(UNTOUCHED의 글 비우기, 정답 선택의 READING 오류는 기록만). 구조상 불가능한 출력만 실패로 둔다.
  - (나) (가)에 더해 K4류 읽기는 지시문 칸 정의가 아니라 별도 확인 단계로 다룬다. 예: 근거가 선지 주장과 "다른 관계"로 분류됐을 때만 빈자리 후보를 묻는 두 번째 호출.
  - (다) v5.3을 철회하고 v5.1을 유지한다. 오답 READING만 따로 가져온다.
- 코드 에이전트 권고: (가)를 먼저 적용해 형식 실패를 없앤 뒤 같은 63세션(저장된 학생 입력 재사용)을 다시 돌린다. K4는 (가)만으로 해결되지 않으므로 (나)·(다)는 그 결과를 보고 고른다.

## 열린 질문

- 빈자리 채움을 모델 출력 칸으로 유지할 가치가 있는가(93응답 0회)?
- WT(다른 약물의 작용을 (다)에 붙인 근거)는 TARGET인가 CONTENT인가? 모델은 일관되게 CONTENT로 봤다.
- XB-r2처럼 정답 선택에 TARGET 오류를 내면 교정 질문으로 가는 흐름이 맞는가(v5.1에도 있던 동작)?

## 파일

- 계획 [PLAN.md](./PLAN.md), 사례 [`scripts/v53-three-cell-cases.mjs`](../../../scripts/v53-three-cell-cases.mjs), 표 [RESULTS-first-judgment.tsv](./RESULTS-first-judgment.tsv)
- 회귀 폴더 `../v5-diverse-48-regression-2026-10-27-v53/`(첫 단계만), 기준 `../v5-diverse-48-regression-2026-10-26/`
