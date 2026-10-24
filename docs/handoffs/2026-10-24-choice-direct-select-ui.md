# 인계: 문제 화면 선지 직접 누르기와 제출 칸 정리 (출제자 전략 흐름 포함)

- 날짜: 2026-10-24
- 작성: 코드 에이전트
- 실행: 하위 에이전트(executor, sonnet)
- 관련 결정: `memory/decisions/D-0172-problem-ui-choice-direct-select.md`(화면 설계 확정 절), `memory/decisions/D-0170-optional-examiner-strategy-feedback.md`
- 모형(기준): `docs/handoffs/2026-10-24-choice-direct-mock-{1,2,3,4}.png`, 같은 이름의 `.html`
- 앞선 인계: `docs/handoffs/2026-10-24-examiner-strategy-ui.md`(출제자 전략 1차 구현, 미커밋). 이번 작업은 그 위에서 고친다.

## 목표

개발자 문제 화면(`packages/app/src/client/ProblemFeedbackV4App.tsx`)을 모형 4장과 같게 바꾼다. 서버 판정·세션 흐름은 바꾸지 않는다.

## 범위 밖

- 학생용 경로(v3) 화면, 판정·교정·마지막 설명 로직, 출제자 전략 글 내용.
- 문제 세트 흐름([다음 문제로]·[다음 지문으로]).
- 외부 API 호출.

## 화면 계약

### 1. 가운데 문제 칸: 선지 직접 누르기

- 선지(`ol.v4-choices > li`)를 누를 수 있는 버튼으로 만든다. 접근성: 선지 목록은 라디오 그룹(`role="radiogroup"`, 항목 `role="radio"`, `aria-checked`)이고 Tab·방향키·Space/Enter로 고를 수 있다. 접근성 이름은 "②번 선지" 형식이다.
- **풀이 단계**(지금 번호 버튼이 활성인 단계와 같은 조건: `choosable`): 누르면 그 선지를 고른다. 지금의 `setChoice(c.choiceId)` 동작과 같고, 근거 입력 칸에 초점을 주지 않는다. 고른 선지에는 기존 `data-selected` 표시와 "고름" 딱지를 붙인다.
- **고를 수 없는 단계**(교정 질문 중, 판정 대기 중 등): 눌러도 반응하지 않고, 마우스를 올려도 강조하지 않는다(`aria-disabled`).
- **풀이가 끝난 뒤**(`COMPLETED`이고 전략 글이 있을 때):
  - 전략 글이 있는 선지는 누를 수 있다. 누르면 그 선지의 전략을 처음 문단부터 시작한다. 이미 본 선지도 다시 누를 수 있고, 다시 처음부터 보여 준다.
  - 전략 글이 없는 선지는 흐리게(모형의 `li.dim`처럼) 표시하고 누를 수 없다.
  - 지금 보는 선지에는 `data-selected`와 "전략 보는 중" 딱지를 붙인다. 이미 본 선지에는 회색 "봤음" 딱지를 붙인다.
  - 전략 글이 없는 문항이면 끝난 뒤 선지는 모두 누를 수 없다.
- 문제 칸 맨 위(문제 머리 아래, 선지 목록 위)에 단계별 한 줄 안내를 둔다.
  - 풀이 단계: "선지를 눌러 답을 골라"
  - 끝난 뒤 전략 시작 전: "틀린 내용을 담은 선지를 누르면 그 선지의 전략을 볼 수 있어"
  - 전략 읽는 중: "다른 선지를 누르면 그 선지 전략으로 바뀌어"
  - 한 선지 전략이 끝난 뒤: "본 선지도 다시 누를 수 있어"
  - 그 밖의 단계에서는 비운다.

### 2. 제출 칸

- 없애는 것: 제출 칸의 ①~⑤ 번호 버튼(`v4-choice-buttons`)과 [학습 맵으로 돌아가기 →] 링크(`RETURN`). 상단 머리의 [학습 맵]은 그대로 둔다. 출제자 전략 1차 구현의 전략 번호 버튼도 없앤다.
- **위 줄**(지금 `v4-composer-notice` 자리):
  - 왼쪽은 상태 문구다. 풀이 단계에서는 고른 선지가 없으면 "문제에서 답을 골라 줘", 있으면 "②번을 골랐어"를 쓰고, 그 옆에 [문제에서 바꾸기] 링크 버튼을 둔다. 링크를 누르면 좁은 화면에서 문제 탭으로 가고, 넓은 화면에서는 문제 칸의 고른 선지로 스크롤한다. 전략 읽는 중에는 "② 전략"이다. 오류·대기 안내처럼 기존 `notice`가 있으면 그것이 우선한다.
  - 오른쪽은 [정답만 입력] 체크 상자(지금 `v4-omit`)다. 체크 상자가 쓰이지 않는 단계에서는 비활성으로 자리만 지킨다.
