---
id: D-0018
status: accepted
date: 2026-09-20
scope: paragraph-axis-function-filter-experiment
supersedes: none
---

# 중심 대상과 축의 설명 기능을 먼저 해석하는 정제 후보

사용자는 중심 대상을 기준으로 축의 기능을 정의한 뒤 기능 중심으로 트리밍하는 제안의 구현과
API 사용을 승인했다. D-0017의 직접 정제 후보는 실패 자료로 보존한다. 운영 기준 승격은 아니다.

- 원문·중심 대상·기존 축만 입력. 학생 답·중심 이야기·상세 관계·기대 결과 미입력.
- 기능을 정의하고 그 기능에 필요한 관계를 보존하며 부수 표현 정제. 축 수·ID·독립 대상 유지.
- 기능·삭제 이유·보존 검토는 감사 기록에만 저장하고 평가기에는 정제 description만 반영한다.
- 기존 6문단·25조건으로 원본과 후보를 모두 다시 평가. 이전 결과는 역사 비교로만 사용한다.
- API 전송 범위는 필터 입력 및 평가용 원문·축·학생 발화와 필요 상세 관계. terra medium,
  로컬 예약 비용 합계 USD 2 상한. 운영 서버·자산·평가 프롬프트는 그대로 유지한다.

근거: `docs/experiments/axis-function-filter-six-2026-09-20/PLAN.md`,
`packages/pipeline/src/dialogue-experiment/axis-function-filter.ts`,
`packages/pipeline/experiments/dialogue/axis-function-filter-prompt-v1.md`.

재검토 조건: 기능 해석 자체가 핵심 관계를 버리거나 부수 요구를 남기면 승격하지 않는다.
동일 개발 문단 개선만으로 새로운 지문 일반화나 실제 학습 효과를 승인하지 않는다.

후속: [D-0019](./D-0019-axis-meaning-filter-only-experiment.md)는 내부 의미 분류를 추가한 별도 후보의 필터 단독 시험이다. 이 기록과 후보는 역사 비교용으로 보존한다.

## 같은 날 실행 결과

[비교 보고서](../../docs/experiments/axis-function-filter-six-2026-09-20/REPORT.md):
79요청, 50평가 시도 중47유효·timeout2·인용실패1. 공손룡 보완은 후보 PASS였으나 위상 수식을
제거하지 않았고, mRNA 축에 원문 전용 원인을 추가했다. 같은 원본도 직전 대비3/23 유효쌍의
축 상태가 달라졌다. 후보 운영 승격 없이 원본 유지, 후속 수정은 별도 결정한다.
