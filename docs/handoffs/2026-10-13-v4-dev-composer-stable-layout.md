# 인계: 개발자 문제 화면 입력 영역 고정 · 기다림 말풍선 · 버튼 기록 정리

- 날짜: 2026-10-13
- 작성: Claude
- 실행: Codex
- 관련 결정: UI 메모장 `docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md`의 1·3·4·5번과 그 상세 절(사용자 확정 2026-10-13)
- 선행 작업: `docs/handoffs/2026-10-13-v5-tone-and-correct-unverified.md`(반말 문구, 구현 완료). 그 문구를 그대로 쓴다.
- 대상: 개발자 v4 화면(`/problem/dev/v4`)만.

## 목표

1. 입력 영역의 뼈대(안내 칸 · 선지 버튼 줄 · 입력칸 · 아래 버튼 줄)가 모든 단계에서 같은 자리와 크기로 늘 보인다.
   - 단계가 바뀌면 켜짐/꺼짐과 아래 버튼 줄의 내용만 바뀐다.
   - 요소를 넣거나 빼서 높이가 변하지 않는다(5번).
2. 기다리는 동안 대화창에 '생각 중' 말풍선이 보인다. 문구는 학생이 낸 것과 지난 시간에 따라 바뀐다(1번).
3. 버튼을 누른 기록과 [다시 선택] 뒤 서버 안내 문장이 대화창에 남지 않는다(4번).

## 범위 밖

- 판정·상태 전이 규칙, 판정·종료 지시문, 고정 문구의 내용(선행 인계로 끝남).
- 학생용 v3 화면, 지문·문제 영역(왼쪽·가운데 칸), 평가 서랍, 헤더.
- 코칭 나눠 보내기(6번), 교정 질문 방식(7·12번), 판단 불가 안내(2번).
- 실제 API 호출, `.env`, 의존성 설치, 외부 네트워크, git 쓰기 명령. 루프백 테스트와 로컬 Playwright는 허용한다.

## 손댈 파일과 계약

### 1. 서버 대화창 기록 — `packages/app/src/server/problem-feedback-v4.ts`

- **버튼 명령은 대화창에 넣지 않는다.** RESELECT·REQUEST_EXPLANATION·FINISH를 받으면 `transcript`에 STUDENT 항목을 넣지 않는다(지금 91–96행).
  - 세션 관찰 기록(`session.observations`)과 세션 원장 저장은 그대로 둔다. 원장의 `transcript` 필드는 공개 대화창과 같은 값이다.
- **[다시 선택] 뒤 안내 문장도 넣지 않는다.** `AWAITING_RESELECTION`으로 바뀐 뒤의 COACH 메시지("답과 근거를 한 번 더 내 줘. 이번이 마지막 선택이야.")는 `appendCoach`에서 넣지 않는다.
  - `session.message`는 상태 머신 값이므로 그대로 둔다.
- 그 밖의 대화창 항목(학생 글, 피드백, 교정 질문, 종료 설명)은 바꾸지 않는다.

### 2. 화면 — `packages/app/src/client/ProblemFeedbackV4App.tsx`, `problem-feedback-workbench.css`

입력 영역(`.v4-composer`)은 아래 네 줄로 고정한다. 단계와 관계없이 네 줄 모두 늘 렌더링한다.

1. **안내 칸:** 높이를 2줄로 고정하고, 비어 있어도 자리를 지킨다. `role="status"`, 오류는 `role="alert"`. 넘치면 칸 안에서 줄바꿈하고 높이는 그대로 둔다.
2. **선지 버튼 줄:** ①~⑤.
3. **입력칸:** textarea. 높이를 고정한다.
4. **아래 버튼 줄:** 왼쪽에 보조 체크, 오른쪽에 주 버튼들.

**단계별 상태** (`view.phase`, `evaluationStatus`, 화면 로컬 상태로 결정)

