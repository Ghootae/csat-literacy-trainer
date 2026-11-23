# CLI 지시문: R2·R3 층 변경 반영 (웹 2026-11-24 00:4x KST)

결정: Ghootae 2026-11-24 00:44 KST, `REPORT-rule-compliance-r3.md` 3절 "추천대로". 이 지시문을 붙여 넣는 것이 아래 커밋·푸시의 승인이다.

```
규칙 감사 3단계 끝: R2·R3 층 변경 반영 (웹 2026-11-24, REPORT-rule-compliance-r3.md 3절)

0. 지킬 것: v5 규칙 파일은 고치지 않는다. v5 동작(RULES_V 없음)을 바꾸지 않는다. API 실행 금지. 오답 카드 파일 4개 건드리지 않기. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다.
1. 전제 확인(없거나 '상태: **결정'이 없으면 멈추고 묻는다): docs/experiments/rule-audit-2026-11-23/REPORT-rule-compliance-r3.md
2. rules-common-v6.md:
   - R2를 3절 "R2 (작성 규칙으로 남는 부분)" 문안으로 바꾼다. 옛 R2의 점검 질문 (3)과 지문 용어 예('주파수' 대신 '초당 떨림 수' 등)는 남기고, (1)(2)와 "반납 완료·면제" 예, "대개 1~2개" 문장은 S18로 옮긴다.
   - 관점 방식에 V3을 더한다(3절 V3 문안, 끝에 "(옛 C2 앞부분, 관점 6/6)"). 
   - R3을 지우고 그 자리에 "R3 → 선택 전략 S19로 옮김(2026-11-24, 기출 11/26)" 한 줄을 남긴다. R3의 "같은 사안 밖에 덧붙인 사건" 문장은 S5에 이미 있는지 확인만 한다.
   - 다섯 층 표 아래나 M 머리말 등 R2·R3을 가리키는 곳을 찾아 맞춘다.
3. strategies-v6.md: S18(사례·표·그래프), S19(모두)를 목록 표와 본문에 더한다(3절 문안 + 옮겨 온 R2 점검 질문·예시 / 옛 R3 점검 질문). 출처 표시는 "(옛 C2·K-S1·A1·B2 앞부분)", "(옛 K-S2·K-E8·A2, 옛 R3)".
4. kind-view-v6.md: 관점 방식 목록에 V3을 더한다. kind-case-v6.md 등에서 R2·R3을 의무처럼 가리키는 줄이 있으면 S18·S19로 바꾼다. grep -n "R2\|R3" 로 v6 파일 전체를 확인해 목록을 보고한다.
5. 코드(RULES_V=6 분기만):
   - run.mjs 3단계 A·B 지시 1번의 "선지가 판정하는 개념어는 비운다(R2)" → "〈보기〉의 지문 용어는 돌려 말하지 않는다(R2). 관점 갈래는 선지가 판정하는 개념어를 〈보기〉에 쓰지 않는다(V3)."
   - classify-v6.mjs STRATEGY_USE에 S18: 사례·표·그래프(A·B), S19: 모두(A·B)를 더한다. classify-v6.test.mjs에 S18을 관점에서 고르면 경고가 나는 사례 하나를 더한다.
   - polish-checklist-v6, readability-guide는 바꾸지 않는다.
6. 확인: node --check 두 파일, 테스트 전부, v5 경로 바이트 비교(이전과 같은 방법), RULES_V=6 DRY_RUN=1(disclosure-insider, A·B, case·view)에서 "(옛" 0개와 "판정하는 개념어는 비운다" 0개.
7. REPORT-v6-code.md 끝에 이번 변경(파일:줄)과 6단계 결과를 덧붙인다.
8. 커밋할 파일(먼저 목록을 보여 준다): REPORT-rule-compliance-r3.md, CLI-step3d-r2r3.md, REPORT-v6-code.md, main-r3/ 중 지난 커밋 뒤 바뀐 것, 고친 v6 규칙 파일, run.mjs, classify-v6.mjs, classify-v6.test.mjs, docs/handoffs/2026-11-24-rule-audit-step3-done.md, memory/CURRENT_STATE.md.
   메시지 예: "규칙 감사 3단계 끝: R2 관점 방식 V3 + S18, R3 → S19 (재표시 main-r3)"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
9. memory/CURRENT_STATE.md의 규칙 감사 '다음' 부분을 다음으로 바꾼다: "규칙 감사 3단계 끝(v6 규칙·코드, RULES_V=6; 재표시 main-r3, R2·R3 층 변경). 다음 = 4단계 시험 생성 계획(웹, 새 대화창). 인계: docs/handoffs/2026-11-24-rule-audit-step3-done.md"
10. 보고하고 멈춘다: 4단계 grep 목록, 6단계 결과, git log -1 --oneline, 푸시 결과, git status --short | wc -l. 그 뒤 Ghootae가 /clear 한다.

추정 비용: API 비용 없음(문서·코드 수정과 가짜 데이터 시험만).
```
