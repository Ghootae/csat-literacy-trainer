# CLI 지시문: 결합 선지 탐색 3판(LINK_SEARCH=2) — 두 원리 결합을 실제로 시험 (웹 2026-11-26 23시대 KST)

결정: Ghootae 2026-11-26 23:41 KST 카드 "고쳐서 한 번 더".

지난 시험(d808e038, LINK_SEARCH=1)의 실패 원인과, 이번에 고치는 것:

| 원인 | 이번 수정 |
|---|---|
| 두 번 모두 2차 원리를 안 넣었다(secondary=null). "두 원리를 엮은 선지가 더 좋은가"는 측정되지 않았다. | **시험 조건에서만 2차 원리 의무.** factA·factB는 서로 다른 원리 카드에서 나온다. 결합 형태는 둘 중 하나: (가) 앞 판단의 답이 뒤 판단에 쓰임, (나) 결론 하나에 두 요건이 모두 필요함. 자연스러운 조합을 못 찾으면 "후보 없음"으로 멈추는 것도 유효한 출력이다. |
| 판정표가 "누가 깼나"처럼 뻔한 사실로도 통과됐다. | factA·factB마다 **lure**(학생이 처음 잘못 읽을 이유)와 **fix**(그 판단을 고치게 하는 구절)를 적는다. lure가 빈 사실은 안 된다. |
| 짝의 참 쪽에 근거가 없어 정답 시비가 났다(link1 ①, 9/12표). | 짝 카드에 **deciderA·deciderB**를 둔다. 위치가 아니라 정체(무엇의 일부인가, 무엇을 하는가)를 알려 주는 〈보기〉 문장이어야 한다. 한 문장이 양쪽을 가르면 같은 문장을 써도 된다. |
| 정답 "~이므로" 전제가 마지막 M2 수리에서 지워졌다(네 문항 모두). | **M2는 유지한다.** 다만 수리가 정답 선지의 전제를 지우면 그 수리를 되돌린다. 대신 codex(0원)로 "〈보기〉만으로 완결되는 반박 한 문장"을 써 보게 해서, 지문 규칙이 꼭 필요한지(=지름길이 없는지) 기록한다. |
| link2 〈보기〉 첫 문장에 "방문판매로"가 들어갔다. | 생성이 **labels**(학생이 추론해야 할 판정 이름 목록)를 내고, 서버가 〈보기〉에 그 말이 있으면 오류로 재호출한다. 최종본에서도 확인해 기록한다. |

참고: 코덱스 회신2는 "(2) A형 닫기"를 권했고, 웹도 그 뒤 닫기를 권했다. Ghootae가 한 번 더를 골랐으므로 이번이 이 경로의 마지막 시험이다. 결과가 기준에 못 미치면 A형은 옛 순서로 닫는다.

**추정 비용: 약 $1.6 (상한 $3).** 생성 2회(청약 V1 두 번, 지난 link 실측 $1.41/2회). 3-assemble-r 재호출이 늘 수 있어 상한을 둔다. 블라인드·codex 점검은 0원, 대조군은 재사용이라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $3)과 커밋·푸시의 승인이다.

