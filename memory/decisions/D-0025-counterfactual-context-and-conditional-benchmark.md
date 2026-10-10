---
id: D-0025
status: accepted
date: 2026-09-21
scope: paragraph-counterfactual-context-experiment
supersedes: none
---

# 대상 축 발화 고정·비대상 맥락 대조와 조건부 병렬 측정

사용자가 ‘오케이 일괄 승인’으로 direct-v1 고정 → 충분/불충분 대상 축을 포함한 맥락 간섭 대조 → 효과 재현 시 문단 단위 병렬 성능 측정의 순차 계획을 승인했다.

- 5문단×target 충분/불충분×비대상 A충분/B나열/C한정 모름×전체/단일 축×3회=180호출.
- 문단과 학생 응답 전체를 유지한다. 대상 축 발화는 A/B/C에서 동일하며, 비대상 문맥이 대상 핵심 관계를 보완·철회하지 않도록 사전 검토했다.
- direct-v1 지시·schema·모델·추론 설정을 고정한다. v2 후보를 이번 실행에서 제외하되 영구 무효/삭제 결정은 아니다.
- 충분 답 nonPASS와 불충분 답 PASS를 분리해 보며 같은 입력 반복 변동과 비대상 문맥 변화를 함께 기록한다.
- 후속 진입은 계약180/180유효, 단일 축 기대 불일치3건 이상 감소, 맥락별 PASS비율 범위 감소2문단 이상, 충분 답 보류·불충분 답 PASS 증가 없음의 동결된 탐색 기준이다. 통계적 증명 기준이나 운영 승격 기준이 아니다.
- 충족 시 사전 선택10응답에서 전체 축1호출과 모든 축 병렬 호출을 각3회 비교한다(96물리호출). 조건 미달이면 건너뛴다.
- 에이전트가 총$2 로컬 상한·최대276호출을 설정했다. 사용자 직접 지정 금액이 아니다. 요청·원응답·사용량 보존, 재시도0·질문0.
- 운영 V4·문제V3·골드·UI·서비스를 변경하지 않는다. 실제 누적 대화/질문 생성/동시 사용자 부하의 운영 효과는 이번 승인 범위에 포함하지 않는다.

근거: `docs/experiments/axis-counterfactual-context-v1-2026-09-21/PLAN.md`, `docs/experiments/axis-counterfactual-context-v1-2026-09-21/manifest.json`, `packages/pipeline/experiments/dialogue/counterfactual-context-fixtures-v1.json`.

## 실행 완료

180/180호출·계약180유효, 추정$0.4884107. 충분target PASS는 두 조건45/45, 관계 누락 PASS는 전체3/45·단일0/45다. 차이는 도파민 불충분 답+A맥락에만 있다. 전체는 A에서PASS3/3·B/C에서SERIOUS, 단일은A/B/C 모두SERIOUS였다. 두 조건 모두 동일 입력3회 일치30/30이다.

맥락별 PASS 범위 감소가2문단 이상이라는 동결 기준에 미달해 병렬 성능96호출은 건너뛰었다. 이는 사전 자원 배분 기준이지 효과 부재의 통계적 증명이 아니다. 공손룡 포함 충분 답 과도 보류는 v1에서 재현되지 않았다.

도파민 두 축은 신호 전달 의미를 공유하므로 targetText 고정만으로 대상 관련 의미 전체가 A/B/C에서 동일하다고 단정하지 않는다. 동일 A응답의 전체/단일 차이는 범위 효과 신호이나 순수한 무관 축 간섭·인상 편향의 기제는 미확정이다. 운영 유지, 자동 추가 시험 없음.

근거: `docs/experiments/axis-counterfactual-context-v1-2026-09-21/REPORT.md`, `docs/experiments/axis-counterfactual-context-v1-2026-09-21/summary.json`, `docs/experiments/axis-counterfactual-context-v1-2026-09-21/execution-audit.json`.
