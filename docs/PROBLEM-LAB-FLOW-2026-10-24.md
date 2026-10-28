# 개발자 문제 풀이 화면(`/problem/lab`) 작동 순서

갱신: 2026-10-28 (HEAD `fc23963b` + 작업 트리 기준으로 코드와 다시 대조)
작성일: 2026-10-24. 대상: 운영 후보 v5 판정기(지시문 v5.6)를 돌리는 개발자 문제 풀이 경로(D-0173, D-0090).
이 문서는 코드를 직접 읽고 쓴 운영 기록이다. 근거 표기는 저장소 루트 기준 `파일:줄`이다.
약칭: `PA` = `packages/app/src`, `PP` = `packages/pipeline/src/problem-solving`.
코드에서 확인하지 못한 것은 '미확인'으로 적는다.
갱신 이력: 2026-10-25 6절 처리(화면의 선택 횟수 표시), 2026-10-26 v5.1 정리(D-0177, `coaching` 없앰), 2026-10-27 v5.3 세 칸 판정(D-0182), 2026-10-28 마지막 설명 레이아웃 v1(D-0184)·판정 지시문 v5.6(D-0185)·말풍선 운영 규칙·출제자 전략 입구와 지문 칠하기가 본문에 반영돼 있다.

## 1. 개요

### 1.1 주소와 서버

- 화면 주소는 `/problem/lab`이다. `pathname === '/problem/lab'`이면 `ProblemLabApp`을 그린다 (`PA/client/main.tsx:36-37`).
- 옛 주소 `/problem/dev/v4`는 쿼리·해시를 유지한 채 `/problem/lab`으로 바꾼다 (`PA/client/main.tsx:23-26`).
- 화면 기본 문항은 `information-asymmetry-free-marketplace-q13`이고, URL의 `questionId`·`sessionId`·`returnTo`를 읽는다 (`PA/client/ProblemLabApp.tsx:23-26`, `:62`, `:68`).
- 문제 API는 별도 listener로 뜬다. 진입점은 `PA/server/problem-feedback-entry.ts`이고 포트는 `CSAT_PROBLEM_LAB_API_PORT`(없으면 옛 `CSAT_PROBLEM_V4_API_PORT`, 없으면 5175)이다 (`PA/server/problem-feedback-entry.ts:4-5`). 같은 `createLearningServer`를 쓴다 (`:1`, `:5`).
- vite(5173)가 `/api/developer/problem-lab`을 5175로, 옛 `/api/developer/problem-feedback-v4`도 5175로 프록시한다. 그 밖의 `/api`는 5174(`CSAT_API_PORT`)로 보낸다 (`packages/app/vite.config.ts:6`, `:12-13`, `:18-22`).
- 서버 접근 규칙: 개발자 API는 `CSAT_DEVELOPER_MODE=1`일 때만 열린다 (`PA/server/index.ts:150`, `:223`). 문제 API는 loopback이거나, `CSAT_PROBLEM_LAB_PUBLIC=1`(옛 `CSAT_PROBLEM_V4_PUBLIC`)이면서 호스트가 `dialogue.cogaxis.net`일 때만 열린다 (`:151`, `:202`, `:226`).
- 세션은 서버 메모리의 `Map`에 있다 (`PA/server/problem-feedback.ts:43`). 서버를 다시 띄우면 세션 조회가 '찾을 수 없습니다'로 실패한다 (`:195`). 이때 화면은 오류와 [새 테스트 시작]을 보인다 (`PA/client/ProblemLabApp.tsx:84`, `:215`). 디스크 기록은 4절에 있다.

### 1.2 API 라우트

| 메서드·경로 | 동작 | 근거 |
|---|---|---|
| `POST /api/developer/problem-lab/session` `{questionId}` | 세션 시작 | `PA/server/index.ts:227-231` |
| `GET …/session/:id` | 현재 보기 조회 | `:248-249` |
| `POST …/session/:id` | 제출(`FeedbackRequest`) | `:248`, `:250` |
| `GET …/session/:id/inspect` | 평가 서랍용 조회(재채점 없음) | `:247` |
| `GET …/session/:id/examiner-strategy` | 출제자 전략 조회 | `:234-235` |
| `POST …/session/:id/examiner-strategy/view` `{position}` | 전략 본 기록 | `:236-246` |
| 옛 접두 `/api/developer/problem-feedback-v4/` | 새 접두로 바꿔 같은 처리 | `:218-220` |

클라이언트 호출 함수는 `PA/client/problem-feedback-api.ts:14-19`에 있다.

### 1.3 버전 표기 원칙

- 코드 이름(파일·타입·함수·API·환경변수)에는 버전을 두지 않는다. 버전은 프롬프트 파일 이름과 기록되는 `promptVersion`에만 둔다 (D-0173 결정 3번째 항목). 현재 판정 지시문은 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.6.md`이고, 코드에서 `promptVersion`은 `'problem-feedback-v5.6'`이다 (`PP/feedback-evaluator.ts:106`, 지시문 읽기 `:147`).
- 지시문 판 이력: v5.1(`coaching` 필드 관련 문단과 제목만 바꿈, D-0177) → v5.2(보관만 하고 운영에 넣지 않음, D-0178) → v5.3(재구성 세 칸 `choiceReading`·`ground`·`judgment`와 서버 결론 확정, D-0182) → v5.6(선지 읽기 차이를 '덧붙인 내용 대 세기'로 가르는 relation 정의, 오답 READING 오류의 판정을 서버가 ERROR로 맞춤, D-0185; v5.4·v5.5는 그 실험 재현용). 옛 판 파일(`…-v5.md`, `…-v5.1.md`, `…-v5.3.md`, `…-v5.4.md`, `…-v5.5.md`)은 재현용으로 남아 있다. v5.6 파일의 첫 줄 제목은 아직 `# 문제 풀이 판정 v5.3`이다 (`…-v5.6.md:1`).
- 저장 호환 때문에 옛 값을 유지하는 목록:

| 값 | 근거 |
|---|---|
| 세션 `version: 'problem-feedback-v4'` | `PP/feedback.ts:5-6` |
| 기록 `schemaVersion: 'problem-feedback-v4-record-v1'` | `PA/server/problem-feedback.ts:21`, `:191` |
| 로그 경로 `.omc/logs/problem-feedback-v4/events.jsonl`, `…/examiner-strategy.jsonl` | `PA/server/session.ts:38`, `:51` |
| 옛 환경변수 `CSAT_PROBLEM_V4_API_PORT`, `CSAT_PROBLEM_V4_PUBLIC`, `CSAT_PROBLEM_FEEDBACK_V4_LOG` | `PA/server/problem-feedback-entry.ts:4,7`, `PA/server/session.ts:38` |
| 옛 API 접두, 옛 화면 주소 | 1.1, 1.2 |

- 브라우저 `sessionStorage` 키는 `csat.problem.lab.*`로 바뀌었다 (`PA/client/ProblemLabApp.tsx:27`, `:54`, `:75`, `:77`). 옛 키 `csat.problem.v4.*`를 읽는 코드는 `PA/client`에서 찾지 못했다(미확인이 아니라 이 디렉터리에는 없다).

### 1.4 학생에게 보이는 글: 누가 쓰나

번호는 기존 절 참조(2.2, 3.x 등)를 지키려고 1절 안의 마지막 소절로 넣었다.

한 번의 풀이에서 학생이 보는 글을 순서대로 놓고, 각 글을 쓰는 쪽을 적었다. 괄호는 모델 단계 이름이다(3.1).

```
학생 제출 (선지 + 근거)
  │  코드: 즉시 정답 여부 말풍선 '정답이야! …' / '정답이 아니야. …'      (problem-feedback.ts:101-104)
  │  코드: '생각 중' 말풍선 (문장 세트에서 제출 번호로 고름, 6·15·25초에 바뀜)
  ▼
[M1 판정, 필요하면 M2]  판정기: 오류 목록, 교정 질문 글, 칠할 원문 인용
  │  코드: 마무리 말풍선 ('다 살펴봤어.' 류)
  │  판정기가 쓴 교정 질문을 그대로 보이고, 코드가 칠할 위치를 지문에서 찾음
  ▼
학생 교정 답 → 코드: '생각 중' 말풍선 → [M3 교정 답 판정]: 판정기
  │  코드: 마무리 말풍선 → 다음 질문 | 안내 문장 + 버튼
  ▼
끝내는 길 (교정 실패, 재선택 오답, 근거 못 읽음, 정답인데 근거 부족 등)
  │  코드: 안내 GATE 말풍선 (사유 안내, '정답은 N번이야.', '… 하나씩 같이 볼까?') + [응]/[아니]
  ▼  [응]
[M4 마지막 설명]  마지막 설명 생성기: 칸 본문(firstChoice·reselection·answer)만 씀 (GATE 때 미리 생성)
  │  코드: 칸 앞 연결 ('네가 고른 ②번부터 볼게.' 등), 칸 첫 문장, 칸 마무리 문장, '이해됐어?'
  ▼
끝 (COMPLETED)
     출제자 전략: 미리 생성해 둔 글(FINAL.json)을 코드가 읽어 보임, 모델 호출 없음
```

정답이면서 근거가 충분하면 M4 없이 곧바로 끝난다 (`PP/feedback.ts:458`). 교정에 성공한 뒤 [설명 보기]/[코칭 보기]를 누르면 GATE 없이 M4로 간다 (`PP/feedback.ts:283`, `:205`).

