# CLI 지시문: A형 사례 "전제형" 순서 시험 (청약 철회·공손룡) (웹 2026-11-26 14시대 KST)

결정: Ghootae 2026-11-26 14:04 KST 카드 "청약·공손룡 A형으로 시험". 근거: $CC/REVIEW-case-A-negative-web.md.
- 기출 A형(공시 12번, 공손룡 12번)은 다섯 선지가 모두 "〈보기〉 관계(전제) ~이므로 → 판정" 모양이다.
- 정답의 거짓은 전제(〈보기〉 관계를 잘못 읽음)에 있고, 전제 → 판정 추론은 맞다.
- 새 순서 A형은 정답이 "~라면" 가정형이거나, 잘못 읽은 곳이 결론 속에 숨었다.
**추정 비용: 약 $1.4 (상한 $3).** 생성 2회(청약 A-V1, 공손룡 A-V1)이고, 1회에 약 $0.6이다(lever5 실측 A 새 $0.52). 서버 확인 재호출이 붙으면 회당 +$0.2 정도다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $3)과 커밋·푸시의 승인이다.

```
A형 전제형 시험(CLI-case-premise.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log -1이 baa063e9 이후인지 적는다. $CC/REVIEW-case-A-negative-web.md가 있는지 확인하고, 없으면 멈추고 보고한다.

1. 코드: CASE_FLOW=premise (API 비용 없음). 기본 동작과 CASE_FLOW=lever 동작은 한 글자도 바꾸지 않는다.
   a. run.mjs
      - CASE_FLOW=premise는 RULES_V=6, MODE=A일 때만 받는다. MODE=B에서 주면 오류로 멈춘다. 켜지면 lever와 같이 사례 버전에만 적용하고, 재료 끊기·3-assemble-r 재호출·최종 Dice 기록도 lever와 같다.
      - 3-assemble에 붙이는 블록: LEVER_BLOCK의 가·나는 그대로 쓰고, 다·라와 JSON 안내만 아래로 바꾼 PREMISE_BLOCK을 만든다(문구 그대로).
        "다. 선지 뼈대: 다섯 선지 모두 '〈보기〉 관계 + ~이므로(~므로) + 판정'으로 쓴다. 〈보기〉 관계(전제)는 표의 한 줄 또는 두 줄을 읽은 내용을 단정으로 쓰고, 판정은 원리 카드대로 그 전제에서 이끈다.
        라. 정답: 발문이 '적절하지 않은'이므로 전제가 거짓인 선지 하나가 정답이다. 정답의 전제는 헷갈리는 짝(pair) 줄을 잘못 읽은 〈보기〉 관계이고, 판정은 그 잘못된 전제를 받아들이면 지문대로 맞게 따라 나온다. 정답에는 '~라면', '~다면' 같은 가정을 쓰지 않는다. 참 선지 네 개는 전제도 판정도 맞다. 참 선지 가운데 하나 이상은 정답과 같은 짝의 다른 줄을 맞게 읽는다.
        JSON의 사례 항목에 덧붙인다: principleCards·leverTable은 위와 같고, "choiceLevers":[{"n":1,"facts":["leverTable의 fact 원문"],"premise":"선지 속 〈보기〉 관계 구절 원문","premiseTrue":true,"verdict":"선지 속 판정 구절 원문","misread":"정답이면 잘못 읽은 값, 아니면 null","corrected":"정답이면 전제를 바로 읽어 고친 선지, 아니면 null"}] (선지 5개 모두)."
      - 머리 주석 한 줄: "v6.8 (2026-11-26) CASE_FLOW=premise: A형 사례 전제형 순서(시험용, 기본값 아님). case-check/REVIEW-case-A-negative-web.md".
   b. classify-v6.mjs: checkLeversV6(item, {premise:true})일 때 L1~L7은 그대로 하고 L8을 더한다.
      - L8a(오류): choiceLevers 5개 모두 premise·verdict가 비어 있지 않다.
      - L8b(오류): premiseTrue=false가 정확히 하나이고 그 n이 정답이다.
      - L8c(오류): 정답 선지 본문에 가정 표현(/(라면|다면|았더라면|었더라면)/)이 없다.
      - L8d(경고): 선지 본문에 premise가 들어 있다(글자 일치 또는 Dice ≥0.6). 다듬기로 바뀔 수 있어 경고만.
      - L8e(경고): 선지 본문에 이유 연결어(/(므로|때문에|이니|이어서|이라서)/)가 없는 선지 수.
      시험을 더한다: L8a~L8c 각각 걸리는 예와 통과하는 예. classify-v6 시험이 전체 통과하는지 확인한다.
   c. 건조 실행 세 번(끝나면 건조 폴더 지움):
      - RULES_V=6 CASE_FLOW=premise DRY_RUN=1 PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-premise-dry → 가·나 + 새 다·라 문구, "[재료 없음]"이 있어야 한다.
      - 같은 줄에서 CASE_FLOW=lever → 옛 다·라 문구(이전과 같은지 diff로 확인).
      - 같은 줄에서 CASE_FLOW=premise MODE=B → 오류로 멈춰야 한다.
   d. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API). zsh는 export 방식. 로그는 $V5/out-case-premise-<지문>-A.log.
   - 청약: RULES_V=6 CASE_FLOW=premise PASSAGE=gen32-T3-2 MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-cell5 OUT_NAME=out-case-premise
   - 공손룡: RULES_V=6 CASE_FLOW=premise PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-premise
   각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1) → 필요하면 leak-fix.mjs. 1회뿐이고, 결함이 나와도 기록만 한다.
   기록 $CC/premise-record.md (문항 2개):
   - lever-check(처음·재호출·최종), L8 결과
   - principleCards·leverTable, 선지별 premise·premiseTrue·verdict·misread
   - 수리 여부, 발문 되돌림, 결함 표시
   - 전제형 새 판, 옛 판, lever 새 판의 〈보기〉·선지·정답 나란히
   - 정답 선지 원문 표(웹 손 분류용, 분류는 하지 않는다)

3. 블라인드 $CC/blind-premise/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind7.py를 고쳐 쓴다)
   - 문항 8개(지문 3개: 청약 철회, 공손룡, 공시):
     · 전제형 청약 A-V1, 전제형 공손룡 A-V1 (out-case-premise 최종: leakfix 채택본, 없으면 repair/items-final.json)
     · 옛 청약 A-V1 (out-case-lever5-old 최종), 옛 공손룡 A-V1 (out-cell1-v62-r2/gongsun-long-later-mohists-A 최종)
     · 참고 lever 청약 A-V1 (out-case-lever5 최종), 참고 lever 공손룡 A-V1 (out-case-lever4 최종)
     · 자격 기출 공시 12번, 공손룡 12번
   - 평가자 4명 × 3회(seed 20261331·32·33), 순서는 회차마다 섞는다.
   - 점검: 문항 수, KEY, 출처 표기 0, 결함 표시 문항이 섞이지 않았는지.

4. 집계 $CC/aggregate-premise.md (aggregate_lever5.py를 고쳐 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표)
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 두 문항이 각각 3회 합 평균 ≥ 1.5. 아니면 "블라인드 무효"로 적고 판정하지 않는다.
     · 지문별: 전제형 − 옛 A ≥ +0.5 → "전제형 나음", ≤ −0.5 → "옛 순서 나음", 그 사이 → "차이 없음".
     · 종합: 두 지문 모두 전제형 ≥ 1.5이고 어느 지문도 "옛 순서 나음"이 아니면 → "A형 전제형 채택 후보". 한 지문이라도 "옛 순서 나음"이면 → "채택 안 함". 그 밖 → "보류".
   - 회차별로도 지문별 판정을 적는다.
   - ㉯·㉲·㉳ 문항별 수, 평가 이유 분류(지난번과 같은 묶음).

5. 보고서 $CC/REPORT-case-premise.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

6. 커밋(목록 먼저): $V5/run.mjs, $V5/classify-v6.mjs, classify-v6 시험 파일, $V5/out-case-premise/, 새 로그, $CC/blind-premise/, $CC/premise-record.md, $CC/aggregate-premise.md, $CC/aggregate_premise.py, $CC/make_blind8.py, $CC/REPORT-case-premise*.md, $CC/REVIEW-case-A-negative-web.md, 이 지시문.
   메시지: "A형 사례 전제형 순서(CASE_FLOW=premise) 시험: 청약 철회·공손룡". push(force 금지).

7. 보고하고 멈춘다: 시험 결과, 건조 세 개, 비용, lever-check·L8 표, 문항별 평균, 미리 정한 판정(유효·지문별·종합)과 회차별 판정, ㉯·㉲·㉳, 평가 이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** "적절하지 않은 것" 문항(A형)을 만드는 새 방식을 하나 더 만들어, 실패했던 두 지문(청약 철회, 공손룡)에서 다시 만듭니다.
  - 다섯 선지를 모두 "〈보기〉에서 읽은 관계 + ~이므로 + 판정" 모양으로 씁니다.
  - 정답 하나만 그 관계를 헷갈리는 짝에서 잘못 읽게 합니다. 판정은 그 잘못된 전제에서 맞게 이어지게 하고, "~라면" 가정은 못 쓰게 합니다.
- **어떻게:** 규칙 파일은 고치지 않습니다. 출력 칸(전제, 전제 참·거짓, 판정)을 더하고, 서버가 "전제 거짓은 정답 하나뿐인가", "정답에 가정형이 없는가"를 확인합니다. 어기면 한 번 다시 부릅니다.
  - 이 방식은 CASE_FLOW=premise로 켤 때만 돕니다. 지금 기본값(B형 새 순서, A형 옛 순서)은 그대로입니다.
- **왜:** 기출 A형(공시 12번, 공손룡 12번)이 이 모양이었습니다. 생성 A형은 정답이 가정형이거나 잘못 읽은 곳이 결론 속에 숨어 있었습니다.
- **판정은 미리 정해 둡니다:** 두 지문 모두 1.5 이상이고 옛 순서보다 나쁘지 않으면 "채택 후보", 한 지문이라도 옛 순서보다 0.5 이상 나쁘면 "채택 안 함"입니다.
  - 지난번 새 순서 A형(둘 다 0.58)도 참고로 같은 블라인드에 넣습니다. 그래야 같은 평가 조건에서 나아졌는지 보입니다.
- **그다음:** 결과가 오면 문항을 직접 읽고 보고드리겠습니다.
