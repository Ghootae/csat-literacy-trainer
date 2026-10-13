# 인계: v5 개발자 경로 실모델 확인 시험 실행기

- 날짜: 2026-10-10
- 작성: Claude
- 실행: Codex
- 관련 결정·설계: `docs/review/v5-live-connection-test-design-2026-10-10.md`(사용자 승인 2026-10-10 "진행"), `memory/decisions/D-0112-v5-developer-path-connection-end-states.md`,
  구현 인계 `docs/handoffs/2026-10-10-v5-developer-path-connection.md`

## 목표

- `scripts/test-v5-live-connection.mjs`가 설계안 3절의 17경로 × 2회를 **운영 코드 그대로** 실행할 수 있다.
- `prepare` 모드는 외부 호출 없이 입력을 만들고 고정(FROZEN)하며 모의 실행 자체 점검을 통과한다.
- `run` 모드는 사용자 실행 승인 뒤 Claude가 `node --env-file=.env`로 실행한다. **Codex는 `run`을 실행하지 않는다.**

## 범위 밖

- 운영 코드(`packages/`) 수정. 실행기에서 필요한 기능이 운영 코드에 없으면 멈추고 보고한다.
- 실제 API 호출, `.env` 열기, 의존성 설치, 외부 네트워크, git 쓰기 명령. 루프백 테스트는 허용.
- 의미 검토 묶음·GPT 검토(실행 뒤 Claude가 따로 한다).

## 손댈 파일과 계약

- 새 파일: `scripts/test-v5-live-connection.mjs`, `scripts/test-v5-live-connection.test.mjs`. 그 밖의 파일은 만들거나 고치지 않는다.
- 출력 위치: `docs/experiments/v5-live-connection-2026-10-10/` (실행기가 만든다).

### 실행 구조

- 각 칸은 `ProblemFeedbackV4Controller`(`packages/app/dist/server/problem-feedback-v4.js` 빌드 산출물 또는 동등한 import 경로)로 진행한다. 생성자 옵션:
  - `loadSource`: `docs/experiments/v5-multi-item-luna-sol-2026-10-08/sources.json`의 문항.
  - `save`: 칸별 JSONL(`<칸>.records.jsonl`)에 기록.
  - `evaluator`: 아래 **재생 겸 실제 판정기**.
- 재생 겸 실제 판정기:
  - "이어 하기" 칸의 **첫 평가 호출**만 기록된 첫 판정을 돌려준다: `docs/experiments/v5-multi-item-luna-sol-2026-10-08/<firstJudgeModel>/<세션ID>-r1.json`의 `call.rawOutput`
    (`firstJudgeModel`은 `docs/experiments/v5-repair-test-2026-10-10/variants.json`의 `sessions`). 메타데이터는 `provider: 'mock'`, 모델은 기록된 모델.
    이 재생 방식은 `scripts/test-v5-repair.mjs`의 `loadInputs`와 같다(첫 제출은 같은 문항·같은 선지·같은 근거 원문, `cases.json`).
  - 그 밖의 모든 평가 호출은 운영 `OpenAIFeedbackEvaluator`를 **옵션 없이 기본값으로**(모델 덮어쓰기 금지) 만들되, `transport`만 원장 기록용으로 감싼다.
- 원장 transport: 요청마다 START(모델·요청 해시·예약 비용)를 먼저 쓰고, 응답 뒤 END(사용량·비용·소요 시간·응답 ID·상태)를 쓴다. 오류도 END로 닫는다.
  `scripts/test-v5-repair.mjs`의 `createLedger`를 참고한다. 모델별 한도: `gpt-6.1-sol` 40요청·1.2달러, `gpt-6-luna` 80요청·0.3달러(단가 sol 입력 2/출력 10, luna 0.10/0.50달러 per 1M).
  예약 비용 + 확정 비용이 한도를 넘으면 요청을 보내지 않고 `RUN_LIMIT`로 그 칸을 멈추고 실행 전체를 멈춘다. 원장에 START만 있고 END가 없으면 재개를 거부한다.
