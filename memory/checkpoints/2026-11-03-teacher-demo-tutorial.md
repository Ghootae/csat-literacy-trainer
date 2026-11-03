# 교사 시연 튜토리얼 준비

- 날짜: 2026-11-03
- 결정: [D-0198](../decisions/D-0198-teacher-demo-pilot.md)

## 변경

- 각본 시험(정보 비대칭 5문단 + 13번, Playwright `docs/experiments/teacher-tutorial-2026-11-03/run-script.mjs`): v1에서 P1 보충 답(목적만 반복 → CLOSE_GAP 3/3)·P5 요약(오류 2개 → MULTI_ERROR 3/3)이 각본 결함으로 어긋남. v2 재시험 P1·P5 3/3, 문제 경로 3/3, P2는 4회 중 1회 GAP_QUESTION이라 "허위·과장 광고 증가"를 넣어 보강(3/3 PRAISE). 보고: `REPORT-script-run-human.md`, `REPORT-script-run-desktop.md`.
- 버그 수정 `b7d475c4`: `996c38c7` 이후 `/dialogue/lab` 첫 화면 ReferenceError(빈 화면).
- 튜토리얼 페이지·설문 초안·운영 안내 작성.
- 시연용 분리: worktree `/Users/mac/Projects/csat-literacy-teacher-demo`(`7bfb5d44` 고정)에서 5273~5275 실행, 공개 Host 헤더로 화면·문단·문제 API 200 확인, 기록은 그 폴더 `.omc/logs/`. 터널은 아직 끔(켤 때 5273).

## 남은 일

- 사용자: 튜토리얼에 설문 링크·연락처 채우기, 아티팩트 공유 설정, 시연 기간 결정, 터널 실행(`ops-guide.md` 0~1절, 시연용 5273).
- 5174 재시작 때 원래 프로세스의 다른 환경 변수는 확인하지 못했다(`ops-guide.md`대로 다시 띄우면 된다).
