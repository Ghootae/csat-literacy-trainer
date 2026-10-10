---
id: D-0038
status: accepted
date: 2026-09-29
scope: paragraph-meta-axis-generation-experiment
supersedes: none
---

# 법인 4문단 기능적 메타 축 생성 실험 승인

## 결정 범위

사용자는 기존 축 생성 프롬프트 일부를 수정해 기존 축과 메타 축을 함께 생성하는
법인4문단 실험을 승인했다. 후보 ID는 `functional-meta-axis-generation-v1`이다.
accepted는 이 한 문단 생성 실험의 승인이지 산출 골드·2-level 판정·보상·운영 적용의 승인이 아니다.

3단계 중2단계 중심축 분해를 대상으로, 저장된 centralStory를 고정해 기존3회/후보3회 비교했다.
기존 description은 유지하는 방향으로 생성하고 metaAxis를 별도 필드로 추가한다.
학생 응답·사용자 메타 예시·기존 축·MR은 API에 넣지 않는다. 원문 분석과MR매핑은 재실행하지 않는다.
운영V4와 D-0037 판정 후보, D-0005 골드 생산 기준선은 변경하지 않는다.

## 결과와 미해결

6호출 모두2축·구조유효. 후보 description은 비교 방향·조건·위험·신중함을 보존했다.
그러나 metaAxis1은3/3 차이만 쓰고 어느 쪽이 덜 제한되는지 생략했다.
metaAxis2는 3/3 존립과 신중함을 연결했지만 위험의 부정 방향은 1회만 명확했고,
나머지 2회는 연결/영향으로 약화했다. 모두 '최후 수단'도 유지했다.
기존 생성 2/3도 AX1 description에서 비교 방향을 생략했으며 내부 의미에는 남아 있었다.
이는 에이전트의 예비 검토이고, 사용자 정답 승인이나 학생 판정 효과가 아니다.

## 후속 조건

생성물은 운영에 적용하지 않는다. 다음 수정·확대 실행은 사용자 검토 뒤 별도로 정한다.
의미 범위를 바꾸는 추상화는 실제 학생 응답의 통과 경계에 미칠 영향도 확인해야 한다.
학생 2-level 판정, 명시적 오류 우선 처리, 보상과 추가 질문 정책은 이번 실험으로 채택하지 않았다.

## 근거

- 사용자 제안과 '승인' 메시지.
- `docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/PLAN.md`
- `docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/REPORT.md`
- `docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/results.jsonl`
- `docs/experiments/meta-axis-generation-corporate-p4-2026-09-29/execution-audit.json`
