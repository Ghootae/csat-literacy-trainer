# 인계: SNS 진단평가 비용·대기 시간 측정 드라이버

- 날짜: 2026-11-07
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 상태: 측정 설계 사용자 승인(2026-11-07, 참가자 3명·즉시 제출·대본 규칙·상한 $3). 이 인계는 **가짜 모드 구현과 확인까지**다.
  실제 전송은 코드 에이전트가 사용자 재확인 뒤 직접 한다.
- 관련 결정: D-0200(진단 모드), D-0204(지문 단위·피드백 유지), D-0208(건너뛰기·근거 미제출), D-0168(기존 자료 재활용 검토).
- 설계 원문: `docs/SNS-DIAGNOSTIC-DESIGN-DRAFT-2026-11-06.md` 2-1 (4) 실행 시점 표, 4절 2(비용·대기 시간).
- 대본: `docs/experiments/sns-diagnostic-cost-2026-11-07/script/participants.json`(코드 에이전트 작성, 고치지 말 것).

## 목표

이 작업이 끝나면 다음이 참이다.

1. `scripts/run-sns-diagnostic-cost.mjs`가 대본의 참가자(H·M·L)를 차례로 `DiagnosticController`에 넣어 세트 E를 처음부터 결과 화면 자료까지 끝낸다.
2. `--mode fake`(기본값)는 외부 전송 없이 가짜 평가기·가짜 transport로 끝까지 돈다. `--mode real`은 `--confirm-send`가 없으면 아무 호출 없이 종료한다.
3. 참가자마다 비용(호출 종류·모델별 호출 수·토큰·달러)과 대기 시간 (가)·(나)·(다)를 `measurements.json`에 남긴다.
4. 비용 상한: 실제 모드에서 다음 참가자를 시작하기 전 `누적 비용 + 1.00 > 3.00`이면 시작하지 않고 멈춘 사유를 기록한다.

## 범위 밖

- 실제 모드 실행(외부 전송). `.env`를 읽거나 키를 넣지 않는다.
- 서버·컨트롤러·판정기·지시문 코드 수정. 드라이버는 기존 공개 메서드만 쓴다.
- 대본(`participants.json`) 수정. 대본이 코드와 안 맞으면 멈추고 보고한다.
- 판정 결과의 질 평가. 형식 실패 수만 센다.

## 손댈 파일과 계약

### (1) `scripts/run-sns-diagnostic-cost.mjs` (새 파일)

- 실행 방식: 다른 실측 스크립트처럼 빌드 산출물을 가져온다(`../packages/app/dist/server/diagnostic/controller.js` 등, 예: `scripts/run-v5-live-check.mjs`).
  HTTP 서버는 띄우지 않고 컨트롤러를 같은 프로세스에서 직접 부른다(HTTP 처리기는 얇은 전달층이라 대기 시간에 차이가 없다).
- 인자: `--mode fake|real`(기본 fake), `--confirm-send`(real에 필수), `--participants H,M,L`(기본 전부), `--out <dir>`
  (기본 fake면 `.omc/adhoc/sns-diagnostic-cost-fake/`, real이면 `docs/experiments/sns-diagnostic-cost-2026-11-07/runs/real/`).
- 참가자마다 새 `DiagnosticController`를 만든다. 저장소 루트는 `<out>/<id>/store`, 요약 대화 기록은 `<out>/<id>/summary-logs`(`summaryLogDirectory`).
  - fake: `test-support.ts`의 가짜(`feedbackFake` 등)와 같은 방식으로 `feedbackEvaluator`·`summaryEvaluator`·`diagnosisTransport`·`judgeTransport`를 넣는다.
    가짜는 실제 소요 시간을 흉내 내지 않아도 된다(지연 0~수십 ms). 대신 metadata의 토큰은 0이 아닌 고정값을 넣어 비용 집계 경로를 시험한다.
  - real: 옵션을 넣지 않아 기본(실제 OpenAI) 평가기가 쓰이게 한다.
