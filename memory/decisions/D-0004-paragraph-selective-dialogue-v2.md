---
id: D-0004
status: superseded
date: 2026-09-09
scope: paragraph-dialogue
supersedes: none
---

# 문단 대화에 간결 판정과 선택적 상세 진단을 결합

2026-09-18: 판정 범위와 자료 권한은 [D-0010](./D-0010-paragraph-axis-scope-v3.md)으로 대체.
아래는 당시 결정 원문이며, 선택적 상세 진단 구조는 후속 결정에서도 유지된다.

## 결정

모든 최초·후속 판정은 간결 골드가 담당한다. 명시적 오류와 좁은 공백은 간결 입력으로 묻고,
소재만 언급했거나 다음 진단 대상이 모호한 저정보 `UNCLEAR`에서만 상세 골드를 관계 선택기로
사용한다. 상세 골드는 PASS 판정 권한을 갖지 않는다.

## 근거

- 최초 응답에서 간결 골드는 원문 직접 방식보다 부분 누락을 더 잘 포착했다.
- `PARTIAL`에는 간결 방식이 유리했고 `TOPIC_ONLY`에는 상세 관계 선택이 실제 완성을 높였다.
- 모든 `UNCLEAR`에 상세 골드를 사용하면 질문의 정답 누출이 늘었다.
- V2 42사례 회귀는 최종 판정 적절 41/42, 질문상 정답 제공 0회, 과도 보류 0회를 기록했다.

## 폐기한 대안

- 문단 요약도 문제 풀이처럼 전 과정 원문 직접 방식으로 통일
- 모든 `UNCLEAR` 질문에 상세 골드 사용
- 상세 골드가 최종 PASS 여부를 판정

## 재검토 조건

충분한 최초 응답 canary 또는 실제 학생 로그에서 불필요한 질문·조기 PASS가 반복되거나,
선택적 상세 진단이 독립 수행을 해치는 신호가 확인될 때 재검토한다.

## 근거 자료

- [`문단 요약 운영 정책 V2`](../../docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V2-2026-09-09.md)
- [`V2 42사례 회귀`](../../docs/experiments/dialogue-selective-router-v2-regression-42-2026-09-09/FINAL-REPORT.md)
- [`최대 3턴 비교`](../../docs/experiments/dialogue-three-turn-concise-vs-hybrid-42-2026-09-08/REPORT.md)
