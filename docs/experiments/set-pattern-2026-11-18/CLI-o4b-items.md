# CLI 지시문: 순서표 ④ 2단계 — 생성 지문 2편 지도·문항 8개·블라인드 2회 (웹 2026-11-25 16시 KST, 추정 약 $5.2, 상한 $7)

계획: `PLAN-o4-generated-L3b.md` 4·5절. 지문 고르기(웹, 3-3절 기준): **T4-1**(도덕적 운, S7-3), **T5-1**(가격 상한제, S2-4) — 둘 다 기준 통과, 먼저 나온 편. 바뀐 것(Ghootae 2026-11-25 15:55 카드 "그래프 스레드로 넘김"): 경제 지문은 V1·V2 모두 **표**. 사회 그래프 L3는 그래프 스레드가 같은 지문으로 나중에 한다.
이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $7)과 커밋·푸시의 승인이다.

```
순서표 ④ 2단계(CLI-o4b-items.md): 생성 지문 T4-1·T5-1 등록·골드 지도 + 지문마다 A·B × V1·V2 4문항(합 8) + 블라인드 지문별 2회. RULES_V=6.

0. 지킬 것
   - 규칙·프롬프트·코드 파일은 고치지 않는다. 고쳐야 하면 무엇을 왜인지만 적고 멈춘다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - 그래프 관련 파일(graph/render.mjs, kind-graph-v6.md, graph-census/, CLI-graphB-code.md 산출물)은 건드리지 않는다(그래프 스레드 몫). graphB가 같은 시각에 돌고 있으면 run.mjs를 쓰는 단계 전에 그쪽 커밋이 끝났는지 확인하고, 안 끝났으면 기다린다.
   - 생성 gpt-6.2-sol, RULES_V=6, 수리 기준 v6.3(지금 classify-v6), dispute-fix 안 돌림. 판정 codex gpt-6.1-sol.
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, G32=docs/experiments/passage-gen-v3.2-2026-11-21. 결과 폴더 $SP/o4/.

1. 전제 확인(없으면 멈추고 보고): $G32/out-o4/T4-1/final-passage.md, $G32/out-o4/T5-1/final-passage.md 있음. $SP/REPORT-o4a-passages.md 있음. $SP/PROGRESS-hard.md 에 "순서표 ④(생성 지문 L3 2차) 계획" 1곳(웹이 고친 것).

[A. 지문 등록·지도 — 지도만 API]
2. 등록: ⑤(gen32-T3-2)와 같은 형식으로 $V5/passages/gen32-o4-T4-1/, $V5/passages/gen32-o4-T5-1/ (passage.txt = final-passage.md 본문, 굵은 글씨 표시는 ⑤ 때와 같은 방식으로 처리, meta.json에 출처 "생성 v3.2 out-o4", 구조 S7-3 / S2-4, note "순서표 ④ L3 2차").
3. 골드 지도: ⑤와 같은 절차(scripts/run-analysis-map-gongsun.mjs, MAP-PROMPT-v2, gpt-6.1-sol, effort medium, 3회 → 하나 굳힘). 출력 docs/experiments/item-on-generated-2026-11-17/gold-o4/<ID>/. 굳히는 기준도 ⑤ FROZEN.md와 같게. 실측 비용(예상 편당 약 $0.36).
4. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 로
   - PASSAGE=gen32-o4-T4-1 MODE=A KIND_V1=view KIND_V2=case
   - PASSAGE=gen32-o4-T5-1 MODE=A KIND_V1=table KIND_V2=table
   3단계 지시문에 갈래 규칙 문단(view·case / table)과 GN1 문단이 들어갔는지, KIND_V1=KIND_V2=table이 오류 없이 도는지 본다. 안 되면 멈추고 보고. 건조 폴더는 지운다.
5. 비용 추산: 지도 실측 + 8문항 × 이전 실측(문항당 $0.45~0.54) + 수리 가능성(문항당 +$0.8). $7을 넘을 것 같으면 멈추고 보고.

[B. 생성 — API]
6. 지문마다 MODE=A, MODE=B 순서로(같은 OUT_NAME이라 B형이 A형 함정을 피함):
   PASSAGE=<ID> MODE=<A|B> KIND_V1=<view|table> KIND_V2=<case|table> OUT_NAME=out-o4 RULES_V=6 node $V5/run.mjs > $V5/out-o4-<ID>-<A|B>.log 2>&1
   → eval-repair.mjs(REPAIR=1) → leak-fix.mjs (⑤의 명령 형식 그대로, IN/OUT_DIR은 out-o4/<ID>-<A|B>/).
   결함(정답 유일성 문제)으로 끝난 문항만 한 번 다시 만든다(OUT_NAME=out-o4-regen, ONLY + KEEP_OUT=out-o4). 또 결함이면 기록만.
   기록: 문항별 형식 점검, 방식 위반(M2~M5)과 수리 여부, 수리가 정답 선지를 고쳤는지, strategies.

[C. 블라인드 — 과금 없음, WORKING-RULES 4-3]
7. 블라인드 두 묶음 ($SP/o4/blind-T4/, $SP/o4/blind-T5/):
   - T4 묶음: T4-1 생성 4문항(A-V1 view, A-V2 case, B-V1 view, B-V2 case) + 자격 기출 공손룡 12번($SP/calib-judge/gongsun-12 가공 그대로).
   - T5 묶음: T5-1 생성 4문항(모두 표) + 자격 기출 조세 귀착 12번($SP/calib-judge/tax-incidence-12 가공 그대로, 그래프 이미지 포함).
   - 수리가 정답 선지를 고친 문항은 수리 전 판도 넣는다(판정에는 최종본만).
   - 지문이 둘이라 BLIND에 각각 붙이고 문항마다 어느 지문인지 적는다. 출처 표시 없음. 요청문·결함 목록은 ③ 칸 CODEX-PROMPT 그대로(문항 수만 맞춤). 점검: 문항 수, KEY 정답 = 최종본, 출처 표기 grep 0.
8. 묶음마다 순서만 바꿔 2회(seed 20261251, 20261252), 회차마다 평가자 4명, 새 임시 폴더, 병렬.

[D. 집계·보고]
9. $SP/o4/aggregate.py → aggregate-out.md (묶음마다):
   - 문항별 회차별 등급·평균, 생성 문항별 '수능 아님' 횟수(두 회차 합)
   - 칸 평균(두 회차): 인문 관점 = T4 V1 A·B, 인문 사례 = T4 V2 A·B, 사회 표 = T5 4문항
   - 자격 기출 회차별 평균(1.5 미만이면 그 회차 '멈춤')
   - 참고: 칸 평균 − L2 칸 평균(인문 관점 1.375, 인문 사례 1.31, 사회 표 1.56)
   - 결함 표시(㉮~㉴) 수. 특히 T4 사례 문항의 ㉮(〈보기〉가 지문의 운반대 사례를 이름만 바꿔 옮김, K-S4) 횟수.
   - 평가 이유를 '지문 탓'(지문이 판정 기준을 안 줌, 사실 오류, 입장 구별 흐림, 지문이 입장의 판정을 이미 다 해 둠)과 '문항 탓'(㉯·㉰·㉲ 등)으로 나눠 센 표. 분류가 애매하면 '애매'로.
   - 정답이 〈보기〉 한 단계·지문 한 문장으로 정해짐 표시 수.
10. 보고서 $SP/REPORT-o4b-items.md(측정만, 판정 이름 없음)와 -human.md(쉬운 말). 실제 비용(단계별, usage.json 합산).

[E. 커밋]
11. 커밋(목록을 먼저 보여 준다): $SP/PLAN-o4-generated-L3b.md, $SP/CLI-o4a-passages.md, $SP/CLI-o4b-items.md, $SP/REPORT-o4a-passages.md, $SP/REPORT-o4b-items*.md, $SP/o4/, $SP/PROGRESS-hard.md, $G32/commissions/T4.md·T5.md, $G32/out-o4/, $G32/out-o4*.log, fidelity-check-2026-11-16/out/v32-out-o4-*/, $V5/passages/gen32-o4-*/, item-on-generated-2026-11-17/gold-o4/, $V5/out-o4/(와 -regen), 새 로그, docs/handoffs/WORKING-RULES.md, docs/handoffs/2026-11-25-graph-thread-handoff.md.
    그래프 스레드 파일(graph-census/, PROPOSAL-graph-*, REVIEW-graph-census-web.md, CLI-graphA/B, render.mjs 등)은 이미 커밋됐으면 그대로, 안 됐으면 넣지 않는다.
    메시지 예: "순서표 ④: 생성 지문 L3 2차 — 도덕적 운(S7-3)·가격 상한제(S2-4) 문항 8개 + 블라인드 2회"
    git push origin experiment/problem-solving-mvp (force 금지).
12. 보고하고 멈춘다: 건조 실행 확인, 지도 비용, 등급표(문항 × 회차 × 4명), 칸 평균 3개, '수능 아님' 횟수, 자격 기출 회차별 평균, L2 대비 차이, 지문 탓/문항 탓 표, 수리 여부, 실제 비용, 재생성 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정은 웹이 한다.

추정 비용: 지도 2편 약 $0.72 + 생성 8문항 약 $4.0 + 노출 수리 약 $0.1 = 약 $4.8. v6.3 수리가 돌면 문항당 +$0.8, 재생성 1회 +$0.5. 상한 $7. 블라인드는 codex(ChatGPT 계정)라 과금 없음.
최소 실행 검토: 지문 하나로 두 칸(T4) 또는 한 칸 4문항(T5)을 덮는다. 새 지문이라 ONLY로 V1만 만들 수 없다.
```

## 설명

- **목적:** 생성기가 만든 지문에서도 문항이 기출 지문 때만큼 나오는지(L3) 본다. 인문 관점·인문 사례는 도덕적 운 지문으로, 사회 표는 가격 상한제 지문으로 잰다.
- **방법:** 두 지문을 문항 생성기에 등록하고 골드 지도를 만든 뒤, 지문마다 문항 4개를 만들어 수리까지 돌린다. 지문마다 자격 기출 하나(공손룡 12번, 조세 귀착 12번)를 섞어 평가자 4명이 순서를 바꿔 2회 본다.
- **판정(웹, 4-3):** 칸 평균 1.5 이상 = L3 통과, 1.0~1.5 = 거의, 1.0 미만 = 미달. 문항 하나가 '수능 아님'을 두 회차 합 2번 이상 받으면 미달. 자격 기출이 1.5 밑인 회차는 멈춤. 참고로 그 칸의 기출 지문(L2) 점수보다 0.5 넘게 낮으면 '생성 지문 탓'을 의심하고 평가 이유를 나눠 본다.
- **다음 스텝:** 결과를 보고 웹이 칸별 판정과 다음 일(거의면 그 칸 1회 재생성 등)을 적어 드린다.
