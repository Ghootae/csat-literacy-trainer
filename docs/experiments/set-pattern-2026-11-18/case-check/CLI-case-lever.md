# CLI 지시문: 사례 갈래 '갈림 사실' 순서(CASE_FLOW=lever) + 도덕적 운 사례 칸 재생성 시험 (웹 2026-11-26 02시대 KST)

근거: $CC/PLAN-case-lever.md (이 폴더). 결정: Ghootae 2026-11-26 02:04 KST "추천대로"(생성 조립 단계 검토).
**추정 비용: 약 $1.3 (상한 $3).** ④ 실측 ONLY=V2 1회 약 $0.48(생성 0.36 + 수리검사 0.10 + 노출 수리 0.02) × 2, 여기에 3-assemble 재호출과 출력 증가분을 더했다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정, API 실행(상한 $3), 커밋·푸시의 승인이다.

```
사례 갈림 사실 순서 시험(CLI-case-lever.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일($SP/graph*, $V5/graph/, $V5/out-graph*)은 건드리지 않고 커밋에 넣지 않는다. checkout·stash·restore 금지, force push 금지.
   - 공통·갈래·전략 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)은 고치지 않는다. 고치는 코드는 run.mjs, classify-v6.mjs, classify-v6.test.mjs뿐이다.
   - git log -1이 bdedeff5 이후인지 적는다. $CC/PLAN-case-lever.md가 있는지 확인하고, 없으면 멈추고 보고한다.

1. 코드 (API 비용 없음)
   a. run.mjs: CASE_FLOW=lever이고 RULES_V=6일 때만 켠다. 없으면 지금 동작과 한 글자도 다르지 않게 한다.
      - 3-assemble 지시(ASSEMBLE_A_V6·ASSEMBLE_B_V6) 끝에, 갈래가 case인 버전이 있을 때만 아래 블록을 붙인다(~~~ 안 문구 그대로).
      - JSON 예시에 principleCards·leverTable·choiceLevers 칸을 더한다(사례 버전만).
      - 3단계 JSON의 leverTable·principleCards·choiceLevers를 버전별로 보관한다(graphSpecs처럼). 3b·3c·최종 items.json의 같은 버전 항목에 다시 붙인다.
   b. classify-v6.mjs에 checkLeversV6(item) 추가. item.stem에 '적절하지 않은'이 있으면 부정 발문으로 본다. 반환은 {errors:[], warnings:[]}.
      - 비교용 정규화: 공백·줄바꿈을 하나로 줄이고, 앞뒤 따옴표·마크다운 기호를 지운다. fact가 〈보기〉의 부분 문자열이면 '있음'으로 본다.
      - L1(오류): leverTable 각 fact가 bogi에 있다.
      - L2(경고): bogi를 문장(. ? ! 및 줄바꿈)으로 나눈다. 10자 이상인 문장마다, 그 문장을 포함하거나 그 문장에 포함되는 fact가 하나 이상 있다.
      - L3(오류): choiceLevers가 5개이고 선지마다 facts가 1개 이상, 모두 leverTable의 fact와 같다(정규화 후).
      - L4(오류): 결정 선지(부정 발문: 정답 / 긍정 발문: 정답 아닌 4개)마다 misread가 비어 있지 않다. 긍정 발문이면 오답 4개의 facts 합집합이 3개 이상이다.
      - L5(경고): principleCards가 2개 이상이다.
   c. run.mjs: 3-assemble 직후 사례 버전마다 checkLeversV6를 부른다.
      - 오류가 있으면, 같은 지시에 "[서버 확인 오류]" 목록을 덧붙여 3-assemble-r 단계로 한 번만 다시 부르고 그 JSON을 쓴다.
      - 그래도 오류면 기록하고 진행한다.
      - 4-solve 뒤 최종 항목에 L1만 다시 본다. 결과(처음·재호출·최종)를 OUT/lever-check.json에 쓴다.
   d. classify-v6.test.mjs 시험 6개: L1 통과/실패, L3 facts 없음 → 오류, 부정 발문 정답 misread 없음 → 오류, 긍정 발문 오답 facts 2개뿐 → 오류, L2 안 쓰인 문장 → 경고만. 전체 통과(옛 시험 포함).
   e. 머리 주석 한 줄: "v6.6 CASE_FLOW=lever (2026-11-26, case-check/PLAN-case-lever.md)".
   f. 건조 실행:
      RULES_V=6 CASE_FLOW=lever DRY_RUN=1 PASSAGE=gen32-o4-T4-1 MODE=A KIND_V1=view KIND_V2=case ONLY=V2 KEEP_OUT=out-o4-regen OUT_NAME=out-case-lever-dry
      3-assemble.dry.txt에 블록이 들어갔는지 확인한다. CASE_FLOW 없이 한 번 더 돌려 블록이 없는지도 확인한다. 끝나면 건조 폴더를 지운다.

2. 비용 추산: out-o4-regen/gen32-o4-T4-1-B/usage.json(ONLY=V2 1회)을 근거로 두 번 + 재호출 1회 가정. 상한 $3을 넘을 것 같으면 멈추고 보고한다.

3. 생성 (API). A를 먼저, B를 나중에. 로그는 $V5/out-case-lever-gen32-o4-T4-1-<A|B>.log. o4c 때처럼 zsh에서는 export 방식으로 넘긴다.
   - A: RULES_V=6 CASE_FLOW=lever PASSAGE=gen32-o4-T4-1 MODE=A KIND_V1=view KIND_V2=case ONLY=V2 KEEP_OUT=out-o4-regen OUT_NAME=out-case-lever
   - B: RULES_V=6 CASE_FLOW=lever PASSAGE=gen32-o4-T4-1 MODE=B KIND_V1=view KIND_V2=case ONLY=V2 KEEP_OUT=out-o4 AVOID_OUT=out-case-lever OUT_NAME=out-case-lever
   각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, OUT_DIR=…/repair) → 수리됐거나 노출 수리 대상이면 leak-fix.mjs(OUT_DIR=…/leakfix). 지도는 gold-o4 재사용. 재생성은 1회뿐: 결함이어도 다시 만들지 않고 기록만 한다.
   기록:
   - 문항별 lever-check(처음·재호출·최종), 수리 여부, 발문 되돌림, 결함 표시.
   - principleCards와 leverTable 전문.
   - 선지별 facts·misread를 표로.
   - 옛 판(out-o4-regen 최종)과 새 판의 〈보기〉·선지를 나란히.

4. 블라인드 $CC/blind-lever/ (codex gpt-6.1-sol, 0원). 요청문·결함 목록은 $SP/o4/blind-T4 CODEX-PROMPT 그대로.
   - 문항 5개:
     - 새 A-V2, 새 B-V2 (out-case-lever 최종)
     - 옛 A-V2, 옛 B-V2 (out-o4-regen/…/leakfix/items-leakfix.json의 V2)
     - 자격 기출 공손룡 12번
   - 평가자 4명 × 3회(seed 20261281·82·83), 순서는 회차마다 섞는다.
   - 점검: 문항 수, KEY 정답, 출처 표기 grep 0, 지문 ㉮·㉯ 표시가 풀이지에 남았는지.

5. 집계 $CC/aggregate-lever.md:
   - 문항별 회차별 등급·평균
   - 칸 평균: 새 판(A-V2·B-V2) / 옛 판 / 차이. 회차별과 3회 합 모두.
   - 자격 기출 회차별(1.5 미만이면 멈춤 회차 표시)
   - ㉯·㉲ 수(새·옛)
   - 평가 이유를 묶어 센다: '정답이 지문 한 문장', '오답이 지문 원칙만으로 지워짐', '〈보기〉 꼼꼼히 읽기만 묻는다·너무 쉬움', '정답 시비', 기타
   - 결정 선지 원문(새·옛)을 한 표로. 웹 손 분류용이고, 분류는 하지 않는다.

6. 보고서 $CC/REPORT-case-lever.md(측정만)와 -human.md(5~8줄). 실제 비용(usage.json 합, 입력 $2/M·출력 $10/M).

7. 커밋(목록 먼저): run.mjs, classify-v6.mjs, classify-v6.test.mjs, $V5/out-case-lever/, 새 로그, $CC/blind-lever/, $CC/aggregate-lever.md, $CC/REPORT-case-lever*.md, $CC/PLAN-case-lever.md, 이 지시문.
   메시지: "사례 갈래 갈림 사실 순서(CASE_FLOW=lever) + 도덕적 운 사례 칸 재생성 시험". push(force 금지).

8. 보고하고 멈춘다: 시험 결과, 건조 확인, 비용 추산·실제, lever-check 표, 칸 평균(새·옛·차이, 회차별), 자격 기출, ㉯·㉲, 평가 이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 판정은 웹이 한다.
```

