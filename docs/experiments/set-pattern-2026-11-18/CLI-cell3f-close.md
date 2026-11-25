# CLI 지시문: 순서표 ③ 마무리 커밋 (웹 2026-11-25 08시 KST, API 비용 없음)

```
③ 마무리: 웹이 고친 기록·인계서 커밋 (CLI-cell3f-close.md)

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에도 넣지 않는다. checkout·stash·restore 금지. API 호출 없음.
1. 확인(없으면 커밋하지 말고 보고):
   - docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md 에 "L2 통과(4-3, 2026-11-25 ③-2" 1곳
   - docs/experiments/deep-item-v5-2026-11-18/strategies-v6.md 에 "| S18 | 깊이 | 사례·표·그래프·실험 |" 1곳
   - memory/CURRENT_STATE.md 에 "순서표 ①·②·③ 끝" 1곳
   - docs/handoffs/2026-11-25-cell3-done.md, docs/experiments/set-pattern-2026-11-18/REVIEW-cell3e-web.md 있음
2. node docs/experiments/deep-item-v5-2026-11-18/classify-v6.test.mjs 통과 확인(strategies 표만 바뀌었으니 그대로 통과해야 함).
3. 커밋(목록을 먼저 보여 준다): 위 5개 파일 + docs/experiments/set-pattern-2026-11-18/CLI-cell3f-close.md.
   메시지 예: "순서표 ③ 끝: 과학 실험 L2 통과 기록, S18 표에 실험 추가, 인계서"
   git push origin experiment/problem-solving-mvp (force 금지).
4. 보고: git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```
