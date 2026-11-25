# CLI 지시문: 그래프 1차 첫 실전 — 가격 상한제(T5-1) 그래프 문항 A·B 생성 + 블라인드 2회 (웹 2026-11-25 16시 40분 KST, 추정 약 $1.1, 상한 $3)

배경: 그래프 1차(graphPlan 칸·서버 확인·기준선·기호 눈금·교점 도구)는 12fe1acb로 커밋됐지만, graphPlan을 쓰는 생성 단계는 아직 한 번도 API로 돈 적이 없다. ④(생성 지문 L3 2차) 2단계는 Ghootae 결정(15:55 "그래프 스레드로 넘김")으로 경제 지문 V1·V2를 모두 표로 만든다. 그래서 같은 지문 T5-1(가격 상한제)의 V2를 그래프로 이 지시문에서 따로 만든다.
**시작 조건: ④ 2단계(CLI-o4b-items.md)가 커밋·푸시된 뒤.** 그래야 gen32-o4-T5-1 등록과 골드 지도(gold-o4)를 다시 만들지 않는다.
이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $3)과 커밋·푸시의 승인이다.

```
그래프 첫 실전(CLI-graphC-test.md): gen32-o4-T5-1 V2 graph A·B 생성(RULES_V=6) + graphPlan 기록 + 블라인드 2회.

0. 지킬 것
   - 규칙·프롬프트·코드 파일(run.mjs, eval-repair.mjs, leak-fix.mjs, classify-v6.mjs, graph/render.mjs, graph/plan-check.mjs, kind-*-v6.md)은 고치지 않는다. 고쳐야 돌면 무엇을 왜인지 적고 멈춘다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - ④ 산출물(out-o4, $SP/o4/, gold-o4)은 읽기만 한다.
   - 생성 gpt-6.2-sol, RULES_V=6, 수리 v6.3(classify-v6), dispute-fix 안 돌림. 판정 codex gpt-6.1-sol.
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/graphC/.

1. 전제 확인(어긋나면 멈추고 보고)
   - git log에 12fe1acb(그래프 1차)와 bb4f1136(④ 2단계)이 있다.
   - ④ 3단계(CLI-o4c-regen, T4만 재생성)가 같은 시각에 돌 수 있다. out-o4의 T5 파일은 둘 다 읽기만 한다. 커밋은 한쪽 커밋이 끝난 뒤에 하고, 서로의 파일을 커밋에 넣지 않는다.
   - $V5/passages/gen32-o4-T5-1/ 와 docs/experiments/item-on-generated-2026-11-17/gold-o4/gen32-o4-T5-1/ 가 있다.
   - grep "## 먼저 쓰는 것: graphPlan (2026-11-25)" $V5/kind-graph-v6.md 1곳.
   - 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 PASSAGE=gen32-o4-T5-1 MODE=A KIND_V1=table KIND_V2=graph ONLY=V2 KEEP_OUT=out-o4 로 3단계 지시문에 graphPlan 문장과 kind-graph-v6 문단이 있는지 본다. ONLY+KEEP_OUT 조합이 안 되면 멈추고 보고. 건조 폴더는 지운다.

[생성 — API]
2. MODE=A 다음 MODE=B(같은 OUT_NAME이라 B가 A 함정을 피함):
   PASSAGE=gen32-o4-T5-1 MODE=<A|B> KIND_V1=table KIND_V2=graph ONLY=V2 KEEP_OUT=out-o4 OUT_NAME=out-graphC RULES_V=6 node $V5/run.mjs > $V5/out-graphC-<A|B>.log 2>&1
   → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). ④ 2단계와 같은 명령 형식.
3. 문항마다 기록($SP/graphC/PLAN-CHECK.md):
   a. graphPlan 원문(focus, variables, relation 인용, graphType, series별 shape·shapeFrom, why)과 3단계 it.graphPlanCheck(ok, errs).
   b. 수리·노출 수리 뒤 최종본에 checkGraphPlan을 다시 돌린 결과(기록만, 고치지 않음). 수리가 축 이름이나 계열을 바꿨으면 무엇이 바뀌었는지.
   c. 최종 SVG를 PNG로 바꿔 $SP/graphC/png/<A|B>-V2.png 에 두고 직접 본다. 적을 것:
      - graphPlan의 shape 말(방향·변화 빠르기·꺾임·최댓값·가까워짐·계열 사이 만남)과 그림이 맞는가, 계열마다 한 줄.
      - 기준선(guides)·기호 눈금(yAxis.ticks/xAxis.ticks)·교점 표시(crossMarks)를 썼는가, 선지가 부르는 곳에만 있는가.
      - 렌더 결함(교점 어긋남, 읽기 판과 그림이 다름, 이름이 곡선·기호에 닿음).
      - 그래프 종류가 '수요·공급 교점형'인지 아닌지는 판정에 쓰지 않는다. 지문 관계 말에서 모양이 나왔는지만 본다.
   d. 그래프 명세 오류·graphPlan 오류·정답 유일성 문제로 끝난 문항은 같은 명령으로 한 번만 다시 만든다(OUT_NAME=out-graphC-regen, KEEP_OUT=out-graphC). 또 결함이면 기록만.

[블라인드 — 과금 없음, WORKING-RULES 4-3]
4. $SP/graphC/blind/: 생성 그래프 2문항(A-V2, B-V2 최종본, PNG + 읽기 판) + 자격 기출 2문항(플라스틱 10, 오디오 17 — $SP/calib-judge/ 가공 그대로) + 같은 주제 참고 기출 조세 귀착 12번($SP/calib-judge/tax-incidence-12 가공 그대로, 원본 이미지. ④ 2단계에서 1.75→1.00으로 흔들려 '멈춤' 판단에는 쓰지 않는다). 지문은 문항마다 표시. 출처 표시 없음.
   요청문·결함 목록은 ④ 2단계 CODEX-PROMPT 그대로(문항 수만 5로). 점검: 문항 수, KEY 정답 = 최종본, 출처 표기 grep 0, 이미지가 블라인드 폴더 안에 있음.
5. 순서만 바꿔 2회(seed 20261261, 20261262), 회차마다 평가자 4명, 새 임시 폴더, 병렬.

[집계·보고]
6. $SP/graphC/aggregate.py → aggregate-out.md:
   - 문항별 회차별 등급·평균, 생성 문항별 '수능 아님' 횟수(두 회차 합), 칸 평균(A-V2·B-V2, 두 회차).
   - 자격 기출(플라스틱 10, 오디오 17) 회차별 평균: 둘 중 하나라도 1.5 미만이면 그 회차 '멈춤'. 조세 12는 회차별 점수만 참고로 적는다.
   - 참고: 칸 평균 − 사회 그래프 L2 칸 평균 1.44(조세 귀착, 기출 지문).
   - 평가 이유 중 그림·읽기 판 탓(납작함, 읽기 어려움, 그림과 읽기 판이 다름, 모양이 지문과 안 맞음)과 문항 탓을 나눠 센 표.
   - 정답이 〈보기〉 한 단계·지문 한 문장으로 정해짐 표시 수.
7. 보고서 $SP/REPORT-graphC-test.md(측정만, 판정 이름 없음)와 -human.md(쉬운 말). 3의 기록 요약 포함. 실제 비용(단계별 usage.json 합산).

[커밋]
8. 커밋(목록을 먼저 보여 준다): $SP/CLI-graphC-test.md, $SP/graphC/, $SP/REPORT-graphC-test*.md, $V5/out-graphC/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
   메시지 예: "그래프 첫 실전: 가격 상한제 V2 graph A·B(graphPlan) + 블라인드 2회"
   git push origin experiment/problem-solving-mvp (force 금지).
9. 보고하고 멈춘다: 건조 실행 확인, graphPlanCheck(3단계·최종) 문항별 ok/errs, PNG 두 장 상태 한 줄씩, 등급표(문항 × 회차 × 4명), 칸 평균, '수능 아님' 횟수, 자격 기출 회차별 평균, 그림 탓/문항 탓 표, 수리 여부, 실제 비용, 재생성 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정은 웹이 한다.

추정 비용: 생성 2문항 × 약 $0.5 = 약 $1.0 + 노출 수리 약 $0.05. 그래프는 수리 대상이라 수리가 돌면 문항당 +$0.8(둘 다면 약 $2.6). 재생성 1회 +$0.5. 상한 $3. 지도는 ④ 것을 재사용(0). 블라인드는 codex(ChatGPT 계정)라 과금 없음.
최소 실행 검토: V1(표)은 ④ 것을 KEEP_OUT으로 재사용하고 V2 그래프 2문항만 만든다. 블라인드는 생성 2 + 자격 기출 2 + 참고 기출 1(한 회차 5문항).
```

