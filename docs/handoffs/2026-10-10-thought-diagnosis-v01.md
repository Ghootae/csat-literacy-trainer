# 인계: 사고 진단 v0.1 재실행 (판단 불가 도입)

- 날짜: 2026-10-10
- 작성: Claude
- 실행: Codex
- 관련: `memory/decisions/D-0111-thought-diagnosis-v0-experiment.md`, 선행 인계 `docs/handoffs/2026-10-10-thought-diagnosis-v0.md`,
  선행 결과 `memory/checkpoints/2026-10-10-thought-diagnosis-v0-results.md`
- 사용자 승인(2026-10-10): 가이드 v0.1(규칙 ①②③, `UNJUDGEABLE`, `guessed`), 무내용 응답 6개 추가, 재실행.

## 목표

- 가이드 v0.1로 sol·luna를 각 3회 재실행해 정답지(`gold-labels.json`, 이미 확정)와의 일치를 측정한다.
- 특히 **판단 불가를 판단 불가로 남겼는가(과잉 분류 억제)** 를 핵심 지표로 본다.
- v0 결과와 같은 지표로 나란히 비교한다.

## 범위 밖

- `packages/**`, 기존 실험 폴더(v0 포함) 수정 금지. `memory/` 수정·`.env` 내용 열람·커밋·푸시 금지.
- 이번에는 라벨링 없음. 정답지는 `docs/experiments/thought-diagnosis-v01-2026-10-10/gold-labels.json`(Claude 작성, 사용자 승인 규칙 반영)을 그대로 쓴다.

## 입력 (이미 있음, 수정 금지)

폴더 `docs/experiments/thought-diagnosis-v01-2026-10-10/`:
- `LABEL-GUIDE.md` (v0.1): 분류기 지시문 본문. §0 원칙이 추가됐고 출력에 `unjudgeableReason`, `guessed`가 늘었다.
- `cases.json`: 36개(기존 30 + 무내용 N1~N6). `basis`는 분류기에 넣지 않는다.
- `gold-labels.json`: 36개 정답.

## 구현

- `scripts/test-thought-diagnosis-v0.mjs`를 v0.1에서도 쓸 수 있게 일반화하거나(디렉터리·가이드·사례 경로 인자화), `scripts/test-thought-diagnosis-v01.mjs`를 새로 만든다. 어느 쪽이든 v0 실행 결과의 재현성(해시 검증)을 깨지 않는다.
- 출력 스키마: v0 스키마 + `unjudgeableReason`(`NO_CONTENT`|`GUESS_ONLY`|`CONTRADICTORY`|`null`), `guessed`(boolean). 검증:
  `outcomeType`이 `UNJUDGEABLE`이면 `unjudgeableReason`은 null이 아니고, 아니면 null. `INSUFFICIENT`·`UNJUDGEABLE`이면 `errors` 빈 배열.
  가이드의 다른 규칙(예: 이 유형에 FAIL 없음)은 **검증 실패 사유로 삼지 않고** 지표로 측정한다.
- 분류기 지시문 맨 앞 한 줄은 v0와 같다. 나머지는 v0.1 가이드 본문 그대로.
- `prepare`, `run <model>`(36 × 3, 상한 luna 120요청·0.5달러, sol 120요청·4달러), `report`. 나머지 설정은 v0과 같다.

## 지표 (`report`)

v0 지표 전부(결과 유형 κ는 새 유형 포함) + 다음을 추가한다. 모델별 3회 다수결과 반복별 값.

| 지표 | 정의 |
|---|---|
| 판단 불가 재현율 | 정답 `UNJUDGEABLE` 사례 중 분류기도 `UNJUDGEABLE`인 비율 |
| 판단 불가 사유 일치 | 위 사례 중 `unjudgeableReason` 일치 비율 |
| 과잉 분류율 | 정답이 `INSUFFICIENT` 또는 `UNJUDGEABLE`인 사례 중, 분류기가 `FAIL` 단계나 `errors`를 하나라도 붙인 비율 |
| 과잉 보류율 | 정답이 `ERROR`·`POLARITY_MISMATCH`·`NONE`인 사례 중 분류기가 `UNJUDGEABLE`로 낸 비율 |
| guessed 일치 | `guessed` 정확도 |
| S5 실패 정밀도 | v0과 같은 정의(규칙 ① 효과 확인용) |

**`REPORT.md`는 읽을 수 있는 마크다운 표로 쓴다.** JSON 덤프 금지. 첫 표는 모델 × (결과 유형, 첫 실패 단계, 함정 태그 Jaccard, 판단 불가 재현율, 과잉 분류율, 과잉 보류율, S5 실패 정밀도)이고, 둘째 표는 v0 대 v0.1 비교(v0 30사례 기준 같은 지표)다.
수치와 사실만 쓴다. `REVIEW.md`에는 사례별 정답과 모델별 3회 출력을 나란히 둔다.

## 테스트

가짜 transport·임시 폴더: 새 스키마 검증, `basis`·정답 미포함, 새 지표의 손 계산 예제(과잉 분류·과잉 보류·판단 불가 재현율), v0 산출물 해시 불변.

## 완료 조건

- [x] 테스트 통과
- [x] `prepare` 성공(외부 요청 0)
- [x] `run gpt-6-luna`, `run gpt-6.1-sol` 완료(각 108칸, 상한 내). 키는 `node --env-file-if-exists=.env`
- [x] `report`로 `RESULTS.json`·`REPORT.md`(표)·`REVIEW.md` 생성

## 중단·보고 조건

