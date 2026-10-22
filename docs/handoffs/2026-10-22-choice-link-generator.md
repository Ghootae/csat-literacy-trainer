# 인계: 선지 연결 생성기 v1 (UI 6지문)

- 날짜: 2026-10-22
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0162-choice-link-layer-direction.md`(보완 포함), 지시문 `docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v1.md`

## 목표

동결 지도·〈보기〉·문항을 받아 선지마다 정오·출처 조각·지도 연결·자유 기술 비틂을 내는 생성 스크립트를 만든다. dry-run까지만 한다. **외부 전송은 하지 않는다**(Claude가 dry-run을 확인한 뒤 사용자 승인을 받아 직접 보낸다).

## 범위 밖

- 외부 API 호출(테스트의 가짜 transport 제외), 지도·입장·분류·지시문 파일 수정, 비틂 목록 만들기, 학생 답안.
- `packages/**`, 다른 세션 파일, 공유 메모리 파일(`memory/CURRENT_STATE.md`·`DECISIONS.md`·`INDEX.md`·`WORK_TREE.md`) 수정 금지. 외부 폴더(`/Users/mac/Projects/suneung_db`, `/Users/mac/Projects/csat-literacy-trainer`)는 읽기만.
- 파일 삭제(`rm`) 금지. git commit·stash 금지.

## 손댈 파일과 계약

### `scripts/run-choice-link.mjs` (새 파일)

`scripts/run-relation-classify.mjs`의 구조(대상 JSON, 지문당 1요청, `--dry-run`, `--max-requests`·`--usd-cap` 실행 중 "실제 누적 + 다음 예약" 검사, ledger·RUN.json, 응답 없는 연결 오류는 실패로 남김, 재시도 없음)를 따른다. 모델·요금·타임아웃·`usageCost`·`reserveUsd`는 기존 스크립트에서 import한다.

CLI: `node --env-file-if-exists=.env scripts/run-choice-link.mjs [--dry-run] --targets <json> --out <dir> [--prompt <md>] [--max-requests <n>] [--usd-cap <x>]`

대상 항목: `{ passageId, passagesDir, mapPath, stancePath, setId, questionsPath, answersPath, assetsDir }`.
- 지문: `loadPassage(passagesDir, passageId)`(기존 함수)의 문단.
- 지문 표시: 수능 DB 지문 파일(`questionsPath`와 같은 `set_id`의 `../passages/<setId>.json`)의 `elements` 중 `kind !== 'paragraph'`인 것을 `{ kind, label/text 등 있는 필드 }`로 넣는다. 없으면 빈 배열.
- 지도: `frozen-map.json`의 `propositions`(`id, paragraphId, text`), `nodes`(`id, kind, paragraphId, text, childIds`), `relations`(`id, fromId, toId, name, note`). 명제별 입장은 `stance-final.json`의 `stances`에서 `{ id, kind, holder }`.
- 문항: 수능 DB `questions/<setId>.json`. **어휘 문항 제외**: `source_tags`나 `source_title`에 "어휘"가 있거나 발문에 "문맥상"이 있으면 뺀다. 문항마다 `{ number, stem, supplements: [{ label, text }], choices: [{ number, text }], answer }`. `answer`는 `answersPath`(enrichment record)의 `questions[].correct_choice`를 `question_number`로 맞춘다. 정답이 없으면 멈추고 보고.
- 이미지: 문항 `prompt_blocks[].images[]`와 `elements[]`의 `local_path`(DB `output/` 기준 상대 경로)를 읽어 `data:<mime>;base64,…`로 `{ type: 'input_image', image_url, detail: 'high' }`를 넣고, 바로 앞 텍스트에 `[IMAGE q<number> <image_id>]` 표지를 둔다. 선지에 이미지가 있으면 같은 방식.
- 출력 스키마(strict JSON schema, zod로 정의해 `text.format`에 넣음):
  ```
  { passageId, questions: [{ number, stemPolarity: SELECT_INCORRECT|SELECT_CORRECT|OTHER,
      supplementSegments: [{ id, kind: TEXT|FIGURE, quote, description }],
      choices: [{ number, truth: TRUE|FALSE|UNDETERMINED, answerConflict: boolean, note,
        parts: [{ quote, source: PASSAGE|SUPPLEMENT|APPLICATION|OUTSIDE, mapIds: string[], supplementIds: string[], twisted: boolean, twistName, twistDetail }] }] }] }
  ```
- `max_output_tokens`: 문항 수에 맞춰 넉넉히(예: 문항당 6,000, 상한 32,000). 예약액이 상한을 넘지 않게 계산.

검증(코드, `validation` 항목마다 pass·violations):
1. 입력 문항 번호와 출력 문항 번호가 같다. 선지 수·번호도 같다.
2. `parts[].quote`는 해당 선지 문장의 정확한 부분 문자열(공백 정규화 일치는 따로 표시).
3. `supplementSegments` `TEXT`의 `quote`는 그 문항 〈보기〉 글의 부분 문자열. `FIGURE`는 `description`이 비어 있지 않다.
4. `mapIds`는 지도에 있는 id, `supplementIds`는 그 문항 `supplementSegments` id. `PASSAGE`는 `mapIds` ≥1, `SUPPLEMENT`는 `supplementIds` ≥1, `APPLICATION`은 둘 다 ≥1, `OUTSIDE`는 둘 다 0.
5. `truth: FALSE` ⇒ `twisted` 조각 ≥1이고 그 조각들의 `twistName`·`twistDetail` 비어 있지 않음. `truth: TRUE` ⇒ `twisted` 0.
6. 정답 일관성: `SELECT_INCORRECT`이면 정답 선지 `FALSE`·나머지 `TRUE`, `SELECT_CORRECT`이면 반대. 어긋나면 위반(그리고 모델의 `answerConflict` 값과 함께 보고). `OTHER`·`UNDETERMINED`는 위반이 아니라 건수만 센다.

dry-run: 대상마다 요청 본문을 `--out`의 `<passageId>/dry-run.request.json`에 쓰고(이미지는 data URL을 `"<base64 생략, N bytes, sha256>"`로 바꿔 저장), 가짜 예시 출력으로 검증을 한 번 돌려 `exampleAllPass`를 낸다. 외부 요청 0. 출력: `{ dryRun, externalRequests: 0, exampleAllPass, perPassage: [{ passageId, questions, choices, images, reserveUsd }], totalReserveUsd, overCap }`.

실행 결과(나중에 Claude가 돌림): `<out>/<passageId>/choice-link.json`·`.raw.json`·`.validation.json`, `ledger.jsonl`, `RUN.json`, `summary.json`(문항·선지 수, source별 조각 수, twisted 조각 수, `twistName` 빈도표, 검증 위반 수, answerConflict 수), `REPORT.md`(같은 내용 표).

### `scripts/run-choice-link.test.mjs` (새 파일)

가짜 지도·문항·가짜 transport로: 어휘 문항 제외, 정답 결합(없으면 멈춤), 이미지 data URL·표지 생성과 dry-run 저장 시 생략, 검증 1~6 각각의 위반 사례, 요약의 `twistName` 빈도, 상한 검사.

### `docs/experiments/choice-link-2026-10-22/targets-ui.json` (새 파일)

UI 6지문:

| passageId | setId | 지도 | 입장 |
|---|---|---|---|
| gongsun-long-later-mohists | 69c011fd78128b2a9beddd5e | `docs/experiments/analysis-map-gongsun-2026-10-16/frozen-map.json` | 같은 폴더 `stance/stance-final.json` |
| dopamine-motor-control | 69c28579d58cf540a9bc25eb | `docs/experiments/analysis-map-dopamine-2026-10-18/frozen-map.json` | 같은 폴더 `stance/stance-final.json` |
| corporate-law | 69bbf88d8937cf14551903ca | `docs/experiments/analysis-gold-ui-2026-10-21/corporate-law/frozen-map.json` | 같은 폴더 `stance/stance-final.json` |
| information-asymmetry-free-marketplace | 6a213e9386fd308968e100b3 | `docs/experiments/analysis-gold-ui-2026-10-21/information-asymmetry-free-marketplace/frozen-map.json` | 〃 |
| surface-tension-laplace | 6a213ea086fd308968e101df | `docs/experiments/analysis-gold-ui-2026-10-21/surface-tension-laplace/frozen-map.json` | 〃 |
| mrna-vaccine-lipid-nanoparticle | 69c08f1d78128b2a9bedf236 | `docs/experiments/analysis-gold-ui-2026-10-21/mrna-vaccine-lipid-nanoparticle/frozen-map.json` | 〃 |

`passagesDir`는 `packages/pipeline/fixtures/experiments/dialogue/passages`, `questionsPath`는 `/Users/mac/Projects/suneung_db/output/questions/<setId>.json`, `answersPath`는 `/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/<setId>.json`, `assetsDir`는 `/Users/mac/Projects/suneung_db/output`.

## 완료 조건

- [ ] `node --test scripts/run-choice-link.test.mjs` 통과, 기존 `node --test scripts/aggregate-student-fingerprint.test.mjs scripts/run-analysis-*.test.mjs scripts/run-relation-classify.test.mjs scripts/import-suneung-passage.test.mjs`(82개) 유지.
- [ ] dry-run: `--targets docs/experiments/choice-link-2026-10-22/targets-ui.json --out docs/experiments/choice-link-2026-10-22/dry-run/ui --prompt docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v1.md --max-requests 6 --usd-cap 2` 외부 요청 0, `exampleAllPass: true`. 결과 보고에 지문별 문항·선지·이미지 수와 예약액을 붙인다(예상: 비어휘 24문항·120선지·이미지 2).

## 중단·보고 조건

- 이 문서와 코드·데이터가 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.
- 정답이 없는 문항, 이미지 파일이 없는 경우, 지도 id 체계가 위와 다른 경우 멈추고 보고.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-choice-link.mjs`, `scripts/run-choice-link.test.mjs`, `docs/experiments/choice-link-2026-10-22/targets-ui.json`(새 파일), dry-run 산출물 `docs/experiments/choice-link-2026-10-22/dry-run/ui/<passageId>/dry-run.request.json`(6개).
- 테스트 결과: `node --test scripts/run-choice-link.test.mjs` 13개 통과. 기존 묶음(`aggregate-student-fingerprint`·`run-analysis-*`·`run-relation-classify`·`import-suneung-passage`) 82개 통과. dry-run: 외부 요청 0, `exampleAllPass: true`, 비어휘 24문항·120선지·이미지 2(공손룡 1·mRNA 1). 지문별 예약액 0.4236/0.3546/0.3623/0.3451/0.2735/0.5694, 합계 2.3283.
- 남은 문제: dry-run `overCap: true`(합계 예약액 2.328 > 상한 2). 실행 중 검사는 "실제 누적 + 다음 예약"이라 실제 비용이 예약보다 작으면 진행되지만, 예약 합계가 상한을 넘으므로 상한 조정이나 `TOKENS_PER_QUESTION` 하향은 Claude 판단 필요(구현은 handoff 예시 6,000 유지).
- 해석 선택: (1) 입장은 `stances: [{id, kind, holder}]` 별도 목록으로 입력(명제에 합치지 않음). (2) 지문 표시는 `kind !== 'paragraph'` 요소의 `kind·symbol·style·text`만(start/end 오프셋 제외). (3) 이미지는 JSON 입력 뒤에 `[IMAGE q<번호> <image_id>]` 텍스트 + `input_image`를 차례로 붙임. 이미지 전용 〈보기〉 블록은 `text: ""`. (4) 문항 이미지는 stem·supplement·선지의 `images[]`와 `elements[].local_path`를 image_id로 중복 제거. (5) 알 수 없는 `prompt_blocks.type`, 정답 없음, 이미지 파일 없음은 예외로 멈춤. (6) 공백 정규화 일치는 위반이 아니라 검증 2의 `info`로 표시. (7) 검증 5의 `twistName`·`twistDetail` 비어 있음 검사는 FALSE 선지의 twisted 조각에만 적용. (8) 보호 파일 해시(지문·지도·입장·DB 문항/지문/정답 파일) 비교를 RUN.json에 기록.

## 보완 v2 (2026-10-22, 설계 검토 반영, 사용자 "오케이 그렇게 진행")

근거: `docs/review/choice-link-design-review-2026-10-21.md`, D-0162 보완 2. 지시문은 `docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v2.md`(v1은 보내지 않음). 위 계약 중 아래와 어긋나는 부분은 이 절을 따른다. **여전히 외부 전송 없음, dry-run까지.**

1. **입력 추가**
   - 대상 항목에 `classifyPath`를 더한다(공손룡·도파민: `docs/experiments/student-fingerprint-2026-10-21/classify/<passageId>/classify.json`, UI 4지문: `docs/experiments/analysis-gold-ui-2026-10-21/classify/<passageId>/classify.json`). 관계마다 `type`을 지도 관계 입력에 붙인다(`relationType`). 관계 id가 classify에 없으면 멈춤.
   - **〈보기〉 조각을 코드가 고정한다.** 문항의 supplement 글을 줄(`\n`) 단위로 나누고, 줄이 표지로 시작하면(`(가)`·`(나)` 등 괄호 한글 한 글자, `◦`·`•`·`-`, `갑:`·`을:` 같은 짧은 화자 표지, `(단,`) 그 줄을 한 조각으로, 아니면 문장 단위(`. ? !` 뒤)로 나눈다. 빈 줄은 버린다. id는 문항 안에서 `S1`부터. 각 조각 `{ id, kind: 'TEXT', text }`.
   - **그림 고정 파일** `docs/experiments/choice-link-2026-10-22/supplement-fixed.json`: `(setId, questionNumber)`가 맞는 항목이 있으면 `transcribedText`가 있을 때 그 글을 supplement 글 대신 위 규칙으로 나누고, `figureElements`는 `{ id, kind: 'FIGURE', text: description }` 조각으로 뒤에 붙인다. 이미지는 계속 함께 보낸다.
   - **참고 해설**: enrichment record의 `official_explanation.choice_explanations[]`를 선지마다 `explanation`(`explanation_ko`)으로 붙이고, 문항에 `explanationSummary`(`detailed_explanation_ko`). 없으면 `null`.
2. **출력 스키마 v2**(strict):
   ```
   { passageId, questions: [{ number, stemPolarity,
       extraSegments: [{ id, parentId, quote }],
       choices: [{ number, truth, answerConflict, explanationAgreement: AGREE|DIFFER|NO_EXPLANATION, note,
         parts: [{ quote, source: PASSAGE|SUPPLEMENT|BOTH|NONE, operation: RESTATE|INFER|APPLY,
           twisted, twistTargetIds: string[], supportIds: string[], contextIds: string[], inferenceBasisIds: string[],
           twistName, evidenceQuote, choiceQuote,
           relationTypeChange: { original, claimed } | null }] }] }] }
   ```
   `relationTypeChange.original/claimed`는 18유형 + `OTHER` enum(`run-relation-classify.mjs`의 `TYPES`).
3. **검증 v2**(기존 1·6 유지, 나머지 대체):
   - V2 조각: `quote`는 선지 부분 문자열. 선지 안 위치(첫 일치)로 정렬했을 때 **겹치지 않고**, 조각 사이·앞뒤 빈틈이 각각 공백·문장부호만이거나 한글 2자 이하.
   - V3 〈보기〉: `extraSegments[].parentId`는 그 문항 조각 id, `quote`는 부모 글의 부분 문자열, id는 입력 조각과 겹치지 않음.
   - V4 id: 모든 id 칸의 값은 지도 id 또는 그 문항의 〈보기〉 조각 id(`extraSegments` 포함). source 규칙: `PASSAGE`면 지도 id ≥1·〈보기〉 id 0, `SUPPLEMENT`면 〈보기〉 id ≥1·지도 id 0, `BOTH`면 둘 다 ≥1, `NONE`이면 모든 id 칸 빈 배열(세는 대상은 twistTargetIds∪supportIds∪contextIds∪inferenceBasisIds). `APPLY`이면 `source: BOTH`. `INFER`이면 `inferenceBasisIds` ≥1.
   - V5 비틂: `twisted`이면 `twistName`·`choiceQuote` 비어 있지 않음, `choiceQuote`는 그 조각 `quote`의 부분 문자열, `supportIds` 빈 배열, `source`가 `NONE`이 아니면 `twistTargetIds` ≥1·`evidenceQuote`가 지문 문단 원문(아무 문단) 또는 그 문항 〈보기〉 조각 글(그림 요소 설명 포함)의 부분 문자열(공백 정규화 일치는 info). `twisted`가 아니면 `twistTargetIds` 빈 배열·`supportIds` ≥1(단 `NONE` 제외)·`twistName`·`evidenceQuote`·`choiceQuote` 빈 문자열. `relationTypeChange`는 `twistTargetIds`에 관계가 있을 때만 non-null이고 `original`이 입력 관계 유형과 같아야 함. `truth: FALSE` ⇒ twisted ≥1, `TRUE` ⇒ 0.
   - 검토 표시(위반 아님, `review` 목록): `answerConflict: true`인 문항, `explanationAgreement: DIFFER`인 선지, `source: NONE`인 비틂 조각, 한 선지에 twisted 조각이 둘 이상인 선지(모호), `note`가 비어 있지 않은 선지.
4. **3회 생성**: `--runs <n>`(기본 1). 지문마다 n회 요청해 `<out>/<passageId>/r<k>/choice-link.json`… 로 저장. `--max-requests`는 전체 요청 수. 응답 없는 연결 오류 회차는 `--round <k>`로 그 회차만 다시 보낼 수 있게 한다(map 스크립트와 같은 방식, 별도 폴더 불필요: `r<k>`에 덮지 말고 `r<k>-rerun`).
5. **요약 v2** `summary.json`·`REPORT.md`: 회차별 검증 위반·검토 표시 수; source×operation 조각 수; twisted 조각의 `twistName` 빈도; 그리고 **회차 간 안정성**: 선지마다 회차별 `twistTargetIds` 합집합(선지 단위, 조각 무시)과 `truth`를 비교해, 세 회차 모두 같은 선지 비율·두 회차 이상 같은 비율, 불일치 선지 목록(지문·문항·선지·회차별 집합).
6. 테스트: 〈보기〉 분할(표지 줄·문장·`(단,`), 고정 파일 전사·그림 요소, 해설 결합, V2 덮음·겹침(빈틈 3자 위반·2자 통과), V4 source·operation 규칙, V5 evidenceQuote 원문 검사와 relationTypeChange, 검토 표시, `--runs` 경로·요청 수 상한, 회차 간 안정성 계산.
7. dry-run: `--runs 3 --max-requests 18 --usd-cap 6`으로 돌려 지문별 문항·선지·〈보기〉 조각·이미지 수, 요청당 예약액, 전체 예약액, `exampleAllPass`를 보고. 외부 요청 0.

## 보완 v3 (2026-10-22, v2 실행 결과 반영, 사용자 "A안 동의. 승인. 작업 후 커밋")

근거: `docs/experiments/choice-link-2026-10-22/REPORT-v2-run-desktop.md` 8절, D-0162 보완 3. 지시문은 `docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v3.md`. v2 계약 중 아래와 어긋나는 부분은 이 절을 따른다. **외부 전송 없음, dry-run까지.** v2 동작은 `--prompt`가 v2일 때도 깨지지 않을 필요는 없다(v3가 기본). 기존 v2 결과 폴더(`runs/ui-v2`)·dry-run 폴더는 건드리지 않는다. 파일 삭제가 필요하면 멈추고 보고한다.

1. **입력: 선지 정오 고정.** 선지마다 `truth`를 넣는다. 극성은 기존 코드 규칙(발문에 '적절하지 않은' → SELECT_INCORRECT, /적절한/ → SELECT_CORRECT). SELECT_INCORRECT면 정답 선지 FALSE·나머지 TRUE, SELECT_CORRECT면 정답 TRUE·나머지 FALSE. OTHER 극성 문항이 있으면 예외로 멈춘다(UI 6지문엔 없을 것).
2. **입력: 〈보기〉 기호 표시.** supplement 블록의 `elements` 중 `symbol`이 있는 요소(`kind !== 'paragraph'`)를 조각에 `marks: [{ symbol, text, start, end }]`로 붙인다. `start`·`end`는 **그 조각 `text` 안의** 위치(조각 글.slice(start,end) === mark.text). 블록 글 오프셋 → 조각 위치 변환은 조각을 블록 글에서 차례로 찾아(indexOf, 앞 조각 끝 이후) 범위를 정하고, 표시가 한 조각 안에 다 들어가지 않거나 slice가 맞지 않으면 예외로 멈춘다. 블록 글을 trim하면 앞 공백만큼 오프셋을 보정한다. 표시 없는 조각은 `marks: []`. 고정 파일 전사(`transcribedText`)를 쓴 문항·그림 요소 조각은 `marks: []`.
3. **출력 스키마 v3**: 선지에서 `truth`·`answerConflict`를 빼고 `readingGap: NONE|IMPLICIT_PREMISE|STRICT_READING`를 더한다. 나머지 v2와 같음.
4. **검증 v3** (v2 대비 바뀌는 것만):
   - V4 `NONE`: `twistTargetIds`·`supportIds`·`inferenceBasisIds`가 빈 배열이어야 한다. `contextIds`는 허용(지도 id·〈보기〉 id 아무거나).
   - V4 `APPLY`: `source: BOTH` 유지. 추가로 `twisted`가 아니면 `supportIds`에 〈보기〉 id ≥1·지도 id ≥1. `twisted`이면 `twistTargetIds ∪ contextIds`에 〈보기〉 id ≥1·지도 id ≥1.
   - V5: `twisted`이고 `source: NONE`이면 `twistTargetIds` 빈 배열·`evidenceQuote` 빈 문자열·`twistName`·`choiceQuote` 비어 있지 않음. `twisted`가 아니고 `source: NONE`인 조각은 위반이 아니라 검토 표시 `NONE_UNTWISTED`.
   - V6(정답 일관성) 대체: **입력 `truth`** 기준으로 FALSE ⇒ twisted 조각 ≥1, TRUE ⇒ 0. 모델 출력에 truth가 없으므로 극성 비교는 하지 않는다. `stemPolarity`가 코드 극성과 다르면 위반.
   - 검토 표시: `ANSWER_CONFLICT` 대신 `READING_GAP`(readingGap ≠ NONE, 종류를 같이 기록). `readingGap ≠ NONE`인데 `note`가 비면 위반(V5).
5. **요약 v3**: 회차 간 안정성은 truth가 고정이므로 **선지별 twistTargetIds 합집합**만 비교한다(FALSE 선지 대상, 모든 회차 같음·두 회차 이상 같음·**세 회차 교집합이 비지 않음** 비율, 불일치 목록). readingGap 분포(종류별 선지 수, 선지별 회차 수). 나머지 v2와 같음.
6. **가짜 예시 출력**(dry-run의 exampleAllPass용)을 v3 스키마·검증에 맞게 고친다.
7. 테스트: 정오 고정(두 극성), marks 위치 변환(공손룡 q12 실제 블록: ⓐ는 S1 "옷", ⓑ·ⓒ는 S2, ⓓ·ⓔ는 S3 "옷"·"빨간 옷"), 표시가 조각 경계를 넘으면 예외, V4 NONE contextIds 통과·supportIds 위반, V4 APPLY support 양쪽 규칙, V5 NONE 비틂, V6 입력 truth 기준, READING_GAP 검토 표시와 note 필수, 안정성 교집합 계산. 기존 테스트는 v3에 맞게 고치되 v2 전용 동작 테스트는 v3 기대로 바꾼다.
8. dry-run: `--targets docs/experiments/choice-link-2026-10-22/targets-ui.json --out docs/experiments/choice-link-2026-10-22/dry-run/ui-v3 --prompt docs/experiments/choice-link-2026-10-22/CHOICE-LINK-PROMPT-v3.md --runs 3 --max-requests 18 --usd-cap 5`. 외부 요청 0, `exampleAllPass: true`. 보고에 지문별 문항·선지·〈보기〉 조각·marks 수, 요청당 예약액, 전체 예약액, 공손룡 q12 조각과 marks를 그대로 붙인다.
9. 완료 보고: 변경 파일, 테스트 결과(새 묶음 + 기존 82개 묶음), dry-run 출력, 해석 선택.