```
결합 선지 탐색 3판(CLI-case-link2.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일, 읽기 습관 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log에 d808e038과 7d1ec483이 있는지 적는다.

1. 코드 (API 비용 없음). LINK_SEARCH=2를 주지 않으면 지금 동작(LINK_SEARCH 없음, =1)이 한 글자도 바뀌지 않는다.
   a. run.mjs: LINK_SEARCH=2는 =1과 같은 조건(RULES_V=6, CASE_FLOW=premise, PAIR_CARD=3)에서만 켠다. 켜지면 LINK_L1·LINK_L2 대신 아래 두 문장을 같은 자리에 넣는다(문구 그대로). JSON 안내도 아래로 바꾼다.
      L1(가. 끝): "원리 카드를 고른 뒤 결합 점검을 한다. 서로 다른 원리 카드 두 장(지문의 서로 다른 문단에서 나온 원리)을 고르고, 핵심 선지(정답 또는 가장 그럴듯한 오답 후보) 하나가 두 원리를 함께 써야 판단되게 한다. 결합 형태는 둘 중 하나다. (가) 앞 원리로 내린 판단의 답이 뒤 원리의 판단에 쓰인다(예: 권유·신청 과정으로 거래 유형을 가린 뒤 그 유형의 기간을 적용). (나) 결론 하나에 두 원리의 요건이 모두 필요하다(예: 기간 안이고 포장만 훼손해야 철회 가능). factA는 첫째 원리, factB는 둘째 원리의 갈림 사실이다. 판정표를 쓴다: 원래 판정, factA만 바꾼 판정, factB만 바꾼 판정. 두 변경 판정은 모두 원래 판정과 달라야 한다. factA·factB마다 학생이 처음에 잘못 읽을 이유(lure)와 그 판단을 고치게 하는 구절(fix, 지문 또는 〈보기〉 원문)을 적는다. 주어 확인만으로 끝나는 사실(누가 했는가가 문장에 그대로 적힘)은 lure가 없으므로 쓰지 않는다. 핵심 선지 초안을 둘 쓰고 더 분명한 쪽을 고른다. 두 원리가 같은 사건에서 자연스럽게 만나는 조합을 찾지 못하면 억지로 만들지 말고 linkPlan.status를 'none'으로 적는다."
      L2(나. 끝): "〈보기〉는 하나로 이어진 사건으로 쓴다(당사자는 둘 이상이어도 된다). 선지 재료를 채우려고 서로 관계없는 거래·사건·물건을 나열하지 않는다. 학생이 추론해야 할 판정 이름(지문의 유형 이름, '기간 안', '포장' 같은 분류 결과)을 labels에 적고, 〈보기〉에는 그 말을 쓰지 않는다. 판정의 근거가 되는 사실(누가 어디서 무엇을 했는지, 며칠째인지, 그 물건이 무엇을 하는지)만 적는다. 짝 카드는 기본 1개이고 role은 'answer'다. 짝의 두 쪽은 각각 정체를 알려 주는 〈보기〉 문장(deciderA, deciderB)으로 정해진다. 위치(어디에 붙어 있었다)만으로는 정체가 정해지지 않는다. 한 문장이 양쪽을 가르면 같은 문장을 써도 된다."
      JSON: "linkPlan":{"status":"ok|none","cardA":"C1","cardB":"C2","form":"가|나","coreChoice":3,"factA":"〈보기〉 원문","factB":"〈보기〉 원문","verdictOriginal":"…","changeA":"…","verdictA":"…","changeB":"…","verdictB":"…","lureA":"…","fixA":"원문","lureB":"…","fixB":"원문","draftsTried":2,"why":"…"}, "labels":["판정 이름",…], pairCards 항목에는 "deciderA":"〈보기〉 원문","deciderB":"〈보기〉 원문","role":"answer|true" (decider 키는 그대로 두고 deciderA와 같은 값).
      status가 'none'이면 그 버전은 생성을 멈추고 기록만 남긴다(eval-repair 건너뜀).
      머리 주석 한 줄: "v6.13 (2026-11-26) LINK_SEARCH=2: 두 원리 결합 의무(시험용) + lure/fix + 짝 양쪽 decider + labels 서버 검사 + 전제 보존 가드. case-check/CLI-case-link2.md".
   b. classify-v6.mjs: opts.link === 2이면 L10a~e(cardA·cardB 무관하게 그대로)에 더해
      - L11a(오류): status가 'ok'이고, cardA ≠ cardB이며 둘 다 principleCards에 있다.
      - L11b(오류): lureA·fixA·lureB·fixB가 모두 비어 있지 않다. fixA·fixB는 지문 또는 〈보기〉에 글자 일치 또는 Dice ≥ 0.8로 있다.
      - L11c(오류): pairCards마다 deciderA·deciderB가 비어 있지 않고 각각 leverTable의 fact 하나와 같다(Dice ≥ 0.8).
      - L11d(오류): labels가 1개 이상이고, labels의 어느 말도 〈보기〉에 나오지 않는다(공백 무시 부분 문자열).
      시험을 더한다: d808e038의 link1 항목은 L11a에 걸려야 한다. 〈보기〉에 labels 말이 든 가짜 항목은 L11d에 걸려야 한다. classify-v6 시험 전체 통과를 확인한다.
      run.mjs의 첫 검사(L 오류 → 3-assemble-r 1회 재호출)에 L11도 포함한다.
   c. eval-repair.mjs 수리 가드(CASE_FLOW=premise 가드 옆, LINK_SEARCH=2일 때만): 수리 전 정답 선지에 그 선지 choiceLevers.premise가 글자 일치 또는 Dice ≥ 0.6으로 있었는데 수리 뒤 없어지면 수리를 되돌린다. 되돌린 사실과 남은 M2를 기록한다(결함 아님).
   d. 기록용: lever-check.json에 버전마다 labelsInFinalBogi(최종 〈보기〉에 labels 말이 있는지와 그 말), 정답 선지 세 시점 문장(3-assemble 직후, 3c 뒤, 최종)을 저장한다.
   e. 건조 실행 한 번(끝나면 건조 폴더 지움): RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 LINK_SEARCH=2 DRY_RUN=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-link3-dry → 새 두 문장, JSON 안내가 있어야 한다. LINK_SEARCH=1로 같은 명령의 지시문이 d808e038과 글자 하나 다르지 않은지도 비교해 적는다.
   f. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API) 2회, 청약만. 로그 $V5/out-case-link3-<n>-gen32-T3-2-A.log. 각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, CASE_FLOW=premise, LINK_SEARCH=2 그대로) → 필요하면 leak-fix.mjs. 결함이 나와도 기록만 한다. status='none'이 나오면 그 회차는 다시 돌리지 않고 기록한다.
   - 1회: RULES_V=6 CASE_FLOW=premise PAIR_CARD=3 LINK_SEARCH=2 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-link3a
   - 2회: 같은 명령, OUT_NAME=out-case-link3b
   기록 $CC/link3-record.md: linkPlan 전체(status·cardA·cardB·form·판정표·lure/fix), labels, principleCards, pairCards(deciderA·B), leverTable, 선지별 premise·verdict·misread, lever-check(처음·재호출·최종, L8~L11), labelsInFinalBogi, 정답 선지 세 시점, 수리 여부·수리 가드 되돌림(전제 보존 포함)·남은 M2·결함, 최종 〈보기〉·선지·정답.

3. 블라인드 $CC/blind-link3/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind12.py를 고쳐 make_blind13.py)
   - 문항 9개: 새 link3a·link3b, 지난 link1·link2, 옛 청약 out-cell5·lever5-old, A안 청약 pair3, 자격 기출 공시 12번·공손룡 12번. (status='none'이면 그 문항은 빼고 적는다.)
   - 평가자 4명 × 3회(seed 20261391·92·93), 순서는 회차마다 섞는다. 점검: 문항 수, KEY, 출처 표기 0.

4. codex 점검 (0원, 새 문항만, 평가자 2명, $CC/link3-check/)
   a. 가장 짧은 풀이: 정답을 고르는 가장 짧은 풀이와, 거기에 쓴 지문 규칙 수(1 또는 2 이상).
   b. 반박 한 문장: 정답 선지를 〈보기〉만으로 반박하는 가장 짧은 문장, 지문 규칙이 꼭 필요한가(needsPassage).
   c. 참 선지 근거(S3): 정답이 아닌 선지마다 〈보기〉 사실로 판정이 하나로 정해지는가. 가정("~였다면")으로 반대 해석을 만드는 것은 안 된다. 〈보기〉에 적힌 말이 두 뜻으로 읽힐 때만 false.

5. 집계 $CC/aggregate-link3.md (aggregate_link.py를 고쳐 aggregate_link3.py)
   - 문항별 회차별 등급·평균, ㉯·㉱·㉲·㉳, 이유 묶음(사건 나열, 얕음·단순, 정답 시비), 4번 점검.
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 두 문항이 각각 3회 합 평균 ≥ 1.5.
     · 새 평균 = link3a·b 평균, 옛 평균 = out-cell5·lever5-old 평균, 지난 평균 = link1·link2 평균 (모두 이번 블라인드 값).
     · 결합 실현: 새 문항 각각 linkPlan.status='ok' AND 4a 규칙 수 ≥ 2(평가자 2명 중 1명 이상).
     · 효과 있음: 새 평균 ≥ 옛 평균 AND 새 평균 − 지난 평균 ≥ +0.4 AND 새 문항 각각 ㉳ < 4/12 AND 새 ㉱ 합 < 8/24.
     · 종합:
       - 효과 있음 + 두 문항 결합 실현 → "두 원리 결합 유효 → 다른 지문 1개로 재현 확인 후보"
       - 효과 있음 + 한 문항만 결합 실현 → "한 번 구현, 재현 보류"
       - 효과 있음이 아님 → "채택 안 함 → A형은 옛 순서로 닫음"
     · status='none'이 나온 회차가 있으면 종합 옆에 "결합 후보 없음 n회"를 적는다(두 회 모두 none이면 "이 지문에서 두 원리 결합 불가 → A형은 옛 순서로 닫음").
   - 회차별 점수 판정도 적는다.

6. 보고서 $CC/REPORT-case-link3.md(측정만) + -human.md(5~8줄). 실제 비용.

7. 커밋(목록 먼저): $V5/run.mjs, $V5/classify-v6.mjs, $V5/eval-repair.mjs, 시험 파일, $V5/out-case-link3a/, $V5/out-case-link3b/, 새 로그, $CC/blind-link3/, $CC/link3-check/, $CC/link3-record.md, $CC/aggregate-link3.md, $CC/aggregate_link3.py, $CC/make_blind13.py, $CC/REPORT-case-link3*.md, $CC/CODEX-QUERY-link-result.md·$CC/REPORT-link-result-review-*.md(있으면), 이 지시문.
   메시지: "결합 선지 탐색 3판(LINK_SEARCH=2) 시험: 두 원리 결합 의무·짝 양쪽 decider·라벨 검사·전제 보존". push(force 금지).

8. 보고하고 멈춘다: 시험 결과(L11a·L11d가 가짜 항목을 잡았는지), 건조 실행과 =1 상태 비교, 비용, linkPlan(status·cardA·cardB·form·lure/fix), labels와 최종 〈보기〉 라벨 여부, deciderA·B, lever-check·L8~L11 표, 수리 가드(전제 보존) 작동 여부, 정답 선지 세 시점, 4번 점검, 문항별 평균, 미리 정한 판정(유효·결합 실현·효과·종합)과 회차별 판정, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 지난번에 막힌 세 곳과 라벨 누출을 고쳐, Ghootae 님 아이디어("두 원리를 엮는다")를 이번에는 실제로 시험합니다.
  1. 두 원리 의무: 핵심 선지 하나가 서로 다른 문단의 원리 두 개를 함께 써야 풀리게 합니다. 예를 들어 거래 유형을 가려야 기간이 정해지는 식입니다. 자연스러운 조합이 없으면 억지로 만들지 말고 "후보 없음"으로 멈추게 했습니다.
  2. 헷갈림 근거: 두 사실마다 "처음에 왜 잘못 읽을 수 있나"와 "어느 구절에서 고쳐지나"를 적게 합니다. "누가 깼나"처럼 뻔한 사실은 못 씁니다.
  3. 짝 양쪽 근거: 참 쪽도 위치가 아니라 정체로 정해지게 합니다. link1의 "상자 바닥에 붙어 있었다" 같은 시비를 막습니다.
  4. 전제 보존: 마지막 수리가 정답의 "~이므로" 전제를 지우면 되돌립니다. 대신 그 전제가 너무 쉬운지(지문 규칙 없이 반박되는지)를 codex로 따로 기록합니다.
  5. 라벨 검사: "방문판매로" 같은 판정 이름이 〈보기〉에 들어가면 서버가 막습니다.
- **판정은 미리 정해 둡니다:** 새 두 문항 평균이 옛 청약 이상이고, 지난 link 두 문항보다 0.4 이상 높고, 정답 시비와 사건 나열이 적으면 "효과 있음"입니다. 거기에 두 문항 모두 실제로 두 원리를 써야 풀리면 "유효"입니다.
- **이번이 마지막입니다:** 기준에 못 미치면 A형은 옛 순서로 닫습니다.
- **비용:** 약 $1.6, 상한 $3입니다.