| 부분 | 쓰는 쪽 | 지시문 파일·상수 | 모델 |
|---|---|---|---|
| 즉시 정답 여부 말풍선 | 코드 | 문장 고정 (`PA/server/problem-feedback.ts:101-104`) | 없음 |
| '생각 중' 말풍선 | 코드 | 문장 세트 `bubbleLines` (`PA/shared/bubble-lines.ts:18-29`), 고르기 `waitingText` (`PA/client/problem-composer-state.ts:18-25`) | 없음 |
| 마무리 말풍선(`WAIT_DONE`) | 코드 | `bubbleLines.done` (`PA/shared/bubble-lines.ts:30`), 붙이기 `appendCoach` (`PA/server/problem-feedback.ts:198-204`) | 없음 |
| 교정 질문 글(`errors[].question`, `selectionMismatchQuestion`) | 판정기 | `source-direct-problem-feedback-v5.6.md`의 '질문 규칙'(`:245`)·'학생 판단 서술 형식'(`:320`) | M1: 마지막 선택이 정답이면 `gpt-6-luna`, 오답이면 `gpt-6.1-sol` |
| 칠할 위치(교정 질문의 지문 칠하기) | 판정기가 고른 원문 인용(`sourceEvidence`)을 코드가 지문 위치로 바꿈 | `feedbackPublicView` (`PP/feedback.ts:487-495`) | M1과 같음 |
| 선택–근거 충돌 판정(M2) | 판정기(독립 결론 검증, 글은 학생에게 안 보임) | 인라인 `auditInstructions` (`PP/feedback-evaluator.ts:83-88`) | M1과 같음 |
| 교정 답 판정(M3) | 판정기(글은 학생에게 안 보임, 상태만 정함) | v5.6의 REPAIR 절 (`:184-243`) | `gpt-6-luna` 고정 |
| 교정 뒤 안내 문장('다시 골라 볼래?' 등), 종료 메시지, 정답 카드 | 코드 | `applyFeedbackAssessment` (`PP/feedback.ts:468-481`), `finish` (`:165-180`) | 없음 |
| 안내 GATE 말풍선 | 코드 | `appendCoachMessages` (`PA/server/problem-feedback.ts:214-239`) | 없음 |
| 마지막 설명 본문(`firstChoice`·`reselection`·`answer`) | 마지막 설명 생성기 | `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS` (`PP/feedback-end-explanation.ts:37-74`) | M4: 마지막 선택이 정답이면 `gpt-6-luna`, 오답이면 `gpt-6.1-sol` |
| 칸 앞 연결 말풍선 | 코드 | `PA/server/problem-feedback.ts:241`, `:244`, `:247` | 없음 |
| 칸 첫 문장 | 코드 | `feedbackSectionLead` (`PP/feedback-end-explanation.ts:92-114`) | 없음 |
| 칸 마무리 문장 | 코드 | `feedbackSectionClosing` (`PP/feedback-end-explanation.ts:116-136`) | 없음 |
| '이해됐어?' | 코드 | `PA/server/problem-feedback.ts:249`, `PP/feedback.ts:230`, `:255` | 없음 |
| 출제자 전략 글(끝난 뒤) | 미리 생성(런타임 호출 없음) | 생성 지시문 `docs/experiments/examiner-strategy-2026-10-23/PROMPT-v4.md`, 결과 `FINAL.json` | `gpt-6.1-sol` (`FINAL.json`의 `model` 필드) |
| 출제자 전략 안내·끝 문장 | 코드 | `strategyLeadText`·`strategyEndText` (`PA/client/examiner-strategy-state.ts:8-10`, `:46-47`) | 없음 |

풀어 쓰기 지시가 있는 곳:

| 글 | 풀어 쓰기 지시 | 근거 |
|---|---|---|
| 마지막 설명 본문(M4) | 있음. 레이아웃 v1의 `[풀어 쓰기]` 절(모든 칸을 압축하지 않고 풀어서, 한 문장에 한 가지, 개념어는 처음 쓸 때 쉬운 말로) | `PP/feedback-end-explanation.ts:42-43` |
| 교정 질문 | 없음. 질문 작성 규칙만 있다(한 번에 판단 관계 하나, 짧게 묻기 등) | `…-v5.6.md:245-262` |
| 출제자 전략 글 | 없음. `[풀어 쓰기]` 같은 절은 없고 '한 단계씩 쓴다…한 문장에 여러 단계를 몰아 쓰지 않는다' 한 줄만 있다 | `PROMPT-v4.md:50` |

주의: 기록의 `promptVersion`은 M4 호출에도 `'problem-feedback-v5.6'`으로 찍히지만(`PP/feedback-evaluator.ts:106`, 판정·마지막 설명 호출이 같은 `aggregate`를 쓴다), M4 지시문은 판정 지시문 v5.6과 별개인 레이아웃 v1이다.

## 2. 전체 흐름도

### 2.1 세션 상태 이름

- `phase`: `AWAITING_SELECTION`, `AWAITING_RATIONALE`, `AWAITING_EVALUATION`, `AWAITING_END_START`, `AWAITING_UNDERSTANDING`, `AWAITING_CORRECTION`, `AWAITING_POST_REPAIR_CHOICE`, `AWAITING_RESELECTION`, `ITEM_REVIEW`, `COMPLETED` (`PP/feedback.ts:123-124`).
- `evaluationMode`: `SELECTION`, `REPAIR`, `END_EXPLANATION`, `null` (`PP/feedback.ts:125`).
- 서버 런타임의 `evaluationStatus`: `IDLE`, `PROCESSING`, `RETRYABLE_ERROR` (`PA/server/problem-feedback.ts:33`).
- `pendingEnd.endReason`: `REPAIR_FAILED`, `COACHING_REQUESTED`, `RESELECTION_WRONG`, `RATIONALE_UNVERIFIABLE`, `NO_CORRECTION`, `CORRECT_UNVERIFIED` (`PP/feedback.ts:126`).
- 결과 `result.outcome`: `VERIFIED_CORRECT`, `UNVERIFIED_CORRECT`, `COACHING_TERMINATED` (`PP/feedback.ts:105`).
- 학생 명령(`command.type`): `SELECT`, `RATIONALE`, `CORRECT`, `RESELECT`, `REQUEST_EXPLANATION`, `FINISH`, `END_START`, `UNDERSTOOD` (`PP/feedback.ts:12-21`). 서버는 여기에 `RESUME`을 더한다 (`PA/server/problem-feedback.ts:17`).

### 2.2 흐름도 (텍스트)

괄호 안 `[모델:…]`은 모델 호출 단계다. 단계 번호(M1~M4)는 3절 표와 같다.

