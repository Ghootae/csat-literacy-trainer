# 인계: 외국어 출력 차단 + 문제 안내 문장 분기

- 날짜: 2026-10-29
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 근거: [다음 세션 인계 1·2번](./2026-10-29-next-session.md), [문제 FINDINGS](../experiments/student-sim-2026-10-29/mrna-prob/FINDINGS.md) 발견 3, [문단 FINDINGS](../experiments/student-sim-2026-10-29/mrna-para/FINDINGS.md) para-33. 문장·기준은 2026-10-29 사용자 승인.

## 목표

1. 학생에게 나가는 모델 문장이 한국어가 아니면(한글 비율 50% 미만) 검증 실패가 되고, 기존 재요청 경로로 다시 요청된다.
2. 문제 풀이 종료 안내(GATE) 문장이 판정기의 구분(재구성 가능 여부, UNCONFIRMED, insufficiencyKind)을 따른다.

## 범위 밖

- 지시문(.md) 파일, 스키마, 종료 사유(endReason)·결과(outcome) 값, 기록 형식은 바꾸지 않는다.
- 재요청 횟수 상한은 그대로(문단 `evaluateSimple` 최대 2회, 문제 `maxRetries`).
- 실모델 호출·외부 전송 없음. e2e가 `docs/handoffs/*.png`를 덮어쓰면 `git checkout HEAD -- <파일>`로 되돌린다.
- 세션 전부터 있던 미커밋 파일(AGENTS.md 등)과 이번 작업과 무관한 미커밋 파일은 건드리지 않는다.

## 손댈 파일과 계약

### 1. 한글 비율 검사

- 새 파일 `packages/pipeline/src/korean-text.ts`:
  - `hangulRatio(text: string): number` — `\p{L}` 글자 중 `\p{Script=Hangul}` 비율. 글자가 0개면 1.
  - `nonKoreanProblem(field: string, text: string): string | null` — 비율 < 0.5이면 다시 쓰기 지시를 담은 한국어 문제 문장을 돌려준다. 예: `${field}가 한국어가 아니다(한글 비율 0.00). 학생에게 보이는 모든 문장은 한국어로 쓴다.` 아니면 null.
  - 단위 시험 `korean-text.test.ts`: 중국어 "你答出了细胞膜会阻挡亲水物质通过这一点。"→실패, "mRNA 보호-> 세포내 진입"(0.64)→통과, "pH를 바꿔 mRNA를 세포 안으로…"→통과, 빈 문자열·기호만→통과, 영어 문장→실패.
- 문단: `packages/pipeline/src/paragraph-simple/rules.ts`의 `validateSimpleOutput`이 다음 칸을 검사해 문제 목록에 더한다: `message`, `gaps[].question`, `corePartSummaries[]`, `closingFeedback`(null 제외), `errors[].feedback`, `coreParts[].description`. 필드 이름은 경로로(예: `gaps[0].question`). 시험: 중국어 message가 문제로 잡히고, 첫 시도 중국어·두 번째 한국어면 `evaluateSimple`이 두 번째를 받아들이는지(기존 evaluator 시험 방식대로 가짜 evaluator).
- 문제: `packages/pipeline/src/problem-solving/feedback.ts`
  - `validateFeedbackAssessment`의 SELECTION 분기에서 실제로 보여 주는 질문(`validateQuestion`이 불리는 자리와 같은 조건: `s.selections.length === 1`일 때 `errors[].question`, mismatch면 `selectionMismatchQuestion`)에 한글 검사. 실패면 `throw new Error(문제 문장)`.
  - `applyFeedbackEndExplanation`의 세 칸(firstChoice, reselection(null 제외), answer)에 한글 검사, 실패면 throw.
  - 기존 재시도 루프(`feedback-evaluator.ts`)가 throw 메시지를 validationFeedback으로 넘기므로 루프는 고치지 않는다. 시험: 중국어 질문·중국어 설명이 throw되는지.

### 2. 안내 문장 분기 — `packages/app/src/server/problem-feedback.ts` `appendCoachMessages`의 `note` 계산(약 220~238행)

`sel` = `s.assessments.findLast(a => a.mode === 'SELECTION')`.

