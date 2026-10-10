# 개인 테스트 UI 및 SERIOUS 원문 안내

- 구현: 개발자 3단/학생 2단·모바일 탭, 골드·턴 검사, 맵 탐색·새 테스트 분리,
  원문 정확 인용 강조, 서버 대화 재표시·브라우저 초안 보존.
- 기준 변화 없음: D-0013 V4 유지, 문제 V3 유지. 위치 안내 포함 2차만 guide-v1/schema3,
  해당 합성 기록 v7. 안내 없는 과거 계약/시험은 보존.
- 검증: 관련 Vitest 197, 모의 브라우저 5, build/client typecheck/Vite build 통과.
  기존 오류 기록 재생 32건 행동 변경 없음. 유료 API 0회, 공개 서버 재시작 없음.
- 잔여: 실제 안내 선택 품질·학생 사용성 미검증. 서버 재시작 이후 진행 중 세션 복원 미구현.
- 근거: `docs/experiments/dialogue-workbench-2026-09-20/REPORT.md`,
  `packages/app/e2e/dialogue-workbench.spec.ts`, `packages/app/src/server/dialogue.test.ts`,
  `packages/pipeline/src/dialogue-experiment/selective-feedback.test.ts`.
- 결정: [D-0016](../decisions/D-0016-personal-reading-workbench.md). 활성화는
  `npm run dialogue:dev` 후 `/dialogue/dev`; 공개 공유 전 골드 노출 경계를 확인한다.
