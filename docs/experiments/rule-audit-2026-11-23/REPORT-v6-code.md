# v6 코드 반영 보고 (규칙 감사 3단계 마무리, 2026-11-24)

- 작업: `CLI-step3b-code-v6.md` 0~9단계, 바탕 `PROPOSAL-code-v6.md`. API 호출 없음(문법 검사·가짜 데이터 시험·저장 파일 재계산·건조 실행만).
- 원칙: 새 동작은 `RULES_V=6`일 때만 켠다. 기본값 5는 v5 그대로다.

## 바꾼 곳 (파일:줄)

### 규칙 파일 3곳 (PROPOSAL 3절)
- `strategies-v6.md` 40행(S1): "S1을 고르면 이 가장 깊은 고리를 정답(참 선지) 자리에 둔다".
- `kind-table-v6.md` 30행(K-T6 점검 질문): 표 칸을 가렸을 때 정오가 정해지는 선지마다 지문 문장 하나를 그대로 대조하는 것으로 끝나는가, 그런 선지가 둘 이상인가.
- `rules-common-v6.md` 116행(V2): "지문의 관점이 셋 이하면, 모든 관점이 선지에 한 번 이상 나오면 된다."

### run.mjs
- 27~37행: 머리말 설명, `V6`·`DRY` 상수, `classify-v6.mjs`의 `checkStrategiesV6` 가져오기.
- 56행: 건조 실행(DRY_RUN=1)이고 키가 없으면 가짜 키로 클라이언트를 만든다(호출은 하지 않음).
- 68·98~101행: V6이면 `rules-${MODE}-v6.md`, `rules-common-v6.md`(v53-B 안 읽음), `kind-*-v6.md`, `strategies-v6.md`를 읽는다.
- 115행: SPEC의 "(공통 C6)" → V6에서 "(OP2)".
- 124행: `call()` 맨 앞에 건조 실행: 지시문·입력을 `<단계>.dry.txt`로 쓰고 API 없이 돌아온다.
- 189행: 2단계 B형 지시를 PROPOSAL 2-2 문안으로(V6만).
- 218~244행: `ASSEMBLE_A_V6`, `ASSEMBLE_B_V6`(2-3·2-4절 문안, 0번 "전략 고르기" 포함).
- 245~250행: 3단계 지시 선택, JSON 예시에 strategies·strategyUse, "roles는 … (OP3)", "answerTwist는 M1 표의 방식 이름(OP2)", strategies 설명 문장, 입력 머리말 "[공통 규칙 v6 — …]" 뒤에 "[선택 전략 목록]".
- 252행: 건조 실행이면 3단계 지시문을 쓴 뒤 멈춘다(3b 이후는 가지 않음).
- 261·269·275·289행(3b·3c): 점검표 `polish-checklist-v6.md`, "(R1·M9)", "[공통 규칙 v6]", "kind, answerTwist, twists, roles, rival, strategies, strategyUse는 그대로 옮긴다/둔다".
- 309행: 3b·3c가 strategies·strategyUse를 흘리면 3단계 값으로 채운다(PROPOSAL에 없던 보강, 아래 후보 1).
- 366행: "정답이 가장 긴 선지" 점검은 V6에서 끈다(`answerLenRank`는 그대로 기록).
- 377행: V6이면 `checkStrategiesV6` 결과를 checks에 "전략 점검: …"으로 더한다.

### classify-v6.mjs (새 파일)
- `classifyV6(item, mask, e2, e3)`: 순수 함수. 결함(정답 유일성) / 방식 위반 M2·M3·M4·M5 / 수리 대상(방식 위반 2개 이상, 결함 아님) / 경고로 내린 사유 / 고른 전략 못 지킴(S3·S1·S4) / "정답이 가장 긴 선지" 경고 지움. diag에 `defect`, `methodViolations`, `methodDetails`, `strategyWarnings`, `tasks`, `bogiOnly`를 더한다.
- `checkStrategiesV6(item, mode, kind)`와 `STRATEGY_USE`(strategies-v6 목록 표의 "쓸 수 있는 곳"을 코드 상수로).
- 순수 모듈로 따로 둔 이유: `eval-repair.mjs`는 불러오자마자 openai 패키지를 찾고 실행되어, 시험 파일이 바로 가져올 수 없다.

