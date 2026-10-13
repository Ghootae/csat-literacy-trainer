# 인계: 직접적인 교정 질문 · 근거 구절 지문 표시 · 판단 불가 안내 문장

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex
- 관련 결정:
  - `memory/decisions/D-0118-direct-correction-questions-and-highlight.md`
  - `memory/decisions/D-0117-end-coaching-sectioned-sequence.md` 5항
  - UI 메모장 `docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`의 "7번 상세" A·B, "2번 상세"
- 선행 인계: `2026-10-13-v5-end-coaching-sequence.md`(구현·검토가 끝난 상태를 전제로 한다).
- 대상: 개발자 v4 경로만.

## 목표

1. 판정 지시문의 질문 규칙이 더 직접적인 질문을 만들게 바뀐다(D-0118 1항).
2. 교정 질문 단계에서 지금 묻는 오류의 원문 근거 구절이 지문·보기에 미색으로 표시된다(D-0118 2항).
3. 근거를 알아볼 수 없어 끝난 세션에서, 시작 확인 [응] 직후 정해진 안내 문장 하나가 붙는다(D-0117 5항).

## 범위 밖

- 판정 지시문의 다른 규칙, REPAIR 규칙, 종료 설명 지시문.
- 학생용 v3, 지난 실험 실행기와 기록.
- 실제 API 호출, `.env`, 의존성 설치, 외부 네트워크, git 쓰기 명령. 루프백 테스트와 로컬 Playwright는 허용한다.

## 손댈 파일과 계약

### 1. 판정 지시문 — `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`

"## 질문 규칙" 절에서 아래 두 항목을 **바꾸고**, 바로 뒤에 새 항목 세 개를 **더한다**. 그 밖의 줄은 바꾸지 않는다.

바꿀 항목 1 (현재):
```
- 교정 질문은 학생 발화에서 확인된 오류를 직접 겨냥한다. 질문을 만들면서 학생이 말한 대상,
  관계 방향, 조건이나 단계를 다른 것으로 바꾸지 않는다.
```
→ 새 항목:
```
- 교정 질문은 학생 발화에서 확인된 오류, 곧 학생이 틀리게 말한 바로 그 주장을 직접 겨냥한다. 학생이
  말하지 않은 전제나 다른 단계를 대신 묻지 않는다. 질문을 만들면서 학생이 말한 대상, 관계 방향,
  조건이나 단계를 다른 것으로 바꾸지 않는다.
```

바꿀 항목 2 (현재):
```
- 교정에 필요한 원문 위치·개념·조건은 안내할 수 있다. 다만 학생에게 남기는 판단이 무엇인지
  분명해야 하며, 올바른 결론을 모두 제시한 뒤 동의만 요구하지 않는다.
```
→ 새 항목:
```
- 교정에 필요한 원문 위치·사실·조건은 질문에 드러내도 된다. 학생이 무엇을 확인하면 되는지 바로 알 수
  있게 짧게 묻는다. 다만 올바른 결론 하나만 제시하고 동의를 요구하지는 않는다.
```

새로 더할 항목 (바꾼 항목 2 바로 뒤):
```
- 추상적인 분류나 개념 이름으로 바꿔 묻지 말고, 지문·보기에 나온 구체적인 사실과 낱말로 묻는다.
- 형식은 학생 주장에 맞춰 고른다. 학생의 생각과 원문의 사실을 나란히 놓는 두 갈래 질문(예: "…인공지능으로
  제품을 만들었어, 아니면 인공지능으로 광고를 만들었어?") 또는 원문의 해당 사실을 짚는 짧은 직접 질문
  (예: "표시한 부분에서 첨가제를 넣은 뒤 잉크는 어떻게 됐어?")으로 쓴다.
- 오류의 sourceEvidence 중 PASSAGE·SCENARIO 인용은 질문 단계에서 화면의 지문·보기에 표시된다. 질문이
  가리키는 구절을 그 인용에 넣고, 질문에서 그 구절을 "표시한 부분"이라고 가리킬 수 있다.
```

- 기존 동일성 테스트(v5.md에서 반말 한 줄을 빼면 실험 파일과 같다)는 더 이상 성립하지 않는다. 아래로 바꾼다.
  - 실험 파일 `docs/experiments/v5-repair-test-2026-10-10/repair-local-v2-gpt-6-luna/instructions-local-v2.md`가 바뀌지 않았다. 현재 sha256을 테스트에 고정한다.
  - v5.md에 반말 줄과 위 새 항목 문장들이 글자 그대로 들어 있고, 바꾼 두 항목의 옛 문장이 없다.
  - v5.md에서 이번 인계와 반말 인계가 바꾼 부분을 되돌리면 실험 파일과 같다. 테스트 안의 치환 표로 확인한다.

