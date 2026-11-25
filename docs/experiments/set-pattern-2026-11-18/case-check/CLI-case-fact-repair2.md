# CLI 지시문: 검사기 v6.5 — M6 별도 호출 + 수리 단계 보완 2개 + 도덕적 운 사례·고체 A-V2 재시험 (웹 2026-11-25 22시대 KST)

근거: $SP/case-check/REVIEW-case-fact-repair-web.md (이 폴더). 앞 커밋 20f80e42.
**추정 비용: 약 $0.8 (상한 $2).** 31문항 무료 재검증(codex) 0원 + 검사·수리 파일 3개(e3f는 문항당 약 $0.02 + 걸리면 수리 약 $0.15) + 노출 수리. 블라인드 0원.
이 지시문을 붙여 넣는 것이 아래 코드 수정, API 실행(상한 $2), 커밋·푸시의 승인이다.

```
검사기 v6.5(CLI-case-fact-repair2.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 앞 지시문(CLI-case-fact-repair.md) 0단계와 같다(오답 카드·그래프 파일 건드리지 않음, 생성 규칙·run.mjs 안 고침, checkout·stash·restore 금지). git log -1이 20f80e42 이후인지 적는다.

1. 질문 문구 v2 무료 재검증 (codex gpt-6.1-sol, 0원)
   a. $CC/CODEX-PROMPT.md를 복사해 $CC/CODEX-PROMPT-v2.md를 만들고, fact_sensitive 설명 끝에 이 문장을 넣는다:
      "선지가 다루는 장면(누가, 무엇 때문에, 어떤 일이 일어났나)은 그대로 두고, 판정 근거가 되는 사실(값, 순서, 누가 무엇을 알았거나 할 수 있었나, 결과의 크기 등)만 바꾼다. 장면 자체를 바꿔야만 참·거짓이 뒤집히면 false로 한다."
   b. make_sheet.py를 고친다: 지문의 ㉮·㉯ 같은 표시가 풀이지에 남게 한다. 무료 검증 때 G16·G18·G20이 null이 된 원인으로 보이는 부분이다. sheets-v2/를 다시 만든다.
   c. 31문항 × 2회를 run.sh와 같은 방식으로 돌린다(out-v2-r1, out-v2-r2). compare.py로 앞 검증과 같은 표 1~4를 낸다 → $CC/compare-output-v2.md.
   d. 멈춤 조건: 기출 걸림이 K2·K4 말고 더 생기거나, 생성 걸림 일치가 20/24 아래로 떨어지면 2단계로 가지 않고 보고한다.

2. 코드 (API 비용 없음) — v6.5
   a. eval-repair.mjs: M6 판정을 e3에서 떼어 별도 호출 e3f를 만든다.
      - 모델: FACT_MODEL(기본 gpt-6.1-sol).
      - 정답을 모르는 상태로 호출하고, 문항 하나당 한 번 부른다.
      - 지시문은 CODEX-PROMPT-v2.md 문구 그대로 쓰고, 출력은 선지별 truth·fact_sensitive·why.
      - e3의 fact_sensitive 칸은 지운다(v6.4 문구 제거).
      - classify-v6은 e3f 결과의 fact_sensitive를 쓴다(classifyV6에 인자 하나 추가, 없으면 M6 계산 안 함).
      - 수리 뒤 재검사(…r)에도 e3f를 다시 부른다.
   b. 수리 보완 1(발문 보존): e4 결과의 stem이 원래 stem과 한 글자라도 다르면 그 문항의 수리는 버리고 원본을 유지한다. 경고 "수리가 발문을 바꿔 되돌림"을 남긴다. 〈보기〉는 바뀌어도 된다.
   c. 수리 보완 2(결함 내보내지 않기): 수리 뒤 재판정에서 defect(정답 유일성 문제)가 나오면 items-final.json의 그 문항에 status:"defect"를 붙인다. leak-fix.mjs는 status가 defect인 문항을 건너뛰고 기록한다. eval-summary에 "결함: 최종본 아님"으로 적는다.
   d. classify-v6.test.mjs: e3f 인자로 M6 시험을 옮기고, 발문 되돌림·결함 표시 시험 2개를 더한다. 전체 통과.
   e. 머리 주석 v6.5 한 줄.

3. 비용 추산(실행 전, 상한 $2).

4. 검사·수리 (API). 입력·폴더:
   - moral-A: IN=$V5/out-o4-regen/gen32-o4-T4-1-A/leakfix/items-leakfix.json → $V5/out-case-m6b/moral-A/
   - moral-B: IN=$V5/out-o4-regen/gen32-o4-T4-1-B/leakfix/items-leakfix.json → $V5/out-case-m6b/moral-B/
   - solid-A: IN=$V5/out-case-m6/solid-A/repair/items-final.json → $V5/out-case-m6b/solid-A/
     (V1은 지난번 수리본 그대로, V2는 원본. 둘 다 다시 검사한다.)
   각각 RULES_V=6 REPAIR=1 → 수리된 파일만 leak-fix.
   기록: 문항별 e3f fact_sensitive 5개와 why, M6 여부, 수리 여부, 발문 되돌림 여부, 결함 표시 여부, 수리 전·후 고친 선지·〈보기〉 문장.

5. 블라인드 (codex, 0원, 평가자 4명 × 2회, seed 20261271·72). 요청문은 지난번과 같다.
   - $CC/blind-moral2/: 도덕 A-V2·B-V2 = 이번 최종본, 수리된 문항은 지난번 판(수리 전)도 함께 + 공손룡 12.
   - $CC/blind-solid2/: 고체 A-V2 이번 최종본(수리됐으면 수리 전 판도) + 지난번 고체 수리 후판 A-V1·B-V1·B-V2(칸 평균용, 그대로) + 플라스틱 10.
   - 점검: 문항 수, KEY, 출처 표기 0, ㉮·㉯ 표시.

6. 집계 $CC/aggregate-m6b.md: 문항별 등급·평균(수리 전·후 나란히), 칸 평균(고체 = A-V1·A-V2·B-V1·B-V2 최종, 도덕 = A-V2·B-V2 최종), 지난번 값(고체 1.375, 도덕 0.688), 자격 기출 회차별 평균, ㉯·㉲ 수, 평가 이유 분류.

7. 보고서 $CC/REPORT-case-fact-repair2.md(측정만) + -human.md(5~8줄). 실제 비용.

8. 커밋(목록 먼저): eval-repair.mjs, classify-v6.mjs, classify-v6.test.mjs, leak-fix.mjs, $V5/out-case-m6b/, $CC/ 새 파일들. 메시지: "검사기 v6.5: M6 별도 호출(e3f) + 수리 발문 보존·결함 내보내지 않기 + 도덕적 운 사례 재시험". push(force 금지).

9. 보고하고 멈춘다: 재검증 표(앞 검증과 나란히), 시험 결과, 문항별 M6·수리 표, 등급표, 칸 평균, 자격 기출, 비용, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **왜:** 지난번에는 같은 질문을 생성 모델(6.2)이 긴 검사표 속에서 답하게 했습니다. 그러자 "장면 자체를 바꾸면 뒤집힌다"는 식으로 모든 선지를 '사실에 달림'으로 처리해, 도덕적 운 문항을 놓쳤습니다. 무료 검증 때처럼 질문 하나만 따로, 6.1 모델로 묻게 바꿉니다. "장면은 그대로 두고 근거 사실만 바꾼다"는 한 문장도 더합니다.
- **어떻게:** 먼저 31문항 무료 재검증으로 새 문장이 정확도를 떨어뜨리지 않는지 봅니다. 그다음 도덕적 운 두 문항과 고체 A-V2에만 새 검사·수리를 돌리고, 블라인드로 봅니다.
- **같이 고치는 것(그래프 스레드에서 넘어온 것):** 수리가 발문을 바꾸면 그 수리는 버립니다. 수리 뒤에도 결함이 남은 문항은 최종본으로 내보내지 않습니다.
- **그다음:** 도덕 칸이 오르면 v6.5를 기본값으로 둡니다. 고체 A-V2처럼 '정답이 지문 한 문장으로 정해지는' 문제가 남으면, 그건 별도 축으로 다룹니다.
