# 학생용 UI 루트 경로 정리

- 날짜: 2026-09-14 KST
- 변경: 웹 루트 `/` 진입을 `/dialogue`로 정규화해 최신 학생용 연결 학습 화면을 기본으로 삼았다.
- 보존: 기존 문단 훈련 UI는 `/legacy`에서 계속 접근할 수 있다.
- 코드: `packages/app/src/client/main.tsx`
- 회귀: 기존 구형 UI E2E 진입 경로를 `/legacy`로 변경하고 루트 정규화 E2E를 추가했다.
- 검증: `npm run build --silent` 통과. 관련 Playwright 21개 전체 회귀와 루트 표적 1개가 통과했다.
