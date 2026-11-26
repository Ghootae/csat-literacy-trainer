# 인계: 오답 카드 수정 (1층 규칙·기호 풀이 범위·문항 화면 이동 버튼)

- 날짜: 2026-11-20
- 작성: Claude(코드 에이전트 메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 결정: Ghootae 2026-11-20. `docs/handoffs/2026-11-19-wrong-answer-card-3-layer.md` 2절("풀이 대상")·7절.
- 선행 구현: `docs/handoffs/2026-11-20-wrong-card-3-layer-impl.md`(서버 `wrong-card.ts`, 화면 `ResultCard3.tsx`·`ResultSolve.tsx`).
- 지시문: `docs/experiments/wrong-card-layer1-2026-11-19/PROMPT-v1.4.md`(**메인 세션이 이미 작성함. 수정하지 말 것**).

## 목표

1. 서버가 v1.4 지시문을 쓰고 코드 검사가 v1.4 규칙을 따른다.
2. 결과 화면 오답 카드에서 문항 화면(3단 화면 `/problem/lab`)으로 가는 버튼 두 개와, 문항 화면에서 결과로 돌아오는 버튼을 만든다. 돌아오면 보던 카드 위치로 스크롤하고 3층 펼침 상태가 유지된다.

## 1) 서버

- `content.ts`: `WRONG_CARD_PROMPT_VERSION = 'v1.4'`, `loadWrongCardPrompt`가 `PROMPT-v1.4.md`를 읽는다(v1.3 파일은 지우지 않는다).
- `wrong-card.ts`의 코드 검사(`codeChecks`)를 v1.4 `## 코드 검사`에 맞춘다.
  - 기호: 기존 "symbolGlosses 기호가 모두 1층에 있다"를 **"발문(`stem`)·고른 선지 문장·1층(`layer1`)에 나온 기호 집합 = `symbolGlosses` 기호 집합"**으로 바꾼다. 기호 판별 정규식은 기존 `SYMBOL`을 쓴다. 입력 `symbols[]`의 부담이 아니라 세 글에서 직접 뽑는다. 풀이 30자 이내는 기존 그대로.
  - 1층 길이: 3문장·140자 이내(문장 수는 `. ? !` 종결 기준으로 센다. 기존 문장 수 세는 방식이 있으면 재사용하고 상한만 3으로).
  - 신규: `WRONG_PROVIDED`·`WRONG_OMITTED`·`WRONG_TRUE_CHOSEN`에서 `layer1`에 **정답 번호(원문자 ①~⑤)**가 나오면 실패. 고른 선지 번호는 허용. `CORRECT_WEAK`는 이 검사를 건너뛴다.
- 입력(`buildInput`)의 `symbols`는 지시문이 "발문·고른 선지·1층 기호"를 다 풀이하라고 하므로, 발문과 고른 선지 문장에 나오는 기호도 포함되게 한다(지금은 `scan` 범위가 어디까지인지 확인하고, 발문·고른 선지가 빠져 있으면 넣는다).

## 2) 화면

- `ResultCard3.tsx`:
  - 2층 "정답 선지" 칸 아래에 버튼 "문항 화면에서 정답 해설 보기" → 문항 화면의 3단 화면 중 정답 해설이 있는 곳으로 이동.
  - 3층 "출제자가 노린 것" 아래에 버튼 "문항 화면에서 출제자 의도 자세히 보기" → 그 **고른 선지**(`WRONG_TRUE_CHOSEN`이면 진짜 틀린 정답 선지)의 출제자 전략 글로 이동. `strategyAvailable`이 아니면 버튼을 숨긴다.
  - 기존 "문항으로 돌아가 출제자 설명 보기 →" 버튼은 위 두 버튼과 겹치므로 3층 카드 경로에서는 **이 두 버튼으로 대체**한다(11/17 카드 경로의 기존 버튼은 그대로).
  - 정답 카드(`CORRECT_WEAK`)에는 정답 선지 칸이 없으므로 정답 해설 버튼도 없다.
- `ProblemLabApp.tsx`(문항 화면): "결과로 돌아가기" 버튼. 결과에서 온 경우에만(쿼리 `returnTo`가 `/diagnostic` 계열일 때) 보이게 한다. 정답 해설·출제자 전략으로 직접 이동하는 쿼리 인자(예: `focus=answer-explanation|strategy&position=N`)와, 결과 복귀 정보(보던 카드 `questionId`)를 `returnTo`에 담는 방식은 이 저장소의 기존 `returnTo`·`resolveReturnTo` 규칙에 맞춰 정한다.
- 돌아오기: 결과 화면이 열리면 해당 카드로 스크롤하고 그 카드의 3층이 펼쳐진 상태(보던 때와 같음)로 보인다. 펼침 상태는 이동 전에 `sessionStorage`(또는 `returnTo` 쿼리)에 저장했다가 복원한다. 저장소가 막혀 있어도 깨지지 않게(try/catch) 한다.
- 문항 화면에서 "정답 해설"과 "출제자 전략"이 이미 어떻게 열리는지(`examiner-strategy-state.ts`, `strategy`, `view.result.answerRevealed` 등)를 먼저 읽고, **기존 동작을 바꾸지 않는 방식**으로 진입점만 추가한다.

## 3) 테스트(모델 호출 없음)

- 코드 검사 단위 테스트: 기호 집합 일치(통과), 발문·선지 기호가 풀이에서 빠지면 실패, 그 밖 기호가 있으면 실패, 1층에 정답 번호가 있으면 실패(고른 선지 번호만이면 통과, `CORRECT_WEAK`는 건너뜀), 1층 4문장 또는 141자면 실패, 140자 3문장 통과. 기존 테스트 중 v1.3 규칙에 묶인 것은 v1.4에 맞게 고친다.
- 화면: 정답 해설 버튼(정답 선지 칸, 정답 카드엔 없음), 출제자 의도 버튼(`strategyAvailable`일 때만), 이동 링크 쿼리, "결과로 돌아가기" 표시 조건, 복귀 시 스크롤·펼침 복원 로직(순수 함수로 빼서 테스트).
- `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic`와 `npm run typecheck` 통과. e2e 파일이 영향받으면 같이 고친다.

## 4) 확인 (외부 전송 승인 범위: **S-23 경마 6번·경마 7번 카드 두 장의 재생성만**)

- 선례: `docs/experiments/wrong-card-layer1-2026-11-19/run-s23-horse7.ts`·`runs/v1.3/s23-horse7.json`. 같은 방식으로 v1.4로 두 장만 생성하고 `runs/v1.4/` 에 저장한다. 호출은 카드당 최대 2회(재생성 포함), 합 최대 4회. 그 외 호출 금지(학생 전체 재실행 금지).
- 결과 보고: 각 장의 최종 상태(ready/fallback), 시도 횟수, 검사 실패 항목, 1층 문장 전문, symbolGlosses, 경마 6번 발문의 기호(ⓐ·ⓑ·㉡)가 풀이에 모두 들어갔는지, 1층에 정답 번호가 없는지. 검사를 완화하지 않는다.
- 화면 캡처 1장(PC): 위 두 버튼이 보이는 오답 카드(3층 펼침)를 `docs/handoffs/2026-11-20-wrong-card-revision-pc.png`로 저장. 개발 서버로 확인할 때 모델을 다시 호출하지 않도록 위 저장 결과를 주입하는 방법을 쓴다(방법이 없으면 멈추고 보고).

## 범위 밖

- `PROMPT-v1.4.md`·v1.3 이하 지시문·`run.mjs`·설계 문서 수정, `memory/` 기록, 커밋·푸시(메인 세션이 한다).
- 카드 생성 외 모델 호출, 정답 카드 구조 변경, 문항 화면의 기존 흐름 변경.

## 중단·보고 조건

- 문항 화면에 "정답 해설 보기" 또는 "선지별 출제자 전략으로 직접 이동"을 붙일 곳이 기존 구조에서 불분명하거나 기존 동작을 바꿔야 하면 멈추고 선택지를 보고한다.
- 승인 범위(두 장) 밖의 호출이 필요해지면 멈춘다.

## 후속 지시 (2026-11-21, 메인 세션 조사 결과 + Ghootae 결정)

위 2) 화면은 아래로 **대체**한다(서버 1)·테스트 중 서버 부분·경마 재생성은 끝났으니 다시 하지 않는다. 경마 재생성은 **하지 않는다**(호출 0).

