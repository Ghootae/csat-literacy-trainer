# 인계: 문단 전체 판정 그림자 실험 — 준비와 모의 검증

- 날짜: 2026-10-08
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0101-holistic-verdict-shadow-experiment.md`, `memory/decisions/D-0092-claude-codex-work-division.md`
- 설계 전문: `docs/experiments/holistic-verdict-shadow-2026-10-08/PLAN-DRAFT.md`. 이 문서와 PLAN이 다르면 멈추고 보고한다.

## 목표

- 오프라인 CLI `scripts/test-holistic-verdict-shadow.mjs`를 만든다. 명령은 `prepare | run <승인 결정 ID> | report`다.
- `prepare`는 다음을 API 호출 없이 끝낸다.
  - 입력 고정
  - 요청 생성
  - 모의 응답으로 계약 검사·리포트 검증
  - 호출 수·토큰 추정
- **이번 작업의 OpenAI API 호출은 0회다.**

## 범위 밖

- API 호출(`run` 실행)
- V4 프롬프트·스키마·상태 전이·UI·운영 서버
  - `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts`를 포함한다. 커밋되지 않은 변경이 있으므로 읽지도 import하지도 않는다.
- 그림자 2·3회차, V4 추가 실행(2차 범위)
- 고정 파일 수정
  - `PROBE-REVIEW.md`, `PROBE-KEY.md`, `shadow-instructions.md`, `attribution-instructions.md`
  - 기존 실험 폴더, gold-v2 fixture, `memory/`
- 커밋, git 상태 변경

## 출력 폴더

`docs/experiments/holistic-verdict-shadow-2026-10-08/`

## 고정 입력 (manifest에 sha256 기록)

- **탐침 파일:** 해시가 아래와 다르면 멈춘다.
  - `PROBE-REVIEW.md`: `633f97c4805e25692c033981c7540092409cf53b4ca38591df4e7c3f0bf70714`
  - `PROBE-KEY.md`: `23a9388fa28ae85e76b3685c6b46562a1c9fae1bee9859e80c35d4a1ae9956ef`
- **지시문:** `shadow-instructions.md`, `attribution-instructions.md`. 파일 내용을 그대로 `instructions`로 쓴다.
- **골드:** `packages/pipeline/fixtures/experiments/dialogue/gold-v2/{paragraphId}.json`
- **지문:** `packages/pipeline/fixtures/experiments/dialogue/passages/{passageId}.json`
- **실데이터 A:** `docs/experiments/natural-response-disagreement-v1-2026-09-21/`의 `records.json`, `cases.json`, `requests.jsonl`, `results.jsonl`
- **실데이터 B:** `.omc/logs/dialogue-experiment/sessions.jsonl`. 선택한 행의 원본 줄 번호와 줄 해시를 기록한다.

## 시점 구성

모든 시점은 `{ pointId, source: 'A'|'B'|'probe', paragraphId, sessionId, turn, stratum: 'initial'|'followup', dialogue, v4 }` 형태다.

### A (45시점)

- `records.json`의 31세션에서 시점을 만든다.
  - `scripts/lib/natural-response-disagreement.mjs`의 `casesFromRecord`를 재사용해도 된다.
  - 결과가 `cases.json`과 시점·순서가 같아야 한다(최초 31, 후속 14).
- V4 판정은 `results.jsonl`의 V4 결과에서 가져온다. 여기서는 축별 검증 상태를 쓴다.
  - V4 결과가 계약 실패면 그 시점의 V4를 `contract-failed`로 표시하고 네 칸 분류에서 뺀다.

### B (27시점)

- **세션 선택:** 행 JSON에 `axis-dialogue-selective-v4`가 들어 있고, `sessionId`가 A에 없는 행이다.
  - 기대값은 14세션이다(공손룡 1~5문단, 법인 1~4문단).
- **시점:** `turns[i].evaluation`이 있는 턴마다 한 시점이다.
  - 기대값은 27시점이다(최초 14, 후속 13).
- **V4 판정:** `turns[i].evaluation.snapshot.axisFeedback[].status`
- **골드 확인:** 각 시점의 `call.goldHash`가 현재 gold-v2 파일의 sha256과 같아야 한다.
- **버전 기록:** 스키마 버전(`call.schemaVersion`)을 시점별로 기록한다.

수가 기대값과 다르면 멈추고 보고한다.

### 탐침 (13개)

- `PROBE-REVIEW.md`에서 T01~T13의 응답을 파싱한다.
- 응답은 `### Txx` 아래 첫 `> ` 인용 줄이다.
- 문단은 소속 절로 정한다.
  - A → `gongsun-long-later-mohists-p2`
  - B → `corporate-law-p2`
  - C → `dopamine-motor-control-p2`
  - D → `information-asymmetry-free-marketplace-p1`
  - E → `surface-tension-laplace-p5`
- 사람 판정(판정, 질문 필요)도 파싱해 `probe-human.json`에 둔다.
- 탐침은 `stratum: 'initial'`이고 `source: 'probe'`다.

### dialogue (학생 원발화와 질문)

