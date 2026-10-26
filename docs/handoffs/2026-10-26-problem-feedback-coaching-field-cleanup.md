# 인계: 문제 판정 출력의 쓰이지 않는 `coaching` 필드 정리 (v5.1)

- 날짜: 2026-10-26
- 작성: 코드 에이전트
- 실행: 1단계(코드) executor 하위 에이전트(sonnet). 2단계(48세션 회귀)는 사용자 승인 뒤 코드 에이전트.
- 관련 결정: `memory/decisions/D-0176-student-switch-roadmap-pilot-before-expansion.md`(1′ 첫 과제),
  작동 순서 문서 `docs/PROBLEM-LAB-FLOW-2026-10-24.md` 6절 1·6·7번
- 약칭: `PP` = `packages/pipeline/src/problem-solving`, `PA` = `packages/app/src`

## 왜 하나

- M1(SELECTION)·M3(REPAIR) 판정 출력의 `coaching` 문자열은 학생에게 보이지 않는다. 종료 설명은 별도 M4(`END_EXPLANATION`)가 만든다(D-0112·D-0117).
- 그런데 종료 경로(`pendingEnd`)이면 평가기가 이 문자열을 `validateFeedbackCoaching`으로 검사하고, 걸리면 M5(`COACHING`) 재요청을 하며, 재시도 한도를 넘으면 판정 전체가 실패한다. 쓰지 않는 필드가 실패 원인이 된다.
- 지시문 `## 자료 경계와 종료 코칭` 절의 "서버는 모든 정상 코칭 종료에 정답과 해설을 덧붙인다"는 현재 동작과 다르다. 지시문 제목 "v3 기반 v4 연결 후보"도 이름(D-0090: v5)과 다르다.

## 목표 (끝나면 참)

1. M1·M3 스키마와 출력에 `coaching`이 없다. 모델은 이 필드를 만들지 않는다.
2. M5(`COACHING` kind)와 그 재요청 분기가 없다. 판정 경로에서 `validateFeedbackCoaching`을 부르지 않는다.
3. M4(END_EXPLANATION)의 `validateFeedbackCoaching` 검사는 **그대로** 있다(학생에게 보이는 글이므로).
4. 새 지시문 `source-direct-problem-feedback-v5.1.md`를 쓰고, `promptVersion`은 `problem-feedback-v5.1`이다. 옛 `v5.md`는 지난 실험 재현용으로 그대로 둔다.
5. 서버 평가 루프의 돌지 않는 두 번째 반복을 없앤다(동작 동일).

## 범위 밖

- 판정 규칙·질문 규칙·종료 설명 지시문(`PP/feedback-end-explanation.ts`의 지시 문자열) 내용 변경.
- 세션 `version: 'problem-feedback-v4'`, 기록 `schemaVersion`, 로그 경로, 옛 환경변수 이름(작동 순서 문서 1.3절 표). 그대로 둔다.
- 학생용 v3 경로(`PA/server/problem-solving.ts`, `PA/shared/contract.ts`, `PA/client/ProblemApp.tsx`)의 `COACHING`. 별개 경로다.
- 지난 실험 스크립트(`scripts/test-v5-*.mjs`, `scripts/run-v5-diverse-48*.mjs` 등)의 `v5.md` 참조. 아래 `run-v5-live-check.mjs` 하나만 고친다.
- 외부 API 호출, 커밋, `git stash`, `.env` 열기.

## 손댈 파일과 계약

### 1. 지시문 `packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md` (새 파일)

`source-direct-problem-feedback-v5.md`를 복사한 뒤 아래 세 곳만 바꾼다. 나머지 글자는 한 자도 바꾸지 않는다.

- 1행 제목: `# 문제 풀이 판정 — v3 기반 v4 연결 후보` → `# 문제 풀이 판정 v5.1`
- `## 자료 경계와 종료 코칭` 절: 제목을 `## 자료 경계`로 바꾸고, `` `coaching`은 서버가 코칭 종료 경로에서 공개할 상세 설명이다.``로 시작하는 문단 전체(6줄, "…무관한 문자열을 넣지 않는다."까지)와 그 앞 빈 줄을 지운다. 앞 문단(`boundary` 설명)은 그대로.
- `## 학생 판단 서술 형식` 첫 문단 끝 문장 ` coaching에서 학생의 판단을 언급할 때도 같다.`를 지운다(앞 문장은 그대로).
- 바꾼 뒤 `grep -n -i coaching` 결과가 0줄이어야 한다. `코칭`도 0줄이어야 한다(다른 곳에 있으면 멈추고 보고).

