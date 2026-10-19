# 인계: 관계 표본 확장(수능 DB 지문 10개 지도 생성)

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0147-relation-vocabulary-sampling.md`(보완: DB 표본 확장)
- 참고: `docs/experiments/analysis-map-sample-2026-10-19/SAMPLE-SUMMARY.md`(6지문 1차 정리), `scripts/run-analysis-map-gongsun.mjs`

## 목표

- 수능 지문 DB(`/Users/mac/Projects/suneung_db/output/passages/{set_id}.json`)의 지정 세트 10개가 `dialogue-passage-v1` 형식으로 변환되어 `docs/experiments/analysis-map-sample-2026-10-19/passages/`에 있다.
- 각 지문의 지도 3회 결과가 `docs/experiments/analysis-map-sample-2026-10-19/<passageId>/`에 있다(지금 4지문과 같은 구성: `runs/map-r{1..3}.*`, `ledger.jsonl`, `RUN.json`, `MAPS.md`).
- 공손룡 등 기존 지문의 요청 본문은 바이트 단위로 그대로다.

## 범위 밖

- 지도 지시문(`MAP-PROMPT.md`) 수정. 입장 표시(stance)·판정 실행. 관계 이름 분류·해석(Claude가 한다).
- `packages/**`(다른 세션 작업 중, 지문 fixture 폴더 포함), `suneung_db` 쓰기, `memory/**`, `.omc/logs/**`.
- 검증용으로 떼어 둔 지문(D-0147 보완의 검증 6개) 변환·조회·전송. 열어 보지도 않는다.

## 손댈 파일과 계약

### 1. `scripts/import-suneung-passage.mjs` (신규, + 테스트)

- 사용: `node scripts/import-suneung-passage.mjs --set <set_id> --passage-id <id> --out-dir <dir>`. 외부 전송 없음.
- 입력: DB 세트 JSON. 출력: `<out-dir>/<passageId>.json`(`flag: 'wx'`, 덮어쓰기 금지).
- 출력 형식(기존 fixture와 같은 키):
  - `schemaVersion: "dialogue-passage-v1"`, `passageId`, `title`(= `exam.title`), `exam`(= `exam.label`), `questionRange`(= `exam.question_range`).
  - `source: { status: "suneung-db", sourceId: set_id, sourcePath: <DB 파일 절대 경로>, sourceFileHash: <sha256> }`.
  - `notes: []`.
  - `paragraphs`: `sections`를 `order`대로, 그 안의 `paragraphs`를 `order`대로 이어 붙인다. 위치는 전체에서 1부터. 각 항목 `{ paragraphId: "<passageId>-p<n>", position: n, text }`, 세트의 `sections`가 2개 이상이면 `section: <label>`(예: `"(가)"`)을 더한다. 단일 구역이면 `section` 키를 넣지 않는다.
  - `text`는 DB 문단 `text` 그대로(밑줄 기호 ⓐ·[A] 등 포함, 공백·문자 손대지 않음).
- 이미지가 있는 세트(`images` 비어 있지 않음)나 구역 라벨이 없는 다구역 세트는 오류로 멈춘다.

### 2. `scripts/run-analysis-map-gongsun.mjs` 확장

- 옵션 `--passages-dir <dir>` → `main({ passagesDir })`, 기본값 `PASSAGES_DIR`. `loadPassage(passagesDir, passageId)`로 읽는다.
- `buildInput`: 문단에 `section`이 있을 때만 `{ paragraphId, index, section, text }`(키 순서 이대로), 없으면 지금과 같다. 지시문은 바꾸지 않는다.
- 문단 수 검사(`--paragraphs`)는 그대로 쓴다.
- 지문당 상한(`LIMITS`: 3요청)·재시도 없음·`RUN_EXISTS` 거부는 그대로.

### 3. 대상 지문 10개 (Claude 지정)

| passageId | set_id | 제목 | 분야 | 구역 | 문단 |
|---|---|---|---|---|---|
| schoenberg-twelve-tone | 69bca4f58095df3b8c533979 | 쇤베르크의 12음 기법과 현상학적 미학 | 예술(음악)·철학 | (가)(나) | 9 |
| neoclassicism-romanticism-art | 69c02034fa5063deffe1b915 | 신고전주의와 낭만주의 미술 | 예술(미술) | 단일 | 6 |
| laozi-interpretations | 69c007c078128b2a9bedd3c7 | 노자 사상에 대한 다양한 해석 | 인문(동양철학) | (가)(나) | 8 |
| giddens-beck-risk-society | 6a509af986fd308968e16070 | 기든스의 구조화 이론과 벡의 위험사회론 | 사회(사회학) | (가)(나) | 9 |
| joseon-slavery-civil-rights | 6a213e8b86fd308968e0fef6 | 조선 노비제와 민권 논의의 역사적 전개 | 인문(역사) | (가)(나) | 9 |
| shapley-value | 69bbf8ec8937cf14551905a1 | 연합형 게임과 섀플리 값 | 사회(경제) | 단일 | 5 |
| tax-incidence | 69bffb7978128b2a9bedcf72 | 조세 귀착의 경제적 효과 | 사회(경제) | 단일 | 6 |
| diffusion-model-ai | 69bc036a8937cf145519091f | 인공 지능 확산 모델의 원리 | 기술(정보) | 단일 | 5 |
| blockchain-features | 69bcae308095df3b8c53d9a2 | 블록체인 기술의 특성 | 기술(정보) | 단일 | 4 |
| fear-appeal-persuasion | 69c01054fa5063deffe1a559 | 공포 소구의 설득 효과에 관한 이론 | 사회(사회문화) | 단일 | 4 |

### 4. 실행

- 변환 10개 → 지문마다 dry-run(`--passages-dir docs/experiments/analysis-map-sample-2026-10-19/passages --passage <id> --exp-dir docs/experiments/analysis-map-sample-2026-10-19/<id> --paragraphs <n>`) → dry-run 파일 삭제 → 실제 실행.
- dry-run 예시 지도 검증이 실패한 지문은 실행하지 않고 보고한다(헤겔 사례).
- 합계 상한: 30요청, 실제 청구 $6. 누적 청구가 $6에 닿을 지문은 시작하지 않는다.

### 5. 테스트

- 변환: 단일 구역(키 `section` 없음)·다구역(위치 연속, `section` 라벨)·이미지 세트 거부·덮어쓰기 거부.
- 지도 스크립트: 기존 지문 7개 요청 본문 불변(현재 해시와 비교), `section` 있는 지문의 입력 키 순서.

## 완료 조건

- [ ] `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs` 통과.
- [ ] 변환 파일 10개, 각 문단 수가 위 표와 같음.
- [ ] 실행 지문마다 `RUN.json`·`MAPS.md`, 실패 0. 지도별 검증 결과를 표로 보고(지문, 요청, 청구, 검증 통과 여부, 관계 수).
- [ ] `MAP-PROMPT.md`·기존 실험 폴더 해시 전후 동일, `packages/**`·`memory/**`·`suneung_db` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- DB 세트 구조가 이 문서 가정(`sections[].paragraphs[].text`, `order`)과 다르면 멈춘다.
- 외부 전송 승인 범위: 사용자 승인(D-0147 보완에 기록) — 위 10지문 원문만, `gpt-6.1-sol` medium, 지문당 3회, 재시도 없음, 합계 30요청·$6. 그 밖의 전송은 실행 전에 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/import-suneung-passage.mjs`(+ 테스트, 신규), `scripts/run-analysis-map-gongsun.mjs`(`--passages-dir`, `section` 입력 키), `scripts/run-analysis-map-gongsun.test.mjs`. 변환 지문 10개 `docs/experiments/analysis-map-sample-2026-10-19/passages/`.
- 테스트 결과: 분석 스크립트 + 변환기 59건 통과(Claude 추가 1건 포함).
- 경과(Claude 기록):
  - 실행자가 변환·dry-run 뒤 실제 실행을 시작했으나, 사용자가 dry-run 파일 정리용 `rm` 확인창에 "no"로 답한 직후였다. 사용자 의도 확인 전이라 Claude가 실행과 실행자를 멈췄다(공포 소구 r1 요청 1건이 약 15초 진행 중 중단, 청구 여부 미확인 → 예약액 $0.34로 계산). 중단 기록은 `fear-appeal-persuasion/ledger.aborted-2026-10-19T0309.jsonl`로 보존. 사용자 확인: `rm` 확인창이 위험해 보여 "no"한 것이며 실행 중단 의도는 아니었다.
  - 설계 공백 발견·수정(Claude): DB가 낱말 풀이 각주(`* 세수: …`)를 문단으로 저장해 조세 귀착(6→5문단, dry-run 실패 원인)과 쇤베르크(9→8문단)의 마지막 "문단"이 각주였다. 변환기가 `*`로 시작하는 문단을 `notes`로 옮기도록 고치고 테스트를 더했다. 두 지문 재변환, dry-run 통과. 나머지 8지문에는 각주 문단이 없다.
  - 실제 실행은 Claude가 재개(합계 상한 30요청·$6, 중단 1건 포함).
- 남은 문제:
