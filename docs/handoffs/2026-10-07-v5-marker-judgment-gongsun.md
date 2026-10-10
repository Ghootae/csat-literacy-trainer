# 인계: v5 판정 비교(2단계) — 공손룡 12번 세 조건 실험 준비

- 날짜: 2026-10-07
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0093-v5-composition-auto-gloss-pipeline.md`(후속 결정 절 포함), `memory/decisions/D-0090-problem-evaluator-v5-naming.md`, `memory/decisions/D-0092-claude-codex-work-division.md`, `memory/decisions/D-0085-relation-only-rationale-sufficient.md`
- 설계: `docs/review/v5-marker-port-design-2026-10-07.md`

## 목표

v5(파일 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md`)에서
v3 판정 방법(학생 주장 분리, 인용 형식 규칙)과 자동 해석본의 효과를 공손룡 12번 S1~S8 최초 선택 판정으로 비교하는 실험 스크립트를 준비한다.

이 작업이 끝나면:
- `scripts/test-v5-marker-judgment-gongsun.mjs`의 `prepare`가 API 호출 없이 동결 파일을 만들고 두 번 실행해도 같다.
- 가짜 전송(네트워크 없음)으로 `run` 경로 전체(세 조건, 주장 계약 위반 시 재시도, 원장 재개)가 동작함을 확인했다.
- **이번 작업에서 OpenAI API 호출은 0회다.**

## 범위 밖

- 실제 `run` 실행과 모든 외부 API 호출(`.env` 사용 금지).
- `packages/**` 수정 금지(판정기·스키마·서버·프롬프트 파일 포함). `packages/pipeline/dist`를 다시 빌드하지 않는다(현재 dist를 그대로 import하고 해시를 동결).
- 기존 `docs/experiments/*` 수정 금지(새 폴더만). 기존 `scripts/**` 수정 금지(새 파일만).
- REPAIR(교정 답) 경로, 재선택, 다른 문항.
- `memory/` 수정, 커밋.

## 손댈 파일과 계약

### 새 파일

- `scripts/lib/v5-marker-judgment.mjs`: 순수 함수(파일 입출력·네트워크 없음). 지시문 블록, 확장 스키마, 주장 계약 검사, 해석본 문구 노출 검사.
- `scripts/lib/v5-marker-judgment.test.mjs`: `node:test`.
- `scripts/test-v5-marker-judgment-gongsun.mjs`: `prepare | run`.
- `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/`: prepare 산출물(FROZEN.json, prompts.json, source.json, cases.json, glosses.json).

### 1. 원자료

v3 실험과 같은 조립을 쓴다(`scripts/test-gongsun-quote-format.mjs` 21~27행과 동일):
`base = docs/experiments/gongsun-interpretation-modes-2026-10-03/source.json`에
`packages/pipeline/fixtures/experiments/problem-solving/public/gongsun-long-later-mohists-q12.json`의 `passage`, `scenario`, `textAnnotations`를 덮어
`SourceDirectProblemBundleSchema.parse`. stem·choices·answerChoiceId·stemPolarity가 fixture·정답 파일과 같은지 확인한다(다르면 중단).

### 2. 응답·조건·일정

- 응답 S1~S8과 선택 `C4`: `docs/experiments/gongsun-auto-gloss-formats-2026-10-07/FROZEN.json`의 `responses`, `choiceId`를 그대로 쓴다.
- 조건(arm):
  - `v5`: v5 파일 그대로. 출력 스키마는 운영 그대로.
  - `v5_methods`: v5 파일 + `\n\n` + CLAIM_BLOCK + `\n\n` + QUOTE_BLOCK. 출력 스키마는 확장 스키마(3절).
  - `v5_methods_gloss`: v5_methods 지시 + `\n\n` + GLOSS_BLOCK. 입력에 `markerGloss` 추가(4절).