```
[시작] POST session ─ createFeedbackSession ─> phase=AWAITING_SELECTION            (problem-feedback.ts:51-59, feedback.ts:149-159)
   │
   ▼ 학생: 선지를 문제 칸에서 눌러 고르고(D-0172) 근거 입력 후 [제출]  → SELECT{rationale: PROVIDED}
   │         또는 [정답만 입력] 체크 후 제출                              → SELECT{rationale: OMITTED}
   │
   ├─ OMITTED 이고 정답  ──────────────> unknown() → finish(UNVERIFIED_CORRECT) → COMPLETED        (feedback.ts:265-266, 192-194)
   ├─ OMITTED 이고 오답, 2번째 선택 ───> endExplanation(RESELECTION_WRONG) → AWAITING_END_START    (feedback.ts:264)
   ├─ OMITTED 이고 오답, 1번째 선택 ───> phase=AWAITING_RATIONALE (감점 대상 표시, 개발판은 실제 차감 없음)  (feedback.ts:265, 267-269)
   │       학생: 근거 입력 후 [제출]  → RATIONALE{PROVIDED} → evaluate(SELECTION)
   │             [근거 미제출]         → RATIONALE{OMITTED}  → unknown() → (오답이므로) endExplanation(RATIONALE_UNVERIFIABLE) (feedback.ts:276, 192-196)
   └─ PROVIDED ────────────────────────> phase=AWAITING_EVALUATION, evaluationMode=SELECTION        (feedback.ts:271)
          │  서버: 즉시 '정답이야!/정답이 아니야' 말풍선(INSTANT)을 transcript에 넣고 모델 호출    (problem-feedback.ts:101-104)
          ▼
   [모델:M1 ASSESSMENT/SELECTION] → (조건부) [모델:M2 CONCLUSION_AUDIT] → 코드 검증 → applyFeedbackAssessment
          │   성공이면 서버가 마무리 말풍선(WAIT_DONE)을 코치 말풍선 앞에 붙임                       (problem-feedback.ts:144, 198-204)
          │
          ├─ 실패(검증·전송 오류, 재시도 소진) ──> evaluationStatus=RETRYABLE_ERROR, 화면 [평가 다시 시도] → RESUME → 다시 평가   (problem-feedback.ts:149-153, 89-91, 115-120; composer 56)
          ├─ boundary≠NONE ──────────────────────> phase=ITEM_REVIEW (학생 오류로 처리하지 않음, 정답 비공개)                 (feedback.ts:428-432)
          ├─ 오답인데 contentAssessment=SUPPORTED 이고 결론 일치 ──> phase=ITEM_REVIEW                                        (feedback.ts:441-443)
          ├─ reconstructability=UNKNOWN ──> 정답이면 endExplanation(CORRECT_UNVERIFIED), 오답이면 unknown()→endExplanation(RATIONALE_UNVERIFIABLE)  (feedback.ts:437-438)
          ├─ 오답이고 2번째 선택 ─────────────> endExplanation(RESELECTION_WRONG)                                           (feedback.ts:444)
          ├─ 오류 목록 있음 (errors, 선택–근거 충돌 'selection-mismatch' 포함; 선지 읽기 오류 READING 포함)
          │      ├─ 2번째 선택 ─────────────> endExplanation(NO_CORRECTION, UNVERIFIED_CORRECT)                              (feedback.ts:453)
          │      └─ 1번째 선택 ─────────────> 첫 오류의 교정 질문, phase=AWAITING_CORRECTION                                   (feedback.ts:454, 413-421)
          ├─ 오류 없음, 오답 ────────────────> unknown() → endExplanation(RATIONALE_UNVERIFIABLE)                           (feedback.ts:456)
          ├─ 오류 없음, 정답, SUPPORTED 아님 ──> endExplanation(CORRECT_UNVERIFIED)                                           (feedback.ts:457)
          └─ 오류 없음, 정답, SUPPORTED ─────> finish(VERIFIED_CORRECT) → COMPLETED                                           (feedback.ts:458)

   AWAITING_CORRECTION: 학생이 질문에 답함(CORRECT{errorId,text}) → evaluate(REPAIR)   (feedback.ts:289-291)
          │   (질문 말풍선이 나올 때 지문 칠하기: correctionHighlights, [지문에서 보기] 단추)  (feedback.ts:487-495, ProblemLabApp.tsx:164, 280)
          ▼
   [모델:M3 ASSESSMENT/REPAIR] → 코드 검증 → applyFeedbackAssessment (REPAIR 분기)                                              (feedback.ts:460-482)
          ├─ 아직 묻지 않은 오류가 남음(이미 REPAIRED면 skipped) ──> 다음 교정 질문, AWAITING_CORRECTION                       (feedback.ts:463, 413-421)
          ├─ 질문이 끝났고 verificationComplete 이면서 모든 오류 REPAIRED가 아님 ──> endExplanation(REPAIR_FAILED)             (feedback.ts:464-465)
          └─ 성공 ──> correctionSucceeded=true, phase=AWAITING_POST_REPAIR_CHOICE                                              (feedback.ts:466-467)
                 ├─ 마지막 선택이 정답: 버튼 [설명 보기](REQUEST_EXPLANATION) / [마치기](FINISH)                               (feedback.ts:507-511, composer 45)
                 └─ 마지막 선택이 오답: 버튼 [다시 선택](RESELECT) / [코칭 보기](REQUEST_EXPLANATION)                          (feedback.ts:507-511, composer 45)
          [다시 선택] → phase=AWAITING_RESELECTION (이번이 마지막 선택) → SELECT 제출 → 위 M1 흐름의 2번째 선택              (feedback.ts:286-287, 258, 264)
          [마치기] → finish(repairedOutcome) → COMPLETED                                                                       (feedback.ts:284-285)
          [설명 보기/코칭 보기] → endExplanation(COACHING_REQUESTED) → evaluate(END_EXPLANATION) (게이트 없이 바로 M4)            (feedback.ts:283, 205)

   AWAITING_END_START (게이트): 서버가 같은 시점에 마지막 설명 생성을 미리 시작한다(M4, 백그라운드)               (problem-feedback.ts:121, 148, 156-189)
          │  말풍선: (사유 안내) → (오답이면 '정답은 N번이야.') → '네 …를 하나씩 같이 볼까?' + 버튼 [응]/[아니]                      (problem-feedback.ts:214-239)
          ├─ [아니] END_START{accept:false} → finish(…, '알겠어. 이 문제는 여기까지야.') → COMPLETED                              (feedback.ts:253)
          └─ [응]  END_START{accept:true}
                 ├─ endExplanation 이미 있음 → phase=AWAITING_UNDERSTANDING                                                       (feedback.ts:255)
                 └─ 아직 없음 → evaluate(END_EXPLANATION): 진행 중 생성을 기다리거나 실패했으면 다시 호출(RETRYABLE_ERROR→RESUME)  (feedback.ts:254, problem-feedback.ts:133-136, 157)
                      (기다린 경우에만 마무리 말풍선 done-end-<transitionId>를 설명 말풍선 앞에 붙임)                              (problem-feedback.ts:171-173)
   AWAITING_UNDERSTANDING: 구간 말풍선을 순서대로 보인다(CONNECTOR/SECTION/QUESTION), 구간 사이는 [다음으로 넘어가기]   (problem-feedback.ts:240-249, composer 47-50, sequenceState 76-88)
          └─ [응]/[아니] UNDERSTOOD{answer} → finish(…) → COMPLETED, selfReportedUnderstanding=YES/NO                          (feedback.ts:249-251)

   COMPLETED:
          ├─ 화면이 GET examiner-strategy 호출 → 전략이 있으면 전략 단계: 버튼 줄 [다시 풀기][다음], 선지를 눌러 전략 열기 (모델 호출 없음, M 없음)    (ProblemLabApp.tsx:101-107, 225-229, 298; examiner-strategy.ts:34-41; composer 52-54)
          └─ [다시 풀기] → POST session (새 세션)                                                                            (ProblemLabApp.tsx:208-214, composer 53)
```

### 2.3 화면 쪽 공통 동작

- 제출은 `{transitionId(UUID), expectedRevision, command}`로 보낸다 (`PA/client/ProblemLabApp.tsx:186`). 서버는 같은 `transitionId`·같은 내용이면 이전 결과를 돌려주고(중복 처리 없음), 내용이 다르면 거부한다 (`PA/server/problem-feedback.ts:80-85`). 평가 중에 새 제출은 거부하고 (`:86`), 오래된 `revision`도 거부한다 (`:87`).
- 제출 전에 `pending` 요청과 초안을 `sessionStorage`에 저장한다 (`PA/client/ProblemLabApp.tsx:191`, `:93`). 새로 고침 뒤에도 같은 제출을 [같은 제출 다시 보내기]로 다시 보낼 수 있다 (`PA/client/problem-composer-state.ts:55`, `PA/client/ProblemLabApp.tsx:77-82`).
- `evaluationStatus === 'PROCESSING'`이면 1.5초마다 GET으로 상태를 확인한다 (`PA/client/ProblemLabApp.tsx:139-147`).
- 평가 중 `phase`는 `AWAITING_EVALUATION`이고, 화면은 직전 보기(`previousView`)를 기준으로 입력 영역을 그린다 (`PA/client/problem-composer-state.ts:36`).
- 대기 문구(생각 중 말풍선)는 명령 종류(ANSWER/CORRECTION/EXPLANATION/UNKNOWN)와 경과 시간(6초·15초·25초)으로 문장 세트를 정하고, 세트 안에서는 대기 중 제출의 `transitionId`를 키로 FNV-1a 해시를 써서 늘 같은 문장을 고른다 (`PA/client/problem-composer-state.ts:6-25`, `PA/shared/bubble-lines.ts:4-15`, `:17-31`). 정답 여부 말풍선이 있는 SELECT는 그 말풍선을 읽을 시간만큼 기다린 뒤 생각 중 말풍선을 보인다 (`PA/client/ProblemLabApp.tsx:170-177`).
- 마무리 말풍선: 모델 평가가 성공해 코치 말풍선이 붙을 때만 그 앞에 `kind: 'WAIT_DONE'` 한 줄이 transcript에 들어간다. 평가 실패에는 없다. 새로 고침해도 남는다(서버 기록). 문장은 `bubbleLines.done`에서 `transitionId`로 고른다 (`PA/server/problem-feedback.ts:198-204`; `PA/shared/problem-feedback.ts`의 `kind`). 화면은 '생각 중' 말풍선과 같은 모양(이름표 '피드백', 점 없음)으로 그린다 (`PA/client/ProblemLabApp.tsx:280`). 모델 입력은 세션 상태에서 만들며 transcript를 쓰지 않는다 (`PP/feedback-evaluator.ts:31-58`).
- 순차 말풍선 간격: 새로 받은 말풍선은 앞 말풍선 글자 수에 비례해 `min(2500, 1200 + 10×글자수)`ms 뒤에 나온다 (`PA/client/bubble-pacing.ts:2-4`, `PA/client/problem-composer-state.ts:76-88`). '동작 줄이기' 설정에서도 간격은 같고 점 애니메이션만 끈다 (`:87`). 새로 고침으로 복원된 말풍선은 한 번에 보인다 (`:75`).
- 선택 횟수 표시는 화면에 `선택 N / M`이고, M은 서버 보기의 `maxSelections`(현재 2)다 (`PA/client/ProblemLabApp.tsx:262`, `PP/feedback.ts:504`).
- 평가 서랍은 `GET …/inspect`로 저장된 판정을 보여 줄 뿐 재채점하지 않는다 (`PA/client/FeedbackDrawer.tsx:22`, `:29`; `PA/server/problem-feedback.ts:62-75`).

### 2.4 교정 질문 한도

