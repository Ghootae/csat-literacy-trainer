# 깊은 〈보기〉 문항 v5 — 〈보기〉 갈래 입력 (2026-11-18)

배경: 기출 158세트 분석(../set-pattern-2026-11-18/SET-PATTERN.md)에서 3점 문항의 98%가 〈보기〉 문항이고, 〈보기〉 갈래는 그림·표 39%, 사례 32%, 외부 글·관점 19%, 실험 6%였다. v4.1 생성 8문항은 8개 모두 "연구자·운영자가 목적을 갖고 개입하는 실험 서사"였다. 기출 3점 9문항 해부(../set-pattern-2026-11-18/BOGI-ANATOMY.md)에서 생성기와 기출의 차이 셋을 확인했다.
1. 〈보기〉 형식이 한 가지(목적 있는 실험 서사).
2. 〈보기〉가 목적·까닭까지 말해 줘서 지문 없이 풀리는 선지가 생김(설계 검사 8문항 중 4개, 정답이 샌 것 1개).
3. 정답의 비튼 방식이 한 계열(짝 바꾸기·범위 넓히기). 기출 5문항은 다섯 가지 방식.
(참고) 정답 번호가 ②~④뿐, 정답이 가장 긴 선지인 비율 63%(기출 38%).

## v4.1 → v5 바뀐 점
- **갈래 입력**: 버전마다 `KIND_V1`, `KIND_V2` = `case`(사례) / `table`(표·단계 목록) / `view`(외부 글·관점). 갈래 규칙은 kind-case.md, kind-table.md, kind-view.md. 실험 갈래(6%)는 넣지 않았다.
- **공통 원칙** rules-common.md (C1~C10): 〈보기〉는 사실만(목적·까닭·판정 결론 금지), 판정 개념어 비우기, 정답은 〈보기〉만으로 안 풀림, 선지마다 다른 문단·칸, 오답은 한 지점 한 방식(비튼 방식 10가지 목록), 정답 비튼 방식 기록(V1≠V2), 반직관 지점을 축으로, 정답이 가장 긴 선지가 되지 않게, 정답 번호 지정.
- **rules-A/B v5**: 부딪치던 규칙을 바꿈. A 3·10·13·19, B 1·3·4·5·7·22(원인·동기 서사, 시간 축·한 대상 변화·조작 서사, 300자 고정 길이, "누가 무엇을 하려고" 첫 문장).
- **run.mjs**
  - 정답 번호를 기출 분포(①19 ②29 ③35 ④38 ⑤48)로 미리 정해 조립 단계에 준다. 3c 뒤에도 어긋나 있으면 선지를 맞바꿔 맞춘다(truth·intent·twists도 같이).
  - JSON에 `kind`, `answerTwist`, `twists`(선지별 비튼 방식) 추가. B 실행은 A의 정답 비튼 방식도 '이미 쓴 함정'으로 받는다.
  - 기계 점검 checks.json: 〈보기〉 목적·까닭·판정 표현, 정답이 가장 긴 선지인지, 갈래 형식(표 유무, 길이), 선지 평균 길이, 같은 비튼 방식 3개 이상, V1·V2 정답 비튼 방식 같음. 경고만 하고 다시 만들지는 않는다.
  - 4-solve에 (라) 갈래 검사 추가 → kind-check.json. 설계 검사에서 "〈보기〉만으로 풀리는 정답"은 반드시 적게 함.
- 가독성 기준(readability-guide-v4.md)과 다듬기 점검표는 v4 그대로.
- 가짜 API로 흐름 점검 완료(2026-11-18, 웹): 정답 번호 맞바꿈, checks.json, kind-check.json 동작 확인.

## 실행 계획 (4지문 × A·B × V1·V2 = 16문항)
| 지문 | A-V1 | A-V2 | B-V1 | B-V2 |
|---|---|---|---|---|
| gen31-T1-1 혈액 응고 (생성 v3.1) | 사례 | 표 | 표 | 사례 |
| gen31-T2-1 수돗물 소독 (생성 v3.1) | 사례 | 표 | 표 | 사례 |
| doppler-bloodflow (기출 교육청) | 사례 | 표 | 표 | 사례 |
| mrna-vaccine-lipid-nanoparticle (기출 교육청) | 사례 | 표 | 표 | 사례 |

