# 인계: 진단 판정 흐름 (나) 1부 — 정답 판정 sol, 정답 범주와 3·2단계 표시, 결과 카드 즉시 표시, 문항별 피드백 열기, 근거 없는 응답 버튼 둘

- 날짜: 2026-11-09
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: [`D-0213`](../../memory/decisions/D-0213-diagnostic-judgment-split-option-na.md)(이 작업의 설계 근거), [`D-0204`](../../memory/decisions/D-0204-sns-diagnostic-keeps-service-feedback.md)(진단은 본 서비스 피드백 부품을 그대로 씀), [`D-0209`](../../memory/decisions/D-0209-sns-diagnostic-student-wording.md)(학생용 표현)
- 배경 문서(읽기만): [`2026-11-09-judgment-split-option-na.md`](./2026-11-09-judgment-split-option-na.md)(웹 인계, 머리의 "검토 반영" 요약이 우선), [경로 트리](../reports/problem-solving-path-tree-2026-11-09.html)
- 2부(나중, 이 문서 범위 밖): 범주 5(확신 없이 맞힘)의 힌트 흐름. 힌트 규칙과 힌트 뒤 판정 기준이 정해진 뒤 따로 인계한다. **2부 인계에 넣을 것: 힌트 뒤 판정이 판정 불가(UNKNOWN)여도 부족·오류처럼 마지막 설명(정답 설명)을 공개한다(D-0213 추가, 11-09).**

## 목표

이 작업이 끝나면 다음이 참이다. 모두 **진단(`/diagnostic`)에만** 적용된다. lab(`/problem/lab`)과 본 서비스의 동작은 바뀌지 않는다.

1. **정답 판정 모델 sol.** 진단에서 마지막 선택이 정답인 세션의 선택 판정(첫 선택·재선택)과 마지막 설명 생성은 `gpt-6.1-sol`이 맡는다. 오답 쪽은 지금처럼 sol, 교정 판정(REPAIR)은 지금처럼 luna(`FEEDBACK_REPAIR_MODEL`)다.
2. **정답 범주.** 서버가 문항마다 첫 응답 기준 범주를 한 곳에서 계산한다(아래 "범주 계산"). 판정 기록에는 늘 세부 값을 남긴다.
3. **3·2단계 표시 설정.** 결과 화면(중간 카드·마지막 결과)의 정답의 질은 설정 하나로 3단계(기본) 또는 2단계로 보인다. 2단계면 범주 1·2를 "근거가 확인되는 정답" 하나로 합쳐 보인다. 기록은 바뀌지 않는다.
4. **중간 카드 즉시 표시.** "이 지문 답 다 냈어" 직후 중간 카드(`MidPage`)에 정답 수와 위치가 바로 나온다. 문항별 근거 결과는 판정이 끝나는 대로 채워진다(폴링 유지).
5. **문항별 피드백 열기.** 피드백 차례인 문항의 첫 판정이 끝나면(또는 판정이 필요 없는 문항이면) 그 문항의 피드백을 연다. 지문의 다른 문항 판정이 끝나기를 기다리지 않는다.
6. **근거 없는 응답 버튼 둘.** 답 입력 화면의 "근거 미제출" 버튼을 **"확실해요"** / **"잘은 모르겠지만 정답 같음"** 두 버튼으로 바꾼다. 어느 쪽을 눌렀는지 진단 답 기록에 남는다.

## 범위 밖 (손대지 말 것)

- `packages/pipeline/src/problem-solving/feedback.ts`의 상태기계와 공유 스키마(`FeedbackRationaleSchema`, `FeedbackCommandSchema`). 확신 구분은 진단 쪽 기록에만 둔다. 상태기계에는 지금처럼 `rationale: { mode: 'OMITTED' }`가 들어간다.
- `FEEDBACK_SELECTION_MODELS`·`FEEDBACK_REPAIR_MODEL` 상수 값. lab·본 서비스는 지금 배정(정답 luna) 그대로다.
- 판정 지시문(v5.8)·사고 진단·마지막 설명 지시문.
- 범주 5의 힌트 흐름(2부). 이번에는 범주 5도 지금 동작(근거 없는 정답 → "정답이야. 근거를 안 적어서…" 종료)을 그대로 쓰고, 기록·표시만 범주 5로 한다.
- 답 저장(draft) 때 미리 판정하기. 대기 측정 뒤 결정한다(D-0213 7번). `submitItem`은 지금처럼 저장만 하고 응답에 정오·판정을 넣지 않는다.
- 피드백 화면(`FeedbackScreen.tsx`)의 "근거 미제출" 버튼(오답 뒤 근거를 다시 물을 때 쓰는 것). 그대로 둔다.
- 외부 API 호출. 테스트는 가짜 평가기·가짜 transport로만 한다.