- 교정 질문은 1번째 선택의 판정(M1)에서 나온 `errors` 목록의 항목 수만큼만 묻는다. 대상 오류(TARGET)를 먼저, 선지 읽기 오류(READING)를 그다음, 내용 오류(CONTENT)를 나머지로 둔다 (`PP/feedback.ts:445-446`).
- 질문 중 앞선 답변으로 이미 REPAIRED가 된 오류는 묻지 않고 건너뛴다 (`PP/feedback.ts:415-416`).
- 교정 답변(M3)에서 새로 찾은 오류는 `additionalErrors`에 기록만 하고 질문 큐를 늘리지 않는다 (`PP/feedback.ts:78-79`, `:462`).
- 2번째 선택(재선택)에서는 오류가 있어도 질문하지 않고 마지막 설명으로 간다 (`PP/feedback.ts:453`). 검증도 2번째 선택의 질문은 검사하지 않는다 (`PP/feedback.ts:383-387`). 이때 READING 오류는 질문 없이 기록돼 M4가 처음으로 짚는다 (`PP/feedback-end-explanation.ts:201-203`).
- 추정 오류(`basis: INFERRED`)는 최대 하나, 조건은 오답 1번째 선택 등이다 (`PP/feedback.ts:367-372`). 대상 오류(TARGET)는 최대 하나다 (`PP/feedback-claims.ts:76`).
- 오류 수의 별도 상한 숫자는 코드에서 찾지 못했다(미확인).

## 3. 단계별 표

### 3.1 모델 호출 단계 한눈에

모델 호출은 `OpenAIFeedbackEvaluator.evaluate` 한 함수가 `kind`로 구분한다. `kind`는 `ASSESSMENT`, `CONCLUSION_AUDIT`, `END_EXPLANATION` 세 가지다 (`PP/feedback-evaluator.ts:18`, `:112`). 2026-10-26 v5.1 정리(D-0177)로 `COACHING` kind(옛 M5)는 없어졌다. `ASSESSMENT`가 `SELECTION`·`REPAIR` 두 mode를 가지므로 이 문서는 모델 호출 4단계(M1~M4)로 나누고, 모델을 쓰지 않는 단계(N1 코드 전이, N2 출제자 전략)를 따로 둔다.

| 단계 | kind / mode | 호출 시점 |
|---|---|---|
| M1 | `ASSESSMENT` / `SELECTION` | 근거가 있는 선택(첫 선택·재선택), 또는 근거 보완 제출 뒤 |
| M2 | `CONCLUSION_AUDIT` | M1 통과 뒤 결론이 선택 목표와 다를 때만 |
| M3 | `ASSESSMENT` / `REPAIR` | 교정 질문에 학생이 답한 뒤 |
| M4 | `END_EXPLANATION` | 마지막 설명이 필요한 경우 |
| N1 | (모델 없음) | 근거 미제출·버튼 명령 등 코드만의 전이 |
| N2 | (모델 없음) | 종료 뒤 출제자 전략 읽기 |

### 3.2 공통 호출 조건 (모든 모델 호출)

- 모델 선택 (`PP/feedback-evaluator.ts:90-91`, `:101`): `FEEDBACK_SELECTION_MODELS = { correct: 'gpt-6-luna', incorrect: 'gpt-6.1-sol' }`, `FEEDBACK_REPAIR_MODEL = 'gpt-6-luna'`. 코드는 `options.model`이 있으면 그것을, 없으면 `evaluationMode === 'REPAIR'`일 때 `FEEDBACK_REPAIR_MODEL`을, 그 밖(SELECTION·END_EXPLANATION)에는 마지막 선택(`s.selections.at(-1)`)이 정답인지에 따라 `correct`(luna) 또는 `incorrect`(sol)를 쓴다 (`:99`, `:101`). 한 `evaluate` 호출 안의 모든 kind(ASSESSMENT·CONCLUSION_AUDIT·END_EXPLANATION)는 같은 `model` 변수를 쓴다 (`:116`). 결정 근거: D-0104(첫 선택 정오), D-0107(세션 전체·REPAIR luna).
- 요청 형식: Responses API, `store: false`, `reasoning.effort: 'medium'`, `max_output_tokens` 기본 8000, JSON Schema `strict: true`, 스키마 이름 `problem_feedback_<kind 소문자>` (`:115-119`). SELECTION의 ASSESSMENT만 세 칸·학생 주장 등을 더한 확장 스키마를 쓴다 (`:119`; `PP/feedback-claims.ts:9-40`). 시간 제한 기본 60초 (`:120`).
- 재시도 (`:130-197`): 시도는 기본 2회(`maxRetries ?? 1`, `:193`). 재시도 대상은 OpenAI `APIError`면 상태 408·409·429·5xx, 그 밖의 오류면 메시지에 `RUN_LIMIT:`이 없는 경우다 (`:190-192`). 실패 메시지는 다음 시도에 `{validationFeedback}`로 입력에 덧붙는다 (`:137`, `:144`, `:195`). 모든 시도는 `attempts[]`에 kind·model·rawOutput·error·토큰과 함께 남는다 (`:123-125`, `:184-189`). 재시도를 다 쓰면 `FeedbackEvaluationError`를 던진다 (`:193`).
- 서버 쪽: 모델 호출 전에 접수한 제출을 먼저 저장한다 (`PA/server/problem-feedback.ts:105-108`). 실패하면 `EVALUATION_FAILED`로 저장하고 `RETRYABLE_ERROR`로 둔다 (`:149-153`). 학생 화면에는 원 오류 문구를 주지 않고 고정 문구를 준다 (`:260-261`).
- 서버는 평가기에 `structuredClone(r.session)`만 넘긴다 (`:141`). 평가기가 돌려준 `rawOutput`은 서버가 `applyFeedbackAssessment`로 한 번 더 검증·적용한다 (`:142`).

### 3.3 M1 — ASSESSMENT / SELECTION

