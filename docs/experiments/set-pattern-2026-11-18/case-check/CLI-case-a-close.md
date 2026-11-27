# CLI-case-a-close — 사례 A형 연구 마무리 기록 (2026-11-27, 웹 작성)

- 근거: Ghootae 결정(2026-11-27 10:40 KST) "통과로 닫고 보류 기록". a-recheck(4601facc) 판정 = 생성 A형이 보통 기출 수준.
- **추정 비용: 0원** (문서만, API·codex 없음). 최소 실행이 곧 전체 실행.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/case-check/CLI-case-a-close.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

```
[지시] 사례 A형 연구 마무리. 0원. SP=docs/experiments/set-pattern-2026-11-18, CC=$SP/case-check.

0. 지킬 것: 코드·규칙 파일·오답 카드·그래프·읽기 습관 파일은 건드리지 않는다. checkout·stash·restore·reset·force push 금지. git log 에 bbe268c8 이 있는지 적는다.
   있어야 할 것(웹이 Mac에 써 둠): docs/handoffs/2026-11-27-caseA-done.md, $CC/REVIEW-a-recheck-web-2026-11-27.md, $CC/CLI-case-pair-remeasure.md, 이 파일. 없으면 멈추고 보고.

1. $SP/PROGRESS-hard.md 기록 맨 끝에 한 줄을 더한다(문구 그대로):
   "- 2026-11-27 사례 A형 연구 끝(lure-check 150f2127, a-recheck 4601facc, 0원): A형 사례 칸 = 통과(보통 기출 수준: 생성 1.15 / 보통 기출 1.00 / 상위 기출 1.88). 판정 기준 변경: A형 사례는 같은 형식(단독) 블라인드의 보통 기출 A형 대비. 1.5 절대 기준은 기출 A형도 3/12만 넘음. 미끼 가설·단계 수·웹이 뽑은 상위 특성 4개(top-features bbe268c8)는 점수를 설명 못 함. 묶음↔단독 블라인드 점수 차 큼(도덕 pair3 1.83→1.00). 보류 후보: 짝 카드 단독 재측정(CLI-case-pair-remeasure.md, 0원), 후보 여럿 고르기(~$2), 다른 사례 칸 판정 다시 보기. handoffs/2026-11-27-caseA-done.md."

2. 커밋(목록 먼저 보여 줌): $SP/PROGRESS-hard.md, docs/handoffs/2026-11-27-caseA-done.md, $CC/REVIEW-a-recheck-web-2026-11-27.md, $CC/CLI-case-pair-remeasure.md, $CC/CLI-case-a-close.md. 다른 파일은 add 하지 않는다.
   메시지: "사례 A형 연구 마무리: 보통 기출 대비 통과, 보류 후보 기록". push(force 금지). 거부되면 fetch 후 merge 하고 다시 push, 보고.

3. 보고하고 멈춘다: git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```
