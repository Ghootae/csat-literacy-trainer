# ④ 사회 A형 시험 — 실행 계획 초안 (웹 충돌 검토용, 미실행)

- 작성: 2026-11-21, 코드 에이전트. **API 호출 없음, 실행 안 함.** 웹 충돌 검토와 Ghootae 결정이 온 뒤에 돌린다.
- 읽은 자료: STRATEGY-hard-cells.md 0-3절·3절·사회 사례 절, PROGRESS-hard.md, REVIEW-case-humanities-social.md 8절(마지막 회차), REPORT-cell-gen62.md, run.mjs, 규칙 파일 diff(git log).
- 경로 기준: 실험 폴더 `docs/experiments/deep-item-v5-2026-11-18/`(아래 `V5/`), 진행 문서 `docs/experiments/set-pattern-2026-11-18/`.

## 1. 확인하려는 것

**0-3의 '1 원칙'** (STRATEGY-hard-cells.md 0-3절 1, 원문):

> 기출 해부 A1(재판매)이 보여 준 방식 하나만 사회 사례 칸에서 시험한다. A1은 다섯 선지 모두 〈보기〉에 새 가정을 하나씩 얹고, 정답을 상식과 갈리는 면제 범위에 두었다. 정답이 "〈보기〉 사실 + 선지의 새 가정 + 지문 예외" 셋을 합쳐야 거짓이 되는 구조다.

3절 ④ 전략 문장: "정답 거짓은 〈보기〉 사실 + 선지의 새 가정 + 지문 예외를 합쳐야 드러난다" 한 줄을 **rules-A가 아니라 kind-case의 법·제도 항목**에 넣고 공시 A형만 다시 돌린다(약 $1).

**④가 보려는 것:** A형(적절하지 않은 것) 정답이 "거짓 진술 하나 + 지문 한 문장"으로 풀리는 약점이, 위 원칙 한 줄로 '세 요소를 합쳐야 거짓'인 구조로 올라가는지. 같은 지문의 이전 A-V1과 기출 12번을 기준으로 깊이가 달라졌는지만 본다.

**주의(웹 검토 대상):**
- 이 원칙 문구는 **아직 kind-case.md에 없다**(K-S1~K-S9 중 해당 문장 없음, 확인함). 넣는 순간이 규칙 변경이므로 WORKING-RULES 3절 절차(웹 충돌 검토 → 결정 → CLI 반영)를 거친다. 코드 에이전트는 문안을 짓지 않는다.
- 미결: **C3 × C23 × C11** (인수인계서 3절). 쉬움 자리 하나를 C3("〈보기〉 문장 하나로 바로 반증되는 오답 ≤1")와 C23("〈보기〉 없이 지문만으로 풀리는 선지 ≤1, 쉬움 자리")이 함께 쓰는 문제. 새 원칙은 "다섯 선지 모두 새 가정"이라 K-S6(가정 선지는 〈보기〉 사실 하나를 바꾼 반사실)과도 맞춰 읽어야 한다.
- 새 원칙 vs C13·C14: 새 가정이 〈보기〉의 답 가르는 관찰을 덮어쓰면 C14 위반.

## 2. 실행 조합 (초안)

| 항목 | 값 | 근거 |
|---|---|---|
| PASSAGE | `disclosure-insider` | 고3 2025.3 교육청, 사회-법. 대조 기출 있음 |
| MODE | `A` | 부정 발문 |
| KIND_V1 / KIND_V2 | `case` / `case` | 사례 칸. ONLY=V1이면 V2는 KEEP_OUT 것을 씀(KIND_V2도 값은 필요: run.mjs가 둘 다 검사) |
| ONLY | `V1` | 최소 실행. 마지막 사회 A 실행(6.2)도 V1만 만들었다 |
| 재사용 | `V5/out-case-hs/disclosure-insider-A/1-search.md`, `2-select.md` | 6.2 비교 실행 로그(`V5/out-gen62-disclosure-insider-A.log`)가 같은 폴더에서 재사용. run.mjs는 `KEEP_OUT`에서 복사한다 |
| KEEP_OUT | `out-case-hs` (V2 고정본 `items.json`이 있는 폴더) | run.mjs 66행. 기본값은 out-v5이므로 **반드시 지정** |
| AVOID_OUT | A형이라 미사용 | run.mjs 78~86행: `MODE==='B'`일 때만 읽음. 단 지정하지 않아도 ONLY 때 KEEP_OUT 기본 |
| OUT_NAME | 새 폴더 예: `out-cell4` | 기존 결과 덮어쓰기 방지 |
| 정답 번호 | `ANSWER_V1=2` | 이전 같은 지문 A-V1과 정답 번호를 맞춰 비교하기 위해(`pickPos` 기본값도 2였음, gen62 로그). 바꾸려면 웹 결정 |
| GEN_MODEL | 기본 `gpt-6.2-sol` | 11-20 밤 전환(REPORT-cell-gen62.md) |
| 수리 | `REPAIR=1`(eval-repair) → leak-fix | gen62 실행과 같은 파이프라인. AUTO-LOOP 2)·3) 참조. dispute-fix는 참고용만 |