### 2. 근거 구절 표시

**서버 공개 뷰** (`feedbackPublicView` 또는 컨트롤러 뷰)
- `phase === 'AWAITING_CORRECTION'`일 때만 `correctionHighlights: Array<{ location: 'PASSAGE' | 'SCENARIO'; start: number; end: number; text: string }>`를 보낸다. 다른 단계에서는 빈 배열이다.
- 내용: 활성 오류(`activeErrorId`)의 `sourceEvidence` 중 `location`이 PASSAGE 또는 SCENARIO이고 `quote`가 있는 항목.
  - `start`/`end`는 공개 뷰의 `passageText`/`scenarioText`에서 그 인용이 처음 나오는 위치다. 못 찾으면 뺀다.
  - **EXPLANATION·STEM·CHOICE·그림 근거는 절대 넣지 않는다.** 특히 EXPLANATION은 공식 해설이라 비공개다.
  - 선택 불일치 오류(`selection-mismatch`)도 같은 규칙을 따른다(인용이 있으면 표시).
- 오류 설명(`description`) 등 다른 내부 판정 내용은 보내지 않는다.

**화면** (`annotated-text.tsx`, `ProblemFeedbackV4App.tsx`, CSS)
- `AnnotatedText`에 `highlights` 입력을 더한다. 표시 범위는 미색 배경(`.v4-highlight`)으로 칠한다.
  - 기호·밑줄·네모 표시와 겹쳐도 둘 다 보여야 한다. 지금처럼 겹치는 범위를 버리지 않는다.
- 교정 질문 단계에 들어가면 지문(또는 보기) 칸을 첫 표시 위치로 스크롤한다(`scrollIntoView`, 움직임 줄이기 설정이면 즉시).
- 탭 화면(좁은 화면, `pane` 전환)에서는 교정 질문 말풍선 아래에 [지문에서 보기] 버튼을 둔다. 누르면 해당 탭(지문, 보기면 문제)으로 바꾸고 그 위치로 스크롤한다. 넓은 화면에서도 버튼이 있어도 된다.
- 답을 보내면 표시가 사라진다(다음 뷰의 `correctionHighlights`가 비거나 바뀜).
- 입력 영역 네 줄 고정 규칙을 지킨다.

### 3. 판단 불가 안내 문장 (D-0117 5항)

- 컨트롤러가 `AWAITING_UNDERSTANDING` 대화창 항목을 만들 때, 첫 `CONNECTOR` 앞에 `CONNECTOR` 항목 하나를 더한다. 해당하는 경우에만 넣는다.

| 조건 | 문장 |
|---|---|
| endReason `RATIONALE_UNVERIFIABLE`, 마지막 선택 근거 `PROVIDED` | 네가 쓴 근거만으로는 어떻게 판단했는지 다 알기 어려웠어. 그래서 네 생각을 짐작하지 않고 선지 내용 위주로 볼게. |
| endReason `RATIONALE_UNVERIFIABLE`, 마지막 선택 근거 `OMITTED` | 근거를 적지 않아서 어떻게 판단했는지는 알 수 없었어. 선지 내용 위주로 볼게. |
| endReason `CORRECT_UNVERIFIED` | 네 근거만으로는 이 답에 어떻게 이르렀는지 다 보이지는 않았어. 빠진 연결을 같이 채워 볼게. |

- "마지막 선택 근거"는 마지막 선택의 `rationale.mode`다. 근거 보완 단계(`RATIONALE` 명령)에서 근거를 냈다면 `PROVIDED`로 본다.
- 이 항목은 다른 연결 문장과 같이 0.8초 뒤 자동으로 공개된다.

### 4. 테스트

- `feedback-v4.test.ts`:
  - 지시문 테스트를 1절대로 바꾼다.
  - `correctionHighlights`: PASSAGE·SCENARIO만 포함, EXPLANATION·CHOICE·그림 제외, 못 찾는 인용 제외, 교정 단계 밖에서는 빈 배열. 이 계산이 상태 머신 쪽에 있으면 여기서 테스트한다.
- `problem-feedback-v4.test.ts`: 판단 불가 안내 문장 세 경우와 다른 종료 사유에서 없음. 표시 범위가 공개 뷰에 나오고 다른 단계에서 사라짐.
- `annotated-text.test.ts`: 표시와 밑줄이 겹칠 때 둘 다 렌더링됨, 표시만 있을 때.
- e2e: 교정 질문 단계에서 `.v4-highlight`가 보이고, 답을 보낸 뒤 사라짐. 입력 영역 높이 불변.
- 지난 실험 실행기 테스트는 실행해서 결과만 보고한다.

