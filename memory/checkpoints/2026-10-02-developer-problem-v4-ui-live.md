---
date: 2026-10-02
scope: developer-problem-v4-ui-live
base_commit: uncommitted
---

# 개발자 v4 3단 화면·서랍·터널 연결

## 이번 변경

- `packages/app/src/client/ProblemFeedbackV4App.tsx`: 3단 지문/문제/대화, 독립 스크롤,
  누적 응답·피드백, 하단 선택/근거/명시적 미제출, 교정 중 번호 잠금, 재선택 1회,
  정상 코칭 종료의 정답·해설, 종료 후 입력 비활성화. 모바일은 지문/문제/대화 탭.
- `packages/app/src/client/FeedbackV4Drawer.tsx`: 발문 참/거짓 선택 의미, 근거 결론과
  일치 여부, 회차별 학생 인용/재구성, 오류별 수정 상태, 최종 정오/근거 검증 분리.
- `packages/app/src/server/problem-feedback-v4.ts`: 서버 누적 대화를 공개 뷰와 이벤트
  기록에 보존. 읽기 전용 검사 API는 검증된 assessments/수정 원장을 별도로 투영.
- `packages/app/src/client/problem-feedback-v4-api.ts`: 별도 v4 경로. 초안/전송 ID 보존,
  전송 실패 후 서버 조회, 같은 전송 재시도, 평가 실패 RESUME, 처리 중 조회를 연결.
- `packages/app/src/client/DialogueApp.tsx`: 개발자 맵/문단 완료 연결만 v4로 변경.
  학생 경로와 v3 로직은 유지했다.

## 검증

- TypeScript 전체 build·클라이언트 검사·Vite build 통과.
- v4 코어68 + v4 서버7 + v4 HTTP3 = 78테스트 통과.
- 별도 기존 v3 서버17 + 클라이언트 복구3 + 중복 v4 서버7도 통과: 중복 제외98개.
- 브라우저 고유38개 통과: 문단 워크벤치7, 새 v4 UI6, 기존 평가 서랍5, 기존 v3 흐름20.
  새 UI는 복수 교정·재선택·검증 정답, 미제출 오답/코칭 공개, 모호 정답 미검증/모바일,
  시스템 실패 재개, 교정 실패/자료 경계, POST 응답 유실 복구를 모의 평가기로 확인했다.
- 1600×1000 및390×844 렌더 육안 확인. 슬라이드의 원색 대신 기존 녹색/회색 계열과
  카드/글꼴을 재사용했다. 새 메시지는 최신 위치로 스크롤한다.
- 실제 모델 평가 호출은 0회. UI 분기·통신 검증이며 모델 의미 정확도 추가 증거는 아니다.

## 실제 실행

- 기존5173 프런트 PID70885·5174 API PID70884는 유지했다. Vite 설정 재로딩으로
  `/api/developer/problem-feedback-v4`만5175로 프록시한다. 기존 메모리 세션을 종료하지 않았다.
- `CSAT_DEVELOPER_MODE=1 CSAT_PROBLEM_V4_PUBLIC=1 CSAT_STUDENT_FEEDBACK_PUBLIC=0 node --env-file-if-exists=.env packages/app/dist/server/problem-feedback-v4-entry.js`로
  v4 API5175를 실행했다(도구 세션19108, PID77280).
- 공개 `/dialogue/dev`, `/problem/dev/v4?questionId=information-asymmetry-free-marketplace-q13`,
  `/api/developer/map` HTTP200. 공개 v4 세션 시작 및 검사 GET도200이며 최초 선택 대기다.
  연결 확인용 빈 세션 `1c885090-3bfa-41b6-84ce-5f6df286232b`를 만들었고 답변은 제출하지 않았다.
- `scripts/run-dialogue-ui.mjs`는 앞으로 개발자 모드에서 분리 v4 API도 시작한다.
  공개 재실행에는 `CSAT_PROBLEM_V4_PUBLIC=1`이 필요하다. 테스트의 `CSAT_API_PORT` 지정 시
  모든 API를 동일 모의 서버로 보낼 수 있다.

## 남은 것과 다음 행동

사용자가 실제 응답으로 화면/발문/판정 흐름을 확인한다. Q-0028~Q-0030 의미 검증은 열려
있고, 인증·자동 시작·서버 재시작 후 v4 세션 자동 복원은 미구현이다. 이벤트 로그는 보존하지만
새 서버가 과거 세션을 자동 로딩하지 않으므로 재시작 후에는 새 테스트를 시작해야 한다.

근거: 위 코드, `packages/app/e2e/problem-feedback-v4-workbench.spec.ts`,
`packages/app/e2e/dialogue-workbench.spec.ts`, `packages/app/e2e/problem-solving-flow.spec.ts`,
`packages/app/e2e/problem-evaluation-drawer.spec.ts`,
`packages/app/src/server/problem-feedback-v4-http.test.ts`,
`packages/app/src/server/problem-feedback-v4.test.ts`,
`memory/decisions/D-0065-developer-problem-v4-workbench-and-tunnel.md`.
