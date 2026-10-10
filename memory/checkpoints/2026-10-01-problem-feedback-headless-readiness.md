---
date: 2026-10-01
scope: problem-solving-headless-implementation-readiness
base_commit: uncommitted
---

# UI 제외 구현 준비 점검

- 사용자는 구현 준비 상태를 물었으며 UI 구현은 아직 불필요하다고 지정했다. 구현 시작이나
  운영 전환 요청으로 해석하지 않았고, 이번 작업은 읽기 전용 코드 점검과 범위 기록이다.
- 설계 정본은 D-0059와 저장된 수형도다. 착수를 막는 미결 학습 정책은 확인되지 않았다.
- `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`에는 재구성 결과와 행동 계약이
  있으나 고정 질문 예산 및 진단 질문 허용을 전제로 하므로 게이트·오류 목록·교정 단계 계약을 함께 바꿔야 한다.
- `packages/pipeline/src/problem-solving/session.ts`에는 선택 3회·질문 2회·3차 오답 공개 제한과
  코칭 확인 후 재선택 경로가 남아 있다. 프롬프트만 바꾸는 것으로 새 설계를 구현할 수 없다.
- `packages/app/src/server/problem-solving.ts`와 `packages/app/src/shared/contract.ts`의 제출 계약을
  통해 UI 없이 명시적 근거 미제출, 보완 요청 거부, 새로운 종료·재선택 흐름을 테스트할 수 있다.
- 구현 시 범위: 평가기 프롬프트/스키마, 상태 머신·서버/API 계약, 저장·결과 기록, 단위·통합 회귀.
  학생 UI·버튼·화면 연결과 실제 포인트 차감은 제외한다. 기존 UI와 운영을 무심코 전환하지 않는다.
- 이번 점검에서는 테스트를 새로 실행하지 않았고 코드·프롬프트·서버를 변경하거나 재시작하지 않았다.

다음 행동: 사용자가 구현 시작을 요청하면 수형도 분기를 고정 테스트로 만들고 코어 계약부터 구현한다.

근거: 사용자 요청(2026-10-01 UI 구현 불필요), `memory/decisions/D-0059-problem-feedback-clarifications-consolidated.md`, 위 코드 경로.
