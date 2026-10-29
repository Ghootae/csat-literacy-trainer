# 인계: 문단 v4.9·문제 v5.7 실험 연결 (제품 기본값 유지)

- 날짜: 2026-10-29
- 작성: 코드 에이전트(메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련: [설계 초안](../review/question-leak-fix-draft-2026-10-29.md)(사용자 방향 동의 2026-10-29), 지시문 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.9.md`, `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.7.md`(메인 세션 작성, 이 작업에서 고치지 않음)

## 목표

- 학생 역할 시뮬레이션 도구로 v4.9·v5.7을 돌릴 수 있다. 제품 기본값(문단 v4.8, 문제 v5.6)과 그 동작은 바뀌지 않는다.
- v4.9의 새 점검 칸 `gaps[].givesRelation`이 true면 검증 실패로 재요청된다.

## 범위 밖

- 지시문 .md 수정, 제품 기본 지시문 변경, 서버(5173~5175) 기동, 실모델 호출(아래 확인 run도 하지 않는다 — 단위 시험의 가짜 evaluator로만 확인).
- 커밋, `git add`.

## 손댈 파일과 계약

### 문단 (`packages/pipeline/src/paragraph-simple/`)

- `schema.ts`: `SimpleGapSchema`에 `givesRelation: z.boolean().optional()`. v4.8 출력(칸 없음)은 그대로 통과해야 한다.
- 모델 요청 JSON Schema: OpenAI strict 형식은 모든 칸이 required여야 하므로, 요청용 스키마를 지시문 버전에 따라 만든다. v4.9 지시문일 때만 gaps 항목에 `givesRelation: boolean`(required)를 넣는다. 판별은 `OpenAISimpleEvaluator`의 `promptVersion`(또는 promptPath) 기준으로 단순하게. v4.8 요청 스키마는 지금과 바이트 단위로 같아야 한다(시험으로 확인).
- `rules.ts` `validateSimpleOutput`: `gaps[i].givesRelation === true`이면 문제 문장 추가. 예: `gaps[${i}].givesRelation이 true다. 학생이 쓰지 않은 관계 요소를 빼고 질문을 다시 써서 false로 만든다.` (칸이 없으면 검사하지 않음)
- 시험: v4.8 요청 스키마 불변, v4.9 요청 스키마에 칸 있음, true 거부, 칸 없음·false 통과.

### 문제 (`packages/pipeline/src/problem-solving/feedback-evaluator.ts`)

- `OpenAIFeedbackEvaluator` 옵션에 `promptPath?: string`, `promptVersion?: string` 추가. 기본값은 지금 값(v5.6 경로, `'problem-feedback-v5.6'`). 판정(ASSESSMENT) 지시문 읽기와 metadata.promptVersion에 쓴다. 마지막 설명·감사 지시문은 그대로.
- 시험: 옵션 없으면 v5.6 경로, 옵션 주면 그 경로를 읽는지(가짜 transport로 instructions 확인).

### 도구 (`scripts/student-sim.mjs`)

- run 단위 설정 플래그: `--para-prompt <경로> --para-prompt-version <이름>`, `--prob-prompt <경로> --prob-prompt-version <이름>`. 처음 쓰는 명령에서 `run.json`에 저장하고, 이후 같은 run의 모든 명령이 그 값으로 evaluator를 만든다. 이미 저장된 값과 다른 값을 주면 오류로 멈춘다. 플래그가 없으면 제품 기본값.
- 문단 v4.9일 때 `promptVersion`은 `paragraph-simple-holistic-v4.9`, 문제는 `problem-feedback-v5.7`을 권장값으로 `--help`에 적는다.
- `para-say` 출력에 v4.9일 때 각 질문의 `givesRelation`도 보이게(개발자 확인용 한 줄).
- 확인: `--help`, 그리고 가짜/드라이런 없이 할 수 있는 범위에서 run.json 저장·불일치 오류를 확인한다(실모델 호출 금지 — 필요하면 evaluator 생성까지만 확인하는 작은 점검 함수나 `--dry-config` 같은 출력으로).

## 완료 조건

- [ ] 위 시험 추가, `npx vitest run packages/pipeline/src/paragraph-simple packages/pipeline/src/problem-solving packages/app/src/server` 통과
- [ ] `npm test` 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`) 외 새 실패 없음
- [ ] `npm run build` 통과(student-sim은 dist를 쓴다)
- [ ] `node scripts/student-sim.mjs --help`에 새 플래그

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- 남은 문제:
