# CLI 지시문: 마무리 커밋 이어서 (CURRENT_STATE 20KB 한도 + D-0237 함께)

- 추정 비용: **API 비용 없음**
- 배경: `CLI-match-close.md` 실행이 `validate-memory` 에서 멈춤(CURRENT_STATE.md 20793바이트 > 20480). D-0237 줄은 작업 폴더에 있으나 커밋 안 됨.
- 결정(웹, Ghootae 승인 범위 = 마무리 커밋): 줄일 곳 = 7번 목록의 셋째 하위 줄("④·⑤·수리 방향·기출 오답 태깅·규칙 감사…"로 시작하는 줄). 그 내용은 PROGRESS-hard·로드맵·D-0236/D-0237·체크포인트에 이미 다 있으므로 짧은 안내 줄로 바꾼다. 8·9번은 한 줄로 합친다. D-0237 파일과 그 마무리 파일들도 같은 커밋에 넣는다.

```
작업 폴더: /Users/mac/Projects/csat-literacy-problem-solving-mvp, 브랜치 experiment/problem-solving-mvp.
지키기: git checkout·stash·restore·reset·force push 금지. 규칙 파일(rules-*-v6.md, kind-*.md, rules-match-v*.md) 수정 금지. API 호출 0회. 지금 작업 폴더의 변경(직전 CLI-match-close 실행분)은 되돌리지 말고 이어서 고친다.

1. memory/CURRENT_STATE.md
   a. 7번 목록에서 "   - ④·⑤·수리 방향·기출 오답 태깅·규칙 감사 0~4단계 끝" 으로 시작하는 줄 하나를 통째로 아래 한 줄로 바꾼다:
      "   - 칸별 진행·판정은 [PROGRESS-hard](../docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md), 전체 진행은 `docs/handoffs/ROADMAP-generation.md`. 지금 참: 생성 규칙 v6.2(D-0236), 다섯 칸 L4 확정(D-0237). 이력: [체크포인트](./checkpoints/2026-11-24-current-state-trim.md)."
   b. 8번(D-0237)과 9번(D-0238) 줄을 지우고 그 자리에 한 줄:
      "8. 어려운 문제 다섯 칸 L4 확정(D-0237), 내용 일치 문항 규칙 v3 확정(D-0238). 다음 = 밑줄 대상 이해 문항. 진행 상황은 `docs/handoffs/ROADMAP-generation.md`."
   c. 5번 줄 끝의 "다음: ③ 쉬운 유형 생성기." 를 "다음: 8번 참고." 로 바꾼다.
   d. wc -c 로 20480 이하인지 확인. 넘으면 멈추고 보고(더 줄이지 말 것).

2. docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md 에 "L4 확정(D-0237" 이 없으면 docs/handoffs/CLI-l4-five-close.md 코드 블록의 3번(PROGRESS-hard 수정)만 그대로 한다. 있으면 건너뛴다.

3. node scripts/validate-memory.mjs 통과 확인. 실패하면 멈추고 보고.

4. grep 확인: DECISIONS.md 에 D-0237·D-0238 줄 각 1개, CURRENT_STATE.md 에 D-0237·D-0238 각 1회 이상, PROGRESS-hard.md 에 D-0237.

5. 아래 파일만 git add (이미 커밋된 것·없는 것은 건너뜀). 목록 밖 미커밋 변경은 건드리지 않는다.
   - memory/decisions/D-0237-hard-cells-l4-five.md, memory/decisions/D-0238-match-items-rules-v3.md
   - memory/DECISIONS.md, memory/CURRENT_STATE.md
   - docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md
   - docs/handoffs/ROADMAP-generation.md, docs/handoffs/WORKING-RULES.md, docs/handoffs/CLI-l4-five-close.md
   - docs/handoffs/2026-11-27-generation-roadmap.md, docs/handoffs/2026-11-27-hard-cells-status.md, docs/handoffs/2026-11-27-caseA-done.md
   - docs/experiments/easy-items-2026-11-27/CLI-match-close.md, CLI-match-close-fix.md, CLI-match-b-test.md, REVIEW-underline-gichul-first-look.md, data/underline-items.json
   커밋 메시지: "어려운 문제 다섯 칸 L4 확정(D-0237) + 내용 일치 규칙 v3 확정(D-0238) + 로드맵·CURRENT_STATE 정리"
   푸시.

6. 보고: 커밋 해시, CURRENT_STATE 바이트 수, validate 결과, 바뀐 파일 목록. 그 뒤 멈춘다.
```
