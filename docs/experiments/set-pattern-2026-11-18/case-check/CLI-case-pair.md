# CLI 지시문: 헷갈리는 짝을 "개념 짝"으로 — 짝 카드(PAIR_CARD) 시험, 공손룡 A형 (웹 2026-11-26 15시대 KST)

결정: Ghootae 2026-11-26 15:11 KST "문제 포인트가 확실하면 테스트해서 해결하는 편이 낫지 않을까?" → 짝 조건 시험.
진단(242c021f premise-record.md):
- 공손룡 전제형의 짝 이름은 "사진 배치"였다. 북쪽부터, 남쪽부터 이름을 붙인 위치·순서의 차이다. 평가자 12/12가 "개념보다 위치·명명 순서 추적 부담"이라고 했다.
- 청약 전제형의 짝은 "두 끈"이었다. 상자를 묶은 끈(포장)과 손잡이 끈(구성품)으로, 지문 개념(포장 vs 물품)에서 갈리는 짝이다. 5명이 "수능 같음"을 줬다.
- 기출 공손룡 12번의 짝도 ⓓ 옷 일반 vs ⓔ 빨간 옷, 곧 개념의 차이다.
**추정 비용: 약 $0.7 (상한 $1.5).** 생성 1회(공손룡 A-V1)이고, premise 실측 공손룡은 $0.81이었다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $1.5)과 커밋·푸시의 승인이다.

