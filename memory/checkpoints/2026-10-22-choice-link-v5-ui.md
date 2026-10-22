# 선지 연결 v5 UI 6지문 재생성 (2026-10-22)

- 사용자 "A안으로 동의. 2, 3번 승인.": 비틂 목록 확정(정의 5곳 다듬기, D-0162 보완 5), 검증 규칙(contextIds 양쪽 허용, v4 맞춰 보기 위반 8→0), v5로 UI 6지문 3회.
- v5 18요청 $2.077: 위반 3(법인 evidenceQuote 2, mRNA choiceQuote 1), 기타 0/57, 종류 ALL_SAME 42·INTERSECTION 7·TWO_SHARE 7·DISJOINT 1, noneOnly 8, 대상 교집합 38/49(77.6%).
- Claude 종류 검토: 다수 종류 맞음 56/57(98.2%), 다수 없음 1(도파민 q10④, ABSOLUTIZE가 맞음). 위반 3은 인용 글자 어긋남.
- 제안: 선지별 대표 회차로 동결(A안). 사용자 판단 대기. v4·v5 미커밋.
- 보고: `REPORT-v5-ui-desktop.md`, `REPORT-v5-ui-human.md`.
- 근거: `docs/experiments/choice-link-2026-10-22/runs/ui-v5/`.
