# CLI-case-a-recheck — 생성 A형을 기출 A형(상위·보통)과 한 블라인드로 재확인 + 정답 판정 단계 수 (2026-11-27, 웹 작성)

- 근거: lure-check(150f2127) — 기출 A형 사례 12개 평균 1.27, 1.5 이상 3/12. 예전 대조 기출(공손룡 12·공시 12)은 높게 나오는 것만 고른 "자격 기출"이었다. 검토 `REVIEW-lure-check-web-2026-11-27.md`.
- Ghootae 결정(2026-11-27 09:56 KST): "블라인드 테스트해보자. 정답을 가르는데 필요한 단계도 포함해서".
- **추정 비용: 0원** (유료 API 없음. codex gpt-6.1-sol 판정 12문항 × 8회 = 96회 + 단계 수 측정 20문항 × 2회 = 40회, 합 136회). 예상 시간 1~1.5시간.
- **최소 실행 = 2단계에서 1문항(8회)과 단계 수 1문항(2회)으로 codex가 도는지 확인 뒤 나머지.**

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/case-check/CLI-case-a-recheck.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 생성 A형 재확인 + 단계 수 측정. 0원(codex만). 판정 기준은 아래에 미리 적혀 있다. 기준을 고치지 마라.

약어: SP = docs/experiments/set-pattern-2026-11-18, CC = $SP/case-check, V5 = docs/experiments/deep-item-v5-2026-11-18, LC = $CC/lure-check, OUT = $CC/a-recheck

금지: 코드(src/ 등)·생성 규칙 파일(rules-*-v6.md 등) 수정 금지. 유료 API 호출 금지. git checkout / stash / restore / reset / force push 금지. 기존 폴더($LC, calib-judge 등)의 파일은 읽기만.

0단계 (확인, 0원)
- 브랜치 experiment/problem-solving-mvp, git log 에 150f2127 이 있는지. 남의 미커밋 파일은 건드리지 말고 이번 커밋에 넣지 마라.
- 있어야 할 것: $LC/make_blind.py, $LC/aggregate.py, $LC/KEY.json, $LC/L01~L16/BLIND.md, $SP/calib-judge/gongsun-12/BLIND.md, $CC/make_blind13.py(gold 함수), $V5/blind/BLIND-cell5.md,
  아래 6개 생성 파일, $V5/passages/{gen32-T3-2, gen32-o4-T4-1, gongsun-long-later-mohists}/passage.txt·meta.json.
  $CC 에 REVIEW-lure-check-web-2026-11-27.md, CLI-case-a-recheck.md(이 파일).
- `codex --version` 확인. 하나라도 없으면 멈추고 보고.
- 비용 스스로 추정: 유료 호출 0회, codex 136회임을 한 줄로 적고 진행.

1단계 (블라인드 만들기, 0원) — $OUT/make_blind.py 새로 작성. $LC/make_blind.py 의 형식(문항 하나씩 단독 BLIND.md + CODEX-PROMPT.md + run_eval.sh, "# 지문" 한 줄 제목, 출처 가리기)을 그대로 따른다.
- 폴더 이름 R01~R12, 무작위 순서 random.seed(20261128). 어느 키가 어느 폴더인지는 $OUT/KEY.md·KEY.json 에만.
- 문항 12개:
  [생성 A 6] 각 파일의 items 중 version 이 맞는 것 하나(make_blind11.py 의 pick 과 같음). 지문은 $V5/passages/<pid>/passage.txt. 정답 = answer(1~5 → ①~⑤).
    G-cy-cell5    out-cell5/gen32-T3-2-A/leakfix/items-leakfix.json             V1  pid gen32-T3-2
    G-cy-lever5   out-case-lever5-old/gen32-T3-2-A/leakfix/items-leakfix.json   V1  pid gen32-T3-2
    G-gs-old      out-cell1-v62-r2/gongsun-long-later-mohists-A/leakfix/items-leakfix.json  V1  pid gongsun-long-later-mohists
    G-mo-pair3    out-case-pair3/gen32-o4-T4-1-A/leakfix/items-leakfix.json     V2  pid gen32-o4-T4-1
    G-mo-o4       out-o4/gen32-o4-T4-1-A/leakfix/items-leakfix.json             V2  pid gen32-o4-T4-1
    G-mo-o4regen  out-o4-regen/gen32-o4-T4-1-A/leakfix/items-leakfix.json       V2  pid gen32-o4-T4-1
    (경로는 모두 $V5 아래)
  [기출 A 상위 3]
    K-top-gongsun12 : $SP/calib-judge/gongsun-12/BLIND.md 의 지문·문항을 그대로(정답 ④).
    K-top-gongsi12  : $CC/make_blind13.py 의 gold() 와 같은 방식으로 $V5/blind/BLIND-cell5.md 문항 가(정답 ⑤). 문항 번호 표시는 1로.
    K-top-K37 건축  : $LC 에서 N-K37 의 BLIND.md 를 그대로 복사(정답 ①).
  [기출 A 보통 3] $LC 의 BLIND.md 를 그대로 복사.
    K-mid-K21 과징금(③), K-mid-K07 상계(③), K-mid-K41 집합건물(④)