## 3-assemble에 붙일 블록 (CASE_FLOW=lever, 사례 버전만)

~~~
[사례 갈래 출제 순서 — 갈래가 사례(case)인 버전은 위 출제 과정 1·2단계 대신 아래 가~라를 따른다. 0·3·4·5단계와 출력 형식은 그대로다.]
가. 원리 카드: 지문에서 판정 원리 2~4개를 고른다. 카드마다 원리(지문 문장 원문 인용), 판정자(누가 판정하는가), 갈림 변수(사례의 어떤 사실이 달라지면 판정이 바뀌는가)를 적는다. 갈림 변수가 없는 원리(개념 정의만 있는 것)는 고르지 않는다. 재료 B·S의 거짓 진술은 어느 구역에서 원리를 고를지 참고로만 쓰고, 선지로 옮기지 않는다.
나. 〈보기〉와 갈림 사실 표: 〈보기〉를 먼저 쓴다. 원리 카드마다 그 갈림 변수의 값을 정하는 사실 문장을 〈보기〉에 넣는다. 표의 한 줄은 〈보기〉 문장 원문, 변수 값, 판정자별 판정이다. 〈보기〉의 모든 문장은 표의 어느 줄에 쓰인다. 같은 말이나 비슷한 사실인데 값이 다른 짝(대충 읽으면 섞이는 짝)을 하나 이상 둔다.
다. 선지: 선지마다 표의 한 줄(또는 두 줄)을 쓴다. 원리 부분은 지문대로 맞게 쓴다. 거짓 선지는 그 줄의 사실 값을 잘못 읽은 결론으로 만들고, 잘못 읽는 쪽은 나.의 헷갈리는 짝에서 고른다. 엉뚱하게 틀리게 하지 않는다.
라. 정답: 마지막에 고른다. 발문이 '적절하지 않은'이면, 헷갈리는 짝에서 나온 거짓이나 표의 두 줄을 함께 읽어야 하는 거짓을 먼저 정답으로 고른다. 발문이 '가장 적절한'이면, 거짓 4개가 서로 다른 줄을 잘못 읽게 한다.
JSON의 사례 항목에 덧붙인다: "principleCards":[{"principle":"지문 원문","judge":"판정자","lever":"갈림 변수"}], "leverTable":[{"fact":"〈보기〉 문장 원문 그대로","value":"변수 값","verdicts":{"판정자":"판정"}}], "choiceLevers":[{"n":1,"facts":["leverTable의 fact 원문"],"misread":"거짓이면 잘못 읽은 값, 참이면 null","corrected":"거짓이면 사실을 바로 읽어 고친 선지, 참이면 null"}] (선지 5개 모두).
~~~

