# 인계: 학생 진술끼리 모순되면 판정 불가, 교정 뒤 근거 확인은 학생이 말한 핵심 관계로만

- 날짜: 2026-10-21
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet, [D-0128](../../memory/decisions/D-0128-claude-subagent-work-division.md))
- 관련 결정: 승인 뒤 `memory/decisions/`에 새 번호로 기록(23번·24번 각각). 근거는 UI 메모장 23·24번
  (`docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`)과 논의 자료
  [23번 정리](../review/backlog-23-gongsun-q12-ellipsis-case-2026-10-21.md)·[24번 정리](../review/backlog-24-rationale-verified-criterion-2026-10-21.md).
- 상태: 구현됨. 실모델 시험에서 U1·V1 실패 → [2차 인계](./2026-10-21-v5-claim-conflicts-and-single-sufficiency-quote.md)

## 왜 하나

사용자가 직접 푼 공손룡 12번 ④(정답) 세션(2026-10-15, `6f10d55d…`):

> d는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은 옳지 않음.

- **23번:** 뒷문장을 글자 그대로 읽으면 학생 자신의 앞문장("d는 일반적인 옷")과 모순된다. 판정기는 이 문장을 원문과 비교해
  오류(E2)로 잡고 이미 학생이 쓴 내용을 다시 물었다. 사용자 결정(2026-10-21): "학생의 말 안에서 모순이 발생하는 경우니,
  과도한 해석을 하지 말고(과도한 해석을 하게 되면 불필요한 질문이 생길 수 있음) 판정 불가로."
- **24번:** 학생은 정답의 핵심 이유("ⓓ·ⓔ는 같은 대상이 아니다")를 말하지 않았다. 교정 답은 "빨간 옷", "지정되지 않은 옷"
  라벨뿐이다. 그런데 판정기가 "누적 답변을 반영하면 … 뒷받침할 수 있다"며 스스로 이어 `rationaleSufficient: true`로 봤고,
  결과가 `VERIFIED_CORRECT`가 됐다. 첫 판정에는 "평가자가 원문에서 올바른 관계를 찾아낼 수 있다는 사실은 학생이 그 관계를
  이해했다는 증거가 아니다"가 있지만 교정 뒤 충분성 규칙에는 없다. 사용자 결정(2026-10-21): Claude 권고에 동의.

## 목표

- 한 번의 근거 제출 안에서 학생 진술끼리 모순되면, 판정기는 보충해 읽지도 오류로 잡지도 않고 전체 판단을
  `reconstructability=UNKNOWN`으로 둔다. 정답 선택이면 지금 흐름대로 CORRECT_UNVERIFIED 마지막 설명, 오답이면 판단 불가로 간다
  (코드 변경 없음).
- 교정 뒤 `rationaleSufficient`는 선지의 참·거짓을 가르는 핵심 관계가 학생 발화에 드러날 때만 true다. true이면 그 학생 발화를
  새 필드 `sufficiencyEvidence`에 인용하고, 서버가 검증한다.

## 범위 밖

- 오류 수정 판정(`repairs`의 REPAIRED 기준). "말하지 않은 최종 결론을 수정 확인 조건으로 요구하지 않는다"(악어 예)는 그대로다.
  24번 기준은 충분성에만 적용한다.
- 교정 질문 형식(양자택일, D-0118), 질문 수, 종료 이유와 안내 문장, 마지막 설명 지시문, UI.
- 첫 판정의 SUPPORTED/INSUFFICIENT 기준(이미 같은 원칙이 있다).
- UI 메모장 25번.
- 다른 세션 파일(`DevPartNav.tsx` 등, 문단 쪽 파일).

## 손댈 파일과 계약

### 1. 판정 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`

**(가) 23번:** `## SELECTION` 안, "문맥으로 언어적 생략을 해석한 뒤에도 … UNKNOWN이다." 문단(지금 50~56행 부근) 바로 뒤에 아래 뜻의
문단을 넣는다. 표현은 지시문 문체에 맞춰 다듬어도 되지만 조건과 결과는 바꾸지 않는다.