| 단계 | 선지 버튼 | 입력칸 | 아래 버튼 줄 |
|---|---|---|---|
| AWAITING_SELECTION | 켜짐 | 켜짐 | 체크 "정답만 입력" · [선택·근거 전송] |
| AWAITING_RATIONALE | 꺼짐, 고른 번호만 눌린 표시 | 켜짐 | 체크 "근거 미제출" · [근거 전송] |
| AWAITING_CORRECTION | 꺼짐, 고른 번호 표시 | 켜짐 | [답변 전송] |
| AWAITING_POST_REPAIR_CHOICE | 꺼짐 | 꺼짐 | `postRepairOptions` 순서대로 버튼([다시 선택] [코칭 보기] / [설명 보기] [마치기]) |
| AWAITING_RESELECTION | 켜짐. 첫 선택 번호(`view.selectedChoiceId`)는 회색이고 누를 수 없다. 이 단계에 들어오면 화면의 선택 번호 상태를 비운다 | 켜짐(비움) | 체크 "정답만 입력" · [선택·근거 전송] |
| 기다리는 중(`waiting`) 또는 전송 확인 중(`pending`) | 직전 단계 모양 그대로, 모두 꺼짐 | 꺼짐 | 직전 버튼 그대로, 모두 꺼짐 |
| RETRYABLE_ERROR | 꺼짐 | 꺼짐 | 주 버튼 자리에 [평가 다시 시도] |
| 전송 확인 실패(`pending && !waiting`) | 꺼짐 | 꺼짐 | 주 버튼 자리에 [같은 제출 다시 보내기] |
| COMPLETED | 꺼짐 | 꺼짐 | [같은 문제 다시 풀기] · "학습 맵으로 돌아가기 →" |
| ITEM_REVIEW | 꺼짐 | 꺼짐 | 비움(버튼 없음, 줄 높이 유지) |

- 꺼진 요소는 숨기지 않고 회색으로 보인다(`disabled`).
- 입력칸 레이블은 지금처럼 단계별 글자만 바뀐다.
- 대화창 아래에 따로 있던 완료 문구("이 문제 풀이는 여기까지야.")와 정답 카드는 대화창 안에 그대로 둔다. 입력 영역 밖이라 이번 범위가 아니다.

**안내 칸 문구** (한 번에 하나, 위가 우선)

1. 오류(빨강): `error` 상태 문구, `view.evaluationError`.
2. 안내(회색):
   - `ITEM_REVIEW`: "자료 검토가 필요한 문항입니다. 학생의 오류로 처리하지 않습니다."(문구는 바꾸지 않는다)
   - `AWAITING_CORRECTION`: "지금은 번호를 바꾸지 말고 질문에 답해 줘."
   - `AWAITING_RESELECTION`: "이번이 마지막 선택이야."
   - 선택 단계에서 "정답만 입력"을 체크했을 때: "틀리면 감점돼. 개발 버전에서는 실제로 깎지 않아."
   - `AWAITING_RESELECTION`에서 체크까지 했으면 감점 안내를 보인다.
3. 그 밖에는 빈 칸.

- 지금 입력 영역 위에 끼어들던 "네 답을 살펴보고 있어. 잠깐만 기다려 줘." 줄은 없앤다. 기다림은 대화창 말풍선이 맡는다.

**기다림 말풍선** (1번)

- `waiting`이거나 `pending`이면, 대화창 끝(학생의 전송 중 말풍선 다음)에 피드백 말풍선 하나를 둔다.
  - 문구와 점 세 개 애니메이션을 보인다. `role="status"`, `aria-live="polite"`.
  - `prefers-reduced-motion`이면 점을 움직이지 않는다.
  - 응답이 오면 이 말풍선은 사라지고 실제 피드백이 대화창에 들어온다.
- 문구는 화면 코드의 순수 함수 `waitingText(kind, elapsedMs)`가 정한다.
  - `kind`는 이 기다림을 시작한 학생 명령으로 정한다.
  - 경과 시간은 그 명령을 보낸 시각부터 화면 시계로 잰다. 1초 간격으로 갱신하면 된다.

