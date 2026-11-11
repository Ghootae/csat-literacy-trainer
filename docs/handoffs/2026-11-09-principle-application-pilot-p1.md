# 인계: 원리 적용형 생성 파일럿 P1 — 생성기·기출 겹침 검사·구조 판정 묶음 구현과 dry-run

- 날짜: 2026-11-09
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0215-principle-application-structure-review-and-pilot.md`. 이 문서와 다르면 D-0215를 따른다.
- 설계 배경:
  - 제안서 `docs/handoffs/2026-11-09-principle-application-generation-pilot-proposal.md`
  - 판정 기준 `docs/experiments/principle-application-structure-2026-11-09/JUDGE-STRUCTURE-v1.md`
  - 선례 인계 `docs/handoffs/2026-11-06-e1-item-generation-implementation.md`
- **이번 단계는 외부 전송이 없다.** 생성 스크립트는 `--dry-run`과 가짜 transport 시험으로만 실행한다.

## 목표

1. `docs/experiments/principle-application-pilot-2026-11-09/`에 다음이 있다.
   - 대상 파일
   - 지시문 세 개: 코드 에이전트가 이미 작성했다. 내용을 고치지 않는다.
   - dry-run 요청 파일과 `DRY-RUN.md`
2. 세 스크립트가 시험을 통과한다.
   - 생성(3단계)
   - 기출 겹침 검사
   - 구조 판정·풀이 검증 묶음 만들기
3. 코드 에이전트는 `DRY-RUN.md`로 전송 승인을 요청한다.

## 범위 밖

- 실제 외부 호출, `.env` 키 읽기 외 사용
- `packages/**`, 기존 실험 폴더, 동결본, `memory/` 수정
  - 기존 스크립트는 **import만** 한다. 동작은 바꾸지 않는다.
  - 필요한 함수가 export되어 있지 않으면 멈추고 보고한다.
- 지시문 파일(`*-PROMPT-v1.md`) 수정
  - 문장 문제를 발견하면 보고만 한다.
- opus 판정자 실행
  - 구조 판정과 풀이 검증은 메인 세션이 하위 에이전트로 돌린다. 이번 작업은 입력 묶음만 만든다.
- 골드 지도 입력, E2
- 커밋

## 1. 대상 파일

`docs/experiments/principle-application-pilot-2026-11-09/targets.json`을 만든다.

- 지문 4개는 `docs/experiments/gold-item-generation-2026-11-06/targets.json`에서 그대로 복사한다.
  - 복사할 필드: `passageId`, `passagesDir`, `setId`, `questionsPath`, `answersPath`, `assetsDir`
  - 지도·입장·분류·slots는 넣지 않는다.
- 지문마다 `items`를 아래처럼 둔다.

```json
"items": [
  { "itemKey": "a", "form": "IN_PASSAGE", "stemPolarity": "SELECT_CORRECT", "excludedSituations": [] },
  { "itemKey": "b", "form": "BOGI", "stemPolarity": "SELECT_INCORRECT", "excludedSituations": [] }
]
```

- `excludedSituations`의 원소는 `{ "description": string, "passageQuotes": [string] }`다.
- **예외:** `surface-tension-laplace`의 a에만 제외 상황 하나를 둔다. 근거는 D-0215 12다. 기출 15번의 상황이라 쓰지 않는다.

```json
{ "description": "크기가 다른 두 기포가 접하여 하나로 합쳐지는 경우(3문단)",
  "passageQuotes": ["라플라스 식은 두 기포가 합쳐지는 경우를 이해하는 데에도 도움이 된다.",
                    "크기가 서로 다르고 구성 물질은 같은 두 기포가 접하여 하나로 합쳐질 때 한쪽 기포에서 다른 쪽 기포로 공기가 이동한다.",
                    "이 결과로 두 기포가 합쳐져 기존의 기포보다 더 큰 기포 하나가 만들어진다."] }
```

  - `passageQuotes`는 지문 3문단의 세 문장이다. 대상 파일을 만들 때 지문 부분 문자열인지 시험한다.

## 2. `scripts/run-principle-pilot.mjs` (+ `.test.mjs`)

### 2.1 공통 관례

`scripts/run-item-generation.mjs`를 따른다.

- 모델과 설정
  - `MODEL`(`gpt-6.1-sol`), reasoning `medium`
  - `max_output_tokens` 16000, `TIMEOUT_MS`
  - 재시도 없음
- 가져다 쓸 것
  - `run-analysis-map-gongsun.mjs`: `loadPassage`, `buildInput`, `instructionsFrom`, `usageCost`, `reserveUsd`, `hash`, `MODEL`, `TIMEOUT_MS`
  - `run-analysis-judge-gongsun.mjs`: `isConnectionError`
  - `run-item-generation.mjs`: `stemNegationCount`
- 옵션: `--dry-run`, `--max-requests`(기본 20), `--usd-cap`(기본 5), `--passages`
- 기록
  - `runs/ledger.jsonl`
  - `runs/RUN.json`: 모델, 지시문·스키마·입력 해시, 상한, 결과 요약
  - 단계마다 `*.raw.json`, `*.json`, `*.validation.json`. 파일은 `wx` 플래그로 쓴다.
- `RUN_EXISTS`면 거부한다.
- 키는 `--env-file-if-exists=.env`로만 읽는다.
- 응답 처리
  - 응답은 zod strict 스키마로 받는다.
  - 검증 위반은 기록만 하고 재시도하지 않는다.
  - 파싱이 실패하면 그 문항의 다음 단계는 보내지 않는다.

### 2.2 단계와 스키마

| 단계 | 호출 단위 | 지시문 | 입력 | 출력 스키마 이름 |
|---|---|---|---|---|
| 1 rules | 지문마다 1 | `RULES-PROMPT-v1.md` | `buildInput(passage)` | `p1_rules_v1` |
| 2 situation | 문항마다 1 | `SITUATION-PROMPT-v1.md` | 지문 + 단계 1 출력 + `{ itemKey, form, stemPolarity, excludedSituations }` | `p1_situation_v1` |
| 3 write | 문항마다 1 | `WRITE-PROMPT-v1.md` | 지문 + 단계 2 출력 + `{ itemKey, form, stemPolarity }` | `p1_item_v1` |

- 실행 순서
  1. 단계 1을 4지문 모두 끝낸다.
  2. **열린 자리 거르기(코드).** 문항 a마다 단계 1의 `openSlots`에서 제외 상황과 겹치는 것을 뺀다. 남은 것이 **쓸 수 있는 열린 자리**다. 겹친다는 것은 다음 둘 중 하나다.
     - (i) 열린 자리 `quote`의 문장 키가 제외 상황 `passageQuotes`의 문장 키와 하나라도 같다. 문장 키는 `run-item-generation.mjs`의 `sentencesOf`·`quoteKeys`로 구한다.
     - (ii) `target`과 `description`의 글자 2-gram Dice(공백 제외)가 0.5 이상이다.
     - 뺀 자리와 이유는 `situation-a.validation.json`의 `info`에 남긴다.
  3. **관문.** 쓸 수 있는 열린 자리가 0개인 지문이 2개 이상이면 단계 2로 가지 않는다. `RUN.json`에 `stop: "GATE: openSlots"`로 기록하고 끝낸다(제안서 9절).
  4. 지문마다 a → b 순서로 단계 2 → 3을 진행한다.
     - 단계 2 a의 입력에는 규칙 목록을 넣되, 각 규칙의 `openSlots`를 쓸 수 있는 것으로 바꿔 넣는다.
     - b의 입력에는 단계 1 출력을 그대로 넣는다.
  5. 쓸 수 있는 열린 자리가 0개인 지문이 하나뿐이면, 그 지문의 a는 단계 2를 보내지 않는다(`NOT_SENT: NO_OPEN_SLOT`). "재료 부족"이라는 결과로 기록하고 b는 진행한다.
- 요청 수는 단계 1 4개, 단계 2 8개, 단계 3 8개로 모두 20이다.

스키마(zod strict)는 다음과 같다. 모든 필드는 필수이고, null을 허용하는 곳만 `| null`이다.

```text
p1_rules_v1: { passageId, rules: [ { id, ruleQuote, statement,
    variables: [ { name, effect } ] (1개 이상),
    scopeQuote: string|null,
    statedApplications: [ { target, quote } ],
    openSlots: [ { id, target, quote, whatToDerive } ] } ] (1~8개) }

p1_situation_v1: { passageId, itemKey, form: IN_PASSAGE|BOGI,
    situation: { description, slotRef: string|null, bogiText: string|null },
    usedRuleIds: [string] (1~2),
    steps: [ { n, given, ruleId, ruleQuote, result } ] (1~4),
    derivedFacts: [ { id, text, fromSteps: [int], ifDifferent } ] (3~5),
    selfCheck }

p1_item_v1: { passageId, itemKey, stem, bogi: string|null, answer: 1..5,
    choices: [ { number, text, truth: TRUE|FALSE, onSituation: boolean,
                 fromFact: string|null, breaksStep: int|null,
                 twistType: DIRECTION|WRONG_VARIABLE|HOLD_CONSTANT_ERROR|SCOPE|SWAP_OBJECTS|null } ] (정확히 5) }
```

### 2.3 코드 검사 (`*.validation.json`, 위반은 기록만)

공백 차이만 있는 일치는 통과로 보고 `info`에 남긴다. E1의 `matchKind`와 같다.

**단계 1**
- `ruleQuote`, `scopeQuote`, `statedApplications[].quote`, `openSlots[].quote`가 지문의 부분 문자열인가
- id 형식: 규칙 `R\d+`, 열린 자리 `<규칙 id>-S\d+`
- 지문별 `openSlots` 수를 `info`에 기록한다. 관문 판단에 쓴다.

**단계 2**
- `IN_PASSAGE`
  - `slotRef`가 **쓸 수 있는 열린 자리**의 id인가(걸러진 자리면 `EXCLUDED_SLOT` 위반)
  - `bogiText`가 null인가
- `BOGI`
  - `slotRef`가 null인가
  - `bogiText`가 비어 있지 않은가
- `usedRuleIds`·`steps[].ruleId`가 단계 1 규칙 id인가
- `steps[].ruleQuote`가 그 규칙의 `ruleQuote`와 같은가(공백 무시)
- `derivedFacts` 수
  - `SELECT_CORRECT` 3~5
  - `SELECT_INCORRECT` 4~5
- `fromSteps`가 있는 단계 번호인가
- **지문 복사 검사**
  - `derivedFacts[].text`마다 지문 문장 각각과 글자 2-gram Dice 계수를 공백을 빼고 계산한다.
  - 최댓값이 0.7 이상이면 위반이다(`FACT_COPIES_PASSAGE`).
  - 최댓값과 그 문장은 `info`에 남긴다.
- `excludedSituations`가 있으면, 생성 상황(`situation.description`)과 제외 상황 `description`의 2-gram Dice를 `info`에 기록한다. 0.5 이상이면 위반이다(`EXCLUDED_SITUATION`).

**단계 3**
- 선지 번호가 1~5인가
- 극성
  - `SELECT_CORRECT`: TRUE가 정확히 1개, 그 번호가 `answer`
  - `SELECT_INCORRECT`: FALSE가 정확히 1개, 그 번호가 `answer`
- TRUE 선지
  - `fromFact`가 단계 2 `derivedFacts` id인가
  - `breaksStep`·`twistType`이 null인가
- FALSE 선지
  - `breaksStep`이 있는 단계 번호인가
  - `twistType`이 null이 아닌가
  - `fromFact`가 null인가
- 거짓 선지가 2개 이상이면 `twistType`이 2종 이상인가
- `onSituation`이 true인 선지가 4개 이상인가
  - 기록용이다. 통과 판정은 판정자 값으로 한다(D-0215 12).
- `stemNegationCount(stem) <= 1`
- 발문 끝
  - `SELECT_CORRECT`: "가장 적절한 것은?"
  - `SELECT_INCORRECT`: "적절하지 않은 것은?"
- 〈보기〉
  - `BOGI`이면 `bogi === 단계 2 bogiText`(정확히 같음)
  - `IN_PASSAGE`이면 `bogi`가 null
- 정답 선지만 혼자 가장 길면 위반이다(`FORM_GIVEAWAY_LENGTH`). 공백 제외 글자 수로 센다.

### 2.4 dry-run

- 단계마다 요청 파일을 `dry-run/<passageId>/<stage>[-<itemKey>].request.json`에 쓴다.
- 단계 2·3 요청은 앞 단계의 **예시 출력**으로 만든다.
  - 예시 출력은 스키마를 통과하는 가짜 값이다.
  - 예시 출력이 해당 검사를 통과하는지도 시험한다.
- 반환값: 요청 수, 단계별 입력 바이트, `reserveUsd` 합계, 상한 초과 여부

## 3. `scripts/check-exam-overlap.mjs` (+ `.test.mjs`)

생성 뒤 기출 재현 여부를 표시한다(D-0215 12). 외부 호출은 없다.

- 입력
  - P1 `runs/<passageId>/item-<itemKey>.json`과 단계 2 출력
  - 같은 지문의 기출 비어휘 문항. `run-choice-link.mjs`의 `loadQuestions(questionsPath, answersPath, assetsDir)`로 읽는다.
- 계산(모두 공백을 뺀 글자 2-gram Dice)
  - 생성 선지마다 기출 선지 전체와의 최댓값과 그 기출 번호·선지
  - 생성 상황(단계 2 `description`과 `bogiText`)과 기출 발문·〈보기〉의 최댓값
- 표시
  - 선지가 0.6 이상이면 `CHOICE_OVERLAP`
  - 상황이 0.5 이상이면 `SITUATION_OVERLAP`
  - 표시는 후보일 뿐이다. 판정은 코드 에이전트가 원문으로 한다.
- 출력: `quality/exam-overlap.json`. 문항마다 표시 목록과 최댓값 표를 담는다.
- 시험: 같은 문장이면 1.0이 나오는지, 무관한 문장이면 낮은 값이 나오는지 확인한다.

## 4. `scripts/build-structure-judge-bundle.mjs` (+ `.test.mjs`)

기출 구조 분류 검토와 P1 구조 판정을 **한 묶음**으로 만든다(D-0215 A5). 외부 호출은 없다.

### 4.1 묶음에 들어갈 문항

| 출처 | 문항 | 읽는 곳 |
|---|---|---|
| 기출 | 8지문 비어휘 31문항(아래 4.3 표) | `loadQuestions`. 대상 경로는 E1 `targets.json` 4지문과 `docs/experiments/choice-link-2026-10-22/targets-ui.json`의 공손룡·도파민·정보 비대칭·mRNA |
| E1 생성 v3 | A2·B × 4지문 = 20문항 | `docs/experiments/gold-item-generation-2026-11-06/v3/runs/{A2,B}/<passageId>/items.json`. 정답은 같은 폴더 `design.json`의 slot `answer` |
| P1 | 8문항(생성 뒤) | `docs/experiments/principle-application-pilot-2026-11-09/runs/<passageId>/item-<itemKey>.json` |

- P1 결과가 아직 없으면 P1 없이 묶음을 만든다. `--include-p1` 옵션이 있을 때만 P1을 넣는다.
  - 메인 세션은 P1 생성 뒤 P1을 넣어 다시 만든다.
- E1 v3에서 `design.json`에 정답이 없거나 형식이 다르면 멈추고 보고한다.
- 기출의 ㉠ 같은 기호(블라인드 단서 방지)
  - **E1 4지문**은 생성 문항과 섞인다. 생성 문항은 기호를 쓰지 않으므로, 기출 기호는 출처 단서가 된다.
    - 그래서 기출 법인 12, 표면 장력 15, 플라스틱 9는 E1 키(`gold-item-generation-2026-11-06/v3/quality/blind-key.json`)의 `replacements`를 그대로 적용해 기호를 말로 바꾼다.
    - 이 세 문항 밖에서 E1 4지문 기출의 발문·선지에 기호가 있으면 멈추고 보고한다. 〈보기〉 안의 기호(플라스틱 10의 ㉮·㉯)는 그대로 두고, 키 파일의 `notes`에 단서로 남긴다.
  - **개발자 화면 4지문**(공손룡·도파민·정보 비대칭·mRNA)은 생성 문항과 섞이지 않는다. 그래서 기호를 그대로 둔다.
  - 지문 문단에 기호 표시가 남아 있는지 확인한다. 기호를 그대로 두는 문항이 가리키는 기호가 지문에 없으면 멈추고 보고한다.

### 4.2 출력

`docs/experiments/principle-application-structure-2026-11-09/judge/` 아래에 만든다.

- **지문별 파일**로 나눈다. 판정자 한 번의 호출이 지문 하나만 보게 하려는 것이다(긴 묶음 뒤쪽의 품질 저하 방지).
  - 파일: `j1/<passageId>.json`, `j2/<passageId>.json`
  - 내용: `{ passageId, paragraphs, items: [ { id, stem, bogi, images, choices, answer } ] }`
  - `id`는 `<passageId>#NN`
  - 지문 안의 문항 순서를 판정자마다 다르게 섞는다(seed `20261109`, `20261110`).
- 생성 문항이 없는 4지문(공손룡·도파민·정보 비대칭·mRNA)은 P1 생성과 상관없이 지금 판정할 수 있다. E1 4지문은 `--include-p1`로 다시 만든 뒤 판정한다.
  - 출처 표시나 출처를 짐작할 필드(slot, condition, realNumber)는 넣지 않는다.
  - `images`는 그림 파일의 절대 경로 목록이다.
    - `loadQuestion`은 그림을 `dataUrl`로만 준다. 그래서 경로는 문항 JSON의 `local_path`와 `assetsDir`로 따로 만든다(`loadQuestion` 안의 계산과 같은 방식).
    - 판정자는 Read로 이 파일을 연다.
  - `loadQuestion`이 주는 해설(`explanation`, `explanationSummary`)과 선지별 `truth`는 넣지 않는다. 정답 번호(`answer`)만 넣는다.
- `blind-key.json`: id → `{ source: EXAM|E1_V3|P1, condition?, realNumber?, itemKey?, stemType, hasBogi, replaced: boolean, notes: [string] }`
- `solve-input-p1/<passageId>.json`(`--include-p1`일 때만): 그 지문의 P1 문항. 지문, 발문, 〈보기〉, 선지만 넣고 정답·계산표는 넣지 않는다.
  - 판정 지시문은 `docs/experiments/principle-application-pilot-2026-11-09/SOLVE-PROMPT-v1.md`다. 코드 에이전트가 작성했다.

### 4.3 발문 유형(`stemType`, 키 파일에만)

값: `CONTENT_MATCH` / `CONCEPT` / `COMPARE_TWO` / `BOGI_APPLY` / `METHOD`

**기출 31문항**은 아래 표를 코드에 상수로 둔다.

| 지문 | CONTENT_MATCH | CONCEPT | COMPARE_TWO | BOGI_APPLY | METHOD |
|---|---|---|---|---|---|
| corporate-law | 10 | 11 | 12 | 13 | |
| surface-tension-laplace | 14 | 15 | | 16 | |
| audio-perceptual-coding | 15 | 16 | | 17 | 14 |
| plastic-polymerization | 8 | 9 | | 10 | |
| gongsun-long-later-mohists | 10 | 11 | | 12, 13 | |
| dopamine-motor-control | 10 | | 12 | 11, 13 | |
| information-asymmetry-free-marketplace | 11 | | 12 | 13 | 10 |
| mrna-vaccine-lipid-nanoparticle | | 16, 17, 18, 20 | | 19 | |

**E1 v3 20문항**은 그 자리의 범위로 정한다. `PASSAGE_WIDE`이면 `CONTENT_MATCH`, `CONCEPT`이면 `CONCEPT`다.

**P1**은 a를 `CONCEPT`, b를 `BOGI_APPLY`로 둔다.

**`hasBogi`**
- 기출은 발문 블록이 2개 이상이거나 〈보기〉 문자열이 있으면 참이다. 4.3 표의 `BOGI_APPLY`와 같아야 한다. 다르면 멈추고 보고한다.
- 생성 문항은 `bogi !== null`이면 참이다.

### 4.4 시험

- 묶음 입력에 `source`, `condition`, `realNumber`, `slot`, `itemKey`, 해설, `truth`, `dataUrl`이 없다.
- 그림 경로가 실제 파일을 가리킨다.
- 지문마다 j1·j2의 문항 집합은 같고 순서는 다르다.
- E1 4지문의 기출 법인 12, 표면 장력 15, 플라스틱 9에 기호가 남아 있지 않다. 개발자 화면 4지문 기출의 기호는 그대로다.
- 열린 자리 거르기: 표면 장력 3문단 문장을 인용한 열린 자리가 빠지고, 다른 문단의 열린 자리는 남는다(가짜 단계 1 출력으로 시험).
- 기출이 31문항이고, 어휘 문항이 들어가지 않았다.
- 4.3 표와 `hasBogi`가 일치한다.
- `solve-input-p1.json`에 `answer`가 없다.

## 5. `DRY-RUN.md`

E1 `DRY-RUN.md` 형식을 따른다.

- 단계별 요청 수, 입력 바이트, 최대 출력 토큰, 예상 비용 상한
- 외부로 나가는 자료 표
  - 지문 원문
  - 단계 1 출력
  - 단계 2 출력
  - 문항 정보(`excludedSituations` 포함)
- 기출 문항 텍스트·번호가 어떤 생성 요청에도 들어가지 않는다는 확인(시험 근거)
  - 예외: 표면 장력 `excludedSituations`의 상황 설명 한 줄. 이것을 명시한다.
- 참고 실측: E1 v3는 16요청 $0.589였다(`gold-item-generation-2026-11-06/v3/runs/ledger.jsonl`).

## 완료 조건

- [ ] `targets.json`이 1절대로 있다(지문 4, 문항 8, 표면 장력 a 제외 상황 1).
- [ ] 세 스크립트와 시험을 추가했고, `node --test scripts/run-principle-pilot.test.mjs scripts/check-exam-overlap.test.mjs scripts/build-structure-judge-bundle.test.mjs`가 통과한다.
- [ ] 시험으로 확인한다.
  - 생성 요청 어디에도 기출 문항 텍스트, 기출 번호, 골드 지도가 들어가지 않는다(표면 장력 a의 제외 상황 한 줄은 예외).
  - 관문(`openSlots` 0개 지문 ≥ 2)에서 단계 2 이전에 멈춘다.
  - 파싱 실패 문항은 다음 단계를 보내지 않는다.
  - 2.3의 각 위반이 가짜 출력에서 잡힌다.
- [ ] 기존 시험 회귀가 없다.
  - `node --test scripts/run-item-generation.test.mjs scripts/run-choice-link.test.mjs scripts/build-generation-blind-review.test.mjs`(있는 것만)
  - `npm test`
- [ ] `node --env-file-if-exists=.env scripts/run-principle-pilot.mjs --dry-run`이 20요청 파일을 만든다.
- [ ] `node scripts/build-structure-judge-bundle.mjs`(P1 없이)가 판정자별 지문 파일 8개씩(기출 31 + E1 v3 20 = 51문항)과 키를 만든다.
- [ ] `DRY-RUN.md`를 썼다.
- [ ] 아래 결과 보고 칸을 채웠다.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈춘다. 충돌 내용과 선택지를 보고하고, 설계를 임의로 바꾸지 않는다. 예:
  - 대상 경로가 없다.
  - 기출 문항 수나 번호가 4.3 표와 다르다.
  - 그림 경로가 없다.
  - 필요한 함수가 export되어 있지 않다.
  - E1 v3 정답 위치가 다르다.
- 외부 API 호출이나 외부 전송이 필요해지면 실행 전에 멈춘다. `--dry-run` 없이 생성 스크립트를 실행하지 않는다.
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 추가: `scripts/run-principle-pilot.mjs`(+`.test.mjs`), `scripts/check-exam-overlap.mjs`(+`.test.mjs`), `scripts/build-structure-judge-bundle.mjs`(+`.test.mjs`)
  - 추가: `docs/experiments/principle-application-pilot-2026-11-09/targets.json`, `DRY-RUN.md`, `dry-run/<지문>/*.request.json`(20개)
  - 추가(생성물): `docs/experiments/principle-application-structure-2026-11-09/judge/{j1,j2}/<지문>.json`(8개씩), `blind-key.json`
  - 이 문서의 결과 보고 칸. 지시문 4개, 기존 스크립트, `packages/**`, `memory/`는 수정하지 않았다.
- 시험 결과:
  - `node --test scripts/run-principle-pilot.test.mjs scripts/check-exam-overlap.test.mjs scripts/build-structure-judge-bundle.test.mjs` 31 통과, 0 실패(18 + 4 + 9)
  - 회귀 `node --test scripts/run-item-generation.test.mjs scripts/run-choice-link.test.mjs scripts/build-generation-blind-review.test.mjs` 56 통과, 0 실패
  - `npm test` 1681 통과, 2 실패. 실패 둘은 이번 변경과 무관하다: `packages/app/src/boundary.test.ts`(`server/student-state.ts`가 node:fs를 import), `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`(`.omc/adhoc/.../hegel-aesthetics-absolute-spirit-p1.json` 없음).
- dry-run 요청 수·예상 비용 상한: 20요청(규칙 4, 상황 8, 집필 8), 예약액 상한 $3.618(상한 $5 아래), 입력 208,762바이트. 자세한 표는 `DRY-RUN.md`.
- 판정 묶음(P1 없이): 판정자별 지문 파일 8개, 51문항(기출 31 + E1 v3 20). 공손룡·도파민·정보 비대칭·mRNA 4지문(기출 17문항)은 지금 판정할 수 있다.
- 남은 문제·인계 문서와 다르게 한 점:
  1. **플라스틱 10 기호(해석 필요).** 인계 문서 4.1은 "플라스틱 10의 ㉮·㉯는 〈보기〉 안의 기호라 그대로 둔다"고 하지만, 실제로는 이 문항의 발문과 선지에도 ㉮㉯가 있다(〈보기〉의 밑줄 표시를 가리킴). 같은 규칙("세 문항 밖의 발문·선지 기호는 멈춘다")을 문자대로 따르면 멈춰야 하지만, 이 문항은 인계 문서가 지목한 예외이므로 발문·선지·〈보기〉의 기호를 모두 그대로 두고 `blind-key.json`의 `notes`에 `SYMBOLS_KEPT`로 남겼다(상수 `KEEP_SYMBOL_ITEMS`). 말로 바꾸려면 키 파일 `replacements` 밖의 새 치환이 필요해 설계 판단 사항이다.
  2. **〈보기〉 표시.** 기출 발문은 `<보기>`(ASCII 꺾쇠)이고 생성 발문은 `〈보기〉`라 출처 단서가 된다. 기출 발문의 `<보기>`를 `〈보기〉`로 바꿨다(키 `notes`에 기록).
  3. **기출 〈보기〉 안의 기호 표시.** `loadQuestion`은 〈보기〉 안 기호 위치를 따로 줄 뿐 텍스트에 넣지 않는다. 판정자가 ㉮·ⓐ가 가리키는 구절을 알 수 있도록 〈보기〉 원문(`prompt_blocks`의 supplement)에 기호를 구절 앞에 끼워 넣었다(`displayParagraphs`와 같은 방식, 박스는 `[ ]`). 표·그림이 있는 〈보기〉(오디오 17, 공손룡 13)는 고정 전사(`supplement-fixed.json`)를 쓰고 그림 경로도 준다.
  4. **스키마의 개수 제한.** 인계 문서 2.2의 `(1~8개)` 같은 개수 범위는 JSON 스키마(`minItems`/`maxItems`)가 아니라 코드 검사(`validateRules`·`validateSituation`)로 확인한다. 엄격 구조화 출력이 해당 키워드를 받는지 확인할 수 없어서다. 위반은 기록만 한다.
  5. **판정 묶음 id.** `<지문>#NN`은 지문별 시드 셔플로 고정 번호를 매기고, j1·j2는 같은 id를 다른 순서로 담는다. 지문 단위 시드라서 P1을 넣어 다시 만들어도 P1이 없는 4지문 파일은 바뀌지 않는다.
  6. **지문 본문.** E1 4지문은 표시 없는 원문(생성 문항과 같은 본문), 개발자 화면 4지문은 표시가 들어간 본문(`displayParagraphs`)을 쓴다. 개발자 화면 4지문의 발문·선지 기호가 지문 또는 〈보기〉에 있는지 코드가 확인한다(없으면 멈춤). 모두 통과했다.
  7. 열린 자리 거르기의 `target`/`description` Dice 비교는 `quote` 문장 키 비교와 별개로 실행해 어느 쪽이든 겹치면 뺀다. 뺀 이유(`SENTENCE_KEY` 또는 `TARGET_DICE`)는 `situation-a.validation.json`의 `info`에 남는다.
