# 개발자 문단 요약 화면(`/dialogue/lab`) 작동 순서

작성일: 2026-10-25. 대상: 운영 후보 단순 형식 v4.7(판정 모델 luna)을 돌리는 개발자 문단 요약 경로(D-0174, D-0140).
이 문서는 코드를 직접 읽고 쓴 운영 기록이다. 근거 표기는 저장소 루트 기준 `파일:줄`이다.
약칭: `PA` = `packages/app/src`, `PS` = `packages/pipeline/src/paragraph-simple`, `PE` = `packages/pipeline/experiments/dialogue`.
코드에서 확인하지 못한 것은 '미확인'으로 적는다. 본보기 형식은 `docs/PROBLEM-LAB-FLOW-2026-10-24.md`이다.
2026-10-25 6절 처리로 코드가 바뀌었다(`docs/handoffs/2026-10-25-lab-flow-check-items.md`). 바뀐 동작은 본문에 반영했고, 바뀐 파일의 다른 줄 번호는 1~2줄 어긋날 수 있다.

## 1. 개요

### 1.1 주소와 서버

- 화면 주소는 `/dialogue/lab`이다. `pathname === '/dialogue/lab'`이면 `SimpleDialogueApp`을 그린다 (`PA/client/main.tsx:39-40`).
- 옛 주소 `/dialogue/dev/simple`은 쿼리·해시를 유지한 채 `/dialogue/lab`으로 바꾼다 (`PA/client/main.tsx:26-29`). 이 바꿈은 `createRoot(...).render` 호출 앞에서 일어난다 (`:31`).
- 축 기반 개발자 화면 `/dialogue/dev`와 학생용 `/dialogue`는 다른 컴포넌트(`DialogueApp`)이며 이 문서의 대상이 아니다 (`PA/client/main.tsx:41-42`). 학생용 전환은 하지 않았다 (D-0174 결정 2번째 항목).
- 화면 안 기준 주소는 `const base = '/dialogue/lab'`이다. 세션을 받을 때마다 주소를 `/dialogue/lab?sessionId=<id>`로 바꾼다 (`PA/client/SimpleDialogueApp.tsx:13`, `:28-31`).
- 첫 로드 때 URL을 읽는다 (`PA/client/SimpleDialogueApp.tsx:41-53`, `PA/client/dev-part-nav-links.ts:4-9`).
  - `sessionId`가 있으면 그 세션을 조회하고, `paragraph`(0부터 정수)가 있고 현재 문단과 다르면 `navigate`를 호출한다.
  - `sessionId`가 없고 `passageId`와 `paragraph`가 모두 있으면 새 세션을 열고 `paragraph > 0`이면 `navigate`를 호출한다.
  - 둘 다 없으면 지문 목록(시작 화면)을 보인다 (`:66-78`).
- 별도 서버가 아니다. 문단 API는 문제 API(5175 분리 listener)와 달리 기본 서버 `createLearningServer`의 라우트이다 (`PA/server/index.ts:183-186`, `:253-276`). vite(5173)는 `/api/developer/dialogue-simple`에 대한 전용 프록시가 없어 `/api` 일반 규칙(`CSAT_API_PORT`, 없으면 5174)으로 보낸다 (`packages/app/vite.config.ts:20-22`).
- 접근 규칙 (`PA/server/index.ts:149-150`, `:198-201`, `:222-223`, `:253-255`):
  - 개발자 API는 `CSAT_DEVELOPER_MODE=1`일 때만 열린다. 아니면 403이다.
  - 문단 API는 loopback(`localhost`, `127.0.0.1`, `[::1]`)이거나, `problemFeedbackPublic`(`CSAT_PROBLEM_LAB_PUBLIC=1`, 옛 `CSAT_PROBLEM_V4_PUBLIC`)이면서 호스트가 `dialogue.cogaxis.net`일 때만 열린다. 아니면 404다. 코드 주석은 "유료 평가기를 새로 노출하므로 문제 풀이 개발자 화면과 같은 접근 규칙"이라고 적는다 (`:254`).
- 지문 목록 `GET /api/dialogue/passages`는 `/api/developer/` 아래가 아니어서 위 접근 규칙을 거치지 않는다 (`PA/server/index.ts:297-299`, `PA/client/api.ts:95-97`). 6절 확인 필요 1.
- 세션은 서버 메모리의 `Map`에 있다 (`PA/server/dialogue-simple.ts:55`). 서버를 다시 띄우면 조회가 '단순 형식 문단 세션을 찾을 수 없습니다.'로 실패한다 (`:224-226`). 이때 화면은 `sessionId` 조회 실패 문구를 오류 칸에 보이고, 세션이 없으므로 시작 화면이 남는다 (`PA/client/SimpleDialogueApp.tsx:43-44`, `:66-78`). 디스크 기록은 4절에 있다.

### 1.2 API 라우트

| 메서드·경로 | 동작 | 근거 |
|---|---|---|
| `POST /api/developer/dialogue-simple/session` `{passageId}` | 세션 시작. `passageId`가 문자열이 아니면 400 | `PA/server/index.ts:256-260`, `PA/server/dialogue-simple.ts:65-71` |
| `GET …/session/:id` | 현재 보기 조회 | `PA/server/index.ts:264`, `PA/server/dialogue-simple.ts:72` |
| `POST …/session/:id/respond` `{transitionId, paragraphIndex, text}` | 학생 요약·답 제출, 모델 판정 | `PA/server/index.ts:271`, `PA/server/dialogue-simple.ts:14-16`, `:82-102` |
| `POST …/session/:id/navigate` `{paragraphIndex}` | 보는 문단 이동(모델 호출 없음) | `PA/server/index.ts:272`, `PA/server/dialogue-simple.ts:74-80` |
| `POST …/session/:id/attempt` `{paragraphIndex}` | 새 시도(모델 호출 없음) | `PA/server/index.ts:273`, `PA/server/dialogue-simple.ts:105-118` |
| `GET …/session/:id/inspect?paragraphIndex=N` | 서랍용 단계별 판정·메모 조회(재채점 없음). `paragraphIndex`가 0 이상 정수가 아니면 400 | `PA/server/index.ts:265-270`, `PA/server/dialogue-simple.ts:120-132` |
| `POST …/session/:id/memo` `{paragraphIndex, attemptNumber, stepIndex, text}` | 인상 메모 저장 | `PA/server/index.ts:274`, `PA/server/dialogue-simple.ts:134-146` |

- 클라이언트 호출 함수는 `PA/client/simple-dialogue-api.ts:15-22`에 있다. 요청 실패 시 서버가 준 `error` 문구를 예외 메시지로 쓴다 (`:8-11`).
- 그 밖의 경로는 404 '등록되지 않은 단순 형식 문단 API입니다.'이다 (`PA/server/index.ts:276`).

### 1.3 모델과 환경변수

- 판정 모델 기본값은 `gpt-6-luna`이다 (`PS/evaluator.ts:65`, `PS/evaluator.ts:73`). 코드 주석은 "운영 후보 판정 모델(D-0174). 환경변수 `PARAGRAPH_SIMPLE_OPENAI_MODEL`로만 바꾼다"이다 (`PS/evaluator.ts:64`).
- 우선순위는 생성자 `options.model`, 환경변수 `PARAGRAPH_SIMPLE_OPENAI_MODEL`, 기본값 순이다 (`PS/evaluator.ts:73`). `SimpleDialogueController`는 `new OpenAISimpleEvaluator()`를 인자 없이 만든다 (`PA/server/dialogue-simple.ts:60`). 따라서 실제 서버에서는 환경변수 또는 기본값이다.
- 요청 형식: Responses API, `store: false`, `reasoning.effort: 'medium'`, `max_output_tokens` 기본 8000, JSON Schema `strict: true`, 스키마 이름 `paragraph_simple_holistic`, 시간 제한 기본 60초, SDK 재시도 0 (`PS/evaluator.ts:74-80`).

### 1.4 버전 표기

| 항목 | 값 | 근거 |
|---|---|---|
| 프롬프트 버전 문자열(`promptVersion`) | `paragraph-simple-holistic-v4.7` | `PS/schema.ts:4` |
| 프롬프트 파일 | `PE/paragraph-simple-holistic-prompt-v4.7.md` (제목도 v4.7) | `PS/evaluator.ts:66`, 프롬프트 `:1` |
| 기록 `schemaVersion` | `dialogue-simple-holistic-record-v2` | `PA/server/dialogue-simple.ts:197` |
| API 접두 | `/api/developer/dialogue-simple/` (버전 없음, 유지) | `PA/server/index.ts:253`, D-0174 |
| 기록되는 모델 메타 | 단계마다 `provider/model/promptVersion/durationMs/토큰/attempts` | `PS/evaluator.ts:9-12`, `:84-87`, `PA/server/dialogue-simple.ts:187-188` |

- 코드 이름(파일·타입·함수)에는 버전이 없다 (D-0174 결정 마지막 항목; D-0173 원칙). 버전은 프롬프트 파일 이름, `promptVersion`, 위 `schemaVersion`에만 있다.
- 프롬프트 파일 안의 "v4.5" 언급은 서버의 원문 옮겨 적기 감지 도입 시점 표기이다 (`PS/copy.ts:2`, `PS/schema.ts:63`).

### 1.5 문제 화면으로의 연결

- 지문 JSON에 `problemQuestionId`가 있으면 연결된 문제가 있는 것이다 (`PA/server/content.ts:62`). 보기(view)는 `problemQuestionId`를 완료 여부와 무관하게 준다 (`PA/server/dialogue-simple.ts:247`).
- `problemUrl`: 모든 문단이 완료(`allDone`)이고 `problemQuestionId`가 있을 때만 `problemLink(questionId, sessionId)`, 즉 `/problem/lab?questionId=<id>&returnTo=/dialogue/lab?sessionId=<id>`이다. 아니면 null (`PA/server/dialogue-simple.ts:247`, `PA/shared/problem-link.ts`). 파트 이동 막대의 [문제] 링크와 같은 주소다(6절 6번에서 수정).
- 마지막 문단이 끝나면 [문제 풀기] 버튼이 `problemUrl`로 이동한다 (`PA/client/SimpleDialogueApp.tsx:138`). 마지막 문단인데 `allDone`이 아니면 '끝나지 않은 문단이 있어요' 안내만 보인다 (`:139`).
- 원문 패널의 파트 이동 막대(`DevPartNav`) 맨 끝 [문제] 버튼은 `problemLink`를 쓴다. 이 링크는 `returnTo=/dialogue/lab?sessionId=<id>`를 붙인다 (`PA/client/SimpleDialogueApp.tsx:113`, `PA/client/dev-part-nav-links.ts:11-13`). 이 버튼은 문단이 끝났는지와 무관하게 `problemQuestionId`만 있으면 눌린다 (`PA/client/DevPartNav.tsx:14-15`).
- 문제 화면은 `returnTo`를 `resolveReturnTo`로 검사해, `/dialogue/lab?sessionId=<id>`, `/dialogue/dev`, `/dialogue/dev?sessionId=<id>`, 옛 `/dialogue/dev/simple?sessionId=<id>`만 받고 나머지는 `/dialogue/lab`으로 바꾼다 (`PA/client/dev-part-nav-links.ts:15-19`, `PA/client/ProblemLabApp.tsx:24-25`). [문제 풀기]와 [문제] 모두 같은 세션(`/dialogue/lab?sessionId=<id>`)으로 돌아간다.
- 문제 화면의 문단 이동은 `returnTo`가 `/dialogue/lab?sessionId=`로 시작하면 `&paragraph=<i>`를 붙여 같은 세션으로, 아니면 `/dialogue/lab?passageId=…&paragraph=…`로 새 세션을 연다 (`PA/client/dev-part-nav-links.ts:21-25`).

## 2. 전체 흐름도

### 2.1 상태 이름

- 문단 시도 상태 `stage`: `INITIAL`, `RETRY`, `AFTER_CORRECTION`, `AFTER_GAP` (`PS/schema.ts:10`).
- 모델이 고르는 판정 `category`: `CAPTURED`, `GAP`, `ONE_ERROR`, `MULTI_ERROR`, `IRRELEVANT`, `COPY` (`PS/schema.ts:6`).
- 행동 `action`: `PRAISE`, `RETRY_PROMPT`, `GAP_QUESTION`, `CORRECTION_QUESTION`, `CLOSE_GAP`, `CLOSE_ERRORS`, `CLOSE_NO_RESPONSE` (`PS/schema.ts:7-9`). 이 가운데 `CLOSE_*` 셋과, 질문 뒤의 `PRAISE`가 문단을 끝낸다.
- 종료 결과 `outcome`: `CAPTURED`, `NO_RESPONSE`, `GAP_REVEALED`, `ERRORS_REVEALED` (`PS/rules.ts:132`). 서랍 표시 문구는 '핵심을 잡음', '응답 없음으로 넘어감', '구멍을 알려 주고 마침', '오류를 바로잡고 마침'이다 (`PA/client/SimpleDialogueDrawer.tsx:6-8`).
- 문단 상태 `SimpleParagraphState`: `stage`, `retryUsed`, `questionsAsked`, `coreParts`, `targetError`, `targetGaps`, `done`, `outcome`, `revealQuotes` (`PS/rules.ts:135-148`). 시작 값은 `INITIAL`, `retryUsed=false`, `questionsAsked=0`, `done=false` (`PS/rules.ts:150-152`).
- 서버 런타임 `status`: `IDLE`, `PROCESSING`, `RETRYABLE_ERROR` (`PA/server/dialogue-simple.ts:31`). 시도(attempt)마다 따로 가진다 (`:25-33`).
- 질문 상한: 문단 시도당 질문(GAP_QUESTION 또는 CORRECTION_QUESTION)은 최대 2회, `MAX_SIMPLE_QUESTIONS = 2` (`PS/rules.ts:133`, `:164`).
- 학생 말풍선 이름: INITIAL '나의 요약', RETRY '다시 쓴 요약', AFTER_CORRECTION·AFTER_GAP '나의 답' (`PA/shared/dialogue-simple.ts:7-8`).
- 튜터 말풍선 이름: PRAISE '피드백', RETRY_PROMPT '다시 써 보기', CORRECTION_QUESTION '확인하기', GAP_QUESTION '생각해 보기', CLOSE_GAP '빠진 내용', CLOSE_NO_RESPONSE '문단 핵심', CLOSE_ERRORS '바로잡기' (`PA/server/dialogue-simple.ts:38-41`).

### 2.2 흐름도 (텍스트)

괄호 안 `[모델]`은 모델 호출이다. 모델 호출은 단계(stage)만 달라지는 같은 호출 하나다 (3절).

