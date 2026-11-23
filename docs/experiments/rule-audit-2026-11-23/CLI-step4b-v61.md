# CLI 지시문: v6.1 반영 + 4단계 2회차 시험 (웹 2026-11-24 08시 KST)

결정: Ghootae 2026-11-24 07:41 KST, 카드 "v6.1로 고쳐 한 번 더 (추천)". 문안: `PROPOSAL-v61.md`. 이 지시문을 붙여 넣는 것이 아래 규칙·코드 반영, API 실행(상한 $3), 커밋·푸시의 승인이다.

```
규칙 감사 4단계 2회차: v6.1(깊이 전략 1개 이상 + 사례 A형 S13 먼저 + 관점 수리 끔) 반영 후 같은 4칸 재시험 (웹 2026-11-24, PROPOSAL-v61.md)

0. 지킬 것
   - v5 규칙 파일, *-SCHEMA-*.md, leak-fix.mjs는 고치지 않는다. v5 동작(RULES_V 없음)은 바이트 단위로 그대로여야 한다.
   - 규칙 문안은 PROPOSAL-v61.md 2절 문장을 그대로 옮긴다. 문안을 고치고 싶으면 보고서에 후보로만 적는다.
   - 오답 카드 파일 4개는 건드리지 않는다. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다.
   - 생성 모델 gpt-6.2-sol, dispute-fix 안 돌림, 판정 codex gpt-6.1-sol. 비용 상한 $3.
   - V5=docs/experiments/deep-item-v5-2026-11-18, RA=docs/experiments/rule-audit-2026-11-23.
1. 전제 확인(없으면 멈추고 묻는다): $RA/PROPOSAL-v61.md, $RA/step4/REPORT-step4-trial.md, $RA/step4/REVIEW-step4-trial-web.md, 4단계 v5 최종본 4개(out-cell4 A-V1 leakfix, out-cell5 B-V1, out-step4-v5 의미 A·B leakfix).

[A. 반영, 비용 없음]
2. strategies-v6.md: 머리 줄에 "v6.1 (2026-11-24, PROPOSAL-v61.md)"을 더하고, 목록 표에 '종류' 열(깊이/배치, PROPOSAL 2-1 표)과 '사용법'의 바뀐 세 줄을 넣는다.
3. kind-case-v6.md: 원칙에 KC2(PROPOSAL 2-2 인용 문장)를 KC1 뒤에 넣는다.
4. 코드(PROPOSAL 3절): run.mjs 3단계 A·B 지시 0번, classify-v6.mjs(STRATEGY_USE type, checkStrategiesV6 경고 (a)(b), classifyV6 관점 수리 끔), classify-v6.test.mjs 사례 셋.
5. 확인: grep으로 2~4가 들어갔는지, node --check, 테스트 전부, v5 경로 바이트 비교(이전과 같은 방법), RULES_V=6 DRY_RUN=1(disclosure-insider A·case, meaning-internalism-externalism B·view)에서 0번 지시에 "깊이 전략"과 (A·case에) "S13 안 씀"이 들어갔는지. 건조 실행 폴더는 지운다.
6. 기출 대조(PROPOSAL 4-3): main-r1·main-r2 다수값으로 본 감사 기출 26문항 중 S1·S3·S4 가운데 하나 이상을 지키는 문항 수(전체·갈래별). 관점 수리 끔은 step4/confirm 관점 2개에 새 classifyV6를 저장된 e1~e3로 다시 돌려(캐시, API 없음) repair 값을 적는다.

[B. 시험, API]
7. v6.1 4문항: 4단계 5번과 같은 명령에서 OUT_NAME=out-step4-v61만 바꾼다(공시·의미 × A→B, ONLY=V1, KEEP_OUT 같음, RULES_V=6). run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs. 결함이면 1회 재생성(-regen), 또 결함이면 버리고 기록.
8. 블라인드 $RA/step4/blind-r2/: 지문 2편, 지문마다 v5 A·B(4단계와 같은 최종본) + v6.1 A·B + 기출 1(disclosure-12, meaning-23). 4단계와 같은 make_blind.py·CODEX-PROMPT·결함 목록(㉯ 정의 그대로), 순서는 새로 무작위. 수리가 정답 선지를 고쳤으면 수리 전 판도 넣는다. 평가자 4명, 새 임시 폴더, 병렬.
9. 표시 판정 $RA/step4/marking-r2/: v6.1 4문항만, 4단계 10번과 같은 표·판정자·packet 스크립트.
10. 집계 $RA/step4/aggregate-r2.py: 
   a. 등급표(문항 × 4회, 평균, 정답 일치, 결함 표시). v5 평균 / v6.1 평균(전체·지문별).
   b. PROPOSAL 5절 기준 ①②③④ 값(결론은 웹).
   c. v5 4문항의 4단계 등급 대 이번 등급(평가자 흔들림).
   d. v6.1 전략: 문항별 strategies·strategyUse·전략 경고, 깊이 전략을 정답·rival에 썼는지, 공시 A의 S13 사용 또는 "S13 안 씀" 기록(3-assemble.md grep).
   e. 표시: v6.1 문항별 '지문만' 선지 수, 그중 내용 확인, M2~M4 위반 — 4단계 v5·v6 값과 나란히.
11. 보고서 $RA/step4/REPORT-step4-r2.md(측정만, 채택 결론·규칙 후보 없음. 규칙처럼 보이는 것은 '관찰')와 사람용 요약 REPORT-step4-r2-human.md. 실제 비용(usage.json 합산, 단계별).

[기록·커밋]
12. 커밋할 파일(먼저 목록을 보여 준다): $RA/PROPOSAL-v61.md, $RA/CLI-step4b-v61.md, $RA/step4/REVIEW-step4-trial-web.md, $RA/step4/의 blind-r2·marking-r2·aggregate-r2.py·REPORT-step4-r2*.md, 고친 strategies-v6.md·kind-case-v6.md·run.mjs·classify-v6.mjs·classify-v6.test.mjs, $V5/out-step4-v61/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
    메시지 예: "규칙 감사 4단계 2회차: v6.1(깊이 전략 1개 이상, 사례 A형 S13 먼저, 관점 수리 끔) + 같은 4칸 재시험"
    커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
13. 보고하고 멈춘다: 5·6단계 결과, 등급표, v5·v6.1 평균, 기준 ①~④ 값, 실제 비용, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. CURRENT_STATE는 고치지 않는다(웹 결정 뒤).

추정 비용: v6.1 생성 4문항 약 $2(4단계 실측 $1.90), 수리가 돌면 약 $2.5, 상한 $3. 블라인드·표시 판정은 codex(ChatGPT 계정)·claude -p라 과금 없음. 반영·테스트·기출 대조·관점 재분류는 API 비용 없음.
최소 실행 검토: v5는 다시 만들지 않고 4단계 최종본을 재사용. 확인용 기출 e3는 다시 돌리지 않고 저장된 결과로 재분류만. 표시 판정은 v6.1 4문항만.
```
