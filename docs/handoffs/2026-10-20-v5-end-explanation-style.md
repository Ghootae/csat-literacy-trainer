# 인계: 마지막 설명을 단계적·대화식으로, 추정 오류는 짐작이라고 밝히고 직접 말하기

- 날짜: 2026-10-20
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 후 `memory/decisions/`에 새 번호로 기록. [D-0150](../../memory/decisions/D-0150-error-hypothesis-first-for-wrong-choice.md)의
  설명 표현(가정으로만 쓰기)을 바꾼다. 근거는 UI 메모장 27번과
  [반자동 사용자 시험 판정](../experiments/v5-hypothesis-user-2026-10-19/REVIEW.md)(P2·P3·P5 사용자 수정안).
- 상태: 완료(2026-10-20). [D-0152](../../memory/decisions/D-0152-end-explanation-guess-and-step-style.md), [재시험 판정](../experiments/v5-style-user-2026-10-20/REVIEW.md)

## 왜 하나

반자동 사용자 시험에서 판정과 질문은 모두 적절했다. 고칠 점 4개는 모두 마지막 설명의 문체·표현이었다. 사용자 수정안에서
문항 내용을 뺀 원리만 옮긴다.

- 추정 오류를 "…로 봤다면"처럼 가정으로만 쓰니 학생이 자기 생각을 알아보기 어렵다. 사용자 수정안은 "근거가 짧아서 완벽하게
  추론하기는 힘들었어. 다만 내 짐작으로는 아마 이렇게 생각하지 않았을까 싶어."로 짐작이라고 밝힌 뒤, 학생이 했을 법한 생각을
  따옴표로 풀어 보인다.
- 한 문장에 여러 단계를 몰아 써서 따라가기 어렵다. 수정안은 "하나씩 살펴보자", 원문 구절 → "이 사실은 …를 의미해",
  "…겠지?"처럼 한 단계씩 간다.
- 정답 칸이 원문에 없는 개념(도파민 분해 효소)을 끌어와 "…가 아니라"로 부정한다. 사용자: "이 부분은 불필요함".
- 정답 칸 끝이 선지 판정과 문제 목표를 잇지 않는다. 수정안: "그러므로 ②는 적절하지 않은 선지, 즉 정답이야."
- 오답 칸 끝 고정 문구 "설명이 이해됐으면 다음 설명으로 넘어가 보자."가 무엇을 이해했는지 말하지 않는다. 수정안: "네가 어디에서
  잘못 생각했었는지 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자."

## 목표

- 추정 오류(basis INFERRED)는 짐작이라고 먼저 밝히고, 학생이 했을 법한 생각의 과정을 큰따옴표로 풀어 직접 말한다.
  짐작이라고 밝히지 않은 단정("너는 …라고 봤지")은 계속 쓰지 않는다.
- 모든 칸이 한 단계씩, 원문 구절과 그 뜻을 이어 가며 설명한다.
- 원문에 없는 개념을 끌어와 부정하지 않는다.
- 정답 칸은 선지 판정과 문제 목표를 잇는 문장으로 끝난다.
- 선지 칸의 끝 문구가 그 칸에서 무엇을 봤는지 말한다.

## 범위 밖

- 선지 칸 첫 문장(D-0127). 적절/부적절 형식으로 바꾸는 일은 UI 메모장 20번에서 남은 질문과 함께 정한다.
- 판정 지시문(`source-direct-problem-feedback-v5.md`), 판정·라우팅 코드, 교정 질문.
- 정답 선택의 근거 미확인 설명 규칙(UI 메모장 25번).

## 마지막 설명 지시문 (`packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`)

INCORRECT 지시문:

1. firstChoice 항목의 INFERRED 문장 두 개("errors의 basis가 INFERRED인 오류는 … 가정으로 쓴다.")를 아래로 바꾼다.
   > errors의 basis가 INFERRED인 오류는 학생이 말하지 않은 단계를 추정한 것이다. 근거만으로는 학생 생각을 다 알기 어려웠다는
   > 점과 이것이 내 짐작이라는 점을 먼저 밝히고(예: "내 짐작으로는 아마 이렇게 생각하지 않았을까 싶어."), 학생이 했을 법한
   > 생각의 과정을 큰따옴표로 풀어 보인 뒤, 원문으로 그 연결이 왜 맞지 않는지 짚는다. 짐작이라고 밝히지 않고 학생이 그렇게
   > 생각했다고 단정하지 않는다.
