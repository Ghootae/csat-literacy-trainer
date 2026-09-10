# 프로젝트 지식 지도

질문과 관련된 원문만 열기 위한 주제별 색인이다. 이 파일의 설명은 탐색용이며, 사실의 최종
근거는 연결된 정책·코드·실험 산출물이다.

## 먼저 읽을 정본

- 현재 상태: [`CURRENT_STATE.md`](./CURRENT_STATE.md)
- 결정: [`DECISIONS.md`](./DECISIONS.md)
- 열린 질문: [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md)
- 작업 delta: [`checkpoints/`](./checkpoints/)

## 문제 풀이 대화

- 현행 정책: [`PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md`](../docs/PROBLEM-SOLVING-SOURCE-DIRECT-OPERATIONAL-POLICY-2026-09-08.md)
- 전체 근거 종합: [`TEST-SYNTHESIS-2026-09-09.md`](../docs/experiments/TEST-SYNTHESIS-2026-09-09.md)
- 세 입력 조건 비교: [`REPORT.md`](../docs/experiments/problem-evaluator-three-reference-combined-15-item-2026-09-06/REPORT.md)
- 대표 상태 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-live-canary-2026-09-08/FINAL-REPORT.md)
- 고위험 형식 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-risk-format-canary-2026-09-08/FINAL-REPORT.md)
- 다중 이미지 canary: [`FINAL-REPORT.md`](../docs/experiments/problem-source-direct-multi-image-canary-2026-09-09/FINAL-REPORT.md)
- 코드 진입점: `packages/pipeline/src/problem-solving/source-direct-evaluator.ts`,
  `packages/app/src/server/problem-solving.ts`, `packages/app/src/client/ProblemApp.tsx`

## 문단 요약 대화

- 현행 정책: [`PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V2-2026-09-09.md`](../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V2-2026-09-09.md)
- V2 42사례 회귀: [`FINAL-REPORT.md`](../docs/experiments/dialogue-selective-router-v2-regression-42-2026-09-09/FINAL-REPORT.md)
- 선택적 라우팅의 선행 비교: [`REPORT.md`](../docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08/REPORT.md)
- 최초 판정 세 입력 비교: [`REPORT.md`](../docs/experiments/dialogue-three-reference-paragraph-summary-15-2026-09-07/REPORT.md)
- 코드 진입점: `packages/pipeline/src/dialogue-experiment/gate.ts`,
  `packages/pipeline/src/dialogue-experiment/selective-feedback.ts`,
  `packages/pipeline/src/dialogue-experiment/session.ts`

## 문단 골드

- 현재 자산 원장: [`PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md`](../docs/PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md)
- 운영 생산 기준선: [`PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md`](../docs/PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md)
- 최신 독립 재감사: [`FINAL-REPORT.md`](../docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/FINAL-REPORT.md)
- 통합 감사 v2 일반화 실패 근거: [`EVALUATION-REPORT.md`](../docs/experiments/paragraph-gold-audit-v2-batch003-retrospective-2026-09-04/EVALUATION-REPORT.md)
- 생성·감사 코드: `packages/pipeline/src/paragraph-analysis/`

## 문항 골드

- 현재 자산 원장: [`PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md`](../docs/PROBLEM-GOLD-ASSET-REGISTER-2026-09-09.md)
- 24문항 생성 보고서: [`REPORT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/REPORT.md)
- 공식 해설 포함 상태 감사: [`OFFICIAL-EXPLANATION-AUDIT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/OFFICIAL-EXPLANATION-AUDIT.md)
- 시각 자료 감사: [`VISUAL-RECOGNITION-AUDIT.md`](../docs/experiments/problem-gold-prospective-blind-2026-09-03/VISUAL-RECOGNITION-AUDIT.md)
- 오프라인 한정 결정: [`D-0003`](./decisions/D-0003-problem-gold-offline-only.md)
- 생성·검토 코드: `packages/pipeline/src/problem-solving/gold-generation-runtime.ts`,
  `packages/pipeline/src/problem-solving/prospective-gold-experiment.ts`

## 평가 이론과 초기 제품 설계

- 전체 프로젝트 브리핑: [`PROJECT-BRIEFING.md`](../docs/PROJECT-BRIEFING.md)
- 아키텍처: [`ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- 문단 평가 결정의 초기 기록: [`DECISIONS.md`](../docs/DECISIONS.md)
- 학생 루프: [`STUDENT-LOOP-DESIGN.md`](../docs/STUDENT-LOOP-DESIGN.md)
- 데이터 계약: [`DATA-SCHEMA.md`](../docs/DATA-SCHEMA.md)

## 이전 상태 문서

다음 문서는 삭제하지 않은 역사 자료다. 현재 상태 확인에는 이 디렉터리의
`CURRENT_STATE.md`를 먼저 사용한다.

- [`WORKSTREAM-STATE.md`](../docs/WORKSTREAM-STATE.md): 2026-09-09까지의 상세 누적 작업 흐름.
  현행 사실이 많지만 이력까지 한 파일에 들어 있어 탐색 비용이 크다.
- [`NEXT.md`](../docs/NEXT.md): 2026-08 초 기준의 긴 진행 로그. 최신 재개 지점으로 사용하지 않는다.
- [`PROBLEM-SOLVING-WORKTREE-HANDOFF-2026-08-26.md`](../docs/PROBLEM-SOLVING-WORKTREE-HANDOFF-2026-08-26.md): 과거 작업 이관 기록.

## 출처 우선순위

같은 주제의 내용이 충돌할 때는 다음 순서로 확인한다.

1. 원자료와 현재 코드·테스트
2. 현행 정책 ID가 있는 운영 문서와 자산 manifest
3. 입력·출력이 보존된 실험 보고서
4. accepted 결정 레코드와 `CURRENT_STATE.md`
5. 체크포인트, 브리핑, 과거 작업 흐름, 채팅 요약

상위 출처가 메모리와 충돌하면 메모리를 그대로 따르지 말고 충돌을 기록한 뒤 정본을 갱신한다.
