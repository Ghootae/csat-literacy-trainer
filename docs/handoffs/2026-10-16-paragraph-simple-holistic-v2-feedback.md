# 인계: 단순 형식 문단 개발자 모드 v2 (사용감 피드백 1~6 반영)

- 날짜: 2026-10-16
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0142-paragraph-simple-v2-restated-summary-attempts.md`, `memory/decisions/D-0140-paragraph-simple-holistic-dev-mode.md`
- 피드백 원문: `docs/review/simple-holistic-dev-ui-feedback-2026-10-16/README.md`
- 이전 인계(현재 구현의 계약): `docs/handoffs/2026-10-16-paragraph-simple-holistic-dev-mode.md`

## 목표

`/dialogue/dev/simple`이 다음을 만족한다.

1. 프롬프트 v2(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v2.md`, 작성 완료)를 쓴다. 출력에 `restatedSummary`가 추가된다.
2. 한 문단을 여러 번 시도할 수 있다. 이전 시도는 보존되고 서랍에서 다시 본다. 메모는 단계·시도·문단 세 종류다.
3. 채팅 칸 위쪽에 별도 칸 "지금까지 내 요약"이 있고, 판정이 끝날 때마다 마지막 단계의 `restatedSummary`로 갱신된다. 대화창에는 실제 오간 말만 있다.
4. CLOSE_ERRORS는 말풍선 둘(바로잡기 = `message`, 문단 핵심 = `coreSummary`)로 보인다.
5. 모든 말풍선 위에 작은 상태 표시가 있다.

## 범위 밖

- 프롬프트 v2 본문 수정(필요해 보이면 멈추고 보고). v1 파일은 지우지 않는다.
- 행동 표·질문 횟수·흐름(D-0140) 변경. `expectedAction`, `applySimpleAction`의 행동 논리는 그대로다.
- 운영 V4, 보여 주기 모드, 문제 풀이(v4/v5) 코드. 작업 트리에 문제 풀이 쪽 미커밋 변경이 많다 — 건드리지 않는다.
- 서버의 인용 범위 문장 단위 확장(쓰지 않기로 확정).
- 학생 상태 원장·문제 판정 연결(계속 차단).

## 손댈 파일과 계약

### 파이프라인 `packages/pipeline/src/paragraph-simple/`

- `schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v2'`.
  - `SimpleOutputSchema`에 `restatedSummary: z.string()` 추가(strict 유지, 필수 필드). 필드 순서는 `targetErrorResolved` 다음.
- `evaluator.ts`: `PROMPT_PATH`를 v2 파일로.
- `rules.ts` `validateSimpleOutput`: 추가 검증 없음(`restatedSummary`는 빈 문자열 허용). 기존 검증 유지.
- 테스트(`rules.test.ts`, `evaluator.test.ts`) 픽스처에 `restatedSummary` 추가.

### 공유 계약 `packages/app/src/shared/dialogue-simple.ts`

- 말풍선 표시:
  ```ts
  export type SimpleMessageLabel = '나의 요약' | '다시 쓴 요약' | '나의 답' | '피드백' | '다시 써 보기' | '확인하기' | '생각해 보기' | '빠진 내용' | '바로잡기' | '문단 핵심';
  export interface SimpleMessageView { role: 'student' | 'tutor'; text: string; label: SimpleMessageLabel }
  ```
- `SimpleDialogueView.current`에 추가: `attemptNumber: number`, `attemptCount: number`, `restatedSummary: string | null`(아직 판정이 없으면 null), `canStartNewAttempt: boolean`.
- `paragraphs[].done`의 뜻: 그 문단에 완료된 시도가 하나라도 있다.
- `SimpleInspection`을 시도 단위로:
  ```ts
  export interface SimpleAttemptInspection {
    attemptNumber: number;
    status: 'IN_PROGRESS' | 'DONE' | 'ABANDONED';
    state: { stage: string; retryUsed: boolean; questionsAsked: number; done: boolean; outcome: string | null };
    messages: SimpleMessageView[];
    steps: SimpleStepInspection[];
    memos: { attempt: string; steps: Record<number, string> };
  }
  export interface SimpleInspection {
    paragraphIndex: number; paragraphId: string; currentAttemptNumber: number;
    attempts: SimpleAttemptInspection[];
    memos: { paragraph: string };
  }
  ```
