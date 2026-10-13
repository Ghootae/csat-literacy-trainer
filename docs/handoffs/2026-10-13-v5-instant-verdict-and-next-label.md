# 인계: 제출 즉시 정답 여부 알림 · 판단 불가 안내 위치 · 설명 칸 넘김 문구 (UI 메모장 13~15번)

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex
- 관련 결정: `memory/decisions/D-0117-end-coaching-sectioned-sequence.md` 7항, UI 메모장 `docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`의 "13~15번 상세"
- 선행 인계(모두 구현 완료):
  - `2026-10-13-v5-end-coaching-sequence.md`
  - `2026-10-13-v5-direct-questions-highlight-unverifiable-note.md`
- 대상: 개발자 v4 경로만.

## 목표

1. **(14번)** 학생이 근거와 함께 선지를 내면, 판정을 기다리기 전에 코드가 정답 여부를 바로 알린다. 정답 번호는 넣지 않는다.
   - 오답: "정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게."
   - 정답: "정답이야! 근거도 같이 살펴볼게."
   - 0.8초 뒤 다음 말풍선에 생각 중이 나오고, 판정은 뒤에서 이어 한다.
2. **(15번)** 판단 불가 안내는 판정 직후 시작 확인 앞에 나온다. [응] 뒤에 나오지 않는다.
3. **(14번 중복 정리)** 판정 뒤 문구에서 정답 여부를 다시 말하지 않는다.
4. **(13번)** 선지 설명 칸 끝에 넘김 문장을 붙이고, 버튼 이름을 [다음으로 넘어가기]로 바꾼다.

## 범위 밖

- 판정·종료 지시문, 판정 규칙, 교정 질문.
- 학생용 v3, 지난 실험 실행기와 기록.
- 실제 API 호출, `.env`, 의존성 설치, 외부 네트워크, git 쓰기 명령. 루프백 테스트와 로컬 Playwright는 허용한다.

## 손댈 파일과 계약

### 1. 서버: 모든 평가를 접수 즉시 응답 — `packages/app/src/server/problem-feedback-v4.ts`

- `submit`은 명령을 적용하고 대화창·원장을 기록한 뒤 **평가를 기다리지 않고** 바로 뷰를 돌려준다.
  - 평가가 필요한 상태(`AWAITING_EVALUATION`)면 `evaluationStatus = 'PROCESSING'`으로 돌려주고, 평가는 백그라운드로 실행한다.
  - 대상은 SELECTION, REPAIR, COACHING_REQUESTED의 END_EXPLANATION, RESUME이다.
  - 평가 단계 루프(판정 → 시작 확인이면 종료 설명 백그라운드 생성)는 지금과 같다.
- 한 세션에 동시에 하나의 평가만 돈다(지금의 `busy`). 평가 중 새 제출은 지금처럼 거부한다.
- 같은 `transitionId` 재전송은 첫 응답과 같은 접수 뷰를 돌려준다(지금의 멱등 규칙 유지).
- 백그라운드 평가의 promise는 처리되지 않은 rejection이 없도록 끝까지 처리한다. 지금 `generateEnd`의 `.catch(() => false)`와 같은 방식이다. 원장 저장 실패도 포함한다.
- 실패하면 지금처럼 `RETRYABLE_ERROR` → RESUME이다.
- 화면은 이미 PROCESSING 동안 1.5초 간격으로 조회한다. 조회 계약은 바꾸지 않는다.

### 2. 처음 메시지(14번)

- `SELECT` 명령에 근거가 있고(`rationale.mode === 'PROVIDED'`) 평가로 넘어갈 때, 학생 항목 다음에 COACH 항목 하나를 넣는다.
  - `sequence: 'INSTANT'`(공유 타입에 값 추가).
  - 문구는 고른 선지가 정답이면 "정답이야! 근거도 같이 살펴볼게.", 아니면 "정답이 아니야. 어디서 생각이 달라졌는지 살펴볼게."다.
  - 첫 선택과 재선택 모두 같다.
