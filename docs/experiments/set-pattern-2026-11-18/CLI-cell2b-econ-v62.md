# CLI 지시문: 순서표 ② 사회 표·그래프 v6.2 — 조세 귀착 지문 등록·지도 + 4문항 생성 + 블라인드 4회 (웹 2026-11-24 20시 KST)

결정: Ghootae, `PLAN-cell2-economy-table-graph.md` 7절 (가)(2026-11-24 19:36). 지문은 2a 후보 표에서 PLAN 2-1 기준대로 웹이 골랐다(아래 '고른 까닭'). 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $5)·커밋·푸시의 승인이다. **렌더 코드(render.mjs)는 이번에 고치지 않는다.**

고른 까닭: 기준①~③을 모두 채운 후보는 #1·#2·#4·#9이고, 기준③(평가원·수능 > 교육청 고3 > 고1·2)에서 고3은 #1 〈조세 귀착의 경제적 효과〉(고3 2024년 7월 교육청)뿐이다. 평가원·수능 경제 지문 중 그림 〈보기〉 3점은 158세트에 없다. 기출 12번 그래프(공급 1개 + 수요 D₁→D₂ 이동, 교점 A·B)는 2a의 T2(평행 이동 + 새 교점)로 그릴 수 있는 모양이라 렌더 수정 없이 돈다.

