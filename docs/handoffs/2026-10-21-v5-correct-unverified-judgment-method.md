# 인계: 정답·근거 미확인에서 판단 방식이 부족의 까닭이면 그 방식을 인정하지 않는다 (UI 메모장 25번)

- 날짜: 2026-10-21
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 뒤 `memory/decisions/`에 새 번호로 기록. 방향은 UI 메모장 25번 상세(`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`
  "25번 상세 · 방향", 2026-10-19 사용자가 Claude 권고에 동의).
- 선행: [23·24번 2차 인계](./2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote.md)(구현됨, 커밋 안 됨). 이 문서는 그 위에 더한다.
- 상태: 구현됨. 실모델 1차 뒤 마지막 설명 지시문 보강(까닭 문장), [D-0159](../../memory/decisions/D-0159-correct-unverified-judgment-method-note.md)

## 왜 하나

사용자가 직접 푼 도파민 13번 세션(2026-10-19, `704f449e…`, "적절하지 않은 것은?", 정답 ②):

- 근거: "카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음."
- 판정: INSUFFICIENT, 오류 0 → 질문 없이 CORRECT_UNVERIFIED 마지막 설명. 판정 이유: "지문에 해당 내용이 없다는 점만으로 그 설명이
  거짓이라고 판단하기에는 근거가 충분하지 않다."
- 첫 칸: "②를 고른 건 맞아. **네가 말한 대로 지문에는** … 내용이 없어. 여기에 더해, 카르비도파가 어디에서 작용하는지도 살펴봐야 해."
- 판단 방식("지문에 없음 → 틀림")을 맞는 근거처럼 인정했다. 이 방식이면 지문에 그대로 없는 적절한 추론 선지도 틀렸다고 보게 된다.
  마지막 설명 지시문의 CORRECT_UNVERIFIED 규칙("맞는 부분 인정 + 빠진 연결")을 그대로 따른 결과다. 마지막 설명은 판정 이유를 받지
  않아서, 판정기가 알아챈 "방식 문제"가 전달되지 않는다.

## 목표

- 판정기가 INSUFFICIENT의 종류를 표시한다: 판단 방식에 기댔는지(JUDGMENT_METHOD), 맞는 사실만 쓰고 연결이 빠졌는지(MISSING_LINK).
- 마지막 설명은 CORRECT_UNVERIFIED이고 JUDGMENT_METHOD일 때만, 그 방식만으로는 왜 부족한지 원리 한 문장 + 무엇을 확인해야 하는지
  쓴다. 그 방식을 맞는 근거처럼 인정하지 않고, 학생 생각을 틀렸다고 단정하지도 않는다.
- MISSING_LINK는 지금 규칙("맞는 부분 인정 + 빠진 연결") 그대로다.

## 범위 밖

- 오답 선택의 마지막 설명(판정기가 대개 내용 오류로 잡아 질문한다, 사용자 결정).
- 판정 결과(SUPPORTED/INSUFFICIENT/ERROR 기준), 질문, 종료 흐름, 결과 기록, UI.
- 칸 첫 문장(`feedbackSectionLead` "②를 고른 건 맞아.")과 칸 끝 문장(`feedbackSectionClosing` "네 근거에서 빠진 부분이 이해됐으면,").
- 반례 선지 언급("예를 들어 ①도…")은 넣지 않는다. 판단 방식 목록을 늘어놓지 않는다(사용자 결정).
- 다른 세션 파일(`DevPartNav.tsx` 등, 문단 쪽 파일).

## 손댈 파일과 계약

### 1. 스키마·검증 `packages/pipeline/src/problem-solving/feedback-v4.ts`

- `FeedbackSelectionAssessmentSchema`에 `insufficiencyKind: z.enum(['NONE', 'JUDGMENT_METHOD', 'MISSING_LINK'])`를
  `contentAssessment` 바로 뒤에 더한다.
- SELECTION 검증(`boundary !== 'NONE'`이면 지금처럼 바로 반환. 그 뒤, UNKNOWN 분기보다 앞)에 더한다.
  - `reconstructability === 'RECONSTRUCTABLE' && contentAssessment === 'INSUFFICIENT'`이면 `insufficiencyKind`는 `NONE`이 아니어야 한다.
  - 그 밖이면 `NONE`이어야 한다.
  - 메시지(기존 문체): "근거 부족 판정에는 부족의 종류(판단 방식 / 연결 빠짐)가 필요합니다." / "근거 부족이 아닌 판정에는 부족의 종류를 둘 수 없습니다."

### 2. 판정 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`