### eval-repair.mjs
- 13~21행: 머리말, `classifyV6` 가져오기, `V6` 상수. 45행: V6이면 `rules-common-v6.md`.
- 96·104행: e3 지시에 `task`·`bogi_only` 칸과 JSON 예시(V6만, MARKING-SCHEMA-v2 F4 문안 그대로).
- 111행: V6이면 `diag = classifyV6(...)`, 아니면 v5 코드 그대로.
- 152·157·162·164행(e4): V6 수리 사유는 방식 위반(M2~M5)만 넘긴다. v5의 "정답은 핵심 관찰을 해석해야" 문장과 "정답이 가장 길지 않게" 문장은 V6에서 뺀다. 입력 머리말 "[공통 규칙 v6]". 수리 뒤 재검사(`evaluate(..., 'r')`)도 같은 분기를 쓴다.
- 요약 줄: 결함이면 "결함(다시 생성)"으로 표시.

### classify-v6.test.mjs (새 파일)
- 시험 사례 6개 + 보충 2개. `node docs/experiments/deep-item-v5-2026-11-18/classify-v6.test.mjs`로 바로 실행.

## 5단계 결과 (API 비용 없음)
1. `node --check run.mjs`, `node --check eval-repair.mjs`: 통과.
2. 시험 사례: **8/8 통과**. (1) 유일성 문제 → defect·수리 아님 (2) M4만 → 경고·수리 아님 (3) M2+M5 → 수리 (4) 정답 지문 한 사실 + S3 → 전략 경고·수리 아님 (5) 문제 없음 → 통과 (6) 오답끼리 거울 짝 → M5 위반 (보충) M3 극성 처리, 전략 점검.
3. v5 경로 확인:
   - 저장된 `eval.json`의 diag와 다시 계산한 값은 **다르다**(예: doppler-bloodflow-A V1은 저장본이 "정답이 〈보기〉 관찰 하나"를 수리 사유로, 지금 코드는 경고로 둔다). 저장본이 11-19 15:49에 만들어져 "보정 3차"(관찰 하나를 경고로 내림) 이전 코드의 결과이기 때문이다. 내 변경 때문이 아니다.
   - 그래서 **HEAD의 eval-repair.mjs와 새 eval-repair.mjs(RULES_V 없음)를 같은 저장 e1~e3로 돌려 비교**했다. doppler-bloodflow-A, mrna-vaccine-lipid-nanoparticle-B, doppler-12 세 곳 모두 `eval.json`·`eval-summary.txt`가 바이트 단위로 같다(저장 파일을 쓰는 단계는 캐시라 API 호출 없음).
   - run.mjs는 HEAD 사본에 건조 실행 패치만 더해 RULES_V 없는 새 run.mjs와 2단계·3단계 지시문을 비교했다. 지문 `disclosure-insider`, A·B 양식 모두 **바이트 단위로 같다**.
4. 건조 실행(RULES_V=6 DRY_RUN=1, 지문 disclosure-insider, A·B, 갈래 case·view): 2·3단계 지시문 생성. "(옛 " 괄호 밖의 옛 번호(C숫자, K-S, K-E, "규칙 숫자", "가장 긴", "반드시 하나", "C23") grep 결과 **0줄**. 0번 "전략 고르기", "[선택 전략 목록]", "[공통 규칙 v6 …]", strategies 설명이 들어갔다. 건조 실행 폴더는 시험 뒤 지웠다.
5. 보너스: 같은 저장 e1~e3(task·bogi_only 칸은 없음)를 RULES_V=6으로 돌려 봄. 판정 함수가 저장 데이터로 오류 없이 돈다. doppler-bloodflow-A: V1·V2 모두 통과. mrna-vaccine-lipid-nanoparticle-B: V2가 M5 위반 하나(경고). task·bogi_only가 없어 M2·M3·M4는 계산되지 않는다(실제 e3 새로 돌려야 나옴).