| kind | 0초~ | 6초~ | 15초~ | 25초~ |
|---|---|---|---|---|
| `ANSWER` (SELECT, RATIONALE) | 네 근거를 읽고 있어 | 원문이랑 하나씩 맞춰 보고 있어 | 어디서 판단이 갈렸는지 살펴보고 있어 | 조금 오래 걸리고 있어. 조금만 더 기다려 줘 |
| `CORRECTION` (CORRECT) | 네 답을 읽고 있어 | 아까 질문이랑 맞춰 보고 있어 | 아까 질문이랑 맞춰 보고 있어 | 조금 오래 걸리고 있어. 조금만 더 기다려 줘 |
| `EXPLANATION` (REQUEST_EXPLANATION) | 설명을 정리하고 있어 | 설명을 정리하고 있어 | 설명을 정리하고 있어 | 조금 오래 걸리고 있어. 조금만 더 기다려 줘 |
| `UNKNOWN` (RESUME, 새로고침 뒤 PROCESSING, 그 밖) | 네 답을 살펴보고 있어 | 네 답을 살펴보고 있어 | 네 답을 살펴보고 있어 | 조금 오래 걸리고 있어. 조금만 더 기다려 줘 |

- RESUME은 같은 화면에서 직전에 보낸 명령의 kind를 알면 그 kind를 쓴다. 시간은 RESUME을 누른 때부터 다시 잰다. 모르면 `UNKNOWN`을 쓴다.
- RESELECT·FINISH는 모델 호출 없이 바로 끝난다. 그래도 기다림이 생기면 `UNKNOWN`을 쓴다.
- 버튼 명령(RESELECT·REQUEST_EXPLANATION·FINISH)을 보낼 때는 "나의 응답 · 전송 확인 중" 학생 말풍선을 만들지 않는다. 학생 글이 있는 명령은 지금처럼 만든다.

**구현 방식**

- 단계별 상태 계산은 순수 함수 `composerState(view, local)`로 뺀다. 반환값은 선지별 활성·눌림·회색 여부, 입력칸 활성, 체크 종류, 버튼 목록, 안내 칸 문구·종류다. `waitingText`도 같은 파일에 둔다. 예: `packages/app/src/client/v4-composer-state.ts`.
- CSS: 안내 칸 고정 높이, 입력칸 고정 높이, 아래 버튼 줄 최소 높이를 정한다. 꺼진 선지 버튼은 지금 스타일(`opacity .4`)을 따른다. 회색으로 막힌 첫 선택 번호는 눌림 표시 없이 회색으로만 보인다.

### 3. 테스트

- `packages/app/src/client/v4-composer-state.test.ts`(새 파일):
  - 위 표의 단계마다 `composerState` 결과가 표와 같다.
  - 모든 단계에서 네 줄이 있다는 뜻으로, 반환값에 안내 칸·선지·입력칸·버튼 줄 항목이 늘 있다.
  - `waitingText`의 kind별 경계값: 0, 5999, 6000, 14999, 15000, 24999, 25000ms.
- `packages/app/src/server/problem-feedback-v4.test.ts`:
  - 151행 기대값을 바꾼다. 버튼 명령 뒤 대화창에 새 STUDENT 항목이 없다.
  - [다시 선택] 뒤 대화창에 "이번이 마지막 선택이야." 문장이 들어간 COACH 항목이 없다.
  - 세션 관찰 기록에는 버튼 명령이 남는다.
- `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`:
  - 이번 변경 때문에 깨지는 기대값만 고친다.
  - 교정 성공 → [다시 선택] 흐름에서 입력 영역 높이가 단계 전후로 같은지 확인하는 테스트를 하나 더한다. `boundingBox` 높이 비교로 하고, 모의 평가기로 돌린다.
  - Playwright 실행이 샌드박스에서 안 되면 실행하지 말고 보고한다.

## 완료 조건