- 칸 진행: 설계안 3절 표의 학생 입력을 순서대로 `controller.submit`에 보낸다. 각 단계 전에 현재 `phase`가 예정 단계인지 확인한다.
  - 예정과 다르면(예: L11이 교정 질문으로 감, L16·L17의 질문 수가 다름, 예정에 없는 버튼 단계) 그 자리에서 칸을 멈추고 `PATH_DEVIATION`과 실제 단계·메시지를 기록한다.
  - 질문 문구는 비교하지 않는다(2026-10-10 보완). L16·L17은 교정 질문이 정확히 하나이고 단계가 예정과 같으면, 실제 질문 문구를 칸 결과의 `actual.correctionQuestions`에 기록하고 고정 답을 그대로 보낸다. 질문과 답의 의미 적합성은 실행 뒤 검토 대상이다.
  - 교정 답은 활성 `activeErrorId`로 보낸다. L7의 두 번째 답은 두 번째 교정 질문에 보낸다.
  - 평가가 `RETRYABLE_ERROR`이면 `RESUME`을 한 번 보낸다. 또 실패하면 `EVALUATION_ERROR`로 칸을 끝낸다.
- 학생 입력·경로 정의는 실행기 안의 상수 하나(`CELLS`)에 설계안 표와 **글자 그대로** 둔다. L16·L17의 첫 근거는 `cases.json`의 S2·S4 근거 원문을 읽어 쓴다.

### 칸 결과 파일 (`<칸ID>-r<회>.json`)

- `id`, `replicate`, `status`(`VALID` | `PATH_DEVIATION` | `EVALUATION_ERROR` | `RUN_LIMIT`), `expected`(경로·endReason·outcome·호출 모델 목록), `actual`(단계 이력, 마지막 공개 뷰, `result`, 호출별 `{kind, model, durationMs, outcome}`),
  `endExplanation`(종료 설명 원문, 있을 때), `submissionDurationsMs`(제출별 총 소요 시간), `checks`(아래), `transcript`.
- 종료 설명의 endReason은 세션 기록(`pendingEnd`)에서 가져온다.

### 자동 검사 (`checks`)

설계안 4절을 그대로 구현한다.

- `path`: 단계 이력·endReason·outcome이 예정과 같음(이탈 칸은 검사하지 않고 `PATH_DEVIATION`).
- `models`: 실제 호출 모델 목록이 예정과 같음(재시도로 같은 모델이 반복되는 것은 허용).
- `noOfficialExplanation`: 공개 메시지·transcript 어디에도 해당 문항 `officialExplanation`의 20자 이상 연속 문자열이 없음.
- `answerLine`: 오답 종료는 메시지가 `\n정답은 N번입니다.`로 끝나고 `answerRevealed: true`, 정답 종료는 그 줄이 없고 `answerRevealed: false`.
- `publicView`: 마지막 공개 뷰 JSON에 `officialExplanation`·`explanation` 키가 없음.
- `explanationStatic`(종료 설명이 있을 때): 내부 식별자, 손상 문자열, `학생[은이의을]`, 해요체 아닌 종결(`습니다|입니다|이다|한다` 뒤 문장 끝; 따옴표 안 학생·원문 인용은 제외) 각각의 참/거짓.
- `retries`: 호출 종류별 오류 시도 수와 사유(주장 계약 `CLAIMS_CONTRACT` 포함).

### 요약 (`RESULTS.json`)

칸 수, 상태별 수, 자동 검사 위반 목록, 경로 이탈 목록, 모델별 요청 수·확정 비용, 호출 종류별·제출별 소요 시간 중앙값과 최대값, 재시도 목록, 중단 사유.

### 모드