## PROPOSAL 문안과 다르게 한 곳 / 후보
1. **3b·3c가 strategies·strategyUse를 흘릴 때 3단계 값으로 채우는 코드(run.mjs 309행)를 더했다.** PROPOSAL은 3b·3c 지시에 "그대로 옮긴다"만 있다. 모델이 흘려도 전략 점검이 헛경고하지 않게 한 보강이다. 싫으면 한 줄 지운다.
2. **규칙 파일에 붙은 "(옛 …)" 표시가 3단계 지시문에 그대로 들어간다**(3단계 입력에서 A 61줄, B 65줄). 코드가 만든 문자열에는 옛 번호가 없지만, 읽어 주는 규칙 파일 안에는 있다. 모델에게 소음일 수 있다. 4단계 전에 로드할 때 지우는 안이 있다.
3. **e4(수리) 지시의 "오답 역할" 문장은 V6에서도 남겼다.** S9가 선택 전략이라 엄밀하게는 v6 취지와 안 맞을 수 있다(PROPOSAL 4-3은 이 문장을 언급하지 않음). e4의 "(v5.3) 거울 짝" 문장도 그대로다.
4. **e4의 공통 규칙은 V6에서 rules-common-v6.md를 보낸다.** PROPOSAL 4-3에 명시가 없어 짝을 맞추려 한 판단이다.
5. **S1 전략 경고의 조건**(정답 steps ≤ 1 또는 〈보기〉 관찰 하나)은 v5의 경고 조건처럼 "정답이 지문 한 사실이 아닐 때만" 걸린다. 정답이 지문 한 사실이면 S3 경고만 뜬다.
6. **S1~S4 전략 경고의 판정 사유 이름은 diag에 `strategyWarnings` 배열과 warnings 양쪽에 들어간다.** 중복으로 보일 수 있다.
7. **건조 실행(DRY_RUN) 옵션을 run.mjs에 새로 넣었다.** PROPOSAL에 없는 옵션이고 v5에서도 동작한다(RULES_V와 독립). 5단계가 "건조 실행 옵션이 있으면"이라 한 대로다.
8. **PROPOSAL 초안 상태 표시**("초안. Ghootae 결정 전")는 CLI 지시문의 승인 문장(이 지시문을 붙여 넣는 것이 승인)에 따라 진행했다. PROPOSAL 파일의 상태 줄은 고치지 않았다.

## 하지 않은 것
- 실제 생성·검사 실행(4단계). R1~R3·S12 재표시. readability-guide, kind-graph graphSpec 처리.
- 오답 카드 파일 4개, v5 규칙 파일은 건드리지 않았다.

## 덧붙임: 코드 손질 2곳 (CLI-step3c-remark 2~4단계, 웹 결정 2026-11-24)
- **2단계 "(옛 …)" 표시 제거:** `run.mjs`·`eval-repair.mjs`에 `stripOld`(정규식 `/\s*\(옛 [^()]*\)/g`, RULES_V=6일 때만)를 두고 v6 규칙 파일(rules-common-v6, strategies-v6, rules-A/B-v6, kind-*-v6, polish-checklist-v6)을 읽은 직후 적용한다. 파일은 그대로. 건조 실행(RULES_V=6 DRY_RUN=1, 지문 disclosure-insider, A·B, case·view)으로 만든 3단계 지시문의 남은 "(옛" 수: **A 0, B 0**.
  - **새로 보인 것(후보):** "(옛 …)" 괄호는 없어졌지만 규칙 본문 안에 옛 번호가 남은 곳이 있다. `rules-common-v6.md`의 M6("A22·B25 … C8로 맞춘다(REVIEW 2절 충돌 1)"), M11("K-S5 … REVIEW 충돌 6"), 그리고 OP8의 "가장 긴 선지"(뜻은 맞는 말). 규칙 파일은 고치지 않는다는 지시라 그대로 두었다. 4단계 전에 고칠지는 웹이 정한다.
