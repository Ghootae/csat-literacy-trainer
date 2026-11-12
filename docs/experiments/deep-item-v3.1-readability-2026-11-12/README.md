# 깊은 〈보기〉 문항 v3.1 — 가독성·오류 최종 교정 단계 비교 (2026-11-12)

배경: v3 기술 지문 8문항 판정 중 Ghootae 지적 — 〈보기〉·선지가 지나치게 압축적이라 추론과 상관없이 이해가 어려움, 숨길 필요 없는 지문 용어까지 숨김, 길이 상한은 '되도록' 기준. Ghootae 제안(2026-11-12): 생성 문항은 고정 자산이니 호출을 하나 더 붙여 가독성과 오류를 고친다.

## v3 → v3.1 바뀐 점
- run.mjs: 3b-polish 뒤에 **3c-readability** 단계 추가(readability-guide.md). 숨긴 핵심 개념 1~2개만 유지하고 나머지는 지문 용어로, 장면의 틀 먼저, 긴 관형어·추상 관계어 풀기, 맞춤법·호응. 정오·정답 불변. 4-solve는 교정한 문항을 푼다. 〈보기〉 300자는 참고 표시만.
- make-review.mjs: 문항마다 숨긴 핵심 개념과 '교정 전(v3 다듬기 결과)' 펼침 칸을 함께 보여 줌.
- rules-A/B·polish-checklist는 v3 그대로(생성 규칙 수정은 판정 끝난 뒤 v3.1 규칙으로 따로 반영).

## 이번 실행 = 같은 8문항으로 교정 단계만 비교
v3 결과의 1~3b 단계 파일을 복사해 재사용하므로, 새로 호출되는 것은 3c-readability와 4-solve뿐이다(실행당 2회 호출).
```
V3=docs/experiments/deep-item-v3-tech-2026-11-12
V31=docs/experiments/deep-item-v3.1-readability-2026-11-12
for R in audio-perceptual-coding-A audio-perceptual-coding-B missing-outlier-data-A missing-outlier-data-B; do
  mkdir -p $V31/out/$R && cp $V3/out/$R/{1-search,2-select,3-assemble,3b-polish}.md $V31/out/$R/
done
for P in audio-perceptual-coding missing-outlier-data; do for M in A B; do
  PASSAGE=$P MODE=$M node $V31/run.mjs > /tmp/v31-$P-$M.log 2>&1 &
done; done; wait
node $V31/make-review.mjs
```
가짜 API로 흐름 점검 완료(2026-11-12, 웹).

## v3.1b (2026-11-12) = 교정 기준 v2로 같은 8문항 다시 교정
바뀐 점: readability-guide-v2.md (원칙 "일반적인 고등학생이 쉽게 읽게 필요한 곳은 풀어 쓴다" + 기준 예시 4쌍 + 숨기는 것은 판정 라벨 1~2개뿐, 기출 검토 근거). 4-solve가 문장 때문에 다시 읽어야 했던 곳(hard-sentences.json)도 표시. 결과는 out-v2/, 판정지는 REVIEW-open-out-v2.md (v3.1 결과 out/·REVIEW-open.md는 그대로 둠).
입력은 v3.1과 같다: v3의 1~3b 결과(다듬기까지)를 복사. v3.1 교정본을 다시 고치는 것이 아님.
주의: 기준 예시 1은 오디오 A-V2에서 가져왔으므로 그 문항은 비교에서 참고만 한다.
```
V3=docs/experiments/deep-item-v3-tech-2026-11-12
V31=docs/experiments/deep-item-v3.1-readability-2026-11-12
for R in audio-perceptual-coding-A audio-perceptual-coding-B missing-outlier-data-A missing-outlier-data-B; do
  mkdir -p $V31/out-v2/$R && cp $V3/out/$R/{1-search,2-select,3-assemble,3b-polish}.md $V31/out-v2/$R/
done
for P in audio-perceptual-coding missing-outlier-data; do for M in A B; do
  PASSAGE=$P MODE=$M GUIDE=readability-guide-v2.md OUT_NAME=out-v2 node $V31/run.mjs > /tmp/v31b-$P-$M.log 2>&1 &
done; done; wait
OUT_NAME=out-v2 node $V31/make-review.mjs
```
가짜 API로 흐름 점검 완료(2026-11-12, 웹).

## v3.1c (2026-11-12) = 교정 기준 v3 (예시를 시험 지문 밖으로 교체)
v2 판정에서 Ghootae 지적: 기준 예시가 시험 문항(오디오 A-V2, 결측치 A-V1)에서 나와 같은 지문 문항들이 예시를 베낌. v3는 예시 5쌍을 표면 장력·법인 지문에서 가져오거나 만들고, 기출 근거 예도 블록체인으로 바꿈. 같은 8문항에 다시 돌려 공정 비교:
```
V3=docs/experiments/deep-item-v3-tech-2026-11-12
V31=docs/experiments/deep-item-v3.1-readability-2026-11-12
for R in audio-perceptual-coding-A audio-perceptual-coding-B missing-outlier-data-A missing-outlier-data-B; do
  mkdir -p $V31/out-v3/$R && cp $V3/out/$R/{1-search,2-select,3-assemble,3b-polish}.md $V31/out-v3/$R/
done
for P in audio-perceptual-coding missing-outlier-data; do for M in A B; do
  PASSAGE=$P MODE=$M GUIDE=readability-guide-v3.md OUT_NAME=out-v3 node $V31/run.mjs > /tmp/v31c-$P-$M.log 2>&1 &
done; done; wait
OUT_NAME=out-v3 node $V31/make-review.mjs
```
