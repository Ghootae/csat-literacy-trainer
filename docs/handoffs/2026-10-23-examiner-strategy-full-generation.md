# 인계: 출제자 전략 글 61개 생성 실행기 확장

- 날짜: 2026-10-23
- 작성: 코드 에이전트
- 실행: 하위 에이전트(executor, sonnet)
- 관련 결정: `memory/decisions/D-0170-optional-examiner-strategy-feedback.md`(시험으로 정한 것, 다음 단계 1)
- 앞선 인계: `docs/handoffs/2026-10-23-examiner-strategy-trial.md`, `docs/handoffs/2026-10-23-examiner-strategy-intent-compare.md`

## 목표

`scripts/run-examiner-strategy.mjs`로 동결 선지 지도(`docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/`)의 `truth: FALSE` 선지 61개 전부의 출제자 전략 글을 생성할 수 있게 한다. 이를 위해 세 가지를 바꾼다.

1. 원문·문항을 비교 실험 세션 파일 대신 원자료에서 읽는다. 지금의 `findSource`는 6문항만 읽을 수 있다.
2. 코드 에이전트 검토용 대조표를 만든다. 대조표에는 원문, 공식 해설, 골드, 생성 글이 함께 들어간다.
3. 골드 수정 파일을 입력에 반영한다.

**외부 전송은 하지 않는다.** 단위 테스트(가짜 전송)와 dry-run까지만 한다.

## 범위 밖

- 지시문(`docs/experiments/examiner-strategy-2026-10-23/PROMPT-*.md`) 수정.
- 동결본 파일(`frozen/*.json`, `overrides.json`), `trial-*` 폴더, `scripts/run-choice-link.mjs`, `scripts/lib/provider-adapter.mjs`, 운영 코드(`packages/`), `memory/`.
- 기존 동작(`--source` 없음)과 기존 테스트 28개는 그대로 통과해야 한다.

## 손댈 파일과 계약

### `scripts/run-examiner-strategy.mjs`

1. **`--source raw`**(선택, 없으면 지금처럼 `sessions`):
   - 원문·문항을 `scripts/run-choice-link.mjs`의 `loadTargets('docs/experiments/choice-link-2026-10-22/targets-ui.json')`로 읽는다. 이미 export되어 있다. 읽은 결과의 `passage`, `questions`, `images`, `passageMarks`를 쓴다.
   - 입력 JSON은 지금 v2 입력과 같은 키를 유지한다.
     - `passage`: 문단 글을 빈 줄로 이은 문자열. 두 지문 세트(`section` 있음)는 문단 앞에 `(가)`·`(나)` 표지를 붙인다. 표지 형식은 `loadTargets` 결과를 읽어 정하고, 분명하지 않으면 멈추고 보고한다.
     - `question.number`, `question.stem`
     - `question.scenario`: 〈보기〉 조각 글(`supplementSegments[].text`)을 줄바꿈으로 이은 것. 조각이 없으면 빈 문자열.
     - `question.supplementSegments`: 지금처럼 동결본 `extraSegments`, 그리고 원자료 조각(`id`, `text`→`quote`). 그림 요소(`F…`)가 있으면 그 설명도 같은 형식으로 넣는다.
     - `question.textAnnotations`: 원자료 `passageMarks`.
     - `question.choices`(`position`, `text`), `question.answer`
     - `target`: 지금과 같다.
     - `officialExplanation`: `{ choice: <대상 선지의 choices[].explanation>, summary: <explanationSummary> }`. 둘 다 없으면 `null`.
   - **그림**: 대상 문항에 `images`가 있으면 OpenAI 요청의 `input`에 `input_image`(data URL)로 붙인다. 붙이는 방식은 `run-choice-link.mjs`의 `buildRequest`를 따른다. `requests/` 파일에는 `redactImages`처럼 data URL을 해시로 바꿔 저장한다. DeepSeek 설정에 그림이 있는 요청이 오면 `RUN_LIMIT`로 멈춘다(어댑터가 이미 그렇게 한다).
   - 검사(`quotesFound`, `textQuotes`)의 대조 원문은 `passage` + `scenario` + 그림 요소 설명이다.
