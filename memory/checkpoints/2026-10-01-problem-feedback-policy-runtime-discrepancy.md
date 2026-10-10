# 문제 응답·피드백 정책과 현행 전이 불일치 확인

- 날짜: 2026-10-01 KST
- 범위: 정책 리마인드 중 읽기 전용 코드·테스트 정의 대조. 런타임 수정 및 새 정책 승인 없음.

## 작업 delta

- `docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md` 5·6절은 실제 수정 뒤에만 재선택하고 질문 한도 내 미해결이면 코칭 후 종료한다고 기술한다.
- 그러나 `packages/pipeline/src/problem-solving/session.ts`는 1·2차 오답 질문 소진 뒤 `requestReselectionAfterCoachingAcknowledgement`를 설정하고, 코칭 확인 응답만으로 `AWAITING_RESELECTION`에 진입한다. 확인 응답을 추가 모델 호출로 교정 검증하지 않는다.
- `packages/pipeline/src/problem-solving/session.test.ts`에는 첫 오답 코칭 뒤 재선택과 두 번째 오답 코칭 뒤 3차 선택을 보장하는 회귀 정의가 있다. 이번 작업에서는 테스트를 새로 실행하지 않았다.
- `docs/PROBLEM-SOLVING-IMPLEMENTATION-PLAN.md`의 2026-08-31 ‘선택 횟수·개입 횟수 분리와 조기 정답 공개 P0 수정’에도 같은 전이가 기록돼 있다.
- 따라서 현재 상태 요약의 ‘실제 수정 뒤에만 재선택’이라는 무예외 표현을 정정했다. 일반 질문의 수정 확인 경로와 질문 소진 뒤 코칭 확인 경로를 구분한다.
- 정책 문서와 구현 중 어느 쪽을 향후 규범으로 확정할지는 이 확인만으로 결정하지 않는다. D-0049·D-0050도 구현하지 않았다.