## 손댈 파일과 계약

### (1) 선택 판정 모델만 바꾸는 설정 — `packages/pipeline/src/problem-solving/feedback-evaluator.ts`

- `OpenAIFeedbackEvaluator` 옵션에 `selectionModels?: { correct: string; incorrect: string }`를 더한다.
- 모델 결정 순서: `options.model`(지금처럼 전부 덮어씀) → REPAIR면 `FEEDBACK_REPAIR_MODEL` → 아니면 `(options.selectionModels ?? FEEDBACK_SELECTION_MODELS)[correct ? 'correct' : 'incorrect']`. END_EXPLANATION도 지금처럼 이 선택 쪽 규칙을 따른다(`feedback-evaluator.ts:102`).
- `metadata.model`에는 실제 쓴 모델이 남는다(지금과 같음).
- 단위 테스트: 정답 SELECTION·정답 END_EXPLANATION → 지정한 correct 모델, REPAIR → luna, `options.model`이 있으면 그것.

### (2) 진단 컨트롤러가 sol 평가기를 쓰게 함 — `packages/app/src/server/diagnostic/controller.ts`

- `options.feedbackEvaluator`가 없을 때 `ProblemFeedbackController`에 `new OpenAIFeedbackEvaluator({ selectionModels: { correct: 'gpt-6.1-sol', incorrect: 'gpt-6.1-sol' } })`를 넘긴다. 다른 옵션은 `ProblemFeedbackController` 기본값(`problem-feedback.ts:63`의 `new OpenAIFeedbackEvaluator()`)과 같게 둔다. 모델 이름은 컨트롤러 안 상수 하나(`DIAGNOSTIC_SELECTION_MODELS`)로 둔다.
- 테스트에서 주입하는 `feedbackEvaluator`가 있으면 지금처럼 그것을 쓴다.

### (3) 진단 답 기록의 확신 구분 — `controller.ts`의 `DiagnosticItemRequestSchema`, `store.ts`의 `ItemAnswer`, 클라이언트 `types.ts`

- 요청에 `confidence: 'SURE' | 'UNSURE' | null`을 더한다. `rationale.mode === 'OMITTED'`이면 `SURE`나 `UNSURE` 필수, `PROVIDED`이면 `null`. 어기면 400.
- `ItemAnswer`(draft·first)에 그대로 저장하고, `ITEM_SUBMITTED` 이벤트에도 남긴다. `answerDrafts` 응답에도 돌려준다(새로 고침 뒤 버튼 상태 복원).
- 저장된 옛 참가자 파일에 `confidence`가 없으면 읽을 때 오류를 내지 않는다. 범주 계산에서는 근거 생략 + 확신 값 없음을 `SURE`로 본다(옛 "근거 미제출" = 판정 없이 정답 종료와 같은 동작이었음).
- 상태기계로 보내는 `SELECT` 명령은 지금과 같다(`rationale: { mode: 'OMITTED' }`). 그래서 오답 + "확실해요"는 지금처럼 근거를 한 번 묻고(B2), 정답 + 두 버튼은 지금처럼 판정 없이 끝난다.

### (4) 범주 계산 — `controller.ts`, 한 함수(`answerCategory(item)` 등)

첫 판정 결과를 `firstJudgment`에 더 남긴다: `reconstructability`(`RECONSTRUCTABLE`/`UNKNOWN`)와 `consistency`(`session.selectionComparisons[0]?.selectionRationaleConsistency`, 없으면 null). `syncDerived`(`controller.ts:541`)에서 `contentAssessment`와 함께 채운다. 옛 파일에 없으면 null로 읽는다.

