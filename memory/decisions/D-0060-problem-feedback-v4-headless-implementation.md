---
id: D-0060
status: accepted
date: 2026-10-01
scope: problem-feedback-v4-headless-implementation
supersedes: none
---

# 문제 피드백 통합 설계의 UI 제외 구현 승인

## 결정

사용자가 ‘UI 구현은 아직 불필요’라고 지정한 뒤 ‘구현 승인’이라고 명시했다. D-0059의
통합 정책을 판정 계약·프롬프트·상태 머신·서버/API·기록·테스트로 구현한다. 기존 설계는
바꾸지 않으며 D-0049~D-0059의 구현 보류 문구는 이 승인 이전의 이력으로 보존한다.

기존 UI와 운영 경로를 자동 전환하지 않도록 별도 v4 계약과 로컬 개발자 API로 연결했다.
UI·실제 포인트 차감·운영 배포·학생 상태 집계 자동 편입은 이번 구현에 포함하지 않는다.
이 분리 방식은 승인 범위 안에서 택한 구현 방법이며 별도의 운영 전환 승인으로 해석하지 않는다.

## 검증과 제한

코드 분기와 고정 판정 기반 테스트를 통과해도 자연어 판정의 정확성이 검증된 것은 아니다.
Q-0028~Q-0030은 실모델 의미 검증과 사람 검토가 남아 있으므로 open으로 유지한다.
실행 서버는 재시작하지 않았으며 유료 평가 호출도 하지 않았다.

## 근거

- 사용자 구현 승인과 UI 제외 지정, 2026-10-01.
- `memory/decisions/D-0059-problem-feedback-clarifications-consolidated.md`
- `docs/PROBLEM-FEEDBACK-V4-IMPLEMENTATION-2026-10-01.md`
- `packages/pipeline/src/problem-solving/feedback-v4.ts`
- `packages/app/src/server/problem-feedback-v4.ts`

## 재검토 조건

실모델 회귀에서 게이트 과수용·오류 누락·수정 오인·정답 힌트가 발견되거나 사용자가 UI 연결 및
운영 전환을 요청하면 해당 범위의 검증과 연결 작업을 별도로 진행한다.
