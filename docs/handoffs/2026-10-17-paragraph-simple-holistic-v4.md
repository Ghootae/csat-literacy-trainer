# 인계: 단순 형식 문단 개발자 모드 v4 (구멍 번호 질문, 질문 뒤 핵심 공개)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0145-paragraph-simple-multi-gap-questions.md`(필독), `D-0144`, `D-0140`
- 규칙·예시 기준: 아티팩트 "단순 형식 문단 규칙 v4 예시" https://claude.ai/artifact/NMYnQmgdUqaRP8BQ9mz3BJ (사용자 확인 완료). 같은 내용이 D-0145에 있다.
- 직전 인계(현재 구현의 계약): `docs/handoffs/2026-10-17-paragraph-simple-holistic-v3.md`

## 목표

프롬프트 v4(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.md`, 작성 완료 — 먼저 읽을 것)를 쓰고 다음이 참이 된다.

1. GAP_QUESTION은 한 말풍선: `message`(리액션 + 연결 말) 아래 `gaps[].question`이 번호 목록(1~2개).
2. AFTER_GAP 판정 입력에 물었던 빈 곳 목록 `targetGaps`가 들어가고, 출력 `targetGapsFilled`로 항목별 채움을 받는다.
3. 질문을 거친 마무리(stage가 AFTER_CORRECTION·AFTER_GAP인 PRAISE, CLOSE_GAP, CLOSE_ERRORS)는 항상 문단 핵심 말풍선(`coreIntro` + 상자 `coreSummary`)을 포함한다.
   - PRAISE(질문 뒤): 문단 핵심 → 피드백(`message`).
   - CLOSE_GAP: 문단 핵심 → 빠진 내용(`message`). 지문 표시는 `targetGapsFilled=false`인 `targetGaps[].sourceQuote`.
   - CLOSE_ERRORS: 지금과 같음.
4. INITIAL·RETRY의 PRAISE는 지금처럼 `message`만(핵심 없음).

## 범위 밖

- 프롬프트 v4 본문 수정(필요해 보이면 멈추고 보고). v1~v3·v2.1 파일은 지우지 않는다.
- 행동 이름, 행동 표(`expectedAction`), 질문 상한 2회, CLOSE_ERRORS·CLOSE_NO_RESPONSE·RETRY_PROMPT·CORRECTION_QUESTION 동작, 시도·메모·재구성 요약 칸.
- 모델 기본값(코드 기본 테라, 개발 서버는 환경 변수로 gpt-6-luna).
- 운영 V4, 보여 주기 모드, 문제 풀이 코드, 작업 트리의 무관한 미커밋 변경(다른 세션의 memory/·분석 지도 파일 포함).

## 손댈 파일과 계약

### 파이프라인 `packages/pipeline/src/paragraph-simple/`

- `schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v4'`.
  - `SimpleGapSchema = z.object({ description: z.string(), sourceQuote: z.string(), question: z.string() }).strict()`.
  - `SimpleOutputSchema`: `gap` 필드를 **삭제**하고 `gaps: z.array(SimpleGapSchema)` 추가. `targetErrorResolved` 다음에 `targetGapsFilled: z.array(z.boolean()).nullable()` 추가. 나머지 필드 유지.
  - `SimpleEvaluationInput`: `targetGap`을 `targetGaps: SimpleGap[] | null`로 바꾼다.
- `evaluator.ts`: `PROMPT_PATH`를 v4로.
- `rules.ts`
  - `expectedAction`: 변경 없음.
  - `validateSimpleOutput`(기존 검증 중 `gap` 관련을 아래로 대체, 나머지 유지):
    - `gaps`: action=GAP_QUESTION이면 길이 1~2, 각 `description`·`question` 비어 있지 않음, `sourceQuote`는 대상 문단의 연속 부분 문자열. 그 밖의 action이면 빈 배열.
    - `targetGapsFilled`: stage=AFTER_GAP이면 배열이고 길이가 `input.targetGaps.length`와 같음, 그 밖이면 null.
    - stage=AFTER_GAP 일관성: errors가 비어 있고 category가 CAPTURED면 모두 true, GAP이면 하나 이상 false, IRRELEVANT·COPY면 모두 false.
    - "질문 뒤" = stage ∈ {AFTER_CORRECTION, AFTER_GAP}.
    - `coreIntro`: action이 CLOSE_ERRORS, CLOSE_GAP, 또는 (질문 뒤 PRAISE)이면 비어 있지 않은 60자 이하 문자열, 그 밖이면 null.
    - `coreSummary`: action이 CLOSE_ERRORS, CLOSE_NO_RESPONSE, CLOSE_GAP, 또는 (질문 뒤 PRAISE)이면 비어 있지 않은 문자열, 그 밖이면 null.
    - `coreSourceQuote`, `errors[].feedback` 검증은 v3 그대로.
  - `SimpleParagraphState`: `targetGap`을 `targetGaps: SimpleGap[]`(초기 빈 배열)로 바꾼다.
  - `applySimpleAction`:
    - GAP_QUESTION: `targetGaps: output.gaps`, 질문 수 +1(상한 검사 유지).
    - CLOSE_GAP: `revealQuotes` = `state.targetGaps` 중 `output.targetGapsFilled[i] === false`인 항목의 `sourceQuote`(중복 제거). `targetGapsFilled`가 null이면 모든 `targetGaps`.
    - 나머지 그대로.
- 테스트(`rules.test.ts`, `evaluator.test.ts`): 픽스처를 v4 스키마로 갱신하고 위 검증·상태 전이를 통과·실패 각각 테스트.

### 공유 계약 `packages/app/src/shared/dialogue-simple.ts`

- `SimpleMessageView`에 선택 필드 `items?: string[]`(말풍선 안 번호 목록) 추가.

### 서버 `packages/app/src/server/dialogue-simple.ts`

- `evaluate` 입력: `targetGaps: p.state.stage === 'AFTER_GAP' ? p.state.targetGaps : null`.
- `tutorMessages` (stage는 판정 시점의 `p.state.stage`를 넘겨 "질문 뒤"를 판단):
  - GAP_QUESTION: `{ text: message, items: gaps.map(g => g.question), label: '생각해 보기' }` 하나.
  - PRAISE, 질문 뒤: `{ text: coreIntro, box: coreSummary, label: '문단 핵심' }` → `{ text: message, label: '피드백' }`.
  - PRAISE, INITIAL·RETRY: 지금처럼 `{ text: message, label: '피드백' }`.
  - CLOSE_GAP: `{ text: coreIntro, box: coreSummary, label: '문단 핵심' }` → `{ text: message, label: '빠진 내용' }`.
  - CLOSE_ERRORS·CLOSE_NO_RESPONSE·그 밖: 지금과 같음.
- 모델 입력 `dialogue`의 튜터 발화 텍스트: `items`가 있으면 `text + '\n' + items.map((q, i) => `${i + 1}. ${q}`).join('\n')`, 없으면 `text`(`box`·`quote`는 계속 제외). 모델이 번호 질문을 볼 수 있어야 한다.
- 지문 표시는 기존 경로(`revealQuotes` → `highlights`) 그대로.

### 클라이언트

- `SimpleBubble`(`SimpleDialogueDrawer.tsx`): `items`가 있으면 본문 아래 `<ol>`로 렌더.
- `SimpleDialogueDrawer.tsx` 단계 카드: `gap` 표시를 `gaps` 목록(설명·질문·원문)으로, `targetGapsFilled`를 "물은 빈 곳 채움: [true, false]"처럼 표시.
- `simple-dialogue.css`: 말풍선 안 `ol` 여백 정리.

## 완료 조건

- [ ] 서버 테스트 추가: GAP_QUESTION 말풍선 하나와 `items`; AFTER_GAP 입력의 `targetGaps`(다른 단계 null); 모델 입력 dialogue의 번호 질문 텍스트 포함과 `items`·`box`·`quote` 키 없음; 질문 뒤 PRAISE 말풍선 둘(문단 핵심 → 피드백)과 INITIAL PRAISE 하나; CLOSE_GAP 말풍선 둘과 못 채운 빈 곳만 지문 표시; AFTER_CORRECTION 고침+구멍 → GAP_QUESTION(번호 목록) → AFTER_GAP 흐름.
- [ ] 파이프라인 테스트: gaps·targetGapsFilled·AFTER_GAP 일관성·coreIntro/coreSummary 새 조건의 통과·실패, CLOSE_GAP revealQuotes.
- [ ] paragraph-simple·dialogue-simple 테스트 전부 통과, 전체 `npm test`는 기존 무관 실패 2건(boundary.test의 student-state.ts, axis-architecture ENOENT) 외 새 실패 없음(다른 세션 변경으로 생긴 실패는 구분해 보고).
- [ ] `npm run typecheck`, `npm run build` 통과.
- [ ] 변경 파일에 TODO·skip·only·스텁 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 모의 평가기로만 테스트한다.
- 실행 중인 개발 서버(포트 5173~5175)를 멈추거나 재시작하지 않는다. 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/paragraph-simple/{schema,rules,evaluator}.ts`, 같은 폴더 `rules.test.ts`·`evaluator.test.ts`; `packages/app/src/shared/dialogue-simple.ts`; `packages/app/src/server/dialogue-simple.ts`·`dialogue-simple.test.ts`·`dialogue-simple-http.test.ts`; `packages/app/src/client/SimpleDialogueDrawer.tsx`·`simple-dialogue.css`. 프롬프트 v4 본문과 `SimpleDialogueApp.tsx`는 수정 없음.
- 테스트 결과: paragraph-simple 47개 + dialogue-simple(http 포함) 32개 = 79개 통과. 전체 `npm test` 1285 통과 / 2 실패(기존 무관 실패 2건만: boundary.test student-state.ts, axis-architecture-experiment). `npm run typecheck`, `npm run build`, `typecheck:client` 통과.
- 남은 문제: 없음. 설계 충돌 없이 인계대로 구현. CLOSE_GAP의 `targetGapsFilled`가 null이면 모든 `targetGaps`를 표시한다(인계 문구대로). 검증상 AFTER_GAP의 CAPTURED/GAP 일관성은 errors가 비어 있을 때만 검사한다.