| 항목 | 내용 |
|---|---|
| 언제 | `evaluate(s,'SELECTION')`로 들어간 `AWAITING_EVALUATION` 상태: 근거를 적은 SELECT (`PP/feedback.ts:271`), 근거 보완 RATIONALE (`:277`). |
| 프롬프트 | 파일 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.6.md` 전체를 `instructions`로 쓴다. 호출 때마다 디스크에서 읽는다 (`PP/feedback-evaluator.ts:147`). 구성: 자료 경계(`:9`), SELECTION(`:42`), 선택 목표와 학생 결론의 구별(`:47`), 선지 이해와 합당 기준(`:70`; 세 칸 `choiceReading`·`ground`·`judgment` 기록), 선지 읽기 오류(`:90`), 오류 가설(`:100`), 내용 오류와 충분성(`:131`), REPAIR(`:184`, M3 전용), 질문 규칙(`:245`), 자료 경계(`:278`), 근거 기록(`:285`), 학생 주장 분리 기록(`:307`), 학생 판단 서술 형식(`:320`). 별도 인라인 지시문은 없다. |
| 목적 | 학생 발화에서 판단을 재구성하고(`reconstructability`), 선지에 대한 결론(`rationaleImpliedVerdict`)·내용 평가(`contentAssessment`)·오류와 교정 질문을 만든다. 다음 행동은 서버가 정한다 (프롬프트 `:4`). 판정 전에 학생 주장 분리(`studentClaims`)·모순 기록(`claimConflicts`)과 재구성 세 칸을 기록하게 한다: 선지 이해 `choiceReading`(선지 주장별 학생 읽기와 관계 relation: UNTOUCHED·EXACT·BLANK_FILLED·WEAKER·STRONGER·ADDED·REVERSED·OTHER_TARGET), 근거 `ground`(FACT·CONCLUSION_RESTATED·JUDGMENT_METHOD·NONE), 판단 `judgment` (`PP/feedback-claims.ts:5-6`, `:16-28`; 프롬프트 `:312`; D-0156, D-0182, D-0185). |
| 모델 | 마지막 선택이 정답이면 `gpt-6-luna`, 오답이면 `gpt-6.1-sol` (`PP/feedback-evaluator.ts:90`, `:101`). |
| 입력 | `feedbackRequestContent` → `feedbackEvaluationInput` (`:31-70`). JSON 하나(`input_text`)와 원자료 이미지(`input_image`, `detail: 'high'`, 앞에 `[SOURCE_MEDIA id \| placement]` 표지, `:66-69`). JSON 필드: `version`, `mode`, `source`(문항 번들), `targetVerdict`, `selection{choiceId, choiceImpliedVerdict, selectionNumber}`, `observations`, `initialErrors`(=[]), `additionalErrors`(=[]), `previousRepair`(=null), `currentStudentResponse`(=null) (`:35-55`). `source`는 번들에서 `stemPolarity`만 뺀 것이어서 지문(`passage`), 발문(`stem`), 보기(`scenario`), 표지 위치(`textAnnotations`), 선지(`choices`), 정답 선지 ID(`answerChoiceId`), 공식 해설(`officialExplanation`), 미디어 메타(URL 제거)를 포함한다 (`:33-34`, `:61-63`; 번들 필드는 `PP/source-direct-evaluator.ts:118-134`). 표지 위치가 있으면 `sourceTextAnnotationGuide`를 덧붙인다 (`:64`). `observations`는 이번 선택 번호의 학생 발화이며 `CORRECT`는 제외한다. 과거 선택의 근거를 빌려 오지 않는다 (`:42-45`). 구조화 문제 골드 키가 섞이면 예외를 던진다 (`:56`; 금지 키 목록 `PP/source-direct-evaluator.ts:396-408`). 프롬프트도 입력에 정답과 공식 해설이 있다고 밝힌다 (프롬프트 `:11`). `stemPolarity`는 넘기지 않고 서버가 정규화한 `targetVerdict`(VALID/INVALID)만 넘긴다. |
| 출력 | 모델에게 요청하는 스키마는 `FeedbackSelectionAssessmentSchema` (`PP/feedback.ts:43-66`)에 `claimConflicts`, `choiceReading`, `ground`, `judgment`, `studentClaims`를 더한 것이다 (`PP/feedback-claims.ts:9-40`). 판정 필드: `mode`, `boundary`(NONE/MISSING_SOURCE/KEY_CONFLICT), `reason`, `reconstructability`, `reconstructedPath`, `rationaleImpliedVerdict`, `contentAssessment`, `insufficiencyKind`, `studentEvidence`, `sourceEvidence`, `errors[]`(errorId·errorType(TARGET/READING/CONTENT)·description·studentEvidence·sourceEvidence·question·basis), `errorHypothesis`, `selectionMismatchQuestion`. 세션에 저장되는 판정에는 검증용 칸(`studentClaims`·`claimConflicts`·`choiceReading`·`ground`·`judgment`)이 빠지고, 서버가 만든 `readingSummary`(`insufficiencyCase`·`conclusionOnly`·`judgmentNote`·`readings[]`)가 붙는다 (`PP/feedback-evaluator.ts:157-158`; `PP/feedback.ts:59-65`; `PP/feedback-claims.ts:257-264`). `coaching`은 v5.1에서 없앴다 (D-0177). |
| 서버 정규화·결론 확정 (검증 전) | `normalizeCells` (`PP/feedback-evaluator.ts:152`; `PP/feedback-claims.ts:162-194`): UNTOUCHED 주장의 읽기 칸 비우기, 판정 대상 id 정리, `ground` NONE 칸 비우기, 정답 선택의 READING 오류 제거, 오답 선택·재구성 가능·READING 오류가 있는데 `contentAssessment`가 ERROR가 아니면 ERROR·`insufficiencyKind` NONE으로 맞춤(`:190-192`, D-0185). 바꾼 내용은 시도 기록의 `normalized`에 남는다 (`PP/feedback-evaluator.ts:19-20`, `:153`, `:155`). 이어 `settleConclusion` (`:154`; `PP/feedback-claims.ts:197-228`): 세 칸이 모두 찼는지(`touched` 1개 이상, `ground`≠NONE, `judgment.verdict`≠NONE)로 서버가 재구성 가능 여부를 정하고, 정답 선택이면 충족/부족과 `insufficiencyKind`도 세 칸에서 정한다(`readingJudgment`, `:231-254`). 판정기 결론과 달라도 실패시키지 않는다 (D-0182). |
| 코드 검증 순서 | (1) `normalizeCells` → `settleConclusion` (위 행). (2) `validateClaims` (`PP/feedback-evaluator.ts:156`; `PP/feedback-claims.ts:46-106`, 세 칸 검사 `validateCells` `:110-159`): studentClaims 비어 있지 않음·구조·quote가 학생 발화에 실재, RECONSTRUCTABLE이면 READING 오류는 오답 선택·STATED만 허용, CONTRADICTED↔CONTENT 오류, OFF_TARGET↔TARGET 오류 대응(`:57-78`), 대상 오류 1개 이하(`:76`), claimConflicts 구조·인용·겹침 검사와 있으면 UNKNOWN·errors 없음(`:79-88`), 세 칸 구조·인용(`:89`), 재구성 가능 여부와 결론이 세 칸을 따름(`:90-94`), READING 오류에 맞는 `choiceReading` 주장 존재(`:95-98`), 정답 선택의 SUPPORTED/INSUFFICIENT가 세 칸 판단과 일치(`:99-104`). (3) 검증용 필드 제거와 `readingSummary` 붙이기 (`PP/feedback-evaluator.ts:157-158`). (4) `validateFeedbackAssessment` (`:160`; `PP/feedback.ts:356-411`): 학생 인용이 해당 관찰의 실제 발화에 포함, 원문 인용이 해당 위치 원문에 포함(공백·따옴표만 다른 유일 일치는 복구 `PP/feedback.ts:321`, `:329-346`), 오류 ID 중복·예약 ID `selection-mismatch` 금지(`:361`), 근거 부족 판정에는 `insufficiencyKind` 필요(`:364-366`), 추정 오류 조건(`:367-372`), UNKNOWN일 때 결론 UNKNOWN·SUPPORTED 금지(`:373-376`), 재구성 가능 판정의 필수 필드(`:377`), `ERROR`↔오류 목록 일치(`:378`), 선지 읽기 오류는 오답 선택에서만(`:379`), 선택–근거 충돌 질문 누락(`:381-382`), 1번째 선택의 질문에 정답 노출 금지(`validateQuestion`, `:347-355`, `:384-387`). (5) M2 조건부 실행 (아래, `PP/feedback-evaluator.ts:162-178`). (6) 전이 모의 실행 `applyFeedbackAssessment` (`:180`). 판정에 대한 별도 문자열 검증(옛 `validateFeedbackCoaching`)은 이제 없다. |
| 실패 시 | 위 어느 단계든 예외가 나면 시도 오류로 기록하고 재시도한다 (3.2). 재시도를 소진하면 `RETRYABLE_ERROR`이고 학생은 [평가 다시 시도]로 같은 평가를 다시 부른다 (`PA/server/problem-feedback.ts:89-91`, `PA/client/problem-composer-state.ts:56`). |
| 적용 | 서버가 `applyFeedbackAssessment`를 호출해 상태를 옮긴다 (`PA/server/problem-feedback.ts:142`; 분기는 2.2 흐름도). 성공이면 마무리 말풍선이 코치 말풍선 앞에 붙는다 (`:144`). 판정 출력에는 학생용 설명 칸이 없다. 학생에게 보이는 마지막 설명은 M4만 쓴다 (D-0177). |

### 3.4 M2 — CONCLUSION_AUDIT (독립 결론 검증)

| 항목 | 내용 |
|---|---|
| 언제 | M1이 `validateFeedbackAssessment`를 통과한 뒤, `mode=SELECTION`, `boundary=NONE`, `reconstructability=RECONSTRUCTABLE`, 그리고 `rationaleImpliedVerdict !== choiceImpliedVerdict`일 때만 (`PP/feedback-evaluator.ts:162-164`). |
| 프롬프트 | 인라인: `PP/feedback-evaluator.ts:83-88`의 `auditInstructions`. 파일 프롬프트는 쓰지 않는다. |
| 목적 | 학생 발화에서 선택 선지의 참/거짓에 대한 학생 자신의 판단만 독립적으로 읽는다. 학생이 사실을 틀리게 알았어도 참이라 봤으면 VALID. 객관적 정답이나 선택 목표를 추측하지 않는다 (`:84-85`). |
| 모델 | M1과 같은 모델 변수(마지막 선택 정오로 luna/sol) (`:101`, `:116`). |
| 입력 | `selectedChoice`(선택 선지의 `choiceId`·`position`·`text`)와 `studentResponses`(`observationId`, `text`)만 (`:167-170`). 넘기지 않는 것: 정답 여부·`answerChoiceId`, `targetVerdict`·`choiceImpliedVerdict`, 지문·발문·보기·공식 해설, 이전 모델 판정 (코드 주석 `:161`; 입력 객체 `:167-170`). 원자료 이미지도 넘기지 않는다 (`:166-170`). |
| 출력 | 스키마 `ConclusionAuditSchema` (`:78-82`): `rationaleImpliedVerdict`(VALID/INVALID/UNKNOWN), `studentEvidence[]`(observationId, quote; 1개 이상), `reason`. |
| 코드 검증 | 인용이 해당 관찰 발화에 실재하는지 확인 (`:171-174`). 감사 결론이 M1의 `rationaleImpliedVerdict`와 다르면 예외 `학생 관점 결론 불일치`(두 결론과 발화 근거 포함)를 던진다 (`:175-177`). |
| 실패 시 | 예외는 3.2의 재시도 경로로 간다. 다음 M1 시도에 이 메시지가 `validationFeedback`으로 붙는다 (`:195`). 재시도 소진 시 `RETRYABLE_ERROR`. |

### 3.5 M3 — ASSESSMENT / REPAIR (교정 답변 판정)

| 항목 | 내용 |
|---|---|
| 언제 | 교정 질문에 학생이 `CORRECT` 명령으로 답한 뒤 (`PP/feedback.ts:289-291`). |
| 프롬프트 | M1과 같은 파일, 특히 `## REPAIR` 절(프롬프트 `:184-243`)과 질문 규칙·근거 기록. 인라인 지시문은 없다 (`PP/feedback-evaluator.ts:147`). |
| 목적 | 누적 학생 발화로 기존 오류(`initialErrors`·`additionalErrors`)마다 REPAIRED/REMAINING/UNCONFIRMED를 판정하고, 새 오류는 기록만 하며, 근거 충분성(`rationaleSufficient`)과 `verificationComplete`를 따로 기록한다. 질문이 겨냥한 국소 오류만 본다 (프롬프트 `:197`; D-0108). 충분성 인용은 핵심 관계를 혼자 담은 학생 발화 하나 (프롬프트 `:238-240`; D-0157). 읽기 오류(READING)는 학생이 선지에 실제로 쓰인 말을 고르거나 그대로 말하면 REPAIRED다 (프롬프트 `:207`). |
| 모델 | 항상 `gpt-6-luna` (`FEEDBACK_REPAIR_MODEL`, `PP/feedback-evaluator.ts:91`, `:101`; D-0107). 정답·오답 세션과 무관하다. |
| 입력 | M1과 같은 JSON에서 `mode='REPAIR'`, `selection=null`, `observations`=모든 관찰(SELECT·RATIONALE·CORRECT), `initialErrors`=`s.errors`, `additionalErrors`, `previousRepair`(직전 REPAIR 판정 또는 null), `currentStudentResponse{role, observationId, text, inReplyTo(해당 오류의 질문)}` (`PP/feedback-evaluator.ts:35-55`). `source`는 M1과 같아 정답 선지 ID·공식 해설을 포함한다. 과거 선택을 REPAIR 일관성 검사의 피연산자로 쓰지 않는다 (함수 주석 `:30`). |
| 출력 | 스키마 `FeedbackRepairAssessmentSchema` (`PP/feedback.ts:67-89`): `mode`, `boundary`, `reason`, `reviewedResponse{observationId, quote}`, `repairs[]{errorId, status, studentEvidence}`, `newErrors[]`, `verificationComplete`, `rationaleSufficient`, `sufficiencyEvidence[]`. 요청 스키마는 확장하지 않는다 (`PP/feedback-evaluator.ts:119`). 정규화·`validateClaims`는 SELECTION에만 돈다 (`:148`). |
| 코드 검증 | `validateFeedbackAssessment` REPAIR 분기 (`PP/feedback.ts:388-409`): 최신 `CORRECT` 관찰의 `reviewedResponse` ID 일치 (`:390-392`), `repairs`가 전체 오류를 정확히 한 번씩 포함 (`:393-394`), REPAIRED는 `CORRECT` 발화 인용이 필요하고 단순 동의 발화만으론 불가 (`:395-398`), 충분성 인용은 정확히 하나·충분하지 않으면 없음 (`:400-403`), 오류로 확정된 발화는 충분성 인용 금지(선택 충돌 항목은 제외, D-0164) (`:404-406`), 새 오류 ID 중복 금지·인용 검사 (`:407-408`). 이어 전이 모의 적용 (`PP/feedback-evaluator.ts:180`). |
| 적용 결과 | 오류 상태 누적 재계산, 새 오류는 `additionalErrors`에만 추가 (`PP/feedback.ts:460-462`), 이후 분기는 2.2. 성공이면 `AWAITING_POST_REPAIR_CHOICE`와 안내 문구(코드가 정함) (`:466-482`). |
| 실패 시 | M1과 같다. |

