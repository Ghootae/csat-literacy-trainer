# 인계: 단순 형식 문단 개발자 모드 v3 (v2 사용 메모 1~5 반영)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0144-paragraph-simple-v3-closing-bubbles-highlights.md`(이 작업과 함께 작성), `memory/decisions/D-0142-paragraph-simple-v2-restated-summary-attempts.md`
- 피드백 원문: `docs/review/simple-holistic-dev-ui-feedback-2026-10-16/README.md`의 "v2 사용 메모" 1~5 (6은 범위 밖)
- 직전 인계(현재 구현의 계약): `docs/handoffs/2026-10-16-paragraph-simple-holistic-v2-feedback.md`

## 목표

프롬프트 v3(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v3.md`, 작성 완료 — 먼저 읽을 것)를 쓰고, 화면이 다음과 같이 된다.

1. **오류 바로잡기(CLOSE_ERRORS)** 말풍선이 차례로 분리된다: ① 도입(`message`) → ② 오류마다 하나(학생 발화 인용을 위에 작게, 아래에 `errors[].feedback`) → ③ 문단 핵심(`coreIntro` 아래 옅은 배경 상자 속 `coreSummary`).
2. **응답 없음(CLOSE_NO_RESPONSE)** 은 말풍선 하나: `message`(도입) 아래 옅은 배경 상자 속 `coreSummary`. 지문에 `coreSourceQuote` 문장을 표시한다.
3. **빠진 내용(CLOSE_GAP)**: AFTER_GAP 판정 입력에 `targetGap`을 넘긴다(문구 규칙은 프롬프트에 있음).
4. 표시 규칙: 칭찬이 아닌 마무리(CLOSE_GAP, CLOSE_ERRORS, CLOSE_NO_RESPONSE)면 항상 지문에 근거 문장을 표시한다.

## 범위 밖

- 프롬프트 v3 본문 수정(필요해 보이면 멈추고 보고). v1·v2·v2.1 파일은 지우지 않는다.
- 행동 표, 질문 횟수, 시도·메모·재구성 요약 칸(v2) 동작 변경.
- 모델 기본값(`PARAGRAPH_SIMPLE_OPENAI_MODEL` 기본 테라)은 그대로. 개발 서버는 환경 변수로 gpt-6-luna를 쓴다.
- 지문 인용이 한 문장인지 서버에서 검사하는 것(사용하며 관찰). 오류별 말풍선과 지문 표시를 잇는 것.
- 운영 V4, 보여 주기 모드, 문제 풀이 코드. 작업 트리의 무관한 미커밋 변경.

## 손댈 파일과 계약

### 파이프라인 `packages/pipeline/src/paragraph-simple/`

- `schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v3'`.
  - `SimpleErrorSchema`에 `feedback: z.string()` 추가(strict 유지).
  - `SimpleOutputSchema`에 `coreIntro: z.string().nullable()`, `coreSourceQuote: z.string().nullable()` 추가. 순서: … `message`, `coreIntro`, `coreSummary`, `coreSourceQuote`.
  - `SimpleEvaluationInput`에 `targetGap: { description: string; sourceQuote: string } | null` 추가(`targetError` 다음).
- `evaluator.ts`: `PROMPT_PATH`를 v3로.
- `rules.ts`
  - `validateSimpleOutput` 추가 검증:
    - `action=CLOSE_ERRORS`이면 모든 `errors[].feedback`이 비어 있지 않아야 하고, 그 밖이면 모든 `feedback`이 빈 문자열이어야 한다.
    - `coreIntro`: CLOSE_ERRORS에서만 비어 있지 않은 문자열이고 길이 60자 이하, 그 밖에는 null.
    - `coreSourceQuote`: CLOSE_NO_RESPONSE에서만 비어 있지 않은 대상 문단의 연속 부분 문자열, 그 밖에는 null.
    - 기존 `coreSummary` 검증 유지.
  - `applySimpleAction`: `CLOSE_NO_RESPONSE`는 `revealQuotes: [output.coreSourceQuote]`(null이면 빈 배열). 나머지 그대로.
- 테스트(`rules.test.ts`, `evaluator.test.ts`) 픽스처 갱신과 위 검증·표시의 테스트 추가.

### 공유 계약 `packages/app/src/shared/dialogue-simple.ts`

- `SimpleMessageView`에 선택 필드 추가: `quote?: string`(말풍선 위에 작게 보일 학생 발화 인용), `box?: string`(말풍선 안 옅은 배경 상자에 보일 문단 핵심).

### 서버 `packages/app/src/server/dialogue-simple.ts`

- `evaluate` 입력에 `targetGap: p.state.stage === 'AFTER_GAP' ? p.state.targetGap : null`.
- 튜터 말풍선 만들기:
  - CLOSE_ERRORS: `{ text: message, label: '바로잡기' }` → 오류마다 `{ text: e.feedback, quote: e.studentQuote, label: '바로잡기' }` → `{ text: coreIntro, box: coreSummary, label: '문단 핵심' }`.
  - CLOSE_NO_RESPONSE: `{ text: message, box: coreSummary, label: '문단 핵심' }` 하나.
  - 그 밖의 행동: 지금과 같음.
- 모델 입력 `dialogue`에는 계속 `{ role, text }`만 넣는다(`quote`·`box` 제외).
- 지문 표시는 기존 경로(`revealQuotes` → `highlights`) 그대로. CLOSE_NO_RESPONSE도 이제 표시된다.

### 클라이언트

- `SimpleDialogueApp.tsx`: 말풍선 렌더에서 `quote`가 있으면 라벨 아래·본문 위에 작은 인용(“…”)으로, `box`가 있으면 본문 아래 옅은 배경 상자로. 서랍의 시도 대화(`SimpleDialogueDrawer.tsx`)도 같은 렌더를 쓰도록 공용 컴포넌트로 뽑아도 된다.
- `SimpleDialogueDrawer.tsx` 단계 카드: 오류마다 `feedback`, 그리고 `coreIntro`, `coreSourceQuote`를 표시.
- `simple-dialogue.css`: `.simple-bubble-quote`(작은 글씨, 흐린 색, 왼쪽 선), `.simple-bubble-box`(옅은 배경, 둥근 모서리, 안쪽 여백; 지문 미색 `#fff3d6`과 구분되는 옅은 회녹색 계열).

## 완료 조건

- [ ] 서버 테스트에 추가: CLOSE_ERRORS 말풍선 순서·개수(오류 2개면 도입+2+핵심=4)와 `quote`·`box`, CLOSE_NO_RESPONSE 말풍선 하나와 `box`·지문 표시, AFTER_GAP 입력에 `targetGap`(다른 단계는 null), 모델 입력 dialogue에 `quote`·`box` 없음.
- [ ] 파이프라인 테스트에 추가: feedback·coreIntro·coreSourceQuote 검증(통과·실패 각각), CLOSE_NO_RESPONSE `revealQuotes`.
- [ ] paragraph-simple·dialogue-simple 테스트 전부 통과, 전체 `npm test`는 기존 무관 실패 2건(boundary.test의 student-state.ts, axis-architecture ENOENT) 외 새 실패 없음.
- [ ] `npm run typecheck`, `npm run build` 통과.
- [ ] 변경 파일에 TODO·skip·only·스텁 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 모의 평가기로만 테스트한다.
- 실행 중인 개발 서버(포트 5173~5175)를 멈추거나 재시작하지 않는다. 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/paragraph-simple/{schema,rules,evaluator}.ts`, `rules.test.ts`, `evaluator.test.ts`; `packages/app/src/shared/dialogue-simple.ts`; `packages/app/src/server/dialogue-simple.ts`, `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`; `packages/app/src/client/{SimpleDialogueApp,SimpleDialogueDrawer}.tsx`, `simple-dialogue.css`. 말풍선 공용 컴포넌트 `SimpleBubble`은 `SimpleDialogueDrawer.tsx`에서 내보내 앱도 쓴다.
- 테스트 결과: paragraph-simple 44개, dialogue-simple(+http) 28개 통과(합 72). 전체 `npm test` 1278 통과 / 2 실패(기존 무관 2건: boundary.test, axis-architecture). `npm run typecheck`, `npm run build` 통과.
- 남은 문제: 없음. `@csat/pipeline`이 dist를 쓰므로 build가 dist를 갱신했다(서버 재시작은 하지 않음 — 실행 중 서버는 재시작해야 v3가 적용된다).