```
[시작] 시작 화면 [시작] 또는 [문단 N] → POST session → navigate(N>0)         (SimpleDialogueApp.tsx:71-76, dialogue-simple.ts:65-71)
   │  문단 런타임이 없으면 만들어 시도 1(stage=INITIAL)로 둔다                   (dialogue-simple.ts:217-222, 36-37)
   ▼
[학생] 문단 요약 입력 → [보내기] (⌘/Ctrl+Enter)  → POST respond                  (SimpleDialogueApp.tsx:84-95, 143-145)
   │  서버: 같은 transitionId면 이전 결과, 평가 중·종료 문단이면 거부, 실패 뒤 재제출이면 직전 학생 발화를 대체  (dialogue-simple.ts:86-95)
   │  → 학생 말풍선 추가, status=PROCESSING                                      (dialogue-simple.ts:96-97)
   ▼
[모델] 판정(stage 입력) → 코드 검증(≤2회) → applySimpleAction → 말풍선
   │
   ├─ 호출·검증 최종 실패 ──> status=RETRYABLE_ERROR, 입력은 유지, 버튼 [다시 시도], 문구 '피드백을 만들지 못했어…'   (dialogue-simple.ts:166-170, 245; SimpleDialogueApp.tsx:145)
   │
   ▼ 성공: 행동표(rules.ts:7-26)로 갈림
 stage = INITIAL
   ├─ CAPTURED ──────────────> PRAISE ───────────────> 종료(CAPTURED)                           (rules.ts:12; 159)
   ├─ IRRELEVANT / COPY ─────> RETRY_PROMPT ─────────> stage=RETRY, retryUsed=true              (rules.ts:13; 160)
   ├─ GAP ───────────────────> GAP_QUESTION ─────────> stage=AFTER_GAP, 질문 1                  (rules.ts:14; 165)
   ├─ ONE_ERROR ─────────────> CORRECTION_QUESTION ──> stage=AFTER_CORRECTION, 질문 1, 오류 지정  (rules.ts:15; 166)
   └─ MULTI_ERROR ───────────> CLOSE_ERRORS ─────────> 종료(ERRORS_REVEALED)                    (rules.ts:16; 169-172)
 stage = RETRY  (INITIAL과 같으나 IRRELEVANT / COPY만 다름)
   ├─ IRRELEVANT / COPY ─────> CLOSE_NO_RESPONSE ────> 종료(NO_RESPONSE)  (두 번째 무응답, 핵심 공개)   (rules.ts:13; 161)
   └─ 나머지는 INITIAL과 같다
 stage = AFTER_CORRECTION  (교정 질문에 답한 뒤)
   ├─ targetErrorResolved=true 이고 CAPTURED ─> PRAISE ───────> 종료(CAPTURED) + 부분별 핵심 상자      (rules.ts:18)
   ├─ targetErrorResolved=true 이고 GAP ──────> GAP_QUESTION ─> stage=AFTER_GAP, 질문 2            (rules.ts:19; 164-165)
   └─ 그 밖의 모든 경우 ─────────────────────> CLOSE_ERRORS ──> 종료(ERRORS_REVEALED)               (rules.ts:20)
 stage = AFTER_GAP  (번호 질문에 답한 뒤)
   ├─ CAPTURED ──────────────> PRAISE ───────────────> 종료(CAPTURED) + 부분별 핵심 상자            (rules.ts:22)
   ├─ ONE_ERROR / MULTI_ERROR > CLOSE_ERRORS ────────> 종료(ERRORS_REVEALED)                        (rules.ts:23)
   └─ GAP / IRRELEVANT / COPY > CLOSE_GAP ───────────> 종료(GAP_REVEALED)                           (rules.ts:24)

   COPY 판정이면 방금 학생 발화에 copied 표시를 달아, 이후 모델 입력에서 학생 이해로 치지 않게 한다  (dialogue-simple.ts:162-163; schema.ts:51-52)
   서버가 먼저 원문 옮겨 적기(sourceCopyDetected)를 정해 입력에 싣고, true면 판정은 COPY여야 한다   (evaluator.ts:30, 51-56; rules.ts:43)

[종료 뒤] done=true → 입력 칸 대신 '이 문단은 끝났어요.'                                         (SimpleDialogueApp.tsx:136)
   ├─ 마지막 문단이 아님 ──> [다음 문단] → navigate(index+1) → 그 문단은 INITIAL부터                (SimpleDialogueApp.tsx:137)
   ├─ 마지막 문단이고 모든 문단 완료, 연결 문제 있음 ──> [문제 풀기] → problemUrl (/problem/lab)      (SimpleDialogueApp.tsx:138; dialogue-simple.ts:246)
   ├─ 마지막 문단인데 끝나지 않은 문단이 있음 ──> 안내 문구만                                       (SimpleDialogueApp.tsx:139)
   └─ [새 시도] → 같은 문단에 시도 n+1(INITIAL), 이전 시도 보존, 진행 중이던 시도는 '중단'         (SimpleDialogueApp.tsx:96-100; dialogue-simple.ts:105-118)

[언제든] 상단 파트 이동 막대로 문단 이동(navigate) · [단계별 판정·메모] 서랍(inspect) · [나가기] → 시작 화면   (SimpleDialogueApp.tsx:101, 105-106, 111-113)
```

### 2.3 화면 쪽 공통 동작

- 제출은 `{transitionId(UUID), paragraphIndex, text}`로 보낸다 (`PA/client/SimpleDialogueApp.tsx:90`). 서버는 같은 `transitionId`·같은 내용이면 이전 `Promise` 결과를 돌려주고, 다른 내용이면 거부한다 (`PA/server/dialogue-simple.ts:85-90`). 평가 중에 새 제출은 거부하고, 종료된 문단 제출도 거부한다 (`:92-93`).
- 중복 제출 방지: 화면은 `inFlight`로 한 번에 한 작업만 돌린다 (`PA/client/SimpleDialogueApp.tsx:26`, `:32-37`). 제출 중에는 보내는 글이 `pending`으로 먼저 보이고 (`:87`, `:130`), 응답이 오면 사라진다 (`:93`).
- 실패한 제출은 초안을 지우지 않는다. 평가 실패가 아닐 때만 해당 문단 초안을 비운다 (`PA/client/SimpleDialogueApp.tsx:91`). 서버는 실패로 남은 직전 학생 발화를 새 제출로 대체한다 (`PA/server/dialogue-simple.ts:94-95`).
- 대기 문구 말풍선(`피드백` 라벨)은 단계·경과 시간으로 정한다 (`PA/client/simple-waiting.ts:4-9`, `PA/client/SimpleDialogueApp.tsx:131-132`). 25초 이상이면 모든 단계에서 '조금 오래 걸리고 있어. 조금만 더 기다려 줘'이다.
  - AFTER_CORRECTION: 6초 미만 '네 답을 읽고 있어', 이후 '아까 질문이랑 맞춰 보고 있어' (`:6`).
  - AFTER_GAP: 6초 미만 '네 답을 읽고 있어', 이후 '물어본 내용이 채워졌는지 보고 있어' (`:7`).
  - INITIAL·RETRY: 6초 미만 '네 요약을 읽고 있어', 6초 이상 '문단이랑 하나씩 맞춰 보고 있어', 15초 이상 '어떤 내용을 잡았는지 정리하고 있어' (`:8`).
- 지문 강조: 교정 질문을 기다리는 동안(AFTER_CORRECTION, 평가 중 아님) 그 오류의 근거 문장 하나를 옅은 미색 힌트(`HINT`)로 지문에 표시한다 (`PA/server/dialogue-simple.ts:233-236`, `PA/client/SimpleDialogueApp.tsx:116`). 빈 곳 질문(AFTER_GAP)에는 표시하지 않는다 (같은 조건이 `AFTER_CORRECTION`뿐이다, `:233`). 문단이 끝나면 마지막 단계의 공개 구절(`REVEAL`)을 표시한다 (`:235-236`). 평가 중에는 강조를 비운다 (`PA/client/SimpleDialogueApp.tsx:117`).
- 강조 위치는 `text.indexOf(quote)`로 찾으며 못 찾으면 표시하지 않는다 (`PA/server/dialogue-simple.ts:191-194`).
- 화면 상단 '지금까지 내 요약' 칸은 마지막 단계의 `restatedSummary`를 보인다. 판정이 아직 없으면 '첫 요약을 보내면 여기에 정리돼.', 빈 문자열이면 '아직 이 문단에 대한 내용이 없어.' (`PA/client/SimpleDialogueApp.tsx:124-125`, `PA/server/dialogue-simple.ts:241`).
- 이전 문단은 접이식(`다시 읽기`/`완료`)으로 지문 칸에 남고 현재 문단만 펼친다 (`PA/client/SimpleDialogueApp.tsx:115-118`).
- 서랍은 `GET …/inspect`로 저장된 판정을 보여 줄 뿐 재채점하지 않는다 (`PA/client/SimpleDialogueDrawer.tsx:78-82`, `PA/server/dialogue-simple.ts:120-132`). 모델 판정·이유·원출력은 서랍에서만 준다 (`PA/server/dialogue-simple.ts:227`).

