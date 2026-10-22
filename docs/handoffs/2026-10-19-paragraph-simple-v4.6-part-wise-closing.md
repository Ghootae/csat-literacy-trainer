# 인계: 단순 형식 v4.6 — 마무리를 "전체 피드백 + 부분별 문단 핵심"으로

- 날짜: 2026-10-19
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0149-paragraph-simple-v45-central-operational.md`(v4.5 중심 운영, 명백한 문제만 부분 수정), `memory/decisions/D-0145-paragraph-simple-multi-gap-questions.md`

## 배경(사용자 결정, 2026-10-19)

질문을 거친 마무리 말풍선 구성을 바꾼다.

- 적용 범위: 질문 뒤 PRAISE, CLOSE_GAP, CLOSE_ERRORS, CLOSE_NO_RESPONSE 모두("모두 적용").
- 말풍선 구성: 마지막 말풍선 하나에 전체 피드백 문장을 쓰고, 그 아래 부분별 핵심 상자를 둔다. 별도 도입 문장(`coreIntro`)은 없앤다("권고대로").
- 부분 문장: 마무리 때 모델이 기준 핵심 부분과 같은 개수·순서로 학생용 문장을 새로 쓴다(`corePartSummaries`). `coreParts[].description`(개발자용)은 그대로 둔다("권고대로").
- 기존 한 문단 요약 상자(`coreSummary`)는 부분별 목록으로 대체한다(예시 확인 후 "진행").

프롬프트 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.6.md`는 Claude가 이미 작성했다. **프롬프트는 수정하지 않는다.**

## 목표

- 판정 출력 계약에서 `coreIntro`, `coreSummary`, `missingNote`를 없애고 `corePartSummaries: string[]`, `closingFeedback: string | null`을 더한다. 버전은 `paragraph-simple-holistic-v4.6`이다.
- 서버 말풍선(`tutorMessages`)을 아래 표처럼 바꾼다.
- 학생 화면 말풍선은 부분 목록을 번호 목록 상자로 그린다. 개발자 서랍은 새 필드를 보여 준다.
- 시뮬레이션 스크립트와 기대 말풍선을 새 구성에 맞춘다.

| 행동(단계) | 말풍선(순서) |
|---|---|
| PRAISE (INITIAL·RETRY) | 지금과 같음: `message` 한 말풍선, label `피드백`, 상자 없음 |
| PRAISE (AFTER_CORRECTION·AFTER_GAP) | `{ text: message, parts: corePartSummaries, label: '피드백' }` 하나 |
| CLOSE_GAP | `{ text: message, parts: corePartSummaries, label: '빠진 내용' }` 하나 |
| CLOSE_ERRORS | `{ text: message, label: '바로잡기' }` → 오류마다 `{ text: feedback, quote: studentQuote, label: '바로잡기' }` → `{ text: closingFeedback, parts: corePartSummaries, label: '바로잡기' }` |
| CLOSE_NO_RESPONSE | `{ text: message, parts: corePartSummaries, label: '문단 핵심' }` 하나 |
| 그 밖 | 지금과 같음 |

## 범위 밖

- 프롬프트 v4.6 파일, v4.5 이하 프롬프트 파일.
- 판정 행동 표, 복사 감지(`copy.ts`), 핵심 부분 결정 규칙, `revealQuotes`(지문 표시) 규칙, `coreSourceQuote`.
- 문제 풀이(`problem-solving/…`, `problem-feedback-v4…`) 등 다른 작업 파일. 작업 트리에 다른 세션의 미커밋 변경이 있으니 건드리지 않는다.
- 외부 API 호출(시뮬레이션 실행 포함). 실행은 Claude가 한다.
- 커밋.

## 손댈 파일과 계약

- `packages/pipeline/src/paragraph-simple/schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v4.6'`, 주석의 프롬프트 경로를 v4.6으로.
  - `SimpleOutputSchema`에서 `coreIntro`, `coreSummary`, `missingNote`를 지운다. `corePartSummaries: z.array(z.string())`, `closingFeedback: z.string().nullable()`를 더한다(`coreSourceQuote` 앞 자리면 된다).
- `packages/pipeline/src/paragraph-simple/evaluator.ts`: `PROMPT_PATH`를 v4.6으로.
- `packages/pipeline/src/paragraph-simple/rules.ts`(`checkSimpleOutput` 끝부분)
  - `missingNote`, `coreSummary`, `coreIntro` 검증을 지운다.
  - `needsSummary`(CLOSE_ERRORS·CLOSE_NO_RESPONSE·CLOSE_GAP·질문 뒤 PRAISE, 기존 정의 그대로)면 `corePartSummaries.length === parts.length`이고 모든 항목이 공백이 아니어야 한다. `parts`는 함수 위쪽에서 이미 쓰는 기준 핵심 부분(INITIAL이면 `output.coreParts`, 아니면 `input.coreParts`)이다. 그 밖에는 빈 배열이어야 한다. 문제 문구 예: `corePartSummaries는 CLOSE_ERRORS·CLOSE_NO_RESPONSE·CLOSE_GAP·질문 뒤 PRAISE에서 기준 핵심 부분과 같은 개수의 비어 있지 않은 문장이고 그 밖에는 빈 배열이어야 한다.`
  - `action === 'CLOSE_ERRORS'`면 `closingFeedback`이 공백이 아닌 문자열이고, 그 밖에는 null이어야 한다.
  - `needsNote`/`uncovered` 계산은 더 쓰이지 않으면 지운다(물은 항목 응답 의무는 프롬프트의 `closingFeedback` 지시로 옮겨졌다).
