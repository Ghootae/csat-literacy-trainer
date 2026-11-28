# CLI-o5a — 남은 어려운 문제 칸을 우리 지문에서 시험 (2026-11-28, 웹 작성)

- 근거: Ghootae 2026-11-28 17:00 KST "일단 완성 안 된 L3, L4를 먼저 해봐야 하는 거 아냐?" → 세트 조립 전에 남은 칸부터.
- 대상 칸(우리 지문 시험이 없는 칸): 과학 그래프·표·실험·사례, 사회 관점. 과학 관점은 기출이 없어 계속 뺀다.
- 판정 기준: WORKING-RULES 4-4(문항 하나씩 단독 블라인드, 같은 갈래 기출을 같은 방식으로 잰 평균 M과 비교, G ≥ M − 0.4 통과).
- 만든 문항은 버리지 않는다. 통과한 문항은 다음 단계(세트 조립)의 어려운 문제 자리 재료로 그대로 쓴다.
- **추정 비용: 약 $6 (상한 $8).** 생성 12문항 × 실측 문항당 약 $0.48(순서표 ④ 실측, 수리 포함). 지도는 이미 있어 0원. 블라인드는 codex(ChatGPT 계정)라 0원, (12 + 새 기출 7) × 8회 = 152회, 예상 2~3시간.
- **최소 실행:** 칸마다 A형·B형 1개씩이 기본(D-0237). 한 번 돌릴 때 두 문항이 나오는 구조라 칸을 짝지어 6회 실행으로 줄였다. 첫 실행 하나(수돗물 B형)를 먼저 돌려 형식을 확인한 뒤 나머지를 돈다.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/CLI-o5a-remaining-cells.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 남은 칸 우리 지문 시험(o5a). 유료 API 상한 $8. 판정 기준은 아래에 미리 적혀 있다. 고치지 마라.
이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $8)과 커밋·푸시의 승인이다.

약어: V5 = docs/experiments/deep-item-v5-2026-11-18, SP = docs/experiments/set-pattern-2026-11-18,
      CJ = $SP/calib-judge, CR = $SP/cells-rejudge, LC = $SP/case-check/lure-check, OUT = $SP/o5

0. 지킬 것
   - 규칙·프롬프트·코드 파일은 고치지 않는다. 고쳐야 하면 무엇을 왜인지만 적고 멈춘다.
   - 생성 gpt-6.2-sol, RULES_V=6, 검사기·수리 지금 기본값(eval-repair REPAIR=1, leak-fix), dispute-fix 안 돌림. CASE_FLOW·PAIR_CARD·LINK_SEARCH 주지 않는다(기본값). 판정 codex gpt-6.1-sol.
   - checkout / stash / restore / reset / force push 금지. 남의 미커밋 파일은 커밋에 넣지 않는다.

1. 전제 확인(어긋나면 멈추고 보고)
   - 브랜치 experiment/problem-solving-mvp, git log 에 b4a66296(어휘 확정).
   - $V5/passages/gen31-T1-1(혈액 응고), gen31-T2-1(수돗물), gen32-T3-2(청약 철회) 와 각 meta.json 의 mapSource 지도 파일이 있다.
   - $V5/kind-graph-v6.md, kind-table-v6.md, kind-experiment-v6.md, kind-view-v6.md, kind-case-v6.md, $V5/graph/render.mjs.
   - $CR/make_blind.py, $CR/aggregate.py, $CR/aggregate-out.md, $CJ/aggregate-out.md, /Users/mac/Projects/suneung_db/output/passages/ 와 assets/. `codex --version`.

2. 건조 실행(비용 없음): 아래 6개 조합을 DRY_RUN=1 로 돌려, 3단계 지시문에 해당 갈래 규칙 문단이 들어갔는지, 그래프 조합에 graphPlan 문장이 들어갔는지 본다. 안 되면 멈추고 보고. 건조 폴더는 지운다.

   | 실행 | PASSAGE | MODE | KIND_V1 | KIND_V2 | 덮는 칸 |
   |---|---|---|---|---|---|
   | R1 | gen31-T2-1 (수돗물) | B | graph | experiment | 과학 그래프 B, 과학 실험 B |
   | R2 | gen31-T2-1 (수돗물) | A | graph | table | 과학 그래프 A, 과학 표 A |
   | R3 | gen31-T1-1 (혈액 응고) | A | table | case | 과학 표 A, 과학 사례 A |
   | R4 | gen31-T1-1 (혈액 응고) | B | table | experiment | 과학 표 B, 과학 실험 B |
   | R5 | gen32-T3-2 (청약 철회) | A | view | case | 사회 관점 A, (사회 사례 A, 세트 재료) |
   | R6 | gen32-T3-2 (청약 철회) | B | view | case | 사회 관점 B, (사회 사례 B, 세트 재료) |

   R3·R4 처럼 같은 지문에서 B형이 A형 뒤에 오도록 순서를 맞춘다(실제 순서: R2 → R1, R3 → R4, R5 → R6). 같은 OUT_NAME 이라 B형이 A형 함정을 피한다.
   gen31 지문 meta 에 field 가 없어 오류가 나면 PASSAGE_FIELD=science 를 준다.

