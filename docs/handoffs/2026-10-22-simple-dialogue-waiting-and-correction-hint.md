# 인계: 단순 형식 대화 — 판정 중 생각중 말풍선 + 교정 질문 때 근거 문장 표시

- 날짜: 2026-10-22
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: 없음(화면 동작 보완). 사용자 확인 2026-10-22. D-0149(v4.5 중심 운영, 부분 수정)의 범위 안이다.

## 배경(사용자 확인)

1. "모델이 판정하는 시간 동안, 대화창에서 적절한 생각중 피드백 필요(예: '요약 응답을 파악하고 있어 ..', 문제 풀이 부분 참고)". 예시는 방향 예시이며 문구 틀이 아니다.
2. "교정 질문이 나올 때 지문에 해당 관련 문장을 미색으로 표시하기". 논의 뒤 Claude 권고에 "권고 동의":
   - 교정 질문(`CORRECTION_QUESTION`)에만 표시한다. 빈 곳 질문(`GAP_QUESTION`)에는 표시하지 않는다(표시할 문장이 곧 빠진 내용이라 답을 알려 주게 된다).
   - 마무리 공개 표시(#fff3d6)보다 더 옅은 별도 미색으로 구분한다.
   - 표시된 문장을 베껴 답하는 경우는 받아들인다(교정 뒤 단계에 복사 감지를 켜지 않는다).
   - 학생이 답을 보내 판정이 시작되면 힌트 표시를 지운다. 마무리되면 기존 공개 표시로 바뀐다.

## 목표

- 단순 형식 대화(`/dialogue/dev/simple`)에서 답을 보낸 뒤 판정이 끝날 때까지, 대화창에 보낸 답과 튜터의 생각중 말풍선이 보인다. 문구는 단계와 경과 시간에 따라 바뀐다.
- 교정 질문이 나와 학생의 답을 기다리는 동안, 지문에서 그 오류의 근거 문장(`state.targetError.sourceQuote`)이 옅은 미색으로 표시된다.

## 범위 밖

- 프롬프트, 판정 규칙(`packages/pipeline/**`), 복사 감지, 시뮬레이션 파일.
- `annotated-text.tsx`(다른 화면과 공유), 문제 풀이 화면과 그 CSS(`problem-feedback-workbench.css`, `ProblemFeedbackV4App.tsx`, `v4-composer-state.ts`)는 수정하지 않는다. 문구와 동작만 참고한다.
- 학생용 기존 축 기반 대화 화면(`DialogueApp.tsx`).
- 작업 트리의 다른 미커밋 변경(v4.6, 파트 이동 막대, 다른 세션의 문제 풀이·e2e 파일)은 되돌리거나 바꾸지 않는다. 아래 파일에 이미 들어 있는 v4.6·이동 막대 변경은 유지한 채 덧붙인다.
- 커밋, 외부 API 호출, e2e 실행.

## 손댈 파일과 계약

### 1. 생각중 말풍선

- `packages/app/src/shared/dialogue-simple.ts`: `SimpleDialogueView.current`에 `stage: 'INITIAL' | 'RETRY' | 'AFTER_CORRECTION' | 'AFTER_GAP'`(현재 시도의 `state.stage`)를 더한다.
- `packages/app/src/server/dialogue-simple.ts` `view()`: `stage: p.state.stage`.
- `packages/app/src/client/simple-waiting.ts`(새 파일, 순수 함수) + `simple-waiting.test.ts`
  - `export function simpleWaitingText(stage, elapsedMs): string`. 반말. 문구(방향은 문제 풀이 `waitingText`와 같게):
    - 25초 이상: `조금 오래 걸리고 있어. 조금만 더 기다려 줘`
    - INITIAL·RETRY: 0초 `네 요약을 읽고 있어` → 6초 `문단이랑 하나씩 맞춰 보고 있어` → 15초 `어떤 내용을 잡았는지 정리하고 있어`
    - AFTER_CORRECTION: 0초 `네 답을 읽고 있어` → 6초 `아까 질문이랑 맞춰 보고 있어`
    - AFTER_GAP: 0초 `네 답을 읽고 있어` → 6초 `물어본 내용이 채워졌는지 보고 있어`
  - 테스트: 단계별 경계값(0, 5999, 6000, 15000, 25000ms).
- `packages/app/src/client/SimpleDialogueApp.tsx`
  - 보내기(`submit`)를 누른 순간부터 응답이 올 때까지 대기 상태다: 보낸 글(`pendingText`)과 대기 시작 시각을 상태로 둔다. 다른 `run` 작업(시작, 이동, 새 시도)은 대기 말풍선을 띄우지 않는다.
  - 대기 중 대화창 끝(기존 메시지 뒤)에 차례로 그린다.
    - 학생 말풍선: `SimpleBubble`에 `{ role: 'student', text: pendingText, label }`. label은 서버 `studentLabel`과 같은 단계별 이름을 쓴다(서버 코드의 표를 보고 같은 값을 클라이언트에 둔다. 공유 상수로 빼도 된다).
    - 튜터 대기 말풍선: `<article className="chat-message tutor simple-waiting" role="status" aria-live="polite"><small className="simple-label">피드백</small><p>{simpleWaitingText(stage, elapsed)}<span className="simple-waiting-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></p></article>`. `stage`는 보내기 직전 `current.stage`. 1초마다 경과 시간을 갱신한다.
  - 새로 고침 등으로 `current.evaluationStatus === 'PROCESSING'`인 화면을 받았을 때(내 대기 상태 없음)는 기존 `판정하는 중이에요…` 줄 대신 같은 튜터 대기 말풍선을 보인다(학생 글은 서버 기록에 이미 있으므로 따로 그리지 않는다. 경과 시간은 화면을 받은 때부터 센다).
  - 응답을 받거나 오류가 나면 대기 상태를 지운다. 오류(`RETRYABLE_ERROR` 포함) 때 초안을 지우지 않는 기존 동작은 그대로 둔다.
  - 대기 말풍선이 나타날 때도 대화창이 맨 아래로 스크롤되게 한다(기존 스크롤 effect의 의존값에 대기 상태를 더한다).
- `packages/app/src/client/simple-dialogue.css`: `.simple-waiting-dots` 점 애니메이션(문제 풀이 `.v4-waiting-dots`와 같은 모양, `prefers-reduced-motion`이면 애니메이션 없음). 대기 말풍선 글자는 약간 흐리게(예: `color: #5f6f69`).

### 2. 교정 질문 근거 문장 표시

- `packages/app/src/shared/dialogue-simple.ts`: `current`에 `highlightKind: 'HINT' | 'REVEAL' | null`을 더하고 `highlights` 주석을 고친다.
- `packages/app/src/server/dialogue-simple.ts` `view()`:
  - 문단이 끝났으면 지금처럼 마지막 단계의 highlights, `highlightKind: 'REVEAL'`(highlights가 비면 null).
  - 끝나지 않았고 `p.state.stage === 'AFTER_CORRECTION'`이고 `p.status !== 'PROCESSING'`이고 `p.state.targetError`가 있으면, `targetError.sourceQuote`를 문단 텍스트에서 `locate`한 결과 하나, `highlightKind: 'HINT'`(찾지 못하면 빈 배열, null).
  - 그 밖에는 빈 배열, null.
  - 단계 기록(`Step.highlights`, 개발자 서랍)은 바꾸지 않는다.
- `packages/app/src/client/SimpleDialogueApp.tsx`: 원문 칸 `<article>`(현재 `AnnotatedText`를 감싼 요소)에 `highlightKind === 'HINT'`면 `is-hint` 클래스를 더한다. 내 대기 상태(보낸 뒤 판정 중)에는 힌트 highlights를 넘기지 않는다.
- `packages/app/src/client/simple-dialogue.css`: `.simple-source .is-hint .v4-highlight { background-color: #fffaeb; }`처럼 기존 #fff3d6보다 옅은 미색(선택자는 실제 구조에 맞춘다).
- 서버 테스트(`packages/app/src/server/dialogue-simple.test.ts`): 모의 출력으로
  - 교정 질문 뒤 view: `highlightKind === 'HINT'`, highlights 한 개, 그 text가 `errors[0].sourceQuote`.
  - 빈 곳 질문 뒤 view: highlights 빈 배열, `highlightKind === null`.
  - 마무리(CLOSE_ERRORS 등) 뒤 view: `highlightKind === 'REVEAL'`.
  - `current.stage` 값 단언 하나.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과
- [ ] `npx vitest run packages/app/src` 통과(기존 `boundary.test.ts` 실패 1건은 `server/student-state.ts` 때문이며 이 작업과 무관. 그 밖의 실패는 없어야 한다)
- [ ] 변경 파일이 이 문서의 "손댈 파일"(+ 새 파일·테스트)을 벗어나지 않음
- [ ] 수동 확인 경로를 결과 보고에 적는다(개발 서버 확인은 Claude가 한다)

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/app/src/shared/dialogue-simple.ts`: `SimpleStage`, 공유 상수 `simpleStudentLabel`(서버 표를 옮김), `current.stage`, `current.highlightKind`, highlights 주석.
  - `packages/app/src/server/dialogue-simple.ts`: 서버의 `studentLabel` 표를 공유 상수로 대체, `view()`에 stage·교정 질문 HINT(`targetError.sourceQuote`를 `locate`)·REVEAL 구분.
  - `packages/app/src/client/simple-waiting.ts`, `simple-waiting.test.ts`(새 파일): 단계·경과 시간별 문구와 경계값 테스트.
  - `packages/app/src/client/SimpleDialogueApp.tsx`: 보내기 직후 학생 말풍선 + 튜터 대기 말풍선(1초 갱신), 새로 고침 PROCESSING 시 같은 대기 말풍선(기존 `판정하는 중이에요…` 줄 대체), 스크롤 의존값에 대기 추가, 원문 칸 `is-hint` 클래스, 대기 중 힌트 highlights 제거.
  - `packages/app/src/client/simple-dialogue.css`: `.is-hint` 옅은 미색(#fffaeb), 대기 말풍선 글자색·점 애니메이션(reduced-motion 대응).
  - `packages/app/src/server/dialogue-simple.test.ts`: 새 테스트 1개(HINT/빈 곳/REVEAL/stage). 기존 두 단언(시나리오 6의 q1, 시나리오 7의 q)은 "교정 질문 뒤 highlights 빈 배열"을 가정했으므로 HINT를 기대하도록 고쳤다(이번 변경의 의도된 동작 변화).
- 테스트 결과: `npm run build` 통과, `npm run typecheck:client` 통과, `npx vitest run packages/app/src` 221 통과 / 1 실패(기존 `boundary.test.ts`, 이 작업과 무관).
- 남은 문제:
  - 수동 확인 경로(Claude): `/dialogue/dev/simple`에서 (1) 첫 요약 전송 직후 학생 말풍선과 "네 요약을 읽고 있어…" 말풍선이 6초·15초·25초에 문구가 바뀌는지, 교정 질문 뒤 답 전송 시 "네 답을 읽고 있어"로 시작하는지. (2) 교정 질문이 나온 뒤 지문에 옅은 미색 근거 문장이 보이고, 답을 보내면 사라지고 마무리 때 기존 #fff3d6으로 바뀌는지. 빈 곳 질문에서는 표시가 없는지. (3) 판정 중 새로 고침하면 튜터 대기 말풍선만 보이는지. (4) 오류 시 대기 말풍선이 사라지고 초안이 남는지.
  - 설계 공백 없음. 대기 상태는 `submit` 호출 시 설정하고 `run` 종료(`finally`)에서 지운다.
