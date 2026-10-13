# 인계: 정답 경로 파일럿 2차 (층 구조·실패 종류, Codex 에이전트 직접 수행)

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex (A: 지도·채점 1회차·보고 / B: 독립 재채점, 별도 실행)
- 관련 결정: `memory/decisions/D-0121-answer-path-layers-and-failed-operation.md` (D-0119 일부 대체)
- 정의 문서(필독, 특히 "v0.1 개정 규칙" 절): `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md`
- 선행: 1차 인계 `docs/handoffs/2026-10-13-answer-path-depth-pilot.md`, 1차 결과 `docs/experiments/answer-path-depth-pilot-2026-10-13/`

## 목표

개정 규칙(층 구조, 오답=실패 노드 종류, 정답 꼬리표, 오답 분모)이 작동하는지, 그리고 같은 풀이를 독립적으로 두 번 채점했을 때 같은 결과가 나오는지 확인한다.

## 범위 밖

- 외부 API·모델 호출 스크립트 금지. 판단은 Codex가 직접 한다.
- `packages/**`, `memory/`, 기존 실험 폴더(1차 포함) 수정 금지. `.env` 열람·커밋·푸시 금지.
- **보지 말 것:** 1차 인계·정의 문서·이 문서 외의 1차 산출물 중 `item-maps/`·`scoring.json`(A 실행은 1차 `REPORT.md`의 1·5절만 참고 가능, 지도를 베끼지 말고 새 규칙으로 처음부터 만든다). `docs/experiments/thought-diagnosis-v01-2026-10-10/`의 `gold-labels.json`·`REVIEW.md`·`RESULTS.json`·모델 출력, `cases.json`의 `basis`. 비공개 픽스처의 `answerChoiceId` 외 필드(사후 비교용 `referencePath` 길이는 A 실행의 채점 완료 후에만).

## 입력

- 문항(공개): `packages/pipeline/fixtures/experiments/problem-solving/public/information-asymmetry-free-marketplace-q13.json`, `.../public/surface-tension-laplace-q16.json`
- 정답 키: 비공개 픽스처의 `answerChoiceId`만 (정보 비대칭 C5, 표면장력 C3)
- 학생 풀이: `docs/experiments/thought-diagnosis-v01-2026-10-10/cases.json`에서 두 문항 사례 15개의 `id`·`choiceId`·`rationale`만

출력 폴더: `docs/experiments/answer-path-depth-pilot-v2-2026-10-13/`

## 실행 A

### A1. 문항 지도 생성 → 동결 (사례를 읽기 전에)

`item-maps/<questionId>.json`:

```json
{
  "questionId": "...", "stemPolarity": "POSITIVE|NEGATIVE", "answerChoiceId": "C3",
  "choices": [
    { "choiceId": "C2", "verdict": "APPROPRIATE|INAPPROPRIATE",
      "nodes": [
        { "id": "n1", "type": "READ|LINK|APPLY", "operation": "하는 일", "evidence": "문단·구절", "dependsOn": [], "layer": 1,
          "element": "E4", "outsideVocabulary": null }
      ],
      "depth": 3, "coreElement": "E4" }
  ]
}
```

- 정의 문서 "v0.1 개정 규칙"을 그대로 따른다: 필요한 노드만, `APPLY`는 선지당 1개·최상층·최종 대조 포함, 기호 확정은 별도 `READ`(E2), E6 범위 제한, 노드당 요소 0~1개, 어휘 밖이면 `element: null` + `outsideVocabulary` 메모.
- `layer`는 `dependsOn`에서 계산한 값과 일치해야 한다(검증). `depth` = `APPLY` 노드 층.
- 두 파일 sha256을 `FROZEN.json`에 기록. 이후 수정 금지. 사후 발견 문제는 보고서 "지도 문제" 절에.

### A2. 채점 1회차 → `scoring-r1.json`

```json
{ "caseId": "S2", "selectedChoiceId": "C2",
  "result": "CORRECT|WRONG|WRONG_NO_RATIONALE|POLARITY_FAILURE",
  "depth": 3,
  "tags": ["GUESS_STATED", "RATIONALE_ERROR"],
  "failedOperation": "READ|LINK|APPLY|UNDETERMINED|null",
  "failedNodeId": "n2", "failedElement": "E4",
  "candidates": [ { "nodeId": "...", "type": "...", "element": "...", "reason": "..." } ],
  "studentQuote": "판단에 쓴 풀이 구절 그대로",
  "reason": "한 문장" }
```

- `CORRECT`: `depth` = 정답 선지 층수, 실패 필드 null. 꼬리표는 풀이에 드러난 경우만: `GUESS_STATED`(찍음·모름 명시), `RATIONALE_ERROR`(지문과 어긋나는 진술. `studentQuote`에 인용).
- `WRONG`: 학생이 고른 선지의 노드 중 오류가 드러난 노드의 종류·요소. 앞선 노드 성공은 보충하지 않는다. 하나로 정할 수 없으면 `UNDETERMINED` + `candidates`.
- `WRONG_NO_RATIONALE`: 판정 근거가 없음(찍음·모름·선지 재진술·선택 선지와 무관한 사실만). 실패 필드 null.
- `POLARITY_FAILURE`: 내용 판정은 맞으나 발문 극성 때문에 틀림. `failedElement: "E1"`, `failedOperation: null`.

