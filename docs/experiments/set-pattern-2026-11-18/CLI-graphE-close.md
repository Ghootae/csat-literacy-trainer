# CLI 지시문: 그래프 작업 닫기 기록·커밋 (웹 2026-11-25 21시 50분 KST, API 비용 없음)

결정: Ghootae 21:49 "통과로 기록하고 닫기"(`REVIEW-graphD-web.md` 3절 (가)).

```
그래프 닫기(CLI-graphE-close.md): 기록과 커밋만. API 호출 없음. 코드·규칙 파일은 고치지 않는다.

0. 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않고 커밋에 넣지 않는다. checkout·stash·restore 금지. 다른 작업(사례 검사 등)의 파일은 커밋에 넣지 않는다.
1. 전제: git log에 dc5bb8c2. $SP/REVIEW-graphD-web.md, docs/handoffs/2026-11-25-graph-done.md 있음.
2. $SP/PROGRESS-hard.md 의 사회 그래프 칸 기록(조세 귀착 '거의 1.44' 줄 근처)에 한 줄 더한다:
   "- 사회 그래프 L3(생성 지문 가격 상한제, 2026-11-25): 통과 — 렌더러 수리 뒤 참고 칸 1.81(A 1.63, 옛 B 2.00). 규칙 칸 0.81은 무효(새 B 0점 = 수리 e4가 발문 〈보기〉 조건 삭제, 그래프 탓 0). 그래프 2차 안 함. 커밋 12fe1acb·6a6e237e·dc5bb8c2, REVIEW-graphD-web.md, handoffs/2026-11-25-graph-done.md."
   같은 문서에 열린 과제 목록이 있으면 "수리 e4 조건 문장 삭제 방지 / 재판정 결함 문항 내보내지 않기" 한 줄을 더한다.
3. memory/CURRENT_STATE.md 에 그래프 작업이 끝났다는 한 줄과 위 두 과제를 적는다(다음 할 일을 바꾸지는 않음).
4. 커밋(목록을 먼저 보여 준다): $SP/REVIEW-graphD-web.md, $SP/CLI-graphE-close.md, $SP/PROGRESS-hard.md, memory/CURRENT_STATE.md, docs/handoffs/2026-11-25-graph-done.md.
   메시지 예: "그래프 작업 닫기: 사회 그래프 L3 통과(렌더 수리 뒤 1.81) 기록, 수리 단계 과제 인계"
   git push origin experiment/problem-solving-mvp (force 금지).
5. 보고: git log -1 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명
- **목적:** 그래프 작업의 결론(사회 그래프 L3 통과, 그래프 2차 안 함)과 넘길 과제(수리 단계 조건 삭제)를 진척표와 인계서에 남긴다.
- **방법:** 진척표·현재 상태 문서에 몇 줄을 더하고 검토 글·인계서와 함께 커밋한다.
- **다음 스텝:** 그래프 스레드는 닫는다. 수리 단계 과제는 따로 다룬다.