```
짝 카드 시험(CLI-case-pair.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일, 읽기 습관 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log에 242c021f가 있는지 적는다.

1. 코드: PAIR_CARD=1 (API 비용 없음). CASE_FLOW=lever 또는 premise와 함께 줄 때만 켜진다. 주지 않으면 지금 동작이 한 글자도 바뀌지 않는다.
   a. run.mjs: 사례 블록의 "나." 바로 앞에 아래 문단을 끼운다(문구 그대로). JSON 안내에 pairCards를 더한다.
      "짝 카드: 〈보기〉를 쓰기 전에 헷갈리는 짝을 먼저 정한다. 짝은 지문이 가르는 개념 구분(예: 포장과 물품, 일반 명과 속성이 붙은 명)에서 고른다. 두 사실은 겉으로 비슷하지만(같은 말, 같은 종류의 물건·행동) 지문 개념으로는 서로 다른 쪽에 놓인다. 위치·방향·배치 순서의 차이만으로 짝을 만들지 않는다. 카드마다 name(짝 이름), quote(그 구분을 세우는 지문 문장 원문), sideA·sideB(두 쪽의 개념 이름, 지문 용어), card(관련 원리 카드 번호)를 적는다. 나.의 pair에는 이 카드의 name만 쓴다."
      JSON: "pairCards":[{"name":"짝 이름","quote":"지문 원문","sideA":"개념","sideB":"개념","card":"C1"}]
      머리 주석 한 줄: "v6.9 (2026-11-26) PAIR_CARD=1: 헷갈리는 짝을 지문 개념 구분에서 먼저 고름(시험용). case-check/CLI-case-pair.md".
   b. classify-v6.mjs: checkLeversV6(item, {pairCard:true})일 때 L9를 더한다.
      - L9a(오류): pairCards가 1개 이상이고, 카드마다 name·quote·sideA·sideB가 비어 있지 않다.
      - L9b(오류): quote가 지문 문장에 들어 있다(글자 일치 또는 지문 한 문장과 Dice ≥ 0.8). checkLeversV6에 passage를 넘기도록 run.mjs 호출부를 고친다.
      - L9c(오류): leverTable의 pair 값은 모두 pairCards의 name 중 하나다.
      - L9d(오류): pair 줄의 fact에 방향·배치어(/(북쪽|남쪽|동쪽|서쪽|왼쪽|오른쪽|위쪽|아래쪽|차례로|번째 칸)/)가 있으면 오류다.
      - L9e(경고): sideA와 sideB가 같은 말이다.
      시험을 더한다: L9a~L9d 각각 걸리는 예와 통과하는 예. 242c021f의 공손룡 전제형 항목(짝 "사진 배치")은 L9에서 걸려야 하고, 청약 전제형 항목(짝 "두 끈")은 pairCards만 붙이면 L9b~L9d를 통과해야 한다(손으로 만든 pairCards로). classify-v6 시험이 전체 통과하는지 확인한다.
   c. 건조 실행 두 번(끝나면 건조 폴더 지움):
      - RULES_V=6 CASE_FLOW=premise PAIR_CARD=1 DRY_RUN=1 PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-pair-dry → 짝 카드 문단과 pairCards JSON 안내가 있어야 한다.
      - 같은 줄에서 PAIR_CARD를 빼면 → 242c021f 때와 같은 지시문이어야 한다(diff로 확인).
   d. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API) 1회: RULES_V=6 CASE_FLOW=premise PAIR_CARD=1 PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-pair
   run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1) → 필요하면 leak-fix.mjs. 로그 $V5/out-case-pair-gongsun-long-later-mohists-A.log. 결함이 나와도 기록만 한다.
   기록 $CC/pair-record.md: lever-check(처음·재호출·최종, L8·L9), pairCards, principleCards·leverTable, 선지별 premise·premiseTrue·verdict·misread, 수리 여부·발문 되돌림·결함, 최종 〈보기〉·선지·정답, 그리고 전제형(242c021f) 공손룡·옛 공손룡 A-V1의 〈보기〉·선지·정답을 나란히.

3. 블라인드 $CC/blind-pair/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind8.py를 고쳐 쓴다)
   - 문항 4개(지문 1개, 공손룡): 짝 카드 A-V1(out-case-pair 최종), 전제형 A-V1(out-case-premise 최종), 옛 A-V1(out-cell1-v62-r2 최종), 자격 기출 공손룡 12번.
   - 평가자 4명 × 3회(seed 20261341·42·43), 순서는 회차마다 섞는다. 점검: 문항 수, KEY, 출처 표기 0.

4. 집계 $CC/aggregate-pair.md (aggregate_premise.py를 고쳐 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표), ㉯·㉲·㉳
   - 평가 이유 분류에 "위치·순서 추적" 묶음을 더한다(이유에 위치|순서|방향|배치|추적 중 하나가 있으면).
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 12번 3회 합 평균 ≥ 1.5.
     · 짝 문제 해결: 짝 카드 A의 "위치·순서 추적" 이유 ≤ 3/12 (전제형은 12/12였다).
     · 점수: 짝 카드 A − 옛 A ≥ −0.5이고 짝 카드 A ≥ 1.5 → "통과(청약에서 확인 후 채택 판단)". 짝 카드 A − 전제형 A ≥ +0.5이지만 1.5 미만 → "나아짐, 미달". 그 밖 → "효과 없음".
   - 회차별로도 같은 판정을 적는다.

5. 보고서 $CC/REPORT-case-pair.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

6. 커밋(목록 먼저): $V5/run.mjs, $V5/classify-v6.mjs, classify-v6 시험 파일, $V5/out-case-pair/, 새 로그, $CC/blind-pair/, $CC/pair-record.md, $CC/aggregate-pair.md, $CC/aggregate_pair.py, $CC/make_blind9.py, $CC/REPORT-case-pair*.md, 이 지시문.
   메시지: "사례 짝 카드(PAIR_CARD) 시험: 공손룡 A형 전제형". push(force 금지).

7. 보고하고 멈춘다: 시험 결과(L9가 242c021f 공손룡 항목을 잡았는지 포함), 건조 두 개, 비용, lever-check·L8·L9 표, pairCards, 문항별 평균, 미리 정한 판정과 회차별 판정, ㉯·㉲·㉳, 평가 이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 〈보기〉를 쓰기 전에 "헷갈리는 짝"을 먼저 정하게 합니다. 짝은 지문이 가르는 개념에서 고릅니다. 예를 들면 "포장 vs 물품", "옷 일반 vs 빨간 옷"입니다.
  - 짝마다 그 구분을 세우는 지문 문장을 원문 그대로 적게 합니다.
  - 서버는 세 가지를 확인합니다. 그 문장이 정말 지문에 있는지, 짝 사실에 "북쪽·남쪽·차례로" 같은 위치·순서 말이 없는지, 표의 짝이 카드와 맞는지입니다. 어기면 한 번 다시 부릅니다.
- **왜:** 공손룡이 두 번 다 떨어진 이유가 같았습니다. 짝이 개념이 아니라 위치·순서에서 갈려서, 문항이 자리 맞추기 퍼즐이 됐습니다. 청약 철회와 기출은 짝이 개념에서 갈렸습니다.
- **어떻게 시험하나:** 실패했던 공손룡 A형 하나만 다시 만듭니다. 전제형(1.00), 옛 판(2.00), 기출 12번과 같은 블라인드에서 3회 봅니다.
- **판정은 미리 정해 둡니다:**
  - "위치·순서 추적" 불만이 12개 중 3개 이하로 줄어야 짝 문제가 풀린 것으로 봅니다.
  - 점수가 1.5 이상이고 옛 판보다 0.5 넘게 낮지 않으면 통과입니다.
  - 통과하면 청약 철회에서 한 번 더 확인한 뒤 채택을 정합니다.
- **그다음:** 이 짝 카드는 B형에도 붙일 수 있습니다. A형에서 통하면 B형 기본값에 붙일지도 이어서 보겠습니다.
