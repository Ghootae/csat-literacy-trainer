# 인계: 마지막 설명 좌표 비교 실험 실행기

- 날짜: 2026-10-23
- 작성: Claude
- 실행: executor 하위 에이전트(sonnet)
- 관련 결정: `memory/decisions/D-0167-choice-link-end-explanation-comparison.md`, D-0162, D-0002

## 목표

- v5 회귀 시험의 오답 종료 30세션에 대해 마지막 설명(END_EXPLANATION)을 두 조건으로 다시 생성할 수 있는 실행기를 만든다. 두 조건은 기존 요청 그대로와, 선지 연결 좌표를 더한 요청이다.
- 블라인드 판정 자료(쌍, 열쇠, 사용자용 6쌍)를 만든다.
- **이번 작업은 dry-run까지다.** 실제 전송은 메인 세션이 사용자 승인 뒤 실행한다.

## 범위 밖

- 운영 코드(`packages/**`)·운영 지시문을 고치지 않는다. dist를 import해 읽기만 한다.
- 기존 실험 폴더(`docs/experiments/v5-diverse-48-*`, `docs/experiments/choice-link-2026-10-22/**`)는 읽기만 한다.
- 파일 삭제 금지, `git add`·`commit`·`stash` 금지, `.env` 사용은 실제 실행 경로에서만(이번엔 실행하지 않음).

## 입력

- 세션 30개: 문항 접두 C·D·G·I·M·S × 역할 A1·A3·B1·B2·B3.
  - A1·A3·B1·B2: `docs/experiments/v5-diverse-48-regression-2026-10-22/requests/` 안의 마지막 설명 요청. `request.instructions`에 "firstChoice, reselection, answer"가 들어간 `*.request.json`이고 세션마다 1개다.
  - B3: D-0164 수정 뒤 재확인 기록인 `docs/experiments/v5-diverse-48-b3-recheck-2026-10-22/requests/`의 같은 종류 요청.
  - 각 세션의 같은 이름 `*.response.json`(기존 출력)은 참고로 함께 보관한다.
  - 세션마다 마지막 설명 요청이 정확히 1개가 아니면 멈추고 보고한다.
- 지시문 확인: 저장된 `request.instructions`가 `packages/pipeline/dist/index.js`에서 내보내는 현재 `INCORRECT_END_INSTRUCTIONS`와 같아야 한다. dist에서 내보내지 않으면 `packages/pipeline/dist/problem-solving/feedback-v5-end-explanation.js`에서 import한다. 다르면 멈추고 차이를 보고한다. 운영 지시문이 바뀐 뒤라면 기존 조건의 의미가 달라지기 때문이다.
- 좌표: `docs/experiments/choice-link-2026-10-22/runs/ui-v5/frozen/<passageKey>.json`.
  - 요청 payload의 `source.questionId`(예: `surface-tension-laplace-q16`)에서 passageKey와 문항 번호를 얻는다. passageKey는 `-q<번호>` 앞부분이다.
  - 지도 문장은 `docs/experiments/choice-link-2026-10-22/targets-ui.json`의 그 passageKey `mapPath`(명제·노드 `text`)에서 얻는다.

## 좌표 조건 요청 만들기 (설계 확정)

기존 요청을 깊은 복사한 뒤 두 곳만 바꾼다. 모델, reasoning, max_output_tokens, 출력 형식, 이미지는 그대로 둔다.

1. **payload에 `choiceLinks` 추가.** `input[0].content[0].text`의 JSON 객체에 키 하나를 더한다.
   - 대상 선지: payload의 처음 고른 선지(`studentUtterances` 중 `selectedChoice`가 있는 첫 항목), 다시 고른 선지(두 번째, 있으면), 정답 선지(`source.answerChoiceId`의 position). 같은 선지는 한 번만 넣는다.

   ```
   choiceLinks: [{
     choice: 5,                         // 1~5 위치
     statement: "TRUE" | "FALSE",      // 동결 파일 truth (선지 내용이 원문에 맞는지)
     twists: [{ choicePart, sourceText, how, kind }],   // FALSE: twisted 조각마다 choicePart=choiceQuote, sourceText=evidenceQuote(빈 문자열이면 null), how=twistDetail, kind=TWIST_KO[twistType]
     support: [ "원문 근거 문장", ... ]                  // TRUE: 비틂 없는 조각들의 supportIds를 지도 명제·노드 text로 바꾼 것(중복 제거, 최대 4개). 〈보기〉 id(S…·F…)는 그 문항 〈보기〉 조각 글로 바꿀 수 있으면 바꾸고, 못 바꾸면 뺀다
   }]
   ```

   `TWIST_KO`는 `scripts/run-choice-link.mjs`에서 import한다.