2. answer 항목 끝에 덧붙인다.
   > 마지막 문장은 이 선지의 판정과 문제 목표를 잇는다(예: "그러므로 ②는 적절하지 않은 선지, 즉 정답이야.").
3. "선지는 ①~⑤로 쓰고 …" 문장 앞에 새 줄로 두 문장을 넣는다. 이 두 문장은 CORRECT 지시문의 같은 자리에도 넣는다.
   > 설명은 학생이 따라오도록 한 단계씩 쓴다. 원문 구절을 짚은 뒤 그 구절이 무엇을 뜻하는지 잇고(예: "이 사실은 …를 뜻해."),
   > 필요하면 "…겠지?"처럼 학생이 다음 단계를 떠올리게 묻는다. 한 문장에 여러 단계를 몰아 쓰지 않는다.
   > 원문에 없는 개념을 끌어와 "…가 아니라"로 부정하지 않는다. 선지가 왜 맞거나 틀린지는 원문에 있는 내용으로만 설명한다.

CORRECT 지시문:

4. answer 항목 끝에 2와 같은 문장을 덧붙인다.

나머지 문장은 바이트 그대로 둔다. 예시는 위 문장 안의 것뿐이며 시험 문항의 내용을 넣지 않는다.

## 코드 (`packages/app/src/server/problem-feedback-v4.ts`, `appendCoach`)

선지 칸(처음 고른 선지 칸, 다시 고른 선지 칸) 뒤에 붙는 고정 문구를 그 칸에서 다룬 내용에 따라 고른다. 지금은 두 칸 모두
"설명이 이해됐으면 다음 설명으로 넘어가 보자."다. 2026-10-20 사용자 검토에서 정답·오답이 아니라 칸이 다룬 내용으로 가르기로 했다.

칸의 종류는 그 선택(`selectionNumber`)에 속한 관찰의 마지막 SELECTION 판정 `a`로 정한다(`feedbackSectionLead`가 입장을 찾는
방식과 같다).

| 칸이 다룬 것 | 조건 | 문구 앞부분 |
|---|---|---|
| 학생의 잘못된 생각 | `a.reconstructability === 'RECONSTRUCTABLE'`이고, `a.contentAssessment === 'ERROR'`이거나 (오답이고 그 선택의 `selectionRationaleConsistency`가 CONSISTENT가 아님) | 네가 어디에서 잘못 생각했었는지 이해됐으면, |
| 학생 근거의 빈 곳 | 정답 선택, `RECONSTRUCTABLE`, `a.contentAssessment === 'INSUFFICIENT'` | 네 근거에서 빠진 부분이 이해됐으면, |
| 선지 내용만 | 그 밖(재구성 불가, 근거 없음 등) | 설명이 이해됐으면, |

문구 뒷부분은 다음 칸에 따라 고른다.

| 다음 칸 | 앞부분이 "빠진 부분"일 때 | 그 밖 |
|---|---|---|
| 정답 칸 | 이번엔 ${정답 번호}가 왜 정답인지 정리해 보자. | 이번엔 정답에 대한 설명으로 넘어가 보자. |
| 다시 고른 선지 칸 | 다음 설명으로 넘어가 보자. | 다음 설명으로 넘어가 보자. |

예:
- P2(오답, 추정 오류): "네가 어디에서 잘못 생각했었는지 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자."
- P10(정답, 근거 오류 교정): 같은 문구.
- P9(정답, 근거 부족): "네 근거에서 빠진 부분이 이해됐으면, 이번엔 ②가 왜 정답인지 정리해 보자."
- P4(오답, 재구성 불가): "설명이 이해됐으면, 이번엔 정답에 대한 설명으로 넘어가 보자."
- P6 첫 칸(다음이 다시 고른 선지): "네가 어디에서 잘못 생각했었는지 이해됐으면, 다음 설명으로 넘어가 보자."

- 번호는 ①~⑤ 원문자로 쓴다. "②가"처럼 조사는 `numeralParticles`의 주격을 쓴다.
- 판단을 작은 순수 함수(예: `feedbackSectionClosing(s, selectionNumber)`)로 빼고 시험한다. 둘째 줄 문구는 새로 지은 것이라
  반자동 사용자 시험에서 판정받는다.