### 3.6 M4 — END_EXPLANATION (마지막 설명)

| 항목 | 내용 |
|---|---|
| 언제 | (a) `AWAITING_END_START`에 들어가는 순간 서버가 백그라운드로 미리 생성 (`PA/server/problem-feedback.ts:121`, `:148`, 생성 함수 `:156-189`). (b) 학생이 [설명 보기/코칭 보기]를 누르면 게이트 없이 `AWAITING_EVALUATION`/`END_EXPLANATION`으로 가서 생성 (`PP/feedback.ts:205`, `PA/server/problem-feedback.ts:133-136`). (c) [응]을 눌렀는데 아직 설명이 없으면 생성하거나 진행 중 생성을 기다림 (`PP/feedback.ts:254`, `PA/server/problem-feedback.ts:157`). 생성 중 학생이 [아니]로 끝냈으면 결과를 버리고 `END_EXPLANATION_UNUSED`로만 저장한다 (`:166-168`). |
| 프롬프트 | (2026-10-28, D-0184) 기본값은 레이아웃 v1 지시문 `END_EXPLANATION_LAYOUT_V1_INSTRUCTIONS`(정답·오답 공통 한 벌, `PP/feedback-end-explanation.ts:37-74`). `OpenAIFeedbackEvaluator`의 `endLayout` 옵션 기본값이 `'layout-v1'`이다 (`PP/feedback-evaluator.ts:95`, `:135-139`). 구성: `[말투와 금지]`, `[풀어 쓰기]`(`:42-43`), `[칸과 화면]`, `[재료]`, `[firstChoice·reselection — sections의 type별 순서]`(ERROR 5단계, GAP, UNVERIFIABLE), `[answer — 정답 칸]`. ERROR 2단계에는 오류의 `asked`가 true이면 짐작한 지점을 아까 내 질문으로 물어봤다는 것을 한 문장으로 잇는 규칙이 있다 (`:57`). 말투는 친근한 반말이다 (D-0116). 옛 지시문 두 벌은 `endLayout: 'v5.3'` 재현용으로만 남아 있다: `INCORRECT_END_INSTRUCTIONS`(`:3-14`, 마지막 선택이 오답), `CORRECT_END_INSTRUCTIONS`(`:16-35`, 정답). v5.3 선택은 `correct ? CORRECT : INCORRECT` (`PP/feedback-evaluator.ts:139`). |
| 목적 | 판정은 바꾸지 않고 학생에게 보일 마지막 설명을 `firstChoice`·`reselection`·`answer` 세 칸으로 쓴다. 각 칸 앞뒤 안내 문장과 칸 첫 문장은 코드가 붙이고 모델은 되풀이하지 않는다 (지시문 `:45-46`). 판정기가 M1에서 쓴 진단(`reason`, `judgmentNote`)이 칸마다 들어가므로 무엇이 맞고 틀리거나 빠졌는지는 그 메모에서 가져온다 (`[재료]`). 정답 선택이지만 근거 미확인(GAP·UNVERIFIABLE)이면 학생 생각을 틀렸다고 단정하지 않는다 (D-0159). 내부 용어('교정 질문' 등)·식별자 금지 (`[말투와 금지]`). |
| 모델 | 마지막 선택이 정답이면 `gpt-6-luna`, 오답이면 `gpt-6.1-sol` (`PP/feedback-evaluator.ts:101`; D-0107). 선택 이력이 오답→정답이면 정답 세션(luna) (D-0112 3번 항목). |
| 입력 | `feedbackEndExplanationContent(s, { layout })` (`PP/feedback-end-explanation.ts:177-215`): `source`(`stemPolarity` 제외, 미디어 URL 제거; 정답·공식 해설 포함), `studentUtterances[]`(SELECT·RATIONALE·CORRECT 발화의 `observationId`, `text`, 교정이면 `question`·`errorId`, 선택이면 `selectedChoice` 위치 번호, `rationaleOmitted`), `finalSelectedChoice`(번호), `errors`(errorId·errorType·description·question·status·basis, 레이아웃 v1이면 `asked`도, `:194`), `additionalErrors`, `readings`(CORRECT_UNVERIFIED일 때만), `reselectionReadingErrors`, `lastRepairAssessment`, `endReason`, `sectionLeads{firstChoice, reselection}`(코드가 만든 첫 문장; `feedbackSectionLead` `:92-114`), 레이아웃 v1이면 `sections{firstChoice, reselection}`. `sections` 각 칸은 서버가 정한 `type`(ERROR·GAP·UNVERIFIABLE), `correctChoice`, `conclusionOnly`, `repair`(REPAIRED·NOT_REPAIRED·NOT_ASKED), 판정기 진단 `diagnosis`(M1 `reason`)·`judgmentNote`를 가진다 (`endSection` `:155-175`). 옛 `v5.3` 입력에는 `sections`와 `asked`가 없고 `insufficiencyKind`·`insufficiencyCase`가 있다 (`:196-199`). 이미지도 같이 보낸다 (`:210-213`). 버튼 명령은 학생 발화로 넣지 않는다 (`:186`). |
| 출력 | 스키마 `FeedbackEndExplanationSchema` (`PP/feedback.ts:213`): `{ firstChoice, reselection(nullable), answer }`. |
| 코드 검증 | `applyFeedbackEndExplanation` (`PP/feedback.ts:214-233`): 스키마 파싱, `reselection` 유무와 선택 횟수(2회) 일치(`:216`), 칸이 화면에 붙는 첫 문장('②를 고른 건 맞아…')을 되풀이하면 거부(`:217-220`), 세 칸 모두 `validateFeedbackCoaching`(한글 4자 이상·깨진 문자 없음, `:182-191`), 내부 식별자 정규식(`C1`/`E1` 꼴) 금지, '교정 질문' 문구 금지(`:221-226`). 평가기 안에서 한 번 시험 적용한다 (`PP/feedback-evaluator.ts:140`). 서버는 생성 때 스냅샷에도 한 번, 현재 세션에도 한 번 적용한다 (`PA/server/problem-feedback.ts:165`, `:169`). |
| 실패 시 | 3.2의 재시도(검증 실패 문구가 `validationFeedback`으로 붙음, `PP/feedback-evaluator.ts:137`). 소진되면 `EVALUATION_FAILED` 저장. 게이트 단계의 백그라운드 실패는 화면에 표시되지 않으며 학생이 [응]을 누를 때 다시 생성한다 (`PA/server/problem-feedback.ts:184`의 주석). [설명 보기] 경로의 실패는 `RETRYABLE_ERROR`이고 RESUME으로 재시도한다 (`:133-136`). |
| 화면 반영 | 설명이 들어오면 `AWAITING_UNDERSTANDING`에서 말풍선으로 풀어 보인다: 첫 칸 안내 → 첫 칸 본문(첫 문장 `feedbackSectionLead` + 모델 본문 + 고정 마무리 문장 `feedbackSectionClosing`, `PP/feedback-end-explanation.ts:92-136`) → (재선택이 있으면 같은 구조) → 정답 안내 → 정답 칸 → '이해됐어?' (`PA/server/problem-feedback.ts:240-249`). [응]을 누르고 실제로 기다린 경우에만 설명 앞에 마무리 말풍선이 붙는다 (`:171-173`). 구간 사이는 학생이 [다음으로 넘어가기]를 누른다 (`PA/client/problem-composer-state.ts:47-50`). D-0117. |

