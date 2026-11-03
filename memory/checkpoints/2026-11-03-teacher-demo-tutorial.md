# 교사 시연 튜토리얼 준비

- 날짜: 2026-11-03
- 결정: [D-0198](../decisions/D-0198-teacher-demo-pilot.md)

## 변경

- 각본 시험(정보 비대칭 5문단 + 13번, Playwright `docs/experiments/teacher-tutorial-2026-11-03/run-script.mjs`): v1에서 P1 보충 답(목적만 반복 → CLOSE_GAP 3/3)·P5 요약(오류 2개 → MULTI_ERROR 3/3)이 각본 결함으로 어긋남. v2 재시험 P1·P5 3/3, 문제 경로 3/3, P2는 4회 중 1회 GAP_QUESTION이라 "허위·과장 광고 증가"를 넣어 보강(3/3 PRAISE). 보고: `REPORT-script-run-human.md`, `REPORT-script-run-desktop.md`.
- 버그 수정 `b7d475c4`: `996c38c7` 이후 `/dialogue/lab` 첫 화면 ReferenceError(빈 화면).
- 튜토리얼 페이지·설문 초안·운영 안내 작성.

## 남은 일

- 사용자: 튜토리얼에 설문 링크·연락처 채우기, 아티팩트 공유 설정, 시연 기간 결정, 서버 4개(`CSAT_DEVELOPER_MODE=1`·`CSAT_PROBLEM_LAB_PUBLIC=1`)·터널 실행. 지금 터널은 꺼져 있다.
- 5174 재시작 때 원래 프로세스의 다른 환경 변수는 확인하지 못했다(`ops-guide.md`대로 다시 띄우면 된다).
