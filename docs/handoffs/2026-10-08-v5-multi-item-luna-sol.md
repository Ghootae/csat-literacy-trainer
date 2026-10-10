# 인계: v5 다문항 시험(gpt-6-luna·gpt-6.1-sol)

- 날짜: 2026-10-08
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0093-v5-composition-auto-gloss-pipeline.md`, `memory/decisions/D-0085-relation-only-rationale-sufficient.md`
- 설계안: `docs/review/v5-multi-item-luna-sol-design-2026-10-08.md`(사용자 동의 2026-10-08, mRNA 기대값 포함)

## 목표

- 5문항 30응답 × 3반복을 두 모델(`gpt-6-luna`, `gpt-6.1-sol`, reasoning effort medium)로 판정하는 실행기를 만든다.
  `prepare`(고정·자체 시험, API 0), `preflight <model>`(그림 입력 확인 1요청), `run <model>`(본 실행)을 지원한다.
- 이번 작업에서 Codex는 **API를 호출하지 않는다.** 실행은 Claude가 사용자 승인 후 한다.

## 범위 밖

- 운영 판정기 코드·프롬프트·UI·서버(`packages/**` 소스, `source-direct-problem-feedback-v4*.md`) 수정 금지. `packages/pipeline/dist`는 읽기만 한다.
- 해석본(GLOSS_BLOCK), 원문 대입 확인(SUBST_BLOCK), REPAIR 경로, 공급자 어댑터(`scripts/lib/provider-adapter.mjs`) 사용.
- `.env` 열람, 외부 API 호출, 커밋·푸시.
- 기존 실험 폴더의 파일 수정(읽기만 한다).

## 손댈 파일과 계약

### 1. `docs/experiments/v5-multi-item-luna-sol-2026-10-08/cases.json`(prepare가 생성)

- 기존 24응답: `docs/experiments/problem-feedback-v4-hardening-2026-10-01/cases.json`의 `cases`를 `id·questionId·choiceId·rationale·expected·basis`
  그대로 복사한다(수정 금지). 같은 폴더 `FROZEN.json`의 해당 파일 해시와 일치하는지 확인한다.
- mRNA 6응답(`questionId: mrna-vaccine-lipid-nanoparticle-q19`, 정답 C5, 부정 발문). 기대값은 아래 그대로 쓴다.

| id | choiceId | rationale | expected |
|---|---|---|---|
| M1 | C5 | 투석으로 pH가 높아지면 이온화 지질이 중성이 된다는 건 지문에 있지만, 소수성이 약해져 인력이 줄고 더 작은 복합체가 생긴다는 내용은 지문에도 보기에도 없어요. 그래서 5번이 적절하지 않아요. | gate RECONSTRUCTABLE, verdict INVALID, consistency CONSISTENT, content [SUPPORTED], phase COMPLETED, outcome VERIFIED_CORRECT |
| M2 | C5 | pH가 높아지면 수소 이온 농도가 높아져서 이온화 지질이 양전하를 띠게 돼요. 그러니까 소수성이 약해진다는 5번은 틀렸어요. | gate RECONSTRUCTABLE, verdict INVALID, consistency CONSISTENT, content [ERROR], phase AWAITING_CORRECTION, errorKinds [CONTENT], minErrors 1 |
| M3 | C5 | 그림을 보면 mRNA 용액과 에탄올 용액이 한 입구로 같이 들어가서 처음부터 섞여 있어요. 5번의 소수성이 약해져 더 작은 복합체가 생긴다는 건 지문에 근거가 없으니 틀렸어요. | M2와 같음 |
| M4 | C3 | 이온화 지질은 pH가 높을 때 양전하를 띠니까, 산성 용액과 섞이면 양전하를 띤다는 3번이 적절하지 않아요. | M2와 같음 |
| M5 | C5 | 이온화 지질은 용액의 pH에 따라 양이온성이 달라져요. | gate UNKNOWN, verdict UNKNOWN, consistency UNKNOWN, content [UNKNOWN, INSUFFICIENT], phase COMPLETED, outcome UNVERIFIED_CORRECT |
| M6 | C4 | 투석하면 pH가 높아져 수소 이온 농도가 낮아지고, 그러면 이온화 지질이 전기적으로 중성이 되니까 4번은 맞는 설명이에요. | gate RECONSTRUCTABLE, verdict VALID, consistency MISMATCH, content [SUPPORTED], phase AWAITING_CORRECTION, errorKinds [SELECTION_EXECUTION] |

- `basis`: M1 정상, M2 pH·수소 이온 방향 역전, M3 그림의 입구 오독(판정기에는 alt가 가지 않으므로 그림을 읽어야만 잡힌다), M4 오답 선택+양이온화 방향 역전,
  M5 참이지만 선지와 연결 없음, M6 맞는 근거와 선택 충돌. `expectationAuthor: "Claude, user-confirmed 2026-10-08"`.

### 2. `scripts/test-v5-multi-item-models.mjs`

- 구조는 `scripts/test-v5-provider-compare-gongsun.mjs`를 따른다. 다른 점만 적는다.
- **원자료:** `scripts/test-problem-feedback-v4-hardening.mjs` 25~39행과 같은 방식으로 문항마다
  `public/<questionId>.json` + `source-direct-runtime-v1.json`(정답·발문 극성·공식 해설)을 `SourceDirectProblemBundleSchema`로 합친다.
  그림 금지 검사(`source.media.length`)는 넣지 않는다. mRNA는 `media` 1개를 쓰되, **운영 앱과 같게** `packages/app/src/server/content.ts` 132~139행처럼
  `mediaId·url·mimeType·width·height·contentHash(있을 때)·placement`만 옮기고 `alt`는 뺀다(2026-10-08 Codex 보고로 확인한 설계 공백, Claude 결정: 운영 동작을 따른다). 원자료는 **현재** fixture를 쓴다(그 뒤 기호 주석 등이 바뀌었을 수 있음).
  4문항에 대해 hardening `sources.json`과 필드별 차이(같음/다름과 바뀐 필드 이름)를 `FROZEN.json`의 `sourceDiffVsHardening`에 기록만 하고, 다르다고 멈추지 않는다.
- **지시·스키마:** 공급자 비교와 같다. `instructionsFor(v5, 'v5_methods')`, `extendedSelectionSchema`, `transformRequest(..., arm: 'v5_methods')`,
  `validateClaims` 후 `studentClaims`를 뺀 출력을 운영 검증에 넘긴다. CONCLUSION_AUDIT·COACHING 요청은 지시·스키마를 바꾸지 않는다.
- **전송:** OpenAI 직접 호출. `scripts/test-v5-substitution-check-models.mjs`의 `new OpenAI({ maxRetries: 0 })` 방식과 같고 `reasoning: { effort: 'medium' }`.
  시험용 `transport` 주입을 받는다. 그림은 운영 평가기가 만드는 `input_image`(`detail: 'high'`)를 그대로 보낸다.
- **모델:** 인자로 `gpt-6-luna` 또는 `gpt-6.1-sol`만 받는다. `maxOutputTokens` 8000, `maxRetries` 1, `timeoutMs` 90000.
- **일정:** 응답 30개 × 반복 3. 공급자 비교처럼 반복마다 순서를 돌린다. 칸 이름 `<id>-r<n>`.
- **상한:** luna 130요청·1.5달러, sol 130요청·6달러. 예약 비용 방식은 공급자 비교와 같다. 넘으면 `RUN_LIMIT`로 멈추고 칸을 저장하지 않는다.
- **가격(100만 토큰당):** luna 입력 0.10·출력 0.50, sol 입력 2·출력 10. 캐시 입력 가격은 받지 않았으므로 캐시 토큰도 입력 가격으로 보수 계산하고
  `cachedTokens`를 따로 기록한다. 출처 표기: `user-supplied official prices 2026-10-07`.
- **원장:** START/END/ERROR, START만 있고 END 없으면 재개 거부. 정책 거부(HTTP 400)는 우회·재전송하지 않고 칸을 `POLICY_REFUSAL`로 저장한다(재시도로 다시 보내지 않음).
- **기대 검사:** `scripts/test-problem-feedback-v4-hardening.mjs` 105~113행의 검사(gate·verdict·consistency·phase·outcome·content·errorKinds·minErrors)를 같은 의미로 구현한다.
- **preflight `<model>`:** M1 한 칸과 같은 요청을 1회 보낸다. 저장 `preflight-<model>.json`: 요청에 `input_image`가 있었는지, 응답 상태,
  `usage`(입력 토큰이 텍스트만일 때보다 커졌는지 판단할 수 있게 그대로), 운영 검증 통과 여부. 기존 파일이 있으면 거부.
- **prepare:** 원자료·응답·지시·스키마·파일 해시를 `FROZEN.json`·`prompts.json`·`sources.json`·`cases.json`으로 고정. 이후 run은 바뀌면 거부.
- **결과:** 모델별 폴더 `<model>/`에 칸 파일, `requests.jsonl`, `RESULTS.json`(문항별·응답별 기대 일치, 형식 오류, 재시도, 칸·요청 지연 중앙값·p90, 토큰, 비용, 실제 응답 모델).

### 3. `scripts/build-v5-multi-item-review.mjs`

- `scripts/build-v5-provider-compare-review.mjs`와 같은 방식. 묶음은 모델 × 문항 10개, 시드 고정 셔플, id 접두어는 모델·문항마다 겹치지 않게.
- 항목 필드: `studentResponse`, `choiceId`, `contentAssessment`, `reconstructability`, `phase`, `reason`, `reconstructedPath`, `studentClaims`, `errors`(description·question),
  `selectionMismatchQuestion`, `coaching`(**자르지 않음**). 판정 없는 칸은 `status`·`error`만.
- 출력 `docs/experiments/v5-multi-item-luna-sol-review-2026-10-08/REVIEW-blind-packet-<prefix>.json`, `REVIEW-blind-key-<prefix>.json`.

### 4. 테스트 `scripts/test-v5-multi-item-models.test.mjs`

- 가짜 transport로: prepare 고정, 칸 저장, 기대 검사(M5·M6 포함), 그림 요청에 `input_image` 포함, 정책 거부 처리, 상한 정지, 미완료 원장 재개 거부.
- 실제 docs 폴더가 아닌 임시 폴더를 쓴다.

## 완료 조건

- [x] `node scripts/test-v5-multi-item-models.mjs prepare` 성공, `cases.json` 30개, 외부 요청 0.
- [ ] `node --test scripts/test-v5-multi-item-models.test.mjs` 통과, 기존 `npm test` 통과.
- [x] 리뷰 묶음 생성기는 가짜 결과 폴더로 시험(실제 결과 폴더는 아직 없음).
- [x] 변경 파일 목록과 설계와 다른 점(없으면 "없음")을 아래에 적는다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- hardening `cases.json`이 그 폴더 `FROZEN.json`의 해시와 다르거나, 카탈로그에 mRNA 정답이 C5가 아니면 멈춘다.

## 결과 보고 (실행 후 작성)

- 상태: **구현·prepare·전용 테스트 완료, 전체 완료 조건은 미충족 — npm test의 범위 밖 실패 2건** (Codex, 2026-10-08). Claude의 인계 대비 diff 검토 대기. 실제 모델 실행은 하지 않았다.
- 변경·납품 파일:
  - 신규 `scripts/test-v5-multi-item-models.mjs`: 기존 초안을 완성. 운영 앱과 같은 media 필드만 옮겨 alt를 제외하고, M3 basis를 갱신된 인계와 맞췄다. prepare/preflight/run, 고정 해시, 이미지 전달, 원장·예약 비용·상한, 정책 거부 처리, 결과 집계를 가짜 transport로 검증했다.
  - 신규 `scripts/build-v5-multi-item-review.mjs`: 기존 초안을 그대로 검증 완료. 이번 재개에서 추가 수정 없음. 모델 × 문항 10묶음, 고정 셔플, 고유 id, 코칭 전문을 보존한다.
  - 신규 `scripts/test-v5-multi-item-models.test.mjs`: media에서 alt 제외·이미지 보존 검증 추가. 초안 가짜 응답의 C1 오류 수를 기존 기대값 minErrors 2에 맞추고, 코칭 재시도 시험을 코칭이 실제 사용되는 C4로 옮겼다. 판정 기대값은 변경하지 않았다.
  - 신규 `docs/experiments/v5-multi-item-luna-sol-2026-10-08/FROZEN.json`
  - 신규 `docs/experiments/v5-multi-item-luna-sol-2026-10-08/prompts.json`
  - 신규 `docs/experiments/v5-multi-item-luna-sol-2026-10-08/sources.json`
  - 신규 `docs/experiments/v5-multi-item-luna-sol-2026-10-08/cases.json`
  - 수정 `docs/handoffs/2026-10-08-v5-multi-item-luna-sol.md`: 완료 조건 체크와 결과 보고 갱신.
- 검증 결과:
  - `node scripts/test-v5-multi-item-models.mjs prepare`: 성공, 5문항·30응답·모델당 90칸, 외부 요청 0. 실제 실험 폴더에는 위 준비 산출물 4개만 있다.
  - hardening cases.json SHA-256은 FROZEN.json의 `36ed6fdd396ce90756da8aee181c0687e5ac29aa5a0e0559e4a58873b259bf23`과 일치. 기존 24응답의 지정된 6필드 보존을 테스트했다.
  - 현재 카탈로그의 mRNA 정답 C5·극성 SELECT_INCORRECT 확인. media 1개이며 alt는 원자료에서만 보존되고 판정 입력에서는 제외된다. 요청의 `input_image`와 `detail: high`를 검증했다.
  - 기존 4문항 원자료는 hardening 대비 모두 `textAnnotations`만 다르며, 필드별 결과를 `FROZEN.json.sourceDiffVsHardening`에 기록했다.
  - `node --test scripts/test-v5-multi-item-models.test.mjs`: **10/10 통과**. 임시 폴더·가짜 transport만 사용했다. 두 모델 각각 90칸 저장·기대 일치, M5/M6 분기, 정책 거부 무재전송, 요청·비용 상한 시 칸 미저장, 미완료 원장 재개 거부, 고정 산출물 변경 거부를 검증했다. 이는 배선 검증이며 실제 모델 정확도 결과가 아니다.
  - 리뷰 생성: 임시 가짜 결과로 **10묶음·180항목**, id 중복 없음, 재생성 동일, 긴 코칭 전문 보존, 실패 칸 status/error 보존 확인. 실제 리뷰 폴더는 생성하지 않았다.
  - `npm test`: **102개 파일 중 100개 통과·2개 실패, 1024개 테스트 중 1022개 통과·2개 실패** (30.06초). 실패는 이번 변경 범위 밖이다.
    - `packages/app/src/boundary.test.ts:37`: `server/student-state.ts`의 `node:fs` import가 허용된 repository 파일 목록 밖이라 실패.
    - `packages/pipeline/src/cli/axis-architecture-experiment.test.ts:15`: `.omc/adhoc/paragraph-analysis-v3-1-six-3x-2026-08-26/run-1/hegel-aesthetics-absolute-spirit-p1.json` 누락(ENOENT).
- 남은 문제: 위 전체 테스트 실패 2건은 packages/** 수정 금지 및 이번 인계 범위 밖이므로 수정하지 않았다. 따라서 npm test 통과 완료 조건은 체크하지 않았다. 실모델 preflight/run 및 의미 검토는 후속 Claude 작업이다.
- 금지 사항 준수: 외부 API·모델 호출 0, .env 파일 열람·출력 및 node --env-file 사용 0, git commit/push/stash 0. packages/** 소스·판정기 프롬프트·기존 실험 폴더 파일은 수정하지 않았다. 프로젝트 memory 기록은 업무 분장에 따라 Claude에게 남겼다.
- 설계와 다른 점: **없음**. 갱신된 alt 제외 규칙을 그대로 구현했으며, 기존 테스트 실패를 우회하는 설계·범위 변경은 하지 않았다.
