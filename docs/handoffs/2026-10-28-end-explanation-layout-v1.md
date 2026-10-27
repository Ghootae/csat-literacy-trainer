# 인계: 마지막 설명(M4) 칸 유형 레이아웃 v1 — 구현과 12건 재생성 준비

- 날짜: 2026-10-28
- 작성: Claude(코드 에이전트)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0182-problem-feedback-v53-three-cell-adopted.md`(v5.3 운영 후보), `D-0117`(칸 구조), `D-0127`(첫 문장 코드 고정), `D-0168`(기존 자료 재활용)
- 설계 원문: `docs/experiments/end-explanation-layout-2026-10-28/PROMPT-DRAFT.md`(사용자 승인 2026-10-28: "두 안에 모두 동의. 실행 승인.")

## 목표

1. M4(END_EXPLANATION)에 새 지시문 `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS`(정답·오답 공통 한 벌)와 새 입력 칸 `sections`를 더한다. 문장은 설계 원문 2절 코드 블록을 **글자 그대로** 쓴다.
2. 기본 동작은 바꾸지 않는다. 지금 지시문(`CORRECT_END_INSTRUCTIONS`·`INCORRECT_END_INSTRUCTIONS`)과 지금 입력이 기본값이고, 새 판은 선택 인자로만 켠다.
3. 저장된 세션 12건의 M4만 새 판으로 다시 생성하는 실행기를 만든다. 이번 인계에서는 **dry-run까지만** 한다.

## 범위 밖

- 판정 지시문(M1·M2·M3), 판정 스키마, 상태 기계 전이, 서버 화면 문장(`feedbackSectionLead`·`feedbackSectionClosing`·안내 문장).
- 개발자 서버 기본값 변경, 화면 연결. 채택은 사용자 판정 뒤 별도 결정이다.
- 실제 API 호출. `.env` 읽기는 실행기가 `--env-file-if-exists`로만 하며, 이번에는 dry-run만 돌린다.
- git 쓰기 명령.

## 손댈 파일과 계약

### `packages/pipeline/src/problem-solving/feedback-end-explanation.ts`

- `export const END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS` = 설계 원문 2절 코드 블록 전문.
- `feedbackEndExplanationContent(s, options?: { layout?: 'v5.3' | 'layout-v1' })`. 기본 `'v5.3'`은 지금 출력과 바이트 단위로 같아야 한다.
- `'layout-v1'`일 때 payload:
  - `insufficiencyKind`·`insufficiencyCase`를 넣지 않는다(키 자체를 뺀다).
  - `sections: { firstChoice: Section, reselection: Section | null }`를 더한다(재선택이 없으면 null). 나머지 키는 지금과 같다.
  - `Section = { type, correctChoice, conclusionOnly, repair, diagnosis, judgmentNote }`. 그 선택의 SELECTION assessment는 지금 `selectionAssessmentOf`로 찾는다.
    - `correctChoice`: 그 선택의 choiceId === answerChoiceId.
    - `type`:
      - assessment가 없거나(근거 미제출 등) `reconstructability !== 'RECONSTRUCTABLE'` → `'UNVERIFIABLE'`.
      - 그 선택에 속한 오류가 하나라도 있으면 → `'ERROR'`. 첫 선택은 `s.errors`(+`s.additionalErrors`), 두 번째 선택은 그 assessment의 `errors`(+선택 불일치). 판단이 모호하면 멈추고 보고한다.
      - 오답 선택인데 재구성 가능하고 오류가 없으면 → `'UNVERIFIABLE'`(상태 기계가 이 경우 `RATIONALE_UNVERIFIABLE`로 끝내므로 같게 맞춘다, `feedback.ts` `unknown()`).
      - 정답 선택, 오류 없음, `contentAssessment !== 'SUPPORTED'` → `'GAP'`.
    - `conclusionOnly`: assessment의 `ground?.kind === 'CONCLUSION_RESTATED'`. 칸이 없으면 false.
    - `repair`: 그 선택에서 교정 질문을 했으면(그 선택의 오류 중 `asked`가 있으면) 마지막 REPAIR assessment로 그 선택의 오류가 모두 REPAIRED이면 `'REPAIRED'`, 아니면 `'NOT_REPAIRED'`. 질문이 없었으면 `'NOT_ASKED'`.
    - `diagnosis`: assessment의 `reason`(없으면 null). `judgmentNote`: `judgment?.contradiction`(없거나 빈 문자열이면 null).
  - 세 칸(`choiceReading`·`ground`·`judgment`)이 세션에 저장되지 않아 `reason`·`ground`·`judgment`를 얻을 수 없으면 멈추고 보고한다. 저장 위치는 D-0182 구현(`feedback-claims.ts` `readingSummary`, `normalizeCells`)을 먼저 확인한다.

### 보완(2026-10-28, 1차 실행 중단 보고 반영): `readingSummary`에 두 칸 추가

세션에는 세 칸이 저장되지 않고 `readingSummary`만 남는다. 원 인계(2026-10-27 K4 재설계 249행)도 "마지막 설명에 필요한 요약은 남긴다"였으므로 요약에 두 칸을 더한다.

- `feedback.ts` 스키마의 `readingSummary`에 `conclusionOnly: boolean`(optional)과 `judgmentNote: string | null`(optional)을 더한다. 옛 기록은 그대로 통과해야 한다.
- `feedback-claims.ts` `readingSummary()`: `conclusionOnly = ground?.kind === 'CONCLUSION_RESTATED'`, `judgmentNote = judgment?.contradiction`(빈 문자열이면 null). `readingJudgment`가 null인 경우(오답 선택, 방향 불일치 등)에도 두 칸은 채운다. 기존 `insufficiencyCase`·`readings` 값은 바꾸지 않는다.
- `sections`의 `conclusionOnly`·`judgmentNote`는 이 두 칸에서 읽는다. 칸이 없으면(옛 기록) false·null.
- 실행기는 12건 **모두**(회귀 폴더 4건 포함) 저장된 M1·M3 원출력을 현재 코드의 상태 기계에 외부 호출 없이 다시 적용해 세션을 만든다. 그래야 새 칸이 채워진다. 기본값 payload 대조는 그대로 한다(새 칸은 기본값 payload에 들어가지 않으므로 대조에 영향이 없어야 한다).

### `packages/pipeline/src/problem-solving/feedback-evaluator.ts`

- M4 요청에 같은 선택 인자를 통과시킨다. `'layout-v1'`이면 정답·오답 모두 `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS`를 쓴다. 기본값은 지금과 같다. 출력 스키마와 `applyFeedbackEndExplanation` 검증은 그대로다.

### 테스트 `packages/pipeline/src/problem-solving/feedback.test.ts`(또는 같은 폴더의 end-explanation 테스트)

- 기본값 payload가 지금과 같음(기존 테스트 통과로 확인).
- `'layout-v1'`: GAP(정답·INSUFFICIENT·CONCLUSION_RESTATED → `conclusionOnly: true`), UNVERIFIABLE(정답 UNKNOWN), ERROR+REPAIRED, ERROR+NOT_REPAIRED, 두 선택(재선택 칸 채워짐) 다섯 경우의 `sections`와 `insufficiency*` 키 없음.
- 지시문 상수가 설계 원문 코드 블록과 같음(파일에서 읽어 비교하거나 문자열 일부 대조).

### 실행기 `scripts/run-end-explanation-layout-v1.mjs` (+ `.test.mjs`)

본보기: `scripts/run-end-explanation-choice-link-compare.mjs`(저장 세션의 M4만 재생성, 비용 상한, dry-run). 같은 구조·옵션 이름을 따른다.

- 대상 12건(고정 목록):
  - 정답 9건(luna `gpt-6-luna`): `docs/experiments/v53-three-cell-check-2026-10-27-b/`의 KC-r1, QP-r1, QP-r2, XA-r1, XS-r1, K4-r3, K4-r1, KF-r1 + `docs/experiments/v5-diverse-48-regression-2026-10-27-v53-b/`의 C-CT(판단 방식 근거).
  - 오답 3건(sol `gpt-6.1-sol`): 회귀 폴더의 D-A3(교정 실패, 오류 2개 중 1개 고침), S-A1(교정 실패, 추정 오류), C-B3(다시 고른 것도 오답, 두 선택).
- 세션 얻기:
  - 회귀 폴더: `cases/<id>.records.jsonl`에서 M4 직전 세션(`pendingEnd`가 있고 `phase`가 `AWAITING_END_START` 또는 `AWAITING_EVALUATION`+`END_EXPLANATION`)을 쓴다.
  - -b 폴더: `cases/<id>.json`에는 세션 전체가 없다. 같은 사례의 저장된 M1 원출력(`steps[].evaluations[].call.rawOutput`)을 외부 호출 없이 상태 기계에 다시 적용해 세션을 만든다(문항 원자료는 그 폴더 `sources.json`/`FROZEN.json`). **검증**: 재구성한 세션으로 만든 기본값(`'v5.3'`) M4 payload가 같은 폴더 `requests/<id>-*.request.json`의 END_EXPLANATION 요청 입력과 같아야 한다. 다르면 멈추고 보고한다.
  - 회귀 폴더도 같은 검증을 한다(그 폴더 `requests/`의 저장 요청과 대조).
- 요청: 모델·`reasoning`·`max_output_tokens`는 저장된 END_EXPLANATION 요청과 같게, 지시문과 payload만 새 판.
- 출력 폴더 `docs/experiments/end-explanation-layout-2026-10-28/`: `requests/`, `responses/`, `ledger.jsonl`, `RESULTS.json`, `END-EXPLANATIONS.md`(사례마다 학생 근거, 칸 유형, 기존 firstChoice·reselection·answer와 새 판을 나란히. 기존 문장은 저장 응답에서 가져온다).
- 새 판 출력에도 `applyFeedbackEndExplanation`을 시험 적용해 검증 실패면 저장 요청과 같은 방식으로 재시도(최대 2회)하고 실패를 기록한다.
- 비용 상한: 요청 최대 20(재시도 포함), sol $1, luna $0.2. `--dry-run`은 외부 호출 없이 payload·요청 파일만 쓰고 건수·예상 비용을 출력한다.

## 완료 조건

- [ ] `npm run build` 통과(실행기가 `packages/pipeline/dist`를 읽으므로).
- [ ] `npm test` 전체: 새 테스트 통과, 기존 실패는 이번 변경과 무관한 것만(현재 알려진 기존 실패 2건: `boundary.test.ts`의 `node:fs`, `axis-architecture-experiment.test.ts`의 `.omc/adhoc`).
- [ ] `node scripts/run-end-explanation-layout-v1.mjs --dry-run --out docs/experiments/end-explanation-layout-2026-10-28`: 12건 요청 생성, 기본값 payload 대조 12/12 일치, 예상 비용 출력.
- [ ] dry-run 요청 1건(KC-r1)의 `sections` 값을 보고에 붙인다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면(위 "멈추고 보고" 표시 포함) 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 실제 API 호출은 하지 않는다. dry-run 뒤 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/{feedback.ts, feedback-claims.ts, feedback-end-explanation.ts, feedback-evaluator.ts, feedback.test.ts}`, `scripts/run-end-explanation-layout-v1.mjs`, `scripts/run-end-explanation-layout-v1.test.mjs`, dry-run 산출물 `docs/experiments/end-explanation-layout-2026-10-28/{requests/, RUN.json}`.
- 테스트 결과: `npm run build` 통과. `npm test` 1446 통과, 2 실패(알려진 기존 실패: `boundary.test.ts`의 `node:fs`, `axis-architecture-experiment.test.ts`의 `.omc/adhoc`). 실행기 테스트 `node --test scripts/run-end-explanation-layout-v1.test.mjs` 8/8 통과.
- dry-run 결과(건수·대조·예상 비용): 12건 요청 생성, 기본값 payload 대조 12/12 일치, 외부 호출 0. 예상 비용(상한 추정) luna 9건 $0.051(상한 $0.2), sol 3건 $0.353(상한 $1), 합계 $0.403.
- 남은 문제: (1) 두 번째 선택의 ERROR 판정은 `assessment.errors` 또는 선택 불일치(MISMATCH)로 했다. (2) `repair`는 교정 질문이 있었는데 REPAIR assessment가 아직 없으면 NOT_ASKED로 둔다. (3) 정답 선택·오류 없음·SUPPORTED인데 종료 설명이 요청되면 `SECTION_TYPE_AMBIGUOUS`로 던진다(12건에서는 발생 안 함).
