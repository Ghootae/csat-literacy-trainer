# 인계: 진단 답 입력 — [소거법] 버튼, '근거 불충분-소거법' 기록

- 날짜: 2026-11-11
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0228-diagnostic-elimination-button.md` (D-0226 위에 얹음)

## 목표

이 작업이 끝나면 다음이 참이다. 판정 지시문·판정 상태기계(`packages/pipeline/**`)는 바꾸지 않는다.

### A. 답 입력 화면 `packages/app/src/client/diagnostic/AnswerScreen.tsx`

1. 입력창 안 버튼이 넷이다: [제출] [근거 미입력(확실)] [근거 미입력(잘 모르겠음)] [소거법]. [소거법]은 근거 미입력 두 버튼과 같은 모양·같은 활성 조건(선지를 골랐을 때만, `busy`·확정 문항에서는 비활성)이다.
2. [소거법]을 누르면 곧바로 그 문항이 확정된다(`confirmCurrent`). 요청은 `rationale: { mode: 'OMITTED' }`, `confidence: 'ELIMINATION'`, `rationaleMs: null`. 입력창에 글이 있으면 그 글(`toSubmittedText` 적용 뒤 trim, 비면 null)을 새 필드 `eliminationNote`로 함께 보낸다. 다른 버튼은 `eliminationNote: null`(또는 생략).
3. 확정한 문항으로 돌아오면 지금처럼 읽기 전용이다. [소거법]으로 확정한 문항은 선지만 복원하고 입력창은 빈칸이면 된다.

### B. 서버 `packages/app/src/server/diagnostic/`

4. `store.ts`: `AnswerConfidence = 'SURE' | 'UNSURE' | 'ELIMINATION'`. `ItemAnswer`에 `eliminationNote?: string | null`. 옛 저장 파일(필드 없음)은 그대로 읽힌다.
5. `controller.ts` `DiagnosticItemRequestSchema`: `confidence`에 `'ELIMINATION'` 추가, `eliminationNote: z.string().trim().min(1).nullable().default(null)` 추가. 검사: `eliminationNote`는 `confidence === 'ELIMINATION'`일 때만 허용(아니면 400). 근거 생략 시 confidence 필수 검사(283행)는 ELIMINATION도 통과. 확정·임시 저장에 `eliminationNote`를 그대로 저장한다.
6. 피드백 세션에는 지금처럼 `SELECT` + `OMITTED`를 보낸다(파이프라인 변경 없음). 결과로: 정답이면 판정 없이 끝나고(`UNVERIFIED_CORRECT` 종료), 오답이면 근거 요청(`AWAITING_RATIONALE`, 진단 문구 `OMITTED_WRONG_RATIONALE_LINE`)으로 간다. 감점 대상 표시는 상태기계가 그대로 붙인다.
7. 범주 표 `answerCategory`(819행 부근): 근거 생략이면서 `confidence === 'ELIMINATION'`이고 정답이면 `'WEAK_CORRECT'`. 오답은 지금처럼 `'WRONG'`. SURE·UNSURE는 그대로.
   - 리뷰 대상은 바뀌지 않는다(WEAK_CORRECT는 비대상, 오답은 대상).
   - 사고 진단(`maybeStartDiagnosis`)·첫 선택 판정은 `PROVIDED`만 대상이므로 그대로 부르지 않는다.
8. 소거법 표시 노출: 지문 결과 카드 항목(`SummaryCardItem`, 379행 부근)과 최종 결과 항목(`ResultItem`, 915행 부근), 개발자 지도 문항 정보(499행 부근 draft/first 답)에 `elimination: boolean`(첫 응답 confidence가 ELIMINATION)을 더한다. 화면 타입 `packages/app/src/client/diagnostic/types.ts`도 맞춘다(`Confidence`에 'ELIMINATION', `Draft`·`ItemRequest`에 `eliminationNote`).

### C. 화면 표시

9. 학생 화면: 소거법 정답은 다른 근거 약한 정답과 똑같이 보인다(색·문구·비활성 버튼). "소거법"이라는 말은 보이지 않는다.
10. 개발자 모드(`?dev=1`): 내부 범주를 괄호로 보이는 곳(D-0218)에서 소거법 정답은 "(근거 불충분-소거법)"으로 보인다(예: 기존 WEAK_CORRECT 표기 뒤에 "-소거법"을 붙이는 식). `DevDiagnostic.tsx` 34행 답 문구는 ELIMINATION이면 `근거 미제출 · 소거법` + 메모가 있으면 ` · 메모: <eliminationNote>`.

## 범위 밖

- `packages/pipeline/**`(판정 지시문·상태기계·스키마), lab 화면(`ProblemLabApp.tsx`).
- 피드백 화면의 "근거 미제출" 버튼(오답 뒤 근거 다시 묻기)에는 소거법 버튼을 넣지 않는다.
- 근거 약한 정답의 마지막 설명 노출, 리뷰 대상 규칙, 등급·위치 계산.
- 결과 집계에서 소거법을 따로 세는 화면(기록만 남긴다).
- 커밋.

## 완료 조건

- [ ] 서버 단위 시험(가짜 평가기): ELIMINATION 정답 → 범주 WEAK_CORRECT, 판정 호출 없음, 리뷰 대상 아님, 피드백 열기 409; ELIMINATION 오답 → WRONG, 근거 요청 단계; `eliminationNote` 저장·응답의 `elimination` 표시; `eliminationNote`를 SURE/UNSURE/PROVIDED와 함께 보내면 400; 옛 저장 파일 읽기.
- [ ] 화면 단위 시험이 있으면(`logic.test.ts`의 `answerPayload` 등) ELIMINATION 경우 추가.
- [ ] `packages/app/e2e/diagnostic-flow.spec.ts`에 한 문항을 [소거법]으로 확정하는 단계와 단언(버튼 활성 조건, 확정 뒤 비활성)을 넣는다.
- [ ] `npm run build` 통과.
- [ ] `npm test` 통과(기존 실패 2건 `boundary.test.ts`·`axis-architecture-experiment.test.ts`만 실패인지 확인해 보고).
- [ ] Playwright 진단: `PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5374`로 실행, 진단 시험 모두 통과.
- [ ] 답 입력 화면 사진(버튼 넷) 한 장과 개발자 모드 지문 결과 사진 한 장을 `docs/review/diagnostic-elimination-button-2026-11-11/`에 저장(가짜 평가기 화면이면 된다).

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 파이프라인(`packages/pipeline/**`)을 고쳐야만 되는 것으로 보이면 멈추고 보고한다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: 서버 `packages/app/src/server/diagnostic/{controller,store}.ts`(+ 시험 `controller.test.ts`, `test-support.ts`), 화면 `packages/app/src/client/diagnostic/{AnswerScreen,DevDiagnostic,Pages,dev-api,logic,types}.ts(x)`(+ `logic.test.ts`), `packages/app/e2e/diagnostic-flow.spec.ts`, 사진 `docs/review/diagnostic-elimination-button-2026-11-11/{03e-answer-four-buttons-desktop,09-dev-result-desktop}.png`.
- 테스트 결과: `npm run build` 통과. `npm test` 1735 중 1733 통과, 실패 2건은 기존 `boundary.test.ts`(student-state.ts의 node:fs)·`axis-architecture-experiment.test.ts`뿐. 새 서버 시험 4건(소거법 정답·오답·400 검사·옛 파일)과 logic 시험 추가 통과. Playwright(`PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5374`, 진단 시험) 3건 모두 통과.
- 인계 문서와 다르게 한 점·판단: 없음(설계 변경 없음). 세부: `answerPayload`는 ELIMINATION일 때만 `eliminationNote`를 싣는다(기존 시험 호환). `answerDrafts` 응답(`Draft`)에는 eliminationNote를 넣지 않았다(화면 타입은 선택 필드로만 둠, 확정 문항은 입력창 빈칸). e2e에서는 14번 문항을 [소거법]으로 바꿨다(기존 "확신을 갖고 풀었어" 단언을 "근거에 문제가 없었어"로 교체, 개발자 모드 "(WEAK_CORRECT · 근거 약한 정답-소거법)" 단언 추가).
- 남은 문제: 없음. 커밋·memory 갱신은 하지 않았다.
