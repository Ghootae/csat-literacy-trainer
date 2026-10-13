# 인계: 정답 경로 sol API 종단 검증 (지도 생성 → 채점)

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/` D-0115(진단 sol 고정·주기 실행), D-0119, D-0121, D-0122, D-0123, D-0124
- 정의 문서(규칙 원문): `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md`
- 사용자 지시(2026-10-13): 운영 흐름(B: sol이 지도 생성 → 같은 sol이 채점)만 돌린다. 기준과 맞으면 채점 단독 시험(A)은 하지 않는다. 오프라인 평가라 완벽할 필요는 없다.

## 목표

`gpt-6.1-sol`이 (1) 두 문항의 문항 지도를 1회 생성하고 동결, (2) 그 지도로 35개 풀이를 3회씩 채점했을 때, 에이전트 파일럿에서 얻은 기준 라벨과 결과 유형·실패 종류·실패 요소가 대체로 맞는지와 실행 간 일관성을 측정한다.

## 범위 밖

- `packages/**`, 기존 실험 폴더 수정 금지. `memory/` 수정·`.env` 열람·커밋·푸시 금지.
- 기준 라벨·`basis`·Codex 지도·이전 채점 결과를 sol 입력에 넣지 않는다.
- 채점 단독 시험(A안), 다른 모델 실행 없음.

## 입력 (이미 있음, 수정 금지)

폴더 `docs/experiments/answer-path-sol-e2e-2026-10-13/`:
- `cases.json`: 35개(`id`·`questionId`·`choiceId`·`rationale`). W·X는 가상 오답 20, I·S·N은 파일럿 15.
- `reference-labels.json`: 기준 라벨(채점 비교용, 모델 입력 금지).
문항: `packages/pipeline/fixtures/experiments/problem-solving/public/{information-asymmetry-free-marketplace-q13,surface-tension-laplace-q16}.json`(지문·발문·보기·선지·기호 위치). 정답 키는 비공개 픽스처의 `answerChoiceId`만 (C5, C3).

## 구현

`scripts/test-answer-path-sol.mjs`(+ `.test.mjs`). 기존 `scripts/test-thought-diagnosis-v01.mjs`의 OpenAI 호출·가격·원장·재시도·상한 처리를 재사용해도 된다. 모델 `gpt-6.1-sol`, reasoning effort medium, 키는 `node --env-file-if-exists=.env`. 응답은 JSON 스키마(구조화 출력)로 받는다.

모드:
1. `prepare`: 프롬프트·입력 고정, 해시를 `FROZEN.json`에. 외부 요청 0.
2. `map`: 문항당 1회 지도 생성 → `sol-maps/<questionId>.json`. 스키마는 `docs/handoffs/2026-10-13-answer-path-depth-pilot-v2.md` A1과 같다. 검증: `layer`가 `dependsOn`에서 계산한 값과 일치, `APPLY`가 선지당 1개·최상층, 요소는 E1~E10 또는 null(+`outsideVocabulary`). 형식 실패만 재시도(최대 2회). 성공 후 해시 동결, 이후 재생성 금지.
3. `run`: 35사례 × 3회 채점 → `runs/`. 입력은 규칙 원문 + 해당 문항 지도 + 문항 + 그 사례의 `choiceId`·`rationale`. 스키마는 파일럿 v2 A2와 같고 다음을 반영한다: `depth` = 정답 선지 **노드 수**(D-0122), D-0123 명시적 오진술 우선, D-0124 덮어쓰기 필드 `nodeElement`·`overrideQuote`(덮어쓰지 않으면 null).
   검증: 결과별 null 규칙, `failedNodeId`가 해당 선지 지도에 있음, 덮어쓰지 않았으면 `failedElement`가 노드 요소와 같음, 인용이 풀이의 부분 문자열(불일치는 지표로만).
4. `report`: `RESULTS.json`, `REPORT.md`(마크다운 표, JSON 덤프 금지), `REVIEW.md`(사례별 기준 라벨과 3회 출력 나란히).

지시문: 규칙은 정의 문서의 "어휘", "v0.1 개정 규칙" 절 원문을 그대로 넣는다(Claude가 요약하지 않음). 지도 생성 지시문과 채점 지시문은 `prompts.json`에 고정한다.

상한: 지도 6요청, 채점 120요청, 합계 USD 5.

## 지표 (`report`)

모델 노드 번호는 Codex 지도와 다르므로 비교하지 않는다. 3회 다수결과 반복별 값을 모두 쓴다.

| 지표 | 정의 |
|---|---|
| 결과 일치 | `result`가 기준과 같은 비율 |
| 실패 종류 일치 | 기준이 READ/LINK/APPLY/UNDETERMINED인 사례에서 `failedOperation` 일치 |
| 실패 요소 일치 | 기준 `failedElement`가 있는 사례에서 일치 |
| 꼬리표 일치 | 정답 사례에서 `tags` 집합 일치 |
| 과잉 분류 | 기준이 근거 없음·미확정인 사례에서 READ/LINK/APPLY를 낸 비율 |
| 덮어쓰기 | 덮어쓰기 발생 사례 목록·횟수(기준상 덮어쓰기는 W8 하나) |
| 실행 간 일관성 | 사례별 3회가 result·failedOperation·failedElement·tags 모두 같은 비율 |
| 지도 요약 | 선지별 노드 수·종류·핵심 요소, Codex 지도의 노드 수와 나란히(`docs/experiments/answer-path-depth-pilot-v2-2026-10-13/item-maps/`를 보고서용으로만 읽음) |

## 테스트

가짜 transport·임시 폴더: 프롬프트에 기준 라벨·basis·Codex 지도 미포함, 지도 층 검증, 채점 스키마·null 규칙·덮어쓰기 필드 검증, 지표 손 계산 예제, 상한 초과 거부.

## 완료 조건

- [x] 테스트 통과
- [x] `prepare` 성공(외부 요청 0)
- [x] `map` 2문항 성공·동결, `run` 105칸 완료(상한 내)
- [x] `report`로 `RESULTS.json`·`REPORT.md`·`REVIEW.md` 생성

## 중단·보고 조건

- 이 문서와 정의 문서·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 상한 초과가 필요하면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `scripts/test-answer-path-sol.mjs`: prepare/map/run/report 실행기. 원문 규칙·구조화 출력·동결 검증·원장·형식 재시도·상한·지표 구현.
  - `scripts/test-answer-path-sol.test.mjs`: 가짜 transport·임시 폴더 테스트 8개.
  - `docs/experiments/answer-path-sol-e2e-2026-10-13/` 신규 산출물: `FROZEN.json`, `prepared-cases.json`, `sources.json`, `prompts.json`, `schemas.json`, `sol-maps/`(지도 2개·동결 해시), `runs/`(105개), `attempts/`(원응답·실패 이력), `requests.jsonl`, `map-summary.json`, `run-summary.json`, `RESULTS.json`, `REPORT.md`, `REVIEW.md`, `RECOVERY.md`, `VERIFICATION.json`, 복구 실행 코드 3개(`recover-n6-r2.mjs`, `recover-n4-r3.mjs`, `recover-n4-r3-second.mjs`). 기존 `cases.json`·`reference-labels.json`은 수정하지 않았다.
  - 이 인계 문서: 완료 체크와 결과 보고 절.
- 테스트 결과:
  - `node --test scripts/test-answer-path-sol.test.mjs`: 8/8 통과. 입력 누출 차단, 원문 규칙 삽입, 지도 층·노드·어휘 검증, 채점 null·덮어쓰기 필드, 인용 불일치의 지표 처리, 손 계산 지표, 동결 재사용, 요청·비용 상한, 형식 재시도, API 오류 보존을 확인했다.
  - 지정 순서대로 테스트 → prepare → map → run → report 완료(2026-10-14 KST). prepare 외부 요청 0, map 2/2 첫 요청 성공·동결, run 105/105 유효 출력, report 산출물 3개 생성.
  - 지도 요청 2/6, 채점 요청 108/120, 형식 재시도 0. API 오류 3회는 삭제 없이 보존·동일 요청 해시 재전송으로 복구했다(N6-r2 HTTP 503 1회; N4-r3 HTTP 상태 없음 2회). 동결 입력·지도·실행기 변경 없음.
  - 기존 실행기 단가로 비용 추정 $1.867058, 실패 요청 사용량 미확정 예약 $0.268884, 상한 계산 합계 $2.135942 ≤ $5. 가격은 현재 단가 확인이 아닌 기존 사용자 제공값 재사용이다.
  - 다수결: 결과 30/35(85.7%), 실패 종류 17/20(85.0%), 실패 요소 15/20(75.0%), 정답 꼬리표 6/6(100.0%). 반복별 지표는 `REPORT.md`에 전부 기록했다.
  - 3회 일관성 33/35(94.3%), 불일치 W7·X3. 과잉 분류 3/9(33.3%; W10·X10·I1). 덮어쓰기 11회/4사례(W8 3, X2 3, X3 2, X10 3), 인용 부분 문자열 불일치 0.
  - 독립 Python 검산: 105개 고유 사례/회차, 다수결·지표·일관성·인용·110요청 시작/종료 대응·비용 집계·복구 요청 해시 일치 통과. 작업 전 해시와 대조해 기존 `memory/`·`packages/`·실험 파일 변경 0개 확인.
  - `.env` 열람 없이 API 실행은 모두 `node --env-file-if-exists=.env`로만 키 로드. 기준 라벨·basis·Codex 지도·이전 채점 결과의 모델 입력 없음. 채점 단독 A안·다른 모델 실행, `memory/` 수정·커밋·푸시 없음.
- 남은 문제:
  - 실행은 완료했지만 기준과 전부 일치하지는 않는다. 결과 불일치 W9·W10·I3·S5·N4, 실패 종류·요소 차이는 `REPORT.md`와 사례별 3회 비교 `REVIEW.md`에 기록했다.
  - 근거 없음·미확정 9사례 중 3사례 과잉 분류, 기준상 W8 외 X2·X3·X10 추가 덮어쓰기가 남았다. W7·X3의 반복 차이도 그대로 보존했다. 지도는 재생성·수정하지 않았고 A안은 실행하지 않았다.
  - 실패 API 요청 3회의 실제 사용량·청구액과 HTTP 상태 없는 오류 원인은 미확정이다. 비용 예약은 원장에 남아 있다.
  - 두 문항·가상 풀이 검증이며 실제 학생 효과·일반화·운영 정확도 검증은 아니다. 정책 변경·운영 반영 판단은 하지 않았다.
