# 인계: 문제 풀이 개발 화면에 출제자 전략 보기 연결

- 날짜: 2026-10-24
- 작성: 코드 에이전트
- 실행: 하위 에이전트(executor, sonnet)
- 관련 결정: `memory/decisions/D-0170-optional-examiner-strategy-feedback.md`(4항, 다음 단계 2의 사용자 수정)
- 자료: `docs/experiments/examiner-strategy-2026-10-23/FINAL.json`(57편, `items[]`: `passageId`, `question`, `choice`, `text`)
- 모형(바뀌기 전 판, 참고용): `docs/handoffs/2026-10-23-examiner-strategy-ui-mock-{1,2}.png`. 아래 "화면 흐름"이 우선이다. 모형의 카드·탭·노란 딱지는 쓰지 않는다.

## 목표

개발자 문제 화면(`/problem/dev/v4`, `packages/app/src/client/ProblemFeedbackV4App.tsx`)에서 세션이 끝나면(`phase === 'COMPLETED'`), `FINAL.json`에 글이 있는 문항에 한해 출제자 전략을 대화 말풍선으로 볼 수 있다.

## 범위 밖

- 문제 세트 흐름([다음 문제로]·[다음 지문으로]). 끝 버튼은 지금처럼 [같은 문제 다시 풀기]·[학습 맵으로 돌아가기 →]를 유지한다.
- 학생용 경로(v3), 판정·교정·마지막 설명 로직, 지시문, `FINAL.json` 내용 수정.
- 출제자 전략 글을 판정기나 마지막 설명의 입력으로 쓰는 것(D-0002·D-0167 유지).
- 외부 API 호출.

## 화면 흐름 (확정)

1. 세션이 `COMPLETED`이고 기존 말풍선 순차 표시가 끝난 뒤, 이 문항에 전략 글이 있으면 다음이 나타난다.
   - 튜터 말풍선(작은 이름표 `피드백`): **"출제자가 이 선지에 어떤 전략으로 함정을 만들었는지 검토할 수 있어."**
   - 제출 칸 오른쪽 주 버튼 자리: **[출제자 전략 보기]**. 기존 [같은 문제 다시 풀기]·[학습 맵으로 돌아가기 →] 버튼은 그대로 함께 둔다.
2. [출제자 전략 보기]를 누르면 **처음 여는 선지**의 글을 문단(빈 줄 `\n\n` 기준)으로 나눠 **문단마다 튜터 말풍선 하나**를 보여 준다.
   - 말풍선 이름표: `출제자 전략 · ②`(선지 번호는 ①~⑤ 기호).
   - 본문은 기존 `Markdown` 컴포넌트로 그린다.
   - 첫 문단을 바로 보여 주고, 나머지 문단은 [다음으로 넘어가기] 버튼(기존 NEXT와 같은 문구와 모양)을 누를 때마다 하나씩 보여 준다.
3. 마지막 문단 다음에 **끝 말풍선**(이름표 `피드백`)을 띄운다.
   - 아직 안 본 비틀린 선지가 있으면: "②번 전략은 여기까지야. 다른 선지의 함정도 볼 수 있어."
   - 없으면: "②번 전략은 여기까지야."
4. 끝 말풍선 뒤 제출 칸:
   - 왼쪽: 아직 안 본 비틀린 선지 번호 버튼. 기존 선지 선택 버튼(`v4-choice-buttons`)과 같은 모양이고, 접근성 이름은 "④번 전략 보기"다. 누르면 그 선지로 2~3을 반복한다.
   - 오른쪽: [같은 문제 다시 풀기]·[학습 맵으로 돌아가기 →].
5. **처음 여는 선지**: 학생의 마지막 선택(`result.selectedChoiceId`의 번호)이 이 문항의 비틀린 선지 목록에 있으면 그 선지를 연다. 없으면 목록에서 번호가 가장 작은 선지를 연다(부정 발문은 목록이 정답 하나다).
6. **문제 칸 강조**: 전략을 보는 동안 가운데 문제 칸에서 지금 전략을 보는 선지에 기존 선택 표시(`data-selected`)를 붙인다. 다른 선지로 바꾸면 강조도 옮긴다. 다른 선지에는 붙이지 않는다. 새 색이나 딱지는 만들지 않는다.
7. 좁은 화면(지문·문제·대화 탭)에서는 탭을 자동으로 바꾸지 않는다.
8. 새 말풍선이 생기면 대화창이 기존 규칙대로 맨 아래를 따라간다.
9. 전략 말풍선은 서버 대화 기록(`transcript`)에 넣지 않는 화면 상태다. 새로고침하면 1의 상태(안내 말풍선 + 버튼)로 돌아간다.

## 손댈 파일과 계약

### 서버