### 2. `PP/feedback.ts`

- `FeedbackSelectionAssessmentSchema`의 `coaching: Text`(약 58행), `FeedbackRepairAssessmentSchema`의 `coaching: Text`(약 82행)를 지운다.
- `FeedbackCoachingError`·`validateFeedbackCoaching`은 그대로 둔다(M4 `applyFeedbackEndExplanation`이 쓴다).
- 이 두 스키마에서 파생된 타입을 쓰는 곳에서 `coaching` 참조가 생겨 컴파일이 깨지면 그 참조만 지운다.

### 3. `PP/feedback-evaluator.ts`

- `CoachingSchema`(약 81행), `coachingOnly` 변수와 분기(약 103, 141-146, 198행), `request`의 kind 유니언에서 `'COACHING'`을 지운다.
- `FeedbackEvaluationCall['metadata']['attempts']`의 `kind` 유니언에서도 `'COACHING'`을 지운다. 다른 곳이 이 값을 읽어 컴파일이 깨지면 멈추고 보고한다(지난 기록을 읽는 코드일 수 있음).
- 약 179-182행: 모의 전이 `applyFeedbackAssessment(s, candidate)`는 **남긴다**(전이 계약 위반을 재시도로 잡는다). `if (next.pendingEnd) validateFeedbackCoaching(...)` 줄과 그 위 두 줄 주석을 지우고, 주석 한 줄로 바꾼다: `// Dry-run the transition so contract violations retry here; END_EXPLANATION writes the only public explanation.` 결과 변수가 쓰이지 않으면 `applyFeedbackAssessment(s, candidate);`만 둔다.
- 에러 기록 `attempts.push({ kind: end ? 'END_EXPLANATION' : coachingOnly ? 'COACHING' : 'ASSESSMENT', ...})` → `kind: end ? 'END_EXPLANATION' : 'ASSESSMENT'`.
- 약 196행 주석 `// The shared retry bound covers contracts, transport, audits and coaching; ...`에서 `and coaching`을 `and end explanations`로 바꾼다.
- 쓰이지 않게 된 import(`FeedbackCoachingError`, `validateFeedbackCoaching` 등)를 지운다.
- 지시문 경로 `source-direct-problem-feedback-v5.md` → `source-direct-problem-feedback-v5.1.md`, `promptVersion: 'problem-feedback-v5'` → `'problem-feedback-v5.1'`.

### 4. `PP/feedback-end-explanation.ts`

- 약 119행 `lastRepairAssessment: last ? (({ coaching: _coaching, ...rest }) => rest)(last) : null` → `lastRepairAssessment: last ?? null`(`last`의 타입에 맞게. 이미 null이 될 수 있으면 `last`로 충분). 지난 세션 기록을 복원한 경우에도 `coaching`이 없어야 하는지는 아래 시험으로 확인한다. 복원 경로가 옛 판정(coaching 포함)을 그대로 넣을 수 있으면 원래 제거 코드를 **남기고** 보고한다.

### 5. `PA/server/problem-feedback.ts` `evaluate()` (약 129-157행)

- `for (let evaluation = 0; evaluation < 2 && ...; evaluation++) { ... break; }`를 반복 없는 한 번 실행으로 바꾼다. 분기·저장·상태 갱신 순서와 결과는 같아야 한다. `applyFeedbackAssessment`가 `AWAITING_EVALUATION`을 돌려주는 경로는 없다(작동 순서 문서 6절 7번). 혹시 결과 phase가 여전히 `AWAITING_EVALUATION`이면 지금처럼 `evaluationStatus = 'PROCESSING'`인 채 반환되던 두 번째 반복 대신 무엇이 일어나는지 보고만 하고, 새 처리를 만들지 않는다.

### 6. `scripts/run-v5-live-check.mjs`

- 고정 목록(약 41행)의 `source-direct-problem-feedback-v5.md` → `source-direct-problem-feedback-v5.1.md`. 다른 동작은 바꾸지 않는다.

### 7. 시험 `PP/feedback.test.ts`