- **3단계 e4 지시:** RULES_V=6에서 "오답 역할" 문장을 뺐고 "(v5.3) 거울 짝"을 "(M5) 거울 짝"으로 바꿨다. v5 경로 문자열은 그대로다.
- **4단계 확인:** `node --check` 두 파일 통과. `classify-v6.test.mjs` 8/8 통과. v5 경로 바이트 비교: (a) run.mjs 2·3단계 지시문 — HEAD 사본 대 새 코드, disclosure-insider A·B 동일. (b) eval-repair.mjs e4 지시문 — HEAD 대 새 코드, 저장된 mrna-vaccine-lipid-nanoparticle-B V2(v5 판정 수리 대상)로 REPAIR=1 캐시 실행해 지시문을 덤프해 비교, 동일(API 호출 없음). (c) eval.json·eval-summary.txt는 이전 보고에서 세 곳 동일.
- 후보 1(3b·3c가 strategies를 흘리면 채움)은 그대로 둔다.

## 덧붙임: R2·R3 층 변경 반영 (CLI-step3d-r2r3, 결정 2026-11-24 00:44 Ghootae, REPORT-rule-compliance-r3.md 3절)
- `rules-common-v6.md` R2(129~133행 근처): "〈보기〉의 지문 용어는 돌려 말하지 않는다"로 바꿈. 점검 질문은 (3)만, '주파수' 예·새 이름 예는 남김. (1)(2)·"반납 완료·면제" 예·"대개 1~2개"는 S18로. R3는 지우고 "R3 → 선택 전략 S19로 옮김(2026-11-24, 기출 11/26)" 한 줄. R3의 "같은 사안 밖에 덧붙인 사건" 문장은 S5("흐름 밖 사건을 덧붙이지 말고")에 이미 있음을 확인했다. V3 추가(V2 뒤, "(옛 C2 앞부분, 관점 6/6)").
- `strategies-v6.md`: 목록 표에 S18(사례·표·그래프), S19(모두), 본문 S18·S19(끝). 출처 표시는 지시대로.
- 참조 맞춤: `kind-view-v6.md` 14·15행(K-E8 → S19, V1·V2·V3, S18은 V3가 맡음), `kind-case-v6.md` 17행(K-S1 → R2·S18, K-S2 → S19), `rules-B-v6.md` RB2(R2 → S18). **`polish-checklist-v6.md` 4번의 "(R2)"는 지시대로 바꾸지 않았다**(숨긴 라벨이 아닌 용어를 되살린다는 뜻이라 R2의 새 뜻과 맞는다). `rules-A-v6.md`의 옛 번호 안내 줄은 R2·R3을 가리키지 않아 그대로.
- `run.mjs` 224행(A 지시 1번): "선지가 판정하는 개념어는 비운다(R2)" → "〈보기〉의 지문 용어는 돌려 말하지 않는다(R2). 관점 갈래는 선지가 판정하는 개념어를 〈보기〉에 쓰지 않는다(V3)." **B 지시 1번에는 이 문장이 없어(원래 "변수는 값이나 관찰 특징으로 보여 준다") 바꿀 곳이 없었다.**
- `classify-v6.mjs` STRATEGY_USE: S18(A·B, case·table·graph), S19(A·B, 모두). `classify-v6.test.mjs`: S18을 관점(view)에서 고르면 경고, S18·S19를 B·table에서 고르면 통과(보충 사례 안에 2줄).
- `polish-checklist-v6.md`, readability-guide는 바꾸지 않았다.
- **6단계 결과:** `node --check` 두 파일 통과, `classify-v6.test.mjs` 8/8 통과. v5 경로 바이트 비교: `run.mjs` 2·3단계 지시문(HEAD 대 새 코드, disclosure-insider A·B) 동일. `eval-repair.mjs`는 이번에 안 바뀜(diff 없음). RULES_V=6 건조 실행(disclosure-insider, A·B, case·view): "(옛" **0개**, "판정하는 개념어는 비운다" **0개**; S18·S19·V3가 지시문에 각 1번 들어감.
