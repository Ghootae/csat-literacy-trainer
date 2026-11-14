# 요약 카드 교정 표시 (Q-0050)

- 2026-11-15, 방안 B 구현: 마지막 단계에 `errors`가 남으면 카드를 "피드백을 반영한 정리"로 바꾸고 틀린 구절 취소선·교정 목록을 붙인다(D-0234). `/dialogue/lab`과 진단 화면이 같은 `RestatedSummary` 컴포넌트를 쓴다.
- 검증: 타입검사 통과, 새 테스트 4건 통과, 전체 1738/1740. 실패 2건(`boundary.test.ts`의 `server/student-state.ts` fs import, `.omc/adhoc/...json` 부재)은 이번 변경 파일이 아니다.
- 미확인: 실제 화면, 의식 2·경마 2·플라스틱 4문단 재현 회귀(실모델 호출 필요).
- `vitest.config.ts`에 `esbuild.jsx: 'automatic'` 추가(컴포넌트 렌더 테스트용).