- 근거 미제출 `SELECT`, `RATIONALE`(근거 보완), `CORRECT`, 버튼 명령에는 넣지 않는다.
  - 근거 미제출이면 지금 한 줄 문구가 바로 나온다.
  - 근거 보완은 이미 "정답이 아니야…" 안내를 받은 뒤다.
- 정답 여부는 서버가 정한다. 화면은 정답을 모른다.

### 3. 판정 뒤 문구 정리 — `packages/pipeline/src/problem-solving/feedback-v4.ts`, 서버 `appendCoach`

| 위치 | 지금 | 바꿀 문구 |
|---|---|---|
| 정답·근거 정확(`VERIFIED_CORRECT`, SELECTION 판정, 419행 부근) | 정답이야. 근거도 정확해. | 근거도 정확해. 잘 풀었어. |
| 정답 시작 확인 | GATE "정답이야." + "네 근거를 하나씩 같이 볼까?" | "네 근거를 하나씩 같이 볼까?"만(앞 줄 삭제) |
| 오답 시작 확인 | GATE "정답은 ⑤번이야." + "네 답을 하나씩 같이 볼까?" | 그대로(번호는 여기서 처음 알림) |
| 정답·근거 미제출 한 줄 | 정답이야. 근거를 안 적어서 … | 그대로(처음 메시지가 없는 경우) |
| 오답·근거 미제출 안내 | 정답이 아니야. 근거 없이 고른 오답은 감점돼 … | 그대로 |

- 세션 `message`(195행 부근)도 위 시작 확인 문구에 맞춘다.
- [마치기]의 "잘 고쳤어. 근거도 정확해." 등 교정 뒤 문구는 바꾸지 않는다.

### 4. 판단 불가 안내 위치(15번) — 서버 `appendCoach`

- 지금은 `AWAITING_UNDERSTANDING` 첫 `CONNECTOR` 앞에 있는 판단 불가 안내 항목(조건·문장 그대로)을 **`AWAITING_END_START`의 시작 확인 항목들 앞**으로 옮긴다. `sequence: 'GATE'`다.
- 순서:
  - 오답: [안내] → "정답은 ⑤번이야." → "네 답을 하나씩 같이 볼까?"
  - 정답: [안내] → "네 근거를 하나씩 같이 볼까?"
  - 안내 조건에 해당하지 않으면 안내 없이 지금 순서다.
- [응] 뒤 `AWAITING_UNDERSTANDING`에는 더 이상 안내를 넣지 않는다.
- COACHING_REQUESTED(시작 확인 없음)는 안내 조건에 해당하지 않으므로 영향이 없다.

### 5. 설명 칸 넘김 문구(13번)

- 서버가 `AWAITING_UNDERSTANDING` 항목을 만들 때, `firstChoice`와 `reselection` SECTION의 본문 끝에 빈 줄 하나와 "설명이 이해됐으면 다음으로 넘어가 보자."를 덧붙인다(같은 말풍선).
  - answer SECTION에는 붙이지 않는다.
  - 세션의 `endExplanation` 원문(모델 출력)은 바꾸지 않는다. 공개 대화창 항목에만 붙인다.
- 화면 `v4-composer-state.ts`의 NEXT 버튼 이름을 '다음' → '다음으로 넘어가기'로 바꾼다.

### 6. 화면 — `ProblemFeedbackV4App.tsx`, `v4-composer-state.ts`

- `INSTANT` 항목은 바로 보인다(공개 시간차 없음).
- 기다림 말풍선은 `INSTANT` 항목이 보인 뒤 0.8초 지나서 나타난다. 움직임 줄이기 설정이면 바로 나타난다.
- 기다림 kind와 문구 규칙은 그대로다(SELECT → ANSWER).
- 제출 직후 응답이 PROCESSING이면, 지금처럼 전송 확인 말풍선·잠금·조회를 유지한다. 결과가 오면 대화창과 입력 영역이 갱신된다.
- 입력 영역 네 줄 고정, 공개 순서 규칙(GATE/CONNECTOR/SECTION/QUESTION/CLOSING)은 그대로 둔다.

### 7. 테스트

