# 인계: 개발 화면 파트 이동 막대(문단별 · 문제)

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: 없음(개발 화면 편의 기능). 사용자 확인 2026-10-19.

## 배경(사용자 확인)

- "개발 화면에서 어디든 원하는 파트(문단 별, 문제 파트)로 이동할 수 있는 버튼을 만들어줘."
- 두 화면 모두에 둔다: 단순 형식 문단 대화 개발 화면(`/dialogue/dev/simple`)과 문제 풀이 개발 화면(`/problem/dev/v4`).
- 문제로는 언제든 갈 수 있다(문단을 다 끝내지 않아도 된다). 문제 화면의 기존 `returnTo`로 대화 세션을 넘겨, 돌아오면 하던 세션의 해당 문단이 열린다. 돌아갈 세션이 없으면 그 지문의 새 세션을 시작해 해당 문단으로 간다.
- 위치·모양: 머리글 바로 아래 한 줄의 이동 막대 `[문단 1 ✓] [문단 2] … │ [문제]`. 지금 위치를 강조한다. 원문 칸 안의 기존 문단 번호 버튼(`simple-paragraph-nav`)은 이 막대로 옮기고 원문 칸에서는 뺀다. 연결된 문제가 없으면 "문제" 버튼은 비활성. 좁은 폭에서는 옆으로 스크롤. 마지막 문단 완료 뒤의 "문제 풀기" 버튼은 그대로 둔다.

## 목표

- 문단 대화 개발 화면 어디서든 막대로 다른 문단, 또는 그 지문의 문제 화면으로 이동할 수 있다.
- 문제 개발 화면에서 막대로 그 지문의 문단 N으로 이동할 수 있다. 대화 화면에서 넘어온 경우에는 같은 세션으로 돌아간다.

## 범위 밖

- 학생용 화면(`/dialogue`, `/problem` 학생 경로, `/progress`)과 기존 축 기반 개발 화면(`/dialogue/dev`).
- 판정·서버 대화 로직, 프롬프트, 시뮬레이션 파일.
- `packages/app/src/client/SimpleDialogueDrawer.tsx`, `packages/app/src/client/simple-dialogue.css`의 기존 v4.6 미커밋 변경(다른 작업분이 이미 들어 있음)은 되돌리거나 바꾸지 않는다. CSS는 새 파일에 둔다.
- `packages/app/e2e/*`와 문제 풀이 서버 파일(다른 세션의 미커밋 변경). e2e는 실행하지 않는다.
- 커밋, 외부 API 호출.

## 손댈 파일과 계약

- `packages/app/src/shared/contract.ts`: `DialoguePassageSummary`에 `readonly problemQuestionId?: string;`를 더한다.
- `packages/app/src/server/dialogue.ts`: `listPassages()`가 `passage.problemQuestionId`가 있으면 그 값을 함께 준다(없으면 필드 생략).
- `packages/app/src/shared/dialogue-simple.ts`: `SimpleDialogueView`에 `problemQuestionId: string | null`을 더한다.
- `packages/app/src/server/dialogue-simple.ts`: `view()`에서 `problemQuestionId: r.passage.problemQuestionId ?? null`. 기존 `problemUrl`은 그대로 둔다.
- `packages/app/src/client/DevPartNav.tsx`(새 파일) + `packages/app/src/client/dev-part-nav.css`(새 파일, 컴포넌트에서 import)
  - `export function DevPartNav(props: { paragraphs: { label: string; done?: boolean; onSelect: () => void }[]; currentParagraph: number | null; problem: { onSelect: () => void } | null; currentIsProblem: boolean; disabled?: boolean })`
  - `<nav className="dev-part-nav" aria-label="파트 이동">`: 문단 버튼들(`문단 N`, done이면 ` ✓`, 현재면 `aria-current="true"`) → 구분선 → `문제` 버튼(현재면 `aria-current="true"`, `problem === null`이면 disabled).
  - CSS: 한 줄, `overflow-x: auto`, 버튼 줄바꿈 없음, 현재 위치 강조(배경/테두리), 16px 좌우 여백. 기존 `simple-paragraph-nav` 스타일을 참고해도 된다.
