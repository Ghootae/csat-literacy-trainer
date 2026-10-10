# 학생용 UI 최신 빌드 터널 갱신

- 날짜: 2026-09-12 KST
- 성격: 임시 외부 접근 환경 갱신

## 실행

- 수정 전부터 실행 중이던 UI·API 프로세스와 기존 Cloudflare Quick Tunnel을 정상 종료했다.
- `npm run dialogue:ui`로 최신 소스를 다시 빌드하고 API 5174, Vite UI 5173을 시작했다.
- Cloudflare Quick Tunnel을 HTTP/2로 새로 연결했다.
- 공개 주소: `https://bookmarks-wallpapers-configurations-headline.trycloudflare.com/dialogue`

## 외부 확인

- `/dialogue`: HTTP 200
- `/api/dialogue/passages`: HTTP 200
- 등록 지문 7개 중 사용 가능 지문 6개 확인

## 제한

- 계정 없는 Quick Tunnel이라 실행 프로세스가 종료되면 주소도 만료된다.
- 영구 배포나 가용성 보장이 있는 named tunnel은 아니다.
