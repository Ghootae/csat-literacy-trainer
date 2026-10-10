---
id: D-0016
status: accepted
date: 2026-09-20
scope: personal-reading-workbench
supersedes: none
---

# 개인 테스트용 3단 워크벤치와 위치 안내

사용자가 원문/대화/개발자 골드·평가의 3단 구성, 자유 이동 맵, SERIOUS 원문 강조를
요청하고 용도를 ‘개인 테스트용’으로 확정했다. D-0013의 판정·선택적 진행 원칙은 유지한다.

- `/dialogue/dev`는 개인 검사 화면, `/dialogue`는 내부 골드 없는 학생 화면으로 구분.
- 개발자 API는 명시적 환경 변수로 활성화. 주소는 인증 수단이 아니며 공개 공유의 권한 관리는 별도.
- 맵은 실제 지문·문단·연결 문항만 표시. 이동은 완료·초기화가 아니며 새 테스트는 별도 세션.
- 원문 강조는 현재 SERIOUS 질문에 관련된 재독 위치 안내. 새 평가 기준이나 오류 표시가 아님.
- 제공한 위치 안내는 학생 주장과 구분해 다음 판정 및 기록으로 전달.
- 기존 V4의 축 공개, 누적 학생 의미, 모든 상태에서 진행 선택을 유지하며 압축 점수는 추가하지 않음.

근거: `docs/experiments/dialogue-workbench-2026-09-20/REPORT.md`,
`packages/app/src/client/DialogueApp.tsx`, `packages/app/src/server/dialogue.ts`,
`packages/pipeline/experiments/dialogue/source-guide-v1.md`.

재검토 조건: 외부 학생 공유 시 인증·접근 통제를 먼저 검토. 원문 안내가 정답 노출이나
추가 요구를 유발하면 실제 대화로 범위 재검토. 현재 서버 재시작 후 진행 중 세션 복원과
안내의 실모델 의미 품질은 미검증/미구현 범위를 보고서에 구분했다.