**폐기(2026-11-21): REVIEW-rules-2026-11-21-case-A.md 5절 명령을 쓴다.**

실행 명령 초안(웹 승인 뒤에만, 저장소 루트에서):

```
PASSAGE=disclosure-insider MODE=A KIND_V1=case KIND_V2=case ONLY=V1 \
KEEP_OUT=out-case-hs OUT_NAME=out-cell4 ANSWER_V1=2 REPAIR=1 \
node docs/experiments/deep-item-v5-2026-11-18/run.mjs > /tmp/cell4-A.log 2>&1
```

(REPAIR·leak-fix 호출 방식은 gen62 실행 로그·REPORT-cell-gen62.md 2절과 같게 맞춘다. 정확한 환경변수는 실행 전에 `out-gen62-disclosure-insider-A.log`와 대조해 확정한다. **이 초안 시점에는 확인하지 않았다.**)

## 3. run.mjs가 이 조합에서 읽는 규칙 파일

| 파일 | 읽힌 이유 |
|---|---|
| `V5/rules-A.md` | `rules-${MODE}.md` (62행) |
| `V5/rules-common.md` | 항상 (92행). C1~C23 |
| `V5/rules-common-v53-B.md` | **읽히지 않음**(MODE=A, 93행) |
| `V5/kind-case.md` | KIND_V1=KIND_V2=case (94행). K-S1~K-S9 |
| `V5/polish-checklist.md` | 3b-polish (226행) |
| `V5/readability-guide-v4.md` | 3c-readability, GUIDE 기본값 (86·245행) |
| 수리 단계 기준 | `V5/eval-repair.mjs`(본문에 점검 기준), `V5/leak-fix.mjs` — 규칙 파일 목록은 코드 안에 있어 **웹 검토 전에 이 두 파일이 어떤 규칙을 참조하는지 따로 확인 필요** |

## 4. 대조 기출 (블라인드에 섞을 것)

- 공시 의무 기출 **12번**, 정답 **⑤**, 발문은 부정("적절하지 않은 것").
- 파일: `V5/calib-gold/disclosure-12.json`(items[] 형식), 블라인드 배치 때 만든 본은 `V5/blind/BLIND-gen62.md`·`KEY-gen62.md`(공시 라 = 기출 12번, ⑤).
- 같은 지문 이전 A-V1(비교 기준 후보):
  - `V5/out-gen62/disclosure-insider-A/leakfix/items-leakfix.json`(6.2, 정답 ②, leakfix 채택본)
  - `V5/out-case-hs2/disclosure-insider-A/items.json`(6.1, 정답 ②)
- 블라인드는 AUTO-LOOP 4)대로: 생성 1 + 이전 A-V1(비교용) + 기출 12번, 출처 표시 없음, 순서 무작위. 문항 수가 3개로 적으니 평가자 2명 반복 필요 여부는 웹 결정.

## 5. 마지막 사회 A형 실행과 그 뒤 바뀐 규칙

**마지막 사회 A형 실행**

- 공시 의무 A-V1, 6.2-sol, ONLY=V1, 2026-11-20 밤(items.json 22:39). 출력 `V5/out-gen62/disclosure-insider-A/`, 로그 `V5/out-gen62-disclosure-insider-A.log`. 결과: 출제 정답 2/풀이 2, 선지 평균 62자, 정답 길이 순위 1(= 가장 김), 정답 비튼 방식 범위 넓히기, leakfix 채택.
- 그 앞: out-case-hs2(6.1, 11-20 오전, K-S7·K-S8), out-case-hs(11-20 새벽).
- 1-search·2-select는 out-case-hs(6.1)의 것을 두 번 연속 재사용 중이므로, 지문 선별·1단계 결과는 이번에도 같다.

**그 뒤 바뀐 규칙** (git log와 파일 diff로 확인. gen62 3-assemble은 22:39 이전이고 C22는 같은 날 `02fcfb9e` 커밋에 들어감)