## 3. 단계별 표

### 3.1 모델 호출 단계 한눈에

모델 호출은 `OpenAISimpleEvaluator.complete` 한 함수 하나이고, 호출 종류(kind)나 모드 구분은 없다. 검증·재요청은 `evaluateSimple`이 맡는다 (`PS/evaluator.ts:14`, `:29`). 서버는 학생 제출 한 번마다 `evaluateSimple`을 한 번 부르고 (`PA/server/dialogue-simple.ts:158`), 입력의 `stage`에 따라 같은 프롬프트가 다르게 동작한다. 이 문서는 단계(stage)별로 나눠 적는다.

| 단계 | 입력 `stage` | 학생이 한 일 | 가능한 행동 |
|---|---|---|---|
| S1 | `INITIAL` | 문단의 첫 요약 제출 | PRAISE, RETRY_PROMPT, GAP_QUESTION, CORRECTION_QUESTION, CLOSE_ERRORS |
| S2 | `RETRY` | 다시 써 보라는 권유 뒤 새 요약 제출 | PRAISE, CLOSE_NO_RESPONSE, GAP_QUESTION, CORRECTION_QUESTION, CLOSE_ERRORS |
| S3 | `AFTER_CORRECTION` | 교정 질문에 답 제출 | PRAISE, GAP_QUESTION, CLOSE_ERRORS |
| S4 | `AFTER_GAP` | 번호 질문에 답 제출 | PRAISE, CLOSE_ERRORS, CLOSE_GAP |
| N | (모델 없음) | 이동·새 시도·메모·서랍·실패 뒤 재제출 | — |

가능한 행동은 `expectedAction` (`PS/rules.ts:7-26`)을 따른 것이다.

### 3.2 공통 호출 조건 (S1~S4 모두)

- 호출 시점: 학생이 `respond`로 제출한 직후, 서버가 `evaluate`를 부른다 (`PA/server/dialogue-simple.ts:99`, `:148`).
- 프롬프트: 파일 `PE/paragraph-simple-holistic-prompt-v4.7.md` 전체를 `instructions`로 쓴다. 호출 때마다 디스크에서 읽고, 경로는 `process.cwd()` 기준 상대 경로이다 (`PS/evaluator.ts:66`, `:77`). 별도 인라인 지시문은 없다. 구성: 입력 설명(`:7-21`), 핵심 부분 정하기(`:23-38`), 판정 질문(`:40-53`), 분류(`:55-95`), 기록 필드(`:97-125`), 행동 표(`:127-147`), 학생에게 보일 말(`:149-182`), 문단 핵심 필드(`:184-188`).
- 모델: 위 1.3. 단계에 관계없이 같은 모델이다.
- 입력 JSON 하나(`input_text`)만 보낸다. 이미지·미디어는 없다 (`PS/evaluator.ts:78`). 필드는 `SimpleEvaluationInput`이다 (`PS/schema.ts:55-66`; 조립 `PA/server/dialogue-simple.ts:150-155`).

| 필드 | 값 | 근거 |
|---|---|---|
| `passage` | 지문 제목과 모든 문단의 `paragraphId`, `text` | `dialogue-simple.ts:151` |
| `targetParagraph` | 판정할 문단의 `paragraphId`, `text` | `dialogue-simple.ts:152` |
| `stage` | 지금 시도의 `stage` | `dialogue-simple.ts:153` |
| `dialogue` | 이 시도의 대화에서 `role`, `text`, `copied`(있을 때)만. 번호 질문은 본문 아래 `1. …` 줄로 합친다. 말풍선 라벨·인용·핵심 상자는 넣지 않는다 | `dialogue-simple.ts:153`, `:28` |
| `coreParts` | INITIAL이면 null, 그 밖에는 첫 판정에서 정해 저장한 값 | `dialogue-simple.ts:154` |
| `targetError` | `stage=AFTER_CORRECTION`일 때만 교정 질문이 겨냥한 오류, 그 밖에는 null(상태 값은 힌트 표시용으로 남는다) | `dialogue-simple.ts:155`, `rules.ts:166` |
| `targetGaps` | AFTER_GAP일 때만 직전에 물은 빈 곳 목록, 그 밖에는 null | `dialogue-simple.ts:154` |
| `sourceCopyDetected` | INITIAL·RETRY일 때만 서버가 정해 싣는다 | `evaluator.ts:30`, `:51-56` |
| `validationFeedback` | 재요청일 때만 직전 검증 문제 목록을 줄바꿈으로 이은 문자열 | `evaluator.ts:34-35` |

- 모델에 넘기지 않는 것: 골드와 축(`goldPath`, `candidateGoldPath`, `goldReviewStatus`)은 입력에 없다. 컨트롤러 주석이 "골드(goldPath)를 읽지 않는다"고 적고 (`PA/server/dialogue-simple.ts:53`), 입력 타입 주석도 "골드·축은 없다 — 지문과 이 문단의 대화뿐이다"이다 (`PS/schema.ts:54`). 컨트롤러가 지문 문단에서 꺼내는 필드는 `paragraphId`, `text`뿐이다 (`:151`, `:152`). 문제 정답·문제 문항도 넘기지 않는다. 같은 지문의 다른 문단 대화·다른 시도의 대화도 넘기지 않는다 (입력 `dialogue`는 현재 시도의 `transcript`이다, `:153`).
- 모델에 넘기는 것 가운데 주의: `passage`는 대상 문단뿐 아니라 지문 전체 문단이다. 프롬프트는 이를 "대상 문단을 해석하는 맥락"이라 한다 (프롬프트 `:9`).
- 출력 스키마: `SimpleOutputSchema` (`PS/schema.ts:25-41`). 모든 필드가 필수이고 `strict()`이다.

| 필드 | 뜻 | 근거 |
|---|---|---|
| `category` | 판정 6종 | `schema.ts:26` |
| `reason` | 판정 근거(개발자용) | `schema.ts:27` |
| `coreParts[]` | `{description, sourceQuote}`. INITIAL에서만 1~3개 | `schema.ts:12`, `:28`, `rules.ts:53-61` |
| `corePartsCovered[]` | 기준 핵심 부분마다 담았는지 | `schema.ts:29` |
| `errors[]` | `{studentQuote, correction, sourceQuote, corePartIndex, gapIndex, feedback}` | `schema.ts:14-21` |
| `gaps[]` | `{corePartIndex, description, sourceQuote, question, asksOneThing}` | `schema.ts:23` |
| `targetErrorResolved` | AFTER_CORRECTION에서만 true/false, 그 밖에는 null | `schema.ts:32`, `rules.ts:44-47` |
| `targetGapReadings[]` | AFTER_GAP에서 질문과 답을 합쳐 읽은 문장 | `schema.ts:33` |
| `targetGapsFilled[]` | AFTER_GAP에서 물은 항목마다 채웠는지 | `schema.ts:34` |
| `restatedSummary` | 학생 발화를 합쳐 다시 쓴 요약 | `schema.ts:35` |
| `action`, `message` | 행동, 학생에게 보일 말 | `schema.ts:36-37` |
| `corePartSummaries[]`, `closingFeedback`, `coreSourceQuote` | 마무리 상자·마무리 피드백·핵심 근거 문장 | `schema.ts:38-40` |

