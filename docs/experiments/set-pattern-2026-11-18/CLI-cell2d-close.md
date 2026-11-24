# CLI 지시문: 순서표 ② 마무리 — 기록·커밋·푸시 (웹 2026-11-24, API 비용 없음)

결정: Ghootae, `REVIEW-cell2-r2-web.md` 4절 (가). 이 지시문을 붙여 넣는 것이 커밋·푸시 승인이다.

```
순서표 ② 마무리: 두 칸 '판정 보류' 기록 + 커밋·푸시 (웹 2026-11-24, REVIEW-cell2-r2-web.md 4~5절). API 호출 금지.

0. 지킬 것
   - API·codex 호출 금지. 규칙 파일·생성기 코드·render.mjs·오답 카드 파일 4개는 건드리지 않는다. checkout·stash·restore 금지.
   - SP=docs/experiments/set-pattern-2026-11-18.
1. 전제: git log -1 이 113b9d55(또는 그 뒤). $SP/REVIEW-cell2-r1-web.md, REVIEW-cell2-r2-web.md, CLI-cell2c-anchor-rejudge.md, CLI-cell2d-close.md, REPORT-cell2-v62-r2*.md, cell2/blind-r2/ 있음.
2. $SP/PROGRESS-hard.md:
   a. 맨 위 날짜 줄을 2026-11-24 순서표 ② 반영으로.
   b. 사회 | 표 행: 진척 단계 = "**판정 보류(v6.2, 2026-11-24 순서표 ②, 조세 귀착 기출 지문)**: 2회 판정 '수능 아님' 0/8, 평균 A 1.375·B 1.75, 같은 블라인드 기출 12번 1.25. 평가 흔들림(같은 문항 0.5~1.0 변동, 앵커 13번 2.00→1.25)으로 미리 정한 대로 보류. REVIEW-cell2-r2-web.md". 다음 할 일 = "③ 계획 때 정하는 판정 기준(기출 대비 평균 차이 주 기준 안)으로 소급 여부 결정".
   c. 사회 | 그래프 행: 같은 형식(평균 A 1.375·B 1.50, '수능 아님' 0/8, 기출 12번 1.25) + "생성 그래프 2/2가 곡선·교점형이 아닌 값 선 그래프(관찰). 렌더 고칠 것 후보 4개는 cell2/RENDER-CHECK.md". 다음 할 일 같음.
   d. 지문 생성 진척 표의 사회-경제 줄: "기출 지문 칸 시험 끝(조세 귀착, 순서표 ②). 생성 지문은 순서표 4번째 묶음(L3 2차)".
   e. 맨 아래 기록 한 줄: "2026-11-24 순서표 ② 끝($2.15 + 재판정 0, 커밋 113b9d55·이번). 사회 표·그래프 = 판정 보류(바닥 0/16, 생성 ≥ 같은 블라인드 기출, 평가 흔들림). 순서표 ②의 '생성 먼저'는 '기출 먼저'로 바꿈(Ghootae 19:36). 다음 감사 칸 후보 추가: 평가자 4명 '같음' 횟수 기준의 흔들림(맥락 효과 추정). 다음 = ③ 과학(계획 첫 일: 판정 기준 손질)."
3. memory/CURRENT_STATE.md의 '다음 할 일'을 "순서표 ③ 과학 칸 계획(웹 새 창). 첫 일 = 칸 판정 기준 손질(기출 대비 평균 차이 주 기준 안)"로 고친다. 크기가 늘면 다른 줄을 줄이지 말고 그대로 둔다.
4. 커밋할 파일(먼저 목록을 보여 준다): $SP/PROGRESS-hard.md, memory/CURRENT_STATE.md, $SP/REVIEW-cell2-r1-web.md, $SP/REVIEW-cell2-r2-web.md, $SP/CLI-cell2c-anchor-rejudge.md, $SP/CLI-cell2d-close.md, $SP/REPORT-cell2-v62*.md(1회차 보고서가 113b9d55 뒤 바뀌었으면 포함), $SP/cell2/blind-r2/, $SP/cell2/aggregate.py, $SP/cell2/aggregate-out-r2.md, docs/handoffs/2026-11-24-cell2-done.md(있으면). 그 밖의 파일은 넣지 않는다.
   메시지: "순서표 ②: 사회 표·그래프 판정 보류 기록(앵커 재판정, 평가 흔들림)"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
5. 보고하고 멈춘다: git log -1 --oneline, 푸시 결과, PROGRESS-hard 바뀐 줄 수, git status --short | wc -l.

추정 비용: API 비용 없음.
```

## 설명

- **목적:** ② 칸 결과를 진척표에 적고, 1·2회차 판정 자료를 커밋해 둔다.
- **방법:** PROGRESS-hard의 사회 표·그래프 두 칸을 '판정 보류'로 고치고, 다음 할 일을 ③ 과학으로 적은 뒤 커밋·푸시한다.
- **다음 스텝:** 이 커밋이 끝나면 CLI 세션을 리셋하기 좋은 때다(WORKING-RULES 4절). 웹은 새 창에서 ③ 과학 칸 계획을 시작하고, 첫 일로 판정 기준을 손본다.