```
순서표 ②: 사회 표·그래프 v6.2 칸 — 조세 귀착 지문 등록·골드 지도 + A·B × V1(표)·V2(그래프) 4문항 + 블라인드 4회 (웹 2026-11-24, PLAN-cell2-economy-table-graph.md, CLI-cell2b-econ-v62.md)

0. 지킬 것
   - 규칙 파일(v5·v6), run.mjs·eval-repair.mjs·classify-v6.mjs·leak-fix.mjs·graph/render.mjs는 고치지 않는다. 고쳐야 돌아가면 멈추고 보고한다(멈춤 ⑤).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지.
   - 생성 gpt-6.2-sol(기본값), RULES_V=6. dispute-fix는 돌리지 않는다. 판정 codex gpt-6.1-sol(보고서에 한 줄 적기).
   - 비용 상한 $5. 단계마다 usage.json을 합산하고, 넘을 것 같으면 그 전에 멈춘다(멈춤 ③).
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/cell2/ (2a 산출물과 같은 곳).
   - 지문 ID: tax-incidence-excise (setId 69bffb7978128b2a9bedcf72, 기출 12번 3점 그래프).
1. 전제 확인(없으면 멈추고 묻는다)
   - git log -1 이 c46712a0(또는 그 뒤), git status에 규칙 파일·render.mjs 변경 없음.
   - $SP/PLAN-cell2-economy-table-graph.md, $SP/cell2/CANDIDATES-econ.md, $SP/cell2/RENDER-CHECK.md 있음.
   - $V5/kind-table-v6.md, $V5/kind-graph-v6.md 있음.

[준비, 지도만 API]
2. 지문 등록: /Users/mac/Projects/suneung_db/output/passages/69bffb7978128b2a9bedcf72.json 의 full_text로 $V5/passages/tax-incidence-excise/passage.txt, meta.json(제목, 시험 "고3 2024년 7월 - 교육청 모의평가", source setId·number 12, note "순서표 ② 경제 칸 시험용 등록(2026-11-24)"). bt-* 등록과 같은 형식. 문단 구분·기호(㉠ 등)는 원문 그대로.
3. 대조 기출: $V5/calib-gold/tax-incidence-12.json — 기존 calib-gold(doppler-12.json)와 같은 형식. kind "graph", 발문·선지·정답(suneung_db answers)은 원문 그대로, bogi는 그래프를 글로 옮긴 설명(축·선·교점 A·B 값·점선). 원본 이미지는 $SP/cell2/blind/img/gold-12.png 로 복사(블라인드에는 이 원본 이미지를 쓴다).
4. 골드 지도: gen31-T1-1·gen32-T3-2와 같은 절차(MAP-PROMPT-v2, 3회 생성 → 하나 굳힘)로 $V5/passages/tax-incidence-excise/map.json. 그때 쓴 스크립트를 찾아 그대로 쓴다. 실측 비용을 적는다(예상 약 $0.35).
5. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 PASSAGE=tax-incidence-excise MODE=A KIND_V1=table KIND_V2=graph 로 3단계 지시문을 만들어, GN1 문단이 있고 "(옛" 0개, kind-table-v6·kind-graph-v6 문단이 둘 다 들어갔는지 본다. 건조 실행 폴더는 지운다.
6. 예상 비용을 적는다: 지도 실측 + 4문항(① 칸 실측 문항당 $0.45~0.53) + 수리 가능성(문항당 +$0.8). $5를 넘으면 멈춘다.

[생성, API]
7. OUT_NAME=out-cell2-v62, A 다음 B(같은 OUT_NAME이라 B가 같은 회차 A 함정을 피함).
   PASSAGE=tax-incidence-excise MODE=A|B KIND_V1=table KIND_V2=graph OUT_NAME=out-cell2-v62 RULES_V=6
   각각 run.mjs → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). 로그 $V5/out-cell2-v62-tax-incidence-excise-<A|B>.log.
   (ONLY·KEEP_OUT 없음: 새 지문이라 V1·V2를 함께 만든다. V1 = 표, V2 = 그래프.)
   - 그래프 문항: validateSpec 경고·오류, 렌더된 SVG를 PNG로 바꿔 $SP/cell2/graph-png/<A|B>-V2.png 에 두고 직접 본다(2a render-test 스크립트 방식). 그림이 깨졌거나(교점 어긋남, 읽기 판과 그림이 다름) 명세가 경제 그래프를 표현 못해 이상한 모양으로 우회했으면 그 문항을 '렌더 결함'으로 기록한다(고치지 않음).
8. 결함(정답 유일성 문제, 그래프 명세 오류, 렌더 결함)으로 끝난 문항은 같은 명령으로 한 번만 다시 만든다(OUT_NAME=out-cell2-v62-regen, 그 버전만 ONLY + KEEP_OUT=out-cell2-v62). 또 결함이면 버리고 기록한다.

[블라인드, 과금 없음]
9. $SP/cell2/blind/BLIND-cell2.md, KEY-cell2.md, CODEX-PROMPT-cell2.md: ① 칸 blind(cell1-v62/blind)를 만든 스크립트·요청문·결함 목록(㉮~㉴, ㉯ 정의 그대로, ㉴ 좁힌 정의)을 바탕으로.
   지문 1편, 5문항 = 표 A-V1, 그래프 A-V2, 표 B-V1, 그래프 B-V2(이번 최종본) + 기출 12번. 순서 무작위, 출처 표시 없음.
   그래프 문항은 PNG와 읽기 판을 함께, 기출 12번은 원본 이미지를 준다(이미지가 블라인드 폴더 안에 있어야 평가자가 연다).
   점검(AUTO-LOOP 5-다): 기출 선지가 원래 발문에 묶여 있으면 원래 발문 유지, 요청문의 문항 수(5)가 실제와 같은지, KEY 정답이 각 최종본과 같은지, 출처를 드러내는 표기(원래 번호, 기출 이미지의 문항 번호·시험 표시)가 없는지. 기출 이미지에 시험 표시가 있으면 잘라 낸다.
10. 평가자 4명: AUTO-LOOP 1-5의 codex exec 명령, 평가자마다 새 임시 폴더(블라인드 파일·이미지만), 병렬. 이미지 인자가 필요하면 codex exec의 이미지 첨부 옵션을 쓴다(그래프 r3 때와 같게). 결과 $SP/cell2/blind/REPORT-cell2-eval1~4.md.

[집계·보고]
11. $SP/cell2/aggregate.py:
   a. 문항별 4회 등급·평균(수능 같음 2, 중 1, 수능 아님 0), 정답 일치, 결함 표시 빈도.
   b. 칸별 판정 값(PLAN 5절): 표 칸(A-V1·B-V1), 그래프 칸(A-V2·B-V2) 각각 문항별 '수능 아님' 횟수, '수능 같음' 3회 이상 문항 수. 기출 '수능 같음' 횟수. 판정 이름은 웹이 붙인다 — 값만.
   c. 평가자 이유 중 그림·읽기 판을 탓한 것(그래프가 납작함·읽기 어려움·읽기 판과 그림이 다름 등)을 문항별로 따로 센다(렌더 원인과 문항 원인을 가르기 위해).
   d. 다음 감사 칸 자료: 평가자 이유에서 "정답이 〈보기〉 한 단계 / 지문 한 문장으로 정해짐"에 해당하는 지적 수(문항별), GN1 '지문만' 오답이 놓인 자리(①~⑤).
   e. 문항별 strategies(선택 전략), 3-assemble.md의 GN1 언급, 수리 대상 여부·사유, 표 칸 점검(같은 행 = 같은 변수, 결과 행 금지) 경고.
12. 보고서 $SP/REPORT-cell2-v62.md(측정만, 결론·규칙 후보 없음, 규칙처럼 보이는 것은 '관찰')와 REPORT-cell2-v62-human.md(쉬운 말 요약). 평가자 이유는 문항별 한 줄, 2문항 이상 반복된 결함 원인. 실제 비용(usage.json 합산, 단계별: 지도·생성·검사·수리·노출 수리).

[기록·커밋]
13. 커밋할 파일(먼저 목록을 보여 준다): $SP/PLAN-cell2-economy-table-graph.md, $SP/CLI-cell2a-econ-prep.md, $SP/CLI-cell2b-econ-v62.md, $SP/cell2/ 전체(2a 산출물 포함), $SP/REPORT-cell2-v62*.md, $V5/passages/tax-incidence-excise/, $V5/calib-gold/tax-incidence-12.json, $V5/out-cell2-v62/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
    메시지 예: "순서표 ②: 사회 표·그래프(조세 귀착) v6.2 칸 생성 + 블라인드 4회"
    커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
14. 보고하고 멈춘다: 5단계 결과, 지도 비용, 등급표(문항 × 4회), 11-b·c·d 값, 그래프 PNG 두 장 상태 한 줄씩, 실제 비용, 형식 실패·재생성 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. PROGRESS-hard·CURRENT_STATE는 고치지 않는다(웹 판정 뒤).

추정 비용: 골드 지도 약 $0.35 + 생성 4문항 약 $2.0(① 칸 실측 문항당 $0.45~0.53) = 약 $2.4. 표·그래프는 수리 대상이라 수리가 돌면 문항당 +$0.8(1~2문항이면 합계 $3.2~4.0). 재생성 1회당 +$0.5. 상한 $5. 블라인드는 codex(ChatGPT 계정)라 과금 없음.
최소 실행 검토: 지문 1편, V1을 표·V2를 그래프로 갈라 칸마다 A·B 두 문항(새 지문이라 ONLY를 못 씀), 앵커 없음(이전 생성 문항 없음), 표시 판정·확인용 기출 생략, 렌더 수정 없음.
```

