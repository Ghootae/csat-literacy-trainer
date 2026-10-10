# 학생 피드백 capability와 조건부 진입점

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 변경

- 공개 `GET /api/capabilities`가 `studentFeedbackEnabled` 한 필드만 반환한다.
- 학생 클라이언트는 이 capability를 읽고 활성 환경에서만 시작 화면과 학습 진행 헤더에 `학습 돌아보기` 링크를 표시한다.
- 기본 비활성 환경에서는 진입 링크가 숨겨지고 `/api/student-state`도 계속 404를 반환한다.
- 개발자 내부 상태나 원 증거는 capability 응답에 포함하지 않는다.

## 검증

- 관련 모델·저장소·대화·문제·클라이언트 테스트 40/40 통과
- 서버·클라이언트 타입 검사 통과
- 활성 링크, `/progress`, 비활성 API와 false capability를 포함한 브라우저 5/5 통과

## 근거

- `packages/app/src/server/index.ts`
- `packages/app/src/shared/contract.ts`
- `packages/app/src/client/api.ts`
- `packages/app/src/client/DialogueApp.tsx`
- `packages/app/e2e/dialogue-workbench.spec.ts`