- 이 문서와 코드·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 상한 초과가 필요하면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/test-thought-diagnosis-v01.mjs`: 전용 `prepare`, `run <model>`, `report`. v0 실행·가격·입력 선별·기존 지표 함수를 재사용하고, 새 스키마·지표·마크다운 표·공통 30사례 비교를 추가했다. v0 스크립트는 수정하지 않았다.
  - `scripts/test-thought-diagnosis-v01.test.mjs`: 가짜 transport·임시 폴더 테스트 16개.
  - `docs/experiments/thought-diagnosis-v01-2026-10-10/`의 `FROZEN.json`, `prepared-cases.json`, `sources.json`, `prompts.json`, `RESULTS.json`, `REPORT.md`, `REVIEW.md`, `EXECUTION-VALIDATION.json`.
  - 같은 폴더의 `gpt-6-luna/`, `gpt-6.1-sol/`: 모델별 108칸 원응답·검증 결과, `requests.jsonl`, `RESULTS.json`.
  - 이 인계 문서: 완료 조건 체크와 결과 보고 절만 갱신.
- 테스트 결과:
  - `node --test scripts/test-thought-diagnosis-v0.test.mjs scripts/test-thought-diagnosis-v01.test.mjs`: 32/32 통과(v0 16개 + v0.1 16개), 실패·취소·건너뜀 0. 가짜 transport만 사용했다.
  - 구현 중 v0 출력에 새 필드가 없는 경우의 비교 오류를 테스트에서 발견해 수정한 뒤 위 명령을 통과했다. 실제 호출 전에 수정·검증·해시 고정을 완료했다.
  - 새 필드·사례 ID·첫 실패 단계·오류 목록 검증, 판단 불가/불충분의 FAIL을 검증 실패로 삼지 않는 처리, `basis`·정답 라벨·`expected`·`alt` 제외, 가이드 전체 원문 일치, mRNA 이미지 `detail: high`를 확인했다.
  - 과잉 분류·과잉 보류·판단 불가 재현율/사유·guessed·다수결 손 계산, 형식 재시도·요청/비용 상한·미완료 원장 재개 거부·정책 거부/API 오류 보존을 확인했다.
  - `prepare`: 36사례·모델별 108칸, 외부 요청 0.
  - 실제 실행: 두 모델 모두 108/108칸 VALID, 형식 오류·정책 거부·API 오류·재시도 0. 모델별 108/120요청, 미확정 비용 예약·사용량 미확인 요청 0.
  - `report`: 요청한 3개 산출물 생성 완료. 첫 표는 모델별 다수결, 둘째 표는 공통 30사례의 v0/v0.1 비교이며, 각 버전의 승인 정답지를 사용하고 라벨 변경 사례를 표시했다. 반복별 값·기존 지표·새 지표를 모두 기록했다.
  - 별도 종료 검사: 216칸의 원응답·요청 해시·원장 START/END·모델·사례·반복 번호 일치, 새 지표 독립 재계산 일치. 모델별 이미지 입력 21칸. 보고서 표의 열 수와 REVIEW 36사례를 확인했다.
  - 입력 3개 및 v0 산출물 197개 해시 불변. v0의 기존 FROZEN 기록에 있는 스크립트·원자료 9파일·cases/sources/prompts·독립 라벨 해시도 일치했다. 상세 검사는 `EXECUTION-VALIDATION.json`에 기록했다.

| 모델 | 완료 칸 | 요청/상한 | 추정 비용/상한 USD | 인용 부분 문자열 일치 |
|---|---:|---:|---:|---:|
| gpt-6-luna | 108/108 | 108/120 | 0.0766576/0.50 | 61/62 |
| gpt-6.1-sol | 108/108 | 108/120 | 1.2936920/4.00 | 60/60 |

- 합계: 216요청, 추정 USD 1.3703496. 단가와 캐시 입력의 전체 단가 계산은 v0과 같다.
- 다수결 측정: 결과 유형 luna 34/36·sol 36/36, 판단 불가 재현율 luna 6/7·sol 7/7, 판단 불가 사유 일치 luna 4/7·sol 7/7, 과잉 분류 둘 다 0/12, 과잉 보류 둘 다 0/24, guessed 둘 다 34/36, S5 실패 정밀도 둘 다 1/1. 반복별 값과 단계별 FAIL 재현율은 `REPORT.md`에 있다.
- 고정 실행 계약 해시: `c5c5a0e00356b9628145279c3290440aa92de41ed4db8203d2d643d0808c39f2`.
- 남은 문제:
  - luna 다수결 결과 유형은 C6·D6에서 정답과 불일치했다. C6의 판단 불가 사유 및 N1·N6의 사유도 불일치했다. 두 모델 모두 N1·N6의 guessed가 정답과 불일치했다. 승인 정답지와 모델 출력은 그대로 보존했다.
  - luna `M6-r2`의 인용 1개가 정확한 부분 문자열과 불일치했다. 인계 규칙에 따라 형식 실패·재시도 사유로 삼지 않고 지표로 기록했다.
  - 이 작업에서 수정하지 않은 `memory/CURRENT_STATE.md`와 `docs/experiments/v5-repair-test-2026-10-10/.omc/state/sessions/4e53703c-99c2-4b8b-8704-a128d3266d8a/pre-tool-advisory-throttle.json`의 실행 중 해시 변화가 감지됐다. 직접 수정하거나 복원하지 않았으며 검사 기록에 별도로 남겼다. 나머지 사전 기록 9,558파일의 해시는 동일했다.
  - 인계와 충돌하거나 설계 변경을 요구해 중단한 건은 0. 추가 모델 호출은 하지 않았다.
  - `memory/`·`packages/**`·기존 실험 파일에 직접 수정 작업을 수행하지 않았다. 입력 파일 3개는 수정하지 않았다. `.env` 내용은 열람하지 않았고 키 로딩은 지정된 Node 옵션만 사용했다. 커밋·푸시는 하지 않았다.
