# CLI 지시문: 순서표 ④ 마무리 커밋 (웹 2026-11-25 20시 KST, API 비용 없음)

```
순서표 ④ 마무리(CLI-o4d-close.md): 웹이 고친 진척표와 ④ 인계서를 커밋·푸시한다. API 호출 없음.

0. 지킬 것: 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)와 그래프 스레드 파일(CLI-graphC-test.md, $SP/graphC/, $V5/out-graphC*)은 커밋에 넣지 않는다. checkout·stash·restore 금지. SP=docs/experiments/set-pattern-2026-11-18.
1. 전제 확인(없으면 멈추고 보고): $SP/PROGRESS-hard.md 첫 줄에 "순서표 ④ 끝", 본문에 "L3 미달(④" 1곳. docs/handoffs/2026-11-25-cell4-o4-done.md 있음.
2. git log --oneline -3 으로 ④ 3단계 커밋이 있는지 본다. 없으면 CLI-o4c-regen.md 8단계 목록을 이 커밋에 같이 넣는다.
3. 커밋(목록을 먼저 보여 준다): $SP/PROGRESS-hard.md, docs/handoffs/2026-11-25-cell4-o4-done.md, $SP/CLI-o4d-close.md.
   메시지: "순서표 ④ 끝: 사회 표·인문 관점 L3 통과, 인문 사례 L3 미달 → 사례 규칙 검토"
   git push origin experiment/problem-solving-mvp (force 금지).
4. 보고: git log -3 --oneline, 푸시 결과, git status --short | wc -l.
```

## 설명
- **목적:** ④ 결과(진척표 갱신, 인계서)를 저장소에 남긴다.
- **방법:** 파일 세 개만 커밋한다. 모델 호출이 없어 비용은 0이다.
- **다음 스텝:** 사례 문항 규칙 검토(웹)와 그래프 스레드의 사회 그래프 시험.
