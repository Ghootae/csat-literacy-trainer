# CLI 지시문: 어려운 문제 다섯 칸 확정 기록 반영·커밋

- 추정 비용: **API 비용 없음** (파일 고치기와 커밋만)
- 최소 실행: 생성·판정은 하지 않는다.

```
작업 폴더: /Users/mac/Projects/csat-literacy-problem-solving-mvp, 브랜치 experiment/problem-solving-mvp.
지키기: git checkout·stash·restore·reset·force push 쓰지 말 것. 규칙 파일(rules-*-v6.md, kind-*.md)은 고치지 말 것.

0. 비용 자체 추산: 이 작업은 API 호출 0회다. 호출이 필요해 보이면 멈추고 보고한다.

1. 전제 확인. 하나라도 없으면 멈추고 보고:
   - memory/decisions/D-0237-hard-cells-l4-five.md 에 "# 어려운 문제 다섯 칸 확정 (L4)" 이 있다.
   - docs/handoffs/ROADMAP-generation.md 에 "어려운 문제 확정" 이 있다.
   - docs/handoffs/WORKING-RULES.md 에 "## 6. 진행 상황 문서" 가 있다.
   - memory/DECISIONS.md 에 D-0237 줄이 아직 없다.

2. memory/DECISIONS.md 표의 D-0236 줄 바로 아래에 한 줄 추가:
| [`D-0237`](./decisions/D-0237-hard-cells-l4-five.md) | accepted | 어려운 문제 다섯 칸(인문 사례·관점, 사회 사례·표·그래프) L4 확정: v6.2·검사기 v6.1·수리 v6.3, 사례 B형 lever 자동 기본값, A형 옛 순서. 세트 조립기는 이 설정을 부른다 | 사용자 결정 |

3. docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md:
   - 다음 다섯 행(인문 사례·상황, 인문 외부 글·관점, 사회 사례·상황, 사회 표, 사회 그래프)의 '진척 단계' 칸 맨 앞에 `**L4 확정(D-0237, 2026-11-27)** ← ` 를 붙인다. 나머지 글은 그대로 둔다.
   - 맨 위 제목 줄 괄호 안 맨 앞에 "2026-11-27 다섯 칸 L4 확정(D-0237), " 을 넣는다.

4. memory/CURRENT_STATE.md 의 '다음 할 일'(또는 같은 뜻의 절)에 한 줄 추가:
   "- 어려운 문제 다섯 칸 L4 확정(D-0237). 다음 = 쉬운 문제 생성기(내용 일치부터). 진행 상황은 docs/handoffs/ROADMAP-generation.md."

5. grep으로 1~4가 들어갔는지 확인한다(D-0237 이 DECISIONS.md·PROGRESS-hard.md·CURRENT_STATE.md 에 각각 있는지).

6. 아래 파일만 git add 해서 커밋하고 푸시한다. 목록에 없는 미커밋 변경은 건드리지 않는다.
   - memory/decisions/D-0237-hard-cells-l4-five.md
   - memory/DECISIONS.md, memory/CURRENT_STATE.md
   - docs/experiments/set-pattern-2026-11-18/PROGRESS-hard.md
   - docs/handoffs/ROADMAP-generation.md, docs/handoffs/WORKING-RULES.md
   - docs/handoffs/2026-11-27-generation-roadmap.md, docs/handoffs/2026-11-27-hard-cells-status.md
   - docs/handoffs/2026-11-27-caseA-done.md (이미 커밋됐으면 건너뜀)
   커밋 메시지: "어려운 문제 다섯 칸 L4 확정(D-0237) + 진행 상황 로드맵·작업 규칙 6절"

7. 보고: 커밋 해시, 바뀐 파일 목록, 1~5 확인 결과. 그 뒤 멈춘다.
```