- `packages/pipeline/src/paragraph-simple/*.test.ts`: 새 계약에 맞게 고치고 다음을 더한다.
  - 질문 뒤 PRAISE/CLOSE_GAP/CLOSE_ERRORS/CLOSE_NO_RESPONSE에서 `corePartSummaries` 개수가 핵심 부분 수와 다르면 실패, 같으면 통과.
  - INITIAL PRAISE에 `corePartSummaries`가 있으면 실패.
  - CLOSE_ERRORS에 `closingFeedback`이 null이면 실패, 다른 행동에 값이 있으면 실패.
  - 버전 문자열 v4.6.
- `packages/app/src/shared/dialogue-simple.ts`: `SimpleMessageView`의 `box?: string`을 `parts?: string[]`로 바꾸고 주석을 고친다.
- `packages/app/src/server/dialogue-simple.ts`: `tutorMessages`를 위 표대로 바꾸고 함수 주석을 고친다. `core()` 도우미는 지운다.
- `packages/app/src/server/*.test.ts`(dialogue-simple 관련): 모의 출력과 말풍선 기대를 새 계약에 맞춘다.
- `packages/app/src/client/SimpleDialogueDrawer.tsx`
  - `SimpleBubble`: `m.box` 대신 `m.parts`가 있으면 기존 `simple-bubble-box` 상자 안에 `<ol>` 번호 목록으로 그린다(각 부분 한 `<li>`).
  - 개발자 서랍 출력 표시: `coreIntro`/`coreSummary`/`missingNote` 줄을 지우고 `corePartSummaries`(번호 목록)와 `closingFeedback`을 보인다. 출력 타입 정의도 맞춘다.
- `packages/app/src/client/simple-dialogue.css`: 상자 안 `<ol>` 여백을 다듬는다(예: `.simple-bubble-box ol { margin: 0; padding-left: 1.2em; }`, 항목 간 간격 약간).
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/run.mjs`
  - `bubblesOf`: 질문 뒤 PRAISE `['피드백(상자)']`, INITIAL·RETRY PRAISE `['피드백']`, CLOSE_GAP `['빠진 내용(상자)']`, CLOSE_ERRORS `['바로잡기(도입)', ...오류마다 '바로잡기', '바로잡기(마무리+상자)']`, CLOSE_NO_RESPONSE `['문단 핵심(도입+상자)']`.
  - `actual`에서 `missingNote`, `coreIntro`, `coreSummary`를 빼고 `corePartSummaries`, `closingFeedback`을 넣는다. `check.missingNote`를 지우고, REVIEW 키 목록과 REVIEW 줄(빠진 내용·핵심 줄)을 새 필드로 바꾼다(`핵심 부분 문장: 1. … 2. …`, `마무리: …`).
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/build.mjs`: 기대 `bubbles`를 위 `bubblesOf` 문자열과 같게 바꾼다(`['문단 핵심', '피드백']` → `['피드백(상자)']`, `['문단 핵심', '빠진 내용']` → `['빠진 내용(상자)']`, CLOSE_ERRORS의 끝 `'빠진 내용'`(있으면)과 `'문단 핵심'` → `'바로잡기(마무리+상자)'` 하나). `missingNote` 기대 필드는 지워도 되고 남겨도 된다(대조에 쓰지 않는다). `points`의 "문단 핵심 공개 뒤" 같은 문구는 새 구성에 맞게 고친다. 파일 머리 주석에 2026-10-19(3) 변경 한 줄을 더한다. 실행해 `cases.json`, `SIMULATION.md`를 다시 만든다.

## 완료 조건

- [ ] `npm run build` 통과(타입 오류 없음), `npm run typecheck:client` 통과
- [ ] `npx vitest run packages/pipeline/src/paragraph-simple packages/app/src/server` 통과
- [ ] `grep -rn "coreSummary\|coreIntro\|missingNote" packages/pipeline/src/paragraph-simple packages/app/src docs/experiments/simple-holistic-path-simulation-2026-10-17/run.mjs`의 결과가 없음
- [ ] `node docs/experiments/simple-holistic-path-simulation-2026-10-17/build.mjs` 실행 후 `cases.json`의 모든 기대 `bubbles`가 새 문자열만 씀(`'문단 핵심'` 단독 항목 없음)
- [ ] 변경 파일 목록이 이 문서의 "손댈 파일"을 벗어나지 않음

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/paragraph-simple/{schema,evaluator,rules}.ts`, `{rules,evaluator}.test.ts`; `packages/app/src/shared/dialogue-simple.ts`, `packages/app/src/server/dialogue-simple.ts`, `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`; `packages/app/src/client/SimpleDialogueDrawer.tsx`, `simple-dialogue.css`; `docs/experiments/simple-holistic-path-simulation-2026-10-17/{run.mjs,build.mjs,cases.json,SIMULATION.md}`
- 테스트 결과: `npm run build`, `npm run typecheck:client` 통과. `npx vitest run packages/pipeline/src/paragraph-simple packages/app/src/server` 16 파일 195 테스트 통과. 금지어 grep 결과 없음. build.mjs 재실행(145 사례), cases.json의 기대 bubbles에 `'문단 핵심'` 단독·`'빠진 내용'` 단독 항목 없음.
- 남은 문제: (1) `dialogue-simple.test.ts`의 입력 키 목록 단언이 v4.5의 `sourceCopyDetected`를 빠뜨려 이미 실패하던 것을 키 하나 추가해 고쳤다(v4.6과 무관한 기존 불일치). (2) 테스트의 `fit()` 도우미가 `corePartSummaries`를 기준 부분 수에 맞춰 채운다(모의 출력이 검증을 통과하도록). (3) build.mjs의 `missingNote` 기대 필드는 남겼고 SIMULATION.md 출력에서만 뺐다. (4) 테스트 안 `metadata.promptVersion` 모의 문자열은 그대로 두었다.
