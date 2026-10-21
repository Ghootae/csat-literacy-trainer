# 인계: 선택 불일치 질문은 한 칸만 묻고, 원문상 참·거짓과 같게 답하면 교정 성공

- 날짜: 2026-10-14
- 작성: Claude
- 실행: executor 하위 에이전트([D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 후 `memory/decisions/`에 새 번호로 기록. 근거 사례는 UI 메모장 22번
  (`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`).
- 상태: 사용자 승인(2026-10-14, "설계안 작성후 3개 정도 케이스에 1회 테스트 승인")

## 왜 하나

공손룡 12번 ⑤에서 학생 근거는 내용이 맞았다(SUPPORTED, 오류 0). 선택만 어긋났다. 질문은 두 가지를 함께 요구했다.

> "이 선지는 공손룡의 생각에 맞는 설명이야, 맞지 않는 설명이야? 적절하지 않은 것을 고르라는 목표와 비교해 봐."

학생은 첫 칸에 바르게 답했다("아, 맞는 설명이네."). 판정기는 "목표와 어긋난다는 점까지 인정했는지 확인되지 않는다"며
REMAINING으로 봤다. 그래서 다시 고르기 대신 코칭 종료로 끝났다. 지시문에는 "일부 칸만 답해도 성공"과 "불일치를 인정하면
성공"이 함께 있어, 이 경우 해석이 갈렸다. 기존 실모델 시험에서 선택 불일치 질문에 학생이 답한 기록은 0건이었다.

## 목표

- 선택 불일치 질문은 한 칸만 묻는다. 학생 결론을 인용하고, 이 선지가 적절한 설명인지 적절하지 않은 설명인지만 묻는다.
  목표와 비교하라는 요구는 넣지 않는다.
- 선택 불일치 오류의 교정 판정 기준을 하나로 정한다. 학생이 이번 답변에서 선지를 **원문상 실제 참·거짓과 같게**
  판단하면 REPAIRED다. 반대로 판단하면 REMAINING이다. 판단을 밝히지 않으면 UNCONFIRMED다.
  - 오답을 고른 경우(근거가 맞고 선택이 틀림): 학생이 근거대로 판단하면 성공이다.
  - 정답을 고른 경우(선택이 맞고 근거 결론이 틀림): 학생이 판단을 고치면 성공이다.
  - 한 규칙이 두 경우를 모두 다룬다.
- 오답을 골랐고 남은 오류가 선택 불일치뿐이었다면, 교정 성공 뒤의 다시 고르기 안내를 코드가 이 경우에 맞게 쓴다.
  목표와 비교하는 일은 이 문장이 대신한다.

## 판정 지시문 (`packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`)

- 110행 부근 `selectionMismatchQuestion` 설명: "두 판단을 비교하는 질문 하나"를 아래로 바꾼다.
  > 학생 근거의 결론을 큰따옴표로 인용하고, 이 선지가 적절한 설명인지 적절하지 않은 설명인지 한 가지만 묻는 질문 하나를
  > 적는다. 선택 목표와 비교하라는 요구는 질문에 넣지 않는다. 목표와의 비교는 서버가 다음 단계에서 안내한다.
- 136행 REPAIR 규칙 "선택 불일치 질문에 학생이 불일치를 인정하면 REPAIRED다."를 아래로 바꾼다.
  > 선택 불일치 오류는 학생이 이번 답변에서 선지를 원문상 실제 참·거짓과 같게 판단하면 REPAIRED, 반대로 판단하면
  > REMAINING, 판단을 밝히지 않으면 UNCONFIRMED다. 선택 목표와 비교했다는 말을 따로 요구하지 않는다. 선택은 다음 단계에서
  > 학생이 다시 한다.
- 187행 질문 규칙 "선택–근거 충돌은 …"에 문장 하나를 더한다.
  > 형식은 '"…"라고 했지. 그러면 이 선지는 적절한 설명이야, 적절하지 않은 설명이야?'처럼 한 칸만 묻는다.
  - 예시는 이 한 문장뿐이며, 시험 문항의 내용을 넣지 않는다.
- 나머지 문장은 바이트 그대로 둔다.

## 코드 (`packages/pipeline/src/problem-solving/feedback-v4.ts`)

`applyFeedbackAssessment`의 REPAIR 처리 끝, 교정 성공 뒤 `s.message`를 정하는 곳(현재 오답이면 "핵심 오류를 잘 고쳤어.
처음에 ⑤번을 고르게 된 …")을 바꾼다.

- 조건: 선택이 오답이고, `s.errors`의 오류가 `selection-mismatch` 하나뿐이다.
- 이 조건이면 다음 문장을 쓴다.
  - 목표가 INVALID(`choiceImpliedVerdict === 'INVALID'`, "적절하지 않은 것" 문항):
    `네 근거대로면 ⑤는 적절한 설명이야. 이 문제는 적절하지 않은 것을 고르는 문제니까, 다시 골라 볼래?`
  - 목표가 VALID: `네 근거대로면 ⑤는 적절하지 않은 설명이야. 이 문제는 적절한 것을 고르는 문제니까, 다시 골라 볼래?`
  - 조사는 번호를 읽는 소리를 따른다(①·③은 "은", 나머지는 "는"). `feedbackSectionLead`(`feedback-v5-end-explanation.ts`)와
    같은 규칙이다. 중복을 피하려면 작은 공용 함수로 빼도 된다.
- 그 밖의 경우(내용 오류가 함께 있었거나 정답 선택)는 지금 문장을 그대로 쓴다.
- 판정·라우팅·질문 수는 바꾸지 않는다.

## 범위 밖

- 마지막 설명 지시문, 첫 판정 문장(D-0127, UI 메모장 20번).
- 대상 오류(D-0130) 규칙.
- `scripts/lib/v5-marker-judgment.mjs`와 옛 실험 스크립트.

## 테스트

- `feedback-v4.test.ts`:
  - 판정 지시문 승인 문구 비교 시험(421행 부근)에 새 문장을 반영한다.
  - 새 안내 문장: INVALID·VALID 두 극성, 조사(①·③), 내용 오류가 함께 있으면 기존 문장, 정답 선택이면 기존 문장.
- 기존 시험이 옛 안내 문장을 기대하면 조건에 맞는 것만 갱신한다.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] vitest: 실패는 기존 2건(`student-state.ts` 경계, axis-architecture 산출물 없음)만 남는다.
- [ ] e2e 격리 실행 통과:
      `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- [ ] 실모델 1회(사용자 승인됨, Claude가 실행), 3세션:
  - S1. 공손룡 ⑤, 사용자 원문 근거, 답 "아, 맞는 설명이네." → 한 칸 질문, REPAIRED, 새 안내 문장.
  - S2. 다른 문항의 오답, 근거는 맞고 선택만 어긋남, 근거대로 답함 → REPAIRED, 새 안내 문장.
  - S3. 정답 선택, 근거 결론이 반대, 판단을 고쳐 답함 → REPAIRED, 기존 정답 경로 안내.
  - 비용 상한 0.5달러.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(실모델 확인은 Claude가 한다).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`(110·136·189행 부근 3곳),
  `packages/pipeline/src/problem-solving/feedback-v4.ts`(REPAIR 성공 안내 분기, 공용 `numeralParticles` 추가),
  `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`(조사 규칙을 공용 함수로 교체),
  `packages/pipeline/src/problem-solving/feedback-v4.test.ts`(승인 문구 시험 확장, 새 안내 문장 시험 6건).
- 테스트 결과: build·typecheck:client 통과. vitest 1194 통과·2 실패(기존 boundary node:fs, axis-architecture 산출물 없음만).
  e2e 13건 통과. `packages/app` 시험·e2e에는 옛 안내 문장 기대가 없어 갱신하지 않았다.
- 남은 문제: 조건은 문서대로 `s.errors`만 본다. 반복 단계에서 새로 생긴 내용 오류(`additionalErrors`)가 함께 있어도
  선택 불일치만 `errors`에 있으면 새 문장이 나간다. 이 경우를 기존 문장으로 돌릴지 설계 판단이 필요하다. 실모델 3세션은 미실행(Claude 몫).
- Claude 검토 결정(2026-10-14): 하위 에이전트가 물은 빈틈. 교정 답변에서 새 오류(`additionalErrors`)가 생겼으면 기존 안내 문장을 쓴다. "네 근거대로면"을 단정할 수 없기 때문이다.