| 순서 | 조건 | 범주 값 |
|---|---|---|
| 1 | 오답 | `WRONG` (범주 6) |
| 2 | 정답 + 근거 생략 + `SURE`(또는 확신 값 없음) | `SURE_CORRECT` (범주 4) |
| 3 | 정답 + 근거 생략 + `UNSURE` | `UNSURE_CORRECT` (범주 5) |
| 4 | 정답 + 근거 + 첫 판정 PENDING | `PENDING` |
| 5 | 정답 + 근거 + 첫 판정 FAILED, 또는 boundary가 `NONE`이 아님 | `CHECKING` (지금의 '확인 중'과 같음) |
| 6 | 정답 + 근거 + `reconstructability === 'UNKNOWN'` | `UNVERIFIED` ('확인 못 함') |
| 7 | 정답 + 근거 + `contentAssessment === 'ERROR'` 또는 `consistency === 'MISMATCH'` | `ERROR_CORRECT` (범주 3) |
| 8 | 정답 + 근거 + `contentAssessment === 'SUPPORTED'` | `SUPPORTED_CORRECT` (범주 1) |
| 9 | 정답 + 근거 + 그 밖(`INSUFFICIENT`) | `WEAK_CORRECT` (범주 2) |

- 7번의 불일치 포함은 D-0213 3번이다. 상태기계는 이 경우 이미 리뷰를 연다(`feedback.ts:514-518`). 바꿀 것은 범주 계산뿐이다.
- 범주 값은 `summaryCard`의 문항 카드와 `result()`의 문항 항목에 `category`로 싣는다. 기존 `quality` 필드는 지우고 `category`로 대체한다(클라이언트도 함께 고침).
- 정답의 질 숫자(분모)는 범주 1·2·3만 센다. 범주 4·5, `UNVERIFIED`, `CHECKING`은 개수만 따로 싣는다.

### (5) 3·2단계 표시 설정

- 서버 상수 `DIAGNOSTIC_CORRECT_QUALITY_TIERS: 3 | 2 = 3`(`controller.ts`). 중간 카드와 결과 응답에 `qualityTiers`로 싣는다. 바꾸려면 이 상수 하나만 고친다.
- 범주 값과 기록은 설정과 상관없이 같다. 합치기는 클라이언트 표시에서만 한다(2단계면 범주 1·2를 같은 이름·같은 칸으로 센다).

### (6) 중간 카드 즉시 표시 — `controller.ts` `summaryCard`(`:293`), 클라이언트 `Pages.tsx` `MidPage`, `logic.ts` `passageResultSentence`

- `summaryCard`는 "답 입력 마침" 뒤 언제나 `status: 'ready'`를 돌려준다(지금은 판정 하나라도 PENDING이면 `pending`, `:297`). 정답 수·위치(`position`)는 정오만으로 정해지므로 바로 싣는다.
- 문항 카드는 `category`(PENDING 포함)를 싣고, 카드 전체에 `judging: n`(PENDING 개수)을 싣는다. 클라이언트는 `judging > 0`이면 지금처럼 폴링을 계속한다. `pending` 응답 모양은 지운다(클라이언트 `SummaryCardView`도 함께).
- 문장(`passageResultSentence`)은 정답 수를 먼저 말하고, 근거 결과는 판정이 끝난 범주만 센다. 판정 중이면 "근거는 살펴보는 중이야" 같은 한 줄을 붙인다(문구는 아래 "학생 문구 초안").
- "피드백 시작" 버튼은 카드가 아니라 아래 (7)의 "첫 문항 열림" 값으로 켠다.

### (7) 문항별 피드백 열기 — `controller.ts` `checkPassageReady`(`:615`), `feedbackTarget`, `itemView`, 클라이언트 `DiagnosticApp.tsx`·`FeedbackScreen.tsx`

- **열림 조건(문항):** 그 문항의 `firstJudgment.status`가 `PENDING`이 아니다(근거 생략 문항은 판정이 없으므로 바로 열림).
- 지문 상태 `AWAITING_JUDGMENT` → `FEEDBACK` 전환은 "커서 0번 문항이 열림"일 때로 바꾼다(지금은 지문 전체). `answersDone`과 각 문항 판정이 끝날 때(`onFirstJudgmentSettled`) 다시 검사한다.
- 커서가 다음 문항으로 넘어갔는데 그 문항이 아직 열리지 않았으면: 읽기(`feedbackView`)는 판정 대기 상태를 알리는 값(예: `judgmentPending: true`)을 실은 보기를 돌려주고, 쓰기는 409로 막는다. 클라이언트는 지금의 대기 말풍선(`waitingText`)을 보여 주며 폴링하다가 열리면 이어 간다.
- 중간 카드의 "피드백 시작" 버튼은 커서 0번 문항이 열렸을 때 켠다(카드 응답이나 진행 응답에 `firstItemOpen` 같은 값을 실어 준다).
- 판정 재시도(`runFirstJudgment`의 `RESUME`)가 도는 동안 학생이 그 문항 화면에 있어도 학생 명령이 끼어들지 않아야 한다. 지금 재시도는 피드백 열림 전에만 일어났으므로, 이 점을 테스트로 확인한다.
- 사고 진단 시작 조건·순서는 바꾸지 않는다.

