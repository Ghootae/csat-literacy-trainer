# 인계: 진단 답 입력 — 입력창 안 제출·근거 미입력 버튼, 마지막 문항 "답 다 냈어", 결론 버튼

- 날짜: 2026-11-10
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0226-diagnostic-answer-submit-buttons-conclusion.md` (D-0221 2번 일부 대체)

## 목표

이 작업이 끝나면 다음이 참이다. 모두 화면(클라이언트) 변경이며 서버 API는 그대로다.

### A. 답 입력 화면 `packages/app/src/client/diagnostic/AnswerScreen.tsx`

1. 근거 입력창 **안**(입력창 테두리 안쪽 아래, 오른쪽 정렬)에 작은 버튼 셋이 있다: [제출] [근거 미입력(확실)] [근거 미입력(잘 모르겠음)]. 지금의 별도 줄 `diag-omit-row`("확실해요"·"잘은 모르겠지만 정답 같음")는 없앤다.
   - 입력창과 버튼을 감싸는 상자를 하나 두고 그 상자에 입력창 모양의 테두리를 주는 방식이면 된다(textarea 위에 절대 위치로 덮지 말 것: 글이 가려짐).
2. 세 버튼은 누르면 **곧바로 그 문항 답을 확정**한다(지금 `confirmCurrent()`가 하는 일: 시간 멈춤 → `confirm(qid, body)` → 실패 시 시간 다시 잼).
   - [제출]: 선지를 골랐고 근거 글이 비어 있지 않을 때만 켜짐. 근거 글로 확정(`PROVIDED`).
   - [근거 미입력(확실)]/[근거 미입력(잘 모르겠음)]: 선지를 골랐을 때만 켜짐. 근거 없이 `SURE`/`UNSURE`로 확정(`OMITTED`). 입력창에 쓴 글이 있어도 보내지 않는다(지금 `body()`가 confidence가 있으면 text를 ''로 보내는 것과 같다).
   - 확신 버튼은 더 이상 토글이 아니다. 상태 `Answer.confidence`를 켜 두는 단계가 없어지므로, 확정 요청 본문을 만들 때 누른 버튼의 확신을 인자로 넘기는 식으로 바꾼다. 임시 저장(`persist`, 0.7초 자동 저장)은 선지+근거 글이 있을 때만 하면 된다. 서버에서 옛 `OMITTED` 임시 답(draft)이 와도 화면이 깨지지 않게만 한다(예: 선지만 복원, 글은 빈칸).
   - [제출]에 `data-rationale-submit` 속성을 둔다(`RationaleSymbolBar`의 ↓ 키 이동이 이것을 찾는다). 지금 "이 지문 답 다 냈어"에 붙은 속성은 뗀다.
   - 확정 중(`busy`)과 확정한 문항(`locked`)에서는 세 버튼 모두 비활성. 확정한 문항이면 지금처럼 "이미 낸 답이야"를 보인다.
3. 이동 버튼(맨 아래 `diag-actions`):
   - "이전 문항": 첫 문항이 아니면 제출 전에도 켜짐(지금과 같음). 이동 전 임시 저장도 지금과 같다.
   - "다음 문항": 지금 문항이 확정됐을 때만 켜지고 **이동만** 한다(확정하지 않는다). 마지막 문항에서는 보이지 않는다.
   - "이 지문 답 다 냈어": **마지막 문항에서만**, "다음 문항" 자리에 보인다. 모든 문항이 확정됐을 때 켜지고, 누르면 `done()`만 부른다(확정은 이미 [제출] 등으로 끝남).
4. "결론" 버튼: `RationaleSymbolBar`의 children으로 넘겨 기호 줄 끝에 둔다. lab(`packages/app/src/client/ProblemLabApp.tsx` 310~315행)과 같은 방식: `conclusionText(current.content.stem, chosen.position)`, `appendConclusion`, 선지를 고르기 전에는 비활성(data-hint "선지 고른 뒤 결론"), 누른 뒤 입력창 끝으로 포커스. 확정한 문항·busy에서는 비활성.

### B. 피드백 화면 `packages/app/src/client/diagnostic/FeedbackScreen.tsx`

5. 근거를 쓰는 입력(다시 고르기 `SELECT`, 근거 다시 묻기 `RATIONALE`)에서 기호 줄 끝에 같은 "결론" 버튼이 있다.
   - 선지: 다시 고르기면 지금 고른 `choice`, 근거 다시 묻기면 `choice ?? view.selectedChoiceId`. 발문은 `view.question.stem`. 선지가 없으면 비활성.
   - **교정 질문 답(`AWAITING_CORRECTION`, `CORRECT`)에서는 결론을 만들지 않아 버튼이 비활성**이다(lab과 같음: `conclusion = position && !correction ? ... : null`).
   - "근거 미제출" 토글 버튼과 그 동작은 그대로 둔다.

### C. 문구 정리

6. `packages/app/src/client/diagnostic/types.ts` 20행 주석의 버튼 이름, `packages/app/src/client/diagnostic/DevDiagnostic.tsx` 34행 표시 문구를 새 이름("근거 미입력(확실)"·"근거 미입력(잘 모르겠음)")으로 바꾼다.
7. 스타일은 `packages/app/src/client/diagnostic/diagnostic.css`에. 입력창 안 버튼은 작게(기호 줄 버튼 크기 정도), [제출]은 주 버튼 색. 휴대폰 폭에서 줄바꿈돼도 입력창 밖으로 나가지 않게.

## 범위 밖

- 서버(`packages/app/src/server/**`), API, 판정 지시문·규칙. 소거법 근거 판정(메모 5)은 다루지 않는다.
- lab 화면(`ProblemLabApp.tsx`)과 `RationaleSymbolBar`의 동작(결론 버튼을 children으로 넘기는 것 외에 고치지 않는다. 고쳐야 하면 멈추고 보고).
- 지문 결과 화면·등급(D-0218·D-0219·D-0222·D-0225), 개발자 이동 지도(D-0217)는 깨지지 않게만.
- 옛 인계 문서(`docs/handoffs/2026-11-09-*`)의 옛 문구는 고치지 않는다.

## 완료 조건

- [ ] A·B·C가 위대로 동작한다.
- [ ] `packages/app/e2e/diagnostic-flow.spec.ts`를 새 흐름으로 고친다: 답 내기는 [제출] 또는 [근거 미입력(확실)], 이동은 "다음 문항", 마지막은 [제출] 뒤 "이 지문 답 다 냈어". 다음을 확인하는 단언을 넣는다: 제출 전 "다음 문항" 비활성·"이전 문항" 활성(두 번째 문항 이후), 마지막 문항에서 "다음 문항"이 없고 "이 지문 답 다 냈어"가 제출 전 비활성·제출 뒤 활성, 확정한 문항에서 세 버튼 비활성, 결론 버튼이 고른 선지 문장을 붙임.
- [ ] 필요한 단위 시험(예: 확정 본문 만들기를 `logic.ts`로 뺐다면 `logic.test.ts`).
- [ ] `npm run build` 통과.
- [ ] `npm test` 통과(기존 실패 2건은 그대로 두고 그 2건만 실패인지 확인해 보고).
- [ ] Playwright 진단: 사용자의 개발 서버와 겹치지 않게 `PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5374`로 실행(D-0225 체크포인트), 진단 시험 모두 통과.
- [ ] 바뀐 답 입력 화면 사진(제출 전, 확정 뒤, 마지막 문항)을 `docs/review/diagnostic-answer-submit-buttons-2026-11-10/`에 저장(가짜 평가기로 띄운 화면이면 된다).

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 커밋하지 않는다(메인 세션이 검토 뒤 사용자 승인으로 커밋).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/app/src/client/diagnostic/{AnswerScreen.tsx, FeedbackScreen.tsx, logic.ts, logic.test.ts, types.ts, DevDiagnostic.tsx, diagnostic.css}`, `packages/app/e2e/{diagnostic-flow.spec.ts, diagnostic-dev-navigation.spec.ts}`, 사진 `docs/review/diagnostic-answer-submit-buttons-2026-11-10/`(4장).
- 테스트 결과: `npm run build` 통과. `npm test` 1729 통과·2 실패(기존 2건만: `boundary.test.ts`, `axis-architecture-experiment.test.ts`). Playwright(`PLAYWRIGHT_CLIENT_PORT=5393 CSAT_API_PORT=5374`) `diagnostic-flow.spec.ts` 2건·`diagnostic-dev-navigation.spec.ts` 1건 모두 통과.
- 인계 문서와 다르게 한 점·판단: (1) `toggleConfidence`는 쓸 곳이 없어 `logic.ts`와 그 단위 시험 줄을 지웠다. (2) `confirmCurrent`가 `busy`와 오류 표시를 직접 다룬다(확정 실패는 화면에 오류 문구로 남고 시간 다시 잼). (3) `diagnostic-dev-navigation.spec.ts`가 "이 지문 답 다 냈어" 보임으로 답 화면 도착을 확인했는데 첫 문항엔 이제 없어 [제출] 보임으로 바꿨다(인계에 없던 시험 수정). (4) 새 확정 본문 만들기는 `AnswerScreen` 안 `body(id, confidence)`에 두었고 `logic.ts`로 빼지 않아 새 단위 시험은 없다(`answerPayload` 기존 시험이 확신/근거 분기를 덮음).
- 남은 문제: 390px 폭 사진은 찍지 않았다(입력창 안 버튼은 flex-wrap으로 줄바꿈). 확정 직후 같은 문항에 머물러 "이미 낸 답이야"가 보이고 "다음 문항"으로 직접 이동한다(인계대로).
