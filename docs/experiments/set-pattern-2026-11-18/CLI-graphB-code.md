# CLI 지시문: 그래프 1차 — graphPlan 칸·서버 확인 + 그리기 도구 (웹 2026-11-25 15시 50분 KST, API 비용 없음)

결정: Ghootae 15:45 "오케이" = `REVIEW-graph-census-web.md` 4절의 1(그래프 1차만)·2(kind-graph 문안 추천안). 근거: `SP/graph-census/SUMMARY.md`·`HAND-TEST.md`, `SP/PROPOSAL-graph-relation-shape.md`.

```
그래프 1차(CLI-graphB-code.md): run.mjs에 graphPlan 칸과 서버 확인, render.mjs에 기준선·기호 눈금·교점 자동 표시·이름 배치·단위 버그, kind-graph-v6 문안. API 호출 금지.

0. 지킬 것
   - API(OpenAI) 호출 금지. codex도 부르지 않는다.
   - v5 경로(RULES_V가 6이 아닐 때)의 동작과 프롬프트는 바이트 그대로 둔다. graphPlan은 RULES_V=6 + KIND=graph에서만.
   - 기존 graphSpec(points 형식)은 그대로 받는다. 새 필드가 없으면 SVG·읽기 판 출력이 지금과 바이트 동일해야 한다(단위 버그 수정 줄은 예외, 아래 2-e).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지.
   - ④ 1단계(CLI-o4a, passage-gen-v3.2-2026-11-21/out-o4*) 파일은 건드리지 않는다.
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18.

1. 전제 확인(어긋나면 멈추고 보고): $SP/REVIEW-graph-census-web.md 에 "3-1. 그래프 1차" 1곳. $SP/graph-census/hand/ 에 s1~s4 *.spec.json 4개.
   회귀 기준 만들기: 고치기 전에 아래 명세 9개를 지금 render.mjs로 그려 $SP/graph-census/regress-before/ 에 svg·txt 저장.
   - $V5/graph/doppler-12.spec.json
   - ②·③ 생성 그래프 명세 4개(out-cell2-v62/tax-incidence-excise-*/items.json, out-cell3-v62/auxin-growth-*/items.json 의 graphSpec; 찾은 경로를 보고에 적음)
   - $SP/graph-census/hand/s1~s4 *.spec.json

2. render.mjs (graph/render.mjs). 모두 선택 필드, 없으면 지금과 같게.
   a. 기호 눈금: yAxis.ticks = [{"at":값,"label":"P₁"}] (xAxis.ticks와 같은 방식). 그림·읽기 판에는 label만.
   b. 기준선 guides = [{"dir":"h|v","at":값 또는 {"series":"id","point":"표시 기호|peak|trough|start|end"},"label":"P₁"|null,"to":"axis|series id"|null}].
      - dir h = 수평 점선, v = 수직 점선. at이 점 참조면 서버가 그 점의 좌표를 쓴다(같은 x·y 정렬을 손 계산 없이).
      - to가 없으면 그림 끝까지, "axis"면 축에서 그 점까지, series id면 그 계열과 만나는 곳까지.
      - label이 있으면 축 쪽 끝에 기호로 찍고 읽기 판에 "P₁ 높이의 수평 기준선"처럼 적는다(판정어 금지, validateSpec 판정어 검사에 label도 넣음).
   c. 교점 자동 표시: crossMarks = [{"a":"id","b":"id","label":"E"|null}] 또는 true(모든 교점). analyze의 cross 결과 위치에 점을 찍고, label이 있으면 기호를 붙인다. 읽기 판의 교점 줄에 그 기호를 쓴다.
   d. 곡선 이름 배치: 끝점이 겹치거나(같은 끝점·12px 안) 오른쪽 여백을 넘으면 위치를 옮기거나 지시선을 단다. 이름 전체를 찍는다(첫 낱말만 찍지 않음, 범례로 보내던 동작은 그대로 두되 그림의 이름은 잘리지 않게). 선 모양(실선·점선)을 범례에 작은 선으로 보인다.
   e. 버그: 가로 눈금 label 뒤에 xAxis.unit이 붙어 "M₁M", "t₁t"가 되는 곳(readingText의 marks 이름·tk)을 고친다. 눈금 label만 쓰고, 단위는 축 이름 줄에만. 이 수정으로 바뀌는 회귀 줄은 보고에 목록으로 적는다.
   f. validateSpec: 새 필드 검증(at 참조가 실제 표시 기호·계열인지, dir 값, label 판정어). 오류 문구는 지금 형식과 같게.
   - 하지 않는 것(그래프 2차로 미룸): shape에서 점 계산, 점 계열(선 없는 점), 격자, 선 굵기, 계열 사이 색칠.

3. run.mjs (RULES_V=6, KIND=graph일 때만)
   a. 3단계 출력 지시(250행 근처 '갈래가 graph인 항목은 …')에 한 문장 추가: graphSpec보다 먼저 "graphPlan" 객체를 넣는다(형식은 kind-graph-v6).
   b. graphPlan 형식:
      {"focus":"문항 주제 한 줄",
       "variables":{"x":"가로축 변수","y":"세로축 변수","others":["계열을 가르는 조건 변수"]},
       "relation":[{"quote":"지문 문장 그대로","para":문단 번호}],          // 1~2개
       "graphType":"관계 평면|시간·위치 진행|그 밖(말로)",
       "series":[{"id":"graphSpec의 계열 id","shape":"모양 성질을 말로","shapeFrom":"지문|보기"}],
       "why":"이 변수에 이 종류가 맞는 까닭 한 줄"}
   c. 서버 확인(342행 근처 graph 검사 블록에 더함. c.push로 '그래프 계획 오류: …'):
      - graphPlan이 없음
      - xAxis.label이 variables.x를, yAxis.label이 variables.y를 포함하지 않음(공백·괄호·단위 떼고 비교)
      - relation이 0개 또는 3개 이상, 또는 quote가 지문에 그대로 없음(공백 정리 후 부분 문자열)
      - graphPlan.series의 id 집합 ≠ graphSpec.series의 id 집합
      - shapeFrom이 "지문|보기"가 아님
      - 결과를 항목에 it.graphPlanCheck = {ok, errs} 로도 남긴다.
   d. 3b·3c(다듬기·교정) 지시의 '(그래프 갈래) graphSpec과 bogi는 고치지 않고 그대로 옮긴다'에 graphPlan도 넣는다. 299행 근처에서 graphPlan도 3단계 것으로 덮어쓴다.
   e. eval-repair.mjs·leak-fix.mjs가 graphSpec을 다루는 곳이 있으면 graphPlan도 함께 보존되는지 확인(고칠 것이 있으면 최소로 고치고 보고).

4. kind-graph-v6.md: '## 형식: graphSpec' 앞에 아래 절을 그대로 넣는다(웹 결정 문안). '## 형식: graphSpec'의 코드 블록에는 yAxis.ticks·guides·crossMarks 예를 한 줄씩 더하고, 설명 줄을 더한다(2-a~c 내용 그대로, 판정어 금지 포함).

   ## 먼저 쓰는 것: graphPlan (2026-11-25)
   그래프를 쓰기 전에 graphPlan을 먼저 쓴다. 축은 지문이 관계를 말한 두 양이다. 계열의 모양은 지문의 관계 말(방향, 변화 빠르기, 최댓값·최솟값, 어떤 값에 가까워짐, 다른 계열과의 만남·순서)에서 옮긴다. 지문이 모양을 정하지 않았으면 그 모양은 〈보기〉가 주는 측정 결과이고(shapeFrom "보기") 판정에 쓰지 않는다. 기준선·교점은 선지가 부르는 곳에만 둔다.
   - 형식: (3-b의 graphPlan 형식을 그대로 붙인다)
   - 참고 후보(강제 아님, 기출 집계 2026-11-25): 시간에 따라 변하는 양은 시간·위치 진행형이 흔하다. 조건값에 따른 반응은 관계 평면에서 봉우리 모양이 흔하다. 가격·수량은 관계 평면에서 직선의 교점과 기준선이 흔하다. 기출 그래프는 대개 눈금 숫자 대신 기호(P₁, t₁ 등)로 위치를 말한다.
   - 점검 질문: 축 이름이 graphPlan의 두 변수인가? 인용한 문장이 지문에 그대로 있는가? 계열마다 모양의 근거가 지문인지 〈보기〉인지 적었는가?

   반영 뒤 grep 확인: "## 먼저 쓰는 것: graphPlan (2026-11-25)" 1곳, "shapeFrom" 2곳 이상.

5. 시험
   a. 회귀: 1의 명세 9개를 새 render.mjs로 다시 그려 $SP/graph-census/regress-after/ 에 저장, before와 diff. 2-e 단위 버그 줄 말고 차이가 0이어야 한다. 차이가 있으면 멈추고 보고.
   b. 새 도구: hand/s3-monopoly(독점)에 yAxis.ticks P₁·P₂, guides(교점 a에서 세로축까지 수평선, Q₁·Q₂ 수직선을 점 참조로), crossMarks를 써서 새 명세 s3-monopoly-v2.spec.json, hand/s1-auxin(옥신)에 yAxis.ticks +·0·−, M₁·M₂ 수직선을 점 참조로 써서 s1-auxin-v2.spec.json 을 만들어 그리고 PNG로 본다. 기출 이미지(HAND-TEST 2절 경로)와 나란히 비교해 남은 차이를 적는다.
   c. graph/render.test.mjs(새 파일): 2-a~f 각각 최소 1개 시험 + 회귀 9개 바이트 동일(단위 줄 예외 처리).
   d. run.mjs 서버 확인 시험: graphPlan 검사 함수를 분리해 시험 파일에서 부른다(축 불일치, 인용 없음, 계열 id 불일치, 정상 각 1건). DRY_RUN=1 으로 RULES_V=6 KIND_V1=graph 경로가 프롬프트에 graphPlan 문장을 넣는지 확인(API 호출 없이). RULES_V 미지정 경로 프롬프트는 바이트 동일 확인.
   e. 기존 시험: node $V5/classify-v6.test.mjs 통과.

6. 보고서 $SP/REPORT-graphB-code.md: 바꾼 함수·줄 요약, 회귀 결과(단위 줄 목록), 새 도구 그림 비교(s1·s3 v2, 남은 차이), 시험 결과, kind-graph grep 결과, eval-repair·leak-fix 확인 결과.

7. 커밋(목록을 먼저 보여 준다): render.mjs, render.test.mjs, run.mjs(+분리한 검사 모듈·시험), kind-graph-v6.md, $SP/graph-census/ 전체(.omc 제외), $SP/PROPOSAL-graph-relation-shape.md, $SP/PROPOSAL-graph-market-template.md, $SP/REVIEW-graph-census-web.md, $SP/CLI-graphA-census.md, $SP/CLI-graphB-code.md, $SP/REPORT-graphB-code.md.
   ④ 계획 파일(PLAN-o4-generated-L3b.md, CLI-o4a-passages.md, G32/commissions/T4·T5.md, out-o4*)과 docs/handoffs/WORKING-RULES.md는 이 커밋에 넣지 않는다(④ 마무리 때).
   메시지 예: "그래프 1차: graphPlan 칸·서버 확인, 기준선·기호 눈금·교점 표시, 기출 그래프 집계"
   git push origin experiment/problem-solving-mvp (force 금지).
8. 보고: git log -1 --oneline, 푸시 결과, 시험 통과 수, git status --short | wc -l.

추정 비용: API 비용 없음(코드·문서·로컬 렌더만).
최소 실행 검토: 생성 실행은 하지 않는다. 실제 시험은 ④ 2단계의 경제 V2(graph) 문항으로 한다.
```

## 설명

- **목적:** 그래프 문항이 엉뚱한 축을 잡지 않게 하고(graphPlan + 서버 확인), 기출에 자주 나오는 기준선·교점·기호 눈금을 그릴 수 있게 한다.
- **방법:** 생성기(run.mjs)가 그래프를 쓰기 전에 계획 칸을 먼저 쓰게 하고, 서버가 축 이름과 인용 문장을 확인한다. 렌더러(render.mjs)에 새 도구를 넣되, 기존 그래프는 그대로 그려지는지 9개로 확인한다. 기출 두 그래프(독점, 옥신)를 새 도구로 다시 그려 얼마나 가까워졌는지 본다.
- **다음 스텝:** 커밋까지 끝나면 ④ 1단계(지문 생성) 결과를 기다려 2단계 지시문에 경제 V2(graph) 시험을 넣는다.
- **커밋:** 코드가 바뀌므로 이번엔 따로 커밋한다(웹이 고친 파일이 덮어써지는 일을 막으려고). ④ 계획 파일과 WORKING-RULES는 ④ 마무리 때 커밋한다.