- `SimpleMemoRecord`에 `attemptNumber: number | null` 추가. 의미: `attemptNumber=null, stepIndex=null` 문단 전체 인상 / `attemptNumber=n, stepIndex=null` 시도 인상 / `attemptNumber=n, stepIndex=k` 단계 인상. `attemptNumber=null`이면서 `stepIndex`가 숫자인 요청은 거부.
- 기존 `memos.jsonl`의 옛 줄(`attemptNumber` 필드 없음) 읽기: `stepIndex=null`은 문단 인상, 숫자면 시도 1의 단계 인상으로 해석.

### 서버 `packages/app/src/server/dialogue-simple.ts`

- `ParagraphRuntime`을 `{ attempts: AttemptRuntime[] }`로 바꾸고, `AttemptRuntime = { attemptNumber, state, transcript(라벨 포함 메시지), steps, status: 'IDLE'|'PROCESSING'|'RETRYABLE_ERROR', abandoned: boolean }`. 마지막 시도가 현재 시도다.
- 모델 입력 `dialogue`에는 지금처럼 `{ role, text }`만 넣는다(라벨 제외). CLOSE_ERRORS의 `coreSummary` 말풍선은 모델 입력에 넣지 않아도 된다(그 뒤 판정이 없음).
- 라벨 부여:
  - 학생: 제출 시점 stage가 `INITIAL`→나의 요약, `RETRY`→다시 쓴 요약, `AFTER_CORRECTION`/`AFTER_GAP`→나의 답.
  - 튜터: PRAISE→피드백, RETRY_PROMPT→다시 써 보기, CORRECTION_QUESTION→확인하기, GAP_QUESTION→생각해 보기, CLOSE_GAP→빠진 내용, CLOSE_NO_RESPONSE→문단 핵심, CLOSE_ERRORS→`message`를 바로잡기로, 이어서 `coreSummary`를 문단 핵심으로 두 말풍선.
- 새 엔드포인트 `POST .../session/:id/attempt` 본문 `{ paragraphIndex }` (`SimpleNewAttemptSchema`, strict). `index.ts` 라우팅에 추가.
  - 현재 시도가 PROCESSING이면 오류.
  - 현재 시도에 학생 발화가 하나도 없으면 오류("이미 새 시도입니다").
  - 현재 시도가 끝나지 않았으면 `abandoned=true`(중단)로 표시하고 `ATTEMPT_ABANDONED` 로그를 남긴다.
  - 새 시도를 추가하고 `ATTEMPT_STARTED` 로그. `currentIndex`를 그 문단으로. 뷰 반환.
  - `canStartNewAttempt` = 현재 시도에 학생 발화가 있고 PROCESSING이 아님.
- `respond`: 현재 시도에 적용. 끝난 시도에는 기존처럼 거부.
- `view().current.restatedSummary` = 현재 시도 마지막 단계의 `output.restatedSummary`, 단계가 없으면 null. `highlights`는 현재 시도가 끝났을 때만(기존과 같음).
- `allDone`/`problemUrl`: 모든 문단에 완료된 시도가 있을 때.
- 로그 `sessions.jsonl`: `schemaVersion: 'dialogue-simple-holistic-record-v2'`, 모든 줄에 `attemptNumber`. 이벤트: `STEP`, `EVALUATION_FAILED`, `ATTEMPT_STARTED`, `ATTEMPT_ABANDONED`. 첫 시도(1)는 `ATTEMPT_STARTED`를 남기지 않아도 된다.
- `saveMemo`: `SimpleMemoSchema`에 `attemptNumber: number|null` 추가. 존재하지 않는 시도·단계는 거부. 기록에 `attemptNumber` 포함.
- `inspect`: 모든 시도를 반환. 시도 상태는 끝났으면 DONE, `abandoned`면 ABANDONED, 아니면 IN_PROGRESS.

### 클라이언트

