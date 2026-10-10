# 학생용 UI Named Tunnel 복구

- 날짜: 2026-09-22 KST
- 증상: `https://dialogue.cogaxis.net/dialogue`에서 Cloudflare Error 1033 발생.
- 확인: 로컬 학생용 앱 `127.0.0.1:5173`과 `cloudflared` Named Tunnel 프로세스가 모두 중단돼 있었다.
- 복구: 최신 빌드로 `npm run dialogue:ui`를 실행하고, 원본 주소를 명시해 `cloudflared tunnel --url http://127.0.0.1:5173 run csat-dialogue`를 실행했다.
- 검증: 공개 `/dialogue` HTTP 200, `/api/dialogue/passages` 정상 JSON 응답.
- 주의: `cloudflared tunnel run csat-dialogue`만 실행하면 로컬 설정 파일에 ingress 규칙이 없어 503을 반환한다. 현재 실행 방식에서는 `--url http://127.0.0.1:5173`이 필요하다.
- 잔여 한계: 앱과 tunnel의 macOS 자동 시작은 여전히 등록하지 않았으므로 두 프로세스가 종료되면 고정 주소도 다시 중단된다.

선행 기록: [`2026-09-14-named-tunnel-live.md`](./2026-09-14-named-tunnel-live.md)
