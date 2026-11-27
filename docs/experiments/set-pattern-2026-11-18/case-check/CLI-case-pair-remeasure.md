# CLI-case-pair-remeasure — 짝 카드(맥락 분류) 문항을 단독 블라인드로 다시 재기 (2026-11-27, 웹 작성)

- 근거: a-recheck(4601facc) — 2점 문항 공통점 = "같은 말이 맥락에 따라 다른 분류". 이 지시는 이미 PAIR_CARD=2·3, LINK_SEARCH로 생성해 봤다. 그런데 도덕 pair3이 묶음 블라인드 1.83 → 단독 1.0으로 바뀌어, 예전 점수를 그대로 믿을 수 없다. 새로 만들기 전에 이미 있는 문항을 같은 잣대로 다시 잰다.
- **추정 비용: 0원** (유료 API 없음. codex 8문항 × 8회 = 64회). 예상 40~60분.
- **최소 실행 = 2단계 1문항(8회)으로 확인 뒤 나머지.**

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/case-check/CLI-case-pair-remeasure.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 짝 카드 문항 단독 재측정. 0원(codex만). 판정 기준은 아래에 미리 적혀 있다. 고치지 마라.

약어: SP = docs/experiments/set-pattern-2026-11-18, CC = $SP/case-check, V5 = docs/experiments/deep-item-v5-2026-11-18, AR = $CC/a-recheck, LC = $CC/lure-check, OUT = $CC/pair-remeasure

금지: 코드·생성 규칙 파일 수정 금지. 유료 API 호출 금지. checkout / stash / restore / reset / force push 금지. $AR·$LC 파일은 읽기만.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, git log 에 4601facc. 남의 미커밋 파일은 건드리지 말고 커밋에 넣지 마라.
- 있어야 할 것: $AR/make_blind.py, $AR/aggregate.py, $AR/KEY.json, 아래 5개 생성 파일, $CC/REVIEW-a-recheck-web-2026-11-27.md, 이 파일. `codex --version`. 없으면 멈추고 보고.
- 비용 스스로 추정: 유료 0회, codex 64회 한 줄.

1단계 (블라인드) — $OUT/make_blind.py ($AR/make_blind.py 복사, 문항 목록만 바꿈. 풀이지·CODEX-PROMPT 문안은 한 글자도 바꾸지 마라)
- 폴더 Q01~Q08, random.seed(20261129). 키는 $OUT/KEY.md·KEY.json 에만.
- [짝 카드 생성 5] ($V5 아래, items 중 version V1)
    PC-gs-pair1   out-case-pair/gongsun-long-later-mohists-A/leakfix/items-leakfix.json   pid gongsun-long-later-mohists  (예전 1.00)
    PC-gs-pair2   out-case-pair2/gongsun-long-later-mohists-A/leakfix/items-leakfix.json  pid gongsun-long-later-mohists  (예전 1.17)
    PC-cy-pair3   out-case-pair3/gen32-T3-2-A/leakfix/items-leakfix.json                 pid gen32-T3-2                  (예전 0.75)
    PC-cy-link1   out-case-link1/gen32-T3-2-A/leakfix/items-leakfix.json                 pid gen32-T3-2                  (예전 0.42)
    PC-cy-link2   out-case-link2/gen32-T3-2-A/leakfix/items-leakfix.json                 pid gen32-T3-2                  (예전 1.17)
- [기준 3] $AR 의 BLIND.md 를 그대로 복사(흔들림 확인용)
    K-gongsun12 (AR 점수 2.000), K-K21 과징금 (1.000), G-gs-old 공손룡 옛 A (1.875)
- grep 출처 확인은 $AR 지시와 같게.

2단계 (시험) PC-gs-pair2 폴더 run_eval.sh(8회). 4개 이상 비면 멈추고 보고.

3단계 (나머지 7폴더) 차례로. 실패 회차만 한 번 다시.

4단계 (집계) $OUT/aggregate.py ($AR/aggregate.py 복사, 단계 수 부분 뺌)
- 문항별 점수·같음/중/아님·정답 일치·결함.
- 짝 카드 묶음 8개 = 이번 5개 + 이미 단독으로 잰 3개(LC 의 B-3a-orig 1.000, B-3b-orig 1.000, AR 의 G-mo-pair3 1.000). 평균, 최고점.
- 옛 순서 묶음 = AR 의 생성 A 중 G-mo-pair3 를 뺀 5개(G-cy-cell5, G-cy-lever5, G-gs-old, G-mo-o4, G-mo-o4regen) 평균.
- 흔들림: 기준 3개의 이번 점수 vs AR 점수.
- 결과 $OUT/aggregate-out.md

5단계 (미리 정한 판정, 아래 문구로)
 [가(짝 카드가 상위에 닿나)] 짝 카드 8개 중 1.75 이상인 문항 수
   2개 이상 → "짝 카드 방식으로 상위 문항이 나옴"
   1개      → "상위 문항 하나 (우연과 구분 어려움)"
   0개      → "짝 카드 방식으로 상위 문항 안 나옴"
 [나(옛 순서와 비교)] 짝 카드 8 평균 − 옛 순서 5 평균
   ≥ +0.4 → "짝 카드가 나음" / ≤ −0.4 → "옛 순서가 나음" / 그 사이 → "차이 없음"
 흔들림: 기준 3개 중 AR 과 0.5 넘게 다른 것이 2개 이상이면 맨 위에 "잣대 흔들림 — 판정 보류".

6단계 (보고서) $OUT/REPORT-pair-remeasure.md(표·판정·문항별 이유 r1-1·r2-1) + -human.md(쉬운 말, 맨 위 두 판정 문구, 번호에는 괄호로 내용).

7단계 (커밋·푸시)
- git add: $OUT/ 전체, $CC/CLI-case-pair-remeasure.md, $CC/REVIEW-a-recheck-web-2026-11-27.md. 다른 파일은 add 하지 마라.
- 메시지: "case-check: 짝 카드 문항 단독 재측정 (pair-remeasure, 0원)"
- push(force 금지). 거부되면 fetch 후 merge 하고 다시 push, 보고.
- 커밋 해시와 판정 문구를 보고하고 멈춰라.
```

## 웹이 미리 적어 둔 것

- 공손룡 짝 카드 2판은 지난번 ㉳(정답 시비) 6/12였다. 단독에서도 시비가 나오면 '맥락 분류'를 생성기에 시키면 시비가 따라온다는 뜻이다.
- 예측(적어 두기만): 가 = "상위 문항 안 나옴" 또는 "하나", 나 = "차이 없음".
- 결과가 "안 나옴"이면 상위 수준은 지시로 만들기보다 후보를 여럿 만들어 고르는 쪽(~$2)이 남은 길이다.
