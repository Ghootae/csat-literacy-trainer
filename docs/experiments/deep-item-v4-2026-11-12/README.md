# 깊은 〈보기〉 문항 v4 — 생성 규칙에 가독성·용어 기준 반영, 새 기술 지문 생성 전체 (2026-11-12)

배경: v3.1 가독성 교정 실험(가이드 v1→v3)과 코덱스 검토(../deep-item-v3.1-readability-2026-11-12/REPORT-out-v3-codex-*.md)에서, 사후 교정으로 숨긴 라벨을 장면으로 바꾸면 측정 정의가 어긋나고(처음 '안 들림' 값 ≠ 차폐 문턱값, 표본 ≠ 임계대역 전체) 〈보기〉가 55% 길어지며 조건이 바뀌는 문제가 확인됨. Ghootae 결정(2026-11-12): 추가 교정 대신 기준을 생성 규칙에 넣고 새 기술 지문으로 생성 전체를 돌린다.

## v3 → v4 바뀐 점
- rules-A/B v4: 〈보기〉는 지문 용어 그대로, 숨기는 것은 선지가 판정할 라벨 1~2개(기출 122문항 검토 근거), 숨긴 라벨은 정의문 대신 장면으로, 장면은 지문 정의와 정확히 맞게(측정 방향·표본과 전체·척도 기준; 어려우면 숨기지 않음), 필요한 장면만·한 번 정한 대상은 짧게, 선지 한 문장. 길이는 되도록 150~300자(압축 금지). 선지는 라벨을 지문 용어로 써도 되지만 장면-라벨 다리는 놓아 주지 않음.
- 3-assemble에 가독성 기준(readability-guide-v4.md)을 함께 줘서 처음부터 그 문체로 쓰게 함.
- polish-checklist v2: 지문 용어 되살리기, 장면-정의 대응 점검.
- readability-guide-v4: v3 + 조건 증감 금지(예: '빠짐없이 기록' → '결측치 없음' 금지), 장면 새로 만들기 금지, 짧은 지칭 예시, 측정 방향 예시. 예시는 시험 지문(플라스틱) 밖에서.
- 4-solve: (가) 장면-정의 대응 검사 scene-check.json, (나) 실제로 막히는 문장만 hard-sentences.json(필요한 추론·사소한 확인은 제외).

## 지문
- plastic-polymerization (플라스틱의 중합 반응과 물리적 성질, 2025학년도 6월 평가원). 지도: docs/experiments/sns-diagnostic-gold-2026-11-05/plastic-polymerization/frozen-map.json 복사.
- 주의: 이 지문의 실제 기출 10번(〈보기〉 ㉮·㉯, 가지 친 구조와 직선형 폴리에틸렌)은 모델에게 주지 않았고 COMMON 지시로 흉내를 금지함. 판정 때 기출과 겹치는지 확인.

## 실행 (저장소 루트에서, A·B 동시에)
```
V4=docs/experiments/deep-item-v4-2026-11-12
for M in A B; do
  PASSAGE=plastic-polymerization MODE=$M node $V4/run.mjs > /tmp/v4-plastic-$M.log 2>&1 &
done; wait
node $V4/make-review.mjs
```
결과: out/plastic-polymerization-{A,B}/, 판정지 REVIEW-open.md. 가짜 API로 흐름 점검 완료(2026-11-12, 웹).

## v4.1 (2026-11-12) = v4 판정에서 나온 설계 결함 3가지 수정 후 같은 지문 재실행
v4 결과(out/, REVIEW-open.md) 웹 판정: 가독성은 해결(〈보기〉 187~255자, 막히는 문장 1곳). 설계 결함: ① 같은 함정("약한 결합 = C–H 단일 결합 절단")이 A-V1 정답·B-V1③·B-V2④에 반복 ② A-V1 〈보기〉가 결과 없는 관찰 나열("살폈다/비교했다") ③ A-V2 정답이 〈보기〉 문장과 바로 모순(〈보기〉만으로 풀림) + 기출 10번과 같은 틀. 웹 순위 B-V2 > B-V1 ≈ A-V1 > A-V2.
바뀐 점: rules-A 23~25, rules-B 26~29(결과 없는 관찰 금지, 〈보기〉만으로 풀리는 선지 금지, 함정은 세트 전체에서 한 번, 식 없는 지문의 B형 공격 방식). 2-select가 4개를 서로 다른 착각으로 고르고 V1·V2에 나눠 배정. B 실행은 A 결과(items.json)를 '이미 쓴 함정'으로 받음 → **A를 먼저, B를 나중에** 실행. 4-solve에 설계 검사(design-check.json).
```
V4=docs/experiments/deep-item-v4-2026-11-12
PASSAGE=plastic-polymerization MODE=A OUT_NAME=out-v41 node $V4/run.mjs > /tmp/v41-plastic-A.log 2>&1
PASSAGE=plastic-polymerization MODE=B OUT_NAME=out-v41 node $V4/run.mjs > /tmp/v41-plastic-B.log 2>&1
OUT_NAME=out-v41 node $V4/make-review.mjs
```
결과: out-v41/, 판정지 REVIEW-open-out-v41.md (v4 결과는 그대로). 가짜 API로 흐름 점검 완료(2026-11-12, 웹).
