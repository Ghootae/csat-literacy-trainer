# 인계: 문단 지시문 v4.8 채택 — 기본 버전 전환과 서버 `coveredBefore` 연결

- 날짜: 2026-10-28
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet). 외부 API 호출 없음.
- 사용자 승인(2026-10-28): "진행"
- 근거: [v4.8 구현·검증 인계](./2026-10-28-paragraph-gap-question-v48.md), [검증 결과](../experiments/paragraph-gap-question-v48-2026-10-28/README.md) — V1 뒤집힘 2/10→0/10, V2 사용자 판단 좋은 질문 1개(v4.8), V3 회귀 없음.

## 목표

1. 기본 지시문을 v4.8로: `packages/pipeline/src/paragraph-simple/schema.ts`의 `PARAGRAPH_SIMPLE_PROMPT_VERSION`을 `paragraph-simple-holistic-v4.8`로, `evaluator.ts` 기본 `PROMPT_PATH`를 v4.8 파일로. `promptPath`·`promptVersion` 옵션은 그대로 둔다(옛 버전 재현용). `evaluator.test.ts` 기대값 갱신.
2. 서버 `packages/app/src/server/dialogue-simple.ts` `evaluate`: 판정 입력에 `coveredBefore: coveredBeforeFromSteps(p.steps.map(s => s.output as SimpleOutput))`를 넣는다(현재 시도의 앞 단계들; 단계가 없으면 null). INITIAL에는 null이 들어가야 한다.
   - 주의: 단계 출력의 `corePartsCovered` 길이는 INITIAL에서 정한 coreParts 길이와 같다. RETRY 뒤에는 coreParts가 새로 정해질 수 있는지(`applySimpleAction`·RETRY 흐름) 확인하고, 새로 정해지면 그 이전 단계는 OR에서 뺀다(길이·순서가 다른 목록을 섞지 않는다). 확인 결과를 "결과"에 적는다.
3. 단위 테스트(`dialogue-simple.test.ts`, 모의 판정기): (a) INITIAL 호출 입력의 `coveredBefore`가 null, (b) INITIAL이 [false,true]·ONE_ERROR였고 AFTER_CORRECTION 호출 입력의 `coveredBefore`가 [false,true], (c) 모의 판정기가 AFTER_CORRECTION에서 [true,false]를 내면 검증 실패로 재요청되고 두 번째 출력([true,true])이 쓰인다.
4. 저장 기록·화면에 보이는 promptVersion이 v4.8로 남는지 확인.

## 범위 밖

- 지시문 내용 변경(v4.7·v4.8 파일 모두). 판정 경계 규칙(다음 묶음).
- git 쓰기 명령. 5173·5174·5175 서버 재시작·종료(Claude가 한다).

## 완료 조건

- [ ] `npm run build` 통과, `npm test`는 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)만.
- [ ] 문단 e2e `packages/app/e2e/paragraph-*.spec.ts`(격리 포트 `PLAYWRIGHT_CLIENT_PORT=5395 CSAT_API_PORT=5396`) 통과. e2e가 다른 날짜의 `docs/handoffs/*.png`를 덮어쓰면 HEAD 내용으로 되돌린다. 오늘 날짜 캡처도 덮어쓰면 HEAD로 되돌린다.
- [ ] 아래 "결과"에 바뀐 파일, 테스트 결과, RETRY 확인 결과, 문서와 달리 판단한 점.

## 결과 (실행 후 작성)

### 바뀐 파일

- `packages/pipeline/src/paragraph-simple/schema.ts`: `PARAGRAPH_SIMPLE_PROMPT_VERSION` -> `paragraph-simple-holistic-v4.8`, 주석의 지시문 경로 v4.8.
- `packages/pipeline/src/paragraph-simple/evaluator.ts`: 기본 `PARAGRAPH_SIMPLE_DEFAULT_PROMPT_PATH` -> v4.8 파일. `promptPath`·`promptVersion` 옵션은 그대로.
- `packages/pipeline/src/paragraph-simple/evaluator.test.ts`: 기대 버전 v4.8.
- `packages/app/src/server/dialogue-simple.ts`: `evaluate` 입력에 `coveredBefore: coveredBeforeFromSteps(p.steps.map(s => s.output as SimpleOutput))`.
- `packages/app/src/server/dialogue-simple.test.ts`: 새 테스트 3건(`v4.8: coveredBefore`), 기존 테스트 보정(아래).
- 지시문 파일(v4.7·v4.8)은 건드리지 않음. 저장 기록의 promptVersion은 evaluator metadata(기본값 v4.8)에서 오므로 v4.8로 남는다(evaluator.test 확인).

### 테스트

- `npm run build` 통과.
- `npx vitest run`: 1474 통과, 2 실패 = 기존 실패 2건(`boundary.test.ts`, `axis-architecture-experiment.test.ts`)뿐.
- 문단 e2e 3개 파일 4건 통과(`PLAYWRIGHT_CLIENT_PORT=5395 CSAT_API_PORT=5396`). 오늘 날짜 캡처 `2026-10-28-bubble-pacing-paragraph.png`가 덮어써져 HEAD 내용으로 되돌림. 다른 날짜 캡처는 변경 없음.
- 새 단위 테스트: (a) INITIAL `coveredBefore` null, (b) INITIAL ONE_ERROR [false,true] 뒤 AFTER_CORRECTION 입력 [false,true], (c) 모의 판정기가 [true,false]를 내면 검증 실패(`coveredBefore[1]`)로 재요청되고 두 번째 [true,true]가 쓰인다(validationFailures 1, attempts 2), (d) 추가: INITIAL 무관 -> RETRY 입력 `coveredBefore`는 [false,false]로 coreParts와 같은 길이.

### RETRY 흐름 확인 결과

- coreParts는 `applySimpleAction`에서 `stage === 'INITIAL'`일 때만 출력값으로 정해지고, RETRY_PROMPT 뒤 RETRY 단계에서는 상태 값을 그대로 쓴다(검증 규칙도 INITIAL 밖에서는 coreParts 비어 있어야 함). RETRY에서 새로 정해지지 않으므로 같은 시도 안의 단계 출력들은 길이·순서가 같다. 새 시도(`startAttempt`)는 `steps`가 비어 새로 시작하므로 이전 시도와 섞이지 않는다. 따라서 "새로 정해지면 이전 단계를 뺀다"는 처리는 필요 없어 넣지 않았다.

### 문서와 달리 판단한 점

- 기존 테스트 보정: 모의 판정기의 흐름 시나리오(ONE_ERROR 뒤 GAP 등)가 INITIAL에서 2번 부분을 자동으로 true로 채운 뒤 AFTER_CORRECTION에서 2번을 빈 곳으로 삼아, 새 뒤집힘 규칙에 걸렸다. 규칙 쪽은 그대로 두고, 해당 테스트의 INITIAL 출력에 `corePartsCovered: [false, false]`를 명시했다(4건). 입력 키 목록 단언에는 `coveredBefore`를 더했다. 칭찬 꼬리표 테스트는 원래 값 그대로다.
- `git show HEAD:... > 파일`(읽기 전용 git)로 캡처를 되돌렸다.
