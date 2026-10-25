# 인계: 개발자 문제 풀이 경로 이름 정리(`/problem/lab`, 코드 이름에서 버전 제거)

- 날짜: 2026-10-24
- 작성: 코드 에이전트
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0173-problem-lab-version-free-code-names.md`

## 목표

- 개발자 문제 풀이 화면이 `/problem/lab`에서 열린다. `/problem/dev/v4?...`로 들어오면 쿼리를 유지한 채 `/problem/lab?...`으로 주소가 바뀌고(`history.replaceState`) 같은 화면이 뜬다.
- 개발자 문제 풀이 경로의 코드(파일 이름, 타입·클래스·함수·변수 이름, API 경로, 환경변수, 화면 문구)에 `v4`·`V4`·`v5`·`V5`가 남지 않는다. 단 아래 "바꾸지 않는 값"은 예외.
- 판정·화면 동작은 이전과 같다(순수 개명).

## 범위 밖

- 학생용 `/problem`(`ProblemApp.tsx`, `problem-solving.ts`, `source-direct-evaluator*.ts`, v2/v3 지시문)과 그 개발자 모드 `/problem/dev`.
- 프롬프트 `.md` 파일 이름과 내용(`packages/pipeline/experiments/**`). 버전은 프롬프트에만 남긴다.
- 안 쓰는 옛 지시문 파일 삭제.
- `scripts/`의 실험 스크립트 **파일 이름**(예: `test-v5-*.mjs`, `test-problem-feedback-v4-*.mjs`). 실험 기록이므로 이름은 그대로 두고, 개명으로 깨지는 import만 고친다.
- `docs/`, `memory/`의 기존 문서(역사 기록). 단 `AGENTS.md`·`memory/` 갱신은 코드 에이전트가 따로 한다.
- 문단 요약 경로(`dialogue*.ts`)는 문제 화면 주소·환경변수 참조만 고친다.

## 바꾸지 않는 값(저장 자료 호환)

- 세션 값 `version: 'problem-feedback-v4'`(상수 **이름**은 바꿔도 되나 **값**은 유지).
- 기록 값 `schemaVersion: 'problem-feedback-v4-record-v1'`.
- 기록되는 `promptVersion: 'problem-feedback-v5'`.
- 로그 기본 경로 `.omc/logs/problem-feedback-v4/events.jsonl`, `.omc/logs/problem-feedback-v4/examiner-strategy.jsonl`.
- 프롬프트 파일 경로 `source-direct-problem-feedback-v5.md`.
- 위 값 옆에는 "저장 자료 호환을 위해 값 유지(D-0173)" 정도의 짧은 주석 한 줄을 둔다.

## 손댈 파일과 계약

새 이름은 아래를 따른다. 기존 다른 이름과 충돌하면 `Problem` 접두어를 붙이고 결과 보고에 적는다.

### 파일 이름(`git mv`)

| 기존 | 새 이름 |
|---|---|
| `packages/pipeline/src/problem-solving/feedback-v4.ts` | `feedback.ts` |
| `packages/pipeline/src/problem-solving/feedback-v4.test.ts` | `feedback.test.ts` |
| `packages/pipeline/src/problem-solving/feedback-v4-evaluator.ts` | `feedback-evaluator.ts` |
| `packages/pipeline/src/problem-solving/feedback-v5-claims.ts` | `feedback-claims.ts` |
| `packages/pipeline/src/problem-solving/feedback-v5-end-explanation.ts` | `feedback-end-explanation.ts` |
| `packages/app/src/server/problem-feedback-v4.ts` (+`.test.ts`, `-http.test.ts`) | `problem-feedback.ts` (+`.test.ts`, `-http.test.ts`) |
| `packages/app/src/server/problem-feedback-v4-entry.ts` | `problem-feedback-entry.ts` |
| `packages/app/src/shared/problem-feedback-v4.ts` | `problem-feedback.ts` |
| `packages/app/src/client/ProblemFeedbackV4App.tsx` | `ProblemLabApp.tsx` |
| `packages/app/src/client/FeedbackV4Drawer.tsx` | `FeedbackDrawer.tsx` |
| `packages/app/src/client/problem-feedback-v4-api.ts` | `problem-feedback-api.ts` |
| `packages/app/src/client/v4-composer-state.ts` (+`.test.ts`) | `problem-composer-state.ts` (+`.test.ts`) |
| `packages/app/e2e/problem-feedback-v4-workbench.spec.ts` | `problem-lab-workbench.spec.ts` |

### 식별자

- `FeedbackV4*` → `Feedback*`(예: `FeedbackV4View`→`FeedbackView`, `FeedbackV4Record`→`FeedbackRecord`), `ProblemFeedbackV4Controller`→`ProblemFeedbackController`, `ProblemFeedbackV4App`→`ProblemLabApp`, `appendFeedbackV4Record`→`appendFeedbackRecord`, `problemFeedbackV4*` 옵션·변수 → `problemFeedback*`, `PROBLEM_FEEDBACK_V4`→`PROBLEM_FEEDBACK_SESSION_VERSION`(값 유지).
- `packages/pipeline/src/index.ts`의 export 이름도 같이 바꾼다. 옛 이름 별칭 export는 두지 않는다. `scripts/`에서 깨지는 import는 새 이름으로 고친다.
- 그 밖에 개발자 경로 코드 안의 `v4`/`v5` 들어간 식별자·주석도 같은 원칙으로 정리한다. 주석이 "v5 지시문"처럼 프롬프트 버전을 가리키는 경우는 둬도 된다.

### 주소·API·환경변수

- 클라이언트 라우팅(`main.tsx`): `/problem/lab` → `ProblemLabApp`. `/problem/dev/v4` → `replaceState`로 `/problem/lab` + 기존 search/hash 후 `ProblemLabApp`. 이 분기는 `/problem` 접두 분기보다 앞에 둔다.
- 문제 화면으로 가는 링크(`DialogueApp.tsx`, `dev-part-nav-links.ts`, `dialogue-simple.ts`의 `problemUrl`, `ProblemLabApp` 안의 `replaceState`)는 `/problem/lab`.
- API 접두 `/api/developer/problem-feedback-v4/` → `/api/developer/problem-lab/`. 서버는 옛 접두도 받아 같은 처리로 보낸다(접두를 새 것으로 정규화하는 한 곳). `vite.config.ts` 프록시는 새 접두와 옛 접두 모두 5175로.
- 환경변수: `CSAT_PROBLEM_LAB_API_PORT`(옛 `CSAT_PROBLEM_V4_API_PORT` 대체 허용), `CSAT_PROBLEM_LAB_PUBLIC`(옛 `CSAT_PROBLEM_V4_PUBLIC` 허용), `CSAT_PROBLEM_FEEDBACK_LOG`(옛 `CSAT_PROBLEM_FEEDBACK_V4_LOG` 허용). 새 이름 우선. `CSAT_PROBLEM_V4_PUBLIC`이 문단 단순 형식 API 공개도 함께 가르는 현재 동작은 유지한다(새 이름으로).
- `scripts/run-dialogue-ui.mjs`: 새 entry 파일 경로.
- 서버 시작 로그 문구와 화면 상단 문구 "문제 풀이 v4 · 개발자 테스트 …" → "문제 풀이 개발자 테스트 …"(버전 없이, 나머지 문구 유지).

## 완료 조건

- [ ] `git grep -nIE "[vV][45]" -- packages/app/src packages/pipeline/src/problem-solving/feedback*.ts packages/app/e2e/problem-lab-workbench.spec.ts packages/app/vite.config.ts scripts/run-dialogue-ui.mjs`의 남은 결과가 모두 "바꾸지 않는 값", 옛 이름 호환 처리, 프롬프트 버전 언급, 또는 범위 밖(학생용 v3·문단) 코드뿐이다. 남은 줄을 결과 보고에 분류해 적는다.
- [ ] `npm run build` 통과.
- [ ] `npm test` 통과(개명 전과 같은 수의 테스트가 통과. 개명 전 실패가 있었다면 전후 비교를 적는다).
- [ ] 옛 주소·옛 API 접두·옛 환경변수 호환을 확인하는 단위 테스트가 각각 하나 이상 있다(기존 테스트 파일에 추가).
- [ ] e2e(`problem-lab-workbench.spec.ts`)는 기존 실행 방법이 있으면 돌리고, 외부 모델 호출이 필요하면 돌리지 말고 보고한다.
- [ ] 실행 중인 서버(5173·5175)는 재시작하지 않는다. 재시작 필요 여부만 보고한다.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고
  충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다(별도 승인 필요).
- 커밋하지 않는다. `git add -A` 금지.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 개명(`git mv`) 인계 표 그대로 17개: pipeline `feedback.ts`·`feedback.test.ts`·`feedback-evaluator.ts`·`feedback-claims.ts`·`feedback-end-explanation.ts`, app server `problem-feedback.ts`(+`.test.ts`, `-http.test.ts`)·`problem-feedback-entry.ts`, shared `problem-feedback.ts`, client `ProblemLabApp.tsx`·`FeedbackDrawer.tsx`·`problem-feedback-api.ts`·`problem-composer-state.ts`(+`.test.ts`), e2e `problem-lab-workbench.spec.ts`. 새 이름 충돌 없음(접두어 추가 없음).
  - 내용 수정: `packages/pipeline/src/index.ts`, `source-markers.test.ts`, app `server/index.ts`(옛 API 접두 정규화, 환경변수 새 이름 우선), `server/session.ts`, `server/examiner-strategy(.test).ts`, `dialogue-simple.ts`(+test), `client/main.tsx`(옛 주소 replaceState), `DialogueApp.tsx`, `dev-part-nav-links(.test).ts`, `annotated-text(.test)`, CSS(`problem-feedback-workbench.css`, `simple-dialogue.css`: 클래스 `v4-*`→`lab-*`, `problem-v4-*`→`problem-lab-*`), `vite.config.ts`(새·옛 접두 모두 프록시), `scripts/`의 깨지는 import·경로·dist 파일 정규식 수정(파일 이름은 그대로).
  - sessionStorage 키 `csat.problem.v4.*`→`csat.problem.lab.*`(브라우저 임시 캐시라 호환 불필요로 판단).
  - OpenAI json_schema 이름 `problem_feedback_v4_*`→`problem_feedback_*`.
- 테스트 결과: 개명 전 build 통과, test 2 failed/1370 passed(1372). 개명 후 build·`typecheck:client` 통과, test 2 failed/1374 passed(1376). 실패 2건은 개명 전과 동일한 기존 실패(`boundary.test.ts` D4 규칙 1, `axis-architecture-experiment.test.ts`). 추가 테스트 4개(옛 API 접두, 새·옛 PUBLIC 환경변수 2개, 옛 LOG 환경변수) + e2e 1개(옛 주소 리다이렉트, 미실행). `dialogue-simple.test.ts` 기대 URL 2곳은 `/problem/lab`으로 갱신.
- 남은 문제:
  - e2e 미실행: 5173에 떠 있는 vite를 재사용하는 설정이라 새 프록시가 반영되는지 불확실. 5173·5175는 건드리지 않음. `vite.config.ts` 수정으로 vite가 설정 변경을 감지해 스스로 재시작했을 수 있음.
  - 5175 API 서버는 옛 코드로 돌고 있으므로 `/problem/lab` 화면을 쓰려면 재시작 필요(5175 entry 파일 경로도 새 이름).
  - `CSAT_PROBLEM_LAB_API_PORT`·entry 로그 문구는 단위 테스트 없음(entry가 listen 부작용).