- **가운데**: 근거 입력 칸(지금과 같다).
- **아래 줄 오른쪽**: 작은 버튼(모형 높이 약 30px, 글자 12px).
  - **주 버튼 자리 하나**의 문구와 동작이 단계에 따라 바뀌고, 위치와 크기는 그대로다.
    - 풀이 단계: [제출]
    - 끝난 뒤 전략 시작 전·한 선지 끝난 뒤: [전략 보기]. 기본 선지를 연다. 기본 선지는 학생의 마지막 선택이 전략이 있는 선지이고 아직 안 봤으면 그 선지, 아니면 아직 안 본 선지 중 번호가 가장 작은 것, 모두 봤으면 첫 선지다.
    - 전략 읽는 중: [다음]
  - 기존 다른 주 버튼(재선택·설명 보기·마치기·응/아니·다음으로 넘어가기·다시 시도 등)은 지금처럼 같은 오른쪽 자리에 놓고, 문구는 바꾸지 않는다. 크기만 새 작은 버튼 규격을 따른다.
  - 끝난 뒤에는 주 버튼 오른쪽에 [다시 풀기](지금 `RESTART` "같은 문제 다시 풀기"의 문구만 바꿈)를 고정한다. 전략 글이 없는 문항이면 [다시 풀기]만 둔다.
- 제출 칸 전체 높이는 단계가 바뀌어도 변하지 않는다(기존 e2e "composer keeps three rows and identical height"의 의도 유지).

### 3. 대화 말풍선

- 풀이 시작 말풍선: `packages/pipeline/src/problem-solving/feedback-v4.ts:150`의 문구를 "문제에서 답을 고르고, 그렇게 판단한 근거를 적어 줘. 근거 없이 답만 내도 돼."로 바꾼다. 이 문구를 기대하는 테스트도 함께 고친다.
- 전략 안내 말풍선: `strategyLeadText` 결과 끝에 " 보고 싶은 선지를 문제에서 눌러 봐."를 붙인다(발문 방향별 두 문구 모두).
- 전략 문단 말풍선, 끝 말풍선("②번 전략은 여기까지야." / "… 다른 선지의 함정도 볼 수 있어.")은 1차 구현 그대로 둔다. 끝 말풍선의 "다른 선지" 문구 조건은 아직 안 본 선지가 있을 때다.

### 4. 좁은 화면

- 문제 탭에서 선지를 골라도 대화 탭으로 자동 이동하지 않는다.
- 위 줄 [문제에서 바꾸기]는 문제 탭으로 바꾼다.

## 손댈 파일

- `packages/app/src/client/ProblemFeedbackV4App.tsx`, `v4-composer-state.ts`(+test), `examiner-strategy-state.ts`(+test), `problem-feedback-workbench.css`
- `packages/pipeline/src/problem-solving/feedback-v4.ts`(문구 한 줄)와 그 문구를 기대하는 테스트
- `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`: 번호 버튼으로 고르던 단계를 선지 누르기로 바꾸고, 아래 시나리오를 더한다.

## 테스트

- 단위
  - 제출 칸 상태: 단계별 주 버튼 문구, [다시 풀기] 유무, 상태 문구
  - 전략 상태: 기본 선지 규칙, 다시 보기, "봤음" 목록, 안내 한 줄 문구
- e2e(기존 하네스, 격리 포트)
  - 기존 16건이 새 조작으로 모두 통과한다. 시험 의도(높이 고정, 교정, 재선택, 복원 등)는 바꾸지 않는다.
  - 새 시나리오: 정보 비대칭 13번(부정 발문)에서 다음을 확인한다.
    - 가운데 선지를 눌러 고르고 제출한다.
    - 끝난 뒤 정답 ⑤만 누를 수 있고 나머지는 비활성이다.
    - ⑤를 누르면 전략 말풍선이 나오고, [다음]으로 넘어가며, 주 버튼 위치(경계 상자)는 단계가 바뀌어도 같다.
    - 끝 말풍선 뒤 ⑤를 다시 누를 수 있다.
    - 제출 칸에 번호 버튼과 [학습 맵으로 돌아가기]가 없다.
  - 좁은 화면(기존 모바일 시험 크기): [문제에서 바꾸기]가 문제 탭으로 간다.
