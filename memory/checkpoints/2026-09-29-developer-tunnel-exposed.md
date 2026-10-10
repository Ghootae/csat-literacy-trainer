---
date: 2026-09-29
scope: developer-tunnel
base_commit: 58f9c93
---

# 승인된 개발자 터널 공개

## 새로 확인된 것

- 개발자 모드에서 `https://dialogue.cogaxis.net/dialogue/dev`, `/api/developer/map`, 학생용 `/dialogue`가 모두 HTTP 200을 반환했다.
- 앱 재시작 순간 외부 개발자 API가 일시적으로 520을 반환했지만 재확인에서는 200이었다.

## 결정된 것

- 사용자는 골드와 내부 판정 정보가 인증 없이 외부에 노출되는 위험을 이해하고 개발자 터널 공개를 명시적으로 승인했다.

## 변경한 것

- 기존 학생용 앱 프로세스를 `CSAT_DEVELOPER_MODE=1`로 재시작했다. Named Tunnel은 그대로 유지했다.

## 미해결

- 인증과 자동 시작은 없으며 URL을 아는 외부 사용자가 개발자 자료에 접근할 수 있다.

## 다음 행동

- 개발자 검토가 끝나면 일반 학생 모드로 다시 내려 개발자 API를 403으로 복원한다.

## 근거

- `scripts/run-dialogue-ui.mjs`
- `packages/app/src/server/index.ts`
- 사용자 명시 승인: 2026-09-29
