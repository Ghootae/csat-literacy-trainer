# 동결 지도와 입장

- 지도: `frozen-map.json` = `runs/map-r3.json` 사본(수정 없음), sha256 `4fc1a6d3fac98b6736a713b1cf08ea99a4e3c9545f496ae74a8184756dda494b`. 지도 지시문 v2(D-0155). 동결 2026-10-21, 사용자 선택 회차(D-0151 보완 2).
- 선택: 사용자 r3 (차순위 r2), Claude 봉인 r3 (같음). 이유 원문 `../calibration/USER-freeze.md`, 비교 `../calibration/FREEZE-COMPARE.md`.
- 관찰: 사용자 "세 회차 모두 금 예시(문장 3)를 퍼트넘이 든 근거처럼 썼어요. 원문에서 퍼트넘의 근거는 자연종 명사(문장 4)이고 '예를 들어'는 필자의 예시". 지도는 고치지 않으므로 C4-2 문구("퍼트넘은 … 예와 … 자연종 명사를 통해 … 뒷받침")는 그대로 두고, P4-4 귀속은 입장 층에서 정한다.
- 관찰: Claude 봉인 관찰 — P5-2가 "점에서 … 평가받는다"를 한 명제로 합침, 관계 C4-4→P4-7이 묶음에서 자기 자식을 가리킴.
- 입장: `stance/stance.json`(sol 1회, `../STANCE-PROMPT-v2.md`, 검증 3항목 통과). 판정용 확정본 `stance/stance-final.json`은 사용자 검토(`../calibration/USER-stance.md`) 덮어쓰기를 반영, 2026-10-21. Claude 봉인과의 비교 `../calibration/STANCE-COMPARE.md`.
- 관계 유형: 아직 없음.