- 코드 검증 (`PS/evaluator.ts:40`, `PS/rules.ts:126-130`): 먼저 `SimpleOutputSchema.safeParse`로 스키마를 확인한다. 위반이면 '출력이 스키마와 다르다'를 문제로 돌려준다 (`:127-128`). 통과하면 `validateSimpleOutput`을 돌린다 (`:129`). 검증 항목은 다음과 같다.
  1. `action`이 행동표(`expectedAction`)와 같다 (`rules.ts:31-32`).
  2. 오류 개수 규칙: 질문 뒤 CLOSE_ERRORS는 1개 이상, ONE_ERROR는 정확히 1개, MULTI_ERROR는 2개 이상, 그 밖의 판정은 0개 (`rules.ts:34-41`).
  3. `sourceCopyDetected=true`이면 `category`는 COPY (`rules.ts:43`).
  4. `targetErrorResolved`는 AFTER_CORRECTION에서만 true/false (`rules.ts:44-46`).
  5. 오류 인용: `studentQuote`는 학생 발화의 연속 부분 문자열(빈 문자열 불가), `sourceQuote`는 대상 문단의 연속 부분 문자열 (`rules.ts:48-52`).
  6. `coreParts`: INITIAL에서 1~3개, 설명이 비어 있지 않음, `sourceQuote`는 대상 문단의 연속 부분 문자열. 그 밖의 단계에서는 빈 배열 (`rules.ts:53-61`).
  7. `corePartsCovered`는 기준 핵심 부분과 같은 길이 (`rules.ts:62-63`). 오류의 `corePartIndex`는 범위 안, 서로 겹치지 않음, 가리키는 부분이 false (`rules.ts:64-70`).
  8. 오류가 없고 AFTER_GAP이 아닐 때: CAPTURED면 모두 true, GAP이면 false가 하나 이상, IRRELEVANT·COPY면 모두 false (`rules.ts:71-75`).
  9. GAP_QUESTION이면 `gaps`는 1~2개이고 개수가 `min(2, 못 담은 부분 수)`와 같으며, `corePartIndex`가 범위 안·중복 없음·가리키는 부분이 false, `asksOneThing`이 true, 설명·질문이 비어 있지 않고, `sourceQuote`가 대상 문단의 연속 부분 문자열이다. GAP_QUESTION이 아니면 `gaps`는 비어 있다 (`rules.ts:76-91`).
  10. AFTER_GAP에서 `targetGapsFilled`와 `targetGapReadings`는 `targetGaps`와 같은 길이, 판정과의 일관성(CAPTURED면 모두 true, GAP이면 false 하나 이상, IRRELEVANT·COPY면 모두 false). 그 밖의 단계에서는 둘 다 null (`rules.ts:92-102`). 오류의 `gapIndex`는 AFTER_GAP에서만 쓰고 가리키는 항목이 false (`rules.ts:104-108`).
  11. `corePartSummaries`는 CLOSE_ERRORS·CLOSE_NO_RESPONSE·CLOSE_GAP·질문 뒤 PRAISE에서만 기준 핵심 부분과 같은 개수의 비어 있지 않은 문장, 그 밖에는 빈 배열 (`rules.ts:109-113`).
  12. `closingFeedback`은 CLOSE_ERRORS에서만 비어 있지 않고, `errors[].feedback`도 CLOSE_ERRORS에서만 비어 있지 않다 (`rules.ts:114-118`).
  13. `coreSourceQuote`는 CLOSE_NO_RESPONSE에서만 대상 문단의 연속 부분 문자열 (`rules.ts:119-120`). `message`는 비어 있으면 안 된다 (`rules.ts:121`).
- 실패 처리 (`PS/evaluator.ts:28-49`):
  - 모델 호출 자체가 `OpenAI.APIError`이고 상태가 408·409·429·500 이상이면 첫 호출에 한해 다시 묻는다(`validationFeedback` 없이). 그 밖의 예외(상태 없는 타임아웃·연결 오류·`status !== 'completed'`)는 재요청 없이 바로 `SimpleEvaluationError`를 던진다 (`PS/evaluator.ts` `evaluateSimple`, `isTransientApiError`).
  - 검증이 실패하면 문제 목록을 `validationFeedback`으로 붙여 1회 재요청한다. 재요청 한도는 API 재시도와 공유해 전체 호출은 최대 2번이다(문제 판정기와 같은 방식, 6절 11번에서 수정). 두 번째 호출의 검증도 실패하면 `검증 2회 실패: …`로 던진다.
  - 성공하면 시도별 `durationMs`, 토큰은 합산하고 `attempts`에 호출 횟수를 담는다 (`:42-44`). 버려진 원출력과 문제는 `validationFailures`에 남는다 (`:46`).
- 적용 (`PA/server/dialogue-simple.ts:156-165`): 검증을 통과한 출력을 `applySimpleAction`으로 문단 상태에 반영하고 (`:159`, `PS/rules.ts:155-173`), 단계 기록(`steps`)을 쌓고, 상태를 `IDLE`로 돌린다. COPY면 방금 학생 발화에 `copied`를 단다 (`:163`). 튜터 말풍선을 쌓고 기록을 남긴다 (`:164-165`).
- 실패 시 서버 (`PA/server/dialogue-simple.ts:166-170`): `status = 'RETRYABLE_ERROR'`로 두고 `EVALUATION_FAILED`를 기록한다. 문단 상태와 학생 발화는 그대로 남는다. 학생에게는 원 오류 문구가 아닌 고정 문구 '피드백을 만들지 못했어. 쓴 내용은 저장돼 있으니 다시 시도해 줘.'를 준다 (`:245`). 화면 제출 버튼은 [다시 시도]로 바뀐다 (`PA/client/SimpleDialogueApp.tsx:145`).
- 재시도: 실패 뒤 학생이 같은 문장이든 고친 문장이든 다시 제출하면 직전 학생 발화(실패한 것)를 대체하고 다시 판정한다 (`PA/server/dialogue-simple.ts:94-96`). 새 시도 만들기나 이동은 `PROCESSING`일 때만 막는다 (`:110`). 실패 상태에서의 새 시도는 허용된다 (확인 조건은 학생 발화 유무뿐, `:111`).

### 3.3 S1 — INITIAL (첫 요약 판정)

| 항목 | 내용 |
|---|---|
| 언제 | 문단의 새 시도에서 학생이 첫 요약을 제출했을 때 (`PA/server/dialogue-simple.ts:36-37`, `:99`). |
| 프롬프트 | 3.2의 파일. 이 단계 전용 부분은 '핵심 부분'(프롬프트 `:23-38`)이다. |
| 목적 | (1) 이 문단의 핵심 부분 1~3개를 정한다. 정답 자료가 없으므로 모델의 판단이고 이후 이 문단 대화 끝까지 기준이다 (프롬프트 `:25`, `:33`). (2) 학생 요약이 핵심 부분을 모두 담았는지, 오류가 있는지 판정한다. |
| 입력 | 3.2 표. `coreParts=null`, `targetError=null`, `targetGaps=null`, `sourceCopyDetected` 있음. |
| 출력 핵심 | `coreParts`(1~3개)와 `corePartsCovered`, `category`, `action`, `message`, `restatedSummary`. 오류가 있으면 `errors`, GAP이면 `gaps`. |
| 행동 | CAPTURED→PRAISE, IRRELEVANT·COPY→RETRY_PROMPT, GAP→GAP_QUESTION, ONE_ERROR→CORRECTION_QUESTION, MULTI_ERROR→CLOSE_ERRORS (`PS/rules.ts:12-16`). |
| 적용 | `coreParts`를 상태에 저장한다 (`PS/rules.ts:157`). PRAISE는 종료(CAPTURED, 핵심 상자 없이 칭찬만) (`PS/rules.ts:159`, 프롬프트 `:147`). RETRY_PROMPT는 `stage=RETRY`, `retryUsed=true` (`:160`). GAP_QUESTION은 `stage=AFTER_GAP`, 질문 1, `targetGaps=gaps` (`:165`). CORRECTION_QUESTION은 `stage=AFTER_CORRECTION`, 질문 1, `targetError=errors[0]` (`:166`). CLOSE_ERRORS는 종료(ERRORS_REVEALED), 공개 구절은 오류의 `sourceQuote` (`:169-172`). |
| 화면 | PRAISE: 말풍선 하나(`피드백`) (`PA/server/dialogue-simple.ts:183`). RETRY_PROMPT: 말풍선 하나(`다시 써 보기`) (`:183`). GAP_QUESTION: 말풍선 하나에 `message`와 번호 질문 목록(`생각해 보기`) (`:176`). CORRECTION_QUESTION: 말풍선 하나(`확인하기`) (`:183`). CLOSE_ERRORS: `message` 말풍선 → 오류마다 학생 인용(`quote`)과 `feedback` 말풍선 → `closingFeedback`과 핵심 상자 말풍선, 모두 `바로잡기` (`:179-181`). |
| 코드 검증 | 3.2 전체 + INITIAL 전용: `coreParts` 1~3개, 인용 일치 (`PS/rules.ts:53-61`), `sourceCopyDetected`면 COPY (`:43`). |
| 실패 시 | 3.2. |

