# CLI 지시문: 갈림 사실 순서(CASE_FLOW=lever)를 고체 촉매 사례 칸에서 한 번 더 시험 (웹 2026-11-26 11시대 KST)

결정: Ghootae 2026-11-26 11:07 KST 카드 "고체 촉매 사례에서 한 번 더".
근거: $CC/REPORT-case-lever2.md (커밋 a4be5f98, 도덕적 운 사례 칸 1.542, 옛 판 대비 +0.917).
**추정 비용: 약 $1.6 (상한 $3).** 이전 실측 근거:
- 고체 A·B 생성 1회는 $0.70~0.77인데, 그중 1-search·2-select가 약 $0.25다. 이번에는 옛 결과를 복사해 이 두 단계를 다시 부르지 않으므로 생성은 약 $0.5 × 2다.
- 검사·수리는 $0.22~0.41 × 2, 노출 수리는 약 $0.03 × 2다.
- 블라인드는 codex라 0원이다.
이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $3)과 커밋·푸시의 승인이다. 코드는 고치지 않는다.

```
고체 촉매 사례 lever 시험(CLI-case-lever3.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: CLI-case-lever.md 0단계와 같다. 오답 카드 파일 4개·그래프 파일은 건드리지 않고, 규칙 파일·run.mjs·classify-v6.mjs·eval-repair.mjs도 고치지 않는다. checkout·stash·restore 금지, force push 금지. git log -1이 a4be5f98 이후인지 적는다.

1. 준비 (API 비용 없음)
   a. 두 양식 모두 V1·V2가 사례(case)라서, 지난번 보완(재료 끊기)이 그대로 걸린다. 1-search·2-select 결과는 3단계에 들어가지 않으므로, 옛 결과를 복사해 다시 부르지 않는다(call()은 파일이 있으면 건너뜀).
      - $V5/out-cell3-v62/solid-catalyst-A/{1-search.md,2-select.md} → $V5/out-case-lever3/solid-catalyst-A/
      - $V5/out-cell3-v62-regen/solid-catalyst-B/{1-search.md,2-select.md} → $V5/out-case-lever3/solid-catalyst-B/
   b. 건조 실행: RULES_V=6 CASE_FLOW=lever DRY_RUN=1 PASSAGE=solid-catalyst MODE=A KIND_V1=case KIND_V2=case OUT_NAME=out-case-lever3-dry
      - 3-assemble.dry.txt에 "[재료 없음]" 한 줄과 사례 블록(pair 포함)이 있고, 2-select 본문이 없는지 확인한다.
      - 끝나면 건조 폴더를 지운다.
   c. 비용 추산: 옛 usage.json에서 3-assemble~4-solve 합 × 2 + 검사·수리 × 2 + 노출 수리. 상한 $3을 넘을 것 같으면 멈추고 보고한다.

2. 생성 (API). A를 먼저, B를 나중에. zsh에서는 export 방식으로 넘긴다. 로그는 $V5/out-case-lever3-solid-catalyst-<A|B>.log.
   - A: RULES_V=6 CASE_FLOW=lever PASSAGE=solid-catalyst MODE=A KIND_V1=case KIND_V2=case OUT_NAME=out-case-lever3
   - B: RULES_V=6 CASE_FLOW=lever PASSAGE=solid-catalyst MODE=B KIND_V1=case KIND_V2=case OUT_NAME=out-case-lever3 AVOID_OUT=out-case-lever3
   각각 run.mjs → eval-repair.mjs(RULES_V=6 REPAIR=1, OUT_DIR=…/repair) → 필요하면 leak-fix.mjs(OUT_DIR=…/leakfix). 지도는 기존 것을 재사용한다. 1회뿐이고, 결함이어도 다시 만들지 않고 기록만 한다.
   기록 $CC/lever3-record.md, 문항 4개마다:
   - lever-check(처음·재호출·최종 일치/유사/없음), pair 이름
   - principleCards·leverTable 전문
   - 선지별 facts·misread
   - 수리 여부, 발문 되돌림, 결함 표시
   - 옛 판(아래 4의 옛 최종본)과 새 판의 〈보기〉·선지·정답을 나란히

3. 결정 선지 원문 표(웹 손 분류용, 분류하지 않음). 부정 발문은 정답, 긍정 발문은 오답 4개를 새·옛 나란히 적는다.

4. 블라인드 $CC/blind-lever3/ (codex gpt-6.1-sol, 0원). 요청문은 $SP/o4/blind-T4 CODEX-PROMPT 그대로다.
   - 문항 9개:
     - 새 A-V1, A-V2, B-V1, B-V2 (out-case-lever3 최종)
     - 옛 A-V1, A-V2, B-V1, B-V2 (out-case-m6/solid-A·solid-B 최종본 = 지난번 블라인드에 쓴 수리 후 최종, leakfix가 있으면 그것)
     - 자격 기출 플라스틱 10번 (calib-judge/plastic-10)
   - 평가자 4명 × 3회(seed 20261301·02·03), 순서는 회차마다 섞는다.
   - 점검: 문항 수, KEY, 출처 표기 0.

5. 집계 $CC/aggregate-lever3.md (aggregate_lever.py 재사용, 입력만 바꿈):
   - 문항별 회차별 등급·평균
   - 칸 평균(회차별 + 3회 합): 새 칸(4문항) / 옛 칸(4문항) / 차이. 양식별(A 2문항, B 2문항) 평균도 따로.
   - 자격 기출 회차별
   - ㉯·㉲ 문항별
   - 평가 이유 분류(지난번과 같은 묶음)

6. 보고서 $CC/REPORT-case-lever3.md(측정만) + -human.md(5~8줄). 실제 비용(usage.json 합, 입력 $2/M·출력 $10/M).

7. 커밋(목록 먼저): $V5/out-case-lever3/, 새 로그, $CC/blind-lever3/, $CC/lever3-record.md, $CC/aggregate-lever3.md, $CC/REPORT-case-lever3*.md, 이 지시문.
   메시지: "사례 갈림 사실 순서: 고체 촉매 사례 칸 재생성 시험". push(force 금지).

8. 보고하고 멈춘다: 건조 확인, 비용 추산·실제, lever-check 표, 칸 평균(새·옛·차이, 회차별·양식별), 자격 기출, ㉯·㉲, 평가 이유 분류, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 도덕적 운에서 통과한 새 순서를 고체 촉매 사례 칸에 그대로 씁니다. 새 순서는 원리 카드 → 〈보기〉와 갈림 사실 표 → 사실을 잘못 읽은 오답 → 정답 마지막입니다. 이 칸은 과학 지문이고, 지난번 0.94로 미달이었습니다. 코드는 고치지 않고 스위치만 켭니다.
- **어떻게:** 문항 4개(A·B 양식 × V1·V2)를 새로 만듭니다. 옛 최종본 4개, 기출 플라스틱 10번과 함께 한 블라인드에 넣어 평가자 4명이 3회 봅니다.
- **왜:** 도덕적 운 결과는 문항 2개·생성 1회였습니다. 다른 종류의 지문(과학, 수치·조건이 많은 사례)에서도 오르는지 봐야 기본값으로 둘 근거가 생깁니다.
- **판정:** 새 칸 평균이 1.5 이상이고 옛 칸보다 0.5 이상 높으면 통과입니다. 그러면 RULES_V=6 사례 갈래의 기본값을 새 순서로 바꾸는 지시문을 드립니다. 과학 지문에서만 안 오르면, 표를 보고 어디서 막혔는지(갈림 사실이 수치뿐이라 너무 쉬운지 등) 따로 봅니다.
