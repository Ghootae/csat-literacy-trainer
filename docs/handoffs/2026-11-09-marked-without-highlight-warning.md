# 인계: 교정 질문의 "표시한"과 빈 칠하기 경고 기록 (v5.9 ㉰ 서버 쪽)

- 날짜: 2026-11-09
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0212-question-rules-quote-two-way-by-source-no-marked-media.md`(㉰ 방안 A: 지시문에 그림·표 근거 "표시한" 금지, 서버는 기록만)
- 설계 초안: `docs/experiments/question-rules-v59-2026-11-09/DESIGN-DRAFT.md` "서버 (㉰, 기록만)"

## 목표

- 교정 질문 단계(`phase === 'AWAITING_CORRECTION'`)에 들어갈 때, 학생에게 보일 질문(`s.message`)에 "표시한"이 있는데 그 오류로 칠할 곳이 하나도 없으면, 세션 기록에 경고 한 줄이 남는다.
- 질문 문장·칠하기·판정·흐름은 바뀌지 않는다. 학생 화면(public view)에도 경고가 나가지 않는다.

## 범위 밖

- 질문 문장 고치기, 질문 다시 만들기, 모델 재호출.
- 그림·표 칠하기 구현.
- 지시문 파일(`source-direct-problem-feedback-v5.9.md`)과 클라이언트 코드.
- 세션 버전(`PROBLEM_FEEDBACK_SESSION_VERSION`) 변경. 새 칸은 선택 칸이라 옛 세션 기록도 그대로 읽혀야 한다.

## 손댈 파일과 계약

- `packages/pipeline/src/problem-solving/feedback.ts`
  - 지금 `feedbackPublicView`(555–562행)가 활성 오류의 `sourceEvidence`에서 칠하기를 계산한다. 이 계산을 오류 하나와 세션 원자료를 받아 칠하기 목록을 돌려주는 내보내지 않는 함수(예: `correctionHighlightsFor(s, error)`)로 빼고, `feedbackPublicView`는 그 함수를 쓴다. 결과는 지금과 같아야 한다(PASSAGE·SCENARIO만, quote 있음, mediaId·visualObservation 없음, 원문에서 찾은 것만).
  - `FeedbackSession`에 선택 칸을 더한다: `questionWarnings?: { kind: 'MARKED_WITHOUT_HIGHLIGHT'; errorId: string; question: string }[]`.
  - `nextCorrection`(481행)에서 오류를 물을 때(`s.message = e.question` 직후), `e.question`에 "표시한"이 있고 그 오류의 칠하기 목록이 비어 있으면 `questionWarnings`에 하나를 더한다(칸이 없으면 만든다). 같은 오류에 대해 두 번 더하지 않는다.
  - 경고 대상은 질문에 "표시한"이 있는 경우뿐이다. "표에서"·"그림에서"는 대상이 아니다.
- `packages/pipeline/src/problem-solving/feedback.test.ts`: 테스트 추가(아래 완료 조건).

## 완료 조건

- [ ] 질문에 "표시한"이 있고 활성 오류의 근거가 그림 근거뿐(mediaId 있음)이면 `questionWarnings` 1개(`kind`, `errorId`, `question` = 그 질문).
- [ ] 질문에 "표시한"이 있고 PASSAGE 근거 quote가 원문에 없어 칠하기가 비면 경고 1개.
- [ ] 질문에 "표시한"이 있고 칠하기가 있으면 경고 없음(칸이 없거나 빈 배열).
- [ ] 질문에 "표시한"이 없으면 칠하기가 비어도 경고 없음.
- [ ] `feedbackPublicView` 결과에 `questionWarnings`가 없고, 기존 칠하기 결과가 그대로다(기존 테스트 통과).
- [ ] 테스트: `npx vitest run packages/pipeline/src/problem-solving packages/app` 통과. 단 `packages/app`의 `boundary.test.ts` "다른 서버 파일은 node:fs를 import 하지 않는다" 실패 1건은 이번 변경 전부터 있던 것(`server/student-state.ts`)이므로 그대로 두고 보고만 한다.
- [ ] 타입 검사: `npm run typecheck` 통과.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 세션 저장·불러오기 코드가 모르는 칸을 버리거나 거부해 경고가 저장되지 않으면 멈추고 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/problem-solving/feedback.ts`(`correctionHighlightsFor` 추출, `FeedbackSession.questionWarnings?` 추가, `nextCorrection`에서 경고 기록), `packages/pipeline/src/problem-solving/feedback.test.ts`(경고 테스트 2개 추가).
- 테스트 결과: `npx vitest run packages/pipeline/src/problem-solving packages/app` -> 907 통과, 1 실패(`boundary.test.ts` node:fs, 변경 전부터 있던 것). `npm run typecheck` 통과.
- 남은 문제: 없음. 세션 저장은 structuredClone·JSON이라 새 칸이 버려지지 않음. 원문에 없는 PASSAGE quote는 assess 검증에서 거부되거나 원문 인용으로 복구되므로 테스트에서는 "PASSAGE 근거 없이 EXPLANATION 근거만 있는 경우"로 칠하기 빈 상태를 만들었다.
