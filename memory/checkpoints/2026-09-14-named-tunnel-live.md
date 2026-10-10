# 학생용 UI 고정 Named Tunnel 연결

- 날짜: 2026-09-14 KST
- Cloudflare zone: `cogaxis.net`
- Named Tunnel: `csat-dialogue`
- 공개 주소: `https://dialogue.cogaxis.net`
- origin: `http://127.0.0.1:5173`
- DNS: `dialogue.cogaxis.net` CNAME을 Named Tunnel에 연결했다.
- 검증: 외부 HTTPS 루트와 `/api/dialogue/passages`가 HTTP 200이며, API에서 사용 가능 지문 6개를 확인했다.
- 보안: origin 인증서와 tunnel 자격 증명은 `/Users/mac/.cloudflared/`에만 두고 저장소에는 넣지 않았다.
- 잔여 작업: CSAT UI·API와 `cloudflared`의 macOS 자동 시작 등록은 아직 하지 않았다.