## 설명

- **목적:** 그래프 1차 도구가 실제 생성에서 제대로 쓰이는지 처음 본다. 생성기가 문항 주제 → 겨냥 변수 → 그래프 종류·모양 순서로 graphPlan을 쓰고, 그 계획대로 그림이 나오는지, 그리고 그 문항이 수능 같은지 잰다.
- **방법:** ④가 만든 가격 상한제 지문에서 그래프 문항만 A형·B형 2개 만든다. 생성기가 쓴 계획, 서버 검사 결과, 수리 뒤 축 이름이 어긋났는지, 그림이 계획의 모양 말과 맞는지를 기록한다. 그다음 자격 기출 2문항(플라스틱 10, 오디오 17)과 같은 주제 참고 기출(조세 귀착 12)을 섞어 평가자 4명이 2회 본다. 조세 12는 ④에서 점수가 흔들려 '평가 정상 확인'에는 쓰지 않는다.
- **판정(웹, 4-3):** 칸 평균 1.5 이상 = L3 통과, 1.0~1.5 = 거의, 1.0 미만 = 미달. 참고로 기출 지문 그래프 칸(1.44)보다 0.5 넘게 낮으면 지문 탓인지 그림 탓인지 이유를 나눠 본다.
- **다음 스텝:** 그림이 계획과 어긋나거나 좌표·교점 결함이 또 나오면 그래프 2차(서버가 모양 말에서 점을 계산)를 제안한다. 계획대로 그려졌는데 점수가 낮으면 문제는 그림이 아니라 문항 쪽이므로 그래프 도구는 여기서 멈춘다.
