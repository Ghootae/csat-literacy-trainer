# 인계: 출제자 전략 글 시험 생성 실행기 (법인 13번 ②, 3모델)

- 날짜: 2026-10-23
- 작성: 코드 에이전트
- 실행: 하위 에이전트(executor, sonnet)
- 관련 결정: `memory/decisions/D-0170-optional-examiner-strategy-feedback.md`, `memory/decisions/D-0169-actor-names.md`

## 목표

- `scripts/run-examiner-strategy.mjs`가 있다. 동결 선지 지도와 원문으로 출제자 전략 글 생성 요청을 만들고, 지정한 모델들로 보내고, 결과와 자동 검사를 저장한다.
- `--dry-run`이면 외부 전송 없이 요청 파일과 비용 예약만 만든다.
- 이번 작업에서 **외부 전송은 하지 않는다.** 하위 에이전트는 dry-run과 단위 테스트까지만 한다. 실제 전송은 코드 에이전트가 검토한 뒤 사용자 승인으로 한다.

## 범위 밖

- 지시문 내용 수정(`docs/experiments/examiner-strategy-2026-10-23/PROMPT-v1.md`의 `## 지시문` 절은 그대로 쓴다).
- 운영 코드(`packages/`), 화면, 다른 실험 폴더, `memory/`.
- `scripts/lib/provider-adapter.mjs`는 읽어서 쓰기만 한다. 고쳐야 하면 멈추고 보고한다.

## 손댈 파일과 계약

### `scripts/run-examiner-strategy.mjs` (새 파일)

실행: `node --env-file=.env scripts/run-examiner-strategy.mjs [--dry-run] --out <폴더> --targets <passageId:q:choice,...> --runs <N> --models <id,...>`

이번 시험 값: `--targets corporate-law:13:2 --runs 3 --models gpt-6.1-sol,gpt-6-luna,deepseek-flash-high --out docs/experiments/examiner-strategy-2026-10-23/trial-1`

1. **지시문**: `PROMPT-v1.md`에서 `## 지시문` 제목 다음 줄부터 파일 끝까지를 instructions로 쓴다(앞뒤 공백 제거). 파일 SHA-256을 `RUN.json`에 남긴다.
2. **입력 만들기**(target 하나당 JSON 하나):
   - 원문·문항: `docs/experiments/choice-link-end-explanation-compare-2026-10-23/run/sessions/*/LINK.request.json` 중 `request.input[0].content[0].text`를 JSON으로 읽은 `source`의 `questionId`가 `<passageId>-q<번호>`인 첫 파일을 쓴다. 거기서 `passage`, `stem`, `scenario`, `textAnnotations`, `choices`(position·text), `answerChoiceId`→정답 번호, `officialExplanation`을 가져온다. 맞는 파일이 없으면 멈추고 보고한다(다른 출처를 임의로 고르지 않는다).
   - 〈보기〉 조각: 동결본 `docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/<passageId>.json`의 해당 문항 `extraSegments`(id·quote)를 `question.supplementSegments`로 넣는다.
   - 선지 지도: 동결본의 해당 선지 `parts`를 다음으로 옮긴다. `choiceQuote`=`quote`, `twisted`. 맞는 조각은 `support`. 비튼 조각은 `how`=`twistDetail`, `evidenceQuote`, `changed`, `nearby`.
     `support`·`changed`·`nearby`는 각각 `supportIds`·`twistTargetIds`·`contextIds`를 **글로 바꾼 배열**이다. id → 글은 `scripts/run-end-explanation-choice-link-compare.mjs`의 `textOfId`(필요한 `ctx` 구성은 그 파일의 `prepareCases`·`choiceLinkOf` 참고)를 import해 재사용한다. 글을 찾지 못한 id는 빼고 `RUN.json`의 `missingIds`에 남긴다.
     `twistType`, 지도 id, `selection`, `runTypes`, `note`는 넣지 않는다.
   - 대상 선지의 `truth`가 `FALSE`가 아니면 멈추고 보고한다(D-0170 범위 밖).
   - 입력 JSON 최상위 키: `passage`, `question`(number, stem, scenario, supplementSegments, textAnnotations, choices, answer), `target`(choice, text, parts), `officialExplanation`.
