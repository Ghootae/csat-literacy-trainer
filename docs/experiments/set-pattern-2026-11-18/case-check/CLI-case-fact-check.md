# CLI 지시문: 사실 바꾸기 검사 무료 검증 (case-fact-check)

작성 2026-11-25 웹, 스레드 "사례 문항 검사 기준 검토하기". 근거: REVIEW-case-false-spot-web.md (같은 폴더).
**비용: API 0원** (codex gpt-6.1-sol, ChatGPT 계정). 시간 약 20~30분. 코드(run.mjs·eval-repair.mjs·classify-v6.mjs)는 고치지 않는다.

SP = docs/experiments/set-pattern-2026-11-18. 결과 폴더 = $SP/case-check/.

## 0. 먼저
- `git status`로 깨끗한지 확인하고, 브랜치 experiment/problem-solving-mvp, 최신 커밋이 ec931292 이후인지 적는다.
- 이 파일과 REVIEW-case-false-spot-web.md를 $SP/case-check/에 둔다(웹이 Mac에 못 넣었으면 Ghootae가 붙여 넣은 내용으로 만든다).

## 1. 풀이지 만들기 (make_sheet.py)
아래 31문항을 원래 BLIND 파일에서 그대로 잘라 한 문항씩 시트로 만든다. 문항마다 지문 전체 + 발문 + 〈보기〉 + 선지 5개. 출처·정답·점수는 넣지 않는다. 순서는 seed 20261125로 섞는다.

| 번호 | 파일 | 문항 |
|---|---|---|
| K1~K6 | calib-judge/{gongsun-12, solid-catalyst-10, plastic-10, infoasym-13, laozi-16, audio-17}/BLIND.md | 문항 1 |
| G1, G2, G5, G6 | cell1-v62/blind/BLIND-cell1.md | 바, 아, 가, 나 |
| G3, G4, G7, G8 | cell1-v62/r2/blind/BLIND-cell1r2.md | 바, 자, 나, 마 |
| G9, G10, G11, G12 | cell3/blind/solid-catalyst/BLIND-r1.md | 3, 5, 2, 1 |
| G13, G14 | cell3/blind-r2/solid-catalyst/BLIND-r1.md | 1, 5 |
| G15, G16, G17, G18 | o4/blind-T4/BLIND-r1.md | 1, 3, 2, 4 |
| G19, G20, G21 | o4/blind-T4-regen/BLIND-r1.md | 3, 5, 2 |
| G22, G23, G24, G25 | o4/blind-T5/BLIND-r1.md | 1, 2, 3, 4 |

## 2. 묻는 말 (CODEX-PROMPT.md, 문항마다 따로 부름)
~~~
너는 수능 국어 독서 문항 검토자다. 문항을 풀고, 선지 다섯 개 각각에 대해 아래를 적는다.
- truth: 이 선지가 지문과 〈보기〉에 비추어 참인가 거짓인가.
- fact_sensitive: 〈보기〉의 사실(값, 일어난 일, 일어난 순서, 누가 무엇을 알았거나 할 수 있었나) 가운데 하나를 그럴듯하게 바꾸었을 때 이 선지의 참·거짓이 바뀌는가?
  바뀌면 true와 "바꾼 사실 → 바뀐 결과" 한 줄.
  〈보기〉에서 이름·정체(누가 누구인지, 무엇이 무엇인지)만 가져오고 어떤 사실을 바꿔도 참·거짓이 그대로면 false와, 참·거짓을 정하는 지문 문장 한 줄.
  주의: 선지가 〈보기〉 속 이름(갑, ㉮, A 등)을 쓴다는 것만으로 true로 하지 않는다. 선지 안에 '~라면'으로 붙은 조건은 선지의 일부로 본다(〈보기〉의 사실이 아님).
맨 끝에 JSON 블록: ```json {"answer":3,"choices":[{"n":1,"truth":"참","fact_sensitive":true,"why":"..."}]} ```
~~~

## 3. 실행
- 문항마다 codex exec -m gpt-6.1-sol -s read-only --skip-git-repo-check --ephemeral (o4/blind-T4/run_eval_r1.sh와 같은 방식), 동시 4개.
- 2회(r1, r2). 결과 $SP/case-check/out-r{1,2}/<번호>.md.

## 4. 맞춰 보기 (compare.py)
결정 선지 = '적절하지 않은 것'이면 정답 1개, '가장 적절한 것'이면 오답 4개.
손 분류(아래 JSON, 원 = fact_sensitive false 기대, 보 = true 기대, 섞 = 비교에서 뺌)와 비교해 표로 낸다.
1. 결정 선지 단위 일치율(회차별, 두 회차 같은 답 비율).
2. 문항 걸림(긍정 발문: 결정 선지 중 false 3개 이상 / 부정 발문: 정답이 false) — 손 분류 걸림과 일치하는 문항 수, 어긋난 문항 목록.
3. 걸림·안 걸림 문항의 점수 평균(점수는 JSON의 score).
4. 어긋난 선지마다 codex의 why 한 줄을 그대로 옮긴다.