**조사 결과(b)**: 진단 문항 피드백 화면 `FeedbackScreen.tsx`는 `getFeedback(id, questionId)`(읽기 전용 GET, 풀이를 다시 시작하지 않음)로 그 문항의 마무리 해설 대화와 `lab-answer-reveal`(정답)을 보여 주고, `readOnly` 속성이 있다. `feedbackTarget(...,'read')`는 지문이 `DONE`이어도 열린다. 화면 전환은 URL이 아니라 `DiagnosticApp.tsx`의 `screen` 상태(`{name:'feedback', passageId, questionId}`)이고, 개발 모드는 `DevDiagnostic.tsx`의 `view` 상태다. `/problem/lab`은 쓰지 않는다.

1. **정답 해설 버튼**: `ResultCard3.tsx`의 2층 "정답 선지" 칸에 "문항 화면에서 정답 해설 보기" 버튼(정답 카드엔 없음). 누르면 같은 앱 안에서 `FeedbackScreen`(`readOnly`)으로 전환한다. 일반 흐름(`DiagnosticApp`)과 개발 흐름(`DevDiagnostic`) 모두에서 동작하게 `ResultContainer`에 콜백 prop(예: `openAnswer(passageId, questionId)`)을 추가한다. 읽기 전용 화면에서 정답·해설이 실제로 보이는지(검토를 끝내지 않은 문항은 `answerRevealed`가 아닐 수 있음) 코드로 확인하고, 안 보이는 문항이면 버튼을 숨기거나 그 사실을 보고한다(설계를 바꾸지 말고 멈추고 보고). 기존 `FeedbackScreen`의 풀이 흐름은 건드리지 않고, 읽기 전용 화면에 **"결과로 돌아가기"** 버튼(새 prop, 예: `backToResult`)만 더한다.
2. **출제자 의도 버튼은 만들지 않는다**(진단 4지문에 전략 글이 없음). 3층에서 기존 "문항으로 돌아가 출제자 설명 보기 →"는 `strategyAvailable`일 때만 그대로 두되, 이번에는 새 버튼을 추가하지 않는다(전략 글이 생기면 정답 해설 버튼과 같은 방식으로 연결).
3. **돌아오기**: "결과로 돌아가기"로 결과 화면이 다시 열리면 보던 카드(`questionId`)로 스크롤하고, 그 카드의 열림 상태와 **3층 펼침 상태**를 복원한다. `ResultContainer`가 언마운트되므로 앱 쪽 상태나 `sessionStorage`(try/catch)에 `{questionId, open, expanded}`를 저장했다가 복원한다. 결과 데이터는 다시 불러와도 카드 위치가 같아야 한다. 복원 로직은 순수 함수로 빼서 테스트한다.
4. **테스트**: 인계 3)의 화면 항목 중 정답 해설 버튼(있음/정답 카드엔 없음), 복귀 복원 함수, `readOnly` 피드백 화면의 "결과로 돌아가기" 표시. 모델 호출 없음. `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic`, `npm run typecheck`.
5. **캡처**: S-23 결과 화면 PC 1장(`docs/handoffs/2026-11-20-wrong-card-revision-pc.png`, 정답 해설 버튼이 보이는 오답 카드). 모델을 다시 호출하지 않는다. S-23 참가자가 개발 서버에 남아 있으면 읽기만 하고, 없으면 `docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.4/`의 저장 결과를 주입하는 방법을 쓴다. 방법이 없으면 멈추고 보고한다.
6. `PROMPT-v1.4.md` 규칙 3에 한 줄을 메인 세션이 이미 추가했다(수정하지 말 것).

