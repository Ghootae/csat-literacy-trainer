---
id: D-0019
status: accepted
date: 2026-09-20
scope: paragraph-axis-meaning-filter-experiment
supersedes: none
---

# 2차 필터 내부 의미 분류와 필터 단독 시험

사용자는 최종 검토 의견에 따라 2차 필터 수정·학생 평가 없는 필터 단독 시험·API 사용을 승인했다.
D-0017/D-0018 후보와 실험은 보존하고 `axis-meaning-filter-v1`을 별도로 구현한다.

- 각 축의 기여를 해석하고 semanticUnits를 required/optional로 분류한 뒤 자연어 축을 작성한다.
- 생략을 반대 주장으로 해석하지 않고, 여러 삭제 후 전체 중심 연결을 다시 확인한다.
- 필수 의미와 개입 필요성은 다르다. D-0013의 UNCLEAR_OK·학생 진행 선택은 그대로다.
- 단위 분해는 편집 감사용이다. D-0010의 자연어 축 전체 기준을 원자별 채점표로 바꾸지 않는다.
- 원문·중심 대상·기존 축만 입력. 학생 응답·중심 이야기·핵심 관계·사전 기대는 미입력.
- 기존 6문단과 합성 대조 4문단, 각 1회 필터만 호출. 로컬 상한 $2. 기존 자산·UI·평가기는 변경하지 않는다.

근거: `docs/experiments/axis-meaning-filter-only-2026-09-20/PLAN.md`,
`packages/pipeline/experiments/dialogue/axis-meaning-filter-prompt-v1.md`,
`packages/pipeline/src/dialogue-experiment/axis-meaning-filter.ts`.

## 결과와 적용 제한

`docs/experiments/axis-meaning-filter-only-2026-09-20/REPORT.md`:
10호출·16축, 구조 계약 모두 성공, 학생 평가0. 비용 추정 $0.1057007.
공손룡에서 전문성을 required, 대표 논쟁 주체를 optional로 정해 논쟁을 삭제했다.
mRNA 원문 전용 원인 추가는 이번 출력에서 없었다. 자기 점검이 핵심 손실을 막지는 못했다.
운영에 승격하지 않는다. Q-0017 유지. 재검토 조건은 핵심 관계 보존과 부수 요구 정제가
함께 확인되고, 별도 학생 평가에서도 효과가 확인되는 경우다.

후속 [D-0020](./D-0020-axis-relation-decomposition-experiment.md)은 중요도 판단을 제거한 관계 추출 단독 시험이다. 본 후보와 결과는 보존한다.
