# 동결 지도와 입장

- 지도: `frozen-map.json` = `rerun-r2/runs/map-r2.json` 사본(수정 없음), sha256 `806716cc2d531dd7ef599851aae8a2a30ceee2cd8480dbad49a3ac40e2d2776f`. 동결 2026-10-21, 사용자 "권고대로 사용자 선택 회차로 동결하자".
- 선택: 사용자 r2, Claude 봉인 r2(사용자 "써도 됨"). 이유 원문 `../calibration/USER-freeze.md`, 비교 `../calibration/FREEZE-COMPARE.md`.
- 회차 2는 503 오류 뒤 재전송본(D-0151 보완).
- 입장: `stance/stance.json`(sol 1회, 공손룡 `STANCE-PROMPT.md` 그대로, 검증 3항목 통과). 판정용 확정본 `stance/stance-final.json`은 사용자 검토(`../calibration/USER-stance.md`) 덮어쓰기를 반영, 2026-10-21. Claude 봉인과의 비교 `../calibration/STANCE-COMPARE.md`.
- 관계 유형: `../classify/modern-civilization-science-na/classify.json`(CLASSIFY-PROMPT-v3, sol medium 1회, 검증 통과, 27개, 기타 0), 2026-10-21. 묶음 요약 `../classify/summary.json`.