| 변경 | 언제 | 내용 | 마지막 실행 때 있었나 |
|---|---|---|---|
| C1 보강(판정 관계 직접 진술 금지, K-S8 통합) | 11-20 밤, `e269d681` | rules-common C1 | 있었음(gen62 앞). 참고 |
| rules-common **C22** | 11-20 밤, `02fcfb9e` | 판정을 지문 정의의 모호한 부분에 걸지 않음 | **없었음 → 새로** |
| rules-common **C23** | 11-21(③ r3) | 다섯 선지 모두 〈보기〉 자료 사용, 안 쓰는 선지 ≤1(쉬움 자리) | **없었음 → 새로** |
| kind-case **K-S9 축약** | 11-21, `02560e48` | 옛 K-S9 본문(독립 점검 질문 포함) → "C23을 따른다 + 갈래 보충(흐름 밖 사건 금지)". 같은 한도 문장은 C23으로 이동 | 옛 문안으로 있었음 → 문안 바뀜 |
| rules-common **C4 단서** | 11-21, `e854effa` | 그래프 갈래는 문단 분산 대신 kind-graph G1을 따른다 | 사례 갈래에는 영향 없음(그래프만). 확인 |
| rules-common **C17 범위** | 11-21, `e854effa` | 표 → 표·그래프로 넓힘 | 사례 갈래에는 영향 없음 |
| kind-case K-S9 외 변경 | | `git log` 기준 kind-case는 `02560e48`(K-S9 축약)과 `bcba6572`(K-S9 추가) 외 변경 없음 | |
| kind-view K-E7 축약 | 11-21 | 사례 칸에는 읽히지 않음(KIND=case) | 무관 |
| 생성기·코드 | 11-21 | graph/render.mjs, `KIND=graph` 연결 | 사례 칸에는 영향 없음 |

→ 이전 실행과 비교해 실제로 달라지는 것은 **C22, C23, K-S9 축약본** 셋이고, 새 원칙(0-3의 1)이 들어가면 넷이 된다. 이 중 C23 × C3 × C11 × 새 원칙이 웹 충돌 검토 대상이다.

**빠짐 확인 요청:** PROGRESS-hard.md 기록에는 위 외 "정답 시비 수리 보정 실패" 등 코드 쪽 변경이 있으나 규칙이 아니라 이 계획에서는 제외했다. 빠진 규칙 변경이 있으면 웹이 더해 달라.

## 6. 추정 비용

- 문항 1개(V1), 수리 포함 약 **$0.8**(r3 실측, AUTO-LOOP 11행 기준). 블라인드는 코덱스(무료 쪽 계정, 별도 API 비용 없음).
- 근거 대조: 6.2 V1 8문항 $4.07 → 문항당 약 $0.5(수리 일부 생략). STRATEGY 3절 ④ 추산 약 $1과 같은 범위.
- 칸 상한: 기본 $6(멈춤 지점 ③). 이번 실행 한 번으로는 넘지 않는다.
- 기출 12번 검사기 보정은 `calib4-gold/disclosure-12`로 이미 통과(11-20 새벽). **재실행하지 않는다**(비용 0).

## 7. 재활용 점검 (AGENTS.md 비교 실험 전 규칙, D-0168)

- 기준 조건: 같은 지시문·모델·입력을 쓴 기존 출력이 있는가?
  - out-gen62 A-V1은 **6.2, C22·C23 없음, 새 원칙 없음**. 같은 입력(1-search·2-select)이므로 "기준 조건"으로 재사용 가능하다. 단 이번 실행은 규칙이 달라지므로 새 조건과 비교할 때 기준은 out-gen62 A-V1(규칙 전)과 out-case-hs2 A-V1(6.1)이다. 새로 생성하는 것은 새 조건 1문항뿐이다.
- 재사용하지 않는 것: 3-assemble 이후(규칙이 달라져서 재사용 불가).

## 8. 멈춤 지점·다음

- 이 파일을 만든 뒤 멈춘다. 다음은 **웹 충돌 검토**(REVIEW-rules-2026-11-21-case-A.md 예정) → Ghootae 결정 → CLI가 결정 문안 반영 → 실행.
- 멈춤 지점 ⑤(rules-common 변경)에 해당하는 변경이 검토에서 나오면 별도 승인.
- 웹에 확인 요청: ① 새 원칙 문안과 kind-case 위치, ② C3×C23×C11 단서, ③ 정답 번호 고정 여부, ④ 블라인드 구성(비교 문항 포함 여부).
