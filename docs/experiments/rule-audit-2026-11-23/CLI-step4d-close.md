# CLI 지시문: 규칙 감사 4단계 마무리 기록 (웹 2026-11-24 12시 KST)

전제: Ghootae가 `step4/REVIEW-step4-r3-web.md` 2·3절을 승인했다(이 지시문을 붙여 넣는 것이 아래 문서 수정·커밋·푸시의 승인이다).

```
규칙 감사 4단계 마무리: v6.2 채택 기록 + 순서표 확정 + GN1 괄호 손질 (웹 2026-11-24, step4/REVIEW-step4-r3-web.md)

0. 지킬 것: API 실행 금지. v5 파일·SCHEMA 고치지 않음. 오답 카드 4파일 안 건드림. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다. RA=docs/experiments/rule-audit-2026-11-23, SP=docs/experiments/set-pattern-2026-11-18, V5=docs/experiments/deep-item-v5-2026-11-18.
1. 전제 확인(없으면 멈추고 묻는다): $RA/step4/REVIEW-step4-r3-web.md, $RA/step4/REPORT-step4-r3.md, 커밋된 v6.2 반영(rules-common-v6.md에 GN1).
2. $V5/rules-common-v6.md GN1 문단: "(생성 기준, 옛 C23 되살림)" → "(생성 기준)", "(다른 소재, 옛 C23 예)" → "(다른 소재)". 다른 글자는 바꾸지 않는다. RULES_V=6 DRY_RUN=1(disclosure-insider A·case)로 3단계 지시문에 "옛 C23" 0개, GN1 문단 1개를 확인하고 건조 실행 폴더를 지운다. v5 경로는 이 파일을 읽지 않으므로 바이트 비교는 생략한다.
3. $SP/PLAN-cell5-generated-L3.md 8절 제목 바로 아래에 한 줄: "> 2026-11-24: 이 표는 rule-audit-2026-11-23/step4/REVIEW-step4-r3-web.md 2절 순서표로 대신한다(v6.2 채택)."
4. $SP/PROGRESS-hard.md:
   - 맨 위 날짜 줄을 2026-11-24로.
   - 사회 사례 칸 '근거·현재 수준' 앞에 "**v6.2 재확인(2026-11-24 4단계): 공시 A·B 수능 같음 3회씩(1.75)**"을 더한다.
   - 인문 관점 칸 진척 단계를 "**L2 통과(표본 1, 2026-11-24 규칙 감사 4단계 v6.2: 의미 B 수능 같음 3, A 중 4 — A는 '같은 표본 설정이라 핵심 판단이 쉬움')**"로 바꾸고, 다음 할 일은 "기록만"으로.
   - 맨 아래 기록에 한 줄: "- 2026-11-24 규칙 감사 4단계 끝(v5·v6 시험 3회, $7.20). v6(0/16 수능 같음) → v6.1 깊이 전략 의무(0/16) → v6.2 옛 C23을 생성 기준 GN1로 되살림(9/16, 같은 회차 v5 +0.56) → **v6.2 채택**. 검사기는 v6.1(관점 수리 끔). 칸 생성 재개, 순서 = REVIEW-step4-r3-web.md 2절(① 사회 관점·인문 사례 → ⑥ 경제 표·그래프 → ⑦ 과학 → L3 2차). 앞으로 칸 생성은 RULES_V=6."
5. memory/CURRENT_STATE.md 97줄 근처 규칙 감사 부분의 '다음 = 4단계 시험 생성 계획…'을 다음으로 바꾼다: "규칙 감사 끝(4단계 시험 3회, 2026-11-24): 생성 규칙 v6.2 채택(다섯 층 + 생성 기준 GN1 = 옛 C23), 검사기 v6.1(관점 수리 끔), 칸 생성 재개(RULES_V=6). 다음 = 순서표 ① 사회 관점·인문 사례 L2(웹 칸 계획 먼저). 근거: docs/experiments/rule-audit-2026-11-23/step4/REVIEW-step4-r3-web.md, 인계 docs/handoffs/2026-11-24-rule-audit-step4-done.md"
6. 결정 기록: 저장소의 결정 기록 규칙(memory/decisions/, 다음 D-번호)에 맞춰 하나 만든다. 제목 "규칙 감사 결론: 생성 규칙 v6.2 채택". 본문은 REVIEW-step4-r3-web.md 1절 표와 '4단계에서 배운 것' 1~4를 요약하고, 순서표는 2절을 가리킨다. DECISIONS 목록·INDEX에 붙이는 규칙이 있으면 따른다.
7. 커밋할 파일(먼저 목록을 보여 준다): $RA/step4/REVIEW-step4-r3-web.md, $RA/CLI-step4d-close.md, $V5/rules-common-v6.md, $SP/PLAN-cell5-generated-L3.md, $SP/PROGRESS-hard.md, memory/CURRENT_STATE.md, 새 결정 기록과 그 목록 파일, docs/handoffs/2026-11-24-rule-audit-step4-done.md(웹이 Mac에 써 둠, 있으면). 그 밖의 파일은 넣지 않는다.
   메시지 예: "규칙 감사 끝: 생성 규칙 v6.2 채택(D-xxxx), 순서표 확정, 칸 생성 재개"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
8. 보고하고 멈춘다: 2단계 grep 결과, 결정 번호, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 그 뒤 Ghootae가 /clear 한다(CLI 세션 리셋하기 좋은 시점).

추정 비용: API 비용 없음(문서 수정·건조 실행만).
```
