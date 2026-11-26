# CLI 지시문: 짝 카드 2판("같은 말, 맥락으로 갈리는 개념") + 수리 가드, 공손룡 A형 (웹 2026-11-26 16시대 KST)

배경: 짝 카드 1판 결과(594213c9)는 다음과 같다.
- 위치·순서 퍼즐 불만이 10/12에서 0/12로 사라졌다. 그러나 점수는 1.00 그대로였다.
- 새 불만은 12/12 "단순 대응 확인, 추론이 얕다"였다.

웹 진단:
1. **표식이 답을 알려 준다.** 1판 〈보기〉는 접시마다 ◇○△ 표식을 새겨, 무엇이 같은 실인지를 표식으로 알려 줬다. 학생은 표식만 대조하면 된다.
   - 높게 나온 세 문항은 모두 "같은 말인데 맥락에 따라 개념 쪽이 갈리는" 짝이었다.
     - 옛 A(1.92): '등잔'이 안내 화면에서는 두 개체(유명), 정비 일지에서는 한 개체(사명)를 가리킨다.
     - 기출 12번(2.00): ⓐⓓ '옷'과 ⓔ '빨간 옷'.
     - 청약 전제형(생성 A 중 최고 1.42): '끈'이 상자 끈(포장)이기도 하고 손잡이 끈(구성품)이기도 하다.
2. **수리가 전제형을 깨뜨렸다.** 3단계에서는 정답 ②가 "㉠의 '별'과 '달'은 하나의 실을 함께 지시하므로…"(전제형, L8 통과)였다. 그런데 eval-repair 수리(M2·M5) 뒤 "'달' 대신 '별'을 썼다면…" 가정형으로 바뀌었다(최종 ㉲ 1). L8c는 3단계에서만 확인한다.

**추정 비용: 약 $0.9 (상한 $1.8).** 생성 1회(공손룡 A-V1)다. 짝 카드 1판 실측이 $0.90이었다. 블라인드는 codex라 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정·API 실행(상한 $1.8)과 커밋·푸시의 승인이다.