- 참가자 한 명의 흐름(대본 `passageOrder` 순서):
  1. `create()`.
  2. 지문마다 `start(id, passageId, { summary })` — `summary`는 그 지문이 대본 `summaryPassages`에 있는지.
  3. 요약을 고른 지문: 문단마다 대본 요약 문장을 첫 차례로 보내고(`summaryRespond`), 응답이 다음 차례를 요구하면 `followUps.summarySecondTurn`을
     한 번 보낸 뒤, 문단이 끝나지 않았으면 다음 문단으로 넘어간다(`summaryNavigate`). 마지막 문단 뒤 `summaryFinish`. 요청 본문 모양은
     `SimpleDialogueController`·화면 코드(`packages/app/src/client/diagnostic/SummaryDialogue.tsx`)·e2e(`packages/app/e2e/diagnostic-flow.spec.ts`)를 따른다.
  4. 문항마다 `submitItem` — 선택은 대본 `choice`(선지 위치)를 그 문항 공개 파일의 `choiceId`로 바꿔 넣는다. `rationale`이 null이면 근거 미제출(`OMITTED`).
     **생각할 시간 없이 바로 이어서 제출한다**(가장 긴 대기를 재는 설계).
  5. `answersDone` 호출 시각을 적고, `summaryCard`를 1초 간격으로 물어 `pending`이 아니게 될 때까지 기다린다 → 대기 (가).
  6. 문항별 피드백: 문항 순서대로 `feedbackView`를 보고, 아래 규칙으로 `feedbackSubmit`을 반복한다. 문항당 명령 8번을 넘으면 그 문항을 멈추고 기록한다.
     - 근거를 요구하면(근거 미제출 오답) `RATIONALE`에 `followUps.omittedRationaleText`.
     - 교정 질문(오류 id가 있는 상태): 그 문항에서 처음이면 `CORRECT`(첫 오류 id, `followUps.correctionText`), 두 번째부터는 `SKIP`.
     - 교정 성공 뒤 다시 고르기 상태(`AWAITING_POST_REPAIR_CHOICE`, 선택지 `RESELECT`·`REQUEST_EXPLANATION`)면 `REQUEST_EXPLANATION`
       (보완 2026-11-07, 코드 에이전트: 승인된 대본 규칙 "마지막 설명을 받고 끝냄"과 같은 쪽. 다시 고르기는 대본에 두 번째 근거가 없어 쓰지 않는다).
     - 마지막 설명 확인이면 `END_START { accept: true }`, 이해 확인이면 `UNDERSTOOD { answer: true }`, 끝내기만 남았으면 `FINISH`.
     - 위 규칙에 없는 상태(예: `RESELECT`만 가능)를 만나면 그 문항을 멈추고 상태를 기록한다. 규칙을 지어내지 않는다.
     - 명령마다 보낸 시각과 응답 시각 → 대기 (다)(피드백).
  7. 마지막 지문의 피드백까지 끝나면 `result`를 1초 간격으로 물어 모든 칸이 `pending`이 아니게 될 때까지 기다린다(상한 10분).
     대기 (나)는 두 가지로 적는다: 마지막 `answersDone`부터, 마지막 피드백 명령 응답부터.
  8. 컨트롤러의 뒤 작업이 모두 끝나기를 기다린 뒤(테스트가 쓰는 방식이 있으면 그것) 저장소 `events.jsonl`과 요약 기록을 읽어 비용을 센다.
- 요약 대화 차례마다 보낸 시각과 응답 시각 → 대기 (다)(요약).

### (2) 비용 집계

- 단가(1M 토큰당 달러, 기존 스크립트와 같음): `gpt-6.1-sol` 입력 2·출력 10, `gpt-6-luna` 입력 0.1·출력 0.5. 캐시 할인은 빼고 계산한다(상한 쪽으로 보수적).
  표에 없는 모델이 나오면 멈추고 보고한다.
- 호출 출처와 기록 위치:
  - 선택·교정·마지막 설명: `JUDGMENT_DONE`/`JUDGMENT_FAILED`의 `call`(재시도별 `attempts` 포함, 토큰은 attempts 합).
  - 사고 진단: `THOUGHT_DIAGNOSIS_DONE`/`_FAILED`의 `metadata`.
  - 문단 판정: `ANALYSIS_DONE`/`ANALYSIS_FAILED`의 `metadata`.
  - 요약 대화: 요약 기록(`sessions.jsonl` 등)의 호출 metadata.
  - 실패 사건에 metadata가 없으면 0으로 세고 실패 수를 따로 센다.
- 호출 종류(선택 판정 정답·오답, 교정, 마지막 설명, 사고 진단, 문단 판정, 요약 대화)별로 호출 수·입력/출력 토큰·달러·소요 시간(중앙·최대)을 낸다.
  종류를 기록에서 구별할 수 없으면 구별 가능한 만큼만 나누고 보고에 적는다.

### (3) 출력 `<out>/measurements.json`

```json
{ "schemaVersion": "sns-diagnostic-cost-measurements-v1", "mode": "fake|real", "startedAt": "...", "scriptSha256": "...",
  "participants": [ { "id": "H", "correct": 13, "omitted": 0, "summaryPassages": 4,
    "cost": { "totalUsd": 0, "byKind": { "<kind>": { "calls": 0, "failures": 0, "inputTokens": 0, "outputTokens": 0, "usd": 0, "durationMsMedian": 0, "durationMsMax": 0 } } },
    "waits": { "summaryCardMs": { "<passageId>": 0 }, "resultFromLastAnswersDoneMs": 0, "resultFromLastFeedbackMs": 0,
               "feedbackTurnMs": [0], "summaryTurnMs": [0] },
    "stoppedItems": [ { "questionId": "...", "reason": "...", "lastView": {} } ],
    "elapsedMs": 0 } ],
  "cumulativeUsd": 0, "stoppedBeforeParticipant": null }
```

- 실제 모드에서는 참가자 한 명이 끝날 때마다 이 파일을 다시 쓴다(중간에 끊겨도 앞 참가자 자료가 남게).

## 완료 조건

- [ ] `npm run build` 뒤 `node scripts/run-sns-diagnostic-cost.mjs`(fake)가 H·M·L 세 명을 끝까지 돌리고 `measurements.json`을 쓴다. 외부 호출 0.
- [ ] fake 결과에서 참가자별 `correct`가 13·9·5, `omitted`가 0·2·3, 요약 지문 수가 4·2·0이다.
- [ ] fake 결과에서 비용 집계 경로가 모두 0이 아닌 값을 낸다(요약을 한 H에서 문단 판정·요약 대화, L에서 사고 진단).
- [ ] `node scripts/run-sns-diagnostic-cost.mjs --mode real`(`--confirm-send` 없이)이 아무 호출 없이 안내만 하고 끝난다.
- [ ] `stoppedItems`가 있으면 그 상태를 결과 보고에 적는다(규칙 보완은 코드 에이전트가 정한다).
- [ ] `npm run typecheck` 통과, `npm test` 기존 실패 2건 외 새 실패 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). real 모드는 실행하지 않는다.
- 특히 멈출 곳:
  - 컨트롤러의 공개 메서드만으로 흐름을 끝낼 수 없어 서버 코드를 고쳐야 하는 경우.
  - 피드백 상태가 (1) 6의 규칙으로 처리되지 않는 경우가 fake에서 나오는 경우(기록하고 계속하되, 보고에 사례를 남긴다).
  - 대본의 문단 수·문항 id가 세트 E와 맞지 않는 경우.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-sns-diagnostic-cost.mjs`(새 파일, `AWAITING_POST_REPAIR_CHOICE`(RESELECT·REQUEST_EXPLANATION) -> `REQUEST_EXPLANATION` 규칙 반영), 이 문서의 결과 보고 칸.
- 테스트 결과: build·typecheck 통과, `npm test` 1642 통과 / 2 실패(기존 2건: boundary.test.ts, axis-architecture-experiment.test.ts). 규칙 추가 뒤 fake 재실행: H·M·L 완주, correct 13·9·5, omitted 0·2·3, 요약 지문 4·2·0, stoppedItems 0건, 16문항 피드백 모두 완료(PASSAGE_DONE 4/4/4). 결과: `.omc/adhoc/sns-diagnostic-cost-fake/measurements.json`. `--mode real`(확인 플래그 없이)은 안내만 하고 종료.
- 호출 수(H/M/L): 선택(정답) 13/8/5, 선택(오답) 3/7/11, 교정 3/7/11, 마지막 설명 3/7/11, 사고 진단 3/6/8, 문단 판정 424/187/0, 요약 대화 22/9/0.
- 문단 판정 424건 내역(H): 플라스틱 노드 71·관계 29, 경마식 노드 59·관계 28, 소리(지각부호화) 노드 62·관계 37, 의식과 인지 (가) 노드 52·관계 31, (나) 노드 33·관계 22. 노드 277 + 관계 147. M(플라스틱+경마식)은 187.
- 남은 문제: 없음. fake 대기 확인 간격은 50ms(real은 1초).
