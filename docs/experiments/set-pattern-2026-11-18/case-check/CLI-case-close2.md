# CLI 지시문: 사례 B형 기본값 다시 넣기 + 진척표·인계서 (웹 2026-11-26 14시대 KST)

결정: Ghootae 2026-11-26 13:52 KST 카드 "B형 기본만 다시 넣기". 근거: 청약 철회 재시험(10b37c02, 판정 기준 미리 정함) — 새 B 1.75 통과, A형은 옛 순서 나음.
**API 비용 없음.** 코드 한 곳(기본값), 지문 메타 5개, 문서만 고친다.
이 지시문을 붙여 넣는 것이 아래 수정과 커밋·푸시의 승인이다.

```
사례 B형 기본값 다시 넣기(CLI-case-close2.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log -1이 10b37c02인지 적는다. docs/handoffs/2026-11-26-case-check-done.md 첫 줄에 "변경 끝 (2026-11-26 14시대"가 있는지 확인하고, 없으면 멈추고 보고한다(웹이 Mac에 새로 써 둠).

1. run.mjs 기본값 다시 넣기 (API 비용 없음)
   a. e04c9b01의 run.mjs 변경을 그대로 다시 적용한다:
      git show e04c9b01 -- $V5/run.mjs | git apply
      실패하면 멈추고 보고한다. 결과: CASE_FLOW가 비어 있고 RULES_V=6, MODE=B, 만드는 버전에 case가 있고 지문 분야가 과학이 아니면 lever. CASE_FLOW=lever|off로 덮어씀. 분야를 모르면 오류로 멈춤.
   b. 지문 메타에 분야를 적는다. 아래 5개 passages/<id>/meta.json에 "field" 한 줄만 더하고 다른 키는 건드리지 않는다:
      gongsun-long-later-mohists = "humanities", gen32-o4-T4-1 = "humanities", gen32-T3-2 = "social", disclosure-insider = "social", solid-catalyst = "science"
      다른 지문은 그대로 둔다(사례 B형을 돌릴 때 PASSAGE_FIELD를 주거나 메타에 더한다).
   c. 건조 실행 네 번으로 확인하고, 끝나면 건조 폴더를 지운다:
      - PASSAGE=gen32-T3-2 MODE=B KIND_V1=case KIND_V2=case ONLY=V1 → "[v6.7 사례 순서 기본값] 분야=social … → lever" 줄과 사례 블록이 있어야 한다.
      - 같은 지문 MODE=A → 블록이 없어야 한다.
      - PASSAGE=solid-catalyst MODE=B KIND_V1=case KIND_V2=case → "옛 순서"여야 한다.
      - PASSAGE=gen32-T3-2 MODE=B KIND_V1=case KIND_V2=case CASE_FLOW=off → 블록이 없어야 한다.
      classify-v6 시험이 전체 통과하는지 확인한다.

2. 진척표 $SP/PROGRESS-hard.md
   - 표 '인문 | 사례·상황' 칸 맨 앞에 이 문구를 넣는다: "**L3 통과(B형 새 순서, 2026-11-26: 도덕적 운 새 칸 1.542 vs 옛 0.625, 공손룡 B 2.0(옛 1.0)·A 0.58(옛 2.0). 기본값 = 인문·사회 B형 CASE_FLOW=lever, A형 옛 순서. handoffs/2026-11-26-case-check-done.md)** ← "
   - 표 '사회 | 사례·상황' 칸 맨 앞에 이 문구를 넣는다: "**B형 새 순서 L3 통과(2026-11-26 청약 철회, 기준 미리 정한 재시험: 새 B 1.75 vs 참고 옛 B 1.08, 기출 공시 12번 2.0. A형은 옛 1.08 > 새 0.58 → A형 옛 순서. CLI-case-lever5, 10b37c02)** ← "
   - 표 '과학 | 사례·상황' 칸 맨 앞에 이 문구를 넣는다: "(2026-11-26 새 순서 시험: 고체 촉매 새 칸 0.917 vs 옛 1.104, 오르지 않음 → 과학 사례는 옛 순서) "
   - 기록 맨 끝에 한 줄을 더한다: "- 2026-11-26 사례 검사 기준 스레드 끝: 검사기 M6 경로 닫음. 수리 보완 2개(발문 보존·결함 제외) 유지. 생성 순서 = 인문·사회 B형 CASE_FLOW=lever 기본(run.mjs v6.7, 메타 field), A형·과학 옛 순서. 한 번 넣었다 되돌린 뒤(e04c9b01→3da0d63c) 기준 미리 정한 재시험(10b37c02)으로 같은 결론 확인. A형 새 순서 약점 = 부정 발문 정답이 '~하지 않았다면' 가정형으로 지문 원칙 뒤집기. 비용 약 $9.5."

3. 커밋(목록 먼저): $V5/run.mjs, passages 메타 5개, $SP/PROGRESS-hard.md, docs/handoffs/2026-11-26-case-check-done.md, $CC/CLI-case-close2.md.
   커밋 전 grep으로 run.mjs에 "v6.7"이 있는지, 진척표에 "B형 새 순서 L3 통과"가 있는지 본다.
   메시지: "사례 생성 순서 기본값 다시 넣음: 인문·사회 B형 = lever, A형·과학 = 옛 순서(재시험 10b37c02 근거) + 진척표·인계서". push(force 금지).

4. 보고하고 멈춘다: 건조 네 개 결과, 시험 결과, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 고르신 대로, 인문·사회 사례의 "가장 적절한 것" 문항(B형)은 앞으로 자동으로 새 순서로 만듭니다. "적절하지 않은 것" 문항(A형)과 과학 사례는 옛 순서 그대로입니다.
- **어떻게:** 한 번 넣었다가 되돌린 코드(e04c9b01)를 그대로 다시 적용합니다. 지문 메타 파일에 분야(인문·사회·과학)를 적어서, 과학 지문에서는 새 순서가 자동으로 꺼지게 합니다.
- **왜:** 매번 스위치를 기억해 켜지 않아도 되게 하려는 것입니다.
- **비용:** API를 부르지 않으니 0원입니다.
- **그다음:** 이 커밋으로 이 스레드는 마무리합니다.
