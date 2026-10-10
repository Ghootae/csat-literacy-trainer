---
id: D-0022
status: accepted
date: 2026-09-20
scope: paragraph-direct-judgment-experiment
supersedes: none
---

# 중심축 최소 출력 직접 판정 비교 승인

사용자가 실험 명칭 지정과 테스트까지 승인했다. 명칭은 `axis-direct-judgment-v1`이다.

- 같은 중심축·원문·학생 응답을 기존 V4 전체 계약과 간결 지시·최소 출력 후보로 비교한다.
- 후보는 축별 ID·PASS/OK/SERIOUS/ERROR·짧은 이유만 반환한다. 의미 분해·정확 인용·합성 응답·질문 출력은 요구하지 않는다.
- 기존20응답과 사전 기대를 재사용하되 두 조건 모두 새로3회 실행한다. 최대120호출·로컬$2상한, 재시도·질문 생성0.
- 출력 형식과 지시를 함께 바꾸는 비교이며 스키마나 중간 표현의 단독 인과 효과를 확정하지 않는다.
- 과개입 감소가 주목적이다. 핵심 누락 검출 강화나 OK→PASS만으로 목적 달성을 주장하지 않는다. 경계의 사람 정답은 미확정이다.
- 운영 기본값·골드·UI는 유지한다. 후보의 직접 운영 전환은 별도 판단이 필요하다.

근거: `docs/experiments/axis-direct-judgment-v1-2026-09-20/PLAN.md`, `packages/pipeline/experiments/dialogue/axis-direct-judgment-prompt-v1.md`, `packages/pipeline/src/dialogue-experiment/direct-judgment-experiment.ts`.

## 시험 완료 결과

120호출 완료, 사용량 기반 추정$0.8665124. 충분 PASS17/18→18/18, 자동 질문 대상은 충분0/18·전체26/60으로 동일. 오류12/12 유지. 반복 전체 축 일치14/20→19/20, API 중앙값7.9675→2.083초. 후보는 도파민 핵심 대조 누락을3회 모두 PASS로 과수용했다. 기존은 인용 계약 실패1건이나 공통 판정은 읽을 수 있었으며 의미 실패와 별도 집계했다.

시험의 실익과 한계를 함께 보존하며 운영에 반영하지 않는다. 구조화가 실패 원인이라는 단독 인과 결론이나 후보 영구 폐기 결정은 아니다.

근거: `docs/experiments/axis-direct-judgment-v1-2026-09-20/REPORT.md`, `docs/experiments/axis-direct-judgment-v1-2026-09-20/summary.json`, `docs/experiments/axis-direct-judgment-v1-2026-09-20/execution-audit.json`.
