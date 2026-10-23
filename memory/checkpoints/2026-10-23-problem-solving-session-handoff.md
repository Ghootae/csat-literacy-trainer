# 문제 풀이 세션 이어받기 (2026-10-23)

사용자가 주간 사용량 한도로 다른 계정에서 이어 작업한다(사용자 2026-10-23 "바로 이어서 할 수 있도록 작업 내용을 기록해줘"). 이 문서는
문제 풀이 파트를 맡던 Claude 세션(`4e53703c…`, 2026-10-21~23)의 마지막 상태와 다음 할 일만 담는다. 상세 이력은
[2026-10-22 체크포인트](./2026-10-22-v5-diverse-48-regression-and-b3-fix.md).

## 지금 상태

- 브랜치 `experiment/problem-solving-mvp`, 원격과 같음. 이 세션의 마지막 커밋 `bffc5e4`(D-0166). 이 세션 작업분은 모두 커밋·푸시됐다.
- 작업 폴더의 다른 수정·미추적 파일은 다른 세션(문단 요약 `20dca876…`, 분석 지도·선지 연결 등) 것이다. 커밋할 때 섞지 않는다.
  공유 색인(`memory/DECISIONS.md`, `WORK_TREE.md`, `CURRENT_STATE.md`, `OPEN_QUESTIONS.md`)은 우리 줄만 부분 반영한다
  (`git hash-object -w` + `git update-index --cacheinfo`).
- 개발 서버(5173 화면·5174 학습·5175 문제 API)는 다른 세션이 2026-10-22 22:34에 다시 띄운 상태다. 문제 판정 지시문은 판정마다 파일을
  새로 읽으므로 지시문 변경은 재시작 없이 반영된다. 서버 코드 변경은 빌드 뒤 재시작이 필요하고, 재시작은 사용자에게 묻는다.

## 이번 세션에서 끝낸 것 (결정 순)

| 결정 | 내용 |
|---|---|
| D-0161 | 정답 근거 충분 = 핵심 관계 조각(2개 이상)을 겹치지 않는 학생 인용으로 모두 덮음(UI 메모장 29번) |
| D-0164 | 선택 충돌 항목의 학생 인용은 충분성 인용 금지에서 뺌(48세션 회귀에서 찾은 B3 버그) |
| D-0166 | "원문에 없음" 근거: 선지가 원문 사실로 반박되지 않고 뒷받침만 없을 때 그 부분을 짚으면 핵심 관계, 반박되면 판단 방식(D-0159), 있는 내용을 없다고 하면 오류(UI 메모장 36번) |
| 화면 | 문제·문단 개발자 화면 공간 정리, 대화창·칠한 곳 자동 스크롤(UI 메모장 31~35번, 커밋 `4936892`·`76121e8`) |
| 실행기 | `run-v5-live-check.mjs` `draft()` A2 재선택을 문항 번호로 찾음(`dea15ec`) |

## 다음 할 일 (우선순위 순)

1. **UI 메모장 30번 논의**(사용자가 "나중에 한꺼번에 논의"로 미룸): 표면 장력 16번 정답·근거 부족/오류 세션의 피드백 규칙. Claude 관찰 ①~⑤는
   `docs/review/v4-dev-ui-feedback-backlog-2026-10-11.md` "30번 상세". 그중 ②(덜 말한 근거를 "만으로"로 보태 읽어 오류로 잡음)와 ③(교정 질문
   두 번째 보기가 정답 문장이라 베껴 답함)은 mRNA 19번 세션에서도 같은 갈래가 보였다(③, `docs/reports/REPORT-mrna-q19-session-review-2026-10-22-desktop.md`).
2. 사용자가 개발자 화면에서 직접 풀며 새 메모를 줄 가능성이 높다. 메모는 같은 메모장에 37번부터 적는다(원문 그대로 인용, 상태 열).
3. 추적 과제: 회사법 K1에서 공식 해설에만 있는 조각을 넣는 흔들림(6회 중 2회, D-0166 보고). B형(근거 없는 덧붙임) 정답이 있는 다른 문항으로
   D-0166 일반화 확인.
4. 큰 갈래(사용자 결정 필요): 실제 학생 검증, 학생용 화면 전환(CP-B), Q-0032 경계 응답 기준.

## 사용자와 일하는 방식 (이 세션에서 확인된 것)

- 보고는 쉬운 한국어, 직관 먼저 표는 뒤. 과제 보고는 Desktop·사람용 두 파일(D-0163, `AGENTS.md` "결과 보고 형식").
- 설계 판단은 선택지 나열보다 근거 있는 권고 하나. 판정 질문 바로 앞에 대화 원문을 같은 응답에서 보여 준다.
- 사용자 예시는 방향 예시다. 사용자 논리 지적이 맞으면 바로 인정하고 고친다(D-0166에서 Claude C안 폐기 사례).
- 화면 변경은 단순 모형 그림을 먼저 보여 주고 승인 뒤 구현했다(`docs/handoffs/2026-10-22-*-layout-economy-mock.png`).
- 외부 API 실행은 매번 사용자 승인, 비용 추정과 상한을 함께 제시. 키는 출력하지 않고 `node --env-file=.env`로만 쓴다.
- 커밋은 파일 목록·메시지 초안을 보여 주고 승인 뒤, `git add -A` 금지, 푸시는 별도 승인(사용자는 보통 "커밋 후 푸시"로 함께 승인).
- 확정 설계는 `docs/handoffs/` 인계 문서 → executor(sonnet) 위임 → Claude diff 검토(D-0128). 지시문 몇 문장 같은 작은 일은 Claude 직접.

## 실모델 확인 방법 (재사용)

- 실행기: `scripts/run-v5-live-check.mjs` 모드 `prepare | wave <actions.json> | draft | status`. 환경 변수 `V5_LIVE_CHECK_DIR`(새 실험 폴더),
  `V5_LIVE_CHECK_CASES`(사례 모듈, 예 `./v5-absence-falsity-type-r2-user-cases.mjs`), `V5_LIVE_CHECK_LIMITS`(모델별 `requests`·`usd` 상한).
  `prepare` 뒤 `FROZEN.json`의 `authorization`에 사용자 승인 문구를 적는다. 지시문·런타임 파일이 바뀌면 FROZEN 해시가 달라지므로 새 폴더로 돌린다.
- 반복 실행: `prepare` → 사례별 `actions/initial.json`을 `wave` → `draft`가 버튼 단계 명령을 만들고, 자유 응답이 필요한 단계는 `command: null`로 남긴다
  (Claude가 질문을 보고 학생 답을 써서 `wave`로 보냄). 이 세션은 이 반복을 스크래치 파이썬 드라이버로 돌렸다(세션 임시 폴더라 남지 않음).
  드라이버를 새로 쓸 때 `RETRYABLE_ERROR`의 원인이 `RUN_LIMIT`이면 `RESUME`을 반복하지 말고 멈춰야 한다(2026-10-22 B3 재확인에서 3,400단계 반복 사고).
- 상한은 세션당 호출 수 × 세션 수로 잡는다(정답 선택: 첫 판정·마지막 설명 luna, 오답: sol). macOS에 `timeout` 없음, 셸은 zsh.
- 격리 e2e: `PLAYWRIGHT_CLIENT_PORT=5383 CSAT_API_PORT=5384 npx --no-install playwright test packages/app/e2e/problem-feedback-v4-workbench.spec.ts`
  (브라우저는 설치된 Chrome, `channel: 'chrome'`). 현재 15/15. `npm test` 기존 실패 2개(`boundary.test.ts` student-state node:fs, axis-architecture `.omc` 파일).
