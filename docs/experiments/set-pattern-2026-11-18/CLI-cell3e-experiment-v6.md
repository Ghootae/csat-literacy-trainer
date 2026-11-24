# CLI 지시문: ③-2 실험 갈래 v6 채택 + 방식 위반 하나여도 수리 + 표면 장력 B형 시험 (웹 2026-11-25 01시 KST)

결정: Ghootae 2026-11-25 01:25 KST 카드 "(가) 초안 채택 + M2 수리 강제" (초안 `cell3/kind-experiment-v6-DRAFT.md`, 검토 `REVIEW-rules-2026-11-24-experiment.md`). 이 지시문을 붙여 넣는 것이 아래 규칙·코드 변경, API 실행(상한 $2.5), 커밋·푸시의 승인이다.

```
③-2: 실험 갈래(kind-experiment-v6) 채택·코드 추가 + 방식 위반 하나여도 수리(classify-v6) + 표면 장력(2026.6 평가원 16번) B형 2문항 생성 + 블라인드 2회 (웹 2026-11-25, CLI-cell3e-experiment-v6.md)

0. 지킬 것
   - 고칠 수 있는 파일은 이 지시문이 적은 것만: $V5/kind-experiment-v6.md(새로), $V5/rules-common-v6.md(R1·R5 한 줄씩), $V5/run.mjs, $V5/classify-v6.mjs, $V5/classify-v6.test.mjs, 필요하면 $V5/eval-repair.mjs·leak-fix.mjs의 갈래 이름 목록. 그 밖의 규칙·코드는 고치지 않는다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - 생성 gpt-6.2-sol, RULES_V=6, dispute-fix 안 돌림. 판정 codex gpt-6.1-sol. 비용 상한 $2.5(단계마다 usage.json 합산, 넘을 것 같으면 그 전에 멈춤).
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/cell3/exp/.
1. 전제 확인(없으면 멈추고 보고): 3d 커밋이 git log에 있음. $SP/REVIEW-cell3-r2-web.md 맨 끝 줄이 "결정: Ghootae 2026-11-25 01:22". $SP/PROGRESS-hard.md 과학 사례 행에 "미달 확정(③-d". $SP/cell3/kind-experiment-v6-DRAFT.md 있음. git status에 규칙 파일·run.mjs·classify-v6.mjs 변경 없음(PROGRESS-hard·REVIEW-cell3-r2-web는 웹이 고친 것이라 변경 있음이 정상).

[A. 규칙 — 무료]
2. $V5/kind-experiment-v6.md 새로 만든다: 초안 내용 그대로 옮기되
   - 첫 줄 제목은 "# 〈보기〉 갈래: 실험·관찰 (v6, 2026-11-25 채택)", 둘째 줄 아래에 "근거: 기출 2/2(압전 2023.9 평가원 11번, 표면 장력 2026.6 평가원 16번). 기출이 둘 다 B형이라 B형부터 쓴다." 한 줄.
   - KX4·KX5 끝의 "← **R1과 부딪침, 아래 검토 2절**" / "← **R5와 부딪침, 아래 검토 2절**"은 "(R1 예외, 이 갈래에만)" / "(R5 예외, 이 갈래에만, 선지가 가정으로 채울 때)"로 바꾼다.
   - "좋은 예"는 지문 소재(표면 장력, 압전)와 겹치지 않는 그대로(부력)를 둔다. 기존 kind-case-v6.md와 같은 머리 형식(stripOld가 읽는 꼴)인지 확인.
3. $V5/rules-common-v6.md:
   - R1 줄 바로 아래: "  예외: 실험 갈래는 조작의 계기가 된 관찰 상태를 쓸 수 있다(목적·가설은 금지). kind-experiment-v6 KX4, 2026-11-25."
   - R5 줄 바로 아래: "  예외: 실험 갈래의 마지막 시점·조건 결과는 비울 수 있다(선지가 '~라면'으로 채울 때만). kind-experiment-v6 KX5, 2026-11-25."
4. 수소 저장(2025.6 평가원 12번) 실험 〈보기〉 원문을 suneung_db에서 읽어 $SP/REVIEW-rules-2026-11-24-experiment.md 1절 표에 세 번째 열로 넣는다(형식 글자 수, KX1~KX5 지킴 ○/✕, 선지 가정 번호, A형/B형). 규칙은 고치지 않는다. 어긋나는 원칙이 있으면 보고에 적는다.

[B. 코드 — 무료]
5. run.mjs: KIND_NAME에 experiment: '실험·관찰' 추가, 오류 문구를 "case | table | view | graph | experiment"로. 형식 점검(else 갈래)에서 experiment는 글자 수 [150, 310], 맨 끝 줄에 "(단," 괄호가 없으면 점검 항목 "실험 갈래인데 '(단, …)' 줄 없음"(KX1). 선지 평균 권장은 case와 같게.
6. classify-v6.mjs:
   a. 수리 조건을 "결함 아님 그리고 방식 위반(M2~M5)이 하나 이상 그리고 view 아님"으로 바꾼다(지금은 둘 이상). 주석: "v6.3 (Ghootae 2026-11-25): 방식 위반 하나여도 수리(과학 사례 B형이 M2 경고만 받고 수리 없이 미달). view는 그대로 경고만."
   b. 전략 표(S1~S20)의 kinds 목록 중 S18에 'experiment'를 더한다(KX3). 'case'가 들어 있는 전략은 모두 'experiment'도 쓸 수 있게 할지 판단이 필요하면 하지 말고, 실험 문항에 고를 수 있는 전략 목록을 보고에 적는다.
   c. classify-v6.test.mjs: 방식 위반 하나 → 수리 true(case), 하나 → 수리 false(view), 둘 → 수리 true 테스트를 맞춘다. node --test로 classify-v6.test.mjs만 돌려 통과 확인.
7. eval-repair.mjs·leak-fix.mjs·graph 관련에 갈래 이름 목록이 하드코딩돼 있으면(grep "'case'", "case|") experiment를 더한다. 없으면 건드리지 않는다.

[C. 지문 준비 — 지도만 API]
8. 지문 등록: suneung_db 원본으로 $V5/passages/surface-tension/passage.txt, meta.json(제목, 2026년 6월 평가원, source setId·number 16, note "순서표 ③-2 실험 칸 시험용 등록(2026-11-25)"). solid-catalyst와 같은 형식.
9. 대조 기출: $V5/calib-gold/surface-tension-16.json(kind "experiment", 발문·〈보기〉·선지·정답 원문). 골드 지도 map.json은 solid-catalyst 때와 같은 절차(예상 약 $0.35).
10. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 PASSAGE=surface-tension MODE=B KIND_V1=experiment KIND_V2=experiment OUT_NAME=out-cell3e. 3단계 지시문에 "[갈래 규칙: 실험·관찰 (experiment)]" 문단, KX1~KX5, R1·R5 예외 줄이 들어갔는지, 고를 수 있는 전략이 비어 있지 않은지 본다. 안 되면 멈추고 보고. 건조 폴더 삭제.

[D. 생성 — API]
11. PASSAGE=surface-tension MODE=B KIND_V1=experiment KIND_V2=experiment OUT_NAME=out-cell3e RULES_V=6
    run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs. 로그 $V5/out-cell3e-surface-tension-B.log. 결함(정답 유일성 문제)으로 끝난 문항만 한 번 다시 만든다(OUT_NAME=out-cell3e-regen, ONLY + KEEP_OUT=out-cell3e). 또 결함이면 기록만.
    기록: 문항별 형식 점검 결과, 방식 위반과 수리 여부(새 규칙으로 수리가 돌았는지), 수리 전후 〈보기〉·선지 차이 요약.

[E. 블라인드 2회 — 과금 없음, WORKING-RULES 4-3]
12. $SP/cell3/exp/blind/: 생성 B-V1·B-V2 + 기출 표면 장력 16번(참고) + 자격 기출 플라스틱 10번(calib-judge 가공 그대로) = 4문항. 지문이 둘이라 BLIND에 각각 붙이고 문항마다 어느 지문인지 적는다. 출처 표시 없음. 요청문·결함 목록은 ③ 칸 CODEX-PROMPT 그대로(문항 수만 맞춤). 점검: 문항 수 4, KEY 정답이 최종본과 같음.
13. 순서만 바꿔 2회(seed 20261221, 20261222), 회차마다 평가자 4명, 새 임시 폴더, 병렬.

[F. 집계·보고]
14. $SP/cell3/exp/aggregate.py → aggregate-out.md: 문항별 회차별 등급·평균, 실험 칸 평균(생성 2문항, 회차별·두 회차), 생성 문항별 '수능 아님' 횟수(두 회차 합), 자격 기출 플라스틱 10번 회차별 평균(1.5 미만이면 그 회차 '멈춤'), 표면 장력 기출 16번 평균(참고), 결함 표시(㉮~㉴) 수, 생성 문항 strategies·방식 위반·수리 여부.
15. 보고서 $SP/REPORT-cell3e-experiment.md(측정만, 판정 이름 없음)와 -human.md(쉬운 말). 실제 비용(단계별).

[G. 기록·커밋]
16. memory/CURRENT_STATE.md: "순서표 ①·② 끝, ③-1 끝(" 부터 그 줄 끝까지를 다음으로 바꾼다(없으면 멈추고 보고):
    "순서표 ①·② 끝, ③-1 끝(과학 그래프 통과, 과학 사례 미달 확정), ③-2 실험 칸 시험 중(kind-experiment-v6, 표면 장력 B형). 칸 판정 기준 = docs/handoffs/WORKING-RULES.md 4-3. 수리 기준 v6.3 = 방식 위반 하나여도 수리(view 제외)."
17. 커밋 전 확인: node --test classify-v6.test.mjs 통과, grep "R1 예외\|예외: 실험 갈래" rules-common-v6.md 2곳, kind-experiment-v6.md 있음. 아니면 커밋하지 않고 보고.
18. 커밋(오답 카드 4파일 제외, 먼저 목록을 보여 준다): $SP/CLI-cell3e-experiment-v6.md, $SP/REVIEW-cell3-r2-web.md, $SP/PROGRESS-hard.md, $SP/REVIEW-rules-2026-11-24-experiment.md, $V5/kind-experiment-v6.md, $V5/rules-common-v6.md, $V5/run.mjs, $V5/classify-v6.mjs, $V5/classify-v6.test.mjs, (고쳤다면 eval-repair·leak-fix), $V5/passages/surface-tension/, $V5/calib-gold/surface-tension-16.json, $V5/out-cell3e/(와 -regen), 새 로그, $SP/cell3/exp/, $SP/REPORT-cell3e-experiment*.md, memory/CURRENT_STATE.md.
    메시지 예: "③-2: 실험 갈래 v6 채택(R1·R5 예외), 방식 위반 하나여도 수리, 표면 장력 B형 생성 + 블라인드 2회"
    git push origin experiment/problem-solving-mvp (force 금지).
19. 보고하고 멈춘다: 수소 저장 대조 결과, 테스트 결과, 건조 실행 확인, 고를 수 있는 전략 목록, 등급표(문항 × 회차 × 4명), 실험 칸 평균, '수능 아님' 횟수, 자격 기출 회차별 평균, 수리 여부, 실제 비용, 커밋 해시, 푸시 결과, git status --short | wc -l. PROGRESS-hard 실험 행은 웹 판정 뒤에 고친다.

추정 비용: 지도 약 $0.35 + B형 2문항 생성 약 $0.8 + 수리(새 기준이라 돌 가능성 큼) 약 $0.4~0.8 + 노출 수리 약 $0.06 = 약 $1.6~2.0. 상한 $2.5. 블라인드는 codex라 과금 없음.
최소 실행 검토: 기출이 B형뿐이라 A형은 만들지 않는다. 지문 하나, 2문항, 자격 기출 1개.
```

## 설명

- **목적:** 실험 〈보기〉 규칙을 정식 규칙으로 넣고, 생성기가 실험 갈래를 만들 수 있게 하고, 표면 장력 지문으로 B형 두 문항을 만들어 수능 같은지 본다.
- **수리 기준 변경:** 지금까지는 검사기가 방식 위반을 둘 이상 찾아야 수리했다. 이제 하나만 찾아도 수리한다(관점 갈래만 빼고). 앞으로 모든 칸에 적용된다.
- **판정:** 4-3 그대로. 칸 평균 ≥1.5 통과, 1.0~1.5 거의, 문항별 '수능 아님' 두 회차 합 2 이상이면 미달, 자격 기출(플라스틱 10번)이 1.5 밑이면 그 회차 멈춤.
- **커밋 시점:** 이 지시문 끝에서 규칙·코드·결과를 한 번에 커밋·푸시한다.
