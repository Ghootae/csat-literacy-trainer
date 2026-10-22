# 인계: 선지 연결 3회 결과 동결 (선지별 대표 회차, A안)

- 날짜: 2026-10-22
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0162-choice-link-layer-direction.md` 보완 6(사용자 "A안으로 선택", 2026-10-22). 근거 보고: `docs/experiments/choice-link-2026-10-22/REPORT-v5-ui-desktop.md` 6절.

## 목표

- `runs/ui-v5`의 세 회차 결과를 선지마다 대표 회차 하나로 골라 지문별 동결 파일을 만든다.
- 고르는 규칙은 코드로 정한다. 규칙으로 정해지지 않는 선지만 Claude가 쓴 덮어쓰기 파일로 정한다.
- 동결 파일은 현행 `validateChoiceLink`를 위반 0으로 통과한다.

## 범위 밖

- 외부 API 요청을 하지 않는다. 모델 호출은 없다.
- `runs/ui-v5`의 원 결과, 지도·입장·classify·지문·targets 파일, `scripts/run-choice-link.mjs`는 고치지 않는다. 함수는 import해서 쓴다.
- 파일 삭제 금지. 삭제가 필요해 보이면 멈추고 보고한다.
- `git add`·`commit`·`stash` 금지. `packages/**`, `AGENTS.md`, `memory/**`는 건드리지 않는다.

## 손댈 파일과 계약

### `scripts/freeze-choice-link.mjs` (새 파일)

사용법: `node scripts/freeze-choice-link.mjs --targets <json> --runs-dir <dir> --out <dir> [--overrides <json>] [--fixed <json>]`

- 외부 요청은 없다. `.env`도 읽지 않는다.
- `loadTargets(targets, fixed)`로 문항·정오(truth)·지도를 읽는다.
- 회차 결과는 `<runs-dir>/<key>/r<k>/choice-link.json`(k = 1, 2, …, 있는 만큼)에서 읽는다.
- 회차별 위반은 `validateChoiceLink`로 **다시 계산**한다. 저장된 validation 파일은 v4 규칙으로 계산된 것일 수 있어서다.
- 선지별 위반은 위반 문자열이 `q<문항>#<선지>`로 시작하는 것으로 가른다.

**선지별 선택 규칙.** 후보는 그 선지가 있는 모든 회차다. 아래 단계를 차례로 적용하고, 단계마다 남은 후보와 적용한 단계를 기록한다. 어떤 단계에서 후보가 0이 되면 그 단계는 건너뛰고 이전 후보를 유지한다. 이 경우 `skippedSteps`에 단계 이름을 기록한다.

1. `TYPE` (입력 truth가 FALSE인 선지만): 회차별 종류 집합(twisted 조각의 twistType 집합, 정렬)을 만든다.
   - 같은 집합이 2회 이상이면 가장 많은 집합(동점이면 회차 번호가 빠른 쪽이 가진 집합)과 같은 회차만 남긴다.
   - 같은 집합이 없으면 2회 이상 나온 종류를 하나라도 포함하는 회차만 남긴다.
   - 2회 이상 나온 종류가 하나도 없으면 **미결(`UNRESOLVED_TYPE`)**이다. 덮어쓰기가 없으면 멈추지 말고 미결 목록에 넣는다. 이때는 r1을 임시 선택한다.
2. `TARGET`: FALSE 선지는 twisted 조각의 `twistTargetIds` 합집합, TRUE 선지는 `supportIds` 합집합을 쓴다. 모든 회차(후보만이 아니라 전부)에서 같은 대상 집합이 2회 이상 나오면 가장 많이 나온 집합을 가진 후보만 남긴다(동수면 모두). 2회 이상 나온 집합이 없으면 통과. (수정 2026-10-22: 처음 문서의 "교집합 포함" 규칙은 정의상 아무것도 거르지 못해 executor가 보고함.)
3. `VALID`: 그 선지에 위반이 없는 후보만 남긴다.
4. `FIRST`: 남은 후보 중 회차 번호가 가장 빠른 것.

**덮어쓰기** `--overrides` JSON은 `[{ key, question, choice, run, reason }]` 형식이다. 해당 선지는 규칙 대신 그 회차를 쓰고 `selection.override = reason`을 남긴다. 덮어쓴 회차에 그 선지 위반이 있으면 예외로 멈춘다.

**출력** `<out>/<key>.json`:

```
{ version: 1, passageId, sourceRunsDir, runs: [1,2,3], generatedFrom: { targets, overrides|null },
  questions: [{ number, stemPolarity, extraSegments: [...],
    choices: [{ ...선택한 회차의 선지 객체 그대로(number, readingGap, explanationAgreement, note, parts),
      truth, selectedRun,
      selection: { decidedBy: 'TYPE'|'TARGET'|'VALID'|'FIRST'|'OVERRIDE'|'UNANIMOUS', skippedSteps: [], candidatesAfter: { TYPE:[..], TARGET:[..], VALID:[..] }, override: null|string, unresolved: false|true },
      runTypes: { r1:[..], r2:[..], r3:[..] },        // FALSE만, TRUE면 {}
      altTargetIds: [...] }] }] }                       // 다른 회차의 합집합 − 선택 회차의 것 (FALSE: twistTargetIds, TRUE: supportIds)
```

- `decidedBy`는 후보를 처음으로 하나로 줄인 단계다. 세 회차가 모두 끝까지 남았다가 FIRST로 정해졌고 세 회차의 종류 집합과 대상 합집합이 모두 같으면 `UNANIMOUS`로 적는다.
- `extraSegments`: 그 문항의 선지들이 고른 회차들의 `extraSegments`를 합친다(id 기준 중복 제거). 같은 id인데 `parentId`나 `quote`가 다르면 예외 `FREEZE_EXTRA_CONFLICT: <key> q<n> <id>`로 멈춘다. 선택한 조각이 참조하지 않는 extraSegment도 그 회차 것이면 포함해도 된다.
- `stemPolarity`는 선택된 회차들에서 같아야 한다. 다르면 예외로 멈춘다.
- 동결 파일마다 `validateChoiceLink`를 돌린다. 위반이 있으면 `<out>/<key>.validation.json`에 쓰고 요약에 표시한다(멈추지는 않음).

**요약** `<out>/FREEZE.md`와 `<out>/freeze-summary.json`:
- 지문별 선지 수, `decidedBy`별 수, 회차별 선택 수.
- 덮어쓰기 목록, 미결 목록, `skippedSteps`가 있는 선지 목록.
- 동결 파일 검증 결과(지문별 위반 수).
- FALSE 선지의 동결 종류 분포(twistType별 조각 수).

### `scripts/freeze-choice-link.test.mjs` (새 파일)

가짜 회차 결과로 다음을 확인한다.
- 단계별 선택: TYPE 다수 집합, 같은 집합 없을 때의 포함 규칙, 미결.
- TARGET 교집합 포함.
- VALID 위반 회차 제외.
- FIRST.
- UNANIMOUS 판정.
- 덮어쓰기와, 덮어쓴 회차에 위반이 있을 때의 예외.
- extraSegments 병합과 충돌 예외.
- altTargetIds 계산.
- 후보가 0이 되는 단계의 건너뜀 기록.

### `docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/overrides.json` (Claude가 이미 작성)

## 실행

```
node scripts/freeze-choice-link.mjs --targets docs/experiments/choice-link-2026-10-22/targets-ui.json --runs-dir docs/experiments/choice-link-2026-10-22/runs/ui-v5 --out docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen --overrides docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/overrides.json
```

## 완료 조건

- [ ] `node --test scripts/freeze-choice-link.test.mjs` 통과, `node --test scripts/run-choice-link.test.mjs` 회귀 통과
- [ ] 위 실행으로 지문 6개 동결 파일과 FREEZE.md·freeze-summary.json 생성
- [ ] 미결 0개(덮어쓰기로 해소). 아니면 목록 보고
- [ ] 동결 파일 검증 위반 합계 보고(기대 0)

## 중단·보고 조건

- 이 문서와 코드·데이터가 충돌하거나 설계 판단이 필요하면 멈추고 보고한다.
- 외부 요청이 필요해지면 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 실행 출력(FREEZE.md 요약 표):
- 해석 선택:
