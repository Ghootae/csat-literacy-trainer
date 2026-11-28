# CLI 지시문: 어휘 문항 규칙 v3 확정 마무리 커밋 (D-0240)

- 추정 비용: **API 비용 없음**
- 하는 일: 결정 기록 D-0240를 넣고 결정 목록·현재 상태·로드맵을 고쳐 한 번에 커밋한다. CURRENT_STATE 는 20480바이트 한도 때문에 8번 줄 문구만 바꾼다.

CLI에 붙여 넣을 한 줄:

```
docs/experiments/easy-items-2026-11-27/CLI-vocab-close.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
작업 폴더: /Users/mac/Projects/csat-literacy-problem-solving-mvp, 브랜치 experiment/problem-solving-mvp.
지키기: git checkout·stash·restore·reset·force push 금지. 규칙 파일(rules-*-v6.md, kind-*.md, rules-match-v*.md, rules-underline-v*.md, rules-vocab-v*.md) 수정 금지. API 호출 0회.

1. 전제 확인. 하나라도 없으면 멈추고 보고:
   - memory/decisions/D-0240-vocab-items-rules-v3.md 에 "# 어휘 문항 생성 규칙 v3 확정" 이 있다.
   - vocab-d 결과가 커밋돼 있다(git log 에 "어휘 규칙 v3(바꿔 쓰기 오답 고르는 법) 우리 지문 다시 시험").
   - docs/handoffs/ROADMAP-generation.md 에 "어휘 문제 규칙 확정" 이 있다.
   - memory/DECISIONS.md 에 D-0239 줄은 있고 D-0240 줄은 아직 없다.

2. memory/DECISIONS.md 표의 D-0239 줄 바로 아래에 한 줄 추가:
| [`D-0240`](./decisions/D-0240-vocab-items-rules-v3.md) | accepted | 어휘 문항 생성 규칙 v3 확정: gpt-6.2-sol + rules-vocab-v3(꼴 A 문맥적 의미: 같은 말 묶음 금지 / 꼴 B 바꿔 쓰기: 안 맞는 낱말은 다른 뜻 짝). 꼴 A 우리 지문 1.94, 꼴 B 0.88~1.00(기출 1.84) → 꼴 B는 세트 시험 때 사람 확인 | 사용자 결정 |

3. memory/CURRENT_STATE.md 8번 줄에서
   "밑줄 대상 이해 문항 규칙 v3 확정(D-0239). 다음 = 어휘 문항."
   을
   "밑줄 대상 이해 문항 규칙 v3 확정(D-0239), 어휘 문항 규칙 v3 확정(D-0240). 다음 = 세트 조립(쉬운 문항 3종 + 어려운 문항 칸)."
   으로 바꾼다. 문구가 정확히 없으면 8번 줄 안의 "다음 = …" 부분만 위 뜻으로 바꾸고 보고. 새 줄은 더하지 않는다.
   wc -c 로 20480 이하 확인. 넘으면 멈추고 보고.

4. node scripts/validate-memory.mjs 통과 확인. 실패하면 멈추고 보고.

5. grep 확인: DECISIONS.md 에 D-0240 줄 1개, CURRENT_STATE.md 에 D-0240 1회 이상.

6. 아래 파일만 git add (이미 커밋된 것·없는 것은 건너뜀). 목록 밖 미커밋 변경은 건드리지 않는다.
   - memory/decisions/D-0240-vocab-items-rules-v3.md
   - memory/DECISIONS.md, memory/CURRENT_STATE.md
   - docs/handoffs/ROADMAP-generation.md
   - docs/handoffs/easy-items/2026-11-28-easy-items-done.md
   - docs/experiments/easy-items-2026-11-27/CLI-vocab-close.md
   커밋 메시지: "어휘 문항 규칙 v3 확정(D-0240) + 쉬운 문항 3종 마무리 인계 + 로드맵"
   푸시.

7. 보고: 커밋 해시, CURRENT_STATE 바이트 수, validate 결과, 바뀐 파일 목록. 그 뒤 멈춘다.
```

---

## 쉬운 설명

- **목적:** 어휘 문제 규칙을 확정했다는 기록과, 쉬운 문제 3종이 끝났다는 인계 문서를 저장소에 남깁니다.
- **방법:** 결정 문서 하나와 인계 문서 하나를 넣고 결정 목록·현재 상태·로드맵을 고쳐 한 번에 커밋합니다. 모델 호출은 없습니다.
- **다음:** 세트 조립(지문 하나에 쉬운 문제 3종과 어려운 문제를 묶어 한 세트로)은 새 스레드에서 시작하는 것을 추천합니다.