### A3. 보고 → `REPORT.md` (마크다운 표, JSON 덤프 금지)

1. 문항 지도 요약: 선지별 층수·노드 수(종류별)·핵심 요소, 어휘 밖 노드 목록.
2. 1차 대비: 선지별 1차 고리 수 ↔ 2차 층수·노드 수 (1차 `REPORT.md` 1절의 표 사용).
3. 사례별 채점 표(r1).
4. 지표(r1): 깊이별 정답, 정답 꼬리표, 오답 분모(전체·종류 관측·미확정·근거 없음·극성), 실패 종류 분포, 요소별 성공·실패.
5. 규칙이 막힌 지점(유형별, 사례 ID).
6. 지도 문제(동결 후 발견).
7. 사후 참고: `referencePath` 길이 ↔ 정답 선지 층수.

## 실행 B (별도 Codex 실행, A 완료 후 Claude가 시작)

- 입력: 동결 지도(`item-maps/`, 해시 확인), 정의 문서, 이 문서, 학생 풀이(허용 필드).
- **보지 말 것:** `scoring-r1.json`, `REPORT.md`.
- 출력: 같은 스키마의 `scoring-r2.json`만. 그 외 파일 수정 금지.
- r1·r2 비교(결과·`failedOperation`·`failedNodeId`·`failedElement`·`tags`)는 Claude가 한다.

## 완료 조건

- [ ] A: `item-maps/` 2개(층 검증 통과), `FROZEN.json`, `scoring-r1.json`(15), `REPORT.md`
- [ ] B: `scoring-r2.json`(15), r1·`REPORT.md` 미열람
- [ ] 외부 요청 0, 금지 파일 미열람

## 중단·보고 조건

- 이 문서와 정의 문서·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 미확정·어휘 밖은 중단 사유가 아니라 기록 대상이다.

## 결과 보고 (실행 후 작성)

- 변경 파일 (실행 A만):
  - `docs/experiments/answer-path-depth-pilot-v2-2026-10-13/scoring-r1.json` (이번 재개에서 생성, 15개)
  - `docs/experiments/answer-path-depth-pilot-v2-2026-10-13/REPORT.md` (이번 재개에서 생성)
  - 이 인계 문서의 `결과 보고` 절.
  - A1의 지도 2개·`FROZEN.json`은 선행 실행에서 완료·동결된 산출물이며 이번 재개에서는 수정하지 않았다.
- 실행 상태:
  - A1 완료·동결 유지: 선행 실행에서 학생 풀이 열람 전에 생성한 지도 2개와 기존 검증 기록을 유지했다. 이번 재개는 재생성 없이 해시만 확인했다. 재개 시·완료 시 두 지도 sha256이 `FROZEN.json`과 일치했고, `FROZEN.json` 자체 해시도 유지됐다(상세는 `REPORT.md` 실행·검증 기록).
  - 입력 수 확인: `cases.json`의 `cases` 배열 전체를 두 `questionId`로 필터링해 정보 비대칭 9개(`I1`~`I6`, `N1`, `N6`), 표면 장력 6개(`S1`~`S6`, `N4`), 총 15개를 확인했다. 앞선 12개 집계는 뒤쪽 `N1`·`N4`·`N6` 누락에 따른 오류였으며 입력 불일치는 해소됐다. `questionId`는 필터에만, `id`·`choiceId`·`rationale`는 채점에만 사용했다.
  - A2 완료: Codex가 직접 15개를 1회 채점해 `scoring-r1.json`에 기록했다. 정답 6, 오답 9(실패 종류 확정 1·미확정 1·근거 없음 5·극성 실패 2). 정답 꼬리표는 찍음 2·근거 오류 4이며 2개는 중복이다. 실패 종류 확정은 `S2`의 `READ`/`C2/n2`/`E5`, 미확정은 `I1`의 후보 3개다.
  - A3 완료: `REPORT.md`에 지도 요약·1차 대비·r1 사례별 표·분모와 지표·규칙 한계·동결 지도 문제·사후 참고를 작성했다. A2 완료 후에만 비공개 픽스처의 `referencePath` 길이를 확인했으며 두 문항 모두 4였다(정답 선지 층수는 모두 3). 사후 길이로 지도·채점을 수정하지 않았다.
  - 검증: 15개 고유 사례·선택 일치·필수 필드·결과별 null 규칙·실패 노드/요소 대응·학생 인용 원문 일치·집계·동결 해시 확인을 통과했다.
  - 외부 요청 0. 금지 산출물·`.env`·`cases.json`의 `basis`·비공개 픽스처의 허용 정답 키와 채점 후 경로 길이 외 필드는 열람하지 않았다. `memory/`·`packages/**`·기존 실험 산출물 수정, 커밋·푸시 없음. 실행 B는 수행하지 않았다.
- 남은 문제:
  - 실행 A는 완료했다. 실행 B의 독립 재채점과 r1·r2 비교는 아직 수행하지 않았으므로 채점 일관성은 미검증이다.
  - `I1`은 오류 연산 미확정으로 남겼다. 두 정답 선지가 모두 3층이고 확정 실패 종류도 1개뿐이어서 깊이·종류별 일반화는 할 수 없다.
  - 동결 지도의 요소 경계·근거 분할·역방향 범위 해석 문제는 `REPORT.md` 6절에 기록했으며 지도 수정은 하지 않았다.
