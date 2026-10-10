# v3 기호 실험 결과의 v5 이식 설계안

작성 2026-10-07, 같은 날 사용자 결정 반영([D-0093](../../memory/decisions/D-0093-v5-composition-auto-gloss-pipeline.md)). 상태: **설계 방향 승인, 1단계 준비 완료, 실행 미승인**. 프롬프트·코드·서버·UI는 바꾸지 않았고 API 호출도 하지 않았다.
명칭은 [D-0090](../../memory/decisions/D-0090-problem-evaluator-v5-naming.md)을 따른다. v5 = `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v4-v3-based-candidate.md`
(승인 해시 `98d36119…`), 서버·스키마는 `packages/pipeline/src/problem-solving/feedback-v4.ts`, `feedback-v4-evaluator.ts`를 공유한다.

## 0. v5의 구성(사용자 결정 2026-10-07)

1. 운영 규칙은 v5 그대로(서버가 다음 행동 결정, 오류별 교정 질문, 확인 불가 시 코칭 종료 등).
2. 사람 승인 해석본은 쓰지 않는다. 해석본은 문항마다 미리 자동 생성하고 자동 검사·자동 검수를 통과하면 그대로 쓴다.
3. v3에서 만든 판정 방법(학생 주장 분리 기록, 인용 형식 규칙, 해석본 사용 규칙)을 옮긴다.

## 1. 옮기는 것과 옮기지 않는 것

| 구성 요소 | v3 실험 근거 | v5 |
|---|---|---|
| 학생 주장 분리 기록 | 의미 통과 3/5 → 5/5, 응답 유형 12/12 ([분리 기록](../experiments/gongsun-claim-split-2026-10-06/REVIEW-SUMMARY.json), [응답 유형](../experiments/gongsun-response-types-2026-10-06/REVIEW-SUMMARY.json)) | 옮김 |
| 인용 형식 규칙 | 학생 말 바꿔치기 4/8 → 0/8 ([인용 형식](../experiments/gongsun-quote-format-2026-10-07/REVIEW-SUMMARY.json)) | 옮김, 적용 필드 확대 |
| 기호 해석본 | 사람 승인본에서 S5 과잉 교정 2/3 → 1/14 ([세 조건](../experiments/gongsun-gloss-arms-2026-10-06/REVIEW-SUMMARY.json)). 자동 생성본(검수 없음)은 S5 0/3 ([자동 생성](../experiments/gongsun-auto-gloss-formats-2026-10-07/REVIEW-SUMMARY.json)) | **자동 중간안 + 의미 자동 검수**로 옮김(2절) |
| 선지 해석 포함 해석본 | 기호 해석만과 차이 없음 | 판정기에 넣지 않음(생성기 자체 점검용으로만) |
| 사람 승인 해석본 | - | 운영에 쓰지 않음. 검수 레이어 시험의 채점 기준으로만 씀 |
| S5 허용 기준 두 후보 | 보류([작업 기록](../../memory/checkpoints/2026-10-07-gongsun-auto-gloss-generation.md)) | v5에서 논의 |
| 교정 질문 품질 | 조건과 무관하게 남음 | v5 질문 구조에서 따로 다룸 |

v5 자체도 같은 문제를 보였다. [v5 소규모 시험](../experiments/problem-v3-based-v4-smoke-2026-10-02/REPORT.md)에서
공손룡 실제 응답(S5) 과잉 교정 1/3, ⓓ·ⓔ 역전 응답 과수용 1/1이었다.

## 2. 자동 해석본 파이프라인

구현: `scripts/lib/marker-gloss-pipeline.mjs`(테스트 `marker-gloss-pipeline.test.mjs` 6/6). 지시에는 문항 내용이 없다.