- 반복 r=1,2,3. 해석본은 반복 r에 `docs/experiments/marker-gloss-pipeline-v2-gongsun-2026-10-07/pipeline-run{r}.json`의 `judgePayload`를 고치지 않고 쓴다.
  prepare에서 각 run 파일의 `gloss.sourceBinding.sha256`이 1절 원자료의 `sourceBindingSha256`과 같은지 확인한다(다르면 중단). `glosses.json`에 r별 judgePayload와 그 해시를 저장한다.
- 일정: 8응답 × 3조건 × 3반복 = 72칸. 반복마다 응답 순서를 회전하고, 같은 응답 안 조건 순서는 반복·응답에 따라 돌린다(무작위 아님, v3 실험과 같은 방식).
- 각 칸: `createFeedbackSession(label, source)` → `submitFeedbackCommand(..., { type: 'SELECT', choiceId: 'C4', rationale: { mode: 'PROVIDED', text } }, 'o1')` → 운영 `OpenAIFeedbackEvaluator`로 평가 → `applyFeedbackAssessment`. SELECTION 한 번만 하고 끝낸다.
- 평가기 설정: `gpt-5.6-terra`, maxOutputTokens 8000, maxRetries 1, timeout 90000. 운영 평가기의 재시도·학생 결론 독립 확인(CONCLUSION_AUDIT)·코칭 재생성은 그대로 둔다.

### 3. 확장 스키마와 주장 계약(v5_methods, v5_methods_gloss)

전송 래퍼(transport, `scripts/test-problem-v3-based-v4-smoke.mjs`의 방식)로 운영 평가기를 그대로 쓴다.

- ASSESSMENT 요청(`text.format.name === 'problem_feedback_v4_assessment'`):
  - `request.instructions`가 운영 v4 지시 파일(`packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4.md`) 내용과 같은지 확인하고(다르면 RUN_LIMIT 오류로 중단), 조건의 지시로 바꾼다.
  - 요청 스키마가 SELECTION이면(현재 세션은 항상 SELECTION) methods 조건에서는 스키마를 확장 스키마로 바꾼다:
    운영 `FeedbackSelectionAssessmentSchema`의 JSON Schema에 `studentClaims`를 required 속성으로 추가.
    `studentClaims: [{ observationId, quote, claimAsStated, sourceCheck: CONSISTENT|CONTRADICTED|UNDETERMINED, sourceBasis }]`(모두 문자열, strict, additionalProperties false).
  - 응답을 받으면 원장 END를 먼저 기록한 뒤, methods 조건에서는 output_text JSON에서 `studentClaims`를 떼어 칸 기록에 저장하고, 나머지로 output_text를 바꿔 운영 평가기에 돌려준다(운영 검증기는 원래 스키마로 그대로 검사한다).
  - 주장 계약 검사(어기면 transport에서 `CLAIMS_CONTRACT: <사유>` 오류를 던진다. 운영 평가기는 이를 재시도 가능 오류로 보고 한 번 다시 요청한다):
    - studentClaims가 1개 이상이고, 각 quote가 해당 observationId 학생 발화의 부분 문자열이다(공백 정규화 후 포함).
    - reconstructability가 RECONSTRUCTABLE일 때만: CONTRADICTED 주장마다 studentEvidence 중 그 quote와 겹치는(공백 정규화 후 한쪽이 다른 쪽을 포함) 항목을 가진 오류가 errors에 있다. errors의 각 항목은 겹치는 CONTRADICTED 주장이 하나 이상 있다. CONTRADICTED가 없으면 contentAssessment는 ERROR가 아니다.
- CONCLUSION_AUDIT·COACHING 요청: 지시·스키마·입력을 바꾸지 않는다(해석본을 넣지 않는다).
- v5 조건: ASSESSMENT 지시만 v5 파일로 바꾸고 나머지는 바꾸지 않는다.

### 4. 해석본 입력(v5_methods_gloss)

