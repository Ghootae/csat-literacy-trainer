# 고정 터널에서 개인 개발자 모드 활성화

- 날짜: 2026-09-22 KST
- 사용자는 인증 없는 개발자 모드에서 문단 골드와 내부 평가 자료가 고정 공개 주소에 노출되는 위험을 명시적으로 이해하고 공개 활성화를 승인했다.
- 앱 서버를 `npm run dialogue:dev`로 재시작했다.
- 공개 개발자 주소: `https://dialogue.cogaxis.net/dialogue/dev`
- 검증: `/dialogue/dev` HTTP 200, `/api/developer/map` HTTP 200.
- 학생용 `/dialogue`도 같은 서버에서 계속 제공된다.
- 제한: 인증이 없고 개인 테스트 전용이다. 앱 또는 tunnel 프로세스가 종료되면 접속이 중단된다.

관련 기록: [`2026-09-22-named-tunnel-recovered.md`](./2026-09-22-named-tunnel-recovered.md), [`2026-09-20-personal-reading-workbench.md`](./2026-09-20-personal-reading-workbench.md)
