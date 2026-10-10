# 문제 풀이 v3 운영 기본값 전환

## 변경된 사실

- 사용자 결정에 따라 `source-direct-problem-dialogue-prompt-v3`를 원문 직접 evaluator의 운영
  기본값으로 전환했다.
- v2는 스키마에서 계속 허용하지만 과거 회귀와 명시적 비교 실행에서만 선택한다.
- 인용·상태 계약 검증 오류는 `contract_validation`으로 분류한다. 학생 선택·근거·후속 답변을
  이미 반영한 세션을 되돌리지 않고 `EVALUATION_ERROR`에서 같은 입력으로 재개한다.
- 정답 근거 평가의 계약 오류도 미검증 정답으로 즉시 종료하지 않고 재개 가능 상태로 보존한다.
  전송 장애가 제한 재시도 뒤 계속되는 경우의 기존 `UNCERTAIN` 안전 종료는 유지한다.
- 클라이언트의 자동 1회 재개와 `다시 진행` 수동 재개 경로는 그대로 사용한다.
- 빌드, 관련 Vitest 82개, 문제 풀이 브라우저 E2E 19개가 통과했다. 인용 오류와 상태 오류
  양쪽에서 저장된 학생 응답의 재개를 확인했고, 정답 근거 계약 오류의 재개도 확인했다.

## 검증 방향

다음 작업은 합성 기대값 확대가 아니라 학생이 문단 이해부터 문제 풀이까지 직접 사용하면서
질문 이해 가능성, 생각 추적, 답변 뒤 흐름을 관찰하는 것이다. 지문·문제 세트를 확장하되 개별
불편이 아니라 여러 지문에서 반복되거나 학습을 실제로 방해하는 문제만 일반화해 수정한다.

## 근거

- `memory/decisions/D-0008-problem-dialogue-v3-operational-default.md`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`
- `packages/pipeline/src/problem-solving/source-direct-evaluator-runtime.ts`
- `packages/app/src/server/problem-solving.ts`
- `packages/app/src/server/problem-solving.test.ts`
- `docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md`