- 네 지문 모두 과학·기술(작동 원리) 지문이라 기출 분포상 표·도식과 사례가 맞는다. 외부 관점 갈래는 관점 지문으로 따로 시험한다.
- 미리 정해지는 정답 번호(지문·양식·버전 고정 난수): ①2 ②2 ③3 ④4 ⑤5.
- 비용: v4.1과 같은 단계 수라 약 $6.

## 판정 계획
- 기계: 설계 문제(〈보기〉만으로 풀림) 수를 v4.1 out-gen31(8문항 중 4)과 비교, checks.json 경고 수, 정답 비튼 방식 분포.
- 사람(Ghootae): 같은 지문 기출 3점 문항과 섞어 블라인드로 풀고 "수능 같은가"를 고른다.

## v5.1 (2026-11-19) = 표 문항 8개만 다시 만들기
v5 결과(RESULT.md): 표 〈보기〉 8개 중 6개가 "열마다 다른 상황을 문장으로 적은 표"였고, 결과 행에 판정이 들어가 선지가 표를 쓰지 않았다. 사례 문항 8개는 그대로 두고 표 문항만 다시 만든다.
- kind-table.md: 같은 행 = 같은 변수, 칸은 10자 안팎 값, 결과 행 금지, 식 없는 지문은 열 = 단계·조건 묶음 / 행 = 있음·없음, K-T6(선지 셋 이상이 칸 값을 써야 풀림), 나쁜 예 추가.
- run.mjs: `ONLY=V1|V2`(한 버전만), `KEEP_OUT=out-v5`(1-search·2-select 재사용, 다른 버전을 '확정된 다른 버전'으로 넘김). checks.json에 표 칸 평균 길이, 결과·관찰 행 경고. 4-solve 갈래 검사에 "표 칸을 가려도 풀리는 선지 수" 추가, 의도된 값 유인은 문제로 적지 않게 함.
- 결과: out-v51/<지문>-<A|B>/items.json(새 표 문항), items-merged.json(사례 + 새 표). 가짜 API로 흐름 점검 완료(2026-11-19, 웹).
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do
  ( PASSAGE=$P MODE=A ONLY=V2 KIND_V1=case KIND_V2=table OUT_NAME=out-v51 node $V5/run.mjs > /tmp/v51-$P-A.log 2>&1
    PASSAGE=$P MODE=B ONLY=V1 KIND_V1=table KIND_V2=case OUT_NAME=out-v51 node $V5/run.mjs > /tmp/v51-$P-B.log 2>&1 ) &
done; wait
```

## v5.2 (2026-11-19) = 블라인드 풀이(Ghootae)·코덱스 검토 반영
근거: RESULT.md "블라인드 풀이", "코덱스 판정과 비교", 코덱스 답변(blind/REPORT-v52-discussion-*.md).
- rules-common.md: C3 개정(핵심 관찰을 가려도 정답과 경쟁 선지가 구별되면 실패), C11 오답 역할(경쟁 1·중간 2·쉬움 1, A/B 극성 구분), C12 판정이 끝나는 근거, C13 선지가 〈보기〉를 대체하지 않기, C14 반사실은 허용하되 유일한 관찰 덮어쓰기 금지, C15 정답 유일성, C16 경쟁 선지 만드는 두 방법(관찰 맞고 해석 틀림 / 결과 맞고 원인 틀림, 다른 화제 예시), C17 같은 칸을 다른 관계로 읽게.
- run.mjs: 조립 JSON에 roles(선지 역할)·rival(경쟁 선지) 추가, 정답 번호 맞바꿈 때 함께 옮김.
- eval-repair.mjs(새 파일): 검사 3단계 + 수리 1회.
  - e1-mask(정답 앎): 정답과 경쟁 선지를 가르는 〈보기〉 핵심 관찰을 □로 가린 판을 만든다.
  - e2-masked(정답 모름, 별도 호출): 가린 판으로 풀어 근거 있게 지울 수 있는 선지만 지운다.
  - e3-shortcut(정답 모름, 원본): 선지별 판정 구절·최소 근거·지문 한 사실로 판정되는지 직접 해 보기, 경쟁 선지, 정답 유일성.
  - 수리 사유: 핵심 관찰 없음 / 가려도 정답만 남음 / 정답이 지문 한 사실로 판정 / 오답 넷이 모두 지문 한 사실로 지워짐 / 정답 후보가 하나가 아님 / 정답이 가장 긴 선지. REPAIR=1이면 사유가 있는 문항만 e4-repair로 고치고 다시 검사(e1r~e3r).
  - 가짜 API로 흐름 점검 완료(2026-11-19, 웹).

### 1단계: 검사기 보정 (생성 없이 v5.1 문항 16개만 검사, 약 $2)
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  PASSAGE=$P IN=$V5/out-v51/$P-$M/items-merged.json OUT_DIR=$V5/calib-v51/$P-$M node $V5/eval-repair.mjs > /tmp/calib-$P-$M.log 2>&1 &
done; done; wait
```
기대(사람·코덱스 판정): 도플러 B-V2(블라인드 '나')는 수리 필요, 도플러 B-V1('가')은 통과. mRNA B-V1('가') ③·A-V2('다') ⑤·A-V1('마') ③에서 지름길이 잡히는지.