1. **새 모듈** `packages/app/src/server/examiner-strategy.ts`
   - `FINAL.json`을 읽어 `questionId`(`<passageId>-q<question>`) → `{ position: number, paragraphs: string[] }[]`(번호순) 맵을 만든다. 경로 기본값은 저장소 루트 기준 `docs/experiments/examiner-strategy-2026-10-23/FINAL.json`이고, 환경 변수 `EXAMINER_STRATEGY_PATH`로 바꿀 수 있다. 파일이 없거나 형식이 틀리면 기능을 끈다(모든 문항 `available: false`, 서버 기동은 막지 않음, 경고 1회 기록).
   - `strategyFor(view)`: `view.phase !== 'COMPLETED'`이거나 글이 없으면 `{ available: false }`. 있으면 `{ available: true, firstPosition, choices: [{ position, paragraphs }] }`. `firstPosition`은 흐름 5의 규칙을 따른다.
2. **새 경로**(`packages/app/src/server/index.ts`, 기존 `/api/developer/problem-feedback-v4/` 처리 안):
   - `GET /api/developer/problem-feedback-v4/session/:id/examiner-strategy` → 위 결과. 세션이 없으면 기존 경로와 같은 404 처리.
   - `POST /api/developer/problem-feedback-v4/session/:id/examiner-strategy/view` 본문 `{ position }` → 사용 기록을 남기고 `{ ok: true }`. `COMPLETED`가 아니거나 그 번호의 글이 없으면 400.
   - 사용 기록: 기존 문제 v4 이벤트 기록 방식이 있으면 그것을 쓰고(`.omc/logs/problem-feedback-v4/` 아래), 없으면 `.omc/logs/problem-feedback-v4/examiner-strategy.jsonl`에 한 줄씩 `{ savedAt, sessionId, questionId, position, first: boolean }`을 쓴다. 어느 쪽을 썼는지 결과 보고에 적는다.
   - 정답 노출 방지: `COMPLETED` 전에는 글을 내주지 않는다(1의 조건). 테스트로 확인한다.

### 공유 타입

`packages/app/src/shared/problem-feedback-v4.ts`에 응답 타입 `ExaminerStrategyView`를 추가한다(클라이언트 안전 계약, 파이프라인 import 금지).

### 클라이언트

- `packages/app/src/client/problem-feedback-v4-api.ts`: `getExaminerStrategy(id)`, `markExaminerStrategyView(id, position)`.
- `packages/app/src/client/ProblemFeedbackV4App.tsx`: 흐름 1~9를 구현한다. 상태 로직은 가능하면 별도 순수 함수 모듈(예: `examiner-strategy-state.ts`)로 빼서 단위 테스트한다. 들어갈 상태: 지금 선지, 본 문단 수, 본 선지 목록, 끝 말풍선 여부.
- `packages/app/src/client/v4-composer-state.ts`: 버튼 종류에 `STRATEGY_OPEN`([출제자 전략 보기]), `STRATEGY_NEXT`([다음으로 넘어가기]), 전략 선지 번호 버튼을 추가한다. 기존 버튼의 순서·문구·동작은 바꾸지 않는다.
- 스타일은 기존 클래스(`chat-message tutor`, `v4-choice-buttons`, `primary`)를 재사용한다. 새 CSS는 꼭 필요한 것만 쓴다.

## 테스트

- 서버 단위: 대상 판별(57편 로드, 법인 13번 ② 있음, 비틀린 선지가 아닌 번호는 없음), `COMPLETED` 전 `available: false`, `firstPosition` 규칙 세 경우(선택이 목록에 있음 / 정답 선택 + 부정 발문 / 정답 선택 + 긍정 발문), 문단 나누기, 파일 없음 → 기능 끔, view 기록 400·200.
- 클라이언트 단위: 상태 함수(다음 문단, 끝 말풍선 문구 두 가지, 남은 번호 버튼, 강조 선지).
- e2e(`packages/app/e2e/problem-feedback-v4-workbench.spec.ts`, 기존 가짜 판정 하네스): 정보 비대칭 13번(부정 발문)으로 세션을 끝내고 다음을 확인한다.
  - 안내 말풍선과 [출제자 전략 보기]가 보인다.
  - 누르면 첫 문단 말풍선이 나오고, [다음으로 넘어가기]로 다음 문단이 나온다.
  - 끝 말풍선이 나온 뒤 번호 버튼이 없다(비틀린 선지 하나).
  - 문제 칸 ⑤에 `data-selected`가 붙는다.
  - 끝 버튼 두 개가 남아 있다.
  - 긍정 발문 문항이 하네스에 있으면 남은 번호 버튼으로 넘어가는 경우도 확인한다. 없으면 단위 테스트로 대신하고 그 사실을 보고한다.
