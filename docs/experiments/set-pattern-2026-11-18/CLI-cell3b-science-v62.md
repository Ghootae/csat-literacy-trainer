# CLI 지시문: 순서표 ③-1 과학 사례 A형·그래프 v6.2 — 기출 2편 등록·지도 + 8문항 생성 + 블라인드 (지문별 2회) (웹 2026-11-24 22시 KST)

결정: `PLAN-cell3-science.md`, 3a 후보 표 `cell3/CANDIDATES-science.md`를 본 뒤 Ghootae 결정(아래 '고른 까닭'). 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $7)·커밋·푸시의 승인이다. **렌더 코드·규칙 파일은 고치지 않는다.**

고른 까닭:
- P2(그래프): 기준 ①~④를 모두 채운 후보는 옥신 q17·습도 센서 q28(둘 다 고2 교육청). 기준 ④(등급 같으면 최근)로 **옥신(고2 2026년 6월 교육청, 17번 3점 A형)**. 곡선 세 개·교차·최고점이 있는 그래프라 ②에서 비어 있던 '곡선형 그래프'를 시험할 수 있다.
- P1: 과학 관점 〈보기〉 3점 기출이 158세트에 0개여서 과학 관점 칸은 이번 묶음에서 뺀다. P1 자리는 **과학 사례 A형**에 쓴다. 과학 사례 A형 3점 중 평가원·수능이고 칸 시험에 안 쓴 것은 **〈고체 촉매의 구성 요소와 작용 원리〉(2023년 6월 평가원, 10번 3점 A형)** 하나다. A형을 더 보려고 V1·V2를 모두 사례로 둔다.

