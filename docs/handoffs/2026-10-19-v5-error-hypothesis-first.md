# 인계: 오답 근거에서 오류 가설을 먼저 세우고, 그 가설로 판정·질문하기

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 후 `memory/decisions/`에 새 번호로 기록. [D-0120](../../memory/decisions/D-0120-omitted-conclusion-reconstruction.md)
  정리("사실만 쓴 근거는 질문 없이 끝낸다", "오류는 명시 주장에서만 만든다")를 오답 선택에 한해 보완한다.
  근거 사례는 UI 메모장 26번(`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`).
- 상태: 사용자 승인(2026-10-19, "승인, 진행해줘"). 실모델 확인은 반자동 사용자 시험으로 대체(아래 완료 조건)

## 왜 하나

도파민 13번에서 학생은 ①을 골랐다(오답). 근거는 "지문에서 약물로 유입된 도파민은 장벽을 통과할 수 없다고
했음."이었다. 이 근거로 ①("(가)는 도파민과 달리 … 장벽을 통과하여 뇌로 진입할 수 있겠군")을 틀렸다고 보는 길은
"도파민에 관한 사실을 (가) 레보도파에 옮겼다" 하나뿐이다.

판정기도 이 점을 알았다. coaching에 "①에서 장벽을 통과한다고 설명한 물질은 도파민이 아니라 레보도파야"라고 썼다.
그러나 지시문의 "학생이 말하지 않은 오류를 역산하지 않는다"를 지켜 확인 불가로 처리했다. 그래서 학생은 질문도,
다시 고르기도 없이 정답을 들었다. 화면에서는 "어떻게 판단했는지 다 알기 어려웠어" 바로 뒤에 헷갈린 지점을 설명하는
칸이 나와 앞뒤가 맞지 않았다.

R-I2(정보 비대칭 13번 ②, "갑은 인공지능을 이용해 광고를 만들고, 이를 알리지 않았음.")도 같은 구조다. 사용자는 처음에
질문이 나오길 기대했다. 막힌 이유는 같은 규칙이었다(D-0120 정리).

사람 교사는 이럴 때 "아마 이렇게 생각했겠다"를 먼저 세우고, 그 지점을 묻는다. 이번 변경은 판정기가 같은 순서로
일하게 한다.

## 목표

- 오답을 고른 첫 선택에서, 학생이 밝힌 주장만으로는 오류가 나오지 않을 때, 판정기는 학생이 밝힌 주장에서 학생의
  선택까지 가는 **가장 그럴듯한 생각 하나**를 오류 가설로 세운다.
- 가설이 한쪽으로 뚜렷하고, 그 가설에서 학생이 말하지 않은 한 단계가 원문과 어긋나면, 그 단계를 **추정 오류**
  (`basis: 'INFERRED'`) 하나로 기록하고 질문한다. 이후 흐름(교정 → 다시 고르기 또는 마지막 설명)은 기존과 같다.
- 가설은 질문으로만 확인한다. 학생에게 보이는 어떤 문장도 학생이 그렇게 생각했다고 단정하지 않는다.
- 가설이 뚜렷하지 않거나 근거가 선지와 관계없으면, 지금처럼 확인 불가다(모호한 근거 대조군이 그대로여야 한다).

기대 흐름(도파민 13번 ①):

```
코치  정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게.
코치  ①에서 장벽을 통과한다고 한 건 도파민이야, (가) 레보도파야?
학생  레보도파네.
코치  맞아, 거기가 ①을 판단하는 열쇠야. 그걸 생각하면서 다시 골라 볼래?
```

## 범위 밖

- 정답 선택(CORRECT_UNVERIFIED 포함). 정답이면 가설을 세우지 않는다. UI 메모장 25번(판단 방식 설명)은 별도 설계다.
- 다시 고른 선택(두 번째 선택). 오답이면 이미 RESELECTION_WRONG으로 끝나고, 정답이면 위와 같다.
- 학생이 밝힌 주장에 이미 오류(CONTRADICTED·OFF_TARGET)가 있는 경우. 지금 규칙 그대로다.
- 명시 주장의 해석 규칙(UI 메모장 23번, 생략 문장을 학생의 다른 문장과 충돌하지 않게 읽기). 효과를 따로 보려고 뺀다.
- 코드 고정 문구(확인 불가 안내 등), 마지막 설명의 칸 구성과 첫 문장(D-0127).
- `scripts/lib/v5-marker-judgment.mjs`와 옛 실험 스크립트.

