# 인계: 단순 형식 문단 개발자 모드 v4.1 (조각 답을 질문과 합쳐 읽기, 물은 항목 빠짐없이 응답)

- 날짜: 2026-10-17
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0145-paragraph-simple-multi-gap-questions.md`("보완 v4.1" 절)
- 근거·시험: `docs/review/simple-holistic-dev-ui-feedback-2026-10-16/README.md` "v4 사용 메모" 1, 시험 스크립트 `.omc/artifacts/simple-holistic-probe/probe-v41.mjs`(새 필드 스키마와 추가 검증의 참고 구현)
- 직전 인계(현재 구현의 계약): `docs/handoffs/2026-10-17-paragraph-simple-holistic-v4.md`

## 목표

프롬프트 v4.1(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.1.md`, 작성·시험 완료 — 먼저 읽을 것)을 쓰고 다음이 참이 된다.

1. 출력에 `targetGapReadings`, `errors[].gapIndex`, `missingNote`가 있고 서버가 검증한다.
2. 구멍 질문 뒤(AFTER_GAP) CLOSE_ERRORS는 물은 항목을 빠짐없이 다룬다: 도입 → 오류마다 바로잡기 → (`missingNote`가 있으면) 빠진 내용 → 문단 핵심. 지문 표시는 오류 근거 문장 + 오류도 채움도 아닌 항목의 근거 문장.
3. 서랍 단계 카드에서 항목별 읽기(`targetGapReadings`), 오류의 `gapIndex`, `missingNote`를 볼 수 있다.

## 범위 밖

- 프롬프트 v4.1 본문 수정(필요해 보이면 멈추고 보고). 이전 프롬프트 파일은 지우지 않는다.
- 행동 표, 질문 상한, 그 밖의 행동의 말풍선 구성, 시도·메모·재구성 요약 칸.
- 모델 기본값(코드 기본 테라, 개발 서버는 환경 변수로 gpt-6-luna).
- 운영 V4, 보여 주기 모드, 문제 풀이, 다른 세션의 미커밋 변경.

## 손댈 파일과 계약

### 파이프라인 `packages/pipeline/src/paragraph-simple/`

- `schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v4.1'`.
  - `SimpleErrorSchema`: `sourceQuote` 다음에 `gapIndex: z.number().int().nullable()` 추가.
  - `SimpleOutputSchema`: `targetGapsFilled` 앞에 `targetGapReadings: z.array(z.string()).nullable()`, `coreSummary` 다음에 `missingNote: z.string().nullable()` 추가. 필드 순서는 시험 스크립트의 `Out`과 같게 해도 된다.
- `evaluator.ts`: `PROMPT_PATH`를 v4.1로.
- `rules.ts` `validateSimpleOutput` 추가(기존 유지):
  - `targetGapReadings`: stage=AFTER_GAP이면 `targetGaps`와 같은 길이의 배열, 그 밖이면 null.
  - `errors[i].gapIndex`: stage=AFTER_GAP이면 null 또는 0 이상 `targetGaps.length` 미만 정수, 그 밖이면 null. gapIndex가 k인 오류가 있으면 `targetGapsFilled[k]`는 false.
  - `missingNote`: stage=AFTER_GAP이고 action=CLOSE_ERRORS이며 "`targetGapsFilled[k]`가 false이고 gapIndex=k인 오류가 없는 k"가 하나라도 있으면 비어 있지 않은 문자열, 그 밖이면 null.
- `rules.ts` `applySimpleAction`의 CLOSE_ERRORS: `revealQuotes` = 오류들의 `sourceQuote` + (stage=AFTER_GAP일 때) 위 "오류도 채움도 아닌 k"의 `state.targetGaps[k].sourceQuote`, 중복 제거. 이를 위해 판정 시점 stage를 알 수 있어야 한다(`state.stage`가 판정 시점 stage이므로 그대로 쓰면 된다).
- 테스트: 픽스처 갱신(`gapIndex`, `targetGapReadings`, `missingNote`), 위 검증의 통과·실패와 CLOSE_ERRORS 표시 구절 테스트. 시험 3사례(둘 다 틀림 / 둘째만 틀림 / 첫째 틀림·둘째 모름)의 출력 형태를 모의 출력으로 써도 된다(`.omc/artifacts/simple-holistic-probe/case-v41-*.gpt-6-luna.v41.out.json`의 `output`).

### 서버 `packages/app/src/server/dialogue-simple.ts`

- `tutorMessages`의 CLOSE_ERRORS: 도입 → 오류마다 → `missingNote`가 있으면 `{ text: missingNote, label: '빠진 내용' }` → 문단 핵심.
- 그 밖에는 변경 없음.

### 클라이언트 `packages/app/src/client/SimpleDialogueDrawer.tsx`

- 단계 카드: 물은 빈 곳마다 "질문 / 학생 답 읽기 / 채움" 한 줄씩(`targetGapReadings[i]`가 빈 문자열이면 "(읽을 답 없음)"), 오류에 `gapIndex`가 있으면 "질문 n번"으로 표시, `missingNote` 표시.

## 완료 조건

- [ ] 서버 테스트: AFTER_GAP CLOSE_ERRORS에서 `missingNote` 있으면 말풍선 순서 도입 → 오류 → 빠진 내용 → 문단 핵심, 없으면 기존 순서; 지문 표시에 오류 문장과 다뤄지지 않은 항목 문장이 함께.
- [ ] 파이프라인 테스트: 새 검증 통과·실패, CLOSE_ERRORS revealQuotes.
- [ ] paragraph-simple·dialogue-simple 테스트 전부 통과, 전체 `npm test`는 기존 무관 실패 2건(boundary.test의 student-state.ts, axis-architecture ENOENT) 외 새 실패 없음.
- [ ] `npm run typecheck`, `npm run build` 통과.
- [ ] 변경 파일에 TODO·skip·only·스텁 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 모의 평가기로만 테스트한다.
- 실행 중인 개발 서버(포트 5173~5175)를 멈추거나 재시작하지 않는다. 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/paragraph-simple/{schema,evaluator,rules}.ts`, `rules.test.ts`, `evaluator.test.ts`; `packages/app/src/server/dialogue-simple.ts`, `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`; `packages/app/src/client/SimpleDialogueDrawer.tsx`
- 테스트 결과: paragraph-simple·dialogue-simple(http 포함) 4파일 83건 통과. 전체 `npm test` 1291건 중 1289 통과, 실패 2건은 기존 무관(boundary.test, axis-architecture ENOENT). `npm run typecheck`, `typecheck:client`, `npm run build` 통과.
- 남은 문제: 없음. 설계 이탈 없음(CLOSE_ERRORS 표시 구절의 "채움 false"는 `targetGapsFilled[k] === false`로 판정, null이면 추가 표시 없음).