- `simple-dialogue-api.ts`: `newAttemptSimple(id, paragraphIndex)`, `saveSimpleMemo` 본문에 `attemptNumber`.
- `SimpleDialogueApp.tsx`
  - 말풍선 위 작은 글씨를 지금의 '나'/'튜터' 대신 `label`로.
  - 채팅 칸에서 대화 스크롤 위에 고정 칸 "지금까지 내 요약": `restatedSummary`가 null이면 "첫 요약을 보내면 여기에 정리돼." 빈 문자열이면 "아직 이 문단에 대한 내용이 없어." 아니면 본문. 시각적으로 말풍선과 구분(옅은 테두리 상자).
  - 헤더(또는 채팅 칸 헤더)에 "시도 n" 표시와 [새 시도] 버튼(`canStartNewAttempt`일 때만 활성). 진행 중 시도에서 누르면 `confirm('지금 시도를 중단하고 새로 시작할까?')`.
- `SimpleDialogueDrawer.tsx`
  - 맨 위 문단 전체 인상 메모(`attemptNumber=null`).
  - 시도 선택 버튼(시도 1, 2… · 상태 표시: 진행 중/완료 결과/중단). 기본 선택은 현재 시도.
  - 선택한 시도의 대화(라벨 포함, 읽기 전용), 시도 인상 메모, 단계 카드(기존 내용 + `restatedSummary` 한 줄 "다시 정리한 요약") 와 단계 인상 메모.
  - `MemoField`는 `key`에 시도 번호를 넣어 시도 전환 시 초기값이 바뀌게 한다.
- `simple-dialogue.css`: 상태 라벨, 요약 칸, 시도 표시 스타일. 문제 풀이 화면의 말풍선 상단 라벨과 비슷한 크기·색.

## 완료 조건

- [ ] 프롬프트 v2를 읽고 v1과 차이(restatedSummary, CLOSE_ERRORS message/coreSummary 분리, 문장 전체 인용)가 스키마·화면과 맞는다.
- [ ] 서버 테스트(`dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`)에 추가: 라벨 부여(학생 3종, 튜터 전 행동, CLOSE_ERRORS 두 말풍선), restatedSummary 뷰 반영(판정 전 null), 새 시도(완료 후·진행 중 중단·빈 시도 거부·PROCESSING 거부), 이전 시도 보존과 inspect, 시도별 메모 저장·옛 메모 줄 해석, 로그 attemptNumber·이벤트, 모델 입력 dialogue에 라벨 없음, 골드 미사용(기존 테스트 유지).
- [ ] `npm test` 중 paragraph-simple·dialogue-simple 관련 전부 통과. 기존 무관 실패 2건(boundary.test의 student-state.ts, axis-architecture ENOENT) 외 새 실패 없음.
- [ ] `npm run typecheck`, `npm run build` 통과(루트 스크립트 이름이 다르면 package.json 기준).
- [ ] 변경 파일에 TODO·skip·only·스텁 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 실제 OpenAI 호출 없이 모의 평가기로만 테스트한다.
- 실행 중인 개발 서버(포트 5173~5175)를 멈추거나 재시작하지 않는다. 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 파이프라인: `packages/pipeline/src/paragraph-simple/{schema,evaluator}.ts`(v2 프롬프트·버전, `restatedSummary`), `{rules,evaluator}.test.ts`
  - 공유: `packages/app/src/shared/dialogue-simple.ts`
  - 서버: `packages/app/src/server/dialogue-simple.ts`(시도 구조·라벨·`startAttempt`·시도별 메모·로그 v2), `index.ts`(`/attempt` 라우트), `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`
  - 클라이언트: `packages/app/src/client/{SimpleDialogueApp.tsx,SimpleDialogueDrawer.tsx,simple-dialogue-api.ts,simple-dialogue.css}`
- 테스트 결과: paragraph-simple·dialogue-simple 4개 파일 67개 통과. 전체 `npm test` 1273 통과·2 실패(기존 무관 실패: boundary.test의 student-state.ts, axis-architecture ENOENT). `npm run typecheck`, `npm run build`, `build:client` 통과. 실모델 호출 없음.
- 남은 문제: 없음. 편차: `SimpleNewAttemptRequest`를 공유 계약에 추가함(클라이언트 본문 타입용). 화면은 브라우저에서 직접 확인하지 않았다(타입·빌드만 검증).