- [ ] 위 표와 계약대로 동작하고, 입력 영역의 네 줄이 모든 단계에서 렌더링된다.
- [ ] 버튼 명령과 [다시 선택] 안내가 공개 대화창에 없고, 관찰 기록에는 남는다.
- [ ] 기다림 말풍선이 kind·경과 시간에 따라 표의 문구를 보인다.
- [ ] `npx --no-install vitest run packages/pipeline/src/problem-solving packages/app/src/server/problem-feedback-v4.test.ts packages/app/src/server/problem-feedback-v4-http.test.ts packages/app/src/client` 전부 통과(현재 355 + 새 테스트).
- [ ] `node --test scripts/test-v5-live-connection.test.mjs scripts/run-v5-diverse-48.test.mjs scripts/run-v5-diverse-48-concurrent.test.mjs` 통과(현재 35/35). 대화창 기대값 때문에만 실패하면 기대값을 고친다.
- [ ] `npm run build`, `npm run typecheck:client` 통과.
- [ ] e2e: `npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts` 결과를 보고한다(실행 불가면 사유).
- [ ] 변경 파일이 이 문서에 적은 파일뿐이다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈춘다. 충돌 내용과 선택지를 보고하고, 설계를 임의로 바꾸지 않는다.
  예: 공개 뷰에 없는 정보(첫 선택 번호 등)가 필요함, 서버 대화창을 안 쓰는 다른 화면이 같은 기록을 씀.
- 외부 API 호출·외부 전송·의존성 설치가 필요해지면 실행 전 멈춘다.

## 보완 (2026-10-13, Claude — 코덱스 1차 중단 보고에 대한 답)

- 코덱스 지적이 맞다. e2e 모의 평가기(`problem-feedback-v4-workbench.spec.ts` 10–30행)는 D-0112 연결 이전 형태라 END_EXPLANATION과 버튼 명령을 처리하지 못한다.
- 선택지 (1)을 허용한다. 이번 인계 안에서 e2e 모의 평가기를 고친다.
  - END_EXPLANATION 요청(`session.evaluationMode === 'END_EXPLANATION'`)에는 `{ coaching: '<반말 한국어 문장>' }`을 돌려준다. 문장에는 내부 식별자와 "교정 질문"이 없어야 한다.
  - 버튼 명령(RESELECT·REQUEST_EXPLANATION·FINISH)처럼 `rationale`이 없는 명령에서 `command.rationale`에 접근하지 않게 한다.
  - 기존 테스트의 의도(각 테스트가 확인하는 흐름)는 바꾸지 않는다.
- 나머지 계약은 그대로다.

## 1차 실행 보고 (보존)

- 변경 파일:
  - 이 인계 문서의 "결과 보고" 절만 수정. 구현·테스트 파일 변경 0개.
- 테스트 결과:
  - 테스트·빌드 실행 0회. 코드 대조 중 기존 E2E 모의 평가기와 현재 종료 설명 계약의 충돌을 발견해 실행 전에 중단했다. 통과·실패 수치는 측정하지 않았다.