### (8) 결과 화면 — `ResultView.tsx`, `logic.ts`(`answerQuality`, `solveStats`)

- `answerQuality`는 `category`와 `qualityTiers`로 문구를 고른다(아래 초안).
- `solveStats`는 범주 1·2·3 개수(2단계면 1·2 합침)와 범주 4·5·`UNVERIFIED` 개수를 돌려준다. 지금의 "적절한 근거 n / 근거 쓴 m" 칸은 "근거까지 정확한 정답 n / 근거를 쓴 정답 m"처럼 범주 기준으로 바꾼다(분모 = 범주 1·2·3).
- 사고 진단 대상 판정(`eligibleDiagnosis`, `:710`)은 바꾸지 않는다.

### (9) 답 입력 화면 버튼 — `AnswerScreen.tsx`

- "근거 미제출" 토글 하나를 두 토글로 바꾼다: "확실해요", "잘은 모르겠지만 정답 같음". 둘은 서로 배타적이고, 하나가 눌리면 근거 칸·기호 막대가 꺼진다(지금 `omit`과 같은 동작).
- 저장 요청: 눌린 버튼에 따라 `rationale: { mode: 'OMITTED' }, confidence: 'SURE' | 'UNSURE'`. 근거를 쓰면 `confidence: null`.
- 임시 저장 키(`savedKey`)에 확신 값을 포함한다(버튼만 바꿔도 다시 저장).

## 학생 문구 초안 (사용자 검토 대상, D-0209 반말)

| 자리 | 3단계 | 2단계 |
|---|---|---|
| 범주 1 | 근거도 정확했어 | 근거가 확인되는 정답이야 |
| 범주 2 | 정답이야. 근거는 조금 더 다듬을 수 있어 (지금 문구) | 근거가 확인되는 정답이야 |
| 범주 3 | 정답이지만 근거에 틀린 곳이 있어 | (같음) |
| 범주 4 | 확실하다고 한 정답이야 | (같음) |
| 범주 5 | 확신 없이 맞힌 정답이야 | (같음) |
| `UNVERIFIED` | 정답이야. 근거로 풀이를 확인하지는 못했어 | (같음) |
| 중간 카드, 판정 중 | 근거는 살펴보는 중이야 | (같음) |

버튼 이름 "확실해요"·"잘은 모르겠지만 정답 같음"은 사용자가 정한 그대로 쓴다(학생이 하는 말이라 해요체).

## 완료 조건

