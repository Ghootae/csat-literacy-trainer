# CLI 지시문: 순서표 ① 사회 관점(정보 비대칭)·인문 사례(공손룡) v6.2 칸 생성 (웹 2026-11-24)

결정: Ghootae, `PLAN-cell1-view-social-case-humanities.md` 7절. 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $4)·커밋·푸시의 승인이다.

```
순서표 ①: 사회 관점(정보 비대칭)·인문 사례(공손룡) v6.2 칸 생성 + 블라인드 4회 (웹 2026-11-24, PLAN-cell1-view-social-case-humanities.md)

0. 지킬 것
   - 규칙 파일(v5·v6), run.mjs·eval-repair.mjs·classify-v6.mjs·leak-fix.mjs는 고치지 않는다. 고쳐야 돌아가면 멈추고 보고한다(멈춤 ⑤).
   - 오답 카드 파일 4개(content.ts, wrong-card.ts, wrong-card.test.ts, memory/OPEN_QUESTIONS.md)는 건드리지 않는다. checkout·stash·restore 금지.
   - 생성 gpt-6.2-sol(기본값), RULES_V=6. dispute-fix는 돌리지 않는다. 판정 codex gpt-6.1-sol(보고서에 한 줄 적기).
   - 비용 상한 $4. 단계마다 usage.json을 합산하고, 넘을 것 같으면 그 전에 멈춘다(멈춤 ③).
   - V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18, RA=docs/experiments/rule-audit-2026-11-23. 결과 폴더 $SP/cell1-v62/.
1. 전제 확인(없으면 멈추고 묻는다)
   - git log -1 이 2ca6abdf(또는 그 뒤)인지, git status에 규칙 파일 변경이 없는지.
   - $SP/PLAN-cell1-view-social-case-humanities.md 있음.
   - $V5/out-view-hs/information-asymmetry-free-marketplace-{A,B}/, $V5/out-case-hs/gongsun-long-later-mohists-{A,B}/ 에 1-search.md·2-select.md.
   - 앵커: $V5/out-gen62/information-asymmetry-free-marketplace-{A,B}/, $V5/out-gen62/gongsun-long-later-mohists-{A,B}/ 의 최종본(leakfix/items-leakfix.json 채택본이 있으면 그것, 없으면 repair/items-final.json).
   - $V5/calib-gold/infoasym-13.json, gongsun-12.json.
2. 건조 실행(비용 없음): RULES_V=6 DRY_RUN=1 로 정보 A(KIND_V1=view)·공손룡 A(KIND_V1=case) 3단계 지시문을 만들어 GN1 문단이 있고 "(옛" 0개, "옛 C23" 0개인지 본다. 공손룡 A에 KC2 문장이 들어갔는지도 본다. 건조 실행 폴더는 지운다.
3. 예상 비용을 적는다: 4단계 3회차 usage.json(out-step4-v62) 실측 근거, 4문항 + 수리 가능성. $4를 넘으면 멈춘다.

[생성, API]
4. OUT_NAME=out-cell1-v62, A 다음 B 순서(B가 같은 회차 A를 피함). 두 지문은 병렬로 돌려도 된다.
   정보: PASSAGE=information-asymmetry-free-marketplace MODE=A|B KIND_V1=view KIND_V2=view ONLY=V1 KEEP_OUT=out-view-hs RULES_V=6
   공손룡: PASSAGE=gongsun-long-later-mohists MODE=A|B KIND_V1=case KIND_V2=case ONLY=V1 KEEP_OUT=out-case-hs RULES_V=6
   각각 run.mjs → eval-repair.mjs(REPAIR=1, RULES_V=6) → leak-fix.mjs(RULES_V=6). 로그 $V5/out-cell1-v62-<지문>-<A|B>.log.
   (4단계 3회차 명령과 같고 PASSAGE·KEEP_OUT·OUT_NAME만 다르다. B가 같은 회차 A를 보게 하는 실제 변수는 그때와 같게.)
5. 결함(정답 유일성 문제)으로 끝난 문항은 같은 명령으로 한 번만 다시 만든다(OUT_NAME=out-cell1-v62-regen). 또 결함이면 버리고 기록한다.

[블라인드, 과금 없음]
6. $SP/cell1-v62/blind/BLIND-cell1.md, KEY-cell1.md, CODEX-PROMPT-cell1.md: 4단계 blind-r3를 만든 스크립트·요청문·결함 목록(㉮~㉴, ㉯ 정의 그대로)을 바탕으로.
   지문 2편, 지문마다 5문항 = v6.2 A-V1, v6.2 B-V1(이번 최종본) + 앵커 v5 A-V1, v5 B-V1(1단계의 gen62 최종본) + 기출 1(정보 13번, 공손룡 12번). 순서 무작위, 출처 표시 없음.
   점검(AUTO-LOOP 5-다): 기출 선지가 원래 발문에 묶여 있으면 원래 발문 유지, 요청문의 문항 수가 실제(10)와 같은지, KEY 정답이 각 최종본과 같은지, 출처를 드러내는 표기가 없는지.
7. 평가자 4명: AUTO-LOOP 1-5의 codex exec 명령, 평가자마다 새 임시 폴더(블라인드 파일만), 병렬. 결과 $SP/cell1-v62/blind/REPORT-cell1-eval1~4.md.

[집계·보고]
8. $SP/cell1-v62/aggregate.py:
   a. 문항별 4회 등급·평균(수능 같음 2, 중 1, 수능 아님 0), 정답 일치, 결함 표시 빈도.
   b. 칸별 판정 값(PLAN 4절): 문항별 '수능 아님' 횟수, '수능 같음' 3회 이상 문항 수, 기출 '수능 같음' 횟수. 판정 이름(통과/거의/미달)은 웹이 붙인다 — 값만.
   c. 참고: 칸별 v6.2 평균 대 앵커 평균, 차이.
   d. 정보 B의 ㉳ 횟수와 평가자 이유(비교 기준 "더 ~한" 관련인지).
   e. 문항별 strategies(선택 전략), 3-assemble.md의 GN1·KC2 언급, 수리 대상 여부·사유, 관점 방식 경고.
9. 보고서 $SP/REPORT-cell1-v62.md(측정만, 결론·규칙 후보 없음, 규칙처럼 보이는 것은 '관찰')와 REPORT-cell1-v62-human.md. 평가자 이유는 문항별 한 줄, 2문항 이상 반복된 결함 원인. 실제 비용(usage.json 합산, 단계별).

[기록·커밋]
10. 커밋할 파일(먼저 목록을 보여 준다): $SP/PLAN-cell1-view-social-case-humanities.md, $SP/CLI-cell1-v62.md, $SP/cell1-v62/ 전체, $SP/REPORT-cell1-v62*.md, $V5/out-cell1-v62/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
    메시지 예: "순서표 ①: 사회 관점(정보)·인문 사례(공손룡) v6.2 칸 생성 + 블라인드 4회"
    커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
11. 보고하고 멈춘다: 2단계 결과, 등급표(문항 × 4회), 8-b 값, 8-c 값, 정보 B ㉳, 실제 비용, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. PROGRESS-hard·CURRENT_STATE는 고치지 않는다(웹 판정 뒤).

추정 비용: 생성 4문항 약 $2.0(4단계 3회차 같은 구성 실측 $1.94), 사례 수리가 돌면 문항당 +$0.8, 재생성 1회당 +$0.5. 상한 $4. 블라인드는 codex(ChatGPT 계정)라 과금 없음.
최소 실행 검토: V1만, 1·2단계 KEEP_OUT 재사용, 앵커는 gen62 재사용(새로 안 만듦), 표시 판정·확인용 기출 생략.
```

## 설명

- **목적:** v6.2 규칙으로 두 칸(사회 관점, 인문 사례)이 L2 통과 기준을 넘는지 본다. 규칙을 고치는 시험이 아니라, 감사로 멈췄던 칸 진행을 새 규칙으로 다시 시작하는 첫 칸이다.
- **방법:** 지문 두 편에 A·B 한 문항씩, 모두 4문항을 v6.2로 만든다. 지난번 v5 문항(gen62) 4개와 기출 2개를 섞어 코덱스 평가자 4명이 블라인드로 등급을 매긴다. 등급 판정 기준은 미리 정해 두었다(PLAN 4절).
- **다음 스텝:** CLI 보고가 오면 웹이 칸별로 통과/거의/미달을 붙이고 PROGRESS-hard 기록 지시를 준다. 둘 다 통과면 순서표 ② 경제 지문으로 넘어간다.
- **커밋·CLI 시점:** 이 지시문 하나로 생성·판정·커밋·푸시까지 CLI가 한다. 웹은 커밋하지 않는다. 이 칸이 커밋으로 끝나고 PROGRESS가 갱신되면 CLI 세션 리셋 좋은 시점이다.
