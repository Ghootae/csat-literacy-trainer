# 인계: 진단 결과 ② 오답 카드 3층 구조 구현

- 날짜: 2026-11-20
- 작성: Claude(코드 에이전트 메인 세션)
- 실행: executor 하위 에이전트(sonnet)
- 관련 설계: `docs/handoffs/2026-11-19-wrong-answer-card-3-layer.md`(카드 구조 합의본), `docs/experiments/wrong-card-layer1-2026-11-19/PROMPT-v1.2.md`(생성 지시문), `docs/experiments/wrong-card-layer1-2026-11-19/run.mjs`(입력 만들기·코드 검사·"그래서" 제거 — TS로 옮겨 재사용), `docs/handoffs/2026-11-19-reading-habit-summary-impl.md`와 `packages/app/src/server/diagnostic/reading-habit.ts`(나란히 돌리는 생성 호출의 선례: 저장·재호출 방지·실패 처리·사건 기록)
- 관련 결정: 11/17 설계 3절 "문항 카드"의 공통 요소 순서·배치를 위 합의본이 대체한다(경우별 내용·자기 점검 버튼·14절 원칙은 유지).

## 목표

진단 결과 ② 문제 풀이의 문항 카드(오답·근거 부족 정답)가 3층 구조로 보이고, 1~3층 문장은 문항당 1회 모델 호출(sol)로 생성한다. 코드 검사를 통과하지 못하면 1회 재생성하고, 그래도 실패면 지금 카드(11/17 형식)를 그대로 보여 준다.

### 1) 서버

- 새 모듈(예: `packages/app/src/server/diagnostic/wrong-card.ts`)을 `reading-habit.ts`와 같은 방식으로 만든다.
  - **대상**: 오답(근거 씀 `WRONG_PROVIDED` / 근거 없음 `WRONG_OMITTED` / "적절하지 않은 것" `WRONG_TRUE_CHOSEN`)과, 근거를 쓴 정답 중 첫 근거 판정이 SUPPORTED가 아닌 것(`CORRECT_WEAK`, 기존 `eligibleDiagnosis`와 같은 조건). 문항 검토(`reviewFlag`)·경계(boundary) 문항은 제외하고 11/17 카드를 그대로 쓴다.
  - **case는 코드가 정한다**(`run.mjs`의 `decideCase`와 같은 규칙: 정답이면 `CORRECT_WEAK`, 발문이 "적절하지 않은 것"이면 `WRONG_TRUE_CHOSEN`, 아니면 근거 없음 `WRONG_OMITTED`/있음 `WRONG_PROVIDED`).
  - **입력**은 `run.mjs`의 `buildInput` 출력과 같은 모양이다: `case, item{title,number}, stem, stemPolarity, chosen, answer, studentRationale(첫 응답만, 근거 없음이면 생략), rationaleJudgment(CORRECT_WEAK만), chosenTwists|answerTwists(twistDetail·choiceQuote·evidenceQuote만; WRONG_TRUE_CHOSEN은 answerTwists, CORRECT_WEAK는 없음), passage, examinerStrategy(있을 때만), symbols[{symbol, location?, anchorText?, dictionaryGloss?}], megastudy`. 학생 근거는 **첫 응답**(`first.rationale`)만 쓴다(직전 버그 수정과 같은 원칙).
  - **지시문**은 `PROMPT-v1.2.md` 전문을 그대로 `instructions`로 쓴다(`loadReadingHabitPrompts`처럼 파일에서 읽고, 버전 상수 `v1.2`를 사건 기록에 남긴다). 모델·호출 방식은 읽기 습관 생성과 같다(`THOUGHT_DIAGNOSIS_MODEL`, 기존 transport·재시도·타임아웃 규칙 재사용).
  - **코드 검사**는 `run.mjs`의 `codeChecks`와 `stripLeadingSo`를 TS로 옮긴다(검사 항목·금지어·`**` 제거 비교·130자·기호 풀이·"기호(" 형태 동일). `conclusion` 앞 "그래서"는 지운다.
  - **실패 처리**: 검사 실패 또는 JSON 오류면 1회만 다시 생성. 그래도 실패면 상태 `fallback`(모델 출력은 사건 기록에만 남기고 화면에는 쓰지 않음).
  - **시점·병렬**: 해당 문항의 첫 판정과 사고 진단이 끝난 뒤 시작하고(진단 결과가 case에 필요 없지만 문항 검토 여부 확정이 필요), 읽기 습관 생성과 서로 기다리지 않고 나란히 돈다. `result()`는 호출을 시작하지 않고 저장된 상태만 읽는 쪽이 아니라면 `reading-habit.ts`의 기존 규칙(같은 입력은 재호출 없음)을 따른다.
  - **저장**: 참가자 상태에 문항별 카드 결과(상태 `pending|ready|fallback`, 출력, 시도 횟수, 입력 해시 또는 지시문 버전)를 저장해 다시 열 때 재호출하지 않는다. **옛 참가자 파일(필드 없음)도 그대로 읽혀야 한다**(`reading-habit.test.ts`의 "옛 참가자 파일" 선례).
  - **응답**: `result().items[].card`에 `{ status: 'pending'|'ready'|'fallback'|'none', layer1, symbolGlosses, pair{top,source,sourceFocus,conclusion}, missedAnswer?, examinerIntent, selfCheckOptions? }`를 낸다. **`matchesTrap`은 저장만 하고 응답에 넣지 않는다.** `ready`가 아니면 클라이언트는 기존 11/17 카드를 쓴다.