> 같은 제출의 학생 진술을 글자 그대로 읽었을 때 서로 모순되면, 모순을 없애려고 학생이 밝히지 않은 관계·대상·조건을 보태 읽지
> 않는다. 모순된 진술을 원문과 비교해 오류로 잡지도 않는다. 이 경우 학생의 전체 판단을 확인할 수 없으므로
> `reconstructability=UNKNOWN`이다. 앞의 언어적 생략 복원(지시 대상·주어·서술어)만으로 모순이 풀리면 모순으로 보지 않는다.
> 교정 답이 앞선 주장을 바꾸는 것은 모순이 아니다(REPAIR는 최신 내용을 반영한다). 진술끼리 모순되면 아래 오류 가설도 세우지 않는다.

- `### 오류 가설` 절에 이미 "가설을 세우지 않는 경우" 목록이 있으면, 같은 뜻의 한 줄("학생 진술끼리 모순되는 경우")을 그
  목록에도 더한다. 목록이 없으면 위 문단만으로 둔다.

**(나) 24번:** `## REPAIR` 안, "`rationaleSufficient`는 전체 근거가 선지 판단에 충분한지 별도로 평가한다." 문단(지금 173~181행
부근)에 아래 뜻을 더한다.

> `rationaleSufficient`는 선지의 참·거짓을 가르는 핵심 관계가 학생 발화(처음 근거와 교정 답)에 드러날 때만 true다. 학생이 답한
> 대상·라벨을 평가자가 이어 만든 관계는 학생의 판단으로 인정하지 않는다. 평가자가 학생 발화를 재료로 올바른 판단을 만들 수
> 있다는 사실은 학생이 그 판단을 했다는 증거가 아니다. true이면 그 핵심 관계를 담은 학생 발화를 `sufficiencyEvidence`에 정확히
> 인용한다. false이면 `sufficiencyEvidence`는 빈 배열이다. 이 기준은 충분성에만 쓰고, 오류 수정 판정(`repairs`)에는 쓰지 않는다.

- 출력 필드 설명이 따로 있으면(`## 근거 기록` 등) `sufficiencyEvidence`를 같은 형식으로 더한다.

### 2. 스키마·검증 `packages/pipeline/src/problem-solving/feedback-v4.ts`

- `FeedbackRepairAssessmentSchema`에 `sufficiencyEvidence: z.array(StudentEvidence)`를 `rationaleSufficient` 바로 뒤에 더한다
  (strict JSON 스키마는 `z.toJSONSchema`로 그대로 생성된다).
- REPAIR 검증(`validateFeedbackAssessment`, `reviewedResponse` 검사 부근)에 더한다.
  - `rationaleSufficient === true`인데 `sufficiencyEvidence`가 비면 오류.
  - `rationaleSufficient === false`인데 `sufficiencyEvidence`가 비어 있지 않으면 오류.
  - 인용은 기존 `validateStudentEvidence(s, a.sufficiencyEvidence)`로 학생 발화(관찰) 안에 있는지 확인한다.
  - 오류 메시지는 기존 문체(한국어, 모델 재시도에 쓰임)를 따른다.
- `repairedOutcome`과 종료 흐름은 바꾸지 않는다.

### 3. 시험

- `packages/pipeline/src/problem-solving/feedback-v4.test.ts`: 위 검증 세 가지(참+빈 배열 거부, 거짓+인용 거부, 관찰에 없는 인용
  거부)와 정상 경우(참+유효 인용 → VERIFIED_CORRECT)를 더한다.
- REPAIR 원출력을 만드는 기존 시험 fixture(파이프라인·앱 서버·HTTP·e2e·`source-markers.test.ts` 등)에 `sufficiencyEvidence`를
  더한다. `rationaleSufficient: true`인 fixture는 그 세션의 실제 학생 발화 인용을 넣는다.
- 지시문 문구 자체를 검사하는 시험이 있으면 새 문단이 들어갔는지 확인하는 단언을 더한다.

### 4. 반자동 사용자 시험 사례 `scripts/v5-contradiction-sufficiency-user-cases.mjs` (새 파일)

기존 `scripts/v5-lead-user-cases.mjs`와 같은 형식(`id, group, questionId, choiceId, rationale, replies, full: true, path`)으로
아래 4개를 둔다. 모두 `gongsun-long-later-mohists-q12`, 선택 `C4`(정답). 실행은 하지 않는다(실모델 호출은 Claude가 사용자 승인 뒤).

