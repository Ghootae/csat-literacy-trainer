# CLI 지시문: 사례 생성 순서 결정 기록 + 인계서 (웹 2026-11-26 12시대 KST)

결정: Ghootae 2026-11-26 12:43 KST 카드 "B형 기본, A형 대안으로 기록".
**API 비용 없음.** 코드 한 곳(기본값)과 문서만 고친다.
이 지시문을 붙여 넣는 것이 아래 코드·문서 수정과 커밋·푸시의 승인이다.

```
사례 순서 결정 기록(CLI-case-close.md). V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개·그래프 파일은 건드리지 않는다. 규칙 파일(rules-*-v6.md, kind-*-v6.md, strategies-v6.md)도 고치지 않는다. checkout·stash·restore 금지, force push 금지. git log -1이 19fa11bb 이후인지 적는다. 이 폴더에 handoff 파일(2026-11-26-case-check-done.md)이 있는지 확인하고, 없으면 멈추고 보고한다.

1. run.mjs 기본값 (API 비용 없음)
   a. CASE_FLOW 처리를 바꾼다. 지금은 CASE_FLOW=lever일 때만 켜진다. 앞으로는 이렇게 한다.
      - CASE_FLOW가 비어 있고 RULES_V=6, MODE=B, 버전 갈래가 case이며 지문 분야가 과학이 아니면, lever로 본다.
      - CASE_FLOW=lever: 지금처럼 모든 사례 버전에 켠다(A형 대안 재생성용).
      - CASE_FLOW=off: 끈다.
   b. 지문 분야 판정: passages/<id>/ 안의 메타 파일에 분야(field/domain/subject 등)가 있으면 그것을 쓴다. 없으면 PASSAGE_FIELD=science|humanities|social 환경변수로 받는다. 값이 둘 다 없고 MODE=B이며 사례 버전이 있으면, "분야를 모름: CASE_FLOW=lever 또는 off를 정하라"는 오류를 내고 멈춘다. 어떤 메타 파일을 썼는지 보고에 적는다.
   c. 머리 주석 한 줄을 넣는다: "v6.7 (2026-11-26) 사례 순서 기본값: 인문·사회 B형 = lever, A형·과학 = 옛 순서. CASE_FLOW=lever|off로 덮어씀. handoffs/2026-11-26-case-check-done.md".
   d. 건조 실행 세 번으로 기본값을 확인한다.
      - PASSAGE=gongsun-long-later-mohists MODE=B KIND_V1=case KIND_V2=case → 블록이 있어야 한다.
      - 같은 지문 MODE=A → 블록이 없어야 한다.
      - PASSAGE=solid-catalyst MODE=B → 블록이 없어야 한다. 분야가 없으면 PASSAGE_FIELD를 준다.
      끝나면 건조 폴더를 지운다. classify-v6 시험이 전체 통과하는지 확인한다.

2. 문서
   a. $SP/PROGRESS-hard.md
      - 표 '인문 | 사례·상황' 칸 맨 앞에 이 문구를 넣는다: "**L3 통과(새 순서, 2026-11-26 도덕적 운: 새 칸 1.542 vs 같은 블라인드 옛 0.625, 4명×3회, A-V2 lever 보완판 + B-V2 lever. 공손룡 확인: B형 lever 2.0(옛 1.0), A형 lever 0.58(옛 2.0) → B형 기본·A형 대안. handoffs/2026-11-26-case-check-done.md)** ← "
      - 표 '과학 | 사례·상황' 칸 맨 앞에 이 문구를 넣는다: "(2026-11-26 새 순서 시험: 고체 촉매 새 칸 0.917 vs 옛 1.104, 오르지 않음 → 과학 사례는 옛 순서 유지) "
      - 기록 맨 끝에 한 줄을 더한다: "- 2026-11-26 사례 검사 기준 스레드 끝: 검사기 M6 경로 닫음(질문 3종 미달, 파이프라인 0건). 수리 보완 2개(발문 보존·결함 제외) 유지. 생성 순서 변경(CASE_FLOW=lever) = 인문·사회 B형 기본, A형 대안, 과학 옛 순서. 같은 문항도 칸 평균 ±0.4 흔들림 → 새·옛 같은 블라인드 3회 비교 추천. 비용 약 $7.7. 커밋 926c6ffb·bdedeff5·c15ce049·a4be5f98·cacb3769·19fa11bb·이번."
   b. 인계서: 프로젝트가 docs/handoffs/2026-11-26-case-check-done.md에 저장해 둔 파일을 그대로 커밋에 넣는다(웹이 Mac에 저장). 없으면 멈추고 보고한다.

3. 커밋(목록 먼저): $V5/run.mjs, $SP/PROGRESS-hard.md, docs/handoffs/2026-11-26-case-check-done.md, $CC/CLI-case-close.md.
   메시지: "사례 생성 순서 기본값: 인문·사회 B형 = 갈림 사실 순서(lever), A형·과학 = 옛 순서 + 진척표·인계서". push(force 금지).

4. 보고하고 멈춘다: 건조 세 개 결과, 분야 판정에 쓴 파일, 시험 결과, git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 고르신 대로 규칙을 코드와 진척표에 적습니다.
  - 인문·사회 사례의 "가장 적절한 것" 문항(B형)은 앞으로 자동으로 새 순서로 만듭니다.
  - "적절하지 않은 것" 문항(A형)과 과학 사례는 옛 순서 그대로입니다.
  - A형에서 문제가 보이면 CASE_FLOW=lever를 켜서 다시 만들 수 있습니다.
- **왜:** 매번 스위치를 기억해 켜지 않아도 되게 하려는 것입니다. 과학 지문에 잘못 켜지지 않도록 지문 분야를 보고 정합니다.
- **비용:** API를 부르지 않으니 0원입니다.
- **그다음:** 이 커밋이 끝나면 이 스레드는 마무리합니다.
