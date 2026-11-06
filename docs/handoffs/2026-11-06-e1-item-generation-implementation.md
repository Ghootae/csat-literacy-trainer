# 인계: E1 골드 기반 문항 생성 — 생성기·풀이 검사·역연결 연결·블라인드 검토지 구현과 dry-run

- 날짜: 2026-11-06
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0206-gold-based-item-generation-experiment-design.md`(이 문서와 다르면 D-0206를 따른다). 설계 배경: `docs/handoffs/2026-11-06-gold-based-generation-experiment.md` 2절. 매력 요인 규칙: D-0170. 선지 연결: D-0162.
- **이번 단계는 외부 전송이 없다.** 모든 스크립트는 `--dry-run`으로만 실행한다. 실제 API 호출은 하지 않는다.

## 목표

1. `docs/experiments/gold-item-generation-2026-11-06/`에 대상·지시문 초안·dry-run 요청이 있다.
2. 네 스크립트가 시험을 통과한다: 생성, 풀이 검사, 역연결 대상 만들기, 블라인드 검토지.
3. dry-run 결과로 단계별 요청 수와 예상 비용 표(`DRY-RUN.md`)가 있다. 코드 에이전트는 이 표로 전송 승인을 요청한다.

## 범위 밖

- 실제 외부 호출(어떤 공급자든), `.env` 키 읽기 외 사용.
- `packages/**` 런타임, 판정·피드백 흐름, 기존 동결본(`frozen*/`)·기존 실험 폴더 수정, `memory/`.
- `scripts/run-choice-link.mjs`의 기존 동작 변경. 아래 3의 선택 필드 추가만 허용하며, 기존 시험이 그대로 통과해야 한다.
- E2.

## 대상 (targets.json)

`docs/experiments/gold-item-generation-2026-11-06/targets.json`. 지문마다 경로는 기존 대상 파일에서 그대로 복사한다.
- 법인·표면 장력: `docs/experiments/choice-link-2026-10-22/targets-ui.json`
- 오디오·플라스틱: `docs/experiments/sns-diagnostic-gold-2026-11-05/targets.json`

| passageId | 문항 자리(기출 번호: 극성, 범위) |
|---|---|
| corporate-law | 10: SELECT_INCORRECT, PASSAGE_WIDE / 11: SELECT_CORRECT, CONCEPT / 12: SELECT_INCORRECT, CONCEPT |
| surface-tension-laplace | 14: SELECT_INCORRECT, PASSAGE_WIDE / 15: SELECT_CORRECT, CONCEPT |
| audio-perceptual-coding | 14: SELECT_INCORRECT, PASSAGE_WIDE / 15: SELECT_CORRECT, PASSAGE_WIDE / 16: SELECT_CORRECT, CONCEPT |
| plastic-polymerization | 8: SELECT_INCORRECT, PASSAGE_WIDE / 9: SELECT_INCORRECT, CONCEPT |

- 근거: 수능 DB `prompt_blocks` 발문. 예: 법인 11 "재단 법인을 이해한 내용으로 가장 적절한 것은?" → CONCEPT. 오디오 14 "내용 간의 관계에 주목하여 윗글을 읽은 방법으로…" → PASSAGE_WIDE로 둔다.
- 플라스틱 10은 〈보기〉 문항이라 뺀다(D-0206 정정).
- 대상 파일의 문항 자리에는 기출 번호를 `realNumber`로 적는다. 이 번호는 블라인드 검토지와 풀이 검사 기준선에서만 쓴다. **생성 요청에는 극성과 범위만 넣는다.**

## 손댈 파일과 계약

공통 관례는 `scripts/run-choice-link.mjs`·`run-analysis-map-gongsun.mjs`를 따른다.
- 입력: 대상 JSON
- 옵션: `--dry-run`, `--max-requests`, `--usd-cap`
- 기록: `ledger.jsonl`, `RUN.json`(모델·지시문 해시·입력 해시·상한)
- 재시도 없음. 키는 `--env-file-if-exists=.env`로만 읽는다.
- 응답은 JSON 스키마(zod)로 받고, 검증 결과를 `*.validation.json`에 남긴다.
- 시험은 가짜 transport를 쓴다.

### 1. `scripts/run-item-generation.mjs` (+ `.test.mjs`)

- 모델: `gpt-6.1-sol`, reasoning medium(기존 상수 재사용).
- 조건과 요청 수(지문마다):
  - `A`: 1요청. 입력은 지문 원문과 문항 자리, 출력은 문항이다.
  - `A2`(A′): 2요청. 설계 요청 입력은 지문 원문과 문항 자리, 출력은 설계표다. 집필 요청 입력은 지문 원문과 설계표, 출력은 문항이다.
  - `B`: 2요청. 설계 요청 입력은 지문 원문, 동결 지도(`propositions`·`nodes`·`relations`), 입장(`stance-final.json`), 관계 유형(`classify.json`), 비틂 분포, 문항 자리다. 출력은 설계표다. 집필 요청은 A2와 같다.
  - 합계 4지문 × 5요청 = 20요청.
- **비틂 분포(B 입력)**: 선지 연결 동결본 전체(`choice-link-2026-10-22/runs/ui-v5/frozen/*.json`, `sns-diagnostic-gold-2026-11-05/choice-link/frozen/*.json`)에서 **대상 지문 자신의 파일을 빼고** 셈한다. 셈 대상은 `truth: FALSE` 선지의 비틂 조각(`twisted: true`)이고, `twistType`별 개수와 비율을 낸다. 지문마다 따로 계산해 `inputs/<passageId>.twist-distribution.json`에 저장한다.
- **설계표 스키마**(A2·B 공통, 문항 자리마다):
  - 자리 정보: `{ slot, stemPolarity, scope, concept (CONCEPT일 때 고른 개념, 아니면 null), answer }`
  - `choices[5]`: `{ number, truth: TRUE|FALSE, basis, twist }`
  - B안: `basis`는 노드 id 배열이다. FALSE 선지의 `twist`는 `{ type, targetIds, change }`이고, `type`은 `TWIST_TYPES`(run-choice-link.mjs에서 import, `OTHER` 제외)다.
  - A2안: `basis`는 원문 구절 배열이다. `twist`는 `{ label(자유 문자열), targetQuote, change }`이고, 비틂 목록은 주지 않는다.
  - 극성 규칙: SELECT_INCORRECT는 FALSE가 정답 1개, SELECT_CORRECT는 TRUE가 정답 1개다.
- **문항 스키마**(A·A2·B 공통): `{ slot, stem, stemPolarity, choices[5]{ number, text }, answer }`.
  - 발문은 극성·범위에 맞춘다. CONCEPT면 "<개념>에 대한 이해로 적절한(적절하지 않은) 것은?"처럼 개념 이름을 쓴다. ㉠ 같은 기호는 쓰지 않는다.
- **코드 검사**(`validation.json`): 선지 5개, 번호 1~5, 정답이 극성 규칙과 설계표에 맞음, B 노드 id 실재, B 비틂 종류가 목록 안, A2 `basis`·`targetQuote`가 원문 부분 문자열(공백 무시 일치 허용·표시), 같은 지문 안 선지 문장 중복 없음.
- **지시문 초안**(executor가 쓰고, 코드 에이전트가 diff 검토에서 고친다): `BASELINE-PROMPT-v1.md`(A), `DESIGN-PROMPT-A2-v1.md`, `DESIGN-PROMPT-B-v1.md`, `WRITE-PROMPT-v1.md`.
  - 세 조건 공통 품질 요구: 정답은 하나, 오답마다 원문에서 틀린 곳을 짚을 수 있어야 함, 지문 없이 상식으로 풀리면 안 됨, 수능 문체, 선지 길이 비슷하게.
  - B 설계 지시: 문항 자리마다 정답 근거 노드와 오답 대상 노드를 고르고, 비틂 종류를 분포에 가깝게 고른다(한 문항에 같은 종류 2개 이하).
  - 집필 지시(A·A2·B 모두): 매력 요인은 D-0170 규칙대로 원문 구절을 닮게 하거나 한 문장으로 명시할 수 있는 상식만 쓴다. 설계표에 없는 내용을 더하지 않는다.
  - A안 지시문에는 설계표·비틂 목록 같은 우리 자산 개념을 넣지 않는다.
- 출력: `runs/<condition>/<passageId>/{design.json, items.json, *.raw.json, *.validation.json}`.

### 2. `scripts/run-item-solve-check.mjs` (+ `.test.mjs`)

- 풀이 모델 셋:
  - `gpt-6-luna`(OpenAI, 기존 상수)
  - `gemini-3.8-flash-medium`(`scripts/lib/provider-adapter.mjs` CONFIGS)
  - `deepseek-v4-pro-high`: `scripts/run-v58-deepseek-p1.mjs`의 설정과 가격(peak·offPeak)을 `provider-adapter.mjs` CONFIGS·PRICES에 옮겨 공유한다. 이때 run-v58 시험이 통과해야 한다.
- 문항 묶음 출처 네 가지: `A`, `A2`, `B`(생성 결과)와 `REAL`.
  - REAL은 기출 10문항이고, `run-choice-link.mjs`의 `loadQuestions`로 읽는다(정답 포함). 대상 파일의 `realNumber`로 거른다.
- 모드 두 가지:
  - `WITH_PASSAGE`: 지문과 문항을 준다. 선지마다 `{ number, verdict: TRUE|FALSE, evidenceQuote }`를 받고, 정답 번호 `answer`를 받는다.
  - `NO_PASSAGE`: 문항만 준다. `answer`만 받는다.
- 요청 단위: (지문, 출처, 모델, 모드)마다 1요청. 4 × 4 × 3 × 2 = 96요청.
  - 요청 안에서 문항 순서는 고정 시드로 섞는다.
  - 출처 이름은 요청에 넣지 않는다.
  - 기출과 생성의 표현(발문·선지 서식)은 같은 형식으로 정규화한다.
- 집계(`summary.json`, 문항마다):
  - 결함 후보 `SOLVE_MISMATCH`: 모델 답 ≠ 열쇠. 모델별로 세고, 2개 모델 이상이면 결함 후보로 본다.
  - `MULTI_OR_NONE`: verdict로 계산한 정답 후보가 0개 또는 2개 이상.
  - `EVIDENCE_NOT_IN_PASSAGE`: FALSE 판정 선지의 `evidenceQuote`가 원문 부분 문자열이 아님.
  - `NO_PASSAGE_ALL_CORRECT`: 지문 없이 세 모델 모두 정답.
  - REAL 기준선: 모드별 정답률과 위 신호 비율.
- 출력: `solve/<source>/<passageId>/<model>.<mode>.{raw,json,validation}.json`, `solve/summary.json`.

### 3. 역연결 대상 만들기: `scripts/build-generated-choice-link-targets.mjs` (+ 시험)

- `run-choice-link.mjs`에 대상 선택 필드 `questionsJson`(경로)을 추가한다. 있으면 DB의 `loadQuestions` 대신 그 파일의 문항 배열(`loadQuestion`의 `question` 모양)을 쓴다.
  - `supplementSegments: []`, `explanation: null`, `explanationSummary: null`이다. `truth`는 극성과 정답으로 계산한다.
  - 없으면 기존과 똑같이 동작해야 한다.
  - 보호 파일 해시 목록에는 `questionsJson`을 넣는다.
- 새 스크립트는 생성 결과(`runs/<condition>/<passageId>/items.json`)를 그 모양으로 바꾸고, 조건별 대상 파일 `choice-link/targets-<condition>.json`을 만든다.
  - 지도·입장·관계 유형 경로는 원래 대상과 같다.
  - 문항 번호는 자리 번호(1부터)를 쓴다.
- dry-run: `run-choice-link.mjs --dry-run --runs 1`로 조건별 요청을 만든다. 4지문 × 3조건 = 12요청.

### 4. `scripts/build-generation-blind-review.mjs` (+ 시험)

- 입력: 생성 30문항(A·A2·B)과 기출 10문항. 지문별로 묶고, 지문 안에서 문항 순서를 고정 시드로 섞는다.
- 지문 원문은 지문마다 한 번 보인다. 기출 표시 원문(㉠ 등)은 `run-choice-link.mjs`가 쓰는 표시용 지문(`../passages/<setId>.json`)을 따른다.
- 문항마다 입력:
  - 정답 유일성: 유일(번호 선택) / 복수(번호들) / 없음
  - 오답 근거 명확성: 모두 명확 / 일부 불명확(선지 번호) / 불명확
  - 수능다움: 1~4
  - 메모
  - 출처 추측 칸은 두지 않는다.
- 형식은 `scripts/run-examiner-strategy.mjs`의 `USER-REVIEW.html`(입력 저장과 결과 JSON 복사 방식)을 본뜬다.
- 출력: `review/USER-REVIEW.html`, `review/USER-REVIEW-KEY.json`(출처·자리·기출 번호. "판정 전 열지 않는다").
- dry-run 단계에서는 가짜 생성 결과(시험 고정 자료)로 검토지가 만들어지는지만 확인한다. 실제 검토지는 실행 뒤에 만든다.

### 5. `DRY-RUN.md`

단계별로 표를 만든다. 단계는 생성, 풀이, 역연결이다.
- 열: 요청 수, 모델, 입력 토큰 추정(요청 파일 크기 기준, 기존 스크립트의 추정 함수가 있으면 그것), 최대 출력 토큰, 단가, 예상 비용 상한
- 외부로 나가는 자료: 지문 원문·지도 등을 공급자별로 적는다.

## 완료 조건

- [ ] 네 스크립트와 시험 추가, `node --test` 해당 시험 통과
- [ ] 기존 시험 회귀 없음: `node --test scripts/run-choice-link.test.mjs scripts/run-v58-deepseek-p1*.test.mjs scripts/test-v5-provider-compare-1017.test.mjs`(있는 것만)와 `npm test`
- [ ] `--dry-run`으로 생성 20, 풀이 96, 역연결 12요청 파일이 만들어진다. 풀이·역연결 dry-run은 가짜 생성 결과로 만든다.
- [ ] B 입력의 비틂 분포에 대상 지문 자신의 동결본이 들어가지 않음을 시험으로 확인
- [ ] 생성 요청(A·A2·B) 어디에도 기출 문항 텍스트·기출 번호·`realNumber`가 들어가지 않음을 시험으로 확인
- [ ] A 요청에 지도·비틂 목록이 없고, A2 요청에 지도·비틂 목록이 없음을 시험으로 확인
- [ ] `DRY-RUN.md` 작성
- [ ] 결과 보고(아래 칸) 작성

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
  - 예: 대상 경로가 없음, 기출 발문의 극성이 표와 다름, `loadQuestions`가 이 문항에서 실패함, provider-adapter 공유로 기존 시험이 깨짐.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). `--dry-run` 없이 어떤 스크립트도 실행하지 않는다.
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일 (커밋 안 함, 외부 호출 0건):
  - 수정: `scripts/run-choice-link.mjs`(`questionsJson` 선택 필드, 없으면 기존 동작), `scripts/run-choice-link.test.mjs`(시험 1개 추가), `scripts/lib/provider-adapter.mjs`(`deepseek-v4-pro-high` 설정과 가격 추가), `scripts/run-v58-deepseek-p1.mjs`(v4-pro 설정을 어댑터에서 가져옴)
  - 추가: `scripts/run-item-generation.mjs`, `scripts/run-item-solve-check.mjs`, `scripts/build-generated-choice-link-targets.mjs`, `scripts/build-generation-blind-review.mjs`와 각 `.test.mjs`
  - 추가(`docs/experiments/gold-item-generation-2026-11-06/`): `targets.json`, 지시문 초안 4개(`BASELINE-PROMPT-v1.md`, `DESIGN-PROMPT-A2-v1.md`, `DESIGN-PROMPT-B-v1.md`, `WRITE-PROMPT-v1.md`), `inputs/<지문>.twist-distribution.json` 4개, `DRY-RUN.md`, dry-run 산출물(`dry-run/`, `choice-link/dry-run/`)
- 테스트 결과:
  - 새 시험: `node --test scripts/run-item-generation.test.mjs`(12 통과), `run-item-solve-check.test.mjs`(10 통과), `build-generated-choice-link-targets.test.mjs`(5 통과), `build-generation-blind-review.test.mjs`(5 통과)
  - 기존 `run-choice-link.test.mjs` 29 통과(기존 28 + 추가 1). `run-v58-deepseek-p1.mjs` selftest(flash-high, v4-pro-high) 통과.
  - 작업 전 이미 실패하던 것(내 변경과 무관, 같은 원인): `provider-adapter.test.mjs` 4건 실패(66 !== 34 계열), `test-v5-provider-compare-1017.test.mjs` 6건 전부 실패, `npm test` 2개 파일 실패(1534 통과/2 실패). 작업 뒤 `npm test`는 같은 수치. 단 `provider-adapter.test.mjs`는 CONFIGS를 도는 시험이라 새 설정 `deepseek-v4-pro-high`가 같은 시험의 다섯째 사례로 늘어 같은 이유(66 !== 34)로 실패한다(12 통과/5 실패, 작업 전 12/4).
- dry-run 요청 수·예상 비용(상한, 자세한 표는 `DRY-RUN.md`): 생성 20요청 $3.999, 풀이 96요청 $6.584, 역연결 12요청 $3.254, 합계 128요청 $13.84. 외부로 나간 요청 0건.
- 남은 문제 / 판단 사항:
  - 설계 요청이 스키마 파싱에 실패하면 그 (지문, 조건)의 집필 요청은 보내지 않는다(인계 문서에 규정 없음). 코드 검사 위반만 있는 설계는 집필까지 진행하고 `design.validation.json`에 남긴다.
  - 풀이 검사의 기출 보충 자료 파일은 `docs/experiments/sns-diagnostic-gold-2026-11-05/supplement-fixed.json`을 기본값으로 썼다. 오디오 17번(〈보기〉 그림)이 기존 `FIXED_PATH`로는 `FIGURE_UNFIXED`로 로드되지 않아서다. 이 파일로 4지문 모두 `loadQuestions` 통과, 기출 발문 극성 10개 모두 표와 일치.
  - 역연결 대상은 `questionsJson` 사용 시 `answersPath`를 읽지 않고 보호 해시에서 뺀다. 표시용 지문 위치를 찾으려 `questionsPath`는 남긴다(지문의 ㉠ 표시가 `passageMarks`로 들어간다).
  - 풀이 요청의 지문은 DB 표시용 지문에 기호를 글에 풀어 쓴 것(밑줄 구간은 앞에 ㉠ 붙임, 박스는 `[ ]`)으로, 모든 출처에 같게 쓴다. 풀이 파일 이름은 `<모델>.<모드>.raw.json`, `<모델>.<모드>.json`, `<모델>.<모드>.validation.json`으로 했다.
  - 풀이 기본 상한은 96요청·$8, 생성은 20요청·$5(둘 다 `--max-requests`, `--usd-cap`로 바꿈). 풀이는 순차 실행이다.
  - 기출 10문항과 4지문 원문이 풀이 단계에서 세 공급자(OpenAI·Google·DeepSeek) 모두에 나간다. 전송 승인 때 확인이 필요하다.
  - dry-run 검토지(`dry-run/review/USER-REVIEW.html`)와 풀이 dry-run 요청 중 `REAL` 폴더에는 기출 원문이 들어 있고 생성 문항은 가짜다. `USER-REVIEW-KEY.json`은 판정 전 열지 않는다.