| id | 목적 | rationale | replies | 기대 |
|---|---|---|---|---|
| U1 | 23번 대상 | `d는 일반적인 옷, e는 일반적인 옷. 특정 속성이 지정되지 않은 단어가 쓰이지 않고 있으므로 4번은 옳지 않음.` (사용자 원문 그대로) | 없음 | UNKNOWN → 질문 없이 CORRECT_UNVERIFIED 마지막 설명 |
| U2 | 23번 대조(과잉 적용 없음) | `d는 그냥 옷이고 e는 빨간 옷이라서 둘이 가리키는 대상이 달라. 그러니 4번은 옳지 않아.` | 없음 | SUPPORTED → VERIFIED_CORRECT |
| V1 | 24번 대상 | `d와 e 모두 일반적인 옷을 가리키니까, 4번처럼 속성이 지정되지 않은 말로 속성 있는 대상을 가리키는 문제는 없어. 그래서 4번은 적절하지 않아.` | `빨간 옷` | E1(ⓔ) 교정 성공, `rationaleSufficient: false` → UNVERIFIED_CORRECT |
| V2 | 24번 대조 | V1과 같음 | `빨간 옷이야. 그러니까 ⓓ의 그냥 옷이랑 ⓔ 빨간 옷은 같은 대상을 가리키는 게 아니네.` | 교정 성공, `rationaleSufficient: true`, `sufficiencyEvidence`에 V2 답 인용 → VERIFIED_CORRECT |

- 기대는 판정 기록용이다. 사례 모듈이 기대값을 자동 단언하지 않아도 된다. 다만 `cases.length === 4`와 id 중복 검사는 둔다.
- `scripts/run-v5-live-check.mjs`가 사례 모듈을 받는 방식이 지금과 같으면 그대로 쓴다. 바꿔야 하면 멈추고 보고한다.

## 완료 조건

- [ ] 지시문에 (가)·(나) 문단이 들어갔다.
- [ ] REPAIR 스키마에 `sufficiencyEvidence`가 있고, 검증 세 가지가 시험으로 확인된다.
- [ ] 기존 fixture가 모두 새 스키마를 통과한다.
- [ ] 사례 모듈이 4개 사례를 내보낸다(`node -e "import('./scripts/v5-contradiction-sufficiency-user-cases.mjs').then(m => console.log(m.cases.length))"` → 4).
- [ ] `npm run build`, 클라이언트 타입 검사 통과.
- [ ] `npm test`: 기존 실패 2개(`boundary.test.ts`, axis-architecture) 외 새 실패 없음.
- [ ] e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
      → 기존 실패 1개(`DevPartNav` "문제" 버튼 중복) 외 새 실패 없음.

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로
  바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). `.env`를 열지 않는다.
- 커밋하지 않는다. `git stash`를 쓰지 않는다. 다른 세션 파일을 건드리지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.md`(SELECTION 모순 문단, 오류 가설 제외 목록 한 문장, REPAIR 충분성 문단, 근거 기록 한 줄), `packages/pipeline/src/problem-solving/feedback-v4.ts`(스키마 필드·검증 3개), `packages/pipeline/src/problem-solving/feedback-v4.test.ts`(검증 시험, repair 헬퍼, 지시문 복원 시험에 새 문단 반영), `packages/app/src/server/problem-feedback-v4.test.ts`, `packages/app/src/server/problem-feedback-v4-http.test.ts`, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`(fixture), `scripts/v5-contradiction-sufficiency-user-cases.mjs`(새 파일, 4개 사례).
- 테스트 결과: `npm run build`·`typecheck:client` 통과. `npm test` 1327 통과, 2 실패(기존: boundary.test.ts, axis-architecture). e2e 12 통과 1 실패(`problem-feedback-v4-workbench.spec.ts:112`, 기존 알려진 DevPartNav '문제' 버튼 중복 실패로 추정, 새 실패 없음). 사례 모듈 length 4.
- 남은 문제: 없음. 실모델 호출·커밋은 하지 않음.
