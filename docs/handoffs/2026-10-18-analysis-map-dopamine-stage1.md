# 인계: 분석 지도 도파민 1단계(스크립트 일반화 + 지도 3회 생성)

- 날짜: 2026-10-18
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0146-analysis-map-dopamine-generalization.md`, 기준선 `D-0143`
- 참고: 공손룡 1단계 인계 `docs/handoffs/2026-10-16-analysis-map-gongsun-stage1.md`

## 목표

- `scripts/run-analysis-map-gongsun.mjs`가 지문 ID·실험 폴더·지시문 경로·기대 문단 수를 옵션으로 받는다. 옵션이 없으면 공손룡 동작(요청 본문, 출력 경로, 검증)이 바이트 단위로 그대로다.
- 도파민 지문(`dopamine-motor-control`, 4문단)으로 sol이 지도를 3회 생성한 원출력·검증 결과·비용·`MAPS.md`가 `docs/experiments/analysis-map-dopamine-2026-10-18/`에 있다.

## 범위 밖

- 지도 비교 해석·동결 선택(Claude·사용자), 입장 표시·판정(이후 단계).
- 지시문 수정. 도파민에도 공손룡의 `docs/experiments/analysis-map-gongsun-2026-10-16/MAP-PROMPT.md`를 **그대로** 쓴다(복사하지 않고 경로로 읽고 해시 기록).
- 공손룡 실험 폴더 파일 변경, `packages/**`, `.omc/logs/**`, `memory/**` 변경.
- 판정·입장 스크립트(`run-analysis-judge-gongsun.mjs`, `run-analysis-stance-gongsun.mjs`) 일반화. 다음 단계 인계에서 한다.

## 손댈 파일과 계약

- `scripts/run-analysis-map-gongsun.mjs`
  - 옵션: `--passage <passageId>`, `--exp-dir <dir>`, `--prompt <path>`(기본 `<기본 EXP_DIR>/MAP-PROMPT.md`, 즉 공손룡 폴더), `--paragraphs <n>`(기대 문단 수, 기본 5).
  - `loadPassage`는 지정한 passageId를 같은 원천(`packages/pipeline/fixtures/experiments/dialogue/passages`)에서 찾는다.
  - 문단 수가 기대와 다르면 지금처럼 멈춘다(`PARAGRAPH_COUNT`).
  - 검증기 6항목·출력 스키마·모델(`gpt-6.1-sol`, medium)·`max_output_tokens`(32000)·재시도 없음·상한(3요청, $2)은 그대로.
  - `RUN.json`에 passageId, 지시문 경로·해시를 기록.
  - 파일 이름은 그대로 둔다(이름 변경은 하지 않음).
- `scripts/run-analysis-map-gongsun.test.mjs`: 옵션 기본값에서 공손룡 dry-run 요청 본문이 이전과 같음, `--passage dopamine-motor-control --paragraphs 4`의 요청 본문에 도파민 4문단만 있고 학생 응답·골드가 없음.
- 실행: `node --env-file-if-exists=.env scripts/run-analysis-map-gongsun.mjs --passage dopamine-motor-control --exp-dir docs/experiments/analysis-map-dopamine-2026-10-18 --paragraphs 4` (먼저 `--dry-run`).
- 산출물(도파민 실험 폴더): `runs/map-r{1..3}.raw.json`, `runs/map-r{1..3}.json`, `runs/map-r{1..3}.validation.json`, `ledger.jsonl`, `RUN.json`, `MAPS.md`(공손룡과 같은 형식, 해석 없음).

## 완료 조건

- [ ] 판정·입장·지도 스크립트 테스트 전부 통과.
- [ ] 공손룡 기본 dry-run 요청 본문 불변(테스트로 확인).
- [ ] 도파민 dry-run 성공, 실제 3요청 완료(실패 포함 기록), 총비용 ≤ $2, 산출물 전부 존재.
- [ ] 공손룡 실험 폴더 전체·`packages/**`·`.omc/logs/**`·`memory/**` 변경 없음, `MAP-PROMPT.md` 해시 전후 동일.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 2026-10-18 사용자 승인(D-0146 ①) — 도파민 원문만, sol medium 3요청, 재시도 없음, $2. 그 밖의 전송이 필요하면 실행 전에 멈춘다.
- 도파민 지문을 찾지 못하거나 문단 수가 4가 아니면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-map-gongsun.mjs`(옵션 `--passage`, `--exp-dir`, `--prompt`, `--paragraphs`; `loadPassage`에 passageId 인자, `RUN.json`에 passageId 기록, 비공손룡 지문은 `MAPS.md` 제목에 지문 ID), `scripts/run-analysis-map-gongsun.test.mjs`(옵션 테스트 1개 추가), `docs/experiments/analysis-map-dopamine-2026-10-18/{runs/map-r{1..3}.raw.json, map-r{1..3}.json, map-r{1..3}.validation.json, ledger.jsonl, RUN.json, MAPS.md}`, 이 문서의 결과 절. 공손룡 실험 폴더 전체(해시 전후 동일, `MAP-PROMPT.md` f4df9cca...)·`packages/**`·`.omc/logs/**`·`memory/**`는 변경하지 않음.
- 테스트 결과: `node --test scripts/run-analysis-*.test.mjs` 47개 통과, 실패 0(지도 12개 포함). 기본 옵션 dry-run 요청 본문이 직접 구성한 공손룡 요청과 해시 동일(테스트). 도파민 dry-run 성공(예시 지도 6항목 통과, 요청당 예약 $0.3397, 3요청 예약 합 약 $1.02), dry-run 산출물은 실제 실행 전에 삭제.
- 실행 결과(gpt-6.1-sol, medium, max_output_tokens 32000, 재시도 없음, 3요청, 총 $0.4060, 상한 $2):
  - r1: 파싱 성공, 검증 6항목 전부 통과, 입력 2496 / 출력 13503(추론 221), $0.1400. 명제 56, COMPOSITE 18.
  - r2: 파싱 성공, 검증 전부 통과, 입력 2496(캐시 2493) / 출력 13253(추론 856), $0.1375. 명제 61, COMPOSITE 15.
  - r3: 파싱 성공, 검증 전부 통과, 입력 2496(캐시 2493) / 출력 12345(추론 359), $0.1284. 명제 56, COMPOSITE 19.
- 남은 문제: 없음. 지도 비교·해석은 범위 밖. 인계 문서와 다르게 한 점: 없음. 도파민 실험 폴더에 다른 세션이 만든 `test-responses.json`이 있으나 건드리지 않음.
