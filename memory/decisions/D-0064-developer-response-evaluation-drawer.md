---
id: D-0064
status: accepted
date: 2026-10-02
scope: developer-problem-evaluation-drawer
supersedes: none
---

# 개발자용 응답 평가를 서랍 패널로 제공

## 결정

사용자가 PPT 레이아웃 검토 뒤 개발자용에서 응답 평가 상태를 시각적으로 보는 서랍식
패널을 요청했다. 기본 닫힘·오른쪽 열림으로 구현하고, 평가 이력·학생 발화·모델 재구성·
정답 여부·근거 검증 상태를 구분한다. 확인 불가 근거의 정답은 기존 미검증 정답 종료를
유지한다는 사용자 재확인을 정책 변경으로 해석하지 않는다.

이번 구현은 현행 v3 문제 화면에 한정한 읽기 전용 패널이다. PPT 전체 3단 개편,
v4 풀이 API 연결/운영 승격, 학생 UI 변경, 채점 규칙 변경은 포함하지 않는다.
기존 D-0032의 문단 개발자 UI는 변경하지 않는다.

## 근거와 범위

- 사용자 요청·정책 유지 재확인, 2026-10-02.
- `packages/app/src/client/ProblemEvaluationDrawer.tsx`
- `packages/app/src/client/ProblemApp.tsx`
- `packages/app/src/server/problem-solving.ts`
- `packages/app/src/server/index.ts`: 검사 GET은 서버 developerMode 아래에서만 제공.
- `packages/app/e2e/problem-evaluation-drawer.spec.ts`
- `memory/checkpoints/2026-10-02-developer-response-evaluation-drawer.md`

## 재검토 조건

PPT 기반 전체 문제 풀이 UI 및 v4를 연결할 때 패널 데이터 계약을 해당 정책의 필드로
전환한다. 현행 v3의 질문·선택 한도를 v4 정책으로 오인하지 않는다.