`### 내용 오류와 충분성`의 `INSUFFICIENT` 항목 뒤(또는 이 절 끝)에 아래 뜻의 문단을 더한다. 문체는 다듬어도 되지만 조건은 바꾸지 않는다.

> `contentAssessment=INSUFFICIENT`이면 부족의 종류를 `insufficiencyKind`에 적는다. 학생이 원문과의 관계가 아니라 판단 방식(원문에
> 그 말이 있는지 없는지, 같은 단어가 나오는지, 원문 밖 지식)에 기대어 선지를 판정했으면 `JUDGMENT_METHOD`다. 학생이 원문과 맞는
> 사실이나 대상을 밝혔지만 그것이 선지의 판정으로 이어지는 연결을 말하지 않았으면 `MISSING_LINK`다. 둘 다 해당하면 판정을
> 실제로 이끈 쪽을 고른다. INSUFFICIENT가 아니면 `NONE`이다. 이 표시는 판정 결과를 바꾸지 않는다.

### 3. 마지막 설명 `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`

- **입력:** `feedbackEndExplanationContent`의 payload에 `insufficiencyKind`를 더한다.
  - 값: `endReason === 'CORRECT_UNVERIFIED'`이면 마지막 선택의 SELECTION 판정(boundary NONE)의 `insufficiencyKind`, 그 밖이면 `null`.
  - 마지막 선택의 판정을 찾는 방법은 `feedbackSectionClosing`과 같은 방식(selectionComparisons와 SELECTION 판정의 같은 순번)을 쓴다.
    판정이 없으면 `null`.
- **지시문 `CORRECT_END_INSTRUCTIONS`:** 지금의 CORRECT_UNVERIFIED 문장 바로 뒤에 아래 뜻을 더한다.

> 다만 insufficiencyKind가 JUDGMENT_METHOD이면, 학생이 기댄 판단 방식을 맞는 근거처럼 인정하지 않는다(예: "네가 말한 대로 지문에는
> …없어"라고 쓰지 않는다). 대신 그 방식만으로는 선지를 판정하기 어려운 까닭을 원리 한 문장으로 말하고, 원문에서 무엇을 확인해야
> 하는지 말한 뒤, answer 칸에서 그 확인을 원문으로 채운다. 학생 생각을 틀렸다고 단정하지 않고, 다른 선지를 예로 들지 않는다.
> insufficiencyKind가 MISSING_LINK이거나 null이면 위 규칙 그대로다. insufficiencyKind는 학생에게 그대로 말하지 않는다.

- 내부 용어 금지 문장에 영향 없음을 확인한다. `INCORRECT_END_INSTRUCTIONS`는 바꾸지 않는다.

### 4. 시험

- `feedback-v4.test.ts`: 검증 두 가지(INSUFFICIENT+NONE 거부, SUPPORTED/ERROR/UNKNOWN+JUDGMENT_METHOD 거부)와 정상 경우.
- 마지막 설명 시험(있는 파일): CORRECT_UNVERIFIED 세션에서 payload `insufficiencyKind`가 판정 값과 같고, 다른 endReason이면 `null`.
- SELECTION 원출력을 만드는 기존 fixture 전부(파이프라인·앱 서버·HTTP·e2e·`source-markers.test.ts` 등)에 `insufficiencyKind`를 더한다.
  INSUFFICIENT fixture는 그 근거에 맞는 값을 넣는다(사실만 쓴 근거면 MISSING_LINK).
- 지시문 해시·문구 시험이 있으면 새 문구를 반영한다.

### 5. 반자동 사용자 시험 사례 `scripts/v5-judgment-method-user-cases.mjs` (새 파일)

기존 사례 모듈과 같은 형식. 모두 `dopamine-motor-control-q13`, 선택 `C2`(정답), `full: true`, replies 없음. 실행하지 않는다.

| id | 목적 | rationale | 기대 |
|---|---|---|---|
| M1a, M1b | 25번 대상(사용자 원문, 반복) | `카르비도파가 흑질에서 합성된 도파민의 작용 기간을 연장한다는 내용은 지문에 없음-> 2번은 적절하지 않음.` | INSUFFICIENT + JUDGMENT_METHOD. 첫 칸이 "지문에 없음"을 인정하지 않고 원리 한 문장 + 확인할 것 |
| M2 | 원문 밖 지식 | `카르비도파는 도파민 작용 기간을 늘리는 약이 아니라고 배웠어. 그래서 2번은 적절하지 않아.` | INSUFFICIENT + JUDGMENT_METHOD. 첫 칸이 지문·보기로 판단해야 함을 말함 |
| L1 | 대조: 사실만 씀 | `카르비도파는 말초 조직에서만 작용함.` | INSUFFICIENT + MISSING_LINK. 첫 칸은 지금 규칙(맞는 부분 인정 + 빠진 연결) |
| S1 | 대조: 충분한 근거 | `카르비도파는 혈액-뇌 장벽을 통과하지 못해 말초 조직에서만 작용하니까 흑질 도파민에는 영향을 못 줘. 그래서 2번은 적절하지 않아.` | SUPPORTED + NONE → "근거도 정확해. 잘 풀었어." |

- M2·L1·S1 근거는 Claude가 썼다. "같은 단어가 나옴" 유형은 이 문항(적절하지 않은 것)에 자연스러운 근거가 없어 시험하지 않는다.
- `cases.length === 5`와 id 중복 검사를 둔다.

## 완료 조건

- [ ] 스키마에 `insufficiencyKind`가 있고 검증 두 가지가 시험으로 확인된다.
- [ ] 판정 지시문·마지막 설명 지시문 반영, payload에 `insufficiencyKind`가 들어간다(시험 확인).
- [ ] 기존 fixture가 모두 새 스키마를 통과한다.
- [ ] 사례 모듈이 5개를 내보낸다.
- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] `npm test`: 기존 실패 2개(`boundary.test.ts`, axis-architecture) 외 새 실패 없음.
- [ ] e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
      → 기존 실패 1개(`DevPartNav` "문제" 버튼 중복) 외 새 실패 없음.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요하면 멈추고 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송 금지. `.env`를 열지 않는다.