- 위 조건으로 가를 수 없는 경로(예: 문항 검토 경로에서 선지 칸이 생김)를 만나면 임의로 정하지 말고 멈춰 보고한다.

## 실모델 점검 도구 (`scripts/run-v5-live-check.mjs`)

- `INFERRED_ASSERTED`: 지금 단정 표현("라고 봤지", "라고 생각했지", "라고 생각한", "로 착각")이 있으면 위반이다. 같은 칸에 짐작 표지
  ("짐작", "것 같아", "않았을까", "내가 보기에")가 있으면 위반으로 세지 않는다.
- 새 검사 `NEGATED_OUTSIDE_CONCEPT`는 만들지 않는다(원문에 없는 개념은 자동으로 가르기 어렵다). 사람이 읽어 본다.
- `CONNECTOR_REPEATED`의 고정 문구 제거 정규식을 새 문구들도 지우도록 고친다.

## 테스트

- `feedback-v4.test.ts`: 지시문 전문 비교 두 곳을 갱신한다.
- 고정 문구 함수: 세 종류(잘못된 생각: 오답 ERROR·오답 불일치·정답 ERROR / 빠진 부분 / 선지 내용만)와 다음 칸 두 경우,
  근거 보충 후 마지막 판정 우선을 시험한다.
- 서버 시험·e2e: 고정 문구 기대를 새 문구에 맞춘다(`problem-feedback-v4-workbench.spec.ts` 316행 부근).
- 자동 검사: 짐작 표지가 있으면 `INFERRED_ASSERTED`가 아님을 시험한다.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] vitest: 실패는 기존 것(`student-state.ts` 경계, axis-architecture 산출물 없음, 다른 세션 문단 대화 `dialogue-simple.test.ts`)만 남는다.
- [ ] e2e 격리 실행 통과:
      `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- [ ] 실모델 확인(Claude가 실행, 사용자 별도 승인 후). 하위 에이전트 몫이 아니다.
  - 반자동 사용자 시험을 같은 방식으로 다시 한다. 마지막 설명이 나오는 경로 P2·P3·P5·P4·P6·P7·P9·P10
    (`scripts/v5-hypothesis-user-cases.mjs`, 새 폴더). 사용자가 설명 칸마다 적절/고칠 점 있음/부적절로 판정한다.

## 알려진 위험

- 설명이 길어진다. 칸마다 단계가 늘면 학생이 읽을 양이 는다. 시험에서 길이도 함께 본다.
- "…겠지?" 같은 물음이 학생에게 답을 요구하는 것으로 읽힐 수 있다. 화면에는 답할 칸이 없으므로 수사적 물음으로만 쓴다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(실모델 확인은 Claude가 한다).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`(지시문 수정, `feedbackSectionClosing` 추가), `packages/pipeline/src/index.ts`(export), `packages/app/src/server/problem-feedback-v4.ts`(`appendCoach`가 `feedbackSectionClosing` 사용), `scripts/run-v5-live-check.mjs`(`INFERRED_ASSERTED` 짐작 표지 예외, `CONNECTOR_REPEATED` 정규식), `packages/pipeline/src/problem-solving/feedback-v4.test.ts`(지시문 전문 갱신, 칸 끝 문구 시험 5개), `packages/app/src/server/problem-feedback-v4.test.ts`, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`(문구 기대 갱신).
- 테스트 결과: `npm run build`, `npm run typecheck:client` 통과. vitest 1322 중 1320 통과, 실패 2개는 기존(`boundary.test.ts` student-state 경계, `axis-architecture-experiment.test.ts`). e2e 격리 실행 13개 중 12 통과, 1 실패(`ambiguous correct can decline end coaching ... mobile panes fit`): `getByRole('button', {name: '문제'})`가 파트 이동 버튼과 화면 전환 버튼 둘에 걸려 strict mode 위반. 이 변경과 무관한 UI 선택자 문제로 보이나 기준선 비교는 하지 않음.
- 남은 문제: 위 e2e 1건. 자동 검사 `INFERRED_ASSERTED` 예외는 스크립트 내부 변경이라 단위 시험이 없다(스크립트에 시험 틀이 없음). 칸 끝 문구는 선지 칸 판정(`selectionComparisons`와 SELECTION 판정의 순서 대응)으로 고르며, 문항 검토 경로(boundary가 NONE이 아닌 판정)에서는 선지 칸이 생기지 않아 분류 공백은 만나지 않았다.
