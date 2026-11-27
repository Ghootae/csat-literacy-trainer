# CLI-vocab-b-retry — 어휘 규칙 v2(말 묶음 금지), 조선 노비제 꼴 A만 다시 (2026-11-28, 웹 작성)

- 근거: `vocab-a/REPORT-vocab-a.md` (미달: 조선 노비제 꼴 A 0.125, 정답 예문이 지문의 "관심을 두다"를 그대로 씀. 나머지 3문제 2.00·2.00·1.50, G 1.41 vs M 1.75). 고친 규칙 = `rules-vocab-v2.md` (꼴 A 정답·오답 예문에 지문과 같은 말 묶음 금지).
- 조선 노비제 꼴 A(N-A) 하나만 다시 만든다. 나머지 3문제는 vocab-a 점수를 쓴다.
- **추정 비용: 약 $0.015, 상한 $0.1.** 유료 호출 생성 1회. codex(무료): 바닥 2회 + 블라인드 10 × 8 = 80회.
- 수리·재생성 없음.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-vocab-b-retry.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 어휘 규칙 v2로 조선 노비제 꼴 A 다시 시험 + 미리 정한 판정. 판정 기준은 아래에 적혀 있다. 고치지 마라.

약어: EI = docs/experiments/easy-items-2026-11-27, VA = $EI/vocab-a, OUT = $EI/vocab-b

금지: 규칙 파일(rules-*-v6.md, kind-*.md, $EI/rules-match-v*.md, $EI/rules-underline-v*.md, $EI/rules-vocab-v*.md) 수정 금지. checkout / stash / restore / reset / force push 금지. $VA 는 읽기만. 유료 호출 최대 1회, 재시도 없음.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, 최신에 vocab-a 커밋("어휘 문항 시험 생성(기출 지문 2편) + 바닥 검사·단독 블라인드 판정")이 있어야 한다.
- 있어야 할 것: $EI/rules-vocab-v2.md ("# 어휘 문항 생성 규칙 v2" 줄, "같은 말 묶음" 낱말), $VA/gen_vocab.mjs, $VA/floor/, $VA/make_blind.py, $VA/aggregate.py, $VA/mark_passages.py, $VA/inputs/(N-plain.txt, 기출 8개), $VA/gen/N-A/item.json. 없으면 멈추고 보고.

1단계 (재료) $OUT/inputs/ = $VA/inputs/ 복사.

2단계 (생성) $OUT/gen_vocab.mjs = $VA/gen_vocab.mjs 복사, 규칙 파일만 rules-vocab-v2.md. 의뢰는 vocab-a 의 N-A 와 같다(꼴 A, "ⓐ와 문맥상 의미가 가장 가까운 것은?", 정답 ②). 이번에는 "## 이미 고른 낱말" 을 붙이지 않는다(vocab-a 와 같음).
- 생성 뒤 코드 확인: targets 구절이 N-plain 에 한 번. 그리고 targets[0].text 에서 표시 낱말 바로 앞 어절(예: "관심을")이 정답 예문에 그대로 있으면 "말 묶음 반복"으로 적는다(멈추지 않음).
- 저장 $OUT/gen/N-A/{raw.json,item.json}, usage.json, 표시판 $OUT/inputs/N-A-marked.txt.

3단계 (바닥 검사) $VA 방식 그대로.

4단계 (단독 블라인드) $OUT/make_blind.py = $VA/make_blind.py 바탕, 문항 10개: 새 N-A(이름 B-N-A), vocab-a 의 N-A(이름 A-N-A, $VA/gen/N-A 와 $VA/inputs/N-A-marked.txt), 기출 8개(같은 것). 폴더 M01~M10, random.seed(20261209). 머리말·CODEX-PROMPT 는 $VA 것과 한 글자도 다르지 않게. 폴더를 만들기 전에 선지가 출처와 글자 단위로 같은지 코드로 확인, 다르면 멈춤. 폴더 하나 먼저 8회, 4개 이상 비면 멈추고 보고.

5단계 (집계·미리 정한 판정) $OUT/aggregate.py
- B = 새 N-A 점수(바닥 실패 0점), A1 = 옛 N-A 점수(이번 블라인드), M = 이번 기출 8개 평균, NV = 같은 지문 기출 꼴 A 점수.
- G = (B + vocab-a 의 S-A 2.000, S-B 2.000, N-B 1.500)/4.
- 판정(문구 그대로):
   새 N-A 바닥 실패                         → "미달(바닥 실패)"
   그렇지 않고 새 N-A '수능 아님' 4/8 이상     → "미달(수능 아님 4/8 이상)"
   그렇지 않고 G ≥ M − 0.4                  → "통과(기출 지문에서 기출 수준)"
   그렇지 않고 G ≥ M − 0.8                  → "거의"
   그 밖                                    → "미달"
- 함께 적기: B, A1, NV, 꼴 A 기출 4개 평균, ㉲·㉳ 표시 수, 말 묶음 반복 여부.
- 결과 $OUT/aggregate-out.md

6단계 (보고서) $OUT/REPORT-vocab-b.md + REPORT-vocab-b-human.md (쉬운 말, 맨 위 판정 문구, 새 N-A 를 실제 문제 모양으로 + 표시 낱말 든 지문 문장, 옛 N-A 와 나란히). 비용 한 줄.

7단계 (커밋) $OUT 아래 이번 파일과 $EI/rules-vocab-v2.md, $EI/CLI-vocab-b-retry.md 만 git add. 커밋 메시지: "어휘 규칙 v2(말 묶음 금지) 조선 노비제 꼴 A 다시 시험". 푸시. 보고: 커밋 해시, 판정 문구, B·A1·G·M, 비용. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **목적:** 어휘 첫 시험에서 유일하게 크게 떨어진 문제(정답 예문이 지문의 "관심을 두다"를 그대로 써서 뜻을 몰라도 풀림)를 고친 규칙으로 다시 만들어 봅니다.
- **방법:** 규칙에 "정답 예문은 지문과 같은 말 묶음을 쓰지 않는다"를 더했습니다. 그 문제 하나만 다시 만들고, 옛 문제·기출 8개와 같은 블라인드에서 채점합니다.
- **다음:** 통과면 우리 지문에서 어휘 문제를 시험합니다.
