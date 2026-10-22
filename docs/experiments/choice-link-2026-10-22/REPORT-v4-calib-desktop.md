# 선지 연결 v4 맞춰 보기 6지도 일반화 검증 — 논의용 보고 (Desktop Claude 대상)

작성 2026-10-22. 근거 결정: D-0162 보완 4, D-0163. 앞선 보고: `REPORT-v3-run-desktop.md`. 측정은 결과 파일에서 계산한 값이고, 해석과 종류 정답 판정은 Claude 메인 세션의 판단이다.

## 1. v3 → v4 변경 (설계)

1. 비틂 종류를 14종 + `OTHER` 닫힌 목록에서 고른다(`twistType`). 구체 내용은 `twistDetail`에 적는다. "대응 오류" 갈래는 없다(사용자 A안).
2. 규칙 보정:
   - `source: NONE`이면 `INFER`의 inferenceBasisIds 면제.
   - 한 선지의 여러 비틂은 조각을 나눠 표시.
   - 안정성 요약에서 NONE 비틂만 있는 선지(`noneOnly`)를 따로 셈.
   - 발문 극성: `않은 것|않는 것` → SELECT_INCORRECT.
3. (가)·(나) 세트 지원: 두 지도의 id에 `가.`·`나.` 접두를 붙여 한 입력으로 합친다.
4. 지시문 `CHOICE-LINK-PROMPT-v4.md`, 인계 `docs/handoffs/2026-10-22-choice-link-generator.md` 보완 v4. 테스트는 새 묶음 28개, 기존 묶음 74개가 통과했다.

## 2. 실행 조건 (측정)

| 단계 | 대상 | 모델 | 요청 | 실비 |
|---|---|---|---:|---:|
| 관계 분류 | 의미 내재주의·가상 공간 지도(각 29관계), 분류 지시문 v3 | gpt-6.1-sol medium | 2/2 파싱, 검증 통과, OTHER 0 | $0.083 |
| 선지 연결 v4 | 5세트 × 3회, 비어휘 19문항·95선지, 그림 2장 | gpt-6.1-sol medium | 15/15 파싱 | $1.572 |

- 재시도 0, 상한은 $0.5와 $4.
- 결과 위치:
  - 관계 분류: `docs/experiments/analysis-gold-calibration-2-2026-10-21/classify/`
  - 선지 연결: `runs/calib-v4/`
- 입력 `truth` 기준 FALSE 선지는 46개다(SELECT_CORRECT 9문항 × 4, SELECT_INCORRECT 10문항 × 1).

## 3. 일반화 판단 기준 (D-0162 보완 4, 실행 전에 정함)

| 기준 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 다수 종류가 OTHER인 FALSE 선지 | ≤ 10% | 0/46 (0%), OTHER 조각 0 | 통과 |
| 두 회차 이상이 같은 종류를 고른 선지 | ≥ 80% | 44/46 (95.7%) | 통과 |
| Claude 검토로 다수 종류가 맞는 선지 | ≥ 85% | 42/46 (91.3%) | 통과 |

종류 안정성 분류(측정): ALL_SAME 36, INTERSECTION 1, TWO_SHARE 7, DISJOINT 2.

## 4. 검증 위반 (측정)

위반 합계는 8이다. 전체 통과 회차는 13/15이다.

- 의미 내재주의 q23 r2 3건, r3 4건, 결측치 q10 r1 1건이다.
- 모두 같은 종류다: `PASSAGE`(또는 `SUPPLEMENT`) 조각의 `contextIds`에 다른 쪽 id가 들어갔다.
  - 예: q23① r3: source PASSAGE, 바뀐 곳 P4-1, 함께 볼 곳 S2.
  - q23은 "〈보기〉의 관점에서 퍼트넘의 주장을 비판"하는 문항이다. 선지 내용은 지문(퍼트넘)에 있고, 판단 관점은 〈보기〉에 있다. 그래서 〈보기〉 조각을 함께 볼 곳에 넣은 것은 타당하다.
- 해석: 규칙의 결함이다. source는 근거의 위치이므로 바뀐 곳·근거·추론 전제만으로 판정하고, 함께 볼 곳은 양쪽 모두 허용하는 것이 맞다. v3 NONE에 함께 볼 곳을 허용한 것과 같은 논리다.

## 5. 종류 분포 (측정, 비틂 조각 150개, 3회 합)

| 갈래 | 조각 | 종류 |
|---|---:|---|
| 1 내용 바꿈 | 90 | NEGATION 43, SUBSTITUTION 21, DIRECTION 18, CONFLATION 8 |
| 2 관계 바꿈 | 16 | CONDITION_SHIFT 7, WRONG_REASON 5, CAUSE_SWAP 4 |
| 3 주체 바꿈 | 11 | HOLDER_SWAP 8, PAIR_SWAP 3 |
| 4 범위·정도 바꿈 | 10 | SCOPE_EXTEND 6, ABSOLUTIZE 4, DEGREE 0 |
| 5 근거 없는 추가 | 23 | ADDED_CONTENT 22, ADDED_METHOD 1 |

- 14종 중 13종이 쓰였다. DEGREE는 이 표본에 없다.
- ADDED_METHOD 1건은 잘못 쓰인 경우다(6절 결측치 q9②).
- UI 6지문 초안(57선지)과 같이 NEGATION이 가장 많다.

## 6. Claude 종류 검토 (해석)

46개 선지마다 선지 원문, 세 회차의 종류와 twistDetail, 근거 인용을 보고 다수 종류가 맞는지 판정했다. 검토 자료는 `runs/calib-v4/REPORT.md` "종류 안정성" 표다.

**틀림 또는 다수 없음 4개**