- **가.** `reason === 'RATIONALE_UNVERIFIABLE'`이고 `rationale === 'PROVIDED'`이고 `sel?.reconstructability === 'RECONSTRUCTABLE'`이면:
  `네가 어떻게 판단했는지는 알겠어. 다만 어디서 생각이 달라졌는지 하나로 짚기는 어려워서, 선지 내용을 원문과 같이 볼게.`
  그 밖의 RATIONALE_UNVERIFIABLE은 지금 문장 그대로.
  (확인: 근거 OMITTED이면서 RECONSTRUCTABLE인 경우가 가능한지 코드로 보고, 가능하면 OMITTED는 지금 문장 유지. 기존 시험 'supplement' 행은 보충 근거가 PROVIDED로 잡히는 경우이니 그 행이 RECONSTRUCTABLE인지 확인해 기대 문장을 맞춘다.)
- **나.** `reason === 'REPAIR_FAILED'`에서, 고치지 못한 항목(`[...s.errors, ...s.additionalErrors]` 중 status !== 'REPAIRED')에 `REMAINING`이 하나도 없으면(=모두 UNCONFIRMED):
  - 정답 선택: `네 근거에 고쳐야 할 부분이 있어서 질문했는데, 방금 답에서는 어떻게 생각했는지 확인하지 못했어. 더 묻지 않고 근거를 같이 정리해 볼게.`
  - 오답 선택: `네 답과 근거에 고쳐야 할 부분이 있어서 질문했는데, 방금 답에서는 어떻게 생각했는지 확인하지 못했어. 더 묻지 않고 정답을 먼저 알려 줄게.`
  - REMAINING이 하나라도 있으면 지금 문장 그대로. 고치지 못한 항목이 0개인 경우(verificationComplete=false 등)도 지금 문장 그대로.
- **다.** `reason === 'CORRECT_UNVERIFIED'`이고 RECONSTRUCTABLE이며 `sel.insufficiencyKind === 'JUDGMENT_METHOD'`이면:
  `네가 어떻게 골랐는지는 보였어. 다만 선지를 원문과 맞대어 판단하는 과정이 더 필요해서, 그 방법을 같이 볼게.`
  MISSING_LINK·NONE은 지금 문장, 재구성 불가도 지금 문장.
- 중첩 삼항이 길어지면 작은 함수(`gateNote(s)` 등)로 빼도 된다. 주변 코드 문체(영어 짧은 주석)를 따른다.
- 시험 `packages/app/src/server/problem-feedback.test.ts`: 기존 284·287~290·304~305행 근처 표 시험에 가·나·다 행을 더하고, 기존 행은 위 규칙상 기대가 바뀌는 경우에만 고친다(바뀌면 이유를 보고).

## 완료 조건

- [ ] 위 시험 추가, `npx vitest run packages/pipeline/src/korean-text.test.ts packages/pipeline/src/paragraph-simple packages/pipeline/src/problem-solving packages/app/src/server` 통과
- [ ] `npm test` 전체: 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`) 외 새 실패 없음(통과 수 보고)
- [ ] 타입 검사·빌드(`npm run build`) 통과
- [ ] 문제 e2e·문단 e2e는 이 문장을 확인하는 것이 있으면 맞춰 고치고 실행(격리 포트 규칙 따름). 없으면 실행만 하고 결과 보고.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/korean-text{,.test}.ts`(신규), `packages/pipeline/src/paragraph-simple/{rules,rules.test,evaluator.test}.ts`, `packages/pipeline/src/problem-solving/{feedback,feedback.test}.ts`, `packages/app/src/server/{problem-feedback,problem-feedback.test,dialogue-simple.test}.ts`, `packages/app/e2e/paragraph-praise-catch-tags.spec.ts`(가짜 출력 영어 자리표시자 → 한국어).
- 테스트 결과: 대상 단위 시험 719 통과. `npm test` 1486/1488(실패는 기존 2건). `npm run build` 통과. 문제 e2e 47 통과, 문단 e2e 4 통과. 함께 돌린 `dialogue-workbench.spec.ts` 2건 실패: `:171` 학생 정기 피드백은 10-22 인계에 기존 실패로 기록, 다른 1건은 옛 `/problem/dev/v4` 주소 기대(D-0173 이전 기대값) — 이번 변경과 무관.
- 확인 항목: OMITTED+RECONSTRUCTABLE은 불가(`unknown()`으로 바로 감) → OMITTED 문장 유지. 'supplement' 행은 판정 UNKNOWN이라 기대 문장 불변.
- 남은 문제: `scripts/run-v5-live-check.mjs:281`의 CORRECT_UNVERIFIED 점검이 "빠진 연결을 같이 채워 볼게"만 찾아, 재구성 가능 경우(이전부터)와 새 JUDGMENT_METHOD 문장에 오탐. 메인 세션 diff 검토 통과(2026-10-29).
