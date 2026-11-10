# 인계: 진단평가 개발자 이동 지도(자유 이동·건너뛰기·지문 초기화)

- 날짜: 2026-11-10
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0217-diagnostic-dev-navigation.md`. 이 문서와 다르면 D-0217을 따른다.
- 배경: 사용자가 `/diagnostic`을 직접 써 보며 v5.10 판정을 검증하는 단계다. 정해진 순서(지문마다 요약 선택 → 문단 요약 → 답 입력 → 중간 화면 → 문항별 피드백 → 결과)만으로는 원하는 곳을 보기 어렵다.
- **외부 전송 없음.** 시험은 가짜 평가기(`packages/app/src/server/diagnostic/test-support.ts`)로만 한다.

## 사용자 결정 (2026-11-10, 질문 1~5)

1. **개발자에게만 보인다.** 화면은 `/diagnostic?dev=1`일 때만 지도·이동 버튼을 그린다. 서버의 개발자 API는 환경 변수 `CSAT_DIAGNOSTIC_DEV=1`일 때만 등록한다(없으면 404). `?dev=1` 없이 들어오면 지금 동작과 완전히 같다.
2. **앞으로도 건너뛸 수 있다(안 나).** 아직 가지 않은 단계·지문으로 간다. 건너뛴 단계는 비워 둔다: 요약 생략, 답이 없는 문항은 판정·피드백 없음. **가짜 답·판정을 채우지 않는다.**
3. **돌아간 화면은 읽기 전용(안 가).** 고치려면 지문마다 둔 "지문 초기화"로 그 지문을 시작 전으로 되돌려 처음부터 다시 한다.
4. **이전·다음 화면은 전체 흐름 한 줄(안 가).** 한 칸씩 움직이며, 다음 칸이 아직 가지 않은 단계면 2의 건너뛰기로 넘어간다.
5. **지도에 위치와 상태(안 나).** 칸마다 상태와 지문마다 "지문 초기화" 버튼.

## 목표

- `/diagnostic?dev=1`(서버 `CSAT_DIAGNOSTIC_DEV=1`)에서 화면 위쪽(또는 옆)에 접을 수 있는 **개발자 지도**가 있다.
  - 구조: 지문 > 단계(요약 · 답 입력 · 중간 · 피드백) > 칸(요약은 문단, 답 입력은 화면 하나, 피드백은 문항). 맨 끝에 결과.
  - 칸마다 상태 하나: `미진행` / `진행 중`(지금 단계) / `완료` / `판정 중` / `판정 실패` / `건너뜀`. 지금 보는 칸은 따로 강조.
  - 칸을 누르면 그 화면으로 간다.
  - 지문마다 "지문 초기화" 버튼(확인 창 한 번).
- 지도 옆에 **"이전 화면" / "다음 화면"** 버튼. 전체 흐름 한 줄 순서는 아래 "흐름 한 줄" 절.
- 지나온 화면은 읽기 전용으로 다시 보인다(요약 대화 기록, 낸 답, 받은 피드백).
- 개발자 모드가 아닐 때 화면·API·시험 결과는 지금과 같다.

## 흐름 한 줄 (이전·다음의 순서)

지문 1: 요약 문단 1…n(요약을 고르지 않았거나 건너뛰면 "요약" 칸 하나) → 답 입력 → 중간 화면 → 피드백 문항 1…k → 지문 2: … → 결과.

"요약 선택" 화면(ChoosePage)은 지문의 요약 칸 앞에 둔다(NOT_STARTED일 때만 의미가 있다).

## 서버 (`packages/app/src/server/diagnostic/`)

### 개발자 API (`CSAT_DIAGNOSTIC_DEV=1`일 때만, `http.ts`)

접두 `/api/diagnostic/participant/:id/dev/`. 모두 개발자 전용이며 학생 API의 동작은 바꾸지 않는다.

| 메서드·경로 | 동작 |
|---|---|
| `GET dev/map` | 지도 자료: 지문마다 `status`, `summaryChosen`, 요약 문단 수·문단별 첫 응답 유무, 문항마다 `{ questionId, questionNumber, answered(첫 응답 유무), draft 유무, firstJudgment.status, feedbackPhase(세션 있으면), skipped }`, `feedbackCursor`, 결과 가능 여부 |
| `GET dev/passage/:pid/summary` | 요약 대화 읽기(상태와 무관). 메모리에 세션이 없으면(서버 재시작 등) 409와 "요약 기록을 불러올 수 없음" |
| `GET dev/passage/:pid/answers` | 낸 첫 응답(`item.first`) 또는 draft를 읽기 전용으로. 정답은 넣지 않는다 |
| `POST dev/passage/:pid/skip` 본문 `{ to: 'ANSWERING' \| 'FEEDBACK' \| 'DONE' }` | 앞으로만 건너뛴다(뒤로는 409). 아래 "건너뛰기 규칙" |
| `POST dev/item/:qid/skip-to` | 피드백 중인 지문에서 커서를 그 문항까지 앞으로 옮긴다. 지나친 문항은 `skipped` 표시 |
| `POST dev/passage/:pid/reset` | 지문 초기화. 아래 "초기화 규칙" |

### 건너뛰기 규칙

- `NOT_STARTED → ANSWERING`: `summaryChosen = false`와 구분되도록 상태에 `devSkipped.summary = true`를 남긴다(결과 화면의 "요약 고름" 판정에는 `summaryChosen`만 쓰므로 영향 없음).
- `SUMMARY → ANSWERING`: 기존 `summaryFinish`와 같다.
- `ANSWERING → FEEDBACK`: 기존 `answersDone`과 같되, **draft가 없는 문항은 첫 응답 없이 둔다**(`first = null`, 세션 없음, `skipped = true`). draft가 있는 문항만 지금처럼 확정·판정 시작. 모두 비었으면 바로 `DONE`.
  - 피드백 커서는 답이 없는 문항을 자동으로 지나친다.
  - `summaryCard`·`result`·`position`·`itemView` 등 `item.first!`를 쓰는 곳(현재 5곳)은 `first === null` 문항을 빼고 계산하도록 고친다. 학생 흐름에서는 모든 문항에 답이 있으므로 결과가 바뀌지 않아야 한다(시험으로 확인).
- `→ DONE`: 위를 거친 뒤 남은 피드백 문항을 모두 `skipped`로 두고 `DONE`.
- `AWAITING_JUDGMENT`(판정 중) 지문의 `skip to: FEEDBACK`은 판정을 기다리지 않고 `FEEDBACK`으로 둔다. 판정 중 문항의 피드백 화면은 지금처럼 대기 보기를 보인다.
- 건너뛰기마다 이벤트 `DEV_SKIP`(`{ passageId, from, to }` 또는 `{ questionId }`)를 남긴다.

### 초기화 규칙

- 지문 상태를 `create()` 때와 같은 초기값으로 되돌린다(지문 상태, 그 지문 문항의 `items`, 그 지문 문단의 `analysis`).
- 진행 중인 백그라운드 판정·진단·분석이 초기화 뒤에 끝나 옛 결과를 써넣지 않게 한다(문항·지문별 세대 번호 등). 방법은 실행자가 고르되 시험으로 확인한다.
- 이벤트 `DEV_RESET`(`{ passageId }`). 이벤트 기록(`events.jsonl`)은 지우지 않는다.

### 기타

- `progress().current`는 그대로 둔다(학생 흐름용). 개발자 화면은 `dev/map`으로 자기 위치를 정한다.
- 저장 형식(`store.ts` 스키마)에 새 필드(`devSkipped`, `skipped`, 세대 번호)를 더하면 옛 파일을 읽을 때 기본값으로 채운다.

## 화면 (`packages/app/src/client/`)

- `DiagnosticApp.tsx`: `?dev=1`이면 지도·이전/다음 버튼을 그리고, 지도·버튼이 정한 화면을 띄운다. 개발자 모드에서는 `route()`의 "첫 미완료 지문" 규칙 대신 지도에서 고른 위치를 쓴다.
- 새 파일 `diagnostic/DevMap.tsx`(+ 필요하면 `diagnostic/dev-api.ts`): 지도, 상태 표시, 지문 초기화, 이전·다음 버튼.
- 읽기 전용 화면:
  - 요약: 지나온 요약 대화(`dev/passage/:pid/summary`)를 입력 칸 없이 보인다. 불러올 수 없으면 그 사실을 한 줄로 보인다.
  - 답 입력: 낸 답(`dev/passage/:pid/answers`)을 선지 표시와 근거 글로 보이고, 입력·버튼은 막는다.
  - 피드백: 지나온 문항은 지금도 읽기 가능(`feedbackTarget` read)하므로 그대로 쓰고, 입력은 막는다.
- 앞으로 가는 칸·"다음 화면"이 건너뛰기를 부르면 확인 창 없이 바로 부른다(초기화만 확인 창).
- 화면 글자는 개발자용이므로 짧은 한국어면 된다. 학생용 문구(D-0209)는 건드리지 않는다.

## 범위 밖

- 학생 흐름(`?dev=1` 없음)의 동작·문구 변경. 메모 1~5번(`memory/checkpoints/2026-11-10-diagnostic-v510-use-notes.md`)은 이번에 고치지 않는다.
- 돌아간 화면에서 답·요약을 고쳐 다시 내기(사용자 결정 3).
- 가짜 답·판정 채우기(사용자 결정 2).
- lab(`/problem/lab`)·문단 lab 화면, 판정 지시문, `packages/pipeline/**`.
- 커밋.

## 완료 조건

- [ ] 개발자 API는 `CSAT_DIAGNOSTIC_DEV=1`이 없으면 404, 있으면 위 표대로 동작한다(`http.test.ts`).
- [ ] 컨트롤러 시험(`controller.test.ts` 또는 새 `controller-dev.test.ts`, 가짜 평가기):
  - 각 건너뛰기(`NOT_STARTED→ANSWERING`, `SUMMARY→ANSWERING`, 일부만 답한 `ANSWERING→FEEDBACK`, `→DONE`, 피드백 `skip-to`)와 뒤로 건너뛰기 409.
  - 일부만 답한 지문: 답 있는 문항만 판정이 시작되고, 커서가 답 없는 문항을 지나치고, `summaryCard`·`result`가 답 있는 문항만 센다.
  - 초기화 뒤 그 지문이 `NOT_STARTED`이고, 초기화 전에 시작된 판정이 나중에 끝나도 초기화된 문항에 써넣지 않는다.
  - 모든 문항에 답한 학생 흐름의 `summaryCard`·`result`가 바뀌지 않는다(기존 시험 통과).
- [ ] 화면: `?dev=1`에서 지도·이전/다음이 보이고, 없으면 보이지 않는다. 기존 진단 화면 시험이 있으면 통과한다. 가능하면 가짜 평가기 서버로 Playwright 한 번(지도에서 지문 2 답 입력으로 건너뛰기 → 이전 화면 → 지문 초기화).
- [ ] `npm run build` 통과, `npx vitest run packages/app/src/server/diagnostic packages/app/src/client` 통과, `npm test`는 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`) 외 실패 없음.
- [ ] 아래 결과 보고 칸을 채웠다.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 예:
  - `first === null` 문항을 빼는 변경이 학생 흐름의 결과를 바꾸게 되는 경우.
  - 백그라운드 작업을 초기화와 안전하게 분리할 방법이 없는 경우.
  - 요약 대화 읽기에 `SimpleDialogueController`(문단 쪽) 변경이 필요한 경우.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 서버: `packages/app/src/server/diagnostic/controller.ts`(개발자 메서드 6개, `confirmAnswers` 분리, `freshPassage`·`freshItem` 추출, 답 없는 문항 처리, 초기화 뒤 옛 작업 차단), `http.ts`(`dev/*` 경로, `CSAT_DIAGNOSTIC_DEV=1`일 때만), `store.ts`(`devSkipped`·`skipped` 선택 필드).
  - 화면: `client/DiagnosticApp.tsx`(`?dev=1`이면 `DevDiagnostic`), 새 파일 `diagnostic/DevMap.tsx`·`DevDiagnostic.tsx`·`dev-api.ts`·`dev-flow.ts`·`Containers.tsx`(MidContainer·ResultContainer를 DiagnosticApp에서 옮김), 수정 `FeedbackScreen.tsx`·`SummaryDialogue.tsx`(`readOnly`), `Pages.tsx`·`types.ts`(답 없는 지문의 중간 화면), `api.ts`(`request`·`at` 내보냄), `diagnostic.css`.
  - 시험: 새 `controller-dev.test.ts`(15), `http.test.ts`(+1), `client/diagnostic/dev-flow.test.ts`(9), `e2e/diagnostic-dev-navigation.spec.ts`(Playwright 1).
- 시험 결과:
  - `npm run build` 통과, `tsc --noEmit -p packages/app/tsconfig.client.json` 통과.
  - `npx vitest run packages/app/src/server/diagnostic packages/app/src/client`: 18 파일 228 통과.
  - `npm test`: 134 파일 통과, 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`, 기존 실패와 같음).
  - Playwright(`CSAT_API_PORT=5484 PLAYWRIGHT_CLIENT_PORT=5483`, 가짜 평가기): 지도에서 지문 2 답 입력으로 건너뛰기 → 이전 화면 → 지문 초기화 → 다음 화면, `?dev=1` 없으면 지도 없음. 1 통과. 끝난 뒤 두 포트 모두 비어 있음.
- 인계 문서와 다르게 한 점:
  - `result()`의 답한 지문 선별과 `answeredPassages()`를 "모든 문항 답함"에서 "한 문항이라도 답함"으로 바꿈(답 있는 문항만 세려면 필요. 학생 흐름은 같음).
  - `summaryCard.position`이 답한 문항이 없으면 null(타입 `PositionView | null`, 중간 화면은 "답한 문항이 없어"). 학생 흐름에서는 null이 되지 않음.
  - 지도 칸 정의(문서에 없던 세부): 요약 선택 칸은 시작 전에만, 요약 칸은 시작 뒤에만 있다. 시작 전 지문에서 "다음 화면"은 요약 선택 → 답 입력(요약 건너뜀)이다. "중간" 칸 또는 문항 칸으로 앞서 가면 서버 `skip to: FEEDBACK`을 부른다(중간 화면을 위한 별도 API 값은 없음).
  - 초기화 뒤 옛 작업 차단은 세대 번호 대신 "객체 교체 + 작업 안의 동일성 검사"로 함(저장 형식에 세대 필드 없음). 문항 판정 쪽 검사는 이 방식 없이도 시험이 통과해, 시험으로 그 검사 단독 효과는 입증하지 못함(문단 판정 쪽은 검사를 빼면 시험이 실패함).
  - 지도 UI는 화면 위쪽 고정 막대(접을 수 있음). `http.ts`의 `handleDiagnosticRequest`에 선택 인자 `dev`(기본: 환경 변수)를 더함.
- 남은 문제:
  - 답이 하나도 없는 채로 모든 지문을 건너뛰면 결과 화면의 위치 칸이 계속 "계산 중"으로 보인다(개발자 모드 한정, 미처리).
  - 서버를 다시 켠 뒤 요약 대화 읽기는 409("요약 기록을 불러올 수 없음")로 한 줄 안내(설계대로).
  - 지도가 열려 있으면 화면 높이의 약 34%를 쓴다(접으면 한 줄).