- 기존 테스트가 모두 그대로 통과해야 한다. 관련 명령(저장소 기준):
  - `npx vitest run packages/app/src` (알려진 기존 실패 `boundary.test.ts` 1건은 그대로 두고 보고)
  - `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  - 클라이언트·서버 타입 검사(`npm run build` 또는 기존 typecheck 스크립트)

## 완료 조건

- [ ] 위 테스트 통과(새 테스트 포함).
- [ ] 화면 캡처 2장을 `docs/handoffs/2026-10-24-examiner-strategy-ui-after-{1,2}.png`에 저장한다. 1은 안내 말풍선과 버튼, 2는 전략 문단 말풍선 두 개와 문제 칸 강조를 담는다. e2e 하네스 화면으로 찍는다.
- [ ] 외부 API 호출 0회.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고, 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 예: 기존 순차 표시(`sequenceState`)와 섞여 버튼 상태가 꼬이는 경우, `COMPLETED` 뒤에도 다른 세션의 버튼이 남는 경우.
- 외부 API 호출·외부 전송이 필요해지면 실행 전에 멈춘다.
- 파일을 삭제(`rm` 등)하지 않는다. git commit·add·stash를 하지 않는다. `.env` 값을 출력하지 않는다.
- 다른 세션이 띄운 개발 서버(5173·5174·5175)를 끄지 않는다. e2e는 위의 격리 포트를 쓴다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 신규: `packages/app/src/server/examiner-strategy.ts`(+`.test.ts`), `packages/app/src/client/examiner-strategy-state.ts`(+`.test.ts`)
  - 수정: `packages/app/src/shared/problem-feedback-v4.ts`(`ExaminerStrategyView`), `server/index.ts`(GET `.../examiner-strategy`, POST `.../examiner-strategy/view`, 옵션 `examinerStrategyPath`·`examinerStrategyLog`), `server/session.ts`(파일 읽기·사용 기록 함수), `server/problem-feedback-v4-http.test.ts`, `client/problem-feedback-v4-api.ts`, `client/v4-composer-state.ts`(+test), `client/ProblemFeedbackV4App.tsx`, `e2e/problem-feedback-v4-workbench.spec.ts`
  - 캡처: `docs/handoffs/2026-10-24-examiner-strategy-ui-after-1.png`, `-after-2.png`
- 테스트 결과:
  - `npx vitest run packages/app/src`: 235 통과, 1 실패(알려진 `boundary.test.ts`, 오탐 파일은 기존 `server/student-state.ts`뿐). 내가 추가한 fs 접근은 `session.ts`에 둬서 규칙을 지켰다.
  - `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`: 16 통과(새 1건 포함).
  - `npm run typecheck`, `npm run typecheck:client`: 오류 0.
- 사용 기록 방식: 기존 v4 `events.jsonl`은 세션 전체 스냅샷 형식(`FeedbackV4Record`)이라 맞지 않아 대체 경로 `.omc/logs/problem-feedback-v4/examiner-strategy.jsonl`(환경 변수 `CSAT_EXAMINER_STRATEGY_LOG`로 변경 가능)에 `{ savedAt, sessionId, questionId, position, first }`를 한 줄씩 쓴다. `first`는 서버 메모리의 세션별 본 선지 집합 기준(서버 재시작 시 초기화).
- 긍정 발문 e2e: 하네스는 정보 비대칭 13번(부정 발문) 하나뿐이라 하지 못했다. 남은 번호 버튼·끝 말풍선 두 문구·강조 이동은 단위 테스트(`examiner-strategy-state.test.ts`, `v4-composer-state.test.ts`)로 대신했다. e2e는 정답 ⑤ 외에 ① 오답 후 코칭 종료 경로로 완료해, 학생 선택(①)이 아닌 ⑤에만 `data-selected`가 붙는 것을 확인했다.
- 남은 문제 / 설계 해석(문서에 명시되지 않아 아래와 같이 구현, 이견 있으면 알려 달라):
  1. 마지막 문단을 보이면 끝 말풍선은 [다음으로 넘어가기] 추가 클릭 없이 바로 나온다.
  2. 전략을 읽는 중(마지막 문단 전)에는 [다음으로 넘어가기] 옆에 기존 [같은 문제 다시 풀기]·[학습 맵으로 돌아가기 →]도 둔다. 새 버튼은 기존 버튼 앞에 놓는다.
  3. 다른 선지로 바꿔도 앞 선지의 말풍선은 대화창에 남는다(끝 말풍선 문구는 열 당시 기준으로 고정).
  4. 존재하지 않는 세션은 기존 경로와 같이 `get`의 예외로 처리된다(기존 동작 그대로 500).
  5. 긍정 발문 e2e 부재(위).
