# CLI 지시문: 규칙 감사 4단계 시험 생성 (웹 2026-11-24 01:4x KST)

결정: Ghootae 2026-11-24 01:45 KST, `PLAN-step4-trial-generation.md` 6절 "추천대로". 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $6)·커밋·푸시의 승인이다.

```
규칙 감사 4단계: v5·v6 시험 생성 + 블라인드 + 표시 판정 (웹 2026-11-24, PLAN-step4-trial-generation.md)

0. 지킬 것
   - 규칙 파일(v5·v6), *-SCHEMA-*.md, run.mjs·eval-repair.mjs·classify-v6.mjs·leak-fix.mjs는 고치지 않는다. 고쳐야 돌아가면 멈추고 보고한다(멈춤 ⑤).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지. .git 잠금 파일이 있으면 기다린다.
   - 생성 모델 gpt-6.2-sol(기본값). dispute-fix는 돌리지 않는다. 판정은 codex gpt-6.1-sol(보고서에 한 줄 적기).
   - 비용 상한 $6. 단계마다 usage.json을 합산하고, 넘을 것 같으면 그 전에 멈춘다(멈춤 ③).
   - V5=docs/experiments/deep-item-v5-2026-11-18, RA=docs/experiments/rule-audit-2026-11-23, 결과 폴더 $RA/step4/.
1. 전제 확인(없으면 멈추고 묻는다): $RA/PLAN-step4-trial-generation.md(상태 '결정'), $V5/out-case-hs/disclosure-insider-{A,B}/ 와 $V5/out-view-hs/meaning-internalism-externalism-{A,B}/ 에 V1·V2가 든 items.json, $V5/out-cell4/disclosure-insider-A/leakfix/ 채택본, $V5/out-cell5/disclosure-insider-B/ 최종본, $V5/calib-gold/disclosure-12.json·meaning-23.json.

[4-0 사전 확인, 비용 없음]
2. v5 재사용 확인: rules-common.md·kind-case.md·rules-A.md·rules-B.md·polish-checklist.md·readability-guide-v4.md의 마지막 커밋 시각이 out-cell4·out-cell5 생성 시각보다 앞인지 git log로 본다. 뒤에 바뀐 파일이 있으면 멈추고 보고한다.
3. RULES_V=6 DRY_RUN=1로 의미 지문 A·B(KIND_V1=view) 3단계 지시문을 만들어 "(옛" 0개, V1·V2·V3와 [선택 전략 목록]이 들어갔는지 확인한다. 건조 실행 폴더는 지운다.
4. 확인용 기출 7개(2025-11-수능-8, 2025-06-평가원-8, 2025-11-수능-17, 2024-06-평가원-16, 2023-11-수능-7 + 동반 2025-11-수능-16, 2024-06-평가원-14)를 eval-repair.mjs 입력으로 만든다. 11-22 기출 오답 태깅과 같은 방식으로 V5/passages/에 bt-* 새 폴더만 더한다(기존 폴더·파일은 고치지 않음). [2026-11-24 02:1x 고침: 처음 판의 2024-09-평가원-16은 오기, 'V5/passages 건드리지 않음'은 (가)안으로 바꿈]

[4-1 생성, API]
5. v6 4문항 (OUT_NAME=out-step4-v6, A 다음 B 순서라 B가 같은 회차 A를 피한다):
   공시: PASSAGE=disclosure-insider MODE=A|B KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs RULES_V=6
   의미: PASSAGE=meaning-internalism-externalism MODE=A|B KIND_V1=view KIND_V2=view ONLY=V1 KEEP_OUT=out-view-hs RULES_V=6
   각각 run.mjs → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6) 순서. 로그는 $V5/out-step4-v6-<지문>-<A|B>.log 꼴.
6. v5 의미 2문항 (OUT_NAME=out-step4-v5, RULES_V 없음): 5와 같은 의미 명령에서 RULES_V만 뺀다. 공시 v5는 새로 만들지 않고 out-cell4 A-V1(leakfix 채택본), out-cell5 B-V1(최종본)을 쓴다.
7. 결함(정답 유일성 문제 = defect)으로 끝난 문항은 같은 명령으로 한 번만 다시 만든다(OUT_NAME 뒤에 -regen). 또 결함이면 버리고 기록한다. v5·v6 똑같이.
8. 확인용 기출 7개: 4에서 찾은 방법으로 eval-repair.mjs를 RULES_V=6, 수리 끔(REPAIR 없음)으로 돌린다. 문항마다 M2·M3·M4·M5 위반, 수리 대상 여부, 경고, task·bogi_only 칸을 $RA/step4/confirm/E3-v6.csv에 모은다.

[4-2 판정, 과금 없음]
9. 블라인드 $RA/step4/blind/BLIND-step4.md, KEY-step4.md, CODEX-PROMPT-step4.md: 지문 2편, 지문마다 v5 A-V1, v5 B-V1, v6 A-V1, v6 B-V1(최종본) + 기출 1(공시 disclosure-12, 의미 meaning-23). 수리가 정답 선지를 고쳤으면 수리 전 판도 넣는다. 순서 무작위, 출처 표시 없음, 결함 목록 ㉮~㉴는 BLIND-view-hs.md와 같게(AUTO-LOOP 1-4). 평가자 4명, AUTO-LOOP 1-5의 codex exec 명령, 평가자마다 새 임시 폴더(블라인드 파일만), 병렬. 결과 $RA/step4/blind/REPORT-step4-eval1~4.md.
10. 표시 판정: 생성 8문항(v5 4 + v6 4, 최종본)과 확인용 기출 7개를 main-r2·main-r3와 같은 표(MARKING-SCHEMA-v2 선지 표시 + BOGI-SCHEMA-v1 〈보기〉 표시), 같은 판정자 셋(J1 claude -p, J2·J3 codex), 같은 packet 만들기 스크립트로 표시한다. 생성 문항 packet에는 v5·v6 표시를 넣지 않는다(문항 키는 무작위 이름). 결과 $RA/step4/marking/.
11. 집계 $RA/step4/aggregate.py:
   a. 등급: 문항별 4회 등급·평균(수능 같음 2, 중 1, 수능 아님 0), 정답 일치, 결함 표시 빈도. v5 평균 / v6 평균(전체·지문별), 차이.
   b. PLAN 4-1 판정 ①②③ 각각 지켰는지(값만, 결론은 웹이 쓴다).
   c. 표시: 문항별 M1~M11 다수값 준수, M2·M3·M4·M5 위반 수, '지문만' 선지 수와 그중 내용 확인 비율 — v5 / v6 / 확인용 기출 / (참고) 본 감사 기출 26 평균(main-r1·r2 CSV에서).
   d. e3 대 판정자: 생성 8 + 확인용 6에서 e3의 M2~M5 판정과 판정자 다수값이 같은 비율.
   e. v6 선택 전략: 문항별 strategies, strategyUse, 전략 경고.
   f. 수리: 문항별 수리 대상 여부·사유, 수리 전·후 등급(수리 전 판이 블라인드에 있을 때).
12. 보고서 $RA/step4/REPORT-step4-trial.md: 11의 표, 실제 비용(usage.json 합산, 단계별), 평가자 이유 요약(문항별 한 줄), 2문항 이상 반복된 결함 원인. 채택·e4·순서표 결론과 규칙 후보는 쓰지 않는다(웹이 한다). 규칙 후보가 보이면 '관찰'로만 적는다.

[기록·커밋]
13. 커밋할 파일(먼저 목록을 보여 준다): $RA/PLAN-step4-trial-generation.md, $RA/CLI-step4a-trial.md, $RA/step4/ 전체, $V5/out-step4-v6/, $V5/out-step4-v5/, 이번에 새로 만든 $V5/passages/bt-* 폴더, (있으면) -regen 폴더, 새 로그 파일. 그 밖의 파일은 넣지 않는다.
    메시지 예: "규칙 감사 4단계: v5·v6 시험 생성(공시 사례·의미 관점, A·B V1) + 블라인드 4회 + 표시 판정"
    커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
14. 보고하고 멈춘다: 등급표(문항 × 4회), v5·v6 평균, PLAN 4-1 ①②③ 값, 확인용 기출 수리 대상 수, 실제 비용, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. CURRENT_STATE는 고치지 않는다(웹 결정 뒤).

추정 비용: v6 4문항 $2.4~3.2 + v5 의미 2문항 $1.2~1.6 + 확인용 7개 e3 약 $0.7 (+ 결함 재생성 문항당 $0.6) = 약 $4.3~5.5, 상한 $6. 블라인드·표시 판정은 codex(ChatGPT 계정)·claude -p(구독)라 과금 없음(claude -p가 API 키 과금이면 약 $2 더).
최소 실행 검토: 지문 2편·V1만, v5 공시 2문항은 재사용, 확인용 기출은 수리 끔, 1·2단계(소재 찾기·고르기)는 KEEP_OUT 재사용.
```
