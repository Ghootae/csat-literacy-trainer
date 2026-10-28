# 인계: 출제자 전략 — 입구 하나로(메모장 43)·말풍선별 원문 칠하기(메모장 41)

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 없음.
- 관련: [메모장](../review/v4-dev-ui-feedback-backlog-2026-10-11.md) 41·43번, [선지 직접 누르기 인계](./2026-10-24-choice-direct-select-ui.md), D-0170·D-0172, 7번 결정 B(교정 질문 근거 칠하기)
- 사용자 승인(2026-10-28): "모두 권고에 동의. 구현 승인"

## 측정 근거 (41, Claude, 외부 호출 없음)

`FINAL.json` 57편의 ‘…’ 인용 381개: 지문과 글자 일치 239, 선지·<보기>·해설 일치 142, 못 찾음 0(공백 정규화 후, 끝의 마침표·쉼표 제거). 지문 인용 239개 중 지문에 두 번 이상 나오는 것 41개(대부분 '만'·'활성'·'이것' 같은 짧은 말). 문단 291개 중 지문 인용이 있는 문단 173개.

## 목표

1. (43) 세션이 끝난 뒤 전략 단계의 주 버튼은 늘 [다음] 하나다. [전략 보기] 버튼은 없다.
   - 선지를 누르기 전(INTRO)·한 선지가 끝난 뒤(ENDED): [다음] 비활성.
   - 전략 선지를 누르면 그 선지 첫 문단 말풍선이 나오고(READING) [다음]이 켜진다. [다음]은 다음 문단을 보인다.
   - 긍정·부정 발문 모두 같은 규칙. 읽는 중 다른 전략 선지를 누르면 그 선지로 바뀌는 지금 동작, 본 선지를 다시 누르면 처음부터 다시 보는 지금 동작은 그대로.
   - 버튼 줄: [다시 풀기] [다음] (38번: 주 버튼 맨 오른쪽). 자리가 바뀌지 않는다.
2. (41) 전략 말풍선이 하나 나올 때마다 그 말풍선 글의 ‘…’ 인용 중 **지문에 정확히 한 번 나오는 것**만 지문 칸에서 칠하고, 칠한 곳으로 지문을 스크롤한다.
   - 매칭: 인용과 지문 모두 공백 연속을 한 칸으로 정규화하고 인용 끝의 `.`·`,`를 뗀 뒤 찾는다. 칠할 위치는 원래 지문 글자 위치로 되돌려 쓴다.
   - 두 번 이상 나오거나 지문에 없는 인용(선지·<보기> 인용)은 칠하지 않는다.
   - 지문 인용이 하나도 칠해지지 않는 말풍선이 나오면 칠한 곳을 지운다.
   - 기준은 "가장 최근에 나온 전략 말풍선". 다른 선지로 바꾸거나 다시 열면 그 선지 첫 말풍선 기준으로 바뀐다. 전략 단계를 벗어나면(다시 풀기 등) 지운다.
   - 칠하기 모양·스크롤은 교정 질문 근거 칠하기(7번 결정 B, 33번)와 같은 컴포넌트·함수를 다시 쓴다. 모바일 좁은 화면에서는 탭을 자동으로 바꾸지 않는다(지금 교정 질문의 [지문에서 보기] 같은 단추가 있으면 같은 방식, 없으면 칠하기만).

## 범위 밖

- `FINAL.json`, 전략 글 내용·지시문, 서버 `examiner-strategy.ts`의 로딩 규칙.
- 말풍선 간격·마무리 말풍선(묶음 2 규칙)은 그대로. 전략 말풍선에 묶음 2 순차 간격을 새로 적용하지 않는다.
- git 쓰기 명령.

## 손댈 곳 (참고)

- `packages/app/src/client/problem-composer-state.ts`: `STRATEGY_OPEN` 버튼 제거, 전략 단계(COMPLETED이고 전략 있음)면 `STRATEGY_NEXT` [다음]을 늘 넣고 READING일 때만 활성. `ButtonId`에서 `STRATEGY_OPEN` 제거.
- `packages/app/src/client/examiner-strategy-state.ts`: `defaultStrategyPosition`이 더 쓰이지 않으면 지운다. 인용 찾기·위치 계산 함수(`strategyHighlights(text, passage)` 등)를 여기에 순수 함수로 둔다.
- `packages/app/src/client/ProblemLabApp.tsx`: [전략 보기] 처리 제거, 마지막 전략 말풍선 기준 칠하기·스크롤 연결.
- 안내 문장(`strategyLeadText`, `choiceHintText`, `strategyEndText`)은 바꾸지 않는다. 바꿔야 할 문장이 생기면 바꾸지 말고 결과에 적는다.