3. **출력 스키마**(`PROMPT-v1.md`의 형식): `{ parts: [{ choiceQuote, twisted, evidenceQuotes: string[], lure: { basis: enum[SOURCE_ECHO, COMMON_SENSE, NONE], sourceQuote, commonSense } }], text }`. 모든 필드 required, `additionalProperties: false`, `text`는 `minLength: 1`.
4. **모델과 전송**
   - `gpt-6.1-sol`, `gpt-6-luna`: OpenAI Responses API(`openai` 패키지, `maxRetries: 0`), `store: false`, `reasoning: { effort: 'medium' }`, `max_output_tokens: 16000`, `text.format` json_schema strict. 단가(USD/1M): sol 입력 2·출력 10, luna 입력 0.10·출력 0.50(비교 실험 스크립트의 `RATES_BY_MODEL`과 같음).
   - `deepseek-flash-high`: `provider-adapter.mjs`의 `CONFIGS['deepseek-flash-high']`와 `createProviderTransport`, 비용은 `usageCosts`(보수 값 `conservativeUsd`로 상한 계산).
   - 시간 제한: 요청당 300초.
   - 재시도: 요청당 최대 1회. 일시 오류(429·5xx·시간 초과)와 출력 JSON 파싱·스키마 실패만 재시도한다. 오류 메시지가 `RUN_LIMIT`로 시작하면 재시도하지 않고 전체 실행을 멈춘다.
5. **상한**: 전체 요청 18회(재시도 포함), 비용 $1.00. 보내기 전 예약액(요청 바이트×입력 단가 + max 출력×출력 단가, DeepSeek은 보수 단가)을 더해 상한을 넘으면 보내지 않고 멈춘다. 응답 뒤 실제 비용으로 정산한다. 상한 검사 함수는 export해 테스트한다.
6. **자동 검사**(응답마다 `checks`):
   - `partsMatch`: 출력 `parts`의 `choiceQuote` 순서·글이 입력과 같다.
   - `quotesFound`: 각 `evidenceQuotes`와 `SOURCE_ECHO`의 `sourceQuote`가 원문(passage) 또는 〈보기〉(scenario) 의 정확한 부분 문자열인지. 못 찾은 구절 목록.
   - `lureFields`: `SOURCE_ECHO`면 `sourceQuote` 비어 있지 않음, `COMMON_SENSE`면 `commonSense` 비어 있지 않음, `NONE`이면 둘 다 빈 문자열. 맞는 조각(`twisted:false`)은 `NONE`.
   - `forbiddenTerms`: `text`에 비틂 종류 영문 코드(동결본에 쓰인 14종+OTHER), 지도 id 패턴(`/\b(?:[PCGRXS]\d+(?:-\d+)?[a-z]?|TOP)\b/u`), '골드', '조각'이 있으면 목록.
   - `honorific`: `text`에 '요.'·'니다'로 끝나는 문장이 있으면 그 문장 목록(반말 규칙 확인용).
   검사는 기록만 하고 생성을 막지 않는다.
7. **저장**(`--out` 아래):
   - `RUN.json`: 명령 인자, 시작·끝 시각(UTC), 지시문 해시, 모델 설정, 상한, 요청 수, 비용 합계(모델별), `missingIds`.
   - `requests/<target>__<model>__r<n>.json`(요청 본문, 키 없음), `responses/…json`(원응답 또는 오류), `outputs/…json`(파싱 출력 + checks + usage + 비용).
   - `ledger.jsonl`: 요청마다 한 줄(시각, target, model, run, attempt, 상태, 비용).
   - `REVIEW.html`: 사용자가 브라우저로 여는 로컬 파일. target마다 원문 선지, 동결 지도 표, 그리고 모델×회차 글을 **모델 이름을 가린 채** 무작위 순서(고정 시드 20261023)로 나란히 보여 준다. 글은 마크다운(문단·굵게·목록)을 HTML로 바꿔 보이고, 각 글 아래에 checks 요약을 접어 둔다. 가림 키는 `KEY.json`에 따로 저장한다.
