# 동결 지도와 입장

- 지도: `frozen-map.json` = `runs/map-r3.json` 사본(수정 없음), sha256 `2e079e1feac889a3d1e4e4628c6f9d3b448a9bd9b91d74a6aa1b5016a62fad11`. 동결 2026-10-21, 사용자 "권고대로 사용자 선택 회차로 동결하자".
- 선택: 사용자 r3 (r2와 근소), Claude 봉인 r2(사용자 "써도 됨"). 이유 원문 `../calibration/USER-freeze.md`, 비교 `../calibration/FREEZE-COMPARE.md`.
- 관찰: 사용자 "최상위에서 2·3문단과 4·5문단을 나눈 방식은 r2가 더 자연스러워요" (r3 최상위는 문단 2·3을 한 묶음, 4·5를 한 묶음).
- 입장: `stance/stance.json`(sol 1회, 공손룡 `STANCE-PROMPT.md` 그대로, 검증 3항목 통과). 판정용 확정본 `stance/stance-final.json`은 사용자 검토(`../calibration/USER-stance.md`) 덮어쓰기를 반영, 2026-10-21. Claude 봉인과의 비교 `../calibration/STANCE-COMPARE.md`.
- 관계 유형: `../classify/missing-outlier-data/classify.json`(CLASSIFY-PROMPT-v3, sol medium 1회, 검증 통과, 25개, 기타 0), 2026-10-21. 묶음 요약 `../classify/summary.json`.
