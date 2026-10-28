# 인계: 판정기 선지 읽기 관계 정의 보강(D1) — v5.4 지시문

- 날짜: 2026-10-28
- 작성: Claude(코드 에이전트)
- 실행: executor 하위 에이전트(sonnet)는 구현·테스트·준비까지, 외부 호출은 Claude가 한다.
- 관련 결정: `memory/decisions/D-0182-problem-feedback-v53-three-cell-adopted.md`(세 칸 판정), `D-0184`(M4 레이아웃 v1, 재검토 조건 "판정기 진단 글이 틀리면 설명도 따라 틀린다(XS-r1)")
- 근거: `docs/experiments/end-explanation-layout-2026-10-28/REPORT-desktop.md` 제안 2
- 사용자 승인(2026-10-28): 아래 문장 추가와 XS·XA·WQ·G-B3 각 3회, 12세션, 상한 $0.6.

## 문제

XS 학생은 ②("…흑질에서 합성된 도파민의 작용 기간을 연장할 수 있겠군")를 "흑질 도파민이 분해되지 않고 계속 남는다는 말"로 읽었다.
사용자 판단으로 이 읽기는 선지와 사실상 같은 뜻인데, 판정기가 STRONGER로 분류해 마지막 설명이 "더 강한 뜻이라 차이가 있어"라고 썼다.
지금 정의(`source-direct-problem-feedback-v5.3.md` 83행)는 "선지 글자 그대로(생략 복원만)"만 EXACT로 인정한다.

XS는 원래 STRONGER 과잉 인정 탐침(`scripts/v53-three-cell-cases.mjs` `X-stronger-never-broken-down`)이었다. 이번 변경으로 XS의 기대값은
READING_GAP이 아니라 "relation EXACT"로 바뀐다(사용자 판단). 사례 모듈의 주석을 이에 맞게 고친다(경로 이름은 그대로 둔다).

## 손댈 파일

1. `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.4.md` 새로 만든다 = v5.3 복사 + 아래 한 곳 변경. v5.3 파일은 건드리지 않는다.
   - 83~84행 relation 정의 문단(`relation: 선지 글자 그대로(생략 복원만) EXACT, … 닿지 않음 UNTOUCHED.`) 바로 뒤, 같은 문단 끝에 다음 두 문장을 **글자 그대로** 붙인다(줄바꿈 후 이어 써도 된다, 빈 줄로 새 문단을 만들지 않는다):

     ```text
     학생 읽기가 선지 말을 같은 뜻의 다른 말로 풀어 쓴 것이거나 선지 말에서 곧바로 따라 나오는 결과를 말한 것이면 EXACT다.
     WEAKER·STRONGER·ADDED는 그 차이 때문에 원문에 비춘 선지의 참·거짓 판단이 달라지거나, 학생의 반박·지지가 선지에는 통하지 않게 될 때만 쓴다.
     ```
   - 그 밖의 줄은 v5.3과 바이트 단위로 같아야 한다(`diff`로 확인, 추가 2줄만).