- 형식: `[{ role: 'student', text: initialResponse }, { role: 'tutor_question', text: questionShown, note: '대화 맥락, 판정 기준 아님' }, { role: 'student', text: studentAnswer }, …]`
  - 시점 k(1부터)에는 최초 응답과, 앞선 k−1개 턴의 질문·답 쌍을 넣는다.
- V4의 `effectiveResponse`, 공개 박스 문구(`revealedText`), 축 상태는 넣지 않는다.

## 요청

모델 파라미터는 A의 V4 요청과 같게 한다. `model`, `reasoning`, `service_tier`, `max_output_tokens`, `store`를 A `requests.jsonl`의 V4 요청에서 그대로 복사하고, 같은지 검사한다.

### 그림자 판정 (H0·H1)

- **instructions:** `shadow-instructions.md`
- **input(JSON 문자열):** `{ passage: { title, paragraphs: [{ paragraphId, text }] }, targetParagraphId, targetParagraphText, referenceInterpretation?, dialogue }`
  - H0에는 `referenceInterpretation` 키가 없다.
  - H1의 `referenceInterpretation`은 gold-v2 `centralAxes[].description`을 순서대로 `' '`로 이어 붙인 것이다. 축 ID와 번호는 넣지 않는다.
  - 두 변형의 요청은 `referenceInterpretation` 키만 달라야 한다(검사).
- **strict JSON 스키마:**
  - `overall`: `resolved` | `unresolved`
  - `understoodRelations`: string[]
  - `brokenRelation`: `{ description: string, studentQuote: string|null, kind: 'missing'|'incorrect'|'inter-axis-relation' }` | null
  - `unconfirmed`: string[]
  - `questionWorthy`: boolean
  - `question`: string|null
  - `confidence`: `high` | `medium` | `low`

### 축 귀속 (그림자 미해결일 때만)

- **instructions:** `attribution-instructions.md`
- **input:** `{ targetParagraphText, centralAxes: [{ id, description }], brokenRelation, unconfirmed }`
- **스키마:** `{ axisAttribution: string[], unconfirmedAttribution: string[][], reason: string }`
- 그림자 판정이 계약을 통과하고 `overall=unresolved`일 때만 호출한다.

### 탐침 V4 판정

- A `requests.jsonl`에서 같은 문단의 최초 시점(turn 1) V4 요청을 템플릿으로 삼는다.
  - 다섯 문단 모두 A에 있다.
- `instructions`와 `text.format`(스키마)은 바이트 단위로 그대로 쓴다.
- `input`에서는 `evidence.initialResponse`만 탐침 응답으로 바꾸고, 나머지 키는 그대로 둔다.
  - 템플릿의 `followUpExchanges`가 비어 있고 `previousAxisStates`가 null인지 확인한다.
  - A의 V4 결과 검증 방식(축별 상태 추출)을 그대로 쓴다.

## 계약 검사 (`scripts/lib/holistic-verdict-shadow-contract.mjs` + `.test.mjs`)

**그림자 판정:**

- 스키마를 만족해야 한다.
- `overall=resolved`이면 `brokenRelation=null`, `questionWorthy=false`, `question=null`이다.
- `overall=unresolved`이면 `brokenRelation`이 null이 아니다.
- `studentQuote`가 null이 아니면 dialogue에 있는 어떤 `role=student` 발화 하나의 정확한 부분 문자열이다. 공백 정규화만 허용한다.
- `kind=incorrect`이면 `studentQuote`가 null이 아니다.
- `questionWorthy=true`이면 `question`이 비어 있지 않다. false이면 null이다.

**축 귀속:**

- 모든 id가 그 문단 gold-v2의 축 id다.
- `unconfirmedAttribution` 길이가 `unconfirmed` 길이와 같다.

계약에 실패하면 재시도 없이 실패로 기록한다. 실패한 그림자 판정에는 축 귀속을 호출하지 않는다.

## 분석 규칙 (report)

**V4 문단 요약:**

- 모든 축이 PASS 또는 UNCLEAR_OK면 해결이다.
- UNCLEAR_SERIOUS 또는 ERROR가 하나라도 있으면 미해결이다.

**그림자 유효 판정:**

- 원판정을 그대로 쓴다.
- 예외: V4 해결, 그림자 미해결인데 `studentQuote`가 null이면 유효 판정은 해결이다. 이 경우를 "철회"로 따로 센다(PLAN 3절 표 3행).
- 원판정과 유효 판정을 모두 보고한다.

**표시:** V4 쪽에 학생 발화 인용이 있는 ERROR가 있는데 그림자가 해결이면 `reviewFlag`로 표시한다.

**네 칸 분포:** H0·H1 각각, 그리고 집합별로 나눈다.

- 실데이터 최초 45
- 실데이터 후속 27
- 탐침 13
- 출처 A·B

**`summary.json`에 넣을 것:**

- 네 칸 분포, 철회 수, 계약 실패
- `kind`별 건수(`inter-axis-relation` 포함)
- 기준 이동: 같은 세션 안에서 연속 시점의 `brokenRelation.description`이 바뀐 경우를 원자료로 나열한다. 의미 판단은 사람이 한다.
- 탐침별 V4 판정·H0·H1 판정, `probe-human.json` 대비 일치
- PLAN 11절 "뚜렷하다" 조건 계산
  - 사람이 충분·질문 불필요로 본 FA 탐침 7개(T03, T05, T07, T09, T10, T11, T12) 중 V4 미해결·그림자 해결인 수
  - 오류 탐침 3개(T01, T06, T13)를 그림자가 모두 미해결로 잡았는지
  - 이 탐침 목록은 `PROBE-KEY.md`가 아니라 `probe-human.json`의 사람 판정으로 계산하고, 위 목록과 같은지 검사한다.
- 사용량·비용·지연. 그림자 1회 대 V4의 기록된 호출.

**사람 판정 묶음:**

- **대상:** 실데이터에서 H0 또는 H1 가운데 하나라도 V4와 갈린 시점 전체.
- **일치 표본:** H0·H1 모두 V4와 일치한 시점에서 최대 10건을 더한다.
  - 해결/해결 5건, 미해결/미해결 5건이다. 미해결/미해결이 부족하면 있는 만큼만 넣는다.
  - pointId의 sha256 순으로 결정적으로 고른다.
- **`REVIEW.md`(블라인드):**
  - 내용: 시점마다 원문, dialogue, 판정 칸(충분/미확인/오류, 오류 인용, 질문 필요, 메모)
  - 넣지 않는 것: 모델 결과, 축, 출처, 갈림 여부
  - 순서: sha256 순서로 섞는다.
- **`REVIEW-KEY.md`:** 같은 순서로 V4 축별 상태, H0·H1 출력, 축 귀속, 갈림 칸을 담는다.
- **`REVIEW-SECOND.md`:** 재판정용. REVIEW.md의 시점과 탐침 13개를 다른 순서(`'second:'+pointId`의 sha256)로 섞은 블라인드 묶음이다.
- **`human-review.json`:** 빈 판정 틀.

## prepare (API 없음)

1. 고정 입력의 해시를 확인하고 `manifest.json`에 기록한다.
2. 시점을 구성하고, 기대값(A 45, B 27, 탐침 13)을 검사한다.
3. 요청을 만든다.
   - 그림자 170개: (72 + 13) × H0·H1
   - 탐침 V4 13개
   - `requests.jsonl`에 기록한다.
   - 두 번 실행해도 바이트 단위로 같아야 한다.
4. 모의 응답 검증.
   - 합성 응답으로 계약 검사가 위반을 잡는지 확인한다. 최소한 다음 다섯 가지를 확인한다.
     - 인용 불일치
     - resolved인데 brokenRelation이 있음
     - incorrect인데 인용이 null
     - 축 id 오류
     - 길이 불일치
   - 합성 정상 응답 세트로 report 전체를 끝까지 실행해 `summary.json`과 REVIEW 파일 셋이 만들어지는지 확인한다.
   - 모의 산출물은 `mock/` 하위에만 쓴다.
5. `preflight-validation.json`에 기록할 것:
   - 시점 수
   - 요청 수: 그림자 170, 탐침 V4 13, 축 귀속 최대 170
   - 입력 토큰 추정: 문자 수 기반. 추정 방법을 함께 적는다.
   - 최대 호출 수: 353
   - `apiCalls: 0`

## run

- **승인 확인:** 번호가 101보다 큰 `D-\d{4}` 결정이어야 한다.
  - frontmatter: `status: accepted`
  - `scope`: `holistic-verdict-shadow-`로 시작하고 `transfer`를 포함한다.
- **실행 순서:** 그림자 170 → 탐침 V4 13 → 축 귀속(그림자 미해결로 계약을 통과한 것만)
- **재시도:** 없다.
- **기록:** 응답을 `responses.jsonl`에 기록한다.

## 완료 조건

- [ ] `node --test scripts/lib/holistic-verdict-shadow-contract.test.mjs`와 `node --test scripts/lib/*.test.mjs`가 통과한다.
- [ ] `node scripts/test-holistic-verdict-shadow.mjs prepare`가 API 호출 0회로 성공하고, 두 번 실행해도 결과가 같다. 시점 수는 A 45, B 27, 탐침 13이다.
- [ ] `run`을 인자 없이, `D-0101`로, 없는 ID로 실행하면 모두 API 호출 전에 거부한다.
- [ ] 모의 report가 `summary.json`, `REVIEW.md`, `REVIEW-KEY.md`, `REVIEW-SECOND.md`, `human-review.json`을 만든다.
- [ ] REVIEW.md와 REVIEW-SECOND.md에 모델 출력, 축 설명, 출처 표시가 없다(검사).
- [ ] 고정 파일·기존 실험 폴더·gold-v2·passages에 변경이 없다(해시 비교).

## 중단·보고 조건

- 이 문서와 코드·데이터·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고, 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 시점 수, 골드 해시, 탐침 해시가 기대와 다르면 멈춘다.
- 외부 API 호출이 필요해지면 실행 전에 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