- 사건 기록: 시도·검사 실패 항목·최종 상태·토큰을 읽기 습관 생성과 같은 방식으로 남긴다.

### 2) 화면(`packages/app/src/client/diagnostic/ResultSolve.tsx` 등)

`card.status === 'ready'`일 때만 3층 카드를 그린다. 아니면 현재 카드(11/17 형식)를 그대로 그린다(그 코드는 지우지 않고 대체 경로로 남긴다).

- **1층(항상)**: `layer1` 문장 → 구분선 → 기호 풀이(`symbolGlosses`, 있을 때만) → 고른 선지 선택률 작은 줄("⑤를 고른 수험생 화작 14% · 언매 11%"; `megastudy`의 기존 값). 정답 카드(`CORRECT_WEAK`)는 선택률 줄을 생략한다.
- **2층(항상)**: 맨 위 칸 = 근거 쓴 경우 "내 근거"(`pair.top`, `**…**` 굵게), 근거 없는 오답은 "선지에서 맞는 부분" → ↓ "원문"(`pair.source`, `pair.sourceFocus`만 굵게, 나머지 보통 글씨) → ↓ "그래서"(`pair.conclusion`). 그 아래 "정답 선지"(번호 + 문장 그대로, 정답 카드는 생략), `WRONG_TRUE_CHOSEN`이면 "네가 놓친 진짜 틀린 선지"(`missedAnswer.text` + 원문). 근거 없는 오답이면 "근거를 안 써서 어디서 헷갈렸는지는 몰라. 너는 어땠어?" + 생성된 `selfCheckOptions` 3개 버튼(기존 자기 점검 저장·다시 고르기 동작 재사용; 기존 고정 문구 버튼 대신 생성 문구를 쓴다).
- **3층("자세히 보기"로 접힘, 기본 접힘)**: 다른 수험생은(문항 정답률 화작·언매 + 고른 선지 선택률) / 출제자가 노린 것(`examinerIntent`) / 네 요약과 연결(기존 `summaryLink` 문장 그대로, 있을 때만) / "문항으로 돌아가 출제자 설명 보기 →" 버튼(기존 `strategyAvailable` 동작 그대로).
- 기호는 1층 풀이에서만 설명하고 2·3층에서는 괄호 없이 그대로 쓴다(모델 출력이 이미 그렇다. 화면에서 기호 괄호 설명을 덧붙이지 않는다). `annotateSymbols`가 카드 본문에 기호 풀이를 붙이고 있으면 3층 카드 경로에서는 쓰지 않는다.
- PC·모바일(`<= 폭 기존 기준`) 모두 깨지지 않게 한다. 새 CSS는 기존 `diag-*` 접두어 규칙을 따른다.

### 3) 테스트(모델 호출 없음)