ASSESSMENT 요청의 첫 `input_text`(JSON 문자열)를 파싱해 최상위에 `markerGloss: <반복 r의 judgePayload>`를 추가하고 다시 직렬화한다.
다른 content 항목과 순서는 바꾸지 않는다. CONCLUSION_AUDIT·COACHING에는 넣지 않는다.

### 5. 지시문 블록(문구 그대로)

CLAIM_BLOCK:
```
## 학생 주장 분리 기록
SELECTION에서 contentAssessment와 errors를 정하기 전에 studentClaims를 기록한다.
- studentClaims: 이번 선택의 학생 발화에서 학생이 명시한 판단을 의미 단위로 나누어 빠짐없이 적는다. 각 항목은 observationId, 해당 학생 발화에서 정확히 복사한 quote, 학생이 말한 대상·관계 방향·조건·대응 순서를 바꾸지 않고 다시 쓴 claimAsStated, 원문 대조 결과 sourceCheck, 그 근거 sourceBasis를 가진다.
- claimAsStated에는 평가자가 원문에서 확인한 해석을 넣지 않는다. 학생이 말한 것을 그대로 옮기며, 원문과 다르더라도 고치지 않는다.
- sourceCheck는 원문과 일치하면 CONSISTENT, 원문과 명시적으로 충돌하면 CONTRADICTED, 원문만으로 판단할 수 없으면 UNDETERMINED다. 각 항목은 독립적으로 판정한다. 다른 항목의 정오나 학생 선택의 정오를 이유로 한 항목의 판정을 바꾸지 않는다.
- 재구성 가능한 근거에서 내용 오류(errors)는 CONTRADICTED 주장에서만 만든다. CONTRADICTED 주장마다 그 quote를 studentEvidence로 가진 오류가 있어야 하고, 각 오류는 CONTRADICTED 주장 하나 이상에 대응한다. CONTRADICTED 주장이 없으면 contentAssessment는 ERROR가 아니다.
- reconstructability가 UNKNOWN인 경우의 처리는 위 SELECTION 규칙을 따른다. 이때도 studentClaims는 기록한다.
```

QUOTE_BLOCK:
```
## 학생 판단 서술 형식
reason, reconstructedPath, errors의 description과 question, selectionMismatchQuestion에서 학생의 판단을 서술할 때는 학생 발화의 해당 부분을 큰따옴표로 정확히 인용해 쓰고, 해석본이나 평가자의 표현으로 바꾸어 쓰지 않는다. coaching에서 학생의 판단을 언급할 때도 같다.
학생 발화와 원문의 관계는 학생 인용과 평가자 판단을 나누어 쓴다. 예: 학생은 "…"라고 했고, 이는 원문의 …와 양립한다(또는 어긋난다).
학생이 말하지 않은 일반화·개념은 평가자 판단 부분에만 쓰고 학생이 말하거나 이해한 것으로 쓰지 않는다.
이 규칙은 학생 판단을 서술하는 형식에만 적용한다. 의미상 동등한 학생 표현의 인정 기준과 판정 기준은 기존 지시를 따른다.
```

