# CLI 지시문: A안(짝 카드 3판 = 맥락 확정 사실) — 옛 A형 점수가 낮았던 두 사례에 적용 (웹 2026-11-26 16시대 KST)

결정: Ghootae 2026-11-26 16:18 KST "높은 점수를 잘 받는 예시 말고, 낮은 점수를 받은 사례의 점수가 올라가는지를 보는 것이 유용하지 않을까? A안으로 하되, 다른 사례에 적용해 보는 건 어떨까?"

웹 검토:
- 공손룡 옛 A는 1.92~2.00이라 천장이다. 새 방식은 같거나 낮게만 나올 수 있어 "올리는 힘"을 볼 수 없다.
- 그래서 옛 순서 A형이 낮았던 생성 지문 두 개에 적용한다.
  - 도덕적 운(gen32-o4-T4-1) 사례 A-V2: 옛 판이 블라인드마다 0.25, 0.83, 1.25였다.
  - 청약 철회(gen32-T3-2) A-V1: 옛 판이 1.08, 1.33이었다.
- 두 지문 모두 B형이 1.67~1.75라 지문 탓은 아니다.
- 낮은 점수는 운도 섞인다(평균으로 돌아감). 그래서 옛 판을 같은 블라인드에 두 개씩 다시 넣어 같은 조건에서 비교한다.
- 이 시험이 답하는 질문: "옛 순서 A형이 낮게 나왔을 때 A안으로 다시 만들면 오르는가"(보완 경로). 공손룡에서 내려간 결과(1.17)가 있으므로 기본값 후보는 아니다.

**추정 비용: 약 $1.6 (상한 $3).** 생성 2회이고, 짝 카드 2판 실측이 $0.76이었다. 옛 판 대조군은 이미 있는 문항을 다시 쓰므로 0원이다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $3)과 커밋·푸시의 승인이다.