- 서버(`problem-feedback-v4.test.ts`):
  - 제출 응답이 평가를 기다리지 않음(모의 평가기가 끝나기 전에 PROCESSING 뷰 반환). 평가 완료 뒤 조회하면 결과가 반영된다.
  - 근거 있는 첫 선택·재선택에서 정답/오답 `INSTANT` 문구. 근거 미제출·근거 보완·교정 답에는 없음.
  - 판단 불가 안내가 GATE 앞에 있고 [응] 뒤에는 없음. 정답 시작 확인에 "정답이야." 줄이 없음.
  - VERIFIED_CORRECT 문구. 설명 칸 넘김 문장(answer 칸 제외)과 원문 보존.
  - 멱등 재전송, 평가 중 제출 거부, 백그라운드 실패 → RETRYABLE_ERROR → RESUME.
- 상태 머신(`feedback-v4.test.ts`): 바뀐 문구 기대값.
- 화면(`v4-composer-state.test.ts`): 버튼 이름, INSTANT 뒤 기다림 지연 계산(순수 함수로 두는 경우).
- e2e: 제출 직후 처음 메시지가 보이고 이어 생각 중이 나옴. 오답·판단 불가 흐름에서 안내 → 시작 확인 순서. [다음으로 넘어가기]. 입력 영역 높이 불변.
- 지난 실험 실행기 테스트는 실행해서 결과만 보고한다.

## 완료 조건

- [ ] 위 계약대로 동작하고 문구가 글자 그대로다.
- [ ] 제출 응답이 평가를 기다리지 않고, 처리되지 않은 rejection이 없다.
- [ ] `npx --no-install vitest run packages/pipeline/src/problem-solving packages/app/src/server/problem-feedback-v4.test.ts packages/app/src/server/problem-feedback-v4-http.test.ts packages/app/src/client` 전부 통과(현재 442 + 새 테스트).
- [ ] `npm run build`, `npm run typecheck:client` 통과. e2e 통과(실행 불가면 사유).
- [ ] 변경 파일이 이 문서에 적은 파일과 그 테스트, 공유 타입뿐이다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈춘다. 충돌 내용과 선택지를 보고하고, 설계를 임의로 바꾸지 않는다.
  예: HTTP 테스트·멱등 계약이 동기 응답을 전제함, 화면 복구 로직이 접수 응답을 완료로 오인함.
- 외부 API 호출·외부 전송·의존성 설치가 필요해지면 실행 전 멈춘다.

## 보완 (2026-10-13, Claude — 코덱스 1차 중단 보고에 대한 답)

- 선택지 1로 정한다. 즉시 응답이 이번 인계의 목표이므로, 동기 응답을 전제한 기존 테스트의 기대를 새 접수 계약으로 바꾼다.
  - 대상: `problem-feedback-v4-http.test.ts` 83–95행 부근, `problem-feedback-v4.test.ts` 36–43·69–74행 부근, 같은 전제를 쓰는 다른 테스트.
  - 제출 응답에서는 접수 상태(PROCESSING, 학생·INSTANT 항목 포함)를 확인한다.
  - 평가 완료 상태는 조회(`get`)나 테스트 도우미(예: 백그라운드 평가 promise를 기다리는 함수, 또는 조회 반복)로 확인한다.
  - 각 테스트가 확인하던 흐름과 최종 상태 기대값은 그대로 둔다.
- 멱등 규칙: 같은 `transitionId` 재전송은 **최초 접수 뷰**를 돌려준다(평가 완료 뷰가 아님). 단 이미 평가가 끝났다면 현재 뷰를 돌려줘도 된다. 어느 쪽이든 같은 명령을 두 번 적용하지 않고 평가를 두 번 실행하지 않는다.
- 테스트에서 백그라운드 평가를 기다리기 위한 내부 도우미(예: `controller.settled(sessionId)`)를 컨트롤러에 더해도 된다. HTTP 공개 API에는 노출하지 않는다.

## 1차 실행 보고 (보존)

