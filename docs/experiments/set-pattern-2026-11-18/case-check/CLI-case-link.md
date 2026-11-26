# CLI 지시문: 결합 선지 탐색(LINK_SEARCH=1, 2판) — 청약 철회 A형에 시험 (웹 2026-11-26 22시대 KST)

결정: Ghootae 2026-11-26 21:56 KST 제안(원리 하나로 끝내지 말고 고리 숙고 → 연결 원리 추가), 21:57 "지시문 만들어봐". 22:12 코덱스 검토 회신(Mac $CC/REPORT-link-strategy-review-desktop.md)을 반영해 2판으로 고쳤다.

1판에서 바뀐 것 (코덱스 검토 반영):
- **"고리 4개" 기준을 뺐다.** 모델이 고리를 몇 개로 셀지 판별할 단위가 없다. 대신 **결합 선지**를 쓰게 한다. 핵심 선지(정답 또는 가장 그럴듯한 경쟁 선지) 하나와, 그 선지를 판단할 때 학생이 함께 써야 하는 〈보기〉 사실 두 개를 정한다. 그리고 사실 하나씩만 바꾼 판정표로 두 사실이 각각 필요한지 확인한다.
- **"같은 사건"만으로는 부족하다.** 1판 예시(물통 덮개를 부러뜨림)는 기간을 맞게 읽든 틀리게 읽든 결론이 같았다(한 원리가 다른 원리의 쓸모를 없앰). 판정표가 이것을 걸러 낸다.
- **〈보기〉가 판정을 미리 끝내지 않는다.** 지난 청약은 "통신판매로", "일반 철회 기간이 남아 있을 때"라고 적어 학생이 할 판단을 없앴다. 판정 이름 대신 근거 사실(누가 어디서 권유했는지, 며칠째인지)만 적는다.
- **"한 당사자" 대신 "하나로 이어진 사건"으로 쓴다.** 도덕적 운처럼 당사자가 둘이어도 된다.
- **짝은 기본 1개다.** 둘째 짝은 이미 있는 사실로 헷갈리지만 참인 선지가 나올 때만 쓴다.
- **핵심 선지 초안 둘을 쓰고 판정표가 더 분명한 쪽을 고른다.** 한 번의 호출 안에서 하므로 비용이 늘지 않는다.
- **정답 전제 기록:** 글자 일치만 보지 않는다. 생성 직후, 다듬기 뒤, 최종본에서 거짓 전제가 명시·암시·소실 중 무엇인지 실제 구절과 함께 기록한다(codex, 0원). 자동 되돌림은 이번에 넣지 않는다.
- **결론 문구:** 평균만 보지 않는다. 문항마다 결합 선지가 실제로 살아 있는지(사실을 가리면 못 푸는지) 확인해 "재현됨 / 한 번만 구현 / 효과 없음"으로 나눈다.

남은 한계: 이 시험은 결합 선지 탐색, 한 사건 지시, 판정 라벨 금지를 한꺼번에 바꾼다. 통과해도 셋 중 무엇이 필요했는지는 열린 질문으로 남는다. 통과하면 그때 쪼개 본다.

**추정 비용: 약 $1.6 (상한 $3).** 생성 2회(청약 V1 두 번), 지난 pair3 실측이 지문당 약 $0.67~0.76. 블라인드·결합 점검·전제 기록은 codex라 0원. 대조군은 기존 문항 재사용이라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $3)과 커밋·푸시의 승인이다.

