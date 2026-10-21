# 인계: 분석 골드 맞춰 보기 첫 묶음 (복합 지문 분리 변환·지도 생성)

- 날짜: 2026-10-20
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0151-analysis-gold-standard-procedure.md`
- 절차: `docs/ANALYSIS-GOLD-PROCEDURE-2026-10-20.md`(2·3·8절)
- 선례: `docs/handoffs/2026-10-19-relation-classify-heldout.md`(변환·지도 실행)

## 목표

- 변환기가 복합 지문의 한 구역만 독립 지문으로 변환할 수 있다(`--section`).
- 첫 묶음 4개가 `docs/experiments/analysis-gold-calibration-2026-10-20/passages/`에 있다.
- 지문마다 지도 3회 결과가 `docs/experiments/analysis-gold-calibration-2026-10-20/<passageId>/`에 있다.

## 범위 밖

- 동결 선택, 비교 문서, 입장 표시, 관계 유형 분류(Claude가 한다). 지도 결과의 해석.
- 지시문(`MAP-PROMPT.md`, `STANCE-PROMPT.md`, `CLASSIFY-PROMPT*.md`) 수정. 기존 실험 폴더 변경.
- `packages/**`, `memory/**`, `.omc/logs/**`, `suneung_db` 쓰기. git 쓰기 명령.
- `rm` 등 파일 삭제 금지. dry-run 산출물은 처음부터 `docs/experiments/analysis-gold-calibration-2026-10-20/dry-run/<passageId>/`에 쓴다. 삭제가 필요해 보이면 멈추고 보고한다.

## 손댈 파일과 계약

### 1. `scripts/import-suneung-passage.mjs` (+ `scripts/import-suneung-passage.test.mjs`)

- 선택 옵션 `--section <label>`과 `--pair-passage-id <id>`. `convertSet({ setId, passageId, dbDir, section, pairPassageId })`.
- `section`이 있으면 그 `label`의 구역만 변환한다.
  - 문단에 `section` 필드를 넣지 않는다(단일 지문처럼). `paragraphId`·`position`은 그 구역 안에서 1부터.
  - 각주는 그 구역 안의 것만.
  - `title`은 `"<원 제목> <label>"`(예: `근대 문명과 과학 정신의 수용 (가)`).
  - 최상위에 `composite: { setId, section: <label>, pairPassageId }` 추가(`pairPassageId`는 옵션 값, 없으면 `null`).
- 오류: 구역이 하나뿐인 세트에 `--section` → `SECTION_NOT_COMPOSITE`. 없는 라벨 → `SECTION_NOT_FOUND`.
- `section`이 없으면 출력은 지금과 바이트 단위로 같다(기존 테스트 + 새 테스트로 확인).
- 테스트: 구역 필터·번호·각주·title·composite, 두 오류, 옵션 없을 때 불변.

### 2. 변환 (외부 전송 없음)

출력: `--out-dir docs/experiments/analysis-gold-calibration-2026-10-20/passages`

| passageId | set_id | 옵션 |
|---|---|---|
| modern-civilization-science-ga | 69bca7828095df3b8c5354a6 | `--section '(가)' --pair-passage-id modern-civilization-science-na` |
| modern-civilization-science-na | 69bca7828095df3b8c5354a6 | `--section '(나)' --pair-passage-id modern-civilization-science-ga` |
| missing-outlier-data | 69c006f178128b2a9bedd2f3 | 없음 |
| horse-race-reporting | 69c0041afa5063deffe1a036 | 없음 |

예상 문단 수 4·4·5·4. 다르면 보고한다(멈추지 않음). 각주 수도 보고한다.

### 3. 지도 생성

- dry-run: `node scripts/run-analysis-map-gongsun.mjs --dry-run --passages-dir docs/experiments/analysis-gold-calibration-2026-10-20/passages --passage <id> --exp-dir docs/experiments/analysis-gold-calibration-2026-10-20/dry-run/<id> --paragraphs <n>`. 예시 지도 검증이 실패한 지문은 실행하지 않고 보고한다.
- 실제 실행: `node --env-file-if-exists=.env scripts/run-analysis-map-gongsun.mjs --passages-dir … --passage <id> --exp-dir docs/experiments/analysis-gold-calibration-2026-10-20/<id> --paragraphs <n>`. 지시문은 기본값(`analysis-map-gongsun-2026-10-16/MAP-PROMPT.md`) 그대로. 지문당 3요청, 재시도 없음.
- 합계 상한: 12요청, 실제 청구 $2.5. 누적 청구 + 그 지문 3회 예상(앞 지문 회당 평균 × 3)이 $2.5를 넘을 지문은 시작하지 않고 보고한다.
- 보고: 지문, 요청, 청구, 회차별 검증 6항목 통과, 명제·노드·관계 수.

## 완료 조건

- [ ] `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 통과.
- [ ] 변환 4개, 지도 12개(실패는 재시도 없이 보고), 실제 청구 ≤ $2.5.
- [ ] 지시문 파일·기존 실험 폴더·`packages/**`·`memory/**`·`suneung_db` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 파일 삭제가 필요해지면 멈추고 보고한다.
- 외부 전송 승인 범위: 사용자 승인(D-0151에 기록) 뒤, 첫 묶음 4개 원문의 지도 생성만(`gpt-6.1-sol` medium, 지문당 3회, 재시도 없음, 12요청·$2.5). 그 밖의 전송은 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/import-suneung-passage.mjs`, `scripts/import-suneung-passage.test.mjs`(테스트 3개 추가), 신규 `docs/experiments/analysis-gold-calibration-2026-10-20/`(passages 4, dry-run 4, 지문별 폴더 4), 이 문서.
- 변환: modern-civilization-science-ga 문단 4·각주 0, modern-civilization-science-na 4·0, missing-outlier-data 5·0, horse-race-reporting 4·0. 예상 문단 수와 일치. ga·na에는 composite 짝 정보가 들어 있다.
- 지도 (dry-run 4개 모두 예시 지도 검증 통과, 외부 전송 0. 실제 12요청, 재시도 없음. 청구는 RUN.json 합계로, API_ERROR는 예약액(약 $0.336)으로 계산된 값이라 실제 청구는 이보다 작을 수 있음):
  - modern-civilization-science-ga: 요청 3, 청구 $0.3171. 회차1 검증 6/6 (명제 38/노드 19/관계 23), 회차2 6/6 (41/25/27), 회차3 6/6 (44/27/28).
  - modern-civilization-science-na: 요청 3, 청구 $0.5096. 회차1 6/6 (32/17/25), 회차2 API_ERROR(503 서버 과부하, 지도 없음), 회차3 6/6 (34/18/26).
  - missing-outlier-data: 요청 3, 청구 $0.4960. 회차1 6/6 (36/18/24), 회차2 API_ERROR(503, 지도 없음), 회차3 6/6 (35/22/25).
  - horse-race-reporting: 요청 3, 청구 $0.3210. 회차1 6/6 (41/21/28), 회차2 6/6 (39/18/24), 회차3 6/6 (39/19/30).
  - 합계: 12요청, 보고 청구 $1.6428(상한 $2.5 이내). 지시문 해시 변화 없음(promptUnchanged true).
- 테스트 결과: `node --test scripts/run-analysis-*.test.mjs scripts/import-suneung-passage.test.mjs scripts/run-relation-classify.test.mjs` 70개 통과, 0 실패 (신규 3개 추가 후).
- 남은 문제: na·missing-outlier-data의 회차2가 503 오류로 지도 없음(재시도 금지라 그대로 둠). 두 지문은 후보가 2회차뿐.
