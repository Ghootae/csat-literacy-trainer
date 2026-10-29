# 인계: v5.7 채택 회귀 — v5.6 회귀 18세션 학생 명령 재생 실행기

- 날짜: 2026-10-29
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet). **실행기 작성·가짜 transport 시험까지.** 실모델 실행은 메인 세션이 한다.
- 사용자 승인: v5.7 회귀 18세션, 약 $1, 상한 $1.5(2026-10-29 "승인, 진행해줘").
- 기준: `docs/experiments/v5-diverse-48-regression-2026-10-28-v56/`(v5.6 회귀, `SET.txt` 18세션, 세션별 `cases/<id>.json`의 `steps[].command`·`steps[].inReplyTo`·`steps[].view`, 문항 원자료 `sources.json`).

## 목표

`scripts/run-v5-regression-replay.mjs`: 기준 폴더의 각 세션을 새 지시문으로 처음부터 다시 진행하며, 기준 세션의 학생 명령을 같은 순서로 넣는다. 화면 단계가 기준과 갈라지면 그 세션을 멈추고 갈라진 지점을 기록한다.

## 계약

- 명령: `node --env-file-if-exists=.env scripts/run-v5-regression-replay.mjs --base <기준 폴더> --out <새 폴더> --prompt <지시문 경로> --prompt-version <이름> --cap-usd <n> [--only <id,id>] [--answers <json>]`
- 평가기: `new OpenAIFeedbackEvaluator({ promptPath, promptVersion, transport })`. 모델 라우팅·마지막 설명 레이아웃은 제품 기본값. transport는 요청·응답을 `<out>/requests/`에 저장하고 비용을 누적한다(단가 sol 입력 $2·출력 $10, luna $0.10·$0.50 per 1M). 누적이 상한을 넘으면 새 요청 전에 멈춘다.
- 컨트롤러: `packages/app/dist/server/problem-feedback.js`의 `ProblemFeedbackController`, `loadSource`는 기준 `sources.json`의 해당 문항, `save`는 `<out>/cases/<id>.records.jsonl`에 추가. 사용자 기록(`.omc/logs`)에 쓰지 않는다.
- 진행 규칙(세션마다):
  1. `controller.start(questionId)` 뒤 기준 `steps`를 순서대로 본다.
  2. 각 기준 step의 `inReplyTo.phase`가 현재 view의 phase와 같으면 그 `command`를 넣는다. `CORRECT` 명령의 `errorId`는 현재 view의 `activeErrorId`로 바꿔 넣는다(오류 ID는 판정마다 다를 수 있다). 교정 질문 문장이 달라도 phase가 같으면 넣는다.
  3. phase가 다르거나 기준 step이 남았는데 세션이 끝났거나, 기준 step이 끝났는데 세션이 안 끝났으면 멈추고 `DIVERGED`로 기록한다(현재 view의 phase·message·activeErrorId, 기준 step의 inReplyTo).
  4. `--answers` JSON(`{ "<id>": [{ "atStep": n, "command": {...} }] }`)이 있으면 갈라진 지점에서 그 명령을 넣고 이어 간다(메인 세션이 새 답을 정할 때 쓴다).
  5. 평가 실패(`RETRYABLE_ERROR`)면 기준과 같은 방식으로 RESUME 1회, 그래도 실패면 `ERROR`로 기록.
- 출력: `<out>/cases/<id>.json`(steps: 넣은 명령·직전 view 요약·이후 view·판정 호출 metadata), `<out>/SUMMARY.json`(세션별 상태 COMPLETED/DIVERGED/ERROR, 최종 `result.outcome`, 기준의 최종 outcome, 교정 질문 문장 목록 기준 대 새, 형식 재시도 수(attempts 중 ERROR), 비용).
- 재실행 안전: `<out>`에 이미 있는 세션은 `--only`로 지정하지 않으면 건너뛴다.

## 범위 밖

- 실모델 호출(시험은 가짜 transport). 제품 코드·지시문 변경. 기존 회귀 스크립트(`run-v5-diverse-48*.mjs`) 수정. 커밋·`git add`.

## 완료 조건

- [ ] 가짜 transport 시험(`scripts/run-v5-regression-replay.test.mjs`, 기존 `run-v5-diverse-48-concurrent.test.mjs` 방식 참고): 같은 phase면 기준 명령을 넣음, CORRECT의 errorId 교체, phase가 갈라지면 DIVERGED, `--answers`로 이어 감, 상한 초과 시 멈춤.
- [ ] `npm test`에 포함되면 기존 실패 2건 외 새 실패 없음(포함 안 되면 `node --test`로 실행 결과 보고).
- [ ] `--help` 출력.
- [ ] 기준 폴더 18세션 각각의 step 수와 첫 command 종류를 읽어 출력하는 `--dry`(외부 호출 없음)로 입력 읽기 확인.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
