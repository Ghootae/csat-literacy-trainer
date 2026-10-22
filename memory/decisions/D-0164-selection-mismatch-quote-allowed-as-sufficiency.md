---
id: D-0164
status: accepted
date: 2026-10-22
scope: problem-feedback-judgment
supersedes: none
---

# 선택 충돌 항목의 학생 인용은 충분성 인용 금지 대상에서 뺀다 (D-0157 보완)

## 결정

사용자 승인(2026-10-22, "1번 수정 진행"). [D-0157](./D-0157-rationale-sufficient-needs-single-student-quote.md)의 서버 검증
"오류로 확인된 학생 발화는 충분성 인용(`sufficiencyEvidence`)으로 쓸 수 없다"에서, 선택 충돌 항목(`kind: SELECTION_EXECUTION`,
`selection-mismatch`)의 학생 인용은 겹침 검사에서 뺀다. 내용 오류(`errors`의 나머지, `additionalErrors`)의 인용 금지는 그대로다.

- 코드: `packages/pipeline/src/problem-solving/feedback-v4.ts` REPAIR 검증의 `flagged` 계산.
- 시험: `feedback-v4.test.ts` "lets sufficiencyEvidence quote the content-correct rationale behind a selection mismatch"(수정 전 실패 확인).

## 이유

- 선택 충돌은 내용 판단은 맞고 선택만 발문 목표와 어긋난 경우다. 서버는 이 항목의 학생 인용으로 첫 근거 전체를 넣는다. 그래서 D-0157
  검사가 내용이 맞는 원래 근거까지 막았다.
- 48세션 회귀([판정 기록](../../docs/experiments/v5-diverse-48-regression-2026-10-22/REVIEW.md) 3절): B3 6/6 첫 시도 거부. 5개는 근거 부족으로
  바꿔 통과했고, G-B3는 교정을 REMAINING으로 바꿔 교정 실패("방금 답도 정확하지 않았어")로 끝났다. 잘못된 피드백이다.
- 원인은 D-0157 설계(Claude)가 선택 충돌 인용과 내용 오류 인용을 구분하지 않은 것이다.

## 확인

- B3 6세션 재확인([보고](../../docs/experiments/v5-diverse-48-b3-recheck-2026-10-22/REPORT-b3-recheck-desktop.md)): 검증 재시도 0, 6/6 다시 고르기
  (RESELECTION_WRONG). 충분성은 판정기 판단으로 G·I·M true(학생 인용 하나), C·D·S false.
- 파이프라인 410/410, npm test 1344 통과·2 실패(기존), 빌드 통과.
