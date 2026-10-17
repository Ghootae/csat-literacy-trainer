# 인계: 분석 지도 도파민 판정·채점(판정 v3, luna 1회)

- 날짜: 2026-10-18
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0146-analysis-map-dopamine-generalization.md`(④ 판정, 통과 기준), 기준선 `D-0143`
- 참고: `docs/handoffs/2026-10-17-analysis-map-gongsun-stage2-v3.md`(v3 판정), `docs/experiments/analysis-map-dopamine-2026-10-18/FROZEN.md`

## 목표

- 도파민 동결 지도·입장으로 세 종류 응답을 판정 v3로 판정한 결과가 `docs/experiments/analysis-map-dopamine-2026-10-18/judge-v3/`에 있다.
- 통과 기준 ③을 기계적으로 채점한 `SCORE.md`(+ `score.json`)가 있다. 정상 응답 오탐은 Claude가 검토할 수 있도록 오류 사건 목록으로 낸다.

## 범위 밖

- 지시문·지도·입장·정답표 수정. `JUDGE-PROMPT-v3.md`(공손룡 폴더)를 그대로 쓴다.
- 공손룡 실험 폴더 변경(공손룡 기본 동작·요청 본문 바이트 불변), `packages/**`, `.omc/logs/**`, `memory/**` 변경.
- 오탐 여부의 의미 판단(Claude가 한다). 해석·평가 문장.

## 손댈 파일과 계약

### 1. `scripts/run-analysis-judge-gongsun.mjs` 일반화

- 옵션: `--passage <id>`, `--exp-dir <dir>`(지도 `frozen-map.json`·입장 `stance/stance-final.json`의 위치, 출력 폴더의 부모), `--out <name>`(출력 하위 폴더, 예: `judge-v3`), `--paragraphs <n>`, `--test-responses <path>`, `--copy-controls`.
- `--prompt v3`는 지금처럼 공손룡 폴더의 `JUDGE-PROMPT-v3.md`를 쓴다.
- 옵션이 없으면 공손룡 동작(추출·라운드·요청 본문·출력 경로)이 그대로다. 공손룡 전용 기대값 검사(`EXPECTED`: V4 27건, 문단별 단위 수)는 공손룡일 때만 적용하고, 다른 지문은 단위 수를 결과에 보고만 한다.

### 2. 응답 원천 (라운드는 공손룡과 같은 규칙)

- **기록(source `v4`, `sh`)**: 지금 추출 규칙 그대로, `paragraphId`가 `<passageId>-`로 시작하는 것. 실행 시점의 추출 결과를 `rounds.jsonl`에 고정한다.
- **시험 응답(source `test`)**: `test-responses.json`의 각 응답이 학생 차례 1개짜리 대화 하나. `dialogueId = 'test:' + id`.
- **원문 복사(source `copy`)**: 문단마다 원문 전체가 학생 차례 1개인 대화 하나. `dialogueId = 'copy:' + paragraphId`.
- 원문 복사 표시(`copiedSource`)는 지금 규칙대로 모든 대화에 계산한다.

### 3. 판정

- 모델 `gpt-6-luna` medium 1회, v3 지시문·입장 입력, 인용 검사·결합·오류 집계는 기존 함수 그대로.
- 상한: 요청 1,000(시도 기준), 실제 청구 $0.5. 연속 연결 오류 차단·`--resume` 그대로.
- dry-run 요청 수가 1,000을 넘으면 실제 실행 전에 멈춘다.

### 4. 채점 `scoreRun()` → `judge-v3/SCORE.md`, `judge-v3/score.json`

- **대조군(copy)**: 노드 판정의 라벨 분포, `CONTRADICTS` 수(기준 0), `DIRECT` 비율(기준 ≥ 85%). 관계 분포는 보고만.
- **심은 오류(test)**: 오류(E1~E11)마다 검출 여부. 검출 = 그 응답 판정 중 `finalLabel === 'CONTRADICTS'`인 노드·관계의 유효 인용 하나라도 `errorSpan`과 학생 차례 안에서 위치가 겹침. 검출한 판정의 단위 ID·인용 목록. 검출률(기준 ≥ 80%, 즉 11개 중 9개 이상).
- **시험 응답의 오탐 후보**: test 응답에서 어떤 `errorSpan`과도 겹치지 않는 ✕ 인용을 가진 판정 목록(단위, 인용, reason).
- **기록 응답(v4·sh)**: 오류 사건 목록(학생 구간, 걸린 단위 수, 대표 위치, 꼬리표, 대표 판정 reason 한 개). 오탐 비율은 계산하지 않는다(Claude 검토 칸만 둔다).
- 요약표: 대화·라운드·판정 수(원천별), 비용, 대조군 결과, 검출률, 시험 응답 오탐 후보 수, 기록 응답 오류 사건 수.
- 그 밖에 `REPORT.md`(공손룡 판정 보고서와 같은 형식)도 만든다.

### 5. 테스트

- 공손룡 기본 실행의 요청 본문·라운드 불변.
- 원천 `test`·`copy` 대화 구성, 다른 지문 단위 배정(기대값 검사 미적용).
- 검출 규칙: 겹침·비겹침·무효 인용, 오탐 후보 선별.

## 완료 조건

- [ ] 모든 분석 스크립트 테스트 통과.
- [ ] 도파민 dry-run 성공(요청 수 ≤ 1,000, 원천별 대화·라운드 수 보고), 실제 실행 완료, 실패 0(필요 시 `--resume`), 실제 청구 ≤ $0.5.
- [ ] `judge-v3/` 산출물(`rounds.jsonl`, `judgments.jsonl`, `combined.json`, `ledger.jsonl`, `RUN.json`, `REPORT.md`, `SCORE.md`, `score.json`) 존재.
- [ ] 공손룡 실험 폴더·`frozen-map.json`·`stance/`·`test-responses.json`·모든 `*PROMPT*.md` 해시 전후 동일, `packages/**`·`.omc/logs/**`·`memory/**` 변경 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 전송 승인 범위: 2026-10-18 사용자 승인(D-0146 ④, "이후 단계 일괄 승인") — 도파민 기록 대화·시험 응답·원문 복사·동결 지도와 입장, `gpt-6-luna` medium 1회, 요청 1,000·실제 청구 $0.5. 그 밖의 전송은 실행 전에 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/run-analysis-judge-gongsun.mjs`(옵션 `--passage --exp-dir --out --paragraphs --test-responses --copy-controls`, `extraDialogues`, `scoreRun`/`scoreTestResponse`/`renderScore`, 일반화 실행 상한 1,000/$0.5), `scripts/run-analysis-judge-gongsun.test.mjs`(테스트 5건 추가), 산출물 `docs/experiments/analysis-map-dopamine-2026-10-18/judge-v3/`(`rounds.jsonl`, `judgments.jsonl`, `combined.json`, `ledger.jsonl`, `RUN.json`, `REPORT.md`, `SCORE.md`, `score.json`, `dry-run.requests-sample.json`).
- 테스트 결과: 분석 스크립트 4종 전부 통과(판정 스크립트 34건). dry-run 739건(v4 394, test 230, copy 115), 실제 실행 739건·실패 0·청구 $0.1839. 대조군 ✕ 0, DIRECT 97.5%, 검출 11/11, 오탐 후보 1, 기록 응답 오류 사건 2. 보호 파일 해시 전후 동일.
- 남은 문제: 오탐 후보 1건(T-p3-a C3-5)과 기록 응답 오류 사건 2건의 의미 판단은 Claude 검토. `scripts/test-v5-*`·`run-v5-diverse-48.test.mjs` 실패 51건은 이번 변경과 무관(다른 세션 미커밋 변경).
