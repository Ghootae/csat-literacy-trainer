# 인계: 정답 판정 원인 가르기 실험 실행기 (모델 × 해설)

- 날짜: 2026-11-08
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 설계: `docs/experiments/judge-model-explanation-2026-11-08/DESIGN-DRAFT.md` (개정 2, 사용자 확정)
- 관련: Q-0044, D-0104·D-0107(모델 배정), D-0168(기존 자료 재활용), D-0190(v5.8)

## 목표

설계 초안의 실험을 돌릴 스크립트 3개를 만든다. 다만 **외부 API 호출은 하지 않는다.** 실제 실행은 코드 에이전트가 diff를 검토하고 사용자에게 건수를 재확인한 뒤에 한다.

이 작업이 끝나면 다음이 참이어야 한다.

1. `scripts/run-judge-model-explanation.mjs`가 있다.
   - 사례 14개 × 조건 × 반복 3회의 첫 판정을 운영과 같은 판정기로 돌린다.
   - 판정이 마지막 설명으로 이어지면 마지막 설명까지 만든다.
   - 결과를 칸마다 파일로 남긴다.
   - `selftest` 모드는 외부 호출 없이 끝난다.
2. `scripts/summarize-judge-model-explanation.mjs`가 있다. 실행 결과로 판정 집계표와 비용을 만든다.
3. `scripts/build-judge-model-explanation-blind.mjs`가 있다. 실행 결과로 사용자 블라인드 판정용 묶음을 만든다.
4. 세 스크립트 모두 가짜 응답으로 끝까지 도는 시험이 있고 통과한다.

## 범위 밖

- **실제 OpenAI 호출.** `.env` 키가 있어도 `selftest`·시험 외 모드를 실행하지 않는다.
- 지시문(`source-direct-problem-feedback-v5.8.md`), `packages/pipeline/src/**`, `packages/app/src/**`를 고치는 것. 판정기·상태기계는 있는 그대로 import해서 쓴다.
- 교정 답변 판정(REPAIR), 재선택, 학생 응답 이후 단계. 첫 판정과 그에 따른 마지막 설명만 돌린다.
- 규칙 점검·판정기 정확성 검토. 실행 뒤 코드 에이전트가 따로 한다.
- "sol 판정 + luna 설명" 조합. 사용자 결정 전이다. 다만 마지막 설명 모델을 판정 모델과 따로 줄 수 있게 구조만 열어 둔다(아래 `endModel`).
- 이 작업과 상관없는 미커밋 변경. 특히 `packages/app/src/client/diagnostic/FeedbackScreen.tsx`, `packages/app/src/server/diagnostic/*`는 건드리지 않는다.

## 입력 (모두 읽기 전용)

| 자료 | 경로 | 확인 |
|---|---|---|
| 참가자 기록 | `sessions/diagnostic/d8743308-d746-4588-b403-954f2d7f3773.json` | `items[questionId].session.source`(원자료 묶음), `items[questionId].first`(`choiceId`, `rationale.text`) |
| 지금 해설 | 위 `session.source.officialExplanation` | `packages/pipeline/fixtures/experiments/sns-diagnostic/runtime-reference.json`의 같은 문항 `officialExplanation`과 글자 일치를 assert한다(7문항 확인됨) |
| lab식 해설 | `docs/experiments/judge-model-explanation-2026-11-08/lab-style/output.json` | 파일 sha256 = `bd662569935a62375417851b88d7a189ef763b9ce32aaaea1a31b1b2562dcd4c`를 assert한다(`lab-style/FROZEN.md`). `output-v1.json`은 쓰지 않는다 |
| 지시문 | `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.8.md` | 판정기가 읽는 그대로. META에 해시를 기록한다 |
| 판정기·상태기계 | `packages/pipeline/dist/index.js` (`npm run build` 뒤) | `createFeedbackSession`, `submitFeedbackCommand`, `applyFeedbackAssessment`, `applyFeedbackEndExplanation`, `OpenAIFeedbackEvaluator`, `SourceDirectProblemBundleSchema` |
| 본보기 스크립트 | `scripts/run-v58-terra-p1.mjs` | 세션 만들기, `transport` 감싸기, 기록·장부·비용 상한, `selftest` 방식을 본뜬다 |

## 실험 정의 (설계 초안 2.2·2.4·2.5와 같음)

### 조건

| 기호 | 판정 모델 | 해설(`source.officialExplanation`) |
|---|---|---|
| `L-now` | `gpt-6-luna` | 지금 해설(저장된 그대로) |
| `L-lab` | `gpt-6-luna` | lab식 해설 v2(`output.json`의 같은 `questionId` 글) |
| `L-none` | `gpt-6-luna` | `정답은 ⓧ입니다.` (ⓧ는 정답 선지 위치의 원문자 ①~⑤) |
| `S-now` | `gpt-6.1-sol` | 지금 해설 |
| `S-lab` | `gpt-6.1-sol` | lab식 해설 v2 |

- 판정기: `new OpenAIFeedbackEvaluator({ model, timeoutMs: 240000, maxRetries: 1, transport })`. 나머지는 기본값을 쓴다. 기본값은 reasoning effort medium, 지시문 v5.8, layout v2.2, 결론 재계산, 형식 정규화다.
- `model` 옵션을 주면 같은 판정기 인스턴스의 ASSESSMENT·CONCLUSION_AUDIT·END_EXPLANATION이 모두 그 모델을 쓴다(`feedback-evaluator.ts:102`).
- 마지막 설명은 **판정 모델과 같은 모델**로 쓴다(`endModel = model`). `endModel`을 따로 받을 수 있게 마지막 설명용 판정기 인스턴스를 분리해 두되, 이번 일정에서는 항상 같은 값이다.

### 사례

`questionId`는 세트 E 문항 ID다. 선택은 모두 그 문항의 정답이다(참가자 기록 `first.choiceId`와 같음을 assert한다).

| 사례 ID | questionId | 학생 근거 글 |
|---|---|---|
| `A-cog14` | consciousness-cognition-q14 | 참가자 기록 `first.rationale.text` |
| `A-horse6` | horse-race-reporting-q6 | 참가자 기록 |
| `A-plas10` | plastic-polymerization-q10 | 참가자 기록 |
| `A-aud16` | audio-perceptual-coding-q16 | 참가자 기록 |
| `A-cog16` | consciousness-cognition-q16 | 참가자 기록 |
| `A-horse5` | horse-race-reporting-q5 | 참가자 기록 |
| `A-aud17` | audio-perceptual-coding-q17 | 참가자 기록 |
| `B-cog14` | consciousness-cognition-q14 | `(나)의 논지는 주체와 대상 분리가 인지 후에 나타난다는 것. ㉠은 지각 이전에 확정된 주체를 전제하므로 따라서 확장된 인지 이론을 타당하지 않다고 볼 것.` |
| `B-horse6` | horse-race-reporting-q6 | `a는 제한이 합리적이란 입장. 2번 선지의 케이스는 역량 있는 정치 신인이 제한 때문에 토론회에 못 나가는 경우로, 규정이 소수 후보에게 차별적으로 작용함을 보여 줌. 그러므로 a의 입장이 약화될 것.` |
| `B-plas10` | plastic-polymerization-q10 | `(나)는 결정화된 플라스틱 -> 화학적으로 안정적. 그래서 화학 물질이 닿는 부분에는 ㉮보다 ㉯가 더 적합.` |
| `C1-cog14` | consciousness-cognition-q14 | `①이 맞다. (나)의 입장에서는 타당하지 않다고 볼 것.` |
| `C1-plas10` | plastic-polymerization-q10 | `③이 맞다. ㉯로 만든 소재가 더 적합하다.` |
| `C2-aud16` | audio-perceptual-coding-q16 | `임계대역의 폭은 고음에서 저음보다 훨씬 넓다.` |
| `C2-horse6` | horse-race-reporting-q6 | `ⓐ는 다수 의견이고 ⓑ는 소수 의견이다.` |

- B·C 글은 위 표의 글자 그대로 쓴다(사용자 확정). 스크립트 안 상수로 두고, META에 그대로 기록한다.
- A 글은 참가자 기록에서 읽는다. 상수로 옮겨 적지 않는다.

### 일정 (사례 × 조건)

- A 7개: 5조건 전부
- B 3개: `L-now`, `S-now`
- C 4개: 5조건 전부
- 반복 `r1`·`r2`·`r3`
- 합계 칸 = (7×5 + 3×2 + 4×5) × 3 = **183**

**순서는 반복 단위로 돈다:** r1의 183/3칸 전부 → r2 → r3. 반복 안에서는 A → B → C, 조건은 위 표 순서. 비용 상한에 걸려 멈춰도 조건 사이 균형이 유지되게 하기 위해서다.

## 한 칸의 처리 (계약)

1. **원자료 만들기**
   - `source = SourceDirectProblemBundleSchema.parse({ ...stored.session.source, officialExplanation: <조건의 해설> })`.
   - 그 밖의 칸(지문·선지·`media`·`textAnnotations`·정답)은 그대로 둔다.
2. **세션 만들기**
   - `createFeedbackSession('<caseId>-<cond>-r<n>', source)`
   - → `submitFeedbackCommand(session, { type: 'SELECT', choiceId, rationale: { mode: 'PROVIDED', text } }, '<caseId>-<cond>-r<n>-select')`
3. **첫 판정**
   - `call = await evaluator.evaluate(session)`
   - → `after = applyFeedbackAssessment(session, call.rawOutput)`
