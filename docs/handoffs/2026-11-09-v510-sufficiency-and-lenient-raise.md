# 인계: v5.10 판정 규칙 서버 쪽 (참인 선지 충분 검사, LOCATION_ONLY, 관대 문항 올리기)

- 날짜: 2026-11-09
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0214-lenient-items-choice-restatement.md`(본문·추가·추가 2·추가 3), `memory/decisions/D-0213-diagnostic-judgment-split-option-na.md`("추가" 절: v5.10 = v5.9 + 171행), `memory/decisions/D-0189-*.md`(서버는 판정기 결론을 올리지 않음, D-0214가 좁은 예외)
- 지시문: `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.10.md`(이미 작성됨, 손대지 않음)
- 시험 설계: `docs/experiments/v510-judgment-2026-11-09/DESIGN-DRAFT.md`

## 목표

판정기 옵션으로 **v5.10 규칙**을 켤 수 있고, 켜지 않으면(기본) 지금(v5.8) 동작이 바이트 단위로 그대로다. v5.10 규칙을 켜면 다음이 참이다.

1. 참인 선지(정답 선택, `targetVerdict === 'VALID'`)의 충분 검사는 선지 주장 조각 **전부**가 아니라 **지지 대상 조각**만 본다.
2. 근거 칸 `ground`에 `kind: 'LOCATION_ONLY'`와 `locatedSource: string | null`이 있다.
3. 관대 문항에서 선지 전체 되풀이·문장 특정 위치 근거는 서버가 INSUFFICIENT를 SUPPORTED로 올리고, 원래 값과 이유를 기록한다.
4. 진단 runtime 자료의 관대 문항 2개에 관대 표시와 정답 근거 원문 문장이 저장되고, 이 표시는 판정기 입력에 들어가지 않는다.

## 범위 밖

- 지시문 파일(v5.8·v5.9·v5.10) 수정.
- 기본 판정기 설정 바꾸기(진단·lab이 v5.10을 쓰게 하는 것). 기본은 v5.8 규칙 그대로다. 전환은 시험 뒤 따로 결정한다.
- 시험 실행 스크립트(T·K·R·H·L 묶음). 다음 작업으로 따로 한다.
- 붙여 넣기 글자 겹침 기록(D-0214 3번). 이번에 하지 않는다.
- 마지막 설명 지시문(`feedback-end-explanation.ts`)의 문구.
- 외부 API 호출.

## 손댈 파일과 계약

### 1. 규칙 옵션

- `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: 생성자 옵션에 `judgmentRules?: 'v5.8' | 'v5.10'`(기본 `'v5.8'`)을 더한다. 이 값을 SELECTION 스키마 생성(`extendedSelectionSchema`)과 `normalizeCells`·`settleConclusion`·`validateClaims`·`readingSummary`에 넘기는 `ClaimsOptions`에 싣는다(`ClaimsOptions.rules`). 관대 정보(아래 4)도 `ClaimsOptions.lenient`로 싣는다.
- 기본값 `'v5.8'`에서는 스키마·정규화·검증·결론이 지금과 같아야 한다(기존 테스트 전부 그대로 통과).

### 2. 스키마 (`packages/pipeline/src/problem-solving/feedback-claims.ts` `extendedSelectionSchema`)

- `rules === 'v5.10'`일 때만: `ground.kind` enum에 `LOCATION_ONLY`를 더하고, `ground`에 `locatedSource: { anyOf: [{type:'string'}, {type:'null'}] }`를 더한다(strict, required).
- `'v5.8'`이면 지금 스키마 그대로.

### 3. 정규화·검증

- `normalizeCells`(v5.10): `ground.kind !== 'LOCATION_ONLY'`인데 `locatedSource`가 null이 아니면 null로 바꾸고 notes에 한 줄 남긴다.
- `validateClaims`(v5.10): `LOCATION_ONLY`이고 `locatedSource`가 null이 아니면, 공백 정규화(`normalize`) 뒤 원문(`source.passage`) 또는 보기(`source.scenario`)에 부분 문자열로 있어야 한다. 없으면 `CLAIMS_CONTRACT` 실패(재시도 대상, 기존 실패 처리와 같음). 원문·보기 문자열이 `ClaimsOptions`에 없으면 옵션에 더한다.

### 4. 관대 표시 자료

- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts` `SourceDirectProblemBundleSchema`: 선택 칸 `lenientCorrect?: { supportSentences: string[] }`(1개 이상)를 더한다.
- `feedbackEvaluationInput`(`feedback-evaluator.ts:32`): 판정기에 보내는 source에서 `lenientCorrect`를 뺀다(`stemPolarity`를 빼는 것과 같은 방식). 판정기 입력에 관대 표시가 들어가면 안 된다(D-0214 1번).
- `packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json`: 두 문항에만 더한다. 문장은 원문(`packages/pipeline/fixtures/experiments/sns-diagnostic/passages/*.json`)에 있는 그대로다.
  - `horse-race-reporting-q4`: `["경마식 보도는 선거와 정치에 무관심한 유권자들의 선거 참여, 정치 참여를 독려하는 장점이 있다."]`
  - `audio-perceptual-coding-q15`: `["한 파일 내의 오디오 신호에는 모든 소리 크기에 균일한 개수의 비트가 할당된다."]`
  - 근거: 골드 `docs/experiments/sns-diagnostic-gold-2026-11-05/choice-link/frozen-3runs/*.json` 정답 선지의 `supportIds`(경마 4 ⑤ = P1-5, 오디오 15 ③ = P2-2). 골드 ID는 명제 단위라 문장이 원문과 다르며(P1-5 "…선거 참여를 독려하는 장점이 있다."), 그 명제를 담은 원문 문장을 적었다.
  - runtime 자료를 읽는 코드(`packages/app/src/server/diagnostic/content.ts` 등)가 이 칸을 세션 source로 전달하는지 확인한다. 전달되지 않으면 전달되게 한다.
- 두 문장이 원문에 실제로 있는지 확인하는 테스트를 하나 둔다.

### 5. 충분 검사 (`readingJudgment`, `feedback-claims.ts:282`)

`rules === 'v5.10'`이고 `negative === false`(참인 선지)일 때만 바꾼다. 거짓 선지(`negative`) 쪽과 v5.8은 그대로다.

- `claimsOk`: 지금 `touched.length === claims.length && touched.every(fits)` → **`targets.length > 0 && targets.every(fits) && touched.every(fits)`** (`targets` = `judgment.targetClaimIds`에 든 touched 조각).
- `cellsSupported`의 나머지 조건(`ground.kind === 'FACT'`, fact claims 모두 CONSISTENT, `judgment.holds`)은 그대로.
- `insufficiencyCase`: v5.10 참인 선지에서는 `PARTIAL_SUPPORT`를 만들지 않는다(그 분기를 건너뛰어 다음 분기로). `LOCATION_ONLY`는 `CONCLUSION_RESTATED`와 같게 `'CONCLUSION_ONLY'`, `insufficiencyKind`는 `'JUDGMENT_METHOD'`.
- `readingSummary.conclusionOnly`: v5.10에서는 `CONCLUSION_RESTATED` 또는 `LOCATION_ONLY`이면 true.

### 6. 관대 올리기 (D-0214 4번·추가 2)

`rules === 'v5.10'`이고 `options.lenient`가 있고, 정답 선택·`reconstructability === 'RECONSTRUCTABLE'`·오류 없음(`errors` 빈 배열, 추정 오류 없음)·`judgment.verdict === targetVerdict`일 때, 다음 중 하나면 결론을 SUPPORTED(`insufficiencyKind: 'NONE'`)로 한다.

- (a) 되풀이: `ground.kind === 'CONCLUSION_RESTATED'`이고 선지 주장 조각이 **전부** touched이며 전부 `fits`.
- (b) 위치: `ground.kind === 'LOCATION_ONLY'`이고 `locatedSource`가 null이 아니며, 공백 정규화 뒤 `lenient.supportSentences` 중 하나와 서로 포함 관계(`a.includes(b) || b.includes(a)`).

- 판정기 원래 값이 무엇이든(INSUFFICIENT 포함) 위 조건이면 SUPPORTED다. 이것이 "서버는 판정기 결론을 올리지 않는다"(`feedback-claims.ts:271` 주석, D-0189)의 유일한 예외다. 주석에 D-0214를 적는다.
- notes에 `contentAssessment raised to SUPPORTED: lenient item (D-0214), <RESTATED_WHOLE_CHOICE | LOCATED_SUPPORT_SENTENCE>, model said <원래 값>/<원래 insufficiencyKind>` 한 줄을 남긴다(기존 notes와 같은 경로로 세션 기록에 남는지 확인).
- `validateClaims`의 102–103행 일관성 검사가 올린 결과를 실패로 보지 않게 `readingJudgment`(또는 같은 판단을 쓰는 함수)가 올린 경우를 `supported: true`로 돌려준다. 올리기 판단은 한 함수에만 두고 두 곳에서 쓴다.
- 조건에 하나라도 안 맞으면(관대 아닌 문항, 일부만 되풀이, 문단만 대서 `locatedSource` null, 골드 문장과 다른 문장) 지금 규칙대로다.

## 완료 조건

- [ ] 기본(`'v5.8'`)에서 기존 테스트 전부 통과, 스키마 JSON이 지금과 같음을 확인하는 테스트 1개.
- [ ] v5.10 참인 선지: 지지 대상 조각 1개만 EXACT·나머지 UNTOUCHED·FACT·CONSISTENT·holds true → SUPPORTED. 같은 입력을 v5.8로 → INSUFFICIENT(`PARTIAL_SUPPORT`).
- [ ] v5.10 참인 선지: `targetClaimIds` 비었거나 holds false → INSUFFICIENT, case가 `PARTIAL_SUPPORT`가 아님.
- [ ] v5.10 거짓 선지 판정은 v5.8과 같음(기존 거짓 선지 사례 하나를 두 규칙으로 돌려 비교).
- [ ] LOCATION_ONLY: 원문에 없는 `locatedSource` → `CLAIMS_CONTRACT` 실패. LOCATION_ONLY 아닌데 `locatedSource` 있음 → null로 정규화 + note.
- [ ] 관대 올리기: (a) 경마 4 형태의 전체 되풀이 → SUPPORTED + note, (b) `locatedSource`가 골드 문장 → SUPPORTED + note, (b') `locatedSource` null(문단만) → INSUFFICIENT, (b'') 다른 문장(예: 경마 1문단 "경마식 보도는 선거일이 가까워질수록 증가한다.") → INSUFFICIENT, (c) 같은 되풀이를 관대 표시 없는 문항에서 → INSUFFICIENT, (d) 일부만 되풀이(조각 하나 UNTOUCHED) → INSUFFICIENT, (e) 오류가 있으면 올리지 않음.
- [ ] `feedbackEvaluationInput` 결과에 `lenientCorrect`가 없음.
- [ ] runtime 자료의 두 문장이 각 지문 원문에 있음(테스트).
- [ ] 테스트: `npx vitest run packages/pipeline packages/app` 통과. `packages/app` `boundary.test.ts` "다른 서버 파일은 node:fs를 import 하지 않는다" 실패 1건은 이전부터 있던 것(`server/student-state.ts`)이라 그대로 두고 보고만 한다.
- [ ] `npm run typecheck` 통과.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 기본(v5.8) 동작이 하나라도 바뀌어야 구현이 되는 상황이면 멈추고 보고한다.
- `settleConclusion`·`readingJudgment` 구조상 "올리기 판단을 한 함수에 두기"가 어렵거나, 기존 notes가 세션 기록에 남지 않으면 멈추고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/pipeline/src/problem-solving/feedback-claims.ts`: `JudgmentRules`, `ClaimsOptions`에 `rules`·`lenient`·`passage`·`scenario` 추가. `extendedSelectionSchema(base, rules)`, `validateCells`(locatedSource 검사), `normalizeCells`(locatedSource null 정규화+note), `readingJudgment`(지지 대상 충분 검사, LOCATION_ONLY, 관대 올리기를 `raised`로 한 곳에서 판단), `settleConclusion`(올리기 note), `readingSummary`(conclusionOnly).
  - `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: 생성자 옵션 `judgmentRules`(기본 v5.8), 스키마·ClaimsOptions에 전달, `feedbackEvaluationInput`에서 `lenientCorrect` 제거.
  - `packages/pipeline/src/problem-solving/feedback-end-explanation.ts`: 종료 설명 입력에서도 `lenientCorrect` 제거(인계 문서 밖의 한 줄. 판정 입력과 같은 이유로 새 칸이 새어 나가지 않게 함. 지시문 문구는 그대로).
  - `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`: 참조 스키마와 묶음 스키마에 선택 칸 `lenientCorrect`.
  - `packages/app/src/server/content.ts`: `loadBundleFromRoot`가 참조의 `lenientCorrect`를 세션 source로 전달(전달되지 않아 추가).
  - `packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json`: 경마 4·오디오 15에 `lenientCorrect`.
  - `packages/pipeline/src/problem-solving/feedback-v510.test.ts`(신규): 14개 테스트.
- 테스트 결과:
  - `npx vitest run packages/pipeline packages/app`: 1654 통과, 2 실패. 실패 1은 `boundary.test.ts`(`server/student-state.ts`, 이전부터 있던 것). 실패 2는 `axis-architecture-experiment.test.ts`가 `.omc/adhoc/...hegel...json`을 못 찾는 ENOENT(이 작업과 무관, 워크트리에 그 로컬 산출물이 없음).
  - `npm run typecheck`: 통과.
  - 기본 v5.8 동작 확인: 기존 `feedback.test.ts` 등 테스트 전부 수정 없이 통과(v5.8 경로는 `rules` 미지정이라 분기 모두 기존 식), 신규 테스트가 기본 스키마 JSON이 `'v5.8'` 지정과 같고 ground에 `LOCATION_ONLY`·`locatedSource`가 없음을 확인, 거짓 선지는 두 규칙 결과 동일, v5.8은 관대 표시가 있어도 올리지 않음.
- 남은 문제:
  - 모델이 이미 INSUFFICIENT여도 v5.10 참인 선지 충분 검사는 기존 "서버는 올리지 않음" 때문에 INSUFFICIENT로 남는다(올리기는 관대 문항 (a)(b)만). 설계대로.
  - `judgmentRules`는 아직 어디서도 켜지 않음(범위 밖). 켤 때 `promptPath`·`promptVersion`도 함께 v5.10으로 맞춰야 한다.
