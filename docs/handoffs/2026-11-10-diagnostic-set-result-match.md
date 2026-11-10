# 인계: 진단 세트 결과를 지문 결과와 맞추기 — 등급 표시·작은 분포 곡선·지문별 누적 띠·문항 칸 색

- 날짜: 2026-11-10
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0222-diagnostic-set-result-match-passage-result.md` (참고: D-0218 지문 결과 화면, D-0219 등급 띠·문장)

## 목표

세트 결과 화면(`ResultView`)이 다음과 같다.

1. "① 내 위치" 큰 글씨 = 16문항 전체 기준 확률 최대 등급(`grade.mode`, 예 "2등급"), 바로 아래 `gradeSentence(probabilities, mode)` 한 줄. "1~3등급" 같은 범위 표기는 화면 어디에도 없다.
2. 그 아래 지문 결과와 같은 그라데이션 등급 띠(`gradeGradient(probabilities)`, 커서·누름 말풍선 "n등급일 확률 p%", 1~9등급 눈금).
3. 그 아래 작은 정규분포 곡선(참고용, 지금 곡선보다 낮게). 제목 "전국 분포에서의 위치" 정도. 9개 등급 구간 배경은 지금처럼, 확률 최대 등급 구간 하나만 강조색으로 칠하고, 범위 세로선 두 개는 없앤다. 곡선 아래(또는 옆)에 "2등급: 전국 상위 4~11%"처럼 그 등급의 전국 비율. 비율은 `TOP=[4,11,23,40,60,77,89,96]`(상위 %)에서: 1등급 "상위 4% 이내", g등급(2~8) "상위 TOP[g-2]~TOP[g-1]%", 9등급 "상위 96~100%".
4. "지문을 풀수록 좁아진 범위"를 "지문을 풀수록 또렷해진 위치"로 바꾼다. 줄마다(지문 1, 지문 1~2, …, 누적) 작은 그라데이션 등급 띠와 "4등급 · 29%"(그 누적 기준 최빈 등급과 그 확률). 마지막 줄 강조는 지금처럼. 작은 띠의 말풍선은 없어도 된다.
5. "② 문제 풀이 결과"의 문항별 칸이 지문 결과 문제 버튼과 같은 색 규칙·글자 표시를 쓴다: `resultGroup(item.category)`(good·check·wrong)과 `RESULT_GROUP_MARK`, 판정 중(`category`가 `PENDING`·`CHECKING`)은 지문 결과와 같은 "분석 중" 표시. 칸 아래 설명 문구("채운 칸은 정답…")를 새 규칙에 맞게 고친다. 색만으로 구분하지 않게 글자 표시를 칸 안이나 aria-label에 둔다(칸이 작으면 aria-label + 설명 문구로 충분, 판단 근거 보고).

## 범위 밖

- 문항 카드(`Card`) 내용, "③ 독해 패턴", "추천", 지문 결과 화면(`Pages.tsx` MidPage)의 동작.
- 등급 계산 방식(`participantPosition`), 판정, 리뷰 대상.
- `grade.density` 정리.
- 최종 결과 API의 공개 시점 규칙(D-0221에서 정한 ANSWERING 제외 등)은 그대로.

## 손댈 파일과 계약

- `packages/app/src/server/diagnostic/controller.ts` `positionByPassage`: 줄마다 `grade: { mode, probabilities }`를 더한다(누적 `participantPosition` 결과의 `grade.mode`·`grade.probabilities`). 기존 `low`·`high`는 남겨도 되지만 화면은 쓰지 않는다(지우면 시험·타입을 함께 고치고 보고). 결과 응답의 전체 `grade`에는 이미 `mode`·`probabilities`가 있는지 확인하고 없으면 더한다.
- `packages/app/src/client/diagnostic/types.ts`: 결과 `position`과 `byPassage` 타입에 위 값.
- 등급 띠 재사용: 지금 `Pages.tsx` 안의 `GradeBar`를 다른 화면에서 쓸 수 있게 옮기거나(예: 새 파일 `GradeBar.tsx`) export한다. 작은 띠용 크기 옵션(높이·말풍선 끔·눈금 끔)을 둔다. 지문 결과 화면의 모양·동작은 바뀌지 않아야 한다(지문 결과 e2e·사진으로 확인).
- `packages/app/src/client/diagnostic/ResultView.tsx` `Position`·`Solve`: 위 목표대로. 작은 곡선은 지금 SVG를 줄여 재사용.
- `packages/app/src/client/diagnostic/logic.ts`: 등급 전국 비율 문구 함수(예: `gradeShareText(grade)`)와 시험. 쓰지 않게 되는 함수(`gradeText`, `rangeBar`, `cellState` 등)는 다른 곳에서 안 쓰면 지우고 시험도 정리(쓰는 곳이 있으면 남기고 보고).
- `packages/app/src/client/diagnostic/diagnostic.css`: 문항 칸 색은 `.diag-qbtn[data-group]`과 같은 색값을 쓴다(같은 값을 두 번 쓰지 않게 공통 규칙이나 변수로).

## 완료 조건

- [ ] 목표 1~5가 화면 시험(Playwright `packages/app/e2e/diagnostic-flow.spec.ts`의 최종 결과 부분)과 단위 시험으로 확인된다: 큰 글씨가 `^[1-9]등급$`, 문장, 등급 띠 그라데이션과 말풍선, 작은 곡선의 전국 비율 문구, 지문 수만큼의 누적 줄과 "n등급 · p%", 문항 칸의 `data-group`, 화면에 "~" 범위 표기 없음.
- [ ] `npx tsc --noEmit -p packages/app/tsconfig.client.json`, `npx tsc --noEmit -p packages/app/tsconfig.json` 통과.
- [ ] `npm test` — 기존 실패 2건(`packages/app/src/boundary.test.ts`, `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`) 외 통과.
- [ ] `CSAT_API_PORT=5474 PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test packages/app/e2e/diagnostic-flow.spec.ts packages/app/e2e/diagnostic-dev-navigation.spec.ts` 통과. 사용자 서버 포트 5173·5174는 쓰지 않는다(끄지 말 것).
- [ ] 최종 결과 화면 사진(데스크톱, 폭 390)을 `DIAGNOSTIC_SCREENSHOT_DIR`로 세션 임시 폴더에 남기고 경로 보고(저장소 `docs/review` 사진은 덮어쓰지 않음).
- [ ] 커밋하지 않는다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 시험은 가짜 평가기만 쓴다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `server/diagnostic/controller.ts`(positionByPassage에 `grade{mode,probabilities}`), `client/diagnostic/types.ts`, 새 `client/diagnostic/GradeBar.tsx`(Pages.tsx에서 이동, `small` 옵션 = 말풍선·눈금 없는 낮은 띠), `Pages.tsx`, `ResultView.tsx`, `logic.ts`, `logic.test.ts`, `diagnostic.css`, `e2e/diagnostic-flow.spec.ts`
- 테스트 결과: `npm test` 1730 통과·2 실패(기존 실패 boundary.test.ts, axis-architecture-experiment.test.ts만). `tsc --noEmit` client·server 통과. `CSAT_API_PORT=5474 PLAYWRIGHT_CLIENT_PORT=5473 npx playwright test diagnostic-flow.spec.ts diagnostic-dev-navigation.spec.ts` 3 통과·0 실패. 화면 사진: /private/tmp/claude-501/-Users-mac-Projects-csat-literacy-problem-solving-mvp/5189898e-6647-4325-97e9-992fadd34bbe/scratchpad/shots4/07-result-desktop.png, 08-result-390.png
- 지운 함수·남긴 함수: 지움 `gradeText`, `rangeBar`, `cellState`, `gradeOfPercentile`(화면에서 안 쓰게 됨, 서버 일치 시험과 함께 삭제), 각 시험. 추가 `gradeShareText`. 남김 `zOfPercentile`·`GRADE_EDGES`(곡선), `POSITION_NOTE`, 응답의 `byPassage.low/high`·`percentile`(화면은 안 씀)
- 남은 문제: 문항 칸 글자 표시는 aria-label("…6번, ✕ 오답")과 설명 문구로 처리(칸 44px라 칸 안 글자는 넣지 않음). aria-label이 바뀌어 e2e의 `6번$` 정규식을 `6번(,|$)`로 고침. 지문 결과 화면 모양은 GradeBar 이동 외 변화 없음(e2e 통과).