- 픽스처(`output()`, `repair()` 등, 약 190·206행)에서 `coaching`을 지운다.
- 지울 시험: `coaching-only regeneration preserves the assessment and records the original corruption`(약 100행).
- 고칠 시험:
  - `unused coaching is not a failure; ...`(약 115행) → 이름을 `scientific symbols and Latin terms remain valid in public text`로 하고 `validateFeedbackCoaching` 기대만 남긴다.
  - 약 154행 근처 `coaching: '/'`로 COACHING 재시도를 기대하는 시험이 있으면 그 시험의 목적을 읽고, 목적이 COACHING 재시도 자체면 지운다. 다른 목적이면 `coaching` 부분만 뺀다. 판단이 서지 않으면 멈추고 보고.
  - `repair and coaching-only retry use luna`(약 706행) → `repair uses luna: ${correct}`. 한 번 호출(`requests.map(r => r.model)` = `['gpt-6-luna']`), attempts kind `['ASSESSMENT']`, `studentClaims` 미포함 검사는 유지.
  - `promptVersion` 기대값 `problem-feedback-v5` → `problem-feedback-v5.1`.
- 유지할 시험: `stored corrupt coaching cannot be published`(약 93행, 옛 기록의 손상 문자열이 M4에서 막히는지), `public correction excludes coaching, ...`(약 391행), `end payload ... omits judge coaching ...`(약 868행).
- 추가 시험:
  - 종료 경로(`pendingEnd`)가 생기는 SELECTION 판정과 REPAIR 판정 각각에서, `coaching` 없는 출력이 한 번 호출로 통과한다(attempts kind `['ASSESSMENT']`).
  - 요청 스키마(`requests[0].text.format.schema.properties`)에 `coaching`이 없다(SELECTION·REPAIR).
  - `coaching` 키가 들어간 출력은 스키마 위반으로 거부된다(strict 스키마라면). strict가 아니면 이 시험은 빼고 보고.
  - 옛 기록(coaching 포함)을 복원해 종료 설명 입력을 만들 때 `lastRepairAssessment`에 `coaching`이 없다(4번 판단 근거).

## 완료 조건

- [ ] `grep -rn -i 'coaching' packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.1.md` 0줄, `v5.md`와의 `diff`가 위 세 곳뿐.
- [ ] `grep -n "coachingOnly\|CoachingSchema\|'COACHING'" PP/feedback-evaluator.ts` 0줄.
- [ ] `PP/feedback.ts`의 두 판정 스키마에 `coaching` 없음, `validateFeedbackCoaching`은 `applyFeedbackEndExplanation`에서 여전히 호출.
- [ ] `npm test`(전체) 통과. 실패가 이번 변경과 무관한 기존 실패면 이름과 메시지를 보고.
- [ ] `npm run build` 통과(실행기가 dist를 해시로 고정함).
- [ ] 외부 API 호출 없음, 커밋 없음, `git stash` 없음. 이 문서에 적은 파일 밖은 수정하지 않음(빌드 산출물 제외).

## 중단·보고 조건

- 이 문서와 코드·시험·결정 기록이 충돌하거나 설계 판단이 필요해지면 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다.
- 외부 API 호출·외부 전송이 필요해지면 실행 전 멈춘다.

## 2단계: 48세션 회귀 (코드 에이전트, 사용자 승인 뒤)

- 사례: `scripts/v5-diverse-48-regression-cases.mjs` 48개 그대로. 실행기 `scripts/run-v5-live-check.mjs`, 디렉터리 `docs/experiments/v5-diverse-48-regression-2026-10-26/`.
- 기준 조건(재활용, D-0168): 2026-10-22 회귀 `docs/experiments/v5-diverse-48-regression-2026-10-22/`. B3 6세션은 D-0164 수정 뒤 재확인 `docs/experiments/v5-diverse-48-b3-recheck-2026-10-22/`를 기준으로 한다. 같은 사례·같은 모델·같은 판정 코드에서 지시문·스키마의 `coaching`만 빠진 조건이라 새 조건만 생성한다. 10-22 이후 판정 코드 변경 여부는 실행 전 `git log`로 확인해 승인 요청에 적는다.
- 후속 학생 답: 10-22 `actions/authored-*.json`에서 같은 오류를 묻는 질문이면 그 답을 쓴다. 질문이 달라 새로 써야 하는 답만 역할 의도에 맞게 쓰고 `authoredNote`를 남긴다.
- 비교: `node scripts/compare-v5-diverse-48-regression.mjs <이번> <10-22>`.
- 판정 초점: (1) 역할별 최종 결과가 기준과 같은가, (2) 검증 재시도가 줄었는가(특히 COACHING 재시도 0), (3) `coaching`을 지운 뒤 판정 필드(`reason`, `errors`, 질문)의 질이 떨어진 세션이 있는가, (4) 설명되지 않는 경로 변화.
- 상한: sol 200회·$5, luna 200회·$0.5. 예상 약 147회·$2.