4. **마지막 설명**
   - `after.phase === 'AWAITING_END_START'`이면 `submitFeedbackCommand(after, { type: 'END_START', accept: true }, '<…>-end')`로 `END_EXPLANATION` 대기 상태를 만든다.
   - 마지막 설명용 판정기(`endModel`)로 `evaluate`한다.
   - `applyFeedbackEndExplanation`을 적용한다.
   - 다른 phase(`AWAITING_CORRECTION`, `COMPLETED` 등)면 마지막 설명을 만들지 않는다.
   - 상태기계가 위 순서와 다르게 동작하면(예: END_START 뒤 phase가 다름) **멈추고 보고한다.** 참고로 진단 기록에서 의식 14는 `END_START accept:true` 뒤 마지막 설명이 나왔다.
5. **실패 처리**
   - 판정 실패는 `status: 'EVALUATION_ERROR'`로 남기고 다음 칸으로 간다.
   - 마지막 설명 실패는 `endStatus: 'ERROR'`로 남긴다.
6. **칸 결과 파일** `runs/<caseId>__<cond>__r<n>.json`. 이미 있으면 건너뛴다(이어 돌리기). 칸:
   - 식별: `caseId`, `questionId`, `condition`, `model`, `endModel`, `replicate`, `explanationKind`(`now|lab|none`), `explanationText`, `rationaleText`, `choiceId`
   - 판정 결과: `status`, `error`, `judge`(`contentAssessment`, `insufficiencyKind`, `boundary`, `reason`, `rationaleImpliedVerdict`), `errors`(오류마다 `errorId`, `errorType`, `description`, `question`)
   - 마지막 설명: `phaseAfterSelection`, `endStatus`(`NONE|OK|ERROR`), `endExplanation`(적용 뒤 세션의 `endExplanation`)
   - 원자료·장부: `attempts`(종류·결과·오류 요약), `rawOutput`, `endRawOutput`, `requests`(장부 행)
7. **장부·비용**
   - 요청마다 `runs/requests.jsonl`에 한 줄씩 남긴다(`label`, `kind`, `model`, `usage`, `usd`, 시각, 소요).
   - 단가(USD/1M 토큰, 기존 스크립트와 같음): `gpt-6.1-sol` 입력 2.00·출력 10.00, `gpt-6-luna` 입력 0.10·출력 0.50. 캐시 할인은 계산하지 않는다(보수적).
   - **누적이 `USD_CAP = 8`에 닿으면 새 칸을 시작하지 않고 멈춘다.**
8. **동시 실행:** 4칸까지. 칸 안의 판정 → 마지막 설명은 순서대로 한다.

## META (`runs/META.json`, 첫 실행 때 한 번)

다음을 기록한다.
- 지시문 경로·sha256, lab식 해설 파일 sha256, 참가자 파일 sha256
- 조건 표, 사례 표(B·C 글 전문, A 글은 참가자 기록에서 읽은 전문)
- 일정 길이(183), 단가, `USD_CAP`, `timeoutMs`, `maxRetries`, reasoning effort
- 재활용하지 않은 이유: "실제 진단 출력은 나쁜 결과로 고른 사례라 치우쳐 있어 L-now도 새로 3회 돌린다(D-0168 검토, 설계 초안 2.6)"
- 참고값 위치: `sessions/diagnostic/events.jsonl` 판정 기록

## `selftest` 모드 (외부 호출 0)

- 5조건마다 첫 칸의 요청을 가짜 `transport`로 붙잡고 다음을 assert한다.
  - `instructions` = v5.8 파일 글자 그대로
  - `model`이 조건과 같음, `reasoning.effort === 'medium'`
  - 요청 본문의 `source.officialExplanation`이 조건의 해설과 같음
  - 학생 근거 글이 본문에 있음
  - 오디오 17 칸이면 `input_image`가 1개
- 사례 14개 × 조건의 칸 수가 183인지, B·C 글이 이 문서 표와 같은지 assert한다.
- 끝나면 `{ selftest: 'passed', externalRequests: 0, cells: 183, ... }`를 출력한다.

## 요약 스크립트 `scripts/summarize-judge-model-explanation.mjs`

입력 `runs/`, 출력 `SUMMARY.json`과 `SUMMARY.md`. 외부 호출 없음.

- **판정 집계표:** 사례 × 조건마다 r1~r3의 `contentAssessment`(또는 `EVALUATION_ERROR`) 목록과 개수.
- **기대 판정 일치** (설계 2.8):
  - A: cog14·horse6·plas10·aud16·cog16 = `SUPPORTED`, horse5·aud17 = `ERROR`
  - B 3개 = `SUPPORTED`
  - C 4개 = `INSUFFICIENT`
  - 판정 칸 값 이름은 실제 스키마의 enum 이름을 따른다. 다르면 멈추고 보고한다.