### v5.2 → 1단계: 검사기 보정 2차 (2026-11-19)
보정 1차 결과는 RESULT.md. 바뀐 점: e3에 steps 필드, 정답 steps≤1이면 수리. 기출 12번·19번(calib-gold/)으로 거짓 경보 점검.
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  PASSAGE=$P IN=$V5/out-v51/$P-$M/items-merged.json OUT_DIR=$V5/calib2-v51/$P-$M node $V5/eval-repair.mjs > /tmp/calib2-$P-$M.log 2>&1 &
done; done
PASSAGE=doppler-bloodflow IN=$V5/calib-gold/doppler-12.json OUT_DIR=$V5/calib2-gold/doppler-12 node $V5/eval-repair.mjs > /tmp/calib2-g12.log 2>&1 &
PASSAGE=mrna-vaccine-lipid-nanoparticle IN=$V5/calib-gold/mrna-19.json OUT_DIR=$V5/calib2-gold/mrna-19 node $V5/eval-repair.mjs > /tmp/calib2-g19.log 2>&1 &
wait; tail -n 3 /tmp/calib2-*.log
```

### v5.2 → 2단계: 생성 + 자동 수리 (2026-11-19, 약 $8)
보정 결과(RESULT.md "보정 2차"): 사람 판정 7/8 일치, 기출 12·19번 통과. 1-search·2-select는 out-v5 것을 재사용(같은 지문·같은 금광 후보, 조립부터 v5.2 규칙).
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  mkdir -p $V5/out-v52/$P-$M && cp $V5/out-v5/$P-$M/1-search.md $V5/out-v5/$P-$M/2-select.md $V5/out-v52/$P-$M/
done; done
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do
  ( PASSAGE=$P MODE=A KIND_V1=case KIND_V2=table OUT_NAME=out-v52 node $V5/run.mjs > /tmp/v52-$P-A.log 2>&1
    PASSAGE=$P MODE=B KIND_V1=table KIND_V2=case OUT_NAME=out-v52 node $V5/run.mjs > /tmp/v52-$P-B.log 2>&1
    for M in A B; do PASSAGE=$P IN=$V5/out-v52/$P-$M/items.json OUT_DIR=$V5/out-v52/$P-$M/repair REPAIR=1 node $V5/eval-repair.mjs > /tmp/v52-$P-$M-repair.log 2>&1; done ) &
done; wait
tail -n 3 /tmp/v52-*.log; cat $V5/out-v52/*/repair/eval-summary.txt
```
결과: out-v52/<지문>-<A|B>/items.json(생성 직후), repair/items-final.json(수리 후), repair/eval.json(수리 전·후 검사).

## v5.3 초안 (2026-11-19) = v5.2 블라인드(Ghootae·코덱스) 반영
- rules-common.md C18 거울 짝 금지, C19 정답은 〈보기〉 관찰 둘 이상, C20 한 번 더 넘기는 판정, C21 기호 표현.
- eval-repair.mjs: e3에 bogi_sources(선지별 〈보기〉 관찰 수)·mirror_pair(거울 짝). 정답이 거울 짝에 들거나 정답 bogi_sources ≤ 1이면 수리. 수리 지시에도 반영.