## 완료 조건

- [ ] 단위 테스트: 버튼 상태(INTRO 비활성 [다음], READING 활성, ENDED 비활성, 버튼 순서 [다시 풀기, 다음], [전략 보기] 없음), 인용 매칭(공백 정규화, 끝 구두점, 두 번 이상 나오는 인용 제외, 지문 밖 인용 제외, 위치가 원문 기준으로 맞음), `FINAL.json` 전체를 원문(아래)과 맞춰 지문 인용 239개 중 칠해지는 수가 198개(=239-41)인지 확인하는 시험.
  - 원문 출처: `docs/experiments/examiner-strategy-2026-10-23/full-v4/requests/<passageId>-q<question>-c<choice>__*.json`의 `input[0].content[0].text`(JSON)의 `passage`. 이 시험은 저장소 파일만 읽는다.
- [ ] e2e(격리 포트 `PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5394 CSAT_PROBLEM_LAB_API_PORT=5394`): 419행 시험을 새 흐름으로 고치고(선지 누르기 전 [다음] 비활성 → 선지 누르면 첫 문단·[다음] 활성 → 끝나면 비활성), 칠하기 시험을 더한다(전략 말풍선 뒤 지문 칸에 칠한 곳이 있고 그 글이 인용과 같음, 인용 없는 문단에서는 칠한 곳이 없음). 기존 실패 14개(75, 130, 149, 159, 170, 182, 196, 230, 268, 285, 305, 321, 346×2행)는 고치지 않고 그 밖은 전부 통과.
- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건만(`boundary.test.ts` `node:fs`, `axis-architecture-experiment.test.ts` `.omc/adhoc`).
- [ ] 1600×1000 캡처 두 장: 전략 시작 전(`[다음]` 비활성) `docs/handoffs/2026-10-28-strategy-entry-before-choice.png`, 전략 말풍선 읽는 중 지문 칠한 곳 보임 `docs/handoffs/2026-10-28-strategy-highlight.png`. e2e가 다른 날짜의 기존 캡처 파일을 덮어쓰면 HEAD 내용으로 되돌린다.

## 결과 (실행 후 작성)

- 바뀐 파일(packages/app): `src/client/problem-composer-state.ts`(STRATEGY_OPEN 제거, STRATEGY_NEXT 상시·READING일 때만 활성), `src/client/examiner-strategy-state.ts`(defaultStrategyPosition 삭제, `strategyHighlights` 추가), `src/client/ProblemLabApp.tsx`(전략 보기 처리 제거, 마지막 전략 말풍선 기준 칠하기·스크롤; `scrollToHighlight(location)`에 인자 추가), 시험 `problem-composer-state.test.ts`, `examiner-strategy-state.test.ts`, `e2e/problem-lab-workbench.spec.ts`.
- 테스트: `npx vitest run src/client` 8파일 101개 통과(버튼 상태, 인용 매칭, FINAL.json 시험 포함). `npm test` 1464 통과·2 실패(기존 `boundary.test.ts`, `axis-architecture-experiment.test.ts`만). `npm run build` 통과. e2e(격리 포트) 22개 중 8 통과·14 실패. 실패는 기존 14개와 같은 시험이다(줄 번호만 +11 밀림: 86, 141, 160, 170, 181, 193, 207, 241, 279, 296, 316, 332, 357×2). 새 흐름 시험(430줄 “direct choice flow…”)은 통과.
- 칠해지는 인용 수: 지문 인용 239개 중 198개(=239-41). 같은 말풍선 안에서 같은 인용이 두 번 나오면 두 번 센 값이다.
- 캡처: `docs/handoffs/2026-10-28-strategy-entry-before-choice.png`, `docs/handoffs/2026-10-28-strategy-highlight.png` (1600×1000). e2e가 덮어쓴 `2026-10-24-choice-direct-after-1~4.png`는 HEAD 내용으로 되돌림.
- 문서와 달리 판단한 점: (1) 전략 읽는 중에는 지문 칸에 교정 칠하기(correctionHighlights) 대신 전략 칠하기만 보인다(두 칠이 섞이지 않게). (2) 칠하는 범위에서 인용 끝의 `.`·`,`는 제외한다. (3) 모바일 좁은 화면에는 [지문에서 보기] 같은 전략용 단추가 없어 칠하기만 하고 탭은 바꾸지 않는다. (4) 안내 문장은 바꾸지 않았고 바꿀 문장도 생기지 않았다.
