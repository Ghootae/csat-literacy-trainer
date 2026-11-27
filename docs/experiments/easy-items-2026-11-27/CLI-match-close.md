# CLI 지시문: 내용 일치 규칙 v3 확정 기록(D-0238) 반영·커밋

- 추정 비용: **API 비용 없음** (파일 고치기와 커밋만)
- 최소 실행: 생성·판정은 하지 않는다.
- 어려운 문제 확정 커밋(D-0237, `CLI-l4-five-close.md`)이 아직 안 돌았으면 이 지시문이 먼저 그것을 끝낸다.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-match-close.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
작업 폴더: /Users/mac/Projects/csat-literacy-problem-solving-mvp, 브랜치 experiment/problem-solving-mvp.
지키기: git checkout·stash·restore·reset·force push 쓰지 말 것. 규칙 파일(rules-*-v6.md, kind-*.md, rules-match-v*.md)은 고치지 말 것. API 호출 0회.

0. D-0237 먼저: memory/DECISIONS.md 에 D-0237 줄이 없으면 docs/handoffs/CLI-l4-five-close.md 의 코드 블록 지시를 그대로 실행해 커밋·푸시까지 끝낸다(그 지시문의 보고도 한다). 이미 있으면 건너뛴다.

1. 전제 확인. 하나라도 없으면 멈추고 보고:
   - memory/decisions/D-0238-match-items-rules-v3.md 에 "# 내용 일치 문항 생성 규칙 v3 확정" 이 있다.
   - docs/experiments/easy-items-2026-11-27/rules-match-v3.md 가 커밋돼 있다(07321d0d).
   - docs/handoffs/ROADMAP-generation.md 에 "밤 11시 반" 이 있다.
   - memory/DECISIONS.md 에 D-0237 줄은 있고 D-0238 줄은 아직 없다.

2. memory/DECISIONS.md 표의 D-0237 줄 바로 아래에 한 줄 추가:
| [`D-0238`](./decisions/D-0238-match-items-rules-v3.md) | accepted | 내용 일치 문항 생성 규칙 v3 확정: gpt-6.2-sol + rules-match-v3(맞는 선지 다시 말하기, 오답 한 곳 비틀기, '적절한 것' 오답 관계 비틀기 ≥2). 우리 지문 1.97 vs 기출 1.80. 세트 조립기는 이 설정을 부른다 | 사용자 결정 |

3. memory/CURRENT_STATE.md 의 '다음 할 일'(또는 같은 뜻의 절)에 한 줄 추가:
   "- 내용 일치 문항 규칙 v3 확정(D-0238). 다음 = 밑줄 이유 문항(기출 분석부터). 진행 상황은 docs/handoffs/ROADMAP-generation.md."

4. grep 으로 확인: D-0238 이 DECISIONS.md·CURRENT_STATE.md 에 있는지.

5. 아래 파일만 git add 해서 커밋하고 푸시한다. 목록에 없는 미커밋 변경은 건드리지 않는다.
   - memory/decisions/D-0238-match-items-rules-v3.md
   - memory/DECISIONS.md, memory/CURRENT_STATE.md
   - docs/handoffs/ROADMAP-generation.md
   - docs/experiments/easy-items-2026-11-27/CLI-match-close.md
   - docs/experiments/easy-items-2026-11-27/CLI-match-b-test.md (이미 커밋됐으면 건너뜀)
   커밋 메시지: "내용 일치 문항 규칙 v3 확정(D-0238) + 로드맵"

6. 보고: 커밋 해시(0단계에서 커밋했으면 그것도), 바뀐 파일 목록, 4 확인 결과. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **무엇을:** 내용 일치 문제를 지금 규칙으로 만들기로 한 결정을 정식 기록으로 남기고 커밋합니다. 어려운 문제 확정 커밋이 아직이면 그것도 먼저 합니다.
- **왜:** 나중에 세트를 조립할 때 "내용 일치는 이 규칙"을 바로 찾을 수 있게 하려는 것입니다.
- **다음:** 밑줄 이유 문제의 기출 분석을 시작합니다(웹, 0원).