GLOSS_BLOCK:
```
## 기호 해석본 입력
입력 markerGloss가 있으면, 문항마다 미리 자동으로 생성하고 자동 검수한 기호 해석본이다. 학생 발화가 아니며 원문도 아니다. 사람이 확인하지 않았으므로 원문과 충돌하면 원문을 우선하고 그 사실을 reason에 적는다.
칸의 뜻:
- marker, location, markedText: 기호와 그 기호가 붙은 원문 위치·문자열
- name: 기호가 표시한 표현
- referentHere: 이 자리에서 그 표현이 가리키는 대상. 괄호 안의 "그 범위에 드는 원문 속 사례"는 그 대상의 일부인 원문 속 구체 개체이며 대상 전체가 아니다.
- speaker: 그 표현을 쓴 사람
- operator: 그 표현이 들어간 절에 걸린 장치와 원문 구절
- sourceBasis: 해석의 근거가 된 원문 구절
사용 규칙:
- 판정기 전용 자료다. 교정 질문·코칭 등 학생에게 나가는 문장에 해석본 문구를 쓰지 않으며, 해석본의 대응 관계를 바꾸어 말해 드러내거나 학생이 아직 밝히지 않은 정답 관계를 질문의 전제로 넣지 않는다.
- 원문은 수정하지 않고 이 해석본을 별도 입력으로 붙인다. 원문 근거(sourceEvidence)는 원문에서만 가져오고 해석본 문구를 원문처럼 인용하지 않는다.
- 어긋남은 표현 차이·생략·추상화 정도의 차이가 아니라, 해석본의 핵심 지시 관계와 함께 성립할 수 없는 학생의 명시적 주장이다. 양립 가능한 읽기는 허용하고, 읽기가 불명확하면 오류로 확정하지 않는다.
- 학생이 해석본의 모든 항목을 설명해야 하는 것은 아니다. 학생이 실제로 주장한 내용만 해석본과 대조하고, 해석본의 설명을 학생이 말한 것으로 보충하지 않는다.
- 정답 선택과 근거의 정확성을 분리한다. 정답을 골랐어도 근거가 해석본과 어긋나면 근거 오류다.
- 이름(name) 층위와 가리키는 대상(referentHere) 층위를 구분한다. 문장 전체의 뜻을 가리키는 대상 자리에 쓰지 않는다.
적용 관계: 이 해석본은 위 지침의 "사전에 가공한 명제, 선지 주장 … 없다"는 자료 경계에 대한 예외로 추가된 입력이다. 학생 주장 분리 기록의 sourceCheck에서 원문 대조는 원문을 이 해석본의 기호 해석과 함께 읽어 판단한다는 뜻이다.
```

### 6. 칸 기록과 결과

칸 파일 `<arm>-<S>-r<r>.json`: arm, type, replicate, status(VALID/EVALUATION_ERROR/BUDGET_STOP), 원출력 전체, studentClaims(methods 조건),
주장 계약 실패와 재시도 기록, 평가기 attempts 요약(종류·결과·오류), CONCLUSION_AUDIT 실행 여부, 적용 뒤 세션의 phase·result.outcome·errors(kind, description, studentEvidence, question)·selectionComparisons 마지막 항목,
`glossVerbatimInStudentText`(gloss 조건만: errors[].question, selectionMismatchQuestion, coaching에 해석본 referentHere의 6자 이상 연속 문자열이 그대로 나오는지와 그 문자열 목록).

기대값(cases.json에 저장, 모델에 보내지 않음):

| 응답 | reconstructability | rationaleImpliedVerdict | contentAssessment | phase / outcome | 오류 단위 |
|---|---|---|---|---|---|
| S1, S4, S5, S6, S8 | RECONSTRUCTABLE | INVALID | SUPPORTED | COMPLETED / VERIFIED_CORRECT | 없음 |
| S2 | RECONSTRUCTABLE | INVALID | ERROR | AWAITING_CORRECTION | ⓓ 대응, ⓔ 대응 |
| S3 | RECONSTRUCTABLE | INVALID | ERROR | AWAITING_CORRECTION | ⓔ 대응 |
| S7 | RECONSTRUCTABLE | INVALID | ERROR | AWAITING_CORRECTION | ⓓ 대응 |

RESULTS.json: 요청 수·추정 비용·stop, 조건별 기대 일치(reconstructability·verdict·contentAssessment·phase/outcome 자동 비교) 표, 주장 계약 실패·재시도 수, CONCLUSION_AUDIT 실행 수, 평가 오류 수, gloss 조건의 해석본 문구 노출 건수.
"의미 판정은 사람·Claude·GPT 검토로 별도 수행하며 자동 비교를 의미 통과로 집계하지 않는다"는 문장을 남긴다.

### 7. 원장·예산·재개

