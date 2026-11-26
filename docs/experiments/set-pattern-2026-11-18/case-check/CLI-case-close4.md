# CLI 지시문: 결합 선지 탐색 마무리 기록 (웹 2026-11-27 02시대 KST)

근거: LINK_SEARCH=2 시험(5a550458)의 미리 정한 종합 판정이 "채택 안 함 → A형은 옛 순서로 닫음"이다. 지시문 CLI-case-link2.md에서 이 경로의 마지막 시험으로 약속했다.

**API 비용 없음.** 문서만 고친다. 코드는 건드리지 않는다(스위치는 기본값이 아닌 채로 남는다).
이 지시문을 붙여 넣는 것이 아래 문서 수정과 커밋·푸시의 승인이다.

```
결합 선지 탐색 마무리(CLI-case-close4.md). SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 오답 카드 파일 4개·그래프 파일·읽기 습관 파일, 규칙 파일, 코드는 건드리지 않는다. checkout·stash·restore·reset 금지, force push 금지. git log -1이 5a550458 이후인지 적는다. docs/handoffs/2026-11-26-case-check-done.md에 "## 7. 결합 선지 탐색"이 있는지 확인하고, 없으면 멈추고 보고한다(웹이 Mac에 써 둠).

1. $SP/PROGRESS-hard.md 기록 맨 끝에 한 줄을 더한다:
   "- 2026-11-27 사례 A형 결합 선지 탐색 끝(LINK_SEARCH=1 d808e038, 선별기 7d1ec483, LINK_SEARCH=2 5a550458): 미리 정한 판정 모두 미채택 → A형은 옛 순서 유지. 배운 점: '이어진 사건' 지시로 사건 나열 0, 짝 양쪽 decider로 정답 시비 0, 그러나 두 원리 결합은 말로 시켜도 실현 안 됨(1점대). 남긴 스위치 LINK_SEARCH=1|2(기본값 아님). handoffs/2026-11-26-case-check-done.md 7절."

2. 커밋(목록 먼저): $SP/PROGRESS-hard.md, docs/handoffs/2026-11-26-case-check-done.md, $CC/CLI-case-close4.md.
   메시지: "사례 A형 결합 선지 탐색 마무리: A형 옛 순서 유지, 배운 점 기록". push(force 금지).

3. 보고하고 멈춘다: git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명 (쉬운 말)

- **무엇을:** 오늘 밤 결합 선지 시험 세 번의 결과와 배운 점을 인계서 7절과 진척표 한 줄로 남기고 커밋합니다.
- **왜:** 약속한 기준에 못 미쳐 A형은 옛 순서로 닫았습니다. 다음 세션이 무엇을 해 봤는지 알 수 있게 하려는 것입니다.
- **비용:** 0원입니다.
