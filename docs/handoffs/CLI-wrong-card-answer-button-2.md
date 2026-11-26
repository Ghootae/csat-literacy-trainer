# CLI: 오답 카드 정답 해설 버튼 마무리 (2026-11-26)

읽을 것: `docs/handoffs/2026-11-20-wrong-card-revision-impl.md`의 "후속 지시 실행 결과 (2026-11-21)" 절. 그 화면 작업(미커밋)이 이번 작업의 출발점이다.

비용: **모델 호출 0, API 비용 없음.** S-23을 다시 돌리지 않는다. 카드도 재생성하지 않는다.

## 1) 버튼은 정답·해설을 볼 수 있는 문항에만 (남은 문제 (a))

- 서버 결과 항목(`resultItem`, `ResultItem` 타입)에 `answerViewable: boolean`을 더한다. 값 = 그 문항 피드백 세션이 있고 `phase === 'COMPLETED'`. 피드백 세션이 없거나 끝나지 않았으면 `false`.
- `hasAnswerButton`이 `answerViewable`도 보게 한다. `false`면 "문항 화면에서 정답 해설 보기" 버튼을 숨긴다. 버튼 대신 다른 문구는 넣지 않는다.
- 스스로 고쳐 맞힌 문항(`VERIFIED_CORRECT` 등)은 정답 카드(`lab-answer-reveal`)가 없어도 마무리 대화가 있으니 `answerViewable = true`로 둔다.
- 기존 필드·기존 흐름은 바꾸지 않는다. 테스트: 완료된 문항 → 버튼 있음, 미완료·세션 없음 → 버튼 없음, 서버 `answerViewable` 계산 단위 테스트.

## 2) 캡처는 저장된 카드로 (남은 문제 (b))

- Playwright로 개발 서버의 결과 화면을 열되, 결과·피드백 API 응답을 `page.route`로 **가짜 응답(고정 JSON)** 으로 바꾼다. 실제 서버 상태나 모델 호출은 쓰지 않는다.
- 카드 내용은 저장된 결과를 쓴다: `docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.4/s23-horse6.json`·`s23-horse7.json`(+ 필요하면 v1.3 이하 저장 카드). 오답 카드 2장 이상, 그중 1장은 `answerViewable: true`(버튼 보임), 1장은 `false`(버튼 없음).
- 피드백 읽기 응답은 그 문항의 마무리 해설 대화 몇 줄 + `answerRevealed: true`인 짧은 고정 JSON이면 된다.
- 흐름: 결과 화면 → 3층 펼침 → 정답 해설 보기 → 읽기 전용 문항 화면 → "결과로 돌아가기" → 같은 카드 위치·3층 펼친 상태.
- 캡처(PC, deviceScaleFactor 2) 3장을 `docs/handoffs/`에 저장:
  - `2026-11-26-wrong-card-answer-button-1-result.png` (버튼 보이는 카드와 없는 카드)
  - `2026-11-26-wrong-card-answer-button-2-read.png` (읽기 전용 문항 화면 + "결과로 돌아가기")
  - `2026-11-26-wrong-card-answer-button-3-back.png` (돌아온 뒤 같은 카드·3층 펼침)
- 이 스크립트를 e2e 파일로 남겨도 된다(가짜 응답만 쓰므로 비용 없음). 저장소에 맞는 위치는 알아서 고른다.

## 3) 확인

`npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic`, `npm run typecheck`, 새 e2e 하나.

## 하지 않을 것

- 커밋·푸시 (Ghootae가 캡처를 본 뒤 한다).
- 모델 호출, 카드 재생성, 출제자 의도 버튼.
- 가짜 응답을 만들 방법이 막히면 멈추고 보고한다.

## 결과 보고

이 파일 끝에 적는다: 변경 파일, 테스트 결과, 캡처 3장 경로, 막힌 것.

## 결과 보고 (2026-11-26, 하위 에이전트)

- 모델 호출 0, 카드 재생성·S-23 재실행 없음, 커밋·푸시 없음. PROMPT·memory/ 수정 없음.
- 변경 파일:
  - `packages/app/src/server/diagnostic/controller.ts`: `resultItem`의 `base`에 `answerViewable`(그 문항 피드백 세션 `phase === 'COMPLETED'`) 추가. 세션이 있는 문항만 결과 항목이 되므로 "세션 없음"은 항상 false로 귀결.
  - `packages/app/src/client/diagnostic/types.ts`: `ResultItem.answerViewable: boolean`.
  - `packages/app/src/client/diagnostic/logic.ts`: `hasAnswerButton`이 `answerViewable`도 본다(false면 버튼 숨김, 대체 문구 없음).
  - 테스트: `wrong-card-view.test.ts`(hasAnswerButton 확장, answerViewable true/false 카드 렌더), `logic.test.ts`·`reading-habit-view.test.ts`(픽스처 필드 추가), `server/diagnostic/controller.test.ts`(answerViewable 계산: 미완료 false → `finishItem` 후 true, 다른 문항 false).
  - 새 e2e `packages/app/e2e/diagnostic-wrong-card-answer-button.spec.ts`: `page.route`로 진행·결과·피드백 API를 고정 JSON으로 대체(저장 카드 v1.4 `s23-horse6/7.json` 사용, 6번 `answerViewable: true`, 7번 `false`). 서버 불필요.
- 테스트 결과: `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic` 13개 파일 255개 통과. `npm run typecheck` 통과. e2e(`PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-wrong-card-answer-button.spec.ts`) 1개 통과.
- 캡처(실제 이미지를 읽어 확인, PC·배율 2):
  - `docs/handoffs/2026-11-26-wrong-card-answer-button-1-result.png`: 6번 카드, 정답 선지 칸 아래 버튼 보임, 3층 펼침.
  - `docs/handoffs/2026-11-26-wrong-card-answer-button-1b-result-no-button.png`: 7번 카드, 정답 선지 칸은 있고 버튼 없음(한 장에 두 카드를 담는 대신 두 장으로 나눔).
  - `docs/handoffs/2026-11-26-wrong-card-answer-button-2-read.png`: 읽기 전용 문항 화면(정답 2번 카드, "읽기 전용" 표시, 머리 "← 결과로 돌아가기").
  - `docs/handoffs/2026-11-26-wrong-card-answer-button-3-back.png`: 복귀 후 같은 6번 카드, 3층 펼침 유지, 버튼 있음.
- 알아 둘 점(막힌 것은 없음): 고정 피드백의 선지 1·4·5번(저장 자료에 없음)은 "생략한 선지" 자리 표시 문장이며 대화 3줄도 지어낸 고정 문장이다. 결과 화면의 6·7번 칩이 서로 겹쳐 Playwright 일반 click이 막혀 e2e는 칩에 `dispatchEvent('click')`를 썼다(화면 겹침 자체는 확인하지 않음).
