# 판단 가능 증거 기반 신뢰도 경계

- 날짜: 2026-10-01 KST
- 관련 결정: [D-0048](../decisions/D-0048-student-state-model-next-goal.md)

## 발견

기존 집계는 긍정·부정·불확정을 모두 신뢰도 표본으로 세었다. 따라서 서로 다른 콘텐츠의
불확정 7건과 긍정 1건만 있어도 `REPEATED_PATTERN` 강점 후보가 될 수 있었다. 이는 불확실성을
보존하고 자료 부족을 단정하지 않는 V1 원칙과 맞지 않았다.

## 변경

- 핵심 이해·근거 기반 문제 해결·교정 회복의 신뢰도는 긍정·부정 증거 수와 그 증거가 나온 콘텐츠 수로 계산한다.
- `INDETERMINATE`는 전체 관측 및 불확정 수에는 남지만 상태 경향의 신뢰도를 높이지 않는다.
- 자기 점검은 이진 판단 대신 확신도 오차를 쓰므로 확신도 비교 관측과 문제 범위로 계산한다.
- 프로필에 `determinateDistinctContentCount`를 추가하고 개발자·학생 화면에 판단 가능한 콘텐츠 범위를 표시한다.
- 문제 최초 선택/근거의 판정 경계, 모든 교정 경로의 도움 수준, 정답 공개, 확신도 미입력, 미완료 결과를 회귀 테스트로 고정했다.

## 검증

- 학생 상태 모델 테스트 7/7 통과
- 관련 모델·저장소·대화·문제·클라이언트 테스트 합계 40/40 통과
- 서버·클라이언트 타입 검사 통과
- 워크벤치·학생 피드백 브라우저 5/5 통과

## 근거

- `packages/pipeline/src/student-state/model.ts`
- `packages/pipeline/src/student-state/model.test.ts`
- `packages/app/src/shared/contract.ts`
- `packages/app/src/client/DialogueApp.tsx`
- `packages/app/src/client/StudentFeedbackApp.tsx`
- `packages/app/e2e/dialogue-workbench.spec.ts`
- `docs/STUDENT-STATE-MODEL-V1.md`