2. **instructions 끝에 아래 문단을 그대로 덧붙인다** (줄바꿈 하나 뒤).

```
입력 choiceLinks는 선지마다 미리 정리한 자료다. statement가 FALSE인 선지는 twists에 선지의 어느 부분(choicePart)이 원문의 어떤 내용(sourceText)을 어떻게 바꿨는지(how) 적혀 있고, TRUE인 선지는 support에 그 선지가 기대는 원문 내용이 적혀 있다. 판정은 이미 끝났고 이 자료로 판정을 바꾸지 않는다. 내용은 반드시 원문으로 확인한 뒤 쓴다.
firstChoice·reselection 칸: 그 선지가 FALSE이면, 선지의 어느 표현이 원문의 어떤 내용을 어떻게 바꿨는지 한두 문장으로 짚고, 비슷한 선지를 만났을 때 원문에서 무엇을 확인하면 걸러낼 수 있는지 한 문장으로 말한다. 그 선지가 TRUE이면(틀린 것을 고르는 문제에서 맞는 선지를 고른 경우), 선지 내용이 원문의 어디와 맞는지 짚는다.
answer 칸: 정답 선지가 FALSE이면 같은 방식으로 바뀐 곳을 짚고, TRUE이면 support의 원문 내용으로 이유를 잇는다.
choiceLinks는 선지에 대한 사실이지 학생 생각에 대한 자료가 아니다. 학생이 그 바뀐 부분 때문에 선지를 골랐다고 단정하지 않는다. 학생 발화가 그 내용을 말했을 때만 둘을 잇는다. kind 같은 분류 이름을 학생에게 쓰지 않는다.
```

## 손댈 파일과 계약

### `scripts/run-end-explanation-choice-link-compare.mjs` (새 파일)

사용법: `node --env-file-if-exists=.env scripts/run-end-explanation-choice-link-compare.mjs [--dry-run] --out <dir> [--max-requests <n>] [--usd-cap <x>] [--seed <n>]`