```json
{"K1":{"neg":true,"ans":4,"codes":{"4":"보"},"score":2.00},
 "K2":{"neg":true,"ans":4,"codes":{"4":"원"},"score":0.00},
 "K3":{"neg":false,"ans":3,"codes":{"1":"보","2":"보","4":"보","5":"보"},"score":2.00},
 "K4":{"neg":true,"ans":5,"codes":{"5":"원"},"score":1.125},
 "K5":{"neg":true,"ans":5,"codes":{"5":"보"},"score":2.00},
 "K6":{"neg":false,"ans":5,"codes":{"1":"보","2":"보","3":"보","4":"원"},"score":2.00},
 "G1":{"neg":true,"ans":2,"codes":{"2":"보"},"score":1.50},
 "G2":{"neg":false,"ans":4,"codes":{"1":"보","2":"보","3":"원","5":"보"},"score":1.00},
 "G3":{"neg":false,"ans":4,"codes":{"1":"원","2":"보","3":"보","5":"보"},"score":1.25},
 "G4":{"neg":true,"ans":2,"codes":{"2":"보"},"score":1.50},
 "G5":{"neg":true,"ans":4,"codes":{"4":"원"},"score":1.00},
 "G6":{"neg":false,"ans":2,"codes":{"1":"보","3":"원","4":"보","5":"보"},"score":1.25},
 "G7":{"neg":false,"ans":2,"codes":{"1":"보","3":"보","4":"원","5":"보"},"score":1.00},
 "G8":{"neg":true,"ans":4,"codes":{"4":"원"},"score":2.00},
 "G9":{"neg":true,"ans":4,"codes":{"4":"보"},"score":1.8125},
 "G10":{"neg":true,"ans":2,"codes":{"2":"섞"},"score":1.125},
 "G11":{"neg":false,"ans":2,"codes":{"1":"원","3":"보","4":"원","5":"원"},"score":1.25},
 "G12":{"neg":false,"ans":5,"codes":{"1":"원","2":"원","3":"보","4":"원"},"score":0.75},
 "G13":{"neg":false,"ans":2,"codes":{"1":"원","3":"보","4":"원","5":"원"},"score":1.125},
 "G14":{"neg":false,"ans":5,"codes":{"1":"원","2":"원","3":"원","4":"원"},"score":0.50},
 "G15":{"neg":true,"ans":3,"codes":{"3":"원"},"score":1.125},
 "G16":{"neg":false,"ans":1,"codes":{"2":"원","3":"원","4":"원","5":"보"},"score":1.00},
 "G17":{"neg":true,"ans":4,"codes":{"4":"원"},"score":0.875},
 "G18":{"neg":false,"ans":4,"codes":{"1":"섞","2":"원","3":"원","5":"보"},"score":2.00},
 "G19":{"neg":true,"ans":3,"codes":{"3":"원"},"score":0.50},
 "G20":{"neg":false,"ans":1,"codes":{"2":"원","3":"원","4":"보","5":"원"},"score":0.875},
 "G21":{"neg":true,"ans":4,"codes":{"4":"원"},"score":1.00},
 "G22":{"neg":true,"ans":3,"codes":{"3":"보"},"score":1.75},
 "G23":{"neg":true,"ans":2,"codes":{"2":"보"},"score":1.00},
 "G24":{"neg":false,"ans":2,"codes":{"1":"보","3":"보","4":"보","5":"보"},"score":2.00},
 "G25":{"neg":false,"ans":4,"codes":{"1":"보","2":"보","3":"보","5":"보"},"score":1.75}}
```
이 JSON을 $SP/case-check/hand-codes.json으로 저장해 쓴다.

## 5. 보고
$SP/case-check/REPORT-case-fact-check.md (표 1~4) + 사람용 요약 REPORT-case-fact-check-human.md(5줄 이내: 일치율, 기출 걸림이 K2·K4만인지, 걸림·안 걸림 점수 차, 가장 많이 어긋난 갈래).
통과 기준(웹 제안): 기출 걸림이 K2·K4뿐 + 생성 문항 걸림 일치 20/25 이상. 판정은 웹이 한다.

## 6. 커밋
$SP/case-check/ 전체 + REVIEW-case-false-spot-web.md를 한 커밋으로: "사례 검사 기준: 틀린 곳 위치 손 집계 + 사실 바꾸기 검사 무료 검증". 푸시까지. 커밋 해시를 보고 끝에 적는다.