## 결과 보고 (실행 후 작성)

- 상태: 1단계 코드 변경 완료, 완료 조건의 `npm test`는 **미통과(설계 공백으로 멈춤)**.
- 변경 파일: `source-direct-problem-feedback-v5.1.md`(신규), `PP/feedback.ts`, `PP/feedback-evaluator.ts`,
  `PP/feedback-end-explanation.ts`, `PA/server/problem-feedback.ts`, `scripts/run-v5-live-check.mjs`, `PP/feedback.test.ts`.
- 테스트 결과: `feedback.test.ts` 199건 통과. 전체 `npm test`(빌드 전) 3 실패/1385: 기존 실패 2(`boundary.test.ts`
  `server/student-state.ts`가 node:fs import, `axis-architecture-experiment.test.ts` `.omc/adhoc/...` 파일 없음) +
  이번 변경 관련 1(`source-markers.test.ts`). 빌드 후 재실행 시 25 실패/1385(앱 테스트가 pipeline dist를 읽기 때문).
  `npm run build` 통과.
- 남은 문제(설계 공백, 멈춤): 문서 목록 밖의 시험 픽스처 3개가 판정 출력에 `coaching`을 넣어 strict 스키마에서
  거부된다. 해당 줄(9곳)에서 `coaching: '...'`만 지우면 될 것으로 보이나 "문서 밖 파일 수정 금지" 때문에 손대지 않았다.
  `PP/source-markers.test.ts:90`, `PA/server/problem-feedback-http.test.ts:83,90`,
  `PA/server/problem-feedback.test.ts:23,162,167,299,328,333`(299·328은 줄 중간에 포함).
  승인되면 이 줄들만 고치고 `npm test` 재확인.
- 보고 항목:
  - 4번 복원 경로: 복원은 명령 재생(`restoreInput`)뿐이며 판정은 strict 스키마 파싱을 거쳐 세션에 들어가므로
    `lastRepairAssessment`에 `coaching`이 들어갈 수 없다. 제거 코드를 `last ?? null`로 바꿨다. 옛 기록 rawOutput을
    그대로 `assess`에 넣으면 스키마 위반이 되므로, 시험 로더 `stored()`가 판정 객체의 `coaching`을 떼도록 했다.
    `stored corrupt coaching cannot be published`는 원본 JSON(`storedRaw`)에서 `coaching`을 읽어 M4 검사만 확인한다.
  - 5번 phase: `applyFeedbackAssessment`의 결과 phase가 `AWAITING_EVALUATION`이면, 옛 코드는 두 번째 반복에서
    같은 평가를 다시 불렀지만 새 코드는 `evaluationStatus='PROCESSING'`인 채 한 번만 실행하고 반환한다. 시험에서
    이 경로를 만난 적은 없다(새 처리는 만들지 않음).
  - strict 스키마: 두 판정 스키마 모두 `.strict()`다. `coaching` 키 거부 시험을 추가했다.
  - 약 154행 시험(`persistent corruption stops after shared retry...`): 목적이 COACHING 재시도 자체여서 지웠다.
  - 추가: `v5.md`를 읽는 `assessment instructions change only the approved...`(약 551행) 시험은 옛 지시문 고정 용도라 그대로 뒀다.

### 코드 에이전트 추가 (2026-10-26)

- 하위 에이전트가 멈춘 문서 밖 시험 3개(`source-markers.test.ts`, `problem-feedback.test.ts`, `problem-feedback-http.test.ts`)의 픽스처 9곳에서 `coaching`만 지웠다. build 통과, test 1383/1385(실패 2건은 기존 `boundary.test.ts`·`axis-architecture-experiment.test.ts`).
- diff 검토: 인계 문서 계약과 일치.
- 2단계: 사용자 승인으로 48개 대신 역할 균형 18세션(`docs/experiments/v5-diverse-48-regression-2026-10-26/`). 역할별 최종 결과 10-22와 같음, G-B3만 D-0164 재확인 결과로 바뀜, `coaching`·COACHING 0, 약 $0.80. 후속 답 11개 모두 10-22 재사용. 보고: `REPORT-human.md`, `REPORT-desktop.md`. 결정 D-0177.
