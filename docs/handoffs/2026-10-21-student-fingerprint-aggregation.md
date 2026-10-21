# 인계: 학생 이해 지문 집계 (공손룡·도파민 판정 자료로 시험)

- 날짜: 2026-10-21
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0143-analysis-map-gongsun-pilot.md`(오류 집계 규칙), `memory/decisions/D-0147-relation-vocabulary-sampling.md`(18유형), 논의 `docs/review/analysis-map-student-fingerprint-2026-10-18.md`(축 (나)). 이번 작업 결정 기록은 Claude가 작업 뒤 쓴다.

## 목표

이미 있는 판정 자료(라운드별 노드·관계 라벨)를 **묶음 단위(세션 또는 출처) × 칸(관계 유형·갈래, 노드 층)**으로 세어 학생 이해 지문 표를 내는 스크립트를 만든다. 외부 전송 없음.

입력(읽기만):

| 지문 | 지도 | 라운드 | 판정 | 결합 | 관계 유형 |
|---|---|---|---|---|---|
| 공손룡 | `docs/experiments/analysis-map-gongsun-2026-10-16/frozen-map.json` | `.../stage2-v3/rounds.jsonl` | `.../stage2-v3/judgments.jsonl` | `.../stage2-v3/combined.json` | `docs/experiments/student-fingerprint-2026-10-21/classify/gongsun-long-later-mohists/classify.json` |
| 도파민 | `docs/experiments/analysis-map-dopamine-2026-10-18/frozen-map.json` | `.../judge-v3/rounds.jsonl` | `.../judge-v3/judgments.jsonl` | `.../judge-v3/combined.json` | `docs/experiments/student-fingerprint-2026-10-21/classify/dopamine-motor-control/classify.json` |

## 범위 밖

- 외부 API 호출, 재판정, 지도·판정·분류 파일 수정.
- `scripts/run-analysis-judge-gongsun.mjs`는 import만 한다(수정 금지). `packages/**`, 다른 세션 파일, 공유 메모리 파일(`memory/CURRENT_STATE.md`·`DECISIONS.md`·`INDEX.md`·`WORK_TREE.md`) 수정 금지.
- 파일 삭제(`rm`) 금지. 필요하면 멈추고 보고.

## 손댈 파일과 계약

### `scripts/aggregate-student-fingerprint.mjs` (새 파일)

CLI: `node scripts/aggregate-student-fingerprint.mjs --config <json> --out <dir> [--group-by session|source]` (기본 `session`). config는 위 표의 지문 목록 `[{ passageId, mapPath, roundsPath, judgmentsPath, combinedPath, classifyPath }]`. 실행용 config 파일 `docs/experiments/student-fingerprint-2026-10-21/config.json`도 만든다.

규칙:

1. **단위와 칸.**
   - 노드 칸 = 층: 명제(지도 `propositions`), 합성(`COMPOSITE`), 요지(`PARAGRAPH_GIST`). 판정 대상 노드만(`combined.json`의 `nodes`에 있는 것).
   - 관계 칸 = 18유형(classify `items[].type`)과 갈래(`run-relation-classify.mjs`의 `BRANCH_OF` import). `OTHER`는 그대로 한 칸.
2. **문단을 넘는 관계는 세지 않는다.** `combined.json` 관계 결과의 `crossEndUnchecked`가 비어 있지 않은 관계는 모든 수(분자·분모·오류 사건 칸 소속)에서 뺀다. 출력 어디에도 이 관계를 위한 칸을 두지 않는다(건수 메타 한 줄만 `excludedCrossRelations`).
3. **라벨.** `combined.json`의 `label`(DIRECT·PARTIAL·ABSENT·CONTRADICTS). `null`은 UNJUDGED로 세고 비율 분모에서 뺀다.
4. **비율(칸마다).** N = D+P+A+C.
   - 포착률 = (D+P)/N
   - 정밀도 = D/(D+P), D+P=0이면 null
   - 오류율 = C/(D+P+C), 분모 0이면 null
   - 원 건수 D·P·A·C·UNJUDGED도 함께 낸다.
5. **라운드.** 대화(`dialogueId`)마다 `roundIndex`가 가장 작은 라운드 = `first`, 가장 큰 라운드 = `last`. 집계를 `first`와 `last` 두 벌 낸다(라운드가 하나면 둘이 같다).
6. **오류 사건.** `run-analysis-judge-gongsun.mjs`의 `errorEvents(rounds, judgmentRows, map)`를 지문별로 호출하고, 해당 벌(`first`/`last`)의 라운드에서 생긴 사건(`events` 중 `round`가 그 라운드인 것)만 쓴다. 사건의 `units`에서 문단을 넘는 관계는 지운다(규칙 2). 칸마다 "오류 사건 수" = 그 칸에 속한 단위를 하나라도 포함한 사건 수. 묶음 전체 사건 수도 따로 낸다. `unlocated` 건수는 메타로.
7. **묶음.** `session` = rounds의 `sessionId`, `source` = rounds의 `source`(v4·sh·test·copy). 묶음 키는 `<passageId 무관>`으로 합친다(같은 세션이 두 지문에 걸치면 한 묶음). 전체 합계 묶음 `ALL`도 낸다.
8. **표시 순서.** 갈래·유형은 `BRANCHES` 순서, 층은 명제·합성·요지.

출력(`--out`):
- `fingerprint.json`: `{ version: 1, generatedFrom: <config 경로와 입력 파일 sha256>, groupBy, excludedCrossRelations, unlocatedErrors, groups: [{ key, rounds: { first: n, last: n }, views: { first: <View>, last: <View> } }] }`, `View = { layers: {명제|합성|요지: Cell}, branches: {갈래: Cell}, types: {TYPE: Cell}, errorEvents: n }`, `Cell = { D, P, A, C, UNJUDGED, capture, precision, errorRate, errorEvents }`.
- `FINGERPRINT.md`: 묶음마다 `first` 표(층 3행 + 갈래 4행 + 칸 N>0인 유형 행), 열은 N·포착률·정밀도·오류율·오류 사건. `last`는 `ALL` 묶음만 표로 싣고 나머지는 json에만. 맨 위에 주의 두 줄을 그대로 넣는다: "포착률에는 말 안 함과 모름이 섞여 있다. 판단에는 오류율을 먼저 쓴다." / "기록 세션은 대부분 개발 중 입력이라 세션 차이를 학생 차이로 해석하지 않는다."

### `scripts/aggregate-student-fingerprint.test.mjs` (새 파일)

작은 가짜 지도·라운드·판정으로 확인:
- 비율 세 개와 null 처리(분모 0), UNJUDGED 분모 제외.
- 문단을 넘는 관계가 어떤 칸에도 들어가지 않음.
- 노드 층 분류(명제·합성·요지).
- 오류 사건: 한 학생 문장이 명제·합성·관계 셋에 ✕를 내면 각 칸 오류 사건 1, 묶음 전체 1.
- `first`/`last` 라운드 선택.
- `--group-by source`와 `session` 묶음 키, `ALL` 묶음.

## 완료 조건

- [ ] `node --test scripts/aggregate-student-fingerprint.test.mjs` 통과, 기존 `node --test scripts/run-analysis-*.test.mjs scripts/run-relation-classify.test.mjs scripts/import-suneung-passage.test.mjs` 통과(73개) 유지.
- [ ] 두 번 실행: `--group-by source --out docs/experiments/student-fingerprint-2026-10-21/by-source`, `--group-by session --out docs/experiments/student-fingerprint-2026-10-21/by-session`. 외부 요청 0.
- [ ] 결과 보고에 by-source `ALL`·`copy`·`test` 묶음의 층 3행 수치를 붙인다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- `combined.json`과 `judgments.jsonl`의 라벨이 어긋나거나, classify에 지도 관계 id가 빠져 있으면 멈추고 보고.

## 결과 보고 (실행 후 작성)

- 변경 파일: `scripts/aggregate-student-fingerprint.mjs`, `scripts/aggregate-student-fingerprint.test.mjs`, `docs/experiments/student-fingerprint-2026-10-21/config.json`, 산출물 `by-source/`·`by-session/`(fingerprint.json, FINGERPRINT.md).
- 테스트 결과: 신규 6개 통과. 기존 명령에 신규 테스트 포함 실행 시 79개 통과(기존 73 + 6), 실패 0. 두 번 실행(by-source, by-session) 완료, 외부 요청 0.
- 남은 문제: 해석 선택 3가지(설계 공백, 아래). (1) `excludedCrossRelations`는 전체 라운드의 문단 간 관계 인스턴스 수(113)이며 first/last 구분 없음. `unlocatedErrors`도 전체 라운드 합(2). (2) 문단 간 관계만 남은 오류 사건은 사건 수에서 뺌. (3) MD 갈래 표는 기타를 N>0일 때만 표시(BRANCHES는 5갈래, 인계 문서의 '4행'과 맞춤). 결합과 판정 라벨 불일치·classify id 누락은 발생하지 않음(발생 시 예외로 중단).

## 보완 v2 (2026-10-21, 사용자 "오케이")

첫 실행 결과 검토(Claude)에서 나온 두 가지를 고친다. 외부 전송 없음. 위 계약 중 아래와 어긋나는 부분은 이 절을 따른다.

1. **관계 오류를 자체 오류와 물려받은 오류로 나눈다.**
   - 라운드의 관계 라벨이 CONTRADICTS이고, 같은 라운드에서 그 관계의 양 끝(`fromId`·`toId`, 노드 라벨은 같은 라운드 `combined.json`의 `nodes`) 중 하나라도 CONTRADICTS이면 **물려받은 오류**다. 아니면 **자체 오류**다.
   - 관계 칸(유형·갈래)의 `C`는 자체 오류만 센다. 물려받은 오류는 새 필드 `Cinherited`로 세고, N·포착률·정밀도·오류율 분모 어디에도 넣지 않는다. 노드 칸에는 `Cinherited`가 늘 0이다.
   - 오류 사건의 관계 칸 소속: 사건의 관계 단위 중 그 라운드에서 물려받은 오류인 것은 관계 칸에 사건을 더하지 않는다(노드 칸·묶음 전체 사건 수는 그대로).
2. **표본 크기.**
   - `SMALL_N = 10`. Cell에 `smallSample: N < SMALL_N`을 더한다(N = D+P+A+C, C는 자체 오류).
   - `FINGERPRINT.md`: `ALL`이 아닌 묶음 표는 층 3행 + 갈래 행만 싣는다(유형 행 없음). `ALL` 표만 유형 행을 싣는다. 모든 표에 `물려받은 오류` 열(Cinherited)을 더하고, `smallSample`인 행은 N 옆에 `(표본 적음)`을 붙인다. 맨 위 주의에 한 줄 더: "관계 칸의 오류율은 양 끝 사실이 맞는데 관계만 틀린 경우(자체 오류)만 센다. 끝의 사실 오류로 같이 틀린 관계는 '물려받은 오류'로 따로 적는다."
   - `fingerprint.json`은 모든 묶음에 유형까지 그대로 남긴다.
3. 테스트 추가: 끝 명제가 ✕인 관계 ✕ → `Cinherited` 1·`C` 0·분모 제외·관계 칸 사건 0; 끝이 모두 ✕ 아님 → 자체 오류 `C` 1; `smallSample` 경계(N=9 true, N=10 false); 묶음 표에 유형 행 없음·ALL 표에 있음.
4. 같은 두 명령으로 by-source·by-session을 다시 만든다(덮어쓰기). 결과 보고에 by-source `test`·`v4`·`ALL` 갈래 행(N, 오류율, Cinherited)을 붙인다.

### 보완 v2 결과

- 변경: `scripts/aggregate-student-fingerprint.mjs`(Cinherited·smallSample·표 열/유형 행 규칙), `.test.mjs`(신규 3개, 기존 2개 기대값을 물려받은 오류 규칙에 맞게 수정), by-source·by-session 재생성.
- 테스트: 신규 파일 9개 통과, 전체 묶음 82개 통과. 외부 요청 0.
- 참고: 물려받은 오류 판정은 같은 라운드 `combined.json`의 `nodes` 끝 라벨 기준. 유형 행은 N>0인 것만 표시(ALL 표).