- 코드 검사 단위 테스트: 통과 사례 1개 + 항목별 실패 사례(원문 불일치, `sourceFocus` 밖, `pair.top` 불일치, 금지어, 131자, 1층에 없는 기호 풀이, 2·3층 "기호(" 형태, `WRONG_TRUE_CHOSEN`의 `missedAnswer.source`), "그래서" 제거(지운 사실 기록).
- 입력 만들기 단위 테스트: case 판정 4종, 학생 근거가 첫 응답만 쓰이는지, `WRONG_OMITTED`는 `studentRationale`이 없음, 비틂 선택(`WRONG_TRUE_CHOSEN`=answerTwists).
- 서버 흐름(가짜 transport): 성공 → `ready`, 1회 실패 후 재생성 성공 → `ready`(호출 2회), 연속 실패 → `fallback`(호출 2회, 응답에 모델 출력 없음), 같은 입력 재조회에 재호출 없음, `matchesTrap`이 응답에 없음, 옛 참가자 파일 로드.
- 화면 렌더(고정 출력 사용, `reading-habit-view.test.ts`·`logic.test.ts` 선례): `ready` 카드의 1·2·3층 요소(구분선 아래 기호 풀이, 선택률 줄, 핵심 구절만 굵게, 접힘 기본값, 자기 점검 버튼 3개, 정답 카드의 선택률·정답 선지 생략), `fallback`·`pending`이면 11/17 카드가 나오는지.
- 기존 테스트(진단 관련 11개 파일)는 모두 통과해야 한다.

### 4) 개발 모드 실사용 확인(외부 전송 승인 범위: **S-23 한 명만**)

개발 모드(`DevDiagnostic`, 개발자 가상 학생 흐름)에서 S-23만 끝까지 돌려 결과 화면에서 3층 카드가 뜨는지 확인한다. 이 한 번의 실행에 한해 모델 호출(판정·진단·읽기 습관·오답 카드 생성)이 승인되어 있다. 호출 수(종류별)를 보고한다. 다른 학생·반복 실행은 하지 않는다. 화면 캡처(PC·모바일 각 1장 이상: 오답 카드 3층이 펼친 상태와 접힌 상태가 보이게)를 `docs/handoffs/2026-11-20-wrong-card-3-layer-pc.png`·`-mobile.png`로 저장한다. 카드가 `fallback`이면 그 사실과 검사 실패 항목을 그대로 보고한다.

## 범위 밖

- `PROMPT-v1.2.md`·`run.mjs`·`HAND-CARDS.md`·`RESULTS*.md` 수정(`run.mjs`는 TS 이식의 원본으로 읽기만 한다). 지시문 문구를 서버에서 고치지 않는다.
- 요약 종합 분석, 독해 패턴(③), 맨 위 요약, 분해 막대, 등급 계산.
- `memory/` 기록, 커밋·푸시(메인 세션이 diff 검토 뒤 한다). 이 인계 문서는 수정하지 말고 "결과 보고"만 채운다.
- 카드 생성 외의 모델 호출 추가, 검토 모델 호출.

## 완료 조건

- [ ] 3층 카드가 `ready`일 때 위 2) 구조로 그려지고, `fallback`/`pending`/`none`이면 11/17 카드가 그대로 나온다.
- [ ] 같은 참가자의 결과를 다시 열어도 모델이 다시 호출되지 않는다(테스트로 증명).
- [ ] 응답·화면에 `matchesTrap`이 없다(저장만).
- [ ] `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic` 통과, 타입 검사(`npm run build` 또는 `npx tsc -p ...` 중 이 저장소가 쓰는 것) 통과.
- [ ] S-23 실사용 확인 결과와 캡처 2장 이상.

## 중단·보고 조건

- 이 문서와 코드·테스트·결정 기록이 충돌하거나 설계 판단이 필요해지면 구현을 멈추고 충돌 내용과 선택지를 보고한다. 설계를 임의로 바꾸지 않는다(예: 대상 문항 범위, 응답 모양, 화면 요소를 바꾸고 싶어질 때).
- 4)의 승인 범위(S-23 한 명, 한 번)를 넘는 외부 호출이 필요해지면 실행 전에 멈춘다.
- 코드 검사 통과율이 낮아 보여도 지시문·검사를 임의로 완화하지 않는다. 사실만 보고한다.

## 결과 보고 (실행 후 작성)

