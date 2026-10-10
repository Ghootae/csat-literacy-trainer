---
id: D-0047
status: accepted
date: 2026-10-01
scope: concrete-l1-conditional-l2-developer-ui
supersedes: none
---

# 구체 인정과 조건부 메타 판정의 개발자 실험 모드

사용자가 “축준비, ui 연결까지 일괄 승인”했다. 현재 개발자 UI에 연결된 6지문 30문단을 대상으로,
기존 공동 생성 8문단을 재사용하고 22문단을 생성한 뒤 별도 선택형 실험 모드를 연결한다.
별도 생산 골드 60문단이나 미완성 헤겔은 범위 밖이다. 학생용 기본 V4와 기존 골드는 유지한다.

## 적용 정책

- D-0040과 D-0046을 유지한다. L1 PASS/OK는 조용한 통과, SERIOUS에만 L2를 호출한다.
- SERIOUS+L2충족은 기본 이해 인정과 선택적 보완, 미충족은 질문 제시다.
- ERROR는 L2와 무관하게 교정 질문을 제시한다. 질문 최대 3회·학생 진행 선택은 유지하며 오류 건너뛰기를 교정으로 기록하지 않는다.
- 정책상 기본 이해 인정은 원래 L1 상태와 별도 저장한다. 선택적 보완 없이 진행하면 최종 PASS이지만 원래 SERIOUS 기록은 보존한다.
- 보완 선택 시 저장 판정으로 질문만 생성하고, 후속 답변 제출 후 누적 재판정한다. 새 보상·MR 재분해·JEV 호출은 추가하지 않는다.

## 구현 범위와 한계

30문단 51축쌍이 준비됐다. 추가 생성 22호출은 모두 형식 유효, 재시도 0이다. 새 생성물의 오타와
귀속 표현 각 1건을 원 중심 이야기에 맞게 수정했고 전후 문구·원출력을 보존했다. 이는 에이전트 검토이지 독립 사람 심사가 아니다.
개발자 `/dialogue/dev`에서 `conditional-meta-v1`을 선택하며 모드별 기록과 로그를 분리한다.
기본 학생 `/dialogue`는 기존 V4이며 이번 결정은 운영 기본값 승격이 아니다.

기존 동결 프롬프트와 모델을 재사용했다. 후속 L2는 질문·답변 맥락을 누적하는 지시를 추가했다.
모의 흐름·타입·회귀 검증을 마쳤으나 실제 후속 L2 품질·교육 효과·일반화는 개발자 직접 테스트로 남는다.

## 근거

- 사용자 2026-10-01 일괄 승인.
- `docs/experiments/conditional-meta-ui-2026-10-01/REPORT.md`
- `docs/experiments/conditional-meta-ui-2026-10-01/audit.json`
- `docs/experiments/conditional-meta-ui-2026-10-01/final-assets-audit.json`
- `docs/experiments/conditional-meta-ui-2026-10-01/patches.json`
- `packages/pipeline/src/dialogue-experiment/conditional-meta.ts`
- `packages/app/src/server/dialogue-conditional-meta.test.ts`
- `packages/app/e2e/dialogue-conditional-meta.spec.ts`
