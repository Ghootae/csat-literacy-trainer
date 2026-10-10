# 인계: v5 원문 대입 확인 시험 — 공손룡 12번 준비

- 날짜: 2026-10-07
- 작성: Claude
- 실행: Codex
- 관련 결정·설계: `docs/review/v5-substitution-check-design-2026-10-07.md`(사용자 승인 2026-10-07), `memory/decisions/D-0093-v5-composition-auto-gloss-pipeline.md`, `memory/decisions/D-0092-claude-codex-work-division.md`
- 바탕 구현: `docs/handoffs/2026-10-07-v5-marker-judgment-gongsun.md`, `scripts/lib/v5-marker-judgment.mjs`, `scripts/test-v5-marker-judgment-gongsun.mjs`

## 목표

설계안의 두 조건(`methods`, `methods_subst`) × 응답 11개 × 3반복 = 66칸 실험 스크립트를 준비한다.
- `prepare`가 API 호출 없이 동결 파일을 만들고 두 번 실행해도 같다.
- 가짜 전송으로 `run` 경로 전체(대입 계약 위반 시 재시도, 원장 재개)가 동작한다.
- **이번 작업에서 OpenAI API 호출은 0회다.**

## 범위 밖

- 실제 run, 외부 API 호출(`.env` 사용 금지).
- `packages/**`, 기존 `scripts/**`(새 파일만), 기존 `docs/experiments/*`(새 폴더만), `memory/` 수정. 커밋.
- 기존 `scripts/lib/v5-marker-judgment.mjs`는 import해서 쓰기만 한다(수정 금지).

## 손댈 파일과 계약

### 새 파일

- `scripts/lib/v5-substitution-check.mjs`(순수 함수), `scripts/lib/v5-substitution-check.test.mjs`
- `scripts/test-v5-substitution-check-gongsun.mjs`(`prepare | run`)
- `docs/experiments/v5-substitution-check-gongsun-2026-10-07/`(FROZEN.json, prompts.json, source.json, cases.json)

### 1. 2단계와 같은 것

원자료 조립, 운영 평가기 사용 방식(transport 래퍼로 ASSESSMENT 지시·스키마만 교체, CONCLUSION_AUDIT·COACHING 무변경), 선택 C4, SELECTION 한 번,
평가기 설정(gpt-5.6-terra, maxOutputTokens 8000, maxRetries 1, timeout 90000), 원장(START/END/TRANSPORT_ERROR, START만 있으면 run 시작 안 함), 칸 파일 재개,
비용식·단가, 칸 기록 항목은 `scripts/test-v5-marker-judgment-gongsun.mjs`와 같게 한다. 해석본은 쓰지 않는다(markerGloss 없음).

### 2. 조건

- `methods`: v5 파일 + `\n\n` + CLAIM_BLOCK + `\n\n` + QUOTE_BLOCK(`v5-marker-judgment.mjs`의 상수 그대로). 스키마는 2단계 `extendedSelectionSchema`. 주장 계약은 2단계 `validateClaims`.
- `methods_subst`: `methods` 지시 + `\n\n` + SUBST_BLOCK(아래 문구 그대로). 스키마는 2단계 확장 스키마에서 studentClaims 항목에 `substitution`을 추가(필수 키, 값은 아래 객체 또는 null). 주장 계약은 `validateClaims` + 대입 계약(4절).

### 3. SUBST_BLOCK(문구 그대로)