v1 스모크·이전 실험과 같은 방식: `requests.jsonl`에 START(requestId, label, arm, kind, reservedUsd, requestHash, instructionsHash)·END(usage, estimatedUsd, outputText)·TRANSPORT_ERROR.
요청 상한 160, 추정 비용 상한 3.5달러(비용식은 스모크와 같은 단가: 입력 2, 캐시 0.2, 출력 12달러/백만 토큰). 상한에 걸리면 RUN_LIMIT로 멈추고 칸을 BUDGET_STOP으로 남긴다.
칸 파일이 있으면 건너뛴다. START만 있고 END 없는 요청이 원장에 있으면 run을 시작하지 않고 멈춘다.

FROZEN.json: v5·v4 지시 파일, `packages/pipeline/dist/problem-solving/feedback-v4*.js`, 새 lib·스크립트 해시, 세 블록 해시, 원자료·응답·해석본 해시, 모델·설정·상한, 설계 문장.

### 8. 자체 점검(prepare)

- 세 블록에 문항 내용(`빨간|옷|공손룡|묵가|명실|흰 말`)이 없다.
- v5_methods_gloss 지시 = v5_methods 지시 + `\n\n` + GLOSS_BLOCK, v5_methods 지시 = v5 + `\n\n` + CLAIM_BLOCK + `\n\n` + QUOTE_BLOCK(정확히).
- 같은 칸 위치에서 세 조건의 운영 입력(feedbackRequestContent)이 같고, gloss 조건만 markerGloss가 추가된다.
- judgePayload에 choiceReadings·answerKey·keyForcedOnly·instances 키가 없다.
- 주장 계약 검사가 위반 예(인용이 발화에 없음, CONTRADICTED인데 대응 오류 없음, 주장 없는 오류, CONTRADICTED 없는데 ERROR)를 거부하고 정상 예를 통과시킨다.

## 완료 조건

- [ ] `node --test scripts/lib/v5-marker-judgment.test.mjs` 통과(위 자체 점검 항목 포함), `node --test scripts/lib/*.test.mjs` 전체 통과.
- [ ] `OPENAI_API_KEY= node scripts/test-v5-marker-judgment-gongsun.mjs prepare` 두 번 통과(두 번째는 같은 FROZEN).
- [ ] 가짜 전송으로 run 확인: 스크립트 사본에서 OpenAI import만 가짜 모듈로 바꾸고 DIR을 임시 경로로. 가짜 응답은 운영 스키마에 맞는 SELECTION 출력(methods 조건은 studentClaims 포함)을 돌려주고, 한 칸에서는 첫 응답에 주장 계약 위반을 넣어 재시도 후 통과하는지 확인. run 두 번 실행(두 번째 새 요청 0). 사본·임시 경로는 지운다.
- [ ] `packages/**`, 기존 `scripts/**`, 기존 `docs/experiments/*`, `memory/`에 이번 작업으로 생긴 변경이 없다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
  예: 운영 평가기가 transport에서 던진 오류를 재시도하지 않거나, 확장 스키마가 운영 strict 검증과 충돌하는 경우.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 상태: 구현·오프라인 검증 완료. 실제 run 미실행, 외부 API 호출 0회. `.env` 열람·`--env-file` 사용·dist 빌드·git add/commit/stash 없음.
- 변경 파일(새 파일 8개 + 이 문서 결과 보고 절):
  - `scripts/lib/v5-marker-judgment.mjs`
  - `scripts/lib/v5-marker-judgment.test.mjs`
  - `scripts/test-v5-marker-judgment-gongsun.mjs`
  - `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/FROZEN.json`
  - `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/prompts.json`
  - `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/source.json`
  - `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/cases.json`
  - `docs/experiments/v5-marker-judgment-gongsun-2026-10-07/glosses.json`
