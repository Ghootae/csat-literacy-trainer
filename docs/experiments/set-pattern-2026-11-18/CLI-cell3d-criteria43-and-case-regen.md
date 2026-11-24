# CLI 지시문: 판정 기준 4-3 소급 기록 + 과학 사례 B형 1회 재생성·블라인드 (웹 2026-11-25 0시 KST)

결정: Ghootae 2026-11-25 00:19 KST "가로 할께" (`calib-judge/REVIEW-calib-judge-web.md` 4절 (가)). 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $2)·커밋·푸시의 승인이다. WORKING-RULES 4-3은 웹이 이미 넣었다.

```
③-d: 판정 기준 4-3 소급 기록 + 과학 사례(고체 촉매) B형 1회 재생성 + 블라인드 2회 (웹 2026-11-25, calib-judge/REVIEW-calib-judge-web.md, CLI-cell3d-criteria43-and-case-regen.md)

0. 지킬 것
   - 규칙 파일(v5·v6), run.mjs·eval-repair.mjs·classify-v6.mjs·leak-fix.mjs·render.mjs 고치지 않는다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - 생성 gpt-6.2-sol, RULES_V=6, dispute-fix 안 돌림. 판정 codex gpt-6.1-sol. 비용 상한 $2(넘을 것 같으면 그 전에 멈춤).
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18.
1. 전제 확인(없으면 멈추고 보고): 3c 커밋이 git log에 있음. docs/handoffs/WORKING-RULES.md에 "## 4-3. 칸 판정 기준" 있음(grep). $SP/calib-judge/REVIEW-calib-judge-web.md 맨 위에 "결정: Ghootae 2026-11-25". $V5/out-cell3-v62/solid-catalyst-A/items.json 있음.

[A. 기록 — 문안 그대로]
2. $SP/PROGRESS-hard.md:
   a. 제목 줄 날짜 괄호를 "(2026-11-25, 판정 기준 4-3 소급 반영)"으로.
   b. 사회 관점 행 '진척 단계' 맨 앞: "**거의 통과(4-3 소급 2026-11-25: 두 회차 칸 평균 1.31)** ← 4-2 기록: "
   c. 사회 그래프 행 '진척 단계' 맨 앞: "**거의 통과(4-3 소급 2026-11-25: 칸 평균 1.44)** ← 4-2 기록: "
   d. 과학 그래프 행 '진척 단계' 맨 앞: "**L2 통과(4-3 소급 2026-11-25: 옥신 그래프 2문항 칸 평균 1.94. 주의: 생성 그래프가 곡선형이 아님(②와 합쳐 4/4))** ← "
   e. 과학 사례 행 '진척 단계' 맨 앞: "**미달(4-3 소급 2026-11-25: 칸 평균 1.28, B-V2 '수능 아님' 2회. A형 2문항 1.56) → B형 1회 재생성(③-d)** ← "
   f. 맨 아래 기록 한 줄: "- 2026-11-25 평가 잣대 점검(calib-judge, 기출 10 단독 80회, 무료): 평가자는 일관되고(같은 문항 두 회차 9/10 같음) 깊이를 잰다(깊은 기출 1.75~2.0, 정답이 지문 한 문장으로 정해지는 기출은 평가원이어도 0.0~1.1). 판정 기준 4-3 채택(Ghootae 00:19): 칸 평균 ≥1.5 통과 / 1.0~1.5 거의 / <1.0 미달, 바닥 유지, 블라인드마다 자격 기출(단독 ≥1.5) 1개. ①~③ 소급: 사회 관점 통과→거의, 사회 그래프 통과→거의, 과학 그래프 보류→통과, 과학 사례 보류→미달(B형 재생성)."
3. memory/CURRENT_STATE.md 95행에서 "순서표 ② 끝(" 부터 그 줄 끝까지를 다음으로 바꾼다(그 문구가 없으면 멈추고 보고):
   "순서표 ①·② 끝, ③-1 끝(과학 그래프 통과·과학 사례 B형 재생성 중). 칸 판정 기준 = 칸 평균 ≥1.5 통과, 블라인드마다 자격 기출(docs/handoffs/WORKING-RULES.md 4-3, 2026-11-25). 다음 할 일 = 과학 사례 재생성 결과 기록 → ③-2 실험(kind-experiment-v6 초안 결정)."

[B. 과학 사례 B형 재생성, API]
4. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 PASSAGE=solid-catalyst MODE=B KIND_V1=case KIND_V2=case OUT_NAME=out-cell3-v62-regen AVOID_OUT=out-cell3-v62 로 3단계 지시문을 만들고, B가 피할 A형 함정이 out-cell3-v62의 A에서 읽혔는지 확인. 건조 폴더 삭제.
5. 생성: PASSAGE=solid-catalyst MODE=B KIND_V1=case KIND_V2=case OUT_NAME=out-cell3-v62-regen AVOID_OUT=out-cell3-v62 RULES_V=6
   run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs. 로그 $V5/out-cell3-v62-regen-solid-catalyst-B.log. 지도는 기존 map.json 재사용. 이번 재생성은 1회뿐(결함이어도 다시 만들지 않고 기록).

[C. 블라인드 2회, 과금 없음 — WORKING-RULES 4-3]
6. $SP/cell3/blind-r2/solid-catalyst/: 사례 A-V1·A-V2(out-cell3-v62 최종본, 그대로) + 새 B-V1·B-V2(out-cell3-v62-regen 최종본) + 자격 기출 플라스틱 10번(calib-judge의 가공 그대로) = 5문항. 고체 촉매 기출 10번은 넣지 않는다. 지문이 둘(고체 촉매, 플라스틱)이므로 BLIND에 지문을 각각 붙이고 문항마다 어느 지문인지 적는다. 출처 표시 없음.
   요청문·결함 목록은 ③ 칸 CODEX-PROMPT 그대로(문항 수만 맞춤). 점검: 문항 수 5, KEY 정답이 최종본과 같음.
7. 순서만 바꿔 2회(seed 20261211, 20261212), 회차마다 평가자 4명, 새 임시 폴더, 병렬.

[D. 집계·보고]
8. $SP/cell3/aggregate-r2.py → aggregate-out-r2.md: 문항별 회차별 등급·평균, 사례 칸 평균(4문항, 두 회차), A형·B형 평균, 생성 문항별 '수능 아님' 횟수(두 회차 합), 자격 기출 플라스틱 10번의 회차별 평균(1.5 미만이면 그 회차 '멈춤'이라고 적음), ㉲·㉯ 표시 수, 새 B 두 문항의 strategies·검사기 경고.
9. 보고서 $SP/REPORT-cell3-regen.md(측정만)와 -human.md. 실제 비용.

[E. 커밋]
10. 커밋 전 grep: PROGRESS-hard에 "4-3 소급 2026-11-25" 4곳, WORKING-RULES에 "## 4-3." 1곳. 없으면 커밋하지 않고 보고.
11. 커밋(오답 카드 4파일 제외): docs/handoffs/WORKING-RULES.md, $SP/calib-judge/REVIEW-calib-judge-web.md, $SP/CLI-cell3d-criteria43-and-case-regen.md, $SP/PROGRESS-hard.md, memory/CURRENT_STATE.md, $SP/cell3/blind-r2/, $SP/cell3/aggregate-r2.py, $SP/cell3/aggregate-out-r2.md, $SP/REPORT-cell3-regen*.md, $V5/out-cell3-v62-regen/, 새 로그, 그리고 아직 안 들어간 웹 초안 $SP/cell3/kind-experiment-v6-DRAFT.md, $SP/REVIEW-rules-2026-11-24-experiment.md.
    메시지 예: "판정 기준 4-3(칸 평균 + 자격 기출) 채택·①~③ 소급, 과학 사례 B형 재생성 + 블라인드 2회"
    git push origin experiment/problem-solving-mvp (force 금지).
12. 보고하고 멈춘다: 등급표, 사례 칸 평균, A·B형 평균, '수능 아님' 횟수, 자격 기출 회차별 평균, 실제 비용, 커밋 해시, 푸시 결과, git status --short | wc -l. PROGRESS-hard의 과학 사례 결과 줄은 웹 판정 뒤에 고친다.

추정 비용: B형 2문항 생성 약 $1.0(문항당 $0.45~0.54, 검색·선택 단계 포함), 수리가 돌면 +$0.8. 상한 $2. 블라인드는 codex라 과금 없음.
최소 실행 검토: 문제였던 B형만 다시 만든다. A형은 재사용. 지도 재사용. 자격 기출 1개만 넣는다.
```

## 설명

- **목적:** 정한 판정 기준 4-3을 진척표·현재 상태에 반영하고, 미달이 된 과학 사례 칸의 B형만 한 번 다시 만들어 본다.
- **방법:** 고체 촉매 지문으로 B형 사례 2문항을 새로 만든다. 기존 A형 2문항, 자격 기출 플라스틱 10번과 함께 평가자 4명이 2번 블라인드 평가한다. 칸 평균이 1.5 이상이면 통과, 1.0~1.5면 거의 통과다.
- **다음 스텝:** 결과와 상관없이 과학 사례 칸을 기록한다. 그다음 실험 칸(③-2)의 규칙 초안을 결정하고 시험 지시문으로 넘어간다.
- **커밋 시점:** 이 지시문 끝에서 기준 문서, 기록, 재생성 결과, 실험 초안까지 한 번에 커밋·푸시한다.