### v5.3 → 1단계: 검사기 보정 3차 (생성 없이, 약 $2)
v5.2 수리 후 도플러·mRNA 8문항 + 기출 12·19번을 새 검사기로 본다. 기대: mRNA 가(③④ 거울 짝)·도플러 라(②⑤)·mRNA 다(E 한 열)·mRNA 나(pH 한 대목) 수리, 도플러 나 통과, 기출 둘 통과.
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  PASSAGE=$P IN=$V5/out-v52/$P-$M/repair/items-final.json OUT_DIR=$V5/calib3-v52/$P-$M node $V5/eval-repair.mjs > /tmp/calib3-$P-$M.log 2>&1 &
done; done
PASSAGE=doppler-bloodflow IN=$V5/calib-gold/doppler-12.json OUT_DIR=$V5/calib3-gold/doppler-12 node $V5/eval-repair.mjs > /tmp/calib3-g12.log 2>&1 &
PASSAGE=mrna-vaccine-lipid-nanoparticle IN=$V5/calib-gold/mrna-19.json OUT_DIR=$V5/calib3-gold/mrna-19 node $V5/eval-repair.mjs > /tmp/calib3-g19.log 2>&1 &
wait; tail -n 3 /tmp/calib3-*.log
```

### v5.3 → 2단계: 생성 + 자동 수리 (2026-11-19, 약 $8)
보정 3차 결과는 RESULT.md. 거울 짝은 수리 사유, 〈보기〉 관찰 수는 경고.
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  mkdir -p $V5/out-v53/$P-$M && cp $V5/out-v5/$P-$M/1-search.md $V5/out-v5/$P-$M/2-select.md $V5/out-v53/$P-$M/
done; done
for P in gen31-T1-1 gen31-T2-1 doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do
  ( PASSAGE=$P MODE=A KIND_V1=case KIND_V2=table OUT_NAME=out-v53 node $V5/run.mjs > /tmp/v53-$P-A.log 2>&1
    PASSAGE=$P MODE=B KIND_V1=table KIND_V2=case OUT_NAME=out-v53 node $V5/run.mjs > /tmp/v53-$P-B.log 2>&1
    for M in A B; do PASSAGE=$P IN=$V5/out-v53/$P-$M/items.json OUT_DIR=$V5/out-v53/$P-$M/repair REPAIR=1 node $V5/eval-repair.mjs > /tmp/v53-$P-$M-repair.log 2>&1; done ) &
done; wait
tail -n 3 /tmp/v53-*.log; cat $V5/out-v53/*/repair/eval-summary.txt
```

### v5.3 → 2단계(축소판): 판정에 쓰는 두 지문만 (2026-11-19, 약 $4)
코덱스 블라인드는 도플러·mRNA 8문항만 쓰므로 gen31 두 지문은 뺀다.
```
V5=docs/experiments/deep-item-v5-2026-11-18
for P in doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do for M in A B; do
  mkdir -p $V5/out-v53/$P-$M && cp $V5/out-v5/$P-$M/1-search.md $V5/out-v5/$P-$M/2-select.md $V5/out-v53/$P-$M/
done; done
for P in doppler-bloodflow mrna-vaccine-lipid-nanoparticle; do
  ( PASSAGE=$P MODE=A KIND_V1=case KIND_V2=table OUT_NAME=out-v53 node $V5/run.mjs > /tmp/v53-$P-A.log 2>&1
    PASSAGE=$P MODE=B KIND_V1=table KIND_V2=case OUT_NAME=out-v53 node $V5/run.mjs > /tmp/v53-$P-B.log 2>&1
    for M in A B; do PASSAGE=$P IN=$V5/out-v53/$P-$M/items.json OUT_DIR=$V5/out-v53/$P-$M/repair REPAIR=1 node $V5/eval-repair.mjs > /tmp/v53-$P-$M-repair.log 2>&1; done ) &
done; wait
tail -n 3 /tmp/v53-*.log; cat $V5/out-v53/*/repair/eval-summary.txt
```