### 3.4 S2 — RETRY (다시 쓴 요약 판정)

| 항목 | 내용 |
|---|---|
| 언제 | S1에서 RETRY_PROMPT를 받은 뒤 학생이 새 요약을 제출했을 때. 한 시도에서 한 번만 가능하다 (`retryUsed`, `PS/rules.ts:160`). |
| 프롬프트 | 3.2의 파일. 단계 설명 `:12-13`, 행동표 `:132-136`. |
| 목적 | 새 요약을 S1에서 정한 `coreParts`를 기준으로 다시 판정한다. 핵심 부분은 새로 정하지 않는다 (프롬프트 `:17`, `:33`, 검증 `PS/rules.ts:61`). |
| 입력 | 3.2 표. `coreParts`=S1에서 저장한 값, `sourceCopyDetected` 있음. `dialogue`에는 처음의 (복사·무관) 학생 발화와 RETRY_PROMPT 튜터 말이 들어 있다. 처음 발화가 COPY였으면 `copied: true`가 붙는다 (`PA/server/dialogue-simple.ts:163`, `:153`). |
| 출력 핵심 | S1과 같다. `coreParts`는 빈 배열이어야 한다. |
| 행동 | IRRELEVANT·COPY→CLOSE_NO_RESPONSE, 그 밖은 S1과 같다 (`PS/rules.ts:11-16`). |
| 적용 | CLOSE_NO_RESPONSE는 종료(NO_RESPONSE), 공개 구절은 `coreSourceQuote` (`PS/rules.ts:161`). |
| 화면 | CLOSE_NO_RESPONSE: 말풍선 하나(`문단 핵심`)에 `message`와 `corePartSummaries` 상자 (`PA/server/dialogue-simple.ts:182`). 그 밖의 행동은 S1과 같다. |
| 코드 검증 | 3.2 전체. RETRY에서도 `sourceCopyDetected`가 계산되어 COPY를 강제한다 (`PS/evaluator.ts:53`). CLOSE_NO_RESPONSE에는 `corePartSummaries`(핵심 부분 수만큼)와 `coreSourceQuote` 필수 (`PS/rules.ts:111-113`, `:119-120`). |
| 실패 시 | 3.2. |

### 3.5 S3 — AFTER_CORRECTION (교정 질문 답 판정)

| 항목 | 내용 |
|---|---|
| 언제 | S1·S2에서 CORRECTION_QUESTION이 나간 뒤 학생이 답을 제출했을 때. |
| 프롬프트 | 3.2의 파일. 교정 처리 `:75-76`, 교정 질문 작성 `:176`, CLOSE_ERRORS `:181`. |
| 목적 | 앞서 고치게 한 오류(`targetError`)를 학생이 바로잡았는지 `targetErrorResolved`로 적고, 바로잡은 뒤의 누적 발화 전체로 분류를 다시 한다. 내용 없이 "틀렸다/다르다/모르겠다"만 답하면 바로잡은 것이 아니다 (프롬프트 `:75-76`, 체크포인트 v4.7 교정 질문). |
| 입력 | 3.2 표. `coreParts`=저장한 값, `targetError`=질문이 겨냥한 오류, `targetGaps=null`, `sourceCopyDetected`는 없다 (`PS/evaluator.ts` `withSourceCopy`). |
| 출력 핵심 | `targetErrorResolved`(true/false), 누적 발화 기준 `category`, `corePartsCovered`. |
| 행동 | resolved=true이고 CAPTURED→PRAISE, resolved=true이고 GAP→GAP_QUESTION, 그 밖의 모든 경우→CLOSE_ERRORS (`PS/rules.ts:17-20`). |
| 적용 | PRAISE는 종료. GAP_QUESTION은 `stage=AFTER_GAP`, 질문 2 (`PS/rules.ts:164-165`). CLOSE_ERRORS는 종료, `errors`는 아직 남은 오류(바로잡지 못한 `targetError` 포함) (프롬프트 `:145`). |
| 화면 | PRAISE: 말풍선 하나(`피드백`)에 `message`와 `corePartSummaries` 상자 (`PA/server/dialogue-simple.ts:177`). GAP_QUESTION·CLOSE_ERRORS는 S1과 같다. |
| 코드 검증 | 3.2 전체 + `targetErrorResolved`가 null이면 안 됨 (`PS/rules.ts:44`). CLOSE_ERRORS는 `errors` 1개 이상 (`:36`). 질문 뒤 PRAISE는 `corePartSummaries` 필수 (`:109-113`). |
| 실패 시 | 3.2. |

### 3.6 S4 — AFTER_GAP (번호 질문 답 판정)

| 항목 | 내용 |
|---|---|
| 언제 | GAP_QUESTION이 나간 뒤 학생이 답을 제출했을 때. |
| 프롬프트 | 3.2의 파일. `:78-95`(AFTER_GAP 평가 순서), GAP_QUESTION `:172-175`, CLOSE_GAP `:177-180`. |
| 목적 | 물은 것으로만 평가한다. 물은 빈 곳마다 질문과 학생 답을 합쳐 한 문장으로 읽고(`targetGapReadings`), 그 문장으로 채웠는지(`targetGapsFilled`)와 오류 여부를 가른다. 묻지 않은 새 빈 곳은 평가하지 않고, 질문과 무관한 말은 맞든 틀리든 판정하지 않는다 (프롬프트 `:78-94`). |
| 입력 | 3.2 표. `targetGaps`=직전에 물은 빈 곳 목록(`description`, `sourceQuote`, `question` 포함, 상태에 저장된 그대로), `targetError`는 null이다(교정 질문 뒤 빈 곳 질문으로 온 경우도 같다, 6절 2번에서 수정). `sourceCopyDetected`는 없다. |
| 출력 핵심 | `targetGapReadings`, `targetGapsFilled`, `category`, 오류의 `gapIndex`. |
| 행동 | CAPTURED→PRAISE, ONE_ERROR·MULTI_ERROR→CLOSE_ERRORS, GAP·IRRELEVANT·COPY→CLOSE_GAP (`PS/rules.ts:21-24`). |
| 적용 | CLOSE_GAP는 종료(GAP_REVEALED), 공개 구절은 못 채운 항목의 `sourceQuote`(중복 제거) (`PS/rules.ts:168`). CLOSE_ERRORS는 종료, 공개 구절은 오류의 `sourceQuote`와 오류도 아니고 채우지도 못한 물은 항목의 `sourceQuote` (`PS/rules.ts:169-172`). |
| 화면 | CLOSE_GAP: 말풍선 하나(`빠진 내용`)에 `message`와 `corePartSummaries` 상자 (`PA/server/dialogue-simple.ts:178`). PRAISE는 S3과 같다. CLOSE_ERRORS는 S1과 같다 (`:179-181`). |
| 코드 검증 | 3.2 전체 + `targetGapsFilled`와 `targetGapReadings`가 `targetGaps` 길이와 같음, 판정과의 일관성 (`PS/rules.ts:92-102`). 오류가 있으면 `gapIndex`가 범위 안이고 해당 항목이 false (`:104-108`). |
| 실패 시 | 3.2. |

