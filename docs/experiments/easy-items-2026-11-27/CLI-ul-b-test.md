# CLI-ul-b-test — 밑줄 이해 규칙 v2("적절한 것" 오답 자리 옮기기) 다시 시험 (2026-11-28, 웹 작성)

- 근거: 1차 `ul-a/REPORT-ul-a.md` (거의: "적절하지 않은 것" 1.94 = 기출 수준, "적절한 것" 1.06 vs 기출 1.92, 오답이 지문 문장 반전이라 낱말 대조로 지워짐). 고친 규칙 = `rules-underline-v2.md` ("적절한 것" 오답 중 문장 끝 반대말·'만' 붙이기는 1개까지, 원리 적용·두 곳 맞대기 1개 이상, 나머지는 문장 안쪽을 비틀기). 근거 `REVIEW-underline-pos-distractors.md`.
- "적절한 것" 문항 2개(S-pos, I-pos)만 다시 만든다. "적절하지 않은 것"은 1차 결과를 그대로 쓴다.
- 같은 블라인드에 v2 2개, 1차(v1) 2개, 기출 8개(1차와 같은 것)를 섞어 1차 대비 변화를 같은 자리에서 본다.
- **추정 비용: 약 $0.05, 상한 $0.3.** 유료 호출 생성 2회. codex(무료): 바닥 4회 + 블라인드 12 × 8 = 96회.
- **최소 실행 = S-pos 먼저 확인 후 I-pos.** 수리·재생성 없음.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-ul-b-test.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 밑줄 이해 규칙 v2 "적절한 것" 문항 다시 시험 + 미리 정한 판정. 판정 기준은 아래에 적혀 있다. 고치지 마라.

약어: EI = docs/experiments/easy-items-2026-11-27, A = $EI/ul-a, OUT = $EI/ul-b

금지: 규칙 파일(rules-*-v6.md, kind-*.md, $EI/rules-match-v*.md, $EI/rules-underline-v*.md) 수정 금지. checkout / stash / restore / reset / force push 금지. $A 는 읽기만. 유료 호출 최대 2회, 재시도 없음.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, 최신에 d7907954(ul-a)가 있어야 한다.
- 있어야 할 것: $EI/rules-underline-v2.md ("# 밑줄 대상 이해 문항 생성 규칙 v2" 줄, "속 바꿔치기" 낱말), $EI/REVIEW-underline-pos-distractors.md, $A/gen_ul.mjs, $A/floor/, $A/make_blind.py, $A/aggregate.py, $A/inputs/, $A/gen/{S-pos,I-pos}/item.json. 없으면 멈추고 보고.

1단계 (재료) $OUT/inputs/ = $A/inputs/ 복사(지문 S·I, 기출 8개 SU IU RS HY PJ FL PL PZ).

2단계 (생성) $OUT/gen_ul.mjs = $A/gen_ul.mjs 복사, 규칙 파일만 rules-underline-v2.md 로.
- 의뢰: S-pos "㉠에 대해 이해한 내용으로 가장 적절한 것은?" 정답 ②, I-pos "㉠, ㉡에 대한 이해로 가장 적절한 것은?" 정답 ③. user 메시지 모양은 1차와 같다(이미 쓴 선지 없음).
- S-pos 먼저, JSON 형식(kind 에 '끝 반전'/'속 바꿔치기'/'적용·맞대기' 표시)·비용 확인 후 I-pos.
- 저장 $OUT/gen/<의뢰>/{raw.json,item.json}, usage.json.

3단계 (바닥 검사) $A 방식 그대로 2문항에. 함께 적기: 오답의 '끝 반전'/'속 바꿔치기'/'적용·맞대기' 수(생성기 자기 표시), twist. 끝 반전이 2개 이상이면 '규칙 어김'으로 적되 멈추지 않는다.

4단계 (단독 블라인드) $OUT/make_blind.py = $A/make_blind.py 바탕, 문항 12개: v2 2개(이름 B-S-pos, B-I-pos), 1차 2개($A/gen/S-pos·I-pos, 이름 A-S-pos, A-I-pos), 기출 8개. 폴더 M01~M12, random.seed(20261205). 머리말·CODEX-PROMPT 는 $A 것과 한 글자도 다르지 않게.
 폴더를 만들기 전에 넣은 선지가 출처 item.json·ref-questions.json 과 글자 단위로 같은지 코드로 확인(특히 A-* 는 $A/gen/ 에서, B-* 는 $OUT/gen/ 에서 읽었는지). 다르면 멈춤.
 폴더 하나 먼저 8회, 4개 이상 비면 멈추고 보고. 그다음 나머지. 실패 회차만 한 번 다시.

5단계 (집계·미리 정한 판정) $OUT/aggregate.py ($A/aggregate.py 바탕)
- 문항별 표(점수·같음/중/아님·정답 일치·결함).
- P2 = v2 2개 평균(바닥 실패는 0점), P1 = 1차 2개 평균(이번 블라인드), Mp = 기출 "적절한 것" 6개(SU IU RS HY PJ FL) 평균, M = 기출 8개 평균.
- 판정("적절한 것" 발문, 문구 그대로):
   v2 바닥 실패 ≥ 1                        → "미달(바닥 실패)"
   그렇지 않고 P2 ≥ Mp − 0.4               → "통과('적절한 것'도 기출 수준)"
   그렇지 않고 P2 ≥ Mp − 0.8 이고 P2 > P1   → "나아졌으나 거의"
   그 밖                                   → "미달(규칙 효과 없음)"
- 참고(밑줄 전체): G_all = (P2 두 점수 + 1차 "적절하지 않은 것" 두 점수 1.875·2.000)/4, 1차 M 1.938 과의 차.
- 함께 적기: ㉳ 표시 수(v2 대 v1), 생성 오답의 끝 반전/속 바꿔치기/적용·맞대기 표시 수.
- 결과 $OUT/aggregate-out.md

6단계 (보고서) $OUT/REPORT-ul-b.md (표·판정·문항별 이유 r1-1·r2-1, v2 문항 전문과 kind·twist, 1차 같은 의뢰 문항과 나란히) + REPORT-ul-b-human.md (쉬운 말, 맨 위 판정 문구, v2 문항 2개를 실제 문제 모양으로). 비용 한 줄.

7단계 (커밋) $OUT 아래 이번 파일과 $EI/rules-underline-v2.md, $EI/CLI-ul-b-test.md, $EI/REVIEW-underline-pos-distractors.md 만 git add. 커밋 메시지: "밑줄 이해 규칙 v2('적절한 것' 오답 자리 옮기기) 다시 시험". 푸시. 보고: 커밋 해시, 판정 문구, P2·P1·Mp, 비용. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **목적:** 밑줄 문제 중 약했던 "적절한 것" 문제만 고쳐서, 오답을 "문장 끝 반대말" 대신 "문장 안쪽을 비틀거나 원리를 잘못 적용한 것"으로 만들면 기출 수준에 가까워지는지 봅니다.
- **방법:** 같은 지문에 "적절한 것" 문제 2개만 다시 만들고, 1차 문제 2개·기출 8개와 같은 블라인드에 섞어 채점합니다. 1차와 같은 자리에서 비교되도록 문제가 제자리에 들어갔는지 코드로 확인합니다.
- **다음:** 통과면 우리 지문에서 시험합니다. 아니면 평가자가 기출을 알아봐서 점수가 부푼 것인지(같은 지문의 기출 정보 비대칭 문항은 오답 4개가 다 반전인데 2.0점)부터 따져 봅니다.
