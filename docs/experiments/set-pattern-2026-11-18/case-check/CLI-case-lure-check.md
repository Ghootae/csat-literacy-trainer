# CLI-case-lure-check — A형 사례 '미끼 가설' 잣대 확인 + decider 빼기 대조 (2026-11-27, 웹 작성)

- 근거: `REVIEW-caseA-gichul27-web-2026-11-27.md` (기출 A형 사례 27개: N형(〈보기〉 미끼를 지문 구분 틀린 쪽에 묶기) 17 / P형(규칙·방향 뒤집기) 10). Ghootae 선택(02:28 KST) = "잣대 확인 + decider 빼기 대조".
- **추정 비용: 0원** (유료 API 없음. codex gpt-6.1-sol ChatGPT 계정 판정 16문항 × 평가자 4 × 2회차 = 128회). 예상 시간 1~1.5시간(문항 하나씩 차례로, 문항 안 8회 병렬).
- **최소 실행 = 3단계 시험 1문항(r1·r2 8회)으로 codex가 도는지 확인한 뒤 나머지 15문항.** 더 줄이지는 않는다(갈래당 6문항이 바닥).

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/case-check/CLI-case-lure-check.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] A형 사례 '미끼 가설' 잣대 확인 + decider 빼기 대조. 0원(codex만). 판정 기준은 아래에 미리 적혀 있다. 기준을 고치지 마라.

약어: SP = docs/experiments/set-pattern-2026-11-18, CC = $SP/case-check, V5 = docs/experiments/deep-item-v5-2026-11-18, OUT = $CC/lure-check

금지: 코드(src/ 등)·생성 규칙 파일(rules-*-v6.md 등) 수정 금지. 유료 API(OpenAI API 키 등) 호출 금지. git checkout / stash / restore / reset / force push 금지.

0단계 (확인, 0원)
- 브랜치 experiment/problem-solving-mvp, git log 에 483e6cb2 가 있는지. git status 를 보고 남의 미커밋 파일은 건드리지 마라(이번 커밋에 넣지 않는다).
- 있어야 할 것: $SP/calib-judge/make_blind.py, $SP/calib-judge/aggregate.py, $SP/data/questions/, $SP/data/answers/, /Users/mac/Projects/suneung_db/output/passages/,
  $V5/passages/gen32-T3-2/passage.txt, $V5/out-case-link3a/gen32-T3-2-A/leakfix/items-leakfix.json, $V5/out-case-link3b/gen32-T3-2-A/leakfix/items-leakfix.json.
  $CC 에 REVIEW-case-next-web-2026-11-27.md, REVIEW-caseA-gichul27-web-2026-11-27.md, CLI-case-lure-check.md(이 파일).
- `codex --version` 이 되는지. 안 되면 멈추고 보고.
- 하나라도 없으면 멈추고 무엇이 없는지 보고.
- 비용 스스로 추정: 유료 호출 0회, codex 128회임을 한 줄로 적고 진행.

1단계 (블라인드 만들기, 0원) — $OUT/make_blind.py 새로 작성
- $SP/calib-judge/make_blind.py 의 passage_db, question, block, HDR, CODEX-PROMPT 문안, run_eval.sh 문안을 복사해 쓴다(원본 파일은 고치지 마라).
  바꿀 점: 머리글의 날짜·제목 표시는 "(2026-11-27)"로, 임시 폴더 이름 접두는 /tmp/lure… 로.
