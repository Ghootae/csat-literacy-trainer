# 인계: 문단 지시문 v4.8 — 담은 부분 되돌리지 않기(가)·이미 말한 것에서 출발하는 질문(나)

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 있음(gpt-6-luna, 아래 상한).
- 사용자 승인(2026-10-28): "승인" — [설계 초안](../review/paragraph-gap-question-fix-draft-2026-10-28.md) 그대로(문제·전략·검증 V1~V3·위험). 초안을 먼저 읽는다.

## 목표

1. 지시문 v4.8 파일 `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md`를 v4.7 복사본에서 만든다. 바꾸는 곳은 두 군데뿐이다.
   - 입력 설명에 `coveredBefore` 한 항목: 현재 시도의 앞 단계에서 한 번이라도 담았다고 본 부분(`corePartsCovered`와 같은 길이·순서, INITIAL은 null). true인 부분은 학생이 그 부분을 뒤집는 말을 해 오류로 잡을 때가 아니면 `corePartsCovered`에서 true로 둔다.
   - "질문 작성 규칙"에 5번: 학생이 그 부분에 대해 이미 말한 요소는 다시 묻지 않고, 그 말을 출발점으로 빠진 고리 하나만 묻는다. 개념 이름 하나만 대도 답한 것처럼 보이는 질문은 피하고, 빠진 관계를 말해야 답이 되게 묻는다. 규칙 1~4와 문체를 맞춘다. 사례 문장(인지질·mRNA)을 지시문에 넣지 않는다.
   - 첫 줄 제목의 버전도 v4.8로.
2. 코드(`packages/pipeline/src/paragraph-simple/`):
   - `SimpleEvaluationInput`에 `coveredBefore?: boolean[] | null`.
   - `validateSimpleOutput`: `input.coveredBefore`가 배열일 때만, `coveredBefore[i] === true`이고 출력 `corePartsCovered[i] === false`인데 `errors`에 `corePartIndex === i`인 항목이 없으면 검증 문제 하나(한국어, 다른 문제 문장과 같은 투). 기존 재요청 1회 흐름을 그대로 탄다.
   - `OpenAISimpleEvaluator` 옵션에 `promptPath?`·`promptVersion?`(기본은 지금 v4.7 그대로). metadata의 promptVersion이 실제 쓴 버전을 적게.
   - **기본값(v4.7)과 서버(`packages/app/src/server/dialogue-simple.ts`)는 이번에 바꾸지 않는다.** 서버는 `coveredBefore`를 보내지 않으므로 지금 제품 동작은 그대로다. 채택은 결과를 본 뒤 따로 결정한다. 다만 서버가 넣을 값을 계산하는 순수 함수(`coveredBeforeFromSteps(steps)`: 현재 시도의 앞 단계 출력들의 corePartsCovered OR, 단계가 없으면 null)는 pipeline 쪽에 만들어 두고 시험한다.
3. 단위 테스트(외부 호출 없음): 뒤집힘 거부, 그 부분을 가리키는 오류가 있으면 허용, `coveredBefore` 없음/null이면 규칙 꺼짐, `coveredBeforeFromSteps`.
4. 검증 실행(외부 호출). 스크립트 하나 `scripts/run-paragraph-gap-question-v48.mjs`(본보기: `scripts/run-paragraph-boundary-stability.mjs`). 결과 폴더 `docs/experiments/paragraph-gap-question-v48-2026-10-28/`. 회차마다 jsonl 한 줄(arm, case, run, category, action, corePartsCovered, gaps 질문, message, 재요청 수 `call.attempts`, 토큰 `call`, validationFailures 개수, 오류면 error).
   - V1: 세션 d6bb304e, 문단 `mrna-vaccine-lipid-nanoparticle-p5`의 AFTER_CORRECTION 단계 입력을 기록(`.omc/logs/dialogue-experiment/simple-holistic/sessions.jsonl`)에서 서버와 같은 모양으로 다시 만든다(서버 `evaluate`의 입력 구성 참고: dialogue는 그 시점까지의 transcript에서 WAIT_DONE 제외, coreParts·targetError는 그 시점 state). arm `v4.7`(coveredBefore 없음) 10회, arm `v4.8`(coveredBefore = INITIAL 출력 [false, true]) 10회.
   - V2: 3문단 첫 요약(INITIAL, 입력은 본보기 스크립트와 같음) arm `v4.8` 10회. v4.7은 `docs/experiments/paragraph-boundary-stability-2026-10-28/runs.jsonl` 재사용(다시 보내지 않음).
   - V3: 저장 기록에서 INITIAL 단계 8개를 고른다. 지문 3개 이상, 저장 category가 CAPTURED·GAP·ONE_ERROR(또는 MULTI_ERROR)를 섞어. 고른 목록과 이유를 README에. arm `v4.8` 각 2회(INITIAL이라 coveredBefore null).
   - 모델 gpt-6-luna 고정. 총 첫 호출 48회(재요청 별도). **상한 $0.5**(단가 입력 $0.10, 출력 $0.50 per 1M) — 누적 추정이 넘으면 멈추고 보고. 보내기 전에 첫 호출 수가 48인지 출력해 확인.
   - 같은 결과 폴더가 있으면 덮어쓰지 말고 멈춘다.