```
결합 선지 탐색 시험 2판(CLI-case-link.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일, 읽기 습관 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log에 17880bea와 7227da4f가 있는지 적는다. $CC/REVIEW-A-plan-moral-vs-cheongyak.md, $CC/CODEX-QUERY-link-strategy.md, $CC/REPORT-link-strategy-review-*.md가 있는지 적는다(없어도 진행).

1. 코드 (API 비용 없음). LINK_SEARCH를 주지 않으면 지금 동작이 한 글자도 바뀌지 않는다.
   a. run.mjs: LINK_SEARCH=1은 RULES_V=6, CASE_FLOW=premise, PAIR_CARD=3과 함께일 때만 켠다(아니면 오류로 멈춤). 켜지면 CASE_BLOCK에서
      (1) "가. 원리 카드:" 문단 끝에 아래 문장을 덧붙인다(문구 그대로).
      "원리 카드를 고른 뒤 결합 점검을 한다. 핵심 선지(정답 또는 가장 그럴듯한 오답 후보) 하나를 정하고, 학생이 그 선지를 판단할 때 함께 써야 하는 〈보기〉 사실 두 개(factA, factB)를 정한다. 앞 판단의 답이 뒤 판단에 쓰이는 관계(예: 권유·신청 과정으로 거래 유형을 가린 뒤 그 유형의 기간을 적용)가 가장 좋다. 그리고 판정표를 쓴다: 원래 사례의 판정, factA 하나만 바꾼 사례의 판정, factB 하나만 바꾼 사례의 판정. 두 변경 판정은 모두 원래 판정과 달라야 한다. 한 사실이 다른 사실의 쓸모를 없애면(어느 쪽으로 읽어도 결론이 같으면) 그 조합은 버린다. 원리 하나로 이런 조합이 나오면 2차 원리를 더하지 않는다. 안 나오면 지문의 다른 문단에서 같은 사건에 걸리는 2차 원리를 더한다. 핵심 선지 초안을 둘 쓰고, 판정표가 더 분명한 쪽을 고른다."
      (2) "나. 〈보기〉와 갈림 사실 표:" 문단 끝(짝 카드 문단 뒤)에 덧붙인다.
      "〈보기〉는 하나로 이어진 사건으로 쓴다(당사자는 둘 이상이어도 된다). 선지 재료를 채우려고 서로 관계없는 거래·사건·물건을 나열하지 않는다. 〈보기〉는 학생이 내려야 할 판정(지문의 유형 이름, '기간이 남아 있을 때' 같은 결론)을 미리 적지 않고, 판정의 근거가 되는 사실(누가 어디서 무엇을 했는지, 며칠째인지)만 적는다. 짝 카드는 기본 1개이고 role은 'answer'다. 이미 있는 사실로 헷갈리지만 분명히 참인 선지가 나올 때만 둘째 짝을 두고 role을 'true'로 적는다."
      (3) JSON 안내에 아래를 더하고, pairCards 항목에 "role":"answer|true"를 더한다.
      "linkPlan":{"coreChoice":3,"factA":"〈보기〉 문장 원문","factB":"〈보기〉 문장 원문","verdictOriginal":"원래 판정","changeA":"factA만 바꾼 사실","verdictA":"그때 판정","changeB":"factB만 바꾼 사실","verdictB":"그때 판정","secondary":"C2 또는 null","draftsTried":2,"why":"고른 초안과 2차 원리를 더했거나 안 더한 이유 한 줄"}
      머리 주석 한 줄: "v6.12 (2026-11-26) LINK_SEARCH=1: 결합 선지 탐색(판정표) + 이어진 사건 〈보기〉 + 판정 라벨 금지 + 짝 role(시험용). case-check/CLI-case-link.md".
   b. classify-v6.mjs: opts.link === true이면 L9a~h에 더해
      - L10a(오류): linkPlan이 있고 factA·factB가 각각 leverTable의 fact 하나와 같다(글자 일치 또는 Dice ≥ 0.8), 둘은 서로 다른 줄이다.
      - L10b(오류): verdictA와 verdictB가 비어 있지 않고, 각각 verdictOriginal과 같은 글자가 아니다.
      - L10c(오류): coreChoice는 1~5이고, 그 선지의 choiceLevers.facts에 factA와 factB가 모두 들어 있다.
      - L10d(오류): pairCards는 1~2개, 'answer' 정확히 1개, 2개이면 나머지는 'true'.
      - L10e(경고만): 〈보기〉 글자 수가 450자를 넘으면 경고.
      시험을 더한다: 17880bea의 청약 pair3 항목(linkPlan 없음)은 L10a에 걸려야 한다. factA로 바꿔도 판정이 같은 가짜 항목은 L10b에 걸려야 한다. classify-v6 시험이 전체 통과하는지 확인한다.
   c. 기록용(판정 아님): lever-check.json에 버전마다 bogiChars(〈보기〉 글자 수), 그리고 정답 선지 문장을 세 시점(3-assemble 직후, 3c 다듬기 뒤, 최종본)으로 저장한다.
   d. 건조 실행 한 번(끝나면 건조 폴더 지움):
      RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 LINK_SEARCH=1 DRY_RUN=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-link-dry → 덧붙인 두 문장, linkPlan·role 안내, "[재료 없음]"이 있어야 한다. LINK_SEARCH 없이 같은 명령의 지시문이 17880bea와 글자 하나 다르지 않은지도 비교해 적는다.
   e. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API) 2회, 청약만. 로그 $V5/out-case-link<n>-gen32-T3-2-A.log. 각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, CASE_FLOW=premise 그대로) → 필요하면 leak-fix.mjs. 결함이 나와도 기록만 한다.
   - 1회: RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 LINK_SEARCH=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-link1
   - 2회: 같은 명령, OUT_NAME=out-case-link2
   기록 $CC/link-record.md (문항 2개): linkPlan(판정표 전체), principleCards, pairCards(role·decider 포함), leverTable, 선지별 premise·premiseTrue·verdict·misread, lever-check(처음·재호출·최종, L8·L9·L10), bogiChars, 정답 선지 세 시점 문장, 수리 여부·수리 가드 되돌림·결함, 최종 〈보기〉·선지·정답. 그리고 아래 대조 문항들의 〈보기〉·선지·정답을 나란히 둔다.

3. 블라인드 $CC/blind-link/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind11.py를 고쳐 make_blind12.py로 쓴다)
   - 문항 8개(지문 4개):
     · 새 청약 A-V1 ×2 (out-case-link1, out-case-link2 최종)
     · 옛 청약 A-V1 ×2: out-cell5/gen32-T3-2-A V1 최종, out-case-lever5-old 최종
     · A안 청약 A-V1 (out-case-pair3/gen32-T3-2-A 최종, 지난번 0.75)
     · 기준점 A안 도덕적 운 A-V2 (out-case-pair3/gen32-o4-T4-1-A 최종, 지난번 1.83), 판정에는 안 쓴다
     · 자격 기출 공시 12번, 공손룡 12번
   - 평가자 4명 × 3회(seed 20261371·72·73), 순서는 회차마다 섞는다. 점검: 문항 수, KEY, 출처 표기 0, 결함 표시 문항이 섞이지 않았는지.

4. 결합·전제 점검 (codex gpt-6.1-sol, 0원, 블라인드와 따로, 새 청약 두 문항만). 요청문은 $CC/link-check/PROMPT.md로 새로 쓰고 결과는 $CC/link-check/에 둔다. 평가자 2명.
   a. 결합 살아 있음: 최종본에서 linkPlan의 factA 문장을 〈보기〉에서 지운 판, factB 문장을 지운 판을 각각 주고 "coreChoice 선지의 정오를 정할 수 있는가(예/아니요), 정할 수 있다면 근거"를 묻는다. 두 판 모두 '아니요'(2명 다)면 "결합 살아 있음".
   b. 가장 짧은 풀이: 최종본 전체를 주고 "정답을 고르는 가장 짧은 풀이를 한두 문장으로, 그때 쓴 〈보기〉 문장"을 적게 한다.
   c. 정답 전제 상태: 정답 선지의 세 시점 문장 각각에 대해 "거짓 전제(〈보기〉 사실을 잘못 읽은 부분)가 명시 / 암시 / 소실 중 무엇인가, 해당 구절"을 적게 한다. 문자 유사도는 참고로 같이 적는다.

5. 집계 $CC/aggregate-link.md (aggregate_pair3.py를 고쳐 aggregate_link.py로 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표), ㉯·㉱·㉲·㉳ 수, 이유 묶음(사건 나열, 얕음·단순 대응, 정답 시비), bogiChars, 4번 점검 결과(결합 살아 있음, 가장 짧은 풀이, 전제 상태).
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 두 문항이 각각 3회 합 평균 ≥ 1.5.
     · 새 평균 = 새 청약 두 문항 평균, 옛 평균 = 옛 청약 두 문항 평균(같은 블라인드 값), A안 = pair3 청약(같은 블라인드 값).
     · 점수 통과: 새 평균 ≥ 옛 평균 AND 새 평균 − A안 ≥ +0.5 AND 새 두 문항의 ㉱ 합 < 8/24 AND 새 문항 각각 ㉳ < 4/12.
     · "효과 없음": 새 평균 − A안 < +0.3 OR 새 두 문항의 ㉱ 합 ≥ 12/24.
     · 종합:
       - 점수 통과 + 두 문항 모두 "결합 살아 있음" → "재현됨 → 원인 쪼개기(한 사건 지시만 넣은 조건)와 다른 지문 확인 후보"
       - 점수 통과 + 한 문항만 "결합 살아 있음" → "한 번 구현, 재현 보류"
       - 점수 통과 + 둘 다 아님 → "점수는 올랐으나 결합 미확인(보류)"
       - 효과 없음 → "채택 안 함"
       - 그 밖 → "보류(사람 검토)"
   - 회차별로도 점수 판정을 적는다.

6. 보고서 $CC/REPORT-case-link.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

7. 커밋(목록 먼저): $V5/run.mjs, $V5/classify-v6.mjs, 시험 파일, $V5/out-case-link1/, $V5/out-case-link2/, 새 로그, $CC/blind-link/, $CC/link-check/, $CC/link-record.md, $CC/aggregate-link.md, $CC/aggregate_link.py, $CC/make_blind12.py, $CC/REPORT-case-link*.md, $CC/REVIEW-A-plan-moral-vs-cheongyak.md·$CC/CODEX-QUERY-link-strategy.md·$CC/REPORT-link-strategy-review-*.md(있으면), 이 지시문.
   메시지: "결합 선지 탐색(LINK_SEARCH=1) 시험: 청약 A형 2회 + 코덱스 전략 검토". push(force 금지).

8. 보고하고 멈춘다: 시험 결과(L10a·L10b가 가짜 항목을 잡았는지 포함), 건조 실행과 끈 상태 비교, 비용, linkPlan 판정표, pairCards(role), lever-check·L8~L10 표, bogiChars, 4번 점검(결합·가장 짧은 풀이·전제 상태 세 시점), 문항별 평균, 미리 정한 판정(유효·점수·종합)과 회차별 판정, ㉱·㉳ 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** Ghootae 님의 "원리 하나로 끝내지 말자"는 생각을 코덱스 검토에 맞춰 다듬었습니다. 원리를 몇 개 넣었는지 세지 않습니다. 대신 **핵심 선지 하나가 〈보기〉 사실 두 개를 함께 써야만 풀리는지** 확인합니다. 확인 방법은 판정표입니다. 원래 사례, 사실 A만 바꾼 사례, 사실 B만 바꾼 사례의 판정이 서로 달라야 합니다.
  - 청약 예시: 길에서 권유받고 매장으로 이끌려 신청(유인 방문판매, 14일), 상자 덮개만 찢음(포장), 열흘째 철회 통지 → 가능.
  - 신청만 온라인으로 바꾸면 통신판매 7일이 지나 불가능합니다.
  - 찢은 것만 기능 부품으로 바꾸면 물품 훼손이라 불가능합니다.
  - 두 사실이 각각 필요합니다.
- **〈보기〉는:** 하나로 이어진 사건으로 쓰고, "통신판매로" 같은 판정 이름을 미리 적지 않습니다.
- **어떻게:** 청약 A형을 두 번 새로 만들고, 옛 청약 두 개, 지난 A안(0.75), 기출 두 개와 같은 블라인드로 비교합니다. 따로 codex(무료)로 두 가지를 확인합니다. 하나는 사실 하나를 지우면 정말 못 푸는지, 다른 하나는 정답의 "~이므로" 전제가 어느 단계에서 사라지는지입니다.
- **판정:** 점수가 오르고 두 문항 모두 결합이 살아 있으면 "재현됨"입니다. 한 문항만 살아 있으면 "한 번 구현, 재현 보류"입니다.
- **한계:** 세 가지를 한꺼번에 바꾸므로, 통과해도 무엇이 효과를 냈는지는 다음 시험에서 쪼개 봐야 합니다.