```
순서표 ③-1: 과학 사례 A형(고체 촉매)·과학 그래프(옥신) v6.2 칸 — 지문 2편 등록·골드 지도 + 지문마다 A·B × V1·V2 4문항(합 8) + 블라인드 지문별 2회 (웹 2026-11-24, PLAN-cell3-science.md, CLI-cell3b-science-v62.md)

0. 지킬 것
   - 규칙 파일(v5·v6), run.mjs·eval-repair.mjs·classify-v6.mjs·leak-fix.mjs·graph/render.mjs는 고치지 않는다. 고쳐야 돌아가면 멈추고 보고한다(멈춤 ⑤).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - 생성 gpt-6.2-sol(기본값), RULES_V=6. dispute-fix는 돌리지 않는다. 판정 codex gpt-6.1-sol.
   - 비용 상한 $7. 단계마다 usage.json을 합산하고, 넘을 것 같으면 그 전에 멈춘다(멈춤 ③).
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/cell3/.
   - 지문 ID: solid-catalyst (setId 69c0110bfa5063deffe1a632, 기출 10번 3점 사례 A형), auxin-growth (setId 6a22950f…, CANDIDATES-science.md P2 #1의 전체 setId, 기출 17번 3점 그래프 A형).
1. 전제 확인(없으면 멈추고 묻는다)
   - 3a 커밋이 git log에 있음. git status에 규칙 파일·render.mjs 변경 없음.
   - docs/handoffs/WORKING-RULES.md에 "## 4-2. 칸 판정 기준", $SP/cell3/CANDIDATES-science.md, $SP/cell3/candidates-img/6a22950f-q17-img_001.png 있음.
   - $V5/kind-case-v6.md, $V5/kind-graph-v6.md, $V5/kind-table-v6.md 있음.

[준비, 지도만 API]
2. 지문 등록 2편: suneung_db 원본 full_text로 $V5/passages/<id>/passage.txt, meta.json(제목, 시험, source setId·number, note "순서표 ③ 과학 칸 시험용 등록(2026-11-24)"). tax-incidence-excise와 같은 형식, 문단·기호 원문 그대로.
3. 대조 기출: $V5/calib-gold/solid-catalyst-10.json(kind "case"), $V5/calib-gold/auxin-17.json(kind "graph", bogi = 그래프를 글로 옮긴 설명: 축·곡선 ⓐ·ⓑ·ⓒ·교차·0선·M₁·M₂). tax-incidence-12.json과 같은 형식, 발문·선지·정답은 원문 그대로. 옥신 원본 이미지는 $SP/cell3/blind/img/gold-auxin-17.png로 복사(시험 표시·문항 번호가 보이면 잘라 낸다).
4. 골드 지도 2편: tax-incidence-excise 때와 같은 절차·스크립트로 map.json. 실측 비용(예상 편당 약 $0.35).
5. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 로 solid-catalyst(MODE=A KIND_V1=case KIND_V2=case), auxin-growth(MODE=A KIND_V1=graph KIND_V2=table) 3단계 지시문을 만들어 GN1 문단, "(옛" 0개, 갈래 규칙 문단(case / graph·table)이 들어갔는지 본다. KIND_V1=KIND_V2=case가 오류 없이 도는지도 본다(안 돌면 멈추고 보고). 건조 실행 폴더는 지운다.
6. 예상 비용: 지도 실측 + 8문항(문항당 $0.45~0.54 실측) + 수리 가능성(문항당 +$0.8). $7을 넘으면 멈춘다.

[생성, API]
7. OUT_NAME=out-cell3-v62. 지문마다 A 다음 B(같은 OUT_NAME이라 B가 같은 회차 A 함정을 피함).
   solid-catalyst: KIND_V1=case KIND_V2=case
   auxin-growth:   KIND_V1=graph KIND_V2=table
   각각 run.mjs → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). 로그 $V5/out-cell3-v62-<id>-<A|B>.log.
   - 그래프 문항: validateSpec 경고·오류, SVG를 PNG로 바꿔 $SP/cell3/graph-png/<A|B>-V1.png, 직접 본다. 그림이 깨졌거나 읽기 판과 그림이 다르면 '렌더 결함'으로 기록(고치지 않음). 생성 그래프 모양(곡선·교차·최고점 / 값 선)을 한 줄 적는다.
8. 결함(정답 유일성 문제, 그래프 명세 오류, 렌더 결함)으로 끝난 문항은 한 번만 다시 만든다(OUT_NAME=out-cell3-v62-regen, ONLY + KEEP_OUT=out-cell3-v62). 또 결함이면 버리고 기록.

[블라인드, 과금 없음 — WORKING-RULES 4-2]
9. 지문마다 따로 블라인드를 만든다. $SP/cell3/blind/<id>/ 안에 BLIND·KEY·CODEX-PROMPT. ② 칸 blind 스크립트·요청문·결함 목록(㉮~㉴)·'그래프 한 줄 평' 항목을 바탕으로.
   - solid-catalyst: 사례 A-V1·A-V2·B-V1·B-V2 + 기출 10번 = 5문항.
   - auxin-growth: 그래프 A-V1·B-V1, 표 A-V2·B-V2 + 기출 17번(원본 이미지) = 5문항. 그래프는 PNG와 읽기 판을 함께.
   - 점검(AUTO-LOOP 5-다): 문항 수 5, KEY 정답이 최종본과 같음, 출처 표기 없음.
10. 같은 묶음을 순서만 바꿔 2회 돌린다(r1 seed 20261201, r2 seed 20261202). 회차마다 평가자 4명, 평가자마다 새 임시 폴더, 병렬. 결과 $SP/cell3/blind/<id>/REPORT-eval-r<1|2>-<1~4>.md. 두 지문을 한 요청에 섞지 않는다.

[집계·보고]
11. $SP/cell3/aggregate.py (② aggregate.py를 바탕으로, 값만, 판정 이름은 웹이 붙임):
   a. 문항별 회차별 4회 등급·평균(같음 2, 중 1, 아님 0), 정답 일치, 결함 표시 빈도.
   b. 칸 값(4-2): 사례 칸 = solid-catalyst 생성 4문항, 그래프 칸 = auxin-growth 그래프 2문항, (참고) 과학 표 = auxin-growth 표 2문항. 칸마다 회차별 칸 평균·기출 평균·D와 두 회차 평균 D·칸 평균, 생성 문항별 '수능 아님' 횟수(두 회차 합·회차별). '수능 같음' 횟수는 참고로만.
   c. 사례 칸은 A형(A-V1·A-V2)과 B형(B-V1·B-V2) 평균을 따로도 적는다.
   d. 그래프 문항: 등급 이유 중 그림·읽기 판 탓 건수, '그래프 한 줄 평' 요약.
   e. 다음 감사 칸 자료: "정답이 〈보기〉 한 단계 / 지문 한 문장으로 정해짐" 지적 수(문항별), GN1 '지문만' 오답 자리.
   f. 문항별 strategies, 3-assemble.md의 GN1 언급, 수리 대상 여부·사유.
12. 보고서 $SP/REPORT-cell3-v62.md(측정만, 결론·규칙 후보 없음)와 REPORT-cell3-v62-human.md(쉬운 말). 실제 비용(usage.json, 단계별).

[기록·커밋]
13. 커밋할 파일(먼저 목록을 보여 준다): $SP/CLI-cell3b-science-v62.md, $SP/PLAN-cell3-science.md, $SP/cell3/ 전체, $SP/REPORT-cell3-v62*.md, $V5/passages/solid-catalyst/, $V5/passages/auxin-growth/, $V5/calib-gold/solid-catalyst-10.json, $V5/calib-gold/auxin-17.json, $V5/out-cell3-v62/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
    메시지 예: "순서표 ③-1: 과학 사례 A형(고체 촉매)·그래프(옥신) v6.2 칸 생성 + 블라인드 지문별 2회"
    git push origin experiment/problem-solving-mvp (force 금지).
14. 보고하고 멈춘다: 5단계 결과, 지도 비용, 등급표(문항 × 회차 × 4명), 11-b·c·d·e 값, 그래프 PNG 상태, 실제 비용, 재생성 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. PROGRESS-hard·CURRENT_STATE는 고치지 않는다(웹 판정 뒤).

추정 비용: 지도 2편 약 $0.7 + 생성 8문항 약 $4.0 = 약 $4.7. 수리가 돌면 문항당 +$0.8(1~2문항이면 $5.5~6.3). 재생성 1회 +$0.5. 상한 $7. 블라인드는 codex(ChatGPT 계정)라 과금 없음.
최소 실행 검토: 지문 2편으로 두 칸 + 과학 표 확인을 덮는다(새 지문이라 ONLY를 못 써서 V2도 만든다). 과학 관점은 기출 대조가 없어 뺐다. 앵커 없음, 표시 판정 생략, 렌더 수정 없음.
```

## 설명

- **목적:** 과학 사례 칸의 A형 약점("한 단계로 풀림")이 v6.2에서 나아졌는지, 과학 그래프 칸이 곡선형 기출 지문에서 기출만큼 나오는지 본다.
- **방법:** 평가원 〈고체 촉매〉 지문에서 사례 4문항(A형 2, B형 2), 교육청 고2 〈옥신〉 지문에서 그래프 2문항·표 2문항을 만든다. 지문마다 기출 1문항과 섞어 평가자 4명이 블라인드로 2번 평가하고, 새 기준(칸 평균 − 기출 평균)으로 값을 낸다.
- **다음 스텝:** 보고가 오면 웹이 칸마다 통과·거의·미달을 붙인다. 그동안 웹은 실험 갈래 규칙 초안(③-2)을 쓴다.
- **커밋·CLI 시점:** 이 지시문 하나로 등록부터 커밋·푸시까지 CLI가 한다.