## 결과 보고 (실행 후 작성)

- 변경 파일(1) 서버·테스트까지만 했고 2) 화면은 중단 조건에 걸려 **하지 않았다**):
  - `packages/app/src/server/diagnostic/content.ts`: `WRONG_CARD_PROMPT_VERSION = 'v1.4'`(PROMPT-v1.4.md를 읽음, v1.3 파일은 그대로).
  - `packages/app/src/server/diagnostic/wrong-card.ts`: 코드 검사를 v1.4에 맞춤. 1층 140자·3문장(`. ? !` 종결 기준), `symbolGlosses` 기호 집합 = 발문·고른 선지·1층 기호 집합(기존 `SYMBOL`), 정답 번호(원문자)가 1층에 있으면 실패(고른 선지 번호는 허용, `CORRECT_WEAK`는 건너뜀). 기존 "130자"·"symbolGlosses가 모두 1층에 있다" 검사는 대체. `buildInput`의 `scan`은 이미 발문·고른 선지·정답 선지·근거를 포함해 수정 없음.
  - `packages/app/src/server/diagnostic/wrong-card.test.ts`: v1.4 단위 테스트(기호 집합 통과/빠짐/초과, 정답 번호 실패·고른 번호 통과·`CORRECT_WEAK` 건너뜀, 141자·4문장 실패, 140자 3문장 통과), v1.3 규칙에 묶인 기존 테스트 수정(버전 상수, 가짜 출력의 기호 풀이, 저장된 v1.2 출력 두 개를 v1.4 규칙에 맞게 보정, 131자 → 141자).
  - 새 파일 `docs/experiments/wrong-card-layer1-2026-11-19/run-s23-horse-v1.4.ts`(경마 6·7번 재생성), 결과 `runs/v1.4/s23-horse6.json`·`s23-horse7.json`.
  - 화면 파일(`ResultCard3.tsx`·`ResultSolve.tsx`·`ProblemLabApp.tsx`)·PC 캡처는 변경 없음.
