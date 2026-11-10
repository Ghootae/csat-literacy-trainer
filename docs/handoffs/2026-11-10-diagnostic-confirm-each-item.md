# 인계: 진단 답 입력 — 문항마다 확정·바로 판정, 이전 문항 읽기 전용, 순서대로 풀기

- 날짜: 2026-11-10
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0221-diagnostic-confirm-each-item-judge-immediately.md` (D-0208 4번, D-0213 7번 일부 대체)

## 목표

이 작업이 끝나면 다음이 참이다.

1. 학생이 한 문항의 답을 내면(지금 화면: "다음 문항", 마지막 문항은 "이 지문 답 다 냈어") 그 문항이 그 순간 첫 응답으로 확정되고, 근거를 쓴 문항이면 그 문항의 선택 판정이 바로 시작된다.
2. 확정한 문항의 답은 바꿀 수 없다. 서버가 거부하고, 화면은 읽기 전용으로 보인다.
3. 문항은 순서대로 푼다. 앞 문항이 모두 확정돼야 다음 문항을 확정할 수 있다.
4. 푸는 중(지문 상태 `ANSWERING`)에는 확정한 문항의 정오·판정·범주가 학생용 응답 어디에도 나오지 않는다. 결과는 지금처럼 "이 지문 답 다 냈어" 뒤 지문 결과 화면(D-0218)에서만 보인다.
5. "이 지문 답 다 냈어" 시점에 앞 문항 판정이 이미 끝났으면, 결과 화면에 그 문항은 "분석 중" 없이 바로 결과가 준비돼 있다.

## 범위 밖

- 버튼 문구(메모 1·4: "확실해요" 등), "이 지문 답 다 냈어" 위치(메모 2), 입력창 안 제출 버튼(메모 4). 지금 버튼과 문구를 그대로 쓴다.
- 판정 규칙·프롬프트·모델, 리뷰 대상 정의(D-0213), 지문 결과 화면(D-0218), 등급(D-0219).
- 실험실(lab) 화면과 그 서버.
- 위치 API의 `grade.density` 정리.
- 개발자 이동 지도(D-0217)의 동작은 유지한다. 깨지지 않게만 맞춘다.

## 손댈 파일과 계약

### 서버 `packages/app/src/server/diagnostic/controller.ts`

- **새 메서드 `confirmItem(participantId, questionId, raw)`**: 본문은 지금 `submitItem`과 같은 `DiagnosticItemRequestSchema`(같은 검증 규칙). 동작:
  - 지문 상태가 `ANSWERING`이 아니면 409.
  - 이미 확정(`item.first !== null`)이면 409("이미 낸 답은 고칠 수 없습니다." 정도).
  - 같은 지문에서 이 문항보다 앞 문항 중 확정 안 된 것이 있으면 409(순서대로).
  - 통과하면 지금 `confirmAnswers` 안의 한 문항 처리(첫 응답 확정, `draft = null`, 피드백 세션 생성·`adopt`, 근거를 썼으면 `firstJudgment = PENDING`, `SELECT` 제출, `runFirstJudgment` 시작)를 그 문항 하나에 대해 한다. 이 한 문항 처리를 private 함수(예: `confirmOne(p, questionId, answer, submittedAt)`)로 빼서 `confirmItem`과 기존 `confirmAnswers`(개발자 경로)가 함께 쓴다.
  - 이벤트 `ITEM_CONFIRMED`(questionId, passageId, choiceId, rationale, solveMs, rationaleMs, confidence)를 남기고 저장 요청.
  - 응답은 `{ confirmed: true }`. 정오·판정을 넣지 않는다.
- **`submitItem`(임시 저장)**: 확정된 문항이면 409. 나머지는 그대로(지금 차례 문항의 새로 고침 대비 임시 저장).
- **`answersDone`**: 지문의 모든 문항이 확정돼야 한다(확정 안 된 문항이 있으면 400, 메시지에 문항 id). 확정은 하지 않고 상태를 `AWAITING_JUDGMENT`로 바꾸고 `ANSWERS_DONE` 이벤트(answered = 지문 문항 전부)를 남긴 뒤 `checkPassageReady`를 부른다(판정이 이미 끝났으면 바로 `FEEDBACK`). 응답 계약(`{ position }`)은 그대로.
- **`confirmAnswers`(개발자 건너뛰기 경로)**: 이미 확정된 문항은 건너뛰고, draft가 있는 미확정 문항만 확정, draft도 없으면 지금처럼 `skipped`. 판정은 새로 확정한 문항만 시작. `ANSWERS_DONE`·`checkPassageReady`·빈 지문 DONE 처리는 지금과 같다.
- **`checkPassageReady`·판정 완료 처리**: `ANSWERING` 중에 판정이 끝나도 지문 상태를 바꾸지 않아야 한다(지금 `AWAITING_JUDGMENT` 가드가 있음, 유지 확인). 사고 진단(`maybeStartDiagnosis`)이 `ANSWERING` 중에 시작되는 것은 괜찮다.
- **`answerDrafts`(GET `.../questions`, 새로 고침 뒤 이어 가기)**: 응답에 `confirmed: Record<questionId, boolean>`를 더한다. `drafts[qid]`는 확정된 문항이면 확정한 답(`item.first`의 choiceId·rationale·confidence), 아니면 draft(없으면 null). 정오·판정은 넣지 않는다.
- **학생용 응답 점검**: `progress` 등 학생 화면이 받는 응답에 `ANSWERING` 지문의 확정 문항 정오·판정 범주·판정 상태가 새어 나가는지 확인한다. 새어 나가면 `ANSWERING` 지문에서는 빼고(목표 4), 무엇을 뺐는지 보고한다. 개발자 전용 응답(`devMap` 등, `CSAT_DIAGNOSTIC_DEV`)은 그대로 둔다.

### 서버 `packages/app/src/server/diagnostic/http.ts`

- `POST .../item/:questionId/confirm` → `controller.confirmItem`. 기존 `POST .../item/:questionId`(임시 저장)는 유지. 경로 모양은 기존 item 경로를 따른다.

### 화면 `packages/app/src/client/diagnostic/api.ts`, `types.ts`

- `confirmItem(id, questionId, body: ItemRequest)` 추가. `QuestionsView`에 `confirmed: Record<string, boolean>`.

### 화면 `packages/app/src/client/diagnostic/AnswerScreen.tsx`

- props에 `confirm: (questionId, body) => Promise<unknown>`, `confirmed`(초기값) 추가. 확정 상태는 화면 안에서도 갖고 있다가 확정 성공 시 갱신.
- **지금 차례 문항** = 확정 안 된 첫 문항. 시작(새로 고침 뒤 포함) 시 그 문항을 연다. 모두 확정됐으면 마지막 문항.
- **확정된 문항(읽기 전용)**: 선지 선택(`QuestionPane enabled`), 근거 입력창, 기호 막대, 근거 없는 응답 버튼 둘을 잠근다. 낸 답은 보인다. 시간 재기와 임시 저장을 하지 않는다. 잠긴 이유가 보이게 "이미 낸 답이야" 정도의 짧은 표시를 둔다(문구는 반말, 화면 다른 문구와 맞춤).
- **"다음 문항"**:
  - 지금 차례 문항에서: 답이 유효(`isValid`)할 때만 활성. 누르면 시간을 멈추고 `confirm` 호출 → 성공하면 확정 표시 후 다음 문항으로. 실패하면 오류를 보이고 머문다.
  - 확정된 문항에서: 다음 문항으로 이동만(지금 차례 문항까지).
  - 마지막 문항에서는 지금처럼 비활성.
- **"이전 문항"**: 이동만. 지금 차례 문항에서 뒤로 갈 때 확정하지 않는다(임시 저장만, 지금 `persist` 그대로).
- **문항 번호 칸**: 확정된 문항과 지금 차례 문항만 활성. 그 뒤 문항은 비활성. 번호 칸 이동은 확정하지 않는다.
- **"이 지문 답 다 냈어"**: 마지막 문항 외 모두 확정 + 마지막 문항 답 유효(또는 이미 확정)일 때 활성. 누르면 마지막 문항이 미확정이면 `confirm` 후 `done`(answers-done). 
- **임시 저장(0.7초 자동 저장)**: 지금 차례 문항에만. 확정된 문항에는 하지 않는다.
- 파일 머리 주석의 "답은 고칠 수 있으며"를 고친다.

### 화면 `packages/app/src/client/diagnostic/Containers.tsx`, `DevDiagnostic.tsx`

- `AnswerScreen`에 `confirm`과 `confirmed`를 넘긴다. 새로 시작한 지문은 모두 미확정.

### 시험

- 컨트롤러 시험(`controller.test.ts` 등, 기존 가짜 평가기 방식): 확정 즉시 그 문항 판정 시작, 확정 문항 재확정·임시 저장 409, 순서 어김 409, 미확정 문항이 있으면 answers-done 400, answers-done 전 판정이 끝났으면 answers-done 뒤 바로 FEEDBACK, `ANSWERING` 중 학생용 응답에 정오·판정 없음, 새로 고침 이어 가기 응답의 `confirmed`·확정 답. 개발자 건너뛰기에서 이미 확정한 문항을 다시 확정하지 않음.
- `http.test.ts`: 새 경로.
- Playwright `packages/app/e2e/diagnostic-flow.spec.ts`: 흐름을 새 규칙에 맞춘다(문항마다 다음 문항으로 확정, 이전 문항이 읽기 전용, 차례가 아닌 번호 칸 비활성, 빈 답이면 다음 문항 비활성, 새로 고침 뒤 지금 차례 문항에서 이어 가기). `diagnostic-dev-navigation.spec.ts` 통과 유지.
- 기존 시험이 "답 고치기"를 전제로 하면 새 규칙에 맞게 고치고, 무엇을 고쳤는지 보고한다.

## 완료 조건

- [ ] 위 목표 1~5가 시험으로 확인된다.
- [ ] `npx tsc --noEmit -p packages/app/tsconfig.client.json` 통과, 서버 빌드(`npm run build` 또는 해당 tsconfig) 통과.
- [ ] `npm test` — 기존 실패 2건(`packages/app/src/boundary.test.ts`, `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`) 외 통과.
- [ ] `CSAT_API_PORT=5474 PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-flow.spec.ts packages/app/e2e/diagnostic-dev-navigation.spec.ts` 통과. 사용자 서버 포트 5173·5174는 쓰지 않는다(사용자가 쓰는 중, 끄지 말 것).
- [ ] 화면 사진: 읽기 전용 이전 문항, 차례 아닌 번호 칸 비활성 상태를 `DIAGNOSTIC_SCREENSHOT_DIR`로 세션 임시 폴더에 남기고 경로 보고(저장소에 넣지 않음).
- [ ] 커밋하지 않는다(메인 세션이 검토 후 사용자 승인으로 커밋).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 시험은 가짜 평가기만 쓴다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/server/diagnostic/controller.ts`(confirmItem·parseAnswer·confirmOne 추가, submitItem 확정 문항 409, answersDone 확정 검사만, confirmAnswers 확정 문항 건너뜀, answerDrafts에 confirmed, answeredPassages가 ANSWERING 지문 제외), `http.ts`(`POST item/:id/confirm`), 화면 `client/diagnostic/AnswerScreen.tsx`·`api.ts`·`types.ts`·`DevDiagnostic.tsx`·`client/DiagnosticApp.tsx`, 시험 `controller.test.ts`·`controller-dev.test.ts`·`http.test.ts`·`e2e/diagnostic-flow.spec.ts`. 빌드 산출물(`packages/app/dist-client/`)은 건드리지 않음(시작 전부터 미추적).
- 테스트 결과: `npx tsc --noEmit -p packages/app/tsconfig.client.json`·`-p packages/app/tsconfig.json` 통과. `npm test` 1733 통과·2 실패(기존 실패 `boundary.test.ts`, `axis-architecture-experiment.test.ts`만). `CSAT_API_PORT=5474 PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-flow.spec.ts packages/app/e2e/diagnostic-dev-navigation.spec.ts` 3 통과·0 실패. 새 시험: 확정 즉시 그 문항만 판정, 재확정·임시 저장·순서 어김 409, 미확정이면 answers-done 400, 판정이 먼저 끝났으면 answers-done 뒤 바로 FEEDBACK, ANSWERING 중 응답 점검, confirmed 이어 가기, 개발자 건너뛰기에서 확정 문항 재확정 안 함, HTTP 새 경로.
- 학생용 응답 점검 결과(뺀 항목): `progress`의 `position`(answered·correct·percentile·grade)과 `result`의 `items`·`position`에 ANSWERING 지문의 확정 문항 정오가 섞였다. `answeredPassages`가 ANSWERING 지문을 빼도록 해 그 지문에서는 나오지 않는다. `devMap`의 `resultAvailable`만 `includeAnswering=true`로 기존 동작 유지. `summaryCard`·`reveal`·피드백 API는 이미 ANSWERING이면 409. `answerDrafts`는 확정 답·confirmed만 있고 정오·판정 없음(시험으로 확인).
- 고친 기존 시험: controller.test.ts의 `post` 도우미를 확정(confirmItem)으로 바꾸고 임시 저장용 `draft` 추가, "답 고치기" 묶음은 "문항마다 확정(D-0221)"으로 대체, `ITEM_SUBMITTED` 기대를 `ITEM_CONFIRMED`로, answerDrafts 시험은 draft로 덮어쓰기 후 확인. controller-dev.test.ts의 answersDone 앞 입력 3곳을 confirmItem으로. http.test.ts의 "answers-done 전 덮어쓰기" 흐름을 임시 저장 덮어쓰기+순서별 확정으로. e2e는 흐름을 새 규칙(다음 문항=확정, 이전 문항 읽기 전용, 번호 칸 비활성, 빈 답 다음 문항 비활성, 새로 고침 뒤 지금 차례 문항에서 이어 가기)에 맞춤.
- 남은 문제: 없음(설계 충돌 없음). 참고: "이 지문 답 다 냈어"는 마지막 문항 화면에서만 활성(앞 문항을 읽기 전용으로 보는 중에는 비활성). 자동 저장이 확정 직전에 겹치면 서버 409가 날 수 있어 확정 문항은 화면에서 임시 저장을 막아 둠.
- 화면 사진: `/private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/5189898e-6647-4325-97e9-992fadd34bbe/scratchpad/shots3/` 안 `03b-answer-readonly-desktop.png`(읽기 전용 이전 문항 + 15·16번 칸 비활성), `03-answer-desktop.png` 등.
