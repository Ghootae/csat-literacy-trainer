# CLI-vocab-d-formB — 어휘 규칙 v3(바꿔 쓰기 오답 고르는 법), 우리 지문 바꿔 쓰기 2문제만 다시 (2026-11-28, 웹 작성)

- 근거: `vocab-c/REPORT-vocab-c.md` (통과지만 꼴별 차이 큼: 문맥적 의미 1.94 대 기출 1.72, **바꿔 쓰기 1.00 대 기출 1.84**). 오답 낱말이 지문 낱말과 뜻부터 멀어("적은→전사한", "이끄는→호송하는") 낱말 대조로 지워졌다.
- 고친 규칙 = `rules-vocab-v3.md`: "안 맞는 낱말"은 지문 낱말의 **다른 사전 뜻**과 짝이어야 한다. 다른 문장에서는 바꿔 쓸 수 있어야 하고, 생성기가 그 문장을 적는다(other_sentence). 바닥 검사에서 그 문장을 codex로 확인한다.
- 바꿔 쓰기 2문제(T-B, C-B)만 다시 만든다. 문맥적 의미 2문제는 vocab-c 점수를 쓴다.
- **추정 비용: 약 $0.04, 상한 $0.2.** 유료 호출 생성 2회. codex(무료): 바닥 4회 + other_sentence 확인 약 5회 × 2 + 블라인드 12 × 8 = 약 110회.
- **최소 실행 = T-B 먼저 생성해 other_sentence 확인 뒤 C-B.** 수리·재생성 없음.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-vocab-d-formB.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 어휘 규칙 v3으로 우리 지문 바꿔 쓰기 2문제 다시 시험 + 미리 정한 판정. 판정 기준은 아래에 적혀 있다. 고치지 마라.

약어: EI = docs/experiments/easy-items-2026-11-27, VA = $EI/vocab-a, VC = $EI/vocab-c, OUT = $EI/vocab-d

금지: 규칙 파일(rules-*-v6.md, kind-*.md, $EI/rules-match-v*.md, $EI/rules-underline-v*.md, $EI/rules-vocab-v*.md) 수정 금지. checkout / stash / restore / reset / force push 금지. $VA·$VC 는 읽기만. 유료 호출 최대 2회, 재시도 없음.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, 최신에 vocab-c 커밋("어휘 규칙 v2 우리 지문 2편 시험")이 있어야 한다.
- 있어야 할 것: $EI/rules-vocab-v3.md ("# 어휘 문항 생성 규칙 v3" 줄, "other_sentence" 낱말), $VC/gen_vocab.mjs, $VA/floor/, $VA/mark_passages.py, $VC/make_blind.py, $VC/aggregate.py, $VC/inputs/(T-plain, C-plain, 기출 8개), $VC/gen/{T-A,C-A,T-B,C-B}/item.json. 없으면 멈추고 보고.

1단계 (재료) $OUT/inputs/ = $VC/inputs/ 복사.

2단계 (생성) $OUT/gen_vocab.mjs = $VC/gen_vocab.mjs 복사, 규칙 파일만 rules-vocab-v3.md. 의뢰는 vocab-c 의 T-B·C-B 와 같다(방향·발문·정답 번호 그대로). 단 "## 이미 고른 낱말" 에는 같은 지문 꼴 A(vocab-c 의 T-A, C-A)의 word 를 넣는다(꼴 A 는 다시 만들지 않으므로).
- T-B 먼저: JSON 형식, targets 구절이 plain 지문에 한 번, "안 맞는 낱말" 선지(적절하지 않은 것 발문은 정답, 가장 적절한 것 발문은 오답 넷)에 other_sentence 가 있는지 확인. 없으면 멈추고 보고. 괜찮으면 C-B.
- 저장 $OUT/gen/<의뢰>/{raw.json,item.json}, usage.json, 표시판 $OUT/inputs/<의뢰>-marked.txt.

