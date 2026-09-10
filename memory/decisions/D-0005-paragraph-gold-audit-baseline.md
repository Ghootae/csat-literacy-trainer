---
id: D-0005
status: accepted
date: 2026-09-04
scope: paragraph-gold-audit
supersedes: none
---

# 문단 골드 생산은 단일 감사 v1 기준선을 유지

## 결정

문단 골드 운영 생산은 `PG-PROD-BATCH004-AUDIT-V1`을 사용한다. 배치004 생성 규칙 뒤 단일
감사 v1, 필요한 경우 자동 수리 1회, 같은 감사로 재감사 1회를 수행하고 남은 사례만
`REVIEW_REQUIRED`로 보낸다.

통합 감사 v2, 분리 감사와 원칙–예외 판정기 v1~v4는 재현 가능한 실험 자산으로 보존하되 운영
기준선으로 승격하지 않는다.

## 근거

감사 v2 계열은 특정 결함을 더 찾기도 했지만 승인된 정상 대조군을 과도하게 수리 대상으로
분류하고 비용을 늘렸다. 배치003 회고에서는 기존 직접 PASS 6/6이 v2에서 1/6로 떨어졌고 호출
비용도 약 2.18배였다.

## 폐기한 대안

- Local·Global 분리 감사 v1을 기본 운영으로 채택
- 통합 감사 v2 전체를 기본 운영으로 채택
- 원칙–예외 판정기 v4의 좁은 성과를 근거로 결합 감사 전체를 승격

## 재검토 조건

새 데이터에서 v1이 놓치는 동일한 고위험 오류가 반복되고, 후보 감사기가 정상 대조군 통과율과
비용 기준을 함께 만족할 때만 재검토한다.

## 근거 자료

- [`운영 기준선`](../../docs/PARAGRAPH-GOLD-OPERATIONAL-BASELINE-2026-09-04.md)
- [`배치003 감사 v2 회고`](../../docs/experiments/paragraph-gold-audit-v2-batch003-retrospective-2026-09-04/EVALUATION-REPORT.md)
- [`문단 골드 자산 원장`](../../docs/PARAGRAPH-GOLD-ASSET-REGISTER-2026-09-09.md)