- 실행 단위는 세션 × 조건(BASE, LINK) = 60요청이다. 세션 순서대로 BASE와 LINK를 번갈아 보낸다.
- 재시도는 0이다. 실패는 기록하고 다음으로 넘어간다.
- 전송은 기존 실행기들과 같은 OpenAI Responses 호출이다(`client.responses.create(request, { timeout: 60000 })` 등 저장된 options 그대로). 비용은 `scripts/run-analysis-map-gongsun.mjs`의 `usageCost`·`reserveUsd` 방식을 따르되, 모델이 `gpt-6.1-sol`인 이상 그 RATES를 쓴다. 다른 모델이면 멈춘다.
- 상한: 요청 수, 그리고 누적 실비 + 다음 예약액이 `--usd-cap`을 넘으면 멈춘다(기본 60요청·$4).
- ledger(jsonl): START·END 이벤트, 사용량, 비용.
- 출력 `<out>/`:
  - `sessions/<caseId>/BASE.request.json`, `LINK.request.json`. dry-run에서도 쓴다. 이미지 data URL은 지금 요청에 없지만, 있으면 길이·해시로 줄인다.
  - `sessions/<caseId>/BASE.response.json`, `LINK.response.json`, 그리고 파싱 결과 `BASE.json`·`LINK.json` (`{ firstChoice, reselection, answer }`).
  - `sessions/<caseId>/ORIGINAL.json`: 회귀 시험 당시 출력.
  - `CASES.json`: 세션 목록, 원 요청 경로, questionId, 역할, 처음·다시 고른 선지, 정답, choiceLinks.
  - `RUN.json`: 설정, 해시(원 요청, 지시문, 동결 파일), 결과 요약.
  - **블라인드 자료**:
    - `--seed`(기본 20261023)로 세션마다 X·Y에 BASE·LINK를 무작위로 배정한다.
    - `KEY.json`: 배정표. 판정 전 열지 않는 파일이다.
    - `BLIND-PAIRS.md`: 30쌍. 쌍마다 세션 번호(01~30, caseId는 숨김), 문항 발문, 선지 5개 원문, 정답 번호, 학생 발화와 교정 질문·답(payload `studentUtterances`), 설명 X·Y(세 칸 그대로)를 담는다. choiceLinks와 조건 이름은 넣지 않는다.
    - `USER-PAIRS.md`: 6쌍만 같은 형식으로 담고, 쌍마다 판정표를 붙인다. 판정표는 기준 ①~④를 X·Y 칸으로, "더 도움이 되는 쪽", "한 줄 이유" 칸을 둔다. 대상 세션은 `S-A1, D-B1, C-A3, I-B2, M-B3, G-B2`다.
  - 자동 점검 `CHECKS.json`: 각 출력에 `scripts/test-v5-live-connection.mjs`의 `explanationChecks`를 칸별로 적용한다. LINK·BASE 모두에 추가로 검사한다.
    - 분류 이름 노출: `TWIST_KO`의 값 14개 중 하나가 출력에 그대로 있는가.
    - 지도 id 노출: `/\b(?:[PCGRX]\d+(?:-\d+)?|TOP)\b/`.
    - 이 점검은 판정이 아니라 보조 자료다.
- dry-run: 외부 요청 0. 위 요청 파일, CASES.json, 예약액 합계, 지시문 일치 결과를 출력한다. BLIND 자료는 응답이 없으므로 만들지 않는다.

### `scripts/run-end-explanation-choice-link-compare.test.mjs` (새 파일)

- choiceLinks 만들기: FALSE 선지는 twists(빈 evidence는 null, kind는 한국어 이름), TRUE 선지는 support 문장 변환과 최대 4개 제한.
- 대상 선지 중복을 제거한다.
- LINK 요청은 instructions 덧붙임과 payload 키 하나 말고는 BASE와 같다(깊은 비교).
- 세션당 마지막 설명 요청이 1개가 아니면 예외.
- 지시문 불일치면 예외.
- seed 고정 배정이 재현된다.
- BLIND-PAIRS에 조건 이름과 choiceLinks가 없다.
- 상한 계산이 맞는다.
- 실제 30세션 dry-run을 끝까지 실행한다(DB·실험 폴더가 없으면 건너뜀).

## 완료 조건

- [ ] `node --test scripts/run-end-explanation-choice-link-compare.test.mjs` 통과
- [ ] dry-run: `node scripts/run-end-explanation-choice-link-compare.mjs --dry-run --out docs/experiments/choice-link-end-explanation-compare-2026-10-23/dry-run` → 30세션, 60요청, 지시문 일치, 예약액 합계 출력
- [ ] 보고에 세션 1개(S-B2)의 LINK 요청 payload `choiceLinks`와 덧붙인 지시문 앞 80자, 그리고 법인 세션 1개(C-A3)의 `choiceLinks`를 그대로 붙인다

## 중단·보고 조건

- 이 문서와 코드·데이터가 충돌하거나 설계 판단이 필요하면 멈추고 보고한다.
- 외부 요청이 필요해지면 멈춘다(이번 작업은 dry-run까지).

## 결과 보고 (실행 후 작성)

- 변경 파일:
- 테스트 결과:
- dry-run 출력:
- 해석 선택:

## 보완 1 (2026-10-23): 정답·근거 약함 12세션 추가

사용자 "정답, 근거 약함도 지도를 넣는 것으로 하자."(D-0167 보완). 위 계약 중 아래와 어긋나는 부분은 이 절을 따른다. **이번에도 dry-run까지.**

