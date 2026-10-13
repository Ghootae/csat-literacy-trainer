# 인계: JEV Choice로 선지별 선택 확률 예측 (함정 분석 첨부 대 미첨부)

- 날짜: 2026-10-10
- 작성: Claude
- 실행: Codex
- 관련: `memory/decisions/D-0109-trap-map-v0-external-rate-experiment.md`, 선행 결과 `docs/experiments/trap-map-v0-external-rates-2026-10-10/REPORT.md`
- 사용자 지시(2026-10-10): JEV 플레이그라운드로 "사람이 각 선지를 선택할 확률"을 판단하게 하고, 각 선지에 모델이 만든 함정 분석을 붙여 시험한다. 지문·선지·정답·해설·함정 분석의 jevplayground 전송은 이 지시로 승인됐다.

## 목표

- 6문항(사용 5 + 공손룡 후보 1)에 대해 JEV Choice가 낸 선지별 확률을 메가스터디 실제 선택 비율과 대조한 수치가 남는다.
- 두 조건을 비교한다. `BARE`: 함정 분석 없음(대조군). `TRAP`: sol 1회차 함정 분석 첨부.
- 선행 실험(gpt-6-luna, gpt-6.1-sol 직접 예측)과 같은 지표로 나란히 비교한다.

## 범위 밖

- `packages/**`, 기존 실험 폴더(`trap-map-v0-external-rates-2026-10-10/`) 수정 금지(읽기만). `memory/` 수정·`.env` 열람·커밋·푸시 금지.
- OpenAI 호출 없음. 메가스터디 재수집 없음(`external-rates.json` 재사용).
- `REPORT.md`에는 수치와 사실만 쓴다. 해석은 Claude가 한다.

## 실험 폴더

`docs/experiments/trap-map-jev-choice-2026-10-10/`

## 1. 스크립트 `scripts/test-trap-map-jev-choice.mjs`

모드: `prepare`(외부 요청 0), `preflight`(1요청), `run`, `report`. 지표 함수(`predictionMetrics`, `aggregateMetrics`, `spearman`, `topSet` 등)와 원자료 로딩(`loadSources`)은 `scripts/test-trap-map-v0.mjs`에서 import한다.

### 1-1. 요청 형식

- 엔드포인트: `POST https://jevplayground.com/api/evaluate`, `Content-Type: application/json`, 키 없음(공개 경로, 기존 JEV 실험과 같다).
- 본문: `{ "state": <문자열>, "questions": { "Q1": { "type": "choice", "instructions": <아래>, "criteria": { "C1": <선지1 원문>, ..., "C5": <선지5 원문> } } } }`.
  Choice의 raw HTTP 구조는 공식 예시가 없어 `criteria` 객체 형식은 Gateway 예시에서 추정한 것이다. **preflight에서 확인한다.**
- 응답에서 `result.answers.Q1.probabilities`(C1~C5)를 읽어 ×100 해 예측 비율로 쓴다. `choice`, `confidence`, `usage`, `latencyMs`도 저장한다.
- instructions(그대로):
  `이 문항을 실제로 응시한 고3 수험생 집단에서 무작위로 한 명을 뽑았을 때, 그 학생이 답으로 고른 선지를 고르라. 정답 여부가 아니라 실제 수험생들이 어떤 선지를 얼마나 고르는지를 기준으로 판단한다.`

### 1-2. state 구성

순서대로 이어 붙인다: 지문 → 〈보기〉(있을 때) → 발문 → 선지 5개(번호와 원문) → 정답 번호 → 공식 해설.
mRNA는 그림 대신 fixture `media[0].alt`를 `[그림 설명]`으로 넣는다(JEV는 텍스트만 받는다).

`TRAP` 조건만 끝에 `선지별 함정 분석` 절을 붙인다. 출처는 `docs/experiments/trap-map-v0-external-rates-2026-10-10/gpt-6.1-sol/<questionId>-r1.json`의 `output.choices`.
선지마다 `transformType`, `attractionTags`, `attractionMechanism`만 넣는다. **`predictedSelectionPercent`는 넣지 않는다.**

- state가 8,000자를 넘으면 **자르지 말고 멈추고 보고**한다(문항별 길이를 `prepare`에서 기록).
- 외부 선택 비율 숫자는 state·instructions·criteria 어디에도 들어가지 않는다(테스트로 검사).

### 1-3. 일정

- 6문항 × 2조건 × 5반복 = 60요청. 반복마다 `criteria` 항목 순서를 고정 시드로 돌린다(라벨 의미는 고정).
- 요청 간 7초 이상. 429면 60초 대기 후 같은 요청을 1회 재시도. 다시 실패하면 칸을 `RATE_LIMITED`로 저장하고 계속.
  요청 상한 75. 원장 START/END/ERROR, 미완료 원장 재개 거부(기존 실험과 같은 방식).
- `preflight`: mRNA 아닌 문항 1개, `BARE`, 1요청. 응답에 C1~C5 확률이 모두 있고 합이 0.98~1.02인지 확인한다.
  실패하면(400, 필드 누락 등) **멈추고 응답 원문과 함께 보고**한다. 요청 구조를 임의로 바꿔 재시도하지 않는다.

