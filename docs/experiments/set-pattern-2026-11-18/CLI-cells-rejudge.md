# CLI-cells-rejudge — 남은 세 칸을 새 기준으로 재판정 (2026-11-27, 웹 작성)

- 근거: 사례 A형 연구(lure-check·a-recheck·top-features)에서 "1.5 절대 기준은 기출도 대부분 못 넘는다"를 확인. Ghootae 결정(2026-11-27 11:18 KST) "남은 칸 새 기준 재판정 (0원)".
- 대상 칸(PROGRESS-hard 기준 아직 통과 아님): 과학 사례(미달, 고체 촉매), 사회 관점(거의 1.31, 정보 비대칭), 사회 그래프 L2(거의 1.44, 조세 귀착 기출 지문. 생성 지문 L3는 그래프 스레드에서 1.81 통과).
- 새 기준: 칸의 생성 문항을 **문항 하나씩 단독 블라인드**로 다시 재고, **같은 갈래 기출을 같은 형식으로 잰 평균**과 비교한다.
- **추정 비용: 0원** (유료 API 없음. codex 생성 12 + 새 기출 6 = 18문항 × 8회 = 144회). 예상 1.5~2시간. 생성은 하지 않는다.
- **최소 실행 = 2단계 1문항(8회)으로 확인 뒤 나머지.**

CLI에 붙여 넣을 한 줄:

```
docs/experiments/set-pattern-2026-11-18/CLI-cells-rejudge.md 를 읽고 코드 블록 안의 지시를 그대로 실행해
```

---

