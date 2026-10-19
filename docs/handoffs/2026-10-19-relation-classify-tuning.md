# 인계: 관계 유형 분류 단계 (16지문 다듬기용 실행)

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0147-relation-vocabulary-sampling.md`(보완: 1차 목록)
- 참고: `docs/review/relation-vocabulary-v1-2026-10-19.md`(1차 목록), `docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT.md`(지시문 v1), `scripts/run-analysis-stance-gongsun.mjs`(지도 뒤 별도 단계의 선례), `scripts/run-analysis-map-gongsun.mjs`

## 목표

- 표본 16지문의 지도 r1마다 관계 유형 분류 결과가 `docs/experiments/relation-classify-2026-10-19/tune-v1/<passageId>/`에 있다.
- Claude가 지시문을 다듬기 위해 읽을 `tune-v1/REPORT.md`가 있다.
- 검증 6지문은 이번 범위가 아니다(변환·지도·분류 모두 하지 않음, 열지 않음).

## 범위 밖

- `CLASSIFY-PROMPT.md`·지도·지문 파일 수정. 분류 결과의 해석·평가 문장(Claude가 한다).
- 지도 r2·r3 분류. 검증 6지문(D-0147 보완에 고정된 목록) 관련 모든 작업.
- `packages/**`, `memory/**`, `.omc/logs/**`, `/Users/mac/Projects/suneung_db`.
- 파일 삭제가 필요하면 `rm` 대신 실행 전에 멈추고 보고한다(사용자가 터미널 확인창을 받는다). dry-run 산출물은 처음부터 실험 폴더 밖(스크래치 또는 `--out`과 다른 하위 폴더 `dry-run/`)에 쓰고, 실제 실행 폴더와 겹치지 않게 한다.

## 손댈 파일과 계약

### 1. `scripts/run-relation-classify.mjs` (신규, + 테스트)

- 사용: `node --env-file-if-exists=.env scripts/run-relation-classify.mjs [--dry-run] --targets <json> --out <dir> [--prompt <path>]`.
  - `--targets`: `[{ passageId, passagesDir, mapPath }]` 배열 JSON 파일. 이번 실행용 파일은 `docs/experiments/relation-classify-2026-10-19/tune-v1/targets.json`으로 만든다(아래 3).
  - `--prompt` 기본값 `docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT.md`.
- 지시문: `## 지시문` 절 본문(`instructionsFrom` 재사용).
- 입력(user content, 직렬화는 지도 스크립트와 같은 2칸 들여쓰기 JSON):
  - `passageId`, `paragraphs`: 지도 스크립트 `buildInput(passage).paragraphs`와 같음(`section` 규칙 포함).
  - `relations`: 지도 `relations` 순서대로 `{ id, from: { id, kind, paragraphId, text }, to: { …같은 꼴 }, note }`. `kind`는 명제면 `"PROPOSITION"`, 노드면 노드의 `kind`. 노드의 `paragraphId`는 지도 값 그대로(null 가능). **관계의 `name`은 넣지 않는다.**
- 출력 스키마(strict): `{ passageId, items: [{ id, type, otherName, reason }] }`, `type`은 `CAUSE, PROCESS, CONDITION, MEANS_END, CONTRAST, CLASSIFICATION, GROUNDS, ELABORATION, APPLICATION, DEFINITION, CONCESSION, PROBLEM_RESPONSE, VIEW_DIFFERENCE, VIEW_AGREEMENT, CRITIQUE, INTERPRETATION, BACKGROUND, DEVELOPMENT, OTHER` 중 하나.
- 갈래 대응(코드 상수): 내용 `CAUSE PROCESS CONDITION MEANS_END CONTRAST CLASSIFICATION`, 논증 `GROUNDS ELABORATION APPLICATION DEFINITION CONCESSION PROBLEM_RESPONSE`, 관점 `VIEW_DIFFERENCE VIEW_AGREEMENT CRITIQUE INTERPRETATION`, 흐름 `BACKGROUND DEVELOPMENT`, 기타 `OTHER`. 한글 이름은 지시문 표기 그대로.
- 검증(`validateClassification`): 관계 id가 빠짐·중복·없는 id 없이 정확히 한 번씩, `passageId` 일치, `OTHER`이면 `otherName` 비어 있지 않음, 아니면 빈 문자열.
- 요청: 모델 `gpt-6.1-sol`, reasoning medium, strict JSON schema, 지문당 1요청, 재시도 없음, 타임아웃·비용 계산·원장(`START`/`END`)은 지도 스크립트 규칙 그대로(연결 오류는 $0, 응답 없으면 예약액).
- 상한: 요청 16, 실제 청구 $2. 누적이 상한에 닿을 요청은 보내지 않는다.
- 산출물(지문마다 `<out>/<passageId>/`): `classify.raw.json`, `classify.json`, `classify.validation.json`(`flag: 'wx'`). 전체: `<out>/ledger.jsonl`, `<out>/RUN.json`(지시문 해시 전후, 입력 해시, 지문별 결과), `<out>/REPORT.md`, `<out>/summary.json`.
- `<out>`에 `ledger.jsonl`이나 `RUN.json`이 있으면 거부(`RUN_EXISTS`).

### 2. `REPORT.md`·`summary.json`

- 전체 요약: 관계 수, 유형별·갈래별 수와 비율, `OTHER` 수·비율과 `otherName` 목록.
- 지문별 표: 관계 수, 갈래별 수, `OTHER` 수.
- 지문별 관계 전체 표(Claude 검토용): `id | from 문장 | to 문장 | 지도의 원래 name | 분류 유형(한글) | reason`. 원래 `name`은 보고서에만 쓰고 요청에는 넣지 않는다.
- 원래 `name` × 분류 유형 교차표(자주 나온 이름 상위 30개).

### 3. 대상 16지문 (`tune-v1/targets.json`)

| passageId | passagesDir | mapPath |
|---|---|---|
| gongsun-long-later-mohists | `packages/pipeline/fixtures/experiments/dialogue/passages` | `docs/experiments/analysis-map-gongsun-2026-10-16/runs/map-r1.json` |
| dopamine-motor-control | 같음 | `docs/experiments/analysis-map-dopamine-2026-10-18/runs/map-r1.json` |
| corporate-law, information-asymmetry-free-marketplace, mrna-vaccine-lipid-nanoparticle, surface-tension-laplace | 같음 | `docs/experiments/analysis-map-sample-2026-10-19/<passageId>/runs/map-r1.json` |
| fear-appeal-persuasion, blockchain-features, shapley-value, diffusion-model-ai, tax-incidence, neoclassicism-romanticism-art, laozi-interpretations, schoenberg-twelve-tone, joseon-slavery-civil-rights, giddens-beck-risk-society | `docs/experiments/analysis-map-sample-2026-10-19/passages` | `docs/experiments/analysis-map-sample-2026-10-19/<passageId>/runs/map-r1.json` |

(`packages/…/passages`는 읽기만 한다.)

### 4. 테스트

- 입력 구성: `name` 미포함, `from`/`to` 문장·`kind` 채움, `section` 규칙, 관계 순서 보존.
- 검증: 빠짐·중복·없는 id·`otherName` 규칙·`passageId` 불일치.
- 상한·`RUN_EXISTS` 거부, 가짜 transport로 전체 흐름(산출물 파일 생성, 보고서 렌더).
- 지도 스크립트 기존 테스트 전부 통과.

## 완료 조건

- [ ] `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 통과.
- [ ] dry-run: 16지문 입력 구성 성공, 지문별 관계 수·예약액 합계 보고. 예약액 합계가 $2를 넘으면 실제 실행 전에 멈추고 보고.
  - (Claude 수정, 2026-10-19) 예약액은 요청 바이트 전체를 입력 단가로, 출력 상한 10000 전액을 더한 보수적 값이라 합계($2.799)가 실제 청구 예상($1~1.5)보다 크다. 합계 조건은 실행 중지 사유에서 뺀다. $2 상한은 실행 중 "실제 누적 청구 + 다음 요청 예약액 ≤ $2" 검사로 지킨다(닿으면 남은 지문은 보내지 않고 보고). `max_output_tokens` 10000 유지.
- [ ] 실제 실행 16요청, 실패 0, 검증 16개 모두 통과, 실제 청구 ≤ $2. 실패가 있으면 재시도하지 않고 보고.
- [ ] `CLASSIFY-PROMPT.md`·지도 파일·지문 파일 해시 전후 동일, `packages/**`·`memory/**`·`suneung_db` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 파일 삭제가 필요해지면 멈추고 보고한다.
- 외부 전송 승인 범위: 사용자 승인(D-0147 보완에 기록) — 위 16지문의 원문과 지도 r1 관계(이름 제외), `gpt-6.1-sol` medium, 지문당 1회, 재시도 없음, 합계 16요청·$2. 그 밖의 전송은 실행 전에 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-relation-classify.mjs`, `scripts/run-relation-classify.test.mjs`(신규), `docs/experiments/relation-classify-2026-10-19/tune-v1/`(targets.json, 지문별 classify.*, ledger.jsonl, RUN.json, REPORT.md, summary.json), `docs/experiments/relation-classify-2026-10-19/dry-run/`(dry-run 요청 16개), 이 문서의 결과 보고 절.
- 테스트 결과: `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 66건 통과, 실패 0.
- dry-run: 입력 구성 16/16 성공, 예약액 합계 $2.799(Claude 수정에 따라 중지 사유 아님).
- 실제 실행: 16요청, 전부 PARSED, 검증 16/16 통과, 총 청구 $0.7727(상한 $2 이내), stop 없음, 재시도 없음. OTHER 0건(전 지문).
- 해시: promptUnchanged true, protectedFilesUnchanged true(지도·지문 파일 해시 전후 동일, `RUN.json` 기록).
- 남은 문제: OTHER가 16지문 모두 0건이라 지시문 v1에 새 유형이 필요한지는 REPORT.md의 유형 분포·reason을 Claude가 읽고 판단해야 한다.