### 3.7 N — 모델 없이 코드만으로 움직이는 동작

| 동작 | 결과 | 근거 |
|---|---|---|
| 문단 이동(`navigate`, 파트 이동 막대, [다음 문단]) | `currentIndex`만 바꾼다. 그 문단의 런타임이 없으면 시도 1을 만든다. 모델 호출 없음 | `PA/server/dialogue-simple.ts:74-80`, `:217-222`; `PA/client/SimpleDialogueApp.tsx:101` |
| 존재하지 않는 문단 | '존재하지 않는 문단입니다.' | `PA/server/dialogue-simple.ts:218` |
| [새 시도] | 같은 문단에 `attemptNumber+1`의 새 시도(INITIAL)를 쌓는다. 평가 중이면 거부, 학생 발화가 없으면 '이미 새 시도입니다.'. 끝나지 않은 시도는 `abandoned=true`로 표시하고 `ATTEMPT_ABANDONED`를 기록. 새 시도마다 `ATTEMPT_STARTED`를 기록 | `PA/server/dialogue-simple.ts:105-118` |
| [새 시도] 확인창 | 진행 중이면 '지금 시도를 중단하고 새로 시작할까?' 확인 | `PA/client/SimpleDialogueApp.tsx:98` |
| 메모 저장 | `memos.jsonl`에 한 줄 추가. 시도 번호 없이 단계 번호만 주면 거부 | `PA/server/dialogue-simple.ts:134-146` |
| 서랍 조회 | 메모는 같은 키의 마지막 줄을 현재 값으로 읽는다 | `PA/server/dialogue-simple.ts:203-215` |
| 종료 뒤 입력 | 입력 칸이 없어지고 '이 문단은 끝났어요.' | `PA/client/SimpleDialogueApp.tsx:136` |
| [나가기] | 보기만 비우고 시작 화면으로. 서버 세션은 남는다 | `PA/client/SimpleDialogueApp.tsx:106` |

## 4. 저장 기록

| 기록 | 경로 | 내용 | 근거 |
|---|---|---|---|
| 단계 기록 | `.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl` (저장소 루트가 아닌 서버 `process.cwd()` 기준). 한 줄 JSON | `schemaVersion: 'dialogue-simple-holistic-record-v2'`, `savedAt`, `event`, `sessionId`, `passageId`, `paragraphIndex`, `attemptNumber`, `paragraphId`, `state`(문단 상태 전체), `transcript`(라벨 포함 대화 전체), `step`(STEP일 때만 마지막 단계 기록, 아니면 null), `error`, `validationFailures` | `PA/server/dialogue-simple.ts:51`, `:62`, `:195-201` |
| 이벤트 종류 | 같은 파일의 `event` 값 | `STEP`(판정 성공), `EVALUATION_FAILED`(호출·검증 최종 실패; `error`에 원 오류 문구), `ATTEMPT_STARTED`(새 시도), `ATTEMPT_ABANDONED`(끝나지 않은 시도를 새 시도로 넘길 때) | `PA/server/dialogue-simple.ts:42`, `:112`, `:116`, `:165`, `:169` |
| 단계(step) 내용 | `step` 안 | `stepIndex`, `stage`, `studentText`, `output`(검증 통과한 모델 출력 전체), `expectedAction`, `action`, `validationFailures`, `call`(모델·`promptVersion`·시간·토큰·호출 횟수), `sourceCopyDetected`(서버의 원문 옮김 판정, INITIAL·RETRY 외에는 null), `message`, `highlights` | `PA/server/dialogue-simple.ts:185-189` |
| 인상 메모 | 같은 폴더 `memos.jsonl` | `savedAt`, `sessionId`, `passageId`, `paragraphId`, `attemptNumber`(null=문단 메모), `stepIndex`(null=시도 메모), `text`. 같은 키의 마지막 줄이 현재 값 | `PA/server/dialogue-simple.ts:142-144`, `:203-215` |
| 서버 메모리 | `SimpleDialogueController.sessions` | 진행 중 세션·시도·단계(재시작하면 사라짐) | `PA/server/dialogue-simple.ts:55`, `:25-35` |
| 브라우저 | 저장 없음. 초안(`drafts`)은 컴포넌트 상태이다 | 새로 고침하면 초안은 사라지고, 주소의 `sessionId`로 세션만 복구 | `PA/client/SimpleDialogueApp.tsx:18`, `:44-47` |

- 로그 폴더는 `createLearningServer`의 옵션 `dialogueSimpleLogDirectory`로만 바꿀 수 있고, 환경변수는 찾지 못했다 (`PA/server/index.ts:137`, `:185`; 환경변수는 미확인).
- 단계 기록의 `output`에는 모델이 쓴 `reason`, `coreParts`, `corePartsCovered`, `targetGapReadings` 등 개발자용 필드가 모두 들어 있다. 학생 화면 보기(view)에는 이 필드를 주지 않고 서랍(`inspect`)으로만 준다 (`PA/server/dialogue-simple.ts:227`).
- 학생 상태 원장·문제 판정으로 넘기지 않는다.
  - `SimpleDialogueController`의 의존은 `content.js`(지문 읽기·JSONL 쓰기), `@csat/pipeline`의 평가기·규칙, 공유 타입뿐이다 (`PA/server/dialogue-simple.ts:1-12`). 학생 증거 저장소(`evidenceSink`)를 받는 옵션이 없다.
  - 생성부에서 `studentEvidence`와 `evidenceSink`는 축 기반 `DialogueController`와 `ProblemSolvingController`에만 건네고, `SimpleDialogueController`에는 건네지 않는다 (`PA/server/index.ts:161-173`, `:183-186`).
  - 컨트롤러 주석: "개발자 전용 컨트롤러. 학생 상태 원장에 쓰지 않고, 골드(goldPath)를 읽지 않는다" (`PA/server/dialogue-simple.ts:53`). 화면 안내 문구도 "학생 상태 원장에는 쓰지 않습니다" (`PA/client/SimpleDialogueApp.tsx:103`).
  - 문제 풀이 판정과도 연결되지 않는다. 문단 쪽 기록은 문제 화면에 `questionId`와 `returnTo`만 URL로 넘긴다 (`PA/client/dev-part-nav-links.ts:11-13`, `PA/server/dialogue-simple.ts:246`). 문단 판정 결과를 문제 API에 보내는 코드는 찾지 못했다.
- 문단 지문 자료는 `loadDialoguePassages()`로 읽는다. 컨트롤러가 쓰는 필드는 `passageId`, `title`, `exam`, `paragraphs[].paragraphId/position/text`, `problemQuestionId`이다 (`PA/server/dialogue-simple.ts:61`, `:151-152`, `:238-239`, `:246-247`; 원본 형식 `PA/server/content.ts:45-67`, 읽는 함수 `:66-71`).

## 5. 근거 결정 목록

번호와 한 줄 요지는 `memory/decisions/` 각 파일의 제목과 결정 절에서 읽은 것이다. 코드 줄 대응은 본문에 있다.