```
짝 카드 2판 시험(CLI-case-pair2.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일, 읽기 습관 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log에 594213c9가 있는지 적는다.

1. 코드 (API 비용 없음). PAIR_CARD=1 동작과 기본 동작은 한 글자도 바꾸지 않는다.
   a. eval-repair.mjs 수리 가드(v6.10): 환경변수 CASE_FLOW=premise이고 사례·부정 발문 문항이면, 수리 뒤 정답 선지에 가정 표현(/(라면|다면|았더라면|었더라면)/)이 생겼는데 수리 전 정답 선지에는 없었을 때 그 수리를 버리고 원본을 유지한다. 발문 되돌림(v6.5 수리 보완 1)과 같은 자리·같은 방식이고, 경고 문구는 "수리가 정답을 가정형으로 바꿔 되돌림"이다. 수리 뒤 정답 번호가 바뀌어도 같은 방식으로 되돌린다. 시험을 더한다.
   b. run.mjs PAIR_CARD=2: 1판 짝 카드 문단 끝에 아래 문장을 덧붙이고, JSON 카드에 "word"를 더한다(문구 그대로).
      "짝의 두 사실에는 같은 말(word: 명, 용어, 물건 이름)이 함께 나온다. 그 말이 두 사실에서 지문 개념의 어느 쪽에 놓이는지는 〈보기〉가 표식·번호·기호·라벨로 알려 주지 않는다. 학생이 맥락(누가, 어디서, 무엇을 가리키며 그 말을 썼는가)으로 판단해야 한다."
      JSON: "pairCards":[{"name":"…","word":"짝 두 사실에 함께 나오는 같은 말","quote":"…","sideA":"…","sideB":"…","card":"C1"}]
      머리 주석 한 줄: "v6.10 (2026-11-26) PAIR_CARD=2: 짝 = 같은 말이 맥락으로 다른 개념 쪽(시험용) + eval-repair 전제형 가드. case-check/CLI-case-pair2.md".
   c. classify-v6.mjs: opts.pairCard === 2이면 L9a~e에 더해
      - L9f(오류): 카드마다 word가 비어 있지 않고, 그 카드 name을 pair로 가진 줄 두 개 이상의 fact에 word가 모두 들어 있다.
      - L9g(오류): pair 줄 fact에 식별 기호·표식이 있다(/[◇◆○●△▲□■☆★]|표식|일련번호/).
      시험을 더한다. 594213c9의 짝 카드 1판 항목(◇○△ 표식, word 없음)은 L9f·L9g에 걸려야 한다. 옛 공손룡 A(등잔)에 손으로 pairCards(word '등잔')를 붙이면 통과해야 한다. classify-v6 시험이 전체 통과하는지 확인한다.
   d. 건조 실행 두 번(끝나면 건조 폴더 지움):
      - RULES_V=6 CASE_FLOW=premise PAIR_CARD=2 DRY_RUN=1 PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-pair2-dry → 덧붙인 문장과 word 안내가 있어야 한다.
      - PAIR_CARD=1로 바꾸면 594213c9 때와 같은 지시문이어야 한다(diff로 확인).
   e. 비용 추산을 적는다. 상한을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API) 1회: RULES_V=6 CASE_FLOW=premise PAIR_CARD=2 PASSAGE=gongsun-long-later-mohists MODE=A KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs OUT_NAME=out-case-pair2
   run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, CASE_FLOW=premise 그대로 넘김) → 필요하면 leak-fix.mjs. 로그 $V5/out-case-pair2-gongsun-long-later-mohists-A.log. 결함이 나와도 기록만 한다.
   기록 $CC/pair2-record.md: lever-check(처음·재호출·최종, L8·L9), pairCards, leverTable, 선지별 premise·premiseTrue·verdict·misread, 수리 여부·수리 가드 되돌림·결함, 최종 〈보기〉·선지·정답, 그리고 짝 카드 1판·옛 A-V1을 나란히.

3. 블라인드 $CC/blind-pair2/ (codex gpt-6.1-sol, 0원, 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로, make_blind9.py를 고쳐 쓴다)
   - 문항 4개(공손룡): 짝 카드 2판 A-V1(out-case-pair2 최종), 짝 카드 1판 A-V1(out-case-pair 최종), 옛 A-V1(out-cell1-v62-r2 최종), 자격 기출 공손룡 12번.
   - 평가자 4명 × 3회(seed 20261351·52·53), 순서는 회차마다 섞는다. 점검: 문항 수, KEY, 출처 표기 0.

4. 집계 $CC/aggregate-pair2.md (aggregate_pair.py를 고쳐 쓴다)
   - 문항별 회차별 등급·평균(3회 합 = 12표), ㉯·㉲·㉳
   - 이유 묶음 두 개를 더 센다(12표 전부): "위치·순서 추적"(위치|순서|방향|배치|추적), "얕음·단순 대응"(얕|단순|짧게|대응 확인|확인만).
   - 미리 정한 판정 (결과를 보고 바꾸지 않는다):
     · 블라인드 유효: 기출 12번 3회 합 평균 ≥ 1.5.
     · 얕음 해결: 2판의 "얕음·단순 대응" ≤ 3/12 (1판을 같은 규칙으로 센 값도 적는다).
     · 점수: 2판 ≥ 1.5이고 2판 − 옛 A ≥ −0.5 → "통과(청약에서 확인 후 채택 판단)". 2판 − 1판 ≥ +0.5이지만 1.5 미만 → "나아짐, 미달". 그 밖 → "효과 없음".
   - 회차별로도 같은 판정을 적는다.

5. 보고서 $CC/REPORT-case-pair2.md(측정만) + -human.md(5~8줄). 실제 비용도 적는다.

6. 커밋(목록 먼저): $V5/run.mjs, $V5/eval-repair.mjs, $V5/classify-v6.mjs, 시험 파일, $V5/out-case-pair2/, 새 로그, $CC/blind-pair2/, $CC/pair2-record.md, $CC/aggregate-pair2.md, $CC/aggregate_pair2.py, $CC/make_blind10.py, $CC/REPORT-case-pair2*.md, 이 지시문.
   메시지: "사례 짝 카드 2판(같은 말·맥락) + 수리 전제형 가드: 공손룡 A형". push(force 금지).

7. 보고하고 멈춘다: 시험 결과(L9f·g가 1판 항목을 잡았는지 포함), 건조 두 개, 비용, lever-check·L8·L9 표, pairCards, 수리 가드 작동 여부, 문항별 평균, 미리 정한 판정과 회차별 판정, 이유 묶음 수, ㉯·㉲·㉳, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 두 가지를 고칩니다.
  1. 헷갈리는 짝을 "같은 말인데 맥락에 따라 다른 개념이 되는 것"으로 만들게 합니다. '등잔'이 안내 화면에서는 두 개를, 일지에서는 하나를 가리키는 식입니다. 〈보기〉가 ◇○△ 같은 표식으로 답을 알려 주지 못하게 서버가 막습니다.
  2. 수리 단계가 전제형 정답을 "~였다면" 가정형으로 바꾸면 그 수리를 버리고 원본을 유지합니다. 지난번에는 수리가 전제형을 깨뜨렸습니다.
- **왜:** 지난번 짝 카드로 위치 퍼즐은 사라졌습니다. 하지만 접시에 표식을 새겨 놓아서 "표식만 대조하면 풀린다"(얕다)는 평을 받았습니다. 높게 나온 문항(옛 공손룡 '등잔', 기출 '옷', 청약 '끈')은 모두 같은 말이 맥락으로 갈리는 짝이었습니다.
- **판정은 미리 정해 둡니다:** "얕다" 불만이 12개 중 3개 이하로 줄고, 점수가 1.5 이상이면서 옛 판보다 0.5 넘게 낮지 않으면 통과입니다. 통과하면 청약 철회에서 확인합니다.
