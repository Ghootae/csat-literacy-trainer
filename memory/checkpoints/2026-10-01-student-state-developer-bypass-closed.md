# 개발자 API의 학생 상태 우회 차단

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 발견

학생용 `/api/student-state`는 공개 Host에서 차단됐지만, 개발자 모드의
`/api/developer/student-state?context=student`가 같은 학생 집계를 반환해 공개 고정 터널에서
로컬 전용 경계를 우회할 수 있었다.

## 변경

- 개발자 상태 API의 `context=student`에도 학생 피드백의 loopback/명시적 공개 경계를 적용했다.
- 공개 Host에서는 학생용 API와 개발자 학생 맥락 API가 모두 404를 반환한다.
- `context=developer` 캘리브레이션 집계는 기존 개발자 API 승인 범위로 유지한다.

## 검증

- 공개 Host에서 capability false, 학생 API 404, 개발자 학생 맥락 404, 개발자 캘리브레이션 200을 확인했다.
- 관련 테스트 42/42, 타입 검사, 브라우저/HTTP 7/7 통과

## 근거

- `packages/app/src/server/index.ts`
- `packages/app/e2e/dialogue-workbench.spec.ts`
- `docs/STUDENT-STATE-MODEL-V1.md`
- `docs/STUDENT-STATE-MODEL-V1-COMPLETION-AUDIT.md`