8. `--dry-run`: 요청 파일과 `RUN.json`(예약 비용 합계 포함)만 만들고 전송 함수는 부르지 않는다.

### `scripts/run-examiner-strategy.test.mjs` (새 파일)

`node --test`로 돈다. 최소한 다음을 확인한다.

- 지시문 추출이 `## 지시문` 다음부터 시작한다.
- 법인 13번 ② 입력이 4조각, 비튼 조각 3개이고, 입력 JSON에 `twistType` 값·`P1-7` 같은 지도 id가 없다.
- 상한 검사: 18회째 다음 요청과 $1.00을 넘는 예약을 막는다.
- 자동 검사 각 항목의 통과·실패 예(가짜 출력으로).
- 재시도 규칙: `RUN_LIMIT`는 재시도하지 않고, 파싱 실패는 1회 재시도한다(가짜 전송으로).

## 완료 조건

- [ ] `node --test scripts/run-examiner-strategy.test.mjs` 통과.
- [ ] `node --env-file=.env scripts/run-examiner-strategy.mjs --dry-run --targets corporate-law:13:2 --runs 3 --models gpt-6.1-sol,gpt-6-luna,deepseek-flash-high --out docs/experiments/examiner-strategy-2026-10-23/dry-run` 이 요청 9개와 `RUN.json`을 만들고, 예약 비용 합계를 출력한다.
- [ ] 외부 전송 0회.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 파일 삭제(`rm` 등)는 하지 않는다.
- `.env`의 키 값을 출력하거나 파일에 쓰지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/run-examiner-strategy.mjs` (새 파일)
  - `scripts/run-examiner-strategy.test.mjs` (새 파일)
  - dry-run 산출물 `docs/experiments/examiner-strategy-2026-10-23/dry-run/` (요청 9개, `RUN.json`)
  - 이 문서의 결과 보고 절
- 테스트 결과: `node --test scripts/run-examiner-strategy.test.mjs` 17개 통과, 0개 실패. 실제 전송 0회(가짜 전송만 사용).
- dry-run: 요청 9개와 `RUN.json` 생성, 외부 전송 0회. 예약 비용 합계 $0.7448 (sol $0.5846, luna $0.0292, deepseek $0.1309). 상한 $1.00 이하, 요청 수 9 <= 18. 입력 만들기에서 못 찾은 id(`missingIds`) 없음.
- 남은 문제(설계 공백이거나 확인 필요, 임의로 정한 곳):
  1. `source.passage`가 문단별 배열이 아니라 한 덩어리 문자열이다(줄바꿈은 포함). PROMPT-v1의 "문단별 원문(section)" 설명과 다르다. 인계 문서대로 `passage`를 그대로 넣었다.
  2. 동결본 조각의 `choiceQuote`는 맞는 조각에서 빈 문자열이라, 인계 문서대로 `quote`를 `choiceQuote`로 옮겼다. 비튼 조각은 `quote`가 `choiceQuote`와 끝 마침표 정도만 다르다(예: '법인격이 부여되었기 때문이겠군.').
  3. 인계 문서가 정하지 않은 부분: 재시도 대상이 아닌 오류(RUN_LIMIT가 아닌 OpenAI 4xx 등)는 그 요청만 실패로 기록하고 다음 요청으로 넘어간다. 실패한 시도(응답 없음)는 예약액 전부를 지출로 계산한다. 응답 파일은 시도별 배열로 저장한다.
  4. OpenAI strict 스키마의 `text.minLength: 1`은 외부 호출 없이는 서버가 받는지 확인할 수 없다. 첫 전송에서 400이면 이 키가 원인일 수 있다.
  5. DeepSeek 요청 파일의 `model`은 `deepseek-flash`(어댑터 설정 값)이고, 파일 이름·ledger의 모델은 `deepseek-flash-high`다. DeepSeek 요청은 Responses 형식 본문을 어댑터가 chat 형식으로 바꿔 보낸다.
  6. REVIEW.html의 `KEY.json`은 `--out` 폴더에 함께 저장된다(판정 전에 열지 않는다는 메모 포함).