```
## 기호 대상 주장의 원문 대입 확인
studentClaims 가운데 학생이 원문에 표시된 기호가 무엇을 가리키는지 말한 주장에는, sourceCheck를 정하기 전에 substitution을 기록한다. 그 밖의 주장은 substitution을 null로 둔다.
- substitutedText: 그 기호가 붙은 원문 문장을 그대로 옮기고, 기호가 표시한 표현 바로 뒤에 학생 표현을 괄호로 넣은 문장. 괄호 안에는 학생 발화의 해당 부분을 그대로 넣는다. 학생이 쓰지 않은 한정·강조(만, 오직, 모든, 전부 등)를 덧붙이거나 학생이 쓴 것을 빼지 않는다.
- markedTextCheck: 학생 표현이 기호가 표시한 원문 표현이 직접 정하는 내용(속성·조건)과 충돌하지 않는가.
- contextCheck: 대입한 문장이 그 문장 안에서뿐 아니라 앞뒤 발화·문단의 흐름과 함께 성립하는가.
- distinctionCheck: 학생 표현으로 읽어도 선택한 선지가 따지는 대상 사이의 구별이 유지되는가.
- 각 확인은 result(PASS, FAIL, UNCLEAR)와 근거(basis)를 가진다.
판정 규칙:
- 셋 중 하나라도 FAIL이면 sourceCheck는 CONTRADICTED다. FAIL은 원문에서 이유가 분명할 때만 쓴다.
- FAIL이 없고 UNCLEAR가 하나라도 있으면 UNDETERMINED다. 이때 그 주장을 내용 오류로 만들지 않는다.
- 모두 PASS이면 CONSISTENT다. 학생 표현이 원문·해설의 설명과 표현이나 층위(이름이 일반적으로 정하는 뜻과 이 자리에서 가리키는 대상)가 달라도, 세 확인을 통과하면 오류로 보지 않는다.
```

substitution 스키마(strict, additionalProperties false):
```
substitution: null | { substitutedText: string,
  markedTextCheck: { result: PASS|FAIL|UNCLEAR, basis: string },
  contextCheck:    { result: PASS|FAIL|UNCLEAR, basis: string },
  distinctionCheck:{ result: PASS|FAIL|UNCLEAR, basis: string } }
```

### 4. 대입 계약(`methods_subst`에서 `validateClaims` 다음에 적용, 위반은 `CLAIMS_CONTRACT: <사유>`로 던져 운영 재시도 1회)

검증 연결(Codex 보고 반영, 2026-10-07): 기존 `validateClaims`는 주장 키가 정확히 5개여야 하므로, 새 래퍼에서 각 주장의 `substitution`을 뺀 복사본으로
`validateClaims`를 호출하고, 원본 주장에는 아래 대입 계약을 검사한다. 기존 파일은 수정하지 않는다. 모든 주장에 `substitution` 키가 있는지(값은 객체 또는 null)도 래퍼가 검사한다.

