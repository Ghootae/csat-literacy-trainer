# 인계: 관계 유형 분류 검증 단계 (검증 6지문 변환·지도·분류 준비)

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0147-relation-vocabulary-sampling.md`(보완: 분류 지시문 v2 고정과 검증 단계)
- 참고: `docs/handoffs/2026-10-19-relation-sample-expansion.md`(변환·지도 실행 선례), `docs/handoffs/2026-10-19-relation-classify-tuning.md`, `scripts/run-relation-classify.mjs`

## 목표

- 검증 6지문이 변환되어 `docs/experiments/relation-classify-2026-10-19/heldout/passages/`에 있다.
- 지문마다 지도 3회 결과가 `docs/experiments/relation-classify-2026-10-19/heldout/maps/<passageId>/`에 있다.
- 분류 스크립트가 지문당 지도 여러 개를 받을 수 있고, 18개 지도 대상 `heldout/targets.json`과 dry-run 결과가 있다.
- **분류 실제 실행은 하지 않는다.** Claude가 블라인드 표본을 먼저 기록한 뒤 직접 실행한다.

## 범위 밖

- 분류 실제 실행(외부 전송). 지시문(`MAP-PROMPT.md`, `CLASSIFY-PROMPT*.md`) 수정. 분류·지도 결과의 해석.
- **지도 결과를 넘어 분류 결과를 미리 보는 일은 없다**(dry-run 예시 분류는 고정값이라 괜찮다).
- `packages/**`, `memory/**`, `.omc/logs/**`, `suneung_db` 쓰기. git 쓰기 명령.
- `rm` 등 파일 삭제 금지. dry-run 산출물은 처음부터 실제 실행 폴더와 다른 폴더(`heldout/dry-run/…`)에 쓴다. 삭제가 필요해 보이면 멈추고 보고한다.

## 손댈 파일과 계약

### 1. 변환 (외부 전송 없음)

`node scripts/import-suneung-passage.mjs --set <set_id> --passage-id <id> --out-dir docs/experiments/relation-classify-2026-10-19/heldout/passages`

| passageId | set_id | 제목 |
|---|---|---|
| sf-film-society | 69bbf8bd8937cf1455190460 | 영화와 SF의 사회적 의미 (가나) |
| personal-identity | 69bff91378128b2a9bedcdc8 | 인격의 동일성 |
| law-interpretation-guarantee | 69bbef9a8937cf145518cb13 | 법 해석과 보증 계약 (가나) |
| etf-structure | 6a509b1386fd308968e163a9 | ETF의 개념·구조·유형 |
| audio-perceptual-coding | 69bc96468095df3b8c51460e | 오디오 신호 지각부호화 |
| apoptosis | 69bc1bbfa029f488d9e54956 | 세포자멸사 |

- 변환기가 거부하는 세트(이미지 등)가 있으면 그 지문은 멈추고 보고한다(대체 지문은 Claude가 정한다).
- 변환 뒤 지문별 문단 수(`paragraphs` 길이)와 각주(`notes`) 수를 보고한다.

### 2. 지도 생성 (외부 전송)

- 지문마다 dry-run: `node scripts/run-analysis-map-gongsun.mjs --dry-run --passages-dir docs/experiments/relation-classify-2026-10-19/heldout/passages --passage <id> --exp-dir docs/experiments/relation-classify-2026-10-19/heldout/dry-run/maps/<id> --paragraphs <n>`. 예시 지도 검증이 실패한 지문은 실행하지 않고 보고한다.
- 실제 실행: 같은 명령에서 `--dry-run`을 빼고 `--exp-dir docs/experiments/relation-classify-2026-10-19/heldout/maps/<id>`, `node --env-file-if-exists=.env`로. 지문당 3요청(스크립트 `LIMITS`), 재시도 없음.
- 합계 상한: 18요청, 실제 청구 $3. 누적 청구가 $3에 닿을 지문은 시작하지 않는다.
- 보고: 지문, 요청, 청구, 지도별 검증 통과, 관계 수.

### 3. `scripts/run-relation-classify.mjs` 확장 (+ 테스트)

- `targets.json` 항목에 선택 키 `key`를 둔다. 없으면 `passageId`(지금과 같음). 중복 검사·산출물 폴더(`<out>/<key>/`)·`RUN.json`의 `inputs`/`results`·보고서 지문별 표·`summary.json`의 `perPassage`는 `key` 기준. `results`·`perPassage` 항목에 `passageId`도 함께 남긴다.
- 기존 16지문 `tune-v1/targets.json`(키 없음)은 요청 본문이 바이트 단위로 그대로다(테스트로 확인).
- CLI에 `--max-requests <n>`, `--usd-cap <x>`를 더한다(기본값은 지금 `LIMITS`).
- 테스트: `key` 있는 대상 둘이 같은 `passageId`를 가질 때 폴더 분리·중복 거부는 `key` 기준, 키 없는 대상의 요청 본문 불변.

### 4. 검증 분류 대상과 dry-run

- `docs/experiments/relation-classify-2026-10-19/heldout/targets.json`: 6지문 × 지도 r1·r2·r3 = 18항목, `{ key: "<passageId>-r<n>", passageId, passagesDir: ".../heldout/passages", mapPath: ".../heldout/maps/<passageId>/runs/map-r<n>.json" }`. 지도 실행이 실패한 항목은 빼고 보고한다.
- dry-run: `--dry-run --targets .../heldout/targets.json --out docs/experiments/relation-classify-2026-10-19/heldout/dry-run/classify --prompt docs/experiments/relation-classify-2026-10-19/CLASSIFY-PROMPT-v2.md`. 항목별 관계 수·예약액 합계 보고(예약액은 보수적이라 합계가 $1.5를 넘어도 멈추지 않는다. 실제 실행 때 실행 중 검사로 지킨다).

## 완료 조건

- [ ] `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 통과.
- [ ] 변환 6개, 지도 18개(실패 0이 목표, 실패는 재시도 없이 보고), 지도 실제 청구 ≤ $3.
- [ ] 분류 dry-run 18항목 입력 구성 성공.
- [ ] `MAP-PROMPT.md`·`CLASSIFY-PROMPT*.md`·기존 실험 폴더(`tune-v1`, `tune-v2`, `analysis-map-*`) 변경 없음, `packages/**`·`memory/**`·`suneung_db` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다.
- 파일 삭제가 필요해지면 멈추고 보고한다.
- 외부 전송 승인 범위: 사용자 승인(D-0147 보완에 기록) — 이 단계에서 실행자는 검증 6지문 원문의 지도 생성만(`gpt-6.1-sol` medium, 지문당 3회, 재시도 없음, 18요청·$3). 분류 전송은 Claude가 한다. 그 밖의 전송은 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-relation-classify.mjs`(`key` 선택 키, `--max-requests`, `--usd-cap`), `scripts/run-relation-classify.test.mjs`(key 테스트 1건), `docs/experiments/relation-classify-2026-10-19/heldout/`(passages 6, maps 18, targets.json, dry-run). 기존 16지문 v2 dry-run 요청 본문은 새 스크립트 결과와 바이트 동일(16/16).
- 변환: sf-film-society 문단 7·각주 0, personal-identity 6·0, law-interpretation-guarantee 8·0, etf-structure 4·2, audio-perceptual-coding 5·0, apoptosis 5·0.
- 지도: 18요청, 실제 청구 합계 $2.1731, 18개 모두 검증 통과. 관계 수 sf 38/41/35, personal 37/34/29, law 37/33/40, etf 31/33/32, audio 33/31/31, apoptosis 36/36/36.
- 분류 dry-run: 18항목 입력 구성 성공, 예약액 합계 $3.1890(보수적).
- 테스트 결과: `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 67건 통과, 실패 0.
- 남은 문제: 없음.
