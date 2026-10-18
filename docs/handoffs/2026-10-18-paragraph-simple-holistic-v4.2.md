# 인계: 단순 형식 문단 개발자 모드 v4.2 (핵심 부분 고정, 오류 단위, 질문 자가 점검)

- 날짜: 2026-10-18
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0145-paragraph-simple-multi-gap-questions.md`("보완 v4.2" 절, 이 작업과 함께 작성)
- 근거: `docs/experiments/simple-holistic-path-simulation-2026-10-17/runs/2026-10-17/RESULTS.md`
- 직전 인계(현재 구현의 계약): `docs/handoffs/2026-10-17-paragraph-simple-holistic-v4.1.md`

## 목표

프롬프트 v4.2(`packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.2.md`, 작성 완료 — 먼저 읽을 것)를 쓰고 다음이 참이 된다.

1. 첫 판정(INITIAL)에서 모델이 정한 핵심 부분(`coreParts`, 1~3개)이 문단 상태에 저장되고, 이후 모든 판정 입력에 들어간다.
2. 모든 판정에 `corePartsCovered`가 있고, INITIAL·RETRY·AFTER_CORRECTION에서 GAP/CAPTURED가 그것과 일치하는지 서버가 검증한다.
3. 오류는 핵심 부분마다 최대 하나(`errors[].corePartIndex`).
4. 구멍 질문 항목은 담지 못한 핵심 부분과 짝지어지고(`gaps[].corePartIndex`), 모델의 한 가지만 묻는지 점검(`gaps[].asksOneThing`)이 true여야 한다.

## 범위 밖

- 프롬프트 본문 수정(필요해 보이면 멈추고 보고). 이전 프롬프트 파일은 지우지 않는다.
- 행동 표, 질문 상한, 말풍선 구성, 시도·메모·재구성 요약 칸, v4.1 필드(`targetGapReadings`, `gapIndex`, `missingNote`)의 동작.
- 모델 기본값. 운영 V4, 보여 주기 모드, 문제 풀이, 다른 세션의 미커밋 변경.
- `docs/experiments/simple-holistic-path-simulation-2026-10-17/`(Claude가 동시에 고친다. 건드리지 않는다).

## 손댈 파일과 계약

### 파이프라인 `packages/pipeline/src/paragraph-simple/`

- `schema.ts`
  - `PARAGRAPH_SIMPLE_PROMPT_VERSION = 'paragraph-simple-holistic-v4.2'`.
  - `SimpleCorePartSchema = z.object({ description: z.string(), sourceQuote: z.string() }).strict()`.
  - `SimpleErrorSchema`: `corePartIndex: z.number().int()` 추가(`gapIndex` 앞).
  - `SimpleGapSchema`: `corePartIndex: z.number().int()`(맨 앞), `asksOneThing: z.boolean()`(맨 뒤) 추가.
  - `SimpleOutputSchema`: `reason` 다음에 `coreParts: z.array(SimpleCorePartSchema)`, `corePartsCovered: z.array(z.boolean())` 추가.
  - `SimpleEvaluationInput`: `coreParts: SimpleCorePart[] | null` 추가(`targetError` 앞).
- `evaluator.ts`: `PROMPT_PATH`를 v4.2로.
- `rules.ts` `validateSimpleOutput` 추가(기존 유지). 기준 부분 `parts` = stage=INITIAL이면 `output.coreParts`, 그 밖이면 `input.coreParts ?? []`.
  - stage=INITIAL: `output.coreParts` 길이 1~3, 각 `description` 비어 있지 않음, `sourceQuote`는 대상 문단의 연속 부분 문자열. 그 밖의 stage: `output.coreParts`는 빈 배열.
  - `corePartsCovered` 길이 = `parts.length`.
  - `errors[i].corePartIndex`: 0 이상 `parts.length` 미만, 오류끼리 중복 없음, 그 부분의 `corePartsCovered`는 false.
  - stage가 INITIAL·RETRY·AFTER_CORRECTION이고 errors가 비어 있을 때: category=CAPTURED면 `corePartsCovered` 모두 true, category=GAP이면 하나 이상 false. IRRELEVANT·COPY면 모두 false.
  - action=GAP_QUESTION: 각 `gaps[].corePartIndex`는 범위 안·중복 없음·그 부분 `corePartsCovered`=false, `gaps.length` = min(2, false인 부분 수), 모든 `asksOneThing`=true.
- `rules.ts` 상태: `SimpleParagraphState`에 `coreParts: SimpleCorePart[]`(초기 빈 배열). `applySimpleAction`은 `state.stage === 'INITIAL'`일 때 `coreParts: output.coreParts`를 저장하고, 그 밖에는 유지.
- 테스트: 픽스처 갱신(새 필드), 위 검증 통과·실패, coreParts 저장·유지.

### 서버 `packages/app/src/server/dialogue-simple.ts`

- `evaluate` 입력에 `coreParts: p.state.stage === 'INITIAL' ? null : p.state.coreParts` 추가.
- 새 시도는 새 상태(초기 `coreParts` 빈 배열)로 시작하므로 INITIAL에서 다시 정해진다(기존 구조 그대로).

### 클라이언트 `packages/app/src/client/SimpleDialogueDrawer.tsx`

- 단계 카드: INITIAL 카드에 핵심 부분 목록(설명·원문), 모든 카드에 `corePartsCovered`(부분 번호별 담음/못 담음), 오류의 `corePartIndex`("부분 n"), 질문 항목의 `corePartIndex`·`asksOneThing` 표시.

## 완료 조건

- [ ] 서버 테스트: INITIAL 입력 `coreParts`=null, 이후 단계 입력에 INITIAL 출력의 `coreParts`가 그대로; 새 시도 INITIAL에서 다시 null.
- [ ] 파이프라인 테스트: 새 검증 통과·실패 각각, 상태 저장·유지.
- [ ] paragraph-simple·dialogue-simple 테스트 전부 통과, 전체 `npm test`는 기존 무관 실패 2건 외 새 실패 없음(다른 세션 변경으로 생긴 실패는 구분해 보고).
- [ ] `npm run typecheck`, `npm run build` 통과(앱 테스트는 pipeline dist를 읽으므로 build 후 앱 테스트).
- [ ] 변경 파일에 TODO·skip·only·스텁 없음.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요). 모의 평가기로만 테스트한다.
- 실행 중인 개발 서버(포트 5173~5175)를 멈추거나 재시작하지 않는다. 커밋하지 않는다.

## 결과 보고 (실행 후 작성)

- 변경 파일: `packages/pipeline/src/paragraph-simple/{schema,rules,evaluator}.ts`, `{rules,evaluator}.test.ts`, `packages/app/src/server/dialogue-simple.ts`, `dialogue-simple.test.ts`, `dialogue-simple-http.test.ts`, `packages/app/src/client/SimpleDialogueDrawer.tsx`.
- 테스트 결과: paragraph-simple + dialogue-simple(http 포함) 89 통과 / 0 실패. 전체 `npm test` 1295 통과, 2 실패(기존 무관: boundary.test, axis-architecture-experiment.test) — 새 실패 없음. `npm run typecheck`, `npm run build` 통과.
- 남은 문제: 없음. 구현 메모 — 앱 흐름 테스트(`dialogue-simple.test.ts`)는 `fit` 보조 함수로 비워 둔 `coreParts`·`corePartsCovered`를 오류·빈 곳 번호에 맞게 채운다(명시한 값은 유지). 핵심 부분 전달·유지·새 시도 null은 명시 값 전용 테스트로 검증. `rules.test.ts`는 비-INITIAL 단계의 기본 `coreParts`를 빈 배열로 바꾸는 `checkSimpleOutput` 래퍼를 쓰고, 새 규칙 테스트는 `rawCheck`를 쓴다.
