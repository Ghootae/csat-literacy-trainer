# 학생 피드백 로컬 전용 기본 접근

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 변경

- `CSAT_STUDENT_FEEDBACK_ENABLED=1`만 설정하면 `localhost`, `127.0.0.1`, `::1` Host에서만 capability·링크·API가 열린다.
- 공개 Host까지 열려면 `CSAT_STUDENT_FEEDBACK_PUBLIC=1`을 추가로 명시해야 한다.
- 공개 Host에서는 capability가 false이고 `/api/student-state`가 404를 반환한다.
- 실행 스크립트는 로컬 피드백 URL을 알리고, 공개 플래그가 있으면 인증 없는 노출 경고를 출력한다.

## 검증

- 관련 테스트 41/41 및 서버·클라이언트 타입 검사 통과
- 학생·개발자·피드백·공개 Host 차단 브라우저/HTTP 7/7 통과

## 근거

- `packages/app/src/server/index.ts`
- `packages/app/e2e/dialogue-workbench.spec.ts`
- `packages/app/vite.config.ts`
- `scripts/run-dialogue-ui.mjs`
- `docs/STUDENT-STATE-MODEL-V1.md`