- 테스트 결과: `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic` 13개 파일 242개 통과. `npm run typecheck` 통과. 화면 쪽 테스트(버튼·쿼리·복귀 복원)는 작성하지 않음.
- 경마 6·7번 재생성 결과(모델 호출 2회, 각 1회에 통과, 재생성 없음):
  - 경마 6번(WRONG_PROVIDED): ready, 시도 1회, 검사 실패 없음. 1층: "국민 합의로 정한 기준은 자의적이지 않다는 조건은 읽었어. 그런데 ⓑ는 기준이 자의적이라고 비판하므로, 자의적이지 않다는 말은 그 비판의 힘을 떨어뜨려. 그래서 ③은 적절하지 않은 내용이야." symbolGlosses: ㉡("선거 방송 토론회 초청 대상을 한정한 규정"), ⓐ("초청 대상 제한이 합리적이라는 다수 의견"), ⓑ("초청 대상 제한이 자의적이라는 소수 의견"). 발문의 ㉡·ⓐ·ⓑ가 모두 풀이에 들어갔고, 1층 기호(ⓑ)도 포함됨. 1층에 정답 번호(②) 없음(고른 선지 ③만).
  - 경마 7번(WRONG_TRUE_CHOSEN): ready, 시도 1회, 검사 실패 없음. 1층: "너는 순위를 매겨 보도하면 곧바로 ㉯ 위반이라고 봤어. 하지만 ㉯는 오차 범위 안이라는 사실을 밝히지 않고 서열을 보도하는 걸 금지해. 그래서 ④의 1차 조사 보도 평가는 맞는 말이야." symbolGlosses: ㉮("공직선거법"), ㉯("선거방송심의에 관한 특별규정"), ㉰("선거여론조사보도준칙") = 발문 ㉮～㉰ 집합. 1층에 정답 번호(②) 없음(고른 선지 ④만).
  - 검사는 완화하지 않았다. 호출은 위 2회뿐.
