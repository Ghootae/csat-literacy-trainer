# CLI 지시문: 순서표 ① 2회차 — 두 칸 V1 1회 재생성 + 블라인드 4회 (웹 2026-11-24)

결정: Ghootae, `REVIEW-cell1-r1-web.md` 3절. 이 지시문을 붙여 넣는 것이 아래 API 실행(상한 $3)·커밋·푸시의 승인이다.

```
순서표 ① 2회차: 정보(관점)·공손룡(사례) v6.2 V1 1회 재생성 + 블라인드 4회 (웹 2026-11-24, REVIEW-cell1-r1-web.md)

0. 지킬 것: CLI-cell1-v62.md 0단계와 같다(규칙·코드 안 고침, 오답 카드 4파일 안 건드림, checkout·stash·restore 금지, 생성 gpt-6.2-sol·RULES_V=6, dispute-fix 안 돌림, 판정 codex gpt-6.1-sol). 비용 상한 $3.
   V5=docs/experiments/deep-item-v5-2026-11-18, SP=docs/experiments/set-pattern-2026-11-18. 결과 폴더 $SP/cell1-v62/r2/.
1. 전제 확인(없으면 멈추고 묻는다): git log -1 이 2e997963(또는 그 뒤), $SP/REVIEW-cell1-r1-web.md, $SP/cell1-v62/run_gen.sh·blind/make_blind.py.
2. 예상 비용: 1회차 실측($1.89) 근거로 적는다. $3를 넘으면 멈춘다.

[생성, API]
3. 1회차 4단계와 같은 명령(cell1-v62/run_gen.sh)에서 OUT_NAME=out-cell1-v62-r2만 바꾼다. 정보·공손룡 A·B V1, A 다음 B, KEEP_OUT 그대로(out-view-hs, out-case-hs). 로그 $V5/out-cell1-v62-r2-<지문>-<A|B>.log.
   B가 피할 A는 이번 회차(r2) A다.
4. 결함이면 1회만 다시(OUT_NAME=out-cell1-v62-r2-regen), 또 결함이면 버리고 기록.

[블라인드, 과금 없음]
5. $SP/cell1-v62/r2/blind/: 1회차와 같은 make_blind.py·요청문·결함 목록. 지문마다 5문항 = v6.2 r2 A-V1·B-V1 + 같은 앵커 v5 A·B(out-gen62 leakfix 최종본) + 같은 기출(정보 13번, 공손룡 12번, 1회차와 같은 처리). 1회차 v6.2 문항은 넣지 않는다. 순서는 새 seed로 무작위. AUTO-LOOP 5-다 점검(문항 수 10, KEY 정답, 출처 표기).
6. 평가자 4명, 새 임시 폴더, 병렬. 결과 REPORT-cell1r2-eval1~4.md.

[집계·보고]
7. $SP/cell1-v62/r2/aggregate.py: 1회차 aggregate.py의 a~e 그대로 + 
   f. GN1 점검: v6.2 r2 4문항과 1회차 4문항 각각, 검사기의 '쉬움 자리 중 〈보기〉 없이 풀리는 선지' 수와 평가자 ㉯ 횟수. 2개 이상인 문항 표시.
   g. 1회차·2회차 v6.2 문항과 앵커의 평균을 나란히(회차별 앵커 변화로 평가자 엄하기 참고).
8. 보고서 $SP/REPORT-cell1-v62-r2.md(측정만, 결론·규칙 후보 없음)와 REPORT-cell1-v62-r2-human.md. 실제 비용(usage.json 합산, 단계별).

[기록·커밋]
9. 커밋할 파일(먼저 목록을 보여 준다): $SP/REVIEW-cell1-r1-web.md, $SP/CLI-cell1b-v62-regen.md, $SP/cell1-v62/r2/ 전체, $SP/REPORT-cell1-v62-r2*.md, $V5/out-cell1-v62-r2/(와 -regen), 새 로그. 그 밖의 파일은 넣지 않는다.
   메시지 예: "순서표 ① 2회차: 정보·공손룡 v6.2 V1 재생성 + 블라인드 4회"
   커밋 뒤 git push origin experiment/problem-solving-mvp (force 금지).
10. 보고하고 멈춘다: 등급표(문항 × 4회), 칸별 PLAN 4절 입력값, 7-f·7-g 표, 실제 비용, 형식 실패 수, git log -1 --oneline, 푸시 결과, git status --short | wc -l. PROGRESS-hard·CURRENT_STATE는 고치지 않는다(웹 판정 뒤).

추정 비용: 4문항 약 $1.9(1회차 실측 $1.89), 사례 수리가 돌면 문항당 +$0.8, 재생성 1회당 +$0.5. 상한 $3. 블라인드 과금 없음.
최소 실행 검토: V1만, 1·2단계 KEEP_OUT 재사용, 앵커·기출 재사용, 표시 판정 없음.
```

## 설명

- **목적:** 1회차에서 두 칸 모두 '거의 통과'였습니다. 계획서에서 미리 정한 대로 한 번 더 만들어, 이번 결과가 운(표본 흔들림)이었는지 봅니다. 공손룡 A는 '수능 같음'이 한 표 모자랐습니다.
- **방법:** 같은 명령으로 4문항을 새로 만들고, 1회차와 같은 앵커·기출과 섞어 평가자 4명이 다시 판정합니다. 정보 A에서 GN1(〈보기〉 없이 풀리는 선지 1개까지)이 안 지켜진 일이 또 나오는지도 셉니다.
- **다음 스텝:** 결과와 상관없이 이번이 마지막 회차입니다. 통과면 'L2 통과', 아니면 '거의 통과(v6.2)'로 PROGRESS-hard에 기록하고 순서표 ② 경제로 넘어갑니다. 미달이 나오면 멈추고 원인을 봅니다.
- **커밋·CLI 시점:** 이 지시문으로 CLI가 생성부터 판정, 커밋, 푸시까지 합니다. 2회차 판정 뒤 PROGRESS 기록 커밋까지 끝나면 CLI를 /clear 하고, 웹도 ② 경제 묶음은 새 창에서 시작하는 게 좋습니다.
