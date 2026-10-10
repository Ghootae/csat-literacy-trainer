---
id: D-0039
status: accepted
date: 2026-09-29
scope: paragraph-two-level-evaluation-experiment
supersedes: none
---

# 생성 반복2의 기능적 메타 축으로 두 수준 판정 시험

## 사용자 결정

사용자는 D-0038 생성 후보의 반복2를 바탕으로 실제 응답 판정 실험을 요청했다.
추가 확인에서 다음 의미 기준이 의도한 결과임을 명시적으로 승인했다.

- 메타 축: '잉여금의 종류에 따라 활용의 자유도와 사용 제한이 다름을 이해한다.'
- 응답: '이익 잉여금과 자본 잉여금은 사용할 수 있는 범위가 다르다.'
- Level1에는 비교 방향이 부족하지만 Level2 의미는 충족하므로 **추가 보상 없는 기본 PASS**.

따라서 메타 축에서 비교 방향이 생략됐다는 D-0038의 관측 자체는 유지하지만, 그 생략을
사용자가 의도하지 않은 결함으로 자동 간주하지 않는다. 방향 누락과 명시적 방향 오류는 다르다.
원래 구체적 축에 대한 Level1 ERROR는 Level2 충족으로 구제하지 않는 보호 규칙으로 시험한다.

## 범위

- 법인4문단 반복2 description/metaAxis 동결, 실제 최초 응답1개+합성5개.
- Level1은 D-0037 `v4-concrete-meaning-v1` 지시문·출력 계약을 유지한다.
- Level2는 메타와 학생 응답만 독립 입력해 기능 충족 여부를 판정한다.
- 각3반복 총36호출; 사전 기대·원출력·실제 전송·오류를 보존한다.
- 세부 부족 기본 PASS와 두 수준 모두 충족인 보상 자격을 실험용 라벨로 구분한다.
  보상 지급·질문 생성·운영 정책이나 UI 적용은 승인 범위가 아니다.
- 원문은 Level1 사실 확인에만 입력한다. Level2에 원래 축 요구를 몰래 다시 넣지 않는다.
- 새로운 의미 기준이나 결과에 영향을 미치는 사용자 선택이 필요하면 충분히 질문하고 실행한다.
  이는 사용자의 명시적인 향후 작업 선호이며, 이미 정해진 기술 세부사항을 반복 승인받으라는 뜻은 아니다.

## 유보

'위험성·신중함만 있고 최후 수단은 없는 답'과 실제 응답의 AX2는 Level2 탐색 사례다.
사람이 승인하지 않은 정답을 만들어 정확도로 집계하지 않는다. Level2 충족은 사실 정확성 검증이 아니다.
운영 승격은 별도 검토가 필요하며 D-0013/D-0030/D-0037 운영·후보 상태는 유지한다.

## 근거

- 사용자 '맞아. 의도한 결과야. 더 필요한 정보? 앞으로 실행할 때, 필요한 정보가 있다면 충분히 질문 후에 진행해.'
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/PLAN.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/cases.json`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/frozen-gold.json`

## 완료 관측 — 운영 채택 아님

36호출·35계약유효·재시도0. 승인 사례 C3은 Level2 3/3충족이나 Level1도3/3PASS여서
기본PASS가 아닌 보상자격PASS가 되어 기대와 불일치했다. 실제AX1은OK/PASS/PASS,
메타3/3충족으로 통과는 유지되지만 보상변동이 남았다. 위험·신중함만 있는C4는
Level1 원판정3/3OK·Level2 3/3충족, 유효2회기본PASS·1회인용계약실패였다.
충분·핵심누락·방향역전 대조는 각각 기대 행동을 유지했으나 작은 개발 표본이다.
Level2만으로 정확성을 검증하지 않으며 두 수준의 분리 및 보상 기준은 후속 선택으로 남긴다.

- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/REPORT.md`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/summary.json`
- `docs/experiments/meta-axis-evaluation-corporate-p4-2026-09-29/execution-audit.json`
