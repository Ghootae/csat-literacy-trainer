# 인계: 공손룡 12번 공급자 비교 재시험 (DeepSeek V4.1 Flash-1017 포함, 현재 운영 v5 코드)

- 날짜: 2026-10-22
- 작성: Claude
- 실행: 준비물(실행기·검토 묶음 생성기·모의 테스트)은 executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md)).
  사전 점검·실모델 실행·판정은 Claude.
- 근거: 사용자 2026-10-22 "V4.1 Flash-1017을 기반으로 같은 내용의 실험을 돌리자. 그 결과를 기존의 제미나이, 솔, 루나 결과와 비교해줘",
  코드 기준 "A로 진행"(현재 운영 v5로 다섯 설정 모두 재실행), 판정 "가로 진행"(블라인드 하위 에이전트 + Claude 원문 대조, 기준 칸 섞기).
- 상태: 승인됨(설정별 상한 $1.5)

## 왜 하나

2026-10-08 공급자 비교([작업 기록](../../memory/checkpoints/2026-10-08-v5-provider-compare-gongsun.md))는 DeepSeek V4.1 Flash 9월 판을 썼다.
2026-10-17 DeepSeek이 사후 학습 갱신판(1017)을 같은 API 이름 `deepseek-flash`로 내놓았다. 10-07 실행 코드(v4 판정기 + v5 변환)는 커밋되지 않고
운영 v5 판정기로 덮어써져 재현할 수 없다(10-22 모의 실행: 현재 코드·`90484c2` 모두 `unexpected baseline instructions`). 그래서 지금 운영 v5
판정기로 다섯 설정을 같은 입력에 다시 돌려 모델 차이만 비교한다.

## 범위 밖

- 판정 지시문·운영 코드(`packages/`)·UI 변경. 이 시험은 관찰만 한다.
- 10-07 결과와 숫자 직접 비교(코드가 달라 참고로만 쓴다).
- 교정 질문 뒤 학생 후속 답(REPAIR). 최초 선택 판정과 종료 설명까지만 본다.
- 기존 실험 폴더(`docs/experiments/v5-provider-compare-gongsun-2026-10-07/`, `...-review-2026-10-08/`)와 `scripts/lib/provider-adapter.mjs` 수정 금지(읽기만).

## 입력 (고정)

- `docs/experiments/v5-provider-compare-gongsun-2026-10-07/FROZEN.json`의 `responses`(S1~S8, X1~X3), `choiceId`(C4, 정답), `schedule`(3반복·순서 회전),
  같은 폴더 `source.json`, `cases.json`. 실행기는 이 파일을 읽어 쓰고, `sourceHash`·`responsesHash`·`casesHash`가 옛 FROZEN 값과 같은지 단언한다.
- 판정기: `packages/pipeline/dist/index.js`의 현재 `OpenAIFeedbackEvaluator`(지시문 `source-direct-problem-feedback-v5.md`). 실행 전 `npm run build`.

## 설정 다섯 개

| 이름 | 공급자 | 모델 | 생각 수준 | 전송 |
|---|---|---|---|---|
| `deepseek-flash-low` | deepseek | `deepseek-flash`(1017) | low | `provider-adapter.mjs`의 `createProviderTransport`·`CONFIGS` 그대로 |
| `deepseek-flash-high` | deepseek | `deepseek-flash`(1017) | high | 같음 |
| `gemini-3.8-flash-medium` | gemini | `gemini-3.8-flash` | medium | 같음 |
| `gpt-6.1-sol-medium` | openai | `gpt-6.1-sol` | medium | OpenAI SDK `responses.create`(판정기 요청 그대로, `maxRetries: 0`) |
| `gpt-6-luna-medium` | openai | `gpt-6-luna` | medium | 같음 |

- 판정기 옵션: `{ model, transport, timeoutMs: 90000, maxRetries: 1 }`. OpenAI 설정은 `maxOutputTokens` 기본값(8000, 운영과 같음),
  DeepSeek·Gemini는 어댑터 `CONFIGS`의 `maxTokens`를 `maxOutputTokens`로도 넘긴다.
- 단가(100만 토큰당 달러): DeepSeek·Gemini는 어댑터 `PRICES`·`usageCosts` 그대로(DeepSeek 피크/비피크). sol 입력 2.00·출력 10.00,
  luna 0.10·0.50(`scripts/run-v5-live-check.mjs` `BASE_LIMITS`와 같음), OpenAI 캐시 입력은 입력 단가로 보수 계산.
