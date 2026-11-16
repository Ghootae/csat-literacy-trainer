# 인계: 진단 결과 화면 라벨 정리 (첫 선택·첫 요약·정답률 과목명)

- 날짜: 2026-11-16
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet) — **문구 확정 전에는 위임하지 않는다(아래 "미확정")**
- 관련 결정: 없음(확정 시 새 결정 기록). 배경: `docs/experiments/diagnostic-full-simulation-2026-11-13/REPORT-full-simulation-desktop.md` 제안 2, `memory/decisions/D-0234-restated-summary-corrections-card.md`(같은 보고서의 제안 1, 구현·푸시 완료 `5ba2951c`)

## 미확정 (사용자 판단 대기)

1. 점수 칸 이름과 설명 문구가 아래 예시로 괜찮은지.
2. 독해 패턴 문구를 "첫 요약만" 대신 "처음 쓴 요약 기준"으로 바꿔도 되는지.

두 답을 받은 뒤 문구를 이 문서에 확정으로 옮기고 위임한다. 규칙은 코드 에이전트가 정하고 사용자가 승인한다(AGENTS.md 업무 분장).

## 목표

학생이 결과 숫자를 잘못 읽지 않게 라벨만 바꾼다. 판정·집계 로직은 그대로다.

1. **점수 칸**(`packages/app/src/client/diagnostic/ResultView.tsx:70`): "정답 12 / 16"의 이름을 "처음 고른 답 기준 정답"으로 바꾸고 한 줄을 붙인다. 예: "코칭 뒤 고쳐 고른 답은 점수에 넣지 않았어." `correct`가 첫 선택 기준임은 `server/diagnostic/controller.ts:614`(`item.first.choiceId === answerChoiceId`)로 확인했다. 계산은 바꾸지 않는다.
2. **독해 패턴**(`ResultView.tsx:105`, 지문 목록 줄 끝의 "첫 요약만"): 숫자(`layers` 문장 `diag-line`) 가까이에 뜻을 반복한다. 예: "처음 쓴 요약 기준이야. 질문과 교정으로 보완한 내용은 넣지 않았어."
3. **정답률 두 수치**(`client/diagnostic/logic.ts:211` `percentPair`): "a% · b%"를 "화작 a% · 언매 b%"로 출력한다. 함수 한 곳을 고치면 지문 결과 문항 줄(`logic.ts:54`, `:56`)과 결과 카드(`ResultView.tsx:41`, `:51`)가 함께 바뀐다. `Pages.tsx:56`의 "(두 수치는 화작 · 언매 순)"과 `MEGASTUDY_NOTE`(`logic.ts:212`)의 과목명은 중복되므로 정리한다.

## 범위 밖

- 판정·집계 로직, 점수 계산, 서버 코드, 모델 호출.
- 최종 화면 밀도·모바일 배치 재설계(설명은 한 줄씩만 둔다).
- 보고서 제안 3(Q-0048 `UNKNOWN`/`INSUFFICIENT` 갈래 재확인), 제안 4(함정 표현 바꾸기). 별도 논의.

## 보고서 정정 (이미 파악)

보고서 Findings 5는 정답률 두 수치의 순서가 지문 결과 푸터에서만 설명된다고 했다. 코드상 결과 카드에도 `MEGASTUDY_NOTE`(메가스터디 이용자 기준 · 화법과작문 · 언어와매체)가 숫자 아래에 있다. 숫자 옆에 과목 이름이 없다는 문제는 그대로다.

## 완료 조건

- [ ] 위 세 곳의 문구가 확정 문구로 바뀐다.
- [ ] `percentPair`·`MEGASTUDY_NOTE`·푸터 문구를 기대하는 기존 테스트의 문자열을 함께 고친다(`grep -rn 'percentPair\|MEGASTUDY_NOTE\|첫 요약만' packages/app/src packages/app/e2e`로 찾는다).
- [ ] `npm run typecheck` 통과, `npx vitest run` 통과. 알려진 실패 2건(`packages/app/src/boundary.test.ts`의 `server/student-state.ts` fs import, `axis-architecture-experiment.test.ts`의 `.omc/adhoc/...json` 부재)은 이번 변경과 무관하다.
- [ ] e2e나 브라우저 확인이 가능하면 결과 화면 캡처로 줄바꿈·밀도를 본다(1280×720과 모바일 폭).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