- 남은 문제:
  - 구현 미착수. `packages/app/e2e/problem-feedback-v4-workbench.spec.ts:10–30`의 모의 평가기는 REPAIR 외의 모든 평가에 SELECTION 응답을 반환하며 END_EXPLANATION 분기가 없다. 현재 서버(`packages/app/src/server/problem-feedback-v4.ts:116–117`)는 END_EXPLANATION 응답을 `applyFeedbackEndExplanation`으로 처리하고, `packages/pipeline/src/problem-solving/feedback-v4.ts:189–192`는 `{ coaching: string }`만 허용한다. 따라서 기존 종료 설명 경로는 모의 응답 계약을 만족하지 않는다. REQUEST_EXPLANATION을 추가하면 같은 E2E 파일 13행의 `command.rationale.mode` 접근도 버튼 명령에 대해 안전하지 않다.
  - 이 문제는 이번 UI 변경으로 깨지는 기대값만의 문제가 아니다. 인계의 E2E 수정 범위("이번 변경 때문에 깨지는 기대값만 고친다")와 중단·보고 조건에 따라 모의 평가기를 임의로 수정하지 않았다.
  - 선택지: (1) 후속 인계에서 기존 E2E 모의 평가기에 END_EXPLANATION 응답과 버튼 명령 처리를 추가하도록 명시적으로 허용한다. (2) 기존 E2E 계약 보정을 별도 선행 작업으로 완료한 뒤 이번 인계를 재개한다.
  - 실제 API 호출, .env 열기, 의존성 설치, 외부 네트워크, git 쓰기 명령은 실행하지 않았다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/app/src/server/problem-feedback-v4.ts`: 버튼 명령의 STUDENT 항목과 재선택 안내의 COACH 항목을 공개 대화창에서 제외. 관찰 기록과 원장 저장은 유지.
  - `packages/app/src/server/problem-feedback-v4.test.ts`: 버튼 명령 4경로의 공개 대화창 제외·관찰 기록 보존 검증.
  - `packages/app/src/client/ProblemFeedbackV4App.tsx`: 네 줄 상시 렌더링, 단계별 활성 상태, 재선택 초기화, 기다림 말풍선·시계 연결.
  - `packages/app/src/client/problem-feedback-workbench.css`: 안내 칸·입력칸·버튼 줄 고정 크기, 비활성 선지 스타일, 점 애니메이션과 reduced-motion 처리.
  - `packages/app/src/client/v4-composer-state.ts`(신규): 순수 함수 `composerState`, `waitingText`와 명령별 kind 계산.
  - `packages/app/src/client/v4-composer-state.test.ts`(신규): 단계별 상태·네 줄 구조·문구 우선순위·kind별 시간 경계 등 48개 테스트.
  - `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`: 보완 절의 모의 평가기 수정, 기존 흐름의 버튼·문구 기대값 보정, 입력 영역 높이 유지 테스트 1개 추가.
  - 이 인계 문서: "결과 보고" 절만 작성. 기존 본문과 1차 실행 보고는 보존.
- 테스트 결과:
  - 지정 Vitest 전체: 27개 파일, 403/403 통과(기존 355 + 신규 48), 실패 0.
  - 지정 Node 스크립트 테스트: 35/35 통과, 실패 0.
  - `npm run build`, `npm run typecheck:client`: 통과. 마지막 화면 보완 뒤 재실행도 통과.
  - 신규 순수 함수 테스트 재확인: 48/48 통과.
  - 지정 Playwright E2E: 최종 7/7 통과, 실패 0. 교정 전·교정 성공 뒤·재선택에서 네 줄 렌더링과 boundingBox 높이 동일 확인.
  - E2E 최초 실행은 6/7 통과: 기대 문구를 "정답은 아니야."로 잘못 옮긴 1건을 현재 코드의 "정답이 아니야."로 수정한 뒤 전체 재실행에서 통과.
  - E2E는 env 파일 로딩을 끈 별도 루프백 Vite(5383)와 모의 API 서버(5384)로 실행. 실제 API 호출, `.env` 열기, 의존성 설치, 외부 네트워크, git 쓰기 명령 실행 없음.
- 남은 문제:
  - 이번 인계 범위의 미해결 문제 없음. Claude의 인계 문서 대비 diff 검토는 후속 절차로 남음.
  - 범위 밖 파일과 메모리는 수정하지 않음. 기존 작업 트리의 다른 변경은 그대로 유지.

## Claude diff 검토 (2026-10-13)

- 대조 기준: 실행 전 사본 `.omc/artifacts/baseline-composer-2026-10-13/`.
- 일치:
  - 서버는 버튼 명령(RESELECT·REQUEST_EXPLANATION·FINISH)의 STUDENT 항목과 AWAITING_RESELECTION COACH 항목을 대화창에서 뺐다. 관찰 기록은 그대로다.
  - 화면은 안내 칸·선지·입력칸·버튼 줄 네 줄을 늘 렌더링한다. CSS grid로 줄 높이를 고정했다.
  - `composerState`·`waitingText`가 표와 같다. 재선택 때 첫 번호는 회색으로 막히고 선택 상태가 비워진다. 재시도 버튼은 주 버튼 자리에 나온다.
- 인계에 없던 변경 1건(수용):
  - 서버가 PROCESSING을 돌려주는 동안에는 `pending`을 지우지 않는다(`received`, revision 정리 effect).
  - 판정과 종료 설명이 이어지는 동안 기다림 말풍선과 잠금이 풀리지 않게 하려는 처리다. 1번 결정의 의도와 맞는다.
- Claude 재실행 결과:
  - vitest 403/403 통과.
  - 실행기 테스트 35/35 통과.
  - typecheck 통과.
  - e2e 7/7은 코덱스 보고를 따랐다(Claude는 재실행하지 않음).
- 판정: 통과.
