# 인계: 사고 진단 v0 (풀이 분류 대 사람 판정)

- 날짜: 2026-10-10
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0111-thought-diagnosis-v0-experiment.md`
- 라벨 가이드: `docs/experiments/thought-diagnosis-v0-2026-10-10/LABEL-GUIDE.md` (이 문서와 함께 정본)

## 목표

- AI 분류기(sol·luna 각 3회)가 가상 풀이 30개에 붙인 진단(결과 유형, 단계별 성공·실패, 함정 유형)이
  사람 정답 라벨과 얼마나 일치하는지 수치로 남긴다.
- 정답 라벨은 Claude·Codex 독립 라벨 → 불일치만 사용자 판정으로 확정한다. **Codex는 이번 작업에서 라벨러이자 실행자다.**

## 범위 밖

- `packages/**`, 기존 실험 폴더 수정 금지(읽기만). `memory/` 수정·`.env` 열람·커밋·푸시 금지.
- 해석 문장 작성 금지. `REPORT.md`에는 수치와 사실만 쓴다.

## 실험 폴더

`docs/experiments/thought-diagnosis-v0-2026-10-10/`

## 작업 순서

### 1. Codex 독립 라벨 (API 0) — 가장 먼저

- 입력: `docs/experiments/v5-multi-item-luna-sol-2026-10-08/cases.json`의 30개(`id, questionId, choiceId, rationale, basis`),
  문항 원자료(`scripts/test-trap-map-v0.mjs`의 `loadSources()`와 같은 방식), `LABEL-GUIDE.md`.
- 라벨러는 `basis`(사례 작성자가 의도한 오류 설명)를 참고해도 된다. 학생이 쓴 말 밖의 추측은 하지 않는다.
- **다른 라벨러의 결과를 보지 않는다.** `labels-claude.json`이 폴더에 생기더라도 라벨 확정 전에는 열지 않는다
  (Claude 라벨은 Codex 라벨 완료 뒤에 넣는다).
- 산출: `labels-codex.json` = `{ labeler: "codex", guideHash, labels: [30개, 가이드 §4 형식] }`. 작성 후 해시를 `FROZEN.json`에 기록하고 수정하지 않는다.
- 이 단계가 끝나면 아래 2~3을 이어서 진행한다.

### 2. 스크립트 `scripts/test-thought-diagnosis-v0.mjs`

모드: `prepare`, `run <model>`, `compare-labelers`, `report`. 원장·상한·재개 거부·정책 거부 처리·가격 계산은
`scripts/test-trap-map-v0.mjs`와 같은 방식(가능하면 import).

- `prepare`(API 0): 사례·원자료·가이드·지시문·스키마 해시를 `FROZEN.json`에 고정.
- 분류기 입력: 원자료 묶음(지문·〈보기〉·발문·선지·정답·공식 해설, mRNA는 `input_image` `detail: 'high'`, `alt` 제외) + 학생 선택 + 학생 풀이.
  **`basis`, `expected`, 어떤 라벨도 넣지 않는다**(테스트로 검사).
- 분류기 지시문: `LABEL-GUIDE.md` §1~§4 본문을 그대로 쓰고, 앞에 다음 한 줄을 붙인다:
  `너는 수능 국어 독서 문항에서 학생 풀이를 진단하는 평가자다. 아래 가이드에 따라 이 학생의 풀이 하나를 진단한다.`
- 출력 스키마: 가이드 §4 형식, strict. 열거값은 가이드 그대로. `caseId`는 요청한 사례와 일치해야 한다.
  검증 실패 시 1회 재시도, 다시 실패하면 `FORMAT_ERROR`. `studentQuote`가 학생 풀이의 부분 문자열인지는 실패 사유가 아니라 지표로만 기록.
- `run <model>`: `gpt-6-luna` | `gpt-6.1-sol`, `reasoning: { effort: 'medium' }`, `maxOutputTokens` 6000, `timeoutMs` 90000.
  30사례 × 3반복, 반복마다 고정 시드로 순서 섞기. 상한 luna 100요청·0.5달러, sol 100요청·4달러. 가격은 선행 실험과 같다.
  키는 `node --env-file-if-exists=.env`로만 읽는다.
- `compare-labelers`(API 0): `labels-codex.json`과 `labels-claude.json`이 모두 있을 때만 실행.
  항목별로 `outcomeType`, `firstFailedStep`, 단계 5칸, 오류 태그 집합을 비교해 `DISAGREEMENTS.md`를 만든다.
  불일치 사례마다 학생 풀이 원문, 두 라벨, 비교 칸을 나란히 보여 주고, 사용자 판정 칸(`판정: CODEX | CLAUDE | 직접 수정`)을 둔다.
  라벨러 간 일치 지표(아래 지표 표와 같은 정의)를 `RESULTS.json`의 `interLabeler`에 기록.
- `report`(API 0): `gold-labels.json`(Claude가 사용자 판정을 반영해 작성)이 있을 때만 실행.

### 3. 실행 범위

- Codex는 1(라벨), 2(구현·테스트), `prepare`, `run gpt-6-luna`, `run gpt-6.1-sol`까지 수행한다.
- `compare-labelers`와 `report`는 구현·테스트만 하고 실행하지 않는다(Claude 라벨과 사용자 판정이 필요).

## 지표 (`report`)

모델별로 반복별 값과 3회 다수결 값을 낸다(다수결 동률은 `NO_MAJORITY`로 불일치 처리).

| 지표 | 정의 |
|---|---|
| 결과 유형 일치 | `outcomeType` 정확도와 Cohen's κ |
| 첫 실패 단계 일치 | `firstFailedStep` 정확도(`null` 포함) |
| 단계별 일치 | 5단계 각각의 정확도, `FAIL` 재현율(정답 FAIL을 FAIL로 잡은 비율)·정밀도 |
| 함정 유형 | 정답이 `ERROR`/`POLARITY_MISMATCH`인 사례에서 태그 집합 Jaccard 평균, 정답 태그 전부 포함 비율 |
| 오류 개수 | 정답 오류 수와 같은 사례 비율 |
| 반복 안정성 | 3반복 `outcomeType`·`firstFailedStep` 모두 같은 사례 비율 |
| 인용 | `studentQuote` 부분 문자열 일치율 |

`REVIEW.md`: 사례별 정답 라벨과 모델별 3회 출력을 나란히(학생 풀이 원문 포함).

## 테스트 `scripts/test-thought-diagnosis-v0.test.mjs`

가짜 transport·임시 폴더: 분류기 입력에 `basis`·라벨 미포함, mRNA `input_image`, 스키마 검증·재시도·`FORMAT_ERROR`,
상한 정지, 미완료 원장 재개 거부, `compare-labelers` 불일치 표 생성, 지표 계산(손 계산 예제, κ, 다수결 동률).

## 완료 조건

- [x] `labels-codex.json` 30개, 해시 고정
- [x] `node --test scripts/test-thought-diagnosis-v0.test.mjs` 통과
- [x] `prepare` 성공(외부 요청 0)
- [x] `run gpt-6-luna`, `run gpt-6.1-sol` 완료(각 90칸, 상한 내)

## 중단·보고 조건

- 가이드로 라벨을 정할 수 없는 사례가 있으면 라벨은 최선으로 붙이고 `note`에 이유를 쓴 뒤 보고 목록에 올린다(멈추지 않는다).
- 이 문서와 코드·결정 기록이 충돌하거나 다른 설계 판단이 필요하면 멈추고 보고한다.
- 상한을 넘는 외부 요청이 필요해지면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/test-thought-diagnosis-v0.mjs`: `prepare`, `run <model>`, `compare-labelers`, `report` 구현.
  - `scripts/test-thought-diagnosis-v0.test.mjs`: 가짜 transport·임시 폴더를 사용한 테스트 16개.
  - `docs/experiments/thought-diagnosis-v0-2026-10-10/labels-codex.json`: 독립 라벨 30개. 다른 라벨러의 사고 진단 라벨은 열람하지 않았다.
  - 같은 폴더의 `FROZEN.json`, `cases.json`, `sources.json`, `prompts.json`, `EXECUTION-VALIDATION.json`.
  - 같은 폴더의 `gpt-6-luna/`, `gpt-6.1-sol/`: 각각 90개 칸의 원응답·검증 결과, `requests.jsonl`, `RESULTS.json`.
  - 이 인계 문서: 완료 조건 체크와 결과 보고 절만 갱신.
- 테스트 결과:
  - `node --test scripts/test-thought-diagnosis-v0.test.mjs`: 16/16 통과, 실패·취소·건너뜀 0. 실제 OpenAI 호출 0.
  - 입력의 `basis`·`expected`·라벨·`alt` 제외, mRNA `input_image`와 `detail: 'high'`, 지시문 §1~§4 원문 일치, strict 스키마·사례 ID·첫 실패 단계 검증을 확인했다.
  - 형식 실패 1회 재시도·최종 `FORMAT_ERROR`, 요청·비용 상한, 미완료 원장 및 요청 후 칸이 없는 원장 재개 거부, 정책 거부·API 오류 처리를 확인했다.
  - `compare-labelers` 불일치 표와 `report`는 임시 폴더의 합성 라벨·가짜 응답으로만 테스트했다. 실제 실험 폴더에서 두 모드는 실행하지 않았다.
  - 정확도·Cohen's κ·단계별 FAIL 재현율/정밀도·태그 Jaccard·오류 개수·다수결 동률·반복 안정성 집계를 테스트했다.
  - `prepare`: 30사례·모델별 90칸, 외부 요청 0. 종료 후 같은 명령의 고정 산출물 검증도 통과했다.
  - 종료 검증: 180칸 전부 `VALID`, 칸별 요청 해시·원장 START/END·모델·사례 ID·반복 번호 일치. 원자료 파일 해시와 독립 라벨 해시 불변. mRNA 이미지 입력은 모델별 18칸.

| 모델 | 완료 칸 | 요청/상한 | 추정 비용/상한(USD) | 형식 오류 | 정책 거부 | API 오류 | 재시도 | 인용 부분 문자열 일치 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gpt-6-luna | 90/90 | 90/100 | 0.0614703/0.50 | 0 | 0 | 0 | 0 | 59/59 |
| gpt-6.1-sol | 90/90 | 90/100 | 0.974836/4.00 | 0 | 0 | 0 | 0 | 60/60 |

- 합계: 180요청, 추정 비용 USD 1.0363063. 두 모델의 미확정 비용 예약과 사용량 미확인 요청은 모두 0. 비용은 선행 실험 단가를 적용했고 캐시 입력도 전체 입력 단가로 계산했다.
- 독립 라벨 SHA-256: `f2208121add0b300d5c9363429fbadaa2261ac208e46727d0ad7afa8e79af88c`.
- 가이드 SHA-256: `3499672ba6b44d577fd3825a06b9f86e9f3c226eef03a234a42063f7fbb23058`.
- 고정 실행 계약 해시(`FROZEN.json`의 JSON 직렬화): `59bba4f82274323b4c303e1c824faa7768690457d8b60b2ff03c76f6e424f26c`.
- 라벨링에서 판단이 어려웠던 사례(고정 라벨의 `note`에 기록):
  - I1: 원문 해석(S4)과 선지·근거 대조(S5)의 실패 경계. 첫 실패를 S5로 라벨링했다.
  - C1: 절차의 전면 부정을 SCOPE/CONDITION 중 SCOPE로 라벨링했다.
  - C6: 상충 진술의 근거 해석은 `NOT_OBSERVED`, 연결을 모른다고 밝힌 대조·판정은 `FAIL`로 라벨링했다.
  - D1·D2·D4·S2·M2: 연결된 오독의 독립 오류 분절 수. 각각 1·2·1·1·1개로 기록했다.
  - D6: 짧은 관련 근거에서 S1·S2 성공을 추정하지 않고 `NOT_OBSERVED`로 기록했다.
  - I5·S6: 기존 사례 `basis`의 전체 UNKNOWN 설명을 진단 라벨로 옮기지 않았다. 가이드 §1의 명시 오류 우선 규칙에 따라 `ERROR`로 기록했다.
- 남은 문제:
  - 실제 `compare-labelers` 실행은 Claude 독립 라벨 투입 뒤에 수행한다.
  - 실제 `report` 실행과 `REVIEW.md`·정답 일치 지표는 사용자 불일치 판정이 반영된 `gold-labels.json` 작성 뒤에 수행한다. 이 실행에서는 정답 라벨 기반 정확도나 κ를 산출하지 않았다.
  - 실행 중 인계·코드·결정 기록의 충돌로 중단한 건은 0.
  - `memory/`·`packages/**`·기존 실험 파일은 수정하지 않았다. `.env` 내용은 열람하지 않았으며 키 로딩은 `node --env-file-if-exists=.env`만 사용했다. 커밋·푸시는 하지 않았다.
