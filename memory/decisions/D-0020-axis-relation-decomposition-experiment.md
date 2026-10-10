---
id: D-0020
status: accepted
date: 2026-09-20
scope: paragraph-axis-relation-decomposition-experiment
supersedes: none
---

# 필터 전제인 관계 추출을 독립 시험

사용자는 기존10문단·16축, 축 문장만 입력, 삭제·중요도 판단·학생 평가 없이 관계를 추출하는
별도 `axis-relation-decomposition-v1` 실험을 승인했다. 최대10호출·$1 상한이다.

- 축 ID·문장과 무의미한 묶음 ID만 전송. 원문·중심 대상·학생 답·기대 결과는 제외한다.
- 대상·관계·방향·변화 출발/도착·조건·수식·정확 인용·해석 보류를 기록한다.
- 문법적 수식의 구분은 중요도 분류가 아니다. required/optional 및 main/qualifier는 사용하지 않는다.
- 자연어 골드와 D-0010/D-0013 운영 기준을 관계 그래프나 원자 채점표로 교체하지 않는다.
- D-0019 후보 수정이 아닌 독립 추출 시험. 과거 필터와 자료를 보존한다.

근거: `docs/experiments/axis-relation-decomposition-2026-09-20/PLAN.md`,
`packages/pipeline/src/dialogue-experiment/axis-relation-decomposition.ts`,
`packages/pipeline/experiments/dialogue/axis-relation-decomposition-prompt-v1.md`.

## 결과·제한

`docs/experiments/axis-relation-decomposition-2026-09-20/REPORT.md`:
10완료 원응답·16축·43관계, 인용 계약 통과8/실패2. 비용 추정 $0.0794669, 미확인 사용량0.
공손룡 AX1 변화 보존, mRNA 감염 회피 원인 미추가. AX2의 대표성과 논쟁은 여전히 미분리.
조건을 독립 사실로 만든 합성 장치 사례도 발견했다. 운영·필터 입력으로 승격하지 않는다.

재검토 조건: 관계·속성 분리와 조건·수식 범위 보존, 인용 정확성을 별도로 확인할 것.
이번 결과로 자연어 저장이 근본 원인이라고 단정하거나 학생 성능 개선을 주장하지 않는다.