### 3.7 (없앰) M5 — COACHING

v5.1 정리(2026-10-26, D-0177)에서 없앴다. M1·M3 판정 출력에 `coaching` 칸이 없어 다시 쓸 문자열이 없다. 옛 동작은 이 문서의 2026-10-25 판(git 기록)에 있다.

### 3.8 N1 — 모델 없이 코드만으로 움직이는 전이

다음은 모델을 부르지 않고 `submitFeedbackCommand`가 바로 상태를 정한다 (`PP/feedback.ts:240-292`).

| 명령·상황 | 결과 | 근거 |
|---|---|---|
| 정답 + 근거 미제출(OMITTED) | `UNVERIFIED_CORRECT`로 종료. 메시지 '정답이야. 근거를 안 적어서 …' | `PP/feedback.ts:265-266`, `:192-194` |
| 오답 + 근거 미제출, 2번째 선택 | `endExplanation(RESELECTION_WRONG)` → 게이트 | `:264` |
| 오답 + 근거 미제출, 1번째 선택 | `AWAITING_RATIONALE`(근거 보완 요청) | `:265`, `:267-269` |
| `AWAITING_RATIONALE`에서 [근거 미제출] | 오답이므로 `endExplanation(RATIONALE_UNVERIFIABLE)` | `:276`, `:192-196` |
| [다시 선택] | `AWAITING_RESELECTION`, 입력 영역에서 방금 고른 선지는 비활성 | `:286-287`, `PA/client/problem-composer-state.ts:66` |
| [마치기] | `finish(repairedOutcome)` → 종료. 근거 충분이면 VERIFIED, 아니면 UNVERIFIED | `PP/feedback.ts:284-285`, `:234-237` |
| 게이트 [아니] | 종료 | `:253` |
| 게이트 [응] + 이미 설명 있음 | `AWAITING_UNDERSTANDING` | `:255` |
| 설명 끝 [응]/[아니] | 종료, 이해 자기 보고 기록 | `:249-251` |
| `boundary≠NONE` | `ITEM_REVIEW`(자료 검토 대상). 학생 오류·정답 공개 없음. 화면은 '학생의 오류로 처리하지 않습니다' 안내 | `:428-432`, `PA/client/problem-composer-state.ts:58` |

종료 메시지·정답 공개: `COACHING_TERMINATED`이면 `answerRevealed`와 정답 카드 정보를 결과에 넣는다 (`PP/feedback.ts:167`, `:175`, `:177`). 오답 종료의 게이트 말풍선에는 서버가 `정답은 N번이야.`를 넣는다 (`PA/server/problem-feedback.ts:238`). 화면은 `result.answerRevealed`일 때 정답 카드를 그린다 (`PA/client/ProblemLabApp.tsx:284`).

### 3.9 N2 — 출제자 전략 (모델 호출 없음)

| 항목 | 내용 |
|---|---|
| 언제 | `phase === 'COMPLETED'`가 된 뒤, 화면이 `GET …/examiner-strategy`를 한 번 부른다 (`PA/client/ProblemLabApp.tsx:101-107`). |
| 자료 | 서버 시작 때 `docs/experiments/examiner-strategy-2026-10-23/FINAL.json`(또는 `EXAMINER_STRATEGY_PATH`)을 읽어 `Map`으로 만든다. 항목은 `passageId`, `question`, `choice`, `text` 필드를 가지며 키는 `<passageId>-q<question>`이다. `text`는 빈 줄로 문단을 나눈다 (`PA/server/examiner-strategy.ts:5-8`, `:11-23`). 파일이 없거나 형식이 틀리면 경고를 한 번 남기고 기능을 끈다 (`:24-27`). FINAL.json 머리 정보(직접 열어 확인): `version 1`, `prompt: PROMPT-v4.md`, `model: gpt-6.1-sol`, `items` 57개. |
| 생성 지시문 | `docs/experiments/examiner-strategy-2026-10-23/PROMPT-v4.md`. 글을 미리 생성한 지시문이며 런타임에는 쓰지 않는다. 모델 호출 코드는 `examiner-strategy.ts`·`index.ts`의 전략 라우트에 없다 (`PA/server/examiner-strategy.ts:1-41`, `PA/server/index.ts:234-246`). 결정: D-0170 ('미리 만든 고정 글, 세션 종료 뒤'). |
| 응답 | 세션이 `COMPLETED`이고 해당 문항의 전략이 있으면 `{ available: true, stemPolarity, firstPosition, choices[{position, paragraphs}] }`, 아니면 `{ available: false }` (`PA/server/examiner-strategy.ts:34-41`). `stemPolarity`는 발문에 '않은 것'/'않는 것'이 있으면 `SELECT_INCORRECT` (`:32`). `firstPosition`은 학생의 최종 선택 번호가 전략이 있는 선지면 그 번호, 아니면 첫 전략 선지 (`:37-39`). |
| 화면 입구 | 2026-10-28(메모 38·43)부터 [전략 보기] 버튼은 없다. 전략 단계(COMPLETED이고 전략 있음)의 버튼 줄은 늘 `[다시 풀기] [다음]`이고 주 버튼 [다음]이 맨 오른쪽이다 (`PA/client/problem-composer-state.ts:52-54`). 선지를 누르기 전(INTRO)과 한 선지가 끝난 뒤(ENDED)에는 [다음]이 비활성, 읽는 중(READING)에만 활성이다 (`:54`). 학생은 문제 칸의 전략이 있는 선지를 직접 눌러 전략을 연다 (`PA/client/ProblemLabApp.tsx:225-229`, `:243-245`). 단계는 `INTRO → READING → ENDED`이고 [다음]이 문단을 한 개씩 더 보인다 (`PA/client/examiner-strategy-state.ts:4`, `:33-36`, `:28-32`; `PA/client/ProblemLabApp.tsx:298`). 선지는 이미 본 것을 '봤음', 읽는 중을 '전략 보는 중'으로 표시한다 (`PA/client/ProblemLabApp.tsx:237`). 읽는 중 다른 선지를 누르면 그 선지로 바뀌고, 같은 선지를 다시 열면 처음부터 다시 시작하며 앞 말풍선은 남는다 (`PA/client/examiner-strategy-state.ts:23-27`). |
| 지문 칠하기 | 전략 말풍선이 나올 때마다 가장 최근에 나온 전략 말풍선 글의 ‘…’ 인용 중 지문에 정확히 한 번 나오는 것만 지문 칸에서 칠하고 그곳으로 스크롤한다. 공백 연속은 한 칸으로 보고 인용 끝의 `.`·`,`는 뗀다. 두 번 이상 나오거나 지문에 없는 인용(선지·<보기> 인용)은 칠하지 않는다 (`PA/client/examiner-strategy-state.ts:62-79`; 연결 `PA/client/ProblemLabApp.tsx:165-168`, 스크롤 `:150-162`). 읽는 중에는 교정 질문용 칠하기 대신 전략 칠하기만 보인다. 모바일 좁은 화면에서는 탭을 바꾸지 않는다 (docs/handoffs/2026-10-28-strategy-entry-and-highlight.md 결과). |
| 사용 기록 | 선지를 열 때마다 `POST …/examiner-strategy/view {position}`. 서버는 볼 수 있는 선지인지 검사하고(`PA/server/index.ts:239-240`), `{savedAt, sessionId, questionId, position, first}`를 기록한다 (`:243`). 실패해도 화면은 막지 않는다 (`PA/client/ProblemLabApp.tsx:228`). |

## 4. 저장 기록

| 기록 | 경로 | 내용 | 근거 |
|---|---|---|---|
| 문제 풀이 이벤트 | `.omc/logs/problem-feedback-v4/events.jsonl` (환경변수 `CSAT_PROBLEM_FEEDBACK_LOG`, 옛 `CSAT_PROBLEM_FEEDBACK_V4_LOG`로 바꿀 수 있음). 한 줄 JSON. | `FeedbackRecord`: `schemaVersion`, `savedAt`, `evidenceContext:'DEVELOPER'`, `transitionId`, `event`, `session`(정답 키 포함 전체 세션 스냅샷), `transcript`(마무리 말풍선은 `kind: 'WAIT_DONE'`), `call`(`rawOutput` + 메타 `provider/model/promptVersion/durationMs/토큰/attempts[]`; SELECTION 시도에는 `normalized`), `error` | `PA/server/session.ts:36-41`, `PA/server/problem-feedback.ts:19-30`, `:190-193` |
| 이벤트 종류 | `STARTED`(세션 시작), `SUBMITTED`(접수한 제출; 모델 호출 전), `EVALUATED`(모델 결과 적용 뒤), `EVALUATION_FAILED`(재시도 소진), `END_EXPLANATION_UNUSED`(생성이 끝났을 때 학생이 이미 종료) | `PA/server/problem-feedback.ts:25`, `:56`, `:108`, `:145`, `:152`, `:167`, `:174`, `:180` |
| 출제자 전략 사용 | `.omc/logs/problem-feedback-v4/examiner-strategy.jsonl` (`CSAT_EXAMINER_STRATEGY_LOG`) | `savedAt`, `sessionId`, `questionId`, `position`, `first` | `PA/server/session.ts:48-54`, `PA/server/index.ts:243` |
| 브라우저 | `sessionStorage`: `csat.problem.lab.<questionId>.<returnTo>`(세션 ID), `csat.problem.lab.draft.<sessionId>`, `csat.problem.lab.pending.<sessionId>` | 새로 고침 뒤 세션 복구, 초안, 미완료 제출 | `PA/client/ProblemLabApp.tsx:27`, `:54`, `:75-82`, `:191` |
| 서버 메모리 | `ProblemFeedbackController.sessions` | 진행 중 세션(재시작하면 사라짐) | `PA/server/problem-feedback.ts:43` |

