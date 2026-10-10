# 개인 워크벤치 중복 실행 포트 충돌 진단

- 사용자 `npm run dialogue:dev` 실행에서 Vite가 5173 점유 때문에 API 기본 포트 5174로
  이동하고 API 프로세스가 EADDRINUSE로 종료됨. 조회 시 기존 node 리스너가 두 포트를 점유.
- `scripts/run-dialogue-ui.mjs`는 포트 선점 검사 없이 양쪽을 시작하고 출력 주소를 5173으로
  고정한다. `packages/app/vite.config.ts`에 strictPort가 없어 자동 이동 가능.
- 기존 서버·터널·세션은 종료하지 않았다. 5273/5274 별도 실행 명령을 안내하며 실행기 코드 수정은 하지 않음.
- 출처: `docs/experiments/dialogue-workbench-2026-09-20/REPORT.md` 실행 절, 위 두 코드 파일,
  사용자 EADDRINUSE 로그와 로컬 lsof 확인. 대체 서버를 직접 실행하거나 유료 호출하지 않음.