5. README(결과 폴더): V1 표(arm별 2번 false 횟수, 재요청 수, 판정 실패 수, action 분포), V2 표(category 분포)와 **v4.7 GAP 질문 6개 + v4.8 GAP 질문 전부를 섞고 번호만 붙인 목록**(어느 arm인지는 아래 따로 접은 열쇠 표에), V3 표(사례별 저장 category vs v4.8 두 회, 검증 실패로 끝난 호출 수). 해석·판정은 적지 않는다(Claude가 따로 한다).

## 범위 밖

- 서버·화면 코드, 기본 지시문 버전 전환, v4.7 파일 수정.
- 5문단 산도·pH 오류 질문, 마무리 문장 문제.
- git 쓰기 명령. 5173·5174·5175 서버 재시작·종료(사용자가 쓰는 중).

## 완료 조건

- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)만.
- [ ] 새 단위 테스트 통과.
- [ ] V1~V3 실행 완료, 첫 호출 48회, 비용 합계 README에.
- [ ] 이 문서 아래 "결과"에 바뀐 파일, 테스트 결과, 비용, 문서와 달리 판단한 점.

## 결과 (실행 후 작성)

### 바뀐 파일

- 새 파일: `packages/pipeline/experiments/dialogue/paragraph-simple-holistic-prompt-v4.8.md`(v4.7 복사본 + `coveredBefore` 입력 설명 + 질문 작성 규칙 5번 + 제목 버전), `packages/pipeline/src/paragraph-simple/covered-before.test.ts`, `scripts/run-paragraph-gap-question-v48.mjs`, `docs/experiments/paragraph-gap-question-v48-2026-10-28/`(README.md, runs.jsonl, cases.json)
- 수정: `packages/pipeline/src/paragraph-simple/schema.ts`(`coveredBefore?`), `rules.ts`(뒤집힘 검증, `coveredBeforeFromSteps`), `evaluator.ts`(`promptPath?`·`promptVersion?` 옵션, 기본 경로 상수 `PARAGRAPH_SIMPLE_DEFAULT_PROMPT_PATH` 내보냄. 기본값은 v4.7 그대로)
- 건드리지 않음: v4.7 파일, 서버 `dialogue-simple.ts`, 기본 지시문 버전.

### 테스트

- `npm run build` 통과. 새 단위 테스트(`covered-before.test.ts`, 5건) 통과.
- 전체 `npx vitest run`: 1471 통과, 2 실패 = 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)뿐.

### V1~V3 핵심 숫자 (자세한 표는 결과 폴더 README)

- V1: 2번 false — v4.7 2/10, v4.8 0/10. 재요청·판정 실패 0.
- V2: category — v4.7(재사용) CAPTURED 4·GAP 6, v4.8 CAPTURED 7·GAP 3. GAP 질문 9개(v4.7 6 + v4.8 3)는 README에 arm 가려 섞어 둠. 판단은 사용자.
- V3: 검증 실패로 끝난 호출 0. 저장 category와 v4.8 category가 다른 회차 1건(gongsun p5 2회째 GAP -> CAPTURED).

### 비용

- 첫 호출 46회, 재요청 0, 합계 $0.0656(상한 $0.5).

### 문서와 달리 판단한 점

- 첫 호출 수: 지시의 "48회(V1 20, V2 10, V3 16)"는 합이 46이다. 구성(V1 20·V2 10·V3 8개x2)을 따라 46회를 보냈다. 2회 더 보내지 않았다.
- V2·V3 입력에 `coveredBefore: null`을 넣었다(v4.8 서버가 INITIAL에 보낼 모양). 3문단 v4.7 재사용분(`runs.jsonl`)은 이 키 없이 보낸 것이라 입력이 이 키만 다르다.
- V3 8개: dopamine p3·p2, information-asymmetry p3·p1, gongsun p3·p5, surface-tension p5·p3 (지문 4개, CAPTURED 3·GAP 3·ONE_ERROR 2, 모두 gpt-6-luna 기록). MULTI_ERROR는 luna 기록에 없어 ONE_ERROR만 넣었다.
- V1은 지시대로 기록에서 입력을 재구성했고(AFTER_CORRECTION 단계 transcript의 학생 2번째 답까지, WAIT_DONE 제외, coreParts·targetError는 INITIAL 직후 state), 병렬 4개로 보냈다.