## 완료 조건

- [ ] 지시문 새 문장이 글자 그대로 반영되고, 바꾼 항목의 옛 문장이 없다.
- [ ] `correctionHighlights`가 계약대로이고, EXPLANATION 인용이 공개되지 않는다.
- [ ] 판단 불가 안내 문장이 세 경우에만 들어간다.
- [ ] `npx --no-install vitest run packages/pipeline/src/problem-solving packages/app/src/server/problem-feedback-v4.test.ts packages/app/src/server/problem-feedback-v4-http.test.ts packages/app/src/client` 전부 통과.
- [ ] `npm run build`, `npm run typecheck:client` 통과. e2e(`problem-feedback-v4-workbench.spec.ts`) 통과(실행 불가면 사유).
- [ ] 변경 파일이 이 문서에 적은 파일과 그 테스트뿐이다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈춘다. 충돌 내용과 선택지를 보고하고, 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송·의존성 설치가 필요해지면 실행 전 멈춘다.

## 결과 보고 (실행 후 작성)

- 변경 파일 (12개):
  - `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`
  - `packages/pipeline/src/problem-solving/feedback-v4.ts`
  - `packages/pipeline/src/problem-solving/feedback-v4.test.ts`
  - `packages/app/src/shared/problem-feedback-v4.ts` (공개 뷰의 correctionHighlights 타입)
  - `packages/app/src/server/problem-feedback-v4.ts`
  - `packages/app/src/server/problem-feedback-v4.test.ts`
  - `packages/app/src/client/annotated-text.tsx`
  - `packages/app/src/client/annotated-text.test.ts`
  - `packages/app/src/client/ProblemFeedbackV4App.tsx`
  - `packages/app/src/client/problem-feedback-workbench.css`
  - `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  - 이 인계 문서의 결과 보고 절
- 테스트 결과:
  - 지정 vitest 명령: 27개 파일, 442/442 통과.
  - `npm run build`, `npm run typecheck:client`: 각각 통과.
  - `problem-feedback-v4-workbench.spec.ts`: 11/11 통과. 표시·응답 뒤 제거·입력 영역 높이 불변·모바일 탭 전환과 표시 위치 스크롤 확인.
  - 지시문 전문 일치·변경 복원·실험 파일 SHA-256 고정 검사 통과.
  - 지난 실험 실행기 테스트(`node --test scripts/test-v5-repair.test.mjs scripts/test-v5-live-connection.test.mjs scripts/run-v5-diverse-48.test.mjs scripts/run-v5-diverse-48-concurrent.test.mjs`): 48개 중 19개 통과, 29개 실패. 인계대로 실행기·기록은 수정하지 않았다.
  - `node scripts/validate-memory.mjs`: 통과(결정 118개, 체크포인트 214개). 메모리 파일 수정 없음.
- 남은 문제:
  - 지난 실험 실행기 테스트의 29개 실패: 예전 종료 단계(COMPLETED 기대, 현재 AWAITING_END_START), 예전 코칭 출력 계약, 기준 지시문 불일치(`unexpected baseline instructions`) 관련 기대값이 남아 있다. 해당 테스트는 범위 밖이므로 수정하지 않았다.
  - 실제 모델의 질문 품질과 표시 구절의 의미적 일치는 미검증(실제 API 호출 금지).

## Claude diff 검토 (2026-10-13)

- 대조 기준: `.omc/artifacts/baseline-direct-questions-2026-10-13/`.
- 지시문: 바꾼 두 항목과 새 항목 셋이 계약 문장 그대로 들어갔다. 다른 줄은 바뀌지 않았다.
- 표시 범위:
  - 교정 단계에서 활성 오류의 PASSAGE·SCENARIO 인용만 보낸다.
  - EXPLANATION·STEM·CHOICE·그림 근거는 제외된다.
  - 못 찾는 인용은 뺀다.
- 판단 불가 안내: 세 조건과 문장이 계약대로다. 근거 보완(RATIONALE) 명령을 반영해 PROVIDED/OMITTED를 판단한다.
- Claude 재실행 결과: vitest 442/442 통과, `typecheck:client` 통과. e2e 11/11은 코덱스 보고를 따랐다.
- 지난 실험 실행기 테스트 실패(29/48)는 예상된 비호환이다. 고치지 않는다.
- 판정: 통과. 직접 고친 것은 없다.
