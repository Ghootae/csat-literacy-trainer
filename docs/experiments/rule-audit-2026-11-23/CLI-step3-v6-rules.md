# CLI 지시문: 규칙 감사 3단계 반영 — v6 규칙 파일 만들기 (웹 2026-11-23 23:3x KST)

결정: Ghootae 2026-11-23 23:28 KST, 수정안 v6 "추천대로 전부". 이 지시문을 붙여 넣는 것이 아래 커밋·푸시의 승인이다.

```
규칙 감사 3단계 반영: v6 규칙 파일 만들기 (웹 2026-11-23 23:3x, Ghootae "추천대로 전부")

0. 지킬 것
   - v5 규칙 파일(docs/experiments/deep-item-v5-2026-11-18/의 rules-*.md, kind-*.md, polish-checklist.md, readability-guide-v4.md)은 고치지 않는다. 새 파일만 만든다.
   - run.mjs, eval-repair.mjs 등 코드는 이번에 고치지 않는다(6단계 grep 보고만).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)의 커밋 안 된 변경은 건드리지 않는다. git checkout·stash·restore로 파일을 되돌리지 않는다. .git 잠금 파일이 있으면 풀릴 때까지 기다린다.
1. 전제 파일 확인(없거나 '상태: **결정'이 없으면 멈추고 묻는다):
   docs/experiments/rule-audit-2026-11-23/PROPOSAL-rules-v6.md
   docs/experiments/rule-audit-2026-11-23/REVIEW-rules-2026-11-23-audit.md
2. PROPOSAL 1절 '파일 구성'과 9절 대응표대로 docs/experiments/deep-item-v5-2026-11-18/ 안에 다음 v6 파일을 새로 만든다:
   rules-common-v6.md, strategies-v6.md, rules-A-v6.md, rules-B-v6.md, kind-case-v6.md, kind-view-v6.md, kind-table-v6.md, kind-graph-v6.md, polish-checklist-v6.md
   - 문장의 출처: PROPOSAL 2·3·5·6·7절 문안은 그대로 옮긴다. 대응표가 "옮김/그대로"라고 한 v5 규칙은 v5 원문(왜·점검 질문·예시 포함)을 그대로 옮기고 새 번호를 붙인다. "지움(중복)"은 옮기지 않는다.
   - 각 규칙 끝에 옛 번호를 괄호로 남긴다(예: "M1 (옛 C5)"). 공통 방식에는 PROPOSAL의 기출 숫자와 (경계) 표시를 남긴다.
   - rules-common-v6.md 맨 위에 다섯 층 표(PROPOSAL 1절 표)를 둔다. strategies-v6.md 맨 위에 출력 형식(PROPOSAL 6-1)을 둔다.
   - kind 파일 머리말의 "공통 원칙 C1~C10(C23)에 더해"는 "rules-common-v6의 P·M·R·OP와 strategies-v6에 더해"로 바꾼다. 갈래 안의 옛 번호 참조(C3·C4·C9·C23 등)는 대응표의 새 번호로 바꾼다.
   - 문안을 고치지 않는다. 옮기다 어색하거나 겹치거나 대응표에 없는 문장이 나오면 고치지 말고 보고서에 후보로 적는다.
3. 옮김 확인(grep): 
   - 새 파일 전체에서 옛 번호가 괄호 밖에 남았는지: grep -nE "\b(C[0-9]{1,2}|K-S[0-9]+|K-E[0-9]+|규칙 [0-9]+)\b" 결과 중 "(옛 " 괄호 밖의 것을 목록으로.
   - 꼭 있어야 할 것: M4 문안의 "많아야 1개", R2의 "선지가", G4의 "없다", M11의 "사례에서", S2·S16·S17의 "B 양식".
   - 꼭 없어야 할 것: "C23을 따른다", "가장 긴 선지가 되지 않게", "반드시 하나 만든다".
4. 대응표 점검: PROPOSAL 9절 표의 v5 규칙마다 v6 어느 파일·번호에 들어갔는지(또는 지움) 한 줄씩 적은 표를 docs/experiments/rule-audit-2026-11-23/REPORT-v6-migration.md로 쓴다. 빠진 v5 규칙이 있으면 맨 위에 적는다.
5. 규칙 개수 비교: v5 조합(A×사례, B×사례, A×관점, B×표)과 v6 같은 조합에서 생성 단계가 읽는 의무 규칙 수와 선택 전략 수를 REPORT-v6-migration.md 끝에 적는다.
6. 코드 grep 보고(고치지 않는다): docs/experiments/deep-item-v5-2026-11-18/run.mjs와 eval-repair.mjs에서 규칙 번호나 규칙 문장을 다시 적은 곳을 찾아 줄 번호와 함께 REPORT-v6-migration.md에 적는다.
   grep -nE "C[0-9]{1,2}|K-S[0-9]+|K-E[0-9]+|규칙 [0-9]+|가장 긴|겹치지 않게|사례 건너뛰기" 두 파일
7. 커밋할 파일(먼저 목록을 보여 준다):
   docs/experiments/rule-audit-2026-11-23/PROPOSAL-rules-v6.md, REVIEW-rules-2026-11-23-audit.md, CLI-step3-v6-rules.md, REPORT-v6-migration.md
   docs/experiments/deep-item-v5-2026-11-18/ 아래 새 *-v6.md 9개
   memory/CURRENT_STATE.md (아래 8단계)
   .omc/, .DS_Store, 그 밖의 수정·미추적 파일은 넣지 않는다.
   메시지 예: "규칙 감사 3단계: v6 규칙 파일(다섯 층, M4·선택 전략 목록) + 이전 대응표"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
8. memory/CURRENT_STATE.md '현재 우선순위'의 "다음 = 3단계 규칙 검토(...)" 부분을 다음으로 바꾼다:
   "규칙 감사 3단계 결정(2026-11-23 23:28 Ghootae 추천대로 전부, PROPOSAL-rules-v6.md·REVIEW-rules-2026-11-23-audit.md). v6 규칙 파일 작성(deep-item-v5-2026-11-18/*-v6.md). 다음 = 웹이 코드 수정안(run.mjs 지시문, eval-repair e3 칸·사유 재분류, strategies 칸) → CLI 반영 → R1~R3·S12 재표시(비용 없음) → 4단계 시험 생성(확인용 6개, 순서표 수정 포함)."
   줄 구조가 맞지 않으면 뜻을 지키며 넣고 어디에 넣었는지 보고한다.
9. 보고하고 멈춘다: 만든 파일 목록과 크기, 3단계 grep 결과, 4단계 빠진 규칙 수, 5단계 규칙 수 표, 6단계 코드 grep 줄 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l.

추정 비용: API 비용 없음(문서 작성·grep·커밋만. CLI 구독 안에서 처리).
```
