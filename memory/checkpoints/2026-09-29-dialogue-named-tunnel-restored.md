---
date: 2026-09-29
scope: dialogue-named-tunnel
base_commit: 58f9c93
---

# 개발용 고정 터널 재가동

## 새로 확인된 것

- 최신 빌드의 학생용 `/dialogue`와 `/api/dialogue/passages`가 `https://dialogue.cogaxis.net`에서 HTTP 200을 반환했다.
- 외부 `/api/developer/map`은 개발자 모드 비활성 상태에서 HTTP 403을 반환했다.

## 결정된 것

- 개발 단계에서는 상시 호스팅을 보류하고 기존 Cloudflare Named Tunnel `csat-dialogue`를 계속 사용한다.

## 변경한 것

- 로컬 UI·API와 Named Tunnel을 재실행했다. 제품 코드 변경은 없다.

## 미해결

- 앱과 터널은 자동 시작되지 않으며 로컬 프로세스 또는 Mac이 종료되면 공개 주소도 중단된다.

## 다음 행동

- 운영 확정 뒤 상시 서버, 영구 세션 저장, 인증·호출 제한을 별도 배포 작업으로 진행한다.

## 근거

- `scripts/run-dialogue-ui.mjs`
- `packages/app/src/server/index.ts`
- `memory/CURRENT_STATE.md`