- 변경 파일: 이 인계 문서의 "결과 보고" 절만 수정. 구현·테스트 파일 변경 0개.
- 테스트 결과: 실행 0건. 충돌 확인 단계에서 중단하여 테스트·빌드·e2e를 실행하지 않음.
- 남은 문제: 인계 문서의 중단 예시인 "HTTP 테스트·멱등 계약이 동기 응답을 전제함"에 해당하는 충돌을 확인함.
  - `packages/app/src/server/problem-feedback-v4-http.test.ts:83`~95는 SELECT/CORRECT 제출 응답 직후 각각 AWAITING_CORRECTION/AWAITING_POST_REPAIR_CHOICE/VERIFIED_CORRECT를 기대하고, 마지막 조회 결과가 제출 응답과 같다고 검사함. 새 계약은 평가 전 PROCESSING 접수 뷰를 반환해야 함.
  - `packages/app/src/server/problem-feedback-v4.ts:105`~107은 평가 완료 promise를 멱등 응답으로 보관함. `packages/app/src/server/problem-feedback-v4.test.ts:36`~43 및 69~74도 제출 응답을 완료 상태로 사용함. 새 계약은 같은 transitionId에 최초 접수 뷰를 반환해야 함.
  - 선택지 1: 위 테스트의 동기 응답 기대를 새 접수 계약으로 바꾸고, 평가 완료 상태는 조회·대기로 확인하도록 인계에서 명시한 뒤 구현을 재개함.
  - 선택지 2: 기존 동기 응답 계약을 유지하도록 인계의 즉시 응답·멱등 요구를 수정함. 이 경우 현재 목표의 즉시 알림 흐름은 재설계가 필요함.
  - 설계 선택을 임의로 하지 않았으며, 실제 API 호출·.env 열기·의존성 설치·외부 네트워크·git 쓰기 명령은 수행하지 않음.

## 보완 2 (2026-10-13, Claude — 코덱스 2차 중단 보고에 대한 답)

- 선택지 1로 정한다. 초기 복구(`ProblemFeedbackV4App.tsx` 69–70행 부근)도 일반 갱신과 같이, 서버 `evaluationStatus === 'PROCESSING'`이면 저장된 pending 제출과 초안을 지우지 않는다.
  - 평가가 끝난 뒤(PROCESSING이 아님) revision이 앞서 있으면 지금처럼 지운다.
- 서버 대화창에는 접수 시점에 학생 항목이 이미 들어 있다. 그러니 복구 뒤 화면에 학생 말풍선이 두 번(서버 항목 + 전송 확인 말풍선) 보이지 않아야 한다. 지금의 `transcript.some(m => m.id === student-<transitionId>)` 중복 방지 규칙을 따른다.
- 테스트: 평가 중 새로고침해도 pending이 유지되고 평가 완료 뒤 정리되는 e2e를 하나 더한다. 순수 함수로 뺄 수 있으면 단위 테스트도 더한다.
- 1차 부분 구현은 이어서 쓴다. 이 보완과 1차 보완 절을 모두 따른다.

## 2차 실행 보고 (보존)

- 변경 파일(부분 구현, 검증 전):
  - `packages/app/src/server/problem-feedback-v4.ts`: 즉시 접수 응답·백그라운드 평가·내부 settled 도우미, INSTANT 항목, 판단 불가 안내 GATE 이동, 정답 시작 확인 중복 제거, 설명 칸 넘김 문장.
  - `packages/pipeline/src/problem-solving/feedback-v4.ts`: 정답 시작 확인·VERIFIED_CORRECT 문구.
  - `packages/app/src/shared/problem-feedback-v4.ts`: INSTANT 공유 타입.
  - `packages/app/src/client/v4-composer-state.ts`: NEXT 이름·INSTANT 즉시 공개·기다림 지연 함수.
  - `packages/app/src/client/ProblemFeedbackV4App.tsx`: INSTANT 뒤 기다림 말풍선 지연.
  - 이 인계 문서: 결과 보고 절만 작성.