- 명령
  - `npx vitest run packages/app/src` (알려진 `boundary.test.ts` 1건은 보고만 한다)
  - `npx vitest run packages/pipeline/src/problem-solving`
  - `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  - `npm run typecheck`, `npm run typecheck:client`

## 완료 조건

- [ ] 위 테스트 통과.
- [ ] 캡처 4장 `docs/handoffs/2026-10-24-choice-direct-after-{1,2,3,4}.png`. 모형 1~4와 같은 단계를 e2e 하네스 화면(정보 비대칭 13번)으로 찍는다.
- [ ] 외부 API 호출 0회.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고, 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 특히 기존 e2e의 의도를 지키면서 새 조작으로 바꿀 수 없는 시험이 있으면 멈춘다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전에 멈춘다.
- 파일을 삭제(`rm` 등)하지 않는다. git commit·add·stash를 하지 않는다. `.env` 값을 출력하지 않는다.
- 이 세션이 띄운 개발 서버(5173·5174·5175)는 끄지 않는다. e2e는 격리 포트를 쓴다.

## 결과 보고 (실행 후 작성)

- 변경 파일 (이번 작업분)
  - `packages/app/src/client/ProblemFeedbackV4App.tsx`: 선지를 `radiogroup`/`radio` 버튼으로(Tab·방향키·Space/Enter, 접근성 이름 "②번 선지", `aria-checked`/`aria-disabled`), 문제 칸 위 안내 한 줄, 딱지(고름·전략 보는 중·봤음)와 `data-dim`, 제출 칸 번호 버튼·[학습 맵으로 돌아가기] 제거, 위 줄(상태 문구+[문제에서 바꾸기] / [정답만 입력]), 주 버튼 [전략 보기] 기본 선지 처리.
  - `packages/app/src/client/v4-composer-state.ts`(+test): `status` 추가, 주 버튼 문구([제출]·[전략 보기]·[다음]·[다시 풀기]), `RETURN`·`strategyChoices` 제거.
  - `packages/app/src/client/examiner-strategy-state.ts`(+test): 다시 열기(처음 문단부터, 앞선 말풍선 유지), `seenStrategyPositions`, `defaultStrategyPosition`, `choiceHintText`, `strategyLeadText` 끝 문구, 말풍선 key에 열람 순번 포함.
  - `packages/app/src/client/problem-feedback-workbench.css`
  - `packages/pipeline/src/problem-solving/feedback-v4.ts:150` 시작 말풍선 문구(이 문구를 기대하는 테스트는 없었음).
  - `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- 테스트 결과
  - `npx vitest run packages/app/src`: 242 통과, 1 실패(알려진 `boundary.test.ts` 1건, 이번 변경과 무관).
  - `npx vitest run packages/pipeline/src/problem-solving`: 410 통과.
  - `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`: 18건 전체 통과(기존 16건 중 전략 시험 1건을 새 시나리오로 대체 + 새 3건 추가). 수정 후 전체 재실행 결과다.
  - `npm run typecheck`, `npm run typecheck:client`: 오류 없음.
- 캡처: `docs/handoffs/2026-10-24-choice-direct-after-{1,2,3,4}.png` (정보 비대칭 13번, 오답 ③ 선택 → 풀이 끝 → ⑤ 전략 읽는 중 → ⑤ 전략 끝).
- 기존 e2e 중 바꾼 시험과 방식
  - 공통: `select` 도우미와 번호 버튼 조작을 `radio` 클릭으로, 제출 버튼 이름을 '제출'로, "버튼 없음(count 0)" 단언을 `aria-disabled=true`로, "활성"을 `aria-disabled=false`로, `aria-pressed`를 `aria-checked`로. 좁은 화면에서는 `select`가 문제 탭에서 고른 뒤 대화 탭으로 가서 근거를 쓴다.
  - 'explicit omission...' 시험의 마지막 단언 "5번 선택 버튼 없음"은 끝난 뒤 ⑤가 전략 보기용으로 눌리게 되어 그대로 옮길 수 없었다. 같은 의도(재선택 없음)를 "[제출] 버튼 없음, 입력 칸 비활성, ①은 aria-disabled, ⑤는 aria-checked=false"로 바꿨다.
  - 'examiner strategy appears after completion...'(1차 구현 시험)은 새 시나리오 'direct choice flow...'로 대체했다.
  - 새 시험: 라디오 키보드 선택, 좁은 화면 [문제에서 바꾸기], 13번 직접 선택 흐름(주 버튼 경계 상자 동일 확인 포함).
- 남은 문제·해석한 점
  - [제출]: 선택·근거 전송과 근거 전송(풀이 단계 전부)은 '제출'로 바꿨다. 교정 질문의 '답변 전송'은 "기존 주 버튼은 문구 유지"로 읽어 그대로 뒀다.
  - 안내 문구 "선지를 눌러 답을 골라"는 선택·재선택 단계에서만 보인다(근거 입력 단계 `AWAITING_RATIONALE`에서는 선지가 비활성이라 비운다). 상태 문구 "②번을 골랐어"도 같다.
  - 모형 4에 따라 전략 한 선지가 끝나면 그 선지는 "전략 보는 중"이 아니라 "봤음"이고 강조(`data-selected`)가 없다. "전략 보는 중"과 `data-selected`는 읽는 중에만 붙는다.
  - 주 버튼 경계 상자가 같음은 전략 단계들([전략 보기]↔[다음]) 사이에서만 확인했다. 풀이 단계의 [제출]은 [다시 풀기]가 없어 모형 1처럼 맨 오른쪽에 있다.
  - 전략이 없는 문항의 끝난 뒤 선지는 누를 수 없고 흐리게 하지는 않는다(스펙에 흐림 지시 없음). 전략이 있는 문항의 전략 없는 선지만 흐리게 한다.
  - 같은 선지를 읽는 도중 다시 누르면 첫 문단 말풍선이 한 번 더 쌓인다(앞선 말풍선은 지우지 않음).
  - `[문제에서 바꾸기]`는 넓은 화면에서 고른 선지로 스크롤·포커스, 좁은 화면(900px 이하)에서 문제 탭으로 이동한다.
  - 외부 API 호출 0회. 파일 삭제·git add/commit/stash 없음.