1. **세션 42개.** 기존 30개에 CT·CP 역할 12개(C·D·G·I·M·S × CT·CP)를 더한다. 요청은 `v5-diverse-48-regression-2026-10-22/requests/`의 마지막 설명 요청(세션당 정확히 1개)이다. 세션 번호는 기존 순서 뒤에 CT, CP를 붙인다(접두 안에서 A1·A3·B1·B2·B3·CT·CP 순).
2. **지시문 확인은 세션 종류별로 한다.** 오답 30개는 `INCORRECT_END_INSTRUCTIONS`, 정답 12개는 `CORRECT_END_INSTRUCTIONS`와 같아야 한다. 저장된 요청이 어느 쪽과도 같지 않으면 멈춘다. 종류는 저장된 instructions가 어느 상수와 같은지로 정한다.
3. **모델.** 저장된 요청의 모델을 그대로 쓴다. 오답은 `gpt-6.1-sol`, 정답은 `gpt-6-luna`로 예상된다. 허용 모델과 단가는 `scripts/run-v5-diverse-48.mjs`의 `LIMITS` 단가(sol 입력 2·출력 10, luna 입력 0.10·출력 0.50, 백만 토큰당 달러)를 따른다. 그 밖의 모델이면 멈춘다. 상한은 모델별이다: `--usd-cap-sol`(기본 4)·`--usd-cap-luna`(기본 0.5), 요청 수 `--max-requests`(기본 84). 기존 `--usd-cap`은 sol 상한의 별칭으로 남겨도 된다.
4. **정답 세션의 덧붙임 지시문.** 정답 세션 LINK 요청에는 앞의 덧붙임 대신 아래 문단을 그대로 덧붙인다. choiceLinks 만드는 법은 같다(대상 선지: 처음 고른 선지, 다시 고른 선지, 정답 선지, 중복 제거).

```
입력 choiceLinks는 선지마다 미리 정리한 자료다. statement가 FALSE인 선지는 twists에 선지의 어느 부분(choicePart)이 원문의 어떤 내용(sourceText)을 어떻게 바꿨는지(how) 적혀 있고, TRUE인 선지는 support에 그 선지가 기대는 원문 내용이 적혀 있다. 판정은 이미 끝났고 이 자료로 판정을 바꾸지 않는다. 내용은 반드시 원문으로 확인한 뒤 쓴다.
answer 칸: 정답 선지가 FALSE이면(틀린 것을 고르는 문제), 선지의 어느 표현이 원문의 어떤 내용을 어떻게 바꿨는지 한두 문장으로 짚고, 비슷한 선지를 만났을 때 원문에서 무엇을 확인하면 걸러낼 수 있는지 한 문장으로 말한다. 정답 선지가 TRUE이면 support의 원문 내용으로 이유를 잇는다. 학생이 말하지 않은 연결을 원문으로 채울 때 이 자료를 쓴다.
firstChoice·reselection 칸의 규칙(학생 근거에서 틀린 곳이 확인되지 않았으면 틀렸다고 단정하지 않음 등)은 그대로 따른다. 다른 칸에서 고르지 않은 선지가 있으면 오답 세션과 같은 방식으로 짚는다.
choiceLinks는 선지에 대한 사실이지 학생 생각에 대한 자료가 아니다. 학생이 그 바뀐 부분을 알아봤다거나 놓쳤다고 단정하지 않는다. kind 같은 분류 이름을 학생에게 쓰지 않는다.
```

5. **블라인드 자료.** `BLIND-PAIRS.md`는 42쌍이다. 세션 종류(오답·정답)는 표시해도 된다. 조건은 계속 숨긴다. `USER-PAIRS.md` 대상은 `S-A1, D-B1, C-A3, I-B2, M-B3, G-CT`로 바꾼다.
6. 테스트: 정답 세션 지시문 확인과 덧붙임 선택, 모델별 상한, 42세션 dry-run을 더한다.
7. dry-run 출력 위치는 같다(`.../dry-run`, 덮어쓰기). 보고에 모델별 요청 수·예약액, 정답 세션 1개(S-CP)의 choiceLinks를 붙인다.
