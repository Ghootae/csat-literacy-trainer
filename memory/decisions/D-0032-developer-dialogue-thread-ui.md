---
id: D-0032
status: accepted
date: 2026-09-22
scope: personal-developer-dialogue-ui
supersedes: none
---

# 개발자 화면은 고정 입력창과 누적 대화 스레드를 사용

- 변경 범위는 개인 개발자 화면 `/dialogue/dev`로 한정한다. 학생용 `/dialogue`의 배치와 흐름은 유지한다.
- 개발자 3단 화면은 왼쪽 원문, 가운데 응답·피드백 대화, 오른쪽 현재 이해·골드·평가 순서로 구성한다.
- `UNCLEAR_OK`에서는 1차 판정 뒤 입력창을 제거하지 않고 같은 크기로 비활성화한다. 사용자가 `보완하기`를 누른 뒤 질문 생성이 끝나면 같은 입력창을 활성화한다.
- 대화는 `n차 응답 → n차 피드백 → n차 확인 질문`을 구분해 누적한다. 선택적 질문 생성 전 피드백을 새 질문 결과로 교체하지 않고 별도 기록으로 보존한다.
- 현재 이해에는 기존 V4의 공개 범위를 그대로 사용한다. 점수나 비율을 새로 만들지 않는다.

근거: `packages/app/src/client/DialogueApp.tsx`, `packages/app/src/client/dialogue-workbench.css`,
`packages/pipeline/src/dialogue-experiment/session.ts`, `packages/app/e2e/dialogue-workbench.spec.ts`,
`memory/checkpoints/2026-09-22-developer-dialogue-thread-ui.md`.

재검토: 개발자 화면 확정 뒤 학생용 UI 논의를 시작할 때. 학생용 화면에 같은 구조를 자동 적용하지 않는다.