2. **`--targets all-false`**: 동결본 6지문의 모든 문항에서 `truth: FALSE` 선지를 전부 대상으로 한다. 순서는 지문 파일 이름순 → 문항 번호 → 선지 번호다. dry-run에서 61개여야 한다. 아니면 멈추고 보고한다.
3. **골드 수정 파일** `--gold-fixes <경로>`(선택). 형식은 다음과 같다.
   ```json
   { "version": 1, "items": [ { "passageId": "...", "question": 13, "choice": 2, "parts": [ /* 동결본 parts와 같은 형식 */ ], "reason": "...", "decidedBy": "...", "date": "YYYY-MM-DD" } ] }
   ```
   - 일치하는 항목이 있으면 그 선지의 동결본 `parts` 대신 이 `parts`로 입력을 만든다. `RUN.json`에 적용된 항목 목록과 파일 SHA-256을 남긴다.
   - `parts`의 `quote`를 모두 이으면 선지 문장에서 조사·어미·문장부호 말고는 빠지는 부분이 없어야 한다. 아니면 실행 전에 멈춘다. 검사 방식은 `run-choice-link.mjs`의 `validateChoiceLink`에서 조각 덮기 검사 부분을 참고한다.
   - 빈 파일 `docs/experiments/examiner-strategy-2026-10-23/gold-fixes.json`(`{"version":1,"items":[]}`)을 만들어 둔다.
4. **검토용 대조표** `REVIEW-SHEET.md`(생성 실행 끝에 `--out` 아래에 쓴다. dry-run에서는 글 칸을 비운다). target마다 다음 절을 둔다.
   - 제목: `<passageId> <번호>번 <선지 기호>`, 발문 극성
   - 선지 문장
   - **공식 해설**: 대상 선지 해설과 문항 해설 요약
   - **골드**: 조각마다 맞음/틀림. 틀림이면 `twistType`, `twistDetail`, `evidenceQuote`도 적는다. 골드 수정이 적용됐으면 그렇다고 표시한다.
   - **생성 글**(`text` 그대로), 그리고 각 비튼 조각의 `trapIntent`
   - **자동 검사** 요약(형식, 인용 실재, 원문에 없는 따옴표 구간, 금지어, 존댓말)
   - **판정** 칸: `- [ ] 통과 / - [ ] 글 수정 필요 / - [ ] 골드 의심` 과 빈 메모 줄. 코드 에이전트가 손으로 채운다.
5. **상한 기본값**: `--max-requests`·`--usd-cap` 인자를 지금처럼 받는다(새 기본값은 만들지 않는다).

### `scripts/run-examiner-strategy.test.mjs`

기존 28개는 그대로 통과해야 한다. 추가로 다음을 확인한다.

- `--targets all-false` 확장 결과가 61개이고, 법인 13번 ②·표면 장력 16번 ②가 포함된다.
- `--source raw` 입력(법인 13번 ②)의 `passage`·`scenario`·`choices`·`answer`가 기존 `sessions` 입력과 내용상 같다. 글자 단위로 다르면 그 차이를 테스트 이름에 적고 보고한다.
- `officialExplanation.choice`가 대상 선지 해설이다.
- 그림이 있는 문항(mRNA 19번)의 요청에 `input_image`가 붙고, 저장된 요청 파일에는 data URL이 없다.
- 골드 수정 적용과, 조각 덮기 위반으로 멈추는 경우.
- `REVIEW-SHEET.md`에 대상마다 공식 해설·골드·판정 칸이 있다.

## 완료 조건

- [ ] `node --test scripts/run-examiner-strategy.test.mjs` 통과(기존과 추가 모두).
- [ ] 아래 dry-run이 요청 61개, `RUN.json`, `REVIEW-SHEET.md`(글 칸 비움)를 만들고 예약 비용 합계를 출력한다. 외부 전송은 0회다.

