---
id: D-0235
status: accepted
date: 2026-11-19
scope: deep-bogi-item-generation
supersedes: none
---

# 깊은 〈보기〉 v5.3 비교 종료 및 v5.2 기준 유지

사용자가 정한 채택선은 v5.3 8문항 중 두 평가자 모두 ‘수능 같음’ 3개 이상, ‘수능 아님’ 0개다. 둘 중 하나라도 미달이면 멈추고 v5.2를 기준 버전으로 둔다. 실제 공동 최고 1개, 한 명 이상 최하 3개(공동 최하 2개)로 모두 미달했다. 이 결정은 v5.2와 v5.3의 비교에 적용된다.

근거: `docs/experiments/deep-item-v5-2026-11-18/blind/REPORT-v52v53-desktop.md`.

## 2026-11-19 추가: 유형별 기준 버전

기준 버전은 A형(적절하지 않은 것) = v5.2 규칙, B형(가장 적절한 것) = v5.2 + v5.3 규칙(`docs/experiments/deep-item-v5-2026-11-18/rules-common-v53-B.md`, `run.mjs`가 `MODE=B`일 때 자동 적용). 근거는 `docs/experiments/deep-item-v5-2026-11-18/RESULT.md`의 'Claude 직접 판정'(v5.3 B형 4자리 모두 개선, A형 개선 없음)과 코덱스 양쪽 '수능 같음' 문항이 v5.3 B형 표였다는 점이다. 위 본문의 "v5.3 비교 종료"는 v5.2와 v5.3 전체 비교에 적용되고, 이 추가는 B형에만 v5.3 규칙을 쓰도록 기준을 보완한다.
