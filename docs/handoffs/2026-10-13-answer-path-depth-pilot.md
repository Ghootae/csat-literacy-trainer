# 인계: 정답 경로·추론 깊이 파일럿 (Codex 에이전트 직접 수행)

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0119-answer-path-elements-and-depth.md`
- 정의 문서(필독): `docs/review/answer-path-element-vocabulary-v0-2026-10-13.md`

## 목표

프롬프트·코드를 만들기 전에, D-0119의 문항 지도 형식과 채점 규칙이 실제로 작동하는지 **Codex가 직접 모델 역할을 해서** 확인한다.
- 선지 사슬을 일정한 크기로 쪼갤 수 있는가
- 오답 풀이에서 끊긴 고리를 하나로 정할 수 있는가, 애매한 경우는 얼마나·왜 생기는가
- 누적 지표(도달 깊이, 끊김 위치 비율, 요소별 성공·실패)가 계산되는가

## 범위 밖

- 외부 API 호출·스크립트로 모델 호출 금지. 판단은 Codex가 직접 한다.
- `packages/**`, `memory/`, 기존 실험 폴더 수정 금지. `.env` 열람·커밋·푸시 금지.
- **보지 말 것:** `docs/experiments/thought-diagnosis-v01-2026-10-10/gold-labels.json`, 그 폴더의 `REVIEW.md`·`RESULTS.json`·모델 출력, `cases.json`의 `basis` 필드. 비공개 픽스처의 `referencePath`·`requiredPathStepIds`·`representativeWrongPaths`·`finalAnswerExplanation`·`itemInferences`·`optionClaims`도 1단계(문항 지도) 생성 전에는 보지 않는다.

## 입력

- 문항(공개): `packages/pipeline/fixtures/experiments/problem-solving/public/information-asymmetry-free-marketplace-q13.json`, `.../public/surface-tension-laplace-q16.json` (지문·발문·보기·선지)
- 정답 키: 같은 이름의 비공개 픽스처(`packages/pipeline/fixtures/experiments/problem-solving/<id>.json`)에서 `answerChoiceId`만 읽는다. (정보 비대칭 C5, 표면장력 C3)
- 학생 풀이: `docs/experiments/thought-diagnosis-v01-2026-10-10/cases.json`에서 위 두 `questionId`의 사례(15개)의 `id`·`choiceId`(학생이 고른 선지)·`rationale`만.

## 절차

출력 폴더: `docs/experiments/answer-path-depth-pilot-2026-10-13/`

### 1단계: 문항 지도 생성 → 동결 (사례를 읽기 전에)

문항마다 `item-maps/<questionId>.json`:

```json
{
  "questionId": "...", "stemPolarity": "POSITIVE|NEGATIVE", "answerChoiceId": "C5",
  "choices": [
    { "choiceId": "C1", "verdict": "APPROPRIATE|INAPPROPRIATE",
      "chain": [ { "link": 1, "operation": "이 고리에서 하는 일(찾기/변환/결합/적용/비교 등)", "evidence": "문단 번호·핵심 구절", "element": "E1~E10" } ],
      "depth": 3, "coreElement": "E6", "elements": ["E6", "E3"] }
  ],
  "answerPaths": { "A_direct": ["E.."], "B_elimination": ["E.."] }
}
```

- 사슬은 지문 근거에서 그 선지의 적절/부적절 판정까지의 연산 고리다. 발문 극성 처리(E1)는 사슬에 넣지 않는다(별도 처리, 아래).
- 고리 하나 = 연산 하나. 정의 문서의 D1~D4 눈금을 참고하되 기록 단위는 고리 수다.
- 두 파일을 다 만든 뒤 sha256을 `FROZEN.json`에 적는다. **이후 수정 금지.** 사례를 보며 지도가 이상하다고 느끼면 고치지 말고 `REPORT.md`의 "지도 문제" 절에 적는다.

### 2단계: 사례 채점

`scoring.json`에 사례마다:

```json
{ "caseId": "I1", "selectedChoiceId": "C4", "result": "CORRECT|WRONG|WRONG_NO_RATIONALE",
  "judgedChain": "C4", "chainLength": 4,
  "successfulLinks": [1,2], "brokenAt": 3, "brokenRatio": 0.75,
  "elementsSucceeded": ["E.."], "elementsFailed": ["E.."],
  "studentQuote": "끊긴 지점 판단에 쓴 풀이 구절 그대로",
  "polarityFailure": false,
  "ambiguity": { "flag": false, "reason": null, "alternatives": [] } }
```

규칙(D-0119):
- **CORRECT**(선택 = 정답): 근거와 무관하게 정답 선지 사슬 전체 성공, `answerPaths.A_direct` 요소 전부 성공. `brokenAt` null.
- **WRONG**: 학생이 고른(=잘못 판정한) 선지의 사슬에서 풀이 근거로 성공한 고리와 끊긴 고리를 정한다. 끊긴 고리의 요소를 실패로 센다. `brokenRatio` = `brokenAt` ÷ `chainLength`.
- **WRONG_NO_RATIONALE**(찍음·모름·선지 재진술 등 판단 근거 없음): `brokenAt`·요소 null, 실패 횟수에만 포함.
- 내용 판정은 맞는데 발문 극성 때문에 틀린 경우: `polarityFailure: true`, `elementsFailed: ["E1"]`, 사슬 고리는 전부 성공으로 두고 `brokenAt` null. 끊김 비율 계산에서 제외.
- 끊긴 고리를 하나로 정할 수 없으면 가장 그럴듯한 하나를 고르고 `ambiguity.flag: true`, 이유와 다른 후보를 적는다.

### 3단계: 보고

`REPORT.md`(마크다운 표, JSON 덤프 금지):
1. 문항 지도 요약: 선지별 깊이·핵심 요소 표.
2. 사례별 채점 표: 사례·선택·결과·사슬 길이·끊긴 고리·비율·실패 요소·애매 여부.
3. 지표: 정답 사례의 도달 깊이 평균, 오답 사례의 끊김 비율 평균·분포, 요소별 성공/실패 횟수, 극성 실패 수, 판단 근거 없음 수, 애매 사례 수.
4. 규칙이 막힌 지점: 규칙만으로 결정할 수 없었던 상황을 유형별로(예시 사례 ID와 함께). 이 파일럿의 핵심 산출물이다.
5. 지도 문제: 1단계 지도에서 사후에 발견한 문제(수정은 하지 않음).
6. (사후 참고) 비공개 픽스처의 `referencePath` 단계 수와 1단계 정답 선지 사슬 길이 비교. 2단계 완료 후에만 연다.

## 완료 조건

- [ ] `item-maps/` 2개, `FROZEN.json`(해시), `scoring.json`(15사례), `REPORT.md`
- [ ] 외부 요청 0, 금지 파일 미열람

## 중단·보고 조건

- 이 문서와 정의 문서·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 단, 끊긴 고리가 애매한 것은 중단 사유가 아니라 `ambiguity`로 기록한다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `docs/experiments/answer-path-depth-pilot-2026-10-13/item-maps/information-asymmetry-free-marketplace-q13.json` (신규, 사례 열람 전 생성·동결)
  - `docs/experiments/answer-path-depth-pilot-2026-10-13/item-maps/surface-tension-laplace-q16.json` (신규, 사례 열람 전 생성·동결)
  - `docs/experiments/answer-path-depth-pilot-2026-10-13/FROZEN.json` (신규, 두 지도의 SHA-256)
  - `docs/experiments/answer-path-depth-pilot-2026-10-13/scoring.json` (신규, 15사례)
  - `docs/experiments/answer-path-depth-pilot-2026-10-13/REPORT.md` (신규, 지정한 6개 절·마크다운 표)
  - 이 인계 문서는 **결과 보고 절만** 수정했다. 완료 조건 체크박스와 다른 절은 유지했다.
- 실행·검증: Codex가 직접 판단했다. 외부 요청 0회, 금지 파일·필드 미열람. 지도 해시, 10선지 구조, 15사례의 선택·원문 인용·채점 규칙·집계를 로컬 검증했다. 정답 6개, 일반 내용 오류 2개, 극성 실패 2개, 판단 근거 없음 5개, 애매 사례 1개(I1). 정답 도달 깊이 평균 4.50고리, 끊김 비율 평균 71.67%(분모 2개). 비공개 referencePath 길이는 채점 저장 후에만 읽었다. memory 수정·커밋·푸시 없음.
- 남은 문제:
  - I1은 가장 그럴듯한 5고리(E6)를 선택했지만 3고리(E8)·4고리(E6)도 후보다. 실제 최초 끊김은 미확정이다. I1·S2의 앞선 고리 성공은 관측되지 않아 보충하지 않았다.
  - 고리의 분할 크기, 병렬 근거의 선형 배열, 무관한 지문 사실의 근거 없음 처리, 고리와 요소의 집계 단위, 정답 근거 오류가 성공에 가려지는 한계를 REPORT.md에 기록했다. 지도는 사후 수정하지 않았다.
  - 산출물 형식·계산의 실행 가능성을 확인했으며, 진단 정확성·반복 일관성·학생 효과를 입증한 결과는 아니다.
  - 작업 중 기존 packages 파일 3개의 메타데이터 변경이 관측됐다(파일 목록은 REPORT.md). 이번 작업은 해당 파일에 쓰기·되돌림을 하지 않았다. memory와 기존 실험 파일의 메타데이터 변화는 없었다.