- `node scripts/test-v5-live-connection.mjs prepare`: 입력 검증(세션 재생이 교정 질문 대기 상태에 도달, 교정 질문 errorId가 학생 답 키와 맞음), `FROZEN.json` 작성(입력·실행기·운영 지시문 파일 해시), 외부 호출 0.
- `node --env-file=.env scripts/test-v5-live-connection.mjs run`: FROZEN 일치 확인 후 실행. 이미 있는 칸 파일은 건너뛴다(재개). 순서: 회차 1의 L1~L17, 회차 2의 L1~L17.

## 완료 조건

- [ ] `prepare`가 외부 호출 없이 통과하고 `FROZEN.json`을 만든다.
- [ ] 모의 transport로 실행기 테스트(`scripts/test-v5-live-connection.test.mjs`):
  - [ ] 17경로 각각이 예정 경로로 끝나는 모의 응답에서 `VALID`, 자동 검사 전부 통과.
  - [ ] 예정과 다른 단계가 오면 `PATH_DEVIATION`으로 멈춤.
  - [ ] 공식 해설 문자열·내부 식별자·정답 줄 규칙 위반을 넣으면 해당 검사가 잡음.
  - [ ] 한도 초과 시 요청 전 `RUN_LIMIT`, START만 남은 원장 재개 거부.
  - [ ] 재생 칸의 첫 호출은 외부 호출을 하지 않음, 나머지는 운영 판정기 기본 모델 배정 그대로.
- [ ] 테스트 명령: `node --test scripts/test-v5-live-connection.test.mjs` 통과. 기존 `npx vitest run packages/pipeline/src/problem-solving packages/app/src/server/problem-feedback-v4.test.ts packages/app/src/server/problem-feedback-v4-http.test.ts packages/app/src/client` 342/342 유지.
- [ ] 변경 파일이 위 두 새 파일뿐(빌드 산출물·prepare 출력 제외).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송·의존성 설치가 필요해지면 실행 전 멈춘다(별도 승인 필요). 루프백 테스트는 허용.
- 운영 코드 수정이 필요해 보이면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/test-v5-live-connection.mjs` 신규: 17경로 입력·단계 검사, 운영 컨트롤러와 기본 모델 판정기 연결, 첫 판정 재생, START/END 원장·한도 차단, 재시도·자동 검사·결과 요약·FROZEN 검증·완료 칸 재개 처리.
  - `scripts/test-v5-live-connection.test.mjs` 신규: 모의 transport로 17경로 및 충분성 분기, 경로 이탈, 질문 문구 보존, 공개 정보 검사, 한도·미완료 원장, 주장 계약 재시도와 RESUME 검증.
  - `docs/experiments/v5-live-connection-2026-10-10/FROZEN.json` 생성: 입력·실행기·운영 코드·지시문 해시와 17경로 × 2회 고정.
  - 이 인계 문서의 결과 보고 절만 갱신. 운영 코드·기존 테스트·다른 세션 파일은 수정하지 않음.
- 테스트 결과:
  - `node --test scripts/test-v5-live-connection.test.mjs`: **32/32 통과**. 17경로 모두 VALID·자동 검사 통과.
  - `npx --no-install vitest run packages/pipeline/src/problem-solving packages/app/src/server/problem-feedback-v4.test.ts packages/app/src/server/problem-feedback-v4-http.test.ts packages/app/src/client`: **25파일, 342/342 통과**. 설치 방지를 위해 `--no-install` 사용.
  - `npm run build`: 통과(exit 0).
  - `npm run typecheck:client`: 통과(exit 0).
  - `node scripts/test-v5-live-connection.mjs prepare`: 통과(exit 0). 재생 5세션 검증·FROZEN 생성, 외부 요청 **0**.
- 고친 기존 테스트와 이유: **없음**. 기존 342개 테스트를 변경 없이 통과함.
- 남은 문제: 모의 검증에서 미해결 실패 없음. `run` 모드와 실제 API는 실행하지 않았으므로 실모델 경로·응답 품질·실제 비용·지연은 미검증이며 후속 실행·의미 검토 대상임. 외부 네트워크·의존성 설치·`.env` 열기·git 쓰기 명령은 수행하지 않음.