- 상한(설정별, 예약 포함 보수 계산): 요청 100회, $1.5. 넘으면 `RUN_LIMIT`로 멈추고 이어 실행 가능해야 한다(옛 실행기의 START/END 장부 방식).

## 칸 흐름 (설정 × 33칸)

1. `createFeedbackSession(<설정>-<라벨>, source)` → `submitFeedbackCommand(SELECT C4, PROVIDED 근거)`, 관찰 `o1`.
2. `evaluate` → `applyFeedbackAssessment`. 걸린 시간 `selectionMs`.
3. 결과 단계가 `AWAITING_END_START`면 `submitFeedbackCommand({ type: 'END_START', accept: true }, 'o2')` → `evaluate`(END_EXPLANATION) →
   `applyFeedbackEndExplanation`. 걸린 시간 `endExplanationMs`(운영 서버가 미리 생성하는 호출과 같다). 그 외 단계면 여기서 끝.
4. 판정 실패(`FeedbackEvaluationError`)는 `EVALUATION_ERROR`로 기록하고 다음 칸으로 간다.

칸 결과 파일 `<설정>/<라벨>.json`: 설정, 유형, 반복, status, error, `selectionMs`, `endExplanationMs`, 요청 기록(START/END와 같은 내용),
원응답, `call.metadata.attempts`, 재시도 수, `actualModels`(응답의 model 값), 최종 assessment 원출력(`studentClaims` 포함, 판정기가 지우기 전 값),
after 요약(phase, result, pendingEnd, errors의 kind·description·studentEvidence·question, selectionComparison), `endExplanation`, 자동 검사, boundary.

## 자동 검사 (의미 검토를 대신하지 않음)

- 판정 필드 `reconstructability`·`rationaleImpliedVerdict`·`contentAssessment`를 `cases.json`의 `expected`와 비교(`contentAssessment`는 허용 목록 포함 여부).
- 경로: `contentAssessment`가 SUPPORTED면 단계가 `AWAITING_CORRECTION`이 아니어야 하고, ERROR면 `AWAITING_CORRECTION`이어야 한다.
  실제 phase·outcome·pendingEnd.endReason은 그대로 기록만 한다(현재 코드의 종료 상태 이름은 10-07과 다르므로 옛 `byContentAssessment`의 phase·outcome 비교는 하지 않는다).

## 설정별 요약 `<설정>/RESULTS.json`

완료 칸·계획 칸, 자동 검사 일치(경계/비경계, 유형별), 단계·종료 사유 분포, `selectionMs`·`endExplanationMs`·칸 합계의 중앙값·p90(옛 실행기 `quantile`),
요청 수, 재시도, 형식 오류 종류별, 판정 실패 수, 토큰(입력·출력·캐시·생각, 생각 미상 요청 수), 비용(보수·실제, DeepSeek 생각 별도 과금 가정값 포함),
`actualModels`. 그리고 실행기 `summary` 모드가 다섯 설정을 한 표로 묶은 `SUMMARY.json`·`SUMMARY.md`를 만든다.

## 실행기 `scripts/test-v5-provider-compare-1017.mjs` (새 파일)

- 모드: `prepare`(네트워크 없음) · `preflight <설정>` · `run <설정>` · `summary`.
- 출력 폴더: `docs/experiments/v5-provider-compare-1017-2026-10-22/`.
- `prepare`: 입력 해시 단언, `FROZEN.json`(입력 파일·실행기·어댑터·dist `feedback-v4*.js`·v5 지시문 해시, 설정, 단가, 상한, 일정) 저장.
  가짜 전송으로 다섯 설정의 첫 ASSESSMENT 요청을 뽑아 `instructions`·입력 내용·스키마가 설정 사이에서 같은지 자체 시험한다
  (DeepSeek·Gemini는 `toChatRequest` 변환 뒤 user 내용이 같은지). 외부 요청 0.
- `run`은 `FROZEN.json`이 지금 파일들과 같을 때만 돈다(다르면 멈춤). 완료 칸은 건너뛰어 이어 실행한다.
- `preflight`: 옛 실행기와 같은 2+3 JSON 요청 한 번(OpenAI 설정은 Responses API json_schema).
- API 키는 환경 변수(`OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`)만 읽는다.

## 검토 묶음 생성기 `scripts/build-v5-provider-compare-1017-review.mjs` (새 파일, 로컬 파일만)