3단계 (바닥 검사) $VA 방식 그대로(정답 하나 풀이 2회, 표시 자리, 형식, 겉모양) + other_sentence 확인:
- other_sentence 마다 codex 1회: "다음 두 문장에서 앞 문장의 [W]를 [X]로 바꾼 뒤 문장의 뜻이 같은가? 예/아니오와 한 줄 이유". '아니오' 수를 적는다. 
- 바닥 실패: 정답 하나 실패, 표시 자리 실패, 또는 other_sentence '아니오'가 2개 이상.

4단계 (단독 블라인드) $OUT/make_blind.py = $VC/make_blind.py 바탕, 문항 12개: 새 T-B·C-B(이름 D-T-B, D-C-B), vocab-c 의 T-B·C-B(이름 C-T-B, C-C-B, $VC/gen 과 $VC/inputs 표시판), 기출 8개. 폴더 M01~M12, random.seed(20261211). 머리말·CODEX-PROMPT 는 $VC 것과 한 글자도 다르지 않게. 폴더를 만들기 전에 선지가 출처와 글자 단위로 같은지 코드로 확인, 다르면 멈춤. 폴더 하나 먼저 8회, 4개 이상 비면 멈추고 보고.

5단계 (집계·미리 정한 판정) $OUT/aggregate.py
- B3 = 새 바꿔 쓰기 2개 평균(바닥 실패 0점), B2 = 옛 바꿔 쓰기 2개 평균(이번 블라인드), MB = 기출 바꿔 쓰기 4개(SV BV GV HV) 평균, M = 기출 8개 평균.
- G = (새 T-B, 새 C-B 점수 + vocab-c 의 T-A 1.875, C-A 2.000)/4.
- 판정(문구 그대로):
   새 문제 바닥 실패 ≥ 1                     → "미달(바닥 실패)"
   그렇지 않고 B3 ≥ MB − 0.4 이고 G ≥ M − 0.4  → "통과(바꿔 쓰기도 기출 수준)"
   그렇지 않고 B3 > B2 이고 G ≥ M − 0.4        → "나아졌으나 바꿔 쓰기는 아직 낮음"
   그 밖                                       → "미달(규칙 효과 없음)"
- 함께 적기: ㉲·㉳ 표시 수(새 대 옛), other_sentence '아니오' 수, 고른 낱말.
- 결과 $OUT/aggregate-out.md

6단계 (보고서) $OUT/REPORT-vocab-d.md + REPORT-vocab-d-human.md (쉬운 말, 맨 위 판정 문구, 새 문제 2개를 실제 문제 모양으로 + 표시 낱말 든 지문 문장 + "안 맞는 낱말"마다 other_sentence, 옛 문제와 나란히). 비용 한 줄.

7단계 (커밋) $OUT 아래 이번 파일과 $EI/rules-vocab-v3.md, $EI/CLI-vocab-d-formB.md 만 git add. 커밋 메시지: "어휘 규칙 v3(바꿔 쓰기 오답 고르는 법) 우리 지문 다시 시험". 푸시. 보고: 커밋 해시, 판정 문구, B3·B2·MB·G·M, 비용. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **목적:** 우리 지문 시험에서 "바꿔 쓰기" 문제만 약했던 이유(오답 낱말이 지문 낱말과 뜻부터 멀어서 바로 지워짐)를 고친 규칙으로, 그 두 문제만 다시 만들어 봅니다.
- **방법:** 규칙에 "안 맞는 낱말은 지문 낱말의 다른 뜻과 짝이어야 한다(예: '시간을 줄이다 = 시간을 단축하다'처럼 다른 문장에서는 바꿔 쓸 수 있어야 함)"를 넣었습니다. 생성기가 그 다른 문장을 적고, 채점 모델이 그 문장이 맞는지 확인합니다. 옛 문제·기출 8개와 같은 블라인드에서 채점합니다.
- **다음:** 통과면 어휘 규칙을 확정하고 세트 조립으로 넘어갑니다.