## 설명

- **목적:** 사회 표 칸과 사회 그래프 칸을 기출 경제 지문에서 처음 시험한다. v6.2 규칙으로 표·그래프 〈보기〉 문항이 기출 같은 수준으로 나오는지 본다.
- **방법:** 〈조세 귀착〉 지문을 등록하고 골드 지도를 만든다. A형·B형마다 표 1문항, 그래프 1문항, 모두 4문항을 만든다. 이 4문항을 같은 지문 기출 12번(그래프)과 섞어 코덱스 평가자 4명이 블라인드로 등급을 매긴다. 판정 기준은 ① 칸과 같다. 그래프는 그림 탓인지 문항 탓인지 나눠 센다.
- **다음 스텝:** CLI 보고가 오면 웹이 칸별로 통과·거의·미달을 붙인다. 그래프 칸이 그림 때문에 떨어졌으면 그때 렌더 수정안(두 선 사이 구간 표시 등)을 들고 Ghootae에게 묻는다(멈춤 ⑤).
- **커밋·CLI 시점:** 이 지시문 하나로 등록·지도·생성·판정·커밋·푸시까지 CLI가 한다. 2a 산출물도 이 커밋에 함께 들어간다. 웹은 커밋하지 않는다.
- **한계:** 표 칸의 대조 기출이 표가 아니라 그래프다(같은 지문에 표 〈보기〉 기출이 없다). 기출은 '평가가 정상인가'를 보는 데만 쓰므로 판정에는 문제가 없다.