- 머리글 날짜 표시만 "(2026-11-27 재확인)"으로 바꿀 수 있다. 그 밖의 풀이지 문안·CODEX-PROMPT 문안은 $LC 것과 한 글자도 다르지 않게(판정 잣대를 바꾸지 않기 위해).
- 확인 출력: KEY 표, 각 BLIND.md 글자 수, grep "학년도|수능|모의|생성|gen32|link|cell|lever|pair|옛|기출" 결과(지문·문항 본문에 원래 있는 낱말이면 그 줄만 보고하고 진행. 단 "생성 v3.2" 같은 출처 표시가 나오면 멈추고 고쳐라).

2단계 (시험, 0원)
- 생성 문항 폴더 하나(G-cy-cell5 의 폴더)의 run_eval.sh 를 돌린다(8회). REPORT-eval-r{1,2}-{1..4}.md 8개와 ```json 블록 확인. 4개 이상 비면 멈추고 log 보고.
- 같은 폴더로 3단계의 단계 수 측정 1회를 시험한다. json 이 없으면 멈추고 보고.

3단계 (단계 수 측정 지시문 STEPS-PROMPT.md, $OUT 에 한 번 작성)
- 판정과 다른 새 codex 세션이다. 판정 결과를 보여 주지 않는다. BLIND.md 하나만 임시 폴더에 넣고 아래 지시문을 준다. 평가자 2명(s1·s2), 명령은 run_eval.sh 와 같고 결과는 각 폴더의 STEPS-s1.md·STEPS-s2.md.
  지시문 내용(이대로 적어라):
  ----
  작업 폴더의 BLIND.md 에 지문 하나와 〈보기〉 문항 1개가 있어. 출처는 가렸어. 이 폴더의 파일 말고 다른 파일은 열지 말고 인터넷도 쓰지 마. 문항의 좋고 나쁨은 판정하지 말고, 풀이 과정만 쪼개 줘.
  1) 정답 선지를 골라.
  2) 정답 선지의 판정(발문이 "적절하지 않은 것"이면 그 선지가 틀렸다고 확정하는 것)에 꼭 필요한 판단을 순서대로 나눠 적어. 한 단계 = 지문 문장 하나를 적용하거나, 〈보기〉 사실 하나를 확인하거나, 두 정보를 맞대어 결론 하나를 내는 판단 하나. 같은 판단을 둘로 쪼개지 말고, 없어도 정해지는 단계는 빼.
     각 단계마다 근거 종류를 "지문" / "보기" / "결합" 중 하나로 표시해.
  3) 나머지 네 선지도 각각 같은 방식으로 단계 수만 세어.
  4) 정답 선지가 〈보기〉 없이 지문만으로 판정되면 noBogi=true.
  출력: 마지막에 ```json 블록 하나: {"answer":"③","answerSteps":[{"step":"...","basis":"지문"},...],"answerStepCount":3,"bogiFactsUsed":2,"passageSentencesUsed":1,"otherStepCounts":{"①":2,"②":1,"④":2,"⑤":3},"noBogi":false}. 파일은 쓰지 마.
  ----
- 단계 수 측정 대상 20문항 = 1단계의 R01~R12 + $LC 의 나머지 기출 8개(N-K16, N-K04, N-K24, P-K01, P-K08, P-K22, P-K42, P-K12)의 BLIND.md 를 그대로 사용(LC 폴더에 쓰지 말고 결과는 $OUT/steps-LC/<키>/STEPS-s{1,2}.md 에).

4단계 (나머지 실행, 0원)
- R01~R12 중 남은 11개 폴더 run_eval.sh 차례로(문항 안 8회 병렬). 실패 회차만 한 번 다시. 그래도 비면 빈칸.
- 단계 수 측정 20문항 × 2회(2단계에서 한 1회 포함). 실패 회차만 한 번 다시.