- [ ] (1) 평가기 단위 테스트: 정답 SELECTION·END_EXPLANATION은 `selectionModels.correct`, REPAIR는 luna, `options.model`이 우선.
- [ ] (2) 진단 컨트롤러 기본 평가기가 정답 sol·오답 sol·교정 luna로 만들어짐(생성 옵션을 확인하는 테스트 또는 주입 지점 테스트). lab·본 서비스 경로의 평가기 생성은 바뀌지 않음(diff로 확인).
- [ ] (3) `confidence` 검증: 생략 + 값 없음 → 400, 근거 + 값 있음 → 400, 옛 파일(값 없음) 불러오기 성공.
- [ ] (4) 범주 표 9줄을 각각 만드는 컨트롤러 테스트(가짜 평가기 출력으로). 특히 정답 + `INSUFFICIENT` + `MISMATCH` → `ERROR_CORRECT`, 정답 + `reconstructability UNKNOWN` → `UNVERIFIED`.
- [ ] (5) `qualityTiers`가 응답에 실리고, 클라이언트 로직 테스트에서 2단계일 때 범주 1·2가 합쳐 보임.
- [ ] (6) "답 입력 마침" 직후 판정이 하나도 끝나지 않았어도 `summaryCard`가 정답 수·위치와 `judging`을 돌려줌.
- [ ] (7) 4문항 지문에서 1번 판정만 끝났을 때 1번 피드백이 열리고, 2번이 PENDING인 채로 커서가 2번에 오면 읽기는 대기 보기·쓰기는 409, 2번 판정이 끝나면 열림. 재시도 중 학생 명령이 끼어들지 않음.
- [ ] (9) 답 입력 화면 두 버튼의 배타 동작과 저장 요청 모양(가능하면 기존 클라이언트 테스트 방식으로).
- [ ] 테스트 명령: `npx vitest run packages/app packages/pipeline` 통과. 기존 실패 1건(`boundary.test.ts` "다른 서버 파일은 node:fs를 import 하지 않는다", 위반 파일 `server/student-state.ts`)은 이번 범위 밖이므로 그대로 남아도 된다. 그 밖의 실패는 0.
- [ ] 타입 검사: `npx tsc --build` 통과.
- [ ] 변경 파일 안에 TODO·`test.skip`·`.only`·빈 분기가 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 특히:
  - 문항별 열기(7)가 판정 재시도·서버 재시작 뒤 이어 가기(`resume`)와 충돌해, 상태기계(`feedback.ts`)를 고쳐야만 풀리는 경우.
  - 위치(`position`) 계산이 판정 결과에 의존해 즉시 표시(6)가 불가능한 경우.
  - 공유 스키마나 lab·본 서비스 코드를 바꿔야만 (3)이 가능한 경우.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 파이프라인: `packages/pipeline/src/problem-solving/feedback-evaluator.ts`(`selectionModels` 옵션), `feedback.test.ts`(모델 결정 테스트 4개 추가).
  - 서버: `packages/app/src/server/diagnostic/controller.ts`(`DIAGNOSTIC_SELECTION_MODELS`, `DIAGNOSTIC_CORRECT_QUALITY_TIERS`, `answerCategory`, `itemOpen`, `summaryCard` 상시 ready, `feedbackView` 대기 보기·`feedbackTarget` 쓰기 409, `checkPassageReady` 커서 0번 기준, `confidence` 검증), `store.ts`(`AnswerConfidence`, `ItemAnswer.confidence`, `firstJudgment.reconstructability·consistency`), `test-support.ts`(가짜 평가기 동작 2개, `omitted`/`provided`에 confidence).
  - 서버 테스트: `controller.test.ts`(범주 표·confidence·문항별 열기 테스트 추가, 기존 기대 갱신), `http.test.ts`, 새 파일 `controller-evaluator.test.ts`(기본 평가기가 sol·sol로 만들어짐).
  - 클라이언트: `types.ts`, `logic.ts`(`categoryTally`, `countCategories`, `toggleConfidence`, `answerPayload`, `passageResultSentence`·`solveStats`·`answerQuality` 개정), `Pages.tsx`(`MidPage` 즉시 표시·피드백 시작 버튼은 `firstItemOpen`), `ResultView.tsx`, `AnswerScreen.tsx`(버튼 둘), `FeedbackScreen.tsx`(`judgmentPending` 대기·폴링), `DiagnosticApp.tsx`(카드 폴링 조건), `diagnostic.css`, `logic.test.ts`, `packages/app/e2e/diagnostic-flow.spec.ts`(버튼 이름·중간 문장 기대, 실행하지 않음).
- 테스트 결과: `npx tsc --build` 통과. `npx vitest run packages/app packages/pipeline`: 131개 파일 중 129 통과, 1638 통과 / 2 실패. 실패 2건은 모두 이번 변경과 무관하다. (1) `boundary.test.ts`(`server/student-state.ts`, 허용된 기존 실패). (2) `axis-architecture-experiment.test.ts`는 `.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/...json` 파일이 이 워크트리에 없어서 ENOENT.
- 남은 문제:
  - 위 (2) 실패는 워크트리에 `.omc` 자료가 없어서 생기는 환경 문제로 보인다(이번 변경과 무관, 확인 필요).
  - Playwright e2e(`diagnostic-flow.spec.ts`)는 실행하지 않았다(브라우저 필요). 버튼 이름과 중간 문장 기대만 갱신했다.
  - 판정이 진행 중인 커서 문항의 대기 보기는 `evaluationStatus: 'PROCESSING'` + `judgmentPending: true`로 돌려준다(기존 대기 말풍선·폴링 재사용). 오답 문항은 판정이 끝나기 전에도 범주가 `WRONG`이라 중간 카드의 `judging`(PENDING 개수)에는 정답 + 근거 문항만 센다.
  - 결과 화면의 세 번째 숫자 칸 이름("근거 없이 낸 정답")과 확인 못 함 한 줄 문구는 문서에 문구가 없어 임의로 정했다. 사용자 검토 필요.
