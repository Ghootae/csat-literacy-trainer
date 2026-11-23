# CLI 지시문: 다시 쓴 규칙 4개 재표시 + 코드 손질 2곳 (웹 2026-11-24 00:4x KST)

이 지시문을 붙여 넣는 것이 아래 실행·커밋·푸시의 승인이다.

```
규칙 감사 3단계 확인: R1·R2·R3·S12 재표시 + v6 코드 손질 2곳 (웹 2026-11-24, 표 BOGI-SCHEMA-v1.md)

0. 지킬 것
   - v5·v6 규칙 파일과 *-SCHEMA-*.md는 고치지 않는다.
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다.
   - 생성·검사 API(run.mjs, eval-repair.mjs 실제 실행)는 부르지 않는다.
1. 전제 확인(없으면 멈추고 묻는다): docs/experiments/rule-audit-2026-11-23/BOGI-SCHEMA-v1.md, main-r2/packets/ (26문항), REPORT-v6-code.md.

[A. 코드 손질 — REPORT-v6-code 후보 2·3에 대한 웹 결정]
2. run.mjs와 eval-repair.mjs에서 RULES_V=6일 때 v6 규칙 파일(rules-common-v6, strategies-v6, rules-*-v6, kind-*-v6, polish-checklist-v6)을 읽은 직후, 모델에게 보내는 문자열에서 "(옛 …)" 표시를 지운다. 정규식 예: /\s*\(옛 [^()]*\)/g. 파일 자체는 고치지 않는다. 지운 뒤 남은 "(옛" 개수를 DRY_RUN=1(지문 disclosure-insider, A·B, case·view)로 확인한다(0이어야 한다).
3. eval-repair.mjs e4 지시에서 RULES_V=6일 때 "오답 역할" 문장을 뺀다(S9는 선택 전략). "(v5.3) 거울 짝" 문장은 "(M5) 거울 짝"으로 바꾼다. v5 경로 문자열은 그대로다.
4. node --check 두 파일, classify-v6.test.mjs 다시 실행, v5 경로 바이트 비교(REPORT-v6-code 5단계 3번과 같은 방법)를 다시 한다.
   후보 1(3b·3c가 strategies를 흘리면 채움)은 그대로 둔다.

[B. 재표시]
5. 새 폴더 main-r3/ 에 main-r2의 26문항 packet을 복사하고 BOGI-SCHEMA-v1 '스크립트가 하는 일'대로 packet마다 〈보기〉 문장 번호(b1…), cand_bogi(c1…), cand_passage(p1…)를 붙인다(main-r3/build_packets.py). 후보 수를 문항별로 main-r3/CANDIDATES.csv에 적는다.
6. 판정자 셋: main-r2와 같은 방식(J1 claude -p, J2·J3 codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral -C <저장소 밖 새 임시 폴더>), 9·9·8문항씩 새 세션 3번. 폴더에는 해당 packet과 BOGI-SCHEMA-v1.md만 둔다. 지시 문장 뒤에 packet 파일 이름 목록을 붙인다. 이전 표시표·결과는 보여 주지 않는다. 형식 실패는 그 문항만 새 세션으로 한 번 다시 묻는다.
7. 집계 main-r3/aggregate.py (BOGI-SCHEMA-v1 '일치율과 준수 계산' 그대로):
   a. 칸별 일치율 K1, K2, K3, K4a, K4b: 전체 / 감사 갈래별(사례·관점·자료·기타). 칸마다 ≥0.75 / 0.60~0.75 / <0.60 판정. 다시 표시하지 않는다.
   b. 문항별 다수값 main-r3/ITEMS-v1-majority.csv: 문항 키, 감사 갈래, 발문, K1 "서술자 풀이" 후보 수, K2 다수 목록과 그중 〈보기〉에 그대로 나오는 낱말, K3 빈 문장 수(소개 제외), K4 적용 여부·준수 여부. 그리고 R1·R2·R3·S12 문항 준수(예/아니오/해당 없음).
8. 보고서 main-r3/REPORT-main-r3.md: 칸별 일치율·판정 표, 문항 준수 표(전체·갈래별·사례 A/B·관점 A), 판정자 답이 출제 정답과 다른 문항, 일치율 0.75 미만 칸의 갈린 문항 상위 5개(셋의 값·note 원문), K2에서 〈보기〉에 그대로 나온 낱말 목록. 층 판정·권고는 쓰지 않는다(웹이 한다).
9. 커밋할 파일(먼저 목록을 보여 준다): BOGI-SCHEMA-v1.md, CLI-step3c-remark.md, PROPOSAL-code-v6.md(웹이 상태 줄을 고친 판), main-r3/ 전체, 손질한 run.mjs·eval-repair.mjs, REPORT-v6-code.md에 2~4단계 결과를 덧붙인 판.
   그 밖의 파일은 넣지 않는다. 메시지 예: "규칙 감사 3단계 확인: R1·R2·R3·S12 재표시(main-r3) + v6 프롬프트에서 옛 번호 표시 제거"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
10. 보고하고 멈춘다: 2~4단계 결과, 칸별 일치율 표, 문항 준수 요약, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l.

추정 비용: 코덱스 2명 × 26문항 = 과금 없음(ChatGPT 계정). claude -p 1명 × 26문항 = 구독이면 과금 없음(API 키 과금이면 약 $3 안팎). 코드 손질·스크립트는 비용 없음.
최소 실행 검토: 다시 쓴 4개 규칙의 칸만 묻는다(v0의 나머지 칸·선지 표시는 재사용). 시범 없이 본 자료 한 판으로 일치율과 준수율을 함께 얻고, 판정자마다 한 번만 돌린다.
```