## 설명 (쉬운 말)

- **무엇을:** 사례 문항만 만드는 순서를 바꿉니다. 지금은 거짓 문장을 지문에서 먼저 만들고 〈보기〉를 나중에 입힙니다. 바꾼 뒤에는 이렇게 만듭니다.
  1. 판정 원리를 고릅니다.
  2. 〈보기〉에 판정을 가르는 사실을 심습니다.
  3. 오답은 그 사실을 잘못 읽은 결론으로 만듭니다.
- **어떻게 지키게 하나:** 모델이 오답마다 "어느 〈보기〉 문장을 잘못 읽었는지"를 인용하게 합니다. 서버는 그 문장이 〈보기〉에 정말 있는지 기계로 확인합니다. 어기면 한 번 다시 만들게 합니다. 규칙 파일은 고치지 않고, CASE_FLOW=lever를 켤 때만 작동합니다.
- **시험:** 도덕적 운 사례 두 문항만 새로 만듭니다. 옛 판과 새 판을 같은 블라인드에 넣어 평가자 4명이 3회 봅니다. 3회로 늘린 이유는 같은 문항도 칸 평균이 ±0.4 흔들린다는 것을 이번에 확인했기 때문입니다. codex라 0원입니다.
- **판정:** 새 판 칸 평균이 1.5 이상이고 옛 판보다 0.5 이상 높으면 통과입니다. 그러면 공손룡·고체 촉매 사례 칸에도 넓힙니다.
