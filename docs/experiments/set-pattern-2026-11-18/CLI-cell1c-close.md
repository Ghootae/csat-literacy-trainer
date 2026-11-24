# CLI 지시문: 순서표 ① 마무리 기록·커밋 (웹 2026-11-24, API 비용 없음)

```
순서표 ① 마무리: PROGRESS-hard·CURRENT_STATE 기록 + 커밋 (웹 2026-11-24, REVIEW-cell1-r2-web.md)

0. 지킬 것: 규칙·코드 파일 수정 금지, 오답 카드 4파일 건드리지 않기, checkout·stash·restore 금지, force push 금지. API 호출 없음.
   SP=docs/experiments/set-pattern-2026-11-18
1. 전제 확인: git log -1 이 5fbe77cf(또는 그 뒤), $SP/REVIEW-cell1-r2-web.md, $SP/CLI-cell1c-close.md, docs/handoffs/2026-11-24-cell1-done.md 있음. 없으면 멈추고 묻는다.
2. $SP/PROGRESS-hard.md (맨 위 날짜 2026-11-24 유지)
   a. '사회 | 외부 글·관점' 행의 진척 단계 칸 앞에 덧붙인다:
      **L2 통과(표본 1, 2026-11-24 순서표 ① v6.2 2회차: 정보 A 수능 같음 4/4, B 중 4, 두 회차 수능 아님 0. 주의: 같은 블라인드의 앵커 v5 정보 A가 회차 간 2.00→1.00으로 움직여 흔들림 폭 안일 수 있음, REVIEW-cell1-r2-web.md)** ← 이전:
      다음 할 일 칸: "기록만"으로 바꾼다.
   b. '인문 | 사례·상황' 행의 진척 단계 칸 앞에 덧붙인다:
      **거의 통과(v6.2, 2026-11-24 순서표 ① 2회: 공손룡 A 수능 같음 2·2, B 0·1, 수능 아님 0, 기출 12번 4/4, REVIEW-cell1-r2-web.md)** ← 이전:
      다음 할 일 칸: "기록만. 반복 원인 '정답이 〈보기〉 한 단계로 정해짐'은 다음 감사 칸 후보"로 바꾼다.
   c. 맨 아래 기록에 한 줄:
      - 2026-11-24 순서표 ① 끝(v6.2 2회, $3.86, 커밋 2e997963·5fbe77cf). 사회 관점(정보) = L2 통과(표본 1, 앵커 흔들림 주의), 인문 사례(공손룡) = 거의 통과(v6.2). 두 회차 v6.2 8문항 수능 아님 0, P2(옛 C22) 작동(정보 B ㉳ 0). 반복 원인 '정답이 〈보기〉 한 단계·지문 한 문장으로 정해짐' → 다음 감사 칸 후보 1순위. GN1 자리 조건(중간 자리 '지문만' 오답) → G 후보 메모. 다음 = 순서표 ② 경제 지문(REVIEW-step4-r3-web.md 2절).
3. memory/CURRENT_STATE.md: 규칙 감사·칸 생성 재개를 적은 줄을 찾아 끝에 "순서표 ① 끝(사회 관점 L2 통과·인문 사례 거의 통과, v6.2). 다음 = ② 경제 지문 v3.1 생성 → 사회 표·그래프." 를 덧붙인다. 20KB 넘지 않게.
4. grep으로 2·3이 들어갔는지 확인.
5. 커밋할 파일(먼저 목록을 보여 준다): $SP/PROGRESS-hard.md, memory/CURRENT_STATE.md, $SP/REVIEW-cell1-r2-web.md, $SP/CLI-cell1c-close.md, docs/handoffs/2026-11-24-cell1-done.md. 그 밖의 파일은 넣지 않는다.
   메시지 예: "순서표 ① 끝: 사회 관점 L2 통과(표본 1)·인문 사례 거의 통과(v6.2), 기록"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
6. 보고하고 멈춘다: 4단계 grep 결과, git log -1 --oneline, 푸시 결과.
```

추정 비용: API 비용 없음(파일 기록·커밋만).