3. 첫 실행(최소 확인): R2 → R1 만 먼저.
   PASSAGE=<ID> MODE=<A|B> KIND_V1=<..> KIND_V2=<..> OUT_NAME=out-o5 RULES_V=6 node $V5/run.mjs > $V5/out-o5-<ID>-<A|B>.log 2>&1
   → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). 명령 형식은 CLI-o4b-items.md 6단계와 같다.
   확인: 형식 점검 통과, 그래프 그림(png)과 읽기 판이 나옴, 실험 문항 끝 줄 "(단, …)", 정답 하나. 그래프가 안 그려지거나 정답 유일성 결함이면 멈추고 보고.
   실측 비용을 적고, 나머지 4실행 추정과 합쳐 $8 을 넘을 것 같으면 멈추고 보고.

4. 나머지 실행: R3 → R4, R5 → R6. 같은 명령 형식.
   결함(정답 유일성 문제)으로 끝난 문항만 한 번 다시 만든다(OUT_NAME=out-o5-regen, ONLY + KEEP_OUT=out-o5). 또 결함이면 기록만.
   문항마다 기록: 형식 점검, 방식 위반(M2~M5)과 수리 여부, 수리가 정답 선지를 고쳤는지, strategies.

5. 단독 블라인드 만들기 — $OUT/make_blind.py ($CR/make_blind.py 복사). 풀이지·CODEX-PROMPT·run_eval.sh 문안은 $CR 것과 한 글자도 다르지 않게(그림 있는 문항은 그림 판 문안, pic-1.png 첨부, codex -i). 폴더 C01~C19, random.seed(20261301). 키는 $OUT/KEY.md·KEY.json 에만.
   - 생성 12문항: out-o5(와 -regen) 최종본. 그래프 문항은 render 그림을 pic-1.png 로.
       키 이름: TW-A-graph, TW-B-graph, TW-A-table, TW-B-exp, BL-A-table, BL-A-case, BL-B-table, BL-B-exp, CW-A-view, CW-B-view, CW-A-case, CW-B-case
   - 새 기출 앵커 7개(같은 갈래, 3점 〈보기〉, 단독). 지문 passage_db(set_id), 문항 question(set_id, 번호). 〈보기〉가 그림이면 suneung_db assets/<set_id>/ 에서 찾아 pic-1.png 로. 그림을 못 찾으면 그 문항을 빼고 보고한다.
       [과학 그래프] KG-열팽창    69bbefa4a029f488d9e4e809  12
       [과학 표]     KT-약물      69c01c18fa5063deffe1b1bb  19
                     KT-수치예보  69c0186c78128b2a9bede0c8  25
                     KT-이중편파  69c00fbcfa5063deffe1a447  17
       [과학 실험]   KX-표면장력  6a213ea086fd308968e101df  16
                     KX-수소      69bc9e5c76ad66e59a724b37  12
                     KX-연소      69bbf89ba029f488d9e520f0  16
   - 확인 출력: KEY 표, 글자 수, 그림 첨부 여부, 출처 낱말 grep("학년도|수능|모의|생성|v6|v5|out-|cell|기출|o5").

6. 시험: C 폴더 하나 run_eval.sh(평가자 4명 × 2회 = 8회)로 먼저. 4개 이상 비면 멈추고 보고. 그 뒤 나머지 차례로. 실패 회차만 한 번 다시.

