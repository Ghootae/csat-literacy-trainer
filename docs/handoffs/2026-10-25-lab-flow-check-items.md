# 인계: 작동 순서 문서 6절 '확인 필요' 중 코드 수정 5건

- 날짜: 2026-10-25
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 문서: `docs/PROBLEM-LAB-FLOW-2026-10-24.md` 6절, `docs/PARAGRAPH-LAB-FLOW-2026-10-25.md` 6절
- 사용자 승인: 2026-10-25 "응, 권고대로 진행해"

## 목표

1. **문제 8** — 문제 화면의 `선택 N / 2`가 서버 값 `view.maxSelections`를 쓴다.
2. **문단 6** — 문단 화면 `[문제 풀기]`의 `problemUrl`이 파트 이동 막대의 [문제] 링크와 같은 주소다.
3. **문단 3** — 서버가 정한 `sourceCopyDetected` 값이 단계 기록(`SimpleStepInspection`)과 로그에 남는다.
4. **문단 2** — 판정 입력의 `targetError`는 `stage === 'AFTER_CORRECTION'`일 때만 상태 값이고, 그 밖에는 `null`이다(지시문 v4.7 18행 계약).
5. **문단 11** — 문단 판정기의 모델 호출이 `OpenAI.APIError`이고 상태가 408·409·429·500 이상이면 1회 다시 묻는다.

## 범위 밖

- 지시문 파일(`*.md`) 내용, 출력 스키마, 판정 모델은 바꾸지 않는다.
- 문제 판정기(`packages/pipeline/src/problem-solving/`)는 손대지 않는다. `coaching` 필드·평가 반복문 정리는 이번에 하지 않는다.
- 지문 목록 `available`, `transitions` 맵, `process.cwd()`는 바꾸지 않는다.
- 학생용 화면(`/dialogue`, `/problem`)은 손대지 않는다.

## 손댈 파일과 계약

### 1. 문제 8
- `packages/app/src/client/ProblemLabApp.tsx:257`: `선택 {view.selectionCount} / 2` → `/ {view.maxSelections}`.

### 2. 문단 6
- `packages/app/src/server/dialogue-simple.ts:246`: `problemUrl`을 클라이언트 `problemLink(questionId, sessionId)`(`packages/app/src/client/dev-part-nav-links.ts:11-13`)와 같은 문자열로 만든다:
  `'/problem/lab?' + new URLSearchParams({ questionId, returnTo: '/dialogue/lab?sessionId=<sessionId>' })`.
  서버가 client 폴더를 import하지 않도록, 필요하면 `problemLink`을 `packages/app/src/shared/`로 옮기고 client는 거기서 다시 내보낸다(기존 import 경로 유지).
- 테스트 `packages/app/src/server/dialogue-simple.test.ts:218`, `:407`의 기대값을 새 주소로 고친다. 서버 값이 `problemLink(...)` 결과와 같은지 단언한다.

### 3. 문단 3
- `packages/pipeline/src/paragraph-simple/evaluator.ts`: `SimpleEvaluationResult`에 `sourceCopyDetected: boolean | null`을 더한다. INITIAL·RETRY는 `withSourceCopy`가 정한 값, 그 밖 단계는 `null`.
- `packages/app/src/shared/dialogue-simple.ts`의 `SimpleStepInspection`에 `sourceCopyDetected: boolean | null`을 더하고, `dialogue-simple.ts`의 `buildStep`이 채운다. 로그는 `step`을 그대로 담으므로 자동으로 남는다.
- 서랍 화면 표시는 필수 아님. 넣는다면 단계 상세에 한 줄("원문 옮김 서버 판정: 예/아니오")만.

### 4. 문단 2
- `packages/app/src/server/dialogue-simple.ts:154`: `targetError: p.state.stage === 'AFTER_CORRECTION' ? p.state.targetError : null`.
- 상태(`SimpleParagraphState.targetError`) 자체는 지우지 않는다(교정 힌트 표시가 AFTER_CORRECTION에서 쓴다).
- 테스트: CORRECTION_QUESTION → GAP_QUESTION → AFTER_GAP 판정 경로에서 모의 판정기가 받은 입력의 `targetError`가 `null`임을 단언.

### 5. 문단 11
- `packages/pipeline/src/paragraph-simple/evaluator.ts`의 `evaluateSimple`: 기존 반복(최대 2회 호출)을 그대로 쓰고, `evaluator.complete`가 던진 오류가 `OpenAI.APIError`이면서 `[408, 409, 429].includes(status) || status >= 500`이면, 아직 1회차일 때 다음 반복으로 넘어간다. 재시도 한도는 검증 실패와 **공유**한다(전체 호출 최대 2회, 문제 판정기 `feedback-evaluator.ts:192-196`과 같은 방식).
  - API 재시도에는 `validationFeedback`을 붙이지 않는다(직전 검증 실패가 없으면).
  - 그 밖의 오류(타임아웃 `APIConnectionTimeoutError`처럼 status가 없는 것, 연결 오류, 응답 미완료)는 지금처럼 즉시 `SimpleEvaluationError`.
  - 함수 위 주석(28행)을 새 정책으로 고친다.
- 테스트(`evaluator.test.ts`): 429 뒤 성공 → 성공·호출 2회 / 400 → 즉시 실패·호출 1회 / 500 두 번 → 실패 / 검증 실패 1회 뒤 429 → 실패(한도 공유).
  `OpenAI.APIError` 인스턴스는 `new OpenAI.APIError(429, {}, 'rate', new Headers())` 등 SDK 생성자로 만든다(시그니처는 설치된 SDK에서 확인).

## 완료 조건

- [ ] 위 5건 구현과 테스트 추가·수정
- [ ] `npm run build` 통과
- [ ] `npm test -- packages/pipeline/src/paragraph-simple packages/app/src/server/dialogue-simple packages/app/src/client` 통과
- [ ] `npm run typecheck:client` 통과
- [ ] 외부 API 호출 없음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 기존 실패 테스트가 있으면 이번 변경과 무관함을 확인해 목록으로 보고한다.
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/client/ProblemLabApp.tsx`, `packages/app/src/client/dev-part-nav-links.ts`(problemLink 재내보내기), `packages/app/src/shared/problem-link.ts`(신규), `packages/app/src/shared/dialogue-simple.ts`, `packages/app/src/server/dialogue-simple.ts`, `packages/app/src/server/dialogue-simple.test.ts`, `packages/pipeline/src/paragraph-simple/evaluator.ts`, `packages/pipeline/src/paragraph-simple/evaluator.test.ts`
- 테스트 결과: `npm run build` 통과, `npm test -- packages/pipeline/src/paragraph-simple packages/app/src/server/dialogue-simple packages/app/src/client` 12파일 189개 통과·0 실패, `npm run typecheck:client` 통과. 외부 API 호출 없음.
- 남은 문제: 없음. 서랍 화면의 "원문 옮김 서버 판정" 표시는 선택 사항이라 넣지 않음.