- 테스트 결과: 테스트 0건, 빌드 0회, 클라이언트 타입 검사 0회, e2e 0건. 추가 충돌 발견으로 중단했으며, 부분 구현은 검증되지 않았다. 기존 테스트 기대값 변경과 새 테스트 추가는 아직 하지 않았다.
- 남은 문제:
  - 추가 충돌: `packages/app/src/client/ProblemFeedbackV4App.tsx:69`~70의 초기 복구 로직은 저장된 pending 요청과 서버 revision이 다르면 evaluationStatus가 PROCESSING이어도 pending·초안을 삭제한다. 즉시 접수 응답은 평가 완료 전에 revision을 올리므로, 평가 중 새로고침 시 접수를 완료로 취급해 전송 확인 말풍선이 사라질 수 있다. 같은 파일 79행의 일반 갱신 로직에는 PROCESSING 제외 조건이 있지만 초기 복구에는 없다.
  - 인계 문서의 중단 예시인 "화면 복구 로직이 접수 응답을 완료로 오인함"에 해당한다. 보완 절은 동기 응답 테스트·멱등 규칙을 정했으나 이 초기 복구 충돌은 다루지 않았다.
  - 선택지 1: 보완에서 초기 복구도 PROCESSING이면 pending 제출을 유지하도록 명시한다. 그 뒤 허용된 화면 파일에서 복구 조건을 수정하고 접수·완료 테스트 및 새로고침 e2e를 추가하여 구현을 이어 간다.
  - 선택지 2: 처리 중 새로고침에서는 pending·초안을 삭제하는 기존 복구 동작을 허용하도록 계약을 명시한다. 이 경우 처리 중 전송 확인 말풍선 유지 요구의 적용 범위도 정해야 한다.
  - 부분 구현과 테스트 보완·전체 검증이 남아 있다. 설계 선택을 임의로 하지 않았으며 실제 API 호출·.env 열기·의존성 설치·외부 네트워크·git 쓰기 명령은 수행하지 않았다.

## 결과 보고 (실행 후 작성)

- 경과:
  - 코덱스 3차 실행이 서비스 혼잡("Selected model is at capacity")으로 중간에 끊겼다. 4차도 같은 이유로 실패했다.
  - 사용자 승인(2026-10-13 "네가 진행해줘")으로 Claude가 남은 부분을 마무리했다. 독립 검토는 code-reviewer(sonnet)가 했다.
- 변경 파일:
  - 서버 `problem-feedback-v4.ts`(+테스트, HTTP 테스트)
  - 상태 머신 `feedback-v4.ts`(+테스트)
  - 공유 타입
  - 화면 `ProblemFeedbackV4App.tsx`, `v4-composer-state.ts`(+테스트)
  - e2e
- Claude가 직접 한 것:
  - e2e 기대 문구 1건을 고쳤다(기다림 말풍선 "네 근거를 읽고 있어").
  - e2e 시간 설정 2건을 고쳤다(느린 설명 9초, 기다림 15초).
  - 검토에서 나온 blocker를 고쳤다: RESUME이 다시 실패하면 pending이 남아 [같은 제출 다시 보내기]만 반복되고 재평가가 일어나지 않았다.
    - 수정: 접수된 RESUME은 바로 pending을 정리하고, 복구 때도 처리 중인 RESUME만 되살린다.
    - 재현 e2e 1개를 더했다.
  - 검토에서 나온 should-fix를 고쳤다: 재선택 INSTANT와 교정 답·버튼에 INSTANT가 없음을 검사하는 서버 테스트로 바꿨다. 같은 transitionId 재전송 때 평가가 한 번만 일어나는지도 검사한다.
- 테스트 결과:
  - vitest 447/447 통과.
  - build, `typecheck:client` 통과.
  - e2e 13/13 통과. 개발 서버와 분리된 5383/5384 포트에서 모의 평가기로 돌렸고, 실제 API 호출은 없다.
- 남은 문제(검토 minor, 미수정):
  - INSTANT 항목이 없는 응답에서는 대기 말풍선이 생략될 수 있다.
  - `evaluate()` 안의 `AWAITING_END_START` 분기는 도달하지 않는 죽은 분기다.
  - e2e가 0.8초 시간 창에 의존한다.
