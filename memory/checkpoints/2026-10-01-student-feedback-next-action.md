# 학생 피드백의 차원별 다음 행동

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 발견

연습 후보의 설명 문장을 정규식으로 잘라 `nextAction`을 만들었다. 자기 점검 설명에는 예상한
조사가 없어 변환되지 않았고, 설명 문장 전체가 행동 지침으로 그대로 반복될 수 있었다.

## 변경

- 연습 후보 생성과 함께 해당 차원의 다음 행동을 명시적으로 설정한다.
- 수행 차원은 다음 학습에서 도움 없이 다시 확인하도록 제안한다.
- 자기 점검은 다음 문제에서 선택 전 근거를 재확인한 뒤 확신도를 기록하도록 제안한다.
- 개발자 리포트의 강점 제목은 잠정 패턴도 포함할 수 있으므로 `반복된 강점 후보`에서 `강점 후보`로 정정했다.

## 검증

- 과신 3문제 자기 점검 프로필에서 설명과 다른 명시적 다음 행동이 생성됨을 확인했다.
- 관련 테스트 42/42와 서버·클라이언트 타입 검사 통과

## 근거

- `packages/pipeline/src/student-state/model.ts`
- `packages/pipeline/src/student-state/model.test.ts`
- `packages/app/src/client/DialogueApp.tsx`
- `docs/STUDENT-STATE-MODEL-V1.md`
