# CLI 지시문: v6.2(옛 C23 생성 기준) 반영 + 4단계 3회차 시험 (웹 2026-11-24 11시 KST)

결정: Ghootae 2026-11-24 11:18 KST, 카드 "v6.2: C23 되살려 재시험". 문안: `PROPOSAL-v62.md`. 이 지시문을 붙여 넣는 것이 아래 규칙·코드 반영, API 실행(상한 $3), 커밋·푸시의 승인이다.

```
규칙 감사 4단계 3회차: v6.2(옛 C23을 생성 기준 G1로 되살림) 반영 후 같은 4칸 재시험 (웹 2026-11-24, PROPOSAL-v62.md)

0. 지킬 것
   - CLI-step4b-v61.md 0단계와 같다(v5 파일·SCHEMA·leak-fix 안 고침, v5 경로 바이트 동일, 문안 그대로 옮김, 오답 카드 4파일 안 건드림, checkout·stash·restore 금지, 생성 gpt-6.2-sol, dispute-fix 안 돌림, 판정 codex gpt-6.1-sol).
   - 이번에 바꾸는 것은 G1 하나다. e3·classify-v6·eval-repair·polish-checklist-v6·readability-guide는 고치지 않는다.
   - 비용 상한 $3. V5=docs/experiments/deep-item-v5-2026-11-18, RA=docs/experiments/rule-audit-2026-11-23.
1. 전제 확인(없으면 멈추고 묻는다): $RA/PROPOSAL-v62.md, $RA/step4/REPORT-step4-r2.md, $RA/step4/REVIEW-step4-r2-web.md, 4단계 v5 최종본 4개(2회차와 같은 파일).

[A. 반영, 비용 없음]
2. 이름 확인: v6 규칙 파일 전체에서 "G1"을 grep한다. kind-graph-v6 등에 이미 'G1'이 있으면 새 기준 이름을 GN1로 쓰고(PROPOSAL 3절), 아래 2·3단계의 G1을 모두 GN1로 바꿔 넣는다.
3. rules-common-v6.md: 머리에 "v6.2 (2026-11-24, PROPOSAL-v62.md)" 한 줄, 다섯 층 표에 '생성 기준 (G)' 행(PROPOSAL 1절 표), M4 바로 뒤에 G1 문단(PROPOSAL 2-1 인용 전체)을 넣는다.
4. run.mjs: RULES_V=6 분기의 3단계 A·B 지시 4번, "(M4)." 바로 뒤에 PROPOSAL 2-2 문장을 넣는다.
5. 확인: grep으로 3·4가 들어갔는지, node --check run.mjs, classify-v6.test.mjs 전부(11/11이어야 함, 코드 안 바뀜), v5 경로 바이트 비교(이전과 같은 방법), RULES_V=6 DRY_RUN=1(disclosure-insider A·case, meaning-internalism-externalism B·view)에서 3단계 지시문에 G1(또는 GN1) 문단과 4번 문장이 각각 들어갔는지, "(옛" 0개인지. 건조 실행 폴더는 지운다.

[B. 시험, API]
6. v6.2 4문항: 2회차 7번과 같은 명령에서 OUT_NAME=out-step4-v62만 바꾼다. run.mjs → eval-repair.mjs(REPAIR=1) → leak-fix.mjs. 결함이면 1회 재생성, 또 결함이면 버리고 기록.
7. 블라인드 $RA/step4/blind-r3/: 2회차 8번과 같은 구성(v5 A·B + v6.2 A·B + 기출 1, 지문 2편), 같은 make_blind.py·CODEX-PROMPT·결함 목록(㉯ 정의 그대로), 순서는 새로 무작위. 평가자 4명, 새 임시 폴더, 병렬.
8. 표시 판정 $RA/step4/marking-r3/: v6.2 4문항만, 2회차 9번과 같은 방법.
9. 집계 $RA/step4/aggregate-r3.py: 2회차 10번 a~e와 같은 항목. 더해서
   f. 문항별 '〈보기〉 안 봐도 풀리는 선지' 수를 두 가지로: 판정자 표시(F2 '지문만') / 평가자 ㉯ 표시 횟수 — v5·v6(1회차)·v6.1(2회차)·v6.2 나란히.
   g. 3-assemble.md에서 G1(또는 GN1) 언급과 '쉬움 자리' 선지 기록.
10. 보고서 $RA/step4/REPORT-step4-r3.md(측정만, 결론·규칙 후보 없음, 규칙처럼 보이는 것은 '관찰')와 REPORT-step4-r3-human.md. 실제 비용(usage.json 합산, 단계별).

[기록·커밋]
11. 커밋할 파일(먼저 목록을 보여 준다): $RA/PROPOSAL-v62.md, $RA/CLI-step4c-v62.md, $RA/step4/REVIEW-step4-r2-web.md, $RA/step4/의 blind-r3·marking-r3·aggregate-r3.py·REPORT-step4-r3*.md, 고친 rules-common-v6.md·run.mjs, $V5/out-step4-v62/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
    메시지 예: "규칙 감사 4단계 3회차: v6.2(옛 C23을 생성 기준 G1로 되살림) + 같은 4칸 재시험"
    커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
12. 보고하고 멈춘다: 2·5단계 결과, 등급표, v5·v6.2 평균, 기준 ①~④ 값, 9-f 표, 실제 비용, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. CURRENT_STATE는 고치지 않는다(웹 결정 뒤).

추정 비용: v6.2 생성 4문항 약 $1.8(2회차 실측 $1.80), 수리가 돌면 약 $2.3, 상한 $3. 블라인드·표시 판정은 codex(ChatGPT 계정)·claude -p라 과금 없음. 반영·테스트는 API 비용 없음.
최소 실행 검토: v5는 다시 만들지 않고 같은 최종본 재사용. 확인용 기출은 검사기가 안 바뀌어 다시 돌리지 않음. 표시 판정은 v6.2 4문항만.
```