```
[지시] 남은 세 칸 새 기준 재판정. 0원(codex만). 판정 기준은 아래에 미리 적혀 있다. 고치지 마라.

약어: SP = docs/experiments/set-pattern-2026-11-18, CJ = $SP/calib-judge, CC = $SP/case-check, TF = $CC/top-features, OUT = $SP/cells-rejudge

금지: 코드·생성 규칙 파일 수정 금지. 유료 API 금지. checkout / stash / restore / reset / force push 금지. 기존 폴더는 읽기만.

0단계 (확인)
- 브랜치 experiment/problem-solving-mvp, git log 에 bbe268c8. 남의 미커밋 파일은 커밋에 넣지 마라.
- 있어야 할 것: $CJ/make_blind.py(old_block·passage_db·question·block 함수), $CC/lure-check/make_blind.py(단독 풀이지·CODEX-PROMPT·run_eval.sh 문안), $CJ/<폴더>/REPORT-eval-*.md, $TF/aggregate-out.md,
  $SP/cell1-v62/blind/BLIND-cell1.md, $SP/cell1-v62/r2/blind/BLIND-cell1r2.md, $SP/cell2/blind/BLIND-cell2.md + imgs/pic-가.png·pic-마.png, $SP/cell3/blind/solid-catalyst/BLIND-r1.md, $SP/cell3/blind-r2/solid-catalyst/BLIND-r1.md,
  /Users/mac/Projects/suneung_db/output/passages/ 와 assets/, 이 파일. `codex --version`. 없으면 멈추고 보고.
- 비용 스스로 추정: 유료 0회, codex 144회 한 줄.

1단계 (단독 블라인드 만들기) — $OUT/make_blind.py. 풀이지·CODEX-PROMPT·run_eval.sh 문안은 $CC/lure-check 것과 한 글자도 다르지 않게(그림 있는 문항은 $CJ 의 그림 판 문안: pic-1.png 첨부, codex -i). 지문 제목은 "# 지문" 한 줄. 폴더 C01~C18, random.seed(20261131). 키는 $OUT/KEY.md·KEY.json 에만.
- 생성 문항은 예전 블라인드 파일에서 그 문항 블록과 그 문항의 지문을 그대로 가져온다($CJ/make_blind.py 의 old_block 과 같은 방식, 번호만 1로). 같은 글의 문항이 두 블라인드에 있으면 하나만(본문 글자 비교).
  [과학 사례 — 고체 촉매] (6)
    SC-A1  : cell3/blind/solid-catalyst/BLIND-r1.md 문항 3 (out-cell3-v62 A-V1)
    SC-A2  : 같은 파일 문항 5 (A-V2)
    SC-B1  : 같은 파일 문항 2 (B-V1)
    SC-B2  : 같은 파일 문항 1 (B-V2)
    SC-rB1 : cell3/blind-r2/solid-catalyst/BLIND-r1.md 문항 1 (out-cell3-v62-regen B-V1)
    SC-rB2 : 같은 파일 문항 5 (regen B-V2)
  [사회 관점 — 정보 비대칭] (최대 4)
    SV-A1  : cell1-v62/blind/BLIND-cell1.md 문항 가 (v6.2 A-V1)
    SV-B1  : 같은 파일 문항 나 (v6.2 B-V1)
    SV-rA1 : cell1-v62/r2/blind/BLIND-cell1r2.md 문항 마 (2회차 v6.2 A-V1)
    SV-rB1 : 같은 파일 문항 나 (2회차 v6.2 B-V1)
  [사회 그래프 — 조세 귀착 기출 지문] (2, 그림 있음)
    SG-A2  : cell2/blind/BLIND-cell2.md 문항 가 + imgs/pic-가.png
    SG-B2  : 같은 파일 문항 마 + imgs/pic-마.png
- 새 기출 앵커(같은 갈래, 단독, 3점 〈보기〉) — 지문 passage_db(set_id), 문항 question(set_id, 번호)
  [사회 관점]
    KV-신문사  69bbf8c9a029f488d9e5217f  12
    KV-방송법  69c08d6c78128b2a9bedeee8  23
    KV-하딘    69c0a5b778128b2a9bee10fc  37
    KV-효율성  6a2294ff86fd308968e1110f  27
  [사회 그래프] (〈보기〉 그림을 suneung_db assets/<set_id>/ 에서 찾아 pic-1.png 로 첨부. 그림 파일을 못 찾으면 그 문항을 빼고 보고. 읽기 판은 만들지 않는다)
    KG-관세    69bffdf378128b2a9bedd0cd  6
    KG-소비    69c097c0fa5063deffe1d595  18
- 확인 출력: KEY 표, 글자 수, 그림 첨부 여부, 출처 낱말 grep("학년도|수능|모의|생성|v6|v5|out-|cell|기출").

2단계 (시험) C 폴더 하나 run_eval.sh(8회). 4개 이상 비면 멈추고 보고.
3단계 (나머지) 차례로. 실패 회차만 한 번 다시.

4단계 (집계) $OUT/aggregate.py ($CC/lure-check/aggregate.py 복사)
- 문항별: 점수(2/1/0 평균), 같음/중/아님, 정답 일치, 결함.
- 칸별 G = 생성 문항 평균, 바닥 = 생성 문항 중 '수능 아님' 4/8 이상인 문항 수.
- 칸별 기출 기준 M(이미 단독으로 잰 점수를 함께 씀):
  · 과학 사례: 이번 측정 없음. $TF 의 K06 혈압, K38 도파민, P-K12 전지, K43 딱정벌레, K17 고체 촉매 점수 + $CJ plastic-10 점수(REPORT 8개 평균). 6개 평균. (고체 촉매 지문 자체의 기출 K17 점수도 따로 적는다.)
  · 사회 관점: KV 4개 + $CJ infoasym-13 점수. 5개 평균.
  · 사회 그래프: KG 2개(빠진 것 제외) + $CJ tax-incidence-12 점수. 평균.
- 결과 $OUT/aggregate-out.md

5단계 (미리 정한 판정, 칸마다, 아래 문구로)
   바닥 ≥ 1                → "미달(바닥: 수능 아님 4/8 이상 문항 있음)"
   그렇지 않고 G ≥ M − 0.4  → "통과(같은 갈래 기출 수준)"
   그렇지 않고 G ≥ M − 0.8  → "거의"
   그 밖                    → "미달"
  함께 적기: G, M, G−M, 칸에서 가장 높은 생성 문항 점수, 예전 판정(과학 사례 미달 / 사회 관점 거의 1.31 / 사회 그래프 거의 1.44).
  과학 사례에는 "지문 기출(K17 고체 촉매) 점수"도 옆에 적는다(지문 탓 참고).

6단계 (보고서) $OUT/REPORT-cells-rejudge.md(표·판정·문항별 이유 r1-1·r2-1) + -human.md(쉬운 말, 맨 위 칸별 판정 문구, 번호에는 괄호로 내용).

7단계 (커밋·푸시)
- git add: $OUT/ 전체, $SP/CLI-cells-rejudge.md. 다른 파일 add 금지(PROGRESS-hard 는 고치지 마라. 웹이 결과를 보고 따로 정한다).
- 메시지: "set-pattern: 남은 세 칸 단독 블라인드·같은 갈래 기출 대비 재판정 (cells-rejudge, 0원)"
- push(force 금지). 거부되면 fetch 후 merge 하고 다시 push, 보고.
- 커밋 해시와 칸별 판정 문구를 보고하고 멈춰라.
```

## 웹이 미리 적어 둔 것

- 예측(적어 두기만): 사회 관점 = 통과, 사회 그래프 = 통과, 과학 사례 = 바닥 때문에 미달 유지(고체 촉매 지문 자체가 얕음, 기출 K17 0.0).
- 생성 지문 L3 그래프는 이미 통과라, 사회 그래프 L2 결과는 기록 정리용이다.
- 사회 관점 기출 앵커 4개는 웹이 〈보기〉 첫 줄을 보고 고른 것이다(신문사 사례 비교, 방송법 조문, 하딘 공유지, 행정 효율성). 관점 갈래가 아니면 CLI 가 보고에 적는다.