2. `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: 판정 지시문 경로를 v5.4로 바꾼다.
3. `scripts/run-v5-live-check.mjs`: `runtimePaths`의 v5.3 경로를 v5.4로 바꾼다.
4. `packages/pipeline/src/problem-solving/feedback.test.ts`: v5.3 경로를 참조하는 테스트를 v5.4로 바꾸고, v5.4에 위 두 문장이 있고 v5.3과의 차이가 그 두 문장뿐임을 확인하는 테스트를 하나 더한다.
5. `scripts/v53-three-cell-cases.mjs`: XS 주석만 고친다(기대값: relation EXACT, 2026-10-28 사용자 판단). 사례 내용·id·개수는 바꾸지 않는다.

## 범위 밖

- `feedback-claims.ts`의 relation 처리 코드, 스키마, 상태 기계, M4 지시문.
- 외부 API 호출(Claude가 직접 한다). git 쓰기 명령.

## 완료 조건 (executor)

- [ ] `diff source-direct-problem-feedback-v5.3.md source-direct-problem-feedback-v5.4.md`가 추가 2줄만 보인다.
- [ ] `grep -rn "feedback-v5.3" packages/pipeline/src scripts/run-v5-live-check.mjs`는 새 차이 테스트 안에서만 나온다.
- [ ] `npm run build` 통과.
- [ ] `npm test`: 새 테스트 통과, 실패는 알려진 기존 실패만(`boundary.test.ts` `node:fs`, `axis-architecture-experiment.test.ts` `.omc/adhoc`, `scripts/run-end-explanation-choice-link-compare.test.mjs` 4건).
- [ ] 외부 호출 없이 끝낸다.

## 실행 (Claude, 승인 범위)

- 묶음 A: `V5_LIVE_CHECK_CASES=./v53-three-cell-cases.mjs V5_LIVE_CHECK_SET=XS*3,XA*3,WQ*3`, 폴더 `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/three-cell/`. XS·XA는 luna, WQ는 sol. -b 실행과 같은 방식(첫 판정, 정답 선택은 마지막 설명까지).
- 묶음 B: `V5_LIVE_CHECK_CASES=./v5-diverse-48-regression-cases.mjs V5_LIVE_CHECK_SET=G-B3*3`, 폴더 `…/regression-gb3/`. 전체 대화.
- 상한: 합계 12세션, $0.6. 보내기 전에 세션 수가 12인지 확인한다.

## 판정 기준

| 사례 | 기대 | 실패 신호 |
|---|---|---|
| XS×3 | relation EXACT, 마지막 설명에 "더 강한 뜻"·"차이" 없음 | STRONGER 잔존 |
| XA×3 | relation ADDED 유지, INSUFFICIENT(READING_GAP) | EXACT로 바뀜(과잉 인정) |
| WQ×3 | 오답의 WEAKER READING 오류와 교정 질문 유지 | 오류 없음, EXACT로 바뀜 |
| G-B3×3 | (별건) "적절한 설명이에요" 교정 답을 REPAIRED로 판정하는 비율 | — 측정만 |

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.4.md`(신규, v5.3 대비 추가 2줄), `packages/pipeline/src/problem-solving/feedback-evaluator.ts`(경로 + metadata promptVersion `problem-feedback-v5.4`), `scripts/run-v5-live-check.mjs`, `packages/pipeline/src/problem-solving/feedback.test.ts`(v5.4 참조 + 차이 테스트 1개 추가), `scripts/v53-three-cell-cases.mjs`(13행 XS 주석만)
- 테스트 결과: `npm run build` 통과. `npm test` 1447 통과 / 2 실패(알려진 boundary.test.ts node:fs, axis-architecture-experiment.test.ts .omc/adhoc). 새 테스트 통과. (npm test는 scripts/*.test.mjs를 포함하지 않아 choice-link-compare 4건은 이번 실행에 나타나지 않음)
- 실행 결과: 12세션 전송, $0.396(상한 $0.6). XS 3/3 STRONGER 유지(목표 미달), XA 3/3 ADDED 유지, WQ 2/2 WEAKER READING 오류 유지(r3는 sol 형식 계약 위반 3회 연속으로 중단, -b 실행에도 같은 위반 1회), G-B3 3/3 REPAIRED. 보고: `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/REPORT-desktop.md`, `REPORT-human.md`.

## 2차: v5.5 (사용자 승인 2026-10-28 "승인")

1차 결과 XS STRONGER 3/3 유지. 둘째 문장의 "학생의 반박·지지가 선지에는 통하지 않게 될 때"가 근거 부족을 읽기 차이로 정당화했다(REPORT-desktop.md 해석).

- `source-direct-problem-feedback-v5.5.md` 새로 만든다 = v5.3 + relation 정의 문단 끝에 다음 두 줄(글자 그대로). v5.3·v5.4는 건드리지 않는다.

  ```text
  학생 읽기가 선지 말을 같은 뜻의 다른 말로 풀어 쓴 것이거나 선지 말에서 곧바로 따라 나오는 결과를 말한 것이면 EXACT다.
  relation은 학생 근거가 선지를 반박·지지하는지와 따로, 학생이 읽은 뜻이 선지 말과 같은지만으로 정한다. 근거가 선지에 닿지 않는 것은 judgment.holds와 contradiction에서 다룬다.
  ```
- 판정기 경로·metadata `promptVersion`·실행기 `runtimePaths`를 v5.5로. 차이 테스트는 v5.5 대 v5.3(추가 2줄)으로 바꾼다.
- 실행(Claude): XS×3, XA×3(luna), 폴더 `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/three-cell-v55/`. 6세션, 약 $0.03, luna 상한 $0.1.
- 기대: XS relation EXACT, insufficiencyCase MISSING_LINK, M4가 읽기 차이를 말하지 않음. XA ADDED 유지.

## 3차: v5.6 (사용자 승인 2026-10-28 "진행")

v5.5 XS: ADDED 2·STRONGER 1, 함정을 짚은 M4 1/3. 사용자 제안: ADDED와 STRONGER·WEAKER가 경합하면 차이가 추가 정보에서 오는지 강도에서 오는지 판단. 충돌 검토 결과 WEAKER(빠뜨림 포함, 발문별 인정이 ADDED와 반대)는 제외하고 ADDED vs STRONGER로 한정, ADDED 정의 확장, OTHER_TARGET 경계 추가.

- `source-direct-problem-feedback-v5.6.md` 새로 만든다 = v5.5 복사 + 두 곳 변경. v5.3·v5.4·v5.5는 건드리지 않는다.
  1. 84행 `선지에 없는 원인·조건을 보탬 ADDED` → `선지에 없는 내용(원인·조건·방식 등)을 보탬 ADDED` (그 줄의 나머지 그대로).
  2. 86행(`relation은 학생 근거가 …`) 바로 뒤에 다음 두 줄 글자 그대로:

  ```text
  ADDED와 STRONGER가 함께 후보가 되면, 선지와 학생 이해의 차이가 선지에 없는 내용을 더한 데서 오는지, 같은 내용의 정도·범위·확실성이 세진 데서 오는지 판단한다. 둘 다 있으면 ADDED로 하고 studentReading에 학생이 더한 내용을 밝힌다.
  같은 사태를 다른 말로 나타낸 것은 세진 것이 아니다. 선지가 이미 가리키는 대상을 다른 것으로 바꾼 것은 ADDED가 아니라 OTHER_TARGET이다.
  ```
- 판정기 경로·metadata `promptVersion`(`problem-feedback-v5.6`)·실행기 `runtimePaths`를 v5.6으로. 차이 테스트는 v5.6 대 v5.5(84행 변경 1, 추가 2줄)로.
- 실행(Claude): `V5_LIVE_CHECK_SET=XS*5,XA*3,K4*3,WQ*3,WR*3`, 폴더 `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/three-cell-v56/`. 17세션, 예상 $0.35, 상한 $0.6.
- 기대: XS ADDED(분해 효소)로 수렴·M4가 합성 효소 지점을 짚음, XA ADDED 유지, K4 BLANK_FILLED·SUPPORTED 유지, WQ WEAKER READING 오류 유지, WR REVERSED READING 오류 유지.

## 4차: 오답 READING 오류의 판정 서버 정규화 (사용자 승인 2026-10-28 "승인")

v5.6에서 sol이 오답 선택에 READING 오류를 적고 contentAssessment를 INSUFFICIENT로 두는 형식 위반이 늘었다(WQ·WR 판정 시도 v5.3-b 1/8 → v5.6 5/7). 지시문상 이 조합의 판정은 항상 ERROR다(선지 읽기 오류 절, `feedback.ts` 378행 계약).

- `packages/pipeline/src/problem-solving/feedback-claims.ts` `normalizeCells`: 기존 "정답 선택의 READING 오류 제거" 바로 뒤에 대칭 규칙을 더한다. 조건: `!options.correctChoice` && `reconstructability === 'RECONSTRUCTABLE'` && errors에 READING이 있음 && `contentAssessment !== 'ERROR'`. 동작: `contentAssessment = 'ERROR'`, `insufficiencyKind = 'NONE'`, note `contentAssessment set to ERROR: READING error on a wrong choice`. 다른 필드는 바꾸지 않는다.
- 테스트(`feedback.test.ts` 또는 claims 테스트가 있는 곳): 오답+READING+INSUFFICIENT → ERROR·NONE, 정답 선택·UNKNOWN·READING 없음은 그대로, 이미 ERROR면 note 없음.
- 저장 출력 재검증(외부 호출 없음): `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/three-cell-v56/`의 WQ-r2·WQ-r3·WR-r1·WR-r2 형식 위반 시도 5건과 `three-cell/`(v5.4) WQ-r3 시도들, `docs/experiments/v53-three-cell-check-2026-10-27-b/` WQ-r3 실패 시도를 현재 코드의 정규화→`settleConclusion`→`validateClaims`→`validateFeedbackAssessment` 경로에 다시 넣어 통과하는지 확인한다. 세션은 각 폴더 `cases/<id>.json` 첫 SELECT 명령과 `sources.json`으로 외부 호출 없이 재구성한다(본보기: `scripts/run-end-explanation-layout-v1.mjs`의 세션 재구성, `scripts/run-v5-live-check.mjs`의 `restore`). 스크립트는 `scripts/replay-reading-error-normalization.mjs`. 결과를 `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/REPLAY-normalization.json`에 시도별(폴더, 사례, 시도 번호, 이전 오류, 지금 결과, 정규화 note)로 쓴다.
- 완료 조건: 빌드, `npm test`(기존 실패 2건만), 재검증 전 건 통과 또는 실패 사유 보고. 실패 사유가 이 정규화와 무관한 다른 계약이면 그대로 보고(고치지 않는다).

### 4차 결과 (2026-10-28)

- `normalizeCells`에 오답+RECONSTRUCTABLE+READING 오류+`contentAssessment !== 'ERROR'` → `ERROR`/`NONE` 규칙 추가(`feedback-claims.ts`). 단위 테스트 3건 추가(`feedback.test.ts` "8. READING error on a wrong choice").
- `scripts/replay-reading-error-normalization.mjs`: 저장된 rawOutput을 replay transport로 `OpenAIFeedbackEvaluator`에 실제 경로대로 통과시킴(외부 호출 0). 형식 위반 시도 9건(v5.6 5, v5.4 3, v5.3-b 1) 전부 통과. 결과는 `docs/experiments/judge-reading-paraphrase-d1-2026-10-28/REPLAY-normalization.json`.
- `npm test`: 기존 실패(boundary.test.ts, axis-architecture-experiment.test.ts)만 남음.

## 회귀 결과 (Claude 실행)

`docs/experiments/v5-diverse-48-regression-2026-10-28-v56/`: 18세션, 역할별 결과 8/8 v5.3과 같음, G-B3만 `RESELECTION_WRONG`(v5.1 경로), 형식 재시도 5(모두 통과), $0.970.
