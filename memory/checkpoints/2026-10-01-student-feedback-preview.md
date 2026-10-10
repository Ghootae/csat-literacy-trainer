# 학생 정기 피드백 비활성 프리뷰

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 변경

- 학생용 `GET /api/student-state`와 `/progress` 화면을 추가했다.
- 학생 API는 `CSAT_STUDENT_FEEDBACK_ENABLED=1` 또는 서버 옵션이 있을 때만 열리며 기본값은 비활성이다.
- 화면은 `STUDENT` 맥락의 7·30·90일 집계, 잠정 강점/연습 후보, 다음 행동, 차원별 표본과 신뢰도, 해석 한계만 표시한다.
- 개발자 캘리브레이션 맥락, 원 증거, 도움 단계 분포는 학생 화면에 노출하지 않는다.
- 학생 기본 학습 동선에는 링크를 추가하지 않았다.
- 잘못된 기간은 500 대신 400으로 거부한다.

## 검증

- `npm run typecheck --silent`
- `npm run typecheck:client --silent`
- 관련 모델·저장소·대화·문제·클라이언트 테스트 36/36 통과
- `PLAYWRIGHT_CLIENT_PORT=5185 CSAT_API_PORT=5276 npx playwright test packages/app/e2e/dialogue-workbench.spec.ts`: 5/5 통과

## 남은 판단

- 새 형식 실제 학습 로그에서 집계와 문구를 검토한다.
- 학생 기본 노출 여부와 정기 피드백 주기는 사용자 승인 뒤 결정한다.

## 근거

- `packages/app/src/server/index.ts`
- `packages/app/src/client/StudentFeedbackApp.tsx`
- `packages/app/src/client/main.tsx`
- `packages/app/e2e/dialogue-workbench.spec.ts`
- `docs/STUDENT-STATE-MODEL-V1.md`