| 선지 | 회차별 종류 | 판단 |
|---|---|---|
| 근대 문명 q6① "전통 사상은 과학 및 과학 정신과 양립할 수 없는 관계" (두 인물 모두 동의할 진술) | NEGATION / CONFLATION / SCOPE_EXTEND | 한 인물의 입장을 두 사람 공통으로 넓힌 것이므로 SCOPE_EXTEND(r3)가 맞다. 다수가 없다. |
| 결측치 q9② "중앙값을 찾기 위해 데이터를 나열할 때 이상치는 제외되기 때문" | ADDED_METHOD / NEGATION / ADDED_CONTENT | 없는 절차를 보탠 ADDED_CONTENT(r3)가 맞다. r1은 "서술 방식"을 "처리 방법"으로 오해했다. 다수가 없다. |
| 결측치 q10② "A 기법은 이상치를 제외하고 후보 직선을 가정" | CONDITION_SHIFT ×2 / ADDED_CONTENT | 무작위 선택에 없는 사전 제외 절차를 보탠 것이므로 ADDED_CONTENT가 맞다. 다수가 틀렸다. |
| 의미 내재주의 q23④ "대상 그 자체를 아는 것이 의미 결정에 중요" (〈보기〉 관점의 비판) | WRONG_REASON ×2 / HOLDER_SWAP | 퍼트넘 자신의 주장을 〈보기〉 관점의 비판으로 내놓은 것이다. 관점(주인) 바꾸기인 HOLDER_SWAP(r2)이 더 가깝다. WRONG_REASON 정의와 맞지 않는다. |

**맞지만 정의 경계에 걸친 2개** (맞음으로 셈)

- 근대 문명 q4④: "과학 정신이 정치 변혁의 전제"를 "정치 변혁이 선행되어야"로 바꿨다. 세 회차 모두 DIRECTION이다. 정의(증감·이동 방향)에 "선후·전제 관계의 방향"이 없다.
- 근대 문명 q5⑤: "『대한매일신보』에 이르러서야"로 시점을 옮겼다. 세 회차 모두 CONDITION_SHIFT다. 정의에 시점이 없다.

**경계가 흐린 쌍** (관찰)

- HOLDER_SWAP ↔ PAIR_SWAP: ㉠·㉡이 두 입장일 때다. 가상 공간 q15③은 HOLDER_SWAP ×3, q14①은 PAIR_SWAP ×3로 회차 안에서는 일관됐다.
- SUBSTITUTION ↔ HOLDER_SWAP: 의미 내재주의 q21③.

## 7. 기타 측정

- 대상 안정성:
  - FALSE 46개 중 noneOnly 4.
  - 바뀐 곳이 있는 42개 중 세 회차 교집합이 비지 않음 35 (83.3%). v3 UI는 80%였다.
- readingGap: 선지×회차 285건 중 IMPLICIT_PREMISE 20, STRICT_READING 8이다. NONE이 아닌 선지는 14개다.
- 검토 표시: NOTE 116, READING_GAP 28, NONE_TWIST 20, MULTI_TWIST 12, NONE_UNTWISTED 10, EXPLANATION_DIFFER 9, TWIST_OTHER 0.
- (가)·(나) 합친 입력은 위반 0으로 처리됐다.
  - 접두 id가 정상 사용됐다: `가.P2-7`, `나.P4-10` 등.
  - 그림 전사 〈보기〉 2문항(경마식 보도 q7, 가상 공간 q16)도 위반 0이다.

## 8. 제안

1. 목록 확정: 14종을 유지한다. 정의만 다듬는다.
   - DIRECTION에 "선후·전제 관계의 방향"을 넣는다.
   - CONDITION_SHIFT에 "시점"을 넣는다.
   - ADDED_METHOD 이름을 "글에 없는 서술 방식"으로 바꾸고, "처리 절차를 보탠 것은 ADDED_CONTENT"라고 적는다.
   - HOLDER_SWAP에 "다른 관점(〈보기〉 등)의 주장으로 내놓음"을 넣는다.
   - HOLDER_SWAP과 PAIR_SWAP의 경계를 적는다: 주장·입장이면 HOLDER_SWAP, 대상·현상의 특성이면 PAIR_SWAP.
2. 검증 규칙: source 판정에서 `contextIds`를 뺀다(4절).
3. 다음 단계: 확정 목록(v5 지시문)으로 UI 6지문을 다시 생성해 오프라인 골드로 동결할지, 아니면 v4 결과에 Claude 검토만 더해 동결할지 정한다. 피드백 비교 실험의 입력이 된다.
4. readingGap `MULTI_STEP`(Q3)은 계속 열어 둔다. 이번 표본에서 NONE이 아닌 선지는 14/95다.

## 9. 열린 질문

- Q1. 정의 다듬기만 하고 재검증 없이 확정해도 되는가? 이번 오답 4개 중 3개(q9②, q10②, q23④)는 정의를 고치면 해소될 유형이다.
- Q2. 확정 목록으로 UI 6지문을 다시 생성할 것인가(요청 18, 약 $2)?
- Q3. readingGap `MULTI_STEP`.

## 10. 파일

- 결과: `runs/calib-v4/<세트>/r<k>/choice-link.json`·`.validation.json`·`.raw.json`, `summary.json`, `REPORT.md`, `RUN.json`, `ledger.jsonl`
- 입력: `targets-calib.json`, `supplement-fixed.json`(그림 2문항 추가), `CHOICE-LINK-PROMPT-v4.md`
- 관계 분류: `docs/experiments/analysis-gold-calibration-2-2026-10-21/classify-targets.json`, `classify/`
- dry-run(커밋 제외): `dry-run/ui-v4`, `dry-run/calib-v4`, `dry-run/calib-v4-full`, `dry-run/calib-v4-partial-targets.json`
