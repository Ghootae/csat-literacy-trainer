---
date: 2026-10-01
scope: problem-feedback-v4-fix-feasibility-review
base_commit: uncommitted
---

# 문제 피드백 네 가지 실패의 수정 가능성 검토

사용자는 수정 가능성 검토를 요청했다. 정책·런타임·프롬프트 수정이나 추가 유료 시험은
실행하지 않았다. 아래 방안은 구현 제안이며 승인된 정책 변경이 아니다.

## 새로 확인한 사실

- 저장된 S2 결론 모순, I1 수정 발화 미인식, C6 깨진 코칭의 원출력을 현재 빌드의
  `validateFeedbackAssessment`에 오프라인 재입력했으며 세 건 모두 통과했다.
- `OpenAIFeedbackEvaluator.evaluate`는 재시도 때 오류 세부사항을 넘기지 않고 같은
  `once(s)`를 호출한다. 실제 I1-r1 및 C1-r2의 재시도 요청 해시도 각각 첫 요청과 같다.
- REPAIRED에는 교정 발화 인용이 필요하지만, REPAIR 판정 전체가 최신 학생 답변을 읽었는지
  확인하는 계약은 없다. I1-repair는 실제 CORRECT 발화가 있어도 인용 없이 UNCONFIRMED였다.
- `coaching`은 비어 있지 않은 문자열인지 검사할 뿐이다. UNKNOWN 조기 반환과 종료 경로에도
  학생용 문장 품질을 확인하는 공통 검증이 없다.
- 기존 v3 `recoverExactSourceQuote`는 공백·따옴표만 제외해 유일한 원문 구절을 찾고 정확한
  원문 문자열로 복원한다. v4는 원문 `includes`만 검사하며 이 복원을 사용하지 않는다.
  기존 함수는 별표 누락을 복원하지 않는다. 표식·수식 구별 없이 기호를 삭제하면 안 된다.

## 구현 제안과 한계

1. 학생이 참/거짓으로 보는 결론과 객관적 내용 정확성을 계약·설명에서 더 분명히 분리한다.
   결론을 여러 자유문장과 필드에 독립적으로 중복 생성하는 구조를 줄이고, 학생의 근거 인용을
   붙인다. 실행 오류를 추가할 후보에는 학생 판단을 제대로 읽었는지 조건부 의미 검증을
   적용할 수 있다. 키워드 정규식만으로 자연어 결론을 확정하거나 모순 값을 조용히 뒤집지 않는다.
   이 항목은 코드만으로 의미 정확성을 보장할 수 없으며 실모델 대조가 필요하다.
2. 최신 학생 수정 응답을 누적 이력과 함께 명시적으로 분리해서 전달하고, 평가 전체에 최신
   응답 ID와 실제 인용을 요구한다. 개별 미질문 오류 모두에 최신 수정 인용을 강제하는 것이
   아니다. 최신 응답 읽기 증거가 없으면 시스템 판정 오류로 재시도하며 학생 실패로 종료하지
   않는다. ‘네’의 인용이 있다는 이유만으로 수정 성공이 되지는 않는다.
3. 실제 공개될 코칭은 상태 전이를 확정하기 전에 검증한다. 제어 표식·기호만 있는 출력 등
   명백한 손상은 차단하고 코칭만 제한적으로 재생성할 수 있다. 판정 결과는 고정하고 원출력을
   보존한다. 비종료에는 사용하지 않는 코칭을 강제 생성하지 않는 분리도 후보이나 생성 부담이
   이번 손상의 원인인지는 미확인이다. 정상 문장의 의미 품질은 문자열 검사만으로 보장하지 못한다.
   공식 정답만 붙인 대체 문구를 상세 코칭 성공으로 집계하지 않는다.
4. v3의 제한적 인용 복원을 검토해 재사용하고, 남은 인용 오류에는 실패 위치와 이유를 담아
   자동 1회 재시도한다. 별표는 원자료에서 주석 표식으로 확인된 경우에만 별도 처리하거나
   정확 인용 재생성을 요구한다. 숫자·부정어·수학 기호 변경, 복수 일치, 학생 인용 변조는 허용하지
   않는다. 원출력과 복원 결과는 구분한다.

공통으로 검증 실패는 기존 RETRYABLE_ERROR 경로를 이용할 수 있다. 학생 제출·오류 질문 수·
선택 횟수를 보존하고, 코칭 종료나 정답 공개로 바꾸지 않는다. 계약 재시도의 오류 피드백과
원출력 이력은 보존하며, 재시도를 무한 확장하지 않는다.

수정 후 검증은 기존 실패 원출력의 무호출 회귀, 정상·‘네’·부분 수정·실제 선택 충돌 보호,
그리고 같은 문항과 미사용 대조 문항의 실모델 반복 시험을 분리한다. 아직 어느 수정안의
실모델 개선도 측정하지 않았다.

## 근거

- `packages/pipeline/src/problem-solving/feedback-v4.ts`
- `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts`
- `packages/app/src/server/problem-feedback-v4.ts`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`
- `packages/pipeline/src/problem-solving/source-direct-evaluator.test.ts`
- `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/initial/S2-r1.json`
- `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/initial/C6-r1.json`
- `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/cycles/I1-repair.json`
- `docs/experiments/problem-feedback-v4-synthetic-2026-10-01/requests.jsonl`
- `memory/decisions/D-0059-problem-feedback-clarifications-consolidated.md`
- OpenAI 공식 Structured Outputs 문서의 Handling mistakes 절은 구조화 출력에도 내용 오류가
  가능하다고 설명한다. https://developers.openai.com/api/docs/guides/structured-outputs
