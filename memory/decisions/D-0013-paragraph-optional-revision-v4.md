---
id: D-0013
status: accepted
date: 2026-09-19
scope: paragraph-dialogue-v4
supersedes: none
---

# 축별 공개·선택적 보완을 문단 V4로 구현

## 결정

사용자의 2026-09-19 ‘오케이. 구현 승인.’에 따라 D-0010의 축 범위 원칙과 D-0011의
학생 진행 선택을 유지하며 다음 계약을 구현한다.

- 1차에서 PASS/UNCLEAR_OK/UNCLEAR_SERIOUS/ERROR와 축별 공개 텍스트를 함께 생성한다.
- OK는 확인된 부분만 공개하고 자동 질문하지 않는다. 학생 요청 시 저장된 판정을 재사용해
  질문 생성만 호출한다. SERIOUS/ERROR는 질문을 제시하되 응답을 진행 조건으로 강제하지 않는다.
- 경계가 모호하면 OK 쪽으로 판단하되 없는 학생 근거를 만들지 않는다.
- 모든 판정에서 다음으로 갈 수 있으며 SKIPPED/진행 선택과 PASS를 구별한다.
- 누적 학생 응답과 공개된 기준 설명을 분리한다. 질문은 합계 3회, 문제 풀이 V3는 유지한다.
- 청킹·압축 점수·보상·처벌은 D-0012에 따라 제외한다.

## 버전·적용 상태

학생용 기본 파이프라인은 `axis-dialogue-selective-v4`, 1차/2차 프롬프트는 각각 V4다.
V3/V3.1은 보존하며, V3.1의 questionIntent 계약을 계승한 것이 후보의 의미 성능 승격은 아니다.
구현 승인 당시 소스·로컬 빌드 구현이며, 실행 중 공개 서버는 재시작하지 않았고 유료 테스트는 실시하지 않았다.

후속 검증: 별도 사용자 전송·비용 승인 뒤 [민감 6문단 시험](../../docs/experiments/dialogue-v4-sensitive-2026-09-19/REPORT.md)을 46호출로 완료했다. 잔여 의미·기록 문제는 보고서에 남겼으며 추가 정책 변경이나 공개 서버 재시작은 하지 않았다.

정본 정책: `docs/PARAGRAPH-SUMMARY-DIALOGUE-OPERATIONAL-POLICY-V4-2026-09-19.md`.
검증: `packages/pipeline/src/dialogue-experiment/optional-revision-v4.test.ts`,
`packages/app/src/server/dialogue.test.ts`, `packages/app/e2e/dialogue-optional-revision.spec.ts`.

## 재검토 조건

실사용에서 불필요한 SERIOUS, 부분 공개의 과잉 보충, 학생 진행 선택의 혼동이 반복되면
공통 원칙을 검토한다. 코드 테스트 통과만으로 false positive 감소나 학습 효과를 확정하지 않는다.
이번 승인은 유료 호출·공개 서버 재시작 승인이 아니며 별도 확인한다.
