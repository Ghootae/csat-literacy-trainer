# 인계: 마지막 설명 레이아웃 v2.2(문단 + 칠할 곳)를 실제 생성에 연결

- 날짜: 2026-11-02
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0193-end-explanation-paragraph-steps-with-marks.md`, `memory/decisions/D-0184-*.md`(layout v1)
- 근거 실험: `docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02/`(REPORT-desktop.md, `instructions-v2.txt`), 웹 에이전트 판정(2026-11-02: 연결 승인, 회사법 ② 칸 제외 22/24 통과)

## 목표

- 실제 문제 연습 세션의 마지막 설명(END_EXPLANATION) 생성이 기본값으로 layout v2.2를 쓴다.
  - 모델은 칸마다 문단 목록을 낸다. 각 문단은 `{ text, mark: { location: 'PASSAGE' | 'SCENARIO', quote } | null }`이다.
- 화면 쪽은 지금 개발자 미리보기(`?endPreview=`)와 같은 모양이 된다.
  - 문단마다 말풍선 하나가 뜨고, 다음 버튼으로 넘어간다.
  - 문단마다 지문이나 〈보기〉의 한 문장을 미색으로 칠한다.
  - 코드가 만드는 첫 문장은 첫 문단에, 마무리 문장은 마지막 문단에 붙는다.
- 문단 속 ‘…’ 인용이 원문에 없으면 재시도한다. 마지막 시도에서도 인용 문제만 남으면 그 따옴표만 벗기고 통과시킨다.
- 예전 layout v1(칸당 문자열)과 v5.3 설명이 든 저장 세션은 지금처럼 칸당 말풍선 하나로 보인다.

## 범위 밖

- 지시문 문구는 바꾸지 않는다. v2.2 지시문은 `instructions-v2.txt`와 바이트 단위로 같아야 한다.
- 모델 배정(정답 luna, 오답 sol, medium)과 재시도 횟수 기본값(`maxRetries` 1, 즉 2회 시도)은 바꾸지 않는다.
- 클라이언트(`ProblemLabApp.tsx`, `problem-composer-state.ts`)는 미리보기 때 이미 고쳤으므로 손대지 않는다. 필요해 보이면 멈추고 보고한다.
- 개발자 미리보기 경로(`startEndPreview`, `END_PREVIEW_FIXTURES`)는 그대로 둔다.
- 외부 API 호출 금지. 모든 시험은 transport 대역으로 한다.
- 알려진 내용 문제는 이번에 고치지 않는다(아래 "알려진 문제"를 참고).

## 손댈 파일과 계약

### 1. `packages/pipeline/src/problem-solving/feedback-end-explanation.ts`

- `END_EXPLANATION_LAYOUT_V2_INSTRUCTIONS`를 추가한다.
  - 내용은 `docs/experiments/end-explanation-paragraph-marks-v22-2026-11-02/instructions-v2.txt`와 바이트 단위로 같다(sha256 `12d686b9452a5ad5081bcf41ae7a0e10270d02d9bdf2bcfc381f341c6ba807a5`).
  - 그 파일은 생성 스크립트가 v1 지시문의 `[칸과 화면]` 문장을 바꿔 만들었다(`scripts/run-end-explanation-paragraph-marks-v22.mjs`의 `V1_SCREEN` → `V2_SCREEN`). 만드는 방식은 자유다(상수로 박거나 v1에서 같은 치환으로 만들기). 결과 sha가 위와 같다는 테스트를 넣는다.
- `EndExplanationLayout`에 `'layout-v2'`를 더한다.
- `feedbackEndExplanationContent`는 `'layout-v2'`일 때 `'layout-v1'`과 같은 입력을 만든다. 실험도 v1 입력에 지시문만 바꿔 생성했다.

### 2. `packages/pipeline/src/problem-solving/feedback.ts`

- 스키마 `EndParagraphSchema`: `{ text: Text, mark: { location: 'PASSAGE' | 'SCENARIO', quote: string } | null }`, strict.
- 스키마 `FeedbackEndParagraphsSchema`: `{ firstChoice: EndParagraph[], reselection: EndParagraph[] | null, answer: EndParagraph[] }`, strict, 각 배열 1개 이상.
  - 요청용 JSON schema는 실험 스크립트와 같은 모양이어야 한다. 스크립트의 스키마를 확인할 것.
- `FeedbackSession.endExplanation`은 v1 모양(문자열 세 칸)과 v2 모양(문단 배열 세 칸)을 모두 받는다.
  - 판별용 함수를 내보낸다. 예: `endExplanationParagraphs(e)`는 v2면 문단 배열을, v1이면 null을 돌려준다.
- `applyFeedbackEndExplanation(session, raw)`은 두 모양을 다 받는다. v2 검사 항목:
  - 재선택 칸 유무가 선택 기록과 일치(기존 규칙).
  - 각 문단 text에 기존 v1 검사를 그대로 적용한다(`validateFeedbackCoaching`, `nonKoreanProblem`, 내부 식별자, "교정 질문").
  - firstChoice·reselection의 첫 문단이 화면 첫 문장을 되풀이하지 않는다(기존 정규식).
  - 문단마다 한글 4자 이상(스크립트 `check`와 같음).
  - mark 인용이 원문에 없으면 오류가 아니다. 칠하지 않을 뿐이며 서버가 처리한다.
- 인용 검사를 순수 함수로 내보낸다. 스크립트 `check`의 인용 부분과 같은 규칙이다.
  - `endQuoteProblems(session, explanation): string[]`
    - 문단 속 ‘…’마다 판정한다. 인용은 공백을 한 칸으로 줄이고 끝의 `.,`를 뗀다.
    - 원문 묶음은 지문·〈보기〉·선지 원문에서 `*`를 지우고 공백을 줄인 것이다.
    - 인용이 원문 묶음에 없으면 문제다. 오류 문구는 스크립트와 같다: `${칸}: 인용 ‘${앞 30자}’이 선지·원문에 없음`.
  - `stripUnsourcedQuotes(session, explanation)`: 원문에 없는 ‘…’의 따옴표만 벗긴 사본을 돌려준다.
- v1 경로 동작은 바꾸지 않는다(기존 테스트가 그대로 통과해야 함).

### 3. `packages/pipeline/src/problem-solving/feedback-evaluator.ts`

- 기본 레이아웃을 `'layout-v2'`로 바꾼다. `'layout-v1'`·`'v5.3'`은 옵션으로 남긴다.
- `'layout-v2'`일 때 요청 스키마는 `FeedbackEndParagraphsSchema`, 지시문은 `END_EXPLANATION_LAYOUT_V2_INSTRUCTIONS`다.
- `applyFeedbackEndExplanation`로 검사를 미리 돌린 뒤 `endQuoteProblems`를 본다.
  - 문제가 있고 마지막 시도가 아니면 문제 목록을 메시지로 던진다. 기존 재시도 루프가 `validationFeedback`로 다시 보낸다.
  - 마지막 시도면 `stripUnsourcedQuotes` 결과를 candidate로 삼는다. 그 시도 기록에 `normalized: ['QUOTE_STRIPPED: …']`를 남기고 성공으로 돌려준다.
  - 인용 외의 검사 실패는 지금처럼 재시도하고, 마지막이면 오류다.
- 재시도 루프를 중첩하지 않는다(기존 주석의 원칙).

### 4. `packages/app/src/server/problem-feedback.ts`

- 마지막 설명 말풍선을 만드는 곳(지금 265~276행 부근)의 문단 소스를 정한다.
  - `r.endParagraphs`(미리보기)가 있으면 그것을 쓴다.
  - 없으면 `endExplanationParagraphs(s.endExplanation)`를 쓴다.
  - 둘 다 없으면(v1 문자열) 기존 칸당 말풍선 경로로 간다.
- 문단 경로는 기존 `addParagraphs`(`arrangeEndParagraphs` 적용, 첫 문장·마무리 문장 붙이기)를 그대로 쓴다.

### 5. 테스트

- pipeline:
  - v2 스키마 통과·거부 사례(빈 배열, 재선택 칸 불일치, 첫 문장 되풀이, 내부 식별자).
  - `endQuoteProblems`: 각주 `*` 무시, 끝 마침표 무시, 바꿔 쓴 인용 검출.
  - 평가기 대역 시나리오 세 개:
    - 1차 인용 실패 → 2차 성공(요청 2회, 2차 입력에 validationFeedback).
    - 2회 모두 인용 실패 → 따옴표 벗김으로 성공, `QUOTE_STRIPPED` 기록.
    - 2회 모두 인용 외 실패 → 오류.
  - 기본 레이아웃이면 v2 지시문을 보낸다는 검사를 기존 1824행 테스트에 반영한다.
- app 서버:
  - v2 마지막 설명이 든 실제 세션(대역 평가기)에서 문단 말풍선 수와 첫 문장·마무리 문장 위치를 확인한다.
  - 원문에서 찾은 칠하기 범위도 확인한다.
  - v1 문자열 세션은 기존 모양 그대로인지 확인한다.

## 알려진 문제(고치지 않음, 기록만)

- 회사법 ② "주주들에 의해 법인격이 부여"(K4·C-B3·XA-r1·KF-r1·C-CT·K4-r3 사례): 결론은 맞다. 앞 문단에 한쪽 읽기나 오독으로 반박하는 문장이 생긴다. 예: XA-r1 r2 "주주들이 아니라 구성원 단체에 부여", KF-r1 r2·C-CT r2의 부여 주체 단정. K4 선지 읽기 작업(D-0182)과 함께 다룬다.
- XS-r1 처음 칸: 학생도 선지도 하지 않은 읽기를 짐작해 반박하는 문장이 2/2 남았다("‘작용 기간을 연장’은 계속 남는다는 뜻이 아니야"). 같은 선지 읽기 작업에서 다룬다.

## 완료 조건

- [ ] `npm run build` 통과
- [ ] `npx vitest run packages/pipeline/src/problem-solving packages/app/src` 전부 통과(기존 테스트 포함)
- [ ] v2 지시문 sha 테스트 통과
- [ ] 위 테스트 5의 시나리오가 모두 들어 있고, `test.skip`·`.only`·빈 테스트가 없음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
  - 예: `endExplanation` 유니온 때문에 많은 곳의 타입이 깨질 때, 클라이언트 수정이 필요해 보일 때.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - `packages/pipeline/src/problem-solving/feedback-end-explanation.ts`: `END_EXPLANATION_LAYOUT_V2_INSTRUCTIONS`(instructions-v2.txt 통째로, sha 일치), `EndExplanationLayout`에 `'layout-v2'`, v2도 v1과 같은 입력.
  - `packages/pipeline/src/problem-solving/feedback.ts`: `EndParagraphSchema`·`FeedbackEndParagraphsSchema`, `endExplanation` 유니온, `endExplanationParagraphs`, `endQuoteProblems`, `stripUnsourcedQuotes`, `applyFeedbackEndExplanation`이 두 모양 수용.
  - `packages/pipeline/src/problem-solving/feedback-evaluator.ts`: 기본 레이아웃 `layout-v2`, 인용 문제 시 재시도, 마지막 시도는 따옴표 벗김 + `QUOTE_STRIPPED` 기록.
  - `packages/app/src/server/problem-feedback.ts`: 문단 소스 `r.endParagraphs` → `endExplanationParagraphs(s.endExplanation)` → v1 문자열 순.
  - 테스트: `feedback.test.ts`(v2 스키마·인용·평가기 시나리오 3개·기본 지시문 검사), `problem-feedback.test.ts`(v2 세션 말풍선·칠하기, v1 세션 유지).
- 테스트 결과: `npm run build` 통과. vitest 785개 중 784 통과, 1 실패(`packages/app/src/boundary.test.ts`: `server/student-state.ts`가 node:fs import. 이번 변경과 무관한 기존 실패).
- 인계 문서에서 벗어난 점:
  - v2 지시문을 v1 상수 치환이 아니라 통째 상수로 뒀다. 현재 v1 상수에는 실험 뒤 더해진 `asked` 문장이 있어, 치환하면 sha가 달라진다(문서가 허용한 방식).
  - 이 때문에 v2 입력(v1과 같음)에는 `asked` 필드가 있으나 v2 지시문은 그것을 언급하지 않는다. 실험 때 저장 입력에는 `asked`가 없었다. 판단 필요.
- 남은 문제: 위 `asked` 불일치, boundary.test 기존 실패.

## 메인 세션 후속 변경(2026-11-02, 사용자 승인)

- 하위 에이전트 보고: 실험 지시문은 메모 42번 asked 문장 이전 v1에서 만들어져 그 문장이 없다.
- 사용자 승인("승인, 그 한 줄 넣고 진행해")으로 v2 지시문에 그 한 문장을 v1과 같은 자리(생각 과정을 큰따옴표로 보인다. 바로 뒤)에 더했다. 위 "바이트 단위로 같다"는 "실험 글 + asked 한 문장"으로 바뀐다. 테스트는 이 구성을 확인한다.
- `boundary.test.ts` 실패 1건(`server/student-state.ts`의 `node:fs`)은 이번 변경 전부터 있던 것이다.