- **출처 가리기**: BLIND.md 의 지문 제목 줄은 모든 문항에서 "# 지문" 한 줄로만 쓴다(시험 이름·학년도·"생성"·버전 표시 금지). 문항 폴더 이름은 L01~L16 무작위 순서(random.seed(20261127))로 하고, 어떤 키가 어느 폴더인지는 $OUT/KEY.md·KEY.json 에만 적는다. BLIND.md·CODEX-PROMPT.md 안에 N형·P형·원본·빼기판 같은 말이 없어야 한다.
- 문항 16개:
  [A. 기출 N형 6] (set_id, 문항번호) — 지문은 passage_db(set_id), 문항은 question(set_id, 번호)
    N-K16 데이터     69c00a6778128b2a9bedd500  6
    N-K41 집합건물   69fd388b86fd308968e0bb80  16
    N-K04 허가       69bbf8da8937cf145519050b  17
    N-K37 건축       69c0d525fa5063deffe3b470  25
    N-K24 공유물     69c01e8d78128b2a9bede7e8  31
    N-K21 과징금     69c01bd878128b2a9bede33d  37
  [A. 기출 P형 6]
    P-K01 보증       69bbef9a8937cf145518cb13  8
    P-K07 상계       69bc0b438937cf1455192027  11
    P-K08 재판매     69bc0d528937cf1455192521  6
    P-K22 표현대리   69c01c4f78128b2a9bede42e  29
    P-K42 선거공보   6a2294ec86fd308968e10c68  14
    P-K12 전지       69bffacbfa5063deffe19cc6  6
    (12개 모두 〈보기〉에 그림 없음을 웹에서 확인함. 지문에 그림이 있으면 KEY에 "지문 그림 있음"만 적고 그대로 진행.)
  [B. 생성 link3 대조 4] 지문은 모두 $V5/passages/gen32-T3-2/passage.txt. 문항은 각 items-leakfix.json 의 items[0] 의 stem·bogi·choices, 정답 answer(1~5 → ①~⑤).
    B-3a-orig : out-case-link3a 그대로.
    B-3a-del  : link3a 의 bogi 에서 아래 두 문장을 정확히 바꾼 판(선지·발문은 그대로).
       "갑이 반투명 덮개 하나를 찢자 봉해 둔 배송 상자가 열렸고, 갑은 상자 안을 살펴 조명의 구성품을 확인했다."
         → "갑은 반투명 덮개 하나를 찢고 조명의 구성품을 확인했다."
       "갑이 조명을 켠 채 다른 반투명 덮개를 흠집 없이 빼자 빛이 퍼졌고, 갑이 덮개를 다시 끼우자 빛이 한곳에 모였다."
         → "갑은 다른 반투명 덮개를 흠집 없이 뺐다가 다시 끼웠다."
    B-3b-orig : out-case-link3b 그대로.
    B-3b-del  : link3b 의 bogi 에서 아래 두 문장을 한 문장으로 정확히 바꾼 판.
       "다음 날 갑이 다른 끈을 당기자 등받이가 접혔다. 갑은 등받이 아래를 살피다가 그 끈을 잘랐다."
         → "다음 날 갑은 등받이 아래를 살피다가 다른 끈을 잘랐다."
    바꿀 문장이 원문에 정확히 한 번 없으면 멈추고 보고(비슷한 문장으로 고쳐 넣지 마라). 빼기판의 정답 키는 원본 정답 그대로 적되 KEY에 "빼기판: 정답 근거가 약해짐(시비 예상)"이라고 적는다.
- 만든 뒤 출력: KEY 표(폴더|키|정답|구분), 각 BLIND.md 글자 수. 그리고 grep 으로 BLIND.md·CODEX-PROMPT.md 전체에 "학년도|수능|모의|생성|gen32|link|N형|P형|빼기" 가 없는지 확인해 결과를 적는다(지문 본문에 원래 있는 낱말이면 그 줄만 보고하고 진행).

