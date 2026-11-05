# 인계: SNS 진단 세트 E의 판정용 원자료 묶음(③′)

- 날짜: 2026-11-05
- 작성: Claude(코드 에이전트)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0201-sns-diagnostic-set-e.md`, `memory/decisions/D-0202-current-student-version-discarded.md`.
  절차: `docs/SNS-DIAGNOSTIC-SET-PROCEDURE-2026-11-05.md` ③′. 사용자 승인(2026-11-05, 설계 초안 (1) ㄱ·(2) 별도 폴더·(3) 한 파일 안 나누기에 "동의").

## 목표

1. 수능 DB와 trainer 기록에서 판정용 원자료 묶음을 만드는 변환 스크립트 `scripts/build-runtime-bundles.mjs`가 있다.
2. 그 스크립트로 기존 6문항 묶음을 다시 만들면, 해설(`officialExplanation`)을 뺀 칸이 기존 손 작성본과 같거나 차이가 모두 설명된다.
3. 세트 E 16문항과 4지문의 묶음이 `packages/pipeline/fixtures/experiments/sns-diagnostic/`에 있다.

## 범위 밖

- 외부 API 호출·외부 전송 없음. `.env`를 읽지 않는다.
- 기존 fixture(`fixtures/experiments/problem-solving/**`, `fixtures/experiments/dialogue/**`)는 **읽기만** 한다. 6문항 재생성 결과는 작업 폴더에만 쓴다.
- 앱 코드(`packages/*/src/**`) 연결, 목록 필터, 지문당 여러 문항 흐름은 하지 않는다(절차 ⑥).
- 파일 삭제 금지. `git add`·`commit`·`stash` 금지. `memory/**`, `AGENTS.md`는 건드리지 않는다.

## 입력

- 수능 DB: `/Users/mac/Projects/suneung_db/output/passages/<set_id>.json`(`full_text`, `sections`, `elements`, `annotations`, `exam`),
  `.../questions/<set_id>.json`(`questions[].number`, `prompt_blocks`, `choices`, `supplement.elements`(기호 범위 start/end/text), `images`),
  이미지 `.../assets/<set_id>/img_*.png`.
- 정답·해설: `/Users/mac/Projects/csat-literacy-trainer/data/enrichment/records/<set_id>.json`
  (`questions[].correct_choice`, `official_explanation.detailed_explanation_ko`, `official_explanation.choice_explanations`).
- 기존 손 작성본(비교 기준): `fixtures/experiments/problem-solving/public/<questionId>.json`, `.../source-direct-runtime-v1.json`,
  `fixtures/experiments/dialogue/passages/<passageId>.json`.

## 손댈 파일과 계약

### `scripts/build-runtime-bundles.mjs` (새 파일) + `scripts/build-runtime-bundles.test.mjs`

사용법: `node scripts/build-runtime-bundles.mjs --config <json> --out <dir>`

설정 파일 한 항목: `{ "passageId", "setId", "questions": [<번호>...], "sections"?: [{ "label": "가", "idPrefix": "ga" }, ...] }`.

출력(`<out>/`):

1. `public/<passageId>-q<번호>.json`: 기존 public 묶음과 **같은 필드**(`questionId`, `questionNumber`, `passageId`, `title`, `exam`,
   `passage`, `stem`, `scenario`, `media`, `choices`, `textAnnotations`). `choices`는 `{choiceId: "C1".., position, text}`.
   `textAnnotations`는 기존과 같은 형식(`location` PASSAGE/SCENARIO, `marker`, `style`, `start`, `end`, `text`, `contextBefore`, `contextAfter`).
   `media`는 기존 mRNA 묶음의 형식을 따르고 이미지 파일은 `<out>/media/`에 복사한다.
2. `runtime-reference.json`: `{ "schemaVersion": "source-direct-problem-reference-catalog-v1", "questions": [...] }`. 항목은 기존과 같은
   필드(`schemaVersion: source-direct-problem-reference-v1`, `questionId`, `stemPolarity`, `answerChoiceId`, `officialExplanation`).
   - `answerChoiceId`: trainer `correct_choice` → `C<n>`.
   - `stemPolarity`: 발문에 "적절하지 않은"·"않은 것은"·"틀린"이 있으면 `SELECT_INCORRECT`, 아니면 `SELECT_CORRECT`. 기존 6문항 값과 대조한다.
   - `officialExplanation`(방안 ㄱ): `detailed_explanation_ko` 전문 + 줄바꿈 + 정답 선지의 `choice_explanations` 문장. 줄이거나 고치지 않는다.
3. `passages/<passageId>.json`: 기존 dialogue 지문 파일과 같은 필드(`schemaVersion`, `passageId`, `title`, `exam`, `questionRange`,
   `problemQuestionId`, `source`, `notes`, `paragraphs[{paragraphId, position, text}]`). `problemQuestionId`는 설정의 첫 문항을 넣고
   `notes`에 "연결 문항 전체: …"를 적는다. 복합 지문은 한 파일에 두고 `paragraphId`를 `<passageId>-ga-p1`, `<passageId>-na-p1`처럼 나눈다.
   `source`는 `{ status: "exact-local-source", sourceId: <set_id>, sourcePath: <DB passages 경로> }`.

### 설정 두 개

- `docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/config-existing6.json`: 기존 6문항(아래 표).
- `.../config-set-e.json`: 세트 E(아래 표).

| passageId | set_id | 문항 |
|---|---|---|
| corporate-law | 69bbf88d8937cf14551903ca | 13 |
| dopamine-motor-control | 69c28579d58cf540a9bc25eb | 13 |
| information-asymmetry-free-marketplace | 6a213e9386fd308968e100b3 | 13 |
| surface-tension-laplace | 6a213ea086fd308968e101df | 16 |
| mrna-vaccine-lipid-nanoparticle | 69c08f1d78128b2a9bedf236 | 19 |
| gongsun-long-later-mohists | 69c011fd78128b2a9beddd5e | 12 |

| passageId (세트 E) | set_id | 문항 | 비고 |
|---|---|---|---|
| consciousness-cognition | 69c0114f78128b2a9bedd8fc | 12, 13, 14, 15, 16 | 복합 (가)(나), 17번 어휘 제외 |
| horse-race-reporting | 69c0041afa5063deffe1a036 | 4, 5, 6, 7 | 7번 〈보기〉 이미지 |
| plastic-polymerization | 69bc1c89a029f488d9e54e5b | 8, 9, 10 | 11번 어휘 제외 |
| audio-perceptual-coding | 69bc96468095df3b8c51460e | 14, 15, 16, 17 | 17번 〈보기〉 이미지 |

mRNA set_id는 `69c08f1d78128b2a9bedf236`이다(DB passages에서 확인).

## 실행 순서

1. 스크립트·테스트 작성.
2. 기존 6문항 재생성: `--config config-existing6.json --out docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/existing6/`.
   기존 손 작성본과 칸별로 비교해 `COMPARE-existing6.md`에 적는다(같음/다름, 다르면 원인).
3. 기호 표지 대조: `scripts/audit-problem-source-markers.mjs`(읽기 전용 기본 모드)를 재생성본에 적용할 수 있으면 적용하고 결과를 적는다.
   입력 경로를 받지 않으면 같은 대조(범위 문자열 = `text`)를 테스트에 넣는다.
4. 세트 E 생성: `--config config-set-e.json --out packages/pipeline/fixtures/experiments/sns-diagnostic/`.

## 완료 조건

- [ ] `node --test scripts/build-runtime-bundles.test.mjs` 통과(극성 규칙, 정답 변환, 기호 범위 = 원문 문자열, 복합 지문 문단 id)
- [ ] `COMPARE-existing6.md`: 6문항 × 해설 외 칸 비교표. 다른 칸은 원인(예: 원자료가 trainer 구 수집본 vs 새 DB)을 적음
- [ ] 세트 E: public 16개, `runtime-reference.json` 16항목, passages 4개, media 2개. 모든 기호 범위가 원문 문자열과 일치
- [ ] 세트 E 정답 16/16이 메가스터디 정답(`docs/experiments/sns-diagnostic-candidates-2026-11-05/candidates.json` `items[].answer`)과 일치
- [ ] `npm test` 기존 상태 유지(새 실패 없음)

## 중단·보고 조건

- 기존 6문항 재생성에서 **지문·발문·선지 본문**이 공백 차이를 넘어 다르면 세트 E 생성 전에 멈추고 보고한다(원자료 출처 문제일 수 있음).
- DB에 기호 범위가 없거나 범위 문자열이 원문과 어긋나는 문항이 있으면 고치지 말고 목록으로 보고한다.
- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/build-runtime-bundles.mjs`, `scripts/build-runtime-bundles.test.mjs`,
  `docs/experiments/sns-diagnostic-runtime-bundles-2026-11-05/{config-existing6.json,config-set-e.json,COMPARE-existing6.md,existing6/**}`,
  `packages/pipeline/fixtures/experiments/sns-diagnostic/**`(public 16, runtime-reference.json 16항목, passages 4, media 2).
- 결정 반영: DB 원문 정본(각주·별표 유지, 기호 문자 미삽입). media url은 DB `source_url`, `contentHash`는 DB `sha256`, 로컬 복사 유지.
  `paragraph_block` 기호((가)/(나) 구획 표지)는 라벨 줄로 이미 들어가 있어 주석에서 제외했다(범위가 여러 문단에 걸쳐 매핑 불가).
- 테스트 결과: `node --test scripts/build-runtime-bundles.test.mjs` 8개 통과, 0 실패. `npm test`(vitest) 1534 통과, 2 실패 --
  `packages/app/src/boundary.test.ts`(server/student-state.ts의 node:fs import)와 `axis-architecture-experiment.test.ts`(.omc/adhoc 파일 없음). 둘 다 기존 실패.
- 세트 E 확인: 이슈 0건. 기호 주석 71개 모두 원문 범위 = text. 정답 16/16이 candidates.json(setId·번호로 대조)과 일치.
- 남은 문제: 없음(아래 보고 전용 목록은 채팅 보고 참조).