7. 집계 — $OUT/aggregate.py ($CR/aggregate.py 복사) → $OUT/aggregate-out.md
   - 문항별: 점수(수능 같음 2 / 중 1 / 수능 아님 0 평균), 같음/중/아님, 정답 일치, 결함 표시.
   - 칸별 G = 생성 문항 평균, 바닥 = 생성 문항 중 '수능 아님' 4/8 이상인 문항 수.
       과학 그래프 = TW-A-graph, TW-B-graph
       과학 표     = TW-A-table, BL-A-table, BL-B-table
       과학 실험   = TW-B-exp, BL-B-exp
       과학 사례   = BL-A-case (참고로 cells-rejudge 고체 촉매 6개와 합친 평균도)
       사회 관점   = CW-A-view, CW-B-view
       사회 사례(참고, 이미 확정 칸) = CW-A-case, CW-B-case
   - 칸별 M (이미 단독으로 잰 점수를 함께 쓴다):
       과학 그래프 = KG-열팽창 + $CJ 옥신 17(1.000) + $CJ 확산 모델 13(1.750)
       과학 표     = KT 3개 + $CJ 오디오 17(2.000)
       과학 실험   = KX 3개 + $CJ 압전 11(1.000)
       과학 사례   = $CR M 1.438 그대로
       사회 관점   = $CR M 1.000 그대로
       사회 사례   = 적지 않음(참고 칸)

8. 미리 정한 판정(칸마다, 아래 문구로)
   바닥 ≥ 1                → "미달(바닥: 수능 아님 4/8 이상 문항 있음)"
   그렇지 않고 G ≥ M − 0.4  → "통과(같은 갈래 기출 수준)"
   그렇지 않고 G ≥ M − 0.8  → "거의"
   그 밖                    → "미달"
   함께 적기: G, M, G−M, 칸에서 가장 높은 생성 문항 점수, 예전 판정(기출 지문에서: 과학 그래프 통과 / 과학 표 v5 기준 확정 / 과학 실험 통과 / 과학 사례 거의 / 사회 관점 통과).
   덧붙여 세트 재료 표: 생성 12문항 중 1.5 이상인 문항 목록(지문별).

9. 보고서 $SP/REPORT-o5a.md(표·판정·문항별 이유 r1-1·r2-1) + REPORT-o5a-human.md(쉬운 말, 맨 위에 칸별 판정 문구, 번호에는 괄호로 내용). 실제 비용(단계별, usage.json 합산).

10. 커밋·푸시
   - 목록을 먼저 보여 준다: $SP/CLI-o5a-remaining-cells.md, $OUT/, $SP/REPORT-o5a*.md, $V5/out-o5/(와 -regen), $V5/out-o5-*.log. PROGRESS-hard 는 고치지 않는다(웹이 결과를 보고 따로 정한다).
   - 메시지: "set-pattern: 남은 칸 우리 지문 시험 — 과학 그래프·표·실험·사례, 사회 관점 (o5a)"
   - git push origin experiment/problem-solving-mvp (force 금지). 거부되면 fetch 후 merge 하고 다시 push, 보고.

11. 보고하고 멈춘다: 건조 실행 확인, 첫 실행 확인, 칸별 판정 문구, G·M, 바닥, 세트 재료 표, 빠진 앵커, 실제 비용, 재생성 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정 해석과 확정 여부는 웹·Ghootae 가 한다.
```

## 쉬운 설명

- **무엇을:** 아직 우리 지문으로 시험하지 않은 어려운 문제 칸 다섯 개(과학 그래프·표·실험·사례, 사회 관점)를 우리가 만든 지문 세 편(수돗물 소독, 혈액 응고, 청약 철회)에 문제를 만들어 시험합니다.
- **어떻게:** 지문마다 어려운 문제 2개씩 6번 만들어 총 12문제. 그 12문제를 하나씩 따로 평가자 4명에게 두 번 보여 주고, 같은 종류의 기출 문제도 똑같이 보여 줘서 점수를 비교합니다. 기출과 0.4점 안쪽이면 통과입니다.
- **왜:** 세트로 묶기 전에 모든 칸이 확정돼 있어야, 나중에 세트 점수가 나쁠 때 원인이 묶는 방식뿐이라고 볼 수 있습니다. 여기서 만든 문제 중 좋은 것은 세트 재료로 그대로 씁니다.
- **청약 철회 사례 문제 2개는 덤:** 한 번 돌릴 때 두 문제가 나오므로, 남는 자리에 이미 확정된 사회 사례 문제를 만들어 세트 재료로 씁니다.
- **다음:** 결과가 오면 칸별 판정을 정리하고, 통과한 칸은 Ghootae가 확정할지 고르게 합니다.