1. **생성(중간안):** 기호마다 이름, 이 자리의 지시 대상(같은 자료 안에서 그 범위에 드는 구체 사례를 "X이며, Y는 그 범위에 드는 사례다"로 포함),
   화자, 절의 장치, 원문 근거. 허용·오류 예시와 메모는 없다. 점검용 선지 해석도 만들지만 판정기에는 보내지 않는다.
2. **코드 검사:** 출력 구조, 기호 빠짐·중복, 기호 위치·이름, 빈칸, 원문 근거 인용(따옴표·공백 차이는 자동 복원), 대상 칸의 부재 표현 신호,
   선지 해석과 정답의 일관성, 원문 변경. 뜻의 옳고 그름은 보지 않는다.
3. **독립 재도출:** 같은 OpenAI 모델이 생성본을 보지 않고 같은 입력으로 기호별 대상·화자만 정한다.
4. **대조:** 기호별로 두 해석이 같은 대상·화자인지 AGREE/DISAGREE. 생성본이 덧붙인 사례가 원문상 범위 밖이거나 같은 대상의 다른 기호면 DISAGREE.
5. **반복과 채택:** 문항당 최대 3회차(코드 검사 실패도 1회차). 불일치·실패하면 다음 회차에서 생성과 재도출을 모두 새로 하고,
   생성기에는 어긋난 기호 이름과 "어느 쪽이 맞는지 정해지지 않았다"는 안내만 준다. 모든 기호 AGREE인 첫 회차를 채택한다.
   없으면 코드 검사를 통과한 회차 중 AGREE가 가장 많은 회차를 쓰고 끝까지 불일치한 기호만 뺀다.
   코드 검사를 통과한 회차가 없으면 **해석본 없이 판정하고 생성 실패를 기록한다.**
6. 문항당 최대 9요청. 문항마다 미리 한 번 돌린다.

## 3. 판정 방법 이식

### 3.1 학생 주장 분리 기록 → SELECTION

- SELECTION 출력에 `studentClaims[]`를 추가한다. 항목: `observationId`, `quote`(학생 발화에서 정확히 복사),
  `claimAsStated`(학생이 말한 대상·방향·조건·순서를 바꾸지 않고), `sourceCheck`(CONSISTENT/CONTRADICTED/UNDETERMINED), `sourceBasis`.
  지시 문구는 v3 실험의 `splitInstruction`(`scripts/test-gongsun-quote-format.mjs`)을 v5 필드명에 맞춰 옮긴다.
- v3의 `selectionSupport`는 따로 두지 않는다. v5의 contentAssessment SUPPORTED/INSUFFICIENT가 같은 역할이다.
- 코드 일관성 검사(새로 추가): CONTRADICTED 주장마다 그 quote를 studentEvidence로 가진 오류가 errors[]에 하나 있어야 하고,
  errors[]의 각 오류는 CONTRADICTED 주장 하나 이상에 대응해야 하며, CONTRADICTED가 없으면 contentAssessment는 ERROR일 수 없다.
- v5의 우선순위는 유지한다. reconstructability=UNKNOWN이면 CONTRADICTED 주장이 있어도 교정에 진입하지 않는다([D-0053](../../memory/decisions/D-0053-global-unknown-priority-deferred.md)).
- REPAIR에는 이번 단계에서 넣지 않는다(결정 필요 1).

### 3.2 인용 형식 규칙 → 학생 판단을 서술하는 모든 필드

SELECTION의 `reason`, `reconstructedPath`, `errors[].description`, `errors[].question`, `selectionMismatchQuestion`,
REPAIR의 `reason`, `newErrors[].description`. `coaching`은 학생 판단을 언급할 때만. 규칙 본문은 v3 실험의 `quoteRule`을 쓰되
적용 범위를 "reason" → "학생 판단을 서술하는 모든 필드"로 넓힌다.

### 3.3 해석본 입력

- 입력 필드 `markerGloss`: 파이프라인 채택본의 `marker, location, markedText, name, referentHere, speaker, operator, sourceBasis`(`judgePayload`).
  선지 해석·정답·keyForcedOnly는 넣지 않는다. 채택본이 없으면 필드를 넣지 않는다.
- 원문 결속 해시가 현재 원자료와 다르면 붙이지 않고 기록한다.
- 지시 문구: v3 실험의 해석본 지시·사용 규칙을 옮기되 "문항 검토자가 확인한 해석본"을 "자동 생성·자동 검수한 해석본"으로 고치고,
  v5 자료 경계 문장에 대한 예외임을 밝힌다.
- 전달 범위: SELECTION·REPAIR. CONCLUSION_AUDIT·COACHING은 결정 필요 2·3.

### 3.4 프롬프트 파일

승인된 v5 파일(해시 고정)은 고치지 않는다. 검증은 하네스가 v5 본문 끝에 블록을 덧붙이고 확장 스키마를 쓰는 방식으로 한다.
확장 출력은 하네스가 `studentClaims`를 떼어 검사한 뒤 나머지를 기존 `validateFeedbackAssessment`·`applyFeedbackAssessment`에 넣는다(서버 코드 무변경).
효과가 확인되면 합친 프롬프트와 스키마·서버 변경을 별도 승인으로 진행한다.

## 4. 검증 순서

### 1단계: 해석본 파이프라인 검증(준비 완료, 실행 미승인)

`scripts/test-marker-gloss-pipeline-gongsun.mjs`, `docs/experiments/marker-gloss-pipeline-gongsun-2026-10-07/`(FROZEN).
- A. 검수 레이어 시험: 정상 해석본 3, 자연 오류 1(v2 slot1의 ⓐ), 심은 오류 8(대상 뒤바꿈, 화자 바꿈, 대상 칸에 문장 뜻, 범위 밖 사례,
  이름의 일반적 뜻, 범위 넓힘, 화자 바꿈, 구체 사례로 좁힘=경계 사례)을 독립 재도출 3개와 각각 대조. 지표는 오류 기호 검출률과 오탐률.
- B. 파이프라인 3회 실행. 채택본은 2단계의 반복 1~3에 쓴다.
- 최대 66요청, 추정 상한 2달러.

### 2단계: v5 검증(1단계 뒤 준비)

공손룡 12번, S1~S8, 3회 반복. 조건 ① v5 원본, ② v5 + 주장 분리 + 인용 규칙, ③ ②+1단계 자동 해석본.
판정은 Claude 먼저 고정 → GPT 블라인드 → 한 차례 반론. 기준은 v3 실험의 P1~P4에 오류별 교정 질문의 대상 보존·정답 노출을 더한다.
이후 교정 답(REPAIR) 경로, 정보 비대칭 13번으로 넓힌다.

## 5. 2단계 준비 전 결정(2026-10-07 사용자 동의, 아래 권고대로 확정)

1. REPAIR에도 학생 주장 분리를 넣을지. 권고: 이번에는 넣지 않음.
2. 학생 결론 독립 확인(CONCLUSION_AUDIT)에 해석본을 줄지. 권고: 주지 않음(독립 확인의 성격 유지).
3. 코칭 문장에 해석본 표현을 허용할지. 권고: 허용하지 않음.
4. 기호가 없는 문항. 권고: 주장 분리·인용 규칙은 모든 문항, 해석본은 기호 문항에만(효과는 아직 미확인).

## 6. 알려진 한계

- 근거는 공손룡 12번 한 문항이다.
- 자동 검수는 같은 모델 계열이라 같은 방향의 착각을 공유할 수 있다. 1단계 A에서 놓치는 오류가 많으면 다른 회사 모델을 검토한다.
- 해석본이 맞아도 S5 과잉 교정은 남았다(판정 기준 문제). 검수 레이어는 이것을 해결하지 않는다.
- 주장 분리는 v5처럼 오류 목록·질문과 한 출력에 묶인 구조에서는 처음이다.