## 판정 지시문 (`packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`)

1. 28행 "학생이 말하지 않은 오류도 선택지나 정답에서 역산하지 않는다." 뒤에 덧붙인다.
   > 단, 아래 SELECTION의 오류 가설 규칙에 따른 추정 오류는 예외다.

2. SELECTION 절, 64행(재구성 규칙 끝) 뒤에 새 단락을 넣는다.
   > ### 오류 가설
   >
   > 학생이 오답을 골랐고 이번이 첫 선택(`selectionNumber` 1)이며, 학생이 밝힌 주장 중 CONTRADICTED·OFF_TARGET이
   > 하나도 없으면, 학생이 밝힌 주장에서 학생의 선택까지 가는 가장 그럴듯한 생각을 `errorHypothesis`에 평가자의 말로
   > 적는다. 가설은 학생이 밝힌 주장에 학생이 말하지 않은 한 단계를 더한 것이며, 그 단계를 더해야 학생의 선택이
   > 나와야 한다. 그 단계가 원문과 어긋나면 `basis`가 INFERRED인 오류 하나로 기록한다. 대상을 바꾼 단계면
   > errorType TARGET, 원문의 관계·조건을 바꾼 단계면 CONTENT다. 이때 reconstructability는 RECONSTRUCTABLE,
   > rationaleImpliedVerdict는 학생 선택이 뜻하는 판정, contentAssessment는 ERROR다. reconstructedPath에는 학생이
   > 밝힌 주장과 가설 단계를 쓰되, 가설 단계는 "(가설)"로 시작한다.
   >
   > 다음 경우에는 가설을 세우지 않고 errorHypothesis를 null로 둔 뒤 앞의 규칙을 따른다. 그럴듯한 가설이 둘 이상이다.
   > 학생이 밝힌 주장이 선지의 대상·조건과 관계가 없다. 판단 결과나 느낌만 있다("이상해요", "걸려요"). 한 단계로
   > 선택까지 이어지지 않는다. 정답을 골랐거나 두 번째 선택이다. 학생이 밝힌 주장에 이미 오류가 있다.

3. 질문 규칙 절, 186행(대상 오류 질문) 뒤에 덧붙인다.
   > - 추정 오류(basis INFERRED)의 질문은 가설 단계가 바꾼 대상이나 관계를 원문의 것과 나란히 놓는 두 갈래 질문으로
   >   쓴다. 학생이 그렇게 생각했다고 말하지 않는다("너는 …라고 봤지" 금지). 학생이 밝힌 주장은 인용할 수 있다.

4. REPAIR 절, 137행(대상 오류 판정) 뒤에 덧붙인다.
   > - 추정 오류(basis INFERRED)는 학생이 이번 답변에서 질문에 원문대로 답하면 REPAIRED다. 가설이 맞았는지는 따로
   >   판정하지 않는다.

5. 학생 주장 분리 기록 절, 238행 끝에 덧붙인다.
   > 오류 가설 규칙의 추정 오류(basis INFERRED)는 이 대응과 ERROR 조건에서 뺀다. 추정 오류가 있으면 contentAssessment는 ERROR다. 추정 오류의 studentEvidence에는 가설이 출발한
   > 학생 주장의 quote를 쓴다.

6. 나머지 문장은 바이트 그대로 둔다. 시험 문항의 내용을 예시로 넣지 않는다.

## 마지막 설명 지시문 (`packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`)

- 입력 `errors` 항목에 `basis`를 더한다(`errorId, description, question, status, basis`).
- INCORRECT 지시문 firstChoice 항목 뒤에 한 문장을 넣는다.
  > errors의 basis가 INFERRED인 오류는 학생이 말하지 않은 단계를 추정한 것이다. 학생이 그렇게 생각했다고 단정하지
  > 않고 "…로 봤다면"처럼 가정으로 쓴다.
- CORRECT 지시문은 바꾸지 않는다(정답 선택에는 추정 오류가 없다).

## 코드 (`packages/pipeline/src/problem-solving/feedback-v4.ts`, `feedback-v5-claims.ts`)

- `ErrorSchema`(SELECTION errors)에 `basis: z.enum(['STATED', 'INFERRED'])`를 더한다. REPAIR `newErrors`에는 더하지 않는다
  (교정 답변의 새 오류는 언제나 명시 주장이다). 세션의 `FeedbackError`에도 실린다.
