---
id: D-0021
status: accepted
date: 2026-09-20
scope: paragraph-single-call-materiality-experiment
supersedes: none
---

# 기존 V4 호출 내 누락 중요도 판단 후보 비교

사용자는 별도 호출의 지연을 피하고, 현재 학생 응답의 미확인 의미가 중심 설명에 중요한지를 동일 호출 안에서 판단하는 후보의 구현·시험을 일괄 승인했다.

- 원래 골드·V4 운영 기본값·스키마 유지. 독립 실험 래퍼에서 판정 지침만 교체한다.
- 확인된 의미→미확인 의미→중심 설명에 미치는 영향→PASS/OK/SERIOUS를 명확히 한다. 명시적 오류는 별도로 유지한다.
- 정적 필터·관계 추출 추가 시험이나 별도 개입 게이트 추가는 이번에 하지 않는다.
- 동일20응답×2조건, 최대40판정 호출, 로컬 상한$2. 질문 생성0, 재시도0, 각 조건1회.
- 충분6·핵심누락6·오류4·경계4. 기대는 사전 고정한 에이전트 작성 기준이며 독립 사람 정답이 아니다.
- 충분 응답의 미완료와 자동 개입 후보를 별도 측정한다. 핵심 누락의 PASS뿐 아니라 OK에 따른 개입 생략도 기록한다.
- 후보는 운영에 승격하지 않는다. 재검토에는 동일 응답 비교·의미 확인·오류 검출 유지·안정성 근거가 필요하다.

출처: `docs/experiments/single-call-materiality-2026-09-20/PLAN.md`,
`packages/pipeline/src/dialogue-experiment/materiality-gate-experiment.ts`,
`packages/pipeline/experiments/dialogue/axis-missing-materiality-prompt-v1.md`.

## 시험 완료

40호출 모두 유효, 추정$0.5105604. 충분6·오류4는 두 조건 모두 기대 유지, 핵심 누락 SERIOUS는4/6→6/6이다. 경계에서 공손룡 AX2·법인 누락 허용은 개선되었으나 공손룡 AX1은 OK→SERIOUS, 도파민은 PASS→OK였다. 과개입 감소의 순이익은 확인되지 않아 승인된 실험 범위대로 운영에 반영하지 않았다. 이는 후보의 영구 폐기 결정이 아니다.

출처: `docs/experiments/single-call-materiality-2026-09-20/REPORT.md`, `summary.json`, `execution-audit.json` (같은 디렉터리). 경계 라벨은 사람 정답으로 확정하지 않았다.