| 결정 | 한 줄 요지 |
|---|---|
| D-0174 | 문단 요약 운영 후보를 단순 형식 v4.7(luna)로 확정, 개발자 주소 `/dialogue/lab`, 기본 모델 `gpt-6-luna`, 학생용 `/dialogue`는 그대로 |
| D-0173 | 코드 이름에서 버전을 빼고 저장 값은 유지하는 원칙 (D-0174가 같은 원칙을 따른다고 적음) |
| D-0149 | 단순 형식 v4.5를 중심 운영 버전으로. 서버의 원문 옮겨 적기 감지(`copy.ts`)와 핵심 부분 범위 규칙. 이후는 명백한 실패만 부분 수정 |
| D-0148 | 단순 형식 v4.4를 운영 예정 형식으로 지정. V4 블라인드 비교 생략 (버전 지정은 D-0149가 대체) |
| D-0145 | 찾은 구멍을 모두 번호 질문(최대 2개)으로 묻고, 질문을 거쳤으면 마무리에 항상 문단 핵심을 공개. 질문 상한 문단당 2회 |
| D-0144 | v3: 마무리 말풍선 분리, 근거 문장 하나 표시 (빠진 내용 코멘트 틀은 D-0145가 대체) |
| D-0142 | v2: 재구성 요약(`restatedSummary`) 칸, 반복 시도(새 시도), 말풍선 상태 표시(라벨) |
| D-0140 | 단순 형식 개발자 모드 도입: 지문과 학생 대화만 입력, 골드·축 미사용, 사용자 직접 사용감 기록, 행동 흐름표 |
| D-0139 | 질문 생성에서 축 근거를 빼고 단순 형식과 질문 작성 규칙 4개를 채택 (일부는 D-0145가 대체) |
| D-0138 | 문단 요약 근본 검토(질문 품질 먼저). D-0174가 이 검토를 끝낸다고 적음 |

체크포인트(결정 기록이 아닌 변경 이력, 요지만):

- `memory/checkpoints/2026-10-22-paragraph-simple-v46-dev-ui.md`: v4.6에서 출력 필드를 `corePartSummaries`·`closingFeedback`으로 바꾸고 질문 뒤 마무리를 "전체 피드백 + 부분별 핵심 상자"로. 개발 화면에 파트 이동 막대, 판정 중 대기 말풍선, 교정 질문 힌트(교정 질문에만 근거 문장 표시, 빈 곳 질문에는 안 함).
- `memory/checkpoints/2026-10-22-paragraph-simple-v47-correction-question.md`: v4.7에서 교정 질문을 예/아니오형이 아닌 열린 질문으로, 내용 없는 "다르다"·"모르겠다"는 고침으로 보지 않고 CLOSE_ERRORS 도입에서 알아챈 점을 인정. 정보 비대칭 첫 요약의 MULTI_ERROR 4/30은 판단 보류, 첫 판정 규칙은 바꾸지 않음.

## 6. 확인 필요 → 대조 결과 (2026-10-25)

작성 때 '확인 필요'로 적은 11건을 코드·결정 기록·실행 기록과 대조했다(사용자 승인 "권고대로 진행해", 2026-10-25).
처리: **해소**(기록 정리로 끝남), **사실 기록**(의도된 동작 또는 도달 불가, 변경 없음), **수정**(코드 변경, 인계 `docs/handoffs/2026-10-25-lab-flow-check-items.md`), **남김**(재검토 조건을 두고 보류).

| # | 내용 | 처리 | 근거·결과 |
|---|---|---|---|
| 1 | 지문 목록 `available`이 골드 상태에 묶여 있고, 목록 경로가 개발자 검사를 거치지 않는다. | **남김** | 지금은 영향이 없다. 7개 지문 중 정확한 원문(`exact-local-source`)인 6개는 모두 골드가 있고, 빠지는 것은 원문이 불완전한 헤겔 지문 하나다(2026-10-25 `packages/pipeline/fixtures/experiments/dialogue/passages/` 확인). 목록은 학생용 `/dialogue`가 함께 쓰는 공개 읽기 경로다. **재검토 조건:** 골드 없는 지문을 추가할 때 단순 형식 화면의 필터 기준을 따로 둔다. |
| 2 | AFTER_GAP 입력에 앞서 고친 `targetError`가 들어갈 수 있다. | **수정** | 실행 기록 107단계 중 1건(교정 질문 → 빈 곳 질문 → 판정)이 이 경로를 탔다(`.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`, 2026-10-22까지). 이제 `targetError`는 `stage=AFTER_CORRECTION`일 때만 넘기고, 그 밖에는 null이다(프롬프트 `:18` 계약). 상태 값은 힌트 표시용으로 남긴다. |
| 3 | `sourceCopyDetected`가 기록에 남지 않는다. | **수정** | `evaluateSimple` 결과에 이 값을 담고 단계 기록(`SimpleStepInspection.sourceCopyDetected`, INITIAL·RETRY 외에는 null)에 저장한다. 로그는 단계를 그대로 담으므로 함께 남는다. |
| 4 | 프롬프트·지시문·로그 경로가 `process.cwd()` 기준이다. | **사실 기록** | 저장소 전체 관례다(앱 서버·판정기 15곳). 서버는 저장소 루트에서 `npm run app:server`로 띄운다. 다른 곳에서 띄우면 시작할 때 지문 폴더(`DIALOGUE_ROOT`, `PA/server/content.ts:31-34`)를 읽지 못해 바로 멈춘다. 조용히 다른 파일을 읽지는 않는다. |
| 5 | `MAX_SIMPLE_QUESTIONS` 예외가 나는 경로 | **사실 기록** | 도달할 수 없다. AFTER_CORRECTION은 질문 1회 뒤에만 오고(질문 수 1 → 빈 곳 질문으로 2), AFTER_GAP에는 질문 행동이 없다(`PS/rules.ts:17-24`). 이 예외는 방어용 불변식이다. |
| 6 | `[문제 풀기]`의 `problemUrl`에 `returnTo`가 없다. | **수정** | 서버가 파트 이동 막대와 같은 `problemLink(questionId, sessionId)`로 주소를 만든다(공용 `PA/shared/problem-link.ts`). |
| 7 | 교정 질문 중 힌트 표시가 D-0140·D-0144와 다르다. | **해소** | 2026-10-22 사용자 결정("권고 동의")을 [D-0175](../memory/decisions/D-0175-paragraph-simple-correction-hint-during-question.md)로 기록했다. D-0140·D-0144의 해당 항목에 대체 링크를 달았다. |
| 8 | D-0142·D-0144의 필드 이름(`coreIntro` 등) | **해소** | v4.6에서 `corePartSummaries`·`closingFeedback`으로 바뀌었다(v4.6 체크포인트). D-0144 해당 항목에 이 사실과 링크를 달았다. |
| 9 | D-0148·D-0149의 프롬프트 파일(v4.4·v4.5)과 현재 v4.7 | **해소** | [D-0174](../memory/decisions/D-0174-paragraph-simple-v47-operating-candidate.md)가 v4.7을 운영 후보로 확정했다. v4.6·v4.7은 D-0149의 부분 수정 범위로 처리됐다(각 체크포인트). |
| 10 | 같은 `transitionId`의 결과 재사용과 `transitions` 맵 | **사실 기록** | 같은 요청의 중복 제출을 막는 의도된 동작이다. 맵은 세션과 함께 서버 메모리에만 있고, 서버를 다시 띄우면 사라진다. 개발자 경로라 지금은 비우지 않는다. |
| 11 | 모델 호출 실패의 재시도 정책이 문제 판정기와 다르다. | **수정** | `OpenAI.APIError` 중 408·409·429·500 이상이면 1회 다시 묻는다. 한도는 검증 실패와 공유한다(전체 호출 최대 2회, 문제 판정기와 같음). 타임아웃·연결 오류·응답 미완료는 지금처럼 즉시 실패한다. |
