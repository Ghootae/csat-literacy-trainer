# 인계: (나″) 경계 보여 주기 개발자 모드

- 날짜: 2026-10-15
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0134-boundary-show-dev-mode-central-object.md`, `memory/decisions/D-0133-paragraph-boundary-rule-na-double-prime.md`

## 목표

- 개발자 화면 `/dialogue/dev`의 판정 모드 선택에 새 모드 `v4-boundary-show`(표시 이름 "V4 + 경계 보여 주기 · 실험")가 생긴다. 학생 화면(`/dialogue`)에서는 선택·사용할 수 없다(기존 `conditional-meta-v1`과 같은 개발자 전용 검사).
- 새 모드는 V4(`TwoStageDialogueEvaluator`, gold-v2, 프롬프트 v4)를 그대로 쓰고, 행동만 아래 규칙을 따른다. 문단당 질문은 최대 1회.

| 시점 | V4 축 판정(`gate.axisFeedback[].status`) | 행동 |
|---|---|---|
| 1차 응답 | 모두 PASS(게이트 PASS) | 통과 |
| 1차 응답 | PASS/UNCLEAR_OK만 | 통과. 선택 질문 요청 불가 |
| 1차 응답 | UNCLEAR_SERIOUS 일부, ERROR 없음 | 질문 생성 호출 없이 보여 주기 |
| 1차 응답 | 모든 축 UNCLEAR_SERIOUS(1축 문단 포함) 또는 ERROR 하나 이상 | V4 그대로 질문 1회 |
| 2차 응답 | 모두 PASS 또는 PASS/UNCLEAR_OK만 | 통과 |
| 2차 응답 | 그 밖의 모든 경우 | 보여 주기 후 종료 |

- "통과"는 질문·보여 주기 없이 다음 문단으로 넘어가는 상태다. 화면 안내 문장은 "잘 정리했어. 다음 문단으로 넘어가자."(PASS/OK 공통, 새 모드에서만).
- "보여 주기" 화면(새 모드에서만, 친근한 반말):
  - "내 요약": 그 문단의 1차 응답(`record.initialResponse`)
  - 제목 "이 문단에서 담아야 할 것" 아래 gold-v2 `centralObject` 전체. `centralStory`는 보여 주지 않는다.
  - 밑줄: 마지막 턴 `snapshot.axisFeedback`에서 `UNCLEAR_SERIOUS` 또는 `ERROR`인 축의 구간(아래 자산). `UNCLEAR_OK`·`PASS` 축은 밑줄 없음.
  - 안내 문장: 밑줄 축에 ERROR가 하나라도 있으면 "밑줄 친 부분, 원문과 다르게 이해한 것 같아. 원문에서 다시 확인해 봐.", 아니면 "밑줄 친 부분을 원문에서 다시 확인해 봐."
  - 버튼: [다음 문단](마지막 문단이면 기존 마지막 문단 진행 동작과 같은 경로) / [요약 고쳐 쓰기](선택). 고쳐 쓰기는 입력창을 열고 제출하면 다시 판정하지 않고 기록만 한 뒤 "고쳐 쓴 요약을 남겼어." 정도의 확인만 보여 준다. 진행은 [다음 문단]으로.
- 축↔구간 자산: `packages/pipeline/fixtures/experiments/dialogue/central-object-axis-spans/manual-v0.json`(이미 있음, 수정 금지).
  - `paragraphs[].axes[].spans`: `centralObject`의 정확한 부분 문자열 배열. 값이 `wholeMarker`(`"whole"`)이면 `centralObject` 전체.
  - 한 축에 구간이 여러 개일 수 있고, 서로 다른 축이 같은 구간을 가질 수 있다(공손룡 p4). 밑줄은 대상 축들의 구간 합집합. 구간이 겹치거나 같은 문자열이 여러 번 나오면 첫 번째 일치 위치를 쓴다.
  - 문단 항목이 없거나 `goldSha256`이 현재 골드 파일의 sha256과 다르면 밑줄 없이 `centralObject`만 보여 주고, 개발자용 표시(예: "밑줄 자산 없음/해시 불일치")를 둔다. 오류로 멈추지 않는다.

## 범위 밖

- 운영 `v4` 모드와 `conditional-meta-v1` 모드의 동작·로그 경로·문구 변경 금지. 학생 화면 변경 금지.
- gold-v2·conditional-meta 골드, 자산 `manual-v0.json`, 프롬프트 파일 수정 금지.
- 기존 V4가 생성하는 질문·피드백 문구의 말투 변경 금지(새 화면 요소만 반말).
- 실제 OpenAI 호출을 하는 테스트·스크립트 실행 금지(모의 평가기만).
- 학생 상태 증거(`evidenceSink`) 계약 변경 금지.

## 손댈 파일과 계약

- `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts`(+`index` 내보내기):
  - 순수 함수 `boundaryShowAction(axisFeedback, questionsAsked): 'PASS_THROUGH' | 'SHOW' | 'ASK'`를 추가(위치는 같은 파일 또는 새 파일 `boundary-show.ts`). 위 표를 그대로 구현. `questionsAsked >= 1`이면 `ASK`를 반환하지 않는다.
  - `TwoStageDialogueEvaluatorOptions`에 `boundaryShow?: boolean`(기본 false). true일 때 1차 응답에서 `SHOW`이면 기존 "질문 없음" 분기와 같은 형태의 결과(`nextQuestion: null`, status는 ERROR 없음이므로 `UNCLEAR`)를 반환하고 `feedbackEvaluator.evaluate`를 호출하지 않는다. false이면 지금과 바이트 단위로 같은 동작.
  - `requestQuestion`은 새 모드에서 쓰지 않는다(아래 컨트롤러에서 막음).
- `packages/app/src/shared/contract.ts`:
  - `DialogueMode`에 `'v4-boundary-show'` 추가.
  - `DialogueSessionView`에 선택 필드 `boundaryShow?: { action: 'PASS_THROUGH' | 'SHOW'; initialResponse: string; centralObject: string; underlines: readonly { start: number; end: number; axisIds: readonly string[] }[]; guidance: 'GAP' | 'ERROR'; assetStatus: 'OK' | 'MISSING' | 'HASH_MISMATCH'; revision: string | null } | null` (이름은 맞춰도 되지만 의미는 유지). 새 모드에서 현재 문단이 통과/보여 주기 상태일 때만 채운다.
- `packages/app/src/server/content.ts`: 자산 로더 `loadCentralObjectAxisSpans()`(파일 1회 읽기, 문단별 조회, 해시 비교용 골드 sha256은 `loadDialogueGold`가 계산하는 해시와 같은 방식인지 확인. 다르면 자산의 `goldSha256`은 골드 파일 원문 바이트의 sha256이다).
- `packages/app/src/server/dialogue.ts`:
  - `start`·`openDeveloper`의 모드 검사에 새 모드 추가(개발자 전용).
  - 새 모드의 `createParagraphRuntime`: gold-v2 그대로, `maxQuestions: 1`, 평가기는 `new TwoStageDialogueEvaluator({ boundaryShow: true })`(테스트 주입 가능하도록 `DialogueControllerOptions`에 팩토리 옵션 추가), 로그는 `logDirectory/v4-boundary-show/sessions.jsonl`, 진행 로그도 같은 하위 폴더.
  - `canRequestQuestion`은 새 모드에서 항상 false. `stepView.maxQuestions`는 모드의 값(새 모드 1)을 반영.
  - `view`에서 `boundaryShow` 계산: 마지막 턴에 `questionShown`이 없고 문단이 PASS이거나 질문이 없는 비종결/종결(UNRESOLVED) 상태면, 마지막 턴 `snapshot.axisFeedback`으로 `boundaryShowAction`과 밑줄을 계산.
  - 고쳐 쓰기 기록: 새 메서드(예: `recordRevision(sessionId, text)`)와 HTTP 경로. 빈 문자열 거부, 판정 호출 없음, `v4-boundary-show/revisions.jsonl`에 `{sessionId, paragraphId, initialResponse, revision, underlinedAxisIds, at}` 한 줄 기록, `boundaryShow.revision`에 반영.
- HTTP 라우트 파일(대화 API가 정의된 곳): 고쳐 쓰기 경로 추가, 개발자 세션에서만 허용.
- `packages/app/src/client/DialogueApp.tsx`(+필요한 CSS):
  - 모드 선택에 새 옵션, `modeLabel` 추가, 저장된 모드 복원에 새 값 허용.
  - `session.boundaryShow`가 있으면 보여 주기 카드(내 요약 / 이 문단에서 담아야 할 것 + 밑줄 / 안내 / 버튼) 또는 통과 안내를 렌더링. 밑줄은 `<u>` 또는 같은 의미의 스타일. 기존 축 상자·개발자 서랍은 그대로 둔다.

## 완료 조건

- [ ] `boundaryShowAction` 단위 테스트: 표의 모든 행 + 경계(1축 SERIOUS → ASK, ERROR+SERIOUS → ASK, SERIOUS+OK → SHOW, 2차에서 ERROR → SHOW, 2차에서 OK만 → PASS_THROUGH).
- [ ] 평가기 테스트(모의 게이트/피드백): `boundaryShow: true` + 1차 SERIOUS 일부 → 피드백 평가기 호출 0회·`nextQuestion` null. `boundaryShow` 미지정 시 기존 테스트 전부 통과(동작 불변).
- [ ] 컨트롤러 테스트(모의 평가기): 새 모드 학생 화면 사용 거부, `maxQuestions` 1, `canRequestQuestion` false, SHOW 시 `boundaryShow`의 밑줄 위치가 자산 구간과 일치(공손룡 p2 AX1 → "물·실·명의 관계"), ERROR 남은 2차 → guidance `ERROR`, 자산 없는 문단 → `assetStatus: 'MISSING'`·밑줄 없음, 고쳐 쓰기 → 판정 호출 0회·로그 1줄.
- [ ] 기존 `v4`·`conditional-meta-v1` 테스트 전부 통과.
- [ ] `npm test`, `npm run build` 통과(실패 시 기존 실패인지 이번 변경 때문인지 구분해 보고).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 작업 트리에는 다른 작업의 미커밋 변경이 많다. 이 문서의 파일 외에는 수정하지 말고, 커밋·스태시·되돌리기를 하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 수정: `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.ts`(`boundaryShowAction`, `boundaryShow` 옵션; `index` 내보내기는 기존 `export *`로 충족), `packages/pipeline/src/dialogue-experiment/two-stage-evaluator.test.ts`, `packages/app/src/shared/contract.ts`, `packages/app/src/server/content.ts`(자산 로더 `loadCentralObjectAxisSpans`, JSONL 추가 헬퍼 `appendJsonlLine`), `packages/app/src/server/dialogue.ts`, `packages/app/src/server/index.ts`(`POST /api/dialogue/session/:id/revision`), `packages/app/src/client/api.ts`, `packages/app/src/client/DialogueApp.tsx`, `packages/app/src/client/dialogue-workbench.css`
  - 신규: `packages/app/src/server/dialogue-boundary-show.test.ts`
- 테스트 결과:
  - `two-stage-evaluator.test.ts` 18 통과(신규: 표 전 행·경계, SHOW 시 피드백 호출 0회, 미지정 시 기존 동작, 모든 축 SERIOUS는 질문), `dialogue-boundary-show.test.ts` 7 통과(학생 거부, maxQuestions 1·canRequestQuestion false, 공손룡 p2 AX1 밑줄 "물·실·명의 관계", p4 동일 구간, 2차 ERROR 안내, 2차 OK 통과, 자산 없음 MISSING, 고쳐 쓰기 판정 0회·로그 1줄). 기존 v4·conditional-meta 테스트 통과.
  - `npm run build` 통과. `npm test`: 1206 통과, 2 실패(둘 다 이번 변경과 무관한 기존 실패): `packages/app/src/boundary.test.ts`(미수정 `server/student-state.ts`가 node:fs import; 내 변경분 `dialogue.ts`는 fs를 `content.ts` 헬퍼로 옮겨 위반 제거), `packages/pipeline/src/cli/axis-architecture-experiment.test.ts`(`.omc/adhoc/...` 파일 없음).
- 남은 문제:
  - 2차 응답이 OK만(PASS_THROUGH)이어도 엔진 문단 결과(`outcome`)는 V4 규칙대로 UNRESOLVED로 기록된다(증거 계약 불변 유지). 화면은 통과 안내를 보여 준다.
  - 마지막 문단이 1차에서 전부 PASS면 기존 경로대로 곧바로 COMPLETED가 되어 통과 카드 없이 완료 화면이 뜬다.
  - 브라우저 e2e·화면 확인은 하지 않았다(단위·컨트롤러 테스트와 빌드만).