- `FeedbackSelectionAssessmentSchema`에 `errorHypothesis: Text.nullable()`을 더한다. JSON Schema(모델 출력 형식)도 같이 갱신한다.
- `validateFeedbackAssessment`(SELECTION, boundary NONE)에 검사를 더한다. 하나라도 어기면 오류를 던진다.
  - INFERRED 오류는 최대 1개다.
  - INFERRED 오류가 있으면: `errorHypothesis`가 비어 있지 않고, STATED 오류가 없고, 선택이 오답이며
    `s.selections.length === 1`이고, `rationaleImpliedVerdict === s.choiceImpliedVerdict`다.
  - INFERRED 오류가 없으면 `errorHypothesis`는 null이다.
- `validateClaims`: INFERRED 오류는 CONTRADICTED·OFF_TARGET 대응 검사와 "ERROR without …" 검사에서 뺀다. INFERRED 오류의
  studentEvidence는 어떤 claim의 quote와 겹쳐야 한다(가설의 출발점).
- `applyFeedbackAssessment`: 라우팅은 바꾸지 않는다. INFERRED 오류도 기존 오류처럼 질문 대기열에 들어간다
  (TARGET 우선 정렬 그대로).
- 교정 성공 뒤 안내(`s.message`): 오답이고, `s.errors`가 INFERRED 오류 하나뿐이며, `additionalErrors`가 비었으면
  `맞아, 거기가 ①${을/를} 판단하는 열쇠야. 그걸 생각하면서 다시 골라 볼래?`
  (조사는 `numeralParticles(position)[0]`). 그 밖의 경우는 지금 문장 그대로다.
  - 지금 문장 "핵심 오류를 잘 고쳤어. 처음에 ①번을 고르게 된 생각 중 어디가 잘못됐는지…"는 학생에게 그 오류가 있었다고
    단정하므로, 추정 오류만 있을 때는 쓰지 않는다.
- `feedbackPublicView`: 바꾸지 않는다(basis·가설은 공개하지 않는다).

## 실모델 점검 도구 (`scripts/run-v5-live-check.mjs`)

- 새 자동 검사 `INFERRED_ASSERTED`: 추정 오류 질문과 교정 성공 안내, 마지막 설명 firstChoice에 "라고 봤지", "라고 생각했지",
  "라고 생각한", "로 착각" 같은 학생 생각 단정 표현이 있으면 위반으로 센다.
- 기존 검사는 그대로 둔다. 추정 오류는 대개 칠할 구절이 있으므로 NO_HIGHLIGHT 예외는 넣지 않는다.

## 테스트

- `feedback-v4.test.ts`:
  - 판정 지시문 승인 문구 비교 시험에 새 문장 다섯 곳을 반영한다.
  - 검사: INFERRED 2개 거부, INFERRED + STATED 거부, 정답 선택의 INFERRED 거부, 두 번째 선택의 INFERRED 거부,
    INFERRED인데 가설 null 거부, 가설만 있고 INFERRED 없음 거부, 결론이 선택과 다르면 거부.
  - 정상: INFERRED TARGET 하나 → 질문 → REPAIRED → 새 안내 문장(①·③ 조사, 나머지 조사), INFERRED + 새 오류 → 기존 문장.
  - 마지막 설명 입력에 `basis`가 들어가는지.
- `feedback-v5-claims` 관련 시험: INFERRED 오류의 claim 대응 면제와 출발점 겹침 검사.
- 기존 시험·e2e 모의 응답에 `basis: 'STATED'`, `errorHypothesis: null`을 더한다.

## 완료 조건

- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] vitest: 실패는 기존 2건(`student-state.ts` 경계, axis-architecture 산출물 없음)만 남는다.
- [ ] e2e 격리 실행 통과:
      `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
- [ ] 실모델 확인(Claude가 실행, 사용자 별도 승인 후). 하위 에이전트 몫이 아니다.
  - 반자동 사용자 시험(사용자 결정 2026-10-19): 도파민 13번에서 설계안이 바꾸는 분기 전부와 바뀌지 않는 대표 분기를
    실제 모델로 돌리고, 사용자가 단계마다 적절/고칠 점 있음/부적절로 판정한다. 기록은 `docs/experiments/` 새 폴더.
  - 자동 대조군: 모호한 근거 V군 6개(V-C·D·G·I·M·S)가 가설 없이 지난번과 같은 판정인지, `INFERRED_ASSERTED` 0인지.

## 알려진 위험

- 판정기가 학생 생각을 짐작하는 범위가 넓어진다. 가설이 틀려도 질문이 두 갈래라 학생이 바로 답할 수 있고, 맞게 답하면
  다시 고르기로 가므로 손해가 작다고 본다.
- 대조군에서 가설이 나오면(과잉 짐작) 조건 문장을 좁히고 재시험한다. 그래도 나오면 이 변경을 되돌린다.
- 판정 출력이 길어져 비용·시간이 조금 는다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(실모델 확인은 Claude가 한다).

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md` (지시문 5곳)
  - `packages/pipeline/src/problem-solving/feedback-v4.ts` (ErrorSchema `basis`, `errorHypothesis`, 검증, 교정 성공 안내, 선택 불일치 오류 `basis: 'STATED'`)
  - `packages/pipeline/src/problem-solving/feedback-v5-claims.ts` (INFERRED 대응 면제, 출발점 겹침 검사)
  - `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts` (errors 입력에 `basis`, INCORRECT 지시문 한 문장)
  - `scripts/run-v5-live-check.mjs` (`INFERRED_ASSERTED` 검사)
  - 시험: `feedback-v4.test.ts`(승인 문구 비교, 새 describe 'error hypothesis'), `source-markers.test.ts`, `packages/app/src/server/problem-feedback-v4.test.ts`, `problem-feedback-v4-http.test.ts`, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  - 옛 실험 스크립트 시험 모의 응답(스키마 필드만 추가): `scripts/lib/provider-adapter.test.mjs`, `v5-marker-judgment.test.mjs`, `v5-substitution-check.test.mjs`, `scripts/test-v5-live-connection.test.mjs`, `test-v5-multi-item-models.test.mjs`
  - 모델 출력 JSON Schema는 `z.toJSONSchema(FeedbackSelectionAssessmentSchema)`에서 나오므로 별도 수정 없이 `errorHypothesis`·`basis`(필수)가 반영된다. 시험으로 확인.
- 테스트 결과: `npm run build`, `npm run typecheck:client` 통과. vitest 1313건 중 1310 통과, 3 실패: 기존 2건(`student-state.ts` 경계, axis-architecture) + `dialogue-simple.test.ts`(입력 키에 `sourceCopyDetected` 추가됨, 이 변경과 무관한 문단 대화 쪽). e2e 13건 모두 통과. 실모델 호출·`run-v5-live-check.mjs` 실행은 하지 않았다.
- 남은 문제:
  - `dialogue-simple.test.ts` 실패는 이 작업 범위 밖(D-0149 `sourceCopyDetected` 관련으로 추정).
  - 옛 node:test 스크립트 시험(`scripts/**/*.test.mjs`)은 `npm test` 대상이 아니며 이 변경 전부터 실패한다(저장된 fixture에 `errorType` 없음, 기준 지시문이 v4.md). 모의 응답에 새 필드만 추가했고 통과 여부는 바꾸지 못했다.
  - 마지막 설명 지시문의 INFERRED 문장은 firstChoice 항목 안쪽 끝에 이어 붙였다(새 줄 아님).
- Claude 검토(2026-10-19): diff가 인계 문서와 맞는다. 판정 지시문의 "CONTRADICTED나 OFF_TARGET 주장이 하나도 없으면 ERROR가 아니다"와
  추정 오류 규칙이 부딪혀, 238행 끝 문장을 "이 대응과 ERROR 조건에서 뺀다. 추정 오류가 있으면 contentAssessment는 ERROR다."로 고쳤다.
  세 번째 vitest 실패(`dialogue-simple.test.ts`)는 다른 세션이 커밋한 문단 대화 코드에서 나며 이 변경과 무관하다.
- 실모델 확인(2026-10-19~20): 반자동 사용자 시험 [판정 기록](../experiments/v5-hypothesis-user-2026-10-19/REVIEW.md), 대조군
  `../experiments/v5-hypothesis-user-2026-10-19-controls/`. 결정 기록 [D-0150](../../memory/decisions/D-0150-error-hypothesis-first-for-wrong-choice.md).
  설명 문체 후속은 [인계](./2026-10-20-v5-end-explanation-style.md).

