# CLI 지시문: 그래프 읽기 판 끝점 버그 수리 + 가격 상한제 B형 그래프 1회 재생성 + 블라인드 2회 (웹 2026-11-25 20시 40분 KST, 추정 약 $0.6, 상한 $2)

근거: `REVIEW-graphC-web.md`(그래프 첫 실전 검토). 칸 평균 1.31 = 4-3 '거의 통과' → 그 칸 1회 재생성. B형 점수를 깎은 읽기 판 불일치("병: ⓔ → ⓑ")는 render.mjs `readingText`의 `label` 함수가 다른 계열의 표시 기호를 집어 오는 버그다.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $2)과 커밋·푸시의 승인이다.

```
그래프 D(CLI-graphD-fix-regen.md): readingText 끝점 이름 버그 수리 + 옛 B 다시 그리기 + B형 V2 1회 재생성 + 블라인드 2회.

0. 지킬 것
   - 고치는 코드는 V5/graph/render.mjs(와 render.test.mjs)뿐. run.mjs·eval-repair·leak-fix·plan-check·kind-*·규칙 파일은 고치지 않는다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지.
   - ④ 산출물(out-o4, $SP/o4/, gold-o4)과 out-graphC는 읽기만 한다. ④ 다른 단계가 같은 시각에 돌면 커밋은 한쪽이 끝난 뒤에.
   - 생성 gpt-6.2-sol, RULES_V=6, 수리 v6.3, dispute-fix 안 돌림. 판정 codex gpt-6.1-sol.
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/graphD/.

1. 전제 확인(어긋나면 멈추고 보고): git log에 6a6e237e(그래프 첫 실전). $SP/REVIEW-graphC-web.md 있음. node $V5/graph/render.test.mjs 39/39.

[A. 렌더러 수리 — API 비용 없음]
2. render.mjs readingText의 label(p):
   - 그 점에 mark가 있으면 mark.
   - 없으면 같은 가로 위치의 '자기 계열' 표시만 이름으로 쓴다. 다른 계열의 표시만 있으면 "끝(ⓑ와 같은 가로 위치)"처럼 쓴다(analyze의 where가 이미 하는 방식과 같게). 가로축 기호 눈금이 있으면 지금처럼 그 눈금 이름.
   - 이 밖의 동작은 바꾸지 않는다.
3. validateSpec 경고 하나 추가: 계열 끝점(첫 점·마지막 점)에 mark가 없고, 그 y값이 yAxis.values에도 없고 yAxis.ticks에도 없으면 "끝점 높이를 읽을 수 없음: <계열 이름> (x, y)". 경고만, 그리기는 그대로.
4. 시험: render.test.mjs에 2·3 각각 시험 1개 이상(graphC B의 graphSpec을 그대로 써도 됨). 회귀 9개(regress-after 기준) + graphC A·B를 다시 그려 바뀐 줄 목록을 보고서에 적는다. 2의 수리와 관계없는 줄이 바뀌면 멈추고 보고.
5. 옛 B(out-graphC/gen32-o4-T5-1-B 최종본)를 새 render로 다시 그려 $SP/graphD/png/oldB-V2.{svg,txt,png}. 읽기 판에서 "병" 줄이 어떻게 바뀌었는지 적는다.

[B. B형 V2 1회 재생성 — API]
6. PASSAGE=gen32-o4-T5-1 MODE=B KIND_V1=table KIND_V2=graph ONLY=V2 KEEP_OUT=out-graphC OUT_NAME=out-graphD RULES_V=6 node $V5/run.mjs > $V5/out-graphD-B.log 2>&1
   → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). graphC와 같은 명령 형식.
   (KEEP_OUT=out-graphC: 같은 지문의 A형·옛 B형 함정을 피하게. ONLY+KEEP_OUT가 그 폴더 구조에서 안 되면 건조 실행으로 먼저 확인하고, 안 되면 멈추고 보고.)
7. $SP/graphD/PLAN-CHECK.md: graphC 3절과 같은 항목(graphPlan 원문, 3단계·최종 graphPlanCheck, 수리 뒤 변경, PNG를 보고 shape 말과 그림, 표시 도구, 렌더 결함, 3의 새 경고). 덧붙여 두 가지를 관찰로 적는다(판정·수정 없음):
   a. 인용한 relation 문장이 모양(방향·만남·최댓값 등)을 직접 말하는가, 아니면 정의만 말하고 모양은 〈보기〉 수치에서 나왔는가(그런데 shapeFrom이 '지문'인가).
   b. 이 그래프를 같은 내용의 표로 바꾸면 잃는 것이 있는가(계열이 점 두 개짜리 직선뿐인가).
   명세 오류·정답 유일성 문제로 끝나도 다시 만들지 않는다(4-3: 재생성 1회, 결과와 상관없이 기록).

[C. 블라인드 — 과금 없음, WORKING-RULES 4-3]
8. $SP/graphD/blind/: A-V2(graphC 최종본, 새 render로 다시 그린 그림·읽기 판), 옛 B-V2(5의 고친 읽기 판), 새 B-V2(6) + 자격 기출 플라스틱 10·오디오 17 + 참고 조세 귀착 12 = 6문항. graphC make_blind.py 방식, 요청문·결함 목록 그대로(문항 수만 6). 점검: 문항 수, KEY = 최종본, 출처 표기 grep 0, 이미지가 폴더 안.
9. 순서만 바꿔 2회(seed 20261271, 20261272), 회차마다 평가자 4명, 새 임시 폴더, 병렬.

[D. 집계·보고]
10. $SP/graphD/aggregate.py → aggregate-out.md:
   - 문항별 회차별 등급·평균, '수능 아님' 횟수.
   - 칸 평균 = A-V2 + 새 B-V2(두 회차). 참고 칸 평균 = A-V2 + 옛 B(고친 판). graphC 칸 평균 1.31과 나란히.
   - 자격 기출 회차별(하나라도 1.5 미만이면 그 회차 멈춤), 조세 12는 참고.
   - 평가 이유를 그림·읽기 판 탓 / 문항 탓 / 긍정으로 나눈 표(문항별). 옛 B는 graphC 때와 비교.
11. 보고서 $SP/REPORT-graphD.md(측정만, 판정 이름 없음)와 -human.md(쉬운 말). 실제 비용(usage.json 합산).

[E. 커밋]
12. 커밋(목록을 먼저 보여 준다): $V5/graph/render.mjs, $V5/graph/render.test.mjs, $SP/REVIEW-graphC-web.md, $SP/CLI-graphD-fix-regen.md, $SP/graphD/, $SP/REPORT-graphD*.md, $V5/out-graphD/, $V5/out-graphD-B.log. 회귀 기준 파일을 바꿨으면 그것도(무엇을 왜 바꿨는지 보고서에).
    메시지 예: "그래프 D: 읽기 판 끝점 이름 버그 수리, 가격 상한제 B형 그래프 재생성 + 블라인드 2회"
    git push origin experiment/problem-solving-mvp (force 금지).
13. 보고하고 멈춘다: 시험 통과 수, 회귀 바뀐 줄 목록, 옛 B 읽기 판 변화, 새 B graphPlanCheck·7a·7b, 등급표(문항 × 회차 × 4명), 칸 평균·참고 칸 평균, 자격 기출 회차별, 이유 표, 실제 비용, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정은 웹이 한다.

추정 비용: 새 B 1문항 생성 약 $0.4 + 수리 판정 약 $0.1 + 노출 수리 약 $0.03 = 약 $0.55. 수리가 실제로 돌면 +$0.8. 상한 $2. 렌더러 수리·블라인드는 비용 없음.
최소 실행 검토: A형은 이미 1.75라 다시 만들지 않는다. 4-3은 칸 재생성을 말하지만 낮은 쪽(B)만 다시 만든다. 옛 B는 다시 만들지 않고 고친 읽기 판으로 다시 평가만 한다(무료).
```

## 설명

- **목적:** 두 가지를 가른다. B형 점수(0.88)가 렌더러 버그 때문이었는지, 문항 자체 때문이었는지. 그리고 규칙(4-3)대로 B형을 한 번 다시 만들어 칸을 기록한다.
- **방법:** 읽기 판이 다른 선의 기호(ⓑ)를 끝점 이름으로 잘못 가져오는 버그를 고친다. 옛 B를 고친 판으로 다시 평가하고(무료), 새 B를 하나 만들어 같은 블라인드에 넣는다.
- **다음 스텝:** 칸 평균(A + 새 B)이 1.5 이상이면 사회 그래프 L3 통과로 적고 그래프 작업을 닫는다. 낮으면 이유가 문항 설계(정의만 인용, 표로 바꿔도 같은 그래프)인지 보고, 그렇다면 kind-graph 점검 질문 후보를 Ghootae에게 올린다. 좌표·교점 결함이 없으면 그래프 2차는 하지 않는다.
- **커밋:** render.mjs가 바뀌므로 이 지시문에서 CLI가 커밋·푸시한다.