5단계 (집계, 0원) — $OUT/aggregate.py ($LC/aggregate.py 복사 + 아래 추가)
- 문항별: 평균 점수(2/1/0), 같음/중/아님 수, 정답 일치(/8), 결함 개수, 단계 수(answerStepCount 2회 평균), 정답 선지 근거 중 "보기"·"결합" 단계 수 평균, bogiFactsUsed 평균, noBogi 횟수, 단계 측정 정답 일치(/2).
- 묶음 평균: 생성 A 6 / 기출 상위 3 / 기출 보통 3 / 기출 6 전체. 지문별 생성 최고점(청약 2개 중 높은 것, 도덕 3개 중 높은 것, 공손룡 1개).
- 흔들림 확인: 기출 6개의 이번 점수 vs 예전 점수(공손룡 12·공시 12는 2.0, K37 2.0, K21·K07·K41 1.0) 차이 표.
- 단계 수 상관: 점수가 있는 20문항(R 12개 이번 점수 + LC 8개는 $LC 점수)에서 answerStepCount 평균과 점수 평균의 Spearman ρ. "보기+결합 단계 수"와 점수의 ρ 도 따로. 기출 14개만으로도 한 번.
- 결과 $OUT/aggregate-out.md.

6단계 (미리 정한 판정 — 그대로 적용, 아래 문구로)
 [가(생성 A형 위치)] G = 생성 A 6 평균, M = 기출 보통 3 평균, T = 기출 상위 3 평균
   G ≥ T − 0.4                → "생성 A형이 상위 기출 수준"
   M − 0.4 ≤ G < T − 0.4      → "생성 A형이 보통 기출 수준 (A형 칸 통과로 볼 수 있음)"
   G < M − 0.4                → "생성 A형이 보통 기출에도 못 미침"
   같은 판정을 "지문별 생성 최고점 3개의 평균"에도 한 줄 적용해 적는다(후보 여럿 중 골라 쓰는 경우).
   기출 흔들림: 기출 6개 중 예전 점수와 0.5 넘게 다른 것이 2개 이상이면 → 맨 위에 "잣대 흔들림 — 판정 보류" 를 붙인다.
 [나(단계 수)] 20문항 ρ(answerStepCount, 점수)
   ρ ≥ 0.5        → "단계 수가 점수를 설명함"
   0.2 ≤ ρ < 0.5  → "약한 관계"
   ρ < 0.2        → "단계 수로 설명 안 됨"
   "보기+결합 단계 수" ρ 도 같은 문구로 따로 적는다.

7단계 (보고서, 0원)
- $OUT/REPORT-a-recheck.md : 0~5단계 기록, 표, 6단계 판정 문구, 문항별 평가자 이유 한 줄(r1-1·r2-1), 문항별 정답 선지 단계(s1) 목록.
- $OUT/REPORT-a-recheck-human.md : 쉬운 말 한 쪽. 맨 위에 두 판정 문구. 그 아래 "무엇을 봤나 / 결과 / 단계 수가 말해 주는 것" 세 덩이. 번호만 쓰지 말고 괄호에 내용(예: "가(생성 A형 위치)").

8단계 (커밋·푸시)
- git add: $OUT/ 전체, $CC/CLI-case-a-recheck.md, $CC/REVIEW-lure-check-web-2026-11-27.md. 다른 파일은 add 하지 마라.
- 커밋 메시지: "case-check: 생성 A형 기출 대비 재확인 + 정답 판정 단계 수 (a-recheck, 0원)"
- git push (force 금지). 거부되면 fetch 후 merge 하고 다시 push, 보고.
- 커밋 해시와 6단계 판정 문구를 마지막에 보고하고 멈춰라. 다음 실험은 하지 마라.
```

---

## 웹이 미리 적어 둔 것 (읽기용)

- 예전 블라인드는 한 지문에 여러 문항을 묶어 보여 줬고, 이번은 lure-check처럼 문항 하나씩 단독이다. 그래서 생성 문항 점수가 예전과 다를 수 있다. 그래서 생성·기출을 모두 이번 형식으로 다시 잰다.
- 예전 점수(참고): 청약 out-cell5 1.83, lever5-old 1.08, 공손룡 옛 A 2.00, 도덕 A안 1.83, 도덕 out-o4·out-o4-regen 0.75~1.0 근처.
- 단계 수는 판정과 다른 세션에서 따로 잰다. 판정 지시문을 바꾸면 잣대가 바뀌기 때문이다.
- 예측(적어 두기만): 가(생성 A형 위치) = "보통 기출 수준", 나(단계 수) = "약한 관계 이상", 보기+결합 단계 수 쪽 ρ가 더 높을 것.