- 커밋하지 않는다. `git stash`를 쓰지 않는다. 다른 세션 파일을 건드리지 않는다.

## 결과 보고 (실행 후 작성)


- 변경 파일: `packages/pipeline/src/problem-solving/feedback-v4.ts`(스키마 `insufficiencyKind`를 `contentAssessment` 뒤에 추가, SELECTION 검증 두 가지를 `boundary !== 'NONE'` 반환 뒤·추정 오류 검사 앞에 추가), `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`(`### 내용 오류와 충분성`의 INSUFFICIENT 항목 뒤 문단), `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts`(payload `insufficiencyKind`, 마지막 선택 판정을 `feedbackSectionClosing`과 같은 방식으로 찾는 작은 비공개 함수 `lastSelectionInsufficiencyKind`, `CORRECT_END_INSTRUCTIONS`에 JUDGMENT_METHOD 문장), `packages/pipeline/src/problem-solving/feedback-v4.test.ts`(새 시험 2개, 기존 fixture·지시문 복원·종료 지시문 정확 일치·payload 키 순서 시험 반영, `stored()` 로더가 옛 SELECTION 기록에 `insufficiencyKind`를 채움), `packages/pipeline/src/problem-solving/source-markers.test.ts`, `packages/app/src/server/problem-feedback-v4.test.ts`, `packages/app/src/server/problem-feedback-v4-http.test.ts`, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`, `scripts/test-v5-live-connection.test.mjs`(fixture에 `insufficiencyKind: 'NONE'`), `scripts/v5-judgment-method-user-cases.mjs`(새 파일, 5개 사례). 인계 목록 밖 코드 변경 없음(평가자 후처리 불필요).
- 테스트 결과: `npm run build`·`typecheck:client` 통과. `npm test` 1334 통과, 2 실패(기존: boundary.test.ts, axis-architecture). e2e 12 통과 1 실패(`:112`, 기존 DevPartNav "문제" 버튼 중복). 사례 모듈 length 5. 새 시험: INSUFFICIENT+NONE 거부, 비INSUFFICIENT(ERROR/SUPPORTED/UNKNOWN)+JUDGMENT_METHOD 거부, 두 종류 정상, CORRECT_UNVERIFIED payload 값 일치, 다른 endReason은 null.
- 남은 문제: `npm test`(vitest)에 속하지 않는 `node --test scripts/...` 모의 시험(`test-v5-live-connection`, `test-v5-multi-item-models`, `lib/provider-adapter`, `lib/v5-marker-judgment`, `lib/v5-substitution-check`)은 실패가 있다. 원인은 이전 인계부터의 것으로 보인다(모의 SELECTION에 `claimConflicts` 없음, "unexpected baseline instructions" 지시문 해시 불일치). 이번 변경 범위 밖이라 고치지 않았다. 필요하면 별도 인계가 필요하다. 실모델 호출·커밋은 하지 않음.