- 변경 파일:
  - 새 파일: `packages/app/src/server/diagnostic/wrong-card.ts`(입력 만들기·코드 검사·"그래서" 제거·호출·응답), `wrong-card.test.ts`, `packages/app/src/client/diagnostic/ResultCard3.tsx`(3층 카드), `wrong-card-view.test.ts`, 캡처 `docs/handoffs/2026-11-20-wrong-card-3-layer-pc.png`·`-mobile.png`
  - 수정(서버): `content.ts`(지시문 버전 `v1.2`·`loadWrongCardPrompt`), `store.ts`(`items[].wrongCard?`), `controller.ts`(`wrongCardTransport` 옵션, `result().items[].card`, 재시작 시 pending 비움, 사건 `WRONG_CARD_DONE`)
  - 수정(화면): `ResultSolve.tsx`(ready면 3층, 아니면 11/17 카드 그대로, 자기 점검 버튼 문구 주입), `types.ts`, `logic.ts`(`focusSegments`, `hasPending`에 카드 pending), `diagnostic.css`(`diag-l1/l2/l3*`)
  - 수정(기존 테스트가 실제 모델로 나가지 않게 `wrongCardTransport: refusedHabitTransport()` 추가·`card` 필드 보강): `controller.test.ts`·`controller-dev.test.ts`·`controller-evaluator.test.ts`·`http.test.ts`·`reading-habit.test.ts`·`logic.test.ts`·`reading-habit-view.test.ts`, e2e `diagnostic-flow.spec.ts`·`diagnostic-dev-navigation.spec.ts`
- 테스트 결과: `npx vitest run packages/app/src/server/diagnostic packages/app/src/client/diagnostic` 13개 파일 236개 통과(새 테스트: 서버 29개·화면 18개). `npm run typecheck` 통과.
- S-23 실사용 확인(호출 수·카드 상태·캡처 경로): S-23 = 가상 학생 H3(`students.py`), 요약 대화 없이(`summary:false`) 16문항을 입력해 한 번 실행. 호출: 첫 선택 판정 13(+정답 3문항 마지막 설명 3, 기존 흐름), 사고 진단 8, 읽기 습관 생성 1·검토 1, 오답 카드 생성 10(카드 9장 중 8장은 1회에 통과, 1장은 2회 실패). 카드 상태: ready 8장(근거 있는 오답 3, 근거 없는 오답 1, 근거 부족 정답 4), fallback 1장(경마식 7번, 적절하지 않은 것 오답). fallback 사유: 두 시도 모두 코드 검사 "금지어(규칙 4)가 없다"에서 실패(본문에 "오차 범위"의 "범위"). 검사는 완화하지 않았다. 화면 확인: 개발 모드 결과 칸에서 3층 카드(접힘 기본, 펼침 동작), 수평 넘침 없음, fallback 카드는 11/17 카드로 나옴. 캡처: `docs/handoffs/2026-11-20-wrong-card-3-layer-pc.png`·`-mobile.png`(접힌 상태와 펼친 상태를 한 장에 나란히).
- 남은 문제:
  - 금지어 검사: "범위"가 일반 낱말("오차 범위")로 쓰인 경우도 걸린다(S-23 7번 fallback). 검사·지시문 변경은 설계 판단이라 하지 않았다.
  - 근거 없는 오답 중 발문이 "적절하지 않은 것"인 경우 case가 `WRONG_TRUE_CHOSEN`이라 `selfCheckOptions`가 생성되지 않는다. 이때는 기존 고정 문구 버튼을 쓴다(인계에 규정 없음, 설계 확인 필요). `WRONG_OMITTED`인데 모델이 `selfCheckOptions`를 빼도 코드 검사 항목에 없어 ready가 되고 같은 대체를 쓴다.
  - 정답 카드(`CORRECT_WEAK`)에서 첫 판정이 실패(`FAILED`)한 경우 `rationaleJudgment` 없이 호출한다(`eligibleDiagnosis`와 같은 조건을 따른 결과).
  - 3층 카드는 11/17 카드의 발문·고른 선지 전문·"피드백으로 고쳤어" 배지를 보이지 않는다(인계 2) 구조에 없음).
  - 카드 호출은 `analysisConcurrency`(기본 8)를 다른 호출과 함께 쓴다.

## 후속 수정 (2026-11-20, 메인 세션)

"남은 문제" 중 세 가지를 고쳤다: ① 3층 카드 제목 아래에 발문 한 줄과 고른 선지 전문(작은 글씨, 비튼 구절 강조 없음), ② 금지어 검사에서 지문·발문·선지(고른·정답 선지)에 그대로 나오는 낱말은 예외, ③ 지시문 `PROMPT-v1.3.md`(근거 없는 오답이면 case와 상관없이 `selfCheckOptions` 3개)와 코드 검사(근거 없는 오답인데 3개가 아니면 실패). 확인: S-23 경마 7번 카드만 재생성해 1회에 `ready`(`docs/experiments/wrong-card-layer1-2026-11-19/runs/v1.3/s23-horse7.json`). 나머지 "남은 문제" 3·5번은 그대로다.
