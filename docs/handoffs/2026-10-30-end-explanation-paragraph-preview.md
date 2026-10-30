# 인계: 마지막 설명 문단 단위 보기 + 지문·〈보기〉 칠하기 미리보기

- 날짜: 2026-10-30
- 작성: 코드 에이전트(Claude Code 메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: 사용자 메모 1·2(2026-10-30), 설계 합의(이 문서). 기존 레이아웃 [D-0184](../../memory/decisions/D-0184-end-explanation-layout-v1-adopted.md), 단계 표시 D-0117. 작동 순서 `docs/PROBLEM-LAB-FLOW-2026-10-24.md` 3.6·3.9.

## 배경

마지막 설명(M4)은 지금 칸(firstChoice·reselection·answer)마다 말풍선 하나로 한꺼번에 나와 길다. 사용자는 (1) 요점 문단 하나씩 [다음으로 넘어가기]로 보고, (2) 문단마다 근거가 되는 지문·〈보기〉 한 곳을 미색으로 칠하는 화면을 **먼저 직접 써 보고** 쓸지 정한다. 그래서 이번에는 모델·지시문을 바꾸지 않고, 이미 만든 글을 사람이 나눠 둔 자료(`FIXTURE.json`)로 재생하는 **개발자 미리보기**만 만든다. 화면 코드(문단 말풍선·문단별 칠하기)는 나중에 실제 기능에 그대로 쓸 수 있게 일반적으로 만든다.

## 목표

1. `/problem/lab?endPreview=<caseId>`(caseId: `S-A1`, `KF-r1`, `QP-r2`)로 열면, 그 사례가 마지막 설명 게이트를 지나 `AWAITING_UNDERSTANDING`에 들어간 상태의 화면이 뜬다. 앞 대화(학생 제출·판정 말풍선·게이트)는 저장 기록의 transcript를 그대로 보인다.
2. 마지막 설명 칸은 `FIXTURE.json`의 문단마다 말풍선 하나(`sequence: 'SECTION'`)로 나온다.
   - 칸 첫 문장(`feedbackSectionLead`)은 그 칸 **첫 문단 앞**에 `' '`로 붙인다(지금과 같은 결합).
   - 칸 마무리 문장(`feedbackSectionClosing`)은 그 칸 **마지막 문단 뒤**에 `'\n\n'`으로 붙인다(지금과 같은 결합). answer 칸은 지금처럼 첫 문장·마무리 문장이 없다.
   - 연결 말풍선(`…번부터 볼게.`, `다음은 다시 고른 …`, `이제 …번이 정답인 이유를 볼게.`)과 `이해됐어?`는 지금과 같다.
3. 문단 말풍선 사이, 그리고 칸의 마지막 문단과 다음 연결 말풍선 사이에서 [다음으로 넘어가기]를 눌러야 다음이 나온다. 정답 칸 마지막 문단 → `이해됐어?`는 지금처럼 자동이다.
4. 문단 말풍선이 보일 때, 가장 최근에 보인 문단 말풍선의 칠할 곳만 지문 칸 또는 〈보기〉에 미색(기존 `.lab-highlight`)으로 칠하고 그 칸 안에서 그 위치로 스크롤한다.
   - 칠할 곳이 없는 문단이 보이면 칠하기를 모두 지운다.
   - 연결 말풍선·`이해됐어?`는 칠하기를 바꾸지 않는다(직전 문단 상태 유지).
   - 모바일 좁은 화면에서는 탭(pane)을 바꾸지 않는다(출제자 전략 칠하기와 같음).
5. 칠할 위치는 서버가 정한다: `mark.quote`가 해당 원문(`PASSAGE`=지문, `SCENARIO`=〈보기〉)에 공백 정규화 후 **정확히 한 번** 나올 때만 `{ location, start, end, text }`(원문 인덱스)로 바꾼다. 아니면 칠하지 않는다(오류로 만들지 않음). 위치 계산은 `strategyHighlights`(`packages/app/src/client/examiner-strategy-state.ts:62-79`)와 같은 규칙(공백 연속은 한 칸, 원문 인덱스로 되돌림)을 쓰되, 인용 부호 추출 없이 quote 문자열 자체를 찾는 공용 함수로 뽑아 두 곳에서 쓴다.
6. 미리보기가 아닌 실제 세션의 동작(모델이 쓴 마지막 설명을 칸당 말풍선 하나로 보이기, 칸 사이 [다음으로 넘어가기])은 바뀌지 않는다.

## 범위 밖

- 마지막 설명 지시문·스키마(`FeedbackEndExplanationSchema`, `feedback-end-explanation.ts` 지시문), 판정기, 모델 호출. 외부 API 호출 없음.
- `packages/pipeline`의 세션 스키마에 필드 추가 금지. 문단 자료는 서버 런타임(Runtime)에만 둔다.
- 교정 질문 칠하기(`correctionHighlights`)와 출제자 전략 칠하기 동작 변경 금지.
- `FIXTURE.json`과 `build-fixture.mjs` 내용 변경 금지(읽기만).
- 학생용 경로(`/problem`, 문단 대화) 변경 금지.

## 자료

- `docs/experiments/end-explanation-paragraph-preview-2026-10-30/FIXTURE.json`: `cases[caseId] = { sessionRecords, originalOutput: {firstChoice, reselection, answer}, sections: { firstChoice: Para[], answer: Para[] (reselection 칸은 세 사례 모두 없음) } }`, `Para = { text, mark: { location: 'PASSAGE'|'SCENARIO', quote } | null }`. 문단 글을 이으면 `originalOutput` 글과 같다(공백 제외).
- `sessionRecords`: 저장 세션 기록(jsonl). 각 줄 `{ event, session, transcript, call, ... }`. 게이트 상태(`session.phase === 'AWAITING_END_START'`)인 마지막 줄을 출발점으로 쓴다. 그 줄의 transcript가 앞 대화다.

## 손댈 파일과 계약

- `packages/app/src/server/problem-feedback.ts`
  - Runtime에 선택 필드 `endParagraphs?: { firstChoice: Para[]; reselection: Para[] | null; answer: Para[] }` 추가.
  - `appendCoachMessages`의 `AWAITING_UNDERSTANDING` 분기: `r.endParagraphs`가 있으면 칸마다 문단 말풍선을 만든다(id 예: `-first-section-p0`, `-first-section-p1`…; 첫 문단에만 lead, 마지막 문단에만 closing). 각 문단 메시지에 `highlights`(아래)를 넣는다. 없으면 지금 코드 그대로.
  - 미리보기 생성 메서드: caseId → FIXTURE 읽기 → 기록의 게이트 상태 세션·transcript 복원(새 sessionId) → `endExplanation`을 `originalOutput`으로 적용하고 게이트 [응](END_START accept)을 거쳐 `AWAITING_UNDERSTANDING`으로 만든다. 기존 파이프라인 함수(`applyFeedbackEndExplanation`, `submitFeedbackCommand` 등)만 쓰고 모델 호출은 하지 않는다. 적용이 검증에서 실패하면 오류로 멈춘다(우회 금지, 보고).
- `packages/app/src/shared/problem-feedback.ts`: `FeedbackMessage`에 선택 필드 `highlights?: { location: 'PASSAGE' | 'SCENARIO'; start: number; end: number; text: string }[]`.
- `packages/app/src/server/index.ts`: 개발자 API(기존 problem-lab 라우트와 같은 접근 규칙, `CSAT_DEVELOPER_MODE=1`)에 미리보기 시작 라우트 추가(예: `POST /api/developer/problem-lab/end-preview` `{ caseId }` → 일반 세션 view). 알 수 없는 caseId는 400.
- `packages/app/src/client/problem-composer-state.ts`: `sequenceState`의 `needsNextAt` — 앞 메시지가 `SECTION`이고 다음이 `SECTION` 또는 `CONNECTOR`이면 [다음]이 필요.
- `packages/app/src/client/ProblemLabApp.tsx`
  - `endPreview` 쿼리가 있으면 미리보기 API로 세션을 시작한다(일반 세션 시작 대신).
  - 칠하기 결정: 보이는 메시지(`transcript.slice(0, visibleCount)`) 중 `phase === 'AWAITING_UNDERSTANDING'`이고 `sequence === 'SECTION'`인 마지막 메시지에 `highlights` 필드가 있으면(빈 배열 포함) 그것을 지문·〈보기〉 칠하기로 쓴다. 우선순위: 전략 칠하기(COMPLETED) > 교정 칠하기(AWAITING_CORRECTION) > 문단 칠하기. 지문 `AnnotatedText`와 〈보기〉 `AnnotatedText` 모두에 해당 location을 넘긴다.
  - 새 문단 말풍선이 보일 때 칠한 위치가 있으면 기존 `scrollToHighlight(location)`로 스크롤(탭 전환 없음).
- 위치 계산 공용 함수: 클라이언트·서버가 함께 쓰도록 `packages/app/src/shared/`에 두고 `strategyHighlights`가 이를 쓰게 바꾼다(동작 동일, 기존 테스트 통과).

## 완료 조건

- [ ] 세 사례 각각 미리보기 시작 → 문단 수가 FIXTURE와 같다(S-A1: 첫 칸 4·정답 4, KF-r1: 1·3, QP-r2: 1·1). 첫 문단에 lead, 마지막 문단에 closing이 붙는다.
- [ ] 칠할 곳이 있는 문단 9개(S-A1 4, KF-r1 4, QP-r2 1)가 모두 위치로 바뀐다(FIXTURE 검사상 모두 정확히 한 번 나옴). KF-r1 정답 칸 3번째 문단은 SCENARIO.
- [ ] 단위 테스트: (a) `sequenceState` SECTION→SECTION에서 needsNext, SECTION→QUESTION 자동, 기존 SECTION→CONNECTOR 유지 (b) 서버 문단 말풍선 생성(lead·closing 위치, highlights, 칠할 곳 없음 → `[]`) (c) 위치 함수: 한 번/두 번/없음, 공백 정규화, SCENARIO (d) `endParagraphs` 없는 세션의 transcript가 바뀌지 않음.
- [ ] `npm run build`, `npm run typecheck:client`, `npm test` 통과(기존 실패가 있으면 변경 전후 같은지 밝힘).
- [ ] 외부 API 호출 없음(미리보기 경로에서 evaluator가 불리지 않음을 테스트나 로그로 확인).

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다. 예: 게이트 상태 기록이 없거나 `applyFeedbackEndExplanation`이 `originalOutput`을 거부함, 세션 복원에 pipeline 스키마 변경이 필요함.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 커밋하지 않는다(메인 세션이 diff 검토 뒤 사용자 승인으로 커밋).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/shared/quote-locate.ts`(신규, 공용 위치 함수)·`quote-locate.test.ts`(신규), `shared/problem-feedback.ts`(`FeedbackMessage.highlights`), `server/problem-feedback.ts`(Runtime.endParagraphs, 문단 말풍선, `startEndPreview`, `PreviewCaseError`), `server/content.ts`(`loadJsonFromRoot` 추가: `boundary.test.ts`가 content.ts 밖의 node:fs import를 금지해서 파일 읽기를 여기로 둠), `server/index.ts`(`POST /api/developer/problem-lab/end-preview`), `client/examiner-strategy-state.ts`(공용 함수 사용), `client/problem-composer-state.ts`(SECTION→SECTION needsNext), `client/problem-feedback-api.ts`(`startEndPreview`), `client/ProblemLabApp.tsx`(endPreview 쿼리, 문단 칠하기·스크롤), 테스트 `server/problem-feedback.test.ts`·`client/problem-composer-state.test.ts` 추가.
- 테스트 결과: 변경 전 `npm test` 2 failed / 1492 passed (1494). 변경 후 2 failed / 1503 passed (1505), 새 테스트 11개 통과. 실패 2건은 변경 전후 동일한 기존 실패(`boundary.test.ts`의 `server/student-state.ts` node:fs import, `axis-architecture-experiment.test.ts` 파일 없음). `npm run build`, `npm run typecheck:client` 통과. 미리보기 테스트에서 evaluator 호출 0회 확인.
- 남은 문제: 화면(브라우저)에서 칠하기·스크롤은 실행해 확인하지 못했다(코드·타입·상태 테스트까지만). 미리보기에서 [응]/[아니] 같은 끝 단계를 누르면 일반 저장 경로로 기록이 남는다. 열기: 서버 `CSAT_DEVELOPER_MODE=1`로 재시작(`npm run build` 후 `node packages/app/dist/server/index.js`), 클라이언트는 vite dev면 자동 반영, 정적 빌드면 재빌드. URL `/problem/lab?endPreview=S-A1`(또는 `KF-r1`, `QP-r2`).