```
A안 시험(CLI-case-pair3.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일, 읽기 습관 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log에 7f1da2e8이 있는지 적는다.

1. 코드 (API 비용 없음). PAIR_CARD=1·2 동작과 기본 동작은 한 글자도 바꾸지 않는다.
   a. run.mjs PAIR_CARD=3: 2판 문단 끝에 아래 문장을 덧붙이고, JSON 카드에 "decider"를 더한다(문구 그대로).
      "짝의 같은 말이 어느 쪽인지는 〈보기〉의 사실 하나(decider)로 한 가지로만 정해져야 한다. decider를 빼고 읽으면 두 쪽 모두 가능하고, decider를 읽으면 한 쪽만 남는다. decider는 행동의 결과나 당사자의 말처럼 〈보기〉에 분명히 적힌 사실이고, 학생이 짐작해야 하는 의도가 아니다."
      JSON: "pairCards":[{"name":"…","word":"…","decider":"〈보기〉 문장 원문","quote":"…","sideA":"…","sideB":"…","card":"C1"}]
      머리 주석 한 줄: "v6.11 (2026-11-26) PAIR_CARD=3: 짝 카드 decider(맥락 확정 사실)(시험용). case-check/CLI-case-pair3.md".
   b. classify-v6.mjs: opts.pairCard === 3이면 L9a~g에 더해
      - L9h(오류): 카드마다 decider가 비어 있지 않고, leverTable의 fact 하나와 같다(글자 일치 또는 Dice ≥ 0.8).
      시험을 더한다: 7f1da2e8의 2판 항목(decider 없음)은 L9h에 걸려야 한다. classify-v6 시험이 전체 통과하는지 확인한다.
   c. eval-repair.mjs 수리 가드 넓히기: 지금 가드(CASE_FLOW=premise, 수리가 정답을 가정형으로 바꾸거나 정답 번호를 바꾸면 되돌림)에 하나를 더한다. 수리 뒤 〈보기〉에 식별 기호·표식(/[◇◆○●△▲□■☆★]|표식|일련번호/)이 새로 생기면 되돌린다. 시험을 더한다.
   d. 건조 실행 두 번(끝나면 건조 폴더 지움):
      - RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 DRY_RUN=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-pair3-dry → 덧붙인 문장과 decider 안내, "[재료 없음]"이 있어야 한다.
      - RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 DRY_RUN=1 PASSAGE=gen32-o4-T4-1 MODE=A KIND_V1=view KIND_V2=case ONLY=V2 KEEP_OUT=out-o4-regen OUT_NAME=out-case-pair3-dry → 같은 블록이 V2(사례)에만 붙어야 한다.
   e. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API) 2회. 로그 $V5/out-case-pair3-<지문>-A.log. 각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, CASE_FLOW=premise 그대로) → 필요하면 leak-fix.mjs. 결함이 나와도 기록만 한다.
   - 청약: RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-pair3
   - 도덕적 운: RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 PASSAGE=gen32-o4-T4-1 MODE=A KIND_V1=view KIND_V2=case ONLY=V2 KEEP_OUT=out-o4-regen OUT_NAME=out-case-pair3
   기록 $CC/pair3-record.md (문항 2개): lever-check(처음·재호출·최종, L8·L9), pairCards(decider 포함), leverTable, 선지별 premise·premiseTrue·verdict·misread, 수리 여부·수리 가드 되돌림·결함, 최종 〈보기〉·선지·정답, 그리고 아래 옛 판들의 〈보기〉·선지·정답을 나란히.

3. 블라인드 $CC/blind-pair3/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind10.py를 고쳐 쓴다)
   - 문항 9개(지문 4개):
     · A안 청약 A-V1 (out-case-pair3 최종)
     · 옛 청약 A-V1 ×2: out-cell5/gen32-T3-2-A V1 최종, out-case-lever5-old 최종
     · A안 도덕적 운 A-V2 (out-case-pair3 최종)
     · 옛 도덕적 운 A-V2 ×2: out-o4/gen32-o4-T4-1-A V2 최종, out-o4-regen/gen32-o4-T4-1-A V2 최종 (같은 문항이면 하나만 넣고 보고에 적는다)
     · 참고 lever 보완 도덕적 운 A-V2 (out-case-lever2 최종, 지난번 1.42), 판정에는 안 쓴다
     · 자격 기출 공시 12번, 공손룡 12번
   - 평가자 4명 × 3회(seed 20261361·62·63), 순서는 회차마다 섞는다. 점검: 문항 수, KEY, 출처 표기 0, 결함 표시 문항이 섞이지 않았는지.

4. 집계 $CC/aggregate-pair3.md (aggregate_pair2.py를 고쳐 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표), ㉯·㉲·㉳, 이유 묶음(위치·순서 추적, 얕음·단순 대응, 정답 시비)
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 두 문항이 각각 3회 합 평균 ≥ 1.5.
     · 지문별: 옛 평균 = 옛 판 두 개(또는 하나)의 평균. A안 − 옛 평균 ≥ +0.5 → "A안 나음", ≤ −0.5 → "옛 나음", 그 사이 → "차이 없음". A안의 ㉳가 4/12 이상이면 판정 옆에 "정답 시비 남음"을 붙인다.
     · 종합: 두 지문 모두 "A안 나음"이고 "정답 시비 남음"이 없으면 → "A형 보완 경로 채택 후보(옛 순서 A가 낮을 때 A안으로 다시 만들기)". 한 지문이라도 "옛 나음"이면 → "채택 안 함(A형은 옛 순서로 닫음)". 그 밖 → "보류".
   - 회차별로도 지문별 판정을 적는다.

5. 보고서 $CC/REPORT-case-pair3.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

6. 커밋(목록 먼저): $V5/run.mjs, $V5/eval-repair.mjs, $V5/classify-v6.mjs, 시험 파일, $V5/out-case-pair3/, 새 로그, $CC/blind-pair3/, $CC/pair3-record.md, $CC/aggregate-pair3.md, $CC/aggregate_pair3.py, $CC/make_blind11.py, $CC/REPORT-case-pair3*.md, 이 지시문.
   메시지: "A안(짝 카드 3판 decider) 시험: 옛 A형이 낮았던 청약·도덕적 운". push(force 금지).

7. 보고하고 멈춘다: 시험 결과(L9h가 2판 항목을 잡았는지 포함), 건조 두 개, 비용, lever-check·L8·L9 표, pairCards, 수리 가드 작동 여부, 문항별 평균, 미리 정한 판정(유효·지문별·종합)과 회차별 판정, 이유 묶음 수, ㉯·㉲·㉳, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 지난 짝 카드에 "맥락을 하나로 정하는 〈보기〉 사실(decider)"을 더한 A안을 만듭니다. 이것을 옛 순서 A형 점수가 낮았던 두 생성 지문(도덕적 운, 청약 철회)에 적용합니다.
- **왜 낮은 사례에서:** 공손룡 옛 판은 이미 2.0이라, 새 방식이 아무리 좋아도 "올랐다"는 것을 보일 수 없었습니다. 낮은 사례라야 오르는지 볼 수 있습니다.
- **조심할 점:** 낮게 나온 문항은 운이 나빴던 것일 수도 있습니다. 다시 평가하면 저절로 오를 수 있습니다. 그래서 옛 판들도 같은 블라인드에 다시 넣어 같은 조건에서 비교합니다(추가 비용 없음).
- **이 시험으로 정할 것:** "옛 순서 A형이 낮게 나오면 A안으로 다시 만든다"는 보완 경로를 둘지 정합니다. 공손룡에서 내려간 결과가 있어서 기본값으로는 쓰지 않습니다.
- **판정은 미리 정해 둡니다:**
  - 두 지문 모두 옛 판 평균보다 0.5 이상 오르고 정답 시비가 4/12 미만이면 "보완 경로 채택 후보"입니다.
  - 한 지문이라도 0.5 이상 내려가면 A형은 옛 순서로 닫습니다.