substitution이 null이 아닌 주장마다:
1. 판정 규칙 일치: 세 result 중 FAIL이 있으면 sourceCheck=CONTRADICTED, FAIL 없이 UNCLEAR가 있으면 UNDETERMINED, 모두 PASS면 CONSISTENT.
2. 괄호 충실도: substitutedText의 괄호 구간들 가운데 다음을 모두 만족하는 구간 s가 하나 이상 있다.
   (a) s(앞뒤 공백 제거)가 그 주장 quote의 부분 문자열이다(공백 정규화).
   (b) substitutedText에서 그 "(s)"를 지운 문자열이 원문 `scenario` 또는 `passage`의 연속 부분 문자열이다(공백 정규화, ‘’“”'" 따옴표 문자 제거 후 비교).
   만족하는 구간이 없으면 위반(`SUBSTITUTION_NOT_FAITHFUL`).
기록: 칸마다 첫 시도의 대입 계약 위반 사유, 최종 studentClaims의 substitution 전체, 결과 분포.

### 5. 응답과 기대값(cases.json, 모델에 보내지 않음)

S1~S8: `docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json`의 responses. 대조 응답:
- X1: `d는 갑이 들고 있는 옷이고, e는 빨간 옷이라 서로 다른 대상이니 4번은 틀렸어요.`
- X2: `d는 옷장 안에 있는 옷만 가리키고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.`
- X3: `d는 옷장에 있는 빨간 옷이고, e는 빨간 옷이라 다른 대상이니 4번은 틀렸어요.`

| 응답 | 허용 contentAssessment | 오류 단위 |
|---|---|---|
| S1, S4, S5, S6, S8 | SUPPORTED | 없음 |
| S2 | ERROR | ⓓ 대응, ⓔ 대응 |
| S3 | ERROR | ⓔ 대응 |
| S7, X3 | ERROR | ⓓ 대응 |
| X1 | SUPPORTED(우선), ERROR | ERROR일 때 ⓓ 대응 |
| X2 | SUPPORTED, ERROR | ERROR일 때 ⓓ 대응 |

모두 reconstructability RECONSTRUCTABLE, rationaleImpliedVerdict INVALID를 기대. SUPPORTED면 COMPLETED/VERIFIED_CORRECT, ERROR면 AWAITING_CORRECTION.
X1·X2는 `boundary: true`로 표시해 결과 요약에서 따로 집계한다.

### 6. 일정·예산

66칸, 반복마다 응답 순서 회전, 같은 응답 안 조건 순서 교대(2단계 `makeSchedule`과 같은 방식을 두 조건·11응답에 맞춰). 요청 상한 150, 추정 비용 상한 2.5달러.

### 7. 결과 요약(RESULTS.json)

조건별·응답별 기대 일치(경계 응답 별도), 주장·대입 계약 실패와 재시도 수, `methods_subst`의 세 확인 결과 분포(응답별),
X2의 ⓓ 주장 substitutedText 괄호에 "만"이 들어 있는 비율, S5의 ⓓ 주장 substitutedText 괄호에 "만"·"오직"이 들어 있는 비율(0이어야 함 — 계약상 불가능하지만 기록),
요청 수·추정 비용·stop. "의미 판정은 별도 검토하며 자동 비교를 의미 통과로 집계하지 않는다"는 문장.

### 8. 자체 점검(prepare)

- SUBST_BLOCK에 문항 내용(`빨간|옷|공손룡|묵가|명실|흰 말`)이 없다.
- `methods_subst` 지시 = `methods` 지시 + `\n\n` + SUBST_BLOCK(정확히). `methods` 지시는 2단계 `instructionsFor(v5, 'v5_methods')`와 같다.
- 대입 계약이 위반 예를 거부하고 정상 예를 통과시킨다: 괄호에 학생이 쓰지 않은 "만"이 들어간 예, 괄호를 지운 문장이 원문에 없는 예, FAIL인데 CONSISTENT인 예, UNCLEAR인데 CONTRADICTED인 예 → 거부. 정상 예: `ⓓ옷(옷장에 있는 옷)이 정말 없다는 게 아니라, ⓔ빨간 옷이 필요한데 없다는 말이었어.`(원문 대사 안쪽, 따옴표 제외) + 세 PASS + CONSISTENT → 통과.
- 같은 칸 위치에서 두 조건의 운영 입력(feedbackRequestContent)이 같다.

## 완료 조건

- [ ] `node --test scripts/lib/v5-substitution-check.test.mjs` 통과(자체 점검 항목 포함), `node --test scripts/lib/*.test.mjs` 전체 통과.
- [ ] `OPENAI_API_KEY= node scripts/test-v5-substitution-check-gongsun.mjs prepare` 두 번 통과(같은 FROZEN).
- [ ] 가짜 전송 run: 스키마에 맞는 가짜 출력(subst 조건은 substitution 포함), 한 칸은 첫 응답에 대입 계약 위반(괄호에 "만" 추가)을 넣어 재시도 후 통과 확인, 두 번째 run 새 요청 0. 임시 파일 삭제.
- [ ] `packages/**`, 기존 `scripts/**`, 기존 `docs/experiments/*`, `memory/`에 이번 작업으로 생긴 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
  예: 원문 대사가 따옴표로 둘러싸여 괄호 충실도 (b) 비교가 정상 예를 거부하는 경우, strict 스키마가 null|object를 허용하지 않는 경우.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.

## 결과 보고 (실행 후 작성)

- 구현 완료: 2026-10-07, Codex. 4절의 1번 연결 방식대로 `substitution`을 제외한 복사본에 기존 `validateClaims`를 적용하고 원본에는 대입 계약을 검사했다. 기존 라이브러리는 수정하지 않았다.
- 변경 파일(새 파일 7개, 이 인계 문서의 결과 보고 절만 수정):
  - `scripts/lib/v5-substitution-check.mjs`
  - `scripts/lib/v5-substitution-check.test.mjs`
  - `scripts/test-v5-substitution-check-gongsun.mjs`
  - `docs/experiments/v5-substitution-check-gongsun-2026-10-07/FROZEN.json`
  - `docs/experiments/v5-substitution-check-gongsun-2026-10-07/prompts.json`
  - `docs/experiments/v5-substitution-check-gongsun-2026-10-07/source.json`
  - `docs/experiments/v5-substitution-check-gongsun-2026-10-07/cases.json`
- 테스트 결과:
  - `node --test scripts/lib/v5-substitution-check.test.mjs`: **21/21 통과**, 실패 0.
  - `node --test scripts/lib/*.test.mjs`: **129/129 통과**, 실패 0(신규 21개 포함).
  - 자체 점검의 네 거부 예와 정상 예, SUBST_BLOCK 문구 일치, strict nullable 스키마, 복사본 검증·원본 보존, 판정 결과 27조합, 공백·따옴표 정규화, 같은 칸 운영 입력 동일, CONCLUSION_AUDIT·COACHING 보존을 확인했다.
  - 가짜 ERROR 출력의 AWAITING_CORRECTION 전이, 가짜 CONCLUSION_AUDIT 실행, 미종결 원장 차단, 동결 불일치 거부, 요청·비용 상한, TRANSPORT_ERROR 보존 및 다음 run 차단도 통과했다.
  - `node scripts/validate-memory.mjs`: 통과(결정 98개, 체크포인트 188개). memory 파일 수정 없음.
- prepare 2회 결과:
  - `OPENAI_API_KEY= node scripts/test-v5-substitution-check-gongsun.mjs prepare`를 연속 2회 실행했다.
  - 두 번 모두 `prepared: true`, `cells: 66`, `selfTests: passed`, `externalRequests: 0`.
  - 두 번의 FROZEN 객체 SHA-256(`frozenHash`): `6b07ae5768d97394af89526eb772aad5a40b45b9e90c51272d9adb54e35946e5`로 동일. 기존 동결 파일 네 개를 바이트 단위로 비교하는 검증도 통과했다.
- 가짜 모델 run 결과(신규 테스트에 재현 가능한 검증 포함):
  - 임시 폴더에서 `main({ mode: 'run', dir, transport })`로 가짜 transport를 주입했다. 가짜 출력은 요청의 확장 스키마로 검사했고, 이 검증 중 네트워크 fetch는 차단했다.
  - 첫 run: **66/66칸 VALID**, 가짜 요청 **67회**, 평가 오류 0, stop null.
  - `methods_subst-S5-r1` 첫 응답 괄호에 학생이 쓰지 않은 “만”을 넣어 `CLAIMS_CONTRACT: SUBSTITUTION_NOT_FAITHFUL`을 발생시켰다. 운영 재시도 1회 뒤 통과했고, 첫 위반 사유·최종 substitution·시도 ERROR/SUCCESS 기록을 확인했다.
  - START 67개·END 67개, 두 번째 run의 **새 요청 0회**, 원장 바이트 불변을 확인했다.
  - 가짜 사용량으로 계산한 추정 비용은 약 USD 0.019028이며 실제 과금이 아니다. 가짜 출력은 경로 검증용으로 SUPPORTED를 반환하므로 의미 정확도나 모든 사례의 기대 라벨 일치를 입증하지 않는다. ERROR 분기와 독립 결론 확인은 별도 가짜 테스트로 검증했다.
  - X2의 ⓓ 대입 “만” 보존 비율 3/3, S5의 ⓓ 대입 “만”·“오직” 추가 비율 0/3을 확인했다. 이는 가짜 출력 집계 검증이다.
  - 가짜 run의 원장·칸 파일·RESULTS.json은 임시 폴더에서만 만들고 테스트 종료 시 삭제했다. 저장소 실험 폴더에는 동결 파일 네 개만 남겼다.
- 변경 범위 확인:
  - 작업 시작 시 `scripts/`, `packages/`, `docs/experiments/`, `memory/`의 기존 파일 7,711개 해시를 기록하고 완료 후 비교했다. 기존 파일 변경·삭제 0개, 새 파일은 위 7개뿐이다(node_modules 제외).
  - 외부 API 호출 0회, 실제 run 미실행, `.env` 읽기·`--env-file` 사용·git add·git commit·git stash 모두 없음.
- 남은 문제:
  - 구현·오프라인 검증의 미해결 실패나 인계 충돌 없음.
  - 실제 모델 결과와 의미 판정은 미검증이며 별도 실행·검토 대상이다. 오류 단위의 의미상 정확성을 자동 비교 통과로 집계하지 않는다. Claude의 인계 문서 대비 diff 검토가 남아 있다.