### 1-4. `report`

선행 실험 `REPORT.md`와 같은 지표와 정의(최다 오답 적중 = |P∩A|/|P|, 우연 |A|/4, 문항 내·통합 Spearman/Pearson, 정답률 MAE, 반복 안정성: P 집합 5회 일치 문항 수, 선지별 확률 SD 평균), 화작·언매 탭 각각.
조건별로 반복별 값과 5회 평균 예측 값을 낸다. 주 지표는 USED 5문항, 공손룡은 별도 표.

비교 표 하나를 추가한다: 행 = `JEV BARE`, `JEV TRAP`, 그리고 선행 `gpt-6-luna`, `gpt-6.1-sol`의 3회 평균 예측(선행 `RESULTS.json`에서 읽음). 열 = 최다 오답 적중, 문항 내 Spearman, 통합 Spearman, 정답률 MAE.

산출: `RESULTS.json`, `REPORT.md`, 문항별 실제·조건별 평균 예측 분포 표를 담은 `REVIEW.md`.

## 2. 테스트 `scripts/test-trap-map-jev-choice.test.mjs`

가짜 fetch, 임시 폴더: state 구성(TRAP 절 포함 여부, `predictedSelectionPercent` 미포함, 외부 비율 미포함), 8,000자 초과 시 정지, 429 대기·1회 재시도·`RATE_LIMITED`, 확률 합 검증, 미완료 원장 재개 거부, 지표 재사용 결과가 손 계산 예제와 일치.

## 완료 조건

- [ ] `node --test scripts/test-trap-map-jev-choice.test.mjs` 통과
- [ ] `prepare` 성공(외부 요청 0, 문항별 state 길이 기록, 모두 8,000자 이하)
- [ ] `preflight` 성공
- [ ] `run` 완료(60칸, 상한 내)
- [ ] `report`로 `RESULTS.json`·`REPORT.md`·`REVIEW.md` 생성

## 중단·보고 조건

- 이 문서와 코드·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 충돌 내용과 선택지를 보고한다.
- preflight 실패, state 8,000자 초과, 요청 상한 초과가 필요해지면 멈춘다.

## 결과 보고 (실행 후 작성)

- 실행 상태: **60칸 완료, 요청 간격 조건 2건 미충족**. 수치 계산·원장 무결성·원자료 보존 검사는 통과했다.
- 변경 파일: `scripts/test-trap-map-jev-choice.mjs`, `scripts/test-trap-map-jev-choice.test.mjs`, `docs/experiments/trap-map-jev-choice-2026-10-10/` 신규 산출물, 이 결과 보고 절.
- 테스트: `node --test scripts/test-trap-map-jev-choice.test.mjs` **13/13 통과**. fake fetch로 입력 투영·비율 미포함·8,000자 초과·응답 검증·429 대기/1회 재시도·원장/해시/상한·보고서 지표를 검사했다.
- prepare: 외부 요청 0, 60칸. 12개 state 길이 **2,352~4,113자**.
- preflight: 법인 BARE 1요청, HTTP 200, C1~C5 확률 합 1.00. Playground의 confidence 위치가 `result.confidence.Q1`인 것을 확인했다. 최초 파서 오류를 보정하고 저장한 응답을 오프라인으로 재검증했으며, 요청 구조 변경·추가 preflight 호출은 없다. 최초 오류·raw·동결 이력·재검증 영수증은 실험 폴더에 보존했다.
- run: **60/60 VALID**, preflight 포함 **61/75요청**, 재시도 0, 429·API 실패·본 실험 형식 실패 0. OpenAI 호출·메가스터디 재수집 0.
- report: `RESULTS.json`, `REPORT.md`, `REVIEW.md` 생성. USED 5문항·오답 20개, 공손룡 후보 별도, 화작·언매별 반복/평균/선행 비교/안정성 포함. 응답 사용량 61건 보존. 공개 경로의 USD 단가는 지정되지 않아 비용은 산출하지 않았다.
- 독립 검산: `verify-results.py`의 Python 평균·평균순위·Pearson 계산으로 조건/탭/문항 평균 24행과 집계 지표를 검산했다. `VERIFICATION.json`의 `numericalVerificationPassed=true`, 보호 입력 변경 0, 원장 미종료 0.
- 남은 문제: 요청 시작 간격 두 곳이 **6,999ms**로 §1-3의 최소 7초보다 1ms 짧았다. 나머지는 7초 이상이었다. 타이머 대기가 반환된 뒤 실제 경과 시간을 다시 확인하는 보완이 필요하다. 실험을 재실행하지 않았으며 이 조건 미충족을 보고서·검산 파일에 명시했다.
- 보존된 설계 조건: 모든 문항에 고3 지시문(외부 mRNA는 고2), 같은 예측의 양 탭 대조, 정답·해설 양쪽 제공, mRNA alt 대체. 응답 확률은 Playground가 두 소수 자리로 반올림한 값이다.
- `packages/**`, 기존 실험 폴더, `memory/`, `.env`는 변경하지 않았다. 커밋·푸시 없음. 결과 해석·인계 대비 diff 검토는 Claude에게 남긴다.
