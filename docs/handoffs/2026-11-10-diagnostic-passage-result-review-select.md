# 인계: 진단 지문 결과 화면 개편 — 결과 가려 두고 하나씩 공개, 리뷰할 문항 고르기, 확률 최대 등급

- 날짜: 2026-11-10
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0218-diagnostic-passage-result-review-select.md`. 이 문서와 다르면 D-0218을 따른다. 리뷰 대상은 D-0213.
- 사용자 시안: `docs/review/diagnostic-passage-result-mock-2026-11-10/`(1 가림 · 2 한 문항 공개 · 3 모두 공개와 등급). **시안의 배치·색은 의도 설명용이다.** 의도를 지키면서 쓰기 쉽고 보기 좋게 다듬어도 된다(사용자). 기존 `diagnostic.css` 색 토큰·카드 형식과 어울리게 한다.
- 메모 원문: `memory/checkpoints/2026-11-10-diagnostic-v510-use-notes.md` 6·6-1절.
- **외부 전송 없음.** 시험은 가짜 평가기(`packages/app/src/server/diagnostic/test-support.ts`).

## 바뀌는 흐름 (지금 → 바뀐 뒤)

- 지금: 지문 답 입력 마침 → 중간 화면(결과 문장·문항 칸·위치 범위·"피드백 시작") → 문항을 순서대로 하나씩 피드백(커서) → 마지막 문항 뒤 "다음 지문".
- 바뀐 뒤: 지문 답 입력 마침 → **지문 결과 화면**. 거기서 문항 결과를 하나씩 공개하고, 리뷰 대상 문항만 골라 검토 화면으로 갔다가 돌아온다. 리뷰 대상을 모두 마치면 "다음 지문"이 켜진다. 순서대로 도는 커서 흐름은 학생 흐름에서 없앤다.

## 지문 결과 화면 (`Pages.tsx`의 `MidPage` 자리)

1. **문항 줄 목록.** 지문 문항마다 한 줄: 왼쪽 문제 버튼("문제 12" 등), 가운데 결과 설명, 오른쪽 검토 버튼.
2. **결과 설명은 처음에 가린다.** 문제 버튼을 누르면 그 줄의 결과 설명과 검토 버튼 문구가 공개된다. 공개는 되돌리지 않는다. 공개 여부는 서버에 남긴다(새로 고침해도 유지).
3. **문제 버튼 색(정오·근거 강도).** 가려진 상태에서도 색은 보인다(시안 1). 세 무리를 기본으로 한다. 정확한 색·표현은 실행자가 정하되 색만으로 구분하지 말고 글자·아이콘 등 보조 표시를 함께 둔다(접근성).
   - 정답·근거 문제없음: `SUPPORTED_CORRECT`, `WEAK_CORRECT`, `SURE_CORRECT`, `UNVERIFIED`, `UNSURE_CORRECT`
   - 정답·근거 다시 볼 것: `ERROR_CORRECT`
   - 오답: `WRONG`
   - 판정 중(`PENDING`)·확인 중(`CHECKING`): 정답 무리 색에 "분석 중" 표시. 판정이 끝나면 바뀐다(지금처럼 폴링).
4. **결과 설명 문구**(학생용, 반말 해요체 섞지 말고 지금 진단 문구 톤 D-0209·D-0116을 따른다). 정답률은 메가스터디 수치(D-0203), 오답은 "같은 선지를 고른 비율". 두 수치 쌍은 `ResultView.tsx`의 `percentPair`와 같은 방식으로 보인다. 아래는 기준 문구이며 다듬어도 된다.
   | 범주 | 가운데 설명 | 오른쪽 버튼 |
   |---|---|---|
   | `SUPPORTED_CORRECT` | 정답(정답률 n%). 근거도 명확했어. | 칭찬(정답률이 낮으면 "어려운 문제인데 정말 잘했어!", 아니면 "잘했어!") · 비활성 |
   | `WEAK_CORRECT` | 정답(정답률 n%). 근거에 문제가 없었어. | "잘했어!" · 비활성 |
   | `UNVERIFIED` | 정답(정답률 n%). 근거에 문제가 없었어. | "잘했어!" · 비활성 |
   | `SURE_CORRECT` | 정답(정답률 n%). 확신을 갖고 풀었어. | "확신을 갖고 풀었구나. 대단해!" · 비활성 |
   | `UNSURE_CORRECT` | 정답(정답률 n%). 근거는 없었어. | "맞혔어!" · 비활성 (아래 "범주 5" 참고) |
   | `ERROR_CORRECT` | 정답(정답률 n%). 근거에 문제가 있었어. | **"근거를 다시 검토해 보자"** · 활성 |
   | `WRONG` | 오답(같은 선지를 고른 비율 n%). | **"아깝지만 정답이 아니야. 다시 검토해 보자."** · 활성 |
   | `PENDING` | 정답(정답률 n%). 아직 분석 중이야. | 비활성 |
   | `CHECKING` | 정답(정답률 n%). 근거는 한 번 더 확인해 볼게. | 비활성 |
   - 오답도 판정 중일 수 있다(근거를 쓴 오답). 오답은 판정과 무관하게 리뷰 대상이며, 판정이 끝나기 전에는 검토 버튼을 "분석 중"으로 비활성.
   - **개발자 모드(`?dev=1`)에서만** 줄 끝에 내부 범주를 괄호로 보인다(예: `(SUPPORTED_CORRECT)` 또는 한국어 이름).
   - 비활성 버튼은 누를 수 없음이 보이게 한다(사용자: 아무 동작 없음, 비활성 표시).
5. **검토 버튼.** 활성 버튼을 누르면 그 문항의 검토 화면(지금 `FeedbackScreen`)으로 간다. 검토가 끝나면(상태기계 `COMPLETED`, 학생의 "건너뛰기" 포함 — 사용자: 건너뛰기도 완료) 결과 화면으로 돌아오고, 그 버튼은 **"검토 완료했어. 수고했어"**로 바뀌어 비활성. 결과가 아직 가려진 문항의 검토 버튼은 공개 전에는 누를 수 없다(먼저 공개).
6. **등급.** 처음에는 "나의 현재 등급은?"과 가려진 그래프. **지문의 모든 문항 결과를 공개하면** 등급을 보인다(검토 완료는 조건 아님, 사용자).
   - 표시는 범위(2~4등급)가 아니라 **확률이 가장 높은 등급 하나**("3등급").
   - 그래프: 1~9등급 눈금 위 띠에 등급별 확률을 진하기로 칠한다(시안 3). 제목은 지금처럼 "이 지문까지의 위치 · 수능 기준 환산 추정".
7. **"다음 지문"**(마지막 지문이면 "결과 보기") 버튼은 오른쪽 아래. 리뷰 대상을 모두 검토 완료하고, 판정 중인 문항이 없을 때 활성. 리뷰 대상이 없으면 판정이 모두 끝나면 바로 활성. 누르면 지문을 `DONE`으로 하고 다음 지문(또는 결과)으로 간다.
8. 지금 화면 위 결과 요약 문장(`passageResultSentence`)·문항 칸 줄은 이 목록으로 대체한다. 필요하면 짧은 머리말("이 지문의 문제 풀이 결과")만 둔다.

## 범주 5 (`UNSURE_CORRECT`, 잘 모르겠지만 정답) — 사용자 결정 (가)

- 힌트 흐름(D-0213 5번)이 아직 없으므로 **이번에는 리뷰 대상이 아니다**(회색·비활성). 힌트 흐름을 구현할 때 리뷰 대상으로 바꾼다. 리뷰 대상 판정을 한 함수로 모아(예: `isReviewTarget(category)`) 나중에 한 줄로 바꿀 수 있게 한다.

## 서버 (`packages/app/src/server/diagnostic/`)

- **리뷰 대상:** 범주 `WRONG`, `ERROR_CORRECT`. **검토 완료:** 그 문항 피드백 세션 phase가 `COMPLETED`(SKIP 포함). `ITEM_REVIEW`(판정 실패 검토)는 대상 아님.
- **`summaryCard` 응답 확장**(이름은 실행자가 정하되 정답·판정 원출력은 넣지 않는다):
  - 문항마다 `megastudy`(`correctRate` 쌍, 고른 선지 비율 쌍 — `resultItem`과 같은 계산), `reviewTarget`, `reviewDone`, `revealed`, 판정 중 여부.
  - 지문 `allRevealed`, `canFinish`(리뷰 대상 모두 완료 + 판정 중 없음).
  - 등급: `position`에 등급별 확률(9칸, 합 1)과 최빈 등급. **`allRevealed`가 거짓이면 등급·확률을 응답에 넣지 않는다**(화면에서만 가리지 않는다).
- **새 API**
  - `POST passage/:pid/reveal` 본문 `{ questionId }`: 공개 기록(되돌리지 않음). 지문 상태에 `revealed` 목록을 저장한다(옛 파일은 빈 목록으로 읽음).
  - `POST passage/:pid/finish`: `canFinish`일 때만 `DONE`(아니면 409). 이벤트 `PASSAGE_DONE`.
- **피드백 읽기·쓰기 조건(`feedbackTarget`) 바꾸기:** 지문이 `FEEDBACK`이면 순서와 무관하게 **리뷰 대상 문항**의 검토를 읽고 쓸 수 있다(쓰기는 그 문항 첫 판정이 끝났을 때만, 지금 규칙 유지). 리뷰 대상이 아닌 문항의 피드백 요청은 409. 커서(`feedbackCursor`)와 `advanceCursor`의 자동 `DONE`은 학생 흐름에서 쓰지 않는다(필드는 옛 파일 호환으로 남겨도 됨). `progress().current.questionId`는 null로 두고 화면은 지문 결과 화면으로 간다.
- **`itemView` 첫 말풍선** "n번째 문항으로 돌아가 볼게"는 문항 번호 기준 문구로 바꿔도 된다(예: "12번 문제로 돌아가 볼게. ③번을 골랐네.").
- **등급별 확률** (`packages/pipeline/src/diagnostic-position/position.ts`):
  - `estimateAbility`의 격자 사후분포(401점)를 그대로 써서, 선택과목마다 격자 점의 능력값 → `nationalPosition` → `gradeOfPercentile`로 등급을 매기고 가중치를 더해 등급 분포(9칸)를 만든다. 두 선택과목 분포는 **산술 평균**한다(지금 백분위를 두 과목 평균하는 방식과 같은 취지).
  - `ParticipantPosition.grade`에 `probabilities: number[]`(1~9등급), `mode: number`(확률 최대 등급, 같으면 더 높은 등급=작은 숫자)를 더한다. 기존 필드(`mean`·`best`·`worst`, `percentile`)는 그대로 둔다(최종 결과 화면이 쓴다).
  - 401점 × `nationalPosition` 계산이 느리면(지문 결과 응답이 눈에 띄게 느려짐) 격자를 성기게 하거나 능력값→등급 경계를 한 번 구해 쓰는 식으로 줄인다. 응답 시간을 시험에서 한 번 재서 보고한다.
- **개발자 이동 지도(D-0217)와의 정합.** 피드백 칸 클릭은 그 문항 검토 화면을 바로 연다(리뷰 대상이 아니면 결과 화면). 피드백 `skip-to`는 의미가 없어지므로 개발자 지도에서 빼거나 "그 문항 검토로 가기"로 바꾼다. 지문 건너뛰기 `→ DONE`은 그대로. 흐름 한 줄의 "피드백 문항" 칸은 리뷰 대상 문항만 둔다. 바꾼 내용을 결과 보고에 적는다.

## 범위 밖

- 최종 결과 화면(`ResultView.tsx`)의 위치 표시 방식(범위 그대로). 이번에는 지문 결과 화면만.
- 힌트 흐름(범주 5), 메모 1~5(버튼 문구·제출 버튼·결론 버튼·소거법 판정).
- 판정 지시문·판정 규칙, `packages/pipeline/src/problem-solving/**`.
- lab·문단 화면. 커밋.

## 완료 조건

- [ ] 서버 시험(가짜 평가기): 리뷰 대상 판정(WRONG·ERROR_CORRECT만, UNSURE_CORRECT 아님), 순서와 무관한 리뷰 대상 검토, 비대상 문항 피드백 409, 공개 기록·유지, `allRevealed` 전 등급 미포함, `canFinish` 조건과 `finish` 409/DONE, SKIP으로 끝낸 리뷰도 완료.
- [ ] 위치 시험: 등급 확률 9칸 합 1, 최빈 등급이 확률 최대 칸, 정답만 많은 응답은 낮은 숫자 등급 쪽, 오답만 많은 응답은 높은 숫자 쪽. 기존 `mean`·`best`·`worst`·`percentile` 값 불변.
- [ ] 화면: 결과 가림 → 문제 버튼으로 공개 → 모두 공개 시 등급 표시, 비대상 버튼 비활성, 검토 후 "검토 완료했어. 수고했어", 다음 지문 활성 조건, `?dev=1`에서만 내부 범주. 가짜 평가기 Playwright 한 번(기존 `packages/app/e2e/diagnostic-*.spec.ts` 방식, 사용자 서버 포트 5173·5174 사용 금지). 화면 사진을 남겨 경로를 보고.
- [ ] 기존 진단 e2e·단위 시험 중 바뀐 흐름 때문에 기대가 달라진 것은 새 흐름에 맞게 고치고, 무엇을 고쳤는지 보고.
- [ ] `npm run build`, `npx vitest run packages/app/src/server/diagnostic packages/app/src/client packages/pipeline/src/diagnostic-position` 통과, `npm test`는 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`) 외 실패 없음.
- [ ] 아래 결과 보고 칸을 채웠다.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다(배치·색·문구 다듬기는 허용 범위). 예:
  - 순서 무관 검토가 상태기계(`packages/pipeline/src/problem-solving/feedback.ts`) 변경 없이는 안 되는 경우.
  - 리뷰 대상인데 세션 phase가 처음부터 `COMPLETED`인 경우처럼 정의가 어긋나는 사례.
  - 서버 재시작 뒤 이어 가기(`resume`)와 충돌.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다. 커밋하지 않는다. `memory/` 수정하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 서버: `packages/app/src/server/diagnostic/controller.ts`(리뷰 대상 `isReviewTarget`·`reviewTarget`, `summaryCard` 확장, `reveal`·`finish`, `feedbackTarget` 순서 무관화, 커서·`advanceCursor` 제거, `devMap` 문항에 `reviewTarget`·`reviewDone`, `devSkipItem` 제거), `http.ts`(`passage/:pid/reveal`·`finish` 추가, `dev/item/:id/skip-to` 제거), `store.ts`(`revealed?`, `feedbackCursor?`는 옛 파일 호환).
  - 위치: `packages/pipeline/src/diagnostic-position/position.ts`(`abilityPosterior` 분리, 등급 확률 `probabilities`·`mode`).
  - 화면: `DiagnosticApp.tsx`, `diagnostic/Pages.tsx`(`MidPage` 재작성), `Containers.tsx`, `FeedbackScreen.tsx`(결과 목록 복귀), `DevDiagnostic.tsx`, `dev-flow.ts`, `dev-api.ts`, `api.ts`, `types.ts`, `logic.ts`(`resultRow`·`resultGroup`·`finishHint`·`gradeShade` 등, `passageResultSentence` 제거), `diagnostic.css`.
  - 시험: `controller.test.ts`, `controller-dev.test.ts`, `http.test.ts`, `position.test.ts`, `logic.test.ts`, `dev-flow.test.ts`, `e2e/diagnostic-flow.spec.ts`.
- 시험 결과:
  - `npx vitest run packages/app/src/server/diagnostic packages/app/src/client packages/pipeline/src/diagnostic-position`: 19 파일 259 통과.
  - `npm test`: 134 파일 통과, 실패는 기존 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)뿐. `npm run build` 통과.
  - Playwright(가짜 평가기, 포트 5473·5474, 끝난 뒤 종료): `diagnostic-flow.spec.ts` 2건과 `diagnostic-dev-navigation.spec.ts` 1건 통과.
  - 등급 확률 계산 시간: `participantPosition` 16문항 약 5~8ms, `reveal`(등급 확률 포함) 응답 약 4ms. 격자를 줄일 필요 없음.
  - 화면 사진: `docs/review/diagnostic-passage-result-screens-2026-11-10/`(04 가림, 06 한 문항 공개, 07 모두 공개와 등급, 05·08 폭 390, 09 개발자 모드, 10 검토 화면, 11 검토 후).
- 인계 문서와 다르게 한 점(디자인 다듬기 포함):
  - 리뷰 대상 정의 어긋남(보고 필요): 문서가 "범주 `WRONG`은 리뷰 대상"과 "`ITEM_REVIEW`는 대상 아님"을 함께 말한다. 오답 + 판정 SUPPORTED·선택-근거 일치로 `ITEM_REVIEW`가 된 오답(`WRONG_SUPPORTED`)은 검토 화면에서 `COMPLETED`에 이르지 못해 "다음 지문"이 영영 켜지지 않는다. 문서의 "ITEM_REVIEW는 대상 아님"을 문자 그대로 적용해 **`ITEM_REVIEW`로 끝난 오답은 리뷰 대상에서 뺐다**(줄에는 "이 문항은 우리가 한 번 더 확인해 볼게."와 비활성 "확인해 볼게"). 이 해석이 틀리면 알려 주면 한 줄(`reviewTarget`)로 바꾼다.
  - 정답이지만 판정이 실패(`CHECKING`)한 문항은 리뷰 대상이 아니므로(표의 "확인 중" 비활성), 예전에 검토 화면에서 가능하던 첫 판정 RESUME 경로가 학생 흐름에서 사라졌다(오답의 판정 실패는 그대로 검토 화면에서 RESUME).
  - `isReviewTarget(category)` 한 함수로 모았다(힌트 흐름 때 `UNSURE_CORRECT` 한 줄 추가).
  - 검토 화면 머리에 "← 결과 목록" 버튼을 더했다(검토를 마치지 않고 돌아가도 진행은 서버에 남는다). 검토를 마친 뒤 버튼은 "지문 결과로 돌아가기".
  - 시안의 숫자: 정답률은 두 선택과목 쌍(`68% · 78%`)으로 보이고, 정답률 평균 20% 미만이면 "어려운 문제인데 정말 잘했어!"(기준은 `HARD_CORRECT_RATE` 상수). 가린 줄은 문구를 DOM에 두지 않고 "결과는 가려져 있어"와 빈 칸으로 둔다. 문제 버튼은 색 + 글자 표시("✓ 정답", "! 근거 확인", "✕ 오답", "… 분석 중")를 함께 쓴다. 등급 띠는 9칸 진하기(최빈 칸은 아래 선 표시).
  - 서버: `summaryCard`에서 `counts`·`qualityTiers`·`firstItemOpen`·`correct` 외 옛 필드를 정리하고 `items[]`에 `megastudy`·`judging`·`reviewTarget`·`reviewDone`·`revealed`, 지문에 `allRevealed`·`canFinish`, `position`은 모두 공개 전 `null`이다(`judging`은 정답뿐 아니라 첫 판정이 진행 중인 모든 문항 수). `progress().passages[].feedbackCursor` 제거, `current.questionId`는 항상 null.
  - 개발자 이동 지도(D-0217): 문항 칸을 리뷰 대상만 두고, 칸 클릭은 그 문항 검토 화면(대상이 아니면 지문 결과 화면)을 연다. 피드백 `skip-to`(API·`devSkipItem`)는 없앴다(404). 중간 칸 이름을 "지문 결과"로 바꿨고, 지문 `→ DONE` 건너뛰기는 그대로이며 검토 안 한 리뷰 대상만 `skipped`로 표시한다. 지문 결과 화면에서 "다음 지문"을 누르면 지도의 다음 지문 첫 칸으로 간다.
  - 바뀐 시험: `controller.test.ts`(흐름·ITEM_REVIEW·RESUME·문항별 열기를 새 흐름에 맞게 고침, 정답 문항 RESUME 시험은 학생 흐름에서 불가능해져 오답 문항 RESUME 시험으로 대체, 새 시험 `지문 결과 화면 (D-0218)` 8건 추가), `controller-dev.test.ts`(커서·skip-to 시험 삭제·수정), `http.test.ts`, `dev-flow.test.ts`, `logic.test.ts`(결과 문장 시험을 줄 시험으로 교체), `diagnostic-flow.spec.ts`(새 흐름으로 다시 씀). 기존 `diagnostic-flow.spec.ts`의 "근거 생략" 문구 확인은 이미 HEAD에서 낡아 있어(결과 화면은 "근거 없이 낸 정답") 같이 고쳤다.
- 남은 문제:
  - `/progress`와 `result`는 여전히 등급(`position`)을 싣는다(`summaryCard`만 공개 전 숨김). 학생이 API를 직접 열어 보면 등급이 보인다. 필요하면 별도 지시로 `progress`에서도 뺀다.
  - 최종 결과 화면의 위치 표시(범위)는 범위 밖이라 그대로다. `ITEM_REVIEW_LINE`·`itemView`의 `ITEM_REVIEW` 처리는 학생 흐름에서 도달하지 못하는 코드로 남아 있다.
  - 등급 띠는 9칸 이산 표시다(시안의 부드러운 그라데이션과 다름).
