# 인계: 단순 형식 문단 개발자 모드 (simple-holistic)

- 날짜: 2026-10-16
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0140-paragraph-simple-holistic-dev-mode.md`, `memory/decisions/D-0139-paragraph-simple-format-question-rules.md`, `memory/decisions/D-0116-student-facing-tone-banmal.md`

## 목표

사용자가 기존 6지문으로 문단 요약을 직접 써 보며 사용감을 기록할 수 있는 개발자 전용 화면 `/dialogue/dev/simple`이 동작한다.

- 문단마다 학생 응답 → 모델 한 번 호출 → 서버가 행동 표로 다음 행동을 정한다 → 학생에게 말 한 마디를 보인다.
- 골드·축을 읽지 않는다. 입력은 지문과 이 문단의 대화뿐이다.
- 개발자 서랍에서 단계마다 판정·이유·원출력을 보고, 단계마다 인상 메모와 문단 전체 인상 메모를 남긴다. 메모는 자동 저장된다.
- 지문을 마치면 문제 개발자 화면(`/problem/dev/v4?questionId=<passage.problemQuestionId>`)으로 넘어갈 수 있다. 문단 기록은 넘기지 않는다.

## 범위 밖 (손대지 않는다)

- 운영 V4 문단 대화, `v4-boundary-show`, `conditional-meta-v1` 모드의 동작과 코드 경로. `packages/app/src/server/dialogue.ts`, `DialogueApp.tsx`는 수정하지 않는다(라우팅 한 줄 추가 제외, 아래 참고).
- 학생 상태 원장(`evidenceSink`, `student-state`)에 쓰지 않는다. 문제 판정에 `paragraphHandoff`를 넘기지 않는다.
- 골드 파일, 프롬프트 V4 계열, 문제 풀이 코드.
- 실모델 API 호출. 테스트는 모두 모의 평가기로 한다.

## 설계

### 1. 프롬프트 (작성 완료, 수정하지 않는다)

`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v1.md`. 런타임은 이 파일을 instructions로 읽는다(기존 프롬프트 로딩 방식을 따른다). 프롬프트 버전 문자열은 `paragraph-simple-holistic-v1`.

### 2. 파이프라인 모듈 (새로 만든다)

`packages/pipeline/src/paragraph-simple/` 아래에 둔다. `packages/pipeline/src/index.ts`에서 export한다.

**출력 스키마** (zod, strict JSON schema로 OpenAI에 전달):

```ts
category: 'CAPTURED' | 'GAP' | 'ONE_ERROR' | 'MULTI_ERROR' | 'IRRELEVANT' | 'COPY'
reason: string
errors: Array<{ studentQuote: string; correction: string; sourceQuote: string }>
gap: { description: string; sourceQuote: string } | null
targetErrorResolved: boolean | null
action: 'PRAISE' | 'RETRY_PROMPT' | 'GAP_QUESTION' | 'CORRECTION_QUESTION' | 'CLOSE_GAP' | 'CLOSE_ERRORS' | 'CLOSE_NO_RESPONSE'
message: string
coreSummary: string | null
```

**모델 입력** (user content에 JSON 한 덩어리):

```ts
{ passage: { title, paragraphs: [{ paragraphId, text }] },
  targetParagraph: { paragraphId, text },
  stage: 'INITIAL' | 'RETRY' | 'AFTER_CORRECTION' | 'AFTER_GAP',
  dialogue: Array<{ role: 'student' | 'tutor'; text: string }>,
  targetError: { studentQuote, correction, sourceQuote } | null,
  validationFeedback?: string }