- 남은 문제:
  - **중단: 2) 화면을 하지 않았다.** 문항 화면(`/problem/lab`, `ProblemLabApp.tsx`)은 개발자 풀이 세션이다. `startFeedback(questionId)`가 매번 새 세션(AWAITING_SELECTION)을 만들고, 정답 공개(`view.result.answerRevealed`)와 출제자 전략(`strategyFor`는 `phase === 'COMPLETED'`일 때만 available, `getExaminerStrategy(completedSession)`)은 세션이 끝난 뒤에만 열린다. 진단 참가자 결과와 이 세션은 연결돼 있지 않아서, 결과 카드에서 `focus=answer-explanation|strategy&position=N`으로 가도 다시 풀이를 시작하는 화면이 뜨고 정답 해설·전략은 보이지 않는다(기존 "문항으로 돌아가 출제자 설명 보기" 링크도 같은 한계). 쿼리만으로 진입점을 붙이려면 기존 동작을 바꿔야 해서 인계 "중단·보고 조건"에 따라 멈췄다.
  - 선택지: (a) 문항 화면에 "열람 모드"를 추가한다(풀이 없이 정답 해설과 전략을 보여 주는 읽기 전용 상태. 새 서버 API 또는 `startFeedback` 확장 필요, 전략은 `strategyFor`의 COMPLETED 조건 완화 필요). (b) 진단 화면 안에서 쓰는 기존 `FeedbackScreen.tsx`(diagnostic) 쪽에 정답 해설·전략을 보이는 곳이 있는지 확인해 그쪽으로 진입점을 둔다(인계는 `/problem/lab`을 지정해 설계 확인 필요). (c) 버튼 두 개는 일단 기존 링크 동작(새 세션)으로 두고 `returnTo` 복귀·스크롤·펼침 복원만 먼저 구현한다. 어느 쪽인지 결정해 주면 이어서 구현한다.
  - `returnTo` 규칙: 지금 `resolveReturnTo`(`dev-part-nav-links.ts`)는 `/dialogue/...`만 허용하고 그 밖은 `/dialogue/lab`으로 바꾼다. `/diagnostic` 계열과 카드 `questionId`를 담으려면 이 정규식 확장이 필요하다(기존 동작 유지 가능). 화면 방식이 정해지면 함께 처리한다.
  - 캡처(`docs/handoffs/2026-11-20-wrong-card-revision-pc.png`)는 버튼이 없어 찍지 않았다. 저장 결과를 개발 서버에 주입하는 방법도 이번에는 확인하지 않았다.

### 후속 지시 실행 결과 (2026-11-21)

- 변경 파일(모델 호출 0, 외부 전송 없음, 커밋 안 함):
  - `packages/app/src/client/diagnostic/ResultCard3.tsx`: 2층 "정답 선지" 칸 아래 "문항 화면에서 정답 해설 보기" 버튼(`onOpenAnswer`가 있고 `hasAnswerButton`일 때만, 정답 카드엔 없음). 3층 `<details>`를 `expanded`/`onExpandedChange`로 제어. 출제자 의도 새 버튼은 만들지 않았고 기존 "문항으로 돌아가 출제자 설명 보기 →"는 그대로.
  - `ResultSolve.tsx`: `CardNav`(펼침 상태·`onOpenAnswer`)를 `Solve`→`Card`→`LayeredCard`로 전달(옵션 prop, 11/17 카드 경로는 그대로).
  - `ResultView.tsx`: `initial`(복원 상태)·`openAnswer` prop. 복원 시 보던 카드를 열고 3층 펼침을 되살린 뒤 기존 `scrollKey`로 그 카드로 스크롤. 나가기 직전에 `{questionId, open, expanded}`를 저장.
  - `Containers.tsx`: `ResultContainer`가 `openAnswer` prop을 받고, 마운트 때 저장 상태를 한 번 꺼내(`takeResultReturn`) `ResultView`에 넘김.
  - `logic.ts`: `ResultReturn`, `parseResultReturn`, `serializeResultReturn`, `saveResultReturn`/`takeResultReturn`(`sessionStorage`, try/catch), `restorableReturn`(이번 결과에 그 카드가 있을 때만 복원), `hasAnswerButton`.
  - `FeedbackScreen.tsx`: 새 prop `backToResult`와 머리 이동 버튼 `HeaderActions`(분리·export). 기존 "← 결과 목록"(`back`) 동작은 그대로. `data-testid="back-to-result-card"`.
  - `DiagnosticApp.tsx`: 화면 `{name:'read', questionId}` 추가(`FeedbackScreen readOnly`, 돌아가기는 `result`로). `DevDiagnostic.tsx`: 같은 `read` view 추가(돌아가기는 `result`).
  - `wrong-card-view.test.ts`: 정답 해설 버튼(오답 카드 있음·정답 카드 없음·nav 없으면 없음), 펼침 상태, 복원 함수(파싱·복원 가능 여부·저장소 없음), `HeaderActions`의 "결과로 돌아가기"/기존 버튼 표시 조건.
- 테스트 결과: `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic` 13개 파일 253개 통과. `npm run typecheck` 통과. e2e 중 `diag-l3`·`card-layer3`·`back-to-result`를 쓰는 것은 없음(영향 없음).
- 읽기 전용 화면에서 정답·해설이 보이는 조건(코드 확인: `FeedbackScreen.tsx`의 `lab-answer-reveal`, `pipeline/.../feedback.ts` `finish`):
  - 정답 번호·문장 카드(`lab-answer-reveal`)는 그 문항의 피드백 결과 `answerRevealed === true`일 때만 보인다. 이는 `outcome === 'COACHING_TERMINATED'`(세 번 선택·교정 실패·설명 요청·건너뛰기로 끝난 경우)뿐이다. 학생이 스스로 고쳐 정답에 이른 문항(`VERIFIED_CORRECT` 등)은 이 카드가 없고 대화 기록의 설명만 남는다.
  - 서버 `feedbackTarget(...,'read')`는 리뷰 대상(오답 또는 오류 정답이면서 `ITEM_REVIEW`가 아님)이 아니면 409를 준다. 결과 카드에 정답 선지 칸이 있는 오답은 대개 리뷰 대상이지만, 검토를 시작하지 않았거나 중간에 그만둔 문항(피드백 `phase`가 `COMPLETED`가 아님)은 읽기 전용 화면에 정답·해설이 없다(선택 단계 대화만 보임).
  - `ResultItem`에는 "피드백이 끝났는지/정답이 공개됐는지"를 알려 주는 필드가 없어(`afterFeedback.corrected`·`skipped`만 있음) 클라이언트가 숨길 문항을 가려낼 수 없다. 그래서 버튼은 기존 "정답 선지" 칸이 있는 모든 오답 카드에 보인다(숨긴 문항 없음).
- 캡처: 하지 않았다. 개발 서버가 떠 있지 않고, S-23 참가자 상태를 읽을 곳이나 저장된 v1.4 카드(`runs/v1.4/*.json`)를 결과 화면에 주입하는 방법(목 API·픽스처 하네스)이 이 저장소에 없다. 인계 규정대로 멈추고 보고한다.
- 남은 문제(메인 세션 판단 필요):
  - (a) 검토를 끝내지 않은 오답 카드의 버튼이 정답·해설 없는 화면으로 간다. 해결하려면 서버 `resultItem`에 `answerViewable`(피드백 `phase === 'COMPLETED'`) 같은 필드를 더하고 버튼을 그 값으로 거는 방법이 있다(서버 계약 변경이라 지시대로 하지 않았다).
  - (b) 캡처에 쓸 주입 방법: 결과 응답을 가로채는 최소 하네스(예: 저장된 카드로 만든 `ResultView` 고정 렌더 페이지)를 만들지, S-23 참가자를 서버에 되살릴지 결정 필요.
  - 복원 상태는 `sessionStorage` 한 번 쓰기로, `ResultContainer`가 마운트될 때 꺼내 지운다(새로고침 시 복원 안 됨, 의도됨).