- 테스트 결과:
  - `node --test scripts/lib/v5-marker-judgment.test.mjs`: **18/18 통과**.
  - `node --test scripts/lib/*.test.mjs`: **107/107 통과**, 최종 재확인도 동일.
  - 자체 점검: 인계 문구 동일성·문항 내용 없음, 확장 strict 스키마, 세 조건 입력 동일성과 해석본만 추가, 금지 키, 주장 계약 정상/위반, UNKNOWN 예외, 인용 겹침과 observation 연결, 노출 6자 경계, 72칸 일정, 운영 재시도 및 독립 결론 확인 경로를 검사했다.
  - `node scripts/validate-memory.mjs`: 통과(결정 97개·체크포인트 187개). memory 파일은 수정하지 않았다.
- prepare 2회:
  - 두 번 모두 `OPENAI_API_KEY= node scripts/test-v5-marker-judgment-gongsun.mjs prepare` 성공, 72칸·자체 점검 통과·외부 요청 0.
  - 두 번 모두 FROZEN 객체 SHA-256(JSON.stringify 기준): `251e0b7b69d94f4b3e09c13c151f98af92d63e0b9e69f3e6460ac99b3ea83780`.
  - 두 번째 실행은 기존 5개 산출물을 바이트 단위로 검증하고 쓰지 않았다. 반복 1~3 원자료 결속 해시 모두 일치.
- 가짜 모델 run:
  - 스크립트 사본에서 OpenAI import와 DIR만 바꿨다. 네트워크 기능이 없는 가짜 모듈을 사용하고 API 키를 비웠다.
  - 첫 실행: **72/72칸 VALID**, 조건별 기대 필드 일치 **24/24**, 가짜 요청 **73회**. 주장 계약 위반 **1건** → 운영 평가기 재시도 **1회** → 통과. 평가 오류 0건.
  - 원장 START/END **73/73**, 실패 원출력 보존, 칸 attempts의 ERROR→SUCCESS, 원출력에서 studentClaims를 분리한 뒤 운영 strict 스키마 적용을 확인했다.
  - 두 번째 실행: **새 요청 0회**, 누적 73회·72칸 유지.
  - 추가 중단 경계 **3/3 통과**: END 없는 START에서 run 시작 거부, 160요청 상한에서 BUDGET_STOP, 추정 비용 3.5달러 상한에서 BUDGET_STOP. 세 경우 모두 새 요청 0.
  - 가짜 사용량에 따른 계산값은 0.1022달러이며 실제 과금은 0이다. 가짜 run의 CONCLUSION_AUDIT 0회·해석본 문구 노출 0건은 모의 응답에 따른 결과다. 독립 결론 확인 경로는 별도 단위 테스트로 실행했다.
  - 스크립트 사본·가짜 모듈·임시 결과 경로·로그 삭제 완료. 실제 실험 폴더에는 prepare 산출물 5개만 남겼다.
- 변경 범위 확인:
  - 이번 작업에서 `packages/**`, 기존 `scripts/**`, 기존 `docs/experiments/*`, `memory/`를 수정하지 않았다.
  - 작업 전 파일 해시와 비교 중 별도 변경을 관측했다: 기존 `scripts/lib/central-story-two-stage-contract.mjs`, `scripts/lib/central-story-two-stage-contract.test.mjs`; 새 `scripts/test-central-story-two-stage-v2.mjs` 및 `docs/experiments/central-story-two-stage-v2-2026-10-07/` 산출물. 본 작업 도구로 작성한 변경이 아니며 그대로 보존했다. 따라서 저장소 전체 무변경이라고 보고하지 않는다.
- 남은 문제:
  - 인계 문서와의 충돌이나 추가 설계 판단 사항은 발견하지 않았다.
  - 실제 모델의 판정·질문 품질, 의미상 해석본 노출은 검증하지 않았다. 자동 필드 일치 및 문자열 노출 검사는 의미 정확도의 증거가 아니다.
  - Claude의 인계 대비 diff 검토와 별도 승인 후 실제 run이 남아 있다.
