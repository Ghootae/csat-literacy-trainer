# 깊은 〈보기〉 문항 생성 v3 — 기술 지문 검증 (2026-11-12)

인계: docs/handoffs/2026-11-12-deep-item-generation-next-tasks.md 2절 과제 1·2. 이전 판: gold-search-api-surface-tension-2026-11-11/ (A/B v2), gold-search-api-social-2026-11-12/ (미실행 초안, 이 폴더가 대체).

## v2 → v3 바뀐 점
- rules-A.md: 13~16(사건 인과 연결, 지문 예시 옮기기 금지, 단정어 거짓 금지, V1·V2 정답 착각·짜임 차이) + 17(정답 = 깊이+매력도). 규칙 1·12 예시에서 법인 지문 소재 제거.
- rules-B.md: 같은 v3 규칙(7·8·17·20) + 정답 자리 강화(18 사례 건너뛰기 연결을 정답에, 19 깊이+매력도). 예시에서 기출 소재(잉크·첨가제·폐포) 제거, 절차형 지문(결측치·이상치의 A 기법)도 다루도록 9에 '절차 단계 공격' 추가.
- run.mjs: 1-search에 절차형·사례 건너뛰기 이동 방식 추가 / 2-select에 매력도 축, 매력도 '상' 최소 1개, B형은 식 직접 공격·사례 건너뛰기 후보 포함, 정답 후보 추천 / **3b-polish 신설**(polish-checklist.md, 표현만 수정, 정오·정답 불변, 논리 문제는 메모만) / 4-solve는 다듬은 문항을 푼다 / items.json·solve.json 저장, usage.json 누적.
- make-review.mjs: out/ 전체를 모아 정답 공개판 판정지 REVIEW-open.md 생성(지문, 발문, ⭕/❌, 출제 의도, 논리/표현 칸).
- 넣지 않은 것: 명료성 관문·이의 제기 검사(Ghootae 지시, 얕은 문항만 남을 위험).

## 지문 (골드 지도 = frozen-map.json 복사)
- audio-perceptual-coding: 오디오 지각부호화 (2026학년도 9월 모평) — docs/experiments/sns-diagnostic-gold-2026-11-05/
- missing-outlier-data: 결측치·이상치 (2024학년도 수능) — docs/experiments/analysis-gold-calibration-2026-10-20/

## 실행 (Mac 저장소 루트, .env 의 OPENAI_API_KEY)
```
for P in audio-perceptual-coding missing-outlier-data; do for M in A B; do
  PASSAGE=$P MODE=$M node docs/experiments/deep-item-v3-tech-2026-11-12/run.mjs > /tmp/v3-$P-$M.log 2>&1 &
done; done; wait
node docs/experiments/deep-item-v3-tech-2026-11-12/make-review.mjs
```
4개 실행 × 5단계. 이전 기록 기준 실행 하나 약 12~15분(병렬이면 전체도 비슷), 토큰은 v2보다 약 20% 많음(다듬기 단계).
단계 결과가 있으면 건너뛴다. 다시 돌리려면 FORCE=1 또는 해당 out/ 파일 삭제.
가짜 API로 전체 흐름 점검 완료(2026-11-12, 웹): 4실행·8문항 판정지 생성 확인.
