---
date: 2026-10-02
scope: dialogue-developer-tunnel-restoration
base_commit: uncommitted
---

# 문단 요약 개발자 터널 복구

사용자가 현재 문단 요약 UI 터널 재실행을 요청했다. 로컬 5173·5174 리스너와 cloudflared
프로세스가 없고 공개 개발자 화면이 HTTP 530인 것을 확인한 뒤, 기존 승인 설정으로 재실행했다.

## 변경과 확인

- `npm run build --silent` 통과 뒤 `CSAT_DEVELOPER_MODE=1 CSAT_STUDENT_FEEDBACK_PUBLIC=0 node --env-file-if-exists=.env scripts/run-dialogue-ui.mjs` 실행.
- `cloudflared tunnel --url http://127.0.0.1:5173 run csat-dialogue` 실행. 2026-10-02 12:58 KST에 QUIC 연결 4개 등록을 확인했다.
- 로컬 및 공개 `/dialogue/dev`, `/api/dialogue/passages`, `/api/developer/map`이 모두 HTTP 200이다.
- 지문 목록 API는 7개, 개발자 맵은 6개 항목을 반환했다. 기존 ‘연결 가능한 6지문’ 기록과 목록 API의 전체 항목 수를 혼동하지 않는다.
- 공개 주소는 `https://dialogue.cogaxis.net/dialogue/dev`로 유지한다. 인증 없는 개발자 자료 공개는 D-0031 및 2026-09-29 명시 승인 범위다.
- 제품 코드·화면 배치·판정 정책을 변경하지 않았으며 학생 피드백 공개 플래그를 활성화하지 않았다. 검증에서 학생 답변 제출이나 유료 모델 호출은 하지 않았다.

앱과 터널은 계속 실행 중이다(이번 도구 세션 앱 36875, 터널 67394). 자동 시작은 등록하지
않았으므로 프로세스나 Mac이 종료되면 다시 연결해야 한다. 이번 확인은 HTTP 응답 검증이며
새 브라우저 학습 전 구간 시험은 아니다.

## 근거

- `scripts/run-dialogue-ui.mjs`
- `packages/app/vite.config.ts`
- `packages/app/src/server/index.ts`
- `memory/decisions/D-0031-developer-ui-url-only.md`
- `memory/checkpoints/2026-09-29-developer-tunnel-exposed.md`
- 이번 터미널의 포트·프로세스 확인, cloudflared 연결 기록, 로컬·공개 HTTP GET 검사.