2단계 (시험 1문항, 0원)
- KEY 에서 B-3a-del 폴더의 run_eval.sh 를 돌린다(8회). REPORT-eval-r{1,2}-{1..4}.md 8개가 생기고 각 파일 끝에 ```json 블록이 있는지 확인. 4개 이상 비거나 json 이 없으면 멈추고 log 를 보고.

3단계 (나머지 15문항, 0원)
- 폴더 하나씩 차례로 run_eval.sh 를 돌린다(문항 안 8회 병렬, 문항끼리는 차례로). 실패한 회차만 한 번 다시 돌린다. 그래도 비면 그 회차는 빈칸으로 두고 진행.

4단계 (집계, 0원) — $OUT/aggregate.py ($SP/calib-judge/aggregate.py 복사해 경로만 바꿈)
- 문항별: 평균 점수(수능 같음 2 / 중 1 / 수능 아님 0, 유효 회차만), 판정 개수, 정답 일치 수(/8), 결함 표시별 개수.
- 갈래별: N 6문항 평균, P 6문항 평균, 차이(N−P). 각 갈래 결함 ㉯·㉱·㉲·㉳ 합.
- 대조: 3a 원본 vs 3a 빼기판, 3b 원본 vs 3b 빼기판의 평균 차이, ㉳·㉲ 개수 차이, 정답 일치 수 차이.
- 결과 $OUT/aggregate-out.md.

5단계 (미리 정한 판정 — 그대로 적용, 해석 덧붙이지 말고 아래 문구로)
 [가. 잣대 확인]
   N평균 − P평균 ≥ +0.4 그리고 N평균 ≥ 1.5 → "평가자가 미끼형을 높게 봄 (가설 잣대 통과)"
   |N평균 − P평균| < 0.4                     → "잣대가 두 갈래를 가르지 않음"
   P평균 − N평균 ≥ 0.4                       → "가설 기각 (규칙 뒤집기형을 더 높게 봄)"
   (N−P ≥ 0.4 이지만 N평균 < 1.5 이면 → "방향은 맞으나 미끼형도 낮음"으로 적는다)
   덧붙여 적기만: 법·사회 N 6개 vs 법 P 5개(K12 전지 뺀 것)의 차이도 같은 표에 한 줄.
 [나. decider 빼기 대조] 3a·3b 각각
   빼기판 ≥ 원본 + 0.4 → "decider가 깊이를 깎음"
   |빼기판 − 원본| < 0.4 → "decider 영향 없음"
   빼기판 ≤ 원본 − 0.4 → "decider 필요"
   어느 경우든 ㉳(정답 시비) 개수 변화와 정답 일치 수 변화를 함께 적는다.
   웹의 사전 예측(적어 두기만): "이 지문은 포장/물품 구분 기준을 지문이 정하지 않으므로, decider를 빼면 깊어지기보다 ㉳가 늘고 정답 일치가 떨어질 것".

6단계 (보고서, 0원)
- $OUT/REPORT-lure-check.md : 0~4단계 기록, 표, 5단계 판정 문구, 문항별 평가자 이유 한 줄씩(각 문항 r1-1·r2-1 이유).
- $OUT/REPORT-lure-check-human.md : 쉬운 말 한 쪽. 맨 위에 두 판정 문구, 그 아래 "무엇을 봤나 / 결과 / 웹 예측과 맞았나" 세 덩이. 번호만 쓰지 말고 괄호에 내용(예: "가(잣대 확인)").

7단계 (커밋·푸시)
- git add: $OUT/ 전체, $CC/CLI-case-lure-check.md, $CC/REVIEW-case-next-web-2026-11-27.md, $CC/REVIEW-caseA-gichul27-web-2026-11-27.md. 다른 파일은 add 하지 마라.
- 커밋 메시지: "case-check: A형 미끼 가설 잣대 확인 + decider 빼기 대조 (lure-check, 0원)"
- git push (force 금지). 거부되면 fetch 후 merge 하고 다시 push, 그 사실을 보고.
- 커밋 해시와 5단계 판정 문구 두 개를 마지막에 보고하고 멈춰라. 다음 실험은 하지 마라.
```

---

## 웹이 미리 적어 둔 것 (CLI 실행과 무관, 읽기용)

- 기출 12문항은 웹이 27개 전수 읽기에서 고른 것이다. N형은 모두 법·사회, P형은 법 5 + 과학 1(전지). 갈래 차이가 과목 차이와 섞이지 않게 법끼리 비교 줄을 따로 둔다.
- link3 두 문항은 '같은 말로 불린 두 물건을 사건 결과로 가르게 한' 짝 문항이다. decider = 정체를 못 박는 〈보기〉 문장.
- 정밀화: 기출 N형은 **지문이 직접 분류 기준을 정의**하고 〈보기〉는 행동만 보여 준다. 이 지문은 포장/물품 기준을 정의하지 않으므로(한 문장 "포장만 훼손한 경우는 제한 사유 아님"), 정체를 〈보기〉가 대신 정해 줘야 했다. 그래서 decider만 빼면 깊어지기보다 정답 시비(㉳)가 늘 것으로 예측한다. 예측이 맞으면 다음 실험은 "지문이 기준을 정의한 구분에 미끼를 묶는 생성"이 된다.