- 입력: 실행 폴더, 기준 칸 목록 파일 `REVIEW-anchors.json`(Claude가 작성: 옛 10-07 실행 칸 경로 목록).
- 출력(실행 폴더 아래 `review/`): `REVIEW-blind-packet.json`(새 165칸 + 기준 칸을 고정 시드로 섞고 `B001`… 식별자만 붙임, 설정 이름·모델·폴더 경로·비용·시간 제거),
  `REVIEW-blind-key.json`(식별자 → 설정·라벨 또는 기준 칸 경로).
- 칸 내용: 학생 응답 유형·원문 응답, status, 판정 필드, reason, studentClaims, errors(설명·질문), assessment의 coaching, endExplanation(firstChoice·reselection·answer), 최종 단계.
  기준 칸은 옛 칸 파일에서 같은 필드를 뽑는다(없는 필드는 null).

## 모의 테스트 `scripts/test-v5-provider-compare-1017.test.mjs` (새 파일, `node --test`)

- 가짜 전송(설정별 고정 응답)으로: SUPPORTED → 종료 설명까지 가는 칸, ERROR → `AWAITING_CORRECTION` 칸, 판정 실패 칸, 상한 초과 멈춤과 이어 실행,
  `prepare` 자체 시험 실패(입력 해시 불일치) 경우를 확인한다. 네트워크 호출 0.
- 검토 묶음: 설정 이름·모델 문자열이 묶음에 없음, 키와 묶음 수가 같음, 시드가 같으면 순서가 같음.

## 완료 조건

- [ ] `npm run build` 통과, `node --test scripts/test-v5-provider-compare-1017.test.mjs` 통과.
- [ ] `node scripts/test-v5-provider-compare-1017.mjs prepare`가 외부 요청 0으로 끝나고 자체 시험 통과, `FROZEN.json` 생성.
- [ ] `packages/`·옛 실험 폴더·`provider-adapter.mjs` 변경 없음(`git diff --stat`으로 확인).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출(`preflight`·`run`)은 하지 않는다. Claude가 실행한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/test-v5-provider-compare-1017.mjs`(실행기), `scripts/build-v5-provider-compare-1017-review.mjs`(검토 묶음 생성기),
  `scripts/test-v5-provider-compare-1017.test.mjs`(모의 테스트), `docs/experiments/v5-provider-compare-1017-2026-10-22/FROZEN.json`(prepare 산출물).
  `packages/`·옛 실험 폴더·`provider-adapter.mjs`는 이 작업에서 건드리지 않았다(작업 트리에 이전부터 있던 `packages/` 변경은 그대로).
- 테스트 결과: `npm run build` 통과. `node --test scripts/test-v5-provider-compare-1017.test.mjs` 6개 통과(외부 호출 0).
  `prepare`: `{"prepared":true,"cellsPerConfig":33,"configs":5,"selfTests":"passed","externalRequests":0}`.
- 남은 문제:
  - 인계 문서 "모의 테스트"의 "SUPPORTED → 종료 설명까지 가는 칸"은 현재 코드와 맞지 않는다. 정답 선지(C4)를 고르고 SUPPORTED면 `finish`로 바로 `COMPLETED`이고 종료 설명이 없다.
    종료 설명은 INSUFFICIENT/UNKNOWN(`CORRECT_UNVERIFIED`)에서 생긴다. 테스트는 SUPPORTED → COMPLETED, INSUFFICIENT → 종료 설명, ERROR → `AWAITING_CORRECTION`으로 확인했다.
  - `FROZEN.json`의 `runnerHash`가 실행기 파일 해시라, 실행기를 고치면 `FROZEN.json`을 지우고 `prepare`를 다시 해야 한다.
  - dist 해시 대상을 `feedback-v4*.js`에 더해 `feedback-v5*.js`(claims·end-explanation)까지 넓혔다(판정기가 import하는 파일이라 안전 쪽).
  - 자동 검사 `path`는 contentAssessment가 SUPPORTED·ERROR가 아니면(INSUFFICIENT·UNKNOWN) 불일치로 기록한다(인계 문서에 규정 없음).
  - 형식 오류 종류는 새 판정기가 오류 접두사를 붙이지 않아, 원출력이 JSON이 아니면 JSON_PARSE, 메시지에 CLAIMS_CONTRACT: 가 있으면 그것, zod 오류면 OPERATING_SCHEMA로 분류한다.
  - OpenAI 설정에서 4xx(408·409·429 제외)는 어댑터와 같게 `RUN_LIMIT`로 멈춘다(인증 오류 시 낭비 방지).
  - `preflight`·`run`과 실제 OpenAI SDK 경로는 실행하지 않았다(모의 전송만 검증).