- `packages/app/src/client/SimpleDialogueApp.tsx`
  - 세션 화면 `<p className="developer-notice">` 바로 위(머리글 바로 아래)에 `DevPartNav`를 둔다. 문단 선택은 기존 `go(i)`. 문제 선택은 `window.location.assign('/problem/dev/v4?' + new URLSearchParams({ questionId: view.problemQuestionId, returnTo: '/dialogue/dev/simple?sessionId=' + view.sessionId }))`. `problemQuestionId`가 null이면 `problem: null`.
  - 원문 칸의 `<nav className="simple-paragraph-nav" …>`를 지운다.
  - 첫 로드 URL 처리: `?sessionId=X&paragraph=N`이면 `getSimple(X)` 뒤 N이 현재 문단과 다르면 `navigateSimple(X, N)`. `?passageId=P&paragraph=N`이면 `startSimple(P)` 뒤 N>0이면 `navigateSimple`(시작 화면의 "문단 N" 버튼과 같은 동작). `paragraph`는 0부터인 정수이고, 범위 밖이면 무시. `accept`가 URL을 `?sessionId=`만 남기도록 바꾸는 기존 동작은 그대로.
- `packages/app/src/client/ProblemFeedbackV4App.tsx`
  - `returnTo` 허용 정규식에 `/dialogue/dev/simple?sessionId=[a-zA-Z0-9-]+` 형태를 더한다(기존 허용 형태와 기본값 `/dialogue/dev`는 그대로).
  - `fetchDialoguePassages()`(`./api.js`)로 지문 목록을 받아 `problemQuestionId === questionId`인 지문을 찾는다. 찾으면 세션 화면 머리글 바로 아래(`developer-notice` 위)에 `DevPartNav`를 둔다: 문단 `paragraphCount`개, `currentIsProblem: true`, `problem: { onSelect: () => {} }`(현재 위치라 동작 없음). 문단 N 선택:
    - `returnTo`가 `/dialogue/dev/simple?sessionId=…`이면 `window.location.assign(returnTo + '&paragraph=' + N)`
    - 아니면 `window.location.assign('/dialogue/dev/simple?' + new URLSearchParams({ passageId, paragraph: String(N) }))`
  - 지문을 못 찾거나 목록 요청이 실패하면 막대를 그리지 않는다(화면의 나머지 동작에 영향 없음).
- 테스트: 순수 로직(예: 첫 로드 URL 해석, 문단 이동 주소 만들기)을 작은 함수로 빼면 단위 테스트를 더한다(`packages/app/src/client/*.test.ts` 형식). 서버의 `problemQuestionId` 노출은 기존 서버 테스트에 단언 하나씩 더한다.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과
- [ ] `npx vitest run packages/app/src` 통과
- [ ] 변경 파일이 이 문서의 "손댈 파일"(+ 새 테스트 파일)을 벗어나지 않음
- [ ] 수동 확인 경로를 결과 보고에 적는다(개발 서버는 Claude가 재시작해 확인한다)

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일: `shared/contract.ts`, `server/dialogue.ts`, `shared/dialogue-simple.ts`, `server/dialogue-simple.ts`, `client/SimpleDialogueApp.tsx`, `client/ProblemFeedbackV4App.tsx`(이상 packages/app/src), 새 파일 `client/DevPartNav.tsx`, `client/dev-part-nav.css`, `client/dev-part-nav-links.ts`(+`.test.ts`, 순수 로직: URL 해석·주소 만들기·returnTo 검증), 서버 테스트 단언 추가 `server/dialogue-simple.test.ts`, `server/dialogue.test.ts`.
- 테스트 결과: `npm run build`, `npm run typecheck:client` 통과. `npx vitest run packages/app/src` 215 통과 / 1 실패(`boundary.test.ts` — `server/student-state.ts`가 node:fs import, 이 작업이 건드리지 않은 파일이고 미수정 상태라 기존 실패).
- 남은 문제: 수동 확인 경로 — (1) `/dialogue/dev/simple`에서 지문 시작 후 머리글 아래 막대의 문단 버튼으로 이동, `문제` 버튼으로 `/problem/dev/v4?...returnTo=` 이동; (2) 문제 화면 막대에서 문단 N 선택 시 같은 세션의 해당 문단으로 복귀; (3) `/problem/dev/v4?questionId=...`를 직접 열고 문단 N 선택 시 새 세션이 N번 문단에서 시작. 막대에서 뺀 기존 `.simple-paragraph-nav` CSS 규칙은 `simple-dialogue.css`(수정 금지)에 남아 있다. 원문 칸의 "위의 문단 번호로 이동하세요" 문구는 그대로 둠.