원 오류 문구는 학생에게 주지 않고 기록에만 남는다 (`PA/server/problem-feedback.ts:260-261`).
문항 자료는 `packages/pipeline/fixtures/experiments/problem-solving/public/<questionId>.json`과 `source-direct-runtime-v1.json`에서 읽는다 (`PA/server/content.ts:35-42`, `:140-141`).

## 5. 근거 결정 목록

번호와 한 줄 요지는 `memory/decisions/` 각 파일의 제목·결정 절에서 읽은 것이다. 코드 줄 대응은 본문에 있다.

| 결정 | 한 줄 요지 |
|---|---|
| D-0173 | 개발자 문제 풀이 경로의 코드 이름에서 버전을 빼고 주소를 `/problem/lab`으로, 저장 값은 유지 |
| D-0090 | 문제 풀이 판정기 운영 후보를 v5로 부름 |
| D-0104 | 판정 모델을 선택 정오로 라우팅(정답 luna, 오답 sol) |
| D-0105 | 교정 질문은 선지 정오를 가르는 관계까지 한 질문으로 다룸 |
| D-0106 | 교정 성공 뒤 학생이 [다시 선택] 또는 [코칭 보기]를 고름 |
| D-0107 | 세션 안 모델 배정: 선택은 정오로, REPAIR는 luna, 코칭·설명은 세션 모델 |
| D-0108 | 교정 판정은 질문이 겨냥한 국소 오류만 봄 |
| D-0110 | 정답 세션 종료 설명은 별도 지시문으로 생성(말투는 D-0116이 반말로 대체) |
| D-0112 | v5 개발자 경로 연결: 종료 상태와 종료 설명 호출 범위 |
| D-0116 | 학생 대면 어조는 반말(제목 기준) |
| D-0117 | 종료 코칭을 구간별로 순차 표시(제목 기준) |
| D-0156 | 한 제출 안의 진술이 서로 모순되면 판정 불가(`claimConflicts`) |
| D-0157 | 교정 뒤 근거 충분은 핵심 관계를 혼자 담은 학생 발화 하나로만 인정(`sufficiencyEvidence`) |
| D-0159 | 정답·근거 미확인에서 판단 방식이 부족의 까닭이면 그 방식을 인정하지 않음(`insufficiencyKind`) |
| D-0161 | 정답 선택의 '근거 충분'은 핵심 관계의 모든 조각을 말했을 때만(`keyRelationCoverage`). D-0182가 대체했고 코드에 `keyRelationCoverage`는 이제 없다 |
| D-0164 | 선택 충돌 항목의 학생 인용은 충분성 인용 금지 대상에서 뺌 |
| D-0166 | '원문에 없음' 근거는 선지가 원문 사실로 반박되는지로 가름(프롬프트 `:314`의 sourceCheck 규칙 등에 반영) |
| D-0170 | 선택형 출제자 전략 피드백: 미리 만든 고정 글, 세션 종료 뒤 |
| D-0172 | 선지는 가운데 문제 칸에서 직접 눌러 고름 |
| D-0177 | 판정 v5.1: 학생에게 안 보이던 `coaching` 칸과 M5 없앰 |
| D-0178 | 부분 반박 판정(v5.2)은 채택하지 않고 보관(상태 rejected). 이후 재설계가 v5.3이 됨 |
| D-0182 | 판정 운영 후보를 v5.3(재구성 세 칸, 서버 결론 확정)으로 바꿈. D-0161 대체 |
| D-0184 | 마지막 설명(M4) 기본값을 칸 유형 레이아웃 v1(판정기 진단 글 + 유형별 순서)로 바꿈 |
| D-0185 | 판정 지시문 v5.6: 선지 읽기 차이를 '덧붙인 내용 대 세기'로 가르고, 오답 READING 오류의 판정은 서버가 ERROR로 맞춤 |

## 6. 확인 필요 → 대조 결과 (2026-10-25)

작성 때 '확인 필요'로 적은 9건을 코드·결정 기록과 대조했다(사용자 승인 "권고대로 진행해", 2026-10-25).
처리: **해소**(기록끼리 충돌 아님), **사실 기록**(의도된 동작 또는 도달 불가, 변경 없음), **수정**(코드 변경, 인계 `docs/handoffs/2026-10-25-lab-flow-check-items.md`), **남김**(별도 과제).
아래 표의 본문은 2026-10-25 당시 기록이다. 코드 줄 번호는 2026-10-28 기준으로 고쳤고, 프롬프트 줄 번호는 현재 v5.6 파일 기준이다.

| # | 내용 | 처리 | 근거·결과 |
|---|---|---|---|
| 1 | M1·M3의 `coaching` 필드는 만들어지지만 학생에게 보이지 않는다. 형식 검증 실패 시 COACHING 재요청이 일어나고, 한도를 넘으면 판정 전체가 실패한다. 프롬프트 251-254행("서버는 모든 정상 코칭 종료에 정답과 해설을 덧붙인다")은 현재 동작과 다르다. | **수정** | 2026-10-26 v5.1(D-0177): 스키마·지시문에서 `coaching` 제거, M5 없앰. 18세션 회귀로 역할별 최종 결과 유지 확인(`docs/experiments/v5-diverse-48-regression-2026-10-26/`). |
| 2 | D-0107의 "COACHING 요청 종류 활용" | **해소** | D-0107은 "활용할 수 있음"이라는 선택지만 적었다. 실제 구현은 D-0112 2·4항과 D-0117이 정한 별도 종료 설명(`END_EXPLANATION`)이다. (당시 `COACHING` kind는 코칭 문자열 검증 실패 재시도용으로 남아 있었으나 v5.1에서 그 kind도 없어졌다.) |
| 3 | D-0112 5항(정답 줄 제거)과 게이트의 `정답은 N번이야.` | **해소** | D-0112 5항이 뺀 것은 종료 메시지(`finish()`)에 서버가 덧붙이던 줄이다(`PP/feedback.ts:170` 주석). 게이트 문장은 D-0117 3항·7항이 정한 시작 확인 문장("정답은 ⑤번이야. 네 답을 하나씩 같이 볼까?")이다. |
| 4 | D-0112 4항의 파일 이름 `feedback-v5-end-explanation.ts` | **해소** | D-0173 이름 정리로 `PP/feedback-end-explanation.ts`가 됐다. 결정 기록은 당시 기록으로 둔다. |
| 5 | D-0172·`CURRENT_STATE.md`의 `/problem/dev/v4` | **해소** | `CURRENT_STATE.md`는 D-0173 커밋에서 이미 `/problem/lab`(옛 주소 넘김)으로 고쳐졌다. D-0172는 당시 기록이다. |
| 6 | 프롬프트 제목 "v3 기반 v4 연결 후보"와 `promptVersion: problem-feedback-v5` | **수정** | 새 파일 `source-direct-problem-feedback-v5.1.md`, 제목 "문제 풀이 판정 v5.1", `promptVersion: problem-feedback-v5.1`(D-0177). 이후 현재는 v5.6 (1.3). |
| 7 | 평가 루프의 두 번째 반복 | **수정** | `applyFeedbackAssessment`(`PP/feedback.ts:424-483`)에는 `AWAITING_EVALUATION`을 돌려주는 경로가 없다. 이 단계를 만드는 `endExplanation(COACHING_REQUESTED)`(`:205`)는 학생 명령(`REQUEST_EXPLANATION`)에서만 불린다. 그래서 `for`의 두 번째 반복은 돌지 않는다. 동작에는 영향이 없고, 정리는 1번 과제 때 한다. 2026-10-26: 반복을 없애고 한 번 실행으로 정리(동작 동일, D-0177). |
| 8 | 화면의 `선택 N / 2` 하드코딩 | **수정** | 화면이 `view.maxSelections`를 쓴다(`PA/client/ProblemLabApp.tsx:262`). |
| 9 | 교정 질문·오류 목록의 숫자 상한 | **사실 기록** | 숫자 상한은 설계상 없다. 지시문이 "확인된 내용 오류를 모두 기록"하라고 하고(프롬프트 `:174`), CONTRADICTED 주장마다 오류를 하나씩, OFF_TARGET은 TARGET 오류 하나로 묶는다(`:316`). 질문 수는 첫 선택의 오류 수와 같다(2.4). |