```

**행동 표** (순수 함수 `expectedAction(stage, output)`, 프롬프트의 표와 같다):

| stage | 판정 | 행동 |
|---|---|---|
| INITIAL | CAPTURED | PRAISE |
| INITIAL | IRRELEVANT, COPY | RETRY_PROMPT |
| RETRY | IRRELEVANT, COPY | CLOSE_NO_RESPONSE |
| INITIAL, RETRY | GAP | GAP_QUESTION |
| INITIAL, RETRY | ONE_ERROR | CORRECTION_QUESTION |
| INITIAL, RETRY | MULTI_ERROR | CLOSE_ERRORS |
| RETRY | CAPTURED | PRAISE |
| AFTER_CORRECTION | targetErrorResolved=true 이고 CAPTURED | PRAISE |
| AFTER_CORRECTION | targetErrorResolved=true 이고 GAP | GAP_QUESTION |
| AFTER_CORRECTION | 그 밖의 모든 경우 | CLOSE_ERRORS |
| AFTER_GAP | CAPTURED | PRAISE |
| AFTER_GAP | ONE_ERROR, MULTI_ERROR | CLOSE_ERRORS |
| AFTER_GAP | GAP, IRRELEVANT, COPY | CLOSE_GAP |

**검증** (실패하면 `validationFeedback`에 이유를 담아 1회만 재요청, 그래도 실패면 오류 상태):

- `action === expectedAction(stage, output)`
- 개수: ONE_ERROR는 `errors.length === 1`, MULTI_ERROR는 `>= 2`, 그 밖에는 0. GAP이면 `gap !== null`, 아니면 null. `stage === 'AFTER_CORRECTION'`일 때만 `targetErrorResolved`가 boolean.
  - 예외: AFTER_CORRECTION에서 CLOSE_ERRORS이면 `errors.length >= 1`만 요구한다(남은 오류). AFTER_GAP에서 CLOSE_ERRORS도 `>= 1`.
- `studentQuote`는 이 문단 학생 발화 중 하나의 연속 부분 문자열이어야 한다.
- `sourceQuote`는 `targetParagraph.text`의 연속 부분 문자열이어야 한다(공백 정규화 없이 `indexOf`).
- `coreSummary`는 CLOSE_ERRORS·CLOSE_NO_RESPONSE이면 비어 있지 않은 문자열, 그 밖에는 null.
- `message`는 비어 있지 않아야 한다.

**문단 상태 기계** (순수 함수, 서버와 분리해 테스트한다):

- 상태: `stage`, `retryUsed`, `questionsAsked`(0~2), `targetError`, `done`, `outcome`.
- 학생 응답 → 평가 → 행동 적용:
  - PRAISE: done, outcome `CAPTURED`.
  - RETRY_PROMPT: 다음 stage `RETRY`, `retryUsed = true`.
  - CLOSE_NO_RESPONSE: done, outcome `NO_RESPONSE` ("응답 없음으로 넘어감").
  - GAP_QUESTION: 다음 stage `AFTER_GAP`, `questionsAsked += 1`.
  - CORRECTION_QUESTION: 다음 stage `AFTER_CORRECTION`, `targetError = errors[0]`, `questionsAsked += 1`.
  - CLOSE_GAP: done, outcome `GAP_REVEALED`, 표시 구절 = `gap.sourceQuote`.
  - CLOSE_ERRORS: done, outcome `ERRORS_REVEALED`, 표시 구절 = 모든 `errors[].sourceQuote`.
- 불변식: 행동 표상 문단당 질문은 최대 2회다(교정 1 + 구멍 1). 상태 기계는 세 번째 질문 행동이 나오면 불변식 위반 오류를 던진다. 정상 흐름에서 도달할 수 없음을 테스트로 확인한다.
- 표시(미색) 구절은 마무리 행동(CLOSE_GAP, CLOSE_ERRORS)에서만 화면에 준다. 질문 행동에서는 주지 않는다.

**OpenAI 평가기:** `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`의 `OpenAIFeedbackEvaluator` 호출 방식을 따른다(`responses.create`, `store: false`, `reasoning: { effort: 'medium' }`, strict json_schema, `maxRetries: 0`, timeout 60초, 호출 메타데이터·토큰 기록). 모델 기본값 `gpt-5.6-terra`, 환경 변수 `PARAGRAPH_SIMPLE_OPENAI_MODEL`로 바꿀 수 있다. 평가기 인터페이스를 두어 테스트에서 모의 평가기를 주입한다.

### 3. 서버 (새로 만든다)

`packages/app/src/server/dialogue-simple.ts`에 컨트롤러를 둔다. `problem-feedback-v4.ts`의 구조(세션 Map, transitionId 멱등성, 평가 중 busy 처리, 실패 시 재시도 가능 상태)를 참고한다.

- 지문은 기존 `loadDialoguePassages()`로 읽되 `goldPath`는 쓰지 않는다. 문단 텍스트와 `problemQuestionId`만 쓴다.
- 세션: `{ sessionId, passageId, paragraphs: Map<index, ParagraphState + transcript + steps> , currentIndex }`. 개발자가 문단을 자유롭게 오갈 수 있다(완료 여부와 무관).
- 단계(step) 기록: 모델 호출 한 번 = 한 단계. `{ stepIndex, stage, studentText, output(원출력), expectedAction, action, validation(실패 이력), call(메타데이터), message, highlights }`.
- 로그: `.omc/logs/dialogue-experiment/simple-holistic/` 아래
  - `sessions.jsonl`: 단계마다 한 줄(세션·문단·단계 전체 기록)
  - `memos.jsonl`: 메모 저장마다 한 줄 `{ savedAt, sessionId, passageId, paragraphId, stepIndex: number | null, text }` (stepIndex null = 문단 전체 인상). 덮어쓰지 않고 추가만 한다. 읽을 때는 같은 키의 마지막 줄이 현재 값이다.
- API (접근 규칙은 `/api/developer/problem-feedback-v4/`와 같게: loopback 요청이거나 기존 공개 플래그가 켜진 `dialogue.cogaxis.net`):
  - `POST /api/developer/dialogue-simple/session` `{ passageId }` → 세션 view
  - `GET /api/developer/dialogue-simple/session/:id` → view
  - `POST /api/developer/dialogue-simple/session/:id/respond` `{ transitionId, paragraphIndex, text }` → view
  - `POST /api/developer/dialogue-simple/session/:id/navigate` `{ paragraphIndex }` → view
  - `GET /api/developer/dialogue-simple/session/:id/inspect?paragraphIndex=` → 단계 목록(원출력 포함)과 메모 현재값
  - `POST /api/developer/dialogue-simple/session/:id/memo` `{ paragraphIndex, stepIndex: number | null, text }` → 저장된 메모
- 공개 view에는 학생 화면에 필요한 것만 담는다: 문단 텍스트, 대화(학생 발화·튜터 메시지), 현재 문단 done 여부, 마무리 표시 구절 위치(start/end, 문단 텍스트 기준), 입력 가능 여부, 진행 상태, 지문 완료 시 문제 화면 주소. 판정·이유·원출력은 inspect에서만 준다.
- 평가 실패(검증 2회 실패, 타임아웃, API 오류): 학생 발화는 보존하고 "다시 시도" 가능한 상태로 둔다. 로그에 실패를 남긴다.

### 4. 클라이언트 (새로 만든다)

- `packages/app/src/client/main.tsx`: `/dialogue/dev/simple` 경로를 `/dialogue` 분기보다 먼저 `SimpleDialogueApp`으로 보낸다(이 한 줄 분기만 추가).
- `packages/app/src/client/SimpleDialogueApp.tsx` (+ 필요하면 `simple-dialogue-api.ts`, `SimpleDialogueDrawer.tsx`, CSS):
  - 지문 선택 → 세션 시작. URL에 `sessionId` 유지.
  - 레이아웃은 기존 개발자 문단 화면처럼 왼쪽 지문(현재 문단 강조), 오른쪽 대화와 입력창. 기존 CSS(`dialogue-workbench.css`)와 `AnnotatedText`의 `highlights` 표시를 재사용해 마무리 구절을 미색으로 칠한다.
  - 문단 목록에서 자유 이동. 문단이 done이면 입력창 대신 [다음 문단] 버튼. 마지막 문단까지 끝나면 [문제 풀기]로 문제 개발자 화면 이동.
  - 평가 중에는 입력을 막고 대화창에 기다림 표시. 실패하면 [다시 시도].
  - 개발자 서랍(버튼으로 열기): 현재 문단의 단계 목록. 단계마다 stage, 분류, 기대 행동/적용 행동, 이유, errors/gap(인용 포함), 검증 실패 이력, 모델·토큰·소요 시간, 원출력(접기), 그리고 **인상 메모 textarea**. 맨 위 또는 맨 아래에 **문단 전체 인상 textarea**. 메모는 입력이 멈춘 뒤 1초 또는 포커스를 잃을 때 자동 저장하고 "저장됨" 표시. 서랍을 다시 열면 저장된 메모를 불러온다.

## 완료 조건

- [ ] 상태 기계·행동 표·검증 단위 테스트: 행동 표의 13줄 모두, 질문 최대 2회 불변식, 인용 검증 실패 → 1회 재요청 → 실패 시 오류, CLOSE에서만 표시 구절 생성.
- [ ] 서버 테스트(모의 평가기): 흐름 시나리오 8개 — 칭찬 종료 / 무관→재시도→칭찬 / 무관→재시도→무관 종료 / 구멍→해결 / 구멍→미해결 표시 / 오류1→교정→구멍→미해결 / 오류1→교정 실패 / 오류2 즉시 공개. 각 시나리오에서 질문 수 ≤ 2, 질문 단계 view에 표시 구절 없음.
- [ ] 메모 저장·재조회·수정 이력(추가만) 테스트, 단계 메모와 문단 메모 구분.
- [ ] 학생 상태 원장에 쓰지 않음, 문제 화면 주소에 handoff를 싣지 않음을 테스트로 확인.
- [ ] HTTP 테스트: 새 엔드포인트 접근 규칙(loopback 허용, 비공개 host 404).
- [ ] 기존 테스트 회귀 없음: `npm test`, `npm run typecheck`, `npm run build` 통과. 기존 실패가 있으면 이번 변경과 무관함을 보고한다.
- [ ] 실모델 API를 호출하지 않았다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 프롬프트 파일을 고쳐야 할 것 같으면 고치지 말고 보고한다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 새로 만듦: `packages/pipeline/src/paragraph-simple/{schema,rules,evaluator,index}.ts`, `rules.test.ts`, `evaluator.test.ts`
  - 새로 만듦: `packages/app/src/server/dialogue-simple.ts`, `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`, `packages/app/src/shared/dialogue-simple.ts`
  - 새로 만듦: `packages/app/src/client/{SimpleDialogueApp.tsx,SimpleDialogueDrawer.tsx,simple-dialogue-api.ts,simple-dialogue.css}`
  - 수정: `packages/pipeline/src/index.ts`(export 한 줄), `packages/app/src/server/index.ts`(라우팅·접근 규칙·옵션 2개), `packages/app/src/server/content.ts`(`readJsonlLines` 추가), `packages/app/src/client/main.tsx`(분기 한 줄)
- 테스트 결과:
  - 새 테스트 `npx vitest run packages/pipeline/src/paragraph-simple packages/app/src/server/dialogue-simple`: 4파일 57개 통과 (행동 표·검증·상태 기계 40, 서버 흐름·메모 15, HTTP 2).
  - `npm test`: 110파일 중 108 통과, 2 실패(1265개 중 1263 통과). 실패 2건은 이번 변경과 무관: `packages/app/src/boundary.test.ts`(미수정 `server/student-state.ts`가 node:fs를 import), `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`(없는 `.omc/adhoc/...` 파일 ENOENT). 두 파일 모두 이번 작업에서 건드리지 않았다.
  - `npm run typecheck`, `npm run build`, `npx tsc -p packages/app/tsconfig.client.json`: 통과.
  - 실모델 API는 호출하지 않았다(OpenAI 평가기는 모의 전송으로만 검증).
- 남은 문제:
  - 화면(브라우저)은 타입체크만 했고 직접 띄워 보지 않았다. 레이아웃·서랍 메모 자동 저장은 눈으로 확인이 필요하다.
  - 서버 세션은 메모리에만 있어 서버를 재시작하면 `sessionId` URL로 복원되지 않는다(로그 파일은 남는다).