- **풀림 표시** (설계 2.9): 3회 중 2회 이상 기대 판정이면 `resolved: true`.
  - 조건별 "기준 사례 4건(A-cog14·A-horse6·A-plas10·A-aud16) 중 풀림 수"
  - "C 반례 중 2회 이상 SUPPORTED가 나온 수"(그냥 후함 표시)
- **오류 질문 목록:** 사례 × 조건 × 반복별 `errors[].question` 원문.
- **비용:** 조건별·모델별 합계, 전체 합계, 칸 수, 실패 수.
- **참고값:** `sessions/diagnostic/events.jsonl`의 A 7개 실제 진단 판정을 L-now 옆 "참고(원래 1회)" 칸에 적는다.
  - 판정 결과는 참가자 파일 `items[q].session.assessments[0]`에서 읽는다.
  - 집계·풀림 계산에는 넣지 않는다.

## 블라인드 묶음 스크립트 `scripts/build-judge-model-explanation-blind.mjs`

입력 `runs/`, 출력 `blind/QUESTIONS.md`, `blind/EXPLANATIONS.md`, `blind/KEY.json`. 외부 호출 없음.

- **같은 판정끼리 묶기**
  - 사례마다 `contentAssessment`가 같은 칸끼리 묶는다.
  - 한 묶음에 서로 다른 조건이 2개 이상 있을 때만 비교 대상으로 삼는다.
  - 조건마다 반복 번호가 가장 작은 칸 하나를 고른다.
  - 비교 대상이 없는 사례는 "비교 불가(사유)"로 적는다.
- **QUESTIONS.md**
  - 오류 판정 칸의 질문을 사례별로 나란히 보인다.
  - 사례 머리에 문항 발문, 선지(학생이 고른 것), 학생 근거를 먼저 보인다.
  - 질문마다 `가`·`나`·`다`… 표시만 붙인다. 모델·조건·해설 종류는 드러내지 않는다.
- **EXPLANATIONS.md:** 마지막 설명이 있는 칸의 설명 문단 전문을 같은 방식으로 보인다.
- **판정 칸:** 항목마다 4기준(무엇을 묻는지 바로 알겠나 / 판정 이유가 납득되나 / 꼭 필요한 만큼만 묻나 / 문체가 자연스러운가) × 좋음·보통·나쁨, 메모 한 줄을 빈칸으로 둔다.
- **순서 섞기:** 고정 시드로 섞는다. `KEY.json`에 표시 ↔ 칸(`caseId`, `condition`, `replicate`)을 적는다. KEY는 md에서 링크하지 않는다.

## 시험

- `scripts/run-judge-model-explanation.test.mjs`(node:test 또는 저장소 관례). 외부 호출 없이 가짜 `transport`로 돈다.
  1. A 사례 한 칸: 가짜 ASSESSMENT 응답(INSUFFICIENT) → `AWAITING_END_START` → 가짜 END 응답 → `endStatus: 'OK'`로 결과 파일이 써진다.
  2. 오류 판정 칸: 가짜 ERROR 응답 → `AWAITING_CORRECTION`, 마지막 설명 호출 없음, `errors[].question`이 기록된다.
  3. 비용 상한: 가짜 usage로 상한을 넘기면 새 칸을 시작하지 않는다.
  4. 이어 돌리기: 이미 있는 칸 파일은 건너뛴다.
  5. 요약·블라인드 스크립트가 가짜 결과로 표·묶음을 만들고, 묶음에 모델·조건 이름(`luna`, `sol`, `L-`, `S-`, `lab`, `none`, `now`)이 나오지 않는다.
- 가짜 응답은 저장소의 기존 판정기 시험 자료(`packages/pipeline/src/problem-solving/feedback*.test.ts`, `scripts/run-v5-regression-replay.test.mjs` 등)에서 스키마에 맞는 것을 찾아 쓴다. 맞는 자료를 만들 수 없으면 멈추고 보고한다.

## 완료 조건

- [ ] `npm run build` 통과
- [ ] `node scripts/run-judge-model-explanation.mjs selftest` → `selftest: passed`, `externalRequests: 0`, `cells: 183`
- [ ] `node --test scripts/run-judge-model-explanation.test.mjs` 통과(또는 저장소 관례의 시험 명령)
- [ ] 실제 모드 실행 흔적 없음(`docs/experiments/judge-model-explanation-2026-11-08/runs/requests.jsonl` 없음)
- [ ] 변경 파일은 새 스크립트·시험 파일뿐

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 예:
  - 상태기계가 END_START 뒤 다르게 동작함
  - `contentAssessment` enum 이름이 다름
  - 해시가 다름
  - 원자료 스키마 검증 실패
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다. 이번 작업은 외부 호출을 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
