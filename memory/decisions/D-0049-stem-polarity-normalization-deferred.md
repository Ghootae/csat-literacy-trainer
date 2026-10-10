---
id: D-0049
status: accepted
date: 2026-10-01
scope: problem-solving-evaluator-selection-semantics
supersedes: none
---

# 발문 극성과 선택 의미를 결정론적으로 정규화하는 설계를 채택하고 구현은 보류

## 결정

문제 풀이 판정기가 후속 턴마다 발문 극성을 다시 해석하지 않도록, 향후 수정 시 발문을 세션
시작 단계에서 한 번 정규화한다. 현재 `SELECT_CORRECT`와 `SELECT_INCORRECT` 같은 발문 극성을
각각 선택한 선지를 `VALID` 또는 `INVALID`로 판단하는 과제로 변환하고, 학생의 선지 선택이
뜻하는 판정도 코드가 결정론적으로 확정한다.

학생의 추론 재구성과 선택 의미는 다음처럼 분리한다.

1. `choiceImpliedVerdict`: 발문 정규화와 학생 선택으로 코드가 확정한 선지 판정
2. `reconstructedPath`: 학생이 실제로 표현한 판단 경로만 모델이 재구성한 기록
3. `rationaleImpliedVerdict`: 재구성된 근거가 해당 선지를 `VALID`, `INVALID`, `UNKNOWN` 중
   무엇으로 판단하게 하는지 명시한 파생 결론
4. `selectionRationaleConsistency`: 위 두 판정을 코드가 비교한 결과
5. `contentAssessment`: 선택–근거 일관성과 별도로 학생 추론 내용의 정확성을 평가한 결과

추론 마지막의 “그러므로 이 선지는 참/거짓이다”는 학생 직접 발화로 합치지 않는다. 학생 선택에서
결정되는 의도와 모델이 근거에서 도출한 결론을 출처가 다른 필드로 보존한다. 두 결론이 일치해도
학생 근거 내용이 틀리면 `SELECTION_EXECUTION`으로 바꾸지 않고 해당 의미 오류 층위를 유지한다.
이전에 활성화된 오류는 학생의 실제 수정·철회 증거 없이 다른 오류 층위로 교체해 해소할 수 없다.

## 계기

정보 비대칭과 사상의 자유 시장 이론 13번의 사용자 직접 실행에서, 학생은 ④의 내용을 틀렸다고
생각해 ‘적절하지 않은 것’으로 ④를 선택했다. 판정기는 학생의 잘못된 추론 경로를 대체로 정확히
재구성했지만, 후속 턴에서 ④ 선택을 ④ 내용에 대한 동의처럼 취급해
`INFERENCE_TRANSFORMATION`을 `SELECTION_EXECUTION`으로 바꾸고 `CORRECTED` 처리했다.

## 구현 상태

이 결정은 설계 방향만 승인한다. 현재 프롬프트, 스키마, 상태 머신, UI, 테스트와 운영 기본값은
변경하지 않는다. 사용자가 다른 문제 풀이 수정 사안과 함께 구현을 요청할 때 묶어서 진행한다.

## 구현 시 검증 조건

- 정보 비대칭 13번 실제 경로를 고정 재현해 ④ 선택과 학생 근거가 일관되며 내용 추론만
  잘못됐다고 판정해야 한다.
- `SELECT_CORRECT`와 `SELECT_INCORRECT` 대조에서 같은 근거의 선택 의미가 결정론적으로 반전돼야 한다.
- 실제 선택–근거 충돌은 계속 `SELECTION_EXECUTION`으로 검출해야 한다.
- 학생의 내용 오류가 실제로 수정되기 전에는 `CORRECTED`와 재선택을 허용하지 않아야 한다.
- 기존 정상 회복 경로와 정답 근거 평가 회귀를 유지해야 한다.

## 근거

- `.omc/logs/problem-solving/sessions.jsonl`
- `memory/checkpoints/2026-10-01-information-asymmetry-q13-user-review.md`
- `packages/pipeline/experiments/problem-solving/source-direct-problem-dialogue-prompt-v3.md`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`
- 사용자 결정: 2026-10-01 다른 수정 사안과 함께 후속 구현