```
node --env-file=.env scripts/run-examiner-strategy.mjs --dry-run --source raw --targets all-false \
  --conditions v4=docs/experiments/examiner-strategy-2026-10-23/PROMPT-v4.md --schema v2 --source-quotes \
  --gold-fixes docs/experiments/examiner-strategy-2026-10-23/gold-fixes.json \
  --runs 1 --models gpt-6.1-sol --max-requests 130 --usd-cap 3 \
  --out docs/experiments/examiner-strategy-2026-10-23/dry-run-full
```

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고, 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전에 멈춘다(별도 승인 필요).
- 파일을 삭제(`rm` 등)하지 않는다. git commit·add·stash를 하지 않는다. `.env` 키 값을 출력하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/run-examiner-strategy.mjs`: `--source raw`(`rawSource`), `--targets all-false`(`allFalseTargets`), `--gold-fixes`(`loadGoldFixes`, `assertPartsCover`), 그림 첨부(`buildRequest`의 `images`, 저장 요청은 `redactImages`), `REVIEW-SHEET.md`(`renderReviewSheet`), 검사 대조 원문에 그림 요소 설명 추가, `RUN.json`에 `source`·`targetCount`·`imageRequests`·`goldFixes` 추가.
  - `scripts/run-examiner-strategy.test.mjs`: 7개 추가.
  - `docs/experiments/examiner-strategy-2026-10-23/gold-fixes.json`(빈 파일), `docs/experiments/examiner-strategy-2026-10-23/dry-run-full/`(dry-run 산출물).
- 테스트 결과: `node --test scripts/run-examiner-strategy.test.mjs` 35개 통과(기존 28 + 추가 7), 실패 0.
- dry-run: 요청 57개(61 아님, 아래 1), 외부 전송 0회, 예약 비용 합계 약 $11.45(gpt-6.1-sol만, `--usd-cap 3` 초과로 `overCap: true`), 그림 붙은 요청 5개(공손룡 13번 ①②③⑤ 4개 + mRNA 19번 ⑤ 1개 → 요청 파일에는 base64 생략 표기만 있음), `missingIds` 4건(information-asymmetry-free-marketplace 10번 ①③④⑤의 `TOP`; 기존 동작과 같다).
- sessions 입력과 raw 입력의 차이(법인 13번 ②): 지문·발문·선지·정답·target.parts는 글자 단위로 같다. 다른 것: (1) `scenario`는 sessions가 공백으로, raw가 줄바꿈으로 조각을 잇는다(줄바꿈을 공백으로 바꾸면 같다). (2) `supplementSegments`는 sessions 5개(동결본 extra), raw 9개(extra 5 + 원자료 S1~S4). (3) `textAnnotations`는 sessions 2개(location·marker·start/end·앞뒤 문맥 포함), raw 3개(kind·style·text만, 상자 표시 "재단 법인" 포함). (4) `officialExplanation`은 sessions가 문자열 하나, raw는 `{choice, summary}`.
- 남은 문제:
  1. **대상 개수 57 (인계 문서·D-0170은 61)**: 동결본은 6지문 24문항·120선지이고 `truth: FALSE`는 57개(법인 7, 도파민 10, 공손룡 10, 정보 비대칭 10, mRNA 11, 표면 장력 9)다. D-0170의 "25문항 61개(부정 13 + 긍정 12×4)"는 문항 수가 하나 많다. 인계 문서 규칙대로 멈추고 보고한다. 코드는 동결본 그대로 57개를 뽑는다.
  2. 예약 비용 $11.45가 `--usd-cap 3`을 넘는다(요청당 출력 16000토큰 상한 기준 예약). 실제 실행 전 상한을 정해야 한다.
  3. 두 지문 세트(`section`) 표지 형식은 현재 6지문에 해당 세트가 없어 정하지 않았다. 해당 지문이 오면 `SECTION_MARKER_UNDEFINED`로 멈춘다.
  4. `TOP` id 4건은 원문 변환이 안 되어 입력에서 빠진다(기존 동작).
