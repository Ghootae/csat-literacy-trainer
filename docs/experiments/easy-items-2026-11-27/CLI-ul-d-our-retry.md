# CLI-ul-d-our-retry — 밑줄 규칙 v3(밑줄 자리 조항), 청약 철회만 다시 시험 (2026-11-28, 웹 작성)

- 근거: `ul-c/REPORT-ul-c.md` (미달(바닥 실패 2개). 원인 하나: 청약 철회 밑줄 "통신판매"·"방문판매"가 지문에 여러 번 나와 자리가 안 정해짐. 평가자 점수는 생성 4개 1.906 대 기출 1.875로 기출 수준). 고친 규칙 = `rules-underline-v3.md` (v2 + 원칙 1 밑줄 자리 조항).
- 청약 철회 문항 2개(C-pos, C-neg)만 다시 만든다. 혈액 응고 두 문항(바닥 통과, 2.00·2.00)은 ul-c 결과를 그대로 쓴다.
- **추정 비용: 약 $0.04, 상한 $0.2.** 유료 호출 생성 2회. codex(무료): 바닥 4회 + 블라인드 10 × 8 = 80회.
- **최소 실행 = C-pos 먼저 생성해 밑줄 구절이 지문에 한 번만 나오는지 확인 후 C-neg.** 수리·재생성 없음.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-ul-d-our-retry.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 밑줄 규칙 v3으로 청약 철회 문항 2개 다시 시험 + 미리 정한 판정. 판정 기준은 아래에 적혀 있다. 고치지 마라.

약어: EI = docs/experiments/easy-items-2026-11-27, UC = $EI/ul-c, OUT = $EI/ul-d

금지: 규칙 파일(rules-*-v6.md, kind-*.md, $EI/rules-match-v*.md, $EI/rules-underline-v*.md) 수정 금지. checkout / stash / restore / reset / force push 금지. $UC 는 읽기만. 유료 호출 최대 2회, 재시도 없음.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, 최신에 ul-c 커밋("밑줄 이해 규칙 v2 우리 지문 2편 시험(밑줄 위치 생성 포함)")이 있어야 한다.
- 있어야 할 것: $EI/rules-underline-v3.md ("# 밑줄 대상 이해 문항 생성 규칙 v3" 줄, "딱 한 번" 낱말), $UC/gen_ul.mjs, $UC/floor/(또는 바닥 검사 코드), $UC/make_blind.py, $UC/aggregate.py, $UC/inputs/(지문 C 정리본, 기출 8개), $UC/gen/{T-pos,T-neg}/item.json, $UC/inputs/T-marked.txt. 없으면 멈추고 보고.

1단계 (재료) $OUT/inputs/ = $UC/inputs/ 복사(C 는 밑줄 없는 정리본을 다시 쓴다).

2단계 (생성) $OUT/gen_ul.mjs = $UC/gen_ul.mjs 복사, 규칙 파일만 rules-underline-v3.md 로. 의뢰는 ul-c 의 C-pos(정답 ③, ㉠·㉡ 짝을 생성기가 고름)·C-neg(정답 ①, C-pos targets 그대로, C-pos 선지 5개를 "이미 쓴 선지"로)와 같다.
- C-pos 먼저: targets[].text 가 지문에 정확히 한 번씩 나오는지 코드로 센다. 한 번이 아니면 멈추고 보고(C-neg 돌리지 않음). 괜찮으면 C-neg.
- 저장 $OUT/gen/<의뢰>/{raw.json,item.json}, usage.json. 그 뒤 $OUT/inputs/C-marked.txt (targets 앞에 ㉠·㉡).

3단계 (바닥 검사) $UC 방식 그대로(밑줄 구절 한 번 조건 포함). 함께 적기: 고른 밑줄 구절과 그 문장, 오답 자리 표시 수, 끝 반전 2개 이상이면 '규칙 어김'.

4단계 (단독 블라인드) $OUT/make_blind.py = $UC/make_blind.py 바탕, 문항 10개(새 C-pos·C-neg + 기출 8), 폴더 M01~M10, random.seed(20261207). 머리말·CODEX-PROMPT 는 $UC 것과 한 글자도 다르지 않게. 폴더를 만들기 전에 선지가 출처와 글자 단위로 같은지 코드로 확인, 다르면 멈춤. 폴더 하나 먼저 8회, 4개 이상 비면 멈추고 보고.

5단계 (집계·미리 정한 판정) $OUT/aggregate.py
- G_C = 새 C 2개 평균(바닥 실패 0점). G = (G_C 두 점수 + ul-c 혈액 응고 2.000·2.000)/4. M = 이번 블라인드 기출 8개 평균.
- 판정(문구 그대로):
   바닥 실패 ≥ 1                                 → "미달(바닥 실패)"
   그렇지 않고 '수능 아님' 4/8 이상 문항 있음        → "미달(바닥: 수능 아님 4/8 이상)"
   그렇지 않고 G ≥ M − 0.4 이고 G_C ≥ M − 0.4      → "통과(우리 지문에서도 기출 수준)"
   그렇지 않고 G ≥ M − 0.8                        → "거의"
   그 밖                                          → "미달"
- 참고: pos(새 C-pos + ul-c T-pos 2.000) 평균 대 Mp − 0.4. ㉳·㉲ 표시 수.
- 결과 $OUT/aggregate-out.md

6단계 (보고서) $OUT/REPORT-ul-d.md + REPORT-ul-d-human.md (쉬운 말, 맨 위 판정 문구, 새 C 문항 2개를 실제 문제 모양으로, 고른 밑줄 자리가 적절해 보이는지 한 줄, ul-c 의 C 문항 점수와 나란히). 비용 한 줄.

7단계 (커밋) $OUT 아래 이번 파일과 $EI/rules-underline-v3.md, $EI/CLI-ul-d-our-retry.md 만 git add. 커밋 메시지: "밑줄 규칙 v3(밑줄 자리 조항) 청약 철회 다시 시험". 푸시. 보고: 커밋 해시, 판정 문구, G·G_C·M, 고른 밑줄 구절, 비용. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **목적:** 지난 시험의 유일한 실패 원인(밑줄을 여러 번 나오는 낱말에 그어서 자리가 안 정해짐)을 고친 규칙으로, 청약 철회 문제만 다시 만들어 봅니다.
- **방법:** 규칙에 "밑줄 구절은 지문에 딱 한 번 나오는 구절, 그 개념을 정의·설명한 자리"를 더했습니다. 청약 철회 문제 2개만 다시 만들고, 기출 8개와 섞어 채점합니다. 혈액 응고 2개는 지난 점수(2.00)를 씁니다.
- **다음:** 통과면 밑줄 문제 규칙을 확정하고 어휘 문제로 넘어갑니다.
